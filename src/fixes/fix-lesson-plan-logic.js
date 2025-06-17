/**
 * 수업계획 상태 확인 로직 버그 수정
 * 
 * @problem '이가짜' 사용자가 이미 승인된 수업계획이 있는데도 수업계획 작성하라고 표시됨
 * @solution 수업계획 상태 확인 로직을 개선하여 정확한 상태 표시
 * @affects 학생 로그인 시 수업계획 상태 확인 부분
 * @author Claude AI
 * @date 2025-06-17
 */

(function() {
    'use strict';
    
    console.log('🔧 수업계획 상태 확인 로직 수정 적용 시작...');

    // 기존 수업계획 확인 함수 개선
    if (window.SupabaseAPI && window.SupabaseAPI.checkLessonPlanStatus) {
        const originalCheckLessonPlanStatus = window.SupabaseAPI.checkLessonPlanStatus;
        
        window.SupabaseAPI.checkLessonPlanStatus = async function(userId) {
            try {
                console.log('🔍 수업계획 상태 확인 중...', userId);
                
                // 사용자의 수업계획 데이터 조회
                const { data: lessonPlans, error } = await this.supabase
                    .from('lesson_plans')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) {
                    console.error('❌ 수업계획 조회 오류:', error);
                    return { status: 'none', data: null, error };
                }

                // 수업계획이 없는 경우
                if (!lessonPlans || lessonPlans.length === 0) {
                    console.log('📝 수업계획이 없음 - 작성 필요');
                    return { 
                        status: 'none', 
                        data: null, 
                        message: '수업계획을 작성해주세요.',
                        error: null 
                    };
                }

                const latestPlan = lessonPlans[0];
                console.log('📋 최신 수업계획:', latestPlan);

                // 상태별 처리
                switch (latestPlan.status) {
                    case 'approved':
                        console.log('✅ 수업계획 승인됨');
                        return { 
                            status: 'approved', 
                            data: latestPlan,
                            message: '수업계획이 승인되었습니다. 교구 신청이 가능합니다.',
                            error: null 
                        };
                        
                    case 'submitted':
                        console.log('⏳ 수업계획 검토 중');
                        return { 
                            status: 'pending', 
                            data: latestPlan,
                            message: '수업계획이 검토 중입니다. 승인까지 잠시 기다려주세요.',
                            error: null 
                        };
                        
                    case 'rejected':
                        console.log('❌ 수업계획 반려됨');
                        return { 
                            status: 'rejected', 
                            data: latestPlan,
                            message: `수업계획이 반려되었습니다. 사유: ${latestPlan.rejection_reason || '사유 없음'}`,
                            error: null 
                        };
                        
                    case 'draft':
                    default:
                        console.log('📝 수업계획 임시저장 상태');
                        return { 
                            status: 'draft', 
                            data: latestPlan,
                            message: '임시저장된 수업계획이 있습니다. 계속 작성해서 제출하세요.',
                            error: null 
                        };
                }
                
            } catch (error) {
                console.error('❌ 수업계획 상태 확인 중 오류:', error);
                return { 
                    status: 'error', 
                    data: null, 
                    message: '수업계획 상태를 확인할 수 없습니다.',
                    error 
                };
            }
        };
        
        console.log('✅ 수업계획 상태 확인 함수 개선됨');
    }

    // 학생 페이지 로드 시 수업계획 상태 확인 개선
    if (window.StudentManager && window.StudentManager.checkLessonPlanRequirement) {
        const originalCheckLessonPlanRequirement = window.StudentManager.checkLessonPlanRequirement;
        
        window.StudentManager.checkLessonPlanRequirement = async function(userProfile) {
            try {
                console.log('🔍 수업계획 요구사항 확인 중...', userProfile);
                
                const statusResult = await window.SupabaseAPI.checkLessonPlanStatus(userProfile.id);
                
                console.log('📊 수업계획 상태 결과:', statusResult);
                
                if (statusResult.error) {
                    console.error('❌ 상태 확인 오류:', statusResult.error);
                    return false;
                }

                // 승인된 수업계획이 있으면 통과
                if (statusResult.status === 'approved') {
                    console.log('✅ 승인된 수업계획 존재 - 교구 신청 가능');
                    
                    // 수업계획 버튼 상태 업데이트
                    const lessonPlanBtn = document.getElementById('lessonPlanBtn');
                    if (lessonPlanBtn) {
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="check-circle"></i>
                            수업계획 완료
                        `;
                        lessonPlanBtn.classList.add('completed');
                        lessonPlanBtn.title = '수업계획이 승인되었습니다';
                    }
                    
                    return true;
                }

                // 제출 대기 중인 경우
                if (statusResult.status === 'pending') {
                    console.log('⏳ 수업계획 검토 중');
                    
                    const lessonPlanBtn = document.getElementById('lessonPlanBtn');
                    if (lessonPlanBtn) {
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="clock"></i>
                            검토 중
                        `;
                        lessonPlanBtn.classList.add('pending');
                        lessonPlanBtn.title = '수업계획이 검토 중입니다';
                    }
                    
                    return false;
                }

                // 반려된 경우
                if (statusResult.status === 'rejected') {
                    console.log('❌ 수업계획 반려됨');
                    
                    const lessonPlanBtn = document.getElementById('lessonPlanBtn');
                    if (lessonPlanBtn) {
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="x-circle"></i>
                            재작성 필요
                        `;
                        lessonPlanBtn.classList.add('rejected');
                        lessonPlanBtn.title = statusResult.message || '수업계획이 반려되었습니다';
                    }
                    
                    return false;
                }

                // 임시저장 또는 미작성인 경우
                console.log('📝 수업계획 작성 필요');
                
                const lessonPlanBtn = document.getElementById('lessonPlanBtn');
                if (lessonPlanBtn) {
                    if (statusResult.status === 'draft') {
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="edit"></i>
                            계속 작성
                        `;
                        lessonPlanBtn.title = '임시저장된 수업계획이 있습니다';
                    } else {
                        lessonPlanBtn.innerHTML = `
                            <i data-lucide="calendar"></i>
                            수업계획 작성
                        `;
                        lessonPlanBtn.title = '수업계획을 작성해주세요';
                    }
                    lessonPlanBtn.classList.add('required');
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ 수업계획 요구사항 확인 중 오류:', error);
                return false;
            }
        };
        
        console.log('✅ 수업계획 요구사항 확인 함수 개선됨');
    }

    // 학생 대시보드 업데이트 시 수업계획 상태 반영
    if (window.StudentManager && window.StudentManager.updateDashboard) {
        const originalUpdateDashboard = window.StudentManager.updateDashboard;
        
        window.StudentManager.updateDashboard = async function(userProfile) {
            try {
                // 기존 대시보드 업데이트 실행
                await originalUpdateDashboard.call(this, userProfile);
                
                // 수업계획 상태 확인 및 UI 업데이트
                const statusResult = await window.SupabaseAPI.checkLessonPlanStatus(userProfile.id);
                
                // 수업계획 상태에 따른 메시지 표시
                let statusMessage = '';
                let statusClass = '';
                
                switch (statusResult.status) {
                    case 'approved':
                        statusMessage = '✅ 수업계획이 승인되었습니다. 교구 신청이 가능합니다.';
                        statusClass = 'success';
                        break;
                    case 'pending':
                        statusMessage = '⏳ 수업계획 검토 중입니다. 승인까지 잠시 기다려주세요.';
                        statusClass = 'warning';
                        break;
                    case 'rejected':
                        statusMessage = `❌ 수업계획이 반려되었습니다. ${statusResult.message || ''}`;
                        statusClass = 'error';
                        break;
                    case 'draft':
                        statusMessage = '📝 임시저장된 수업계획이 있습니다. 계속 작성해서 제출하세요.';
                        statusClass = 'info';
                        break;
                    case 'none':
                    default:
                        statusMessage = '📝 수업계획을 작성해주세요. 승인 후 교구 신청이 가능합니다.';
                        statusClass = 'info';
                        break;
                }
                
                // 상태 메시지 표시
                const statusContainer = document.createElement('div');
                statusContainer.className = `lesson-plan-status ${statusClass}`;
                statusContainer.innerHTML = `
                    <div class="status-message">
                        <p>${statusMessage}</p>
                    </div>
                `;
                
                // 기존 상태 메시지 제거 후 새로 추가
                const existingStatus = document.querySelector('.lesson-plan-status');
                if (existingStatus) {
                    existingStatus.remove();
                }
                
                const dashboardHeader = document.querySelector('.dashboard-header');
                if (dashboardHeader) {
                    dashboardHeader.appendChild(statusContainer);
                }
                
                console.log('📊 수업계획 상태 UI 업데이트 완료:', statusResult.status);
                
            } catch (error) {
                console.error('❌ 대시보드 업데이트 중 오류:', error);
            }
        };
        
        console.log('✅ 학생 대시보드 업데이트 함수 개선됨');
    }

    // CSS 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .lesson-plan-status {
            margin: 15px 0;
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .lesson-plan-status.success {
            border-left-color: #28a745;
            background-color: #d4edda;
            color: #155724;
        }
        
        .lesson-plan-status.warning {
            border-left-color: #ffc107;
            background-color: #fff3cd;
            color: #856404;
        }
        
        .lesson-plan-status.error {
            border-left-color: #dc3545;
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .lesson-plan-status.info {
            border-left-color: #17a2b8;
            background-color: #d1ecf1;
            color: #0c5460;
        }
        
        .lesson-plan-status p {
            margin: 0;
            font-weight: 500;
        }
        
        #lessonPlanBtn.completed {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
            color: white !important;
        }
        
        #lessonPlanBtn.pending {
            background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%) !important;
            color: white !important;
        }
        
        #lessonPlanBtn.rejected {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
            color: white !important;
        }
        
        #lessonPlanBtn.required {
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
            color: white !important;
        }
    `;
    document.head.appendChild(style);

    console.log('✅ 수업계획 상태 확인 로직 버그 수정 완료');
})();
