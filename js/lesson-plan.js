// 수업계획 관리 모듈
const LessonPlanManager = {
    currentLessonPlan: null,
    isEditMode: false,

    // 수업계획 페이지 초기화
    init() {
        this.bindEvents();
        this.checkEditPermission();
        this.showBudgetAllocationNotice(); // 예산 배정 안내 추가
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

        // 총 수업 횟수 변경 시 주당 평균 수업 횟수 자동 계산 및 예산 업데이트
        const totalLessons = document.getElementById('totalLessons');
        if (totalLessons) {
            totalLessons.addEventListener('change', () => {
                this.calculateLessonsPerWeek();
                this.updateBudgetEstimate(); // 예산 예상치 업데이트
            });
            // 입력하는 동안에도 실시간 업데이트
            totalLessons.addEventListener('input', () => this.updateBudgetEstimate());
        }
    },

    // === 새로운 예산 배정 안내 기능들 ===

    // 예산 배정 안내 표시
    showBudgetAllocationNotice() {
        const user = DataManager.currentUser;
        if (!user) return;

        const noticeContainer = document.getElementById('budgetAllocationNotice');
        if (!noticeContainer) return;

        const supportRate = DataManager.fieldSupportRates[user.specialization] || 0;
        const maxBudget = DataManager.fieldMaxBudgets[user.specialization] || 0;

        if (supportRate > 0) {
            noticeContainer.style.display = 'block';
            noticeContainer.innerHTML = `
                <div class="notice-content">
                    <i data-lucide="info"></i>
                    <div class="notice-text">
                        <h4>예산 배정 안내</h4>
                        <p>수업계획을 제출하시면 관리자 승인 후 파견분야별 회당 지원금에 따라 자동으로 예산이 배정됩니다.</p>
                        <div class="budget-info-details">
                            <div class="field-info">
                                <span class="field-label">파견분야:</span>
                                <span class="field-value">${user.specialization}</span>
                            </div>
                            <div class="rate-info">
                                <span class="rate-label">회당 지원금:</span>
                                <span class="rate-value">${this.formatPrice(supportRate)}</span>
                            </div>
                            <div class="max-budget-info">
                                <span class="max-label">최대 상한:</span>
                                <span class="max-value">${this.formatPrice(maxBudget)}</span>
                            </div>
                        </div>
                        <div id="budgetEstimate" class="budget-estimate"></div>
                    </div>
                </div>
            `;

            // 아이콘 생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // 초기 예산 예상치 계산
            this.updateBudgetEstimate();
        }
    },

    // 예산 예상치 업데이트
    updateBudgetEstimate() {
        const user = DataManager.currentUser;
        if (!user) return;

        const totalLessonsInput = document.getElementById('totalLessons');
        const budgetEstimateDiv = document.getElementById('budgetEstimate');
        
        if (!totalLessonsInput || !budgetEstimateDiv) return;

        const totalLessons = parseInt(totalLessonsInput.value) || 0;
        
        if (totalLessons > 0) {
            const supportRate = DataManager.fieldSupportRates[user.specialization] || 0;
            const maxBudget = DataManager.fieldMaxBudgets[user.specialization] || 0;
            
            const calculatedBudget = supportRate * totalLessons;
            const finalBudget = Math.min(calculatedBudget, maxBudget);
            
            let estimateHTML = '';
            
            if (supportRate > 0) {
                estimateHTML = `
                    <div class="budget-calculation">
                        <h5>예상 배정 예산</h5>
                        <div class="calculation-detail">
                            <span class="calculation-formula">
                                ${this.formatPrice(supportRate)} × ${totalLessons}회 = ${this.formatPrice(calculatedBudget)}
                            </span>
                        </div>
                `;
                
                if (calculatedBudget > maxBudget) {
                    estimateHTML += `
                        <div class="max-budget-applied">
                            <span class="max-budget-note">
                                ※ 최대 상한 적용: ${this.formatPrice(maxBudget)}
                            </span>
                        </div>
                    `;
                }
                
                estimateHTML += `
                        <div class="final-budget">
                            <span class="final-budget-label">최종 예상 예산:</span>
                            <span class="final-budget-amount">${this.formatPrice(finalBudget)}</span>
                        </div>
                `;
                
                // 예산 효율성 안내
                if (calculatedBudget > maxBudget) {
                    const optimalLessons = Math.floor(maxBudget / supportRate);
                    estimateHTML += `
                        <div class="efficiency-tip">
                            <small>💡 예산 효율성을 위해서는 ${optimalLessons}회 이하로 계획하시는 것이 좋습니다.</small>
                        </div>
                    `;
                }
                
                estimateHTML += `</div>`;
            } else {
                estimateHTML = `
                    <div class="budget-calculation error">
                        <p>⚠️ 해당 분야의 회당 지원금이 설정되지 않았습니다. 관리자에게 문의하세요.</p>
                    </div>
                `;
            }
            
            budgetEstimateDiv.innerHTML = estimateHTML;
        } else {
            budgetEstimateDiv.innerHTML = `
                <div class="budget-calculation placeholder">
                    <p>총 수업 횟수를 입력하시면 예상 배정 예산을 확인할 수 있습니다.</p>
                </div>
            `;
        }
    },

    // 가격 포맷팅 헬퍼
    formatPrice(price) {
        return new Intl.NumberFormat('ko-KR').format(price) + '원';
    },

    // === 기존 메소드들 ===

    // 수정 권한 확인 (업데이트됨)
    checkEditPermission() {
        const canEdit = DataManager.canEditLessonPlan();
        const settings = DataManager.lessonPlanSettings;
        
        if (!canEdit) {
            this.disableEditing();
            this.showEditDeadlineNotice();
        } else {
            this.showEditStatusNotice();
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

    // 수정 마감 안내 표시 (업데이트됨)
    showEditDeadlineNotice() {
        const settings = DataManager.lessonPlanSettings;
        
        let message = '';
        let noticeClass = 'deadline-notice';
        let iconName = 'clock';
        
        if (settings.testMode) {
            message = '테스트 모드가 활성화되어 있어 언제든지 수정할 수 있습니다.';
            noticeClass = 'test-mode-notice';
            iconName = 'test-tube';
        } else if (settings.allowOverrideDeadline) {
            message = '관리자가 마감일을 무시하도록 설정하여 언제든지 수정할 수 있습니다.';
            noticeClass = 'override-notice';
            iconName = 'unlock';
        } else if (settings.noticeMessage) {
            message = settings.noticeMessage;
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
    },

    // 편집 상태 안내 표시 (새로 추가)
    showEditStatusNotice() {
        const settings = DataManager.lessonPlanSettings;
        let message = '';
        let noticeClass = 'edit-status-notice';
        let iconName = 'edit';
        
        if (settings.testMode) {
            message = '🧪 테스트 모드: 언제든지 수정 가능합니다.';
            noticeClass = 'test-mode-notice success';
            iconName = 'test-tube';
        } else if (settings.allowOverrideDeadline) {
            message = '🔓 마감일 무시 모드: 언제든지 수정 가능합니다.';
            noticeClass = 'override-notice success';
            iconName = 'unlock';
        } else {
            // 일반 모드에서 남은 시간 표시
            this.showRemainingTime();
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
    },

    // 남은 시간 표시 (업데이트됨)
    showRemainingTime() {
        const settings = DataManager.lessonPlanSettings;
        
        // 테스트 모드나 마감일 무시 모드에서는 남은 시간을 표시하지 않음
        if (settings.testMode || settings.allowOverrideDeadline) {
            return;
        }
        
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

    // 수업 계획표 생성 (간소화됨)
    generateLessonTable() {
        try {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const totalLessons = parseInt(document.getElementById('totalLessons').value);
            const lessonsPerWeek = parseInt(document.getElementById('lessonsPerWeek').value) || 3;

            // 유효성 검사
            if (!startDate || !endDate || !totalLessons) {
                alert('파견 시작일, 종료일, 총 수업 횟수를 모두 입력해주세요.');
                return;
            }

            if (isNaN(totalLessons) || totalLessons <= 0) {
                alert('총 수업 횟수는 1 이상의 숫자여야 합니다.');
                return;
            }

            if (totalLessons > 100) {
                alert('총 수업 횟수는 100회를 초과할 수 없습니다.');
                return;
            }

            if (isNaN(lessonsPerWeek) || lessonsPerWeek <= 0) {
                alert('주당 평균 수업 횟수는 1 이상의 숫자여야 합니다.');
                return;
            }

            // 날짜 유효성 검사
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                alert('유효하지 않은 날짜입니다.');
                return;
            }
            
            if (start >= end) {
                alert('파견 종료일은 시작일보다 늦어야 합니다.');
                return;
            }

            // 간단한 수업 데이터 생성 (날짜 없이)
            console.log('수업 계획표 생성 중...', { totalLessons });
            
            const lessons = this.createSimpleLessons(totalLessons);
            
            if (!lessons || lessons.length === 0) {
                alert('수업 계획표를 생성할 수 없습니다. 입력값을 확인해주세요.');
                return;
            }
            
            console.log('생성된 수업 데이터:', lessons);
            
            // 테이블 생성
            this.createLessonTable(lessons);
            
            // 섹션 표시
            document.getElementById('lessonTableSection').style.display = 'block';
            document.getElementById('additionalInfoSection').style.display = 'block';

            // 기존 데이터가 있으면 로드
            this.loadExistingData();
            
            // 성공 메시지
            this.showSuccessMessage(`${lessons.length}개의 수업 계획이 생성되었습니다.`);
            
        } catch (error) {
            console.error('수업 계획표 생성 오류:', error);
            alert(`수업 계획표 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
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

    // 수업 계획표 HTML 생성 (간소화됨)
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
                        <div class="header-cell lesson-topic-col">수업 주제</div>
                        <div class="header-cell lesson-content-col">수업 내용</div>
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
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('수업 계획표 HTML 생성 오류:', error);
            throw error;
        }
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

            // 예산 예상치 업데이트
            this.updateBudgetEstimate();

            // 수업별 데이터 채우기
            if (existingPlan.lessons) {
                existingPlan.lessons.forEach(lesson => {
                    const topicInput = document.getElementById(`lessonTopic_${lesson.lessonNumber}`);
                    const contentInput = document.getElementById(`lessonContent_${lesson.lessonNumber}`);
                    
                    if (topicInput) topicInput.value = lesson.topic || '';
                    if (contentInput) contentInput.value = lesson.content || '';
                });
            }
        }
    },

    // 현재 데이터 수집 (간소화됨)
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
            const contentInput = document.getElementById(`lessonContent_${lessonNumber}`);
            
            const content = contentInput ? contentInput.value.trim() : '';

            lessons.push({
                lessonNumber: parseInt(lessonNumber),
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

    // 폼 유효성 검사 (예산 관련 검증 추가)
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
        const totalLessonsEntered = data.lessons.length;
        
        if (totalLessonsEntered < data.totalLessons * 0.3) {
            errors.push('최소 전체 수업의 30% 이상은 계획을 작성해주세요.');
        }

        // 예산 관련 안내 (경고성 메시지)
        const user = DataManager.currentUser;
        if (user && data.totalLessons) {
            const supportRate = DataManager.fieldSupportRates[user.specialization] || 0;
            const maxBudget = DataManager.fieldMaxBudgets[user.specialization] || 0;
            
            if (supportRate === 0) {
                errors.push(`⚠️ 분야(${user.specialization})의 회당 지원금이 설정되지 않았습니다. 관리자에게 문의하세요.`);
            } else {
                const calculatedBudget = supportRate * data.totalLessons;
                if (calculatedBudget > maxBudget) {
                    const optimalLessons = Math.floor(maxBudget / supportRate);
                    errors.push(`💡 예산 효율성 안내: 최대 상한(${this.formatPrice(maxBudget)}) 적용으로 ${optimalLessons}회 이하로 계획하시는 것이 효율적입니다.`);
                }
            }
        }

        return errors;
    },

    // 임시저장 (업데이트됨)
    saveDraft() {
        if (!DataManager.canEditLessonPlan()) {
            const settings = DataManager.lessonPlanSettings;
            if (settings.testMode) {
                console.log('테스트 모드이므로 임시저장을 계속 진행합니다.');
            } else {
                alert('수업계획 수정 기간이 종료되었습니다.');
                return;
            }
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

    // 폼 제출 처리 (업데이트됨)
    handleFormSubmit(e) {
        e.preventDefault();

        if (!DataManager.canEditLessonPlan()) {
            const settings = DataManager.lessonPlanSettings;
            if (settings.testMode) {
                console.log('테스트 모드이므로 제출을 계속 진행합니다.');
            } else {
                alert('수업계획 수정 기간이 종료되었습니다.');
                return;
            }
        }

        const data = this.collectFormData();
        const errors = this.validateForm(data);

        if (errors.length > 0) {
            alert('다음 사항을 확인해주세요:\\n\\n' + errors.join('\\n'));
            return;
        }

        // 예산 배정 안내와 함께 완료 확인
        const user = DataManager.currentUser;
        const supportRate = DataManager.fieldSupportRates[user.specialization] || 0;
        const maxBudget = DataManager.fieldMaxBudgets[user.specialization] || 0;
        const calculatedBudget = supportRate * data.totalLessons;
        const finalBudget = Math.min(calculatedBudget, maxBudget);

        let confirmMessage = '수업계획을 완료하시겠습니까?\\n\\n';
        confirmMessage += `📋 총 수업 횟수: ${data.totalLessons}회\\n`;
        confirmMessage += `💰 예상 배정 예산: ${this.formatPrice(finalBudget)}\\n\\n`;
        confirmMessage += '✅ 관리자 승인 후 예산이 자동으로 배정됩니다.\\n';
        confirmMessage += '⚠️ 완료 후에는 수정이 제한될 수 있습니다.';

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // 완료 상태로 저장
            data.status = 'completed';
            const result = DataManager.saveLessonPlan(DataManager.currentUser.id, data);
            
            if (result) {
                this.showSuccessMessage('🎉 수업계획이 완료되었습니다! 관리자 승인을 기다리세요.');
                
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
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
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

    // 수업계획 페이지 표시 (업데이트됨)
    showLessonPlanPage() {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        
        const lessonPlanPage = document.getElementById('lessonPlanPage');
        if (lessonPlanPage) {
            lessonPlanPage.classList.add('active');
            
            // 기존 알림 메시지 제거
            const existingNotices = lessonPlanPage.querySelectorAll('.edit-deadline-notice, .test-mode-notice, .override-notice, .time-remaining-notice, .edit-status-notice');
            existingNotices.forEach(notice => notice.remove());
            
            // 기존 데이터가 있으면 로드
            this.loadExistingData();
            
            // 수정 권한 재확인
            this.checkEditPermission();
            
            // 예산 배정 안내 재표시
            this.showBudgetAllocationNotice();
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