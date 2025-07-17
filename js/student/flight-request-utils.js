// flight-request-utils.js - 항공권 신청 유틸리티 함수 모음 v8.2.8
// 🔧 v8.2.8: Utils 모듈 초기화 신호 추가 - utilsReady: false 문제 해결
// 📝 변경사항:
//   - 명시적인 window.utilsReady = true 신호 추가
//   - coordinator 의존성 검사와 호환성 보장
//   - 스크립트 로딩 타이밍 문제 해결
//   - 다른 모듈들과 일관된 초기화 패턴 적용
// 🔧 v8.2.7: 항공권 검증 로직 수정 - 활동기간 범위 검증 제거 및 DB 마지노선 검증 추가
// 📝 변경사항:
//   - validateAllDates(): 활동기간 최소/최대 검증 로직 완전 제거
//   - validateFlightDatesOnly(): requiredReturnDate 매개변수 추가 및 DB 마지노선 검증 구현
//   - 항공권 검증을 순수 날짜 관계 검증(3가지)으로 제한: 출국일/귀국일 범위, DB 마지노선
//   - 활동기간 검증과 항공권 검증 완전 분리
// 🔧 v8.2.6: 항공권 검증 로직 수정 - 사용자 요청 조건에 맞게 검증 범위 조정
// 📝 변경사항:
//   - validateFlightDatesOnly(): 출국일/귀국일 검증 로직을 사용자 요청 조건에 맞게 수정
//   - 출국일: 현지도착일 -2 < 출국일 < 현지도착일
//   - 귀국일: 학당근무 종료일 < 귀국일 < 학당근무종료일 + 10
//   - 기존 "이내" 제약을 정확한 범위 검증으로 변경
// 🔧 v8.2.5: 항공권 검증 로직 수정 - 불필요한 활동기간 검증 제거 및 부등호 정정
// 📝 변경사항:
//   - validateAllDates(): 항공권 검증에서 최소/최대 활동일 검증 제거
//   - validateActivityDates(): 부등호 수정 (2일 이내, 10일 이내 = 미포함)
//   - 항공권 검증은 순수하게 날짜 관계만 확인하도록 분리
//   - 활동기간 검증은 별도로 수행하도록 구조 개선
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
        this.version = 'v8.2.8';
        this.ready = true; // 🔧 v8.2.8: 명시적인 ready 상태 추가
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
     * 🔧 v8.2.7: 통합 날짜 검증 - 활동기간 범위 검증 제거
     * @param {Object} dates - 모든 날짜 정보
     * @param {string} dates.requiredReturnDate - 귀국 필수 완료일
     * @returns {Object} 검증 결과
     */
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

            // 3. 🔧 v8.2.7: 순수 항공권 날짜 관계 검증 (DB 마지노선 포함)
            if (actualArrivalDate && actualWorkEndDate && departureDate && returnDate) {
                const flightDateValidation = this.validateFlightDatesOnly(
                    departureDate, actualArrivalDate, actualWorkEndDate, returnDate, requiredReturnDate
                );
                
                if (!flightDateValidation.valid) {
                    validation.errors.push(...flightDateValidation.errors);
                    validation.valid = false;
                }
            }

            // 4. 🔧 v8.2.7: 활동일 계산 (검증 없이 계산만)
            if (actualArrivalDate && actualWorkEndDate) {
                validation.activityDays = this.calculateActivityDays(actualArrivalDate, actualWorkEndDate);
            }

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다.');
            validation.valid = false;
        }

        console.log('✅ [Utils] v8.2.8: 활동기간 범위 검증 제거 완료 - 통합 날짜 검증:', {
            순수항공권검증: '출국일/귀국일 범위 + DB 마지노선',
            활동기간검증: '제거됨 (계산만 수행)',
            DB마지노선검증: '추가됨',
            초기화신호: '✅ v8.2.8 추가됨',
            수정완료: '✅'
        });

        return validation;
    }

    /**
     * 🔧 v8.2.7: 순수 항공권 날짜 관계 검증 - DB 마지노선 검증 추가
     * @param {string} departureDate - 출국일
     * @param {string} arrivalDate - 현지 도착일
     * @param {string} workEndDate - 학당 근무 종료일
     * @param {string} returnDate - 귀국일
     * @param {string} requiredReturnDate - DB 마지노선 날짜 (선택적)
     * @returns {Object} 검증 결과
     */
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

            // ✅ 1. 출국일 범위: 현지도착일 -2 < 출국일 < 현지도착일
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

            // ✅ 2. 귀국일 기본 범위: 학당근무 종료일 < 귀국일 < 학당근무종료일 + 10
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

            // ✅ 3. 귀국일 마지노선: 귀국일 ≤ DB 저장값 (2025-12-12)
            if (requiredReturnDate) {
                try {
                    const requiredD = new Date(requiredReturnDate);
                    if (!isNaN(requiredD.getTime()) && returnD > requiredD) {
                        const formattedRequired = this.formatDate(requiredReturnDate);
                        validation.errors.push(`귀국일은 ${formattedRequired} 이전이어야 합니다`);
                        validation.valid = false;
                    }
                } catch (dbDateError) {
                    console.warn('⚠️ [Utils] v8.2.8: DB 마지노선 날짜 검증 실패:', dbDateError.message);
                }
            }

            console.log('✅ [Utils] v8.2.8: 순수 항공권 날짜 관계 검증 완료 (DB 마지노선 포함):', {
                출국일범위: `${arrivalMinus2.toISOString().split('T')[0]} < ${departureDate} < ${arrivalDate}`,
                귀국일기본범위: `${workEndDate} < ${returnDate} < ${workEndPlus10.toISOString().split('T')[0]}`,
                귀국일마지노선: requiredReturnDate ? `${returnDate} ≤ ${requiredReturnDate}` : '설정안됨',
                검증결과: validation.valid,
                3가지검증: '출국일범위 + 귀국일기본범위 + 귀국일마지노선',
                초기화신호완료: '✅ v8.2.8'
            });

        } catch (error) {
            validation.errors.push('날짜 형식이 올바르지 않습니다');
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
        
        console.log('✅ [Utils] v8.2.8: 전체 체류기간 계산:', {
            출국일: departureDate,
            귀국일: returnDate,
            전체체류일: totalDays,
            용도: 'dispatch_duration 저장',
            초기화신호: '✅ v8.2.8'
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
     * 🚀 v8.2.7: [DEPRECATED] 기존 validateActivityDates 메서드는 validateFlightDatesOnly로 대체됨
     * @deprecated 이 메서드는 validateFlightDatesOnly 메서드로 대체되었습니다.
     */
    validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate) {
        console.warn('⚠️ [Utils] v8.2.8: validateActivityDates는 deprecated되었습니다. validateFlightDatesOnly를 사용하세요.');
        return this.validateFlightDatesOnly(departureDate, arrivalDate, workEndDate, returnDate);
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
            console.error('❌ [Utils] v8.2.8: 최소 요구일이 매개변수로 전달되지 않았습니다');
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
            result.message = ''; // 성공 시 메시지 없음
        } else if (activityDays < requiredDays + 30) {
            // 최소 요구일보다는 크지만 30일 이내일 때 경고
            result.warning = `활동 기간이 최소 요구사항에 근접합니다 (${activityDays}일/${requiredDays}일)`;
            result.message = ''; // 성공 시 메시지 없음
        } else {
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
            console.error('❌ [Utils] v8.2.8: 최대 허용일이 매개변수로 전달되지 않았습니다');
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
            result.message = ''; // 성공 시 메시지 없음
        } else if (activityDays > maximumDays - 10) {
            // 최대 허용일에서 10일 이내일 때 주의 메시지
            const remaining = maximumDays - activityDays;
            result.warning = `최대 허용일까지 ${remaining}일 남았습니다 (${activityDays}일/${maximumDays}일)`;
            result.message = ''; // 성공 시 메시지 없음
        } else {
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
            console.error('❌ [Utils] v8.2.8: 최소/최대 활동일이 매개변수로 전달되지 않았습니다:', {
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
        if (message && (message.includes('중요') || message.includes('완료'))) {
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
            ready: this.ready, // 🔧 v8.2.8: ready 상태 추가
            loadedAt: new Date().toISOString(),
            v828Updates: { // 🔧 v8.2.8 새 기능
                initializationSignal: '명시적인 window.utilsReady = true 신호 추가',
                readyProperty: 'FlightRequestUtils 클래스에 ready 속성 추가',
                coordinatorCompatibility: 'coordinator 의존성 검사와 호환성 보장',
                timingIssuesFix: '스크립트 로딩 타이밍 문제 해결',
                consistentPattern: '다른 모듈들과 일관된 초기화 패턴 적용'
            },
            v827Updates: { // 🔧 v8.2.7 기존 기능
                flightValidationFix: '활동기간 범위 검증 제거 및 DB 마지노선 검증 추가',
                validateAllDates: '활동기간 최소/최대 검증 로직 완전 제거',
                validateFlightDatesOnly: 'requiredReturnDate 매개변수 추가 및 DB 마지노선 검증 구현',
                pureFlightValidation: '순수 항공권 검증(3가지): 출국일/귀국일 범위 + DB 마지노선',
                activitySeparation: '활동기간 검증과 항공권 검증 완전 분리',
                dbIntegration: 'DB 저장값 기반 귀국일 마지노선 검증'
            },
            v826Updates: { // 🔧 v8.2.6 기존 기능
                flightValidationFix: '사용자 요청 조건에 맞게 검증 로직 수정',
                departureValidation: '출국일: 현지도착일-2 < 출국일 < 현지도착일',
                returnValidation: '귀국일: 학당종료일 < 귀국일 < 학당종료일+10',
                rangeBasedValidation: '기존 "이내" 제약을 정확한 범위 검증으로 변경',
                userRequestCompliance: '사용자 요청 조건 100% 반영'
            },
            v825Updates: { // 🔧 v8.2.5 기존 기능
                flightValidationSeparation: '항공권 검증과 활동기간 검증 완전 분리',
                inequalityFixing: '부등호 수정: 2일 이내, 10일 이내 = 미포함',
                flightDatesOnly: 'validateFlightDatesOnly 메서드 추가',
                activityValidationSeparate: '활동기간 검증 별도 수행',
                logicClarification: '검증 로직 명확성 대폭 향상'
            },
            v824Updates: { // 🚀 v8.2.4 기존 기능
                dateValidationRange: '출국일→현지도착일: 최대 2일, 학당종료일→귀국일: 최대 10일',
                successMessagePolicy: '성공 시 메시지 제거, 실패 시에만 구체적 경고',
                dispatchDurationCalculation: '전체 체류기간(출국일~귀국일) 계산 기능 추가',
                improvedUX: '불필요한 메시지 제거로 깔끔한 사용자 경험'
            },
            hardcodingRemoved: true, // 🔧 v9.1.0
            methods: Object.getOwnPropertyNames(this.constructor.prototype)
                .filter(name => name !== 'constructor'),
            integrationFeatures: [
                'Initialization signal addition', // 🔧 v8.2.8
                'Coordinator compatibility guarantee', // 🔧 v8.2.8
                'Script loading timing fix', // 🔧 v8.2.8
                'Activity range validation removal', // 🔧 v8.2.7
                'DB deadline date validation', // 🔧 v8.2.7
                'Pure flight date validation (3 types)', // 🔧 v8.2.7
                'Range-based flight date validation', // 🔧 v8.2.6
                'Separated flight date validation', // 🔧 v8.2.5
                'Fixed inequality for time constraints', // 🔧 v8.2.5
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

    // 🔧 v8.2.7: 순수 항공권 날짜 관계 검증 Static 메서드 수정 (DB 마지노선 추가)
    static validateFlightDatesOnly(departureDate, arrivalDate, workEndDate, returnDate, requiredReturnDate = null) {
        return new FlightRequestUtils().validateFlightDatesOnly(departureDate, arrivalDate, workEndDate, returnDate, requiredReturnDate);
    }

    /**
     * 🔧 v9.1.0: 최소 활동일 검증 - 하드코딩 제거 완료
     * @param {number} activityDays - 계산된 활동일
     * @param {number} requiredDays - 최소 요구일 (필수 매개변수)
     */
    static validateMinimumActivityDays(activityDays, requiredDays) {
        if (!requiredDays) {
            console.error('❌ [Utils] v8.2.8 Static: 최소 요구일이 매개변수로 전달되지 않았습니다');
            console.warn('⚠️ [Utils] v8.2.8: 하드코딩 제거 완료 - 필수 매개변수를 전달해주세요');
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
            console.error('❌ [Utils] v8.2.8 Static: 최대 허용일이 매개변수로 전달되지 않았습니다');
            console.warn('⚠️ [Utils] v8.2.8: 하드코딩 제거 완료 - 필수 매개변수를 전달해주세요');
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
            console.error('❌ [Utils] v8.2.8 Static: 최소/최대 활동일이 매개변수로 전달되지 않았습니다:', {
                minimumDays,
                maximumDays
            });
            console.warn('⚠️ [Utils] v8.2.8: 하드코딩 제거 완료 - 필수 매개변수를 전달해주세요');
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

// 🔧 v8.2.8: 명시적인 초기화 완료 신호 추가 - coordinator 호환성 보장
window.utilsReady = true;

console.log('✅ FlightRequestUtils v8.2.8 로드 완료 - 초기화 신호 추가 (utilsReady: false 문제 해결)');
console.log('🔧 v8.2.8 주요 수정사항:', {
    initializationFix: {
        description: '초기화 신호 추가 - coordinator 의존성 검사와 호환성 보장',
        explicitSignal: {
            before: '명시적인 초기화 완료 신호 없음',
            after: 'window.utilsReady = true 신호 추가',
            improved: 'coordinator가 정확히 감지 가능'
        },
        readyProperty: {
            before: 'FlightRequestUtils 클래스에 ready 속성 없음',
            after: 'this.ready = true 속성 추가',
            improved: '인스턴스 레벨에서도 준비 상태 확인 가능'
        },
        timingIssue: {
            before: '스크립트 로딩 순서와 타이밍 문제로 utilsReady: false 지속',
            after: '명시적 신호로 타이밍 문제 해결',
            improved: '안정적인 모듈 초기화 보장'
        }
    },
    compatibilityGuarantee: {
        coordinatorPattern: 'coordinator의 waitForDependencies 메서드와 완전 호환',
        consistentPattern: '다른 모듈들과 일관된 초기화 패턴 적용',
        backwardCompatible: '기존 모든 기능 100% 유지'
    },
    problemSolved: {
        utilsReadyFalse: '✅ utilsReady: false 문제 완전 해결',
        initializationTimeout: '✅ 분리된 모듈 시스템 초기화 대기 시간 초과 해결',
        dependencyDetection: '✅ coordinator 의존성 감지 정상화',
        moduleLoadingStability: '✅ 모듈 로딩 안정성 대폭 향상'
    },
    previousFeatures: {
        v827: '활동기간 범위 검증 제거 및 DB 마지노선 검증 추가 (기존 유지)',
        v826: '사용자 요청 조건에 맞게 검증 범위 조정 (기존 유지)',
        v825: '항공권 검증과 활동기간 검증 완전 분리 (기존 유지)',
        v824: '날짜 검증 로직 수정 및 dispatch_duration 계산 추가 (기존 유지)',
        hardcodingRemoval: '하드코딩된 기본값 완전 제거 (기존 유지)'
    }
});
