// 인증 관리 모듈 (Supabase 연동) - 간소화된 안정적 버전
// intern-announcement 방식 기반으로 안정성 확보
const AuthManager = {
    // 초기화 - 간소화된 버전
    async init() {
        try {
            console.log('🔐 AuthManager 초기화 시작');
            
            this.setupEventListeners();
            this.initializeTabs();
            
            // 간단한 세션 확인
            await this.checkExistingSession();
            
            console.log('✅ AuthManager 초기화 완료');
        } catch (error) {
            console.error('❌ AuthManager 초기화 오류:', error);
            this.showAlert('인증 시스템 초기화 중 문제가 발생했습니다.', 'error');
        }
    },

    // 기존 세션 확인 - 간소화된 버전
    async checkExistingSession() {
        try {
            console.log('🔍 기존 세션 확인 시작');
            
            const sessionData = this.getStoredSession();
            if (!sessionData || !this.isSessionValid(sessionData)) {
                console.log('📭 유효한 세션이 없습니다.');
                return false;
            }

            console.log('📦 유효한 세션 발견:', sessionData.user?.name);

            // SupabaseAPI 간단 대기 (최대 5초)
            if (!window.SupabaseAPI) {
                await this.waitForSupabaseAPI(5000);
            }

            // 인증 상태 복원
            this.restoreAuthenticationState(sessionData);

            // 적절한 페이지로 리다이렉트
            await this.redirectToUserPage(sessionData.userType, sessionData.user);

            console.log('✅ 세션 복원 완료');
            this.showAlert(`환영합니다, ${sessionData.user.name}님!`, 'success');
            return true;

        } catch (error) {
            console.error('❌ 세션 확인 중 오류:', error);
            this.clearStoredSession();
            return false;
        }
    },

    // 저장된 세션 조회 - 간소화된 버전
    getStoredSession() {
        try {
            const sessionData = sessionStorage.getItem('userSession');
            if (!sessionData) return null;

            const parsed = JSON.parse(sessionData);
            
            // 기본 구조 검증
            if (!parsed?.user?.id || !parsed?.user?.name || !parsed?.userType) {
                return null;
            }

            return parsed;
        } catch (error) {
            console.warn('⚠️ 세션 데이터 파싱 오류:', error);
            this.clearStoredSession();
            return null;
        }
    },

    // 세션 유효성 확인 - 간소화된 버전 (24시간)
    isSessionValid(sessionData) {
        try {
            if (!sessionData?.loginTime) return false;

            const loginTime = new Date(sessionData.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            return hoursDiff < 24;
        } catch (error) {
            return false;
        }
    },

    // SupabaseAPI 로드 대기 - 간소화된 버전
    async waitForSupabaseAPI(maxWaitTime = 5000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const checkAPI = setInterval(() => {
                if (window.SupabaseAPI) {
                    clearInterval(checkAPI);
                    console.log('✅ SupabaseAPI 준비됨');
                    resolve(true);
                } else if (Date.now() - startTime > maxWaitTime) {
                    clearInterval(checkAPI);
                    console.warn('⚠️ SupabaseAPI 로딩 타임아웃');
                    resolve(false); // 실패해도 계속 진행
                }
            }, 100);
        });
    },

    // 인증 상태 복원 - 간소화된 버전
    restoreAuthenticationState(sessionData) {
        try {
            if (window.SupabaseAPI) {
                window.SupabaseAPI.currentUser = sessionData.user;
                window.SupabaseAPI.currentUserType = sessionData.userType;
            }
            console.log('✅ 인증 상태 복원 완료');
        } catch (error) {
            console.error('❌ 인증 상태 복원 오류:', error);
        }
    },

    // 사용자 페이지로 리다이렉트 - 수정된 버전 (실제 페이지 이동)
    async redirectToUserPage(userType, user) {
        try {
            console.log('🔀 페이지 리다이렉트:', userType);

            setTimeout(async () => {
                if (userType === 'student') {
                    await this.safeRedirectStudent(user.id);
                } else if (userType === 'admin') {
                    this.redirectToAdminPage();
                }
            }, 500);
            
        } catch (error) {
            console.error('❌ 페이지 리다이렉트 오류:', error);
        }
    },

    // 저장된 세션 삭제
    clearStoredSession() {
        try {
            sessionStorage.removeItem('userSession');
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
            console.log('🗑️ 세션 삭제 완료');
        } catch (error) {
            console.warn('⚠️ 세션 삭제 오류:', error);
        }
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        try {
            // 🔧 학생 로그인 이벤트는 index.html에서 처리하므로 제거
            // this.safeAddEventListener('#studentLoginBtn', 'click', () => this.handleStudentLogin());

            // 관리자 로그인만 유지
            this.safeAddEventListener('#adminLoginBtn', 'click', () => this.handleAdminLogin());

            // 🔧 학생 Enter 키 이벤트도 제거 (index.html에서 처리)
            // this.safeAddEventListener('#studentBirth', 'keypress', (e) => {
            //     if (e.key === 'Enter') this.handleStudentLogin();
            // });

            // 관리자 Enter 키만 유지
            this.safeAddEventListener('#adminCode', 'keypress', (e) => {
                if (e.key === 'Enter') this.handleAdminLogin();
            });
        } catch (error) {
            console.error('이벤트 리스너 설정 오류:', error);
        }
    },

    // 안전한 이벤트 리스너 추가
    safeAddEventListener(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element && typeof handler === 'function') {
                element.addEventListener(event, handler);
            }
        } catch (error) {
            console.error(`이벤트 리스너 추가 오류 (${selector}):`, error);
        }
    },

    // Enter 키 이벤트 설정
    setupEnterKeyEvents() {
        try {
            this.safeAddEventListener('#studentName', 'keypress', (e) => {
                if (e.key === 'Enter') this.handleStudentLogin();
            });
            this.safeAddEventListener('#studentBirth', 'keypress', (e) => {
                if (e.key === 'Enter') this.handleStudentLogin();
            });
            this.safeAddEventListener('#adminCode', 'keypress', (e) => {
                if (e.key === 'Enter') this.handleAdminLogin();
            });
        } catch (error) {
            console.error('Enter 키 이벤트 설정 오류:', error);
        }
    },

    // 탭 초기화
    initializeTabs() {
        try {
            this.switchToStudentLogin();
        } catch (error) {
            console.error('탭 초기화 오류:', error);
        }
    },

    // 학생 로그인 탭으로 전환
    switchToStudentLogin() {
        try {
            const studentTab = document.getElementById('studentTab');
            const adminTab = document.getElementById('adminTab');
            const studentLogin = document.getElementById('studentLogin');
            const adminLogin = document.getElementById('adminLogin');
            
            if (studentTab) studentTab.classList.add('active');
            if (adminTab) adminTab.classList.remove('active');
            if (studentLogin) studentLogin.classList.add('active');
            if (adminLogin) adminLogin.classList.remove('active');

            setTimeout(() => {
                const studentNameInput = document.getElementById('studentName');
                if (studentNameInput) studentNameInput.focus();
            }, 100);
        } catch (error) {
            console.error('학생 로그인 탭 전환 오류:', error);
        }
    },

    // 관리자 로그인 탭으로 전환
    switchToAdminLogin() {
        try {
            const adminTab = document.getElementById('adminTab');
            const studentTab = document.getElementById('studentTab');
            const adminLogin = document.getElementById('adminLogin');
            const studentLogin = document.getElementById('studentLogin');
            
            if (adminTab) adminTab.classList.add('active');
            if (studentTab) studentTab.classList.remove('active');
            if (adminLogin) adminLogin.classList.add('active');
            if (studentLogin) studentLogin.classList.remove('active');

            setTimeout(() => {
                const adminCodeInput = document.getElementById('adminCode');
                if (adminCodeInput) adminCodeInput.focus();
            }, 100);
        } catch (error) {
            console.error('관리자 로그인 탭 전환 오류:', error);
        }
    },

    // 학생 로그인 처리 - 간소화된 버전
    async handleStudentLogin() {
        try {
            const nameInput = document.getElementById('studentName');
            const birthInput = document.getElementById('studentBirth');
            
            if (!nameInput || !birthInput) {
                this.showAlert('로그인 폼에 문제가 있습니다.', 'error');
                return;
            }

            const name = nameInput.value.trim();
            const birthDate = birthInput.value;

            if (!name) {
                this.showAlert('이름을 입력해주세요.', 'warning');
                nameInput.focus();
                return;
            }

            if (!birthDate) {
                this.showAlert('생년월일을 선택해주세요.', 'warning');
                birthInput.focus();
                return;
            }

            // 로딩 상태 표시
            const loginBtn = document.getElementById('studentLoginBtn');
            this.showLoading(loginBtn);

            try {
                // SupabaseAPI 대기
                if (!window.SupabaseAPI) {
                    await this.waitForSupabaseAPI(5000);
                }

                if (!window.SupabaseAPI) {
                    throw new Error('인증 서비스를 사용할 수 없습니다.');
                }

                const result = await window.SupabaseAPI.authenticateStudent(name, birthDate);
                
                if (result && result.success && result.data) {
                    this.loginSuccess('student', result.data);
                } else {
                    this.hideLoading(loginBtn);
                    const message = result?.message || '입력하신 정보와 일치하는 학생을 찾을 수 없습니다.';
                    this.showAlert(message, 'warning');
                }
            } catch (error) {
                console.error('학생 인증 오류:', error);
                this.hideLoading(loginBtn);
                
                if (error.message?.includes('네트워크') || error.message?.includes('fetch')) {
                    this.showAlert('네트워크 연결을 확인하고 다시 시도해주세요.', 'error');
                } else {
                    this.showAlert('로그인 처리 중 오류가 발생했습니다.', 'error');
                }
            }
        } catch (error) {
            console.error('학생 로그인 오류:', error);
            this.showAlert('로그인 처리 중 문제가 발생했습니다.', 'error');
        }
    },

    // 관리자 로그인 처리 - 간소화된 버전
    async handleAdminLogin() {
        try {
            const codeInput = document.getElementById('adminCode');
            
            if (!codeInput) {
                this.showAlert('로그인 폼에 문제가 있습니다.', 'error');
                return;
            }

            const code = codeInput.value.trim();

            if (!code) {
                this.showAlert('관리자 코드를 입력해주세요.', 'warning');
                codeInput.focus();
                return;
            }

            // 로딩 상태 표시
            const loginBtn = document.getElementById('adminLoginBtn');
            this.showLoading(loginBtn);

            try {
                // SupabaseAPI 대기
                if (!window.SupabaseAPI) {
                    await this.waitForSupabaseAPI(5000);
                }

                if (!window.SupabaseAPI) {
                    throw new Error('인증 서비스를 사용할 수 없습니다.');
                }

                const result = await window.SupabaseAPI.authenticateAdmin(code);
                
                if (result && result.success && result.data) {
                    this.loginSuccess('admin', result.data);
                } else {
                    this.hideLoading(loginBtn);
                    const message = result?.message || '관리자 코드가 일치하지 않습니다.';
                    this.showAlert(message, 'warning');
                }
            } catch (error) {
                console.error('관리자 인증 오류:', error);
                this.hideLoading(loginBtn);
                
                if (error.message?.includes('네트워크') || error.message?.includes('fetch')) {
                    this.showAlert('네트워크 연결을 확인하고 다시 시도해주세요.', 'error');
                } else {
                    this.showAlert('관리자 인증 처리 중 오류가 발생했습니다.', 'error');
                }
            }
        } catch (error) {
            console.error('관리자 로그인 오류:', error);
            this.showAlert('관리자 로그인 처리 중 문제가 발생했습니다.', 'error');
        }
    },

    // 로그인 성공 처리 - 수정된 버전 (실제 페이지 이동)
    async loginSuccess(userType, user) {
        try {
            console.log('✅ 로그인 성공:', { userType, user: user.name });
            
            // 세션 저장
            this.saveSession(userType, user);
            
            // 입력 필드 초기화
            this.clearLoginForms();

            // 성공 메시지 표시
            this.showAlert(`환영합니다, ${user.name}님!`, 'success');

            // 페이지 이동 - 실제 페이지로 리다이렉트
            setTimeout(() => {
                if (userType === 'student') {
                    // 학생 대시보드로 직접 이동
                    window.location.href = 'student/dashboard.html';
                } else if (userType === 'admin') {
                    // 관리자 페이지로 직접 이동
                    window.location.href = 'admin.html';
                }
            }, 1000);
        } catch (error) {
            console.error('로그인 성공 처리 오류:', error);
        }
    },

    // 세션 저장
    saveSession(userType, user) {
        try {
            const sessionData = {
                user: user,
                userType: userType,
                loginTime: new Date().toISOString()
            };
            
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
            
            // 호환성을 위한 추가 저장 (학생용)
            if (userType === 'student') {
                localStorage.setItem('currentStudent', JSON.stringify(user));
                localStorage.setItem('studentSession', 'true');
            }
            
            console.log('✅ 세션 저장 완료');
            return true;
        } catch (error) {
            console.warn('⚠️ 세션 저장 실패:', error);
            return false;
        }
    },

    // 관리자 페이지로 리다이렉션 - 수정된 버전
    redirectToAdminPage() {
        try {
            console.log('🔀 관리자 페이지로 이동');
            
            // SPA 방식이 아닌 실제 페이지 이동
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                window.location.href = 'admin.html';
            } else {
                // 이미 다른 페이지에 있는 경우에는 SPA 방식 시도
                if (window.App && window.App.showPage) {
                    window.App.showPage('adminPage');
                    
                    setTimeout(() => {
                        if (window.AdminManager && window.AdminManager.init) {
                            window.AdminManager.init();
                        }
                    }, 200);
                } else {
                    // SPA가 없으면 직접 이동
                    window.location.href = 'admin.html';
                }
            }
        } catch (error) {
            console.error('관리자 페이지 리다이렉션 오류:', error);
            // 오류 시 직접 이동
            window.location.href = 'admin.html';
        }
    },

    // 안전한 학생 리다이렉션 처리 - 수정된 버전 (실제 페이지 이동)
    async safeRedirectStudent(studentId) {
        try {
            console.log('🔄 학생 페이지 리다이렉션 처리');
            
            // 실제 페이지 이동 방식으로 수정
            // 수업계획 상태 확인 로직은 제거하고 바로 대시보드로 이동
            console.log('📍 학생 대시보드로 이동');
            
            // 현재 페이지가 index.html인 경우만 페이지 이동
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                window.location.href = 'student/dashboard.html';
            } else {
                // 이미 다른 페이지에 있는 경우에는 SPA 방식 시도
                if (window.App && window.App.showPage) {
                    window.App.showPage('studentPage');
                    
                    setTimeout(() => {
                        if (window.StudentManager && window.StudentManager.init) {
                            window.StudentManager.init();
                        }
                    }, 200);
                } else {
                    // SPA가 없으면 직접 이동
                    window.location.href = 'student/dashboard.html';
                }
            }
        } catch (error) {
            console.warn('학생 리다이렉션 처리 중 오류:', error);
            // 오류 시 기본적으로 학생 대시보드로 이동
            window.location.href = 'student/dashboard.html';
        }
    },

    // 수업계획 페이지로 리다이렉션 - 레거시 호환성을 위해 유지
    redirectToLessonPlan() {
        try {
            if (window.App && window.App.showPage) {
                window.App.showPage('lessonPlanPage');
                
                setTimeout(() => {
                    if (window.LessonPlanManager && window.LessonPlanManager.showLessonPlanPage) {
                        window.LessonPlanManager.showLessonPlanPage(false);
                    }
                }, 200);
            }
        } catch (error) {
            console.error('수업계획 페이지 리다이렉션 오류:', error);
        }
    },

    // 학생 대시보드로 리다이렉션 - 레거시 호환성을 위해 유지
    redirectToStudentDashboard() {
        try {
            if (window.App && window.App.showPage) {
                window.App.showPage('studentPage');
                
                setTimeout(() => {
                    if (window.StudentManager && window.StudentManager.init) {
                        window.StudentManager.init();
                    }
                }, 200);
            }
        } catch (error) {
            console.error('학생 대시보드 리다이렉션 오류:', error);
        }
    },

    // 조용한 수업계획 확인
    async quietlyCheckLessonPlan(studentId) {
        try {
            if (!window.SupabaseAPI || !studentId) return null;
            return await window.SupabaseAPI.getStudentLessonPlan(studentId);
        } catch (error) {
            console.warn('수업계획 확인 실패:', error);
            return null;
        }
    },

    // 수업계획 작성 안내
    showLessonPlanGuidance() {
        try {
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
            if (window.lucide) {
                window.lucide.createIcons();
            }
            
            setTimeout(() => {
                if (guidance.parentNode) {
                    guidance.parentNode.removeChild(guidance);
                }
            }, 5000);
        } catch (error) {
            console.error('수업계획 안내 표시 오류:', error);
        }
    },

    // 로그아웃 처리
    handleLogout() {
        try {
            if (this.showConfirm('정말로 로그아웃하시겠습니까?')) {
                // 데이터 정리
                if (window.SupabaseAPI && window.SupabaseAPI.logout) {
                    window.SupabaseAPI.logout();
                }
                
                this.clearStoredSession();
                this.clearLoginForms();
                
                // 로그인 페이지로 이동
                if (window.App && window.App.showPage) {
                    window.App.showPage('loginPage');
                }
                
                setTimeout(() => {
                    const studentNameInput = document.getElementById('studentName');
                    if (studentNameInput) studentNameInput.focus();
                }, 100);

                this.showAlert('로그아웃되었습니다.', 'info');
            }
        } catch (error) {
            console.error('로그아웃 처리 오류:', error);
        }
    },

    // 로그인 폼 초기화
    clearLoginForms() {
        try {
            const elements = ['studentName', 'studentBirth', 'adminCode'];
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = '';
            });
            
            this.hideLoading('#studentLoginBtn');
            this.hideLoading('#adminLoginBtn');
        } catch (error) {
            console.error('로그인 폼 초기화 오류:', error);
        }
    },

    // 현재 사용자 정보 표시 업데이트
    async updateUserDisplay() {
        try {
            if (!window.SupabaseAPI?.currentUser) {
                this.showFallbackUserInfo();
                return;
            }

            const user = window.SupabaseAPI.currentUser;
            const userType = window.SupabaseAPI.currentUserType;

            if (userType === 'student') {
                await this.updateStudentDisplay(user);
            }
        } catch (error) {
            console.error('사용자 정보 표시 업데이트 오류:', error);
            this.showFallbackUserInfo();
        }
    },

    // 학생 정보 표시 업데이트
    async updateStudentDisplay(user) {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            const detailsEl = document.getElementById('studentDetails');
            
            if (welcomeEl) {
                welcomeEl.textContent = `안녕하세요, ${user.name}님!`;
            }
            
            if (detailsEl) {
                const instituteName = user.sejong_institute || '세종학당';
                const field = user.field || '전문분야';
                
                try {
                    const budgetStatus = await window.SupabaseAPI?.getStudentBudgetStatus?.(user.id);
                    const budgetLimit = budgetStatus?.allocated || 0;
                    detailsEl.textContent = `${instituteName} • ${field} • 배정예산: ${this.formatPrice(budgetLimit)}`;
                } catch (budgetError) {
                    detailsEl.textContent = `${instituteName} • ${field}`;
                }
            }
        } catch (error) {
            console.error('학생 정보 표시 오류:', error);
            this.showFallbackUserInfo();
        }
    },

    // 폴백 사용자 정보 표시
    showFallbackUserInfo() {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            const detailsEl = document.getElementById('studentDetails');
            
            if (welcomeEl) welcomeEl.textContent = '안녕하세요!';
            if (detailsEl) detailsEl.textContent = '사용자 정보를 불러오는 중...';
        } catch (error) {
            console.error('폴백 사용자 정보 표시 오류:', error);
        }
    },

    // 유틸리티 함수들
    formatPrice(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    isAuthenticated() {
        try {
            return !!(window.SupabaseAPI?.currentUser);
        } catch (error) {
            return false;
        }
    },

    getUserType() {
        try {
            return window.SupabaseAPI?.currentUserType || null;
        } catch (error) {
            return null;
        }
    },

    getCurrentUser() {
        try {
            return window.SupabaseAPI?.currentUser || null;
        } catch (error) {
            return null;
        }
    },

    getCurrentUserId() {
        try {
            return this.getCurrentUser()?.id || null;
        } catch (error) {
            return null;
        }
    },

    isStudent() {
        return this.getUserType() === 'student';
    },

    isAdmin() {
        return this.getUserType() === 'admin';
    },

    hasPermission(requiredType) {
        return this.isAuthenticated() && this.getUserType() === requiredType;
    },

    showAlert(message, type = 'info') {
        try {
            if (window.Utils && window.Utils.showAlert) {
                window.Utils.showAlert(message, type);
            } else {
                alert(message);
            }
        } catch (error) {
            console.log('Alert:', message);
        }
    },

    showConfirm(message) {
        try {
            return confirm(message);
        } catch (error) {
            return false;
        }
    },

    showLoading(element) {
        try {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            
            if (element) {
                element.disabled = true;
                element.dataset.originalText = element.textContent;
                element.textContent = '처리 중...';
            }
        } catch (error) {
            console.error('로딩 상태 표시 오류:', error);
        }
    },

    hideLoading(element) {
        try {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            
            if (element) {
                element.disabled = false;
                const originalText = element.dataset.originalText;
                if (originalText) {
                    element.textContent = originalText;
                    delete element.dataset.originalText;
                }
            }
        } catch (error) {
            console.error('로딩 상태 해제 오류:', error);
        }
    }
};

// 전역 접근을 위한 window 객체에 추가
window.AuthManager = AuthManager;

console.log('🔐 AuthManager v2.1 loaded - fixed redirect with actual page navigation');
