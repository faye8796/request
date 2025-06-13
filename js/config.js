// 환경 설정 파일
// 프로덕션 환경에서는 이 파일의 값들을 환경변수로 설정하세요

const CONFIG = {
    // Supabase 설정
    SUPABASE: {
        URL: 'https://aazvopacnbbkvusihqva.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTQyMjQsImV4cCI6MjA2NTM3MDIyNH0.0NXI_tohwFCOl3xY4b1jIlxQR_zGTS9tWDM2OFxTq4s'
    },
    
    // 애플리케이션 설정
    APP: {
        NAME: '세종학당 문화교구 신청 플랫폼',
        VERSION: '1.0.0',
        ADMIN_CODE: 'admin123',
        
        // 기본 예산 설정
        DEFAULT_BUDGET_SETTINGS: {
            '한국어교육': { perLessonAmount: 15000, maxBudget: 400000 },
            '전통문화예술': { perLessonAmount: 25000, maxBudget: 600000 },
            'K-Pop 문화': { perLessonAmount: 10000, maxBudget: 300000 },
            '한국현대문화': { perLessonAmount: 18000, maxBudget: 450000 },
            '전통음악': { perLessonAmount: 30000, maxBudget: 750000 },
            '한국미술': { perLessonAmount: 22000, maxBudget: 550000 },
            '한국요리문화': { perLessonAmount: 35000, maxBudget: 800000 }
        }
    },
    
    // 개발 환경 설정
    DEV: {
        DEBUG: true,
        TEST_MODE: false
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
    DEV: CONFIG.DEV
};

// 전역 접근을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
    window.CONFIG = FINAL_CONFIG;
}

// 모듈 내보내기 (Node.js 환경용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FINAL_CONFIG;
}
