/**
 * 학생 검증 수정 사항
 * 
 * @description 학생 신청 폼 검증 로직 개선
 * @problem 폼 데이터 검증 오류, 온라인 구매시 링크 필수 처리 누락
 * @solution 필수 필드 검증 강화, URL 유효성 검사 추가
 * @affects StudentManager.getApplicationFormData
 * @author Claude AI
 * @date 2025-06-16
 */

// 폼 데이터 수집 및 검증
getApplicationFormData() {
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
            alert('교구명을 입력해주세요.');
            document.getElementById('itemName')?.focus();
            return null;
        }

        if (!formData.purpose) {
            alert('사용 목적을 입력해주세요.');
            document.getElementById('itemPurpose')?.focus();
            return null;
        }

        if (!formData.price || formData.price <= 0) {
            alert('올바른 가격을 입력해주세요.');
            document.getElementById('itemPrice')?.focus();
            return null;
        }

        // 온라인 구매시 링크 필수 처리 추가
        if (formData.purchase_type === 'online' && !formData.purchase_link) {
            alert('온라인 구매의 경우 구매 링크가 필수입니다.\\n관리자가 대신 구매할 수 있도록 정확한 구매 링크를 입력해주세요.');
            document.getElementById('itemLink')?.focus();
            return null;
        }

        // 링크 형식 검증 (온라인 구매시만)
        if (formData.purchase_type === 'online' && formData.purchase_link) {
            if (!this.isValidUrl(formData.purchase_link)) {
                alert('올바른 URL 형식으로 구매 링크를 입력해주세요.\\n예: https://www.coupang.com/vp/products/...');
                document.getElementById('itemLink')?.focus();
                return null;
            }
        }

        return formData;
    } catch (error) {
        console.error('일반 신청 폼 데이터 수집 오류:', error);
        alert('폼 데이터 처리 중 오류가 발생했습니다.');
        return null;
    }
},

// URL 유효성 검사 헬퍼 함수 추가
isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
},
