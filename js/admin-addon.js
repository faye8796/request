// 관리자 기능 확장 모듈 - 학생별 그룹화 및 배송지 정보 표시 (충돌 해결 버전)
// admin.js의 기존 함수들을 확장하여 더 나은 UI 제공

const AdminAddon = {
    // 학생별 그룹화된 데이터 캐시
    groupedApplicationsCache: null,
    
    // 배송지 정보 캐시
    shippingInfoCache: new Map(),

    // 초기화 상태 추적
    isInitialized: false,

    // AdminManager의 기존 함수들을 확장
    init() {
        if (this.isInitialized) {
            console.log('⚠️ AdminAddon이 이미 초기화됨');
            return;
        }

        console.log('🔧 AdminAddon 초기화 시작');
        
        // 기존 AdminManager 함수들을 백업
        this.backupOriginalFunctions();
        
        // 확장된 함수들로 교체
        this.overrideAdminFunctions();

        // AdminManager의 이벤트 리스너 설정 무력화
        this.disableAdminManagerEventListeners();
        
        this.isInitialized = true;
        console.log('✅ AdminAddon 초기화 완료');
    },

    // 기존 함수들 백업
    backupOriginalFunctions() {
        if (window.AdminManager) {
            this.originalRenderApplications = AdminManager.renderApplications.bind(AdminManager);
            this.originalLoadApplications = AdminManager.loadApplications.bind(AdminManager);
            this.originalSetupEventListeners = AdminManager.setupEventListeners.bind(AdminManager);
        }
    },

    // AdminManager 함수들을 확장된 버전으로 교체
    overrideAdminFunctions() {
        if (window.AdminManager) {
            // 신청 내역 렌더링을 학생별 그룹화 버전으로 교체
            AdminManager.renderApplications = this.renderGroupedApplications.bind(this);
            
            // 신청 내역 로드도 배송지 정보 포함하도록 교체
            AdminManager.loadApplications = this.loadApplicationsWithShipping.bind(this);
            
            // 이벤트 리스너 설정을 AdminAddon 버전으로 교체
            AdminManager.setupEventListeners = this.setupEnhancedEventListeners.bind(this);
            
            console.log('🔄 AdminManager 함수들이 확장 버전으로 교체됨');
        }
    },

    // AdminManager의 기존 이벤트 리스너 설정 무력화
    disableAdminManagerEventListeners() {
        // AdminManager.init()에서 setupEventListeners가 호출되는 것을 방지
        if (window.AdminManager && this.originalSetupEventListeners) {
            // 기존 이벤트 리스너가 이미 설정되었다면 제거
            this.removeExistingEventListeners();
        }
    },

    // 기존 이벤트 리스너 제거
    removeExistingEventListeners() {
        console.log('🧹 기존 이벤트 리스너 정리 중...');
        
        // 검색 입력 이벤트 리스너 제거
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        }

        // 버튼 이벤트 리스너 제거
        const buttons = ['budgetSettingsBtn', 'lessonPlanManagementBtn', 'exportBtn'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
            }
        });

        console.log('✅ 기존 이벤트 리스너 정리 완료');
    },

    // 향상된 이벤트 리스너 설정 (AdminManager.setupEventListeners 대체)
    setupEnhancedEventListeners() {
        console.log('🔧 향상된 이벤트 리스너 설정 시작');

        // 검색 기능 (debounce 적용)
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.handleEnhancedSearch(e.target.value);
            }, 300));
        }

        // Excel 내보내기
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (window.AdminManager && typeof window.AdminManager.handleExport === 'function') {
                    AdminManager.handleExport();
                }
            });
        }

        // 예산 설정 버튼
        const budgetBtn = document.getElementById('budgetSettingsBtn');
        if (budgetBtn) {
            budgetBtn.addEventListener('click', () => {
                if (window.AdminManager && typeof window.AdminManager.showBudgetSettingsModal === 'function') {
                    AdminManager.showBudgetSettingsModal();
                }
            });
        }

        // 수업계획 관리 버튼
        const lessonPlanBtn = document.getElementById('lessonPlanManagementBtn');
        if (lessonPlanBtn) {
            lessonPlanBtn.addEventListener('click', () => {
                if (window.AdminManager && typeof window.AdminManager.showLessonPlanManagementModal === 'function') {
                    AdminManager.showLessonPlanManagementModal();
                }
            });
        }

        // 키보드 단축키는 AdminManager 것을 그대로 사용
        if (this.originalSetupEventListeners) {
            // 키보드 단축키만 따로 설정
            this.setupKeyboardShortcuts();
        }

        console.log('✅ 향상된 이벤트 리스너 설정 완료');
    },

    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // AdminManager에서 처리하던 키보드 단축키들
            if (window.AdminManager && window.SupabaseAPI && SupabaseAPI.currentUserType === 'admin') {
                
                // Ctrl/Cmd + F: 검색 포커스
                if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                    event.preventDefault();
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }

                // F5: 새로고침
                if (event.key === 'F5') {
                    event.preventDefault();
                    this.refreshData();
                }

                // Ctrl/Cmd + E: Export
                if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                    event.preventDefault();
                    if (AdminManager.handleExport) {
                        AdminManager.handleExport();
                    }
                }

                // Ctrl/Cmd + B: 예산 설정 모달
                if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                    event.preventDefault();
                    if (AdminManager.showBudgetSettingsModal) {
                        AdminManager.showBudgetSettingsModal();
                    }
                }

                // Ctrl/Cmd + L: 수업계획 관리 모달
                if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
                    event.preventDefault();
                    if (AdminManager.showLessonPlanManagementModal) {
                        AdminManager.showLessonPlanManagementModal();
                    }
                }
            }
        });
    },

    // 향상된 검색 처리
    handleEnhancedSearch(searchTerm) {
        console.log('🔍 향상된 검색:', searchTerm);
        
        // AdminManager의 currentSearchTerm 동기화
        if (window.AdminManager) {
            AdminManager.currentSearchTerm = searchTerm.trim();
        }
        
        // 향상된 검색으로 데이터 다시 로드
        this.loadApplicationsWithShipping();
    },

    // 데이터 새로고침
    async refreshData() {
        console.log('🔄 데이터 새로고침 시작');
        
        try {
            // AdminManager의 기본 데이터들 새로고침
            if (window.AdminManager) {
                if (typeof AdminManager.loadStatistics === 'function') {
                    await AdminManager.loadStatistics();
                }
                if (typeof AdminManager.loadBudgetOverview === 'function') {
                    await AdminManager.loadBudgetOverview();
                }
                if (typeof AdminManager.loadLessonPlanManagement === 'function') {
                    await AdminManager.loadLessonPlanManagement();
                }
            }
            
            // 향상된 신청 내역 다시 로드
            await this.loadApplicationsWithShipping();
            
            console.log('✅ 데이터 새로고침 완료');
            
        } catch (error) {
            console.error('❌ 데이터 새로고침 실패:', error);
        }
    },

    // 배송지 정보 포함하여 신청 내역 로드
    async loadApplicationsWithShipping() {
        try {
            console.log('📦 배송지 정보 포함하여 신청 내역 로드 시작');
            
            // 기존 방식으로 신청 내역 가져오기
            const searchTerm = (window.AdminManager && AdminManager.currentSearchTerm) || '';
            const applications = await SupabaseAPI.searchApplications(searchTerm);
            
            // 학생별로 그룹화
            const groupedApplications = this.groupApplicationsByStudent(applications);
            
            // 배송지 정보 로드
            await this.loadShippingInfoForStudents(groupedApplications);
            
            // 그룹화된 데이터 캐시
            this.groupedApplicationsCache = groupedApplications;
            
            // 학생별 그룹화 렌더링
            this.renderGroupedApplications(groupedApplications);
            
            console.log('✅ 배송지 정보 포함 신청 내역 로드 완료');
            
        } catch (error) {
            console.error('❌ 배송지 정보 포함 신청 내역 로드 실패:', error);
            
            // 실패시 기존 방식으로 폴백
            console.log('🔄 기존 방식으로 폴백');
            if (this.originalLoadApplications) {
                await this.originalLoadApplications();
            }
        }
    },

    // 학생별로 신청 내역 그룹화
    groupApplicationsByStudent(applications) {
        console.log('👥 학생별 신청 내역 그룹화 시작:', applications.length, '건');
        
        const groupedData = new Map();
        
        applications.forEach(application => {
            const userId = application.user_profiles?.id || application.user_id;
            const userKey = userId || 'unknown';
            
            if (!groupedData.has(userKey)) {
                // 학생 정보 설정
                const userProfile = application.user_profiles || {};
                
                groupedData.set(userKey, {
                    studentId: userId,
                    studentInfo: {
                        name: userProfile.name || '알 수 없음',
                        sejong_institute: userProfile.sejong_institute || '미설정',
                        field: userProfile.field || '미설정',
                        email: userProfile.email || '',
                        phone: userProfile.phone || ''
                    },
                    shippingInfo: null, // 별도로 로드됨
                    applications: [],
                    statistics: {
                        totalItems: 0,
                        totalAmount: 0,
                        pendingCount: 0,
                        approvedCount: 0,
                        rejectedCount: 0,
                        purchasedCount: 0
                    }
                });
            }
            
            const studentGroup = groupedData.get(userKey);
            studentGroup.applications.push(application);
            
            // 통계 업데이트
            studentGroup.statistics.totalItems++;
            studentGroup.statistics.totalAmount += (application.price || 0);
            
            switch (application.status) {
                case 'pending':
                    studentGroup.statistics.pendingCount++;
                    break;
                case 'approved':
                    studentGroup.statistics.approvedCount++;
                    break;
                case 'rejected':
                    studentGroup.statistics.rejectedCount++;
                    break;
                case 'purchased':
                    studentGroup.statistics.purchasedCount++;
                    break;
            }
        });
        
        const groupedArray = Array.from(groupedData.values());
        
        // 신청 순서대로 정렬 (최신순)
        groupedArray.sort((a, b) => {
            const aLatest = Math.max(...a.applications.map(app => new Date(app.created_at).getTime()));
            const bLatest = Math.max(...b.applications.map(app => new Date(app.created_at).getTime()));
            return bLatest - aLatest;
        });
        
        console.log('✅ 그룹화 완료:', groupedArray.length, '명의 학생');
        return groupedArray;
    },

    // 학생들의 배송지 정보 로드
    async loadShippingInfoForStudents(groupedApplications) {
        console.log('🏠 학생 배송지 정보 로드 시작');
        
        try {
            // 모든 학생 ID 수집
            const studentIds = groupedApplications
                .map(group => group.studentId)
                .filter(id => id && id !== 'unknown');
            
            if (studentIds.length === 0) {
                console.log('⚠️ 유효한 학생 ID가 없음');
                return;
            }
            
            // 배송지 정보 일괄 조회
            const shippingInfos = await this.fetchShippingInfoBatch(studentIds);
            
            // 그룹화된 데이터에 배송지 정보 연결
            groupedApplications.forEach(group => {
                if (group.studentId && shippingInfos.has(group.studentId)) {
                    group.shippingInfo = shippingInfos.get(group.studentId);
                }
            });
            
            console.log('✅ 배송지 정보 로드 완료:', shippingInfos.size, '명');
            
        } catch (error) {
            console.error('❌ 배송지 정보 로드 실패:', error);
            // 실패해도 계속 진행 (배송지 없이)
        }
    },

    // 배송지 정보 일괄 조회
    async fetchShippingInfoBatch(studentIds) {
        try {
            if (!window.SupabaseAPI || typeof window.SupabaseAPI.ensureClient !== 'function') {
                throw new Error('SupabaseAPI를 사용할 수 없습니다');
            }
            
            const client = await SupabaseAPI.ensureClient();
            
            // user_profiles에서 배송지 정보 조회
            const { data: profiles, error } = await client
                .from('user_profiles')
                .select(`
                    id,
                    shipping_address,
                    shipping_zipcode,
                    shipping_recipient,
                    shipping_phone,
                    created_at,
                    updated_at
                `)
                .in('id', studentIds);
            
            if (error) {
                throw new Error(`배송지 정보 조회 실패: ${error.message}`);
            }
            
            // Map으로 변환하여 캐시
            const shippingMap = new Map();
            
            if (profiles && profiles.length > 0) {
                profiles.forEach(profile => {
                    const shippingInfo = {
                        address: profile.shipping_address || '',
                        zipcode: profile.shipping_zipcode || '',
                        recipient: profile.shipping_recipient || '',
                        phone: profile.shipping_phone || '',
                        lastUpdated: profile.updated_at || profile.created_at
                    };
                    
                    shippingMap.set(profile.id, shippingInfo);
                    this.shippingInfoCache.set(profile.id, shippingInfo);
                });
            }
            
            return shippingMap;
            
        } catch (error) {
            console.error('❌ 배송지 정보 일괄 조회 실패:', error);
            return new Map();
        }
    },

    // 학생별 그룹화된 신청 내역 렌더링
    renderGroupedApplications(groupedApplications) {
        console.log('🎨 학생별 그룹화 렌더링 시작:', groupedApplications.length, '개 그룹');
        
        const container = document.getElementById('adminApplications');
        if (!container) {
            console.error('❌ adminApplications 컨테이너를 찾을 수 없음');
            return;
        }
        
        if (!groupedApplications || groupedApplications.length === 0) {
            container.innerHTML = this.createNoResultsHTML();
            return;
        }
        
        container.innerHTML = '';
        
        groupedApplications.forEach(studentGroup => {
            try {
                const studentCard = this.createStudentGroupCard(studentGroup);
                container.appendChild(studentCard);
            } catch (error) {
                console.error('❌ 학생 그룹 카드 생성 실패:', error);
                // 개별 오류는 전체를 중단시키지 않음
            }
        });
        
        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 이벤트 리스너 재설정
        this.setupGroupedActionListeners();
        
        console.log('✅ 학생별 그룹화 렌더링 완료');
    },

    // 학생 그룹 카드 생성
    createStudentGroupCard(studentGroup) {
        const card = document.createElement('div');
        card.className = 'student-group-card';
        card.dataset.studentId = studentGroup.studentId;
        
        const { studentInfo, shippingInfo, applications, statistics } = studentGroup;
        
        // 최신 신청일 계산
        const latestDate = Math.max(...applications.map(app => new Date(app.created_at).getTime()));
        const submittedDate = new Date(latestDate).toLocaleDateString('ko-KR');
        
        card.innerHTML = `
            ${this.createStudentHeaderHTML(studentInfo, shippingInfo, statistics, submittedDate)}
            ${this.createShippingInfoHTML(shippingInfo)}
            ${this.createApplicationsListHTML(applications)}
            ${this.createStudentActionsHTML(studentGroup)}
        `;
        
        return card;
    },

    // 학생 헤더 HTML 생성
    createStudentHeaderHTML(studentInfo, shippingInfo, statistics, submittedDate) {
        return `
            <div class="student-group-header">
                <div class="student-main-info">
                    <div class="student-basic-info">
                        <h3 class="student-name">
                            <i data-lucide="user"></i>
                            ${this.escapeHtml(studentInfo.name)}
                        </h3>
                        <p class="student-institute">
                            ${this.escapeHtml(studentInfo.sejong_institute)} • ${this.escapeHtml(studentInfo.field)}
                        </p>
                        <p class="student-submission-date">
                            <i data-lucide="calendar"></i>
                            최근 신청일: ${submittedDate}
                        </p>
                    </div>
                    
                    <div class="student-contact-info">
                        ${studentInfo.email ? `
                            <span class="contact-item">
                                <i data-lucide="mail"></i>
                                ${this.escapeHtml(studentInfo.email)}
                            </span>
                        ` : ''}
                        ${studentInfo.phone ? `
                            <span class="contact-item">
                                <i data-lucide="phone"></i>
                                ${this.escapeHtml(studentInfo.phone)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="student-statistics">
                    <div class="stat-item total">
                        <span class="stat-label">총 신청</span>
                        <span class="stat-value">${statistics.totalItems}개</span>
                    </div>
                    <div class="stat-item amount">
                        <span class="stat-label">총 금액</span>
                        <span class="stat-value">${this.formatPrice(statistics.totalAmount)}</span>
                    </div>
                    <div class="stat-badges">
                        ${statistics.pendingCount > 0 ? `<span class="stat-badge pending">${statistics.pendingCount} 대기</span>` : ''}
                        ${statistics.approvedCount > 0 ? `<span class="stat-badge approved">${statistics.approvedCount} 승인</span>` : ''}
                        ${statistics.rejectedCount > 0 ? `<span class="stat-badge rejected">${statistics.rejectedCount} 반려</span>` : ''}
                        ${statistics.purchasedCount > 0 ? `<span class="stat-badge purchased">${statistics.purchasedCount} 완료</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // 배송지 정보 HTML 생성
    createShippingInfoHTML(shippingInfo) {
        if (!shippingInfo || !shippingInfo.address) {
            return `
                <div class="shipping-info-section missing">
                    <div class="shipping-info-header">
                        <h4>
                            <i data-lucide="map-pin"></i>
                            배송지 정보
                        </h4>
                        <span class="shipping-status missing">
                            <i data-lucide="alert-triangle"></i>
                            배송지 미등록
                        </span>
                    </div>
                    <div class="shipping-missing-notice">
                        <p>학생이 아직 배송지 정보를 등록하지 않았습니다.</p>
                        <small>교구 승인 전에 학생에게 배송지 등록을 요청해주세요.</small>
                    </div>
                </div>
            `;
        }
        
        const lastUpdated = shippingInfo.lastUpdated ? 
            new Date(shippingInfo.lastUpdated).toLocaleDateString('ko-KR') : '';
        
        return `
            <div class="shipping-info-section">
                <div class="shipping-info-header">
                    <h4>
                        <i data-lucide="map-pin"></i>
                        배송지 정보
                    </h4>
                    <span class="shipping-status registered">
                        <i data-lucide="check-circle"></i>
                        등록완료
                    </span>
                </div>
                
                <div class="shipping-details">
                    <div class="shipping-address">
                        <div class="address-row">
                            <span class="address-zipcode">[${this.escapeHtml(shippingInfo.zipcode)}]</span>
                            <span class="address-main">${this.escapeHtml(shippingInfo.address)}</span>
                        </div>
                    </div>
                    
                    <div class="shipping-recipient">
                        <div class="recipient-info">
                            <span class="recipient-name">
                                <i data-lucide="user"></i>
                                ${this.escapeHtml(shippingInfo.recipient)}
                            </span>
                            ${shippingInfo.phone ? `
                                <span class="recipient-phone">
                                    <i data-lucide="phone"></i>
                                    ${this.escapeHtml(shippingInfo.phone)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${lastUpdated ? `
                        <div class="shipping-updated">
                            <small>
                                <i data-lucide="clock"></i>
                                ${lastUpdated} 업데이트
                            </small>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // 신청 목록 HTML 생성
    createApplicationsListHTML(applications) {
        const applicationsHTML = applications.map(application => {
            return this.createApplicationItemHTML(application);
        }).join('');
        
        return `
            <div class="student-applications-section">
                <div class="applications-header">
                    <h4>
                        <i data-lucide="package"></i>
                        신청 교구 목록 (${applications.length}개)
                    </h4>
                    <button class="toggle-applications-btn" data-action="toggle">
                        <span class="toggle-text">접기</span>
                        <i data-lucide="chevron-up" class="toggle-icon"></i>
                    </button>
                </div>
                
                <div class="applications-list expanded">
                    ${applicationsHTML}
                </div>
            </div>
        `;
    },

    // 개별 신청 아이템 HTML 생성
    createApplicationItemHTML(application) {
        const statusClass = this.getStatusClass(application.status);
        const statusText = this.getStatusText(application.status);
        const purchaseMethodText = this.getPurchaseMethodText(application.purchase_type);
        const purchaseMethodClass = this.getPurchaseMethodClass(application.purchase_type);
        
        // 영수증 관련 표시
        let receiptInfo = '';
        if (application.purchase_type === 'offline') {
            if (application.status === 'purchased') {
                receiptInfo = `
                    <div class="receipt-info submitted">
                        <span class="receipt-status">
                            <i data-lucide="check-circle"></i>
                            영수증 제출완료
                        </span>
                        <button class="btn small secondary view-receipt-btn" 
                                data-request-id="${application.id}">
                            <i data-lucide="eye"></i> 영수증 보기
                        </button>
                    </div>
                `;
            } else if (application.status === 'approved') {
                receiptInfo = `
                    <div class="receipt-info pending">
                        <span class="receipt-pending">
                            <i data-lucide="clock"></i>
                            영수증 제출 대기 중
                        </span>
                    </div>
                `;
            }
        }
        
        return `
            <div class="application-item" data-request-id="${application.id}">
                <div class="item-header">
                    <div class="item-main-info">
                        <div class="item-title-row">
                            <h5 class="item-name">${this.escapeHtml(application.item_name)}</h5>
                            <div class="item-badges">
                                <span class="purchase-method-badge ${purchaseMethodClass}">
                                    <i data-lucide="${application.purchase_type === 'offline' ? 'store' : 'shopping-cart'}"></i>
                                    ${purchaseMethodText}
                                </span>
                                <span class="type-badge ${application.is_bundle ? 'bundle' : 'single'}">
                                    ${application.is_bundle ? '묶음' : '단일'}
                                </span>
                            </div>
                        </div>
                        
                        <p class="item-purpose">${this.escapeHtml(application.purpose)}</p>
                        
                        <div class="item-details">
                            <span class="item-price">
                                <i data-lucide="tag"></i>
                                <strong>${this.formatPrice(application.price)}</strong>
                            </span>
                            ${application.purchase_link ? `
                                <a href="${this.escapeHtml(application.purchase_link)}" 
                                   target="_blank" rel="noopener noreferrer" 
                                   class="item-link">
                                    <i data-lucide="external-link"></i>
                                    ${application.purchase_type === 'offline' ? '참고 링크' : '구매 링크'}
                                </a>
                            ` : ''}
                        </div>
                        
                        ${receiptInfo}
                    </div>
                    
                    <div class="item-actions">
                        ${this.createItemActionButtons(application.status, application.purchase_type)}
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                ${application.rejection_reason ? `
                    <div class="item-rejection-reason">
                        <div class="reason-label">
                            <i data-lucide="alert-circle"></i>
                            반려 사유
                        </div>
                        <div class="reason-text">${this.escapeHtml(application.rejection_reason)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 학생 액션 HTML 생성 (일괄 처리 버튼들)
    createStudentActionsHTML(studentGroup) {
        const { statistics } = studentGroup;
        
        // 일괄 처리 가능한 상황 체크
        const hasPendingItems = statistics.pendingCount > 0;
        const hasApprovedItems = statistics.approvedCount > 0;
        
        return `
            <div class="student-actions-section">
                <div class="bulk-actions">
                    ${hasPendingItems ? `
                        <button class="btn small approve bulk-approve-btn" 
                                data-action="bulk-approve" 
                                data-student-id="${studentGroup.studentId}">
                            <i data-lucide="check-circle"></i>
                            모든 대기중 교구 일괄 승인 (${statistics.pendingCount}개)
                        </button>
                    ` : ''}
                    
                    ${hasApprovedItems && statistics.pendingCount === 0 ? `
                        <span class="action-note">
                            <i data-lucide="info"></i>
                            승인된 교구가 있습니다. 개별적으로 구매완료 처리해주세요.
                        </span>
                    ` : ''}
                    
                    ${statistics.totalItems > 1 && statistics.pendingCount === 0 && statistics.approvedCount === 0 ? `
                        <span class="action-note completed">
                            <i data-lucide="check-circle"></i>
                            모든 교구 처리가 완료되었습니다.
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // 개별 아이템 액션 버튼 생성
    createItemActionButtons(status, purchaseMethod) {
        switch(status) {
            case 'pending':
                return `
                    <button class="btn small approve" data-action="approve">
                        <i data-lucide="check"></i> 승인
                    </button>
                    <button class="btn small reject" data-action="reject">
                        <i data-lucide="x"></i> 반려
                    </button>
                `;
            case 'approved':
                if (purchaseMethod === 'offline') {
                    return `
                        <span class="offline-notice">
                            <i data-lucide="info"></i>
                            영수증 제출 후 자동 완료
                        </span>
                    `;
                } else {
                    return `
                        <button class="btn small purchase" data-action="purchase">
                            <i data-lucide="shopping-cart"></i> 구매완료
                        </button>
                    `;
                }
            default:
                return '';
        }
    },

    // 그룹화된 UI의 이벤트 리스너 설정
    setupGroupedActionListeners() {
        console.log('🔧 그룹화 UI 이벤트 리스너 설정');
        
        // 토글 버튼들
        const toggleBtns = document.querySelectorAll('.toggle-applications-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleApplicationsList(e.target.closest('button'));
            });
        });
        
        // 일괄 승인 버튼들
        const bulkApproveBtns = document.querySelectorAll('.bulk-approve-btn');
        bulkApproveBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.target.closest('button').dataset.studentId;
                this.handleBulkApprove(studentId, e.target);
            });
        });
        
        // 개별 아이템 액션 버튼들
        const actionButtons = document.querySelectorAll('.application-item .item-actions button[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                const itemElement = e.target.closest('.application-item');
                const requestId = itemElement.dataset.requestId;
                
                this.handleItemAction(action, requestId, e.target);
            });
        });
        
        // 영수증 보기 버튼들
        const receiptButtons = document.querySelectorAll('.view-receipt-btn');
        receiptButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const requestId = e.target.closest('button').dataset.requestId;
                if (window.AdminManager && typeof window.AdminManager.showViewReceiptModal === 'function') {
                    AdminManager.showViewReceiptModal(requestId);
                }
            });
        });
        
        console.log('✅ 그룹화 UI 이벤트 리스너 설정 완료');
    },

    // 신청 목록 토글
    toggleApplicationsList(toggleBtn) {
        const applicationsSection = toggleBtn.closest('.student-applications-section');
        const applicationsList = applicationsSection.querySelector('.applications-list');
        const toggleText = toggleBtn.querySelector('.toggle-text');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');
        
        if (applicationsList.classList.contains('expanded')) {
            applicationsList.classList.remove('expanded');
            applicationsList.classList.add('collapsed');
            toggleText.textContent = '펼치기';
            toggleIcon.setAttribute('data-lucide', 'chevron-down');
        } else {
            applicationsList.classList.remove('collapsed');
            applicationsList.classList.add('expanded');
            toggleText.textContent = '접기';
            toggleIcon.setAttribute('data-lucide', 'chevron-up');
        }
        
        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // 일괄 승인 처리
    async handleBulkApprove(studentId, buttonElement) {
        if (!studentId || studentId === 'unknown') {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 해당 학생의 대기중인 교구들 찾기
        const studentGroup = this.groupedApplicationsCache?.find(group => group.studentId === studentId);
        if (!studentGroup) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        const pendingApplications = studentGroup.applications.filter(app => app.status === 'pending');
        if (pendingApplications.length === 0) {
            alert('승인 대기중인 교구가 없습니다.');
            return;
        }
        
        const studentName = studentGroup.studentInfo.name;
        const confirmMessage = `${studentName} 학생의 대기중인 교구 ${pendingApplications.length}개를 모두 승인하시겠습니까?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // 로딩 상태 표시
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> 처리 중...';
        buttonElement.disabled = true;
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            // 각 교구를 개별적으로 승인
            for (const application of pendingApplications) {
                try {
                    const result = await SupabaseAPI.updateItemStatus(application.id, 'approved');
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error('개별 승인 실패:', application.item_name, result.message);
                    }
                } catch (error) {
                    errorCount++;
                    console.error('개별 승인 오류:', application.item_name, error);
                }
            }
            
            // 결과 표시
            if (successCount > 0) {
                const message = errorCount > 0 ? 
                    `${successCount}개 승인 완료, ${errorCount}개 실패` :
                    `${successCount}개 교구가 모두 승인되었습니다.`;
                
                alert(message);
                
                // 데이터 새로고침
                await this.refreshData();
                
            } else {
                alert('승인 처리 중 오류가 발생했습니다.');
            }
            
        } catch (error) {
            console.error('❌ 일괄 승인 처리 오류:', error);
            alert('일괄 승인 처리 중 오류가 발생했습니다.');
        } finally {
            // 버튼 상태 복구
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    },

    // 개별 아이템 액션 처리
    async handleItemAction(action, requestId, buttonElement) {
        // AdminManager의 기존 함수 사용
        if (window.AdminManager) {
            switch(action) {
                case 'approve':
                    await AdminManager.approveItem(requestId, buttonElement);
                    break;
                case 'reject':
                    await AdminManager.rejectItem(requestId, buttonElement);
                    break;
                case 'purchase':
                    await AdminManager.markAsPurchased(requestId, buttonElement);
                    break;
            }
            
            // 액션 완료 후 데이터 새로고침
            setTimeout(() => {
                this.refreshData();
            }, 1000);
        }
    },

    // 결과 없음 HTML 생성
    createNoResultsHTML() {
        const searchTerm = (window.AdminManager && AdminManager.currentSearchTerm) || '';
        const message = searchTerm ? 
            `'${searchTerm}'에 대한 검색 결과가 없습니다.` : 
            '신청 내역이 없습니다.';
            
        return `
            <div class="no-results">
                <i data-lucide="search" class="no-results-icon"></i>
                <p>${message}</p>
            </div>
        `;
    },

    // 유틸리티 함수들
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatPrice(price) {
        if (typeof price !== 'number') return '0원';
        return new Intl.NumberFormat('ko-KR').format(price) + '원';
    },

    getStatusText(status) {
        const statusMap = {
            'pending': '승인대기',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료'
        };
        return statusMap[status] || '알 수 없음';
    },

    getStatusClass(status) {
        const classMap = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected',
            'purchased': 'purchased'
        };
        return classMap[status] || '';
    },

    getPurchaseMethodText(purchaseType) {
        return purchaseType === 'offline' ? '오프라인 구매' : '온라인 구매';
    },

    getPurchaseMethodClass(purchaseType) {
        return purchaseType === 'offline' ? 'offline' : 'online';
    },

    // 디바운스 함수
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
};

// DOM이 로드된 후 AdminAddon 초기화
document.addEventListener('DOMContentLoaded', function() {
    // AdminManager가 로드될 때까지 대기
    const initAddonWhenReady = () => {
        if (window.AdminManager && typeof window.AdminManager.renderApplications === 'function') {
            // AdminManager가 완전히 초기화된 후 AdminAddon 초기화
            setTimeout(() => {
                AdminAddon.init();
                console.log('✅ AdminAddon이 AdminManager 로드 후 초기화됨');
            }, 100); // 100ms 딜레이로 AdminManager 초기화 완료 보장
        } else {
            // 100ms 후 재시도
            setTimeout(initAddonWhenReady, 100);
        }
    };
    
    initAddonWhenReady();
});

// 전역 객체로 노출
window.AdminAddon = AdminAddon;