// flight-management-modals.js - 관리자용 항공권 관리 모달 시스템 v8.1.0
// v8.1.0: Storage 구조 최적화 적용 - flight-tickets 통합 버킷 사용
// v8.2.0: 직접 모듈 최적화 - SupabaseCore 직접 사용

class FlightManagementModals {
    constructor() {
        this.currentRequest = null;
        this.api = null;
        this.initializeModals();
        this.setupAPI();
    }

    // API 인스턴스 설정
    setupAPI() {
        // FlightManagementAPI 인스턴스 획득
        if (window.FlightManagementAPI) {
            this.api = new window.FlightManagementAPI();
        }
    }

    // v8.2.0: Supabase 인스턴스 안전하게 가져오기 (SupabaseCore 우선)
    getSupabase() {
        // SupabaseCore 직접 사용 (최우선)
        if (window.SupabaseCore && window.SupabaseCore.supabase) {
            return window.SupabaseCore.supabase;
        }
        
        // 2순위: SupabaseAdmin을 통한 접근
        if (window.SupabaseAdmin && window.SupabaseAdmin.core?.supabase) {
            return window.SupabaseAdmin.core.supabase;
        }
        
        // 3순위: 레거시 호환성
        if (window.supabase) {
            return window.supabase;
        }
        
        console.warn('⚠️ v8.1.0 Supabase 인스턴스를 찾을 수 없습니다');
        return null;
    }

    initializeModals() {
        // 기존 모달이 있으면 제거
        const existingModals = document.querySelectorAll('.flight-modal-container');
        existingModals.forEach(modal => modal.remove());

        // 모달 컨테이너 생성
        const modalContainer = document.createElement('div');
        modalContainer.className = 'flight-modal-container';
        modalContainer.innerHTML = `
            <!-- 상세보기 모달 -->
            <div id="detailModal" class="modal">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h2>항공권 신청 상세정보</h2>
                        <button class="close-btn" onclick="window.flightModals.closeModal('detailModal')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body" id="detailModalContent">
                        <!-- 동적으로 내용 추가 -->
                    </div>
                </div>
            </div>

            <!-- 승인 확인 모달 -->
            <div id="approveModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>항공권 신청 승인</h2>
                        <button class="close-btn" onclick="window.flightModals.closeModal('approveModal')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="confirm-message">이 항공권 신청을 승인하시겠습니까?</p>
                        <div class="request-summary" id="approveSummary">
                            <!-- 동적으로 요약 정보 추가 -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.flightModals.closeModal('approveModal')">취소</button>
                        <button class="btn btn-primary" onclick="window.flightModals.confirmApprove()">승인</button>
                    </div>
                </div>
            </div>

            <!-- 반려 사유 입력 모달 -->
            <div id="rejectModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>항공권 신청 반려</h2>
                        <button class="close-btn" onclick="window.flightModals.closeModal('rejectModal')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="confirm-message">항공권 신청을 반려합니다.</p>
                        <div class="request-summary" id="rejectSummary">
                            <!-- 동적으로 요약 정보 추가 -->
                        </div>
                        <div class="form-group">
                            <label for="rejectionReason">반려 사유 <span class="required">*</span></label>
                            <textarea 
                                id="rejectionReason" 
                                class="form-control" 
                                rows="4" 
                                placeholder="반려 사유를 상세히 입력해주세요."
                                required
                            ></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.flightModals.closeModal('rejectModal')">취소</button>
                        <button class="btn btn-danger" onclick="window.flightModals.confirmReject()">반려</button>
                    </div>
                </div>
            </div>

            <!-- 🆕 v8.1.0 구매대행 항공권 등록 모달 (flight-tickets 통합 버킷) -->
            <div id="uploadTicketModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>최종 항공권 등록</h2>
                        <button class="close-btn" onclick="window.flightModals.closeModal('uploadTicketModal')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="info-message">구매대행 완료된 최종 항공권을 등록해주세요.</p>
                        <div class="request-summary" id="uploadSummary">
                            <!-- 동적으로 요약 정보 추가 -->
                        </div>
                        <div class="form-group">
                            <label for="adminTicketFile">최종 항공권 파일 <span class="required">*</span></label>
                            <input 
                                type="file" 
                                id="adminTicketFile" 
                                class="form-control" 
                                accept=".pdf,.jpg,.jpeg,.png"
                                required
                            >
                            <small class="form-text">PDF, JPG, PNG 형식 (최대 10MB) • v8.1.0 flight-tickets 통합 버킷에 저장</small>
                        </div>
                        <div id="uploadProgress" class="upload-progress" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <span class="progress-text">v8.1.0 최적화된 Storage에 업로드 중...</span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.flightModals.closeModal('uploadTicketModal')">취소</button>
                        <button class="btn btn-primary" onclick="window.flightModals.uploadFinalTicket()">등록 완료</button>
                    </div>
                </div>
            </div>

            <!-- 여권정보 조회 모달 -->
            <div id="passportModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>여권 정보</h2>
                        <button class="close-btn" onclick="window.flightModals.closeModal('passportModal')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body" id="passportModalContent">
                        <!-- 동적으로 여권 정보 추가 -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalContainer);

        // 모달 외부 클릭 시 닫기
        const modals = modalContainer.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // 모달 열기
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // 모달 닫기
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 상세보기 모달 표시
    async showDetailModal(request) {
        this.currentRequest = request;
        const content = document.getElementById('detailModalContent');
        
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-section">
                    <h3>신청자 정보</h3>
                    <div class="detail-item">
                        <label>이름:</label>
                        <span>${request.user_profiles.name}</span>
                    </div>
                    <div class="detail-item">
                        <label>파견 학당:</label>
                        <span>${request.user_profiles.sejong_institute || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>파견 기간:</label>
                        <span>${request.user_profiles.dispatch_duration || '-'}일</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>항공권 정보</h3>
                    <div class="detail-item">
                        <label>구매 방식:</label>
                        <span class="badge ${request.purchase_type === 'direct' ? 'badge-info' : 'badge-warning'}">
                            ${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>출국일:</label>
                        <span>${new Date(request.departure_date).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div class="detail-item">
                        <label>귀국일:</label>
                        <span>${new Date(request.return_date).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div class="detail-item">
                        <label>출발 공항:</label>
                        <span>${request.departure_airport}</span>
                    </div>
                    <div class="detail-item">
                        <label>도착 공항:</label>
                        <span>${request.arrival_airport}</span>
                    </div>
                    ${request.purchase_link ? `
                        <div class="detail-item">
                            <label>구매처:</label>
                            <a href="${request.purchase_link}" target="_blank" class="link-external">
                                링크 바로가기
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h3>신청 상태</h3>
                    <div class="detail-item">
                        <label>현재 상태:</label>
                        <span class="status-badge status-${request.status}">
                            ${this.getStatusText(request.status)}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>신청일:</label>
                        <span>${new Date(request.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    ${request.status === 'rejected' && request.rejection_reason ? `
                        <div class="detail-item">
                            <label>반려 사유:</label>
                            <div class="rejection-reason">${request.rejection_reason}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section full-width">
                    <h3>첨부 파일</h3>
                    <div class="attachment-grid">
                        ${request.flight_image_url ? `
                            <div class="attachment-item">
                                <label>항공권 정보 이미지:</label>
                                <img src="${request.flight_image_url}" alt="항공권 정보" 
                                     onclick="window.open('${request.flight_image_url}', '_blank')"
                                     style="cursor: pointer; max-width: 300px;">
                            </div>
                        ` : ''}
                        ${request.receipt_url ? `
                            <div class="attachment-item">
                                <label>영수증:</label>
                                <a href="${request.receipt_url}" target="_blank" class="btn btn-sm btn-outline">
                                    영수증 보기
                                </a>
                            </div>
                        ` : ''}
                        ${request.ticket_url ? `
                            <div class="attachment-item">
                                <label>항공권:</label>
                                <a href="${request.ticket_url}" target="_blank" class="btn btn-sm btn-outline">
                                    항공권 보기
                                </a>
                            </div>
                        ` : ''}
                        ${request.admin_ticket_url ? `
                            <div class="attachment-item">
                                <label>최종 등록 항공권:</label>
                                <a href="${request.admin_ticket_url}" target="_blank" class="btn btn-sm btn-outline">
                                    <span class="badge badge-success">v8.1.0</span> 최종 항공권 보기
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        this.openModal('detailModal');
    }

    // 승인 확인 모달 표시
    showApproveModal(request) {
        this.currentRequest = request;
        const summary = document.getElementById('approveSummary');
        
        summary.innerHTML = `
            <div class="summary-item">
                <strong>신청자:</strong> ${request.user_profiles.name} (${request.user_profiles.sejong_institute})
            </div>
            <div class="summary-item">
                <strong>구매 방식:</strong> ${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}
            </div>
            <div class="summary-item">
                <strong>여행 기간:</strong> ${new Date(request.departure_date).toLocaleDateString('ko-KR')} ~ ${new Date(request.return_date).toLocaleDateString('ko-KR')}
            </div>
        `;

        this.openModal('approveModal');
    }

    // 반려 모달 표시
    showRejectModal(request) {
        this.currentRequest = request;
        const summary = document.getElementById('rejectSummary');
        
        summary.innerHTML = `
            <div class="summary-item">
                <strong>신청자:</strong> ${request.user_profiles.name} (${request.user_profiles.sejong_institute})
            </div>
            <div class="summary-item">
                <strong>구매 방식:</strong> ${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}
            </div>
            <div class="summary-item">
                <strong>여행 기간:</strong> ${new Date(request.departure_date).toLocaleDateString('ko-KR')} ~ ${new Date(request.return_date).toLocaleDateString('ko-KR')}
            </div>
        `;

        document.getElementById('rejectionReason').value = '';
        this.openModal('rejectModal');
    }

    // 🆕 v8.1.0 최종 항공권 등록 모달 표시 (flight-tickets 통합 버킷)
    showUploadTicketModal(request) {
        this.currentRequest = request;
        const summary = document.getElementById('uploadSummary');
        
        summary.innerHTML = `
            <div class="summary-item">
                <strong>신청자:</strong> ${request.user_profiles.name} (${request.user_profiles.sejong_institute})
            </div>
            <div class="summary-item">
                <strong>여행 기간:</strong> ${new Date(request.departure_date).toLocaleDateString('ko-KR')} ~ ${new Date(request.return_date).toLocaleDateString('ko-KR')}
            </div>
            <div class="summary-item">
                <strong>출발/도착:</strong> ${request.departure_airport} → ${request.arrival_airport}
            </div>
            <div class="summary-item">
                <strong>Storage:</strong> <span class="badge badge-info">v8.1.0 flight-tickets 통합 버킷</span>
            </div>
        `;

        document.getElementById('adminTicketFile').value = '';
        document.getElementById('uploadProgress').style.display = 'none';
        this.openModal('uploadTicketModal');
    }

    // 여권정보 조회 모달 표시
    async showPassportModal(userId) {
        const content = document.getElementById('passportModalContent');
        content.innerHTML = '<div class="loading">여권 정보를 불러오는 중...</div>';
        this.openModal('passportModal');

        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('v8.1.0 Supabase 인스턴스를 찾을 수 없습니다');
            }

            const { data: passportInfo, error } = await supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error || !passportInfo) {
                content.innerHTML = `
                    <div class="no-data">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>등록된 여권 정보가 없습니다.</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="passport-info">
                    <div class="passport-item">
                        <label>영문 이름:</label>
                        <span>${passportInfo.name_english}</span>
                    </div>
                    <div class="passport-item">
                        <label>여권 번호:</label>
                        <span>${passportInfo.passport_number}</span>
                    </div>
                    <div class="passport-item">
                        <label>발급일:</label>
                        <span>${new Date(passportInfo.issue_date).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div class="passport-item">
                        <label>만료일:</label>
                        <span>${new Date(passportInfo.expiry_date).toLocaleDateString('ko-KR')}</span>
                    </div>
                    ${passportInfo.image_url ? `
                        <div class="passport-item full-width">
                            <label>여권 사본:</label>
                            <img src="${passportInfo.image_url}" alt="여권 사본" 
                                 onclick="window.open('${passportInfo.image_url}', '_blank')"
                                 style="cursor: pointer; max-width: 100%; margin-top: 10px;">
                        </div>
                    ` : ''}
                    <div class="passport-item full-width">
                        <label>등록일:</label>
                        <span>${new Date(passportInfo.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('v8.1.0 Error fetching passport info:', error);
            content.innerHTML = `
                <div class="error-message">
                    여권 정보를 불러오는 중 오류가 발생했습니다.
                </div>
            `;
        }
    }

    // 승인 처리
    async confirmApprove() {
        if (!this.currentRequest) return;

        try {
            if (this.api) {
                await this.api.updateRequestStatus(this.currentRequest.id, 'approved');
            } else {
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('v8.1.0 Supabase 인스턴스를 찾을 수 없습니다');

                const { error } = await supabase
                    .from('flight_requests')
                    .update({
                        status: 'approved',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.currentRequest.id);

                if (error) throw error;
            }

            this.closeModal('approveModal');
            this.showSuccessMessage('항공권 신청이 승인되었습니다.');
            
            // 목록 새로고침
            if (window.flightManagementUI) {
                window.flightManagementUI.loadRequests();
            }
        } catch (error) {
            console.error('v8.1.0 Error approving request:', error);
            alert('승인 처리 중 오류가 발생했습니다.');
        }
    }

    // 반려 처리
    async confirmReject() {
        if (!this.currentRequest) return;

        const rejectionReason = document.getElementById('rejectionReason').value.trim();
        if (!rejectionReason) {
            alert('반려 사유를 입력해주세요.');
            return;
        }

        try {
            if (this.api) {
                await this.api.updateRequestStatus(this.currentRequest.id, 'rejected', rejectionReason);
            } else {
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('v8.1.0 Supabase 인스턴스를 찾을 수 없습니다');

                const { error } = await supabase
                    .from('flight_requests')
                    .update({
                        status: 'rejected',
                        rejection_reason: rejectionReason,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.currentRequest.id);

                if (error) throw error;
            }

            this.closeModal('rejectModal');
            this.showSuccessMessage('항공권 신청이 반려되었습니다.');
            
            // 목록 새로고침
            if (window.flightManagementUI) {
                window.flightManagementUI.loadRequests();
            }
        } catch (error) {
            console.error('v8.1.0 Error rejecting request:', error);
            alert('반려 처리 중 오류가 발생했습니다.');
        }
    }

    // 🆕 v8.1.0 최종 항공권 업로드 (flight-tickets 통합 버킷 사용)
    async uploadFinalTicket() {
        if (!this.currentRequest) return;

        const fileInput = document.getElementById('adminTicketFile');
        const file = fileInput.files[0];

        if (!file) {
            alert('최종 항공권 파일을 선택해주세요.');
            return;
        }

        // 파일 크기 검증 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB 이하여야 합니다.');
            return;
        }

        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = progressDiv.querySelector('.progress-fill');
        progressDiv.style.display = 'block';

        try {
            if (this.api && this.api.completeAgencyPurchase) {
                // 🆕 v8.1.0: 새로운 completeAgencyPurchase 메서드 사용
                console.log('✅ v8.1.0 새로운 API 메서드 사용: completeAgencyPurchase');
                await this.api.completeAgencyPurchase(
                    this.currentRequest.id, 
                    this.currentRequest.user_id, 
                    file
                );
            } else {
                // Fallback: 직접 업로드 (v8.1.0 구조)
                console.log('⚠️ v8.1.0 Fallback 업로드 방식 사용');
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('v8.1.0 Supabase 인스턴스를 찾을 수 없습니다');

                // v8.1.0: flight-tickets 통합 버킷에 업로드
                const fileName = `${this.currentRequest.user_id}_tickets`;
                const { data, error: uploadError } = await supabase.storage
                    .from('flight-tickets')
                    .upload(fileName, file, { 
                        upsert: true,
                        contentType: file.type
                    });

                if (uploadError) throw uploadError;

                // v8.1.0: private 버킷이므로 signed URL 생성
                const { data: { signedUrl }, error: urlError } = await supabase.storage
                    .from('flight-tickets')
                    .createSignedUrl(fileName, 60 * 60 * 24); // 24시간 유효

                if (urlError) throw urlError;

                // DB 업데이트
                const { error: updateError } = await supabase
                    .from('flight_requests')
                    .update({
                        admin_ticket_url: signedUrl,
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.currentRequest.id);

                if (updateError) throw updateError;
            }

            this.closeModal('uploadTicketModal');
            this.showSuccessMessage('v8.1.0 최종 항공권이 성공적으로 등록되었습니다.');
            
            // 목록 새로고침
            if (window.flightManagementUI) {
                window.flightManagementUI.loadRequests();
            }
        } catch (error) {
            console.error('v8.1.0 Error uploading final ticket:', error);
            alert('최종 항공권 등록 중 오류가 발생했습니다.');
        } finally {
            progressDiv.style.display = 'none';
        }
    }

    // 상태 텍스트 반환
    getStatusText(status) {
        const statusMap = {
            'pending': '대기중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'completed': '완료'
        };
        return statusMap[status] || status;
    }

    // 성공 메시지 표시
    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 전역 객체에 등록
if (typeof window !== 'undefined') {
    window.FlightManagementModals = FlightManagementModals;
    window.flightModals = new FlightManagementModals();
    console.log('✅ FlightManagementModals v8.1.0 전역 등록 완료 (Storage 최적화)');
}

console.log('✅ FlightManagementModals v8.1.0 로드 완료 - Storage 구조 최적화 및 flight-tickets 통합 버킷 적용');
