// API 호출 오류 수정 및 교구 신청 기능 강화
// Supabase API 오류 처리 및 교구 신청 관련 누락된 함수들 구현

(function() {
    'use strict';

    console.log('🔧 API 수정 스크립트 로드 시작');

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
            }
        });
    }

    // API 함수들 패치
    async function patchSupabaseAPI() {
        await waitForSupabaseAPI();
        
        console.log('🔧 SupabaseAPI 패치 시작');

        // 교구 신청 생성 함수 구현 (누락된 함수)
        if (!window.SupabaseAPI.createApplication) {
            window.SupabaseAPI.createApplication = async function(studentId, applicationData) {
                return await this.safeApiCall('교구 신청 생성', async () => {
                    const client = await this.ensureClient();
                    
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

                    return await client
                        .from('requests')
                        .insert([requestData])
                        .select();
                }, { studentId, itemName: applicationData.item_name });
            };
        }

        // 묶음 신청 생성 함수 구현 (누락된 함수)
        if (!window.SupabaseAPI.createBundleApplication) {
            window.SupabaseAPI.createBundleApplication = async function(studentId, bundleData) {
                return await this.safeApiCall('묶음 교구 신청 생성', async () => {
                    const client = await this.ensureClient();
                    
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

                    return await client
                        .from('requests')
                        .insert([requestData])
                        .select();
                }, { studentId, bundleName: bundleData.item_name });
            };
        }

        // 교구 신청 수정 함수 구현 (누락된 함수)
        if (!window.SupabaseAPI.updateApplication) {
            window.SupabaseAPI.updateApplication = async function(applicationId, applicationData) {
                return await this.safeApiCall('교구 신청 수정', async () => {
                    const client = await this.ensureClient();
                    
                    const updateData = {
                        item_name: applicationData.item_name,
                        purpose: applicationData.purpose,
                        price: applicationData.price,
                        purchase_type: applicationData.purchase_type || 'online',
                        purchase_link: applicationData.purchase_link || null,
                        updated_at: new Date().toISOString()
                    };

                    return await client
                        .from('requests')
                        .update(updateData)
                        .eq('id', applicationId)
                        .select();
                }, { applicationId, itemName: applicationData.item_name });
            };
        }

        // 교구 신청 삭제 함수 구현 (누락된 함수)
        if (!window.SupabaseAPI.deleteApplication) {
            window.SupabaseAPI.deleteApplication = async function(applicationId) {
                return await this.safeApiCall('교구 신청 삭제', async () => {
                    const client = await this.ensureClient();
                    
                    return await client
                        .from('requests')
                        .delete()
                        .eq('id', applicationId);
                }, { applicationId });
            };
        }

        // 개선된 학생 신청 내역 조회 - 오류 처리 강화
        const originalGetStudentApplications = window.SupabaseAPI.getStudentApplications;
        window.SupabaseAPI.getStudentApplications = async function(studentId) {
            try {
                const result = await this.safeApiCall('학생 신청 내역 조회', async () => {
                    const client = await this.ensureClient();
                    
                    const { data, error } = await client
                        .from('requests')
                        .select('*')
                        .eq('user_id', studentId)
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('신청 내역 조회 오류:', error);
                        
                        // 406 에러 등 특정 오류에 대한 기본값 반환
                        if (error.code === 406 || error.status === 406) {
                            return { data: [], error: null };
                        }
                        
                        return { data: null, error };
                    }

                    return { data: data || [], error: null };
                }, { studentId });

                return result.success ? (result.data || []) : [];
            } catch (error) {
                console.error('학생 신청 내역 조회 최종 오류:', error);
                return []; // 빈 배열 반환으로 UI 오류 방지
            }
        };

        // 개선된 예산 상태 조회 - 오류 처리 강화
        const originalGetStudentBudgetStatus = window.SupabaseAPI.getStudentBudgetStatus;
        window.SupabaseAPI.getStudentBudgetStatus = async function(studentId) {
            try {
                const result = await this.safeApiCall('학생 예산 상태 조회', async () => {
                    const client = await this.ensureClient();
                    
                    // 학생 정보 조회
                    const { data: studentData, error: studentError } = await client
                        .from('user_profiles')
                        .select('*')
                        .eq('id', studentId)
                        .eq('user_type', 'student');

                    if (studentError || !studentData || studentData.length === 0) {
                        console.error('학생 정보 조회 오류:', studentError);
                        throw new Error('학생 정보를 찾을 수 없습니다');
                    }

                    const student = studentData[0];

                    // 예산 정보 조회
                    const { data: budgetData, error: budgetError } = await client
                        .from('student_budgets')
                        .select('*')
                        .eq('user_id', studentId);

                    const budget = budgetData && budgetData.length > 0 ? budgetData[0] : null;

                    // 수업계획 상태 조회
                    const { data: planData, error: planError } = await client
                        .from('lesson_plans')
                        .select('status')
                        .eq('user_id', studentId);

                    const plan = planData && planData.length > 0 ? planData[0] : null;

                    // 사용한 예산 계산
                    const { data: requestsData, error: requestsError } = await client
                        .from('requests')
                        .select('price')
                        .eq('user_id', studentId)
                        .in('status', ['approved', 'purchased', 'completed']);

                    const requests = requestsData || [];
                    const usedBudget = requests.reduce((sum, req) => sum + (req.price || 0), 0);
                    const allocated = budget?.allocated_budget || 0;
                    const lessonPlanStatus = plan?.status || 'draft';
                    const canApplyForEquipment = lessonPlanStatus === 'approved';

                    return {
                        data: {
                            allocated: allocated,
                            used: usedBudget,
                            remaining: Math.max(0, allocated - usedBudget),
                            field: student.field || '전문분야',
                            lessonPlanStatus: lessonPlanStatus,
                            canApplyForEquipment: canApplyForEquipment
                        },
                        error: null
                    };
                }, { studentId });

                if (result.success) {
                    return result.data;
                }

                // 실패 시 기본값 반환
                return {
                    allocated: 0,
                    used: 0,
                    remaining: 0,
                    field: '전문분야',
                    lessonPlanStatus: 'draft',
                    canApplyForEquipment: false
                };
            } catch (error) {
                console.error('예산 상태 조회 최종 오류:', error);
                
                // 오류 발생 시에도 기본값 반환하여 UI 중단 방지
                return {
                    allocated: 0,
                    used: 0,
                    remaining: 0,
                    field: '전문분야',
                    lessonPlanStatus: 'draft',
                    canApplyForEquipment: false
                };
            }
        };

        // 개선된 수업계획 조회 - 오류 처리 강화
        const originalGetStudentLessonPlan = window.SupabaseAPI.getStudentLessonPlan;
        window.SupabaseAPI.getStudentLessonPlan = async function(studentId) {
            try {
                const result = await this.safeApiCall('학생 수업계획 조회', async () => {
                    const client = await this.ensureClient();
                    
                    const { data, error } = await client
                        .from('lesson_plans')
                        .select('*')
                        .eq('user_id', studentId);

                    if (error) {
                        console.error('수업계획 조회 오류:', error);
                        
                        // 406 에러 등에 대한 기본값 반환
                        if (error.code === 406 || error.status === 406) {
                            return { data: null, error: null };
                        }
                        
                        return { data: null, error };
                    }

                    const plan = data && data.length > 0 ? data[0] : null;
                    return { data: plan, error: null };
                }, { studentId });

                return result.success ? result.data : null;
            } catch (error) {
                console.error('수업계획 조회 최종 오류:', error);
                return null; // null 반환으로 UI 오류 방지
            }
        };

        // 네트워크 상태 모니터링 추가
        window.addEventListener('online', () => {
            console.log('🌐 네트워크 연결 복구됨');
            // 필요시 자동 재연결 로직 추가
        });

        window.addEventListener('offline', () => {
            console.log('🚫 네트워크 연결 끊어짐');
            // 오프라인 상태 UI 표시
        });

        console.log('✅ SupabaseAPI 패치 완료');
    }

    // StudentManager 함수들 패치
    async function patchStudentManager() {
        // StudentManager가 로드될 때까지 대기
        const checkStudentManager = setInterval(() => {
            if (window.StudentManager) {
                clearInterval(checkStudentManager);
                
                console.log('🔧 StudentManager 패치 시작');

                // 오류 처리 강화된 신청 제출 함수 패치
                const originalHandleApplicationSubmit = window.StudentManager.handleApplicationSubmit;
                window.StudentManager.handleApplicationSubmit = async function() {
                    try {
                        console.log('📝 교구 신청 제출 처리 (패치됨)');
                        
                        const currentUser = window.AuthManager?.getCurrentUser();
                        if (!currentUser) {
                            alert('로그인이 필요합니다.');
                            return;
                        }

                        // 폼 데이터 수집 및 검증
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
                            alert('예산 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
                            return;
                        }

                        if (!budgetStatus || formData.price > budgetStatus.remaining) {
                            alert(`신청 가격이 잔여 예산을 초과합니다.\\n잔여 예산: ${this.formatPrice(budgetStatus?.remaining || 0)}\\n신청 가격: ${this.formatPrice(formData.price)}`);
                            return;
                        }

                        // 제출 버튼 비활성화
                        const submitBtn = document.getElementById('submitBtn');
                        if (submitBtn) {
                            submitBtn.disabled = true;
                            submitBtn.textContent = '신청 중...';
                        }

                        try {
                            let result = null;
                            if (this.currentEditingItem) {
                                // 수정 모드
                                result = await window.SupabaseAPI.updateApplication(this.currentEditingItem, formData);
                                if (result.success) {
                                    alert('교구 신청이 성공적으로 수정되었습니다.');
                                } else {
                                    throw new Error(result.message || '수정 중 오류가 발생했습니다.');
                                }
                            } else {
                                // 새 신청 모드
                                result = await window.SupabaseAPI.createApplication(currentUser.id, formData);
                                if (result.success) {
                                    alert('교구 신청이 성공적으로 등록되었습니다.');
                                } else {
                                    throw new Error(result.message || '등록 중 오류가 발생했습니다.');
                                }
                            }
                            
                            this.hideApplicationModal();
                            await this.refreshDashboard();
                            
                        } catch (apiError) {
                            console.error('교구 신청 API 오류:', apiError);
                            
                            // 사용자 친화적 오류 메시지
                            let errorMessage = '교구 신청 처리 중 오류가 발생했습니다.';
                            if (apiError.message) {
                                if (apiError.message.includes('네트워크')) {
                                    errorMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
                                } else if (apiError.message.includes('서버')) {
                                    errorMessage = '서버 응답에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
                                } else {
                                    errorMessage = apiError.message;
                                }
                            }
                            
                            alert(errorMessage);
                        }

                    } catch (error) {
                        console.error('❌ 교구 신청 제출 처리 오류:', error);
                        alert('교구 신청 중 예상치 못한 오류가 발생했습니다. 페이지를 새로고침하고 다시 시도해주세요.');
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
                        console.log('📦 묶음 신청 제출 처리 (패치됨)');
                        
                        const currentUser = window.AuthManager?.getCurrentUser();
                        if (!currentUser) {
                            alert('로그인이 필요합니다.');
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
                            alert('예산 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
                            return;
                        }

                        if (!budgetStatus || formData.price > budgetStatus.remaining) {
                            alert(`신청 가격이 잔여 예산을 초과합니다.\\n잔여 예산: ${this.formatPrice(budgetStatus?.remaining || 0)}\\n신청 가격: ${this.formatPrice(formData.price)}`);
                            return;
                        }

                        // 제출 버튼 비활성화
                        const submitBtn = document.querySelector('#bundleForm button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.disabled = true;
                            submitBtn.textContent = '신청 중...';
                        }

                        try {
                            const result = await window.SupabaseAPI.createBundleApplication(currentUser.id, formData);
                            if (result.success) {
                                alert('묶음 교구 신청이 성공적으로 등록되었습니다.');
                                this.hideBundleModal();
                                await this.refreshDashboard();
                            } else {
                                throw new Error(result.message || '묶음 신청 중 오류가 발생했습니다.');
                            }
                            
                        } catch (apiError) {
                            console.error('묶음 신청 API 오류:', apiError);
                            
                            // 사용자 친화적 오류 메시지
                            let errorMessage = '묶음 신청 처리 중 오류가 발생했습니다.';
                            if (apiError.message) {
                                if (apiError.message.includes('네트워크')) {
                                    errorMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
                                } else if (apiError.message.includes('서버')) {
                                    errorMessage = '서버 응답에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
                                } else {
                                    errorMessage = apiError.message;
                                }
                            }
                            
                            alert(errorMessage);
                        }

                    } catch (error) {
                        console.error('❌ 묶음 신청 제출 처리 오류:', error);
                        alert('묶음 신청 중 예상치 못한 오류가 발생했습니다. 페이지를 새로고침하고 다시 시도해주세요.');
                    } finally {
                        // 제출 버튼 복원
                        const submitBtn = document.querySelector('#bundleForm button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = '묶음 신청하기';
                        }
                    }
                };

                console.log('✅ StudentManager 패치 완료');
            }
        }, 100);

        // 10초 후에도 StudentManager가 없으면 포기
        setTimeout(() => {
            clearInterval(checkStudentManager);
        }, 10000);
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

    console.log('✅ API 수정 스크립트 로드 완료');
})();
