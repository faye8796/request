// 환경 설정 파일 - v4.2.1 모듈화 시스템 호환
// v4.2.0 모듈화 업데이트 후 모듈 로딩 타이밍 오류 수정
// 🔧 SupabaseAPI 모듈 초기화 대기 로직 강화

const CONFIG = {
    // Supabase 설정
    SUPABASE: {
        URL: 'https://aazvopacnbbkvusihqva.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTQyMjQsImV4cCI6MjA2NTM3MDIyNH0.0NXI_tohwFCOl3xY4b1jIlxQR_zGTS9tWDM2OFxTq4s'
    },
    
    // 애플리케이션 설정
    APP: {
        NAME: '세종학당 문화교구 신청 플랫폼',
        VERSION: '4.2.1', // 모듈화 시스템 안정화 버전
        ADMIN_CODE: 'admin123',
        
        // 기본 예산 설정 (DB 초기화용 - 실제 운영시 DB에서 관리)
        DEFAULT_BUDGET_SETTINGS: {
            '한국어교육': { perLessonAmount: 15000, maxBudget: 400000 },
            '전통문화예술': { perLessonAmount: 25000, maxBudget: 600000 },
            'K-Pop 문화': { perLessonAmount: 10000, maxBudget: 300000 },
            '한국현대문화': { perLessonAmount: 18000, maxBudget: 450000 },
            '전통음악': { perLessonAmount: 30000, maxBudget: 750000 },
            '한국미술': { perLessonAmount: 22000, maxBudget: 550000 },
            '한국요리문화': { perLessonAmount: 35000, maxBudget: 800000 }
        },

        // 디폴트 시스템 설정 (DB 없을 때 fallback)
        DEFAULT_SYSTEM_SETTINGS: {
            test_mode: false,
            ignore_deadline: false,
            lesson_plan_deadline: '2025-12-31',
            lesson_plan_time: '23:59',
            notice_message: ''
        }
    },
    
    // 개발 환경 설정
    DEV: {
        DEBUG: true,
        ENABLE_CONSOLE_LOGS: true,
        MOCK_DATA_ENABLED: false, // Supabase 연동 후 false로 설정
        
        // 개발용 빠른 설정
        QUICK_LOGIN: {
            STUDENT: {
                name: '김민수',
                birthDate: '1995-03-15'
            },
            ADMIN_CODE: 'admin123'
        }
    },

    // UI 설정
    UI: {
        ITEMS_PER_PAGE: 10,
        SEARCH_DEBOUNCE_MS: 300,
        TOAST_DURATION_MS: 3000,
        MAX_FILE_SIZE_MB: 5,
        SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    }
};

// 환경변수에서 값을 가져오는 함수 (브라우저 환경에서는 제한적)
function getEnvValue(key, defaultValue) {
    // 브라우저 환경에서는 window 객체에서 확인
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
        return window.ENV[key];
    }
    
    // Node.js 환경에서는 process.env에서 확인
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    
    return defaultValue;
}

// 최종 설정 객체 (환경변수 우선)
const FINAL_CONFIG = {
    SUPABASE: {
        URL: getEnvValue('SUPABASE_URL', CONFIG.SUPABASE.URL),
        ANON_KEY: getEnvValue('SUPABASE_ANON_KEY', CONFIG.SUPABASE.ANON_KEY)
    },
    APP: CONFIG.APP,
    DEV: {
        ...CONFIG.DEV,
        DEBUG: getEnvValue('DEBUG', CONFIG.DEV.DEBUG),
        MOCK_DATA_ENABLED: getEnvValue('MOCK_DATA_ENABLED', CONFIG.DEV.MOCK_DATA_ENABLED)
    },
    UI: CONFIG.UI
};

// 설정 유효성 검사
function validateConfig() {
    const errors = [];
    
    if (!FINAL_CONFIG.SUPABASE.URL) {
        errors.push('Supabase URL이 설정되지 않았습니다.');
    }
    
    if (!FINAL_CONFIG.SUPABASE.ANON_KEY) {
        errors.push('Supabase ANON_KEY가 설정되지 않았습니다.');
    }
    
    if (!FINAL_CONFIG.APP.ADMIN_CODE) {
        errors.push('관리자 코드가 설정되지 않았습니다.');
    }
    
    if (errors.length > 0) {
        console.error('⚠️ 설정 오류:', errors);
        if (FINAL_CONFIG.DEV.DEBUG) {
            alert('설정 오류가 발견되었습니다. 콘솔을 확인해주세요.');
        }
    }
    
    return errors.length === 0;
}

// 🆕 v4.2.1 모듈 로딩 대기 함수
async function waitForModulesReady(maxWaitSeconds = 10) {
    console.log('⏳ v4.2.0 모듈 시스템 로딩 대기 중...');
    
    const maxWaitTime = maxWaitSeconds * 1000;
    const checkInterval = 200;
    let waitTime = 0;
    
    while (waitTime < maxWaitTime) {
        const moduleStatus = {
            supabaseAPI: !!window.SupabaseAPI,
            supabaseCore: !!window.SupabaseCore,
            supabaseStudent: !!window.SupabaseStudent,
            supabaseAdmin: !!window.SupabaseAdmin,
            apiInitialized: !!(window.SupabaseAPI && window.SupabaseAPI._moduleStatus && window.SupabaseAPI._moduleStatus.initialized)
        };
        
        // 진행 상황 로그 (2초마다)
        if (waitTime % 2000 === 0 && waitTime > 0) {
            console.log('📦 모듈 로딩 진행상황:', moduleStatus);
        }
        
        // 최소 요구사항: SupabaseAPI가 있고 초기화됨
        if (moduleStatus.supabaseAPI && moduleStatus.apiInitialized) {
            console.log('✅ v4.2.0 모듈 시스템 준비 완료');
            return true;
        }
        
        // 부분적 성공: SupabaseAPI만 로드됨
        if (moduleStatus.supabaseAPI) {
            console.log('⚠️ SupabaseAPI 로드됨, 초기화 대기 중...');
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
    }
    
    console.warn('⚠️ 모듈 로딩 타임아웃 - 부분적 기능만 사용 가능');
    return false;
}

// 개발 도구 함수들
const DevTools = {
    // 설정 정보 출력
    printConfig() {
        if (!FINAL_CONFIG.DEV.DEBUG) return;
        console.group('🔧 Application Configuration v4.2.1');
        console.log('App Name:', FINAL_CONFIG.APP.NAME);
        console.log('Version:', FINAL_CONFIG.APP.VERSION);
        console.log('Debug Mode:', FINAL_CONFIG.DEV.DEBUG);
        console.log('Mock Data:', FINAL_CONFIG.DEV.MOCK_DATA_ENABLED);
        console.log('Supabase URL:', FINAL_CONFIG.SUPABASE.URL);
        console.groupEnd();
    },

    // 빠른 로그인 (개발용)
    async quickLogin(type = 'student') {
        if (!FINAL_CONFIG.DEV.DEBUG) {
            console.warn('개발 모드에서만 사용 가능합니다.');
            return;
        }

        if (!window.DataManager) {
            console.error('DataManager가 로드되지 않았습니다.');
            return;
        }

        try {
            if (type === 'student') {
                const { name, birthDate } = FINAL_CONFIG.DEV.QUICK_LOGIN.STUDENT;
                const success = await window.DataManager.authenticateStudent(name, birthDate);
                console.log(success ? '학생 빠른 로그인 성공' : '학생 빠른 로그인 실패');
                return success;
            } else if (type === 'admin') {
                const success = await window.DataManager.authenticateAdmin(FINAL_CONFIG.DEV.QUICK_LOGIN.ADMIN_CODE);
                console.log(success ? '관리자 빠른 로그인 성공' : '관리자 빠른 로그인 실패');
                return success;
            }
        } catch (error) {
            console.error('빠른 로그인 오류:', error);
        }
    },

    // 🔧 v4.2.1 강화된 API 연결 테스트
    async testApiConnection() {
        console.log('🔗 v4.2.1 API 연결 테스트 시작...');
        
        // 1단계: SupabaseAPI 존재 확인
        if (!window.SupabaseAPI) {
            console.error('❌ SupabaseAPI가 로드되지 않았습니다.');
            return false;
        }
        
        // 2단계: 모듈 초기화 상태 확인
        if (!window.SupabaseAPI._moduleStatus || !window.SupabaseAPI._moduleStatus.initialized) {
            console.warn('⚠️ SupabaseAPI 모듈이 아직 초기화되지 않았습니다.');
            
            // 3초 더 대기 후 재시도
            console.log('⏳ 3초 후 재시도...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (!window.SupabaseAPI._moduleStatus || !window.SupabaseAPI._moduleStatus.initialized) {
                console.error('❌ SupabaseAPI 초기화 타임아웃');
                return false;
            }
        }
        
        // 3단계: 실제 API 호출 테스트
        try {
            console.log('🔄 시스템 설정 조회 테스트...');
            
            // 더 안전한 API 호출
            const testResult = await window.SupabaseAPI.testConnection();
            if (testResult && testResult.success) {
                console.log('✅ API 연결 테스트 성공');
                
                // 시스템 설정 조회 시도 (선택적)
                try {
                    const settings = await window.SupabaseAPI.getSystemSettings();
                    console.log('✅ 시스템 설정 조회 성공:', Object.keys(settings).length, '개 설정');
                } catch (settingsError) {
                    console.warn('⚠️ 시스템 설정 조회 실패 (API 연결은 정상):', settingsError.message);
                }
                
                return true;
            } else {
                console.error('❌ API 연결 테스트 실패:', testResult?.message || '알 수 없는 오류');
                return false;
            }
            
        } catch (error) {
            console.error('❌ API 연결 테스트 중 오류:', error.message || error);
            
            // 모듈 상태 디버깅 정보
            if (window.SupabaseAPI._moduleStatus) {
                console.log('🔍 모듈 상태:', window.SupabaseAPI._moduleStatus);
            }
            
            return false;
        }
    },

    // 🆕 v4.2.1 강화된 초기화 상태 확인
    checkInitialization() {
        const state = {
            configLoaded: !!window.CONFIG,
            supabaseAPI: !!window.SupabaseAPI,
            supabaseCore: !!window.SupabaseCore,
            supabaseStudent: !!window.SupabaseStudent,
            supabaseAdmin: !!window.SupabaseAdmin,
            apiInitialized: !!(window.SupabaseAPI && window.SupabaseAPI._moduleStatus && window.SupabaseAPI._moduleStatus.initialized),
            supabaseClient: !!window.supabase,
            lucideIcons: !!window.lucide
        };

        console.group('🔍 v4.2.1 시스템 초기화 상태');
        Object.entries(state).forEach(([key, value]) => {
            console.log(`${key}: ${value ? '✅' : '❌'}`);
        });
        
        // 모듈별 상세 상태 (있는 경우)
        if (window.SupabaseAPI && window.SupabaseAPI._moduleStatus) {
            console.log('📦 SupabaseAPI 모듈 상태:', window.SupabaseAPI._moduleStatus);
        }
        
        console.groupEnd();
        return state;
    }
};

// 전역 접근을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
    window.CONFIG = FINAL_CONFIG;
    window.DevTools = DevTools;
    
    // 🆕 즉시 설정 로드 확인 로그
    console.log('⚙️ CONFIG v4.2.1 로드됨:', new Date().toISOString());
    
    // 페이지 로드 시 설정 검증 및 개발 도구 초기화
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📋 CONFIG DOMContentLoaded 이벤트 실행');
        validateConfig();
        
        if (FINAL_CONFIG.DEV.DEBUG) {
            DevTools.printConfig();
            
            // 개발자 도구를 전역에 추가
            window.dev = DevTools;
            console.log('💡 개발 도구 사용법:');
            console.log('  dev.quickLogin("student") - 학생 빠른 로그인');
            console.log('  dev.quickLogin("admin") - 관리자 빠른 로그인');
            console.log('  dev.testApiConnection() - API 연결 테스트');
            console.log('  dev.printConfig() - 설정 정보 출력');
            console.log('  dev.checkInitialization() - 초기화 상태 확인');
        }
    });
}

// 모듈 내보내기 (Node.js 환경용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG: FINAL_CONFIG, DevTools };
}

// 🔧 v4.2.1 모듈화 시스템 호환 - 강화된 초기화 확인
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        // 🆕 v4.2.0 모듈 시스템 로딩 대기 (7초)
        console.log('🚀 v4.2.1 모듈 시스템 초기화 확인 시작...');
        
        // 모듈 로딩 대기
        const modulesReady = await waitForModulesReady(7);
        
        // 추가 안정화 대기 (2초)
        setTimeout(async () => {
            if (FINAL_CONFIG.DEV.DEBUG && window.DevTools) {
                console.log('🔍 페이지 로드 후 상태 확인 시작');
                
                // 초기화 상태 먼저 확인
                window.DevTools.checkInitialization();
                
                // API 연결 테스트 (안전하게)
                if (modulesReady) {
                    try {
                        await window.DevTools.testApiConnection();
                    } catch (error) {
                        console.warn('⚠️ API 연결 테스트 중 오류 (무시됨):', error.message);
                    }
                } else {
                    console.warn('⚠️ 모듈 로딩 불완전 - API 테스트 건너뜀');
                }
            }
        }, 2000); // 2초 추가 대기
    });

    // 🆕 에러 이벤트 리스너
    window.addEventListener('error', (event) => {
        if (FINAL_CONFIG.DEV.DEBUG) {
            console.error('🚨 글로벌 에러 감지:', event.error);
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        if (FINAL_CONFIG.DEV.DEBUG) {
            console.error('🚨 처리되지 않은 Promise 거부:', event.reason);
        }
    });
}
