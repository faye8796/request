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
                Utils.showAlert('학생 정보를 찾을 수 없습니다.\\n이름과 생년월일을 다시 확인해주세요.');
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

        // 성공 메시지 표시
        const userName = DataManager.currentUser.name;
        Utils.showAlert(`환영합니다, ${userName}님!`);

        // 해당 페이지로 이동
        if (userType === 'student') {
            // 학생의 경우 수업계획 완료 여부 체크
            this.checkAndRedirectStudent();
        } else if (userType === 'admin') {
            App.showPage('adminPage');
            AdminManager.init();
        }
    },

    // 학생 로그인 후 수업계획 체크 및 리다이렉션 - 수정됨
    checkAndRedirectStudent() {
        const studentId = DataManager.currentUser.id;
        const hasCompletedPlan = LessonPlanManager.hasCompletedLessonPlan(studentId);
        
        if (!hasCompletedPlan) {
            // 수업계획이 완료되지 않은 경우
            const needsPlan = LessonPlanManager.needsLessonPlan(studentId);
            
            if (needsPlan) {
                // 수업계획 작성 필요 - 바로 이동
                setTimeout(() => {
                    App.showPage('lessonPlanPage');
                    LessonPlanManager.showLessonPlanPage();
                    this.showLessonPlanGuidance();
                }, 1000);
            } else {
                // 임시저장된 수업계획이 있는 경우 - 바로 이동
                setTimeout(() => {
                    App.showPage('lessonPlanPage');
                    LessonPlanManager.showLessonPlanPage();
                    this.showLessonPlanContinueGuidance();
                }, 1000);
            }
        } else {
            // 수업계획이 완료된 경우 바로 학생 대시보드로
            App.showPage('studentPage');
            StudentManager.init();
        }
    },

    // 수업계획 작성 안내 - 개선됨
    showLessonPlanGuidance() {
        // 기존 알림들 제거
        this.clearAllNotices();
        
        const guidance = document.createElement('div');
        guidance.className = 'lesson-plan-guidance-overlay';
        guidance.innerHTML = `
            <div class="guidance-content">
                <div class="guidance-icon">
                    <i data-lucide="calendar-check" style="width: 3rem; height: 3rem; color: #4f46e5;"></i>
                </div>
                <h3>수업계획 작성이 필요합니다</h3>
                <p>파견 기간 동안의 수업계획을 먼저 작성해주세요.</p>
                <p>수업계획 완료 후 교구 신청이 가능합니다.</p>
                <button class="btn primary" onclick="this.parentElement.parentElement.remove()">
                    시작하기
                </button>
            </div>
        `;
        
        document.body.appendChild(guidance);
        lucide.createIcons();
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (guidance.parentNode) {
                guidance.parentNode.removeChild(guidance);
            }
        }, 5000);
    },

    // 수업계획 계속 작성 안내 - 개선됨
    showLessonPlanContinueGuidance() {
        // 기존 알림들 제거
        this.clearAllNotices();
        
        const guidance = document.createElement('div');
        guidance.className = 'lesson-plan-guidance-overlay';
        guidance.innerHTML = `
            <div class="guidance-content">
                <div class="guidance-icon">
                    <i data-lucide="edit" style="width: 3rem; height: 3rem; color: #f59e0b;"></i>
                </div>
                <h3>수업계획을 완료해주세요</h3>
                <p>임시저장된 수업계획이 있습니다.</p>
                <p>수업계획 완료 후 교구 신청이 가능합니다.</p>
                <button class="btn primary" onclick="this.parentElement.parentElement.remove()">
                    계속 작성하기
                </button>
            </div>
        `;
        
        document.body.appendChild(guidance);
        lucide.createIcons();
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (guidance.parentNode) {
                guidance.parentNode.removeChild(guidance);
            }
        }, 5000);
    },

    // 모든 알림 제거
    clearAllNotices() {
        const notices = document.querySelectorAll('.lesson-plan-required-notice, .lesson-plan-draft-notice, .lesson-plan-guidance-overlay');
        notices.forEach(notice => {
            if (notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        });
    },

    // 로그아웃 처리
    handleLogout() {
        if (Utils.showConfirm('정말로 로그아웃하시겠습니까?')) {
            // 데이터 정리
            DataManager.logout();
            
            // 모든 알림 제거
            this.clearAllNotices();
            
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
                detailsEl.textContent = `${user.instituteName} • ${user.specialization} • 예산한도: ${Utils.formatPrice(user.budgetLimit)}`;
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