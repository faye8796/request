/**
 * 📝 수료평가 시스템 - 관리자 유틸리티 모듈 v5.1.0
 * 공통 유틸리티 함수, 토스트 메시지, 검증 함수 등
 * 기존 시스템과 완전 분리된 독립 모듈
 */

class ExamAdminUtils {
    constructor() {
        this.moduleStatus = {
            initialized: false,
            name: 'ExamAdminUtils',
            version: '5.1.0',
            lastUpdate: new Date().toISOString()
        };
        this.toastContainer = null;
    }

    /**
     * 🚀 모듈 초기화
     */
    async initialize() {
        try {
            console.log('🔄 ExamAdminUtils v5.1.0 초기화 시작...');
            
            // 토스트 컨테이너 생성
            this.createToastContainer();
            
            this.moduleStatus.initialized = true;
            console.log('✅ ExamAdminUtils v5.1.0 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ ExamAdminUtils 초기화 실패:', error);
            throw error;
        }
    }

    // ==================== 토스트 메시지 시스템 ====================

    /**
     * 🍞 토스트 컨테이너 생성
     */
    createToastContainer() {
        if (document.getElementById('exam-toast-container')) return;
        
        const container = document.createElement('div');
        container.id = 'exam-toast-container';
        container.className = 'exam-toast-container';
        document.body.appendChild(container);
        
        this.toastContainer = container;
    }

    /**
     * 🍞 토스트 메시지 표시
     */
    showToast(message, type = 'info', duration = 4000) {
        if (!this.toastContainer) {
            this.createToastContainer();
        }
        
        const toast = document.createElement('div');
        toast.className = `exam-toast exam-toast-${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <div class="exam-toast-content">
                <i data-lucide="${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="exam-toast-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Lucide 아이콘 업데이트
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 애니메이션 효과
        setTimeout(() => {
            toast.classList.add('exam-toast-show');
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            toast.classList.add('exam-toast-hide');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    /**
     * 🎨 토스트 아이콘 가져오기
     */
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    // ==================== 검증 함수들 ====================

    /**
     * 🔍 문제 데이터 검증
     */
    validateQuestionData(data) {
        const errors = [];
        
        // 문제 내용 검증
        if (!data.question_text || !data.question_text.trim()) {
            errors.push('문제 내용을 입력해주세요.');
        } else if (data.question_text.trim().length < 10) {
            errors.push('문제 내용은 최소 10자 이상이어야 합니다.');
        } else if (data.question_text.trim().length > 1000) {
            errors.push('문제 내용은 최대 1000자까지 입력 가능합니다.');
        }
        
        // 문제 유형 검증
        if (!data.question_type || !['multiple_choice', 'short_answer'].includes(data.question_type)) {
            errors.push('올바른 문제 유형을 선택해주세요.');
        }
        
        // 정답 검증
        if (!data.correct_answer || !data.correct_answer.trim()) {
            errors.push('정답을 입력해주세요.');
        } else if (data.correct_answer.trim().length > 200) {
            errors.push('정답은 최대 200자까지 입력 가능합니다.');
        }
        
        // 객관식 문제 추가 검증
        if (data.question_type === 'multiple_choice') {
            if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
                errors.push('객관식 문제는 최소 2개의 선택지가 필요합니다.');
            } else if (data.options.length > 5) {
                errors.push('객관식 문제는 최대 5개의 선택지까지 가능합니다.');
            } else {
                // 선택지 유효성 검사
                const validOptions = data.options.filter(option => option && option.trim());
                if (validOptions.length !== data.options.length) {
                    errors.push('모든 선택지를 입력해주세요.');
                }
                
                // 중복 선택지 검사
                const uniqueOptions = [...new Set(validOptions.map(opt => opt.trim().toLowerCase()))];
                if (uniqueOptions.length !== validOptions.length) {
                    errors.push('중복된 선택지가 있습니다.');
                }
                
                // 정답이 선택지에 포함되는지 확인
                if (!data.options.map(opt => opt.trim()).includes(data.correct_answer.trim())) {
                    errors.push('정답이 선택지에 포함되어야 합니다.');
                }
            }
        }
        
        // 배점 검증
        const points = parseInt(data.points);
        if (isNaN(points) || points < 1 || points > 10) {
            errors.push('배점은 1~10점 사이여야 합니다.');
        }
        
        return errors;
    }

    /**
     * 🔍 시험 설정 검증
     */
    validateExamSettings(settings) {
        const errors = [];
        
        // 합격 기준 점수 검증
        if (settings.pass_score !== undefined) {
            const passScore = parseInt(settings.pass_score);
            if (isNaN(passScore) || passScore < 0 || passScore > 100) {
                errors.push('합격 기준 점수는 0~100 사이여야 합니다.');
            }
        }
        
        // 시험 활성화 여부 검증
        if (settings.exam_active !== undefined) {
            if (typeof settings.exam_active !== 'boolean' && 
                !['true', 'false'].includes(settings.exam_active.toString().toLowerCase())) {
                errors.push('시험 활성화 설정이 올바르지 않습니다.');
            }
        }
        
        return errors;
    }

    // ==================== 날짜/시간 유틸리티 ====================

    /**
     * 📅 날짜 포맷팅
     */
    formatDate(dateString, options = {}) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const defaultOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                ...options
            };
            
            return date.toLocaleDateString('ko-KR', defaultOptions);
        } catch (error) {
            console.warn('날짜 포맷팅 실패:', error);
            return '-';
        }
    }

    /**
     * 🕐 날짜/시간 포맷팅
     */
    formatDateTime(dateString, options = {}) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const defaultOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                ...options
            };
            
            return date.toLocaleString('ko-KR', defaultOptions);
        } catch (error) {
            console.warn('날짜/시간 포맷팅 실패:', error);
            return '-';
        }
    }

    /**
     * ⏰ 상대적 시간 표시
     */
    getRelativeTime(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffMins < 1) return '방금 전';
            if (diffMins < 60) return `${diffMins}분 전`;
            if (diffHours < 24) return `${diffHours}시간 전`;
            if (diffDays < 7) return `${diffDays}일 전`;
            
            return this.formatDate(dateString);
        } catch (error) {
            console.warn('상대적 시간 계산 실패:', error);
            return '-';
        }
    }

    // ==================== 텍스트 유틸리티 ====================

    /**
     * ✂️ 텍스트 자르기
     */
    truncateText(text, maxLength = 100, suffix = '...') {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + suffix;
    }

    /**
     * 🔤 문자열 정규화
     */
    normalizeString(str) {
        if (!str) return '';
        return str.trim().replace(/\s+/g, ' ');
    }

    /**
     * 🎨 HTML 이스케이프
     */
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==================== 숫자 유틸리티 ====================

    /**
     * 📊 백분율 계산
     */
    calculatePercentage(value, total, decimals = 1) {
        if (!total || total === 0) return 0;
        const percentage = (value / total) * 100;
        return Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * 📈 점수 등급 계산
     */
    getScoreGrade(score, maxScore = 100) {
        const percentage = this.calculatePercentage(score, maxScore, 0);
        
        if (percentage >= 90) return { grade: 'A', color: '#22c55e' };
        if (percentage >= 80) return { grade: 'B', color: '#3b82f6' };
        if (percentage >= 70) return { grade: 'C', color: '#f59e0b' };
        if (percentage >= 60) return { grade: 'D', color: '#f97316' };
        return { grade: 'F', color: '#ef4444' };
    }

    // ==================== 로컬 스토리지 유틸리티 ====================

    /**
     * 💾 로컬 스토리지에 데이터 저장
     */
    setLocalStorage(key, value) {
        try {
            const data = {
                value: value,
                timestamp: new Date().getTime()
            };
            localStorage.setItem(`exam_admin_${key}`, JSON.stringify(data));
        } catch (error) {
            console.warn('로컬 스토리지 저장 실패:', error);
        }
    }

    /**
     * 📂 로컬 스토리지에서 데이터 가져오기
     */
    getLocalStorage(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(`exam_admin_${key}`);
            if (!stored) return defaultValue;
            
            const data = JSON.parse(stored);
            return data.value;
        } catch (error) {
            console.warn('로컬 스토리지 읽기 실패:', error);
            return defaultValue;
        }
    }

    /**
     * 🗑️ 로컬 스토리지에서 데이터 삭제
     */
    removeLocalStorage(key) {
        try {
            localStorage.removeItem(`exam_admin_${key}`);
        } catch (error) {
            console.warn('로컬 스토리지 삭제 실패:', error);
        }
    }

    // ==================== URL 유틸리티 ====================

    /**
     * 🔗 URL 파라미터 가져오기
     */
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    /**
     * 🔗 URL 파라미터 설정
     */
    setUrlParameter(name, value) {
        const url = new URL(window.location);
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(name);
        } else {
            url.searchParams.set(name, value);
        }
        window.history.replaceState({}, '', url);
    }

    // ==================== 복사 유틸리티 ====================

    /**
     * 📋 클립보드에 텍스트 복사
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // 폴백 방법
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'absolute';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            this.showToast('클립보드에 복사되었습니다.', 'success');
            return true;
        } catch (error) {
            console.error('클립보드 복사 실패:', error);
            this.showToast('클립보드 복사에 실패했습니다.', 'error');
            return false;
        }
    }

    // ==================== 디바운스/스로틀 ====================

    /**
     * 🕰️ 디바운스 함수
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * 🚦 스로틀 함수
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ==================== 기타 유틸리티 ====================

    /**
     * 🎲 UUID 생성
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 🔀 배열 셞플
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 📊 깊은 복사
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    }

    /**
     * 📊 모듈 상태 조회
     */
    getModuleStatus() {
        return this.moduleStatus;
    }
}

// 전역에 모듈 등록
if (typeof window !== 'undefined') {
    window.ExamAdminUtils = new ExamAdminUtils();
    console.log('🛠️ ExamAdminUtils v5.1.0 모듈 로드됨');
}