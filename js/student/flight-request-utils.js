// flight-request-utils.js - 항공권 신청 유틸리티 함수 모음 v8.2.1-integrated
// 🔄 통합: flight-request-utils-new.js의 개선된 기능들 통합
// 🎯 목적: 재사용 가능한 헬퍼 함수들 제공

class FlightRequestUtils {
    constructor() {
        this.version = 'v8.2.1-integrated';
    }

    // === 날짜 관련 유틸리티 ===

    /**
     * 날짜 유효성 검증
     * @param {string} departureDate - 출발일
     * @param {string} returnDate - 귀국일
     * @returns {Object} 검증 결과
     */
    validateDates(departureDate, returnDate) {
        if (!departureDate || !returnDate) {
            return { valid: false, message: '출발일과 귀국일을 모두 입력해주세요.' };
        }

        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (departure < today) {
            return { valid: false, message: '출발일은 오늘 이후로 선택해주세요.' };
        }

        if (departure >= returnD) {
            return { valid: false, message: '귀국일은 출발일보다 뒤여야 합니다.' };
        }

        return { valid: true, message: '날짜가 유효합니다.' };
    }

    /**
     * 파견 기간 계산
     * @param {string} departureDate - 출발일
     * @param {string} returnDate - 귀국일
     * @returns {number} 일수
     */
    calculateDuration(departureDate, returnDate) {
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        return Math.ceil((returnD - departure) / (1000 * 60 * 60 * 24));
    }

    /**
     * 🆕 v8.2.1: 현지 활동일 계산
     * @param {string} arrivalDate - 현지 도착일
     * @param {string} workEndDate - 학당 근무 종료일
     * @returns {number} 활동일수
     */
    calculateActivityDays(arrivalDate, workEndDate) {
        if (!arrivalDate || !workEndDate) return 0;
        
        const arrival = new Date(arrivalDate);
        const workEnd = new Date(workEndDate);
        
        if (arrival >= workEnd) return 0;
        
        return Math.ceil((workEnd - arrival) / (1000 * 60 * 60 * 24));
    }

    /**
     * 🔄 v8.2.1-integrated: 현지 활동기간 종합 검증 (개선된 버전)
     * @param {string} departureDate - 출국일
     * @param {string} arrivalDate - 현지 도착일
     * @param {string} workEndDate - 학당 근무 종료일
     * @param {string} returnDate - 귀국일
     * @returns {Object} 검증 결과
     */
    validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate) {
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

            // 🆕 현지 도착일은 출국일로부터 최대 1일 후까지
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

            // 🆕 귀국일은 활동 종료일로부터 최대 9일 후까지
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
     * 🆕 v8.2.1: 최소 활동일 요구사항 검증
     * @param {number} activityDays - 계산된 활동일
     * @param {number} requiredDays - 최소 요구일 (기본: 180일)
     * @returns {Object} 검증 결과
     */
    validateMinimumActivityDays(activityDays, requiredDays = 180) {
        const result = {
            valid: true,
            message: '',
            warning: null
        };

        if (activityDays < requiredDays) {
            result.valid = false;
            result.message = `최소 ${requiredDays}일의 활동 기간이 필요합니다 (현재: ${activityDays}일)`;
        } else if (activityDays === requiredDays) {
            result.warning = `정확히 최소 요구일(${requiredDays}일)을 충족합니다`;
            result.message = '활동 기간이 요구사항을 충족합니다';
        } else if (activityDays < requiredDays + 30) {
            // 최소 요구일보다는 크지만 30일 이내일 때 경고
            result.warning = `활동 기간이 최소 요구사항에 근접합니다 (${activityDays}일/${requiredDays}일)`;
            result.message = '활동 기간이 요구사항을 충족합니다';
        } else {
            result.message = `활동 기간이 요구사항을 충족합니다 (${activityDays}일)`;
        }

        return result;
    }

    /**
     * 파견 기간 검증
     * @param {number} duration - 계산된 기간
     * @param {number} expectedDuration - 예상 기간
     * @returns {Object} 검증 결과
     */
    validateDispatchDuration(duration, expectedDuration) {
        const allowedRange = 7; // 일주일 여유
        
        if (duration < expectedDuration - allowedRange) {
            return {
                valid: false,
                message: `파견 기간이 너무 짧습니다. (${duration}일, 권장: ${expectedDuration}일)`
            };
        }
        
        if (duration > expectedDuration + allowedRange) {
            return {
                valid: false,
                message: `파견 기간이 너무 깁니다. (${duration}일, 권장: ${expectedDuration}일)`
            };
        }
        
        return { valid: true, message: `적절한 파견 기간입니다. (${duration}일)` };
    }

    // === 상태 관련 유틸리티 ===

    /**
     * 신청 상태 정보 반환
     * @param {string} status - 상태 코드
     * @returns {Object} 상태 정보
     */
    getStatusInfo(status) {
        const statusMap = {
            pending: { text: '승인 대기', class: 'status-pending', icon: 'clock' },
            approved: { text: '승인 완료', class: 'status-approved', icon: 'check-circle' },
            rejected: { text: '반려됨', class: 'status-rejected', icon: 'x-circle' },
            completed: { text: '완료됨', class: 'status-completed', icon: 'check-circle-2' }
        };
        
        return statusMap[status] || { text: status, class: 'status-unknown', icon: 'help-circle' };
    }

    /**
     * 구매 방식 텍스트 반환
     * @param {string} type - 구매 방식
     * @returns {string} 텍스트
     */
    getPurchaseTypeText(type) {
        const typeMap = {
            direct: '직접 구매',
            agency: '구매 대행'
        };
        return typeMap[type] || type;
    }

    // === 포맷팅 유틸리티 ===

    /**
     * 날짜 포맷팅 (한국어)
     * @param {string} dateString - 날짜 문자열
     * @returns {string} 포맷된 날짜
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        
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
     * @param {string} dateTimeString - 날짜시간 문자열
     * @returns {string} 포맷된 날짜시간
     */
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        
        try {
            const date = new Date(dateTimeString);
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
     * 🆕 v8.5.0: 가격 포맷팅
     * @param {number|string} price - 가격
     * @param {string} currency - 통화
     * @returns {string} 포맷된 가격
     */
    formatPrice(price, currency = 'KRW') {
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

    // === 유효성 검증 유틸리티 ===

    /**
     * 이메일 유효성 검증
     * @param {string} email - 이메일
     * @returns {boolean} 유효 여부
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * 여권번호 유효성 검증
     * @param {string} passportNumber - 여권번호
     * @returns {boolean} 유효 여부
     */
    isValidPassportNumber(passportNumber) {
        // 한국 여권: 대문자 1자리 + 숫자 8자리
        const passportRegex = /^[A-Z][0-9]{8}$/;
        return passportRegex.test(passportNumber);
    }

    /**
     * 🆕 v8.5.0: 통화별 가격 범위 검증
     * @param {number} price - 가격
     * @param {string} currency - 통화
     * @returns {Object} 검증 결과
     */
    validatePriceByCurrency(price, currency) {
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

        return { valid: true, message: '적절한 가격 범위입니다.' };
    }

    // === 메시지 표시 유틸리티 ===

    /**
     * 에러 메시지 표시
     * @param {string} message - 메시지
     */
    showError(message) {
        console.error('🚨 [Utils오류]:', message);
        
        // 에러 메시지 요소 찾기
        const errorElement = document.getElementById('errorMessage') || 
                           document.querySelector('.error-message') ||
                           document.querySelector('[data-error]');
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // 10초 후 자동 숨김
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 10000);
        } else {
            alert('오류: ' + message);
        }
    }

    /**
     * 성공 메시지 표시
     * @param {string} message - 메시지
     */
    showSuccess(message) {
        console.log('✅ [Utils성공]:', message);
        
        // 성공 메시지 요소 찾기
        const successElement = document.getElementById('successMessage') || 
                              document.querySelector('.success-message') ||
                              document.querySelector('[data-success]');
        
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            
            // 5초 후 자동 숨김
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 5000);
        } else {
            alert('성공: ' + message);
        }
    }

    // === 파일 관련 유틸리티 ===

    /**
     * 파일 크기 포맷팅
     * @param {number} bytes - 바이트 크기
     * @returns {string} 포맷된 크기
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 이미지 파일 유효성 검증
     * @param {File} file - 파일 객체
     * @returns {Object} 검증 결과
     */
    validateImageFile(file) {
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

        return { valid: true, message: '유효한 이미지 파일입니다.' };
    }

    // === 🆕 통합된 유틸리티 함수들 ===

    /**
     * 🆕 날짜 값 안전하게 가져오기
     * @param {string} elementId - 요소 ID
     * @returns {Date|null} 날짜 객체 또는 null
     */
    getDateValue(elementId) {
        const element = document.getElementById(elementId);
        if (element && element.value) {
            return new Date(element.value);
        }
        return null;
    }

    /**
     * 🆕 Lucide 아이콘 재초기화
     */
    refreshIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * 🆕 디바운싱 함수
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간 (밀리초)
     * @returns {Function} 디바운싱된 함수
     */
    debounce(func, wait) {
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

    // === 디버깅 유틸리티 ===

    /**
     * 간단한 상태 정보 반환
     * @returns {Object} 상태 정보
     */
    getUtilsStatus() {
        return {
            version: this.version,
            loadedAt: new Date().toISOString(),
            methods: Object.getOwnPropertyNames(this.constructor.prototype)
                .filter(name => name !== 'constructor'),
            integrationFeatures: [
                'Enhanced activity date validation',
                'Debounce utility',
                'Icon refresh utility',
                'Safe date value getter',
                'Improved error handling'
            ]
        };
    }

    // === 🆕 Static 메서드들 (호환성 보장) ===

    /**
     * 🆕 Static 버전들 (기존 코드 호환성 위해)
     */
    static formatDate(dateString) {
        return new FlightRequestUtils().formatDate(dateString);
    }

    static formatDateTime(dateTimeString) {
        return new FlightRequestUtils().formatDateTime(dateTimeString);
    }

    static calculateActivityDays(arrivalDate, workEndDate) {
        return new FlightRequestUtils().calculateActivityDays(arrivalDate, workEndDate);
    }

    static validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate) {
        return new FlightRequestUtils().validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate);
    }

    static validateMinimumActivityDays(activityDays, requiredDays = 180) {
        return new FlightRequestUtils().validateMinimumActivityDays(activityDays, requiredDays);
    }

    static formatPrice(price, currency = 'KRW') {
        return new FlightRequestUtils().formatPrice(price, currency);
    }

    static validateImageFile(file) {
        return new FlightRequestUtils().validateImageFile(file);
    }

    static showError(message) {
        return new FlightRequestUtils().showError(message);
    }

    static showSuccess(message) {
        return new FlightRequestUtils().showSuccess(message);
    }

    static getDateValue(elementId) {
        return new FlightRequestUtils().getDateValue(elementId);
    }

    static refreshIcons() {
        return new FlightRequestUtils().refreshIcons();
    }

    static debounce(func, wait) {
        return new FlightRequestUtils().debounce(func, wait);
    }
}

// 전역 스코프에 노출 (both 방식 지원)
window.FlightRequestUtils = FlightRequestUtils;

// 인스턴스 생성 및 전역 변수 설정
window.flightRequestUtils = new FlightRequestUtils();

console.log('✅ FlightRequestUtils v8.2.1-integrated 로드 완료 - 통합된 완전한 유틸리티 함수 모음');
console.log('🔄 통합 기능:', {
    enhancedValidation: '개선된 활동기간 검증',
    debouncing: '디바운싱 함수',
    iconRefresh: 'Lucide 아이콘 재초기화',
    staticMethods: 'Static 메서드 호환성',
    safeDateGetter: '안전한 날짜 값 가져오기'
});
