// flight-request-api.js - 항공권 신청 API 통신 모듈

class FlightRequestAPI {
    constructor() {
        this.supabase = window.supabase;
        this.user = null;
        this.bucketName = 'flight-images';
        this.receiptBucketName = 'receipts';
    }

    // 현재 사용자 정보 가져오기
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;
            this.user = user;
            return user;
        } catch (error) {
            console.error('사용자 정보 조회 실패:', error);
            throw error;
        }
    }

    // 사용자 프로필 정보 가져오기
    async getUserProfile() {
        try {
            if (!this.user) await this.getCurrentUser();
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('사용자 프로필 조회 실패:', error);
            throw error;
        }
    }

    // 여권정보 확인
    async checkPassportInfo() {
        try {
            if (!this.user) await this.getCurrentUser();
            
            const { data, error } = await this.supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('여권정보 확인 실패:', error);
            throw error;
        }
    }

    // 기존 항공권 신청 조회
    async getExistingRequest() {
        try {
            if (!this.user) await this.getCurrentUser();
            
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('기존 신청 조회 실패:', error);
            return null;
        }
    }

    // 항공권 이미지 업로드
    async uploadFlightImage(file) {
        try {
            if (!this.user) await this.getCurrentUser();

            // 파일 크기 체크 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
            }

            // 파일 확장자 체크
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('JPG, PNG 형식의 이미지만 업로드 가능합니다.');
            }

            const timestamp = Date.now();
            const fileName = `${this.user.id}_${timestamp}_${file.name}`;
            const filePath = `${this.user.id}/${fileName}`;

            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (error) throw error;

            // 공개 URL 생성
            const { data: { publicUrl } } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 파일 업로드 (항공권/영수증)
    async uploadFile(file, bucketName, fileType) {
        try {
            if (!this.user) await this.getCurrentUser();

            // 파일 크기 체크 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
            }

            // 파일 확장자 체크
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('PDF, JPG, PNG 형식만 업로드 가능합니다.');
            }

            const timestamp = Date.now();
            const fileName = `${this.user.id}_${fileType}_${timestamp}_${file.name}`;
            const filePath = `${this.user.id}/${fileName}`;

            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (error) throw error;

            // 공개 URL 생성
            const { data: { publicUrl } } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error(`${fileType} 업로드 실패:`, error);
            throw error;
        }
    }

    // 항공권 신청 생성
    async createFlightRequest(requestData, imageFile) {
        try {
            if (!this.user) await this.getCurrentUser();

            // 이미지 업로드
            const imageUrl = await this.uploadFlightImage(imageFile);

            const dataToSave = {
                user_id: this.user.id,
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                flight_image_url: imageUrl,
                purchase_link: requestData.purchase_link || null,
                status: 'pending'
            };

            const { data, error } = await this.supabase
                .from('flight_requests')
                .insert([dataToSave])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('항공권 신청 생성 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 수정
    async updateFlightRequest(requestId, requestData, imageFile = null) {
        try {
            if (!this.user) await this.getCurrentUser();

            let updateData = {
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                purchase_link: requestData.purchase_link || null,
                status: requestData.status || 'pending',
                updated_at: new Date().toISOString(),
                version: requestData.version + 1
            };

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                const imageUrl = await this.uploadFlightImage(imageFile);
                updateData.flight_image_url = imageUrl;
            }

            const { data, error } = await this.supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .in('status', ['pending', 'rejected']) // pending 또는 rejected 상태일 때만 수정 가능
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('항공권 신청 수정 실패:', error);
            throw error;
        }
    }

    // 항공권 제출
    async submitTicket(requestId, ticketFile) {
        try {
            if (!this.user) await this.getCurrentUser();

            // 항공권 파일 업로드
            const ticketUrl = await this.uploadFile(ticketFile, this.bucketName, 'ticket');

            // DB 업데이트
            const { data, error } = await this.supabase
                .from('flight_requests')
                .update({
                    ticket_url: ticketUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .eq('status', 'approved')
                .eq('purchase_type', 'direct')
                .select()
                .single();

            if (error) throw error;

            // 항공권과 영수증 모두 제출되었는지 확인
            if (data.ticket_url && data.receipt_url) {
                await this.updateRequestStatus(requestId, 'completed');
            }

            return data;
        } catch (error) {
            console.error('항공권 제출 실패:', error);
            throw error;
        }
    }

    // 영수증 제출
    async submitReceipt(requestId, receiptFile) {
        try {
            if (!this.user) await this.getCurrentUser();

            // 영수증 파일 업로드
            const receiptUrl = await this.uploadFile(receiptFile, this.receiptBucketName, 'receipt');

            // DB 업데이트
            const { data, error } = await this.supabase
                .from('flight_requests')
                .update({
                    receipt_url: receiptUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .eq('status', 'approved')
                .eq('purchase_type', 'direct')
                .select()
                .single();

            if (error) throw error;

            // 항공권과 영수증 모두 제출되었는지 확인
            if (data.ticket_url && data.receipt_url) {
                await this.updateRequestStatus(requestId, 'completed');
            }

            return data;
        } catch (error) {
            console.error('영수증 제출 실패:', error);
            throw error;
        }
    }

    // 신청 상태 업데이트
    async updateRequestStatus(requestId, status) {
        try {
            if (!this.user) await this.getCurrentUser();

            const { data, error } = await this.supabase
                .from('flight_requests')
                .update({
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('상태 업데이트 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 삭제 (pending 또는 rejected 상태일 때만)
    async deleteFlightRequest(requestId) {
        try {
            if (!this.user) await this.getCurrentUser();

            const { error } = await this.supabase
                .from('flight_requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .in('status', ['pending', 'rejected']); // pending 또는 rejected 상태일 때만 삭제 가능

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('항공권 신청 삭제 실패:', error);
            throw error;
        }
    }
}

// 전역 인스턴스 생성
window.flightRequestAPI = new FlightRequestAPI();