/**
 * 공통 유틸리티 함수들 - 토스트 알림 기능 추가
 * 
 * @description 프로젝트 전반에서 사용되는 공통 유틸리티 함수들을 제공
 * @dependencies Lucide Icons (선택적)
 * @author Claude AI Assistant
 * @date 2025-06-16
 * @version 2.0.0 (Claude Optimized)
 */

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

    // ===================
    // 개선된 알림 시스템 (토스트 + 모달)
    // ===================

    // 토스트 컨테이너 생성 (한 번만 실행)
    _ensureToastContainer() {
        let container = this.$('#toast-container');
        if (!container) {
            container = this.createElement('div', 'toast-container');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    },

    // 토스트 알림 표시 (새로 추가)
    showToast(message, type = 'info', duration = 3000) {
        try {
            const container = this._ensureToastContainer();
            
            const toast = this.createElement('div', `toast toast-${type}`);
            toast.style.cssText = `
                background: ${this._getToastColor(type)};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin-bottom: 10px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
                max-width: 400px;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.4;
            `;
            
            // 아이콘 추가
            const icon = this._getToastIcon(type);
            toast.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${icon}</span>
                    <span>${message}</span>
                </div>
            `;
            
            container.appendChild(toast);
            
            // 애니메이션 효과
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            }, 10);
            
            // 자동 제거
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);
            
            // 클릭으로 제거
            toast.addEventListener('click', () => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            });
            
        } catch (error) {
            console.error('토스트 알림 생성 실패:', error);
            // 폴백으로 기본 alert 사용
            alert(message);
        }
    },

    // 토스트 색상 결정
    _getToastColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444', 
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || colors.info;
    },

    // 토스트 아이콘 결정
    _getToastIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || icons.info;
    },

    // 개선된 알림 메시지 표시
    showAlert(message, type = 'info') {
        // 심각한 오류는 모달로, 일반적인 알림은 토스트로
        if (type === 'error' && (message.includes('새로고침') || message.includes('관리자에게 문의'))) {
            // 심각한 오류는 모달 alert 사용
            alert(message);
        } else {
            // 일반적인 알림은 토스트 사용
            this.showToast(message, type);
        }
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
            this.showAlert(`${fieldName}은(는) 필수 입력 항목입니다.`, 'warning');
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
            this.showAlert(`${fieldName} 범위를 올바르게 입력해주세요.`, 'warning');
            return false;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            this.showAlert('종료일은 시작일보다 늦어야 합니다.', 'warning');
            return false;
        }

        return true;
    },

    // 숫자 범위 검증
    validateNumberRange(value, min, max, fieldName = '값') {
        const num = parseInt(value);
        if (isNaN(num)) {
            this.showAlert(`${fieldName}에 올바른 숫자를 입력해주세요.`, 'warning');
            return false;
        }

        if (num < min || num > max) {
            this.showAlert(`${fieldName}은(는) ${min}~${max} 사이의 값이어야 합니다.`, 'warning');
            return false;
        }

        return true;
    },

    // 문자열 길이 검증
    validateLength(value, minLength, maxLength, fieldName = '내용') {
        if (value.length < minLength) {
            this.showAlert(`${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다.`, 'warning');
            return false;
        }

        if (value.length > maxLength) {
            this.showAlert(`${fieldName}은(는) 최대 ${maxLength}자까지 입력 가능합니다.`, 'warning');
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
            this.showAlert('내보낼 데이터가 없습니다.', 'warning');
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
        
        this.showToast('파일이 다운로드되었습니다.', 'success');
    },

    // 상태 뱃지 HTML 생성 (Supabase API 사용)
    createStatusBadge(status) {
        if (window.SupabaseAPI) {
            const statusClass = window.SupabaseAPI.getStatusClass(status);
            const statusText = window.SupabaseAPI.getStatusText(status);
            return `<span class="status-badge ${statusClass}">${statusText}</span>`;
        }
        return `<span class="status-badge">${status}</span>`;
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
        try {
            sessionStorage.setItem(key, window.scrollY.toString());
        } catch (error) {
            console.warn('스크롤 위치 저장 실패:', error);
        }
    },

    restoreScrollPosition(key = 'scrollPos') {
        try {
            const scrollPos = sessionStorage.getItem(key);
            if (scrollPos) {
                window.scrollTo(0, parseInt(scrollPos));
                sessionStorage.removeItem(key);
            }
        } catch (error) {
            console.warn('스크롤 위치 복원 실패:', error);
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
    },

    // ===================
    // 오류 처리 유틸리티 (새로 추가)
    // ===================

    // 연결 상태 확인
    async checkConnection() {
        try {
            if (!navigator.onLine) {
                return { connected: false, message: '인터넷 연결이 없습니다.' };
            }

            // Supabase 연결 테스트
            if (window.SupabaseAPI) {
                const result = await window.SupabaseAPI.testConnection();
                if (result.success) {
                    return { connected: true, message: '연결 상태가 양호합니다.' };
                } else {
                    return { connected: false, message: '데이터베이스 연결에 문제가 있습니다.' };
                }
            }

            return { connected: false, message: '서비스가 초기화되지 않았습니다.' };
        } catch (error) {
            console.error('연결 상태 확인 오류:', error);
            return { connected: false, message: '연결 상태를 확인할 수 없습니다.' };
        }
    },

    // 시스템 상태 표시
    async showSystemStatus() {
        const status = await this.checkConnection();
        const type = status.connected ? 'success' : 'warning';
        this.showToast(status.message, type);
        return status;
    },

    // 에러 리포트 생성
    generateErrorReport() {
        try {
            const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
            const recentErrors = errorLog.slice(-10); // 최근 10개 에러
            
            const report = {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                errors: recentErrors,
                systemInfo: {
                    onLine: navigator.onLine,
                    cookieEnabled: navigator.cookieEnabled,
                    language: navigator.language
                }
            };
            
            return JSON.stringify(report, null, 2);
        } catch (error) {
            console.error('에러 리포트 생성 실패:', error);
            return null;
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
    
    // 연결 상태 모니터링 (선택적)
    if (window.CONFIG && window.CONFIG.DEV && window.CONFIG.DEV.DEBUG) {
        setTimeout(() => {
            Utils.checkConnection().then(status => {
                console.log('시스템 연결 상태:', status);
            });
        }, 3000);
    }
});

// 페이지 언로드 시 스크롤 위치 저장
window.addEventListener('beforeunload', () => {
    Utils.saveScrollPosition();
});

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    console.error('전역 JavaScript 에러:', event.error);
    
    // 개발 모드에서는 더 자세한 정보 표시
    if (window.CONFIG && window.CONFIG.DEV && window.CONFIG.DEV.DEBUG) {
        Utils.showToast(`JavaScript 오류: ${event.error.message}`, 'error');
    }
});

// 네트워크 상태 변화 감지
window.addEventListener('online', () => {
    Utils.showToast('네트워크 연결이 복원되었습니다.', 'success');
});

window.addEventListener('offline', () => {
    Utils.showToast('네트워크 연결이 끊어졌습니다.', 'warning');
});

// 전역 접근을 위해 window 객체에 추가
window.Utils = Utils;
