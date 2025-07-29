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

    
    // 🆕 구매 완료 모달 관련 함수들 (v11.1.0)
        
    /**
     * 구매 완료 모달 생성 및 표시
     * @param {string} requestId - 신청 ID
     * @param {HTMLElement} buttonElement - 클릭된 버튼 요소
     */
    showPurchaseCompleteModal: function(requestId, buttonElement) {
        // 기존 모달이 있다면 제거
        const existingModal = document.getElementById('purchaseCompleteModal');
        if (existingModal) {
            existingModal.remove();
        }

        // 신청 정보 조회하여 모달 생성
        this.loadRequestDataAndShowModal(requestId, buttonElement);
    },


    /**
     * 신청 데이터 로드 및 모달 표시
     */
    loadRequestDataAndShowModal: async function(requestId, buttonElement) {
        try {
            // 로딩 상태 표시
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '<i data-lucide="loader-2"></i> 로딩...';
            }

            // Supabase 클라이언트 확인 및 가져오기
            let supabaseClient = null;

            // 여러 가능한 Supabase 클라이언트 확인
            if (window.supabase && typeof window.supabase.from === 'function') {
                supabaseClient = window.supabase;
            } else if (window.SupabaseAPI && window.SupabaseAPI.client) {
                supabaseClient = window.SupabaseAPI.client;
            } else if (window.AdminManager && window.AdminManager.supabase) {
                supabaseClient = window.AdminManager.supabase;
            } else {
                throw new Error('Supabase 클라이언트를 찾을 수 없습니다.');
            }

            // 신청 정보 조회
            const { data: requestData, error } = await supabaseClient
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (error) throw error;

            // 모달 HTML 생성 및 표시
            this.createPurchaseCompleteModal(requestData, requestId);
            this.setupPurchaseCompleteEventListeners(requestId);

        } catch (error) {
            console.error('신청 정보 로드 오류:', error);
            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('신청 정보를 불러오는데 실패했습니다.', 'error');
            }
        } finally {
            // 버튼 상태 복원
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = '<i data-lucide="check"></i> 구매 완료';
            }
        }
    },

    /**
     * 구매 완료 모달 HTML 생성 (간소화 버전)
     */
    createPurchaseCompleteModal: function(requestData, requestId) {
        // 💰 가격 정보 (price 컬럼 사용)
        const priceAmount = requestData.price || 0;

        // 💸 가격 포맷팅
        const formatPrice = (amount) => {
            if (!amount) return '0';
            return parseInt(amount).toLocaleString('ko-KR');
        };

        const modalHTML = `
            <div id="purchaseCompleteModal" class="modal active">
                <div class="modal-content purchase-complete-modal">
                    <div class="modal-header">
                        <h3><i data-lucide="shopping-cart"></i> 구매 완료 처리</h3>
                        <button class="close-btn" data-action="close-purchase-modal">&times;</button>
                    </div>

                    <div class="modal-body">
                        <!-- 학생 신청 정보 표시 (간소화) -->
                        <div class="student-request-info">
                            <h4><i data-lucide="user"></i> 학생 신청 정보</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>신청 금액:</label>
                                    <span id="originalAmount" class="amount-display">${formatPrice(priceAmount)}원</span>
                                </div>
                                <div class="info-item">
                                    <label>교구명:</label>
                                    <span id="itemName">${requestData.item_name || '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="form-divider"></div>

                        <!-- 최종 구매 정보 입력 -->
                        <div class="final-purchase-info">
                            <h4><i data-lucide="credit-card"></i> 구매 완료 정보</h4>

                            <!-- 최종 구매 금액 입력 -->
                            <div class="form-group final-amount-section">
                                <label for="finalAmount">최종 구매 금액 <span class="required">*</span></label>
                                <div class="amount-input-wrapper">
                                    <input type="number" id="finalAmount" class="final-amount-input" 
                                           value="${priceAmount || ''}" 
                                           min="0" step="1000" required>
                                    <span class="currency">원</span>
                                </div>
                                <div class="amount-difference" id="amountDifference" style="display: none;">
                                    <span class="diff-text"></span>
                                </div>
                            </div>

                            <!-- 구매 날짜 입력 -->
                            <div class="form-group purchase-date-section">
                                <label for="purchaseDate">구매 날짜 <span class="required">*</span></label>
                                <input type="date" id="purchaseDate" class="purchase-date-input" 
                                       value="${new Date().toISOString().split('T')[0]}" required>
                            </div>

                            <!-- 관리자 영수증 업로드 -->
                            <div class="form-group admin-receipt-section">
                                <label for="adminReceiptFile">관리자 구매 영수증 <span class="required">*</span></label>
                                <div class="file-upload-area" id="adminReceiptUpload">
                                    <input type="file" id="adminReceiptFile" 
                                           accept="image/*,.pdf" style="display: none;" required>
                                    <div class="upload-placeholder">
                                        <i data-lucide="upload" class="upload-icon"></i>
                                        <div class="upload-text">
                                            <p>파일을 선택하거나 여기에 드래그해주세요</p>
                                            <small>이미지 파일 또는 PDF (최대 10MB)</small>
                                        </div>
                                    </div>
                                    <div class="file-info" style="display: none;">
                                        <i data-lucide="file-text"></i>
                                        <span class="file-name"></span>
                                        <button type="button" class="remove-file-btn" title="파일 제거">
                                            <i data-lucide="x"></i>
                                        </button>
                                    </div>
                                    <div class="upload-progress" style="display: none;">
                                        <div class="progress-bar">
                                            <div class="progress-fill"></div>
                                        </div>
                                        <span class="progress-text">0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn secondary" data-action="close-purchase-modal">
                            <i data-lucide="x"></i> 취소
                        </button>
                        <button type="button" class="btn primary" id="submitPurchaseComplete">
                            <i data-lucide="check"></i> 구매 완료 처리
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 모달을 body에 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 아이콘 렌더링
        if (window.lucide) {
            lucide.createIcons();
        }
    },

    /**
     * 구매 완료 모달 이벤트 리스너 설정
     */
    setupPurchaseCompleteEventListeners: function(requestId) {
        const modal = document.getElementById('purchaseCompleteModal');
        if (!modal) return;

        const finalAmountInput = modal.querySelector('#finalAmount');
        const originalAmountSpan = modal.querySelector('#originalAmount');
        const amountDifferenceDiv = modal.querySelector('#amountDifference');
        const fileInput = modal.querySelector('#adminReceiptFile');
        const uploadArea = modal.querySelector('#adminReceiptUpload');
        const submitButton = modal.querySelector('#submitPurchaseComplete');

        // 닫기 버튼 이벤트
        modal.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="close-purchase-modal"]') || 
                e.target.closest('[data-action="close-purchase-modal"]')) {
                this.closePurchaseCompleteModal();
            }
        });

        // 모달 외부 클릭시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePurchaseCompleteModal();
            }
        });

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closePurchaseCompleteModal();
            }
        });

        // 최종 금액 변경시 차이 표시
        if (finalAmountInput && originalAmountSpan) {
            finalAmountInput.addEventListener('input', () => {
                this.updateAmountDifference(finalAmountInput, originalAmountSpan, amountDifferenceDiv);
            });

            // 초기 차이 계산
            this.updateAmountDifference(finalAmountInput, originalAmountSpan, amountDifferenceDiv);
        }

        // 파일 업로드 이벤트 설정
        this.setupFileUploadEvents(uploadArea, fileInput);

        // 제출 버튼 이벤트
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                this.handlePurchaseCompleteSubmit(requestId);
            });
        }
    },

    /**
     * 금액 차이 표시 업데이트
     */
    updateAmountDifference: function(finalAmountInput, originalAmountSpan, amountDifferenceDiv) {
        const finalAmount = parseInt(finalAmountInput.value) || 0;
        const originalText = originalAmountSpan.textContent.replace(/[^0-9]/g, '');
        const originalAmount = parseInt(originalText) || 0;

        const difference = finalAmount - originalAmount;

        if (difference !== 0 && amountDifferenceDiv) {
            const diffText = amountDifferenceDiv.querySelector('.diff-text');
            if (difference > 0) {
                diffText.textContent = `신청 금액보다 ${this.formatPrice(difference)}원 많음`;
                diffText.className = 'diff-text over';
            } else {
                diffText.textContent = `신청 금액보다 ${this.formatPrice(Math.abs(difference))}원 적음`;
                diffText.className = 'diff-text under';
            }
            amountDifferenceDiv.style.display = 'block';
        } else {
            amountDifferenceDiv.style.display = 'none';
        }
    },

    /**
     * 파일 업로드 이벤트 설정
     */
    setupFileUploadEvents: function(uploadArea, fileInput) {
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        const fileInfo = uploadArea.querySelector('.file-info');
        const removeBtn = uploadArea.querySelector('.remove-file-btn');

        // 클릭으로 파일 선택
        placeholder.addEventListener('click', () => {
            fileInput.click();
        });

        // 드래그 앤 드롭 이벤트
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0], uploadArea, fileInput);
            }
        });

        // 파일 선택 이벤트
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0], uploadArea, fileInput);
            }
        });

        // 파일 제거 버튼
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.clearSelectedFile(uploadArea, fileInput);
            });
        }
    },

    /**
     * 파일 선택 처리
     */
    handleFileSelection: function(file, uploadArea, fileInput) {
        // 파일 크기 검증 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('파일 크기는 10MB 이하여야 합니다.', 'error');
            }
            return;
        }

        // 파일 형식 검증
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('이미지 파일 또는 PDF 파일만 업로드 가능합니다.', 'error');
            }
            return;
        }

        // 파일 정보 표시
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        const fileInfo = uploadArea.querySelector('.file-info');
        const fileName = fileInfo.querySelector('.file-name');

        placeholder.style.display = 'none';
        fileInfo.style.display = 'flex';
        fileName.textContent = file.name;

        // 선택된 파일을 input에 설정
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
    },

    /**
     * 선택된 파일 제거
     */
    clearSelectedFile: function(uploadArea, fileInput) {
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        const fileInfo = uploadArea.querySelector('.file-info');

        placeholder.style.display = 'block';
        fileInfo.style.display = 'none';
        fileInput.value = '';
    },

    /**
     * 구매 완료 제출 처리
     */
    handlePurchaseCompleteSubmit: async function(requestId) {
        const modal = document.getElementById('purchaseCompleteModal');
        if (!modal) return;

        const finalAmount = modal.querySelector('#finalAmount').value;
        const purchaseDate = modal.querySelector('#purchaseDate').value;
        const fileInput = modal.querySelector('#adminReceiptFile');
        const submitButton = modal.querySelector('#submitPurchaseComplete');

        // 폼 검증
        if (!finalAmount || !purchaseDate || !fileInput.files[0]) {
            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('모든 필수 정보를 입력해주세요.', 'error');
            }
            return;
        }

        try {
            // 로딩 상태 설정
            submitButton.disabled = true;
            submitButton.innerHTML = '<i data-lucide="loader-2"></i> 처리 중...';

            // Supabase 클라이언트 확인
            let supabaseClient = null;

            if (window.supabase && typeof window.supabase.from === 'function') {
                supabaseClient = window.supabase;
            } else if (window.SupabaseAPI && window.SupabaseAPI.client) {
                supabaseClient = window.SupabaseAPI.client;
            } else if (window.AdminManager && window.AdminManager.supabase) {
                supabaseClient = window.AdminManager.supabase;
            } else {
                throw new Error('Supabase 클라이언트를 찾을 수 없습니다.');
            }

            // 파일 업로드
            const receiptUrl = await this.uploadAdminReceipt(fileInput.files[0], requestId, supabaseClient);

            // DB 업데이트
            const { error: updateError } = await supabaseClient
                .from('requests')
                .update({
                    status: 'purchased',
                    final_purchase_amount: parseInt(finalAmount),
                    admin_receipt_url: receiptUrl,
                    admin_purchase_date: purchaseDate
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // 성공 처리
            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('구매 완료 처리되었습니다.', 'success');
            }

            // 모달 닫기
            this.closePurchaseCompleteModal();

            // 페이지 새로고침 (또는 특정 영역만 업데이트)
            if (window.location.reload) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }

        } catch (error) {
            console.error('구매 완료 처리 오류:', error);
            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('구매 완료 처리에 실패했습니다.', 'error');
            }
        } finally {
            // 버튼 상태 복원
            submitButton.disabled = false;
            submitButton.innerHTML = '<i data-lucide="check"></i> 구매 완료 처리';
        }
    },

    /**
     * 관리자 영수증 파일 업로드 (올바른 버켓명 사용)
     */
    uploadAdminReceipt: async function(file, requestId, supabaseClient) {
        const timestamp = Date.now();
        const fileName = `admin_receipt_${requestId}_${timestamp}`;
        const filePath = `admin-receipts/${fileName}`;

        // 업로드 진행률 표시
        const uploadProgress = document.querySelector('#purchaseCompleteModal .upload-progress');

        if (uploadProgress) {
            uploadProgress.style.display = 'block';
        }

        try {
            // ✅ 올바른 버켓명 사용: receipt-files
            const { data, error } = await supabaseClient.storage
                .from('receipt-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // 공개 URL 생성
            const { data: urlData } = supabaseClient.storage
                .from('receipt-files')
                .getPublicUrl(data.path);

            return urlData.publicUrl;

        } catch (error) {
            console.error('파일 업로드 오류:', error);
            throw new Error('파일 업로드에 실패했습니다.');
        } finally {
            // 진행률 숨기기
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
            }
        }
    },

    /**
     * 구매 완료 모달 닫기
     */
    closePurchaseCompleteModal: function() {
        const modal = document.getElementById('purchaseCompleteModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    },

    /**
     * 가격 포맷팅 헬퍼 함수
     */
    formatPrice: function(amount) {
        if (!amount) return '0';
        return parseInt(amount).toLocaleString('ko-KR');
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
