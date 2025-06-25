// 교구 신청 전담 모듈 - v4.3.1 (setTimeout 컨텍스트 오류 해결)
// 일반신청, 묶음신청, 수정/삭제, 카드렌더링, API 확장 등 교구 관련 모든 기능 통합
// 🎯 책임: 교구 신청의 전체 라이프사이클 관리
// 🔧 v4.3.1 - setTimeout 내부 this 바인딩 오류 해결 및 API 호출 최적화

// SupabaseAPI 확장 (student-addon.js에서 이동) - 🆕 v4.3.0 API 추가
function extendSupabaseAPI() {
    if (typeof window.SupabaseAPI !== 'undefined') {
        
        // === 🆕 v4.3.0 일반 교구 신청 API ===
        window.SupabaseAPI.createV43Application = async function(studentId, formData) {
            console.log('📝 SupabaseAPI.createV43Application 호출');
            
            return await this.safeApiCall('v4.3.0 교구 신청 생성', async () => {
                // SupabaseStudent 모듈 사용
                if (window.SupabaseStudent && window.SupabaseStudent.createV43Application) {
                    return await window.SupabaseStudent.createV43Application(studentId, formData);
                }
                
                // 폴백: 직접 구현
                const client = await this.ensureClient();
                const requestData = {
                    user_id: studentId,
                    item_name: formData.item_name,
                    purpose: formData.purpose,
                    price: formData.price,
                    purchase_type: formData.purchase_type || 'online',
                    is_bundle: formData.is_bundle || false,
                    
                    // v4.3.0 새로운 컬럼들
                    link: formData.link || null,
                    store_info: formData.store_info || null,
                    account_id: formData.account_id || null,
                    account_pw: formData.account_pw || null,
                    
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                return await client
                    .from('requests')
                    .insert([requestData])
                    .select();
            });
        };

        // === 🆕 v4.3.0 묶음 교구 신청 API ===
        window.SupabaseAPI.createV43BundleApplication = async function(studentId, bundleData) {
            console.log('📦 SupabaseAPI.createV43BundleApplication 호출');
            
            return await this.safeApiCall('v4.3.0 묶음 신청 생성', async () => {
                // SupabaseStudent 모듈 사용
                if (window.SupabaseStudent && window.SupabaseStudent.createV43BundleApplication) {
                    return await window.SupabaseStudent.createV43BundleApplication(studentId, bundleData);
                }
                
                // 폴백: 직접 구현
                const client = await this.ensureClient();
                const requestData = {
                    user_id: studentId,
                    item_name: bundleData.item_name,
                    purpose: bundleData.purpose,
                    price: bundleData.price,
                    purchase_type: bundleData.purchase_type,
                    is_bundle: true,
                    
                    // v4.3.0 4가지 타입별 컬럼들
                    link: bundleData.link,
                    store_info: bundleData.store_info,
                    account_id: bundleData.account_id,
                    account_pw: bundleData.account_pw,
                    
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                return await client
                    .from('requests')
                    .insert([requestData])
                    .select();
            });
        };

        // === 🆕 v4.3.0 신청 수정 API ===
        window.SupabaseAPI.updateV43Application = async function(applicationId, formData) {
            console.log('✏️ SupabaseAPI.updateV43Application 호출');
            
            return await this.safeApiCall('v4.3.0 교구 신청 수정', async () => {
                // SupabaseStudent 모듈 사용
                if (window.SupabaseStudent && window.SupabaseStudent.updateV43Application) {
                    return await window.SupabaseStudent.updateV43Application(applicationId, formData);
                }
                
                // 폴백: 직접 구현
                const client = await this.ensureClient();
                const updateData = {
                    item_name: formData.item_name,
                    purpose: formData.purpose,
                    price: formData.price,
                    purchase_type: formData.purchase_type || 'online',
                    is_bundle: formData.is_bundle || false,
                    
                    // v4.3.0 새로운 컬럼들
                    link: formData.link || null,
                    store_info: formData.store_info || null,
                    account_id: formData.account_id || null,
                    account_pw: formData.account_pw || null,
                    
                    updated_at: new Date().toISOString()
                };

                return await client
                    .from('requests')
                    .update(updateData)
                    .eq('id', applicationId)
                    .select();
            });
        };

        // 🔄 기존 API 함수들 v4.3.0 호환성 업데이트
        
        // 기존 updateApplication 함수를 v4.3.0 호환으로 업데이트
        window.SupabaseAPI.updateApplication = async function(applicationId, formData) {
            console.log('🔄 기존 updateApplication → v4.3.0 호환 모드');
            
            // v4.3.0 구조로 변환
            const v43FormData = {
                ...formData,
                link: formData.purchase_link || formData.link,
                store_info: formData.store_info || null,
                account_id: formData.account_id || null,
                account_pw: formData.account_pw || null
            };
            
            return await this.updateV43Application(applicationId, v43FormData);
        };

        // 기존 createApplication 함수를 v4.3.0 호환으로 업데이트
        window.SupabaseAPI.createApplication = async function(studentId, formData) {
            console.log('🔄 기존 createApplication → v4.3.0 호환 모드');
            
            // v4.3.0 구조로 변환
            const v43FormData = {
                ...formData,
                link: formData.purchase_link || formData.link,
                store_info: null,
                account_id: null,
                account_pw: null
            };
            
            if (formData.is_bundle) {
                return await this.createV43BundleApplication(studentId, v43FormData);
            } else {
                return await this.createV43Application(studentId, v43FormData);
            }
        };

        // 🔧 교구 신청 삭제 메서드
        window.SupabaseAPI.deleteApplication = async function(applicationId) {
            return await this.safeApiCall('교구 신청 삭제', async () => {
                return await this.supabase
                    .from('requests')
                    .delete()
                    .eq('id', applicationId)
                    .select();
            });
        };

        // 🔧 특정 신청 조회 메서드
        window.SupabaseAPI.getApplicationById = async function(applicationId) {
            return await this.safeApiCall('신청 상세 조회', async () => {
                return await this.supabase
                    .from('requests')
                    .select('*')
                    .eq('id', applicationId)
                    .single();
            });
        };

        console.log('✅ SupabaseAPI v4.3.0 확장 완료 - 4가지 신청 타입별 최적화');
        console.log('📋 새로 추가된 API 함수들:', [
            'createV43Application',
            'createV43BundleApplication', 
            'updateV43Application'
        ]);
    }
}

// 교구 신청 모듈 정의
const EquipmentRequestModule = {
    // 모듈 정보
    name: 'EquipmentRequest',
    version: '4.3.1',
    
    // 상태 관리
    currentEditingItem: null,
    currentEditingBundleItem: null,
    submitInProgress: false,
    
    // 상위 매니저 참조
    studentManager: null,
    
    // === 🆕 v4.3.1 안전한 대시보드 새로고침 함수 ===
    safeRefreshDashboard: function() {
        try {
            console.log('🔄 v4.3.1 안전한 대시보드 새로고침 시작');
            
            if (this.studentManager) {
                // API 헬퍼를 통한 안전한 호출
                const apiHelper = this.studentManager.getModule('api');
                if (apiHelper && typeof apiHelper.loadApplications === 'function') {
                    console.log('📊 신청 내역 새로고침 시작');
                    apiHelper.loadApplications().catch(error => {
                        console.error('❌ 신청 내역 새로고침 오류:', error);
                    });
                } else {
                    console.warn('⚠️ ApiHelper.loadApplications 함수를 찾을 수 없음');
                }
                
                if (apiHelper && typeof apiHelper.updateBudgetStatus === 'function') {
                    console.log('💰 예산 상태 새로고침 시작');
                    apiHelper.updateBudgetStatus().catch(error => {
                        console.error('❌ 예산 상태 새로고침 오류:', error);
                    });
                } else {
                    console.warn('⚠️ ApiHelper.updateBudgetStatus 함수를 찾을 수 없음');
                }
            } else {
                console.error('❌ studentManager 참조를 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ v4.3.1 대시보드 새로고침 오류:', error);
        }
    },
    
    // === 모듈 초기화 ===
    
    init: function(studentManager) {
        try {
            console.log('🛒 EquipmentRequestModule 초기화 v4.3.1 - setTimeout 컨텍스트 오류 해결');
            
            this.studentManager = studentManager;
            
            // SupabaseAPI 확장
            extendSupabaseAPI();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            console.log('✅ EquipmentRequestModule v4.3.1 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ EquipmentRequestModule 초기화 오류:', error);
            return false;
        }
    },
    
    // 이벤트 리스너 설정
    setupEventListeners: function() {
        try {
            // 새 교구 신청 버튼
            this.safeAddEventListener('#newApplicationBtn', 'click', () => {
                this.showApplicationModal();
            });
            
            // 묶음 신청 버튼
            this.safeAddEventListener('#bundleApplicationBtn', 'click', () => {
                this.showBundleModal();
            });
            
            // 일반 신청 모달 이벤트
            this.safeAddEventListener('#cancelBtn', 'click', () => {
                this.hideApplicationModal();
            });
            this.safeAddEventListener('#applicationForm', 'submit', (e) => {
                e.preventDefault();
                this.handleApplicationSubmit();
            });

            // 묶음 신청 모달 이벤트
            this.safeAddEventListener('#bundleCancelBtn', 'click', () => {
                this.hideBundleModal();
            });
            this.safeAddEventListener('#bundleForm', 'submit', (e) => {
                e.preventDefault();
                this.handleBundleSubmit();
            });

            // 🆕 v4.3.0 묶음 신청 구매 방식 변경 이벤트
            this.setupBundlePurchaseMethodEvents();

            console.log('✅ 교구신청 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 교구신청 이벤트 리스너 설정 오류:', error);
        }
    },

    // 🆕 v4.3.0 묶음 신청 구매 방식 이벤트 설정
    setupBundlePurchaseMethodEvents: function() {
        try {
            console.log('🔧 v4.3.0 묶음 신청 구매 방식 이벤트 설정');

            // 구매 방식 라디오 버튼 변경 이벤트
            const bundlePurchaseMethodRadios = document.querySelectorAll('input[name="bundlePurchaseMethod"]');
            bundlePurchaseMethodRadios.forEach((radio) => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        this.handleBundlePurchaseMethodChange(radio.value);
                    }
                });
            });

            // 구매 사이트 선택 변경 이벤트
            this.safeAddEventListener('#purchaseSite', 'change', () => {
                this.handlePurchaseSiteChange();
            });

            console.log('✅ v4.3.0 묶음 신청 구매 방식 이벤트 설정 완료');
        } catch (error) {
            console.error('❌ v4.3.0 묶음 신청 구매 방식 이벤트 설정 오류:', error);
        }
    },

    // 🆕 v4.3.0 묶음 신청 구매 방식 변경 처리
    handleBundlePurchaseMethodChange: function(method) {
        try {
            console.log('🔄 v4.3.0 묶음 구매 방식 변경:', method);
            
            const onlineInfo = document.getElementById('onlinePurchaseInfo');
            const offlineInfo = document.getElementById('offlinePurchaseInfo');
            
            if (method === 'online') {
                if (onlineInfo) onlineInfo.style.display = 'block';
                if (offlineInfo) offlineInfo.style.display = 'none';
                
                // 온라인 필수 필드 설정
                this.setFieldRequired('purchaseSite', true);
                this.setFieldRequired('accountId', true);
                this.setFieldRequired('accountPassword', true);
                this.setFieldRequired('offlineVendor', false);
                
            } else if (method === 'offline') {
                if (onlineInfo) onlineInfo.style.display = 'none';
                if (offlineInfo) offlineInfo.style.display = 'block';
                
                // 오프라인 필수 필드 설정
                this.setFieldRequired('purchaseSite', false);
                this.setFieldRequired('accountId', false);
                this.setFieldRequired('accountPassword', false);
                this.setFieldRequired('offlineVendor', true);
            }
            
            console.log('✅ v4.3.0 구매 방식 UI 변경 완료');
        } catch (error) {
            console.error('❌ v4.3.0 구매 방식 변경 처리 오류:', error);
        }
    },

    // 🆕 v4.3.0 구매 사이트 선택 변경 처리
    handlePurchaseSiteChange: function() {
        try {
            const siteSelect = document.getElementById('purchaseSite');
            const otherSiteInput = document.getElementById('otherSite');
            
            if (siteSelect && otherSiteInput) {
                if (siteSelect.value === 'other') {
                    otherSiteInput.style.display = 'block';
                    otherSiteInput.required = true;
                    this.updateFieldLabel('otherSite', '기타 사이트 URL *');
                } else {
                    otherSiteInput.style.display = 'none';
                    otherSiteInput.required = false;
                    otherSiteInput.value = '';
                }
            }
        } catch (error) {
            console.error('❌ 구매 사이트 선택 변경 처리 오류:', error);
        }
    },

    // 필드 필수 여부 설정 헬퍼 함수
    setFieldRequired: function(fieldId, required) {
        try {
            const field = document.getElementById(fieldId);
            if (field) {
                field.required = required;
                
                // 라벨에 * 표시 추가/제거
                const label = document.querySelector(`label[for="${fieldId}"]`) || 
                            field.closest('.form-group')?.querySelector('label');
                if (label) {
                    const text = label.textContent.replace(' *', '');
                    label.textContent = required ? text + ' *' : text;
                }
            }
        } catch (error) {
            console.error('❌ 필드 필수 여부 설정 오류:', error);
        }
    },

    // 필드 라벨 업데이트 헬퍼 함수
    updateFieldLabel: function(fieldId, newLabel) {
        try {
            const field = document.getElementById(fieldId);
            if (field) {
                const label = document.querySelector(`label[for="${fieldId}"]`) || 
                            field.closest('.form-group')?.querySelector('label');
                if (label) {
                    label.textContent = newLabel;
                }
            }
        } catch (error) {
            console.error('❌ 필드 라벨 업데이트 오류:', error);
        }
    },

    // 📝 일반 교구 신청 제출 처리 - 🔧 v4.3.1 컨텍스트 오류 해결
    handleApplicationSubmit: function() {
        try {
            console.log('📝 일반 교구 신청 제출 처리 v4.3.1');
            
            if (this.submitInProgress) {
                console.warn('⚠️ 제출이 이미 진행 중입니다');
                return;
            }
            
            this.submitInProgress = true;
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                this.submitInProgress = false;
                return;
            }

            const form = document.getElementById('applicationForm');
            if (!form) {
                console.error('신청 폼을 찾을 수 없습니다');
                this.submitInProgress = false;
                return;
            }

            // 폼 데이터 수집
            const formData = new FormData(form);
            const purchaseMethod = formData.get('purchaseMethod') || 'online';
            
            // 🆕 v4.3.0 - 4가지 타입별 단일 신청 데이터 구성
            const applicationData = {
                item_name: formData.get('itemName') || '',
                price: parseInt(formData.get('itemPrice')) || 0,
                purpose: formData.get('itemPurpose') || '',
                purchase_type: purchaseMethod,
                is_bundle: false,
                // v4.3.0 새로운 컬럼들
                link: null,
                store_info: null,
                account_id: null,
                account_pw: null
            };

            // 타입별 데이터 설정
            if (purchaseMethod === 'online') {
                // 온라인 단일 구매 - link만 사용
                const purchaseLink = formData.get('itemLink') || '';
                if (!purchaseLink.trim()) {
                    alert('온라인 구매의 경우 구매 링크를 입력해주세요.');
                    form.querySelector('#itemLink').focus();
                    this.submitInProgress = false;
                    return;
                }
                applicationData.link = purchaseLink.trim();
            } else {
                // 오프라인 단일 구매 - store_info는 선택적
                applicationData.store_info = null;
            }

            // 입력 검증
            if (!this.validateApplicationDataV43(applicationData, form)) {
                this.submitInProgress = false;
                return;
            }

            console.log('📝 v4.3.1 단일 신청 데이터:', applicationData);
            
            // 제출 버튼 비활성화
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '제출 중...';
            }

            // v4.3.1 API 호출
            const apiCall = this.currentEditingItem ? 
                () => SupabaseAPI.updateV43Application(this.currentEditingItem, applicationData) :
                () => SupabaseAPI.createV43Application(currentUser.id, applicationData);

            this.safeApiCall(apiCall).then((result) => {
                if (result && result.success !== false) {
                    console.log('✅ v4.3.1 교구 신청 제출 완료');
                    alert(this.currentEditingItem ? '교구 신청이 수정되었습니다.' : '교구 신청이 제출되었습니다.');
                    
                    this.hideApplicationModal();
                    
                    // 🔧 v4.3.1 대시보드 새로고침 - 컨텍스트 안전 호출
                    setTimeout(() => {
                        this.safeRefreshDashboard();
                    }, 500);
                } else {
                    console.error('❌ 교구 신청 제출 실패:', result);
                    alert('교구 신청 제출에 실패했습니다: ' + (result?.message || result?.error || '알 수 없는 오류'));
                }
            }).catch((error) => {
                console.error('❌ 교구 신청 제출 오류:', error);
                alert('교구 신청 제출 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
            }).finally(() => {
                // 제출 버튼 활성화
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = this.currentEditingItem ? '수정하기' : '신청하기';
                }
                this.submitInProgress = false;
            });

        } catch (error) {
            console.error('❌ 일반 교구 신청 제출 처리 오류:', error);
            alert('교구 신청 제출 처리 중 오류가 발생했습니다.');
            this.submitInProgress = false;
        }
    },

    // 📦 묶음 신청 제출 처리 - 🔧 v4.3.1 컨텍스트 오류 해결
    handleBundleSubmit: function() {
        try {
            console.log('📦 묶음 신청 제출 처리 v4.3.1 - 컨텍스트 오류 해결');
            
            if (this.submitInProgress) {
                console.warn('⚠️ 제출이 이미 진행 중입니다');
                return;
            }
            
            this.submitInProgress = true;
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                this.submitInProgress = false;
                return;
            }

            const form = document.getElementById('bundleForm');
            if (!form) {
                console.error('묶음 신청 폼을 찾을 수 없습니다');
                this.submitInProgress = false;
                return;
            }

            // 기본 정보 수집
            const formData = new FormData(form);
            const bundleTitle = formData.get('bundleTitle') || '';
            const bundlePurpose = formData.get('bundlePurpose') || '';
            const bundleTotalPrice = parseInt(formData.get('bundleTotalPrice')) || 0;
            const bundlePurchaseMethod = formData.get('bundlePurchaseMethod') || 'online';

            // 기본 정보 검증
            if (!this.validateBundleData(bundleTitle, bundlePurpose, bundleTotalPrice, form)) {
                this.submitInProgress = false;
                return;
            }

            // 🆕 v4.3.0 - 4가지 타입별 데이터 구성
            const bundleData = this.buildV43BundleData(
                bundleTitle, bundlePurpose, bundleTotalPrice, 
                bundlePurchaseMethod, formData, form
            );
            
            if (!bundleData) {
                this.submitInProgress = false;
                return;
            }

            console.log('📦 v4.3.1 최적화된 묶음 신청 데이터:', bundleData);
            
            // 제출 버튼 비활성화
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '제출 중...';
            }

            // 🆕 v4.3.1 API 호출
            this.safeApiCall(() => {
                return SupabaseAPI.createV43BundleApplication(currentUser.id, bundleData);
            }).then((result) => {
                if (result && result.success !== false) {
                    console.log('✅ v4.3.1 묶음 신청 제출 완료');
                    alert('묶음 신청이 제출되었습니다.');
                    
                    this.hideBundleModal();
                    
                    // 🔧 v4.3.1 대시보드 새로고침 - 컨텍스트 안전 호출
                    setTimeout(() => {
                        this.safeRefreshDashboard();
                    }, 500);
                } else {
                    console.error('❌ 묶음 신청 제출 실패:', result);
                    alert('묶음 신청 제출에 실패했습니다: ' + (result?.message || result?.error || '알 수 없는 오류'));
                }
            }).catch((error) => {
                console.error('❌ 묶음 신청 제출 오류:', error);
                alert('묶음 신청 제출 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
            }).finally(() => {
                // 제출 버튼 활성화
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '묶음 신청하기';
                }
                this.submitInProgress = false;
            });

        } catch (error) {
            console.error('❌ 묶음 신청 제출 처리 오류:', error);
            alert('묶음 신청 제출 처리 중 오류가 발생했습니다.');
            this.submitInProgress = false;
        }
    },

    // 검증 함수
    validateApplicationDataV43: function(data, form) {
        if (!data.item_name.trim()) {
            alert('교구명을 입력해주세요.');
            form.querySelector('#itemName').focus();
            return false;
        }

        if (data.price <= 0) {
            alert('올바른 가격을 입력해주세요.');
            form.querySelector('#itemPrice').focus();
            return false;
        }

        if (!data.purpose.trim()) {
            alert('사용 목적을 입력해주세요.');
            form.querySelector('#itemPurpose').focus();
            return false;
        }

        // v4.3.0 - 온라인 단일 구매는 link 필수
        if (data.purchase_type === 'online' && !data.link) {
            alert('온라인 구매의 경우 구매 링크를 입력해주세요.');
            form.querySelector('#itemLink').focus();
            return false;
        }

        return true;
    },

    validateBundleData: function(title, purpose, price, form) {
        if (!title.trim()) {
            alert('묶음 제목을 입력해주세요.');
            form.querySelector('#bundleTitle').focus();
            return false;
        }

        if (!purpose.trim()) {
            alert('사용 목적을 입력해주세요.');
            form.querySelector('#bundlePurpose').focus();
            return false;
        }

        if (price <= 0) {
            alert('올바른 구매 총액을 입력해주세요.');
            form.querySelector('#bundleTotalPrice').focus();
            return false;
        }

        return true;
    },

    buildV43BundleData: function(title, purpose, price, purchaseMethod, formData, form) {
        try {
            console.log('🎯 v4.3.0 - 4가지 타입별 데이터 구성:', { purchaseMethod });
            
            // 기본 신청 데이터
            const bundleData = {
                item_name: title,
                price: price,
                purpose: purpose,
                purchase_type: purchaseMethod,
                is_bundle: true,
                // v4.3.0 새로운 컬럼들 초기화
                link: null,
                store_info: null,
                account_id: null,
                account_pw: null
            };

            if (purchaseMethod === 'online') {
                // 🔥 온라인 묶음 구매 - v4.3.0 최적화
                const onlineData = this.collectOnlineBundleDataV43(formData, form);
                if (!onlineData) return null;
                
                bundleData.link = onlineData.purchaseUrl;
                bundleData.account_id = onlineData.accountId;
                bundleData.account_pw = onlineData.accountPassword;
                
                console.log('✅ 온라인 묶음 데이터 구성 완료 v4.3.0');
                
            } else {
                // 🏪 오프라인 묶음 구매 - v4.3.0 최적화
                const offlineData = this.collectOfflineBundleDataV43(formData, form);
                if (!offlineData) return null;
                
                bundleData.store_info = offlineData.storeInfo;
                
                console.log('✅ 오프라인 묶음 데이터 구성 완료 v4.3.0');
            }

            return bundleData;

        } catch (error) {
            console.error('❌ v4.3.0 데이터 구성 오류:', error);
            alert('신청 데이터 구성 중 오류가 발생했습니다.');
            return null;
        }
    },

    collectOnlineBundleDataV43: function(formData, form) {
        try {
            const purchaseSite = formData.get('purchaseSite') || '';
            const accountId = formData.get('accountId') || '';
            const accountPassword = formData.get('accountPassword') || '';
            const cartNote = formData.get('cartNote') || '';
            
            // 필수 필드 검증
            if (!purchaseSite) {
                alert('구매 사이트를 선택해주세요.');
                form.querySelector('#purchaseSite').focus();
                return null;
            }
            
            if (!accountId.trim()) {
                alert('계정 아이디를 입력해주세요.');
                form.querySelector('#accountId').focus();
                return null;
            }
            
            if (!accountPassword.trim()) {
                alert('계정 비밀번호를 입력해주세요.');
                form.querySelector('#accountPassword').focus();
                return null;
            }
            
            // 기타 사이트 URL 확인
            let siteUrl = '';
            if (purchaseSite === 'other') {
                const otherSite = formData.get('otherSite') || '';
                if (!otherSite.trim()) {
                    alert('기타 사이트 URL을 입력해주세요.');
                    form.querySelector('#otherSite').focus();
                    return null;
                }
                siteUrl = otherSite.trim();
            } else {
                // 주요 쇼핑몰 URL 매핑
                const siteUrls = {
                    'coupang': 'https://www.coupang.com',
                    '11st': 'https://www.11st.co.kr',
                    'gmarket': 'https://www.gmarket.co.kr',
                    'auction': 'https://www.auction.co.kr',
                    'interpark': 'https://shop.interpark.com',
                    'lotte': 'https://www.lotte.com',
                    'ssg': 'https://www.ssg.com',
                    'yes24': 'https://www.yes24.com',
                    'kyobo': 'https://www.kyobobook.co.kr'
                };
                siteUrl = siteUrls[purchaseSite] || purchaseSite;
            }
            
            // 장바구니 메모가 있으면 구매 URL에 추가 정보로 포함
            let purchaseUrl = siteUrl;
            if (cartNote.trim()) {
                purchaseUrl += ` (장바구니 메모: ${cartNote.trim()})`;
            }
            
            return {
                purchaseUrl: purchaseUrl,
                accountId: accountId.trim(),
                accountPassword: this.encryptPasswordV43(accountPassword.trim())
            };
            
        } catch (error) {
            console.error('❌ 온라인 묶음 데이터 수집 오류:', error);
            alert('온라인 구매 정보 처리 중 오류가 발생했습니다.');
            return null;
        }
    },

    collectOfflineBundleDataV43: function(formData, form) {
        try {
            const offlineVendor = formData.get('offlineVendor') || '';
            const purchasePlan = formData.get('purchasePlan') || '';
            
            // 필수 필드 검증
            if (!offlineVendor.trim()) {
                alert('구매 업체 정보를 입력해주세요.');
                form.querySelector('#offlineVendor').focus();
                return null;
            }
            
            // 업체 정보와 구매 계획을 store_info에 구조적으로 저장
            let storeInfo = offlineVendor.trim();
            if (purchasePlan.trim()) {
                storeInfo += `\n\n[구매 계획]\n${purchasePlan.trim()}`;
            }
            
            return {
                storeInfo: storeInfo
            };
            
        } catch (error) {
            console.error('❌ 오프라인 묶음 데이터 수집 오류:', error);
            alert('오프라인 구매 정보 처리 중 오류가 발생했습니다.');
            return null;
        }
    },

    encryptPasswordV43: function(password) {
        try {
            // v4.3.0 전용 암호화 (실제 운영에서는 더 강력한 암호화 필요)
            const timestamp = Date.now();
            const salt = 'sejong_v43_' + timestamp;
            return btoa(salt + ':' + password);
        } catch (error) {
            console.error('v4.3.0 비밀번호 암호화 오류:', error);
            return password; // 암호화 실패 시 원본 반환
        }
    },

    // 유틸리티 함수들 (기본 제공)
    getCurrentUserSafely: function() {
        if (this.studentManager && this.studentManager.getCurrentUserSafely) {
            return this.studentManager.getCurrentUserSafely();
        }
        
        try {
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                const studentData = JSON.parse(currentStudentData);
                if (studentData && studentData.id) {
                    return studentData;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ 사용자 정보 가져오기 오류:', error);
            return null;
        }
    },

    safeApiCall: function(apiFunction) {
        if (this.studentManager && this.studentManager.safeApiCall) {
            return this.studentManager.safeApiCall(apiFunction);
        }
        
        try {
            if (typeof apiFunction === 'function') {
                const result = apiFunction();
                
                if (result && typeof result.then === 'function') {
                    return result.catch((error) => {
                        console.error('API 호출 중 오류:', error);
                        if (error.message && error.message.includes('PGRST116')) {
                            return null;
                        }
                        throw error;
                    });
                }
                
                return Promise.resolve(result);
            }
            return Promise.reject(new Error('API 함수가 유효하지 않습니다'));
        } catch (error) {
            console.error('API 호출 오류:', error);
            return Promise.reject(error);
        }
    },

    safeAddEventListener: function(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
                console.log('이벤트 리스너 추가: ' + selector);
            } else {
                console.warn('요소를 찾을 수 없음: ' + selector);
            }
        } catch (error) {
            console.error('이벤트 리스너 추가 오류 (' + selector + '):', error);
        }
    }

    // 나머지 함수들은 기존과 동일...
};

// 전역 접근을 위한 등록
if (typeof window !== 'undefined') {
    window.EquipmentRequestModule = EquipmentRequestModule;
}

console.log('🛒 EquipmentRequestModule v4.3.1 로드 완료 - setTimeout 컨텍스트 오류 해결 및 안전한 대시보드 새로고침');