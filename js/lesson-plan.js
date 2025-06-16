// 수업계획 관리 모듈 (개선된 회차별 추가 방식) - Supabase 연동
const LessonPlanManager = {
    currentLessonPlan: null,
    isEditMode: false,
    isInitialized: false,
    lessons: [], // 수업 데이터 배열

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
            // 1차: AuthManager에서 조회
            if (window.AuthManager && typeof window.AuthManager.getCurrentUser === 'function') {
                const user = window.AuthManager.getCurrentUser();
                if (user && user.id) {
                    console.log('✅ AuthManager에서 사용자 정보 조회:', user.name);
                    return user;
                }
            }

            // 2차: SupabaseAPI에서 조회
            if (window.SupabaseAPI && window.SupabaseAPI.currentUser) {
                const user = window.SupabaseAPI.currentUser;
                if (user && user.id) {
                    console.log('✅ SupabaseAPI에서 사용자 정보 조회:', user.name);
                    return user;
                }
            }

            // 3차: 세션 스토리지에서 조회 (폴백)
            try {
                const sessionData = sessionStorage.getItem('userSession');
                if (sessionData) {
                    const parsed = JSON.parse(sessionData);
                    if (parsed.user && parsed.user.id) {
                        console.log('✅ 세션에서 사용자 정보 복원:', parsed.user.name);
                        return parsed.user;
                    }
                }
            } catch (sessionError) {
                console.warn('세션 복원 실패:', sessionError);
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

    // 이벤트 바인딩
    bindEvents() {
        // 기존 이벤트 리스너 제거
        this.unbindEvents();

        // 닫기 버튼
        const closeLessonPlanBtn = document.getElementById('closeLessonPlanBtn');
        if (closeLessonPlanBtn) {
            closeLessonPlanBtn.addEventListener('click', this.handleCloseClick.bind(this));
        }

        // 수업 추가 버튼
        const addLessonBtn = document.getElementById('addLessonBtn');
        if (addLessonBtn) {
            addLessonBtn.addEventListener('click', this.handleAddLesson.bind(this));
        }

        // 수업계획 폼 제출
        const lessonPlanForm = document.getElementById('lessonPlanForm');
        if (lessonPlanForm) {
            lessonPlanForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // 임시저장 버튼
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', this.handleSaveDraft.bind(this));
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
            'addLessonBtn',
            'lessonPlanForm', 
            'saveDraftBtn',
            'startDate',
            'endDate'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.removeEventListener('click', this.handleCloseClick);
                element.removeEventListener('click', this.handleAddLesson);
                element.removeEventListener('submit', this.handleFormSubmit);
                element.removeEventListener('click', this.handleSaveDraft);
                element.removeEventListener('change', this.calculateDuration);
            }
        });
    },

    // 닫기 버튼 클릭 핸들러
    handleCloseClick() {
        console.log('❌ 수업계획 페이지 닫기 버튼 클릭');
        
        // 변경사항이 있는지 확인
        const hasChanges = this.hasUnsavedChanges();
        
        if (hasChanges) {
            // 변경사항이 있으면 확인 대화상자 표시
            const confirmClose = confirm(
                '수업계획에 변경사항이 있습니다.\n\n' +
                '저장하지 않고 나가시겠습니까?\n\n' +
                '✅ 확인: 변경사항을 버리고 나가기\n' +
                '❌ 취소: 계속 작성하기'
            );
            
            if (!confirmClose) {
                console.log('📝 사용자가 계속 작성하기를 선택');
                return;
            }
        }
        
        console.log('🔄 학생 대시보드로 이동');
        this.goToStudentDashboard();
    },

    // 변경사항 확인
    hasUnsavedChanges() {
        try {
            // 기본 정보 확인
            const startDate = document.getElementById('startDate')?.value?.trim() || '';
            const endDate = document.getElementById('endDate')?.value?.trim() || '';
            const overallGoals = document.getElementById('overallGoals')?.value?.trim() || '';
            const specialNotes = document.getElementById('specialNotes')?.value?.trim() || '';
            
            // 수업 데이터 확인
            const hasLessons = this.lessons && this.lessons.length > 0;
            const hasLessonContent = hasLessons && this.lessons.some(lesson => 
                (lesson.topic && lesson.topic.trim()) || 
                (lesson.content && lesson.content.trim())
            );
            
            // 변경사항이 있는지 확인
            const hasBasicInfo = startDate || endDate || overallGoals || specialNotes;
            const hasContent = hasBasicInfo || hasLessonContent;
            
            console.log('🔍 변경사항 확인:', {
                기본정보: hasBasicInfo,
                수업내용: hasLessonContent,
                전체변경: hasContent
            });
            
            return hasContent;
        } catch (error) {
            console.error('변경사항 확인 오류:', error);
            return false;
        }
    },

    // 수업 추가 핸들러
    handleAddLesson() {
        this.addLesson();
    },

    // 폼 제출 핸들러
    handleFormSubmit(e) {
        this.handleFormSubmit_actual(e);
    },

    // 임시저장 핸들러
    handleSaveDraft() {
        this.saveDraft();
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
            } else {
                console.log('📝 새로운 수업계획입니다.');
            }
        } catch (error) {
            console.error('❌ 기존 데이터 로드 오류:', error);
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

    // 임시저장
    async saveDraft() {
        try {
            console.log('💾 임시저장 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return;
            }

            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.', 'warning');
                setTimeout(() => {
                    if (window.App && window.App.showPage) {
                        window.App.showPage('loginPage');
                    }
                }, 3000);
                return;
            }

            const data = this.collectFormData();
            
            console.log('🚀 Supabase에 임시저장 요청');
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, true);
            
            if (result.success) {
                console.log('✅ 임시저장 성공:', result.data?.id);
                this.showMessage('✅ 수업계획이 임시저장되었습니다!\n\n⚠️ 완료 제출까지 해야 승인 검토가 시작됩니다.', 'success');
                this.currentLessonPlan = result.data;
                this.isEditMode = true;
            } else {
                console.error('❌ 임시저장 실패:', result.message);
                this.showMessage(`❌ ${result.message || '임시저장 중 오류가 발생했습니다.'}`, 'error');
            }
        } catch (error) {
            console.error('💥 임시저장 예외:', error);
            this.showMessage(`❌ 임시저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
        }
    },

    // 폼 제출 처리
    async handleFormSubmit_actual(e) {
        e.preventDefault();
        
        try {
            console.log('📝 수업계획 완료 제출 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return;
            }

            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.', 'warning');
                setTimeout(() => {
                    if (window.App && window.App.showPage) {
                        window.App.showPage('loginPage');
                    }
                }, 3000);
                return;
            }

            const data = this.collectFormData();
            const errors = this.validateForm(data);

            if (errors.length > 0) {
                console.warn('⚠️ 폼 검증 실패:', errors);
                this.showMessage('❌ 다음 사항을 확인해주세요:\n\n' + errors.join('\n'), 'warning');
                return;
            }

            // 완료 확인 메시지
            if (!confirm(`수업계획을 완료 제출하시겠습니까?\n\n✅ 총 ${data.totalLessons}개 수업이 작성되었습니다.\n✅ 완료 제출 후 관리자 승인을 받으면 교구 신청이 가능합니다.\n\n⚠️ 수업계획 제출은 필수 사항입니다.`)) {
                console.log('📋 사용자가 제출을 취소했습니다.');
                return;
            }

            console.log('🚀 Supabase에 완료 제출 요청');
            
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, false);
            
            if (result.success) {
                console.log('✅ 수업계획 완료 성공:', result.data?.id);
                this.showMessage('🎉 수업계획이 완료 제출되었습니다!\n\n✅ 관리자 승인 후 교구 신청이 가능합니다.\n📋 수업계획은 필수 제출 사항이므로 승인을 기다려주세요.', 'success');
                
                // 2초 후 학생 대시보드로 이동
                setTimeout(() => {
                    this.goToStudentDashboard();
                }, 2000);
            } else {
                console.error('❌ 수업계획 완료 실패:', result.message);
                this.showMessage(`❌ ${result.message || '수업계획 저장 중 오류가 발생했습니다.'}`, 'error');
            }
        } catch (error) {
            console.error('💥 수업계획 제출 예외:', error);
            this.showMessage(`❌ 수업계획 저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
        }
    },

    // 학생 대시보드로 이동
    goToStudentDashboard() {
        console.log('🔄 학생 대시보드로 이동');
        App.showPage('studentPage');
        if (window.StudentManager && window.StudentManager.init) {
            window.StudentManager.init();
        }
    },

    // 수업계획 페이지 표시
    async showLessonPlanPage() {
        console.log('📄 수업계획 페이지 표시');
        
        // 모든 기존 알림 제거
        this.clearAllNotices();
        
        // 기존 데이터 자동 로드 시도
        try {
            console.log('🔄 기존 수업계획 데이터 자동 로드 시도');
            await this.loadExistingData();
            
            if (this.currentLessonPlan) {
                console.log('✅ 기존 수업계획 데이터 로드 완료');
            } else {
                console.log('📝 새로운 수업계획 작성 모드');
                this.showMessage('📋 새로운 수업계획을 작성합니다. "수업 추가" 버튼을 클릭하여 수업을 추가해주세요.', 'info');
            }
        } catch (error) {
            console.warn('기존 데이터 로드 중 오류 (무시):', error);
            this.showMessage('📋 수업계획 작성 페이지입니다. "수업 추가" 버튼을 클릭하여 수업을 추가해주세요.', 'info');
        }
        
        // 수정 권한 재확인
        await this.checkEditPermission();
        
        // 페이지 제목 설정
        document.title = '수업계획 작성 (필수) - 세종학당 문화교구 신청';
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