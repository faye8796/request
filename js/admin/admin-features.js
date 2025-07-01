// 🔧 AdminFeatureSettings - 관리자 기능 설정 모듈 v5.2.1
// 세종학당 문화인턴 지원 시스템 - 기능 활성화 관리 전용 모듈
// admin.html 내장 코드를 모듈화하여 재사용성 및 유지보수성 향상

/**
 * 관리자 기능 설정 관리 모듈
 * 
 * 🎯 주요 기능:
 * - 5개 시스템 기능의 활성화/비활성화 관리
 * - feature_settings 테이블과 연동된 DB 기반 관리
 * - 실시간 UI 업데이트 및 토글 기능
 * - 다른 관리자 페이지에서 재사용 가능한 모듈 구조
 * 
 * 🆕 v5.2.1 변경사항:
 * - admin.html 내장 FeatureSettingsManager를 모듈로 완전 이동
 * - 기존 3개 하드코딩 → 5개 기능 DB 기반 동적 관리
 * - 수료평가(exam), 국내교육 프로그램(domestic_program) 지원 추가
 * - 함수 충돌 문제 해결 및 네임스페이스 정리
 */

const AdminFeatureSettings = {
    // ===================
    // 🏗️ 기본 설정
    // ===================
    
    features: [],
    isLoaded: false,
    
    // 🆕 v5.2.1 지원 기능 정의 (DB 우선, fallback용)
    supportedFeatures: {
        'institute_info': {
            icon: 'building',
            description: '학생들이 파견학당 정보를 확인할 수 있는 기능입니다.'
        },
        'domestic_program': {
            icon: 'graduation-cap',
            description: '파견 전 국내교육 프로그램 정보를 제공하는 새로운 기능입니다.'
        },
        'exam': {
            icon: 'clipboard-check',
            description: '학생들이 문화인턴 과정 수료평가에 응시할 수 있는 기능입니다.'
        },
        'flight_request': {
            icon: 'plane',
            description: '학생들이 항공권 구매를 신청할 수 있는 기능입니다.'
        },
        'equipment_request': {
            icon: 'package',
            description: '학생들이 문화교구 구매를 신청할 수 있는 기능입니다.'
        }
    },

    // ===================
    // 🚀 초기화 및 로딩
    // ===================
    
    /**
     * 모듈 초기화
     */
    async init() {
        console.log('⚙️ AdminFeatureSettings v5.2.1 초기화 시작...');
        
        try {
            await this.loadFeatureSettings();
            this.setupEventListeners();
            console.log('✅ AdminFeatureSettings 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ AdminFeatureSettings 초기화 실패:', error);
            return false;
        }
    },

    /**
     * 🆕 기능 설정 로드 및 UI 렌더링 (v5.2.1)
     * admin.html의 FeatureSettingsManager.loadFeatureSettings()를 모듈로 이동
     */
    async loadFeatureSettings() {
        try {
            console.log('⚙️ 기능 설정 로딩 시작... (v5.2.1)');
            
            // Supabase API 확인
            if (!window.SupabaseAPI || typeof window.SupabaseAPI.getFeatureSettings !== 'function') {
                throw new Error('SupabaseAPI를 찾을 수 없습니다.');
            }

            // DB에서 기능 설정 조회
            const result = await window.SupabaseAPI.getFeatureSettings();
            
            if (result && result.success && result.data) {
                this.features = result.data;
                this.isLoaded = true;
                this.renderFeatureSettings();
                console.log('✅ 기능 설정 로딩 완료 (v5.2.1):', this.features.length, '개 기능');
            } else {
                throw new Error('기능 설정을 가져올 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ 기능 설정 로딩 실패 (v5.2.1):', error);
            this.showErrorState(error.message);
        }
    },

    /**
     * 🎨 기능 설정 UI 렌더링
     */
    renderFeatureSettings() {
        const featureList = document.getElementById('featureList');
        if (!featureList) {
            console.warn('⚠️ featureList 요소를 찾을 수 없습니다.');
            return;
        }

        // display_order로 정렬
        const sortedFeatures = [...this.features].sort((a, b) => a.display_order - b.display_order);
        
        let html = '';
        sortedFeatures.forEach(feature => {
            const iconConfig = this.getFeatureIcon(feature.feature_name);
            const isActive = feature.is_active;
            
            html += `
                <div class="feature-item ${isActive ? 'active' : 'inactive'}">
                    <div class="feature-info">
                        <div class="feature-icon ${isActive ? 'active' : 'inactive'}">
                            <i data-lucide="${iconConfig.icon}"></i>
                        </div>
                        <div class="feature-details">
                            <h4>${feature.feature_title}</h4>
                            <p>${iconConfig.description}</p>
                            ${feature.feature_name === 'domestic_program' ? '<span class="new-feature-badge" style="position: static; margin-left: 0.5rem;">NEW</span>' : ''}
                            ${feature.feature_name === 'exam' ? '<span class="new-feature-badge" style="position: static; margin-left: 0.5rem;">NEW</span>' : ''}
                        </div>
                    </div>
                    <div class="feature-controls">
                        <span class="feature-status ${isActive ? 'active' : 'inactive'}">
                            ${isActive ? '활성화' : '비활성화'}
                        </span>
                        <div class="toggle-switch ${isActive ? 'active' : ''}" 
                             onclick="AdminFeatureSettings.toggleFeature('${feature.feature_name}', ${!isActive})">
                        </div>
                    </div>
                </div>
            `;
        });
        
        featureList.innerHTML = html;
        
        // 아이콘 재초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * 🆕 v5.2.1 기능별 아이콘 및 설명 가져오기 (수료평가, 국내교육 추가)
     */
    getFeatureIcon(featureName) {
        return this.supportedFeatures[featureName] || { 
            icon: 'settings', 
            description: '시스템 기능입니다.' 
        };
    },

    /**
     * 🔄 기능 토글 처리
     */
    async toggleFeature(featureName, newState) {
        try {
            console.log(`🔄 기능 토글: ${featureName} → ${newState}`);
            
            if (!window.SupabaseAPI || typeof window.SupabaseAPI.updateFeatureSetting !== 'function') {
                throw new Error('SupabaseAPI를 찾을 수 없습니다.');
            }

            // DB 업데이트
            const result = await window.SupabaseAPI.updateFeatureSetting(featureName, newState);
            
            if (result && result.success) {
                // 로컬 상태 업데이트
                const feature = this.features.find(f => f.feature_name === featureName);
                if (feature) {
                    feature.is_active = newState;
                }
                
                // UI 재렌더링
                this.renderFeatureSettings();
                
                console.log(`✅ 기능 토글 완료: ${featureName} → ${newState}`);
                
                // 성공 메시지 표시
                const featureTitle = feature?.feature_title || (
                    featureName === 'domestic_program' ? '국내교육 프로그램' :
                    featureName === 'exam' ? '수료평가' : featureName
                );
                this.showSuccessMessage(`${featureTitle}이 ${newState ? '활성화' : '비활성화'}되었습니다.`);
            } else {
                throw new Error(result?.message || '기능 설정 업데이트에 실패했습니다.');
            }
        } catch (error) {
            console.error('❌ 기능 토글 실패:', error);
            alert(`기능 설정 변경에 실패했습니다: ${error.message}`);
            
            // UI 재렌더링으로 원상태 복구
            this.renderFeatureSettings();
        }
    },

    /**
     * 에러 상태 표시
     */
    showErrorState(message) {
        const featureList = document.getElementById('featureList');
        if (featureList) {
            featureList.innerHTML = `
                <div class="feature-item">
                    <div class="feature-info">
                        <div class="feature-icon" style="background: #fc8181;">
                            <i data-lucide="alert-circle"></i>
                        </div>
                        <div class="feature-details">
                            <h4>기능 설정 로딩 실패</h4>
                            <p>${message}</p>
                        </div>
                    </div>
                    <div class="feature-controls">
                        <button onclick="AdminFeatureSettings.loadFeatureSettings()" 
                                style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                            다시 시도
                        </button>
                    </div>
                </div>
            `;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    },

    /**
     * 성공 메시지 표시
     */
    showSuccessMessage(message) {
        const systemStatus = document.getElementById('systemStatus');
        if (systemStatus) {
            systemStatus.innerHTML = `
                <div class="alert alert-success">
                    <i data-lucide="check-circle"></i>
                    <div><strong>${message}</strong></div>
                </div>
            `;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 3초 후 제거
            setTimeout(() => {
                systemStatus.innerHTML = '';
            }, 3000);
        }
    },

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 추후 필요시 추가적인 이벤트 리스너 설정
        console.log('⚙️ AdminFeatureSettings 이벤트 리스너 설정 완료');
    },

    /**
     * 새로고침
     */
    async refresh() {
        console.log('🔄 AdminFeatureSettings 새로고침');
        await this.loadFeatureSettings();
        return true;
    },

    // ===================
    // 🛠️ 유틸리티 함수들
    // ===================
    
    /**
     * 모든 기능 활성화/비활성화
     */
    async toggleAllFeatures(enabled) {
        const confirmMessage = `모든 기능을 ${enabled ? '활성화' : '비활성화'}하시겠습니까?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const feature of this.features) {
                try {
                    await this.toggleFeature(feature.feature_name, enabled);
                    successCount++;
                } catch (error) {
                    console.error(`❌ ${feature.feature_name} 설정 오류:`, error);
                    errorCount++;
                }
            }

            // 결과 메시지
            const statusText = enabled ? '활성화' : '비활성화';
            let message = `${successCount}개 기능이 ${statusText}되었습니다.`;
            if (errorCount > 0) {
                message += `\n${errorCount}개 기능 처리 중 오류가 발생했습니다.`;
            }

            alert(message);

        } catch (error) {
            console.error('❌ 모든 기능 토글 실패:', error);
            alert('기능 설정 변경 중 오류가 발생했습니다.');
        }
    },

    /**
     * 특정 기능 상태 조회
     */
    getFeatureStatus(featureName) {
        const feature = this.features.find(f => f.feature_name === featureName);
        return feature ? feature.is_active : false;
    },

    /**
     * 모든 기능 상태 조회
     */
    getAllFeatureStatuses() {
        const statuses = {};
        this.features.forEach(feature => {
            statuses[feature.feature_name] = feature.is_active;
        });
        return statuses;
    },

    /**
     * 모듈 정보 출력
     */
    getModuleInfo() {
        return {
            name: 'AdminFeatureSettings',
            version: 'v5.2.1',
            loadedFeatures: this.features.length,
            isLoaded: this.isLoaded,
            supportedFeatures: Object.keys(this.supportedFeatures)
        };
    }
};

// ===================
// 🔄 자동 초기화 (admin.html 로드시)
// ===================

// DOMContentLoaded 이벤트에서 자동 초기화 (admin.html 전용)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // admin.html에서만 자동 초기화
        if (document.getElementById('featureList')) {
            setTimeout(() => {
                AdminFeatureSettings.init();
            }, 1000); // 다른 모듈들이 로드된 후 초기화
        }
    });
} else {
    // 이미 로드된 경우 즉시 실행
    if (document.getElementById('featureList')) {
        setTimeout(() => {
            AdminFeatureSettings.init();
        }, 1000);
    }
}

// ===================
// 🌐 전역 등록
// ===================

// 전역 접근을 위해 window 객체에 추가
window.AdminFeatureSettings = AdminFeatureSettings;

// 기존 AdminManager와의 호환성을 위한 별명 (선택적)
if (window.AdminManager) {
    window.AdminManager.FeatureSettings = AdminFeatureSettings;
}

// 개발자 도구 지원
if (typeof window !== 'undefined') {
    window.AdminFeatureSettingsDebug = {
        getInfo: () => AdminFeatureSettings.getModuleInfo(),
        getFeatures: () => AdminFeatureSettings.features,
        getStatuses: () => AdminFeatureSettings.getAllFeatureStatuses(),
        reload: () => AdminFeatureSettings.loadFeatureSettings()
    };
}

console.log('🔧 AdminFeatureSettings v5.2.1 모듈 로드 완료');
console.log('🆕 v5.2.1 신기능: 5개 기능 지원, DB 기반 동적 관리, 모듈화 구조');
console.log('✅ admin.html에서 독립된 재사용 가능한 모듈로 전환 완료');
console.log('🎯 지원 기능:', Object.keys(AdminFeatureSettings.supportedFeatures));
