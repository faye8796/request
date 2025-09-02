// 💰 실비 지원 관리 시스템 - 모달 관리 모듈 v1.0.0
// admin/reimbursement-management-modals.js

/**
 * 실비 지원 관리 시스템의 모달 창 관리 담당 모듈
 * 영수증 상세보기, 금액 설정, 지급 완료 처리 모달들 관리
 */

// ReimbursementManagementSystem 클래스에 모달 관리 메서드들 추가
if (window.reimbursementManagementSystem) {
    const system = window.reimbursementManagementSystem;

    /**
     * 모달 초기화 및 이벤트 바인딩
     */
    system.initializeModals = function() {
        // 모달 외부 클릭시 닫기
        document.addEventListener('click', (event) => {
            const modals = ['receiptsDetailModal', 'amountSettingModal', 'paymentCompleteModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    this.closeModal(modalId);
                }
            });
        });

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // 폼 제출 이벤트 바인딩
        this.bindFormEvents();

        console.log('🔧 모달 시스템 초기화 완료');
    };

    /**
     * 폼 이벤트 바인딩
     */
    system.bindFormEvents = function() {
        // 금액 설정 폼 엔터키 처리
        const amountForm = document.getElementById('amountSettingModal');
        if (amountForm) {
            amountForm.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    this.saveReimbursementAmount();
                }
            });
        }

        // 지급 완료 폼 엔터키 처리
        const paymentForm = document.getElementById('paymentCompleteModal');
        if (paymentForm) {
            paymentForm.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.completePayment();
                }
            });
        }

        // 숫자 입력 필드 검증
        const numberInputs = document.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            input.addEventListener('input', this.validateNumberInput);
            input.addEventListener('blur', this.formatNumberInput);
        });
    };

    /**
     * 숫자 입력 검증
     */
    system.validateNumberInput = function(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        if (value < 0) {
            input.value = 0;
        }
        
        // 최대값 제한 (1억원)
        if (value > 100000000) {
            input.value = 100000000;
        }
    };

    /**
     * 숫자 입력 포맷팅
     */
    system.formatNumberInput = function(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        if (!isNaN(value) && value > 0) {
            // 천단위 구분 표시를 위한 플레이스홀더 업데이트
            input.setAttribute('title', `${value.toLocaleString()}원`);
        }
    };

    /**
     * 모달 열기 (공통)
     */
    system.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            // 애니메이션을 위한 짧은 지연
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);

            // 첫 번째 입력 필드에 포커스
            const firstInput = modal.querySelector('input:not([disabled]), textarea:not([disabled])');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                }, 300);
            }
        }
    };

    /**
     * 모달 닫기 (공통)
     */
    system.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                
                // 특별한 정리 작업
                if (modalId === 'amountSettingModal' || modalId === 'paymentCompleteModal') {
                    this.currentUser = null;
                }
            }, 300);
        }
    };

    /**
     * 영수증 상세보기 모달 컨텐츠 업데이트
     */
    system.updateReceiptsDetailModal = async function(userId, userName) {
        try {
            // 로딩 상태 표시
            const grid = document.getElementById('receiptsGrid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            영수증 정보를 불러오는 중...
                        </div>
                    </div>
                `;
            }

            // 데이터 로드
            const items = await this.loadUserReimbursementItems(userId);
            
            // 그리드 업데이트
            this.renderReceiptsGrid(items);

            console.log(`🔄 영수증 모달 업데이트 완료: ${userName} (${items.length}개)`);

        } catch (error) {
            console.error('❌ 영수증 모달 업데이트 오류:', error);
            
            const grid = document.getElementById('receiptsGrid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #dc3545;">
                        <i data-lucide="alert-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>영수증 정보를 불러오는데 실패했습니다.</p>
                        <button onclick="window.reimbursementManagementSystem.updateReceiptsDetailModal('${userId}', '${userName}')" 
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
     * 금액설정 모달에서 pending 상태 항목들 렌더링 (체크박스 포함)
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
                    // 체크박스 항목들 렌더링
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
                                            onclick="event.stopPropagation(); window.reimbursementManagementSystem.openReceiptViewer('${item.receipt_file_url}', '${item.item_title}')">
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
     * 자료 보완 요청 모달 열기
     */
    system.openSupplementRequestModal = async function(userId, userName) {
        try {
            this.currentUser = { id: userId, name: userName };

            const titleElement = document.getElementById('supplementStudentName');
            if (titleElement) {
                titleElement.textContent = `${userName}님`;
            }

            // 자료 보완 요청 조회 (payment_round=0 먼저, 없으면 최신 실비 차수)
            let supplementData = null;

            // 1순위: payment_round=0 (자료 보완 전용) 확인
            const { data: supplementOnlyData, error: supplementError } = await this.supabaseClient
                .from('user_reimbursements')
                .select('admin_supplement_request, payment_round')
                .eq('user_id', userId)
                .eq('payment_round', 0)
                .maybeSingle();

            if (supplementError && supplementError.code !== 'PGRST116') {
                throw supplementError;
            }

            if (supplementOnlyData) {
                supplementData = supplementOnlyData;
                console.log('📋 자료 보완 전용 레코드 발견: payment_round=0');
            } else {
                // 2순위: 최신 실비 차수에서 자료 보완 요청 확인
                const { data: latestReimbursementData, error: reimbursementError } = await this.supabaseClient
                    .from('user_reimbursements')
                    .select('admin_supplement_request, payment_round, scheduled_amount')
                    .eq('user_id', userId)
                    .gte('payment_round', 1)
                    .order('payment_round', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (reimbursementError && reimbursementError.code !== 'PGRST116') {
                    throw reimbursementError;
                }

                if (latestReimbursementData) {
                    supplementData = latestReimbursementData;
                    console.log(`💰 실비 차수에서 보완 요청 확인: payment_round=${latestReimbursementData.payment_round}`);
                }
            }

            // UI 업데이트
            const textarea = document.getElementById('supplementText');
            const deleteBtn = document.getElementById('deleteSupplementBtn');

            if (supplementData && supplementData.admin_supplement_request) {
                textarea.value = supplementData.admin_supplement_request;
                deleteBtn.style.display = 'block';
                this.currentSupplementRequest = supplementData.admin_supplement_request;
                this.currentPaymentRound = supplementData.payment_round;
            } else {
                textarea.value = '';
                deleteBtn.style.display = 'none';
                this.currentSupplementRequest = null;
                this.currentPaymentRound = supplementData ? supplementData.payment_round : null;
            }

            this.openModal('supplementRequestModal');

        } catch (error) {
            console.error('❌ 자료 보완 요청 모달 오류:', error);
            this.showToast('보완 요청 정보를 불러오는데 실패했습니다.', 'error');
        }
    };

    /**
     * 자료 보완 요청 저장 (수정된 버전)
     */
    system.saveSupplementRequest = async function() {
        if (!this.currentUser) return;

        const textarea = document.getElementById('supplementText');
        const requestText = textarea.value.trim();

        if (!requestText) {
            this.showToast('보완 요청 내용을 입력해주세요.', 'error');
            return;
        }

        try {
            const now = new Date().toISOString();

            // 1단계: 실비 정보가 있는지 확인 (payment_round ≥ 1)
            const { data: reimbursementRecords, error: fetchError } = await this.supabaseClient
                .from('user_reimbursements')
                .select('payment_round, scheduled_amount')
                .eq('user_id', this.currentUser.id)
                .gte('payment_round', 1)  // 실제 실비 차수만
                .order('payment_round', { ascending: false });

            if (fetchError) throw fetchError;

            let targetPaymentRound;
            let isSupplementOnly = false;

            if (reimbursementRecords && reimbursementRecords.length > 0) {
                // 실비 정보가 있으면 최신 차수에 저장
                targetPaymentRound = reimbursementRecords[0].payment_round;
                console.log(`💰 기존 실비 정보 발견: payment_round=${targetPaymentRound}에 보완 요청 저장`);
            } else {
                // 실비 정보가 없으면 payment_round=0 (자료 보완 전용)
                targetPaymentRound = 0;
                isSupplementOnly = true;
                console.log(`📋 실비 정보 없음 → payment_round=0 (자료 보완 전용) 생성`);
            }

            // 2단계: UPSERT 데이터 구성
            const upsertData = {
                user_id: this.currentUser.id,
                payment_round: targetPaymentRound,
                admin_supplement_request: requestText,
                admin_supplement_requested_at: now,
                admin_supplement_updated_at: now
            };

            // payment_round=0 (자료 보완 전용)인 경우에만 기본 상태 설정
            if (isSupplementOnly) {
                upsertData.payment_status = 'supplement_only'; // 특별 상태값
            }

            // 3단계: UPSERT 실행
            const { error } = await this.supabaseClient
                .from('user_reimbursements')
                .upsert(upsertData, {
                    onConflict: 'user_id,payment_round',
                    ignoreDuplicates: false
                });

            if (error) throw error;

            // 성공 메시지
            const message = isSupplementOnly ? 
                '자료 보완 요청이 저장되었습니다. (보완 전용)' : 
                `자료 보완 요청이 저장되었습니다. (${targetPaymentRound}차)`;

            console.log(`✅ 자료 보완 요청 저장: payment_round=${targetPaymentRound} ${isSupplementOnly ? '(전용)' : ''}`);
            this.showToast(message);
            this.closeModal('supplementRequestModal');
            await this.refreshData();

        } catch (error) {
            console.error('❌ 보완 요청 저장 실패:', error);
            this.showToast('보완 요청 저장에 실패했습니다.', 'error');
        }
    };
    /**
     * 자료 보완 요청 삭제 (수정된 버전)
     */
    system.deleteSupplementRequest = async function() {
        if (!this.currentUser || this.currentPaymentRound === null) return;

        if (!confirm('자료 보완 요청을 삭제하시겠습니까?')) return;

        try {
            if (this.currentPaymentRound === 0) {
                // payment_round=0 (자료 보완 전용) 레코드는 완전 삭제
                const { error } = await this.supabaseClient
                    .from('user_reimbursements')
                    .delete()
                    .eq('user_id', this.currentUser.id)
                    .eq('payment_round', 0);

                if (error) throw error;
                console.log('🗑️ 자료 보완 전용 레코드 완전 삭제');

            } else {
                // 실비 차수 레코드는 보완 요청 필드만 NULL로
                const { error } = await this.supabaseClient
                    .from('user_reimbursements')
                    .update({
                        admin_supplement_request: null,
                        admin_supplement_requested_at: null,
                        admin_supplement_updated_at: null
                    })
                    .eq('user_id', this.currentUser.id)
                    .eq('payment_round', this.currentPaymentRound);

                if (error) throw error;
                console.log(`🧹 실비 차수 ${this.currentPaymentRound}에서 보완 요청만 삭제`);
            }

            this.showToast('자료 보완 요청이 삭제되었습니다.');
            this.closeModal('supplementRequestModal');
            await this.refreshData();

        } catch (error) {
            console.error('❌ 보완 요청 삭제 실패:', error);
            this.showToast('보완 요청 삭제에 실패했습니다.', 'error');
        }
    };
    

    /**
     * 전체 선택
     */
    system.selectAllPendingItems = function() {
        const checkboxes = document.querySelectorAll('#pendingItemsList input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.closest('.review-item').classList.add('selected');
        });
        this.updateSelectedCount();
        console.log('✅ 전체 항목 선택');
    };

    /**
     * 전체 선택 해제
     */
    system.clearAllSelections = function() {
        const checkboxes = document.querySelectorAll('#pendingItemsList input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.review-item').classList.remove('selected');
        });
        this.updateSelectedCount();
        console.log('✅ 전체 선택 해제');
    };

    /**
     * 선택된 항목 개수 업데이트
     */
    system.updateSelectedCount = function() {
        const selectedCheckboxes = document.querySelectorAll('#pendingItemsList input[type="checkbox"]:checked');
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = selectedCheckboxes.length;
        }
    };
    
    
    /**
     * 금액 설정 모달 검증
     */
    system.validateAmountSettingForm = function() {
        const errors = [];
        
        const scheduledAmount = parseFloat(document.getElementById('scheduledAmount')?.value);
        const scheduledDate = document.getElementById('scheduledDate')?.value;
        const paymentRound = parseInt(document.getElementById('paymentRound')?.value);

        if (!scheduledAmount || scheduledAmount < 0) {
            errors.push('유효한 실비 금액을 입력해주세요.');
        }

        if (scheduledAmount > 10000000) { // 1천만원 초과시 경고
            if (!confirm('입력한 금액이 1천만원을 초과합니다. 계속하시겠습니까?')) {
                errors.push('금액 확인이 취소되었습니다.');
            }
        }

        if (!scheduledDate) {
            errors.push('입금 예정일을 선택해주세요.');
        } else {
            const selectedDate = new Date(scheduledDate);
            const today = new Date();
            const maxDate = new Date();
            maxDate.setFullYear(today.getFullYear() + 1); // 1년 후까지

            if (selectedDate < today.setHours(0, 0, 0, 0)) {
                errors.push('입금 예정일은 오늘 이후여야 합니다.');
            }

            if (selectedDate > maxDate) {
                errors.push('입금 예정일은 1년 이내여야 합니다.');
            }
        }

        if (!paymentRound || paymentRound < 1 || paymentRound > 10) {
            errors.push('유효한 지원 차수를 선택해주세요. (1-10차)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    /**
     * 지급 완료 모달 검증
     */
    system.validatePaymentCompleteForm = function() {
        const errors = [];
        
        const actualAmount = parseFloat(document.getElementById('actualAmount')?.value);
        const actualDate = document.getElementById('actualDate')?.value;

        if (!actualAmount || actualAmount <= 0) {
            errors.push('유효한 실제 입금 금액을 입력해주세요.');
        }

        if (!actualDate) {
            errors.push('실제 입금일을 선택해주세요.');
        } else {
            const selectedDate = new Date(actualDate);
            const today = new Date();
            const minDate = new Date();
            minDate.setFullYear(today.getFullYear() - 1); // 1년 전까지

            if (selectedDate > today) {
                errors.push('실제 입금일은 오늘 이전이어야 합니다.');
            }

            if (selectedDate < minDate) {
                errors.push('실제 입금일은 1년 이내여야 합니다.');
            }
        }

        // 예정 금액과의 차이 확인
        const reimbursement = this.reimbursementData.get(this.currentUser?.id);
        if (reimbursement && reimbursement.scheduled_amount) {
            const difference = Math.abs(actualAmount - reimbursement.scheduled_amount);
            const percentDiff = (difference / reimbursement.scheduled_amount) * 100;

            if (percentDiff > 10) { // 10% 이상 차이시 확인
                const message = `예정 금액(${reimbursement.scheduled_amount.toLocaleString()}원)과 ${percentDiff.toFixed(1)}% 차이가 있습니다. 계속하시겠습니까?`;
                if (!confirm(message)) {
                    errors.push('금액 차이 확인이 취소되었습니다.');
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    /**
     * 폼 검증 결과 표시
     */
    system.displayValidationErrors = function(errors, modalId) {
        // 기존 오류 메시지 제거
        const existingErrors = document.querySelectorAll(`#${modalId} .validation-error`);
        existingErrors.forEach(error => error.remove());

        if (errors.length === 0) return;

        // 새 오류 메시지 추가
        const modal = document.getElementById(modalId);
        const modalBody = modal?.querySelector('.modal-body');
        
        if (modalBody) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.style.cssText = `
                background: #f8d7da;
                color: #721c24;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 15px;
                border: 1px solid #f5c6cb;
            `;
            
            const errorList = errors.map(error => `<li>${error}</li>`).join('');
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <i data-lucide="alert-circle" style="width: 16px; height: 16px;"></i>
                    <strong>입력 오류가 있습니다:</strong>
                </div>
                <ul style="margin: 0; padding-left: 20px;">${errorList}</ul>
            `;

            modalBody.insertBefore(errorDiv, modalBody.firstChild);

            // 아이콘 초기화
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // 첫 번째 오류 필드에 포커스
            this.focusFirstErrorField(modalId);
        }
    };

    /**
     * 첫 번째 오류 필드에 포커스
     */
    system.focusFirstErrorField = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // 빈 필수 입력 필드 찾기
        const requiredFields = modal.querySelectorAll('input[required], input[type="number"], input[type="date"]');
        
        for (const field of requiredFields) {
            if (!field.value || (field.type === 'number' && parseFloat(field.value) <= 0)) {
                field.focus();
                field.select();
                break;
            }
        }
    };

    /**
     * 영수증 새창에서 열기 (기존 전체화면 뷰어 대신)
     */
    system.openReceiptViewer = function(receiptUrl, title) {
        if (receiptUrl) {
            // 새창에서 영수증 열기
            window.open(receiptUrl, '_blank', 'noopener,noreferrer');
            console.log('✅ 새창에서 영수증 열기:', title);
        } else {
            console.warn('⚠️ 영수증 URL이 없습니다:', title);

            // 토스트 메시지 표시 (옵션)
            if (window.reimbursementManagementSystem && window.reimbursementManagementSystem.showToast) {
                window.reimbursementManagementSystem.showToast('영수증 URL이 없습니다.', 'warning');
            }
        }
    };

    /**
     * 모달 상태 저장 (브라우저 새로고침 대응)
     */
    system.saveModalState = function(modalId, state) {
        try {
            const modalStates = JSON.parse(sessionStorage.getItem('reimbursementModalStates') || '{}');
            modalStates[modalId] = {
                ...state,
                timestamp: Date.now()
            };
            sessionStorage.setItem('reimbursementModalStates', JSON.stringify(modalStates));
        } catch (error) {
            console.warn('⚠️ 모달 상태 저장 실패:', error);
        }
    };

    /**
     * 모달 상태 복원
     */
    system.restoreModalState = function(modalId) {
        try {
            const modalStates = JSON.parse(sessionStorage.getItem('reimbursementModalStates') || '{}');
            const state = modalStates[modalId];
            
            if (state && Date.now() - state.timestamp < 600000) { // 10분 이내
                return state;
            }
            
            // 만료된 상태 제거
            delete modalStates[modalId];
            sessionStorage.setItem('reimbursementModalStates', JSON.stringify(modalStates));
            
        } catch (error) {
            console.warn('⚠️ 모달 상태 복원 실패:', error);
        }
        
        return null;
    };

    /**
     * 모든 모달 상태 정리
     */
    system.clearModalStates = function() {
        try {
            sessionStorage.removeItem('reimbursementModalStates');
        } catch (error) {
            console.warn('⚠️ 모달 상태 정리 실패:', error);
        }
    };

    // 페이지 로드시 모달 초기화
    document.addEventListener('DOMContentLoaded', () => {
        if (window.reimbursementManagementSystem) {
            window.reimbursementManagementSystem.initializeModals();
        }
    });

    // 페이지 언로드시 상태 정리
    window.addEventListener('beforeunload', () => {
        if (window.reimbursementManagementSystem) {
            window.reimbursementManagementSystem.clearModalStates();
        }
    });

    console.log('🎭 실비 관리 시스템 모달 모듈 로드 완료 (v1.0.0)');
}

// 전역 함수들 (HTML에서 직접 호출)
window.openFullReceiptView = function(receiptUrl, title) {
    if (window.reimbursementManagementSystem) {
        window.reimbursementManagementSystem.openReceiptViewer(receiptUrl, title);
    }
};


window.downloadReceipt = function(receiptUrl, title) {
    if (window.reimbursementManagementSystem) {
        const fileName = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_영수증`;
        window.reimbursementManagementSystem.downloadReceiptFile(receiptUrl, fileName);
    }
};

window.closeModal = function(modalId) {
    if (window.reimbursementManagementSystem) {
        window.reimbursementManagementSystem.closeModal(modalId);
    }
};

// 전역 함수들 (HTML에서 직접 호출)
window.toggleItemSelection = function(itemId, sourceTable, itemType) {
    const checkbox = document.getElementById(`item_${itemId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        const reviewItem = checkbox.closest('.review-item');
        if (checkbox.checked) {
            reviewItem.classList.add('selected');
        } else {
            reviewItem.classList.remove('selected');
        }
        
        if (window.reimbursementManagementSystem) {
            window.reimbursementManagementSystem.updateSelectedCount();
        }
    }
};
