// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.1.2
// 🏗️ 아키텍처 개선: SupabaseCore 모듈 사용으로 변경
// passport-info 기능 완전 통합 버전

class FlightRequestAPI {
    constructor() {
        this.user = null;
        this.supabase = null;
        this.storageUtils = null;
        this.isInitialized = false;
        this.initializationPromise = this.initialize();
    }

    // 🏗️ v8.1.2: SupabaseCore 사용으로 초기화 개선
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.1.2 초기화 시작 (SupabaseCore 연동)...');
            
            // SupabaseCore 대기 및 연결
            await this.waitForSupabaseCore();
            
            // StorageUtils 확인 및 대기
            await this.waitForStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            console.log('✅ FlightRequestAPI v8.1.2 초기화 완료 (SupabaseCore 연동)');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 🏗️ v8.1.2: SupabaseCore 대기 로직 (기존 window.supabase 대신)
    async waitForSupabaseCore(timeout = 15000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                // SupabaseCore 모듈과 초기화 상태 확인
                if (window.SupabaseCore && window.SupabaseCore._initialized && window.SupabaseCore.supabase) {
                    this.supabase = window.SupabaseCore.supabase;
                    console.log('✅ SupabaseCore 모듈 연결 성공');
                    resolve(window.SupabaseCore.supabase);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    const error = new Error('SupabaseCore 모듈 로딩 시간 초과');
                    console.error('❌ SupabaseCore 초기화 시간 초과:', {
                        supabseCore: !!window.SupabaseCore,
                        initialized: window.SupabaseCore?._initialized,
                        client: !!window.SupabaseCore?.supabase,
                        timeout: timeout
                    });
                    reject(error);
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // StorageUtils 대기 (개선된 버전)
    async waitForStorageUtils(timeout = 10000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                if (window.StorageUtils) {
                    this.storageUtils = window.StorageUtils;
                    console.log('✅ StorageUtils 연결 성공');
                    resolve(window.StorageUtils);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    console.warn('⚠️ StorageUtils 로딩 시간 초과 (선택적 기능, 계속 진행)');
                    this.storageUtils = null;
                    resolve(null);
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // 초기화 보장 (강화된 버전)
    async ensureInitialized() {
        if (this.isInitialized) {
            return true;
        }

        if (!this.initializationPromise) {
            this.initializationPromise = this.initialize();
        }

        try {
            await this.initializationPromise;
            return this.isInitialized;
        } catch (error) {
            console.error('❌ 초기화 보장 실패:', error);
            // 재시도 로직
            console.log('🔄 초기화 재시도...');
            this.initializationPromise = this.initialize();
            await this.initializationPromise;
            return this.isInitialized;
        }
    }

    // 🏗️ v8.1.2: SupabaseCore를 통한 안전한 사용자 정보 조회
    async getCurrentUser() {
        try {
            await this.ensureInitialized();
            
            if (!this.supabase) {
                throw new Error('SupabaseCore 클라이언트가 초기화되지 않았습니다');
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

            // SupabaseCore를 통한 인증 확인
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) {
                console.warn('SupabaseCore Auth 오류:', error);
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

    // === 🆕 PASSPORT INFO 기능 통합 ===

    // 기존 여권정보 조회 (완전한 정보 반환)
    async getPassportInfo() {
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
            console.error('여권정보 조회 실패:', error);
            throw error;
        }
    }

    // 여권정보 확인 (존재 여부만 확인)
    async checkPassportInfo() {
        try {
            const passportInfo = await this.getPassportInfo();
            return passportInfo;
        } catch (error) {
            console.error('여권정보 확인 실패:', error);
            throw error;
        }
    }

    // 여권정보 저장 (생성 또는 수정) - Storage 유틸리티 사용
    async savePassportInfo(passportData, imageFile = null) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 기존 정보 확인
            const existingInfo = await this.getPassportInfo();
            let imageUrl = existingInfo?.image_url;

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                // 기존 이미지 삭제
                if (imageUrl && this.storageUtils) {
                    const filePath = this.storageUtils.extractFilePathFromUrl(
                        imageUrl, 
                        this.storageUtils.BUCKETS.PASSPORTS
                    );
                    if (filePath) {
                        await this.storageUtils.deleteFile(
                            this.storageUtils.BUCKETS.PASSPORTS, 
                            filePath
                        );
                    }
                }
                
                // 새 이미지 업로드 (StorageUtils 사용 또는 폴백)
                if (this.storageUtils) {
                    try {
                        const uploadResult = await this.storageUtils.uploadPassportImage(
                            imageFile, 
                            this.user.id
                        );
                        imageUrl = uploadResult.publicUrl;
                    } catch (storageError) {
                        console.warn('StorageUtils 업로드 실패, 기본 업로드 시도:', storageError);
                        imageUrl = await this.fallbackPassportImageUpload(imageFile);
                    }
                } else {
                    imageUrl = await this.fallbackPassportImageUpload(imageFile);
                }
            }

            const dataToSave = {
                user_id: this.user.id,
                passport_number: passportData.passport_number,
                name_english: passportData.name_english,
                issue_date: passportData.issue_date,
                expiry_date: passportData.expiry_date,
                image_url: imageUrl,
                updated_at: new Date().toISOString()
            };

            if (existingInfo) {
                // 수정
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .update(dataToSave)
                    .eq('id', existingInfo.id)
                    .select()
                    .single();

                if (error) throw error;
                return { data, isUpdate: true };
            } else {
                // 생성
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .insert([dataToSave])
                    .select()
                    .single();

                if (error) throw error;
                return { data, isUpdate: false };
            }
        } catch (error) {
            console.error('여권정보 저장 실패:', error);
            throw error;
        }
    }

    // 폴백 여권 이미지 업로드 함수
    async fallbackPassportImageUpload(imageFile) {
        try {
            const fileName = `passport_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            
            const { data, error } = await this.supabase.storage
                .from('passports')
                .upload(fileName, imageFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = this.supabase.storage
                .from('passports')
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (error) {
            console.error('폴백 여권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 여권 만료일 검증
    validateExpiryDate(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

        if (expiry < today) {
            return { valid: false, message: '여권이 이미 만료되었습니다.' };
        }

        if (expiry < sixMonthsFromNow) {
            const remainingDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
            return { 
                valid: true, 
                warning: `여권 만료일이 6개월 이내입니다. (${remainingDays}일 남음)` 
            };
        }

        return { valid: true };
    }

    // 이미지 미리보기 생성 (StorageUtils 활용)
    async createImagePreview(file) {
        try {
            if (this.storageUtils) {
                return await this.storageUtils.createImagePreview(file);
            }
            
            // 폴백: 기본 FileReader 사용
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('이미지 미리보기 생성 실패'));
                reader.readAsDataURL(file);
            });
        } catch (error) {
            console.error('이미지 미리보기 생성 실패:', error);
            throw error;
        }
    }

    // === FLIGHT REQUEST 기능 ===

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

    // 파일 유효성 검증 (passport와 flight 모두 지원)
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

// 🏗️ v8.1.2: SupabaseCore 의존성을 고려한 안전한 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.1.2 인스턴스 생성 시작 (SupabaseCore 연동)...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.1.2 인스턴스 생성 완료 - SupabaseCore 연동');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 🏗️ v8.1.2: SupabaseCore 로딩 후 지연 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 500); // SupabaseCore 로딩 대기
    });
} else {
    setTimeout(createFlightRequestAPI, 500);
}

console.log('✅ FlightRequestAPI v8.1.2 모듈 로드 완료 - SupabaseCore 연동 방식으로 아키텍처 개선');
