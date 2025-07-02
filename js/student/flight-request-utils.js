// flight-request-utils.js - 항공권 신청 유틸리티 함수

// 날짜 관련 유틸리티
const dateUtils = {
    // 날짜를 YYYY-MM-DD 형식으로 변환
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    },

    // 두 날짜 사이의 일수 계산
    getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },

    // 날짜가 과거인지 확인
    isPastDate(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        return checkDate < today;
    },

    // 날짜 유효성 검사
    isValidDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return start < end;
    }
};

// 파견 기간 검증
const validateDispatchDuration = (days) => {
    const validDurations = [90, 100, 112, 120];
    return validDurations.includes(days);
};

// 파일 관련 유틸리티
const fileUtils = {
    // 파일 크기 검증 (10MB 제한)
    validateFileSize(file, maxSizeMB = 10) {
        const maxSize = maxSizeMB * 1024 * 1024; // MB to bytes
        return file.size <= maxSize;
    },

    // 파일 타입 검증
    validateFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) {
        return allowedTypes.includes(file.type);
    },

    // 파일명 생성 (userId_timestamp_originalName)
    generateFileName(userId, originalName) {
        const timestamp = Date.now();
        const extension = originalName.split('.').pop();
        const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${userId}_${timestamp}_${cleanName}`;
    },

    // 이미지 미리보기 생성
    createImagePreview(file, callback) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => callback(e.target.result);
            reader.readAsDataURL(file);
        } else {
            callback(null); // PDF 등은 미리보기 없음
        }
    }
};

// 상태 관련 유틸리티
const statusUtils = {
    // 상태에 따른 배지 클래스 반환
    getStatusBadgeClass(status) {
        const statusClasses = {
            'pending': 'badge-warning',
            'approved': 'badge-success',
            'rejected': 'badge-danger',
            'completed': 'badge-info'
        };
        return statusClasses[status] || 'badge-secondary';
    },

    // 상태에 따른 한글 텍스트 반환
    getStatusText(status) {
        const statusTexts = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'completed': '완료됨'
        };
        return statusTexts[status] || '알 수 없음';
    },

    // 상태에 따른 아이콘 반환
    getStatusIcon(status) {
        const statusIcons = {
            'pending': 'clock',
            'approved': 'check-circle',
            'rejected': 'x-circle',
            'completed': 'check-circle-2'
        };
        return statusIcons[status] || 'help-circle';
    }
};

// 구매 타입 관련 유틸리티
const purchaseTypeUtils = {
    // 구매 타입 한글 텍스트 반환
    getPurchaseTypeText(type) {
        const types = {
            'direct': '직접 구매',
            'agency': '구매 대행'
        };
        return types[type] || '알 수 없음';
    },

    // 구매 타입에 따른 아이콘 반환
    getPurchaseTypeIcon(type) {
        const icons = {
            'direct': 'credit-card',
            'agency': 'building-2'
        };
        return icons[type] || 'help-circle';
    }
};

// 공항 관련 유틸리티
const airportUtils = {
    // 한국 주요 공항 목록
    koreanAirports: [
        { code: 'ICN', name: '인천국제공항', city: '인천' },
        { code: 'GMP', name: '김포국제공항', city: '서울' },
        { code: 'PUS', name: '김해국제공항', city: '부산' },
        { code: 'CJU', name: '제주국제공항', city: '제주' },
        { code: 'TAE', name: '대구국제공항', city: '대구' }
    ],

    // 공항 코드와 이름 포맷팅
    formatAirport(input) {
        // 이미 포맷된 경우 그대로 반환
        if (input.includes('(') && input.includes(')')) {
            return input;
        }
        
        // 공항 코드만 있는 경우
        const airport = this.koreanAirports.find(a => a.code === input);
        if (airport) {
            return `${airport.name} (${airport.code})`;
        }
        
        return input;
    }
};

// 폼 검증 유틸리티
const formValidation = {
    // 필수 필드 검증
    validateRequired(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        return isValid;
    },

    // URL 검증
    isValidUrl(url) {
        if (!url) return true; // 선택 필드
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // 에러 메시지 표시
    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.classList.add('error');
        
        // 기존 에러 메시지 제거
        const existingError = field.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // 새 에러 메시지 추가
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentElement.appendChild(errorDiv);
    },

    // 에러 메시지 제거
    clearError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.classList.remove('error');
        const errorMessage = field.parentElement.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
};

// 알림 유틸리티
const notificationUtils = {
    // 성공 알림
    showSuccess(message) {
        showNotification(message, 'success');
    },

    // 에러 알림
    showError(message) {
        showNotification(message, 'error');
    },

    // 경고 알림
    showWarning(message) {
        showNotification(message, 'warning');
    },

    // 정보 알림
    showInfo(message) {
        showNotification(message, 'info');
    }
};

// Export 대신 전역 객체로 노출
window.flightRequestUtils = {
    dateUtils,
    validateDispatchDuration,
    fileUtils,
    statusUtils,
    purchaseTypeUtils,
    airportUtils,
    formValidation,
    notificationUtils
};