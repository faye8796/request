// 알림 시스템 모듈 - E단계 (v4.0)
// 🎯 책임: 통합 알림 관리, 메시지 표시, 상태 알림
// 📦 분리 출처: student.js → notification-system.js

const NotificationSystem = {
    // === 모듈 초기화 ===
    isInitialized: false,
    noticeDisplayed: false,

    // 모듈 초기화
    init: function(managerInstance) {
        try {
            console.log('📢 NotificationSystem 초기화 시작');
            this.isInitialized = true;
            console.log('✅ NotificationSystem 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ NotificationSystem 초기화 오류:', error);
            return false;
        }
    },

    // === 기본 알림 시스템 ===

    // 기본 알림 표시
    showBasicNotice: function(message, type = 'info') {
        try {
            this.removeExistingNotices(['basicNotice']);

            const notice = document.createElement('div');
            notice.id = 'basicNotice';
            notice.className = 'dashboard-notice ' + type;
            
            let icon = 'info';
            if (type === 'warning') icon = 'alert-triangle';
            else if (type === 'danger') icon = 'alert-circle';
            else if (type === 'success') icon = 'check-circle';
            
            notice.innerHTML = `
                <div class="notice-content ${type}">
                    <i data-lucide="${icon}"></i>
                    <div>
                        <h4>시스템 상태</h4>
                        <p>${message}</p>
                    </div>
                </div>
            `;

            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }

                // 자동 숨김 (5초 후)
                setTimeout(() => {
                    if (notice && notice.parentNode) {
                        notice.remove();
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('기본 알림 표시 오류:', error);
        }
    },

    // 성공 알림
    showSuccessNotice: function(title, message, actionButton = null) {
        this.displayNotice(`
            <div class="notice-content success">
                <i data-lucide="check-circle"></i>
                <div>
                    <h4>✅ ${title}</h4>
                    <p>${message}</p>
                    ${actionButton ? actionButton : ''}
                </div>
            </div>
        `, 'success');
    },

    // 경고 알림
    showWarningNotice: function(title, message, actionButton = null) {
        this.displayNotice(`
            <div class="notice-content warning">
                <i data-lucide="alert-triangle"></i>
                <div>
                    <h4>⚠️ ${title}</h4>
                    <p>${message}</p>
                    ${actionButton ? actionButton : ''}
                </div>
            </div>
        `, 'warning');
    },

    // 오류 알림
    showErrorNotice: function(title, message, actionButton = null) {
        this.displayNotice(`
            <div class="notice-content danger">
                <i data-lucide="alert-circle"></i>
                <div>
                    <h4>❌ ${title}</h4>
                    <p>${message}</p>
                    ${actionButton ? actionButton : ''}
                </div>
            </div>
        `, 'danger');
    },

    // 정보 알림
    showInfoNotice: function(title, message, actionButton = null) {
        this.displayNotice(`
            <div class="notice-content info">
                <i data-lucide="info"></i>
                <div>
                    <h4>ℹ️ ${title}</h4>
                    <p>${message}</p>
                    ${actionButton ? actionButton : ''}
                </div>
            </div>
        `, 'info');
    },

    // === 시스템 상태 알림 ===

    // 로딩 알림
    showLoadingNotice: function(message = '데이터를 불러오는 중...') {
        this.displayNotice(`
            <div class="notice-content loading">
                <i data-lucide="loader" class="loading-spinner"></i>
                <div>
                    <h4>⏳ 처리 중</h4>
                    <p>${message}</p>
                </div>
            </div>
        `, 'loading');
    },

    // 연결 오류 알림
    showConnectionErrorNotice: function() {
        this.showErrorNotice(
            '연결 오류',
            '서버와의 연결에 문제가 있습니다. 네트워크 연결을 확인하고 다시 시도해주세요.',
            '<button class="btn secondary small" onclick="location.reload()">🔄 새로고침</button>'
        );
    },

    // API 오류 알림
    showApiErrorNotice: function(customMessage = null) {
        const message = customMessage || '서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
        this.showErrorNotice(
            '서버 오류',
            message,
            '<button class="btn secondary small" onclick="location.reload()">🔄 새로고침</button>'
        );
    },

    // === 폴백 인터페이스 알림 ===

    // 폴백 인터페이스 표시
    showFallbackInterface: function() {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            if (welcomeEl) {
                welcomeEl.textContent = '학생 대시보드';
            }
            this.showBasicNotice('⚠️ 일부 기능을 불러오는 중입니다. 잠시만 기다려주세요.', 'warning');
        } catch (error) {
            console.error('폴백 인터페이스 표시 오류:', error);
        }
    },

    // 기능 준비 중 알림
    showFeaturePreparingNotice: function(featureName) {
        this.showInfoNotice(
            '기능 준비 중',
            `${featureName} 기능을 준비 중입니다. 잠시만 기다려주세요.`
        );
    },

    // === 사용자 행동 유도 알림 ===

    // 로그인 필요 알림
    showLoginRequiredNotice: function() {
        this.showWarningNotice(
            '로그인 필요',
            '이 기능을 사용하려면 로그인이 필요합니다.',
            '<button class="btn primary small" onclick="location.href=\'/\'">🔐 로그인하기</button>'
        );
    },

    // 권한 부족 알림
    showPermissionDeniedNotice: function(requiredPermission = '') {
        const message = requiredPermission 
            ? `이 기능을 사용하려면 ${requiredPermission} 권한이 필요합니다.`
            : '이 기능을 사용할 권한이 없습니다.';
            
        this.showWarningNotice('권한 부족', message);
    },

    // 데이터 없음 알림
    showNoDataNotice: function(dataType = '데이터') {
        this.showInfoNotice(
            '데이터 없음',
            `표시할 ${dataType}가 없습니다.`
        );
    },

    // === 진행 상황 알림 ===

    // 진행률 알림 (프로그레스 바 포함)
    showProgressNotice: function(title, progress, total, message = '') {
        const percentage = Math.round((progress / total) * 100);
        
        this.displayNotice(`
            <div class="notice-content progress">
                <i data-lucide="trending-up"></i>
                <div class="progress-content">
                    <h4>📊 ${title}</h4>
                    <p>${message}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="progress-text">${progress}/${total} (${percentage}%)</span>
                    </div>
                </div>
            </div>
        `, 'progress');
    },

    // 완료 알림
    showCompletionNotice: function(title, message, nextAction = null) {
        this.showSuccessNotice(
            title,
            message,
            nextAction || '<button class="btn success small" onclick="location.reload()">✨ 완료</button>'
        );
    },

    // === 특수 상황 알림 ===

    // 유지보수 모드 알림
    showMaintenanceNotice: function(endTime = null) {
        const timeMessage = endTime ? ` (예상 완료: ${endTime})` : '';
        this.showWarningNotice(
            '시스템 유지보수',
            `현재 시스템 유지보수가 진행 중입니다${timeMessage}. 일시적으로 일부 기능이 제한될 수 있습니다.`
        );
    },

    // 브라우저 호환성 알림
    showBrowserCompatibilityNotice: function() {
        this.showWarningNotice(
            '브라우저 호환성',
            '일부 기능이 현재 브라우저에서 제한될 수 있습니다. 최신 버전의 Chrome, Firefox, Safari를 사용하시길 권장합니다.'
        );
    },

    // === 인터랙티브 알림 ===

    // 확인 대화상자 (알림 형태)
    showConfirmationNotice: function(title, message, onConfirm, onCancel = null) {
        const confirmId = 'confirm-' + Date.now();
        const cancelId = 'cancel-' + Date.now();
        
        this.displayNotice(`
            <div class="notice-content confirmation">
                <i data-lucide="help-circle"></i>
                <div>
                    <h4>🤔 ${title}</h4>
                    <p>${message}</p>
                    <div class="notice-actions">
                        <button id="${confirmId}" class="btn primary small">✅ 확인</button>
                        <button id="${cancelId}" class="btn secondary small">❌ 취소</button>
                    </div>
                </div>
            </div>
        `, 'confirmation');

        // 이벤트 리스너 추가
        setTimeout(() => {
            const confirmBtn = document.getElementById(confirmId);
            const cancelBtn = document.getElementById(cancelId);
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.removeExistingNotices();
                    if (onConfirm) onConfirm();
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.removeExistingNotices();
                    if (onCancel) onCancel();
                });
            }
        }, 100);
    },

    // 입력 요청 알림
    showInputNotice: function(title, placeholder, onSubmit, validation = null) {
        const inputId = 'input-' + Date.now();
        const submitId = 'submit-' + Date.now();
        
        this.displayNotice(`
            <div class="notice-content input">
                <i data-lucide="edit"></i>
                <div>
                    <h4>✏️ ${title}</h4>
                    <div class="notice-input-group">
                        <input type="text" id="${inputId}" placeholder="${placeholder}" class="notice-input">
                        <button id="${submitId}" class="btn primary small">입력</button>
                    </div>
                </div>
            </div>
        `, 'input');

        // 이벤트 리스너 추가
        setTimeout(() => {
            const input = document.getElementById(inputId);
            const submitBtn = document.getElementById(submitId);
            
            if (input && submitBtn) {
                const handleSubmit = () => {
                    const value = input.value.trim();
                    
                    if (validation && !validation(value)) {
                        input.style.borderColor = '#ef4444';
                        return;
                    }
                    
                    this.removeExistingNotices();
                    if (onSubmit) onSubmit(value);
                };
                
                submitBtn.addEventListener('click', handleSubmit);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') handleSubmit();
                });
                
                input.focus();
            }
        }, 100);
    },

    // === 알림 관리 유틸리티 ===

    // 기존 알림 제거
    removeExistingNotices: function(specificIds = null) {
        try {
            const defaultSelectors = [
                '#lessonPlanNotice',
                '#basicNotice',
                '.dashboard-notice',
                '.lesson-plan-notice',
                '.notice-duplicate'
            ];

            const selectorsToRemove = specificIds ? specificIds.map(id => '#' + id) : defaultSelectors;

            selectorsToRemove.forEach(function(selector) {
                const notices = document.querySelectorAll(selector);
                for (let i = 0; i < notices.length; i++) {
                    const notice = notices[i];
                    if (notice && notice.parentNode) {
                        notice.parentNode.removeChild(notice);
                    }
                }
            });
        } catch (error) {
            console.error('기존 알림 제거 오류:', error);
        }
    },

    // 알림 표시 (공통 함수)
    displayNotice: function(content, type, id = null) {
        try {
            this.removeExistingNotices();
            
            const notice = document.createElement('div');
            notice.id = id || 'systemNotice';
            notice.className = 'dashboard-notice ' + type;
            notice.innerHTML = content;
            
            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader && dashboardHeader.parentNode) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                console.log('✅ 알림 표시됨:', type);
            }
        } catch (error) {
            console.error('알림 표시 오류:', error);
        }
    },

    // 모든 알림 숨김
    hideAllNotices: function() {
        this.removeExistingNotices();
        console.log('🗑️ 모든 알림이 제거되었습니다');
    },

    // 임시 알림 (자동 사라짐)
    showTemporaryNotice: function(message, type = 'info', duration = 3000) {
        const noticeId = 'temp-notice-' + Date.now();
        
        this.displayNotice(`
            <div class="notice-content ${type}">
                <i data-lucide="clock"></i>
                <div>
                    <p>${message}</p>
                </div>
            </div>
        `, type, noticeId);

        setTimeout(() => {
            const notice = document.getElementById(noticeId);
            if (notice) {
                notice.remove();
            }
        }, duration);
    },

    // === 알림 상태 관리 ===

    // 알림 표시 여부 확인
    hasNoticeDisplayed: function() {
        return this.noticeDisplayed;
    },

    // 알림 표시 상태 설정
    setNoticeDisplayed: function(displayed) {
        this.noticeDisplayed = displayed;
    },

    // 알림 표시 상태 초기화
    resetNoticeState: function() {
        this.noticeDisplayed = false;
        this.removeExistingNotices();
    }
};

// 전역 접근을 위한 window 객체에 추가
window.NotificationSystem = NotificationSystem;

// 간편한 전역 함수들
window.showNotice = function(message, type = 'info') {
    NotificationSystem.showBasicNotice(message, type);
};

window.showSuccess = function(title, message) {
    NotificationSystem.showSuccessNotice(title, message);
};

window.showWarning = function(title, message) {
    NotificationSystem.showWarningNotice(title, message);
};

window.showError = function(title, message) {
    NotificationSystem.showErrorNotice(title, message);
};

console.log('📢 NotificationSystem v4.0 로드 완료 - 통합 알림 관리 모듈');
