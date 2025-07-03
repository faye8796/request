// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.2.0
// 🚀 새로운 SupabaseCore v1.0.0 연동 버전
// passport-info 기능 완전 통합 버전

class FlightRequestAPI {
    constructor() {
        this.user = null;
        this.supabase = null;
        this.core = null;
        this.storageUtils = null;
        this.isInitialized = false;
        this.initializationPromise = this.initialize();
    }

    // 🚀 v8.2.0: 새로운 SupabaseCore v1.0.0 연동
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.2.0 초기화 시작 (새로운 SupabaseCore 연동)...');
            
            // 새로운 SupabaseCore 대기 및 연결
            await this.waitForSupabaseCore();
            
            // StorageUtils 확인 및 대기 (선택적)
            await this.waitForStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            console.log('✅ FlightRequestAPI v8.2.0 초기화 완료 (새로운 SupabaseCore 연동)');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 🚀 v8.2.0: 새로운 SupabaseCore 대기 로직
    async waitForSupabaseCore(timeout = 15000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                // 새로운 window.SupabaseAPI와 core 인스턴스 확인
                if (window.SupabaseAPI && window.SupabaseAPI.core && window.SupabaseAPI.core.isInitialized) {
                    this.core = window.SupabaseAPI.core;
                    this.supabase = this.core.getClient();
                    console.log('✅ 새로운 SupabaseCore v1.0.0 연결 성공');
                    resolve(this.supabase);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    const error = new Error('새로운 SupabaseCore 로딩 시간 초과');
                    console.error('❌ SupabaseCore 초기화 시간 초과:', {
                        supabaseAPI: !!window.SupabaseAPI,
                        core: !!window.SupabaseAPI?.core,
                        initialized: window.SupabaseAPI?.core?.isInitialized,
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

    // StorageUtils 대기 (선택적)
    async waitForStorageUtils(timeout = 5000) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
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
        if (this.isInitialized && this.core && this.core.isInitialized) {
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

    // 🚀 v8.2.0: 새로운 SupabaseCore를 통한 안전한 사용자 정보 조회
    async getCurrentUser() {
        try {
            await this.ensureInitialized();
            
            if (!this.core) {
                throw new Error('SupabaseCore가 초기화되지 않았습니다');
            }

            // localStorage에서 먼저 확인
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    if (studentData && studentData.id) {
                        this.user = { id: studentData.id, email: studentData.email };
                        // SupabaseCore에도 사용자 정보 설정
                        this.core.setCurrentUser(this.user, 'student');
                        return this.user;
                    }
                } catch (parseError) {
                    console.warn('localStorage 파싱 오류:', parseError);
                }
            }

            // SupabaseCore를 통한 인증 확인
            const currentUser = this.core.getCurrentUser();
            if (currentUser) {
                this.user = currentUser;
                return currentUser;
            }

            // 세션에서 사용자 정보 가져오기
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) {
                console.warn('SupabaseCore Auth 오류:', error);
                throw new Error('사용자 인증 정보를 확인할 수 없습니다');
            }
            
            this.user = user;
            if (user) {
                this.core.setCurrentUser(user, 'student');
            }
            return user;
        } catch (error) {
            console.error('사용자 정보 조회 실패:', error);
            throw error;
        }
    }

    // 사용자 프로필 정보 가져오기 (SupabaseCore 사용)
    async getUserProfile() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // SupabaseCore의 select 메서드 사용
            const result = await this.core.select('user_profiles', '*', { id: this.user.id });
            
            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data && result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error('사용자 프로필 조회 실패:', error);
            throw error;
        }
    }

    // === 🆕 PASSPORT INFO 기능 통합 ===

    // 기존 여권정보 조회 (SupabaseCore 사용)
    async getPassportInfo() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // SupabaseCore의 select 메서드 사용
            const result = await this.core.select('passport_info', '*', { user_id: this.user.id });
            
            if (!result.success) {
                if (result.error.includes('PGRST116')) {
                    return null; // 데이터 없음
                }
                throw new Error(result.error);
            }

            return result.data && result.data.length > 0 ? result.data[0] : null;
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

    // 여권정보 저장 (SupabaseCore 사용)
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
                    try {
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
                    } catch (deleteError) {
                        console.warn('기존 이미지 삭제 실패 (계속 진행):', deleteError);
                    }
                }
                
                // 새 이미지 업로드 (SupabaseCore 사용)
                imageUrl = await this.uploadPassportImage(imageFile);
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
                // 수정 (SupabaseCore 사용)
                const result = await this.core.update('passport_info', dataToSave, { id: existingInfo.id });
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                return { data: result.data[0], isUpdate: true };
            } else {
                // 생성 (SupabaseCore 사용)
                const result = await this.core.insert('passport_info', dataToSave);
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                return { data: result.data[0], isUpdate: false };
            }
        } catch (error) {
            console.error('여권정보 저장 실패:', error);
            throw error;
        }
    }

    // 여권 이미지 업로드 (SupabaseCore 사용)
    async uploadPassportImage(imageFile) {
        try {
            const fileName = `passport_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            
            // SupabaseCore의 uploadFile 사용
            const result = await this.core.uploadFile('passports', fileName, imageFile, { upsert: true });
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // 공개 URL 생성
            const urlResult = await this.core.getFileUrl('passports', fileName);
            
            if (!urlResult.success) {
                throw new Error(urlResult.error);
            }

            return urlResult.url;
        } catch (error) {
            console.error('여권 이미지 업로드 실패:', error);
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

    // 이미지 미리보기 생성
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

    // 기존 항공권 신청 조회 (SupabaseCore 사용)
    async getExistingRequest() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // SupabaseCore 직접 사용 (order by 지원)
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

    // 항공권 신청 생성 (SupabaseCore 사용)
    async createFlightRequest(requestData, imageFile) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            let imageUrl = null;

            // 이미지 업로드
            if (imageFile) {
                imageUrl = await this.uploadFlightImage(imageFile);
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

            // SupabaseCore의 insert 사용
            const result = await this.core.insert('flight_requests', dataToSave);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data[0];
        } catch (error) {
            console.error('항공권 신청 생성 실패:', error);
            throw error;
        }
    }

    // 항공권 이미지 업로드 (SupabaseCore 사용)
    async uploadFlightImage(imageFile) {
        try {
            const fileName = `${this.user.id}/flight_${Date.now()}.${imageFile.name.split('.').pop()}`;
            
            // SupabaseCore의 uploadFile 사용
            const result = await this.core.uploadFile('flight-images', fileName, imageFile);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // 공개 URL 생성
            const urlResult = await this.core.getFileUrl('flight-images', fileName);
            
            if (!urlResult.success) {
                throw new Error(urlResult.error);
            }

            return urlResult.url;
        } catch (error) {
            console.error('항공권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 수정 (SupabaseCore 사용)
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
                updateData.flight_image_url = await this.uploadFlightImage(imageFile);
            }

            // 복잡한 조건이 있는 업데이트는 직접 supabase 사용
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

            // 파일 업로드 (SupabaseCore 사용)
            const fileName = `${this.user.id}_tickets`;
            
            const uploadResult = await this.core.uploadFile('flight-tickets', fileName, ticketFile, { upsert: true });
            
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }

            const urlResult = await this.core.getFileUrl('flight-tickets', fileName);
            
            if (!urlResult.success) {
                throw new Error(urlResult.error);
            }

            // DB 업데이트는 복잡한 조건이므로 직접 supabase 사용
            const { data: updateData, error: updateError } = await this.supabase
                .from('flight_requests')
                .update({
                    ticket_url: urlResult.url,
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

            // 파일 업로드 (SupabaseCore 사용)
            const fileName = `receipt_${this.user.id}_${requestId}_${Date.now()}.${receiptFile.name.split('.').pop()}`;
            
            const uploadResult = await this.core.uploadFile('receipt-files', fileName, receiptFile);
            
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }

            const urlResult = await this.core.getFileUrl('receipt-files', fileName);
            
            if (!urlResult.success) {
                throw new Error(urlResult.error);
            }

            // DB 업데이트는 복잡한 조건이므로 직접 supabase 사용
            const { data: updateData, error: updateError } = await this.supabase
                .from('flight_requests')
                .update({
                    receipt_url: urlResult.url,
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

    // 신청 상태 업데이트 (SupabaseCore 사용)
    async updateRequestStatus(requestId, status) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            const result = await this.core.update('flight_requests', updateData, { 
                id: requestId, 
                user_id: this.user.id 
            });
            
            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data[0];
        } catch (error) {
            console.error('상태 업데이트 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 삭제 (SupabaseCore 사용)
    async deleteFlightRequest(requestId) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user || !this.user.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 먼저 신청 정보를 가져와서 이미지 URL 확인
            const requestResult = await this.core.select('flight_requests', 'flight_image_url', { 
                id: requestId, 
                user_id: this.user.id 
            });
            
            if (!requestResult.success) {
                throw new Error(requestResult.error);
            }

            const request = requestResult.data[0];

            // 이미지 파일 삭제 시도 (실패해도 계속 진행)
            if (request?.flight_image_url) {
                try {
                    if (this.storageUtils) {
                        const filePath = this.storageUtils.extractFilePathFromUrl(
                            request.flight_image_url, 
                            'flight-images'
                        );
                        if (filePath) {
                            await this.storageUtils.deleteFile('flight-images', filePath);
                        }
                    } else {
                        // SupabaseCore를 통한 삭제
                        const pathParts = request.flight_image_url.split('/');
                        const fileName = pathParts[pathParts.length - 1];
                        await this.core.deleteFile('flight-images', fileName);
                    }
                } catch (deleteError) {
                    console.warn('이미지 파일 삭제 실패 (계속 진행):', deleteError);
                }
            }

            // DB에서 삭제 (복잡한 조건이므로 직접 supabase 사용)
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
                throw new Error(`지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})`);\n            }

            return { isValid: true };
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }
}

// 🚀 v8.2.0: 새로운 SupabaseCore 의존성을 고려한 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.2.0 인스턴스 생성 시작 (새로운 SupabaseCore 연동)...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.2.0 인스턴스 생성 완료 - 새로운 SupabaseCore 연동');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 🚀 v8.2.0: 새로운 SupabaseCore 로딩 후 지연 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 1000); // 새로운 SupabaseCore 로딩 대기
    });
} else {
    setTimeout(createFlightRequestAPI, 1000);
}

console.log('✅ FlightRequestAPI v8.2.0 모듈 로드 완료 - 새로운 SupabaseCore v1.0.0 연동');
