// 교구 신청 전담 모듈 - v3.0 (student.js와 student-addon.js에서 분리)
// 일반신청, 묶음신청, 수정/삭제, 카드렌더링, API 확장 등 교구 관련 모든 기능 통합
// 🎯 책임: 교구 신청의 전체 라이프사이클 관리

// SupabaseAPI 확장 (student-addon.js에서 이동)
function extendSupabaseAPI() {
    if (typeof window.SupabaseAPI !== 'undefined') {
        
        // 🔧 교구 신청 수정 메서드
        window.SupabaseAPI.updateApplication = async function(applicationId, formData) {
            return await this.safeApiCall('교구 신청 수정', async () => {
                const updateData = {
                    item_name: formData.item_name,
                    purpose: formData.purpose,
                    price: formData.price,
                    purchase_type: formData.purchase_type || 'online',
                    purchase_link: formData.purchase_link || null,
                    is_bundle: formData.is_bundle || false,
                    updated_at: new Date().toISOString()
                };

                return await this.supabase
                    .from('requests')
                    .update(updateData)
                    .eq('id', applicationId)
                    .select();
            });
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

        console.log('✅ SupabaseAPI 교구신청 확장 완료');
    }
}

// 교구 신청 모듈 정의
const EquipmentRequestModule = {
    // 모듈 정보
    name: 'EquipmentRequest',
    version: '3.0.0',
    
    // 상태 관리
    currentEditingItem: null,
    currentEditingBundleItem: null,
    submitInProgress: false,
    
    // 상위 매니저 참조
    studentManager: null,
    
    // === 모듈 초기화 ===
    
    init: function(studentManager) {
        try {
            console.log('🛒 EquipmentRequestModule 초기화 v3.0');
            
            this.studentManager = studentManager;
            
            // SupabaseAPI 확장
            extendSupabaseAPI();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            console.log('✅ EquipmentRequestModule 초기화 완료');
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

            console.log('✅ 교구신청 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 교구신청 이벤트 리스너 설정 오류:', error);
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

    // 📦 묶음 신청 모달 표시
    showBundleModal: function() {
        try {
            console.log('📦 묶음 신청 모달 표시');
            
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
                
                // 구매 방식 기본값 설정 (온라인)
                const onlineRadio = modal.querySelector('input[name="bundlePurchaseMethod"][value="online"]');
                if (onlineRadio) {
                    onlineRadio.checked = true;
                    // 온라인 구매 정보 표시
                    if (typeof window.toggleBundlePurchaseInfo === 'function') {
                        window.toggleBundlePurchaseInfo('online');
                    }
                }

                // 모달 표시
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';

                // 첫 번째 입력 필드에 포커스
                const firstInput = modal.querySelector('#bundleTitle');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }

                console.log('✅ 묶음 신청 모달 표시 완료');
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

    // === 폼 처리 ===

    // 📝 일반 교구 신청 제출 처리
    handleApplicationSubmit: function() {
        try {
            console.log('📝 일반 교구 신청 제출 처리');
            
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
            const applicationData = {
                item_name: formData.get('itemName') || '',
                price: parseInt(formData.get('itemPrice')) || 0,
                purpose: formData.get('itemPurpose') || '',
                purchase_type: formData.get('purchaseMethod') || 'online',
                purchase_link: formData.get('itemLink') || '',
                is_bundle: false
            };

            // 입력 검증
            if (!this.validateApplicationData(applicationData, form)) {
                this.submitInProgress = false;
                return;
            }

            console.log('📝 제출할 신청 데이터:', applicationData);
            
            // 제출 버튼 비활성화
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '제출 중...';
            }

            // API 호출
            const apiCall = this.currentEditingItem ? 
                () => SupabaseAPI.updateApplication(this.currentEditingItem, applicationData) :
                () => SupabaseAPI.createApplication(currentUser.id, applicationData);

            this.safeApiCall(apiCall).then((result) => {
                if (result && result.success !== false) {
                    console.log('✅ 교구 신청 제출 완료');
                    alert(this.currentEditingItem ? '교구 신청이 수정되었습니다.' : '교구 신청이 제출되었습니다.');
                    
                    this.hideApplicationModal();
                    
                    // 대시보드 새로고침
                    setTimeout(() => {
                        if (this.studentManager) {
                            this.studentManager.loadApplications();
                            this.studentManager.updateBudgetStatus();
                        }
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

    // 📦 묶음 신청 제출 처리
    handleBundleSubmit: function() {
        try {
            console.log('📦 묶음 신청 제출 처리');
            
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

            // 구매 방식에 따른 추가 정보 수집
            const purchaseDetails = this.collectBundlePurchaseDetails(bundlePurchaseMethod, formData, form);
            if (!purchaseDetails) {
                this.submitInProgress = false;
                return;
            }

            // API 전송용 데이터 구성
            const bundleData = {
                item_name: bundleTitle,
                price: bundleTotalPrice,
                purpose: bundlePurpose,
                purchase_type: bundlePurchaseMethod,
                purchase_link: purchaseDetails,
                is_bundle: true
            };

            console.log('📦 제출할 묶음 신청 데이터:', {
                ...bundleData,
                purchase_link: bundleData.purchase_link.replace(/계정 PW:.*/, '계정 PW: [암호화됨]')
            });
            
            // 제출 버튼 비활성화
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '제출 중...';
            }

            // API 호출
            this.safeApiCall(() => {
                return SupabaseAPI.createApplication(currentUser.id, bundleData);
            }).then((result) => {
                if (result && result.success !== false) {
                    console.log('✅ 묶음 신청 제출 완료');
                    alert('묶음 신청이 제출되었습니다.');
                    
                    this.hideBundleModal();
                    
                    // 대시보드 새로고침
                    setTimeout(() => {
                        if (this.studentManager) {
                            this.studentManager.loadApplications();
                            this.studentManager.updateBudgetStatus();
                        }
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
                    
                    // 대시보드 새로고침
                    if (this.studentManager) {
                        this.studentManager.loadApplications();
                        this.studentManager.updateBudgetStatus();
                    }
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

    // 신청 카드 생성
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
            
            // 일반 신청만 참고링크 표시
            let linkSection = '';
            if (application.purchase_link && !application.is_bundle) {
                linkSection = `
                    <div class="detail-item">
                        <span class="detail-label">${application.purchase_type === 'offline' ? '참고 링크' : '구매 링크'}</span>
                        <span class="detail-value">
                            <a href="${this.escapeHtml(application.purchase_link)}" target="_blank" rel="noopener noreferrer">
                                링크 보기 <i data-lucide="external-link"></i>
                            </a>
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
                
                ${application.status === 'pending' ? `
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
        if (application.status !== 'pending') {
            alert('검토 중인 신청만 수정할 수 있습니다.');
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
        if (application.status !== 'pending') {
            alert('검토 중인 신청만 삭제할 수 있습니다.');
            return false;
        }

        return true;
    },

    // 수정 모달 열기 함수들
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
                modalTitle.textContent = '묶음 교구 신청 수정';
            }

            // 제출 버튼 텍스트 변경
            const submitBtn = modal.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = '수정하기';
            }

            // 폼에 기존 데이터 입력
            this.fillBundleForm(application);

            // 모달 표시
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            console.log('✅ 묶음 신청 수정 모달 열기 완료');
        } catch (error) {
            console.error('❌ 묶음 신청 수정 모달 열기 오류:', error);
            alert('묶음 수정 모달을 여는 중 오류가 발생했습니다.');
        }
    },

    // 폼 데이터 채우기 함수들
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
            if (itemLinkField) itemLinkField.value = application.purchase_link || '';

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

    fillBundleForm: function(application) {
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
            if (typeof window.toggleBundlePurchaseInfo === 'function') {
                window.toggleBundlePurchaseInfo(application.purchase_type);
            }

            // 추가 정보 파싱 및 입력
            if (application.purchase_link) {
                this.parseBundlePurchaseDetails(application.purchase_link, form);
            }

            console.log('✅ 묶음 신청 폼 데이터 채우기 완료');
        } catch (error) {
            console.error('❌ 묶음 신청 폼 데이터 채우기 오류:', error);
        }
    },

    // 묶음 구매 정보 수집
    collectBundlePurchaseDetails: function(method, formData, form) {
        try {
            if (method === 'online') {
                // 온라인 구매 정보 검증
                const purchaseSite = formData.get('purchaseSite') || '';
                const accountId = formData.get('accountId') || '';
                const accountPassword = formData.get('accountPassword') || '';
                const cartNote = formData.get('cartNote') || '';
                
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
                
                // 기타 사이트인 경우 URL 확인
                if (purchaseSite === 'other') {
                    const otherSite = formData.get('otherSite') || '';
                    if (!otherSite.trim()) {
                        alert('기타 사이트 URL을 입력해주세요.');
                        form.querySelector('#otherSite').focus();
                        return null;
                    }
                }
                
                // 온라인 구매 정보 구성
                const siteInfo = purchaseSite === 'other' ? formData.get('otherSite') : purchaseSite;
                return `[온라인 구매]\n구매 사이트: ${siteInfo}\n계정 ID: ${accountId}\n계정 PW: ${this.encryptPassword(accountPassword)}\n장바구니 메모: ${cartNote}`;
                
            } else {
                // 오프라인 구매 정보 검증
                const offlineVendor = formData.get('offlineVendor') || '';
                const purchasePlan = formData.get('purchasePlan') || '';
                
                if (!offlineVendor.trim()) {
                    alert('구매 업체 정보를 입력해주세요.');
                    form.querySelector('#offlineVendor').focus();
                    return null;
                }
                
                // 오프라인 구매 정보 구성
                return `[오프라인 구매]\n구매 업체: ${offlineVendor}\n구매 계획: ${purchasePlan}`;
            }
        } catch (error) {
            console.error('❌ 묶음 구매 정보 수집 오류:', error);
            return null;
        }
    },

    // 묶음 구매 정보 파싱
    parseBundlePurchaseDetails: function(purchaseLink, form) {
        try {
            if (purchaseLink.includes('[온라인 구매]')) {
                // 온라인 구매 정보 파싱
                const siteMatch = purchaseLink.match(/구매 사이트: (.+)/);
                const idMatch = purchaseLink.match(/계정 ID: (.+)/);
                const noteMatch = purchaseLink.match(/장바구니 메모: (.+)/);
                
                if (siteMatch) {
                    const purchaseSiteField = form.querySelector('#purchaseSite');
                    if (purchaseSiteField) {
                        purchaseSiteField.value = siteMatch[1].trim();
                        // 기타 사이트 처리
                        if (!['coupang', '11st', 'gmarket', 'auction', 'interpark', 'lotte', 'ssg', 'yes24', 'kyobo'].includes(siteMatch[1].trim())) {
                            purchaseSiteField.value = 'other';
                            const otherSiteField = form.querySelector('#otherSite');
                            if (otherSiteField) {
                                otherSiteField.value = siteMatch[1].trim();
                                otherSiteField.style.display = 'block';
                            }
                        }
                    }
                }
                
                if (idMatch) {
                    const accountIdField = form.querySelector('#accountId');
                    if (accountIdField) accountIdField.value = idMatch[1].trim();
                }
                
                if (noteMatch) {
                    const cartNoteField = form.querySelector('#cartNote');
                    if (cartNoteField) cartNoteField.value = noteMatch[1].trim();
                }
                
            } else if (purchaseLink.includes('[오프라인 구매]')) {
                // 오프라인 구매 정보 파싱
                const vendorMatch = purchaseLink.match(/구매 업체: (.+)/);
                const planMatch = purchaseLink.match(/구매 계획: (.+)/);
                
                if (vendorMatch) {
                    const offlineVendorField = form.querySelector('#offlineVendor');
                    if (offlineVendorField) offlineVendorField.value = vendorMatch[1].trim();
                }
                
                if (planMatch) {
                    const purchasePlanField = form.querySelector('#purchasePlan');
                    if (purchasePlanField) purchasePlanField.value = planMatch[1].trim();
                }
            }
            
            console.log('✅ 구매 정보 파싱 완료');
        } catch (error) {
            console.error('❌ 구매 정보 파싱 오류:', error);
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

    encryptPassword: function(password) {
        try {
            // 실제 운영에서는 더 강력한 암호화가 필요
            return btoa(password + '_encrypted_' + Date.now());
        } catch (error) {
            console.error('비밀번호 암호화 오류:', error);
            return password;
        }
    }
};

// 전역 접근을 위한 등록
if (typeof window !== 'undefined') {
    window.EquipmentRequestModule = EquipmentRequestModule;
}

console.log('🛒 EquipmentRequestModule v3.0 로드 완료 - 교구 신청 전담 모듈');