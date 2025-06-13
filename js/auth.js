// 통합 인증 관리 시스템 - v3.0
// 실시간 알림, 세션 관리, 보안 강화 포함

class AuthManager {
    constructor() {
        this.sessionStorage = new Map();
        this.loginAttempts = new Map();
        this.securityLog = [];
        this.eventBus = new EventTarget();
        this.autoLogoutTimer = null;
        this.sessionCheckerInterval = null;
        
        // 보안 설정
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15분
        this.sessionTimeout = 30 * 60 * 1000; // 30분
    }

    // ===================
    // 초기화 및 이벤트 설정
    // ===================

    init() {
        this.setupEventListeners();
        this.initializeTabs();
        this.startSessionChecker();
        this.setupKeyboardShortcuts();
        this.restoreSession();
        
        console.log('✅ AuthManager v3.0 초기화 완료');
    }

    setupEventListeners() {
        // 탭 전환 이벤트
        this._addEventListener('#studentTab', 'click', () => this.switchToStudentLogin());
        this._addEventListener('#adminTab', 'click', () => this.switchToAdminLogin());

        // 로그인 버튼 이벤트
        this._addEventListener('#studentLoginBtn', 'click', () => this.handleStudentLogin());
        this._addEventListener('#adminLoginBtn', 'click', () => this.handleAdminLogin());

        // 로그아웃 버튼 이벤트
        this._addEventListener('#studentLogout', 'click', () => this.handleLogout());
        this._addEventListener('#adminLogout', 'click', () => this.handleLogout());

        // Enter 키 이벤트
        this.setupEnterKeyEvents();
        
        // 실시간 이벤트 리스너
        this.setupRealtimeListeners();
        
        // 브라우저 이벤트
        window.addEventListener('beforeunload', () => this.saveSession());
        window.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    setupEnterKeyEvents() {
        // 학생 로그인 폼
        this._addEventListener('#studentName', 'keypress', (e) => {
            if (e.key === 'Enter') this.handleStudentLogin();
        });
        this._addEventListener('#studentBirth', 'keypress', (e) => {
            if (e.key === 'Enter') this.handleStudentLogin();
        });

        // 관리자 로그인 폼
        this._addEventListener('#adminCode', 'keypress', (e) => {
            if (e.key === 'Enter') this.handleAdminLogin();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + L : 빠른 로그아웃
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                if (this.isAuthenticated()) {
                    this.handleLogout();
                }
            }
            
            // Ctrl + Shift + D : 개발 모드 빠른 로그인 (개발환경만)
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                if (window.CONFIG?.DEV?.DEBUG) {
                    this.showQuickLoginDialog();
                }
            }
        });
    }

    setupRealtimeListeners() {
        // Supabase 실시간 이벤트 리스너
        if (typeof window !== 'undefined') {
            window.addEventListener('supabase_user_authenticated', (e) => {
                this.handleRealtimeAuthEvent('authenticated', e.detail);
            });
            
            window.addEventListener('supabase_admin_authenticated', (e) => {
                this.handleRealtimeAuthEvent('admin_authenticated', e.detail);
            });
            
            window.addEventListener('supabase_user_logout', (e) => {
                this.handleRealtimeAuthEvent('logout', e.detail);
            });
        }
    }

    // ===================
    // 탭 관리
    // ===================

    initializeTabs() {
        this.switchToStudentLogin();
    }

    switchToStudentLogin() {
        this._updateTabState('student');
        this._focusFirstInput('#studentName');
    }

    switchToAdminLogin() {
        this._updateTabState('admin');
        this._focusFirstInput('#adminCode');
    }

    _updateTabState(type) {
        // 탭 버튼 상태
        const studentTab = document.getElementById('studentTab');
        const adminTab = document.getElementById('adminTab');
        const studentForm = document.getElementById('studentLogin');
        const adminForm = document.getElementById('adminLogin');
        
        if (type === 'student') {
            studentTab?.classList.add('active');
            adminTab?.classList.remove('active');
            studentForm?.classList.add('active');
            adminForm?.classList.remove('active');
        } else {
            adminTab?.classList.add('active');
            studentTab?.classList.remove('active');
            adminForm?.classList.add('active');
            studentForm?.classList.remove('active');
        }
    }

    _focusFirstInput(selector) {
        setTimeout(() => {
            const input = document.querySelector(selector);
            if (input) input.focus();
        }, 100);
    }

    // ===================
    // 로그인 처리
    // ===================

    async handleStudentLogin() {
        const name = this._getInputValue('#studentName');
        const birthDate = this._getInputValue('#studentBirth');

        // 입력 검증
        if (!this._validateStudentInput(name, birthDate)) return;
        
        // 보안 검사
        if (!this._checkSecurityConstraints('student', name)) return;

        // 로딩 상태
        const loginBtn = document.getElementById('studentLoginBtn');
        this._showLoading(loginBtn);

        try {
            this._logSecurityEvent('student_login_attempt', { name });
            
            const result = await SupabaseAPI.authenticateStudent(name, birthDate);
            
            if (result.success && result.data) {
                this._logSecurityEvent('student_login_success', { name, userId: result.data.id });
                this._clearLoginAttempts('student', name);
                await this.loginSuccess('student', result.data);
            } else {
                this._recordFailedAttempt('student', name);
                this._hideLoading(loginBtn);
                
                const remainingAttempts = this._getRemainingAttempts('student', name);
                let message = result.message || '학생 정보를 찾을 수 없습니다.\\n이름과 생년월일을 다시 확인해주세요.';
                
                if (remainingAttempts <= 2) {
                    message += `\\n\\n⚠️ 남은 시도 횟수: ${remainingAttempts}회`;
                }
                
                Utils.showAlert(message);
            }
        } catch (error) {
            console.error('❌ 학생 로그인 오류:', error);
            this._hideLoading(loginBtn);
            this._recordFailedAttempt('student', name);
            Utils.showAlert('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    }

    async handleAdminLogin() {
        const code = this._getInputValue('#adminCode');

        // 입력 검증
        if (!this._validateAdminInput(code)) return;
        
        // 보안 검사
        if (!this._checkSecurityConstraints('admin', code)) return;

        // 로딩 상태
        const loginBtn = document.getElementById('adminLoginBtn');
        this._showLoading(loginBtn);

        try {
            this._logSecurityEvent('admin_login_attempt', { code: '***' });
            
            const result = await SupabaseAPI.authenticateAdmin(code);
            
            if (result.success && result.user) {
                this._logSecurityEvent('admin_login_success', { userId: result.user.id });
                this._clearLoginAttempts('admin', code);
                await this.loginSuccess('admin', result.user);
            } else {
                this._recordFailedAttempt('admin', code);
                this._hideLoading(loginBtn);
                
                const remainingAttempts = this._getRemainingAttempts('admin', code);
                let message = result.message || '관리자 코드가 올바르지 않습니다.';
                
                if (remainingAttempts <= 2) {
                    message += `\\n\\n⚠️ 남은 시도 횟수: ${remainingAttempts}회`;
                }
                
                Utils.showAlert(message);
            }
        } catch (error) {
            console.error('❌ 관리자 로그인 오류:', error);
            this._hideLoading(loginBtn);
            this._recordFailedAttempt('admin', code);
            Utils.showAlert('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    }

    // ===================
    // 로그인 성공 처리
    // ===================

    async loginSuccess(userType, user) {
        try {
            console.log('✅ 로그인 성공:', { userType, user });
            
            if (!user) {
                console.error('❌ 사용자 정보가 없습니다');
                Utils.showAlert('로그인 처리 중 오류가 발생했습니다.');
                return;
            }
            
            // 폼 초기화
            this.clearLoginForms();

            // 세션 설정
            this._createSession(userType, user);
            
            // 성공 메시지
            const userName = user.name || user.user_name || user.full_name || '사용자';
            this._showWelcomeMessage(userName);

            // 페이지 리다이렉션
            if (userType === 'student') {
                await this.safeRedirectStudent(user.id);
            } else if (userType === 'admin') {
                this._redirectToAdmin();
            }
            
            // 로그인 성공 이벤트 발생
            this._dispatchEvent('login_success', { userType, user });
            
        } catch (error) {
            console.error('❌ 로그인 성공 처리 오류:', error);
            Utils.showAlert('로그인 후 페이지 이동 중 오류가 발생했습니다.');
        }
    }

    // ===================
    // 학생 리다이렉션 처리
    // ===================

    async safeRedirectStudent(studentId) {
        try {
            console.log('📋 학생 수업계획 상태 확인 시작:', studentId);
            
            this.clearAllNotices();
            
            // 수업계획 상태 확인
            const lessonPlan = await this.quietlyCheckLessonPlan(studentId);
            const redirectInfo = this._determineLessonPlanRedirect(lessonPlan);
            
            // 페이지 이동 실행
            setTimeout(() => {
                if (redirectInfo.goToDashboard) {
                    this._redirectToStudentDashboard();
                } else if (redirectInfo.goToLessonPlan) {
                    this._redirectToLessonPlan();
                    this.showLessonPlanGuidance(redirectInfo.guidanceType, lessonPlan);
                }
            }, 1000);
            
        } catch (error) {
            console.warn('⚠️ 수업계획 상태 확인 오류:', error);
            setTimeout(() => this._redirectToStudentDashboard(), 1000);
        }
    }

    _determineLessonPlanRedirect(lessonPlan) {
        if (!lessonPlan) {
            return { goToLessonPlan: true, guidanceType: 'new' };
        }
        
        switch (lessonPlan.status) {
            case 'draft':
                return { goToLessonPlan: true, guidanceType: 'continue' };
            case 'submitted':
            case 'approved':
                return { goToDashboard: true };
            case 'rejected':
                return { goToLessonPlan: true, guidanceType: 'rejected' };
            default:
                return { goToDashboard: true };
        }
    }

    async quietlyCheckLessonPlan(studentId) {
        try {
            return await SupabaseAPI.getStudentLessonPlan(studentId);
        } catch (error) {
            console.warn('⚠️ 수업계획 조회 실패:', error);
            return null;
        }
    }

    // ===================
    // 안내 메시지 시스템
    // ===================

    showLessonPlanGuidance(type = 'new', lessonPlan = null) {
        try {
            this.clearAllNotices();
            
            const guidance = document.createElement('div');
            guidance.className = 'lesson-plan-guidance-overlay';
            guidance.innerHTML = this._getGuidanceContent(type, lessonPlan);
            
            document.body.appendChild(guidance);
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 자동 제거
            setTimeout(() => {
                if (guidance.parentNode) {
                    guidance.parentNode.removeChild(guidance);
                }
            }, 7000);
            
        } catch (error) {
            console.error('안내 메시지 표시 오류:', error);
        }
    }

    _getGuidanceContent(type, lessonPlan) {
        const contents = {
            'new': {
                icon: 'calendar-plus',
                color: '#4f46e5',
                title: '수업계획 작성이 필요합니다',
                message: '파견 기간 동안의 수업계획을 먼저 작성해주세요.<br><strong>수업계획은 필수 제출 사항</strong>이며, 완료 후 교구 신청이 가능합니다.',
                buttonText: '시작하기',
                buttonClass: 'primary'
            },
            'continue': {
                icon: 'edit',
                color: '#f59e0b',
                title: '수업계획을 완료해주세요',
                message: '임시저장된 수업계획이 있습니다.<br>수업계획 완료 후 교구 신청이 가능합니다.',
                buttonText: '계속 작성하기',
                buttonClass: 'primary'
            },
            'rejected': {
                icon: 'alert-triangle',
                color: '#ef4444',
                title: '수업계획이 반려되었습니다',
                message: `<strong>반려 사유:</strong> ${lessonPlan?.rejection_reason || '사유 없음'}<br>수업계획을 수정하여 다시 제출해주세요.`,
                buttonText: '수정하기',
                buttonClass: 'danger'
            }
        };
        
        const content = contents[type] || contents['new'];
        
        return `
            <div class="guidance-content">
                <div class="guidance-icon">
                    <i data-lucide="${content.icon}" style="width: 3rem; height: 3rem; color: ${content.color};"></i>
                </div>
                <h3>${content.title}</h3>
                <p>${content.message}</p>
                <button class="btn ${content.buttonClass}" onclick="this.parentElement.parentElement.remove()">
                    ${content.buttonText}
                </button>
            </div>
        `;
    }

    _showWelcomeMessage(userName) {
        // 임시 환영 토스트 메시지
        const toast = document.createElement('div');
        toast.className = 'welcome-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <i data-lucide="check-circle" style="color: #10b981;"></i>
                <span>환영합니다, ${userName}님!</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    clearAllNotices() {
        try {
            const selectors = [
                '.lesson-plan-required-notice',
                '.lesson-plan-draft-notice', 
                '.lesson-plan-guidance-overlay',
                '.dashboard-notice',
                '.welcome-toast'
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                });
            });
        } catch (error) {
            console.error('알림 제거 오류:', error);
        }
    }

    // ===================
    // 로그아웃 처리
    // ===================

    handleLogout() {
        if (!Utils.showConfirm('정말로 로그아웃하시겠습니까?')) {
            return;
        }

        try {
            this._logSecurityEvent('logout', { 
                userId: SupabaseAPI.currentUser?.id,
                userType: SupabaseAPI.currentUserType 
            });
            
            // Supabase 로그아웃
            SupabaseAPI.logout();
            
            // 세션 정리
            this._clearSession();
            
            // UI 정리
            this.clearAllNotices();
            this.clearLoginForms();
            
            // 타이머 정리
            this._clearAutoLogoutTimer();
            
            // 로그인 페이지로 이동
            App.showPage('loginPage');
            this._focusFirstInput('#studentName');
            
            // 로그아웃 이벤트 발생
            this._dispatchEvent('logout_success', {});
            
            console.log('✅ 로그아웃 완료');
        } catch (error) {
            console.error('로그아웃 처리 오류:', error);
        }
    }

    // ===================
    // 보안 시스템
    // ===================

    _checkSecurityConstraints(type, identifier) {
        const key = `${type}_${identifier}`;
        const attempts = this.loginAttempts.get(key);
        
        if (!attempts) return true;
        
        const now = Date.now();
        const timeSinceLastAttempt = now - attempts.lastAttempt;
        
        // 계정 잠금 상태 확인
        if (attempts.count >= this.maxLoginAttempts) {
            if (timeSinceLastAttempt < this.lockoutDuration) {
                const remainingTime = Math.ceil((this.lockoutDuration - timeSinceLastAttempt) / 60000);
                Utils.showAlert(`보안을 위해 계정이 일시적으로 잠겼습니다.\\n${remainingTime}분 후 다시 시도해주세요.`);
                return false;
            } else {
                // 잠금 해제
                this._clearLoginAttempts(type, identifier);
                return true;
            }
        }
        
        return true;
    }

    _recordFailedAttempt(type, identifier) {
        const key = `${type}_${identifier}`;
        const existing = this.loginAttempts.get(key) || { count: 0, lastAttempt: 0 };
        
        existing.count++;
        existing.lastAttempt = Date.now();
        
        this.loginAttempts.set(key, existing);
        
        this._logSecurityEvent('failed_login_attempt', {
            type,
            identifier: type === 'admin' ? '***' : identifier,
            attemptCount: existing.count
        });
    }

    _clearLoginAttempts(type, identifier) {
        const key = `${type}_${identifier}`;
        this.loginAttempts.delete(key);
    }

    _getRemainingAttempts(type, identifier) {
        const key = `${type}_${identifier}`;
        const attempts = this.loginAttempts.get(key);
        return this.maxLoginAttempts - (attempts?.count || 0);
    }

    _logSecurityEvent(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            userAgent: navigator.userAgent,
            ip: 'unknown' // 클라이언트에서는 실제 IP를 알 수 없음
        };
        
        this.securityLog.push(logEntry);
        
        // 로그 크기 제한 (최근 100개만 보관)
        if (this.securityLog.length > 100) {
            this.securityLog.shift();
        }
        
        // 개발 모드에서만 콘솔 출력
        if (window.CONFIG?.DEV?.DEBUG) {
            console.log('🔒 Security Event:', logEntry);
        }
    }

    // ===================
    // 세션 관리
    // ===================

    _createSession(userType, user) {
        const session = {
            user,
            userType,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            sessionId: this._generateSessionId()
        };
        
        this.sessionStorage.set('current', session);
        this.saveSession();
        this._startAutoLogoutTimer();
        
        this._logSecurityEvent('session_created', {
            userId: user.id,
            userType,
            sessionId: session.sessionId
        });
    }

    _clearSession() {
        this.sessionStorage.clear();
        this._clearStoredSession();
        this._clearAutoLogoutTimer();
    }

    saveSession() {
        try {
            const session = this.sessionStorage.get('current');
            if (session) {
                sessionStorage.setItem('authSession', JSON.stringify(session));
            }
        } catch (error) {
            console.error('세션 저장 오류:', error);
        }
    }

    restoreSession() {
        try {
            const stored = sessionStorage.getItem('authSession');
            if (!stored) return false;
            
            const session = JSON.parse(stored);
            const now = Date.now();
            const sessionAge = now - session.createdAt;
            
            // 세션 유효성 검사
            if (sessionAge > this.sessionTimeout) {
                this._clearStoredSession();
                return false;
            }
            
            // 세션 복원
            this.sessionStorage.set('current', session);
            SupabaseAPI.currentUser = session.user;
            SupabaseAPI.currentUserType = session.userType;
            
            // 자동 로그아웃 타이머 재설정
            this._startAutoLogoutTimer();
            
            console.log('✅ 세션 복원됨');
            return true;
            
        } catch (error) {
            console.error('세션 복원 실패:', error);
            this._clearStoredSession();
            return false;
        }
    }

    _clearStoredSession() {
        try {
            sessionStorage.removeItem('authSession');
        } catch (error) {
            console.error('저장된 세션 정리 오류:', error);
        }
    }

    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ===================
    // 자동 로그아웃 타이머
    // ===================

    _startAutoLogoutTimer() {
        this._clearAutoLogoutTimer();
        
        this.autoLogoutTimer = setTimeout(() => {
            if (this.isAuthenticated()) {
                Utils.showAlert('보안을 위해 자동으로 로그아웃됩니다.');
                this.handleLogout();
            }
        }, this.sessionTimeout);
    }

    _clearAutoLogoutTimer() {
        if (this.autoLogoutTimer) {
            clearTimeout(this.autoLogoutTimer);
            this.autoLogoutTimer = null;
        }
    }

    _updateLastActivity() {
        const session = this.sessionStorage.get('current');
        if (session) {
            session.lastActivity = Date.now();
            this.sessionStorage.set('current', session);
            this._startAutoLogoutTimer(); // 타이머 재설정
        }
    }

    startSessionChecker() {
        // 1분마다 세션 활동 상태 체크
        this.sessionCheckerInterval = setInterval(() => {
            if (this.isAuthenticated()) {
                this._updateLastActivity();
            }
        }, 60000);
    }

    // ===================
    // 실시간 이벤트 처리
    // ===================

    handleRealtimeAuthEvent(eventType, data) {
        switch (eventType) {
            case 'authenticated':
                console.log('🔔 실시간 인증 이벤트:', data);
                break;
            case 'admin_authenticated':
                console.log('🔔 관리자 인증 이벤트:', data);
                break;
            case 'logout':
                console.log('🔔 로그아웃 이벤트:', data);
                break;
        }
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'visible' && this.isAuthenticated()) {
            this._updateLastActivity();
        }
    }

    // ===================
    // 개발자 도구
    // ===================

    showQuickLoginDialog() {
        if (!window.CONFIG?.DEV?.DEBUG) return;
        
        const dialog = document.createElement('div');
        dialog.className = 'quick-login-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>🚀 개발자 빠른 로그인</h3>
                <button onclick="window.dev.quickLogin('student')" class="btn primary">학생 로그인</button>
                <button onclick="window.dev.quickLogin('admin')" class="btn secondary">관리자 로그인</button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn danger">취소</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        }, 10000);
    }

    // ===================
    // 페이지 리다이렉션
    // ===================

    _redirectToStudentDashboard() {
        console.log('🏠 학생 대시보드로 이동');
        App.showPage('studentPage');
        if (window.StudentManager) {
            StudentManager.init();
        }
    }

    _redirectToLessonPlan() {
        console.log('📋 수업계획 페이지로 이동');
        App.showPage('lessonPlanPage');
        if (window.LessonPlanManager) {
            LessonPlanManager.showLessonPlanPage();
        }
    }

    _redirectToAdmin() {
        setTimeout(() => {
            App.showPage('adminPage');
            if (window.AdminManager) {
                AdminManager.init();
            }
        }, 1000);
    }

    // ===================
    // 유틸리티 함수들
    // ===================

    _addEventListener(selector, event, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    _getInputValue(selector) {
        const element = document.querySelector(selector);
        return element ? element.value.trim() : '';
    }

    _validateStudentInput(name, birthDate) {
        if (!Utils.validateRequired(name, '이름')) return false;
        if (!Utils.validateRequired(birthDate, '생년월일')) return false;
        return true;
    }

    _validateAdminInput(code) {
        if (!Utils.validateRequired(code, '관리자 코드')) return false;
        return true;
    }

    _showLoading(element) {
        if (element && typeof Utils !== 'undefined') {
            Utils.showLoading(element);
        }
    }

    _hideLoading(element) {
        if (element && typeof Utils !== 'undefined') {
            Utils.hideLoading(element);
        }
    }

    _dispatchEvent(type, detail = {}) {
        const event = new CustomEvent(`auth_${type}`, { detail });
        this.eventBus.dispatchEvent(event);
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(event);
        }
    }

    // ===================
    // 공개 API
    // ===================

    // 현재 사용자 정보 표시 업데이트
    async updateUserDisplay() {
        try {
            const user = SupabaseAPI.currentUser;
            const userType = SupabaseAPI.currentUserType;

            if (userType === 'student' && user) {
                const welcomeEl = document.getElementById('studentWelcome');
                const detailsEl = document.getElementById('studentDetails');
                
                if (welcomeEl) {
                    const userName = user.name || user.user_name || user.full_name || '사용자';
                    welcomeEl.textContent = `안녕하세요, ${userName}님!`;
                }
                
                if (detailsEl) {
                    const instituteName = user.sejong_institute || '세종학당';
                    const field = user.field || '전문분야';
                    
                    try {
                        const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(user.id);
                        const budgetLimit = budgetStatus ? budgetStatus.allocated : 0;
                        detailsEl.textContent = `${instituteName} • ${field} • 배정예산: ${Utils.formatPrice(budgetLimit)}`;
                    } catch (error) {
                        detailsEl.textContent = `${instituteName} • ${field}`;
                    }
                }
            }
        } catch (error) {
            console.error('사용자 정보 표시 업데이트 오류:', error);
        }
    }

    // 폼 초기화
    clearLoginForms() {
        try {
            const inputs = ['#studentName', '#studentBirth', '#adminCode'];
            inputs.forEach(selector => {
                const input = document.querySelector(selector);
                if (input) input.value = '';
            });
            
            // 로딩 상태 해제
            this._hideLoading(document.getElementById('studentLoginBtn'));
            this._hideLoading(document.getElementById('adminLoginBtn'));
        } catch (error) {
            console.error('폼 초기화 오류:', error);
        }
    }

    // 인증 상태 확인
    isAuthenticated() {
        return SupabaseAPI.currentUser !== null;
    }

    getUserType() {
        return SupabaseAPI.currentUserType;
    }

    getCurrentUser() {
        return SupabaseAPI.currentUser;
    }

    getCurrentUserId() {
        return this.getCurrentUser()?.id || null;
    }

    hasPermission(requiredType) {
        return this.isAuthenticated() && this.getUserType() === requiredType;
    }

    isStudent() {
        return this.getUserType() === 'student';
    }

    isAdmin() {
        return this.getUserType() === 'admin';
    }

    // 이벤트 리스너 관리
    addEventListener(type, callback) {
        this.eventBus.addEventListener(type, callback);
    }

    removeEventListener(type, callback) {
        this.eventBus.removeEventListener(type, callback);
    }

    // 보안 통계
    getSecurityStats() {
        return {
            totalEvents: this.securityLog.length,
            recentEvents: this.securityLog.slice(-10),
            activeAttempts: this.loginAttempts.size,
            sessionInfo: this.sessionStorage.get('current')
        };
    }

    // 정리 함수
    destroy() {
        this._clearAutoLogoutTimer();
        
        if (this.sessionCheckerInterval) {
            clearInterval(this.sessionCheckerInterval);
        }
        
        this.sessionStorage.clear();
        this.loginAttempts.clear();
        this.securityLog.length = 0;
        
        console.log('✅ AuthManager 정리 완료');
    }
}

// 싱글톤 인스턴스 생성
const authManager = new AuthManager();

// 전역 접근
if (typeof window !== 'undefined') {
    window.AuthManager = authManager;
}

console.log('✅ AuthManager v3.0 로드됨 (통합 보안 강화 버전)');