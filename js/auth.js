// 인증 관리 모듈 (Supabase 연동) - 로그인 및 수업계획 상태 체크 수정 버전
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

    // 학생 로그인 처리 (Supabase 연동) - 안전성 강화
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
            console.log('🔄 학생 로그인 시도:', { name, birthDate });
            
            // Supabase를 통한 인증 시도
            const result = await SupabaseAPI.authenticateStudent(name, birthDate);
            console.log('로그인 결과:', result);
            
            if (result.success && result.data) {
                this.loginSuccess('student', result.data);
            } else {
                Utils.hideLoading(loginBtn);
                Utils.showAlert(result.message || '학생 정보를 찾을 수 없습니다.\n이름과 생년월일을 다시 확인해주세요.');
            }
        } catch (error) {
            console.error('❌ 학생 로그인 오류:', error);
            Utils.hideLoading(loginBtn);
            Utils.showAlert('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    },

    // 관리자 로그인 처리 (Supabase 연동) - 안전성 강화
    async handleAdminLogin() {
        const code = Utils.$('#adminCode').value.trim();

        // 입력 검증
        if (!Utils.validateRequired(code, '관리자 코드')) return;

        // 로딩 상태 표시
        const loginBtn = Utils.$('#adminLoginBtn');
        Utils.showLoading(loginBtn);

        try {
            console.log('🔄 관리자 로그인 시도');
            
            // Supabase를 통한 인증 시도
            const result = await SupabaseAPI.authenticateAdmin(code);
            console.log('관리자 로그인 결과:', result);
            
            if (result.success && result.user) {
                this.loginSuccess('admin', result.user);
            } else {
                Utils.hideLoading(loginBtn);
                Utils.showAlert(result.message || '관리자 코드가 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('❌ 관리자 로그인 오류:', error);
            Utils.hideLoading(loginBtn);
            Utils.showAlert('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    },

    // 로그인 성공 처리 - 안전성 강화
    async loginSuccess(userType, user) {
        try {
            console.log('✅ 로그인 성공:', { userType, user });
            
            // user 객체 유효성 검사
            if (!user) {
                console.error('❌ 사용자 정보가 없습니다');
                Utils.showAlert('로그인 처리 중 오류가 발생했습니다.');
                return;
            }
            
            // 입력 필드 초기화
            this.clearLoginForms();

            // 사용자 이름 안전하게 가져오기
            const userName = user.name || user.user_name || user.full_name || '사용자';
            
            // 성공 메시지 표시
            Utils.showAlert(`환영합니다, ${userName}님!`);

            // 해당 페이지로 이동
            if (userType === 'student') {
                // 학생의 경우 수업계획 완료 여부 체크
                await this.safeRedirectStudent(user.id);
            } else if (userType === 'admin') {
                // 관리자는 바로 관리자 페이지로
                setTimeout(() => {
                    App.showPage('adminPage');
                    if (window.AdminManager) {
                        AdminManager.init();
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('❌ 로그인 성공 처리 오류:', error);
            Utils.showAlert('로그인 후 페이지 이동 중 오류가 발생했습니다.');
        }
    },

    // 안전한 학생 리다이렉션 처리 - 수업계획 상태 로직 개선
    async safeRedirectStudent(studentId) {
        try {
            console.log('📋 학생 수업계획 상태 확인 시작:', studentId);
            
            // 기존 알림 정리
            this.clearAllNotices();
            
            // 수업계획 상태 확인
            const lessonPlan = await this.quietlyCheckLessonPlan(studentId);
            console.log('수업계획 데이터:', lessonPlan);
            
            // 수업계획 상태 분류
            let shouldGoToDashboard = false;
            let shouldGoToLessonPlan = false;
            let guidanceType = 'new';
            
            if (!lessonPlan) {
                // 수업계획이 아예 없는 경우 - 새로 작성
                console.log('📝 수업계획 없음 - 새로 작성 필요');
                shouldGoToLessonPlan = true;
                guidanceType = 'new';
            } else {
                switch (lessonPlan.status) {
                    case 'draft':
                        // 임시저장된 경우 - 계속 작성
                        console.log('📝 임시저장된 수업계획 - 계속 작성');
                        shouldGoToLessonPlan = true;
                        guidanceType = 'continue';
                        break;
                        
                    case 'submitted':
                        // 제출된 경우 - 승인 대기 중이지만 대시보드로
                        console.log('⏳ 수업계획 승인 대기 중 - 대시보드로');
                        shouldGoToDashboard = true;
                        break;
                        
                    case 'approved':
                        // 승인된 경우 - 대시보드로
                        console.log('✅ 수업계획 승인됨 - 대시보드로');
                        shouldGoToDashboard = true;
                        break;
                        
                    case 'rejected':
                        // 반려된 경우 - 수정 필요
                        console.log('❌ 수업계획 반려됨 - 수정 필요');
                        shouldGoToLessonPlan = true;
                        guidanceType = 'rejected';
                        break;
                        
                    default:
                        // 알 수 없는 상태 - 대시보드로
                        console.log('❓ 알 수 없는 상태 - 대시보드로');
                        shouldGoToDashboard = true;
                        break;
                }
            }
            
            // 페이지 이동 실행
            setTimeout(() => {
                if (shouldGoToDashboard) {
                    console.log('🏠 학생 대시보드로 이동');
                    App.showPage('studentPage');
                    if (window.StudentManager) {
                        StudentManager.init();
                    }
                } else if (shouldGoToLessonPlan) {
                    console.log('📋 수업계획 페이지로 이동');
                    App.showPage('lessonPlanPage');
                    if (window.LessonPlanManager) {
                        LessonPlanManager.showLessonPlanPage();
                    }
                    
                    // 안내 메시지 표시
                    this.showLessonPlanGuidance(guidanceType, lessonPlan);
                }
            }, 1000);
            
        } catch (error) {
            console.warn('⚠️ 수업계획 상태 확인 오류:', error);
            
            // 오류 발생 시 기본적으로 학생 대시보드로
            setTimeout(() => {
                console.log('🏠 폴백: 학생 대시보드로 이동');
                App.showPage('studentPage');
                if (window.StudentManager) {
                    StudentManager.init();
                }
            }, 1000);
        }
    },

    // 조용한 수업계획 확인 (에러 메시지 표시 안함) - 안전성 강화
    async quietlyCheckLessonPlan(studentId) {
        try {
            console.log('🔍 수업계획 조회 시도:', studentId);
            
            // SupabaseAPI 사용
            const result = await SupabaseAPI.getStudentLessonPlan(studentId);
            console.log('수업계획 조회 결과:', result);
            
            return result;
        } catch (error) {
            console.warn('⚠️ 수업계획 조회 실패:', error);
            return null;
        }
    },

    // 수업계획 안내 - 타입별 메시지 개선
    showLessonPlanGuidance(type = 'new', lessonPlan = null) {
        try {
            // 기존 알림들 제거
            this.clearAllNotices();
            
            const guidance = document.createElement('div');
            guidance.className = 'lesson-plan-guidance-overlay';
            
            let content = '';
            
            switch (type) {
                case 'new':
                    content = `
                        <div class="guidance-content">
                            <div class="guidance-icon">
                                <i data-lucide="calendar-plus" style="width: 3rem; height: 3rem; color: #4f46e5;"></i>
                            </div>
                            <h3>수업계획 작성이 필요합니다</h3>
                            <p>파견 기간 동안의 수업계획을 먼저 작성해주세요.</p>
                            <p><strong>수업계획은 필수 제출 사항</strong>이며, 완료 후 교구 신청이 가능합니다.</p>
                            <button class="btn primary" onclick="this.parentElement.parentElement.remove()">
                                시작하기
                            </button>
                        </div>
                    `;
                    break;
                    
                case 'continue':
                    content = `
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
                    break;
                    
                case 'rejected':
                    const rejectionReason = lessonPlan?.rejection_reason || '사유 없음';
                    content = `
                        <div class="guidance-content">
                            <div class="guidance-icon">
                                <i data-lucide="alert-triangle" style="width: 3rem; height: 3rem; color: #ef4444;"></i>
                            </div>
                            <h3>수업계획이 반려되었습니다</h3>
                            <p><strong>반려 사유:</strong> ${rejectionReason}</p>
                            <p>수업계획을 수정하여 다시 제출해주세요.</p>
                            <button class="btn danger" onclick="this.parentElement.parentElement.remove()">
                                수정하기
                            </button>
                        </div>
                    `;
                    break;
            }
            
            guidance.innerHTML = content;
            
            document.body.appendChild(guidance);
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 7초 후 자동 제거
            setTimeout(() => {
                if (guidance.parentNode) {
                    guidance.parentNode.removeChild(guidance);
                }
            }, 7000);
            
        } catch (error) {
            console.error('안내 메시지 표시 오류:', error);
        }
    },

    // 모든 알림 제거
    clearAllNotices() {
        try {
            const notices = document.querySelectorAll('.lesson-plan-required-notice, .lesson-plan-draft-notice, .lesson-plan-guidance-overlay, .dashboard-notice');
            notices.forEach(notice => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            });
        } catch (error) {
            console.error('알림 제거 오류:', error);
        }
    },

    // 로그아웃 처리
    handleLogout() {
        if (Utils.showConfirm('정말로 로그아웃하시겠습니까?')) {
            try {
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
                    const nameInput = Utils.$('#studentName');
                    if (nameInput) nameInput.focus();
                }, 100);
                
                console.log('✅ 로그아웃 완료');
            } catch (error) {
                console.error('로그아웃 처리 오류:', error);
            }
        }
    },

    // 로그인 폼 초기화
    clearLoginForms() {
        try {
            const studentName = Utils.$('#studentName');
            const studentBirth = Utils.$('#studentBirth');
            const adminCode = Utils.$('#adminCode');
            
            if (studentName) studentName.value = '';
            if (studentBirth) studentBirth.value = '';
            if (adminCode) adminCode.value = '';
            
            // 로딩 상태 해제
            Utils.hideLoading('#studentLoginBtn');
            Utils.hideLoading('#adminLoginBtn');
        } catch (error) {
            console.error('폼 초기화 오류:', error);
        }
    },

    // 현재 사용자 정보 표시 업데이트 - 안전성 강화
    async updateUserDisplay() {
        try {
            const user = SupabaseAPI.currentUser;
            const userType = SupabaseAPI.currentUserType;

            console.log('👤 사용자 정보 표시 업데이트:', { user, userType });

            if (userType === 'student' && user) {
                const welcomeEl = Utils.$('#studentWelcome');
                const detailsEl = Utils.$('#studentDetails');
                
                if (welcomeEl) {
                    const userName = user.name || user.user_name || user.full_name || '사용자';
                    welcomeEl.textContent = `안녕하세요, ${userName}님!`;
                    console.log('환영 메시지 업데이트:', welcomeEl.textContent);
                } else {
                    console.warn('studentWelcome 요소를 찾을 수 없습니다');
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
                        console.error('예산 상태 조회 오류:', error);
                        detailsEl.textContent = `${instituteName} • ${field}`;
                    }
                } else {
                    console.warn('studentDetails 요소를 찾을 수 없습니다');
                }
            } else {
                console.log('사용자 정보 표시 건너뜀 - 사용자 없음 또는 학생 타입 아님');
                
                // 현재 사용자가 없는 경우에도 기본 메시지 표시
                const welcomeEl = Utils.$('#studentWelcome');
                if (welcomeEl && !user) {
                    welcomeEl.textContent = '안녕하세요!';
                }
            }
        } catch (error) {
            console.error('사용자 정보 표시 업데이트 오류:', error);
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
        try {
            if (this.isAuthenticated()) {
                const sessionData = {
                    user: SupabaseAPI.currentUser,
                    userType: SupabaseAPI.currentUserType,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('userSession', JSON.stringify(sessionData));
            }
        } catch (error) {
            console.error('세션 저장 오류:', error);
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
            console.error('세션 복원 실패:', error);
        }
        
        // 세션 정리
        this.clearSession();
        return false;
    },

    // 세션 정리
    clearSession() {
        try {
            sessionStorage.removeItem('userSession');
        } catch (error) {
            console.error('세션 정리 오류:', error);
        }
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