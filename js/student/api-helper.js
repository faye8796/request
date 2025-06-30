// API 도우미 모듈 - v5.2.0 - dashboard 덮어씌움 문제 완전 해결
// 🎯 책임: 공통 API 호출, 사용자 관리, 안전한 요청 처리
// 📦 분리 출처: student.js → api-helper.js
// 🔥 v5.2.0: dashboard 덮어씌움 문제를 일으키는 함수들 완전 삭제

const ApiHelper = {
    // === 모듈 초기화 ===
    isInitialized: false,

    // 모듈 초기화
    init: function(managerInstance) {
        try {
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ ApiHelper 초기화 오류:', error);
            return false;
        }
    },

    // === 안전한 사용자 정보 관리 ===

    // 안전한 사용자 정보 가져오기
    getCurrentUserSafely: function() {
        try {
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    if (studentData && studentData.id) {
                        return studentData;
                    }
                } catch (parseError) {
                    console.error('localStorage 데이터 파싱 오류:', parseError);
                }
            }

            if (typeof AuthManager !== 'undefined' && AuthManager.getCurrentUser) {
                const authUser = AuthManager.getCurrentUser();
                if (authUser) {
                    return authUser;
                }
            }

            console.warn('⚠️ 사용자 정보를 찾을 수 없습니다');
            return null;
        } catch (error) {
            console.error('❌ 사용자 정보 가져오기 오류:', error);
            return null;
        }
    },

    // === 안전한 API 호출 시스템 ===

    // 안전한 API 호출 래퍼
    safeApiCall: function(apiFunction) {
        try {
            if (typeof apiFunction === 'function') {
                const result = apiFunction();
                
                if (result && typeof result.then === 'function') {
                    return result.catch(function(error) {
                        console.error('API 호출 중 오류:', error);
                        if (error.message && error.message.includes('PGRST116')) {
                            return null;
                        }
                        throw error;
                    });
                }
                
                return Promise.resolve(result);
            }
            return Promise.reject(new Error('API 함수가 유효하지 않습니다'));
        } catch (error) {
            console.error('API 호출 오류:', error);
            return Promise.reject(error);
        }
    },

    // 재시도가 가능한 API 호출
    apiCallWithRetry: function(apiFunction, maxRetries = 3, delay = 1000) {
        const self = this;
        let attempt = 0;

        function tryCall() {
            attempt++;
            return self.safeApiCall(apiFunction)
                .catch(function(error) {
                    if (attempt < maxRetries) {
                        console.warn(`API 호출 실패 (${attempt}/${maxRetries}), ${delay}ms 후 재시도...`);
                        return new Promise(function(resolve) {
                            setTimeout(function() {
                                resolve(tryCall());
                            }, delay);
                        });
                    } else {
                        console.error(`API 호출 최종 실패 (${maxRetries}회 시도 완료):`, error);
                        throw error;
                    }
                });
        }

        return tryCall();
    },

    // === 예산 관리 API ===

    // 예산 현황 업데이트
    updateBudgetStatus: function() {
        try {
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없음');
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                self.displayBudgetStatus(budgetStatus);
                // 성공 로그 제거
            }).catch(function(error) {
                console.error('예산 상태 조회 API 오류:', error);
                self.showBudgetError();
            });
        } catch (error) {
            console.error('❌ 예산 현황 업데이트 오류:', error);
            this.showBudgetError();
            return Promise.resolve();
        }
    },

    // 예산 상태 표시
    displayBudgetStatus: function(budgetStatus) {
        try {
            let budgetDisplay = document.getElementById('budgetStatus');
            if (!budgetDisplay) {
                budgetDisplay = document.createElement('div');
                budgetDisplay.id = 'budgetStatus';
                budgetDisplay.className = 'budget-status-container';
                
                const userInfo = document.querySelector('.user-info');
                if (userInfo) {
                    userInfo.appendChild(budgetDisplay);
                }
            }
            
            if (!budgetStatus) {
                budgetDisplay.innerHTML = '<div class="budget-error">예산 정보를 불러올 수 없습니다.</div>';
                return;
            }

            if (budgetStatus.allocated === 0) {
                if (budgetStatus.lessonPlanStatus === 'approved') {
                    budgetDisplay.innerHTML = `
                        <div class="budget-info processing">
                            <div class="budget-status-text">
                                <i data-lucide="clock"></i>
                                <span>예산 배정 처리 중...</span>
                            </div>
                        </div>
                    `;
                } else {
                    budgetDisplay.innerHTML = `
                        <div class="budget-info not-allocated">
                            <div class="budget-status-text">
                                <i data-lucide="alert-circle"></i>
                                <span><strong>수업계획 승인 후 예산이 배정됩니다 (필수)</strong></span>
                            </div>
                        </div>
                    `;
                }
            } else {
                const usagePercentage = Math.round((budgetStatus.used / budgetStatus.allocated) * 100);
                const statusClass = usagePercentage >= 90 ? 'danger' : usagePercentage >= 70 ? 'warning' : 'safe';
                
                budgetDisplay.innerHTML = `
                    <div class="budget-info allocated">
                        <div class="budget-header">
                            <div class="budget-title">
                                <i data-lucide="wallet"></i>
                                <span>배정 예산 (${budgetStatus.field})</span>
                            </div>
                            <div class="budget-percentage ${statusClass}">${usagePercentage}%</div>
                        </div>
                        <div class="budget-bar-container">
                            <div class="budget-bar">
                                <div class="budget-progress ${statusClass}" style="width: ${Math.min(usagePercentage, 100)}%"></div>
                            </div>
                        </div>
                        <div class="budget-details">
                            <div class="budget-item">
                                <span class="label">사용:</span>
                                <span class="value">${this.formatPrice(budgetStatus.used)}</span>
                            </div>
                            <div class="budget-item">
                                <span class="label">배정:</span>
                                <span class="value">${this.formatPrice(budgetStatus.allocated)}</span>
                            </div>
                            <div class="budget-item remaining">
                                <span class="label">잔여:</span>
                                <span class="value ${budgetStatus.remaining <= 0 ? 'zero' : ''}">${this.formatPrice(budgetStatus.remaining)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('예산 상태 표시 오류:', error);
        }
    },

    // 예산 오류 표시
    showBudgetError: function() {
        try {
            let budgetDisplay = document.getElementById('budgetStatus');
            if (budgetDisplay) {
                budgetDisplay.innerHTML = `
                    <div class="budget-error">
                        <i data-lucide="wifi-off"></i>
                        예산 정보 연결 오류
                        <button class="btn small secondary" onclick="ApiHelper.updateBudgetStatus()">
                            재시도
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('예산 오류 표시 오류:', error);
        }
    },

    // === 신청 내역 관리 API ===

    // 신청 내역 로드
    loadApplications: function() {
        try {
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showEmptyApplications();
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentApplications(currentUser.id);
            }).then(function(applications) {
                // 교구 신청 모듈로 렌더링 위임
                if (window.StudentManager) {
                    const equipmentModule = window.StudentManager.getModule('equipment');
                    if (equipmentModule && equipmentModule.renderApplications) {
                        equipmentModule.renderApplications(applications);
                    } else {
                        // 폴백: 기본 렌더링
                        self.renderApplicationsFallback(applications);
                    }
                } else {
                    self.renderApplicationsFallback(applications);
                }
                
                return self.updateBudgetStatus();
            }).then(function() {
                // 성공 로그 제거
            }).catch(function(error) {
                console.error('신청 내역 조회 API 오류:', error);
                self.showApplicationsError();
            });
        } catch (error) {
            console.error('❌ 신청 내역 로드 오류:', error);
            this.showApplicationsError();
            return Promise.resolve();
        }
    },

    // 폴백 렌더링 (모듈이 없는 경우)
    renderApplicationsFallback: function(applications) {
        try {
            const container = document.getElementById('studentApplications');
            const emptyState = document.getElementById('noApplications');
            
            if (!applications || applications.length === 0) {
                if (container) container.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }

            if (container) container.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            
            if (container) {
                container.innerHTML = '<div class="loading-message">신청 내역을 준비 중입니다...</div>';
            }
        } catch (error) {
            console.error('❌ 폴백 렌더링 오류:', error);
        }
    },

    // 빈 신청 내역 표시
    showEmptyApplications: function() {
        try {
            const container = document.getElementById('studentApplications');
            const emptyState = document.getElementById('noApplications');
            
            if (container) container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        } catch (error) {
            console.error('빈 신청 내역 표시 오류:', error);
        }
    },

    // 신청 내역 오류 표시
    showApplicationsError: function() {
        try {
            const container = document.getElementById('studentApplications');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <i data-lucide="alert-circle" style="width: 3rem; height: 3rem; color: #ef4444;"></i>
                        <h3>신청 내역을 불러올 수 없습니다</h3>
                        <p>네트워크 연결을 확인하고 다시 시도해주세요.</p>
                        <button class="btn secondary" onclick="ApiHelper.loadApplications()">
                            🔄 다시 시도
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('신청 내역 오류 표시 오류:', error);
        }
    },

    // === 공통 유틸리티 함수들 ===

    // 안전한 이벤트 리스너 추가
    safeAddEventListener: function(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
                // 로그 제거 - 학생 사용 시 불필요
            } else {
                console.warn('요소를 찾을 수 없음: ' + selector);
            }
        } catch (error) {
            console.error('이벤트 리스너 추가 오류 (' + selector + '):', error);
        }
    },

    // 가격 포맷팅
    formatPrice: function(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    // HTML 이스케이프
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 현재 시간 포맷팅
    formatTimestamp: function(timestamp) {
        try {
            if (!timestamp) return '알 수 없음';
            
            const date = new Date(timestamp);
            return date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('시간 포맷팅 오류:', error);
            return '시간 오류';
        }
    },

    // 문자열 검증
    validateString: function(str, minLength = 1, maxLength = 1000) {
        if (typeof str !== 'string') return false;
        if (str.trim().length < minLength) return false;
        if (str.length > maxLength) return false;
        return true;
    },

    // 숫자 검증
    validateNumber: function(num, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const parsed = typeof num === 'string' ? parseFloat(num) : num;
        if (isNaN(parsed)) return false;
        if (parsed < min || parsed > max) return false;
        return true;
    },

    // === 대시보드 새로고침 ===

    // 대시보드 데이터 새로고침
    refreshDashboardData: function() {
        try {
            const self = this;
            
            return this.loadApplications()
                .then(function() {
                    return self.updateBudgetStatus();
                })
                .then(function() {
                    // 수업계획 상태는 LessonPlanHelper로 위임
                    if (window.LessonPlanHelper && window.LessonPlanHelper.checkLessonPlanStatus) {
                        return window.LessonPlanHelper.checkLessonPlanStatus();
                    }
                    return Promise.resolve();
                })
                .then(function() {
                    // 성공 로그 제거
                })
                .catch(function(error) {
                    console.error('❌ 대시보드 데이터 새로고침 오류:', error);
                });
        } catch (error) {
            console.error('❌ 대시보드 데이터 새로고침 오류:', error);
            return Promise.resolve();
        }
    },

    // === 연결 상태 확인 ===

    // 네트워크 연결 상태 확인
    checkNetworkConnection: function() {
        try {
            return navigator.onLine;
        } catch (error) {
            console.error('네트워크 상태 확인 오류:', error);
            return true; // 기본값으로 연결됨으로 가정
        }
    },

    // 서버 연결 상태 확인 (간단한 ping)
    checkServerConnection: function() {
        return this.safeApiCall(function() {
            // 간단한 API 호출로 서버 상태 확인
            return SupabaseAPI.checkConnection ? SupabaseAPI.checkConnection() : Promise.resolve(true);
        }).then(function(result) {
            // 연결 상태 로그 제거 - 학생 사용 시 불필요
            return result;
        }).catch(function(error) {
            console.error('서버 연결 확인 오류:', error);
            return false;
        });
    }
};

// 전역 접근을 위한 window 객체에 추가
window.ApiHelper = ApiHelper;

console.log('🔗 ApiHelper v5.2.0 로드 완료 - Dashboard 덮어씌움 문제 완전 해결');
