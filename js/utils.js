// 공통 유틸리티 함수들
const Utils = {
    // 날짜 포맷팅
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // 날짜시간 포맷팅
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // 가격 포맷팅
    formatPrice(price) {
        return parseInt(price).toLocaleString('ko-KR') + '원';
    },

    // DOM 요소 생성 헬퍼
    createElement(tag, className = '', content = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) element.textContent = content;
        return element;
    },

    // DOM 요소 선택 헬퍼
    $(selector) {
        return document.querySelector(selector);
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    // 이벤트 리스너 추가 헬퍼
    on(element, event, handler) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.addEventListener(event, handler);
        }
    },

    // 클래스 토글 헬퍼
    toggleClass(element, className) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.classList.toggle(className);
        }
    },

    // 요소 표시/숨김
    show(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.style.display = '';
        }
    },

    hide(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.style.display = 'none';
        }
    },

    // 알림 메시지 표시
    showAlert(message, type = 'info') {
        // 간단한 alert 대신 향후 토스트 알림으로 교체 가능
        alert(message);
    },

    // 확인 대화상자
    showConfirm(message) {
        return confirm(message);
    },

    // 프롬프트 대화상자
    showPrompt(message, defaultValue = '') {
        return prompt(message, defaultValue);
    },

    // 폼 데이터 수집
    getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    },

    // 폼 초기화
    resetForm(formElement) {
        if (typeof formElement === 'string') {
            formElement = this.$(formElement);
        }
        if (formElement) {
            formElement.reset();
        }
    },

    // 입력 필드 검증
    validateRequired(value, fieldName) {
        if (!value || !value.trim()) {
            this.showAlert(`${fieldName}은(는) 필수 입력 항목입니다.`);
            return false;
        }
        return true;
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // 문자열 자르기
    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // 검색어 하이라이트
    highlightText(text, searchTerm) {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    // 디바운스 함수
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
    },

    // 로딩 상태 관리
    showLoading(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.disabled = true;
            const originalText = element.textContent;
            element.dataset.originalText = originalText;
            element.textContent = '처리중...';
        }
    },

    hideLoading(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.disabled = false;
            element.textContent = element.dataset.originalText || element.textContent;
        }
    },

    // CSV 다운로드
    downloadCSV(data, filename = 'export.csv') {
        if (!data || data.length === 0) {
            this.showAlert('내보낼 데이터가 없습니다.');
            return;
        }

        // CSV 헤더 생성
        const headers = Object.keys(data[0]);
        let csvContent = headers.join(',') + '\n';

        // CSV 데이터 생성
        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header] || '';
                // 특수문자가 포함된 경우 따옴표로 감싸기
                if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvContent += values.join(',') + '\n';
        });

        // BOM 추가 (한글 인코딩 문제 해결)
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // 다운로드 링크 생성
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // 상태 뱃지 HTML 생성
    createStatusBadge(status) {
        const statusClass = DataManager.getStatusClass(status);
        const statusText = DataManager.getStatusText(status);
        return `<span class="status-badge ${statusClass}">${statusText}</span>`;
    },

    // 아이콘 HTML 생성 (Lucide 아이콘)
    createIcon(iconName, className = '') {
        return `<i data-lucide="${iconName}" class="${className}"></i>`;
    },

    // 반응형 이미지 로딩
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    },

    // 스크롤 위치 저장/복원
    saveScrollPosition(key = 'scrollPos') {
        sessionStorage.setItem(key, window.scrollY.toString());
    },

    restoreScrollPosition(key = 'scrollPos') {
        const scrollPos = sessionStorage.getItem(key);
        if (scrollPos) {
            window.scrollTo(0, parseInt(scrollPos));
            sessionStorage.removeItem(key);
        }
    },

    // 키보드 단축키 핸들러
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + Enter: 폼 제출
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            const activeForm = document.activeElement.closest('form');
            if (activeForm) {
                event.preventDefault();
                activeForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // ESC: 모달 닫기
        if (event.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                activeModal.classList.remove('active');
            }
        }
    }
};

// 전역 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    // 키보드 단축키 활성화
    document.addEventListener('keydown', Utils.handleKeyboardShortcuts);
    
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// 페이지 언로드 시 스크롤 위치 저장
window.addEventListener('beforeunload', () => {
    Utils.saveScrollPosition();
});