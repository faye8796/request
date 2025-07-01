/**
 * 📝 수료평가 시스템 - 관리자 API 모듈 v5.1.0
 * 수료평가 문제 관리, 시험 결과 조회를 위한 API 모듈
 * 기존 시스템과 완전 분리된 독립 모듈
 */

class ExamAdminAPI {
    constructor() {
        this.moduleStatus = {
            initialized: false,
            name: 'ExamAdminAPI',
            version: '5.1.0',
            lastUpdate: new Date().toISOString()
        };
        this.supabaseClient = null;
    }

    /**
     * 🚀 모듈 초기화
     */
    async initialize() {
        try {
            console.log('🔄 ExamAdminAPI v5.1.0 초기화 시작...');
            
            // Supabase 클라이언트 확인
            if (!window.supabase) {
                throw new Error('Supabase 클라이언트가 로드되지 않았습니다.');
            }
            
            this.supabaseClient = window.supabase;
            
            // 연결 테스트
            await this.testConnection();
            
            this.moduleStatus.initialized = true;
            console.log('✅ ExamAdminAPI v5.1.0 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ ExamAdminAPI 초기화 실패:', error);
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
            
            console.log('✅ ExamAdminAPI DB 연결 테스트 성공');
            return { success: true };
            
        } catch (error) {
            console.error('❌ ExamAdminAPI DB 연결 테스트 실패:', error);
            throw error;
        }
    }

    // ==================== 문제 관리 API ====================

    /**
     * 📋 모든 문제 조회 (페이지네이션)
     */
    async getQuestions(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                type = null,
                activeOnly = false
            } = options;
            
            let query = this.supabaseClient
                .from('exam_questions')
                .select('*', { count: 'exact' });
            
            // 활성화된 문제만
            if (activeOnly) {
                query = query.eq('is_active', true);
            }
            
            // 문제 유형 필터
            if (type && type !== 'all') {
                query = query.eq('question_type', type);
            }
            
            // 검색
            if (search.trim()) {
                query = query.ilike('question_text', `%${search.trim()}%`);
            }
            
            // 페이지네이션
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
            
            // 정렬 (최신순)
            query = query.order('id', { ascending: false });
            
            const { data, error, count } = await query;
            
            if (error) throw error;
            
            return {
                questions: data || [],
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
            
        } catch (error) {
            console.error('❌ 문제 조회 실패:', error);
            throw error;
        }
    }

    /**
     * ➕ 새 문제 생성
     */
    async createQuestion(questionData) {
        try {
            console.log('📝 새 문제 생성:', questionData);
            
            // 데이터 검증
            this.validateQuestionData(questionData);
            
            const { data, error } = await this.supabaseClient
                .from('exam_questions')
                .insert([
                    {
                        question_text: questionData.question_text.trim(),
                        question_type: questionData.question_type,
                        options: questionData.options || null,
                        correct_answer: questionData.correct_answer.trim(),
                        points: parseInt(questionData.points) || 1,
                        is_active: questionData.is_active !== false
                    }
                ])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ 문제 생성 성공:', data.id);
            return data;
            
        } catch (error) {
            console.error('❌ 문제 생성 실패:', error);
            throw error;
        }
    }

    /**
     * ✏️ 문제 수정
     */
    async updateQuestion(questionId, updateData) {
        try {
            console.log('📝 문제 수정:', questionId, updateData);
            
            // 데이터 검증
            this.validateQuestionData(updateData);
            
            const { data, error } = await this.supabaseClient
                .from('exam_questions')
                .update({
                    question_text: updateData.question_text.trim(),
                    question_type: updateData.question_type,
                    options: updateData.options || null,
                    correct_answer: updateData.correct_answer.trim(),
                    points: parseInt(updateData.points) || 1,
                    is_active: updateData.is_active !== false
                })
                .eq('id', questionId)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ 문제 수정 성공:', questionId);
            return data;
            
        } catch (error) {
            console.error('❌ 문제 수정 실패:', error);
            throw error;
        }
    }

    /**
     * 🗑️ 문제 삭제
     */
    async deleteQuestion(questionId) {
        try {
            console.log('🗑️ 문제 삭제:', questionId);
            
            // 먼저 해당 문제를 사용한 시험 결과가 있는지 확인
            const { data: results, error: resultsError } = await this.supabaseClient
                .from('exam_results')
                .select('id')
                .eq('question_id', questionId)
                .limit(1);
            
            if (resultsError) throw resultsError;
            
            if (results && results.length > 0) {
                throw new Error('이미 시험에 사용된 문제는 삭제할 수 없습니다. 비활성화하시기 바랍니다.');
            }
            
            const { error } = await this.supabaseClient
                .from('exam_questions')
                .delete()
                .eq('id', questionId);
            
            if (error) throw error;
            
            console.log('✅ 문제 삭제 성공:', questionId);
            return true;
            
        } catch (error) {
            console.error('❌ 문제 삭제 실패:', error);
            throw error;
        }
    }

    /**
     * 🔄 문제 활성화/비활성화 토글
     */
    async toggleQuestionActive(questionId, isActive) {
        try {
            console.log('🔄 문제 활성화 토글:', questionId, isActive);
            
            const { data, error } = await this.supabaseClient
                .from('exam_questions')
                .update({ is_active: isActive })
                .eq('id', questionId)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ 문제 활성화 토글 성공:', questionId);
            return data;
            
        } catch (error) {
            console.error('❌ 문제 활성화 토글 실패:', error);
            throw error;
        }
    }

    // ==================== 시험 결과 관리 API ====================

    /**
     * 📊 시험 통계 조회
     */
    async getExamStatistics() {
        try {
            // 전체 응시 세션 수
            const { count: totalSessions, error: sessionsError } = await this.supabaseClient
                .from('exam_sessions')
                .select('*', { count: 'exact', head: true });
            
            if (sessionsError) throw sessionsError;
            
            // 합격자 수
            const { count: passedSessions, error: passedError } = await this.supabaseClient
                .from('exam_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('pass_status', true);
            
            if (passedError) throw passedError;
            
            // 활성화된 문제 수
            const { count: activeQuestions, error: questionsError } = await this.supabaseClient
                .from('exam_questions')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            
            if (questionsError) throw questionsError;
            
            // 평균 점수 계산
            const { data: avgData, error: avgError } = await this.supabaseClient
                .from('exam_sessions')
                .select('total_score, max_score')
                .not('total_score', 'is', null);
            
            if (avgError) throw avgError;
            
            let averageScore = 0;
            if (avgData && avgData.length > 0) {
                const scores = avgData.map(session => 
                    session.max_score > 0 ? (session.total_score / session.max_score) * 100 : 0
                );
                averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            }
            
            return {
                totalSessions: totalSessions || 0,
                passedSessions: passedSessions || 0,
                failedSessions: (totalSessions || 0) - (passedSessions || 0),
                passRate: totalSessions > 0 ? ((passedSessions || 0) / totalSessions * 100) : 0,
                activeQuestions: activeQuestions || 0,
                averageScore: Math.round(averageScore * 100) / 100
            };
            
        } catch (error) {
            console.error('❌ 시험 통계 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 📋 시험 결과 목록 조회
     */
    async getExamResults(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                passStatus = null
            } = options;
            
            let query = this.supabaseClient
                .from('exam_sessions')
                .select(`
                    *,
                    user_profiles:student_id (
                        name,
                        sejong_institute,
                        field
                    )
                `, { count: 'exact' });
            
            // 합격/불합격 필터
            if (passStatus !== null) {
                query = query.eq('pass_status', passStatus);
            }
            
            // 학생 이름 검색
            if (search.trim()) {
                query = query.ilike('user_profiles.name', `%${search.trim()}%`);
            }
            
            // 페이지네이션
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
            
            // 정렬 (최신순)
            query = query.order('submitted_at', { ascending: false });
            
            const { data, error, count } = await query;
            
            if (error) throw error;
            
            return {
                results: data || [],
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
            
        } catch (error) {
            console.error('❌ 시험 결과 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 🔄 재시험 허용 설정
     */
    async allowRetake(sessionId, allow = true) {
        try {
            console.log('🔄 재시험 허용 설정:', sessionId, allow);
            
            const { data, error } = await this.supabaseClient
                .from('exam_sessions')
                .update({ retake_allowed: allow })
                .eq('id', sessionId)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ 재시험 허용 설정 성공:', sessionId);
            return data;
            
        } catch (error) {
            console.error('❌ 재시험 허용 설정 실패:', error);
            throw error;
        }
    }

    // ==================== 설정 관리 API ====================

    /**
     * ⚙️ 시험 설정 조회
     */
    async getExamSettings() {
        try {
            const { data, error } = await this.supabaseClient
                .from('exam_settings')
                .select('*');
            
            if (error) throw error;
            
            // 설정을 객체 형태로 변환
            const settings = {};
            (data || []).forEach(setting => {
                settings[setting.key] = setting.value;
            });
            
            return settings;
            
        } catch (error) {
            console.error('❌ 시험 설정 조회 실패:', error);
            throw error;
        }
    }

    /**
     * ⚙️ 시험 설정 업데이트
     */
    async updateExamSetting(key, value) {
        try {
            console.log('⚙️ 시험 설정 업데이트:', key, value);
            
            const { data, error } = await this.supabaseClient
                .from('exam_settings')
                .upsert({
                    key: key,
                    value: value.toString()
                }, {
                    onConflict: 'key'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ 시험 설정 업데이트 성공:', key);
            return data;
            
        } catch (error) {
            console.error('❌ 시험 설정 업데이트 실패:', error);
            throw error;
        }
    }

    // ==================== 유틸리티 함수 ====================

    /**
     * 🔍 문제 데이터 검증
     */
    validateQuestionData(data) {
        if (!data.question_text || !data.question_text.trim()) {
            throw new Error('문제 내용을 입력해주세요.');
        }
        
        if (!data.question_type || !['multiple_choice', 'short_answer'].includes(data.question_type)) {
            throw new Error('올바른 문제 유형을 선택해주세요.');
        }
        
        if (!data.correct_answer || !data.correct_answer.trim()) {
            throw new Error('정답을 입력해주세요.');
        }
        
        if (data.question_type === 'multiple_choice') {
            if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
                throw new Error('객관식 문제는 최소 2개의 선택지가 필요합니다.');
            }
            
            // 정답이 선택지에 포함되는지 확인
            if (!data.options.includes(data.correct_answer.trim())) {
                throw new Error('정답이 선택지에 포함되어야 합니다.');
            }
        }
        
        const points = parseInt(data.points);
        if (isNaN(points) || points < 1 || points > 10) {
            throw new Error('배점은 1~10점 사이여야 합니다.');
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
    window.ExamAdminAPI = new ExamAdminAPI();
    console.log('📝 ExamAdminAPI v5.1.0 모듈 로드됨');
}