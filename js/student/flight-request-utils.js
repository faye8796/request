// flight-request-utils.js - 무한루프 해결 v8.2.9
// 🚨 핵심 수정사항:
//   1. console.log 출력 최소화 - 디버깅 로그 제거
//   2. 불필요한 상세 로그 제거
//   3. 초기화 신호 간소화
//   4. 성능 최적화

class FlightRequestUtils {
    constructor() {
        this.version = 'v8.2.9';
        this.ready = true;
    }

    // === 날짜 관련 유틸리티 ===

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

    validateRequiredReturnDate(returnDate, requiredReturnDate) {
        if (!returnDate) {
            return { valid: false, message: '귀국일을 입력해주세요.' };
        }

        if (!requiredReturnDate) {
            return { valid: true, message: '귀국일이 유효합니다.' };
        }

        try {
            const returnD = new Date(returnDate);
            const requiredD = new Date(requiredReturnDate);

            if (isNaN(returnD.getTime()) || isNaN(requiredD.getTime())) {
                return { valid: false, message: '날짜 형식이 올바르지 않습니다.' };
            }

            if (returnD > requiredD) {
                const formattedRequired = this.formatDate(requiredReturnDate);
                return { 
                    valid: false, 
                    message: `귀국일은 ${formattedRequired} 이전이어야 합니다.`,
                    code: 'REQUIRED_RETURN_DATE_EXCEEDED'
                };
            }

            if (returnD.getTime() === requiredD.getTime()) {
                const formattedRequired = this.formatDate(requiredReturnDate);
                return { 
                    valid: true, 
                    message: `귀국일이 필수 완료일(${formattedRequired})과 동일합니다.`,
                    warning: '가능한 여유를 두고 일정을 계획하시기 바랍니다.'
                };
            }

            const daysDiff = Math.ceil((requiredD - returnD) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 7) {
                const formattedRequired = this.formatDate(requiredReturnDate);
                return { 
                    valid: true, 
                    message: '귀국일이 유효합니다.',
                    warning: `필수 완료일(${formattedRequired})까지 ${daysDiff}일 남았습니다.`
                };
            }

            return { valid: true, message: '귀국일이 유효합니다.' };

        } catch (error) {
            return { valid: false, message: '날짜 검증 중 오류가 발생했습니다.' };
        }
    }

    // 🚨 수정: 로그 출력 최소화
    validateAllDates(dates) {
        const { 
            departureDate, 
            returnDate, 
            actualArrivalDate, 
            actualWorkEndDate,
            requiredReturnDate
        } = dates;
        
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            activityDays: 0,
            requiredReturnValidation: null
        };

        try {
            // 1. 기본 날짜 검증
            const basicValidation = this.validateDates(departureDate, returnDate);
            if (!basicValidation.valid) {
                validation.errors.push(basicValidation.message);
                validation.valid = false;
            }

            // 2. 귀국 필수 완료일 검증
            if (returnDate && requiredReturnDate) {
                const requiredValidation = this.validateRequiredReturnDate(returnDate, requiredReturnDate);
                validation.requiredReturnValidation = requiredValidation;
                
                if (!requiredValidation.valid) {
                    validation.errors.push(requiredValidation.message);
                    validation.valid = false;
                } else if (requiredValidation.warning) {
                    validation.warnings.push(requiredValidation.warning);
                }
            }

            // 3. 순수 항공권 날짜 관계 검증
            if (actualArrivalDate && actualWorkEndDate && departureDate && returnDate) {
                const flightDateValidation = this.validateFlightDatesOnly(
                    departureDate, actualArrivalDate, actualWorkEndDate, returnDate, requiredReturnDate
                );
                
                if (!flightDateValidation.valid) {
                    validation.errors.push(...flightDateValidation.errors);
                    validation.valid = false;
                }
            }

            // 4. 활동일 계산
            if (actualArrivalDate && actualWorkEndDate) {
                validation.activityDays = this.calculateActivityDays(actualArrivalDate, actualWorkEndDate);
            }

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다.');
            validation.valid = false;
        }

        // 🚨 수정: 로그 제거
        return validation;
    }

    // 🚨 수정: 로그 출력 최소화
    validateFlightDatesOnly(departureDate, arrivalDate, workEndDate, returnDate, requiredReturnDate = null) {
        const validation = {
            valid: true,
            errors: []
        };

        try {
            const departure = new Date(departureDate);
            const arrival = new Date(arrivalDate);
            const workEnd = new Date(workEndDate);
            const returnD = new Date(returnDate);

            // 출국일 범위 검증
            const arrivalMinus2 = new Date(arrival);
            arrivalMinus2.setDate(arrival.getDate() - 2);
            
            if (departure <= arrivalMinus2) {
                validation.errors.push('출국일은 현지 도착일 2일 전보다 늦어야 합니다');
                validation.valid = false;
            }
            
            if (departure >= arrival) {
                validation.errors.push('출국일은 현지 도착일보다 이전이어야 합니다');
                validation.valid = false;
            }

            // 활동기간 순서 검증
            if (workEnd <= arrival) {
                validation.errors.push('학당 근무 종료일은 현지 도착일 이후여야 합니다');
                validation.valid = false;
            }

            // 귀국일 기본 범위 검증
            if (returnD <= workEnd) {
                validation.errors.push('귀국일은 학당 근무 종료일보다 늦어야 합니다');
                validation.valid = false;
            }
            
            const workEndPlus10 = new Date(workEnd);
            workEndPlus10.setDate(workEnd.getDate() + 10);
            
            if (returnD >= workEndPlus10) {
                validation.errors.push('귀국일은 학당 근무 종료일 10일 후보다 이전이어야 합니다');
                validation.valid = false;
            }

            // 귀국일 마지노선 검증
            if (requiredReturnDate) {
                try {
                    const requiredD = new Date(requiredReturnDate);
                    if (!isNaN(requiredD.getTime()) && returnD > requiredD) {
                        const formattedRequired = this.formatDate(requiredReturnDate);
                        validation.errors.push(`귀국일은 ${formattedRequired} 이전이어야 합니다`);
                        validation.valid = false;
                    }
                } catch (dbDateError) {
                    // 에러 무시하고 계속 진행
                }
            }

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다');
            validation.valid = false;
        }

        return validation;
    }

    calculateDuration(departureDate, returnDate) {
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        return Math.ceil((returnD - departure) / (1000 * 60 * 60 * 24));
    }

    // 🚨 수정: 로그 출력 제거
    calculateTotalStayDuration(departureDate, returnDate) {
        if (!departureDate || !returnDate) return 0;
        
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        
        if (departure >= returnD) return 0;
        
        const totalDays = Math.ceil((returnD - departure) / (1000 * 60 * 60 * 24));
        return totalDays;
    }

    calculateActivityDays(arrivalDate, workEndDate) {
        if (!arrivalDate || !workEndDate) return 0;
        
        const arrival = new Date(arrivalDate);
        const workEnd = new Date(workEndDate);
        
        if (arrival >= workEnd) return 0;
        
        return Math.ceil((workEnd - arrival) / (1000 * 60 * 60 * 24));
    }

    validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate) {
        console.warn('⚠️ [Utils] validateActivityDates는 deprecated되었습니다.');
        return this.validateFlightDatesOnly(departureDate, arrivalDate, workEndDate, returnDate);
    }

    validateMinimumActivityDays(activityDays, requiredDays) {
        if (!requiredDays) {
            throw new Error('최소 요구일이 설정되지 않았습니다.');
        }

        const result = {
            valid: true,
            message: '',
            warning: null,
            usedRequiredDays: requiredDays,
            hardcodingRemoved: true
        };

        if (activityDays < requiredDays) {
            result.valid = false;
            result.message = `최소 ${requiredDays}일의 활동 기간이 필요합니다 (현재: ${activityDays}일)`;
        } else if (activityDays === requiredDays) {
            result.warning = `정확히 최소 요구일(${requiredDays}일)을 충족합니다`;
        } else if (activityDays < requiredDays + 30) {
            result.warning = `활동 기간이 최소 요구사항에 근접합니다 (${activityDays}일/${requiredDays}일)`;
        }

        return result;
    }

    validateMaximumActivityDays(activityDays, maximumDays) {
        if (!maximumDays) {
            throw new Error('최대 허용일이 설정되지 않았습니다.');
        }

        const result = {
            valid: true,
            message: '',
            warning: null,
            code: null,
            usedMaximumDays: maximumDays,
            hardcodingRemoved: true
        };

        if (activityDays > maximumDays) {
            result.valid = false;
            result.message = `최대 ${maximumDays}일을 초과할 수 없습니다 (현재: ${activityDays}일, 초과: ${activityDays - maximumDays}일)`;
            result.code = 'MAXIMUM_ACTIVITY_DAYS_EXCEEDED';
        } else if (activityDays === maximumDays) {
            result.warning = `정확히 최대 허용일(${maximumDays}일)에 도달했습니다`;
        } else if (activityDays > maximumDays - 10) {
            const remaining = maximumDays - activityDays;
            result.warning = `최대 허용일까지 ${remaining}일 남았습니다 (${activityDays}일/${maximumDays}일)`;
        }

        return result;
    }

    // 🚨 수정: 로그 출력 제거
    validateActivityDaysRange(activityDays, minimumDays, maximumDays) {
        if (!minimumDays || !maximumDays) {
            throw new Error('활동일 요구사항이 설정되지 않았습니다.');
        }

        const result = {
            valid: true,
            errors: [],
            warnings: [],
            minimumCheck: null,
            maximumCheck: null,
            inValidRange: false,
            usedRequirements: {
                minimumDays: minimumDays,
                maximumDays: maximumDays,
                hardcodingRemoved: true
            }
        };

        // 최소 활동일 검증
        const minValidation = this.validateMinimumActivityDays(activityDays, minimumDays);
        result.minimumCheck = minValidation;
        
        if (!minValidation.valid) {
            result.errors.push(minValidation.message);
            result.valid = false;
        } else if (minValidation.warning) {
            result.warnings.push(minValidation.warning);
        }

        // 최대 활동일 검증
        const maxValidation = this.validateMaximumActivityDays(activityDays, maximumDays);
        result.maximumCheck = maxValidation;
        
        if (!maxValidation.valid) {
            result.errors.push(maxValidation.message);
            result.valid = false;
        } else if (maxValidation.warning) {
            result.warnings.push(maxValidation.warning);
        }

        // 유효 범위 내 여부
        result.inValidRange = activityDays >= minimumDays && activityDays <= maximumDays;

        return result;
    }

    validateDispatchDuration(duration, expectedDuration) {
        const allowedRange = 7;
        
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
        
        return { valid: true, message: '' };
    }

    // === 귀국 필수 완료일 관련 유틸리티 ===

    calculateDaysUntilRequired(requiredReturnDate) {
        if (!requiredReturnDate) return null;
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const required = new Date(requiredReturnDate);
            
            return Math.ceil((required - today) / (1000 * 60 * 60 * 24));
        } catch (error) {
            return null;
        }
    }

    getRequiredReturnStatus(requiredReturnDate) {
        if (!requiredReturnDate) {
            return {
                status: 'none',
                message: '귀국 필수 완료일이 설정되지 않았습니다.',
                class: 'status-none',
                icon: 'calendar'
            };
        }

        const daysUntil = this.calculateDaysUntilRequired(requiredReturnDate);
        const formattedDate = this.formatDate(requiredReturnDate);

        if (daysUntil === null) {
            return {
                status: 'error',
                message: '날짜 형식 오류',
                class: 'status-error',
                icon: 'alert-circle'
            };
        }

        if (daysUntil < 0) {
            return {
                status: 'overdue',
                message: `귀국 필수 완료일이 ${Math.abs(daysUntil)}일 지났습니다. (${formattedDate})`,
                class: 'status-overdue',
                icon: 'alert-triangle'
            };
        }

        if (daysUntil === 0) {
            return {
                status: 'today',
                message: `오늘이 귀국 필수 완료일입니다. (${formattedDate})`,
                class: 'status-today',
                icon: 'calendar-x'
            };
        }

        if (daysUntil <= 7) {
            return {
                status: 'urgent',
                message: `귀국 필수 완료일까지 ${daysUntil}일 남았습니다. (${formattedDate})`,
                class: 'status-urgent',
                icon: 'clock'
            };
        }

        if (daysUntil <= 30) {
            return {
                status: 'warning',
                message: `귀국 필수 완료일까지 ${daysUntil}일 남았습니다. (${formattedDate})`,
                class: 'status-warning',
                icon: 'calendar'
            };
        }

        return {
            status: 'normal',
            message: `귀국 필수 완료일: ${formattedDate} (${daysUntil}일 후)`,
            class: 'status-normal',
            icon: 'calendar-check'
        };
    }

    // === 상태 관련 유틸리티 ===

    getStatusInfo(status) {
        const statusMap = {
            pending: { text: '승인 대기', class: 'status-pending', icon: 'clock' },
            approved: { text: '승인 완료', class: 'status-approved', icon: 'check-circle' },
            rejected: { text: '반려됨', class: 'status-rejected', icon: 'x-circle' },
            completed: { text: '완료됨', class: 'status-completed', icon: 'check-circle-2' }
        };
        
        return statusMap[status] || { text: status, class: 'status-unknown', icon: 'help-circle' };
    }

    getPurchaseTypeText(type) {
        const typeMap = {
            direct: '직접 구매',
            agency: '구매 대행'
        };
        return typeMap[type] || type;
    }

    // === 포맷팅 유틸리티 ===

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

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPassportNumber(passportNumber) {
        const passportRegex = /^[A-Z][0-9]{8}$/;
        return passportRegex.test(passportNumber);
    }

    validatePriceByCurrency(price, currency) {
        const numPrice = parseFloat(price);
        
        if (isNaN(numPrice) || numPrice <= 0) {
            return {
                valid: false,
                message: '올바른 가격을 입력해주세요.'
            };
        }

        const minPrices = {
            'KRW': 200000,
            'USD': 150,
            'CNY': 1000,
            'JPY': 20000,
            'EUR': 140
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

    showError(message) {
        console.error('🚨 [Utils오류]:', message);
        
        const errorElement = document.getElementById('errorMessage') || 
                           document.querySelector('.error-message') ||
                           document.querySelector('[data-error]');
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 10000);
        } else {
            alert('오류: ' + message);
        }
    }

    // 🚨 수정: 성공 메시지 로그 최소화
    showSuccess(message) {
        // 중요한 메시지만 표시
        if (message && (message.includes('중요') || message.includes('완료'))) {
            const successElement = document.getElementById('successMessage') || 
                                  document.querySelector('.success-message') ||
                                  document.querySelector('[data-success]');
            
            if (successElement) {
                successElement.textContent = message;
                successElement.style.display = 'block';
                
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 3000);
            }
        }
    }

    // === 파일 관련 유틸리티 ===

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

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

    // === 통합된 유틸리티 함수들 ===

    getDateValue(elementId) {
        const element = document.getElementById(elementId);
        if (element && element.value) {
            return new Date(element.value);
        }
        return null;
    }

    refreshIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

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

    // === 🚨 수정: 간소화된 상태 정보 ===
    getUtilsStatus() {
        return {
            version: this.version,
            ready: this.ready,
            loadedAt: new Date().toISOString(),
            methods: Object.getOwnPropertyNames(this.constructor.prototype)
                .filter(name => name !== 'constructor'),
            features: [
                'Date validation',
                'Activity period validation', 
                'Flight date validation',
                'Required return date validation',
                'File validation',
                'Price formatting',
                'Status utilities'
            ]
        };
    }

    // === Static 메서드들 ===

    static formatDate(dateString) {
        return new FlightRequestUtils().formatDate(dateString);
    }

    static formatDateTime(dateTimeString) {
        return new FlightRequestUtils().formatDateTime(dateTimeString);
    }

    static validateDates(departureDate, returnDate) {
        return new FlightRequestUtils().validateDates(departureDate, returnDate);
    }

    static validateAllDates(dates) {
        return new FlightRequestUtils().validateAllDates(dates);
    }

    static calculateActivityDays(arrivalDate, workEndDate) {
        return new FlightRequestUtils().calculateActivityDays(arrivalDate, workEndDate);
    }

    static calculateTotalStayDuration(departureDate, returnDate) {
        return new FlightRequestUtils().calculateTotalStayDuration(departureDate, returnDate);
    }

    static validateFlightDatesOnly(departureDate, arrivalDate, workEndDate, returnDate, requiredReturnDate = null) {
        return new FlightRequestUtils().validateFlightDatesOnly(departureDate, arrivalDate, workEndDate, returnDate, requiredReturnDate);
    }

    static validateMinimumActivityDays(activityDays, requiredDays) {
        if (!requiredDays) {
            throw new Error('최소 요구일이 설정되지 않았습니다.');
        }
        return new FlightRequestUtils().validateMinimumActivityDays(activityDays, requiredDays);
    }

    static validateMaximumActivityDays(activityDays, maximumDays) {
        if (!maximumDays) {
            throw new Error('최대 허용일이 설정되지 않았습니다.');
        }
        return new FlightRequestUtils().validateMaximumActivityDays(activityDays, maximumDays);
    }

    static validateActivityDaysRange(activityDays, minimumDays, maximumDays) {
        if (!minimumDays || !maximumDays) {
            throw new Error('활동일 요구사항이 설정되지 않았습니다.');
        }
        return new FlightRequestUtils().validateActivityDaysRange(activityDays, minimumDays, maximumDays);
    }

    static validateDispatchDuration(duration, expectedDuration) {
        return new FlightRequestUtils().validateDispatchDuration(duration, expectedDuration);
    }

    static validateRequiredReturnDate(returnDate, requiredReturnDate) {
        return new FlightRequestUtils().validateRequiredReturnDate(returnDate, requiredReturnDate);
    }

    static calculateDaysUntilRequired(requiredReturnDate) {
        return new FlightRequestUtils().calculateDaysUntilRequired(requiredReturnDate);
    }

    static getRequiredReturnStatus(requiredReturnDate) {
        return new FlightRequestUtils().getRequiredReturnStatus(requiredReturnDate);
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

// 전역 스코프에 노출
window.FlightRequestUtils = FlightRequestUtils;

// 인스턴스 생성 및 전역 변수 설정
window.flightRequestUtils = new FlightRequestUtils();

// 🚨 수정: 간소화된 초기화 완료 신호
window.utilsReady = true;

console.log('✅ FlightRequestUtils v8.2.9 로드 완료 - 무한루프 해결 (로그 최소화)');
console.log('🚨 v8.2.9 무한루프 해결사항:', {
    logMinimization: 'console.log 출력 대폭 최소화',
    performanceOptimization: '불필요한 상세 로그 제거',
    statusSimplification: 'getUtilsStatus() 메서드 간소화',
    initializationStreamline: '초기화 신호 간소화',
    memoryOptimization: '메모리 사용량 최적화'
});