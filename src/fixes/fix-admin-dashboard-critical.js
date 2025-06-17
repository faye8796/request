/**
 * 관리자 대시보드 중요 오류 수정
 * 
 * @problem 최근 구조 개선 업데이트 이후 관리자 대시보드에서 JavaScript 오류 발생
 * @solution 1. 누락된 모달 HTML 동적 생성, 2. 안전한 함수 호출, 3. 모듈 로딩 순서 개선
 * @affects 관리자 대시보드 전체, 예산 설정 모달, 수업계획 관리 모달
 * @author Claude AI
 * @date 2025-06-17
 */

(function() {
    'use strict';
    
    console.log('🔧 관리자 대시보드 중요 오류 수정 시작...');

    // 모달이 존재하는지 확인하고 없으면 생성하는 함수
    function ensureModalExists(modalId, createFunction) {
        let modal = document.getElementById(modalId);
        if (!modal) {
            console.log(`⚠️ ${modalId} 모달이 없어서 생성 중...`);
            modal = createFunction();
            if (modal) {
                document.body.appendChild(modal);
                console.log(`✅ ${modalId} 모달 생성 완료`);
            }
        }
        return modal;
    }

    // 예산 설정 모달 HTML 생성
    function createBudgetSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'budgetSettingsModal';
        modal.className = 'modal budget-settings-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>예산 설정</h3>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="budgetSettingsForm">
                        <div class="budget-settings-intro">
                            <p><i data-lucide="info"></i> 분야별 수업당 예산과 최대 예산 상한을 설정할 수 있습니다.</p>
                            <p><small>설정 변경 시 기존 승인받은 학생들의 예산도 자동으로 재계산됩니다.</small></p>
                        </div>
                        
                        <div class="budget-table-container">
                            <table id="budgetSettingsTable" class="budget-settings-table">
                                <thead>
                                    <tr>
                                        <th>분야</th>
                                        <th>수업당 예산 (원)</th>
                                        <th>최대 예산 상한 (원)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- 동적으로 생성됨 -->
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" id="budgetSettingsCancelBtn" class="btn secondary">취소</button>
                            <button type="submit" class="btn primary">설정 저장</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        return modal;
    }

    // 수업계획 관리 모달 HTML 생성
    function createLessonPlanManagementModal() {
        const modal = document.createElement('div');
        modal.id = 'lessonPlanManagementModal';
        modal.className = 'modal lesson-plan-management-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>수업계획 관리</h3>
                    <div class="header-actions">
                        <button id="refreshPlansBtn" class="btn small secondary">
                            <i data-lucide="refresh-cw"></i> 새로고침
                        </button>
                        <button class="close-btn" type="button">&times;</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="lesson-plan-stats">
                        <div class="stat-item">
                            <span id="pendingPlansCount">대기 중: 0</span>
                        </div>
                        <div class="stat-item">
                            <span id="approvedPlansCount">승인됨: 0</span>
                        </div>
                        <div class="stat-item">
                            <span id="rejectedPlansCount">반려됨: 0</span>
                        </div>
                    </div>
                    
                    <div id="lessonPlansList" class="lesson-plans-list">
                        <div class="loading-message">수업계획을 불러오는 중...</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" id="lessonPlanManagementCloseBtn" class="btn secondary">닫기</button>
                </div>
            </div>
        `;
        return modal;
    }

    // 세부 수업계획 보기 모달 HTML 생성
    function createViewLessonPlanModal() {
        const modal = document.createElement('div');
        modal.id = 'viewLessonPlanModal';
        modal.className = 'modal view-lesson-plan-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>수업계획 상세보기</h3>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="lesson-plan-detail">
                        <div class="student-info-section">
                            <h4>학생 정보</h4>
                            <div class="student-info-content">
                                <p><strong>이름:</strong> <span id="detailStudentName">-</span></p>
                                <p><strong>소속:</strong> <span id="detailStudentInfo">-</span></p>
                            </div>
                        </div>
                        
                        <div class="plan-info-section">
                            <h4>수업 정보</h4>
                            <div class="plan-info-content">
                                <p><strong>수업 기간:</strong> <span id="detailPlanPeriod">-</span></p>
                                <p><strong>총 수업 횟수:</strong> <span id="detailTotalLessons">0회</span></p>
                            </div>
                        </div>
                        
                        <div class="budget-info-section">
                            <h4>예산 정보</h4>
                            <div class="budget-calculation-note">
                                <div class="budget-info-content">
                                    <p><strong>분야:</strong> <span id="detailField">-</span></p>
                                    <p><strong>수업당 예산:</strong> <span id="detailPerLessonAmount">0원</span></p>
                                    <p><strong>수업 횟수:</strong> <span id="detailLessonCount">0회</span></p>
                                    <p><strong>총 배정 예산:</strong> <span id="detailTotalBudget">0원</span></p>
                                </div>
                                <small>예산 계산 정보가 여기에 표시됩니다.</small>
                            </div>
                        </div>
                        
                        <div class="goals-section">
                            <h4>수업 목표</h4>
                            <div class="goals-content">
                                <p id="detailOverallGoals">목표가 설정되지 않았습니다.</p>
                            </div>
                        </div>
                        
                        <div class="schedule-section">
                            <h4>수업 일정표</h4>
                            <div id="detailLessonSchedule" class="lesson-schedule-container">
                                <!-- 동적으로 생성됨 -->
                            </div>
                        </div>
                        
                        <div id="specialNotesSection" class="special-notes-section" style="display: none;">
                            <h4>특별 고려사항</h4>
                            <div class="special-notes-content">
                                <p id="detailSpecialNotes">-</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" id="viewLessonPlanCloseBtn" class="btn secondary">닫기</button>
                    <button type="button" id="rejectLessonPlanBtn" class="btn danger">
                        <i data-lucide="x"></i> 반려
                    </button>
                    <button type="button" id="approveLessonPlanBtn" class="btn success">
                        <i data-lucide="check"></i> 승인
                    </button>
                </div>
            </div>
        `;
        return modal;
    }

    // 영수증 보기 모달 HTML 생성
    function createViewReceiptModal() {
        const modal = document.createElement('div');
        modal.id = 'viewReceiptModal';
        modal.className = 'modal view-receipt-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>영수증 확인</h3>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="receipt-details">
                        <div class="receipt-info-grid">
                            <div class="receipt-info-item">
                                <label>교구명:</label>
                                <span id="viewReceiptItemName">-</span>
                            </div>
                            <div class="receipt-info-item">
                                <label>학생명:</label>
                                <span id="viewReceiptStudentName">-</span>
                            </div>
                            <div class="receipt-info-item">
                                <label>구매 금액:</label>
                                <span id="viewReceiptItemPrice">0원</span>
                            </div>
                            <div class="receipt-info-item">
                                <label>구매일:</label>
                                <span id="viewReceiptPurchaseDate">-</span>
                            </div>
                            <div class="receipt-info-item">
                                <label>구매 장소:</label>
                                <span id="viewReceiptStore">-</span>
                            </div>
                            <div class="receipt-info-item">
                                <label>제출일:</label>
                                <span id="viewReceiptSubmittedDate">-</span>
                            </div>
                            <div class="receipt-info-item full-width">
                                <label>참고사항:</label>
                                <span id="viewReceiptNote">-</span>
                            </div>
                        </div>
                        
                        <div class="receipt-image-container">
                            <img id="viewReceiptImage" src="" alt="영수증 이미지" style="max-width: 100%; height: auto;">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" id="viewReceiptCloseBtn" class="btn secondary">닫기</button>
                    <button type="button" id="downloadReceiptBtn" class="btn primary">
                        <i data-lucide="download"></i> 이미지 다운로드
                    </button>
                </div>
            </div>
        `;
        return modal;
    }

    // 수업계획 설정 모달 HTML 생성
    function createLessonPlanSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'lessonPlanSettingsModal';
        modal.className = 'modal lesson-plan-settings-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>수업계획 설정</h3>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="lessonPlanSettingsForm">
                        <div class="settings-intro">
                            <p><i data-lucide="info"></i> 학생들의 수업계획 작성 및 수정 권한을 설정할 수 있습니다.</p>
                        </div>
                        
                        <div class="form-group">
                            <label for="planEditDeadline">수업계획 수정 마감일</label>
                            <input type="date" id="planEditDeadline" required>
                            <small>이 날짜 이후에는 학생들이 수업계획을 수정할 수 없습니다.</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="planEditTime">마감 시간</label>
                            <input type="time" id="planEditTime" value="23:59">
                        </div>
                        
                        <div class="form-group">
                            <label for="planEditNotice">안내 메시지</label>
                            <textarea id="planEditNotice" rows="3" placeholder="학생들에게 표시할 안내 메시지를 입력하세요"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="testModeEnabled">
                                <span class="checkmark"></span>
                                테스트 모드 (항상 수정 가능)
                            </label>
                            <small>개발 및 테스트를 위해 마감일을 무시하고 항상 수정 가능하게 합니다.</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="allowOverrideDeadline">
                                <span class="checkmark"></span>
                                마감일 무시 모드
                            </label>
                            <small>특별한 경우에 마감일과 상관없이 항상 수정 가능하게 합니다.</small>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" id="planSettingsCancelBtn" class="btn secondary">취소</button>
                            <button type="submit" class="btn primary">설정 저장</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        return modal;
    }

    // 모든 필수 모달들이 존재하는지 확인하고 생성
    function ensureAllModalsExist() {
        console.log('🔍 필수 모달들 존재 여부 확인 중...');
        
        const modalChecks = [
            { id: 'budgetSettingsModal', create: createBudgetSettingsModal },
            { id: 'lessonPlanManagementModal', create: createLessonPlanManagementModal },
            { id: 'viewLessonPlanModal', create: createViewLessonPlanModal },
            { id: 'viewReceiptModal', create: createViewReceiptModal },
            { id: 'lessonPlanSettingsModal', create: createLessonPlanSettingsModal }
        ];
        
        let createdCount = 0;
        modalChecks.forEach(modalCheck => {
            const modal = ensureModalExists(modalCheck.id, modalCheck.create);
            if (modal && !modal.dataset.existed) {
                modal.dataset.existed = 'true';
                createdCount++;
            }
        });
        
        if (createdCount > 0) {
            console.log(`✅ ${createdCount}개의 누락된 모달을 생성했습니다.`);
            
            // 모달 생성 후 Lucide 아이콘 초기화
            if (typeof lucide !== 'undefined') {
                setTimeout(() => {
                    lucide.createIcons();
                    console.log('🎨 새로 생성된 모달의 아이콘을 초기화했습니다.');
                }, 100);
            }
        } else {
            console.log('✅ 모든 필수 모달이 이미 존재합니다.');
        }
    }

    // 관리자 대시보드 버튼들 안전성 개선
    function improveAdminButtonSafety() {
        console.log('🔒 관리자 버튼 안전성 개선 시작...');
        
        const buttonConfigs = [
            {
                selector: '#budgetSettingsBtn',
                action: () => {
                    if (window.AdminManager && window.AdminManager.showBudgetSettingsModal) {
                        window.AdminManager.showBudgetSettingsModal();
                    } else {
                        console.error('❌ AdminManager.showBudgetSettingsModal을 찾을 수 없습니다.');
                        Utils.showToast('예산 설정 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.', 'error');
                    }
                }
            },
            {
                selector: '#lessonPlanManagementBtn',
                action: () => {
                    if (window.AdminManager && window.AdminManager.showLessonPlanManagementModal) {
                        window.AdminManager.showLessonPlanManagementModal();
                    } else {
                        console.error('❌ AdminManager.showLessonPlanManagementModal을 찾을 수 없습니다.');
                        Utils.showToast('수업계획 관리 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.', 'error');
                    }
                }
            },
            {
                selector: '#lessonPlanSettingsBtn',
                action: () => {
                    if (window.AdminManager && window.AdminManager.showLessonPlanSettingsModal) {
                        window.AdminManager.showLessonPlanSettingsModal();
                    } else {
                        console.error('❌ AdminManager.showLessonPlanSettingsModal을 찾을 수 없습니다.');
                        Utils.showToast('수업계획 설정 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.', 'error');
                    }
                }
            },
            {
                selector: '#exportBtn',
                action: () => {
                    if (window.AdminManager && window.AdminManager.handleExport) {
                        window.AdminManager.handleExport();
                    } else {
                        console.error('❌ AdminManager.handleExport를 찾을 수 없습니다.');
                        Utils.showToast('내보내기 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.', 'error');
                    }
                }
            }
        ];
        
        buttonConfigs.forEach(config => {
            const button = document.querySelector(config.selector);
            if (button) {
                // 기존 이벤트 리스너 제거를 위한 클론
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // 새로운 안전한 이벤트 리스너 추가
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    try {
                        config.action();
                    } catch (error) {
                        console.error(`❌ 버튼 ${config.selector} 처리 중 오류:`, error);
                        Utils.showToast('기능 실행 중 오류가 발생했습니다.', 'error');
                    }
                });
                
                console.log(`✅ ${config.selector} 버튼 안전성 개선 완료`);
            } else {
                console.warn(`⚠️ ${config.selector} 버튼을 찾을 수 없습니다.`);
            }
        });
    }

    // 모달 닫기 버튼 이벤트 처리 개선
    function improveModalCloseHandling() {
        console.log('🔒 모달 닫기 처리 개선 시작...');
        
        // 모든 모달의 닫기 버튼에 대해 안전한 이벤트 리스너 추가
        document.addEventListener('click', (e) => {
            // 모달 배경 클릭으로 닫기
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
            
            // X 버튼 클릭으로 닫기
            if (e.target.classList.contains('close-btn') || e.target.textContent === '×') {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            }
        });
        
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                }
            }
        });
        
        console.log('✅ 모달 닫기 처리 개선 완료');
    }

    // Utils 객체가 없는 경우 기본 함수들 제공
    function ensureUtilsExists() {
        if (typeof window.Utils === 'undefined') {
            console.warn('⚠️ Utils 객체가 없어서 기본 Utils 함수들을 생성합니다.');
            
            window.Utils = {
                $: (selector) => document.querySelector(selector),
                $$: (selector) => document.querySelectorAll(selector),
                showToast: (message, type = 'info') => {
                    console.log(`[${type.toUpperCase()}] ${message}`);
                    alert(message); // 임시적으로 alert 사용
                },
                showConfirm: (message) => confirm(message),
                showPrompt: (message, defaultValue = '') => prompt(message, defaultValue),
                showLoading: (element) => {
                    if (element) {
                        element.disabled = true;
                        element.textContent = '처리 중...';
                    }
                },
                hideLoading: (element) => {
                    if (element) {
                        element.disabled = false;
                        element.textContent = element.dataset.originalText || '확인';
                    }
                }
            };
        }
    }

    // AdminManager가 로드될 때까지 대기하는 함수
    function waitForAdminManager() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 20; // 4초 동안 대기 (200ms * 20)
            
            const checkInterval = setInterval(() => {
                attempts++;
                
                if (window.AdminManager) {
                    clearInterval(checkInterval);
                    console.log('✅ AdminManager 로드 확인됨');
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn('⚠️ AdminManager 로드 대기 시간 초과');
                    resolve(false);
                }
            }, 200);
        });
    }

    // 초기화 함수
    async function initAdminDashboardFix() {
        try {
            console.log('🚀 관리자 대시보드 수정 초기화 시작...');
            
            // 1. Utils 존재 확인
            ensureUtilsExists();
            
            // 2. AdminManager 로드 대기
            const adminManagerLoaded = await waitForAdminManager();
            
            // 3. 모든 모달 존재 확인 및 생성
            ensureAllModalsExist();
            
            // 4. 관리자 버튼 안전성 개선
            improveAdminButtonSafety();
            
            // 5. 모달 닫기 처리 개선
            improveModalCloseHandling();
            
            // 6. AdminManager가 로드되었다면 초기화 재실행
            if (adminManagerLoaded && window.AdminManager && window.AdminManager.setupEventListeners) {
                console.log('🔄 AdminManager 이벤트 리스너 재설정...');
                try {
                    window.AdminManager.setupEventListeners();
                    console.log('✅ AdminManager 이벤트 리스너 재설정 완료');
                } catch (error) {
                    console.error('❌ AdminManager 이벤트 리스너 재설정 실패:', error);
                }
            }
            
            // 7. 현재 페이지가 관리자 페이지인지 확인
            const adminPage = document.getElementById('adminPage');
            if (adminPage && adminPage.classList.contains('page')) {
                console.log('📊 관리자 페이지 감지됨 - 추가 검증 실행');
                
                // Lucide 아이콘 재초기화
                if (typeof lucide !== 'undefined') {
                    setTimeout(() => {
                        lucide.createIcons();
                        console.log('🎨 Lucide 아이콘 재초기화 완료');
                    }, 500);
                }
            }
            
            console.log('✅ 관리자 대시보드 중요 오류 수정 완료');
            
        } catch (error) {
            console.error('❌ 관리자 대시보드 수정 초기화 오류:', error);
        }
    }

    // DOM 로드 완료 후 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminDashboardFix);
    } else {
        // 이미 로드된 경우 즉시 실행
        initAdminDashboardFix();
    }

    // 페이지 전환 감지 (SPA 환경에서)
    let currentPage = '';
    function detectPageChange() {
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            const pageId = activePage.id;
            if (pageId !== currentPage) {
                currentPage = pageId;
                
                if (pageId === 'adminPage') {
                    console.log('📊 관리자 페이지로 전환됨 - 초기화 재실행');
                    setTimeout(initAdminDashboardFix, 200);
                }
            }
        }
    }

    // 페이지 변경 감지를 위한 관찰자 설정
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                detectPageChange();
            }
        });
    });

    // 모든 페이지 요소 관찰
    document.querySelectorAll('.page').forEach(page => {
        observer.observe(page, { attributes: true, attributeFilter: ['class'] });
    });

    console.log('✅ 관리자 대시보드 중요 오류 수정 시스템 활성화');

})();
