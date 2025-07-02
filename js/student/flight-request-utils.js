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