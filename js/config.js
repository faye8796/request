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
        
        // 기본 예