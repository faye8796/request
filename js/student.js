// 학생 기능 관리 모듈
const StudentManager = {
    // 초기화
    init() {
        this.setupEventListeners();
        this.updateUserDisplay();
        this.loadApplications();
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 새 교구 신청 버튼
        Utils.on('#newApplicationBtn', 'click', () => this.showApplicationModal());

        // 모달 관련 이벤트
        Utils.on('#cancelBtn', 'click', () => this.hideApplicationModal());
        Utils.on('#applicationModal', 'click', (e) => {
            if (e.target.id === 'applicationModal') {
                this.hideApplicationModal();
            }
        });

        // 신청 폼 제출
        Utils.on('#applicationForm', 'submit', (e) => {
            e.preventDefault();
            this.handleApplicationSubmit();
        });

        // 모달 내 Enter 키 이벤트
        this.setupModalKeyEvents();
    },

    // 모달 내 키보드 이벤트 설정
    setupModalKeyEvents() {
        const inputs = ['#itemName', '#itemPurpose', '#itemPrice', '#itemLink'];
        
        inputs.forEach(selector => {
            Utils.on(selector, 'keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const form = Utils.$('#applicationForm');
                    form.dispatchEvent(new Event('submit'));
                }
            });
        });
    },

    // 사용자 정보 표시 업데이트
    updateUserDisplay() {
        AuthManager.updateUserDisplay();
    },

    // 신청 내역 로드
    loadApplications() {
        const studentId = DataManager.currentUser.id;
        const applications = DataManager.getStudentApplications(studentId);
        
        this.renderApplications(applications);
    },

    // 신청 내역 렌더링
    renderApplications(applications) {
        const container = Utils.$('#studentApplications');
        const emptyState = Utils.$('#noApplications');
        
        if (!applications || applications.length === 0) {
            Utils.hide(container);
            Utils.show(emptyState);
            return;
        }

        Utils.show(container);
        Utils.hide(emptyState);
        
        container.innerHTML = '';
        
        applications.forEach(application => {
            const applicationCard = this.createApplicationCard(application);
            container.appendChild(applicationCard);
        });

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // 신청 카드 생성
    createApplicationCard(application) {
        const card = Utils.createElement('div', 'application-card');
        
        const statusClass = DataManager.getStatusClass(application.status);
        const statusText = DataManager.getStatusText(application.status);
        
        card.innerHTML = `
            <div class="application-card-header">
                <div>
                    <h3>${this.escapeHtml(application.name)}</h3>
                    <p class="purpose">${this.escapeHtml(application.purpose)}</p>
                </div>
                <span class="status-badge ${statusClass} student-status">${statusText}</span>
            </div>
            
            <div class="application-details">
                <div class="detail-item">
                    <span class="detail-label">예상 가격</span>
                    <span class="detail-value price-value">${Utils.formatPrice(application.price)}</span>
                </div>
                ${application.link ? `
                    <div class="detail-item">
                        <span class="detail-label">구매 링크</span>
                        <span class="detail-value">
                            <a href="${this.escapeHtml(application.link)}" target="_blank" rel="noopener noreferrer">
                                링크 보기 ${Utils.createIcon('external-link', 'inline-icon')}
                            </a>
                        </span>
                    </div>
                ` : ''}
            </div>
            
            ${application.rejectionReason ? `
                <div class="rejection-reason">
                    <div class="reason-label">반려 사유</div>
                    <div class="reason-text">${this.escapeHtml(application.rejectionReason)}</div>
                </div>
            ` : ''}
        `;
        
        return card;
    },

    // 신청 모달 표시
    showApplicationModal() {
        const modal = Utils.$('#applicationModal');
        modal.classList.add('active');
        
        // 첫 번째 입력 필드에 포커스
        setTimeout(() => {
            Utils.$('#itemName').focus();
        }, 100);
    },

    // 신청 모달 숨김
    hideApplicationModal() {
        const modal = Utils.$('#applicationModal');
        modal.classList.remove('active');
        
        // 폼 초기화
        Utils.resetForm('#applicationForm');
    },

    // 신청 제출 처리
    handleApplicationSubmit() {
        const formData = this.getFormData();
        
        // 입력 검증
        if (!this.validateFormData(formData)) {
            return;
        }

        // 제출 버튼 로딩 상태
        const submitBtn = Utils.$('#applicationForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        // 데이터 저장 (실제로는 서버 전송)
        setTimeout(() => {
            try {
                const studentId = DataManager.currentUser.id;
                DataManager.addApplication(studentId, formData);
                
                // 성공 처리
                Utils.hideLoading(submitBtn);
                this.hideApplicationModal();
                this.loadApplications(); // 목록 새로고침
                Utils.showAlert('교구 신청이 완료되었습니다.');
                
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
                console.error('Application submission error:', error);
            }
        }, 1000);
    },

    // 폼 데이터 수집
    getFormData() {
        return {
            name: Utils.$('#itemName').value.trim(),
            purpose: Utils.$('#itemPurpose').value.trim(),
            price: parseInt(Utils.$('#itemPrice').value.trim()),
            link: Utils.$('#itemLink').value.trim()
        };
    },

    // 폼 데이터 검증
    validateFormData(data) {
        // 필수 필드 검증
        if (!Utils.validateRequired(data.name, '교구명')) return false;
        if (!Utils.validateRequired(data.purpose, '사용 목적')) return false;
        if (!data.price || data.price <= 0) {
            Utils.showAlert('올바른 가격을 입력해주세요.');
            return false;
        }

        // 가격 범위 검증
        if (data.price > 1000000) {
            Utils.showAlert('가격이 너무 높습니다. 100만원 이하로 입력해주세요.');
            return false;
        }

        // URL 검증 (선택사항)
        if (data.link && !Utils.validateURL(data.link)) {
            Utils.showAlert('올바른 URL 형식을 입력해주세요.');
            return false;
        }

        // 사용 목적 길이 검증
        if (data.purpose.length < 10) {
            Utils.showAlert('사용 목적을 더 자세히 설명해주세요. (최소 10자)');
            return false;
        }

        if (data.purpose.length > 500) {
            Utils.showAlert('사용 목적이 너무 깁니다. (최대 500자)');
            return false;
        }

        return true;
    },

    // HTML 이스케이프 (XSS 방지)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 신청 내역 새로고침
    refreshApplications() {
        this.loadApplications();
    },

    // 신청 통계 생성
    getApplicationStats() {
        const studentId = DataManager.currentUser.id;
        const applications = DataManager.getStudentApplications(studentId);
        
        const stats = {
            total: applications.length,
            pending: 0,
            approved: 0,
            rejected: 0,
            purchased: 0,
            totalAmount: 0
        };

        applications.forEach(app => {
            stats[app.status]++;
            if (app.status !== 'rejected') {
                stats.totalAmount += app.price;
            }
        });

        return stats;
    },

    // 신청 가능 여부 확인
    canSubmitNewApplication() {
        const stats = this.getApplicationStats();
        const maxApplications = 10; // 최대 신청 가능 개수
        
        if (stats.total >= maxApplications) {
            Utils.showAlert(`최대 ${maxApplications}개까지만 신청할 수 있습니다.`);
            return false;
        }
        
        return true;
    },

    // 신청 전 확인
    showApplicationConfirm(data) {
        const message = `다음 교구를 신청하시겠습니까?\n\n` +
                       `교구명: ${data.name}\n` +
                       `예상 가격: ${Utils.formatPrice(data.price)}\n` +
                       `사용 목적: ${Utils.truncateText(data.purpose, 50)}`;
        
        return Utils.showConfirm(message);
    },

    // 키보드 단축키 처리
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + N: 새 신청
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            if (Utils.$('#studentPage').classList.contains('active')) {
                this.showApplicationModal();
            }
        }
        
        // F5: 새로고침
        if (event.key === 'F5') {
            event.preventDefault();
            this.refreshApplications();
        }
    },

    // 자동 저장 기능 (임시 저장)
    setupAutoSave() {
        const inputs = ['#itemName', '#itemPurpose', '#itemPrice', '#itemLink'];
        
        inputs.forEach(selector => {
            Utils.on(selector, 'input', Utils.debounce(() => {
                this.saveFormDraft();
            }, 1000));
        });
    },

    // 폼 임시 저장
    saveFormDraft() {
        const formData = this.getFormData();
        sessionStorage.setItem('applicationDraft', JSON.stringify(formData));
    },

    // 임시 저장된 폼 복원
    restoreFormDraft() {
        try {
            const draft = sessionStorage.getItem('applicationDraft');
            if (draft) {
                const data = JSON.parse(draft);
                Utils.$('#itemName').value = data.name || '';
                Utils.$('#itemPurpose').value = data.purpose || '';
                Utils.$('#itemPrice').value = data.price || '';
                Utils.$('#itemLink').value = data.link || '';
            }
        } catch (error) {
            console.error('Draft restore failed:', error);
        }
    },

    // 임시 저장 데이터 삭제
    clearFormDraft() {
        sessionStorage.removeItem('applicationDraft');
    }
};

// 키보드 단축키 등록
document.addEventListener('keydown', (event) => {
    if (DataManager.currentUserType === 'student') {
        StudentManager.handleKeyboardShortcuts(event);
    }
});