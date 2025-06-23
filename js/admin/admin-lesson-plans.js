// 수업계획 관리 전용 모듈 (admin-lesson-plans.js)
AdminManager.LessonPlans = {
    currentViewingLessonPlan: null,

    // 초기화
    init() {
        console.log('📚 수업계획 관리 모듈 초기화');
        this.setupEventListeners();
        this.loadLessonPlanManagement();
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 수업계획 설정 버튼
        Utils.on('#lessonPlanSettingsBtn', 'click', () => this.showLessonPlanSettingsModal());

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

        // 수업계획 관리 모달 이벤트
        Utils.on('#lessonPlanManagementCloseBtn', 'click', () => this.hideLessonPlanManagementModal());
        Utils.on('#lessonPlanManagementModal', 'click', (e) => {
            if (e.target.id === 'lessonPlanManagementModal') {
                this.hideLessonPlanManagementModal();
            }
        });

        // 세부 수업계획 보기 모달 이벤트
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
                
                // 아이콘 재생성
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('Error loading lesson plan management:', error);
        }
    },

    // 수업계획 관리 모달 표시
    async showLessonPlanManagementModal() {
        console.log('📋 수업계획 관리 모달 표시 요청');
        
        try {
            // 모달이 없으면 생성
            AdminManager.Modals.createLessonPlanManagementModal();
            
            const modal = Utils.$('#lessonPlanManagementModal');
            if (!modal) {
                throw new Error('수업계획 관리 모달을 생성할 수 없습니다.');
            }

            // 수업계획 데이터 로드
            await this.loadLessonPlansForManagement();
            
            modal.classList.add('active');

            // 새로고침 버튼 이벤트 리스너 설정
            const refreshBtn = Utils.$('#refreshPlansBtn');
            if (refreshBtn) {
                refreshBtn.removeEventListener('click', this.loadLessonPlansForManagement);
                refreshBtn.addEventListener('click', () => this.loadLessonPlansForManagement());
            }
            
            console.log('✅ 수업계획 관리 모달 표시 완료');
            
        } catch (error) {
            console.error('❌ 수업계획 관리 모달 표시 실패:', error);
            Utils.showToast('수업계획 관리 모달을 열 수 없습니다.', 'error');
        }
    },

    // 수업계획 관리 모달 숨김
    hideLessonPlanManagementModal() {
        const modal = Utils.$('#lessonPlanManagementModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 수업계획 목록 로드 (관리용)
    async loadLessonPlansForManagement() {
        try {
            console.log('🔄 수업계획 관리 데이터 로드 시작...');
            
            // 안전한 데이터 로드
            const allPlans = await this.safeLoadAllLessonPlans();
            
            console.log('📋 로드된 수업계획:', allPlans.length, '건');
            
            // 통계 계산
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
            Utils.showToast('수업계획 목록을 불러오는 중 오류가 발생했습니다.', 'error');
            
            const container = Utils.$('#lessonPlansList');
            if (container) {
                container.innerHTML = '<div class="error-state">데이터를 불러올 수 없습니다. 새로고침을 시도해보세요.</div>';
            }
        }
    },

    // 안전한 수업계획 데이터 로드
    async safeLoadAllLessonPlans() {
        try {
            const allPlans = await SupabaseAPI.getAllLessonPlans();
            
            if (!Array.isArray(allPlans)) {
                console.warn('⚠️ getAllLessonPlans returned non-array:', allPlans);
                return [];
            }
            
            // 각 수업계획에 대해 안전한 데이터 확인
            const safePlans = allPlans.map(plan => {
                return {
                    ...plan,
                    user_profiles: plan.user_profiles || {
                        id: plan.user_id || 'unknown',
                        name: '사용자 정보 없음',
                        field: '미설정',
                        sejong_institute: '미설정'
                    },
                    lessons: plan.lessons || {
                        totalLessons: 0,
                        startDate: '',
                        endDate: '',
                        overallGoals: '목표가 설정되지 않았습니다.'
                    },
                    status: plan.status || 'draft',
                    approval_status: plan.approval_status || 'pending'
                };
            });
            
            return safePlans;
            
        } catch (error) {
            console.error('❌ 수업계획 데이터 로드 실패:', error);

            if (error.message?.includes('relationship') || error.message?.includes('embed')) {
                console.warn('⚠️ 관계 쿼리 오류 발생, 대체 방식으로 재시도...');
                return await this.fallbackLoadLessonPlans();
            }
            
            throw error;
        }
    },

    // 대체 수업계획 로드 방식
    async fallbackLoadLessonPlans() {
        try {
            console.log('🔄 대체 방식으로 수업계획 로드 중...');
            
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
            throw new Error('수업계획 데이터를 불러올 수 없습니다.');
        }
    },

    // 승인 상태 계산
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

    // 🔧 v2.13 - 수업계획 카드 생성 (상태 표시 로직 개선)
    createLessonPlanCard(plan) {
        const card = Utils.createElement('div', 'lesson-plan-card');
        
        // 🔧 v2.13 - 상태 판단 로직 개선 (rejected 상태 고려)
        let statusText = '임시저장';
        let statusClass = 'draft';
        
        if (plan.status === 'submitted') {
            statusText = '제출완료';
            statusClass = 'completed';
        } else if (plan.status === 'approved') {
            statusText = '승인됨';
            statusClass = 'approved';
        } else if (plan.status === 'rejected') {
            statusText = '반려됨';
            statusClass = 'rejected';
        } else if (plan.status === 'draft') {
            statusText = '임시저장';
            statusClass = 'draft';
        }
        
        // 🔧 승인 상태는 별도로 처리
        let approvalStatusText = '대기 중';
        let approvalStatusClass = 'pending';
        
        if (plan.approval_status === 'approved') {
            approvalStatusText = '승인됨';
            approvalStatusClass = 'approved';
        } else if (plan.approval_status === 'rejected') {
            approvalStatusText = '반려됨';
            approvalStatusClass = 'rejected';
        } else if (plan.approval_status === 'pending') {
            approvalStatusText = '검토 중';
            approvalStatusClass = 'pending';
        } else if (plan.approval_status === 'draft') {
            approvalStatusText = '미제출';
            approvalStatusClass = 'draft';
        }
        
        // 수업 데이터에서 총 수업 횟수 계산
        const lessonData = this.parseLessonData(plan.lessons);
        const { totalLessons, startDate, endDate, overallGoals, specialNotes } = lessonData;
        
        // 사용자 정보
        const userProfile = plan.user_profiles || {};
        const userName = userProfile.name || '알 수 없음';
        const userInstitute = userProfile.sejong_institute || '';
        const userField = userProfile.field || '';
        
        card.innerHTML = `
            <div class="plan-card-header">
                <div class="plan-student-info">
                    <h4>${AdminManager.Utils.escapeHtml(userName)}</h4>
                    <p>${AdminManager.Utils.escapeHtml(userInstitute)} • ${AdminManager.Utils.escapeHtml(userField)}</p>
                    <div class="plan-meta">
                        <span>수업 횟수: ${totalLessons}회</span>
                        <span>기간: ${AdminManager.Utils.escapeHtml(startDate)} ~ ${AdminManager.Utils.escapeHtml(endDate)}</span>
                    </div>
                </div>
                <div class="plan-status-info">
                    <span class="plan-status ${statusClass}">${statusText}</span>
                    ${plan.status !== 'draft' ? `<span class="approval-status ${approvalStatusClass}">${approvalStatusText}</span>` : ''}
                </div>
            </div>
            
            <div class="plan-card-content">
                <div class="plan-goals">
                    <strong>수업 목표:</strong>
                    <p>${AdminManager.Utils.escapeHtml(overallGoals)}</p>
                </div>
                ${specialNotes ? `
                    <div class="plan-notes">
                        <strong>특별 고려사항:</strong>
                        <p>${AdminManager.Utils.escapeHtml(specialNotes)}</p>
                    </div>
                ` : ''}
            </div>
            
            ${plan.rejection_reason ? `
                <div class="plan-rejection-reason">
                    <strong>반려 사유:</strong>
                    <p>${AdminManager.Utils.escapeHtml(plan.rejection_reason)}</p>
                </div>
            ` : ''}
            
            <div class="plan-card-actions">
                ${this.createLessonPlanActionButtons(plan)}
            </div>
        `;
        
        return card;
    },

    // 🔧 v2.13 - 수업계획 액션 버튼 생성 (재승인 버튼 제거)
    createLessonPlanActionButtons(plan) {
        const baseButtons = `
            <button class="btn small secondary view-lesson-plan-btn" 
                    data-action="view-detail" 
                    data-student-id="${plan.user_id}"
                    title="상세 수업계획 보기">
                <i data-lucide="eye"></i> 상세보기
            </button>
        `;

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
        
        // 🔧 v2.13 - 반려된 수업계획에서 재승인 버튼 완전 제거
        // 정상적인 프로세스: 학생이 수정 후 재제출 → 관리자가 다시 승인
        if (plan.approval_status === 'rejected') {
            return baseButtons + `
                <div class="plan-rejected-info">
                    <span class="plan-rejected-date">
                        반려일: ${plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('ko-KR') : '-'}
                    </span>
                    <span class="plan-action-note rejection-note">
                        학생이 수정 후 재제출하면 다시 검토할 수 있습니다.
                    </span>
                </div>
            `;
        }
        
        // 제출됨(pending) 상태일 때만 승인/반려 버튼 표시
        if (plan.status === 'submitted' && plan.approval_status === 'pending') {
            return baseButtons + `
                <button class="btn small approve" data-action="approve" data-student-id="${plan.user_id}">
                    <i data-lucide="check"></i> 승인
                </button>
                <button class="btn small reject" data-action="reject" data-student-id="${plan.user_id}">
                    <i data-lucide="x"></i> 반려
                </button>
            `;
        }
        
        return baseButtons;
    },

    // 수업계획 액션 이벤트 리스너 설정
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

    // 수업계획 액션 처리
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

    // 수업계획 상세보기
    async viewLessonPlanDetail(studentId) {
        try {
            console.log('👁️ 수업계획 상세보기 요청:', studentId);
            
            const allPlans = await this.safeLoadAllLessonPlans();
            const lessonPlan = allPlans.find(plan => plan.user_id === studentId);
            
            if (!lessonPlan) {
                console.error('❌ 수업계획을 찾을 수 없음:', studentId);
                Utils.showToast('수업계획을 찾을 수 없습니다.', 'error');
                return;
            }
            
            console.log('📋 찾은 수업계획:', lessonPlan);
            await this.showViewLessonPlanModal(studentId, lessonPlan);
            
        } catch (error) {
            console.error('❌ Error viewing lesson plan detail:', error);
            Utils.showToast('수업계획 상세보기 중 오류가 발생했습니다.', 'error');
        }
    },

    // 세부 수업계획 보기 모달 표시
    async showViewLessonPlanModal(studentId, lessonPlan) {
        try {
            console.log('🔍 수업계획 상세보기 시작:', studentId, lessonPlan);
            
            // 모달이 없으면 생성
            AdminManager.Modals.createViewLessonPlanModal();
            
            const modal = Utils.$('#viewLessonPlanModal');
            if (!modal) {
                Utils.showToast('세부 수업계획 모달을 찾을 수 없습니다.', 'error');
                return;
            }

            this.currentViewingLessonPlan = lessonPlan;

            // 학생 정보 표시
            const userProfile = lessonPlan.user_profiles || {};
            const studentName = userProfile.name || '알 수 없음';
            const institute = userProfile.sejong_institute || '미설정';
            const field = userProfile.field || '미설정';

            Utils.$('#detailStudentName').textContent = studentName;
            Utils.$('#detailStudentInfo').textContent = `${institute} • ${field}`;

            // 수업 정보 파싱
            const lessonData = this.parseLessonData(lessonPlan.lessons);
            console.log('📊 파싱된 수업 데이터:', lessonData);

            const { startDate, endDate, totalLessons, overallGoals, specialNotes, schedule } = lessonData;
            
            Utils.$('#detailPlanPeriod').textContent = 
                (startDate && endDate) ? `${startDate} ~ ${endDate}` : '기간 미설정';
            Utils.$('#detailTotalLessons').textContent = `총 ${totalLessons}회`;

            // 예산 정보 계산 및 표시
            await AdminManager.Budget.displayBudgetAllocationInfo(field, totalLessons);

            // 수업 목표 표시
            const goalsElement = Utils.$('#detailOverallGoals');
            if (goalsElement) {
                goalsElement.textContent = overallGoals || '목표가 설정되지 않았습니다.';
            }

            // 수업 일정표 표시
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

            // 승인/반려 버튼 설정
            this.setupLessonPlanModalButtons(lessonPlan, studentId);

            modal.classList.add('active');

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            console.log('✅ 수업계획 상세보기 모달 표시 완료');

        } catch (error) {
            console.error('❌ Error showing lesson plan detail modal:', error);
            Utils.showToast('수업계획 상세보기 중 오류가 발생했습니다.', 'error');
        }
    },

    // 세부 수업계획 보기 모달 숨김
    hideViewLessonPlanModal() {
        const modal = Utils.$('#viewLessonPlanModal');
        if (modal) {
            modal.classList.remove('active');
            this.currentViewingLessonPlan = null;
        }
    },

    // 수업 데이터 파싱
    parseLessonData(lessonsRaw) {
        console.log('🔄 수업 데이터 파싱 시작:', lessonsRaw);
        
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

            if (typeof lessons === 'string') {
                try {
                    lessons = JSON.parse(lessons);
                    console.log('📝 JSON 파싱 성공:', lessons);
                } catch (parseError) {
                    console.warn('⚠️ JSON 파싱 실패, 기본값 사용:', parseError);
                    return defaultData;
                }
            }

            if (!lessons || typeof lessons !== 'object') {
                console.warn('⚠️ 유효하지 않은 수업 데이터, 기본값 사용');
                return defaultData;
            }

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

    // 총 수업 횟수 추출
    extractTotalLessons(lessons) {
        if (lessons.totalLessons && typeof lessons.totalLessons === 'number') {
            return lessons.totalLessons;
        }
        if (lessons.total_lessons && typeof lessons.total_lessons === 'number') {
            return lessons.total_lessons;
        }

        const schedule = this.extractSchedule(lessons);
        if (Array.isArray(schedule) && schedule.length > 0) {
            return schedule.length;
        }

        return 0;
    },

    // 수업 일정 추출
    extractSchedule(lessons) {
        try {
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

            if (typeof schedule === 'string') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (parseError) {
                    console.warn('⚠️ 스케줄 JSON 파싱 실패:', parseError);
                    schedule = [];
                }
            }

            if (!Array.isArray(schedule)) {
                console.warn('⚠️ 스케줄이 배열이 아님:', schedule);
                return [];
            }

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

    // 수업 일정표 표시
    displayLessonSchedule(schedule) {
        console.log('📅 수업 일정표 표시:', schedule);
        
        const container = Utils.$('#detailLessonSchedule');
        if (!container) {
            console.error('❌ 수업 일정표 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
            container.innerHTML = '<div class="empty-schedule-message">등록된 수업 일정이 없습니다.</div>';
            console.log('📝 빈 스케줄 메시지 표시');
            return;
        }

        try {
            const table = Utils.createElement('table', 'schedule-table');
            
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

            const tbody = Utils.createElement('tbody');
            
            schedule.forEach((lesson, index) => {
                const row = Utils.createElement('tr');
                
                const lessonNumber = index + 1;
                const date = lesson.date || '-';
                const topic = lesson.topic || '-';
                const content = lesson.content || '-';

                row.innerHTML = `
                    <td><strong>${lessonNumber}차시</strong></td>
                    <td class="lesson-date">${AdminManager.Utils.escapeHtml(date)}</td>
                    <td class="lesson-topic">${AdminManager.Utils.escapeHtml(topic)}</td>
                    <td class="lesson-content">${AdminManager.Utils.escapeHtml(content)}</td>
                `;
                
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            
            container.innerHTML = '';
            container.appendChild(table);
            
            console.log(`✅ 수업 일정표 표시 완료: ${schedule.length}개 수업`);

        } catch (error) {
            console.error('❌ 수업 일정표 생성 오류:', error);
            container.innerHTML = '<div class="empty-schedule-message">수업 일정을 표시하는 중 오류가 발생했습니다.</div>';
        }
    },

    // 수업계획 모달 버튼 설정
    setupLessonPlanModalButtons(lessonPlan, studentId) {
        const approveBtn = Utils.$('#approveLessonPlanBtn');
        const rejectBtn = Utils.$('#rejectLessonPlanBtn');

        if (approveBtn) approveBtn.dataset.studentId = studentId;
        if (rejectBtn) rejectBtn.dataset.studentId = studentId;

        if (lessonPlan.status === 'submitted' && lessonPlan.approval_status === 'pending') {
            if (approveBtn) approveBtn.style.display = 'inline-flex';
            if (rejectBtn) rejectBtn.style.display = 'inline-flex';
        } else {
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn) rejectBtn.style.display = 'none';
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
                    await AdminManager.Budget.loadBudgetOverview();
                    
                    this.hideViewLessonPlanModal();
                    
                    let message = '수업계획이 승인되었습니다.';
                    if (result.data?.budgetInfo) {
                        message += `\n배정된 예산: ${Utils.formatPrice(result.data.budgetInfo.allocated)}`;
                    }
                    Utils.showToast(message, 'success');
                    
                    // 다른 모듈에 알림
                    AdminManager.emit('lesson-plan-approved', { studentId, result });
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
                    await AdminManager.Budget.loadBudgetOverview();
                    
                    this.hideViewLessonPlanModal();
                    
                    Utils.showToast('수업계획이 반려되었습니다.', 'success');
                    
                    // 다른 모듈에 알림
                    AdminManager.emit('lesson-plan-rejected', { studentId, reason });
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

    // 수업계획 설정 모달 표시
    async showLessonPlanSettingsModal() {
        const modal = Utils.$('#lessonPlanSettingsModal');
        const settings = await SupabaseAPI.getSystemSettings();
        
        Utils.$('#planEditDeadline').value = settings.lesson_plan_deadline || '2026-12-31';
        Utils.$('#planEditTime').value = '23:59';
        Utils.$('#planEditNotice').value = settings.notice_message || '';
        
        const testModeCheckbox = Utils.$('#testModeEnabled');
        if (testModeCheckbox) {
            testModeCheckbox.checked = settings.test_mode || false;
        }
        
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

        if (!testMode && !allowOverrideDeadline && !Utils.validateRequired(deadline, '수업계획 수정 마감일')) return;

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
            
            Utils.showToast(`수업계획 설정이 저장되었습니다.\n현재 상태: ${statusText}`, 'success');
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showToast('설정 저장 중 오류가 발생했습니다.', 'error');
            console.error('Lesson plan settings error:', error);
        }
    },

    // 테스트 모드 빠른 토글
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

    // 새로고침 함수
    async refresh() {
        console.log('🔄 LessonPlans 모듈 새로고침');
        await this.loadLessonPlanManagement();
        return true;
    }
};

// 전역 접근을 위한 별명
window.AdminLessonPlans = AdminManager.LessonPlans;

console.log('📚 AdminManager.LessonPlans 모듈 로드 완료 (v2.13 - 재승인 버튼 제거 및 상태 표시 로직 개선)');
