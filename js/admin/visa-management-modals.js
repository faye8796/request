/**
 * 관리자용 비자 발급 관리 시스템 - 모달 시스템 모듈
 * Version: 1.0.1
 * Description: 비자 문서 뷰어, 영수증 관리 모달 등 모든 모달 시스템 관리 - 안정성 개선
 */

import { VisaManagementAPI } from './visa-management-api.js';

class VisaManagementModals {
    constructor() {
        this.api = new VisaManagementAPI();
        this.activeModals = [];
        this.setupGlobalStyles();
    }

    /**
     * 전역 모달 스타일 설정
     */
    setupGlobalStyles() {
        if (document.getElementById('visa-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'visa-modal-styles';
        style.textContent = `
            .visa-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .visa-modal-overlay.show {
                opacity: 1;
            }
            
            .visa-modal-content {
                background: white;
                border-radius: 12px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .visa-modal-overlay.show .visa-modal-content {
                transform: scale(1);
            }
            
            .visa-modal-header {
                padding: 20px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8f9fa;
            }
            
            .visa-modal-title {
                margin: 0;
                color: #2c3e50;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .visa-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
                padding: 5px;
                border-radius: 4px;
                transition: all 0.3s;
            }
            
            .visa-modal-close:hover {
                background: #e9ecef;
                color: #495057;
            }
            
            .visa-modal-body {
                padding: 20px;
                overflow-y: auto;
                max-height: calc(90vh - 140px);
            }
            
            .visa-modal-actions {
                padding: 15px 20px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .visa-modal-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.3s;
            }
            
            .visa-modal-btn.primary {
                background: #007bff;
                color: white;
            }
            
            .visa-modal-btn.primary:hover {
                background: #0056b3;
            }
            
            .visa-modal-btn.secondary {
                background: #6c757d;
                color: white;
            }
            
            .visa-modal-btn.secondary:hover {
                background: #545b62;
            }
            
            .visa-modal-btn.success {
                background: #28a745;
                color: white;
            }
            
            .visa-modal-btn.success:hover {
                background: #1e7e34;
            }
            
            /* 이미지 뷰어 */
            .visa-image-viewer {
                text-align: center;
                min-width: 500px;
            }
            
            .visa-image-viewer img {
                max-width: 100%;
                max-height: 70vh;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            }
            
            .visa-image-controls {
                margin-top: 15px;
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            
            .visa-zoom-btn {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .visa-zoom-btn:hover {
                background: #e9ecef;
            }
            
            /* PDF 뷰어 */
            .visa-pdf-viewer {
                min-width: 700px;
                min-height: 500px;
            }
            
            .visa-pdf-viewer iframe {
                width: 100%;
                height: 70vh;
                border: none;
                border-radius: 8px;
            }
            
            /* 영수증 목록 */
            .receipts-list {
                min-width: 600px;
            }
            
            .receipt-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                margin-bottom: 10px;
                background: #f8f9fa;
                transition: all 0.3s;
            }
            
            .receipt-item:hover {
                background: #e9ecef;
                border-color: #adb5bd;
            }
            
            .receipt-info {
                flex: 1;
            }
            
            .receipt-title {
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 5px;
            }
            
            .receipt-meta {
                font-size: 12px;
                color: #6c757d;
            }
            
            .receipt-actions {
                display: flex;
                gap: 8px;
            }
            
            .receipt-action-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.3s;
            }
            
            .receipt-view-btn {
                background: #17a2b8;
                color: white;
            }
            
            .receipt-view-btn:hover {
                background: #138496;
            }
            
            .receipt-download-btn {
                background: #ffc107;
                color: #212529;
            }
            
            .receipt-download-btn:hover {
                background: #e0a800;
            }
            
            .receipt-delete-btn {
                background: #dc3545;
                color: white;
            }
            
            .receipt-delete-btn:hover {
                background: #c82333;
            }
            
            .no-receipts {
                text-align: center;
                padding: 40px;
                color: #6c757d;
            }
            
            .no-receipts i {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.5;
            }
            
            /* 반응형 */
            @media (max-width: 768px) {
                .visa-modal-content {
                    max-width: 95vw;
                    margin: 10px;
                }
                
                .visa-image-viewer {
                    min-width: auto;
                }
                
                .visa-pdf-viewer {
                    min-width: auto;
                }
                
                .receipts-list {
                    min-width: auto;
                }
                
                .receipt-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .receipt-actions {
                    width: 100%;
                    justify-content: flex-end;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 기본 모달 생성
     */
    createModal(title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'visa-modal-overlay';
        modal.innerHTML = `
            <div class="visa-modal-content">
                <div class="visa-modal-header">
                    <h3 class="visa-modal-title">${title}</h3>
                    <button class="visa-modal-close" aria-label="닫기">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="visa-modal-body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="visa-modal-actions">
                        ${actions.map(action => `
                            <button class="visa-modal-btn ${action.class || 'secondary'}" 
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
        modal.querySelector('.visa-modal-close').addEventListener('click', () => {
            this.closeModal(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        // ESC 키로 닫기
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        document.body.appendChild(modal);
        this.activeModals.push(modal);
        
        // 아이콘 초기화
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
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            const index = this.activeModals.indexOf(modal);
            if (index > -1) {
                this.activeModals.splice(index, 1);
            }
        }, 300);
    }

    /**
     * 비자 문서 뷰어 모달
     */
    async showVisaDocumentViewer(studentId, studentName) {
        try {
            // 비자 정보 조회
            const visa = await this.api.getVisaApplication(studentId);
            
            if (!visa || !visa.visa_document_url) {
                this.showError('업로드된 비자 문서가 없습니다.');
                return;
            }

            const fileExtension = this.getFileExtension(visa.visa_document_url);
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension.toLowerCase());
            const isPDF = fileExtension.toLowerCase() === 'pdf';

            let content;
            if (isImage) {
                content = this.createImageViewerContent(visa.visa_document_url);
            } else if (isPDF) {
                content = this.createPDFViewerContent(visa.visa_document_url);
            } else {
                content = `
                    <div class="unsupported-file">
                        <i data-lucide="file"></i>
                        <p>지원하지 않는 파일 형식입니다.</p>
                        <p>다운로드하여 확인해주세요.</p>
                    </div>
                `;
            }

            const actions = [
                {
                    text: '다운로드',
                    icon: 'download',
                    class: 'secondary',
                    action: 'download'
                },
                {
                    text: '닫기',
                    class: 'primary',
                    action: 'close'
                }
            ];

            const modal = this.createModal(
                `<i data-lucide="file-text"></i> ${studentName}님의 비자 문서`,
                content,
                actions
            );

            // 액션 이벤트 처리
            modal.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                if (action === 'download') {
                    this.downloadFile(visa.visa_document_url, `${studentName}_비자문서.${fileExtension}`);
                } else if (action === 'close') {
                    this.closeModal(modal);
                }
            });

        } catch (error) {
            console.error('비자 문서 뷰어 오류:', error);
            this.showError('비자 문서를 불러오는데 실패했습니다.');
        }
    }

    /**
     * 영수증 관리 모달
     */
    async showReceiptsModal(studentId, studentName) {
        try {
            // 영수증 목록 조회
            const receipts = await this.api.getStudentReceipts(studentId);

            const content = receipts.length > 0 
                ? this.createReceiptsListContent(receipts)
                : this.createNoReceiptsContent();

            const actions = receipts.length > 0 ? [
                {
                    text: '전체 다운로드',
                    icon: 'download-cloud',
                    class: 'secondary',
                    action: 'download-all'
                },
                {
                    text: '닫기',
                    class: 'primary',
                    action: 'close'
                }
            ] : [
                {
                    text: '닫기',
                    class: 'primary',
                    action: 'close'
                }
            ];

            const modal = this.createModal(
                `<i data-lucide="receipt"></i> ${studentName}님의 영수증 목록 (${receipts.length}개)`,
                content,
                actions
            );

            // 개별 영수증 액션 이벤트 처리
            modal.addEventListener('click', async (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                const receiptId = e.target.closest('[data-receipt-id]')?.dataset.receiptId;

                if (action === 'view-receipt' && receiptId) {
                    const receipt = receipts.find(r => r.id === receiptId);
                    if (receipt) {
                        this.showReceiptViewer(receipt);
                    }
                } else if (action === 'download-receipt' && receiptId) {
                    const receipt = receipts.find(r => r.id === receiptId);
                    if (receipt) {
                        this.downloadFile(receipt.receipt_url, `${studentName}_${receipt.receipt_title}.${this.getFileExtension(receipt.receipt_url)}`);
                    }
                } else if (action === 'delete-receipt' && receiptId) {
                    this.confirmDeleteReceipt(receiptId, () => {
                        this.closeModal(modal);
                        this.showReceiptsModal(studentId, studentName);
                    });
                } else if (action === 'download-all') {
                    this.downloadAllReceipts(receipts, studentName);
                } else if (action === 'close') {
                    this.closeModal(modal);
                }
            });

        } catch (error) {
            console.error('영수증 모달 오류:', error);
            this.showError('영수증 목록을 불러오는데 실패했습니다.');
        }
    }

    /**
     * 개별 영수증 뷰어
     */
    showReceiptViewer(receipt) {
        const fileExtension = this.getFileExtension(receipt.receipt_url);
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension.toLowerCase());
        const isPDF = fileExtension.toLowerCase() === 'pdf';

        let content;
        if (isImage) {
            content = this.createImageViewerContent(receipt.receipt_url);
        } else if (isPDF) {
            content = this.createPDFViewerContent(receipt.receipt_url);
        } else {
            content = `
                <div class="unsupported-file">
                    <i data-lucide="file"></i>
                    <p>지원하지 않는 파일 형식입니다.</p>
                    <p>다운로드하여 확인해주세요.</p>
                </div>
            `;
        }

        const actions = [
            {
                text: '다운로드',
                icon: 'download',
                class: 'secondary',
                action: 'download'
            },
            {
                text: '닫기',
                class: 'primary',
                action: 'close'
            }
        ];

        const modal = this.createModal(
            `<i data-lucide="receipt"></i> ${receipt.receipt_title}`,
            content,
            actions
        );

        modal.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'download') {
                this.downloadFile(receipt.receipt_url, `${receipt.receipt_title}.${fileExtension}`);
            } else if (action === 'close') {
                this.closeModal(modal);
            }
        });
    }

    /**
     * 이미지 뷰어 콘텐츠 생성
     */
    createImageViewerContent(imageUrl) {
        return `
            <div class="visa-image-viewer">
                <img src="${imageUrl}" alt="이미지" id="modal-image">
                <div class="visa-image-controls">
                    <button class="visa-zoom-btn" data-zoom="in">
                        <i data-lucide="zoom-in"></i> 확대
                    </button>
                    <button class="visa-zoom-btn" data-zoom="out">
                        <i data-lucide="zoom-out"></i> 축소
                    </button>
                    <button class="visa-zoom-btn" data-zoom="reset">
                        <i data-lucide="maximize"></i> 원본크기
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * PDF 뷰어 콘텐츠 생성
     */
    createPDFViewerContent(pdfUrl) {
        return `
            <div class="visa-pdf-viewer">
                <iframe src="${pdfUrl}" type="application/pdf">
                    <p>PDF를 표시할 수 없습니다. <a href="${pdfUrl}" target="_blank">새 창에서 열기</a></p>
                </iframe>
            </div>
        `;
    }

    /**
     * 영수증 목록 콘텐츠 생성
     */
    createReceiptsListContent(receipts) {
        return `
            <div class="receipts-list">
                ${receipts.map(receipt => `
                    <div class="receipt-item" data-receipt-id="${receipt.id}">
                        <div class="receipt-info">
                            <div class="receipt-title">${this.escapeHtml(receipt.receipt_title)}</div>
                            <div class="receipt-meta">
                                업로드일: ${this.formatDateTime(receipt.uploaded_at)}
                            </div>
                        </div>
                        <div class="receipt-actions">
                            <button class="receipt-action-btn receipt-view-btn" 
                                    data-action="view-receipt" 
                                    data-receipt-id="${receipt.id}">
                                <i data-lucide="eye"></i> 보기
                            </button>
                            <button class="receipt-action-btn receipt-download-btn" 
                                    data-action="download-receipt" 
                                    data-receipt-id="${receipt.id}">
                                <i data-lucide="download"></i> 다운로드
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 영수증 없음 콘텐츠 생성
     */
    createNoReceiptsContent() {
        return `
            <div class="no-receipts">
                <i data-lucide="inbox"></i>
                <p>등록된 영수증이 없습니다.</p>
            </div>
        `;
    }

    /**
     * 영수증 삭제 확인
     */
    confirmDeleteReceipt(receiptId, onSuccess) {
        const modal = this.createModal(
            '<i data-lucide="trash-2"></i> 영수증 삭제 확인',
            '<p>정말로 이 영수증을 삭제하시겠습니까?</p><p><strong>삭제된 영수증은 복구할 수 없습니다.</strong></p>',
            [
                {
                    text: '취소',
                    class: 'secondary',
                    action: 'cancel'
                },
                {
                    text: '삭제',
                    icon: 'trash-2',
                    class: 'danger',
                    action: 'delete'
                }
            ]
        );

        modal.addEventListener('click', async (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'delete') {
                try {
                    await this.api.deleteReceipt(receiptId);
                    this.closeModal(modal);
                    onSuccess();
                    this.showSuccess('영수증이 삭제되었습니다.');
                } catch (error) {
                    console.error('영수증 삭제 오류:', error);
                    this.showError('영수증 삭제에 실패했습니다.');
                }
            } else if (action === 'cancel') {
                this.closeModal(modal);
            }
        });
    }

    /**
     * 전체 영수증 다운로드
     */
    async downloadAllReceipts(receipts, studentName) {
        try {
            // 간단한 구현: 각 파일을 순차적으로 다운로드
            for (const receipt of receipts) {
                const extension = this.getFileExtension(receipt.receipt_url);
                this.downloadFile(receipt.receipt_url, `${studentName}_${receipt.receipt_title}.${extension}`);
                
                // 다운로드 간격을 둠
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.showSuccess(`${receipts.length}개의 영수증 다운로드를 시작했습니다.`);
        } catch (error) {
            console.error('전체 다운로드 오류:', error);
            this.showError('영수증 다운로드에 실패했습니다.');
        }
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
     * 파일 확장자 추출
     */
    getFileExtension(url) {
        const urlParts = url.split('.');
        return urlParts.length > 1 ? urlParts[urlParts.length - 1] : '';
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
     * 성공 메시지 표시
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * 에러 메시지 표시
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'info') {
        // 기존 토스트가 있으면 제거
        const existingToast = document.querySelector('.visa-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `visa-toast visa-toast-${type}`;
        toast.innerHTML = `
            <div class="visa-toast-content">
                <i data-lucide="${this.getToastIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;

        // 스타일 적용
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 20000;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(toast);
        if (window.lucide) {
            lucide.createIcons();
        }

        // 애니메이션
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // 자동 제거
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
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
     * 토스트 색상 가져오기
     */
    getToastColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }

    /**
     * 모든 모달 닫기
     */
    closeAllModals() {
        this.activeModals.forEach(modal => {
            this.closeModal(modal);
        });
    }
}

// 모듈 내보내기
export { VisaManagementModals };