// 인증 관리 모듈 (Supabase 연동) - 페이지 새로고침 시 로그인 상태 유지 추가
const AuthManager = {
    // 초기화
    init() {
        this.setupEventListeners();
        this.initializeTabs();
        this.checkExistingSession();
    },

    // 기존 세션 확인 - 페이지 새로고침 시 로그인 상태 복원
    async checkExistingSession() {
        try {
            console.log('🔍 기존 세션 확인 시작');
            
            // 세션 스토리지에서 사용자 정보 복원 시도
            const sessionData = this.getStoredSession();
            
            if (!sessionData) {
                console.log('📭 저장된 세션이 없습니다.');
                return false;
            }

            console.log('📦 저장된 세션 발견:', sessionData.userType, sessionData.user?.name);

            // 세션 유효성 확인 (24시간 이내)
            if (!this.isSessionValid(sessionData)) {
                console.log('⏰ 세션이 만료되었습니다.');
                this.clearStoredSession();
                return false;
            }

            // SupabaseAPI가 로드될 때까지 대기
            if (!window.SupabaseAPI) {
                console.log('⏳ SupabaseAPI 로드 대기 중...');
                await this.waitForSupabaseAPI();
            }

            // 데이터베이스에서 사용자 정보 재검증
            const isValid = await this.validateStoredUser(sessionData);
            if (!isValid) {
                console.log('❌ 저장된 사용자 정보가 유효하지 않습니다.');
                this.clearStoredSession();
                return false;
            }

            // 인증 상태 복원
            this.restoreAuthenticationState(sessionData);

            // 적절한 페이지로 리다이렉트
            await this.redirectToUserPage(sessionData.userType, sessionData.user);

            console.log('✅ 세션 복원 완료');
            return true;

        } catch (error) {
            console.error('❌ 세션 확인 중 오류:', error);
            this.clearStoredSession();
            return false;
        }
    },

    // 저장된 세션 조회
    getStoredSession() {
        try {
            const sessionData = sessionStorage.getItem('userSession');
            if (!sessionData) return null;

            const parsed = JSON.parse(sessionData);
            
            // 필수 데이터 검증
            if (!parsed.user || !parsed.userType || !parsed.loginTime) {
                console.warn('⚠️ 세션 데이터가 불완전합니다.');
                return null;
            }

            return parsed;
        } catch (error) {
            console.warn('⚠️ 세션 데이터 파싱 오류:', error);
            return null;
        }
    },

    // 세션 유효성 확인 (24시간)
    isSessionValid(sessionData) {
        try {
            const loginTime = new Date(sessionData.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            return hoursDiff < 24; // 24시간 이내
        } catch (error) {
            console.warn('⚠️ 세션 유효성 확인 오류:', error);
            return false;
        }
    },

    // SupabaseAPI 로드 대기
    async waitForSupabaseAPI(maxWaitTime = 10000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const checkAPI = setInterval(() => {
                if (window.SupabaseAPI) {
                    clearInterval(checkAPI);
                    resolve(true);
                } else if (Date.now() - startTime > maxWaitTime) {
                    clearInterval(checkAPI);
                    reject(new Error('SupabaseAPI 로드 타임아웃'));
                }
            }, 100);
        });
    },

    // 저장된 사용자 정보 검증
    async validateStoredUser(sessionData) {
        try {
            const { user, userType } = sessionData;

            if (userType === 'student') {
                // 학생 정보 재검증
                const result = await SupabaseAPI.authenticateStudent(user.name, user.birth_date);
                return result.success && result.data && result.data.id === user.id;
            } else if (userType === 'admin') {
                // 관리자는 단순히 ID 존재 여부만 확인 (코드 재입력 불필요)
                return user && user.user_type === 'admin';
            }

            return false;
        } catch (error) {
            console.warn('⚠️ 사용자 정보 검증 오류:', error);
            return false;
        }
    },

    // 인증 상태 복원
    restoreAuthenticationState(sessionData) {
        try {
            console.log('🔄 인증 상태 복원:', sessionData.user.name);
            
            // SupabaseAPI에 사용자 정보 설정
            SupabaseAPI.currentUser = sessionData.user;
            SupabaseAPI.currentUserType = sessionData.userType;

            console.log('✅ SupabaseAPI 상태 복원 완료');
        } catch (error) {
            console.error('❌ 인증 상태 복원 오류:', error);
            throw error;
        }
    },

    // 사용자 페이지로 리다이렉트
    async redirectToUserPage(userType, user) {
        try {
            console.log('🔀 페이지 리다이렉트:', userType);

            // 로그인 페이지가 아닌 경우 리다이렉트 생략
            const currentPage = document.querySelector('.page.active');
            if (currentPage && !currentPage.id.includes('loginPage')) {
                console.log('📍 이미 적절한 페이지에 있습니다.');
                return;
            }

            if (userType === 'student') {
                await this.safeRedirectStudent(user.id);
            } else if (userType === 'admin') {
                this.redirectToAdminPage();
            }
        } catch (error) {
            console.error('❌ 페이지 리다이렉트 오류:', error);
            // 오류 발생 시 로그인 페이지로 이동
            if (typeof App !== 'undefined' && App.showPage) {
                App.showPage('loginPage');
            }
        }
    },

    // 저장된 세션 삭제
    clearStoredSession() {
        try {
            sessionStorage.removeItem('userSession');
            console.log('🗑️ 저장된 세션 삭제 완료');
        } catch (error) {
            console.warn('⚠️ 세션 삭제 오류:', error);
        }
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        try {
            // 탭 전환 이벤트
            this.safeAddEventListener('#studentTab', 'click', () => this.switchToStudentLogin());
            this.safeAddEventListener('#adminTab', 'click', () => this.switchToAdminLogin());

            // 로그인 버튼 이벤트
            this.safeAddEventListener('#studentLoginBtn', 'click', () => this.handleStudentLogin());
            this.safeAddEventListener('#adminLoginBtn', 'click', () => this.handleAdminLogin());

            // 로그아웃 버튼 이벤트
            this.safeAddEventListener('#studentLogout', 'click', () => this.handleLogout());
            this.safeAddEventListener('#adminLogout', 'click', () => this.handleLogout());

            // Enter 키 이벤트
            this.setupEnterKeyEvents();
        } catch (error) {
            console.error('이벤트 리스너 설정 오류:', error);
        }
    },

    // 안전한 이벤트 리스너 추가
    safeAddEventListener(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`요소를 찾을 수 없음: ${selector}`);
            }
        } catch (error) {
            console.error(`이벤트 리스너 추가 오류 (${selector}):`, error);
        }
    },

    // Enter 키 이벤트 설정
    setupEnterKeyEvents() {
        try {
            // 학생 로그인 폼
            this.safeAddEventListener('#studentName', 'keypress', (e) => {
                if (e.key === 'Enter') this.handleStudentLogin();
            });
            this.safeAddEventListener('#studentBirth', 'keypress', (e) => {
                if (e.key === 'Enter') this.handleStudentLogin();
            });

            // 관리자 로그인 폼
            this.safeAddEventListener('#adminCode', 'keypress', (e) => {
                if (e.key === 'Enter') this.handleAdminLogin();
            });
        } catch (error) {
            console.error('Enter 키 이벤트 설정 오류:', error);
        }
    },

    // 탭 초기화
    initializeTabs() {
        this.switchToStudentLogin();
    },

    // 학생 로그인 탭으로 전환
    switchToStudentLogin() {
        try {
            // 탭 버튼 상태 변경
            const studentTab = document.getElementById('studentTab');
            const adminTab = document.getElementById('adminTab');
            
            if (studentTab) studentTab.classList.add('active');
            if (adminTab) adminTab.classList.remove('active');

            // 폼 표시/숨김
            const studentLogin = document.getElementById('studentLogin');
            const adminLogin = document.getElementById('adminLogin');
            
            if (studentLogin) studentLogin.classList.add('active');
            if (adminLogin) adminLogin.classList.remove('active');

            // 첫 번째 입력 필드에 포커스
            setTimeout(() => {
                const studentNameInput = document.getElementById('studentName');
                if (studentNameInput) {
                    studentNameInput.focus();
                }
            }, 100);
        } catch (error) {
            console.error('학생 로그인 탭 전환 오류:', error);
        }
    },

    // 관리자 로그인 탭으로 전환
    switchToAdminLogin() {
        try {
            // 탭 버튼 상태 변경
            const adminTab = document.getElementById('adminTab');
            const studentTab = document.getElementById('studentTab');
            
            if (adminTab) adminTab.classList.add('active');
            if (studentTab) studentTab.classList.remove('active');

            // 폼 표시/숨김
            const adminLogin = document.getElementById('adminLogin');
            const studentLogin = document.getElementById('studentLogin');
            
            if (adminLogin) adminLogin.classList.add('active');
            if (studentLogin) studentLogin.classList.remove('active');

            // 첫 번째 입력 필드에 포커스
            setTimeout(() => {
                const adminCodeInput = document.getElementById('adminCode');
                if (adminCodeInput) {
                    adminCodeInput.focus();
                }
            }, 100);
        } catch (error) {
            console.error('관리자 로그인 탭 전환 오류:', error);
        }
    },

    // 학생 로그인 처리 (Supabase 연동) - 안전성 강화
    async handleStudentLogin() {
        try {
            const nameInput = document.getElementById('studentName');
            const birthInput = document.getElementById('studentBirth');
            
            if (!nameInput || !birthInput) {
                console.error('로그인 입력 필드를 찾을 수 없습니다');
                this.showAlert('로그인 폼에 문제가 있습니다. 페이지를 새로고침해주세요.');
                return;
            }

            const name = nameInput.value.trim();
            const birthDate = birthInput.value;

            // 입력 검증
            if (!this.validateRequired(name, '이름')) return;
            if (!this.validateRequired(birthDate, '생년월일')) return;

            // 로딩 상태 표시
            const loginBtn = document.getElementById('studentLoginBtn');
            this.showLoading(loginBtn);

            // Supabase를 통한 인증 시도
            let result;
            try {
                result = await SupabaseAPI.authenticateStudent(name, birthDate);
            } catch (error) {
                console.error('Student authentication API error:', error);
                this.hideLoading(loginBtn);
                this.showAlert('서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
                return;
            }
            
            if (result.success && result.data) {
                this.loginSuccess('student', result.data);
            } else {
                this.hideLoading(loginBtn);
                this.showAlert(result.message || '학생 정보를 찾을 수 없습니다.\\n이름과 생년월일을 다시 확인해주세요.');
            }
        } catch (error) {
            console.error('Student login error:', error);
            const loginBtn = document.getElementById('studentLoginBtn');
            this.hideLoading(loginBtn);
            this.showAlert('로그인 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        }
    },

    // 관리자 로그인 처리 (Supabase 연동) - 안전성 강화
    async handleAdminLogin() {
        try {
            const codeInput = document.getElementById('adminCode');
            
            if (!codeInput) {
                console.error('관리자 코드 입력 필드를 찾을 수 없습니다');
                this.showAlert('로그인 폼에 문제가 있습니다. 페이지를 새로고침해주세요.');
                return;
            }

            const code = codeInput.value.trim();

            // 입력 검증
            if (!this.validateRequired(code, '관리자 코드')) return;

            // 로딩 상태 표시
            const loginBtn = document.getElementById('adminLoginBtn');
            this.showLoading(loginBtn);

            // Supabase를 통한 인증 시도
            let result;
            try {
                result = await SupabaseAPI.authenticateAdmin(code);
            } catch (error) {
                console.error('Admin authentication API error:', error);
                this.hideLoading(loginBtn);
                this.showAlert('서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
                return;
            }
            
            if (result.success && result.data) {
                this.loginSuccess('admin', result.data);
            } else {
                this.hideLoading(loginBtn);
                this.showAlert(result.message || '관리자 코드가 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            const loginBtn = document.getElementById('adminLoginBtn');
            this.hideLoading(loginBtn);
            this.showAlert('로그인 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        }
    },

    // 로그인 성공 처리 - 안전성 강화
    async loginSuccess(userType, user) {
        try {
            console.log('Login success:', { userType, user });
            
            // 입력 필드 초기화
            this.clearLoginForms();

            // 성공 메시지 표시
            const userName = user.name || '사용자';
            this.showAlert(`환영합니다, ${userName}님!`);

            // 해당 페이지로 이동
            if (userType === 'student') {
                // 학생의 경우 수업계획 완료 여부 체크 - 안전한 방법으로 처리
                await this.safeRedirectStudent(user.id);
            } else if (userType === 'admin') {
                this.redirectToAdminPage();
            }
        } catch (error) {
            console.error('로그인 성공 처리 오류:', error);
            this.showAlert('로그인 후 페이지 이동 중 문제가 발생했습니다. 다시 시도해주세요.');
        }
    },

    // 관리자 페이지로 리다이렉션
    redirectToAdminPage() {
        try {
            if (typeof App !== 'undefined' && App.showPage) {
                App.showPage('adminPage');
                
                if (typeof AdminManager !== 'undefined' && AdminManager.init) {
                    AdminManager.init();
                }
            } else {
                console.error('App.showPage 함수를 찾을 수 없습니다');
                this.showAlert('관리자 페이지로 이동할 수 없습니다. 페이지를 새로고침해주세요.');
            }
        } catch (error) {
            console.error('관리자 페이지 리다이렉션 오류:', error);
            this.showAlert('관리자 페이지로 이동하는 중 오류가 발생했습니다.');
        }
    },

    // 안전한 학생 리다이렉션 처리 (오류 메시지 중복 방지) - 개선된 버전
    async safeRedirectStudent(studentId) {
        try {
            // 추가 알림 제거 - 환영 메시지만 표시
            this.clearAllNotices();
            
            console.log('Checking lesson plan status for student:', studentId);
            
            // 수업계획 상태 확인 - 조용한 방식으로
            const lessonPlan = await this.quietlyCheckLessonPlan(studentId);
            console.log('Lesson plan data:', lessonPlan);
            
            const hasCompletedPlan = lessonPlan && (lessonPlan.status === 'submitted' || lessonPlan.status === 'approved');
            
            if (!hasCompletedPlan) {
                // 수업계획이 완료되지 않은 경우
                const hasDraft = lessonPlan && lessonPlan.status === 'draft';
                
                if (!hasDraft) {
                    // 수업계획 작성 필요 - 바로 이동
                    setTimeout(() => {
                        console.log('Redirecting to lesson plan page - new plan');
                        this.redirectToLessonPlan();
                        this.showLessonPlanGuidance();
                    }, 1000);
                } else {
                    // 임시저장된 수업계획이 있는 경우 - 바로 이동
                    setTimeout(() => {
                        console.log('Redirecting to lesson plan page - continue draft');
                        this.redirectToLessonPlan();
                        this.showLessonPlanContinueGuidance();
                    }, 1000);
                }
            } else {
                // 수업계획이 완료된 경우 바로 학생 대시보드로
                setTimeout(() => {
                    console.log('Redirecting to student dashboard');
                    this.redirectToStudentDashboard();
                }, 1000);
            }
        } catch (error) {
            // 오류가 발생해도 추가 알림을 표시하지 않고 조용히 처리
            console.warn('Silent error in lesson plan check:', error);
            
            // 기본적으로 학생 대시보드로 이동
            setTimeout(() => {
                console.log('Redirecting to student dashboard (fallback)');
                this.redirectToStudentDashboard();
            }, 1000);
        }
    },

    // 수업계획 페이지로 리다이렉션
    redirectToLessonPlan() {
        try {
            if (typeof App !== 'undefined' && App.showPage) {
                App.showPage('lessonPlanPage');
                
                if (typeof LessonPlanManager !== 'undefined' && LessonPlanManager.showLessonPlanPage) {
                    setTimeout(() => {
                        LessonPlanManager.showLessonPlanPage();
                    }, 100);
                }
            } else {
                console.error('App.showPage 함수를 찾을 수 없습니다');
                this.showAlert('수업계획 페이지로 이동할 수 없습니다. 페이지를 새로고침해주세요.');
            }
        } catch (error) {
            console.error('수업계획 페이지 리다이렉션 오류:', error);
            this.showAlert('수업계획 페이지로 이동하는 중 오류가 발생했습니다.');
        }
    },

    // 학생 대시보드로 리다이렉션
    redirectToStudentDashboard() {
        try {
            if (typeof App !== 'undefined' && App.showPage) {
                App.showPage('studentPage');
                
                if (typeof StudentManager !== 'undefined' && StudentManager.init) {
                    setTimeout(() => {
                        StudentManager.init();
                    }, 100);
                }
            } else {
                console.error('App.showPage 함수를 찾을 수 없습니다');
                this.showAlert('학생 대시보드로 이동할 수 없습니다. 페이지를 새로고침해주세요.');
            }
        } catch (error) {
            console.error('학생 대시보드 리다이렉션 오류:', error);
            this.showAlert('학생 대시보드로 이동하는 중 오류가 발생했습니다.');
        }
    },

    // 조용한 수업계획 확인 (에러 메시지 표시 안함) - 안전성 강화
    async quietlyCheckLessonPlan(studentId) {
        try {
            // SupabaseAPI 존재 확인
            if (typeof SupabaseAPI === 'undefined') {
                console.warn('SupabaseAPI를 찾을 수 없습니다');
                return null;
            }

            // API 호출
            const lessonPlan = await SupabaseAPI.getStudentLessonPlan(studentId);
            return lessonPlan;
        } catch (error) {
            console.warn('Quiet lesson plan check failed:', error);
            return null;
        }
    },

    // 수업계획 작성 안내
    showLessonPlanGuidance() {
        try {
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
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 5초 후 자동 제거
            setTimeout(() => {
                if (guidance.parentNode) {
                    guidance.parentNode.removeChild(guidance);
                }
            }, 5000);
        } catch (error) {
            console.error('수업계획 작성 안내 표시 오류:', error);
        }
    },

    // 수업계획 계속 작성 안내
    showLessonPlanContinueGuidance() {
        try {
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
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 5초 후 자동 제거
            setTimeout(() => {
                if (guidance.parentNode) {
                    guidance.parentNode.removeChild(guidance);
                }
            }, 5000);
        } catch (error) {
            console.error('수업계획 계속 작성 안내 표시 오류:', error);
        }
    },

    // 모든 알림 제거
    clearAllNotices() {
        try {
            const notices = document.querySelectorAll('.lesson-plan-required-notice, .lesson-plan-draft-notice, .lesson-plan-guidance-overlay');
            notices.forEach(notice => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            });
        } catch (error) {
            console.error('알림 제거 오류:', error);
        }
    },

    // 로그아웃 처리 - 세션 정리 추가
    handleLogout() {
        try {
            if (this.showConfirm('정말로 로그아웃하시겠습니까?')) {
                // 데이터 정리
                if (typeof SupabaseAPI !== 'undefined') {
                    SupabaseAPI.logout();
                }
                
                // 세션 스토리지 정리
                this.clearStoredSession();
                
                // 모든 알림 제거
                this.clearAllNotices();
                
                // 폼 초기화
                this.clearLoginForms();
                
                // 로그인 페이지로 이동
                if (typeof App !== 'undefined' && App.showPage) {
                    App.showPage('loginPage');
                }
                
                // 포커스 설정
                setTimeout(() => {
                    const studentNameInput = document.getElementById('studentName');
                    if (studentNameInput) {
                        studentNameInput.focus();
                    }
                }, 100);

                console.log('✅ 로그아웃 완료 - 세션 정리됨');
            }
        } catch (error) {
            console.error('로그아웃 처리 오류:', error);
            this.showAlert('로그아웃 중 오류가 발생했습니다.');
        }
    },

    // 로그인 폼 초기화
    clearLoginForms() {
        try {
            const studentNameInput = document.getElementById('studentName');
            const studentBirthInput = document.getElementById('studentBirth');
            const adminCodeInput = document.getElementById('adminCode');
            
            if (studentNameInput) studentNameInput.value = '';
            if (studentBirthInput) studentBirthInput.value = '';
            if (adminCodeInput) adminCodeInput.value = '';
            
            // 로딩 상태 해제
            this.hideLoading('#studentLoginBtn');
            this.hideLoading('#adminLoginBtn');
        } catch (error) {
            console.error('로그인 폼 초기화 오류:', error);
        }
    },

    // 현재 사용자 정보 표시 업데이트 - 안전성 대폭 강화
    async updateUserDisplay() {
        try {
            console.log('👤 updateUserDisplay 호출됨');
            
            // SupabaseAPI 존재 확인
            if (typeof SupabaseAPI === 'undefined') {
                console.error('SupabaseAPI를 찾을 수 없습니다');
                this.showFallbackUserInfo();
                return;
            }

            const user = SupabaseAPI.currentUser;
            const userType = SupabaseAPI.currentUserType;

            console.log('사용자 정보:', { user, userType });

            if (userType === 'student' && user) {
                await this.updateStudentDisplay(user);
            } else {
                console.log('사용자 표시 업데이트 건너뜀 - 사용자 없음 또는 학생 타입이 아님');
                this.showFallbackUserInfo();
            }
        } catch (error) {
            console.error('❌ 사용자 정보 표시 업데이트 오류:', error);
            this.showFallbackUserInfo();
        }
    },

    // 학생 정보 표시 업데이트
    async updateStudentDisplay(user) {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            const detailsEl = document.getElementById('studentDetails');
            
            // 환영 메시지 업데이트
            if (welcomeEl) {
                welcomeEl.textContent = `안녕하세요, ${user.name}님!`;
                console.log('환영 메시지 업데이트:', welcomeEl.textContent);
            } else {
                console.warn('studentWelcome 요소를 찾을 수 없습니다');
            }
            
            // 상세 정보 업데이트
            if (detailsEl) {
                const instituteName = user.sejong_institute || '세종학당';
                const field = user.field || '전문분야';
                
                // 예산 정보 조회 시도
                try {
                    const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(user.id);
                    const budgetLimit = budgetStatus ? budgetStatus.allocated : 0;
                    detailsEl.textContent = `${instituteName} • ${field} • 배정예산: ${this.formatPrice(budgetLimit)}`;
                    console.log('상세 정보 업데이트 완료:', detailsEl.textContent);
                } catch (budgetError) {
                    console.warn('예산 상태 조회 오류:', budgetError);
                    detailsEl.textContent = `${instituteName} • ${field} • 예산 정보 로딩 중...`;
                }
            } else {
                console.warn('studentDetails 요소를 찾을 수 없습니다');
            }
        } catch (error) {
            console.error('학생 정보 표시 업데이트 오류:', error);
            this.showFallbackUserInfo();
        }
    },

    // 폴백 사용자 정보 표시
    showFallbackUserInfo() {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            const detailsEl = document.getElementById('studentDetails');
            
            if (welcomeEl) {
                welcomeEl.textContent = '안녕하세요!';
            }
            
            if (detailsEl) {
                detailsEl.textContent = '사용자 정보를 불러오는 중...';
            }
        } catch (error) {
            console.error('폴백 사용자 정보 표시 오류:', error);
        }
    },

    // 가격 포맷팅 헬퍼
    formatPrice(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    // 인증 상태 확인
    isAuthenticated() {
        try {
            return typeof SupabaseAPI !== 'undefined' && SupabaseAPI.currentUser !== null;
        } catch (error) {
            console.error('인증 상태 확인 오류:', error);
            return false;
        }
    },

    // 사용자 타입 확인
    getUserType() {
        try {
            return typeof SupabaseAPI !== 'undefined' ? SupabaseAPI.currentUserType : null;
        } catch (error) {
            console.error('사용자 타입 확인 오류:', error);
            return null;
        }
    },

    // 현재 사용자 정보 조회
    getCurrentUser() {
        try {
            return typeof SupabaseAPI !== 'undefined' ? SupabaseAPI.currentUser : null;
        } catch (error) {
            console.error('현재 사용자 정보 조회 오류:', error);
            return null;
        }
    },

    // 권한 확인
    hasPermission(requiredType) {
        try {
            return this.isAuthenticated() && this.getUserType() === requiredType;
        } catch (error) {
            console.error('권한 확인 오류:', error);
            return false;
        }
    },

    // 현재 사용자 ID 조회
    getCurrentUserId() {
        try {
            const user = this.getCurrentUser();
            return user?.id || null;
        } catch (error) {
            console.error('현재 사용자 ID 조회 오류:', error);
            return null;
        }
    },

    // 현재 사용자가 학생인지 확인
    isStudent() {
        return this.getUserType() === 'student';
    },

    // 현재 사용자가 관리자인지 확인
    isAdmin() {
        return this.getUserType() === 'admin';
    },

    // 유틸리티 함수들 - 안전성 강화
    validateRequired(value, fieldName) {
        if (!value || value.trim() === '') {
            this.showAlert(`${fieldName}을(를) 입력해주세요.`);
            return false;
        }
        return true;
    },

    showAlert(message) {
        try {
            alert(message);
        } catch (error) {
            console.error('알림 표시 오류:', error);
        }
    },

    showConfirm(message) {
        try {
            return confirm(message);
        } catch (error) {
            console.error('확인 대화상자 표시 오류:', error);
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
                const originalText = element.textContent;
                element.dataset.originalText = originalText;
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

console.log('🔐 AuthManager loaded successfully with persistent login support');
