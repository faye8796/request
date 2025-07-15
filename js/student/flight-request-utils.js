// flight-request-utils.js - 항공권 신청 유틸리티 함수 모음 v8.5.0
// 🆕 v8.5.0: 최대 활동일 초과 검증 기능 추가 - 사용자별 maximum_allowed_days 검증
// 🆕 v8.3.0: 귀국 필수 완료일 제약사항 기능 추가
// 🎯 목적: 재사용 가능한 헬퍼 함수들 제공 + 완전한 활동기간 범위 검증

class FlightRequestUtils {
    constructor() {
        this.version = 'v8.5.0';
    }

    // === 날짜 관련 유틸리티 ===

    /**
     * 🔧 v8.2.2: 기본 날짜 유효성 검증 (UI에서 호출하는 메서드)
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
     * 🆕 v8.3.0: 귀국 필수 완료일 검증
     * @param {string} returnDate - 귀국일
     * @param {string} requiredReturnDate - 귀국 필수 완료일
     * @returns {Object} 검증 결과
     */
    validateRequiredReturnDate(returnDate, requiredReturnDate) {
        if (!returnDate) {
            return { valid: false, message: '귀국일을 입력해주세요.' };
        }

        if (!requiredReturnDate) {
            // 필수 귀국일이 설정되지 않은 경우 기본 검증만 수행
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

            // 필수 완료일과 같은 날이면 경고
            if (returnD.getTime() === requiredD.getTime()) {
                const formattedRequired = this.formatDate(requiredReturnDate);
                return { 
                    valid: true, 
                    message: `귀국일이 필수 완료일(${formattedRequired})과 동일합니다.`,
                    warning: '가능한 여유를 두고 일정을 계획하시기 바랍니다.'
                };
            }

            // 필수 완료일 7일 전 이내이면 주의 메시지
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

    /**
     * 🔄 v8.5.0: 현지 활동기간을 포함한 통합 날짜 검증 + 최대 활동일 검증 추가
     * @param {Object} dates - 모든 날짜 정보
     * @param {string} dates.requiredReturnDate - 귀국 필수 완료일
     * @param {number} dates.minimumRequiredDays - 최소 요구일 (기본: 180일)
     * @param {number} dates.maximumAllowedDays - 최대 허용일 (기본: 210일) 🆕
     * @returns {Object} 검증 결과
     */
    validateAllDates(dates) {
        const { 
            departureDate, 
            returnDate, 
            actualArrivalDate, 
            actualWorkEndDate,
            requiredReturnDate,
            minimumRequiredDays = 180,
            maximumAllowedDays = 210  // 🆕 v8.5.0
        } = dates;
        
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            activityDays: 0,
            requiredReturnValidation: null,
            exceedsMaximum: false  // 🆕 v8.5.0
        };

        try {
            // 1. 기본 날짜 검증 (출국일, 귀국일)
            const basicValidation = this.validateDates(departureDate, returnDate);
            if (!basicValidation.valid) {
                validation.errors.push(basicValidation.message);
                validation.valid = false;
            }

            // 2. 🆕 v8.3.0: 귀국 필수 완료일 검증 (최우선)
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

            // 3. 현지 활동기간이 입력된 경우에만 추가 검증
            if (actualArrivalDate && actualWorkEndDate) {
                const activityValidation = this.validateActivityDates(
                    departureDate, actualArrivalDate, actualWorkEndDate, returnDate
                );
                
                if (!activityValidation.valid) {
                    validation.errors.push(...activityValidation.errors);
                    validation.valid = false;
                } else {
                    validation.activityDays = activityValidation.activityDays;
                    
                    // 🔧 v8.5.0: 최소 활동일 검증
                    const minDaysValidation = this.validateMinimumActivityDays(validation.activityDays, minimumRequiredDays);
                    if (!minDaysValidation.valid) {
                        validation.errors.push(minDaysValidation.message);
                        validation.valid = false;
                    } else if (minDaysValidation.warning) {
                        validation.warnings.push(minDaysValidation.warning);
                    }

                    // 🆕 v8.5.0: 최대 활동일 검증 추가
                    const maxDaysValidation = this.validateMaximumActivityDays(validation.activityDays, maximumAllowedDays);
                    if (!maxDaysValidation.valid) {
                        validation.errors.push(maxDaysValidation.message);
                        validation.valid = false;
                        validation.exceedsMaximum = true;  // 최대 활동일 초과 플래그
                    } else if (maxDaysValidation.warning) {
                        validation.warnings.push(maxDaysValidation.warning);
                    }
                }
            }

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다.');
            validation.valid = false;
        }

        return validation;
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
     * 🔄 v8.2.2: 현지 활동기간 종합 검증 (개선된 버전)
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
     * 🆕 v8.5.0: 최대 활동일 초과 검증 - 핵심 기능 추가!
     * @param {number} activityDays - 계산된 활동일
     * @param {number} maximumDays - 최대 허용일 (기본: 210일)
     * @returns {Object} 검증 결과
     */
    validateMaximumActivityDays(activityDays, maximumDays = 210) {
        const result = {
            valid: true,
            message: '',
            warning: null,
            code: null
        };

        if (activityDays > maximumDays) {
            result.valid = false;
            result.message = `최대 ${maximumDays}일을 초과할 수 없습니다 (현재: ${activityDays}일, 초과: ${activityDays - maximumDays}일)`;
            result.code = 'MAXIMUM_ACTIVITY_DAYS_EXCEEDED';
        } else if (activityDays === maximumDays) {
            result.warning = `정확히 최대 허용일(${maximumDays}일)에 도달했습니다`;
            result.message = '활동 기간이 최대 허용 범위 내에 있습니다';
        } else if (activityDays > maximumDays - 10) {
            // 최대 허용일에서 10일 이내일 때 주의 메시지
            const remaining = maximumDays - activityDays;
            result.warning = `최대 허용일까지 ${remaining}일 남았습니다 (${activityDays}일/${maximumDays}일)`;
            result.message = '활동 기간이 최대 허용 범위 내에 있습니다';
        } else {
            result.message = `활동 기간이 허용 범위 내에 있습니다 (${activityDays}일/${maximumDays}일)`;
        }

        return result;
    }

    /**
     * 🆕 v8.5.0: 활동기간 전체 범위 검증 (최소/최대 통합)
     * @param {number} activityDays - 계산된 활동일
     * @param {number} minimumDays - 최소 요구일 (기본: 180일)
     * @param {number} maximumDays - 최대 허용일 (기본: 210일)
     * @returns {Object} 통합 검증 결과
     */
    validateActivityDaysRange(activityDays, minimumDays = 180, maximumDays = 210) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            minimumCheck: null,
            maximumCheck: null,
            inValidRange: false
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

    // === 🆕 v8.3.0: 귀국 필수 완료일 관련 유틸리티 ===

    /**
     * 귀국 필수 완료일까지 남은 일수 계산
     * @param {string} requiredReturnDate - 귀국 필수 완료일
     * @returns {number} 남은 일수 (음수면 이미 지남)
     */
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

    /**
     * 귀국 필수 완료일 상태 정보 반환
     * @param {string} requiredReturnDate - 귀국 필수 완료일
     * @returns {Object} 상태 정보
     */
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
                'Required return date validation', // 🆕 v8.3.0
                'Real-time constraint checking',   // 🆕 v8.3.0
                'Maximum activity days validation', // 🆕 v8.5.0
                'Complete activity range checking', // 🆕 v8.5.0
                'Debounce utility',
                'Icon refresh utility',
                'Safe date value getter',
                'Improved error handling',
                'Integrated date validation'
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

    static validateDates(departureDate, returnDate) {
        return new FlightRequestUtils().validateDates(departureDate, returnDate);
    }

    static validateAllDates(dates) {
        return new FlightRequestUtils().validateAllDates(dates);
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

    // 🆕 v8.5.0: 최대 활동일 검증 Static 메서드 추가
    static validateMaximumActivityDays(activityDays, maximumDays = 210) {
        return new FlightRequestUtils().validateMaximumActivityDays(activityDays, maximumDays);
    }

    static validateActivityDaysRange(activityDays, minimumDays = 180, maximumDays = 210) {
        return new FlightRequestUtils().validateActivityDaysRange(activityDays, minimumDays, maximumDays);
    }

    // 🆕 v8.3.0: 귀국 필수 완료일 관련 Static 메서드들
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

// 전역 스코프에 노출 (both 방식 지원)
window.FlightRequestUtils = FlightRequestUtils;

// 인스턴스 생성 및 전역 변수 설정
window.flightRequestUtils = new FlightRequestUtils();

console.log('✅ FlightRequestUtils v8.5.0 로드 완료 - 최대 활동일 초과 검증 기능 추가');
console.log('🆕 v8.5.0 새로운 기능:', {
    maximumActivityDaysValidation: '사용자별 maximum_allowed_days 검증',
    completeRangeChecking: '최소/최대 활동일 통합 검증',
    exceedsMaximumFlag: '최대 활동일 초과 감지',
    enhancedWarnings: '범위별 세분화된 경고 메시지',
    userSpecificLimits: '개인별 설정값 정확 반영'
});
