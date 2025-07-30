/**
 * 관리자용 비자 발급 관리 시스템 - UI 컴포넌트 모듈
 * Version: 1.0.1
 * Description: UI 렌더링 및 상호작용 관리 - 안정성 개선
 */

class VisaManagementUI {
    constructor() {
        this.animationDuration = 300;
        this.notifications = [];
    }

    /**
     * 학생 카드 생성
     */
    createStudentCard(student, visaData, receiptsCount) {
        const visa = visaData || {};
        const receipts = receiptsCount || 0;
        
        // 상태 결정
        const status = this.determineStudentStatus(visa);
        
        return `
            <div class="student-visa-card" data-student-id="${student.id}">
                ${this.createStudentHeader(student, status, receipts)}
                ${this.createVisaStatusSection(visa)}
                ${this.createAdminCommentSection(student.id, visa)}
                ${this.createActionButtons(student.id, visa, receipts)}
            </div>
        `;
    }

    /**
     * 학생 헤더 섹션 생성
     */
    createStudentHeader(student, status, receiptsCount) {
        return `
            <div class="student-header">
                <div class="student-info">
                    <div class="student-name">
                        <i data-lucide="user"></i>
                        ${this.escapeHtml(student.name)}
                    </div>
                    <div class="student-email">${this.escapeHtml(student.email)}</div>
                    <div class="student-institute">${this.escapeHtml(student.institute_name || '학당 미지정')}</div>
                </div>
                <div class="student-meta">
                    ${this.createStatusBadge(status)}
                    <div class="receipts-count">영수증 ${receiptsCount}개</div>
                    ${this.createDateInfo(student)}
                </div>
            </div>
        `;
    }

    /**
     * 비자 상태 섹션 생성
     */
    createVisaStatusSection(visa) {
        const visaStatus = visa.visa_status || '';
        const statusUpdated = visa.visa_status_updated_at;
        
        return `
            <div class="visa-status-section">
                <h4>
                    <i data-lucide="file-text"></i>
                    비자 발급 현황 (학생 입력)
                </h4>
                <div class="status-content ${visaStatus ? '' : 'empty'}">
                    ${visaStatus || '아직 비자 발급 현황이 입력되지 않았습니다.'}
                </div>
                ${statusUpdated ? `
                    <div class="status-updated">
                        마지막 업데이트: ${this.formatDateTime(statusUpdated)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * 관리자 코멘트 섹션 생성
     */
    createAdminCommentSection(studentId, visa) {
        const adminComment = visa.admin_comment || '';
        const commentUpdated = visa.admin_comment_updated_at;
        
        return `
            <div class="admin-comment-section">
                <h4>
                    <i data-lucide="message-square"></i>
                    관리자 코멘트
                </h4>
                <textarea class="admin-comment-input" 
                          placeholder="관리자 코멘트를 입력하세요..."
                          data-student-id="${studentId}">${this.escapeHtml(adminComment)}</textarea>
                <div class="comment-controls">
                    <button class="save-comment-btn" data-student-id="${studentId}">
                        <i data-lucide="save"></i>
                        저장
                    </button>
                    <span class="save-indicator" data-student-id="${studentId}">저장됨</span>
                </div>
                ${commentUpdated ? `
                    <div class="status-updated">
                        마지막 업데이트: ${this.formatDateTime(commentUpdated)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * 액션 버튼 섹션 생성
     */
    createActionButtons(studentId, visa, receiptsCount) {
        const hasVisaDocument = visa.visa_document_url;
        
        return `
            <div class="action-buttons">
                <button class="action-btn view-visa-btn" 
                        data-student-id="${studentId}"
                        ${hasVisaDocument ? '' : 'disabled'}
                        title="${hasVisaDocument ? '비자 문서 보기' : '업로드된 비자 문서가 없습니다'}">
                    <i data-lucide="eye"></i>
                    비자보기
                </button>
                <button class="action-btn view-receipts-btn" 
                        data-student-id="${studentId}"
                        title="비자 관련 영수증 보기">
                    <i data-lucide="receipt"></i>
                    영수증보기 (${receiptsCount})
                </button>
            </div>
        `;
    }

    /**
     * 상태 배지 생성
     */
    createStatusBadge(status) {
        const statusConfig = {
            'completed': {
                icon: 'check-circle',
                text: '완료',
                class: 'completed'
            },
            'in-progress': {
                icon: 'clock',
                text: '진행 중',
                class: 'in-progress'
            },
            'no-status': {
                icon: 'alert-circle',
                text: '상태 없음',
                class: 'no-status'
            }
        };

        const config = statusConfig[status] || statusConfig['no-status'];
        
        return `
            <div class="status-badge ${config.class}">
                <i data-lucide="${config.icon}"></i>
                ${config.text}
            </div>
        `;
    }

    /**
     * 날짜 정보 생성
     */
    createDateInfo(student) {
        if (!student.actual_arrival_date && !student.actual_work_end_date) {
            return '';
        }

        return `
            <div class="date-info">
                ${student.actual_arrival_date ? `
                    <div class="date-item">
                        <i data-lucide="plane-landing"></i>
                        도착: ${this.formatDate(student.actual_arrival_date)}
                    </div>
                ` : ''}
                ${student.actual_work_end_date ? `
                    <div class="date-item">
                        <i data-lucide="plane-takeoff"></i>
                        종료: ${this.formatDate(student.actual_work_end_date)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * 학생 상태 결정
     */
    determineStudentStatus(visa) {
        if (!visa || !visa.visa_status || visa.visa_status.trim() === '') {
            return 'no-status';
        }
        
        if (visa.visa_document_url) {
            return 'completed';
        }
        
        return 'in-progress';
    }

    /**
     * 통계 카드 업데이트
     */
    updateStatistics(stats) {
        const elements = {
            'total-count': stats.total,
            'in-progress-count': stats.inProgress,
            'completed-count': stats.completed,
            'no-status-count': stats.noStatus
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateNumber(element, value);
            }
        });
    }

    /**
     * 숫자 애니메이션
     */
    animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const diff = targetValue - startValue;
        const duration = this.animationDuration;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.round(startValue + diff * progress);
            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 로딩 상태 표시
     */
    showLoading(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    데이터를 불러오는 중...
                </div>
            `;
        }
    }

    /**
     * 에러 상태 표시
     */
    showError(container, message) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i data-lucide="alert-triangle"></i>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    }

    /**
     * 빈 상태 표시
     */
    showEmpty(container, message = '표시할 학생이 없습니다.') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = `
                <div class="no-students">
                    <i data-lucide="user-x"></i>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    }

    /**
     * 저장 완료 인디케이터 표시
     */
    showSaveIndicator(studentId, message = '저장됨') {
        const indicator = document.querySelector(`.save-indicator[data-student-id="${studentId}"]`);
        if (indicator) {
            indicator.textContent = message;
            indicator.classList.add('show');
            
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }
    }

    /**
     * 토스트 알림 표시
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i data-lucide="${this.getToastIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;

        // 토스트 컨테이너가 없으면 생성
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        container.appendChild(toast);
        if (window.lucide) {
            lucide.createIcons();
        }

        // 애니메이션
        setTimeout(() => toast.classList.add('show'), 100);

        // 자동 제거
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 토스트 아이콘 가져오기
     */
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'x-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        return icons[type] || 'info';
    }

    /**
     * 모달 생성
     */
    createModal(title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <button class="modal-close" aria-label="닫기">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal-actions">
                        ${actions.map(action => `
                            <button class="modal-btn ${action.class || ''}" 
                                    data-action="${action.action || ''}">
                                ${action.icon ? `<i data-lucide="${action.icon}"></i>` : ''}
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // 이벤트 리스너
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        document.body.appendChild(modal);
        if (window.lucide) {
            lucide.createIcons();
        }

        // 애니메이션
        setTimeout(() => modal.classList.add('show'), 100);

        return modal;
    }

    /**
     * 모달 닫기
     */
    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }

    /**
     * 확인 다이얼로그
     */
    confirm(title, message, onConfirm, onCancel) {
        const modal = this.createModal(title, `<p>${this.escapeHtml(message)}</p>`, [
            {
                text: '취소',
                class: 'secondary',
                action: 'cancel'
            },
            {
                text: '확인',
                class: 'primary',
                action: 'confirm',
                icon: 'check'
            }
        ]);

        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'confirm') {
                onConfirm && onConfirm();
                this.closeModal(modal);
            } else if (action === 'cancel') {
                onCancel && onCancel();
                this.closeModal(modal);
            }
        });
    }

    /**
     * 이미지 뷰어 모달
     */
    showImageViewer(imageUrl, title = '이미지 보기') {
        const content = `
            <div class="image-viewer">
                <img src="${imageUrl}" alt="${this.escapeHtml(title)}" style="max-width: 100%; height: auto;">
            </div>
        `;

        const actions = [
            {
                text: '다운로드',
                class: 'secondary',
                action: 'download',
                icon: 'download'
            },
            {
                text: '닫기',
                class: 'primary',
                action: 'close'
            }
        ];

        const modal = this.createModal(title, content, actions);

        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'download') {
                this.downloadFile(imageUrl);
            } else if (action === 'close') {
                this.closeModal(modal);
            }
        });
    }

    /**
     * 파일 다운로드
     */
    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 날짜 포맷팅
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * 날짜/시간 포맷팅
     */
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateTimeString;
        }
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 스크롤 애니메이션
     */
    scrollToElement(element, offset = 0) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            const targetPosition = element.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

    /**
     * 페이드 인 애니메이션
     */
    fadeIn(element, duration = 300) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.style.opacity = '0';
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                element.style.opacity = '1';
            }, 10);
        }
    }

    /**
     * 페이드 아웃 애니메이션
     */
    fadeOut(element, duration = 300) {
        return new Promise((resolve) => {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            
            if (element) {
                element.style.transition = `opacity ${duration}ms ease-in-out`;
                element.style.opacity = '0';
                
                setTimeout(() => {
                    resolve();
                }, duration);
            } else {
                resolve();
            }
        });
    }

    /**
     * 반응형 레이아웃 체크
     */
    isMobile() {
        return window.innerWidth <= 768;
    }

    /**
     * 디바운스 함수
     */
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
    }

    /**
     * 스로틀 함수
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 모듈 내보내기
export { VisaManagementUI };