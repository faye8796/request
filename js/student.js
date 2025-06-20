// 학생 기능 관리 모듈 (Supabase 연동) - 교구 신청 기능 활성화 버전 - 시스템 초기화 실패 문제 해결
// 🧹 Placeholder 함수들 제거 완료 - student-addon.js와 충돌 방지 (v1.9.0)
// 🔧 v1.9.1 - 묶음신청 카드 참고링크 표시 버그 수정
const StudentManager = {
    currentEditingItem: null,
    currentReceiptItem: null,
    isInitialized: false,
    noticeDisplayed: false, // 중복 알림 방지 플래그

    // 🔧 초기화 - 안전성 강화 및 오류 처리 개선
    init: function() {
        if (this.isInitialized) {
            console.log('⚠️ StudentManager 이미 초기화됨 - 건너뜀');
            return Promise.resolve();
        }

        try {
            console.log('🎓 StudentManager 초기화 시작');
            this.setupEventListeners();
            
            const self = this;
            return this.updateUserDisplay()
                .then(function() {
                    return self.loadApplications();
                })
                .then(function() {
                    return self.updateBudgetStatus();
                })
                .then(function() {
                    // 🔧 수업계획 상태 확인에서 오류가 발생해도 초기화를 완료로 처리
                    return self.checkLessonPlanStatus().catch(function(error) {
                        console.warn('수업계획 상태 확인 중 오류 발생 (계속 진행):', error);
                        return Promise.resolve(); // 오류 무시하고 계속 진행
                    });
                })
                .then(function() {
                    self.isInitialized = true;
                    console.log('✅ StudentManager 초기화 완료');
                    
                    // 초기화 완료 후 기본 안내 메시지 표시
                    if (!self.noticeDisplayed) {
                        self.showBasicNotice('✅ 시스템이 정상적으로 로드되었습니다.');
                    }
                })
                .catch(function(error) {
                    console.error('❌ StudentManager 초기화 오류:', error);
                    // 초기화 실패 시에도 기본 UI는 표시
                    self.showFallbackInterface();
                    // 최소한의 기능이라도 작동하도록 처리
                    self.isInitialized = true; // 재시도 방지
                    return Promise.resolve(); // 오류를 해결된 것으로 처리
                });
        } catch (error) {
            console.error('❌ StudentManager 초기화 오류:', error);
            this.showFallbackInterface();
            this.isInitialized = true; // 재시도 방지
            return Promise.resolve(); // 오류를 해결된 것으로 처리
        }
    },

    // 🆕 안전한 학생 대시보드로 이동 함수
    goToStudentDashboard: function() {
        try {
            console.log('🔄 학생 대시보드로 이동 시작');
            
            // 1차: App.showPage 시도 (기존 방식)
            if (window.App && typeof window.App.showPage === 'function') {
                console.log('✅ App.showPage 사용하여 이동');
                window.App.showPage('studentPage');
                
                // StudentManager 초기화
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
                
                // 수업계획 페이지 숨김
                lessonPlanPage.classList.remove('active');
                // 학생 대시보드 표시
                studentPage.classList.add('active');
                
                // 대시보드 새로고침
                setTimeout(() => {
                    if (this.refreshDashboard) {
                        this.refreshDashboard();
                    }
                }, 200);
                
                return true;
            }
            
            // 3차: 직접 URL 이동 (폴백)
            console.warn('⚠️ 페이지 요소를 찾을 수 없음 - URL 이동 시도');
            const studentDashboardPath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/student/dashboard.html');
            window.location.href = studentDashboardPath;
            
            return false;
        } catch (error) {
            console.error('❌ 학생 대시보드 이동 오류:', error);
            
            // 최후 수단: 페이지 새로고침
            console.log('🔄 페이지 새로고침으로 복구 시도');
            window.location.reload();
            
            return false;
        }
    },

    // 기본 인터페이스 표시 (오류 시 폴백)
    showFallbackInterface: function() {
        try {
            // 기본 사용자 정보 표시
            const welcomeEl = document.getElementById('studentWelcome');
            if (welcomeEl) {
                welcomeEl.textContent = '학생 대시보드';
            }

            // 기본 알림 표시
            this.showBasicNotice('⚠️ 일부 기능을 불러오는 중입니다. 잠시만 기다려주세요.');
        } catch (error) {
            console.error('폴백 인터페이스 표시 오류:', error);
        }
    },

    // 기본 알림 표시
    showBasicNotice: function(message) {
        try {
            const existingNotice = document.getElementById('basicNotice');
            if (existingNotice) {
                existingNotice.remove();
            }

            const notice = document.createElement('div');
            notice.id = 'basicNotice';
            notice.className = 'dashboard-notice warning';
            notice.innerHTML = `
                <div class="notice-content warning">
                    <i data-lucide="alert-triangle"></i>
                    <div>
                        <h4>시스템 상태</h4>
                        <p>${message}</p>
                    </div>
                </div>
            `;

            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('기본 알림 표시 오류:', error);
        }
    },

    // 이벤트 리스너 설정 - 안전성 강화
    setupEventListeners: function() {
        try {
            // 중복 방지를 위한 리스너 제거
            this.removeEventListeners();

            // 새 교구 신청 버튼 - student-addon.js에서 구현
            this.safeAddEventListener('#newApplicationBtn', 'click', function() {
                // student-addon.js에서 showApplicationModal 구현을 기다림
                if (window.StudentManager && typeof window.StudentManager.showApplicationModal === 'function') {
                    window.StudentManager.showApplicationModal();
                } else {
                    alert('교구 신청 기능을 준비 중입니다. 잠시만 기다려주세요.');
                }
            });
            
            // 묶음 신청 버튼 - student-addon.js에서 구현
            this.safeAddEventListener('#bundleApplicationBtn', 'click', function() {
                // student-addon.js에서 showBundleModal 구현을 기다림
                if (window.StudentManager && typeof window.StudentManager.showBundleModal === 'function') {
                    window.StudentManager.showBundleModal();
                } else {
                    alert('묶음 신청 기능을 준비 중입니다. 잠시만 기다려주세요.');
                }
            });
            
            // 배송지 설정 버튼 - student-addon.js에서 처리
            this.safeAddEventListener('#shippingAddressBtn', 'click', function() {
                if (window.StudentAddon && window.StudentAddon.showShippingModal) {
                    window.StudentAddon.showShippingModal();
                } else {
                    alert('배송지 설정 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
                }
            });

            // 🆕 수업계획 버튼 - 간단화된 버전 (edit 모드로 통일)
            this.safeAddEventListener('#lessonPlanBtn', 'click', this.handleLessonPlanClick.bind(this));

            // 모달 관련 이벤트들
            this.setupModalEventListeners();

            console.log('✅ 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 오류:', error);
        }
    },

    // 🆕 수업계획 버튼 클릭 처리 - 간단화된 버전 (edit 모드로 통일)
    handleLessonPlanClick: function() {
        try {
            console.log('📋 수업계획 버튼 클릭 - edit 모드로 표시');
            
            // 사용자 확인
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            const self = this;
            
            // 기존 수업계획 조회
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(existingPlan) {
                // 페이지 전환
                const studentPage = document.getElementById('studentPage');
                const lessonPlanPage = document.getElementById('lessonPlanPage');
                
                if (studentPage && lessonPlanPage) {
                    // 현재 페이지 숨김
                    studentPage.classList.remove('active');
                    // 수업계획 페이지 표시
                    lessonPlanPage.classList.add('active');
                    
                    console.log('✅ 수업계획 페이지 활성화 완료');
                } else {
                    console.error('❌ 페이지 요소를 찾을 수 없습니다');
                    alert('수업계획 페이지를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                    return;
                }

                // LessonPlanManager 초기화 (edit 모드)
                if (typeof LessonPlanManager !== 'undefined') {
                    setTimeout(function() {
                        try {
                            if (typeof LessonPlanManager.showLessonPlanPage === 'function') {
                                // edit 모드로 수업계획 표시
                                LessonPlanManager.showLessonPlanPage('edit', existingPlan);
                                console.log('✅ LessonPlanManager edit 모드 초기화 완료');
                            } else {
                                console.warn('⚠️ LessonPlanManager.showLessonPlanPage 함수를 찾을 수 없습니다');
                                alert('수업계획 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
                            }
                        } catch (error) {
                            console.error('❌ LessonPlanManager 처리 오류:', error);
                            alert('수업계획 시스템 오류가 발생했습니다.');
                        }
                    }, 200);
                } else {
                    console.error('❌ LessonPlanManager를 찾을 수 없습니다');
                    alert('수업계획 관리 시스템을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                }
            }).catch(function(error) {
                console.error('❌ 수업계획 조회 오류:', error);
                alert('수업계획 데이터를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
            });
        } catch (error) {
            console.error('❌ 수업계획 버튼 클릭 처리 오류:', error);
            alert('수업계획 페이지로 이동하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    },

    // 🔧 안전한 사용자 정보 가져오기 - localStorage에서 직접 접근하도록 수정
    getCurrentUserSafely: function() {
        try {
            console.log('👤 getCurrentUserSafely 호출됨');
            
            // 먼저 localStorage에서 직접 가져오기 시도
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    if (studentData && studentData.id) {
                        console.log('✅ localStorage에서 사용자 데이터 가져옴:', {
                            id: studentData.id,
                            name: studentData.name
                        });
                        return studentData;
                    }
                } catch (parseError) {
                    console.error('localStorage 데이터 파싱 오류:', parseError);
                }
            }

            // localStorage 실패 시 AuthManager 시도 (기존 방식)
            if (typeof AuthManager !== 'undefined' && AuthManager.getCurrentUser) {
                const authUser = AuthManager.getCurrentUser();
                if (authUser) {
                    console.log('✅ AuthManager에서 사용자 데이터 가져옴');
                    return authUser;
                }
            }

            console.warn('⚠️ 사용자 정보를 찾을 수 없습니다');
            return null;
        } catch (error) {
            console.error('❌ 사용자 정보 가져오기 오류:', error);
            return null;
        }
    },

    // 🔧 안전한 API 호출 래퍼 개선
    safeApiCall: function(apiFunction) {
        try {
            if (typeof apiFunction === 'function') {
                const result = apiFunction();
                
                // Promise가 반환되는 경우
                if (result && typeof result.then === 'function') {
                    return result.catch(function(error) {
                        console.error('API 호출 중 오류:', error);
                        // 특정 오류 타입에 따른 처리
                        if (error.message && error.message.includes('PGRST116')) {
                            return null; // 데이터 없음을 의미
                        }
                        throw error; // 다른 오류는 상위로 전파
                    });
                }
                
                // 동기 결과인 경우
                return Promise.resolve(result);
            }
            return Promise.reject(new Error('API 함수가 유효하지 않습니다'));
        } catch (error) {
            console.error('API 호출 오류:', error);
            return Promise.reject(error);
        }
    },

    // 안전한 이벤트 리스너 추가
    safeAddEventListener: function(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
                console.log('이벤트 리스너 추가: ' + selector);
            } else {
                console.warn('요소를 찾을 수 없음: ' + selector);
            }
        } catch (error) {
            console.error('이벤트 리스너 추가 오류 (' + selector + '):', error);
        }
    },

    // 이벤트 리스너 제거
    removeEventListeners: function() {
        try {
            const selectors = [
                '#newApplicationBtn',
                '#bundleApplicationBtn', 
                '#shippingAddressBtn',
                '#lessonPlanBtn'
            ];

            selectors.forEach(function(selector) {
                const element = document.querySelector(selector);
                if (element) {
                    // 기존 리스너들을 제거하기 위해 클론으로 교체
                    const newElement = element.cloneNode(true);
                    element.parentNode.replaceChild(newElement, element);
                }
            });
        } catch (error) {
            console.error('이벤트 리스너 제거 오류:', error);
        }
    },

    // 모달 이벤트 리스너 설정
    setupModalEventListeners: function() {
        try {
            // 일반 신청 모달
            this.safeAddEventListener('#cancelBtn', 'click', this.hideApplicationModal.bind(this));
            this.safeAddEventListener('#applicationForm', 'submit', function(e) {
                e.preventDefault();
                // student-addon.js에서 handleApplicationSubmit 구현을 기다림
                if (window.StudentManager && typeof window.StudentManager.handleApplicationSubmit === 'function') {
                    window.StudentManager.handleApplicationSubmit();
                } else {
                    alert('신청 제출 기능을 준비 중입니다.');
                }
            }.bind(this));

            // 묶음 신청 모달
            this.safeAddEventListener('#bundleCancelBtn', 'click', this.hideBundleModal.bind(this));
            this.safeAddEventListener('#bundleForm', 'submit', function(e) {
                e.preventDefault();
                // student-addon.js에서 handleBundleSubmit 구현을 기다림
                if (window.StudentManager && typeof window.StudentManager.handleBundleSubmit === 'function') {
                    window.StudentManager.handleBundleSubmit();
                } else {
                    alert('묶음 신청 제출 기능을 준비 중입니다.');
                }
            }.bind(this));

            // 🆕 배송지 모달 이벤트 리스너 추가
            this.safeAddEventListener('#shippingCancelBtn', 'click', function() {
                if (window.StudentAddon && window.StudentAddon.hideShippingModal) {
                    window.StudentAddon.hideShippingModal();
                }
            });
            this.safeAddEventListener('#shippingForm', 'submit', function(e) {
                e.preventDefault();
                if (window.StudentAddon && window.StudentAddon.handleShippingSubmit) {
                    window.StudentAddon.handleShippingSubmit();
                }
            });

            // 영수증 모달
            this.safeAddEventListener('#receiptCancelBtn', 'click', this.hideReceiptModal.bind(this));
            this.safeAddEventListener('#receiptForm', 'submit', function(e) {
                e.preventDefault();
                // student-addon.js에서 handleReceiptSubmit 구현을 기다림
                if (window.StudentManager && typeof window.StudentManager.handleReceiptSubmit === 'function') {
                    window.StudentManager.handleReceiptSubmit();
                } else {
                    alert('영수증 제출 기능을 준비 중입니다.');
                }
            }.bind(this));

            // 구매 방식 변경
            const purchaseMethodInputs = document.querySelectorAll('input[name="purchaseMethod"]');
            const self = this;
            for (let i = 0; i < purchaseMethodInputs.length; i++) {
                purchaseMethodInputs[i].addEventListener('change', function(e) {
                    self.handlePurchaseMethodChange(e.target.value);
                });
            }

            // 기타 모달 이벤트들
            this.setupModalInteractionEvents();
        } catch (error) {
            console.error('모달 이벤트 리스너 설정 오류:', error);
        }
    },

    // 모달 상호작용 이벤트 설정
    setupModalInteractionEvents: function() {
        try {
            // 모달 배경 클릭으로 닫기 (개선된 방식) - 배송지 모달 추가
            const modals = ['#applicationModal', '#bundleModal', '#shippingModal', '#receiptModal'];
            const self = this;
            
            modals.forEach(function(modalId) {
                self.safeAddEventListener(modalId, 'click', function(e) {
                    // 모달 자체를 클릭했을 때만 닫기 (내용 영역 클릭 시에는 닫지 않음)
                    if (e.target === e.currentTarget) {
                        if (modalId === '#shippingModal' && window.StudentAddon) {
                            window.StudentAddon.hideShippingModal();
                        } else {
                            self.hideModal(modalId);
                        }
                    }
                });
            });
            
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.hideAllModals();
                    // 배송지 모달도 함께 닫기
                    if (window.StudentAddon && window.StudentAddon.hideShippingModal) {
                        window.StudentAddon.hideShippingModal();
                    }
                }
            });

            // 영수증 파일 업로드 - student-addon.js에서 구현
            this.safeAddEventListener('#receiptFile', 'change', function(event) {
                if (window.StudentManager && typeof window.StudentManager.handleReceiptFileChange === 'function') {
                    window.StudentManager.handleReceiptFileChange(event);
                }
            });
            this.safeAddEventListener('#removeReceiptBtn', 'click', function() {
                if (window.StudentManager && typeof window.StudentManager.removeReceiptFile === 'function') {
                    window.StudentManager.removeReceiptFile();
                }
            });

            // 드래그 앤 드롭 - student-addon.js에서 구현
            if (window.StudentManager && typeof window.StudentManager.setupDragAndDrop === 'function') {
                window.StudentManager.setupDragAndDrop();
            }
        } catch (error) {
            console.error('모달 상호작용 이벤트 설정 오류:', error);
        }
    },

    // 개선된 모달 숨김 함수 (일반화)
    hideModal: function(modalSelector) {
        try {
            const modal = document.querySelector(modalSelector);
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
                
                // 해당 모달의 폼 초기화
                if (modalSelector === '#applicationModal') {
                    this.resetApplicationForm();
                    this.currentEditingItem = null;
                } else if (modalSelector === '#bundleModal') {
                    this.resetBundleForm();
                } else if (modalSelector === '#receiptModal') {
                    this.resetReceiptForm();
                    this.currentReceiptItem = null;
                }
            }
        } catch (error) {
            console.error('모달 숨김 오류:', error);
        }
    },

    // 모든 모달 숨김 (개선된 방식)
    hideAllModals: function() {
        try {
            // 모든 모달에서 show 클래스 제거
            const modals = document.querySelectorAll('.modal');
            for (let i = 0; i < modals.length; i++) {
                modals[i].classList.remove('show');
            }
            
            // body 스크롤 복원
            document.body.style.overflow = '';
            
            // 개별 모달 숨김 함수 호출
            this.hideApplicationModal();
            this.hideBundleModal();
            this.hideReceiptModal();
        } catch (error) {
            console.error('모달 숨김 오류:', error);
        }
    },

    // === 모달 숨김 함수들 (구현된 기능만 유지) ===
    
    hideApplicationModal: function() {
        try {
            console.log('일반 교구 신청 모달 숨김');
            this.hideModal('#applicationModal');
        } catch (error) {
            console.error('일반 교구 신청 모달 숨김 오류:', error);
        }
    },

    hideBundleModal: function() {
        try {
            console.log('묶음 신청 모달 숨김');
            this.hideModal('#bundleModal');
        } catch (error) {
            console.error('묶음 신청 모달 숨김 오류:', error);
        }
    },

    hideReceiptModal: function() {
        try {
            console.log('영수증 모달 숨김');
            this.hideModal('#receiptModal');
        } catch (error) {
            console.error('영수증 모달 숨김 오류:', error);
        }
    },

    openReceiptModal: function(requestId) {
        try {
            console.log('📄 영수증 모달 열기:', requestId);
            // student-addon.js에서 showReceiptModal 구현을 기다림
            if (window.StudentManager && typeof window.StudentManager.showReceiptModal === 'function') {
                return window.StudentManager.showReceiptModal(requestId);
            } else {
                alert('영수증 등록 기능을 준비 중입니다.');
                return Promise.reject(new Error('영수증 기능 준비 중'));
            }
        } catch (error) {
            console.error('영수증 모달 열기 오류:', error);
            alert('영수증 등록을 여는 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // === 폼 초기화 함수들 ===
    
    resetApplicationForm: function() {
        try {
            const form = document.getElementById('applicationForm');
            if (form) {
                form.reset();
                
                const onlineRadio = form.querySelector('input[name="purchaseMethod"][value="online"]');
                if (onlineRadio) {
                    onlineRadio.checked = true;
                    this.handlePurchaseMethodChange('online');
                }
            }
        } catch (error) {
            console.error('일반 신청 폼 초기화 오류:', error);
        }
    },

    resetBundleForm: function() {
        try {
            const form = document.getElementById('bundleForm');
            if (form) {
                form.reset();
            }
        } catch (error) {
            console.error('묶음 신청 폼 초기화 오류:', error);
        }
    },

    resetReceiptForm: function() {
        try {
            const form = document.getElementById('receiptForm');
            if (form) {
                form.reset();
            }
            
            // student-addon.js에서 removeReceiptFile 구현을 기다림
            if (window.StudentManager && typeof window.StudentManager.removeReceiptFile === 'function') {
                window.StudentManager.removeReceiptFile();
            }
        } catch (error) {
            console.error('영수증 폼 초기화 오류:', error);
        }
    },

    // 구매 방식 변경 처리
    handlePurchaseMethodChange: function(method) {
        try {
            const linkGroup = document.getElementById('itemLinkGroup');
            const linkLabel = document.getElementById('itemLinkLabel');
            const linkInput = document.getElementById('itemLink');
            
            if (method === 'offline') {
                if (linkLabel) linkLabel.textContent = '참고 링크 (선택)';
                if (linkInput) {
                    linkInput.placeholder = '참고할 수 있는 링크가 있다면 입력하세요';
                    linkInput.removeAttribute('required');
                }
            } else {
                if (linkLabel) linkLabel.textContent = '구매 링크 *';
                if (linkInput) {
                    linkInput.placeholder = '구매 가능한 링크를 입력하세요';
                    linkInput.setAttribute('required', 'required');
                }
            }
        } catch (error) {
            console.error('구매 방식 변경 처리 오류:', error);
        }
    },

    // === 사용자 정보 및 상태 관리 ===

    // 사용자 정보 표시 업데이트 - 안전성 강화
    updateUserDisplay: function() {
        try {
            console.log('👤 사용자 정보 표시 업데이트 시작');
            
            // AuthManager 존재 확인
            if (typeof AuthManager === 'undefined' || !AuthManager.updateUserDisplay) {
                console.error('AuthManager 또는 updateUserDisplay 메서드를 찾을 수 없습니다');
                this.showFallbackUserInfo();
                return Promise.resolve();
            }

            const self = this;
            return AuthManager.updateUserDisplay().then(function() {
                console.log('✅ 사용자 정보 표시 업데이트 완료');
            }).catch(function(error) {
                console.error('❌ 사용자 정보 표시 업데이트 오류:', error);
                self.showFallbackUserInfo();
            });
        } catch (error) {
            console.error('❌ 사용자 정보 표시 업데이트 오류:', error);
            this.showFallbackUserInfo();
            return Promise.resolve(); // 오류를 해결된 것으로 처리
        }
    },

    // 폴백 사용자 정보 표시
    showFallbackUserInfo: function() {
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

    // 🔧 수업계획 상태 확인 및 UI 업데이트 - 개선된 버전 (오류 처리 강화)
    checkLessonPlanStatus: function() {
        try {
            // 중복 실행 방지
            if (this.noticeDisplayed) {
                console.log('⚠️ 수업계획 상태 알림이 이미 표시됨 - 건너뜀');
                return Promise.resolve();
            }

            console.log('📋 수업계획 상태 확인 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showLessonPlanRequiredNotice();
                this.noticeDisplayed = true; // 플래그 설정
                return Promise.resolve(); // 오류가 아닌 정상 완료로 처리
            }

            const self = this;
            
            // 🔧 안전한 API 호출 - 오류 시에도 시스템 초기화를 중단하지 않음
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(lessonPlan) {
                // 수업계획 버튼 업데이트
                self.updateLessonPlanButton(lessonPlan);
                
                // 교구 신청 버튼 상태 업데이트 (오류가 있어도 계속 진행)
                return self.updateApplicationButtonsState(lessonPlan).then(function() {
                    // 수업계획 상태 알림 표시 (단일 알림만)
                    return self.showLessonPlanStatusNotice(lessonPlan);
                }).then(function() {
                    // 알림 표시 완료 플래그 설정
                    self.noticeDisplayed = true;
                    console.log('✅ 수업계획 상태 확인 완료');
                }).catch(function(error) {
                    // 내부 오류가 있어도 기본 처리는 완료
                    console.warn('수업계획 상태 처리 중 일부 오류 발생:', error);
                    self.noticeDisplayed = true;
                    return Promise.resolve(); // 계속 진행
                });
            }).catch(function(apiError) {
                console.error('수업계획 조회 API 오류:', apiError);
                // API 오류가 있어도 기본 알림은 표시
                self.showApiErrorNotice();
                self.noticeDisplayed = true;
                return Promise.resolve(); // 오류를 해결된 것으로 처리
            });
        } catch (error) {
            console.error('❌ 수업계획 상태 확인 오류:', error);
            this.showErrorNotice('수업계획 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
            this.noticeDisplayed = true;
            return Promise.resolve(); // 초기화 체인을 유지하기 위해 오류를 해결된 것으로 처리
        }
    },

    // 🔧 수업계획 버튼 업데이트 (단순화된 상태 확인)
    updateLessonPlanButton: function(lessonPlan) {
        try {
            const lessonPlanBtn = document.getElementById('lessonPlanBtn');
            if (!lessonPlanBtn) {
                console.warn('수업계획 버튼을 찾을 수 없습니다');
                return;
            }

            // 🔧 단순화된 상태 확인 (approved_at, approved_by 제거 반영)
            if (lessonPlan) {
                if (lessonPlan.status === 'approved') {
                    // 승인된 경우
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-check"></i>
                        수업계획 승인됨 (확인가능)
                    `;
                    lessonPlanBtn.className = 'btn btn-success';
                } else if (lessonPlan.status === 'rejected') {
                    // 반려된 경우
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-x"></i>
                        수업계획 수정 필요
                    `;
                    lessonPlanBtn.className = 'btn btn-danger';
                } else if (lessonPlan.status === 'submitted') {
                    // 제출됨 (승인 대기 중)
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-clock"></i>
                        수업계획 확인 (승인대기중)
                    `;
                    lessonPlanBtn.className = 'btn btn-warning';
                } else {
                    // 임시저장 상태
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-edit"></i>
                        수업계획 완료하기 (필수)
                    `;
                    lessonPlanBtn.className = 'btn btn-warning';
                }
            } else {
                // 미작성 상태
                lessonPlanBtn.innerHTML = `
                    <i data-lucide="calendar-plus"></i>
                    수업계획 작성하기 (필수)
                `;
                lessonPlanBtn.className = 'btn btn-warning';
            }

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('수업계획 버튼 업데이트 오류:', error);
            // 오류가 있어도 기본 버튼 텍스트는 유지
        }
    },

    // 🔧 교구 신청 버튼 상태 업데이트 - 수정된 승인 로직
    updateApplicationButtonsState: function(lessonPlan) {
        try {
            console.log('🔘 교구 신청 버튼 상태 업데이트');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                this.disableApplicationButtons('로그인이 필요합니다');
                return Promise.resolve();
            }

            // 🔧 수정된 수업계획 승인 상태 확인 로직
            const isLessonPlanApproved = lessonPlan && lessonPlan.status === 'approved';
            
            if (!isLessonPlanApproved) {
                // 수업계획이 승인되지 않았으면 교구 신청 불가
                let message = '수업계획 승인 후 신청 가능합니다 (필수)';
                
                if (!lessonPlan) {
                    message = '수업계획 작성 후 승인받아야 신청 가능합니다 (필수)';
                } else if (lessonPlan.status === 'submitted') {
                    message = '수업계획 승인 대기 중 - 승인 후 신청 가능합니다';
                } else if (lessonPlan.status === 'rejected') {
                    message = '수업계획이 반려됨 - 수정 후 승인받아야 신청 가능합니다';
                } else if (lessonPlan.status === 'draft') {
                    message = '수업계획 완료 제출 후 승인받아야 신청 가능합니다 (필수)';
                }
                
                this.disableApplicationButtons(message);
                return Promise.resolve();
            }

            const self = this;
            
            // 수업계획이 승인된 경우 예산 상태 확인 (안전한 호출)
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                if (!budgetStatus || budgetStatus.allocated === 0) {
                    self.disableApplicationButtons('예산 배정 처리 중입니다. 잠시만 기다려주세요.');
                } else {
                    // 교구 신청 가능
                    self.enableApplicationButtons();
                    console.log('✅ 교구 신청 버튼 활성화됨');
                }
                console.log('✅ 교구 신청 버튼 상태 업데이트 완료');
            }).catch(function(error) {
                console.error('예산 상태 조회 오류:', error);
                // 오류가 있어도 시스템을 완전히 차단하지 않음
                self.disableApplicationButtons('예산 정보를 불러올 수 없습니다');
                return Promise.resolve(); // 오류를 해결된 것으로 처리
            });
        } catch (error) {
            console.error('❌ 교구 신청 버튼 상태 업데이트 오류:', error);
            this.disableApplicationButtons('시스템 오류 - 잠시 후 다시 시도해주세요');
            return Promise.resolve(); // 오류를 해결된 것으로 처리하여 초기화 체인 유지
        }
    },

    // 교구 신청 버튼 비활성화
    disableApplicationButtons: function(reason) {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(function(btnId) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = true;
                    btn.title = reason;
                    btn.classList.add('disabled');
                    
                    // 버튼 텍스트에 상태 표시 추가
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 교구 신청 (승인 필요)';
                    } else {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 묶음 신청 (승인 필요)';
                    }
                }
            });
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('교구 신청 버튼 비활성화 오류:', error);
        }
    },

    // 교구 신청 버튼 활성화
    enableApplicationButtons: function() {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(function(btnId) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = false;
                    btn.title = '';
                    btn.classList.remove('disabled');
                    
                    // 버튼 텍스트 원복
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 새 교구 신청';
                    } else {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 묶음 신청';
                    }
                }
            });
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('교구 신청 버튼 활성화 오류:', error);
        }
    },

    // === 알림 시스템 ===

    // 수업계획 상태 알림 표시 - 개선된 버전 (단일 알림만)
    showLessonPlanStatusNotice: function(lessonPlan) {
        try {
            const self = this;
            
            // 기존 알림 제거
            this.removeExistingNotices();

            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) return Promise.resolve();

            return this.safeApiCall(function() {
                return SupabaseAPI.canEditLessonPlan();
            }).then(function(canEdit) {
                let noticeContent = '';
                let noticeType = '';

                if (!lessonPlan) {
                    // 수업계획이 없는 경우
                    if (!canEdit) {
                        noticeContent = `
                            <div class="notice-content warning">
                                <i data-lucide="alert-triangle"></i>
                                <div>
                                    <h4>⚠️ 수업계획 수정 기간이 종료되었습니다</h4>
                                    <p>수업계획 작성/수정 가능 기간이 지났습니다. 수업계획은 <strong>필수 제출 사항</strong>이므로 관리자에게 즉시 문의하세요.</p>
                                </div>
                            </div>
                        `;
                        noticeType = 'warning';
                    } else {
                        noticeContent = `
                            <div class="notice-content info">
                                <i data-lucide="calendar-plus"></i>
                                <div>
                                    <h4>📋 수업계획 작성이 필요합니다 (필수)</h4>
                                    <p><strong>수업계획은 필수 제출 사항입니다.</strong> 교구 신청 전에 반드시 수업계획을 작성하고 관리자의 승인을 받아야 합니다.</p>
                                    <button class="btn primary small" onclick="StudentManager.handleLessonPlanClick()">
                                        ✍️ 지금 작성하기
                                    </button>
                                </div>
                            </div>
                        `;
                        noticeType = 'info';
                    }
                } else if (lessonPlan.status === 'draft') {
                    // 임시저장 상태
                    if (canEdit) {
                        noticeContent = `
                            <div class="notice-content warning">
                                <i data-lucide="calendar-edit"></i>
                                <div>
                                    <h4>📝 수업계획을 완료해주세요 (필수)</h4>
                                    <p>임시저장된 수업계획이 있습니다. <strong>수업계획 완료 제출은 필수사항</strong>이며, 관리자 승인을 받아야 교구 신청이 가능합니다.</p>
                                    <button class="btn warning small" onclick="StudentManager.handleLessonPlanClick()">
                                        ⚡ 완료하기
                                    </button>
                                </div>
                            </div>
                        `;
                        noticeType = 'warning';
                    }
                } else if (lessonPlan.status === 'rejected') {
                    // 반려된 경우
                    if (canEdit) {
                        noticeContent = `
                            <div class="notice-content danger">
                                <i data-lucide="calendar-x"></i>
                                <div>
                                    <h4>❌ 수업계획이 반려되었습니다 (수정 필수)</h4>
                                    <p><strong>반려 사유:</strong> ${lessonPlan.rejection_reason || '사유 없음'}</p>
                                    <p>수업계획이 승인되어야 교구 신청이 가능합니다. 반려 사유를 확인하고 즉시 수정해주세요.</p>
                                    <button class="btn danger small" onclick="StudentManager.handleLessonPlanClick()">
                                        🔧 수정하기
                                    </button>
                                </div>
                            </div>
                        `;
                        noticeType = 'danger';
                    } else {
                        noticeContent = `
                            <div class="notice-content danger">
                                <i data-lucide="calendar-x"></i>
                                <div>
                                    <h4>❌ 수업계획이 반려되었습니다</h4>
                                    <p><strong>반려 사유:</strong> ${lessonPlan.rejection_reason || '사유 없음'}</p>
                                    <p>수정 기간이 종료되었습니다. 수업계획은 필수 제출 사항이므로 관리자에게 즉시 문의하세요.</p>
                                </div>
                            </div>
                        `;
                        noticeType = 'danger';
                    }
                } else if (lessonPlan.status === 'submitted') {
                    // 제출됨 - 승인 대기 중
                    noticeContent = `
                        <div class="notice-content info">
                            <i data-lucide="calendar-clock"></i>
                            <div>
                                <h4>⏳ 수업계획 승인 대기 중입니다</h4>
                                <p>관리자의 승인을 기다리고 있습니다. 수업계획이 승인되면 교구 신청이 가능합니다.</p>
                                <button class="btn secondary small" onclick="StudentManager.handleLessonPlanClick()">
                                    📋 제출한 계획 확인하기
                                </button>
                            </div>
                        </div>
                    `;
                    noticeType = 'info';
                } else if (lessonPlan.status === 'approved') {
                    // 승인됨 - 성공 메시지
                    noticeContent = `
                        <div class="notice-content success">
                            <i data-lucide="calendar-check"></i>
                            <div>
                                <h4>✅ 수업계획이 승인되었습니다!</h4>
                                <p>이제 교구 신청이 가능합니다. 승인된 예산 내에서 필요한 교구를 신청해주세요.</p>
                                <button class="btn success small" onclick="StudentManager.handleLessonPlanClick()">
                                    📋 승인된 계획 확인하기
                                </button>
                            </div>
                        </div>
                    `;
                    noticeType = 'success';
                }

                // 알림 표시 (내용이 있는 경우만)
                if (noticeContent) {
                    self.displayNotice(noticeContent, noticeType);
                }
            }).catch(function(error) {
                console.error('수업계획 수정 가능 여부 확인 오류:', error);
            });
        } catch (error) {
            console.error('수업계획 상태 알림 표시 오류:', error);
            return Promise.resolve(); // 오류를 해결된 것으로 처리
        }
    },

    // 기존 알림 제거 - 강화된 버전
    removeExistingNotices: function() {
        try {
            const noticeSelectors = [
                '#lessonPlanNotice',
                '#basicNotice',
                '.dashboard-notice',
                '.lesson-plan-notice',
                '.notice-duplicate'
            ];

            noticeSelectors.forEach(function(selector) {
                const notices = document.querySelectorAll(selector);
                for (let i = 0; i < notices.length; i++) {
                    const notice = notices[i];
                    if (notice && notice.parentNode) {
                        notice.parentNode.removeChild(notice);
                    }
                }
            });
        } catch (error) {
            console.error('기존 알림 제거 오류:', error);
        }
    },

    // 알림 표시 - 중복 방지 강화
    displayNotice: function(content, type) {
        try {
            // 기존 알림 완전 제거
            this.removeExistingNotices();
            
            const notice = document.createElement('div');
            notice.id = 'lessonPlanNotice';
            notice.className = 'dashboard-notice ' + type;
            notice.innerHTML = content;
            
            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader && dashboardHeader.parentNode) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                console.log('✅ 수업계획 상태 알림 표시됨:', type);
            }
        } catch (error) {
            console.error('알림 표시 오류:', error);
        }
    },

    // API 오류 알림 표시
    showApiErrorNotice: function() {
        this.showErrorNotice('서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
    },

    // 오류 알림 표시
    showErrorNotice: function(message) {
        this.displayNotice(`
            <div class="notice-content danger">
                <i data-lucide="wifi-off"></i>
                <div>
                    <h4>❌ 연결 오류</h4>
                    <p>${message}</p>
                    <button class="btn secondary small" onclick="location.reload()">
                        🔄 새로고침
                    </button>
                </div>
            </div>
        `, 'danger');
    },

    // 수업계획 필수 알림 표시
    showLessonPlanRequiredNotice: function() {
        this.displayNotice(`
            <div class="notice-content info">
                <i data-lucide="calendar-plus"></i>
                <div>
                    <h4>📋 수업계획 작성이 필요합니다</h4>
                    <p>교구 신청을 위해서는 먼저 수업계획을 작성해야 합니다.</p>
                    <button class="btn primary small" onclick="StudentManager.handleLessonPlanClick()">
                        ✍️ 수업계획 작성하기
                    </button>
                </div>
            </div>
        `, 'info');
    },

    // === 신청 내역 관리 ===

    // 신청 내역 로드 - 안전성 강화
    loadApplications: function() {
        try {
            console.log('📑 신청 내역 로드 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showEmptyApplications();
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentApplications(currentUser.id);
            }).then(function(applications) {
                self.renderApplications(applications);
                return self.updateBudgetStatus();
            }).then(function() {
                console.log('✅ 신청 내역 로드 완료');
            }).catch(function(error) {
                console.error('신청 내역 조회 API 오류:', error);
                self.showApplicationsError();
            });
        } catch (error) {
            console.error('❌ 신청 내역 로드 오류:', error);
            this.showApplicationsError();
            return Promise.resolve(); // 오류를 해결된 것으로 처리
        }
    },

    // 빈 신청 내역 표시
    showEmptyApplications: function() {
        try {
            const container = document.getElementById('studentApplications');
            const emptyState = document.getElementById('noApplications');
            
            if (container) container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        } catch (error) {
            console.error('빈 신청 내역 표시 오류:', error);
        }
    },

    // 신청 내역 오류 표시
    showApplicationsError: function() {
        try {
            const container = document.getElementById('studentApplications');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <i data-lucide="alert-circle" style="width: 3rem; height: 3rem; color: #ef4444;"></i>
                        <h3>신청 내역을 불러올 수 없습니다</h3>
                        <p>네트워크 연결을 확인하고 다시 시도해주세요.</p>
                        <button class="btn secondary" onclick="StudentManager.loadApplications()">
                            🔄 다시 시도
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('신청 내역 오류 표시 오류:', error);
        }
    },

    // === 예산 관리 ===

    // 예산 현황 업데이트 - 안전성 강화
    updateBudgetStatus: function() {
        try {
            console.log('💰 예산 현황 업데이트 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없음');
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                self.displayBudgetStatus(budgetStatus);
                console.log('✅ 예산 현황 업데이트 완료');
            }).catch(function(error) {
                console.error('예산 상태 조회 API 오류:', error);
                self.showBudgetError();
            });
        } catch (error) {
            console.error('❌ 예산 현황 업데이트 오류:', error);
            this.showBudgetError();
            return Promise.resolve(); // 오류를 해결된 것으로 처리
        }
    },

    // 예산 상태 표시
    displayBudgetStatus: function(budgetStatus) {
        try {
            let budgetDisplay = document.getElementById('budgetStatus');
            if (!budgetDisplay) {
                budgetDisplay = document.createElement('div');
                budgetDisplay.id = 'budgetStatus';
                budgetDisplay.className = 'budget-status-container';
                
                const userInfo = document.querySelector('.user-info');
                if (userInfo) {
                    userInfo.appendChild(budgetDisplay);
                }
            }
            
            if (!budgetStatus) {
                budgetDisplay.innerHTML = '<div class="budget-error">예산 정보를 불러올 수 없습니다.</div>';
                return;
            }

            if (budgetStatus.allocated === 0) {
                if (budgetStatus.lessonPlanStatus === 'approved') {
                    budgetDisplay.innerHTML = `
                        <div class="budget-info processing">
                            <div class="budget-status-text">
                                <i data-lucide="clock"></i>
                                <span>예산 배정 처리 중...</span>
                            </div>
                        </div>
                    `;
                } else {
                    budgetDisplay.innerHTML = `
                        <div class="budget-info not-allocated">
                            <div class="budget-status-text">
                                <i data-lucide="alert-circle"></i>
                                <span><strong>수업계획 승인 후 예산이 배정됩니다 (필수)</strong></span>
                            </div>
                        </div>
                    `;
                }
            } else {
                const usagePercentage = Math.round((budgetStatus.used / budgetStatus.allocated) * 100);
                const statusClass = usagePercentage >= 90 ? 'danger' : usagePercentage >= 70 ? 'warning' : 'safe';
                
                budgetDisplay.innerHTML = `
                    <div class="budget-info allocated">
                        <div class="budget-header">
                            <div class="budget-title">
                                <i data-lucide="wallet"></i>
                                <span>배정 예산 (${budgetStatus.field})</span>
                            </div>
                            <div class="budget-percentage ${statusClass}">${usagePercentage}%</div>
                        </div>
                        <div class="budget-bar-container">
                            <div class="budget-bar">
                                <div class="budget-progress ${statusClass}" style="width: ${Math.min(usagePercentage, 100)}%"></div>
                            </div>
                        </div>
                        <div class="budget-details">
                            <div class="budget-item">
                                <span class="label">사용:</span>
                                <span class="value">${this.formatPrice(budgetStatus.used)}</span>
                            </div>
                            <div class="budget-item">
                                <span class="label">배정:</span>
                                <span class="value">${this.formatPrice(budgetStatus.allocated)}</span>
                            </div>
                            <div class="budget-item remaining">
                                <span class="label">잔여:</span>
                                <span class="value ${budgetStatus.remaining <= 0 ? 'zero' : ''}">${this.formatPrice(budgetStatus.remaining)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('예산 상태 표시 오류:', error);
        }
    },

    // 예산 오류 표시
    showBudgetError: function() {
        try {
            let budgetDisplay = document.getElementById('budgetStatus');
            if (budgetDisplay) {
                budgetDisplay.innerHTML = `
                    <div class="budget-error">
                        <i data-lucide="wifi-off"></i>
                        예산 정보 연결 오류
                        <button class="btn small secondary" onclick="StudentManager.updateBudgetStatus()">
                            재시도
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('예산 오류 표시 오류:', error);
        }
    },

    // 가격 포맷팅 헬퍼
    formatPrice: function(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    // === 신청 내역 렌더링 ===

    // 신청 내역 렌더링 (기존 로직 유지)
    renderApplications: function(applications) {
        const container = document.getElementById('studentApplications');
        const emptyState = document.getElementById('noApplications');
        
        if (!applications || applications.length === 0) {
            if (container) container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (container) container.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        
        if (container) {
            container.innerHTML = '';
            
            const self = this;
            applications.forEach(function(application) {
                const applicationCard = self.createApplicationCard(application);
                container.appendChild(applicationCard);
            });

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            this.setupCardEventListeners();
        }
    },

    // 🔧 v1.9.1 - 신청 카드 생성 (묶음신청 참고링크 표시 버그 수정)
    createApplicationCard: function(application) {
        const card = document.createElement('div');
        card.className = 'application-card';
        
        const statusClass = this.getStatusClass(application.status);
        const statusText = this.getStatusText(application.status);
        const typeIcon = application.is_bundle ? 'shopping-cart' : 'package';
        const typeText = application.is_bundle ? '묶음신청' : '단일신청';
        
        const purchaseMethodClass = this.getPurchaseMethodClass(application.purchase_type);
        const purchaseMethodText = this.getPurchaseMethodText(application.purchase_type);
        
        let receiptButton = '';
        if (application.purchase_type === 'offline' && application.status === 'approved') {
            receiptButton = `
                <button class="btn small primary receipt-btn" data-item-id="${application.id}">
                    <i data-lucide="receipt"></i> 영수증 등록
                </button>
            `;
        }
        
        let receiptStatus = '';
        if (application.purchase_type === 'offline' && application.status === 'purchased') {
            receiptStatus = `
                <div class="receipt-status">
                    <i data-lucide="check-circle"></i>
                    영수증 제출완료
                    <small>${new Date(application.updated_at).toLocaleString('ko-KR')}</small>
                </div>
            `;
        }
        
        // 🔧 v1.9.1 - 묶음신청일 때 참고링크 표시하지 않음
        let linkSection = '';
        if (application.purchase_link && !application.is_bundle) {
            // 일반 신청만 참고링크 표시
            linkSection = `
                <div class="detail-item">
                    <span class="detail-label">${application.purchase_type === 'offline' ? '참고 링크' : '구매 링크'}</span>
                    <span class="detail-value">
                        <a href="${this.escapeHtml(application.purchase_link)}" target="_blank" rel="noopener noreferrer">
                            링크 보기 <i data-lucide="external-link"></i>
                        </a>
                    </span>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="application-card-header">
                <div>
                    <div class="card-title-row">
                        <h3>${this.escapeHtml(application.item_name)}</h3>
                        <div class="card-badges">
                            <span class="purchase-method-badge ${purchaseMethodClass}">
                                <i data-lucide="${application.purchase_type === 'offline' ? 'store' : 'shopping-cart'}"></i> ${purchaseMethodText}
                            </span>
                            <span class="type-badge ${application.is_bundle ? 'bundle' : 'single'}">
                                <i data-lucide="${typeIcon}"></i> ${typeText}
                            </span>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <p class="purpose">${this.escapeHtml(application.purpose)}</p>
                </div>
            </div>
            
            <div class="application-details">
                <div class="detail-item">
                    <span class="detail-label">가격</span>
                    <span class="detail-value price-value">${this.formatPrice(application.price)}</span>
                </div>
                ${linkSection}
            </div>
            
            ${receiptStatus}
            
            ${application.status === 'pending' ? `
                <div class="card-actions">
                    <button class="btn small secondary edit-btn" data-item-id="${application.id}">
                        <i data-lucide="edit-2"></i> 수정
                    </button>
                    <button class="btn small danger delete-btn" data-item-id="${application.id}">
                        <i data-lucide="trash-2"></i> 삭제
                    </button>
                </div>
            ` : `
                <div class="card-actions">
                    ${receiptButton}
                </div>
            `}
            
            ${application.rejection_reason ? `
                <div class="rejection-reason">
                    <div class="reason-label">반려 사유</div>
                    <div class="reason-text">${this.escapeHtml(application.rejection_reason)}</div>
                </div>
            ` : ''}
        `;
        
        return card;
    },

    // 카드 이벤트 리스너 설정 (기존 로직 유지)
    setupCardEventListeners: function() {
        try {
            const self = this;
            
            // 수정 버튼 - student-addon.js에서 구현
            const editBtns = document.querySelectorAll('.edit-btn');
            for (let i = 0; i < editBtns.length; i++) {
                editBtns[i].addEventListener('click', function(e) {
                    const itemId = parseInt(e.target.closest('.edit-btn').getAttribute('data-item-id'));
                    // student-addon.js에서 editApplication 구현을 기다림
                    if (window.StudentManager && typeof window.StudentManager.editApplication === 'function') {
                        window.StudentManager.editApplication(itemId);
                    } else {
                        alert('신청 수정 기능을 준비 중입니다.');
                    }
                });
            }

            // 삭제 버튼 - student-addon.js에서 구현
            const deleteBtns = document.querySelectorAll('.delete-btn');
            for (let i = 0; i < deleteBtns.length; i++) {
                deleteBtns[i].addEventListener('click', function(e) {
                    const itemId = parseInt(e.target.closest('.delete-btn').getAttribute('data-item-id'));
                    // student-addon.js에서 deleteApplication 구현을 기다림
                    if (window.StudentManager && typeof window.StudentManager.deleteApplication === 'function') {
                        window.StudentManager.deleteApplication(itemId);
                    } else {
                        alert('신청 삭제 기능을 준비 중입니다.');
                    }
                });
            }

            // 영수증 등록 버튼
            const receiptBtns = document.querySelectorAll('.receipt-btn');
            for (let i = 0; i < receiptBtns.length; i++) {
                receiptBtns[i].addEventListener('click', function(e) {
                    const itemId = parseInt(e.target.closest('.receipt-btn').getAttribute('data-item-id'));
                    self.openReceiptModal(itemId);
                });
            }
        } catch (error) {
            console.error('카드 이벤트 리스너 설정 오류:', error);
        }
    },

    // === 유틸리티 함수들 ===

    getStatusClass: function(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText: function(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    },

    getPurchaseMethodClass: function(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    getPurchaseMethodText: function(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 대시보드 새로고침
    refreshDashboard: function() {
        try {
            console.log('🔄 대시보드 새로고침');
            
            this.noticeDisplayed = false;
            
            const self = this;
            
            return this.loadApplications()
                .then(function() {
                    return self.updateBudgetStatus();
                })
                .then(function() {
                    return self.checkLessonPlanStatus();
                })
                .then(function() {
                    console.log('✅ 대시보드 새로고침 완료');
                })
                .catch(function(error) {
                    console.error('❌ 대시보드 새로고침 오류:', error);
                });
        } catch (error) {
            console.error('❌ 대시보드 새로고침 오류:', error);
            return Promise.resolve(); // 오류를 해결된 것으로 처리
        }
    }
};

// 전역 접근을 위한 window 객체에 추가
window.StudentManager = StudentManager;

// 🆕 전역 goToStudentDashboard 함수 추가 (호환성 보장)
window.goToStudentDashboard = function() {
    console.log('🔄 전역 goToStudentDashboard 호출됨');
    
    if (window.StudentManager && typeof window.StudentManager.goToStudentDashboard === 'function') {
        return window.StudentManager.goToStudentDashboard();
    } else {
        console.error('❌ StudentManager.goToStudentDashboard를 찾을 수 없습니다');
        // 폴백: 직접 페이지 이동
        window.location.reload();
        return false;
    }
};

// 호환성 함수 추가
window.initializeStudentPage = function() {
    console.log('🔄 initializeStudentPage 호출됨 (호환성 함수)');
    
    if (typeof StudentManager !== 'undefined' && StudentManager.init) {
        return StudentManager.init();
    } else {
        console.error('❌ StudentManager를 찾을 수 없습니다');
        return Promise.reject(new Error('StudentManager를 찾을 수 없습니다'));
    }
};

console.log('📚 StudentManager loaded successfully - v1.9.1 묶음신청 참고링크 표시 버그 수정');
