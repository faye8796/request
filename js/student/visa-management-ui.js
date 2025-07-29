/**
 * 비자 관리 시스템 UI 모듈 v1.0.0
 * UI 컴포넌트와 사용자 인터랙션을 담당
 */

(function() {
    'use strict';

    console.log('🎨 VisaManagementUI v1.0.0 로딩...');

    class VisaManagementUI {
        constructor() {
            this.currentReceiptId = null; // 편집 중인 영수증 ID
            this.statusSaveTimeout = null; // 자동 저장 타이머
            this.init();
        }

        // 초기화
        init() {
            try {
                this.setupEventListeners();
                console.log('✅ VisaManagementUI 초기화 완료');
            } catch (error) {
                console.error('❌ VisaManagementUI 초기화 실패:', error);
            }
        }

        // 이벤트 리스너 설정
        setupEventListeners() {
            // 비자 상태 textarea 자동 저장
            const visaStatusEl = document.getElementById('visaStatus');
            if (visaStatusEl) {
                visaStatusEl.addEventListener('input', () => {
                    this.scheduleStatusSave();
                });
            }

            // 비자 문서 업로드
            const visaDocumentEl = document.getElementById('visaDocument');
            if (visaDocumentEl) {
                visaDocumentEl.addEventListener('change', (e) => {
                    this.handleVisaDocumentUpload(e);
                });
            }

            // 비자 문서 삭제
            const removeVisaDocBtn = document.getElementById('removeVisaDocument');
            if (removeVisaDocBtn) {
                removeVisaDocBtn.addEventListener('click', () => {
                    this.handleVisaDocumentDelete();
                });
            }

            // 영수증 추가 버튼
            const addReceiptBtn = document.getElementById('addReceiptBtn');
            if (addReceiptBtn) {
                addReceiptBtn.addEventListener('click', () => {
                    this.showReceiptModal();
                });
            }

            // 영수증 모달 관련
            this.setupReceiptModalEvents();

            // 파일 미리보기 모달 관련
            this.setupPreviewModalEvents();
        }

        // 영수증 모달 이벤트 설정
        setupReceiptModalEvents() {
            // 모달 닫기 버튼들
            const closeReceiptModal = document.getElementById('closeReceiptModal');
            const cancelReceiptModal = document.getElementById('cancelReceiptModal');
            const closePreviewModal = document.getElementById('closePreviewModal');
            const closePreviewBtn = document.getElementById('closePreviewBtn');

            if (closeReceiptModal) {
                closeReceiptModal.addEventListener('click', () => {
                    this.hideReceiptModal();
                });
            }

            if (cancelReceiptModal) {
                cancelReceiptModal.addEventListener('click', () => {
                    this.hideReceiptModal();
                });
            }

            if (closePreviewModal) {
                closePreviewModal.addEventListener('click', () => {
                    this.hidePreviewModal();
                });
            }

            if (closePreviewBtn) {
                closePreviewBtn.addEventListener('click', () => {
                    this.hidePreviewModal();
                });
            }

            // 영수증 파일 업로드
            const receiptFileEl = document.getElementById('receiptFile');
            if (receiptFileEl) {
                receiptFileEl.addEventListener('change', (e) => {
                    this.handleReceiptFilePreview(e);
                });
            }

            // 영수증 파일 제거
            const removeReceiptFileBtn = document.getElementById('removeReceiptFile');
            if (removeReceiptFileBtn) {
                removeReceiptFileBtn.addEventListener('click', () => {
                    this.removeReceiptFilePreview();
                });
            }

            // 영수증 폼 제출
            const receiptForm = document.getElementById('receiptForm');
            if (receiptForm) {
                receiptForm.addEventListener('submit', (e) => {
                    this.handleReceiptSubmit(e);
                });
            }

            // 모달 배경 클릭으로 닫기
            const receiptModal = document.getElementById('receiptModal');
            const previewModal = document.getElementById('filePreviewModal');

            if (receiptModal) {
                receiptModal.addEventListener('click', (e) => {
                    if (e.target.classList.contains('modal-backdrop')) {
                        this.hideReceiptModal();
                    }
                });
            }

            if (previewModal) {
                previewModal.addEventListener('click', (e) => {
                    if (e.target.classList.contains('modal-backdrop')) {
                        this.hidePreviewModal();
                    }
                });
            }
        }

        // 파일 미리보기 모달 이벤트 설정
        setupPreviewModalEvents() {
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideReceiptModal();
                    this.hidePreviewModal();
                }
            });
        }

        // ===== 비자 상태 관련 메서드 =====

        // 비자 상태 자동 저장 스케줄링
        scheduleStatusSave() {
            // 기존 타이머 취소
            if (this.statusSaveTimeout) {
                clearTimeout(this.statusSaveTimeout);
            }

            // 저장 인디케이터 표시
            this.showSaveIndicator('저장 중...');

            // 1초 후 저장
            this.statusSaveTimeout = setTimeout(async () => {
                await this.saveVisaStatus();
            }, 1000);
        }

        // 비자 상태 저장
        async saveVisaStatus() {
            try {
                const visaStatusEl = document.getElementById('visaStatus');
                const statusText = visaStatusEl?.value?.trim() || '';

                if (!window.visaManagementAPI) {
                    throw new Error('API 모듈이 로드되지 않았습니다.');
                }

                const result = await window.visaManagementAPI.updateVisaStatus(statusText);
                
                if (result.success) {
                    this.showSaveIndicator('저장됨', 'success');
                    this.updateLastUpdatedTime(new Date());
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('❌ 비자 상태 저장 실패:', error);
                this.showSaveIndicator('저장 실패', 'error');
            }
        }

        // 저장 인디케이터 표시
        showSaveIndicator(text, type = 'loading') {
            const indicatorEl = document.getElementById('statusSaveIndicator');
            if (indicatorEl) {
                indicatorEl.textContent = text;
                indicatorEl.className = `save-indicator ${type}`;

                if (type === 'success' || type === 'error') {
                    setTimeout(() => {
                        indicatorEl.textContent = '';
                        indicatorEl.className = 'save-indicator';
                    }, 3000);
                }
            }
        }

        // 마지막 업데이트 시간 표시
        updateLastUpdatedTime(date) {
            const lastUpdatedEl = document.getElementById('statusLastUpdated');
            if (lastUpdatedEl) {
                const formattedTime = this.formatDateTime(date);
                lastUpdatedEl.textContent = `마지막 업데이트: ${formattedTime}`;
            }
        }

        // ===== 관리자 코멘트 관련 메서드 =====

        // 관리자 코멘트 표시
        displayAdminComment(commentData) {
            const noCommentEl = document.getElementById('noAdminComment');
            const commentContentEl = document.getElementById('adminCommentContent');
            const commentTextEl = document.getElementById('adminCommentText');
            const commentUpdatedEl = document.getElementById('adminCommentUpdated');

            if (!commentData || !commentData.admin_comment) {
                // 코멘트 없음
                if (noCommentEl) noCommentEl.style.display = 'flex';
                if (commentContentEl) commentContentEl.style.display = 'none';
            } else {
                // 코멘트 있음
                if (noCommentEl) noCommentEl.style.display = 'none';
                if (commentContentEl) commentContentEl.style.display = 'block';
                
                if (commentTextEl) {
                    commentTextEl.textContent = commentData.admin_comment;
                }
                
                if (commentUpdatedEl && commentData.admin_comment_updated_at) {
                    const formattedTime = this.formatDateTime(new Date(commentData.admin_comment_updated_at));
                    commentUpdatedEl.textContent = `업데이트: ${formattedTime}`;
                }
            }
        }

        // ===== 비자 문서 관련 메서드 =====

        // 비자 문서 업로드 처리
        async handleVisaDocumentUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            try {
                // 파일 검증
                if (!this.validateFile(file, 10)) {
                    this.showErrorMessage('파일이 유효하지 않습니다. 10MB 이하의 이미지 또는 PDF 파일을 선택해주세요.');
                    event.target.value = '';
                    return;
                }

                this.showLoadingIndicator('비자 문서를 업로드하는 중...');

                if (!window.visaManagementAPI) {
                    throw new Error('API 모듈이 로드되지 않았습니다.');
                }

                const result = await window.visaManagementAPI.uploadVisaDocument(file);
                
                if (result.success) {
                    this.showVisaDocumentPreview(file, result.data.publicUrl);
                    this.showSuccessMessage('비자 문서가 성공적으로 업로드되었습니다.');
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('❌ 비자 문서 업로드 실패:', error);
                this.showErrorMessage(`비자 문서 업로드에 실패했습니다: ${error.message}`);
                event.target.value = '';
            } finally {
                this.hideLoadingIndicator();
            }
        }

        // 비자 문서 미리보기 표시
        showVisaDocumentPreview(file, documentUrl) {
            const labelEl = document.getElementById('visaDocumentLabel');
            const previewEl = document.getElementById('visaDocumentPreview');
            const imageContainerEl = document.getElementById('imagePreviewContainer');
            const pdfContainerEl = document.getElementById('pdfPreviewContainer');
            const imageEl = document.getElementById('visaDocumentImage');
            const pdfFileNameEl = document.getElementById('pdfFileName');
            const pdfFileSizeEl = document.getElementById('pdfFileSize');
            const uploadDateEl = document.getElementById('documentUploadDate');

            if (labelEl) labelEl.style.display = 'none';
            if (previewEl) previewEl.style.display = 'block';

            if (file.type.startsWith('image/')) {
                // 이미지 파일
                if (imageContainerEl) imageContainerEl.style.display = 'block';
                if (pdfContainerEl) pdfContainerEl.style.display = 'none';
                
                if (imageEl) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imageEl.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            } else if (file.type === 'application/pdf') {
                // PDF 파일
                if (imageContainerEl) imageContainerEl.style.display = 'none';
                if (pdfContainerEl) pdfContainerEl.style.display = 'block';
                
                if (pdfFileNameEl) pdfFileNameEl.textContent = file.name;
                if (pdfFileSizeEl) pdfFileSizeEl.textContent = this.formatFileSize(file.size);
            }

            if (uploadDateEl) {
                uploadDateEl.textContent = `업로드: ${this.formatDateTime(new Date())}`;
            }
        }

        // 기존 비자 문서 미리보기 표시 (DB에서 로드된 데이터)
        showExistingVisaDocumentPreview(documentUrl, uploadDate) {
            const labelEl = document.getElementById('visaDocumentLabel');
            const previewEl = document.getElementById('visaDocumentPreview');
            const imageContainerEl = document.getElementById('imagePreviewContainer');
            const pdfContainerEl = document.getElementById('pdfPreviewContainer');
            const imageEl = document.getElementById('visaDocumentImage');
            const pdfFileNameEl = document.getElementById('pdfFileName');
            const pdfFileSizeEl = document.getElementById('pdfFileSize');
            const uploadDateEl = document.getElementById('documentUploadDate');

            if (labelEl) labelEl.style.display = 'none';
            if (previewEl) previewEl.style.display = 'block';

            const isImage = this.isImageFile(documentUrl);
            
            if (isImage) {
                // 이미지 파일
                if (imageContainerEl) imageContainerEl.style.display = 'block';
                if (pdfContainerEl) pdfContainerEl.style.display = 'none';
                
                if (imageEl) {
                    imageEl.src = documentUrl;
                }
            } else {
                // PDF 파일
                if (imageContainerEl) imageContainerEl.style.display = 'none';
                if (pdfContainerEl) pdfContainerEl.style.display = 'block';
                
                const fileName = this.extractFileNameFromUrl(documentUrl);
                if (pdfFileNameEl) pdfFileNameEl.textContent = fileName || 'visa_document.pdf';
                if (pdfFileSizeEl) pdfFileSizeEl.textContent = '파일 크기 불명';
            }

            if (uploadDateEl && uploadDate) {
                uploadDateEl.textContent = `업로드: ${this.formatDateTime(new Date(uploadDate))}`;
            }
        }

        // 비자 문서 삭제 처리
        async handleVisaDocumentDelete() {
            try {
                if (!confirm('비자 문서를 삭제하시겠습니까?')) {
                    return;
                }

                this.showLoadingIndicator('비자 문서를 삭제하는 중...');

                if (!window.visaManagementAPI) {
                    throw new Error('API 모듈이 로드되지 않았습니다.');
                }

                // 현재 문서 URL 가져오기 (필요시 API에서 조회)
                const visaData = await window.visaManagementAPI.getVisaApplication();
                const documentUrl = visaData.success ? visaData.data?.visa_document_url : null;

                const result = await window.visaManagementAPI.deleteVisaDocument(documentUrl);
                
                if (result.success) {
                    this.hideVisaDocumentPreview();
                    this.showSuccessMessage('비자 문서가 삭제되었습니다.');
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('❌ 비자 문서 삭제 실패:', error);
                this.showErrorMessage(`비자 문서 삭제에 실패했습니다: ${error.message}`);
            } finally {
                this.hideLoadingIndicator();
            }
        }

        // 비자 문서 미리보기 숨기기
        hideVisaDocumentPreview() {
            const labelEl = document.getElementById('visaDocumentLabel');
            const previewEl = document.getElementById('visaDocumentPreview');
            const visaDocumentEl = document.getElementById('visaDocument');

            if (labelEl) labelEl.style.display = 'block';
            if (previewEl) previewEl.style.display = 'none';
            if (visaDocumentEl) visaDocumentEl.value = '';
        }

        // ===== 영수증 관련 메서드 =====

        // 영수증 목록 렌더링
        renderReceiptsList(receipts) {
            const receiptsListEl = document.getElementById('receiptsList');
            if (!receiptsListEl) return;

            if (!receipts || receipts.length === 0) {
                receiptsListEl.innerHTML = `
                    <div class="no-content-message">
                        <i data-lucide="receipt"></i>
                        <span>등록된 영수증이 없습니다.</span>
                    </div>
                `;
            } else {
                receiptsListEl.innerHTML = receipts.map(receipt => this.createReceiptItemHTML(receipt)).join('');
            }

            // Lucide 아이콘 새로고침
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // 영수증 아이템 이벤트 리스너 설정
            this.setupReceiptItemEvents();
        }

        // 영수증 아이템 HTML 생성
        createReceiptItemHTML(receipt) {
            const uploadDate = this.formatDateTime(new Date(receipt.uploaded_at));
            const isImage = this.isImageFile(receipt.receipt_url);
            const fileIcon = isImage ? 'image' : 'file-text';

            return `
                <div class="receipt-item" data-receipt-id="${receipt.id}">
                    <div class="receipt-info">
                        <div class="receipt-header">
                            <i data-lucide="${fileIcon}" class="receipt-icon"></i>
                            <h4 class="receipt-title">${this.escapeHtml(receipt.receipt_title)}</h4>
                        </div>
                        <p class="receipt-date">업로드: ${uploadDate}</p>
                    </div>
                    <div class="receipt-actions">
                        <button type="button" class="btn btn-sm btn-secondary preview-receipt-btn" 
                                data-receipt-url="${receipt.receipt_url}" 
                                data-receipt-title="${this.escapeHtml(receipt.receipt_title)}">
                            <i data-lucide="eye"></i>
                            미리보기
                        </button>
                        <button type="button" class="btn btn-sm btn-danger delete-receipt-btn" 
                                data-receipt-id="${receipt.id}" 
                                data-receipt-url="${receipt.receipt_url}"
                                data-receipt-title="${this.escapeHtml(receipt.receipt_title)}">
                            <i data-lucide="trash-2"></i>
                            삭제
                        </button>
                    </div>
                </div>
            `;
        }

        // 영수증 아이템 이벤트 설정
        setupReceiptItemEvents() {
            // 미리보기 버튼
            const previewBtns = document.querySelectorAll('.preview-receipt-btn');
            previewBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const url = e.currentTarget.dataset.receiptUrl;
                    const title = e.currentTarget.dataset.receiptTitle;
                    this.showFilePreview(url, title);
                });
            });

            // 삭제 버튼
            const deleteBtns = document.querySelectorAll('.delete-receipt-btn');
            deleteBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const receiptId = e.currentTarget.dataset.receiptId;
                    const receiptUrl = e.currentTarget.dataset.receiptUrl;
                    const receiptTitle = e.currentTarget.dataset.receiptTitle;
                    this.handleReceiptDelete(receiptId, receiptUrl, receiptTitle);
                });
            });
        }

        // 영수증 모달 표시
        showReceiptModal(receiptData = null) {
            const modal = document.getElementById('receiptModal');
            const titleEl = document.getElementById('receiptModalTitle');
            const receiptTitleEl = document.getElementById('receiptTitle');
            const receiptFileEl = document.getElementById('receiptFile');
            
            if (!modal) return;

            // 모달 초기화
            this.currentReceiptId = receiptData?.id || null;
            
            if (receiptData) {
                // 편집 모드
                titleEl.textContent = '영수증 수정';
                receiptTitleEl.value = receiptData.receipt_title;
                receiptFileEl.required = false;
            } else {
                // 새로 추가 모드
                titleEl.textContent = '영수증 추가';
                receiptTitleEl.value = '';
                receiptFileEl.required = true;
            }

            // 파일 프리뷰 초기화
            this.removeReceiptFilePreview();

            modal.style.display = 'block';
        }

        // 영수증 모달 숨기기
        hideReceiptModal() {
            const modal = document.getElementById('receiptModal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // 폼 초기화
            const form = document.getElementById('receiptForm');
            if (form) {
                form.reset();
            }
            
            this.currentReceiptId = null;
            this.removeReceiptFilePreview();
        }

        // 영수증 파일 미리보기
        handleReceiptFilePreview(event) {
            const file = event.target.files[0];
            if (!file) return;

            // 파일 검증
            if (!this.validateFile(file, 5)) {
                this.showErrorMessage('파일이 유효하지 않습니다. 5MB 이하의 이미지 또는 PDF 파일을 선택해주세요.');
                event.target.value = '';
                return;
            }

            const previewEl = document.getElementById('receiptFilePreview');
            const fileNameEl = document.getElementById('receiptFileName');
            const fileSizeEl = document.getElementById('receiptFileSize');

            if (previewEl && fileNameEl && fileSizeEl) {
                fileNameEl.textContent = file.name;
                fileSizeEl.textContent = this.formatFileSize(file.size);
                previewEl.style.display = 'flex';
            }
        }

        // 영수증 파일 미리보기 제거
        removeReceiptFilePreview() {
            const previewEl = document.getElementById('receiptFilePreview');
            const receiptFileEl = document.getElementById('receiptFile');

            if (previewEl) previewEl.style.display = 'none';
            if (receiptFileEl) receiptFileEl.value = '';
        }

        // 영수증 폼 제출 처리
        async handleReceiptSubmit(event) {
            event.preventDefault();

            try {
                const titleEl = document.getElementById('receiptTitle');
                const fileEl = document.getElementById('receiptFile');
                
                const title = titleEl?.value?.trim();
                const file = fileEl?.files[0];

                if (!title) {
                    this.showErrorMessage('영수증 제목을 입력해주세요.');
                    return;
                }

                if (!file && !this.currentReceiptId) {
                    this.showErrorMessage('영수증 파일을 선택해주세요.');
                    return;
                }

                const saveBtn = document.getElementById('saveReceiptBtn');
                const saveBtnText = document.getElementById('saveReceiptBtnText');
                
                if (saveBtn) saveBtn.disabled = true;
                if (saveBtnText) saveBtnText.textContent = '저장 중...';

                if (!window.visaManagementAPI) {
                    throw new Error('API 모듈이 로드되지 않았습니다.');
                }

                const result = await window.visaManagementAPI.addVisaReceipt(title, file);
                
                if (result.success) {
                    this.hideReceiptModal();
                    this.showSuccessMessage('영수증이 성공적으로 추가되었습니다.');
                    
                    // 영수증 목록 새로고침
                    if (window.visaManagement?.loadReceiptsList) {
                        window.visaManagement.loadReceiptsList();
                    }
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('❌ 영수증 저장 실패:', error);
                this.showErrorMessage(`영수증 저장에 실패했습니다: ${error.message}`);
            } finally {
                const saveBtn = document.getElementById('saveReceiptBtn');
                const saveBtnText = document.getElementById('saveReceiptBtnText');
                
                if (saveBtn) saveBtn.disabled = false;
                if (saveBtnText) saveBtnText.textContent = '저장하기';
            }
        }

        // 영수증 삭제 처리
        async handleReceiptDelete(receiptId, receiptUrl, receiptTitle) {
            try {
                if (!confirm(`"${receiptTitle}" 영수증을 삭제하시겠습니까?`)) {
                    return;
                }

                this.showLoadingIndicator('영수증을 삭제하는 중...');

                if (!window.visaManagementAPI) {
                    throw new Error('API 모듈이 로드되지 않았습니다.');
                }

                const result = await window.visaManagementAPI.deleteVisaReceipt(receiptId, receiptUrl);
                
                if (result.success) {
                    this.showSuccessMessage('영수증이 삭제되었습니다.');
                    
                    // 영수증 목록 새로고침
                    if (window.visaManagement?.loadReceiptsList) {
                        window.visaManagement.loadReceiptsList();
                    }
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('❌ 영수증 삭제 실패:', error);
                this.showErrorMessage(`영수증 삭제에 실패했습니다: ${error.message}`);
            } finally {
                this.hideLoadingIndicator();
            }
        }

        // ===== 파일 미리보기 모달 관련 메서드 =====

        // 파일 미리보기 표시
        showFilePreview(fileUrl, title) {
            const modal = document.getElementById('filePreviewModal');
            const titleEl = document.getElementById('previewModalTitle');
            const contentEl = document.getElementById('previewContent');

            if (!modal || !contentEl) return;

            if (titleEl) {
                titleEl.textContent = `${title} - 미리보기`;
            }

            const isImage = this.isImageFile(fileUrl);

            if (isImage) {
                contentEl.innerHTML = `
                    <div class="image-preview-large">
                        <img src="${fileUrl}" alt="${this.escapeHtml(title)}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">
                    </div>
                `;
            } else {
                contentEl.innerHTML = `
                    <div class="pdf-preview-large">
                        <div class="pdf-info-large">
                            <i data-lucide="file-text" style="width: 48px; height: 48px;"></i>
                            <h3>${this.escapeHtml(title)}</h3>
                            <p>PDF 파일은 미리보기가 지원되지 않습니다.</p>
                            <a href="${fileUrl}" target="_blank" class="btn btn-primary">
                                <i data-lucide="external-link"></i>
                                새 창에서 열기
                            </a>
                        </div>
                    </div>
                `;
            }

            // Lucide 아이콘 새로고침
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            modal.style.display = 'block';
        }

        // 파일 미리보기 모달 숨기기
        hidePreviewModal() {
            const modal = document.getElementById('filePreviewModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        // ===== 유틸리티 메서드 =====

        // 파일 검증
        validateFile(file, maxSizeMB) {
            if (!file) return false;

            // 크기 검증
            const maxSize = maxSizeMB * 1024 * 1024;
            if (file.size > maxSize) return false;

            // 형식 검증
            const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                'application/pdf'
            ];
            
            return allowedTypes.includes(file.type);
        }

        // 이미지 파일 여부 확인
        isImageFile(url) {
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const lowerUrl = url.toLowerCase();
            return imageExtensions.some(ext => lowerUrl.includes(ext));
        }

        // URL에서 파일명 추출
        extractFileNameFromUrl(url) {
            try {
                const urlParts = url.split('/');
                return urlParts[urlParts.length - 1];
            } catch (error) {
                return 'unknown_file';
            }
        }

        // 파일 크기 포맷팅
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // 날짜 시간 포맷팅
        formatDateTime(date) {
            try {
                return date.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return date.toString();
            }
        }

        // HTML 이스케이프
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ===== 메시지 표시 메서드 =====

        // 성공 메시지 표시
        showSuccessMessage(message) {
            const successEl = document.getElementById('successMessage');
            if (successEl) {
                successEl.textContent = message;
                successEl.style.display = 'block';
                
                setTimeout(() => {
                    successEl.style.display = 'none';
                }, 3000);
            }
        }

        // 에러 메시지 표시
        showErrorMessage(message) {
            const errorEl = document.getElementById('errorMessage');
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
                
                setTimeout(() => {
                    errorEl.style.display = 'none';
                }, 5000);
            }
        }

        // 로딩 인디케이터 표시
        showLoadingIndicator(message = '처리 중...') {
            const loadingEl = document.getElementById('loadingIndicator');
            if (loadingEl) {
                const spinnerText = loadingEl.querySelector('span');
                if (spinnerText) {
                    spinnerText.textContent = message;
                }
                loadingEl.style.display = 'flex';
            }
        }

        // 로딩 인디케이터 숨기기
        hideLoadingIndicator() {
            const loadingEl = document.getElementById('loadingIndicator');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
        }

        // ===== 데이터 표시 메서드 =====

        // 비자 상태 표시
        displayVisaStatus(visaData) {
            const visaStatusEl = document.getElementById('visaStatus');
            const lastUpdatedEl = document.getElementById('statusLastUpdated');

            if (visaStatusEl && visaData?.visa_status) {
                visaStatusEl.value = visaData.visa_status;
            }

            if (lastUpdatedEl && visaData?.visa_status_updated_at) {
                const formattedTime = this.formatDateTime(new Date(visaData.visa_status_updated_at));
                lastUpdatedEl.textContent = `마지막 업데이트: ${formattedTime}`;
            }
        }

        // 비자 문서 표시
        displayVisaDocument(visaData) {
            if (visaData?.visa_document_url) {
                this.showExistingVisaDocumentPreview(
                    visaData.visa_document_url,
                    visaData.visa_document_uploaded_at
                );
            }
        }
    }

    // 전역에 UI 인스턴스 생성
    window.visaManagementUI = new VisaManagementUI();

    console.log('✅ VisaManagementUI v1.0.0 로드 완료');

})();