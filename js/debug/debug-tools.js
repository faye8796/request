// debug-tools.js - 여권정보 로딩 문제 해결을 위한 디버깅 도구 v8.4.1
// 🔧 브라우저 콘솔에서 직접 사용할 수 있는 디버깅 헬퍼 함수들

/**
 * 🔍 여권정보 디버깅 도구 모음
 * 브라우저 콘솔에서 다음과 같이 사용:
 * 
 * // 전체 상태 확인
 * await window.debugPassport.checkAll();
 * 
 * // 사용자 정보만 확인  
 * await window.debugPassport.checkUser();
 * 
 * // 여권정보만 확인
 * await window.debugPassport.checkPassport();
 * 
 * // localStorage 정리
 * window.debugPassport.cleanStorage();
 */

class PassportDebugTools {
    constructor() {
        this.version = 'v8.4.1';
        console.log(`🔧 PassportDebugTools ${this.version} 로드됨`);
    }

    // 🔍 전체 상태 종합 진단
    async checkAll() {
        console.log('🔍 ='.repeat(50));
        console.log('🔍 여권정보 종합 진단 시작 (v8.4.1)');
        console.log('🔍 ='.repeat(50));

        const results = {
            timestamp: new Date().toISOString(),
            browser: navigator.userAgent,
            url: window.location.href,
            checks: {}
        };

        try {
            // 1. 모듈 로딩 상태 확인
            console.log('\n1️⃣ 모듈 로딩 상태 확인...');
            results.checks.modules = this.checkModules();

            // 2. localStorage 상태 확인
            console.log('\n2️⃣ localStorage 상태 확인...');
            results.checks.storage = this.checkLocalStorage();

            // 3. API 상태 확인
            console.log('\n3️⃣ API 상태 확인...');
            results.checks.api = await this.checkAPI();

            // 4. 사용자 정보 확인
            console.log('\n4️⃣ 사용자 정보 확인...');
            results.checks.user = await this.checkUser();

            // 5. 여권정보 확인
            console.log('\n5️⃣ 여권정보 확인...');
            results.checks.passport = await this.checkPassport();

            // 6. UI 상태 확인
            console.log('\n6️⃣ UI 상태 확인...');
            results.checks.ui = this.checkUI();

            console.log('\n✅ 종합 진단 완료');
            console.log('📋 전체 결과:', results);

            return results;

        } catch (error) {
            console.error('❌ 종합 진단 중 오류:', error);
            results.error = {
                message: error.message,
                stack: error.stack
            };
            return results;
        }
    }

    // 모듈 로딩 상태 확인
    checkModules() {
        const modules = {
            flightRequestAPI: {
                exists: !!window.flightRequestAPI,
                initialized: window.flightRequestAPI?.isInitialized,
                version: window.flightRequestAPI?.version || 'unknown'
            },
            flightRequestUI: {
                exists: !!window.flightRequestUI,
                initialized: window.flightRequestUI?.isInitialized,
                version: window.flightRequestUI?.version || 'unknown'
            },
            passportAPI: {
                exists: !!window.passportAPI,
                sameAsFlightAPI: window.passportAPI === window.flightRequestAPI
            },
            supabaseCore: {
                exists: !!window.SupabaseCore,
                initialized: window.SupabaseCore?._initialized,
                client: !!window.SupabaseCore?.client
            },
            supabaseAPI: {
                exists: !!window.SupabaseAPI,
                core: !!window.SupabaseAPI?.core,
                coreInitialized: window.SupabaseAPI?.core?.isInitialized
            },
            utils: {
                flightRequestUtils: !!window.FlightRequestUtils,
                storageUtils: !!window.StorageUtils
            }
        };

        console.log('📦 모듈 상태:', modules);
        return modules;
    }

    // localStorage 상태 확인
    checkLocalStorage() {
        const storage = {
            allKeys: Object.keys(localStorage),
            userRelated: {},
            totalSize: 0
        };

        // 사용자 관련 키들 확인
        const userKeys = ['currentStudent', 'currentUser', 'userInfo', 'userProfile', 'user'];
        userKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    storage.userRelated[key] = {
                        raw: value,
                        parsed: JSON.parse(value),
                        size: new Blob([value]).size
                    };
                } catch (e) {
                    storage.userRelated[key] = {
                        raw: value,
                        parseError: e.message,
                        size: new Blob([value]).size
                    };
                }
            }
        });

        // 전체 크기 계산
        Object.keys(localStorage).forEach(key => {
            storage.totalSize += new Blob([localStorage.getItem(key)]).size;
        });

        console.log('💾 localStorage 상태:', storage);
        return storage;
    }

    // API 상태 확인
    async checkAPI() {
        if (!window.flightRequestAPI) {
            const error = 'FlightRequestAPI가 로드되지 않음';
            console.error('❌', error);
            return { error };
        }

        try {
            const api = window.flightRequestAPI;
            
            // 초기화 보장
            await api.ensureInitialized();
            
            const status = api.getStatus();
            console.log('🔌 API 상태:', status);

            // API 디버깅 실행
            let debugResult = null;
            if (api.debugPassportInfo) {
                console.log('🔍 API 디버깅 실행 중...');
                debugResult = await api.debugPassportInfo();
                console.log('🔍 API 디버깅 결과:', debugResult);
            }

            return {
                status: status,
                debugResult: debugResult,
                isReady: true
            };

        } catch (error) {
            console.error('❌ API 상태 확인 실패:', error);
            return {
                error: error.message,
                stack: error.stack,
                isReady: false
            };
        }
    }

    // 사용자 정보 확인
    async checkUser() {
        if (!window.flightRequestAPI) {
            return { error: 'API 없음' };
        }

        try {
            const api = window.flightRequestAPI;
            const user = await api.getCurrentUser();
            
            console.log('👤 사용자 정보:', {
                id: user?.id,
                email: user?.email,
                name: user?.name,
                idLength: user?.id?.length,
                idType: user?.id?.includes('-') ? 'UUID' : 'Other'
            });

            return {
                user: user,
                isValid: !!(user?.id),
                userIdFormat: user?.id?.includes('-') ? 'UUID' : 'Other'
            };

        } catch (error) {
            console.error('❌ 사용자 정보 확인 실패:', error);
            return {
                error: error.message,
                isValid: false
            };
        }
    }

    // 여권정보 확인
    async checkPassport() {
        if (!window.flightRequestAPI) {
            return { error: 'API 없음' };
        }

        try {
            const api = window.flightRequestAPI;
            
            // 여권정보 존재 여부 확인
            const exists = await api.checkPassportInfo();
            console.log('🛂 여권정보 존재 여부:', exists);

            // 여권정보 상세 조회
            const passportInfo = await api.getPassportInfo();
            console.log('🛂 여권정보 상세:', {
                exists: !!passportInfo,
                id: passportInfo?.id,
                user_id: passportInfo?.user_id,
                passport_number: passportInfo?.passport_number,
                name_english: passportInfo?.name_english,
                has_image: !!passportInfo?.image_url,
                created_at: passportInfo?.created_at
            });

            return {
                exists: exists,
                info: passportInfo,
                isValid: !!(passportInfo?.id)
            };

        } catch (error) {
            console.error('❌ 여권정보 확인 실패:', error);
            return {
                error: error.message,
                exists: false,
                isValid: false
            };
        }
    }

    // UI 상태 확인
    checkUI() {
        const ui = {
            flightRequestUI: {
                exists: !!window.flightRequestUI,
                initialized: window.flightRequestUI?.isInitialized
            },
            currentPage: {
                url: window.location.href,
                title: document.title,
                hasPassportForm: !!document.getElementById('passportForm'),
                hasFlightForm: !!document.getElementById('flightRequestForm'),
                hasLoadingState: !!document.getElementById('loadingState')
            },
            elements: {}
        };

        // 주요 DOM 요소들 확인
        const keyElements = [
            'passportForm', 'passportInfoForm', 'passportLoadingState',
            'passportNumber', 'nameEnglish', 'issueDate', 'expiryDate',
            'flightRequestForm', 'loadingState', 'mainContent'
        ];

        keyElements.forEach(id => {
            ui.elements[id] = !!document.getElementById(id);
        });

        console.log('🖥️ UI 상태:', ui);
        return ui;
    }

    // localStorage 정리 (문제 해결용)
    cleanStorage() {
        console.log('🧹 localStorage 정리 시작...');
        
        const beforeKeys = Object.keys(localStorage);
        console.log('🧹 정리 전 키:', beforeKeys);

        // 사용자 관련 키들만 제거 (신중하게)
        const userKeys = ['currentStudent', 'currentUser', 'userInfo', 'userProfile'];
        userKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`🧹 제거: ${key}`);
                localStorage.removeItem(key);
            }
        });

        const afterKeys = Object.keys(localStorage);
        console.log('🧹 정리 후 키:', afterKeys);
        console.log('✅ localStorage 정리 완료');
        
        return {
            removed: beforeKeys.filter(key => !afterKeys.includes(key)),
            remaining: afterKeys
        };
    }

    // 특정 사용자 정보 주입 (테스트용)
    injectUserInfo(userId, userName = '테스트사용자', userEmail = 'test@example.com') {
        console.log('💉 사용자 정보 주입 시작...');
        
        const userData = {
            id: userId,
            name: userName,
            email: userEmail,
            injected: true,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('currentStudent', JSON.stringify(userData));
        console.log('💉 주입된 사용자 정보:', userData);
        console.log('✅ 사용자 정보 주입 완료 - 페이지를 새로고침하세요');
        
        return userData;
    }

    // '이가짜' 사용자로 테스트
    async testAsGagja() {
        console.log('🧪 이가짜 사용자 테스트 시작...');
        
        // DB에서 확인된 이가짜 사용자 ID
        const gagjaUserId = '13c27f96-ee99-4eb0-9ab7-56121d14a6a7';
        
        // localStorage에 이가짜 사용자 정보 설정
        this.injectUserInfo(gagjaUserId, '이가짜', '이가짜@test.com');
        
        // 잠시 후 테스트 실행
        setTimeout(async () => {
            console.log('🧪 이가짜 사용자로 여권정보 테스트 실행...');
            const result = await this.checkPassport();
            console.log('🧪 이가짜 테스트 결과:', result);
        }, 1000);
        
        return gagjaUserId;
    }

    // 로그 내보내기
    exportLogs() {
        console.log('📤 디버깅 로그 내보내기...');
        
        // 콘솔 로그는 직접 접근이 어려우므로 새로운 진단 실행
        return this.checkAll().then(results => {
            const logData = {
                timestamp: new Date().toISOString(),
                version: this.version,
                results: results,
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            const blob = new Blob([JSON.stringify(logData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `passport-debug-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('✅ 로그 파일 다운로드 완료');
            return logData;
        });
    }

    // 도움말 표시
    help() {
        console.log(`
🔧 PassportDebugTools ${this.version} 사용법:

📋 기본 진단:
  await window.debugPassport.checkAll()         - 전체 상태 종합 진단
  await window.debugPassport.checkUser()        - 사용자 정보만 확인
  await window.debugPassport.checkPassport()    - 여권정보만 확인
  window.debugPassport.checkModules()           - 모듈 로딩 상태 확인
  window.debugPassport.checkUI()                - UI 상태 확인

🧹 문제 해결:
  window.debugPassport.cleanStorage()           - localStorage 정리
  window.debugPassport.injectUserInfo(id, name) - 사용자 정보 주입
  await window.debugPassport.testAsGagja()      - 이가짜 사용자로 테스트

📤 로그 관리:
  window.debugPassport.exportLogs()             - 진단 결과 파일로 내보내기
  window.debugPassport.help()                   - 이 도움말 표시

🎯 '이가짜' 문제 해결 단계:
1. await window.debugPassport.checkAll()      - 현재 상태 확인
2. window.debugPassport.cleanStorage()        - 기존 데이터 정리  
3. await window.debugPassport.testAsGagja()   - 이가짜 계정으로 테스트
4. 페이지 새로고침 후 [여권정보 설정] 클릭 테스트
        `);
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.debugPassport = new PassportDebugTools();
    
    // 페이지 로드 완료 후 자동으로 도움말 표시
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                console.log('🔧 PassportDebugTools 준비 완료! window.debugPassport.help() 로 사용법을 확인하세요.');
            }, 2000);
        });
    } else {
        setTimeout(() => {
            console.log('🔧 PassportDebugTools 준비 완료! window.debugPassport.help() 로 사용법을 확인하세요.');
        }, 2000);
    }
}

console.log('✅ debug-tools.js v8.4.1 로드 완료');
