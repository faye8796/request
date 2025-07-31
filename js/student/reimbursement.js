/**
 * 실비 지원 신청 시스템 v1.0.0
 * 항공권-교구-비자 영수증 통합 관리
 * 
 * 기능:
 * - 계좌 정보 관리
 * - 모든 실비 대상 항목 통합 조회
 * - 영수증 상태 확인
 * - 입금 정보 표시
 */

import { supabase } from '../supabase/supabase-client.js';

class ReimbursementSystem {
    constructor() {
        this.currentUser = null;
        this.reimbursementItems = [];
        this.accountInfo = null;
        this.paymentInfo = null;
        
        this.init();
    }

    async init() {
        try {
            // 사용자 인증 확인
            await this.checkAuthentication();
            
            // 데이터 로딩
            await this.loadAllData();
            
            // UI 초기화
            this.initializeUI();
            
            // 이벤트 리스너 등록
            this.setupEventListeners();
            
            console.log('실비 지원 시스템 초기화 완료');
        } catch (error) {
            console.error('실비 지원 시스템 초기화 실패:', error);
            this.showError('시스템 초기화에 실패했습니다.');
        }
    }

    async checkAuthentication() {
        // localStorage에서 사용자 정보 확인 (올바른 키 사용)
        const userData = localStorage.getItem('currentStudent'); // ✅ 올바른 키
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
                this.loadReimbursementItems(),
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

    async loadReimbursementItems() {
        console.log('실비 대상 항목 로딩 시작...');
        this.reimbursementItems = [];

        try {
            // 1. 항공권 (직접구매) - receipt_url
            const { data: flightRequests } = await supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('purchase_type', 'direct')
                .eq('flight_reimbursement_completed', false);

            if (flightRequests) {
                flightRequests.forEach(flight => {
                    if (flight.receipt_url) {
                        this.reimbursementItems.push({
                            id: `flight_${flight.id}`,
                            type: 'flight',
                            title: '[직접구매] 항공권',
                            subtitle: `${flight.departure_date} - ${flight.return_date}`,
                            receiptUrl: flight.receipt_url,
                            hasReceipt: true,
                            completed: false,
                            originalId: flight.id
                        });
                    }
                });
            }

            // 2. 출국 수하물 - user_baggage_departure_receipt_url
            const { data: departureBaggage } = await supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .not('user_baggage_departure_receipt_url', 'is', null)
                .eq('baggage_reimbursement_completed', false);

            if (departureBaggage) {
                departureBaggage.forEach(baggage => {
                    this.reimbursementItems.push({
                        id: `baggage_departure_${baggage.id}`,
                        type: 'baggage_departure',
                        title: '[직접구매] 출국 수하물',
                        subtitle: `출국일: ${baggage.departure_date}`,
                        receiptUrl: baggage.user_baggage_departure_receipt_url,
                        hasReceipt: !!baggage.user_baggage_departure_receipt_url,
                        completed: false,
                        originalId: baggage.id
                    });
                });
            }

            // 3. 귀국 수하물 - user_baggage_return_receipt_url
            const { data: returnBaggage } = await supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .not('user_baggage_return_receipt_url', 'is', null)
                .eq('baggage_reimbursement_completed', false);

            if (returnBaggage) {
                returnBaggage.forEach(baggage => {
                    this.reimbursementItems.push({
                        id: `baggage_return_${baggage.id}`,
                        type: 'baggage_return',
                        title: '[직접구매] 귀국 수하물',
                        subtitle: `귀국일: ${baggage.return_date}`,
                        receiptUrl: baggage.user_baggage_return_receipt_url,
                        hasReceipt: !!baggage.user_baggage_return_receipt_url,
                        completed: false,
                        originalId: baggage.id
                    });
                });
            }

            // 4. 교구 (직접구매) - admin_receipt_url을 통해 확인
            const { data: equipmentRequests } = await supabase
                .from('requests')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('purchase_type', 'offline')
                .eq('reimbursement_completed', false);

            if (equipmentRequests) {
                for (const request of equipmentRequests) {
                    // 해당 request의 영수증 확인
                    const { data: receipts } = await supabase
                        .from('receipts')
                        .select('*')
                        .eq('request_id', request.id)
                        .eq('user_id', this.currentUser.id)
                        .eq('reimbursement_completed', false);

                    if (receipts && receipts.length > 0) {
                        receipts.forEach(receipt => {
                            this.reimbursementItems.push({
                                id: `equipment_${receipt.id}`,
                                type: 'equipment',
                                title: '[직접구매] 교구',
                                subtitle: `${request.item_name} (${receipt.purchase_store || '구매처 미등록'})`,
                                receiptUrl: receipt.file_url,
                                hasReceipt: !!receipt.file_url,
                                completed: false,
                                originalId: receipt.id
                            });
                        });
                    }
                }
            }

            // 5. 비자 영수증들 - receipt_url
            const { data: visaReceipts } = await supabase
                .from('visa_receipts')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('reimbursement_completed', false);

            if (visaReceipts) {
                visaReceipts.forEach(receipt => {
                    if (receipt.receipt_url) {
                        this.reimbursementItems.push({
                            id: `visa_${receipt.id}`,
                            type: 'visa',
                            title: `[비자] ${receipt.receipt_title}`,
                            subtitle: '비자 관련 영수증',
                            receiptUrl: receipt.receipt_url,
                            hasReceipt: true,
                            completed: false,
                            originalId: receipt.id
                        });
                    }
                });
            }

            console.log(`실비 대상 항목 ${this.reimbursementItems.length}건 로딩 완료`);
            
        } catch (error) {
            console.error('실비 항목 로딩 실패:', error);
            throw error;
        }
    }

    async loadAccountInfo() {
        try {
            const { data: accountData } = await supabase
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
            const { data: paymentData } = await supabase
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

            // 계좌 정보 저장/업데이트
            const { data, error } = await supabase
                .from('user_reimbursements')
                .upsert(accountData, { 
                    onConflict: 'user_id,payment_round',
                    ignoreDuplicates: false 
                })
                .select()
                .single();

            if (error) throw error;

            this.accountInfo = data;
            this.showSuccess('계좌 정보가 저장되었습니다.');
            this.renderAccountInfo();
            
        } catch (error) {
            console.error('계좌 정보 저장 실패:', error);
            this.showError('계좌 정보 저장에 실패했습니다.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            lucide.createIcons();
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

        lucide.createIcons();
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

        // 리스트 렌더링
        reimbursementList.innerHTML = '';
        reimbursementList.style.display = 'flex';
        if (emptyReimbursement) emptyReimbursement.style.display = 'none';

        this.reimbursementItems.forEach(item => {
            const itemElement = this.createReimbursementItemElement(item);
            reimbursementList.appendChild(itemElement);
        });

        lucide.createIcons();
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
        lucide.createIcons();

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

// 시스템 초기화
document.addEventListener('DOMContentLoaded', () => {
    new ReimbursementSystem();
});

// 전역 함수로 내보내기 (모달에서 사용)
window.ReimbursementSystem = ReimbursementSystem;