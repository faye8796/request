// 온라인 구매시 링크 필수 처리 및 동적 form 관리
(function() {
    'use strict';

    // DOM이 로드된 후 실행
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📝 온라인 구매 링크 필수 처리 스크립트 로드됨');
        initializePurchaseMethodHandling();
    });

    function initializePurchaseMethodHandling() {
        // 구매 방식 라디오 버튼에 이벤트 리스너 추가
        const purchaseMethodInputs = document.querySelectorAll('input[name="purchaseMethod"]');
        
        purchaseMethodInputs.forEach(input => {
            input.addEventListener('change', function() {
                handlePurchaseMethodChange(this.value);
            });
        });

        // 초기 상태 설정 (온라인 구매가 기본값)
        handlePurchaseMethodChange('online');

        // 폼 제출 시 validation 추가
        const applicationForm = document.getElementById('applicationForm');
        if (applicationForm) {
            // 기존 제출 이벤트를 가로채서 validation 추가
            applicationForm.addEventListener('submit', function(e) {
                if (!validateApplicationForm()) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    }

    function handlePurchaseMethodChange(method) {
        const linkGroup = document.getElementById('itemLinkGroup');
        const linkLabel = document.getElementById('itemLinkLabel');
        const linkInput = document.getElementById('itemLink');
        
        if (!linkGroup || !linkLabel || !linkInput) {
            console.warn('구매 링크 관련 DOM 요소를 찾을 수 없습니다');
            return;
        }

        if (method === 'offline') {
            // 오프라인 구매: 링크 선택사항
            linkLabel.textContent = '참고 링크 (선택)';
            linkInput.placeholder = '참고할 수 있는 링크가 있다면 입력하세요';
            linkInput.removeAttribute('required');
            linkGroup.classList.remove('required-field');
        } else {
            // 온라인 구매: 링크 필수
            linkLabel.textContent = '구매 링크 *';
            linkInput.placeholder = '관리자가 구매할 수 있는 정확한 링크를 입력하세요 (필수)';
            linkInput.setAttribute('required', 'required');
            linkGroup.classList.add('required-field');
        }

        console.log(`구매 방식 변경: ${method}, 링크 필수 여부: ${method === 'online'}`);
    }

    function validateApplicationForm() {
        // 기본 필드 검증
        const itemName = document.getElementById('itemName')?.value?.trim();
        const itemPurpose = document.getElementById('itemPurpose')?.value?.trim();
        const itemPrice = document.getElementById('itemPrice')?.value;
        const itemLink = document.getElementById('itemLink')?.value?.trim();
        const purchaseMethod = document.querySelector('input[name="purchaseMethod"]:checked')?.value;

        // 교구명 검증
        if (!itemName) {
            showValidationError('교구명을 입력해주세요.', 'itemName');
            return false;
        }

        // 사용 목적 검증
        if (!itemPurpose) {
            showValidationError('사용 목적을 입력해주세요.', 'itemPurpose');
            return false;
        }

        // 가격 검증
        if (!itemPrice || parseInt(itemPrice) <= 0) {
            showValidationError('올바른 가격을 입력해주세요.', 'itemPrice');
            return false;
        }

        // 온라인 구매시 링크 필수 검증
        if (purchaseMethod === 'online') {
            if (!itemLink) {
                showValidationError(
                    '온라인 구매의 경우 구매 링크가 필수입니다.\n관리자가 대신 구매할 수 있도록 정확한 구매 링크를 입력해주세요.',
                    'itemLink'
                );
                return false;
            }

            // URL 형식 검증
            if (!isValidUrl(itemLink)) {
                showValidationError(
                    '올바른 URL 형식으로 구매 링크를 입력해주세요.\n예: https://www.coupang.com/vp/products/...',
                    'itemLink'
                );
                return false;
            }
        }

        return true;
    }

    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    function showValidationError(message, fieldId) {
        alert(message);
        
        const field = document.getElementById(fieldId);
        if (field) {
            field.focus();
            // 시각적 강조
            field.style.borderColor = '#ef4444';
            field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
            
            // 3초 후 스타일 복원
            setTimeout(() => {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }, 3000);
        }
    }

    // StudentManager가 있는 경우 getApplicationFormData 메서드 덮어쓰기
    function patchStudentManagerValidation() {
        if (typeof window.StudentManager !== 'undefined' && window.StudentManager.getApplicationFormData) {
            console.log('🔧 StudentManager validation 패치 적용');
            
            // 원본 함수 백업
            const originalGetApplicationFormData = window.StudentManager.getApplicationFormData;
            
            // 새로운 validation이 포함된 함수로 교체
            window.StudentManager.getApplicationFormData = function() {
                try {
                    const formData = {
                        item_name: document.getElementById('itemName')?.value?.trim() || '',
                        purpose: document.getElementById('itemPurpose')?.value?.trim() || '',
                        price: parseInt(document.getElementById('itemPrice')?.value) || 0,
                        purchase_link: document.getElementById('itemLink')?.value?.trim() || '',
                        purchase_type: document.querySelector('input[name="purchaseMethod"]:checked')?.value || 'online',
                        is_bundle: false
                    };

                    // 필수 필드 검증
                    if (!formData.item_name) {
                        showValidationError('교구명을 입력해주세요.', 'itemName');
                        return null;
                    }

                    if (!formData.purpose) {
                        showValidationError('사용 목적을 입력해주세요.', 'itemPurpose');
                        return null;
                    }

                    if (!formData.price || formData.price <= 0) {
                        showValidationError('올바른 가격을 입력해주세요.', 'itemPrice');
                        return null;
                    }

                    // 온라인 구매시 링크 필수 처리
                    if (formData.purchase_type === 'online' && !formData.purchase_link) {
                        showValidationError(
                            '온라인 구매의 경우 구매 링크가 필수입니다.\n관리자가 대신 구매할 수 있도록 정확한 구매 링크를 입력해주세요.',
                            'itemLink'
                        );
                        return null;
                    }

                    // 링크 형식 검증 (온라인 구매시만)
                    if (formData.purchase_type === 'online' && formData.purchase_link) {
                        if (!isValidUrl(formData.purchase_link)) {
                            showValidationError(
                                '올바른 URL 형식으로 구매 링크를 입력해주세요.\n예: https://www.coupang.com/vp/products/...',
                                'itemLink'
                            );
                            return null;
                        }
                    }

                    return formData;
                } catch (error) {
                    console.error('폼 데이터 수집 오류:', error);
                    alert('폼 데이터 처리 중 오류가 발생했습니다.');
                    return null;
                }
            };

            // handlePurchaseMethodChange도 추가
            if (!window.StudentManager.handlePurchaseMethodChange) {
                window.StudentManager.handlePurchaseMethodChange = handlePurchaseMethodChange;
            }

            console.log('✅ StudentManager validation 패치 완료');
        }
    }

    // StudentManager 로드 대기
    const checkStudentManager = setInterval(function() {
        if (typeof window.StudentManager !== 'undefined') {
            clearInterval(checkStudentManager);
            patchStudentManagerValidation();
        }
    }, 100);

    // 5초 후에도 StudentManager가 없으면 포기
    setTimeout(function() {
        clearInterval(checkStudentManager);
        if (typeof window.StudentManager === 'undefined') {
            console.warn('⚠️ StudentManager를 찾을 수 없어 validation 패치를 적용하지 못했습니다');
        }
    }, 5000);

    // 전역 함수로 노출
    window.handlePurchaseMethodChange = handlePurchaseMethodChange;
    window.validateApplicationForm = validateApplicationForm;

    console.log('✅ 온라인 구매 링크 필수 처리 스크립트 초기화 완료');
})();