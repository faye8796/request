/**
 * 항공권 관리 컨트롤 시스템 v10.0.0 - Phase 2 핵심 모듈
 * 필터링, 검색, 정렬, 일괄 처리 기능 관리
 * 
 * 🎛️ 주요 기능:
 * - 실시간 필터링 시스템 (상태별, 타입별, 출국임박)
 * - 고급 검색 기능 (이름, 학당, 공항, 다중 조건)
 * - 다중 정렬 옵션 (날짜, 금액, 이름 등)
 * - 일괄 선택 및 처리 (승인/반려)
 * - URL 기반 상태 저장 및 복원
 * - 사용자 선호도 저장
 * - 키보드 단축키 지원
 * 
 * @version 10.0.0
 * @author 세종학당 개발팀
 * @created 2025-07-23
 */

class FlightManagementControls {
    constructor(flightManagementSystem) {
        console.log('🎛️ FlightManagementControls v10.0.0 초기화 시작...');
        
        this.system = flightManagementSystem;
        this.isInitialized = false;

        // 🔍 필터 상태 관리
        this.filterState = {
            status: 'all',           // all, pending, approved, rejected, completed
            purchaseType: 'all',     // all, direct, agency
            searchQuery: '',         // 검색어
            sortBy: 'created_at-desc', // 정렬 기준
            urgent: false,           // 출국 임박 필터
            dateRange: null,         // 날짜 범위 필터
            priceRange: null         // 가격 범위 필터
        };

        // 🎯 선택 상태 관리
        this.selectionState = {
            selectedItems: new Set(),
            selectAll: false,
            lastSelectedIndex: -1,
            isSelectionMode: false
        };

        // 🎮 DOM 요소 참조
        this.domElements = {
            // 필터 버튼들
            filterButtons: null,
            
            // 검색 관련
            searchInput: null,
            searchIcon: null,
            searchClearBtn: null,
            
            // 정렬 관련
            sortSelect: null,
            
            // 일괄 처리 관련
            bulkApprove: null,
            bulkReject: null,
            selectAllBtn: null,
            clearSelectionBtn: null,
            selectedCount: null,
            
            // 고급 필터
            advancedFiltersToggle: null,
            advancedFiltersPanel: null
        };

        // ⚙️ 설정
        this.config = {
            searchDebounceDelay: 300,
            maxSelectedItems: 100,
            enableKeyboardShortcuts: true,
            saveUserPreferences: true,
            enableAdvancedFilters: true,
            enableURLState: true
        };

        // 📊 검색 히스토리 및 통계
        this.searchHistory = new Set();
        this.filterUsageStats = new Map();

        // 🔄 디바운스 타이머
        this.searchDebounceTimer = null;
        this.filterDebounceTimer = null;

        this.init();
    }

    /**
     * 🚀 컨트롤 시스템 초기화
     */
    async init() {
        try {
            console.log('🚀 FlightManagementControls 초기화 중...');

            // DOM 요소 참조 설정
            this.setupDOMReferences();

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // 시스템 이벤트 구독
            this.subscribeToSystemEvents();

            // 사용자 설정 복원
            await this.restoreUserPreferences();

            // URL 상태 복원
            this.restoreURLState();

            // 키보드 단축키 설정
            this.setupKeyboardShortcuts();

            this.isInitialized = true;
            console.log('✅ FlightManagementControls 초기화 완료');

        } catch (error) {
            console.error('❌ FlightManagementControls 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 🔗 DOM 요소 참조 설정
     */
    setupDOMReferences() {
        console.log('🔗 컨트롤 DOM 요소 참조 설정 중...');

        // 필터 버튼들
        this.domElements.filterButtons = document.querySelectorAll('.filter-btn');

        // 검색 관련
        this.domElements.searchInput = document.getElementById('searchInput');
        this.domElements.searchIcon = document.querySelector('.search-icon');

        // 정렬 관련
        this.domElements.sortSelect = document.getElementById('sortSelect');

        // 일괄 처리 관련
        this.domElements.bulkApprove = document.getElementById('bulkApprove');
        this.domElements.bulkReject = document.getElementById('bulkReject');
        this.domElements.selectAllBtn = document.getElementById('selectAllBtn');
        this.domElements.clearSelectionBtn = document.getElementById('clearSelectionBtn');
        this.domElements.selectedCount = document.getElementById('selectedCount');

        // 누락된 요소 확인
        const requiredElements = ['searchInput', 'sortSelect', 'selectedCount'];
        const missingElements = requiredElements.filter(key => !this.domElements[key]);

        if (missingElements.length > 0) {
            console.warn('⚠️ 일부 필수 DOM 요소 누락:', missingElements);
        }

        console.log('✅ 컨트롤 DOM 요소 참조 설정 완료');
    }

    /**
     * 🎮 이벤트 리스너 설정
     */
    setupEventListeners() {
        console.log('🎮 컨트롤 이벤트 리스너 설정 중...');

        // 필터 버튼 이벤트
        this.domElements.filterButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleFilterButtonClick(e));
        });

        // 검색 입력 이벤트
        if (this.domElements.searchInput) {
            this.domElements.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            this.domElements.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
            this.domElements.searchInput.addEventListener('focus', () => this.handleSearchFocus());
            this.domElements.searchInput.addEventListener('blur', () => this.handleSearchBlur());
        }

        // 정렬 선택 이벤트
        if (this.domElements.sortSelect) {
            this.domElements.sortSelect.addEventListener('change', (e) => this.handleSortChange(e));
        }

        // 일괄 처리 버튼 이벤트
        if (this.domElements.bulkApprove) {
            this.domElements.bulkApprove.addEventListener('click', () => this.handleBulkApprove());
        }

        if (this.domElements.bulkReject) {
            this.domElements.bulkReject.addEventListener('click', () => this.handleBulkReject());
        }

        if (this.domElements.selectAllBtn) {
            this.domElements.selectAllBtn.addEventListener('click', () => this.handleSelectAll());
        }

        if (this.domElements.clearSelectionBtn) {
            this.domElements.clearSelectionBtn.addEventListener('click', () => this.handleClearSelection());
        }

        console.log('✅ 컨트롤 이벤트 리스너 설정 완료');
    }

    /**
     * 📡 시스템 이벤트 구독
     */
    subscribeToSystemEvents() {
        if (!this.system) return;

        console.log('📡 시스템 이벤트 구독 중...');

        // 데이터 로드 이벤트
        this.system.on('data:initialLoaded', () => {
            this.updateControlStates();
        });

        this.system.on('data:refreshed', () => {
            this.updateControlStates();
        });

        // 선택 상태 변경 이벤트
        this.system.on('selection:changed', (data) => {
            this.handleSelectionChange(data);
        });

        console.log('✅ 시스템 이벤트 구독 완료');
    }

    /**
     * 🔘 필터 버튼 클릭 처리
     */
    handleFilterButtonClick(event) {
        event.preventDefault();
        
        const button = event.target.closest('.filter-btn');
        if (!button) return;

        const filter = button.dataset.filter;
        console.log('🔘 필터 버튼 클릭:', filter);

        // 필터 상태 업데이트
        this.updateFilterState(filter);

        // 버튼 활성화 상태 변경
        this.updateFilterButtonStates(button);

        // 필터 적용
        this.applyFilters();

        // 사용 통계 업데이트
        this.updateFilterUsageStats(filter);
    }

    /**
     * 📝 검색 입력 처리
     */
    handleSearchInput(event) {
        const searchQuery = event.target.value.trim();
        
        // 디바운스 적용
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        this.searchDebounceTimer = setTimeout(() => {
            this.executeSearch(searchQuery);
        }, this.config.searchDebounceDelay);

        // 실시간 UI 업데이트
        this.updateSearchUI(searchQuery);
    }

    /**
     * ⌨️ 검색 키다운 처리
     */
    handleSearchKeydown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.executeSearch(event.target.value.trim());
                break;
            case 'Escape':
                event.preventDefault();
                this.clearSearch();
                break;
            case 'ArrowDown':
                // 향후 자동완성 기능을 위한 확장점
                break;
        }
    }

    /**
     * 🎯 검색 포커스 처리
     */
    handleSearchFocus() {
        console.log('🎯 검색 입력 포커스');
        
        // 검색 박스 강조
        if (this.domElements.searchInput) {
            this.domElements.searchInput.parentElement.classList.add('search-focused');
        }
    }

    /**
     * 📤 검색 블러 처리
     */
    handleSearchBlur() {
        console.log('📤 검색 입력 블러');
        
        // 검색 박스 강조 해제
        if (this.domElements.searchInput) {
            this.domElements.searchInput.parentElement.classList.remove('search-focused');
        }
    }

    /**
     * 📊 정렬 변경 처리
     */
    handleSortChange(event) {
        const sortBy = event.target.value;
        console.log('📊 정렬 변경:', sortBy);

        this.filterState.sortBy = sortBy;
        this.applyFilters();
        this.saveUserPreferences();
        this.updateURLState();
    }

    /**
     * ✅ 일괄 승인 처리
     */
    handleBulkApprove() {
        const selectedItems = Array.from(this.selectionState.selectedItems);
        
        if (selectedItems.length === 0) {
            this.showNotification('승인할 항목을 선택해주세요.', 'warning');
            return;
        }

        console.log('✅ 일괄 승인 요청:', selectedItems.length, '건');

        // Phase 3에서 모달로 구현 예정
        const confirmMessage = `선택된 ${selectedItems.length}개 항목을 승인하시겠습니까?`;
        
        if (confirm(confirmMessage)) {
            this.executeBulkAction('approve', selectedItems);
        }
    }

    /**
     * ❌ 일괄 반려 처리
     */
    handleBulkReject() {
        const selectedItems = Array.from(this.selectionState.selectedItems);
        
        if (selectedItems.length === 0) {
            this.showNotification('반려할 항목을 선택해주세요.', 'warning');
            return;
        }

        console.log('❌ 일괄 반려 요청:', selectedItems.length, '건');

        // Phase 3에서 모달로 구현 예정
        const confirmMessage = `선택된 ${selectedItems.length}개 항목을 반려하시겠습니까?`;
        
        if (confirm(confirmMessage)) {
            this.executeBulkAction('reject', selectedItems);
        }
    }

    /**
     * 🔲 모두 선택 처리
     */
    handleSelectAll() {
        console.log('🔲 모두 선택/해제');

        const currentData = this.system.state.requestsData || [];
        const filteredData = this.getFilteredData(currentData);

        if (this.selectionState.selectAll) {
            // 전체 해제
            this.clearAllSelections();
        } else {
            // 전체 선택
            this.selectAllItems(filteredData);
        }

        this.updateSelectionUI();
    }

    /**
     * 🗑️ 선택 해제 처리
     */
    handleClearSelection() {
        console.log('🗑️ 선택 해제');
        this.clearAllSelections();
        this.updateSelectionUI();
    }

    /**
     * 🔍 검색 실행
     */
    executeSearch(searchQuery) {
        console.log('🔍 검색 실행:', searchQuery);

        this.filterState.searchQuery = searchQuery;
        
        // 검색 히스토리 추가
        if (searchQuery) {
            this.searchHistory.add(searchQuery);
            
            // 히스토리 크기 제한 (최대 50개)
            if (this.searchHistory.size > 50) {
                const firstItem = this.searchHistory.values().next().value;
                this.searchHistory.delete(firstItem);
            }
        }

        this.applyFilters();
        this.saveUserPreferences();
        this.updateURLState();
    }

    /**
     * 🧹 검색 초기화
     */
    clearSearch() {
        console.log('🧹 검색 초기화');

        if (this.domElements.searchInput) {
            this.domElements.searchInput.value = '';
        }

        this.filterState.searchQuery = '';
        this.applyFilters();
        this.updateSearchUI('');
    }

    /**
     * 🎛️ 필터 상태 업데이트
     */
    updateFilterState(filter) {
        // 필터 타입별 처리
        switch (filter) {
            case 'all':
                this.filterState.status = 'all';
                this.filterState.purchaseType = 'all';
                this.filterState.urgent = false;
                break;
                
            case 'pending':
            case 'approved':
            case 'rejected':
            case 'completed':
                this.filterState.status = filter;
                this.filterState.purchaseType = 'all';
                this.filterState.urgent = false;
                break;
                
            case 'direct':
            case 'agency':
                this.filterState.purchaseType = filter;
                this.filterState.status = 'all';
                this.filterState.urgent = false;
                break;
                
            case 'urgent':
                this.filterState.urgent = true;
                this.filterState.status = 'all';
                this.filterState.purchaseType = 'all';
                break;
        }

        console.log('🎛️ 필터 상태 업데이트:', this.filterState);
    }

    /**
     * 🔘 필터 버튼 상태 업데이트
     */
    updateFilterButtonStates(activeButton) {
        // 모든 필터 버튼 비활성화
        this.domElements.filterButtons.forEach(button => {
            button.classList.remove('active');
        });

        // 클릭된 버튼 활성화
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    /**
     * 🎯 필터 적용
     */
    applyFilters() {
        console.log('🎯 필터 적용 중...', this.filterState);

        // 시스템의 필터 상태 업데이트
        if (this.system && this.system.state) {
            this.system.state.activeFilters = { ...this.filterState };
        }

        // 필터 변경 이벤트 발생
        this.emitFilterChangeEvent();

        // 디바운스된 필터 적용
        if (this.filterDebounceTimer) {
            clearTimeout(this.filterDebounceTimer);
        }

        this.filterDebounceTimer = setTimeout(() => {
            this.executeFiltering();
        }, 100);
    }

    /**
     * 🔄 필터링 실행
     */
    executeFiltering() {
        try {
            const currentData = this.system.state.requestsData || [];
            const filteredData = this.getFilteredData(currentData);

            console.log('🔄 필터링 결과:', {
                original: currentData.length,
                filtered: filteredData.length,
                filters: this.filterState
            });

            // 카드 시스템에 필터링된 데이터 전달
            if (this.system.modules.cards) {
                this.system.modules.cards.updateCards(filteredData);
            }

            // 선택 상태 재설정 (필터링으로 인해 선택된 항목이 보이지 않을 수 있음)
            this.validateSelections(filteredData);

            // 빈 결과 처리
            this.handleEmptyResults(filteredData.length === 0);

        } catch (error) {
            console.error('❌ 필터링 실행 실패:', error);
        }
    }

    /**
     * 📊 필터링된 데이터 반환
     */
    getFilteredData(requests) {
        let filtered = [...requests];

        // 상태 필터
        if (this.filterState.status !== 'all') {
            filtered = filtered.filter(req => req.status === this.filterState.status);
        }

        // 구매 타입 필터
        if (this.filterState.purchaseType !== 'all') {
            filtered = filtered.filter(req => req.purchase_type === this.filterState.purchaseType);
        }

        // 출국 임박 필터
        if (this.filterState.urgent) {
            const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(req => {
                if (!req.departure_date) return false;
                return new Date(req.departure_date) <= twoWeeksFromNow &&
                       ['pending', 'approved'].includes(req.status);
            });
        }

        // 검색 쿼리 필터
        if (this.filterState.searchQuery) {
            filtered = this.applySearchFilter(filtered, this.filterState.searchQuery);
        }

        // 날짜 범위 필터
        if (this.filterState.dateRange) {
            filtered = this.applyDateRangeFilter(filtered, this.filterState.dateRange);
        }

        // 가격 범위 필터
        if (this.filterState.priceRange) {
            filtered = this.applyPriceRangeFilter(filtered, this.filterState.priceRange);
        }

        // 정렬 적용
        this.applySorting(filtered);

        return filtered;
    }

    /**
     * 🔍 검색 필터 적용
     */
    applySearchFilter(requests, searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchTerms = query.split(/\s+/).filter(term => term.length > 0);

        return requests.filter(req => {
            const user = req.user_profiles;
            const searchText = [
                user.name,
                user.sejong_institute,
                user.field,
                req.departure_airport,
                req.arrival_airport,
                req.purchase_type === 'direct' ? '직접구매' : '구매대행',
                this.getStatusText(req.status)
            ].filter(Boolean).join(' ').toLowerCase();

            // 모든 검색어가 포함되어야 함 (AND 검색)
            return searchTerms.every(term => searchText.includes(term));
        });
    }

    /**
     * 📅 날짜 범위 필터 적용
     */
    applyDateRangeFilter(requests, dateRange) {
        const { start, end } = dateRange;
        
        return requests.filter(req => {
            const createdDate = new Date(req.created_at);
            return (!start || createdDate >= start) && (!end || createdDate <= end);
        });
    }

    /**
     * 💰 가격 범위 필터 적용
     */
    applyPriceRangeFilter(requests, priceRange) {
        const { min, max } = priceRange;
        
        return requests.filter(req => {
            if (!req.ticket_price) return false;
            
            const priceKRW = this.convertToKRW(req.ticket_price, req.currency);
            return (!min || priceKRW >= min) && (!max || priceKRW <= max);
        });
    }

    /**
     * 📊 정렬 적용
     */
    applySorting(requests) {
        const [field, direction] = this.filterState.sortBy.split('-');
        
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
                    valueA = a.user_profiles.name || '';
                    valueB = b.user_profiles.name || '';
                    break;
                case 'ticket_price':
                    valueA = this.convertToKRW(a.ticket_price || 0, a.currency);
                    valueB = this.convertToKRW(b.ticket_price || 0, b.currency);
                    break;
                case 'institute':
                    valueA = a.user_profiles.sejong_institute || '';
                    valueB = b.user_profiles.sejong_institute || '';
                    break;
                default:
                    valueA = a[field] || '';
                    valueB = b[field] || '';
            }

            // 정렬 비교
            let comparison = 0;
            if (valueA < valueB) comparison = -1;
            else if (valueA > valueB) comparison = 1;

            return direction === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * 🔲 선택 관리
     */
    selectAllItems(items) {
        this.selectionState.selectedItems.clear();
        
        items.forEach(item => {
            this.selectionState.selectedItems.add(item.id);
        });

        this.selectionState.selectAll = true;
        this.selectionState.isSelectionMode = true;

        // 전역 선택 상태도 업데이트
        if (window.FlightManagementPage?.selectedRequests) {
            window.FlightManagementPage.selectedRequests.clear();
            items.forEach(item => {
                window.FlightManagementPage.selectedRequests.add(item.id);
            });
        }

        console.log('🔲 모든 항목 선택:', this.selectionState.selectedItems.size, '개');
    }

    clearAllSelections() {
        this.selectionState.selectedItems.clear();
        this.selectionState.selectAll = false;
        this.selectionState.isSelectionMode = false;

        // 전역 선택 상태도 초기화
        if (window.FlightManagementPage?.selectedRequests) {
            window.FlightManagementPage.selectedRequests.clear();
        }

        console.log('🗑️ 모든 선택 해제');
    }

    validateSelections(currentData) {
        const currentIds = new Set(currentData.map(item => item.id));
        const invalidSelections = [];

        this.selectionState.selectedItems.forEach(id => {
            if (!currentIds.has(id)) {
                invalidSelections.push(id);
            }
        });

        // 유효하지 않은 선택 제거
        invalidSelections.forEach(id => {
            this.selectionState.selectedItems.delete(id);
            if (window.FlightManagementPage?.selectedRequests) {
                window.FlightManagementPage.selectedRequests.delete(id);
            }
        });

        if (invalidSelections.length > 0) {
            console.log('🔍 유효하지 않은 선택 제거:', invalidSelections.length, '개');
        }
    }

    /**
     * 🎯 일괄 액션 실행
     */
    async executeBulkAction(action, itemIds) {
        console.log('🎯 일괄 액션 실행:', action, itemIds.length, '건');

        try {
            // 버튼 로딩 상태 표시
            this.setBulkActionsLoading(true);

            // Phase 3에서 실제 API 호출 구현 예정
            await this.simulateBulkAction(action, itemIds);

            // 성공 알림
            this.showNotification(`${itemIds.length}개 항목이 ${action === 'approve' ? '승인' : '반려'}되었습니다.`, 'success');

            // 선택 해제
            this.clearAllSelections();
            this.updateSelectionUI();

            // 데이터 새로고침
            if (this.system?.refreshData) {
                await this.system.refreshData(false);
            }

        } catch (error) {
            console.error('❌ 일괄 액션 실행 실패:', error);
            this.showNotification('일괄 처리 중 오류가 발생했습니다.', 'error');
        } finally {
            this.setBulkActionsLoading(false);
        }
    }

    /**
     * 🔄 일괄 액션 시뮬레이션 (Phase 3에서 실제 구현)
     */
    async simulateBulkAction(action, itemIds) {
        // 시뮬레이션 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`📝 ${action} 액션 시뮬레이션 완료:`, itemIds);
    }

    /**
     * 🎨 UI 업데이트 메서드들
     */
    updateSelectionUI() {
        const selectedCount = this.selectionState.selectedItems.size;
        
        // 선택된 항목 수 업데이트
        if (this.domElements.selectedCount) {
            this.domElements.selectedCount.textContent = `선택된 항목: ${selectedCount}개`;
        }

        // 일괄 처리 버튼 활성화/비활성화
        const hasSelection = selectedCount > 0;
        
        if (this.domElements.bulkApprove) {
            this.domElements.bulkApprove.disabled = !hasSelection;
        }
        
        if (this.domElements.bulkReject) {
            this.domElements.bulkReject.disabled = !hasSelection;
        }

        // 전체 선택 버튼 텍스트 업데이트
        if (this.domElements.selectAllBtn) {
            this.domElements.selectAllBtn.textContent = 
                this.selectionState.selectAll ? '전체 해제' : '모두 선택';
        }

        // 선택 모드 표시
        document.body.classList.toggle('selection-mode', this.selectionState.isSelectionMode);
    }

    updateSearchUI(searchQuery) {
        // 검색 클리어 버튼 표시/숨김
        if (this.domElements.searchClearBtn) {
            this.domElements.searchClearBtn.style.display = searchQuery ? 'block' : 'none';
        }

        // 검색 아이콘 상태 변경
        if (this.domElements.searchIcon) {
            this.domElements.searchIcon.classList.toggle('searching', !!searchQuery);
        }
    }

    updateControlStates() {
        // 데이터 변경시 컨트롤 상태 업데이트
        this.updateSelectionUI();
        
        // 필터 재적용 필요시
        if (this.isFilterActive()) {
            this.applyFilters();
        }
    }

    setBulkActionsLoading(isLoading) {
        const buttons = [this.domElements.bulkApprove, this.domElements.bulkReject];
        
        buttons.forEach(button => {
            if (!button) return;
            
            button.disabled = isLoading;
            
            if (isLoading) {
                button.classList.add('loading');
                const originalText = button.innerHTML;
                button.dataset.originalText = originalText;
                button.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> 처리중...';
            } else {
                button.classList.remove('loading');
                if (button.dataset.originalText) {
                    button.innerHTML = button.dataset.originalText;
                    delete button.dataset.originalText;
                }
            }
        });

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            requestAnimationFrame(() => lucide.createIcons());
        }
    }

    /**
     * ⌨️ 키보드 단축키 설정
     */
    setupKeyboardShortcuts() {
        if (!this.config.enableKeyboardShortcuts) return;

        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd 조합 단축키
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'f':
                        event.preventDefault();
                        this.focusSearchInput();
                        break;
                    case 'a':
                        event.preventDefault();
                        this.handleSelectAll();
                        break;
                    case 'r':
                        if (event.shiftKey) {
                            event.preventDefault();
                            this.clearAllFilters();
                        }
                        break;
                }
            }

            // 일반 단축키
            switch (event.key) {
                case 'Escape':
                    if (this.selectionState.isSelectionMode) {
                        this.clearAllSelections();
                        this.updateSelectionUI();
                    }
                    break;
                case 'Delete':
                    if (this.selectionState.selectedItems.size > 0) {
                        event.preventDefault();
                        this.handleBulkReject();
                    }
                    break;
            }
        });

        console.log('⌨️ 키보드 단축키 설정 완료');
    }

    /**
     * 💾 사용자 설정 저장/복원
     */
    async saveUserPreferences() {
        if (!this.config.saveUserPreferences) return;

        try {
            const preferences = {
                filterState: this.filterState,
                searchHistory: Array.from(this.searchHistory).slice(-10), // 최근 10개만
                lastSaved: new Date().toISOString()
            };

            localStorage.setItem('flightManagement_userPreferences', JSON.stringify(preferences));
            
        } catch (error) {
            console.warn('⚠️ 사용자 설정 저장 실패:', error);
        }
    }

    async restoreUserPreferences() {
        if (!this.config.saveUserPreferences) return;

        try {
            const saved = localStorage.getItem('flightManagement_userPreferences');
            if (!saved) return;

            const preferences = JSON.parse(saved);
            
            // 필터 상태 복원 (일부만)
            if (preferences.filterState) {
                this.filterState.sortBy = preferences.filterState.sortBy || this.filterState.sortBy;
            }

            // 검색 히스토리 복원
            if (preferences.searchHistory) {
                this.searchHistory = new Set(preferences.searchHistory);
            }

            console.log('💾 사용자 설정 복원 완료');

        } catch (error) {
            console.warn('⚠️ 사용자 설정 복원 실패:', error);
        }
    }

    /**
     * 🔗 URL 상태 관리
     */
    updateURLState() {
        if (!this.config.enableURLState) return;

        try {
            const url = new URL(window.location);
            const params = new URLSearchParams();

            // 활성 필터만 URL에 포함
            if (this.filterState.status !== 'all') {
                params.set('status', this.filterState.status);
            }
            
            if (this.filterState.purchaseType !== 'all') {
                params.set('type', this.filterState.purchaseType);
            }
            
            if (this.filterState.searchQuery) {
                params.set('q', this.filterState.searchQuery);
            }
            
            if (this.filterState.sortBy !== 'created_at-desc') {
                params.set('sort', this.filterState.sortBy);
            }
            
            if (this.filterState.urgent) {
                params.set('urgent', '1');
            }

            // URL 업데이트 (히스토리에 추가하지 않음)
            const newURL = params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname;
            window.history.replaceState(null, '', newURL);

        } catch (error) {
            console.warn('⚠️ URL 상태 업데이트 실패:', error);
        }
    }

    restoreURLState() {
        if (!this.config.enableURLState) return;

        try {
            const params = new URLSearchParams(window.location.search);

            // URL 파라미터에서 필터 상태 복원
            if (params.has('status')) {
                this.filterState.status = params.get('status');
            }
            
            if (params.has('type')) {
                this.filterState.purchaseType = params.get('type');
            }
            
            if (params.has('q')) {
                this.filterState.searchQuery = params.get('q');
                if (this.domElements.searchInput) {
                    this.domElements.searchInput.value = this.filterState.searchQuery;
                }
            }
            
            if (params.has('sort')) {
                this.filterState.sortBy = params.get('sort');
                if (this.domElements.sortSelect) {
                    this.domElements.sortSelect.value = this.filterState.sortBy;
                }
            }
            
            if (params.has('urgent')) {
                this.filterState.urgent = params.get('urgent') === '1';
            }

            // 복원된 상태에 맞게 UI 업데이트
            this.updateFilterButtonsFromState();

            console.log('🔗 URL 상태 복원 완료:', this.filterState);

        } catch (error) {
            console.warn('⚠️ URL 상태 복원 실패:', error);
        }
    }

    /**
     * 🔧 유틸리티 메서드들
     */
    focusSearchInput() {
        if (this.domElements.searchInput) {
            this.domElements.searchInput.focus();
            this.domElements.searchInput.select();
        }
    }

    clearAllFilters() {
        this.filterState = {
            status: 'all',
            purchaseType: 'all',
            searchQuery: '',
            sortBy: 'created_at-desc',
            urgent: false,
            dateRange: null,
            priceRange: null
        };

        // UI 리셋
        if (this.domElements.searchInput) {
            this.domElements.searchInput.value = '';
        }
        
        if (this.domElements.sortSelect) {
            this.domElements.sortSelect.value = 'created_at-desc';
        }

        this.updateFilterButtonsFromState();
        this.applyFilters();
        this.updateURLState();
        
        console.log('🧹 모든 필터 초기화');
    }

    updateFilterButtonsFromState() {
        // 상태에 맞게 필터 버튼 활성화
        this.domElements.filterButtons.forEach(button => {
            button.classList.remove('active');
            
            const filter = button.dataset.filter;
            let isActive = false;

            if (filter === 'all' && 
                this.filterState.status === 'all' && 
                this.filterState.purchaseType === 'all' && 
                !this.filterState.urgent) {
                isActive = true;
            } else if (filter === this.filterState.status || 
                       filter === this.filterState.purchaseType || 
                       (filter === 'urgent' && this.filterState.urgent)) {
                isActive = true;
            }

            if (isActive) {
                button.classList.add('active');
            }
        });
    }

    isFilterActive() {
        return this.filterState.status !== 'all' ||
               this.filterState.purchaseType !== 'all' ||
               this.filterState.searchQuery ||
               this.filterState.urgent ||
               this.filterState.dateRange ||
               this.filterState.priceRange;
    }

    handleEmptyResults(isEmpty) {
        // 빈 결과 상태 처리
        if (isEmpty && this.isFilterActive()) {
            this.showNotification('검색 조건에 맞는 결과가 없습니다.', 'info');
        }
    }

    emitFilterChangeEvent() {
        if (this.system) {
            this.system.emitEvent('ui:filterChanged', this.filterState);
        }
    }

    handleSelectionChange(data) {
        // 외부에서 선택 상태가 변경된 경우
        this.selectionState.selectedItems = new Set(data.selectedItems || []);
        this.updateSelectionUI();
    }

    updateFilterUsageStats(filter) {
        const count = this.filterUsageStats.get(filter) || 0;
        this.filterUsageStats.set(filter, count + 1);
    }

    /**
     * 🎨 도우미 메서드들
     */
    convertToKRW(amount, currency = 'KRW') {
        if (!amount) return 0;
        if (currency === 'KRW') return amount;

        const exchangeRates = {
            'USD': 1300, 'EUR': 1400, 'JPY': 8.5, 'CNY': 180, 'THB': 35
        };

        return Math.round(amount * (exchangeRates[currency] || 1));
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

    showNotification(message, type = 'info') {
        if (window.FlightManagementPageUtils?.showRealTimeUpdate) {
            window.FlightManagementPageUtils.showRealTimeUpdate(message);
        } else {
            console.log(`🔔 [${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * 🧹 정리 함수
     */
    destroy() {
        console.log('🧹 FlightManagementControls 정리 중...');

        // 타이머 정리
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        if (this.filterDebounceTimer) {
            clearTimeout(this.filterDebounceTimer);
        }

        // 선택 상태 초기화
        this.clearAllSelections();

        // 설정 저장
        this.saveUserPreferences();

        this.isInitialized = false;
        console.log('✅ FlightManagementControls 정리 완료');
    }

    /**
     * 📋 디버그 정보
     */
    getDebugInfo() {
        return {
            version: '10.0.0',
            isInitialized: this.isInitialized,
            filterState: this.filterState,
            selectionState: {
                selectedCount: this.selectionState.selectedItems.size,
                selectAll: this.selectionState.selectAll,
                isSelectionMode: this.selectionState.isSelectionMode
            },
            searchHistory: Array.from(this.searchHistory),
            filterUsageStats: Object.fromEntries(this.filterUsageStats),
            config: this.config
        };
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.FlightManagementControls = FlightManagementControls;
    console.log('✅ FlightManagementControls v10.0.0 전역 등록 완료');
}

console.log('📦 FlightManagementControls v10.0.0 모듈 로드 완료 - Phase 2 컨트롤 시스템');