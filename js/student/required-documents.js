/**
 * 필수 서류 제출 메인 관리 모듈 v1.0.0
 * 세종학당 문화인턴 지원 시스템
 * 
 * 기능:
 * - 페이지 초기화 및 전체 플로우 관리
 * - 3단계 진행률 관리 및 UI 업데이트
 * - 최종 제출 로직
 * - 전체 상태 관리
 */

class RequiredDocumentsManager {
    constructor() {
        this.api = null;
        this.forms = null;
        this.emergency = null;
        this.isInitialized = false;
        
        // 진행 상태
        this.progress = {
            documents: false,
            emergency: false,
            overall: {
                completedSteps: 0,
                totalSteps: 2,
                percentage: 0,
                canSubmit: false
            }
        };
        
        // UI 요소들
        this.elements = {
            // 헤더
            backBtn: null,
            pageTitle: null,
            
            // 진행률 표시
            progressBar: null,
            progressText: null,
            progressSteps: [],
            
            // 최종 제출
            finalSubmitBtn: null,
            submissionStatus: null,
            
            // 섹션들
            documentsSection: null,
            emergencySection: null
        };
        
        console.log('RequiredDocumentsManager 초기화됨');
    }

    /**
     * 페이지 초기화
     */
    async init() {
        try {
            console.log('필수 서류 제출 페이지 초기화 시작');
            
            // 사용자 인증 확인
            this.checkAuthentication();
            
            // DOM 요소들 찾기
            this.findElements();
            
            // 서브 모듈들 초기화
            await this.initializeModules();
            
            // 이벤트 리스너 등록
            this.bindEvents();
            
            // 초기 진행률 업데이트
            await this.updateOverallProgress();
            
            // Lucide 아이콘 초기화
            this.initializeLucideIcons();
            
            this.isInitialized = true;
            console.log('필수 서류 제출 페이지 초기화 완료');
            
        } catch (error) {
            console.error('필수 서류 제출 페이지 초기화 실패:', error);
            this.showError('페이지를 초기화하는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 사용자 인증 확인
     */
    checkAuthentication() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            console.error('사용자 인증 정보가 없습니다.');
            alert('로그인이 필요합니다.');
            window.location.href = '/index.html';
            return;
        }
        
        console.log('사용자 인증 확인 완료:', currentUser.email);
    }

    /**
     * DOM 요소들 찾기
     */
    findElements() {
        console.log('DOM 요소 찾기 시작');
        
        // 헤더
        this.elements.backBtn = document.getElementById('backBtn');
        this.elements.pageTitle = document.getElementById('pageTitle');
        
        // 진행률 표시
        this.elements.progressBar = document.getElementById('overallProgressBar');
        this.elements.progressText = document.getElementById('overallProgressText');
        this.elements.progressSteps = [
            document.getElementById('step1'),
            document.getElementById('step2')
        ];
        
        // 최종 제출
        this.elements.finalSubmitBtn = document.getElementById('finalSubmitBtn');
        this.elements.submissionStatus = document.getElementById('submissionStatus');
        
        // 섹션들
        this.elements.documentsSection = document.getElementById('documentsSection');
        this.elements.emergencySection = document.getElementById('emergencySection');
        
        console.log('DOM 요소 찾기 완료:', this.elements);
    }

    /**
     * 서브 모듈들 초기화
     */
    async initializeModules() {
        console.log('서브 모듈 초기화 시작');
        
        // API 모듈 초기화
        this.api = new RequiredDocumentsAPI();
        
        // Forms 모듈 초기화
        this.forms = new RequiredDocumentsForms(this.api);
        await this.forms.init();
        
        // Emergency 모듈 초기화
        this.emergency = new EmergencyContacts(this.api);
        await this.emergency.init();
        
        // 전역 참조 설정
        window.requiredDocumentsForms = this.forms;
        
        console.log('서브 모듈 초기화 완료');
    }

    /**
     * 이벤트 리스너 등록
     */
    bindEvents() {
        console.log('이벤트 리스너 등록 시작');
        
        // 뒤로 가기 버튼
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', () => {
                this.goBack();
            });
        }
        
        // 최종 제출 버튼
        if (this.elements.finalSubmitBtn) {
            this.elements.finalSubmitBtn.addEventListener('click', () => {
                this.handleFinalSubmit();
            });
        }
        
        // 진행률 업데이트 이벤트 리스너
        document.addEventListener('progressUpdate', (event) => {
            this.handleProgressUpdate(event.detail);
        });
        
        // 페이지 언로드 시 임시 저장
        window.addEventListener('beforeunload', () => {
            this.saveAllTempData();
        });
        
        // 주기적 자동 저장 (5분마다)
        setInterval(() => {
            this.saveAllTempData();
        }, 5 * 60 * 1000);
        
        console.log('이벤트 리스너 등록 완료');
    }

    /**
     * 뒤로 가기 처리
     */
    goBack() {
        if (confirm('작성 중인 내용이 있습니다. 페이지를 떠나시겠습니까?')) {
            this.saveAllTempData();
            window.location.href = '/student/dashboard.html';
        }
    }

    /**
     * 진행률 업데이트 처리
     */
    async handleProgressUpdate(detail) {
        console.log('진행률 업데이트 이벤트 수신:', detail);
        
        // 전체 진행률 업데이트
        await this.updateOverallProgress();
        
        // 단계별 UI 업데이트
        this.updateStepsUI();
        
        // 제출 버튼 상태 업데이트
        this.updateSubmitButton();
    }

    /**
     * 전체 진행률 업데이트
     */
    async updateOverallProgress() {
        try {
            console.log('전체 진행률 업데이트 시작');
            
            // API를 통해 진행률 조회
            const progressData = await this.api.getOverallProgress();
            this.progress = progressData;
            
            console.log('진행률 데이터:', progressData);
            
            // 진행률 바 업데이트
            if (this.elements.progressBar) {
                this.elements.progressBar.style.width = `${progressData.overall.percentage}%`;
            }
            
            // 진행률 텍스트 업데이트
            if (this.elements.progressText) {
                this.elements.progressText.textContent = 
                    `${progressData.overall.completedSteps}/${progressData.overall.totalSteps} 단계 완료 (${progressData.overall.percentage}%)`;
            }
            
            console.log('전체 진행률 업데이트 완료');
            
        } catch (error) {
            console.error('전체 진행률 업데이트 실패:', error);
        }
    }

    /**
     * 단계별 UI 업데이트
     */
    updateStepsUI() {
        console.log('단계별 UI 업데이트 시작');
        
        // 1단계: 필수 서류 및 계좌 정보
        const step1Element = this.elements.progressSteps[0];
        if (step1Element) {
            const isComplete = this.progress.documents.completed;
            step1Element.className = `progress-step ${isComplete ? 'completed' : 'active'}`;
            
            const icon = step1Element.querySelector('.step-icon i');
            const status = step1Element.querySelector('.step-status');
            
            if (icon) {
                icon.setAttribute('data-lucide', isComplete ? 'check-circle' : 'circle');
            }
            
            if (status) {
                status.textContent = isComplete ? '완료' : '진행 중';
            }
        }
        
        // 2단계: 비상연락망
        const step2Element = this.elements.progressSteps[1];
        if (step2Element) {
            const isComplete = this.progress.emergency.completed;
            const isActive = this.progress.documents.completed;
            
            step2Element.className = `progress-step ${isComplete ? 'completed' : isActive ? 'active' : 'pending'}`;
            
            const icon = step2Element.querySelector('.step-icon i');
            const status = step2Element.querySelector('.step-status');
            
            if (icon) {
                if (isComplete) {
                    icon.setAttribute('data-lucide', 'check-circle');
                } else if (isActive) {
                    icon.setAttribute('data-lucide', 'circle');
                } else {
                    icon.setAttribute('data-lucide', 'circle-dot');
                }
            }
            
            if (status) {
                if (isComplete) {
                    status.textContent = '완료';
                } else if (isActive) {
                    status.textContent = '진행 중';
                } else {
                    status.textContent = '대기';
                }
            }
        }
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        console.log('단계별 UI 업데이트 완료');
    }

    /**
     * 제출 버튼 상태 업데이트
     */
    updateSubmitButton() {
        if (!this.elements.finalSubmitBtn) return;
        
        const canSubmit = this.progress.overall.canSubmit;
        
        this.elements.finalSubmitBtn.disabled = !canSubmit;
        
        if (canSubmit) {
            this.elements.finalSubmitBtn.classList.remove('disabled');
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="send"></i> 최종 제출';
        } else {
            this.elements.finalSubmitBtn.classList.add('disabled');
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="lock"></i> 모든 항목 완료 후 제출 가능';
        }
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        console.log('제출 버튼 상태 업데이트:', canSubmit ? '활성화' : '비활성화');
    }

    /**
     * 최종 제출 처리
     */
    async handleFinalSubmit() {
        try {
            console.log('최종 제출 처리 시작');
            
            // 제출 가능 여부 재확인
            if (!this.progress.overall.canSubmit) {
                this.showError('모든 항목을 완료해주세요.');
                return;
            }
            
            // 확인 대화상자
            if (!confirm('모든 정보를 최종 제출하시겠습니까?\n제출 후에는 수정할 수 없습니다.')) {
                return;
            }
            
            // 제출 버튼 비활성화
            this.elements.finalSubmitBtn.disabled = true;
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> 제출 중...';
            
            // API 호출
            await this.api.submitRequiredDocuments();
            
            // 성공 처리
            this.handleSubmitSuccess();
            
        } catch (error) {
            console.error('최종 제출 실패:', error);
            this.handleSubmitError(error);
            
        } finally {
            // 제출 버튼 복구 (성공 시에는 다른 상태로 변경됨)
            if (this.elements.finalSubmitBtn && !this.progress.overall.canSubmit) {
                this.updateSubmitButton();
            }
        }
    }

    /**
     * 제출 성공 처리
     */
    handleSubmitSuccess() {
        console.log('제출 성공 처리');
        
        // 성공 메시지
        this.showSuccess('필수 서류가 성공적으로 제출되었습니다!');
        
        // 제출 상태 업데이트
        if (this.elements.submissionStatus) {
            this.elements.submissionStatus.className = 'submission-status submitted';
            this.elements.submissionStatus.innerHTML = `
                <i data-lucide="check-circle"></i>
                <span>제출 완료</span>
                <small>관리자 검토 대기 중</small>
            `;
        }
        
        // 제출 버튼 업데이트
        if (this.elements.finalSubmitBtn) {
            this.elements.finalSubmitBtn.disabled = true;
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="check-circle"></i> 제출 완료';
            this.elements.finalSubmitBtn.classList.add('submitted');
        }
        
        // 임시 저장 데이터 삭제
        this.clearAllTempData();
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 3초 후 대시보드로 이동
        setTimeout(() => {
            if (confirm('대시보드로 이동하시겠습니까?')) {
                window.location.href = '/student/dashboard.html';
            }
        }, 3000);
    }

    /**
     * 제출 실패 처리
     */
    handleSubmitError(error) {
        console.log('제출 실패 처리:', error);
        
        let errorMessage = '제출 중 오류가 발생했습니다.';
        
        if (error.message) {
            errorMessage = error.message;
        }
        
        this.showError(errorMessage);
        
        // 제출 상태 업데이트
        if (this.elements.submissionStatus) {
            this.elements.submissionStatus.className = 'submission-status error';
            this.elements.submissionStatus.innerHTML = `
                <i data-lucide="x-circle"></i>
                <span>제출 실패</span>
                <small>다시 시도해주세요</small>
            `;
        }
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * 모든 임시 저장 데이터 저장
     */
    saveAllTempData() {
        try {
            console.log('모든 임시 저장 데이터 저장 시작');
            
            if (this.forms && this.forms.isInitialized) {
                this.forms.saveTempData();
            }
            
            if (this.emergency && this.emergency.isInitialized) {
                this.emergency.saveTempData();
            }
            
            console.log('모든 임시 저장 데이터 저장 완료');
            
        } catch (error) {
            console.error('임시 저장 데이터 저장 실패:', error);
        }
    }

    /**
     * 모든 임시 저장 데이터 삭제
     */
    clearAllTempData() {
        try {
            console.log('모든 임시 저장 데이터 삭제 시작');
            
            this.api.clearTempData('documents_form');
            this.api.clearTempData('emergency_contacts');
            
            console.log('모든 임시 저장 데이터 삭제 완료');
            
        } catch (error) {
            console.error('임시 저장 데이터 삭제 실패:', error);
        }
    }

    /**
     * Lucide 아이콘 초기화
     */
    initializeLucideIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
            console.log('Lucide 아이콘 초기화 완료');
        } else {
            console.warn('Lucide 라이브러리를 찾을 수 없습니다.');
        }
    }

    /**
     * 성공 메시지 표시
     */
    showSuccess(message) {
        console.log('성공:', message);
        
        // 기존 알림 제거
        this.clearNotifications();
        
        // 성공 알림 생성
        const notification = document.createElement('div');
        notification.className = 'notification success large';
        notification.innerHTML = `
            <div class="notification-content">
                <i data-lucide="check-circle"></i>
                <div class="notification-text">
                    <strong>성공!</strong>
                    <span>${message}</span>
                </div>
            </div>
            <button type="button" class="btn-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;
        
        // 페이지 상단에 추가
        document.body.insertBefore(notification, document.body.firstChild);
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 오류 메시지 표시
     */
    showError(message) {
        console.error('오류:', message);
        
        // 기존 알림 제거
        this.clearNotifications();
        
        // 오류 알림 생성
        const notification = document.createElement('div');
        notification.className = 'notification error large';
        notification.innerHTML = `
            <div class="notification-content">
                <i data-lucide="alert-circle"></i>
                <div class="notification-text">
                    <strong>오류!</strong>
                    <span>${message}</span>
                </div>
            </div>
            <button type="button" class="btn-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;
        
        // 페이지 상단에 추가
        document.body.insertBefore(notification, document.body.firstChild);
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 7초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 7000);
    }

    /**
     * 모든 알림 제거
     */
    clearNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
    }

    /**
     * 현재 제출 상태 확인
     */
    async checkSubmissionStatus() {
        try {
            console.log('제출 상태 확인 시작');
            
            const documentsData = await this.api.getRequiredDocuments();
            
            if (documentsData && documentsData.submission_status === 'pending') {
                // 이미 제출된 상태
                this.handleAlreadySubmitted(documentsData);
            } else if (documentsData && documentsData.submission_status === 'approved') {
                // 승인된 상태
                this.handleApproved(documentsData);
            }
            
            console.log('제출 상태 확인 완료');
            
        } catch (error) {
            console.error('제출 상태 확인 실패:', error);
        }
    }

    /**
     * 이미 제출된 상태 처리
     */
    handleAlreadySubmitted(documentsData) {
        console.log('이미 제출된 상태 처리');
        
        // 제출 상태 표시
        if (this.elements.submissionStatus) {
            this.elements.submissionStatus.className = 'submission-status submitted';
            this.elements.submissionStatus.innerHTML = `
                <i data-lucide="clock"></i>
                <span>검토 중</span>
                <small>관리자 검토 대기 중입니다</small>
            `;
        }
        
        // 제출 버튼 비활성화
        if (this.elements.finalSubmitBtn) {
            this.elements.finalSubmitBtn.disabled = true;
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="clock"></i> 검토 중';
            this.elements.finalSubmitBtn.classList.add('submitted');
        }
        
        // 폼 비활성화
        this.disableAllForms();
        
        // 안내 메시지
        this.showInfo('필수 서류가 이미 제출되어 관리자 검토 중입니다.');
    }

    /**
     * 승인된 상태 처리
     */
    handleApproved(documentsData) {
        console.log('승인된 상태 처리');
        
        // 제출 상태 표시
        if (this.elements.submissionStatus) {
            this.elements.submissionStatus.className = 'submission-status approved';
            this.elements.submissionStatus.innerHTML = `
                <i data-lucide="check-circle"></i>
                <span>승인 완료</span>
                <small>필수 서류가 승인되었습니다</small>
            `;
        }
        
        // 제출 버튼 비활성화
        if (this.elements.finalSubmitBtn) {
            this.elements.finalSubmitBtn.disabled = true;
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="check-circle"></i> 승인 완료';
            this.elements.finalSubmitBtn.classList.add('approved');
        }
        
        // 폼 비활성화
        this.disableAllForms();
        
        // 안내 메시지
        this.showSuccess('필수 서류가 승인되었습니다!');
    }

    /**
     * 모든 폼 비활성화
     */
    disableAllForms() {
        console.log('모든 폼 비활성화');
        
        // 모든 입력 필드 비활성화
        const inputs = document.querySelectorAll('input, textarea, select, button');
        inputs.forEach(input => {
            if (input.id !== 'backBtn') { // 뒤로가기 버튼은 제외
                input.disabled = true;
            }
        });
        
        // 업로드 영역 비활성화
        const uploadAreas = document.querySelectorAll('.upload-area');
        uploadAreas.forEach(area => {
            area.classList.add('disabled');
        });
    }

    /**
     * 정보 메시지 표시
     */
    showInfo(message) {
        console.log('정보:', message);
        
        // 기존 알림 제거
        this.clearNotifications();
        
        // 정보 알림 생성
        const notification = document.createElement('div');
        notification.className = 'notification info';
        notification.innerHTML = `
            <div class="notification-content">
                <i data-lucide="info"></i>
                <div class="notification-text">
                    <strong>안내</strong>
                    <span>${message}</span>
                </div>
            </div>
            <button type="button" class="btn-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;
        
        // 페이지 상단에 추가
        document.body.insertBefore(notification, document.body.firstChild);
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 페이지 새로고침 처리
     */
    async refresh() {
        try {
            console.log('페이지 새로고침 시작');
            
            // 진행률 업데이트
            await this.updateOverallProgress();
            
            // 단계별 UI 업데이트
            this.updateStepsUI();
            
            // 제출 버튼 상태 업데이트
            this.updateSubmitButton();
            
            // 제출 상태 확인
            await this.checkSubmissionStatus();
            
            console.log('페이지 새로고침 완료');
            
        } catch (error) {
            console.error('페이지 새로고침 실패:', error);
        }
    }

    /**
     * 정리
     */
    destroy() {
        // 서브 모듈 정리
        if (this.forms) {
            this.forms.destroy();
        }
        
        if (this.emergency) {
            this.emergency.destroy();
        }
        
        // 알림 정리
        this.clearNotifications();
        
        // 전역 참조 제거
        if (window.requiredDocumentsForms) {
            delete window.requiredDocumentsForms;
        }
        
        console.log('RequiredDocumentsManager 정리 완료');
    }
}

// 전역 스코프에 클래스 등록
window.RequiredDocumentsManager = RequiredDocumentsManager;

// 페이지 로드 시 자동 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('필수 서류 제출 페이지 DOM 로드 완료');
    
    try {
        // 필수 클래스 확인
        if (!window.RequiredDocumentsAPI) {
            throw new Error('RequiredDocumentsAPI 클래스를 찾을 수 없습니다.');
        }
        
        if (!window.RequiredDocumentsForms) {
            throw new Error('RequiredDocumentsForms 클래스를 찾을 수 없습니다.');
        }
        
        if (!window.EmergencyContacts) {
            throw new Error('EmergencyContacts 클래스를 찾을 수 없습니다.');
        }
        
        // 매니저 초기화
        const manager = new RequiredDocumentsManager();
        await manager.init();
        
        // 전역 참조 설정
        window.requiredDocumentsManager = manager;
        
        console.log('필수 서류 제출 페이지 초기화 완료');
        
    } catch (error) {
        console.error('필수 서류 제출 페이지 초기화 실패:', error);
        alert('페이지를 불러오는 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.');
    }
});

console.log('RequiredDocumentsManager 모듈 로드 완료 v1.0.0');