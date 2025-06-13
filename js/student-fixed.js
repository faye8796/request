// 학생 기능 관리 모듈 (Supabase 연동) - 수정된 버전
const StudentManager = {
    currentEditingItem: null,
    currentReceiptItem: null,
    isInitialized: false,

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

            // 수업계획 버튼
            this.safeAddEventListener('#lessonPlanBtn', 'click', () => this.goToLessonPlan());

            // 모달 관련 이벤트들
            this.setupModalEventListeners();

            console.log('✅ 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 오류:', error);
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
            // 모달 배경 클릭으로 닫기
            const modals = ['#applicationModal', '#bundleModal', '#shippingModal', '#receiptModal'];
            modals.forEach(modalId => {
                this.safeAddEventListener(modalId, 'click', (e) => {
                    if (e.target.id === modalId.substring(1)) {
                        this.hideAllModals();
                    }
                });
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

    // 모든 모달 숨김
    hideAllModals() {
        try {
            this.hideApplicationModal();
            this.hideBundleModal();
            this.hideShippingModal();
            this.hideReceiptModal();
        } catch (error) {
            console.error('모달 숨김 오류:', error);
        }
    },

    // 수업계획 페이지로 이동 - 안전성 강화
    goToLessonPlan() {
        try {
            console.log('🔄 수업계획 페이지로 이동');
            
            // App이 존재하는지 확인
            if (typeof App !== 'undefined' && App.showPage) {
                App.showPage('lessonPlanPage');
            } else {
                console.error('App.showPage 함수를 찾을 수 없습니다');
                alert('수업계획 페이지로 이동할 수 없습니다. 페이지를 새로고침해주세요.');
                return;
            }

            // LessonPlanManager가 존재하는지 확인
            if (typeof LessonPlanManager !== 'undefined' && LessonPlanManager.showLessonPlanPage) {
                setTimeout(() => {
                    LessonPlanManager.showLessonPlanPage();
                }, 100);
            } else {
                console.error('LessonPlanManager를 찾을 수 없습니다');
            }
        } catch (error) {
            console.error('수업계획 페이지 이동 오류:', error);
            alert('수업계획 페이지로 이동하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
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

    // 수업계획 상태 확인 및 UI 업데이트 - 안전성 강화
    async checkLessonPlanStatus() {
        try {
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
            await this.updateApplicationButtonsState();

            // 수업계획 상태 알림 표시
            await this.showLessonPlanStatusNotice(lessonPlan);

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

            if (lessonPlan && lessonPlan.status === 'submitted') {
                if (lessonPlan.status === 'approved') {
                    // 승인된 경우
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-check"></i>
                        수업계획 승인됨
                    `;
                    lessonPlanBtn.className = 'btn btn-success';
                } else if (lessonPlan.status === 'rejected') {
                    // 반려된 경우
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-x"></i>
                        수업계획 반려됨 (수정필요)
                    `;
                    lessonPlanBtn.className = 'btn btn-danger';
                } else {
                    // 승인 대기 중
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-clock"></i>
                        수업계획 승인대기
                    `;
                    lessonPlanBtn.className = 'btn btn-warning';
                }
            } else {
                // 미완료된 경우
                if (lessonPlan && lessonPlan.status === 'draft') {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-edit"></i>
                        수업계획 완료하기 (필수)
                    `;
                } else {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-plus"></i>
                        수업계획 작성하기 (필수)
                    `;
                }
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

    // 교구 신청 버튼 상태 업데이트 - 안전성 강화
    async updateApplicationButtonsState() {
        try {
            console.log('🔘 교구 신청 버튼 상태 업데이트');
            
            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) {
                this.disableApplicationButtons('로그인이 필요합니다');
                return;
            }

            let budgetStatus = null;
            try {
                budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            } catch (error) {
                console.error('예산 상태 조회 오류:', error);
                this.disableApplicationButtons('예산 정보를 불러올 수 없습니다');
                return;
            }

            const newAppBtn = document.getElementById('newApplicationBtn');
            const bundleAppBtn = document.getElementById('bundleApplicationBtn');
            
            if (!budgetStatus || !budgetStatus.canApplyForEquipment) {
                // 교구 신청 불가능한 경우
                this.disableApplicationButtons('수업계획 승인 후 신청 가능합니다 (필수)');
            } else {
                // 교구 신청 가능한 경우
                this.enableApplicationButtons();
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
                }
            });
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
                }
            });
        } catch (error) {
            console.error('교구 신청 버튼 활성화 오류:', error);
        }
    },

    // 수업계획 상태 알림 표시 - 개선된 버전
    async showLessonPlanStatusNotice(lessonPlan) {
        try {
            // 기존 알림 제거
            this.removeExistingNotices();

            const currentUser = AuthManager?.getCurrentUser();
            if (!currentUser) return;

            let budgetStatus = null;
            try {
                budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            } catch (error) {
                console.error('예산 상태 조회 오류:', error);
            }

            let canEdit = true;
            try {
                canEdit = await SupabaseAPI.canEditLessonPlan();
            } catch (error) {
                console.error('수업계획 수정 가능 여부 확인 오류:', error);
            }
            
            let noticeContent = '';
            let noticeType = '';

            if (!lessonPlan) {
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
                                <button class="btn primary small" onclick="StudentManager.goToLessonPlan()">
                                    ✍️ 지금 작성하기
                                </button>
                            </div>
                        </div>
                    `;
                    noticeType = 'info';
                }
            } else if (lessonPlan.status === 'draft') {
                if (canEdit) {
                    noticeContent = `
                        <div class="notice-content warning">
                            <i data-lucide="calendar-edit"></i>
                            <div>
                                <h4>📝 수업계획을 완료해주세요 (필수)</h4>
                                <p>임시저장된 수업계획이 있습니다. <strong>수업계획 완료 제출은 필수사항</strong>이며, 관리자 승인을 받아야 교구 신청이 가능합니다.</p>
                                <button class="btn warning small" onclick="StudentManager.goToLessonPlan()">
                                    ⚡ 완료하기
                                </button>
                            </div>
                        </div>
                    `;
                    noticeType = 'warning';
                }
            } else if (lessonPlan.status === 'rejected') {
                if (canEdit) {
                    noticeContent = `
                        <div class="notice-content danger">
                            <i data-lucide="calendar-x"></i>
                            <div>
                                <h4>❌ 수업계획이 반려되었습니다 (수정 필수)</h4>
                                <p><strong>반려 사유:</strong> ${lessonPlan.rejection_reason || '사유 없음'}</p>
                                <p>수업계획이 승인되어야 교구 신청이 가능합니다. 반려 사유를 확인하고 즉시 수정해주세요.</p>
                                <button class="btn danger small" onclick="StudentManager.goToLessonPlan()">
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
                noticeContent = `
                    <div class="notice-content info">
                        <i data-lucide="calendar-clock"></i>
                        <div>
                            <h4>⏳ 수업계획 승인 대기 중입니다</h4>
                            <p>관리자의 승인을 기다리고 있습니다. 수업계획이 승인되면 교구 신청이 가능합니다.</p>
                        </div>
                    </div>
                `;
                noticeType = 'info';
            } else if (lessonPlan.status === 'approved' && budgetStatus && budgetStatus.allocated === 0) {
                noticeContent = `
                    <div class="notice-content warning">
                        <i data-lucide="alert-triangle"></i>
                        <div>
                            <h4>⚡ 예산 배정 처리 중입니다</h4>
                            <p>수업계획이 승인되었으나 예산 배정이 완료되지 않았습니다. 잠시 후 다시 확인해주세요.</p>
                        </div>
                    </div>
                `;
                noticeType = 'warning';
            }

            if (noticeContent) {
                this.displayNotice(noticeContent, noticeType);
            }
        } catch (error) {
            console.error('수업계획 상태 알림 표시 오류:', error);
        }
    },

    // 기존 알림 제거
    removeExistingNotices() {
        try {
            const existingNotice = document.getElementById('lessonPlanNotice');
            if (existingNotice) {
                existingNotice.remove();
            }

            const basicNotice = document.getElementById('basicNotice');
            if (basicNotice) {
                basicNotice.remove();
            }
        } catch (error) {
            console.error('기존 알림 제거 오류:', error);
        }
    },

    // 알림 표시
    displayNotice(content, type) {
        try {
            const notice = document.createElement('div');
            notice.id = 'lessonPlanNotice';
            notice.className = `dashboard-notice ${type}`;
            notice.innerHTML = content;
            
            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
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
                    <button class="btn primary small" onclick="StudentManager.goToLessonPlan()">
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

    // 모달 관련 기본 함수들 (간단한 구현)
    showApplicationModal() {
        try {
            console.log('신청 모달 표시');
            alert('교구 신청 기능이 준비 중입니다.');
        } catch (error) {
            console.error('신청 모달 표시 오류:', error);
        }
    },

    hideApplicationModal() {
        console.log('신청 모달 숨김');
    },

    showBundleModal() {
        try {
            console.log('묶음 신청 모달 표시');
            alert('묶음 신청 기능이 준비 중입니다.');
        } catch (error) {
            console.error('묶음 신청 모달 표시 오류:', error);
        }
    },

    hideBundleModal() {
        console.log('묶음 신청 모달 숨김');
    },

    showShippingModal() {
        try {
            console.log('배송지 설정 모달 표시');
            alert('배송지 설정 기능이 준비 중입니다.');
        } catch (error) {
            console.error('배송지 설정 모달 표시 오류:', error);
        }
    },

    hideShippingModal() {
        console.log('배송지 설정 모달 숨김');
    },

    showReceiptModal() {
        console.log('영수증 등록 모달 표시');
    },

    hideReceiptModal() {
        console.log('영수증 등록 모달 숨김');
    },

    // 드래그 앤 드롭 설정 (간단한 구현)
    setupDragAndDrop() {
        // 기본 구현
    },

    handleReceiptFileChange() {
        // 기본 구현
    },

    removeReceiptFile() {
        // 기본 구현
    },

    handlePurchaseMethodChange() {
        // 기본 구현
    },

    // 기타 필요한 함수들
    editApplication() {
        console.log('신청 수정');
    },

    deleteApplication() {
        console.log('신청 삭제');
    },

    openReceiptModal() {
        console.log('영수증 모달 열기');
    },

    handleApplicationSubmit() {
        console.log('신청 제출');
    },

    handleBundleSubmit() {
        console.log('묶음 신청 제출');
    },

    handleShippingSubmit() {
        console.log('배송지 제출');
    },

    handleReceiptSubmit() {
        console.log('영수증 제출');
    },

    // 대시보드 새로고침
    async refreshDashboard() {
        try {
            console.log('🔄 대시보드 새로고침');
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
console.log('📚 StudentManager (Fixed) loaded successfully');
