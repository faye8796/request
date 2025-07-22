/**
 * 항공권 관리 시스템 핵심 모듈 v10.0.0
 * FlightManagementSystem 메인 클래스 및 조정자 패턴 구현
 * 
 * 🎯 Phase 1 핵심 개발 항목:
 * - FlightManagementSystem 메인 클래스
 * - 초기화 및 전역 상태 관리  
 * - 실시간 데이터 동기화 (30초 간격)
 * - 이벤트 조정자 패턴 구현
 * 
 * 🔧 의존성:
 * - SupabaseCore (v1.0.1+)
 * - FlightManagementAPI (v10.0.0+)
 * - StorageUtils
 * 
 * @version 10.0.0
 * @author 세종학당 개발팀
 * @created 2025-07-23
 */

class FlightManagementSystem {
    constructor() {
        console.log('🚀 FlightManagementSystem v10.0.0 초기화 시작...');
        
        // 🏗️ 핵심 상태 관리
        this.state = {
            isInitialized: false,
            isRealTimeEnabled: false,
            lastUpdate: null,
            requestsData: [],
            statistics: null,
            activeFilters: {
                status: 'all',
                purchaseType: 'all',
                searchQuery: '',
                sortBy: 'created_at-desc'
            },
            ui: {
                loadingStates: new Set(),
                modalsOpen: new Set(),
                notifications: []
            }
        };

        // 🔌 모듈 인스턴스들
        this.modules = {
            api: null,
            cards: null,
            modals: null,
            controls: null,
            statistics: null,
            ui: null
        };

        // ⚙️ 설정
        this.config = {
            realTimeInterval: 30000, // 30초
            autoRefreshEnabled: true,
            debugMode: true,
            retryAttempts: 3,
            timeoutMs: 10000
        };

        // 🎯 이벤트 리스너들
        this.eventListeners = new Map();
        this.realTimeTimer = null;

        // 초기화 시작
        this.init();
    }

    /**
     * 🎯 시스템 초기화
     */
    async init() {
        try {
            console.log('🔧 FlightManagementSystem 핵심 초기화 중...');

            // 1. 의존성 모듈 초기화 대기
            await this.waitForDependencies();

            // 2. API 모듈 연결
            await this.initializeAPI();

            // 3. 하위 모듈 초기화
            await this.initializeModules();

            // 4. 이벤트 시스템 설정
            this.setupEventSystem();

            // 5. 실시간 데이터 동기화 시작
            this.startRealTimeSync();

            // 6. 초기 데이터 로드
            await this.loadInitialData();

            this.state.isInitialized = true;
            this.state.lastUpdate = new Date();

            console.log('✅ FlightManagementSystem v10.0.0 초기화 완료!');
            this.emitEvent('system:initialized', { timestamp: this.state.lastUpdate });

        } catch (error) {
            console.error('❌ FlightManagementSystem 초기화 실패:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    /**
     * 🔍 의존성 모듈 대기
     */
    async waitForDependencies() {
        console.log('⏳ 의존성 모듈 대기 중...');

        const dependencies = [
            { name: 'SupabaseCore', path: 'window.SupabaseCore.supabase' },
            { name: 'StorageUtils', path: 'window.StorageUtils' },
            { name: 'FlightManagementAPI', path: 'window.FlightManagementAPI' }
        ];

        let waitCount = 0;
        const maxWait = 300; // 30초

        while (waitCount < maxWait) {
            let allReady = true;

            for (const dep of dependencies) {
                const exists = this.checkDependencyPath(dep.path);
                if (!exists) {
                    allReady = false;
                    break;
                }
            }

            if (allReady) {
                console.log('✅ 모든 의존성 모듈 준비 완료');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;

            // 5초마다 상태 로그
            if (waitCount % 50 === 0) {
                console.log(`⏳ 의존성 대기 중... (${waitCount / 10}초)`);
                this.logDependencyStatus(dependencies);
            }
        }

        // 타임아웃 시 상세 에러 정보
        console.error('❌ 의존성 모듈 대기 타임아웃');
        this.logDependencyStatus(dependencies);
        throw new Error('의존성 모듈 초기화 타임아웃 (30초)');
    }

    /**
     * 🔍 의존성 경로 확인
     */
    checkDependencyPath(path) {
        try {
            const parts = path.split('.');
            let current = window;
            
            for (const part of parts) {
                if (current && current[part] !== undefined) {
                    current = current[part];
                } else {
                    return false;
                }
            }
            
            return current !== undefined && current !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * 📊 의존성 상태 로깅
     */
    logDependencyStatus(dependencies) {
        console.log('🔍 의존성 상태 체크:');
        dependencies.forEach(dep => {
            const exists = this.checkDependencyPath(dep.path);
            console.log(`  ${exists ? '✅' : '❌'} ${dep.name}: ${dep.path}`);
        });
    }

    /**
     * 📡 API 모듈 초기화
     */
    async initializeAPI() {
        try {
            console.log('📡 FlightManagementAPI 연결 중...');

            if (window.FlightManagementAPI) {
                this.modules.api = new window.FlightManagementAPI();
                
                // API 초기화 대기
                let waitCount = 0;
                while (!this.modules.api.isInitialized && waitCount < 100) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waitCount++;
                }

                if (!this.modules.api.isInitialized) {
                    throw new Error('FlightManagementAPI 초기화 타임아웃');
                }

                console.log('✅ FlightManagementAPI 연결 완료');
            } else {
                throw new Error('FlightManagementAPI 클래스를 찾을 수 없습니다');
            }
        } catch (error) {
            console.error('❌ API 모듈 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 🔧 하위 모듈 초기화
     */
    async initializeModules() {
        console.log('🔧 하위 모듈들 초기화 중...');

        const moduleInitializers = [
            { name: 'cards', className: 'FlightManagementCards', required: false },
            { name: 'modals', className: 'FlightManagementModals', required: false },
            { name: 'controls', className: 'FlightManagementControls', required: false },
            { name: 'statistics', className: 'FlightManagementStatistics', required: false },
            { name: 'ui', className: 'FlightManagementUI', required: false }
        ];

        for (const module of moduleInitializers) {
            try {
                if (window[module.className]) {
                    this.modules[module.name] = new window[module.className](this);
                    console.log(`✅ ${module.name} 모듈 초기화 완료`);
                } else if (module.required) {
                    throw new Error(`필수 모듈 ${module.className}을 찾을 수 없습니다`);
                } else {
                    console.log(`⚠️ 선택적 모듈 ${module.className} 없음 (Phase 2/3에서 개발 예정)`);
                }
            } catch (error) {
                console.error(`❌ ${module.name} 모듈 초기화 실패:`, error);
                if (module.required) {
                    throw error;
                }
            }
        }

        console.log('✅ 하위 모듈 초기화 완료');
    }

    /**
     * 🎯 이벤트 시스템 설정
     */
    setupEventSystem() {
        console.log('🎯 이벤트 시스템 설정 중...');

        // DOM 이벤트 리스너 설정
        this.setupDOMEventListeners();

        // 커스텀 이벤트 채널 설정
        this.setupCustomEventChannels();

        console.log('✅ 이벤트 시스템 설정 완료');
    }

    /**
     * 🖱️ DOM 이벤트 리스너 설정
     */
    setupDOMEventListeners() {
        // 필터 버튼 이벤트
        document.addEventListener('click', (event) => {
            if (event.target.matches('.filter-btn')) {
                this.handleFilterChange(event.target);
            }
        });

        // 검색 입력 이벤트
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.handleSearchChange(event.target.value);
            });
        }

        // 정렬 선택 이벤트
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (event) => {
                this.handleSortChange(event.target.value);
            });
        }

        // 새로고침 버튼 (있다면)
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
    }

    /**
     * 📡 커스텀 이벤트 채널 설정
     */
    setupCustomEventChannels() {
        // 데이터 변경 이벤트
        this.on('data:requestsUpdated', (data) => {
            this.handleRequestsDataUpdate(data);
        });

        this.on('data:statisticsUpdated', (data) => {
            this.handleStatisticsUpdate(data);
        });

        // UI 상태 변경 이벤트
        this.on('ui:filterChanged', (filter) => {
            this.applyFilters();
        });

        this.on('ui:modalOpened', (modalId) => {
            this.state.ui.modalsOpen.add(modalId);
        });

        this.on('ui:modalClosed', (modalId) => {
            this.state.ui.modalsOpen.delete(modalId);
        });

        // 작업 완료 이벤트
        this.on('action:requestStatusChanged', (data) => {
            this.handleRequestStatusChange(data);
        });
    }

    /**
     * ⏰ 실시간 데이터 동기화 시작
     */
    startRealTimeSync() {
        if (!this.config.autoRefreshEnabled) {
            console.log('📴 자동 새로고침이 비활성화됨');
            return;
        }

        console.log(`⏰ 실시간 동기화 시작 (${this.config.realTimeInterval / 1000}초 간격)`);

        this.realTimeTimer = setInterval(async () => {
            try {
                if (this.state.ui.modalsOpen.size === 0) { // 모달이 열려있지 않을 때만 새로고침
                    await this.refreshData(false); // 조용한 새로고침
                }
            } catch (error) {
                console.error('⚠️ 실시간 동기화 오류:', error);
            }
        }, this.config.realTimeInterval);

        this.state.isRealTimeEnabled = true;
    }

    /**
     * 🛑 실시간 동기화 중지
     */
    stopRealTimeSync() {
        if (this.realTimeTimer) {
            clearInterval(this.realTimeTimer);
            this.realTimeTimer = null;
            this.state.isRealTimeEnabled = false;
            console.log('🛑 실시간 동기화 중지됨');
        }
    }

    /**
     * 📊 초기 데이터 로드
     */
    async loadInitialData() {
        console.log('📊 초기 데이터 로드 중...');

        try {
            // 통계 및 요청 목록 병렬 로드
            const [statistics, requests] = await Promise.all([
                this.modules.api.getStatistics(),
                this.modules.api.getAllRequests()
            ]);

            this.state.statistics = statistics;
            this.state.requestsData = requests;
            this.state.lastUpdate = new Date();

            // UI 업데이트
            this.updateStatisticsUI(statistics);
            this.updateRequestsUI(requests);

            console.log('✅ 초기 데이터 로드 완료:', {
                requestsCount: requests.length,
                statistics
            });

            this.emitEvent('data:initialLoaded', {
                statistics,
                requests,
                timestamp: this.state.lastUpdate
            });

        } catch (error) {
            console.error('❌ 초기 데이터 로드 실패:', error);
            this.showNotification('데이터 로드에 실패했습니다', 'error');
            throw error;
        }
    }

    /**
     * 🔄 데이터 새로고침
     */
    async refreshData(showNotification = true) {
        try {
            if (showNotification) {
                this.addLoadingState('refreshing');
                console.log('🔄 데이터 새로고침 중...');
            }

            const [statistics, requests] = await Promise.all([
                this.modules.api.getStatistics(),
                this.modules.api.getAllRequests()
            ]);

            // 데이터 변경 감지
            const hasChanges = this.detectDataChanges(statistics, requests);

            this.state.statistics = statistics;
            this.state.requestsData = requests;
            this.state.lastUpdate = new Date();

            // UI 업데이트
            this.updateStatisticsUI(statistics);
            this.updateRequestsUI(requests);

            if (showNotification && hasChanges) {
                this.showNotification('데이터가 업데이트되었습니다', 'success');
            }

            this.emitEvent('data:refreshed', {
                statistics,
                requests,
                hasChanges,
                timestamp: this.state.lastUpdate
            });

            if (showNotification) {
                console.log('✅ 데이터 새로고침 완료');
            }

        } catch (error) {
            console.error('❌ 데이터 새로고침 실패:', error);
            if (showNotification) {
                this.showNotification('데이터 새로고침에 실패했습니다', 'error');
            }
        } finally {
            this.removeLoadingState('refreshing');
        }
    }

    /**
     * 🔍 데이터 변경 감지
     */
    detectDataChanges(newStats, newRequests) {
        if (!this.state.statistics || !this.state.requestsData) {
            return true; // 초기 로드
        }

        // 통계 변경 체크
        const statsChanged = JSON.stringify(this.state.statistics) !== JSON.stringify(newStats);

        // 요청 건수 변경 체크
        const requestsCountChanged = this.state.requestsData.length !== newRequests.length;

        // 최근 업데이트 시간 체크 (최근 1분 내 업데이트된 항목 확인)
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const recentlyUpdated = newRequests.some(req => 
            new Date(req.updated_at) > oneMinuteAgo
        );

        return statsChanged || requestsCountChanged || recentlyUpdated;
    }

    /**
     * 📊 통계 UI 업데이트
     */
    updateStatisticsUI(statistics) {
        const statElements = {
            'stat-total': statistics.total,
            'stat-pending': statistics.pending,
            'stat-approved': statistics.approved,
            'stat-completed': statistics.completed,
            'stat-direct': statistics.direct,
            'stat-agency': statistics.agency
        };

        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // 숫자 애니메이션 효과
                this.animateNumber(element, parseInt(element.textContent) || 0, value);
            }
        });
    }

    /**
     * 🔢 숫자 애니메이션
     */
    animateNumber(element, start, end, duration = 500) {
        if (start === end) return;

        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.round(start + (end - start) * progress);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 📋 요청 목록 UI 업데이트
     */
    updateRequestsUI(requests) {
        // Phase 2에서 카드 시스템으로 구현 예정
        // 현재는 기본 테이블 업데이트
        if (this.modules.cards && this.modules.cards.updateCards) {
            this.modules.cards.updateCards(requests);
        } else {
            this.updateBasicTable(requests);
        }
    }

    /**
     * 📄 기본 테이블 업데이트 (임시, Phase 2에서 카드 시스템으로 대체)
     */
    updateBasicTable(requests) {
        const tbody = document.getElementById('requestsTableBody');
        if (!tbody) return;

        // 필터 적용
        const filteredRequests = this.applyCurrentFilters(requests);

        tbody.innerHTML = filteredRequests.map(request => {
            const user = request.user_profiles;
            const statusClass = this.getStatusClass(request.status);
            const purchaseTypeText = request.purchase_type === 'direct' ? '직접구매' : '구매대행';

            return `
                <tr>
                    <td>${this.formatDate(request.created_at)}</td>
                    <td>${user.name}</td>
                    <td>${user.sejong_institute || '-'}</td>
                    <td>${purchaseTypeText}</td>
                    <td>${this.formatDate(request.departure_date)}</td>
                    <td>${this.formatDate(request.return_date)}</td>
                    <td>${this.formatPrice(request.ticket_price, request.currency)}</td>
                    <td><span class="status-badge ${statusClass}">${this.getStatusText(request.status)}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-sm btn-primary" onclick="viewRequest('${request.id}')">
                                상세보기
                            </button>
                            ${request.status === 'pending' ? `
                                <button class="btn-sm btn-success" onclick="approveRequest('${request.id}')">
                                    승인
                                </button>
                                <button class="btn-sm btn-danger" onclick="rejectRequest('${request.id}')">
                                    반려
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * 🎯 현재 필터 적용
     */
    applyCurrentFilters(requests) {
        let filtered = [...requests];

        // 상태 필터
        if (this.state.activeFilters.status !== 'all') {
            filtered = filtered.filter(req => req.status === this.state.activeFilters.status);
        }

        // 구매 타입 필터
        if (this.state.activeFilters.purchaseType !== 'all') {
            filtered = filtered.filter(req => req.purchase_type === this.state.activeFilters.purchaseType);
        }

        // 검색 쿼리 필터
        if (this.state.activeFilters.searchQuery) {
            const query = this.state.activeFilters.searchQuery.toLowerCase();
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
        this.applySorting(filtered);

        return filtered;
    }

    /**
     * 📊 정렬 적용
     */
    applySorting(requests) {
        const [field, direction] = this.state.activeFilters.sortBy.split('-');
        
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
     * 🎨 유틸리티 메서드들
     */
    getStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'rejected': 'status-rejected',
            'completed': 'status-completed'
        };
        return classes[status] || 'status-unknown';
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

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit'
        });
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
     * 🎯 이벤트 핸들러들
     */
    handleFilterChange(button) {
        const filter = button.dataset.filter;
        
        // 필터 버튼 활성화 상태 변경
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // 필터 상태 업데이트
        if (['direct', 'agency'].includes(filter)) {
            this.state.activeFilters.purchaseType = filter;
        } else if (filter === 'all') {
            this.state.activeFilters.status = 'all';
            this.state.activeFilters.purchaseType = 'all';
        } else {
            this.state.activeFilters.status = filter;
        }

        this.emitEvent('ui:filterChanged', this.state.activeFilters);
    }

    handleSearchChange(query) {
        this.state.activeFilters.searchQuery = query;
        this.emitEvent('ui:filterChanged', this.state.activeFilters);
    }

    handleSortChange(sortBy) {
        this.state.activeFilters.sortBy = sortBy;
        this.emitEvent('ui:filterChanged', this.state.activeFilters);
    }

    handleRequestsDataUpdate(data) {
        this.state.requestsData = data.requests;
        this.updateRequestsUI(data.requests);
    }

    handleStatisticsUpdate(data) {
        this.state.statistics = data.statistics;
        this.updateStatisticsUI(data.statistics);
    }

    handleRequestStatusChange(data) {
        // 해당 요청의 상태 업데이트
        const requestIndex = this.state.requestsData.findIndex(req => req.id === data.requestId);
        if (requestIndex !== -1) {
            this.state.requestsData[requestIndex].status = data.newStatus;
            this.state.requestsData[requestIndex].updated_at = new Date().toISOString();
            
            // UI 업데이트
            this.updateRequestsUI(this.state.requestsData);
            
            // 통계 새로고침
            setTimeout(() => this.refreshData(false), 1000);
        }
    }

    applyFilters() {
        this.updateRequestsUI(this.state.requestsData);
    }

    /**
     * 🎯 이벤트 시스템
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    off(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emitEvent(eventName, data = null) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`이벤트 핸들러 오류 (${eventName}):`, error);
                }
            });
        }
    }

    /**
     * 🔄 로딩 상태 관리
     */
    addLoadingState(state) {
        this.state.ui.loadingStates.add(state);
        document.body.classList.add(`loading-${state}`);
    }

    removeLoadingState(state) {
        this.state.ui.loadingStates.delete(state);
        document.body.classList.remove(`loading-${state}`);
    }

    /**
     * 🔔 알림 시스템
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date()
        };

        this.state.ui.notifications.push(notification);

        // UI 알림 표시 (Phase 3에서 구현)
        if (this.modules.ui && this.modules.ui.showNotification) {
            this.modules.ui.showNotification(message, type, duration);
        } else {
            // 임시 콘솔 알림
            console.log(`🔔 [${type.toUpperCase()}] ${message}`);
        }

        // 자동 제거
        setTimeout(() => {
            const index = this.state.ui.notifications.findIndex(n => n.id === notification.id);
            if (index !== -1) {
                this.state.ui.notifications.splice(index, 1);
            }
        }, duration);
    }

    /**
     * ❌ 초기화 오류 처리
     */
    handleInitializationError(error) {
        console.error('🚨 FlightManagementSystem 초기화 치명적 오류:', error);
        
        // 오류 정보 표시
        const errorContainer = document.createElement('div');
        errorContainer.className = 'initialization-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h3>⚠️ 시스템 초기화 오류</h3>
                <p>항공권 관리 시스템을 초기화하는 중 오류가 발생했습니다.</p>
                <details>
                    <summary>오류 상세 정보</summary>
                    <pre>${error.stack || error.message}</pre>
                </details>
                <button onclick="location.reload()">페이지 새로고침</button>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }

    /**
     * 🔧 시스템 상태 및 정보
     */
    getSystemInfo() {
        return {
            version: '10.0.0',
            state: { ...this.state },
            config: { ...this.config },
            modules: Object.keys(this.modules).reduce((acc, key) => {
                acc[key] = !!this.modules[key];
                return acc;
            }, {}),
            eventListeners: Array.from(this.eventListeners.keys()),
            uptime: this.state.lastUpdate ? Date.now() - this.state.lastUpdate.getTime() : 0
        };
    }

    /**
     * 🔚 시스템 정리
     */
    destroy() {
        console.log('🔚 FlightManagementSystem 정리 중...');
        
        // 실시간 동기화 중지
        this.stopRealTimeSync();
        
        // 이벤트 리스너 정리
        this.eventListeners.clear();
        
        // 하위 모듈 정리
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        console.log('✅ FlightManagementSystem 정리 완료');
    }
}

// 전역 함수들 (임시, Phase 2/3에서 모듈화)
window.viewRequest = function(requestId) {
    console.log('상세보기:', requestId);
    // Phase 3에서 모달 시스템으로 구현
};

window.approveRequest = function(requestId) {
    console.log('승인:', requestId);
    // Phase 3에서 모달 시스템으로 구현
};

window.rejectRequest = function(requestId) {
    console.log('반려:', requestId);
    // Phase 3에서 모달 시스템으로 구현
};

// 전역 등록
if (typeof window !== 'undefined') {
    window.FlightManagementSystem = FlightManagementSystem;
    console.log('✅ FlightManagementSystem v10.0.0 전역 등록 완료');
}

console.log('📦 FlightManagementSystem v10.0.0 모듈 로드 완료 - Phase 1 핵심 시스템');