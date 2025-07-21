/**
 * 세종학당 문화인턴 항공권 신청 내역 조회 모듈
 * FlightRequestStatus v1.0.0
 * 
 * @description 사용자의 항공권 신청 상태를 조회하고 관리하는 독립 모듈
 * @author 세종학당재단
 * @version v9.3.0
 * @created 2025-07-21
 */

class FlightRequestStatus {
    constructor() {
        this.requestData = null;
        this.userProfile = null;
        this.isLoading = false;
        this.updateInterval = null;
        
        // DOM 요소들
        this.elements = {
            existingRequest: null,
            statusContainer: null,
            progressTimeline: null,
            actionButtons: null,
            loadingSpinner: null
        };

        // 상태별 설정
        this.statusConfig = {
            pending: {
                color: '#f59e0b',
                icon: 'clock',
                title: '검토 중',
                description: '항공권 신청을 검토하고 있습니다.',
                bgColor: '#fef3c7',
                borderColor: '#f59e0b'
            },
            approved: {
                color: '#059669',
                icon: 'check-circle',
                title: '승인됨',
                description: '항공권 신청이 승인되었습니다.',
                bgColor: '#d1fae5',
                borderColor: '#059669'
            },
            rejected: {
                color: '#dc2626',
                icon: 'x-circle',
                title: '거부됨',
                description: '항공권 신청이 거부되었습니다.',
                bgColor: '#fee2e2',
                borderColor: '#dc2626'
            },
            completed: {
                color: '#059669',
                icon: 'check-circle-2',
                title: '완료됨',
                description: '항공권 신청이 완료되었습니다.',
                bgColor: '#d1fae5',
                borderColor: '#059669'
            },
            cancelled: {
                color: '#6b7280',
                icon: 'x',
                title: '취소됨',
                description: '항공권 신청이 취소되었습니다.',
                bgColor: '#f3f4f6',
                borderColor: '#6b7280'
            }
        };

        // 이벤트 리스너들
        this.boundEvents = {
            handleRefresh: this.handleRefresh.bind(this),
            handleEdit: this.handleEdit.bind(this),
            handleCancel: this.handleCancel.bind(this),
            handleNewRequest: this.handleNewRequest.bind(this)
        };
    }

    /**
     * 모듈 초기화
     */
    async init() {
        try {
            console.log('[FlightRequestStatus] 초기화 시작');
            
            // DOM 요소 초기화
            this.initializeDOMElements();
            
            // 사용자 인증 확인
            if (!window.supabaseCore || !window.supabaseCore.getCurrentUser()) {
                throw new Error('사용자 인증이 필요합니다.');
            }

            // 데이터 로드
            await this.loadRequestStatus();
            
            // 자동 업데이트 설정 (5분마다)
            this.setupAutoUpdate();
            
            console.log('[FlightRequestStatus] 초기화 완료');
            
        } catch (error) {
            console.error('[FlightRequestStatus] 초기화 오류:', error);
            this.showError('시스템 초기화 중 오류가 발생했습니다.');
        }
    }

    /**
     * DOM 요소 초기화
     */
    initializeDOMElements() {
        // 기존 요소 가져오기
        this.elements.existingRequest = document.getElementById('existingRequest');
        
        if (!this.elements.existingRequest) {
            console.warn('[FlightRequestStatus] existingRequest 요소를 찾을 수 없습니다.');
            return;
        }

        // 내부 컨테이너들 생성
        this.elements.existingRequest.innerHTML = `
            <div class="flight-status-wrapper">
                <div class="flight-status-header">
                    <h3 class="status-title">
                        <i data-lucide="plane"></i>
                        항공권 신청 현황
                    </h3>
                    <button class="refresh-btn" id="refreshStatusBtn">
                        <i data-lucide="refresh-cw"></i>
                        새로고침
                    </button>
                </div>
                <div class="status-container" id="statusContainer">
                    <!-- 상태 내용이 여기에 동적으로 생성됩니다 -->
                </div>
                <div class="loading-spinner" id="loadingSpinner" style="display: none;">
                    <i data-lucide="loader-2"></i>
                    <span>데이터를 불러오는 중...</span>
                </div>
                <div class="error-message" id="errorMessage" style="display: none;">
                    <!-- 에러 메시지가 여기에 표시됩니다 -->
                </div>
            </div>
        `;

        // 내부 요소들 참조
        this.elements.statusContainer = document.getElementById('statusContainer');
        this.elements.loadingSpinner = document.getElementById('loadingSpinner');
        this.elements.errorMessage = document.getElementById('errorMessage');

        // 새로고침 버튼 이벤트
        const refreshBtn = document.getElementById('refreshStatusBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.boundEvents.handleRefresh);
        }

        // Lucide 아이콘 초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * 항공권 신청 상태 로드
     */
    async loadRequestStatus() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading(true);

            const currentUser = window.supabaseCore.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다.');
            }

            // 기존 API 재사용 - FlightRequestAPI의 loadExistingFlightRequest 메서드 활용
            if (window.flightRequestAPI && typeof window.flightRequestAPI.loadExistingFlightRequest === 'function') {
                this.requestData = await window.flightRequestAPI.loadExistingFlightRequest();
            } else {
                // 직접 Supabase 호출
                const { data, error } = await window.supabaseCore.supabase
                    .from('flight_requests')
                    .select(`
                        *,
                        user_profiles!inner(
                            name,
                            email,
                            institute_name,
                            actual_arrival_date,
                            actual_work_end_date,
                            actual_work_days,
                            minimum_required_days,
                            maximum_allowed_days
                        )
                    `)
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116은 "no rows returned" 에러
                    throw error;
                }

                this.requestData = data;
            }

            // 사용자 프로필 정보 로드
            await this.loadUserProfile();

            // UI 렌더링
            this.renderStatusUI();

        } catch (error) {
            console.error('[FlightRequestStatus] 데이터 로드 오류:', error);
            this.showError('신청 내역을 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * 사용자 프로필 정보 로드
     */
    async loadUserProfile() {
        try {
            const currentUser = window.supabaseCore.getCurrentUser();
            if (!currentUser) return;

            const { data, error } = await window.supabaseCore.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error) throw error;
            
            this.userProfile = data;
            
        } catch (error) {
            console.error('[FlightRequestStatus] 사용자 프로필 로드 오류:', error);
        }
    }

    /**
     * 상태 UI 렌더링
     */
    renderStatusUI() {
        if (!this.elements.statusContainer) return;

        if (!this.requestData) {
            this.renderNoRequest();
            return;
        }

        // 메인 상태 카드 렌더링
        this.renderStatusCard();
        
        // 진행 상황 타임라인 렌더링
        this.renderProgressTimeline();
        
        // 액션 버튼들 렌더링
        this.renderActionButtons();

        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * 신청 내역이 없을 때 UI
     */
    renderNoRequest() {
        this.elements.statusContainer.innerHTML = `
            <div class="no-request-card">
                <div class="no-request-icon">
                    <i data-lucide="plane-takeoff"></i>
                </div>
                <h4>아직 항공권을 신청하지 않았습니다</h4>
                <p class="no-request-description">
                    활동 기간을 먼저 입력한 후 항공권을 신청해주세요.
                </p>
                <button class="btn-primary new-request-btn" id="newRequestBtn">
                    <i data-lucide="plus"></i>
                    새 항공권 신청
                </button>
            </div>
        `;

        // 새 신청 버튼 이벤트
        const newRequestBtn = document.getElementById('newRequestBtn');
        if (newRequestBtn) {
            newRequestBtn.addEventListener('click', this.boundEvents.handleNewRequest);
        }
    }

    /**
     * 메인 상태 카드 렌더링
     */
    renderStatusCard() {
        if (!this.requestData) return;

        const status = this.requestData.status || 'pending';
        const config = this.statusConfig[status] || this.statusConfig.pending;
        
        // 날짜 포맷팅
        const departureDate = this.formatDate(this.requestData.departure_date);
        const returnDate = this.formatDate(this.requestData.return_date);
        const createdDate = this.formatDateTime(this.requestData.created_at);

        // 가격 포맷팅
        const priceText = this.requestData.ticket_price 
            ? `${Number(this.requestData.ticket_price).toLocaleString()}${this.requestData.currency || 'KRW'}`
            : '미입력';

        const statusCardHTML = `
            <div class="status-card" style="border-left: 4px solid ${config.borderColor}; background-color: ${config.bgColor}">
                <div class="status-header">
                    <div class="status-badge" style="background-color: ${config.color}">
                        <i data-lucide="${config.icon}"></i>
                        <span>${config.title}</span>
                    </div>
                    <div class="status-version">
                        버전 ${this.requestData.version || 1}
                    </div>
                </div>
                
                <div class="status-description">
                    <p>${config.description}</p>
                    ${this.requestData.rejection_reason ? `
                        <div class="rejection-reason">
                            <strong>거부 사유:</strong> ${this.requestData.rejection_reason}
                        </div>
                    ` : ''}
                </div>

                <div class="flight-details">
                    <h4>
                        <i data-lucide="calendar"></i>
                        항공편 정보
                    </h4>
                    
                    <div class="flight-info-grid">
                        <div class="flight-info-item">
                            <label>구매 방식</label>
                            <span class="purchase-type-badge ${this.requestData.purchase_type}">
                                ${this.requestData.purchase_type === 'direct' ? '직접 구매' : '구매 대행'}
                            </span>
                        </div>
                        
                        <div class="flight-info-item">
                            <label>출국일</label>
                            <span>
                                <i data-lucide="plane-takeoff"></i>
                                ${departureDate}
                            </span>
                        </div>
                        
                        <div class="flight-info-item">
                            <label>귀국일</label>
                            <span>
                                <i data-lucide="plane-landing"></i>
                                ${returnDate}
                            </span>
                        </div>
                        
                        <div class="flight-info-item">
                            <label>출발공항</label>
                            <span>${this.requestData.departure_airport || '미입력'}</span>
                        </div>
                        
                        <div class="flight-info-item">
                            <label>도착공항</label>
                            <span>${this.requestData.arrival_airport || '미입력'}</span>
                        </div>
                        
                        <div class="flight-info-item">
                            <label>항공료</label>
                            <span>${priceText}</span>
                        </div>
                    </div>
                </div>

                ${this.renderActivityPeriod()}
                
                <div class="request-meta">
                    <div class="meta-item">
                        <i data-lucide="calendar-plus"></i>
                        <span>신청일: ${createdDate}</span>
                    </div>
                    <div class="meta-item">
                        <i data-lucide="hash"></i>
                        <span>신청번호: ${this.requestData.id.slice(0, 8)}...</span>
                    </div>
                </div>
            </div>
        `;

        this.elements.statusContainer.innerHTML = statusCardHTML;
    }

    /**
     * 활동 기간 정보 렌더링
     */
    renderActivityPeriod() {
        if (!this.userProfile) return '';

        const arrivalDate = this.formatDate(this.userProfile.actual_arrival_date);
        const workEndDate = this.formatDate(this.userProfile.actual_work_end_date);
        const workDays = this.userProfile.actual_work_days || 0;
        const requiredDays = this.userProfile.minimum_required_days || 180;

        return `
            <div class="activity-period">
                <h4>
                    <i data-lucide="map-pin"></i>
                    활동 기간
                </h4>
                
                <div class="activity-info-grid">
                    <div class="activity-info-item">
                        <label>현지 도착일</label>
                        <span>${arrivalDate}</span>
                    </div>
                    
                    <div class="activity-info-item">
                        <label>근무 종료일</label>
                        <span>${workEndDate}</span>
                    </div>
                    
                    <div class="activity-info-item">
                        <label>활동 일수</label>
                        <span class="${workDays >= requiredDays ? 'valid-days' : 'invalid-days'}">
                            ${workDays}일 (최소 ${requiredDays}일 필요)
                        </span>
                    </div>
                    
                    <div class="activity-info-item">
                        <label>파견 학당</label>
                        <span>${this.userProfile.institute_name || '미설정'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 진행 상황 타임라인 렌더링
     */
    renderProgressTimeline() {
        if (!this.requestData) return;

        const status = this.requestData.status || 'pending';
        const createdDate = new Date(this.requestData.created_at);
        const updatedDate = new Date(this.requestData.updated_at);
        
        const steps = [
            {
                key: 'submitted',
                title: '신청 접수',
                description: '항공권 신청이 접수되었습니다',
                date: createdDate,
                completed: true
            },
            {
                key: 'reviewing',
                title: '검토 중',
                description: '관리자가 신청 내용을 검토하고 있습니다',
                date: status !== 'pending' ? updatedDate : null,
                completed: status !== 'pending'
            },
            {
                key: 'decision',
                title: status === 'approved' || status === 'completed' ? '승인' : 
                       status === 'rejected' ? '거부' : '검토 완료',
                description: status === 'approved' || status === 'completed' ? '항공권 신청이 승인되었습니다' :
                            status === 'rejected' ? '항공권 신청이 거부되었습니다' : '검토가 완료됩니다',
                date: status !== 'pending' ? updatedDate : null,
                completed: status === 'approved' || status === 'rejected' || status === 'completed'
            }
        ];

        const timelineHTML = `
            <div class="progress-timeline">
                <h4>
                    <i data-lucide="timeline"></i>
                    진행 상황
                </h4>
                
                <div class="timeline-container">
                    ${steps.map((step, index) => `
                        <div class="timeline-step ${step.completed ? 'completed' : 'pending'}">
                            <div class="timeline-marker">
                                <i data-lucide="${step.completed ? 'check' : 'circle'}"></i>
                            </div>
                            <div class="timeline-content">
                                <h5>${step.title}</h5>
                                <p>${step.description}</p>
                                ${step.date ? `<span class="timeline-date">${this.formatDateTime(step.date)}</span>` : ''}
                            </div>
                            ${index < steps.length - 1 ? '<div class="timeline-connector"></div>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.elements.statusContainer.insertAdjacentHTML('beforeend', timelineHTML);
    }

    /**
     * 액션 버튼들 렌더링
     */
    renderActionButtons() {
        if (!this.requestData) return;

        const status = this.requestData.status || 'pending';
        let actionsHTML = '';

        switch (status) {
            case 'pending':
                actionsHTML = `
                    <div class="action-buttons">
                        <button class="btn-secondary edit-btn" id="editRequestBtn">
                            <i data-lucide="edit"></i>
                            신청 수정
                        </button>
                        <button class="btn-danger cancel-btn" id="cancelRequestBtn">
                            <i data-lucide="x"></i>
                            신청 취소
                        </button>
                    </div>
                `;
                break;

            case 'approved':
            case 'completed':
                actionsHTML = `
                    <div class="action-buttons">
                        <div class="success-message">
                            <i data-lucide="check-circle"></i>
                            <span>항공권 신청이 승인되었습니다!</span>
                        </div>
                        ${this.requestData.admin_ticket_url ? `
                            <a href="${this.requestData.admin_ticket_url}" target="_blank" class="btn-primary download-btn">
                                <i data-lucide="download"></i>
                                승인서 다운로드
                            </a>
                        ` : ''}
                    </div>
                `;
                break;

            case 'rejected':
                actionsHTML = `
                    <div class="action-buttons">
                        <div class="rejection-message">
                            <i data-lucide="x-circle"></i>
                            <span>신청이 거부되었습니다. 아래 버튼으로 새로 신청해주세요.</span>
                        </div>
                        <button class="btn-primary new-request-btn" id="newRequestBtn">
                            <i data-lucide="plus"></i>
                            새 항공권 신청
                        </button>
                    </div>
                `;
                break;

            case 'cancelled':
                actionsHTML = `
                    <div class="action-buttons">
                        <div class="cancelled-message">
                            <i data-lucide="x"></i>
                            <span>신청이 취소되었습니다.</span>
                        </div>
                        <button class="btn-primary new-request-btn" id="newRequestBtn">
                            <i data-lucide="plus"></i>
                            새 항공권 신청
                        </button>
                    </div>
                `;
                break;
        }

        this.elements.statusContainer.insertAdjacentHTML('beforeend', actionsHTML);

        // 이벤트 리스너 등록
        this.attachActionEvents();
    }

    /**
     * 액션 버튼 이벤트 리스너 등록
     */
    attachActionEvents() {
        const editBtn = document.getElementById('editRequestBtn');
        const cancelBtn = document.getElementById('cancelRequestBtn');
        const newRequestBtn = document.getElementById('newRequestBtn');

        if (editBtn) {
            editBtn.addEventListener('click', this.boundEvents.handleEdit);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.boundEvents.handleCancel);
        }

        if (newRequestBtn) {
            newRequestBtn.addEventListener('click', this.boundEvents.handleNewRequest);
        }
    }

    /**
     * 새로고침 이벤트 핸들러
     */
    async handleRefresh(event) {
        event.preventDefault();
        console.log('[FlightRequestStatus] 수동 새로고침 시작');
        
        const refreshBtn = event.target.closest('button');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 1s linear infinite';
            }
        }

        await this.loadRequestStatus();

        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.style.animation = '';
            }
        }
    }

    /**
     * 편집 이벤트 핸들러
     */
    handleEdit(event) {
        event.preventDefault();
        console.log('[FlightRequestStatus] 신청 수정 요청');

        // 코디네이터에게 편집 모드 요청
        if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.enableEditMode === 'function') {
            window.flightRequestCoordinator.enableEditMode();
        } else {
            // 폼으로 스크롤
            const ticketSection = document.getElementById('ticketSection');
            if (ticketSection) {
                ticketSection.scrollIntoView({ behavior: 'smooth' });
                
                // 기존 요청 섹션 숨기기
                if (this.elements.existingRequest) {
                    this.elements.existingRequest.style.display = 'none';
                }
            }
        }
    }

    /**
     * 취소 이벤트 핸들러
     */
    async handleCancel(event) {
        event.preventDefault();
        
        const confirmed = await this.showConfirmDialog(
            '신청 취소',
            '정말로 항공권 신청을 취소하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
            '취소하기',
            'danger'
        );

        if (!confirmed) return;

        try {
            this.showLoading(true);

            // 상태를 cancelled로 업데이트
            const { error } = await window.supabaseCore.supabase
                .from('flight_requests')
                .update({ 
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.requestData.id);

            if (error) throw error;

            // 데이터 새로고침
            await this.loadRequestStatus();

            this.showSuccessMessage('항공권 신청이 취소되었습니다.');

        } catch (error) {
            console.error('[FlightRequestStatus] 취소 오류:', error);
            this.showError('신청 취소 중 오류가 발생했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 새 신청 이벤트 핸들러
     */
    handleNewRequest(event) {
        event.preventDefault();
        console.log('[FlightRequestStatus] 새 신청 요청');

        // 코디네이터에게 새 신청 모드 요청
        if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.enableNewRequestMode === 'function') {
            window.flightRequestCoordinator.enableNewRequestMode();
        } else {
            // 기존 요청 섹션 숨기고 폼 표시
            if (this.elements.existingRequest) {
                this.elements.existingRequest.style.display = 'none';
            }

            const ticketSection = document.getElementById('ticketSection');
            if (ticketSection) {
                ticketSection.style.display = 'block';
                ticketSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    /**
     * 자동 업데이트 설정
     */
    setupAutoUpdate() {
        // 기존 인터벌 정리
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // 5분마다 자동 업데이트 (pending 상태인 경우만)
        this.updateInterval = setInterval(async () => {
            if (this.requestData && this.requestData.status === 'pending') {
                console.log('[FlightRequestStatus] 자동 업데이트 실행');
                await this.loadRequestStatus();
            }
        }, 5 * 60 * 1000); // 5분
    }

    /**
     * 날짜 포맷팅 (YYYY-MM-DD)
     */
    formatDate(dateString) {
        if (!dateString) return '미설정';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return '잘못된 날짜';
        }
    }

    /**
     * 날짜시간 포맷팅 (YYYY-MM-DD HH:MM)
     */
    formatDateTime(dateString) {
        if (!dateString) return '미설정';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '잘못된 날짜';
        }
    }

    /**
     * 로딩 상태 표시/숨김
     */
    showLoading(show) {
        if (!this.elements.loadingSpinner) return;
        
        this.elements.loadingSpinner.style.display = show ? 'flex' : 'none';
        
        if (this.elements.statusContainer) {
            this.elements.statusContainer.style.opacity = show ? '0.5' : '1';
        }
    }

    /**
     * 에러 메시지 표시
     */
    showError(message) {
        if (!this.elements.errorMessage) return;

        this.elements.errorMessage.innerHTML = `
            <div class="error-content">
                <i data-lucide="alert-circle"></i>
                <span>${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.style.display='none'">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;
        
        this.elements.errorMessage.style.display = 'block';
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // 5초 후 자동 숨김
        setTimeout(() => {
            if (this.elements.errorMessage) {
                this.elements.errorMessage.style.display = 'none';
            }
        }, 5000);
    }

    /**
     * 성공 메시지 표시
     */
    showSuccessMessage(message) {
        // 임시 성공 메시지 표시
        const successEl = document.createElement('div');
        successEl.className = 'success-toast';
        successEl.innerHTML = `
            <i data-lucide="check-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(successEl);
        
        // Lucide 아이콘 초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // 3초 후 제거
        setTimeout(() => {
            if (successEl.parentNode) {
                successEl.parentNode.removeChild(successEl);
            }
        }, 3000);
    }

    /**
     * 확인 대화상자 표시
     */
    async showConfirmDialog(title, message, confirmText = '확인', type = 'primary') {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog-overlay';
            dialog.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-header">
                        <h4>${title}</h4>
                    </div>
                    <div class="confirm-body">
                        <p>${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <div class="confirm-actions">
                        <button class="btn-secondary cancel-confirm">취소</button>
                        <button class="btn-${type} confirm-confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // 이벤트 리스너
            const cancelBtn = dialog.querySelector('.cancel-confirm');
            const confirmBtn = dialog.querySelector('.confirm-confirm');

            const cleanup = () => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // ESC 키로 취소
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

    /**
     * 상태 업데이트 이벤트 발생
     */
    emitStatusUpdate(status, data = null) {
        const event = new CustomEvent('flightRequestStatusUpdate', {
            detail: {
                status: status,
                requestData: this.requestData,
                userData: data
            }
        });
        
        window.dispatchEvent(event);
    }

    /**
     * 외부에서 상태 업데이트 호출용
     */
    async refresh() {
        await this.loadRequestStatus();
    }

    /**
     * 정리 메서드
     */
    destroy() {
        // 인터벌 정리
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // 이벤트 리스너 제거
        const refreshBtn = document.getElementById('refreshStatusBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.boundEvents.handleRefresh);
        }

        // 데이터 초기화
        this.requestData = null;
        this.userProfile = null;
        this.isLoading = false;

        console.log('[FlightRequestStatus] 모듈이 정리되었습니다.');
    }
}

// CSS 스타일 추가
const flightStatusStyles = `
<style>
/* 항공권 신청 상태 모듈 스타일 */
.flight-status-wrapper {
    margin: 20px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.flight-status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e5e7eb;
}

.status-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
}

.refresh-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
}

.refresh-btn:hover {
    background: #e5e7eb;
    transform: translateY(-1px);
}

.status-container {
    transition: opacity 0.3s ease;
}

.loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 10px;
    color: #6b7280;
}

.loading-spinner i {
    animation: spin 1s linear infinite;
    font-size: 24px;
}

.error-message {
    margin: 20px 0;
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
}

.error-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.error-close {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
}

.error-close:hover {
    background: #fee2e2;
}

/* 신청 없음 카드 */
.no-request-card {
    text-align: center;
    padding: 60px 40px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    margin: 20px 0;
}

.no-request-icon {
    margin-bottom: 20px;
}

.no-request-icon i {
    font-size: 48px;
    color: #64748b;
}

.no-request-card h4 {
    margin: 0 0 12px 0;
    font-size: 1.25rem;
    color: #334155;
}

.no-request-description {
    margin: 0 0 30px 0;
    color: #64748b;
    line-height: 1.6;
}

/* 상태 카드 */
.status-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin: 20px 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.status-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
}

.status-version {
    padding: 4px 12px;
    background: #f3f4f6;
    border-radius: 12px;
    font-size: 0.75rem;
    color: #6b7280;
}

.status-description {
    margin-bottom: 24px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    border-left: 4px solid currentColor;
}

.rejection-reason {
    margin-top: 12px;
    padding: 12px;
    background: #fef2f2;
    border-radius: 6px;
    border: 1px solid #fecaca;
    color: #dc2626;
    font-size: 0.875rem;
}

.flight-details h4,
.activity-period h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px 0;
    font-size: 1rem;
    color: #374151;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
}

.flight-info-grid,
.activity-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.flight-info-item,
.activity-info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.flight-info-item label,
.activity-info-item label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.flight-info-item span,
.activity-info-item span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #1f2937;
    font-weight: 500;
}

.purchase-type-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    width: fit-content;
}

.purchase-type-badge.direct {
    background: #dbeafe;
    color: #1d4ed8;
}

.purchase-type-badge.agency {
    background: #f3e8ff;
    color: #7c3aed;
}

.valid-days {
    color: #059669;
    font-weight: 600;
}

.invalid-days {
    color: #dc2626;
    font-weight: 600;
}

.request-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #6b7280;
    font-size: 0.875rem;
}

/* 진행 상황 타임라인 */
.progress-timeline {
    margin: 24px 0;
}

.timeline-container {
    position: relative;
    padding-left: 20px;
}

.timeline-step {
    position: relative;
    margin-bottom: 24px;
}

.timeline-marker {
    position: absolute;
    left: -26px;
    top: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    z-index: 2;
}

.timeline-step.completed .timeline-marker {
    background: #059669;
    color: white;
}

.timeline-step.pending .timeline-marker {
    background: #f3f4f6;
    color: #6b7280;
    border: 2px solid #d1d5db;
}

.timeline-content h5 {
    margin: 0 0 4px 0;
    font-size: 1rem;
    color: #1f2937;
}

.timeline-content p {
    margin: 0 0 8px 0;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.5;
}

.timeline-date {
    font-size: 0.75rem;
    color: #9ca3af;
}

.timeline-connector {
    position: absolute;
    left: -10px;
    top: 32px;
    width: 2px;
    height: 24px;
    background: #e5e7eb;
}

.timeline-step.completed .timeline-connector {
    background: #059669;
}

/* 액션 버튼들 */
.action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: flex-start;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 2px solid #f3f4f6;
}

.action-buttons button,
.action-buttons a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
    border: 1px solid transparent;
}

.btn-primary {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
}

.btn-primary:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
}

.btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
}

.btn-secondary:hover {
    background: #e5e7eb;
    transform: translateY(-1px);
}

.btn-danger {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
}

.btn-danger:hover {
    background: #b91c1c;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
}

.success-message,
.rejection-message,
.cancelled-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 8px;
    font-weight: 500;
    flex: 1;
}

.success-message {
    background: #d1fae5;
    color: #059669;
    border: 1px solid #a7f3d0;
}

.rejection-message,
.cancelled-message {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

/* 성공 토스트 */
.success-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #059669;
    color: white;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
}

/* 확인 대화상자 */
.confirm-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
}

.confirm-dialog {
    background: white;
    border-radius: 12px;
    padding: 0;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    animation: scaleIn 0.3s ease-out;
}

.confirm-header {
    padding: 20px 24px 0 24px;
}

.confirm-header h4 {
    margin: 0;
    font-size: 1.125rem;
    color: #1f2937;
}

.confirm-body {
    padding: 16px 24px;
}

.confirm-body p {
    margin: 0;
    color: #6b7280;
    line-height: 1.6;
}

.confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 0 24px 24px 24px;
}

.confirm-actions button {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

/* 애니메이션 */
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes scaleIn {
    from {
        transform: scale(0.95);
        opacity: 0;
    }
    to {
        transform: scale(1);
        opacity: 1;
    }
}

/* 반응형 디자인 */
@media (max-width: 768px) {
    .flight-status-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
    }
    
    .flight-info-grid,
    .activity-info-grid {
        grid-template-columns: 1fr;
    }
    
    .action-buttons {
        flex-direction: column;
        align-items: stretch;
    }
    
    .action-buttons button,
    .action-buttons a {
        justify-content: center;
    }
    
    .success-toast {
        right: 10px;
        left: 10px;
        top: 10px;
    }
    
    .confirm-dialog {
        margin: 20px;
    }
}

@media (max-width: 480px) {
    .status-card {
        padding: 16px;
        margin: 10px 0;
    }
    
    .no-request-card {
        padding: 40px 20px;
    }
    
    .flight-status-wrapper {
        margin: 10px 0;
    }
}
</style>
`;

// 스타일 주입
if (!document.querySelector('#flight-status-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'flight-status-styles';
    styleElement.innerHTML = flightStatusStyles;
    document.head.appendChild(styleElement);
}

// 전역 스코프에 등록
window.FlightRequestStatus = FlightRequestStatus;

// 모듈 export (ES6 모듈 환경에서 사용 시)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlightRequestStatus;
}

console.log('[FlightRequestStatus] 모듈이 로드되었습니다. v1.0.0');
