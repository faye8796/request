/**
 * 수업계획 상태 확인 로직 버그 수정 (정정 버전)
 * 
 * @problem '이가짜' 사용자가 이미 승인된 수업계획이 있는데도 수업계획 작성 페이지로 리다이렉트됨
 * @solution 실제 호출되는 함수들을 정확히 수정하여 올바른 로직 적용
 * @affects core-auth.js의 safeRedirectStudent 로직
 * @author Claude AI
 * @date 2025-06-17
 */

(function() {
    'use strict';
    
    console.log('🔧 수업계획 상태 확인 로직 버그 수정 (정정 버전) 시작...');

    // 기존 core-auth.js의 safeRedirectStudent 함수를 완전히 재정의
    if (window.AuthManager && window.AuthManager.safeRedirectStudent) {
        console.log('🔄 AuthManager.safeRedirectStudent 함수 재정의 중...');
        
        window.AuthManager.safeRedirectStudent = async function(studentId) {
            try {
                console.log('🔍 수업계획 상태 확인 시작 - 학생 ID:', studentId);
                
                // 추가 알림 제거 - 환영 메시지만 표시
                this.clearAllNotices();
                
                // SupabaseAPI 존재 확인
                if (typeof SupabaseAPI === 'undefined') {
                    console.warn('SupabaseAPI를 찾을 수 없습니다 - 기본 대시보드로 이동');
                    setTimeout(() => {
                        this.redirectToStudentDashboard();
                    }, 1000);
                    return;
                }

                // 수업계획 상태 직접 확인 (DB 쿼리)
                const lessonPlanData = await this.directCheckLessonPlan(studentId);
                console.log('📋 수업계획 데이터:', lessonPlanData);
                
                // 상태에 따른 리다이렉트 결정
                const shouldGoToDashboard = this.shouldRedirectToDashboard(lessonPlanData);
                
                if (shouldGoToDashboard) {
                    console.log('✅ 수업계획 완료 - 학생 대시보드로 이동');
                    setTimeout(() => {
                        this.redirectToStudentDashboard();
                    }, 1000);
                } else {
                    console.log('📝 수업계획 작성 필요 - 수업계획 페이지로 이동');
                    setTimeout(() => {
                        this.redirectToLessonPlanWithMessage(lessonPlanData);
                    }, 1000);
                }
                
            } catch (error) {
                console.warn('❌ 수업계획 상태 확인 오류:', error);
                // 오류 발생 시 기본적으로 대시보드로 이동
                setTimeout(() => {
                    console.log('🏠 오류로 인한 기본 대시보드 이동');
                    this.redirectToStudentDashboard();
                }, 1000);
            }
        };
        
        // 직접 수업계획 확인 함수 추가
        window.AuthManager.directCheckLessonPlan = async function(studentId) {
            try {
                if (!window.SupabaseAPI || !window.SupabaseAPI.client) {
                    throw new Error('SupabaseAPI 클라이언트를 사용할 수 없습니다');
                }

                const client = await window.SupabaseAPI.ensureClient();
                
                // 직접 DB 쿼리로 수업계획 상태 확인
                const { data, error } = await client
                    .from('lesson_plans')
                    .select('*')
                    .eq('user_id', studentId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) {
                    console.error('수업계획 조회 오류:', error);
                    return null;
                }

                if (!data || data.length === 0) {
                    console.log('📭 수업계획이 없습니다');
                    return null;
                }

                const plan = data[0];
                console.log('📋 수업계획 조회 결과:', {
                    id: plan.id,
                    status: plan.status,
                    approved_at: plan.approved_at,
                    submitted_at: plan.submitted_at,
                    rejection_reason: plan.rejection_reason
                });

                return plan;
                
            } catch (error) {
                console.error('❌ 직접 수업계획 확인 오류:', error);
                return null;
            }
        };
        
        // 대시보드 리다이렉트 여부 판단 함수 추가
        window.AuthManager.shouldRedirectToDashboard = function(lessonPlanData) {
            if (!lessonPlanData) {
                console.log('📝 수업계획 없음 → 작성 페이지');
                return false;
            }

            const status = lessonPlanData.status;
            console.log('📊 수업계획 상태 분석:', status);

            // approved 상태면 무조건 대시보드
            if (status === 'approved') {
                console.log('✅ 승인된 수업계획 → 대시보드');
                return true;
            }

            // submitted 상태이고 승인/반려 처리가 안됐으면 대시보드 (검토중)
            if (status === 'submitted') {
                const hasApproval = lessonPlanData.approved_at && lessonPlanData.approved_by;
                const hasRejection = lessonPlanData.rejection_reason && lessonPlanData.rejection_reason.trim();
                
                if (!hasApproval && !hasRejection) {
                    console.log('⏳ 제출됨 (검토중) → 대시보드');
                    return true;
                } else if (hasRejection) {
                    console.log('❌ 반려됨 → 작성 페이지');
                    return false;
                }
            }

            // draft 상태면 작성 페이지
            if (status === 'draft') {
                console.log('📝 임시저장됨 → 작성 페이지');
                return false;
            }

            // rejected 상태면 작성 페이지
            if (status === 'rejected') {
                console.log('❌ 반려됨 → 작성 페이지');
                return false;
            }

            // 기타 경우 기본값 (대시보드)
            console.log('❓ 알 수 없는 상태 → 대시보드 (기본값)');
            return true;
        };
        
        // 메시지와 함께 수업계획 페이지로 이동
        window.AuthManager.redirectToLessonPlanWithMessage = function(lessonPlanData) {
            try {
                this.redirectToLessonPlan();
                
                // 상태에 따른 적절한 메시지 표시
                setTimeout(() => {
                    if (!lessonPlanData) {
                        this.showLessonPlanGuidance();
                    } else if (lessonPlanData.status === 'draft') {
                        this.showLessonPlanContinueGuidance();
                    } else if (lessonPlanData.status === 'rejected') {
                        this.showLessonPlanRejectedGuidance(lessonPlanData.rejection_reason);
                    } else {
                        this.showLessonPlanGuidance();
                    }
                }, 500);
                
            } catch (error) {
                console.error('❌ 수업계획 페이지 이동 오류:', error);
            }
        };
        
        // 반려 안내 메시지 추가
        window.AuthManager.showLessonPlanRejectedGuidance = function(rejectionReason) {
            try {
                this.clearAllNotices();
                
                const guidance = document.createElement('div');
                guidance.className = 'lesson-plan-guidance-overlay';
                guidance.innerHTML = `
                    <div class="guidance-content">
                        <div class="guidance-icon">
                            <i data-lucide="x-circle" style="width: 3rem; height: 3rem; color: #dc3545;"></i>
                        </div>
                        <h3>수업계획이 반려되었습니다</h3>
                        <p><strong>반려 사유:</strong> ${rejectionReason || '사유가 제공되지 않았습니다'}</p>
                        <p>수정 후 다시 제출해주세요.</p>
                        <button class="btn primary" onclick="this.parentElement.parentElement.remove()">
                            수정하기
                        </button>
                    </div>
                `;
                
                document.body.appendChild(guidance);
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                // 10초 후 자동 제거
                setTimeout(() => {
                    if (guidance.parentNode) {
                        guidance.parentNode.removeChild(guidance);
                    }
                }, 10000);
                
            } catch (error) {
                console.error('반려 안내 표시 오류:', error);
            }
        };
        
        console.log('✅ AuthManager.safeRedirectStudent 함수 재정의 완료');
    } else {
        console.warn('⚠️ AuthManager.safeRedirectStudent 함수를 찾을 수 없습니다');
    }

    // 기존 quietlyCheckLessonPlan 함수도 개선
    if (window.AuthManager && window.AuthManager.quietlyCheckLessonPlan) {
        window.AuthManager.quietlyCheckLessonPlan = async function(studentId) {
            return await this.directCheckLessonPlan(studentId);
        };
        console.log('✅ AuthManager.quietlyCheckLessonPlan 함수 개선 완료');
    }

    // 추가 CSS 스타일
    const style = document.createElement('style');
    style.textContent = `
        .lesson-plan-guidance-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        }
        
        .guidance-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease-out;
        }
        
        .guidance-icon {
            margin-bottom: 1rem;
        }
        
        .guidance-content h3 {
            margin: 0 0 1rem 0;
            color: #2c3e50;
            font-size: 1.5rem;
        }
        
        .guidance-content p {
            margin: 0.5rem 0;
            color: #6c757d;
            line-height: 1.5;
        }
        
        .guidance-content .btn {
            margin-top: 1.5rem;
            padding: 12px 24px;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .guidance-content .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(20px);
            }
            to { 
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    console.log('✅ 수업계획 상태 확인 로직 버그 수정 (정정 버전) 완료');
})();
