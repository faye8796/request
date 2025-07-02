// flight-request-api.js - 항공권 신청 API 통신 모듈 v7.0.0
// Storage 유틸리티 통합 버전

class FlightRequestAPI {
    constructor() {
        this.supabase = window.supabase;
        this.user = null;
        this.storageUtils = window.StorageUtils;
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

    // 항공권 신청 생성 (Storage 유틸리티 사용)
    async createFlightRequest(requestData, imageFile) {
        try {
            if (!this.user) await this.getCurrentUser();

            // StorageUtils를 사용한 이미지 업로드
            const uploadResult = await this.storageUtils.uploadFlightImage(imageFile, this.user.id);

            const dataToSave = {
                user_id: this.user.id,
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                flight_image_url: uploadResult.publicUrl,
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

    // 항공권 신청 수정 (Storage 유틸리티 사용)
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
                const uploadResult = await this.storageUtils.uploadFlightImage(imageFile, this.user.id);
                updateData.flight_image_url = uploadResult.publicUrl;
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

    // 항공권 제출 (직접구매용)
    async submitTicket(requestId, ticketFile) {
        try {
            if (!this.user) await this.getCurrentUser();

            // StorageUtils를 사용한 항공권 파일 업로드
            const uploadResult = await this.storageUtils.uploadFile(
                ticketFile, 
                this.storageUtils.BUCKETS.FLIGHT_IMAGES,
                `${this.user.id}/ticket_${requestId}_${Date.now()}.${ticketFile.name.split('.').pop()}`,
                { fileType: 'document' }
            );

            // DB 업데이트
            const { data, error } = await this.supabase
                .from('flight_requests')
                .update({
                    ticket_url: uploadResult.publicUrl,
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

    // 영수증 제출 (직접구매용)
    async submitReceipt(requestId, receiptFile) {
        try {
            if (!this.user) await this.getCurrentUser();

            // StorageUtils를 사용한 영수증 파일 업로드
            const uploadResult = await this.storageUtils.uploadReceipt(
                receiptFile, 
                this.user.id, 
                requestId
            );

            // DB 업데이트
            const { data, error } = await this.supabase
                .from('flight_requests')
                .update({
                    receipt_url: uploadResult.publicUrl,
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

            // 먼저 신청 정보를 가져와서 이미지 URL 확인
            const { data: request, error: fetchError } = await this.supabase
                .from('flight_requests')
                .select('flight_image_url')
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .single();

            if (fetchError) throw fetchError;

            // 이미지 파일 삭제 (있는 경우)
            if (request.flight_image_url) {
                const filePath = this.storageUtils.extractFilePathFromUrl(
                    request.flight_image_url, 
                    this.storageUtils.BUCKETS.FLIGHT_IMAGES
                );
                if (filePath) {
                    await this.storageUtils.deleteFile(
                        this.storageUtils.BUCKETS.FLIGHT_IMAGES, 
                        filePath
                    );
                }
            }

            // DB에서 삭제
            const { error } = await this.supabase
                .from('flight_requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .in('status', ['pending', 'rejected']);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('항공권 신청 삭제 실패:', error);
            throw error;
        }
    }

    // 파일 유효성 검증 (StorageUtils 활용)
    validateFile(file, fileType = 'image') {
        try {
            return this.storageUtils.validateFile(file, fileType);
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }
}

// 전역 인스턴스 생성
window.flightRequestAPI = new FlightRequestAPI();

console.log('✅ FlightRequestAPI v7.0.0 로드 완료 - Storage 유틸리티 통합');
