/**
 * API 개선 수정 사항
 * 
 * @description API 호출 오류 수정 및 교구 신청 기능 강화 - 완전 구현 버전
 * @problem API 호출 오류, 재시도 로직 부재, 교구 신청 관련 누락된 함수들
 * @solution Supabase API 오류 처리, 재시도 로직, 교구 신청 관련 누락된 함수들 구현
 * @affects SupabaseAPI, StudentManager, 전체 API 호출
 * @author Claude AI
 * @date 2025-06-16
 */

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
                };
            }
        };

        // 교구 신청 생성 함수 구현/강화
        window.SupabaseAPI.createApplication = async function(studentId, applicationData) {
            return await this.safeApiCall('교구 신청 생성', async () => {
                const client = await this.ensureClient();
                
                // 데이터 검증
                if (!applicationData.item_name || !applicationData.purpose || !applicationData.price) {
                    throw new Error('필수 입력 항목이 누락되었습니다.');
                }
                
                // 온라인 구매시 링크 필수 검증 (API 레벨에서도 확인)
                if (applicationData.purchase_type === 'online' && !applicationData.purchase_link) {
                    throw new Error('온라인 구매의 경우 구매 링크가 필수입니다.');
                }
                
                const requestData = {
                    user_id: studentId,
                    item_name: applicationData.item_name,
                    purpose: applicationData.purpose,
                    price: applicationData.price,
                    purchase_type: applicationData.purchase_type || 'online',
                    purchase_link: applicationData.purchase_link || null,
                    is_bundle: applicationData.is_bundle || false,
                    bundle_info: applicationData.bundle_credentials ? JSON.stringify(applicationData.bundle_credentials) : null,
                    status: 'pending',
                    created_at: new Date().toISOString()
                };

                const { data, error } = await client
                    .from('requests')
                    .insert([requestData])
                    .select();
                    
                if (error) {
                    console.error('교구 신청 생성 DB 오류:', error);
                    throw new Error(`교구 신청 등록에 실패했습니다: ${error.message}`);
                }
                
                return data;
            }, { studentId, itemName: applicationData.item_name });
        };

        // 묶음 신청 생성 함수 구현/강화
        window.SupabaseAPI.createBundleApplication = async function(studentId, bundleData) {
            return await this.safeApiCall('묶음 교구 신청 생성', async () => {
                const client = await this.ensureClient();
                
                // 데이터 검증
                if (!bundleData.item_name || !bundleData.purpose || !bundleData.price) {
                    throw new Error('필수 입력 항목이 누락되었습니다.');
                }
                
                if (!bundleData.purchase_link) {
                    throw new Error('묶음 구매의 경우 구매 링크가 필수입니다.');
                }
                
                if (!bundleData.bundle_credentials || !bundleData.bundle_credentials.user_id || !bundleData.bundle_credentials.password) {
                    throw new Error('묶음 구매의 경우 계정 정보가 필수입니다.');
                }
                
                const requestData = {
                    user_id: studentId,
                    item_name: bundleData.item_name,
                    purpose: bundleData.purpose,
                    price: bundleData.price,
                    purchase_type: 'online', // 묶음은 항상 온라인
                    purchase_link: bundleData.purchase_link,
                    is_bundle: true,
                    bundle_info: JSON.stringify(bundleData.bundle_credentials),
                    status: 'pending',
                    created_at: new Date().toISOString()
                };

                const { data, error } = await client
                    .from('requests')
                    .insert([requestData])
                    .select();
                    
                if (error) {
                    console.error('묶음 신청 생성 DB 오류:', error);
                    throw new Error(`묶음 신청 등록에 실패했습니다: ${error.message}`);
                }
                
                return data;
            }, { studentId, bundleName: bundleData.item_name });
        };

        // 교구 신청 수정 함수 구현/강화
        window.SupabaseAPI.updateApplication = async function(applicationId, applicationData) {
            return await this.safeApiCall('교구 신청 수정', async () => {
                const client = await this.ensureClient();
                
                // 데이터 검증
                if (!applicationData.item_name || !applicationData.purpose || !applicationData.price) {
                    throw new Error('필수 입력 항목이 누락되었습니다.');
                }
                
                // 온라인 구매시 링크 필수 검증
                if (applicationData.purchase_type === 'online' && !applicationData.purchase_link) {
                    throw new Error('온라인 구매의 경우 구매 링크가 필수입니다.');
                }
                
                const updateData = {
                    item_name: applicationData.item_name,
                    purpose: applicationData.purpose,
                    price: applicationData.price,
                    purchase_type: applicationData.purchase_type || 'online',
                    purchase_link: applicationData.purchase_link || null,
                    updated_at: new Date().toISOString()
                };

                const { data, error } = await client
                    .from('requests')
                    .update(updateData)
                    .eq('id', applicationId)
                    .select();
                    
                if (error) {
                    console.error('교구 신청 수정 DB 오류:', error);
                    throw new Error(`교구 신청 수정에 실패했습니다: ${error.message}`);
                }
                
                return data;
            }, { applicationId, itemName: applicationData.item_name });
        };

        // 교구 신청 삭제 함수 구현/강화
        window.SupabaseAPI.deleteApplication = async function(applicationId) {
            return await this.safeApiCall('교구 신청 삭제', async () => {
                const client = await this.ensureClient();
                
                const { data, error } = await client
                    .from('requests')
                    .delete()
                    .eq('id', applicationId)
                    .select();
                    
                if (error) {
                    console.error('교구 신청 삭제 DB 오류:', error);
                    throw new Error(`교구 신청 삭제에 실패했습니다: ${error.message}`);
                }
                
                return data;
            }, { applicationId });
        };

        // 개선된 학생 신청 내역 조회 - 강화된 오류 처리
        const originalGetStudentApplications = window.SupabaseAPI.getStudentApplications;
        window.SupabaseAPI.getStudentApplications = async function(studentId) {
            const result = await this.safeApiCall('학생 신청 내역 조회', async () => {
                const client = await this.ensureClient();
                
                const { data, error } = await client
                    .from('requests')
                    .select('*')
                    .eq('user_id', studentId)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('신청 내역 조회 DB 오류:', error);
                    
                    // 특정 오류에 대한 기본값 반환
                    if (error.code === 406 || error.status === 406 || error.code === 'PGRST116') {
                        console.log('테이블이 비어있거나 데이터가 없음 - 빈 배열 반환');
                        return [];
                    }
                    
                    throw new Error(`신청 내역을 불러올 수 없습니다: ${error.message}`);
                }

                return data || [];
            }, { studentId });

            return result.success ? result.data : [];
        };

        // 개선된 예산 상태 조회 - 강화된 오류 처리
        const originalGetStudentBudgetStatus = window.SupabaseAPI.getStudentBudgetStatus;
        window.SupabaseAPI.getStudentBudgetStatus = async function(studentId) {
            const result = await this.safeApiCall('학생 예산 상태 조회', async () => {
                const client = await this.ensureClient();
                
                // 학생 정보 조회
                const { data: studentData, error: studentError } = await client
                    .from('user_profiles')
                    .select('*')
                    .eq('id', studentId)
                    .eq('user_type', 'student');

                if (studentError) {
                    console.error('학생 정보 조회 DB 오류:', studentError);
                    throw new Error(`학생 정보를 찾을 수 없습니다: ${studentError.message}`);
                }
                
                if (!studentData || studentData.length === 0) {
                    throw new Error('학생 정보를 찾을 수 없습니다.');
                }

                const student = studentData[0];

                // 예산 정보 조회
                const { data: budgetData, error: budgetError } = await client
                    .from('student_budgets')
                    .select('*')
                    .eq('user_id', studentId);

                // 예산 오류는 무시하고 기본값 사용
                const budget = budgetData && budgetData.length > 0 ? budgetData[0] : null;

                // 수업계획 상태 조회
                const { data: planData, error: planError } = await client
                    .from('lesson_plans')
                    .select('status')
                    .eq('user_id', studentId);

                // 수업계획 오류도 무시하고 기본값 사용
                const plan = planData && planData.length > 0 ? planData[0] : null;

                // 사용한 예산 계산
                const { data: requestsData, error: requestsError } = await client
                    .from('requests')
                    .select('price')
                    .eq('user_id', studentId)
                    .in('status', ['approved', 'purchased', 'completed']);

                // 요청 데이터 오류도 무시하고 기본값 사용
                const requests = requestsData || [];
                const usedBudget = requests.reduce((sum, req) => sum + (req.price || 0), 0);
                const allocated = budget?.allocated_budget || 0;
                const lessonPlanStatus = plan?.status || 'draft';
                const canApplyForEquipment = lessonPlanStatus === 'approved';

                return {
                    allocated: allocated,
                    used: usedBudget,
                    remaining: Math.max(0, allocated - usedBudget),
                    field: student.field || '전문분야',
                    lessonPlanStatus: lessonPlanStatus,
                    canApplyForEquipment: canApplyForEquipment
                };
            }, { studentId });

            if (result.success) {
                return result.data;
            }

            // 실패 시 기본값 반환 (UI 중단 방지)
            console.warn('예산 상태 조회 실패 - 기본값 반환:', result.error);
            return {
                allocated: 0,
                used: 0,
                remaining: 0,
                field: '전문분야',
                lessonPlanStatus: 'draft',
                canApplyForEquipment: false
            };
        };

        // 개선된 수업계획 조회 - 강화된 오류 처리
        const originalGetStudentLessonPlan = window.SupabaseAPI.getStudentLessonPlan;
        window.SupabaseAPI.getStudentLessonPlan = async function(studentId) {
            const result = await this.safeApiCall('학생 수업계획 조회', async () => {
                const client = await this.ensureClient();
                
                const { data, error } = await client
                    .from('lesson_plans')
                    .select('*')
                    .eq('user_id', studentId);

                if (error) {
                    console.error('수업계획 조회 DB 오류:', error);
                    
                    // 특정 오류에 대한 기본값 반환
                    if (error.code === 406 || error.status === 406 || error.code === 'PGRST116') {
                        console.log('수업계획이 없음 - null 반환');
                        return null;
                    }
                    
                    throw new Error(`수업계획을 불러올 수 없습니다: ${error.message}`);
                }

                const plan = data && data.length > 0 ? data[0] : null;
                return plan;
            }, { studentId });

            return result.success ? result.data : null;
        };

        // 네트워크 모니터링 초기화
        initializeNetworkMonitoring();

        console.log('✅ SupabaseAPI 패치 완료 (완전 구현)');
    }

    // StudentManager 함수들 패치
    async function patchStudentManager() {
        // StudentManager가 로드될 때까지 대기
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkStudentManager = setInterval(() => {
            attempts++;
            
            if (window.StudentManager) {
                clearInterval(checkStudentManager);
                
                console.log('🔧 StudentManager 패치 시작 (완전 구현)');

                // 오류 처리 강화된 신청 제출 함수 패치
                const originalHandleApplicationSubmit = window.StudentManager.handleApplicationSubmit;
                window.StudentManager.handleApplicationSubmit = async function() {
                    try {
                        console.log('📝 교구 신청 제출 처리 (강화된 패치)');
                        
                        const currentUser = window.AuthManager?.getCurrentUser();
                        if (!currentUser) {
                            alert('로그인이 필요합니다. 페이지를 새로고침하고 다시 로그인해주세요.');
                            return;
                        }

                        // 폼 데이터 수집 및 검증 (purchase-validation.js에서 강화된 함수 사용)
                        const formData = this.getApplicationFormData();
                        if (!formData) {
                            return; // 검증 실패
                        }

                        // 예산 확인
                        let budgetStatus = null;
                        try {
                            budgetStatus = await window.SupabaseAPI.getStudentBudgetStatus(currentUser.id);
                        } catch (error) {
                            console.error('예산 상태 확인 오류:', error);
                            alert('예산 정보를 확인할 수 없습니다. 네트워크 연결을 확인하고 새로고침 후 다시 시도해주세요.');
                            return;
                        }

                        if (!budgetStatus || formData.price > budgetStatus.remaining) {
                            alert(`신청 가격이 잔여 예산을 초과합니다.\\n\\n잔여 예산: ${this.formatPrice ? this.formatPrice(budgetStatus?.remaining || 0) : (budgetStatus?.remaining || 0) + '원'}\\n신청 가격: ${this.formatPrice ? this.formatPrice(formData.price) : formData.price + '원'}`);
                            return;
                        }

                        // 제출 버튼 비활성화
                        const submitBtn = document.getElementById('submitBtn');
                        const originalText = submitBtn?.textContent || '신청하기';
                        if (submitBtn) {
                            submitBtn.disabled = true;
                            submitBtn.textContent = '신청 처리 중...';
                        }

                        try {
                            let result = null;
                            
                            if (this.currentEditingItem) {
                                // 수정 모드
                                result = await window.SupabaseAPI.updateApplication(this.currentEditingItem, formData);
                                if (result.success) {
                                    alert('✅ 교구 신청이 성공적으로 수정되었습니다.');
                                } else {
                                    throw new Error(result.message || '수정 중 오류가 발생했습니다.');
                                }
                            } else {
                                // 새 신청 모드
                                result = await window.SupabaseAPI.createApplication(currentUser.id, formData);
                                if (result.success) {
                                    alert('✅ 교구 신청이 성공적으로 등록되었습니다.\\n\\n관리자 검토 후 승인 여부가 결정됩니다.');
                                } else {
                                    throw new Error(result.message || '등록 중 오류가 발생했습니다.');
                                }
                            }
                            
                            this.hideApplicationModal();
                            
                            // 대시보드 새로고침
                            if (this.refreshDashboard) {
                                await this.refreshDashboard();
                            }
                            
                        } catch (apiError) {
                            console.error('교구 신청 API 오류:', apiError);
                            
                            // 사용자 친화적 오류 메시지
                            let errorMessage = '교구 신청 처리 중 오류가 발생했습니다.';
                            
                            if (apiError.message) {
                                if (apiError.message.includes('네트워크') || apiError.message.includes('network') || apiError.message.includes('fetch')) {
                                    errorMessage = '🌐 네트워크 연결에 문제가 있습니다.\\n\\n인터넷 연결을 확인하고 다시 시도해주세요.';
                                } else if (apiError.message.includes('timeout') || apiError.message.includes('시간')) {
                                    errorMessage = '⏱️ 서버 응답 시간이 초과되었습니다.\\n\\n잠시 후 다시 시도해주세요.';
                                } else if (apiError.message.includes('500') || apiError.message.includes('502') || apiError.message.includes('503') || apiError.message.includes('서버')) {
                                    errorMessage = '🔧 서버에 일시적인 문제가 있습니다.\\n\\n잠시 후 다시 시도해주세요.';
                                } else if (apiError.message.includes('필수') || apiError.message.includes('링크')) {
                                    errorMessage = '📋 ' + apiError.message;
                                } else {
                                    errorMessage = '❌ ' + apiError.message;
                                }
                            }
                            
                            alert(errorMessage);
                        }

                    } catch (error) {
                        console.error('❌ 교구 신청 제출 처리 최종 오류:', error);
                        alert('💥 교구 신청 중 예상치 못한 오류가 발생했습니다.\\n\\n페이지를 새로고침하고 다시 시도해주세요.');
                    } finally {
                        // 제출 버튼 복원
                        const submitBtn = document.getElementById('submitBtn');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = this.currentEditingItem ? '수정하기' : '신청하기';
                        }
                    }
                };

                // 오류 처리 강화된 묶음 신청 제출 함수 패치
                const originalHandleBundleSubmit = window.StudentManager.handleBundleSubmit;
                window.StudentManager.handleBundleSubmit = async function() {
                    try {
                        console.log('📦 묶음 신청 제출 처리 (강화된 패치)');
                        
                        const currentUser = window.AuthManager?.getCurrentUser();
                        if (!currentUser) {
                            alert('로그인이 필요합니다. 페이지를 새로고침하고 다시 로그인해주세요.');
                            return;
                        }

                        // 폼 데이터 수집 및 검증
                        const formData = this.getBundleFormData();
                        if (!formData) {
                            return; // 검증 실패
                        }

                        // 예산 확인
                        let budgetStatus = null;
                        try {
                            budgetStatus = await window.SupabaseAPI.getStudentBudgetStatus(currentUser.id);
                        } catch (error) {
                            console.error('예산 상태 확인 오류:', error);
                            alert('예산 정보를 확인할 수 없습니다. 네트워크 연결을 확인하고 새로고침 후 다시 시도해주세요.');
                            return;
                        }

                        if (!budgetStatus || formData.price > budgetStatus.remaining) {
                            alert(`신청 가격이 잔여 예산을 초과합니다.\\n\\n잔여 예산: ${this.formatPrice ? this.formatPrice(budgetStatus?.remaining || 0) : (budgetStatus?.remaining || 0) + '원'}\\n신청 가격: ${this.formatPrice ? this.formatPrice(formData.price) : formData.price + '원'}`);
                            return;
                        }

                        // 제출 버튼 비활성화
                        const submitBtn = document.querySelector('#bundleForm button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.disabled = true;
                            submitBtn.textContent = '묶음 신청 처리 중...';
                        }

                        try {
                            const result = await window.SupabaseAPI.createBundleApplication(currentUser.id, formData);
                            
                            if (result.success) {
                                alert('✅ 묶음 교구 신청이 성공적으로 등록되었습니다.\\n\\n관리자 검토 후 승인 여부가 결정됩니다.');
                                this.hideBundleModal();
                                
                                if (this.refreshDashboard) {
                                    await this.refreshDashboard();
                                }
                            } else {
                                throw new Error(result.message || '묶음 신청 중 오류가 발생했습니다.');
                            }
                            
                        } catch (apiError) {
                            console.error('묶음 신청 API 오류:', apiError);
                            
                            // 사용자 친화적 오류 메시지
                            let errorMessage = '묶음 신청 처리 중 오류가 발생했습니다.';
                            
                            if (apiError.message) {
                                if (apiError.message.includes('네트워크') || apiError.message.includes('network') || apiError.message.includes('fetch')) {
                                    errorMessage = '🌐 네트워크 연결에 문제가 있습니다.\\n\\n인터넷 연결을 확인하고 다시 시도해주세요.';
                                } else if (apiError.message.includes('timeout') || apiError.message.includes('시간')) {
                                    errorMessage = '⏱️ 서버 응답 시간이 초과되었습니다.\\n\\n잠시 후 다시 시도해주세요.';
                                } else if (apiError.message.includes('500') || apiError.message.includes('502') || apiError.message.includes('503') || apiError.message.includes('서버')) {
                                    errorMessage = '🔧 서버에 일시적인 문제가 있습니다.\\n\\n잠시 후 다시 시도해주세요.';
                                } else {
                                    errorMessage = '❌ ' + apiError.message;
                                }
                            }
                            
                            alert(errorMessage);
                        }

                    } catch (error) {
                        console.error('❌ 묶음 신청 제출 처리 최종 오류:', error);
                        alert('💥 묶음 신청 중 예상치 못한 오류가 발생했습니다.\\n\\n페이지를 새로고침하고 다시 시도해주세요.');
                    } finally {
                        // 제출 버튼 복원
                        const submitBtn = document.querySelector('#bundleForm button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = '묶음 신청하기';
                        }
                    }
                };

                console.log('✅ StudentManager 패치 완료 (완전 구현)');
            } else if (attempts >= maxAttempts) {
                clearInterval(checkStudentManager);
                console.warn('⚠️ StudentManager를 찾을 수 없어 패치를 적용하지 못했습니다');
            }
        }, 100);
    }

    // DOM 로드 완료 후 패치 적용
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await patchSupabaseAPI();
            await patchStudentManager();
        });
    } else {
        // 이미 로드 완료된 경우 즉시 실행
        patchSupabaseAPI().then(() => {
            patchStudentManager();
        });
    }

    console.log('✅ API 수정 스크립트 로드 완료 (완전 구현 버전)');
})();
