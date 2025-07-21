// flight-request-status.js - 항공권 신청 내역 조회 및 관리 모듈 v1.0.0
// 🎯 목적: 사용자의 항공권 신청 상태를 조회하고 관리하는 독립 모듈
// 📋 기능: 신청 내역 표시, 상태별 UI, 액션 버튼, 실시간 업데이트
// 🔗 연동: flight-request-coordinator.js, flight-request-api.js
// 🗄️ DB: flight_requests, user_profiles 테이블 연동

class FlightRequestStatus {
    constructor() {
        console.log('🚀 FlightRequestStatus v1.0.0 생성자 초기화 시작...');
        
        // 의존성 참조
        this.api = null;
        this.utils = null;
        this.coordinator = null;
        
        // DOM 요소 참조
        this.elements = this.initElements();
        
        // 데이터 상태
        this.currentRequest = null;
        this.userProfile = null;
        this.isLoading = false;
        this.lastUpdated = null;
        
        // 상태 관리
        this.statusStates = {
            pending: {
                label: '검토 중',
                color: '#f59e0b',
                bgColor: '#fffbeb',
                borderColor: '#fed7aa',
                icon: 'clock',
                description: '관리자가 신청 내역을 검토하고 있습니다.'
            },
            approved: {
                label: '승인됨',
                color: '#059669',
                bgColor: '#f0fdf4',
                borderColor: '#bbf7d0',
                icon: 'check-circle',
                description: '항공권 신청이 승인되었습니다.'
            },
            rejected: {
                label: '거부됨',
                color: '#dc2626',
                bgColor: '#fef2f2',
                borderColor: '#fecaca',
                icon: 'x-circle',
                description: '항공권 신청이 거부되었습니다.'
            },
            cancelled: {
                label: '취소됨',
                color: '#6b7280',
                bgColor: '#f9fafb',
                borderColor: '#d1d5db',
                icon: 'slash',
                description: '항공권 신청이 취소되었습니다.'
            },
            completed: {
                label: '완료됨',
                color: '#7c3aed',
                bgColor: '#faf5ff',
                borderColor: '#ddd6fe',
                icon: 'check-circle-2',
                description: '항공권 구매가 완료되었습니다.'
            }
        };
        
        // 이벤트 리스너
        this.eventListeners = new Map();
        
        // 초기화 상태
        this.isInitialized = false;
        this.initializationPromise = null;
        
        console.log('✅ FlightRequestStatus v1.0.0 생성자 완료');
    }

    // DOM 요소 초기화
    initElements() {
        console.log('🔄 [요소초기화] DOM 요소 초기화 시작...');
        
        const elements = {
            // 메인 컨테이너
            statusContainer: document.getElementById('flightStatusContainer') ||
                           document.getElementById('existingRequest') ||
                           this.createStatusContainer(),
            
            // 로딩 상태
            loadingIndicator: document.getElementById('statusLoadingIndicator'),
            
            // 에러 메시지
            errorMessage: document.getElementById('statusErrorMessage'),
            
            // 성공 메시지  
            successMessage: document.getElementById('statusSuccessMessage'),
            
            // 새 신청 버튼 (기존 폼에서 참조)
            newRequestBtn: document.getElementById('submitBtn'),
            
            // 신청 폼 (기존 폼 참조)
            requestForm: document.getElementById('requestForm') ||
                        document.getElementById('flightRequestForm')
        };
        
        console.log('✅ [요소초기화] DOM 요소 초기화 완료:', {
            statusContainer: !!elements.statusContainer,
            loadingIndicator: !!elements.loadingIndicator,
            errorMessage: !!elements.errorMessage,
            successMessage: !!elements.successMessage,
            newRequestBtn: !!elements.newRequestBtn,
            requestForm: !!elements.requestForm
        });
        
        return elements;
    }

    // 상태 컨테이너 생성 (존재하지 않는 경우)
    createStatusContainer() {
        console.log('🔧 [컨테이너생성] 상태 컨테이너 생성 중...');
        
        try {
            const container = document.createElement('div');
            container.id = 'flightStatusContainer';
            container.className = 'flight-status-container';
            container.style.cssText = `
                margin-bottom: 24px;
                display: none;
            `;
            
            // 메인 콘텐츠 상단에 삽입
            const mainContent = document.getElementById('mainContent') ||
                              document.getElementById('requestForm') ||
                              document.querySelector('.form-container') ||
                              document.body;
            
            if (mainContent) {
                if (mainContent.firstChild) {
                    mainContent.insertBefore(container, mainContent.firstChild);
                } else {
                    mainContent.appendChild(container);
                }
                
                console.log('✅ [컨테이너생성] 상태 컨테이너 생성 및 삽입 완료');
                return container;
            } else {
                console.error('❌ [컨테이너생성] 상위 컨테이너를 찾을 수 없음');
                return null;
            }
            
        } catch (error) {
            console.error('❌ [컨테이너생성] 생성 실패:', error);
            return null;
        }
    }

    // 모듈 초기화
    async init() {
        try {
            console.log('🔄 [초기화] FlightRequestStatus 초기화 시작...');
            
            // 의존성 대기
            await this.waitForDependencies();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 데이터 로드
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('✅ [초기화] FlightRequestStatus 초기화 완료');
            
            return true;
            
        } catch (error) {
            console.error('❌ [초기화] FlightRequestStatus 초기화 실패:', error);
            this.showError('모듈 초기화 중 오류가 발생했습니다.', error);
            throw error;
        }
    }

    // 초기화 보장
    async ensureInitialized() {
        try {
            console.log('🔄 [초기화보장] ensureInitialized 시작...');
            
            if (this.isInitialized) {
                console.log('✅ [초기화보장] 이미 초기화됨');
                return true;
            }
            
            if (this.initializationPromise) {
                console.log('⏳ [초기화보장] 초기화 대기 중...');
                await this.initializationPromise;
                return this.isInitialized;
            }
            
            console.log('🚀 [초기화보장] 새로운 초기화 시작...');
            this.initializationPromise = this.init();
            await this.initializationPromise;
            
            return this.isInitialized;
            
        } catch (error) {
            console.error('❌ [초기화보장] 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 의존성 대기
    async waitForDependencies(timeout = 15000) {
        console.log('🔄 [의존성] 의존성 모듈 대기 시작...');
        
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const checkDependencies = () => {
                const apiReady = !!(window.flightRequestAPI?.isInitialized);
                const utilsReady = !!(window.FlightRequestUtils || window.flightRequestUtils);
                const coordinatorReady = !!(window.flightRequestCoordinator);
                
                console.log('🔍 [의존성] 상태 확인:', {
                    api: apiReady,
                    utils: utilsReady,
                    coordinator: coordinatorReady,
                    elapsed: Date.now() - startTime
                });
                
                if (apiReady && utilsReady) {
                    this.api = window.flightRequestAPI;
                    this.utils = window.FlightRequestUtils || window.flightRequestUtils;
                    this.coordinator = window.flightRequestCoordinator;
                    
                    console.log('✅ [의존성] 모든 의존성 로드 완료');
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    const error = new Error(`의존성 로딩 시간 초과 (${timeout}ms)`);
                    console.error('❌ [의존성] 시간 초과:', error);
                    reject(error);
                    return;
                }
                
                setTimeout(checkDependencies, 100);
            };
            
            checkDependencies();
        });
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        console.log('🔄 [이벤트] 이벤트 리스너 설정 시작...');
        
        try {
            // 새로고침 버튼 이벤트 (동적 생성되므로 이벤트 위임 사용)
            document.addEventListener('click', (event) => {
                if (event.target.matches('.refresh-status-btn, [data-action="refresh-status"]')) {
                    event.preventDefault();
                    this.handleRefreshStatus();
                }
                
                if (event.target.matches('.cancel-request-btn, [data-action="cancel-request"]')) {
                    event.preventDefault();
                    this.handleCancelRequest();
                }
                
                if (event.target.matches('.edit-request-btn, [data-action="edit-request"]')) {
                    event.preventDefault();
                    this.handleEditRequest();
                }
                
                if (event.target.matches('.new-request-btn, [data-action="new-request"]')) {
                    event.preventDefault();
                    this.handleNewRequest();
                }
                
                if (event.target.matches('.view-details-btn, [data-action="view-details"]')) {
                    event.preventDefault();
                    this.handleViewDetails();
                }
            });
            
            // API 이벤트 리스너 (상태 변경 감지)
            if (this.api && typeof this.api.on === 'function') {
                this.api.on('flightRequestUpdated', (data) => {
                    console.log('📡 [이벤트] API 업데이트 이벤트 수신:', data);
                    this.handleAPIUpdate(data);
                });
            }
            
            // 전역 이벤트 리스너
            window.addEventListener('flightRequestStatusChanged', (event) => {
                console.log('📡 [이벤트] 전역 상태 변경 이벤트 수신:', event.detail);
                this.handleStatusChange(event.detail);
            });
            
            console.log('✅ [이벤트] 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [이벤트] 설정 실패:', error);
        }
    }

    // 초기 데이터 로드
    async loadInitialData() {
        console.log('🔄 [초기데이터] 초기 데이터 로드 시작...');
        
        try {
            this.showLoading(true);
            
            // 사용자 프로필 로드
            await this.loadUserProfile();
            
            // 현재 신청 내역 로드
            await this.loadCurrentRequest();
            
            // UI 렌더링
            this.renderStatus();
            
            this.lastUpdated = new Date();
            console.log('✅ [초기데이터] 초기 데이터 로드 완료');
            
        } catch (error) {
            console.error('❌ [초기데이터] 로드 실패:', error);
            this.showError('초기 데이터를 불러올 수 없습니다.', error);
        } finally {
            this.showLoading(false);
        }
    }

    // 사용자 프로필 로드
    async loadUserProfile() {
        try {
            console.log('🔄 [프로필로드] 사용자 프로필 로드 시작...');
            
            if (!this.api || typeof this.api.loadUserProfile !== 'function') {
                throw new Error('API loadUserProfile 메서드를 찾을 수 없습니다');
            }
            
            this.userProfile = await this.api.loadUserProfile();
            
            if (this.userProfile) {
                console.log('✅ [프로필로드] 사용자 프로필 로드 완료:', {
                    name: this.userProfile.name,
                    hasActivityPeriod: !!(this.userProfile.actual_arrival_date && this.userProfile.actual_work_end_date)
                });
            } else {
                console.warn('⚠️ [프로필로드] 사용자 프로필이 없습니다');
            }
            
        } catch (error) {
            console.error('❌ [프로필로드] 실패:', error);
            throw error;
        }
    }

    // 현재 신청 내역 로드
    async loadCurrentRequest() {
        try {
            console.log('🔄 [신청로드] 현재 신청 내역 로드 시작...');
            
            if (!this.api || typeof this.api.loadExistingFlightRequest !== 'function') {
                throw new Error('API loadExistingFlightRequest 메서드를 찾을 수 없습니다');
            }
            
            this.currentRequest = await this.api.loadExistingFlightRequest();
            
            if (this.currentRequest) {
                console.log('✅ [신청로드] 신청 내역 로드 완료:', {
                    id: this.currentRequest.id,
                    status: this.currentRequest.status,
                    createdAt: this.currentRequest.created_at,
                    departureDate: this.currentRequest.departure_date,
                    returnDate: this.currentRequest.return_date
                });
            } else {
                console.log('ℹ️ [신청로드] 신청 내역이 없습니다');
            }
            
        } catch (error) {
            console.error('❌ [신청로드] 실패:', error);
            throw error;
        }
    }

    // 상태 렌더링 (메인 메서드)
    renderStatus() {
        try {
            console.log('🔄 [렌더링] 상태 렌더링 시작...');
            
            if (!this.elements.statusContainer) {
                console.error('❌ [렌더링] 상태 컨테이너가 없습니다');
                return;
            }
            
            // 신청 내역이 없는 경우
            if (!this.currentRequest) {
                this.renderNoRequest();
                return;
            }
            
            // 신청 내역이 있는 경우
            this.renderExistingRequest();
            
            // 컨테이너 표시
            this.elements.statusContainer.style.display = 'block';
            
            // 아이콘 초기화
            this.initializeIcons();
            
            console.log('✅ [렌더링] 상태 렌더링 완료');
            
        } catch (error) {
            console.error('❌ [렌더링] 실패:', error);
            this.showError('상태를 표시할 수 없습니다.', error);
        }
    }

    // 신청 내역이 없는 경우 렌더링
    renderNoRequest() {
        console.log('🔄 [렌더링] 신청 내역 없음 상태 렌더링...');
        
        this.elements.statusContainer.innerHTML = `
            <div class="no-request-status">
                <div class="no-request-header">
                    <i data-lucide="info" class="no-request-icon"></i>
                    <h3>항공권 신청 내역이 없습니다</h3>
                </div>
                <div class="no-request-content">
                    <p>아직 항공권 신청을 하지 않았습니다.</p>
                    <p>하단의 폼을 작성하여 항공권 신청을 시작해주세요.</p>
                </div>
                <div class="no-request-actions">
                    <button type="button" class="btn btn-primary scroll-to-form-btn" data-action="scroll-to-form">
                        <i data-lucide="arrow-down"></i>
                        신청 폼으로 이동
                    </button>
                </div>
            </div>
        `;
        
        // 신청 폼으로 스크롤 이벤트
        this.elements.statusContainer.addEventListener('click', (event) => {
            if (event.target.matches('.scroll-to-form-btn, [data-action="scroll-to-form"]')) {
                event.preventDefault();
                this.scrollToForm();
            }
        });
        
        // 기존 신청 폼 표시
        if (this.elements.requestForm) {
            this.elements.requestForm.style.display = 'block';
        }
        
        this.elements.statusContainer.style.display = 'block';
        
        console.log('✅ [렌더링] 신청 내역 없음 상태 렌더링 완료');
    }

    // 기존 신청 내역 렌더링
    renderExistingRequest() {
        console.log('🔄 [렌더링] 기존 신청 내역 렌더링 시작...');
        
        try {
            const request = this.currentRequest;
            const statusInfo = this.statusStates[request.status] || this.statusStates.pending;
            
            // 진행 단계 계산
            const progressSteps = this.calculateProgressSteps(request.status);
            
            // 액션 버튼 생성
            const actionButtons = this.generateActionButtons(request.status);
            
            // 활동 기간 정보
            const activityPeriodInfo = this.renderActivityPeriodInfo();
            
            // 가격 정보
            const priceInfo = this.renderPriceInfo(request);
            
            this.elements.statusContainer.innerHTML = `
                <div class="flight-request-status-card">
                    <!-- 상태 헤더 -->
                    <div class="status-header" style="
                        color: ${statusInfo.color};
                        background-color: ${statusInfo.bgColor};
                        border: 1px solid ${statusInfo.borderColor};
                    ">
                        <div class="status-header-content">
                            <div class="status-icon-wrapper">
                                <i data-lucide="${statusInfo.icon}" class="status-icon"></i>
                            </div>
                            <div class="status-info">
                                <h3 class="status-title">항공권 신청 ${statusInfo.label}</h3>
                                <p class="status-description">${statusInfo.description}</p>
                                <div class="status-meta">
                                    <span class="status-id">신청 ID: ${request.id.substring(0, 8)}</span>
                                    <span class="status-date">신청일: ${this.formatDate(request.created_at)}</span>
                                    ${request.updated_at !== request.created_at ? 
                                        `<span class="status-updated">수정일: ${this.formatDate(request.updated_at)}</span>` : 
                                        ''
                                    }
                                </div>
                            </div>
                            <div class="status-actions-header">
                                <button type="button" class="btn btn-sm btn-outline refresh-status-btn" data-action="refresh-status">
                                    <i data-lucide="refresh-cw"></i>
                                    새로고침
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 진행 상황 타임라인 -->
                    <div class="progress-timeline">
                        <h4 class="timeline-title">
                            <i data-lucide="clock"></i>
                            진행 상황
                        </h4>
                        <div class="timeline-steps">
                            ${progressSteps.map(step => `
                                <div class="timeline-step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}">
                                    <div class="timeline-step-icon">
                                        <i data-lucide="${step.icon}"></i>
                                    </div>
                                    <div class="timeline-step-content">
                                        <div class="timeline-step-title">${step.title}</div>
                                        <div class="timeline-step-description">${step.description}</div>
                                        ${step.date ? `<div class="timeline-step-date">${this.formatDate(step.date)}</div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- 신청 정보 상세 -->
                    <div class="request-details">
                        <h4 class="details-title">
                            <i data-lucide="plane"></i>
                            항공편 정보
                        </h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <label class="detail-label">출국일</label>
                                <div class="detail-value">
                                    <i data-lucide="calendar"></i>
                                    ${this.formatDate(request.departure_date)}
                                </div>
                            </div>
                            <div class="detail-item">
                                <label class="detail-label">귀국일</label>
                                <div class="detail-value">
                                    <i data-lucide="calendar"></i>
                                    ${this.formatDate(request.return_date)}
                                </div>
                            </div>
                            <div class="detail-item">
                                <label class="detail-label">출발 공항</label>
                                <div class="detail-value">
                                    <i data-lucide="map-pin"></i>
                                    ${request.departure_airport || 'N/A'}
                                </div>
                            </div>
                            <div class="detail-item">
                                <label class="detail-label">도착 공항</label>
                                <div class="detail-value">
                                    <i data-lucide="map-pin"></i>
                                    ${request.arrival_airport || 'N/A'}
                                </div>
                            </div>
                            <div class="detail-item">
                                <label class="detail-label">구매 방식</label>
                                <div class="detail-value">
                                    <i data-lucide="${request.purchase_type === 'direct' ? 'credit-card' : 'users'}"></i>
                                    ${request.purchase_type === 'direct' ? '직접 구매' : '구매 대행'}
                                </div>
                            </div>
                            <div class="detail-item">
                                <label class="detail-label">체류 기간</label>
                                <div class="detail-value">
                                    <i data-lucide="clock"></i>
                                    ${this.calculateStayDuration(request.departure_date, request.return_date)}일
                                </div>
                            </div>
                        </div>
                        
                        ${priceInfo}
                        ${activityPeriodInfo}
                        
                        ${request.purchase_link ? `
                            <div class="detail-item full-width">
                                <label class="detail-label">구매 링크</label>
                                <div class="detail-value">
                                    <a href="${request.purchase_link}" target="_blank" class="purchase-link">
                                        <i data-lucide="external-link"></i>
                                        구매 사이트 열기
                                    </a>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${request.rejection_reason ? `
                            <div class="detail-item full-width rejection-reason">
                                <label class="detail-label">거부 사유</label>
                                <div class="detail-value rejection-text">
                                    <i data-lucide="alert-circle"></i>
                                    ${request.rejection_reason}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- 첨부 파일 정보 -->
                    ${this.renderAttachments(request)}

                    <!-- 액션 버튼 -->
                    <div class="status-actions">
                        ${actionButtons}
                    </div>
                </div>
            `;
            
            // 기존 신청 폼 숨기기
            if (this.elements.requestForm) {
                this.elements.requestForm.style.display = 'none';
            }
            
            console.log('✅ [렌더링] 기존 신청 내역 렌더링 완료');
            
        } catch (error) {
            console.error('❌ [렌더링] 기존 신청 내역 렌더링 실패:', error);
            this.showError('신청 내역을 표시할 수 없습니다.', error);
        }
    }

    // 진행 단계 계산
    calculateProgressSteps(status) {
        const steps = [
            {
                id: 'submitted',
                title: '신청 제출',
                description: '항공권 신청서가 제출되었습니다',
                icon: 'file-plus',
                completed: true,
                current: false,
                date: this.currentRequest.created_at
            },
            {
                id: 'review',
                title: '검토 중',
                description: '관리자가 신청 내역을 검토하고 있습니다',
                icon: 'search',
                completed: ['approved', 'rejected', 'completed'].includes(status),
                current: status === 'pending',
                date: status !== 'pending' ? this.currentRequest.updated_at : null
            },
            {
                id: 'decision',
                title: '결정',
                description: this.getDecisionDescription(status),
                icon: this.getDecisionIcon(status),
                completed: ['approved', 'rejected', 'completed'].includes(status),
                current: ['approved', 'rejected'].includes(status),
                date: ['approved', 'rejected', 'completed'].includes(status) ? this.currentRequest.updated_at : null
            }
        ];
        
        // 완료 단계 추가 (승인된 경우만)
        if (status === 'approved') {
            steps.push({
                id: 'completion',
                title: '구매 완료',
                description: '항공권 구매를 완료해주세요',
                icon: 'shopping-cart',
                completed: status === 'completed',
                current: false,
                date: null
            });
        } else if (status === 'completed') {
            steps.push({
                id: 'completion',
                title: '구매 완료',
                description: '항공권 구매가 완료되었습니다',
                icon: 'check-circle-2',
                completed: true,
                current: true,
                date: this.currentRequest.updated_at
            });
        }
        
        return steps;
    }

    // 결정 설명 텍스트
    getDecisionDescription(status) {
        switch (status) {
            case 'approved':
                return '신청이 승인되었습니다';
            case 'rejected':
                return '신청이 거부되었습니다';
            case 'completed':
                return '신청이 승인되고 구매가 완료되었습니다';
            case 'cancelled':
                return '신청이 취소되었습니다';
            default:
                return '검토 결과를 기다리고 있습니다';
        }
    }

    // 결정 아이콘
    getDecisionIcon(status) {
        switch (status) {
            case 'approved':
            case 'completed':
                return 'check-circle';
            case 'rejected':
                return 'x-circle';
            case 'cancelled':
                return 'slash';
            default:
                return 'clock';
        }
    }

    // 활동 기간 정보 렌더링
    renderActivityPeriodInfo() {
        if (!this.userProfile?.actual_arrival_date || !this.userProfile?.actual_work_end_date) {
            return '';
        }
        
        const activityDays = this.calculateActivityDays(
            this.userProfile.actual_arrival_date,
            this.userProfile.actual_work_end_date
        );
        
        return `
            <div class="activity-period-info">
                <h5 class="activity-title">
                    <i data-lucide="calendar-days"></i>
                    현지 활동 기간
                </h5>
                <div class="activity-details">
                    <div class="activity-item">
                        <label>현지 도착일</label>
                        <span>${this.formatDate(this.userProfile.actual_arrival_date)}</span>
                    </div>
                    <div class="activity-item">
                        <label>학당 근무 종료일</label>
                        <span>${this.formatDate(this.userProfile.actual_work_end_date)}</span>
                    </div>
                    <div class="activity-item highlight">
                        <label>총 활동일</label>
                        <span>${activityDays}일</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 가격 정보 렌더링
    renderPriceInfo(request) {
        if (!request.ticket_price) {
            return '';
        }
        
        return `
            <div class="price-info">
                <h5 class="price-title">
                    <i data-lucide="dollar-sign"></i>
                    가격 정보
                </h5>
                <div class="price-details">
                    <div class="price-item">
                        <label>항공료</label>
                        <span class="price-value">
                            ${request.ticket_price?.toLocaleString()} ${request.currency || 'KRW'}
                        </span>
                    </div>
                    ${request.price_source ? `
                        <div class="price-item">
                            <label>가격 출처</label>
                            <span>${request.price_source}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // 첨부 파일 렌더링
    renderAttachments(request) {
        const attachments = [];
        
        if (request.flight_image_url) {
            attachments.push({
                type: 'flight-image',
                label: '항공권 정보 이미지',
                url: request.flight_image_url,
                icon: 'image'
            });
        }
        
        if (request.receipt_url) {
            attachments.push({
                type: 'receipt',
                label: '영수증',
                url: request.receipt_url,
                icon: 'receipt'
            });
        }
        
        if (request.ticket_url) {
            attachments.push({
                type: 'ticket',
                label: '항공권',
                url: request.ticket_url,
                icon: 'plane'
            });
        }
        
        if (request.admin_ticket_url) {
            attachments.push({
                type: 'admin-ticket',
                label: '관리자 업로드 항공권',
                url: request.admin_ticket_url,
                icon: 'shield'
            });
        }
        
        if (attachments.length === 0) {
            return '';
        }
        
        return `
            <div class="attachments-info">
                <h5 class="attachments-title">
                    <i data-lucide="paperclip"></i>
                    첨부 파일
                </h5>
                <div class="attachments-list">
                    ${attachments.map(attachment => `
                        <div class="attachment-item">
                            <div class="attachment-info">
                                <i data-lucide="${attachment.icon}"></i>
                                <span class="attachment-label">${attachment.label}</span>
                            </div>
                            <div class="attachment-actions">
                                <a href="${attachment.url}" target="_blank" class="btn btn-sm btn-outline">
                                    <i data-lucide="external-link"></i>
                                    보기
                                </a>
                                <a href="${attachment.url}" download class="btn btn-sm btn-outline">
                                    <i data-lucide="download"></i>
                                    다운로드
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 액션 버튼 생성
    generateActionButtons(status) {
        const buttons = [];
        
        switch (status) {
            case 'pending':
                buttons.push({
                    action: 'cancel-request',
                    label: '신청 취소',
                    icon: 'x',
                    variant: 'outline-danger',
                    confirmation: true
                });
                buttons.push({
                    action: 'edit-request',
                    label: '신청 수정',
                    icon: 'edit',
                    variant: 'outline-primary'
                });
                break;
                
            case 'approved':
                buttons.push({
                    action: 'view-details',
                    label: '승인 세부사항',
                    icon: 'info',
                    variant: 'outline-success'
                });
                break;
                
            case 'rejected':
                buttons.push({
                    action: 'new-request',
                    label: '새 신청',
                    icon: 'plus',
                    variant: 'primary'
                });
                buttons.push({
                    action: 'view-details',
                    label: '거부 사유 확인',
                    icon: 'alert-circle',
                    variant: 'outline-danger'
                });
                break;
                
            case 'cancelled':
                buttons.push({
                    action: 'new-request',
                    label: '새 신청',
                    icon: 'plus',
                    variant: 'primary'
                });
                break;
                
            case 'completed':
                buttons.push({
                    action: 'view-details',
                    label: '완료 상세',
                    icon: 'check-circle',
                    variant: 'outline-success'
                });
                break;
        }
        
        // 공통 버튼
        buttons.push({
            action: 'refresh-status',
            label: '상태 새로고침',
            icon: 'refresh-cw',
            variant: 'outline'
        });
        
        return buttons.map(button => `
            <button type="button" 
                    class="btn btn-${button.variant} ${button.action}-btn" 
                    data-action="${button.action}"
                    ${button.confirmation ? 'data-confirmation="true"' : ''}>
                <i data-lucide="${button.icon}"></i>
                ${button.label}
            </button>
        `).join('');
    }

    // 이벤트 핸들러들
    async handleRefreshStatus() {
        console.log('🔄 [액션] 상태 새로고침 시작...');
        
        try {
            this.showLoading(true);
            
            // 현재 신청 내역 다시 로드
            await this.loadCurrentRequest();
            
            // UI 업데이트
            this.renderStatus();
            
            this.showSuccess('상태가 새로고침되었습니다.');
            this.lastUpdated = new Date();
            
        } catch (error) {
            console.error('❌ [액션] 상태 새로고침 실패:', error);
            this.showError('상태를 새로고침할 수 없습니다.', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleCancelRequest() {
        console.log('🔄 [액션] 신청 취소 요청...');
        
        try {
            // 확인 대화상자
            const confirmed = confirm(
                '정말로 항공권 신청을 취소하시겠습니까?\n\n' +
                '취소된 신청은 복구할 수 없습니다.'
            );
            
            if (!confirmed) {
                console.log('ℹ️ [액션] 신청 취소가 사용자에 의해 취소됨');
                return;
            }
            
            this.showLoading(true);
            
            // API를 통해 취소 처리
            if (this.api && typeof this.api.cancelFlightRequest === 'function') {
                await this.api.cancelFlightRequest(this.currentRequest.id);
            } else {
                throw new Error('API cancelFlightRequest 메서드를 찾을 수 없습니다');
            }
            
            // 데이터 새로고침
            await this.loadCurrentRequest();
            this.renderStatus();
            
            this.showSuccess('항공권 신청이 취소되었습니다.');
            
        } catch (error) {
            console.error('❌ [액션] 신청 취소 실패:', error);
            this.showError('신청을 취소할 수 없습니다.', error);
        } finally {
            this.showLoading(false);
        }
    }

    handleEditRequest() {
        console.log('🔄 [액션] 신청 수정 요청...');
        
        try {
            // 기존 신청 데이터로 폼 채우기
            this.populateFormWithExistingData();
            
            // 신청 폼 표시
            if (this.elements.requestForm) {
                this.elements.requestForm.style.display = 'block';
            }
            
            // 상태 카드 숨기기
            if (this.elements.statusContainer) {
                this.elements.statusContainer.style.display = 'none';
            }
            
            // 폼으로 스크롤
            this.scrollToForm();
            
            this.showSuccess('기존 정보로 폼이 채워졌습니다. 수정 후 다시 제출해주세요.');
            
        } catch (error) {
            console.error('❌ [액션] 신청 수정 실패:', error);
            this.showError('신청을 수정할 수 없습니다.', error);
        }
    }

    handleNewRequest() {
        console.log('🔄 [액션] 새 신청 요청...');
        
        try {
            // 폼 초기화
            if (this.elements.requestForm) {
                const form = this.elements.requestForm.querySelector('form');
                if (form) {
                    form.reset();
                }
                this.elements.requestForm.style.display = 'block';
            }
            
            // 상태 카드 숨기기
            if (this.elements.statusContainer) {
                this.elements.statusContainer.style.display = 'none';
            }
            
            // 폼으로 스크롤
            this.scrollToForm();
            
            this.showSuccess('새로운 신청을 위한 폼이 준비되었습니다.');
            
        } catch (error) {
            console.error('❌ [액션] 새 신청 실패:', error);
            this.showError('새 신청을 시작할 수 없습니다.', error);
        }
    }

    handleViewDetails() {
        console.log('🔄 [액션] 세부사항 보기...');
        
        try {
            // 세부사항 모달 또는 확장 뷰 표시
            // 현재는 간단히 알림으로 처리
            const details = this.formatDetailedInfo();
            
            if (confirm('세부사항을 콘솔에서 확인하시겠습니까?\n\n확인을 누르면 브라우저 개발자 도구의 콘솔에서 상세 정보를 볼 수 있습니다.')) {
                console.log('📋 [세부사항] 항공권 신청 상세 정보:', details);
                this.showSuccess('세부사항이 콘솔에 출력되었습니다. 개발자 도구(F12)를 확인해주세요.');
            }
            
        } catch (error) {
            console.error('❌ [액션] 세부사항 보기 실패:', error);
            this.showError('세부사항을 볼 수 없습니다.', error);
        }
    }

    // 유틸리티 메서드들
    formatDate(dateString) {
        try {
            if (!dateString) return 'N/A';
            
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
        } catch (error) {
            console.error('❌ [날짜포맷] 실패:', error);
            return 'N/A';
        }
    }

    calculateStayDuration(departureDate, returnDate) {
        try {
            const departure = new Date(departureDate);
            const returnFlight = new Date(returnDate);
            const diffTime = returnFlight - departure;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        } catch (error) {
            console.error('❌ [체류기간계산] 실패:', error);
            return 0;
        }
    }

    calculateActivityDays(arrivalDate, workEndDate) {
        try {
            const arrival = new Date(arrivalDate);
            const workEnd = new Date(workEndDate);
            const diffTime = workEnd - arrival;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        } catch (error) {
            console.error('❌ [활동일계산] 실패:', error);
            return 0;
        }
    }

    scrollToForm() {
        try {
            if (this.elements.requestForm) {
                this.elements.requestForm.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        } catch (error) {
            console.error('❌ [스크롤] 실패:', error);
        }
    }

    populateFormWithExistingData() {
        try {
            if (!this.currentRequest || !this.elements.requestForm) {
                return;
            }
            
            const request = this.currentRequest;
            const form = this.elements.requestForm;
            
            // 날짜 필드들
            this.setFormValue(form, 'departureDate', request.departure_date);
            this.setFormValue(form, 'returnDate', request.return_date);
            
            // 공항 정보
            this.setFormValue(form, 'departureAirport', request.departure_airport);
            this.setFormValue(form, 'arrivalAirport', request.arrival_airport);
            
            // 가격 정보
            this.setFormValue(form, 'ticketPrice', request.ticket_price);
            this.setFormValue(form, 'currency', request.currency);
            this.setFormValue(form, 'priceSource', request.price_source);
            
            // 구매 방식
            this.setRadioValue(form, 'purchaseType', request.purchase_type);
            
            // 구매 링크
            this.setFormValue(form, 'purchaseLink', request.purchase_link);
            
            console.log('✅ [폼채우기] 기존 데이터로 폼 채우기 완료');
            
        } catch (error) {
            console.error('❌ [폼채우기] 실패:', error);
        }
    }

    setFormValue(form, fieldName, value) {
        try {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field && value !== null && value !== undefined) {
                field.value = value;
            }
        } catch (error) {
            console.warn('⚠️ [폼설정] 필드 설정 실패:', fieldName, error);
        }
    }

    setRadioValue(form, fieldName, value) {
        try {
            const radios = form.querySelectorAll(`[name="${fieldName}"]`);
            radios.forEach(radio => {
                if (radio.value === value) {
                    radio.checked = true;
                }
            });
        } catch (error) {
            console.warn('⚠️ [라디오설정] 설정 실패:', fieldName, error);
        }
    }

    formatDetailedInfo() {
        return {
            request: this.currentRequest,
            userProfile: this.userProfile,
            lastUpdated: this.lastUpdated,
            module: 'FlightRequestStatus v1.0.0'
        };
    }

    // 상태 변경 핸들러
    handleAPIUpdate(data) {
        console.log('📡 [API업데이트] API 업데이트 이벤트 처리:', data);
        
        try {
            // 현재 신청의 업데이트인지 확인
            if (data.id === this.currentRequest?.id) {
                this.currentRequest = { ...this.currentRequest, ...data };
                this.renderStatus();
                this.showSuccess('신청 상태가 업데이트되었습니다.');
            }
        } catch (error) {
            console.error('❌ [API업데이트] 처리 실패:', error);
        }
    }

    handleStatusChange(detail) {
        console.log('📡 [상태변경] 전역 상태 변경 이벤트 처리:', detail);
        
        try {
            // 상태 새로고침
            this.handleRefreshStatus();
        } catch (error) {
            console.error('❌ [상태변경] 처리 실패:', error);
        }
    }

    // UI 상태 관리
    showLoading(loading) {
        try {
            this.isLoading = loading;
            
            if (this.elements.loadingIndicator) {
                this.elements.loadingIndicator.style.display = loading ? 'block' : 'none';
            }
            
            // 로딩 상태일 때 버튼 비활성화
            const actionButtons = document.querySelectorAll('.flight-request-status-card button');
            actionButtons.forEach(button => {
                button.disabled = loading;
            });
            
        } catch (error) {
            console.error('❌ [로딩상태] 설정 실패:', error);
        }
    }

    showError(message, error = null) {
        try {
            console.error('❌ [에러표시]:', message, error);
            
            const errorEl = this.elements.errorMessage;
            if (errorEl) {
                errorEl.innerHTML = `
                    <div class="error-content">
                        <i data-lucide="alert-circle"></i>
                        <div>
                            <strong>${message}</strong>
                            ${error ? `<br><small>세부사항: ${error.message || '알 수 없는 오류'}</small>` : ''}
                        </div>
                    </div>
                `;
                errorEl.style.display = 'block';
                
                setTimeout(() => {
                    errorEl.style.display = 'none';
                }, 5000);
                
                this.initializeIcons();
            } else {
                alert(message);
            }
        } catch (displayError) {
            console.error('❌ [에러표시] 표시 실패:', displayError);
            alert(message);
        }
    }

    showSuccess(message) {
        try {
            console.log('✅ [성공표시]:', message);
            
            const successEl = this.elements.successMessage;
            if (successEl) {
                successEl.innerHTML = `
                    <div class="success-content">
                        <i data-lucide="check-circle"></i>
                        <span>${message}</span>
                    </div>
                `;
                successEl.style.display = 'block';
                
                setTimeout(() => {
                    successEl.style.display = 'none';
                }, 3000);
                
                this.initializeIcons();
            }
        } catch (error) {
            console.error('❌ [성공표시] 표시 실패:', error);
        }
    }

    initializeIcons() {
        try {
            if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
                lucide.createIcons();
            }
        } catch (error) {
            console.warn('⚠️ [아이콘] 초기화 실패:', error);
        }
    }

    // 공개 메서드들
    async refresh() {
        console.log('🔄 [공개메서드] refresh 호출됨');
        await this.handleRefreshStatus();
    }

    getCurrentRequest() {
        return this.currentRequest;
    }

    getUserProfile() {
        return this.userProfile;
    }

    getLastUpdated() {
        return this.lastUpdated;
    }

    // 정리 메서드
    destroy() {
        try {
            console.log('🔄 [정리] FlightRequestStatus 정리 시작...');
            
            // 이벤트 리스너 제거
            this.eventListeners.forEach((listener, event) => {
                document.removeEventListener(event, listener);
            });
            this.eventListeners.clear();
            
            // 상태 초기화
            this.currentRequest = null;
            this.userProfile = null;
            this.isInitialized = false;
            
            console.log('✅ [정리] FlightRequestStatus 정리 완료');
            
        } catch (error) {
            console.error('❌ [정리] 실패:', error);
        }
    }
}

// CSS 스타일 추가 (동적 삽입)
if (!document.querySelector('#flight-request-status-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'flight-request-status-styles';
    styleSheet.textContent = `
        /* FlightRequestStatus 전용 스타일 */
        .flight-status-container {
            margin-bottom: 24px;
            transition: all 0.3s ease;
        }

        .flight-request-status-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .status-header {
            padding: 20px;
            border-radius: 12px 12px 0 0;
        }

        .status-header-content {
            display: flex;
            align-items: flex-start;
            gap: 16px;
        }

        .status-icon-wrapper {
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .status-icon {
            width: 24px;
            height: 24px;
        }

        .status-info {
            flex: 1;
            min-width: 0;
        }

        .status-title {
            margin: 0 0 4px 0;
            font-size: 18px;
            font-weight: 600;
        }

        .status-description {
            margin: 0 0 12px 0;
            opacity: 0.9;
            font-size: 14px;
        }

        .status-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 12px;
            opacity: 0.8;
        }

        .status-actions-header {
            flex-shrink: 0;
        }

        .progress-timeline {
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
        }

        .timeline-title {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #374151;
        }

        .timeline-steps {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .timeline-step {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            transition: all 0.2s ease;
        }

        .timeline-step.completed {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }

        .timeline-step.current {
            background: #fffbeb;
            border: 1px solid #fed7aa;
        }

        .timeline-step-icon {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .timeline-step.completed .timeline-step-icon {
            background: #059669;
            color: white;
        }

        .timeline-step.current .timeline-step-icon {
            background: #f59e0b;
            color: white;
        }

        .timeline-step:not(.completed):not(.current) .timeline-step-icon {
            background: #e5e7eb;
            color: #6b7280;
        }

        .timeline-step-content {
            flex: 1;
            min-width: 0;
        }

        .timeline-step-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: #111827;
        }

        .timeline-step-description {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 4px;
        }

        .timeline-step-date {
            font-size: 12px;
            color: #9ca3af;
        }

        .request-details {
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
        }

        .details-title {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #374151;
        }

        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .detail-item {
            background: #f9fafb;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .detail-item.full-width {
            grid-column: 1 / -1;
        }

        .detail-item.rejection-reason {
            background: #fef2f2;
            border-color: #fecaca;
        }

        .detail-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .detail-value {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: #111827;
            font-weight: 500;
        }

        .detail-value i {
            width: 16px;
            height: 16px;
            color: #6b7280;
        }

        .rejection-text {
            color: #dc2626 !important;
        }

        .purchase-link {
            color: #2563eb;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .purchase-link:hover {
            color: #1d4ed8;
        }

        .activity-period-info,
        .price-info {
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
            border: 1px solid #e2e8f0;
        }

        .activity-title,
        .price-title {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            color: #475569;
        }

        .activity-details,
        .price-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }

        .activity-item,
        .price-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .activity-item label,
        .price-item label {
            font-size: 12px;
            font-weight: 500;
            color: #64748b;
        }

        .activity-item span,
        .price-item span {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
        }

        .activity-item.highlight span {
            color: #059669;
        }

        .price-value {
            color: #059669 !important;
            font-size: 16px !important;
        }

        .attachments-info {
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
        }

        .attachments-title {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #374151;
        }

        .attachments-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .attachment-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }

        .attachment-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .attachment-label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
        }

        .attachment-actions {
            display: flex;
            gap: 8px;
        }

        .status-actions {
            padding: 20px 24px;
            background: #f9fafb;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: flex-end;
        }

        .no-request-status {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 32px;
            text-align: center;
        }

        .no-request-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
        }

        .no-request-icon {
            width: 48px;
            height: 48px;
            color: #6b7280;
        }

        .no-request-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #374151;
        }

        .no-request-content {
            margin-bottom: 24px;
            color: #6b7280;
            line-height: 1.6;
        }

        .no-request-actions {
            display: flex;
            justify-content: center;
        }

        /* 버튼 스타일 */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: 1px solid transparent;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 13px;
        }

        .btn-primary {
            background: #2563eb;
            border-color: #2563eb;
            color: white;
        }

        .btn-primary:hover:not(:disabled) {
            background: #1d4ed8;
            border-color: #1d4ed8;
        }

        .btn-outline {
            background: transparent;
            border-color: #d1d5db;
            color: #374151;
        }

        .btn-outline:hover:not(:disabled) {
            background: #f3f4f6;
            border-color: #9ca3af;
        }

        .btn-outline-primary {
            background: transparent;
            border-color: #2563eb;
            color: #2563eb;
        }

        .btn-outline-primary:hover:not(:disabled) {
            background: #2563eb;
            color: white;
        }

        .btn-outline-success {
            background: transparent;
            border-color: #059669;
            color: #059669;
        }

        .btn-outline-success:hover:not(:disabled) {
            background: #059669;
            color: white;
        }

        .btn-outline-danger {
            background: transparent;
            border-color: #dc2626;
            color: #dc2626;
        }

        .btn-outline-danger:hover:not(:disabled) {
            background: #dc2626;
            color: white;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
            .status-header-content {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
            }

            .status-actions-header {
                align-self: flex-start;
            }

            .details-grid {
                grid-template-columns: 1fr;
            }

            .status-actions {
                justify-content: stretch;
                flex-direction: column;
            }

            .attachment-item {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
            }

            .attachment-actions {
                justify-content: center;
            }
        }

        /* 에러 및 성공 메시지 스타일 */
        .error-content,
        .success-content {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }

        .error-content {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }

        .success-content {
            background: #f0fdf4;
            color: #059669;
            border: 1px solid #bbf7d0;
        }
    `;
    document.head.appendChild(styleSheet);
}

// 전역 스코프에 노출
window.FlightRequestStatus = FlightRequestStatus;

console.log('✅ FlightRequestStatus v1.0.0 모듈 로드 완료');
console.log('🎯 FlightRequestStatus 핵심 기능:', {
    신청내역조회: '사용자의 현재 항공권 신청 상태 실시간 조회',
    상태별UI: 'pending/approved/rejected/cancelled/completed 상태별 맞춤 UI',
    진행상황표시: '신청 → 검토 → 결정 → 완료 단계별 시각적 타임라인',
    액션버튼: '상태에 따른 취소/수정/새신청/상세보기 액션',
    실시간업데이트: 'API 이벤트 및 전역 이벤트를 통한 자동 상태 동기화',
    반응형디자인: '모바일/데스크톱 최적화된 카드 레이아웃',
    에러처리: '네트워크 오류, 데이터 없음 등 모든 예외 상황 처리',
    폼연동: '기존 신청 데이터로 폼 자동 채우기 및 수정 지원'
});
