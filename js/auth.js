// 인증 관리 모듈
const AuthManager = {
    // 초기화
    init() {
        this.setupEventListeners();
        this.initializeTabs();
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 탭 전환 이벤트
        Utils.on('#studentTab', 'click', () => this.switchToStudentLogin());
        Utils.on('#adminTab', 'click', () => this.switchToAdminLogin());

        // 로그인 버튼 이벤트
        Utils.on('#studentLoginBtn', 'click', () => this.handleStudentLogin());
        Utils.on('#adminLoginBtn', 'click', () => this.handleAdminLogin());

        // 로그아웃 버튼 이벤트
        Utils.on('#studentLogout', 'click', () => this.handleLogout());
        Utils.on('#adminLogout', 'click', () => this.handleLogout());

        // Enter 키 이벤트
        this.setupEnterKeyEvents();
    },

    // Enter 키 이벤트 설정
    setupEnterKeyEvents() {
        // 학생 로그인 폼
        Utils.on('#studentName', 'keypress', (e) => {
            if (e.key === 'Enter') this.handleStudentLogin();
        });
        Utils.on('#studentBirth', 'keypress', (e) => {
            if (e.key === 'Enter') this.handleStudentLogin();
        });

        // 관리자 로그인 폼
        Utils.on('#adminCode', 'keypress', (e) => {
            if (e.key === 'Enter') this.handleAdminLogin();
        });
    },

    // 탭 초기화
    initializeTabs() {
        this.switchToStudentLogin();
    },

    // 학생 로그인 탭으로 전환
    switchToStudentLogin() {
        // 탭 버튼 상태 변경
        Utils.$('#studentTab').classList.add('active');
        Utils.$('#adminTab').classList.remove('active');

        // 폼 표시/숨김
        Utils.$('#studentLogin').classList.add('active');
        Utils.$('#adminLogin').classList.remove('active');

        // 첫 번째 입력 필드에 포커스
        setTimeout(() => {
            Utils.$('#studentName').focus();
        }, 100);
    },

    // 관리자 로그인 탭으로 전환
    switchToAdminLogin() {
        // 탭 버튼 상태 변경
        Utils.$('#adminTab').classList.add('active');
        Utils.$('#studentTab').classList.remove('active');

        // 폼 표시/숨김
        Utils.$('#adminLogin').classList.add('active');
        Utils.$('#studentLogin').classList.remove('active');

        // 첫 번째 입력 필드에 포커스
        setTimeout(() => {
            Utils.$('#adminCode').focus();
        }, 100);
    },

    // 학생 로그인 처리
    handleStudentLogin() {
        const name = Utils.$('#studentName').value.trim();
        const birthDate = Utils.$('#studentBirth').value;

        // 입력 검증
        if (!Utils.validateRequired(name, '이름')) return;
        if (!Utils.validateRequired(birthDate, '생년월일')) return;

        // 로딩 상태 표시
        const loginBtn = Utils.$('#studentLoginBtn');
        Utils.showLoading(loginBtn);

        // 인증 시도
        setTimeout(() => {
            if (DataManager.authenticateStudent(name, birthDate)) {
                this.loginSuccess('student');
            } else {
                Utils.hideLoading(loginBtn);
                Utils.showAlert('학생 정보를 찾을 수 없습니다.\n이름과 생년월일을 다시 확인해주세요.');
            }
        }, 500); // 실제 인증 과정을 시뮬레이션
    },

    // 관리자 로그인 처리
    handleAdminLogin() {
        const code = Utils.$('#adminCode').value.trim();

        // 입력 검증
        if (!Utils.validateRequired(code, '관리자 코드')) return;

        // 로딩 상태 표시
        const loginBtn = Utils.$('#adminLoginBtn');
        Utils.showLoading(loginBtn);

        // 인증 시도
        setTimeout(() => {
            if (DataManager.authenticateAdmin(code)) {
                this.loginSuccess('admin');
            } else {
                Utils.hideLoading(loginBtn);
                Utils.showAlert('관리자 코드가 올바르지 않습니다.');
            }
        }, 500);
    },

    // 로그인 성공 처리
    loginSuccess(userType) {
        // 입력 필드 초기화
        this.clearLoginForms();

        // 해당 페이지로 이동
        if (userType === 'student') {
            App.showPage('studentPage');
            StudentManager.init();
        } else if (userType === 'admin') {
            App.showPage('adminPage');
            AdminManager.init();
        }

        // 성공 메시지 표시
        const userName = DataManager.currentUser.name;
        Utils.showAlert(`환영합니다, ${userName}님!`);
    },

    // 로그아웃 처리
    handleLogout() {
        if (Utils.showConfirm('정말로 로그아웃하시겠습니까?')) {
            // 데이터 정리
            DataManager.logout();
            
            // 폼 초기화
            this.clearLoginForms();
            
            // 로그인 페이지로 이동
            App.showPage('loginPage');
            
            // 포커스 설정
            setTimeout(() => {
                Utils.$('#studentName').focus();
            }, 100);
        }
    },

    // 로그인 폼 초기화
    clearLoginForms() {
        Utils.$('#studentName').value = '';
        Utils.$('#studentBirth').value = '';
        Utils.$('#adminCode').value = '';
        
        // 로딩 상태 해제
        Utils.hideLoading('#studentLoginBtn');
        Utils.hideLoading('#adminLoginBtn');
    },

    // 현재 사용자 정보 표시 업데이트
    updateUserDisplay() {
        const user = DataManager.currentUser;
        const userType = DataManager.currentUserType;

        if (userType === 'student') {
            const welcomeEl = Utils.$('#studentWelcome');
            const detailsEl = Utils.$('#studentDetails');
            
            if (welcomeEl) {
                welcomeEl.textContent = `안녕하세요, ${user.name}님!`;
            }
            
            if (detailsEl) {
                detailsEl.textContent = `${user.country} • ${user.program}`;
            }
        }
    },

    // 인증 상태 확인
    isAuthenticated() {
        return DataManager.currentUser !== null;
    },

    // 사용자 타입 확인
    getUserType() {
        return DataManager.currentUserType;
    },

    // 권한 확인
    hasPermission(requiredType) {
        return this.isAuthenticated() && this.getUserType() === requiredType;
    },

    // 세션 관리 (향후 확장)
    saveSession() {
        if (this.isAuthenticated()) {
            const sessionData = {
                user: DataManager.currentUser,
                userType: DataManager.currentUserType,
                timestamp: Date.now()
            };
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
        }
    },

    // 세션 복원
    restoreSession() {
        try {
            const sessionData = sessionStorage.getItem('userSession');
            if (sessionData) {
                const { user, userType, timestamp } = JSON.parse(sessionData);
                
                // 세션 유효성 검사 (24시간)
                const now = Date.now();
                const sessionAge = now - timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24시간
                
                if (sessionAge < maxAge) {
                    DataManager.currentUser = user;
                    DataManager.currentUserType = userType;
                    return true;
                }
            }
        } catch (error) {
            console.error('Session restore failed:', error);
        }
        
        // 세션 정리
        this.clearSession();
        return false;
    },

    // 세션 정리
    clearSession() {
        sessionStorage.removeItem('userSession');
    },

    // 자동 로그아웃 타이머 (향후 확장)
    startAutoLogoutTimer() {
        // 30분 후 자동 로그아웃
        const timeout = 30 * 60 * 1000;
        
        setTimeout(() => {
            if (this.isAuthenticated()) {
                Utils.showAlert('보안을 위해 자동으로 로그아웃됩니다.');
                this.handleLogout();
            }
        }, timeout);
    }
};