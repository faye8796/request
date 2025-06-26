/**
 * 🎨 Institute UI Module (v4.4.0)
 * 세종학당 파견학당 정보 관리 시스템 - UI 컨트롤러 모듈
 * 
 * 📋 담당 기능:
 * - DOM 조작 및 이벤트 처리
 * - 모달, 폼, 테이블 관리
 * - 사용자 인터랙션 처리
 * - institute-management.html 연동
 * 
 * 🔗 의존성: Utils, InstituteCore, InstituteAPI
 * 🚫 독립성: 기존 admin UI 시스템과 분리
 */

class InstituteUI {
    constructor() {
        this.currentView = 'grid'; // grid | list
        this.selectedInstitute = null;
        this.editMode = false;
        this.searchParams = {};
        this.isLoading = false;
        
        // DOM 요소 참조
        this.elements = {};
        this.modals = {};
        
        // 이벤트 리스너 참조 (메모리 누수 방지)
        this.eventListeners = new Map();
        
        // 📋 15개 필드 UI 매핑
        this.FIELD_LABELS = {
            name_ko: '학당명',
            name_en: '영문명',
            operating_organization: '운영기관',
            image_url: '학당사진',
            address: '주소',
            phone: '대표연락처',
            website_sns: '홈페이지/SNS',
            manager_name: '담당자성명',
            manager_contact: '담당자연락처',
            local_adaptation_staff: '현지적응전담인력',
            cultural_program_plan: '문화수업운영계획',
            desired_courses: '희망개설강좌',
            local_language_requirement: '현지어구사필요수준',
            institute_support: '학당지원사항',
            country_safety_info: '파견국가안전정보'
        };
        
        console.log('🎨 InstituteUI 모듈 초기화됨');
    }

    /**
     * 🚀 UI 모듈 초기화
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            console.log('🔄 InstituteUI 초기화 시작...');
            
            // 필수 의존성 체크
            if (!window.Utils || !window.InstituteCore || !window.InstituteAPI) {
                throw new Error('필수 의존성 모듈이 로드되지 않았습니다');
            }
            
            // DOM 요소 초기화
            this.initializeElements();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 데이터 로드
            await this.loadInitialData();
            
            console.log('✅ InstituteUI 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ InstituteUI 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 🔧 DOM 요소 초기화
     */
    initializeElements() {
        this.elements = {
            // 메인 컨테이너
            container: document.getElementById('institute-management-container'),
            loadingSpinner: document.getElementById('loading-spinner'),
            
            // 헤더 및 검색
            searchInput: document.getElementById('institute-search'),
            searchButton: document.getElementById('search-button'),
            viewToggleGrid: document.getElementById('view-toggle-grid'),
            viewToggleList: document.getElementById('view-toggle-list'),
            
            // 액션 버튼
            addButton: document.getElementById('add-institute-btn'),
            refreshButton: document.getElementById('refresh-button'),
            exportButton: document.getElementById('export-button'),
            
            // 콘텐츠 영역
            instituteGrid: document.getElementById('institute-grid'),
            instituteList: document.getElementById('institute-list'),
            emptyState: document.getElementById('empty-state'),
            
            // 통계 정보
            totalCount: document.getElementById('total-institutes'),
            activeCount: document.getElementById('active-institutes'),
            
            // 모달들
            detailModal: document.getElementById('institute-detail-modal'),
            editModal: document.getElementById('institute-edit-modal'),
            deleteModal: document.getElementById('institute-delete-modal'),
            imageModal: document.getElementById('image-preview-modal')
        };
        
        // 모달 참조 설정
        this.modals = {
            detail: this.elements.detailModal,
            edit: this.elements.editModal,
            delete: this.elements.deleteModal,
            image: this.elements.imageModal
        };
        
        console.log('🔧 DOM 요소 초기화 완료');
    }

    /**
     * 📡 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 검색 기능
        this.addEventListener(this.elements.searchInput, 'input', 
            window.Utils.debounce(this.handleSearch.bind(this), 300));
        this.addEventListener(this.elements.searchButton, 'click', this.handleSearch.bind(this));
        
        // 뷰 토글
        this.addEventListener(this.elements.viewToggleGrid, 'click', () => this.switchView('grid'));
        this.addEventListener(this.elements.viewToggleList, 'click', () => this.switchView('list'));
        
        // 액션 버튼
        this.addEventListener(this.elements.addButton, 'click', this.showAddModal.bind(this));
        this.addEventListener(this.elements.refreshButton, 'click', this.refreshData.bind(this));
        this.addEventListener(this.elements.exportButton, 'click', this.exportData.bind(this));
        
        // 모달 닫기 (ESC 키)
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });
        
        // 그리드/리스트 클릭 이벤트 (이벤트 위임)
        this.addEventListener(this.elements.instituteGrid, 'click', this.handleGridClick.bind(this));
        this.addEventListener(this.elements.instituteList, 'click', this.handleListClick.bind(this));
        
        console.log('📡 이벤트 리스너 설정 완료');
    }

    /**
     * 📊 초기 데이터 로드
     */
    async loadInitialData() {
        try {
            this.showLoading(true);
            
            // 학당 목록 로드
            await this.loadInstituteList();
            
            // 통계 업데이트
            await this.updateStatistics();
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ 초기 데이터 로드 실패:', error);
            this.showError('초기 데이터 로드에 실패했습니다.');
            this.showLoading(false);
        }
    }

    /**
     * 📋 학당 목록 로드 및 표시
     */
    async loadInstituteList(searchParams = {}) {
        try {
            console.log('🔄 학당 목록 로드 중...');
            this.showLoading(true);
            
            const institutes = await window.InstituteAPI.getInstituteList({
                search: searchParams.keyword,
                limit: searchParams.limit || 100
            });
            
            if (institutes.length === 0) {
                this.showEmptyState();
            } else {
                this.renderInstitutes(institutes);
            }
            
            this.showLoading(false);
            console.log(`✅ ${institutes.length}개 학당 표시 완료`);
            
        } catch (error) {
            console.error('❌ 학당 목록 로드 실패:', error);
            this.showError('학당 목록을 불러오는데 실패했습니다.');
            this.showLoading(false);
        }
    }

    /**
     * 🎨 학당 목록 렌더링
     */
    renderInstitutes(institutes) {
        if (this.currentView === 'grid') {
            this.renderGrid(institutes);
        } else {
            this.renderList(institutes);
        }
        
        // 빈 상태 숨기기
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
    }

    /**
     * 🔲 그리드 뷰 렌더링
     */
    renderGrid(institutes) {
        if (!this.elements.instituteGrid) return;
        
        const gridHTML = institutes.map(institute => `
            <div class="institute-card" data-id="${institute.id}">
                <div class="institute-image">
                    ${institute.image_url ? 
                        `<img src="${institute.image_url}" alt="${institute.name_ko}" loading="lazy">` :
                        `<div class="placeholder-image">
                            <i class="lucide-building2"></i>
                        </div>`
                    }
                    <div class="image-overlay">
                        <button class="btn btn-sm btn-primary view-details" data-id="${institute.id}">
                            <i class="lucide-eye"></i> 상세보기
                        </button>
                    </div>
                </div>
                <div class="institute-info">
                    <h3 class="institute-name">${institute.name_ko}</h3>
                    ${institute.name_en ? `<p class="institute-name-en">${institute.name_en}</p>` : ''}
                    <div class="institute-meta">
                        <div class="meta-item">
                            <i class="lucide-building"></i>
                            <span>${institute.operating_organization || '운영기관 미설정'}</span>
                        </div>
                        ${institute.address ? `
                            <div class="meta-item">
                                <i class="lucide-map-pin"></i>
                                <span>${this.truncateText(institute.address, 30)}</span>
                            </div>
                        ` : ''}
                        ${institute.manager_name ? `
                            <div class="meta-item">
                                <i class="lucide-user"></i>
                                <span>${institute.manager_name}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="institute-actions">
                        <button class="btn btn-sm btn-outline-primary edit-institute" data-id="${institute.id}">
                            <i class="lucide-edit"></i> 수정
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-institute" data-id="${institute.id}">
                            <i class="lucide-trash2"></i> 삭제
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        this.elements.instituteGrid.innerHTML = gridHTML;
        this.elements.instituteGrid.style.display = 'grid';
        
        if (this.elements.instituteList) {
            this.elements.instituteList.style.display = 'none';
        }
    }

    /**
     * 📄 리스트 뷰 렌더링
     */
    renderList(institutes) {
        if (!this.elements.instituteList) return;
        
        const listHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>학당명</th>
                            <th>운영기관</th>
                            <th>주소</th>
                            <th>담당자</th>
                            <th>연락처</th>
                            <th>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${institutes.map(institute => `
                            <tr data-id="${institute.id}">
                                <td>
                                    <div class="d-flex align-items-center">
                                        ${institute.image_url ? 
                                            `<img src="${institute.image_url}" alt="${institute.name_ko}" class="institute-thumb me-2">` :
                                            `<div class="institute-thumb-placeholder me-2">
                                                <i class="lucide-building2"></i>
                                            </div>`
                                        }
                                        <div>
                                            <div class="fw-bold">${institute.name_ko}</div>
                                            ${institute.name_en ? `<small class="text-muted">${institute.name_en}</small>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>${institute.operating_organization || '-'}</td>
                                <td>${this.truncateText(institute.address || '-', 40)}</td>
                                <td>${institute.manager_name || '-'}</td>
                                <td>${institute.phone || '-'}</td>
                                <td>
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-sm btn-outline-primary view-details" data-id="${institute.id}">
                                            <i class="lucide-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary edit-institute" data-id="${institute.id}">
                                            <i class="lucide-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger delete-institute" data-id="${institute.id}">
                                            <i class="lucide-trash2"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        this.elements.instituteList.innerHTML = listHTML;
        this.elements.instituteList.style.display = 'block';
        
        if (this.elements.instituteGrid) {
            this.elements.instituteGrid.style.display = 'none';
        }
    }

    /**
     * 🔍 검색 처리
     */
    async handleSearch() {
        const keyword = this.elements.searchInput?.value?.trim() || '';
        
        this.searchParams = { keyword };
        await this.loadInstituteList(this.searchParams);
    }

    /**
     * 🔄 뷰 전환
     */
    switchView(view) {
        this.currentView = view;
        
        // 버튼 활성화 상태 업데이트
        if (this.elements.viewToggleGrid && this.elements.viewToggleList) {
            this.elements.viewToggleGrid.classList.toggle('active', view === 'grid');
            this.elements.viewToggleList.classList.toggle('active', view === 'list');
        }
        
        // 현재 데이터로 다시 렌더링
        if (window.InstituteCore && window.InstituteCore.getAllInstitutes) {
            const institutes = window.InstituteCore.getAllInstitutes();
            this.renderInstitutes(institutes);
        }
        
        console.log(`🔄 뷰 전환: ${view}`);
    }

    /**
     * 🖱️ 그리드 클릭 처리
     */
    handleGridClick(event) {
        const target = event.target.closest('[data-id]');
        if (!target) return;
        
        const instituteId = target.dataset.id;
        const action = this.getClickAction(event.target);
        
        this.handleInstituteAction(action, instituteId);
    }

    /**
     * 🖱️ 리스트 클릭 처리
     */
    handleListClick(event) {
        const target = event.target.closest('[data-id]');
        if (!target) return;
        
        const instituteId = target.dataset.id;
        const action = this.getClickAction(event.target);
        
        this.handleInstituteAction(action, instituteId);
    }

    /**
     * 🎯 클릭 액션 판별
     */
    getClickAction(element) {
        if (element.closest('.view-details')) return 'view';
        if (element.closest('.edit-institute')) return 'edit';
        if (element.closest('.delete-institute')) return 'delete';
        return 'view'; // 기본값
    }

    /**
     * ⚡ 학당 액션 처리
     */
    async handleInstituteAction(action, instituteId) {
        switch (action) {
            case 'view':
                await this.showInstituteDetails(instituteId);
                break;
            case 'edit':
                await this.showEditModal(instituteId);
                break;
            case 'delete':
                this.showDeleteModal(instituteId);
                break;
        }
    }

    /**
     * 👁️ 학당 상세 정보 모달
     */
    async showInstituteDetails(instituteId) {
        try {
            this.showLoading(true);
            
            const institute = await window.InstituteCore.getInstituteDetails(instituteId);
            if (!institute) {
                this.showError('학당 정보를 찾을 수 없습니다.');
                return;
            }
            
            this.renderDetailModal(institute);
            this.showModal('detail');
            
        } catch (error) {
            console.error('❌ 학당 상세 정보 로드 실패:', error);
            this.showError('학당 상세 정보를 불러오는데 실패했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 📝 상세 정보 모달 렌더링
     */
    renderDetailModal(institute) {
        if (!this.elements.detailModal) return;
        
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="lucide-building2"></i>
                    ${institute.name_ko}
                </h5>
                <button type="button" class="btn-close" onclick="window.InstituteUI.closeModal('detail')"></button>
            </div>
            <div class="modal-body">
                <div class="institute-detail-content">
                    ${institute.image_url ? `
                        <div class="institute-image-large mb-4">
                            <img src="${institute.image_url}" alt="${institute.name_ko}" class="img-fluid rounded">
                        </div>
                    ` : ''}
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-primary">기본 정보</h6>
                            ${this.renderDetailField('학당명', institute.name_ko)}
                            ${this.renderDetailField('영문명', institute.name_en)}
                            ${this.renderDetailField('운영기관', institute.operating_organization)}
                            ${this.renderDetailField('주소', institute.address)}
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-primary">연락처 정보</h6>
                            ${this.renderDetailField('대표연락처', institute.phone)}
                            ${this.renderDetailField('홈페이지/SNS', institute.website_sns, 'link')}
                            ${this.renderDetailField('담당자성명', institute.manager_name)}
                            ${this.renderDetailField('담당자연락처', institute.manager_contact)}
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-12">
                            <h6 class="text-primary">프로그램 정보</h6>
                            ${this.renderDetailField('현지적응전담인력', institute.local_adaptation_staff, 'textarea')}
                            ${this.renderDetailField('문화수업운영계획', institute.cultural_program_plan, 'textarea')}
                            ${this.renderDetailField('희망개설강좌', institute.desired_courses, 'textarea')}
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-12">
                            <h6 class="text-primary">지원 정보</h6>
                            ${this.renderDetailField('현지어구사필요수준', institute.local_language_requirement, 'textarea')}
                            ${this.renderDetailField('학당지원사항', institute.institute_support, 'textarea')}
                            ${this.renderDetailField('파견국가안전정보', institute.country_safety_info, 'textarea')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" onclick="window.InstituteUI.showEditModal('${institute.id}')">
                    <i class="lucide-edit"></i> 수정하기
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.InstituteUI.closeModal('detail')">
                    닫기
                </button>
            </div>
        `;
        
        this.elements.detailModal.innerHTML = modalContent;
    }

    /**
     * 📄 상세 필드 렌더링
     */
    renderDetailField(label, value, type = 'text') {
        if (!value) return '';
        
        let displayValue = value;
        
        if (type === 'link' && value.startsWith('http')) {
            displayValue = `<a href="${value}" target="_blank" rel="noopener">${value}</a>`;
        } else if (type === 'textarea') {
            displayValue = value.replace(/\n/g, '<br>');
        }
        
        return `
            <div class="detail-field mb-3">
                <label class="form-label fw-bold">${label}</label>
                <div class="detail-value">${displayValue}</div>
            </div>
        `;
    }

    /**
     * 🔧 유틸리티 함수들
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showLoading(show) {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = show ? 'block' : 'none';
        }
        this.isLoading = show;
    }

    showEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'block';
        }
        if (this.elements.instituteGrid) {
            this.elements.instituteGrid.style.display = 'none';
        }
        if (this.elements.instituteList) {
            this.elements.instituteList.style.display = 'none';
        }
    }

    showError(message) {
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, 'success');
        }
    }

    /**
     * 📊 통계 업데이트
     */
    async updateStatistics() {
        try {
            const institutes = window.InstituteCore?.getAllInstitutes() || [];
            
            if (this.elements.totalCount) {
                this.elements.totalCount.textContent = institutes.length;
            }
            
            if (this.elements.activeCount) {
                this.elements.activeCount.textContent = institutes.length;
            }
            
        } catch (error) {
            console.error('❌ 통계 업데이트 실패:', error);
        }
    }

    /**
     * 🔄 데이터 새로고침
     */
    async refreshData() {
        console.log('🔄 데이터 새로고침...');
        
        // 캐시 클리어
        if (window.InstituteCore && window.InstituteCore.clearCache) {
            window.InstituteCore.clearCache();
        }
        
        // 데이터 다시 로드
        await this.loadInstituteList(this.searchParams);
        await this.updateStatistics();
        
        this.showSuccess('데이터가 새로고침되었습니다.');
    }

    /**
     * 📤 데이터 내보내기
     */
    async exportData() {
        console.log('📤 데이터 내보내기 (구현 예정)');
        this.showError('데이터 내보내기 기능은 추후 구현 예정입니다.');
    }

    /**
     * 🖱️ 이벤트 리스너 관리
     */
    addEventListener(element, event, handler) {
        if (!element) return;
        
        element.addEventListener(event, handler);
        
        // 메모리 누수 방지를 위한 참조 저장
        const key = `${element.tagName}-${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ element, event, handler });
    }

    /**
     * 🗑️ 이벤트 리스너 정리
     */
    cleanup() {
        for (const [key, listeners] of this.eventListeners) {
            for (const { element, event, handler } of listeners) {
                element.removeEventListener(event, handler);
            }
        }
        this.eventListeners.clear();
        console.log('🗑️ InstituteUI 이벤트 리스너 정리 완료');
    }

    /**
     * 🚪 모달 관리 (placeholder - 추후 구현)
     */
    showModal(modalType) {
        console.log(`🚪 모달 표시: ${modalType} (구현 예정)`);
    }

    closeModal(modalType) {
        console.log(`🚪 모달 닫기: ${modalType} (구현 예정)`);
    }

    closeAllModals() {
        console.log('🚪 모든 모달 닫기 (구현 예정)');
    }

    showAddModal() {
        console.log('➕ 학당 추가 모달 (구현 예정)');
    }

    showEditModal(instituteId) {
        console.log(`✏️ 학당 수정 모달: ${instituteId} (구현 예정)`);
    }

    showDeleteModal(instituteId) {
        console.log(`🗑️ 학당 삭제 모달: ${instituteId} (구현 예정)`);
    }

    /**
     * 📊 UI 모듈 상태
     */
    getUIStatus() {
        return {
            current_view: this.currentView,
            selected_institute: this.selectedInstitute,
            edit_mode: this.editMode,
            is_loading: this.isLoading,
            search_params: this.searchParams,
            event_listeners_count: this.eventListeners.size,
            module_version: '4.4.0'
        };
    }
}

// 🌐 전역 인스턴스 생성
window.InstituteUI = new InstituteUI();

console.log('🎨 InstituteUI 모듈 로드 완료 (v4.4.0)');
