// 수업계획 관리 모듈 (Supabase 연동) - 필수 계획 검증 버전
const LessonPlanManager = {
    currentLessonPlan: null,
    isEditMode: false,
    isInitialized: false,

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

    // 이벤트 바인딩 (중복 방지)
    bindEvents() {
        // 기존 이벤트 리스너 제거
        this.unbindEvents();

        // 수업 계획표 생성 버튼
        const generateTableBtn = document.getElementById('generateTableBtn');
        if (generateTableBtn) {
            generateTableBtn.addEventListener('click', this.handleGenerateTable.bind(this));
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
            'generateTableBtn',
            'lessonPlanForm', 
            'saveDraftBtn',
            'startDate',
            'endDate'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // 기존 리스너들 제거
                element.removeEventListener('click', this.handleGenerateTable);
                element.removeEventListener('submit', this.handleFormSubmit);
                element.removeEventListener('click', this.handleSaveDraft);
                element.removeEventListener('change', this.calculateDuration);
            }
        });
    },

    // 이벤트 핸들러들
    handleGenerateTable() {
        this.generateLessonTable();
    },

    handleFormSubmit(e) {
        this.handleFormSubmit_actual(e);
    },

    handleSaveDraft() {
        this.saveDraft();
    },

    // 수정 권한 확인 (단순화)
    async checkEditPermission() {
        try {
            // 기존 알림 메시지들 모두 제거
            this.clearAllNotices();

            const canEdit = await SupabaseAPI.canEditLessonPlan();
            
            if (!canEdit) {
                this.disableEditing();
                this.showSingleNotice('edit-disabled', 'alert-circle', 'warning', '수업계획 수정 기간이 종료되었습니다.');
            } else {
                // 편집 가능 상태에서는 별도 알림 없음
                console.log('수업계획 편집 가능');
            }
        } catch (error) {
            console.error('수정 권한 확인 오류:', error);
            // 오류 발생 시 기본적으로 편집 허용
        }
    },

    // 편집 비활성화
    disableEditing() {
        const form = document.getElementById('lessonPlanForm');
        if (form) {
            const inputs = form.querySelectorAll('input, textarea, button[type="submit"], #saveDraftBtn');
            inputs.forEach(input => {
                input.disabled = true;
            });
        }
    },

    // 단일 알림 표시 (중복 방지)
    showSingleNotice(className, iconName, type, message) {
        // 기존 알림 제거
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

    // 기간 자동 계산 (단순화)
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

    // 수업 계획표 생성 (단순화)
    async generateLessonTable() {
        try {
            console.log('📋 수업 계획표 생성 시작');
            
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const totalLessons = parseInt(document.getElementById('totalLessons').value);

            console.log('입력값 확인:', { startDate, endDate, totalLessons });

            // 유효성 검사
            if (!startDate || !endDate || !totalLessons) {
                this.showMessage('파견 시작일, 종료일, 총 수업 횟수를 모두 입력해주세요.', 'warning');
                return;
            }

            if (isNaN(totalLessons) || totalLessons <= 0) {
                this.showMessage('총 수업 횟수는 1 이상의 숫자여야 합니다.', 'warning');
                return;
            }

            if (totalLessons > 100) {
                this.showMessage('총 수업 횟수는 100회를 초과할 수 없습니다.', 'warning');
                return;
            }

            // 날짜 유효성 검사
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                this.showMessage('유효하지 않은 날짜입니다.', 'warning');
                return;
            }
            
            if (start >= end) {
                this.showMessage('파견 종료일은 시작일보다 늦어야 합니다.', 'warning');
                return;
            }

            // 수업 데이터 생성
            const lessons = this.createSimpleLessons(totalLessons);
            
            if (!lessons || lessons.length === 0) {
                this.showMessage('수업 계획표를 생성할 수 없습니다. 입력값을 확인해주세요.', 'error');
                return;
            }
            
            console.log(`📚 ${lessons.length}개 수업 생성됨`);

            // 테이블 생성
            this.createLessonTable(lessons);
            
            // 섹션 표시
            document.getElementById('lessonTableSection').style.display = 'block';
            document.getElementById('additionalInfoSection').style.display = 'block';

            // 기존 데이터가 있으면 로드
            try {
                await this.loadExistingData();
            } catch (loadError) {
                console.warn('기존 데이터 로드 중 오류 발생 (무시하고 계속):', loadError);
            }
            
            // 성공 메시지
            this.showMessage(`✅ ${lessons.length}개의 수업 계획표가 생성되었습니다! 각 수업의 주제와 내용을 작성해주세요.`, 'success');
            console.log('✅ 수업 계획표 생성 완료');
            
        } catch (error) {
            console.error('💥 수업 계획표 생성 오류:', error);
            this.showMessage(`❌ 수업 계획표 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
        }
    },

    // 간단한 수업 데이터 생성
    createSimpleLessons(totalLessons) {
        const lessons = [];
        
        for (let i = 1; i <= totalLessons; i++) {
            lessons.push({
                lessonNumber: i,
                topic: '',
                content: ''
            });
        }
        
        return lessons;
    },

    // 수업 계획표 HTML 생성 (필수 필드로 변경)
    createLessonTable(lessons) {
        try {
            const container = document.getElementById('lessonTableContainer');
            if (!container) {
                throw new Error('수업 계획표 컨테이너를 찾을 수 없습니다.');
            }
            
            let html = `
                <div class="lesson-table">
                    <div class="table-header">
                        <div class="header-cell lesson-number-col">수업 회차</div>
                        <div class="header-cell lesson-topic-col">수업 주제 *</div>
                        <div class="header-cell lesson-content-col">수업 내용 *</div>
                    </div>
            `;

            lessons.forEach((lesson, index) => {
                if (!lesson || typeof lesson.lessonNumber === 'undefined') {
                    console.warn(`유효하지 않은 수업 데이터 (인덱스 ${index}):`, lesson);
                    return;
                }

                html += `
                    <div class="table-row" data-lesson="${lesson.lessonNumber}">
                        <div class="cell lesson-number">${lesson.lessonNumber}회차</div>
                        <div class="cell lesson-topic">
                            <input type="text" 
                                   id="lessonTopic_${lesson.lessonNumber}" 
                                   placeholder="${lesson.lessonNumber}회차 수업 주제를 입력하세요"
                                   class="topic-input"
                                   maxlength="100"
                                   required>
                        </div>
                        <div class="cell lesson-content">
                            <textarea id="lessonContent_${lesson.lessonNumber}" 
                                      placeholder="${lesson.lessonNumber}회차 수업에서 진행할 구체적인 내용을 작성하세요"
                                      class="content-textarea"
                                      rows="3"
                                      maxlength="500"
                                      required></textarea>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('수업 계획표 HTML 생성 오류:', error);
            throw error;
        }
    },

    // 메시지 표시 (단순화)
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

    // 기존 데이터 로드 (안전성 향상)
    async loadExistingData() {
        try {
            console.log('📖 기존 데이터 로드 시작');
            
            const currentUser = AuthManager.getCurrentUser();
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
                this.safeSetValue('totalLessons', lessonData.totalLessons);
                this.safeSetValue('overallGoals', lessonData.overallGoals);
                this.safeSetValue('specialNotes', lessonData.specialNotes);

                // 수업별 데이터 채우기
                if (lessonData.lessons && Array.isArray(lessonData.lessons)) {
                    lessonData.lessons.forEach(lesson => {
                        if (lesson && lesson.lessonNumber) {
                            this.safeSetValue(`lessonTopic_${lesson.lessonNumber}`, lesson.topic || '');
                            this.safeSetValue(`lessonContent_${lesson.lessonNumber}`, lesson.content || '');
                        }
                    });
                }

                console.log('✅ 기존 데이터 로드 완료');
            } else {
                console.log('📝 새로운 수업계획입니다.');
            }
        } catch (error) {
            console.error('❌ 기존 데이터 로드 오류:', error);
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
        const totalLessons = parseInt(document.getElementById('totalLessons').value);
        const overallGoals = document.getElementById('overallGoals').value.trim();
        const specialNotes = document.getElementById('specialNotes').value.trim();

        // 수업별 데이터 수집
        const lessons = [];
        const totalLessonInputs = document.querySelectorAll('[id^="lessonTopic_"]');
        
        console.log(`🔍 ${totalLessonInputs.length}개 수업 입력 필드 발견`);
        
        totalLessonInputs.forEach(input => {
            const lessonNumber = input.id.split('_')[1];
            const topic = input.value.trim();
            const contentInput = document.getElementById(`lessonContent_${lessonNumber}`);
            
            const content = contentInput ? contentInput.value.trim() : '';
            
            lessons.push({
                lessonNumber: parseInt(lessonNumber),
                topic: topic,
                content: content
            });
        });

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

    // 폼 유효성 검사 (수업 계획 필수 검증 추가)
    validateForm(data) {
        const errors = [];

        // 기본 정보 검증
        if (!data.startDate) errors.push('파견 시작일을 입력해주세요.');
        if (!data.endDate) errors.push('파견 종료일을 입력해주세요.');
        if (!data.totalLessons) errors.push('총 수업 횟수를 입력해주세요.');
        if (!data.overallGoals) errors.push('전체 수업 목표를 입력해주세요.');

        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            errors.push('파견 종료일은 시작일보다 늦어야 합니다.');
        }

        if (data.totalLessons && (data.totalLessons < 1 || data.totalLessons > 100)) {
            errors.push('총 수업 횟수는 1~100회 사이여야 합니다.');
        }

        // 수업 계획 내용 검증 (필수)
        if (data.lessons && data.lessons.length > 0) {
            let emptyTopicCount = 0;
            let emptyContentCount = 0;
            
            data.lessons.forEach((lesson, index) => {
                if (!lesson.topic || lesson.topic.trim() === '') {
                    emptyTopicCount++;
                }
                if (!lesson.content || lesson.content.trim() === '') {
                    emptyContentCount++;
                }
            });
            
            if (emptyTopicCount > 0) {
                errors.push(`${emptyTopicCount}개 수업의 주제가 비어있습니다. 모든 수업의 주제를 입력해주세요.`);
            }
            
            if (emptyContentCount > 0) {
                errors.push(`${emptyContentCount}개 수업의 내용이 비어있습니다. 모든 수업의 내용을 구체적으로 작성해주세요.`);
            }
        } else {
            errors.push('수업 계획표를 생성하고 각 수업의 주제와 내용을 작성해주세요.');
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

            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인이 필요합니다.', 'warning');
                return;
            }

            console.log('👤 사용자 확인:', currentUser.id);

            const data = this.collectFormData();
            
            console.log('🚀 Supabase에 임시저장 요청');
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, true);
            
            if (result.success) {
                console.log('✅ 임시저장 성공:', result.data?.id);
                this.showMessage('✅ 수업계획이 임시저장되었습니다!', 'success');
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

    // 폼 제출 처리 (필수 검증 강화)
    async handleFormSubmit_actual(e) {
        e.preventDefault();
        
        try {
            console.log('📝 수업계획 완료 제출 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return;
            }

            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인이 필요합니다.', 'warning');
                return;
            }

            console.log('👤 사용자 확인:', currentUser.id);

            const data = this.collectFormData();
            const errors = this.validateForm(data);

            if (errors.length > 0) {
                console.warn('⚠️ 폼 검증 실패:', errors);
                this.showMessage('❌ 다음 사항을 확인해주세요:\n\n' + errors.join('\n'), 'warning');
                
                // 스크롤을 첫 번째 오류 위치로 이동
                this.scrollToFirstError(data);
                return;
            }

            // 완료 확인 메시지
            if (!confirm('수업계획을 완료하시겠습니까?\n모든 수업의 주제와 내용이 작성되었는지 확인해주세요.\n완료 후 관리자 승인을 받으면 교구 신청이 가능합니다.')) {
                console.log('📋 사용자가 제출을 취소했습니다.');
                return;
            }

            console.log('🚀 Supabase에 완료 제출 요청');
            
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, false);
            
            if (result.success) {
                console.log('✅ 수업계획 완료 성공:', result.data?.id);
                this.showMessage('🎉 수업계획이 완료되었습니다! 관리자 승인 후 교구 신청이 가능합니다.', 'success');
                
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

    // 첫 번째 오류 위치로 스크롤
    scrollToFirstError(data) {
        try {
            // 기본 정보 오류 체크
            if (!data.startDate) {
                document.getElementById('startDate').focus();
                return;
            }
            if (!data.endDate) {
                document.getElementById('endDate').focus();
                return;
            }
            if (!data.totalLessons) {
                document.getElementById('totalLessons').focus();
                return;
            }
            if (!data.overallGoals) {
                document.getElementById('overallGoals').focus();
                return;
            }

            // 수업 계획 오류 체크
            if (data.lessons && data.lessons.length > 0) {
                for (let lesson of data.lessons) {
                    if (!lesson.topic || lesson.topic.trim() === '') {
                        const topicInput = document.getElementById(`lessonTopic_${lesson.lessonNumber}`);
                        if (topicInput) {
                            topicInput.focus();
                            topicInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                    }
                    if (!lesson.content || lesson.content.trim() === '') {
                        const contentInput = document.getElementById(`lessonContent_${lesson.lessonNumber}`);
                        if (contentInput) {
                            contentInput.focus();
                            contentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('스크롤 이동 중 오류:', error);
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
        
        // 기존 데이터가 있으면 로드
        try {
            await this.loadExistingData();
        } catch (error) {
            console.warn('기존 데이터 로드 중 오류 (무시):', error);
        }
        
        // 수정 권한 재확인
        await this.checkEditPermission();
        
        // 페이지 제목 설정
        document.title = '수업계획 작성 - 세종학당 문화교구 신청';
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

// DOM 로드 완료 시 초기화 (중복 방지)
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 LessonPlanManager DOM 초기화');
    // 약간의 지연을 두어 다른 스크립트들이 로드된 후 실행
    setTimeout(() => {
        if (!LessonPlanManager.isInitialized) {
            LessonPlanManager.init();
        }
    }, 100);
});
