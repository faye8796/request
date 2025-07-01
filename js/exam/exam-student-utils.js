/**
 * 🛠️ 수료평가 시스템 - 학생 유틸리티 모듈 v5.2.0
 * 학생용 수료평가 시스템의 공통 유틸리티 함수들
 * 완전 독립된 학생 전용 유틸리티 모듈
 */

class ExamStudentUtils {
    constructor() {
        this.moduleStatus = {
            initialized: false,
            name: 'ExamStudentUtils',
            version: '5.2.0',
            lastUpdate: new Date().toISOString()
        };
        
        this.toastContainer = null;
    }

    /**
     * 🚀 모듈 초기화
     */
    async initialize() {
        try {
            console.log('🔄 ExamStudentUtils v5.2.0 초기화 시작...');
            
            // 토스트 컨테이너 생성
            this.createToastContainer();
            
            this.moduleStatus.initialized = true;
            console.log('✅ ExamStudentUtils v5.2.0 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ ExamStudentUtils 초기화 실패:', error);
            throw error;
        }
    }

    // ==================== 사용자 알림 시스템 ====================

    /**
     * 🍞 토스트 메시지 표시
     */
    showToast(message, type = 'info', duration = 3000) {
        try {
            if (!this.toastContainer) {
                this.createToastContainer();
            }
            
            const toast = this.createToastElement(message, type);
            this.toastContainer.appendChild(toast);
            
            // 애니메이션 시작
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            // 자동 제거
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
            
        } catch (error) {
            console.error('❌ 토스트 표시 실패:', error);
            // 폴백: 기본 alert
            alert(message);
        }
    }

    /**
     * 📦 토스트 컨테이너 생성
     */
    createToastContainer() {
        if (this.toastContainer) return;
        
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'exam-toast-container';
        this.toastContainer.className = 'exam-toast-container';
        document.body.appendChild(this.toastContainer);
    }

    /**
     * 🍞 토스트 요소 생성
     */
    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `exam-toast exam-toast-${type}`;
        
        const iconMap = {
            'success': 'check-circle',
            'error': 'x-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        
        const icon = iconMap[type] || 'info';
        
        toast.innerHTML = `
            <div class="exam-toast-content">
                <i data-lucide="${icon}" class="exam-toast-icon"></i>
                <span class="exam-toast-message">${message}</span>
            </div>
            <button class="exam-toast-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;
        
        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(toast), 0);
        }
        
        return toast;
    }

    /**
     * 🗑️ 토스트 제거
     */
    removeToast(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }

    /**
     * 📢 확인 대화상자
     */
    showConfirm(message, title = '확인') {
        return new Promise((resolve) => {
            const confirmed = confirm(`${title}\n\n${message}`);
            resolve(confirmed);
        });
    }

    /**
     * ⚠️ 경고 메시지
     */
    showAlert(message, title = '알림') {
        alert(`${title}\n\n${message}`);
    }

    // ==================== 시간 관련 유틸리티 ====================

    /**
     * 🕐 경과 시간 계산
     */
    calculateElapsedTime(startTime) {
        if (!startTime) return '0분 0초';
        
        const start = new Date(startTime);
        const now = new Date();
        const elapsed = Math.floor((now - start) / 1000);
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        return `${minutes}분 ${seconds}초`;
    }

    /**
     * 📅 날짜 포맷팅
     */
    formatDate(date, format = 'full') {
        if (!date) return '';
        
        const d = new Date(date);
        
        switch (format) {
            case 'date':
                return d.toLocaleDateString('ko-KR');
            case 'time':
                return d.toLocaleTimeString('ko-KR');
            case 'datetime':
                return d.toLocaleString('ko-KR');
            case 'full':
            default:
                return d.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
        }
    }

    /**
     * ⏱️ 상대 시간 표시
     */
    getRelativeTime(date) {
        if (!date) return '';
        
        const now = new Date();
        const target = new Date(date);
        const diff = now - target;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}일 전`;
        } else if (hours > 0) {
            return `${hours}시간 전`;
        } else if (minutes > 0) {
            return `${minutes}분 전`;
        } else {
            return '방금 전';
        }
    }

    // ==================== 데이터 검증 유틸리티 ====================

    /**
     * 🔍 답안 검증
     */
    validateAnswer(answer, questionType) {
        if (!answer || typeof answer !== 'string') {
            return {
                valid: false,
                message: '답안을 입력해주세요.'
            };
        }
        
        const trimmedAnswer = answer.trim();
        
        if (trimmedAnswer.length === 0) {
            return {
                valid: false,
                message: '답안을 입력해주세요.'
            };
        }
        
        if (questionType === 'short_answer') {
            if (trimmedAnswer.length > 100) {
                return {
                    valid: false,
                    message: '답안은 100자 이내로 입력해주세요.'
                };
            }
        }
        
        return {
            valid: true,
            message: '유효한 답안입니다.'
        };
    }

    /**
     * 📊 점수 계산
     */
    calculatePercentage(score, maxScore) {
        if (!maxScore || maxScore === 0) return 0;
        return Math.round((score / maxScore) * 100 * 100) / 100; // 소수점 둘째 자리까지
    }

    /**
     * 🎯 합격 여부 판정
     */
    isPassingScore(percentage, passScore) {
        return percentage >= passScore;
    }

    // ==================== 로컬 스토리지 관리 ====================

    /**
     * 💾 안전한 로컬 스토리지 저장
     */
    saveToLocalStorage(key, data) {
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(key, serializedData);
            return true;
        } catch (error) {
            console.error('❌ 로컬 스토리지 저장 실패:', error);
            return false;
        }
    }

    /**
     * 📖 안전한 로컬 스토리지 읽기
     */
    getFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ 로컬 스토리지 읽기 실패:', error);
            return defaultValue;
        }
    }

    /**
     * 🗑️ 안전한 로컬 스토리지 삭제
     */
    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('❌ 로컬 스토리지 삭제 실패:', error);
            return false;
        }
    }

    // ==================== UI 애니메이션 유틸리티 ====================

    /**
     * 🌟 부드러운 스크롤
     */
    smoothScrollTo(element, duration = 500) {
        if (!element) return;
        
        const targetPosition = element.offsetTop;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;
        
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = ease(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }
        
        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }
        
        requestAnimationFrame(animation);
    }

    /**
     * 💫 요소 강조 효과
     */
    highlightElement(element, duration = 2000) {
        if (!element) return;
        
        element.classList.add('exam-highlight');
        setTimeout(() => {
            element.classList.remove('exam-highlight');
        }, duration);
    }

    /**
     * 🔄 로딩 스피너 표시/숨기기
     */
    showLoadingSpinner(container) {
        if (!container) return;
        
        const spinner = document.createElement('div');
        spinner.className = 'exam-loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <span>처리 중...</span>
        `;
        
        container.appendChild(spinner);
        return spinner;
    }

    hideLoadingSpinner(spinner) {
        if (spinner && spinner.parentElement) {
            spinner.parentElement.removeChild(spinner);
        }
    }

    // ==================== 접근성 지원 ====================

    /**
     * 🔍 포커스 관리
     */
    setFocus(element, delay = 0) {
        if (!element) return;
        
        setTimeout(() => {
            element.focus();
        }, delay);
    }

    /**
     * 📢 스크린 리더용 공지
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // ==================== 디버그 및 개발 지원 ====================

    /**
     * 🐛 디버그 로그
     */
    debug(message, data = null) {
        if (this.isDebugMode()) {
            console.group(`🐛 ExamStudentUtils Debug`);
            console.log(`📅 ${new Date().toISOString()}`);
            console.log(`📝 ${message}`);
            if (data) {
                console.log('📊 Data:', data);
            }
            console.groupEnd();
        }
    }

    /**
     * 🔧 디버그 모드 확인
     */
    isDebugMode() {
        return localStorage.getItem('examDebugMode') === 'true' || 
               window.location.hostname === 'localhost';
    }

    /**
     * 📊 성능 측정
     */
    startPerformanceMeasure(name) {
        if (this.isDebugMode()) {
            performance.mark(`${name}-start`);
        }
    }

    endPerformanceMeasure(name) {
        if (this.isDebugMode()) {
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
            const measure = performance.getEntriesByName(name)[0];
            console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
        }
    }

    // ==================== 오류 처리 ====================

    /**
     * 🚨 오류 핸들링
     */
    handleError(error, context = '알 수 없는 오류') {
        console.error(`❌ ${context}:`, error);
        
        // 사용자에게 친화적인 오류 메시지 생성
        let userMessage = '';
        
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                userMessage = '네트워크 연결을 확인해주세요.';
            } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
                userMessage = '권한이 없습니다. 다시 로그인해주세요.';
            } else if (error.message.includes('timeout')) {
                userMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
            } else {
                userMessage = error.message;
            }
        } else {
            userMessage = '예상치 못한 오류가 발생했습니다.';
        }
        
        this.showToast(userMessage, 'error', 5000);
        
        // 디버그 모드에서는 상세 정보 출력
        if (this.isDebugMode()) {
            console.error('Stack trace:', error.stack);
        }
        
        return userMessage;
    }

    // ==================== 데이터 포맷팅 ====================

    /**
     * 📊 점수 포맷팅
     */
    formatScore(score, maxScore, showPercentage = true) {
        if (typeof score !== 'number' || typeof maxScore !== 'number') {
            return 'N/A';
        }
        
        let result = `${score}/${maxScore}점`;
        
        if (showPercentage && maxScore > 0) {
            const percentage = this.calculatePercentage(score, maxScore);
            result += ` (${percentage}%)`;
        }
        
        return result;
    }

    /**
     * 🏆 합격 상태 텍스트
     */
    getPassStatusText(passStatus, percentage, passScore) {
        if (passStatus) {
            return `합격 (${percentage}% ≥ ${passScore}%)`;
        } else {
            return `불합격 (${percentage}% < ${passScore}%)`;
        }
    }

    /**
     * 🎨 상태별 CSS 클래스
     */
    getStatusClass(passStatus) {
        return passStatus ? 'passed' : 'failed';
    }

    // ==================== 모듈 상태 관리 ====================

    /**
     * 📊 모듈 상태 조회
     */
    getModuleStatus() {
        return this.moduleStatus;
    }

    /**
     * 🔧 모듈 설정
     */
    configure(options = {}) {
        if (options.debugMode !== undefined) {
            localStorage.setItem('examDebugMode', options.debugMode.toString());
        }
        
        console.log('🔧 ExamStudentUtils 설정 업데이트:', options);
    }
}

// 전역에 모듈 등록
if (typeof window !== 'undefined') {
    window.ExamStudentUtils = new ExamStudentUtils();
    console.log('🛠️ ExamStudentUtils v5.2.0 모듈 로드됨');
}