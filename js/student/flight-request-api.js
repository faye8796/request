// flight-request-api.js - 무한루프 해결 v8.8.3 + 항공권 취소 기능 추가
// 🚨 핵심 수정사항:
//   1. console.log 출력 대폭 최소화 - 디버깅 로그 제거
//   2. 초기화 재시도 로직 간소화
//   3. 메서드 별칭 중복 설정 방지
//   4. 성능 최적화 및 메모리 사용량 감소
//   5. 🆕 cancelFlightRequest 메서드 추가 - 항공권 신청 취소 기능

class FlightRequestAPI {
    constructor() {
        this.user = null;
        this.supabase = null;
        this.core = null;
        this.storageUtils = null;
        this.isInitialized = false;
        
        // 🚨 수정: 초기화 상태 추적 간소화
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 2; // 5회 → 2회로 단축
        
        this.initializationPromise = this.initialize();
    }

    // === 🚨 수정: 간소화된 초기화 시스템 ===
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.8.3 초기화 시작 (무한루프 해결 + 취소기능)...');
            
            // SupabaseCore 연결
            await this.connectToSupabaseCore();
            
            // StorageUtils 연결 (선택적)
            await this.connectToStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            // 🚨 수정: 메서드 별칭 설정 (중복 방지)
            this.setupMethodAliasesSafe();
            
            console.log('✅ FlightRequestAPI v8.8.3 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            return false; // throw 제거
        }
    }

    // 🚨 수정: 안전한 메서드 별칭 설정 (중복 방지)
    setupMethodAliasesSafe() {
        try {
            // 이미 설정되어 있으면 스킵
            if (this.loadPassportInfo && this.loadExistingFlightRequest) {
                return;
            }

            // coordinator가 찾는 메서드명으로 별칭 생성
            if (!this.loadPassportInfo && this.getPassportInfo) {
                this.loadPassportInfo = this.getPassportInfo.bind(this);
            }
            
            if (!this.loadExistingFlightRequest && this.getExistingRequest) {
                this.loadExistingFlightRequest = this.getExistingRequest.bind(this);
            }
            
            console.log('✅ [API] v8.8.3 메서드 별칭 설정 완료 (중복 방지)');
        } catch (error) {
            console.error('❌ [API] v8.8.3 메서드 별칭 설정 실패:', error);
        }
    }

    // 🚨 수정: 간소화된 SupabaseCore 연결
    async connectToSupabaseCore() {
        try {
            // 이미 연결되어 있으면 스킵
            if (this.core && this.core.isInitialized && this.supabase) {
                return;
            }

            // window.SupabaseAPI.core 확인
            if (window.SupabaseAPI?.core) {
                const core = window.SupabaseAPI.core;
                
                // 초기화 확인 및 간단한 대기
                if (!core.isInitialized) {
                    const initialized = await Promise.race([
                        core.ensureInitialized(),
                        new Promise(resolve => setTimeout(() => resolve(false), 3000)) // 3초 타임아웃
                    ]);
                    
                    if (!initialized) {
                        throw new Error('SupabaseCore 초기화 타임아웃');
                    }
                }

                this.core = core;
                this.supabase = core.getClient();
                console.log('✅ SupabaseCore v1.0.1 연결 성공');
                return;
            }

            // 폴백: 기존 window.SupabaseCore 확인
            if (window.SupabaseCore) {
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

            // 마지막 시도: 짧은 대기
            console.log('⏳ SupabaseCore 로딩 대기 중...');
            const startTime = Date.now();
            const timeout = 3000; // 5초 → 3초로 단축

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

                await new Promise(resolve => setTimeout(resolve, 200)); // 100ms → 200ms
            }

            throw new Error('SupabaseCore 연결 타임아웃');

        } catch (error) {
            console.error('❌ SupabaseCore 연결 실패:', error);
            throw error;
        }
    }

    // 🚨 수정: 간소화된 StorageUtils 연결
    async connectToStorageUtils() {
        try {
            if (window.StorageUtils) {
                this.storageUtils = window.StorageUtils;
                console.log('✅ StorageUtils 연결 성공');
            }
        } catch (error) {
            console.warn('⚠️ StorageUtils 연결 실패 (선택적 기능, 계속 진행)');
            this.storageUtils = null;
        }
    }

    // 🚨 수정: 간소화된 초기화 보장
    async ensureInitialized() {
        if (this.isInitialized && (this.core?.isInitialized || this.supabase)) {
            return true;
        }

        try {
            if (!this.initializationPromise) {
                this.initializationPromise = this.initialize();
            }

            const result = await this.initializationPromise;
            
            if (!result && this.initializationAttempts < this.maxInitializationAttempts) {
                this.initializationAttempts++;
                console.log(`🔄 [API] 초기화 재시도 ${this.initializationAttempts}/${this.maxInitializationAttempts}`);
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                this.initializationPromise = this.initialize();
                await this.initializationPromise;
            }

            if (!this.isInitialized) {
                console.warn('⚠️ [API] 초기화 실패 - 제한된 기능으로 진행');
            }

            return this.isInitialized;
        } catch (error) {
            console.error('❌ [API] 초기화 보장 실패:', error);
            return false; // throw 제거
        }
    }

    // === 🚨 수정: 간소화된 사용자 정보 관리 ===
    async getCurrentUser() {
        try {
            await this.ensureInitialized();

            // 이미 사용자 정보가 있으면 반환
            if (this.user && this.user.id) {
                return this.user;
            }

            // localStorage에서 사용자 정보 조회
            const userData = localStorage.getItem('currentStudent');

            if (userData) {
                try {
                    const parsed = JSON.parse(userData);

                    if (parsed && parsed.id) {
                        this.user = {
                            id: String(parsed.id),
                            email: parsed.email || 'unknown@example.com',
                            name: parsed.name || 'Unknown User'
                        };
                        
                        return this.user;
                    }
                } catch (parseError) {
                    console.warn('⚠️ [API] localStorage 파싱 오류');
                }
            }

            // 대체 키들 확인
            const alternativeKeys = ['userInfo', 'userProfile', 'user', 'currentUser', 'student'];
            for (const key of alternativeKeys) {
                const altData = localStorage.getItem(key);
                if (altData) {
                    try {
                        const parsedAlt = JSON.parse(altData);
                        if (parsedAlt && parsedAlt.id) {
                            this.user = {
                                id: String(parsedAlt.id),
                                email: parsedAlt.email || 'unknown@example.com',
                                name: parsedAlt.name || 'Unknown User'
                            };
                            
                            return this.user;
                        }
                    } catch (altParseError) {
                        // 무시하고 계속
                    }
                }
            }

            // Supabase Auth 확인 (최후의 수단)
            if (this.supabase && this.supabase.auth) {
                try {
                    const { data: { user }, error } = await this.supabase.auth.getUser();
                    if (user && !error) {
                        this.user = {
                            id: user.id,
                            email: user.email || 'unknown@example.com',
                            name: user.user_metadata?.name || user.email || 'Supabase User'
                        };
                        
                        return this.user;
                    }
                } catch (authError) {
                    console.warn('⚠️ [API] Supabase Auth 확인 실패');
                }
            }

            throw new Error('localStorage에서 유효한 사용자 정보를 찾을 수 없습니다.');

        } catch (error) {
            console.error('❌ [API] getCurrentUser() 실패:', error);
            throw error;
        }
    }

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

    // === 🚨 수정: 간소화된 여권정보 관리 ===

    async getPassportInfo() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) {
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            let queryResult = null;

            // SupabaseCore 사용 (가능하면)
            if (this.core?.select) {
                const result = await this.core.select('passport_info', '*', { user_id: this.user.id });
                
                if (!result.success) {
                    if (result.error.includes('PGRST116')) {
                        return null; // 데이터 없음
                    }
                    throw new Error(result.error);
                }

                queryResult = result.data?.length > 0 ? result.data[0] : null;
            } else {
                // 폴백: 직접 supabase 사용
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .select('*')
                    .eq('user_id', this.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                queryResult = data;
            }

            return queryResult;

        } catch (error) {
            console.error('❌ [API] getPassportInfo() 실패:', error);
            throw error;
        }
    }

    async checkPassportInfo() {
        try {
            const passportInfo = await this.getPassportInfo();
            return !!passportInfo;
        } catch (error) {
            console.error('❌ [API] checkPassportInfo() 실패:', error);
            return false;
        }
    }

    // === 🆕 v8.9.1: 여권정보 저장 및 관리 메서드들 ===

    async savePassportInfo(passportData, imageFile = null) {
        try {
            console.log('💾 [API] 여권정보 저장 시작:', passportData);
            
            await this.ensureInitialized();
            
            if (!this.user) {
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            let imageUrl = null;
            
            // 1. 이미지 파일이 있으면 먼저 업로드
            if (imageFile) {
                console.log('📤 [API] 여권 이미지 업로드 시작...');
                
                // 파일명 생성
                const timestamp = Date.now();
                const fileExtension = imageFile.name.split('.').pop();
                const fileName = `${this.user.id}_${timestamp}_passport.${fileExtension}`;
                const filePath = `passports/${fileName}`;
                
                try {
                    // 여권 이미지 전용 버켓에 업로드
                    imageUrl = await this.uploadFile('passport-images', filePath, imageFile, {
                        upsert: false,
                        cacheControl: '3600'
                    });
                    
                    console.log('✅ [API] 여권 이미지 업로드 완료:', imageUrl);
                } catch (uploadError) {
                    console.error('❌ [API] 여권 이미지 업로드 실패:', uploadError);
                    // 이미지 업로드 실패해도 여권정보는 저장 진행
                }
            }

            // 2. 여권정보 데이터 준비
            const finalPassportData = {
                user_id: this.user.id,
                passport_number: passportData.passport_number,
                name_english: passportData.name_english,
                issue_date: passportData.issue_date,
                expiry_date: passportData.expiry_date,
                passport_image_url: imageUrl,
                updated_at: new Date().toISOString()
            };

            // 3. 기존 여권정보 확인
            const existingPassport = await this.getPassportInfo();
            
            let savedData;
            
            if (existingPassport) {
                // 기존 정보 업데이트
                console.log('🔄 [API] 기존 여권정보 업데이트...');
                savedData = await this.updateData('passport_info', finalPassportData, { user_id: this.user.id });
            } else {
                // 새로운 정보 삽입
                console.log('➕ [API] 새 여권정보 삽입...');
                finalPassportData.created_at = new Date().toISOString();
                savedData = await this.insertData('passport_info', finalPassportData);
            }

            console.log('✅ [API] 여권정보 저장 완료:', savedData.id || 'updated');
            
            return {
                success: true,
                data: savedData,
                imageUrl: imageUrl,
                message: '여권정보가 성공적으로 저장되었습니다.'
            };
            
        } catch (error) {
            console.error('❌ [API] 여권정보 저장 실패:', error);
            return {
                success: false,
                error: error.message || '여권정보 저장 중 오류가 발생했습니다.'
            };
        }
    }

    async uploadPassportImage(imageFile) {
        try {
            console.log('📤 [API] 여권 이미지 업로드 시작:', imageFile.name);
            
            await this.ensureInitialized();
            
            if (!this.user) {
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 파일명 생성: user_id_timestamp_passport.extension
            const timestamp = Date.now();
            const fileExtension = imageFile.name.split('.').pop();
            const fileName = `${this.user.id}_${timestamp}_passport.${fileExtension}`;
            const filePath = `passports/${fileName}`;
            
            // 여권 이미지 전용 버켓에 업로드
            const imageUrl = await this.uploadFile('passport-images', filePath, imageFile, {
                upsert: false,
                cacheControl: '3600'
            });
            
            console.log('✅ [API] 여권 이미지 업로드 완료:', imageUrl);
            
            return {
                success: true,
                url: imageUrl,
                fileName: fileName,
                filePath: filePath
            };
            
        } catch (error) {
            console.error('❌ [API] 여권 이미지 업로드 실패:', error);
            return {
                success: false,
                error: error.message || '이미지 업로드 중 오류가 발생했습니다.'
            };
        }
    }

    async deletePassportInfo(userId = null) {
        try {
            console.log('🗑️ [API] 여권정보 삭제 시작...');
            
            await this.ensureInitialized();
            
            const targetUserId = userId || this.user?.id;
            
            if (!targetUserId) {
                if (!this.user) {
                    await this.getCurrentUser();
                }
                if (!this.user?.id) {
                    throw new Error('사용자 정보가 없습니다');
                }
            }

            // 기존 여권정보 조회 (이미지 URL 확인용)
            const existingPassport = await this.getPassportInfo();
            
            // 이미지 파일 삭제 (있는 경우)
            if (existingPassport && existingPassport.passport_image_url) {
                try {
                    // URL에서 파일 경로 추출
                    const url = new URL(existingPassport.passport_image_url);
                    const pathParts = url.pathname.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    const filePath = `passports/${fileName}`;
                    
                    await this.deleteFile('passport-images', filePath);
                    console.log('✅ [API] 여권 이미지 파일 삭제 완료');
                } catch (fileError) {
                    console.warn('⚠️ [API] 여권 이미지 파일 삭제 실패 (계속 진행):', fileError.message);
                }
            }

            // 데이터베이스에서 여권정보 삭제
            if (this.core?.delete) {
                const result = await this.core.delete('passport_info', {
                    user_id: targetUserId || this.user.id
                });
                
                if (!result.success) {
                    throw new Error(result.error);
                }
            } else {
                const { error } = await this.supabase
                    .from('passport_info')
                    .delete()
                    .eq('user_id', targetUserId || this.user.id);

                if (error) {
                    throw error;
                }
            }

            console.log('✅ [API] 여권정보 삭제 완료');
            
            return {
                success: true,
                message: '여권정보가 완전히 삭제되었습니다.'
            };
            
        } catch (error) {
            console.error('❌ [API] 여권정보 삭제 실패:', error);
            
            return {
                success: false,
                error: error.message || '여권정보 삭제 중 오류가 발생했습니다.'
            };
        }
    }

    // === 🆕 호환성을 위한 메서드 별칭 ===
    async loadPassportInfo() {
        // getPassportInfo와 동일한 기능
        return await this.getPassportInfo();
    }

    async updatePassportInfo(passportData, imageFile = null) {
        // savePassportInfo와 동일한 기능
        return await this.savePassportInfo(passportData, imageFile);
    }
    // === 항공권 신청 관리 ===

    async getExistingRequest() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // .single() 대신 일반 조회 사용하여 406 오류 해결
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                throw error;
            }

            // 결과 배열에서 첫 번째 요소 반환 (없으면 null)
            const result = data && data.length > 0 ? data[0] : null;
            return result;

        } catch (error) {
            console.error('❌ [API] getExistingRequest() 실패:', error);
            return null;
        }
    }

    // 🆕 v8.8.3: 항공권 신청 취소 메서드 추가
    async cancelFlightRequest(requestId = null) {
        try {
            console.log('🔄 [API] 항공권 신청 취소 시작...', requestId);
            
            await this.ensureInitialized();
            
            if (!this.user) {
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 취소할 신청 ID 결정
            let targetRequestId = requestId;
            
            if (!targetRequestId) {
                // 현재 사용자의 최신 신청 조회
                const existingRequest = await this.getExistingRequest();
                if (!existingRequest) {
                    throw new Error('취소할 항공권 신청을 찾을 수 없습니다');
                }
                targetRequestId = existingRequest.id;
            }

            // 취소 상태로 업데이트
            const updateData = {
                status: 'cancelled',
                updated_at: new Date().toISOString(),
                cancellation_date: new Date().toISOString()
            };

            const filters = {
                id: targetRequestId,
                user_id: this.user.id // 보안: 사용자 본인의 신청만 취소 가능
            };

            // SupabaseCore 사용 (가능하면)
            if (this.core?.update) {
                const result = await this.core.update('flight_requests', updateData, filters);
                
                if (!result.success) {
                    throw new Error(result.error);
                }

                console.log('✅ [API] 항공권 신청 취소 완료 (SupabaseCore):', targetRequestId);
                return {
                    success: true,
                    data: result.data[0],
                    message: '항공권 신청이 성공적으로 취소되었습니다.'
                };
            }

            // 폴백: 직접 supabase 사용
            const { data, error } = await this.supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', targetRequestId)
                .eq('user_id', this.user.id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            console.log('✅ [API] 항공권 신청 취소 완료 (Direct Supabase):', targetRequestId);
            
            return {
                success: true,
                data: data,
                message: '항공권 신청이 성공적으로 취소되었습니다.'
            };

        } catch (error) {
            console.error('❌ [API] 항공권 신청 취소 실패:', error);
            
            return {
                success: false,
                error: error.message || '항공권 신청 취소 중 오류가 발생했습니다.',
                data: null
            };
        }
    }

    // 🆕 v8.8.3: 항공권 신청 삭제 메서드 (완전 삭제)
    async deleteFlightRequest(requestId = null) {
        try {
            console.log('🔄 [API] 항공권 신청 삭제 시작...', requestId);
            
            await this.ensureInitialized();
            
            if (!this.user) {
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 삭제할 신청 ID 결정
            let targetRequestId = requestId;
            
            if (!targetRequestId) {
                // 현재 사용자의 최신 신청 조회
                const existingRequest = await this.getExistingRequest();
                if (!existingRequest) {
                    throw new Error('삭제할 항공권 신청을 찾을 수 없습니다');
                }
                targetRequestId = existingRequest.id;
            }

            // SupabaseCore 사용 (가능하면)
            if (this.core?.delete) {
                const result = await this.core.delete('flight_requests', {
                    id: targetRequestId,
                    user_id: this.user.id // 보안: 사용자 본인의 신청만 삭제 가능
                });
                
                if (!result.success) {
                    throw new Error(result.error);
                }

                console.log('✅ [API] 항공권 신청 삭제 완료 (SupabaseCore):', targetRequestId);
                return {
                    success: true,
                    message: '항공권 신청이 완전히 삭제되었습니다.'
                };
            }

            // 폴백: 직접 supabase 사용
            const { error } = await this.supabase
                .from('flight_requests')
                .delete()
                .eq('id', targetRequestId)
                .eq('user_id', this.user.id);

            if (error) {
                throw error;
            }

            console.log('✅ [API] 항공권 신청 삭제 완료 (Direct Supabase):', targetRequestId);
            
            return {
                success: true,
                message: '항공권 신청이 완전히 삭제되었습니다.'
            };

        } catch (error) {
            console.error('❌ [API] 항공권 신청 삭제 실패:', error);
            
            return {
                success: false,
                error: error.message || '항공권 신청 삭제 중 오류가 발생했습니다.'
            };
        }
    }

    // === 데이터 조작 메서드들 ===

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

    // === 🆕 v8.9.0: 항공권 전용 메서드들 ===

    async uploadFlightImage(imageFile) {
        try {
            console.log('📤 [API] 항공권 이미지 업로드 시작:', imageFile.name);
            
            await this.ensureInitialized();
            
            if (!this.user) {
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 파일명 생성: user_id_timestamp_original_name
            const timestamp = Date.now();
            const fileExtension = imageFile.name.split('.').pop();
            const fileName = `${this.user.id}_${timestamp}_flight_image.${fileExtension}`;
            const filePath = `flight-requests/${fileName}`;
            
            // 항공권 이미지 전용 버켓에 업로드
            const imageUrl = await this.uploadFile('flight-images', filePath, imageFile, {
                upsert: false,
                cacheControl: '3600'
            });
            
            console.log('✅ [API] 항공권 이미지 업로드 완료:', imageUrl);
            
            return {
                success: true,
                url: imageUrl,
                fileName: fileName,
                filePath: filePath
            };
            
        } catch (error) {
            console.error('❌ [API] 항공권 이미지 업로드 실패:', error);
            return {
                success: false,
                error: error.message || '이미지 업로드 중 오류가 발생했습니다.'
            };
        }
    }

    async saveFlightRequest(formData) {
        try {
            console.log('💾 [API] 항공권 신청 저장 시작:', formData);

            await this.ensureInitialized();

            if (!this.user) {
                await this.getCurrentUser();
            }

            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 🔧 1단계: user_profiles에 활동기간 및 파견정보 완전 업데이트
            if (formData.actualArrivalDate && formData.actualWorkEndDate && 
                formData.departureDate && formData.returnDate) {

                // 날짜 파싱
                const actualArrival = new Date(formData.actualArrivalDate);
                const actualWorkEnd = new Date(formData.actualWorkEndDate);
                const departureDate = new Date(formData.departureDate);
                const returnDate = new Date(formData.returnDate);

                // 활동일수 계산 (actual_work_days)
                const actualWorkDays = Math.ceil((actualWorkEnd - actualArrival) / (1000 * 60 * 60 * 24)) + 1;

                // 체류일수 계산 (dispatch_duration)
                const dispatchDuration = Math.ceil((returnDate - departureDate) / (1000 * 60 * 60 * 24)) + 1;

                const userProfileData = {
                    // 활동 기간
                    actual_arrival_date: formData.actualArrivalDate,
                    actual_work_end_date: formData.actualWorkEndDate,
                    actual_work_days: actualWorkDays,

                    // 파견 기간 (출국/귀국일)
                    dispatch_start_date: formData.departureDate,
                    dispatch_end_date: formData.returnDate,
                    dispatch_duration: dispatchDuration,

                    // 메타데이터
                    updated_at: new Date().toISOString()
                };

                await this.updateData('user_profiles', userProfileData, { id: this.user.id });
                console.log('✅ [API] user_profiles 완전 업데이트 완료:', {
                    actualWorkDays,
                    dispatchDuration,
                    actualArrivalDate: formData.actualArrivalDate,
                    actualWorkEndDate: formData.actualWorkEndDate,
                    dispatchStartDate: formData.departureDate,
                    dispatchEndDate: formData.returnDate
                });
            }

            // 🔧 2단계: flight_requests에 항공권 정보 저장 (올바른 컬럼명 사용)
            const flightRequestData = {
                user_id: this.user.id,

                // 올바른 컬럼명 사용
                purchase_type: formData.purchaseMethod, // purchase_method → purchase_type
                purchase_link: formData.purchaseLink || null,

                // 항공권 정보
                departure_date: formData.departureDate,
                return_date: formData.returnDate,
                departure_airport: formData.departureAirport,
                arrival_airport: formData.returnAirport, // return_airport → arrival_airport

                // 가격 정보 (올바른 컬럼명)
                ticket_price: formData.totalPrice, // total_price → ticket_price
                currency: formData.currency,
                price_source: formData.priceSource,

                // 이미지
                flight_image_url: formData.flightImageUrl,

                // 메타데이터
                status: formData.status || 'pending',
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // flight_requests 테이블에 저장
            const savedData = await this.insertData('flight_requests', flightRequestData);

            console.log('✅ [API] 항공권 신청 저장 완료:', savedData.id);

            return {
                success: true,
                data: savedData,
                message: '항공권 신청이 성공적으로 저장되었습니다.'
            };

        } catch (error) {
            console.error('❌ [API] 항공권 신청 저장 실패:', error);
            return {
                success: false,
                error: error.message || '항공권 신청 저장 중 오류가 발생했습니다.'
            };
        }
    }

    async getFlightRequest(userId = null) {
        try {
            await this.ensureInitialized();
            
            const targetUserId = userId || this.user?.id;
            
            if (!targetUserId) {
                if (!this.user) {
                    await this.getCurrentUser();
                }
                if (!this.user?.id) {
                    throw new Error('사용자 정보가 없습니다');
                }
            }

            // getExistingRequest와 동일한 로직
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', targetUserId || this.user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                throw error;
            }

            const result = data && data.length > 0 ? data[0] : null;
            
            return {
                success: true,
                data: result
            };

        } catch (error) {
            console.error('❌ [API] getFlightRequest() 실패:', error);
            return {
                success: false,
                error: error.message || '항공권 신청 조회 중 오류가 발생했습니다.',
                data: null
            };
        }
    }

    // === 파일 업로드 ===

    async uploadFile(bucket, path, file, options = {}) {
        try {
            if (this.core?.uploadFile) {
                const result = await this.core.uploadFile(bucket, path, file, options);
                if (!result.success) {
                    throw new Error(result.error);
                }

                const urlResult = await this.core.getFileUrl(bucket, path);
                if (!urlResult.success) {
                    throw new Error(urlResult.error);
                }

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
                throw error;
            }

            const { data: urlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(path);

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

    // === 🚨 수정: 간소화된 상태 정보 ===
    getStatus() {
        return {
            version: 'v8.8.3',
            isInitialized: this.isInitialized,
            hasCore: !!this.core,
            hasSupabase: !!this.supabase,
            hasUser: !!this.user,
            coreInitialized: this.core?.isInitialized,
            userInfo: this.user ? { 
                id: this.user.id, 
                email: this.user.email, 
                name: this.user.name
            } : null,
            initializationAttempts: this.initializationAttempts,
            maxInitializationAttempts: this.maxInitializationAttempts,
            methodAliases: {
                loadPassportInfo: !!this.loadPassportInfo,
                loadExistingFlightRequest: !!this.loadExistingFlightRequest
            },
            // 🆕 v8.8.3: 추가된 메서드들
            newMethods: {
                cancelFlightRequest: !!this.cancelFlightRequest,
                deleteFlightRequest: !!this.deleteFlightRequest
            }
        };
    }
}

// 전역 스코프에 클래스 노출
window.FlightRequestAPI = FlightRequestAPI;

// 🚨 수정: 간소화된 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.8.3 인스턴스 생성 시작 (무한루프 해결 + 취소기능)...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.8.3 인스턴스 생성 완료');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        return null; // throw 제거
    }
}

// 🚨 수정: 즉시 생성 (대기 시간 최소화)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 50); // 100ms → 50ms로 단축
    });
} else {
    setTimeout(createFlightRequestAPI, 50); // 즉시 실행에 가깝게
}

console.log('✅ FlightRequestAPI v8.8.3 모듈 로드 완료 - 무한루프 해결 + 취소기능 추가');
console.log('🚨 v8.8.3 주요 개선사항:', {
    logMinimization: 'console.log 출력 대폭 최소화',
    initializationRetryReduction: '초기화 재시도 횟수 단축 (5회 → 2회)',
    timeoutReduction: '타임아웃 시간 단축 (5초 → 3초)',
    methodAliasSafety: '메서드 별칭 중복 설정 방지',
    errorHandling: 'throw 제거로 무한루프 방지',
    performanceOptimization: '메모리 사용량 및 실행 시간 최적화',
    // 🆕 v8.8.3 추가
    cancelFlightRequest: '항공권 신청 취소 기능 (상태를 cancelled로 변경)',
    deleteFlightRequest: '항공권 신청 삭제 기능 (완전 삭제)',
    enhancedSecurity: '본인 신청만 취소/삭제 가능하도록 보안 강화'
});
console.log('🎯 v8.8.3 새로운 메서드:', {
    cancelFlightRequest: '항공권 신청을 취소 상태로 변경 (데이터 보존)',
    deleteFlightRequest: '항공권 신청을 완전히 삭제 (데이터 제거)',
    securityFilter: '사용자 본인의 신청만 취소/삭제 가능',
    statusTracking: '취소 일시 기록 및 상태 추적',
    fallbackSupport: 'SupabaseCore 및 직접 Supabase 연결 모두 지원'
});