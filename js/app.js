// 메인 애플리케이션 관리 모듈 (Supabase 연동) - 수정된 버전
const App = {
    // 초기화
    init() {
        console.log('세종학당 문화교구 신청 플랫폼 시작');
        
        this.setupGlobalEventListeners();
        this.initializeModules();
        this.handleInitialRoute();
        this.setupPerformanceMonitoring();
    },

    // 전역 이벤트 리스너 설정
    setupGlobalEventListeners() {
        // 페이지 로드 완료 후 초기화
        document.addEventListener('DOMContentLoaded', () => {
            this.onDOMReady();
        });

        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => {
            this.onBeforeUnload();
        });

        // 네트워크 상태 변화 감지
        window.addEventListener('online', () => {
            this.onNetworkStatusChange(true);
        });

        window.addEventListener('offline', () => {
            this.onNetworkStatusChange(false);
        });

        // 브라우저 뒤로가기/앞으로가기
        window.addEventListener('popstate', (e) => {
            this.handlePopState(e);
        });

        // 전역 에러 핸들링
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e);
        });
    },

    // DOM 준비 완료 처리
    onDOMReady() {
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 모든 모듈 초기화
        AuthManager.init();
        
        // 세션 복원 시도
        if (AuthManager.restoreSession()) {
            this.handleSessionRestore();
        } else {
            this.showPage('loginPage');
        }

        // 전역 키보드 단축키 활성화
        this.setupGlobalKeyboardShortcuts();
        
        // 성능 최적화
        this.optimizePerformance();
        
        console.log('앱 초기화 완료');
    },

    // 모듈 초기화
    initializeModules() {
        // Supabase API는 이미 로드됨
        // 다른 모듈들은 필요시 지연 로딩
    },

    // 초기 라우트 처리
    handleInitialRoute() {
        const hash = window.location.hash;
        if (hash) {
            this.navigateByHash(hash);
        }
    },

    // 세션 복원 처리 - 안전성 강화
    async handleSessionRestore() {
        try {
            const userType = AuthManager.getUserType();
            
            if (userType === 'student') {
                // 학생의 경우 수업계획 상태 확인
                const studentId = AuthManager.getCurrentUserId();
                
                try {
                    // LessonPlanManager 존재 확인
                    if (typeof LessonPlanManager !== 'undefined') {
                        const hasCompletedPlan = await LessonPlanManager.hasCompletedLessonPlan(studentId);
                        const needsPlan = await LessonPlanManager.needsLessonPlan(studentId);
                        
                        if (!hasCompletedPlan && needsPlan) {
                            this.showPage('lessonPlanPage');
                            if (window.LessonPlanManager) {
                                LessonPlanManager.showLessonPlanPage();
                            }
                        } else {
                            this.showPage('studentPage');
                        }
                    } else {
                        console.warn('LessonPlanManager를 찾을 수 없습니다. 학생 페이지로 이동합니다.');
                        this.showPage('studentPage');
                    }
                } catch (error) {
                    console.error('수업계획 상태 확인 오류:', error);
                    this.showPage('studentPage');
                }
            } else if (userType === 'admin') {
                this.showPage('adminPage');
            } else {
                this.showPage('loginPage');
            }
        } catch (error) {
            console.error('세션 복원 처리 오류:', error);
            this.showPage('loginPage');
        }
    },

    // 페이지 표시 (개선됨 - 스크롤 위치 복원 조건부 적용)
    showPage(pageId) {
        console.log(`페이지 전환: ${pageId}`);
        
        // 기존 알림들 정리
        this.clearPageNotices();
        
        // 모든 페이지 숨김
        const pages = Utils.$$('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // 지정된 페이지 표시
        const targetPage = Utils.$(`#${pageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // URL 해시 업데이트
            this.updateUrlHash(pageId);
            
            // 페이지별 후처리
            this.onPageShown(pageId);
            
            // 페이지 전환 애니메이션
            this.animatePageTransition(targetPage);
        } else {
            console.error(`페이지를 찾을 수 없습니다: ${pageId}`);
        }
    },

    // 페이지 알림 정리
    clearPageNotices() {
        const notices = document.querySelectorAll('.lesson-plan-guidance-overlay, .lesson-plan-required-notice, .lesson-plan-draft-notice, .dashboard-notice');
        notices.forEach(notice => {
            if (notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        });
    },

    // 페이지 전환 애니메이션
    animatePageTransition(page) {
        // 부드러운 페이드인 효과
        page.style.opacity = '0';
        page.style.transform = 'translateY(10px)';
        
        // 강제 리플로우
        page.offsetHeight;
        
        // 애니메이션 적용
        page.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        page.style.opacity = '1';
        page.style.transform = 'translateY(0)';
        
        // 애니메이션 완료 후 스타일 정리
        setTimeout(() => {
            page.style.transition = '';
            page.style.transform = '';
        }, 300);
    },

    // 페이지 표시 후 처리 (수정됨 - 안전성 강화)
    onPageShown(pageId) {
        // 수업계획 페이지가 아닌 경우에만 스크롤 위치 복원
        if (pageId !== 'lessonPlanPage') {
            Utils.restoreScrollPosition();
        }
        
        // 페이지별 특별 처리
        switch(pageId) {
            case 'loginPage':
                // 로그인 폼에 포커스
                setTimeout(() => {
                    const nameInput = Utils.$('#studentName');
                    if (nameInput) nameInput.focus();
                }, 100);
                break;
                
            case 'lessonPlanPage':
                // 수업계획 페이지 초기화 (스크롤을 맨 위로 하지 않음)
                if (window.LessonPlanManager) {
                    try {
                        LessonPlanManager.init();
                        LessonPlanManager.showLessonPlanPage();
                    } catch (error) {
                        console.error('수업계획 페이지 초기화 오류:', error);
                    }
                } else {
                    console.warn('LessonPlanManager를 찾을 수 없습니다');
                }
                // 수업계획 페이지는 자연스러운 스크롤 동작 유지
                break;
                
            case 'studentPage':
                // 학생 페이지 초기화
                if (window.StudentManager) {
                    try {
                        StudentManager.init();
                        // refreshApplications 메서드명 수정
                        if (StudentManager.refreshDashboard) {
                            StudentManager.refreshDashboard();
                        } else if (StudentManager.loadApplications) {
                            StudentManager.loadApplications();
                        }
                    } catch (error) {
                        console.error('학생 페이지 초기화 오류:', error);
                    }
                } else {
                    console.warn('StudentManager를 찾을 수 없습니다');
                }
                break;
                
            case 'adminPage':
                // 관리자 페이지 초기화
                if (window.AdminManager) {
                    try {
                        AdminManager.init();
                        // refreshData 메서드 확인 후 호출
                        if (AdminManager.refreshData) {
                            AdminManager.refreshData();
                        } else if (AdminManager.loadData) {
                            AdminManager.loadData();
                        }
                    } catch (error) {
                        console.error('관리자 페이지 초기화 오류:', error);
                    }
                } else {
                    console.warn('AdminManager를 찾을 수 없습니다');
                }
                break;
        }
        
        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // URL 해시 업데이트
    updateUrlHash(pageId) {
        const hashMap = {
            'loginPage': '',
            'lessonPlanPage': '#lesson-plan',
            'studentPage': '#student',
            'adminPage': '#admin'
        };
        
        const hash = hashMap[pageId] || '';
        if (window.location.hash !== hash) {
            history.pushState({pageId}, '', hash);
        }
    },

    // 해시로 네비게이션
    navigateByHash(hash) {
        const pageMap = {
            '': 'loginPage',
            '#lesson-plan': 'lessonPlanPage',
            '#student': 'studentPage',
            '#admin': 'adminPage'
        };
        
        const pageId = pageMap[hash];
        if (pageId) {
            // 권한 확인
            if (this.canAccessPage(pageId)) {
                this.showPage(pageId);
            } else {
                this.showPage('loginPage');
            }
        }
    },

    // 페이지 접근 권한 확인
    canAccessPage(pageId) {
        try {
            switch(pageId) {
                case 'loginPage':
                    return true;
                case 'lessonPlanPage':
                    return AuthManager.hasPermission('student');
                case 'studentPage':
                    return AuthManager.hasPermission('student');
                case 'adminPage':
                    return AuthManager.hasPermission('admin');
                default:
                    return false;
            }
        } catch (error) {
            console.error('페이지 접근 권한 확인 오류:', error);
            return false;
        }
    },

    // 브라우저 뒤로가기/앞으로가기 처리
    handlePopState(event) {
        if (event.state && event.state.pageId) {
            if (this.canAccessPage(event.state.pageId)) {
                this.showPage(event.state.pageId);
            } else {
                this.showPage('loginPage');
            }
        } else {
            this.navigateByHash(window.location.hash);
        }
    },

    // 전역 키보드 단축키
    setupGlobalKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Alt + 1: 로그인 페이지
            if (event.altKey && event.key === '1') {
                event.preventDefault();
                this.showPage('loginPage');
            }
            
            // Alt + 2: 수업계획 페이지 (학생 로그인된 경우)
            if (event.altKey && event.key === '2') {
                event.preventDefault();
                if (AuthManager.hasPermission('student')) {
                    this.showPage('lessonPlanPage');
                }
            }
            
            // Alt + 3: 학생 페이지 (학생 로그인된 경우)
            if (event.altKey && event.key === '3') {
                event.preventDefault();
                if (AuthManager.hasPermission('student')) {
                    this.showPage('studentPage');
                }
            }
            
            // Alt + 4: 관리자 페이지 (관리자 로그인된 경우)
            if (event.altKey && event.key === '4') {
                event.preventDefault();
                if (AuthManager.hasPermission('admin')) {
                    this.showPage('adminPage');
                }
            }
            
            // Ctrl/Cmd + /: 도움말
            if ((event.ctrlKey || event.metaKey) && event.key === '/') {
                event.preventDefault();
                this.showHelp();
            }

            // ESC: 모달 닫기
            if (event.key === 'Escape') {
                this.closeActiveModal();
            }
        });
    },

    // 활성 모달 닫기
    closeActiveModal() {
        const activeModal = Utils.$('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
        
        // 안내 오버레이도 닫기
        const guidanceOverlay = Utils.$('.lesson-plan-guidance-overlay');
        if (guidanceOverlay) {
            guidanceOverlay.remove();
        }
    },

    // 네트워크 상태 변화 처리
    onNetworkStatusChange(isOnline) {
        const statusMessage = isOnline ? 
            '네트워크 연결이 복원되었습니다.' : 
            '네트워크 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.';
            
        console.log(statusMessage);
        
        // 오프라인 모드 처리
        if (!isOnline) {
            this.enableOfflineMode();
        } else {
            this.disableOfflineMode();
        }
    },

    // 오프라인 모드 활성화
    enableOfflineMode() {
        document.body.classList.add('offline-mode');
        const onlineOnlyButtons = Utils.$$('[data-online-only]');
        onlineOnlyButtons.forEach(btn => {
            btn.disabled = true;
        });
    },

    // 오프라인 모드 비활성화
    disableOfflineMode() {
        document.body.classList.remove('offline-mode');
        const onlineOnlyButtons = Utils.$$('[data-online-only]');
        onlineOnlyButtons.forEach(btn => {
            btn.disabled = false;
        });
    },

    // 전역 에러 처리 - 강화된 버전
    handleGlobalError(error) {
        console.error('전역 에러 발생:', error);
        
        // 에러 로깅
        this.logError(error);
        
        // 사용자에게 친화적인 에러 메시지 표시
        const userMessage = this.getUserFriendlyErrorMessage(error);
        
        // 에러 유형에 따른 처리
        if (this.isNetworkError(error)) {
            this.handleNetworkError();
        } else if (this.isAuthenticationError(error)) {
            this.handleAuthenticationError();
        } else {
            Utils.showAlert(userMessage);
        }
    },

    // 네트워크 에러 판별
    isNetworkError(error) {
        return error.message && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')
        );
    },

    // 인증 에러 판별
    isAuthenticationError(error) {
        return error.message && (
            error.message.includes('401') ||
            error.message.includes('403') ||
            error.message.includes('Unauthorized') ||
            error.message.includes('permission')
        );
    },

    // 네트워크 에러 처리
    handleNetworkError() {
        console.warn('네트워크 에러 발생 - 오프라인 모드 활성화');
        this.enableOfflineMode();
        
        // 자동 재연결 시도
        setTimeout(() => {
            this.testNetworkConnection();
        }, 5000);
    },

    // 인증 에러 처리
    handleAuthenticationError() {
        console.warn('인증 에러 발생 - 로그인 페이지로 이동');
        AuthManager.logout();
        this.showPage('loginPage');
        Utils.showAlert('세션이 만료되었습니다. 다시 로그인해주세요.');
    },

    // 네트워크 연결 테스트
    async testNetworkConnection() {
        try {
            const result = await SupabaseAPI.testConnection();
            if (result.success) {
                console.log('네트워크 연결 복원됨');
                this.disableOfflineMode();
            }
        } catch (error) {
            console.log('네트워크 연결 실패 - 재시도 예정');
            setTimeout(() => {
                this.testNetworkConnection();
            }, 10000);
        }
    },

    // 에러 로깅 - 개선된 버전
    logError(error) {
        const errorInfo = {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
            stack: error.error ? error.error.stack : '',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: SupabaseAPI.currentUser ? SupabaseAPI.currentUser.id : null,
            userType: SupabaseAPI.currentUserType
        };
        
        // 로컬 스토리지에 에러 로그 저장
        try {
            const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
            errorLog.push(errorInfo);
            
            // 최대 50개 에러만 보관
            if (errorLog.length > 50) {
                errorLog.shift();
            }
            
            localStorage.setItem('errorLog', JSON.stringify(errorLog));
        } catch (e) {
            console.error('에러 로깅 실패:', e);
        }
    },

    // 사용자 친화적 에러 메시지 생성
    getUserFriendlyErrorMessage(error) {
        if (this.isNetworkError(error)) {
            return '네트워크 연결을 확인해주세요.';
        }
        
        if (this.isAuthenticationError(error)) {
            return '세션이 만료되었습니다. 다시 로그인해주세요.';
        }
        
        if (error.message && error.message.includes('406')) {
            return '일시적으로 서비스에 접근할 수 없습니다. 잠시 후 다시 시도해주세요.';
        }
        
        return '예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 관리자에게 문의해주세요.';
    },

    // 성능 최적화
    optimizePerformance() {
        // 이미지 지연 로딩
        if (window.Utils && Utils.lazyLoadImages) {
            Utils.lazyLoadImages();
        }
        
        // 사용하지 않는 DOM 요소 정리
        this.cleanupUnusedElements();
        
        // 메모리 사용량 모니터링
        this.monitorMemoryUsage();
    },

    // 사용하지 않는 DOM 요소 정리
    cleanupUnusedElements() {
        try {
            // 빈 텍스트 노드 제거
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                node => node.nodeValue.trim() === '' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
            );
            
            const emptyTextNodes = [];
            let node;
            while (node = walker.nextNode()) {
                emptyTextNodes.push(node);
            }
            
            emptyTextNodes.forEach(node => {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            });
        } catch (error) {
            console.error('DOM 요소 정리 오류:', error);
        }
    },

    // 메모리 사용량 모니터링
    monitorMemoryUsage() {
        try {
            if ('memory' in performance) {
                const memoryInfo = performance.memory;
                const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1048576);
                const limitMB = Math.round(memoryInfo.jsHeapSizeLimit / 1048576);
                
                console.log(`메모리 사용량: ${usedMB}MB / ${limitMB}MB`);
                
                // 메모리 사용량이 80% 이상이면 경고
                if (usedMB / limitMB > 0.8) {
                    console.warn('메모리 사용량이 높습니다. 페이지 새로고침을 권장합니다.');
                }
            }
        } catch (error) {
            console.error('메모리 모니터링 오류:', error);
        }
    },

    // 성능 모니터링 설정
    setupPerformanceMonitoring() {
        // 페이지 로드 성능 측정
        window.addEventListener('load', () => {
            setTimeout(() => {
                try {
                    if ('performance' in window) {
                        const navigation = performance.getEntriesByType('navigation')[0];
                        if (navigation) {
                            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                            console.log(`페이지 로드 시간: ${loadTime}ms`);
                        }
                    }
                } catch (error) {
                    console.error('성능 측정 오류:', error);
                }
            }, 0);
        });
    },

    // 페이지 언로드 시 정리 (수정됨)
    onBeforeUnload() {
        try {
            // 세션 저장
            if (AuthManager.isAuthenticated()) {
                AuthManager.saveSession();
            }
            
            // 임시 데이터 정리
            if (window.StudentManager && StudentManager.saveFormDraft) {
                StudentManager.saveFormDraft();
            }
            
            // 수업계획 임시저장
            if (window.LessonPlanManager && LessonPlanManager.currentLessonPlan) {
                // 자동 임시저장 로직은 LessonPlanManager 내부에서 처리
            }
            
            // 수업계획 페이지가 아닌 경우에만 스크롤 위치 저장
            const currentPage = Utils.$('.page.active');
            if (currentPage && currentPage.id !== 'lessonPlanPage') {
                if (window.Utils && Utils.saveScrollPosition) {
                    Utils.saveScrollPosition();
                }
            }
        } catch (error) {
            console.error('페이지 언로드 처리 오류:', error);
        }
    },

    // 도움말 표시
    showHelp() {
        const helpText = `
키보드 단축키:
• Alt + 1: 로그인 페이지
• Alt + 2: 수업계획 페이지 (학생)
• Alt + 3: 학생 페이지
• Alt + 4: 관리자 페이지
• Ctrl/Cmd + F: 검색 (관리자)
• Ctrl/Cmd + N: 새 신청 (학생)
• Ctrl/Cmd + E: Excel 내보내기 (관리자)
• Ctrl/Cmd + Enter: 폼 제출
• ESC: 모달 닫기
• F5: 새로고침

수업계획 작성:
• 파견 기간과 총 수업 횟수 입력 후 계획표 생성
• 각 수업별 주제와 내용 작성
• 임시저장 및 완료 제출 가능
• 관리자가 설정한 마감일까지 수정 가능

문의사항이 있으시면 관리자에게 연락해주세요.
        `;
        
        alert(helpText.trim());
    },

    // 앱 정보 표시
    showAppInfo() {
        const info = `
세종학당 문화교구 신청 플랫폼
버전: 1.2.1 (406 Error Fixed)
개발: Claude AI Assistant

이 플랫폼은 세종학당 문화인턴들의 교구 신청을 위해 개발되었습니다.

주요 기능:
• 학생별 개별 예산 관리
• 교구 신청 및 상태 추적
• 수업계획 작성 및 관리
• 관리자 승인 시스템
• Excel 데이터 내보내기
• 406 에러 대응 강화

문의사항이 있으시면 관리자에게 연락해주세요.
        `;
        
        alert(info.trim());
    },

    // 디버그 정보 표시
    showDebugInfo() {
        if (confirm('개발자 모드를 활성화하시겠습니까?')) {
            console.log('=== 디버그 정보 ===');
            console.log('현재 사용자:', SupabaseAPI.currentUser);
            console.log('사용자 타입:', SupabaseAPI.currentUserType);
            
            // 전역 변수로 접근 가능하게 설정
            window.DEBUG = {
                SupabaseAPI,
                AuthManager,
                StudentManager: window.StudentManager,
                AdminManager: window.AdminManager,
                LessonPlanManager: window.LessonPlanManager,
                Utils,
                App
            };
            
            console.log('DEBUG 객체가 전역으로 설정되었습니다.');
            console.log('사용 예: DEBUG.SupabaseAPI.healthCheck()');
        }
    },

    // 시스템 상태 확인
    async checkSystemHealth() {
        try {
            console.log('🔍 시스템 상태 확인 중...');
            
            const healthStatus = await SupabaseAPI.healthCheck();
            console.log('시스템 상태:', healthStatus);
            
            if (healthStatus.status === 'healthy') {
                console.log('✅ 시스템이 정상 작동 중입니다.');
            } else {
                console.warn('⚠️ 시스템에 문제가 있을 수 있습니다:', healthStatus.error);
            }
            
            return healthStatus;
        } catch (error) {
            console.error('❌ 시스템 상태 확인 실패:', error);
            return { status: 'error', error: error.message };
        }
    }
};

// 앱 시작
App.init();

// 전역에서 접근 가능한 함수들
window.showAppInfo = () => App.showAppInfo();
window.showDebugInfo = () => App.showDebugInfo();
window.checkSystemHealth = () => App.checkSystemHealth();

// 개발 모드에서만 디버그 정보 출력
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('개발 모드에서 실행 중입니다.');
    console.log('showDebugInfo() 함수로 디버그 정보를 확인할 수 있습니다.');
    console.log('checkSystemHealth() 함수로 시스템 상태를 확인할 수 있습니다.');
}