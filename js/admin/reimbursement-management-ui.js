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
        const pendingReimbursement = this.getPendingReimbursement(student.id);
        const latestReimbursement = this.getLatestReimbursement(student.id);
        const itemsSummary = this.getStudentItemsSummary(student.id);
        const paymentStatus = this.getStudentPaymentStatus(student.id);
        const statusText = this.getPaymentStatusText(paymentStatus);

        // 계좌 정보 표시 (최신 차수 기준)
        const accountInfoHtml = latestReimbursement && latestReimbursement.bank_name ? `
            <div class="account-details">
                <div><strong>${latestReimbursement.bank_name}</strong> ${latestReimbursement.account_holder_name}</div>
                <div>${latestReimbursement.account_number}</div>
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

        // 관리자 입력 금액 표시 (활성 차수만)
        const amountDisplay = pendingReimbursement && pendingReimbursement.scheduled_amount ? 
            `<span class="amount-set">${pendingReimbursement.scheduled_amount.toLocaleString()}원</span>` : 
            '<span class="need-input">입력 필요</span>';

        // 액션 버튼들
        const actionButtons = this.createActionButtons(student.id, paymentStatus, pendingReimbursement);

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
    system.createActionButtons = function(userId, paymentStatus, pendingReimbursement) {
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

        // 🆕 자료 보완 요청 버튼 (항상 표시)
        const hasSupplementRequest = this.hasAnySupplementRequest(userId);
        const supplementButtonClass = hasSupplementRequest ? 'btn-supplement-request has-request' : 'btn-supplement-request';

        buttons.push(`
            <button class="${supplementButtonClass}" onclick="window.reimbursementManagementSystem.openSupplementRequestModal('${userId}', '${student?.name}')">
                <i data-lucide="clipboard-list"></i>
                자료 보완 요청
            </button>
        `);

        // 지급완료 버튼 (pending 상태이고 금액이 설정된 경우만)
        if (paymentStatus === 'pending' && pendingReimbursement && pendingReimbursement.scheduled_amount) {
            buttons.push(`
                <button class="btn-complete-payment" onclick="window.reimbursementManagementSystem.openPaymentCompleteModal('${userId}', '${student?.name}')">
                    <i data-lucide="check-circle"></i>
                    지급완료
                </button>
            `);
        }

        // 지급정보 버튼 (완료된 지급 내역이 있을 때만 표시)
        const completedPayments = this.getCompletedReimbursements(userId);
        if (completedPayments && completedPayments.length > 0) {
            buttons.push(`
                <button class="btn-payment-history" onclick="window.reimbursementManagementSystem.openPaymentHistoryModal('${userId}', '${student?.name}')">
                    <i data-lucide="history"></i>
                    지급정보
                </button>
            `);
        }

        return buttons.join('');
    };
    
    
    /**
     * 🆕 사용자의 모든 차수에서 자료 보완 요청 존재 여부 확인
     */
    system.hasAnySupplementRequest = function(userId) {
        const allReimbursements = this.reimbursementData.get(userId) || [];
        return allReimbursements.some(r => 
            r.admin_supplement_request && 
            r.admin_supplement_request.trim() !== ''
        );
    };
    
    /**
     * 통계 대시보드 업데이트
     */
    system.updateStatistics = async function() {
        try {
            // 🔄 기존 통계 조회
            const stats = await this.getReimbursementSummaryStats();

            // 🆕 차수별 금액 통계 추가 쿼리
            const { data: amountStats, error } = await this.supabaseClient
                .from('user_reimbursements')
                .select('payment_round, scheduled_amount, actual_amount, payment_status');

            if (error) {
                throw new Error(`차수별 통계 조회 실패: ${error.message}`);
            }

            // 🆕 차수별 예정 금액 계산
            const round1Scheduled = amountStats
                ?.filter(item => item.payment_round === 1)
                ?.reduce((sum, item) => sum + (parseFloat(item.scheduled_amount) || 0), 0) || 0;

            const round2Scheduled = amountStats
                ?.filter(item => item.payment_round === 2)
                ?.reduce((sum, item) => sum + (parseFloat(item.scheduled_amount) || 0), 0) || 0;

            const round3Scheduled = amountStats
                ?.filter(item => item.payment_round === 3)
                ?.reduce((sum, item) => sum + (parseFloat(item.scheduled_amount) || 0), 0) || 0;

            // 🆕 실제 지급된 총 금액
            const totalActualPaid = amountStats
                ?.filter(item => item.payment_status === 'completed')
                ?.reduce((sum, item) => sum + (parseFloat(item.actual_amount) || 0), 0) || 0;

            // 🔄 기존 4개 DOM 요소들 업데이트 (완전 유지)
            const existingElements = {
                totalStudents: document.getElementById('total-students'),
                totalItems: document.getElementById('total-items'),
                pendingAmount: document.getElementById('pending-amount'),
                completedPayments: document.getElementById('completed-payments') // 기존 그대로 유지
            };

            if (existingElements.totalStudents) {
                existingElements.totalStudents.textContent = stats.totalStudents;
            }
            if (existingElements.totalItems) {
                existingElements.totalItems.textContent = stats.totalItems;
            }
            if (existingElements.pendingAmount) {
                existingElements.pendingAmount.textContent = stats.pendingAmount;
            }
            if (existingElements.completedPayments) {
                existingElements.completedPayments.textContent = stats.completedPayments; // 기존 로직 유지
            }

            // 🆕 새로운 4개 금액 통계 DOM 업데이트
            const newElements = {
                round1Scheduled: document.getElementById('round1-scheduled'),
                round2Scheduled: document.getElementById('round2-scheduled'),
                round3Scheduled: document.getElementById('round3-scheduled'),
                totalActualPaid: document.getElementById('total-actual-paid')
            };

            if (newElements.round1Scheduled) {
                newElements.round1Scheduled.textContent = `${round1Scheduled.toLocaleString()}원`;
            }
            if (newElements.round2Scheduled) {
                newElements.round2Scheduled.textContent = `${round2Scheduled.toLocaleString()}원`;
            }
            if (newElements.round3Scheduled) {
                newElements.round3Scheduled.textContent = `${round3Scheduled.toLocaleString()}원`;
            }
            if (newElements.totalActualPaid) {
                newElements.totalActualPaid.textContent = `${totalActualPaid.toLocaleString()}원`;
            }

            console.log('📊 통계 업데이트 완료:', { 
                ...stats, 
                round1Scheduled, 
                round2Scheduled, 
                round3Scheduled, 
                totalActualPaid 
            });

        } catch (error) {
            console.error('❌ 통계 업데이트 오류:', error);

            // 오류 시 새로운 4개 요소들만 오류 표시
            const errorIds = ['round1-scheduled', 'round2-scheduled', 'round3-scheduled', 'total-actual-paid'];
            errorIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = '오류';
            });
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
     * 지급 완료 처리 모달 열기
     */
    system.openPaymentCompleteModal = async function(userId, userName) {
        try {
            this.currentUser = { id: userId, name: userName };

            const pendingReimbursement = this.getPendingReimbursement(userId);
            if (!pendingReimbursement) {
                throw new Error('처리할 pending 차수가 없습니다.');
            }

            // 모달 제목 설정
            const titleElement = document.getElementById('paymentStudentName');
            if (titleElement) {
                titleElement.textContent = `${userName}님 - ${pendingReimbursement.payment_round}차 지원`;
            }

            // 예정 정보 표시
            const scheduledInfoElement = document.getElementById('scheduledInfo');
            if (scheduledInfoElement) {
                const scheduledDate = pendingReimbursement.scheduled_date ? 
                    new Date(pendingReimbursement.scheduled_date).toLocaleDateString() : '-';
                scheduledInfoElement.textContent = 
                    `예정 금액: ${pendingReimbursement.scheduled_amount?.toLocaleString()}원 (${scheduledDate})`;
            }

            // 실제 입금 정보 초기값 설정
            const actualAmountInput = document.getElementById('actualAmount');
            const actualDateInput = document.getElementById('actualDate');

            if (actualAmountInput) actualAmountInput.value = pendingReimbursement.scheduled_amount || '';
            if (actualDateInput) actualDateInput.value = new Date().toISOString().split('T')[0];

            // confirmed 상태 항목들만 표시
            await this.renderAffectedItems(userId);

            // 모달 표시
            const modal = document.getElementById('paymentCompleteModal');
            if (modal) {
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }

            console.log(`✅ 지급 완료 모달 열기: ${userName} (confirmed 항목만)`);

        } catch (error) {
            console.error('❌ 지급 완료 모달 오류:', error);
            this.showToast(error.message, 'error');
        }
    };

    /**
     * 영향받는 항목들 렌더링 (confirmed 상태만)
     */
    system.renderAffectedItems = async function(userId) {
        const list = document.getElementById('affectedItemsList');
        if (!list) return;

        try {
            // confirmed 상태인 항목들만 조회
            const { data: confirmedItems, error } = await this.supabaseClient
                .from('v_user_reimbursement_items')
                .select('*')
                .eq('user_id', userId)
                .eq('reimbursement_completed', 'confirmed')  // 🔑 핵심: confirmed만
                .order('display_order', { ascending: true });

            if (error) {
                throw new Error(`confirmed 항목 조회 실패: ${error.message}`);
            }

            if (!confirmedItems || confirmedItems.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6b7280;">
                        <i data-lucide="info" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <p>지급 완료 처리할 항목이 없습니다.</p>
                        <p style="font-size: 12px; margin-top: 5px;">
                            먼저 [금액설정]에서 항목을 선택해주세요.
                        </p>
                    </div>
                `;
            } else {
                const itemsHtml = confirmedItems.map(item => {
                    return `
                        <div class="item-check">
                            <input type="checkbox" checked disabled>
                            <span>${item.item_title}</span>
                            ${item.total_amount ? `<span style="margin-left: auto; color: #27ae60;">${item.total_amount.toLocaleString()}원</span>` : ''}
                        </div>
                    `;
                }).join('');

                list.innerHTML = itemsHtml;
            }

            // 아이콘 초기화
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            console.log(`✅ confirmed 항목 ${confirmedItems?.length || 0}개 표시`);

        } catch (error) {
            console.error('❌ confirmed 항목 조회 오류:', error);

            list.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc3545;">
                    <i data-lucide="alert-circle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p>항목을 불러오는데 실패했습니다.</p>
                </div>
            `;

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    };
    
    /**
     * 모든 모달 닫기
     */
    system.closeAllModals = function() {
        const modals = ['receiptsDetailModal', 'amountSettingModal', 'paymentCompleteModal', 'paymentHistoryModal'];
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
     * 지급정보 모달 열기
     */
    system.openPaymentHistoryModal = async function(userId, userName) {
        try {
            this.currentUser = { id: userId, name: userName };

            const completedPayments = this.getCompletedReimbursements(userId);

            // 모달 제목 설정
            const titleElement = document.getElementById('historyStudentName');
            if (titleElement) {
                titleElement.textContent = userName;
            }

            // 지급 내역 렌더링
            this.renderPaymentHistory(completedPayments);

            // 모달 표시
            const modal = document.getElementById('paymentHistoryModal');
            if (modal) {
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }

            console.log(`📊 지급정보 모달 열기: ${userName} (${completedPayments.length}개 차수)`);

        } catch (error) {
            console.error('❌ 지급정보 모달 오류:', error);
            this.showToast('지급 내역을 불러오는데 실패했습니다.', 'error');
        }
    };

    /**
     * 지급 내역 렌더링
     */
    system.renderPaymentHistory = function(payments) {
        const list = document.getElementById('paymentHistoryList');
        const totalElement = document.getElementById('totalPaidAmount');

        if (!list || !totalElement) return;

        if (payments.length === 0) {
            list.innerHTML = `
                <div class="no-payments">
                    <i data-lucide="file-x"></i>
                    <p>아직 지급된 내역이 없습니다.</p>
                </div>
            `;
            totalElement.textContent = '0원';

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        let totalAmount = 0;
        const historyHtml = payments.map(payment => {
            const paidAmount = payment.actual_amount || payment.scheduled_amount;
            totalAmount += paidAmount;

            const paidDate = payment.actual_date ? 
                new Date(payment.actual_date).toLocaleDateString() : 
                new Date(payment.scheduled_date).toLocaleDateString();

            return `
                <div class="payment-item">
                    <div class="payment-header">
                        <div class="payment-round">${payment.payment_round}차 지원</div>
                        <div class="payment-amount">${paidAmount.toLocaleString()}원</div>
                    </div>
                    <div class="payment-details">
                        <div class="payment-date">
                            <i data-lucide="calendar"></i>
                            지급일: ${paidDate}
                        </div>
                        ${payment.admin_notes ? `
                            <div class="payment-notes">💬 ${payment.admin_notes}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        list.innerHTML = historyHtml;
        totalElement.textContent = `${totalAmount.toLocaleString()}원`;

        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };       
    
    /**
     * 🆕 통화 포맷 헬퍼 함수 (만원/억원 단위 변환)
     */
    system.formatCurrency = function(amount) {
        if (amount === 0) return '0원';
        if (amount >= 100000000) {
            return `${(amount / 100000000).toFixed(1)}억원`;
        } else if (amount >= 10000) {
            return `${(amount / 10000).toFixed(0)}만원`;
        } else {
            return `${amount.toLocaleString()}원`;
        }
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
