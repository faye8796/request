// 간소화된 학생 인증 시스템 - intern-announcement 방식 적용
// Supabase 직접 연동으로 안정성 확보

const SimpleAuth = {
    // Supabase 클라이언트
    supabase: null,
    
    // 현재 사용자 정보
    currentUser: null,

    // 초기화
    async init() {
        console.log('🚀 SimpleAuth 초기화 중...');
        
        // Supabase 클라이언트 초기화
        await this.initSupabase();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 기존 세션 확인
        this.checkExistingSession();
        
        console.log('✅ SimpleAuth 초기화 완료');
    },

    // Supabase 클라이언트 초기화 - intern-announcement 방식
    async initSupabase() {
        try {
            if (!window.supabase || !CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
                throw new Error('Supabase 설정이 올바르지 않습니다.');
            }
            
            this.supabase = window.supabase.createClient(
                CONFIG.SUPABASE.URL,
                CONFIG.SUPABASE.ANON_KEY
            );
            
            console.log('✅ Supabase 클라이언트 초기화 완료');
        } catch (error) {
            console.error('❌ Supabase 초기화 실패:', error);
            alert('시스템 연결에 실패했습니다. 페이지를 새로고침해주세요.');
        }
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 로그인 버튼
        const loginBtn = document.getElementById('studentLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // Enter 키 이벤트
        const nameInput = document.getElementById('studentName');
        const birthInput = document.getElementById('studentBirth');
        
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
        
        if (birthInput) {
            birthInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
    },

    // 기존 세션 확인
    checkExistingSession() {
        const studentSession = localStorage.getItem('currentStudent');
        if (studentSession) {
            try {
                const studentData = JSON.parse(studentSession);
                console.log('🔍 기존 세션 발견:', studentData.name);
                
                // 대시보드로 리다이렉트
                window.location.href = 'student/dashboard.html';
            } catch (error) {
                console.error('❌ 세션 데이터 파싱 오류:', error);
                localStorage.removeItem('currentStudent');
            }
        }
    },

    // 로그인 처리
    async handleLogin() {
        const nameInput = document.getElementById('studentName');
        const birthInput = document.getElementById('studentBirth');
        const loginBtn = document.getElementById('studentLoginBtn');

        if (!nameInput || !birthInput || !loginBtn) {
            console.error('❌ 필수 요소를 찾을 수 없습니다.');
            return;
        }

        const name = nameInput.value.trim();
        const birthDate = birthInput.value;

        // 입력 검증
        if (!name) {
            alert('이름을 입력해주세요.');
            nameInput.focus();
            return;
        }

        if (!birthDate) {
            alert('생년월일을 선택해주세요.');
            birthInput.focus();
            return;
        }

        // 로딩 상태 표시
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i data-lucide="loader"></i> 로그인 중...';
        loginBtn.disabled = true;

        try {
            // 학생 정보 조회
            const student = await this.findStudent(name, birthDate);
            
            if (student) {
                this.currentUser = student;
                await this.saveSession(student);
                
                console.log('✅ 로그인 성공:', student.name);
                
                // 대시보드로 이동
                window.location.href = 'student/dashboard.html';
                
            } else {
                alert('입력하신 정보와 일치하는 학생을 찾을 수 없습니다.\n이름과 생년월일을 다시 확인해주세요.');
            }
            
        } catch (error) {
            console.error('❌ 로그인 처리 중 오류:', error);
            
            let errorMessage = '로그인 처리 중 오류가 발생했습니다.';
            if (error.message.includes('네트워크') || error.message.includes('fetch')) {
                errorMessage = '네트워크 연결을 확인하고 다시 시도해주세요.';
            } else if (error.message.includes('시스템')) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
            
        } finally {
            // 버튼 상태 복구
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
            
            // 아이콘 재초기화
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    },

    // 학생 정보 조회 - intern-announcement 방식
    async findStudent(name, birthDate) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
            }

            console.log('🔍 학생 정보 조회:', { name, birthDate });

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('name', name)
                .eq('birth_date', birthDate)
                .eq('user_type', 'student')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // 데이터가 없는 경우
                    console.log('⚠️ 일치하는 학생 정보 없음');
                    return null;
                }
                throw error;
            }

            console.log('✅ 학생 정보 조회 성공:', data.name);
            return data;
            
        } catch (error) {
            console.error('❌ 학생 정보 조회 오류:', error);
            throw error;
        }
    },

    // 세션 저장
    async saveSession(studentData) {
        try {
            // localStorage에 저장
            const sessionData = {
                id: studentData.id,
                name: studentData.name,
                birth_date: studentData.birth_date,
                sejong_institute: studentData.sejong_institute,
                field: studentData.field,
                user_type: studentData.user_type || 'student',
                created_at: studentData.created_at,
                updated_at: studentData.updated_at,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('currentStudent', JSON.stringify(sessionData));
            localStorage.setItem('studentSession', 'true');
            
            // sessionStorage에도 동기화 (equipment-request.html에서 사용)
            const legacySessionData = {
                user: sessionData,
                userType: 'student',
                loginTime: sessionData.loginTime
            };
            sessionStorage.setItem('userSession', JSON.stringify(legacySessionData));
            
            console.log('✅ 세션 저장 완료');
            
        } catch (error) {
            console.warn('⚠️ 세션 저장 실패:', error);
        }
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        try {
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
            sessionStorage.removeItem('userSession');
        } catch (error) {
            console.warn('⚠️ 세션 정리 실패:', error);
        }
        console.log('✅ 로그아웃 완료');
    },

    // 디버그 정보 출력
    debug() {
        if (CONFIG.DEV.DEBUG) {
            console.log('🔍 SimpleAuth Debug Info:', {
                currentUser: this.currentUser,
                supabaseConnected: !!this.supabase,
                config: CONFIG
            });
        }
    }
};

// 전역 접근을 위해 window 객체에 추가 (기존 코드 호환성)
window.SupabaseAPI = {
    authenticateStudent: async (name, birthDate) => {
        const student = await SimpleAuth.findStudent(name, birthDate);
        if (student) {
            return { success: true, data: student };
        } else {
            return { success: false, message: '일치하는 학생 정보를 찾을 수 없습니다.' };
        }
    },
    currentUser: () => SimpleAuth.currentUser,
    client: () => SimpleAuth.supabase
};

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    // CONFIG 로드 대기
    const initApp = () => {
        if (window.CONFIG) {
            SimpleAuth.init();
            
            // 개발 모드에서 전역 접근 허용
            if (CONFIG.DEV.DEBUG) {
                window.SimpleAuth = SimpleAuth;
                console.log('💡 개발 모드: window.SimpleAuth로 접근 가능');
            }
        } else {
            console.log('⏳ CONFIG 로드 대기 중...');
            setTimeout(initApp, 100);
        }
    };
    
    initApp();
});

console.log('🚀 SimpleAuth v1.0 loaded - stable and simplified');
