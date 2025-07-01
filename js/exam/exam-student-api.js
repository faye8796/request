/**
 * 📚 수료평가 시스템 - 학생 API 모듈 v5.2.0
 * 학생용 수료평가 응시를 위한 API 모듈
 * 완전 독립된 학생 전용 모듈
 */

class ExamStudentAPI {
    constructor() {
        this.moduleStatus = {
            initialized: false,
            name: 'ExamStudentAPI',
            version: '5.2.0',
            lastUpdate: new Date().toISOString()
        };
        this.supabaseClient = null;
        this.currentStudentId = null;
    }

    /**
     * 🚀 모듈 초기화
     */
    async initialize() {
        try {
            console.log('🔄 ExamStudentAPI v5.2.0 초기화 시작...');
            
            // Supabase 클라이언트 확인
            if (!window.supabase) {
                throw new Error('Supabase 클라이언트가 로드되지 않았습니다.');
            }
            
            this.supabaseClient = window.supabase;
            
            // 현재 학생 ID 확인
            const currentStudent = localStorage.getItem('currentStudent');
            if (!currentStudent) {
                throw new Error('로그인된 학생 정보가 없습니다.');
            }
            
            const studentData = JSON.parse(currentStudent);
            this.currentStudentId = studentData.id;
            
            // 연결 테스트
            await this.testConnection();
            
            this.moduleStatus.initialized = true;
            console.log('✅ ExamStudentAPI v5.2.0 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ ExamStudentAPI 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 🔗 DB 연결 테스트
     */
    async testConnection() {
        try {
            const { data, error } = await this.supabaseClient
                .from('exam_settings')
                .select('key, value')
                .limit(1);
            
            if (error) throw error;
            
            console.log('✅ ExamStudentAPI DB 연결 테스트 성공');
            return { success: true };
            
        } catch (error) {
            console.error('❌ ExamStudentAPI DB 연결 테스트 실패:', error);
            throw error;
        }
    }

    // ==================== 응시 자격 확인 ====================

    /**
     * 🎯 응시 자격 확인
     */
    async checkEligibility() {
        try {
            console.log('🎯 응시 자격 확인 중...');
            
            // 1. 시험 시스템 활성화 확인
            const examActive = await this.isExamActive();
            if (!examActive) {
                return {
                    eligible: false,
                    reason: 'exam_inactive',
                    message: '현재 수료평가가 비활성화되어 있습니다.'
                };
            }
            
            // 2. 활성 문제 존재 확인
            const activeQuestions = await this.getActiveQuestionsCount();
            if (activeQuestions === 0) {
                return {
                    eligible: false,
                    reason: 'no_questions',
                    message: '현재 출제된 문제가 없습니다.'
                };
            }
            
            // 3. 기존 응시 이력 확인
            const previousSession = await this.getPreviousSession();
            if (previousSession) {
                // 이미 합격한 경우
                if (previousSession.pass_status) {
                    return {
                        eligible: false,
                        reason: 'already_passed',
                        message: '이미 수료평가에 합격하셨습니다.',
                        previousSession
                    };
                }
                
                // 재시험이 허용되지 않은 경우
                if (!previousSession.retake_allowed) {
                    return {
                        eligible: false,
                        reason: 'retake_not_allowed',
                        message: '재시험이 허용되지 않았습니다. 관리자에게 문의하세요.',
                        previousSession
                    };
                }
            }
            
            return {
                eligible: true,
                activeQuestions,
                previousSession,
                message: '수료평가에 응시할 수 있습니다.'
            };
            
        } catch (error) {
            console.error('❌ 응시 자격 확인 실패:', error);
            return {
                eligible: false,
                reason: 'error',
                message: '응시 자격 확인 중 오류가 발생했습니다.'
            };
        }
    }

    /**
     * 🔍 시험 시스템 활성화 확인
     */
    async isExamActive() {
        try {
            const { data, error } = await this.supabaseClient
                .from('exam_settings')
                .select('value')
                .eq('key', 'exam_active')
                .single();
            
            if (error) {
                console.warn('시험 활성화 설정을 찾을 수 없음, 기본값 사용');
                return true; // 기본값: 활성화
            }
            
            return data.value === 'true' || data.value === true;
            
        } catch (error) {
            console.error('❌ 시험 활성화 확인 실패:', error);
            return true; // 오류 시 기본값
        }
    }

    /**
     * 📊 활성 문제 수 확인
     */
    async getActiveQuestionsCount() {
        try {
            const { count, error } = await this.supabaseClient
                .from('exam_questions')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            
            if (error) throw error;
            return count || 0;
            
        } catch (error) {
            console.error('❌ 활성 문제 수 확인 실패:', error);
            return 0;
        }
    }

    /**
     * 📚 이전 응시 기록 확인
     */
    async getPreviousSession() {
        try {
            const { data, error } = await this.supabaseClient
                .from('exam_sessions')
                .select('*')
                .eq('student_id', this.currentStudentId)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code === 'PGRST116') {
                // 레코드가 없음 (첫 응시)
                return null;
            }
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('❌ 이전 응시 기록 확인 실패:', error);
            return null;
        }
    }

    // ==================== 시험 문제 관리 ====================

    /**
     * 📋 활성 문제 조회 (시험 시작)
     */
    async getExamQuestions() {
        try {
            console.log('📋 시험 문제 조회 중...');
            
            const { data, error } = await this.supabaseClient
                .from('exam_questions')
                .select('id, question_text, question_type, options, points')
                .eq('is_active', true)
                .order('id', { ascending: true }); // 문제 순서 고정
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                throw new Error('출제된 문제가 없습니다.');
            }
            
            console.log(`✅ 시험 문제 조회 완료: ${data.length}개 문제`);
            return data;
            
        } catch (error) {
            console.error('❌ 시험 문제 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 🎯 합격 기준 점수 조회
     */
    async getPassScore() {
        try {
            const { data, error } = await this.supabaseClient
                .from('exam_settings')
                .select('value')
                .eq('key', 'pass_score')
                .single();
            
            if (error) {
                console.warn('합격 기준 점수를 찾을 수 없음, 기본값 사용');
                return 70; // 기본값: 70점
            }
            
            return parseInt(data.value) || 70;
            
        } catch (error) {
            console.error('❌ 합격 기준 점수 조회 실패:', error);
            return 70; // 오류 시 기본값
        }
    }

    // ==================== 시험 제출 및 채점 ====================

    /**
     * ✅ 시험 답안 제출 및 자동 채점
     */
    async submitExam(answers) {
        try {
            console.log('✅ 시험 답안 제출 시작...');
            
            // 1. 문제 정답 정보 조회
            const questions = await this.getQuestionsWithAnswers();
            const passScore = await this.getPassScore();
            
            // 2. 자동 채점
            const gradingResult = this.gradeAnswers(questions, answers);
            
            // 3. 합격/불합격 판정
            const percentage = gradingResult.maxScore > 0 ? 
                (gradingResult.totalScore / gradingResult.maxScore) * 100 : 0;
            const passStatus = percentage >= passScore;
            
            // 4. 시험 세션 저장
            const sessionData = {
                student_id: this.currentStudentId,
                submitted_at: new Date().toISOString(),
                total_score: gradingResult.totalScore,
                max_score: gradingResult.maxScore,
                pass_status: passStatus,
                answers: answers // JSON 형태로 저장
            };
            
            const { data: session, error: sessionError } = await this.supabaseClient
                .from('exam_sessions')
                .insert([sessionData])
                .select()
                .single();
            
            if (sessionError) throw sessionError;
            
            // 5. 상세 결과 저장
            await this.saveDetailedResults(session.id, gradingResult.details);
            
            console.log('✅ 시험 답안 제출 완료');
            
            return {
                sessionId: session.id,
                totalScore: gradingResult.totalScore,
                maxScore: gradingResult.maxScore,
                percentage: Math.round(percentage * 100) / 100,
                passStatus,
                passScore,
                details: gradingResult.details,
                submittedAt: session.submitted_at
            };
            
        } catch (error) {
            console.error('❌ 시험 답안 제출 실패:', error);
            throw error;
        }
    }

    /**
     * 📝 문제와 정답 정보 조회 (채점용)
     */
    async getQuestionsWithAnswers() {
        try {
            const { data, error } = await this.supabaseClient
                .from('exam_questions')
                .select('id, question_text, question_type, correct_answer, points')
                .eq('is_active', true)
                .order('id', { ascending: true });
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('❌ 문제 정답 정보 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 🎯 자동 채점 로직
     */
    gradeAnswers(questions, answers) {
        const details = [];
        let totalScore = 0;
        let maxScore = 0;
        
        questions.forEach(question => {
            const userAnswer = answers[question.id];
            let isCorrect = false;
            let pointsEarned = 0;
            
            maxScore += question.points;
            
            if (userAnswer) {
                // 정답 비교 (대소문자 무시, 공백 제거)
                const correctAnswer = question.correct_answer.trim().toLowerCase();
                const studentAnswer = userAnswer.trim().toLowerCase();
                
                isCorrect = correctAnswer === studentAnswer;
                if (isCorrect) {
                    pointsEarned = question.points;
                    totalScore += pointsEarned;
                }
            }
            
            details.push({
                questionId: question.id,
                questionText: question.question_text,
                correctAnswer: question.correct_answer,
                studentAnswer: userAnswer || '',
                isCorrect,
                pointsEarned,
                maxPoints: question.points
            });
        });
        
        return {
            totalScore,
            maxScore,
            details
        };
    }

    /**
     * 💾 상세 결과 저장
     */
    async saveDetailedResults(sessionId, details) {
        try {
            const resultsData = details.map(detail => ({
                session_id: sessionId,
                question_id: detail.questionId,
                student_answer: detail.studentAnswer,
                is_correct: detail.isCorrect,
                points_earned: detail.pointsEarned
            }));
            
            const { error } = await this.supabaseClient
                .from('exam_results')
                .insert(resultsData);
            
            if (error) throw error;
            
            console.log('✅ 상세 결과 저장 완료');
            
        } catch (error) {
            console.error('❌ 상세 결과 저장 실패:', error);
            throw error;
        }
    }

    // ==================== 결과 조회 ====================

    /**
     * 📊 학생의 모든 응시 결과 조회
     */
    async getStudentResults() {
        try {
            console.log('📊 학생 응시 결과 조회 중...');
            
            const { data, error } = await this.supabaseClient
                .from('exam_sessions')
                .select('*')
                .eq('student_id', this.currentStudentId)
                .order('submitted_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('❌ 학생 응시 결과 조회 실패:', error);
            return [];
        }
    }

    /**
     * 📋 특정 세션의 상세 결과 조회
     */
    async getSessionDetails(sessionId) {
        try {
            console.log('📋 세션 상세 결과 조회 중:', sessionId);
            
            // 세션 정보 조회
            const { data: session, error: sessionError } = await this.supabaseClient
                .from('exam_sessions')
                .select('*')
                .eq('id', sessionId)
                .eq('student_id', this.currentStudentId)
                .single();
            
            if (sessionError) throw sessionError;
            
            // 상세 결과 조회
            const { data: details, error: detailsError } = await this.supabaseClient
                .from('exam_results')
                .select(`
                    *,
                    exam_questions:question_id (
                        question_text,
                        question_type,
                        correct_answer,
                        points
                    )
                `)
                .eq('session_id', sessionId)
                .order('question_id', { ascending: true });
            
            if (detailsError) throw detailsError;
            
            return {
                session,
                details: details || []
            };
            
        } catch (error) {
            console.error('❌ 세션 상세 결과 조회 실패:', error);
            throw error;
        }
    }

    // ==================== 유틸리티 함수 ====================

    /**
     * 👤 현재 학생 정보 조회
     */
    getCurrentStudentInfo() {
        try {
            const currentStudent = localStorage.getItem('currentStudent');
            if (!currentStudent) return null;
            
            return JSON.parse(currentStudent);
        } catch (error) {
            console.error('❌ 현재 학생 정보 조회 실패:', error);
            return null;
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
    window.ExamStudentAPI = new ExamStudentAPI();
    console.log('📚 ExamStudentAPI v5.2.0 모듈 로드됨');
}