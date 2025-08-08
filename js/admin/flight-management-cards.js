/**
 * 항공권 관리 카드 시스템 v10.0.0 - Phase 2 핵심 모듈
 * 동적 카드 렌더링, 그룹별 표시, 실시간 갱신 기능
 * 
 * 🎴 주요 기능:
 * - 동적 카드 렌더링 시스템
 * - 대리구매/직접구매 그룹 분리 표시
 * - 상태별 버튼 시스템 (승인/반려/완료)
 * - 실시간 카드 갱신 및 애니메이션
 * - 카드 선택 및 일괄 처리 지원
 * - 필터링 및 검색 결과 반영
 * - 모바일 반응형 레이아웃
 * 
 * @version 10.0.0
 * @author 세종학당 개발팀
 * @created 2025-07-23
 */

class FlightManagementCards {
    constructor(flightManagementSystem) {
        console.log('🎴 FlightManagementCards v10.0.0 초기화 시작...');
        
        this.system = flightManagementSystem;
        this.isInitialized = false;
        
        // 🎨 카드 상태 관리
        this.cardStates = {
            selectedCards: new Set(),
            expandedCards: new Set(),
            animatingCards: new Set(),
            lastRenderedData: null,
            filterState: null
        };

        // 🎛️ 렌더링 설정
        this.renderConfig = {
            animationDuration: 300,
            batchSize: 20,
            virtualScrollThreshold: 100,
            debounceDelay: 150
        };

        // 🎯 이벤트 리스너 관리
        this.eventListeners = new Map();
        this.resizeObserver = null;

        // 📊 성능 메트릭
        this.metrics = {
            totalRenders: 0,
            lastRenderTime: 0,
            averageRenderTime: 0,
            cacheHits: 0
        };

        this.init();
    }

    /**
     * 🎯 카드 시스템 초기화
     */
    async init() {
        try {
            console.log('🚀 FlightManagementCards 초기화 중...');

            // DOM 요소 확인
            this.validateDOMElements();

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // 반응형 관찰자 설정
            this.setupResponsiveObserver();

            // 시스템 이벤트 구독
            this.subscribeToSystemEvents();
            
            window.cardSystem = this;
            
            this.isInitialized = true;
            console.log('✅ FlightManagementCards 초기화 완료');

        } catch (error) {
            console.error('❌ FlightManagementCards 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 🔍 DOM 요소 유효성 확인
     */
    validateDOMElements() {
        const requiredElements = [
            'requestsContainer',
            'agencyGroup',
            'agencyRequests', 
            'agencyCount',
            'directGroup',
            'directRequests',
            'directCount',
            'emptyState'
        ];

        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            throw new Error(`필수 DOM 요소 누락: ${missingElements.join(', ')}`);
        }

        console.log('✅ 모든 필수 DOM 요소 확인됨');
    }

    /**
     * 🎮 이벤트 리스너 설정
     */
    setupEventListeners() {
        console.log('🎮 카드 시스템 이벤트 리스너 설정 중...');

        // 카드 컨테이너 이벤트 위임
        const requestsContainer = document.getElementById('requestsContainer');
        if (requestsContainer) {
            requestsContainer.addEventListener('click', this.handleCardClick.bind(this));
            requestsContainer.addEventListener('change', this.handleCardCheckbox.bind(this));
        }

        // 키보드 네비게이션
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));

        console.log('✅ 카드 시스템 이벤트 리스너 설정 완료');
    }

    /**
     * 📱 반응형 관찰자 설정
     */
    setupResponsiveObserver() {
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(this.debounce(() => {
                this.handleResize();
            }, this.renderConfig.debounceDelay));

            const container = document.getElementById('requestsContainer');
            if (container) {
                this.resizeObserver.observe(container);
            }
        }
    }

    /**
     * 🔗 시스템 이벤트 구독
     */
    subscribeToSystemEvents() {
        if (!this.system) return;

        // 데이터 업데이트 이벤트
        this.system.on('data:requestsUpdated', (data) => {
            this.updateCards(data.requests);
        });

        this.system.on('data:refreshed', (data) => {
            this.updateCards(data.requests);
        });

        // 필터 변경 이벤트
        this.system.on('ui:filterChanged', () => {
            this.applyCurrentFilters();
        });

        console.log('✅ 시스템 이벤트 구독 완료');
    }

    /**
     * 🎴 메인 카드 업데이트 함수
     */
    async updateCards(requests) {
        if (!this.isInitialized || !requests) {
            console.warn('⚠️ 카드 시스템이 초기화되지 않았거나 데이터가 없음');
            return;
        }

        const startTime = performance.now();
        
        try {
            console.log('🎴 카드 업데이트 시작:', requests.length, '건');

            // 필터 적용
            const filteredRequests = this.applyCurrentFilters(requests);

            // 그룹별 분류
            const groupedRequests = this.groupRequestsByType(filteredRequests);

            // 카드 렌더링
            await this.renderAllGroups(groupedRequests);

            // 성능 메트릭 업데이트
            this.updateMetrics(startTime);

            console.log('✅ 카드 업데이트 완료');

        } catch (error) {
            console.error('❌ 카드 업데이트 실패:', error);
            this.showErrorMessage('카드 렌더링 중 오류가 발생했습니다');
        }
    }

    /**
     * 🎯 현재 필터 적용
     */
    applyCurrentFilters(requests = null) {
        const requestsData = requests || this.system.state.requestsData;
        const filters = this.system.state.activeFilters;

        let filtered = [...requestsData];

        // 상태 필터
        if (filters.status !== 'all') {
            filtered = filtered.filter(req => req.status === filters.status);
        }

        // 구매 타입 필터
        if (filters.purchaseType !== 'all') {
            filtered = filtered.filter(req => req.purchase_type === filters.purchaseType);
        }

        // 출국 임박 필터
        if (filters.status === 'urgent') {
            const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(req => {
                if (!req.departure_date) return false;
                return new Date(req.departure_date) <= twoWeeksFromNow;
            });
        }

        // 검색 쿼리 필터
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(req => {
                const user = req.user_profiles;
                return (
                    user.name?.toLowerCase().includes(query) ||
                    user.sejong_institute?.toLowerCase().includes(query) ||
                    req.departure_airport?.toLowerCase().includes(query) ||
                    req.arrival_airport?.toLowerCase().includes(query)
                );
            });
        }

        // 정렬 적용
        this.applySorting(filtered, filters.sortBy);

        return filtered;
    }

    /**
     * 📊 정렬 적용
     */
    applySorting(requests, sortBy) {
        const [field, direction] = sortBy.split('-');
        
        requests.sort((a, b) => {
            let valueA, valueB;

            switch (field) {
                case 'created_at':
                case 'departure_date':
                case 'return_date':
                    valueA = new Date(a[field]);
                    valueB = new Date(b[field]);
                    break;
                case 'name':
                    valueA = a.user_profiles.name;
                    valueB = b.user_profiles.name;
                    break;
                case 'ticket_price':
                    valueA = a.ticket_price || 0;
                    valueB = b.ticket_price || 0;
                    break;
                default:
                    valueA = a[field];
                    valueB = b[field];
            }

            if (direction === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
    }

    /**
     * 🔄 그룹별 분류
     */
    groupRequestsByType(requests) {
        const grouped = {
            agency: requests.filter(req => req.purchase_type === 'agency'),
            direct: requests.filter(req => req.purchase_type === 'direct')
        };

        // 우선순위 정렬 (구매대행 내에서 출국일 빠른 순)
        grouped.agency.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return new Date(a.departure_date) - new Date(b.departure_date);
        });

        console.log('📊 그룹별 분류 완료:', {
            agency: grouped.agency.length,
            direct: grouped.direct.length
        });

        return grouped;
    }

    /**
     * 🎨 모든 그룹 렌더링
     */
    async renderAllGroups(groupedRequests) {
        const { agency, direct } = groupedRequests;

        // 그룹 카운트 업데이트
        this.updateGroupCounts(agency.length, direct.length);

        // 구매대행 그룹 렌더링
        await this.renderGroup('agency', agency, {
            title: '구매대행 신청',
            icon: 'shopping-cart',
            priority: 'high'
        });

        // 직접구매 그룹 렌더링
        await this.renderGroup('direct', direct, {
            title: '직접구매 신청',
            icon: 'credit-card',
            priority: 'normal'
        });

        // 빈 상태 처리
        this.handleEmptyState(agency.length + direct.length === 0);
    }

    /**
     * 📊 그룹 카운트 업데이트
     */
    updateGroupCounts(agencyCount, directCount) {
        const agencyCountEl = document.getElementById('agencyCount');
        const directCountEl = document.getElementById('directCount');

        if (agencyCountEl) {
            this.animateNumber(agencyCountEl, agencyCount);
        }

        if (directCountEl) {
            this.animateNumber(directCountEl, directCount);
        }
    }

    /**
     * 🎴 개별 그룹 렌더링
     */
    async renderGroup(groupType, requests, groupConfig) {
        const groupElement = document.getElementById(`${groupType}Group`);
        const requestsElement = document.getElementById(`${groupType}Requests`);

        if (!groupElement || !requestsElement) {
            console.warn(`⚠️ ${groupType} 그룹 요소를 찾을 수 없음`);
            return;
        }

        // 그룹 표시/숨김 처리
        if (requests.length === 0) {
            groupElement.style.display = 'none';
            return;
        }

        groupElement.style.display = 'block';

        // 배치 렌더링으로 성능 최적화
        await this.batchRenderCards(requestsElement, requests);

        console.log(`✅ ${groupType} 그룹 렌더링 완료: ${requests.length}개 카드`);
    }

    /**
     * 🚀 배치 카드 렌더링 (성능 최적화)
     */
    async batchRenderCards(container, requests) {
        const batchSize = this.renderConfig.batchSize;
        const totalBatches = Math.ceil(requests.length / batchSize);

        // 컨테이너 초기화
        container.innerHTML = '';

        for (let i = 0; i < totalBatches; i++) {
            const startIndex = i * batchSize;
            const endIndex = Math.min(startIndex + batchSize, requests.length);
            const batch = requests.slice(startIndex, endIndex);

            // 배치 렌더링
            const batchFragment = document.createDocumentFragment();
            
            batch.forEach(request => {
                const cardElement = this.createCardElement(request);
                batchFragment.appendChild(cardElement);
            });

            container.appendChild(batchFragment);

            // 다음 프레임에서 계속 (UI 블로킹 방지)
            if (i < totalBatches - 1) {
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }

        // 아이콘 재생성
        this.refreshIcons();
    }

    /**
     * 🎴 개별 카드 요소 생성
     */
    createCardElement(request) {
        const card = document.createElement('div');
        card.className = `flight-request-card ${request.status}`;
        card.dataset.requestId = request.id;
        card.dataset.purchaseType = request.purchase_type;
        card.dataset.status = request.status;

        const user = request.user_profiles;
        const isSelected = this.cardStates.selectedCards.has(request.id);

        // 카드 HTML 생성
        card.innerHTML = this.generateCardHTML(request, user, isSelected);

        // 애니메이션 클래스 추가
        card.classList.add('card-enter');
        
        // 다음 프레임에서 애니메이션 시작
        requestAnimationFrame(() => {
            card.classList.remove('card-enter');
            card.classList.add('card-enter-active');
        });

        return card;
    }

    /**
     * 🎨 카드 HTML 생성
     */
    generateCardHTML(request, user, isSelected) {
        const statusClass = this.getStatusClass(request.status);
        const statusText = this.getStatusText(request.status);
        const purchaseTypeText = request.purchase_type === 'direct' ? '직접구매' : '구매대행';
        
        // 출국까지 남은 일수 계산
        const daysUntilDeparture = this.calculateDaysUntilDeparture(request.departure_date);
        const isUrgent = daysUntilDeparture <= 14;

        // 활동일 정보
        const workDaysInfo = this.formatWorkDaysInfo(user);

        // 가격 정보
        const priceInfo = this.formatPriceInfo(request);

        return `
            <div class="card-header">
                <div class="student-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <input type="checkbox" 
                               class="card-checkbox" 
                               ${isSelected ? 'checked' : ''}
                               data-request-id="${request.id}">
                        <h3>${this.escapeHtml(user.name)}</h3>
                        ${isUrgent ? '<span class="urgent-badge">출국임박</span>' : ''}
                    </div>
                    <div class="student-details">
                        <div>${this.escapeHtml(user.sejong_institute || '학당 미설정')}</div>
                        <div>전공: ${this.escapeHtml(user.field || '미설정')}</div>
                        <div>구매방식: ${purchaseTypeText}</div>
                    </div>
                </div>
                <div class="card-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <div class="card-date">${this.formatDate(request.created_at)}</div>
                    ${daysUntilDeparture !== null ? `<div class="card-date">D-${daysUntilDeparture}</div>` : ''}
                </div>
            </div>

            <div class="card-body">
                <!-- 항공편 정보 -->
                <div class="flight-details">
                    <div class="detail-item">
                        <div class="detail-label">출국일</div>
                        <div class="detail-value">${this.formatFullDate(request.departure_date)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">귀국일</div>
                        <div class="detail-value">${this.formatFullDate(request.return_date)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">출발공항</div>
                        <div class="detail-value">${this.escapeHtml(request.departure_airport || '-')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">도착공항</div>
                        <div class="detail-value">${this.escapeHtml(request.arrival_airport || '-')}</div>
                    </div>
                </div>

                <!-- 활동일 정보 -->
                ${workDaysInfo ? `
                <div class="activity-info">
                    <h4><i data-lucide="calendar-days" style="width: 16px; height: 16px;"></i> 활동 기간 정보</h4>
                    <div class="activity-details">
                        ${workDaysInfo}
                    </div>
                </div>
                ` : ''}

                <!-- 가격 정보 -->
                <div class="price-info">
                    <h4><i data-lucide="dollar-sign" style="width: 16px; height: 16px;"></i> 항공료 정보</h4>
                    <div class="price-grid">
                        ${priceInfo}
                    </div>
                </div>
                                
                <!-- 🆕 관리자 코멘트 섹션 추가 -->
                ${this.generateCommentSection(request)}
                
            </div>

            <!-- 카드 액션 버튼들 -->
            <div class="card-actions">
                ${this.generateActionButtons(request)}
            </div>

            ${request.rejection_reason ? `
            <div class="rejection-reason">
                <i data-lucide="alert-triangle" style="width: 16px; height: 16px;"></i>
                <strong>반려 사유:</strong> ${this.escapeHtml(request.rejection_reason)}
            </div>
            ` : ''}
        `;
    }

    /**
     * 🔘 액션 버튼 생성
     */
    generateActionButtons(request) {
        const buttons = [];

        // 공통 버튼들
        buttons.push(`
            <button class="action-btn primary" data-action="view" data-request-id="${request.id}">
                <i data-lucide="eye"></i>
                상세보기
            </button>
        `);

        // 상태별 버튼들
        switch (request.status) {
            case 'pending':
                buttons.push(`
                    <button class="action-btn success" data-action="approve" data-request-id="${request.id}">
                        <i data-lucide="check"></i>
                        승인
                    </button>
                    <button class="action-btn danger" data-action="reject" data-request-id="${request.id}">
                        <i data-lucide="x"></i>
                        반려
                    </button>
                `);
                break;

        case 'approved':
            // 추가 수하물 버튼
            buttons.push(`
                <button class="action-btn warning" data-action="extra-baggage" data-request-id="${request.id}">
                    <i data-lucide="package-plus"></i>
                    추가 수하물
                </button>
            `);

            // 구매대행인 경우만 항공권 등록 버튼
            if (request.purchase_type === 'agency') {
                buttons.push(`
                    <button class="action-btn success" data-action="upload-ticket" data-request-id="${request.id}">
                        <i data-lucide="upload"></i>
                        항공권 등록
                    </button>
                `);
            }

            // 최종금액 입력 버튼
            buttons.push(`
                <button class="action-btn success" data-action="final-amount" data-request-id="${request.id}">
                    <i data-lucide="dollar-sign"></i>
                    최종금액 입력
                </button>
            `);
            break;
                
            case 'completed':
                // 🌟 특별 추가수하물 신청이 pending 상태일 때 우선 표시
                if (request.special_baggage_request_status === 'pending') {
                    buttons.push(`
                        <button class="action-btn warning" data-action="extra-baggage" data-request-id="${request.id}">
                            <i data-lucide="star"></i>
                            특별 수하물 신청
                        </button>
                    `);
                }
                // 🔵 일반 추가수하물 데이터가 있으면 일반 버튼 표시
                else {
                    const hasBaggageData = request.user_baggage_departure_receipt_url || 
                                          request.user_baggage_return_receipt_url ||
                                          request.admin_baggage_receipt_url ||
                                          request.baggage_type === 'user_allowed' ||
                                          request.baggage_type === 'admin_purchased' ||
                                          // 이미 처리된 특별 신청도 확인 가능하도록
                                          (request.special_baggage_request_status && 
                                           request.special_baggage_request_status !== 'none');

                    if (hasBaggageData) {
                        buttons.push(`
                            <button class="action-btn secondary" data-action="extra-baggage" data-request-id="${request.id}">
                                <i data-lucide="package-plus"></i>
                                추가수하물 확인
                            </button>
                        `);
                    }
                }           
                break;
        }

        // 여권 정보 버튼 (모든 상태에서)
        if (request.user_profiles.id) {
            buttons.push(`
                <button class="action-btn secondary" data-action="passport" data-request-id="${request.id}" data-user-id="${request.user_profiles.id}">
                    <i data-lucide="bookmark"></i>
                    여권정보
                </button>
            `);
        }

        return buttons.join('');
    }

    /**
     * 🗨️ 코멘트 섹션 생성
     */
    generateCommentSection(request) {
        const hasComment = request.admin_comment && request.admin_comment.trim();
        const commentId = `comment-${request.id}`;

        return `
            <div class="admin-comment-section">
                <h4><i data-lucide="message-circle" style="width: 16px; height: 16px;"></i> 관리자 코멘트</h4>

                <!-- 코멘트 표시 영역 -->
                <div class="comment-display" id="display-${commentId}" 
                     style="${hasComment ? 'display: block;' : 'display: none;'}">
                    <div class="comment-content">
                        ${hasComment ? this.escapeHtml(request.admin_comment) : ''}
                    </div>
                    <div class="comment-meta">
                        ${request.admin_comment_updated_at ? 
                            this.formatDate(request.admin_comment_updated_at) + ' 업데이트' : ''}
                        <button class="comment-edit-btn" onclick="window.cardSystem.editComment('${request.id}')" 
                                title="코멘트 편집">
                            <i data-lucide="edit-2"></i>
                        </button>
                    </div>
                </div>

                <!-- 코멘트 편집 영역 -->
                <div class="comment-edit" id="edit-${commentId}" 
                     style="${hasComment ? 'display: none;' : 'display: block;'}">
                    <div class="comment-input-container">
                        <textarea class="comment-input" 
                                  placeholder="예: 롯데카드로 결제, 좌석 업그레이드 요청됨, 수수료 5,000원 별도"
                                  maxlength="300"
                                  rows="3">${hasComment ? this.escapeHtml(request.admin_comment) : ''}</textarea>
                        <div class="comment-actions">
                            <button class="btn-save" onclick="window.cardSystem.saveComment('${request.id}')" 
                                    title="저장">
                                <i data-lucide="check"></i>
                                저장
                            </button>
                            <button class="btn-cancel" onclick="window.cardSystem.cancelComment('${request.id}')" 
                                    title="취소">
                                <i data-lucide="x"></i>
                                취소
                            </button>
                        </div>
                    </div>
                </div>

                ${!hasComment ? '<div class="comment-placeholder">코멘트를 추가하려면 텍스트를 입력하세요</div>' : ''}
            </div>
        `;
    }    
    
    /**
     * 🎮 카드 클릭 이벤트 처리
     */
    handleCardClick(event) {
        const button = event.target.closest('.action-btn');
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.action;
        const requestId = button.dataset.requestId;
        const userId = button.dataset.userId;

        console.log('🎮 카드 액션:', { action, requestId, userId });

        // 액션 처리
        this.executeCardAction(action, requestId, userId, button);
    }

    /**
     * ✅ 카드 체크박스 이벤트 처리
     */
    handleCardCheckbox(event) {
        if (!event.target.classList.contains('card-checkbox')) return;

        const requestId = event.target.dataset.requestId;
        const isChecked = event.target.checked;

        if (isChecked) {
            this.cardStates.selectedCards.add(requestId);
        } else {
            this.cardStates.selectedCards.delete(requestId);
        }

        // 전역 선택 상태 업데이트
        if (window.FlightManagementPage && window.FlightManagementPage.selectedRequests) {
            if (isChecked) {
                window.FlightManagementPage.selectedRequests.add(requestId);
            } else {
                window.FlightManagementPage.selectedRequests.delete(requestId);
            }

            // UI 업데이트
            if (window.FlightManagementPageUtils && window.FlightManagementPageUtils.updateSelectionUI) {
                window.FlightManagementPageUtils.updateSelectionUI();
            }
        }

        console.log('✅ 카드 선택 상태 변경:', { requestId, isChecked, totalSelected: this.cardStates.selectedCards.size });
    }

    /**
     * 🎯 카드 액션 실행
     */
    executeCardAction(action, requestId, userId, buttonElement) {
        // 버튼 로딩 상태 표시
        this.setButtonLoading(buttonElement, true);

        try {
            switch (action) {
                case 'view':
                    this.showRequestDetail(requestId);
                    break;
                case 'approve':
                    this.approveRequest(requestId);
                    break;
                case 'reject':
                    this.rejectRequest(requestId);
                    break;
                case 'upload-ticket':
                    this.handleDirectTicketUpload(requestId);
                    break;
                case 'view-receipt':
                    this.viewReceipt(requestId);
                    break;
                case 'final-amount':
                    this.inputFinalAmount(requestId);
                    break;
                case 'view-ticket':
                    this.viewTicket(requestId);
                    break;
                case 'passport':
                    this.showPassportInfo(userId);
                    break;
                case 'view-student-ticket':
                    this.viewStudentTicket(requestId);
                    break;    
                case 'extra-baggage':
                    this.showExtraBaggageModal(requestId);
                    break;
                    
                default:
                    console.warn('⚠️ 알 수 없는 액션:', action);
            }
        } catch (error) {
            console.error('❌ 카드 액션 실행 실패:', error);
            alert('작업 처리 중 오류가 발생했습니다: ' + error.message);
        } finally {
            // 버튼 로딩 상태 해제
            setTimeout(() => {
                this.setButtonLoading(buttonElement, false);
            }, 1000);
        }
    }

    /**
     * 🔄 버튼 로딩 상태 관리
     */
    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            const originalText = button.innerHTML;
            button.dataset.originalText = originalText;
            button.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> 처리중...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }

        // 아이콘 재생성
        this.refreshIcons();
    }

    /**
    * 👁️ 요청 상세보기
    */
    showRequestDetail(requestId) {
        console.log('👁️ 요청 상세보기:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showRequestDetailModal(requestId);
        } else {
            alert('모달 시스템이 초기화되지 않았습니다.');
        }
    }

    /**
     * ✅ 요청 승인
     */
    approveRequest(requestId) {
        console.log('✅ 요청 승인:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showApproveModal(requestId);
        } else {
            alert('모달 시스템이 초기화되지 않았습니다.');
        }
    }

    /**
     * ❌ 요청 반려
     */
    rejectRequest(requestId) {
        console.log('❌ 요청 반려:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showRejectModal(requestId);
        } else {
            alert('모달 시스템이 초기화되지 않았습니다.');
        }
    }

    /**
     * 🔄 flight-management-cards.js 업데이트 - 직접 항공권 업로드 기능
     * 모달 방식에서 직접 업로드 방식으로 변경
     */

    // ==========================================
    // 🔧 1. uploadTicket() 메서드 교체 (라인 약 730번)
    // ==========================================

    /**
     * 📤 직접 항공권 업로드 (모달 없이)
     */
    async handleDirectTicketUpload(requestId) {
        console.log('📤 직접 항공권 업로드 시작:', requestId);

        try {
            // 파일 입력 요소 생성
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*,.pdf';
            fileInput.style.display = 'none';

            // 파일 선택 이벤트 리스너
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    await this.processTicketUpload(requestId, file);
                }
                // 파일 입력 요소 제거
                document.body.removeChild(fileInput);
            });

            // 파일 선택 다이얼로그 열기
            document.body.appendChild(fileInput);
            fileInput.click();

        } catch (error) {
            console.error('❌ 직접 업로드 준비 실패:', error);
            this.showToast('파일 선택 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * 📁 파일 업로드 처리
     */
    async processTicketUpload(requestId, file) {
        try {
            // 파일 검증
            const validation = this.validateTicketFile(file);
            if (!validation.isValid) {
                this.showToast(validation.message, 'error');
                return;
            }

            // 업로드 진행 상태 표시
            this.showToast('항공권을 업로드하는 중...', 'info');

            // Supabase에 파일 업로드
            const uploadResult = await this.uploadTicketToSupabase(file, requestId);

            if (uploadResult.success) {
                // 데이터베이스 업데이트
                await this.updateTicketRecord(requestId, uploadResult.fileUrl);

                // 성공 알림
                this.showToast('항공권이 등록되었습니다.', 'success');

                // 카드 데이터 새로고침
                if (this.system) {
                    this.system.refreshData(false);
                }
            } else {
                this.showToast('업로드에 실패했습니다: ' + uploadResult.message, 'error');
            }

        } catch (error) {
            console.error('❌ 파일 업로드 처리 실패:', error);
            this.showToast('업로드 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * 🔍 파일 검증
     */
    validateTicketFile(file) {
        // 파일 크기 검증 (10MB 제한)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return {
                isValid: false,
                message: '파일 크기는 10MB 이하여야 합니다.'
            };
        }

        // 파일 형식 검증
        const allowedTypes = [
            'image/jpeg', 
            'image/jpg', 
            'image/png', 
            'image/gif',
            'image/webp',
            'application/pdf'
        ];

        if (!allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                message: 'JPG, PNG, GIF, WEBP, PDF 파일만 업로드할 수 있습니다.'
            };
        }

        // 파일명 검증
        if (!file.name || file.name.length > 255) {
            return {
                isValid: false,
                message: '올바른 파일명이 필요합니다.'
            };
        }

        return {
            isValid: true,
            message: '검증 통과'
        };
    }

    /**
     * ☁️ Supabase 파일 업로드
     */
    async uploadTicketToSupabase(file, requestId) {
        try {
            if (!this.system?.modules?.api) {
                throw new Error('API 모듈이 초기화되지 않았습니다.');
            }
            const supabase = this.system.modules.api.checkSupabaseInstance();

            // 파일명 생성 (덮어쓰기 지원)
            const fileExtension = file.name.split('.').pop();
            const fileName = `admin_ticket_${requestId}.${fileExtension}`;

            // Supabase Storage에 업로드 (upsert: true로 덮어쓰기)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('flight-tickets')  // ✅ 올바른 버킷명
                .upload(fileName, file, { 
                    upsert: true,
                    contentType: file.type
                });

            if (uploadError) {
                throw uploadError;
            }

            // 공개 URL 생성
            const { data: urlData } = supabase.storage
                .from('flight-tickets')  // ✅ 올바른 버킷명
                .getPublicUrl(fileName);

            return {
                success: true,
                fileUrl: urlData.publicUrl,
                fileName: fileName
            };
        } catch (error) {
            console.error('❌ Supabase 업로드 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 💾 데이터베이스 항공권 레코드 업데이트
     */
    async updateTicketRecord(requestId, fileUrl) {
        try {
            if (!this.system?.modules?.api) {
                throw new Error('API 모듈이 초기화되지 않았습니다.');
            }

            const supabase = this.system.modules.api.checkSupabaseInstance();

            // flight_requests 테이블 업데이트
            const updateData = {
                admin_ticket_url: fileUrl,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            console.log('✅ 항공권 레코드 업데이트 완료:', requestId);
            return data;

        } catch (error) {
            console.error('❌ 데이터베이스 업데이트 실패:', error);
            throw error;
        }
    }

    /**
     * 🧾 영수증 보기
     */
    viewReceipt(requestId) {
        console.log('🧾 영수증 보기:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showReceiptViewModal(requestId);
        } else {
            alert('영수증 보기 모달이 구현되지 않았습니다.');
        }
    }

    /**
     * 💰 최종금액 입력
     */
    inputFinalAmount(requestId) {
        console.log('💰 최종금액 입력:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showFinalAmountModal(requestId);
        } else {
            alert('최종금액 입력 모달이 구현되지 않았습니다.');
        }
    }

    /**
     * 🎫 항공권 보기
     */
    viewTicket(requestId) {
        console.log('🎫 항공권 보기:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showTicketViewModal(requestId);
        } else {
            alert('항공권 보기 모달이 구현되지 않았습니다.');
        }
    }
    /**
     * 🎫 학생 등록 항공권 보기
     */
    viewStudentTicket(requestId) {
        console.log('🎫 학생 등록 항공권 보기:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showStudentTicketModal(requestId);
        } else {
            alert('모달 시스템이 초기화되지 않았습니다.');
        }
    }
    
    /**
     * 🧳 추가 수하물 관리
     */
    showExtraBaggageModal(requestId) {
        console.log('🧳 추가 수하물 관리:', requestId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showExtraBaggageModal(requestId);
        } else {
            alert('모달 시스템이 초기화되지 않았습니다.');
        }
    }
    
    /**
     * 🛂 여권정보 보기
     */
    showPassportInfo(userId) {
        console.log('🛂 여권정보 보기:', userId);
        if (this.system?.modules?.modals) {
            this.system.modules.modals.showPassportModal(userId);
        } else {
            alert('모달 시스템이 초기화되지 않았습니다.');
        }
    }

    /**
     * 🗨️ 코멘트 편집 시작
     */
    editComment(requestId) {
        const displayEl = document.getElementById(`display-comment-${requestId}`);
        const editEl = document.getElementById(`edit-comment-${requestId}`);

        if (displayEl && editEl) {
            displayEl.style.display = 'none';
            editEl.style.display = 'block';

            // 텍스트 영역에 포커스
            const textarea = editEl.querySelector('.comment-input');
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
        }
    }

    /**
     * 🗨️ 코멘트 저장
     */
    async saveComment(requestId) {
        const editEl = document.getElementById(`edit-comment-${requestId}`);
        const textarea = editEl?.querySelector('.comment-input');

        if (!textarea) return;

        const comment = textarea.value.trim();

        try {
            // 로딩 상태 표시
            const saveBtn = editEl.querySelector('.btn-save');
            if (saveBtn) {
                this.setButtonLoading(saveBtn, true);
            }

            // API 호출
            const result = await this.system.modules.api.updateAdminComment(requestId, comment);

            if (result.success) {
                // UI 업데이트
                this.updateCommentDisplay(requestId, comment);
                this.showToast('코멘트가 저장되었습니다.', 'success');

                // 카드 데이터 새로고침 (부분 업데이트)
                if (this.system) {
                    this.system.refreshData(false);
                }
            } else {
                this.showToast('코멘트 저장에 실패했습니다.', 'error');
            }

        } catch (error) {
            console.error('🗨️ 코멘트 저장 오류:', error);
            this.showToast('코멘트 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            // 로딩 상태 해제
            const saveBtn = editEl.querySelector('.btn-save');
            if (saveBtn) {
                this.setButtonLoading(saveBtn, false);
            }
        }
    }

    /**
     * 🗨️ 코멘트 편집 취소
     */
    cancelComment(requestId) {
        const displayEl = document.getElementById(`display-comment-${requestId}`);
        const editEl = document.getElementById(`edit-comment-${requestId}`);

        if (displayEl && editEl) {
            // 원래 값으로 복원
            const textarea = editEl.querySelector('.comment-input');
            const originalComment = displayEl.querySelector('.comment-content')?.textContent || '';
            if (textarea) {
                textarea.value = originalComment;
            }

            if (originalComment) {
                displayEl.style.display = 'block';
                editEl.style.display = 'none';
            } else {
                displayEl.style.display = 'none';
                editEl.style.display = 'block';
            }
        }
    }

    /**
     * 🗨️ 코멘트 화면 업데이트
     */
    updateCommentDisplay(requestId, comment) {
        const displayEl = document.getElementById(`display-comment-${requestId}`);
        const editEl = document.getElementById(`edit-comment-${requestId}`);

        if (comment.trim()) {
            // 코멘트가 있는 경우
            const contentEl = displayEl?.querySelector('.comment-content');
            const metaEl = displayEl?.querySelector('.comment-meta');

            if (contentEl) {
                contentEl.textContent = comment;
            }
            if (metaEl) {
                metaEl.innerHTML = `${this.formatDate(new Date().toISOString())} 업데이트 <button class="comment-edit-btn" onclick="window.cardSystem.editComment('${requestId}')" title="코멘트 편집"><i data-lucide="edit-2"></i></button>`;
            }

            if (displayEl) displayEl.style.display = 'block';
            if (editEl) editEl.style.display = 'none';
        } else {
            // 코멘트가 없는 경우
            if (displayEl) displayEl.style.display = 'none';
            if (editEl) editEl.style.display = 'block';
        }

        // 아이콘 재생성
        this.refreshIcons();
    }

    
    /**
     * ⌨️ 키보드 네비게이션
     */
    handleKeyboardNavigation(event) {
        // 모달이 열려있으면 키보드 네비게이션 무시
        if (document.querySelector('.modal-overlay.show')) {
            return;
        }

        // 입력 요소에서 발생한 이벤트는 무시
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        )) {
            return;
        }

        // Ctrl + A: 모든 카드 선택
        if (event.ctrlKey && event.key === 'a') {
            event.preventDefault();
            this.selectAllCards();
        }

        // Delete: 선택된 카드들 반려
        if (event.key === 'Delete' && this.cardStates.selectedCards.size > 0) {
            event.preventDefault();
            if (confirm(`선택된 ${this.cardStates.selectedCards.size}개 항목을 반려하시겠습니까?`)) {
                this.bulkRejectCards();
            }
        }
    }

    /**
     * ✅ 모든 카드 선택
     */
    selectAllCards() {
        // 현재 화면에 표시된 모든 카드의 체크박스 선택
        const checkboxes = document.querySelectorAll('.card-checkbox');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                const requestId = checkbox.dataset.requestId;
                this.cardStates.selectedCards.add(requestId);

                // 전역 선택 상태도 업데이트
                if (window.FlightManagementPage && window.FlightManagementPage.selectedRequests) {
                    window.FlightManagementPage.selectedRequests.add(requestId);
                }
            }
        });

        // UI 업데이트
        if (window.FlightManagementPageUtils && window.FlightManagementPageUtils.updateSelectionUI) {
            window.FlightManagementPageUtils.updateSelectionUI();
        }

        console.log('✅ 모든 카드 선택 완료:', this.cardStates.selectedCards.size);
    }

    /**
     * ❌ 선택된 카드들 일괄 반려
     */
    bulkRejectCards() {
        const selectedIds = Array.from(this.cardStates.selectedCards);
        if (selectedIds.length === 0) return;

        // 실제 구현은 모달 시스템을 통해 처리
        if (this.system?.modules?.modals) {
            // Phase 3에서 일괄 반려 모달 구현 예정
            console.log('🔄 일괄 반료 처리:', selectedIds);
            alert(`${selectedIds.length}개 항목의 일괄 반려 처리는 개별적으로 진행해주세요.`);
        } else {
            alert('모달 시스템이 초기화되지 않았습니다.');
        }
    }
    /**
     * 📐 화면 크기 변경 처리
     */
    handleResize() {
        // 반응형 그리드 재계산
        this.updateResponsiveGrid();
    }

    /**
     * 📱 반응형 그리드 업데이트
     */
    updateResponsiveGrid() {
        const containers = document.querySelectorAll('.requests-grid');
        containers.forEach(container => {
            const containerWidth = container.offsetWidth;
            const cardMinWidth = 400;
            const gap = 24;
            const columns = Math.floor((containerWidth + gap) / (cardMinWidth + gap));
            
            container.style.gridTemplateColumns = `repeat(${Math.max(1, columns)}, 1fr)`;
        });
    }

    /**
     * 🔢 숫자 애니메이션
     */
    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        if (currentValue === targetValue) return;

        const duration = 500;
        const steps = 30;
        const stepValue = (targetValue - currentValue) / steps;
        const stepDuration = duration / steps;

        let currentStep = 0;
        const timer = setInterval(() => {
            currentStep++;
            const newValue = Math.round(currentValue + (stepValue * currentStep));
            
            if (currentStep >= steps) {
                element.textContent = targetValue;
                clearInterval(timer);
            } else {
                element.textContent = newValue;
            }
        }, stepDuration);
    }

    /**
     * 📅 날짜 관련 유틸리티
     */
    calculateDaysUntilDeparture(departureDate) {
        if (!departureDate) return null;
        
        const departure = new Date(departureDate);
        const today = new Date();
        const diffTime = departure - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit'
        });
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
     * 💼 활동일 정보 포맷
     */
    formatWorkDaysInfo(user) {
        if (!user.actual_arrival_date || !user.actual_work_end_date) {
            return '<div>활동 기간 정보 없음</div>';
        }

        const arrival = this.formatFullDate(user.actual_arrival_date);
        const end = this.formatFullDate(user.actual_work_end_date);
        const workDays = user.actual_work_days || 0;

        return `
            <div>도착일: ${arrival}</div>
            <div>종료일: ${end}</div>
            <div>활동일: ${workDays}일</div>
        `;
    }

    /**
     * 💰 가격 정보 포맷
     */
    formatPriceInfo(request) {
        const studentPrice = this.formatPrice(request.ticket_price, request.currency);
        const adminPrice = request.admin_final_amount ? 
            this.formatPrice(request.admin_final_amount, request.admin_final_currency) : null;

        let html = `
            <div class="price-item">
                <span class="price-label">학생 제출</span>
                <span class="price-value">${studentPrice}</span>
            </div>
        `;

        if (adminPrice) {
            html += `
                <div class="price-item">
                    <span class="price-label">최종 금액</span>
                    <span class="price-value admin">${adminPrice}</span>
                </div>
            `;
        } else {
            html += `
                <div class="price-item">
                    <span class="price-label">최종 금액</span>
                    <span class="price-value" style="color: #a0aec0;">미입력</span>
                </div>
            `;
        }

        return html;
    }

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
     * 🎨 상태 관련 유틸리티
     */
    getStatusClass(status) {
        const classes = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected',
            'completed': 'completed'
        };
        return classes[status] || 'unknown';
    }

    getStatusText(status) {
        const texts = {
            'pending': '대기중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'completed': '완료'
        };
        return texts[status] || status;
    }

    /**
     * 🔒 보안 유틸리티
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    

    /**
     * 🍞 토스트 알림
     */
    showToast(message, type = 'info') {
        // 기존 토스트 제거
        const existingToast = document.querySelector('.card-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `card-toast card-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#3182ce'};
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 0.375rem;
            z-index: 1000;
            font-size: 0.875rem;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }    
    

    /**
     * 🎯 빈 상태 처리
     */
    handleEmptyState(isEmpty) {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = isEmpty ? 'block' : 'none';
        }
    }

    /**
     * 🔄 아이콘 새로고침
     */
    refreshIcons() {
        if (typeof lucide !== 'undefined') {
            requestAnimationFrame(() => {
                lucide.createIcons();
            });
        }
    }

    /**
     * ⚠️ 에러 메시지 표시
     */
    showErrorMessage(message) {
        console.error('❌ 카드 시스템 에러:', message);
        
        // 임시 에러 표시 (Phase 3에서 토스트로 개선)
        if (window.FlightManagementPageUtils && window.FlightManagementPageUtils.showRealTimeUpdate) {
            window.FlightManagementPageUtils.showRealTimeUpdate(`오류: ${message}`);
        }
    }

    /**
     * 📊 성능 메트릭 업데이트
     */
    updateMetrics(startTime) {
        const renderTime = performance.now() - startTime;
        this.metrics.totalRenders++;
        this.metrics.lastRenderTime = renderTime;
        this.metrics.averageRenderTime = 
            (this.metrics.averageRenderTime * (this.metrics.totalRenders - 1) + renderTime) / this.metrics.totalRenders;

        if (this.metrics.totalRenders % 10 === 0) {
            console.log('📊 카드 렌더링 성능:', {
                lastRender: `${renderTime.toFixed(2)}ms`,
                average: `${this.metrics.averageRenderTime.toFixed(2)}ms`,
                totalRenders: this.metrics.totalRenders
            });
        }
    }

    /**
     * 🔄 디바운스 유틸리티
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 🧹 정리 함수
     */
    destroy() {
        console.log('🧹 FlightManagementCards 정리 중...');

        // 이벤트 리스너 정리
        this.eventListeners.clear();

        // ResizeObserver 정리
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // 상태 초기화
        this.cardStates.selectedCards.clear();
        this.cardStates.expandedCards.clear();
        this.cardStates.animatingCards.clear();

        this.isInitialized = false;
        console.log('✅ FlightManagementCards 정리 완료');
    }

    /**
     * 📋 디버그 정보
     */
    getDebugInfo() {
        return {
            version: '10.0.0',
            isInitialized: this.isInitialized,
            selectedCards: this.cardStates.selectedCards.size,
            expandedCards: this.cardStates.expandedCards.size,
            metrics: this.metrics,
            renderConfig: this.renderConfig
        };
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.FlightManagementCards = FlightManagementCards;
    console.log('✅ FlightManagementCards v10.0.0 전역 등록 완료');
}

console.log('📦 FlightManagementCards v10.0.0 모듈 로드 완료 - Phase 2 카드 시스템');