// 관리자 향상된 UI 모듈 v4.3.3 - 영수증 보기 기능 자체 구현
// admin-addon.js 기능을 새로운 모듈 구조로 통합
// v4.3 requests 테이블 구조 변경 완전 호환

const AdminEnhancedUI = {
    // 캐시 및 상태 관리
    groupedApplicationsCache: null,
    shippingInfoCache: new Map(),
    receiptModalCache: new Map(),
    currentSearchTerm: '',
    isInitialized: false,

    // 모듈 초기화
    init() {
        if (this.isInitialized) {
            console.log('⚠️ AdminEnhancedUI가 이미 초기화됨');
            return;
        }

        console.log('🎨 AdminEnhancedUI v4.3.3 초기화 시작 (영수증 보기 자체 구현)');
        
        try {
            // 기존 AdminManager와 협업하는 방식으로 초기화
            this.enhanceExistingFunctions();
            this.setupEnhancedEventListeners();
            
            this.isInitialized = true;
            console.log('✅ AdminEnhancedUI v4.3.3 초기화 완료');
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

            console.log('✅ 향상된 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 실패:', error);
        }
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
            
            // 그룹화된 데이터 캐시
            this.groupedApplicationsCache = groupedApplications;
            
            // 학생별 그룹화 렌더링
            this.renderGroupedApplications(groupedApplications);
            
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
                studentGroup.statistics.totalAmount += (application.price || 0);
                
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