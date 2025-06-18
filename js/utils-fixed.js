// 공통 유틸리티 함수들 - 브라우저 호환성 개선 및 구문 오류 완전 해결
const Utils = {
    // 날짜 포맷팅 - 개선된 버전
    formatDate: function(dateString) {
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

    // 날짜시간 포맷팅 - 개선된 버전
    formatDateTime: function(dateString) {
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

    // 간단한 날짜 포맷팅 (YYYY-MM-DD) - 개선된 버전
    formatDateSimple: function(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.error('간단 날짜 포맷팅 오류:', error);
            return dateString;
        }
    },

    // 날짜 차이 계산 (일 단위) - 개선된 버전
    calculateDaysBetween: function(startDate, endDate) {
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

    // 주차 계산 - 개선된 버전
    calculateWeeksBetween: function(startDate, endDate) {
        try {
            const days = this.calculateDaysBetween(startDate, endDate);
            return Math.ceil(days / 7);
        } catch (error) {
            console.error('주차 계산 오류:', error);
            return 0;
        }
    },

    // 가격 포맷팅 - 개선된 버전
    formatPrice: function(price) {
        try {
            return parseInt(price).toLocaleString('ko-KR') + '원';
        } catch (error) {
            console.error('가격 포맷팅 오류:', error);
            return price + '원';
        }
    },

    // DOM 요소 생성 헬퍼 - 개선된 버전
    createElement: function(tag, className, content) {
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

    // DOM 요소 선택 헬퍼 - 개선된 버전
    $: function(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.error('DOM 요소 선택 오류:', error);
            return null;
        }
    },

    $$: function(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (error) {
            console.error('DOM 요소 선택 오류 (다중):', error);
            return [];
        }
    },

    // 이벤트 리스너 추가 헬퍼 - 개선된 버전
    on: function(element, event, handler) {
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

    // 요소 표시/숨김 - 개선된 버전
    show: function(element) {
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

    hide: function(element) {
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
    // 개선된 알림 시스템 (브라우저 호환성 강화)
    // ===================

    // 토스트 컨테이너 생성 (한 번만 실행) - 개선된 버전
    _ensureToastContainer: function() {
        try {
            var container = this.$('#toast-container');
            if (!container) {
                container = this.createElement('div', 'toast-container');
                container.id = 'toast-container';
                container.style.cssText = 
                    'position: fixed;' +
                    'top: 20px;' +
                    'right: 20px;' +
                    'z-index: 10000;' +
                    'display: flex;' +
                    'flex-direction: column;' +
                    'gap: 10px;' +
                    'pointer-events: none;';
                document.body.appendChild(container);
            }
            return container;
        } catch (error) {
            console.error('토스트 컨테이너 생성 오류:', error);
            return null;
        }
    },

    // 토스트 알림 표시 (브라우저 호환성 강화) - 개선된 버전
    showToast: function(message, type, duration) {
        var self = this;
        type = type || 'info';
        duration = duration || 3000;
        
        try {
            var container = this._ensureToastContainer();
            if (!container) return;
            
            var toast = this.createElement('div', 'toast toast-' + type);
            toast.style.cssText = 
                'background: ' + this._getToastColor(type) + ';' +
                'color: white;' +
                'padding: 12px 20px;' +
                'border-radius: 6px;' +
                'box-shadow: 0 4px 12px rgba(0,0,0,0.15);' +
                'margin-bottom: 10px;' +
                'opacity: 0;' +
                'transform: translateX(100%);' +
                'transition: all 0.3s ease;' +
                'pointer-events: auto;' +
                'max-width: 400px;' +
                'word-wrap: break-word;' +
                'font-size: 14px;' +
                'line-height: 1.4;';
            
            // 아이콘 추가
            var icon = this._getToastIcon(type);
            toast.innerHTML = 
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<span>' + icon + '</span>' +
                    '<span>' + message + '</span>' +
                '</div>';
            
            container.appendChild(toast);
            
            // 애니메이션 효과
            setTimeout(function() {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            }, 10);
            
            // 자동 제거
            setTimeout(function() {
                self._removeToast(toast);
            }, duration);
            
            // 클릭으로 제거
            toast.addEventListener('click', function() {
                self._removeToast(toast);
            });
            
        } catch (error) {
            console.error('토스트 알림 생성 실패:', error);
            // 폴백으로 기본 alert 사용
            alert(message);
        }
    },

    // 토스트 제거 헬퍼 함수 - 개선된 버전
    _removeToast: function(toast) {
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

    // 토스트 색상 결정 - 개선된 버전
    _getToastColor: function(type) {
        var colors = {
            'success': '#10b981',
            'error': '#ef4444', 
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || colors.info;
    },

    // 토스트 아이콘 결정 - 개선된 버전
    _getToastIcon: function(type) {
        var icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || icons.info;
    },

    // 개선된 알림 메시지 표시 - 브라우저 호환성 강화
    showAlert: function(message, type) {
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

    // 폼 데이터 수집 - 개선된 버전
    getFormData: function(formElement) {
        try {
            var formData = new FormData(formElement);
            var data = {};
            
            // FormData.entries() 호환성 처리
            if (formData.entries) {
                var iterator = formData.entries();
                var entry = iterator.next();
                while (!entry.done) {
                    data[entry.value[0]] = entry.value[1];
                    entry = iterator.next();
                }
            } else {
                // 구형 브라우저 폴백
                var inputs = formElement.querySelectorAll('input, select, textarea');
                for (var i = 0; i < inputs.length; i++) {
                    var input = inputs[i];
                    if (input.name) {
                        data[input.name] = input.value;
                    }
                }
            }
            
            return data;
        } catch (error) {
            console.error('폼 데이터 수집 오류:', error);
            return {};
        }
    },

    // 입력 필드 검증 - 개선된 버전
    validateRequired: function(value, fieldName) {
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

    validateEmail: function(email) {
        try {
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        } catch (error) {
            console.error('이메일 검증 오류:', error);
            return false;
        }
    },

    // 브라우저 지원 확인 - 개선된 버전
    browserSupport: {
        // LocalStorage 지원 확인
        hasLocalStorage: function() {
            try {
                var test = 'test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        },

        // Promise 지원 확인
        hasPromise: function() {
            return typeof Promise !== 'undefined';
        },

        // async/await 지원 확인 (간접적)
        hasAsyncAwait: function() {
            try {
                return eval('(async function(){})').constructor === (function(){}).constructor;
            } catch (e) {
                return false;
            }
        }
    },

    // ===================
    // 안전한 비동기 처리 헬퍼 (브라우저 호환성 강화)
    // ===================

    // Promise 기반 안전한 API 호출 - 개선된 버전
    safeApiCall: function(apiFunction) {
        var self = this;
        
        // Promise 지원 확인
        if (!this.browserSupport.hasPromise()) {
            console.error('이 브라우저는 Promise를 지원하지 않습니다');
            return Promise.reject(new Error('Promise not supported'));
        }

        try {
            return new Promise(function(resolve, reject) {
                try {
                    var result = apiFunction();
                    
                    // 결과가 Promise인 경우
                    if (result && typeof result.then === 'function') {
                        result
                            .then(function(data) {
                                resolve(data);
                            })
                            .catch(function(error) {
                                console.error('API 호출 오류:', error);
                                reject(error);
                            });
                    } else {
                        // 동기 결과인 경우
                        resolve(result);
                    }
                } catch (error) {
                    console.error('API 함수 실행 오류:', error);
                    reject(error);
                }
            });
        } catch (error) {
            console.error('safeApiCall 오류:', error);
            return Promise.reject(error);
        }
    },

    // 안전한 로컬 스토리지 접근 - 개선된 버전
    safeLocalStorage: {
        getItem: function(key, defaultValue) {
            defaultValue = defaultValue || null;
            try {
                if (Utils.browserSupport.hasLocalStorage()) {
                    var item = localStorage.getItem(key);
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
    },

    // ===================
    // 연결 상태 확인 (브라우저 호환성 강화)
    // ===================

    // 연결 상태 확인 - Promise 기반으로 개선
    checkConnection: function() {
        var self = this;
        
        return new Promise(function(resolve) {
            try {
                if (!navigator.onLine) {
                    resolve({ 
                        connected: false, 
                        message: '인터넷 연결이 없습니다.' 
                    });
                    return;
                }

                // Supabase 연결 테스트
                if (window.SupabaseAPI && typeof window.SupabaseAPI.testConnection === 'function') {
                    // 기존 API가 Promise를 반환하는지 확인
                    try {
                        var result = window.SupabaseAPI.testConnection();
                        if (result && typeof result.then === 'function') {
                            // Promise 기반
                            result
                                .then(function(apiResult) {
                                    if (apiResult.success) {
                                        resolve({ 
                                            connected: true, 
                                            message: '연결 상태가 양호합니다.' 
                                        });
                                    } else {
                                        resolve({ 
                                            connected: false, 
                                            message: '데이터베이스 연결에 문제가 있습니다.' 
                                        });
                                    }
                                })
                                .catch(function(apiError) {
                                    console.error('API 연결 테스트 오류:', apiError);
                                    resolve({ 
                                        connected: false, 
                                        message: '서버 연결 확인 중 오류가 발생했습니다.' 
                                    });
                                });
                        } else {
                            // 동기 결과
                            if (result && result.success) {
                                resolve({ 
                                    connected: true, 
                                    message: '연결 상태가 양호합니다.' 
                                });
                            } else {
                                resolve({ 
                                    connected: false, 
                                    message: '데이터베이스 연결에 문제가 있습니다.' 
                                });
                            }
                        }
                    } catch (apiError) {
                        console.error('API 연결 테스트 오류:', apiError);
                        resolve({ 
                            connected: false, 
                            message: '서버 연결 확인 중 오류가 발생했습니다.' 
                        });
                    }
                } else {
                    resolve({ 
                        connected: false, 
                        message: '서비스가 초기화되지 않았습니다.' 
                    });
                }
            } catch (error) {
                console.error('연결 상태 확인 오류:', error);
                resolve({ 
                    connected: false, 
                    message: '연결 상태를 확인할 수 없습니다.' 
                });
            }
        });
    },

    // 시스템 상태 표시 - Promise 기반으로 개선
    showSystemStatus: function() {
        var self = this;
        
        return this.checkConnection()
            .then(function(status) {
                var type = status.connected ? 'success' : 'warning';
                self.showToast(status.message, type);
                return status;
            })
            .catch(function(error) {
                console.error('시스템 상태 표시 오류:', error);
                self.showToast('시스템 상태를 확인할 수 없습니다.', 'error');
                return { connected: false, message: '상태 확인 실패' };
            });
    }
};

// 전역 이벤트 리스너 등록 - 브라우저 호환성 강화
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 키보드 단축키 활성화
        document.addEventListener('keydown', function(event) {
            try {
                // Ctrl/Cmd + Enter: 폼 제출
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    var activeForm = document.activeElement.closest('form');
                    if (activeForm) {
                        event.preventDefault();
                        var submitEvent = document.createEvent('Event');
                        submitEvent.initEvent('submit', true, true);
                        activeForm.dispatchEvent(submitEvent);
                    }
                }
                
                // ESC: 모달 닫기
                if (event.key === 'Escape' || event.keyCode === 27) {
                    var activeModal = document.querySelector('.modal.active, .modal.show');
                    if (activeModal) {
                        activeModal.classList.remove('active', 'show');
                    }
                }
            } catch (error) {
                console.error('키보드 단축키 처리 오류:', error);
            }
        });
        
        // Lucide 아이콘 초기화 (안전하게)
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        
        // 연결 상태 모니터링 (선택적)
        if (window.CONFIG && window.CONFIG.DEV && window.CONFIG.DEV.DEBUG) {
            setTimeout(function() {
                Utils.checkConnection()
                    .then(function(status) {
                        console.log('시스템 연결 상태:', status);
                    })
                    .catch(function(error) {
                        console.error('연결 상태 확인 실패:', error);
                    });
            }, 3000);
        }
    } catch (error) {
        console.error('DOMContentLoaded 이벤트 처리 오류:', error);
    }
});

// 전역 에러 핸들러 - 개선된 버전
window.addEventListener('error', function(event) {
    try {
        console.error('전역 JavaScript 에러:', event.error || event.message);
        
        // 에러 로그 저장 (가능한 경우)
        if (Utils.browserSupport.hasLocalStorage()) {
            try {
                var errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
                errorLog.push({
                    timestamp: new Date().toISOString(),
                    message: event.error ? event.error.message : event.message || 'Unknown error',
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
            Utils.showToast('JavaScript 오류: ' + (event.error ? event.error.message : event.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('전역 에러 핸들러 처리 오류:', error);
    }
});

// 네트워크 상태 변화 감지 - 브라우저 호환성 강화
if ('onLine' in navigator) {
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
}

// 전역 접근을 위해 window 객체에 추가
window.Utils = Utils;

// 모듈 로드 완료 메시지
console.log('🛠️ Utils loaded successfully - 브라우저 호환성 강화 및 구문 오류 완전 해결');
