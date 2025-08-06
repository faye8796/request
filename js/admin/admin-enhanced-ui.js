// 관리자 향상된 UI 모듈 v4.3.3 - 구매 완료 버튼 버그 수정
// admin-addon.js 기능을 새로운 모듈 구조로 통합
// v4.3 requests 테이블 구조 변경 완전 호환
// v4.3.3 수정: 구매 완료 버튼이 올바른 모듈 경로로 함수 호출하도록 수정

const AdminEnhancedUI = {
    // 캐시 및 상태 관리
    groupedApplicationsCache: null,
    shippingInfoCache: new Map(),
    currentSearchTerm: '',
    isInitialized: false,
    currentFilter: 'all',

    /**
     * 관리자 영수증 보기 이벤트 설정 (v11.1.0)
     */
    setupAdminReceiptEvents: function() {
        // 관리자 영수증 보기 버튼 이벤트
        document.addEventListener('click', (e) => {
            if (e.target.matches('.view-admin-receipt-btn') || 
                e.target.closest('.view-admin-receipt-btn')) {
                
                const button = e.target.closest('.view-admin-receipt-btn');
                const receiptUrl = button.getAttribute('data-receipt-url');
                
                if (receiptUrl) {
                    // 기존 영수증 보기 모달 재사용 또는 새 창에서 열기
                    if (window.AdminManager && 
                        window.AdminManager.Modals && 
                        typeof window.AdminManager.Modals.showImageModal === 'function') {
                        window.AdminManager.Modals.showImageModal(receiptUrl, '관리자 구매 영수증');
                    } else {
                        // 폴백: 새 창에서 열기
                        window.open(receiptUrl, '_blank');
                    }
                }
            }
        });
    },
    
    
    // 모듈 초기화
    init() {
        if (this.isInitialized) {
            console.log('⚠️ AdminEnhancedUI가 이미 초기화됨');
            return;
        }
        console.log('🎨 AdminEnhancedUI v4.3.3 초기화 시작 (구매 완료 버튼 버그 수정)');
        
        try {
            // 기존 AdminManager와 협업하는 방식으로 초기화
            this.enhanceExistingFunctions();
            this.setupEnhancedEventListeners();
            
            // 🆕 관리자 영수증 이벤트 설정 (v11.1.0)
            this.setupAdminReceiptEvents();
            
            this.isInitialized = true;
            console.log('✅ AdminEnhancedUI v4.3.3 초기화 완료 (관리자 영수증 지원 추가)');
        } catch (error) {
            console.error('❌ AdminEnhancedUI 초기화 실패:', error);
        }
    },

    // 기존 함수들을 확장하는 방식 (오버라이드 대신)
    enhanceExistingFunctions() {
        console.log('🔧 기존 AdminManager 함수들 확장 중...');
        
        try {
            if (window.AdminManager) {
                // loadApplications 함수를 감싸서 확장
                if (AdminManager.loadApplications) {
                    const originalLoadApplications = AdminManager.loadApplications.bind(AdminManager);
                    AdminManager.loadApplications = async (...args) => {
                        try {
                            // 원본 함수 실행
                            await originalLoadApplications(...args);
                            // 향상된 기능 추가
                            await this.loadApplicationsWithShipping();
                        } catch (error) {
                            console.error('❌ loadApplications 확장 실패:', error);
                        }
                    };
                }

                // renderApplications 함수를 감싸서 확장
                if (AdminManager.renderApplications) {
                    const originalRenderApplications = AdminManager.renderApplications.bind(AdminManager);
                    AdminManager.renderApplications = (applications) => {
                        try {
                            // 향상된 UI로 렌더링
                            this.renderGroupedApplications(applications);
                        } catch (error) {
                            console.error('❌ renderApplications 확장 실패:', error);
                            // 폴백으로 원본 함수 실행
                            originalRenderApplications(applications);
                        }
                    };
                }

                console.log('✅ AdminManager 함수 확장 완료');
            }
        } catch (error) {
            console.error('❌ AdminManager 함수 확장 실패:', error);
        }
    },

    // 향상된 이벤트 리스너 설정
    setupEnhancedEventListeners() {
        console.log('🔧 향상된 이벤트 리스너 설정 시작');

        try {
            // 검색 기능 향상 (debounce 적용)
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                // 기존 이벤트 리스너 제거 후 새로 설정
                const newSearchInput = searchInput.cloneNode(true);
                searchInput.parentNode.replaceChild(newSearchInput, searchInput);
                
                newSearchInput.addEventListener('input', this.debounce((e) => {
                    this.handleEnhancedSearch(e.target.value);
                }, 300));
            }
            
            // 🆕 여기에 추가
            this.setupStatusFilterTabs();
            
            console.log('✅ 향상된 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 실패:', error);
        }
    },

    // 🆕 여기서부터 새로운 메서드들 추가
    // 상태별 필터 탭 설정
    setupStatusFilterTabs() {
        console.log('🎯 상태별 필터 탭 설정 시작');

        try {
            const filterTabs = document.querySelectorAll('.filter-tab');
            if (filterTabs.length === 0) {
                console.warn('⚠️ 필터 탭을 찾을 수 없음');
                return;
            }

            filterTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filter = e.target.closest('button').dataset.filter;
                    console.log('🎯 필터 탭 클릭:', filter);
                    this.handleStatusFilter(filter);
                });
            });

            console.log('✅ 상태별 필터 탭 설정 완료:', filterTabs.length, '개');
        } catch (error) {
            console.error('❌ 필터 탭 설정 실패:', error);
        }
    },

    // 상태별 필터 처리
    handleStatusFilter(filter) {
        console.log('🎯 상태별 필터 처리 시작:', filter);

        try {
            // 탭 활성화 상태 변경
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });

            const activeTab = document.querySelector(`[data-filter="${filter}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            // 현재 필터 상태 저장
            this.currentFilter = filter;

            if (filter === 'all') {
                // 기존 학생별 그룹화 표시
                console.log('📋 학생별 그룹화 표시');
                if (this.groupedApplicationsCache) {
                    this.renderGroupedApplications(this.groupedApplicationsCache);
                }
            } else {
                // 상태별 아이템 목록 표시
                console.log('📋 상태별 아이템 표시:', filter);
                this.renderStatusFilteredItems(filter);
            }

            console.log('✅ 상태별 필터 처리 완료');
        } catch (error) {
            console.error('❌ 상태별 필터 처리 실패:', error);
        }
    },

    // 상태별 아이템 렌더링
    renderStatusFilteredItems(status) {
        console.log('📋 상태별 아이템 렌더링 시작:', status);

        try {
            if (!this.groupedApplicationsCache) {
                console.warn('⚠️ 캐시된 데이터가 없음');
                const container = document.getElementById('adminApplications');
                if (container) {
                    container.innerHTML = '<div class="no-results"><p>데이터를 먼저 로드해주세요.</p></div>';
                }
                return;
            }

            // 모든 학생의 해당 상태 아이템들 수집
            const filteredItems = [];
            this.groupedApplicationsCache.forEach(studentGroup => {
                studentGroup.applications.forEach(application => {
                    if (application.status === status) {
                        filteredItems.push({
                            ...application,
                            studentInfo: studentGroup.studentInfo,
                            shippingInfo: studentGroup.shippingInfo,
                            budgetInfo: studentGroup.budgetInfo
                        });
                    }
                });
            });

            console.log('📊 필터된 아이템 수:', filteredItems.length);

            // 최신순 정렬 (온라인 구매 우선)
            filteredItems.sort((a, b) => {
                // 온라인 구매 우선
                if (a.purchase_type === 'online' && b.purchase_type === 'offline') return -1;
                if (a.purchase_type === 'offline' && b.purchase_type === 'online') return 1;

                // 같은 타입이면 최신순
                return new Date(b.created_at) - new Date(a.created_at);
            });

            const container = document.getElementById('adminApplications');
            if (!container) {
                console.error('❌ adminApplications 컨테이너를 찾을 수 없음');
                return;
            }

            if (filteredItems.length === 0) {
                container.innerHTML = `
                    <div class="no-results">
                        <i data-lucide="search" class="no-results-icon"></i>
                        <p>${this.getStatusText(status)} 상태의 아이템이 없습니다.</p>
                        <button class="btn secondary" onclick="window.AdminEnhancedUI.handleStatusFilter('all')">
                            <i data-lucide="list"></i>
                            전체 보기로 돌아가기
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="status-filtered-header">
                        <h3>
                            <i data-lucide="${this.getStatusIcon(status)}"></i>
                            ${this.getStatusText(status)} 아이템 목록 (${filteredItems.length}개)
                        </h3>
                        <p class="filter-description">
                            ${this.getFilterDescription(status)}
                        </p>
                    </div>
                    <div class="filtered-items-list">
                        ${filteredItems.map(item => this.createFilteredItemCard(item)).join('')}
                    </div>
                `;
            }

            // 아이콘 재생성 및 이벤트 설정
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            this.setupFilteredItemListeners();

            console.log('✅ 상태별 아이템 렌더링 완료');

        } catch (error) {
            console.error('❌ 상태별 아이템 렌더링 실패:', error);

            // 에러 발생시 전체 보기로 복원
            const container = document.getElementById('adminApplications');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>필터링 중 오류가 발생했습니다.</p>
                        <button class="btn primary" onclick="window.AdminEnhancedUI.handleStatusFilter('all')">
                            전체 보기로 돌아가기
                        </button>
                    </div>
                `;
            }
        }
    },

    // 필터된 아이템 카드 생성
    createFilteredItemCard(item) {
        try {
            const statusClass = this.getStatusClass(item.status);
            const purchaseMethodInfo = this.getPurchaseMethodInfo(item);

            // 영수증 정보 확인
            const hasStudentReceipt = item.receipts && 
                                     item.receipts.length > 0 && 
                                     item.receipts[0].file_url;

            let receiptButton = '';
            if (hasStudentReceipt) {
                receiptButton = `
                    <button class="btn small secondary view-receipt-btn" 
                            data-request-id="${item.id}" title="영수증 보기">
                        <i data-lucide="eye"></i>
                    </button>
                `;
            }

            return `
                <div class="filtered-item-card" data-request-id="${item.id}">
                    <div class="filtered-item-header">
                        <div class="student-badge">
                            <i data-lucide="user"></i>
                            <strong>${this.escapeHtml(item.studentInfo.name)}</strong>
                            <span class="institute-info">
                                ${this.escapeHtml(item.studentInfo.sejong_institute)}
                            </span>
                        </div>
                        <div class="item-date">
                            <i data-lucide="calendar"></i>
                            ${this.formatDate(item.created_at)}
                        </div>
                    </div>

                    <div class="filtered-item-content">
                        <div class="item-main-info">
                            <h4 class="item-name">${this.escapeHtml(item.item_name)}</h4>
                            <p class="item-purpose">${this.escapeHtml(item.purpose || '')}</p>

                            <div class="item-details-row">
                                <span class="item-price">
                                    <i data-lucide="tag"></i>
                                    <strong>${this.formatPrice(item.price)}</strong>
                                </span>
                                <span class="purchase-method-badge ${purchaseMethodInfo.class}">
                                    <i data-lucide="${purchaseMethodInfo.icon}"></i>
                                    ${purchaseMethodInfo.text}
                                </span>
                                <span class="type-badge ${item.is_bundle ? 'bundle' : 'single'}">
                                    ${item.is_bundle ? '묶음' : '단일'}
                                </span>
                                ${receiptButton}
                                ${item.purchase_type === 'online' && item.link ? `
                                    <a href="${this.escapeHtml(item.link)}" 
                                       target="_blank" rel="noopener noreferrer"
                                       class="btn small primary purchase-link-btn"
                                       title="구매 링크 바로가기">
                                        <i data-lucide="external-link"></i>
                                        구매하기
                                    </a>
                                ` : ''}
                            </div>
                        </div>

                        <div class="filtered-item-actions">
                            ${this.createItemActionButtons(item.status, item.purchase_type)}
                            <span class="status-badge ${statusClass}">${this.getStatusText(item.status)}</span>
                        </div>
                    </div>

                    ${item.rejection_reason ? `
                        <div class="item-rejection-reason">
                            <div class="reason-label">
                                <i data-lucide="alert-circle"></i>
                                반려 사유
                            </div>
                            <div class="reason-text">${this.escapeHtml(item.rejection_reason)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            console.error('❌ 필터된 아이템 카드 생성 실패:', error);
            return `
                <div class="filtered-item-card error">
                    <p>아이템 정보를 불러올 수 없습니다.</p>
                </div>
            `;
        }
    },

    // 필터된 아이템 이벤트 설정
    setupFilteredItemListeners() {
        console.log('🔧 필터된 아이템 이벤트 설정');

        try {
            // 개별 아이템 액션 버튼들
            const actionButtons = document.querySelectorAll('.filtered-item-card .filtered-item-actions button[data-action]');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const action = e.target.closest('button').dataset.action;
                    const itemElement = e.target.closest('.filtered-item-card');
                    const requestId = itemElement.dataset.requestId;

                    console.log('🔧 필터된 아이템 액션:', action, requestId);
                    this.handleItemAction(action, requestId, e.target);
                });
            });

            // 영수증 보기 버튼들
            const receiptButtons = document.querySelectorAll('.filtered-item-card .view-receipt-btn');
            receiptButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const requestId = e.target.closest('button').dataset.requestId;
                    console.log('🔍 필터된 아이템 영수증 보기:', requestId);

                    if (window.AdminManager && 
                        window.AdminManager.Utils && 
                        typeof window.AdminManager.Utils.showViewReceiptModal === 'function') {
                        AdminManager.Utils.showViewReceiptModal(requestId);
                    } else {
                        alert('영수증 보기 기능을 사용할 수 없습니다.');
                    }
                });
            });

            console.log('✅ 필터된 아이템 이벤트 설정 완료');
        } catch (error) {
            console.error('❌ 필터된 아이템 이벤트 설정 실패:', error);
        }
    },

    // 탭 카운트 업데이트
    updateFilterTabCounts() {
        try {
            if (!this.groupedApplicationsCache) {
                console.warn('⚠️ 캐시 데이터 없음 - 탭 카운트 업데이트 건너뜀');
                return;
            }

            let counts = { pending: 0, approved: 0, rejected: 0, purchased: 0 };

            this.groupedApplicationsCache.forEach(studentGroup => {
                studentGroup.applications.forEach(app => {
                    if (counts.hasOwnProperty(app.status)) {
                        counts[app.status]++;
                    }
                });
            });

            console.log('📊 탭 카운트:', counts);

            // HTML 업데이트
            Object.keys(counts).forEach(status => {
                const element = document.getElementById(`${status}TabCount`);
                if (element) {
                    element.textContent = counts[status];
                }
            });

            // 상단 통계도 동시 업데이트
            this.updateTopStatistics(counts);

        } catch (error) {
            console.error('❌ 탭 카운트 업데이트 실패:', error);
        }
    },

    // 상단 통계 업데이트 (기존 통계와 연동)
    updateTopStatistics(counts) {
        try {
            const pendingElement = document.getElementById('pendingCount');
            const approvedElement = document.getElementById('approvedCount');
            const purchasedElement = document.getElementById('purchasedCount');

            if (pendingElement) pendingElement.textContent = counts.pending;
            if (approvedElement) approvedElement.textContent = counts.approved;
            if (purchasedElement) purchasedElement.textContent = counts.purchased;

        } catch (error) {
            console.warn('⚠️ 상단 통계 업데이트 실패:', error);
        }
    },

    // 유틸리티 메서드들
    getStatusIcon(status) {
        const iconMap = {
            'pending': 'clock',
            'approved': 'check-circle', 
            'rejected': 'x-circle',
            'purchased': 'package'
        };
        return iconMap[status] || 'help-circle';
    },

    getFilterDescription(status) {
        const descriptions = {
            'pending': '관리자 승인이 필요한 교구 신청들입니다. 우선적으로 검토해주세요.',
            'approved': '승인되었지만 아직 구매가 완료되지 않은 교구들입니다. 구매 처리를 진행해주세요.',
            'rejected': '반려된 교구 신청들입니다. 참고용으로 확인하실 수 있습니다.',
            'purchased': '구매가 완료된 교구들입니다. 처리가 완료된 항목들입니다.'
        };
        return descriptions[status] || '';
    },    
    
    
    
    // 향상된 검색 처리
    handleEnhancedSearch(searchTerm) {
        console.log('🔍 향상된 검색:', searchTerm);
        
        try {
            this.currentSearchTerm = searchTerm.trim();
            
            // AdminManager의 currentSearchTerm 동기화
            if (window.AdminManager) {
                AdminManager.currentSearchTerm = this.currentSearchTerm;
            }
            
            // 향상된 검색으로 데이터 다시 로드 (비동기 에러 처리 강화)
            this.loadApplicationsWithShipping().catch(error => {
                console.error('❌ 검색 중 오류:', error);
            });
        } catch (error) {
            console.error('❌ 검색 처리 실패:', error);
        }
    },

    // 배송지 정보 포함하여 신청 내역 로드 (에러 처리 강화)
    async loadApplicationsWithShipping() {
        try {
            console.log('📦 배송지 정보 포함하여 신청 내역 로드 시작 (v4.3.3)');
            
            if (!window.SupabaseAPI || typeof window.SupabaseAPI.searchApplications !== 'function') {
                console.warn('⚠️ SupabaseAPI.searchApplications를 찾을 수 없음');
                return;
            }
            
            // 기존 방식으로 신청 내역 가져오기 (타임아웃 설정)
            const applications = await Promise.race([
                SupabaseAPI.searchApplications(this.currentSearchTerm),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('검색 타임아웃')), 10000)
                )
            ]);
            
            // 학생별로 그룹화
            const groupedApplications = this.groupApplicationsByStudent(applications);
            
            // 배송지 정보 로드 (에러 발생시 계속 진행)
            try {
                await this.loadShippingInfoForStudents(groupedApplications);
            } catch (shippingError) {
                console.warn('⚠️ 배송지 정보 로드 실패, 계속 진행:', shippingError);
            }
            
            // 🆕 여기에 추가
            // 예산 정보 로드 (에러 발생시 계속 진행)
            try {
                await this.loadBudgetInfoForStudents(groupedApplications);
            } catch (budgetError) {
                console.warn('⚠️ 예산 정보 로드 실패, 계속 진행:', budgetError);
            }

            
            // 그룹화된 데이터 캐시
            this.groupedApplicationsCache = groupedApplications;
            
            // 🆕 탭 카운트 업데이트 추가
            this.updateFilterTabCounts();

            // 🆕 현재 필터에 따라 렌더링 결정
            if (this.currentFilter === 'all') {
                // 학생별 그룹화 렌더링
                this.renderGroupedApplications(groupedApplications);
            } else {
                // 상태별 필터 렌더링
                this.renderStatusFilteredItems(this.currentFilter);
            }
            
            
            console.log('✅ 배송지 정보 포함 신청 내역 로드 완료 (v4.3.3)');
            
        } catch (error) {
            console.error('❌ 배송지 정보 포함 신청 내역 로드 실패:', error);

            // 실패시 기본 렌더링으로 폴백
            try {
                if (window.AdminManager && typeof AdminManager.renderApplications === 'function') {
                    console.log('🔄 기본 렌더링으로 폴백');
                    const applications = await SupabaseAPI.searchApplications(this.currentSearchTerm);
                    this.renderBasicApplications(applications);
                }
            } catch (fallbackError) {
                console.error('❌ 폴백 렌더링도 실패:', fallbackError);
            }
        }
    },

    // 학생별로 신청 내역 그룹화 (v4.3 최적화)
    groupApplicationsByStudent(applications) {
        console.log('👥 학생별 신청 내역 그룹화 시작 (v4.3):', applications.length, '건');
        
        try {
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
                            purchasedCount: 0,
                            // v4.3 신청 타입별 통계 추가
                            onlineSingleCount: 0,
                            onlineBundleCount: 0,
                            offlineSingleCount: 0,
                            offlineBundleCount: 0
                        }
                    });
                }
                
                const studentGroup = groupedData.get(userKey);
                studentGroup.applications.push(application);
                
                // 통계 업데이트
                studentGroup.statistics.totalItems++;
                const amount = application.final_purchase_amount ?? application.price ?? 0;
                studentGroup.statistics.totalAmount += amount;
                
                // 상태별 통계
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
                
                // v4.3 신청 타입별 통계
                const isBundle = application.is_bundle;
                const purchaseType = application.purchase_type;
                
                if (purchaseType === 'online') {
                    if (isBundle) {
                        studentGroup.statistics.onlineBundleCount++;
                    } else {
                        studentGroup.statistics.onlineSingleCount++;
                    }
                } else if (purchaseType === 'offline') {
                    if (isBundle) {
                        studentGroup.statistics.offlineBundleCount++;
                    } else {
                        studentGroup.statistics.offlineSingleCount++;
                    }
                }
            });
            
            const groupedArray = Array.from(groupedData.values());
            
            // 신청 순서대로 정렬 (최신순), v4.3에서는 온라인 우선 정렬 추가
            groupedArray.sort((a, b) => {
                try {
                    // 먼저 온라인 신청을 우선으로 정렬 (대리구매 효율성)
                    const aOnlineCount = a.statistics.onlineSingleCount + a.statistics.onlineBundleCount;
                    const bOnlineCount = b.statistics.onlineSingleCount + b.statistics.onlineBundleCount;
                    
                    if (aOnlineCount > 0 && bOnlineCount === 0) return -1;
                    if (aOnlineCount === 0 && bOnlineCount > 0) return 1;
                    
                    // 온라인 신청이 같으면 최신순으로 정렬
                    const aLatest = Math.max(...a.applications.map(app => new Date(app.created_at).getTime()));
                    const bLatest = Math.max(...b.applications.map(app => new Date(app.created_at).getTime()));
                    return bLatest - aLatest;
                } catch (sortError) {
                    console.warn('⚠️ 정렬 중 오류:', sortError);
                    return 0;
                }
            });
            
            console.log('✅ v4.3 그룹화 완료:', groupedArray.length, '명의 학생');
            return groupedArray;
        } catch (error) {
            console.error('❌ 그룹화 실패:', error);
            return [];
        }
    },

    // 학생들의 배송지 정보 로드 (에러 처리 강화)
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
            
            // 배송지 정보 일괄 조회 (타임아웃 적용)
            const shippingInfos = await Promise.race([
                this.fetchShippingInfoBatch(studentIds),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('배송지 정보 로드 타임아웃')), 5000)
                )
            ]);
            
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
    
    // 🆕 여기에 추가
    async loadBudgetInfoForStudents(groupedApplications) {
        console.log('💰 학생 예산 정보 로드 시작');

        try {
            const studentIds = groupedApplications
                .map(group => group.studentId)
                .filter(id => id && id !== 'unknown');

            if (studentIds.length === 0) {
                console.log('⚠️ 유효한 학생 ID가 없음');
                return;
            }

            // student_budgets 테이블에서 예산 정보 조회
            const budgetInfos = await this.fetchBudgetInfoBatch(studentIds);

            // 그룹화된 데이터에 예산 정보 연결
            groupedApplications.forEach(group => {
                if (group.studentId && budgetInfos.has(group.studentId)) {
                    group.budgetInfo = budgetInfos.get(group.studentId);
                }
            });

            console.log('✅ 예산 정보 로드 완료:', budgetInfos.size, '명');

        } catch (error) {
            console.error('❌ 예산 정보 로드 실패:', error);
        }
    },

    
    // 배송지 정보 일괄 조회 (연결 안정성 강화)
    async fetchShippingInfoBatch(studentIds) {
        try {
            if (!window.SupabaseAPI || typeof window.SupabaseAPI.ensureClient !== 'function') {
                throw new Error('SupabaseAPI를 사용할 수 없습니다');
            }
            
            const client = await SupabaseAPI.ensureClient();
            
            // shipping_addresses 테이블에서 올바른 컬럼들을 조회
            const { data: shippingData, error } = await client
                .from('shipping_addresses')
                .select(`
                    user_id,
                    recipient_name,        
                    phone,                 
                    address,               
                    postal_code,           
                    delivery_note,
                    created_at,
                    updated_at
                `)
                .in('user_id', studentIds);
            
            if (error) {
                throw new Error(`배송지 정보 조회 실패: ${error.message}`);
            }
            
            // Map으로 변환하여 캐시
            const shippingMap = new Map();
            
            if (shippingData && shippingData.length > 0) {
                shippingData.forEach(shipping => {
                    try {
                        const shippingInfo = {
                            address: shipping.address || '',
                            zipcode: shipping.postal_code || '',
                            recipient: shipping.recipient_name || '',
                            phone: shipping.phone || '',
                            deliveryNote: shipping.delivery_note || '',
                            lastUpdated: shipping.updated_at || shipping.created_at
                        };
                        
                        shippingMap.set(shipping.user_id, shippingInfo);
                        this.shippingInfoCache.set(shipping.user_id, shippingInfo);
                    } catch (itemError) {
                        console.warn('⚠️ 개별 배송지 정보 처리 실패:', itemError);
                    }
                });
            }
            
            return shippingMap;
            
        } catch (error) {
            console.error('❌ 배송지 정보 일괄 조회 실패:', error);
            return new Map();
        }
    },
    
    // 🆕 예산 정보 일괄 조회 (완전한 버전)
    async fetchBudgetInfoBatch(studentIds) {
        try {
            const client = await SupabaseAPI.ensureClient();

            const { data: budgetData, error } = await client
                .from('student_budgets')
                .select(`
                    user_id,
                    allocated_budget,
                    used_budget,
                    remaining_budget,
                    updated_at,
                    created_at
                `)
                .in('user_id', studentIds);

            if (error) {
                throw new Error(`예산 정보 조회 실패: ${error.message}`);
            }

            const budgetMap = new Map();

            if (budgetData && budgetData.length > 0) {
                budgetData.forEach(budget => {
                    const budgetInfo = {
                        allocatedBudget: budget.allocated_budget || 0,
                        usedBudget: budget.used_budget || 0,
                        remainingBudget: budget.remaining_budget || 0,
                        // 🆕 계산된 정보 추가
                        usagePercentage: budget.allocated_budget > 0 ? 
                            Math.round((budget.used_budget / budget.allocated_budget) * 100) : 0,
                        remainingPercentage: budget.allocated_budget > 0 ? 
                            Math.round((budget.remaining_budget / budget.allocated_budget) * 100) : 0,
                        // 🆕 예산 상태 분석
                        budgetStatus: this.analyzeBudgetStatus(budget),
                        lastUpdated: budget.updated_at
                    };

                    budgetMap.set(budget.user_id, budgetInfo);
                });
            }

            return budgetMap;

        } catch (error) {
            console.error('❌ 예산 정보 일괄 조회 실패:', error);
            return new Map();
        }
    },

    // 🆕 예산 상태 분석 함수
    analyzeBudgetStatus(budget) {
        const allocated = budget.allocated_budget || 0;
        const used = budget.used_budget || 0;
        const remaining = budget.remaining_budget || 0;

        if (allocated === 0) return 'no-budget';

        const usageRate = (used / allocated) * 100;

        if (usageRate === 0) return 'unused';
        if (usageRate <= 50) return 'low-usage';
        if (usageRate <= 80) return 'moderate-usage';
        if (usageRate <= 100) return 'high-usage';
        return 'over-budget';
    },
    

    // 학생별 그룹화된 신청 내역 렌더링 (v4.3 개선)
    renderGroupedApplications(groupedApplications) {
        console.log('🎨 학생별 그룹화 렌더링 시작 (v4.3):', groupedApplications?.length || 0, '개 그룹');
        
        try {
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
                try {
                    lucide.createIcons();
                } catch (iconError) {
                    console.warn('⚠️ 아이콘 생성 실패:', iconError);
                }
            }
            
            // 이벤트 리스너 재설정
            this.setupGroupedActionListeners();
            
            console.log('✅ 학생별 그룹화 렌더링 완료 (v4.3)');
        } catch (error) {
            console.error('❌ 그룹화 렌더링 실패:', error);
        }
    },

    // v4.3 새로운 기능: 클립보드 복사 (에러 처리 강화)
    async copyToClipboard(text, buttonElement) {
        try {
            // navigator.clipboard이 지원되는지 확인
            if (!navigator.clipboard) {
                throw new Error('클립보드 API가 지원되지 않습니다');
            }
            
            // 타임아웃과 함께 복사 시도
            await Promise.race([
                navigator.clipboard.writeText(text),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('복사 타임아웃')), 3000)
                )
            ]);
            
            // 버튼 피드백
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i data-lucide="check"></i>';
            buttonElement.style.color = '#10b981';
            
            setTimeout(() => {
                try {
                    buttonElement.innerHTML = originalHTML;
                    buttonElement.style.color = '';
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                } catch (restoreError) {
                    console.warn('⚠️ 버튼 상태 복구 실패:', restoreError);
                }
            }, 1500);
            
        } catch (error) {
            console.error('❌ 복사 실패:', error);
            
            // 폴백: 텍스트 선택 방식 시도
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                // 성공 피드백
                const originalHTML = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i data-lucide="check"></i>';
                buttonElement.style.color = '#10b981';
                
                setTimeout(() => {
                    buttonElement.innerHTML = originalHTML;
                    buttonElement.style.color = '';
                }, 1500);
            } catch (fallbackError) {
                console.error('❌ 폴백 복사도 실패:', fallbackError);
                alert('복사에 실패했습니다. 수동으로 복사해주세요.');
            }
        }
    },

    // 일괄 승인 처리 (에러 처리 강화)
    async handleBulkApprove(studentId, buttonElement) {
        if (!studentId || studentId === 'unknown') {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        try {
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
            
            let successCount = 0;
            let errorCount = 0;
            
            // 각 교구를 개별적으로 승인 (연속 실행 방지)
            for (const application of pendingApplications) {
                try {
                    const result = await Promise.race([
                        SupabaseAPI.updateItemStatus(application.id, 'approved'),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('개별 승인 타임아웃')), 5000)
                        )
                    ]);
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error('개별 승인 실패:', application.item_name, result.message);
                    }
                    
                    // 각 요청 사이에 짧은 대기 시간 (서버 부하 방지)
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
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
                
                // 데이터 새로고침 (에러 처리)
                try {
                    await this.refreshData();
                } catch (refreshError) {
                    console.warn('⚠️ 데이터 새로고침 실패:', refreshError);
                }
                
            } else {
                alert('승인 처리 중 오류가 발생했습니다.');
            }
            
        } catch (error) {
            console.error('❌ 일괄 승인 처리 오류:', error);
            alert('일괄 승인 처리 중 오류가 발생했습니다.');
        } finally {
            // 버튼 상태 복구
            try {
                buttonElement.innerHTML = originalText;
                buttonElement.disabled = false;
                
                // 아이콘 재생성
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            } catch (restoreError) {
                console.warn('⚠️ 버튼 상태 복구 실패:', restoreError);
            }
        }
    },

    // 데이터 새로고침 (에러 처리 강화)
    async refreshData() {
        console.log('🔄 데이터 새로고침 시작 (v4.3.3)');
        
        try {
            const refreshPromises = [];
            
            // AdminManager의 기본 데이터들 새로고침
            if (window.AdminManager) {
                if (typeof AdminManager.loadStatistics === 'function') {
                    refreshPromises.push(AdminManager.loadStatistics().catch(e => console.warn('통계 로드 실패:', e)));
                }
                if (typeof AdminManager.loadBudgetOverview === 'function') {
                    refreshPromises.push(AdminManager.loadBudgetOverview().catch(e => console.warn('예산 로드 실패:', e)));
                }
                if (typeof AdminManager.loadLessonPlanManagement === 'function') {
                    refreshPromises.push(AdminManager.loadLessonPlanManagement().catch(e => console.warn('수업계획 로드 실패:', e)));
                }
            }
            
            // 모든 새로고침 작업을 병렬로 실행
            await Promise.allSettled(refreshPromises);
            
            // 향상된 신청 내역 다시 로드
            await this.loadApplicationsWithShipping();
            
            console.log('✅ 데이터 새로고침 완료 (v4.3.3)');
            
        } catch (error) {
            console.error('❌ 데이터 새로고침 실패:', error);
        }
    },

    // v4.3 새로운 기능: 비밀번호 표시/숨기기
    togglePasswordVisibility(button) {
        try {
            const password = button.dataset.password;
            const passwordField = button.parentElement.querySelector('.password-field');
            const icon = button.querySelector('i');
            
            if (passwordField.textContent === '••••••••') {
                // 비밀번호 표시
                passwordField.textContent = password;
                icon.setAttribute('data-lucide', 'eye-off');
            } else {
                // 비밀번호 숨기기
                passwordField.textContent = '••••••••';
                icon.setAttribute('data-lucide', 'eye');
            }
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('❌ 비밀번호 토글 실패:', error);
        }
    },

    // 신청 목록 토글
    toggleApplicationsList(toggleBtn) {
        try {
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
        } catch (error) {
            console.error('❌ 목록 토글 실패:', error);
        }
    },

    // 🔧 v4.3.3 수정: 개별 아이템 액션 처리 - 올바른 모듈 경로로 함수 호출
    async handleItemAction(action, requestId, buttonElement) {
        try {
            console.log('🔧 아이템 액션 처리 (v4.3.3):', action, requestId);
            
            // AdminManager의 올바른 모듈 경로 사용
            if (window.AdminManager && AdminManager.Applications) {
                switch(action) {
                    case 'approve':
                        if (typeof AdminManager.Applications.approveItem === 'function') {
                            console.log('✅ 승인 처리 시작');
                            await AdminManager.Applications.approveItem(requestId, buttonElement);
                        } else {
                            console.error('❌ AdminManager.Applications.approveItem 함수를 찾을 수 없음');
                        }
                        break;
                    case 'reject':
                        if (typeof AdminManager.Applications.rejectItem === 'function') {
                            console.log('❌ 반려 처리 시작');
                            await AdminManager.Applications.rejectItem(requestId, buttonElement);
                        } else {
                            console.error('❌ AdminManager.Applications.rejectItem 함수를 찾을 수 없음');
                        }
                        break;
                    case 'purchase':
                        if (typeof AdminManager.Applications.markAsPurchased === 'function') {
                            console.log('🛒 구매 완료 처리 시작 (v4.3.3 수정)');
                            await AdminManager.Applications.markAsPurchased(requestId, buttonElement);
                        } else {
                            console.error('❌ AdminManager.Applications.markAsPurchased 함수를 찾을 수 없음');
                        }
                        break;
                    default:
                        console.warn('⚠️ 알 수 없는 액션:', action);
                }
                
                // 액션 완료 후 데이터 새로고침 (에러 처리)
                setTimeout(() => {
                    this.refreshData().catch(error => {
                        console.warn('⚠️ 액션 후 새로고침 실패:', error);
                    });
                }, 1000);
            } else {
                console.error('❌ AdminManager.Applications 모듈을 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ 아이템 액션 처리 실패:', error);
        }
    },

    // 그룹화된 UI의 이벤트 리스너 설정 (v4.3.3 - 구매 완료 버튼 버그 수정)
    setupGroupedActionListeners() {
        console.log('🔧 그룹화 UI 이벤트 리스너 설정 (v4.3.3 - 구매 완료 버튼 버그 수정)');
        
        try {
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
            
            // 🔧 v4.3.3 수정: 개별 아이템 액션 버튼들 - 올바른 함수 경로 사용
            const actionButtons = document.querySelectorAll('.application-item .item-actions button[data-action]');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const action = e.target.closest('button').dataset.action;
                    const itemElement = e.target.closest('.application-item');
                    const requestId = itemElement.dataset.requestId;
                    
                    console.log('🔧 액션 버튼 클릭 (v4.3.3):', action, requestId);
                    this.handleItemAction(action, requestId, e.target);
                });
            });
            
            // 영수증 보기 버튼들
            const receiptButtons = document.querySelectorAll('.view-receipt-btn');
            receiptButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const requestId = e.target.closest('button').dataset.requestId;
                    console.log('🔍 영수증 보기 버튼 클릭됨 (v4.3.3):', requestId);
                    
                    // AdminManager.Utils.showViewReceiptModal로 올바른 경로 호출
                    if (window.AdminManager && 
                        window.AdminManager.Utils && 
                        typeof window.AdminManager.Utils.showViewReceiptModal === 'function') {
                        console.log('✅ AdminManager.Utils.showViewReceiptModal 호출');
                        AdminManager.Utils.showViewReceiptModal(requestId);
                    } else {
                        console.error('❌ AdminManager.Utils.showViewReceiptModal 함수를 찾을 수 없음');
                        alert('영수증 보기 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
                    }
                });
            });

            // v4.3 새로운 기능: 복사 버튼들
            const copyButtons = document.querySelectorAll('.copy-btn');
            copyButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const textToCopy = e.target.closest('button').dataset.copy;
                    this.copyToClipboard(textToCopy, e.target);
                });
            });

            // v4.3 새로운 기능: 비밀번호 토글 버튼들
            const passwordToggleBtns = document.querySelectorAll('.toggle-password-btn');
            passwordToggleBtns.forEach(button => {
                button.addEventListener('click', (e) => {
                    this.togglePasswordVisibility(e.target.closest('button'));
                });
            });
            
            // 장바구니 메모 복사 버튼들
            const copyMemoBtns = document.querySelectorAll('.copy-memo-btn');
            copyMemoBtns.forEach(button => {
                button.addEventListener('click', (e) => {
                    const textToCopy = e.target.closest('button').dataset.copy;
                    this.copyToClipboard(textToCopy, e.target);
                });
            });
            
            console.log('✅ 그룹화 UI 이벤트 리스너 설정 완료 (v4.3.3 - 구매 완료 버튼 버그 수정)');
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 실패:', error);
        }
    },

    // 기본 신청 내역 렌더링 (폴백용)
    renderBasicApplications(applications) {
        console.log('📋 기본 신청 내역 렌더링 (폴백)');
        
        try {
            const container = document.getElementById('adminApplications');
            if (!container) return;

            if (!applications || applications.length === 0) {
                container.innerHTML = this.createNoResultsHTML();
                return;
            }

            container.innerHTML = '';
            
            applications.forEach(application => {
                try {
                    const applicationCard = this.createSimpleApplicationCard(application);
                    container.appendChild(applicationCard);
                } catch (cardError) {
                    console.warn('⚠️ 개별 카드 생성 실패:', cardError);
                }
            });

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                try {
                    lucide.createIcons();
                } catch (iconError) {
                    console.warn('⚠️ 아이콘 재생성 실패:', iconError);
                }
            }
        } catch (error) {
            console.error('❌ 기본 렌더링 실패:', error);
        }
    },

    // 학생 그룹 카드 생성 (v4.3 개선)
    createStudentGroupCard(studentGroup) {
        const card = document.createElement('div');
        card.className = 'student-group-card';
        card.dataset.studentId = studentGroup.studentId;
        
        const { studentInfo, shippingInfo, budgetInfo, applications, statistics } = studentGroup;
        
        // 최신 신청일 계산
        const latestDate = Math.max(...applications.map(app => new Date(app.created_at).getTime()));
        const submittedDate = new Date(latestDate).toLocaleDateString('ko-KR');
        
        card.innerHTML = `
            ${this.createStudentHeaderHTML(studentInfo, shippingInfo, budgetInfo, statistics, submittedDate)}
            ${this.createShippingInfoHTML(shippingInfo)}
            ${this.createApplicationsListHTML(applications)}
            ${this.createStudentActionsHTML(studentGroup)}
        `;
        
        return card;
    },

    // 학생 헤더 HTML 생성 (v4.3 통계 개선)
    createStudentHeaderHTML(studentInfo, shippingInfo, budgetInfo, statistics, submittedDate) {
        // v4.3 신청 타입별 요약 배지 생성
        const typeBadges = [];
        if (statistics.onlineSingleCount > 0) {
            typeBadges.push(`<span class="type-summary-badge online-single">온라인 단일 ${statistics.onlineSingleCount}개</span>`);
        }
        if (statistics.onlineBundleCount > 0) {
            typeBadges.push(`<span class="type-summary-badge online-bundle">온라인 묶음 ${statistics.onlineBundleCount}개</span>`);
        }
        if (statistics.offlineSingleCount > 0) {
            typeBadges.push(`<span class="type-summary-badge offline-single">오프라인 단일 ${statistics.offlineSingleCount}개</span>`);
        }
        if (statistics.offlineBundleCount > 0) {
            typeBadges.push(`<span class="type-summary-badge offline-bundle">오프라인 묶음 ${statistics.offlineBundleCount}개</span>`);
        }

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

                    ${typeBadges.length > 0 ? `
                        <div class="student-type-summary">
                            ${typeBadges.join('')}
                        </div>
                    ` : ''}

                    <!-- 🆕 상태 배지를 타입 배지 바로 아래로 이동 -->
                    <div class="stat-badges">
                        ${statistics.pendingCount > 0 ? `<span class="stat-badge pending">${statistics.pendingCount} 대기</span>` : ''}
                        ${statistics.approvedCount > 0 ? `<span class="stat-badge approved">${statistics.approvedCount} 승인</span>` : ''}
                        ${statistics.rejectedCount > 0 ? `<span class="stat-badge rejected">${statistics.rejectedCount} 반려</span>` : ''}
                        ${statistics.purchasedCount > 0 ? `<span class="stat-badge purchased">${statistics.purchasedCount} 완료</span>` : ''}
                    </div>
                </div>

                <!-- 🆕 예산 정보 섹션을 독립적으로 배치 -->
                ${budgetInfo ? this.createBudgetInfoSection(budgetInfo, statistics) : ''}
            </div>
        `;
    },


    // 🆕 여기에 추가
    createBudgetInfoSection(budgetInfo, statistics) {
        const statusClass = this.getBudgetStatusClass(budgetInfo.budgetStatus);
        const statusText = this.getBudgetStatusText(budgetInfo.budgetStatus);

        // 🎯 현재 신청 금액(대기+승인) vs 사용 예산(승인된 것만) 비교
        const currentAppliedAmount = statistics.totalAmount; // 모든 신청 금액
        const approvedOnlyAmount = statistics.approvedCount > 0 ? 
            (budgetInfo.usedBudget || 0) : 0; // DB의 used_budget (승인된 것만)

        return `
            <div class="student-budget-section ${statusClass}">
                <div class="budget-header">
                    <h4 class="budget-title">
                        <i data-lucide="wallet"></i>
                        예산 현황
                    </h4>
                    <span class="budget-status-badge ${statusClass}">
                        <i data-lucide="${this.getBudgetStatusIcon(budgetInfo.budgetStatus)}"></i>
                        ${statusText}
                    </span>
                </div>

                <div class="budget-details">
                    <!-- 🏦 배정 예산 -->
                    <div class="budget-item allocated">
                        <div class="budget-label">
                            <i data-lucide="piggy-bank"></i>
                            배정 예산
                        </div>
                        <div class="budget-amount allocated-amount">
                            ${this.formatPrice(budgetInfo.allocatedBudget)}
                        </div>
                    </div>

                    <!-- ✅ 사용 예산 (승인된 금액) -->
                    <div class="budget-item used">
                        <div class="budget-label">
                            <i data-lucide="check-circle"></i>
                            사용 예산 (승인됨)
                        </div>
                        <div class="budget-amount used-amount">
                            ${this.formatPrice(budgetInfo.usedBudget)}
                            <span class="budget-percentage">
                                (${budgetInfo.usagePercentage}%)
                            </span>
                        </div>
                    </div>

                    <!-- 💰 잔여 예산 -->
                    <div class="budget-item remaining">
                        <div class="budget-label">
                            <i data-lucide="coins"></i>
                            잔여 예산
                        </div>
                        <div class="budget-amount remaining-amount">
                            ${this.formatPrice(budgetInfo.remainingBudget)}
                            <span class="budget-percentage">
                                (${budgetInfo.remainingPercentage}%)
                            </span>
                        </div>
                    </div>

                    <!-- 📊 현재 신청 금액 (참고용) -->
                    <div class="budget-item applied">
                        <div class="budget-label">
                            <i data-lucide="shopping-cart"></i>
                            현재 신청 금액
                            <small>(대기+승인)</small>
                        </div>
                        <div class="budget-amount applied-amount">
                            ${this.formatPrice(currentAppliedAmount)}
                            ${budgetInfo.allocatedBudget > 0 ? `
                                <span class="budget-percentage">
                                    (${Math.round((currentAppliedAmount / budgetInfo.allocatedBudget) * 100)}%)
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- 🎯 예산 진행률 바 -->
                <div class="budget-progress-section">
                    <div class="progress-label">예산 사용 진행률</div>
                    <div class="budget-progress-bar">
                        <div class="progress-track">
                            <div class="progress-fill used-progress" 
                                 style="width: ${Math.min(budgetInfo.usagePercentage, 100)}%"></div>
                            ${currentAppliedAmount > budgetInfo.usedBudget ? `
                                <div class="progress-fill pending-progress" 
                                     style="left: ${Math.min(budgetInfo.usagePercentage, 100)}%; 
                                            width: ${Math.min(
                                                Math.round(((currentAppliedAmount - budgetInfo.usedBudget) / budgetInfo.allocatedBudget) * 100), 
                                                100 - budgetInfo.usagePercentage
                                            )}%"></div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="progress-legend">
                        <span class="legend-item used">
                            <span class="legend-color used"></span>
                            승인된 사용
                        </span>
                        ${currentAppliedAmount > budgetInfo.usedBudget ? `
                            <span class="legend-item pending">
                                <span class="legend-color pending"></span>
                                대기 중
                            </span>
                        ` : ''}
                        <span class="legend-item remaining">
                            <span class="legend-color remaining"></span>
                            잔여
                        </span>
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

    // 신청 목록 HTML 생성 (v4.3 정렬 개선)
    createApplicationsListHTML(applications) {
        // v4.3: 온라인 구매를 먼저, 그 다음 오프라인 구매로 정렬
        const sortedApplications = [...applications].sort((a, b) => {
            // 온라인 우선 정렬
            if (a.purchase_type === 'online' && b.purchase_type === 'offline') return -1;
            if (a.purchase_type === 'offline' && b.purchase_type === 'online') return 1;
            
            // 같은 타입이면 묶음 구매 우선
            if (a.purchase_type === b.purchase_type) {
                if (a.is_bundle && !b.is_bundle) return -1;
                if (!a.is_bundle && b.is_bundle) return 1;
            }
            
            // 모든 조건이 같으면 신청일 순
            return new Date(b.created_at) - new Date(a.created_at);
        });

        const applicationsHTML = sortedApplications.map(application => {
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

    // 개별 신청 아이템 HTML 생성 (v11.1.0 - 관리자 영수증 지원 추가)
    createApplicationItemHTML(application) {
        const statusClass = this.getStatusClass(application.status);
        const statusText = this.getStatusText(application.status);
        const purchaseMethodInfo = this.getPurchaseMethodInfo(application);
        
        // v4.3 구매 관련 정보 표시
        const purchaseInfoHTML = this.createPurchaseInfoHTML(application);
        
        // admin-enhanced-ui.js - createApplicationItemHTML() 함수에서
        let receiptInfo = '';

        // 🔧 학생 영수증만 확인 (관리자 영수증은 별도 섹션에서 처리)
        const hasStudentReceipt = application.receipts && 
                                 application.receipts.length > 0 && 
                                 application.receipts[0].file_url;

        if (hasStudentReceipt) {
            receiptInfo = `
                <div class="receipt-info submitted">
                    <span class="receipt-status">
                        <i data-lucide="check-circle"></i>
                        영수증 학생 제출완료
                    </span>
                    <button class="btn small secondary view-receipt-btn" 
                            data-request-id="${application.id}">
                        <i data-lucide="eye"></i> 영수증 보기
                    </button>
                </div>
            `;
        } else if (application.purchase_type === 'offline' && application.status === 'approved') {
            receiptInfo = `
                <div class="receipt-info pending">
                    <span class="receipt-pending">
                        <i data-lucide="clock"></i>
                        영수증 제출 대기 중
                    </span>
                </div>
            `;
        }


        // 🆕 관리자 영수증 정보 표시 (v11.1.0)
        let adminReceiptInfo = '';
        if (application.status === 'purchased' && 
            application.purchase_type === 'online' && 
            application.admin_receipt_url) {
            
            // 금액 차이 계산
            const originalAmount = application.price || 0; // total_amount → price
            const finalAmount = application.final_purchase_amount || originalAmount;
            const difference = finalAmount - originalAmount;
            
            adminReceiptInfo = `
                <div class="admin-receipt-section">
                    <h5><i data-lucide="shield-check"></i> 관리자 구매 정보</h5>
                    <div class="admin-purchase-info">
                        <div class="purchase-summary-grid">
                            <div class="summary-item">
                                <label>신청 금액:</label>
                                <span class="original-amount">${this.formatPrice(originalAmount)}</span>
                            </div>
                            <div class="summary-item">
                                <label>최종 구매 금액:</label>
                                <span class="final-amount">${this.formatPrice(finalAmount)}</span>
                            </div>
                            <div class="summary-item">
                                <label>구매 날짜:</label>
                                <span class="purchase-date">${this.formatDate(application.admin_purchase_date)}</span>
                            </div>
                            ${difference !== 0 ? `
                                <div class="summary-item amount-difference">
                                    <label>금액 차이:</label>
                                    <span class="difference-amount ${difference > 0 ? 'over' : 'under'}">
                                        ${difference > 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(Math.abs(difference))}원
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="admin-receipt-actions">
                            <button class="btn small secondary view-admin-receipt-btn" 
                                    data-receipt-url="${application.admin_receipt_url}"
                                    title="관리자 구매 영수증 보기">
                                <i data-lucide="file-text"></i> 관리자 영수증 보기
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="application-item" data-request-id="${application.id}">
                <div class="item-header">
                    <div class="item-main-info">
                        <div class="item-title-row">
                            <h5 class="item-name">${this.escapeHtml(application.item_name)}</h5>
                            <div class="item-badges">
                                <span class="purchase-method-badge ${purchaseMethodInfo.class}">
                                    <i data-lucide="${purchaseMethodInfo.icon}"></i>
                                    ${purchaseMethodInfo.text}
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
                        </div>
                        
                        ${purchaseInfoHTML}
                        ${receiptInfo}
                        ${adminReceiptInfo}
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

    // v4.3 구매 정보 HTML 생성 (새로운 컬럼들 활용)
    createPurchaseInfoHTML(application) {
        const purchaseType = application.purchase_type;
        const isBundle = application.is_bundle;
        
        let purchaseInfoHTML = '';
        
        if (purchaseType === 'online') {
            // 온라인 구매 - link 컬럼 활용
            if (application.link) {
                purchaseInfoHTML += `
                    <div class="purchase-link-info">
                        <a href="${this.escapeHtml(application.link)}" 
                           target="_blank" rel="noopener noreferrer" 
                           class="item-link online-link">
                            <i data-lucide="external-link"></i>
                            구매 링크 바로가기
                        </a>
                    </div>
                `;
            }
            
            // 온라인 묶음 구매 - 새로운 account_id, account_pw 컬럼 활용
            if (isBundle && (application.account_id || application.account_pw)) {
                purchaseInfoHTML += `
                    <div class="bundle-account-info">
                        <div class="account-info-header">
                            <i data-lucide="key"></i>
                            <strong>대리구매 계정 정보</strong>
                        </div>
                        <div class="account-details">
                            ${application.account_id ? `
                                <div class="account-item">
                                    <span class="account-label">아이디:</span>
                                    <span class="account-value">${this.escapeHtml(application.account_id)}</span>
                                    <button class="copy-btn" data-copy="${this.escapeHtml(application.account_id)}" title="복사">
                                        <i data-lucide="copy"></i>
                                    </button>
                                </div>
                            ` : ''}
                            ${application.account_pw ? `
                                <div class="account-item">
                                    <span class="account-label">비밀번호:</span>
                                    <span class="account-value password-field">••••••••</span>
                                    <button class="toggle-password-btn" data-password="${this.escapeHtml(application.account_pw)}" title="비밀번호 보기/숨기기">
                                        <i data-lucide="eye"></i>
                                    </button>
                                    <button class="copy-btn" data-copy="${this.escapeHtml(application.account_pw)}" title="복사">
                                        <i data-lucide="copy"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
            
            // 🆕 온라인 묶음 구매 - store_info (장바구니 메모) 표시 개선
            if (isBundle && application.store_info) {
                purchaseInfoHTML += `
                    <div class="bundle-cart-memo-section">
                        <div class="cart-memo-header">
                            <div class="cart-memo-title">
                                <i data-lucide="shopping-cart"></i>
                                <strong>장바구니 메모</strong>
                            </div>
                            <div class="cart-memo-badge">
                                <i data-lucide="sticky-note"></i>
                                구매 참고사항
                            </div>
                        </div>
                        <div class="cart-memo-content">
                            <div class="memo-text">
                                ${this.escapeHtml(application.store_info)}
                            </div>
                            <button class="copy-memo-btn" data-copy="${this.escapeHtml(application.store_info)}" title="메모 복사">
                                <i data-lucide="copy"></i>
                                메모 복사
                            </button>
                        </div>
                    </div>
                `;
            }

        } else if (purchaseType === 'offline') {
            // 오프라인 구매 - 새로운 store_info 컬럼 활용
            if (application.store_info) {
                purchaseInfoHTML += `
                    <div class="store-info">
                        <div class="store-info-header">
                            <i data-lucide="store"></i>
                            <strong>구매처 정보</strong>
                        </div>
                        <div class="store-details">
                            ${this.escapeHtml(application.store_info)}
                        </div>
                    </div>
                `;
            }
            
            // 오프라인이어도 참고 링크가 있는 경우 표시
            if (application.link) {
                purchaseInfoHTML += `
                    <div class="reference-link-info">
                        <a href="${this.escapeHtml(application.link)}" 
                           target="_blank" rel="noopener noreferrer" 
                           class="item-link reference-link">
                            <i data-lucide="external-link"></i>
                            참고 링크
                        </a>
                    </div>
                `;
            }
        }
        
        return purchaseInfoHTML ? `<div class="purchase-info-section">${purchaseInfoHTML}</div>` : '';
    },

    // v4.3 구매 방식 정보 생성
    getPurchaseMethodInfo(application) {
        const purchaseType = application.purchase_type;
        const isBundle = application.is_bundle;
        
        if (purchaseType === 'online') {
            if (isBundle) {
                return {
                    text: '온라인 묶음구매',
                    class: 'online-bundle',
                    icon: 'shopping-basket'
                };
            } else {
                return {
                    text: '온라인 단일구매',
                    class: 'online-single', 
                    icon: 'shopping-cart'
                };
            }
        } else {
            if (isBundle) {
                return {
                    text: '오프라인 묶음구매',
                    class: 'offline-bundle',
                    icon: 'store'
                };
            } else {
                return {
                    text: '오프라인 단일구매',
                    class: 'offline-single',
                    icon: 'store'
                };
            }
        }
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

    // 간단한 신청 카드 생성 (폴백용)
    createSimpleApplicationCard(application) {
        const card = document.createElement('div');
        card.className = 'admin-application-card';
        
        const userName = application.user_profiles?.name || '알 수 없음';
        const institute = application.user_profiles?.sejong_institute || '미설정';
        const field = application.user_profiles?.field || '미설정';
        const submittedDate = this.formatDate(application.created_at);
        const statusText = this.getStatusText(application.status);
        const statusClass = this.getStatusClass(application.status);
        
        card.innerHTML = `
            <div class="admin-application-header">
                <div class="student-info">
                    <div>
                        <h3>${this.escapeHtml(userName)}</h3>
                        <p class="submission-date">신청일: ${submittedDate}</p>
                        <p class="institute-info">${this.escapeHtml(institute)} • ${this.escapeHtml(field)}</p>
                    </div>
                    <span class="item-count">1개 항목</span>
                </div>
            </div>
            
            <div class="admin-application-body">
                <div class="admin-item-card">
                    <div class="admin-item-header">
                        <div class="admin-item-info">
                            <h4>${this.escapeHtml(application.item_name)}</h4>
                            <p>${this.escapeHtml(application.purpose)}</p>
                            <div class="admin-item-details">
                                <span><strong>가격:</strong> ${this.formatPrice(application.price)}</span>
                            </div>
                        </div>
                        <div class="admin-item-actions">
                            <span class="admin-status-badge status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    },
    

    // 🆕 예산 상태 관련 유틸리티 함수들
    getBudgetStatusClass(status) {
        const statusClasses = {
            'no-budget': 'no-budget',
            'unused': 'unused',
            'low-usage': 'low-usage',
            'moderate-usage': 'moderate-usage', 
            'high-usage': 'high-usage',
            'over-budget': 'over-budget'
        };
        return statusClasses[status] || 'unknown';
    },

    getBudgetStatusText(status) {
        const statusTexts = {
            'no-budget': '예산 미배정',
            'unused': '사용 안함',
            'low-usage': '적정 사용',
            'moderate-usage': '보통 사용',
            'high-usage': '높은 사용',
            'over-budget': '예산 초과'
        };
        return statusTexts[status] || '알 수 없음';
    },

    getBudgetStatusIcon(status) {
        const statusIcons = {
            'no-budget': 'alert-circle',
            'unused': 'circle',
            'low-usage': 'check-circle',
            'moderate-usage': 'clock',
            'high-usage': 'alert-triangle',
            'over-budget': 'x-circle'
        };
        return statusIcons[status] || 'help-circle';
    },    
    
    // 결과 없음 HTML 생성
    createNoResultsHTML() {
        const message = this.currentSearchTerm ? 
            `'${this.currentSearchTerm}'에 대한 검색 결과가 없습니다.` : 
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

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
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
    },
    

};

// 전역 객체로 노출
window.AdminEnhancedUI = AdminEnhancedUI;
// 모듈 자동 초기화 (다른 admin 모듈들과 함께 로드되는 경우)
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    // DOM이 이미 로드된 경우 즉시 초기화
    setTimeout(() => {
        try {
            if (window.AdminManager) {
                AdminEnhancedUI.init();
            }
        } catch (initError) {
            console.error('❌ AdminEnhancedUI 자동 초기화 실패:', initError);
        }
    }, 100);
} else {
    // DOM 로드 대기
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            try {
                if (window.AdminManager) {
                    AdminEnhancedUI.init();
                }
            } catch (initError) {
                console.error('❌ AdminEnhancedUI 자동 초기화 실패:', initError);
            }
        }, 100);
    });
}
