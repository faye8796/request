// 관리자 시스템 핵심 모듈 (admin-core.js)
const AdminManager = {
    // 초기화 상태 관리
    initialized: false,
    modules: {},
    eventListeners: {},

    // 초기화
    async init() {
        if (this.initialized) {
            console.log('⚠️ AdminManager already initialized');
            return;
        }

        console.log('🚀 AdminManager 초기화 시작...');
        
        try {
            // 이벤트 시스템 초기화
            this.initEventSystem();
            
            // 핵심 기능 초기화
            this.setupEventListeners();
            await this.loadStatistics();
            
            // 하위 모듈들 초기화 (순서 중요)
            await this.initializeModules();
            
            // 키보드 단축키 설정
            this.setupKeyboardShortcuts();

            this.initialized = true;
            console.log('✅ AdminManager 초기화 완료');
            
            // 초기화 완료 이벤트 발생
            this.emit('admin-initialized');
            
        } catch (error) {
            console.error('❌ AdminManager 초기화 실패:', error);
            throw error;
        }
    },

    // 모듈 초기화
    async initializeModules() {
        console.log('📦 하위 모듈들 초기화 중...');
        
        // 모듈 초기화 순서 (의존성 고려)
        const moduleInitOrder = [
            'Utils',     // 유틸리티 (다른 모든 모듈이 의존)
            'Modals',    // 모달 (UI 모듈들이 의존)
            'Budget',    // 예산 관리
            'LessonPlans', // 수업계획 관리
            'Applications', // 신청 관리
            'Features'   // 기능 관리
        ];

        for (const moduleName of moduleInitOrder) {
            try {
                const module = this[moduleName];
                if (module && typeof module.init === 'function') {
                    console.log(`🔧 ${moduleName} 모듈 초기화 중...`);
                    await module.init();
                    this.modules[moduleName] = module;
                    console.log(`✅ ${moduleName} 모듈 초기화 완료`);
                } else {
                    console.warn(`⚠️ ${moduleName} 모듈을 찾을 수 없거나 init 함수가 없습니다.`);
                }
            } catch (error) {
                console.error(`❌ ${moduleName} 모듈 초기화 실패:`, error);
                // 개별 모듈 실패가 전체 시스템을 중단시키지 않도록 함
            }
        }
        
        console.log('✅ 모든 모듈 초기화 완료');
    },

    // 이벤트 시스템 초기화
    initEventSystem() {
        this.eventListeners = {};
        console.log('📡 이벤트 시스템 초기화 완료');
    },

    // 이벤트 발생
    emit(eventName, data = null) {
        console.log(`📡 이벤트 발생: ${eventName}`, data);
        
        const listeners = this.eventListeners[eventName];
        if (listeners && listeners.length > 0) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`❌ 이벤트 리스너 실행 오류 (${eventName}):`, error);
                }
            });
        }
    },

    // 이벤트 리스너 등록
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
        console.log(`📡 이벤트 리스너 등록: ${eventName}`);
    },

    // 이벤트 리스너 제거
    off(eventName, callback) {
        const listeners = this.eventListeners[eventName];
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
                console.log(`📡 이벤트 리스너 제거: ${eventName}`);
            }
        }
    },

    // 핵심 이벤트 리스너 설정
    setupEventListeners() {
        console.log('🎧 핵심 이벤트 리스너 설정 중...');
        
        // 검색 기능
        Utils.on('#searchInput', 'input', Utils.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        // Excel 내보내기
        Utils.on('#exportBtn', 'click', () => this.handleExport());

        // 모듈 간 이벤트 연결
        this.setupInterModuleEvents();
        
        console.log('✅ 핵심 이벤트 리스너 설정 완료');
    },

    // 모듈 간 이벤트 연결 설정
    setupInterModuleEvents() {
        // 예산 업데이트 시 관련 모듈들 새로고침
        this.on('budget-updated', (data) => {
            console.log('💰 예산 업데이트 감지, 관련 UI 새로고침');
            this.refreshData(['statistics', 'applications']);
        });

        // 수업계획 승인/반려 시 예산 정보 새로고침
        this.on('lesson-plan-approved', (data) => {
            console.log('📚 수업계획 승인 감지, 예산 정보 새로고침');
            this.refreshData(['budget', 'statistics']);
        });

        this.on('lesson-plan-rejected', (data) => {
            console.log('📚 수업계획 반려 감지, 관련 UI 새로고침');
            this.refreshData(['statistics']);
        });

        // 신청 상태 변경 시 통계 새로고침
        this.on('application-status-changed', (data) => {
            console.log('📋 신청 상태 변경 감지, 통계 새로고침');
            this.refreshData(['statistics', 'budget']);
        });
    },

    // 수정된 loadStatistics 함수
    async loadStatistics() {
        try {
            console.log('📊 통계 데이터 로드 중...');
            const stats = await SupabaseAPI.getStats();

            const applicantCountEl = Utils.$('#applicantCount');
            const pendingCountEl = Utils.$('#pendingCount');
            const approvedCountEl = Utils.$('#approvedCount');
            const purchasedCountEl = Utils.$('#purchasedCount'); // ← 추가!

            if (applicantCountEl) {
                applicantCountEl.textContent = `${stats.applicantCount} / ${stats.totalStudents}`;
            }
            if (pendingCountEl) pendingCountEl.textContent = stats.pendingCount;
            if (approvedCountEl) approvedCountEl.textContent = stats.approvedCount;
            if (purchasedCountEl) purchasedCountEl.textContent = stats.purchasedCount || 0; // ← 추가!

            console.log('✅ 통계 데이터 로드 완료');
        } catch (error) {
            console.error('❌ 통계 로드 실패:', error);
        }
    },

    // 검색 처리
    handleSearch(searchTerm) {
        console.log('🔍 검색 요청:', searchTerm);
        
        // Applications 모듈이 있으면 검색 위임
        if (this.modules.Applications && typeof this.modules.Applications.handleSearch === 'function') {
            this.modules.Applications.handleSearch(searchTerm);
        } else {
            console.warn('⚠️ Applications 모듈을 찾을 수 없어 검색을 수행할 수 없습니다.');
        }
    },

    // Excel 내보내기 처리
    async handleExport() {
        console.log('📤 Excel 내보내기 요청');
        
        const exportBtn = Utils.$('#exportBtn');
        if (exportBtn) {
            Utils.showLoading(exportBtn);
        }
        
        try {
            const exportData = await SupabaseAPI.prepareExportData();
            
            if (exportData.length === 0) {
                Utils.showToast('내보낼 데이터가 없습니다.', 'warning');
            } else {
                const filename = `sejong_applications_${this.getDateString()}.csv`;
                Utils.downloadCSV(exportData, filename);
                Utils.showToast(`${exportData.length}건의 데이터를 내보냈습니다.`, 'success');
            }
        } catch (error) {
            Utils.showToast('데이터 내보내기 중 오류가 발생했습니다.', 'error');
            console.error('Export error:', error);
        } finally {
            if (exportBtn) {
                Utils.hideLoading(exportBtn);
            }
        }
    },

    // 데이터 새로고침 (선택적)
    async refreshData(targets = ['all']) {
        console.log('🔄 데이터 새로고침 요청:', targets);
        
        try {
            // 전체 새로고침
            if (targets.includes('all')) {
                await this.loadStatistics();
                
                // 각 모듈의 새로고침 함수 호출
                for (const [moduleName, module] of Object.entries(this.modules)) {
                    if (module && typeof module.refresh === 'function') {
                        await module.refresh();
                    }
                }
                return;
            }

            // 선택적 새로고침
            if (targets.includes('statistics')) {
                await this.loadStatistics();
            }
            
            if (targets.includes('budget') && this.modules.Budget) {
                await this.modules.Budget.loadBudgetOverview();
            }
            
            if (targets.includes('applications') && this.modules.Applications) {
                await this.modules.Applications.loadApplications();
            }
            
            if (targets.includes('lesson-plans') && this.modules.LessonPlans) {
                await this.modules.LessonPlans.loadLessonPlanManagement();
            }
            
        } catch (error) {
            console.error('❌ 데이터 새로고침 실패:', error);
            Utils.showToast('데이터 새로고침 중 오류가 발생했습니다.', 'error');
        }
    },

    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        console.log('⌨️ 키보드 단축키 설정 중...');
        
        document.addEventListener('keydown', (event) => {
            if (SupabaseAPI.currentUserType !== 'admin') return;

            // Ctrl/Cmd + F: 검색 포커스
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                const searchInput = Utils.$('#searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // F5: 새로고침
            if (event.key === 'F5') {
                event.preventDefault();
                this.refreshData();
            }

            // Ctrl/Cmd + E: Export
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                this.handleExport();
            }

            // Ctrl/Cmd + T: 테스트 모드 토글 (숨겨진 기능)
            if ((event.ctrlKey || event.metaKey) && event.key === 't') {
                event.preventDefault();
                if (this.modules.LessonPlans && typeof this.modules.LessonPlans.quickToggleTestMode === 'function') {
                    this.modules.LessonPlans.quickToggleTestMode();
                }
            }

            // Ctrl/Cmd + B: 예산 설정 모달
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                if (this.modules.Budget && typeof this.modules.Budget.showBudgetSettingsModal === 'function') {
                    this.modules.Budget.showBudgetSettingsModal();
                }
            }

            // Ctrl/Cmd + L: 수업계획 관리 모달
            if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
                event.preventDefault();
                if (this.modules.LessonPlans && typeof this.modules.LessonPlans.showLessonPlanManagementModal === 'function') {
                    this.modules.LessonPlans.showLessonPlanManagementModal();
                }
            }
        });
        
        console.log('✅ 키보드 단축키 설정 완료');
    },

    // 모듈 상태 확인
    getModuleStatus() {
        const status = {
            initialized: this.initialized,
            modules: {},
            eventListeners: Object.keys(this.eventListeners).length
        };

        for (const [moduleName, module] of Object.entries(this.modules)) {
            status.modules[moduleName] = {
                loaded: !!module,
                initialized: !!(module && module.initialized !== false)
            };
        }

        return status;
    },

    // 모듈 안전 호출
    safeCall(moduleName, functionName, ...args) {
        try {
            const module = this.modules[moduleName] || this[moduleName];
            if (module && typeof module[functionName] === 'function') {
                return module[functionName](...args);
            } else {
                console.warn(`⚠️ ${moduleName}.${functionName} 함수를 찾을 수 없습니다.`);
                return null;
            }
        } catch (error) {
            console.error(`❌ ${moduleName}.${functionName} 실행 오류:`, error);
            return null;
        }
    },

    // 날짜 문자열 생성 (파일명용)
    getDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    },

    // 🆕 호환성 함수들 (equipment-management.html과의 호환성을 위해)
    
    // 예산 설정 모달 표시 (호환성 함수)
    showBudgetSettingsModal() {
        console.log('💰 예산 설정 모달 호출 (호환성 함수)');
        return this.safeCall('Budget', 'showBudgetSettingsModal');
    },

    // 수업계획 관리 모달 표시 (호환성 함수)
    showLessonPlanManagementModal() {
        console.log('📚 수업계획 관리 모달 호출 (호환성 함수)');
        return this.safeCall('LessonPlans', 'showLessonPlanManagementModal');
    },

    // 수업계획 상세보기 모달 표시 (호환성 함수)
    showViewLessonPlanModal(studentId, lessonPlan) {
        console.log('👁️ 수업계획 상세보기 모달 호출 (호환성 함수)');
        return this.safeCall('LessonPlans', 'showViewLessonPlanModal', studentId, lessonPlan);
    },

    // 수업계획 승인 (호환성 함수)
    approveLessonPlan(studentId, buttonElement) {
        console.log('✅ 수업계획 승인 호출 (호환성 함수)');
        return this.safeCall('LessonPlans', 'approveLessonPlan', studentId, buttonElement);
    },

    // 수업계획 반려 (호환성 함수)
    rejectLessonPlan(studentId, buttonElement) {
        console.log('❌ 수업계획 반려 호출 (호환성 함수)');
        return this.safeCall('LessonPlans', 'rejectLessonPlan', studentId, buttonElement);
    },

    // 디버그 정보 출력
    debug() {
        console.group('🔍 AdminManager 디버그 정보');
        console.log('초기화 상태:', this.initialized);
        console.log('로드된 모듈:', Object.keys(this.modules));
        console.log('등록된 이벤트:', Object.keys(this.eventListeners));
        console.log('모듈 상태:', this.getModuleStatus());
        console.groupEnd();
    }
};

// 하위 모듈들을 위한 기본 구조 설정
AdminManager.Utils = AdminManager.Utils || {};
AdminManager.Modals = AdminManager.Modals || {};
AdminManager.Budget = AdminManager.Budget || {};
AdminManager.LessonPlans = AdminManager.LessonPlans || {};
AdminManager.Applications = AdminManager.Applications || {};
AdminManager.Features = AdminManager.Features || {};

// 기존 AdminManager 함수들과의 호환성을 위한 별명들
AdminManager.initializeAdminDashboard = function() {
    console.log('🔄 initializeAdminDashboard 호출됨 (호환성)');
    return this.init();
};

AdminManager.loadAdminApplications = function() {
    console.log('🔄 loadAdminApplications 호출됨 (호환성)');
    return this.safeCall('Applications', 'loadApplications');
};

// 전역 접근을 위해 window 객체에 추가
window.AdminManager = AdminManager;

console.log('🚀 AdminManager Core v3.1 loaded (with compatibility functions)');

// 🔧 수정: 특정 페이지에서만 자동 초기화하지 않도록 조건 추가
const shouldAutoInit = !window.location.pathname.includes('equipment-management.html') && 
                       !window.location.pathname.includes('flight-management.html') &&
                       !window.AdminManagerManualInit; // 수동 초기화 플래그

// DOM이 준비되면 자동 초기화 (조건부)
if (shouldAutoInit) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const checkAndInit = () => {
                if (window.SupabaseAPI && typeof window.SupabaseAPI.ensureClient === 'function') {
                    AdminManager.init().catch(error => {
                        console.error('❌ AdminManager 자동 초기화 실패:', error);
                    });
                } else {
                    setTimeout(checkAndInit, 100);
                }
            };
            
            setTimeout(checkAndInit, 500);
        });
    } else {
        setTimeout(() => {
            if (window.SupabaseAPI && typeof window.SupabaseAPI.ensureClient === 'function') {
                AdminManager.init().catch(error => {
                    console.error('❌ AdminManager 자동 초기화 실패:', error);
                });
            }
        }, 100);
    }
} else {
    console.log('🔧 AdminManager 자동 초기화 비활성화 (수동 초기화 페이지)');
}