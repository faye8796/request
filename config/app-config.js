/**
 * 애플리케이션 설정 파일
 * 
 * @description 환경 설정 파일 - 간소화 버전. Supabase 연동 후 중복 설정 제거 및 최적화
 * @dependencies 없음 (독립적 설정 파일)
 * @author Claude AI
 * @date 2025-06-16
 */

// 환경 설정 파일 - 간소화 버전
// Supabase 연동 후 중복 설정 제거 및 최적화

const CONFIG = {
    // Supabase 설정
    SUPABASE: {
        URL: 'https://aazvopacnbbkvusihqva.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTQyMjQsImV4cCI6MjA2NTM3MDIyNH0.0NXI_tohwFCOl3xY4b1jIlxQR_zGTS9tWDM2OFxTq4s'
    },
    
    // 애플리케이션 설정
    APP: {
        NAME: '세종학당 문화교구 신청 플랫폼',
        VERSION: '2.0.0', // Supabase 연동 버전
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
        console.error('설정 오류:', errors);
        if (FINAL_CONFIG.DEV.DEBUG) {
            alert('설정 오류가 발견되었습니다. 콘솔을 확인해주세요.');
        }
    }
    
    return errors.length === 0;
}

// 개발 도구 함수들
const DevTools = {
    // 설정 정보 출력
    printConfig() {
        if (!FINAL_CONFIG.DEV.DEBUG) return;
        console.group('🔧 Application Configuration');
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

    // API 연결 테스트
    async testApiConnection() {
        if (!window.SupabaseAPI) {
            console.error('SupabaseAPI가 로드되지 않았습니다.');
            return false;
        }

        try {
            console.log('🔗 API 연결 테스트 중...');
            const settings = await window.SupabaseAPI.getSystemSettings();
            console.log('✅ API 연결 성공:', Object.keys(settings).length, '개 설정 조회됨');
            return true;
        } catch (error) {
            console.error('❌ API 연결 실패:', error);
            return false;
        }
    }
};

// 전역 접근을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
    window.CONFIG = FINAL_CONFIG;
    window.DevTools = DevTools;
    
    // 페이지 로드 시 설정 검증 및 개발 도구 초기화
    document.addEventListener('DOMContentLoaded', () => {
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
        }
    });
}

// 모듈 내보내기 (Node.js 환경용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG: FINAL_CONFIG, DevTools };
}

// 설정 무결성 확인
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // 3초 후에 API 연결 상태 확인
        setTimeout(async () => {
            if (FINAL_CONFIG.DEV.DEBUG && window.DevTools) {
                await window.DevTools.testApiConnection();
            }
        }, 3000);
    });
}
