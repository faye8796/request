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

console.log('🚀 SupabaseAPI v2.0 loaded - simplified and stable');
