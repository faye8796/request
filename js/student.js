// 학생 기능 핵심 매니저 - v5.2.1 API Helper 삭제된 함수 호출 수정
// 🎯 책임: 모듈 관리, 페이지 전환, 간단한 조정자 역할
// 📦 분리 완료: 교구신청, 배송지, 영수증, 수업계획, API, 알림 → 각각 독립 모듈
// 🔧 v5.2.1: API Helper에서 삭제된 updateUserDisplay() 함수 호출 제거

const StudentManager = {
    // === 모듈 시스템 ===
    modules: {},
    isInitialized: false,

    // 모듈 등록
    registerModule: function(name, module) {
        try {
            console.log('📦 모듈 등록:', name);
            this.modules[name] = module;
            
            // 모듈 초기화 (매니저 참조 전달)
            if (module.init && typeof module.init === 'function') {
                const initResult = module.init(this);
                if (initResult) {
                    console.log('✅ 모듈 초기화 성공:', name);
                } else {
                    console.warn('⚠️ 모듈 초기화 실패:', name);
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ 모듈 등록 오류:', name, error);
            return false;
        }
    },

    // 모듈 가져오기
    getModule: function(name) {
        return this.modules[name] || null;
    },

    // === 시스템 초기화 ===
    
    init: function() {
        if (this.isInitialized) {
            console.log('⚠️ StudentManager 이미 초기화됨 - 건너뜀');
            return Promise.resolve();
        }

        try {
            console.log('🎓 StudentManager v5.2.1 초기화 시작 (API Helper 삭제된 함수 호출 수정)');
            
            // 1. 모듈 로드
            this.loadAllModules();
            
            // 2. 기본 이벤트 리스너 설정
            this.setupCoreEventListeners();
            
            // 3. 초기 데이터 로드 (모듈에 위임)
            const self = this;
            return this.initializeModulesData()
                .then(function() {
                    self.isInitialized = true;
                    console.log('✅ StudentManager v5.2.1 초기화 완료');
                    
                    // 시스템 준비 완료 알림
                    const notificationSystem = self.getModule('notification');
                    if (notificationSystem) {
                        notificationSystem.showBasicNotice('✅ 시스템이 정상적으로 로드되었습니다.', 'success');
                    }
                })
                .catch(function(error) {
                    console.error('❌ StudentManager 초기화 오류:', error);
                    self.showFallbackInterface();
                    self.isInitialized = true;
                    return Promise.resolve();
                });
        } catch (error) {
            console.error('❌ StudentManager 초기화 오류:', error);
            this.showFallbackInterface();
            this.isInitialized = true;
            return Promise.resolve();
        }
    },

    // 모든 모듈 로드
    loadAllModules: function() {
        try {
            console.log('📦 모든 모듈 로드 시작');
            
            // 교구 신청 모듈
            if (typeof window.EquipmentRequestModule !== 'undefined') {
                this.registerModule('equipment', window.EquipmentRequestModule);
            }

            // 🔧 배송지 관리 모듈 - 올바른 모듈명으로 수정
            if (typeof window.ShippingManagementModule !== 'undefined') {
                console.log('📦 ShippingManagementModule 발견 - 등록 시작');
                this.registerModule('shipping', window.ShippingManagementModule);
            } else {
                console.warn('⚠️ ShippingManagementModule을 찾을 수 없습니다');
                // 폴백: 이전 이름도 확인
                if (typeof window.ShippingManagement !== 'undefined') {
                    console.log('📦 폴백: ShippingManagement 발견 - 등록');
                    this.registerModule('shipping', window.ShippingManagement);
                }
            }

            // 🔧 영수증 관리 모듈 - 올바른 모듈명으로 수정
            if (typeof window.ReceiptManagementModule !== 'undefined') {
                console.log('📄 ReceiptManagementModule 발견 - 등록 시작');
                this.registerModule('receipt', window.ReceiptManagementModule);
            } else {
                console.warn('⚠️ ReceiptManagementModule을 찾을 수 없습니다');
            }

            // 수업계획 도우미 모듈
            if (typeof window.LessonPlanHelper !== 'undefined') {
                this.registerModule('lessonPlan', window.LessonPlanHelper);
            }

            // API 도우미 모듈
            if (typeof window.ApiHelper !== 'undefined') {
                this.registerModule('api', window.ApiHelper);
            }

            // 알림 시스템 모듈
            if (typeof window.NotificationSystem !== 'undefined') {
                this.registerModule('notification', window.NotificationSystem);
            }
            
            console.log('📦 모듈 로드 완료. 등록된 모듈:', Object.keys(this.modules));
        } catch (error) {
            console.error('❌ 모듈 로드 오류:', error);
        }
    },

    // 모듈 데이터 초기화
    initializeModulesData: function() {
        try {
            console.log('📊 모듈 데이터 초기화 시작');
            
            const apiHelper = this.getModule('api');
            const lessonPlanHelper = this.getModule('lessonPlan');
            
            if (!apiHelper) {
                console.error('❌ API 도우미 모듈을 찾을 수 없습니다');
                return Promise.resolve();
            }

            // 🔧 v5.2.1: 삭제된 updateUserDisplay() 함수 호출 제거
            // 신청 내역 로드부터 시작
            return apiHelper.loadApplications()
                .then(function() {
                    // 예산 상태 업데이트
                    return apiHelper.updateBudgetStatus();
                })
                .then(function() {
                    // 수업계획 상태 확인
                    if (lessonPlanHelper && lessonPlanHelper.checkLessonPlanStatus) {
                        return lessonPlanHelper.checkLessonPlanStatus();
                    }
                    return Promise.resolve();
                })
                .then(function() {
                    console.log('✅ 모듈 데이터 초기화 완료');
                })
                .catch(function(error) {
                    console.warn('⚠️ 일부 모듈 데이터 초기화 오류 (계속 진행):', error);
                    return Promise.resolve();
                });
        } catch (error) {
            console.error('❌ 모듈 데이터 초기화 오류:', error);
            return Promise.resolve();
        }
    },

    // 핵심 이벤트 리스너 설정
    setupCoreEventListeners: function() {
        try {
            // 수업계획 버튼
            this.safeAddEventListener('#lessonPlanBtn', 'click', this.handleLessonPlanClick.bind(this));

            // 배송지 설정 버튼
            this.safeAddEventListener('#shippingAddressBtn', 'click', this.handleShippingClick.bind(this));

            // 모달 공통 이벤트들
            this.setupModalInteractionEvents();

            console.log('✅ 핵심 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 핵심 이벤트 리스너 설정 오류:', error);
        }
    },

    // === 이벤트 핸들러들 (모듈에 위임) ===

    // 수업계획 버튼 클릭
    handleLessonPlanClick: function() {
        const lessonPlanHelper = this.getModule('lessonPlan');
        if (lessonPlanHelper && lessonPlanHelper.handleLessonPlanClick) {
            return lessonPlanHelper.handleLessonPlanClick();
        } else {
            alert('수업계획 기능을 준비 중입니다.');
        }
    },

    // 🔧 배송지 버튼 클릭 - 개선된 오류 처리
    handleShippingClick: function() {
        console.log('📦 배송지 설정 버튼 클릭됨');
        
        const shippingModule = this.getModule('shipping');
        console.log('📦 배송지 모듈 상태:', shippingModule ? '✅ 발견됨' : '❌ 없음');
        
        if (shippingModule) {
            console.log('📦 배송지 모듈 메서드들:', Object.keys(shippingModule));
            
            if (shippingModule.showShippingModal) {
                console.log('📦 showShippingModal 메서드 호출 시작');
                return shippingModule.showShippingModal();
            } else {
                console.error('❌ showShippingModal 메서드를 찾을 수 없습니다');
                alert('배송지 설정 모듈에서 showShippingModal 함수를 찾을 수 없습니다.');
            }
        } else {
            console.error('❌ 배송지 모듈을 찾을 수 없습니다. 등록된 모듈들:', Object.keys(this.modules));
            alert('배송지 설정 기능을 준비 중입니다.');
        }
    },

    // === 교구 신청 관련 프록시 함수들 (호환성 보장) ===
    
    // 신청 모달 프록시 함수들
    showApplicationModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.showApplicationModal) {
            return equipmentModule.showApplicationModal();
        } else {
            alert('교구 신청 기능을 준비 중입니다. 잠시만 기다려주세요.');
        }
    },

    showBundleModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.showBundleModal) {
            return equipmentModule.showBundleModal();
        } else {
            alert('묶음 신청 기능을 준비 중입니다. 잠시만 기다려주세요.');
        }
    },

    // 폼 제출 프록시 함수들
    handleApplicationSubmit: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.handleApplicationSubmit) {
            return equipmentModule.handleApplicationSubmit();
        } else {
            alert('신청 제출 기능을 준비 중입니다.');
        }
    },

    handleBundleSubmit: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.handleBundleSubmit) {
            return equipmentModule.handleBundleSubmit();
        } else {
            alert('묶음 신청 제출 기능을 준비 중입니다.');
        }
    },

    // 수정/삭제 프록시 함수들
    editApplication: function(itemId) {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.editApplication) {
            return equipmentModule.editApplication(itemId);
        } else {
            alert('신청 수정 기능을 준비 중입니다.');
        }
    },

    deleteApplication: function(itemId) {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.deleteApplication) {
            return equipmentModule.deleteApplication(itemId);
        } else {
            alert('신청 삭제 기능을 준비 중입니다.');
        }
    },

    // 모달 숨김 프록시 함수들
    hideApplicationModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.hideApplicationModal) {
            return equipmentModule.hideApplicationModal();
        }
    },

    hideBundleModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.hideBundleModal) {
            return equipmentModule.hideBundleModal();
        }
    },

    // 폼 초기화 프록시 함수들
    resetApplicationForm: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.resetApplicationForm) {
            return equipmentModule.resetApplicationForm();
        }
    },

    resetBundleForm: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.resetBundleForm) {
            return equipmentModule.resetBundleForm();
        }
    },

    // 구매 방식 변경 프록시
    handlePurchaseMethodChange: function(method) {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.handlePurchaseMethodChange) {
            return equipmentModule.handlePurchaseMethodChange(method);
        }
    },

    // === 🔧 영수증 관리 프록시 함수들 - 로깅 강화 ===

    openReceiptModal: function(requestId) {
        console.log('📄 openReceiptModal 호출됨. requestId:', requestId);
        
        const receiptModule = this.getModule('receipt');
        console.log('📄 영수증 모듈 상태:', receiptModule ? '✅ 발견됨' : '❌ 없음');
        
        if (receiptModule) {
            console.log('📄 영수증 모듈 메서드들:', Object.keys(receiptModule));
            
            if (receiptModule.showReceiptModal) {
                console.log('📄 showReceiptModal 메서드 호출 시작');
                return receiptModule.showReceiptModal(requestId);
            } else {
                console.error('❌ showReceiptModal 메서드를 찾을 수 없습니다');
                alert('영수증 등록 모듈에서 showReceiptModal 함수를 찾을 수 없습니다.');
            }
        } else {
            console.error('❌ 영수증 모듈을 찾을 수 없습니다. 등록된 모듈들:', Object.keys(this.modules));
            alert('영수증 등록 기능을 준비 중입니다.');
        }
    },

    // 추가 영수증 관련 프록시 함수들
    showReceiptModal: function(requestId) {
        console.log('📄 showReceiptModal 직접 호출됨 (호환성)');
        return this.openReceiptModal(requestId);
    },

    // === API 호출 프록시 함수들 ===

    getCurrentUserSafely: function() {
        const apiHelper = this.getModule('api');
        if (apiHelper && apiHelper.getCurrentUserSafely) {
            return apiHelper.getCurrentUserSafely();
        }
        return null;
    },

    safeApiCall: function(apiFunction) {
        const apiHelper = this.getModule('api');
        if (apiHelper && apiHelper.safeApiCall) {
            return apiHelper.safeApiCall(apiFunction);
        }
        return Promise.reject(new Error('API 도우미를 찾을 수 없습니다'));
    },

    // === 페이지 전환 ===

    // 안전한 학생 대시보드로 이동
    goToStudentDashboard: function() {
        try {
            console.log('🔄 학생 대시보드로 이동 시작');
            
            // 1차: App.showPage 시도
            if (window.App && typeof window.App.showPage === 'function') {
                console.log('✅ App.showPage 사용하여 이동');
                window.App.showPage('studentPage');
                
                if (window.StudentManager && typeof window.StudentManager.init === 'function') {
                    window.StudentManager.init();
                }
                return true;
            }
            
            // 2차: CSS 클래스를 이용한 페이지 전환
            const studentPage = document.getElementById('studentPage');
            const lessonPlanPage = document.getElementById('lessonPlanPage');
            
            if (studentPage && lessonPlanPage) {
                console.log('✅ CSS 클래스 방식으로 페이지 전환');
                
                lessonPlanPage.classList.remove('active');
                studentPage.classList.add('active');
                
                const self = this;
                setTimeout(function() {
                    if (self.refreshDashboard) {
                        self.refreshDashboard();
                    }
                }, 200);
                
                return true;
            }
            
            // 3차: 직접 URL 이동 (폴백) - 정규표현식 수정
            console.warn('⚠️ 페이지 요소를 찾을 수 없음 - URL 이동 시도');
            const currentPath = window.location.pathname;
            const studentDashboardPath = window.location.origin + currentPath.replace(/\/[^\/]*$/, '/student/dashboard.html');
            window.location.href = studentDashboardPath;
            
            return false;
        } catch (error) {
            console.error('❌ 학생 대시보드 이동 오류:', error);
            window.location.reload();
            return false;
        }
    },

    // === 대시보드 새로고침 ===

    // 대시보드 새로고침
    refreshDashboard: function() {
        try {
            console.log('🔄 대시보드 새로고침');
            
            const apiHelper = this.getModule('api');
            const lessonPlanHelper = this.getModule('lessonPlan');
            
            if (!apiHelper) {
                console.warn('⚠️ API 도우미를 찾을 수 없습니다');
                return Promise.resolve();
            }

            // 알림 상태 초기화
            const notificationSystem = this.getModule('notification');
            if (notificationSystem) {
                notificationSystem.resetNoticeState();
            }
            
            return apiHelper.refreshDashboardData()
                .then(function() {
                    if (lessonPlanHelper && lessonPlanHelper.checkLessonPlanStatus) {
                        return lessonPlanHelper.checkLessonPlanStatus();
                    }
                    return Promise.resolve();
                })
                .then(function() {
                    console.log('✅ 대시보드 새로고침 완료');
                })
                .catch(function(error) {
                    console.error('❌ 대시보드 새로고침 오류:', error);
                });
        } catch (error) {
            console.error('❌ 대시보드 새로고침 오류:', error);
            return Promise.resolve();
        }
    },

    // === 공통 유틸리티 함수들 ===

    // 안전한 이벤트 리스너 추가
    safeAddEventListener: function(selector, event, handler) {
        const apiHelper = this.getModule('api');
        if (apiHelper && apiHelper.safeAddEventListener) {
            return apiHelper.safeAddEventListener(selector, event, handler);
        } else {
            // 폴백 구현
            try {
                const element = document.querySelector(selector);
                if (element) {
                    element.addEventListener(event, handler);
                    console.log('이벤트 리스너 추가: ' + selector);
                }
            } catch (error) {
                console.error('이벤트 리스너 추가 오류:', error);
            }
        }
    },

    // 가격 포맷팅
    formatPrice: function(price) {
        const apiHelper = this.getModule('api');
        if (apiHelper && apiHelper.formatPrice) {
            return apiHelper.formatPrice(price);
        } else {
            try {
                return new Intl.NumberFormat('ko-KR').format(price) + '원';
            } catch (error) {
                return price + '원';
            }
        }
    },

    // === 폴백 인터페이스 ===

    showFallbackInterface: function() {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            if (welcomeEl) {
                welcomeEl.textContent = '학생 대시보드';
            }
            
            const notificationSystem = this.getModule('notification');
            if (notificationSystem) {
                notificationSystem.showFallbackInterface();
            } else {
                alert('⚠️ 일부 기능을 불러오는 중입니다. 잠시만 기다려주세요.');
            }
        } catch (error) {
            console.error('폴백 인터페이스 표시 오류:', error);
        }
    },

    // 모달 상호작용 이벤트 설정 - 화살표 함수 제거
    setupModalInteractionEvents: function() {
        try {
            // ESC 키로 모달 닫기 - 일반 함수로 변경
            const self = this;
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.hideAllModals();
                }
            });
        } catch (error) {
            console.error('모달 상호작용 이벤트 설정 오류:', error);
        }
    },

    hideAllModals: function() {
        try {
            const modals = document.querySelectorAll('.modal');
            for (let i = 0; i < modals.length; i++) {
                modals[i].classList.remove('show');
            }
            
            document.body.style.overflow = '';
            
            this.hideApplicationModal();
            this.hideBundleModal();
        } catch (error) {
            console.error('모달 숨김 오류:', error);
        }
    }
};

// 전역 접근을 위한 window 객체에 추가
window.StudentManager = StudentManager;

// 전역 호환성 함수들
window.goToStudentDashboard = function() {
    console.log('🔄 전역 goToStudentDashboard 호출됨');
    
    if (window.StudentManager && typeof window.StudentManager.goToStudentDashboard === 'function') {
        return window.StudentManager.goToStudentDashboard();
    } else {
        console.error('❌ StudentManager.goToStudentDashboard를 찾을 수 없습니다');
        window.location.reload();
        return false;
    }
};

window.initializeStudentPage = function() {
    console.log('🔄 initializeStudentPage 호출됨 (호환성 함수)');
    
    if (typeof StudentManager !== 'undefined' && StudentManager.init) {
        return StudentManager.init();
    } else {
        console.error('❌ StudentManager를 찾을 수 없습니다');
        return Promise.reject(new Error('StudentManager를 찾을 수 없습니다'));
    }
};

console.log('📚 StudentManager v5.2.1 로드 완료 - API Helper 삭제된 함수 호출 수정');
