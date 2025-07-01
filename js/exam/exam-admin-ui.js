/**
 * 📝 수료평가 시스템 - 관리자 UI 모듈 v5.1.0
 * 문제 관리, 시험 결과 조회 UI 관리
 * 기존 시스템과 완전 분리된 독립 모듈
 */

class ExamAdminUI {
    constructor() {
        this.moduleStatus = {
            initialized: false,
            name: 'ExamAdminUI',
            version: '5.1.0',
            lastUpdate: new Date().toISOString()
        };
        this.currentView = 'questions'; // questions, results, settings
        this.currentPage = 1;
        this.currentFilters = {};
        this.selectedQuestions = new Set();
    }

    /**
     * 🚀 모듈 초기화
     */
    async initialize() {
        try {
            console.log('🔄 ExamAdminUI v5.1.0 초기화 시작...');
            
            // 필수 모듈 확인
            if (!window.ExamAdminAPI) {
                throw new Error('ExamAdminAPI 모듈이 필요합니다.');
            }
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 뷰 설정
            await this.showQuestionsView();
            
            this.moduleStatus.initialized = true;
            console.log('✅ ExamAdminUI v5.1.0 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ ExamAdminUI 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 📡 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 탭 전환
        document.querySelectorAll('.exam-nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const view = tab.dataset.view;
                this.switchView(view);
            });
        });

        // 문제 추가 버튼
        document.getElementById('add-question-btn')?.addEventListener('click', () => {
            this.showQuestionModal();
        });

        // 문제 검색
        const searchInput = document.getElementById('question-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.handleSearch();
            }, 300));
        }

        // 문제 유형 필터
        document.getElementById('question-type-filter')?.addEventListener('change', () => {
            this.handleSearch();
        });

        // 모달 닫기
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('exam-modal-overlay')) {
                this.closeModal();
            }
        });

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        console.log('📡 ExamAdminUI 이벤트 리스너 설정 완료');
    }

    // ==================== 뷰 관리 ====================

    /**
     * 🔄 뷰 전환
     */
    async switchView(view) {
        try {
            // 탭 활성화 상태 변경
            document.querySelectorAll('.exam-nav-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === view);
            });

            this.currentView = view;
            this.currentPage = 1;

            // 뷰별 콘텐츠 표시
            switch (view) {
                case 'questions':
                    await this.showQuestionsView();
                    break;
                case 'results':
                    await this.showResultsView();
                    break;
                case 'settings':
                    await this.showSettingsView();
                    break;
                default:
                    await this.showQuestionsView();
            }

        } catch (error) {
            console.error('❌ 뷰 전환 실패:', error);
            this.showError('뷰 전환 중 오류가 발생했습니다.');
        }
    }

    /**
     * 📋 문제 관리 뷰
     */
    async showQuestionsView() {
        try {
            this.showLoading(true);
            
            // 문제 목록 조회
            const result = await window.ExamAdminAPI.getQuestions({
                page: this.currentPage,
                limit: 10,
                search: this.getSearchKeyword(),
                type: this.getTypeFilter()
            });

            // 통계 업데이트
            await this.updateQuestionStats();

            // 문제 목록 렌더링
            this.renderQuestionsList(result);
            
            // 페이지네이션 렌더링
            this.renderPagination(result);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ 문제 뷰 로드 실패:', error);
            this.showError('문제 목록을 불러오는데 실패했습니다.');
            this.showLoading(false);
        }
    }

    /**
     * 📊 시험 결과 뷰
     */
    async showResultsView() {
        try {
            this.showLoading(true);
            
            // 시험 결과 조회
            const result = await window.ExamAdminAPI.getExamResults({
                page: this.currentPage,
                limit: 10,
                search: this.getSearchKeyword(),
                passStatus: this.getPassStatusFilter()
            });

            // 통계 업데이트
            await this.updateExamStats();

            // 결과 목록 렌더링
            this.renderResultsList(result);
            
            // 페이지네이션 렌더링
            this.renderPagination(result);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ 결과 뷰 로드 실패:', error);
            this.showError('시험 결과를 불러오는데 실패했습니다.');
            this.showLoading(false);
        }
    }

    /**
     * ⚙️ 설정 뷰
     */
    async showSettingsView() {
        try {
            this.showLoading(true);
            
            // 현재 설정 조회
            const settings = await window.ExamAdminAPI.getExamSettings();
            
            // 설정 폼 렌더링
            this.renderSettingsForm(settings);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ 설정 뷰 로드 실패:', error);
            this.showError('설정을 불러오는데 실패했습니다.');
            this.showLoading(false);
        }
    }

    // ==================== 렌더링 ====================

    /**
     * 📋 문제 목록 렌더링
     */
    renderQuestionsList(result) {
        const container = document.getElementById('questions-list');
        if (!container) return;

        if (!result.questions || result.questions.length === 0) {
            container.innerHTML = `
                <div class="exam-empty-state">
                    <i data-lucide="file-question"></i>
                    <h3>등록된 문제가 없습니다</h3>
                    <p>"문제 추가" 버튼을 눌러 새로운 문제를 등록하세요.</p>
                </div>
            `;
            this.updateLucideIcons();
            return;
        }

        const questionsHTML = result.questions.map(question => this.createQuestionCard(question)).join('');
        container.innerHTML = questionsHTML;
        
        // 이벤트 리스너 추가
        this.attachQuestionEventListeners();
        this.updateLucideIcons();
    }

    /**
     * 📋 문제 카드 생성
     */
    createQuestionCard(question) {
        const typeText = question.question_type === 'multiple_choice' ? '객관식' : '단답형';
        const statusClass = question.is_active ? 'active' : 'inactive';
        const statusText = question.is_active ? '활성' : '비활성';
        
        let optionsHTML = '';
        if (question.question_type === 'multiple_choice' && question.options) {
            const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]');
            optionsHTML = `
                <div class="exam-question-options">
                    ${options.map((option, index) => {
                        const isCorrect = option === question.correct_answer;
                        return `
                            <div class="exam-option ${isCorrect ? 'correct' : ''}">
                                ${index + 1}. ${option}
                                ${isCorrect ? '<i data-lucide="check"></i>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            optionsHTML = `
                <div class="exam-question-answer">
                    <strong>정답:</strong> ${question.correct_answer}
                </div>
            `;
        }

        return `
            <div class="exam-question-card" data-id="${question.id}">
                <div class="exam-question-header">
                    <div class="exam-question-meta">
                        <span class="exam-question-type">${typeText}</span>
                        <span class="exam-question-points">${question.points}점</span>
                        <span class="exam-question-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="exam-question-actions">
                        <button class="exam-btn exam-btn-sm exam-btn-secondary" onclick="examAdminUI.editQuestion('${question.id}')">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="exam-btn exam-btn-sm ${question.is_active ? 'exam-btn-warning' : 'exam-btn-success'}" 
                                onclick="examAdminUI.toggleQuestionActive('${question.id}', ${!question.is_active})">
                            <i data-lucide="${question.is_active ? 'eye-off' : 'eye'}"></i>
                        </button>
                        <button class="exam-btn exam-btn-sm exam-btn-danger" onclick="examAdminUI.deleteQuestion('${question.id}')">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
                <div class="exam-question-content">
                    <div class="exam-question-text">${question.question_text}</div>
                    ${optionsHTML}
                </div>
            </div>
        `;
    }

    /**
     * 📊 시험 결과 목록 렌더링
     */
    renderResultsList(result) {
        const container = document.getElementById('results-list');
        if (!container) return;

        if (!result.results || result.results.length === 0) {
            container.innerHTML = `
                <div class="exam-empty-state">
                    <i data-lucide="bar-chart"></i>
                    <h3>시험 결과가 없습니다</h3>
                    <p>아직 응시한 학생이 없습니다.</p>
                </div>
            `;
            this.updateLucideIcons();
            return;
        }

        const resultsHTML = result.results.map(session => this.createResultCard(session)).join('');
        container.innerHTML = resultsHTML;
        
        this.updateLucideIcons();
    }

    /**
     * 📊 결과 카드 생성
     */
    createResultCard(session) {
        const passClass = session.pass_status ? 'pass' : 'fail';
        const passText = session.pass_status ? '합격' : '불합격';
        const percentage = session.max_score > 0 ? Math.round((session.total_score / session.max_score) * 100) : 0;
        const submittedDate = session.submitted_at ? new Date(session.submitted_at).toLocaleDateString('ko-KR') : '-';
        
        const studentName = session.user_profiles?.name || '알 수 없음';
        const institute = session.user_profiles?.sejong_institute || '-';
        const field = session.user_profiles?.field || '-';

        return `
            <div class="exam-result-card">
                <div class="exam-result-header">
                    <div class="exam-result-student">
                        <h4>${studentName}</h4>
                        <div class="exam-result-details">
                            <span>학당: ${institute}</span>
                            <span>분야: ${field}</span>
                        </div>
                    </div>
                    <div class="exam-result-status ${passClass}">
                        ${passText}
                    </div>
                </div>
                <div class="exam-result-body">
                    <div class="exam-result-score">
                        <div class="exam-score-display">
                            <span class="exam-score-points">${session.total_score || 0}/${session.max_score || 0}</span>
                            <span class="exam-score-percentage">(${percentage}%)</span>
                        </div>
                        <div class="exam-score-bar">
                            <div class="exam-score-fill ${passClass}" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                    <div class="exam-result-meta">
                        <span>응시일: ${submittedDate}</span>
                        <span>재시험: ${session.retake_allowed ? '허용' : '불허용'}</span>
                    </div>
                </div>
                <div class="exam-result-actions">
                    <button class="exam-btn exam-btn-sm exam-btn-secondary" 
                            onclick="examAdminUI.viewResultDetails('${session.id}')">
                        <i data-lucide="eye"></i> 상세보기
                    </button>
                    <button class="exam-btn exam-btn-sm ${session.retake_allowed ? 'exam-btn-warning' : 'exam-btn-primary'}" 
                            onclick="examAdminUI.toggleRetake('${session.id}', ${!session.retake_allowed})">
                        <i data-lucide="${session.retake_allowed ? 'x' : 'refresh-cw'}"></i>
                        ${session.retake_allowed ? '재시험 금지' : '재시험 허용'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 📊 페이지네이션 렌더링
     */
    renderPagination(result) {
        const container = document.getElementById('pagination-container');
        if (!container || result.totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        const { page, totalPages } = result;
        let paginationHTML = '<div class="exam-pagination">';

        // 이전 페이지
        paginationHTML += `
            <button class="exam-pagination-btn ${page <= 1 ? 'disabled' : ''}" 
                    onclick="examAdminUI.goToPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-left"></i>
            </button>
        `;

        // 페이지 번호
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="exam-pagination-btn ${i === page ? 'active' : ''}" 
                        onclick="examAdminUI.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        // 다음 페이지
        paginationHTML += `
            <button class="exam-pagination-btn ${page >= totalPages ? 'disabled' : ''}" 
                    onclick="examAdminUI.goToPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
                <i data-lucide="chevron-right"></i>
            </button>
        `;

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
        this.updateLucideIcons();
    }

    // ==================== 이벤트 핸들러 ====================

    /**
     * 🔍 검색 처리
     */
    async handleSearch() {
        this.currentPage = 1;
        if (this.currentView === 'questions') {
            await this.showQuestionsView();
        } else if (this.currentView === 'results') {
            await this.showResultsView();
        }
    }

    /**
     * 📄 페이지 이동
     */
    async goToPage(page) {
        if (page < 1) return;
        
        this.currentPage = page;
        if (this.currentView === 'questions') {
            await this.showQuestionsView();
        } else if (this.currentView === 'results') {
            await this.showResultsView();
        }
    }

    /**
     * 📝 문제 추가/수정 모달 표시
     */
    showQuestionModal(questionData = null) {
        const isEdit = !!questionData;
        const modalTitle = isEdit ? '문제 수정' : '새 문제 추가';
        const saveButtonText = isEdit ? '수정하기' : '추가하기';
        
        const modalHTML = `
            <div class="exam-modal-overlay" id="question-modal">
                <div class="exam-modal">
                    <div class="exam-modal-header">
                        <h2><i data-lucide="${isEdit ? 'edit' : 'plus'}"></i> ${modalTitle}</h2>
                        <button class="exam-modal-close" onclick="examAdminUI.closeModal()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="exam-modal-body">
                        <form id="question-form">
                            <div class="exam-form-group">
                                <label for="question-text">문제 내용 *</label>
                                <textarea id="question-text" name="question_text" rows="3" 
                                         placeholder="문제 내용을 입력하세요..." required>${questionData?.question_text || ''}</textarea>
                            </div>
                            
                            <div class="exam-form-row">
                                <div class="exam-form-group">
                                    <label for="question-type">문제 유형 *</label>
                                    <select id="question-type" name="question_type" required onchange="examAdminUI.handleQuestionTypeChange()">
                                        <option value="">선택하세요</option>
                                        <option value="multiple_choice" ${questionData?.question_type === 'multiple_choice' ? 'selected' : ''}>객관식</option>
                                        <option value="short_answer" ${questionData?.question_type === 'short_answer' ? 'selected' : ''}>단답형</option>
                                    </select>
                                </div>
                                
                                <div class="exam-form-group">
                                    <label for="question-points">배점 *</label>
                                    <input type="number" id="question-points" name="points" min="1" max="10" 
                                           value="${questionData?.points || 1}" required>
                                </div>
                            </div>
                            
                            <div id="options-container" style="display: none;">
                                <label>선택지 *</label>
                                <div id="options-list"></div>
                                <button type="button" class="exam-btn exam-btn-secondary exam-btn-sm" onclick="examAdminUI.addOption()">
                                    <i data-lucide="plus"></i> 선택지 추가
                                </button>
                            </div>
                            
                            <div class="exam-form-group">
                                <label for="correct-answer">정답 *</label>
                                <input type="text" id="correct-answer" name="correct_answer" 
                                       placeholder="정답을 입력하세요..." value="${questionData?.correct_answer || ''}" required>
                            </div>
                            
                            <div class="exam-form-group">
                                <label class="exam-checkbox-label">
                                    <input type="checkbox" id="is-active" name="is_active" ${questionData?.is_active !== false ? 'checked' : ''}>
                                    <span class="exam-checkbox-custom"></span>
                                    문제 활성화
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="exam-modal-footer">
                        <button type="button" class="exam-btn exam-btn-secondary" onclick="examAdminUI.closeModal()">취소</button>
                        <button type="button" class="exam-btn exam-btn-primary" onclick="examAdminUI.saveQuestion(${isEdit ? `'${questionData.id}'` : 'null'})">
                            <i data-lucide="save"></i> ${saveButtonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.updateLucideIcons();
        
        // 객관식인 경우 선택지 로드
        if (questionData?.question_type === 'multiple_choice') {
            this.handleQuestionTypeChange();
            if (questionData.options) {
                const options = Array.isArray(questionData.options) ? questionData.options : JSON.parse(questionData.options || '[]');
                options.forEach(option => {
                    this.addOption(option);
                });
            }
        }
    }

    /**
     * 📝 문제 유형 변경 처리
     */
    handleQuestionTypeChange() {
        const questionType = document.getElementById('question-type').value;
        const optionsContainer = document.getElementById('options-container');
        const correctAnswerInput = document.getElementById('correct-answer');
        
        if (questionType === 'multiple_choice') {
            optionsContainer.style.display = 'block';
            correctAnswerInput.placeholder = '선택지 중 정답을 입력하세요...';
        } else {
            optionsContainer.style.display = 'none';
            correctAnswerInput.placeholder = '정답을 입력하세요...';
            // 기존 선택지 모두 제거
            document.getElementById('options-list').innerHTML = '';
        }
    }

    /**
     * 📝 선택지 추가
     */
    addOption(value = '') {
        const optionsList = document.getElementById('options-list');
        const optionIndex = optionsList.children.length;
        
        const optionHTML = `
            <div class="exam-option-item">
                <input type="text" class="exam-option-input" placeholder="선택지 ${optionIndex + 1}" value="${value}" required>
                <button type="button" class="exam-btn exam-btn-sm exam-btn-danger" onclick="this.parentElement.remove()">
                    <i data-lucide="minus"></i>
                </button>
            </div>
        `;
        
        optionsList.insertAdjacentHTML('beforeend', optionHTML);
        this.updateLucideIcons();
    }

    /**
     * 💾 문제 저장
     */
    async saveQuestion(questionId = null) {
        try {
            const form = document.getElementById('question-form');
            const formData = new FormData(form);
            
            // 선택지 수집 (객관식인 경우)
            const questionType = formData.get('question_type');
            let options = null;
            
            if (questionType === 'multiple_choice') {
                const optionInputs = document.querySelectorAll('.exam-option-input');
                options = Array.from(optionInputs).map(input => input.value.trim()).filter(value => value);
                
                if (options.length < 2) {
                    this.showError('객관식 문제는 최소 2개의 선택지가 필요합니다.');
                    return;
                }
            }
            
            const questionData = {
                question_text: formData.get('question_text'),
                question_type: questionType,
                options: options,
                correct_answer: formData.get('correct_answer'),
                points: parseInt(formData.get('points')),
                is_active: formData.get('is_active') === 'on'
            };
            
            this.showLoading(true);
            
            if (questionId) {
                await window.ExamAdminAPI.updateQuestion(questionId, questionData);
                this.showSuccess('문제가 수정되었습니다.');
            } else {
                await window.ExamAdminAPI.createQuestion(questionData);
                this.showSuccess('새 문제가 추가되었습니다.');
            }
            
            this.closeModal();
            await this.showQuestionsView();
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ 문제 저장 실패:', error);
            this.showError(error.message || '문제 저장에 실패했습니다.');
            this.showLoading(false);
        }
    }

    // ==================== 문제 관리 액션 ====================

    /**
     * ✏️ 문제 수정
     */
    async editQuestion(questionId) {
        try {
            // 문제 상세 정보 조회
            const result = await window.ExamAdminAPI.getQuestions({ 
                page: 1, 
                limit: 1,
                search: questionId
            });
            
            const question = result.questions.find(q => q.id === questionId);
            if (!question) {
                this.showError('문제를 찾을 수 없습니다.');
                return;
            }
            
            this.showQuestionModal(question);
            
        } catch (error) {
            console.error('❌ 문제 조회 실패:', error);
            this.showError('문제 정보를 불러오는데 실패했습니다.');
        }
    }

    /**
     * 🔄 문제 활성화 토글
     */
    async toggleQuestionActive(questionId, isActive) {
        try {
            await window.ExamAdminAPI.toggleQuestionActive(questionId, isActive);
            this.showSuccess(`문제가 ${isActive ? '활성화' : '비활성화'}되었습니다.`);
            await this.showQuestionsView();
            
        } catch (error) {
            console.error('❌ 문제 활성화 토글 실패:', error);
            this.showError('문제 상태 변경에 실패했습니다.');
        }
    }

    /**
     * 🗑️ 문제 삭제
     */
    async deleteQuestion(questionId) {
        if (!confirm('정말로 이 문제를 삭제하시겠습니까?\n\n이미 시험에 사용된 문제는 삭제할 수 없습니다.')) {
            return;
        }
        
        try {
            await window.ExamAdminAPI.deleteQuestion(questionId);
            this.showSuccess('문제가 삭제되었습니다.');
            await this.showQuestionsView();
            
        } catch (error) {
            console.error('❌ 문제 삭제 실패:', error);
            this.showError(error.message || '문제 삭제에 실패했습니다.');
        }
    }

    // ==================== 시험 결과 관리 액션 ====================

    /**
     * 🔄 재시험 허용 토글
     */
    async toggleRetake(sessionId, allow) {
        try {
            await window.ExamAdminAPI.allowRetake(sessionId, allow);
            this.showSuccess(`재시험이 ${allow ? '허용' : '금지'}되었습니다.`);
            await this.showResultsView();
            
        } catch (error) {
            console.error('❌ 재시험 설정 실패:', error);
            this.showError('재시험 설정 변경에 실패했습니다.');
        }
    }

    /**
     * 👁️ 결과 상세보기
     */
    async viewResultDetails(sessionId) {
        // TODO: 결과 상세보기 모달 구현
        this.showInfo('결과 상세보기 기능은 준비 중입니다.');
    }

    // ==================== 통계 업데이트 ====================

    /**
     * 📊 문제 통계 업데이트
     */
    async updateQuestionStats() {
        try {
            const result = await window.ExamAdminAPI.getQuestions({ page: 1, limit: 1 });
            const activeResult = await window.ExamAdminAPI.getQuestions({ page: 1, limit: 1, activeOnly: true });
            
            document.getElementById('total-questions').textContent = result.total || 0;
            document.getElementById('active-questions').textContent = activeResult.total || 0;
            document.getElementById('inactive-questions').textContent = (result.total || 0) - (activeResult.total || 0);
            
        } catch (error) {
            console.error('❌ 문제 통계 업데이트 실패:', error);
        }
    }

    /**
     * 📊 시험 통계 업데이트
     */
    async updateExamStats() {
        try {
            const stats = await window.ExamAdminAPI.getExamStatistics();
            
            document.getElementById('total-sessions').textContent = stats.totalSessions;
            document.getElementById('passed-sessions').textContent = stats.passedSessions;
            document.getElementById('failed-sessions').textContent = stats.failedSessions;
            document.getElementById('pass-rate').textContent = `${Math.round(stats.passRate)}%`;
            document.getElementById('average-score').textContent = `${stats.averageScore}점`;
            
        } catch (error) {
            console.error('❌ 시험 통계 업데이트 실패:', error);
        }
    }

    // ==================== 유틸리티 ====================

    /**
     * 🔍 검색 키워드 가져오기
     */
    getSearchKeyword() {
        const searchInput = document.getElementById('question-search') || document.getElementById('result-search');
        return searchInput ? searchInput.value.trim() : '';
    }

    /**
     * 🏷️ 타입 필터 가져오기
     */
    getTypeFilter() {
        const typeFilter = document.getElementById('question-type-filter');
        return typeFilter ? typeFilter.value : 'all';
    }

    /**
     * ✅ 합격 상태 필터 가져오기
     */
    getPassStatusFilter() {
        const passFilter = document.getElementById('pass-status-filter');
        if (!passFilter || passFilter.value === 'all') return null;
        return passFilter.value === 'passed';
    }

    /**
     * 🚪 모달 닫기
     */
    closeModal() {
        const modals = document.querySelectorAll('.exam-modal-overlay');
        modals.forEach(modal => modal.remove());
    }

    /**
     * 📡 문제 이벤트 리스너 추가
     */
    attachQuestionEventListeners() {
        // 개별 이벤트 리스너들은 인라인으로 처리됨
    }

    /**
     * 🎨 Lucide 아이콘 업데이트
     */
    updateLucideIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * 🕰️ 디바운스 함수
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 🔄 로딩 표시
     */
    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * ❌ 에러 메시지 표시
     */
    showError(message) {
        if (window.ExamAdminUtils && window.ExamAdminUtils.showToast) {
            window.ExamAdminUtils.showToast(message, 'error');
        } else {
            alert('오류: ' + message);
        }
    }

    /**
     * ✅ 성공 메시지 표시
     */
    showSuccess(message) {
        if (window.ExamAdminUtils && window.ExamAdminUtils.showToast) {
            window.ExamAdminUtils.showToast(message, 'success');
        } else {
            console.log('✅ ' + message);
        }
    }

    /**
     * ℹ️ 정보 메시지 표시
     */
    showInfo(message) {
        if (window.ExamAdminUtils && window.ExamAdminUtils.showToast) {
            window.ExamAdminUtils.showToast(message, 'info');
        } else {
            alert('알림: ' + message);
        }
    }

    /**
     * 📊 모듈 상태 조회
     */
    getModuleStatus() {
        return this.moduleStatus;
    }
}

// 전역에 모듈 등록
if (typeof window !== 'undefined') {
    window.ExamAdminUI = new ExamAdminUI();
    window.examAdminUI = window.ExamAdminUI; // 편의를 위한 소문자 별칭
    console.log('🎨 ExamAdminUI v5.1.0 모듈 로드됨');
}