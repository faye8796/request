/**
 * 🎯 특별 예산 지원 신청 관리 모듈
 * Phase 2: JavaScript 모듈 개발 완료
 * 
 * @description 학생용 특별 예산 지원 신청 기능 전담 관리
 * @version 1.0.0
 * @created 2025-07-24
 * @author AI Assistant
 * 
 * 📋 주요 기능
 * - 특별 예산 신청 생성/조회/삭제
 * - 상태별 모달 UI 렌더링 (pending/approved/rejected)
 * - 폼 검증 및 제출 처리
 * - 실시간 상태 업데이트
 * 
 * 🗄️ 연동 테이블: student_budgets
 * - special_request_amount: 신청 금액
 * - special_request_reason: 신청 사유
 * - special_request_status: 상태 (pending/approved/rejected)
 * - special_admin_rejection_reason: 관리자 반려 사유
 */

class EquipmentBudgetManager {
    constructor() {
        this.currentUserId = null;
        this.budgetData = null;
        this.supabaseClient = null;
        this.isInitialized = false;
        
        // 🎨 UI 상태 관리
        this.modalElement = null;
        this.isModalOpen = false;
        
        // 📊 상태별 설정
        this.statusConfig = {
            pending: { 
                text: '검토 중', 
                color: '#f59e0b', 
                icon: '⏳',
                bgColor: '#fef3c7',
                borderColor: '#f59e0b'
            },
            approved: { 
                text: '승인됨', 
                color: '#10b981', 
                icon: '✅',
                bgColor: '#d1fae5',
                borderColor: '#10b981'
            },
            rejected: { 
                text: '반려됨', 
                color: '#ef4444', 
                icon: '❌',
                bgColor: '#fee2e2',
                borderColor: '#ef4444'
            }
        };
        
        console.log('🎯 EquipmentBudgetManager v1.0.0 인스턴스 생성됨');
    }

    /**
     * 🚀 예산 매니저 초기화
     * @param {string} userId - 현재 사용자 ID
     * @param {Object} supabaseClient - Supabase 클라이언트 인스턴스
     */
    async initialize(userId, supabaseClient) {
        try {
            if (!userId || !supabaseClient) {
                throw new Error('❌ userId 또는 supabaseClient가 제공되지 않았습니다');
            }

            this.currentUserId = userId;
            this.supabaseClient = supabaseClient;
            
            // 🎨 모달 엘리먼트 확인
            this.modalElement = document.getElementById('budgetRequestModal');
            if (!this.modalElement) {
                console.warn('⚠️ budgetRequestModal 엘리먼트를 찾을 수 없습니다');
            }
            
            // 📊 초기 데이터 로드
            await this.loadBudgetData();
            
            // 🎯 이벤트 리스너 바인딩
            this.bindEvents();
            
            this.isInitialized = true;
            console.log('✅ EquipmentBudgetManager 초기화 완료', {
                userId: this.currentUserId,
                hasExistingRequest: !!this.budgetData
            });
            
        } catch (error) {
            console.error('❌ EquipmentBudgetManager 초기화 실패:', error);
            this.showToast('시스템 초기화에 실패했습니다', 'error');
        }
    }

    /**
     * 📊 현재 사용자의 예산 데이터 로드
     */
    async loadBudgetData() {
        try {
            const { data, error } = await this.supabaseClient
                .from('student_budgets')
                .select(`
                    special_request_amount,
                    special_request_reason,
                    special_request_status,
                    special_admin_rejection_reason,
                    allocated_budget,
                    remaining_budget
                `)
                .eq('user_id', this.currentUserId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            this.budgetData = data;
            console.log('📊 예산 데이터 로드 완료:', this.budgetData);
            
        } catch (error) {
            console.error('❌ 예산 데이터 로드 실패:', error);
            throw new Error('예산 정보를 불러오는데 실패했습니다');
        }
    }

    /**
     * 🔍 기존 신청 내역 확인
     */
    async checkExistingRequest() {
        try {
            if (!this.budgetData) {
                await this.loadBudgetData();
            }

            // 활성 신청이 있는지 확인 (pending, approved 상태)
            const hasActiveRequest = this.budgetData && 
                this.budgetData.special_request_status && 
                this.budgetData.special_request_status !== 'deleted';

            return {
                hasRequest: hasActiveRequest,
                status: this.budgetData?.special_request_status,
                amount: this.budgetData?.special_request_amount,
                reason: this.budgetData?.special_request_reason,
                rejectionReason: this.budgetData?.special_admin_rejection_reason
            };
            
        } catch (error) {
            console.error('❌ 기존 신청 확인 실패:', error);
            return { hasRequest: false };
        }
    }

    /**
     * ✨ 새로운 예산 신청 생성
     * @param {number} amount - 신청 금액
     * @param {string} reason - 신청 사유
     */
    async createBudgetRequest(amount, reason) {
        try {
            if (!amount || amount <= 0) {
                throw new Error('신청 금액은 0원보다 커야 합니다');
            }

            if (!reason || reason.trim().length < 10) {
                throw new Error('신청 사유는 10자 이상 입력해주세요');
            }

            // 🔒 중복 신청 방지 검사
            const existingRequest = await this.checkExistingRequest();
            if (existingRequest.hasRequest && existingRequest.status !== 'rejected') {
                throw new Error('이미 진행 중인 신청이 있습니다');
            }

            console.log('💰 예산 신청 생성 시작:', { amount, reason });

            const { data, error } = await this.supabaseClient
                .from('student_budgets')
                .update({
                    special_request_amount: amount,
                    special_request_reason: reason.trim(),
                    special_request_status: 'pending',
                    special_admin_rejection_reason: null
                })
                .eq('user_id', this.currentUserId)
                .select();

            if (error) throw error;

            // 📊 로컬 데이터 업데이트
            await this.loadBudgetData();
            
            console.log('✅ 예산 신청 생성 완료:', data);
            this.showToast('특별 예산 지원 신청이 완료되었습니다', 'success');
            
            return data;
            
        } catch (error) {
            console.error('❌ 예산 신청 생성 실패:', error);
            this.showToast(error.message || '신청 처리 중 오류가 발생했습니다', 'error');
            throw error;
        }
    }

    /**
     * 🗑️ 예산 신청 삭제 (반려된 신청만)
     */
    async deleteBudgetRequest() {
        try {
            const existingRequest = await this.checkExistingRequest();
            
            if (!existingRequest.hasRequest) {
                throw new Error('삭제할 신청이 없습니다');
            }

            if (existingRequest.status !== 'rejected') {
                throw new Error('반려된 신청만 삭제할 수 있습니다');
            }

            console.log('🗑️ 예산 신청 삭제 시작');

            const { data, error } = await this.supabaseClient
                .from('student_budgets')
                .update({
                    special_request_amount: null,
                    special_request_reason: null,
                    special_request_status: null,
                    special_admin_rejection_reason: null
                })
                .eq('user_id', this.currentUserId)
                .select();

            if (error) throw error;

            // 📊 로컬 데이터 업데이트
            await this.loadBudgetData();
            
            console.log('✅ 예산 신청 삭제 완료:', data);
            this.showToast('신청 내역이 삭제되었습니다', 'success');
            
            // 🎨 모달 닫기
            this.closeModal();
            
            return data;
            
        } catch (error) {
            console.error('❌ 예산 신청 삭제 실패:', error);
            this.showToast(error.message || '삭제 처리 중 오류가 발생했습니다', 'error');
            throw error;
        }
    }

    /**
     * 🎨 특별 예산 신청 모달 표시
     */
    async showBudgetRequestModal() {
        try {
            if (!this.isInitialized) {
                throw new Error('BudgetManager가 초기화되지 않았습니다');
            }

            // 🔍 기존 신청 확인
            const existingRequest = await this.checkExistingRequest();
            
            let modalContent;
            if (existingRequest.hasRequest) {
                // 📋 기존 신청 상태 표시
                modalContent = this.renderRequestStatus(
                    existingRequest.status,
                    existingRequest.amount,
                    existingRequest.reason,
                    existingRequest.rejectionReason
                );
            } else {
                // ✨ 새 신청 폼 표시
                modalContent = this.renderRequestForm();
            }

            // 🎨 모달 표시
            this.displayModal(modalContent);
            
        } catch (error) {
            console.error('❌ 모달 표시 실패:', error);
            this.showToast('페이지를 불러오는데 실패했습니다', 'error');
        }
    }

    /**
     * 🎨 신청 폼 렌더링
     */
    renderRequestForm() {
        return `
            <div class="modal-content budget-request-form">
                <div class="modal-header">
                    <h3>💰 특별 예산 지원 신청</h3>
                    <p class="modal-description">교구 구매를 위한 추가 예산을 신청할 수 있습니다</p>
                </div>
                
                <form id="budgetRequestForm" class="budget-form">
                    <div class="form-group">
                        <label for="requestAmount" class="form-label">
                            <i class="lucide-won-sign"></i>
                            신청 금액 (원)
                        </label>
                        <input 
                            type="number" 
                            id="requestAmount" 
                            name="amount"
                            min="1000" 
                            step="1000" 
                            max="500000"
                            required
                            placeholder="예: 50000"
                            class="form-input amount-input"
                        >
                        <div class="input-helper">최소 1,000원부터 최대 500,000원까지 신청 가능합니다</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="requestReason" class="form-label">
                            <i class="lucide-file-text"></i>
                            신청 사유
                        </label>
                        <textarea 
                            id="requestReason" 
                            name="reason"
                            rows="4" 
                            required 
                            maxlength="500"
                            placeholder="특별 예산이 필요한 이유를 구체적으로 작성해주세요 (최소 10자)"
                            class="form-textarea"
                        ></textarea>
                        <div class="char-counter">
                            <span id="charCount">0</span>/500자
                        </div>
                    </div>
                    
                    <div class="form-notice">
                        <div class="notice-content">
                            <i class="lucide-info"></i>
                            <div>
                                <strong>신청 안내</strong>
                                <ul>
                                    <li>승인 시 할당 예산에 자동으로 추가됩니다</li>
                                    <li>반려 시 사유를 확인하고 재신청 가능합니다</li>
                                    <li>허위 신청 시 불이익이 있을 수 있습니다</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary btn-submit">
                            <i class="lucide-send"></i>
                            신청하기
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="window.budgetManager.closeModal()">
                            <i class="lucide-x"></i>
                            취소
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * 🎨 신청 상태 렌더링
     */
    renderRequestStatus(status, amount, reason, rejectionReason) {
        const config = this.statusConfig[status];
        const formattedAmount = amount ? amount.toLocaleString() : '0';
        
        return `
            <div class="modal-content budget-status">
                <div class="modal-header">
                    <h3>💰 특별 예산 지원 신청 현황</h3>
                </div>
                
                <div class="status-card ${status}" style="
                    background: ${config.bgColor};
                    border-left: 4px solid ${config.borderColor};
                ">
                    <div class="status-header" style="color: ${config.color};">
                        <span class="status-icon">${config.icon}</span>
                        <span class="status-text">${config.text}</span>
                    </div>
                    
                    <div class="request-details">
                        <div class="detail-item">
                            <strong>신청 금액:</strong>
                            <span class="amount-value">${formattedAmount}원</span>
                        </div>
                        <div class="detail-item">
                            <strong>신청 사유:</strong>
                            <div class="reason-content">${reason || '-'}</div>
                        </div>
                        ${rejectionReason ? `
                            <div class="detail-item rejection-reason">
                                <strong>반려 사유:</strong>
                                <div class="rejection-content">${rejectionReason}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${status === 'pending' ? `
                        <div class="status-message pending-message">
                            <i class="lucide-clock"></i>
                            관리자 검토 중입니다. 승인 시 자동으로 예산에 반영됩니다.
                        </div>
                    ` : ''}
                    
                    ${status === 'approved' ? `
                        <div class="status-message approved-message">
                            <i class="lucide-check-circle"></i>
                            신청이 승인되어 예산에 반영되었습니다.
                        </div>
                    ` : ''}
                    
                    ${status === 'rejected' ? `
                        <div class="status-actions">
                            <button class="btn btn-danger" onclick="window.budgetManager.deleteBudgetRequest()">
                                <i class="lucide-trash-2"></i>
                                신청 삭제
                            </button>
                            <div class="action-helper">삭제 후 새로운 신청이 가능합니다</div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.budgetManager.closeModal()">
                        <i class="lucide-x"></i>
                        닫기
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 🎨 모달 표시
     */
    displayModal(content) {
        if (!this.modalElement) {
            console.error('❌ 모달 엘리먼트를 찾을 수 없습니다');
            return;
        }

        // 📄 컨텐츠 삽입
        const contentContainer = this.modalElement.querySelector('#budgetModalContent');
        if (contentContainer) {
            contentContainer.innerHTML = content;
        }

        // 🎨 모달 표시
        this.modalElement.style.display = 'flex';
        this.modalElement.style.opacity = '1';        // ← 추가
        this.modalElement.style.visibility = 'visible'; // ← 추가
        this.isModalOpen = true;
        document.body.style.overflow = 'hidden';

        // 🎯 폼 이벤트 바인딩 (신청 폼인 경우)
        const form = this.modalElement.querySelector('#budgetRequestForm');
        if (form) {
            this.bindFormEvents(form);
        }

        // 🎨 아이콘 초기화
        this.initializeLucideIcons();

        console.log('🎨 예산 신청 모달 표시됨');
    }

    /**
     * 🎯 폼 이벤트 바인딩
     */
    bindFormEvents(form) {
        // 💰 금액 입력 포맷팅
        const amountInput = form.querySelector('#requestAmount');
        if (amountInput) {
            amountInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value) {
                    // 천 단위로 반올림
                    value = Math.floor(parseInt(value) / 1000) * 1000;
                    e.target.value = value;
                }
            });
        }

        // 📝 텍스트 영역 문자 수 카운터
        const reasonTextarea = form.querySelector('#requestReason');
        const charCounter = form.querySelector('#charCount');
        if (reasonTextarea && charCounter) {
            reasonTextarea.addEventListener('input', (e) => {
                const length = e.target.value.length;
                charCounter.textContent = length;
                
                // 색상 변경
                if (length < 10) {
                    charCounter.style.color = '#ef4444';
                } else if (length > 450) {
                    charCounter.style.color = '#f59e0b';
                } else {
                    charCounter.style.color = '#10b981';
                }
            });
        }

        // 📋 폼 제출 처리
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission(form);
        });
    }

    /**
     * 📋 폼 제출 처리
     */
    async handleFormSubmission(form) {
        try {
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;
            
            // 🔄 로딩 상태
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="lucide-loader-2 animate-spin"></i> 처리 중...';

            // 📊 폼 데이터 수집
            const formData = new FormData(form);
            const amount = parseInt(formData.get('amount'));
            const reason = formData.get('reason');

            // ✅ 클라이언트 검증
            if (!amount || amount < 1000) {
                throw new Error('신청 금액은 최소 1,000원 이상이어야 합니다');
            }

            if (amount > 500000) {
                throw new Error('신청 금액은 최대 500,000원을 초과할 수 없습니다');
            }

            if (!reason || reason.trim().length < 10) {
                throw new Error('신청 사유는 최소 10자 이상 입력해주세요');
            }

            // 🚀 신청 생성
            await this.createBudgetRequest(amount, reason);
            
            // 🎨 모달 닫기
            this.closeModal();
            
        } catch (error) {
            console.error('❌ 폼 제출 실패:', error);
            this.showToast(error.message || '신청 처리 중 오류가 발생했습니다', 'error');
            
        } finally {
            // 🔄 버튼 복구
            const submitBtn = form.querySelector('.btn-submit');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="lucide-send"></i> 신청하기';
            }
        }
    }

    /**
     * 🎨 모달 닫기
     */
    closeModal() {
            if (this.modalElement) {
                this.modalElement.style.display = 'none';
                this.modalElement.style.opacity = '0';        // ← 추가
                this.modalElement.style.visibility = 'hidden'; // ← 추가
                this.isModalOpen = false;
                document.body.style.overflow = '';
            
            // 📄 컨텐츠 정리
            const contentContainer = this.modalElement.querySelector('#budgetModalContent');
            if (contentContainer) {
                contentContainer.innerHTML = '';
            }
            
            console.log('🎨 예산 신청 모달 닫힘');
        }
    }

    /**
     * 🎯 이벤트 리스너 바인딩
     */
    bindEvents() {
        // 🖱️ 모달 배경 클릭시 닫기
        if (this.modalElement) {
            const backdrop = this.modalElement.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => {
                    this.closeModal();
                });
            }
        }

        // ⌨️ ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeModal();
            }
        });

        console.log('🎯 BudgetManager 이벤트 바인딩 완료');
    }

    /**
     * 🎨 Lucide 아이콘 초기화
     */
    initializeLucideIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            setTimeout(() => {
                lucide.createIcons();
            }, 100);
        }
    }

    /**
     * 🍞 토스트 알림 표시
     */
    showToast(message, type = 'info') {
        // 기존 토스트 제거
        const existingToast = document.querySelector('.budget-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `budget-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="lucide-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;

        // 🎨 스타일 적용
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            animation: 'slideInRight 0.3s ease-out'
        });

        document.body.appendChild(toast);

        // 🎨 아이콘 초기화
        this.initializeLucideIcons();

        // ⏰ 자동 제거
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 4000);
    }

    /**
     * 🔄 데이터 새로고침
     */
    async refresh() {
        try {
            await this.loadBudgetData();
            console.log('🔄 BudgetManager 데이터 새로고침 완료');
        } catch (error) {
            console.error('❌ 데이터 새로고침 실패:', error);
        }
    }

    /**
     * 🧹 리소스 정리
     */
    destroy() {
        this.currentUserId = null;
        this.budgetData = null;
        this.supabaseClient = null;
        this.isInitialized = false;
        
        if (this.isModalOpen) {
            this.closeModal();
        }
        
        console.log('🧹 EquipmentBudgetManager 리소스 정리 완료');
    }
}

// 🌐 전역 접근을 위한 exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EquipmentBudgetManager };
} else if (typeof window !== 'undefined') {
    window.EquipmentBudgetManager = EquipmentBudgetManager;
}

console.log('✅ equipment-request-budget.js v1.0.0 로드 완료');
