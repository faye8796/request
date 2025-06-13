// 메인 애플리케이션 관리 모듈
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
        // 데이터 매니저는 이미 로드됨
        // 다른 모듈들은 필요시 지연 로딩
    },

    // 초기 라우트 처리
    handleInitialRoute() {
        const hash = window.location.hash;
        if (hash) {
            this.navigateByHash(hash);
        }
    },

    // 세션 복원 처리
    handleSessionRestore() {
        const userType = AuthManager.getUserType();
        
        if (userType === 'student') {
            // 학생의 경우 수업계획 상태 확인
            const studentId = DataManager.currentUser.id;
            const hasCompletedPlan = LessonPlanManager.hasCompletedLessonPlan(studentId);
            
            if (!hasCompletedPlan && LessonPlanManager.needsLessonPlan(studentId)) {
                this.showPage('lessonPlanPage');
                if (window.LessonPlanManager) {
                    LessonPlanManager.showLessonPlanPage();
                }
            } else {
                this.showPage('studentPage');
                if (window.StudentManager) {
                    StudentManager.init();
                }
            }
        } else if (userType === 'admin') {
            this.showPage('adminPage');
            if (window.AdminManager) {
                AdminManager.init();
            }
        } else {
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
        const notices = document.querySelectorAll('.lesson-plan-guidance-overlay, .lesson-plan-required-notice, .lesson-plan-draft-notice');
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

    // 페이지 표시 후 처리 (수정됨 - 수업계획 페이지는 스크롤 위치 복원 제외)
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
                    LessonPlanManager.init();
                    LessonPlanManager.showLessonPlanPage();
                }
                // 수업계획 페이지는 자연스러운 스크롤 동작 유지
                break;
                
            case 'studentPage':
                // 학생 페이지 초기화
                if (window.StudentManager) {
                    StudentManager.init();
                    StudentManager.refreshApplications();
                }
                break;
                
            case 'adminPage':
                // 관리자 페이지 초기화
                if (window.AdminManager) {
                    AdminManager.init();
                    AdminManager.refreshData();
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

    // 전역 에러 처리
    handleGlobalError(error) {
        console.error('전역 에러 발생:', error);
        
        // 에러 로깅
        this.logError(error);
        
        // 사용자에게 친화적인 에러 메시지 표시
        const userMessage = this.getUserFriendlyErrorMessage(error);
        Utils.showAlert(userMessage);
    },

    // 에러 로깅
    logError(error) {
        const errorInfo = {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
            stack: error.error ? error.error.stack : '',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
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
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return '네트워크 연결을 확인해주세요.';
        }
        
        if (error.message.includes('permission')) {
            return '권한이 없습니다. 다시 로그인해주세요.';
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
    },

    // 메모리 사용량 모니터링
    monitorMemoryUsage() {
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
    },

    // 성능 모니터링 설정
    setupPerformanceMonitoring() {
        // 페이지 로드 성능 측정
        window.addEventListener('load', () => {
            setTimeout(() => {
                if ('performance' in window) {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    if (navigation) {
                        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                        console.log(`페이지 로드 시간: ${loadTime}ms`);
                    }
                }
            }, 0);
        });
    },

    // 페이지 언로드 시 정리 (수정됨)
    onBeforeUnload() {
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
버전: 1.2.0
개발: Claude AI Assistant

이 플랫폼은 세종학당 문화인턴들의 교구 신청을 위해 개발되었습니다.

주요 기능:
• 학생별 개별 예산 관리
• 교구 신청 및 상태 추적
• 수업계획 작성 및 관리
• 관리자 승인 시스템
• Excel 데이터 내보내기

문의사항이 있으시면 관리자에게 연락해주세요.
        `;
        
        alert(info.trim());
    },

    // 디버그 정보 표시
    showDebugInfo() {
        if (confirm('개발자 모드를 활성화하시겠습니까?')) {
            console.log('=== 디버그 정보 ===');
            console.log('현재 사용자:', DataManager.currentUser);
            console.log('사용자 타입:', DataManager.currentUserType);
            console.log('전체 학생 수:', DataManager.students.length);
            console.log('전체 신청 수:', DataManager.applications.length);
            console.log('수업계획 수:', DataManager.lessonPlans.length);
            console.log('통계:', DataManager.getStats());
            console.log('수업계획 설정:', DataManager.lessonPlanSettings);
            
            // 개발자 도구 열기
            if (typeof console.table === 'function') {
                console.table(DataManager.students);
                console.table(DataManager.applications);
                console.table(DataManager.lessonPlans);
            }
            
            // 전역 변수로 접근 가능하게 설정
            window.DEBUG = {
                DataManager,
                AuthManager,
                StudentManager: window.StudentManager,
                AdminManager: window.AdminManager,
                LessonPlanManager: window.LessonPlanManager,
                Utils,
                App
            };
            
            console.log('DEBUG 객체가 전역으로 설정되었습니다.');
        }
    }
};

// 앱 시작
App.init();

// 전역에서 접근 가능한 함수들
window.showAppInfo = () => App.showAppInfo();
window.showDebugInfo = () => App.showDebugInfo();

// 개발 모드에서만 디버그 정보 출력
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('개발 모드에서 실행 중입니다.');
    console.log('showDebugInfo() 함수로 디버그 정보를 확인할 수 있습니다.');
}