// flight-management-ui.js - 관리자용 항공권 관리 UI (6단계 상세 기능 포함)

import { FlightManagementAPI } from './flight-management-api.js';
import './flight-management-modals.js';

export class FlightManagementUI {
    constructor() {
        this.api = new FlightManagementAPI();
        this.currentFilter = 'all';
        this.currentSort = { field: 'created_at', order: 'desc' };
        this.requests = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadRequests();
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
        this.showLoading();
        try {
            this.requests = await this.api.getAllRequests();
            this.renderRequests(this.requests);
            this.updateStats();
        } catch (error) {
            console.error('Error loading requests:', error);
            this.showError('항공권 신청 목록을 불러오는 중 오류가 발생했습니다.');
        }
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
                    onclick="window.flightModals.showDetailModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
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
                    onclick="window.flightModals.showPassportModal('${request.user_id}')">
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
                        onclick="window.flightModals.showApproveModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
            `);

            // 반려 버튼
            actions.push(`
                <button class="btn-icon btn-danger" 
                        title="반려" 
                        onclick="window.flightModals.showRejectModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
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
                        onclick="window.flightModals.showUploadTicketModal(${JSON.stringify(request).replace(/"/g, '&quot;')})">
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
                        <button class="btn btn-primary" onclick="location.reload()">
                            다시 시도
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// 전역 인스턴스 생성
window.flightManagementUI = new FlightManagementUI();