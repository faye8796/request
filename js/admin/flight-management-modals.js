/**
 * 🎛️ 항공권 관리 컨트롤 시스템 v10.0.0 - Phase 3 완전 구현
 * 필터링, 검색, 정렬, 일괄처리, 키보드단축키 기능
 */

(function() {
    'use strict';

    console.log('🎛️ FlightManagementControls v10.0.0 로드 중... (Phase 3 완전 구현)');

    // 🌐 컨트롤 시스템 전역 상태
    window.FlightManagementControls = {
        version: '10.0.0',
        phase: 'Phase 3 - Control System 완전 구현',
        isInitialized: false,
        
        // 필터 상태
        filters: {
            status: 'all',        // all, pending, approved, rejected, completed
            type: 'all',          // all, agency, direct
            urgent: false,        // 출국 임박 필터
            search: ''            // 검색어
        },
        
        // 정렬 상태
        sorting: {
            field: 'created_at',  // created_at, departure_date, name, ticket_price
            direction: 'desc'     // asc, desc
        },
        
        // 선택 상태
        selection: {
            selectedIds: new Set(),
            allSelected: false,
            lastSelectedIndex: -1
        },

        // 실행 중인 작업
        operations: {
            isFiltering: false,
            isSorting: false,
            isBulkProcessing: false
        },

        // 키보드 단축키 상태
        keyboard: {
            enabled: true,
            activeKeys: new Set()
        }
    };

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

                // 검색 입력 시 Enter 키 처리
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

            // 특수 필터 처리
            if (filter === 'urgent') {
                window.FlightManagementControls.filters.urgent = !window.FlightManagementControls.filters.urgent;
                buttonElement.classList.toggle('active', window.FlightManagementControls.filters.urgent);
            } else if (['agency', 'direct'].includes(filter)) {
                window.FlightManagementControls.filters.type = filter;
            } else {
                window.FlightManagementControls.filters.status = filter;
            }

            // 즉시 필터 적용
            this.applyFilters();
        }

        handleSearchInput(searchTerm) {
            window.FlightManagementControls.filters.search = searchTerm;
            
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
            if (window.FlightManagementControls.operations.isFiltering) {
                return; // 이미 필터링 중이면 스킵
            }

            window.FlightManagementControls.operations.isFiltering = true;

            try {
                const system = window.FlightManagementPage?.system;
                if (!system || !system.cards) {
                    console.warn('⚠️ 시스템 또는 카드 모듈이 준비되지 않음');
                    return;
                }

                const filters = window.FlightManagementControls.filters;
                console.log('🎛️ 필터 적용:', filters);

                // 필터링된 데이터 가져오기
                const filteredData = this.filterData(system.state.requestsData, filters);
                
                // 카드 업데이트
                system.cards.updateCards(filteredData);
                
                // 통계 업데이트
                if (system.statistics) {
                    system.statistics.updateStatistics(filteredData);
                }

                // 선택 상태 초기화
                this.clearSelection();

                // 필터 저장
                this.saveFilters();

                // UI 업데이트 완료 표시
                this.showFilterFeedback(filteredData.length);

            } catch (error) {
                console.error('❌ 필터 적용 실패:', error);
            } finally {
                window.FlightManagementControls.operations.isFiltering = false;
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

        clearSelection() {
            const selection = window.FlightManagementControls.selection;
            selection.selectedIds.clear();
            selection.allSelected = false;
            selection.lastSelectedIndex = -1;
            
            // UI 업데이트
            this.updateSelectionUI();
        }

        updateSelectionUI() {
            const selectedCount = window.FlightManagementControls.selection.selectedIds.size;
            
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

            // 모든 선택 버튼 상태 업데이트
            const selectAllBtn = document.getElementById('selectAllBtn');
            if (selectAllBtn) {
                selectAllBtn.textContent = window.FlightManagementControls.selection.allSelected ? '모두 해제' : '모두 선택';
            }
        }

        showFilterFeedback(resultCount) {
            // 임시 피드백 표시
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
                localStorage.setItem('flightManagementFilters', JSON.stringify(window.FlightManagementControls.filters));
            } catch (error) {
                console.warn('⚠️ 필터 저장 실패:', error);
            }
        }

        restoreFilters() {
            try {
                const saved = localStorage.getItem('flightManagementFilters');
                if (saved) {
                    const filters = JSON.parse(saved);
                    Object.assign(window.FlightManagementControls.filters, filters);
                    
                    // UI 상태 복원
                    this.restoreUIState();
                }
            } catch (error) {
                console.warn('⚠️ 필터 복원 실패:', error);
            }
        }

        restoreUIState() {
            const filters = window.FlightManagementControls.filters;
            
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
            window.FlightManagementControls.filters = {
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

        getCurrentFilterCount() {
            const filters = window.FlightManagementControls.filters;
            let count = 0;
            
            if (filters.status !== 'all') count++;
            if (filters.type !== 'all') count++;
            if (filters.urgent) count++;
            if (filters.search && filters.search.trim()) count++;
            
            return count;
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
            
            window.FlightManagementControls.sorting = {
                field: field,
                direction: direction
            };

            this.applySorting();
            this.saveSorting();
        }

        applySorting() {
            if (window.FlightManagementControls.operations.isSorting) {
                return;
            }

            window.FlightManagementControls.operations.isSorting = true;

            try {
                const system = window.FlightManagementPage?.system;
                if (!system || !system.cards) {
                    console.warn('⚠️ 시스템 또는 카드 모듈이 준비되지 않음');
                    return;
                }

                const sorting = window.FlightManagementControls.sorting;
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
            } finally {
                window.FlightManagementControls.operations.isSorting = false;
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
                localStorage.setItem('flightManagementSorting', JSON.stringify(window.FlightManagementControls.sorting));
            } catch (error) {
                console.warn('⚠️ 정렬 저장 실패:', error);
            }
        }

        restoreSorting() {
            try {
                const saved = localStorage.getItem('flightManagementSorting');
                if (saved) {
                    const sorting = JSON.parse(saved);
                    Object.assign(window.FlightManagementControls.sorting, sorting);
                    
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

            const selection = window.FlightManagementControls.selection;

            if (isSelected) {
                selection.selectedIds.add(requestId);
            } else {
                selection.selectedIds.delete(requestId);
                selection.allSelected = false;
            }

            // Shift 클릭 처리 (범위 선택)
            if (event.shiftKey && selection.lastSelectedIndex >= 0) {
                this.handleRangeSelection(card, isSelected);
            }

            selection.lastSelectedIndex = Array.from(document.querySelectorAll('.flight-request-card')).indexOf(card);

            this.updateSelectionUI();
        }

        handleRangeSelection(endCard, isSelected) {
            const cards = Array.from(document.querySelectorAll('.flight-request-card'));
            const endIndex = cards.indexOf(endCard);
            const startIndex = window.FlightManagementControls.selection.lastSelectedIndex;

            const start = Math.min(startIndex, endIndex);
            const end = Math.max(startIndex, endIndex);

            for (let i = start; i <= end; i++) {
                const card = cards[i];
                const checkbox = card.querySelector('input[type="checkbox"]');
                const requestId = card.dataset.requestId;

                if (checkbox && requestId) {
                    checkbox.checked = isSelected;
                    if (isSelected) {
                        window.FlightManagementControls.selection.selectedIds.add(requestId);
                    } else {
                        window.FlightManagementControls.selection.selectedIds.delete(requestId);
                    }
                }
            }
        }

        toggleSelectAll() {
            const selection = window.FlightManagementControls.selection;
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
            const selection = window.FlightManagementControls.selection;
            
            // 모든 체크박스 해제
            document.querySelectorAll('.flight-request-card input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });

            // 선택 상태 초기화
            selection.selectedIds.clear();
            selection.allSelected = false;
            selection.lastSelectedIndex = -1;

            this.updateSelectionUI();
        }

        updateSelectionUI() {
            const selection = window.FlightManagementControls.selection;
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

        getSelectedRequests() {
            return Array.from(window.FlightManagementControls.selection.selectedIds);
        }

        selectRequest(requestId) {
            window.FlightManagementControls.selection.selectedIds.add(requestId);
            this.updateSelectionUI();
        }

        deselectRequest(requestId) {
            window.FlightManagementControls.selection.selectedIds.delete(requestId);
            this.updateSelectionUI();
        }

        isSelected(requestId) {
            return window.FlightManagementControls.selection.selectedIds.has(requestId);
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
            const selectedIds = Array.from(window.FlightManagementControls.selection.selectedIds);
            
            if (selectedIds.length === 0) {
                alert('승인할 항목을 선택해주세요.');
                return;
            }

            const confirmed = confirm(`선택된 ${selectedIds.length}개 항목을 모두 승인하시겠습니까?`);
            if (!confirmed) return;

            window.FlightManagementControls.operations.isBulkProcessing = true;

            try {
                // 로딩 상태 표시
                this.showBulkProcessingState('승인 처리 중...');

                const api = window.FlightManagementPage?.system?.api;
                if (!api) {
                    throw new Error('API가 초기화되지 않았습니다');
                }

                // 순차적으로 처리 (동시 처리는 서버 부하 우려)
                let successCount = 0;
                let failCount = 0;
                const errors = [];

                for (const requestId of selectedIds) {
                    try {
                        await api.approveFlightRequest(requestId, {
                            admin_notes: '일괄 승인 처리'
                        });
                        successCount++;
                        
                        // 진행 상황 업데이트
                        this.updateBulkProgress(successCount + failCount, selectedIds.length, '승인 처리 중...');
                        
                        // 과부하 방지를 위한 짧은 대기
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                    } catch (error) {
                        failCount++;
                        errors.push(`${requestId}: ${error.message}`);
                        console.error(`승인 실패 (${requestId}):`, error);
                    }
                }

                // 결과 표시
                this.showBulkResult('승인', successCount, failCount, errors);

                // 데이터 새로고침
                if (window.FlightManagementPage.system) {
                    await window.FlightManagementPage.system.refreshData(true);
                }

                // 선택 해제
                this.clearSelection();

            } catch (error) {
                console.error('❌ 일괄 승인 실패:', error);
                alert('일괄 승인 처리 중 오류가 발생했습니다: ' + error.message);
            } finally {
                window.FlightManagementControls.operations.isBulkProcessing = false;
                this.hideBulkProcessingState();
            }
        }

        async handleBulkReject() {
            const selectedIds = Array.from(window.FlightManagementControls.selection.selectedIds);
            
            if (selectedIds.length === 0) {
                alert('반려할 항목을 선택해주세요.');
                return;
            }

            // 반려 사유 입력 받기
            const reason = prompt(`선택된 ${selectedIds.length}개 항목의 반려 사유를 입력해주세요:`);
            if (!reason || !reason.trim()) {
                alert('반려 사유를 입력해야 합니다.');
                return;
            }

            const confirmed = confirm(`선택된 ${selectedIds.length}개 항목을 모두 반려하시겠습니까?`);
            if (!confirmed) return;

            window.FlightManagementControls.operations.isBulkProcessing = true;

            try {
                // 로딩 상태 표시
                this.showBulkProcessingState('반려 처리 중...');

                const api = window.FlightManagementPage?.system?.api;
                if (!api) {
                    throw new Error('API가 초기화되지 않았습니다');
                }

                // 순차적으로 처리
                let successCount = 0;
                let failCount = 0;
                const errors = [];

                for (const requestId of selectedIds) {
                    try {
                        await api.rejectFlightRequest(requestId, {
                            rejection_reason: reason.trim()
                        });
                        successCount++;
                        
                        // 진행 상황 업데이트
                        this.updateBulkProgress(successCount + failCount, selectedIds.length, '반려 처리 중...');
                        
                        // 과부하 방지를 위한 짧은 대기
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                    } catch (error) {
                        failCount++;
                        errors.push(`${requestId}: ${error.message}`);
                        console.error(`반려 실패 (${requestId}):`, error);
                    }
                }

                // 결과 표시
                this.showBulkResult('반려', successCount, failCount, errors);

                // 데이터 새로고침
                if (window.FlightManagementPage.system) {
                    await window.FlightManagementPage.system.refreshData(true);
                }

                // 선택 해제
                this.clearSelection();

            } catch (error) {
                console.error('❌ 일괄 반려 실패:', error);
                alert('일괄 반려 처리 중 오류가 발생했습니다: ' + error.message);
            } finally {
                window.FlightManagementControls.operations.isBulkProcessing = false;
                this.hideBulkProcessingState();
            }
        }

        showBulkProcessingState(message) {
            // 전체 화면 로딩 오버레이 생성
            const overlay = document.createElement('div');
            overlay.id = 'bulkProcessingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.2rem;
            `;

            overlay.innerHTML = `
                <div style="text-align: center; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 1rem;">
                    <div style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3182ce; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <div id="bulkProcessingMessage">${message}</div>
                    <div id="bulkProcessingProgress" style="margin-top: 0.5rem; font-size: 0.9rem; color: #cbd5e0;"></div>
                </div>
            `;

            document.body.appendChild(overlay);
        }

        updateBulkProgress(current, total, message) {
            const messageElement = document.getElementById('bulkProcessingMessage');
            const progressElement = document.getElementById('bulkProcessingProgress');
            
            if (messageElement) {
                messageElement.textContent = message;
            }
            
            if (progressElement) {
                progressElement.textContent = `${current} / ${total} 완료`;
            }
        }

        hideBulkProcessingState() {
            const overlay = document.getElementById('bulkProcessingOverlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }
        }

        showBulkResult(action, successCount, failCount, errors) {
            let message = `${action} 처리 완료:\n`;
            message += `성공: ${successCount}개\n`;
            
            if (failCount > 0) {
                message += `실패: ${failCount}개\n`;
                if (errors.length > 0) {
                    message += '\n실패 상세:\n' + errors.slice(0, 5).join('\n');
                    if (errors.length > 5) {
                        message += `\n... 외 ${errors.length - 5}개`;
                    }
                }
            }

            alert(message);
        }

        clearSelection() {
            if (window.FlightManagementControls.selection) {
                const selectionController = window.flightControls?.selection;
                if (selectionController) {
                    selectionController.clearSelection();
                }
            }
        }
    }

    // ⌨️ 키보드 단축키 컨트롤러
    class KeyboardController {
        constructor() {
            this.shortcuts = {
                // 필터 단축키
                'Digit1': () => this.triggerFilter('all'),
                'Digit2': () => this.triggerFilter('pending'),
                'Digit3': () => this.triggerFilter('approved'),
                'Digit4': () => this.triggerFilter('completed'),
                'KeyA': () => this.triggerFilter('agency'),
                'KeyD': () => this.triggerFilter('direct'),
                'KeyU': () => this.triggerFilter('urgent'),

                // 선택 단축키
                'KeyS': () => this.toggleSelectAll(),
                'Escape': () => this.clearSelection(),

                // 검색 단축키
                'KeyF': () => this.focusSearch(),

                // 새로고침 단축키
                'KeyR': () => this.refreshData(),

                // 디버그 단축키 (Ctrl+D는 메인에서 처리)
            };

            this.isEnabled = true;
        }

        init() {
            console.log('⌨️ KeyboardController 초기화 중...');
            this.setupKeyboardEvents();
            console.log('✅ KeyboardController 초기화 완료');
        }

        setupKeyboardEvents() {
            document.addEventListener('keydown', (e) => {
                if (!this.isEnabled) return;
                
                // 입력 필드에서는 단축키 비활성화
                if (this.isInputActive()) return;
                
                // 모달이 열려있으면 단축키 비활성화
                if (this.isModalOpen()) return;

                // Ctrl 키와 함께 사용하는 단축키
                if (e.ctrlKey || e.metaKey) {
                    this.handleCtrlShortcuts(e);
                } else {
                    this.handleRegularShortcuts(e);
                }
            });
        }

        isInputActive() {
            const activeElement = document.activeElement;
            const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
            return inputTags.includes(activeElement.tagName) || activeElement.isContentEditable;
        }

        isModalOpen() {
            return document.querySelector('.modal-overlay.show') !== null;
        }

        handleCtrlShortcuts(e) {
            switch (e.code) {
                case 'KeyR':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.refreshData();
                    }
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.focusSearch();
                    break;
            }
        }

        handleRegularShortcuts(e) {
            const shortcut = this.shortcuts[e.code];
            if (shortcut) {
                e.preventDefault();
                shortcut();
            }
        }

        triggerFilter(filter) {
            const filterBtn = document.querySelector(`[data-filter="${filter}"]`);
            if (filterBtn) {
                filterBtn.click();
                this.showShortcutFeedback(`필터: ${filter}`);
            }
        }

        toggleSelectAll() {
            const selectAllBtn = document.getElementById('selectAllBtn');
            if (selectAllBtn) {
                selectAllBtn.click();
                this.showShortcutFeedback('전체 선택 토글');
            }
        }

        clearSelection() {
            const clearBtn = document.getElementById('clearSelectionBtn');
            if (clearBtn) {
                clearBtn.click();
                this.showShortcutFeedback('선택 해제');
            }
        }

        focusSearch() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
                this.showShortcutFeedback('검색 포커스');
            }
        }

        refreshData() {
            if (window.FlightManagementPage?.system) {
                window.FlightManagementPage.system.refreshData(true);
                this.showShortcutFeedback('데이터 새로고침');
            }
        }

        showShortcutFeedback(action) {
            const indicator = document.getElementById('realTimeIndicator');
            if (indicator) {
                indicator.innerHTML = `
                    <div class="pulse-dot"></div>
                    <span>⌨️ ${action}</span>
                `;
                indicator.classList.add('show');
                
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 1500);
            }
        }

        enable() {
            this.isEnabled = true;
        }

        disable() {
            this.isEnabled = false;
        }

        // 도움말 표시
        showHelp() {
            const helpModal = this.createHelpModal();
            helpModal.show();
        }

        createHelpModal() {
            const helpContent = `
                <h3>⌨️ 키보드 단축키</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <h4>필터 단축키</h4>
                        <ul style="list-style: none; padding: 0;">
                            <li><kbd>1</kbd> - 전체</li>
                            <li><kbd>2</kbd> - 대기중</li>
                            <li><kbd>3</kbd> - 승인됨</li>
                            <li><kbd>4</kbd> - 완료</li>
                            <li><kbd>A</kbd> - 구매대행</li>
                            <li><kbd>D</kbd> - 직접구매</li>
                            <li><kbd>U</kbd> - 출국임박</li>
                        </ul>
                    </div>
                    <div>
                        <h4>기능 단축키</h4>
                        <ul style="list-style: none; padding: 0;">
                            <li><kbd>S</kbd> - 전체 선택/해제</li>
                            <li><kbd>ESC</kbd> - 선택 해제</li>
                            <li><kbd>Ctrl+F</kbd> - 검색 포커스</li>
                            <li><kbd>Ctrl+Shift+R</kbd> - 데이터 새로고침</li>
                            <li><kbd>Ctrl+D</kbd> - 디버그 정보</li>
                        </ul>
                    </div>
                </div>
                <style>
                    kbd {
                        background: #f7fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 3px;
                        padding: 2px 6px;
                        font-family: monospace;
                        font-size: 0.875rem;
                    }
                </style>
            `;

            // 간단한 모달 생성 (FlightModal 대신 간단한 구현)
            const modal = {
                show: () => {
                    const overlay = document.createElement('div');
                    overlay.className = 'modal-overlay show';
                    overlay.innerHTML = `
                        <div class="modal-container medium">
                            <div class="modal-header">
                                <h2 class="modal-title">키보드 단축키 도움말</h2>
                                <button class="modal-close">
                                    <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                                </button>
                            </div>
                            <div class="modal-body">
                                ${helpContent}
                            </div>
                            <div class="modal-footer">
                                <button class="btn primary">확인</button>
                            </div>
                        </div>
                    `;

                    // 닫기 이벤트
                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay || e.target.closest('.modal-close') || e.target.closest('.btn')) {
                            document.body.removeChild(overlay);
                        }
                    });

                    document.body.appendChild(overlay);
                    
                    // 아이콘 렌더링
                    if (window.refreshIcons) {
                        window.refreshIcons();
                    }
                }
            };

            return modal;
        }
    }

    // 🎛️ 메인 컨트롤 시스템
    class FlightManagementControlSystem {
        constructor() {
            this.filter = new FilterController();
            this.sort = new SortController();
            this.selection = new SelectionController();
            this.bulkActions = new BulkActionsController();
            this.keyboard = new KeyboardController();
        }

        async init() {
            console.log('🎛️ FlightManagementControlSystem v10.0.0 초기화 중...');

            try {
                // 각 컨트롤러 초기화
                this.filter.init();
                this.sort.init();
                this.selection.init();
                this.bulkActions.init();
                this.keyboard.init();

                window.FlightManagementControls.isInitialized = true;
                console.log('✅ FlightManagementControlSystem v10.0.0 초기화 완료!');

                return true;
            } catch (error) {
                console.error('❌ FlightManagementControlSystem 초기화 실패:', error);
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
            window.FlightManagementControls.sorting = {
                field: 'created_at',
                direction: 'desc'
            };
            this.sort.restoreSorting();
        }

        // 상태 정보
        getState() {
            return {
                filters: window.FlightManagementControls.filters,
                sorting: window.FlightManagementControls.sorting,
                selection: {
                    count: window.FlightManagementControls.selection.selectedIds.size,
                    allSelected: window.FlightManagementControls.selection.allSelected
                },
                operations: window.FlightManagementControls.operations
            };
        }

        // 디버그 정보
        getDebugInfo() {
            return {
                version: window.FlightManagementControls.version,
                phase: window.FlightManagementControls.phase,
                isInitialized: window.FlightManagementControls.isInitialized,
                state: this.getState(),
                controllers: {
                    filter: !!this.filter,
                    sort: !!this.sort,
                    selection: !!this.selection,
                    bulkActions: !!this.bulkActions,
                    keyboard: !!this.keyboard
                }
            };
        }

        // 키보드 도움말
        showKeyboardHelp() {
            this.keyboard.showHelp();
        }

        // 컨트롤 비활성화/활성화
        enableControls() {
            this.keyboard.enable();
        }

        disableControls() {
            this.keyboard.disable();
        }
    }

    // 🌐 전역 객체 노출
    const controlSystem = new FlightManagementControlSystem();
    
    window.flightControls = controlSystem;
    window.FlightManagementControls.system = controlSystem;
    window.FlightManagementControls.controllers = {
        filter: controlSystem.filter,
        sort: controlSystem.sort,
        selection: controlSystem.selection,
        bulkActions: controlSystem.bulkActions,
        keyboard: controlSystem.keyboard
    };

    // 전역 함수로 주요 기능 노출
    window.flightControlsUtils = {
        applyFilters: () => controlSystem.applyFilters(),
        applySorting: () => controlSystem.applySorting(),
        clearSelection: () => controlSystem.clearSelection(),
        resetAll: () => controlSystem.resetAll(),
        showKeyboardHelp: () => controlSystem.showKeyboardHelp(),
        getDebugInfo: () => controlSystem.getDebugInfo()
    };

    console.log('✅ FlightManagementControls v10.0.0 로드 완료! (Phase 3 컨트롤 시스템 완전 구현)');

})();