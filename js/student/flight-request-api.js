// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.7.2
// 🗑️ 삭제 기능 추가: "삭제하고 재신청" 버튼 문제 해결
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

    // 🚀 v8.4.1: 퍼블릭 Storage 최적화된 연동
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.7.2 초기화 시작 (삭제 기능 추가)...');
            
            // SupabaseCore v1.0.1 연결
            await this.connectToSupabaseCore();
            
            // StorageUtils 연결 (선택적)
            await this.connectToStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            console.log('✅ FlightRequestAPI v8.7.2 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 🔧 v8.4.1: SupabaseCore v1.0.1 최적화된 연결
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

    // 🔧 v8.4.1: 강화된 사용자 정보 조회 (상세한 디버깅 로그)
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
                        // 🔧 v8.4.1: 사용자 ID 유효성 검증 강화
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

            // 🔧 v8.4.1: 다른 인증 소스도 확인 (폴백)
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

    // === 🔧 v8.4.1: 강화된 PASSPORT INFO 기능 ===

    // 🔧 v8.4.1: 상세한 디버깅이 포함된 여권정보 조회
    async getPassportInfo() {
        try {
            console.log('🔍 [여권디버그] getPassportInfo() 시작...');
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

            // 🔧 v8.4.1: 데이터베이스 쿼리 실행 전 확인
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

            // 🔧 v8.4.1: 조회 결과 상세 분석
            if (queryResult) {
                console.log('✅ [여권디버그] 여권정보 조회 성공:', {
                    id: queryResult.id,
                    user_id: queryResult.user_id,
                    passport_number: queryResult.passport_number,
                    name_english: queryResult.name_english,
                    hasImage: !!queryResult.image_url,
                    created_at: queryResult.created_at,
                    사용자ID일치: queryResult.user_id === this.user.id
                });

                // 🔧 v8.4.1: 사용자 ID 불일치 검증
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
            console.error('❌ [여권디버그] getPassportInfo() 전체 실패:', {
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
            console.log('🔍 [여권디버그] checkPassportInfo() 시작...');
            const passportInfo = await this.getPassportInfo();
            const exists = !!passportInfo;
            console.log('🔍 [여권디버그] checkPassportInfo() 결과:', exists);
            return exists;
        } catch (error) {
            console.error('❌ [여권디버그] checkPassportInfo() 실패:', error);
            return false;
        }
    }

    // 여권정보 저장
    async savePassportInfo(passportData, imageFile = null) {
        try {
            console.log('🔍 [여권디버그] savePassportInfo() 시작...');
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

            console.log('🔍 [여권디버그] 저장할 데이터:', dataToSave);

            if (existingInfo) {
                // 수정
                console.log('🔍 [여권디버그] 기존 정보 수정 모드');
                const result = await this.updateData('passport_info', dataToSave, { id: existingInfo.id });
                return { data: result, isUpdate: true };
            } else {
                // 생성
                console.log('🔍 [여권디버그] 신규 정보 생성 모드');
                const result = await this.insertData('passport_info', dataToSave);
                return { data: result, isUpdate: false };
            }
        } catch (error) {
            console.error('❌ [여권디버그] savePassportInfo() 실패:', error);
            throw error;
        }
    }

    // 🌐 v8.4.1: 퍼블릭 Storage 최적화 여권 이미지 업로드
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
                // 🆕 v8.7.1: 가격 정보 추가
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
                status: 'pending'
            };

            return await this.insertData('flight_requests', dataToSave);
        } catch (error) {
            console.error('항공권 신청 생성 실패:', error);
            throw error;
        }
    }

    // 🌐 v8.4.1: 퍼블릭 Storage 최적화 항공권 이미지 업로드
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
                // 🆕 v8.7.1: 가격 정보 추가
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
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

    // 🗑️ v8.7.2: 항공권 신청 삭제 (삭제하고 재신청 버튼용)
    async deleteFlightRequest(requestId) {
        try {
            console.log('🗑️ [API디버그] deleteFlightRequest() 시작...', requestId);
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
                console.error('❌ [API디버그] 삭제 대상 신청 조회 실패:', fetchError);
                throw new Error('삭제할 신청을 찾을 수 없습니다');
            }

            if (!existingRequest) {
                throw new Error('삭제할 신청이 존재하지 않거나 권한이 없습니다');
            }

            console.log('🔍 [API디버그] 삭제 대상 신청 정보:', {
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
                    console.log('🗑️ [API디버그] 관련 이미지 파일 삭제 시도:', existingRequest.flight_image_url);
                    
                    // URL에서 파일 경로 추출
                    const urlParts = existingRequest.flight_image_url.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    
                    if (fileName && fileName.includes('flight_')) {
                        await this.deleteFile('flight-images', fileName);
                        console.log('✅ [API디버그] 관련 이미지 파일 삭제 성공');
                    }
                } catch (imageDeleteError) {
                    console.warn('⚠️ [API디버그] 이미지 파일 삭제 실패 (계속 진행):', imageDeleteError);
                    // 이미지 삭제 실패는 치명적이지 않으므로 계속 진행
                }
            }

            // 4. 데이터베이스에서 신청 레코드 삭제
            console.log('🗑️ [API디버그] 데이터베이스에서 신청 레코드 삭제 시도...');
            const { error: deleteError } = await this.supabase
                .from('flight_requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', this.user.id); // 추가 보안을 위한 사용자 ID 확인

            if (deleteError) {
                console.error('❌ [API디버그] 신청 레코드 삭제 실패:', deleteError);
                throw new Error('신청 삭제 중 오류가 발생했습니다: ' + deleteError.message);
            }

            console.log('✅ [API디버그] 항공권 신청 삭제 완료:', {
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
            console.error('❌ [API디버그] deleteFlightRequest() 실패:', error);
            throw error;
        }
    }

    // === 🌐 v8.4.1: 퍼블릭 Storage 최적화된 데이터 조작 메서드들 ===

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

    // 🌐 v8.4.1: 단순화된 퍼블릭 Storage 업로드
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
                throw new Error(`지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})`);
            }

            return { isValid: true };
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }

    // 🔧 v8.4.1: 강화된 디버깅 메서드
    getStatus() {
        return {
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
                idType: this.user.id?.includes('-') ? 'UUID' : 'Other'
            } : null,
            storageMode: 'Public Access (No Auth Required)',
            localStorage: {
                currentStudent: !!localStorage.getItem('currentStudent'),
                keys: Object.keys(localStorage).filter(key => key.includes('user') || key.includes('Student'))
            }
        };
    }

    // 🔧 v8.4.1: 여권정보 디버깅 전용 메서드
    async debugPassportInfo() {
        console.log('🔍 [디버그] 여권정보 종합 진단 시작...');
        
        try {
            // 1. 초기화 상태 확인
            console.log('1️⃣ API 초기화 상태:', {
                isInitialized: this.isInitialized,
                hasSupabase: !!this.supabase,
                hasCore: !!this.core
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
                message: '디버깅 완료'
            };

        } catch (error) {
            console.error('❌ 여권정보 디버깅 실패:', error);
            return {
                success: false,
                error: error.message,
                userInfo: this.user
            };
        }
    }
}

// 🔧 v8.7.2: FlightRequestAPI 클래스를 전역 스코프에 노출
window.FlightRequestAPI = FlightRequestAPI;

// 🌐 v8.7.2: 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.7.2 인스턴스 생성 시작 (삭제 기능 추가)...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.7.2 인스턴스 생성 완료 - 삭제 기능 추가');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 🌐 v8.7.2: 즉시 생성 (대기 시간 최소화)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 100); // 단축된 대기 시간
    });
} else {
    setTimeout(createFlightRequestAPI, 100); // 즉시 실행에 가깝게
}

console.log('✅ FlightRequestAPI v8.7.2 모듈 로드 완료 - 삭제 기능 추가 ("삭제하고 재신청" 버튼 문제 해결)');
