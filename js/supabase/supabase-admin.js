// 🔐 SupabaseAdmin - 관리자 전용 기능 모듈
// 세종학당 문화인턴 지원 시스템 - 관리자 시스템용 API
// v5.2.0 - 기능 설정 관리 추가 (getFeatureSettings, updateFeatureSetting)

/**
 * 관리자 전용 Supabase API 모듈
 * SupabaseCore에 의존하여 관리자 전용 기능들을 제공합니다.
 * 
 * 주요 기능:
 * - 🔐 관리자 인증 관리
 * - 📊 통계 및 대시보드 데이터
 * - 📚 수업계획 승인/반려 시스템
 * - 💰 예산 관리 시스템 (v4.3.1 하드코딩 제거)
 * - 📦 교구신청 관리 시스템
 * - 📄 영수증 관리 시스템
 * - ⚙️ 시스템 설정 관리
 * - 🆕 기능 설정 관리 (v5.2.0)
 * 
 * 🔧 v4.3.1 - 하드코딩된 예산 설정 기본값 완전 제거, 100% DB 기반
 * 🔧 v4.3.2 - 영수증 보기 기능 추가 (getReceiptByRequestId)
 * 🆕 v5.2.0 - 기능 설정 관리 추가 (getFeatureSettings, updateFeatureSetting)
 */

const SupabaseAdmin = {
    // SupabaseCore 참조
    get core() {
        if (!window.SupabaseCore) {
            throw new Error('SupabaseCore가 로드되지 않았습니다. supabase-core.js를 먼저 로드해주세요.');
        }
        return window.SupabaseCore;
    },

    // ===================
    // 🔐 관리자 인증
    // ===================
    
    /**
     * 관리자 인증
     * @param {string} code - 관리자 코드
     * @returns {Promise<Object>} 인증 결과
     */
    async authenticateAdmin(code) {
        try {
            console.log('🔐 관리자 인증 시작...');
            
            if (!window.CONFIG?.APP?.ADMIN_CODE) {
                return { success: false, message: '관리자 코드 설정이 없습니다.' };
            }

            if (code !== window.CONFIG.APP.ADMIN_CODE) {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            const result = await this.core.safeApiCall('관리자 인증', async () => {
                const client = await this.core.ensureClient();
                
                const { data, error } = await client
                    .from('user_profiles')
                    .select('*')
                    .eq('user_type', 'admin');

                if (error) {
                    return { data: null, error };
                }

                const admin = data && data.length > 0 ? data[0] : null;
                return { data: admin, error: null };
            });

            if (result.success) {
                let adminUser = result.data;
                if (!adminUser) {
                    // 관리자 계정이 없으면 생성
                    const createResult = await this.core.safeApiCall('관리자 계정 생성', async () => {
                        const client = await this.core.ensureClient();
                        
                        return await client
                            .from('user_profiles')
                            .insert([{
                                email: 'admin@sejong.or.kr',
                                name: '관리자',
                                user_type: 'admin'
                            }])
                            .select();
                    });

                    if (createResult.success && createResult.data && createResult.data.length > 0) {
                        adminUser = createResult.data[0];
                    } else {
                        return { success: false, message: '관리자 계정 생성 실패' };
                    }
                }

                // SupabaseCore에 현재 사용자 설정
                this.core.setCurrentUser(adminUser, 'admin');
                
                console.log('✅ 관리자 인증 성공');
                return { success: true, data: adminUser };
            }

            return result;
            
        } catch (error) {
            console.error('❌ 관리자 인증 오류:', error);
            return { success: false, message: this.core.getErrorMessage(error) };
        }
    },

    // ===================
    // 📊 통계 및 대시보드
    // ===================
    
    /**
     * 전체 통계 데이터 조회
     * @returns {Promise<Object>} 통계 데이터
     */
    async getStats() {
        console.log('📊 전체 통계 데이터 조회...');
        
        const result = await this.core.safeApiCall('통계 데이터 조회', async () => {
            const client = await this.core.ensureClient();
            
            // 전체 학생 수
            const totalStudentsResult = await client
                .from('user_profiles')
                .select('id', { count: 'exact' })
                .eq('user_type', 'student');

            // 신청자 수 (최소 1개 이상 신청한 학생)
            const applicantsResult = await client
                .from('requests')
                .select('user_id', { count: 'exact' })
                .not('user_id', 'is', null);

            // 대기 중인 신청 건수
            const pendingResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'pending');

            // 승인된 신청 건수
            const approvedResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'approved');

            // 구매완료 신청 건수
            const purchasedResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'purchased');

            if (totalStudentsResult.error) throw totalStudentsResult.error;
            if (applicantsResult.error) throw applicantsResult.error;
            if (pendingResult.error) throw pendingResult.error;
            if (approvedResult.error) throw approvedResult.error;
            if (purchasedResult.error) throw purchasedResult.error;

            // 신청자 수 계산 (중복 제거)
            const uniqueApplicants = new Set();
            if (applicantsResult.data) {
                applicantsResult.data.forEach(item => {
                    if (item.user_id) uniqueApplicants.add(item.user_id);
                });
            }

            return {
                data: {
                    totalStudents: totalStudentsResult.count || 0,
                    applicantCount: uniqueApplicants.size,
                    pendingCount: pendingResult.count || 0,
                    approvedCount: approvedResult.count || 0,
                    purchasedCount: purchasedResult.count || 0
                },
                error: null
            };
        });

        return result.success ? result.data : {
            totalStudents: 0,
            applicantCount: 0,
            pendingCount: 0,
            approvedCount: 0,
            purchasedCount: 0
        };
    },

    /**
     * 예산 현황 통계 조회 - student_budgets 기반 개선된 버전
     * @returns {Promise<Object>} 예산 현황 데이터
     */
    async getBudgetOverviewStats() {
        console.log('💰 예산 현황 통계 계산 시작... (student_budgets 기반 개선된 버전)');

        try {
            const client = await this.core.ensureClient();

            // 🎯 핵심 개선: student_budgets 테이블에서 실제 배정된 예산 조회
            const studentBudgetsResult = await client
                .from('student_budgets')
                .select(`
                    user_id,
                    allocated_budget,
                    used_budget,
                    special_request_amount,
                    special_request_status,
                    user_profiles:user_id (
                        name,
                        field
                    )
                `)
                .not('allocated_budget', 'is', null)
                .gt('allocated_budget', 0);

            // 승인된 신청들의 총액 (approved 상태)
            const approvedRequestsResult = await client
                .from('requests')
                .select('price')
                .eq('status', 'approved');

            // 구매완료된 신청들의 총액 (purchased 상태)
            const purchasedRequestsResult = await client
                .from('requests')
                .select('price, final_purchase_amount')
                .eq('status', 'purchased');

            // 🎯 핵심 개선: student_budgets 기반 실제 예산 계산
            let totalAllocatedBudget = 0;  // 실제 배정 예산 총액
            let totalSpecialBudget = 0;    // 특별 예산 신청 총액 (승인된 것만)
            let studentsWithBudget = 0;    // 예산이 배정된 학생 수

            if (studentBudgetsResult.data && studentBudgetsResult.data.length > 0) {
                console.log('✅ student_budgets 데이터 발견:', studentBudgetsResult.data.length, '명');

                studentBudgetsResult.data.forEach(budget => {
                    if (budget.allocated_budget && budget.allocated_budget > 0) {
                        // 실제 배정된 예산 합계 (모든 조정 사항 반영)
                        totalAllocatedBudget += budget.allocated_budget;
                        studentsWithBudget++;

                        // 특별 예산 신청 중 승인된 것만 별도 집계
                        if (budget.special_request_amount && 
                            budget.special_request_status === 'approved') {
                            totalSpecialBudget += budget.special_request_amount;
                        }
                    }
                });

                console.log('📊 student_budgets 기반 실제 예산 계산:', {
                    totalAllocatedBudget,
                    totalSpecialBudget,
                    studentsWithBudget,
                    averageAllocated: Math.round(totalAllocatedBudget / studentsWithBudget)
                });

            } else {
                console.warn('⚠️ student_budgets 데이터 없음 - 기존 방식으로 폴백');

                // 🔄 폴백: 기존 방식 (승인된 수업계획 기반)
                const approvedLessonPlansResult = await client
                    .from('lesson_plans')
                    .select(`
                        user_id,
                        lessons,
                        user_profiles:user_id (
                            field
                        )
                    `)
                    .eq('status', 'approved');

                const fieldBudgetSettings = await this.getAllFieldBudgetSettings();

                if (approvedLessonPlansResult.data) {
                    approvedLessonPlansResult.data.forEach(plan => {
                        const userField = plan.user_profiles?.field;
                        if (userField && fieldBudgetSettings[userField]) {
                            const fieldSetting = fieldBudgetSettings[userField];

                            // 수업 횟수 계산
                            let totalLessons = 0;
                            try {
                                if (plan.lessons) {
                                    let lessons = plan.lessons;
                                    if (typeof lessons === 'string') {
                                        lessons = JSON.parse(lessons);
                                    }

                                    if (lessons.totalLessons) {
                                        totalLessons = lessons.totalLessons;
                                    } else if (lessons.schedule && Array.isArray(lessons.schedule)) {
                                        totalLessons = lessons.schedule.length;
                                    } else if (lessons.lessons && Array.isArray(lessons.lessons)) {
                                        totalLessons = lessons.lessons.length;
                                    }
                                }
                            } catch (e) {
                                console.warn('수업계획 파싱 오류:', e);
                                totalLessons = 0;
                            }

                            // 예산 계산
                            const calculatedBudget = fieldSetting.perLessonAmount * totalLessons;
                            const finalBudget = fieldSetting.maxBudget > 0 ? 
                                Math.min(calculatedBudget, fieldSetting.maxBudget) : 
                                calculatedBudget;

                            totalAllocatedBudget += finalBudget;
                            studentsWithBudget++;
                        }
                    });
                }

                console.log('📊 폴백 계산 (수업계획 기반):', {
                    totalAllocatedBudget,
                    studentsWithBudget
                });
            }

            // 승인된 신청들의 총액
            const approvedItemsTotal = approvedRequestsResult.data ? 
                approvedRequestsResult.data.reduce((sum, request) => sum + (request.price || 0), 0) : 0;

            // 구매완료된 신청들의 총액 - 정확한 계산
            const purchasedTotal = purchasedRequestsResult.data ?
                purchasedRequestsResult.data.reduce((sum, request) => {
                    const amount = request.final_purchase_amount ?? request.price ?? 0;
                    return sum + amount;
                }, 0) : 0;

            // 🎯 핵심 개선: 실제 배정 예산 기반 1인당 평균 계산
            const averagePerPerson = studentsWithBudget > 0 ? 
                Math.round(totalAllocatedBudget / studentsWithBudget) : 0;

            const result = {
                totalApprovedBudget: totalAllocatedBudget, // 🆕 실제 배정 예산 (student_budgets 기반)
                approvedItemsTotal,
                purchasedTotal,
                averagePerPerson // 🆕 실제 배정 예산 기반 평균
            };

            console.log('✅ 예산 현황 통계 계산 완료 (student_budgets 기반):', result);
            console.log('📈 계산 방식:', studentsWithBudget > 0 ? 'student_budgets 기반' : '폴백 방식');
            console.log('🆕 특별 예산 포함:', totalSpecialBudget, '원');

            return result;

        } catch (error) {
            console.error('❌ 예산 현황 통계 계산 실패:', error);

            // 오류 발생시 기본값 반환
            return {
                totalApprovedBudget: 0,
                approvedItemsTotal: 0,
                purchasedTotal: 0,
                averagePerPerson: 0
            };
        }
    },

    /**
     * 신청 내역 검색
     * @param {string} searchTerm - 검색어
     * @returns {Promise<Array>} 검색된 신청 목록
     */
    async searchApplications(searchTerm = '') {
        console.log('🔍 신청 내역 검색:', searchTerm);
        
        const result = await this.core.safeApiCall('신청 내역 검색', async () => {
            const client = await this.core.ensureClient();
            
            let query = client
                .from('requests')
                .select(`
                    id,
                    user_id,
                    item_name,
                    purpose,
                    price,
                    status,
                    purchase_type,
                    is_bundle,
                    link,
                    store_info,
                    account_id,
                    account_pw,
                    rejection_reason,
                    created_at,
                    updated_at,
                    reviewed_at,
                    reviewed_by,
                    admin_receipt_url,         
                    final_purchase_amount,    
                    admin_purchase_date,   
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    ),
                    receipts!receipts_request_id_fkey (
                        file_url,
                        uploaded_at,
                        verified
                    )
                `)
                .order('created_at', { ascending: false });

            // 검색어가 있으면 필터링
            if (searchTerm && searchTerm.trim()) {
                // 먼저 사용자 프로필에서 이름으로 검색
                const userResult = await client
                    .from('user_profiles')
                    .select('id')
                    .ilike('name', `%${searchTerm}%`);

                if (userResult.data && userResult.data.length > 0) {
                    const userIds = userResult.data.map(user => user.id);
                    query = query.in('user_id', userIds);
                } else {
                    // 일치하는 사용자가 없으면 빈 결과 반환
                    return { data: [], error: null };
                }
            }

            return await query;
        });

        return result.success ? (result.data || []) : [];
    },

    // ===================
    // 📚 수업계획 관리
    // ===================
    
    /**
     * 대기중인 수업계획 조회
     * @returns {Promise<Array>} 대기중인 수업계획 목록
     */
    async getPendingLessonPlans() {
        console.log('📚 대기중인 수업계획 조회...');
        
        const result = await this.core.safeApiCall('대기중인 수업계획 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('lesson_plans')
                .select('*')
                .eq('status', 'submitted');
        });

        return result.success ? (result.data || []) : [];
    },

    /**
     * 수업계획 승인
     * @param {string} studentId - 학생 ID
     * @returns {Promise<Object>} 승인 결과
     */
    async approveLessonPlan(studentId) {
        console.log('📚 수업계획 승인 시작:', studentId);
        
        return await this.core.safeApiCall('수업계획 승인', async () => {
            const client = await this.core.ensureClient();
            
            try {
                const updateData = {
                    status: 'approved',
                    rejection_reason: null,
                    updated_at: new Date().toISOString()
                };

                console.log('📚 수업계획 승인 데이터:', updateData);

                const approveResult = await client
                    .from('lesson_plans')
                    .update(updateData)
                    .eq('user_id', studentId)
                    .eq('status', 'submitted')
                    .select();

                if (approveResult.error) {
                    console.error('❌ 수업계획 승인 DB 오류:', approveResult.error);
                    throw approveResult.error;
                }

                console.log('✅ 수업계획 승인 완료:', approveResult.data);
                
                if (!approveResult.data || approveResult.data.length === 0) {
                    console.warn('⚠️ 승인할 수업계획을 찾을 수 없습니다');
                    return {
                        data: null,
                        error: { message: '승인할 수업계획이 없습니다. 이미 처리되었거나 상태가 변경되었을 수 있습니다.' }
                    };
                }

                return approveResult;

            } catch (error) {
                console.error('❌ 수업계획 승인 처리 중 예외:', error);
                
                if (error.message && (error.message.includes('has no field') || error.code === '42703')) {
                    console.error('❌ 데이터베이스 컬럼 참조 오류 감지');
                    throw new Error('데이터베이스 구조 오류: 수업계획 테이블의 컬럼 구조를 확인해주세요.');
                }
                
                throw error;
            }
        });
    },

    /**
     * 수업계획 반려
     * @param {string} studentId - 학생 ID
     * @param {string} reason - 반려 사유
     * @returns {Promise<Object>} 반려 결과
     */
    async rejectLessonPlan(studentId, reason) {
        console.log('📚 수업계획 반려 시작:', studentId, reason);
        
        return await this.core.safeApiCall('수업계획 반려', async () => {
            const client = await this.core.ensureClient();
            
            try {
                const updateData = {
                    status: 'rejected',
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                };

                console.log('📚 수업계획 반려 데이터:', updateData);

                const rejectResult = await client
                    .from('lesson_plans')
                    .update(updateData)
                    .eq('user_id', studentId)
                    .eq('status', 'submitted')
                    .select();

                if (rejectResult.error) {
                    console.error('❌ 수업계획 반려 DB 오류:', rejectResult.error);
                    throw rejectResult.error;
                }

                console.log('✅ 수업계획 반려 완료:', rejectResult.data);
                
                if (!rejectResult.data || rejectResult.data.length === 0) {
                    console.warn('⚠️ 반려할 수업계획을 찾을 수 없습니다');
                    return {
                        data: null,
                        error: { message: '반려할 수업계획이 없습니다. 이미 처리되었거나 상태가 변경되었을 수 있습니다.' }
                    };
                }

                return rejectResult;

            } catch (error) {
                console.error('❌ 수업계획 반려 처리 중 예외:', error);
                throw error;
            }
        });
    },

    /**
     * 모든 수업계획 조회
     * @returns {Promise<Array>} 수업계획 목록
     */
    async getAllLessonPlans() {
        console.log('📚 모든 수업계획 조회...');
        
        const result = await this.core.safeApiCall('모든 수업계획 조회', async () => {
            const client = await this.core.ensureClient();
            
            // 수업계획 데이터 조회
            const lessonPlansResult = await client
                .from('lesson_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (lessonPlansResult.error) {
                return { data: null, error: lessonPlansResult.error };
            }

            const lessonPlans = lessonPlansResult.data || [];
            
            if (lessonPlans.length === 0) {
                return { data: [], error: null };
            }

            // 사용자 ID 목록 추출
            const userIds = [...new Set(lessonPlans.map(plan => plan.user_id).filter(id => id))];
            
            // 사용자 프로필 데이터 별도 조회
            let userProfiles = {};
            if (userIds.length > 0) {
                const profilesResult = await client
                    .from('user_profiles')
                    .select('id, name, field, sejong_institute')
                    .in('id', userIds);

                if (profilesResult.data) {
                    profilesResult.data.forEach(profile => {
                        userProfiles[profile.id] = profile;
                    });
                }
            }

            // 데이터 병합
            const enrichedPlans = lessonPlans.map(plan => {
                let approval_status = 'pending';
                
                if (plan.status === 'draft') {
                    approval_status = 'draft';
                } else if (plan.status === 'submitted') {
                    approval_status = 'pending';
                } else if (plan.status === 'approved') {
                    approval_status = 'approved';
                } else if (plan.status === 'rejected') {
                    approval_status = 'rejected';
                }
                
                const userProfile = userProfiles[plan.user_id] || {
                    id: plan.user_id,
                    name: '사용자 정보 없음',
                    field: '미설정',
                    sejong_institute: '미설정'
                };
                
                return {
                    ...plan,
                    approval_status,
                    user_profiles: userProfile
                };
            });
            
            return { data: enrichedPlans, error: null };
        });

        return result.success ? result.data : [];
    },

    /**
     * 수업계획 상태 업데이트
     * @param {number} planId - 수업계획 ID
     * @param {string} status - 새로운 상태
     * @param {string} rejectionReason - 반려 사유 (선택)
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateLessonPlanStatus(planId, status, rejectionReason = null) {
        console.log('📚 수업계획 상태 업데이트:', { planId, status, rejectionReason });
        
        return await this.core.safeApiCall('수업계획 상태 업데이트', async () => {
            const client = await this.core.ensureClient();
            
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            } else if (status === 'approved') {
                updateData.rejection_reason = null;
            }

            return await client
                .from('lesson_plans')
                .update(updateData)
                .eq('id', planId)
                .select();
        });
    },

    // ===================
    // 💰 예산 관리 - v4.3.1 하드코딩 제거
    // ===================
    
    /**
     * 모든 분야별 예산 설정 조회 - v4.3.1 하드코딩 제거
     * @returns {Promise<Object>} 분야별 예산 설정 (DB 전용)
     */
    async getAllFieldBudgetSettings() {
        console.log('💰 분야별 예산 설정 조회... (v4.3.1 DB 전용)');
        
        const result = await this.core.safeApiCall('분야별 예산 설정 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('budget_settings')
                .select('*')
                .order('field', { ascending: true });
        });

        if (result.success && result.data) {
            const settings = {};
            result.data.forEach(setting => {
                settings[setting.field] = {
                    perLessonAmount: setting.per_lesson_amount || 0,
                    maxBudget: setting.max_budget_limit || 0
                };
            });
            
            console.log('✅ v4.3.1 예산 설정 조회 완료 - DB 전용 (', Object.keys(settings).length, '개 분야)');
            return settings;
        }

        // ❌ 하드코딩된 기본 설정 완전 제거
        // ✅ DB 조회 실패시 빈 객체 반환
        console.log('📋 예산 설정 조회 결과: 빈 설정 (DB에 설정 없음)');
        return {};
    },

    /**
     * 분야별 예산 설정 업데이트
     * @param {string} field - 분야명
     * @param {Object} settings - 예산 설정
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateFieldBudgetSettings(field, settings) {
        console.log('💰 분야별 예산 설정 업데이트:', { field, settings });
        
        return await this.core.safeApiCall('분야별 예산 설정 업데이트', async () => {
            const client = await this.core.ensureClient();
            
            const updateData = {
                field: field,
                per_lesson_amount: settings.perLessonAmount || 0,
                max_budget_limit: settings.maxBudget || 0,
                updated_at: new Date().toISOString()
            };

            return await client
                .from('budget_settings')
                .upsert(updateData, {
                    onConflict: 'field'
                })
                .select();
        });
    },

    /**
     * 분야별 예산 현황 조회
     * @param {string} field - 분야명
     * @returns {Promise<Object>} 분야별 예산 현황
     */
    async getFieldBudgetStatus(field) {
        console.log(`📊 ${field} 분야 예산 현황 조회...`);
        
        try {
            const client = await this.core.ensureClient();
            
            // 해당 분야의 승인받은 수업계획을 가진 학생들 조회
            const approvedPlansResult = await client
                .from('lesson_plans')
                .select(`
                    user_id,
                    lessons,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .eq('status', 'approved')
                .eq('user_profiles.field', field);

            if (!approvedPlansResult.data) {
                return {
                    success: true,
                    data: {
                        students: [],
                        statistics: {
                            totalStudents: 0,
                            totalAllocated: 0,
                            totalUsed: 0,
                            utilizationRate: 0
                        }
                    }
                };
            }

            const fieldBudgetSettings = await this.getAllFieldBudgetSettings();
            const fieldSetting = fieldBudgetSettings[field] || { perLessonAmount: 0, maxBudget: 0 };
            
            // 각 학생의 예산 정보 계산
            const studentsWithBudget = await Promise.all(
                approvedPlansResult.data.map(async (plan) => {
                    // 수업 횟수 계산
                    let totalLessons = 0;
                    try {
                        if (plan.lessons) {
                            let lessons = plan.lessons;
                            if (typeof lessons === 'string') {
                                lessons = JSON.parse(lessons);
                            }
                            
                            if (lessons.totalLessons) {
                                totalLessons = lessons.totalLessons;
                            } else if (lessons.schedule && Array.isArray(lessons.schedule)) {
                                totalLessons = lessons.schedule.length;
                            }
                        }
                    } catch (e) {
                        console.warn('수업계획 파싱 오류:', e);
                    }

                    // 배정 예산 계산
                    const calculatedBudget = fieldSetting.perLessonAmount * totalLessons;
                    const allocatedBudget = fieldSetting.maxBudget > 0 ? 
                        Math.min(calculatedBudget, fieldSetting.maxBudget) : 
                        calculatedBudget;

                    // 사용 예산 계산
                    const usedBudgetResult = await client
                        .from('requests')
                        .select('price')
                        .eq('user_id', plan.user_id)
                        .in('status', ['approved', 'purchased']);

                    const usedBudget = usedBudgetResult.data ? 
                        usedBudgetResult.data.reduce((sum, req) => sum + (req.price || 0), 0) : 0;

                    return {
                        user_id: plan.user_id,
                        allocated_budget: allocatedBudget,
                        used_budget: usedBudget,
                        user_profiles: plan.user_profiles || {
                            name: '사용자 정보 없음',
                            sejong_institute: '미설정'
                        }
                    };
                })
            );

            // 통계 계산
            const statistics = {
                totalStudents: studentsWithBudget.length,
                totalAllocated: studentsWithBudget.reduce((sum, s) => sum + s.allocated_budget, 0),
                totalUsed: studentsWithBudget.reduce((sum, s) => sum + s.used_budget, 0),
                utilizationRate: 0
            };

            if (statistics.totalAllocated > 0) {
                statistics.utilizationRate = Math.round((statistics.totalUsed / statistics.totalAllocated) * 100);
            }

            return {
                success: true,
                data: {
                    students: studentsWithBudget,
                    statistics
                }
            };

        } catch (error) {
            console.error(`❌ ${field} 분야 예산 현황 조회 실패:`, error);
            return {
                success: false,
                message: '예산 현황을 조회할 수 없습니다.'
            };
        }
    },

    // ===================
    // 📦 교구신청 관리 - v4.3.0 호환성 (컬럼명 변경 대응)
    // ===================
    
    /**
     * 모든 교구신청 내역 조회
     * @returns {Promise<Array>} 신청 목록
     */
    async getAllApplications() {
        console.log('📦 모든 교구신청 내역 조회...');
        
        const result = await this.core.safeApiCall('모든 신청 내역 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('requests')
                .select(`
                    *,
                    admin_receipt_url,
                    final_purchase_amount,
                    admin_purchase_date,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .order('created_at', { ascending: false });
        });

        return result.success ? (result.data || []) : [];
    },

    /**
     * 교구신청 상태 업데이트
     * @param {number} applicationId - 신청 ID
     * @param {string} status - 새로운 상태
     * @param {string} rejectionReason - 반려 사유 (선택)
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateApplicationStatus(applicationId, status, rejectionReason = null) {
        console.log('📦 교구신청 상태 업데이트:', { applicationId, status, rejectionReason });
        
        return await this.core.safeApiCall('신청 상태 업데이트', async () => {
            const client = await this.core.ensureClient();
            
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            } else if (status === 'approved') {
                updateData.reviewed_at = new Date().toISOString();
                updateData.reviewed_by = this.core.getCurrentUser()?.id || null;
            }

            return await client
                .from('requests')
                .update(updateData)
                .eq('id', applicationId)
                .select();
        });
    },

    /**
     * 교구신청 아이템 상태 업데이트 (레거시 호환)
     * @param {number} requestId - 신청 ID
     * @param {string} status - 새로운 상태
     * @param {string} rejectionReason - 반려 사유 (선택)
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateItemStatus(requestId, status, rejectionReason = null) {
        return this.updateApplicationStatus(requestId, status, rejectionReason);
    },

    // ===================
    // 📄 영수증 관리 - v4.3.2 영수증 보기 기능 추가
    // ===================
    
    /**
     * 모든 영수증 조회 (관리자용)
     * @returns {Promise<Array>} 영수증 목록
     */
    async getAllReceipts() {
        console.log('📄 모든 영수증 조회 (관리자용)...');

        const result = await this.core.safeApiCall('모든 영수증 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('receipts')
                .select(`
                    id,
                    receipt_number,
                    purchase_date,
                    total_amount,
                    request_id,
                    user_id,
                    file_url,
                    file_name,
                    original_name,
                    file_size,
                    file_type,
                    purchase_store,
                    note,
                    uploaded_at,
                    verified,
                    verified_at,
                    verified_by,
                    updated_at,
                    requests:request_id (
                        item_name,
                        price,
                        purchase_type,
                        status,
                        user_profiles:user_id (
                            name,
                            field,
                            sejong_institute
                        )
                    )
                `)
                .order('uploaded_at', { ascending: false });
        });

        if (result.success && result.data) {
            return result.data.map(receipt => ({
                ...receipt,
                item_name: receipt.requests?.item_name,
                item_price: receipt.requests?.price,
                purchase_type: receipt.requests?.purchase_type,
                request_status: receipt.requests?.status,
                student_name: receipt.requests?.user_profiles?.name,
                student_field: receipt.requests?.user_profiles?.field,
                student_institute: receipt.requests?.user_profiles?.sejong_institute
            }));
        }

        return result.success ? (result.data || []) : [];
    },

    /**
     * 특정 교구 신청 ID로 영수증 조회 (영수증 보기 모달용) - v4.3.2 추가
     * @param {number} requestId - 교구 신청 ID
     * @returns {Promise<Object|null>} 영수증 데이터
     */
    async getReceiptByRequestId(requestId) {
        console.log('📄 특정 교구신청 영수증 조회:', requestId);
        
        const result = await this.core.safeApiCall('특정 영수증 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('receipts')
                .select(`
                    id,
                    receipt_number,
                    purchase_date,
                    total_amount,
                    request_id,
                    user_id,
                    file_url,
                    file_name,
                    original_name,
                    file_size,
                    file_type,
                    purchase_store,
                    note,
                    uploaded_at,
                    verified,
                    verified_at,
                    verified_by,
                    updated_at,
                    requests:request_id (
                        item_name,
                        price,
                        purchase_type,
                        status,
                        user_profiles:user_id (
                            name,
                            field,
                            sejong_institute
                        )
                    )
                `)
                .eq('request_id', requestId)
                .single(); // 단일 결과만 가져오기
        });

        if (result.success && result.data) {
            // admin-utils.js에서 기대하는 데이터 구조로 변환
            const receipt = result.data;
            return {
                ...receipt,
                item_name: receipt.requests?.item_name,
                student_name: receipt.requests?.user_profiles?.name,
                student_field: receipt.requests?.user_profiles?.field,
                student_institute: receipt.requests?.user_profiles?.sejong_institute,
                image_path: receipt.file_url, // admin-utils.js에서 기대하는 필드명
                store_name: receipt.purchase_store,
                notes: receipt.note,
                created_at: receipt.uploaded_at
            };
        }

        console.log('⚠️ 해당 교구 신청에 대한 영수증을 찾을 수 없음:', requestId);
        return null;
    },

    // ===================
    // ⚙️ 시스템 관리
    // ===================
    
    /**
     * 시스템 설정 조회
     * @returns {Promise<Object>} 시스템 설정
     */
    async getSystemSettings() {
        console.log('⚙️ 시스템 설정 조회...');
        
        const result = await this.core.safeApiCall('시스템 설정 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('system_settings')
                .select('setting_key, setting_value, setting_type');
        });

        if (result.success) {
            const settings = {};
            (result.data || []).forEach(item => {
                let value = item.setting_value;
                
                if (item.setting_type === 'boolean') {
                    value = value === 'true';
                } else if (item.setting_type === 'number') {
                    value = parseInt(value);
                } else if (item.setting_type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        console.warn(`JSON 설정 파싱 오류 (${item.setting_key}):`, e);
                    }
                }

                settings[item.setting_key] = value;
            });

            return settings;
        }

        // 기본 설정 반환
        return window.CONFIG?.APP?.DEFAULT_SYSTEM_SETTINGS || {
            test_mode: false,
            lesson_plan_deadline: '2024-12-31',
            ignore_deadline: false
        };
    },

    /**
     * 시스템 설정 업데이트
     * @param {string} key - 설정 키
     * @param {*} value - 설정 값
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateSystemSetting(key, value) {
        console.log('⚙️ 시스템 설정 업데이트:', { key, value });
        
        return await this.core.safeApiCall('시스템 설정 업데이트', async () => {
            const client = await this.core.ensureClient();
            
            let settingValue = value;
            let settingType = 'string';
            
            if (typeof value === 'boolean') {
                settingValue = value.toString();
                settingType = 'boolean';
            } else if (typeof value === 'number') {
                settingValue = value.toString();
                settingType = 'number';
            } else if (typeof value === 'object') {
                settingValue = JSON.stringify(value);
                settingType = 'json';
            }

            return await client
                .from('system_settings')
                .upsert({
                    setting_key: key,
                    setting_value: settingValue,
                    setting_type: settingType,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'setting_key'
                })
                .select();
        });
    },

    /**
     * 테스트 모드 토글
     * @returns {Promise<boolean>} 새로운 테스트 모드 상태
     */
    async toggleTestMode() {
        console.log('⚙️ 테스트 모드 토글...');
        
        const settings = await this.getSystemSettings();
        const newMode = !settings.test_mode;
        
        const result = await this.updateSystemSetting('test_mode', newMode);
        return result.success ? newMode : false;
    },

    // ===================
    // 🆕 v5.2.0 기능 설정 관리
    // ===================
    
    /**
     * 🆕 모든 기능 설정 조회 (v5.2.0)
     * @returns {Promise<Object>} 기능 설정 조회 결과
     */
    async getFeatureSettings() {
        console.log('⚙️ 기능 설정 조회 시작... (v5.2.0)');
        
        const result = await this.core.safeApiCall('기능 설정 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('feature_settings')
                .select('*')
                .order('display_order', { ascending: true });
        });

        if (result.success) {
            console.log('✅ 기능 설정 조회 완료:', result.data?.length || 0, '개 기능');
            return { success: true, data: result.data || [] };
        } else {
            console.error('❌ 기능 설정 조회 실패:', result.error || result.message);
            return { 
                success: false, 
                message: result.message || '기능 설정을 조회할 수 없습니다.',
                data: []
            };
        }
    },

    /**
     * 🆕 개별 기능 설정 업데이트 (v5.2.0)
     * @param {string} featureName - 기능명
     * @param {boolean} isActive - 활성화 상태
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateFeatureSetting(featureName, isActive) {
        console.log('⚙️ 기능 설정 업데이트:', { featureName, isActive });
        
        return await this.core.safeApiCall('기능 설정 업데이트', async () => {
            const client = await this.core.ensureClient();
            
            const updateData = {
                is_active: isActive,
                updated_at: new Date().toISOString(),
                updated_by: 'admin' // 관리자가 업데이트
            };

            return await client
                .from('feature_settings')
                .update(updateData)
                .eq('feature_name', featureName)
                .select();
        });
    },

    /**
     * Excel 내보내기용 데이터 준비 - v4.3.0 호환성
     * @returns {Promise<Array>} CSV 형태 데이터
     */
    async prepareExportData() {
        console.log('📊 Excel 내보내기용 데이터 준비...');
        
        const result = await this.core.safeApiCall('Excel 내보내기용 데이터 준비', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('requests')
                .select(`
                    *,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute,
                        birth_date
                    )
                `)
                .order('created_at', { ascending: false });
        });

        if (result.success && result.data) {
            // CSV 형태로 변환 - v4.3.0 호환성 (link 컬럼 사용)
            return result.data.map(item => ({
                '신청일': new Date(item.created_at).toLocaleDateString('ko-KR'),
                '학생명': item.user_profiles?.name || '알 수 없음',
                '세종학당': item.user_profiles?.sejong_institute || '미설정',
                '분야': item.user_profiles?.field || '미설정',
                '교구명': item.item_name || '',
                '사용목적': item.purpose || '',
                '가격': item.price || 0,
                '구매방식': item.purchase_type === 'offline' ? '오프라인' : '온라인',
                '구매링크': item.link || item.purchase_link || '', // 🔧 v4.3.0 호환성
                '묶음여부': item.is_bundle ? '묶음' : '단일',
                '상태': this.getStatusText(item.status),
                '승인일': item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString('ko-KR') : '',
                '반려사유': item.rejection_reason || ''
            }));
        }

        return [];
    },

    // ===================
    // 🛠️ 유틸리티 함수들
    // ===================
    
    /**
     * 상태 텍스트 반환
     * @param {string} status - 상태 코드
     * @returns {string} 상태 텍스트
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
        };
        return statusMap[status] || status;
    },

    /**
     * 상태 CSS 클래스 반환
     * @param {string} status - 상태 코드
     * @returns {string} CSS 클래스
     */
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
        };
        return statusMap[status] || 'secondary';
    },

    /**
     * 구매 방법 텍스트 반환
     * @param {string} method - 구매 방법
     * @returns {string} 구매 방법 텍스트
     */
    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    /**
     * 구매 방법 CSS 클래스 반환
     * @param {string} method - 구매 방법
     * @returns {string} CSS 클래스
     */
    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    }
};

// 전역 접근을 위해 window 객체에 추가
window.SupabaseAdmin = SupabaseAdmin;

console.log('🔐 SupabaseAdmin v5.2.0 모듈 로드 완료');
console.log('🆕 v5.2.0 새로운 기능: getFeatureSettings, updateFeatureSetting 추가');
console.log('✅ 관리자 대시보드 기능 토글 완전 지원');
