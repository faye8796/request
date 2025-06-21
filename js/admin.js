// 관리자 기능 관리 모듈 (Supabase 연동) - 관계 쿼리 문제 완전 해결 + 예산 재계산 시스템 통합
const AdminManager = {
    currentSearchTerm: '',
    currentViewingLessonPlan: null, // 현재 보고 있는 수업계획

    // 초기화
    async init() {
        this.setupEventListeners();
        await this.loadStatistics();
        await this.loadBudgetOverview();
        await this.loadApplications();
        await this.loadLessonPlanManagement();
        await this.loadBudgetSettings();
    },

    // 기능 활성화 관리 로드 (student/dashboard.html과 연동)
    async loadFeatureSettings() {
        console.log('⚙️ 기능 활성화 관리 로드 시작');
        
        try {
            const featureList = document.getElementById('featureList');
            if (!featureList) {
                console.warn('⚠️ featureList 요소를 찾을 수 없습니다.');
                return;
            }

            // 로딩 상태 표시
            featureList.innerHTML = '<div class="loading-message">기능 설정을 불러오는 중...</div>';

            // student/dashboard.html과 연동되는 3개 기능 정의
            const systemFeatures = [
                {
                    id: 'institute_info',
                    name: '파견 학당 정보 조회',
                    description: '학생들이 배정받은 세종학당의 상세 정보를 확인할 수 있는 기능입니다.',
                    icon: 'building'
                },
                {
                    id: 'flight_request', 
                    name: '항공권 구매 신청',
                    description: '학생들이 파견지까지의 항공권 구매를 신청할 수 있는 기능입니다.',
                    icon: 'plane'
                },
                {
                    id: 'equipment_request',
                    name: '문화교구 신청',
                    description: '학생들이 수업에 필요한 문화 교구를 신청할 수 있는 기능입니다.',
                    icon: 'package'
                }
            ];

            // feature_settings 테이블에서 현재 설정 가져오기
            let currentSettings = {};
            try {
                if (window.SupabaseAPI && typeof window.SupabaseAPI.ensureClient === 'function') {
                    const client = await SupabaseAPI.ensureClient();
                    const { data: features, error } = await client
                        .from('feature_settings')
                        .select('feature_name, is_active');
                    
                    if (error) {
                        console.warn('⚠️ feature_settings 조회 오류:', error);
                    } else {
                        features.forEach(feature => {
                            currentSettings[feature.feature_name] = feature.is_active;
                        });
                        console.log('✅ feature_settings 로드 성공:', currentSettings);
                    }
                }
            } catch (error) {
                console.warn('⚠️ 기능 설정을 가져올 수 없어 기본값을 사용합니다:', error);
            }

            // 기능 목록 생성
            featureList.innerHTML = '';
            
            systemFeatures.forEach(feature => {
                // 현재 설정에서 상태 확인, 없으면 true가 기본값
                const isEnabled = currentSettings[feature.id] !== undefined ? 
                    currentSettings[feature.id] : true;
                
                const featureItem = this.createFeatureItem(feature, isEnabled);
                featureList.appendChild(featureItem);
            });

            // 토글 이벤트 리스너 설정
            this.setupFeatureToggleListeners();

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            console.log('✅ 기능 활성화 관리 로드 완료');

        } catch (error) {
            console.error('❌ 기능 활성화 관리 로드 실패:', error);
            
            const featureList = document.getElementById('featureList');
            if (featureList) {
                featureList.innerHTML = `
                    <div class="error-message">
                        <i data-lucide="alert-circle"></i>
                        기능 설정을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
                        <button class="btn small secondary" onclick="AdminManager.loadFeatureSettings()" style="margin-top: 10px;">
                            <i data-lucide="refresh-cw"></i> 다시 시도
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }
    },

    // 기존 admin.js가 7개 모듈로 분리되었습니다.
    // 새로운 모듈 구조를 사용하려면 js/admin/ 폴더의 모듈들을 참조하세요.
    // 이 파일은 호환성을 위한 백업 파일입니다.
};

// 호환성을 위한 레거시 함수들
console.warn('⚠️ 레거시 admin.js 파일이 로드되었습니다. 새로운 모듈 구조를 사용하는 것을 권장합니다.');
console.log('📦 새로운 모듈 위치: js/admin/{admin-core, admin-utils, admin-modals, admin-budget, admin-lesson-plans, admin-applications, admin-features}.js');

// 레거시 모드 알림
if (typeof window !== 'undefined') {
    window.ADMIN_LEGACY_MODE = true;
}