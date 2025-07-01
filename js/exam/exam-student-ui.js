/**
 * 🎨 수료평가 시스템 - 학생 UI 관리 모듈 v5.2.0
 * 학생용 수료평가 응시 인터페이스 관리
 * 완전 독립된 학생 전용 UI 모듈
 */

class ExamStudentUI {
    constructor() {
        this.moduleStatus = {
            initialized: false,
            name: 'ExamStudentUI',
            version: '5.2.0',
            lastUpdate: new Date().toISOString()
        };
        
        this.examState = {
            status: 'loading', // loading, ready, taking, submitting, completed, error
            questions: [],
            answers: {},
            currentQuestionIndex: 0,
            timeStarted: null,
            eligibility: null,
            result: null
        };
        
        this.elements = {}; // DOM 요소 캐시
    }

    /**
     * 🚀 모듈 초기화
     */
    async initialize() {
        try {
            console.log('🔄 ExamStudentUI v5.2.0 초기화 시작...');
            
            // DOM 요소 캐시
            this.cacheElements();
            
            // 이벤트 리스너 등록
            this.bindEvents();
            
            // 초기 상태 설정
            await this.checkEligibilityAndRender();
            
            this.moduleStatus.initialized = true;
            console.log('✅ ExamStudentUI v5.2.0 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ ExamStudentUI 초기화 실패:', error);
            this.showError('시스템 초기화에 실패했습니다.');
            throw error;
        }
    }

    /**
     * 📦 DOM 요소 캐시
     */
    cacheElements() {
        this.elements = {
            // 메인 컨테이너
            mainContainer: document.getElementById('exam-main-container'),
            
            // 로딩 화면
            loadingView: document.getElementById('loading-view'),
            
            // 응시 전 화면
            preExamView: document.getElementById('pre-exam-view'),
            eligibilityStatus: document.getElementById('eligibility-status'),
            eligibilityMessage: document.getElementById('eligibility-message'),
            startExamBtn: document.getElementById('start-exam-btn'),
            previousResultsContainer: document.getElementById('previous-results-container'),
            
            // 시험 응시 화면
            examView: document.getElementById('exam-view'),
            examProgress: document.getElementById('exam-progress'),
            progressBar: document.getElementById('progress-bar'),
            progressText: document.getElementById('progress-text'),
            questionContainer: document.getElementById('question-container'),
            questionNumber: document.getElementById('question-number'),
            questionText: document.getElementById('question-text'),
            answerContainer: document.getElementById('answer-container'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            submitBtn: document.getElementById('submit-btn'),
            
            // 결과 화면
            resultView: document.getElementById('result-view'),
            resultSummary: document.getElementById('result-summary'),
            resultDetails: document.getElementById('result-details'),
            backToDashboardBtn: document.getElementById('back-to-dashboard-btn'),
            retakeBtn: document.getElementById('retake-btn')
        };
    }

    /**
     * 🔗 이벤트 리스너 등록
     */
    bindEvents() {
        // 시험 시작 버튼
        if (this.elements.startExamBtn) {
            this.elements.startExamBtn.addEventListener('click', () => this.startExam());
        }
        
        // 네비게이션 버튼들
        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', () => this.showPreviousQuestion());
        }
        
        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => this.showNextQuestion());
        }
        
        if (this.elements.submitBtn) {
            this.elements.submitBtn.addEventListener('click', () => this.confirmSubmitExam());
        }
        
        // 대시보드 돌아가기
        if (this.elements.backToDashboardBtn) {
            this.elements.backToDashboardBtn.addEventListener('click', () => this.goBackToDashboard());
        }
        
        // 재시험 버튼
        if (this.elements.retakeBtn) {
            this.elements.retakeBtn.addEventListener('click', () => this.retakeExam());
        }
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // 페이지 이탈 경고 (시험 중일 때만)
        window.addEventListener('beforeunload', (e) => {
            if (this.examState.status === 'taking') {
                e.preventDefault();
                e.returnValue = '시험을 진행 중입니다. 페이지를 나가면 답안이 저장되지 않을 수 있습니다.';
                return e.returnValue;
            }
        });
    }

    // ==================== 응시 자격 확인 및 초기 렌더링 ====================

    /**
     * 🎯 응시 자격 확인 및 화면 렌더링
     */
    async checkEligibilityAndRender() {
        try {
            this.showLoading('응시 자격을 확인하는 중입니다...');
            
            // ExamStudentAPI 모듈 확인
            if (!window.ExamStudentAPI || !window.ExamStudentAPI.moduleStatus.initialized) {
                throw new Error('ExamStudentAPI 모듈이 초기화되지 않았습니다.');
            }
            
            // 응시 자격 확인
            const eligibility = await window.ExamStudentAPI.checkEligibility();
            this.examState.eligibility = eligibility;
            
            // 이전 응시 결과 조회
            const previousResults = await window.ExamStudentAPI.getStudentResults();
            
            // 화면 렌더링
            this.renderPreExamView(eligibility, previousResults);
            
        } catch (error) {
            console.error('❌ 응시 자격 확인 실패:', error);
            this.showError('응시 자격 확인 중 오류가 발생했습니다: ' + error.message);
        }
    }

    /**
     * 🖥️ 응시 전 화면 렌더링
     */
    renderPreExamView(eligibility, previousResults) {
        this.hideAllViews();
        
        if (!this.elements.preExamView) return;
        
        // 응시 자격 상태 표시
        if (this.elements.eligibilityStatus && this.elements.eligibilityMessage) {
            const statusClass = eligibility.eligible ? 'eligible' : 'not-eligible';
            this.elements.eligibilityStatus.className = `eligibility-status ${statusClass}`;
            this.elements.eligibilityMessage.textContent = eligibility.message;
        }
        
        // 시험 시작 버튼 상태
        if (this.elements.startExamBtn) {
            this.elements.startExamBtn.disabled = !eligibility.eligible;
            this.elements.startExamBtn.textContent = eligibility.eligible ? '수료평가 시작' : '응시 불가';
        }
        
        // 이전 응시 결과 표시
        this.renderPreviousResults(previousResults);
        
        this.elements.preExamView.style.display = 'block';
    }

    /**
     * 📊 이전 응시 결과 렌더링
     */
    renderPreviousResults(results) {
        if (!this.elements.previousResultsContainer || !results || results.length === 0) {
            return;
        }
        
        const html = `
            <div class="previous-results">
                <h3>이전 응시 결과</h3>
                <div class="results-list">
                    ${results.map(result => this.generateResultCardHTML(result)).join('')}
                </div>
            </div>
        `;
        
        this.elements.previousResultsContainer.innerHTML = html;
    }

    /**
     * 🎴 결과 카드 HTML 생성
     */
    generateResultCardHTML(result) {
        const percentage = result.max_score > 0 ? 
            Math.round((result.total_score / result.max_score) * 100) : 0;
        const statusClass = result.pass_status ? 'passed' : 'failed';
        const statusText = result.pass_status ? '합격' : '불합격';
        const date = new Date(result.submitted_at).toLocaleString('ko-KR');
        
        return `
            <div class="result-card ${statusClass}">
                <div class="result-header">
                    <span class="result-status">${statusText}</span>
                    <span class="result-date">${date}</span>
                </div>
                <div class="result-score">
                    <span class="score">${result.total_score}/${result.max_score}점</span>
                    <span class="percentage">(${percentage}%)</span>
                </div>
                <button class="view-detail-btn" onclick="window.ExamStudentUI.viewResultDetail('${result.id}')">
                    <i data-lucide="eye"></i>
                    상세보기
                </button>
            </div>
        `;
    }

    // ==================== 시험 진행 관리 ====================

    /**
     * 🚀 시험 시작
     */
    async startExam() {
        try {
            if (!this.examState.eligibility?.eligible) {
                this.showError('응시 자격이 없습니다.');
                return;
            }
            
            this.showLoading('시험 문제를 불러오는 중입니다...');
            
            // 문제 조회
            const questions = await window.ExamStudentAPI.getExamQuestions();
            
            // 상태 초기화
            this.examState.status = 'taking';
            this.examState.questions = questions;
            this.examState.answers = {};
            this.examState.currentQuestionIndex = 0;
            this.examState.timeStarted = new Date();
            
            // 임시 저장된 답안 복원 시도
            this.restoreTempAnswers();
            
            // 시험 화면 렌더링
            this.renderExamView();
            
            console.log(`🚀 시험 시작 - 총 ${questions.length}개 문제`);
            
        } catch (error) {
            console.error('❌ 시험 시작 실패:', error);
            this.showError('시험을 시작할 수 없습니다: ' + error.message);
        }
    }

    /**
     * 🖥️ 시험 화면 렌더링
     */
    renderExamView() {
        this.hideAllViews();
        
        if (!this.elements.examView) return;
        
        // 진행률 업데이트
        this.updateProgress();
        
        // 현재 문제 표시
        this.showCurrentQuestion();
        
        // 네비게이션 버튼 상태 업데이트
        this.updateNavigationButtons();
        
        this.elements.examView.style.display = 'block';
    }

    /**
     * 📊 진행률 업데이트
     */
    updateProgress() {
        const total = this.examState.questions.length;
        const current = this.examState.currentQuestionIndex + 1;
        const percentage = (current / total) * 100;
        
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${percentage}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${current} / ${total}`;
        }
    }

    /**
     * 📝 현재 문제 표시
     */
    showCurrentQuestion() {
        const question = this.examState.questions[this.examState.currentQuestionIndex];
        if (!question) return;
        
        // 문제 번호
        if (this.elements.questionNumber) {
            this.elements.questionNumber.textContent = `문제 ${this.examState.currentQuestionIndex + 1}`;
        }
        
        // 문제 내용
        if (this.elements.questionText) {
            this.elements.questionText.textContent = question.question_text;
        }
        
        // 답안 입력 영역
        this.renderAnswerContainer(question);
    }

    /**
     * 📝 답안 입력 영역 렌더링
     */
    renderAnswerContainer(question) {
        if (!this.elements.answerContainer) return;
        
        const currentAnswer = this.examState.answers[question.id] || '';
        
        let html = '';
        
        if (question.question_type === 'multiple_choice') {
            // 객관식
            html = `
                <div class="answer-multiple-choice">
                    ${question.options.map((option, index) => `
                        <label class="answer-option">
                            <input type="radio" 
                                   name="question_${question.id}" 
                                   value="${option}"
                                   ${currentAnswer === option ? 'checked' : ''}
                                   onchange="window.ExamStudentUI.saveAnswer(${question.id}, this.value)">
                            <span class="option-text">${option}</span>
                        </label>
                    `).join('')}
                </div>
            `;
        } else {
            // 단답형
            html = `
                <div class="answer-short-answer">
                    <input type="text" 
                           class="answer-input"
                           placeholder="답안을 입력하세요"
                           value="${currentAnswer}"
                           oninput="window.ExamStudentUI.saveAnswer(${question.id}, this.value)"
                           maxlength="100">
                    <div class="answer-hint">
                        단답형 문제입니다. 정확한 답안을 입력해주세요.
                    </div>
                </div>
            `;
        }
        
        this.elements.answerContainer.innerHTML = html;
        
        // 포커스 설정
        const firstInput = this.elements.answerContainer.querySelector('input');
        if (firstInput && question.question_type === 'short_answer') {
            firstInput.focus();
        }
    }

    /**
     * 💾 답안 저장
     */
    saveAnswer(questionId, answer) {
        this.examState.answers[questionId] = answer;
        
        // 임시 저장 (브라우저 새로고침 대응)
        this.saveTempAnswers();
        
        console.log(`💾 답안 저장 - 문제 ${questionId}: ${answer}`);
    }

    /**
     * 🔄 네비게이션 버튼 상태 업데이트
     */
    updateNavigationButtons() {
        const isFirst = this.examState.currentQuestionIndex === 0;
        const isLast = this.examState.currentQuestionIndex === this.examState.questions.length - 1;
        
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = isFirst;
        }
        
        if (this.elements.nextBtn) {
            this.elements.nextBtn.style.display = isLast ? 'none' : 'inline-flex';
        }
        
        if (this.elements.submitBtn) {
            this.elements.submitBtn.style.display = isLast ? 'inline-flex' : 'none';
        }
    }

    /**
     * ⬅️ 이전 문제
     */
    showPreviousQuestion() {
        if (this.examState.currentQuestionIndex > 0) {
            this.examState.currentQuestionIndex--;
            this.showCurrentQuestion();
            this.updateProgress();
            this.updateNavigationButtons();
        }
    }

    /**
     * ➡️ 다음 문제
     */
    showNextQuestion() {
        if (this.examState.currentQuestionIndex < this.examState.questions.length - 1) {
            this.examState.currentQuestionIndex++;
            this.showCurrentQuestion();
            this.updateProgress();
            this.updateNavigationButtons();
        }
    }

    // ==================== 시험 제출 ====================

    /**
     * ✅ 시험 제출 확인
     */
    confirmSubmitExam() {
        const answeredCount = Object.keys(this.examState.answers).length;
        const totalCount = this.examState.questions.length;
        const unansweredCount = totalCount - answeredCount;
        
        let message = '시험을 제출하시겠습니까?';
        if (unansweredCount > 0) {
            message += `\n\n미답변 문제가 ${unansweredCount}개 있습니다. 그래도 제출하시겠습니까?`;
        }
        
        if (confirm(message)) {
            this.submitExam();
        }
    }

    /**
     * 📤 시험 제출
     */
    async submitExam() {
        try {
            this.examState.status = 'submitting';
            this.showLoading('답안을 제출하고 채점하는 중입니다...');
            
            // 답안 제출 및 채점
            const result = await window.ExamStudentAPI.submitExam(this.examState.answers);
            this.examState.result = result;
            this.examState.status = 'completed';
            
            // 임시 저장 데이터 삭제
            this.clearTempAnswers();
            
            // 결과 화면 표시
            this.renderResultView(result);
            
            console.log('✅ 시험 제출 완료:', result);
            
        } catch (error) {
            console.error('❌ 시험 제출 실패:', error);
            this.examState.status = 'taking';
            this.showError('시험 제출 중 오류가 발생했습니다: ' + error.message);
            this.renderExamView(); // 시험 화면으로 복원
        }
    }

    /**
     * 🏆 결과 화면 렌더링
     */
    renderResultView(result) {
        this.hideAllViews();
        
        if (!this.elements.resultView) return;
        
        // 결과 요약
        this.renderResultSummary(result);
        
        // 상세 결과
        this.renderResultDetails(result);
        
        this.elements.resultView.style.display = 'block';
    }

    /**
     * 📊 결과 요약 렌더링
     */
    renderResultSummary(result) {
        if (!this.elements.resultSummary) return;
        
        const statusClass = result.passStatus ? 'passed' : 'failed';
        const statusText = result.passStatus ? '합격' : '불합격';
        const date = new Date(result.submittedAt).toLocaleString('ko-KR');
        
        const html = `
            <div class="result-summary-card ${statusClass}">
                <div class="result-icon">
                    <i data-lucide="${result.passStatus ? 'check-circle' : 'x-circle'}"></i>
                </div>
                <h2 class="result-title">${statusText}</h2>
                <div class="result-score-display">
                    <div class="score-main">
                        ${result.totalScore}/${result.maxScore}점
                    </div>
                    <div class="score-percentage">
                        ${result.percentage}%
                    </div>
                </div>
                <div class="result-info">
                    <p>합격 기준: ${result.passScore}%</p>
                    <p>제출 시간: ${date}</p>
                </div>
            </div>
        `;
        
        this.elements.resultSummary.innerHTML = html;
    }

    /**
     * 📋 상세 결과 렌더링
     */
    renderResultDetails(result) {
        if (!this.elements.resultDetails || !result.details) return;
        
        const html = `
            <div class="result-details-container">
                <h3>문제별 상세 결과</h3>
                <div class="details-list">
                    ${result.details.map((detail, index) => `
                        <div class="detail-item ${detail.isCorrect ? 'correct' : 'incorrect'}">
                            <div class="detail-header">
                                <span class="question-num">문제 ${index + 1}</span>
                                <span class="detail-score">${detail.pointsEarned}/${detail.maxPoints}점</span>
                                <span class="detail-status">
                                    <i data-lucide="${detail.isCorrect ? 'check' : 'x'}"></i>
                                    ${detail.isCorrect ? '정답' : '오답'}
                                </span>
                            </div>
                            <div class="detail-content">
                                <p class="question-text">${detail.questionText}</p>
                                <div class="answers">
                                    <p class="correct-answer">
                                        <strong>정답:</strong> ${detail.correctAnswer}
                                    </p>
                                    <p class="student-answer">
                                        <strong>내 답안:</strong> ${detail.studentAnswer || '(미답변)'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.elements.resultDetails.innerHTML = html;
    }

    // ==================== 유틸리티 함수 ====================

    /**
     * 🔄 화면 전환 관리
     */
    hideAllViews() {
        ['loadingView', 'preExamView', 'examView', 'resultView'].forEach(viewName => {
            if (this.elements[viewName]) {
                this.elements[viewName].style.display = 'none';
            }
        });
    }

    /**
     * ⏳ 로딩 화면 표시
     */
    showLoading(message = '로딩 중...') {
        this.hideAllViews();
        
        if (this.elements.loadingView) {
            const loadingText = this.elements.loadingView.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
            this.elements.loadingView.style.display = 'block';
        }
    }

    /**
     * ❌ 오류 화면 표시
     */
    showError(message) {
        this.examState.status = 'error';
        
        if (this.elements.mainContainer) {
            this.elements.mainContainer.innerHTML = `
                <div class="error-view">
                    <div class="error-icon">
                        <i data-lucide="alert-circle"></i>
                    </div>
                    <h2>오류가 발생했습니다</h2>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="location.reload()">
                        <i data-lucide="refresh-cw"></i>
                        다시 시도
                    </button>
                </div>
            `;
            
            // 아이콘 초기화
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    /**
     * 💾 임시 답안 저장 (브라우저 새로고침 대응)
     */
    saveTempAnswers() {
        try {
            const tempData = {
                answers: this.examState.answers,
                questionIndex: this.examState.currentQuestionIndex,
                timeStarted: this.examState.timeStarted,
                timestamp: Date.now()
            };
            
            localStorage.setItem('examTempAnswers', JSON.stringify(tempData));
        } catch (error) {
            console.error('❌ 임시 답안 저장 실패:', error);
        }
    }

    /**
     * 🔄 임시 답안 복원
     */
    restoreTempAnswers() {
        try {
            const tempData = localStorage.getItem('examTempAnswers');
            if (!tempData) return;
            
            const data = JSON.parse(tempData);
            
            // 1시간 이내의 데이터만 복원
            if (Date.now() - data.timestamp > 60 * 60 * 1000) {
                this.clearTempAnswers();
                return;
            }
            
            this.examState.answers = data.answers || {};
            this.examState.currentQuestionIndex = data.questionIndex || 0;
            this.examState.timeStarted = data.timeStarted ? new Date(data.timeStarted) : new Date();
            
            console.log('🔄 임시 답안 복원 완료');
            
        } catch (error) {
            console.error('❌ 임시 답안 복원 실패:', error);
            this.clearTempAnswers();
        }
    }

    /**
     * 🗑️ 임시 답안 삭제
     */
    clearTempAnswers() {
        try {
            localStorage.removeItem('examTempAnswers');
        } catch (error) {
            console.error('❌ 임시 답안 삭제 실패:', error);
        }
    }

    /**
     * ⌨️ 키보드 단축키 처리
     */
    handleKeyboardShortcuts(e) {
        if (this.examState.status !== 'taking') return;
        
        // Ctrl + 좌/우 화살표로 문제 이동
        if (e.ctrlKey) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.showPreviousQuestion();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.showNextQuestion();
            }
        }
    }

    /**
     * 🏠 대시보드로 돌아가기
     */
    goBackToDashboard() {
        if (confirm('대시보드로 돌아가시겠습니까?')) {
            window.location.href = './dashboard.html';
        }
    }

    /**
     * 🔄 재시험
     */
    retakeExam() {
        if (confirm('재시험을 보시겠습니까?')) {
            // 상태 초기화
            this.examState.status = 'loading';
            this.examState.questions = [];
            this.examState.answers = {};
            this.examState.currentQuestionIndex = 0;
            this.examState.result = null;
            
            // 임시 답안 삭제
            this.clearTempAnswers();
            
            // 응시 자격 재확인
            this.checkEligibilityAndRender();
        }
    }

    /**
     * 👁️ 결과 상세보기
     */
    async viewResultDetail(sessionId) {
        try {
            this.showLoading('결과를 불러오는 중입니다...');
            
            const details = await window.ExamStudentAPI.getSessionDetails(sessionId);
            
            // 상세 결과를 결과 화면에 표시
            const resultData = {
                sessionId: details.session.id,
                totalScore: details.session.total_score,
                maxScore: details.session.max_score,
                percentage: details.session.max_score > 0 ? 
                    Math.round((details.session.total_score / details.session.max_score) * 100) : 0,
                passStatus: details.session.pass_status,
                passScore: await window.ExamStudentAPI.getPassScore(),
                submittedAt: details.session.submitted_at,
                details: details.details.map(detail => ({
                    questionText: detail.exam_questions.question_text,
                    correctAnswer: detail.exam_questions.correct_answer,
                    studentAnswer: detail.student_answer,
                    isCorrect: detail.is_correct,
                    pointsEarned: detail.points_earned,
                    maxPoints: detail.exam_questions.points
                }))
            };
            
            this.renderResultView(resultData);
            
        } catch (error) {
            console.error('❌ 결과 상세보기 실패:', error);
            this.showError('결과를 불러올 수 없습니다: ' + error.message);
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
    window.ExamStudentUI = new ExamStudentUI();
    console.log('🎨 ExamStudentUI v5.2.0 모듈 로드됨');
}