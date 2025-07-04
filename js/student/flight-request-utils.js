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