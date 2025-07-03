// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.3.0
// 🔧 SupabaseCore v1.0.1 호환성 개선 및 최적화
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

    // 🚀 v8.3.0: SupabaseCore v1.0.1 최적화된 연동
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.3.0 초기화 시작 (SupabaseCore v1.0.1 최적화)...');
            
            // SupabaseCore v1.0.1 연결
            await this.connectToSupabaseCore();
            
            // StorageUtils 연결 (선택적)
            await this.connectToStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            console.log('✅ FlightRequestAPI v8.3.0 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 🔧 v8.3.0: SupabaseCore v1.0.1 최적화된 연결
    async connectToSupabaseCore() {
        try {
            // 이미 연결되어 있으면 스킵
            if (this.core && this.core.isInitialized && this.supabase) {
                console.log('✅ SupabaseCore 이미 연결됨');
                return;
            }

            // window.SupabaseAPI.core 확인
            if (window.SupabaseAPI?.core) {
                const core = window.SupabaseAPI.core;
                
                // 초기화 확인 및 대기
                if (!core.isInitialized) {
                    console.log('⏳ SupabaseCore 초기화 대기 중...');
                    const initialized = await core.ensureInitialized();
                    if (!initialized) {
                        throw new Error('SupabaseCore 초기화 실패');
                    }
                }

                this.core = core;
                this.supabase = core.getClient();
                console.log('✅ SupabaseCore v1.0.1 연결 성공');
                return;
            }

            // 폴백: 기존 window.SupabaseCore 확인
            if (window.SupabaseCore) {
                console.log('🔄 기존 SupabaseCore 사용 (폴백)');
                
                if (!window.SupabaseCore._initialized) {
                    await window.SupabaseCore.init();
                }

                this.supabase = window.SupabaseCore.client;
                
                if (!this.supabase) {
                    throw new Error('SupabaseCore 클라이언트를 찾을 수 없습니다');
                }

                console.log('✅ 기존 SupabaseCore 연결 성공');
                return;
            }

            // 마지막 시도: 직접 대기
            console.log('⏳ SupabaseCore 로딩 대기 중...');
            const startTime = Date.now();
            const timeout = 5000; // 5초로 단축

            while (Date.now() - startTime < timeout) {
                if (window.SupabaseAPI?.core?.isInitialized) {
                    this.core = window.SupabaseAPI.core;
                    this.supabase = this.core.getClient();
                    console.log('✅ SupabaseCore v1.0.1 대기 후 연결 성공');
                    return;
                }

                if (window.SupabaseCore?._initialized && window.SupabaseCore.client) {
                    this.supabase = window.SupabaseCore.client;
                    console.log('✅ 기존 SupabaseCore 대기 후 연결 성공');
                    return;
                }

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            throw new Error('SupabaseCore 연결 타임아웃');

        } catch (error) {
            console.error('❌ SupabaseCore 연결 실패:', error);
            throw error;
        }
    }

    // StorageUtils 연결 (선택적)
    async connectToStorageUtils() {
        try {
            if (window.StorageUtils) {
                this.storageUtils = window.StorageUtils;
                console.log('✅ StorageUtils 연결 성공');
            } else {
                console.log('ℹ️ StorageUtils 없음 (선택적 기능, 계속 진행)');
                this.storageUtils = null;
            }
        } catch (error) {
            console.warn('⚠️ StorageUtils 연결 실패 (선택적 기능, 계속 진행):', error);
            this.storageUtils = null;
        }
    }

    // 초기화 보장 (개선된 로직)
    async ensureInitialized() {
        if (this.isInitialized && (this.core?.isInitialized || this.supabase)) {
            return true;
        }

        console.log('🔄 FlightRequestAPI 초기화 보장 중...');

        try {
            if (!this.initializationPromise) {
                this.initializationPromise = this.initialize();
            }

            await this.initializationPromise;
            
            if (!this.isInitialized) {
                // 재시도
                console.log('🔄 초기화 재시도...');
                this.initializationPromise = this.initialize();
                await this.initializationPromise;
            }

            return this.isInitialized;
        } catch (error) {
            console.error('❌ 초기화 보장 실패:', error);
            throw error;
        }
    }

    // 🔧 v8.3.0: 간소화된 사용자 정보 조회
    async getCurrentUser() {
        try {
            await this.ensureInitialized();

            // localStorage에서 먼저 확인 (빠른 경로)
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    if (studentData?.id) {
                        this.user = { id: studentData.id, email: studentData.email };
                        
                        // SupabaseCore에 사용자 정보 설정
                        if (this.core?.setCurrentUser) {
                            this.core.setCurrentUser(this.user, 'student');
                        }
                        
                        return this.user;
                    }
                } catch (parseError) {
                    console.warn('localStorage 파싱 오류:', parseError);
                }
            }

            // SupabaseCore를 통한 사용자 확인
            if (this.core?.getCurrentUser) {
                const currentUser = this.core.getCurrentUser();
                if (currentUser) {
                    this.user = currentUser;
                    return currentUser;
                }
            }

            // 세션에서 사용자 정보 가져오기
            if (this.supabase) {
                const { data: { user }, error } = await this.supabase.auth.getUser();
                if (error) {
                    console.warn('Auth 오류:', error);
                    throw new Error('사용자 인증 정보를 확인할 수 없습니다');
                }
                
                this.user = user;
                if (user && this.core?.setCurrentUser) {
                    this.core.setCurrentUser(user, 'student');
                }
                return user;
            }

            throw new Error('Supabase 클라이언트를 찾을 수 없습니다');

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
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // SupabaseCore 사용 (가능하면)
            if (this.core?.select) {
                const result = await this.core.select('user_profiles', '*', { id: this.user.id });
                
                if (!result.success) {
                    throw new Error(result.error);
                }

                return result.data?.length > 0 ? result.data[0] : null;
            }

            // 폴백: 직접 supabase 사용
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('사용자 프로필 조회 실패:', error);
            throw error;
        }
    }

    // === 🆕 PASSPORT INFO 기능 통합 ===

    // 기존 여권정보 조회
    async getPassportInfo() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // SupabaseCore 사용 (가능하면)
            if (this.core?.select) {
                const result = await this.core.select('passport_info', '*', { user_id: this.user.id });
                
                if (!result.success) {
                    if (result.error.includes('PGRST116')) {
                        return null; // 데이터 없음
                    }
                    throw new Error(result.error);
                }

                return result.data?.length > 0 ? result.data[0] : null;
            }

            // 폴백: 직접 supabase 사용
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
            return !!passportInfo;
        } catch (error) {
            console.error('여권정보 확인 실패:', error);
            return false;
        }
    }

    // 여권정보 저장
    async savePassportInfo(passportData, imageFile = null) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 기존 정보 확인
            const existingInfo = await this.getPassportInfo();
            let imageUrl = existingInfo?.image_url;

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                // 기존 이미지 삭제 (가능하면)
                if (imageUrl && this.storageUtils) {
                    try {
                        const filePath = this.storageUtils.extractFilePathFromUrl(
                            imageUrl, 
                            this.storageUtils.BUCKETS.PASSPORTS
                        );
                        if (filePath) {
                            await this.deleteFile('passports', filePath);
                        }
                    } catch (deleteError) {
                        console.warn('기존 이미지 삭제 실패 (계속 진행):', deleteError);
                    }
                }
                
                // 새 이미지 업로드
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
                // 수정
                const result = await this.updateData('passport_info', dataToSave, { id: existingInfo.id });
                return { data: result, isUpdate: true };
            } else {
                // 생성
                const result = await this.insertData('passport_info', dataToSave);
                return { data: result, isUpdate: false };
            }
        } catch (error) {
            console.error('여권정보 저장 실패:', error);
            throw error;
        }
    }

    // 여권 이미지 업로드
    async uploadPassportImage(imageFile) {
        try {
            const fileName = `passport_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            return await this.uploadFile('passports', fileName, imageFile, { upsert: true });
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

    // === FLIGHT REQUEST 기능 ===

    // 기존 항공권 신청 조회
    async getExistingRequest() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 직접 supabase 사용 (order by 지원)
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

    // 항공권 신청 생성
    async createFlightRequest(requestData, imageFile) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
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

            return await this.insertData('flight_requests', dataToSave);
        } catch (error) {
            console.error('항공권 신청 생성 실패:', error);
            throw error;
        }
    }

    // 항공권 이미지 업로드
    async uploadFlightImage(imageFile) {
        try {
            const fileName = `${this.user.id}/flight_${Date.now()}.${imageFile.name.split('.').pop()}`;
            return await this.uploadFile('flight-images', fileName, imageFile);
        } catch (error) {
            console.error('항공권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 수정
    async updateFlightRequest(requestId, requestData, imageFile = null) {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
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

    // === 🔧 v8.3.0: 통합된 데이터 조작 메서드들 ===

    async insertData(table, data) {
        if (this.core?.insert) {
            const result = await this.core.insert(table, data);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data[0];
        }

        // 폴백
        const { data: result, error } = await this.supabase
            .from(table)
            .insert(data)
            .select()
            .single();
        
        if (error) throw error;
        return result;
    }

    async updateData(table, data, filters) {
        if (this.core?.update) {
            const result = await this.core.update(table, data, filters);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data[0];
        }

        // 폴백
        let query = this.supabase.from(table).update(data);
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const { data: result, error } = await query.select().single();
        if (error) throw error;
        return result;
    }

    async uploadFile(bucket, path, file, options = {}) {
        if (this.core?.uploadFile) {
            const result = await this.core.uploadFile(bucket, path, file, options);
            if (!result.success) {
                throw new Error(result.error);
            }

            // 공개 URL 생성
            const urlResult = await this.core.getFileUrl(bucket, path);
            if (!urlResult.success) {
                throw new Error(urlResult.error);
            }

            return urlResult.url;
        }

        // 폴백
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: options.upsert || false,
                ...options
            });

        if (error) throw error;

        const { data: urlData } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return urlData.publicUrl;
    }

    async deleteFile(bucket, path) {
        if (this.core?.deleteFile) {
            const result = await this.core.deleteFile(bucket, path);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        }

        // 폴백
        const { error } = await this.supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
        return { success: true };
    }

    // === 유틸리티 메서드들 ===

    // 이미지 미리보기 생성
    async createImagePreview(file) {
        try {
            if (this.storageUtils?.createImagePreview) {
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

    // 파일 유효성 검증
    validateFile(file, fileType = 'image') {
        try {
            if (this.storageUtils?.validateFile) {
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
                throw new Error(`지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})`)
            }

            return { isValid: true };
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }

    // 디버깅 메서드
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasCore: !!this.core,
            hasSupabase: !!this.supabase,
            hasStorageUtils: !!this.storageUtils,
            hasUser: !!this.user,
            coreInitialized: this.core?.isInitialized,
            supabaseAPI: !!window.SupabaseAPI,
            supabaseCore: !!window.SupabaseCore
        };
    }
}

// 🔧 v8.3.0: 최적화된 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.3.0 인스턴스 생성 시작...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.3.0 인스턴스 생성 완료');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 🔧 v8.3.0: 즉시 생성 (대기 시간 최소화)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 100); // 단축된 대기 시간
    });
} else {
    setTimeout(createFlightRequestAPI, 100); // 즉시 실행에 가깝게
}

console.log('✅ FlightRequestAPI v8.3.0 모듈 로드 완료 - SupabaseCore v1.0.1 최적화 연동');
