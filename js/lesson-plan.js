// 수업계획 관리 모듈 (Supabase 연동) - 기존 데이터 로드 개선 버전 + 총 수업 횟수 변경 시 자동 테이블 재생성 기능 추가
const LessonPlanManager = {
    currentLessonPlan: null,
    isEditMode: false,
    isInitialized: false,
    currentLessonData: {}, // 현재 입력된 수업 데이터 임시 저장

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

    // 안전한 사용자 정보 조회 (인증 문제 해결)
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

    // 인증 상태 확인 (개선된 버전)
    isUserAuthenticated() {
        const user = this.getSafeCurrentUser();
        const isAuth = !!(user && user.id);
        console.log('🔍 인증 상태 확인:', isAuth ? '로그인됨' : '로그인 안됨', user ? `(${user.name})` : '');
        return isAuth;
    },

    // 이벤트 바인딩 (중복 방지) - 수정: totalLessons 변경 이벤트 추가
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

        // 🆕 총 수업 횟수 변경 시 자동 테이블 재생성
        const totalLessons = document.getElementById('totalLessons');
        if (totalLessons) {
            totalLessons.addEventListener('change', this.handleTotalLessonsChange.bind(this));
            totalLessons.addEventListener('input', this.handleTotalLessonsInput.bind(this));
        }
    },

    // 🆕 총 수업 횟수 변경 처리 (change 이벤트)
    async handleTotalLessonsChange(e) {
        try {
            console.log('📊 총 수업 횟수 변경 감지');
            
            const newTotalLessons = parseInt(e.target.value);
            const tableContainer = document.getElementById('lessonTableContainer');
            
            // 유효성 검사
            if (isNaN(newTotalLessons) || newTotalLessons <= 0) {
                this.showMessage('⚠️ 총 수업 횟수는 1 이상의 숫자여야 합니다.', 'warning');
                return;
            }

            if (newTotalLessons > 100) {
                this.showMessage('⚠️ 총 수업 횟수는 100회를 초과할 수 없습니다.', 'warning');
                e.target.value = 100;
                return;
            }

            // 기존 테이블이 있는지 확인
            if (!tableContainer || !tableContainer.innerHTML.trim()) {
                console.log('📋 기존 테이블이 없어 변경 처리를 건너뜁니다.');
                return;
            }

            // 현재 입력된 데이터 백업
            this.backupCurrentLessonData();

            const currentLessonCount = this.getCurrentLessonCount();
            console.log(`📊 수업 횟수 변경: ${currentLessonCount} → ${newTotalLessons}`);

            if (newTotalLessons !== currentLessonCount) {
                await this.handleLessonCountChange(currentLessonCount, newTotalLessons);
            }

        } catch (error) {
            console.error('❌ 총 수업 횟수 변경 처리 오류:', error);
            this.showMessage('❌ 총 수업 횟수 변경 중 오류가 발생했습니다.', 'error');
        }
    },

    // 🆕 총 수업 횟수 입력 처리 (input 이벤트 - 실시간 유효성 검사)
    handleTotalLessonsInput(e) {
        try {
            const value = parseInt(e.target.value);
            
            if (isNaN(value)) return;

            if (value > 100) {
                e.target.value = 100;
                this.showMessage('⚠️ 총 수업 횟수는 최대 100회입니다.', 'warning');
            } else if (value < 1) {
                e.target.value = 1;
                this.showMessage('⚠️ 총 수업 횟수는 최소 1회입니다.', 'warning');
            }
        } catch (error) {
            console.error('총 수업 횟수 입력 처리 오류:', error);
        }
    },

    // 🆕 수업 횟수 변경 처리
    async handleLessonCountChange(oldCount, newCount) {
        try {
            let confirmMessage = '';
            let warningMessage = '';

            if (newCount > oldCount) {
                // 수업 횟수 증가
                const addedCount = newCount - oldCount;
                confirmMessage = `수업 횟수를 ${oldCount}회에서 ${newCount}회로 늘리시겠습니까?\n\n✅ ${addedCount}개의 새로운 수업 항목이 추가됩니다.\n✅ 기존에 입력한 데이터는 그대로 유지됩니다.`;
            } else {
                // 수업 횟수 감소
                const removedCount = oldCount - newCount;
                confirmMessage = `수업 횟수를 ${oldCount}회에서 ${newCount}회로 줄이시겠습니까?\n\n⚠️ ${newCount + 1}회차부터 ${oldCount}회차까지 총 ${removedCount}개 수업의 데이터가 삭제됩니다.\n✅ ${newCount}회차까지의 데이터는 그대로 유지됩니다.\n\n❗ 삭제된 데이터는 복구할 수 없습니다.`;
                warningMessage = `\n\n⚠️ 주의: 줄어든 수업의 데이터가 완전히 삭제됩니다!`;
            }

            // 사용자 확인
            if (!confirm(confirmMessage + warningMessage)) {
                // 취소된 경우 원래 값으로 복원
                const totalLessonsInput = document.getElementById('totalLessons');
                if (totalLessonsInput) {
                    totalLessonsInput.value = oldCount;
                }
                console.log('📋 사용자가 수업 횟수 변경을 취소했습니다.');
                return;
            }

            // 테이블 재생성
            await this.regenerateTableWithData(newCount);

            // 성공 메시지
            if (newCount > oldCount) {
                this.showMessage(`✅ 수업 계획표가 ${newCount}회차로 확장되었습니다!\n✅ 기존 데이터는 그대로 유지되었습니다.`, 'success');
            } else {
                this.showMessage(`✅ 수업 계획표가 ${newCount}회차로 축소되었습니다!\n⚠️ ${newCount + 1}회차 이후의 데이터가 삭제되었습니다.`, 'warning');
            }

        } catch (error) {
            console.error('❌ 수업 횟수 변경 처리 오류:', error);
            this.showMessage('❌ 수업 횟수 변경 중 오류가 발생했습니다.', 'error');
        }
    },

    // 🆕 현재 입력된 수업 데이터 백업
    backupCurrentLessonData() {
        try {
            console.log('💾 현재 수업 데이터 백업 시작');
            this.currentLessonData = {};

            const topicInputs = document.querySelectorAll('[id^="lessonTopic_"]');
            topicInputs.forEach(input => {
                const lessonNumber = input.id.split('_')[1];
                const contentInput = document.getElementById(`lessonContent_${lessonNumber}`);
                
                if (input.value.trim() || (contentInput && contentInput.value.trim())) {
                    this.currentLessonData[lessonNumber] = {
                        topic: input.value.trim(),
                        content: contentInput ? contentInput.value.trim() : ''
                    };
                }
            });

            console.log('✅ 수업 데이터 백업 완료:', Object.keys(this.currentLessonData).length + '개 항목');
        } catch (error) {
            console.error('❌ 수업 데이터 백업 오류:', error);
            this.currentLessonData = {};
        }
    },

    // 🆕 현재 테이블의 수업 횟수 확인
    getCurrentLessonCount() {
        try {
            const topicInputs = document.querySelectorAll('[id^="lessonTopic_"]');
            return topicInputs.length;
        } catch (error) {
            console.error('현재 수업 횟수 확인 오류:', error);
            return 0;
        }
    },

    // 🆕 백업된 데이터와 함께 테이블 재생성
    async regenerateTableWithData(newTotalLessons) {
        try {
            console.log('🔄 데이터 보존하며 테이블 재생성 시작');

            // 새로운 수업 데이터 생성
            const lessons = this.createSimpleLessons(newTotalLessons);
            
            // 테이블 재생성
            this.createLessonTable(lessons);

            // 백업된 데이터 복원 (새로운 횟수 범위 내에서만)
            for (let i = 1; i <= newTotalLessons; i++) {
                const lessonData = this.currentLessonData[i];
                if (lessonData) {
                    this.safeSetValue(`lessonTopic_${i}`, lessonData.topic);
                    this.safeSetValue(`lessonContent_${i}`, lessonData.content);
                }
            }

            console.log('✅ 테이블 재생성 및 데이터 복원 완료');
        } catch (error) {
            console.error('❌ 테이블 재생성 오류:', error);
            throw error;
        }
    },

    // 이벤트 리스너 제거 - 수정: totalLessons 이벤트 추가
    unbindEvents() {
        const elements = [
            'generateTableBtn',
            'lessonPlanForm', 
            'saveDraftBtn',
            'startDate',
            'endDate',
            'totalLessons' // 🆕 추가
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // 기존 리스너들 제거
                element.removeEventListener('click', this.handleGenerateTable);
                element.removeEventListener('submit', this.handleFormSubmit);
                element.removeEventListener('click', this.handleSaveDraft);
                element.removeEventListener('change', this.calculateDuration);
                element.removeEventListener('change', this.handleTotalLessonsChange); // 🆕 추가
                element.removeEventListener('input', this.handleTotalLessonsInput); // 🆕 추가
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
                this.showSingleNotice('edit-disabled', 'alert-circle', 'warning', '⚠️ 수업계획 수정 기간이 종료되었습니다. 관리자에게 문의하세요.');
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
                this.showMessage('⚠️ 파견 시작일, 종료일, 총 수업 횟수를 모두 입력해주세요.', 'warning');
                return;
            }

            if (isNaN(totalLessons) || totalLessons <= 0) {
                this.showMessage('⚠️ 총 수업 횟수는 1 이상의 숫자여야 합니다.', 'warning');
                return;
            }

            if (totalLessons > 100) {
                this.showMessage('⚠️ 총 수업 횟수는 100회를 초과할 수 없습니다.', 'warning');
                return;
            }

            // 날짜 유효성 검사
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                this.showMessage('⚠️ 유효하지 않은 날짜입니다.', 'warning');
                return;
            }
            
            if (start >= end) {
                this.showMessage('⚠️ 파견 종료일은 시작일보다 늦어야 합니다.', 'warning');
                return;
            }

            // 수업 데이터 생성
            const lessons = this.createSimpleLessons(totalLessons);
            
            if (!lessons || lessons.length === 0) {
                this.showMessage('❌ 수업 계획표를 생성할 수 없습니다. 입력값을 확인해주세요.', 'error');
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
            this.showMessage(`✅ ${lessons.length}개의 수업 계획표가 생성되었습니다! 각 수업의 주제와 내용을 작성해주세요.\\n\\n⚠️ 모든 수업계획의 작성은 필수 사항입니다.`, 'success');
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
                        <div class="header-cell lesson-topic-col">수업 주제 * (필수)</div>
                        <div class="header-cell lesson-content-col">수업 내용 * (필수)</div>
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
                                   placeholder="⚠️ ${lesson.lessonNumber}회차 수업 주제를 반드시 입력하세요 (필수)"
                                   class="topic-input"
                                   maxlength="100"
                                   required>
                        </div>
                        <div class="cell lesson-content">
                            <textarea id="lessonContent_${lesson.lessonNumber}" 
                                      placeholder="⚠️ ${lesson.lessonNumber}회차 수업에서 진행할 구체적인 내용을 반드시 작성하세요 (필수)"
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

    // 기존 데이터 로드 - 개선된 버전 (자동 테이블 생성 포함)
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
                this.safeSetValue('totalLessons', lessonData.totalLessons);
                this.safeSetValue('overallGoals', lessonData.overallGoals);
                this.safeSetValue('specialNotes', lessonData.specialNotes);

                // 기본 정보가 있고 수업 데이터가 있으면 자동으로 테이블 생성
                if (lessonData.totalLessons && lessonData.lessons && Array.isArray(lessonData.lessons)) {
                    console.log('🔄 기존 데이터로 수업 계획표 자동 생성');
                    
                    // 테이블 섹션 표시
                    const tableSection = document.getElementById('lessonTableSection');
                    const additionalSection = document.getElementById('additionalInfoSection');
                    
                    if (tableSection) tableSection.style.display = 'block';
                    if (additionalSection) additionalSection.style.display = 'block';
                    
                    // 기존 수업 데이터로 테이블 생성
                    const lessons = [];
                    for (let i = 1; i <= lessonData.totalLessons; i++) {
                        lessons.push({
                            lessonNumber: i,
                            topic: '',
                            content: ''
                        });
                    }
                    
                    this.createLessonTable(lessons);
                    
                    // 수업별 데이터 채우기
                    lessonData.lessons.forEach(lesson => {
                        if (lesson && lesson.lessonNumber) {
                            this.safeSetValue(`lessonTopic_${lesson.lessonNumber}`, lesson.topic || '');
                            this.safeSetValue(`lessonContent_${lesson.lessonNumber}`, lesson.content || '');
                        }
                    });
                    
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

    // 현재 데이터 수집 - 🆕 수정: totalLessons 설정값 기준으로 데이터 수집 제한
    collectFormData() {
        console.log('📊 폼 데이터 수집 시작');
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const totalLessons = parseInt(document.getElementById('totalLessons').value);
        const overallGoals = document.getElementById('overallGoals').value.trim();
        const specialNotes = document.getElementById('specialNotes').value.trim();

        // 🆕 수정: totalLessons 설정값 기준으로만 데이터 수집
        const lessons = [];
        
        // totalLessons가 유효한 경우에만 해당 수만큼만 수집
        if (!isNaN(totalLessons) && totalLessons > 0) {
            for (let i = 1; i <= totalLessons; i++) {
                const topicInput = document.getElementById(`lessonTopic_${i}`);
                const contentInput = document.getElementById(`lessonContent_${i}`);
                
                if (topicInput && contentInput) {
                    lessons.push({
                        lessonNumber: i,
                        topic: topicInput.value.trim(),
                        content: contentInput.value.trim()
                    });
                }
            }
        } else {
            console.warn('⚠️ totalLessons가 유효하지 않음:', totalLessons);
        }

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
            설정된수업수: totalLessons,
            실제수집된수업수: lessons.length,
            목표길이: overallGoals.length,
            특별사항길이: specialNotes.length
        });

        // 🆕 데이터 일관성 검증
        if (totalLessons !== lessons.length) {
            console.warn(`⚠️ 데이터 불일치 감지: 설정 수업수(${totalLessons}) ≠ 수집된 수업수(${lessons.length})`);
            // 설정값 기준으로 보정
            this.showMessage(`⚠️ 데이터 불일치가 감지되어 ${totalLessons}개 수업 기준으로 보정했습니다.`, 'warning');
        }

        return formData;
    },

    // 폼 유효성 검사 (수업 계획 필수 검증 추가) - 🆕 수정: 데이터 일관성 체크 강화
    validateForm(data) {
        const errors = [];

        // 기본 정보 검증
        if (!data.startDate) errors.push('❌ 파견 시작일을 입력해주세요.');
        if (!data.endDate) errors.push('❌ 파견 종료일을 입력해주세요.');
        if (!data.totalLessons) errors.push('❌ 총 수업 횟수를 입력해주세요.');
        if (!data.overallGoals) errors.push('❌ 전체 수업 목표를 입력해주세요. (필수 항목)');

        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            errors.push('❌ 파견 종료일은 시작일보다 늦어야 합니다.');
        }

        if (data.totalLessons && (data.totalLessons < 1 || data.totalLessons > 100)) {
            errors.push('❌ 총 수업 횟수는 1~100회 사이여야 합니다.');
        }

        // 🆕 데이터 일관성 검증 강화
        if (data.totalLessons && data.lessons) {
            if (data.totalLessons !== data.lessons.length) {
                errors.push(`❌ 설정된 수업 횟수(${data.totalLessons})와 실제 수업 데이터 수(${data.lessons.length})가 일치하지 않습니다.`);
            }
        }

        // 수업 계획 내용 검증 (필수)
        if (data.lessons && data.lessons.length > 0) {
            let emptyTopicCount = 0;
            let emptyContentCount = 0;
            const emptyTopicLessons = [];
            const emptyContentLessons = [];
            
            data.lessons.forEach((lesson, index) => {
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
        } else {
            errors.push('❌ 수업 계획표를 생성하고 각 수업의 주제와 내용을 작성해주세요. (필수 항목)');
        }

        console.log('✅ 폼 검증 완료:', errors.length === 0 ? '통과' : `${errors.length}개 오류`);

        return errors;
    },

    // 임시저장 (인증 문제 해결)
    async saveDraft() {
        try {
            console.log('💾 임시저장 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return;
            }

            // 개선된 사용자 인증 확인
            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.', 'warning');
                console.error('인증 실패: 사용자 정보가 없습니다');
                
                // 3초 후 로그인 페이지로 리다이렉트
                setTimeout(() => {
                    if (window.App && window.App.showPage) {
                        window.App.showPage('loginPage');
                    }
                }, 3000);
                return;
            }

            console.log('👤 사용자 확인:', currentUser.id, currentUser.name);

            const data = this.collectFormData();
            
            console.log('🚀 Supabase에 임시저장 요청');
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, true);
            
            if (result.success) {
                console.log('✅ 임시저장 성공:', result.data?.id);
                this.showMessage('✅ 수업계획이 임시저장되었습니다!\\n\\n⚠️ 완료 제출까지 해야 승인 검토가 시작됩니다.', 'success');
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

    // 폼 제출 처리 (인증 문제 해결)
    async handleFormSubmit_actual(e) {
        e.preventDefault();
        
        try {
            console.log('📝 수업계획 완료 제출 시작');
            
            const canEdit = await SupabaseAPI.canEditLessonPlan();
            if (!canEdit) {
                this.showMessage('❌ 수업계획 수정 기간이 종료되었습니다.', 'warning');
                return;
            }

            // 개선된 사용자 인증 확인
            const currentUser = this.getSafeCurrentUser();
            if (!currentUser) {
                this.showMessage('❌ 로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.', 'warning');
                console.error('인증 실패: 사용자 정보가 없습니다');
                
                // 3초 후 로그인 페이지로 리다이렉트
                setTimeout(() => {
                    if (window.App && window.App.showPage) {
                        window.App.showPage('loginPage');
                    }
                }, 3000);
                return;
            }

            console.log('👤 사용자 확인:', currentUser.id, currentUser.name);

            const data = this.collectFormData();
            const errors = this.validateForm(data);

            if (errors.length > 0) {
                console.warn('⚠️ 폼 검증 실패:', errors);
                this.showMessage('❌ 다음 사항을 확인해주세요:\\n\\n' + errors.join('\\n'), 'warning');
                
                // 스크롤을 첫 번째 오류 위치로 이동
                this.scrollToFirstError(data);
                return;
            }

            // 완료 확인 메시지
            if (!confirm('수업계획을 완료 제출하시겠습니까?\\n\\n✅ 모든 수업의 주제와 내용이 작성되었는지 확인해주세요.\\n✅ 완료 제출 후 관리자 승인을 받으면 교구 신청이 가능합니다.\\n\\n⚠️ 수업계획 제출은 필수 사항입니다.')) {
                console.log('📋 사용자가 제출을 취소했습니다.');
                return;
            }

            console.log('🚀 Supabase에 완료 제출 요청');
            
            const result = await SupabaseAPI.saveLessonPlan(currentUser.id, data, false);
            
            if (result.success) {
                console.log('✅ 수업계획 완료 성공:', result.data?.id);
                this.showMessage('🎉 수업계획이 완료 제출되었습니다!\\n\\n✅ 관리자 승인 후 교구 신청이 가능합니다.\\n📋 수업계획은 필수 제출 사항이므로 승인을 기다려주세요.', 'success');
                
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

    // 수업계획 페이지 표시 - 개선된 버전 (자동 데이터 로드)
    async showLessonPlanPage() {
        console.log('📄 수업계획 페이지 표시');
        
        // 모든 기존 알림 제거
        this.clearAllNotices();
        
        // 기존 데이터 자동 로드 시도
        try {
            console.log('🔄 기존 수업계획 데이터 자동 로드 시도');
            await this.loadExistingData();
            
            // 기존 데이터가 로드된 경우 추가 안내 메시지
            if (this.currentLessonPlan) {
                console.log('✅ 기존 수업계획 데이터 로드 완료');
            } else {
                console.log('📝 새로운 수업계획 작성 모드');
                this.showMessage('📋 새로운 수업계획을 작성합니다. 모든 항목을 입력한 후 수업 계획표를 생성해주세요.', 'info');
            }
        } catch (error) {
            console.warn('기존 데이터 로드 중 오류 (무시):', error);
            this.showMessage('📋 수업계획 작성 페이지입니다. 모든 항목을 입력해주세요.', 'info');
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