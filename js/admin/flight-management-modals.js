/**
 * 🪟 항공권 관리 모달 시스템 v10.0.0 - PART 1
 * 완전한 모달 시스템 구현 - 상세보기, 승인, 반려 모달
 * 
 * 🎯 주요 기능:
 * - 항공권 신청 상세보기 모달
 * - 승인/반려 처리 모달
 * - 여권정보 표시 모달
 * - 파일 미리보기 시스템
 * - 워크플로우 처리 시스템
 * 
 * @version 10.0.0
 * @author 세종학당 개발팀
 * @created 2025-07-23
 */

class FlightManagementModals {
    constructor(flightManagementSystem) {
        console.log('🪟 FlightManagementModals v10.0.0 초기화 시작...');
        
        this.system = flightManagementSystem;
        this.isInitialized = false;

        // 🎯 모달 상태 관리
        this.modalStates = {
            activeModals: new Set(),
            modalHistory: [],
            currentModal: null,
            preventClose: false
        };

        // 🎨 모달 설정
        this.modalConfig = {
            animationDuration: 300,
            backdropClose: true,
            escapeKeyClose: true,
            stackable: true,
            maxWidth: {
                small: '400px',
                medium: '600px',
                large: '800px',
                extraLarge: '1000px'
            }
        };

        // 📋 모달 템플릿 저장
        this.templates = new Map();

        this.init();
    }

    /**
     * 🚀 모달 시스템 초기화
     */
    async init() {
        try {
            console.log('🚀 FlightManagementModals 초기화 중...');

            // 모달 컨테이너 확인/생성
            this.setupModalContainer();

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // 모달 템플릿 등록
            this.registerModalTemplates();

            // 시스템 이벤트 구독
            this.subscribeToSystemEvents();

            this.isInitialized = true;
            console.log('✅ FlightManagementModals 초기화 완료');

        } catch (error) {
            console.error('❌ FlightManagementModals 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 🏗️ 모달 컨테이너 설정
     */
    setupModalContainer() {
        let container = document.getElementById('modalContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modalContainer';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        this.modalContainer = container;
        console.log('✅ 모달 컨테이너 설정 완료');
    }

    /**
     * 🎮 이벤트 리스너 설정
     */
    setupEventListeners() {
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalConfig.escapeKeyClose) {
                this.closeTopModal();
            }
        });

        // 전역 클릭 이벤트 (카드 액션 버튼)
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        console.log('✅ 모달 이벤트 리스너 설정 완료');
    }

    /**
     * 🎯 전역 클릭 처리
     */
    handleGlobalClick(event) {
        const button = event.target.closest('.action-btn');
        if (!button) return;

        const action = button.dataset.action;
        const requestId = button.dataset.requestId;
        const userId = button.dataset.userId;

        if (!action) return;

        event.preventDefault();
        event.stopPropagation();

        console.log('🎯 모달 액션 처리:', { action, requestId, userId });

        switch (action) {
            case 'view':
                this.showRequestDetailModal(requestId);
                break;
            case 'approve':
                this.showApproveModal(requestId);
                break;
            case 'reject':
                this.showRejectModal(requestId);
                break;
            case 'passport':
                this.showPassportModal(userId);
                break;
            case 'upload-ticket':
                this.showUploadTicketModal(requestId);
                break;
            case 'final-amount':
                this.showFinalAmountModal(requestId);
                break;
            case 'view-ticket':
                this.showTicketViewModal(requestId);
                break;
            case 'view-receipt':
                this.showReceiptViewModal(requestId);
                break;
            default:
                console.warn('⚠️ 알 수 없는 액션:', action);
        }
    }

    /**
     * 📋 모달 템플릿 등록
     */
    registerModalTemplates() {
        // 기본 모달 템플릿
        this.templates.set('base', {
            html: `
                <div class="modal-overlay">
                    <div class="modal-container">
                        <div class="modal-header">
                            <h2 class="modal-title">{{title}}</h2>
                            <button class="modal-close">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            {{body}}
                        </div>
                        <div class="modal-footer">
                            {{footer}}
                        </div>
                    </div>
                </div>
            `
        });

        console.log('✅ 모달 템플릿 등록 완료');
    }

    /**
     * 📡 시스템 이벤트 구독
     */
    subscribeToSystemEvents() {
        if (!this.system) return;

        this.system.on('data:requestStatusChanged', (data) => {
            this.handleRequestStatusChange(data);
        });

        console.log('✅ 시스템 이벤트 구독 완료');
    }

    /**
     * 👁️ 요청 상세보기 모달
     */
    async showRequestDetailModal(requestId) {
        try {
            console.log('👁️ 요청 상세보기 모달 표시:', requestId);

            // 데이터 로드
            const request = await this.loadRequestData(requestId);
            if (!request) {
                this.showError('요청 정보를 찾을 수 없습니다.');
                return;
            }

            const user = request.user_profiles;

            // 모달 HTML 생성
            const modalHtml = `
                <div class="modal-overlay show" id="detailModal">
                    <div class="modal-container large">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="eye"></i>
                                항공권 신청 상세 정보
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('detailModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="detail-grid">
                                <!-- 신청자 정보 -->
                                <div class="detail-section">
                                    <h3><i data-lucide="user"></i> 신청자 정보</h3>
                                    <div class="detail-content">
                                        <div class="detail-row">
                                            <span class="detail-label">이름</span>
                                            <span class="detail-value">${user.name}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">이메일</span>
                                            <span class="detail-value">${user.email}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">파견 학당</span>
                                            <span class="detail-value">${user.sejong_institute || '미설정'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">전공 분야</span>
                                            <span class="detail-value">${user.field || '미설정'}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- 활동 기간 정보 -->
                                <div class="detail-section">
                                    <h3><i data-lucide="calendar"></i> 활동 기간</h3>
                                    <div class="detail-content">
                                        <div class="detail-row">
                                            <span class="detail-label">현지 도착일</span>
                                            <span class="detail-value">${this.formatDate(user.actual_arrival_date) || '미설정'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">근무 종료일</span>
                                            <span class="detail-value">${this.formatDate(user.actual_work_end_date) || '미설정'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">실제 활동일</span>
                                            <span class="detail-value">${user.actual_work_days || 0}일</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">최소 필요일</span>
                                            <span class="detail-value">${user.minimum_required_days || 0}일</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- 항공권 정보 -->
                                <div class="detail-section">
                                    <h3><i data-lucide="plane"></i> 항공권 정보</h3>
                                    <div class="detail-content">
                                        <div class="detail-row">
                                            <span class="detail-label">구매 방식</span>
                                            <span class="detail-value purchase-type ${request.purchase_type}">
                                                ${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}
                                            </span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">출국일</span>
                                            <span class="detail-value">${this.formatFullDate(request.departure_date)}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">귀국일</span>
                                            <span class="detail-value">${this.formatFullDate(request.return_date)}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">출발공항</span>
                                            <span class="detail-value">${request.departure_airport || '미입력'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">도착공항</span>
                                            <span class="detail-value">${request.arrival_airport || '미입력'}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- 가격 정보 -->
                                <div class="detail-section">
                                    <h3><i data-lucide="dollar-sign"></i> 가격 정보</h3>
                                    <div class="detail-content">
                                        <div class="detail-row">
                                            <span class="detail-label">학생 제출 금액</span>
                                            <span class="detail-value price">
                                                ${this.formatPrice(request.ticket_price, request.currency)}
                                            </span>
                                        </div>
                                        ${request.price_source ? `
                                        <div class="detail-row">
                                            <span class="detail-label">가격 출처</span>
                                            <span class="detail-value">${request.price_source}</span>
                                        </div>
                                        ` : ''}
                                        ${request.admin_final_amount ? `
                                        <div class="detail-row">
                                            <span class="detail-label">관리자 최종 금액</span>
                                            <span class="detail-value price admin">
                                                ${this.formatPrice(request.admin_final_amount, request.admin_final_currency)}
                                            </span>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>

                                <!-- 상태 정보 -->
                                <div class="detail-section">
                                    <h3><i data-lucide="info"></i> 신청 상태</h3>
                                    <div class="detail-content">
                                        <div class="detail-row">
                                            <span class="detail-label">현재 상태</span>
                                            <span class="detail-value">
                                                <span class="status-badge status-${request.status}">
                                                    ${this.getStatusText(request.status)}
                                                </span>
                                            </span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">신청일</span>
                                            <span class="detail-value">${this.formatFullDate(request.created_at)}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">최종 업데이트</span>
                                            <span class="detail-value">${this.formatFullDate(request.updated_at)}</span>
                                        </div>
                                        ${request.rejection_reason ? `
                                        <div class="detail-row">
                                            <span class="detail-label">반려 사유</span>
                                            <span class="detail-value rejection-reason">${request.rejection_reason}</span>
                                        </div>
                                        ` : ''}
                                        ${request.admin_notes ? `
                                        <div class="detail-row">
                                            <span class="detail-label">관리자 메모</span>
                                            <span class="detail-value admin-notes">${request.admin_notes}</span>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>

                                <!-- 첨부 파일 -->
                                <div class="detail-section full-width">
                                    <h3><i data-lucide="paperclip"></i> 첨부 파일</h3>
                                    <div class="detail-content">
                                        <div class="file-attachments">
                                            ${this.generateFileAttachments(request)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('detailModal')">
                                닫기
                            </button>
                            ${this.generateDetailModalActions(request)}
                        </div>
                    </div>
                </div>
            `;

            // 모달 표시
            this.showModal(modalHtml, 'detailModal');

        } catch (error) {
            console.error('❌ 상세보기 모달 표시 실패:', error);
            this.showError('상세 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * ✅ 승인 모달
     */
    async showApproveModal(requestId) {
        try {
            console.log('✅ 승인 모달 표시:', requestId);

            const request = await this.loadRequestData(requestId);
            if (!request) {
                this.showError('요청 정보를 찾을 수 없습니다.');
                return;
            }

            const modalHtml = `
                <div class="modal-overlay show" id="approveModal">
                    <div class="modal-container medium">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="check-circle"></i>
                                항공권 신청 승인
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('approveModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="approve-content">
                                <div class="request-summary">
                                    <h4>승인할 신청 정보</h4>
                                    <div class="summary-item">
                                        <span class="label">신청자:</span>
                                        <span class="value">${request.user_profiles.name}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">구매방식:</span>
                                        <span class="value">${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">출국일:</span>
                                        <span class="value">${this.formatFullDate(request.departure_date)}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">항공료:</span>
                                        <span class="value">${this.formatPrice(request.ticket_price, request.currency)}</span>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="adminNotes">관리자 메모 (선택사항)</label>
                                    <textarea id="adminNotes" 
                                              placeholder="승인과 관련된 특별한 사항이나 메모를 입력하세요..."
                                              rows="4"></textarea>
                                </div>

                                <div class="warning-box">
                                    <i data-lucide="alert-triangle"></i>
                                    <div>
                                        <strong>승인 후 안내사항</strong>
                                        <ul>
                                            <li>${request.purchase_type === 'direct' ? '학생이 직접 항공권을 구매하게 됩니다.' : '관리자가 대신 항공권을 구매해야 합니다.'}</li>
                                            <li>승인 후에는 상태를 되돌릴 수 없습니다.</li>
                                            <li>학생에게 승인 알림이 자동으로 발송됩니다.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('approveModal')">
                                취소
                            </button>
                            <button class="btn success" onclick="window.flightModals.confirmApproval('${requestId}')">
                                <i data-lucide="check"></i>
                                승인하기
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, 'approveModal');

        } catch (error) {
            console.error('❌ 승인 모달 표시 실패:', error);
            this.showError('승인 모달을 표시하는 중 오류가 발생했습니다.');
        }
    }

    /**
     * ❌ 반려 모달
     */
    async showRejectModal(requestId) {
        try {
            console.log('❌ 반려 모달 표시:', requestId);

            const request = await this.loadRequestData(requestId);
            if (!request) {
                this.showError('요청 정보를 찾을 수 없습니다.');
                return;
            }

            const modalHtml = `
                <div class="modal-overlay show" id="rejectModal">
                    <div class="modal-container medium">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="x-circle"></i>
                                항공권 신청 반려
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('rejectModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="reject-content">
                                <div class="request-summary">
                                    <h4>반려할 신청 정보</h4>
                                    <div class="summary-item">
                                        <span class="label">신청자:</span>
                                        <span class="value">${request.user_profiles.name}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">구매방식:</span>
                                        <span class="value">${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">출국일:</span>
                                        <span class="value">${this.formatFullDate(request.departure_date)}</span>
                                    </div>
                                </div>

                                <div class="form-group required">
                                    <label for="rejectionReason">반려 사유 *</label>
                                    <textarea id="rejectionReason" 
                                              placeholder="반려 사유를 구체적으로 입력해주세요. 학생이 이 내용을 확인하게 됩니다."
                                              rows="6"
                                              required></textarea>
                                    <small class="help-text">명확하고 건설적인 피드백을 제공해주세요.</small>
                                </div>

                                <div class="common-reasons">
                                    <h5>자주 사용되는 반려 사유 (클릭하여 선택)</h5>
                                    <div class="reason-buttons">
                                        <button type="button" class="reason-btn" 
                                                onclick="window.flightModals.selectReason('출국일이 활동 기간과 맞지 않습니다.')">
                                            출국일 불일치
                                        </button>
                                        <button type="button" class="reason-btn"
                                                onclick="window.flightModals.selectReason('제출된 가격 정보가 부정확합니다.')">
                                            가격 정보 오류
                                        </button>
                                        <button type="button" class="reason-btn"
                                                onclick="window.flightModals.selectReason('필수 정보가 누락되었습니다.')">
                                            정보 누락
                                        </button>
                                        <button type="button" class="reason-btn"
                                                onclick="window.flightModals.selectReason('항공권 이미지가 명확하지 않습니다.')">
                                            이미지 품질
                                        </button>
                                    </div>
                                </div>

                                <div class="warning-box danger">
                                    <i data-lucide="alert-triangle"></i>
                                    <div>
                                        <strong>반려 처리 안내</strong>
                                        <ul>
                                            <li>반려 후에는 학생이 다시 신청할 수 있습니다.</li>
                                            <li>반려 사유가 학생에게 자동으로 전송됩니다.</li>
                                            <li>명확한 사유를 제공하여 재신청을 도와주세요.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('rejectModal')">
                                취소
                            </button>
                            <button class="btn danger" onclick="window.flightModals.confirmRejection('${requestId}')">
                                <i data-lucide="x"></i>
                                반려하기
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, 'rejectModal');

        } catch (error) {
            console.error('❌ 반려 모달 표시 실패:', error);
            this.showError('반려 모달을 표시하는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 🛂 여권정보 모달
     */
    async showPassportModal(userId) {
        try {
            console.log('🛂 여권정보 모달 표시:', userId);

            // 여권 정보 로드
            const passportData = await this.loadPassportData(userId);
            if (!passportData) {
                this.showError('등록된 여권 정보가 없습니다.');
                return;
            }

            const modalHtml = `
                <div class="modal-overlay show" id="passportModal">
                    <div class="modal-container medium">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="bookmark"></i>
                                여권 정보
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('passportModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="passport-content">
                                <div class="passport-grid">
                                    <div class="passport-section">
                                        <h4>기본 정보</h4>
                                        <div class="passport-details">
                                            <div class="detail-row">
                                                <span class="label">영문 성명</span>
                                                <span class="value">${passportData.english_name || '미입력'}</span>
                                            </div>
                                            <div class="detail-row">
                                                <span class="label">여권 번호</span>
                                                <span class="value passport-number">${this.maskPassportNumber(passportData.passport_number)}</span>
                                            </div>
                                            <div class="detail-row">
                                                <span class="label">국적</span>
                                                <span class="value">${passportData.nationality || '대한민국'}</span>
                                            </div>
                                            <div class="detail-row">
                                                <span class="label">생년월일</span>
                                                <span class="value">${this.formatDate(passportData.birth_date)}</span>
                                            </div>
                                            <div class="detail-row">
                                                <span class="label">성별</span>
                                                <span class="value">${passportData.gender === 'M' ? '남성' : '여성'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="passport-section">
                                        <h4>여권 유효기간</h4>
                                        <div class="passport-details">
                                            <div class="detail-row">
                                                <span class="label">발급일</span>
                                                <span class="value">${this.formatDate(passportData.issue_date)}</span>
                                            </div>
                                            <div class="detail-row">
                                                <span class="label">만료일</span>
                                                <span class="value expiry-date">${this.formatDate(passportData.expiry_date)}</span>
                                            </div>
                                            <div class="detail-row">
                                                <span class="label">남은 유효기간</span>
                                                <span class="value validity-status">
                                                    ${this.calculateValidityStatus(passportData.expiry_date)}
                                                </span>
                                            </div>
                                            <div class="detail-row">
                                                <span class="label">발급 기관</span>
                                                <span class="value">${passportData.issuing_authority || '외교부'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                ${this.generatePassportWarnings(passportData)}

                                <div class="passport-image-section">
                                    <h4>여권 이미지</h4>
                                    ${passportData.passport_image_url ? `
                                        <div class="passport-image">
                                            <img src="${passportData.passport_image_url}" 
                                                 alt="여권 이미지"
                                                 onclick="window.flightModals.showImagePreview('${passportData.passport_image_url}')"
                                                 style="cursor: pointer;">
                                        </div>
                                    ` : `
                                        <div class="no-image">
                                            <i data-lucide="image-off"></i>
                                            <p>등록된 여권 이미지가 없습니다.</p>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('passportModal')">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, 'passportModal');

        } catch (error) {
            console.error('❌ 여권정보 모달 표시 실패:', error);
            this.showError('여권 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    // PART 1 여기까지 - 계속해서 PART 2로 이어집니다
    
    /**
     * 📤 항공권 업로드 모달 (관리자용)
     */
    async showUploadTicketModal(requestId) {
        try {
            console.log('📤 항공권 업로드 모달 표시:', requestId);

            const request = await this.loadRequestData(requestId);
            if (!request) {
                this.showError('요청 정보를 찾을 수 없습니다.');
                return;
            }

            const modalHtml = `
                <div class="modal-overlay show" id="uploadTicketModal">
                    <div class="modal-container medium">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="upload"></i>
                                최종 항공권 등록
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('uploadTicketModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="upload-content">
                                <div class="request-summary">
                                    <h4>구매대행 신청 정보</h4>
                                    <div class="summary-item">
                                        <span class="label">신청자:</span>
                                        <span class="value">${request.user_profiles.name}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">출국일:</span>
                                        <span class="value">${this.formatFullDate(request.departure_date)}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">예상 금액:</span>
                                        <span class="value">${this.formatPrice(request.ticket_price, request.currency)}</span>
                                    </div>
                                </div>

                                <div class="upload-section">
                                    <h4>최종 항공권 파일 업로드</h4>
                                    <div class="file-upload-area" id="ticketUploadArea">
                                        <input type="file" id="ticketFileInput" accept="image/*,.pdf" style="display: none;">
                                        <div class="upload-placeholder" onclick="document.getElementById('ticketFileInput').click()">
                                            <i data-lucide="upload-cloud"></i>
                                            <p>클릭하여 항공권 파일을 선택하세요</p>
                                            <small>PNG, JPG, PDF 파일만 업로드 가능 (최대 10MB)</small>
                                        </div>
                                        <div class="upload-preview" id="ticketUploadPreview" style="display: none;"></div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="purchaseNotes">구매 메모 (선택사항)</label>
                                    <textarea id="purchaseNotes" placeholder="항공권 구매와 관련된 특별한 사항을 입력하세요..." rows="3"></textarea>
                                </div>

                                <div class="info-box">
                                    <i data-lucide="info"></i>
                                    <div>
                                        <strong>항공권 등록 안내</strong>
                                        <ul>
                                            <li>구매한 최종 항공권 파일을 업로드해주세요.</li>
                                            <li>업로드 후 자동으로 구매 완료 상태로 변경됩니다.</li>
                                            <li>학생이 최종 항공권을 확인할 수 있습니다.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('uploadTicketModal')">취소</button>
                            <button class="btn primary" id="uploadTicketBtn" onclick="window.flightModals.confirmTicketUpload('${requestId}')" disabled>
                                <i data-lucide="upload"></i>
                                항공권 등록
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, 'uploadTicketModal');
            this.setupFileUpload('ticketFileInput', 'ticketUploadArea', 'uploadTicketBtn');

        } catch (error) {
            console.error('❌ 항공권 업로드 모달 표시 실패:', error);
            this.showError('항공권 업로드 모달을 표시하는 중 오류가 발생했습니다.');
        }
    }
    
    /*
     * 💰 최종금액 입력 모달
     */
    async showFinalAmountModal(requestId) {
        try {
            console.log('💰 최종금액 입력 모달 표시:', requestId);

            const request = await this.loadRequestData(requestId);
            if (!request) {
                this.showError('요청 정보를 찾을 수 없습니다.');
                return;
            }

            const modalHtml = `
                <div class="modal-overlay show" id="finalAmountModal">
                    <div class="modal-container medium">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="dollar-sign"></i>
                                최종 구매 금액 입력
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('finalAmountModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="final-amount-content">
                                <div class="request-summary">
                                    <h4>구매 정보</h4>
                                    <div class="summary-item">
                                        <span class="label">신청자:</span>
                                        <span class="value">${request.user_profiles.name}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">구매방식:</span>
                                        <span class="value">${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">학생 제출 금액:</span>
                                        <span class="value">${this.formatPrice(request.ticket_price, request.currency)}</span>
                                    </div>
                                </div>

                                <div class="form-group required">
                                    <label for="finalAmount">실제 구매 금액 *</label>
                                    <div class="amount-input-group">
                                        <input type="number" 
                                               id="finalAmount" 
                                               placeholder="실제 결제된 금액을 입력하세요"
                                               min="0"
                                               step="1000"
                                               required>
                                        <select id="finalCurrency">
                                            <option value="KRW" ${request.currency === 'KRW' ? 'selected' : ''}>원 (KRW)</option>
                                            <option value="USD" ${request.currency === 'USD' ? 'selected' : ''}>달러 (USD)</option>
                                            <option value="EUR" ${request.currency === 'EUR' ? 'selected' : ''}>유로 (EUR)</option>
                                            <option value="JPY" ${request.currency === 'JPY' ? 'selected' : ''}>엔 (JPY)</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="finalAmountNotes">구매 메모 (선택사항)</label>
                                    <textarea id="finalAmountNotes" 
                                              placeholder="실제 구매와 관련된 메모를 입력하세요..."
                                              rows="3"></textarea>
                                </div>

                                <div class="info-box">
                                    <i data-lucide="info"></i>
                                    <div>
                                        <strong>최종 금액 입력 안내</strong>
                                        <ul>
                                            <li>실제 결제된 정확한 금액을 입력해주세요.</li>
                                            <li>입력 후 구매 완료 상태로 변경됩니다.</li>
                                            <li>이 금액은 최종 정산에 사용됩니다.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('finalAmountModal')">취소</button>
                            <button class="btn primary" onclick="window.flightModals.confirmFinalAmount('${requestId}')">
                                <i data-lucide="check"></i>
                                최종 금액 저장
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, 'finalAmountModal');

        } catch (error) {
            console.error('❌ 최종금액 입력 모달 표시 실패:', error);
            this.showError('최종금액 입력 모달을 표시하는 중 오류가 발생했습니다.');
        }
    }    
    
    /**
     * 🎫 항공권 보기 모달
     */
    async showTicketViewModal(requestId) {
        try {
            console.log('🎫 항공권 보기 모달 표시:', requestId);

            const request = await this.loadRequestData(requestId);
            if (!request) {
                this.showError('요청 정보를 찾을 수 없습니다.');
                return;
            }

            // 항공권 URL 확인
            const ticketUrl = request.admin_ticket_url || request.ticket_url;
            if (!ticketUrl) {
                this.showError('등록된 항공권이 없습니다.');
                return;
            }

            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(ticketUrl);
            const isPDF = /\.pdf$/i.test(ticketUrl);

            const modalHtml = `
                <div class="modal-overlay show" id="ticketViewModal">
                    <div class="modal-container large">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="ticket"></i>
                                항공권 보기
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('ticketViewModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="ticket-view-content">
                                <div class="ticket-info">
                                    <h4>항공권 정보</h4>
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <span class="label">신청자:</span>
                                            <span class="value">${request.user_profiles.name}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">출국일:</span>
                                            <span class="value">${this.formatFullDate(request.departure_date)}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">귀국일:</span>
                                            <span class="value">${this.formatFullDate(request.return_date)}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">구매방식:</span>
                                            <span class="value">${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="ticket-preview">
                                    <h4>항공권 미리보기</h4>
                                    <div class="preview-container">
                                        ${isImage ? `
                                            <img src="${ticketUrl}" 
                                                 alt="항공권 이미지" 
                                                 style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
                                                 onclick="window.open('${ticketUrl}', '_blank')">
                                            <p style="text-align: center; margin-top: 1rem; color: #718096; font-size: 0.875rem;">
                                                이미지를 클릭하면 새 창에서 확대해서 볼 수 있습니다.
                                            </p>
                                        ` : isPDF ? `
                                            <div class="pdf-preview">
                                                <iframe src="${ticketUrl}" 
                                                        width="100%" 
                                                        height="500px" 
                                                        style="border: 1px solid #e2e8f0; border-radius: 8px;">
                                                </iframe>
                                                <p style="text-align: center; margin-top: 1rem;">
                                                    <a href="${ticketUrl}" target="_blank" class="btn primary">
                                                        <i data-lucide="external-link"></i>
                                                        새 창에서 PDF 열기
                                                    </a>
                                                </p>
                                            </div>
                                        ` : `
                                            <div class="file-download">
                                                <i data-lucide="file" style="width: 48px; height: 48px; margin: 0 auto 1rem; color: #a0aec0;"></i>
                                                <p>미리보기가 지원되지 않는 파일 형식입니다.</p>
                                                <a href="${ticketUrl}" target="_blank" class="btn primary">
                                                    <i data-lucide="download"></i>
                                                    파일 다운로드
                                                </a>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('ticketViewModal')">
                                닫기
                            </button>
                            <a href="${ticketUrl}" download class="btn primary">
                                <i data-lucide="download"></i>
                                다운로드
                            </a>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, 'ticketViewModal');

        } catch (error) {
            console.error('❌ 항공권 보기 모달 표시 실패:', error);
            this.showError('항공권 보기 모달을 표시하는 중 오류가 발생했습니다.');
        }
    }    
    
    /**
     * 🧾 영수증 보기 모달
     */
    async showReceiptViewModal(requestId) {
        try {
            console.log('🧾 영수증 보기 모달 표시:', requestId);

            const request = await this.loadRequestData(requestId);
            if (!request) {
                this.showError('요청 정보를 찾을 수 없습니다.');
                return;
            }

            if (!request.receipt_url) {
                this.showError('등록된 영수증이 없습니다.');
                return;
            }

            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(request.receipt_url);
            const isPDF = /\.pdf$/i.test(request.receipt_url);

            const modalHtml = `
                <div class="modal-overlay show" id="receiptViewModal">
                    <div class="modal-container large">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i data-lucide="receipt"></i>
                                구매 영수증 보기
                            </h2>
                            <button class="modal-close" onclick="window.flightModals.closeModal('receiptViewModal')">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="receipt-view-content">
                                <div class="receipt-info">
                                    <h4>구매 정보</h4>
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <span class="label">신청자:</span>
                                            <span class="value">${request.user_profiles.name}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">구매 금액:</span>
                                            <span class="value">${this.formatPrice(request.ticket_price, request.currency)}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">구매일:</span>
                                            <span class="value">${this.formatFullDate(request.created_at)}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">구매방식:</span>
                                            <span class="value">직접구매</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="receipt-preview">
                                    <h4>영수증 미리보기</h4>
                                    <div class="preview-container">
                                        ${isImage ? `
                                            <img src="${request.receipt_url}" 
                                                 alt="영수증 이미지" 
                                                 style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
                                                 onclick="window.open('${request.receipt_url}', '_blank')">
                                            <p style="text-align: center; margin-top: 1rem; color: #718096; font-size: 0.875rem;">
                                                이미지를 클릭하면 새 창에서 확대해서 볼 수 있습니다.
                                            </p>
                                        ` : isPDF ? `
                                            <div class="pdf-preview">
                                                <iframe src="${request.receipt_url}" 
                                                        width="100%" 
                                                        height="500px" 
                                                        style="border: 1px solid #e2e8f0; border-radius: 8px;">
                                                </iframe>
                                                <p style="text-align: center; margin-top: 1rem;">
                                                    <a href="${request.receipt_url}" target="_blank" class="btn primary">
                                                        <i data-lucide="external-link"></i>
                                                        새 창에서 PDF 열기
                                                    </a>
                                                </p>
                                            </div>
                                        ` : `
                                            <div class="file-download">
                                                <i data-lucide="file-text" style="width: 48px; height: 48px; margin: 0 auto 1rem; color: #a0aec0;"></i>
                                                <p>미리보기가 지원되지 않는 파일 형식입니다.</p>
                                                <a href="${request.receipt_url}" target="_blank" class="btn primary">
                                                    <i data-lucide="download"></i>
                                                    파일 다운로드
                                                </a>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary" onclick="window.flightModals.closeModal('receiptViewModal')">
                                닫기
                            </button>
                            <a href="${request.receipt_url}" download class="btn primary">
                                <i data-lucide="download"></i>
                                다운로드
                            </a>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, 'receiptViewModal');

        } catch (error) {
            console.error('❌ 영수증 보기 모달 표시 실패:', error);
            this.showError('영수증 보기 모달을 표시하는 중 오류가 발생했습니다.');
        }
    }
    
    
    /**
     * ✅ 승인 확정 처리
     */
    async confirmApproval(requestId) {
        try {
            this.showProcessing('승인 처리 중...');

            const adminNotes = document.getElementById('adminNotes')?.value || '';
            
            if (!this.system || !this.system.modules.api) {
                throw new Error('API가 초기화되지 않았습니다');
            }

            const result = await this.system.modules.api.updateRequestStatus(requestId, 'approved', null);
            
            // 관리자 메모가 있으면 추가 업데이트
            if (adminNotes.trim()) {
                await this.updateAdminNotes(requestId, adminNotes.trim());
            }

            this.hideProcessing();
            this.closeModal('approveModal');
            this.showSuccess('항공권 신청이 승인되었습니다.');

            // 시스템 이벤트 발생
            if (this.system) {
                this.system.emitEvent('action:requestStatusChanged', {
                    requestId: requestId,
                    newStatus: 'approved',
                    timestamp: new Date()
                });
            }

            // 데이터 새로고침
            this.refreshSystemData();

        } catch (error) {
            this.hideProcessing();
            console.error('❌ 승인 처리 실패:', error);
            this.showError('승인 처리 중 오류가 발생했습니다: ' + error.message);
        }
    }

    /**
     * ❌ 반려 확정 처리
     */
    async confirmRejection(requestId) {
        try {
            const rejectionReason = document.getElementById('rejectionReason')?.value?.trim();
            
            if (!rejectionReason) {
                this.showError('반려 사유를 입력해주세요.');
                return;
            }

            this.showProcessing('반려 처리 중...');

            if (!this.system || !this.system.modules.api) {
                throw new Error('API가 초기화되지 않았습니다');
            }

            const result = await this.system.modules.api.updateRequestStatus(requestId, 'rejected', rejectionReason);

            this.hideProcessing();
            this.closeModal('rejectModal');
            this.showSuccess('항공권 신청이 반려되었습니다.');

            // 시스템 이벤트 발생
            if (this.system) {
                this.system.emitEvent('action:requestStatusChanged', {
                    requestId: requestId,
                    newStatus: 'rejected',
                    rejectionReason: rejectionReason,
                    timestamp: new Date()
                });
            }

            // 데이터 새로고침
            this.refreshSystemData();

        } catch (error) {
            this.hideProcessing();
            console.error('❌ 반려 처리 실패:', error);
            this.showError('반려 처리 중 오류가 발생했습니다: ' + error.message);
        }
    }
    
    /**
     * 💰 최종금액 확정 처리
     */
    async confirmFinalAmount(requestId) {
        try {
            const finalAmount = document.getElementById('finalAmount')?.value;
            const finalCurrency = document.getElementById('finalCurrency')?.value || 'KRW';
            const finalAmountNotes = document.getElementById('finalAmountNotes')?.value || '';
            
            if (!finalAmount || parseFloat(finalAmount) <= 0) {
                this.showError('올바른 금액을 입력해주세요.');
                return;
            }

            this.showProcessing('최종 금액 저장 중...');

            if (!this.system || !this.system.modules.api) {
                throw new Error('API가 초기화되지 않았습니다');
            }

            // 최종금액 정보 업데이트 (API에 메서드 추가 필요)
            const updateData = {
                admin_final_amount: parseFloat(finalAmount),
                admin_final_currency: finalCurrency,
                admin_notes: finalAmountNotes,
                status: 'completed',
                purchase_completed_at: new Date().toISOString()
            };

            // Supabase 직접 호출 (임시)
            const supabase = this.system.modules.api.checkSupabaseInstance();
            const { data, error } = await supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            this.hideProcessing();
            this.closeModal('finalAmountModal');
            this.showSuccess('최종 금액이 저장되었습니다.');

            // 시스템 이벤트 발생
            if (this.system) {
                this.system.emitEvent('action:requestStatusChanged', {
                    requestId: requestId,
                    newStatus: 'completed',
                    timestamp: new Date()
                });
            }

            // 데이터 새로고침
            this.refreshSystemData();

        } catch (error) {
            this.hideProcessing();
            console.error('❌ 최종금액 저장 실패:', error);
            this.showError('최종금액 저장 중 오류가 발생했습니다: ' + error.message);
        }
    }    
    
    /**
     * 📋 요청 데이터 로드
     */
    async loadRequestData(requestId) {
        try {
            if (!this.system || !this.system.modules.api) {
                throw new Error('API가 초기화되지 않았습니다');
            }

            const request = await this.system.modules.api.getFlightRequestDetail(requestId);
            return request;

        } catch (error) {
            console.error('❌ 요청 데이터 로드 실패:', error);
            return null;
        }
    }

    /**
     * 🛂 여권 데이터 로드
     */
    async loadPassportData(userId) {
        try {
            if (!this.system || !this.system.modules.api) {
                throw new Error('API가 초기화되지 않았습니다');
            }

            const passport = await this.system.modules.api.getPassportInfo(userId);
            return passport;

        } catch (error) {
            console.error('❌ 여권 데이터 로드 실패:', error);
            return null;
        }
    }

    /**
     * 🪟 모달 표시 핵심 함수
     */
    showModal(modalHtml, modalId) {
        // 기존 모달 정리
        if (this.modalStates.currentModal) {
            this.closeModal(this.modalStates.currentModal);
        }

        // 새 모달 추가
        this.modalContainer.innerHTML = modalHtml;
        this.modalContainer.style.pointerEvents = 'auto';

        // 상태 업데이트
        this.modalStates.currentModal = modalId;
        this.modalStates.activeModals.add(modalId);

        // 애니메이션
        setTimeout(() => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
            }
        }, 10);

        // 아이콘 새로고침
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        console.log('✅ 모달 표시 완료:', modalId);
    }

    /**
     * ❌ 모달 닫기
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('show');
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            
            // 상태 정리
            this.modalStates.activeModals.delete(modalId);
            if (this.modalStates.currentModal === modalId) {
                this.modalStates.currentModal = null;
            }

            // 모든 모달이 닫혔으면 컨테이너 비활성화
            if (this.modalStates.activeModals.size === 0) {
                this.modalContainer.style.pointerEvents = 'none';
            }
        }, this.modalConfig.animationDuration);

        console.log('✅ 모달 닫기 완료:', modalId);
    }

    /**
     * 🔝 최상단 모달 닫기
     */
    closeTopModal() {
        if (this.modalStates.currentModal) {
            this.closeModal(this.modalStates.currentModal);
        }
    }

    /**
     * 📅 날짜 포맷팅 유틸리티
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
    }

    formatFullDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short'
        });
    }

    /**
     * 💰 가격 포맷팅
     */
    formatPrice(price, currency = 'KRW') {
        if (!price) return '-';
        if (currency === 'KRW') {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(price);
    }

    /**
     * 📊 상태 텍스트
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '대기중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'completed': '완료'
        };
        return statusMap[status] || status;
    }

    /**
     * 🛂 여권번호 마스킹
     */
    maskPassportNumber(passportNumber) {
        if (!passportNumber) return '-';
        if (passportNumber.length < 4) return passportNumber;
        
        const start = passportNumber.substring(0, 2);
        const end = passportNumber.substring(passportNumber.length - 2);
        const middle = '*'.repeat(passportNumber.length - 4);
        
        return start + middle + end;
    }

    /**
     * ⚠️ 알림 함수들
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showProcessing(message) {
        // 로딩 오버레이 표시
        const overlay = document.createElement('div');
        overlay.id = 'processingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideProcessing() {
        const overlay = document.getElementById('processingOverlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }

    showToast(message, type = 'info') {
        // 간단한 토스트 알림
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#3182ce'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            z-index: 10000;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }

    /**
     * 🔄 시스템 데이터 새로고침
     */
    refreshSystemData() {
        if (this.system && this.system.refreshData) {
            this.system.refreshData(false);
        }
    }

    /**
     * 🧹 정리 함수
     */
    destroy() {
        console.log('🧹 FlightManagementModals 정리 중...');

        // 모든 모달 닫기
        this.modalStates.activeModals.forEach(modalId => {
            this.closeModal(modalId);
        });

        // 상태 초기화
        this.modalStates.activeModals.clear();
        this.modalStates.currentModal = null;

        this.isInitialized = false;
        console.log('✅ FlightManagementModals 정리 완료');
    }
    
    /**
     * 📋 첨부 파일 생성 (보기 전용 버전)
     */
    generateFileAttachments(request) {
        const attachments = [];

        // 항공권 이미지 (학생이 업로드한 것)
        if (request.flight_image_url) {
            attachments.push(`
                <div class="file-view-item">
                    <div class="file-icon">
                        <i data-lucide="image"></i>
                    </div>
                    <div class="file-details">
                        <h5>항공권 이미지</h5>
                        <p>학생이 제출한 항공권 정보</p>
                    </div>
                    <div class="file-view-actions">
                        <button class="view-btn" onclick="window.flightModals.showImagePreview('${request.flight_image_url}', '항공권 이미지')" title="미리보기">
                            <i data-lucide="eye"></i>
                            보기
                        </button>
                    </div>
                </div>
            `);
        }

        // 구매 링크
        if (request.purchase_link) {
            attachments.push(`
                <div class="file-view-item">
                    <div class="file-icon link-icon">
                        <i data-lucide="link"></i>
                    </div>
                    <div class="file-details">
                        <h5>구매 링크</h5>
                        <p>학생이 제출한 항공권 구매 링크</p>
                    </div>
                    <div class="file-view-actions">
                        <button class="view-btn" onclick="window.flightModals.openLink('${request.purchase_link}')" title="링크 열기">
                            <i data-lucide="external-link"></i>
                            열기
                        </button>
                    </div>
                </div>
            `);
        }

        // 구매 영수증 (직접구매의 경우)
        if (request.receipt_url) {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(request.receipt_url);
            attachments.push(`
                <div class="file-view-item">
                    <div class="file-icon receipt-icon">
                        <i data-lucide="receipt"></i>
                    </div>
                    <div class="file-details">
                        <h5>구매 영수증</h5>
                        <p>직접구매 결제 영수증</p>
                    </div>
                    <div class="file-view-actions">
                        <button class="view-btn" onclick="window.flightModals.${isImage ? `showImagePreview('${request.receipt_url}', '구매 영수증')` : `openLink('${request.receipt_url}')`}" title="보기">
                            <i data-lucide="eye"></i>
                            보기
                        </button>
                    </div>
                </div>
            `);
        }

        // 관리자 최종 항공권 (구매대행 완료의 경우)
        if (request.admin_ticket_url) {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(request.admin_ticket_url);
            attachments.push(`
                <div class="file-view-item admin-file">
                    <div class="file-icon admin-icon">
                        <i data-lucide="ticket"></i>
                    </div>
                    <div class="file-details">
                        <h5>최종 항공권</h5>
                        <p>관리자가 등록한 구매 완료 항공권</p>
                    </div>
                    <div class="file-view-actions">
                        <button class="view-btn" onclick="window.flightModals.${isImage ? `showImagePreview('${request.admin_ticket_url}', '최종 항공권')` : `openLink('${request.admin_ticket_url}')`}" title="보기">
                            <i data-lucide="eye"></i>
                            보기
                        </button>
                    </div>
                </div>
            `);
        }

        if (attachments.length === 0) {
            return `
                <div class="no-files-message">
                    <i data-lucide="file-x" style="width: 32px; height: 32px; margin: 0 auto 0.5rem; color: #a0aec0;"></i>
                    <p>등록된 파일이 없습니다.</p>
                </div>
            `;
        }

        return `<div class="files-view-list">${attachments.join('')}</div>`;
    }

    /**
     * 📋 상세 모달 액션 버튼 생성
     */
    generateDetailModalActions(request) {
        const actions = [];
        
        if (request.status === 'pending') {
            actions.push(`
                <button class="btn success" onclick="window.flightModals.showApproveModal('${request.id}')">
                    <i data-lucide="check"></i>
                    승인하기
                </button>
            `);
            actions.push(`
                <button class="btn danger" onclick="window.flightModals.showRejectModal('${request.id}')">
                    <i data-lucide="x"></i>
                    반려하기
                </button>
            `);
        }
        
        return actions.join('');
    }

    /**
     * 🛂 여권 경고 메시지 생성
     */
    generatePassportWarnings(passportData) {
        const warnings = [];
        const now = new Date();
        const expiryDate = new Date(passportData.expiry_date);
        const monthsUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24 * 30);
        
        if (monthsUntilExpiry < 6) {
            warnings.push(`
                <div class="warning-box danger">
                    <i data-lucide="alert-triangle"></i>
                    <div>
                        <strong>여권 만료 임박 경고</strong>
                        <p>여권이 6개월 이내에 만료됩니다. 대부분의 국가에서 입국 시 여권 유효기간이 6개월 이상 남아있어야 합니다.</p>
                    </div>
                </div>
            `);
        }
        
        return warnings.join('');
    }

    /**
     * 🗓️ 여권 유효성 상태 계산
     */
    calculateValidityStatus(expiryDate) {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
            return '<span style="color: #e53e3e; font-weight: 600;">만료됨</span>';
        } else if (daysUntilExpiry < 180) {
            return `<span style="color: #ed8936; font-weight: 600;">${daysUntilExpiry}일 남음 (주의)</span>`;
        } else {
            return `<span style="color: #38a169; font-weight: 600;">${daysUntilExpiry}일 남음</span>`;
        }
    }


    /**
     * 📋 디버그 정보
     */
    getDebugInfo() {
        return {
            version: '10.0.0',
            isInitialized: this.isInitialized,
            activeModals: Array.from(this.modalStates.activeModals),
            currentModal: this.modalStates.currentModal,
            systemConnected: !!this.system
        };
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.FlightManagementModals = FlightManagementModals;
    window.flightModals = null; // 인스턴스는 시스템에서 생성
    console.log('✅ FlightManagementModals v10.0.0 전역 등록 완료');
}

console.log('📦 FlightManagementModals v10.0.0 모듈 로드 완료 - 완전한 모달 시스템');
