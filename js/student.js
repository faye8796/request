// 학생 기능 관리 모듈
const StudentManager = {
    currentEditingItem: null,
    currentReceiptItem: null,

    // 초기화
    init() {
        this.setupEventListeners();
        this.updateUserDisplay();
        this.loadApplications();
        this.updateBudgetStatus();
        this.checkLessonPlanStatus(); // 수업계획 상태 확인 추가
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
        Utils.$('#receiptItemName').textContent = item.name;
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

    // 영수증 제출 처리
    handleReceiptSubmit() {
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
        
        reader.onload = () => {
            setTimeout(() => {
                try {
                    const receiptData = {
                        image: reader.result,
                        purchaseDateTime: purchaseDateTime,
                        purchaseStore: purchaseStore,
                        note: receiptNote,
                        fileName: file.name,
                        fileSize: file.size
                    };

                    const studentId = DataManager.currentUser.id;
                    
                    if (DataManager.submitReceipt(studentId, this.currentReceiptItem.id, receiptData)) {
                        Utils.showAlert('영수증이 성공적으로 제출되었습니다.');
                        Utils.hideLoading(submitBtn);
                        this.hideReceiptModal();
                        this.loadApplications();
                    } else {
                        throw new Error('영수증 제출 실패');
                    }
                    
                } catch (error) {
                    Utils.hideLoading(submitBtn);
                    Utils.showAlert('영수증 제출 중 오류가 발생했습니다.');
                    console.error('Receipt submission error:', error);
                }
            }, 1000);
        };

        reader.readAsDataURL(file);
    },

    // 수업계획 페이지로 이동
    goToLessonPlan() {
        App.showPage('lessonPlanPage');
        LessonPlanManager.showLessonPlanPage();
    },

    // 수업계획 상태 확인 및 UI 업데이트
    checkLessonPlanStatus() {
        const studentId = DataManager.currentUser.id;
        const hasCompletedPlan = LessonPlanManager.hasCompletedLessonPlan(studentId);
        const lessonPlanBtn = Utils.$('#lessonPlanBtn');
        
        if (lessonPlanBtn) {
            if (hasCompletedPlan) {
                // 완료된 경우 - 수정/보기 모드
                lessonPlanBtn.innerHTML = `
                    <i data-lucide="calendar-check"></i>
                    수업계획 보기
                `;
                lessonPlanBtn.classList.remove('btn-warning');
                lessonPlanBtn.classList.add('btn-success');
            } else {
                // 미완료된 경우 - 작성 필요
                const needsPlan = LessonPlanManager.needsLessonPlan(studentId);
                if (needsPlan) {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-plus"></i>
                        수업계획 작성
                    `;
                } else {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-edit"></i>
                        수업계획 완료
                    `;
                }
                lessonPlanBtn.classList.remove('btn-success');
                lessonPlanBtn.classList.add('btn-warning');
            }
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        // 수업계획이 완료되지 않은 경우 알림 표시
        if (!hasCompletedPlan) {
            this.showLessonPlanIncompleteNotice();
        }
    },

    // 수업계획 미완료 알림 표시
    showLessonPlanIncompleteNotice() {
        const existingNotice = Utils.$('#lessonPlanNotice');
        if (existingNotice) {
            return; // 이미 표시 중
        }

        const studentId = DataManager.currentUser.id;
        const needsPlan = LessonPlanManager.needsLessonPlan(studentId);
        const canEdit = DataManager.canEditLessonPlan();
        
        let noticeContent;
        if (!canEdit) {
            noticeContent = `
                <div class="notice-content warning">
                    <i data-lucide="alert-triangle"></i>
                    <div>
                        <h4>수업계획 수정 기간이 종료되었습니다</h4>
                        <p>수업계획 작성/수정 가능 기간이 지났습니다. 관리자에게 문의하세요.</p>
                    </div>
                </div>
            `;
        } else if (needsPlan) {
            noticeContent = `
                <div class="notice-content info">
                    <i data-lucide="calendar-plus"></i>
                    <div>
                        <h4>수업계획 작성이 필요합니다</h4>
                        <p>교구 신청 전에 먼저 수업계획을 작성해주세요.</p>
                        <button class="btn primary small" onclick="StudentManager.goToLessonPlan()">
                            지금 작성하기
                        </button>
                    </div>
                </div>
            `;
        } else {
            noticeContent = `
                <div class="notice-content warning">
                    <i data-lucide="calendar-edit"></i>
                    <div>
                        <h4>수업계획을 완료해주세요</h4>
                        <p>임시저장된 수업계획이 있습니다. 완료 후 교구 신청이 가능합니다.</p>
                        <button class="btn warning small" onclick="StudentManager.goToLessonPlan()">
                            완료하기
                        </button>
                    </div>
                </div>
            `;
        }

        const notice = Utils.createElement('div', 'dashboard-notice');
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
    },

    // 대시보드 로드 (외부에서 호출용)
    loadDashboard() {
        this.loadApplications();
        this.updateBudgetStatus();
        this.checkLessonPlanStatus();
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
    updateUserDisplay() {
        AuthManager.updateUserDisplay();
    },

    // 예산 현황 업데이트
    updateBudgetStatus() {
        const stats = this.getApplicationStats();
        const budgetLimit = DataManager.currentUser.budgetLimit;
        const usagePercentage = Math.round((stats.totalAmount / budgetLimit) * 100);
        
        let budgetDisplay = Utils.$('#budgetStatus');
        if (!budgetDisplay) {
            budgetDisplay = Utils.createElement('div', 'budget-status-container');
            budgetDisplay.id = 'budgetStatus';
        }
        
        const remainingBudget = budgetLimit - stats.totalAmount;
        const statusClass = usagePercentage >= 90 ? 'danger' : usagePercentage >= 70 ? 'warning' : 'safe';
        
        budgetDisplay.innerHTML = `
            <div class="budget-info">
                <div class="budget-bar-container">
                    <div class="budget-bar">
                        <div class="budget-progress ${statusClass}" style="width: ${Math.min(usagePercentage, 100)}%"></div>
                    </div>
                    <div class="budget-text">
                        <span class="budget-used">사용: ${Utils.formatPrice(stats.totalAmount)}</span>
                        <span class="budget-limit">/ ${Utils.formatPrice(budgetLimit)}</span>
                        <span class="budget-percentage">(${usagePercentage}%)</span>
                    </div>
                </div>
                <div class="budget-remaining">
                    잔여 예산: <strong>${Utils.formatPrice(remainingBudget)}</strong>
                </div>
            </div>
        `;
    },

    // 신청 내역 로드
    loadApplications() {
        const studentId = DataManager.currentUser.id;
        const applications = DataManager.getStudentApplications(studentId);
        
        this.renderApplications(applications);
        this.updateBudgetStatus();
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
        
        const statusClass = DataManager.getStatusClass(application.status);
        const statusText = DataManager.getStatusText(application.status);
        const typeIcon = application.type === 'bundle' ? 'shopping-cart' : 'package';
        const typeText = application.type === 'bundle' ? '묶음신청' : '단일신청';
        
        // 구매 방식 뱃지 생성
        const purchaseMethodClass = DataManager.getPurchaseMethodClass(application.purchaseMethod);
        const purchaseMethodText = DataManager.getPurchaseMethodText(application.purchaseMethod);
        
        // 영수증 등록 버튼 (오프라인 구매이고 승인된 경우)
        let receiptButton = '';
        if (application.purchaseMethod === 'offline' && application.status === 'approved' && !application.receiptImage) {
            receiptButton = `
                <button class="btn small primary receipt-btn" data-item-id="${application.id}">
                    ${Utils.createIcon('receipt')} 영수증 등록
                </button>
            `;
        }
        
        // 영수증 제출 상태 표시
        let receiptStatus = '';
        if (application.purchaseMethod === 'offline' && application.receiptImage) {
            receiptStatus = `
                <div class="receipt-status">
                    <i data-lucide="check-circle"></i>
                    영수증 제출완료
                    <small>${new Date(application.receiptSubmittedAt).toLocaleString('ko-KR')}</small>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="application-card-header">
                <div>
                    <div class="card-title-row">
                        <h3>${this.escapeHtml(application.name)}</h3>
                        <div class="card-badges">
                            <span class="purchase-method-badge ${purchaseMethodClass}">
                                ${Utils.createIcon(application.purchaseMethod === 'offline' ? 'store' : 'shopping-cart')} ${purchaseMethodText}
                            </span>
                            <span class="type-badge ${application.type}">
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
                ${application.link ? `
                    <div class="detail-item">
                        <span class="detail-label">${application.purchaseMethod === 'offline' ? '참고 링크' : '구매 링크'}</span>
                        <span class="detail-value">
                            <a href="${this.escapeHtml(application.link)}" target="_blank" rel="noopener noreferrer">
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
            
            ${application.rejectionReason ? `
                <div class="rejection-reason">
                    <div class="reason-label">반려 사유</div>
                    <div class="reason-text">${this.escapeHtml(application.rejectionReason)}</div>
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

    // 영수증 등록 모달 열기
    openReceiptModal(itemId) {
        const studentId = DataManager.currentUser.id;
        const applications = DataManager.getStudentApplications(studentId);
        const item = applications.find(app => app.id === itemId);
        
        if (!item || item.purchaseMethod !== 'offline' || item.status !== 'approved') {
            Utils.showAlert('영수증 등록이 불가능한 상태입니다.');
            return;
        }

        this.showReceiptModal(item);
    },

    // 신청 수정
    editApplication(itemId) {
        const studentId = DataManager.currentUser.id;
        const applications = DataManager.getStudentApplications(studentId);
        const item = applications.find(app => app.id === itemId);
        
        if (!item || item.status !== 'pending') {
            Utils.showAlert('검토 중인 신청만 수정할 수 있습니다.');
            return;
        }

        this.currentEditingItem = item;
        
        if (item.type === 'bundle') {
            this.showBundleModal(item);
        } else {
            this.showApplicationModal(item);
        }
    },

    // 신청 삭제
    deleteApplication(itemId) {
        if (Utils.showConfirm('정말로 이 신청을 삭제하시겠습니까?')) {
            const studentId = DataManager.currentUser.id;
            
            if (DataManager.deleteApplicationItem(studentId, itemId)) {
                this.loadApplications();
                Utils.showAlert('신청이 삭제되었습니다.');
            } else {
                Utils.showAlert('삭제할 수 없습니다. 검토 중인 신청만 삭제 가능합니다.');
            }
        }
    },

    // 일반 신청 모달 표시
    showApplicationModal(editData = null) {
        const modal = Utils.$('#applicationModal');
        const title = Utils.$('#applicationModalTitle');
        const submitBtn = Utils.$('#submitBtn');
        
        if (editData) {
            title.textContent = '교구 신청 수정';
            submitBtn.textContent = '수정하기';
            
            // 폼에 기존 데이터 채우기
            Utils.$('#itemName').value = editData.name;
            Utils.$('#itemPurpose').value = editData.purpose;
            Utils.$('#itemPrice').value = editData.price;
            Utils.$('#itemLink').value = editData.link || '';
            
            // 구매 방식 설정
            const purchaseMethodRadio = Utils.$(`input[name="purchaseMethod"][value="${editData.purchaseMethod || 'online'}"]`);
            if (purchaseMethodRadio) {
                purchaseMethodRadio.checked = true;
                this.handlePurchaseMethodChange(editData.purchaseMethod || 'online');
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
    },

    // 일반 신청 모달 숨김
    hideApplicationModal() {
        const modal = Utils.$('#applicationModal');
        modal.classList.remove('active');
        this.currentEditingItem = null;
        Utils.resetForm('#applicationForm');
    },

    // 묶음 신청 모달 표시
    showBundleModal(editData = null) {
        const modal = Utils.$('#bundleModal');
        
        if (editData) {
            Utils.$('#bundleName').value = editData.name;
            Utils.$('#bundlePurpose').value = editData.purpose;
            Utils.$('#bundlePrice').value = editData.price;
            Utils.$('#bundleLink').value = editData.link || '';
            
            if (editData.bundleCredentials) {
                Utils.$('#bundleUserId').value = editData.bundleCredentials.userId;
                // 보안상 비밀번호는 복원하지 않음
            }
        } else {
            Utils.resetForm('#bundleForm');
        }
        
        modal.classList.add('active');
        
        setTimeout(() => {
            Utils.$('#bundleName').focus();
        }, 100);
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
        const user = DataManager.currentUser;
        
        // 기존 배송지 정보가 있으면 채우기
        if (user.shippingAddress) {
            const addr = user.shippingAddress;
            Utils.$('#shippingName').value = addr.name || '';
            Utils.$('#shippingPhone').value = addr.phone || '';
            Utils.$('#shippingAddress').value = addr.address || '';
            Utils.$('#shippingPostcode').value = addr.postcode || '';
            Utils.$('#shippingNote').value = addr.note || '';
        }
        
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

    // 일반 신청 제출 처리
    handleApplicationSubmit() {
        const formData = this.getFormData();
        
        // 입력 검증
        if (!this.validateFormData(formData)) {
            return;
        }

        const submitBtn = Utils.$('#submitBtn');
        Utils.showLoading(submitBtn);

        setTimeout(() => {
            try {
                const studentId = DataManager.currentUser.id;
                
                if (this.currentEditingItem) {
                    // 수정 모드
                    if (DataManager.updateApplicationItem(studentId, this.currentEditingItem.id, formData)) {
                        Utils.showAlert('교구 신청이 수정되었습니다.');
                    } else {
                        throw new Error('수정 실패');
                    }
                } else {
                    // 새 신청 모드
                    DataManager.addApplication(studentId, formData);
                    Utils.showAlert('교구 신청이 완료되었습니다.');
                }
                
                Utils.hideLoading(submitBtn);
                this.hideApplicationModal();
                this.loadApplications();
                
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
                console.error('Application submission error:', error);
            }
        }, 1000);
    },

    // 묶음 신청 제출 처리
    handleBundleSubmit() {
        const formData = this.getBundleFormData();
        
        if (!this.validateBundleFormData(formData)) {
            return;
        }

        const submitBtn = Utils.$('#bundleForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        setTimeout(() => {
            try {
                const studentId = DataManager.currentUser.id;
                
                const bundleData = {
                    name: formData.name,
                    purpose: formData.purpose,
                    price: formData.price,
                    link: formData.link,
                    type: 'bundle',
                    purchaseMethod: 'online', // 묶음 신청은 항상 온라인
                    bundleCredentials: {
                        userId: formData.userId,
                        password: '***encrypted***' // 실제로는 암호화 처리
                    }
                };
                
                if (this.currentEditingItem) {
                    if (DataManager.updateApplicationItem(studentId, this.currentEditingItem.id, bundleData)) {
                        Utils.showAlert('묶음 신청이 수정되었습니다.');
                    } else {
                        throw new Error('수정 실패');
                    }
                } else {
                    DataManager.addApplication(studentId, bundleData);
                    Utils.showAlert('묶음 신청이 완료되었습니다.');
                }
                
                Utils.hideLoading(submitBtn);
                this.hideBundleModal();
                this.loadApplications();
                
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
                console.error('Bundle submission error:', error);
            }
        }, 1000);
    },

    // 배송지 설정 제출 처리
    handleShippingSubmit() {
        const formData = this.getShippingFormData();
        
        if (!this.validateShippingFormData(formData)) {
            return;
        }

        const submitBtn = Utils.$('#shippingForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        setTimeout(() => {
            try {
                const studentId = DataManager.currentUser.id;
                
                if (DataManager.updateShippingAddress(studentId, formData)) {
                    Utils.showAlert('배송지가 저장되었습니다.');
                    Utils.hideLoading(submitBtn);
                    this.hideShippingModal();
                } else {
                    throw new Error('배송지 저장 실패');
                }
                
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('배송지 저장 중 오류가 발생했습니다.');
                console.error('Shipping address error:', error);
            }
        }, 500);
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

    // 폼 데이터 검증
    validateFormData(data) {
        if (!Utils.validateRequired(data.name, '교구명')) return false;
        if (!Utils.validateRequired(data.purpose, '사용 목적')) return false;
        if (!data.price || data.price <= 0) {
            Utils.showAlert('올바른 가격을 입력해주세요.');
            return false;
        }

        // 예산 한도 검증 (수정 시 기존 금액 제외)
        const currentStats = this.getApplicationStats();
        let adjustedTotalAmount = currentStats.totalAmount;
        
        if (this.currentEditingItem) {
            adjustedTotalAmount -= this.currentEditingItem.price;
        }
        
        const newTotalAmount = adjustedTotalAmount + data.price;
        const budgetLimit = DataManager.currentUser.budgetLimit;
        
        if (newTotalAmount > budgetLimit) {
            const remainingBudget = budgetLimit - adjustedTotalAmount;
            Utils.showAlert(`예산 한도를 초과합니다.\\n` +
                          `현재 사용: ${Utils.formatPrice(adjustedTotalAmount)}\\n` +
                          `예산 한도: ${Utils.formatPrice(budgetLimit)}\\n` +
                          `신청 가능 금액: ${Utils.formatPrice(remainingBudget)}`);
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
    },

    // 묶음 신청 폼 검증
    validateBundleFormData(data) {
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
        return this.validateFormData({
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

    // 신청 통계 생성
    getApplicationStats() {
        const studentId = DataManager.currentUser.id;
        const applications = DataManager.getStudentApplications(studentId);
        
        const stats = {
            total: applications.length,
            pending: 0,
            approved: 0,
            rejected: 0,
            purchased: 0,
            totalAmount: 0
        };

        applications.forEach(app => {
            stats[app.status]++;
            // 반려된 항목은 예산에서 제외
            if (app.status !== 'rejected') {
                stats.totalAmount += app.price;
            }
        });

        return stats;
    },

    // HTML 이스케이프 (XSS 방지)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 신청 내역 새로고침
    refreshApplications() {
        this.loadApplications();
    },

    // 키보드 단축키 처리
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + N: 새 신청
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            if (Utils.$('#studentPage').classList.contains('active')) {
                this.showApplicationModal();
            }
        }
        
        // F5: 새로고침
        if (event.key === 'F5') {
            event.preventDefault();
            this.refreshApplications();
        }
    }
};

// 키보드 단축키 등록
document.addEventListener('keydown', (event) => {
    if (DataManager.currentUserType === 'student') {
        StudentManager.handleKeyboardShortcuts(event);
    }
});