// 기능 관리 전용 모듈 (admin-features.js)
AdminManager.Features = {
    systemFeatures: [
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
    ],

    // 초기화
    init() {
        console.log('⚙️ Features 모듈 초기화');
        this.setupEventListeners();
        this.loadFeatureSettings();
        return true;
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 기능 설정 버튼이 있으면 이벤트 연결
        Utils.on('#featureSettingsBtn', 'click', () => this.showFeatureSettingsModal());
        
        console.log('⚙️ Features 모듈 이벤트 리스너 설정');
    },

    // 기능 활성화 관리 로드
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
            
            this.systemFeatures.forEach(feature => {
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
                        <button class="btn small secondary" onclick="AdminManager.Features.loadFeatureSettings()" style="margin-top: 10px;">
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

    // 기능 아이템 생성
    createFeatureItem(feature, isEnabled) {
        const item = document.createElement('div');
        item.className = 'feature-item';
        item.dataset.featureId = feature.id;

        const statusClass = isEnabled ? 'active' : 'inactive';
        const statusText = isEnabled ? '활성화' : '비활성화';

        item.innerHTML = `
            <div class="feature-info">
                <div class="feature-icon">
                    <i data-lucide="${feature.icon}"></i>
                </div>
                <div class="feature-details">
                    <h4>${feature.name}</h4>
                    <p>${feature.description}</p>
                </div>
            </div>
            <div class="feature-controls">
                <span class="feature-status ${statusClass}">${statusText}</span>
                <div class="toggle-switch ${isEnabled ? 'active' : ''}" 
                     data-feature-id="${feature.id}" 
                     data-enabled="${isEnabled}"
                     title="${isEnabled ? '클릭하여 비활성화' : '클릭하여 활성화'}">
                </div>
            </div>
        `;

        return item;
    },

    // 기능 토글 이벤트 리스너 설정
    setupFeatureToggleListeners() {
        const toggleSwitches = document.querySelectorAll('.toggle-switch');
        
        toggleSwitches.forEach(toggle => {
            toggle.addEventListener('click', async (e) => {
                await this.handleFeatureToggle(e.target);
            });
        });
    },

    // 기능 토글 처리
    async handleFeatureToggle(toggleElement) {
        const featureId = toggleElement.dataset.featureId;
        const currentEnabled = toggleElement.dataset.enabled === 'true';
        const newEnabled = !currentEnabled;

        console.log(`🔄 기능 토글: ${featureId}, ${currentEnabled} → ${newEnabled}`);

        try {
            // 로딩 상태 표시
            toggleElement.classList.add('loading');
            toggleElement.style.pointerEvents = 'none';

            // feature_settings 테이블 업데이트
            if (window.SupabaseAPI && typeof window.SupabaseAPI.ensureClient === 'function') {
                const client = await SupabaseAPI.ensureClient();
                
                // 기존 레코드가 있는지 확인
                const { data: existing, error: selectError } = await client
                    .from('feature_settings')
                    .select('id')
                    .eq('feature_name', featureId)
                    .single();

                if (selectError && selectError.code !== 'PGRST116') {
                    throw new Error(`기능 설정 조회 실패: ${selectError.message}`);
                }

                if (existing) {
                    // 기존 레코드 업데이트
                    const { error: updateError } = await client
                        .from('feature_settings')
                        .update({ is_active: newEnabled })
                        .eq('feature_name', featureId);

                    if (updateError) {
                        throw new Error(`기능 설정 업데이트 실패: ${updateError.message}`);
                    }
                } else {
                    // 새 레코드 생성
                    const { error: insertError } = await client
                        .from('feature_settings')
                        .insert({
                            feature_name: featureId,
                            feature_title: this.getFeatureNameById(featureId),
                            is_active: newEnabled,
                            display_order: this.getFeatureDisplayOrder(featureId)
                        });

                    if (insertError) {
                        throw new Error(`기능 설정 생성 실패: ${insertError.message}`);
                    }
                }
            }

            // UI 업데이트
            this.updateFeatureItemUI(featureId, newEnabled);

            // 성공 피드백
            const featureName = this.getFeatureNameById(featureId);
            const statusText = newEnabled ? '활성화' : '비활성화';
            
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                Utils.showToast(`${featureName}이(가) ${statusText}되었습니다.`, 'success');
            } else {
                console.log(`✅ ${featureName} ${statusText} 완료`);
            }

            console.log(`✅ 기능 토글 완료: ${featureId} = ${newEnabled}`);

            // 다른 모듈에 알림
            AdminManager.emit('feature-toggled', { 
                featureId, 
                enabled: newEnabled, 
                featureName 
            });

        } catch (error) {
            console.error('❌ 기능 토글 실패:', error);
            
            // 에러 피드백
            if (window.Utils && typeof window.Utils.showToast === 'function') {
                Utils.showToast('기능 설정 변경 중 오류가 발생했습니다.', 'error');
            } else {
                alert('기능 설정 변경 중 오류가 발생했습니다.');
            }
        } finally {
            // 로딩 상태 해제
            toggleElement.classList.remove('loading');
            toggleElement.style.pointerEvents = '';
        }
    },

    // 기능 아이템 UI 업데이트
    updateFeatureItemUI(featureId, isEnabled) {
        const featureItem = document.querySelector(`[data-feature-id="${featureId}"]`);
        if (!featureItem) return;

        const toggleSwitch = featureItem.querySelector('.toggle-switch');
        const statusElement = featureItem.querySelector('.feature-status');

        if (toggleSwitch) {
            toggleSwitch.dataset.enabled = isEnabled.toString();
            toggleSwitch.title = isEnabled ? '클릭하여 비활성화' : '클릭하여 활성화';
            
            if (isEnabled) {
                toggleSwitch.classList.add('active');
            } else {
                toggleSwitch.classList.remove('active');
            }
        }

        if (statusElement) {
            statusElement.textContent = isEnabled ? '활성화' : '비활성화';
            statusElement.className = `feature-status ${isEnabled ? 'active' : 'inactive'}`;
        }
    },

    // 기능 ID로 이름 찾기
    getFeatureNameById(featureId) {
        const feature = this.systemFeatures.find(f => f.id === featureId);
        return feature ? feature.name : '알 수 없는 기능';
    },

    // 기능 표시 순서 가져오기
    getFeatureDisplayOrder(featureId) {
        const feature = this.systemFeatures.find(f => f.id === featureId);
        const index = this.systemFeatures.indexOf(feature);
        return index >= 0 ? index + 1 : 99;
    },

    // 기능 설정 모달 표시
    showFeatureSettingsModal() {
        console.log('⚙️ 기능 설정 모달 표시');
        
        // 모달이 없으면 생성
        AdminManager.Modals.createFeatureSettingsModal();
        
        const modal = Utils.$('#featureSettingsModal');
        if (!modal) {
            Utils.showToast('기능 설정 모달을 찾을 수 없습니다.', 'error');
            return;
        }

        // 기능 설정 로드
        this.loadFeatureSettings();
        
        modal.classList.add('active');
    },

    // 기능 설정 모달 숨김
    hideFeatureSettingsModal() {
        const modal = Utils.$('#featureSettingsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 모든 기능 활성화/비활성화
    async toggleAllFeatures(enabled) {
        console.log(`⚙️ 모든 기능 ${enabled ? '활성화' : '비활성화'} 시작`);
        
        const confirmMessage = `모든 기능을 ${enabled ? '활성화' : '비활성화'}하시겠습니까?`;
        if (!Utils.showConfirm(confirmMessage)) {
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const feature of this.systemFeatures) {
                try {
                    if (window.SupabaseAPI && typeof window.SupabaseAPI.ensureClient === 'function') {
                        const client = await SupabaseAPI.ensureClient();
                        
                        // Upsert 방식으로 처리
                        const { error } = await client
                            .from('feature_settings')
                            .upsert({
                                feature_name: feature.id,
                                feature_title: feature.name,
                                is_active: enabled,
                                display_order: this.getFeatureDisplayOrder(feature.id)
                            }, {
                                onConflict: 'feature_name'
                            });

                        if (error) {
                            throw error;
                        }

                        // UI 업데이트
                        this.updateFeatureItemUI(feature.id, enabled);
                        successCount++;
                    }
                } catch (error) {
                    console.error(`❌ ${feature.id} 설정 오류:`, error);
                    errorCount++;
                }
            }

            // 결과 메시지
            const statusText = enabled ? '활성화' : '비활성화';
            let message = `${successCount}개 기능이 ${statusText}되었습니다.`;
            if (errorCount > 0) {
                message += `\n${errorCount}개 기능 처리 중 오류가 발생했습니다.`;
            }

            Utils.showToast(message, successCount > 0 ? 'success' : 'error');

            // 다른 모듈에 알림
            AdminManager.emit('bulk-feature-toggle', { 
                enabled, 
                successCount, 
                errorCount 
            });

        } catch (error) {
            console.error('❌ 모든 기능 토글 실패:', error);
            Utils.showToast('기능 설정 변경 중 오류가 발생했습니다.', 'error');
        }
    },

    // 기능 상태 가져오기
    async getFeatureStatus(featureId) {
        try {
            if (window.SupabaseAPI && typeof window.SupabaseAPI.ensureClient === 'function') {
                const client = await SupabaseAPI.ensureClient();
                const { data, error } = await client
                    .from('feature_settings')
                    .select('is_active')
                    .eq('feature_name', featureId)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                return data ? data.is_active : true; // 기본값: 활성화
            }
        } catch (error) {
            console.error('❌ 기능 상태 조회 실패:', error);
            return true; // 오류 시 기본값: 활성화
        }
    },

    // 모든 기능 상태 가져오기
    async getAllFeatureStatuses() {
        const statuses = {};
        
        for (const feature of this.systemFeatures) {
            statuses[feature.id] = await this.getFeatureStatus(feature.id);
        }
        
        return statuses;
    },

    // 기능 사용 통계
    async getFeatureUsageStatistics() {
        try {
            // TODO: 실제 사용 통계 구현
            // 각 기능별로 사용자 접근 횟수, 최근 사용일 등 수집
            
            console.log('📊 기능 사용 통계 조회 (구현 예정)');
            return {};
            
        } catch (error) {
            console.error('❌ 기능 사용 통계 조회 실패:', error);
            return {};
        }
    },

    // 새로고침 함수
    async refresh() {
        console.log('🔄 Features 모듈 새로고침');
        await this.loadFeatureSettings();
        return true;
    }
};

// 전역 접근을 위한 별명
window.AdminFeatures = AdminManager.Features;

console.log('⚙️ AdminManager.Features 모듈 로드 완료');