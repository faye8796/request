// flight-request-utils.js - 항공권 신청 유틸리티 함수

const FlightRequestUtils = {
    // 파견 기간 계산
    calculateDuration(departureDate, returnDate) {
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        const diffTime = Math.abs(returnD - departure);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // 출발일 포함
        return diffDays;
    },

    // 파견 기간 유효성 검사
    validateDispatchDuration(duration, allowedDuration) {
        const allowedDurations = [90, 100, 112, 120];
        
        if (!allowedDurations.includes(allowedDuration)) {
            return {
                valid: false,
                message: '파견 기간 설정이 잘못되었습니다.'
            };
        }

        const minDays = allowedDuration - 5;
        const maxDays = allowedDuration + 5;

        if (duration < minDays || duration > maxDays) {
            return {
                valid: false,
                message: `파견 기간은 ${minDays}일 ~ ${maxDays}일 사이여야 합니다. (현재: ${duration}일)`
            };
        }

        return { valid: true };
    },

    // 날짜 유효성 검사
    validateDates(departureDate, returnDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);

        if (departure < today) {
            return {
                valid: false,
                message: '출국일은 오늘 이후 날짜여야 합니다.'
            };
        }

        if (returnD <= departure) {
            return {
                valid: false,
                message: '귀국일은 출국일 이후여야 합니다.'
            };
        }

        return { valid: true };
    },

    // ===========================================
    // 🆕 v8.2.1: 현지 활동기간 관리 유틸리티 함수들
    // ===========================================

    /**
     * 현지 활동일 계산 (현지 도착일부터 학당 근무 종료일까지)
     * @param {string|Date} arrivalDate - 현지 도착일
     * @param {string|Date} workEndDate - 학당 근무 종료일
     * @returns {number} 활동일 수 (일 단위)
     */
    calculateActivityDays(arrivalDate, workEndDate) {
        if (!arrivalDate || !workEndDate) return 0;
        
        const arrival = new Date(arrivalDate);
        const workEnd = new Date(workEndDate);
        
        // 날짜 유효성 확인
        if (isNaN(arrival.getTime()) || isNaN(workEnd.getTime())) {
            return 0;
        }
        
        // 활동일 계산 (시작일과 종료일 모두 포함)
        const diffTime = workEnd.getTime() - arrival.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        return Math.max(0, diffDays); // 음수 방지
    },

    /**
     * 현지 활동기간 날짜들의 전체적인 유효성 검증
     * @param {string} departureDate - 출국일
     * @param {string} arrivalDate - 현지 도착일
     * @param {string} workEndDate - 학당 근무 종료일
     * @param {string} returnDate - 귀국일
     * @returns {Object} 검증 결과 객체
     */
    validateActivityDates(departureDate, arrivalDate, workEndDate, returnDate) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            activityDays: 0,
            status: 'valid' // 'valid', 'invalid', 'warning'
        };

        try {
            // 1. 필수 날짜 확인
            if (!departureDate || !arrivalDate || !workEndDate || !returnDate) {
                validation.valid = false;
                validation.status = 'invalid';
                validation.errors.push('모든 날짜를 입력해주세요');
                return validation;
            }

            // 2. 날짜 파싱
            const departure = new Date(departureDate);
            const arrival = new Date(arrivalDate);
            const workEnd = new Date(workEndDate);
            const returnD = new Date(returnDate);

            // 3. 날짜 유효성 확인
            const dates = [departure, arrival, workEnd, returnD];
            const dateNames = ['출국일', '현지 도착일', '학당 근무 종료일', '귀국일'];
            
            for (let i = 0; i < dates.length; i++) {
                if (isNaN(dates[i].getTime())) {
                    validation.valid = false;
                    validation.status = 'invalid';
                    validation.errors.push(`${dateNames[i]}이 올바르지 않습니다`);
                }
            }

            if (!validation.valid) return validation;

            // 4. 날짜 순서 검증
            if (arrival < departure) {
                validation.valid = false;
                validation.status = 'invalid';
                validation.errors.push('현지 도착일은 출국일 이후여야 합니다');
            }

            if (workEnd <= arrival) {
                validation.valid = false;
                validation.status = 'invalid';
                validation.errors.push('학당 근무 종료일은 현지 도착일 이후여야 합니다');
            }

            if (workEnd > returnD) {
                validation.valid = false;
                validation.status = 'invalid';
                validation.errors.push('학당 근무 종료일은 귀국일 이전이어야 합니다');
            }

            if (returnD <= departure) {
                validation.valid = false;
                validation.status = 'invalid';
                validation.errors.push('귀국일은 출국일 이후여야 합니다');
            }

            // 5. 활동일 계산
            if (validation.valid) {
                validation.activityDays = this.calculateActivityDays(arrivalDate, workEndDate);
                
                // 6. 활동일 최소 기준 경고
                if (validation.activityDays < 150) {
                    validation.warnings.push(`활동일이 ${validation.activityDays}일로 일반적인 기준(180일)보다 짧습니다`);
                    if (validation.status === 'valid') {
                        validation.status = 'warning';
                    }
                }
            }

            // 7. 날짜 간격 검증 (너무 긴 기간 경고)
            if (validation.valid && validation.activityDays > 365) {
                validation.warnings.push('활동 기간이 1년을 초과합니다. 확인해주세요');
                if (validation.status === 'valid') {
                    validation.status = 'warning';
                }
            }

            return validation;

        } catch (error) {
            console.error('📅 [Utils] 활동기간 날짜 검증 오류:', error);
            return {
                valid: false,
                errors: ['날짜 검증 중 오류가 발생했습니다'],
                warnings: [],
                activityDays: 0,
                status: 'invalid'
            };
        }
    },

    /**
     * 최소 활동일 요구사항 검증
     * @param {number} activityDays - 계산된 활동일
     * @param {number} requiredDays - 최소 요구 활동일 (기본값: 180일)
     * @returns {Object} 검증 결과
     */
    validateMinimumActivityDays(activityDays, requiredDays = 180) {
        const validation = {
            valid: true,
            message: '',
            status: 'valid' // 'valid', 'invalid', 'warning'
        };

        if (activityDays < requiredDays) {
            validation.valid = false;
            validation.status = 'invalid';
            validation.message = `최소 ${requiredDays}일의 활동 기간이 필요합니다 (현재: ${activityDays}일)`;
        } else if (activityDays === requiredDays) {
            validation.status = 'warning';
            validation.message = `정확히 최소 요구 활동일(${requiredDays}일)입니다`;
        } else {
            validation.message = `활동 기간이 요구사항을 충족합니다 (${activityDays}일 ≥ ${requiredDays}일)`;
        }

        return validation;
    },

    /**
     * 활동기간 포맷팅 (사용자 친화적 표시)
     * @param {number} days - 활동일 수
     * @returns {string} 포맷된 활동기간 문자열
     */
    formatActivityDuration(days) {
        if (!days || days <= 0) return '-';

        // 주 단위 계산
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;

        if (weeks === 0) {
            return `${days}일`;
        }

        if (remainingDays === 0) {
            return `${weeks}주 (${days}일)`;
        }

        return `${weeks}주 ${remainingDays}일 (${days}일)`;
    },

    /**
     * 활동기간 검증 메시지 생성
     * @param {Object} validation - validateActivityDates() 결과
     * @returns {Object} 메시지 정보
     */
    getActivityValidationMessage(validation) {
        const message = {
            text: '',
            type: validation.status, // 'valid', 'invalid', 'warning'
            icon: '',
            details: []
        };

        // 아이콘 설정
        switch (validation.status) {
            case 'valid':
                message.icon = 'check-circle';
                break;
            case 'warning':
                message.icon = 'alert-triangle';
                break;
            case 'invalid':
                message.icon = 'x-circle';
                break;
            default:
                message.icon = 'help-circle';
        }

        // 메인 메시지 생성
        if (validation.errors && validation.errors.length > 0) {
            message.text = validation.errors[0]; // 첫 번째 오류 메시지
            message.details = validation.errors.slice(1); // 나머지 오류들
        } else if (validation.warnings && validation.warnings.length > 0) {
            message.text = validation.warnings[0]; // 첫 번째 경고 메시지
            message.details = validation.warnings.slice(1); // 나머지 경고들
        } else if (validation.valid && validation.activityDays > 0) {
            message.text = `활동 기간이 요구사항을 충족합니다 (${this.formatActivityDuration(validation.activityDays)})`;
        } else {
            message.text = '활동 기간 정보를 입력해주세요';
            message.type = 'info';
            message.icon = 'info';
        }

        return message;
    },

    /**
     * 활동기간 전체 요약 정보 생성
     * @param {Object} dates - { departureDate, arrivalDate, workEndDate, returnDate }
     * @param {number} requiredDays - 최소 요구 활동일
     * @returns {Object} 요약 정보 객체
     */
    getActivityPeriodSummary(dates, requiredDays = 180) {
        const summary = {
            activityDays: 0,
            formattedDuration: '-',
            validation: null,
            minimumDaysValidation: null,
            isComplete: false,
            canSubmit: true
        };

        try {
            // 1. 전체 날짜 검증
            summary.validation = this.validateActivityDates(
                dates.departureDate,
                dates.arrivalDate, 
                dates.workEndDate,
                dates.returnDate
            );

            summary.activityDays = summary.validation.activityDays;
            summary.formattedDuration = this.formatActivityDuration(summary.activityDays);
            summary.isComplete = summary.validation.valid && summary.activityDays > 0;

            // 2. 최소 활동일 검증
            if (summary.isComplete) {
                summary.minimumDaysValidation = this.validateMinimumActivityDays(
                    summary.activityDays, 
                    requiredDays
                );
                
                // 3. 제출 가능 여부 결정
                summary.canSubmit = summary.validation.valid && summary.minimumDaysValidation.valid;
            } else {
                summary.canSubmit = false;
            }

            return summary;

        } catch (error) {
            console.error('📅 [Utils] 활동기간 요약 생성 오류:', error);
            return {
                ...summary,
                validation: {
                    valid: false,
                    errors: ['활동기간 계산 중 오류가 발생했습니다'],
                    warnings: [],
                    activityDays: 0,
                    status: 'invalid'
                },
                canSubmit: false
            };
        }
    },

    /**
     * 날짜 문자열을 사용자 친화적 형식으로 변환
     * @param {string} dateString - YYYY-MM-DD 형식의 날짜
     * @returns {string} 포맷된 날짜 문자열
     */
    formatDateForDisplay(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            // 요일 추가
            const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
            const weekday = weekdays[date.getDay()];
            
            return `${year}년 ${month}월 ${day}일 (${weekday})`;
        } catch (error) {
            console.error('📅 [Utils] 날짜 포맷팅 오류:', error);
            return dateString;
        }
    },

    /**
     * 활동기간 관련 디버그 정보 생성
     * @param {Object} dates - 날짜 객체들
     * @returns {Object} 디버그 정보
     */
    debugActivityPeriod(dates) {
        const debug = {
            timestamp: new Date().toISOString(),
            inputDates: dates,
            parsedDates: {},
            calculations: {},
            validations: {}
        };

        try {
            // 날짜 파싱 결과
            Object.keys(dates).forEach(key => {
                if (dates[key]) {
                    const parsed = new Date(dates[key]);
                    debug.parsedDates[key] = {
                        original: dates[key],
                        parsed: parsed.toISOString(),
                        valid: !isNaN(parsed.getTime())
                    };
                }
            });

            // 계산 결과
            debug.calculations.activityDays = this.calculateActivityDays(
                dates.arrivalDate, 
                dates.workEndDate
            );
            debug.calculations.totalTripDays = this.calculateDuration(
                dates.departureDate, 
                dates.returnDate
            );

            // 검증 결과
            debug.validations.dateValidation = this.validateActivityDates(
                dates.departureDate,
                dates.arrivalDate,
                dates.workEndDate,
                dates.returnDate
            );

            debug.validations.minimumDaysValidation = this.validateMinimumActivityDays(
                debug.calculations.activityDays
            );

            console.log('📅 [Utils] 활동기간 디버그 정보:', debug);
            return debug;

        } catch (error) {
            console.error('📅 [Utils] 디버그 정보 생성 오류:', error);
            debug.error = error.message;
            return debug;
        }
    },

    // ===========================================
    // 🆕 가격 정보 관련 유틸리티 함수들 (v8.6.0)
    // ===========================================

    // 가격 포맷팅 (통화별)
    formatPrice(price, currency = 'KRW') {
        if (!price || isNaN(price)) return '';
        
        const numPrice = parseFloat(price);
        const formatOptions = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        };

        // 통화별 특별 처리
        switch (currency.toUpperCase()) {
            case 'KRW':
                return `₩${numPrice.toLocaleString('ko-KR', formatOptions)}`;
            case 'USD':
                return `$${numPrice.toLocaleString('en-US', formatOptions)}`;
            case 'CNY':
                return `¥${numPrice.toLocaleString('zh-CN', formatOptions)}`;
            case 'JPY':
                return `¥${numPrice.toLocaleString('ja-JP', formatOptions)}`;
            case 'EUR':
                return `€${numPrice.toLocaleString('de-DE', formatOptions)}`;
            case 'THB':
                return `฿${numPrice.toLocaleString('th-TH', formatOptions)}`;
            case 'VND':
                return `₫${numPrice.toLocaleString('vi-VN', formatOptions)}`;
            case 'SGD':
                return `S$${numPrice.toLocaleString('en-SG', formatOptions)}`;
            case 'MYR':
                return `RM${numPrice.toLocaleString('ms-MY', formatOptions)}`;
            case 'PHP':
                return `₱${numPrice.toLocaleString('en-PH', formatOptions)}`;
            default:
                return `${numPrice.toLocaleString()} ${currency}`;
        }
    },

    // 가격 유효성 검증
    validatePrice(price) {
        if (!price) {
            return {
                valid: false,
                message: '항공료를 입력해주세요.'
            };
        }

        const numPrice = parseFloat(price);
        
        if (isNaN(numPrice)) {
            return {
                valid: false,
                message: '올바른 숫자를 입력해주세요.'
            };
        }

        if (numPrice < 0) {
            return {
                valid: false,
                message: '항공료는 0 이상이어야 합니다.'
            };
        }

        if (numPrice > 50000) {
            return {
                valid: false,
                message: '항공료가 너무 높습니다. (최대 50,000)'
            };
        }

        return { valid: true };
    },

    // 통화 코드 유효성 검증
    validateCurrency(currency) {
        const supportedCurrencies = this.getSupportedCurrencies();
        const currencyCode = currency.toUpperCase();
        
        if (!supportedCurrencies.includes(currencyCode)) {
            return {
                valid: false,
                message: `지원하지 않는 통화입니다. 지원 통화: ${supportedCurrencies.join(', ')}`
            };
        }

        return { valid: true };
    },

    // 가격 출처 검증
    validatePriceSource(source) {
        if (!source || source.trim().length === 0) {
            return {
                valid: false,
                message: '가격 출처를 입력해주세요.'
            };
        }

        if (source.length > 200) {
            return {
                valid: false,
                message: '가격 출처는 200자를 초과할 수 없습니다.'
            };
        }

        return { valid: true };
    },

    // 지원 통화 목록
    getSupportedCurrencies() {
        return [
            'KRW', // 한국 원
            'USD', // 미국 달러
            'CNY', // 중국 위안
            'JPY', // 일본 엔
            'EUR', // 유로
            'THB', // 태국 바트
            'VND', // 베트남 동
            'SGD', // 싱가포르 달러
            'MYR', // 말레이시아 링깃
            'PHP', // 필리핀 페소
            'IDR', // 인도네시아 루피아
            'INR', // 인도 루피
            'AUD', // 호주 달러
            'GBP', // 영국 파운드
            'CAD'  // 캐나다 달러
        ];
    },

    // 통화 기호 반환
    getCurrencySymbol(currency) {
        const symbols = {
            'KRW': '₩',
            'USD': '$',
            'CNY': '¥',
            'JPY': '¥',
            'EUR': '€',
            'THB': '฿',
            'VND': '₫',
            'SGD': 'S$',
            'MYR': 'RM',
            'PHP': '₱',
            'IDR': 'Rp',
            'INR': '₹',
            'AUD': 'A$',
            'GBP': '£',
            'CAD': 'C$'
        };
        return symbols[currency.toUpperCase()] || currency;
    },

    // 국가별 예상 가격 범위 (USD 기준)
    getPriceRangeByCountry(country) {
        const ranges = {
            // 동아시아
            '중국': { min: 200, max: 800, currency: 'CNY', note: '지역에 따라 차이' },
            '일본': { min: 300, max: 1200, currency: 'JPY', note: '시기에 따라 변동' },
            '몽골': { min: 400, max: 1000, currency: 'USD', note: '항공편 제한적' },
            
            // 동남아시아
            '태국': { min: 300, max: 900, currency: 'THB', note: '방콕 기준' },
            '베트남': { min: 250, max: 800, currency: 'VND', note: '하노이/호치민 기준' },
            '싱가포르': { min: 400, max: 1000, currency: 'SGD', note: '허브공항' },
            '말레이시아': { min: 300, max: 800, currency: 'MYR', note: '쿠알라룸푸르 기준' },
            '필리핀': { min: 350, max: 900, currency: 'PHP', note: '마닐라 기준' },
            '인도네시아': { min: 400, max: 1100, currency: 'IDR', note: '자카르타 기준' },
            '캄보디아': { min: 400, max: 1000, currency: 'USD', note: '프놈펜 기준' },
            '라오스': { min: 500, max: 1200, currency: 'USD', note: '비엔티안 기준' },
            '미얀마': { min: 600, max: 1400, currency: 'USD', note: '양곤 기준' },
            
            // 남아시아
            '인도': { min: 400, max: 1200, currency: 'INR', note: '델리/뭄바이 기준' },
            '스리랑카': { min: 500, max: 1300, currency: 'USD', note: '콜롬보 기준' },
            '방글라데시': { min: 600, max: 1400, currency: 'USD', note: '다카 기준' },
            
            // 중앙아시아
            '우즈베키스탄': { min: 600, max: 1500, currency: 'USD', note: '타슈켄트 기준' },
            '카자흐스탄': { min: 500, max: 1300, currency: 'USD', note: '알마티 기준' },
            '키르기스스탄': { min: 700, max: 1600, currency: 'USD', note: '비슈케크 기준' },
            
            // 기타
            '호주': { min: 800, max: 2000, currency: 'AUD', note: '시드니/멜버른 기준' },
            '뉴질랜드': { min: 1000, max: 2500, currency: 'USD', note: '오클랜드 기준' }
        };

        return ranges[country] || { min: 300, max: 1500, currency: 'USD', note: '예상 범위' };
    },

    // 가격 범위 검증
    validatePriceRange(price, currency, targetCountry) {
        const range = this.getPriceRangeByCountry(targetCountry);
        const numPrice = parseFloat(price);
        
        // USD로 변환하여 대략적인 범위 체크 (간단한 환율 적용)
        let priceInUSD = numPrice;
        switch (currency.toUpperCase()) {
            case 'KRW':
                priceInUSD = numPrice / 1300; // 대략적인 환율
                break;
            case 'CNY':
                priceInUSD = numPrice / 7;
                break;
            case 'JPY':
                priceInUSD = numPrice / 150;
                break;
            case 'EUR':
                priceInUSD = numPrice * 1.1;
                break;
            case 'THB':
                priceInUSD = numPrice / 35;
                break;
            case 'VND':
                priceInUSD = numPrice / 24000;
                break;
            case 'SGD':
                priceInUSD = numPrice / 1.35;
                break;
        }

        if (priceInUSD < range.min * 0.5) {
            return {
                valid: false,
                message: `가격이 예상보다 너무 낮습니다. ${targetCountry} 예상 범위: ${this.formatPrice(range.min, range.currency)} ~ ${this.formatPrice(range.max, range.currency)}`
            };
        }

        if (priceInUSD > range.max * 2) {
            return {
                valid: false,
                message: `가격이 예상보다 너무 높습니다. ${targetCountry} 예상 범위: ${this.formatPrice(range.min, range.currency)} ~ ${this.formatPrice(range.max, range.currency)}`
            };
        }

        return { 
            valid: true,
            range: range
        };
    },

    // 가격 포맷팅 + 검증 통합
    formatPriceWithValidation(price, currency) {
        const validation = this.validatePrice(price);
        if (!validation.valid) {
            return { error: validation.message };
        }

        const currencyValidation = this.validateCurrency(currency);
        if (!currencyValidation.valid) {
            return { error: currencyValidation.message };
        }

        return {
            formatted: this.formatPrice(price, currency),
            valid: true
        };
    },

    // ===========================================
    // 기존 유틸리티 함수들
    // ===========================================

    // 상태에 따른 상태 텍스트 및 클래스
    getStatusInfo(status) {
        const statusMap = {
            'pending': { text: '대기중', class: 'status-pending' },
            'approved': { text: '승인됨', class: 'status-approved' },
            'rejected': { text: '반려됨', class: 'status-rejected' },
            'completed': { text: '완료', class: 'status-completed' }
        };
        return statusMap[status] || { text: '알 수 없음', class: 'status-unknown' };
    },

    // 구매 방식 텍스트
    getPurchaseTypeText(type) {
        return type === 'direct' ? '직접 구매' : '구매 대행';
    },

    // 날짜 포맷팅
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}년 ${month}월 ${day}일`;
    },

    // 날짜와 시간 포맷팅
    formatDateTime(datetime) {
        if (!datetime) return '';
        const d = new Date(datetime);
        const date = this.formatDate(datetime);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${date} ${hours}:${minutes}`;
    },

    // 공항 코드 추출
    extractAirportCode(airportString) {
        const match = airportString.match(/\(([A-Z]{3})\)/i);
        return match ? match[1].toUpperCase() : airportString;
    },

    // 파일 크기 포맷팅
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // 에러 메시지 표시
    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
    },

    // 성공 메시지 표시
    showSuccess(message) {
        const successEl = document.getElementById('successMessage');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
        }
    },

    // 항공사 샘플 리스트
    getAirlineSamples() {
        return [
            '대한항공', '아시아나항공', '진에어', '티웨이항공', '에어부산',
            '중국국제항공', '중국동방항공', '중국남방항공', '하이난항공',
            '싱가포르항공', '일본항공', 'ANA', '비엣남항공', '타이항공',
            '말레이시아항공', '필리핀항공', '가루다항공', '캐세이패시픽'
        ];
    },

    // 공항 샘플 리스트
    getAirportSamples() {
        return [
            // 한국
            '인천국제공항 (ICN)', '김포국제공항 (GMP)', '김해국제공항 (PUS)',
            // 중국
            '베이징 서우두공항 (PEK)', '상하이 푸둥공항 (PVG)', '광저우 바이운공항 (CAN)',
            '선전 바오안공항 (SZX)', '홍콩국제공항 (HKG)',
            // 동남아
            '방콕 수완나품공항 (BKK)', '하노이 노이바이공항 (HAN)', '싱가포르 창이공항 (SIN)',
            '쿠알라룸푸르공항 (KUL)', '마닐라 니노이공항 (MNL)',
            // 일본
            '도쿄 나리타공항 (NRT)', '도쿄 하네다공항 (HND)', '오사카 간사이공항 (KIX)',
            // 미주
            '로스앤젤레스공항 (LAX)', '존 F. 케네디공항 (JFK)', '시카고 오헤어공항 (ORD)'
        ];
    }
};

// 전역 객체로 내보내기
window.FlightRequestUtils = FlightRequestUtils;

// 🆕 v8.2.1: 현지 활동기간 관리 함수들을 전역 함수로도 노출 (호환성)
window.calculateActivityDays = FlightRequestUtils.calculateActivityDays.bind(FlightRequestUtils);
window.validateActivityDates = FlightRequestUtils.validateActivityDates.bind(FlightRequestUtils);
window.getActivityPeriodSummary = FlightRequestUtils.getActivityPeriodSummary.bind(FlightRequestUtils);

console.log('✅ FlightRequestUtils v8.2.1 로드 완료 - 현지 활동기간 관리 유틸리티 함수 추가');
