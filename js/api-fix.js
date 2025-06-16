// API 호출 오류 수정 및 교구 신청 기능 강화 - 완전 구현 버전
// Supabase API 오류 처리, 재시도 로직, 교구 신청 관련 누락된 함수들 구현

(function() {
    'use strict';

    console.log('🔧 API 수정 스크립트 로드 시작 (완전 구현 버전)');

    // 재시도 설정
    const RETRY_CONFIG = {
        maxRetries: 3,
        baseDelay: 1000, // 1초
        maxDelay: 5000,  // 5초
        retryableErrors: [
            'fetch', 'network', 'timeout', 'ECONNRESET', 'ENOTFOUND', 
            'ECONNREFUSED', 'ETIMEDOUT', '503', '502', '500', '429', '408'
        ]
    };

    // SupabaseAPI가 로드될 때까지 대기
    function waitForSupabaseAPI() {
        return new Promise((resolve) => {
            if (window.SupabaseAPI) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.SupabaseAPI) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                // 10초 후 타임아웃
                setTimeout(() => {
                    clearInterval(checkInterval);
                    console.error('⚠️ SupabaseAPI 로드 타임아웃');
                    resolve(); // 타임아웃되어도 계속 진행
                }, 10000);
            }
        });
    }

    // 재시도 가능한 오류인지 확인
    function isRetryableError(error) {
        if (!error) return false;
        
        const errorStr = (error.message || error.toString() || '').toLowerCase();
        return RETRY_CONFIG.retryableErrors.some(retryableError => 
            errorStr.includes(retryableError.toLowerCase())
        );
    }

    // 지수 백오프 지연 계산
    function calculateDelay(attempt) {
        const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
            RETRY_CONFIG.maxDelay
        );
        // 지터 추가 (랜덤성)
        return delay + Math.random() * 1000;
    }

    // 강화된 재시도 로직
    async function retryApiCall(apiFunction, context = {}, maxRetries = RETRY_CONFIG.maxRetries) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = calculateDelay(attempt - 1);
                    console.log(`🔄 API 재시도 ${attempt}/${maxRetries} (${delay.toFixed(0)}ms 대기)`, context);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                const result = await apiFunction();
                
                if (attempt > 0) {
                    console.log('✅ API 재시도 성공', context);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                console.error(`❌ API 호출 실패 (시도 ${attempt + 1}/${maxRetries + 1}):`, error, context);
                
                // 재시도 불가능한 오류이거나 마지막 시도인 경우
                if (!isRetryableError(error) || attempt === maxRetries) {
                    break;
                }
            }
        }
        
        console.error(`💥 API 호출 최종 실패 (${maxRetries + 1}회 시도)`, lastError, context);
        throw lastError;
    }

    // 네트워크 상태 모니터링
    function initializeNetworkMonitoring() {
        let wasOffline = false;
        
        function handleOnline() {
            if (wasOffline) {
                console.log('🌐 네트워크 연결 복구됨 - API 재연결 시도');
                wasOffline = false;
                
                // 연결 복구 시 알림
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed; top: 20px; right: 20px; z-index: 9999;
                    background: #10b981; color: white; padding: 12px 16px;
                    border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-size: 14px; font-weight: 500;
                `;
                notification.textContent = '✅ 네트워크 연결이 복구되었습니다';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 3000);
                
                // 필요시 데이터 새로고침
                if (typeof window.StudentManager !== 'undefined' && window.StudentManager.refreshDashboard) {
                    setTimeout(() => {
                        window.StudentManager.refreshDashboard();
                    }, 1000);
                }
            }
        }
        
        function handleOffline() {
            wasOffline = true;
            console.log('🚫 네트워크 연결 끊어짐');
            
            // 오프라인 알림
            const notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                background: #ef4444; color: white; padding: 12px 16px;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-size: 14px; font-weight: 500;
            `;
            notification.textContent = '⚠️ 네트워크 연결이 끊어졌습니다';
            document.body.appendChild(notification);
        }
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // 초기 상태 확인
        if (!navigator.onLine) {
            handleOffline();
        }
    }

    // API 함수들 패치
    async function patchSupabaseAPI() {
        await waitForSupabaseAPI();
        
        console.log('🔧 SupabaseAPI 패치 시작 (완전 구현)');

        if (!window.SupabaseAPI) {
            console.error('❌ SupabaseAPI를 찾을 수 없습니다');
            return;
        }

        // 기존 safeApiCall 강화
        const originalSafeApiCall = window.SupabaseAPI.safeApiCall;
        window.SupabaseAPI.safeApiCall = async function(operation, apiFunction, context = {}) {
            try {
                console.log(`🚀 API 호출: ${operation}`, context);
                
                const result = await retryApiCall(async () => {
                    if (originalSafeApiCall) {
                        return await originalSafeApiCall.call(this, operation, apiFunction, context);
                    } else {
                        // 기본 safeApiCall 구현
                        try {
                            const data = await apiFunction();
                            return { success: true, data, error: null };
                        } catch (error) {
                            console.error(`API 오류 (${operation}):`, error);
                            return { 
                                success: false, 
                                data: null, 
                                error: error,
                                message: error.message || '알 수 없는 오류가 발생했습니다'
                            };
                        }
                    }
                }, context);
                
                console.log(`✅ API 성공: ${operation}`, context);
                return result;
            } catch (error) {
                console.error(`💥 API 최종 실패: ${operation}`, error, context);
                
                // 사용자 친화적 오류 메시지 생성
                let userMessage = '네트워크 연결을 확인하고 다시 시도해주세요.';
                
                if (error.message) {
                    if (error.message.includes('network') || error.message.includes('fetch')) {
                        userMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.';
                    } else if (error.message.includes('timeout')) {
                        userMessage = '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
                    } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
                        userMessage = '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
                    }
                }
                
                return { 
                    success: false, 
                    data: null, 
                    error: error,
                    message: userMessage
                };\n            }\n        };\n\n        // 교구 신청 생성 함수 구현/강화\n        window.SupabaseAPI.createApplication = async function(studentId, applicationData) {\n            return await this.safeApiCall('교구 신청 생성', async () => {\n                const client = await this.ensureClient();\n                \n                // 데이터 검증\n                if (!applicationData.item_name || !applicationData.purpose || !applicationData.price) {\n                    throw new Error('필수 입력 항목이 누락되었습니다.');\n                }\n                \n                // 온라인 구매시 링크 필수 검증 (API 레벨에서도 확인)\n                if (applicationData.purchase_type === 'online' && !applicationData.purchase_link) {\n                    throw new Error('온라인 구매의 경우 구매 링크가 필수입니다.');\n                }\n                \n                const requestData = {\n                    user_id: studentId,\n                    item_name: applicationData.item_name,\n                    purpose: applicationData.purpose,\n                    price: applicationData.price,\n                    purchase_type: applicationData.purchase_type || 'online',\n                    purchase_link: applicationData.purchase_link || null,\n                    is_bundle: applicationData.is_bundle || false,\n                    bundle_info: applicationData.bundle_credentials ? JSON.stringify(applicationData.bundle_credentials) : null,\n                    status: 'pending',\n                    created_at: new Date().toISOString()\n                };\n\n                const { data, error } = await client\n                    .from('requests')\n                    .insert([requestData])\n                    .select();\n                    \n                if (error) {\n                    console.error('교구 신청 생성 DB 오류:', error);\n                    throw new Error(`교구 신청 등록에 실패했습니다: ${error.message}`);\n                }\n                \n                return data;\n            }, { studentId, itemName: applicationData.item_name });\n        };\n\n        // 묶음 신청 생성 함수 구현/강화\n        window.SupabaseAPI.createBundleApplication = async function(studentId, bundleData) {\n            return await this.safeApiCall('묶음 교구 신청 생성', async () => {\n                const client = await this.ensureClient();\n                \n                // 데이터 검증\n                if (!bundleData.item_name || !bundleData.purpose || !bundleData.price) {\n                    throw new Error('필수 입력 항목이 누락되었습니다.');\n                }\n                \n                if (!bundleData.purchase_link) {\n                    throw new Error('묶음 구매의 경우 구매 링크가 필수입니다.');\n                }\n                \n                if (!bundleData.bundle_credentials || !bundleData.bundle_credentials.user_id || !bundleData.bundle_credentials.password) {\n                    throw new Error('묶음 구매의 경우 계정 정보가 필수입니다.');\n                }\n                \n                const requestData = {\n                    user_id: studentId,\n                    item_name: bundleData.item_name,\n                    purpose: bundleData.purpose,\n                    price: bundleData.price,\n                    purchase_type: 'online', // 묶음은 항상 온라인\n                    purchase_link: bundleData.purchase_link,\n                    is_bundle: true,\n                    bundle_info: JSON.stringify(bundleData.bundle_credentials),\n                    status: 'pending',\n                    created_at: new Date().toISOString()\n                };\n\n                const { data, error } = await client\n                    .from('requests')\n                    .insert([requestData])\n                    .select();\n                    \n                if (error) {\n                    console.error('묶음 신청 생성 DB 오류:', error);\n                    throw new Error(`묶음 신청 등록에 실패했습니다: ${error.message}`);\n                }\n                \n                return data;\n            }, { studentId, bundleName: bundleData.item_name });\n        };\n\n        // 교구 신청 수정 함수 구현/강화\n        window.SupabaseAPI.updateApplication = async function(applicationId, applicationData) {\n            return await this.safeApiCall('교구 신청 수정', async () => {\n                const client = await this.ensureClient();\n                \n                // 데이터 검증\n                if (!applicationData.item_name || !applicationData.purpose || !applicationData.price) {\n                    throw new Error('필수 입력 항목이 누락되었습니다.');\n                }\n                \n                // 온라인 구매시 링크 필수 검증\n                if (applicationData.purchase_type === 'online' && !applicationData.purchase_link) {\n                    throw new Error('온라인 구매의 경우 구매 링크가 필수입니다.');\n                }\n                \n                const updateData = {\n                    item_name: applicationData.item_name,\n                    purpose: applicationData.purpose,\n                    price: applicationData.price,\n                    purchase_type: applicationData.purchase_type || 'online',\n                    purchase_link: applicationData.purchase_link || null,\n                    updated_at: new Date().toISOString()\n                };\n\n                const { data, error } = await client\n                    .from('requests')\n                    .update(updateData)\n                    .eq('id', applicationId)\n                    .select();\n                    \n                if (error) {\n                    console.error('교구 신청 수정 DB 오류:', error);\n                    throw new Error(`교구 신청 수정에 실패했습니다: ${error.message}`);\n                }\n                \n                return data;\n            }, { applicationId, itemName: applicationData.item_name });\n        };\n\n        // 교구 신청 삭제 함수 구현/강화\n        window.SupabaseAPI.deleteApplication = async function(applicationId) {\n            return await this.safeApiCall('교구 신청 삭제', async () => {\n                const client = await this.ensureClient();\n                \n                const { data, error } = await client\n                    .from('requests')\n                    .delete()\n                    .eq('id', applicationId)\n                    .select();\n                    \n                if (error) {\n                    console.error('교구 신청 삭제 DB 오류:', error);\n                    throw new Error(`교구 신청 삭제에 실패했습니다: ${error.message}`);\n                }\n                \n                return data;\n            }, { applicationId });\n        };\n\n        // 개선된 학생 신청 내역 조회 - 강화된 오류 처리\n        const originalGetStudentApplications = window.SupabaseAPI.getStudentApplications;\n        window.SupabaseAPI.getStudentApplications = async function(studentId) {\n            const result = await this.safeApiCall('학생 신청 내역 조회', async () => {\n                const client = await this.ensureClient();\n                \n                const { data, error } = await client\n                    .from('requests')\n                    .select('*')\n                    .eq('user_id', studentId)\n                    .order('created_at', { ascending: false });\n\n                if (error) {\n                    console.error('신청 내역 조회 DB 오류:', error);\n                    \n                    // 특정 오류에 대한 기본값 반환\n                    if (error.code === 406 || error.status === 406 || error.code === 'PGRST116') {\n                        console.log('테이블이 비어있거나 데이터가 없음 - 빈 배열 반환');\n                        return [];\n                    }\n                    \n                    throw new Error(`신청 내역을 불러올 수 없습니다: ${error.message}`);\n                }\n\n                return data || [];\n            }, { studentId });\n\n            return result.success ? result.data : [];\n        };\n\n        // 개선된 예산 상태 조회 - 강화된 오류 처리\n        const originalGetStudentBudgetStatus = window.SupabaseAPI.getStudentBudgetStatus;\n        window.SupabaseAPI.getStudentBudgetStatus = async function(studentId) {\n            const result = await this.safeApiCall('학생 예산 상태 조회', async () => {\n                const client = await this.ensureClient();\n                \n                // 학생 정보 조회\n                const { data: studentData, error: studentError } = await client\n                    .from('user_profiles')\n                    .select('*')\n                    .eq('id', studentId)\n                    .eq('user_type', 'student');\n\n                if (studentError) {\n                    console.error('학생 정보 조회 DB 오류:', studentError);\n                    throw new Error(`학생 정보를 찾을 수 없습니다: ${studentError.message}`);\n                }\n                \n                if (!studentData || studentData.length === 0) {\n                    throw new Error('학생 정보를 찾을 수 없습니다.');\n                }\n\n                const student = studentData[0];\n\n                // 예산 정보 조회\n                const { data: budgetData, error: budgetError } = await client\n                    .from('student_budgets')\n                    .select('*')\n                    .eq('user_id', studentId);\n\n                // 예산 오류는 무시하고 기본값 사용\n                const budget = budgetData && budgetData.length > 0 ? budgetData[0] : null;\n\n                // 수업계획 상태 조회\n                const { data: planData, error: planError } = await client\n                    .from('lesson_plans')\n                    .select('status')\n                    .eq('user_id', studentId);\n\n                // 수업계획 오류도 무시하고 기본값 사용\n                const plan = planData && planData.length > 0 ? planData[0] : null;\n\n                // 사용한 예산 계산\n                const { data: requestsData, error: requestsError } = await client\n                    .from('requests')\n                    .select('price')\n                    .eq('user_id', studentId)\n                    .in('status', ['approved', 'purchased', 'completed']);\n\n                // 요청 데이터 오류도 무시하고 기본값 사용\n                const requests = requestsData || [];\n                const usedBudget = requests.reduce((sum, req) => sum + (req.price || 0), 0);\n                const allocated = budget?.allocated_budget || 0;\n                const lessonPlanStatus = plan?.status || 'draft';\n                const canApplyForEquipment = lessonPlanStatus === 'approved';\n\n                return {\n                    allocated: allocated,\n                    used: usedBudget,\n                    remaining: Math.max(0, allocated - usedBudget),\n                    field: student.field || '전문분야',\n                    lessonPlanStatus: lessonPlanStatus,\n                    canApplyForEquipment: canApplyForEquipment\n                };\n            }, { studentId });\n\n            if (result.success) {\n                return result.data;\n            }\n\n            // 실패 시 기본값 반환 (UI 중단 방지)\n            console.warn('예산 상태 조회 실패 - 기본값 반환:', result.error);\n            return {\n                allocated: 0,\n                used: 0,\n                remaining: 0,\n                field: '전문분야',\n                lessonPlanStatus: 'draft',\n                canApplyForEquipment: false\n            };\n        };\n\n        // 개선된 수업계획 조회 - 강화된 오류 처리\n        const originalGetStudentLessonPlan = window.SupabaseAPI.getStudentLessonPlan;\n        window.SupabaseAPI.getStudentLessonPlan = async function(studentId) {\n            const result = await this.safeApiCall('학생 수업계획 조회', async () => {\n                const client = await this.ensureClient();\n                \n                const { data, error } = await client\n                    .from('lesson_plans')\n                    .select('*')\n                    .eq('user_id', studentId);\n\n                if (error) {\n                    console.error('수업계획 조회 DB 오류:', error);\n                    \n                    // 특정 오류에 대한 기본값 반환\n                    if (error.code === 406 || error.status === 406 || error.code === 'PGRST116') {\n                        console.log('수업계획이 없음 - null 반환');\n                        return null;\n                    }\n                    \n                    throw new Error(`수업계획을 불러올 수 없습니다: ${error.message}`);\n                }\n\n                const plan = data && data.length > 0 ? data[0] : null;\n                return plan;\n            }, { studentId });\n\n            return result.success ? result.data : null;\n        };\n\n        // 네트워크 모니터링 초기화\n        initializeNetworkMonitoring();\n\n        console.log('✅ SupabaseAPI 패치 완료 (완전 구현)');\n    }\n\n    // StudentManager 함수들 패치\n    async function patchStudentManager() {\n        // StudentManager가 로드될 때까지 대기\n        let attempts = 0;\n        const maxAttempts = 50;\n        \n        const checkStudentManager = setInterval(() => {\n            attempts++;\n            \n            if (window.StudentManager) {\n                clearInterval(checkStudentManager);\n                \n                console.log('🔧 StudentManager 패치 시작 (완전 구현)');\n\n                // 오류 처리 강화된 신청 제출 함수 패치\n                const originalHandleApplicationSubmit = window.StudentManager.handleApplicationSubmit;\n                window.StudentManager.handleApplicationSubmit = async function() {\n                    try {\n                        console.log('📝 교구 신청 제출 처리 (강화된 패치)');\n                        \n                        const currentUser = window.AuthManager?.getCurrentUser();\n                        if (!currentUser) {\n                            alert('로그인이 필요합니다. 페이지를 새로고침하고 다시 로그인해주세요.');\n                            return;\n                        }\n\n                        // 폼 데이터 수집 및 검증 (purchase-validation.js에서 강화된 함수 사용)\n                        const formData = this.getApplicationFormData();\n                        if (!formData) {\n                            return; // 검증 실패\n                        }\n\n                        // 예산 확인\n                        let budgetStatus = null;\n                        try {\n                            budgetStatus = await window.SupabaseAPI.getStudentBudgetStatus(currentUser.id);\n                        } catch (error) {\n                            console.error('예산 상태 확인 오류:', error);\n                            alert('예산 정보를 확인할 수 없습니다. 네트워크 연결을 확인하고 새로고침 후 다시 시도해주세요.');\n                            return;\n                        }\n\n                        if (!budgetStatus || formData.price > budgetStatus.remaining) {\n                            alert(`신청 가격이 잔여 예산을 초과합니다.\\n\\n잔여 예산: ${this.formatPrice ? this.formatPrice(budgetStatus?.remaining || 0) : (budgetStatus?.remaining || 0) + '원'}\\n신청 가격: ${this.formatPrice ? this.formatPrice(formData.price) : formData.price + '원'}`);\n                            return;\n                        }\n\n                        // 제출 버튼 비활성화\n                        const submitBtn = document.getElementById('submitBtn');\n                        const originalText = submitBtn?.textContent || '신청하기';\n                        if (submitBtn) {\n                            submitBtn.disabled = true;\n                            submitBtn.textContent = '신청 처리 중...';\n                        }\n\n                        try {\n                            let result = null;\n                            \n                            if (this.currentEditingItem) {\n                                // 수정 모드\n                                result = await window.SupabaseAPI.updateApplication(this.currentEditingItem, formData);\n                                if (result.success) {\n                                    alert('✅ 교구 신청이 성공적으로 수정되었습니다.');\n                                } else {\n                                    throw new Error(result.message || '수정 중 오류가 발생했습니다.');\n                                }\n                            } else {\n                                // 새 신청 모드\n                                result = await window.SupabaseAPI.createApplication(currentUser.id, formData);\n                                if (result.success) {\n                                    alert('✅ 교구 신청이 성공적으로 등록되었습니다.\\n\\n관리자 검토 후 승인 여부가 결정됩니다.');\n                                } else {\n                                    throw new Error(result.message || '등록 중 오류가 발생했습니다.');\n                                }\n                            }\n                            \n                            this.hideApplicationModal();\n                            \n                            // 대시보드 새로고침\n                            if (this.refreshDashboard) {\n                                await this.refreshDashboard();\n                            }\n                            \n                        } catch (apiError) {\n                            console.error('교구 신청 API 오류:', apiError);\n                            \n                            // 사용자 친화적 오류 메시지\n                            let errorMessage = '교구 신청 처리 중 오류가 발생했습니다.';\n                            \n                            if (apiError.message) {\n                                if (apiError.message.includes('네트워크') || apiError.message.includes('network') || apiError.message.includes('fetch')) {\n                                    errorMessage = '🌐 네트워크 연결에 문제가 있습니다.\\n\\n인터넷 연결을 확인하고 다시 시도해주세요.';\n                                } else if (apiError.message.includes('timeout') || apiError.message.includes('시간')) {\n                                    errorMessage = '⏱️ 서버 응답 시간이 초과되었습니다.\\n\\n잠시 후 다시 시도해주세요.';\n                                } else if (apiError.message.includes('500') || apiError.message.includes('502') || apiError.message.includes('503') || apiError.message.includes('서버')) {\n                                    errorMessage = '🔧 서버에 일시적인 문제가 있습니다.\\n\\n잠시 후 다시 시도해주세요.';\n                                } else if (apiError.message.includes('필수') || apiError.message.includes('링크')) {\n                                    errorMessage = '📋 ' + apiError.message;\n                                } else {\n                                    errorMessage = '❌ ' + apiError.message;\n                                }\n                            }\n                            \n                            alert(errorMessage);\n                        }\n\n                    } catch (error) {\n                        console.error('❌ 교구 신청 제출 처리 최종 오류:', error);\n                        alert('💥 교구 신청 중 예상치 못한 오류가 발생했습니다.\\n\\n페이지를 새로고침하고 다시 시도해주세요.');\n                    } finally {\n                        // 제출 버튼 복원\n                        const submitBtn = document.getElementById('submitBtn');\n                        if (submitBtn) {\n                            submitBtn.disabled = false;\n                            submitBtn.textContent = this.currentEditingItem ? '수정하기' : '신청하기';\n                        }\n                    }\n                };\n\n                // 오류 처리 강화된 묶음 신청 제출 함수 패치\n                const originalHandleBundleSubmit = window.StudentManager.handleBundleSubmit;\n                window.StudentManager.handleBundleSubmit = async function() {\n                    try {\n                        console.log('📦 묶음 신청 제출 처리 (강화된 패치)');\n                        \n                        const currentUser = window.AuthManager?.getCurrentUser();\n                        if (!currentUser) {\n                            alert('로그인이 필요합니다. 페이지를 새로고침하고 다시 로그인해주세요.');\n                            return;\n                        }\n\n                        // 폼 데이터 수집 및 검증\n                        const formData = this.getBundleFormData();\n                        if (!formData) {\n                            return; // 검증 실패\n                        }\n\n                        // 예산 확인\n                        let budgetStatus = null;\n                        try {\n                            budgetStatus = await window.SupabaseAPI.getStudentBudgetStatus(currentUser.id);\n                        } catch (error) {\n                            console.error('예산 상태 확인 오류:', error);\n                            alert('예산 정보를 확인할 수 없습니다. 네트워크 연결을 확인하고 새로고침 후 다시 시도해주세요.');\n                            return;\n                        }\n\n                        if (!budgetStatus || formData.price > budgetStatus.remaining) {\n                            alert(`신청 가격이 잔여 예산을 초과합니다.\\n\\n잔여 예산: ${this.formatPrice ? this.formatPrice(budgetStatus?.remaining || 0) : (budgetStatus?.remaining || 0) + '원'}\\n신청 가격: ${this.formatPrice ? this.formatPrice(formData.price) : formData.price + '원'}`);\n                            return;\n                        }\n\n                        // 제출 버튼 비활성화\n                        const submitBtn = document.querySelector('#bundleForm button[type=\"submit\"]');\n                        if (submitBtn) {\n                            submitBtn.disabled = true;\n                            submitBtn.textContent = '묶음 신청 처리 중...';\n                        }\n\n                        try {\n                            const result = await window.SupabaseAPI.createBundleApplication(currentUser.id, formData);\n                            \n                            if (result.success) {\n                                alert('✅ 묶음 교구 신청이 성공적으로 등록되었습니다.\\n\\n관리자 검토 후 승인 여부가 결정됩니다.');\n                                this.hideBundleModal();\n                                \n                                if (this.refreshDashboard) {\n                                    await this.refreshDashboard();\n                                }\n                            } else {\n                                throw new Error(result.message || '묶음 신청 중 오류가 발생했습니다.');\n                            }\n                            \n                        } catch (apiError) {\n                            console.error('묶음 신청 API 오류:', apiError);\n                            \n                            // 사용자 친화적 오류 메시지\n                            let errorMessage = '묶음 신청 처리 중 오류가 발생했습니다.';\n                            \n                            if (apiError.message) {\n                                if (apiError.message.includes('네트워크') || apiError.message.includes('network') || apiError.message.includes('fetch')) {\n                                    errorMessage = '🌐 네트워크 연결에 문제가 있습니다.\\n\\n인터넷 연결을 확인하고 다시 시도해주세요.';\n                                } else if (apiError.message.includes('timeout') || apiError.message.includes('시간')) {\n                                    errorMessage = '⏱️ 서버 응답 시간이 초과되었습니다.\\n\\n잠시 후 다시 시도해주세요.';\n                                } else if (apiError.message.includes('500') || apiError.message.includes('502') || apiError.message.includes('503') || apiError.message.includes('서버')) {\n                                    errorMessage = '🔧 서버에 일시적인 문제가 있습니다.\\n\\n잠시 후 다시 시도해주세요.';\n                                } else {\n                                    errorMessage = '❌ ' + apiError.message;\n                                }\n                            }\n                            \n                            alert(errorMessage);\n                        }\n\n                    } catch (error) {\n                        console.error('❌ 묶음 신청 제출 처리 최종 오류:', error);\n                        alert('💥 묶음 신청 중 예상치 못한 오류가 발생했습니다.\\n\\n페이지를 새로고침하고 다시 시도해주세요.');\n                    } finally {\n                        // 제출 버튼 복원\n                        const submitBtn = document.querySelector('#bundleForm button[type=\"submit\"]');\n                        if (submitBtn) {\n                            submitBtn.disabled = false;\n                            submitBtn.textContent = '묶음 신청하기';\n                        }\n                    }\n                };\n\n                console.log('✅ StudentManager 패치 완료 (완전 구현)');\n            } else if (attempts >= maxAttempts) {\n                clearInterval(checkStudentManager);\n                console.warn('⚠️ StudentManager를 찾을 수 없어 패치를 적용하지 못했습니다');\n            }\n        }, 100);\n    }\n\n    // DOM 로드 완료 후 패치 적용\n    if (document.readyState === 'loading') {\n        document.addEventListener('DOMContentLoaded', async () => {\n            await patchSupabaseAPI();\n            await patchStudentManager();\n        });\n    } else {\n        // 이미 로드 완료된 경우 즉시 실행\n        patchSupabaseAPI().then(() => {\n            patchStudentManager();\n        });\n    }\n\n    console.log('✅ API 수정 스크립트 로드 완료 (완전 구현 버전)');\n})();