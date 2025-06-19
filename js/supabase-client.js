// 간소화된 Supabase API - 관리자 및 학생 시스템용
// intern-announcement 방식 기반으로 안정성 확보

const SupabaseAPI = {
    // Supabase 클라이언트
    supabase: null,
    
    // 현재 사용자 정보
    currentUser: null,
    currentUserType: null,

    // 초기화
    async init() {
        try {
            console.log('🚀 SupabaseAPI 초기화 중...');
            
            if (!window.supabase || !CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
                throw new Error('Supabase 설정이 올바르지 않습니다.');
            }
            
            this.supabase = window.supabase.createClient(
                CONFIG.SUPABASE.URL,
                CONFIG.SUPABASE.ANON_KEY
            );
            
            console.log('✅ SupabaseAPI 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ SupabaseAPI 초기화 실패:', error);
            return false;
        }
    },

    // 클라이언트 getter
    get client() {
        return this.supabase;
    },

    // 클라이언트 확보 함수
    async ensureClient() {
        if (!this.supabase) {
            await this.init();
        }
        return this.supabase;
    },

    // 안전한 API 호출 래퍼
    async safeApiCall(operation, apiFunction, context = {}) {
        try {
            if (!this.supabase) {
                await this.init();
            }
            
            const result = await apiFunction();
            
            if (result.error) {
                console.error(`❌ ${operation} 오류:`, result.error);
                return { 
                    success: false, 
                    message: this.getErrorMessage(result.error), 
                    error: result.error 
                };
            }
            
            console.log(`✅ ${operation} 성공`);
            return { success: true, data: result.data };
            
        } catch (error) {
            console.error(`❌ ${operation} 예외:`, error);
            return { 
                success: false, 
                message: this.getErrorMessage(error), 
                error: error 
            };
        }
    },

    // 에러 메시지 처리
    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error?.message) {
            if (error.message.includes('PGRST116')) {
                return '요청하신 데이터를 찾을 수 없습니다.';
            }
            if (error.message.includes('permission denied')) {
                return '접근 권한이 없습니다.';
            }
            if (error.message.includes('duplicate key')) {
                return '이미 존재하는 데이터입니다.';
            }
            if (error.message.includes('not null')) {
                return '필수 정보가 누락되었습니다.';
            }
            
            return error.message;
        }
        
        return '알 수 없는 오류가 발생했습니다.';
    },

    // ===================
    // 학생 인증
    // ===================
    async authenticateStudent(name, birthDate) {
        const result = await this.safeApiCall('학생 인증', async () => {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate);

            if (error) {
                return { data: null, error };
            }

            const user = data && data.length > 0 ? data[0] : null;
            return { data: user, error: null };
        });

        if (result.success && result.data) {
            this.currentUser = result.data;
            this.currentUserType = 'student';
        }

        return result;
    },

    // ===================
    // 관리자 인증
    // ===================
    async authenticateAdmin(code) {
        try {
            if (code !== CONFIG.APP.ADMIN_CODE) {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            const result = await this.safeApiCall('관리자 인증', async () => {
                const { data, error } = await this.supabase
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
                    const createResult = await this.safeApiCall('관리자 계정 생성', async () => {
                        return await this.supabase
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

                this.currentUser = adminUser;
                this.currentUserType = 'admin';
                
                return { success: true, data: adminUser };
            }

            return result;
        } catch (error) {
            console.error('❌ 관리자 인증 오류:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    },

    // ===================
    // 통계 데이터 (admin.js 호환)
    // ===================
    async getStats() {
        const result = await this.safeApiCall('통계 데이터 조회', async () => {
            const client = await this.ensureClient();
            
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

    // ===================
    // 예산 현황 통계 (admin.js 호환)
    // ===================
    async getBudgetOverviewStats() {
        const result = await this.safeApiCall('예산 현황 통계 조회', async () => {
            const client = await this.ensureClient();
            
            // 승인받은 학생들의 총 배정 예산
            const budgetResult = await client
                .from('user_budgets')
                .select('allocated_budget, used_budget');

            // 승인된 신청들의 총액
            const approvedRequestsResult = await client
                .from('requests')
                .select('price')
                .eq('status', 'approved');

            // 구매완료된 신청들의 총액
            const purchasedRequestsResult = await client
                .from('requests')
                .select('price')
                .eq('status', 'purchased');

            if (budgetResult.error) throw budgetResult.error;
            if (approvedRequestsResult.error) throw approvedRequestsResult.error;
            if (purchasedRequestsResult.error) throw purchasedRequestsResult.error;

            const budgets = budgetResult.data || [];
            const approvedRequests = approvedRequestsResult.data || [];
            const purchasedRequests = purchasedRequestsResult.data || [];

            const totalApprovedBudget = budgets.reduce((sum, budget) => sum + (budget.allocated_budget || 0), 0);
            const approvedItemsTotal = approvedRequests.reduce((sum, request) => sum + (request.price || 0), 0);
            const purchasedTotal = purchasedRequests.reduce((sum, request) => sum + (request.price || 0), 0);
            const averagePerPerson = budgets.length > 0 ? Math.round(totalApprovedBudget / budgets.length) : 0;

            return {
                data: {
                    totalApprovedBudget,
                    approvedItemsTotal,
                    purchasedTotal,
                    averagePerPerson
                },
                error: null
            };
        });

        return result.success ? result.data : {
            totalApprovedBudget: 0,
            approvedItemsTotal: 0,
            purchasedTotal: 0,
            averagePerPerson: 0
        };
    },

    // ===================
    // 신청 내역 검색 (admin.js 호환)
    // ===================
    async searchApplications(searchTerm = '') {
        const result = await this.safeApiCall('신청 내역 검색', async () => {
            const client = await this.ensureClient();
            
            let query = client
                .from('requests')
                .select(`
                    *,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
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
    // 대기중인 수업계획 조회 (admin.js 호환)
    // ===================
    async getPendingLessonPlans() {
        const result = await this.safeApiCall('대기중인 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('lesson_plans')
                .select('*')
                .eq('status', 'submitted')
                .is('approved_at', null)
                .is('rejection_reason', null);
        });

        return result.success ? (result.data || []) : [];
    },

    // ===================
    // 분야별 예산 설정 관리 (admin.js 호환)
    // ===================
    async getAllFieldBudgetSettings() {
        const result = await this.safeApiCall('분야별 예산 설정 조회', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('field_budget_settings')
                .select('*');
        });

        if (result.success && result.data) {
            const settings = {};
            result.data.forEach(setting => {
                settings[setting.field] = {
                    perLessonAmount: setting.per_lesson_amount || 0,
                    maxBudget: setting.max_budget || 0
                };
            });
            return settings;
        }

        // 기본 설정 반환
        return {
            '한국어교육': { perLessonAmount: 15000, maxBudget: 400000 },
            '전통문화예술': { perLessonAmount: 25000, maxBudget: 600000 },
            'K-Pop 문화': { perLessonAmount: 10000, maxBudget: 300000 },
            '한국현대문화': { perLessonAmount: 18000, maxBudget: 450000 },
            '전통음악': { perLessonAmount: 30000, maxBudget: 750000 },
            '한국미술': { perLessonAmount: 22000, maxBudget: 550000 },
            '한국요리문화': { perLessonAmount: 35000, maxBudget: 800000 }
        };
    },

    async updateFieldBudgetSettings(field, settings) {
        return await this.safeApiCall('분야별 예산 설정 업데이트', async () => {
            const client = await this.ensureClient();
            
            const updateData = {
                field: field,
                per_lesson_amount: settings.perLessonAmount || 0,
                max_budget: settings.maxBudget || 0,
                updated_at: new Date().toISOString()
            };

            // UPSERT 방식으로 업데이트
            return await client
                .from('field_budget_settings')
                .upsert(updateData, {
                    onConflict: 'field'
                })
                .select();
        });
    },

    async getFieldBudgetStatus(field) {
        const result = await this.safeApiCall('분야별 예산 현황 조회', async () => {
            const client = await this.ensureClient();
            
            // 해당 분야의 승인받은 학생들과 예산 정보
            const studentsResult = await client
                .from('user_budgets')
                .select(`
                    *,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .eq('user_profiles.field', field);

            if (studentsResult.error) throw studentsResult.error;

            const students = studentsResult.data || [];
            
            // 통계 계산
            const statistics = {
                totalStudents: students.length,
                totalAllocated: students.reduce((sum, s) => sum + (s.allocated_budget || 0), 0),
                totalUsed: students.reduce((sum, s) => sum + (s.used_budget || 0), 0),
                utilizationRate: 0
            };

            if (statistics.totalAllocated > 0) {
                statistics.utilizationRate = Math.round((statistics.totalUsed / statistics.totalAllocated) * 100);
            }

            return {
                data: {
                    students,
                    statistics
                },
                error: null
            };
        });

        return result;
    },

    // ===================
    // 수업계획 승인/반려 (admin.js 호환)
    // ===================
    async approveLessonPlan(studentId) {
        return await this.safeApiCall('수업계획 승인', async () => {
            const client = await this.ensureClient();
            
            // 수업계획 승인 처리
            const approveResult = await client
                .from('lesson_plans')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    approved_by: this.currentUser?.id || 'admin',
                    rejection_reason: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .select();

            if (approveResult.error) throw approveResult.error;

            // 예산 배정 로직은 여기에 추가 가능
            // TODO: 수업계획 기반 예산 배정

            return approveResult;
        });
    },

    async rejectLessonPlan(studentId, reason) {
        return await this.safeApiCall('수업계획 반려', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('lesson_plans')
                .update({
                    status: 'submitted',
                    rejection_reason: reason,
                    approved_at: null,
                    approved_by: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .select();
        });
    },

    // ===================
    // 교구 신청 상태 업데이트 (admin.js 호환)
    // ===================
    async updateItemStatus(requestId, status, rejectionReason = null) {
        return await this.safeApiCall('교구 신청 상태 업데이트', async () => {
            const client = await this.ensureClient();
            
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            } else if (status === 'approved') {
                updateData.approved_at = new Date().toISOString();
                updateData.approved_by = this.currentUser?.id || 'admin';
                updateData.rejection_reason = null;
            } else if (status === 'purchased') {
                updateData.purchased_at = new Date().toISOString();
            }

            return await client
                .from('requests')
                .update(updateData)
                .eq('id', requestId)
                .select();
        });
    },

    // ===================
    // Excel 내보내기용 데이터 준비 (admin.js 호환)
    // ===================
    async prepareExportData() {
        const result = await this.safeApiCall('Excel 내보내기용 데이터 준비', async () => {
            const client = await this.ensureClient();
            
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
            // CSV 형태로 변환
            return result.data.map(item => ({
                '신청일': new Date(item.created_at).toLocaleDateString('ko-KR'),
                '학생명': item.user_profiles?.name || '알 수 없음',
                '세종학당': item.user_profiles?.sejong_institute || '미설정',
                '분야': item.user_profiles?.field || '미설정',
                '교구명': item.item_name || '',
                '사용목적': item.purpose || '',
                '가격': item.price || 0,
                '구매방식': item.purchase_type === 'offline' ? '오프라인' : '온라인',
                '구매링크': item.purchase_link || '',
                '묶음여부': item.is_bundle ? '묶음' : '단일',
                '상태': this.getStatusText(item.status),
                '승인일': item.approved_at ? new Date(item.approved_at).toLocaleDateString('ko-KR') : '',
                '반려사유': item.rejection_reason || ''
            }));
        }

        return [];
    },

    // ===================
    // 시스템 설정 관리 (admin.js 호환)
    // ===================
    async updateSystemSetting(key, value) {
        return await this.safeApiCall('시스템 설정 업데이트', async () => {
            const client = await this.ensureClient();
            
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

    async toggleTestMode() {
        const settings = await this.getSystemSettings();
        const newMode = !settings.test_mode;
        
        const result = await this.updateSystemSetting('test_mode', newMode);
        return result.success ? newMode : false;
    },

    async canEditLessonPlan() {
        const settings = await this.getSystemSettings();
        
        if (settings.test_mode || settings.ignore_deadline) {
            return true;
        }
        
        if (settings.lesson_plan_deadline) {
            const deadline = new Date(settings.lesson_plan_deadline);
            const now = new Date();
            return now <= deadline;
        }
        
        return true; // 기본적으로 수정 가능
    },

    // ===================
    // 영수증 관리 (admin.js 호환)
    // ===================
    async getReceiptByRequestId(requestId) {
        const result = await this.safeApiCall('영수증 조회', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('receipts')
                .select(`
                    *,
                    requests:request_id (
                        item_name,
                        user_profiles:user_id (
                            name
                        )
                    )
                `)
                .eq('request_id', requestId)
                .single();
        });

        if (result.success) {
            const receipt = result.data;
            return {
                ...receipt,
                item_name: receipt.requests?.item_name,
                student_name: receipt.requests?.user_profiles?.name
            };
        }

        return null;
    },

    // ===================
    // 교구 신청 관리
    // ===================
    async getStudentApplications(studentId) {
        const result = await this.safeApiCall('학생 신청 내역 조회', async () => {
            return await this.supabase
                .from('requests')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });
        });

        return result.success ? (result.data || []) : [];
    },

    async createApplication(studentId, formData) {
        return await this.safeApiCall('교구 신청 생성', async () => {
            const requestData = {
                user_id: studentId,
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                purchase_link: formData.purchase_link || null,
                is_bundle: formData.is_bundle || false,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            return await this.supabase
                .from('requests')
                .insert([requestData])
                .select();
        });
    },

    // 모든 신청 내역 조회 (관리자용)
    async getAllApplications() {
        const result = await this.safeApiCall('모든 신청 내역 조회', async () => {
            return await this.supabase
                .from('requests')
                .select(`
                    *,
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

    // 신청 승인/반려
    async updateApplicationStatus(applicationId, status, rejectionReason = null) {
        return await this.safeApiCall('신청 상태 업데이트', async () => {
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            } else if (status === 'approved') {
                updateData.approved_at = new Date().toISOString();
                updateData.approved_by = this.currentUser?.id || 'admin';
            }

            return await this.supabase
                .from('requests')
                .update(updateData)
                .eq('id', applicationId)
                .select();
        });
    },

    // ===================
    // 수업계획 관리
    // ===================
    async getStudentLessonPlan(studentId) {
        const result = await this.safeApiCall('학생 수업계획 조회', async () => {
            const { data, error } = await this.supabase
                .from('lesson_plans')
                .select('*')
                .eq('user_id', studentId);

            if (error) {
                return { data: null, error };
            }

            const plan = data && data.length > 0 ? data[0] : null;
            return { data: plan, error: null };
        });

        return result.success ? result.data : null;
    },

    async saveLessonPlan(studentId, planData, isDraft = false) {
        return await this.safeApiCall('수업계획 저장', async () => {
            const status = isDraft ? 'draft' : 'submitted';
            const submitTime = isDraft ? null : new Date().toISOString();

            // 기존 수업계획 확인
            const existingResult = await this.supabase
                .from('lesson_plans')
                .select('id, status, approved_at, approved_by')
                .eq('user_id', studentId);

            const lessonPlanData = {
                user_id: studentId,
                status: status,
                lessons: planData,
                submitted_at: submitTime,
                updated_at: new Date().toISOString()
            };

            if (existingResult.data && existingResult.data.length > 0) {
                // 업데이트
                return await this.supabase
                    .from('lesson_plans')
                    .update(lessonPlanData)
                    .eq('user_id', studentId)
                    .select();
            } else {
                // 새로 생성
                return await this.supabase
                    .from('lesson_plans')
                    .insert([lessonPlanData])
                    .select();
            }
        });
    },

    async getAllLessonPlans() {
        const result = await this.safeApiCall('모든 수업계획 조회', async () => {
            // 수업계획 데이터 조회
            const lessonPlansResult = await this.supabase
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
                const profilesResult = await this.supabase
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
                    if (plan.approved_at && plan.approved_by && !plan.rejection_reason) {
                        approval_status = 'approved';
                    } else if (plan.rejection_reason && plan.rejection_reason.trim() !== '') {
                        approval_status = 'rejected';
                    } else {
                        approval_status = 'pending';
                    }
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

    // 수업계획 승인/반려
    async updateLessonPlanStatus(planId, status, rejectionReason = null) {
        return await this.safeApiCall('수업계획 상태 업데이트', async () => {
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'approved') {
                updateData.approved_at = new Date().toISOString();
                updateData.approved_by = this.currentUser?.id || 'admin';
                updateData.rejection_reason = null;
            } else if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
                updateData.approved_at = null;
                updateData.approved_by = null;
            }

            return await this.supabase
                .from('lesson_plans')
                .update(updateData)
                .eq('id', planId)
                .select();
        });
    },

    // ===================
    // 시스템 설정
    // ===================
    async getSystemSettings() {
        const result = await this.safeApiCall('시스템 설정 조회', async () => {
            return await this.supabase
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
        return CONFIG?.APP?.DEFAULT_SYSTEM_SETTINGS || {
            test_mode: false,
            lesson_plan_deadline: '2024-12-31',
            ignore_deadline: false
        };
    },

    // ===================
    // 유틸리티 함수들
    // ===================
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    },

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        try {
            sessionStorage.removeItem('userSession');
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
        } catch (error) {
            console.warn('세션 정리 실패:', error);
        }
        console.log('✅ 로그아웃 완료');
    },

    // 연결 테스트
    async testConnection() {
        return await this.safeApiCall('연결 테스트', async () => {
            return await this.supabase
                .from('system_settings')
                .select('setting_key')
                .limit(1);
        });
    }
};

// 자동 초기화
(async () => {
    // CONFIG 로드 대기
    let waitCount = 0;
    while (!window.CONFIG && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (window.CONFIG) {
        await SupabaseAPI.init();
    } else {
        console.warn('⚠️ CONFIG 로드 타임아웃 - SupabaseAPI 수동 초기화 필요');
    }
})();

// 전역 접근을 위해 window 객체에 추가
window.SupabaseAPI = SupabaseAPI;

console.log('🚀 SupabaseAPI v2.1 loaded - admin.js 호환성 완료');