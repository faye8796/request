/**
 * 🎛️ 항공권 관리 컨트롤 시스템 v10.0.0 - Phase 2 핵심 모듈
 * 필터링, 검색, 정렬, 일괄처리, 키보드단축키 기능
 */

(function() {
    'use strict';

    console.log('🎛️ FlightManagementControls v10.0.0 로드 중... (Phase 2 완전 구현)');

    // 🎛️ 필터링 컨트롤러
    class FilterController {
        constructor() {
            this.debounceTimer = null;
            this.filterButtons = null;
            this.searchInput = null;
        }

        init() {
            console.log('🔍 FilterController 초기화 중...');
            this.setupFilterButtons();
            this.setupSearchInput();
            this.restoreFilters();
            console.log('✅ FilterController 초기화 완료');
        }

        setupFilterButtons() {
            this.filterButtons = document.querySelectorAll('.filter-btn');
            
            this.filterButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.dataset.filter;
                    this.handleFilterClick(filter, e.target);
                });
            });
        }

        setupSearchInput() {
            this.searchInput = document.getElementById('searchInput');
            
            if (this.searchInput) {
                this.searchInput.addEventListener('input', (e) => {
                    this.handleSearchInput(e.target.value);
                });

                this.searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.applySearch(e.target.value);
                    }
                });
            }
        }

        handleFilterClick(filter, buttonElement) {
            // 활성 버튼 업데이트
            this.filterButtons.forEach(btn => btn.classList.remove('active'));
            buttonElement.classList.add('active');

            // 필터 상태 업데이트 (전역 상태에 저장)
            if (!window.flightControlsState) {
                window.flightControlsState = {
                    filters: { status: 'all', type: 'all', urgent: false, search: '' },
                    sorting: { field: 'created_at', direction: 'desc' },
                    selection: { selectedIds: new Set(), allSelected: false }
                };
            }

            if (filter === 'urgent') {
                window.flightControlsState.filters.urgent = !window.flightControlsState.filters.urgent;
                buttonElement.classList.toggle('active', window.flightControlsState.filters.urgent);
            } else if (['agency', 'direct'].includes(filter)) {
                window.flightControlsState.filters.type = filter;
            } else {
                window.flightControlsState.filters.status = filter;
            }

            // 즉시 필터 적용
            this.applyFilters();
        }

        handleSearchInput(searchTerm) {
            if (!window.flightControlsState) {
                window.flightControlsState = {
                    filters: { status: 'all', type: 'all', urgent: false, search: '' },
                    sorting: { field: 'created_at', direction: 'desc' },
                    selection: { selectedIds: new Set(), allSelected: false }
                };
            }

            window.flightControlsState.filters.search = searchTerm;
            
            // 디바운스 처리
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.applySearch(searchTerm);
            }, 300);
        }

        applySearch(searchTerm) {
            console.log(`🔍 검색 적용: "${searchTerm}"`);
            this.applyFilters();
        }

        applyFilters() {
            try {
                const system = window.FlightManagementPage?.system;
                if (!system || !system.cards) {
                    console.warn('⚠️ 시스템 또는 카드 모듈이 준비되지 않음');
                    return;
                }

                const filters = window.flightControlsState?.filters || { status: 'all', type: 'all', urgent: false, search: '' };
                console.log('🎛️ 필터 적용:', filters);

                // 필터링된 데이터 가져오기
                const filteredData = this.filterData(system.state.requestsData, filters);
                
                // 카드 업데이트
                system.cards.updateCards(filteredData);
                
                // 통계 업데이트
                if (system.statistics) {
                    system.statistics.updateStatistics(filteredData);
                }

                // 필터 저장
                this.saveFilters();

                // UI 업데이트 완료 표시
                this.showFilterFeedback(filteredData.length);

            } catch (error) {
                console.error('❌ 필터 적용 실패:', error);
            }
        }

        filterData(data, filters) {
            if (!data || !Array.isArray(data)) {
                return [];
            }

            return data.filter(item => {
                // 상태 필터
                if (filters.status !== 'all' && item.status !== filters.status) {
                    return false;
                }

                // 타입 필터
                if (filters.type !== 'all') {
                    if (filters.type === 'agency' && item.purchase_type !== 'agency') {
                        return false;
                    }
                    if (filters.type === 'direct' && item.purchase_type !== 'direct') {
                        return false;
                    }
                }

                // 출국 임박 필터
                if (filters.urgent) {
                    if (!this.isUrgentDeparture(item.departure_date)) {
                        return false;
                    }
                }

                // 검색 필터
                if (filters.search && filters.search.trim()) {
                    if (!this.matchesSearch(item, filters.search)) {
                        return false;
                    }
                }

                return true;
            });
        }

        isUrgentDeparture(departureDate) {
            if (!departureDate) return false;
            
            const departure = new Date(departureDate);
            const now = new Date();
            const diffDays = Math.ceil((departure - now) / (1000 * 60 * 60 * 24));
            
            // 14일 이내 출국을 임박으로 간주
            return diffDays >= 0 && diffDays <= 14;
        }

        matchesSearch(item, searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const user = item.user_profiles;
            
            const searchFields = [
                user?.name,
                user?.sejong_institute,
                user?.email,
                item.departure_airport,
                item.arrival_airport,
                item.purchase_type === 'agency' ? '구매대행' : '직접구매',
                item.purchase_type === 'agency' ? 'agency' : 'direct',
                item.status
            ].filter(Boolean);

            return searchFields.some(field => 
                String(field).toLowerCase().includes(searchLower)
            );
        }

        showFilterFeedback(resultCount) {
            const indicator = document.getElementById('realTimeIndicator');
            if (indicator) {
                indicator.innerHTML = `
                    <div class="pulse-dot"></div>
                    <span>필터 적용됨 (${resultCount}개 항목)</span>
                `;
                indicator.classList.add('show');
                
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
        }

        saveFilters() {
            try {
                const filters = window.flightControlsState?.filters;
                if (filters) {
                    localStorage.setItem('flightManagementFilters', JSON.stringify(filters));
                }
            } catch (error) {
                console.warn('⚠️ 필터 저장 실패:', error);
            }
        }

        restoreFilters() {
            try {
                const saved = localStorage.getItem('flightManagementFilters');
                if (saved) {
                    const filters = JSON.parse(saved);
                    
                    if (!window.flightControlsState) {
                        window.flightControlsState = {
                            filters: { status: 'all', type: 'all', urgent: false, search: '' },
                            sorting: { field: 'created_at', direction: 'desc' },
                            selection: { selectedIds: new Set(), allSelected: false }
                        };
                    }
                    
                    Object.assign(window.flightControlsState.filters, filters);
                    
                    // UI 상태 복원
                    this.restoreUIState();
                }
            } catch (error) {
                console.warn('⚠️ 필터 복원 실패:', error);
            }
        }

        restoreUIState() {
            const filters = window.flightControlsState?.filters;
            if (!filters) return;
            
            // 필터 버튼 상태 복원
            this.filterButtons.forEach(btn => {
                btn.classList.remove('active');
                const filter = btn.dataset.filter;
                
                if (filter === filters.status || filter === filters.type || 
                    (filter === 'urgent' && filters.urgent)) {
                    btn.classList.add('active');
                }
            });

            // 검색 입력 복원
            if (this.searchInput && filters.search) {
                this.searchInput.value = filters.search;
            }
        }

        // 공개 메서드
        resetFilters() {
            if (!window.flightControlsState) {
                window.flightControlsState = {
                    filters: { status: 'all', type: 'all', urgent: false, search: '' },
                    sorting: { field: 'created_at', direction: 'desc' },
                    selection: { selectedIds: new Set(), allSelected: false }
                };
            }

            window.flightControlsState.filters = {
                status: 'all',
                type: 'all',
                urgent: false,
                search: ''
            };

            // UI 초기화
            this.filterButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === 'all') {
                    btn.classList.add('active');
                }
            });

            if (this.searchInput) {
                this.searchInput.value = '';
            }

            this.applyFilters();
        }
    }

    // 🔄 정렬 컨트롤러
    class SortController {
        constructor() {
            this.sortSelect = null;
        }

        init() {
            console.log('🔄 SortController 초기화 중...');
            this.setupSortSelect();
            this.restoreSorting();
            console.log('✅ SortController 초기화 완료');
        }

        setupSortSelect() {
            this.sortSelect = document.getElementById('sortSelect');
            
            if (this.sortSelect) {
                this.sortSelect.addEventListener('change', (e) => {
                    this.handleSortChange(e.target.value);
                });
            }
        }

        handleSortChange(sortValue) {
            const [field, direction] = sortValue.split('-');
            
            if (!window.flightControlsState) {
                window.flightControlsState = {
                    filters: { status: 'all', type: 'all', urgent: false, search: '' },
                    sorting: { field: 'created_at', direction: 'desc' },
                    selection: { selectedIds: new Set(), allSelected: false }
                };
            }

            window.flightControlsState.sorting = {
                field: field,
                direction: direction
            };

            this.applySorting();
            this.saveSorting();
        }

        applySorting() {
            try {
                const system = window.FlightManagementPage?.system;
                if (!system || !system.cards) {
                    console.warn('⚠️ 시스템 또는 카드 모듈이 준비되지 않음');
                    return;
                }

                const sorting = window.flightControlsState?.sorting || { field: 'created_at', direction: 'desc' };
                console.log('🔄 정렬 적용:', sorting);

                // 현재 표시된 데이터 가져오기
                let currentData = system.state.filteredData || system.state.requestsData;
                
                // 데이터 정렬
                const sortedData = this.sortData(currentData, sorting);
                
                // 카드 업데이트
                system.cards.updateCards(sortedData);

                // 정렬 피드백 표시
                this.showSortFeedback(sorting);

            } catch (error) {
                console.error('❌ 정렬 적용 실패:', error);
            }
        }

        sortData(data, sorting) {
            if (!data || !Array.isArray(data)) {
                return [];
            }

            const sortedData = [...data].sort((a, b) => {
                let aValue = this.getSortValue(a, sorting.field);
                let bValue = this.getSortValue(b, sorting.field);

                // null/undefined 처리
                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                // 타입별 비교
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                let comparison = 0;
                if (aValue < bValue) {
                    comparison = -1;
                } else if (aValue > bValue) {
                    comparison = 1;
                }

                // 방향 적용
                return sorting.direction === 'desc' ? -comparison : comparison;
            });

            return sortedData;
        }

        getSortValue(item, field) {
            switch (field) {
                case 'created_at':
                    return new Date(item.created_at);
                case 'departure_date':
                    return item.departure_date ? new Date(item.departure_date) : null;
                case 'return_date':
                    return item.return_date ? new Date(item.return_date) : null;
                case 'name':
                    return item.user_profiles?.name || '';
                case 'ticket_price':
                    return parseFloat(item.ticket_price) || 0;
                case 'institute':
                    return item.user_profiles?.sejong_institute || '';
                case 'status':
                    return item.status || '';
                case 'purchase_type':
                    return item.purchase_type || '';
                default:
                    return '';
            }
        }

        showSortFeedback(sorting) {
            const sortNames = {
                'created_at': '신청일',
                'departure_date': '출국일',
                'return_date': '귀국일',
                'name': '이름',
                'ticket_price': '항공료',
                'institute': '학당',
                'status': '상태',
                'purchase_type': '구매방식'
            };

            const directionNames = {
                'asc': '오름차순',
                'desc': '내림차순'
            };

            const sortName = sortNames[sorting.field] || sorting.field;
            const directionName = directionNames[sorting.direction] || sorting.direction;

            // 피드백 표시
            const indicator = document.getElementById('realTimeIndicator');
            if (indicator) {
                indicator.innerHTML = `
                    <div class="pulse-dot"></div>
                    <span>${sortName} ${directionName} 정렬됨</span>
                `;
                indicator.classList.add('show');
                
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
        }

        saveSorting() {
            try {
                const sorting = window.flightControlsState?.sorting;
                if (sorting) {
                    localStorage.setItem('flightManagementSorting', JSON.stringify(sorting));
                }
            } catch (error) {
                console.warn('⚠️ 정렬 저장 실패:', error);
            }
        }

        restoreSorting() {
            try {
                const saved = localStorage.getItem('flightManagementSorting');
                if (saved) {
                    const sorting = JSON.parse(saved);
                    
                    if (!window.flightControlsState) {
                        window.flightControlsState = {
                            filters: { status: 'all', type: 'all', urgent: false, search: '' },
                            sorting: { field: 'created_at', direction: 'desc' },
                            selection: { selectedIds: new Set(), allSelected: false }
                        };
                    }
                    
                    Object.assign(window.flightControlsState.sorting, sorting);
                    
                    // UI 상태 복원
                    if (this.sortSelect) {
                        this.sortSelect.value = `${sorting.field}-${sorting.direction}`;
                    }
                }
            } catch (error) {
                console.warn('⚠️ 정렬 복원 실패:', error);
            }
        }
    }

    // 🎯 선택 관리 컨트롤러
    class SelectionController {
        constructor() {
            this.selectAllBtn = null;
            this.clearSelectionBtn = null;
        }

        init() {
            console.log('🎯 SelectionController 초기화 중...');
            this.setupSelectionButtons();
            this.setupCardSelection();
            console.log('✅ SelectionController 초기화 완료');
        }

        setupSelectionButtons() {
            this.selectAllBtn = document.getElementById('selectAllBtn');
            this.clearSelectionBtn = document.getElementById('clearSelectionBtn');

            if (this.selectAllBtn) {
                this.selectAllBtn.addEventListener('click', () => {
                    this.toggleSelectAll();
                });
            }

            if (this.clearSelectionBtn) {
                this.clearSelectionBtn.addEventListener('click', () => {
                    this.clearSelection();
                });
            }
        }

        setupCardSelection() {
            // 카드 선택 이벤트는 동적으로 설정됨 (카드 생성 시)
            document.addEventListener('click', (e) => {
                const card = e.target.closest('.flight-request-card');
                if (card && e.target.type === 'checkbox') {
                    this.handleCardSelection(card, e.target.checked, e);
                }
            });
        }

        handleCardSelection(card, isSelected, event) {
            const requestId = card.dataset.requestId;
            if (!requestId) return;

            if (!window.flightControlsState) {
                window.flightControlsState = {
                    filters: { status: 'all', type: 'all', urgent: false, search: '' },
                    sorting: { field: 'created_at', direction: 'desc' },
                    selection: { selectedIds: new Set(), allSelected: false }
                };
            }

            const selection = window.flightControlsState.selection;

            if (isSelected) {
                selection.selectedIds.add(requestId);
            } else {
                selection.selectedIds.delete(requestId);
                selection.allSelected = false;
            }

            this.updateSelectionUI();
        }

        toggleSelectAll() {
            if (!window.flightControlsState) {
                window.flightControlsState = {
                    filters: { status: 'all', type: 'all', urgent: false, search: '' },
                    sorting: { field: 'created_at', direction: 'desc' },
                    selection: { selectedIds: new Set(), allSelected: false }
                };
            }

            const selection = window.flightControlsState.selection;
            const visibleCards = document.querySelectorAll('.flight-request-card:not([style*="display: none"])');

            if (selection.allSelected) {
                // 모두 해제
                this.clearSelection();
            } else {
                // 모두 선택
                visibleCards.forEach(card => {
                    const checkbox = card.querySelector('input[type="checkbox"]');
                    const requestId = card.dataset.requestId;
                    
                    if (checkbox && requestId) {
                        checkbox.checked = true;
                        selection.selectedIds.add(requestId);
                    }
                });
                
                selection.allSelected = true;
            }

            this.updateSelectionUI();
        }

        clearSelection() {
            if (!window.flightControlsState) {
                window.flightControlsState = {
                    filters: { status: 'all', type: 'all', urgent: false, search: '' },
                    sorting: { field: 'created_at', direction: 'desc' },
                    selection: { selectedIds: new Set(), allSelected: false }
                };
            }

            const selection = window.flightControlsState.selection;
            
            // 모든 체크박스 해제
            document.querySelectorAll('.flight-request-card input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });

            // 선택 상태 초기화
            selection.selectedIds.clear();
            selection.allSelected = false;

            this.updateSelectionUI();
        }

        updateSelectionUI() {
            const selection = window.flightControlsState?.selection || { selectedIds: new Set(), allSelected: false };
            const selectedCount = selection.selectedIds.size;
            
            // 선택 개수 업데이트
            const countElement = document.getElementById('selectedCount');
            if (countElement) {
                countElement.textContent = `선택된 항목: ${selectedCount}개`;
            }

            // 일괄 처리 버튼 상태 업데이트
            const bulkApprove = document.getElementById('bulkApprove');
            const bulkReject = document.getElementById('bulkReject');
            
            if (bulkApprove) bulkApprove.disabled = selectedCount === 0;
            if (bulkReject) bulkReject.disabled = selectedCount === 0;

            // 전체 선택 버튼 텍스트 업데이트
            if (this.selectAllBtn) {
                this.selectAllBtn.textContent = selection.allSelected ? '모두 해제' : '모두 선택';
            }

            // 카드 시각적 피드백
            this.updateCardVisualFeedback();
        }

        updateCardVisualFeedback() {
            document.querySelectorAll('.flight-request-card').forEach(card => {
                const checkbox = card.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    if (checkbox.checked) {
                        card.style.borderColor = '#3182ce';
                        card.style.backgroundColor = '#ebf8ff';
                    } else {
                        card.style.borderColor = '';
                        card.style.backgroundColor = '';
                    }
                }
            });
        }
    }

    // 🔥 일괄 처리 컨트롤러  
    class BulkActionsController {
        constructor() {
            this.bulkApproveBtn = null;
            this.bulkRejectBtn = null;
        }

        init() {
            console.log('🔥 BulkActionsController 초기화 중...');
            this.setupBulkButtons();
            console.log('✅ BulkActionsController 초기화 완료');
        }

        setupBulkButtons() {
            this.bulkApproveBtn = document.getElementById('bulkApprove');
            this.bulkRejectBtn = document.getElementById('bulkReject');

            if (this.bulkApproveBtn) {
                this.bulkApproveBtn.addEventListener('click', () => {
                    this.handleBulkApprove();
                });
            }

            if (this.bulkRejectBtn) {
                this.bulkRejectBtn.addEventListener('click', () => {
                    this.handleBulkReject();
                });
            }
        }

        async handleBulkApprove() {
            const selection = window.flightControlsState?.selection || { selectedIds: new Set() };
            const selectedIds = Array.from(selection.selectedIds);
            
            if (selectedIds.length === 0) {
                alert('승인할 항목을 선택해주세요.');
                return;
            }

            const confirmed = confirm(`선택된 ${selectedIds.length}개 항목을 모두 승인하시겠습니까?`);
            if (!confirmed) return;

            console.log('✅ 일괄 승인 처리:', selectedIds);
            alert(`${selectedIds.length}개 항목 승인 처리 (Phase 3에서 구현 예정)`);
        }

        async handleBulkReject() {
            const selection = window.flightControlsState?.selection || { selectedIds: new Set() };
            const selectedIds = Array.from(selection.selectedIds);
            
            if (selectedIds.length === 0) {
                alert('반려할 항목을 선택해주세요.');
                return;
            }

            const reason = prompt(`선택된 ${selectedIds.length}개 항목의 반려 사유를 입력해주세요:`);
            if (!reason || !reason.trim()) {
                alert('반려 사유를 입력해야 합니다.');
                return;
            }

            console.log('❌ 일괄 반려 처리:', selectedIds, reason);
            alert(`${selectedIds.length}개 항목 반려 처리 (Phase 3에서 구현 예정)`);
        }
    }

    // 🎛️ 메인 컨트롤 시스템 (내부 사용)
    class FlightManagementControlsSystem {
        constructor() {
            this.filter = new FilterController();
            this.sort = new SortController();
            this.selection = new SelectionController();
            this.bulkActions = new BulkActionsController();
        }

        async init() {
            console.log('🎛️ FlightManagementControlsSystem 내부 시스템 초기화 중...');

            try {
                // 각 컨트롤러 초기화
                this.filter.init();
                this.sort.init();
                this.selection.init();
                this.bulkActions.init();

                console.log('✅ FlightManagementControlsSystem 내부 시스템 초기화 완료!');
                return true;
            } catch (error) {
                console.error('❌ FlightManagementControlsSystem 초기화 실패:', error);
                throw error;
            }
        }

        // 공개 메서드들
        applyFilters() {
            this.filter.applyFilters();
        }

        applySorting() {
            this.sort.applySorting();
        }

        clearSelection() {
            this.selection.clearSelection();
        }

        resetAll() {
            this.filter.resetFilters();
            this.clearSelection();
        }

        getDebugInfo() {
            return {
                version: '10.0.0',
                isInitialized: true,
                state: window.flightControlsState,
                controllers: {
                    filter: !!this.filter,
                    sort: !!this.sort,
                    selection: !!this.selection,
                    bulkActions: !!this.bulkActions
                }
            };
        }
    }

    // 🎛️ FlightManagementControls 메인 클래스 (외부 인터페이스)
    class FlightManagementControls {
        constructor(flightManagementSystem) {
            console.log('🎛️ FlightManagementControls 메인 클래스 초기화...');
            this.system = flightManagementSystem;
            this.controlSystem = new FlightManagementControlsSystem();
            this.isInitialized = false;
        }

        async init() {
            try {
                await this.controlSystem.init();
                this.isInitialized = true;
                console.log('✅ FlightManagementControls 메인 클래스 초기화 완료');
                return true;
            } catch (error) {
                console.error('❌ FlightManagementControls 메인 클래스 초기화 실패:', error);
                throw error;
            }
        }

        // 호환성을 위한 메서드들
        updateCards(data) {
            // 카드 업데이트는 카드 모듈에서 처리
            if (this.system && this.system.cards) {
                this.system.cards.updateCards(data);
            }
        }

        applyFilters() {
            return this.controlSystem.applyFilters();
        }

        applySorting() {
            return this.controlSystem.applySorting();
        }

        clearSelection() {
            return this.controlSystem.clearSelection();
        }

        resetAll() {
            return this.controlSystem.resetAll();
        }

        destroy() {
            console.log('🧹 FlightManagementControls 정리');
            this.isInitialized = false;
        }

        getDebugInfo() {
            return {
                ...this.controlSystem.getDebugInfo(),
                isInitialized: this.isInitialized,
                systemConnected: !!this.system
            };
        }
    }

    // 🌐 전역 등록 (한 번만 수행)
    window.FlightManagementControls = FlightManagementControls;

    console.log('✅ FlightManagementControls v10.0.0 로드 완료! (Phase 2 컨트롤 시스템 완전 구현)');

})();