/**
 * 필수 서류 제출 메인 관리 모듈 v1.0.1
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
        this.currentUser = null;
        
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
        
        console.log('RequiredDocumentsManager 초기화됨 v1.0.1');
    }

    /**
     * 페이지 초기화
     */
    async init() {
        try {
            console.log('필수 서류 제출 페이지 초기화 시작');
            
            // 사용자 인증 확인
            if (!this.checkAuthentication()) {
                return; // 인증 실패시 초기화 중단
            }
            
            // DOM 요소들 찾기
            this.findElements();
            
            // 사용자 정보 표시
            this.displayUserInfo();
            
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
     * 사용자 인증 확인 (비자 관리 페이지와 동일한 로직)
     */
    checkAuthentication() {
        try {
            // currentStudent 키로 사용자 데이터 확인 (비자 관리 페이지와 동일)
            const userDataStr = localStorage.getItem('currentStudent');
            if (!userDataStr) {
                console.warn('⚠️ 사용자 데이터 없음 - 로그인 페이지로 이동');
                alert('로그인이 필요합니다.');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1000);
                return false;
            }

            const userData = JSON.parse(userDataStr);
            if (!userData.id) {
                console.error('❌ 사용자 ID 없음');
                alert('올바르지 않은 사용자 정보입니다.');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1000);
                return false;
            }

            this.currentUser = userData;
            console.log('✅ 사용자 인증 확인 완료:', userData.name || userData.email);
            return true;

        } catch (error) {
            console.error('❌ 사용자 인증 확인 실패:', error);
            alert('사용자 인증에 실패했습니다. 다시 로그인해주세요.');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
            return false;
        }
    }

    /**
     * 사용자 정보 표시
     */
    displayUserInfo() {
        if (!this.currentUser) return;

        // 페이지 제목에 사용자 이름 추가
        if (this.elements.pageTitle && this.currentUser.name) {
            this.elements.pageTitle.textContent = `필수 서류 제출 - ${this.currentUser.name}님`;
        }

        // 사용자 이름 표시
        const userNameEl = document.getElementById('user-name');
        if (userNameEl && this.currentUser.name) {
            userNameEl.textContent = this.currentUser.name;
        }

        console.log('사용자 정보 표시 완료');
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
        
        console.log('DOM 요소 찾기 완료');
    }

    /**
     * 서브 모듈들 초기화
     */
    async initializeModules() {
        console.log('서브 모듈 초기화 시작');
        
        try {
            // API 모듈 초기화
            if (window.RequiredDocumentsAPI) {
                this.api = new window.RequiredDocumentsAPI();
            } else {
                throw new Error('RequiredDocumentsAPI 클래스를 찾을 수 없습니다.');
            }
            
            // Forms 모듈 초기화
            if (window.RequiredDocumentsForms) {
                this.forms = new window.RequiredDocumentsForms(this.api);
                await this.forms.init();
            } else {
                throw new Error('RequiredDocumentsForms 클래스를 찾을 수 없습니다.');
            }
            
            // Emergency 모듈 초기화
            if (window.EmergencyContacts) {
                this.emergency = new window.EmergencyContacts(this.api);
                await this.emergency.init();
            } else {
                throw new Error('EmergencyContacts 클래스를 찾을 수 없습니다.');
            }
            
            // 전역 참조 설정
            window.requiredDocumentsForms = this.forms;
            
            console.log('서브 모듈 초기화 완료');
            
        } catch (error) {
            console.error('서브 모듈 초기화 실패:', error);
            this.showError(`필요한 모듈을 로드할 수 없습니다: ${error.message}`);
            throw error;
        }
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

        // 로그아웃 버튼 이벤트
        const logoutBtns = document.querySelectorAll('[onclick="logout()"]');
        logoutBtns.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', this.logout.bind(this));
        });
        
        console.log('이벤트 리스너 등록 완료');
    }

    /**
     * 로그아웃 처리
     */
    logout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('currentUser');
            window.location.href = '../index.html';
        }
    }

    /**
     * 뒤로 가기 처리
     */
    goBack() {
        if (confirm('작성 중인 내용이 있습니다. 페이지를 떠나시겠습니까?')) {
            this.saveAllTempData();
            window.location.href = 'dashboard.html';
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
            if (this.api && this.api.getOverallProgress) {
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
                        `전체 진행률: ${progressData.overall.percentage}%`;
                }
            } else {
                // API가 없는 경우 기본값 설정
                console.warn('API 모듈이 없어 기본 진행률을 설정합니다.');
                this.progress.overall.percentage = 0;
                
                if (this.elements.progressBar) {
                    this.elements.progressBar.style.width = '0%';
                }
                
                if (this.elements.progressText) {
                    this.elements.progressText.textContent = '전체 진행률: 0%';
                }
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
            const isComplete = this.progress.documents && this.progress.documents.completed;
            
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
            const isComplete = this.progress.emergency && this.progress.emergency.completed;
            const isActive = this.progress.documents && this.progress.documents.completed;
            
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
        this.initializeLucideIcons();
        
        console.log('단계별 UI 업데이트 완료');
    }

    /**
     * 제출 버튼 상태 업데이트
     */
    updateSubmitButton() {
        if (!this.elements.finalSubmitBtn) return;
        
        const canSubmit = this.progress.overall && this.progress.overall.canSubmit;
        
        this.elements.finalSubmitBtn.disabled = !canSubmit;
        
        if (canSubmit) {
            this.elements.finalSubmitBtn.classList.remove('disabled');
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="send"></i> 최종 제출';
        } else {
            this.elements.finalSubmitBtn.classList.add('disabled');
            this.elements.finalSubmitBtn.innerHTML = '<i data-lucide="lock"></i> 모든 항목 완료 후 제출 가능';
        }
        
        // Lucide 아이콘 재초기화
        this.initializeLucideIcons();
        
        console.log('제출 버튼 상태 업데이트:', canSubmit ? '활성화' : '비활성화');
    }

    /**
     * 최종 제출 처리
     */
    async handleFinalSubmit() {
        try {
            console.log('최종 제출 처리 시작');
            
            // 제출 가능 여부 재확인
            if (!this.progress.overall || !this.progress.overall.canSubmit) {
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
            if (this.api && this.api.submitRequiredDocuments) {
                await this.api.submitRequiredDocuments();
            } else {
                throw new Error('제출 API를 사용할 수 없습니다.');
            }
            
            // 성공 처리
            this.handleSubmitSuccess();
            
        } catch (error) {
            console.error('최종 제출 실패:', error);
            this.handleSubmitError(error);
            
        } finally {
            // 제출 버튼 복구 (성공 시에는 다른 상태로 변경됨)
            if (this.elements.finalSubmitBtn && (!this.progress.overall || !this.progress.overall.canSubmit)) {
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
                <div class="flex items-center space-x-3">
                    <i data-lucide="check-circle" class="w-6 h-6 text-green-600"></i>
                    <div>
                        <p class="text-sm font-medium text-green-700">제출 완료</p>
                        <p class="text-xs text-green-600">관리자 검토 대기 중</p>
                    </div>
                </div>
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
        this.initializeLucideIcons();
        
        // 3초 후 대시보드로 이동 옵션 제공
        setTimeout(() => {
            if (confirm('대시보드로 이동하시겠습니까?')) {
                window.location.href = 'dashboard.html';
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
                <div class="flex items-center space-x-3">
                    <i data-lucide="x-circle" class="w-6 h-6 text-red-600"></i>
                    <div>
                        <p class="text-sm font-medium text-red-700">제출 실패</p>
                        <p class="text-xs text-red-600">다시 시도해주세요</p>
                    </div>
                </div>
            `;
        }
        
        // Lucide 아이콘 재초기화
        this.initializeLucideIcons();
    }

    /**
     * 모든 임시 저장 데이터 저장
     */
    saveAllTempData() {
        try {
            console.log('모든 임시 저장 데이터 저장 시작');
            
            if (this.forms && this.forms.isInitialized && this.forms.saveTempData) {
                this.forms.saveTempData();
            }
            
            if (this.emergency && this.emergency.isInitialized && this.emergency.saveTempData) {
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
            
            if (this.api && this.api.clearTempData) {
                this.api.clearTempData('documents_form');
                this.api.clearTempData('emergency_contacts');
            }
            
            console.log('모든 임시 저장 데이터 삭제 완료');
            
        } catch (error) {
            console.error('임시 저장 데이터 삭제 실패:', error);
        }
    }

    /**
     * Lucide 아이콘 초기화
     */
    initializeLucideIcons() {
        if (window.lucide && window.lucide.createIcons) {
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
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <i data-lucide="check-circle" class="w-5 h-5 text-green-600 mr-3"></i>
                        <div>
                            <p class="text-sm font-medium text-green-800">성공!</p>
                            <p class="text-sm text-green-700 mt-1">${message}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Lucide 아이콘 재초기화
            this.initializeLucideIcons();
            
            // 5초 후 자동 제거
            setTimeout(() => {
                if (alertContainer) {
                    alertContainer.innerHTML = '';
                }
            }, 5000);
        }
    }

    /**
     * 오류 메시지 표시
     */
    showError(message) {
        console.error('오류:', message);
        
        // 기존 알림 제거
        this.clearNotifications();
        
        // 오류 알림 생성
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <i data-lucide="alert-circle" class="w-5 h-5 text-red-600 mr-3"></i>
                        <div>
                            <p class="text-sm font-medium text-red-800">오류!</p>
                            <p class="text-sm text-red-700 mt-1">${message}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Lucide 아이콘 재초기화
            this.initializeLucideIcons();
            
            // 7초 후 자동 제거
            setTimeout(() => {
                if (alertContainer) {
                    alertContainer.innerHTML = '';
                }
            }, 7000);
        }
    }

    /**
     * 모든 알림 제거
     */
    clearNotifications() {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    }

    /**
     * 정리
     */
    destroy() {
        // 서브 모듈 정리
        if (this.forms && this.forms.destroy) {
            this.forms.destroy();
        }
        
        if (this.emergency && this.emergency.destroy) {
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
        // 매니저 초기화 (종속성 체크는 init 메서드에서 처리)
        const manager = new RequiredDocumentsManager();
        await manager.init();
        
        // 전역 참조 설정
        window.requiredDocumentsManager = manager;
        
        console.log('✅ 필수 서류 제출 페이지 초기화 완료');
        
    } catch (error) {
        console.error('❌ 필수 서류 제출 페이지 초기화 실패:', error);
        
        // 사용자에게 알림
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <i data-lucide="alert-triangle" class="w-5 h-5 text-yellow-600 mr-3"></i>
                        <div>
                            <p class="text-sm font-medium text-yellow-800">시스템 준비 중</p>
                            <p class="text-sm text-yellow-700 mt-1">페이지가 완전히 로드되지 않았습니다. 잠시 후 새로고침해주세요.</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }
});

console.log('RequiredDocumentsManager 모듈 로드 완료 v1.0.1');