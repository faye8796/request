// 관리자 기능 관리 모듈 (Supabase 연동) - 관계 쿼리 문제 완전 해결 + 예산 재계산 시스템 통합
const AdminManager = {
    currentSearchTerm: '',
    currentViewingLessonPlan: null, // 현재 보고 있는 수업계획

    // 초기화
    async init() {
        this.setupEventListeners();
        await this.loadStatistics();
        await this.loadBudgetOverview();
        await this.loadApplications();
        await this.loadLessonPlanManagement();
        await this.loadBudgetSettings();
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 검색 기능
        Utils.on('#searchInput', 'input', Utils.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        // Excel 내보내기
        Utils.on('#exportBtn', 'click', () => this.handleExport());

        // 수업계획 설정 버튼
        Utils.on('#lessonPlanSettingsBtn', 'click', () => this.showLessonPlanSettingsModal());

        // 예산 설정 버튼
        Utils.on('#budgetSettingsBtn', 'click', () => this.showBudgetSettingsModal());

        // 수업계획 관리 버튼
        Utils.on('#lessonPlanManagementBtn', 'click', () => this.showLessonPlanManagementModal());

        // 수업계획 설정 모달 이벤트
        Utils.on('#planSettingsCancelBtn', 'click', () => this.hideLessonPlanSettingsModal());
        Utils.on('#lessonPlanSettingsModal', 'click', (e) => {
            if (e.target.id === 'lessonPlanSettingsModal') {
                this.hideLessonPlanSettingsModal();
            }
        });
        Utils.on('#lessonPlanSettingsForm', 'submit', (e) => {
            e.preventDefault();
            this.handleLessonPlanSettingsSubmit();
        });

        // 예산 설정 모달 이벤트 (수정됨)
        Utils.on('#budgetSettingsCancelBtn', 'click', () => this.hideBudgetSettingsModal());
        Utils.on('#budgetSettingsModal', 'click', (e) => {
            if (e.target.id === 'budgetSettingsModal') {
                this.hideBudgetSettingsModal();
            }
        });
        Utils.on('#budgetSettingsForm', 'submit', (e) => {
            e.preventDefault();
            this.handleBudgetSettingsSubmit();
        });

        // 수업계획 관리 모달 이벤트 (수정됨)
        Utils.on('#lessonPlanManagementCloseBtn', 'click', () => this.hideLessonPlanManagementModal());
        Utils.on('#lessonPlanManagementModal', 'click', (e) => {
            if (e.target.id === 'lessonPlanManagementModal') {
                this.hideLessonPlanManagementModal();
            }
        });

        // 세부 수업계획 보기 모달 이벤트 (새로 추가)
        Utils.on('#viewLessonPlanCloseBtn', 'click', () => this.hideViewLessonPlanModal());
        Utils.on('#viewLessonPlanModal', 'click', (e) => {
            if (e.target.id === 'viewLessonPlanModal') {
                this.hideViewLessonPlanModal();
            }
        });

        // 세부 수업계획 모달의 승인/반려 버튼
        Utils.on('#approveLessonPlanBtn', 'click', (e) => {
            const studentId = e.target.dataset.studentId;
            if (studentId) {
                this.approveLessonPlan(studentId, e.target);
            }
        });

        Utils.on('#rejectLessonPlanBtn', 'click', (e) => {
            const studentId = e.target.dataset.studentId;
            if (studentId) {
                this.rejectLessonPlan(studentId, e.target);
            }
        });

        // 영수증 보기 모달 이벤트
        Utils.on('#viewReceiptCloseBtn', 'click', () => this.hideViewReceiptModal());
        Utils.on('#viewReceiptModal', 'click', (e) => {
            if (e.target.id === 'viewReceiptModal') {
                this.hideViewReceiptModal();
            }
        });
        Utils.on('#downloadReceiptBtn', 'click', () => this.downloadReceiptImage());

        // 키보드 단축키
        this.setupKeyboardShortcuts();
    },

    // 세부 수업계획 보기 모달 표시 (수정됨 - 데이터 로드 개선)
    async showViewLessonPlanModal(studentId, lessonPlan) {
        try {
            console.log('🔍 수업계획 상세보기 시작:', studentId, lessonPlan);
            
            const modal = Utils.$('#viewLessonPlanModal');
            if (!modal) {
                Utils.showToast('세부 수업계획 모달을 찾을 수 없습니다.', 'error');
                return;
            }

            // 현재 보고 있는 수업계획 저장
            this.currentViewingLessonPlan = lessonPlan;

            // 학생 정보 표시 (안전한 방식)
            const userProfile = lessonPlan.user_profiles || {};
            const studentName = userProfile.name || '알 수 없음';
            const institute = userProfile.sejong_institute || '미설정';
            const field = userProfile.field || '미설정';

            Utils.$('#detailStudentName').textContent = studentName;
            Utils.$('#detailStudentInfo').textContent = `${institute} • ${field}`;

            // 수업 정보 파싱 (개선된 방식)
            const lessonData = this.parseLessonData(lessonPlan.lessons);
            console.log('📊 파싱된 수업 데이터:', lessonData);

            // 수업 기간 및 횟수 표시
            const { startDate, endDate, totalLessons, overallGoals, specialNotes, schedule } = lessonData;
            
            Utils.$('#detailPlanPeriod').textContent = 
                (startDate && endDate) ? `${startDate} ~ ${endDate}` : '기간 미설정';
            Utils.$('#detailTotalLessons').textContent = `총 ${totalLessons}회`;

            // 예산 정보 계산 및 표시
            await this.displayBudgetAllocationInfo(field, totalLessons);

            // 수업 목표 표시
            const goalsElement = Utils.$('#detailOverallGoals');
            if (goalsElement) {
                goalsElement.textContent = overallGoals || '목표가 설정되지 않았습니다.';
            }

            // 수업 일정표 표시 (개선된 방식)
            this.displayLessonSchedule(schedule);

            // 특별 고려사항 표시
            const specialNotesSection = Utils.$('#specialNotesSection');
            const specialNotesElement = Utils.$('#detailSpecialNotes');
            
            if (specialNotes && specialNotes.trim()) {
                if (specialNotesElement) specialNotesElement.textContent = specialNotes;
                if (specialNotesSection) specialNotesSection.style.display = 'block';
            } else {
                if (specialNotesSection) specialNotesSection.style.display = 'none';
            }

            // 승인/반려 버튼 표시 설정
            this.setupLessonPlanModalButtons(lessonPlan, studentId);

            // 모달 표시
            modal.classList.add('active');

            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            console.log('✅ 수업계획 상세보기 모달 표시 완료');

        } catch (error) {
            console.error('❌ Error showing lesson plan detail modal:', error);
            Utils.showToast('수업계획 상세보기 중 오류가 발생했습니다.', 'error');
        }
    },

    // 수업 데이터 파싱 (새로 추가 - 안전한 데이터 파싱)
    parseLessonData(lessonsRaw) {
        console.log('🔄 수업 데이터 파싱 시작:', lessonsRaw);
        
        // 기본값 설정
        const defaultData = {
            startDate: '',
            endDate: '',
            totalLessons: 0,
            overallGoals: '',
            specialNotes: '',
            schedule: []
        };

        try {
            let lessons = lessonsRaw;

            // 문자열인 경우 JSON 파싱 시도
            if (typeof lessons === 'string') {
                try {
                    lessons = JSON.parse(lessons);
                    console.log('📝 JSON 파싱 성공:', lessons);
                } catch (parseError) {
                    console.warn('⚠️ JSON 파싱 실패, 기본값 사용:', parseError);
                    return defaultData;
                }
            }

            // 객체가 아닌 경우 기본값 반환
            if (!lessons || typeof lessons !== 'object') {
                console.warn('⚠️ 유효하지 않은 수업 데이터, 기본값 사용');
                return defaultData;
            }

            // 안전한 데이터 추출
            const result = {
                startDate: lessons.startDate || lessons.start_date || '',
                endDate: lessons.endDate || lessons.end_date || '',
                totalLessons: this.extractTotalLessons(lessons),
                overallGoals: lessons.overallGoals || lessons.overall_goals || lessons.goals || '',
                specialNotes: lessons.specialNotes || lessons.special_notes || lessons.notes || '',
                schedule: this.extractSchedule(lessons)
            };

            console.log('✅ 수업 데이터 파싱 완료:', result);
            return result;

        } catch (error) {
            console.error('❌ 수업 데이터 파싱 오류:', error);
            return defaultData;
        }
    },

    // 총 수업 횟수 추출 (새로 추가)
    extractTotalLessons(lessons) {
        // 직접 지정된 값이 있는 경우
        if (lessons.totalLessons && typeof lessons.totalLessons === 'number') {
            return lessons.totalLessons;
        }
        if (lessons.total_lessons && typeof lessons.total_lessons === 'number') {
            return lessons.total_lessons;
        }

        // 스케줄 배열에서 계산
        const schedule = this.extractSchedule(lessons);
        if (Array.isArray(schedule) && schedule.length > 0) {
            return schedule.length;
        }

        // 기본값
        return 0;
    },

    // 수업 일정 추출 (새로 추가)
    extractSchedule(lessons) {
        try {
            // 다양한 경로에서 스케줄 데이터 찾기
            let schedule = null;

            if (lessons.schedule) {
                schedule = lessons.schedule;
            } else if (lessons.lesson_schedule) {
                schedule = lessons.lesson_schedule;
            } else if (lessons.lessons) {
                schedule = lessons.lessons;
            } else if (lessons.plan) {
                schedule = lessons.plan;
            }

            // 문자열인 경우 JSON 파싱 시도
            if (typeof schedule === 'string') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (parseError) {
                    console.warn('⚠️ 스케줄 JSON 파싱 실패:', parseError);
                    schedule = [];
                }
            }

            // 배열이 아닌 경우 빈 배열 반환
            if (!Array.isArray(schedule)) {
                console.warn('⚠️ 스케줄이 배열이 아님:', schedule);
                return [];
            }

            // 각 수업 데이터 정규화
            return schedule.map((lesson, index) => {
                if (typeof lesson === 'object' && lesson !== null) {
                    return {
                        date: lesson.date || lesson.lesson_date || `${index + 1}차시`,
                        topic: lesson.topic || lesson.title || lesson.subject || '주제 미설정',
                        content: lesson.content || lesson.description || lesson.detail || '내용 미설정'
                    };
                } else {
                    return {
                        date: `${index + 1}차시`,
                        topic: '주제 미설정',
                        content: '내용 미설정'
                    };
                }
            });

        } catch (error) {
            console.error('❌ 스케줄 추출 오류:', error);
            return [];
        }
    },

    // 세부 수업계획 보기 모달 숨김 (새로 추가)
    hideViewLessonPlanModal() {
        const modal = Utils.$('#viewLessonPlanModal');
        if (modal) {
            modal.classList.remove('active');
            this.currentViewingLessonPlan = null;
        }
    },

    // 예산 배정 정보 표시 (새로 추가)
    async displayBudgetAllocationInfo(field, totalLessons) {
        try {
            // 분야별 예산 설정 가져오기
            const budgetSettings = await SupabaseAPI.getAllFieldBudgetSettings();
            const fieldSetting = budgetSettings[field] || { perLessonAmount: 0, maxBudget: 0 };

            // 예산 계산
            const perLessonAmount = fieldSetting.perLessonAmount || 0;
            const maxBudget = fieldSetting.maxBudget || 0;
            const calculatedBudget = perLessonAmount * totalLessons;
            const finalBudget = maxBudget > 0 ? Math.min(calculatedBudget, maxBudget) : calculatedBudget;

            // 화면에 표시
            const detailField = Utils.$('#detailField');
            const detailPerLessonAmount = Utils.$('#detailPerLessonAmount');
            const detailLessonCount = Utils.$('#detailLessonCount');
            const detailTotalBudget = Utils.$('#detailTotalBudget');

            if (detailField) detailField.textContent = field || '미설정';
            if (detailPerLessonAmount) detailPerLessonAmount.textContent = Utils.formatPrice(perLessonAmount);
            if (detailLessonCount) detailLessonCount.textContent = `${totalLessons}회`;
            if (detailTotalBudget) detailTotalBudget.textContent = Utils.formatPrice(finalBudget);

            // 상한선 적용 여부 표시
            const calculationNote = Utils.$('#viewLessonPlanModal .budget-calculation-note small');
            if (calculationNote) {
                if (maxBudget > 0 && calculatedBudget > maxBudget) {
                    calculationNote.innerHTML = `
                        <i data-lucide="info"></i> 
                        계산된 예산: ${Utils.formatPrice(calculatedBudget)} → 
                        최대 상한 적용: ${Utils.formatPrice(finalBudget)}
                    `;
                } else {
                    calculationNote.innerHTML = `
                        <i data-lucide="info"></i> 
                        총 예산 = ${Utils.formatPrice(perLessonAmount)} × ${totalLessons}회 = ${Utils.formatPrice(finalBudget)}
                    `;
                }
            }

        } catch (error) {
            console.error('❌ Error displaying budget allocation info:', error);
            // 오류 시 기본값 표시
            const detailField = Utils.$('#detailField');
            const detailPerLessonAmount = Utils.$('#detailPerLessonAmount');
            const detailLessonCount = Utils.$('#detailLessonCount');
            const detailTotalBudget = Utils.$('#detailTotalBudget');

            if (detailField) detailField.textContent = field || '미설정';
            if (detailPerLessonAmount) detailPerLessonAmount.textContent = '0원';
            if (detailLessonCount) detailLessonCount.textContent = `${totalLessons}회`;
            if (detailTotalBudget) detailTotalBudget.textContent = '계산 중...';
        }
    },

    // 수업 일정표 표시 (수정됨 - 에러 핸들링 개선)
    displayLessonSchedule(schedule) {
        console.log('📅 수업 일정표 표시:', schedule);
        
        const container = Utils.$('#detailLessonSchedule');
        if (!container) {
            console.error('❌ 수업 일정표 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        // 스케줄이 없거나 빈 배열인 경우
        if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
            container.innerHTML = '<div class="empty-schedule-message">등록된 수업 일정이 없습니다.</div>';
            console.log('📝 빈 스케줄 메시지 표시');
            return;
        }

        try {
            // 테이블 생성
            const table = Utils.createElement('table', 'schedule-table');
            
            // 테이블 헤더
            const thead = Utils.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>차시</th>
                    <th>날짜</th>
                    <th>주제</th>
                    <th>내용</th>
                </tr>
            `;
            table.appendChild(thead);

            // 테이블 본문
            const tbody = Utils.createElement('tbody');
            
            schedule.forEach((lesson, index) => {
                const row = Utils.createElement('tr');
                
                // 안전한 데이터 추출
                const lessonNumber = index + 1;
                const date = lesson.date || '-';
                const topic = lesson.topic || '-';
                const content = lesson.content || '-';

                row.innerHTML = `
                    <td><strong>${lessonNumber}차시</strong></td>
                    <td class="lesson-date">${this.escapeHtml(date)}</td>
                    <td class="lesson-topic">${this.escapeHtml(topic)}</td>
                    <td class="lesson-content">${this.escapeHtml(content)}</td>
                `;
                
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            
            // 컨테이너에 테이블 추가
            container.innerHTML = '';
            container.appendChild(table);
            
            console.log(`✅ 수업 일정표 표시 완료: ${schedule.length}개 수업`);

        } catch (error) {
            console.error('❌ 수업 일정표 생성 오류:', error);
            container.innerHTML = '<div class="empty-schedule-message">수업 일정을 표시하는 중 오류가 발생했습니다.</div>';
        }
    },

    // 수업계획 모달 버튼 설정 (새로 추가)
    setupLessonPlanModalButtons(lessonPlan, studentId) {
        const approveBtn = Utils.$('#approveLessonPlanBtn');
        const rejectBtn = Utils.$('#rejectLessonPlanBtn');

        // 버튼에 학생 ID 설정
        if (approveBtn) approveBtn.dataset.studentId = studentId;
        if (rejectBtn) rejectBtn.dataset.studentId = studentId;

        // 승인 상태에 따라 버튼 표시/숨김
        if (lessonPlan.status === 'submitted' && lessonPlan.approval_status === 'pending') {
            // 대기 중인 경우 승인/반려 버튼 표시
            if (approveBtn) approveBtn.style.display = 'inline-flex';
            if (rejectBtn) rejectBtn.style.display = 'inline-flex';
        } else {
            // 그 외의 경우 버튼 숨김
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn) rejectBtn.style.display = 'none';
        }
    },

    // 예산 설정 모달 표시 (수정됨 - 분야별 예산 현황 보기 기능 추가)
    async showBudgetSettingsModal() {
        const modal = Utils.$('#budgetSettingsModal');
        
        // 모달이 없으면 오류 메시지 표시
        if (!modal) {
            Utils.showToast('예산 설정 모달을 찾을 수 없습니다.', 'error');
            return;
        }

        const settings = await SupabaseAPI.getAllFieldBudgetSettings();
        
        // 현재 설정값으로 폼 채우기
        const tbody = modal.querySelector('#budgetSettingsTable tbody');
        if (!tbody) {
            Utils.showToast('예산 설정 테이블을 찾을 수 없습니다.', 'error');
            return;
        }
        
        tbody.innerHTML = '';
        
        Object.entries(settings).forEach(([field, setting]) => {
            const row = Utils.createElement('tr');
            row.innerHTML = `
                <td>
                    ${field}
                    <button class="btn small secondary field-status-btn" 
                            data-field="${field}" 
                            title="분야별 예산 현황 보기"
                            style="margin-left: 8px;">
                        <i data-lucide="eye"></i>
                    </button>
                </td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="perLessonAmount" 
                           value="${setting.perLessonAmount}" 
                           min="0" step="1000" class="amount-input">
                </td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="maxBudget" 
                           value="${setting.maxBudget}" 
                           min="0" step="10000" class="amount-input">
                </td>
            `;
            tbody.appendChild(row);
        });

        // 분야별 예산 현황 보기 버튼 이벤트 리스너 추가
        const fieldStatusButtons = modal.querySelectorAll('.field-status-btn');
        fieldStatusButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const field = e.target.closest('button').dataset.field;
                this.showFieldBudgetStatus(field);
            });
        });
        
        modal.classList.add('active');
        
        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // 예산 설정 모달 숨김 (수정됨)
    hideBudgetSettingsModal() {
        const modal = Utils.$('#budgetSettingsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 예산 설정 저장 - 예산 재계산 기능 추가
    async handleBudgetSettingsSubmit() {
        const form = Utils.$('#budgetSettingsForm');
        const inputs = form.querySelectorAll('.amount-input');
        const updates = {};
        
        inputs.forEach(input => {
            const field = input.dataset.field;
            const type = input.dataset.type;
            const value = parseInt(input.value) || 0;
            
            if (!updates[field]) {
                updates[field] = {};
            }
            updates[field][type] = value;
        });
        
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn);
        
        try {
            let successCount = 0;
            let recalculationResults = [];
            
            // 예산 재계산 확인 메시지
            const shouldRecalculate = Utils.showConfirm(
                '예산 설정을 업데이트하시겠습니까?\\n\\n✅ 기존에 승인받은 학생들의 예산도 새로운 설정에 맞춰 자동으로 재계산됩니다.\\n⚠️ 이미 사용한 예산이 새 배정 예산을 초과하는 경우 적절히 조정됩니다.'
            );
            
            if (!shouldRecalculate) {
                Utils.hideLoading(submitBtn);
                return;
            }
            
            for (const [field, settings] of Object.entries(updates)) {
                // 예산 설정 업데이트 (재계산 기능 포함)
                const result = await SupabaseAPI.updateFieldBudgetSettings(field, settings);
                if (result.success) {
                    successCount++;
                    
                    // 재계산 결과 수집
                    if (result.data && result.data.recalculation) {
                        recalculationResults.push({
                            field: field,
                            updated: result.data.recalculation.updated,
                            total: result.data.recalculation.total
                        });
                    }
                }
            }
            
            Utils.hideLoading(submitBtn);
            this.hideBudgetSettingsModal();
            
            if (successCount > 0) {
                let message = `${successCount}개 분야의 예산 설정이 저장되었습니다.`;
                
                // 재계산 결과 메시지 추가
                if (recalculationResults.length > 0) {
                    const totalRecalculated = recalculationResults.reduce((sum, result) => sum + result.updated, 0);
                    message += `\\n\\n📊 ${totalRecalculated}명의 학생 예산이 자동으로 재계산되었습니다:`;
                    recalculationResults.forEach(result => {
                        message += `\\n• ${result.field}: ${result.updated}/${result.total}명`;
                    });
                }
                
                Utils.showToast(message, 'success');
                await this.loadBudgetOverview();
            } else {
                Utils.showToast('예산 설정 저장 중 오류가 발생했습니다.', 'error');
            }
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showToast('예산 설정 저장 중 오류가 발생했습니다.', 'error');
            console.error('Budget settings error:', error);
        }
    },

    // 새로 추가: 분야별 예산 현황 보기 기능
    async showFieldBudgetStatus(field) {
        try {
            const statusResult = await SupabaseAPI.getFieldBudgetStatus(field);
            
            if (!statusResult.success || !statusResult.data) {
                Utils.showToast('예산 현황을 불러올 수 없습니다.', 'error');
                return;
            }
            
            const { students, statistics } = statusResult.data;
            
            if (!students || students.length === 0) {
                Utils.showToast(`${field} 분야에 승인받은 학생이 없습니다.`, 'info');
                return;
            }
            
            // 모달 창 생성
            const modal = document.createElement('div');
            modal.className = 'modal budget-status-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${field} 분야 예산 현황</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="budget-statistics">
                            <div class="stat-card">
                                <h4>총 학생 수</h4>
                                <span class="stat-value">${statistics.totalStudents}명</span>
                            </div>
                            <div class="stat-card">
                                <h4>총 배정 예산</h4>
                                <span class="stat-value">${Utils.formatPrice(statistics.totalAllocated)}</span>
                            </div>
                            <div class="stat-card">
                                <h4>총 사용 예산</h4>
                                <span class="stat-value">${Utils.formatPrice(statistics.totalUsed)}</span>
                            </div>
                            <div class="stat-card">
                                <h4>예산 사용률</h4>
                                <span class="stat-value">${statistics.utilizationRate}%</span>
                            </div>
                        </div>
                        
                        <div class="student-budget-list">
                            <h4>학생별 예산 현황</h4>
                            <table class="budget-table">
                                <thead>
                                    <tr>
                                        <th>학생명</th>
                                        <th>세종학당</th>
                                        <th>배정 예산</th>
                                        <th>사용 예산</th>
                                        <th>잔여 예산</th>
                                        <th>사용률</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${students.map(student => {
                                        const usageRate = student.allocated_budget > 0 ? 
                                            Math.round((student.used_budget / student.allocated_budget) * 100) : 0;
                                        const remaining = student.allocated_budget - student.used_budget;
                                        
                                        return `
                                            <tr>
                                                <td>${this.escapeHtml(student.user_profiles.name)}</td>
                                                <td>${this.escapeHtml(student.user_profiles.sejong_institute)}</td>
                                                <td>${Utils.formatPrice(student.allocated_budget)}</td>
                                                <td>${Utils.formatPrice(student.used_budget)}</td>
                                                <td class="${remaining < 0 ? 'over-budget' : ''}">${Utils.formatPrice(remaining)}</td>
                                                <td class="usage-rate">${usageRate}%</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.classList.add('active');
            
        } catch (error) {
            console.error('Field budget status error:', error);
            Utils.showToast('예산 현황 조회 중 오류가 발생했습니다.', 'error');
        }
    },

    // 수업계획 관리 모달 표시 (수정됨)
    async showLessonPlanManagementModal() {
        const modal = Utils.$('#lessonPlanManagementModal');
        
        // 모달이 없으면 오류 메시지 표시
        if (!modal) {
            Utils.showToast('수업계획 관리 모달을 찾을 수 없습니다.', 'error');
            return;
        }

        await this.loadLessonPlansForManagement();
        modal.classList.add('active');

        // 새로고침 버튼 이벤트 리스너 설정
        const refreshBtn = Utils.$('#refreshPlansBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadLessonPlansForManagement());
        }
    },

    // 수업계획 관리 모달 숨김 (수정됨)
    hideLessonPlanManagementModal() {
        const modal = Utils.$('#lessonPlanManagementModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 수업계획 목록 로드 (관리용) - 완전히 안전한 방식으로 재작성
    async loadLessonPlansForManagement() {
        try {
            console.log('🔄 수업계획 관리 데이터 로드 시작...');
            
            // 안전한 데이터 로드
            const allPlans = await this.safeLoadAllLessonPlans();
            
            console.log('📋 로드된 수업계획:', allPlans.length, '건');
            
            // 통계 계산 (안전한 방식)
            const stats = this.calculateLessonPlanStats(allPlans);
            
            // 통계 업데이트
            this.updateLessonPlanStats(stats);
            
            // 수업계획 목록 생성
            const container = Utils.$('#lessonPlansList');
            if (!container) {
                console.error('❌ Lesson plans list container not found');
                Utils.showToast('수업계획 목록 컨테이너를 찾을 수 없습니다.', 'error');
                return;
            }
            
            container.innerHTML = '';
            
            if (allPlans.length === 0) {
                container.innerHTML = '<div class="no-plans">제출된 수업계획이 없습니다.</div>';
                return;
            }
            
            // 수업계획 카드 생성
            allPlans.forEach(plan => {
                try {
                    const planCard = this.createLessonPlanCard(plan);
                    container.appendChild(planCard);
                } catch (error) {
                    console.error('❌ 수업계획 카드 생성 오류:', error);
                    // 개별 카드 오류는 전체를 중단시키지 않음
                }
            });
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 이벤트 리스너 재설정
            this.setupLessonPlanActionListeners();
            
            console.log('✅ 수업계획 관리 데이터 로드 완료');
            
        } catch (error) {
            console.error('❌ Error loading lesson plans for management:', error);
            Utils.showToast('수업계획 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
            
            // 오류 시 빈 상태 표시
            const container = Utils.$('#lessonPlansList');
            if (container) {
                container.innerHTML = '<div class="error-state">데이터를 불러올 수 없습니다. 새로고침을 시도해보세요.</div>';
            }
        }
    },

    // 안전한 수업계획 데이터 로드 (개선된 버전)
    async safeLoadAllLessonPlans() {
        try {
            // SupabaseAPI의 getAllLessonPlans 호출
            const allPlans = await SupabaseAPI.getAllLessonPlans();
            
            if (!Array.isArray(allPlans)) {
                console.warn('⚠️ getAllLessonPlans returned non-array:', allPlans);
                return [];
            }
            
            // 각 수업계획에 대해 안전한 데이터 확인
            const safePlans = allPlans.map(plan => {
                return {
                    ...plan,
                    // 사용자 프로필 안전성 확보
                    user_profiles: plan.user_profiles || {
                        id: plan.user_id || 'unknown',
                        name: '사용자 정보 없음',
                        field: '미설정',
                        sejong_institute: '미설정'
                    },
                    // 수업 데이터 안전성 확보
                    lessons: plan.lessons || {
                        totalLessons: 0,
                        startDate: '',
                        endDate: '',
                        overallGoals: '목표가 설정되지 않았습니다.'
                    },
                    // 상태 데이터 안전성 확보
                    status: plan.status || 'draft',
                    approval_status: plan.approval_status || 'pending'
                };
            });
            
            return safePlans;
            
        } catch (error) {
            console.error('❌ 수업계획 데이터 로드 실패:', error);
            
            // 네트워크 오류인지 확인
            if (error.message?.includes('fetch') || error.message?.includes('network')) {
                throw new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
            }
            
            // 데이터베이스 오류인지 확인
            if (error.message?.includes('relationship') || error.message?.includes('embed')) {
                console.warn('⚠️ 관계 쿼리 오류 발생, 대체 방식으로 재시도...');
                return await this.fallbackLoadLessonPlans();
            }
            
            throw error;
        }
    },

    // 대체 수업계획 로드 방식 (관계 문제 시)
    async fallbackLoadLessonPlans() {
        try {
            console.log('🔄 대체 방식으로 수업계획 로드 중...');
            
            // 기본 수업계획 데이터만 로드
            const basicPlans = await SupabaseAPI.safeApiCall('기본 수업계획 조회', async () => {
                const client = await SupabaseAPI.ensureClient();
                return await client
                    .from('lesson_plans')
                    .select('*')
                    .order('created_at', { ascending: false });
            });
            
            if (!basicPlans.success) {
                throw new Error(basicPlans.message || '수업계획 데이터를 가져올 수 없습니다.');
            }
            
            const plans = basicPlans.data || [];
            
            // 사용자 정보를 별도로 가져와서 병합
            const userIds = [...new Set(plans.map(p => p.user_id).filter(id => id))];
            let userProfiles = {};
            
            if (userIds.length > 0) {
                const profileResult = await SupabaseAPI.safeApiCall('사용자 프로필 조회', async () => {
                    const client = await SupabaseAPI.ensureClient();
                    return await client
                        .from('user_profiles')
                        .select('id, name, field, sejong_institute')
                        .in('id', userIds);
                });
                
                if (profileResult.success && profileResult.data) {
                    profileResult.data.forEach(profile => {
                        userProfiles[profile.id] = profile;
                    });
                }
            }
            
            // 데이터 병합
            return plans.map(plan => ({
                ...plan,
                user_profiles: userProfiles[plan.user_id] || {
                    id: plan.user_id || 'unknown',
                    name: '사용자 정보 없음',
                    field: '미설정',
                    sejong_institute: '미설정'
                },
                approval_status: this.calculateApprovalStatus(plan)
            }));
            
        } catch (error) {
            console.error('❌ 대체 방식 로드도 실패:', error);
            throw new Error('수업계획 데이터를 불러올 수 없습니다. 관리자에게 문의해주세요.');
        }
    },

    // 승인 상태 계산 (안전한 방식)
    calculateApprovalStatus(plan) {
        if (!plan) return 'pending';
        
        if (plan.approved_at && plan.approved_by) {
            return 'approved';
        } else if (plan.rejection_reason && plan.rejection_reason.trim() !== '') {
            return 'rejected';
        } else if (plan.status === 'submitted') {
            return 'pending';
        } else {
            return 'draft';
        }
    },

    // 수업계획 통계 계산
    calculateLessonPlanStats(plans) {
        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0
        };
        
        plans.forEach(plan => {
            const status = plan.approval_status || 'pending';
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        });
        
        return stats;
    },

    // 수업계획 통계 업데이트
    updateLessonPlanStats(stats) {
        const pendingElement = Utils.$('#pendingPlansCount');
        const approvedElement = Utils.$('#approvedPlansCount');
        const rejectedElement = Utils.$('#rejectedPlansCount');
        
        if (pendingElement) pendingElement.textContent = `대기 중: ${stats.pending}`;
        if (approvedElement) approvedElement.textContent = `승인됨: ${stats.approved}`;
        if (rejectedElement) rejectedElement.textContent = `반려됨: ${stats.rejected}`;
    },

    // 수업계획 카드 생성 (수정됨 - 승인 상태 표시 버그 수정)
    createLessonPlanCard(plan) {
        const card = Utils.createElement('div', 'lesson-plan-card');
        
        // 제출완료 조건: 'submitted' 또는 'approved' 상태
        const isSubmitted = plan.status === 'submitted' || plan.status === 'approved';
        const statusText = isSubmitted ? '제출완료' : '임시저장';
        const statusClass = isSubmitted ? 'completed' : 'draft';
        
        let approvalStatusText = '대기 중';
        let approvalStatusClass = 'pending';
        
        if (plan.approval_status === 'approved') {
            approvalStatusText = '승인됨';
            approvalStatusClass = 'approved';
        } else if (plan.approval_status === 'rejected') {
            approvalStatusText = '반려됨';
            approvalStatusClass = 'rejected';
        }
        
        // 수업 데이터에서 총 수업 횟수 계산 (안전한 방식)
        const lessonData = this.parseLessonData(plan.lessons);
        const { totalLessons, startDate, endDate, overallGoals, specialNotes } = lessonData;
        
        // 사용자 정보 (안전한 방식)
        const userProfile = plan.user_profiles || {};
        const userName = userProfile.name || '알 수 없음';
        const userInstitute = userProfile.sejong_institute || '';
        const userField = userProfile.field || '';
        
        card.innerHTML = `
            <div class="plan-card-header">
                <div class="plan-student-info">
                    <h4>${this.escapeHtml(userName)}</h4>
                    <p>${this.escapeHtml(userInstitute)} • ${this.escapeHtml(userField)}</p>
                    <div class="plan-meta">
                        <span>수업 횟수: ${totalLessons}회</span>
                        <span>기간: ${this.escapeHtml(startDate)} ~ ${this.escapeHtml(endDate)}</span>
                    </div>
                </div>
                <div class="plan-status-info">
                    <span class="plan-status ${statusClass}">${statusText}</span>
                    <span class="approval-status ${approvalStatusClass}">${approvalStatusText}</span>
                </div>
            </div>
            
            <div class="plan-card-content">
                <div class="plan-goals">
                    <strong>수업 목표:</strong>
                    <p>${this.escapeHtml(overallGoals)}</p>
                </div>
                ${specialNotes ? `
                    <div class="plan-notes">
                        <strong>특별 고려사항:</strong>
                        <p>${this.escapeHtml(specialNotes)}</p>
                    </div>
                ` : ''}
            </div>
            
            ${plan.rejection_reason ? `
                <div class="plan-rejection-reason">
                    <strong>반려 사유:</strong>
                    <p>${this.escapeHtml(plan.rejection_reason)}</p>
                </div>
            ` : ''}
            
            <div class="plan-card-actions">
                ${this.createLessonPlanActionButtons(plan)}
            </div>
        `;
        
        return card;
    },

    // 수업계획 액션 버튼 생성 (수정됨 - 승인 상태 표시 버그 수정)
    createLessonPlanActionButtons(plan) {
        const baseButtons = `
            <button class="btn small secondary view-lesson-plan-btn" 
                    data-action="view-detail" 
                    data-student-id="${plan.user_id}"
                    title="상세 수업계획 보기">
                <i data-lucide="eye"></i> 상세보기
            </button>
        `;

        // 제출되지 않은 경우 (draft 상태)
        if (plan.status === 'draft') {
            return baseButtons + '<span class="plan-action-note">수업계획이 제출되지 않았습니다.</span>';
        }
        
        if (plan.approval_status === 'approved') {
            return baseButtons + `
                <span class="plan-approved-info">
                    승인일: ${plan.approved_at ? new Date(plan.approved_at).toLocaleDateString('ko-KR') : '-'}
                </span>
            `;
        }
        
        if (plan.approval_status === 'rejected') {
            return baseButtons + `
                <div class="plan-rejected-actions">
                    <span class="plan-rejected-info">
                        반려일: ${plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('ko-KR') : '-'}
                    </span>
                    <button class="btn small approve" data-action="approve" data-student-id="${plan.user_id}">
                        재승인
                    </button>
                </div>
            `;
        }
        
        // 대기 중인 경우 (submitted 상태이면서 아직 승인/반려 안됨)
        return baseButtons + `
            <button class="btn small approve" data-action="approve" data-student-id="${plan.user_id}">
                <i data-lucide="check"></i> 승인
            </button>
            <button class="btn small reject" data-action="reject" data-student-id="${plan.user_id}">
                <i data-lucide="x"></i> 반려
            </button>
        `;
    },

    // 수업계획 액션 이벤트 리스너 설정 (수정됨 - 상세보기 버튼 포함)
    setupLessonPlanActionListeners() {
        const actionButtons = Utils.$$('#lessonPlansList button[data-action]');
        
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                const studentId = e.target.closest('button').dataset.studentId;
                
                this.handleLessonPlanAction(action, studentId, e.target);
            });
        });
    },

    // 수업계획 액션 처리 (수정됨 - 상세보기 액션 추가)
    async handleLessonPlanAction(action, studentId, buttonElement) {
        switch(action) {
            case 'view-detail':
                await this.viewLessonPlanDetail(studentId);
                break;
            case 'approve':
                this.approveLessonPlan(studentId, buttonElement);
                break;
            case 'reject':
                this.rejectLessonPlan(studentId, buttonElement);
                break;
        }
    },

    // 수업계획 상세보기 (수정됨 - 데이터 찾기 개선)
    async viewLessonPlanDetail(studentId) {
        try {
            console.log('👁️ 수업계획 상세보기 요청:', studentId);
            
            // 현재 로드된 수업계획에서 해당 학생의 계획 찾기
            const allPlans = await this.safeLoadAllLessonPlans();
            const lessonPlan = allPlans.find(plan => plan.user_id === studentId);
            
            if (!lessonPlan) {
                console.error('❌ 수업계획을 찾을 수 없음:', studentId);
                Utils.showToast('수업계획을 찾을 수 없습니다.', 'error');
                return;
            }
            
            console.log('📋 찾은 수업계획:', lessonPlan);
            
            // 세부 수업계획 모달 표시
            await this.showViewLessonPlanModal(studentId, lessonPlan);
            
        } catch (error) {
            console.error('❌ Error viewing lesson plan detail:', error);
            Utils.showToast('수업계획 상세보기 중 오류가 발생했습니다.', 'error');
        }
    },

    // 수업계획 승인
    async approveLessonPlan(studentId, buttonElement) {
        if (Utils.showConfirm('이 수업계획을 승인하시겠습니까? 승인 시 자동으로 예산이 배정됩니다.')) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.approveLessonPlan(studentId);
                
                if (result.success) {
                    await this.loadLessonPlansForManagement();
                    await this.loadBudgetOverview();
                    
                    // 세부 수업계획 모달이 열려있으면 닫기
                    this.hideViewLessonPlanModal();
                    
                    let message = '수업계획이 승인되었습니다.';
                    if (result.data?.budgetInfo) {
                        message += `\\n배정된 예산: ${Utils.formatPrice(result.data.budgetInfo.allocated)}`;
                    }
                    Utils.showToast(message, 'success');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showToast(result.message || '승인 처리 중 오류가 발생했습니다.', 'error');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showToast('승인 처리 중 오류가 발생했습니다.', 'error');
                console.error('Approve lesson plan error:', error);
            }
        }
    },

    // 수업계획 반려
    async rejectLessonPlan(studentId, buttonElement) {
        const reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
        
        if (reason && reason.trim()) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.rejectLessonPlan(studentId, reason.trim());
                
                if (result.success) {
                    await this.loadLessonPlansForManagement();
                    await this.loadBudgetOverview();
                    
                    // 세부 수업계획 모달이 열려있으면 닫기
                    this.hideViewLessonPlanModal();
                    
                    Utils.showToast('수업계획이 반려되었습니다.', 'success');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showToast(result.message || '반려 처리 중 오류가 발생했습니다.', 'error');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showToast('반려 처리 중 오류가 발생했습니다.', 'error');
                console.error('Reject lesson plan error:', error);
            }
        }
    },

    // 영수증 보기 모달 표시
    async showViewReceiptModal(requestId) {
        try {
            const receipt = await SupabaseAPI.getReceiptByRequestId(requestId);
            if (!receipt) {
                Utils.showToast('영수증을 찾을 수 없습니다.', 'error');
                return;
            }

            const modal = Utils.$('#viewReceiptModal');

            // 영수증 정보 표시
            Utils.$('#viewReceiptItemName').textContent = receipt.item_name || '-';
            Utils.$('#viewReceiptStudentName').textContent = receipt.student_name || '-';
            Utils.$('#viewReceiptItemPrice').textContent = Utils.formatPrice(receipt.total_amount || 0);
            Utils.$('#viewReceiptPurchaseDate').textContent = receipt.purchase_date ? 
                new Date(receipt.purchase_date).toLocaleString('ko-KR') : '-';
            Utils.$('#viewReceiptStore').textContent = receipt.store_name || '-';
            Utils.$('#viewReceiptNote').textContent = receipt.notes || '-';
            Utils.$('#viewReceiptSubmittedDate').textContent = receipt.created_at ? 
                new Date(receipt.created_at).toLocaleString('ko-KR') : '-';
            
            // 이미지 표시
            const receiptImage = Utils.$('#viewReceiptImage');
            receiptImage.src = receipt.image_path || '';

            // 현재 보고 있는 영수증 정보 저장 (다운로드용)
            this.currentViewingReceipt = {
                image: receipt.image_path,
                fileName: `receipt_${receipt.receipt_number}.jpg`
            };

            modal.classList.add('active');
        } catch (error) {
            console.error('Error showing receipt modal:', error);
            Utils.showToast('영수증을 불러오는 중 오류가 발생했습니다.', 'error');
        }
    },

    // 영수증 보기 모달 숨김
    hideViewReceiptModal() {
        const modal = Utils.$('#viewReceiptModal');
        if (modal) {
            modal.classList.remove('active');
            this.currentViewingReceipt = null;
        }
    },

    // 영수증 이미지 다운로드
    downloadReceiptImage() {
        if (!this.currentViewingReceipt) return;

        try {
            const link = document.createElement('a');
            link.href = this.currentViewingReceipt.image;
            link.download = this.currentViewingReceipt.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Utils.showToast('영수증 이미지가 다운로드되었습니다.', 'success');
        } catch (error) {
            Utils.showToast('이미지 다운로드 중 오류가 발생했습니다.', 'error');
            console.error('Download error:', error);
        }
    },

    // 수업계획 설정 모달 표시
    async showLessonPlanSettingsModal() {
        const modal = Utils.$('#lessonPlanSettingsModal');
        const settings = await SupabaseAPI.getSystemSettings();
        
        // 현재 설정값으로 폼 채우기
        Utils.$('#planEditDeadline').value = settings.lesson_plan_deadline || '2026-12-31';
        Utils.$('#planEditTime').value = '23:59';
        Utils.$('#planEditNotice').value = settings.notice_message || '';
        
        // 테스트 모드 체크박스 설정
        const testModeCheckbox = Utils.$('#testModeEnabled');
        if (testModeCheckbox) {
            testModeCheckbox.checked = settings.test_mode || false;
        }
        
        // 마감일 무시 체크박스 설정
        const overrideCheckbox = Utils.$('#allowOverrideDeadline');
        if (overrideCheckbox) {
            overrideCheckbox.checked = settings.ignore_deadline || false;
        }
        
        modal.classList.add('active');
        
        setTimeout(() => {
            const deadlineInput = Utils.$('#planEditDeadline');
            if (deadlineInput) {
                deadlineInput.focus();
            }
        }, 100);
    },

    // 수업계획 설정 모달 숨김
    hideLessonPlanSettingsModal() {
        const modal = Utils.$('#lessonPlanSettingsModal');
        if (modal) {
            modal.classList.remove('active');
            Utils.resetForm('#lessonPlanSettingsForm');
        }
    },

    // 수업계획 설정 저장
    async handleLessonPlanSettingsSubmit() {
        const deadline = Utils.$('#planEditDeadline').value;
        const time = Utils.$('#planEditTime').value;
        const notice = Utils.$('#planEditNotice').value.trim();
        const testMode = Utils.$('#testModeEnabled') ? Utils.$('#testModeEnabled').checked : false;
        const allowOverrideDeadline = Utils.$('#allowOverrideDeadline') ? Utils.$('#allowOverrideDeadline').checked : false;

        // 입력 검증 (테스트 모드가 아닌 경우)
        if (!testMode && !allowOverrideDeadline && !Utils.validateRequired(deadline, '수업계획 수정 마감일')) return;

        // 마감일이 과거인지 확인 (테스트 모드가 아닌 경우)
        if (!testMode && !allowOverrideDeadline && deadline) {
            const deadlineDate = new Date(`${deadline} ${time}`);
            const now = new Date();
            
            if (deadlineDate < now) {
                if (!Utils.showConfirm('마감일이 현재 시간보다 과거입니다. 이 경우 학생들이 수업계획을 수정할 수 없게 됩니다. 계속하시겠습니까?')) {
                    return;
                }
            }
        }

        const submitBtn = Utils.$('#lessonPlanSettingsForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        try {
            // 각 설정을 개별적으로 업데이트
            await SupabaseAPI.updateSystemSetting('lesson_plan_deadline', deadline || '2026-12-31');
            await SupabaseAPI.updateSystemSetting('test_mode', testMode);
            await SupabaseAPI.updateSystemSetting('ignore_deadline', allowOverrideDeadline);
            await SupabaseAPI.updateSystemSetting('notice_message', notice || '수업계획을 자유롭게 작성하세요.');

            Utils.hideLoading(submitBtn);
            this.hideLessonPlanSettingsModal();
            
            let statusText = '수정 불가능';
            if (testMode) {
                statusText = '테스트 모드 (항상 수정 가능)';
            } else if (allowOverrideDeadline) {
                statusText = '마감일 무시 모드 (항상 수정 가능)';
            } else {
                const canEdit = await SupabaseAPI.canEditLessonPlan();
                statusText = canEdit ? '수정 가능' : '수정 불가능';
            }
            
            Utils.showToast(`수업계획 설정이 저장되었습니다.\\n현재 상태: ${statusText}`, 'success');
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showToast('설정 저장 중 오류가 발생했습니다.', 'error');
            console.error('Lesson plan settings error:', error);
        }
    },

    // 테스트 모드 빠른 토글 (개발자용)
    async quickToggleTestMode() {
        try {
            const newMode = await SupabaseAPI.toggleTestMode();
            const statusText = newMode ? '테스트 모드 활성화 (항상 편집 가능)' : '테스트 모드 비활성화';
            Utils.showToast(statusText, 'success');
            return newMode;
        } catch (error) {
            console.error('Error toggling test mode:', error);
            Utils.showToast('테스트 모드 변경 중 오류가 발생했습니다.', 'error');
            return false;
        }
    },

    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (SupabaseAPI.currentUserType !== 'admin') return;

            // Ctrl/Cmd + F: 검색 포커스
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                const searchInput = Utils.$('#searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // F5: 새로고침
            if (event.key === 'F5') {
                event.preventDefault();
                this.refreshData();
            }

            // Ctrl/Cmd + E: Export
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                this.handleExport();
            }

            // Ctrl/Cmd + T: 테스트 모드 토글 (숨겨진 기능)
            if ((event.ctrlKey || event.metaKey) && event.key === 't') {
                event.preventDefault();
                this.quickToggleTestMode();
            }

            // Ctrl/Cmd + B: 예산 설정 모달
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                this.showBudgetSettingsModal();
            }

            // Ctrl/Cmd + L: 수업계획 관리 모달
            if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
                event.preventDefault();
                this.showLessonPlanManagementModal();
            }
        });
    },

    // 통계 로드 - 수정된 버전 (구매 요청 신청자수/전체 학생 수 형태로 표시)
    async loadStatistics() {
        try {
            const stats = await SupabaseAPI.getStats();
            
            const applicantCountEl = Utils.$('#applicantCount');
            const pendingCountEl = Utils.$('#pendingCount');
            const approvedCountEl = Utils.$('#approvedCount');
            
            // 구매 요청 신청자수를 [신청자수] / [전체 학생 수] 형태로 표시
            if (applicantCountEl) {
                applicantCountEl.textContent = `${stats.applicantCount} / ${stats.totalStudents}`;
            }
            if (pendingCountEl) pendingCountEl.textContent = stats.pendingCount;
            if (approvedCountEl) approvedCountEl.textContent = stats.approvedCount;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    },

    // 예산 현황 로드
    async loadBudgetOverview() {
        try {
            const budgetStats = await SupabaseAPI.getBudgetOverviewStats();
            
            const totalApprovedBudgetEl = Utils.$('#totalApprovedBudget');
            const approvedItemsTotalEl = Utils.$('#approvedItemsTotal');
            const purchasedTotalEl = Utils.$('#purchasedTotal');
            const averagePerPersonEl = Utils.$('#averagePerPerson');
            
            if (totalApprovedBudgetEl) totalApprovedBudgetEl.textContent = Utils.formatPrice(budgetStats.totalApprovedBudget);
            if (approvedItemsTotalEl) approvedItemsTotalEl.textContent = Utils.formatPrice(budgetStats.approvedItemsTotal);
            if (purchasedTotalEl) purchasedTotalEl.textContent = Utils.formatPrice(budgetStats.purchasedTotal);
            if (averagePerPersonEl) averagePerPersonEl.textContent = Utils.formatPrice(budgetStats.averagePerPerson);
        } catch (error) {
            console.error('Error loading budget overview:', error);
        }
    },

    // 수업계획 관리 정보 로드
    async loadLessonPlanManagement() {
        try {
            const pendingPlans = await SupabaseAPI.getPendingLessonPlans();
            
            // 수업계획 관리 버튼에 대기 중인 수업계획 개수 표시
            const btn = Utils.$('#lessonPlanManagementBtn');
            if (btn && pendingPlans.length > 0) {
                btn.innerHTML = `
                    <i data-lucide="clipboard-check"></i>
                    수업계획 관리 <span class="notification-badge">${pendingPlans.length}</span>
                `;
            }
        } catch (error) {
            console.error('Error loading lesson plan management:', error);
        }
    },

    // 예산 설정 로드
    loadBudgetSettings() {
        // 예산 설정 버튼이 없으면 생성
        const header = Utils.$('.header-content .header-actions');
        if (header && !Utils.$('#budgetSettingsBtn')) {
            const budgetBtn = Utils.createElement('button', 'btn secondary');
            budgetBtn.id = 'budgetSettingsBtn';
            budgetBtn.innerHTML = `
                <i data-lucide="dollar-sign"></i>
                예산 설정
            `;
            
            // 수업계획 설정 버튼 다음에 삽입
            const lessonPlanBtn = Utils.$('#lessonPlanSettingsBtn');
            if (lessonPlanBtn) {
                lessonPlanBtn.insertAdjacentElement('afterend', budgetBtn);
            } else {
                header.insertBefore(budgetBtn, header.firstChild);
            }
            
            // 이벤트 리스너 추가
            budgetBtn.addEventListener('click', () => this.showBudgetSettingsModal());
        }

        // 수업계획 관리 버튼도 없으면 생성
        if (header && !Utils.$('#lessonPlanManagementBtn')) {
            const managementBtn = Utils.createElement('button', 'btn secondary');
            managementBtn.id = 'lessonPlanManagementBtn';
            managementBtn.innerHTML = `
                <i data-lucide="clipboard-check"></i>
                수업계획 관리
            `;
            
            // 예산 설정 버튼 다음에 삽입
            const budgetBtn = Utils.$('#budgetSettingsBtn');
            if (budgetBtn) {
                budgetBtn.insertAdjacentElement('afterend', managementBtn);
            } else {
                header.insertBefore(managementBtn, header.firstChild);
            }
            
            // 이벤트 리스너 추가
            managementBtn.addEventListener('click', () => this.showLessonPlanManagementModal());
        }

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // 신청 내역 로드
    async loadApplications() {
        try {
            const applications = await SupabaseAPI.searchApplications(this.currentSearchTerm);
            this.renderApplications(applications);
        } catch (error) {
            console.error('Error loading applications:', error);
            Utils.showToast('신청 내역을 불러오는 중 오류가 발생했습니다.', 'error');
        }
    },

    // 신청 내역 렌더링
    renderApplications(applications) {
        const container = Utils.$('#adminApplications');
        
        if (!applications || applications.length === 0) {
            container.innerHTML = this.createNoResultsHTML();
            return;
        }

        container.innerHTML = '';
        
        applications.forEach(application => {
            const applicationCard = this.createApplicationCard(application);
            container.appendChild(applicationCard);
        });

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 이벤트 리스너 재설정
        this.setupItemActionListeners();
    },

    // 신청 카드 생성
    createApplicationCard(application) {
        const card = Utils.createElement('div', 'admin-application-card');
        
        const submittedDate = Utils.formatDate(application.created_at);
        
        card.innerHTML = `
            <div class="admin-application-header">
                <div class="student-info">
                    <div>
                        <h3>${this.escapeHtml(application.user_profiles.name)}</h3>
                        <p class="submission-date">신청일: ${submittedDate}</p>
                        <p class="institute-info">${application.user_profiles.sejong_institute} • ${application.user_profiles.field}</p>
                    </div>
                    <span class="item-count">총 1개 항목</span>
                </div>
            </div>
            
            <div class="admin-application-body">
                ${this.createItemCardHTML(application)}
            </div>
        `;
        
        return card;
    },

    // 아이템 카드 HTML 생성
    createItemCardHTML(application) {
        const statusClass = SupabaseAPI.getStatusClass(application.status);
        const statusText = SupabaseAPI.getStatusText(application.status);
        const purchaseMethodText = SupabaseAPI.getPurchaseMethodText(application.purchase_type);
        const purchaseMethodClass = SupabaseAPI.getPurchaseMethodClass(application.purchase_type);
        
        // 영수증 관련 표시
        let receiptInfo = '';
        if (application.purchase_type === 'offline') {
            if (application.status === 'purchased') {
                receiptInfo = `
                    <div class="receipt-info submitted">
                        <div class="receipt-info-header">
                            <span class="receipt-status submitted">
                                ${Utils.createIcon('check-circle')} 영수증 제출완료
                            </span>
                            <button class="btn small secondary view-receipt-btn" 
                                    data-request-id="${application.id}">
                                ${Utils.createIcon('eye')} 영수증 보기
                            </button>
                        </div>
                        <div class="receipt-details-summary">
                            <small>제출일: ${new Date(application.updated_at).toLocaleString('ko-KR')}</small>
                        </div>
                    </div>
                `;
            } else if (application.status === 'approved') {
                receiptInfo = `
                    <div class="receipt-info pending">
                        <span class="receipt-pending">
                            ${Utils.createIcon('clock')} 영수증 제출 대기 중
                        </span>
                        <small class="receipt-help-text">학생이 영수증을 제출하면 자동으로 구매완료 처리됩니다.</small>
                    </div>
                `;
            }
        }
        
        return `
            <div class="admin-item-card" data-request-id="${application.id}">
                <div class="admin-item-header">
                    <div class="admin-item-info">
                        <div class="item-title-row">
                            <h4>${this.escapeHtml(application.item_name)}</h4>
                            <div class="item-badges">
                                <span class="purchase-method-badge ${purchaseMethodClass}">
                                    ${Utils.createIcon(application.purchase_type === 'offline' ? 'store' : 'shopping-cart')} ${purchaseMethodText}
                                </span>
                                ${application.is_bundle ? '<span class="type-badge bundle">묶음</span>' : '<span class="type-badge single">단일</span>'}
                            </div>
                        </div>
                        <p class="purpose">${this.escapeHtml(application.purpose)}</p>
                        <div class="admin-item-details">
                            <span><strong>가격:</strong> ${Utils.formatPrice(application.price)}</span>
                            ${application.purchase_link ? `
                                <span>
                                    <strong>${application.purchase_type === 'offline' ? '참고 링크:' : '구매 링크:'}</strong> 
                                    <a href="${this.escapeHtml(application.purchase_link)}" target="_blank" rel="noopener noreferrer">
                                        링크 보기 ${Utils.createIcon('external-link')}
                                    </a>
                                </span>
                            ` : ''}
                        </div>
                        ${receiptInfo}
                    </div>
                    
                    <div class="admin-item-actions">
                        ${this.createActionButtons(application.status, application.purchase_type)}
                        <span class="admin-status-badge status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                ${application.rejection_reason ? `
                    <div class="admin-rejection-reason">
                        <div class="reason-label">반려 사유</div>
                        <div class="reason-text">${this.escapeHtml(application.rejection_reason)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 액션 버튼 생성
    createActionButtons(status, purchaseMethod) {
        switch(status) {
            case 'pending':
                return `
                    <button class="btn small approve" data-action="approve">
                        ${Utils.createIcon('check')} 승인
                    </button>
                    <button class="btn small reject" data-action="reject">
                        ${Utils.createIcon('x')} 반려
                    </button>
                `;
            case 'approved':
                // 오프라인 구매의 경우 영수증 제출 후에만 구매완료 처리 가능
                if (purchaseMethod === 'offline') {
                    return `
                        <span class="offline-notice">
                            ${Utils.createIcon('info')} 영수증 제출 후 자동 구매완료
                        </span>
                    `;
                } else {
                    return `
                        <button class="btn small purchase" data-action="purchase">
                            ${Utils.createIcon('shopping-cart')} 구매완료
                        </button>
                    `;
                }
            default:
                return '';
        }
    },

    // 아이템 액션 이벤트 리스너 설정
    setupItemActionListeners() {
        const actionButtons = Utils.$$('.admin-item-actions button[data-action]');
        
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                const itemCard = e.target.closest('.admin-item-card');
                const requestId = parseInt(itemCard.dataset.requestId);
                
                this.handleItemAction(action, requestId, e.target);
            });
        });

        // 영수증 보기 버튼
        const receiptButtons = Utils.$$('.view-receipt-btn');
        receiptButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const requestId = parseInt(e.target.closest('button').dataset.requestId);
                this.showViewReceiptModal(requestId);
            });
        });
    },

    // 아이템 액션 처리
    async handleItemAction(action, requestId, buttonElement) {
        switch(action) {
            case 'approve':
                await this.approveItem(requestId, buttonElement);
                break;
            case 'reject':
                await this.rejectItem(requestId, buttonElement);
                break;
            case 'purchase':
                await this.markAsPurchased(requestId, buttonElement);
                break;
        }
    },

    // 아이템 승인
    async approveItem(requestId, buttonElement) {
        if (Utils.showConfirm('이 교구 신청을 승인하시겠습니까?')) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.updateItemStatus(requestId, 'approved');
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showToast('승인되었습니다.', 'success');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showToast(result.message || '승인 처리 중 오류가 발생했습니다.', 'error');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showToast('승인 처리 중 오류가 발생했습니다.', 'error');
                console.error('Approve item error:', error);
            }
        }
    },

    // 아이템 반려
    async rejectItem(requestId, buttonElement) {
        const reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
        
        if (reason && reason.trim()) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.updateItemStatus(requestId, 'rejected', reason.trim());
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showToast('반려 처리되었습니다.', 'success');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showToast(result.message || '반려 처리 중 오류가 발생했습니다.', 'error');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showToast('반려 처리 중 오류가 발생했습니다.', 'error');
                console.error('Reject item error:', error);
            }
        }
    },

    // 구매 완료 처리
    async markAsPurchased(requestId, buttonElement) {
        if (Utils.showConfirm('이 교구의 구매가 완료되었습니까?')) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.updateItemStatus(requestId, 'purchased');
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showToast('구매완료로 처리되었습니다.', 'success');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showToast(result.message || '구매완료 처리 중 오류가 발생했습니다.', 'error');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showToast('구매완료 처리 중 오류가 발생했습니다.', 'error');
                console.error('Mark as purchased error:', error);
            }
        }
    },

    // 검색 처리
    handleSearch(searchTerm) {
        this.currentSearchTerm = searchTerm.trim();
        this.loadApplications();
    },

    // Excel 내보내기 처리
    async handleExport() {
        const exportBtn = Utils.$('#exportBtn');
        if (exportBtn) {
            Utils.showLoading(exportBtn);
        }
        
        try {
            const exportData = await SupabaseAPI.prepareExportData();
            
            if (exportData.length === 0) {
                Utils.showToast('내보낼 데이터가 없습니다.', 'warning');
            } else {
                const filename = `sejong_applications_${this.getDateString()}.csv`;
                Utils.downloadCSV(exportData, filename);
                Utils.showToast(`${exportData.length}건의 데이터를 내보냈습니다.`, 'success');
            }
        } catch (error) {
            Utils.showToast('데이터 내보내기 중 오류가 발생했습니다.', 'error');
            console.error('Export error:', error);
        } finally {
            if (exportBtn) {
                Utils.hideLoading(exportBtn);
            }
        }
    },

    // 결과 없음 HTML 생성
    createNoResultsHTML() {
        const message = this.currentSearchTerm ? 
            `'${this.currentSearchTerm}'에 대한 검색 결과가 없습니다.` : 
            '신청 내역이 없습니다.';
            
        return `
            <div class="no-results">
                ${Utils.createIcon('search', 'no-results-icon')}
                <p>${message}</p>
            </div>
        `;
    },

    // 데이터 새로고침
    async refreshData() {
        await this.loadStatistics();
        await this.loadBudgetOverview();
        await this.loadApplications();
        await this.loadLessonPlanManagement();
    },

    // HTML 이스케이프
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 날짜 문자열 생성 (파일명용)
    getDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
};