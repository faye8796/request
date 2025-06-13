// 인증 관리 모듈 (Supabase 연동)
const AuthManager = {
    // 초기화
    init() {
        this.setupEventListeners();
        this.initializeTabs();
        this.checkExistingSession();
    },

    // 기존 세션 확인
    async checkExistingSession() {
        // 기존 인증 상태가 있는지 확인 (개발 중에는 생략)
        // 추후 Supabase Auth를 사용할 때 구현
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

    // 학생 로그인 처리 (Supabase 연동)
    async handleStudentLogin() {
        const name = Utils.$('#studentName').value.trim();
        const birthDate = Utils.$('#studentBirth').value;

        // 입력 검증
        if (!Utils.validateRequired(name, '이름')) return;
        if (!Utils.validateRequired(birthDate, '생년월일')) return;

        // 로딩 상태 표시
        const loginBtn = Utils.$('#studentLoginBtn');
        Utils.showLoading(loginBtn);

        try {
            // Supabase를 통한 인증 시도
            const result = await SupabaseAPI.authenticateStudent(name, birthDate);
            
            if (result.success) {
                this.loginSuccess('student', result.user);
            } else {
                Utils.hideLoading(loginBtn);
                Utils.showAlert(result.message || '학생 정보를 찾을 수 없습니다.\\n이름과 생년월일을 다시 확인해주세요.');
            }
        } catch (error) {
            console.error('Student login error:', error);
            Utils.hideLoading(loginBtn);
            Utils.showAlert('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    },

    // 관리자 로그인 처리 (Supabase 연동)
    async handleAdminLogin() {
        const code = Utils.$('#adminCode').value.trim();

        // 입력 검증
        if (!Utils.validateRequired(code, '관리자 코드')) return;

        // 로딩 상태 표시
        const loginBtn = Utils.$('#adminLoginBtn');
        Utils.showLoading(loginBtn);

        try {
            // Supabase를 통한 인증 시도
            const result = await SupabaseAPI.authenticateAdmin(code);
            
            if (result.success) {
                this.loginSuccess('admin', result.user);
            } else {
                Utils.hideLoading(loginBtn);
                Utils.showAlert(result.message || '관리자 코드가 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            Utils.hideLoading(loginBtn);
            Utils.showAlert('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    },

    // 로그인 성공 처리
    async loginSuccess(userType, user) {
        console.log('Login success:', { userType, user });
        
        // 입력 필드 초기화
        this.clearLoginForms();

        // 성공 메시지 표시
        const userName = user.name;
        Utils.showAlert(`환영합니다, ${userName}님!`);

        // 해당 페이지로 이동
        if (userType === 'student') {
            // 학생의 경우 수업계획 완료 여부 체크
            await this.checkAndRedirectStudent(user.id);
        } else if (userType === 'admin') {
            App.showPage('adminPage');
            AdminManager.init();
        }
    },

    // 학생 로그인 후 수업계획 체크 및 리다이렉션 (Supabase 연동)
    async checkAndRedirectStudent(studentId) {
        try {
            // 수업계획 상태 확인
            const lessonPlan = await SupabaseAPI.getStudentLessonPlan(studentId);
            const hasCompletedPlan = lessonPlan && lessonPlan.status === 'submitted';
            
            if (!hasCompletedPlan) {
                // 수업계획이 완료되지 않은 경우
                const hasDraft = lessonPlan && lessonPlan.status === 'draft';
                
                if (!hasDraft) {
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
        } catch (error) {
            console.error('Error checking lesson plan status:', error);
            // 오류 발생 시 기본적으로 학생 대시보드로 이동
            App.showPage('studentPage');
            StudentManager.init();
        }
    },

    // 수업계획 작성 안내
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

    // 수업계획 계속 작성 안내
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
            SupabaseAPI.logout();
            
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
    async updateUserDisplay() {
        const user = SupabaseAPI.currentUser;
        const userType = SupabaseAPI.currentUserType;

        console.log('updateUserDisplay called:', { user, userType });

        if (userType === 'student' && user) {
            const welcomeEl = Utils.$('#studentWelcome');
            const detailsEl = Utils.$('#studentDetails');
            
            if (welcomeEl) {
                welcomeEl.textContent = `안녕하세요, ${user.name}님!`;
                console.log('Welcome message updated:', welcomeEl.textContent);
            } else {
                console.error('studentWelcome element not found');
            }
            
            if (detailsEl) {
                const instituteName = user.sejong_institute || '세종학당';
                const field = user.field || '전문분야';
                
                // 예산 정보 조회
                try {
                    const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(user.id);
                    const budgetLimit = budgetStatus ? budgetStatus.allocated : 0;
                    detailsEl.textContent = `${instituteName} • ${field} • 배정예산: ${Utils.formatPrice(budgetLimit)}`;
                } catch (error) {
                    console.error('Error fetching budget status:', error);
                    detailsEl.textContent = `${instituteName} • ${field}`;
                }
            } else {
                console.error('studentDetails element not found');
            }
        } else {
            console.log('User display update skipped - no user or not student type');
            
            // 현재 사용자가 없는 경우에도 기본 메시지 표시
            const welcomeEl = Utils.$('#studentWelcome');
            if (welcomeEl && !user) {
                welcomeEl.textContent = '안녕하세요, 님!';
            }
        }
    },

    // 인증 상태 확인
    isAuthenticated() {
        return SupabaseAPI.currentUser !== null;
    },

    // 사용자 타입 확인
    getUserType() {
        return SupabaseAPI.currentUserType;
    },

    // 현재 사용자 정보 조회
    getCurrentUser() {
        return SupabaseAPI.currentUser;
    },

    // 권한 확인
    hasPermission(requiredType) {
        return this.isAuthenticated() && this.getUserType() === requiredType;
    },

    // 세션 관리 (향후 확장)
    saveSession() {
        if (this.isAuthenticated()) {
            const sessionData = {
                user: SupabaseAPI.currentUser,
                userType: SupabaseAPI.currentUserType,
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
                    SupabaseAPI.currentUser = user;
                    SupabaseAPI.currentUserType = userType;
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
    },

    // 현재 사용자 ID 조회
    getCurrentUserId() {
        return this.getCurrentUser()?.id || null;
    },

    // 현재 사용자가 학생인지 확인
    isStudent() {
        return this.getUserType() === 'student';
    },

    // 현재 사용자가 관리자인지 확인
    isAdmin() {
        return this.getUserType() === 'admin';
    }
};
