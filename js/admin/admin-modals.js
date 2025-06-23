// 모달 관리 전용 모듈 (admin-modals.js)
AdminManager.Modals = {
    // 초기화
    init() {
        console.log('🪟 Modals 모듈 초기화');
        this.setupModalEventListeners();
        return true;
    },

    // 모달 이벤트 리스너 설정
    setupModalEventListeners() {
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });
    },

    // 최상위 모달 닫기
    closeTopModal() {
        const activeModals = document.querySelectorAll('.modal.active');
        if (activeModals.length > 0) {
            const topModal = activeModals[activeModals.length - 1];
            topModal.classList.remove('active');
        }
    },

    // 🛠️ 예산 설정 모달 생성 (이벤트 리스너 추가)
    createBudgetSettingsModal() {
        if (!document.getElementById('budgetSettingsModal')) {
            const modalHTML = `
                <div id="budgetSettingsModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h3>분야별 예산 설정</h3>
                            <button class="close-btn" id="budgetSettingsCloseBtn">&times;</button>
                        </div>
                        <form id="budgetSettingsForm">
                            <div class="budget-settings-info">
                                <p>각 분야별로 회당 지원금과 최대 상한을 설정하세요. 학생의 수업계획이 승인되면 이 설정에 따라 자동으로 예산이 배정됩니다.</p>
                            </div>
                            
                            <div class="table-container">
                                <table id="budgetSettingsTable" class="budget-settings-table">
                                    <thead>
                                        <tr>
                                            <th>분야</th>
                                            <th>회당 지원금 (원)</th>
                                            <th>최대 상한 (원)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- 동적으로 생성됨 -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="modal-actions">
                                <button type="button" id="budgetSettingsCancelBtn" class="btn secondary">취소</button>
                                <button type="submit" class="btn primary">설정 저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // 🛠️ 모달 생성 직후 이벤트 리스너 설정
            this.setupBudgetSettingsEventListeners();
            
            console.log('✅ 예산 설정 모달 생성 및 이벤트 리스너 설정 완료');
        }
    },

    // 🛠️ 예산 설정 모달 이벤트 리스너 설정 (새로 추가)
    setupBudgetSettingsEventListeners() {
        const form = document.getElementById('budgetSettingsForm');
        const cancelBtn = document.getElementById('budgetSettingsCancelBtn');
        const closeBtn = document.getElementById('budgetSettingsCloseBtn');
        const modal = document.getElementById('budgetSettingsModal');

        if (form) {
            // 폼 제출 이벤트
            form.addEventListener('submit', (e) => {
                e.preventDefault(); // 🛠️ 페이지 새로고침 방지
                console.log('💰 예산 설정 폼 제출 이벤트 실행');
                
                if (window.AdminManager && window.AdminManager.Budget && 
                    typeof window.AdminManager.Budget.handleBudgetSettingsSubmit === 'function') {
                    window.AdminManager.Budget.handleBudgetSettingsSubmit();
                } else {
                    console.error('❌ AdminManager.Budget.handleBudgetSettingsSubmit 함수를 찾을 수 없습니다');
                    Utils.showToast('예산 설정 저장 기능을 불러올 수 없습니다.', 'error');
                }
            });
        }

        if (cancelBtn) {
            // 취소 버튼 이벤트
            cancelBtn.addEventListener('click', () => {
                console.log('💰 예산 설정 취소 버튼 클릭');
                if (window.AdminManager && window.AdminManager.Budget && 
                    typeof window.AdminManager.Budget.hideBudgetSettingsModal === 'function') {
                    window.AdminManager.Budget.hideBudgetSettingsModal();
                } else {
                    // 폴백: 직접 모달 숨기기
                    if (modal) {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        if (closeBtn) {
            // 🔧 닫기 버튼 이벤트 (onclick 제거)
            closeBtn.addEventListener('click', () => {
                console.log('💰 예산 설정 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.Budget && 
                    typeof window.AdminManager.Budget.hideBudgetSettingsModal === 'function') {
                    window.AdminManager.Budget.hideBudgetSettingsModal();
                } else {
                    // 폴백: 직접 모달 숨기기
                    if (modal) {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        if (modal) {
            // 모달 배경 클릭 시 닫기
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'budgetSettingsModal') {
                    console.log('💰 예산 설정 모달 배경 클릭으로 닫기');
                    if (window.AdminManager && window.AdminManager.Budget && 
                        typeof window.AdminManager.Budget.hideBudgetSettingsModal === 'function') {
                        window.AdminManager.Budget.hideBudgetSettingsModal();
                    } else {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        console.log('🛠️ 예산 설정 모달 이벤트 리스너 설정 완료');
    },

    // 🔧 수업계획 관리 모달 생성 (닫기 버튼 onclick 제거)
    createLessonPlanManagementModal() {
        if (!document.getElementById('lessonPlanManagementModal')) {
            const modalHTML = `
                <div id="lessonPlanManagementModal" class="modal">
                    <div class="modal-content expanded">
                        <div class="modal-header">
                            <h3>수업계획 승인 관리</h3>
                            <button class="close-btn" id="lessonPlanManagementCloseHeaderBtn">&times;</button>
                        </div>
                        <div class="lesson-plan-management-container">
                            <div class="management-header">
                                <div class="management-stats">
                                    <span id="pendingPlansCount" class="stat-badge pending">대기 중: 0</span>
                                    <span id="approvedPlansCount" class="stat-badge approved">승인됨: 0</span>
                                    <span id="rejectedPlansCount" class="stat-badge rejected">반려됨: 0</span>
                                </div>
                                <div class="management-actions">
                                    <button id="refreshPlansBtn" class="btn small secondary">
                                        <i data-lucide="refresh-cw"></i> 새로고침
                                    </button>
                                </div>
                            </div>
                            
                            <div id="lessonPlansList" class="lesson-plans-list">
                                <!-- 동적으로 생성됨 -->
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" id="lessonPlanManagementCloseBtn" class="btn secondary">닫기</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // 🔧 모달 생성 직후 이벤트 리스너 설정
            this.setupLessonPlanManagementEventListeners();
            
            console.log('✅ 수업계획 관리 모달 생성 완료');
        }
    },

    // 🔧 수업계획 관리 모달 이벤트 리스너 설정 (새로 추가)
    setupLessonPlanManagementEventListeners() {
        const closeHeaderBtn = document.getElementById('lessonPlanManagementCloseHeaderBtn');
        const closeBtn = document.getElementById('lessonPlanManagementCloseBtn');
        const modal = document.getElementById('lessonPlanManagementModal');

        if (closeHeaderBtn) {
            closeHeaderBtn.addEventListener('click', () => {
                console.log('📚 수업계획 관리 모달 헤더 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.LessonPlans && 
                    typeof window.AdminManager.LessonPlans.hideLessonPlanManagementModal === 'function') {
                    window.AdminManager.LessonPlans.hideLessonPlanManagementModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('📚 수업계획 관리 모달 하단 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.LessonPlans && 
                    typeof window.AdminManager.LessonPlans.hideLessonPlanManagementModal === 'function') {
                    window.AdminManager.LessonPlans.hideLessonPlanManagementModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'lessonPlanManagementModal') {
                    console.log('📚 수업계획 관리 모달 배경 클릭으로 닫기');
                    if (window.AdminManager && window.AdminManager.LessonPlans && 
                        typeof window.AdminManager.LessonPlans.hideLessonPlanManagementModal === 'function') {
                        window.AdminManager.LessonPlans.hideLessonPlanManagementModal();
                    } else {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        console.log('🔧 수업계획 관리 모달 이벤트 리스너 설정 완료');
    },

    // 🔧 세부 수업계획 보기 모달 생성 (크기 확대 버전, onclick 제거)
    createViewLessonPlanModal() {
        if (!document.getElementById('viewLessonPlanModal')) {
            const modalHTML = `
                <div id="viewLessonPlanModal" class="modal">
                    <div class="modal-content fullscreen-large">
                        <div class="modal-header">
                            <h3>수업계획 상세보기</h3>
                            <button class="close-btn" id="viewLessonPlanCloseHeaderBtn">&times;</button>
                        </div>
                        <div class="lesson-plan-detail">
                            <div class="student-info-section">
                                <h4 id="detailStudentName">학생명</h4>
                                <p id="detailStudentInfo">학당 정보</p>
                            </div>
                            
                            <div class="plan-overview-section">
                                <div class="plan-overview-grid">
                                    <div class="overview-item">
                                        <span class="label">수업 기간:</span>
                                        <span id="detailPlanPeriod" class="value">-</span>
                                    </div>
                                    <div class="overview-item">
                                        <span class="label">총 수업 횟수:</span>
                                        <span id="detailTotalLessons" class="value">-</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="budget-allocation-section">
                                <h4>예산 배정 정보</h4>
                                <div class="budget-allocation-grid">
                                    <div class="allocation-item">
                                        <span class="label">분야:</span>
                                        <span id="detailField" class="value">-</span>
                                    </div>
                                    <div class="allocation-item">
                                        <span class="label">회당 지원금:</span>
                                        <span id="detailPerLessonAmount" class="value">-</span>
                                    </div>
                                    <div class="allocation-item">
                                        <span class="label">수업 횟수:</span>
                                        <span id="detailLessonCount" class="value">-</span>
                                    </div>
                                    <div class="allocation-item">
                                        <span class="label">총 배정 예산:</span>
                                        <span id="detailTotalBudget" class="value total">-</span>
                                    </div>
                                </div>
                                <div class="budget-calculation-note">
                                    <small><!-- 계산 과정 표시 --></small>
                                </div>
                            </div>
                            
                            <div class="lesson-goals-section">
                                <h4>수업 목표</h4>
                                <p id="detailOverallGoals">-</p>
                            </div>
                            
                            <div class="lesson-schedule-section">
                                <h4>수업 일정표</h4>
                                <div id="detailLessonSchedule" class="lesson-schedule-container">
                                    <!-- 동적으로 생성됨 -->
                                </div>
                            </div>
                            
                            <div id="specialNotesSection" class="special-notes-section">
                                <h4>특별 고려사항</h4>
                                <p id="detailSpecialNotes">-</p>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" id="viewLessonPlanCloseBtn" class="btn secondary">닫기</button>
                            <button type="button" id="approveLessonPlanBtn" class="btn approve">
                                <i data-lucide="check"></i> 승인
                            </button>
                            <button type="button" id="rejectLessonPlanBtn" class="btn reject">
                                <i data-lucide="x"></i> 반려
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // 🔧 모달 생성 직후 이벤트 리스너 설정
            this.setupViewLessonPlanEventListeners();
            
            console.log('✅ 세부 수업계획 보기 모달 생성 완료 (확대 버전)');
        }
    },

    // 🔧 세부 수업계획 보기 모달 이벤트 리스너 설정 (새로 추가)
    setupViewLessonPlanEventListeners() {
        const closeHeaderBtn = document.getElementById('viewLessonPlanCloseHeaderBtn');
        const closeBtn = document.getElementById('viewLessonPlanCloseBtn');
        const modal = document.getElementById('viewLessonPlanModal');

        if (closeHeaderBtn) {
            closeHeaderBtn.addEventListener('click', () => {
                console.log('👁️ 수업계획 상세보기 모달 헤더 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.LessonPlans && 
                    typeof window.AdminManager.LessonPlans.hideViewLessonPlanModal === 'function') {
                    window.AdminManager.LessonPlans.hideViewLessonPlanModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('👁️ 수업계획 상세보기 모달 하단 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.LessonPlans && 
                    typeof window.AdminManager.LessonPlans.hideViewLessonPlanModal === 'function') {
                    window.AdminManager.LessonPlans.hideViewLessonPlanModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'viewLessonPlanModal') {
                    console.log('👁️ 수업계획 상세보기 모달 배경 클릭으로 닫기');
                    if (window.AdminManager && window.AdminManager.LessonPlans && 
                        typeof window.AdminManager.LessonPlans.hideViewLessonPlanModal === 'function') {
                        window.AdminManager.LessonPlans.hideViewLessonPlanModal();
                    } else {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        console.log('🔧 세부 수업계획 보기 모달 이벤트 리스너 설정 완료');
    },

    // 🔧 수업계획 설정 모달 생성 (onclick 제거)
    createLessonPlanSettingsModal() {
        if (!document.getElementById('lessonPlanSettingsModal')) {
            const modalHTML = `
                <div id="lessonPlanSettingsModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>수업계획 편집 설정</h3>
                            <button class="close-btn" id="lessonPlanSettingsCloseBtn">&times;</button>
                        </div>
                        <form id="lessonPlanSettingsForm">
                            <div class="form-section">
                                <h4>수업계획 수정 마감일</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="planEditDeadline">마감일</label>
                                        <input type="date" id="planEditDeadline" name="deadline" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="planEditTime">시간</label>
                                        <input type="time" id="planEditTime" name="time" value="23:59">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <h4>고급 설정</h4>
                                <div class="form-group checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="testModeEnabled" name="testMode">
                                        <span class="checkmark"></span>
                                        테스트 모드 (항상 편집 가능)
                                    </label>
                                    <small class="help-text">개발/테스트 목적으로 마감일을 무시하고 항상 편집을 허용합니다.</small>
                                </div>
                                
                                <div class="form-group checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="allowOverrideDeadline" name="overrideDeadline">
                                        <span class="checkmark"></span>
                                        마감일 무시 모드
                                    </label>
                                    <small class="help-text">특별한 사유로 마감일을 무시하고 편집을 허용합니다.</small>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <h4>안내 메시지</h4>
                                <div class="form-group">
                                    <label for="planEditNotice">학생용 안내 메시지</label>
                                    <textarea id="planEditNotice" name="notice" rows="3" 
                                              placeholder="수업계획 편집 페이지에서 학생들에게 표시될 안내 메시지를 입력하세요."></textarea>
                                </div>
                            </div>
                            
                            <div class="modal-actions">
                                <button type="button" id="planSettingsCancelBtn" class="btn secondary">취소</button>
                                <button type="submit" class="btn primary">설정 저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // 🔧 모달 생성 직후 이벤트 리스너 설정
            this.setupLessonPlanSettingsEventListeners();
            
            console.log('✅ 수업계획 설정 모달 생성 완료');
        }
    },

    // 🔧 수업계획 설정 모달 이벤트 리스너 설정 (새로 추가)
    setupLessonPlanSettingsEventListeners() {
        const closeBtn = document.getElementById('lessonPlanSettingsCloseBtn');
        const cancelBtn = document.getElementById('planSettingsCancelBtn');
        const modal = document.getElementById('lessonPlanSettingsModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('⚙️ 수업계획 설정 모달 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.LessonPlans && 
                    typeof window.AdminManager.LessonPlans.hideLessonPlanSettingsModal === 'function') {
                    window.AdminManager.LessonPlans.hideLessonPlanSettingsModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('⚙️ 수업계획 설정 모달 취소 버튼 클릭');
                if (window.AdminManager && window.AdminManager.LessonPlans && 
                    typeof window.AdminManager.LessonPlans.hideLessonPlanSettingsModal === 'function') {
                    window.AdminManager.LessonPlans.hideLessonPlanSettingsModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'lessonPlanSettingsModal') {
                    console.log('⚙️ 수업계획 설정 모달 배경 클릭으로 닫기');
                    if (window.AdminManager && window.AdminManager.LessonPlans && 
                        typeof window.AdminManager.LessonPlans.hideLessonPlanSettingsModal === 'function') {
                        window.AdminManager.LessonPlans.hideLessonPlanSettingsModal();
                    } else {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        console.log('🔧 수업계획 설정 모달 이벤트 리스너 설정 완료');
    },

    // 🔧 기능 설정 모달 생성 (onclick 제거)
    createFeatureSettingsModal() {
        if (!document.getElementById('featureSettingsModal')) {
            const modalHTML = `
                <div id="featureSettingsModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>시스템 기능 관리</h3>
                            <button class="close-btn" id="featureSettingsCloseBtn">&times;</button>
                        </div>
                        <div class="feature-management-container">
                            <div class="feature-management-header">
                                <p>학생 시스템에서 사용할 수 있는 기능들을 활성화하거나 비활성화할 수 있습니다.</p>
                            </div>
                            
                            <div id="featureList" class="feature-list">
                                <!-- 동적으로 생성됨 -->
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" id="featureSettingsModalCloseBtn" class="btn secondary">닫기</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // 🔧 모달 생성 직후 이벤트 리스너 설정
            this.setupFeatureSettingsEventListeners();
            
            console.log('✅ 기능 설정 모달 생성 완료');
        }
    },

    // 🔧 기능 설정 모달 이벤트 리스너 설정 (새로 추가)
    setupFeatureSettingsEventListeners() {
        const closeBtn = document.getElementById('featureSettingsCloseBtn');
        const modalCloseBtn = document.getElementById('featureSettingsModalCloseBtn');
        const modal = document.getElementById('featureSettingsModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('🔧 기능 설정 모달 헤더 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.Features && 
                    typeof window.AdminManager.Features.hideFeatureSettingsModal === 'function') {
                    window.AdminManager.Features.hideFeatureSettingsModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                console.log('🔧 기능 설정 모달 하단 닫기 버튼 클릭');
                if (window.AdminManager && window.AdminManager.Features && 
                    typeof window.AdminManager.Features.hideFeatureSettingsModal === 'function') {
                    window.AdminManager.Features.hideFeatureSettingsModal();
                } else {
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'featureSettingsModal') {
                    console.log('🔧 기능 설정 모달 배경 클릭으로 닫기');
                    if (window.AdminManager && window.AdminManager.Features && 
                        typeof window.AdminManager.Features.hideFeatureSettingsModal === 'function') {
                        window.AdminManager.Features.hideFeatureSettingsModal();
                    } else {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        console.log('🔧 기능 설정 모달 이벤트 리스너 설정 완료');
    },

    // 확인 다이얼로그 생성
    createConfirmDialog(message, onConfirm, onCancel) {
        // 기존 확인 다이얼로그 제거
        const existingDialog = document.querySelector('.confirm-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialogHTML = `
            <div class="modal confirm-dialog active">
                <div class="modal-content small">
                    <div class="modal-header">
                        <h3>확인</h3>
                    </div>
                    <div class="modal-body">
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn secondary cancel-btn">취소</button>
                        <button type="button" class="btn primary confirm-btn">확인</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        const dialog = document.querySelector('.confirm-dialog');
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');

        // 이벤트 리스너 설정
        confirmBtn.addEventListener('click', () => {
            dialog.remove();
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            dialog.remove();
            if (onCancel) onCancel();
        });

        // ESC 키 처리
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                dialog.remove();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // 포커스 설정
        setTimeout(() => confirmBtn.focus(), 100);

        return dialog;
    },

    // 프롬프트 다이얼로그 생성
    createPromptDialog(message, defaultValue = '', onConfirm, onCancel) {
        // 기존 프롬프트 다이얼로그 제거
        const existingDialog = document.querySelector('.prompt-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialogHTML = `
            <div class="modal prompt-dialog active">
                <div class="modal-content small">
                    <div class="modal-header">
                        <h3>입력</h3>
                    </div>
                    <div class="modal-body">
                        <p>${this.escapeHtml(message)}</p>
                        <input type="text" class="prompt-input" value="${this.escapeHtml(defaultValue)}" autofocus>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn secondary cancel-btn">취소</button>
                        <button type="button" class="btn primary confirm-btn">확인</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        const dialog = document.querySelector('.prompt-dialog');
        const input = dialog.querySelector('.prompt-input');
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');

        // 이벤트 리스너 설정
        const handleConfirm = () => {
            const value = input.value.trim();
            dialog.remove();
            if (onConfirm) onConfirm(value);
        };

        const handleCancel = () => {
            dialog.remove();
            if (onCancel) onCancel();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        // Enter 키로 확인
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });

        // 포커스 설정 및 텍스트 선택
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);

        return dialog;
    },

    // 토스트 메시지 생성
    createToast(message, type = 'info', duration = 3000) {
        // 토스트 컨테이너가 없으면 생성
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // 토스트 요소 생성
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <div class="toast-content">
                <i data-lucide="${icon}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
            <button class="toast-close" aria-label="닫기">&times;</button>
        `;

        // 토스트 추가
        toastContainer.appendChild(toast);

        // 아이콘 생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 닫기 버튼 이벤트
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // 자동 제거
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // 애니메이션 효과
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        return toast;
    },

    // 토스트 제거
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    },

    // 토스트 아이콘 가져오기
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'x-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        return icons[type] || 'info';
    },

    // HTML 이스케이프 (보안용)
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 새로고침 함수
    async refresh() {
        console.log('🔄 Modals 모듈 새로고침 (추가 작업 없음)');
        // Modals 모듈은 상태가 없으므로 별도 새로고침 작업 불필요
        return true;
    }
};

// 전역 접근을 위한 별명
window.AdminModals = AdminManager.Modals;

console.log('🪟 AdminManager.Modals 모듈 로드 완료 (v2.13 - 모달 닫기 버튼 이벤트 리스너 방식으로 수정)');

// 🆕 fullscreen-large 모달 스타일 추가
if (!document.querySelector('#fullscreen-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'fullscreen-modal-styles';
    style.textContent = `
        /* 90%×90% 크기의 수업계획 상세보기 모달 */
        .modal-content.fullscreen-large {
            width: 90vw !important;
            height: 90vh !important;
            max-width: 90vw !important;
            max-height: 90vh !important;
            margin: 5vh auto !important;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .modal-content.fullscreen-large .modal-header {
            flex-shrink: 0;
            border-bottom: 1px solid #e2e8f0;
            padding: 1.5rem 2rem;
        }
        
        .modal-content.fullscreen-large .lesson-plan-detail {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem 2rem;
        }
        
        .modal-content.fullscreen-large .modal-actions {
            flex-shrink: 0;
            border-top: 1px solid #e2e8f0;
            padding: 1.5rem 2rem;
            background: #f8fafc;
        }
        
        /* 수업 일정표 컨테이너 크기 조정 */
        .modal-content.fullscreen-large .lesson-schedule-container {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            background: white;
        }
        
        .modal-content.fullscreen-large .schedule-table {
            width: 100%;
            margin: 0;
        }
        
        .modal-content.fullscreen-large .schedule-table th,
        .modal-content.fullscreen-large .schedule-table td {
            padding: 0.75rem;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .modal-content.fullscreen-large .schedule-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        
        /* 모바일 반응형 */
        @media (max-width: 768px) {
            .modal-content.fullscreen-large {
                width: 95vw !important;
                height: 95vh !important;
                margin: 2.5vh auto !important;
            }
            
            .modal-content.fullscreen-large .modal-header,
            .modal-content.fullscreen-large .lesson-plan-detail,
            .modal-content.fullscreen-large .modal-actions {
                padding: 1rem;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('🎨 fullscreen-large 모달 스타일 추가 완료');
}
