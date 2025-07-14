// flight-request-utils.js - 항공권 신청 유틸리티 함수 모음 v1.0
// 🎯 진짜 유틸리티 함수들만 모음 (UI 로직 제외)
// 🧹 코드 정리 v3 - 실제 utils 함수 분리

/**
 * FlightRequestUtils - 항공권 신청 관련 유틸리티 함수들
 */
class FlightRequestUtils {
    
    // === 날짜 관련 유틸리티 ===
    
    /**
     * 날짜 포맷팅 (한국어)
     */
    static formatDate(dateString) {
        if (!dateString) return '날짜 없음';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return '잘못된 날짜';
        }
    }

    /**
     * 날짜시간 포맷팅 (한국어)
     */
    static formatDateTime(dateString) {
        if (!dateString) return '날짜 없음';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '잘못된 날짜';
        }
    }

    /**
     * 출국일-귀국일 기간 계산
     */
    static calculateDuration(departureDate, returnDate) {
        if (!departureDate || !returnDate) return 0;
        
        try {
            const start = new Date(departureDate);
            const end = new Date(returnDate);
            const diffTime = Math.abs(end - start);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (error) {
            return 0;
        }
    }

    /**
     * 🆕 v8.2.1: 현지 활동기간 계산 (학당 근무일 기준)
     */
    static calculateActivityDays(arrivalDate, workEndDate) {
        if (!arrivalDate || !workEndDate) return 0;
        
        try {
            const start = new Date(arrivalDate);
            const end = new Date(workEndDate);
            
            if (start >= end) return 0;
            
            return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        } catch (error) {
            return 0;
        }
    }

    // === 날짜 검증 ===

    /**
     * 출국일-귀국일 검증
     */
    static validateDates(departureDate, returnDate) {
        if (!departureDate || !returnDate) {
            return {
                valid: false,
                message: '출국일과 귀국일을 모두 입력해주세요.'
            };
        }

        try {
            const departure = new Date(departureDate);
            const returnD = new Date(returnDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (departure < today) {
                return {
                    valid: false,
                    message: '출국일은 오늘 날짜 이후여야 합니다.'
                };
            }

            if (returnD <= departure) {
                return {
                    valid: false,
                    message: '귀국일은 출국일보다 뒤여야 합니다.'
                };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                message: '올바른 날짜를 입력해주세요.'
            };
        }
    }

    /**
     * 🆕 v8.2.1: 현지 활동기간 날짜 검증
     */
    static validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate) {
        const validation = {
            valid: true,
            errors: [],
            activityDays: 0
        };

        try {
            const departure = new Date(departureDate);
            const arrival = new Date(arrivalDate);
            const workEnd = new Date(workEndDate);
            const returnD = new Date(returnDate);

            // 기본 날짜 순서 검증
            if (arrival < departure) {
                validation.errors.push('현지 도착일은 출국일 이후여야 합니다');
                validation.valid = false;
            }

            // 현지 도착일은 출국일로부터 최대 1일 후까지
            const maxArrivalDate = new Date(departure.getTime() + (1 * 24 * 60 * 60 * 1000));
            if (arrival > maxArrivalDate) {
                validation.errors.push('현지 도착일은 출국일로부터 1일 이내여야 합니다');
                validation.valid = false;
            }

            if (workEnd <= arrival) {
                validation.errors.push('학당 근무 종료일은 현지 도착일 이후여야 합니다');
                validation.valid = false;
            }

            if (workEnd > returnD) {
                validation.errors.push('학당 근무 종료일은 귀국일 이전이어야 합니다');
                validation.valid = false;
            }

            // 귀국일은 활동 종료일로부터 최대 9일 후까지
            const maxReturnDate = new Date(workEnd.getTime() + (9 * 24 * 60 * 60 * 1000));
            if (returnD > maxReturnDate) {
                validation.errors.push('귀국일은 활동 종료일로부터 9일 이내여야 합니다');
                validation.valid = false;
            }

            // 활동일 계산
            if (arrival < workEnd) {
                validation.activityDays = this.calculateActivityDays(arrivalDate, workEndDate);
            }

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다');
            validation.valid = false;
        }

        return validation;
    }

    /**
     * 🆕 v8.2.1: 최소 활동일 검증
     */
    static validateMinimumActivityDays(activityDays, requiredDays = 180) {
        if (activityDays < requiredDays) {
            return {
                valid: false,
                message: `최소 ${requiredDays}일의 활동 기간이 필요합니다 (현재: ${activityDays}일)`
            };
        }

        if (activityDays === requiredDays) {
            return {
                valid: true,
                warning: `정확히 최소 요구일(${requiredDays}일)을 충족합니다`
            };
        }

        return {
            valid: true,
            message: `활동 기간이 요구사항을 충족합니다 (${activityDays}일)`
        };
    }

    /**
     * 파견 기간 검증
     */
    static validateDispatchDuration(duration, allowedDuration) {
        if (!allowedDuration) allowedDuration = 90; // 기본값
        
        const tolerance = 5; // 5일 여유
        
        if (duration < allowedDuration - tolerance) {
            return {
                valid: false,
                message: `파견 기간이 너무 짧습니다. (${duration}일 < ${allowedDuration}일)`
            };
        }
        
        if (duration > allowedDuration + tolerance) {
            return {
                valid: false,
                message: `파견 기간이 너무 깁니다. (${duration}일 > ${allowedDuration}일)`
            };
        }
        
        return { valid: true };
    }

    // === 상태 관련 유틸리티 ===

    /**
     * 신청 상태 정보 가져오기
     */
    static getStatusInfo(status) {
        const statusMap = {
            'pending': { text: '승인 대기', class: 'status-pending', color: '#f59e0b' },
            'approved': { text: '승인됨', class: 'status-approved', color: '#10b981' },
            'rejected': { text: '반려됨', class: 'status-rejected', color: '#ef4444' },
            'completed': { text: '완료됨', class: 'status-completed', color: '#6b7280' }
        };
        
        return statusMap[status] || { text: status, class: 'status-unknown', color: '#6b7280' };
    }

    /**
     * 구매 방식 텍스트
     */
    static getPurchaseTypeText(type) {
        const typeMap = {
            'direct': '직접 구매',
            'agency': '구매 대행'
        };
        
        return typeMap[type] || type;
    }

    // === 가격 관련 유틸리티 ===

    /**
     * 가격 포맷팅
     */
    static formatPrice(price, currency = 'KRW') {
        if (!price) return '-';
        
        try {
            const numPrice = parseFloat(price);
            const formatter = new Intl.NumberFormat('ko-KR');
            
            switch(currency) {
                case 'KRW':
                    return `${formatter.format(numPrice)}원`;
                case 'USD':
                    return `$${formatter.format(numPrice)}`;
                case 'CNY':
                    return `¥${formatter.format(numPrice)}`;
                case 'JPY':
                    return `¥${formatter.format(numPrice)}`;
                case 'EUR':
                    return `€${formatter.format(numPrice)}`;
                default:
                    return `${formatter.format(numPrice)} ${currency}`;
            }
        } catch (error) {
            return `${price} ${currency}`;
        }
    }

    /**
     * 통화별 가격 범위 검증
     */
    static validatePriceByCurrency(price, currency) {
        const numPrice = parseFloat(price);
        
        if (isNaN(numPrice) || numPrice <= 0) {
            return {
                valid: false,
                message: '올바른 가격을 입력해주세요.'
            };
        }

        // 통화별 최소 금액 (대략적인 항공료 기준)
        const minPrices = {
            'KRW': 200000,    // 20만원
            'USD': 150,       // 150달러
            'CNY': 1000,      // 1000위안
            'JPY': 20000,     // 2만엔
            'EUR': 140        // 140유로
        };

        const minPrice = minPrices[currency];
        if (minPrice && numPrice < minPrice) {
            return {
                valid: false,
                message: `${currency} ${this.formatPrice(minPrice, currency)} 이상의 가격을 입력해주세요.`
            };
        }

        return { valid: true };
    }

    // === 파일 관련 유틸리티 ===

    /**
     * 파일 크기 포맷팅
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 이미지 파일 검증
     */
    static validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                message: 'JPG, PNG 형식의 이미지만 업로드 가능합니다.'
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                message: '파일 크기는 5MB를 초과할 수 없습니다.'
            };
        }

        return { valid: true };
    }

    // === 기타 유틸리티 ===

    /**
     * 에러 메시지 표시 (간단한 버전)
     */
    static showError(message) {
        console.error('🚨 [Utils Error]:', message);
        
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    /**
     * 성공 메시지 표시 (간단한 버전)
     */
    static showSuccess(message) {
        console.log('✅ [Utils Success]:', message);
        
        const successEl = document.getElementById('successMessage');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
            
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }

    /**
     * 날짜 값 안전하게 가져오기
     */
    static getDateValue(elementId) {
        const element = document.getElementById(elementId);
        if (element && element.value) {
            return new Date(element.value);
        }
        return null;
    }

    /**
     * Lucide 아이콘 재초기화
     */
    static refreshIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * 디바운싱 함수
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 🔧 전역 스코프에 노출
window.FlightRequestUtils = FlightRequestUtils;

console.log('🛠️ FlightRequestUtils v1.0 로드 완료 - 실제 유틸리티 함수들');
