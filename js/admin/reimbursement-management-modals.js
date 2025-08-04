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
                this.closeReceiptViewer();
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
     * 금액 설정 모달 검증
     */
    system.validateAmountSettingForm = function() {
        const errors = [];
        
        const scheduledAmount = parseFloat(document.getElementById('scheduledAmount')?.value);
        const scheduledDate = document.getElementById('scheduledDate')?.value;
        const paymentRound = parseInt(document.getElementById('paymentRound')?.value);

        if (!scheduledAmount || scheduledAmount <= 0) {
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
     * 전체화면 영수증 뷰어 열기
     */
    system.openReceiptViewer = function(receiptUrl, title) {
        const viewer = document.getElementById('receiptViewer');
        const image = document.getElementById('receiptViewerImage');
        
        if (viewer && image && receiptUrl) {
            image.src = receiptUrl;
            image.alt = title;
            viewer.classList.add('show');
            
            // 이미지 로드 오류 처리
            image.onerror = () => {
                image.alt = '이미지를 불러올 수 없습니다.';
                image.style.backgroundColor = '#f8f9fa';
                image.style.color = '#6c757d';
                image.style.display = 'flex';
                image.style.alignItems = 'center';
                image.style.justifyContent = 'center';
                image.style.fontSize = '18px';
                image.style.border = '2px dashed #dee2e6';
            };

            console.log('🔍 전체화면 영수증 뷰어 열기:', title);
        }
    };

    /**
     * 전체화면 영수증 뷰어 닫기
     */
    system.closeReceiptViewer = function() {
        const viewer = document.getElementById('receiptViewer');
        if (viewer) {
            viewer.classList.remove('show');
            
            // 이미지 초기화
            const image = document.getElementById('receiptViewerImage');
            if (image) {
                setTimeout(() => {
                    image.src = '';
                    image.alt = '';
                    image.style.removeProperty('backgroundColor');
                    image.style.removeProperty('color');
                    image.style.removeProperty('display');
                    image.style.removeProperty('alignItems');
                    image.style.removeProperty('justifyContent');
                    image.style.removeProperty('fontSize');
                    image.style.removeProperty('border');
                }, 300);
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

window.closeReceiptViewer = function() {
    if (window.reimbursementManagementSystem) {
        window.reimbursementManagementSystem.closeReceiptViewer();
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
