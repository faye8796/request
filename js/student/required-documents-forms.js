/**
 * 필수 서류 제출 폼 관리 모듈 v1.0.1
 * 세종학당 문화인턴 지원 시스템
 * 
 * 기능:
 * - 드래그앤드롭 파일 업로드
 * - 파일 검증 (타입, 크기)
 * - 업로드 진행률 표시
 * - 간소화된 업로드 완료 UI
 * - 계좌 정보 폼 관리
 * 
 * 버전 1.0.1 업데이트:
 * - 업로드 완료 UI 간소화 (초록색 완료 버튼 형태)
 * - 파일 미리보기 오류 수정 (새 창에서 직접 열기)
 * - 브라우저 확장 프로그램 충돌 방지
 */

class RequiredDocumentsForms {
    constructor(api) {
        this.api = api;
        this.uploadingFiles = new Set(); // 현재 업로드 중인 파일들 추적
        this.isInitialized = false;
        
        // 폼 요소들
        this.elements = {
            // 필수 서류 관련
            documentUploadArea: null,
            documentInput: null,
            documentPreview: null,
            documentStatus: null,
            
            // 계좌 정보 관련
            bankNameInput: null,
            accountNumberInput: null,
            accountHolderInput: null,
            bankbookUploadArea: null,
            bankbookInput: null,
            bankbookPreview: null,
            
            // 저장 버튼
            saveAccountBtn: null,
            
            // 진행률 표시
            progressBar: null,
            progressText: null
        };
        
        console.log('RequiredDocumentsForms 초기화됨');
    }

    /**
     * 폼 초기화
     */
    async init() {
        try {
            console.log('폼 초기화 시작');
            
            // DOM 요소들 찾기
            this.findElements();
            
            // 이벤트 리스너 등록
            this.bindEvents();
            
            // 기존 데이터 로드
            await this.loadExistingData();
            
            this.isInitialized = true;
            console.log('폼 초기화 완료');
            
        } catch (error) {
            console.error('폼 초기화 실패:', error);
            this.showError('폼을 초기화하는 중 오류가 발생했습니다.');
        }
    }

    /**
     * DOM 요소들 찾기
     */
    findElements() {
        console.log('DOM 요소 찾기 시작');
        
        // 필수 서류 관련
        this.elements.documentUploadArea = document.getElementById('documentUploadArea');
        this.elements.documentInput = document.getElementById('documentInput');
        this.elements.documentPreview = document.getElementById('documentPreview');
        this.elements.documentStatus = document.getElementById('documentStatus');
        
        // 계좌 정보 관련
        this.elements.bankNameInput = document.getElementById('bankName');
        this.elements.accountNumberInput = document.getElementById('accountNumber');
        this.elements.accountHolderInput = document.getElementById('accountHolder');
        this.elements.bankbookUploadArea = document.getElementById('bankbookUploadArea');
        this.elements.bankbookInput = document.getElementById('bankbookInput');
        this.elements.bankbookPreview = document.getElementById('bankbookPreview');
        
        // 저장 버튼
        this.elements.saveAccountBtn = document.getElementById('saveAccountBtn');
        
        // 진행률 표시
        this.elements.progressBar = document.getElementById('progressBar');
        this.elements.progressText = document.getElementById('progressText');
        
        console.log('DOM 요소 찾기 완료:', this.elements);
    }

    /**
     * 이벤트 리스너 등록
     */
    bindEvents() {
        console.log('이벤트 리스너 등록 시작');
        
        // 필수 서류 업로드 이벤트
        if (this.elements.documentUploadArea) {
            this.setupDropZone(this.elements.documentUploadArea, this.elements.documentInput, 'document');
        }
        
        if (this.elements.documentInput) {
            this.elements.documentInput.addEventListener('change', (e) => {
                this.handleFileSelect(e, 'document');
            });
        }
        
        // 통장 사본 업로드 이벤트
        if (this.elements.bankbookUploadArea) {
            this.setupDropZone(this.elements.bankbookUploadArea, this.elements.bankbookInput, 'bankbook');
        }
        
        if (this.elements.bankbookInput) {
            this.elements.bankbookInput.addEventListener('change', (e) => {
                this.handleFileSelect(e, 'bankbook');
            });
        }
        
        // 계좌 정보 입력 검증
        if (this.elements.accountNumberInput) {
            this.elements.accountNumberInput.addEventListener('input', (e) => {
                this.validateAccountNumber(e.target);
            });
        }
        
        // 저장 버튼 이벤트
        if (this.elements.saveAccountBtn) {
            this.elements.saveAccountBtn.addEventListener('click', () => {
                this.saveAccountInfo();
            });
        }
        
        // 실시간 입력 검증
        this.setupRealTimeValidation();
        
        console.log('이벤트 리스너 등록 완료');
    }

    /**
     * 드롭존 설정
     */
    setupDropZone(dropArea, fileInput, type) {
        if (!dropArea || !fileInput) return;
        
        console.log(`드롭존 설정: ${type}`);
        
        // 드래그 이벤트 방지
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // 드래그 상태 표시
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            });
        });
        
        // 파일 드롭 처리
        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileDrop(files[0], type);
            }
        });
        
        // 클릭으로 파일 선택
        dropArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    /**
     * 파일 선택 처리
     */
    handleFileSelect(event, type) {
        const file = event.target.files[0];
        if (file) {
            this.handleFileDrop(file, type);
        }
    }

    /**
     * 파일 드롭 처리
     */
    async handleFileDrop(file, type) {
        try {
            console.log(`파일 드롭 처리: ${type}`, file);
            
            // 이미 업로드 중인지 확인
            const fileKey = `${type}_${file.name}_${file.size}`;
            if (this.uploadingFiles.has(fileKey)) {
                console.log('이미 업로드 중인 파일입니다.');
                return;
            }
            
            // 업로드 중 표시
            this.uploadingFiles.add(fileKey);
            this.showUploadProgress(type, 0);
            
            // 파일 업로드
            let result;
            if (type === 'document') {
                result = await this.api.uploadRequiredDocument(file);
            } else if (type === 'bankbook') {
                result = await this.api.uploadBankbookCopy(file);
            }
            
            // 업로드 완료 처리
            this.showUploadProgress(type, 100);
            this.updateFilePreview(type, result);
            this.showSuccess(`${type === 'document' ? '필수 서류' : '통장 사본'} 업로드가 완료되었습니다.`);
            
            // 진행률 업데이트 이벤트 발생
            this.dispatchProgressUpdate();
            
        } catch (error) {
            console.error(`파일 업로드 실패 (${type}):`, error);
            this.showError(error.message || '파일 업로드 중 오류가 발생했습니다.');
            
        } finally {
            // 업로드 중 상태 해제
            const fileKey = `${type}_${file.name}_${file.size}`;
            this.uploadingFiles.delete(fileKey);
            this.hideUploadProgress(type);
        }
    }

    /**
     * 업로드 진행률 표시
     */
    showUploadProgress(type, percentage) {
        const uploadArea = type === 'document' ? this.elements.documentUploadArea : this.elements.bankbookUploadArea;
        if (!uploadArea) return;
        
        // 진행률 바 생성/업데이트
        let progressDiv = uploadArea.querySelector('.upload-progress');
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.className = 'upload-progress';
            progressDiv.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">업로드 중... 0%</div>
            `;
            uploadArea.appendChild(progressDiv);
        }
        
        // 진행률 업데이트
        const progressFill = progressDiv.querySelector('.progress-fill');
        const progressText = progressDiv.querySelector('.progress-text');
        
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `업로드 중... ${percentage}%`;
        
        // 업로드 영역 비활성화
        uploadArea.classList.add('uploading');
    }

    /**
     * 업로드 진행률 숨기기
     */
    hideUploadProgress(type) {
        const uploadArea = type === 'document' ? this.elements.documentUploadArea : this.elements.bankbookUploadArea;
        if (!uploadArea) return;
        
        // 진행률 요소 제거
        const progressDiv = uploadArea.querySelector('.upload-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
        
        // 업로드 영역 활성화
        uploadArea.classList.remove('uploading');
    }

    /**
     * 파일 미리보기 업데이트 (v1.0.1 - 간소화된 UI)
     */
    updateFilePreview(type, fileData) {
        const previewElement = type === 'document' ? this.elements.documentPreview : this.elements.bankbookPreview;
        if (!previewElement || !fileData) return;
        
        console.log(`파일 미리보기 업데이트: ${type}`, fileData);
        
        // 파일 타입에 따른 제목 설정
        const fileTypeTitle = type === 'document' ? '필수 서류' : '통장 사본';
        
        // 간소화된 업로드 완료 UI
        previewElement.innerHTML = `
            <div class="upload-complete-container">
                <button type="button" 
                        class="upload-complete-btn" 
                        onclick="window.requiredDocumentsForms.openFileInNewWindow('${fileData.url}')"
                        title="${fileTypeTitle} 파일 보기">
                    <div class="upload-complete-content">
                        <i data-lucide="check-circle" class="upload-complete-icon"></i>
                        <span class="upload-complete-text">업로드 완료</span>
                        <span class="upload-complete-subtitle">클릭하여 ${fileTypeTitle} 보기</span>
                    </div>
                </button>
                <button type="button" 
                        class="upload-delete-btn" 
                        onclick="window.requiredDocumentsForms.deleteFile('${type}', '${fileData.url}')" 
                        title="파일 삭제">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 상태 업데이트
        this.updateFileStatus(type, 'completed');
    }

    /**
     * 새 창에서 파일 열기 (v1.0.1 - 새로운 함수)
     */
    openFileInNewWindow(fileUrl) {
        if (!fileUrl) return;
        
        console.log('새 창에서 파일 열기:', fileUrl);
        
        try {
            // 새 창에서 직접 열기 (iframe 사용하지 않아 확장 프로그램 충돌 방지)
            const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
            
            if (!newWindow) {
                // 팝업이 차단된 경우 사용자에게 알림
                this.showError('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
                
                // 대안으로 현재 창에서 열기 (사용자 확인 후)
                if (confirm('새 창이 차단되었습니다. 현재 창에서 파일을 여시겠습니까?')) {
                    window.location.href = fileUrl;
                }
            }
        } catch (error) {
            console.error('파일 열기 실패:', error);
            this.showError('파일을 열 수 없습니다.');
        }
    }

    /**
     * 파일 상태 업데이트
     */
    updateFileStatus(type, status) {
        const statusElement = type === 'document' ? this.elements.documentStatus : null;
        if (!statusElement) return;
        
        statusElement.className = `file-status ${status}`;
        
        switch (status) {
            case 'completed':
                statusElement.innerHTML = '<i data-lucide="check-circle"></i> 업로드 완료';
                break;
            case 'error':
                statusElement.innerHTML = '<i data-lucide="x-circle"></i> 업로드 실패';
                break;
            default:
                statusElement.innerHTML = '<i data-lucide="upload"></i> 업로드 대기';
        }
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * 파일 미리보기 (v1.0.1 - 오류 수정)
     */
    previewFile(fileUrl) {
        if (!fileUrl) return;
        
        console.log('파일 미리보기:', fileUrl);
        
        // 브라우저 확장 프로그램 충돌 방지를 위해 새 창에서 직접 열기
        this.openFileInNewWindow(fileUrl);
    }

    /**
     * 이미지 미리보기 모달 (사용하지 않음 - v1.0.1에서 제거)
     */
    showImagePreview(imageUrl) {
        // v1.0.1에서는 모달 대신 새 창에서 직접 열기
        this.openFileInNewWindow(imageUrl);
    }

    /**
     * PDF 미리보기 모달 (사용하지 않음 - v1.0.1에서 제거)
     */
    showPdfPreview(pdfUrl) {
        // v1.0.1에서는 모달 대신 새 창에서 직접 열기
        this.openFileInNewWindow(pdfUrl);
    }

    /**
     * 파일 삭제
     */
    async deleteFile(type, fileUrl) {
        if (!confirm('파일을 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            console.log(`파일 삭제 시작: ${type}`, fileUrl);
            
            // Storage에서 파일 삭제
            await this.api.deleteFile(fileUrl);
            
            // DB에서 URL 제거
            if (type === 'document') {
                await this.api.saveRequiredDocuments({
                    required_document_url: null,
                    document_upload_date: null
                });
            } else if (type === 'bankbook') {
                await this.api.saveRequiredDocuments({
                    bankbook_copy_url: null
                });
            }
            
            // UI 업데이트
            this.clearFilePreview(type);
            this.showSuccess('파일이 삭제되었습니다.');
            
            // 진행률 업데이트 이벤트 발생
            this.dispatchProgressUpdate();
            
        } catch (error) {
            console.error(`파일 삭제 실패 (${type}):`, error);
            this.showError('파일 삭제 중 오류가 발생했습니다.');
        }
    }

    /**
     * 파일 미리보기 초기화
     */
    clearFilePreview(type) {
        const previewElement = type === 'document' ? this.elements.documentPreview : this.elements.bankbookPreview;
        if (previewElement) {
            previewElement.innerHTML = '';
        }
        
        // 상태 초기화
        this.updateFileStatus(type, 'pending');
    }

    /**
     * 계좌 정보 저장
     */
    async saveAccountInfo() {
        try {
            console.log('계좌 정보 저장 시작');
            
            // 입력값 검증
            const accountData = this.validateAccountForm();
            if (!accountData) return;
            
            // 저장 버튼 비활성화
            if (this.elements.saveAccountBtn) {
                this.elements.saveAccountBtn.disabled = true;
                this.elements.saveAccountBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> 저장 중...';
            }
            
            // API 호출
            await this.api.saveRequiredDocuments(accountData);
            
            // 성공 메시지
            this.showSuccess('계좌 정보가 저장되었습니다.');
            
            // 진행률 업데이트 이벤트 발생
            this.dispatchProgressUpdate();
            
        } catch (error) {
            console.error('계좌 정보 저장 실패:', error);
            this.showError('계좌 정보 저장 중 오류가 발생했습니다.');
            
        } finally {
            // 저장 버튼 활성화
            if (this.elements.saveAccountBtn) {
                this.elements.saveAccountBtn.disabled = false;
                this.elements.saveAccountBtn.innerHTML = '<i data-lucide="save"></i> 저장';
                
                // Lucide 아이콘 재초기화
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        }
    }

    /**
     * 계좌 정보 폼 검증
     */
    validateAccountForm() {
        const bankName = this.elements.bankNameInput?.value?.trim();
        const accountNumber = this.elements.accountNumberInput?.value?.trim();
        const accountHolder = this.elements.accountHolderInput?.value?.trim();
        
        // 필수 필드 검증
        if (!bankName) {
            this.showError('은행명을 입력해주세요.');
            this.elements.bankNameInput?.focus();
            return null;
        }
        
        if (!accountNumber) {
            this.showError('계좌번호를 입력해주세요.');
            this.elements.accountNumberInput?.focus();
            return null;
        }
        
        if (!accountHolder) {
            this.showError('예금주명을 입력해주세요.');
            this.elements.accountHolderInput?.focus();
            return null;
        }
        
        // 계좌번호 형식 검증
        if (!this.api.validateAccountNumber(accountNumber)) {
            this.showError('올바른 계좌번호 형식이 아닙니다.');
            this.elements.accountNumberInput?.focus();
            return null;
        }
        
        return {
            salary_bank_name: bankName,
            salary_account_number: accountNumber,
            salary_account_holder: accountHolder
        };
    }

    /**
     * 실시간 입력 검증 설정
     */
    setupRealTimeValidation() {
        // 계좌번호 실시간 검증
        if (this.elements.accountNumberInput) {
            this.elements.accountNumberInput.addEventListener('blur', (e) => {
                this.validateAccountNumber(e.target);
            });
        }
        
        // 예금주명 실시간 검증
        if (this.elements.accountHolderInput) {
            this.elements.accountHolderInput.addEventListener('input', (e) => {
                this.validateAccountHolder(e.target);
            });
        }
    }

    /**
     * 계좌번호 검증
     */
    validateAccountNumber(input) {
        if (!input || !input.value) return;
        
        const isValid = this.api.validateAccountNumber(input.value.trim());
        
        // UI 업데이트
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
            this.hideFieldError(input);
        } else {
            input.classList.remove('valid');
            input.classList.add('error');
            this.showFieldError(input, '올바른 계좌번호 형식이 아닙니다.');
        }
    }

    /**
     * 예금주명 검증
     */
    validateAccountHolder(input) {
        if (!input || !input.value) return;
        
        const value = input.value.trim();
        const isValid = value.length >= 2 && value.length <= 20;
        
        // UI 업데이트
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
            this.hideFieldError(input);
        } else {
            input.classList.remove('valid');
            input.classList.add('error');
            this.showFieldError(input, '예금주명은 2-20자 이내로 입력해주세요.');
        }
    }

    /**
     * 필드별 오류 메시지 표시
     */
    showFieldError(input, message) {
        if (!input) return;
        
        // 기존 오류 메시지 제거
        this.hideFieldError(input);
        
        // 오류 메시지 요소 생성
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        // 입력 필드 다음에 삽입
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }

    /**
     * 필드별 오류 메시지 숨기기
     */
    hideFieldError(input) {
        if (!input || !input.parentNode) return;
        
        const errorDiv = input.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * 기존 데이터 로드
     */
    async loadExistingData() {
        try {
            console.log('기존 데이터 로드 시작');
            
            const documentsData = await this.api.getRequiredDocuments();
            if (!documentsData) {
                console.log('기존 데이터 없음');
                return;
            }
            
            console.log('기존 데이터 로드:', documentsData);
            
            // 필수 서류 파일 정보
            if (documentsData.required_document_url) {
                this.updateFilePreview('document', {
                    url: documentsData.required_document_url,
                    fileName: 'required_document.pdf',
                    uploadDate: documentsData.document_upload_date
                });
            }
            
            // 통장 사본 파일 정보
            if (documentsData.bankbook_copy_url) {
                this.updateFilePreview('bankbook', {
                    url: documentsData.bankbook_copy_url,
                    fileName: 'bankbook_copy',
                    uploadDate: documentsData.created_at
                });
            }
            
            // 계좌 정보
            if (this.elements.bankNameInput && documentsData.salary_bank_name) {
                this.elements.bankNameInput.value = documentsData.salary_bank_name;
            }
            
            if (this.elements.accountNumberInput && documentsData.salary_account_number) {
                this.elements.accountNumberInput.value = documentsData.salary_account_number;
            }
            
            if (this.elements.accountHolderInput && documentsData.salary_account_holder) {
                this.elements.accountHolderInput.value = documentsData.salary_account_holder;
            }
            
            console.log('기존 데이터 로드 완료');
            
        } catch (error) {
            console.error('기존 데이터 로드 실패:', error);
            // 로드 실패는 심각한 오류가 아니므로 사용자에게 알리지 않음
        }
    }

    /**
     * 진행률 업데이트 이벤트 발생
     */
    dispatchProgressUpdate() {
        const event = new CustomEvent('progressUpdate', {
            detail: { section: 'documents' }
        });
        document.dispatchEvent(event);
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
        notification.className = 'notification success';
        notification.innerHTML = `
            <i data-lucide="check-circle"></i>
            <span>${message}</span>
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
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
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
        notification.className = 'notification error';
        notification.innerHTML = `
            <i data-lucide="alert-circle"></i>
            <span>${message}</span>
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
     * 모든 알림 제거
     */
    clearNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
    }

    /**
     * 임시 저장
     */
    saveTempData() {
        if (!this.isInitialized) return;
        
        const tempData = {
            bankName: this.elements.bankNameInput?.value || '',
            accountNumber: this.elements.accountNumberInput?.value || '',
            accountHolder: this.elements.accountHolderInput?.value || ''
        };
        
        this.api.saveTempData('documents_form', tempData);
    }

    /**
     * 임시 저장 데이터 로드
     */
    loadTempData() {
        const tempData = this.api.loadTempData('documents_form');
        if (!tempData) return;
        
        console.log('임시 저장 데이터 로드:', tempData);
        
        if (this.elements.bankNameInput && tempData.bankName) {
            this.elements.bankNameInput.value = tempData.bankName;
        }
        
        if (this.elements.accountNumberInput && tempData.accountNumber) {
            this.elements.accountNumberInput.value = tempData.accountNumber;
        }
        
        if (this.elements.accountHolderInput && tempData.accountHolder) {
            this.elements.accountHolderInput.value = tempData.accountHolder;
        }
    }

    /**
     * 폼 리셋
     */
    resetForm() {
        // 파일 미리보기 초기화
        this.clearFilePreview('document');
        this.clearFilePreview('bankbook');
        
        // 계좌 정보 초기화
        if (this.elements.bankNameInput) this.elements.bankNameInput.value = '';
        if (this.elements.accountNumberInput) this.elements.accountNumberInput.value = '';
        if (this.elements.accountHolderInput) this.elements.accountHolderInput.value = '';
        
        // 검증 상태 초기화
        [this.elements.bankNameInput, this.elements.accountNumberInput, this.elements.accountHolderInput]
            .forEach(input => {
                if (input) {
                    input.classList.remove('valid', 'error');
                    this.hideFieldError(input);
                }
            });
        
        // 임시 저장 데이터 삭제
        this.api.clearTempData('documents_form');
        
        console.log('폼 리셋 완료');
    }

    /**
     * 폼 완료 상태 확인
     */
    isFormComplete() {
        const bankName = this.elements.bankNameInput?.value?.trim();
        const accountNumber = this.elements.accountNumberInput?.value?.trim();
        const accountHolder = this.elements.accountHolderInput?.value?.trim();
        
        // 필수 필드 확인
        const hasAccountInfo = bankName && accountNumber && accountHolder;
        
        // 파일 업로드 확인 (실제 DB에서 확인 필요)
        const hasRequiredDocument = this.elements.documentPreview?.children.length > 0;
        const hasBankbookCopy = this.elements.bankbookPreview?.children.length > 0;
        
        return hasAccountInfo && hasRequiredDocument && hasBankbookCopy;
    }

    /**
     * 정리
     */
    destroy() {
        // 이벤트 리스너 제거는 자동으로 처리됨 (요소가 DOM에서 제거되면)
        this.uploadingFiles.clear();
        this.clearNotifications();
        
        console.log('RequiredDocumentsForms 정리 완료');
    }
}

// 전역 스코프에 클래스 등록
window.RequiredDocumentsForms = RequiredDocumentsForms;

// 전역 함수로 등록 (HTML에서 직접 호출용)
window.requiredDocumentsForms = null;

console.log('RequiredDocumentsForms 모듈 로드 완료 v1.0.1');
