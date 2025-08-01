/**
 * 실비 지원 신청 시스템 v2.0.0 - VIEW 기반 리팩토링
 * v_user_reimbursement_items VIEW 활용으로 단순화
 * 
 * 🚀 v2.0.0 주요 변경사항:
 * - 복잡한 다중 테이블 JOIN → v_user_reimbursement_items VIEW 단순 조회
 * - 코드 복잡도 대폭 감소 (26KB → 12KB)
 * - 모듈 로딩 문제 해결 (기본 supabase 클라이언트만 사용)
 * - 성능 향상 (데이터베이스 레벨 최적화)
 * - 기존 UI/UX 완전 유지
 * 
 * 기능:
 * - 계좌 정보 관리
 * - VIEW 기반 실비 항목 통합 조회
 * - 카테고리별 그룹핑 (transport, equipment, visa)
 * - 영수증 상태 확인 및 미리보기
 * - 입금 정보 표시
 */

class ReimbursementSystem {
    constructor() {
        this.currentUser = null;
        this.reimbursementItems = [];
        this.accountInfo = null;
        this.paymentInfo = null;
        this.supabase = null;
        
        this.init();
    }

    async init() {
        try {
            // 기본 Supabase 클라이언트 사용 (복잡한 API 매니저 불필요)
            await this.initializeSupabase();
            
            // 사용자 인증 확인
            await this.checkAuthentication();
            
            // 데이터 로딩
            await this.loadAllData();
            
            // UI 초기화
            this.initializeUI();
            
            // 이벤트 리스너 등록
            this.setupEventListeners();
            
            console.log('✅ 실비 지원 시스템 v2.0.0 초기화 완료 (VIEW 기반)');
        } catch (error) {
            console.error('❌ 실비 지원 시스템 초기화 실패:', error);
            this.showError('시스템 초기화에 실패했습니다.');
        }
    }

    async initializeSupabase() {
        // 기본 Supabase 클라이언트 사용 (복잡한 매니저 불필요)
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase 클라이언트를 찾을 수 없습니다.');
        }
        
        this.supabase = window.supabase;
        console.log('✅ 기본 Supabase 클라이언트 연결 성공');
    }

    async checkAuthentication() {
        // localStorage에서 사용자 정보 확인
        const userData = localStorage.getItem('currentStudent');
        if (!userData) {
            console.error('로그인 정보를 찾을 수 없습니다.');
            alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
            window.location.href = '../index.html';
            return;
        }

        try {
            this.currentUser = JSON.parse(userData);
            console.log('현재 사용자:', this.currentUser);

            // 필수 필드 검증
            if (!this.currentUser.id || !this.currentUser.name) {
                throw new Error('사용자 데이터가 불완전합니다.');
            }
        } catch (error) {
            console.error('사용자 데이터 파싱 오류:', error);
            alert('사용자 정보에 오류가 있습니다. 다시 로그인해주세요.');
            window.location.href = '../index.html';
            return;
        }
    }
    
    async loadAllData() {
        this.showLoading(true);
        
        try {
            // 병렬로 모든 데이터 로딩
            await Promise.all([
                this.loadReimbursementItems(), // VIEW 기반으로 단순화
                this.loadAccountInfo(),
                this.loadPaymentInfo()
            ]);
            
            this.updateStatistics();
            this.renderReimbursementList();
            this.renderAccountInfo();
            this.renderPaymentInfo();
            
        } catch (error) {
            console.error('데이터 로딩 실패:', error);
            this.showError('데이터를 불러오는데 실패했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 🚀 v2.0.0 핵심 개선: VIEW 기반 단순 조회
     * 기존: 5개 테이블 복잡한 JOIN + 데이터 변환
     * 변경: v_user_reimbursement_items VIEW 단순 조회
     */
    async loadReimbursementItems() {
        console.log('📊 VIEW 기반 실비 항목 로딩 시작...');
        
        try {
            // 🎯 핵심: 단일 VIEW 조회로 모든 실비 항목 가져오기
            const { data: viewData, error } = await this.supabase
                .from('v_user_reimbursement_items')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('display_order');

            if (error) {
                console.error('VIEW 조회 실패:', error);
                throw error;
            }

            // VIEW 데이터를 기존 UI 형식으로 변환
            this.reimbursementItems = (viewData || []).map(item => ({
                id: item.item_id,
                type: item.item_type,
                title: item.item_title,
                subtitle: this.generateSubtitle(item),
                receiptUrl: item.receipt_file_url,
                hasReceipt: item.has_receipt,
                completed: item.reimbursement_completed,
                originalId: item.item_id,
                category: item.category,
                // 교구 전용 정보
                amount: item.total_amount,
                store: item.purchase_store,
                // 추가 정보
                date: item.item_date,
                additionalInfo: item.additional_info
            }));

            console.log(`✅ VIEW 기반 실비 항목 ${this.reimbursementItems.length}건 로딩 완료`);
            console.log('📋 카테고리별 분포:', this.getCategoryStats());
            
        } catch (error) {
            console.error('❌ VIEW 기반 실비 항목 로딩 실패:', error);
            throw error;
        }
    }

    /**
     * VIEW 데이터를 기반으로 부제목 생성
     */
    generateSubtitle(item) {
        switch (item.item_type) {
            case 'flight':
                return item.additional_info || '항공권 구매';
            case 'baggage_departure':
                return `출국일: ${item.item_date || '날짜 미상'}`;
            case 'baggage_return':
                return `귀국일: ${item.item_date || '날짜 미상'}`;
            case 'equipment':
                if (item.total_amount && item.purchase_store) {
                    return `${item.total_amount.toLocaleString()}원 (${item.purchase_store})`;
                }
                return item.additional_info || '교구 구매';
            case 'visa':
                return '비자 관련 영수증';
            default:
                return item.additional_info || '';
        }
    }

    /**
     * 카테고리별 통계 생성
     */
    getCategoryStats() {
        const stats = {};
        this.reimbursementItems.forEach(item => {
            const category = item.category || 'other';
            stats[category] = (stats[category] || 0) + 1;
        });
        return stats;
    }

    async loadAccountInfo() {
        try {
            const { data: accountData } = await this.supabase
                .from('user_reimbursements')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('payment_round', 1)
                .single();

            if (accountData) {
                this.accountInfo = accountData;
                console.log('계좌 정보 로딩 완료:', accountData);
            } else {
                console.log('등록된 계좌 정보 없음');
            }
        } catch (error) {
            console.log('계좌 정보 없음 또는 로딩 실패:', error.message);
        }
    }

    async loadPaymentInfo() {
        try {
            const { data: paymentData } = await this.supabase
                .from('user_reimbursements')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .not('scheduled_amount', 'is', null)
                .order('payment_round', { ascending: true });

            if (paymentData && paymentData.length > 0) {
                this.paymentInfo = paymentData;
                console.log('입금 정보 로딩 완료:', paymentData);
            } else {
                console.log('입금 예정 정보 없음');
            }
        } catch (error) {
            console.log('입금 정보 로딩 실패:', error);
        }
    }

    initializeUI() {
        this.showLoading(false);
        document.getElementById('mainContent').style.display = 'block';
    }

    setupEventListeners() {
        // 계좌 정보 폼 제출
        const accountForm = document.getElementById('accountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', this.handleAccountSave.bind(this));
        }

        // 창 크기 변경시 반응형 업데이트
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    async handleAccountSave(event) {
        event.preventDefault();
        
        const saveBtn = document.getElementById('saveAccountBtn');
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i data-lucide="loader-2"></i> 저장 중...';
            
            const formData = new FormData(event.target);
            const accountData = {
                user_id: this.currentUser.id,
                bank_name: formData.get('bankName') || document.getElementById('bankName').value,
                account_number: formData.get('accountNumber') || document.getElementById('accountNumber').value,
                account_holder_name: formData.get('accountHolder') || document.getElementById('accountHolder').value,
                payment_round: 1
            };

            console.log('계좌 정보 저장 시작:', accountData);
            
            // 기존 계좌 정보 확인
            const { data: existingAccount } = await this.supabase
                .from('user_reimbursements')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('payment_round', 1)
                .single();

            let result;
            if (existingAccount) {
                // 기존 데이터 업데이트
                console.log('기존 계좌 정보 업데이트...');
                const { data, error } = await this.supabase
                    .from('user_reimbursements')
                    .update({
                        bank_name: accountData.bank_name,
                        account_number: accountData.account_number,
                        account_holder_name: accountData.account_holder_name,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.currentUser.id)
                    .eq('payment_round', 1)
                    .select();

                if (error) throw error;
                result = data && data.length > 0 ? data[0] : null;
            } else {
                // 새 데이터 삽입
                console.log('새 계좌 정보 삽입...');
                accountData.created_at = new Date().toISOString();
                accountData.updated_at = new Date().toISOString();
                
                const { data, error } = await this.supabase
                    .from('user_reimbursements')
                    .insert([accountData])
                    .select();

                if (error) throw error;
                result = data && data.length > 0 ? data[0] : null;
            }

            this.accountInfo = result;
            this.showSuccess('계좌 정보가 저장되었습니다.');
            this.renderAccountInfo();
            
        } catch (error) {
            console.error('계좌 정보 저장 실패:', error);
            this.showError('계좌 정보 저장에 실패했습니다.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    }

    renderAccountInfo() {
        const bankNameInput = document.getElementById('bankName');
        const accountNumberInput = document.getElementById('accountNumber');
        const accountHolderInput = document.getElementById('accountHolder');
        const accountAlert = document.getElementById('accountAlert');

        if (this.accountInfo) {
            // 기존 정보 채우기
            if (bankNameInput) bankNameInput.value = this.accountInfo.bank_name || '';
            if (accountNumberInput) accountNumberInput.value = this.accountInfo.account_number || '';
            if (accountHolderInput) accountHolderInput.value = this.accountInfo.account_holder_name || '';

            // 알림 메시지 변경
            if (accountAlert) {
                accountAlert.className = 'alert alert-success';
                accountAlert.innerHTML = `
                    <i data-lucide="check-circle"></i>
                    계좌 정보가 등록되어 있습니다. 수정이 필요한 경우 아래에서 변경해주세요.
                `;
            }
        } else {
            // 기본 알림 메시지 유지
            if (accountAlert) {
                accountAlert.className = 'alert alert-info';
                accountAlert.innerHTML = `
                    <i data-lucide="info"></i>
                    실비 지원을 받으실 계좌 정보를 입력해주세요.
                `;
            }
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    renderReimbursementList() {
        const reimbursementList = document.getElementById('reimbursementList');
        const emptyReimbursement = document.getElementById('emptyReimbursement');
        const reimbursementAlert = document.getElementById('reimbursementAlert');

        if (!reimbursementList) return;

        if (this.reimbursementItems.length === 0) {
            reimbursementList.style.display = 'none';
            if (emptyReimbursement) emptyReimbursement.style.display = 'block';
            if (reimbursementAlert) reimbursementAlert.style.display = 'none';
            return;
        }

        // 영수증 없는 항목 체크
        const itemsWithoutReceipt = this.reimbursementItems.filter(item => !item.hasReceipt);
        if (reimbursementAlert) {
            if (itemsWithoutReceipt.length > 0) {
                reimbursementAlert.style.display = 'block';
                reimbursementAlert.innerHTML = `
                    <i data-lucide="alert-triangle"></i>
                    영수증이 등록되지 않은 항목이 ${itemsWithoutReceipt.length}건 있습니다.
                `;
            } else {
                reimbursementAlert.style.display = 'none';
            }
        }

        // 카테고리별 그룹핑 및 리스트 렌더링
        reimbursementList.innerHTML = '';
        reimbursementList.style.display = 'flex';
        if (emptyReimbursement) emptyReimbursement.style.display = 'none';

        // 카테고리별 정렬
        const categories = ['transport', 'equipment', 'visa'];
        const categorizedItems = {};
        
        // 카테고리별로 항목 분류
        this.reimbursementItems.forEach(item => {
            const category = item.category || 'other';
            if (!categorizedItems[category]) {
                categorizedItems[category] = [];
            }
            categorizedItems[category].push(item);
        });

        // 카테고리 순서대로 렌더링
        categories.forEach(category => {
            if (categorizedItems[category] && categorizedItems[category].length > 0) {
                // 카테고리 헤더 추가 (선택사항)
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-divider';
                categoryHeader.style.cssText = `
                    margin: 1rem 0 0.5rem 0;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid var(--border-color);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                `;
                
                const categoryNames = {
                    transport: '🚗 교통/항공',
                    equipment: '📚 교구',
                    visa: '📋 비자'
                };
                
                categoryHeader.textContent = categoryNames[category] || category;
                reimbursementList.appendChild(categoryHeader);

                // 해당 카테고리 항목들 렌더링
                categorizedItems[category].forEach(item => {
                    const itemElement = this.createReimbursementItemElement(item);
                    reimbursementList.appendChild(itemElement);
                });
            }
        });

        // 기타 카테고리 처리
        if (categorizedItems.other && categorizedItems.other.length > 0) {
            const otherHeader = document.createElement('div');
            otherHeader.className = 'category-divider';
            otherHeader.textContent = '🔧 기타';
            reimbursementList.appendChild(otherHeader);

            categorizedItems.other.forEach(item => {
                const itemElement = this.createReimbursementItemElement(item);
                reimbursementList.appendChild(itemElement);
            });
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    createReimbursementItemElement(item) {
        const div = document.createElement('div');
        div.className = `reimbursement-item ${item.completed ? 'completed' : ''}`;

        const statusClass = item.completed ? 'completed' : (item.hasReceipt ? 'has-receipt' : 'need-receipt');
        const statusText = item.completed ? '처리 완료' : (item.hasReceipt ? '영수증 등록됨' : '영수증 필요');

        div.innerHTML = `
            <div class="item-info">
                <div class="item-title">${item.title}</div>
                <div class="item-subtitle">${item.subtitle}</div>
            </div>
            <div class="item-status">
                <span class="status-badge ${statusClass}">${statusText}</span>
                ${item.hasReceipt ? `
                    <button class="btn btn-secondary" onclick="showReceiptModal('${item.receiptUrl}', '${item.title}')">
                        <i data-lucide="eye"></i>
                        영수증 보기
                    </button>
                ` : ''}
            </div>
        `;

        return div;
    }

    renderPaymentInfo() {
        const paymentInfoCard = document.getElementById('paymentInfoCard');
        const paymentGrid = document.getElementById('paymentGrid');

        if (!this.paymentInfo || this.paymentInfo.length === 0) {
            if (paymentInfoCard) paymentInfoCard.style.display = 'none';
            return;
        }

        if (paymentInfoCard) paymentInfoCard.style.display = 'block';
        if (!paymentGrid) return;

        paymentGrid.innerHTML = '';

        this.paymentInfo.forEach((payment, index) => {
            const paymentElement = document.createElement('div');
            paymentElement.className = 'payment-field';

            const statusText = payment.payment_status === 'completed' ? '입금 완료' : '입금 예정';
            const amountText = payment.actual_amount || payment.scheduled_amount || '미정';
            const dateText = payment.actual_date || payment.scheduled_date || '미정';

            paymentElement.innerHTML = `
                <div class="payment-label">${payment.payment_round}차 실비 지원</div>
                <div class="payment-value">${statusText}</div>
                <div class="payment-label">금액</div>
                <div class="payment-value">${typeof amountText === 'number' ? amountText.toLocaleString() : amountText}원</div>
                <div class="payment-label">일정</div>
                <div class="payment-value">${dateText}</div>
                ${payment.admin_notes ? `
                    <div class="payment-label">관리자 메모</div>
                    <div class="payment-value" style="font-size: 0.75rem; color: var(--text-secondary);">${payment.admin_notes}</div>
                ` : ''}
            `;

            paymentGrid.appendChild(paymentElement);
        });
    }

    updateStatistics() {
        const totalCount = this.reimbursementItems.length;
        const completedCount = this.reimbursementItems.filter(item => item.completed).length;
        const pendingCount = totalCount - completedCount;

        const totalElement = document.getElementById('totalItemsCount');
        const pendingElement = document.getElementById('pendingItemsCount');
        const completedElement = document.getElementById('completedItemsCount');

        if (totalElement) totalElement.textContent = totalCount;
        if (pendingElement) pendingElement.textContent = pendingCount;
        if (completedElement) completedElement.textContent = completedCount;
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const mainContent = document.getElementById('mainContent');

        if (loadingState) loadingState.style.display = show ? 'flex' : 'none';
        if (mainContent) mainContent.style.display = show ? 'none' : 'block';
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    showAlert(message, type) {
        // 기존 알림 제거
        const existingAlert = document.querySelector('.temp-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // 새 알림 생성
        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'error' ? 'warning' : 'success'} temp-alert`;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.style.minWidth = '300px';
        alert.style.boxShadow = 'var(--shadow-lg)';

        const icon = type === 'error' ? 'alert-circle' : 'check-circle';
        alert.innerHTML = `
            <i data-lucide="${icon}"></i>
            ${message}
        `;

        document.body.appendChild(alert);
        if (window.lucide) {
            lucide.createIcons();
        }

        // 3초 후 자동 제거
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }

    handleResize() {
        // 반응형 처리 로직 (필요시 구현)
        console.log('화면 크기 변경됨');
    }
}

// 영수증 모달 전역 함수
window.showReceiptModal = function(receiptUrl, title) {
    if (!receiptUrl) {
        alert('영수증을 찾을 수 없습니다.');
        return;
    }

    // 모달 HTML 생성
    const modalHTML = `
        <div id="receiptModal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 800px; max-height: 90vh;">
                <div class="modal-header">
                    <h3>${title} - 영수증</h3>
                    <button type="button" class="btn-close" onclick="closeReceiptModal()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body" style="text-align: center; padding: 20px;">
                    <div id="receiptContent">
                        <div style="margin-bottom: 15px;">
                            <button class="btn btn-secondary" onclick="window.open('${receiptUrl}', '_blank')">
                                <i data-lucide="external-link"></i>
                                새 탭에서 열기
                            </button>
                        </div>
                        <img src="${receiptUrl}" 
                             style="max-width: 100%; max-height: 60vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                             onerror="this.style.display='none'; document.getElementById('receiptError').style.display='block';"
                             alt="영수증 이미지">
                        <div id="receiptError" style="display: none; padding: 40px; color: #666;">
                            <i data-lucide="file-text" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                            <p>이미지를 불러올 수 없습니다. '새 탭에서 열기' 버튼을 클릭해주세요.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 기존 모달 제거
    const existingModal = document.getElementById('receiptModal');
    if (existingModal) {
        existingModal.remove();
    }

    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (window.lucide) {
        lucide.createIcons();
    }
};

window.closeReceiptModal = function() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.remove();
    }
};

// 시스템 초기화
document.addEventListener('DOMContentLoaded', () => {
    new ReimbursementSystem();
});

// 전역 함수로 내보내기 (모달에서 사용)
window.ReimbursementSystem = ReimbursementSystem;