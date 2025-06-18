// 공통 유틸리티 함수들 - 토스트 알림 기능 추가 및 구문 오류 해결
const Utils = {
    // 날짜 포맷팅
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('날짜 포맷팅 오류:', error);
            return dateString;
        }
    },

    // 날짜시간 포맷팅
    formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('날짜시간 포맷팅 오류:', error);
            return dateString;
        }
    },

    // 간단한 날짜 포맷팅 (YYYY-MM-DD)
    formatDateSimple(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.error('간단 날짜 포맷팅 오류:', error);
            return dateString;
        }
    },

    // 날짜 차이 계산 (일 단위)
    calculateDaysBetween(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (error) {
            console.error('날짜 차이 계산 오류:', error);
            return 0;
        }
    },

    // 주차 계산
    calculateWeeksBetween(startDate, endDate) {
        try {
            const days = this.calculateDaysBetween(startDate, endDate);
            return Math.ceil(days / 7);
        } catch (error) {
            console.error('주차 계산 오류:', error);
            return 0;
        }
    },

    // 가격 포맷팅
    formatPrice(price) {
        try {
            return parseInt(price).toLocaleString('ko-KR') + '원';
        } catch (error) {
            console.error('가격 포맷팅 오류:', error);
            return price + '원';
        }
    },

    // DOM 요소 생성 헬퍼
    createElement(tag, className, content) {
        try {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (content) element.textContent = content;
            return element;
        } catch (error) {
            console.error('DOM 요소 생성 오류:', error);
            return null;
        }
    },

    // DOM 요소 선택 헬퍼
    $(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.error('DOM 요소 선택 오류:', error);
            return null;
        }
    },

    $$(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (error) {
            console.error('DOM 요소 선택 오류 (다중):', error);
            return [];
        }
    },

    // 이벤트 리스너 추가 헬퍼
    on(element, event, handler) {
        try {
            if (typeof element === 'string') {
                element = this.$(element);
            }
            if (element && typeof handler === 'function') {
                element.addEventListener(event, handler);
            }
        } catch (error) {
            console.error('이벤트 리스너 추가 오류:', error);
        }
    },

    // 클래스 토글 헬퍼
    toggleClass(element, className) {
        try {
            if (typeof element === 'string') {
                element = this.$(element);
            }
            if (element && className) {
                element.classList.toggle(className);
            }
        } catch (error) {
            console.error('클래스 토글 오류:', error);
        }
    },

    // 요소 표시/숨김
    show(element) {
        try {
            if (typeof element === 'string') {
                element = this.$(element);
            }
            if (element) {
                element.style.display = '';
            }
        } catch (error) {
            console.error('요소 표시 오류:', error);
        }
    },

    hide(element) {
        try {
            if (typeof element === 'string') {
                element = this.$(element);
            }
            if (element) {
                element.style.display = 'none';
            }
        } catch (error) {
            console.error('요소 숨김 오류:', error);
        }
    },

    // ===================
    // 개선된 알림 시스템 (토스트 + 모달)
    // ===================

    // 토스트 컨테이너 생성 (한 번만 실행)
    _ensureToastContainer() {
        try {
            let container = this.$('#toast-container');
            if (!container) {
                container = this.createElement('div', 'toast-container');
                container.id = 'toast-container';
                container.style.cssText = '\
                    position: fixed;\
                    top: 20px;\
                    right: 20px;\
                    z-index: 10000;\
                    display: flex;\
                    flex-direction: column;\
                    gap: 10px;\
                    pointer-events: none;\
                ';
                document.body.appendChild(container);
            }
            return container;
        } catch (error) {
            console.error('토스트 컨테이너 생성 오류:', error);
            return null;
        }
    },

    // 토스트 알림 표시 (새로 추가)
    showToast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;
        
        try {
            const container = this._ensureToastContainer();
            if (!container) return;
            
            const toast = this.createElement('div', 'toast toast-' + type);
            toast.style.cssText = '\
                background: ' + this._getToastColor(type) + ';\
                color: white;\
                padding: 12px 20px;\
                border-radius: 6px;\
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);\
                margin-bottom: 10px;\
                opacity: 0;\
                transform: translateX(100%);\
                transition: all 0.3s ease;\
                pointer-events: auto;\
                max-width: 400px;\
                word-wrap: break-word;\
                font-size: 14px;\
                line-height: 1.4;\
            ';
            
            // 아이콘 추가
            const icon = this._getToastIcon(type);
            toast.innerHTML = '\
                <div style="display: flex; align-items: center; gap: 8px;">\
                    <span>' + icon + '</span>\
                    <span>' + message + '</span>\
                </div>\
            ';
            
            container.appendChild(toast);
            
            // 애니메이션 효과
            setTimeout(function() {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            }, 10);
            
            // 자동 제거
            setTimeout(function() {
                Utils._removeToast(toast);
            }, duration);
            
            // 클릭으로 제거
            const self = this;
            toast.addEventListener('click', function() {
                self._removeToast(toast);
            });
            
        } catch (error) {
            console.error('토스트 알림 생성 실패:', error);
            // 폴백으로 기본 alert 사용
            alert(message);
        }
    },

    // 토스트 제거 헬퍼 함수
    _removeToast(toast) {
        try {
            if (toast && toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(function() {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('토스트 제거 오류:', error);
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
    showAlert(message, type) {
        type = type || 'info';
        
        try {
            // 심각한 오류는 모달로, 일반적인 알림은 토스트로
            if (type === 'error' && (message.indexOf('새로고침') !== -1 || message.indexOf('관리자에게 문의') !== -1)) {
                // 심각한 오류는 모달 alert 사용
                alert(message);
            } else {
                // 일반적인 알림은 토스트 사용
                this.showToast(message, type);
            }
        } catch (error) {
            console.error('알림 표시 오류:', error);
            alert(message);
        }
    },

    // 확인 대화상자
    showConfirm(message) {
        try {
            return confirm(message);
        } catch (error) {
            console.error('확인 대화상자 오류:', error);
            return false;
        }
    },

    // 프롬프트 대화상자
    showPrompt(message, defaultValue) {
        defaultValue = defaultValue || '';
        
        try {
            return prompt(message, defaultValue);
        } catch (error) {
            console.error('프롬프트 대화상자 오류:', error);
            return null;
        }
    },

    // 폼 데이터 수집
    getFormData(formElement) {
        try {
            const formData = new FormData(formElement);
            const data = {};
            for (const pair of formData.entries()) {
                data[pair[0]] = pair[1];
            }
            return data;
        } catch (error) {
            console.error('폼 데이터 수집 오류:', error);
            return {};
        }
    },

    // 폼 초기화
    resetForm(formElement) {
        try {
            if (typeof formElement === 'string') {
                formElement = this.$(formElement);
            }
            if (formElement && formElement.reset) {
                formElement.reset();
            }
        } catch (error) {
            console.error('폼 초기화 오류:', error);
        }
    },

    // 입력 필드 검증
    validateRequired(value, fieldName) {
        try {
            if (!value || !value.trim()) {
                this.showAlert(fieldName + '은(는) 필수 입력 항목입니다.', 'warning');
                return false;
            }
            return true;
        } catch (error) {
            console.error('필수 필드 검증 오류:', error);
            return false;
        }
    },

    validateEmail(email) {
        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        } catch (error) {
            console.error('이메일 검증 오류:', error);
            return false;
        }
    },

    validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },

    // 날짜 검증
    validateDateRange(startDate, endDate, fieldName) {
        fieldName = fieldName || '날짜';
        
        try {
            if (!startDate || !endDate) {
                this.showAlert(fieldName + ' 범위를 올바르게 입력해주세요.', 'warning');
                return false;
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start >= end) {
                this.showAlert('종료일은 시작일보다 늦어야 합니다.', 'warning');
                return false;
            }

            return true;
        } catch (error) {
            console.error('날짜 범위 검증 오류:', error);
            return false;
        }
    },

    // 숫자 범위 검증
    validateNumberRange(value, min, max, fieldName) {
        fieldName = fieldName || '값';
        
        try {
            const num = parseInt(value);
            if (isNaN(num)) {
                this.showAlert(fieldName + '에 올바른 숫자를 입력해주세요.', 'warning');
                return false;
            }

            if (num < min || num > max) {
                this.showAlert(fieldName + '은(는) ' + min + '~' + max + ' 사이의 값이어야 합니다.', 'warning');
                return false;
            }

            return true;
        } catch (error) {
            console.error('숫자 범위 검증 오류:', error);
            return false;
        }
    },

    // 문자열 길이 검증
    validateLength(value, minLength, maxLength, fieldName) {
        fieldName = fieldName || '내용';
        
        try {
            if (value.length < minLength) {
                this.showAlert(fieldName + '은(는) 최소 ' + minLength + '자 이상이어야 합니다.', 'warning');
                return false;
            }

            if (value.length > maxLength) {
                this.showAlert(fieldName + '은(는) 최대 ' + maxLength + '자까지 입력 가능합니다.', 'warning');
                return false;
            }

            return true;
        } catch (error) {
            console.error('문자열 길이 검증 오류:', error);
            return false;
        }
    },

    // 문자열 자르기
    truncateText(text, maxLength) {
        maxLength = maxLength || 100;
        
        try {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        } catch (error) {
            console.error('문자열 자르기 오류:', error);
            return text;
        }
    },

    // 검색어 하이라이트
    highlightText(text, searchTerm) {
        try {
            if (!searchTerm) return text;
            const regex = new RegExp('(' + searchTerm + ')', 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        } catch (error) {
            console.error('검색어 하이라이트 오류:', error);
            return text;
        }
    },

    // 디바운스 함수
    debounce(func, wait) {
        try {
            let timeout;
            return function executedFunction() {
                const args = Array.prototype.slice.call(arguments);
                const later = function() {
                    clearTimeout(timeout);
                    func.apply(null, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        } catch (error) {
            console.error('디바운스 함수 오류:', error);
            return func;
        }
    },

    // 로딩 상태 관리
    showLoading(element) {
        try {
            if (typeof element === 'string') {
                element = this.$(element);
            }
            if (element) {
                element.disabled = true;
                const originalText = element.textContent;
                element.setAttribute('data-original-text', originalText);
                element.textContent = '처리중...';
            }
        } catch (error) {
            console.error('로딩 표시 오류:', error);
        }
    },

    hideLoading(element) {
        try {
            if (typeof element === 'string') {
                element = this.$(element);
            }
            if (element) {
                element.disabled = false;
                element.textContent = element.getAttribute('data-original-text') || element.textContent;
            }
        } catch (error) {
            console.error('로딩 숨김 오류:', error);
        }
    },

    // CSV 다운로드
    downloadCSV(data, filename) {
        filename = filename || 'export.csv';
        
        try {
            if (!data || data.length === 0) {
                this.showAlert('내보낼 데이터가 없습니다.', 'warning');
                return;
            }

            // CSV 헤더 생성
            const headers = Object.keys(data[0]);
            let csvContent = headers.join(',') + '\n';

            // CSV 데이터 생성
            data.forEach(function(row) {
                const values = headers.map(function(header) {
                    let value = row[header] || '';
                    // 특수문자가 포함된 경우 따옴표로 감싸기
                    if (typeof value === 'string' && (value.indexOf(',') !== -1 || value.indexOf('\n') !== -1 || value.indexOf('"') !== -1)) {
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
        } catch (error) {
            console.error('CSV 다운로드 오류:', error);
            this.showAlert('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    },

    // 상태 뱃지 HTML 생성 (Supabase API 사용)
    createStatusBadge(status) {
        try {
            if (window.SupabaseAPI && window.SupabaseAPI.getStatusClass && window.SupabaseAPI.getStatusText) {
                const statusClass = window.SupabaseAPI.getStatusClass(status);
                const statusText = window.SupabaseAPI.getStatusText(status);
                return '<span class="status-badge ' + statusClass + '">' + statusText + '</span>';
            }
            return '<span class="status-badge">' + status + '</span>';
        } catch (error) {
            console.error('상태 뱃지 생성 오류:', error);
            return '<span class="status-badge">' + status + '</span>';
        }
    },

    // 아이콘 HTML 생성 (Lucide 아이콘)
    createIcon(iconName, className) {
        className = className || '';
        
        try {
            return '<i data-lucide="' + iconName + '" class="' + className + '"></i>';
        } catch (error) {
            console.error('아이콘 생성 오류:', error);
            return '';
        }
    },

    // 진행률 바 HTML 생성
    createProgressBar(percentage, className) {
        className = className || '';
        
        try {
            const safePercentage = Math.min(100, Math.max(0, percentage));
            return '\
                <div class="progress-bar ' + className + '">\
                    <div class="progress-fill" style="width: ' + safePercentage + '%"></div>\
                    <span class="progress-text">' + safePercentage + '%</span>\
                </div>\
            ';
        } catch (error) {
            console.error('진행률 바 생성 오류:', error);
            return '';
        }
    },

    // 수업계획 관련 유틸리티 함수들
    lessonPlan: {
        // 수업 일정 자동 생성
        generateLessonSchedule: function(startDate, totalLessons, lessonsPerWeek) {
            lessonsPerWeek = lessonsPerWeek || 3;
            
            try {
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
            } catch (error) {
                console.error('수업 일정 생성 오류:', error);
                return [];
            }
        },

        // 수업계획 완성도 계산
        calculateCompletionRate: function(lessons) {
            try {
                if (!lessons || lessons.length === 0) return 0;
                
                const completedLessons = lessons.filter(function(lesson) {
                    return lesson.topic && lesson.topic.trim() && lesson.content && lesson.content.trim();
                }).length;
                
                return Math.round((completedLessons / lessons.length) * 100);
            } catch (error) {
                console.error('완성도 계산 오류:', error);
                return 0;
            }
        },

        // 수업계획 유효성 검증
        validateLessonPlan: function(planData) {
            try {
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
            } catch (error) {
                console.error('수업계획 검증 오류:', error);
                return ['수업계획 검증 중 오류가 발생했습니다.'];
            }
        },

        // 수업계획 요약 생성
        generateSummary: function(planData) {
            try {
                if (!planData) return '';
                
                const duration = Utils.calculateDaysBetween(planData.startDate, planData.endDate);
                const weeks = Math.ceil(duration / 7);
                const avgLessonsPerWeek = planData.lessonsPerWeek || Math.ceil(planData.totalLessons / weeks);
                
                return '\
                    파견 기간: ' + Utils.formatDate(planData.startDate) + ' ~ ' + Utils.formatDate(planData.endDate) + ' (' + weeks + '주)\
                    총 수업 횟수: ' + planData.totalLessons + '회\
                    주당 평균: ' + avgLessonsPerWeek + '회\
                '.trim();
            } catch (error) {
                console.error('수업계획 요약 생성 오류:', error);
                return '';
            }
        }
    },

    // 반응형 이미지 로딩
    lazyLoadImages: function() {
        try {
            const images = document.querySelectorAll('img[data-src]');
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver(function(entries, observer) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.getAttribute('data-src');
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    });
                });

                images.forEach(function(img) {
                    imageObserver.observe(img);
                });
            } else {
                // 폴백: 모든 이미지 즉시 로드
                images.forEach(function(img) {
                    img.src = img.getAttribute('data-src');
                    img.removeAttribute('data-src');
                });
            }
        } catch (error) {
            console.error('지연 로딩 이미지 설정 오류:', error);
        }
    },

    // 스크롤 위치 저장/복원
    saveScrollPosition: function(key) {
        key = key || 'scrollPos';
        
        try {
            if (typeof Storage !== 'undefined') {
                sessionStorage.setItem(key, window.scrollY.toString());
            }
        } catch (error) {
            console.warn('스크롤 위치 저장 실패:', error);
        }
    },

    restoreScrollPosition: function(key) {
        key = key || 'scrollPos';
        
        try {
            if (typeof Storage !== 'undefined') {
                const scrollPos = sessionStorage.getItem(key);
                if (scrollPos) {
                    window.scrollTo(0, parseInt(scrollPos));
                    sessionStorage.removeItem(key);
                }
            }
        } catch (error) {
            console.warn('스크롤 위치 복원 실패:', error);
        }
    },

    // 키보드 단축키 핸들러
    handleKeyboardShortcuts: function(event) {
        try {
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
        } catch (error) {
            console.error('키보드 단축키 처리 오류:', error);
        }
    },

    // 브라우저 지원 확인
    browserSupport: {
        // LocalStorage 지원 확인
        hasLocalStorage: function() {
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
        hasIntersectionObserver: function() {
            return 'IntersectionObserver' in window;
        },

        // Service Worker 지원 확인
        hasServiceWorker: function() {
            return 'serviceWorker' in navigator;
        }
    },

    // ===================
    // 오류 처리 유틸리티 (새로 추가)
    // ===================

    // 연결 상태 확인
    checkConnection: function() {
        try {
            if (!navigator.onLine) {
                return Promise.resolve({ connected: false, message: '인터넷 연결이 없습니다.' });
            }

            // Supabase 연결 테스트
            if (window.SupabaseAPI && typeof window.SupabaseAPI.testConnection === 'function') {
                return window.SupabaseAPI.testConnection().then(function(result) {
                    if (result.success) {
                        return { connected: true, message: '연결 상태가 양호합니다.' };
                    } else {
                        return { connected: false, message: '데이터베이스 연결에 문제가 있습니다.' };
                    }
                }).catch(function(apiError) {
                    console.error('API 연결 테스트 오류:', apiError);
                    return { connected: false, message: '서버 연결 확인 중 오류가 발생했습니다.' };
                });
            }

            return Promise.resolve({ connected: false, message: '서비스가 초기화되지 않았습니다.' });
        } catch (error) {
            console.error('연결 상태 확인 오류:', error);
            return Promise.resolve({ connected: false, message: '연결 상태를 확인할 수 없습니다.' });
        }
    },

    // 시스템 상태 표시
    showSystemStatus: function() {
        const self = this;
        
        return this.checkConnection().then(function(status) {
            const type = status.connected ? 'success' : 'warning';
            self.showToast(status.message, type);
            return status;
        }).catch(function(error) {
            console.error('시스템 상태 표시 오류:', error);
            self.showToast('시스템 상태를 확인할 수 없습니다.', 'error');
            return { connected: false, message: '상태 확인 실패' };
        });
    },

    // 에러 리포트 생성
    generateErrorReport: function() {
        try {
            const errorLog = this.browserSupport.hasLocalStorage() ? 
                JSON.parse(localStorage.getItem('errorLog') || '[]') : [];
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
    },

    // 안전한 JSON 파싱
    safeJSONParse: function(jsonString, defaultValue) {
        defaultValue = defaultValue || null;
        
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('JSON 파싱 오류:', error);
            return defaultValue;
        }
    },

    // 안전한 로컬 스토리지 접근
    safeLocalStorage: {
        getItem: function(key, defaultValue) {
            defaultValue = defaultValue || null;
            
            try {
                if (Utils.browserSupport.hasLocalStorage()) {
                    const item = localStorage.getItem(key);
                    return item !== null ? item : defaultValue;
                }
                return defaultValue;
            } catch (error) {
                console.error('로컬 스토리지 읽기 오류:', error);
                return defaultValue;
            }
        },

        setItem: function(key, value) {
            try {
                if (Utils.browserSupport.hasLocalStorage()) {
                    localStorage.setItem(key, value);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('로컬 스토리지 쓰기 오류:', error);
                return false;
            }
        },

        removeItem: function(key) {
            try {
                if (Utils.browserSupport.hasLocalStorage()) {
                    localStorage.removeItem(key);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('로컬 스토리지 삭제 오류:', error);
                return false;
            }
        }
    }
};

// 전역 이벤트 리스너 등록 - 안전성 강화
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 키보드 단축키 활성화
        document.addEventListener('keydown', Utils.handleKeyboardShortcuts);
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 연결 상태 모니터링 (선택적)
        if (window.CONFIG && window.CONFIG.DEV && window.CONFIG.DEV.DEBUG) {
            setTimeout(function() {
                Utils.checkConnection().then(function(status) {
                    console.log('시스템 연결 상태:', status);
                }).catch(function(error) {
                    console.error('연결 상태 확인 실패:', error);
                });
            }, 3000);
        }
    } catch (error) {
        console.error('DOMContentLoaded 이벤트 처리 오류:', error);
    }
});

// 페이지 언로드 시 스크롤 위치 저장
window.addEventListener('beforeunload', function() {
    try {
        Utils.saveScrollPosition();
    } catch (error) {
        console.error('페이지 언로드 처리 오류:', error);
    }
});

// 전역 에러 핸들러 - 개선된 버전
window.addEventListener('error', function(event) {
    try {
        console.error('전역 JavaScript 에러:', event.error);
        
        // 에러 로그 저장 (가능한 경우)
        if (Utils.browserSupport.hasLocalStorage()) {
            try {
                const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
                errorLog.push({
                    timestamp: new Date().toISOString(),
                    message: event.error ? event.error.message : 'Unknown error',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error ? event.error.stack : null
                });
                
                // 최대 50개 에러만 보관
                if (errorLog.length > 50) {
                    errorLog.splice(0, errorLog.length - 50);
                }
                
                localStorage.setItem('errorLog', JSON.stringify(errorLog));
            } catch (logError) {
                console.error('에러 로그 저장 실패:', logError);
            }
        }
        
        // 개발 모드에서는 더 자세한 정보 표시
        if (window.CONFIG && window.CONFIG.DEV && window.CONFIG.DEV.DEBUG) {
            Utils.showToast('JavaScript 오류: ' + (event.error ? event.error.message : 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('전역 에러 핸들러 처리 오류:', error);
    }
});

// 네트워크 상태 변화 감지 - 안전성 강화
window.addEventListener('online', function() {
    try {
        Utils.showToast('네트워크 연결이 복원되었습니다.', 'success');
    } catch (error) {
        console.error('온라인 이벤트 처리 오류:', error);
    }
});

window.addEventListener('offline', function() {
    try {
        Utils.showToast('네트워크 연결이 끊어졌습니다.', 'warning');
    } catch (error) {
        console.error('오프라인 이벤트 처리 오류:', error);
    }
});

// 전역 접근을 위해 window 객체에 추가
window.Utils = Utils;

// 모듈 로드 완료 메시지
console.log('🛠️ Utils loaded successfully - 구문 오류 해결 및 안전성 강화 완료');
