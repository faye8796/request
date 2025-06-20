// 수업계획 관리 모듈 (개선된 UI 및 플로우) - Supabase 연동
const LessonPlanManager = {
    currentLessonPlan: null,
    isEditMode: false,
    isInitialized: false,
    lessons: [], // 수업 데이터 배열
    currentMode: 'create', // 'create' 또는 'edit'

    // 수업계획 페이지 초기화
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ LessonPlanManager 이미 초기화됨 - 건너뜀');
            return;
        }

        console.log('🎓 LessonPlanManager 초기화 시작');
        this.bindEvents();
        await this.checkEditPermission();
        this.isInitialized = true;
        console.log('✅ LessonPlanManager 초기화 완료');
    },

    // 안전한 사용자 정보 조회
    getSafeCurrentUser() {
        try {
            // 1차: localStorage에서 직접 조회
            const currentStudentData = localStorage.getItem('currentStudent');
            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    if (studentData && studentData.id) {
                        console.log('✅ localStorage에서 사용자 정보 조회:', studentData.name);
                        return studentData;
                    }
                } catch (parseError) {
                    console.error('localStorage 데이터 파싱 오류:', parseError);
                }
            }

            // 2차: AuthManager에서 조회
            if (window.AuthManager && typeof window.AuthManager.getCurrentUser === 'function') {
                const user = window.AuthManager.getCurrentUser();
                if (user && user.id) {
                    console.log('✅ AuthManager에서 사용자 정보 조회:', user.name);
                    return user;
                }
            }

            // 3차: SupabaseAPI에서 조회
            if (window.SupabaseAPI && window.SupabaseAPI.currentUser) {
                const user = window.SupabaseAPI.currentUser;
                if (user && user.id) {
                    console.log('✅ SupabaseAPI에서 사용자 정보 조회:', user.name);
                    return user;
                }
            }

            console.warn('⚠️ 사용자 정보를 찾을 수 없습니다');
            return null;
        } catch (error) {
            console.error('❌ 사용자 정보 조회 중 오류:', error);
            return null;
        }
    },

    // 인증 상태 확인
    isUserAuthenticated() {
        const user = this.getSafeCurrentUser();
        const isAuth = !!(user && user.id);
        console.log('🔍 인증 상태 확인:', isAuth ? '로그인됨' : '로그인 안됨', user ? `(${user.name})` : '');
        return isAuth;
    },

    // 🆕 페이지 레이아웃 업데이트 (헤더 + 버튼)
    updatePageLayout(mode, lessonPlanData = null) {
        try {
            console.log('🎨 페이지 레이아웃 업데이트:', mode);
            
            this.currentMode = mode;
            
            // 1. 헤더 업데이트
            this.updateHeader(mode, lessonPlanData);
            
            // 2. 버튼 레이아웃 업데이트  
            this.updateButtonLayout(mode);
            
            // 3. 이벤트 리스너 재연결
            this.bindButtonEvents(mode);
            
            console.log('✅ 페이지 레이아웃 업데이트 완료');
        } catch (error) {
            console.error('❌ 페이지 레이아웃 업데이트 오류:', error);
        }
    },

    // 🆕 헤더 업데이트
    updateHeader(mode, lessonPlanData) {
        try {
            const headerContainer = document.querySelector('.lesson-plan-header');
            if (!headerContainer) {
                console.warn('헤더 컨테이너를 찾을 수 없습니다');
                return;
            }
            
            if (mode === 'create') {
                headerContainer.innerHTML = `
                    <h1>수업 계획 작성</h1>
                    <p>파견 기간 동안의 상세한 수업 계획을 <strong>필수적으로</strong> 작성해주세요. 관리자가 이 내용을 검토하여 승인 여부를 결정하며, 승인 후에만 교구 신청이 가능합니다.</p>
                `;
            } else if (mode === 'edit') {
                let statusMessage = '';
                if (lessonPlanData?.status === 'rejected') {
                    statusMessage = ' 반려된 계획을 수정하여 다시 제출해주세요.';
                } else if (lessonPlanData?.status === 'approved') {
                    statusMessage = ' 승인된 계획을 수정하는 경우 재승인이 필요합니다.';
                } else {
                    statusMessage = ' 수정 후 다시 제출하면 관리자가 재검토합니다.';
                }
                
                headerContainer.innerHTML = `
                    <h1>수업 계획 수정</h1>
                    <p>제출된 수업계획을 수정할 수 있습니다.${statusMessage}</p>
                `;
            }
            
            console.log(`✅ 헤더 업데이트 완료: ${mode}`);
        } catch (error) {
            console.error('❌ 헤더 업데이트 오류:', error);
        }
    },

    // 🆕 버튼 레이아웃 업데이트
    updateButtonLayout(mode) {
        try {
            const actionsContainer = document.querySelector('.form-actions');
            if (!actionsContainer) {
                console.warn('버튼 컨테이너를 찾을 수 없습니다');
                return;
            }
            
            if (mode === 'create') {
                actionsContainer.innerHTML = `
                    <button type="button" id="backToDashboardBtn" class="btn secondary">
                        <i data-lucide="arrow-left"></i> 대시보드로 돌아가기
                    </button>
                    <button type="button" id="saveDraftBtn" class="btn secondary">
                        <i data-lucide="save"></i> 임시 저장
                    </button>
                    <button type="submit" id="submitLessonPlanBtn" class="btn primary">
                        <i data-lucide="check"></i> 수업 계획 완료 및 제출
                    </button>
                `;
            } else if (mode === 'edit') {
                actionsContainer.innerHTML = `
                    <button type="button" id="closeLessonPlanBtn" class="btn secondary">
                        <i data-lucide="x"></i> 닫기
                    </button>
                    <button type="submit" id="updateLessonPlanBtn" class="btn primary">
                        <i data-lucide="edit"></i> 수업 계획 수정 제출
                    </button>
                `;
            }
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log(`✅ 버튼 레이아웃 업데이트 완료: ${mode}`);
        } catch (error) {
            console.error('❌ 버튼 레이아웃 업데이트 오류:', error);
        }
    },

    // 🆕 버튼 이벤트 바인딩
    bindButtonEvents(mode) {
        try {
            // 기존 이벤트 제거
            this.unbindEvents();
            
            if (mode === 'create') {
                // 최초 작성 모드 버튼들
                this.safeAddEventListener('#backToDashboardBtn', 'click', this.handleBackToDashboard.bind(this));
                this.safeAddEventListener('#saveDraftBtn', 'click', this.handleSaveDraft.bind(this));
                this.safeAddEventListener('#submitLessonPlanBtn', 'click', this.handleSubmitLessonPlan.bind(this));
            } else if (mode === 'edit') {
                // 수정 모드 버튼들
                this.safeAddEventListener('#closeLessonPlanBtn', 'click', this.handleCloseEdit.bind(this));
                this.safeAddEventListener('#updateLessonPlanBtn', 'click', this.handleUpdateLessonPlan.bind(this));
            }
            
            // 공통 버튼들
            this.safeAddEventListener('#addLessonBtn', 'click', this.handleAddLesson.bind(this));
            
            // 폼 제출 (기본 동작 방지)
            const lessonPlanForm = document.getElementById('lessonPlanForm');
            if (lessonPlanForm) {
                lessonPlanForm.addEventListener('submit', this.handleFormSubmit.bind(this));
            }

            // 날짜 필드
            const startDate = document.getElementById('startDate');
            const endDate = document.getElementById('endDate');
            if (startDate && endDate) {
                startDate.addEventListener('change', this.calculateDuration.bind(this));
                endDate.addEventListener('change', this.calculateDuration.bind(this));
            }
            
            console.log(`✅ 버튼 이벤트 바인딩 완료: ${mode}`);
        } catch (error) {
            console.error('❌ 버튼 이벤트 바인딩 오류:', error);
        }
    },

    // 안전한 이벤트 리스너 추가
    safeAddEventListener(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`이벤트 리스너 추가: ${selector}`);
            } else {
                console.warn(`요소를 찾을 수 없음: ${selector}`);
            }
        } catch (error) {
            console.error(`이벤트 리스너 추가 오류 (${selector}):`, error);
        }
    },

    // 🆕 대시보드로 돌아가기 핸들러
    handleBackToDashboard() {
        console.log('🔙 대시보드로 돌아가기');
        this.goToStudentDashboard();
    },

    // 🆕 임시저장 핸들러 (저장 후 대시보드 이동)
    async handleSaveDraft() {
        try {
            console.log('💾 임시저장 시작');
            
            const result = await this.saveDraft();
            if (result.success) {
                // 성공 시 대시보드로 이동
                setTimeout(() => {
                    this.goToStudentDashboard();
                }, 1500);
            }
        } catch (error) {
            console.error('❌ 임시저장 핸들러 오류:', error);
        }
    },

    // 🆕 수업계획 완료 제출 핸들러 (완료 후 교구신청 UI 표시)
    async handleSubmitLessonPlan(e) {
        e.preventDefault();
        
        try {
            console.log('📝 수업계획 완료 제출 시작');
            
            const result = await this.submitLessonPlan();
            if (result.success) {
                // 성공 시 교구신청 UI로 전환
                setTimeout(() => {
                    this.switchToEquipmentRequest();
                }, 1500);
            }
        } catch (error) {
            console.error('❌ 수업계획 제출 핸들러 오류:', error);
        }
    },

    // 🆕 수정 닫기 핸들러 (변경감지 없이 단순 닫기)
    handleCloseEdit() {
        console.log('❌ 수업계획 수정 닫기');
        
        // 변경감지 프로세스 없이 바로 닫기
        this.switchToEquipmentRequest();
    },

    // 🆕 수업계획 수정 제출 핸들러 (덮어쓰기)
    async handleUpdateLessonPlan(e) {
        e.preventDefault();
        
        try {
            console.log('✏️ 수업계획 수정 제출 시작');
            
            const result = await this.updateLessonPlan();
            if (result.success) {
                // 성공 시 교구신청 UI로 전환
                setTimeout(() => {
                    this.switchToEquipmentRequest();
                }, 1500);
            }
        } catch (error) {
            console.error('❌ 수업계획 수정 제출 핸들러 오류:', error);
        }
    },

    // 🆕 교구신청 UI로 전환
    switchToEquipmentRequest() {
        try {
            console.log('🔄 교구신청 UI로 전환');
            
            const studentPage = document.getElementById('studentPage');
            const lessonPlanPage = document.getElementById('lessonPlanPage');
            
            if (studentPage && lessonPlanPage) {
                // 페이지 전환
                lessonPlanPage.classList.remove('active');
                studentPage.classList.add('active');
                
                // StudentManager 새로고침
                if (window.StudentManager && typeof window.StudentManager.refreshDashboard === 'function') {
                    window.StudentManager.refreshDashboard();
                }
                
                console.log('✅ 교구신청 UI로 전환 완료');
            } else {
                console.error('❌ 페이지 요소를 찾을 수 없습니다');
            }
        } catch (error) {
            console.error('❌ 교구신청 UI 전환 오류:', error);
        }
    },

    // 폼 제출 기본 핸들러 (기본 동작 방지)
    handleFormSubmit(e) {
        e.preventDefault();
        console.log('폼 제출 기본 동작 방지됨');
    },

    // 이벤트 바인딩 (기존 방식, 호환성 유지)
    bindEvents() {
        // 수업 추가 버튼
        const addLessonBtn = document.getElementById('addLessonBtn');
        if (addLessonBtn) {
            addLessonBtn.addEventListener('click', this.handleAddLesson.bind(this));
        }

        // 파견 시작일/종료일 변경 시 자동 계산
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate && endDate) {
            startDate.addEventListener('change', this.calculateDuration.bind(this));
            endDate.addEventListener('change', this.calculateDuration.bind(this));
        }
    },

    // 이벤트 리스너 제거
    unbindEvents() {
        const elements = [
            'closeLessonPlanBtn',
            'backToDashboardBtn',
            'saveDraftBtn', 
            'submitLessonPlanBtn',
            'updateLessonPlanBtn',
            'addLessonBtn',
            'lessonPlanForm',
            'startDate',
            'endDate'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // 클론으로 교체하여 모든 이벤트 리스너 제거
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
            }
        });
    },

    // 수업 추가 핸들러
    handleAddLesson() {
        this.addLesson();
    },

    // 수업 추가
    addLesson() {
        try {
            console.log('➕ 새 수업 추가');
            
            const lessonNumber = this.lessons.length + 1;
            const newLesson = {
                id: Date.now(), // 임시 ID
                lessonNumber: lessonNumber,
                topic: '',
                content: ''
            };

            this.lessons.push(newLesson);
            this.renderLessons();
            this.updateLessonCount();

            // 새로 추가된 수업의 주제 입력 필드에 포커스
            setTimeout(() => {
                const topicInput = document.querySelector(`[data-lesson-id="${newLesson.id}"] .topic-input`);
                if (topicInput) {
                    topicInput.focus();
                }
            }, 100);

            console.log(`✅ ${lessonNumber}회차 수업 추가 완료`);
        } catch (error) {
            console.error('❌ 수업 추가 오류:', error);
            this.showMessage('❌ 수업 추가 중 오류가 발생했습니다.', 'error');
        }
    },

    // 수업 삭제
    deleteLesson(lessonId) {
        try {
            console.log('🗑️ 수업 삭제:', lessonId);
            
            const lessonIndex = this.lessons.findIndex(lesson => lesson.id === lessonId);
            if (lessonIndex === -1) {
                console.warn('삭제할 수업을 찾을 수 없습니다:', lessonId);
                return;
            }

            const lesson = this.lessons[lessonIndex];
            
            // 확인 대화상자
            if (!confirm(`${lesson.lessonNumber}회차 수업을 삭제하시겠습니까?\n\n주제: ${lesson.topic || '(미입력)'}\n\n삭제된 수업은 복구할 수 없습니다.`)) {
                return;
            }

            // 수업 삭제
            this.lessons.splice(lessonIndex, 1);
            
            // 수업 번호 재정렬
            this.reorderLessons();
            
            // 화면 업데이트
            this.renderLessons();
            this.updateLessonCount();

            console.log(`✅ ${lesson.lessonNumber}회차 수업 삭제 완료`);
            this.showMessage(`✅ ${lesson.lessonNumber}회차 수업이 삭제되었습니다.`, 'success');
        } catch (error) {
            console.error('❌ 수업 삭제 오류:', error);
            this.showMessage('❌ 수업 삭제 중 오류가 발생했습니다.', 'error');
        }
    },

    // 수업 번호 재정렬
    reorderLessons() {
        this.lessons.forEach((lesson, index) => {
            lesson.lessonNumber = index + 1;
        });
    },

    // 수업 목록 렌더링
    renderLessons() {
        try {
            const container = document.getElementById('lessonTableContainer');
            if (!container) {
                throw new Error('수업 계획표 컨테이너를 찾을 수 없습니다.');
            }

            if (this.lessons.length === 0) {
                // 빈 상태 표시
                container.innerHTML = `
                    <div class="empty-lessons-message">
                        <i data-lucide="calendar-plus"></i>
                        <p>아직 추가된 수업이 없습니다.</p>
                        <p>위의 "수업 추가" 버튼을 클릭하여 첫 번째 수업을 추가해보세요.</p>
                    </div>
                `;
            } else {
                // 수업 목록 표시
                let html = `
                    <div class="lesson-table">
                        <div class="table-header">
                            <div class="header-cell lesson-number-col">수업 회차</div>
                            <div class="header-cell lesson-topic-col">수업 주제 * (필수)</div>
                            <div class="header-cell lesson-content-col">수업 내용 * (필수)</div>
                            <div class="header-cell lesson-actions-col">관리</div>
                        </div>
                `;

                this.lessons.forEach(lesson => {
                    html += `
                        <div class="table-row" data-lesson-id="${lesson.id}">
                            <div class="cell lesson-number">${lesson.lessonNumber}회차</div>
                            <div class="cell lesson-topic">
                                <input type="text" 
                                       class="topic-input"
                                       placeholder="⚠️ ${lesson.lessonNumber}회차 수업 주제를 반드시 입력하세요 (필수)"
                                       maxlength="100"
                                       value="${lesson.topic || ''}"
                                       required>
                            </div>
                            <div class="cell lesson-content">
                                <textarea class="content-textarea"
                                          placeholder="⚠️ ${lesson.lessonNumber}회차 수업에서 진행할 구체적인 내용을 반드시 작성하세요 (필수)"
                                          rows="3"
                                          maxlength="500"
                                          required>${lesson.content || ''}</textarea>
                            </div>
                            <div class="cell lesson-actions">
                                <button type="button" class="btn small danger delete-lesson-btn" data-lesson-id="${lesson.id}">
                                    <i data-lucide="trash-2"></i>
                                    삭제
                                </button>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
                container.innerHTML = html;

                // 삭제 버튼 이벤트 바인딩
                this.bindLessonEvents();
            }

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('수업 목록 렌더링 오류:', error);
            throw error;
        }
    },

    // 수업별 이벤트 바인딩
    bindLessonEvents() {
        // 삭제 버튼 이벤트
        const deleteButtons = document.querySelectorAll('.delete-lesson-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const lessonId = parseInt(e.target.closest('[data-lesson-id]').dataset.lessonId);
                this.deleteLesson(lessonId);
            });
        });

        // 입력 필드 변경 이벤트
        const topicInputs = document.querySelectorAll('.topic-input');
        const contentTextareas = document.querySelectorAll('.content-textarea');

        topicInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const lessonId = parseInt(e.target.closest('[data-lesson-id]').dataset.lessonId);
                this.updateLessonData(lessonId, 'topic', e.target.value);
            });
        });

        contentTextareas.forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const lessonId = parseInt(e.target.closest('[data-lesson-id]').dataset.lessonId);
                this.updateLessonData(lessonId, 'content', e.target.value);
            });
        });
    },

    // 수업 데이터 업데이트
    updateLessonData(lessonId, field, value) {
        const lesson = this.lessons.find(l => l.id === lessonId);
        if (lesson) {
            lesson[field] = value;
        }
    },

    // 총 수업 횟수 업데이트
    updateLessonCount() {
        try {
            const totalDisplay = document.getElementById('totalLessonsDisplay');
            if (totalDisplay) {
                totalDisplay.textContent = this.lessons.length;
            }
        } catch (error) {
            console.error('수업 횟수 업데이트 오류:', error);
        }
    },

    // 수정 권한 확인
    async checkEditPermission() {
        try {
            // 기존 알림 메시지들 모두 제거
            this.clearAllNotices();

            const canEdit = await SupabaseAPI.canEditLessonPlan();
            
            if (!canEdit) {
                this.disableEditing();
                this.showSingleNotice('edit-disabled', 'alert-circle', 'warning', '⚠️ 수업계획 수정 기간이 종료되었습니다. 관리자에게 문의하세요.');
            } else {
                console.log('수업계획 편집 가능');
            }
        } catch (error) {
            console.error('수정 권한 확인 오류:', error);
        }
    },

    // 편집 비활성화
    disableEditing() {
        const form = document.getElementById('lessonPlanForm');
        if (form) {
            const inputs = form.querySelectorAll('input, textarea, button[type="submit"], #saveDraftBtn, #addLessonBtn, .delete-lesson-btn');
            inputs.forEach(input => {
                input.disabled = true;
            });
        }
    },

    // 단일 알림 표시
    showSingleNotice(className, iconName, type, message) {
        this.clearAllNotices();
        
        const notice = document.createElement('div');
        notice.className = `${className} ${type}`;
        notice.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <p>${message}</p>
        `;
        
        const container = document.querySelector('.lesson-plan-content');
        if (container) {
            container.insertBefore(notice, container.firstChild);
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    },

    // 기간 자동 계산
    calculateDuration() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weeks = Math.floor(diffDays / 7);
            
            console.log(`📅 파견 기간: ${diffDays}일 (약 ${weeks}주)`);
        }
    },

    // 메시지 표시
    showMessage(message, type = 'info') {
        // 기존 메시지 제거
        const existingMessages = document.querySelectorAll('.lesson-plan-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `lesson-plan-message ${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        else if (type === 'warning') iconName = 'alert-triangle';
        else if (type === 'error') iconName = 'alert-circle';
        
        messageDiv.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <p>${message}</p>
        `;
        
        const container = document.querySelector('.lesson-plan-content');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 5초 후 메시지 제거
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 5000);
        }
    },

    // 기존 데이터 로드
    async loadExistingData() {
        try {
            console.log('📖 기존 데이터 로드 시작');
            
            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                console.log('사용자 정보가 없어 기존 데이터 로드를 건너뜁니다.');
                return;
            }

            console.log('👤 현재 사용자:', currentUser.id);

            const existingPlan = await SupabaseAPI.getStudentLessonPlan(currentUser.id);
            if (existingPlan && existingPlan.lessons) {
                console.log('📋 기존 수업계획 발견:', existingPlan.status);
                
                this.currentLessonPlan = existingPlan;
                this.isEditMode = true;

                const lessonData = existingPlan.lessons;

                // 기본 정보 채우기
                this.safeSetValue('startDate', lessonData.startDate);
                this.safeSetValue('endDate', lessonData.endDate);
                this.safeSetValue('overallGoals', lessonData.overallGoals);
                this.safeSetValue('specialNotes', lessonData.specialNotes);

                // 수업 데이터 로드
                if (lessonData.lessons && Array.isArray(lessonData.lessons)) {
                    this.lessons = lessonData.lessons.map((lesson, index) => ({
                        id: Date.now() + index, // 임시 ID 생성
                        lessonNumber: lesson.lessonNumber || (index + 1),
                        topic: lesson.topic || '',
                        content: lesson.content || ''
                    }));

                    this.renderLessons();
                    this.updateLessonCount();
                    
                    // 상태에 따른 메시지 표시
                    this.showExistingDataMessage(existingPlan.status);
                }

                console.log('✅ 기존 데이터 로드 완료');
                return existingPlan;
            } else {
                console.log('📝 새로운 수업계획입니다.');
                return null;
            }
        } catch (error) {
            console.error('❌ 기존 데이터 로드 오류:', error);
            return null;
        }
    },

    // 기존 데이터 상태 메시지 표시
    showExistingDataMessage(status) {
        try {
            let message = '';
            let type = 'info';
            
            switch (status) {
                case 'draft':
                    message = '📝 임시저장된 수업계획입니다. 수정 후 완료 제출해주세요.';
                    type = 'warning';
                    break;
                case 'submitted':
                    message = '⏳ 제출된 수업계획입니다. 관리자 승인을 기다리고 있습니다.';
                    type = 'info';
                    break;
                case 'approved':
                    message = '✅ 승인된 수업계획입니다. 교구 신청이 가능합니다.';
                    type = 'success';
                    break;
                case 'rejected':
                    message = '❌ 반려된 수업계획입니다. 반려 사유를 확인하고 수정해주세요.';
                    type = 'danger';
                    break;
                default:
                    message = '📋 기존 수업계획을 불러왔습니다.';
                    type = 'info';
            }
            
            this.showMessage(message, type);
        } catch (error) {
            console.error('기존 데이터 상태 메시지 표시 오류:', error);
        }
    },

    // 안전한 값 설정
    safeSetValue(elementId, value) {
        try {
            const element = document.getElementById(elementId);
            if (element && value !== undefined && value !== null) {
                element.value = value;
            }
        } catch (error) {
            console.warn(`Failed to set value for ${elementId}:`, error);
        }
    },

    // 현재 데이터 수집
    collectFormData() {
        console.log('📊 폼 데이터 수집 시작');
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const totalLessons = this.lessons.length;
        const overallGoals = document.getElementById('overallGoals').value.trim();
        const specialNotes = document.getElementById('specialNotes').value.trim();

        // 수업 데이터 수집
        const lessons = this.lessons.map(lesson => ({
            lessonNumber: lesson.lessonNumber,
            topic: lesson.topic.trim(),
            content: lesson.content.trim()
        }));

        const formData = {
            startDate,
            endDate,
            totalLessons,
            overallGoals,
            specialNotes,
            lessons: lessons
        };

        console.log('📋 수집된 데이터:', {
            기본정보: { startDate, endDate, totalLessons },
            수업수: lessons.length,
            목표길이: overallGoals.length,
            특별사항길이: specialNotes.length
        });

        return formData;
    },

    // 폼 유효성 검사
    validateForm(data) {
        const errors = [];

        // 기본 정보 검증
        if (!data.startDate) errors.push('❌ 파견 시작일을 입력해주세요.');
        if (!data.endDate) errors.push('❌ 파견 종료일을 입력해주세요.');
        if (!data.overallGoals) errors.push('❌ 전체 수업 목표를 입력해주세요. (필수 항목)');

        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            errors.push('❌ 파견 종료일은 시작일보다 늦어야 합니다.');
        }

        // 수업 계획 검증
        if (!data.lessons || data.lessons.length === 0) {
            errors.push('❌ 최소 1개 이상의 수업을 추가해주세요.');
        } else {
            let emptyTopicCount = 0;
            let emptyContentCount = 0;
            const emptyTopicLessons = [];
            const emptyContentLessons = [];
            
            data.lessons.forEach((lesson) => {
                if (!lesson.topic || lesson.topic.trim() === '') {
                    emptyTopicCount++;
                    emptyTopicLessons.push(lesson.lessonNumber);
                }
                if (!lesson.content || lesson.content.trim() === '') {
                    emptyContentCount++;
                    emptyContentLessons.push(lesson.lessonNumber);
                }
            });
            
            if (emptyTopicCount > 0) {
                errors.push(`❌ ${emptyTopicCount}개 수업의 주제가 비어있습니다. (${emptyTopicLessons.join(', ')}회차) 모든 수업의 주제를 입력해주세요. (필수 항목)`);
            }
            
            if (emptyContentCount > 0) {
                errors.push(`❌ ${emptyContentCount}개 수업의 내용이 비어있습니다. (${emptyContentLessons.join(', ')}회차) 모든 수업의 내용을 구체적으로 작성해주세요. (필수 항목)`);
            }
        }

        console.log('✅ 폼 검증 완료:', errors.length === 0 ? '통과' : `${errors.length}개 오류`);
        return errors;
    },

    // 임시저장 (draft 상태로 저장)
    async saveDraft() {
        try {
            console.log('💾 임시저장 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return { success: false };
            }

            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.', 'warning');
                return { success: false };
            }

            const data = this.collectFormData();
            
            console.log('🚀 Supabase에 임시저장 요청');
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, true);
            
            if (result.success) {
                console.log('✅ 임시저장 성공:', result.data?.id);
                this.showMessage('✅ 수업계획이 임시저장되었습니다!\n\n대시보드로 이동합니다.', 'success');
                this.currentLessonPlan = result.data;
                this.isEditMode = true;
                return { success: true };
            } else {
                console.error('❌ 임시저장 실패:', result.message);
                this.showMessage(`❌ ${result.message || '임시저장 중 오류가 발생했습니다.'}`, 'error');
                return { success: false };
            }
        } catch (error) {
            console.error('💥 임시저장 예외:', error);
            this.showMessage(`❌ 임시저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
            return { success: false };
        }
    },

    // 수업계획 완료 제출 (submitted 상태로 저장)
    async submitLessonPlan() {
        try {
            console.log('📝 수업계획 완료 제출 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return { success: false };
            }

            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.', 'warning');
                return { success: false };
            }

            const data = this.collectFormData();
            const errors = this.validateForm(data);

            if (errors.length > 0) {
                console.warn('⚠️ 폼 검증 실패:', errors);
                this.showMessage('❌ 다음 사항을 확인해주세요:\n\n' + errors.join('\n'), 'warning');
                return { success: false };
            }

            // 완료 확인 메시지
            if (!confirm(`수업계획을 완료 제출하시겠습니까?\n\n✅ 총 ${data.totalLessons}개 수업이 작성되었습니다.\n✅ 완료 제출 후 관리자 승인을 받으면 교구 신청이 가능합니다.\n\n⚠️ 수업계획 제출은 필수 사항입니다.`)) {
                console.log('📋 사용자가 제출을 취소했습니다.');
                return { success: false };
            }

            console.log('🚀 Supabase에 완료 제출 요청');
            
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, false);
            
            if (result.success) {
                console.log('✅ 수업계획 완료 성공:', result.data?.id);
                this.showMessage('🎉 수업계획이 완료 제출되었습니다!\n\n교구 신청 화면으로 이동합니다.', 'success');
                return { success: true };
            } else {
                console.error('❌ 수업계획 완료 실패:', result.message);
                this.showMessage(`❌ ${result.message || '수업계획 저장 중 오류가 발생했습니다.'}`, 'error');
                return { success: false };
            }
        } catch (error) {
            console.error('💥 수업계획 제출 예외:', error);
            this.showMessage(`❌ 수업계획 저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
            return { success: false };
        }
    },

    // 수업계획 수정 제출 (기존 데이터 덮어쓰기)
    async updateLessonPlan() {
        try {
            console.log('✏️ 수업계획 수정 제출 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return { success: false };
            }

            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.', 'warning');
                return { success: false };
            }

            const data = this.collectFormData();
            const errors = this.validateForm(data);

            if (errors.length > 0) {
                console.warn('⚠️ 폼 검증 실패:', errors);
                this.showMessage('❌ 다음 사항을 확인해주세요:\n\n' + errors.join('\n'), 'warning');
                return { success: false };
            }

            // 수정 확인 메시지
            if (!confirm(`수업계획을 수정 제출하시겠습니까?\n\n✅ 총 ${data.totalLessons}개 수업이 작성되었습니다.\n✅ 수정된 계획이 관리자에게 재검토 요청됩니다.\n\n📝 기존 수업계획을 덮어씁니다.`)) {
                console.log('📋 사용자가 수정 제출을 취소했습니다.');
                return { success: false };
            }

            console.log('🚀 Supabase에 수정 제출 요청 (덮어쓰기)');
            
            // submitted 상태로 덮어쓰기 (기존 데이터 덮어씀)
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, false);
            
            if (result.success) {
                console.log('✅ 수업계획 수정 성공:', result.data?.id);
                this.showMessage('🎉 수업계획이 수정 제출되었습니다!\n\n관리자가 재검토합니다.', 'success');
                return { success: true };
            } else {
                console.error('❌ 수업계획 수정 실패:', result.message);
                this.showMessage(`❌ ${result.message || '수업계획 수정 중 오류가 발생했습니다.'}`, 'error');
                return { success: false };
            }
        } catch (error) {
            console.error('💥 수업계획 수정 예외:', error);
            this.showMessage(`❌ 수업계획 수정 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
            return { success: false };
        }
    },

    // 학생 대시보드로 이동
    goToStudentDashboard() {
        console.log('🔄 학생 대시보드로 이동');
        
        try {
            // 폴백: 학생 대시보드 페이지로 직접 이동
            const studentDashboardPath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/student/dashboard.html');
            window.location.href = studentDashboardPath;
        } catch (error) {
            console.error('❌ 대시보드 이동 오류:', error);
            // 최후 수단: 현재 페이지 새로고침
            window.location.reload();
        }
    },

    // 🆕 수업계획 페이지 표시 (모드별 설정)
    async showLessonPlanPage(mode = 'create', lessonPlanData = null) {
        try {
            console.log('📄 수업계획 페이지 표시:', mode);
            
            // 모든 기존 알림 제거
            this.clearAllNotices();
            
            // 페이지 레이아웃 업데이트
            this.updatePageLayout(mode, lessonPlanData);
            
            if (mode === 'edit' && lessonPlanData) {
                // 수정 모드: 기존 데이터 로드
                await this.loadExistingData();
            } else {
                // 작성 모드: 초기화
                this.showMessage('📋 새로운 수업계획을 작성합니다. "수업 추가" 버튼을 클릭하여 수업을 추가해주세요.', 'info');
            }
            
            // 수정 권한 재확인
            await this.checkEditPermission();
            
            // 페이지 제목 설정
            const titleText = mode === 'edit' ? '수업계획 수정' : '수업계획 작성 (필수)';
            document.title = `${titleText} - 세종학당 문화교구 신청`;
            
            console.log('✅ 수업계획 페이지 표시 완료');
        } catch (error) {
            console.error('❌ 수업계획 페이지 표시 오류:', error);
            this.showMessage('수업계획 시스템 오류가 발생했습니다. 페이지를 새로고침해주세요.', 'error');
        }
    },

    // 모든 알림 제거
    clearAllNotices() {
        const notices = document.querySelectorAll(
            '.edit-deadline-notice, .test-mode-notice, .override-notice, ' +
            '.time-remaining-notice, .edit-status-notice, .lesson-plan-message, ' +
            '.edit-disabled'
        );
        notices.forEach(notice => notice.remove());
    },

    // 수업계획 완료 여부 확인
    async hasCompletedLessonPlan(studentId) {
        try {
            const plan = await SupabaseAPI.getStudentLessonPlan(studentId);
            return plan && plan.status === 'submitted';
        } catch (error) {
            console.error('수업계획 완료 여부 확인 오류:', error);
            return false;
        }
    },

    // 수업계획 필요 여부 확인
    async needsLessonPlan(studentId) {
        try {
            const plan = await SupabaseAPI.getStudentLessonPlan(studentId);
            return !plan || plan.status === 'draft';
        } catch (error) {
            console.error('수업계획 필요 여부 확인 오류:', error);
            return true;
        }
    }
};

// 전역 접근을 위한 window 객체에 추가
window.LessonPlanManager = LessonPlanManager;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 LessonPlanManager DOM 초기화');
    setTimeout(() => {
        if (!LessonPlanManager.isInitialized) {
            LessonPlanManager.init();
        }
    }, 100);
});
