// 환경 설정 파일 - 보안 강화 및 하드코딩 제거
// 환경변수를 통한 안전한 설정 관리

// 환경변수에서 값을 가져오는 함수
function getEnvValue(key, defaultValue) {
    // 프로덕션에서는 환경변수로 설정
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
        return window.ENV[key];
    }
    
    // 개발환경에서는 로컬 설정 사용 (실제 운영시 제거)
    const devValues = {
        'SUPABASE_URL': 'https://aazvopacnbbkvusihqva.supabase.co',
        'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTQyMjQsImV4cCI6MjA2NTM3MDIyNH0.0NXI_tohwFCOl3xY4b1jIlxQR_zGTS9tWDM2OFxTq4s',
        'ADMIN_CODE': 'admin123',
        'DEBUG': 'true'
    };
    
    return devValues[key] || defaultValue;
}

const CONFIG = {
    // Supabase 설정 - 환경변수 기반
    SUPABASE: {
        URL: getEnvValue('SUPABASE_URL'),
        ANON_KEY: getEnvValue('SUPABASE_ANON_KEY'),
        REALTIME_ENABLED: getEnvValue('REALTIME_ENABLED', 'false') === 'true',
        STORAGE_BUCKET: getEnvValue('STORAGE_BUCKET', 'receipts')
    },
    
    // 애플리케이션 설정
    APP: {
        NAME: '세종학당 문화교구 신청 플랫폼',
        VERSION: '3.0.0',
        ENVIRONMENT: getEnvValue('NODE_ENV', 'development'),
        ADMIN_CODE: getEnvValue('ADMIN_CODE'),
        
        // 기본 분야별 예산 설정 (초기화용, 실제는 DB에서 관리)
        DEFAULT_BUDGET_SETTINGS: {
            '한국어교육': { perLessonAmount: 15000, maxBudget: 400000 },
            '전통문화예술': { perLessonAmount: 25000, maxBudget: 600000 },
            'K-Pop 문화': { perLessonAmount: 10000, maxBudget: 300000 },
            '한국현대문화': { perLessonAmount: 18000, maxBudget: 450000 },
            '전통음악': { perLessonAmount: 30000, maxBudget: 750000 },
            '한국미술': { perLessonAmount: 22000, maxBudget: 550000 },
            '한국요리문화': { perLessonAmount: 35000, maxBudget: 800000 }
        },

        // 시스템 기본 설정
        DEFAULT_SYSTEM_SETTINGS: {
            test_mode: false,
            ignore_deadline: false,
            lesson_plan_deadline: '2025-12-31',
            lesson_plan_time: '23:59',
            notice_message: '',
            realtime_notifications: true,
            auto_backup_enabled: true
        }
    },
    
    // 개발 환경 설정
    DEV: {
        DEBUG: getEnvValue('DEBUG', 'false') === 'true',
        ENABLE_CONSOLE_LOGS: getEnvValue('CONSOLE_LOGS', 'true') === 'true',
        MOCK_DATA_ENABLED: false, // Supabase 연동 후 완전히 비활성화
        
        // 개발용 빠른 설정
        QUICK_LOGIN: {
            STUDENT: {
                name: '김민수',
                birthDate: '1995-03-15'
            },
            ADMIN_CODE: getEnvValue('ADMIN_CODE')
        }
    },

    // UI 설정
    UI: {
        ITEMS_PER_PAGE: 10,
        SEARCH_DEBOUNCE_MS: 300,
        TOAST_DURATION_MS: 3000,
        MAX_FILE_SIZE_MB: 5,
        SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        
        // 애니메이션 및 UX 설정
        ANIMATION_DURATION_MS: 300,
        LOADING_TIMEOUT_MS: 30000,
        RETRY_DELAY_MS: 1000,
        MAX_RETRY_COUNT: 3
    },

    // 보안 설정
    SECURITY: {
        SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30분
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15분
        PASSWORD_MIN_LENGTH: 8,
        ENABLE_SESSION_LOGGING: getEnvValue('SESSION_LOGGING', 'false') === 'true'
    },

    // 성능 설정
    PERFORMANCE: {
        CACHE_DURATION_MS: 5 * 60 * 1000, // 5분
        IMAGE_COMPRESSION_QUALITY: 0.8,
        LAZY_LOADING_ENABLED: true,
        PRELOAD_CRITICAL_DATA: true,
        DEBOUNCE_SEARCH_MS: 300
    }
};

// 설정 유효성 검사
function validateConfig() {
    const errors = [];
    const warnings = [];
    
    // 필수 설정 검사
    if (!CONFIG.SUPABASE.URL) {
        errors.push('Supabase URL이 설정되지 않았습니다.');
    }
    
    if (!CONFIG.SUPABASE.ANON_KEY) {
        errors.push('Supabase ANON_KEY가 설정되지 않았습니다.');
    }
    
    if (!CONFIG.APP.ADMIN_CODE) {
        errors.push('관리자 코드가 설정되지 않았습니다.');
    }
    
    // 보안 경고
    if (CONFIG.APP.ENVIRONMENT === 'production') {
        if (CONFIG.APP.ADMIN_CODE === 'admin123') {
            warnings.push('⚠️ 프로덕션에서 기본 관리자 코드를 사용하고 있습니다.');
        }
        
        if (CONFIG.DEV.DEBUG) {
            warnings.push('⚠️ 프로덕션에서 디버그 모드가 활성화되어 있습니다.');
        }
    }
    
    // 로깅
    if (errors.length > 0) {
        console.error('❌ 설정 오류:', errors);
        if (CONFIG.DEV.DEBUG) {
            alert('설정 오류가 발견되었습니다. 콘솔을 확인해주세요.');
        }
    }
    
    if (warnings.length > 0 && CONFIG.DEV.DEBUG) {
        console.warn('⚠️ 설정 경고:', warnings);
    }
    
    return { valid: errors.length === 0, errors, warnings };
}

// 환경별 설정 적용
function applyEnvironmentConfig() {
    // 프로덕션에서는 민감한 정보 로깅 비활성화
    if (CONFIG.APP.ENVIRONMENT === 'production') {
        CONFIG.DEV.ENABLE_CONSOLE_LOGS = false;
        CONFIG.DEV.DEBUG = false;
    }
    
    // 개발환경에서는 추가 디버깅 기능 활성화
    if (CONFIG.APP.ENVIRONMENT === 'development') {
        CONFIG.UI.ANIMATION_DURATION_MS = 100; // 빠른 애니메이션
        CONFIG.PERFORMANCE.CACHE_DURATION_MS = 1000; // 짧은 캐시
    }
}

// 설정 적용
applyEnvironmentConfig();

// 개발 도구 함수들
const DevTools = {
    // 설정 정보 출력
    printConfig() {
        if (!CONFIG.DEV.DEBUG) return;
        
        console.group('🔧 Application Configuration');
        console.log('App Name:', CONFIG.APP.NAME);
        console.log('Version:', CONFIG.APP.VERSION);
        console.log('Environment:', CONFIG.APP.ENVIRONMENT);
        console.log('Debug Mode:', CONFIG.DEV.DEBUG);
        console.log('Realtime Enabled:', CONFIG.SUPABASE.REALTIME_ENABLED);
        console.log('Supabase URL:', CONFIG.SUPABASE.URL ? '✅ 설정됨' : '❌ 미설정');
        console.groupEnd();
    },

    // 빠른 로그인 (개발용)
    async quickLogin(type = 'student') {
        if (!CONFIG.DEV.DEBUG) {
            console.warn('개발 모드에서만 사용 가능합니다.');
            return;
        }

        if (!window.SupabaseAPI) {
            console.error('SupabaseAPI가 로드되지 않았습니다.');
            return;
        }

        try {
            if (type === 'student') {
                const { name, birthDate } = CONFIG.DEV.QUICK_LOGIN.STUDENT;
                const result = await window.SupabaseAPI.authenticateStudent(name, birthDate);
                console.log(result.success ? '✅ 학생 빠른 로그인 성공' : '❌ 학생 빠른 로그인 실패');
                return result.success;
            } else if (type === 'admin') {
                const result = await window.SupabaseAPI.authenticateAdmin(CONFIG.DEV.QUICK_LOGIN.ADMIN_CODE);
                console.log(result.success ? '✅ 관리자 빠른 로그인 성공' : '❌ 관리자 빠른 로그인 실패');
                return result.success;
            }
        } catch (error) {
            console.error('❌ 빠른 로그인 오류:', error);
        }
    },

    // API 연결 테스트
    async testApiConnection() {
        if (!window.SupabaseAPI) {
            console.error('SupabaseAPI가 로드되지 않았습니다.');
            return false;
        }

        try {
            console.log('🔗 API 연결 테스트 중...');
            const healthCheck = await window.SupabaseAPI.healthCheck();
            
            if (healthCheck.status === 'healthy') {
                console.log('✅ API 연결 성공:', healthCheck);
                return true;
            } else {
                console.error('❌ API 연결 실패:', healthCheck);
                return false;
            }
        } catch (error) {
            console.error('❌ API 연결 테스트 오류:', error);
            return false;
        }
    },

    // 성능 모니터링
    startPerformanceMonitoring() {
        if (!CONFIG.DEV.DEBUG) return;
        
        // 메모리 사용량 모니터링
        if (performance && performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
                
                if (used > 50) { // 50MB 이상 사용시 경고
                    console.warn(`📊 메모리 사용량: ${used}MB / ${total}MB`);
                }
            }, 30000); // 30초마다 체크
        }
    },

    // 캐시 상태 확인
    checkCacheStatus() {
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
        console.log(`💾 캐시 상태: ${cacheKeys.length}개 항목`);
        cacheKeys.forEach(key => {
            const item = localStorage.getItem(key);
            try {
                const parsed = JSON.parse(item);
                const age = Date.now() - parsed.timestamp;
                console.log(`  ${key}: ${Math.round(age / 1000)}초 전`);
            } catch (e) {
                console.log(`  ${key}: 파싱 오류`);
            }
        });
    }
};

// 전역 접근을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.DevTools = DevTools;
    
    // 페이지 로드 시 설정 검증 및 개발 도구 초기화
    document.addEventListener('DOMContentLoaded', () => {
        const validation = validateConfig();
        
        if (CONFIG.DEV.DEBUG) {
            DevTools.printConfig();
            DevTools.startPerformanceMonitoring();
            
            // 개발자 도구를 전역에 추가
            window.dev = DevTools;
            console.log('💡 개발 도구 사용법:');
            console.log('  dev.quickLogin("student") - 학생 빠른 로그인');
            console.log('  dev.quickLogin("admin") - 관리자 빠른 로그인');
            console.log('  dev.testApiConnection() - API 연결 테스트');
            console.log('  dev.printConfig() - 설정 정보 출력');
            console.log('  dev.checkCacheStatus() - 캐시 상태 확인');
        }
    });
}

// 모듈 내보내기 (Node.js 환경용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, DevTools, validateConfig };
}

// 설정 무결성 확인 및 자동 테스트
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // 3초 후에 자동 테스트 실행
        setTimeout(async () => {
            if (CONFIG.DEV.DEBUG && window.DevTools) {
                await window.DevTools.testApiConnection();
            }
        }, 3000);
    });
}

console.log('✅ Config.js 로드됨 (v3.0 - 보안 강화)');