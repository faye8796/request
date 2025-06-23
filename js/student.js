// 학생 기능 핵심 매니저 - v3.0 슬림화 버전 (모듈 시스템 도입)
// 🎯 책임: 시스템 초기화, 상태 관리, 모듈 통신, 공통 기능
// 📦 분리된 기능: 교구 신청 → equipment-request.js

const StudentManager = {
    // === 모듈 시스템 ===
    modules: {},
    isInitialized: false,
    noticeDisplayed: false,

    // 모듈 등록
    registerModule: function(name, module) {
        try {
            console.log('📦 모듈 등록:', name);
            this.modules[name] = module;
            
            // 모듈 초기화 (매니저 참조 전달)
            if (module.init && typeof module.init === 'function') {
                const initResult = module.init(this);
                if (initResult) {
                    console.log('✅ 모듈 초기화 성공:', name);
                } else {
                    console.warn('⚠️ 모듈 초기화 실패:', name);
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ 모듈 등록 오류:', name, error);
            return false;
        }
    },

    // 모듈 가져오기
    getModule: function(name) {
        return this.modules[name] || null;
    },

    // === 시스템 초기화 ===
    
    init: function() {
        if (this.isInitialized) {
            console.log('⚠️ StudentManager 이미 초기화됨 - 건너뜀');
            return Promise.resolve();
        }

        try {
            console.log('🎓 StudentManager v3.0 초기화 시작 (모듈 시스템)');
            
            // 모듈 로드
            this.loadModules();
            
            // 기본 이벤트 리스너 설정
            this.setupCoreEventListeners();
            
            const self = this;
            return this.updateUserDisplay()
                .then(function() {
                    return self.loadApplications();
                })
                .then(function() {
                    return self.updateBudgetStatus();
                })
                .then(function() {
                    return self.checkLessonPlanStatus().catch(function(error) {
                        console.warn('수업계획 상태 확인 중 오류 발생 (계속 진행):', error);
                        return Promise.resolve();
                    });
                })
                .then(function() {
                    self.isInitialized = true;
                    console.log('✅ StudentManager v3.0 초기화 완료');
                    
                    if (!self.noticeDisplayed) {
                        self.showBasicNotice('✅ 시스템이 정상적으로 로드되었습니다.');
                    }
                })
                .catch(function(error) {
                    console.error('❌ StudentManager 초기화 오류:', error);
                    self.showFallbackInterface();
                    self.isInitialized = true;
                    return Promise.resolve();
                });
        } catch (error) {
            console.error('❌ StudentManager 초기화 오류:', error);
            this.showFallbackInterface();
            this.isInitialized = true;
            return Promise.resolve();
        }
    },

    // 모듈 로드
    loadModules: function() {
        try {
            console.log('📦 모듈 로드 시작');
            
            // 교구 신청 모듈 등록
            if (typeof window.EquipmentRequestModule !== 'undefined') {
                this.registerModule('equipment', window.EquipmentRequestModule);
                console.log('✅ 교구 신청 모듈 로드 완료');
            } else {
                console.warn('⚠️ 교구 신청 모듈을 찾을 수 없습니다');
            }

            // 향후 모듈들 (배송지, 영수증 등)
            // if (typeof window.ShippingModule !== 'undefined') {
            //     this.registerModule('shipping', window.ShippingModule);
            // }
            
            console.log('📦 모듈 로드 완료. 등록된 모듈:', Object.keys(this.modules));
        } catch (error) {
            console.error('❌ 모듈 로드 오류:', error);
        }
    },

    // 핵심 이벤트 리스너 설정
    setupCoreEventListeners: function() {
        try {
            // 수업계획 버튼
            this.safeAddEventListener('#lessonPlanBtn', 'click', this.handleLessonPlanClick.bind(this));

            // 배송지 설정 버튼 (student-addon.js 기능 유지)
            this.safeAddEventListener('#shippingAddressBtn', 'click', function() {
                if (window.StudentAddon && window.StudentAddon.showShippingModal) {
                    window.StudentAddon.showShippingModal();
                } else {
                    alert('배송지 설정 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
                }
            });

            // 모달 공통 이벤트들
            this.setupModalInteractionEvents();

            console.log('✅ 핵심 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ 핵심 이벤트 리스너 설정 오류:', error);
        }
    },

    // === 교구 신청 관련 프록시 함수들 (호환성 보장) ===
    
    // 신청 모달 프록시 함수들
    showApplicationModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.showApplicationModal) {
            return equipmentModule.showApplicationModal();
        } else {
            alert('교구 신청 기능을 준비 중입니다. 잠시만 기다려주세요.');
        }
    },

    showBundleModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.showBundleModal) {
            return equipmentModule.showBundleModal();
        } else {
            alert('묶음 신청 기능을 준비 중입니다. 잠시만 기다려주세요.');
        }
    },

    // 폼 제출 프록시 함수들
    handleApplicationSubmit: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.handleApplicationSubmit) {
            return equipmentModule.handleApplicationSubmit();
        } else {
            alert('신청 제출 기능을 준비 중입니다.');
        }
    },

    handleBundleSubmit: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.handleBundleSubmit) {
            return equipmentModule.handleBundleSubmit();
        } else {
            alert('묶음 신청 제출 기능을 준비 중입니다.');
        }
    },

    // 수정/삭제 프록시 함수들
    editApplication: function(itemId) {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.editApplication) {
            return equipmentModule.editApplication(itemId);
        } else {
            alert('신청 수정 기능을 준비 중입니다.');
        }
    },

    deleteApplication: function(itemId) {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.deleteApplication) {
            return equipmentModule.deleteApplication(itemId);
        } else {
            alert('신청 삭제 기능을 준비 중입니다.');
        }
    },

    // 모달 숨김 프록시 함수들
    hideApplicationModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.hideApplicationModal) {
            return equipmentModule.hideApplicationModal();
        }
    },

    hideBundleModal: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.hideBundleModal) {
            return equipmentModule.hideBundleModal();
        }
    },

    // 폼 초기화 프록시 함수들
    resetApplicationForm: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.resetApplicationForm) {
            return equipmentModule.resetApplicationForm();
        }
    },

    resetBundleForm: function() {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.resetBundleForm) {
            return equipmentModule.resetBundleForm();
        }
    },

    // 구매 방식 변경 프록시
    handlePurchaseMethodChange: function(method) {
        const equipmentModule = this.getModule('equipment');
        if (equipmentModule && equipmentModule.handlePurchaseMethodChange) {
            return equipmentModule.handlePurchaseMethodChange(method);
        }
    },

    // === 페이지 전환 및 수업계획 관리 ===

    // 안전한 학생 대시보드로 이동
    goToStudentDashboard: function() {
        try {
            console.log('🔄 학생 대시보드로 이동 시작');
            
            // 1차: App.showPage 시도
            if (window.App && typeof window.App.showPage === 'function') {
                console.log('✅ App.showPage 사용하여 이동');
                window.App.showPage('studentPage');
                
                if (window.StudentManager && typeof window.StudentManager.init === 'function') {
                    window.StudentManager.init();
                }
                return true;
            }
            
            // 2차: CSS 클래스를 이용한 페이지 전환
            const studentPage = document.getElementById('studentPage');
            const lessonPlanPage = document.getElementById('lessonPlanPage');
            
            if (studentPage && lessonPlanPage) {
                console.log('✅ CSS 클래스 방식으로 페이지 전환');
                
                lessonPlanPage.classList.remove('active');
                studentPage.classList.add('active');
                
                setTimeout(() => {
                    if (this.refreshDashboard) {
                        this.refreshDashboard();
                    }
                }, 200);
                
                return true;
            }
            
            // 3차: 직접 URL 이동 (폴백)
            console.warn('⚠️ 페이지 요소를 찾을 수 없음 - URL 이동 시도');
            const studentDashboardPath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/student/dashboard.html');
            window.location.href = studentDashboardPath;
            
            return false;
        } catch (error) {
            console.error('❌ 학생 대시보드 이동 오류:', error);
            window.location.reload();
            return false;
        }
    },

    // 수업계획 버튼 클릭 처리
    handleLessonPlanClick: function() {
        try {
            console.log('📋 수업계획 버튼 클릭 - edit 모드로 표시');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(existingPlan) {
                const studentPage = document.getElementById('studentPage');
                const lessonPlanPage = document.getElementById('lessonPlanPage');
                
                if (studentPage && lessonPlanPage) {
                    studentPage.classList.remove('active');
                    lessonPlanPage.classList.add('active');
                    
                    console.log('✅ 수업계획 페이지 활성화 완료');
                } else {
                    console.error('❌ 페이지 요소를 찾을 수 없습니다');
                    alert('수업계획 페이지를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                    return;
                }

                if (typeof LessonPlanManager !== 'undefined') {
                    setTimeout(function() {
                        try {
                            if (typeof LessonPlanManager.showLessonPlanPage === 'function') {
                                LessonPlanManager.showLessonPlanPage('edit', existingPlan);
                                console.log('✅ LessonPlanManager edit 모드 초기화 완료');
                            } else {
                                console.warn('⚠️ LessonPlanManager.showLessonPlanPage 함수를 찾을 수 없습니다');
                                alert('수업계획 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
                            }
                        } catch (error) {
                            console.error('❌ LessonPlanManager 처리 오류:', error);
                            alert('수업계획 시스템 오류가 발생했습니다.');
                        }
                    }, 200);
                } else {
                    console.error('❌ LessonPlanManager를 찾을 수 없습니다');
                    alert('수업계획 관리 시스템을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                }
            }).catch(function(error) {
                console.error('❌ 수업계획 조회 오류:', error);
                alert('수업계획 데이터를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
            });
        } catch (error) {
            console.error('❌ 수업계획 버튼 클릭 처리 오류:', error);
            alert('수업계획 페이지로 이동하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    },

    // === 사용자 정보 및 상태 관리 ===

    // 안전한 사용자 정보 가져오기
    getCurrentUserSafely: function() {
        try {
            console.log('👤 getCurrentUserSafely 호출됨');
            
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    if (studentData && studentData.id) {
                        console.log('✅ localStorage에서 사용자 데이터 가져옴:', {
                            id: studentData.id,
                            name: studentData.name
                        });
                        return studentData;
                    }
                } catch (parseError) {
                    console.error('localStorage 데이터 파싱 오류:', parseError);
                }
            }

            if (typeof AuthManager !== 'undefined' && AuthManager.getCurrentUser) {
                const authUser = AuthManager.getCurrentUser();
                if (authUser) {
                    console.log('✅ AuthManager에서 사용자 데이터 가져옴');
                    return authUser;
                }
            }

            console.warn('⚠️ 사용자 정보를 찾을 수 없습니다');
            return null;
        } catch (error) {
            console.error('❌ 사용자 정보 가져오기 오류:', error);
            return null;
        }
    },

    // 안전한 API 호출 래퍼
    safeApiCall: function(apiFunction) {
        try {
            if (typeof apiFunction === 'function') {
                const result = apiFunction();
                
                if (result && typeof result.then === 'function') {
                    return result.catch(function(error) {
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

    // 사용자 정보 표시 업데이트
    updateUserDisplay: function() {
        try {
            console.log('👤 사용자 정보 표시 업데이트 시작');
            
            if (typeof AuthManager === 'undefined' || !AuthManager.updateUserDisplay) {
                console.error('AuthManager 또는 updateUserDisplay 메서드를 찾을 수 없습니다');
                this.showFallbackUserInfo();
                return Promise.resolve();
            }

            const self = this;
            return AuthManager.updateUserDisplay().then(function() {
                console.log('✅ 사용자 정보 표시 업데이트 완료');
            }).catch(function(error) {
                console.error('❌ 사용자 정보 표시 업데이트 오류:', error);
                self.showFallbackUserInfo();
            });
        } catch (error) {
            console.error('❌ 사용자 정보 표시 업데이트 오류:', error);
            this.showFallbackUserInfo();
            return Promise.resolve();
        }
    },

    // === 신청 내역 관리 (모듈로 위임) ===

    // 신청 내역 로드
    loadApplications: function() {
        try {
            console.log('📑 신청 내역 로드 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showEmptyApplications();
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentApplications(currentUser.id);
            }).then(function(applications) {
                // 교구 신청 모듈로 렌더링 위임
                const equipmentModule = self.getModule('equipment');
                if (equipmentModule && equipmentModule.renderApplications) {
                    equipmentModule.renderApplications(applications);
                } else {
                    // 폴백: 기본 렌더링
                    self.renderApplicationsFallback(applications);
                }
                
                return self.updateBudgetStatus();
            }).then(function() {
                console.log('✅ 신청 내역 로드 완료');
            }).catch(function(error) {
                console.error('신청 내역 조회 API 오류:', error);
                self.showApplicationsError();
            });
        } catch (error) {
            console.error('❌ 신청 내역 로드 오류:', error);
            this.showApplicationsError();
            return Promise.resolve();
        }
    },

    // 폴백 렌더링 (모듈이 없는 경우)
    renderApplicationsFallback: function(applications) {
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
                container.innerHTML = '<div class="loading-message">신청 내역을 준비 중입니다...</div>';
            }
        } catch (error) {
            console.error('❌ 폴백 렌더링 오류:', error);
        }
    },

    // === 예산 관리 ===

    // 예산 현황 업데이트
    updateBudgetStatus: function() {
        try {
            console.log('💰 예산 현황 업데이트 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없음');
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                self.displayBudgetStatus(budgetStatus);
                console.log('✅ 예산 현황 업데이트 완료');
            }).catch(function(error) {
                console.error('예산 상태 조회 API 오류:', error);
                self.showBudgetError();
            });
        } catch (error) {
            console.error('❌ 예산 현황 업데이트 오류:', error);
            this.showBudgetError();
            return Promise.resolve();
        }
    },

    // 예산 상태 표시
    displayBudgetStatus: function(budgetStatus) {
        try {
            let budgetDisplay = document.getElementById('budgetStatus');
            if (!budgetDisplay) {
                budgetDisplay = document.createElement('div');
                budgetDisplay.id = 'budgetStatus';
                budgetDisplay.className = 'budget-status-container';
                
                const userInfo = document.querySelector('.user-info');
                if (userInfo) {
                    userInfo.appendChild(budgetDisplay);
                }
            }
            
            if (!budgetStatus) {
                budgetDisplay.innerHTML = '<div class="budget-error">예산 정보를 불러올 수 없습니다.</div>';
                return;
            }

            if (budgetStatus.allocated === 0) {
                if (budgetStatus.lessonPlanStatus === 'approved') {
                    budgetDisplay.innerHTML = `
                        <div class="budget-info processing">
                            <div class="budget-status-text">
                                <i data-lucide="clock"></i>
                                <span>예산 배정 처리 중...</span>
                            </div>
                        </div>
                    `;
                } else {
                    budgetDisplay.innerHTML = `
                        <div class="budget-info not-allocated">
                            <div class="budget-status-text">
                                <i data-lucide="alert-circle"></i>
                                <span><strong>수업계획 승인 후 예산이 배정됩니다 (필수)</strong></span>
                            </div>
                        </div>
                    `;
                }
            } else {
                const usagePercentage = Math.round((budgetStatus.used / budgetStatus.allocated) * 100);
                const statusClass = usagePercentage >= 90 ? 'danger' : usagePercentage >= 70 ? 'warning' : 'safe';
                
                budgetDisplay.innerHTML = `
                    <div class="budget-info allocated">
                        <div class="budget-header">
                            <div class="budget-title">
                                <i data-lucide="wallet"></i>
                                <span>배정 예산 (${budgetStatus.field})</span>
                            </div>
                            <div class="budget-percentage ${statusClass}">${usagePercentage}%</div>
                        </div>
                        <div class="budget-bar-container">
                            <div class="budget-bar">
                                <div class="budget-progress ${statusClass}" style="width: ${Math.min(usagePercentage, 100)}%"></div>
                            </div>
                        </div>
                        <div class="budget-details">
                            <div class="budget-item">
                                <span class="label">사용:</span>
                                <span class="value">${this.formatPrice(budgetStatus.used)}</span>
                            </div>
                            <div class="budget-item">
                                <span class="label">배정:</span>
                                <span class="value">${this.formatPrice(budgetStatus.allocated)}</span>
                            </div>
                            <div class="budget-item remaining">
                                <span class="label">잔여:</span>
                                <span class="value ${budgetStatus.remaining <= 0 ? 'zero' : ''}">${this.formatPrice(budgetStatus.remaining)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('예산 상태 표시 오류:', error);
        }
    },

    // === 수업계획 상태 관리 ===

    // 수업계획 상태 확인 및 UI 업데이트
    checkLessonPlanStatus: function() {
        try {
            if (this.noticeDisplayed) {
                console.log('⚠️ 수업계획 상태 알림이 이미 표시됨 - 건너뜀');
                return Promise.resolve();
            }

            console.log('📋 수업계획 상태 확인 시작');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showLessonPlanRequiredNotice();
                this.noticeDisplayed = true;
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(lessonPlan) {
                self.updateLessonPlanButton(lessonPlan);
                
                return self.updateApplicationButtonsState(lessonPlan).then(function() {
                    return self.showLessonPlanStatusNotice(lessonPlan);
                }).then(function() {
                    self.noticeDisplayed = true;
                    console.log('✅ 수업계획 상태 확인 완료');
                }).catch(function(error) {
                    console.warn('수업계획 상태 처리 중 일부 오류 발생:', error);
                    self.noticeDisplayed = true;
                    return Promise.resolve();
                });
            }).catch(function(apiError) {
                console.error('수업계획 조회 API 오류:', apiError);
                self.showApiErrorNotice();
                self.noticeDisplayed = true;
                return Promise.resolve();
            });
        } catch (error) {
            console.error('❌ 수업계획 상태 확인 오류:', error);
            this.showErrorNotice('수업계획 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
            this.noticeDisplayed = true;
            return Promise.resolve();
        }
    },

    // 수업계획 버튼 업데이트
    updateLessonPlanButton: function(lessonPlan) {
        try {
            const lessonPlanBtn = document.getElementById('lessonPlanBtn');
            if (!lessonPlanBtn) {
                console.warn('수업계획 버튼을 찾을 수 없습니다');
                return;
            }

            if (lessonPlan) {
                if (lessonPlan.status === 'approved') {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-check"></i>
                        수업계획 승인됨 (확인가능)
                    `;
                    lessonPlanBtn.className = 'btn btn-success';
                } else if (lessonPlan.status === 'rejected') {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-x"></i>
                        수업계획 수정 필요
                    `;
                    lessonPlanBtn.className = 'btn btn-danger';
                } else if (lessonPlan.status === 'submitted') {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-clock"></i>
                        수업계획 확인 (승인대기중)
                    `;
                    lessonPlanBtn.className = 'btn btn-warning';
                } else {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-edit"></i>
                        수업계획 완료하기 (필수)
                    `;
                    lessonPlanBtn.className = 'btn btn-warning';
                }
            } else {
                lessonPlanBtn.innerHTML = `
                    <i data-lucide="calendar-plus"></i>
                    수업계획 작성하기 (필수)
                `;
                lessonPlanBtn.className = 'btn btn-warning';
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('수업계획 버튼 업데이트 오류:', error);
        }
    },

    // 교구 신청 버튼 상태 업데이트
    updateApplicationButtonsState: function(lessonPlan) {
        try {
            console.log('🔘 교구 신청 버튼 상태 업데이트');
            
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                this.disableApplicationButtons('로그인이 필요합니다');
                return Promise.resolve();
            }

            const isLessonPlanApproved = lessonPlan && lessonPlan.status === 'approved';
            
            if (!isLessonPlanApproved) {
                let message = '수업계획 승인 후 신청 가능합니다 (필수)';
                
                if (!lessonPlan) {
                    message = '수업계획 작성 후 승인받아야 신청 가능합니다 (필수)';
                } else if (lessonPlan.status === 'submitted') {
                    message = '수업계획 승인 대기 중 - 승인 후 신청 가능합니다';
                } else if (lessonPlan.status === 'rejected') {
                    message = '수업계획이 반려됨 - 수정 후 승인받아야 신청 가능합니다';
                } else if (lessonPlan.status === 'draft') {
                    message = '수업계획 완료 제출 후 승인받아야 신청 가능합니다 (필수)';
                }
                
                this.disableApplicationButtons(message);
                return Promise.resolve();
            }

            const self = this;
            
            return this.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                if (!budgetStatus || budgetStatus.allocated === 0) {
                    self.disableApplicationButtons('예산 배정 처리 중입니다. 잠시만 기다려주세요.');
                } else {
                    self.enableApplicationButtons();
                    console.log('✅ 교구 신청 버튼 활성화됨');
                }
                console.log('✅ 교구 신청 버튼 상태 업데이트 완료');
            }).catch(function(error) {
                console.error('예산 상태 조회 오류:', error);
                self.disableApplicationButtons('예산 정보를 불러올 수 없습니다');
                return Promise.resolve();
            });
        } catch (error) {
            console.error('❌ 교구 신청 버튼 상태 업데이트 오류:', error);
            this.disableApplicationButtons('시스템 오류 - 잠시 후 다시 시도해주세요');
            return Promise.resolve();
        }
    },

    // 교구 신청 버튼 비활성화
    disableApplicationButtons: function(reason) {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(function(btnId) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = true;
                    btn.title = reason;
                    btn.classList.add('disabled');
                    
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 교구 신청 (승인 필요)';
                    } else {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 묶음 신청 (승인 필요)';
                    }
                }
            });
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('교구 신청 버튼 비활성화 오류:', error);
        }
    },

    // 교구 신청 버튼 활성화
    enableApplicationButtons: function() {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(function(btnId) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = false;
                    btn.title = '';
                    btn.classList.remove('disabled');
                    
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 새 교구 신청';
                    } else {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 묶음 신청';
                    }
                }
            });
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('교구 신청 버튼 활성화 오류:', error);
        }
    },

    // === 영수증 관리 (student-addon.js 유지) ===

    openReceiptModal: function(requestId) {
        try {
            console.log('📄 영수증 모달 열기:', requestId);
            // student-addon.js에서 showReceiptModal 구현을 기다림
            if (window.StudentManager && typeof window.StudentManager.showReceiptModal === 'function') {
                return window.StudentManager.showReceiptModal(requestId);
            } else {
                alert('영수증 등록 기능을 준비 중입니다.');
                return Promise.reject(new Error('영수증 기능 준비 중'));
            }
        } catch (error) {
            console.error('영수증 모달 열기 오류:', error);
            alert('영수증 등록을 여는 중 오류가 발생했습니다.');
            return Promise.reject(error);
        }
    },

    // === 공통 유틸리티 함수들 ===

    // 안전한 이벤트 리스너 추가
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

    // 가격 포맷팅
    formatPrice: function(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    // HTML 이스케이프
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 대시보드 새로고침
    refreshDashboard: function() {
        try {
            console.log('🔄 대시보드 새로고침');
            
            this.noticeDisplayed = false;
            
            const self = this;
            
            return this.loadApplications()
                .then(function() {
                    return self.updateBudgetStatus();
                })
                .then(function() {
                    return self.checkLessonPlanStatus();
                })
                .then(function() {
                    console.log('✅ 대시보드 새로고침 완료');
                })
                .catch(function(error) {
                    console.error('❌ 대시보드 새로고침 오류:', error);
                });
        } catch (error) {
            console.error('❌ 대시보드 새로고침 오류:', error);
            return Promise.resolve();
        }
    },

    // === 폴백 인터페이스 및 알림 시스템 ===

    showFallbackInterface: function() {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            if (welcomeEl) {
                welcomeEl.textContent = '학생 대시보드';
            }
            this.showBasicNotice('⚠️ 일부 기능을 불러오는 중입니다. 잠시만 기다려주세요.');
        } catch (error) {
            console.error('폴백 인터페이스 표시 오류:', error);
        }
    },

    showFallbackUserInfo: function() {
        try {
            const welcomeEl = document.getElementById('studentWelcome');
            const detailsEl = document.getElementById('studentDetails');
            
            if (welcomeEl) {
                welcomeEl.textContent = '안녕하세요!';
            }
            
            if (detailsEl) {
                detailsEl.textContent = '사용자 정보를 불러오는 중...';
            }
        } catch (error) {
            console.error('폴백 사용자 정보 표시 오류:', error);
        }
    },

    showEmptyApplications: function() {
        try {
            const container = document.getElementById('studentApplications');
            const emptyState = document.getElementById('noApplications');
            
            if (container) container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        } catch (error) {
            console.error('빈 신청 내역 표시 오류:', error);
        }
    },

    showApplicationsError: function() {
        try {
            const container = document.getElementById('studentApplications');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <i data-lucide="alert-circle" style="width: 3rem; height: 3rem; color: #ef4444;"></i>
                        <h3>신청 내역을 불러올 수 없습니다</h3>
                        <p>네트워크 연결을 확인하고 다시 시도해주세요.</p>
                        <button class="btn secondary" onclick="StudentManager.loadApplications()">
                            🔄 다시 시도
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('신청 내역 오류 표시 오류:', error);
        }
    },

    showBudgetError: function() {
        try {
            let budgetDisplay = document.getElementById('budgetStatus');
            if (budgetDisplay) {
                budgetDisplay.innerHTML = `
                    <div class="budget-error">
                        <i data-lucide="wifi-off"></i>
                        예산 정보 연결 오류
                        <button class="btn small secondary" onclick="StudentManager.updateBudgetStatus()">
                            재시도
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('예산 오류 표시 오류:', error);
        }
    },

    showBasicNotice: function(message) {
        try {
            const existingNotice = document.getElementById('basicNotice');
            if (existingNotice) {
                existingNotice.remove();
            }

            const notice = document.createElement('div');
            notice.id = 'basicNotice';
            notice.className = 'dashboard-notice warning';
            notice.innerHTML = `
                <div class="notice-content warning">
                    <i data-lucide="alert-triangle"></i>
                    <div>
                        <h4>시스템 상태</h4>
                        <p>${message}</p>
                    </div>
                </div>
            `;

            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('기본 알림 표시 오류:', error);
        }
    },

    // 수업계획 상태 알림 (간소화된 버전)
    showLessonPlanStatusNotice: function(lessonPlan) {
        try {
            const self = this;
            
            this.removeExistingNotices();

            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) return Promise.resolve();

            return this.safeApiCall(function() {
                return SupabaseAPI.canEditLessonPlan();
            }).then(function(canEdit) {
                let noticeContent = '';
                let noticeType = '';

                if (!lessonPlan) {
                    if (!canEdit) {
                        noticeContent = `
                            <div class="notice-content warning">
                                <i data-lucide="alert-triangle"></i>
                                <div>
                                    <h4>⚠️ 수업계획 수정 기간이 종료되었습니다</h4>
                                    <p>수업계획 작성/수정 가능 기간이 지났습니다. 수업계획은 <strong>필수 제출 사항</strong>이므로 관리자에게 즉시 문의하세요.</p>
                                </div>
                            </div>
                        `;
                        noticeType = 'warning';
                    } else {
                        noticeContent = `
                            <div class="notice-content info">
                                <i data-lucide="calendar-plus"></i>
                                <div>
                                    <h4>📋 수업계획 작성이 필요합니다 (필수)</h4>
                                    <p><strong>수업계획은 필수 제출 사항입니다.</strong> 교구 신청 전에 반드시 수업계획을 작성하고 관리자의 승인을 받아야 합니다.</p>
                                    <button class="btn primary small" onclick="StudentManager.handleLessonPlanClick()">
                                        ✍️ 지금 작성하기
                                    </button>
                                </div>
                            </div>
                        `;
                        noticeType = 'info';
                    }
                } else if (lessonPlan.status === 'approved') {
                    noticeContent = `
                        <div class="notice-content success">
                            <i data-lucide="calendar-check"></i>
                            <div>
                                <h4>✅ 수업계획이 승인되었습니다!</h4>
                                <p>이제 교구 신청이 가능합니다. 승인된 예산 내에서 필요한 교구를 신청해주세요.</p>
                                <button class="btn success small" onclick="StudentManager.handleLessonPlanClick()">
                                    📋 승인된 계획 확인하기
                                </button>
                            </div>
                        </div>
                    `;
                    noticeType = 'success';
                }

                if (noticeContent) {
                    self.displayNotice(noticeContent, noticeType);
                }
            }).catch(function(error) {
                console.error('수업계획 수정 가능 여부 확인 오류:', error);
            });
        } catch (error) {
            console.error('수업계획 상태 알림 표시 오류:', error);
            return Promise.resolve();
        }
    },

    removeExistingNotices: function() {
        try {
            const noticeSelectors = [
                '#lessonPlanNotice',
                '#basicNotice',
                '.dashboard-notice',
                '.lesson-plan-notice',
                '.notice-duplicate'
            ];

            noticeSelectors.forEach(function(selector) {
                const notices = document.querySelectorAll(selector);
                for (let i = 0; i < notices.length; i++) {
                    const notice = notices[i];
                    if (notice && notice.parentNode) {
                        notice.parentNode.removeChild(notice);
                    }
                }
            });
        } catch (error) {
            console.error('기존 알림 제거 오류:', error);
        }
    },

    displayNotice: function(content, type) {
        try {
            this.removeExistingNotices();
            
            const notice = document.createElement('div');
            notice.id = 'lessonPlanNotice';
            notice.className = 'dashboard-notice ' + type;
            notice.innerHTML = content;
            
            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader && dashboardHeader.parentNode) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                console.log('✅ 수업계획 상태 알림 표시됨:', type);
            }
        } catch (error) {
            console.error('알림 표시 오류:', error);
        }
    },

    showApiErrorNotice: function() {
        this.showErrorNotice('서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
    },

    showErrorNotice: function(message) {
        this.displayNotice(`
            <div class="notice-content danger">
                <i data-lucide="wifi-off"></i>
                <div>
                    <h4>❌ 연결 오류</h4>
                    <p>${message}</p>
                    <button class="btn secondary small" onclick="location.reload()">
                        🔄 새로고침
                    </button>
                </div>
            </div>
        `, 'danger');
    },

    showLessonPlanRequiredNotice: function() {
        this.displayNotice(`
            <div class="notice-content info">
                <i data-lucide="calendar-plus"></i>
                <div>
                    <h4>📋 수업계획 작성이 필요합니다</h4>
                    <p>교구 신청을 위해서는 먼저 수업계획을 작성해야 합니다.</p>
                    <button class="btn primary small" onclick="StudentManager.handleLessonPlanClick()">
                        ✍️ 수업계획 작성하기
                    </button>
                </div>
            </div>
        `, 'info');
    },

    // 모달 상호작용 이벤트 설정
    setupModalInteractionEvents: function() {
        try {
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideAllModals();
                    if (window.StudentAddon && window.StudentAddon.hideShippingModal) {
                        window.StudentAddon.hideShippingModal();
                    }
                }
            });
        } catch (error) {
            console.error('모달 상호작용 이벤트 설정 오류:', error);
        }
    },

    hideAllModals: function() {
        try {
            const modals = document.querySelectorAll('.modal');
            for (let i = 0; i < modals.length; i++) {
                modals[i].classList.remove('show');
            }
            
            document.body.style.overflow = '';
            
            this.hideApplicationModal();
            this.hideBundleModal();
        } catch (error) {
            console.error('모달 숨김 오류:', error);
        }
    }
};

// 전역 접근을 위한 window 객체에 추가
window.StudentManager = StudentManager;

// 전역 호환성 함수들
window.goToStudentDashboard = function() {
    console.log('🔄 전역 goToStudentDashboard 호출됨');
    
    if (window.StudentManager && typeof window.StudentManager.goToStudentDashboard === 'function') {
        return window.StudentManager.goToStudentDashboard();
    } else {
        console.error('❌ StudentManager.goToStudentDashboard를 찾을 수 없습니다');
        window.location.reload();
        return false;
    }
};

window.initializeStudentPage = function() {
    console.log('🔄 initializeStudentPage 호출됨 (호환성 함수)');
    
    if (typeof StudentManager !== 'undefined' && StudentManager.init) {
        return StudentManager.init();
    } else {
        console.error('❌ StudentManager를 찾을 수 없습니다');
        return Promise.reject(new Error('StudentManager를 찾을 수 없습니다'));
    }
};

console.log('📚 StudentManager v3.0 로드 완료 - 슬림화된 핵심 매니저 (모듈 시스템)');