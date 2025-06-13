// 수업계획 관리 모듈 (Supabase 연동) - 개선된 에러 핸들링 버전
const LessonPlanManager = {
    currentLessonPlan: null,
    isEditMode: false,

    // 수업계획 페이지 초기화
    async init() {
        console.log('🎓 LessonPlanManager 초기화 시작');
        this.bindEvents();
        await this.checkEditPermission();
        console.log('✅ LessonPlanManager 초기화 완료');
    },

    // 이벤트 바인딩
    bindEvents() {
        // 수업 계획표 생성 버튼
        const generateTableBtn = document.getElementById('generateTableBtn');
        if (generateTableBtn) {
            generateTableBtn.addEventListener('click', () => this.generateLessonTable());
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

    // 수정 권한 확인 (Supabase 연동)
    async checkEditPermission() {
        try {
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            const settings = await SupabaseAPI.getSystemSettings();
            
            if (!canEdit) {
                this.disableEditing();
                this.showEditDeadlineNotice();
            } else {
                await this.showEditStatusNotice();
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

    // 수정 마감 안내 표시 (Supabase 연동)
    async showEditDeadlineNotice() {
        try {
            const settings = await SupabaseAPI.getSystemSettings();
            
            let message = '';
            let noticeClass = 'deadline-notice';
            let iconName = 'clock';
            
            if (settings.test_mode) {
                message = '테스트 모드가 활성화되어 있어 언제든지 수정할 수 있습니다.';
                noticeClass = 'test-mode-notice';
                iconName = 'test-tube';
            } else if (settings.ignore_deadline) {
                message = '관리자가 마감일을 무시하도록 설정하여 언제든지 수정할 수 있습니다.';
                noticeClass = 'override-notice';
                iconName = 'unlock';
            } else {
                message = `수업계획 수정 마감일이 ${settings.lesson_plan_deadline}입니다.`;
            }
            
            if (message) {
                const notice = document.createElement('div');
                notice.className = noticeClass;
                notice.innerHTML = `
                    <i data-lucide="${iconName}"></i>
                    <p>${message}</p>
                `;
                
                const container = document.querySelector('.lesson-plan-content');
                if (container) {
                    container.insertBefore(notice, container.firstChild);
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('마감일 안내 표시 오류:', error);
        }
    },

    // 편집 상태 안내 표시 (Supabase 연동)
    async showEditStatusNotice() {
        try {
            const settings = await SupabaseAPI.getSystemSettings();
            let message = '';
            let noticeClass = 'edit-status-notice';
            let iconName = 'edit';
            
            if (settings.test_mode) {
                message = '🧪 테스트 모드: 언제든지 수정 가능합니다.';
                noticeClass = 'test-mode-notice success';
                iconName = 'test-tube';
            } else if (settings.ignore_deadline) {
                message = '🔓 마감일 무시 모드: 언제든지 수정 가능합니다.';
                noticeClass = 'override-notice success';
                iconName = 'unlock';
            } else {
                // 일반 모드에서 남은 시간 표시
                await this.showRemainingTime();
                return;
            }
            
            const notice = document.createElement('div');
            notice.className = noticeClass;
            notice.innerHTML = `
                <i data-lucide="${iconName}"></i>
                <p>${message}</p>
            `;
            
            const container = document.querySelector('.lesson-plan-content');
            if (container) {
                container.insertBefore(notice, container.firstChild);
                lucide.createIcons();
            }
        } catch (error) {
            console.error('편집 상태 안내 표시 오류:', error);
        }
    },

    // 남은 시간 표시 (Supabase 연동)
    async showRemainingTime() {
        try {
            const settings = await SupabaseAPI.getSystemSettings();
            
            // 테스트 모드나 마감일 무시 모드에서는 남은 시간을 표시하지 않음
            if (settings.test_mode || settings.ignore_deadline) {
                return;
            }
            
            const deadline = new Date(`${settings.lesson_plan_deadline} 23:59:59`);
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
        } catch (error) {
            console.error('남은 시간 표시 오류:', error);
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

    // 수업 계획표 생성 (수정된 버전 - 안정성 향상)
    async generateLessonTable() {
        try {
            console.log('📋 수업 계획표 생성 시작');
            
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const totalLessons = parseInt(document.getElementById('totalLessons').value);
            const lessonsPerWeek = parseInt(document.getElementById('lessonsPerWeek').value) || 3;

            console.log('입력값 확인:', { startDate, endDate, totalLessons, lessonsPerWeek });

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

            if (isNaN(lessonsPerWeek) || lessonsPerWeek <= 0) {
                this.showMessage('주당 평균 수업 횟수는 1 이상의 숫자여야 합니다.', 'warning');
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

            // 기존 데이터가 있으면 로드 (안전한 비동기 처리)
            try {
                await this.loadExistingData();
            } catch (loadError) {
                console.warn('기존 데이터 로드 중 오류 발생 (무시하고 계속):', loadError);
                // 로드 오류가 발생해도 테이블 생성은 계속 진행
            }
            
            // 성공 메시지와 안내사항
            this.showMessage(`${lessons.length}개의 수업 계획표가 생성되었습니다. 수업 내용은 선택사항이므로 원하는 만큼 작성하시면 됩니다.`, 'success');
            console.log('✅ 수업 계획표 생성 완료');
            
        } catch (error) {
            console.error('💥 수업 계획표 생성 오류:', error);
            this.showMessage(`수업 계획표 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
        }
    },

    // 간단한 수업 데이터 생성 (날짜 없이)
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

    // 수업 계획표 HTML 생성
    createLessonTable(lessons) {
        try {
            const container = document.getElementById('lessonTableContainer');
            if (!container) {
                throw new Error('수업 계획표 컨테이너를 찾을 수 없습니다.');
            }
            
            let html = `
                <div class="lesson-table">
                    <div class="lesson-table-notice">
                        <i data-lucide="info"></i>
                        <p>💡 <strong>안내:</strong> 수업 주제와 내용은 선택사항입니다. 원하는 만큼 작성하시고 언제든지 임시저장하거나 완료할 수 있습니다.</p>
                    </div>
                    <div class="table-header">
                        <div class="header-cell lesson-number-col">수업 회차</div>
                        <div class="header-cell lesson-topic-col">수업 주제 (선택)</div>
                        <div class="header-cell lesson-content-col">수업 내용 (선택)</div>
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
                                   placeholder="수업 주제 (선택사항)"
                                   class="topic-input"
                                   maxlength="100">
                        </div>
                        <div class="cell lesson-content">
                            <textarea id="lessonContent_${lesson.lessonNumber}" 
                                      placeholder="수업 내용 (선택사항)"
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
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('수업 계획표 HTML 생성 오류:', error);
            throw error;
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
            lucide.createIcons();
            
            // 5초 후 메시지 제거
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 5000);
        }
    },

    // 기존 데이터 로드 (Supabase 연동) - 안전성 향상
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

                // 기본 정보 채우기 - 안전한 방식으로
                this.safeSetValue('startDate', lessonData.startDate);
                this.safeSetValue('endDate', lessonData.endDate);
                this.safeSetValue('totalLessons', lessonData.totalLessons);
                this.safeSetValue('lessonsPerWeek', lessonData.lessonsPerWeek);
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
            // 에러가 발생해도 계속 진행
        }
    },

    // 안전한 값 설정 헬퍼 함수
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
        const lessonsPerWeek = parseInt(document.getElementById('lessonsPerWeek').value);
        const overallGoals = document.getElementById('overallGoals').value.trim();
        const specialNotes = document.getElementById('specialNotes').value.trim();

        // 수업별 데이터 수집 (빈 수업도 포함)
        const lessons = [];
        const totalLessonInputs = document.querySelectorAll('[id^="lessonTopic_"]');
        
        console.log(`🔍 ${totalLessonInputs.length}개 수업 입력 필드 발견`);
        
        totalLessonInputs.forEach(input => {
            const lessonNumber = input.id.split('_')[1];
            const topic = input.value.trim();
            const contentInput = document.getElementById(`lessonContent_${lessonNumber}`);
            
            const content = contentInput ? contentInput.value.trim() : '';
            
            // 모든 수업을 포함 (빈 수업도 포함)
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
            lessonsPerWeek,
            overallGoals,
            specialNotes,
            lessons: lessons // 모든 수업 포함
        };

        console.log('📋 수집된 데이터:', {
            기본정보: { startDate, endDate, totalLessons, lessonsPerWeek },
            수업수: lessons.length,
            목표길이: overallGoals.length,
            특별사항길이: specialNotes.length
        });

        return formData;
    },

    // 폼 유효성 검사
    validateForm(data) {
        const errors = [];

        // 필수 필드만 검증
        if (!data.startDate) errors.push('파견 시작일을 입력해주세요.');
        if (!data.endDate) errors.push('파견 종료일을 입력해주세요.');
        if (!data.totalLessons) errors.push('총 수업 횟수를 입력해주세요.');

        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            errors.push('파견 종료일은 시작일보다 늦어야 합니다.');
        }

        if (data.totalLessons && (data.totalLessons < 1 || data.totalLessons > 100)) {
            errors.push('총 수업 횟수는 1~100회 사이여야 합니다.');
        }

        console.log('✅ 폼 검증 완료:', errors.length === 0 ? '통과' : `${errors.length}개 오류`);

        return errors;
    },

    // 임시저장 (Supabase 연동) - 개선된 에러 핸들링
    async saveDraft() {
        try {
            console.log('💾 임시저장 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                const settings = await SupabaseAPI.getSystemSettings();
                if (settings.test_mode) {
                    console.log('🧪 테스트 모드이므로 임시저장을 계속 진행합니다.');
                } else {
                    this.showMessage('수업계획 수정 기간이 종료되었습니다.', 'warning');
                    return;
                }
            }

            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) {
                this.showMessage('로그인이 필요합니다.', 'warning');
                return;
            }

            console.log('👤 사용자 확인:', currentUser.id);

            const data = this.collectFormData();
            
            console.log('🚀 Supabase에 임시저장 요청');
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, true);
            
            if (result.success) {
                console.log('✅ 임시저장 성공:', result.data?.id);
                this.showMessage('수업계획이 임시저장되었습니다. 언제든지 다시 수정할 수 있습니다.', 'success');
                this.currentLessonPlan = result.data;
                this.isEditMode = true;
            } else {
                console.error('❌ 임시저장 실패:', result.message);
                this.showMessage(result.message || '임시저장 중 오류가 발생했습니다.', 'error');
            }
        } catch (error) {
            console.error('💥 임시저장 예외:', error);
            this.showMessage(`임시저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
        }
    },

    // 폼 제출 처리 (Supabase 연동) - 개선된 에러 핸들링
    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            console.log('📝 수업계획 완료 제출 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                const settings = await SupabaseAPI.getSystemSettings();
                if (settings.test_mode) {
                    console.log('🧪 테스트 모드이므로 제출을 계속 진행합니다.');
                } else {
                    this.showMessage('수업계획 수정 기간이 종료되었습니다.', 'warning');
                    return;
                }
            }

            const currentUser = AuthManager.getCurrentUser();
            if (!currentUser) {
                this.showMessage('로그인이 필요합니다.', 'warning');
                return;
            }

            console.log('👤 사용자 확인:', currentUser.id);

            const data = this.collectFormData();
            const errors = this.validateForm(data);

            if (errors.length > 0) {
                console.warn('⚠️ 폼 검증 실패:', errors);
                this.showMessage('다음 사항을 확인해주세요:\\n\\n' + errors.join('\\n'), 'warning');
                return;
            }

            // 완료 확인 메시지
            if (!confirm('수업계획을 완료하시겠습니까?\\n완료하시면 교구 신청 페이지로 이동합니다.')) {
                console.log('📋 사용자가 제출을 취소했습니다.');
                return;
            }

            console.log('🚀 Supabase에 완료 제출 요청');
            
            // 완료 상태로 저장
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, false);
            
            if (result.success) {
                console.log('✅ 수업계획 완료 성공:', result.data?.id);
                this.showMessage('수업계획이 완료되었습니다! 교구 신청 페이지로 이동합니다.', 'success');
                
                // 1.5초 후 학생 대시보드(교구 신청 화면)로 이동
                setTimeout(() => {
                    this.goToStudentDashboard();
                }, 1500);
            } else {
                console.error('❌ 수업계획 완료 실패:', result.message);
                this.showMessage(result.message || '수업계획 저장 중 오류가 발생했습니다.', 'error');
            }
        } catch (error) {
            console.error('💥 수업계획 제출 예외:', error);
            this.showMessage(`수업계획 저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error');
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
        const notices = document.querySelectorAll('.edit-deadline-notice, .test-mode-notice, .override-notice, .time-remaining-notice, .edit-status-notice, .lesson-plan-message');
        notices.forEach(notice => notice.remove());
    },

    // 수업계획 완료 여부 확인 (Supabase 연동)
    async hasCompletedLessonPlan(studentId) {
        try {
            const plan = await SupabaseAPI.getStudentLessonPlan(studentId);
            return plan && plan.status === 'submitted';
        } catch (error) {
            console.error('수업계획 완료 여부 확인 오류:', error);
            return false;
        }
    },

    // 수업계획 필요 여부 확인 (Supabase 연동)
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
    LessonPlanManager.init();
});
