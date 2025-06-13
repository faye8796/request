// 학생 기능 관리 모듈 (Supabase 연동)
const StudentManager = {
    currentEditingItem: null,
    currentReceiptItem: null,

    // 초기화
    async init() {
        this.setupEventListeners();
        await this.updateUserDisplay();
        await this.loadApplications();
        await this.updateBudgetStatus();
        await this.checkLessonPlanStatus();
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 새 교구 신청 버튼
        Utils.on('#newApplicationBtn', 'click', () => this.showApplicationModal());
        
        // 묶음 신청 버튼
        Utils.on('#bundleApplicationBtn', 'click', () => this.showBundleModal());
        
        // 배송지 설정 버튼
        Utils.on('#shippingAddressBtn', 'click', () => this.showShippingModal());

        // 수업계획 버튼
        Utils.on('#lessonPlanBtn', 'click', () => this.goToLessonPlan());

        // 일반 신청 모달 이벤트
        Utils.on('#cancelBtn', 'click', () => this.hideApplicationModal());
        Utils.on('#applicationModal', 'click', (e) => {
            if (e.target.id === 'applicationModal') {
                this.hideApplicationModal();
            }
        });
        Utils.on('#applicationForm', 'submit', (e) => {
            e.preventDefault();
            this.handleApplicationSubmit();
        });

        // 묶음 신청 모달 이벤트
        Utils.on('#bundleCancelBtn', 'click', () => this.hideBundleModal());
        Utils.on('#bundleModal', 'click', (e) => {
            if (e.target.id === 'bundleModal') {
                this.hideBundleModal();
            }
        });
        Utils.on('#bundleForm', 'submit', (e) => {
            e.preventDefault();
            this.handleBundleSubmit();
        });

        // 배송지 모달 이벤트
        Utils.on('#shippingCancelBtn', 'click', () => this.hideShippingModal());
        Utils.on('#shippingModal', 'click', (e) => {
            if (e.target.id === 'shippingModal') {
                this.hideShippingModal();
            }
        });
        Utils.on('#shippingForm', 'submit', (e) => {
            e.preventDefault();
            this.handleShippingSubmit();
        });

        // 영수증 등록 모달 이벤트
        Utils.on('#receiptCancelBtn', 'click', () => this.hideReceiptModal());
        Utils.on('#receiptModal', 'click', (e) => {
            if (e.target.id === 'receiptModal') {
                this.hideReceiptModal();
            }
        });
        Utils.on('#receiptForm', 'submit', (e) => {
            e.preventDefault();
            this.handleReceiptSubmit();
        });

        // 구매 방식 선택 이벤트
        Utils.on('input[name="purchaseMethod"]', 'change', (e) => {
            this.handlePurchaseMethodChange(e.target.value);
        });

        // 영수증 파일 업로드 이벤트
        Utils.on('#receiptFile', 'change', (e) => this.handleReceiptFileChange(e));
        Utils.on('#removeReceiptBtn', 'click', () => this.removeReceiptFile());

        // 드래그 앤 드롭 이벤트
        this.setupDragAndDrop();

        // 모달 내 Enter 키 이벤트
        this.setupModalKeyEvents();
    },

    // 구매 방식 변경 처리
    handlePurchaseMethodChange(method) {
        const linkGroup = Utils.$('#itemLinkGroup');
        const linkLabel = Utils.$('#itemLinkLabel');
        const linkInput = Utils.$('#itemLink');

        if (method === 'offline') {
            linkLabel.textContent = '구매 예정 링크 (선택)';
            linkInput.placeholder = '구매할 예정인 상품의 링크를 입력하세요 (참고용)';
        } else {
            linkLabel.textContent = '구매 링크 (선택)';
            linkInput.placeholder = '구매 가능한 링크를 입력하세요';
        }
    },

    // 영수증 등록 모달 표시
    showReceiptModal(item) {
        this.currentReceiptItem = item;
        const modal = Utils.$('#receiptModal');
        
        // 교구 정보 표시
        Utils.$('#receiptItemName').textContent = item.item_name;
        Utils.$('#receiptItemPrice').textContent = `가격: ${Utils.formatPrice(item.price)}`;
        
        // 현재 시간으로 구매일시 설정
        const now = new Date();
        const datetimeString = now.toISOString().slice(0, 16);
        Utils.$('#purchaseDateTime').value = datetimeString;
        
        // 폼 초기화
        Utils.resetForm('#receiptForm');
        this.removeReceiptFile();
        
        modal.classList.add('active');
        
        setTimeout(() => {
            Utils.$('#receiptFile').focus();
        }, 100);
    },

    // 영수증 등록 모달 숨김
    hideReceiptModal() {
        const modal = Utils.$('#receiptModal');
        modal.classList.remove('active');
        this.currentReceiptItem = null;
        Utils.resetForm('#receiptForm');
        this.removeReceiptFile();
    },

    // 영수증 파일 변경 처리
    handleReceiptFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.validateAndPreviewReceipt(file);
        }
    },

    // 영수증 파일 검증 및 미리보기
    validateAndPreviewReceipt(file) {
        // 파일 크기 검증 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            Utils.showAlert('파일 크기가 너무 큽니다. 5MB 이하의 파일을 선택해주세요.');
            return;
        }

        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
            Utils.showAlert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        // 미리보기 생성
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = Utils.$('#receiptPreview');
            const previewImage = Utils.$('#receiptPreviewImage');
            const uploadContent = Utils.$$('.file-upload-content')[0];
            
            previewImage.src = e.target.result;
            preview.style.display = 'block';
            uploadContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    // 영수증 파일 제거
    removeReceiptFile() {
        const fileInput = Utils.$('#receiptFile');
        const preview = Utils.$('#receiptPreview');
        const uploadContent = Utils.$$('.file-upload-content')[0];
        
        fileInput.value = '';
        preview.style.display = 'none';
        uploadContent.style.display = 'block';
    },

    // 드래그 앤 드롭 설정
    setupDragAndDrop() {
        const uploadArea = Utils.$$('.file-upload-area')[0];
        if (!uploadArea) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            });
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const fileInput = Utils.$('#receiptFile');
                fileInput.files = files;
                this.validateAndPreviewReceipt(files[0]);
            }
        });
    },

    // 영수증 제출 처리 (Supabase 연동)
    async handleReceiptSubmit() {
        const fileInput = Utils.$('#receiptFile');
        const purchaseDateTime = Utils.$('#purchaseDateTime').value;
        const purchaseStore = Utils.$('#purchaseStore').value.trim();
        const receiptNote = Utils.$('#receiptNote').value.trim();

        // 파일 검증
        if (!fileInput.files[0]) {
            Utils.showAlert('영수증 이미지를 선택해주세요.');
            return;
        }

        if (!purchaseDateTime) {
            Utils.showAlert('구매일시를 입력해주세요.');
            return;
        }

        const submitBtn = Utils.$('#receiptForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        // 파일을 Base64로 변환
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async () => {
            try {
                const receiptData = {
                    image: reader.result,
                    purchaseDateTime: purchaseDateTime,
                    purchaseStore: purchaseStore,
                    note: receiptNote,
                    amount: this.currentReceiptItem.price
                };

                const result = await SupabaseAPI.submitReceipt(this.currentReceiptItem.id, receiptData);
                
                if (result.success) {
                    Utils.showAlert('영수증이 성공적으로 제출되었습니다.');
                    Utils.hideLoading(submitBtn);
                    this.hideReceiptModal();
                    await this.loadApplications();
                } else {
                    throw new Error(result.message || '영수증 제출 실패');
                }
                
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert(error.message || '영수증 제출 중 오류가 발생했습니다.');
                console.error('Receipt submission error:', error);
            }
        };

        reader.readAsDataURL(file);
    },

    // 수업계획 페이지로 이동
    goToLessonPlan() {
        App.showPage('lessonPlanPage');
        LessonPlanManager.showLessonPlanPage();
    },

    // 수업계획 상태 확인 및 UI 업데이트 (Supabase 연동)
    async checkLessonPlanStatus() {
        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const lessonPlan = await SupabaseAPI.getStudentLessonPlan(currentUser.id);
            const lessonPlanBtn = Utils.$('#lessonPlanBtn');
            
            if (lessonPlanBtn) {
                if (lessonPlan && lessonPlan.status === 'submitted') {
                    if (lessonPlan.status === 'approved') {
                        // 승인된 경우
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="calendar-check"></i>
                            수업계획 승인됨
                        `;
                        lessonPlanBtn.classList.remove('btn-warning');
                        lessonPlanBtn.classList.add('btn-success');
                    } else if (lessonPlan.status === 'rejected') {
                        // 반려된 경우
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="calendar-x"></i>
                            수업계획 반려됨
                        `;
                        lessonPlanBtn.classList.remove('btn-success');
                        lessonPlanBtn.classList.add('btn-danger');
                    } else {
                        // 승인 대기 중
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="calendar-clock"></i>
                            수업계획 승인대기
                        `;
                        lessonPlanBtn.classList.remove('btn-success', 'btn-danger');
                        lessonPlanBtn.classList.add('btn-warning');
                    }
                } else {
                    // 미완료된 경우
                    const needsPlan = await LessonPlanManager.needsLessonPlan(currentUser.id);
                    if (needsPlan) {
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="calendar-plus"></i>
                            수업계획 작성 (필수)
                        `;
                    } else {
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="calendar-edit"></i>
                            수업계획 완료
                        `;
                    }
                    lessonPlanBtn.classList.remove('btn-success', 'btn-danger');
                    lessonPlanBtn.classList.add('btn-warning');
                }
                
                // 아이콘 재생성
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }

            // 교구 신청 버튼 상태 업데이트
            await this.updateApplicationButtonsState();

            // 수업계획 상태에 따른 알림 표시
            await this.showLessonPlanStatusNotice();
        } catch (error) {
            console.error('Error checking lesson plan status:', error);
        }
    },

    // 교구 신청 버튼 상태 업데이트 (Supabase 연동)
    async updateApplicationButtonsState() {
        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            const newAppBtn = Utils.$('#newApplicationBtn');
            const bundleAppBtn = Utils.$('#bundleApplicationBtn');
            
            if (!budgetStatus || !budgetStatus.canApplyForEquipment) {
                // 교구 신청 불가능한 경우
                if (newAppBtn) {
                    newAppBtn.disabled = true;
                    newAppBtn.title = '수업계획 승인 후 신청 가능합니다 (필수)';
                    newAppBtn.classList.add('disabled');
                }
                if (bundleAppBtn) {
                    bundleAppBtn.disabled = true;
                    bundleAppBtn.title = '수업계획 승인 후 신청 가능합니다 (필수)';
                    bundleAppBtn.classList.add('disabled');
                }
            } else {
                // 교구 신청 가능한 경우
                if (newAppBtn) {
                    newAppBtn.disabled = false;
                    newAppBtn.title = '';
                    newAppBtn.classList.remove('disabled');
                }
                if (bundleAppBtn) {
                    bundleAppBtn.disabled = false;
                    bundleAppBtn.title = '';
                    bundleAppBtn.classList.remove('disabled');
                }
            }
        } catch (error) {
            console.error('Error updating application buttons state:', error);
        }
    },

    // 수업계획 상태 알림 표시 (Supabase 연동)
    async showLessonPlanStatusNotice() {
        try {
            const existingNotice = Utils.$('#lessonPlanNotice');
            if (existingNotice) {
                existingNotice.remove();
            }

            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const lessonPlan = await SupabaseAPI.getStudentLessonPlan(currentUser.id);
            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            
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
            } else if (lessonPlan.status !== 'submitted') {
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
            } else if (lessonPlan.status !== 'approved') {
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
            } else if (budgetStatus && budgetStatus.allocated === 0) {
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
                const notice = Utils.createElement('div', `dashboard-notice ${noticeType}`);
                notice.id = 'lessonPlanNotice';
                notice.innerHTML = noticeContent;
                
                // 대시보드 헤더 아래에 삽입
                const dashboardHeader = Utils.$('.dashboard-header');
                if (dashboardHeader) {
                    dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                    
                    // 아이콘 생성
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            }
        } catch (error) {
            console.error('Error showing lesson plan status notice:', error);
        }
    },

    // 대시보드 로드 (외부에서 호출용)
    async loadDashboard() {
        await this.loadApplications();
        await this.updateBudgetStatus();
        await this.checkLessonPlanStatus();
    },

    // 모달 내 키보드 이벤트 설정
    setupModalKeyEvents() {
        const inputs = ['#itemName', '#itemPurpose', '#itemPrice', '#itemLink'];
        
        inputs.forEach(selector => {
            Utils.on(selector, 'keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const form = Utils.$('#applicationForm');
                    form.dispatchEvent(new Event('submit'));
                }
            });
        });
    },

    // 사용자 정보 표시 업데이트
    async updateUserDisplay() {
        await AuthManager.updateUserDisplay();
    },

    // 예산 현황 업데이트 (Supabase 연동)
    async updateBudgetStatus() {
        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            
            let budgetDisplay = Utils.$('#budgetStatus');
            if (!budgetDisplay) {
                budgetDisplay = Utils.createElement('div', 'budget-status-container');
                budgetDisplay.id = 'budgetStatus';
                
                // 사용자 정보 영역에 추가
                const userInfo = Utils.$('.user-info');
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
                                <span class="value">${Utils.formatPrice(budgetStatus.used)}</span>
                            </div>
                            <div class="budget-item">
                                <span class="label">배정:</span>
                                <span class="value">${Utils.formatPrice(budgetStatus.allocated)}</span>
                            </div>
                            <div class="budget-item remaining">
                                <span class="label">잔여:</span>
                                <span class="value ${budgetStatus.remaining <= 0 ? 'zero' : ''}">${Utils.formatPrice(budgetStatus.remaining)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Error updating budget status:', error);
        }
    },

    // 신청 내역 로드 (Supabase 연동)
    async loadApplications() {
        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const applications = await SupabaseAPI.getStudentApplications(currentUser.id);
            
            this.renderApplications(applications);
            await this.updateBudgetStatus();
        } catch (error) {
            console.error('Error loading applications:', error);
            Utils.showAlert('신청 내역을 불러오는 중 오류가 발생했습니다.');
        }
    },

    // 신청 내역 렌더링
    renderApplications(applications) {
        const container = Utils.$('#studentApplications');
        const emptyState = Utils.$('#noApplications');
        
        if (!applications || applications.length === 0) {
            Utils.hide(container);
            Utils.show(emptyState);
            return;
        }

        Utils.show(container);
        Utils.hide(emptyState);
        
        container.innerHTML = '';
        
        applications.forEach(application => {
            const applicationCard = this.createApplicationCard(application);
            container.appendChild(applicationCard);
        });

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 카드 내 버튼 이벤트 리스너 설정
        this.setupCardEventListeners();
    },

    // 신청 카드 생성
    createApplicationCard(application) {
        const card = Utils.createElement('div', 'application-card');
        
        const statusClass = SupabaseAPI.getStatusClass(application.status);
        const statusText = SupabaseAPI.getStatusText(application.status);
        const typeIcon = application.is_bundle ? 'shopping-cart' : 'package';
        const typeText = application.is_bundle ? '묶음신청' : '단일신청';
        
        // 구매 방식 뱃지 생성
        const purchaseMethodClass = SupabaseAPI.getPurchaseMethodClass(application.purchase_type);
        const purchaseMethodText = SupabaseAPI.getPurchaseMethodText(application.purchase_type);
        
        // 영수증 등록 버튼 (오프라인 구매이고 승인된 경우)
        let receiptButton = '';
        if (application.purchase_type === 'offline' && application.status === 'approved') {
            // 영수증이 이미 제출되었는지 확인 필요 - 추후 구현
            receiptButton = `
                <button class="btn small primary receipt-btn" data-item-id="${application.id}">
                    ${Utils.createIcon('receipt')} 영수증 등록
                </button>
            `;
        }
        
        // 영수증 제출 상태 표시
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
                                ${Utils.createIcon(application.purchase_type === 'offline' ? 'store' : 'shopping-cart')} ${purchaseMethodText}
                            </span>
                            <span class="type-badge ${application.is_bundle ? 'bundle' : 'single'}">
                                ${Utils.createIcon(typeIcon)} ${typeText}
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
                    <span class="detail-value price-value">${Utils.formatPrice(application.price)}</span>
                </div>
                ${application.purchase_link ? `
                    <div class="detail-item">
                        <span class="detail-label">${application.purchase_type === 'offline' ? '참고 링크' : '구매 링크'}</span>
                        <span class="detail-value">
                            <a href="${this.escapeHtml(application.purchase_link)}" target="_blank" rel="noopener noreferrer">
                                링크 보기 ${Utils.createIcon('external-link', 'inline-icon')}
                            </a>
                        </span>
                    </div>
                ` : ''}
            </div>
            
            ${receiptStatus}
            
            ${application.status === 'pending' ? `
                <div class="card-actions">
                    <button class="btn small secondary edit-btn" data-item-id="${application.id}">
                        ${Utils.createIcon('edit-2')} 수정
                    </button>
                    <button class="btn small danger delete-btn" data-item-id="${application.id}">
                        ${Utils.createIcon('trash-2')} 삭제
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

    // 카드 내 버튼 이벤트 리스너 설정
    setupCardEventListeners() {
        // 수정 버튼
        Utils.$$('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.target.closest('.edit-btn').dataset.itemId);
                this.editApplication(itemId);
            });
        });

        // 삭제 버튼
        Utils.$$('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.target.closest('.delete-btn').dataset.itemId);
                this.deleteApplication(itemId);
            });
        });

        // 영수증 등록 버튼
        Utils.$$('.receipt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.target.closest('.receipt-btn').dataset.itemId);
                this.openReceiptModal(itemId);
            });
        });
    },

    // 영수증 등록 모달 열기 (Supabase 연동)
    async openReceiptModal(itemId) {
        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const applications = await SupabaseAPI.getStudentApplications(currentUser.id);
            const item = applications.find(app => app.id === itemId);
            
            if (!item || item.purchase_type !== 'offline' || item.status !== 'approved') {
                Utils.showAlert('영수증 등록이 불가능한 상태입니다.');
                return;
            }

            this.showReceiptModal(item);
        } catch (error) {
            console.error('Error opening receipt modal:', error);
            Utils.showAlert('영수증 등록 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    // 신청 수정 (Supabase 연동)
    async editApplication(itemId) {
        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const applications = await SupabaseAPI.getStudentApplications(currentUser.id);
            const item = applications.find(app => app.id === itemId);
            
            if (!item || item.status !== 'pending') {
                Utils.showAlert('검토 중인 신청만 수정할 수 있습니다.');
                return;
            }

            this.currentEditingItem = item;
            
            if (item.is_bundle) {
                this.showBundleModal(item);
            } else {
                this.showApplicationModal(item);
            }
        } catch (error) {
            console.error('Error editing application:', error);
            Utils.showAlert('신청 수정 중 오류가 발생했습니다.');
        }
    },

    // 신청 삭제 (Supabase 연동)
    async deleteApplication(itemId) {
        if (Utils.showConfirm('정말로 이 신청을 삭제하시겠습니까?')) {
            try {
                const currentUser = AuthManager.getCurrentUser();
                if (!currentUser) return;

                const result = await SupabaseAPI.deleteApplicationItem(currentUser.id, itemId);
                
                if (result.success) {
                    await this.loadApplications();
                    Utils.showAlert('신청이 삭제되었습니다.');
                } else {
                    Utils.showAlert(result.message || '삭제할 수 없습니다. 검토 중인 신청만 삭제 가능합니다.');
                }
            } catch (error) {
                console.error('Error deleting application:', error);
                Utils.showAlert('신청 삭제 중 오류가 발생했습니다.');
            }
        }
    },

    // 일반 신청 모달 표시 (Supabase 연동)
    async showApplicationModal(editData = null) {
        try {
            // 수업계획 승인 상태 확인
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            
            if (!budgetStatus || !budgetStatus.canApplyForEquipment) {
                Utils.showAlert('교구 신청을 위해서는 수업계획을 먼저 제출하고 승인을 받아야 합니다.\n\n수업계획 작성은 필수 사항입니다.');
                return;
            }

            const modal = Utils.$('#applicationModal');
            const title = Utils.$('#applicationModalTitle');
            const submitBtn = Utils.$('#submitBtn');
            
            if (editData) {
                title.textContent = '교구 신청 수정';
                submitBtn.textContent = '수정하기';
                
                // 폼에 기존 데이터 채우기
                Utils.$('#itemName').value = editData.item_name;
                Utils.$('#itemPurpose').value = editData.purpose;
                Utils.$('#itemPrice').value = editData.price;
                Utils.$('#itemLink').value = editData.purchase_link || '';
                
                // 구매 방식 설정
                const purchaseMethodRadio = Utils.$(`input[name="purchaseMethod"][value="${editData.purchase_type || 'online'}"]`);
                if (purchaseMethodRadio) {
                    purchaseMethodRadio.checked = true;
                    this.handlePurchaseMethodChange(editData.purchase_type || 'online');
                }
            } else {
                title.textContent = '새 교구 신청';
                submitBtn.textContent = '신청하기';
                Utils.resetForm('#applicationForm');
                
                // 기본값 설정
                const onlineRadio = Utils.$('input[name="purchaseMethod"][value="online"]');
                if (onlineRadio) {
                    onlineRadio.checked = true;
                    this.handlePurchaseMethodChange('online');
                }
            }
            
            modal.classList.add('active');
            
            setTimeout(() => {
                Utils.$('#itemName').focus();
            }, 100);
        } catch (error) {
            console.error('Error showing application modal:', error);
            Utils.showAlert('교구 신청 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    // 일반 신청 모달 숨김
    hideApplicationModal() {
        const modal = Utils.$('#applicationModal');
        modal.classList.remove('active');
        this.currentEditingItem = null;
        Utils.resetForm('#applicationForm');
    },

    // 묶음 신청 모달 표시 (Supabase 연동)
    async showBundleModal(editData = null) {
        try {
            // 수업계획 승인 상태 확인
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            
            if (!budgetStatus || !budgetStatus.canApplyForEquipment) {
                Utils.showAlert('교구 신청을 위해서는 수업계획을 먼저 제출하고 승인을 받아야 합니다.\n\n수업계획 작성은 필수 사항입니다.');
                return;
            }

            const modal = Utils.$('#bundleModal');
            
            if (editData) {
                Utils.$('#bundleName').value = editData.item_name;
                Utils.$('#bundlePurpose').value = editData.purpose;
                Utils.$('#bundlePrice').value = editData.price;
                Utils.$('#bundleLink').value = editData.purchase_link || '';
                
                if (editData.bundle_info) {
                    try {
                        const bundleInfo = typeof editData.bundle_info === 'string' 
                            ? JSON.parse(editData.bundle_info) 
                            : editData.bundle_info;
                        Utils.$('#bundleUserId').value = bundleInfo.userId || '';
                        // 보안상 비밀번호는 복원하지 않음
                    } catch (e) {
                        console.error('Error parsing bundle info:', e);
                    }
                }
            } else {
                Utils.resetForm('#bundleForm');
            }
            
            modal.classList.add('active');
            
            setTimeout(() => {
                Utils.$('#bundleName').focus();
            }, 100);
        } catch (error) {
            console.error('Error showing bundle modal:', error);
            Utils.showAlert('묶음 신청 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    // 묶음 신청 모달 숨김
    hideBundleModal() {
        const modal = Utils.$('#bundleModal');
        modal.classList.remove('active');
        this.currentEditingItem = null;
        Utils.resetForm('#bundleForm');
    },

    // 배송지 설정 모달 표시
    showShippingModal() {
        const modal = Utils.$('#shippingModal');
        const user = AuthManager.getCurrentUser();
        
        // 기존 배송지 정보가 있으면 채우기 (추후 구현)
        
        modal.classList.add('active');
        
        setTimeout(() => {
            Utils.$('#shippingName').focus();
        }, 100);
    },

    // 배송지 설정 모달 숨김
    hideShippingModal() {
        const modal = Utils.$('#shippingModal');
        modal.classList.remove('active');
        Utils.resetForm('#shippingForm');
    },

    // 일반 신청 제출 처리 (Supabase 연동)
    async handleApplicationSubmit() {
        const formData = this.getFormData();
        
        // 입력 검증
        if (!await this.validateFormData(formData)) {
            return;
        }

        const submitBtn = Utils.$('#submitBtn');
        Utils.showLoading(submitBtn);

        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) throw new Error('로그인이 필요합니다.');
            
            let result;
            if (this.currentEditingItem) {
                // 수정 모드
                result = await SupabaseAPI.updateApplicationItem(currentUser.id, this.currentEditingItem.id, formData);
                if (result.success) {
                    Utils.showAlert('교구 신청이 수정되었습니다.');
                } else {
                    throw new Error(result.message || '수정 실패');
                }
            } else {
                // 새 신청 모드
                result = await SupabaseAPI.addApplication(currentUser.id, formData);
                if (result.success) {
                    Utils.showAlert('교구 신청이 완료되었습니다.');
                } else {
                    throw new Error(result.message || '신청 실패');
                }
            }
            
            Utils.hideLoading(submitBtn);
            this.hideApplicationModal();
            await this.loadApplications();
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showAlert(error.message || '처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            console.error('Application submission error:', error);
        }
    },

    // 묶음 신청 제출 처리 (Supabase 연동)
    async handleBundleSubmit() {
        const formData = this.getBundleFormData();
        
        if (!await this.validateBundleFormData(formData)) {
            return;
        }

        const submitBtn = Utils.$('#bundleForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        try {
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) throw new Error('로그인이 필요합니다.');

            const bundleData = {
                name: formData.name,
                purpose: formData.purpose,
                price: formData.price,
                link: formData.link,
                type: 'bundle',
                purchaseMethod: 'online', // 묶음 신청은 항상 온라인
                bundleInfo: {
                    userId: formData.userId,
                    password: '***encrypted***' // 실제로는 암호화 처리
                }
            };
            
            let result;
            if (this.currentEditingItem) {
                result = await SupabaseAPI.updateApplicationItem(currentUser.id, this.currentEditingItem.id, bundleData);
                if (result.success) {
                    Utils.showAlert('묶음 신청이 수정되었습니다.');
                } else {
                    throw new Error(result.message || '수정 실패');
                }
            } else {
                result = await SupabaseAPI.addApplication(currentUser.id, bundleData);
                if (result.success) {
                    Utils.showAlert('묶음 신청이 완료되었습니다.');
                } else {
                    throw new Error(result.message || '신청 실패');
                }
            }
            
            Utils.hideLoading(submitBtn);
            this.hideBundleModal();
            await this.loadApplications();
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showAlert(error.message || '처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            console.error('Bundle submission error:', error);
        }
    },

    // 배송지 설정 제출 처리
    async handleShippingSubmit() {
        const formData = this.getShippingFormData();
        
        if (!this.validateShippingFormData(formData)) {
            return;
        }

        const submitBtn = Utils.$('#shippingForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        try {
            // 배송지 설정 로직 추후 구현
            setTimeout(() => {
                Utils.showAlert('배송지가 저장되었습니다.');
                Utils.hideLoading(submitBtn);
                this.hideShippingModal();
            }, 500);
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showAlert('배송지 저장 중 오류가 발생했습니다.');
            console.error('Shipping address error:', error);
        }
    },

    // 폼 데이터 수집
    getFormData() {
        const purchaseMethodElement = Utils.$('input[name="purchaseMethod"]:checked');
        const purchaseMethod = purchaseMethodElement ? purchaseMethodElement.value : 'online';
        
        return {
            name: Utils.$('#itemName').value.trim(),
            purpose: Utils.$('#itemPurpose').value.trim(),
            price: parseInt(Utils.$('#itemPrice').value.trim()),
            link: Utils.$('#itemLink').value.trim(),
            type: 'single',
            purchaseMethod: purchaseMethod
        };
    },

    // 묶음 신청 폼 데이터 수집
    getBundleFormData() {
        return {
            name: Utils.$('#bundleName').value.trim(),
            purpose: Utils.$('#bundlePurpose').value.trim(),
            price: parseInt(Utils.$('#bundlePrice').value.trim()),
            link: Utils.$('#bundleLink').value.trim(),
            userId: Utils.$('#bundleUserId').value.trim(),
            password: Utils.$('#bundlePassword').value
        };
    },

    // 배송지 폼 데이터 수집
    getShippingFormData() {
        return {
            name: Utils.$('#shippingName').value.trim(),
            phone: Utils.$('#shippingPhone').value.trim(),
            address: Utils.$('#shippingAddress').value.trim(),
            postcode: Utils.$('#shippingPostcode').value.trim(),
            note: Utils.$('#shippingNote').value.trim()
        };
    },

    // 폼 데이터 검증 (Supabase 연동)
    async validateFormData(data) {
        if (!Utils.validateRequired(data.name, '교구명')) return false;
        if (!Utils.validateRequired(data.purpose, '사용 목적')) return false;
        if (!data.price || data.price <= 0) {
            Utils.showAlert('올바른 가격을 입력해주세요.');
            return false;
        }

        try {
            // 예산 한도 검증
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) {
                Utils.showAlert('로그인이 필요합니다.');
                return false;
            }

            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            
            if (!budgetStatus || !budgetStatus.canApplyForEquipment) {
                Utils.showAlert('교구 신청을 위해서는 수업계획을 먼저 제출하고 승인을 받아야 합니다.\n\n수업계획 작성은 필수 사항입니다.');
                return false;
            }

            let availableBudget = budgetStatus.remaining;
            
            // 수정 시 기존 금액 제외
            if (this.currentEditingItem) {
                availableBudget += this.currentEditingItem.price;
            }
            
            if (data.price > availableBudget) {
                Utils.showAlert(`예산이 부족합니다.\n` +
                              `사용 가능한 예산: ${Utils.formatPrice(availableBudget)}\n` +
                              `신청 금액: ${Utils.formatPrice(data.price)}`);
                return false;
            }

            if (data.link && !Utils.validateURL(data.link)) {
                Utils.showAlert('올바른 URL 형식을 입력해주세요.');
                return false;
            }

            if (data.purpose.length < 10) {
                Utils.showAlert('사용 목적을 더 자세히 설명해주세요. (최소 10자)');
                return false;
            }

            if (data.purpose.length > 500) {
                Utils.showAlert('사용 목적이 너무 깁니다. (최대 500자)');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating form data:', error);
            Utils.showAlert('검증 중 오류가 발생했습니다.');
            return false;
        }
    },

    // 묶음 신청 폼 검증
    async validateBundleFormData(data) {
        if (!Utils.validateRequired(data.name, '묶음 교구명')) return false;
        if (!Utils.validateRequired(data.purpose, '사용 목적')) return false;
        if (!Utils.validateRequired(data.link, '구매 링크')) return false;
        if (!Utils.validateRequired(data.userId, '사용자 ID')) return false;
        if (!Utils.validateRequired(data.password, '비밀번호')) return false;
        
        if (!data.price || data.price <= 0) {
            Utils.showAlert('올바른 가격을 입력해주세요.');
            return false;
        }

        // 예산 검증 (일반 신청과 동일)
        return await this.validateFormData({
            name: data.name,
            purpose: data.purpose,
            price: data.price,
            link: data.link
        });
    },

    // 배송지 폼 검증
    validateShippingFormData(data) {
        if (!Utils.validateRequired(data.name, '받는 분')) return false;
        if (!Utils.validateRequired(data.phone, '연락처')) return false;
        if (!Utils.validateRequired(data.address, '주소')) return false;
        
        return true;
    },

    // HTML 이스케이프 (XSS 방지)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 신청 내역 새로고침
    async refreshApplications() {
        await this.loadApplications();
    },

    // 키보드 단축키 처리 (Supabase 연동)
    async handleKeyboardShortcuts(event) {
        try {
            // 수업계획이 승인되지 않은 경우 신청 단축키 비활성화
            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) return;

            const budgetStatus = await SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            
            // Ctrl/Cmd + N: 새 신청
            if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
                event.preventDefault();
                if (Utils.$('#studentPage').classList.contains('active')) {
                    if (budgetStatus && budgetStatus.canApplyForEquipment) {
                        this.showApplicationModal();
                    } else {
                        Utils.showAlert('교구 신청을 위해서는 수업계획을 먼저 제출하고 승인을 받아야 합니다.\n\n수업계획 작성은 필수 사항입니다.');
                    }
                }
            }
            
            // F5: 새로고침
            if (event.key === 'F5') {
                event.preventDefault();
                await this.refreshApplications();
            }
        } catch (error) {
            console.error('Error handling keyboard shortcuts:', error);
        }
    }
};

// 키보드 단축키 등록
document.addEventListener('keydown', (event) => {
    if (AuthManager.isStudent()) {
        StudentManager.handleKeyboardShortcuts(event);
    }
});
