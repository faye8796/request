// 수업계획 관리 모듈
const LessonPlanManager = {
    currentLessonPlan: null,
    isEditMode: false,

    // 수업계획 페이지 초기화
    init() {
        this.bindEvents();
        this.checkEditPermission();
    },

    // 이벤트 바인딩
    bindEvents() {
        // 수업 계획표 생성 버튼
        const generateTableBtn = document.getElementById('generateTableBtn');
        if (generateTableBtn) {
            generateTableBtn.addEventListener('click', () => this.generateLessonTable());
        }

        // 일괄 적용 버튼
        const bulkApplyBtn = document.getElementById('bulkApplyBtn');
        if (bulkApplyBtn) {
            bulkApplyBtn.addEventListener('click', () => this.applyBulkTopic());
        }

        // 주차 표시 체크박스
        const showWeekNumbers = document.getElementById('showWeekNumbers');
        if (showWeekNumbers) {
            showWeekNumbers.addEventListener('change', () => this.toggleWeekNumbers());
        }

        // 수업계획 폼 제출
        const lessonPlanForm = document.getElementById('lessonPlanForm');
        if (lessonPlanForm) {
            lessonPlanForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // 임시저장 버튼
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }

        // 파견 시작일/종료일 변경 시 자동 계산
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate && endDate) {
            startDate.addEventListener('change', () => this.calculateDuration());
            endDate.addEventListener('change', () => this.calculateDuration());
        }

        // 총 수업 횟수 변경 시 주당 평균 수업 횟수 자동 계산
        const totalLessons = document.getElementById('totalLessons');
        if (totalLessons) {
            totalLessons.addEventListener('change', () => this.calculateLessonsPerWeek());
        }
    },

    // 수정 권한 확인
    checkEditPermission() {
        const canEdit = DataManager.canEditLessonPlan();
        const settings = DataManager.lessonPlanSettings;
        
        if (!canEdit) {
            this.disableEditing();
            this.showEditDeadlineNotice();
        } else {
            this.showRemainingTime();
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
            
            // 안내 메시지 표시
            const notice = document.createElement('div');
            notice.className = 'edit-deadline-notice';
            notice.innerHTML = `
                <i data-lucide="alert-circle"></i>
                <p>수업계획 수정 기간이 종료되었습니다.</p>
            `;
            form.insertBefore(notice, form.firstChild);
            lucide.createIcons();
        }
    },

    // 수정 마감 안내 표시
    showEditDeadlineNotice() {
        const settings = DataManager.lessonPlanSettings;
        if (settings.noticeMessage) {
            const notice = document.createElement('div');
            notice.className = 'deadline-notice';
            notice.innerHTML = `
                <i data-lucide="clock"></i>
                <p>${settings.noticeMessage}</p>
            `;
            
            const container = document.querySelector('.lesson-plan-content');
            if (container) {
                container.insertBefore(notice, container.firstChild);
                lucide.createIcons();
            }
        }
    },

    // 남은 시간 표시
    showRemainingTime() {
        const settings = DataManager.lessonPlanSettings;
        const deadline = new Date(`${settings.editDeadline} ${settings.editTime}`);
        const now = new Date();
        const remaining = deadline - now;
        
        if (remaining > 0) {
            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            const notice = document.createElement('div');
            notice.className = 'time-remaining-notice';
            notice.innerHTML = `
                <i data-lucide="clock"></i>
                <p>수업계획 수정 마감까지 <strong>${days}일 ${hours}시간</strong> 남았습니다.</p>
            `;
            
            const container = document.querySelector('.lesson-plan-content');
            if (container) {
                container.insertBefore(notice, container.firstChild);
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
            
            // 총 수업 횟수가 설정되어 있으면 주당 평균 계산
            this.calculateLessonsPerWeek();
        }
    },

    // 주당 평균 수업 횟수 계산
    calculateLessonsPerWeek() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const totalLessons = document.getElementById('totalLessons').value;
        const lessonsPerWeekInput = document.getElementById('lessonsPerWeek');
        
        if (startDate && endDate && totalLessons) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weeks = Math.ceil(diffDays / 7);
            
            if (weeks > 0) {
                const avgLessonsPerWeek = Math.ceil(totalLessons / weeks);
                lessonsPerWeekInput.value = avgLessonsPerWeek;
            }
        }
    },

    // 수업 계획표 생성
    generateLessonTable() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const totalLessons = parseInt(document.getElementById('totalLessons').value);
        const lessonsPerWeek = parseInt(document.getElementById('lessonsPerWeek').value) || 3;

        // 유효성 검사
        if (!startDate || !endDate || !totalLessons) {
            alert('파견 시작일, 종료일, 총 수업 횟수를 모두 입력해주세요.');
            return;
        }

        if (totalLessons > 100) {
            alert('총 수업 횟수는 100회를 초과할 수 없습니다.');
            return;
        }

        // 수업 데이터 생성
        const lessons = DataManager.calculateWeeks(startDate, endDate, totalLessons, lessonsPerWeek);
        
        // 테이블 생성
        this.createLessonTable(lessons);
        
        // 섹션 표시
        document.getElementById('lessonTableSection').style.display = 'block';
        document.getElementById('additionalInfoSection').style.display = 'block';

        // 기존 데이터가 있으면 로드
        this.loadExistingData();
    },

    // 수업 계획표 HTML 생성
    createLessonTable(lessons) {
        const container = document.getElementById('lessonTableContainer');
        const showWeeks = document.getElementById('showWeekNumbers').checked;
        
        let html = `
            <div class="lesson-table">
                <div class="table-header">
                    <div class="header-cell">수업 번호</div>
                    ${showWeeks ? '<div class="header-cell">주차</div>' : ''}
                    <div class="header-cell">날짜</div>
                    <div class="header-cell">수업 주제</div>
                    <div class="header-cell">수업 내용</div>
                </div>
        `;

        lessons.forEach((lesson, index) => {
            html += `
                <div class="table-row" data-lesson="${lesson.lessonNumber}">
                    <div class="cell lesson-number">${lesson.lessonNumber}</div>
                    ${showWeeks ? `<div class="cell week-number">${lesson.week}주차</div>` : ''}
                    <div class="cell lesson-date">
                        <input type="date" 
                               id="lessonDate_${lesson.lessonNumber}" 
                               value="${lesson.date}"
                               class="date-input">
                    </div>
                    <div class="cell lesson-topic">
                        <input type="text" 
                               id="lessonTopic_${lesson.lessonNumber}" 
                               placeholder="수업 주제를 입력하세요"
                               class="topic-input"
                               maxlength="100">
                    </div>
                    <div class="cell lesson-content">
                        <textarea id="lessonContent_${lesson.lessonNumber}" 
                                  placeholder="수업 내용을 상세히 입력하세요"
                                  class="content-textarea"
                                  rows="2"
                                  maxlength="500"></textarea>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // 아이콘 재생성
        lucide.createIcons();
    },

    // 주차 표시 토글
    toggleWeekNumbers() {
        // 테이블이 이미 생성되어 있으면 재생성
        const container = document.getElementById('lessonTableContainer');
        if (container.children.length > 0) {
            this.generateLessonTable();
        }
    },

    // 일괄 주제 적용
    applyBulkTopic() {
        const bulkTopic = document.getElementById('bulkTopic').value.trim();
        if (!bulkTopic) {
            alert('일괄 적용할 주제를 입력해주세요.');
            return;
        }

        const topicInputs = document.querySelectorAll('.topic-input');
        topicInputs.forEach(input => {
            if (!input.value.trim()) { // 비어있는 칸만 적용
                input.value = bulkTopic;
            }
        });

        // 입력창 비우기
        document.getElementById('bulkTopic').value = '';
    },

    // 기존 데이터 로드
    loadExistingData() {
        if (!DataManager.currentUser) return;

        const existingPlan = DataManager.getStudentLessonPlan(DataManager.currentUser.id);
        if (existingPlan) {
            this.currentLessonPlan = existingPlan;
            this.isEditMode = true;

            // 기본 정보 채우기
            document.getElementById('startDate').value = existingPlan.startDate;
            document.getElementById('endDate').value = existingPlan.endDate;
            document.getElementById('totalLessons').value = existingPlan.totalLessons;
            document.getElementById('lessonsPerWeek').value = existingPlan.lessonsPerWeek || 3;
            document.getElementById('overallGoals').value = existingPlan.overallGoals || '';
            document.getElementById('specialNotes').value = existingPlan.specialNotes || '';

            // 수업별 데이터 채우기
            if (existingPlan.lessons) {
                existingPlan.lessons.forEach(lesson => {
                    const topicInput = document.getElementById(`lessonTopic_${lesson.lessonNumber}`);
                    const contentInput = document.getElementById(`lessonContent_${lesson.lessonNumber}`);
                    const dateInput = document.getElementById(`lessonDate_${lesson.lessonNumber}`);
                    
                    if (topicInput) topicInput.value = lesson.topic || '';
                    if (contentInput) contentInput.value = lesson.content || '';
                    if (dateInput) dateInput.value = lesson.date || '';
                });
            }
        }
    },

    // 현재 데이터 수집
    collectFormData() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const totalLessons = parseInt(document.getElementById('totalLessons').value);
        const lessonsPerWeek = parseInt(document.getElementById('lessonsPerWeek').value);
        const overallGoals = document.getElementById('overallGoals').value.trim();
        const specialNotes = document.getElementById('specialNotes').value.trim();

        // 수업별 데이터 수집
        const lessons = [];
        const totalLessonInputs = document.querySelectorAll('[id^="lessonTopic_"]');
        
        totalLessonInputs.forEach(input => {
            const lessonNumber = input.id.split('_')[1];
            const topic = input.value.trim();
            const content = document.getElementById(`lessonContent_${lessonNumber}`).value.trim();
            const date = document.getElementById(`lessonDate_${lessonNumber}`).value;
            
            // 주차 계산
            const week = Math.ceil(lessonNumber / lessonsPerWeek);
            const lessonInWeek = ((lessonNumber - 1) % lessonsPerWeek) + 1;
            
            lessons.push({
                week: week,
                lesson: lessonInWeek,
                lessonNumber: parseInt(lessonNumber),
                date: date,
                topic: topic,
                content: content
            });
        });

        return {
            startDate,
            endDate,
            totalLessons,
            lessonsPerWeek,
            overallGoals,
            specialNotes,
            lessons: lessons.filter(lesson => lesson.topic || lesson.content) // 빈 수업 제외
        };
    },

    // 폼 유효성 검사
    validateForm(data) {
        const errors = [];

        if (!data.startDate) errors.push('파견 시작일을 입력해주세요.');
        if (!data.endDate) errors.push('파견 종료일을 입력해주세요.');
        if (!data.totalLessons) errors.push('총 수업 횟수를 입력해주세요.');

        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            errors.push('파견 종료일은 시작일보다 늦어야 합니다.');
        }

        if (data.totalLessons && (data.totalLessons < 1 || data.totalLessons > 100)) {
            errors.push('총 수업 횟수는 1~100회 사이여야 합니다.');
        }

        // 수업 내용 검사
        const emptyLessons = data.lessons.filter(lesson => !lesson.topic.trim() && !lesson.content.trim()).length;
        const totalLessonsEntered = data.lessons.length;
        
        if (totalLessonsEntered < data.totalLessons * 0.5) {
            errors.push('최소 전체 수업의 50% 이상은 계획을 작성해주세요.');
        }

        return errors;
    },

    // 임시저장
    saveDraft() {
        if (!DataManager.canEditLessonPlan()) {
            alert('수업계획 수정 기간이 종료되었습니다.');
            return;
        }

        const data = this.collectFormData();
        
        try {
            const result = DataManager.saveLessonPlanDraft(DataManager.currentUser.id, data);
            
            if (result) {
                this.showSuccessMessage('수업계획이 임시저장되었습니다.');
                this.currentLessonPlan = result;
                this.isEditMode = true;
            }
        } catch (error) {
            console.error('임시저장 오류:', error);
            alert('임시저장 중 오류가 발생했습니다.');
        }
    },

    // 폼 제출 처리
    handleFormSubmit(e) {
        e.preventDefault();

        if (!DataManager.canEditLessonPlan()) {
            alert('수업계획 수정 기간이 종료되었습니다.');
            return;
        }

        const data = this.collectFormData();
        const errors = this.validateForm(data);

        if (errors.length > 0) {
            alert('다음 사항을 확인해주세요:\n\n' + errors.join('\n'));
            return;
        }

        // 완료 확인
        if (!confirm('수업계획을 완료하시겠습니까? 완료 후에는 수정이 제한될 수 있습니다.')) {
            return;
        }

        try {
            // 완료 상태로 저장
            data.status = 'completed';
            const result = DataManager.saveLessonPlan(DataManager.currentUser.id, data);
            
            if (result) {
                this.showSuccessMessage('수업계획이 완료되었습니다!');
                
                // 3초 후 학생 대시보드로 이동
                setTimeout(() => {
                    this.goToStudentDashboard();
                }, 3000);
            }
        } catch (error) {
            console.error('수업계획 저장 오류:', error);
            alert('수업계획 저장 중 오류가 발생했습니다.');
        }
    },

    // 성공 메시지 표시
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <i data-lucide="check-circle"></i>
            <p>${message}</p>
        `;
        
        const form = document.getElementById('lessonPlanForm');
        form.insertBefore(successDiv, form.firstChild);
        
        lucide.createIcons();
        
        // 3초 후 메시지 제거
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    },

    // 학생 대시보드로 이동
    goToStudentDashboard() {
        const lessonPlanPage = document.getElementById('lessonPlanPage');
        const studentPage = document.getElementById('studentPage');
        
        if (lessonPlanPage && studentPage) {
            lessonPlanPage.classList.remove('active');
            studentPage.classList.add('active');
            
            // 학생 대시보드 새로고침
            if (window.StudentManager && window.StudentManager.loadDashboard) {
                window.StudentManager.loadDashboard();
            }
        }
    },

    // 수업계획 페이지 표시
    showLessonPlanPage() {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        
        const lessonPlanPage = document.getElementById('lessonPlanPage');
        if (lessonPlanPage) {
            lessonPlanPage.classList.add('active');
            
            // 기존 데이터가 있으면 로드
            this.loadExistingData();
            
            // 수정 권한 재확인
            this.checkEditPermission();
        }
    },

    // 수업계획 완료 여부 확인
    hasCompletedLessonPlan(studentId) {
        const plan = DataManager.getStudentLessonPlan(studentId);
        return plan && plan.status === 'completed';
    },

    // 수업계획 필요 여부 확인 (최초 로그인 시)
    needsLessonPlan(studentId) {
        const plan = DataManager.getStudentLessonPlan(studentId);
        return !plan || plan.status === 'draft';
    }
};

// 전역 접근을 위한 window 객체에 추가
window.LessonPlanManager = LessonPlanManager;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    LessonPlanManager.init();
});