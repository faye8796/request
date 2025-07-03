// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.1.1
// 안전한 Supabase 초기화 및 Storage 유틸리티 통합 버전

class FlightRequestAPI {
    constructor() {
        this.user = null;
        this.initializationPromise = this.initialize();
    }

    // 안전한 초기화
    async initialize() {
        try {
            // Supabase 클라이언트 확인 및 대기
            await this.waitForSupabase();
            
            // StorageUtils 확인 및 대기
            await this.waitForStorageUtils();
            
            console.log('✅ FlightRequestAPI 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            throw error;
        }
    }

    // Supabase 클라이언트 대기
    async waitForSupabase(timeout = 10000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                if (window.supabase) {
                    this.supabase = window.supabase;
                    resolve(window.supabase);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Supabase 클라이언트 로딩 시간 초과'));
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // StorageUtils 대기
    async waitForStorageUtils(timeout = 10000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                if (window.StorageUtils) {
                    this.storageUtils = window.StorageUtils;
                    resolve(window.StorageUtils);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    console.warn('⚠️ StorageUtils 로딩 시간 초과 (선택적 기능)');
                    this.storageUtils = null;
                    resolve(null);
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // 초기화 보장
    async ensureInitialized() {
        if (!this.initializationPromise) {
            this.initializationPromise = this.initialize();
        }
        return await this.initializationPromise;
    }

    // 현재 사용자 정보 가져오기 (안전한 버전)
    async getCurrentUser() {
        try {
            await this.ensureInitialized();
            
            if (!this.supabase) {
                throw new Error('Supabase 클라이언트가 초기화되지 않았습니다');
            }

            // localStorage에서 먼저 확인
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    if (studentData && studentData.id) {
                        this.user = { id: studentData.id, email: studentData.email };
                        return this.user;
                    }
                } catch (parseError) {
                    console.warn('localStorage 파싱 오류:', parseError);
                }
            }

            // Supabase Auth 확인
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) {
                console.warn('Supabase Auth 오류:', error);
                throw new Error('사용자 인증 정보를 확인할 수 없습니다');
            }
            
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
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

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
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

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
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

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

    // 항공권 신청 생성 (안전한 Storage 업로드)
    async createFlightRequest(requestData, imageFile) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            let imageUrl = null;

            // 이미지 업로드 (StorageUtils 사용 또는 폴백)
            if (imageFile) {
                if (this.storageUtils) {
                    try {
                        const uploadResult = await this.storageUtils.uploadFlightImage(imageFile, this.user.id);
                        imageUrl = uploadResult.publicUrl;
                    } catch (storageError) {
                        console.warn('StorageUtils 업로드 실패, 기본 업로드 시도:', storageError);
                        imageUrl = await this.fallbackImageUpload(imageFile);
                    }
                } else {
                    imageUrl = await this.fallbackImageUpload(imageFile);
                }
            }

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

    // 폴백 이미지 업로드 함수
    async fallbackImageUpload(imageFile) {
        try {
            const fileName = `${this.user.id}/flight_${Date.now()}.${imageFile.name.split('.').pop()}`;
            
            const { data, error } = await this.supabase.storage
                .from('flight-images')
                .upload(fileName, imageFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = this.supabase.storage
                .from('flight-images')
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (error) {
            console.error('폴백 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 수정
    async updateFlightRequest(requestId, requestData, imageFile = null) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            let updateData = {
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                purchase_link: requestData.purchase_link || null,
                status: requestData.status || 'pending',
                updated_at: new Date().toISOString(),
                version: (requestData.version || 0) + 1
            };

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                if (this.storageUtils) {
                    try {
                        const uploadResult = await this.storageUtils.uploadFlightImage(imageFile, this.user.id);
                        updateData.flight_image_url = uploadResult.publicUrl;
                    } catch (storageError) {
                        console.warn('StorageUtils 업로드 실패, 기본 업로드 시도:', storageError);
                        updateData.flight_image_url = await this.fallbackImageUpload(imageFile);
                    }
                } else {
                    updateData.flight_image_url = await this.fallbackImageUpload(imageFile);
                }
            }

            const { data, error } = await this.supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .in('status', ['pending', 'rejected'])
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
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 파일 업로드
            const fileName = `${this.user.id}_tickets`;
            
            const { data, error } = await this.supabase.storage
                .from('flight-tickets')
                .upload(fileName, ticketFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = this.supabase.storage
                .from('flight-tickets')
                .getPublicUrl(data.path);

            // DB 업데이트
            const { data: updateData, error: updateError } = await this.supabase
                .from('flight_requests')
                .update({
                    ticket_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .eq('status', 'approved')
                .eq('purchase_type', 'direct')
                .select()
                .single();

            if (updateError) throw updateError;

            // 항공권과 영수증 모두 제출되었는지 확인
            if (updateData.ticket_url && updateData.receipt_url) {
                await this.updateRequestStatus(requestId, 'completed');
            }

            return updateData;
        } catch (error) {
            console.error('항공권 제출 실패:', error);
            throw error;
        }
    }

    // 영수증 제출 (직접구매용)
    async submitReceipt(requestId, receiptFile) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 파일 업로드
            const fileName = `receipt_${this.user.id}_${requestId}_${Date.now()}.${receiptFile.name.split('.').pop()}`;
            
            const { data, error } = await this.supabase.storage
                .from('receipt-files')
                .upload(fileName, receiptFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = this.supabase.storage
                .from('receipt-files')
                .getPublicUrl(data.path);

            // DB 업데이트
            const { data: updateData, error: updateError } = await this.supabase
                .from('flight_requests')
                .update({
                    receipt_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .eq('status', 'approved')
                .eq('purchase_type', 'direct')
                .select()
                .single();

            if (updateError) throw updateError;

            // 항공권과 영수증 모두 제출되었는지 확인
            if (updateData.ticket_url && updateData.receipt_url) {
                await this.updateRequestStatus(requestId, 'completed');
            }

            return updateData;
        } catch (error) {
            console.error('영수증 제출 실패:', error);
            throw error;
        }
    }

    // 신청 상태 업데이트
    async updateRequestStatus(requestId, status) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

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

    // 항공권 신청 삭제
    async deleteFlightRequest(requestId) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 먼저 신청 정보를 가져와서 이미지 URL 확인
            const { data: request, error: fetchError } = await this.supabase
                .from('flight_requests')
                .select('flight_image_url')
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .single();

            if (fetchError) throw fetchError;

            // 이미지 파일 삭제 시도 (실패해도 계속 진행)
            if (request.flight_image_url) {
                try {
                    if (this.storageUtils) {
                        const filePath = this.storageUtils.extractFilePathFromUrl(
                            request.flight_image_url, 
                            'flight-images'
                        );
                        if (filePath) {
                            await this.storageUtils.deleteFile('flight-images', filePath);
                        }
                    }
                } catch (deleteError) {
                    console.warn('이미지 파일 삭제 실패 (계속 진행):', deleteError);
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

    // 파일 유효성 검증
    validateFile(file, fileType = 'image') {
        try {
            if (this.storageUtils) {
                return this.storageUtils.validateFile(file, fileType);
            }
            
            // 기본 검증
            const maxSize = fileType === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB or 10MB
            const allowedTypes = fileType === 'image' 
                ? ['image/jpeg', 'image/png', 'image/jpg']
                : ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

            if (file.size > maxSize) {
                throw new Error(`파일 크기는 ${Math.round(maxSize / 1024 / 1024)}MB 이하여야 합니다.`);
            }

            if (!allowedTypes.includes(file.type)) {
                throw new Error(`지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})`);
            }

            return { isValid: true };
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }
}

// 전역 인스턴스 생성
window.flightRequestAPI = new FlightRequestAPI();

console.log('✅ FlightRequestAPI v8.1.1 로드 완료 - 안전한 Supabase 초기화');
