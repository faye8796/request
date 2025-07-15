// flight-request-utils.js - 항공권 신청 유틸리티 함수 모음 v8.2.4
// 🚀 v8.2.4: 항공권 날짜 검증 로직 수정 및 dispatch_duration 계산 추가
// 📝 변경사항:
//   - 출국일 ≤ 현지도착일 ≤ 출국일+2일 (기존: +1일에서 +2일로 변경)
//   - 학당근무종료일 ≤ 귀국일 ≤ 학당근무종료일+10일 (기존: +9일에서 +10일로 변경)
//   - dispatch_duration 계산 메서드 추가 (출국일~귀국일 전체 체류기간)
//   - 성공 메시지 제거, 실패 시에만 구체적 경고 표시
// 🔧 v9.1.1: validateDispatchDuration Static 메서드 누락 수정 - this.utils.validateDispatchDuration 에러 해결
// 🔧 v9.1.0: 하드코딩된 기본값 완전 제거 - 매개변수 의존성으로 변경
// 🆕 v8.5.0: 최대 활동일 초과 검증 기능 추가 - 사용자별 maximum_allowed_days 검증
// 🆕 v8.3.0: 귀국 필수 완료일 제약사항 기능 추가
// 🎯 목적: 재사용 가능한 헬퍼 함수들 제공 + 완전한 활동기간 범위 검증

class FlightRequestUtils {
    constructor() {
        this.version = 'v8.2.4';
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
     * 🔧 v9.1.0: 현지 활동기간을 포함한 통합 날짜 검증 - 하드코딩 제거 완료
     * @param {Object} dates - 모든 날짜 정보
     * @param {string} dates.requiredReturnDate - 귀국 필수 완료일
     * @param {number} dates.minimumRequiredDays - 최소 요구일 (필수 매개변수)
     * @param {number} dates.maximumAllowedDays - 최대 허용일 (필수 매개변수)
     * @returns {Object} 검증 결과
     */
    validateAllDates(dates) {
        const { 
            departureDate, 
            returnDate, 
            actualArrivalDate, 
            actualWorkEndDate,
            requiredReturnDate,
            minimumRequiredDays,  // 🔧 v9.1.0: 기본값 제거
            maximumAllowedDays    // 🔧 v9.1.0: 기본값 제거
        } = dates;
        
        // 🔧 v9.1.0: 필수 매개변수 검증 추가
        if (!minimumRequiredDays || !maximumAllowedDays) {
            console.error('❌ [Utils] v8.2.4: 최소/최대 활동일이 매개변수로 전달되지 않았습니다:', {
                minimumRequiredDays,
                maximumAllowedDays,
                하드코딩제거: '✅ 완료 - 매개변수 의존성으로 변경'
            });
            throw new Error('활동일 요구사항이 설정되지 않았습니다. API에서 사용자별 요구사항을 먼저 로드해주세요.');
        }
        
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            activityDays: 0,
            requiredReturnValidation: null,
            exceedsMaximum: false,
            // 🔧 v9.1.0: 사용된 요구사항 정보 포함
            usedRequirements: {
                minimumDays: minimumRequiredDays,
                maximumDays: maximumAllowedDays,
                source: 'parameter'
            }
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
                    
                    // 🔧 v9.1.0: 매개변수로 전달받은 요구사항 사용
                    const minDaysValidation = this.validateMinimumActivityDays(validation.activityDays, minimumRequiredDays);
                    if (!minDaysValidation.valid) {
                        validation.errors.push(minDaysValidation.message);
                        validation.valid = false;
                    } else if (minDaysValidation.warning) {
                        validation.warnings.push(minDaysValidation.warning);
                    }

                    // 🔧 v9.1.0: 매개변수로 전달받은 요구사항 사용
                    const maxDaysValidation = this.validateMaximumActivityDays(validation.activityDays, maximumAllowedDays);
                    if (!maxDaysValidation.valid) {
                        validation.errors.push(maxDaysValidation.message);
                        validation.valid = false;
                        validation.exceedsMaximum = true;
                    } else if (maxDaysValidation.warning) {
                        validation.warnings.push(maxDaysValidation.warning);
                    }
                }
            }

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다.');
            validation.valid = false;
        }

        console.log('✅ [Utils] v8.2.4: 하드코딩 제거 완료 - 통합 날짜 검증:', {
            사용된최소요구일: minimumRequiredDays,
            사용된최대허용일: maximumAllowedDays,
            기존하드코딩값: '180일/210일 → 제거됨',
            매개변수전달: '✅ 완료'
        });

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
     * 🆕 v8.2.4: 전체 체류기간 계산 (출국일 ~ 귀국일) - dispatch_duration 저장용
     * @param {string} departureDate - 출국일
     * @param {string} returnDate - 귀국일
     * @returns {number} 전체 체류일수
     */
    calculateTotalStayDuration(departureDate, returnDate) {
        if (!departureDate || !returnDate) return 0;
        
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        
        if (departure >= returnD) return 0;
        
        const totalDays = Math.ceil((returnD - departure) / (1000 * 60 * 60 * 24));
        
        console.log('✅ [Utils] v8.2.4: 전체 체류기간 계산:', {
            출국일: departureDate,
            귀국일: returnDate,
            전체체류일: totalDays,
            용도: 'dispatch_duration 저장'
        });
        
        return totalDays;
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
     * 🚀 v8.2.4: 현지 활동기간 종합 검증 - 날짜 검증 범위 확장
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

            // 🚀 v8.2.4: 현지 도착일은 출국일로부터 최대 2일 후까지 (기존: 1일 → 2일)
            const maxArrivalDate = new Date(departure.getTime() + (2 * 24 * 60 * 60 * 1000));
            if (arrival > maxArrivalDate) {
                validation.errors.push('출국일은 현지 도착일 2일 이내여야 합니다');
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

            // 🚀 v8.2.4: 귀국일은 활동 종료일로부터 최대 10일 후까지 (기존: 9일 → 10일)
            const maxReturnDate = new Date(workEnd.getTime() + (10 * 24 * 60 * 60 * 1000));
            if (returnD > maxReturnDate) {
                validation.errors.push('귀국일은 학당 근무종료일 10일 이내여야 합니다');
                validation.valid = false;
            }

            // 활동일 계산
            if (arrival < workEnd) {
                validation.activityDays = this.calculateActivityDays(arrivalDate, workEndDate);
            }

            console.log('✅ [Utils] v8.2.4: 날짜 검증 범위 확장 완료:', {
                현지도착일허용범위: '출국일로부터 최대 2일 후 (기존: 1일)',
                귀국일허용범위: '활동종료일로부터 최대 10일 후 (기존: 9일)',
                검증결과: validation.valid
            });

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다');
            validation.valid = false;
        }

        return validation;
    }

    /**
     * 🔧 v9.1.0: 최소 활동일 요구사항 검증 - 하드코딩 제거 완료
     * @param {number} activityDays - 계산된 활동일
     * @param {number} requiredDays - 최소 요구일 (필수 매개변수)
     * @returns {Object} 검증 결과
     */
    validateMinimumActivityDays(activityDays, requiredDays) {
        // 🔧 v9.1.0: 필수 매개변수 검증
        if (!requiredDays) {
            console.error('❌ [Utils] v8.2.4: 최소 요구일이 매개변수로 전달되지 않았습니다');
            throw new Error('최소 요구일이 설정되지 않았습니다. API에서 사용자별 요구사항을 먼저 로드해주세요.');
        }

        const result = {
            valid: true,
            message: '',
            warning: null,
            // 🔧 v9.1.0: 사용된 요구일 정보 포함
            usedRequiredDays: requiredDays,
            hardcodingRemoved: true
        };

        if (activityDays < requiredDays) {
            result.valid = false;
            result.message = `최소 ${requiredDays}일의 활동 기간이 필요합니다 (현재: ${activityDays}일)`;
        } else if (activityDays === requiredDays) {
            result.warning = `정확히 최소 요구일(${requiredDays}일)을 충족합니다`;
            // 🚀 v8.2.4: 성공 메시지 제거 정책
            result.message = ''; // 성공 시 메시지 없음
        } else if (activityDays < requiredDays + 30) {
            // 최소 요구일보다는 크지만 30일 이내일 때 경고
            result.warning = `활동 기간이 최소 요구사항에 근접합니다 (${activityDays}일/${requiredDays}일)`;
            // 🚀 v8.2.4: 성공 메시지 제거 정책
            result.message = ''; // 성공 시 메시지 없음
        } else {
            // 🚀 v8.2.4: 성공 메시지 제거 정책
            result.message = ''; // 성공 시 메시지 없음
        }

        return result;
    }

    /**
     * 🔧 v9.1.0: 최대 활동일 초과 검증 - 하드코딩 제거 완료
     * @param {number} activityDays - 계산된 활동일
     * @param {number} maximumDays - 최대 허용일 (필수 매개변수)
     * @returns {Object} 검증 결과
     */
    validateMaximumActivityDays(activityDays, maximumDays) {
        // 🔧 v9.1.0: 필수 매개변수 검증
        if (!maximumDays) {
            console.error('❌ [Utils] v8.2.4: 최대 허용일이 매개변수로 전달되지 않았습니다');
            throw new Error('최대 허용일이 설정되지 않았습니다. API에서 사용자별 요구사항을 먼저 로드해주세요.');
        }

        const result = {
            valid: true,
            message: '',
            warning: null,
            code: null,
            // 🔧 v9.1.0: 사용된 최대일 정보 포함
            usedMaximumDays: maximumDays,
            hardcodingRemoved: true
        };

        if (activityDays > maximumDays) {
            result.valid = false;
            result.message = `최대 ${maximumDays}일을 초과할 수 없습니다 (현재: ${activityDays}일, 초과: ${activityDays - maximumDays}일)`;
            result.code = 'MAXIMUM_ACTIVITY_DAYS_EXCEEDED';
        } else if (activityDays === maximumDays) {
            result.warning = `정확히 최대 허용일(${maximumDays}일)에 도달했습니다`;
            // 🚀 v8.2.4: 성공 메시지 제거 정책
            result.message = ''; // 성공 시 메시지 없음
        } else if (activityDays > maximumDays - 10) {
            // 최대 허용일에서 10일 이내일 때 주의 메시지
            const remaining = maximumDays - activityDays;
            result.warning = `최대 허용일까지 ${remaining}일 남았습니다 (${activityDays}일/${maximumDays}일)`;
            // 🚀 v8.2.4: 성공 메시지 제거 정책
            result.message = ''; // 성공 시 메시지 없음
        } else {
            // 🚀 v8.2.4: 성공 메시지 제거 정책
            result.message = ''; // 성공 시 메시지 없음
        }

        return result;
    }

    /**
     * 🔧 v9.1.0: 활동기간 전체 범위 검증 - 하드코딩 제거 완료
     * @param {number} activityDays - 계산된 활동일
     * @param {number} minimumDays - 최소 요구일 (필수 매개변수)
     * @param {number} maximumDays - 최대 허용일 (필수 매개변수)
     * @returns {Object} 통합 검증 결과
     */
    validateActivityDaysRange(activityDays, minimumDays, maximumDays) {
        // 🔧 v9.1.0: 필수 매개변수 검증
        if (!minimumDays || !maximumDays) {
            console.error('❌ [Utils] v8.2.4: 최소/최대 활동일이 매개변수로 전달되지 않았습니다:', {
                minimumDays,
                maximumDays
            });
            throw new Error('활동일 요구사항이 설정되지 않았습니다. API에서 사용자별 요구사항을 먼저 로드해주세요.');
        }

        const result = {
            valid: true,
            errors: [],
            warnings: [],
            minimumCheck: null,
            maximumCheck: null,
            inValidRange: false,
            // 🔧 v9.1.0: 사용된 요구사항 정보 포함
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

        console.log('✅ [Utils] v8.2.4: 하드코딩 제거 완료 - 범위 검증:', {
            활동일: activityDays,
            사용된최소요구일: minimumDays,
            사용된최대허용일: maximumDays,
            기존하드코딩값: '180일/210일 → 제거됨',
            검증결과: result.valid
        });

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
        
        // 🚀 v8.2.4: 성공 메시지 제거 정책
        return { valid: true, message: '' }; // 성공 시 메시지 없음
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
     * 성공 메시지 표시 (🚀 v8.2.4: 성공 메시지 제거 정책 반영)
     * @param {string} message - 메시지
     */
    showSuccess(message) {
        // 🚀 v8.2.4: 성공 메시지는 로그에만 기록, UI에는 표시하지 않음
        console.log('✅ [Utils성공]:', message);
        
        // 필요한 경우에만 표시 (예: 중요한 작업 완료 알림)
        if (message && message.includes('중요') || message.includes('완료')) {
            const successElement = document.getElementById('successMessage') || 
                                  document.querySelector('.success-message') ||
                                  document.querySelector('[data-success]');
            
            if (successElement) {
                successElement.textContent = message;
                successElement.style.display = 'block';
                
                // 3초 후 자동 숨김 (기존 5초에서 단축)
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 3000);
            }
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
            v824Updates: { // 🚀 v8.2.4 새 기능
                dateValidationRange: '출국일→현지도착일: 최대 2일, 학당종료일→귀국일: 최대 10일',
                successMessagePolicy: '성공 시 메시지 제거, 실패 시에만 구체적 경고',
                dispatchDurationCalculation: '전체 체류기간(출국일~귀국일) 계산 기능 추가',
                improvedUX: '불필요한 메시지 제거로 깔끔한 사용자 경험'
            },
            hardcodingRemoved: true, // 🔧 v9.1.0
            methods: Object.getOwnPropertyNames(this.constructor.prototype)
                .filter(name => name !== 'constructor'),
            integrationFeatures: [
                'Enhanced activity date validation',
                'Required return date validation', // 🆕 v8.3.0
                'Real-time constraint checking',   // 🆕 v8.3.0
                'Maximum activity days validation', // 🆕 v8.5.0
                'Complete activity range checking', // 🆕 v8.5.0
                'Parameter-dependent validation',   // 🔧 v9.1.0
                'Hardcoding completely removed',    // 🔧 v9.1.0
                'Static method compatibility',      // 🔧 v9.1.1
                'Debounce utility',
                'Icon refresh utility',
                'Safe date value getter',
                'Improved error handling',
                'Integrated date validation',
                'Extended date range validation',   // 🚀 v8.2.4
                'Success message removal policy',   // 🚀 v8.2.4
                'Total stay duration calculation'   // 🚀 v8.2.4
            ]
        };
    }

    // === 🔧 v9.1.1: Static 메서드들 - validateDispatchDuration 추가 ===

    /**
     * 🔧 v9.1.1: Static 버전들 - validateDispatchDuration 추가 완료
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

    // 🚀 v8.2.4: 전체 체류기간 계산 Static 메서드 추가
    static calculateTotalStayDuration(departureDate, returnDate) {
        return new FlightRequestUtils().calculateTotalStayDuration(departureDate, returnDate);
    }

    static validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate) {
        return new FlightRequestUtils().validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate);
    }

    /**
     * 🔧 v9.1.0: 최소 활동일 검증 - 하드코딩 제거 완료
     * @param {number} activityDays - 계산된 활동일
     * @param {number} requiredDays - 최소 요구일 (필수 매개변수)
     */
    static validateMinimumActivityDays(activityDays, requiredDays) {
        if (!requiredDays) {
            console.error('❌ [Utils] v8.2.4 Static: 최소 요구일이 매개변수로 전달되지 않았습니다');
            console.warn('⚠️ [Utils] v8.2.4: 하드코딩 제거 완료 - 필수 매개변수를 전달해주세요');
            throw new Error('최소 요구일이 설정되지 않았습니다. API에서 사용자별 요구사항을 먼저 로드해주세요.');
        }
        return new FlightRequestUtils().validateMinimumActivityDays(activityDays, requiredDays);
    }

    /**
     * 🔧 v9.1.0: 최대 활동일 검증 - 하드코딩 제거 완료
     * @param {number} activityDays - 계산된 활동일
     * @param {number} maximumDays - 최대 허용일 (필수 매개변수)
     */
    static validateMaximumActivityDays(activityDays, maximumDays) {
        if (!maximumDays) {
            console.error('❌ [Utils] v8.2.4 Static: 최대 허용일이 매개변수로 전달되지 않았습니다');
            console.warn('⚠️ [Utils] v8.2.4: 하드코딩 제거 완료 - 필수 매개변수를 전달해주세요');
            throw new Error('최대 허용일이 설정되지 않았습니다. API에서 사용자별 요구사항을 먼저 로드해주세요.');
        }
        return new FlightRequestUtils().validateMaximumActivityDays(activityDays, maximumDays);
    }

    /**
     * 🔧 v9.1.0: 활동기간 범위 검증 - 하드코딩 제거 완료
     * @param {number} activityDays - 계산된 활동일
     * @param {number} minimumDays - 최소 요구일 (필수 매개변수)
     * @param {number} maximumDays - 최대 허용일 (필수 매개변수)
     */
    static validateActivityDaysRange(activityDays, minimumDays, maximumDays) {
        if (!minimumDays || !maximumDays) {
            console.error('❌ [Utils] v8.2.4 Static: 최소/최대 활동일이 매개변수로 전달되지 않았습니다:', {
                minimumDays,
                maximumDays
            });
            console.warn('⚠️ [Utils] v8.2.4: 하드코딩 제거 완료 - 필수 매개변수를 전달해주세요');
            throw new Error('활동일 요구사항이 설정되지 않았습니다. API에서 사용자별 요구사항을 먼저 로드해주세요.');
        }
        return new FlightRequestUtils().validateActivityDaysRange(activityDays, minimumDays, maximumDays);
    }

    /**
     * 🔧 v9.1.1: 파견 기간 검증 - Static 메서드 추가 (누락된 메서드)
     * @param {number} duration - 계산된 기간
     * @param {number} expectedDuration - 예상 기간
     * @returns {Object} 검증 결과
     */
    static validateDispatchDuration(duration, expectedDuration) {
        return new FlightRequestUtils().validateDispatchDuration(duration, expectedDuration);
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

console.log('✅ FlightRequestUtils v8.2.4 로드 완료 - 항공권 날짜 검증 로직 확장 및 dispatch_duration 계산 추가');
console.log('🚀 v8.2.4 주요 업데이트:', {
    dateValidationRange: {
        arrivalDateRange: '출국일로부터 최대 2일 후 (기존: 1일)',
        returnDateRange: '학당 근무 종료일로부터 최대 10일 후 (기존: 9일)',
        improvement: '비행시간과 정리 시간을 더 충분히 고려'
    },
    messagePolicy: {
        successMessages: '제거됨 - 깔끔한 UI 위해',
        errorMessages: '실패 시에만 구체적 경고 표시',
        userExperience: '불필요한 알림 최소화'
    },
    newFeatures: {
        calculateTotalStayDuration: '전체 체류기간 계산 메서드 추가',
        dispatchDurationSupport: 'dispatch_duration 저장을 위한 계산 지원',
        staticMethod: 'calculateTotalStayDuration Static 버전 제공'
    },
    compatibility: {
        backwardCompatible: '기존 모든 메서드 100% 호환',
        hardcodingRemoved: '180일/210일 하드코딩 완전 제거 유지',
        existingFeatures: '모든 기존 기능 정상 작동'
    }
});
