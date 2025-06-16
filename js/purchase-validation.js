// 온라인 구매시 링크 필수 처리 및 동적 form 관리 - 완전 구현 버전
(function() {
    'use strict';

    console.log('📝 온라인 구매 링크 필수 처리 스크립트 로드됨 (완전 구현 버전)');

    // DOM이 로드된 후 실행
    document.addEventListener('DOMContentLoaded', function() {
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

        console.log('✅ 구매 방식 처리 초기화 완료');
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
            linkLabel.innerHTML = '참고 링크 <span class="optional-text">(선택)</span>';
            linkInput.placeholder = '참고할 수 있는 링크가 있다면 입력하세요';
            linkInput.removeAttribute('required');
            linkGroup.classList.remove('required-field');
            linkGroup.classList.add('optional-field');
        } else {
            // 온라인 구매: 링크 필수
            linkLabel.innerHTML = '구매 링크 <span class="required-text">*</span>';
            linkInput.placeholder = '관리자가 구매할 수 있는 정확한 링크를 입력하세요 (필수)';
            linkInput.setAttribute('required', 'required');
            linkGroup.classList.add('required-field');
            linkGroup.classList.remove('optional-field');
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

        console.log('📋 폼 검증 시작:', { itemName, itemPurpose, itemPrice, itemLink, purchaseMethod });

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

        // ⭐ 핵심: 온라인 구매시 링크 필수 검증
        if (purchaseMethod === 'online') {
            if (!itemLink) {
                showValidationError(
                    '⚠️ 온라인 구매의 경우 구매 링크가 필수입니다.\n\n관리자가 대신 구매할 수 있도록 정확한 구매 링크를 입력해주세요.\n\n예시: https://www.coupang.com/vp/products/...\n      https://www.amazon.com/...\n      https://smartstore.naver.com/...',
                    'itemLink'
                );
                return false;
            }

            // URL 형식 검증
            if (!isValidUrl(itemLink)) {
                showValidationError(
                    '⚠️ 올바른 URL 형식으로 구매 링크를 입력해주세요.\n\n올바른 형식 예시:\n• https://www.coupang.com/vp/products/...\n• https://www.amazon.com/...\n• https://smartstore.naver.com/...\n\n입력하신 링크: ' + itemLink,
                    'itemLink'
                );
                return false;
            }

            console.log('✅ 온라인 구매 링크 검증 통과:', itemLink);
        } else {
            console.log('ℹ️ 오프라인 구매 - 링크 검증 생략');
        }

        console.log('✅ 모든 폼 검증 통과');
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
        // 시각적 강조와 함께 alert 표시
        alert(message);
        
        const field = document.getElementById(fieldId);
        if (field) {
            field.focus();
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 시각적 강조
            field.style.borderColor = '#ef4444';
            field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
            field.style.backgroundColor = '#fef2f2';
            
            // 3초 후 스타일 복원
            setTimeout(() => {
                field.style.borderColor = '';
                field.style.boxShadow = '';
                field.style.backgroundColor = '';
            }, 3000);
        }
    }

    // StudentManager가 있는 경우 getApplicationFormData 메서드 완전히 덮어쓰기
    function patchStudentManagerValidation() {
        if (typeof window.StudentManager !== 'undefined') {
            console.log('🔧 StudentManager validation 패치 적용 (완전 구현)');
            
            // ⭐ 핵심: getApplicationFormData 함수 완전 교체
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

                    console.log('📝 폼 데이터 수집:', formData);

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

                    // ⭐⭐⭐ 가장 중요한 부분: 온라인 구매시 링크 필수 처리
                    if (formData.purchase_type === 'online') {
                        if (!formData.purchase_link) {
                            showValidationError(
                                '🚨 온라인 구매의 경우 구매 링크가 필수입니다!\n\n' +
                                '관리자가 대신 구매할 수 있도록 정확한 구매 링크를 입력해주세요.\n\n' +
                                '예시:\n' +
                                '• 쿠팡: https://www.coupang.com/vp/products/...\n' +
                                '• 아마존: https://www.amazon.com/...\n' +
                                '• 네이버 스마트스토어: https://smartstore.naver.com/...\n\n' +
                                '💡 참고: 링크가 없는 경우 "오프라인 구매"를 선택하세요.',
                                'itemLink'
                            );
                            return null;
                        }

                        // 링크 형식 검증 (온라인 구매시만)
                        if (!isValidUrl(formData.purchase_link)) {
                            showValidationError(
                                '⚠️ 올바른 URL 형식으로 구매 링크를 입력해주세요.\n\n' +
                                '올바른 형식:\n' +
                                '• https://www.coupang.com/vp/products/...\n' +
                                '• https://www.amazon.com/...\n' +
                                '• https://smartstore.naver.com/...\n\n' +
                                '입력하신 링크: ' + formData.purchase_link + '\n\n' +
                                '💡 https:// 또는 http://로 시작하는 완전한 URL을 입력해주세요.',
                                'itemLink'
                            );
                            return null;
                        }

                        console.log('✅ 온라인 구매 링크 검증 통과:', formData.purchase_link);
                    } else {
                        console.log('ℹ️ 오프라인 구매 - 링크는 선택사항입니다');
                        
                        // 오프라인 구매시 링크가 있다면 형식 검증
                        if (formData.purchase_link && !isValidUrl(formData.purchase_link)) {
                            showValidationError(
                                '참고 링크의 URL 형식이 올바르지 않습니다.\n\n' +
                                '올바른 형식: https://www.example.com/...\n\n' +
                                '링크가 없다면 비워두시거나 올바른 형식으로 입력해주세요.',
                                'itemLink'
                            );
                            return null;
                        }
                    }

                    console.log('✅ 모든 검증 통과 - 폼 데이터 반환');
                    return formData;
                } catch (error) {
                    console.error('❌ 폼 데이터 수집 오류:', error);
                    alert('폼 데이터 처리 중 오류가 발생했습니다.');\n                    return null;
                }
            };

            // handlePurchaseMethodChange도 추가/교체
            window.StudentManager.handlePurchaseMethodChange = handlePurchaseMethodChange;

            // 기존 resetApplicationForm 함수 강화
            const originalResetApplicationForm = window.StudentManager.resetApplicationForm;
            window.StudentManager.resetApplicationForm = function() {
                try {
                    // 기존 리셋 로직 실행
                    if (originalResetApplicationForm) {
                        originalResetApplicationForm.call(this);
                    }

                    // 구매 방식 기본값 설정 및 UI 업데이트
                    const form = document.getElementById('applicationForm');
                    if (form) {
                        const onlineRadio = form.querySelector('input[name="purchaseMethod"][value="online"]');
                        if (onlineRadio) {
                            onlineRadio.checked = true;
                            handlePurchaseMethodChange('online');
                        }
                    }

                    console.log('✅ 신청 폼 초기화 완료 (링크 필수 처리 포함)');
                } catch (error) {
                    console.error('신청 폼 초기화 오류:', error);
                }
            };

            console.log('✅ StudentManager validation 패치 완료 (완전 구현)');
        } else {
            console.warn('⚠️ StudentManager를 찾을 수 없습니다 - 나중에 재시도합니다');
        }
    }

    // StudentManager 로드 대기 및 패치 적용
    let patchAttempts = 0;
    const maxPatchAttempts = 50; // 5초간 시도
    
    const checkStudentManager = setInterval(function() {
        patchAttempts++;
        
        if (typeof window.StudentManager !== 'undefined') {
            clearInterval(checkStudentManager);
            setTimeout(() => {
                patchStudentManagerValidation();
            }, 100); // StudentManager 완전 로드 대기
        } else if (patchAttempts >= maxPatchAttempts) {
            clearInterval(checkStudentManager);
            console.warn('⚠️ StudentManager를 찾을 수 없어 validation 패치를 적용하지 못했습니다 (시도: ' + patchAttempts + '회)');
        }
    }, 100);

    // CSS 스타일 추가 (필수/선택 표시용)
    const style = document.createElement('style');
    style.textContent = `
        .required-text {
            color: #ef4444;
            font-weight: 600;
        }
        
        .optional-text {
            color: #6b7280;
            font-weight: 400;
        }
        
        .required-field label {
            font-weight: 600;
        }
        
        .required-field input:invalid {
            border-color: #fca5a5;
            background-color: #fef2f2;
        }
        
        .required-field input:valid {
            border-color: #10b981;
        }
        
        .optional-field label {
            opacity: 0.8;
        }
        
        .form-validation-error {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
            background-color: #fef2f2 !important;
        }
    `;
    document.head.appendChild(style);

    // 전역 함수로 노출
    window.handlePurchaseMethodChange = handlePurchaseMethodChange;
    window.validateApplicationForm = validateApplicationForm;
    window.isValidUrl = isValidUrl;

    console.log('✅ 온라인 구매 링크 필수 처리 스크립트 초기화 완료 (완전 구현 버전)');
})();