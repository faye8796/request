// 환경 설정 파일 - v4.2.2 모듈 로딩 타임아웃 수정
// v4.2.1 모듈화 업데이트 후 admin 모듈 로딩 타임아웃 오류 수정
// 🔧 Admin 모듈 로딩 실패 시에도 시스템 정상 작동하도록 개선

const CONFIG = {
    // Supabase 설정
    SUPABASE: {
        URL: 'https://aazvopacnbbkvusihqva.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTQyMjQsImV4cCI6MjA2NTM3MDIyNH0.0NXI_tohwFCOl3xY4b1jIlxQR_zGTS9tWDM2OFxTq4s'
    },
    
    // 애플리케이션 설정
    APP: {
        NAME: '세종학당 문화교구 신청 플랫폼',
        VERSION: '4.2.2', // 모듈 로딩 타임아웃 수정 버전
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