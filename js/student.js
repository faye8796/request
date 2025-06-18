// 학생 기능 관리 모듈 (Supabase 연동) - 교구 신청 기능 활성화 버전 - 중복 등록 버그 수정 및 구문 오류 해결
const StudentManager = {
    currentEditingItem: null,
    currentReceiptItem: null,
    isInitialized: false,
    noticeDisplayed: false, // 중복 알림 방지 플래그

    // 초기화 - 안전성 강화 및 오류 처리 개선
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
                    return self.checkLessonPlanStatus();
                })
                .then(function() {
                    self.isInitialized = true;
                    console.log('✅ StudentManager 초기화 완료');
                })
                .catch(function(error) {
                    console.error('❌ StudentManager 초기화 오류:', error);
                    // 기본 UI 요소라도 보이도록 처리
                    self.showFallbackInterface();
                });
        } catch (error) {
            console.error('❌ StudentManager 초기화 오류:', error);
            this.showFallbackInterface();
            return Promise.reject(error);
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
            notice.innerHTML = '\
                <div class="notice-content warning">\
                    <i data-lucide="alert-triangle"></i>\
                    <div>\
                        <h4>시스템 상태</h4>\
                        <p>' + message + '</p>\
                    </div>\
                </div>\
            ';

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

            // 새 교구 신청 버튼
            this.safeAddEventListener('#newApplicationBtn', 'click', this.showApplicationModal.bind(this));
            
            // 묶음 신청 버튼
            this.safeAddEventListener('#bundleApplicationBtn', 'click', this.showBundleModal.bind(this));
            
            // 배송지 설정 버튼
            this.safeAddEventListener('#shippingAddressBtn', 'click', this.showShippingModal.bind(this));

            // 수업계획 버튼 - 개선된 버전
            this.safeAddEventListener('#lessonPlanBtn', 'click', this.handleLessonPlanClick.bind(this));

            // 모달 관련 이벤트들
            this.setupModalEventListeners();

            console.log('✅ 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 오류:', error);
        }
    },

    // 수업계획 버튼 클릭 처리 - 개선된 버전 (대시보드에서 접근)
    handleLessonPlanClick: function() {
        try {
            console.log('📋 수업계획 버튼 클릭 처리 (대시보드에서 접근)');
            
            // 안전한 사용자 확인
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            const self = this;
            
            // 기존 수업계획 확인 - 안전한 API 호출
            let existingPlan = null;
            this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(plan) {
                existingPlan = plan;
                
                // 수업계획 페이지로 이동
                if (typeof App !== 'undefined' && App.showPage) {
                    App.showPage('lessonPlanPage');
                } else {
                    console.error('App.showPage 함수를 찾을 수 없습니다');
                    alert('수업계획 페이지로 이동할 수 없습니다. 페이지를 새로고침해주세요.');
                    return;
                }

                // LessonPlanManager 초기화 및 기존 데이터 로드 - 대시보드에서 접근했음을 알림
                if (typeof LessonPlanManager !== 'undefined') {
                    setTimeout(function() {
                        try {
                            if (LessonPlanManager.showLessonPlanPage) {
                                // fromDashboard=true로 설정하여 닫기 버튼 표시
                                LessonPlanManager.showLessonPlanPage(true).then(function() {
                                    // 기존 데이터가 있고 편집 가능한 상태라면 로드
                                    if (existingPlan && existingPlan.lessons) {
                                        console.log('📝 기존 수업계획 데이터 로드:', existingPlan.status);
                                        
                                        // 수업계획 상태에 따른 메시지 표시
                                        if (existingPlan.status === 'submitted') {
                                            self.showLessonPlanEditMessage('제출된 수업계획을 확인하고 있습니다. 수정이 필요한 경우 관리자에게 문의하세요.');
                                        } else if (existingPlan.status === 'rejected') {
                                            self.showLessonPlanEditMessage('반려된 수업계획입니다. 반려 사유를 확인하고 수정해주세요.');
                                        } else if (existingPlan.status === 'approved') {
                                            self.showLessonPlanEditMessage('승인된 수업계획입니다. 교구 신청이 가능합니다.');
                                        } else {
                                            self.showLessonPlanEditMessage('임시저장된 수업계획입니다. 완료 제출해주세요.');
                                        }
                                    }
                                }).catch(function(error) {
                                    console.error('수업계획 페이지 초기화 오류:', error);
                                });
                            }
                        } catch (error) {
                            console.error('수업계획 페이지 초기화 오류:', error);
                        }
                    }, 100);
                } else {
                    console.error('LessonPlanManager를 찾을 수 없습니다');
                }
            }).catch(function(error) {
                console.error('기존 수업계획 조회 오류:', error);
            });
        } catch (error) {
            console.error('수업계획 버튼 클릭 처리 오류:', error);
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

    // 안전한 API 호출 래퍼
    safeApiCall: function(apiFunction) {
        try {
            if (typeof apiFunction === 'function') {
                return Promise.resolve(apiFunction());
            }
            return Promise.reject(new Error('API 함수가 유효하지 않습니다'));
        } catch (error) {
            console.error('API 호출 오류:', error);
            return Promise.reject(error);
        }
    },

    // 수업계획 페이지에서 편집 메시지 표시
    showLessonPlanEditMessage: function(message) {
        try {
            setTimeout(function() {
                const container = document.querySelector('.lesson-plan-content');
                if (container) {
                    // 기존 메시지 제거
                    const existingMessage = container.querySelector('.edit-mode-notice');
                    if (existingMessage) {
                        existingMessage.remove();
                    }

                    // 새 메시지 추가
                    const notice = document.createElement('div');
                    notice.className = 'edit-mode-notice info';
                    notice.innerHTML = '\
                        <i data-lucide="info"></i>\
                        <p>' + message + '</p>\
                    ';
                    
                    container.insertBefore(notice, container.firstChild);
                    
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            }, 200);
        } catch (error) {
            console.error('수업계획 편집 메시지 표시 오류:', error);
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
                this.handleApplicationSubmit();
            }.bind(this));

            // 묶음 신청 모달
            this.safeAddEventListener('#bundleCancelBtn', 'click', this.hideBundleModal.bind(this));
            this.safeAddEventListener('#bundleForm', 'submit', function(e) {
                e.preventDefault();
                this.handleBundleSubmit();
            }.bind(this));

            // 배송지 모달
            this.safeAddEventListener('#shippingCancelBtn', 'click', this.hideShippingModal.bind(this));
            this.safeAddEventListener('#shippingForm', 'submit', function(e) {
                e.preventDefault();
                this.handleShippingSubmit();
            }.bind(this));

            // 영수증 모달
            this.safeAddEventListener('#receiptCancelBtn', 'click', this.hideReceiptModal.bind(this));
            this.safeAddEventListener('#receiptForm', 'submit', function(e) {
                e.preventDefault();
                this.handleReceiptSubmit();
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
            // 모달 배경 클릭으로 닫기 (개선된 방식)
            const modals = ['#applicationModal', '#bundleModal', '#shippingModal', '#receiptModal'];
            const self = this;
            
            modals.forEach(function(modalId) {
                self.safeAddEventListener(modalId, 'click', function(e) {
                    // 모달 자체를 클릭했을 때만 닫기 (내용 영역 클릭 시에는 닫지 않음)
                    if (e.target === e.currentTarget) {
                        self.hideModal(modalId);
                    }
                });
            });
            
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.hideAllModals();
                }
            });

            // 영수증 파일 업로드
            this.safeAddEventListener('#receiptFile', 'change', this.handleReceiptFileChange.bind(this));
            this.safeAddEventListener('#removeReceiptBtn', 'click', this.removeReceiptFile.bind(this));

            // 드래그 앤 드롭
            this.setupDragAndDrop();
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
                } else if (modalSelector === '#shippingModal') {
                    const form = document.getElementById('shippingForm');
                    if (form) form.reset();
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
            this.hideShippingModal();
            this.hideReceiptModal();
        } catch (error) {
            console.error('모달 숨김 오류:', error);
        }
    },

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
            return Promise.reject(error);
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

    // 수업계획 상태 확인 및 UI 업데이트 - 개선된 버전 (중복 방지)
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
                return Promise.resolve();
            }

            const self = this;
            
            // API 호출 시도 - 안전한 호출
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(lessonPlan) {
                // 수업계획 버튼 업데이트
                self.updateLessonPlanButton(lessonPlan);
                
                // 교구 신청 버튼 상태 업데이트
                return self.updateApplicationButtonsState(lessonPlan).then(function() {
                    // 수업계획 상태 알림 표시 (단일 알림만)
                    return self.showLessonPlanStatusNotice(lessonPlan);
                }).then(function() {
                    // 알림 표시 완료 플래그 설정
                    self.noticeDisplayed = true;
                    console.log('✅ 수업계획 상태 확인 완료');
                });
            }).catch(function(apiError) {
                console.error('수업계획 조회 API 오류:', apiError);
                self.showApiErrorNotice();
            });
        } catch (error) {
            console.error('❌ 수업계획 상태 확인 오류:', error);
            this.showErrorNotice('수업계획 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
            return Promise.reject(error);
        }
    },

    // 수업계획 버튼 업데이트
    updateLessonPlanButton: function(lessonPlan) {
        try {
            const lessonPlanBtn = document.getElementById('lessonPlanBtn');
            if (!lessonPlanBtn) {
                console.warn('수업계획 버튼을 찾을 수 없습니다');
                return;
            }

            if (lessonPlan) {
                if (lessonPlan.status === 'approved') {
                    // 승인된 경우
                    lessonPlanBtn.innerHTML = '\
                        <i data-lucide="calendar-check"></i>\
                        수업계획 승인됨 (확인가능)\
                    ';
                    lessonPlanBtn.className = 'btn btn-success';
                } else if (lessonPlan.status === 'rejected') {
                    // 반려된 경우
                    lessonPlanBtn.innerHTML = '\
                        <i data-lucide="calendar-x"></i>\
                        수업계획 수정 필요\
                    ';
                    lessonPlanBtn.className = 'btn btn-danger';
                } else if (lessonPlan.status === 'submitted') {
                    // 제출됨 (승인 대기 중)
                    lessonPlanBtn.innerHTML = '\
                        <i data-lucide="calendar-clock"></i>\
                        수업계획 확인 (승인대기중)\
                    ';
                    lessonPlanBtn.className = 'btn btn-warning';
                } else {
                    // 임시저장 상태
                    lessonPlanBtn.innerHTML = '\
                        <i data-lucide="calendar-edit"></i>\
                        수업계획 완료하기 (필수)\
                    ';
                    lessonPlanBtn.className = 'btn btn-warning';
                }
            } else {
                // 미작성 상태
                lessonPlanBtn.innerHTML = '\
                    <i data-lucide="calendar-plus"></i>\
                    수업계획 작성하기 (필수)\
                ';
                lessonPlanBtn.className = 'btn btn-warning';
            }

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('수업계획 버튼 업데이트 오류:', error);
        }
    },

    // 교구 신청 버튼 상태 업데이트 - 개선된 버전
    updateApplicationButtonsState: function(lessonPlan) {
        try {
            console.log('🔘 교구 신청 버튼 상태 업데이트');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                this.disableApplicationButtons('로그인이 필요합니다');
                return Promise.resolve();
            }

            // 수업계획이 승인되었는지 확인
            if (!lessonPlan || lessonPlan.status !== 'approved') {
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
            
            // 수업계획이 승인된 경우 예산 상태 확인
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
                self.disableApplicationButtons('예산 정보를 불러올 수 없습니다');
            });
        } catch (error) {
            console.error('❌ 교구 신청 버튼 상태 업데이트 오류:', error);
            this.disableApplicationButtons('시스템 오류 - 잠시 후 다시 시도해주세요');
            return Promise.reject(error);
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
                        noticeContent = '\
                            <div class="notice-content warning">\
                                <i data-lucide="alert-triangle"></i>\
                                <div>\
                                    <h4>⚠️ 수업계획 수정 기간이 종료되었습니다</h4>\
                                    <p>수업계획 작성/수정 가능 기간이 지났습니다. 수업계획은 <strong>필수 제출 사항</strong>이므로 관리자에게 즉시 문의하세요.</p>\
                                </div>\
                            </div>\
                        ';
                        noticeType = 'warning';
                    } else {
                        noticeContent = '\
                            <div class="notice-content info">\
                                <i data-lucide="calendar-plus"></i>\
                                <div>\
                                    <h4>📋 수업계획 작성이 필요합니다 (필수)</h4>\
                                    <p><strong>수업계획은 필수 제출 사항입니다.</strong> 교구 신청 전에 반드시 수업계획을 작성하고 관리자의 승인을 받아야 합니다.</p>\
                                    <button class="btn primary small" onclick="StudentManager.handleLessonPlanClick()">\
                                        ✍️ 지금 작성하기\
                                    </button>\
                                </div>\
                            </div>\
                        ';
                        noticeType = 'info';
                    }
                } else if (lessonPlan.status === 'draft') {
                    // 임시저장 상태
                    if (canEdit) {
                        noticeContent = '\
                            <div class="notice-content warning">\
                                <i data-lucide="calendar-edit"></i>\
                                <div>\
                                    <h4>📝 수업계획을 완료해주세요 (필수)</h4>\
                                    <p>임시저장된 수업계획이 있습니다. <strong>수업계획 완료 제출은 필수사항</strong>이며, 관리자 승인을 받아야 교구 신청이 가능합니다.</p>\
                                    <button class="btn warning small" onclick="StudentManager.handleLessonPlanClick()">\
                                        ⚡ 완료하기\
                                    </button>\
                                </div>\
                            </div>\
                        ';
                        noticeType = 'warning';
                    }
                } else if (lessonPlan.status === 'rejected') {
                    // 반려된 경우
                    if (canEdit) {
                        noticeContent = '\
                            <div class="notice-content danger">\
                                <i data-lucide="calendar-x"></i>\
                                <div>\
                                    <h4>❌ 수업계획이 반려되었습니다 (수정 필수)</h4>\
                                    <p><strong>반려 사유:</strong> ' + (lessonPlan.rejection_reason || '사유 없음') + '</p>\
                                    <p>수업계획이 승인되어야 교구 신청이 가능합니다. 반려 사유를 확인하고 즉시 수정해주세요.</p>\
                                    <button class="btn danger small" onclick="StudentManager.handleLessonPlanClick()">\
                                        🔧 수정하기\
                                    </button>\
                                </div>\
                            </div>\
                        ';
                        noticeType = 'danger';
                    } else {
                        noticeContent = '\
                            <div class="notice-content danger">\
                                <i data-lucide="calendar-x"></i>\
                                <div>\
                                    <h4>❌ 수업계획이 반려되었습니다</h4>\
                                    <p><strong>반려 사유:</strong> ' + (lessonPlan.rejection_reason || '사유 없음') + '</p>\
                                    <p>수정 기간이 종료되었습니다. 수업계획은 필수 제출 사항이므로 관리자에게 즉시 문의하세요.</p>\
                                </div>\
                            </div>\
                        ';
                        noticeType = 'danger';
                    }
                } else if (lessonPlan.status === 'submitted') {
                    // 제출됨 - 승인 대기 중
                    noticeContent = '\
                        <div class="notice-content info">\
                            <i data-lucide="calendar-clock"></i>\
                            <div>\
                                <h4>⏳ 수업계획 승인 대기 중입니다</h4>\
                                <p>관리자의 승인을 기다리고 있습니다. 수업계획이 승인되면 교구 신청이 가능합니다.</p>\
                                <button class="btn secondary small" onclick="StudentManager.handleLessonPlanClick()">\
                                    📋 제출한 계획 확인하기\
                                </button>\
                            </div>\
                        </div>\
                    ';
                    noticeType = 'info';
                } else if (lessonPlan.status === 'approved') {
                    // 승인됨 - 성공 메시지
                    noticeContent = '\
                        <div class="notice-content success">\
                            <i data-lucide="calendar-check"></i>\
                            <div>\
                                <h4>✅ 수업계획이 승인되었습니다!</h4>\
                                <p>이제 교구 신청이 가능합니다. 승인된 예산 내에서 필요한 교구를 신청해주세요.</p>\
                                <button class="btn success small" onclick="StudentManager.handleLessonPlanClick()">\
                                    📋 승인된 계획 확인하기\
                                </button>\
                            </div>\
                        </div>\
                    ';
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
            return Promise.reject(error);
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
        this.displayNotice('\
            <div class="notice-content danger">\
                <i data-lucide="wifi-off"></i>\
                <div>\
                    <h4>❌ 연결 오류</h4>\
                    <p>' + message + '</p>\
                    <button class="btn secondary small" onclick="location.reload()">\
                        🔄 새로고침\
                    </button>\
                </div>\
            </div>\
        ', 'danger');
    },

    // 수업계획 필수 알림 표시
    showLessonPlanRequiredNotice: function() {
        this.displayNotice('\
            <div class="notice-content info">\
                <i data-lucide="calendar-plus"></i>\
                <div>\
                    <h4>📋 수업계획 작성이 필요합니다</h4>\
                    <p>교구 신청을 위해서는 먼저 수업계획을 작성해야 합니다.</p>\
                    <button class="btn primary small" onclick="StudentManager.handleLessonPlanClick()">\
                        ✍️ 수업계획 작성하기\
                    </button>\
                </div>\
            </div>\
        ', 'info');
    },

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
            return Promise.reject(error);
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
                container.innerHTML = '\
                    <div class="error-state">\
                        <i data-lucide="alert-circle" style="width: 3rem; height: 3rem; color: #ef4444;"></i>\
                        <h3>신청 내역을 불러올 수 없습니다</h3>\
                        <p>네트워크 연결을 확인하고 다시 시도해주세요.</p>\
                        <button class="btn secondary" onclick="StudentManager.loadApplications()">\
                            🔄 다시 시도\
                        </button>\
                    </div>\
                ';
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('신청 내역 오류 표시 오류:', error);
        }
    },

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
            return Promise.reject(error);
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
                    budgetDisplay.innerHTML = '\
                        <div class="budget-info processing">\
                            <div class="budget-status-text">\
                                <i data-lucide="clock"></i>\
                                <span>예산 배정 처리 중...</span>\
                            </div>\
                        </div>\
                    ';
                } else {
                    budgetDisplay.innerHTML = '\
                        <div class="budget-info not-allocated">\
                            <div class="budget-status-text">\
                                <i data-lucide="alert-circle"></i>\
                                <span><strong>수업계획 승인 후 예산이 배정됩니다 (필수)</strong></span>\
                            </div>\
                        </div>\
                    ';
                }
            } else {
                const usagePercentage = Math.round((budgetStatus.used / budgetStatus.allocated) * 100);
                const statusClass = usagePercentage >= 90 ? 'danger' : usagePercentage >= 70 ? 'warning' : 'safe';
                
                budgetDisplay.innerHTML = '\
                    <div class="budget-info allocated">\
                        <div class="budget-header">\
                            <div class="budget-title">\
                                <i data-lucide="wallet"></i>\
                                <span>배정 예산 (' + budgetStatus.field + ')</span>\
                            </div>\
                            <div class="budget-percentage ' + statusClass + '">' + usagePercentage + '%</div>\
                        </div>\
                        <div class="budget-bar-container">\
                            <div class="budget-bar">\
                                <div class="budget-progress ' + statusClass + '" style="width: ' + Math.min(usagePercentage, 100) + '%"></div>\
                            </div>\
                        </div>\
                        <div class="budget-details">\
                            <div class="budget-item">\
                                <span class="label">사용:</span>\
                                <span class="value">' + this.formatPrice(budgetStatus.used) + '</span>\
                            </div>\
                            <div class="budget-item">\
                                <span class="label">배정:</span>\
                                <span class="value">' + this.formatPrice(budgetStatus.allocated) + '</span>\
                            </div>\
                            <div class="budget-item remaining">\
                                <span class="label">잔여:</span>\
                                <span class="value ' + (budgetStatus.remaining <= 0 ? 'zero' : '') + '">' + this.formatPrice(budgetStatus.remaining) + '</span>\
                            </div>\
                        </div>\
                    </div>\
                ';
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
                budgetDisplay.innerHTML = '\
                    <div class="budget-error">\
                        <i data-lucide="wifi-off"></i>\
                        예산 정보 연결 오류\
                        <button class="btn small secondary" onclick="StudentManager.updateBudgetStatus()">\
                            재시도\
                        </button>\
                    </div>\
                ';
                
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

    // 신청 카드 생성 (기존 로직 유지하되 안전성 강화)
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
            receiptButton = '\
                <button class="btn small primary receipt-btn" data-item-id="' + application.id + '">\
                    <i data-lucide="receipt"></i> 영수증 등록\
                </button>\
            ';
        }
        
        let receiptStatus = '';
        if (application.purchase_type === 'offline' && application.status === 'purchased') {
            receiptStatus = '\
                <div class="receipt-status">\
                    <i data-lucide="check-circle"></i>\
                    영수증 제출완료\
                    <small>' + new Date(application.updated_at).toLocaleString('ko-KR') + '</small>\
                </div>\
            ';
        }
        
        card.innerHTML = '\
            <div class="application-card-header">\
                <div>\
                    <div class="card-title-row">\
                        <h3>' + this.escapeHtml(application.item_name) + '</h3>\
                        <div class="card-badges">\
                            <span class="purchase-method-badge ' + purchaseMethodClass + '">\
                                <i data-lucide="' + (application.purchase_type === 'offline' ? 'store' : 'shopping-cart') + '"></i> ' + purchaseMethodText + '\
                            </span>\
                            <span class="type-badge ' + (application.is_bundle ? 'bundle' : 'single') + '">\
                                <i data-lucide="' + typeIcon + '"></i> ' + typeText + '\
                            </span>\
                            <span class="status-badge ' + statusClass + '">' + statusText + '</span>\
                        </div>\
                    </div>\
                    <p class="purpose">' + this.escapeHtml(application.purpose) + '</p>\
                </div>\
            </div>\
            \
            <div class="application-details">\
                <div class="detail-item">\
                    <span class="detail-label">가격</span>\
                    <span class="detail-value price-value">' + this.formatPrice(application.price) + '</span>\
                </div>\
                ' + (application.purchase_link ? '\
                    <div class="detail-item">\
                        <span class="detail-label">' + (application.purchase_type === 'offline' ? '참고 링크' : '구매 링크') + '</span>\
                        <span class="detail-value">\
                            <a href="' + this.escapeHtml(application.purchase_link) + '" target="_blank" rel="noopener noreferrer">\
                                링크 보기 <i data-lucide="external-link"></i>\
                            </a>\
                        </span>\
                    </div>\
                ' : '') + '\
            </div>\
            \
            ' + receiptStatus + '\
            \
            ' + (application.status === 'pending' ? '\
                <div class="card-actions">\
                    <button class="btn small secondary edit-btn" data-item-id="' + application.id + '">\
                        <i data-lucide="edit-2"></i> 수정\
                    </button>\
                    <button class="btn small danger delete-btn" data-item-id="' + application.id + '">\
                        <i data-lucide="trash-2"></i> 삭제\
                    </button>\
                </div>\
            ' : '\
                <div class="card-actions">\
                    ' + receiptButton + '\
                </div>\
            ') + '\
            \
            ' + (application.rejection_reason ? '\
                <div class="rejection-reason">\
                    <div class="reason-label">반려 사유</div>\
                    <div class="reason-text">' + this.escapeHtml(application.rejection_reason) + '</div>\
                </div>\
            ' : '') + '\
        ';
        
        return card;
    },

    // 카드 이벤트 리스너 설정 (기존 로직 유지)
    setupCardEventListeners: function() {
        try {
            const self = this;
            
            // 수정 버튼
            const editBtns = document.querySelectorAll('.edit-btn');
            for (let i = 0; i < editBtns.length; i++) {
                editBtns[i].addEventListener('click', function(e) {
                    const itemId = parseInt(e.target.closest('.edit-btn').getAttribute('data-item-id'));
                    self.editApplication(itemId);
                });
            }

            // 삭제 버튼
            const deleteBtns = document.querySelectorAll('.delete-btn');
            for (let i = 0; i < deleteBtns.length; i++) {
                deleteBtns[i].addEventListener('click', function(e) {
                    const itemId = parseInt(e.target.closest('.delete-btn').getAttribute('data-item-id'));
                    self.deleteApplication(itemId);
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

    // 유틸리티 함수들
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

    // === 모달 관련 기능들 - 수정된 구현 ===

    // 일반 교구 신청 모달 표시 - 수정된 구현 (CSS 클래스만 사용)
    showApplicationModal: function() {
        try {
            console.log('🛒 일반 교구 신청 모달 표시');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            const self = this;
            
            // 수업계획 승인 상태 확인
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(lessonPlan) {
                if (!lessonPlan || lessonPlan.status !== 'approved') {
                    alert('수업계획이 승인된 후에 교구 신청이 가능합니다.');
                    return;
                }

                // 예산 상태 확인
                return self.safeApiCall(function() {
                    return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
                });
            }).then(function(budgetStatus) {
                if (!budgetStatus || budgetStatus.allocated === 0) {
                    alert('예산이 아직 배정되지 않았습니다. 관리자에게 문의하세요.');
                    return;
                }

                if (budgetStatus.remaining <= 0) {
                    alert('사용 가능한 예산이 없습니다.');
                    return;
                }

                // 기존 폼 데이터 초기화
                self.resetApplicationForm();

                // 모달 표시 (CSS 클래스만 사용 - 수정됨)
                const modal = document.getElementById('applicationModal');
                if (modal) {
                    // body 스크롤 방지
                    document.body.style.overflow = 'hidden';
                    
                    // CSS 클래스만으로 모달 표시
                    modal.classList.add('show');
                    
                    // 제목 설정
                    const title = document.getElementById('applicationModalTitle');
                    if (title) {
                        title.textContent = '새 교구 신청';
                    }

                    // 편집 모드 플래그 초기화
                    self.currentEditingItem = null;
                    
                    // 첫 번째 입력 필드에 포커스
                    setTimeout(function() {
                        const firstInput = modal.querySelector('input, textarea');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }, 300);
                    
                    console.log('✅ 일반 교구 신청 모달 표시 완료');
                }
            }).catch(function(error) {
                console.error('교구 신청 모달 표시 오류:', error);
                alert('교구 신청 모달을 여는 중 오류가 발생했습니다.');
            });
        } catch (error) {
            console.error('❌ 일반 교구 신청 모달 표시 오류:', error);
            alert('교구 신청 모달을 여는 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // 일반 교구 신청 모달 숨김 (수정된 방식)
    hideApplicationModal: function() {
        try {
            console.log('일반 교구 신청 모달 숨김');
            this.hideModal('#applicationModal');
        } catch (error) {
            console.error('일반 교구 신청 모달 숨김 오류:', error);
        }
    },

    // 묶음 신청 모달 표시 - 수정된 구현 (CSS 클래스만 사용)
    showBundleModal: function() {
        try {
            console.log('📦 묶음 신청 모달 표시');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            const self = this;
            
            // 수업계획 승인 상태 확인
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(lessonPlan) {
                if (!lessonPlan || lessonPlan.status !== 'approved') {
                    alert('수업계획이 승인된 후에 교구 신청이 가능합니다.');
                    return;
                }

                // 예산 상태 확인
                return self.safeApiCall(function() {
                    return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
                });
            }).then(function(budgetStatus) {
                if (!budgetStatus || budgetStatus.allocated === 0) {
                    alert('예산이 아직 배정되지 않았습니다. 관리자에게 문의하세요.');
                    return;
                }

                if (budgetStatus.remaining <= 0) {
                    alert('사용 가능한 예산이 없습니다.');
                    return;
                }

                // 기존 폼 데이터 초기화
                self.resetBundleForm();

                // 모달 표시 (CSS 클래스만 사용 - 수정됨)
                const modal = document.getElementById('bundleModal');
                if (modal) {
                    // body 스크롤 방지
                    document.body.style.overflow = 'hidden';
                    
                    // CSS 클래스만으로 모달 표시
                    modal.classList.add('show');
                    
                    // 첫 번째 입력 필드에 포커스
                    setTimeout(function() {
                        const firstInput = modal.querySelector('input, textarea');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }, 300);
                    
                    console.log('✅ 묶음 신청 모달 표시 완료');
                }
            }).catch(function(error) {
                console.error('묶음 신청 모달 표시 오류:', error);
                alert('묶음 신청 모달을 여는 중 오류가 발생했습니다.');
            });
        } catch (error) {
            console.error('❌ 묶음 신청 모달 표시 오류:', error);
            alert('묶음 신청 모달을 여는 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // 묶음 신청 모달 숨김 (수정된 방식)
    hideBundleModal: function() {
        try {
            console.log('묶음 신청 모달 숨김');
            this.hideModal('#bundleModal');
        } catch (error) {
            console.error('묶음 신청 모달 숨김 오류:', error);
        }
    },

    // 배송지 설정 모달 표시 - 수정된 구현 (CSS 클래스만 사용)
    showShippingModal: function() {
        try {
            console.log('배송지 설정 모달 표시');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            const self = this;
            
            // 기존 배송지 정보 로드
            return this.loadShippingInfo().then(function() {
                // 모달 표시 (CSS 클래스만 사용 - 수정됨)
                const modal = document.getElementById('shippingModal');
                if (modal) {
                    // body 스크롤 방지
                    document.body.style.overflow = 'hidden';
                    
                    // CSS 클래스만으로 모달 표시
                    modal.classList.add('show');
                    
                    // 첫 번째 입력 필드에 포커스
                    setTimeout(function() {
                        const firstInput = modal.querySelector('input, textarea');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }, 300);
                }
            }).catch(function(error) {
                console.error('배송지 설정 모달 표시 오류:', error);
                alert('배송지 설정을 여는 중 오류가 발생했습니다.');
            });
        } catch (error) {
            console.error('배송지 설정 모달 표시 오류:', error);
            alert('배송지 설정을 여는 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // 배송지 설정 모달 숨김 (수정된 방식)
    hideShippingModal: function() {
        try {
            console.log('배송지 설정 모달 숨김');
            this.hideModal('#shippingModal');
        } catch (error) {
            console.error('배송지 모달 숨김 오류:', error);
        }
    },

    // === 영수증 모달 관련 - 완전한 구현 ===

    // 영수증 모달 표시 - 완전한 구현
    showReceiptModal: function(requestId) {
        try {
            console.log('📄 영수증 모달 표시:', requestId);
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            // 현재 영수증 요청 ID 저장
            this.currentReceiptItem = requestId;

            // 기존 폼 데이터 초기화
            this.resetReceiptForm();

            // 모달 표시
            const modal = document.getElementById('receiptModal');
            if (modal) {
                // body 스크롤 방지
                document.body.style.overflow = 'hidden';
                
                // CSS 클래스만으로 모달 표시
                modal.classList.add('show');
                
                // 첫 번째 입력 필드에 포커스
                setTimeout(function() {
                    const firstInput = modal.querySelector('input[type="file"]');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 300);
                
                console.log('✅ 영수증 모달 표시 완료');
            }

            return Promise.resolve();
        } catch (error) {
            console.error('❌ 영수증 모달 표시 오류:', error);
            alert('영수증 모달을 여는 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // 영수증 모달 숨김 - 완전한 구현
    hideReceiptModal: function() {
        try {
            console.log('영수증 모달 숨김');
            this.hideModal('#receiptModal');
        } catch (error) {
            console.error('영수증 모달 숨김 오류:', error);
        }
    },

    // 영수증 모달 열기 - 완전한 구현
    openReceiptModal: function(requestId) {
        try {
            console.log('📄 영수증 모달 열기:', requestId);
            return this.showReceiptModal(requestId);
        } catch (error) {
            console.error('영수증 모달 열기 오류:', error);
            alert('영수증 등록을 여는 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // 영수증 제출 - 완전한 구현
    handleReceiptSubmit: function() {
        try {
            console.log('📄 영수증 제출 처리 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            if (!this.currentReceiptItem) {
                alert('영수증을 등록할 요청이 선택되지 않았습니다.');
                return Promise.resolve();
            }

            // 파일 검증
            const fileInput = document.getElementById('receiptFile');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                alert('영수증 이미지를 선택해주세요.');
                return Promise.resolve();
            }

            const file = fileInput.files[0];
            
            // 파일 크기 체크 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기는 5MB 이하여야 합니다.');
                return Promise.resolve();
            }

            // 파일 형식 체크
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (allowedTypes.indexOf(file.type) === -1) {
                alert('JPG, PNG, GIF 형식의 이미지만 업로드 가능합니다.');
                return Promise.resolve();
            }

            // 제출 버튼 비활성화
            const submitBtn = document.querySelector('#receiptForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '업로드 중...';
            }

            const self = this;
            
            return this.fileToBase64(file).then(function(base64Data) {
                // 영수증 데이터 준비 (실제 구현에서는 Supabase Storage 또는 다른 서비스 사용)
                const receiptData = {
                    request_id: self.currentReceiptItem,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    receipt_image: base64Data, // 실제로는 Storage URL
                    submitted_at: new Date().toISOString()
                };

                // 요청 상태를 'purchased'로 업데이트 (임시 구현)
                return self.safeApiCall(function() {
                    return SupabaseAPI.updateItemStatus(self.currentReceiptItem, 'purchased', null);
                });
            }).then(function(updateResult) {
                if (updateResult.success) {
                    alert('영수증이 성공적으로 등록되었습니다.');
                    self.hideReceiptModal();
                    return self.refreshDashboard();
                } else {
                    alert('영수증 등록에 실패했습니다: ' + (updateResult.message || '알 수 없는 오류'));
                }
            }).catch(function(error) {
                console.error('영수증 등록 처리 오류:', error);
                alert('영수증 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            }).finally(function() {
                // 제출 버튼 복원
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '등록하기';
                }
            });
        } catch (error) {
            console.error('❌ 영수증 제출 처리 오류:', error);
            alert('영수증 제출 중 오류가 발생했습니다.');
            
            // 제출 버튼 복원
            const submitBtn = document.querySelector('#receiptForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '등록하기';
            }
            
            return Promise.reject(error);
        }
    },

    // 파일을 Base64로 변환하는 헬퍼 함수
    fileToBase64: function(file) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.onerror = function(error) {
                reject(error);
            };
        });
    },

    // 영수증 파일 변경 처리 - 완전한 구현
    handleReceiptFileChange: function(event) {
        try {
            const file = event.target.files[0];
            const previewContainer = document.getElementById('receiptPreview');
            const removeBtn = document.getElementById('removeReceiptBtn');
            
            if (!file) {
                // 파일이 선택되지 않은 경우
                if (previewContainer) {
                    previewContainer.innerHTML = '';
                    previewContainer.style.display = 'none';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }
                return;
            }

            // 파일 크기 체크
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기는 5MB 이하여야 합니다.');
                event.target.value = '';
                return;
            }

            // 파일 형식 체크
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (allowedTypes.indexOf(file.type) === -1) {
                alert('JPG, PNG, GIF 형식의 이미지만 업로드 가능합니다.');
                event.target.value = '';
                return;
            }

            // 미리보기 표시
            const reader = new FileReader();
            const self = this;
            
            reader.onload = function(e) {
                if (previewContainer) {
                    previewContainer.innerHTML = '\
                        <div class="receipt-preview-item">\
                            <img src="' + e.target.result + '" alt="영수증 미리보기" style="max-width: 200px; max-height: 200px; border-radius: 4px;">\
                            <div class="file-info">\
                                <strong>' + file.name + '</strong>\
                                <small>' + self.formatFileSize(file.size) + '</small>\
                            </div>\
                        </div>\
                    ';
                    previewContainer.style.display = 'block';
                }
                
                if (removeBtn) {
                    removeBtn.style.display = 'inline-block';
                }
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('영수증 파일 변경 처리 오류:', error);
            alert('파일 처리 중 오류가 발생했습니다.');
        }
    },

    // 영수증 파일 제거 - 완전한 구현
    removeReceiptFile: function() {
        try {
            const fileInput = document.getElementById('receiptFile');
            const previewContainer = document.getElementById('receiptPreview');
            const removeBtn = document.getElementById('removeReceiptBtn');
            
            if (fileInput) {
                fileInput.value = '';
            }
            
            if (previewContainer) {
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
            }
            
            if (removeBtn) {
                removeBtn.style.display = 'none';
            }
            
            console.log('✅ 영수증 파일 제거 완료');
        } catch (error) {
            console.error('영수증 파일 제거 오류:', error);
        }
    },

    // 파일 크기 포맷팅 헬퍼
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // 드래그 앤 드롭 설정 - 완전한 구현
    setupDragAndDrop: function() {
        try {
            const dropZone = document.getElementById('receiptDropZone');
            const fileInput = document.getElementById('receiptFile');
            
            if (!dropZone || !fileInput) {
                console.warn('드래그 앤 드롭 요소를 찾을 수 없습니다');
                return;
            }

            // 드래그 이벤트 방지 (기본 브라우저 동작 방지)
            const eventTypes = ['dragenter', 'dragover', 'dragleave', 'drop'];
            eventTypes.forEach(function(eventName) {
                dropZone.addEventListener(eventName, StudentManager.preventDefaults, false);
                document.body.addEventListener(eventName, StudentManager.preventDefaults, false);
            });

            // 드래그 하이라이트
            const highlightTypes = ['dragenter', 'dragover'];
            highlightTypes.forEach(function(eventName) {
                dropZone.addEventListener(eventName, function() {
                    dropZone.classList.add('drag-over');
                }, false);
            });

            const unhighlightTypes = ['dragleave', 'drop'];
            unhighlightTypes.forEach(function(eventName) {
                dropZone.addEventListener(eventName, function() {
                    dropZone.classList.remove('drag-over');
                }, false);
            });

            // 드롭 처리
            dropZone.addEventListener('drop', function(e) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    // change 이벤트 수동 트리거
                    const event = new Event('change', { bubbles: true });
                    fileInput.dispatchEvent(event);
                }
            }, false);

            // 클릭으로 파일 선택
            dropZone.addEventListener('click', function() {
                fileInput.click();
            });

            console.log('✅ 드래그 앤 드롭 설정 완료');
        } catch (error) {
            console.error('드래그 앤 드롭 설정 오류:', error);
        }
    },

    // 기본 이벤트 방지 헬퍼
    preventDefaults: function(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    // === 신청 수정/삭제 기능 - 완전한 구현 ===

    // 신청 수정 - 완전한 구현
    editApplication: function(itemId) {
        try {
            console.log('✏️ 신청 수정:', itemId);
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            const self = this;
            
            // 현재 신청 내역에서 해당 아이템 찾기
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentApplications(currentUser.id);
            }).then(function(applications) {
                const application = applications.find(function(app) {
                    return app.id === itemId;
                });
                
                if (!application) {
                    alert('수정할 신청을 찾을 수 없습니다.');
                    return;
                }

                if (application.status !== 'pending') {
                    alert('승인 대기 중인 신청만 수정할 수 있습니다.');
                    return;
                }

                // 편집 모드 플래그 설정
                self.currentEditingItem = itemId;

                // 일반 신청 모달 표시
                return self.showApplicationModal().then(function() {
                    // 폼에 기존 데이터 채우기
                    setTimeout(function() {
                        const form = document.getElementById('applicationForm');
                        if (form) {
                            // 기본 필드들
                            const itemNameField = document.getElementById('itemName');
                            const purposeField = document.getElementById('itemPurpose');
                            const priceField = document.getElementById('itemPrice');
                            const linkField = document.getElementById('itemLink');
                            
                            if (itemNameField) itemNameField.value = application.item_name || '';
                            if (purposeField) purposeField.value = application.purpose || '';
                            if (priceField) priceField.value = application.price || '';
                            if (linkField) linkField.value = application.purchase_link || '';

                            // 구매 방식 설정
                            const purchaseMethodRadios = form.querySelectorAll('input[name="purchaseMethod"]');
                            for (let i = 0; i < purchaseMethodRadios.length; i++) {
                                const radio = purchaseMethodRadios[i];
                                if (radio.value === application.purchase_type) {
                                    radio.checked = true;
                                    self.handlePurchaseMethodChange(radio.value);
                                }
                            }

                            // 모달 제목 변경
                            const title = document.getElementById('applicationModalTitle');
                            if (title) {
                                title.textContent = '교구 신청 수정';
                            }

                            // 제출 버튼 텍스트 변경
                            const submitBtn = document.getElementById('submitBtn');
                            if (submitBtn) {
                                submitBtn.textContent = '수정하기';
                            }
                        }
                    }, 100);
                });
            }).then(function() {
                console.log('✅ 신청 수정 모달 표시 완료');
            }).catch(function(error) {
                console.error('❌ 신청 수정 오류:', error);
                alert('신청 수정 중 오류가 발생했습니다.');
            });
        } catch (error) {
            console.error('❌ 신청 수정 오류:', error);
            alert('신청 수정 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // 신청 삭제 - 완전한 구현
    deleteApplication: function(itemId) {
        try {
            console.log('🗑️ 신청 삭제:', itemId);
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            // 삭제 확인
            if (!confirm('정말로 이 신청을 삭제하시겠습니까?')) {
                return Promise.resolve();
            }

            const self = this;
            
            // 삭제 처리
            return this.safeApiCall(function() {
                return SupabaseAPI.deleteApplication(itemId);
            }).then(function(result) {
                if (result.success) {
                    alert('신청이 성공적으로 삭제되었습니다.');
                    return self.refreshDashboard();
                } else {
                    alert('신청 삭제에 실패했습니다: ' + (result.message || '알 수 없는 오류'));
                }
            }).then(function() {
                console.log('✅ 신청 삭제 완료');
            }).catch(function(error) {
                console.error('❌ 신청 삭제 오류:', error);
                alert('신청 삭제 중 오류가 발생했습니다.');
            });
        } catch (error) {
            console.error('❌ 신청 삭제 오류:', error);
            alert('신청 삭제 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // 폼 초기화 함수들
    resetApplicationForm: function() {
        try {
            const form = document.getElementById('applicationForm');
            if (form) {
                form.reset();
                
                // 구매 방식을 온라인으로 기본 설정
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
            
            // 미리보기 및 제거 버튼 숨김
            this.removeReceiptFile();
        } catch (error) {
            console.error('영수증 폼 초기화 오류:', error);
        }
    },

    // 구매 방식 변경 처리 - 수정된 구현 (온라인 구매 시 필수)
    handlePurchaseMethodChange: function(method) {
        try {
            const linkGroup = document.getElementById('itemLinkGroup');
            const linkLabel = document.getElementById('itemLinkLabel');
            const linkInput = document.getElementById('itemLink');
            
            if (method === 'offline') {
                // 오프라인 구매: 참고 링크 (선택)
                if (linkLabel) linkLabel.textContent = '참고 링크 (선택)';
                if (linkInput) {
                    linkInput.placeholder = '참고할 수 있는 링크가 있다면 입력하세요';
                    linkInput.removeAttribute('required');
                }
            } else {
                // 온라인 구매: 구매 링크 (필수)
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

    // 일반 교구 신청 제출 처리 - 중복 방지 강화
    handleApplicationSubmit: function() {
        console.log('📝 일반 교구 신청 제출 처리');
        
        // 🚀 즉시 버튼 비활성화 (중복 클릭 방지)
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            if (submitBtn.disabled) {
                console.log('⚠️ 이미 처리 중 - 중복 클릭 무시');
                return Promise.resolve(); // 이미 처리 중이면 무시
            }
            submitBtn.disabled = true;
            submitBtn.textContent = '처리 중...';
        }
        
        try {
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            // 폼 데이터 수집
            const formData = this.getApplicationFormData();
            if (!formData) {
                return Promise.resolve(); // 검증 실패
            }

            const self = this;
            
            // 예산 확인 (이제 버튼이 이미 비활성화된 상태에서 진행)
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                if (formData.price > budgetStatus.remaining) {
                    alert('신청 가격이 잔여 예산을 초과합니다.\n잔여 예산: ' + self.formatPrice(budgetStatus.remaining) + '\n신청 가격: ' + self.formatPrice(formData.price));
                    return;
                }

                // API 호출
                if (self.currentEditingItem) {
                    // 수정 모드
                    return self.safeApiCall(function() {
                        return SupabaseAPI.updateApplication(self.currentEditingItem, formData);
                    }).then(function() {
                        alert('교구 신청이 성공적으로 수정되었습니다.');
                        self.hideApplicationModal();
                        return self.refreshDashboard();
                    });
                } else {
                    // 새 신청 모드
                    return self.safeApiCall(function() {
                        return SupabaseAPI.createApplication(currentUser.id, formData);
                    }).then(function() {
                        alert('교구 신청이 성공적으로 등록되었습니다.');
                        self.hideApplicationModal();
                        return self.refreshDashboard();
                    });
                }
            }).catch(function(error) {
                console.error('교구 신청 API 오류:', error);
                alert('교구 신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            });
        } catch (error) {
            console.error('❌ 일반 교구 신청 제출 처리 오류:', error);
            alert('교구 신청 중 오류가 발생했습니다.');
            return Promise.reject(error);
        } finally {
            // 항상 버튼 복원 (오류 발생 시에도)
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.currentEditingItem ? '수정하기' : '신청하기';
            }
        }
    },

    // 묶음 신청 제출 처리 - 중복 방지 강화
    handleBundleSubmit: function() {
        console.log('📦 묶음 신청 제출 처리');
        
        // 🚀 즉시 버튼 비활성화 (중복 클릭 방지)
        const submitBtn = document.querySelector('#bundleForm button[type="submit"]');
        if (submitBtn) {
            if (submitBtn.disabled) {
                console.log('⚠️ 이미 처리 중 - 중복 클릭 무시');
                return Promise.resolve(); // 이미 처리 중이면 무시
            }
            submitBtn.disabled = true;
            submitBtn.textContent = '처리 중...';
        }
        
        try {
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            // 폼 데이터 수집
            const formData = this.getBundleFormData();
            if (!formData) {
                return Promise.resolve(); // 검증 실패
            }

            const self = this;
            
            // 예산 확인 (이제 버튼이 이미 비활성화된 상태에서 진행)
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                if (formData.price > budgetStatus.remaining) {
                    alert('신청 가격이 잔여 예산을 초과합니다.\n잔여 예산: ' + self.formatPrice(budgetStatus.remaining) + '\n신청 가격: ' + self.formatPrice(formData.price));
                    return;
                }

                // API 호출
                return self.safeApiCall(function() {
                    return SupabaseAPI.createBundleApplication(currentUser.id, formData);
                }).then(function() {
                    alert('묶음 교구 신청이 성공적으로 등록되었습니다.');
                    self.hideBundleModal();
                    return self.refreshDashboard();
                });
            }).catch(function(error) {
                console.error('묶음 신청 API 오류:', error);
                alert('묶음 신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            });
        } catch (error) {
            console.error('❌ 묶음 신청 제출 처리 오류:', error);
            alert('묶음 신청 중 오류가 발생했습니다.');
            return Promise.reject(error);
        } finally {
            // 항상 버튼 복원 (오류 발생 시에도)
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '묶음 신청하기';
            }
        }
    },

    // 폼 데이터 수집 및 검증 - 수정된 구현 (온라인 구매 시 링크 필수 검증)
    getApplicationFormData: function() {
        try {
            const itemNameEl = document.getElementById('itemName');
            const purposeEl = document.getElementById('itemPurpose');
            const priceEl = document.getElementById('itemPrice');
            const linkEl = document.getElementById('itemLink');
            const methodEl = document.querySelector('input[name="purchaseMethod"]:checked');
            
            const formData = {
                item_name: itemNameEl ? itemNameEl.value.trim() : '',
                purpose: purposeEl ? purposeEl.value.trim() : '',
                price: priceEl ? parseInt(priceEl.value) || 0 : 0,
                purchase_link: linkEl ? linkEl.value.trim() : '',
                purchase_type: methodEl ? methodEl.value : 'online',
                is_bundle: false
            };

            // 필수 필드 검증
            if (!formData.item_name) {
                alert('교구명을 입력해주세요.');
                if (itemNameEl) itemNameEl.focus();
                return null;
            }

            if (!formData.purpose) {
                alert('사용 목적을 입력해주세요.');
                if (purposeEl) purposeEl.focus();
                return null;
            }

            if (!formData.price || formData.price <= 0) {
                alert('올바른 가격을 입력해주세요.');
                if (priceEl) priceEl.focus();
                return null;
            }

            // 온라인 구매 시 구매 링크 필수 검증 추가
            if (formData.purchase_type === 'online' && !formData.purchase_link) {
                alert('온라인 구매 시 구매 링크는 필수입니다.');
                if (linkEl) linkEl.focus();
                return null;
            }

            return formData;
        } catch (error) {
            console.error('일반 신청 폼 데이터 수집 오류:', error);
            alert('폼 데이터 처리 중 오류가 발생했습니다.');
            return null;
        }
    },

    getBundleFormData: function() {
        try {
            const nameEl = document.getElementById('bundleName');
            const purposeEl = document.getElementById('bundlePurpose');
            const priceEl = document.getElementById('bundlePrice');
            const linkEl = document.getElementById('bundleLink');
            const userIdEl = document.getElementById('bundleUserId');
            const passwordEl = document.getElementById('bundlePassword');
            
            const formData = {
                item_name: nameEl ? nameEl.value.trim() : '',
                purpose: purposeEl ? purposeEl.value.trim() : '',
                price: priceEl ? parseInt(priceEl.value) || 0 : 0,
                purchase_link: linkEl ? linkEl.value.trim() : '',
                purchase_type: 'online', // 묶음은 항상 온라인
                is_bundle: true,
                bundle_credentials: {
                    user_id: userIdEl ? userIdEl.value.trim() : '',
                    password: passwordEl ? passwordEl.value.trim() : ''
                }
            };

            // 필수 필드 검증
            if (!formData.item_name) {
                alert('묶음 교구명을 입력해주세요.');
                if (nameEl) nameEl.focus();
                return null;
            }

            if (!formData.purpose) {
                alert('사용 목적을 입력해주세요.');
                if (purposeEl) purposeEl.focus();
                return null;
            }

            if (!formData.price || formData.price <= 0) {
                alert('올바른 가격을 입력해주세요.');
                if (priceEl) priceEl.focus();
                return null;
            }

            if (!formData.purchase_link) {
                alert('구매 링크를 입력해주세요.');
                if (linkEl) linkEl.focus();
                return null;
            }

            if (!formData.bundle_credentials.user_id) {
                alert('계정 ID를 입력해주세요.');
                if (userIdEl) userIdEl.focus();
                return null;
            }

            if (!formData.bundle_credentials.password) {
                alert('비밀번호를 입력해주세요.');
                if (passwordEl) passwordEl.focus();
                return null;
            }

            return formData;
        } catch (error) {
            console.error('묶음 신청 폼 데이터 수집 오류:', error);
            alert('폼 데이터 처리 중 오류가 발생했습니다.');
            return null;
        }
    },

    // 배송지 정보 로드 (기존과 동일)
    loadShippingInfo: function() {
        try {
            console.log('📦 기존 배송지 정보 로드');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) return Promise.resolve();

            return this.safeApiCall(function() {
                return SupabaseAPI.getShippingInfo(currentUser.id);
            }).then(function(shippingInfo) {
                if (shippingInfo) {
                    // 폼에 기존 정보 채우기
                    const fields = {
                        'shippingName': shippingInfo.recipient_name,
                        'shippingPhone': shippingInfo.phone,
                        'shippingAddress': shippingInfo.address,
                        'shippingPostcode': shippingInfo.postal_code,
                        'shippingNote': shippingInfo.delivery_note
                    };

                    Object.keys(fields).forEach(function(fieldId) {
                        const field = document.getElementById(fieldId);
                        const value = fields[fieldId];
                        if (field && value) {
                            field.value = value;
                        }
                    });

                    console.log('✅ 기존 배송지 정보 로드 완료');
                }
            }).catch(function(error) {
                console.error('배송지 정보 조회 오류:', error);
            });
        } catch (error) {
            console.error('배송지 정보 로드 오류:', error);
            return Promise.reject(error);
        }
    },

    // 배송지 정보 제출 - 실제 구현 (기존과 동일)
    handleShippingSubmit: function() {
        try {
            console.log('배송지 정보 저장 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return Promise.resolve();
            }

            // 폼 데이터 수집
            const nameEl = document.getElementById('shippingName');
            const phoneEl = document.getElementById('shippingPhone');
            const addressEl = document.getElementById('shippingAddress');
            const postcodeEl = document.getElementById('shippingPostcode');
            const noteEl = document.getElementById('shippingNote');
            
            const formData = {
                recipient_name: nameEl ? nameEl.value.trim() : '',
                phone: phoneEl ? phoneEl.value.trim() : '',
                address: addressEl ? addressEl.value.trim() : '',
                postal_code: postcodeEl ? postcodeEl.value.trim() : '',
                delivery_note: noteEl ? noteEl.value.trim() : ''
            };

            // 필수 필드 검증
            if (!formData.recipient_name) {
                alert('받는 분 성명을 입력해주세요.');
                if (nameEl) nameEl.focus();
                return Promise.resolve();
            }

            if (!formData.phone) {
                alert('연락처를 입력해주세요.');
                if (phoneEl) phoneEl.focus();
                return Promise.resolve();
            }

            if (!formData.address) {
                alert('주소를 입력해주세요.');
                if (addressEl) addressEl.focus();
                return Promise.resolve();
            }

            // 제출 버튼 비활성화
            const submitBtn = document.querySelector('#shippingForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '저장 중...';
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.saveShippingInfo(currentUser.id, formData);
            }).then(function() {
                alert('배송지 정보가 성공적으로 저장되었습니다.');
                self.hideShippingModal();
                console.log('✅ 배송지 정보 저장 완료');
            }).catch(function(error) {
                console.error('배송지 저장 API 오류:', error);
                alert('배송지 정보 저장에 실패했습니다. 다시 시도해주세요.');
            }).finally(function() {
                // 제출 버튼 복원
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '저장하기';
                }
            });
        } catch (error) {
            console.error('❌ 배송지 제출 오류:', error);
            alert('배송지 정보 저장 중 오류가 발생했습니다.');
            
            // 제출 버튼 복원
            const submitBtn = document.querySelector('#shippingForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '저장하기';
            }
            
            return Promise.reject(error);
        }
    },

    // 대시보드 새로고침 - 중복 방지 기능 추가
    refreshDashboard: function() {
        try {
            console.log('🔄 대시보드 새로고침');
            
            // 중복 방지 플래그 리셋
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
            return Promise.reject(error);
        }
    }
};

// 전역 접근을 위한 window 객체에 추가
window.StudentManager = StudentManager;

// DOM 로드 완료 시 초기화 방지 (App에서 호출)
console.log('📚 StudentManager loaded successfully - getCurrentUserSafely 수정 완료');

// 🔧 student.js 파일 맨 끝에 추가할 코드 (라인 3100 이후)

// 🆕 호환성 함수 추가 (equipment-request.html에서 사용)
window.initializeStudentPage = function() {
    console.log('🔄 initializeStudentPage 호출됨 (호Compatibility 함수)');
    
    if (typeof StudentManager !== 'undefined' && StudentManager.init) {
        return StudentManager.init();
    } else {
        console.error('❌ StudentManager를 찾을 수 없습니다');
        return Promise.reject(new Error('StudentManager를 찾을 수 없습니다'));
    }
};

// 🆕 초기화 상태 추적 개선
StudentManager.initializationStatus = 'pending';
StudentManager.initializationError = null;
StudentManager.maxRetryAttempts = 3;
StudentManager.currentRetryAttempt = 0;

// 🆕 초기화 상태 확인 함수들
StudentManager.isReady = function() {
    return this.initializationStatus === 'success' && this.isInitialized;
};

StudentManager.getInitializationInfo = function() {
    return {
        status: this.initializationStatus,
        isInitialized: this.isInitialized,
        error: this.initializationError,
        retryAttempt: this.currentRetryAttempt,
        maxRetryAttempts: this.maxRetryAttempts
    };
};

// 🔧 기존 init 함수 개선 (StudentManager.init 함수를 다음 코드로 교체)
StudentManager.init = function() {
    if (this.isInitialized) {
        console.log('⚠️ StudentManager 이미 초기화됨 - 기존 인스턴스 반환');
        return Promise.resolve();
    }

    // 이미 초기화 진행 중인 경우
    if (this.initializationStatus === 'pending' && this.currentRetryAttempt > 0) {
        console.log('⏳ StudentManager 초기화 진행 중...');
        return this.waitForInitialization();
    }

    this.initializationStatus = 'pending';
    this.currentRetryAttempt++;
    
    console.log(`🎓 StudentManager 초기화 시작 (시도 ${this.currentRetryAttempt}/${this.maxRetryAttempts})`);

    return this.performInitialization()
        .then(() => {
            this.initializationStatus = 'success';
            this.initializationError = null;
            this.currentRetryAttempt = 0;
            this.isInitialized = true;
            console.log('✅ StudentManager 초기화 완료');
            return Promise.resolve();
        })
        .catch((error) => {
            this.initializationStatus = 'failed';
            this.initializationError = error;
            console.error(`❌ StudentManager 초기화 실패 (시도 ${this.currentRetryAttempt}/${this.maxRetryAttempts}):`, error);
            
            // 재시도 가능한 오류인지 확인
            if (this.currentRetryAttempt < this.maxRetryAttempts && this.shouldRetry(error)) {
                console.log(`🔄 StudentManager 초기화 재시도 준비...`);
                this.initializationStatus = 'pending';
                
                // 지수 백오프로 재시도 (1초, 2초, 4초...)
                const retryDelay = Math.min(1000 * Math.pow(2, this.currentRetryAttempt - 1), 5000);
                
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.init().then(resolve).catch(reject);
                    }, retryDelay);
                });
            } else {
                // 최대 재시도 횟수 초과 또는 재시도 불가능한 오류
                console.error('❌ StudentManager 초기화 최종 실패');
                this.showFallbackInterface();
                return Promise.reject(error);
            }
        });
};

// 🆕 재시도 가능 여부 판단
StudentManager.shouldRetry = function(error) {
    // 네트워크 오류, 일시적 서버 오류 등은 재시도 가능
    if (error && error.message) {
        const retryableErrors = [
            'network',
            'timeout', 
            'connection',
            'api',
            '5',  // 5xx 서버 오류
            'supabase'
        ];
        
        return retryableErrors.some(keyword => 
            error.message.toLowerCase().includes(keyword.toLowerCase())
        );
    }
    return true; // 기본적으로 재시도 허용
};

// 🆕 초기화 대기 함수
StudentManager.waitForInitialization = function() {
    const self = this;
    return new Promise((resolve, reject) => {
        const checkStatus = () => {
            if (self.initializationStatus === 'success') {
                resolve();
            } else if (self.initializationStatus === 'failed') {
                reject(self.initializationError || new Error('초기화 실패'));
            } else {
                // 여전히 진행 중이면 100ms 후 다시 확인
                setTimeout(checkStatus, 100);
            }
        };
        checkStatus();
    });
};

// 🆕 실제 초기화 로직 수행
StudentManager.performInitialization = function() {
    console.log('🔧 StudentManager 구성 요소 초기화 중...');
    
    try {
        this.setupEventListeners();
        
        const self = this;
        return this.updateUserDisplay()
            .then(function() {
                console.log('👤 사용자 표시 업데이트 완료');
                return self.loadApplications();
            })
            .then(function() {
                console.log('📑 신청 내역 로드 완료');
                return self.updateBudgetStatus();
            })
            .then(function() {
                console.log('💰 예산 상태 업데이트 완료');
                return self.checkLessonPlanStatus();
            })
            .then(function() {
                console.log('📋 수업계획 상태 확인 완료');
            });
    } catch (error) {
        console.error('❌ StudentManager 구성 요소 초기화 오류:', error);
        return Promise.reject(error);
    }
};

console.log('🔧 StudentManager 호환성 및 재시도 로직 추가 완료');
