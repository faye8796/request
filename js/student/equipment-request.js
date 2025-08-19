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
                    
                    status: 'pending',
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

            // 🆕 예산 매니저 초기화
            this.initBudgetManager();

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

            // 🆕 특별 예산 지원 신청 버튼
            this.safeAddEventListener('#budgetRequestBtn', 'click', () => {
                this.handleBudgetRequest();
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
    
    // === 모달 관리 ===
    
    // 🛒 일반 교구 신청 모달 표시
    showApplicationModal: function() {
        try {
            console.log('🛒 일반 교구 신청 모달 표시');
            
            const modal = document.getElementById('applicationModal');
            if (!modal) {
                console.error('교구 신청 모달을 찾을 수 없습니다');
                alert('교구 신청 기능을 사용할 수 없습니다.');
                return;
            }

            // 현재 사용자 확인
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 수업계획 승인 상태 확인
            this.safeApiCall(() => {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then((lessonPlan) => {
                const isLessonPlanApproved = lessonPlan && lessonPlan.status === 'approved';
                
                if (!isLessonPlanApproved) {
                    alert('수업계획이 승인된 후에 교구 신청이 가능합니다.');
                    return;
                }

                // 모달 초기화 및 표시
                this.resetApplicationForm();
                this.currentEditingItem = null;
                
                // 구매 방식 기본값 설정
                const onlineRadio = modal.querySelector('input[name="purchaseMethod"][value="online"]');
                if (onlineRadio) {
                    onlineRadio.checked = true;
                    this.handlePurchaseMethodChange('online');
                }

                // 구매 방식 변경 이벤트 리스너 추가
                this.setupPurchaseMethodEventListeners();

                // 모달 표시
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';

                // 첫 번째 입력 필드에 포커스
                const firstInput = modal.querySelector('#itemName');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }

                console.log('✅ 일반 교구 신청 모달 표시 완료');
            }).catch((error) => {
                console.error('❌ 수업계획 확인 오류:', error);
                alert('수업계획 정보를 확인할 수 없습니다. 다시 시도해주세요.');
            });

        } catch (error) {
            console.error('❌ 일반 교구 신청 모달 표시 오류:', error);
            alert('교구 신청을 여는 중 오류가 발생했습니다.');
        }
    },

    // 📦 묶음 신청 모달 표시 - v4.3.0 최적화
    showBundleModal: function() {
        try {
            console.log('📦 묶음 신청 모달 표시 v4.3.0');
            
            const modal = document.getElementById('bundleModal');
            if (!modal) {
                console.error('묶음 신청 모달을 찾을 수 없습니다');
                alert('묶음 신청 기능을 사용할 수 없습니다.');
                return;
            }

            // 현재 사용자 확인
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 수업계획 승인 상태 확인
            this.safeApiCall(() => {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then((lessonPlan) => {
                const isLessonPlanApproved = lessonPlan && lessonPlan.status === 'approved';
                
                if (!isLessonPlanApproved) {
                    alert('수업계획이 승인된 후에 묶음 신청이 가능합니다.');
                    return;
                }

                // 모달 초기화 및 표시
                this.resetBundleForm();
                this.currentEditingBundleItem = null;
                
                // 🆕 v4.3.0 구매 방식 기본값 설정 (온라인)
                const onlineRadio = modal.querySelector('input[name="bundlePurchaseMethod"][value="online"]');
                if (onlineRadio) {
                    onlineRadio.checked = true;
                    this.handleBundlePurchaseMethodChange('online');
                }

                // 모달 표시
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';

                // 첫 번째 입력 필드에 포커스
                const firstInput = modal.querySelector('#bundleTitle');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }

                console.log('✅ 묶음 신청 모달 표시 완료 v4.3.0');
            }).catch((error) => {
                console.error('❌ 수업계획 확인 오류:', error);
                alert('수업계획 정보를 확인할 수 없습니다. 다시 시도해주세요.');
            });

        } catch (error) {
            console.error('❌ 묶음 신청 모달 표시 오류:', error);
            alert('묶음 신청을 여는 중 오류가 발생했습니다.');
        }
    },

    // 모달 숨김 함수들
    hideApplicationModal: function() {
        try {
            const modal = document.getElementById('applicationModal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
                this.resetApplicationForm();
                this.currentEditingItem = null;
            }
        } catch (error) {
            console.error('일반 신청 모달 숨김 오류:', error);
        }
    },

    hideBundleModal: function() {
        try {
            const modal = document.getElementById('bundleModal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
                this.resetBundleForm();
                this.currentEditingBundleItem = null;
            }
        } catch (error) {
            console.error('묶음 신청 모달 숨김 오류:', error);
        }
    },

    // === 🚀 v4.3.1 폼 처리 - 컨텍스트 오류 해결 ===

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

    // === 🆕 v4.3.0 - 4가지 타입별 데이터 구성 함수 ===
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

                bundleData.link = onlineData.purchaseUrl;  // 순수 URL만 저장
                bundleData.account_id = onlineData.accountId;
                bundleData.account_pw = onlineData.accountPassword;

                // 🆕 장바구니 메모를 store_info에 별도 저장 (온라인에서는 미사용 컬럼 활용)
                if (onlineData.cartNote) {
                    bundleData.store_info = `[장바구니 메모] ${onlineData.cartNote}`;
                }

                console.log('✅ 온라인 묶음 데이터 구성 완료 v4.3.0 - 링크/메모 분리');
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

    // === 🆕 온라인 묶음 구매 데이터 수집 - v4.3.0 ===
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
            
            // 🔧 수정: 링크와 장바구니 메모 분리 저장
            return {
                purchaseUrl: siteUrl,  // 순수 URL만 저장
                accountId: accountId.trim(),
                accountPassword: accountPassword.trim(),
                cartNote: cartNote.trim() || null  // 장바구니 메모 별도 반환
            };

            
        } catch (error) {
            console.error('❌ 온라인 묶음 데이터 수집 오류:', error);
            alert('온라인 구매 정보 처리 중 오류가 발생했습니다.');
            return null;
        }
    },

    // === 🆕 오프라인 묶음 구매 데이터 수집 - v4.3.0 ===
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

    
    // === 🆕 v4.3.0 검증 함수 ===
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

    // === 수정/삭제 기능 ===

    // ✏️ 신청 수정 기능
    editApplication: function(itemId) {
        try {
            console.log('✏️ 신청 수정 시작:', itemId);
            
            if (!itemId) {
                alert('잘못된 요청입니다.');
                return;
            }

            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 신청 상세 정보 조회
            this.safeApiCall(() => {
                return SupabaseAPI.getApplicationById(itemId);
            }).then((result) => {
                if (!result || !result.success || !result.data) {
                    alert('신청 정보를 찾을 수 없습니다.');
                    return;
                }

                const application = result.data;
                
                // 권한 및 상태 확인
                if (!this.validateEditPermission(application, currentUser)) {
                    return;
                }

                console.log('✅ 수정할 신청 정보:', application);
                
                // 신청 유형에 따라 다른 모달 열기
                if (application.is_bundle) {
                    console.log('📦 묶음 신청 수정 모드');
                    this.openEditBundleModal(application);
                } else {
                    console.log('🛒 일반 신청 수정 모드');
                    this.openEditApplicationModal(application);
                }

            }).catch((error) => {
                console.error('❌ 신청 정보 조회 오류:', error);
                alert('신청 정보를 불러오는 중 오류가 발생했습니다.');
            });

        } catch (error) {
            console.error('❌ 신청 수정 오류:', error);
            alert('신청 수정 중 오류가 발생했습니다.');
        }
    },

    // 🗑️ 신청 삭제 기능
    deleteApplication: function(itemId) {
        try {
            console.log('🗑️ 신청 삭제 시작:', itemId);
            
            if (!itemId) {
                alert('잘못된 요청입니다.');
                return;
            }

            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            // 삭제 확인
            if (!confirm('정말로 이 신청을 삭제하시겠습니까?\n\n삭제된 신청은 복구할 수 없습니다.')) {
                return;
            }

            // 신청 정보 확인 후 삭제
            this.safeApiCall(() => {
                return SupabaseAPI.getApplicationById(itemId);
            }).then((result) => {
                if (!result || !result.success || !result.data) {
                    alert('신청 정보를 찾을 수 없습니다.');
                    return;
                }

                const application = result.data;
                
                // 권한 및 상태 확인
                if (!this.validateDeletePermission(application, currentUser)) {
                    return;
                }

                console.log('✅ 삭제 가능한 신청 확인됨:', application);

                // 실제 삭제 실행
                return this.safeApiCall(() => {
                    return SupabaseAPI.deleteApplication(itemId);
                });

            }).then((deleteResult) => {
                if (deleteResult && deleteResult.success !== false) {
                    console.log('✅ 신청 삭제 완료');
                    alert('신청이 삭제되었습니다.');
                    
                    // 🔧 v4.3.1 대시보드 새로고침 - 컨텍스트 안전 호출
                    this.safeRefreshDashboard();
                } else {
                    console.error('❌ 신청 삭제 실패:', deleteResult);
                    alert('신청 삭제에 실패했습니다: ' + (deleteResult?.message || deleteResult?.error || '알 수 없는 오류'));
                }
            }).catch((error) => {
                console.error('❌ 신청 삭제 오류:', error);
                alert('신청 삭제 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
            });

        } catch (error) {
            console.error('❌ 신청 삭제 오류:', error);
            alert('신청 삭제 중 오류가 발생했습니다.');
        }
    },

    // === 신청 카드 렌더링 ===

    // 신청 내역 렌더링
    renderApplications: function(applications) {
        try {
            const container = document.getElementById('studentApplications');
            const emptyState = document.getElementById('noApplications');
            
            if (!applications || applications.length === 0) {
                if (container) container.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }

            if (container) container.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            
            if (container) {
                container.innerHTML = '';
                
                applications.forEach((application) => {
                    const applicationCard = this.createApplicationCard(application);
                    container.appendChild(applicationCard);
                });

                // 아이콘 생성
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }

                // 카드 이벤트 리스너 설정
                this.setupCardEventListeners();
            }
        } catch (error) {
            console.error('❌ 신청 내역 렌더링 오류:', error);
        }
    },

    // 신청 카드 생성 - v4.3.0 호환성 (DB 컬럼 매핑)
    createApplicationCard: function(application) {
        try {
            const card = document.createElement('div');
            card.className = 'application-card';
            
            const statusClass = this.getStatusClass(application.status);
            const statusText = this.getStatusText(application.status);
            const typeIcon = application.is_bundle ? 'shopping-cart' : 'package';
            const typeText = application.is_bundle ? '묶음신청' : '단일신청';
            
            const purchaseMethodClass = this.getPurchaseMethodClass(application.purchase_type);
            const purchaseMethodText = this.getPurchaseMethodText(application.purchase_type);
            
            let receiptButton = '';
            if (application.purchase_type === 'offline' && application.status === 'approved') {
                receiptButton = `
                    <button class="btn small primary receipt-btn" data-item-id="${application.id}">
                        <i data-lucide="receipt"></i> 영수증 등록
                    </button>
                `;
            }
            
            let receiptStatus = '';
            if (application.purchase_type === 'offline' && application.status === 'purchased') {
                receiptStatus = `
                    <div class="receipt-status">
                        <i data-lucide="check-circle"></i>
                        영수증 제출완료
                        <small>${new Date(application.updated_at).toLocaleString('ko-KR')}</small>
                    </div>
                `;
            }
            
            // 링크 및 장바구니 메모 표시 - v4.3.0 호환성
            let linkSection = '';
            const linkValue = application.link || application.purchase_link;

            if (linkValue && !application.is_bundle) {
                // 🔧 일반 신청: 순수 링크만 표시
                linkSection = `
                    <div class="detail-item">
                        <span class="detail-label">${application.purchase_type === 'offline' ? '참고 링크' : '구매 링크'}</span>
                        <span class="detail-value">
                            <a href="${this.escapeHtml(linkValue)}" target="_blank" rel="noopener noreferrer">
                                링크 보기 <i data-lucide="external-link"></i>
                            </a>
                        </span>
                    </div>
                `;
            } else if (application.is_bundle && application.purchase_type === 'online') {
                // 🆕 묶음 신청: 링크 + 장바구니 메모 표시
                const cartNote = this.extractCartNoteFromStoreInfo(application.store_info);

                linkSection = `
                    <div class="detail-item">
                        <span class="detail-label">구매 사이트</span>
                        <span class="detail-value">
                            <a href="${this.escapeHtml(linkValue)}" target="_blank" rel="noopener noreferrer">
                                링크 보기 <i data-lucide="external-link"></i>
                            </a>
                            ${cartNote ? `<div class="cart-note-display">📝 ${this.escapeHtml(cartNote)}</div>` : ''}
                        </span>
                    </div>
                `;
            }          
            
            card.innerHTML = `
                <div class="application-card-header">
                    <div>
                        <div class="card-title-row">
                            <h3>${this.escapeHtml(application.item_name)}</h3>
                            <div class="card-badges">
                                <span class="purchase-method-badge ${purchaseMethodClass}">
                                    <i data-lucide="${application.purchase_type === 'offline' ? 'store' : 'shopping-cart'}"></i> ${purchaseMethodText}
                                </span>
                                <span class="type-badge ${application.is_bundle ? 'bundle' : 'single'}">
                                    <i data-lucide="${typeIcon}"></i> ${typeText}
                                </span>
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                        </div>
                        <p class="purpose">${this.escapeHtml(application.purpose)}</p>
                    </div>
                </div>
                
                <div class="application-details">
                    <div class="detail-item">
                        <span class="detail-label">가격</span>
                        <span class="detail-value price-value">${this.formatPrice(application.price)}</span>
                    </div>
                    ${linkSection}
                </div>
                
                ${receiptStatus}
                
                ${(application.status === 'pending' || application.status === 'rejected') ? `
                    <div class="card-actions">
                        <button class="btn small secondary edit-btn" data-item-id="${application.id}">
                            <i data-lucide="edit-2"></i> 수정
                        </button>
                        <button class="btn small danger delete-btn" data-item-id="${application.id}">
                            <i data-lucide="trash-2"></i> 삭제
                        </button>
                    </div>
                ` : `
                    <div class="card-actions">
                        ${receiptButton}
                    </div>
                `}
                
                ${application.rejection_reason ? `
                    <div class="rejection-reason">
                        <div class="reason-label">반려 사유</div>
                        <div class="reason-text">${this.escapeHtml(application.rejection_reason)}</div>
                    </div>
                ` : ''}
            `;
            
            return card;
        } catch (error) {
            console.error('❌ 신청 카드 생성 오류:', error);
            return document.createElement('div');
        }
    },

    // 카드 이벤트 리스너 설정
    setupCardEventListeners: function() {
        try {
            // 수정 버튼
            const editBtns = document.querySelectorAll('.edit-btn');
            editBtns.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.target.closest('.edit-btn').getAttribute('data-item-id'));
                    this.editApplication(itemId);
                });
            });

            // 삭제 버튼
            const deleteBtns = document.querySelectorAll('.delete-btn');
            deleteBtns.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.target.closest('.delete-btn').getAttribute('data-item-id'));
                    this.deleteApplication(itemId);
                });
            });

            // 영수증 등록 버튼
            const receiptBtns = document.querySelectorAll('.receipt-btn');
            receiptBtns.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const itemId = parseInt(e.target.closest('.receipt-btn').getAttribute('data-item-id'));
                    // 영수증 모듈로 위임
                    if (this.studentManager && this.studentManager.openReceiptModal) {
                        this.studentManager.openReceiptModal(itemId);
                    }
                });
            });
        } catch (error) {
            console.error('❌ 카드 이벤트 리스너 설정 오류:', error);
        }
    },

    // === 지원 함수들 ===

    // 구매 방식 변경 이벤트 리스너 설정
    setupPurchaseMethodEventListeners: function() {
        try {
            const modal = document.getElementById('applicationModal');
            if (!modal) return;

            const purchaseMethodRadios = modal.querySelectorAll('input[name="purchaseMethod"]');
            
            purchaseMethodRadios.forEach((radio) => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        this.handlePurchaseMethodChange(radio.value);
                    }
                });
            });
        } catch (error) {
            console.error('❌ 구매 방식 이벤트 리스너 설정 오류:', error);
        }
    },

    // 구매 방식 변경 처리
    handlePurchaseMethodChange: function(method) {
        try {
            const itemLinkGroup = document.getElementById('itemLinkGroup');
            const itemLinkInput = document.getElementById('itemLink');
            const itemLinkLabel = document.getElementById('itemLinkLabel');
            
            if (!itemLinkGroup) return;

            if (method === 'online') {
                // 온라인 구매: 참고링크 필드 표시
                itemLinkGroup.style.display = 'block';
                if (itemLinkInput) {
                    itemLinkInput.required = true;
                    itemLinkInput.placeholder = '구매 가능한 링크를 입력하세요';
                }
                if (itemLinkLabel) {
                    itemLinkLabel.textContent = '구매 링크 *';
                }
            } else {
                // 오프라인 구매: 참고링크 필드 숨김
                itemLinkGroup.style.display = 'none';
                if (itemLinkInput) {
                    itemLinkInput.required = false;
                    itemLinkInput.value = '';
                }
            }
        } catch (error) {
            console.error('❌ 구매 방식 변경 처리 오류:', error);
        }
    },

    // 폼 초기화 함수들
    resetApplicationForm: function() {
        try {
            const form = document.getElementById('applicationForm');
            if (form) {
                form.reset();
                
                const onlineRadio = form.querySelector('input[name="purchaseMethod"][value="online"]');
                if (onlineRadio) {
                    onlineRadio.checked = true;
                    this.handlePurchaseMethodChange('online');
                }
            }
        } catch (error) {
            console.error('❌ 일반 신청 폼 초기화 오류:', error);
        }
    },

    resetBundleForm: function() {
        try {
            const form = document.getElementById('bundleForm');
            if (form) {
                form.reset();
                
                // v4.3.0 기본값 설정
                const onlineRadio = form.querySelector('input[name="bundlePurchaseMethod"][value="online"]');
                if (onlineRadio) {
                    onlineRadio.checked = true;
                    this.handleBundlePurchaseMethodChange('online');
                }
            }
        } catch (error) {
            console.error('❌ 묶음 신청 폼 초기화 오류:', error);
        }
    },

    // 검증 함수들
    validateApplicationData: function(data, form) {
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

        if (data.purchase_type === 'online' && !data.purchase_link.trim()) {
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

    validateEditPermission: function(application, currentUser) {
        // 본인 신청인지 확인
        if (application.user_id !== currentUser.id) {
            alert('본인의 신청만 수정할 수 있습니다.');
            return false;
        }

        // 수정 가능한 상태인지 확인
        if (application.status !== 'pending' && application.status !== 'rejected') {
            alert('검토 중이거나 반려된 신청만 수정할 수 있습니다.');
            return false;
        }
        return true;
    },

    validateDeletePermission: function(application, currentUser) {
        // 본인 신청인지 확인
        if (application.user_id !== currentUser.id) {
            alert('본인의 신청만 삭제할 수 있습니다.');
            return false;
        }

        // 삭제 가능한 상태인지 확인
        if (application.status !== 'pending' && application.status !== 'rejected') {
            alert('검토 중인 신청만 삭제할 수 있습니다.');
            return false;
        }

        return true;
    },

    // 수정 모달 열기 함수들 - v4.3.0 호환성
    openEditApplicationModal: function(application) {
        try {
            const modal = document.getElementById('applicationModal');
            if (!modal) {
                alert('교구 신청 모달을 찾을 수 없습니다.');
                return;
            }

            // 수정 모드로 설정
            this.currentEditingItem = application.id;
            
            // 모달 제목 변경
            const modalTitle = document.getElementById('applicationModalTitle');
            if (modalTitle) {
                modalTitle.textContent = '교구 신청 수정';
            }

            // 제출 버튼 텍스트 변경
            const submitBtn = modal.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = '수정하기';
            }

            // 폼에 기존 데이터 입력
            this.fillApplicationForm(application);

            // 구매 방식에 따른 UI 설정
            this.handlePurchaseMethodChange(application.purchase_type);
            
            // 구매 방식 변경 이벤트 리스너 추가
            this.setupPurchaseMethodEventListeners();

            // 모달 표시
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            console.log('✅ 일반 신청 수정 모달 열기 완료');
        } catch (error) {
            console.error('❌ 일반 신청 수정 모달 열기 오류:', error);
            alert('수정 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    openEditBundleModal: function(application) {
        try {
            const modal = document.getElementById('bundleModal');
            if (!modal) {
                alert('묶음 신청 모달을 찾을 수 없습니다.');
                return;
            }

            // 수정 모드로 설정
            this.currentEditingBundleItem = application.id;
            
            // 모달 제목 변경
            const modalTitle = modal.querySelector('h3');
            if (modalTitle) {
                modalTitle.innerHTML = '묶음 교구 신청 수정 <span class="version-badge">v4.3.1</span>';
            }

            // 제출 버튼 텍스트 변경
            const submitBtn = modal.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i data-lucide="edit-2"></i> 수정하기';
            }

            // 폼에 기존 데이터 입력 - v4.3.0 호환성
            this.fillBundleFormV43(application);

            // 모달 표시
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            console.log('✅ 묶음 신청 수정 모달 열기 완료 v4.3.1');
        } catch (error) {
            console.error('❌ 묶음 신청 수정 모달 열기 오류:', error);
            alert('묶음 수정 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    // 폼 데이터 채우기 함수들 - v4.3.0 호환성
    fillApplicationForm: function(application) {
        try {
            const form = document.getElementById('applicationForm');
            if (!form) return;

            // 기본 정보 입력
            const itemNameField = form.querySelector('#itemName');
            const itemPurposeField = form.querySelector('#itemPurpose');
            const itemPriceField = form.querySelector('#itemPrice');
            const itemLinkField = form.querySelector('#itemLink');

            if (itemNameField) itemNameField.value = application.item_name || '';
            if (itemPurposeField) itemPurposeField.value = application.purpose || '';
            if (itemPriceField) itemPriceField.value = application.price || '';
            
            // v4.3.0 호환성 - link 또는 purchase_link 컬럼 처리
            const linkValue = application.link || application.purchase_link || '';
            if (itemLinkField) itemLinkField.value = linkValue;

            // 구매 방식 라디오 버튼 설정
            const purchaseMethodRadios = form.querySelectorAll('input[name="purchaseMethod"]');
            purchaseMethodRadios.forEach((radio) => {
                radio.checked = (radio.value === application.purchase_type);
            });

            console.log('✅ 폼 데이터 채우기 완료');
        } catch (error) {
            console.error('❌ 폼 데이터 채우기 오류:', error);
        }
    },

    // 🆕 v4.3.0 묶음 신청 폼 데이터 채우기
    fillBundleFormV43: function(application) {
        try {
            const form = document.getElementById('bundleForm');
            if (!form) return;

            // 기본 정보 입력
            const bundleTitleField = form.querySelector('#bundleTitle');
            const bundlePurposeField = form.querySelector('#bundlePurpose');
            const bundleTotalPriceField = form.querySelector('#bundleTotalPrice');

            if (bundleTitleField) bundleTitleField.value = application.item_name || '';
            if (bundlePurposeField) bundlePurposeField.value = application.purpose || '';
            if (bundleTotalPriceField) bundleTotalPriceField.value = application.price || '';

            // 구매 방식 라디오 버튼 설정
            const bundlePurchaseMethodRadios = form.querySelectorAll('input[name="bundlePurchaseMethod"]');
            bundlePurchaseMethodRadios.forEach((radio) => {
                radio.checked = (radio.value === application.purchase_type);
            });

            // 구매 방식에 따른 UI 업데이트
            this.handleBundlePurchaseMethodChange(application.purchase_type);

            // v4.3.0 새로운 컬럼 데이터 파싱 및 입력
            if (application.purchase_type === 'online') {
                this.fillOnlineBundleDataV43(application, form);
            } else {
                this.fillOfflineBundleDataV43(application, form);
            }

            console.log('✅ v4.3.1 묶음 신청 폼 데이터 채우기 완료');
        } catch (error) {
            console.error('❌ v4.3.1 묶음 신청 폼 데이터 채우기 오류:', error);
        }
    },

    // v4.3.0 온라인 묶음 데이터 채우기 - 🔧 링크/메모 분리 버전
    fillOnlineBundleDataV43: function(application, form) {
        try {
            // account_id는 직접 필드에 입력
            if (application.account_id) {
                const accountIdField = form.querySelector('#accountId');
                if (accountIdField) accountIdField.value = application.account_id;
            }

            // 비밀번호는 보안상 표시하지 않음

            // 🔧 링크에서 사이트 정보 파싱 (순수 URL)
            if (application.link) {
                this.parsePureLinkForSite(application.link, form);
            }

            // 🆕 store_info에서 장바구니 메모 추출 및 입력
            const cartNote = this.extractCartNoteFromStoreInfo(application.store_info);
            if (cartNote) {
                const cartNoteField = form.querySelector('#cartNote');
                if (cartNoteField) cartNoteField.value = cartNote;
            }

        } catch (error) {
            console.error('❌ v4.3.0 온라인 묶음 데이터 채우기 오류:', error);
        }
    },
    
    // v4.3.0 오프라인 묶음 데이터 채우기
    fillOfflineBundleDataV43: function(application, form) {
        try {
            if (application.store_info) {
                // store_info를 업체 정보와 구매 계획으로 분리
                const storeInfoParts = application.store_info.split('\n\n[구매 계획]\n');
                
                const offlineVendorField = form.querySelector('#offlineVendor');
                if (offlineVendorField && storeInfoParts[0]) {
                    offlineVendorField.value = storeInfoParts[0];
                }

                const purchasePlanField = form.querySelector('#purchasePlan');
                if (purchasePlanField && storeInfoParts[1]) {
                    purchasePlanField.value = storeInfoParts[1];
                }
            }

        } catch (error) {
            console.error('❌ v4.3.0 오프라인 묶음 데이터 채우기 오류:', error);
        }
    },

    // 링크에서 사이트 정보와 메모 파싱
    parseLinkForSiteAndNote: function(link, form) {
        try {
            // 장바구니 메모가 있는지 확인
            const noteMatch = link.match(/\(장바구니 메모: (.+)\)$/);
            let siteUrl = link;
            
            if (noteMatch) {
                const cartNoteField = form.querySelector('#cartNote');
                if (cartNoteField) cartNoteField.value = noteMatch[1];
                siteUrl = link.replace(noteMatch[0], '').trim();
            }

            // 사이트 매핑
            const siteMapping = {
                'https://www.coupang.com': 'coupang',
                'https://www.11st.co.kr': '11st',
                'https://www.gmarket.co.kr': 'gmarket',
                'https://www.auction.co.kr': 'auction',
                'https://shop.interpark.com': 'interpark',
                'https://www.lotte.com': 'lotte',
                'https://www.ssg.com': 'ssg',
                'https://www.yes24.com': 'yes24',
                'https://www.kyobobook.co.kr': 'kyobo'
            };

            const purchaseSiteField = form.querySelector('#purchaseSite');
            if (purchaseSiteField) {
                const siteValue = siteMapping[siteUrl] || 'other';
                purchaseSiteField.value = siteValue;

                if (siteValue === 'other') {
                    const otherSiteField = form.querySelector('#otherSite');
                    if (otherSiteField) {
                        otherSiteField.value = siteUrl;
                        otherSiteField.style.display = 'block';
                    }
                }
            }

        } catch (error) {
            console.error('❌ 링크 파싱 오류:', error);
        }
    },

    // 유틸리티 함수들 (StudentManager에서 복사)
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
    },

    formatPrice: function(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getStatusClass: function(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText: function(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    },

    getPurchaseMethodClass: function(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    getPurchaseMethodText: function(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },
    
    // === 🆕 특별 예산 지원 기능 ===
    
    // 예산 매니저 초기화
    initBudgetManager: function() {
        try {
            if (typeof window.EquipmentBudgetManager !== 'undefined') {
                console.log('✅ EquipmentBudgetManager 클래스 발견');
            } else {
                console.warn('⚠️ EquipmentBudgetManager를 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ 예산 매니저 초기화 오류:', error);
        }
    },
    
    // 특별 예산 지원 신청 처리
    handleBudgetRequest: async function() {  // ← async 추가
        try {
            console.log('💰 특별 예산 지원 신청 버튼 클릭됨');

            if (typeof window.EquipmentBudgetManager !== 'undefined') {
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                // 올바른 supabase 클라이언트 전달
                let supabaseClient = null;

                // 다양한 클라이언트 소스 시도
                if (window.SupabaseAPI && window.SupabaseAPI.supabase) {
                    supabaseClient = window.SupabaseAPI.supabase;
                } else if (window.SupabaseAPI && window.SupabaseAPI.ensureClient) {
                    // SupabaseAPI의 ensureClient 메서드 사용
                    supabaseClient = window.SupabaseAPI;
                } else if (window.supabase) {
                    supabaseClient = window.supabase;
                } else {
                    console.error('❌ Supabase 클라이언트를 찾을 수 없음');
                    alert('시스템 연결에 문제가 있습니다. 페이지를 새로고침해주세요.');
                    return;
                }

                // 예산 매니저 인스턴스 생성 및 초기화
                const budgetManager = new window.EquipmentBudgetManager();

                console.log('🔄 예산 매니저 초기화 시작...');
                await budgetManager.initialize(currentUser.id, supabaseClient);  // ← await 추가
                console.log('✅ 예산 매니저 초기화 완료, 모달 표시 시작');

                budgetManager.showBudgetRequestModal();  // ← 초기화 완료 후 실행
            } else {
                console.warn('⚠️ EquipmentBudgetManager가 사용 불가능함');
                alert('특별 예산 지원 기능이 일시적으로 사용할 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ 특별 예산 지원 신청 처리 오류:', error);
            alert('특별 예산 지원 신청 중 오류가 발생했습니다.');
        }
    },
    
    // 🆕 순수 링크에서 사이트 정보 파싱 (장바구니 메모 없는 URL)
    parsePureLinkForSite: function(link, form) {
        try {
            // 사이트 매핑
            const siteMapping = {
                'https://www.coupang.com': 'coupang',
                'https://www.11st.co.kr': '11st',
                'https://www.gmarket.co.kr': 'gmarket',
                'https://www.auction.co.kr': 'auction',
                'https://shop.interpark.com': 'interpark',
                'https://www.lotte.com': 'lotte',
                'https://www.ssg.com': 'ssg',
                'https://www.yes24.com': 'yes24',
                'https://www.kyobobook.co.kr': 'kyobo'
            };

            const purchaseSiteField = form.querySelector('#purchaseSite');
            if (purchaseSiteField) {
                const siteValue = siteMapping[link] || 'other';
                purchaseSiteField.value = siteValue;

                if (siteValue === 'other') {
                    const otherSiteField = form.querySelector('#otherSite');
                    if (otherSiteField) {
                        otherSiteField.value = link;
                        otherSiteField.style.display = 'block';
                    }
                }
            }

        } catch (error) {
            console.error('❌ 순수 링크 파싱 오류:', error);
        }
    },
    
    // 🆕 store_info에서 장바구니 메모 추출
    extractCartNoteFromStoreInfo: function(storeInfo) {
        try {
            if (!storeInfo) return null;

            // "[장바구니 메모] 내용" 형태에서 내용 추출
            const match = storeInfo.match(/^\[장바구니 메모\]\s*(.+)$/);
            return match ? match[1].trim() : null;
        } catch (error) {
            console.error('장바구니 메모 추출 오류:', error);
            return null;
        }
    }    
    
};

// 전역 접근을 위한 등록
if (typeof window !== 'undefined') {
    window.EquipmentRequestModule = EquipmentRequestModule;
}

console.log('🛒 EquipmentRequestModule v4.3.1 로드 완료 - setTimeout 컨텍스트 오류 해결 및 안전한 대시보드 새로고침');