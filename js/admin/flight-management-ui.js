// flight-management-ui.js - 관리자용 항공권 관리 UI v1.3.0
// v1.3.0: 가격 정보 표시 기능 추가

class FlightManagementUI {
    constructor() {
        this.api = null;
        this.currentFilter = 'all';
        this.currentSort = { field: 'created_at', order: 'desc' };
        this.requests = [];
        this.initializeAPI();
        this.init();
    }

    // API 초기화
    async initializeAPI() {
        console.log('🔧 FlightManagementUI v1.3.0 - API 초기화 시작...');
        
        // FlightManagementAPI 인스턴스 생성 대기
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!window.FlightManagementAPI && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            
            if (attempts % 10 === 0) {
                console.log(`⏳ FlightManagementAPI 대기 중... (${attempts/10}초)`);
            }
        }

        if (window.FlightManagementAPI) {
            try {
                this.api = new window.FlightManagementAPI();
                console.log('✅ FlightManagementAPI 연결 완료');
                
                // API 초기화 상태 확인
                setTimeout(() => {
                    if (this.api) {
                        const status = this.api.getInitializationStatus();
                        console.log('📊 API 초기화 상태:', status);
                        
                        if (!status.isInitialized) {
                            console.warn('⚠️ API 초기화가 완료되지 않았습니다');
                        }
                    }
                }, 2000);
                
            } catch (error) {
                console.error('❌ FlightManagementAPI 생성 실패:', error);
                this.api = null;
            }
        } else {
            console.warn('⚠️ FlightManagementAPI를 찾을 수 없습니다');
        }

        // FlightRequestUtils 확인
        if (window.FlightRequestUtils) {
            console.log('✅ FlightRequestUtils 가격 포맷팅 기능 확인 완료');
        } else {
            console.warn('⚠️ FlightRequestUtils를 찾을 수 없습니다 - 가격 포맷팅 제한');
        }
    }

    async init() {
        this.setupEventListeners();
        // API 초기화 대기 후 데이터 로드
        await this.waitForAPI();
        this.loadRequests();
    }

    async waitForAPI() {
        console.log('⏳ API 준비 대기 중...');
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!this.api && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (this.api) {
            console.log('✅ API 준비 완료');
        } else {
            console.warn('⚠️ API 준비 타임아웃');
        }
    }

    setupEventListeners() {
        // 필터 이벤트
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.filterRequests();
            });
        });

        // 검색 이벤트
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchRequests(e.target.value);
            });
        }

        // 정렬 이벤트
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [field, order] = e.target.value.split('-');
                this.currentSort = { field, order };
                this.sortRequests();
            });
        }
    }

    async loadRequests() {
        console.log('📋 항공권 신청 목록 로드 시작 (v1.3.0 가격 정보 포함)...');
        this.showLoading();
        
        try {
            if (this.api) {
                console.log('🔄 API를 통한 데이터 로드 시도...');
                
                // API 상태 확인
                const apiStatus = this.api.getInitializationStatus();
                console.log('📊 API 상태:', apiStatus);
                
                if (!apiStatus.isInitialized) {
                    throw new Error(`API가 초기화되지 않았습니다: ${apiStatus.initError?.message || '알 수 없는 오류'}`);
                }
                
                this.requests = await this.api.getAllRequests();
                console.log(`✅ API를 통한 데이터 로드 성공: ${this.requests.length}건`);
                
            } else {
                console.log('🔄 Fallback: 직접 Supabase 호출 시도...');
                
                // Fallback: 직접 Supabase 호출
                const supabase = this.getSupabase();
                if (!supabase) {
                    throw new Error('API와 Supabase 모두 사용할 수 없습니다');
                }
                
                const { data, error } = await supabase
                    .from('flight_requests')
                    .select(`
                        *,
                        user_profiles!inner(
                            id,
                            name,
                            email,
                            university,
                            institute_info(
                                name_ko
                            )
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                this.requests = data || [];
                console.log(`✅ 직접 호출로 데이터 로드 성공: ${this.requests.length}건`);
            }

            this.renderRequests(this.requests);
            this.updateStats();
            
        } catch (error) {
            console.error('❌ 데이터 로드 실패:', error);
            
            // 상세 에러 정보 표시
            const errorDetails = {
                message: error.message,
                hasAPI: !!this.api,
                hasSupabase: !!this.getSupabase(),
                apiStatus: this.api ? this.api.getInitializationStatus() : null
            };
            
            console.error('🔍 에러 상세:', errorDetails);
            
            this.showError(`항공권 신청 목록을 불러오는 중 오류가 발생했습니다.<br><br><strong>오류 상세:</strong><br>${error.message}`);
        }
    }

    // Supabase 인스턴스 안전하게 가져오기
    getSupabase() {
        if (window.SupabaseAPI && window.SupabaseAPI.supabase) {
            return window.SupabaseAPI.supabase;
        }
        if (window.supabase) {
            return window.supabase;
        }
        return null;
    }

    // 🆕 가격 정보 포맷팅 (v1.3.0)
    formatPriceInfo(request) {
        // 가격 정보가 없는 경우
        if (!request.ticket_price || !request.currency) {
            return '<div class="price-no-data">미입력</div>';
        }

        let formattedPrice = '';
        
        // FlightRequestUtils가 있으면 사용
        if (window.FlightRequestUtils) {
            try {
                formattedPrice = window.FlightRequestUtils.formatPrice(request.ticket_price, request.currency);
            } catch (error) {
                console.warn('가격 포맷팅 오류:', error);
                // 폴백: 간단한 포맷팅
                formattedPrice = `${parseFloat(request.ticket_price).toLocaleString()} ${request.currency}`;
            }
        } else {
            // FlightRequestUtils 없을 때 기본 포맷팅
            formattedPrice = `${parseFloat(request.ticket_price).toLocaleString()} ${request.currency}`;
        }

        // 가격 출처 정보
        const priceSource = request.price_source ? 
            request.price_source.substring(0, 20) + (request.price_source.length > 20 ? '...' : '') : 
            '출처 미기재';

        return `
            <div class="price-info">
                <div class="price-amount">${formattedPrice}</div>
                <div class="price-source" title="${request.price_source || '출처 미기재'}">${priceSource}</div>
            </div>
        `;
    }

    renderRequests(requests) {
        const tbody = document.getElementById('requestsTableBody');
        if (!tbody) return;

        if (requests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-data">
                        <div class="no-data-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            </svg>
                        </div>
                        <p>항공권 신청 내역이 없습니다.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = requests.map(request => `
            <tr data-id="${request.id}">
                <td>${new Date(request.created_at).toLocaleDateString('ko-KR')}</td>
                <td>
                    <div class="user-info">
                        <strong>${request.user_profiles.name}</strong>
                        <small>${request.user_profiles.university}</small>
                    </div>
                </td>
                <td>${request.user_profiles.institute_info?.name_ko || '-'}</td>
                <td>
                    <span class="badge ${request.purchase_type === 'direct' ? 'badge-info' : 'badge-warning'}">
                        ${request.purchase_type === 'direct' ? '직접구매' : '구매대행'}
                    </span>
                </td>
                <td>${new Date(request.departure_date).toLocaleDateString('ko-KR')}</td>
                <td>${new Date(request.return_date).toLocaleDateString('ko-KR')}</td>
                <td>${this.formatPriceInfo(request)}</td>
                <td>
                    <span class="status-badge status-${request.status}">
                        ${this.getStatusText(request.status)}
                    </span>
                </td>
                <td class="actions">
                    ${this.renderActions(request)}
                </td>
            </tr>
        `).join('');

        // 액션 버튼 이벤트 바인딩
        this.bindActionEvents();
    }

    renderActions(request) {
        const actions = [];

        // 상세보기는 항상 표시
        actions.push(`
            <button class="btn-icon" 
                    title="상세보기" 
                    onclick="window.flightModals?.showDetailModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
        `);

        // 여권정보 보기
        actions.push(`
            <button class="btn-icon" 
                    title="여권정보" 
                    onclick="window.flightModals?.showPassportModal('${request.user_id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
            </button>
        `);

        // 상태별 액션 버튼
        if (request.status === 'pending') {
            // 승인 버튼
            actions.push(`
                <button class="btn-icon btn-success" 
                        title="승인" 
                        onclick="window.flightModals?.showApproveModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
            `);

            // 반려 버튼
            actions.push(`
                <button class="btn-icon btn-danger" 
                        title="반려" 
                        onclick="window.flightModals?.showRejectModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `);
        }

        // 구매대행이고 승인된 상태에서 아직 항공권이 등록되지 않은 경우
        if (request.purchase_type === 'agency' && 
            request.status === 'approved' && 
            !request.admin_ticket_url) {
            actions.push(`
                <button class="btn-icon btn-primary" 
                        title="항공권 등록" 
                        onclick="window.flightModals?.showUploadTicketModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </button>
            `);
        }

        return actions.join('');
    }

    bindActionEvents() {
        // window.flightModals를 통해 모달 기능에 접근
        if (window.flightManagementUI) {
            window.flightManagementUI = this;
        }
    }

    filterRequests() {
        let filtered = [...this.requests];

        // 필터 적용
        if (this.currentFilter === 'direct') {
            filtered = filtered.filter(r => r.purchase_type === 'direct');
        } else if (this.currentFilter === 'agency') {
            filtered = filtered.filter(r => r.purchase_type === 'agency');
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(r => r.status === 'pending');
        } else if (this.currentFilter === 'approved') {
            filtered = filtered.filter(r => r.status === 'approved');
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(r => r.status === 'completed');
        }

        this.renderRequests(filtered);
    }

    searchRequests(query) {
        if (!query) {
            this.filterRequests();
            return;
        }

        const filtered = this.requests.filter(request => {
            const searchFields = [
                request.user_profiles.name,
                request.user_profiles.university,
                request.user_profiles.institute_info?.name_ko,
                request.departure_airport,
                request.arrival_airport
            ];

            return searchFields.some(field => 
                field && field.toLowerCase().includes(query.toLowerCase())
            );
        });

        this.renderRequests(filtered);
    }

    sortRequests() {
        const sorted = [...this.requests].sort((a, b) => {
            let aVal, bVal;

            switch (this.currentSort.field) {
                case 'created_at':
                    aVal = new Date(a.created_at);
                    bVal = new Date(b.created_at);
                    break;
                case 'departure_date':
                    aVal = new Date(a.departure_date);
                    bVal = new Date(b.departure_date);
                    break;
                case 'name':
                    aVal = a.user_profiles.name;
                    bVal = b.user_profiles.name;
                    break;
                case 'ticket_price':
                    // 🆕 v1.3.0 가격 정렬 추가
                    aVal = parseFloat(a.ticket_price) || 0;
                    bVal = parseFloat(b.ticket_price) || 0;
                    break;
                default:
                    return 0;
            }

            if (this.currentSort.order === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        this.renderRequests(sorted);
    }

    updateStats() {
        const stats = {
            total: this.requests.length,
            pending: this.requests.filter(r => r.status === 'pending').length,
            approved: this.requests.filter(r => r.status === 'approved').length,
            completed: this.requests.filter(r => r.status === 'completed').length,
            direct: this.requests.filter(r => r.purchase_type === 'direct').length,
            agency: this.requests.filter(r => r.purchase_type === 'agency').length
        };

        // 통계 업데이트
        Object.entries(stats).forEach(([key, value]) => {
            const elem = document.getElementById(`stat-${key}`);
            if (elem) elem.textContent = value;
        });
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '대기중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'completed': '완료'
        };
        return statusMap[status] || status;
    }

    showLoading() {
        const tbody = document.getElementById('requestsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading">
                        <div class="spinner"></div>
                        <p>데이터를 불러오는 중...</p>
                    </td>
                </tr>
            `;
        }
    }

    showError(message) {
        const tbody = document.getElementById('requestsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="error">
                        <div class="error-icon">⚠️</div>
                        <p>${message}</p>
                        <button class="btn btn-primary" onclick="window.flightManagementUI?.loadRequests()">
                            다시 시도
                        </button>
                        <button class="btn btn-secondary" onclick="console.log('디버깅 정보:', {api: window.flightManagementUI?.api?.getInitializationStatus(), supabase: !!window.SupabaseAPI?.supabase})">
                            디버깅 정보 출력
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// 전역 인스턴스 생성 (페이지 로드 후)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined') {
        window.FlightManagementUI = FlightManagementUI;
        window.flightManagementUI = new FlightManagementUI();
        console.log('✅ FlightManagementUI v1.3.0 초기화 완료 (가격 정보 기능 추가)');
    }
});

console.log('✅ FlightManagementUI v1.3.0 로드 완료 - 가격 정보 표시 기능 추가');
