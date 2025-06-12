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

    // 간단한 날짜 포맷팅 (YYYY-MM-DD)
    formatDateSimple(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    },

    // 날짜 차이 계산 (일 단위)
    calculateDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    // 주차 계산
    calculateWeeksBetween(startDate, endDate) {
        const days = this.calculateDaysBetween(startDate, endDate);
        return Math.ceil(days / 7);
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

    // 날짜 검증
    validateDateRange(startDate, endDate, fieldName = '날짜') {
        if (!startDate || !endDate) {
            this.showAlert(`${fieldName} 범위를 올바르게 입력해주세요.`);
            return false;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            this.showAlert('종료일은 시작일보다 늦어야 합니다.');
            return false;
        }

        return true;
    },

    // 숫자 범위 검증
    validateNumberRange(value, min, max, fieldName = '값') {
        const num = parseInt(value);
        if (isNaN(num)) {
            this.showAlert(`${fieldName}에 올바른 숫자를 입력해주세요.`);
            return false;
        }

        if (num < min || num > max) {
            this.showAlert(`${fieldName}은(는) ${min}~${max} 사이의 값이어야 합니다.`);
            return false;
        }

        return true;
    },

    // 문자열 길이 검증
    validateLength(value, minLength, maxLength, fieldName = '내용') {
        if (value.length < minLength) {
            this.showAlert(`${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다.`);
            return false;
        }

        if (value.length > maxLength) {
            this.showAlert(`${fieldName}은(는) 최대 ${maxLength}자까지 입력 가능합니다.`);
            return false;
        }

        return true;
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

    // 진행률 바 HTML 생성
    createProgressBar(percentage, className = '') {
        const safePercentage = Math.min(100, Math.max(0, percentage));
        return `
            <div class="progress-bar ${className}">
                <div class="progress-fill" style="width: ${safePercentage}%"></div>
                <span class="progress-text">${safePercentage}%</span>
            </div>
        `;
    },

    // 수업계획 관련 유틸리티 함수들
    lessonPlan: {
        // 수업 일정 자동 생성
        generateLessonSchedule(startDate, totalLessons, lessonsPerWeek = 3) {
            const lessons = [];
            const start = new Date(startDate);
            let currentDate = new Date(start);
            
            // 시작일이 월요일이 되도록 조정
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 1) { // 월요일(1)이 아닌 경우
                const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // 일요일(0)인 경우 1일, 그 외는 다음 월요일까지
                currentDate.setDate(currentDate.getDate() + daysToAdd);
            }
            
            const weeks = Math.ceil(totalLessons / lessonsPerWeek);
            
            for (let week = 1; week <= weeks; week++) {
                for (let lessonInWeek = 1; lessonInWeek <= lessonsPerWeek; lessonInWeek++) {
                    const lessonNumber = (week - 1) * lessonsPerWeek + lessonInWeek;
                    if (lessonNumber <= totalLessons) {
                        lessons.push({
                            week: week,
                            lesson: lessonInWeek,
                            lessonNumber: lessonNumber,
                            date: new Date(currentDate).toISOString().split('T')[0],
                            topic: '',
                            content: ''
                        });
                        
                        // 다음 수업일 계산 (월, 수, 금)
                        if (lessonInWeek === 1) {
                            currentDate.setDate(currentDate.getDate() + 2); // 월->수
                        } else if (lessonInWeek === 2) {
                            currentDate.setDate(currentDate.getDate() + 2); // 수->금
                        } else {
                            currentDate.setDate(currentDate.getDate() + 3); // 금->다음주 월
                        }
                    }
                }
            }
            
            return lessons;
        },

        // 수업계획 완성도 계산
        calculateCompletionRate(lessons) {
            if (!lessons || lessons.length === 0) return 0;
            
            const completedLessons = lessons.filter(lesson => 
                lesson.topic && lesson.topic.trim() && 
                lesson.content && lesson.content.trim()
            ).length;
            
            return Math.round((completedLessons / lessons.length) * 100);
        },

        // 수업계획 유효성 검증
        validateLessonPlan(planData) {
            const errors = [];
            
            if (!planData.startDate) {
                errors.push('파견 시작일을 입력해주세요.');
            }
            
            if (!planData.endDate) {
                errors.push('파견 종료일을 입력해주세요.');
            }
            
            if (planData.startDate && planData.endDate) {
                if (new Date(planData.startDate) >= new Date(planData.endDate)) {
                    errors.push('파견 종료일은 시작일보다 늦어야 합니다.');
                }
            }
            
            if (!planData.totalLessons || planData.totalLessons < 1) {
                errors.push('총 수업 횟수를 올바르게 입력해주세요.');
            }
            
            if (planData.totalLessons > 100) {
                errors.push('총 수업 횟수는 100회를 초과할 수 없습니다.');
            }
            
            // 수업 내용 검증
            if (planData.lessons && planData.lessons.length > 0) {
                const completionRate = this.calculateCompletionRate(planData.lessons);
                if (completionRate < 50) {
                    errors.push('최소 전체 수업의 50% 이상은 계획을 작성해주세요.');
                }
            }
            
            return errors;
        },

        // 수업계획 요약 생성
        generateSummary(planData) {
            if (!planData) return '';
            
            const duration = Utils.calculateDaysBetween(planData.startDate, planData.endDate);
            const weeks = Math.ceil(duration / 7);
            const avgLessonsPerWeek = planData.lessonsPerWeek || Math.ceil(planData.totalLessons / weeks);
            
            return `
                파견 기간: ${Utils.formatDate(planData.startDate)} ~ ${Utils.formatDate(planData.endDate)} (${weeks}주)
                총 수업 횟수: ${planData.totalLessons}회
                주당 평균: ${avgLessonsPerWeek}회
            `.trim();
        }
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
    },

    // 브라우저 지원 확인
    browserSupport: {
        // LocalStorage 지원 확인
        hasLocalStorage() {
            try {
                const test = 'test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        },

        // Intersection Observer 지원 확인
        hasIntersectionObserver() {
            return 'IntersectionObserver' in window;
        },

        // Service Worker 지원 확인
        hasServiceWorker() {
            return 'serviceWorker' in navigator;
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