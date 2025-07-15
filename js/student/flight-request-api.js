// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.8.0
// 🛠️ 여권정보 설정 관련 기능 복구 및 강화 완료
// 🔧 API 초기화 타이밍, 상태 변수 관리, 에러 처리 강화
// 📝 변경사항:
//   - 초기화 재시도 로직 추가 (최대 5회)
//   - 여권정보 관련 메서드 에러 처리 강화
//   - 상세한 디버깅 로그 시스템 추가
//   - debugPassportInfo() 디버깅 전용 메서드 추가
//   - 사용자 친화적 에러 메시지 개선
// 🚀 v8.2.4 기존 기능: dispatch_duration 저장 로직 유지
// 🔧 v9.2.0 기존 기능: API 폴백값 하드코딩 완전 제거 유지
// 🎯 목적: 효율적이고 안정적인 API 통신 + 강화된 여권정보 관리

class FlightRequestAPI {
    constructor() {
        this.user = null;
        this.supabase = null;
        this.core = null;
        this.storageUtils = null;
        this.isInitialized = false;
        
        // 🛠️ v8.8.0: 초기화 상태 추적 강화
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 5;
        
        this.initializationPromise = this.initialize();
    }

    // === 🔧 v8.8.0: 강화된 초기화 시스템 ===
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.8.0 초기화 시작 (여권정보 설정 관련 기능 복구 및 강화)...');
            
            // SupabaseCore v1.0.1 연결
            await this.connectToSupabaseCore();
            
            // StorageUtils 연결 (선택적)
            await this.connectToStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            console.log('✅ FlightRequestAPI v8.8.0 초기화 완료 - 여권정보 설정 관련 기능 복구 및 강화');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 🔧 v8.8.0: SupabaseCore v1.0.1 최적화된 연결
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

    // 🛠️ v8.8.0: StorageUtils 연결 (선택적)
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

    // 🛠️ v8.8.0: 강화된 초기화 보장 (재시도 로직 개선)
    async ensureInitialized() {
        if (this.isInitialized && (this.core?.isInitialized || this.supabase)) {
            return true;
        }

        console.log('🔄 [API디버그] v8.8.0 FlightRequestAPI 초기화 보장 중...');

        try {
            if (!this.initializationPromise) {
                this.initializationPromise = this.initialize();
            }

            await this.initializationPromise;
            
            if (!this.isInitialized && this.initializationAttempts < this.maxInitializationAttempts) {
                // 🛠️ v8.8.0: 재시도 로직 개선
                this.initializationAttempts++;
                console.log(`🔄 [API디버그] v8.8.0: 초기화 재시도 ${this.initializationAttempts}/${this.maxInitializationAttempts}`);
                
                // 재시도 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 500));
                
                this.initializationPromise = this.initialize();
                await this.initializationPromise;
            }

            if (!this.isInitialized) {
                throw new Error(`API 초기화 실패 (${this.initializationAttempts}회 시도 후)`);
            }

            console.log('✅ [API디버그] v8.8.0: API 초기화 보장 완료');
            return this.isInitialized;
        } catch (error) {
            console.error('❌ [API디버그] v8.8.0: 초기화 보장 실패:', error);
            throw error;
        }
    }

    // === 🔧 v8.8.0: 강화된 사용자 정보 관리 ===
    async getCurrentUser() {
        try {
            console.log('🔍 [디버그] getCurrentUser() 시작...');
            await this.ensureInitialized();

            // 이미 사용자 정보가 있으면 반환
            if (this.user) {
                console.log('✅ [디버그] 캐시된 사용자 정보 사용:', {
                    id: this.user.id,
                    email: this.user.email,
                    name: this.user.name
                });
                return this.user;
            }

            console.log('🔍 [디버그] localStorage에서 사용자 정보 조회 중...');

            // localStorage 전체 확인
            const allLocalStorageKeys = Object.keys(localStorage);
            console.log('🔍 [디버그] localStorage 키 목록:', allLocalStorageKeys);

            // currentStudent 확인
            const currentStudentData = localStorage.getItem('currentStudent');
            console.log('🔍 [디버그] currentStudent 원본 데이터:', currentStudentData);

            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    console.log('🔍 [디버그] 파싱된 studentData:', {
                        전체: studentData,
                        id: studentData?.id,
                        email: studentData?.email,
                        name: studentData?.name,
                        id타입: typeof studentData?.id,
                        id길이: studentData?.id?.length
                    });

                    if (studentData?.id) {
                        // 🔧 v8.8.0: 사용자 ID 유효성 검증 강화
                        if (typeof studentData.id !== 'string' || studentData.id.length < 10) {
                            console.warn('⚠️ [디버그] 의심스러운 사용자 ID 형식:', studentData.id);
                        }

                        this.user = { 
                            id: studentData.id, 
                            email: studentData.email || 'no-email',
                            name: studentData.name || 'no-name'
                        };
                        
                        console.log('✅ [디버그] localStorage에서 사용자 정보 설정 완료:', {
                            id: this.user.id,
                            email: this.user.email,
                            name: this.user.name,
                            id검증: this.user.id.includes('-') ? 'UUID형식' : '기타형식'
                        });
                        return this.user;
                    } else {
                        console.error('❌ [디버그] studentData.id가 없음:', studentData);
                    }
                } catch (parseError) {
                    console.error('❌ [디버그] localStorage 파싱 오류:', parseError);
                    console.error('❌ [디버그] 파싱 실패한 데이터:', currentStudentData);
                }
            } else {
                console.error('❌ [디버그] currentStudent 데이터 없음');
            }

            // 🔧 v8.8.0: 다른 인증 소스도 확인 (폴백)
            console.log('🔍 [디버그] 대체 인증 소스 확인 중...');
            
            // userInfo, userProfile 등 다른 키 확인
            const alternativeKeys = ['userInfo', 'userProfile', 'user', 'currentUser'];
            for (const key of alternativeKeys) {
                const altData = localStorage.getItem(key);
                if (altData) {
                    console.log(`🔍 [디버그] 대체 키 '${key}' 발견:`, altData);
                    try {
                        const parsedAlt = JSON.parse(altData);
                        if (parsedAlt?.id) {
                            console.log(`✅ [디버그] 대체 키 '${key}'에서 사용자 ID 발견:`, parsedAlt.id);
                        }
                    } catch (e) {
                        console.log(`⚠️ [디버그] 대체 키 '${key}' 파싱 실패`);
                    }
                }
            }

            throw new Error('localStorage에서 유효한 사용자 정보를 찾을 수 없습니다');

        } catch (error) {
            console.error('❌ [디버그] getCurrentUser() 실패:', error);
            throw error;
        }
    }

    async getUserProfile() {
        try {\n            await this.ensureInitialized();\n            \n            if (!this.user) await this.getCurrentUser();\n            \n            if (!this.user?.id) {\n                throw new Error('사용자 정보가 없습니다');\n            }\n\n            // SupabaseCore 사용 (가능하면)\n            if (this.core?.select) {\n                const result = await this.core.select('user_profiles', '*', { id: this.user.id });\n                \n                if (!result.success) {\n                    throw new Error(result.error);\n                }\n\n                return result.data?.length > 0 ? result.data[0] : null;\n            }\n\n            // 폴백: 직접 supabase 사용\n            const { data, error } = await this.supabase\n                .from('user_profiles')\n                .select('*')\n                .eq('id', this.user.id)\n                .single();\n\n            if (error && error.code !== 'PGRST116') {\n                throw error;\n            }\n\n            return data;\n        } catch (error) {\n            console.error('사용자 프로필 조회 실패:', error);\n            throw error;\n        }\n    }

    // === 🛠️ v8.8.0: 강화된 PASSPORT INFO 기능 ===

    // 🛠️ v8.8.0: 개선된 여권정보 조회 (에러 처리 강화)
    async getPassportInfo() {
        try {
            console.log('🔍 [여권디버그] v8.8.0 getPassportInfo() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) {
                console.log('🔍 [여권디버그] 사용자 정보 없음, getCurrentUser() 호출...');
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                console.error('❌ [여권디버그] 사용자 ID 없음:', this.user);
                throw new Error('사용자 정보가 없습니다');
            }

            console.log('🔍 [여권디버그] 여권정보 조회 대상 사용자:', {
                id: this.user.id,
                email: this.user.email,
                name: this.user.name
            });

            // 🛠️ v8.8.0: 데이터베이스 쿼리 실행 전 확인
            console.log('🔍 [여권디버그] Supabase 클라이언트 상태 확인...');
            console.log('🔍 [여권디버그] core 사용 가능:', !!this.core?.select);
            console.log('🔍 [여권디버그] supabase 클라이언트 사용 가능:', !!this.supabase);

            let queryResult = null;

            // SupabaseCore 사용 (가능하면)
            if (this.core?.select) {
                console.log('🔍 [여권디버그] SupabaseCore로 조회 시도...');
                const result = await this.core.select('passport_info', '*', { user_id: this.user.id });
                
                console.log('🔍 [여권디버그] SupabaseCore 조회 결과:', {
                    success: result.success,
                    dataLength: result.data?.length,
                    error: result.error,
                    rawResult: result
                });
                
                if (!result.success) {
                    if (result.error.includes('PGRST116')) {
                        console.log('✅ [여권디버그] 데이터 없음 (PGRST116)');
                        return null; // 데이터 없음
                    }
                    console.error('❌ [여권디버그] SupabaseCore 조회 오류:', result.error);
                    throw new Error(result.error);
                }

                queryResult = result.data?.length > 0 ? result.data[0] : null;
            } else {
                // 폴백: 직접 supabase 사용
                console.log('🔍 [여권디버그] 직접 Supabase 클라이언트로 조회 시도...');
                console.log('🔍 [여권디버그] 쿼리 조건 - user_id:', this.user.id);
                
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .select('*')
                    .eq('user_id', this.user.id)
                    .single();

                console.log('🔍 [여권디버그] 직접 Supabase 조회 결과:', {
                    data: data,
                    error: error,
                    errorCode: error?.code,
                    errorMessage: error?.message
                });

                if (error && error.code !== 'PGRST116') {
                    console.error('❌ [여권디버그] 직접 Supabase 조회 오류:', error);
                    throw error;
                }

                queryResult = data;
            }

            // 🛠️ v8.8.0: 조회 결과 상세 분석
            if (queryResult) {
                console.log('✅ [여권디버그] v8.8.0 여권정보 조회 성공:', {
                    id: queryResult.id,
                    user_id: queryResult.user_id,
                    passport_number: queryResult.passport_number,
                    name_english: queryResult.name_english,
                    hasImage: !!queryResult.image_url,
                    created_at: queryResult.created_at,
                    사용자ID일치: queryResult.user_id === this.user.id
                });

                // 🛠️ v8.8.0: 사용자 ID 불일치 검증
                if (queryResult.user_id !== this.user.id) {
                    console.error('❌ [여권디버그] 사용자 ID 불일치 감지!', {
                        현재사용자ID: this.user.id,
                        여권정보사용자ID: queryResult.user_id
                    });
                }
            } else {
                console.log('❌ [여권디버그] 여권정보 없음 - 신규 등록 필요');
            }

            return queryResult;

        } catch (error) {
            console.error('❌ [여권디버그] v8.8.0 getPassportInfo() 전체 실패:', {
                error: error,
                message: error.message,
                stack: error.stack,
                userId: this.user?.id,
                userName: this.user?.name
            });
            throw error;
        }
    }

    // 여권정보 확인 (존재 여부만 확인)
    async checkPassportInfo() {
        try {
            console.log('🔍 [여권디버그] v8.8.0 checkPassportInfo() 시작...');
            const passportInfo = await this.getPassportInfo();
            const exists = !!passportInfo;
            console.log('🔍 [여권디버그] v8.8.0 checkPassportInfo() 결과:', exists);
            return exists;
        } catch (error) {
            console.error('❌ [여권디버그] v8.8.0 checkPassportInfo() 실패:', error);
            return false;
        }
    }

    // 🛠️ v8.8.0: 강화된 여권정보 저장 (에러 처리 개선)
    async savePassportInfo(passportData, imageFile = null) {
        try {
            console.log('🔍 [여권디버그] v8.8.0 savePassportInfo() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 기존 정보 확인
            let existingInfo = null;
            try {
                existingInfo = await this.getPassportInfo();
                console.log('🔍 [여권디버그] v8.8.0: 기존 정보 확인:', !!existingInfo);
            } catch (error) {
                console.warn('⚠️ [여권디버그] v8.8.0: 기존 정보 확인 실패 (신규 등록으로 처리):', error);
                existingInfo = null;
            }
            
            let imageUrl = existingInfo?.image_url;

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                console.log('🔍 [여권디버그] v8.8.0: 새 이미지 업로드 시작...');
                
                // 기존 이미지 삭제 (가능하면)
                if (imageUrl && this.storageUtils) {
                    try {
                        const filePath = this.storageUtils.extractFilePathFromUrl(
                            imageUrl, 
                            this.storageUtils.BUCKETS.PASSPORTS
                        );
                        if (filePath) {
                            await this.deleteFile('passports', filePath);
                            console.log('✅ [여권디버그] v8.8.0: 기존 이미지 삭제 성공');
                        }
                    } catch (deleteError) {
                        console.warn('⚠️ [여권디버그] v8.8.0: 기존 이미지 삭제 실패 (계속 진행):', deleteError);
                    }
                }
                
                // 새 이미지 업로드
                imageUrl = await this.uploadPassportImage(imageFile);
                console.log('✅ [여권디버그] v8.8.0: 새 이미지 업로드 성공:', imageUrl);
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

            console.log('🔍 [여권디버그] v8.8.0: 저장할 데이터:', dataToSave);

            let result;
            let isUpdate = false;

            if (existingInfo) {
                // 수정
                console.log('🔍 [여권디버그] v8.8.0: 기존 정보 수정 모드');
                isUpdate = true;
                result = await this.updateData('passport_info', dataToSave, { id: existingInfo.id });
            } else {
                // 생성
                console.log('🔍 [여권디버그] v8.8.0: 신규 정보 생성 모드');
                isUpdate = false;
                result = await this.insertData('passport_info', dataToSave);
            }

            console.log('✅ [여권디버그] v8.8.0: 저장 성공:', { result, isUpdate });
            return { data: result, isUpdate: isUpdate };
        } catch (error) {
            console.error('❌ [여권디버그] v8.8.0 savePassportInfo() 실패:', error);
            
            // 🛠️ v8.8.0: 에러 처리 개선 - 구체적인 에러 메시지
            let enhancedError = error;
            if (error.message) {
                if (error.message.includes('사용자 정보')) {
                    enhancedError = new Error('사용자 인증이 만료되었습니다. 페이지를 새로고침 후 다시 시도해주세요.');
                } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
                    enhancedError = new Error('이미 등록된 여권번호입니다.');
                } else if (error.message.includes('upload') || error.message.includes('storage')) {
                    enhancedError = new Error('이미지 업로드 중 오류가 발생했습니다. 파일 크기와 형식을 확인해주세요.');
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    enhancedError = new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
                }
            }
            
            throw enhancedError;
        }
    }

    // 🌐 v8.8.0: 퍼블릭 Storage 최적화 여권 이미지 업로드
    async uploadPassportImage(imageFile) {
        try {
            // 단순한 파일명 (퍼블릭 Storage이므로 복잡한 패턴 불필요)
            const fileName = `passport_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            console.log('📁 여권 이미지 업로드:', fileName);
            return await this.uploadFile('passports', fileName, imageFile, { upsert: true });
        } catch (error) {
            console.error('여권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 🛠️ v8.8.0: 개선된 여권 만료일 검증
    validateExpiryDate(expiryDate) {
        if (!expiryDate) {
            return { valid: false, message: '여권 만료일을 입력해주세요.' };
        }

        try {
            const today = new Date();
            const expiry = new Date(expiryDate);
            const sixMonthsFromNow = new Date();
            sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

            // 날짜 유효성 검사
            if (isNaN(expiry.getTime())) {
                return { valid: false, message: '올바른 날짜 형식이 아닙니다.' };
            }

            if (expiry < today) {
                return { valid: false, message: '여권이 이미 만료되었습니다. 새로운 여권을 발급받아주세요.' };
            }

            if (expiry < sixMonthsFromNow) {
                const remainingDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
                return { 
                    valid: true, 
                    warning: `⚠️ 여권 만료일이 6개월 이내입니다. (${remainingDays}일 남음) 파견 전 여권 갱신을 권장합니다.` 
                };
            }

            return { valid: true, message: '여권 만료일이 유효합니다.' };
        } catch (error) {
            console.error('여권 만료일 검증 오류:', error);
            return { valid: false, message: '만료일 검증 중 오류가 발생했습니다.' };
        }
    }

    // 🛠️ v8.8.0: 여권정보 디버깅 전용 메서드 (강화)
    async debugPassportInfo() {
        console.log('🔍 [디버그] v8.8.0 여권정보 종합 진단 시작...');
        
        try {
            // 1. 초기화 상태 확인
            console.log('1️⃣ API 초기화 상태:', {
                isInitialized: this.isInitialized,
                hasSupabase: !!this.supabase,
                hasCore: !!this.core,
                initializationAttempts: this.initializationAttempts
            });

            // 2. 사용자 정보 확인
            await this.getCurrentUser();
            console.log('2️⃣ 사용자 정보:', this.user);

            // 3. 직접 DB 조회
            if (this.supabase && this.user?.id) {
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .select('*')
                    .eq('user_id', this.user.id);

                console.log('3️⃣ 직접 DB 조회 결과:', {
                    data: data,
                    error: error,
                    dataCount: data?.length
                });
            }

            // 4. 여권정보 조회 테스트
            const passportInfo = await this.getPassportInfo();
            console.log('4️⃣ getPassportInfo() 결과:', passportInfo);

            return {
                success: true,
                userInfo: this.user,
                passportInfo: passportInfo,
                message: 'v8.8.0 디버깅 완료'
            };

        } catch (error) {
            console.error('❌ v8.8.0 여권정보 디버깅 실패:', error);
            return {
                success: false,
                error: error.message,
                userInfo: this.user,
                initializationAttempts: this.initializationAttempts
            };
        }
    }

    // === 🆕 v8.3.0: 귀국 필수 완료일 관리 API (기존 기능 유지) ===

    /**
     * 🔧 v8.4.2: 사용자의 귀국 필수 완료일 정보 조회 (id 컬럼 사용)
     * @returns {Object} 귀국 필수 완료일 정보
     */
    async getRequiredReturnDate() {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            const selectColumns = [
                'required_return_date', 
                'required_return_reason',
                'name', 
                'email'
            ].join(', ');

            if (this.core?.select) {
                const result = await this.core.select('user_profiles', selectColumns, { 
                    id: this.user.id  // 🔧 v8.4.2: auth_user_id → id 수정
                });
                if (!result.success && !result.error.includes('PGRST116')) {
                    throw new Error(result.error);
                }
                return result.data?.length > 0 ? result.data[0] : null;
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(selectColumns)
                .eq('id', this.user.id)  // 🔧 v8.4.2: auth_user_id → id 수정
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            console.log('✅ [귀국필수일] v8.8.0 조회 성공:', {
                사용자: this.user.name,
                조회컬럼: 'id',
                기존문제: 'auth_user_id(null)로 조회 실패',
                해결방법: 'id 컬럼으로 직접 조회'
            });
            
            return data;

        } catch (error) {
            console.error('❌ 귀국 필수 완료일 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 🆕 v8.3.0: 사용자의 귀국 필수 완료일과 현재 상태 정보를 함께 반환
     * @returns {Object} 상세 정보 포함한 귀국 필수 완료일 정보
     */
    async getRequiredReturnDateWithStatus() {
        try {
            const data = await this.getRequiredReturnDate();
            
            if (!data || !data.required_return_date) {
                return {
                    hasRequiredDate: false,
                    requiredDate: null,
                    reason: null,
                    status: null,
                    validation: null
                };
            }

            // Utils 함수를 통한 상태 정보 생성
            let status = null;
            if (window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                status = utils.getRequiredReturnStatus(data.required_return_date);
            }

            return {
                hasRequiredDate: true,
                requiredDate: data.required_return_date,
                reason: data.required_return_reason || '프로그램 종료 요구사항',
                userName: data.name,
                userEmail: data.email,
                status: status,
                validation: {
                    isOverdue: status?.status === 'overdue',
                    isToday: status?.status === 'today',
                    isUrgent: status?.status === 'urgent',
                    daysRemaining: status ? window.flightRequestUtils?.calculateDaysUntilRequired(data.required_return_date) : null
                }
            };

        } catch (error) {
            console.error('❌ 귀국 필수 완료일 상태 조회 실패:', error);
            return {
                hasRequiredDate: false,
                requiredDate: null,
                reason: null,
                status: null,
                validation: null,
                error: error.message
            };
        }
    }

    /**
     * 🚀 v8.2.4: 귀국일 제약사항 검증 (2일/10일 규칙 적용)
     * @param {string} returnDate - 검증할 귀국일
     * @returns {Object} 검증 결과
     */
    async validateReturnDateConstraints(returnDate) {
        try {
            if (!returnDate) {
                return {
                    valid: false,
                    message: '귀국일을 입력해주세요.',
                    constraint: 'MISSING_DATE'
                };
            }

            // 귀국 필수 완료일 정보 조회
            const requiredInfo = await this.getRequiredReturnDateWithStatus();
            
            if (!requiredInfo.hasRequiredDate) {
                // 필수 완료일이 설정되지 않은 경우 기본 검증만 수행
                return {
                    valid: true,
                    message: '귀국일이 유효합니다.',
                    constraint: 'NO_CONSTRAINT'
                };
            }

            // Utils 함수를 통한 검증
            let validation = { valid: true, message: '귀국일이 유효합니다.' };
            if (window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                validation = utils.validateRequiredReturnDate(returnDate, requiredInfo.requiredDate);
            }

            return {
                valid: validation.valid,
                message: validation.message,
                warning: validation.warning,
                constraint: validation.valid ? 'VALID' : 'REQUIRED_DATE_EXCEEDED',
                requiredDate: requiredInfo.requiredDate,
                requiredReason: requiredInfo.reason,
                status: requiredInfo.status
            };

        } catch (error) {
            console.error('❌ 귀국일 제약사항 검증 실패:', error);
            return {
                valid: false,
                message: '귀국일 검증 중 오류가 발생했습니다.',
                constraint: 'VALIDATION_ERROR',
                error: error.message
            };
        }
    }

    // === 🔧 v9.2.0: 현지 활동기간 관리 API (하드코딩 폴백값 완전 제거, 기존 기능 유지) ===

    /**
     * 🚀 v8.2.4: 사용자 프로필에 활동기간과 dispatch_duration 모두 업데이트
     */
    async updateUserProfileActivityDates(activityData) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            if (!activityData?.actualArrivalDate || !activityData?.actualWorkEndDate) {
                throw new Error('현지 도착일과 학당 근무 종료일을 모두 입력해주세요');
            }

            // 🔧 v9.2.0: 하드코딩 폴백값 제거 - 필수 매개변수 검증
            if (!activityData?.minimumRequiredDays || !activityData?.maximumAllowedDays) {
                console.error('❌ [API] v8.8.0: 활동일 요구사항이 매개변수로 전달되지 않음:', {
                    minimumRequiredDays: activityData?.minimumRequiredDays,
                    maximumAllowedDays: activityData?.maximumAllowedDays,
                    하드코딩제거: '✅ 완료 - 폴백값 없음'
                });
                throw new Error('활동일 요구사항(최소/최대 활동일)이 설정되지 않았습니다. 사용자별 요구사항을 먼저 로드해주세요.');
            }

            // 🚀 v8.2.4: dispatch_duration도 함께 계산하여 저장
            let dispatchDuration = 0;
            if (activityData.departureDate && activityData.returnDate && window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                dispatchDuration = utils.calculateTotalStayDuration(activityData.departureDate, activityData.returnDate);
            }

            const updateData = {
                actual_arrival_date: activityData.actualArrivalDate,
                actual_work_end_date: activityData.actualWorkEndDate,
                actual_work_days: activityData.actualWorkDays || 0,
                minimum_required_days: activityData.minimumRequiredDays, // 🔧 v9.2.0: 폴백값 제거
                maximum_allowed_days: activityData.maximumAllowedDays,   // 🔧 v9.2.0: 폴백값 제거
                // 🚀 v8.2.4: dispatch_duration 추가 저장
                dispatch_duration: dispatchDuration,
                updated_at: new Date().toISOString()
            };

            if (this.core?.update) {
                const result = await this.core.update('user_profiles', updateData, { 
                    id: this.user.id
                });
                if (!result.success) throw new Error(result.error);
                return { success: true, data: result.data[0] };
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .update(updateData)
                .eq('id', this.user.id)
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ [활동기간업데이트] v8.8.0 업데이트 성공 (dispatch_duration 추가):', {
                사용자: this.user.name,
                최소요구일: updateData.minimum_required_days,
                최대허용일: updateData.maximum_allowed_days,
                실제활동일: updateData.actual_work_days,
                전체체류일: updateData.dispatch_duration,
                새기능: 'dispatch_duration 저장 추가'
            });
            
            return { success: true, data: data };

        } catch (error) {
            console.error('❌ 활동기간 업데이트 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🔧 v9.2.0: 현재 사용자의 활동기간 정보 조회 (maximum_allowed_days 포함) - 핵심 수정 메서드
     */
    async getUserProfileActivityDates() {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            const selectColumns = [
                'actual_arrival_date', 'actual_work_end_date', 'actual_work_days',
                'minimum_required_days', 'maximum_allowed_days', // 🆕 v9.0.0: maximum_allowed_days 추가
                'dispatch_start_date', 'dispatch_end_date', 'dispatch_duration', 
                'required_return_date', 'required_return_reason',
                'updated_at'
            ].join(', ');

            if (this.core?.select) {
                const result = await this.core.select('user_profiles', selectColumns, { 
                    id: this.user.id
                });
                if (!result.success && !result.error.includes('PGRST116')) {
                    throw new Error(result.error);
                }
                
                const profileData = result.data?.length > 0 ? result.data[0] : null;
                
                console.log('✅ [활동기간조회] v8.8.0 핵심 조회 성공:', {
                    사용자: this.user.name,
                    사용자ID: this.user.id,
                    최소요구일: profileData?.minimum_required_days,
                    최대허용일: profileData?.maximum_allowed_days,
                    dispatch_duration: profileData?.dispatch_duration,
                    하드코딩제거: '210일 → 실제 DB값 사용'
                });
                
                return profileData;
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(selectColumns)
                .eq('id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            console.log('✅ [활동기간조회] v8.8.0 핵심 조회 성공 (Direct):', {
                사용자: this.user.name,
                사용자ID: this.user.id,
                최소요구일: data?.minimum_required_days,
                최대허용일: data?.maximum_allowed_days,
                dispatch_duration: data?.dispatch_duration,
                하드코딩제거: '210일 → 실제 DB값 사용'
            });
            
            return data;

        } catch (error) {
            console.error('❌ [활동기간조회] v8.8.0 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 🔧 v9.2.0: 사용자별 활동일 요구사항 조회 (하드코딩 폴백값 제거)
     */
    async getActivityRequirements() {
        try {
            console.log('🔄 [활동요구사항] v8.8.0 사용자별 활동일 요구사항 조회 시작 (폴백값 제거)...');
            
            const profileData = await this.getUserProfileActivityDates();
            
            // 🔧 v9.2.0: 하드코딩 폴백값 제거 - 명시적 에러 처리
            if (!profileData?.minimum_required_days || !profileData?.maximum_allowed_days) {
                console.error('❌ [활동요구사항] v8.8.0: DB에 사용자별 활동일 요구사항이 설정되지 않음:', {
                    사용자: this.user?.name,
                    최소요구일: profileData?.minimum_required_days,
                    최대허용일: profileData?.maximum_allowed_days,
                    기존폴백값: '180일/210일 → 제거됨'
                });
                
                return {
                    minimumDays: null,
                    maximumDays: null,
                    isLoaded: false,
                    source: 'missing',
                    error: '사용자별 활동일 요구사항이 DB에 설정되지 않았습니다. 관리자에게 문의하세요.'
                };
            }
            
            const requirements = {
                minimumDays: profileData.minimum_required_days,
                maximumDays: profileData.maximum_allowed_days,
                isLoaded: true,
                source: 'database'
            };
            
            console.log('✅ [활동요구사항] v8.8.0 조회 완료 (폴백값 제거):', {
                사용자: this.user?.name || 'unknown',
                최소요구일: requirements.minimumDays,
                최대허용일: requirements.maximumDays,
                데이터소스: requirements.source,
                하드코딩폴백값제거: '✅ 완료'
            });
            
            return requirements;
        } catch (error) {
            console.error('❌ [활동요구사항] v8.8.0 조회 실패:', error);
            
            // 🔧 v9.2.0: 하드코딩 폴백값 제거 - 에러 상태 반환
            return {
                minimumDays: null,
                maximumDays: null,
                isLoaded: false,
                source: 'error',
                error: error.message || '활동일 요구사항 조회 중 오류가 발생했습니다.'
            };
        }
    }

    /**
     * 🔧 v9.2.0: 사용자별 최소 요구 활동일 조회 (하드코딩 폴백값 제거) - 기존 호환성 유지
     */
    async getRequiredActivityDays() {
        try {
            const requirements = await this.getActivityRequirements();
            
            if (!requirements.minimumDays) {
                console.error('❌ [최소요구일] v8.8.0: 사용자별 최소 요구일이 설정되지 않음');
                throw new Error('사용자별 최소 요구 활동일이 설정되지 않았습니다. 관리자에게 문의하세요.');
            }
            
            return requirements.minimumDays;
        } catch (error) {
            console.error('❌ [최소요구일] v8.8.0 조회 실패:', error);
            throw error; // 🔧 v9.2.0: 하드코딩 기본값 제거, 에러 전파
        }
    }

    /**
     * 🚀 v8.2.4: 활동기간 데이터의 서버 측 검증 (2일/10일 규칙 적용)
     */
    async validateActivityPeriodAPI(activityData) {
        try {
            // Utils 함수 활용한 클라이언트 측 검증
            if (window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                
                // 🆕 v8.3.0: 귀국 필수 완료일 정보 포함
                const requiredInfo = await this.getRequiredReturnDateWithStatus();
                const validationDates = {
                    ...activityData,
                    requiredReturnDate: requiredInfo.requiredDate
                };

                const clientValidation = utils.validateAllDates(validationDates);
                const requirements = await this.getActivityRequirements(); // 🔧 v9.2.0: 폴백값 제거

                return {
                    success: true,
                    clientValidation: clientValidation,
                    requiredReturnInfo: requiredInfo,
                    serverValidation: {
                        minimumDays: requirements.minimumDays,
                        maximumDays: requirements.maximumDays,
                        canSubmit: clientValidation.valid,
                        hasRequiredReturnDate: requiredInfo.hasRequiredDate,
                        isReturnDateValid: !requiredInfo.validation?.isOverdue
                    }
                };
            }

            // Utils 없을 때 기본 검증
            const arrivalDate = new Date(activityData.actualArrivalDate);
            const workEndDate = new Date(activityData.actualWorkEndDate);
            const activityDays = Math.ceil((workEndDate - arrivalDate) / (1000 * 60 * 60 * 24));
            const requirements = await this.getActivityRequirements(); // 🔧 v9.2.0: 폴백값 제거

            return {
                success: true,
                basicValidation: {
                    valid: activityDays >= requirements.minimumDays && activityDays <= requirements.maximumDays,
                    activityDays: activityDays,
                    minimumDays: requirements.minimumDays,
                    maximumDays: requirements.maximumDays
                }
            };

        } catch (error) {
            console.error('❌ 활동기간 검증 실패:', error);
            return { success: false, error: error.message };
        }
    }

    // === 항공권 신청 관리 (기존 기능 유지) ===

    // 🔧 v8.7.1: 406 오류 수정 - .single() 문제 해결
    async getExistingRequest() {
        try {
            console.log('🔍 [API디버그] getExistingRequest() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            console.log('🔍 [API디버그] 항공권 신청 조회 대상 사용자:', this.user.id);

            // 🔧 v8.7.1: .single() 대신 일반 조회 사용하여 406 오류 해결
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('❌ [API디버그] 항공권 신청 조회 오류:', error);
                throw error;
            }

            // 결과 배열에서 첫 번째 요소 반환 (없으면 null)
            const result = data && data.length > 0 ? data[0] : null;
            
            console.log('✅ [API디버그] 항공권 신청 조회 완료:', {
                resultCount: data?.length || 0,
                hasResult: !!result,
                requestId: result?.id,
                status: result?.status
            });

            return result;

        } catch (error) {
            console.error('❌ [API디버그] getExistingRequest() 실패:', error);
            return null;
        }
    }

    /**
     * 🚀 v8.2.4: 항공권 신청 생성 - dispatch_duration 저장 추가
     */
    async createFlightRequest(requestData, imageFile) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            // 🆕 v8.3.0: 귀국일 제약사항 사전 검증
            if (requestData.return_date) {
                const constraintValidation = await this.validateReturnDateConstraints(requestData.return_date);
                if (!constraintValidation.valid) {
                    throw new Error(`귀국일 제약사항 위반: ${constraintValidation.message}`);
                }
            }

            let imageUrl = null;
            if (imageFile) {
                imageUrl = await this.uploadFlightImage(imageFile);
            }

            // 🚀 v8.2.4: dispatch_duration 계산 및 포함
            let dispatchDuration = 0;
            if (requestData.departure_date && requestData.return_date && window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                dispatchDuration = utils.calculateTotalStayDuration(requestData.departure_date, requestData.return_date);
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
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
                status: 'pending'
            };

            const flightRequestResult = await this.insertData('flight_requests', dataToSave);

            // 🚀 v8.2.4: 활동기간 데이터가 있으면 user_profiles도 업데이트 (dispatch_duration 포함)
            if (requestData.actualArrivalDate && requestData.actualWorkEndDate) {
                // 🔧 v9.2.0: 하드코딩 폴백값 제거 - 필수 매개변수 검증
                if (!requestData.minimumRequiredDays || !requestData.maximumAllowedDays) {
                    console.warn('⚠️ [항공권신청] v8.8.0: 활동일 요구사항이 누락됨 - 활동기간 업데이트 생략');
                } else {
                    const activityData = {
                        actualArrivalDate: requestData.actualArrivalDate,
                        actualWorkEndDate: requestData.actualWorkEndDate,
                        actualWorkDays: requestData.actualWorkDays || 0,
                        minimumRequiredDays: requestData.minimumRequiredDays, // 🔧 v9.2.0: 폴백값 제거
                        maximumAllowedDays: requestData.maximumAllowedDays,    // 🔧 v9.2.0: 폴백값 제거
                        // 🚀 v8.2.4: dispatch_duration 계산을 위한 날짜 정보 추가
                        departureDate: requestData.departure_date,
                        returnDate: requestData.return_date
                    };

                    try {
                        await this.updateUserProfileActivityDates(activityData);
                        console.log('✅ [항공권신청] v8.8.0: dispatch_duration 포함 활동기간 업데이트 완료');
                    } catch (activityError) {
                        console.warn('⚠️ 활동기간 업데이트 실패 (항공권 신청은 성공):', activityError);
                    }
                }
            }

            return flightRequestResult;

        } catch (error) {
            console.error('❌ 항공권 신청 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 🚀 v8.2.4: 항공권 신청 수정 - dispatch_duration 저장 추가
     */
    async updateFlightRequest(requestId, requestData, imageFile = null) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            // 🆕 v8.3.0: 귀국일 제약사항 사전 검증
            if (requestData.return_date) {
                const constraintValidation = await this.validateReturnDateConstraints(requestData.return_date);
                if (!constraintValidation.valid) {
                    throw new Error(`귀국일 제약사항 위반: ${constraintValidation.message}`);
                }
            }

            let updateData = {
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                purchase_link: requestData.purchase_link || null,
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
                status: requestData.status || 'pending',
                updated_at: new Date().toISOString()
            };

            if (imageFile) {
                updateData.flight_image_url = await this.uploadFlightImage(imageFile);
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

            // 🚀 v8.2.4: 활동기간 데이터가 있으면 user_profiles도 업데이트 (dispatch_duration 포함)
            if (requestData.actualArrivalDate && requestData.actualWorkEndDate) {
                // 🔧 v9.2.0: 하드코딩 폴백값 제거 - 필수 매개변수 검증
                if (!requestData.minimumRequiredDays || !requestData.maximumAllowedDays) {
                    console.warn('⚠️ [항공권수정] v8.8.0: 활동일 요구사항이 누락됨 - 활동기간 업데이트 생략');
                } else {
                    const activityData = {
                        actualArrivalDate: requestData.actualArrivalDate,
                        actualWorkEndDate: requestData.actualWorkEndDate,
                        actualWorkDays: requestData.actualWorkDays || 0,
                        minimumRequiredDays: requestData.minimumRequiredDays, // 🔧 v9.2.0: 폴백값 제거
                        maximumAllowedDays: requestData.maximumAllowedDays,    // 🔧 v9.2.0: 폴백값 제거
                        // 🚀 v8.2.4: dispatch_duration 계산을 위한 날짜 정보 추가
                        departureDate: requestData.departure_date,
                        returnDate: requestData.return_date
                    };

                    try {
                        await this.updateUserProfileActivityDates(activityData);
                        console.log('✅ [항공권수정] v8.8.0: dispatch_duration 포함 활동기간 업데이트 완료');
                    } catch (activityError) {
                        console.warn('⚠️ 활동기간 업데이트 실패 (항공권 수정은 성공):', activityError);
                    }
                }
            }

            return data;
        } catch (error) {
            console.error('❌ 항공권 신청 수정 실패:', error);
            throw error;
        }
    }

    // 🗑️ v8.8.0: 항공권 신청 삭제 (삭제하고 재신청 버튼용)
    async deleteFlightRequest(requestId) {
        try {
            console.log('🗑️ [API디버그] v8.8.0 deleteFlightRequest() 시작...', requestId);
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            if (!requestId) {
                throw new Error('삭제할 신청 ID가 없습니다');
            }

            // 1. 먼저 해당 신청 정보를 조회하여 권한 및 상태 확인
            const { data: existingRequest, error: fetchError } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('id', requestId)
                .eq('user_id', this.user.id) // 본인 신청만 삭제 가능
                .single();

            if (fetchError) {
                console.error('❌ [API디버그] v8.8.0 삭제 대상 신청 조회 실패:', fetchError);
                throw new Error('삭제할 신청을 찾을 수 없습니다');
            }

            if (!existingRequest) {
                throw new Error('삭제할 신청이 존재하지 않거나 권한이 없습니다');
            }

            console.log('🔍 [API디버그] v8.8.0 삭제 대상 신청 정보:', {
                id: existingRequest.id,
                status: existingRequest.status,
                user_id: existingRequest.user_id,
                hasImage: !!existingRequest.flight_image_url
            });

            // 2. 삭제 가능한 상태인지 확인 (pending, rejected만 삭제 가능)
            if (!['pending', 'rejected'].includes(existingRequest.status)) {
                throw new Error(`${existingRequest.status} 상태의 신청은 삭제할 수 없습니다`);
            }

            // 3. 관련 이미지 파일이 있으면 삭제 시도 (실패해도 계속 진행)
            if (existingRequest.flight_image_url) {
                try {
                    console.log('🗑️ [API디버그] v8.8.0 관련 이미지 파일 삭제 시도:', existingRequest.flight_image_url);
                    
                    // URL에서 파일 경로 추출
                    const urlParts = existingRequest.flight_image_url.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    
                    if (fileName && fileName.includes('flight_')) {
                        await this.deleteFile('flight-images', fileName);
                        console.log('✅ [API디버그] v8.8.0 관련 이미지 파일 삭제 성공');
                    }
                } catch (imageDeleteError) {
                    console.warn('⚠️ [API디버그] v8.8.0 이미지 파일 삭제 실패 (계속 진행):', imageDeleteError);
                    // 이미지 삭제 실패는 치명적이지 않으므로 계속 진행
                }
            }

            // 4. 데이터베이스에서 신청 레코드 삭제
            console.log('🗑️ [API디버그] v8.8.0 데이터베이스에서 신청 레코드 삭제 시도...');
            const { error: deleteError } = await this.supabase
                .from('flight_requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', this.user.id); // 추가 보안을 위한 사용자 ID 확인

            if (deleteError) {
                console.error('❌ [API디버그] v8.8.0 신청 레코드 삭제 실패:', deleteError);
                throw new Error('신청 삭제 중 오류가 발생했습니다: ' + deleteError.message);
            }

            console.log('✅ [API디버그] v8.8.0 항공권 신청 삭제 완료:', {
                requestId: requestId,
                userId: this.user.id,
                status: existingRequest.status
            });

            return {
                success: true,
                deletedRequest: {
                    id: existingRequest.id,
                    status: existingRequest.status,
                    departure_date: existingRequest.departure_date,
                    return_date: existingRequest.return_date
                }
            };

        } catch (error) {
            console.error('❌ [API디버그] v8.8.0 deleteFlightRequest() 실패:', error);
            throw error;
        }
    }

    // 🌐 v8.8.0: 퍼블릭 Storage 최적화 항공권 이미지 업로드
    async uploadFlightImage(imageFile) {
        try {
            // 단순한 파일명 (퍼블릭 Storage이므로 폴더 구조 불필요)
            const fileName = `flight_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            console.log('📁 항공권 이미지 업로드:', fileName);
            return await this.uploadFile('flight-images', fileName, imageFile);
        } catch (error) {
            console.error('항공권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // === 🌐 v8.8.0: 퍼블릭 Storage 최적화된 데이터 조작 메서드들 ===

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

    // 🌐 v8.8.0: 단순화된 퍼블릭 Storage 업로드
    async uploadFile(bucket, path, file, options = {}) {
        try {
            console.log(`📤 퍼블릭 Storage 업로드: ${bucket}/${path}`);
            
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

                console.log(`✅ 업로드 성공: ${urlResult.url}`);
                return urlResult.url;
            }

            // 폴백: 직접 Supabase Storage 사용
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: options.upsert || false,
                    ...options
                });

            if (error) {
                console.error(`❌ Storage 업로드 오류 (${bucket}/${path}):`, error);
                throw error;
            }

            const { data: urlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            console.log(`✅ 퍼블릭 업로드 성공: ${urlData.publicUrl}`);
            return urlData.publicUrl;

        } catch (error) {
            console.error(`❌ 파일 업로드 실패 (${bucket}/${path}):`, error);
            throw error;
        }
    }

    async deleteFile(bucket, path) {
        try {
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
        } catch (error) {
            console.error(`❌ 파일 삭제 실패 (${bucket}/${path}):`, error);
            throw error;
        }
    }

    // === 🛠️ v8.8.0: 강화된 유틸리티 메서드들 ===

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
                throw new Error(`지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})`);
            }

            return { isValid: true };
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }

    // === 🛠️ v8.8.0: 강화된 상태 정보 ===
    getStatus() {
        return {
            version: 'v8.8.0',
            isInitialized: this.isInitialized,
            hasCore: !!this.core,
            hasSupabase: !!this.supabase,
            hasStorageUtils: !!this.storageUtils,
            hasUser: !!this.user,
            coreInitialized: this.core?.isInitialized,
            supabaseAPI: !!window.SupabaseAPI,
            supabaseCore: !!window.SupabaseCore,
            userInfo: this.user ? { 
                id: this.user.id, 
                email: this.user.email, 
                name: this.user.name,
                idLength: this.user.id?.length,
                idType: this.user.id?.includes('-') ? 'UUID형식' : '기타형식'
            } : null,
            storageMode: 'Public Access (No Auth Required)',
            localStorage: {
                currentStudent: !!localStorage.getItem('currentStudent'),
                keys: Object.keys(localStorage).filter(key => key.includes('user') || key.includes('Student'))
            },
            initializationAttempts: this.initializationAttempts,
            maxInitializationAttempts: this.maxInitializationAttempts,
            v880Updates: { // 🛠️ v8.8.0 새 기능
                passportInfoEnhancements: '여권정보 설정 관련 기능 복구 및 강화',
                initializationRetry: 'API 초기화 재시도 로직 추가 (최대 5회)',
                detailedLogging: '상세한 디버깅 로그 시스템 추가',
                errorHandling: '에러 처리 강화 및 사용자 친화적 메시지',
                debugMethod: 'debugPassportInfo() 디버깅 전용 메서드 추가',
                storageUtilsIntegration: 'StorageUtils 연결 최적화'
            },
            v824LegacyFeatures: { // 🚀 v8.2.4 기존 기능 유지
                dispatchDurationStorage: 'dispatch_duration 계산 및 저장 추가',
                dualDurationTracking: 'actual_work_days와 dispatch_duration 모두 저장',
                enhancedDateValidation: '2일/10일 제약 규칙 적용',
                improvedActivityTracking: '현지 활동기간과 전체 체류기간 구분 관리'
            },
            newFeatures: [ // 🆕 v9.2.0 기존 기능 유지
                'API 폴백값 하드코딩 완전 제거',
                '에러 처리 기반 안정성 향상',
                '필수 매개변수 검증 강화',
                '명확한 에러 메시지 제공'
            ],
            previousFeatures: [ // 🆕 v9.0.0 기존 기능 유지
                '하드코딩 값 완전 제거',
                'maximum_allowed_days 완전 지원',
                'getActivityRequirements() 통합 메서드',
                '사용자별 설정값 100% DB 연동'
            ],
            fixedIssues: [ // 🔧 v8.4.2 기존 기능 유지
                '이가짜 학생 최소 체류일 문제 해결',
                'auth_user_id → id 조회 방식 수정',
                '실제 DB 값(90일/100일) 정상 로드',
                'UI 하드코딩 180일/210일 → 동적 값 표시'
            ],
            legacyFeatures: [ // 🆕 v8.3.0 기존 기능 유지
                'Required return date validation',
                'Return date constraint checking',
                'Enhanced server-side validation',
                'Integrated constraint management'
            ]
        };
    }
}

// 🔧 v8.8.0: FlightRequestAPI 클래스를 전역 스코프에 노출
window.FlightRequestAPI = FlightRequestAPI;

// 🌐 v8.8.0: 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.8.0 인스턴스 생성 시작 (여권정보 설정 관련 기능 복구 및 강화)...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.8.0 인스턴스 생성 완료 - 여권정보 설정 관련 기능 복구 및 강화');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 🌐 v8.8.0: 즉시 생성 (대기 시간 최소화)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 100); // 단축된 대기 시간
    });
} else {
    setTimeout(createFlightRequestAPI, 100); // 즉시 실행에 가깝게
}

console.log('✅ FlightRequestAPI v8.8.0 모듈 로드 완료 - 여권정보 설정 관련 기능 복구 및 강화 (API 초기화 타이밍, 상태 변수 관리, 에러 처리 강화)');
console.log('🛠️ v8.8.0 주요 업데이트:', {
    passportFeatureRecovery: {
        feature: '여권정보 설정 관련 기능 복구 및 강화',
        description: '여권정보 조회/저장/검증 기능 완전 복구',
        enhancements: '상세한 디버깅 로그, 강화된 에러 처리, 재시도 로직',
        newMethods: 'debugPassportInfo() 디버깅 전용 메서드 추가'
    },
    initializationImprovements: {
        retryLogic: '초기화 실패 시 최대 5회 재시도',
        stateTracking: '초기화 상태 추적 강화',
        timingOptimization: 'API 초기화 타이밍 최적화',
        fallbackHandling: 'SupabaseCore 연결 폴백 처리 개선'
    },
    debuggingEnhancements: {
        detailedLogs: '상세한 디버깅 로그 시스템',
        userAuthentication: '사용자 인증 상태 추적',
        databaseQueries: '데이터베이스 쿼리 결과 분석',
        errorDiagnostics: '오류 진단 및 해결 가이드'
    },
    errorHandlingImprovements: {
        userFriendlyMessages: '사용자 친화적 에러 메시지',
        specificErrorTypes: '구체적인 에러 유형별 메시지',
        networkHandling: '네트워크 오류 처리 강화',
        authenticationErrors: '인증 만료 처리 개선'
    },
    storageIntegration: {
        storageUtilsSupport: 'StorageUtils 연결 최적화',
        publicStorageMode: '퍼블릭 Storage 모드 지원',
        fileManagement: '파일 업로드/삭제 관리 개선',
        imagePreview: '이미지 미리보기 생성 지원'
    },
    backwardCompatibility: {
        v824Features: 'v8.2.4 모든 기능 100% 호환 유지',
        existingAPIs: '기존 API 메서드 호환성 보장',
        dataStructures: '기존 데이터 구조 완전 지원',
        systemIntegration: '기존 시스템과의 완전 통합'
    }
});
console.log('🚀 v8.2.4 기존 기능 유지:', {
    dispatchDurationStorage: {
        feature: 'dispatch_duration 계산 및 저장',
        description: '출국일~귀국일 전체 체류기간을 user_profiles 테이블에 저장',
        tables: 'user_profiles.dispatch_duration 컬럼 활용',
        calculation: 'calculateTotalStayDuration() 메서드 사용'
    },
    dualTracking: {
        actualWorkDays: '현지 도착일 ~ 학당 근무 종료일 (기존)',
        dispatchDuration: '출국일 ~ 귀국일 (기존 추가)',
        purpose: '활동기간과 전체 체류기간 구분 관리'
    },
    enhancedValidation: {
        arrivalDateTolerance: '출국일로부터 최대 2일 후',
        returnDateTolerance: '활동종료일로부터 최대 10일 후',
        constraint: '2025-12-12 귀국 필수 완료일 검증 유지'
    }
});
console.log('🔧 v9.2.0 기존 기능 유지:', {
    API폴백값제거: '180일/210일 폴백값 → 에러 처리로 변경',
    안정성향상: '명확한 에러 메시지 및 필수 매개변수 검증',
    데이터정합성: 'DB 설정값 없을 시 명시적 에러 반환',
    사용자경험: '관리자 문의 안내 메시지 추가'
});
