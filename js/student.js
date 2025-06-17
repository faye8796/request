// 학생 기능 관리 모듈 (Supabase 연동) - 교구 신청 기능 활성화 버전
const StudentManager = {
    currentEditingItem: null,
    currentReceiptItem: null,
    isInitialized: false,
    noticeDisplayed: false, // 중복 알림 방지 플래그

    // 초기화 - 안전성 강화
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ StudentManager 이미 초기화됨 - 건너뜀');
            return;
        }

        try {
            console.log('🎓 StudentManager 초기화 시작');
            this.setupEventListeners();
            await this.updateUserDisplay();
            await this.loadApplications();
            await this.updateBudgetStatus();
            await this.checkLessonPlanStatus();
            this.isInitialized = true;
            console.log('✅ StudentManager 초기화 완료');
        } catch (error) {
            console.error('❌ StudentManager 초기화 오류:', error);
            // 기본 UI 요소라도 보이도록 처리
            this.showFallbackInterface();
        }
    },

    // 기본 인터페이스 표시 (오류 시 폴백)
    showFallbackInterface() {
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
    showBasicNotice(message) {
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
    setupEventListeners() {
        try {
            // 중복 방지를 위한 리스너 제거
            this.removeEventListeners();

            // 새 교구 신청 버튼
            this.safeAddEventListener('#newApplicationBtn', 'click', () => this.showApplicationModal());
            
            // 묶음 신청 버튼
            this.safeAddEventListener('#bundleApplicationBtn', 'click', () => this.showBundleModal());
            
            // 배송지 설정 버튼
            this.safeAddEventListener('#shippingAddressBtn', 'click', () => this.showShippingModal());

            // 수업계획 버튼 - 개선된 버전
            this.safeAddEventListener('#lessonPlanBtn', 'click', () => this.handleLessonPlanClick());

            // 모달 관련 이벤트들
            this.setupModalEventListeners();

            console.log('✅ 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 오류:', error);
        }
    },

    // 수업계획 버튼 클릭 처리 - 개선된 버전 (대시보드에서 접근)
    async handleLessonPlanClick() {
        try {
            console.log('📋 수업계획 버튼 클릭 처리 (대시보드에서 접근)');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 기존 수업계획 확인
            let existingPlan = null;
            try {
                existingPlan = await SupabaseAPI.getStudentLessonPlan(currentUser.id);
            } catch (error) {
                console.error('기존 수업계획 조회 오류:', error);
            }

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
                setTimeout(async () => {
                    try {
                        if (LessonPlanManager.showLessonPlanPage) {
                            // fromDashboard=true로 설정하여 닫기 버튼 표시
                            await LessonPlanManager.showLessonPlanPage(true);
                        }
                        
                        // 기존 데이터가 있고 편집 가능한 상태라면 로드
                        if (existingPlan && existingPlan.lessons) {
                            console.log('📝 기존 수업계획 데이터 로드:', existingPlan.status);
                            
                            // 수업계획 상태에 따른 메시지 표시
                            if (existingPlan.status === 'submitted') {
                                this.showLessonPlanEditMessage('제출된 수업계획을 확인하고 있습니다. 수정이 필요한 경우 관리자에게 문의하세요.');
                            } else if (existingPlan.status === 'rejected') {
                                this.showLessonPlanEditMessage('반려된 수업계획입니다. 반려 사유를 확인하고 수정해주세요.');
                            } else if (existingPlan.status === 'approved') {
                                this.showLessonPlanEditMessage('승인된 수업계획입니다. 교구 신청이 가능합니다.');
                            } else {
                                this.showLessonPlanEditMessage('임시저장된 수업계획입니다. 완료 제출해주세요.');
                            }
                        }
                    } catch (error) {
                        console.error('수업계획 페이지 초기화 오류:', error);
                    }
                }, 100);
            } else {
                console.error('LessonPlanManager를 찾을 수 없습니다');
            }
        } catch (error) {
            console.error('수업계획 버튼 클릭 처리 오류:', error);
            alert('수업계획 페이지로 이동하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    },

    // 수업계획 페이지에서 편집 메시지 표시
    showLessonPlanEditMessage(message) {
        try {
            setTimeout(() => {
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
                    notice.innerHTML = `
                        <i data-lucide="info"></i>
                        <p>${message}</p>
                    `;
                    
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
    safeAddEventListener(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`이벤트 리스너 추가: ${selector}`);
            } else {
                console.warn(`요소를 찾을 수 없음: ${selector}`);
            }
        } catch (error) {
            console.error(`이벤트 리스너 추가 오류 (${selector}):`, error);
        }
    },

    // 이벤트 리스너 제거
    removeEventListeners() {
        try {
            const selectors = [
                '#newApplicationBtn',
                '#bundleApplicationBtn', 
                '#shippingAddressBtn',
                '#lessonPlanBtn'
            ];

            selectors.forEach(selector => {
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
    setupModalEventListeners() {
        try {
            // 일반 신청 모달
            this.safeAddEventListener('#cancelBtn', 'click', () => this.hideApplicationModal());
            this.safeAddEventListener('#applicationForm', 'submit', (e) => {
                e.preventDefault();
                this.handleApplicationSubmit();
            });

            // 묶음 신청 모달
            this.safeAddEventListener('#bundleCancelBtn', 'click', () => this.hideBundleModal());
            this.safeAddEventListener('#bundleForm', 'submit', (e) => {
                e.preventDefault();
                this.handleBundleSubmit();
            });

            // 배송지 모달
            this.safeAddEventListener('#shippingCancelBtn', 'click', () => this.hideShippingModal());
            this.safeAddEventListener('#shippingForm', 'submit', (e) => {
                e.preventDefault();
                this.handleShippingSubmit();
            });

            // 영수증 모달
            this.safeAddEventListener('#receiptCancelBtn', 'click', () => this.hideReceiptModal());
            this.safeAddEventListener('#receiptForm', 'submit', (e) => {
                e.preventDefault();
                this.handleReceiptSubmit();
            });

            // 구매 방식 변경
            const purchaseMethodInputs = document.querySelectorAll('input[name="purchaseMethod"]');
            purchaseMethodInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    this.handlePurchaseMethodChange(e.target.value);
                });
            });

            // 기타 모달 이벤트들
            this.setupModalInteractionEvents();
        } catch (error) {
            console.error('모달 이벤트 리스너 설정 오류:', error);
        }
    },

    // 모달 상호작용 이벤트 설정
    setupModalInteractionEvents() {
        try {
            // 모달 배경 클릭으로 닫기 (개선된 방식)
            const modals = ['#applicationModal', '#bundleModal', '#shippingModal', '#receiptModal'];
            modals.forEach(modalId => {
                this.safeAddEventListener(modalId, 'click', (e) => {
                    // 모달 자체를 클릭했을 때만 닫기 (내용 영역 클릭 시에는 닫지 않음)
                    if (e.target === e.currentTarget) {
                        const modal = document.querySelector(modalId);
                        if (modal) {
                            modal.classList.remove('show');
                            setTimeout(() => {
                                modal.style.display = 'none';
                                document.body.style.overflow = '';
                            }, 300);
                            
                            // 해당 모달의 폼 초기화
                            if (modalId === '#applicationModal') {
                                this.resetApplicationForm();
                            } else if (modalId === '#bundleModal') {
                                this.resetBundleForm();
                            } else if (modalId === '#shippingModal') {
                                const form = document.getElementById('shippingForm');
                                if (form) form.reset();
                            }
                        }
                    }
                });
            });
            
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const openModal = document.querySelector('.modal.show');
                    if (openModal) {
                        openModal.classList.remove('show');
                        setTimeout(() => {
                            openModal.style.display = 'none';
                            document.body.style.overflow = '';
                        }, 300);
                    }
                }
            });

            // 영수증 파일 업로드
            this.safeAddEventListener('#receiptFile', 'change', (e) => this.handleReceiptFileChange(e));
            this.safeAddEventListener('#removeReceiptBtn', 'click', () => this.removeReceiptFile());

            // 드래그 앤 드롭
            this.setupDragAndDrop();
        } catch (error) {
            console.error('모달 상호작용 이벤트 설정 오류:', error);
        }
    },

    // 모든 모달 숨김 (개선된 방식)
    hideAllModals() {
        try {
            // 모든 모달에서 show 클래스 제거
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.classList.remove('show');
            });
            
            // body 스크롤 복원
            document.body.style.overflow = '';
            
            // 개별 모달 숨김 함수 호출
            setTimeout(() => {
                this.hideApplicationModal();
                this.hideBundleModal();
                this.hideShippingModal();
                this.hideReceiptModal();
            }, 300);
        } catch (error) {
            console.error('모달 숨김 오류:', error);
        }
    },

    // 사용자 정보 표시 업데이트 - 안전성 강화
    async updateUserDisplay() {
        try {
            console.log('👤 사용자 정보 표시 업데이트 시작');
            
            // AuthManager 존재 확인
            if (typeof AuthManager === 'undefined') {
                console.error('AuthManager를 찾을 수 없습니다');
                this.showFallbackUserInfo();
                return;
            }

            await AuthManager.updateUserDisplay();
            console.log('✅ 사용자 정보 표시 업데이트 완료');
        } catch (error) {
            console.error('❌ 사용자 정보 표시 업데이트 오류:', error);
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

    // 수업계획 상태 확인 및 UI 업데이트 - 개선된 버전 (중복 방지)
    async checkLessonPlanStatus() {
        try {
            // 중복 실행 방지
            if (this.noticeDisplayed) {
                console.log('⚠️ 수업계획 상태 알림이 이미 표시됨 - 건너뜀');
                return;
            }

            console.log('📋 수업계획 상태 확인 시작');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showLessonPlanRequiredNotice();
                return;
            }

            // API 호출 시도
            let lessonPlan = null;
            try {
                lessonPlan = await SupabaseAPI.getStudentLessonPlan(currentUser.id);
            } catch (apiError) {
                console.error('수업계획 조회 API 오류:', apiError);
                this.showApiErrorNotice();
                return;
            }

            // 수업계획 버튼 업데이트
            this.updateLessonPlanButton(lessonPlan);
            
            // 교구 신청 버튼 상태 업데이트
            await this.updateApplicationButtonsState(lessonPlan);

            // 수업계획 상태 알림 표시 (단일 알림만)
            await this.showLessonPlanStatusNotice(lessonPlan);

            // 알림 표시 완료 플래그 설정
            this.noticeDisplayed = true;

            console.log('✅ 수업계획 상태 확인 완료');
        } catch (error) {
            console.error('❌ 수업계획 상태 확인 오류:', error);
            this.showErrorNotice('수업계획 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    },

    // 수업계획 버튼 업데이트
    updateLessonPlanButton(lessonPlan) {
        try {
            const lessonPlanBtn = document.getElementById('lessonPlanBtn');
            if (!lessonPlanBtn) {
                console.warn('수업계획 버튼을 찾을 수 없습니다');
                return;
            }

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
        }
    },

    // 교구 신청 버튼 상태 업데이트 - 개선된 버전
    async updateApplicationButtonsState(lessonPlan) {
        try {
            console.log('🔘 교구 신청 버튼 상태 업데이트');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                this.disableApplicationButtons('로그인이 필요합니다');
                return;
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
                return;
            }

            // 수업계획이 승인된 경우 예산 상태 확인
            let budgetStatus = null;
            try {
                budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            } catch (error) {
                console.error('예산 상태 조회 오류:', error);
                this.disableApplicationButtons('예산 정보를 불러올 수 없습니다');
                return;
            }

            if (!budgetStatus || budgetStatus.allocated === 0) {
                this.disableApplicationButtons('예산 배정 처리 중입니다. 잠시만 기다려주세요.');
            } else {
                // 교구 신청 가능
                this.enableApplicationButtons();
                console.log('✅ 교구 신청 버튼 활성화됨');
            }

            console.log('✅ 교구 신청 버튼 상태 업데이트 완료');
        } catch (error) {
            console.error('❌ 교구 신청 버튼 상태 업데이트 오류:', error);
            this.disableApplicationButtons('시스템 오류 - 잠시 후 다시 시도해주세요');
        }
    },

    // 교구 신청 버튼 비활성화
    disableApplicationButtons(reason) {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = true;
                    btn.title = reason;
                    btn.classList.add('disabled');
                    
                    // 버튼 텍스트에 상태 표시 추가
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = `<i data-lucide="${iconClass}"></i> 교구 신청 (승인 필요)`;
                    } else {
                        btn.innerHTML = `<i data-lucide="${iconClass}"></i> 묶음 신청 (승인 필요)`;
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
    enableApplicationButtons() {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = false;
                    btn.title = '';
                    btn.classList.remove('disabled');
                    
                    // 버튼 텍스트 원복
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = `<i data-lucide="${iconClass}"></i> 새 교구 신청`;
                    } else {
                        btn.innerHTML = `<i data-lucide="${iconClass}"></i> 묶음 신청`;
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
    async showLessonPlanStatusNotice(lessonPlan) {
        try {
            // 기존 알림 제거
            this.removeExistingNotices();

            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) return;

            let canEdit = true;
            try {
                canEdit = await SupabaseAPI.canEditLessonPlan();
            } catch (error) {
                console.error('수업계획 수정 가능 여부 확인 오류:', error);
            }
            
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
                this.displayNotice(noticeContent, noticeType);
            }
        } catch (error) {
            console.error('수업계획 상태 알림 표시 오류:', error);
        }
    },

    // 기존 알림 제거 - 강화된 버전
    removeExistingNotices() {
        try {
            const noticeSelectors = [
                '#lessonPlanNotice',
                '#basicNotice',
                '.dashboard-notice',
                '.lesson-plan-notice',
                '.notice-duplicate'
            ];

            noticeSelectors.forEach(selector => {
                const notices = document.querySelectorAll(selector);
                notices.forEach(notice => {
                    if (notice && notice.parentNode) {
                        notice.parentNode.removeChild(notice);
                    }
                });
            });
        } catch (error) {
            console.error('기존 알림 제거 오류:', error);
        }
    },

    // 알림 표시 - 중복 방지 강화
    displayNotice(content, type) {
        try {
            // 기존 알림 완전 제거
            this.removeExistingNotices();
            
            const notice = document.createElement('div');
            notice.id = 'lessonPlanNotice';
            notice.className = `dashboard-notice ${type}`;
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
    showApiErrorNotice() {
        this.showErrorNotice('서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
    },

    // 오류 알림 표시
    showErrorNotice(message) {
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
    showLessonPlanRequiredNotice() {
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

    // 신청 내역 로드 - 안전성 강화
    async loadApplications() {
        try {
            console.log('📑 신청 내역 로드 시작');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showEmptyApplications();
                return;
            }

            let applications = [];
            try {
                applications = await SupabaseAPI.getStudentApplications(currentUser.id);
            } catch (error) {
                console.error('신청 내역 조회 API 오류:', error);
                this.showApplicationsError();
                return;
            }
            
            this.renderApplications(applications);
            await this.updateBudgetStatus();
            console.log('✅ 신청 내역 로드 완료');
        } catch (error) {
            console.error('❌ 신청 내역 로드 오류:', error);
            this.showApplicationsError();
        }
    },

    // 빈 신청 내역 표시
    showEmptyApplications() {
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
    showApplicationsError() {
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

    // 예산 현황 업데이트 - 안전성 강화
    async updateBudgetStatus() {
        try {
            console.log('💰 예산 현황 업데이트 시작');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없음');
                return;
            }

            let budgetStatus = null;
            try {
                budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            } catch (error) {
                console.error('예산 상태 조회 API 오류:', error);
                this.showBudgetError();
                return;
            }
            
            this.displayBudgetStatus(budgetStatus);
            console.log('✅ 예산 현황 업데이트 완료');
        } catch (error) {
            console.error('❌ 예산 현황 업데이트 오류:', error);
            this.showBudgetError();
        }
    },

    // 예산 상태 표시
    displayBudgetStatus(budgetStatus) {
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
    showBudgetError() {
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
    formatPrice(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    // 신청 내역 렌더링 (기존 로직 유지)
    renderApplications(applications) {
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
            
            applications.forEach(application => {
                const applicationCard = this.createApplicationCard(application);
                container.appendChild(applicationCard);
            });

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            this.setupCardEventListeners();
        }
    },

    // 신청 카드 생성 (기존 로직 유지하되 안전성 강화)
    createApplicationCard(application) {
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
                ${application.purchase_link ? `
                    <div class="detail-item">
                        <span class="detail-label">${application.purchase_type === 'offline' ? '참고 링크' : '구매 링크'}</span>
                        <span class="detail-value">
                            <a href="${this.escapeHtml(application.purchase_link)}" target="_blank" rel="noopener noreferrer">
                                링크 보기 <i data-lucide="external-link"></i>
                            </a>
                        </span>
                    </div>
                ` : ''}
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
    setupCardEventListeners() {
        try {
            // 수정 버튼
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.target.closest('.edit-btn').dataset.itemId);
                    this.editApplication(itemId);
                });
            });

            // 삭제 버튼
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.target.closest('.delete-btn').dataset.itemId);
                    this.deleteApplication(itemId);
                });
            });

            // 영수증 등록 버튼
            document.querySelectorAll('.receipt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.target.closest('.receipt-btn').dataset.itemId);
                    this.openReceiptModal(itemId);
                });
            });
        } catch (error) {
            console.error('카드 이벤트 리스너 설정 오류:', error);
        }
    },

    // 유틸리티 함수들
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    },

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // === 모달 관련 기능들 - 실제 구현 ===

    // 일반 교구 신청 모달 표시 - 실제 구현
    async showApplicationModal() {
        try {
            console.log('🛒 일반 교구 신청 모달 표시');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 수업계획 승인 상태 확인
            let lessonPlan = null;
            try {
                lessonPlan = await SupabaseAPI.getStudentLessonPlan(currentUser.id);
            } catch (error) {
                console.error('수업계획 상태 확인 오류:', error);
                alert('수업계획 상태를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
                return;
            }

            if (!lessonPlan || lessonPlan.status !== 'approved') {
                alert('수업계획이 승인된 후에 교구 신청이 가능합니다.');
                return;
            }

            // 예산 상태 확인
            let budgetStatus = null;
            try {
                budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            } catch (error) {
                console.error('예산 상태 확인 오류:', error);
                alert('예산 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
                return;
            }

            if (!budgetStatus || budgetStatus.allocated === 0) {
                alert('예산이 아직 배정되지 않았습니다. 관리자에게 문의하세요.');
                return;
            }

            if (budgetStatus.remaining <= 0) {
                alert('사용 가능한 예산이 없습니다.');
                return;
            }

            // 기존 폼 데이터 초기화
            this.resetApplicationForm();

            // 모달 표시 (개선된 방식)
            const modal = document.getElementById('applicationModal');
            if (modal) {
                // 모달 표시 전 body 스크롤 방지
                document.body.style.overflow = 'hidden';
                
                // 모달을 부드럽게 표시
                modal.style.display = 'flex';
                modal.classList.add('show');
                
                // 제목 설정
                const title = document.getElementById('applicationModalTitle');
                if (title) {
                    title.textContent = '새 교구 신청';
                }

                // 편집 모드 플래그 초기화
                this.currentEditingItem = null;
                
                // 첫 번째 입력 필드에 포커스
                setTimeout(() => {
                    const firstInput = modal.querySelector('input, textarea');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 300);
                
                console.log('✅ 일반 교구 신청 모달 표시 완료');
            }

        } catch (error) {
            console.error('❌ 일반 교구 신청 모달 표시 오류:', error);
            alert('교구 신청 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    // 일반 교구 신청 모달 숨김 (개선된 방식)
    hideApplicationModal() {
        try {
            console.log('일반 교구 신청 모달 숨김');
            const modal = document.getElementById('applicationModal');
            if (modal) {
                // 부드러운 숨김 효과
                modal.classList.remove('show');
                
                // 애니메이션 완료 후 display none
                setTimeout(() => {
                    modal.style.display = 'none';
                    // body 스크롤 복원
                    document.body.style.overflow = '';
                }, 300);
            }
            
            // 폼 초기화
            this.resetApplicationForm();
            this.currentEditingItem = null;
        } catch (error) {
            console.error('일반 교구 신청 모달 숨김 오류:', error);
        }
    },

    // 묶음 신청 모달 표시 - 실제 구현
    async showBundleModal() {
        try {
            console.log('📦 묶음 신청 모달 표시');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 수업계획 승인 상태 확인
            let lessonPlan = null;
            try {
                lessonPlan = await SupabaseAPI.getStudentLessonPlan(currentUser.id);
            } catch (error) {
                console.error('수업계획 상태 확인 오류:', error);
                alert('수업계획 상태를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
                return;
            }

            if (!lessonPlan || lessonPlan.status !== 'approved') {
                alert('수업계획이 승인된 후에 교구 신청이 가능합니다.');
                return;
            }

            // 예산 상태 확인
            let budgetStatus = null;
            try {
                budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            } catch (error) {
                console.error('예산 상태 확인 오류:', error);
                alert('예산 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
                return;
            }

            if (!budgetStatus || budgetStatus.allocated === 0) {
                alert('예산이 아직 배정되지 않았습니다. 관리자에게 문의하세요.');
                return;
            }

            if (budgetStatus.remaining <= 0) {
                alert('사용 가능한 예산이 없습니다.');
                return;
            }

            // 기존 폼 데이터 초기화
            this.resetBundleForm();

            // 모달 표시 (개선된 방식)
            const modal = document.getElementById('bundleModal');
            if (modal) {
                // body 스크롤 방지
                document.body.style.overflow = 'hidden';
                
                // 모달을 부드럽게 표시
                modal.style.display = 'flex';
                modal.classList.add('show');
                
                // 첫 번째 입력 필드에 포커스
                setTimeout(() => {
                    const firstInput = modal.querySelector('input, textarea');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 300);
                
                console.log('✅ 묶음 신청 모달 표시 완료');
            }

        } catch (error) {
            console.error('❌ 묶음 신청 모달 표시 오류:', error);
            alert('묶음 신청 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    // 묶음 신청 모달 숨김 (개선된 방식)
    hideBundleModal() {
        try {
            console.log('묶음 신청 모달 숨김');
            const modal = document.getElementById('bundleModal');
            if (modal) {
                // 부드러운 숨김 효과
                modal.classList.remove('show');
                
                // 애니메이션 완료 후 display none
                setTimeout(() => {
                    modal.style.display = 'none';
                    // body 스크롤 복원
                    document.body.style.overflow = '';
                }, 300);
            }
            
            // 폼 초기화
            this.resetBundleForm();
        } catch (error) {
            console.error('묶음 신청 모달 숨김 오류:', error);
        }
    },

    // 배송지 설정 모달 표시 - 실제 구현 (기존과 동일)
    async showShippingModal() {
        try {
            console.log('배송지 설정 모달 표시');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 기존 배송지 정보 로드
            await this.loadShippingInfo();
            
            // 모달 표시 (개선된 방식)
            const modal = document.getElementById('shippingModal');
            if (modal) {
                // body 스크롤 방지
                document.body.style.overflow = 'hidden';
                
                // 모달을 부드럽게 표시
                modal.style.display = 'flex';
                modal.classList.add('show');
                
                // 첫 번째 입력 필드에 포커스
                setTimeout(() => {
                    const firstInput = modal.querySelector('input, textarea');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 300);
            }
        } catch (error) {
            console.error('배송지 설정 모달 표시 오류:', error);
            alert('배송지 설정을 여는 중 오류가 발생했습니다.');
        }
    },

    // 배송지 설정 모달 숨김 (개선된 방식)
    hideShippingModal() {
        try {
            console.log('배송지 설정 모달 숨김');
            const modal = document.getElementById('shippingModal');
            if (modal) {
                // 부드러운 숨김 효과
                modal.classList.remove('show');
                
                // 애니메이션 완료 후 display none
                setTimeout(() => {
                    modal.style.display = 'none';
                    // body 스크롤 복원
                    document.body.style.overflow = '';
                }, 300);
            }
            
            // 폼 초기화
            const form = document.getElementById('shippingForm');
            if (form) {
                form.reset();
            }
        } catch (error) {
            console.error('배송지 모달 숨김 오류:', error);
        }
    },

    // 폼 초기화 함수들
    resetApplicationForm() {
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

    resetBundleForm() {
        try {
            const form = document.getElementById('bundleForm');
            if (form) {
                form.reset();
            }
        } catch (error) {
            console.error('묶음 신청 폼 초기화 오류:', error);
        }
    },

    // 구매 방식 변경 처리
    handlePurchaseMethodChange(method) {
        try {
            const linkGroup = document.getElementById('itemLinkGroup');
            const linkLabel = document.getElementById('itemLinkLabel');
            const linkInput = document.getElementById('itemLink');
            
            if (method === 'offline') {
                if (linkLabel) linkLabel.textContent = '참고 링크 (선택)';
                if (linkInput) linkInput.placeholder = '참고할 수 있는 링크가 있다면 입력하세요';
            } else {
                if (linkLabel) linkLabel.textContent = '구매 링크 (선택)';
                if (linkInput) linkInput.placeholder = '구매 가능한 링크를 입력하세요';
            }
        } catch (error) {
            console.error('구매 방식 변경 처리 오류:', error);
        }
    },

    // 일반 교구 신청 제출 처리
    async handleApplicationSubmit() {
        try {
            console.log('📝 일반 교구 신청 제출 처리');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 폼 데이터 수집
            const formData = this.getApplicationFormData();
            if (!formData) {
                return; // 검증 실패
            }

            // 예산 확인
            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            if (formData.price > budgetStatus.remaining) {
                alert(`신청 가격이 잔여 예산을 초과합니다.\n잔여 예산: ${this.formatPrice(budgetStatus.remaining)}\n신청 가격: ${this.formatPrice(formData.price)}`);
                return;
            }

            // 제출 버튼 비활성화
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '신청 중...';
            }

            try {
                if (this.currentEditingItem) {
                    // 수정 모드
                    await SupabaseAPI.updateApplication(this.currentEditingItem, formData);
                    alert('교구 신청이 성공적으로 수정되었습니다.');
                } else {
                    // 새 신청 모드
                    await SupabaseAPI.createApplication(currentUser.id, formData);
                    alert('교구 신청이 성공적으로 등록되었습니다.');
                }
                
                this.hideApplicationModal();
                await this.refreshDashboard();
                
            } catch (apiError) {
                console.error('교구 신청 API 오류:', apiError);
                alert('교구 신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            }

        } catch (error) {
            console.error('❌ 일반 교구 신청 제출 처리 오류:', error);
            alert('교구 신청 중 오류가 발생했습니다.');
        } finally {
            // 제출 버튼 복원
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.currentEditingItem ? '수정하기' : '신청하기';
            }
        }
    },

    // 묶음 신청 제출 처리
    async handleBundleSubmit() {
        try {
            console.log('📦 묶음 신청 제출 처리');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 폼 데이터 수집
            const formData = this.getBundleFormData();
            if (!formData) {
                return; // 검증 실패
            }

            // 예산 확인
            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            if (formData.price > budgetStatus.remaining) {
                alert(`신청 가격이 잔여 예산을 초과합니다.\n잔여 예산: ${this.formatPrice(budgetStatus.remaining)}\n신청 가격: ${this.formatPrice(formData.price)}`);
                return;
            }

            // 제출 버튼 비활성화
            const submitBtn = document.querySelector('#bundleForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '신청 중...';
            }

            try {
                await SupabaseAPI.createBundleApplication(currentUser.id, formData);
                alert('묶음 교구 신청이 성공적으로 등록되었습니다.');
                
                this.hideBundleModal();
                await this.refreshDashboard();
                
            } catch (apiError) {
                console.error('묶음 신청 API 오류:', apiError);
                alert('묶음 신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            }

        } catch (error) {
            console.error('❌ 묶음 신청 제출 처리 오류:', error);
            alert('묶음 신청 중 오류가 발생했습니다.');
        } finally {
            // 제출 버튼 복원
            const submitBtn = document.querySelector('#bundleForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '묶음 신청하기';
            }
        }
    },

    // 폼 데이터 수집 및 검증
    getApplicationFormData() {
        try {
            const formData = {
                item_name: document.getElementById('itemName')?.value?.trim() || '',
                purpose: document.getElementById('itemPurpose')?.value?.trim() || '',
                price: parseInt(document.getElementById('itemPrice')?.value) || 0,
                purchase_link: document.getElementById('itemLink')?.value?.trim() || '',
                purchase_type: document.querySelector('input[name="purchaseMethod"]:checked')?.value || 'online',
                is_bundle: false
            };

            // 필수 필드 검증
            if (!formData.item_name) {
                alert('교구명을 입력해주세요.');
                document.getElementById('itemName')?.focus();
                return null;
            }

            if (!formData.purpose) {
                alert('사용 목적을 입력해주세요.');
                document.getElementById('itemPurpose')?.focus();
                return null;
            }

            if (!formData.price || formData.price <= 0) {
                alert('올바른 가격을 입력해주세요.');
                document.getElementById('itemPrice')?.focus();
                return null;
            }

            return formData;
        } catch (error) {
            console.error('일반 신청 폼 데이터 수집 오류:', error);
            alert('폼 데이터 처리 중 오류가 발생했습니다.');
            return null;
        }
    },

    getBundleFormData() {
        try {
            const formData = {
                item_name: document.getElementById('bundleName')?.value?.trim() || '',
                purpose: document.getElementById('bundlePurpose')?.value?.trim() || '',
                price: parseInt(document.getElementById('bundlePrice')?.value) || 0,
                purchase_link: document.getElementById('bundleLink')?.value?.trim() || '',
                purchase_type: 'online', // 묶음은 항상 온라인
                is_bundle: true,
                bundle_credentials: {
                    user_id: document.getElementById('bundleUserId')?.value?.trim() || '',
                    password: document.getElementById('bundlePassword')?.value?.trim() || ''
                }
            };

            // 필수 필드 검증
            if (!formData.item_name) {
                alert('묶음 교구명을 입력해주세요.');
                document.getElementById('bundleName')?.focus();
                return null;
            }

            if (!formData.purpose) {
                alert('사용 목적을 입력해주세요.');
                document.getElementById('bundlePurpose')?.focus();
                return null;
            }

            if (!formData.price || formData.price <= 0) {
                alert('올바른 가격을 입력해주세요.');
                document.getElementById('bundlePrice')?.focus();
                return null;
            }

            if (!formData.purchase_link) {
                alert('구매 링크를 입력해주세요.');
                document.getElementById('bundleLink')?.focus();
                return null;
            }

            if (!formData.bundle_credentials.user_id) {
                alert('계정 ID를 입력해주세요.');
                document.getElementById('bundleUserId')?.focus();
                return null;
            }

            if (!formData.bundle_credentials.password) {
                alert('비밀번호를 입력해주세요.');
                document.getElementById('bundlePassword')?.focus();
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
    async loadShippingInfo() {
        try {
            console.log('📦 기존 배송지 정보 로드');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) return;

            let shippingInfo = null;
            try {
                shippingInfo = await SupabaseAPI.getShippingInfo(currentUser.id);
            } catch (error) {
                console.error('배송지 정보 조회 오류:', error);
                return;
            }

            if (shippingInfo) {
                // 폼에 기존 정보 채우기
                const fields = {
                    'shippingName': shippingInfo.recipient_name,
                    'shippingPhone': shippingInfo.phone,
                    'shippingAddress': shippingInfo.address,
                    'shippingPostcode': shippingInfo.postal_code,
                    'shippingNote': shippingInfo.delivery_note
                };

                Object.entries(fields).forEach(([fieldId, value]) => {
                    const field = document.getElementById(fieldId);
                    if (field && value) {
                        field.value = value;
                    }
                });

                console.log('✅ 기존 배송지 정보 로드 완료');
            }
        } catch (error) {
            console.error('배송지 정보 로드 오류:', error);
        }
    },

    // 배송지 정보 제출 - 실제 구현 (기존과 동일)
    async handleShippingSubmit() {
        try {
            console.log('배송지 정보 저장 시작');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 폼 데이터 수집
            const formData = {
                recipient_name: document.getElementById('shippingName')?.value?.trim() || '',
                phone: document.getElementById('shippingPhone')?.value?.trim() || '',
                address: document.getElementById('shippingAddress')?.value?.trim() || '',
                postal_code: document.getElementById('shippingPostcode')?.value?.trim() || '',
                delivery_note: document.getElementById('shippingNote')?.value?.trim() || ''
            };

            // 필수 필드 검증
            if (!formData.recipient_name) {
                alert('받는 분 성명을 입력해주세요.');
                document.getElementById('shippingName')?.focus();
                return;
            }

            if (!formData.phone) {
                alert('연락처를 입력해주세요.');
                document.getElementById('shippingPhone')?.focus();
                return;
            }

            if (!formData.address) {
                alert('주소를 입력해주세요.');
                document.getElementById('shippingAddress')?.focus();
                return;
            }

            // 제출 버튼 비활성화
            const submitBtn = document.querySelector('#shippingForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '저장 중...';
            }

            try {
                // Supabase에 배송지 정보 저장
                await SupabaseAPI.saveShippingInfo(currentUser.id, formData);
                
                alert('배송지 정보가 성공적으로 저장되었습니다.');
                this.hideShippingModal();
                
                console.log('✅ 배송지 정보 저장 완료');
            } catch (apiError) {
                console.error('배송지 저장 API 오류:', apiError);
                alert('배송지 정보 저장에 실패했습니다. 다시 시도해주세요.');
            }

        } catch (error) {
            console.error('❌ 배송지 제출 오류:', error);
            alert('배송지 정보 저장 중 오류가 발생했습니다.');
        } finally {
            // 제출 버튼 복원
            const submitBtn = document.querySelector('#shippingForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '저장하기';
            }
        }
    },

    // 나머지 기존 함수들 (간단한 구현)
    showReceiptModal() {
        console.log('영수증 등록 모달 표시');
    },

    hideReceiptModal() {
        console.log('영수증 등록 모달 숨김');
    },

    setupDragAndDrop() {
        // 기본 구현
    },

    handleReceiptFileChange() {
        // 기본 구현
    },

    removeReceiptFile() {
        // 기본 구현
    },

    editApplication() {
        console.log('신청 수정');
    },

    deleteApplication() {
        console.log('신청 삭제');
    },

    openReceiptModal() {
        console.log('영수증 모달 열기');
    },

    handleReceiptSubmit() {
        console.log('영수증 제출');
    },

    // 대시보드 새로고침 - 중복 방지 기능 추가
    async refreshDashboard() {
        try {
            console.log('🔄 대시보드 새로고침');
            
            // 중복 방지 플래그 리셋
            this.noticeDisplayed = false;
            
            await this.loadApplications();
            await this.updateBudgetStatus();
            await this.checkLessonPlanStatus();
            
            console.log('✅ 대시보드 새로고침 완료');
        } catch (error) {
            console.error('❌ 대시보드 새로고침 오류:', error);
        }
    }
};

// 전역 접근을 위한 window 객체에 추가
window.StudentManager = StudentManager;

// DOM 로드 완료 시 초기화 방지 (App에서 호출)
console.log('📚 StudentManager loaded successfully - 교구 신청 기능 활성화됨');
