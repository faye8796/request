// flight-request-status.js - 항공권 신청 내역 조회 및 관리 모듈 v1.1.0
// 🎯 목적: 사용자의 항공권 신청 상태를 조회하고 관리하는 독립 모듈
// 📋 기능: 신청 내역 표시, 상태별 UI, 액션 버튼, 실시간 업데이트
// 🔗 연동: flight-request-coordinator.js, flight-request-api.js
// 🗄️ DB: flight_requests, user_profiles 테이블 연동
// 🔧 v1.0.2 개선: API 메서드 호출 오류 수정 (loadUserProfile → getUserProfile)
// 🚨 v1.0.3 대폭 개편: 신청 수정 기능 완전 제거, 삭제 중심 UX로 통일
// 🚀 v1.1.0 핵심 업데이트: DB값 직접 사용 + 완전삭제 로직 + 직접구매 파일 업로드

class FlightRequestStatus {
    constructor() {
        console.log('🚀 FlightRequestStatus v1.1.0 생성자 초기화 시작...');
        
        // 의존성 참조
        this.api = null;
        this.utils = null;
        this.coordinator = null;
        
        // DOM 요소 참조
        this.elements = this.initElements();
        
        // 데이터 상태
        this.currentRequest = null;
        this.userProfile = null;
        this.currentUser = null;
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
        
        console.log('✅ FlightRequestStatus v1.1.0 생성자 완료');
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

    // 🚨 v1.1.0 수정: 이벤트 리스너 설정 (직접구매 파일 업로드 추가)
    setupEventListeners() {
        console.log('🔄 [이벤트] 이벤트 리스너 설정 시작...');
        
        try {
            // 새로고침 버튼 이벤트 (동적 생성되므로 이벤트 위임 사용)
            document.addEventListener('click', (event) => {
                if (event.target.matches('.refresh-status-btn, [data-action="refresh-status"]')) {
                    event.preventDefault();
                    this.handleRefreshStatus();
                }
                
                // 🚨 v1.1.0: 완전삭제 로직으로 변경
                if (event.target.matches('.delete-request-btn, [data-action="delete-request"]')) {
                    event.preventDefault();
                    this.handleDeleteRequest();
                }
                
                if (event.target.matches('.new-request-btn, [data-action="new-request"]')) {
                    event.preventDefault();
                    this.handleNewRequest();
                }
                
                if (event.target.matches('.view-details-btn, [data-action="view-details"]')) {
                    event.preventDefault();
                    this.handleViewDetails();
                }
                
                // 🆕 v1.1.0: 직접구매 파일 업로드 이벤트
                if (event.target.matches('.upload-receipt-btn, [data-action="upload-receipt"]')) {
                    event.preventDefault();
                    this.handleUploadReceipt();
                }
                
                if (event.target.matches('.upload-ticket-btn, [data-action="upload-ticket"]')) {
                    event.preventDefault();
                    this.handleUploadTicket();
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
            
            console.log('✅ [이벤트] 이벤트 리스너 설정 완료 (직접구매 파일 업로드 포함)');
            
        } catch (error) {
            console.error('❌ [이벤트] 설정 실패:', error);
        }
    }

    // 초기 데이터 로드
    async loadInitialData() {
        console.log('🔄 [초기데이터] 초기 데이터 로드 시작...');
        
        try {
            this.showLoading(true);
            
            // 🔧 v1.0.2 수정: 사용자 정보 로드 방식 개선
            await this.loadUserData();
            
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

    // 🔧 v1.0.2 신규: 사용자 데이터 통합 로드
    async loadUserData() {
        try {
            console.log('🔄 [사용자데이터] 사용자 데이터 로드 시작...');
            
            // API 유효성 확인
            if (!this.api) {
                throw new Error('API 인스턴스를 찾을 수 없습니다');
            }
            
            // 1. 현재 사용자 정보 로드 (localStorage 기반)
            if (typeof this.api.getCurrentUser === 'function') {
                try {
                    this.currentUser = await this.api.getCurrentUser();
                    console.log('✅ [사용자데이터] 현재 사용자 정보 로드 완료:', {
                        id: this.currentUser?.id,
                        name: this.currentUser?.name
                    });
                } catch (userError) {
                    console.warn('⚠️ [사용자데이터] getCurrentUser 실패:', userError);
                    // localStorage에서 직접 시도
                    this.currentUser = this.getUserFromLocalStorage();
                }
            } else {
                console.warn('⚠️ [사용자데이터] getCurrentUser 메서드 없음, localStorage 사용');
                this.currentUser = this.getUserFromLocalStorage();
            }
            
            // 2. 사용자 프로필 로드 (DB 기반)
            if (typeof this.api.getUserProfile === 'function') {
                try {
                    this.userProfile = await this.api.getUserProfile();
                    console.log('✅ [사용자데이터] 사용자 프로필 로드 완료:', {
                        hasActivityPeriod: !!(this.userProfile?.actual_arrival_date && this.userProfile?.actual_work_end_date),
                        actualArrivalDate: this.userProfile?.actual_arrival_date,
                        actualWorkEndDate: this.userProfile?.actual_work_end_date,
                        actualWorkDays: this.userProfile?.actual_work_days,
                        dispatchDuration: this.userProfile?.dispatch_duration
                    });
                } catch (profileError) {
                    console.warn('⚠️ [사용자데이터] getUserProfile 실패:', profileError);
                    this.userProfile = null;
                }
            } else {
                console.warn('⚠️ [사용자데이터] getUserProfile 메서드를 찾을 수 없습니다');
                this.userProfile = null;
            }
            
            // 3. 폴백: localStorage에서 사용자 프로필 정보 확인
            if (!this.userProfile) {
                this.userProfile = this.getUserProfileFromLocalStorage();
            }
            
            console.log('✅ [사용자데이터] 사용자 데이터 로드 완료');
            
        } catch (error) {
            console.error('❌ [사용자데이터] 로드 실패:', error);
            
            // 폴백: localStorage에서 최대한 정보 수집
            this.currentUser = this.getUserFromLocalStorage();
            this.userProfile = this.getUserProfileFromLocalStorage();
            
            if (!this.currentUser) {
                throw new Error('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
            }
        }
    }

    // 🔧 v1.0.2 신규: localStorage에서 사용자 정보 추출
    getUserFromLocalStorage() {
        try {
            const keys = ['currentStudent', 'userInfo', 'userProfile', 'user', 'currentUser', 'student'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed && parsed.id) {
                            return {
                                id: String(parsed.id),
                                email: parsed.email || 'unknown@example.com',
                                name: parsed.name || 'Unknown User'
                            };
                        }
                    } catch (parseError) {
                        // 계속 시도
                    }
                }
            }
            
            console.warn('⚠️ [localStorage] 사용자 정보를 찾을 수 없음');
            return null;
            
        } catch (error) {
            console.error('❌ [localStorage] 사용자 정보 추출 실패:', error);
            return null;
        }
    }

    // 🔧 v1.0.2 신규: localStorage에서 사용자 프로필 추출
    getUserProfileFromLocalStorage() {
        try {
            const keys = ['currentStudent', 'userProfile', 'userInfo'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed && (parsed.actual_arrival_date || parsed.actual_work_end_date)) {
                            return parsed;
                        }
                    } catch (parseError) {
                        // 계속 시도
                    }
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [localStorage] 프로필 정보 추출 실패:', error);
            return null;
        }
    }

    // 🔧 v1.0.2 수정: 현재 신청 내역 로드 방식 개선
    async loadCurrentRequest() {
        try {
            console.log('🔄 [신청로드] 현재 신청 내역 로드 시작...');
            
            // API 유효성 확인
            if (!this.api) {
                throw new Error('API 인스턴스를 찾을 수 없습니다');
            }
            
            let request = null;
            
            // 1. loadExistingFlightRequest 메서드 시도 (별칭)
            if (typeof this.api.loadExistingFlightRequest === 'function') {
                try {
                    request = await this.api.loadExistingFlightRequest();
                    console.log('✅ [신청로드] loadExistingFlightRequest 사용 성공');
                } catch (aliasError) {
                    console.warn('⚠️ [신청로드] loadExistingFlightRequest 실패:', aliasError);
                }
            }
            
            // 2. getExistingRequest 메서드 시도 (원본)
            if (!request && typeof this.api.getExistingRequest === 'function') {
                try {
                    request = await this.api.getExistingRequest();
                    console.log('✅ [신청로드] getExistingRequest 사용 성공');
                } catch (originalError) {
                    console.warn('⚠️ [신청로드] getExistingRequest 실패:', originalError);
                }
            }
            
            // 3. getFlightRequest 메서드 시도 (대안)
            if (!request && typeof this.api.getFlightRequest === 'function') {
                try {
                    const result = await this.api.getFlightRequest();
                    if (result && result.success && result.data) {
                        request = result.data;
                        console.log('✅ [신청로드] getFlightRequest 사용 성공');
                    }
                } catch (alternativeError) {
                    console.warn('⚠️ [신청로드] getFlightRequest 실패:', alternativeError);
                }
            }
            
            this.currentRequest = request;
            
            if (this.currentRequest) {
                console.log('✅ [신청로드] 신청 내역 로드 완료:', {
                    id: this.currentRequest.id,
                    status: this.currentRequest.status,
                    createdAt: this.currentRequest.created_at,
                    departureDate: this.currentRequest.departure_date,
                    returnDate: this.currentRequest.return_date,
                    purchaseType: this.currentRequest.purchase_type
                });
            } else {
                console.log('ℹ️ [신청로드] 신청 내역이 없습니다');
            }
            
        } catch (error) {
            console.error('❌ [신청로드] 실패:', error);
            
            // 에러 발생 시에도 null로 설정하여 "신청 내역 없음" UI 표시
            this.currentRequest = null;
            
            // 심각한 오류가 아닌 경우 계속 진행
            if (!error.message.includes('API 인스턴스를 찾을 수 없습니다')) {
                console.log('ℹ️ [신청로드] 오류로 인해 신청 내역 없음으로 처리');
                return; // throw하지 않고 계속 진행
            }
            
            throw error;
        }
    }

    // 상태 렌더링 (메인 메서드) - 기존과 동일
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
            
            // 🚨 v1.1.0 수정: 액션 버튼 생성 (직접구매 파일 업로드 포함)
            const actionButtons = this.generateActionButtons(request.status, request.purchase_type);
            
            // 🚨 v1.1.0 수정: 활동 기간 정보 (DB값 직접 사용)
            const activityPeriodInfo = this.renderActivityPeriodInfoFromDB();
            
            // 가격 정보
            const priceInfo = this.renderPriceInfo(request);
            
            // 🆕 v1.1.0: 직접구매 파일 업로드 섹션
            const directPurchaseFileUpload = request.purchase_type === 'direct' ? 
                this.renderDirectPurchaseFileUpload(request) : '';
            
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
                                    ${this.getStayDurationFromDB()}일
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

                    <!-- 🆕 v1.1.0: 직접구매 파일 업로드 섹션 -->
                    ${directPurchaseFileUpload}

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

    // 🚨 v1.1.0 수정: 활동 기간 정보 렌더링 (DB값 직접 사용)
    renderActivityPeriodInfoFromDB() {
        if (!this.userProfile?.actual_arrival_date || !this.userProfile?.actual_work_end_date) {
            return '';
        }
        
        // 🚨 v1.1.0: DB값 직접 사용 (계산 대신)
        const activityDays = this.userProfile.actual_work_days || 0;
        
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

    // 🔧 전체 메서드를 이것으로 교체:
    renderDirectPurchaseFileUpload(request) {
        const hasReceipt = !!(request.receipt_url);
        const hasTicket = !!(request.ticket_url);

        return `
            <div class="direct-purchase-section">
                <h5 class="subsection-title">
                    <i data-lucide="upload"></i>
                    직접구매 파일 관리
                </h5>

                <div class="file-cards-grid">
                    <div class="file-card receipt-card">
                        <div class="file-card-header">
                            <i data-lucide="receipt"></i>
                            <span>영수증</span>
                            <div class="file-status ${hasReceipt ? 'uploaded' : 'pending'}">
                                ${hasReceipt ? '업로드됨' : '업로드 필요'}
                            </div>
                        </div>

                        ${hasReceipt ? `
                            <div class="file-preview">
                                <div class="file-info">
                                    <i data-lucide="file-check"></i>
                                    <div>
                                        <p class="file-name">영수증 파일</p>
                                        <p class="file-size">업로드 완료</p>
                                    </div>
                                </div>
                                <div class="file-actions">
                                    <a href="${request.receipt_url}" target="_blank" class="btn btn-sm btn-outline">
                                        <i data-lucide="external-link"></i>
                                        보기
                                    </a>
                                    <a href="${request.receipt_url}" download class="btn btn-sm btn-outline">
                                        <i data-lucide="download"></i>
                                        다운로드
                                    </a>
                                </div>
                            </div>
                        ` : ''}

                        <div class="file-card-actions">
                            <button type="button" class="btn btn-sm btn-primary upload-receipt-btn" data-action="upload-receipt">
                                <i data-lucide="upload"></i>
                                ${hasReceipt ? '재업로드' : '업로드'}
                            </button>
                        </div>
                    </div>

                    <div class="file-card ticket-card">
                        <div class="file-card-header">
                            <i data-lucide="plane"></i>
                            <span>항공권</span>
                            <div class="file-status ${hasTicket ? 'uploaded' : 'pending'}">
                                ${hasTicket ? '업로드됨' : '업로드 필요'}
                            </div>
                        </div>

                        ${hasTicket ? `
                            <div class="file-preview">
                                <div class="file-info">
                                    <i data-lucide="file-check"></i>
                                    <div>
                                        <p class="file-name">항공권 파일</p>
                                        <p class="file-size">업로드 완료</p>
                                    </div>
                                </div>
                                <div class="file-actions">
                                    <a href="${request.ticket_url}" target="_blank" class="btn btn-sm btn-outline">
                                        <i data-lucide="external-link"></i>
                                        보기
                                    </a>
                                    <a href="${request.ticket_url}" download class="btn btn-sm btn-outline">
                                        <i data-lucide="download"></i>
                                        다운로드
                                    </a>
                                </div>
                            </div>
                        ` : ''}

                        <div class="file-card-actions">
                            <button type="button" class="btn btn-sm btn-primary upload-ticket-btn" data-action="upload-ticket">
                                <i data-lucide="upload"></i>
                                ${hasTicket ? '재업로드' : '업로드'}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="upload-notice">
                    <div class="notice-content">
                        <i data-lucide="info"></i>
                        <div>
                            <h4>파일 업로드 안내</h4>
                            <ul>
                                <li>지원 파일 형식: JPG, PNG, PDF (최대 10MB)</li>
                                <li>영수증: 항공권 구매 영수증 또는 결제 확인서</li>
                                <li>항공권: 전자 항공권(e-ticket) 또는 항공권 확인서</li>
                            </ul>
                        </div>
                    </div>
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

    // 🚨 v1.1.0 수정: 액션 버튼 생성 (직접구매 파일 업로드 버튼 추가)
    generateActionButtons(status, purchaseType = null) {
        const buttons = [];
        
        switch (status) {
            case 'pending':
                // 검토 중: 삭제하기만 가능
                buttons.push({
                    action: 'delete-request',
                    label: '신청 삭제',
                    icon: 'trash-2',
                    variant: 'outline-danger',
                    confirmation: true,
                    description: '신청을 삭제하고 새로 작성할 수 있습니다.'
                });
                break;
                
            case 'approved':
                // 승인됨: 삭제 불가 (승인된 상태는 보존)
                buttons.push({
                    action: 'view-details',
                    label: '승인 세부사항',
                    icon: 'info',
                    variant: 'outline-success',
                    description: '승인된 신청의 상세 정보를 확인합니다.'
                });
                break;
                
            case 'rejected':
                // 거부됨: 삭제하고 재신청
                buttons.push({
                    action: 'delete-request',
                    label: '삭제하고 재신청',
                    icon: 'trash-2',
                    variant: 'outline-danger',
                    confirmation: true,
                    description: '거부된 신청을 삭제하고 새로 신청합니다.'
                });
                buttons.push({
                    action: 'view-details',
                    label: '거부 사유 확인',
                    icon: 'alert-circle',
                    variant: 'outline-warning',
                    description: '신청이 거부된 이유를 확인합니다.'
                });
                break;
                
            case 'cancelled':
                // 취소됨: 삭제하고 재신청
                buttons.push({
                    action: 'delete-request',
                    label: '삭제하고 재신청',
                    icon: 'trash-2',
                    variant: 'outline-danger',
                    confirmation: true,
                    description: '취소된 신청을 삭제하고 새로 신청합니다.'
                });
                break;
                
            case 'completed':
                // 완료됨: 삭제 불가 (완료된 상태는 보존)
                buttons.push({
                    action: 'view-details',
                    label: '완료 상세',
                    icon: 'check-circle',
                    variant: 'outline-success',
                    description: '완료된 신청의 상세 정보를 확인합니다.'
                });
                break;
        }
        
        // 공통 버튼
        buttons.push({
            action: 'refresh-status',
            label: '상태 새로고침',
            icon: 'refresh-cw',
            variant: 'outline',
            description: '최신 신청 상태를 확인합니다.'
        });
        
        return buttons.map(button => `
            <button type="button" 
                    class="btn btn-${button.variant} ${button.action}-btn" 
                    data-action="${button.action}"
                    ${button.confirmation ? 'data-confirmation="true"' : ''}
                    title="${button.description || ''}">
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

    // 🚨 v1.1.0 대폭 수정: 완전삭제 로직 (deleteFlightRequest + 페이지 새로고침)
    async handleDeleteRequest() {
        console.log('🔄 [액션] 신청 완전삭제 요청...');
        
        try {
            // 확인 대화상자
            const currentStatus = this.currentRequest?.status || 'unknown';
            let confirmMessage = '';
            
            switch (currentStatus) {
                case 'pending':
                    confirmMessage = '정말로 검토 중인 항공권 신청을 완전삭제하시겠습니까?\\n\\n삭제된 신청은 복구할 수 없으며, 필요하시면 새로 신청해야 합니다.';
                    break;
                case 'rejected':
                    confirmMessage = '거부된 항공권 신청을 완전삭제하시겠습니까?\\n\\n삭제 후 새로운 신청을 진행할 수 있습니다.';
                    break;
                case 'cancelled':
                    confirmMessage = '취소된 항공권 신청을 완전삭제하시겠습니까?\\n\\n삭제 후 새로운 신청을 진행할 수 있습니다.';
                    break;
                default:
                    confirmMessage = '정말로 항공권 신청을 완전삭제하시겠습니까?\\n\\n삭제된 신청은 복구할 수 없습니다.';
            }
            
            const confirmed = confirm(confirmMessage);
            
            if (!confirmed) {
                console.log('ℹ️ [액션] 신청 삭제가 사용자에 의해 취소됨');
                return;
            }
            
            this.showLoading(true);
            
            // 🚨 v1.1.0: API를 통해 완전삭제 처리 (deleteFlightRequest 사용)
            if (this.api && typeof this.api.deleteFlightRequest === 'function') {
                const result = await this.api.deleteFlightRequest(this.currentRequest.id);
                
                if (!result.success) {
                    throw new Error(result.error || '신청 삭제에 실패했습니다.');
                }
                
                console.log('✅ [액션] 신청 완전삭제 성공 (deleteFlightRequest):', result);
                
                // 🚨 v1.1.0: 성공 메시지 표시 후 페이지 새로고침
                const statusMessage = currentStatus === 'rejected' ? '거부된 신청이 완전삭제되었습니다. 새로운 신청을 진행해주세요.' :
                                    currentStatus === 'cancelled' ? '취소된 신청이 완전삭제되었습니다. 새로운 신청을 진행해주세요.' :
                                    '항공권 신청이 완전삭제되었습니다.';
                
                this.showSuccess(statusMessage + ' 잠시 후 페이지가 새로고침됩니다.');
                
                // 1.5초 후 페이지 새로고침
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                throw new Error('API deleteFlightRequest 메서드를 찾을 수 없습니다');
            }
            
        } catch (error) {
            console.error('❌ [액션] 신청 삭제 실패:', error);
            this.showError('신청을 삭제할 수 없습니다.', error);
        } finally {
            this.showLoading(false);
        }
    }

    // 🆕 v1.1.0: 영수증 업로드 핸들러
    async handleUploadReceipt() {
        console.log('🔄 [파일업로드] 영수증 업로드 시작...');
        
        try {
            // 파일 선택 dialog
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.gif';
            input.style.display = 'none';
            
            const fileSelected = new Promise((resolve, reject) => {
                input.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        resolve(file);
                    } else {
                        reject(new Error('파일이 선택되지 않았습니다.'));
                    }
                });
                
                input.addEventListener('cancel', () => {
                    reject(new Error('파일 선택이 취소되었습니다.'));
                });
                
                setTimeout(() => {
                    reject(new Error('파일 선택 시간이 초과되었습니다.'));
                }, 60000); // 60초 타임아웃
            });
            
            // 파일 선택 dialog 열기
            document.body.appendChild(input);
            input.click();
            
            // 파일 선택 대기
            const file = await fileSelected;
            document.body.removeChild(input);
            
            console.log('📄 [파일업로드] 선택된 영수증 파일:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // 파일 크기 검증 (10MB 제한)
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
            }
            
            this.showLoading(true);
            
            // 파일 업로드
            const uploadResult = await this.uploadReceiptFile(file);
            
            // DB 업데이트
            const updateResult = await this.updateRequestWithReceiptUrl(uploadResult.url);
            
            // 현재 데이터 새로고침
            await this.loadCurrentRequest();
            this.renderStatus();
            
            this.showSuccess('영수증이 성공적으로 업로드되었습니다.');
            
        } catch (error) {
            console.error('❌ [파일업로드] 영수증 업로드 실패:', error);
            this.showError('영수증 업로드에 실패했습니다.', error);
        } finally {
            this.showLoading(false);
        }
    }

    // 🆕 v1.1.0: 항공권 업로드 핸들러
    async handleUploadTicket() {
        console.log('🔄 [파일업로드] 항공권 업로드 시작...');
        
        try {
            // 파일 선택 dialog
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.gif';
            input.style.display = 'none';
            
            const fileSelected = new Promise((resolve, reject) => {
                input.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        resolve(file);
                    } else {
                        reject(new Error('파일이 선택되지 않았습니다.'));
                    }
                });
                
                input.addEventListener('cancel', () => {
                    reject(new Error('파일 선택이 취소되었습니다.'));
                });
                
                setTimeout(() => {
                    reject(new Error('파일 선택 시간이 초과되었습니다.'));
                }, 60000); // 60초 타임아웃
            });
            
            // 파일 선택 dialog 열기
            document.body.appendChild(input);
            input.click();
            
            // 파일 선택 대기
            const file = await fileSelected;
            document.body.removeChild(input);
            
            console.log('🎫 [파일업로드] 선택된 항공권 파일:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // 파일 크기 검증 (10MB 제한)
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
            }
            
            this.showLoading(true);
            
            // 파일 업로드
            const uploadResult = await this.uploadTicketFile(file);
            
            // DB 업데이트
            const updateResult = await this.updateRequestWithTicketUrl(uploadResult.url);
            
            // 현재 데이터 새로고침
            await this.loadCurrentRequest();
            this.renderStatus();
            
            this.showSuccess('항공권이 성공적으로 업로드되었습니다.');
            
        } catch (error) {
            console.error('❌ [파일업로드] 항공권 업로드 실패:', error);
            this.showError('항공권 업로드에 실패했습니다.', error);
        } finally {
            this.showLoading(false);
        }
    }

    // 🆕 v1.1.0: 영수증 파일 업로드 유틸리티
    async uploadReceiptFile(file) {
        try {
            console.log('📤 [파일업로드] 영수증 파일 스토리지 업로드...');
            
            if (!this.api || typeof this.api.uploadFile !== 'function') {
                throw new Error('파일 업로드 API를 찾을 수 없습니다.');
            }
            
            // 파일명 생성 (사용자ID_timestamp_receipt.확장자)
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}_${timestamp}_receipt.${fileExtension}`;
            
            // Storage 업로드
            const uploadedUrl = await this.api.uploadFile('flight-tickets', fileName, file);

            if (!uploadedUrl || typeof uploadedUrl !== 'string') {
                throw new Error('파일 업로드에 실패했습니다.');
            }

            console.log('✅ [파일업로드] 항공권 파일 업로드 성공:', uploadedUrl);
            return {
                success: true,
                url: uploadedUrl
            };
            
        } catch (error) {
            console.error('❌ [파일업로드] 영수증 파일 업로드 실패:', error);
            throw error;
        }
    }

    // 🆕 v1.1.0: 항공권 파일 업로드 유틸리티
    async uploadTicketFile(file) {
        try {
            console.log('📤 [파일업로드] 항공권 파일 스토리지 업로드...');
            
            if (!this.api || typeof this.api.uploadFile !== 'function') {
                throw new Error('파일 업로드 API를 찾을 수 없습니다.');
            }
            
            // 파일명 생성 (사용자ID_timestamp_ticket.확장자)
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}_${timestamp}_ticket.${fileExtension}`;
            
            // Storage 업로드
            const uploadedUrl = await this.api.uploadFile('receipt-files', fileName, file);

            if (!uploadedUrl || typeof uploadedUrl !== 'string') {
                throw new Error('파일 업로드에 실패했습니다.');
            }

            console.log('✅ [파일업로드] 영수증 파일 업로드 성공:', uploadedUrl);
            return {
                success: true,
                url: uploadedUrl
            };
            
        } catch (error) {
            console.error('❌ [파일업로드] 항공권 파일 업로드 실패:', error);
            throw error;
        }
    }

    // 🆕 v1.1.0: 영수증 URL로 DB 업데이트
    async updateRequestWithReceiptUrl(receiptUrl) {
        try {
            console.log('💾 [DB업데이트] 영수증 URL 업데이트...');
            
            if (!this.api || typeof this.api.updateData !== 'function') {
                throw new Error('데이터 업데이트 API를 찾을 수 없습니다.');
            }
            
            const updatedData = await this.api.updateData('flight_requests', {
                receipt_url: receiptUrl,
                updated_at: new Date().toISOString()
            }, {
                id: this.currentRequest.id
            });

            if (!updatedData || !updatedData.id) {
                throw new Error('DB 업데이트에 실패했습니다.');
            }

            console.log('✅ [DB업데이트] 영수증 URL 업데이트 성공');
            return {
                success: true,
                data: updatedData
            };
            
        } catch (error) {
            console.error('❌ [DB업데이트] 영수증 URL 업데이트 실패:', error);
            throw error;
        }
    }

    // 🆕 v1.1.0: 항공권 URL로 DB 업데이트
    async updateRequestWithTicketUrl(ticketUrl) {
        try {
            console.log('💾 [DB업데이트] 항공권 URL 업데이트...');
            
            if (!this.api || typeof this.api.updateData !== 'function') {
                throw new Error('데이터 업데이트 API를 찾을 수 없습니다.');
            }
            
            const updatedData = await this.api.updateData('flight_requests', {
                ticket_url: ticketUrl,
                updated_at: new Date().toISOString()
            }, {
                id: this.currentRequest.id
            });

            if (!updatedData || !updatedData.id) {
                throw new Error('DB 업데이트에 실패했습니다.');
            }

            console.log('✅ [DB업데이트] 항공권 URL 업데이트 성공');
            return {
                success: true,
                data: updatedData
            };
            
        } catch (error) {
            console.error('❌ [DB업데이트] 항공권 URL 업데이트 실패:', error);
            throw error;
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
            
            if (confirm('세부사항을 콘솔에서 확인하시겠습니까?\\n\\n확인을 누르면 브라우저 개발자 도구의 콘솔에서 상세 정보를 볼 수 있습니다.')) {
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

    // 🚨 v1.1.0 수정: DB값 직접 사용으로 변경
    getStayDurationFromDB() {
        try {
            // DB에서 직접 가져온 값 사용
            return this.userProfile?.dispatch_duration || 0;
        } catch (error) {
            console.error('❌ [체류기간DB] 실패:', error);
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

    formatDetailedInfo() {
        return {
            request: this.currentRequest,
            userProfile: this.userProfile,
            currentUser: this.currentUser,
            lastUpdated: this.lastUpdated,
            module: 'FlightRequestStatus v1.1.0'
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

    getCurrentUser() {
        return this.currentUser;
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
            this.currentUser = null;
            this.isInitialized = false;
            
            console.log('✅ [정리] FlightRequestStatus 정리 완료');
            
        } catch (error) {
            console.error('❌ [정리] 실패:', error);
        }
    }
}

// 전역 스코프에 노출
window.FlightRequestStatus = FlightRequestStatus;

console.log('✅ FlightRequestStatus v1.1.0 모듈 로드 완료 - DB값 직접 사용 + 완전삭제 로직 + 직접구매 파일 업로드');
console.log('🚨 v1.1.0 주요 업데이트:', {
    dbDirectUsage: 'calculateActivityDays/calculateStayDuration 제거, DB값 직접 사용',
    completeDeleteLogic: 'cancelFlightRequest → deleteFlightRequest + 페이지 새로고침',
    directPurchaseFileUpload: '직접구매 시 영수증/항공권 파일 업로드 기능 추가',
    improvedDataAccuracy: 'DB값과 UI표시값 100% 일치',
    enhancedUserExperience: '완전삭제 후 자동 새로고침으로 자연스러운 UX'
});
console.log('🎯 FlightRequestStatus v1.1.0 핵심 기능:', {
    신청내역조회: '사용자의 현재 항공권 신청 상태 실시간 조회',
    상태별UI: 'pending/approved/rejected/cancelled/completed 상태별 맞춤 UI',
    진행상황표시: '신청 → 검토 → 결정 → 완료 단계별 시각적 타임라인',
    완전삭제액션: 'deleteFlightRequest + 페이지 새로고침으로 깔끔한 삭제 경험',
    파일업로드: '직접구매 시 영수증/항공권 파일 업로드 및 관리',
    실시간업데이트: 'API 이벤트 및 전역 이벤트를 통한 자동 상태 동기화',
    반응형디자인: '모바일/데스크톱 최적화된 카드 레이아웃',
    에러처리: '네트워크 오류, 데이터 없음 등 모든 예외 상황 처리',
    DB값정확성: 'actual_work_days, dispatch_duration DB값 직접 사용으로 정확성 보장'
});
console.log('📂 v1.1.0 새로운 파일 업로드 기능:', {
    지원파일형식: 'image/*, PDF 파일 (10MB 제한)',
    Storage버켓: 'receipt-files, flight-tickets',
    파일명규칙: '사용자ID_timestamp_타입.확장자',
    업로드API: 'uploadFile() 메서드 활용',
    DB업데이트: 'receipt_url, ticket_url 컬럼 자동 업데이트',
    실시간표시: '업로드 상태 및 다운로드 링크 즉시 반영'
});
console.log('🗑️ v1.1.0 개선된 삭제 로직:', {
    기존방식: 'cancelFlightRequest → status만 cancelled로 변경',
    새로운방식: 'deleteFlightRequest → DB에서 완전삭제 + 페이지 새로고침',
    사용자경험: '삭제 후 자동 새로고침으로 자연스러운 폼 표시',
    데이터정리: '불필요한 cancelled 상태 데이터 제거'
});
