// 💰 실비 지원 관리 시스템 - UI 렌더링 모듈 v1.0.0
// admin/reimbursement-management-ui.js

/**
 * 실비 지원 관리 시스템의 UI 렌더링 담당 모듈
 * 학생 목록 테이블, 통계 대시보드 렌더링
 */


// PDF 파일 여부 확인 함수
function isPDFFile(fileUrl) {
    if (!fileUrl) return false;
    return fileUrl.toLowerCase().includes('.pdf');
}

// 영수증 미리보기 HTML 생성 함수
function createReceiptPreviewHTML(fileUrl, title) {
    if (!fileUrl) {
        return '<div class="no-receipt">영수증 없음</div>';
    }
    
    if (isPDFFile(fileUrl)) {
        return `
            <div class="pdf-preview" onclick="openFullReceiptView('${fileUrl}', '${title}')">
                <i data-lucide="file-text"></i>
                <span>PDF 파일</span>
            </div>
        `;
    }
    
    return `
        <img src="${fileUrl}" 
             alt="영수증" 
             loading="lazy"
             onclick="openFullReceiptView('${fileUrl}', '${title}')"
             onerror="this.parentNode.innerHTML='<div class=&quot;file-fallback&quot; onclick=&quot;openFullReceiptView(\\'${fileUrl}\\', \\'${title}\\')&quot;><i data-lucide=&quot;file-text&quot;></i><span>미리보기 불가</span></div>'; if(typeof lucide !== \\'undefined\\') lucide.createIcons();">
    `;
}


// ReimbursementManagementSystem 클래스에 UI 메서드들 추가
if (window.reimbursementManagementSystem) {
    const system = window.reimbursementManagementSystem;

    /**
     * 학생 목록 테이블 렌더링
     */
    system.renderStudentsTable = function() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;

        // 표시할 학생 목록 결정
        const studentsToRender = this.filteredStudents.length > 0 ? this.filteredStudents : this.students;

        if (studentsToRender.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="no-students">
                            <i data-lucide="users-x"></i>
                            <p>표시할 학생이 없습니다.</p>
                        </div>
                    </td>
                </tr>
            `;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        // 학생 행들 생성
        const rows = studentsToRender.map(student => this.createStudentRow(student)).join('');
        tbody.innerHTML = rows;

        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        console.log(`🎨 학생 테이블 렌더링 완료: ${studentsToRender.length}명`);
    };

    /**
     * 개별 학생 행 생성
     */
    system.createStudentRow = function(student) {
        const reimbursement = this.reimbursementData.get(student.id);
        const itemsSummary = this.getStudentItemsSummary(student.id);
        const paymentStatus = this.getStudentPaymentStatus(student.id);
        const statusText = this.getPaymentStatusText(paymentStatus);

        // 계좌 정보 표시
        const accountInfoHtml = reimbursement && reimbursement.bank_name ? `
            <div class="account-details">
                <div><strong>${reimbursement.bank_name}</strong>${reimbursement.account_holder_name}</div>
                <div>${reimbursement.account_number}</div>
            </div>
        ` : '<div class="no-account">계좌 정보 없음</div>';

        // 실비 항목 요약 배지들
        const categoryBadges = [];
        if (itemsSummary.transport > 0) {
            categoryBadges.push(`<span class="category-badge transport">${this.getCategoryDisplayText('transport')} ${itemsSummary.transport}개</span>`);
        }
        if (itemsSummary.equipment > 0) {
            categoryBadges.push(`<span class="category-badge equipment">${this.getCategoryDisplayText('equipment')} ${itemsSummary.equipment}개</span>`);
        }
        if (itemsSummary.visa > 0) {
            categoryBadges.push(`<span class="category-badge visa">${this.getCategoryDisplayText('visa')} ${itemsSummary.visa}개</span>`);
        }

        // 관리자 입력 금액 표시
        const amountDisplay = reimbursement && reimbursement.scheduled_amount ? 
            `<span class="amount-set">${reimbursement.scheduled_amount.toLocaleString()}원</span>` : 
            '<span class="need-input">입력 필요</span>';

        // 액션 버튼들
        const actionButtons = this.createActionButtons(student.id, paymentStatus, reimbursement);

        return `
            <tr>
                <td class="student-name">${student.name}</td>
                <td class="account-info">${accountInfoHtml}</td>
                <td class="items-summary">${categoryBadges.join('')}</td>
                <td class="admin-amount">${amountDisplay}</td>
                <td class="payment-status">
                    <span class="status-${paymentStatus}">${statusText}</span>
                </td>
                <td class="actions">${actionButtons}</td>
            </tr>
        `;
    };

    /**
     * 액션 버튼들 생성
     */
    system.createActionButtons = function(userId, paymentStatus, reimbursement) {
        const student = this.students.find(s => s.id === userId);
        const buttons = [];

        // 상세보기 버튼 (항상 표시)
        buttons.push(`
            <button class="btn-view-details" onclick="window.reimbursementManagementSystem.openReceiptsDetailModal('${userId}', '${student?.name}')">
                <i data-lucide="eye"></i>
                상세보기
            </button>
        `);

        // 금액설정 버튼 (항상 표시)
        buttons.push(`
            <button class="btn-set-amount" onclick="window.reimbursementManagementSystem.openAmountSettingModal('${userId}', '${student?.name}')">
                <i data-lucide="edit"></i>
                금액설정
            </button>
        `);

        // 지급완료 버튼 (pending 상태이고 금액이 설정된 경우만)
        if (paymentStatus === 'pending' && reimbursement && reimbursement.scheduled_amount) {
            buttons.push(`
                <button class="btn-complete-payment" onclick="window.reimbursementManagementSystem.openPaymentCompleteModal('${userId}', '${student?.name}')">
                    <i data-lucide="check-circle"></i>
                    지급완료
                </button>
            `);
        }

        return buttons.join('');
    };

    /**
     * 통계 대시보드 업데이트
     */
    system.updateStatistics = async function() {
        try {
            const stats = await this.getReimbursementSummaryStats();

            // DOM 요소들 업데이트
            const elements = {
                totalStudents: document.getElementById('total-students'),
                totalItems: document.getElementById('total-items'),
                pendingAmount: document.getElementById('pending-amount'),
                completedPayments: document.getElementById('completed-payments')
            };

            if (elements.totalStudents) {
                elements.totalStudents.textContent = stats.totalStudents;
            }
            if (elements.totalItems) {
                elements.totalItems.textContent = stats.totalItems;
            }
            if (elements.pendingAmount) {
                elements.pendingAmount.textContent = stats.pendingAmount;
            }
            if (elements.completedPayments) {
                elements.completedPayments.textContent = stats.completedPayments;
            }

            console.log('📊 통계 업데이트 완료:', stats);

        } catch (error) {
            console.error('❌ 통계 업데이트 오류:', error);
        }
    };

    /**
     * 영수증 상세보기 모달 열기
     */
    system.openReceiptsDetailModal = async function(userId, userName) {
        try {
            this.currentUser = { id: userId, name: userName };

            // 사용자의 실비 항목들 조회
            const items = await this.loadUserReimbursementItems(userId);

            // 모달 제목 설정
            const titleElement = document.getElementById('studentNameInModal');
            if (titleElement) {
                titleElement.textContent = userName;
            }

            // 영수증 그리드 렌더링
            this.renderReceiptsGrid(items);

            // 모달 표시
            const modal = document.getElementById('receiptsDetailModal');
            if (modal) {
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }

            console.log(`👁️ 영수증 상세보기 모달 열기: ${userName} (${items.length}개 항목)`);

        } catch (error) {
            console.error('❌ 영수증 상세보기 모달 오류:', error);
            this.showToast('영수증 정보를 불러오는데 실패했습니다.', 'error');
        }
    };

    /**
     * 영수증 그리드 렌더링
     */
    system.renderReceiptsGrid = function(items) {
        const grid = document.getElementById('receiptsGrid');
        if (!grid) return;

        if (items.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6c757d;">
                    <i data-lucide="receipt" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>실비 대상 항목이 없습니다.</p>
                </div>
            `;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        const receiptCards = items.map(item => this.createReceiptCard(item)).join('');
        grid.innerHTML = receiptCards;

        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };

    /**
     * 개별 영수증 카드 생성
     */
    system.createReceiptCard = function(item) {
        const formatted = this.formatReimbursementItem(item);

        // 기존 코드를 이것으로 교체
        const previewSection = `
            <div class="receipt-preview">
                ${createReceiptPreviewHTML(formatted.receiptUrl, formatted.title)}
            </div>
        `;

        const actionsSection = formatted.receiptUrl ? `
            <div class="receipt-actions">
                <button class="btn-view-full" onclick="openFullReceiptView('${formatted.receiptUrl}', '${formatted.title}')">
                    <i data-lucide="maximize-2"></i>
                    전체보기
                </button>
                <button class="btn-download" onclick="downloadReceipt('${formatted.receiptUrl}', '${formatted.title}')">
                    <i data-lucide="download"></i>
                    다운로드
                </button>
            </div>
        ` : '';

        return `
            <div class="receipt-item">
                <div class="receipt-info">
                    <h4>${formatted.title}</h4>
                    <p class="receipt-date">${formatted.date}</p>
                    ${formatted.amount ? `<p class="receipt-amount">${formatted.amount}</p>` : ''}
                </div>
                ${previewSection}
                ${actionsSection}
            </div>
        `;
    };

    /**
     * 실비 금액 설정 모달 열기
     */
    system.openAmountSettingModal = async function(userId, userName) {
        try {
            this.currentUser = { id: userId, name: userName };

            // 현재 설정된 실비 정보 조회
            const reimbursement = this.reimbursementData.get(userId);

            // 🆕 pending 상태 항목들 조회 (기존 loadUserReimbursementItems 대신)
            const { data: pendingItems, error } = await this.supabaseClient
                .from('v_user_reimbursement_items')
                .select('*')
                .eq('user_id', userId)
                .eq('reimbursement_completed', 'pending')
                .order('display_order', { ascending: true });

            if (error) {
                throw new Error(`pending 항목 조회 실패: ${error.message}`);
            }

            // 모달 제목 설정
            const titleElement = document.getElementById('amountStudentName');
            if (titleElement) {
                titleElement.textContent = `${userName}님 실비 검토`;
            }

            // 🆕 pending 항목들을 체크박스와 함께 렌더링 (기존 renderAmountItemsList 대신)
            await this.renderPendingItemsWithCheckboxes(userId, userName);

            // 기존 값들 설정
            if (reimbursement) {
                const scheduledAmountInput = document.getElementById('scheduledAmount');
                const scheduledDateInput = document.getElementById('scheduledDate');
                const paymentRoundSelect = document.getElementById('paymentRound');
                const adminNotesTextarea = document.getElementById('adminNotes');

                if (scheduledAmountInput) scheduledAmountInput.value = reimbursement.scheduled_amount || '';
                if (scheduledDateInput) scheduledDateInput.value = reimbursement.scheduled_date || '';
                if (paymentRoundSelect) paymentRoundSelect.value = reimbursement.payment_round || '1';
                if (adminNotesTextarea) adminNotesTextarea.value = reimbursement.admin_notes || '';
            }

            // 모달 표시
            const modal = document.getElementById('amountSettingModal');
            if (modal) {
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }

            console.log(`💰 금액 설정 모달 열기: ${userName} (pending 항목)`);

        } catch (error) {
            console.error('❌ 금액 설정 모달 오류:', error);
            this.showToast('실비 정보를 불러오는데 실패했습니다.', 'error');
        }
    };

    /**
     * pending 상태 항목들을 체크박스와 함께 렌더링 (영수증 새창 열기 방식)
     */
    system.renderPendingItemsWithCheckboxes = async function(userId, userName) {
        try {
            // 로딩 상태 표시
            const container = document.getElementById('pendingItemsList');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6b7280;">
                        <div class="loading-spinner" style="display: inline-block; margin-right: 10px;"></div>
                        pending 상태 항목들을 불러오는 중...
                    </div>
                `;
            }

            // pending 상태 항목들만 조회
            const { data, error } = await this.supabaseClient
                .from('v_user_reimbursement_items')
                .select('*')
                .eq('user_id', userId)
                .eq('reimbursement_completed', 'pending')
                .order('display_order', { ascending: true });

            if (error) {
                throw new Error(`pending 항목 조회 실패: ${error.message}`);
            }

            const pendingItems = data || [];

            // 컨테이너 업데이트
            if (container) {
                if (pendingItems.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: #6b7280;">
                            <i data-lucide="check-circle" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                            <p>검토 대기 중인 항목이 없습니다.</p>
                            <p style="font-size: 12px; margin-top: 5px;">모든 항목이 이미 확인되었거나 영수증이 없습니다.</p>
                        </div>
                    `;
                } else {
                    // 체크박스 항목들 렌더링 (새창 열기 방식 적용)
                    const itemsHtml = pendingItems.map(item => `
                        <div class="review-item" onclick="toggleItemSelection('${item.item_id}', '${item.source_table}', '${item.item_type}')">
                            <div class="item-checkbox">
                                <input type="checkbox" 
                                       id="item_${item.item_id}" 
                                       value="${item.item_id}" 
                                       data-source-table="${item.source_table}"
                                       data-item-type="${item.item_type}"
                                       onclick="event.stopPropagation();">
                            </div>
                            <div class="item-info">
                                <div class="item-title">${item.item_title}</div>
                                <div class="item-details">
                                    <div class="item-date">
                                        <i data-lucide="calendar"></i>
                                        ${item.item_date ? new Date(item.item_date).toLocaleDateString() : '날짜 없음'}
                                    </div>
                                    ${item.total_amount ? `
                                        <div class="item-amount">
                                            <i data-lucide="dollar-sign"></i>
                                            ${item.total_amount.toLocaleString()}원
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="item-actions">
                                ${item.receipt_file_url ? `
                                    <button class="btn-view-receipt" 
                                            onclick="event.stopPropagation(); window.open('${item.receipt_file_url}', '_blank', 'noopener,noreferrer')">
                                        <i data-lucide="eye"></i>
                                        영수증
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('');

                    container.innerHTML = itemsHtml;
                }

                // 아이콘 초기화
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }

            // 선택 개수 업데이트
            this.updateSelectedCount();

            console.log(`✅ pending 항목 렌더링 완료: ${pendingItems.length}개`);

        } catch (error) {
            console.error('❌ pending 항목 렌더링 오류:', error);

            const container = document.getElementById('pendingItemsList');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #dc3545;">
                        <i data-lucide="alert-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>항목을 불러오는데 실패했습니다.</p>
                        <button onclick="window.reimbursementManagementSystem.renderPendingItemsWithCheckboxes('${userId}', '${userName}')" 
                                style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            다시 시도
                        </button>
                    </div>
                `;

                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }
    };
    /**
     * 지급 완료 처리 모달 열기
     */
    system.openPaymentCompleteModal = async function(userId, userName) {
        try {
            this.currentUser = { id: userId, name: userName };

            const reimbursement = this.reimbursementData.get(userId);
            if (!reimbursement) {
                throw new Error('실비 설정 정보를 찾을 수 없습니다.');
            }

            const items = await this.loadUserReimbursementItems(userId);

            // 모달 제목 설정
            const titleElement = document.getElementById('paymentStudentName');
            if (titleElement) {
                titleElement.textContent = `${userName}님 - ${reimbursement.payment_round}차 지원`;
            }

            // 예정 정보 표시
            const scheduledInfoElement = document.getElementById('scheduledInfo');
            if (scheduledInfoElement) {
                const scheduledDate = reimbursement.scheduled_date ? 
                    new Date(reimbursement.scheduled_date).toLocaleDateString() : '-';
                scheduledInfoElement.textContent = 
                    `예정 금액: ${reimbursement.scheduled_amount?.toLocaleString()}원 (${scheduledDate})`;
            }

            // 실제 입금 정보 초기값 설정
            const actualAmountInput = document.getElementById('actualAmount');
            const actualDateInput = document.getElementById('actualDate');

            if (actualAmountInput) actualAmountInput.value = reimbursement.scheduled_amount || '';
            if (actualDateInput) actualDateInput.value = new Date().toISOString().split('T')[0];

            // 영향받는 항목들 표시
            this.renderAffectedItems(items);

            // 모달 표시
            const modal = document.getElementById('paymentCompleteModal');
            if (modal) {
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }

            console.log(`✅ 지급 완료 모달 열기: ${userName} (${items.length}개 항목)`);

        } catch (error) {
            console.error('❌ 지급 완료 모달 오류:', error);
            this.showToast(error.message, 'error');
        }
    };

    /**
     * 영향받는 항목들 렌더링
     */
    system.renderAffectedItems = function(items) {
        const list = document.getElementById('affectedItemsList');
        if (!list) return;

        const itemsHtml = items.map(item => {
            const formatted = this.formatReimbursementItem(item);
            return `
                <div class="item-check">
                    <input type="checkbox" checked disabled>
                    <span>${formatted.title}</span>
                </div>
            `;
        }).join('');

        list.innerHTML = itemsHtml;
    };

    /**
     * 모든 모달 닫기
     */
    system.closeAllModals = function() {
        const modals = ['receiptsDetailModal', 'amountSettingModal', 'paymentCompleteModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.classList.contains('show')) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
        
        this.currentUser = null;
    };

    /**
     * 폼 데이터 초기화
     */
    system.resetForms = function() {
        // 금액 설정 폼 초기화
        const scheduledAmountInput = document.getElementById('scheduledAmount');
        const scheduledDateInput = document.getElementById('scheduledDate');
        const paymentRoundSelect = document.getElementById('paymentRound');
        const adminNotesTextarea = document.getElementById('adminNotes');

        if (scheduledAmountInput) scheduledAmountInput.value = '';
        if (scheduledDateInput) scheduledDateInput.value = new Date().toISOString().split('T')[0];
        if (paymentRoundSelect) paymentRoundSelect.value = '1';
        if (adminNotesTextarea) adminNotesTextarea.value = '';

        // 지급 완료 폼 초기화
        const actualAmountInput = document.getElementById('actualAmount');
        const actualDateInput = document.getElementById('actualDate');

        if (actualAmountInput) actualAmountInput.value = '';
        if (actualDateInput) actualDateInput.value = new Date().toISOString().split('T')[0];
    };

    console.log('🎨 실비 관리 시스템 UI 모듈 로드 완료 (v1.0.0)');
}
