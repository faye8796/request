// 수업계획 도우미 모듈 - C단계 (v4.0)
// 🎯 책임: 수업계획 상태 관리, 버튼 제어, 알림 시스템
// 📦 분리 출처: student.js → lesson-plan-helper.js

const LessonPlanHelper = {
    // === 모듈 초기화 ===
    studentManager: null,
    isInitialized: false,

    // 모듈 초기화 (StudentManager 참조 받기)
    init: function(managerInstance) {
        try {
            console.log('📋 LessonPlanHelper 초기화 시작');
            this.studentManager = managerInstance;
            this.isInitialized = true;
            console.log('✅ LessonPlanHelper 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ LessonPlanHelper 초기화 오류:', error);
            return false;
        }
    },

    // === 수업계획 상태 관리 ===

    // 수업계획 상태 확인 및 UI 업데이트
    checkLessonPlanStatus: function() {
        try {
            if (!this.studentManager) {
                console.error('❌ StudentManager 참조가 없습니다');
                return Promise.resolve();
            }

            console.log('📋 수업계획 상태 확인 시작');
            
            const currentUser = this.studentManager.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                this.showLessonPlanRequiredNotice();
                return Promise.resolve();
            }

            const self = this;
            
            return this.studentManager.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(lessonPlan) {
                self.updateLessonPlanButton(lessonPlan);
                
                return self.updateApplicationButtonsState(lessonPlan).then(function() {
                    return self.showLessonPlanStatusNotice(lessonPlan);
                }).then(function() {
                    console.log('✅ 수업계획 상태 확인 완료');
                }).catch(function(error) {
                    console.warn('수업계획 상태 처리 중 일부 오류 발생:', error);
                    return Promise.resolve();
                });
            }).catch(function(apiError) {
                console.error('수업계획 조회 API 오류:', apiError);
                self.showApiErrorNotice();
                return Promise.resolve();
            });
        } catch (error) {
            console.error('❌ 수업계획 상태 확인 오류:', error);
            this.showErrorNotice('수업계획 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
            return Promise.resolve();
        }
    },

    // 수업계획 버튼 업데이트
    updateLessonPlanButton: function(lessonPlan) {
        try {
            const lessonPlanBtn = document.getElementById('lessonPlanBtn');
            if (!lessonPlanBtn) {
                console.warn('수업계획 버튼을 찾을 수 없습니다');
                return;
            }

            if (lessonPlan) {
                if (lessonPlan.status === 'approved') {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-check"></i>
                        수업계획 승인됨 (확인가능)
                    `;
                    lessonPlanBtn.className = 'btn btn-success';
                } else if (lessonPlan.status === 'rejected') {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-x"></i>
                        수업계획 수정 필요
                    `;
                    lessonPlanBtn.className = 'btn btn-danger';
                } else if (lessonPlan.status === 'submitted') {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-clock"></i>
                        수업계획 확인 (승인대기중)
                    `;
                    lessonPlanBtn.className = 'btn btn-warning';
                } else {
                    lessonPlanBtn.innerHTML = `
                        <i data-lucide="calendar-edit"></i>
                        수업계획 완료하기 (필수)
                    `;
                    lessonPlanBtn.className = 'btn btn-warning';
                }
            } else {
                lessonPlanBtn.innerHTML = `
                    <i data-lucide="calendar-plus"></i>
                    수업계획 작성하기 (필수)
                `;
                lessonPlanBtn.className = 'btn btn-warning';
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('수업계획 버튼 업데이트 오류:', error);
        }
    },

    // 교구 신청 버튼 상태 업데이트
    updateApplicationButtonsState: function(lessonPlan) {
        try {
            console.log('🔘 교구 신청 버튼 상태 업데이트');
            
            if (!this.studentManager) {
                this.disableApplicationButtons('시스템 오류');
                return Promise.resolve();
            }

            const currentUser = this.studentManager.getCurrentUserSafely();
            if (!currentUser) {
                this.disableApplicationButtons('로그인이 필요합니다');
                return Promise.resolve();
            }

            const isLessonPlanApproved = lessonPlan && lessonPlan.status === 'approved';
            
            if (!isLessonPlanApproved) {
                let message = '수업계획 승인 후 신청 가능합니다 (필수)';
                
                if (!lessonPlan) {
                    message = '수업계획 작성 후 승인받아야 신청 가능합니다 (필수)';
                } else if (lessonPlan.status === 'submitted') {
                    message = '수업계획 승인 대기 중 - 승인 후 신청 가능합니다';
                } else if (lessonPlan.status === 'rejected') {
                    message = '수업계획이 반려됨 - 수정 후 승인받아야 신청 가능합니다';
                } else if (lessonPlan.status === 'draft') {
                    message = '수업계획 완료 제출 후 승인받아야 신청 가능합니다 (필수)';
                }
                
                this.disableApplicationButtons(message);
                return Promise.resolve();
            }

            const self = this;
            
            return this.studentManager.safeApiCall(function() {
                return SupabaseAPI.getStudentBudgetStatus(currentUser.id);
            }).then(function(budgetStatus) {
                if (!budgetStatus || budgetStatus.allocated === 0) {
                    self.disableApplicationButtons('예산 배정 처리 중입니다. 잠시만 기다려주세요.');
                } else {
                    self.enableApplicationButtons();
                    console.log('✅ 교구 신청 버튼 활성화됨');
                }
                console.log('✅ 교구 신청 버튼 상태 업데이트 완료');
            }).catch(function(error) {
                console.error('예산 상태 조회 오류:', error);
                self.disableApplicationButtons('예산 정보를 불러올 수 없습니다');
                return Promise.resolve();
            });
        } catch (error) {
            console.error('❌ 교구 신청 버튼 상태 업데이트 오류:', error);
            this.disableApplicationButtons('시스템 오류 - 잠시 후 다시 시도해주세요');
            return Promise.resolve();
        }
    },

    // 교구 신청 버튼 비활성화
    disableApplicationButtons: function(reason) {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(function(btnId) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = true;
                    btn.title = reason;
                    btn.classList.add('disabled');
                    
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 교구 신청 (승인 필요)';
                    } else {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 묶음 신청 (승인 필요)';
                    }
                }
            });
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('교구 신청 버튼 비활성화 오류:', error);
        }
    },

    // 교구 신청 버튼 활성화
    enableApplicationButtons: function() {
        try {
            const buttons = ['newApplicationBtn', 'bundleApplicationBtn'];
            buttons.forEach(function(btnId) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = false;
                    btn.title = '';
                    btn.classList.remove('disabled');
                    
                    const icon = btn.querySelector('i');
                    const iconClass = icon ? icon.getAttribute('data-lucide') : 'package';
                    
                    if (btnId === 'newApplicationBtn') {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 새 교구 신청';
                    } else {
                        btn.innerHTML = '<i data-lucide="' + iconClass + '"></i> 묶음 신청';
                    }
                }
            });
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('교구 신청 버튼 활성화 오류:', error);
        }
    },

    // === 수업계획 페이지 전환 ===

    // 수업계획 버튼 클릭 처리
    handleLessonPlanClick: function() {
        try {
            console.log('📋 수업계획 버튼 클릭 - edit 모드로 표시');
            
            if (!this.studentManager) {
                alert('시스템 오류가 발생했습니다.');
                return;
            }

            const currentUser = this.studentManager.getCurrentUserSafely();
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            const self = this;
            
            return this.studentManager.safeApiCall(function() {
                return SupabaseAPI.getStudentLessonPlan(currentUser.id);
            }).then(function(existingPlan) {
                const studentPage = document.getElementById('studentPage');
                const lessonPlanPage = document.getElementById('lessonPlanPage');
                
                if (studentPage && lessonPlanPage) {
                    studentPage.classList.remove('active');
                    lessonPlanPage.classList.add('active');
                    
                    console.log('✅ 수업계획 페이지 활성화 완료');
                } else {
                    console.error('❌ 페이지 요소를 찾을 수 없습니다');
                    alert('수업계획 페이지를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                    return;
                }

                if (typeof LessonPlanManager !== 'undefined') {
                    setTimeout(function() {
                        try {
                            if (typeof LessonPlanManager.showLessonPlanPage === 'function') {
                                LessonPlanManager.showLessonPlanPage('edit', existingPlan);
                                console.log('✅ LessonPlanManager edit 모드 초기화 완료');
                            } else {
                                console.warn('⚠️ LessonPlanManager.showLessonPlanPage 함수를 찾을 수 없습니다');
                                alert('수업계획 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
                            }
                        } catch (error) {
                            console.error('❌ LessonPlanManager 처리 오류:', error);
                            alert('수업계획 시스템 오류가 발생했습니다.');
                        }
                    }, 200);
                } else {
                    console.error('❌ LessonPlanManager를 찾을 수 없습니다');
                    alert('수업계획 관리 시스템을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                }
            }).catch(function(error) {
                console.error('❌ 수업계획 조회 오류:', error);
                alert('수업계획 데이터를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
            });
        } catch (error) {
            console.error('❌ 수업계획 버튼 클릭 처리 오류:', error);
            alert('수업계획 페이지로 이동하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    },

    // === 수업계획 상태 알림 시스템 ===

    // 수업계획 상태 알림 (간소화된 버전)
    showLessonPlanStatusNotice: function(lessonPlan) {
        try {
            const self = this;
            
            this.removeExistingNotices();

            if (!this.studentManager) {
                return Promise.resolve();
            }

            const currentUser = this.studentManager.getCurrentUserSafely();
            if (!currentUser) return Promise.resolve();

            return this.studentManager.safeApiCall(function() {
                return SupabaseAPI.canEditLessonPlan();
            }).then(function(canEdit) {
                let noticeContent = '';
                let noticeType = '';

                if (!lessonPlan) {
                    if (!canEdit) {
                        noticeContent = `
                            <div class="notice-content warning">
                                <i data-lucide="alert-triangle"></i>
                                <div>
                                    <h4>⚠️ 수업계획 수정 기간이 종료되었습니다</h4>
                                    <p>수업계획 작성/수정 가능 기간이 지났습니다. 수업계획은 <strong>필수 제출 사항</strong>이므로 관리자에게 즉시 문의하세요.</p>
                                </div>
                            </div>
                        `;
                        noticeType = 'warning';
                    } else {
                        noticeContent = `
                            <div class="notice-content info">
                                <i data-lucide="calendar-plus"></i>
                                <div>
                                    <h4>📋 수업계획 작성이 필요합니다 (필수)</h4>
                                    <p><strong>수업계획은 필수 제출 사항입니다.</strong> 교구 신청 전에 반드시 수업계획을 작성하고 관리자의 승인을 받아야 합니다.</p>
                                    <button class="btn primary small" onclick="LessonPlanHelper.handleLessonPlanClick()">
                                        ✍️ 지금 작성하기
                                    </button>
                                </div>
                            </div>
                        `;
                        noticeType = 'info';
                    }
                } else if (lessonPlan.status === 'approved') {
                    noticeContent = `
                        <div class="notice-content success">
                            <i data-lucide="calendar-check"></i>
                            <div>
                                <h4>✅ 수업계획이 승인되었습니다!</h4>
                                <p>이제 교구 신청이 가능합니다. 승인된 예산 내에서 필요한 교구를 신청해주세요.</p>
                                <button class="btn success small" onclick="LessonPlanHelper.handleLessonPlanClick()">
                                    📋 승인된 계획 확인하기
                                </button>
                            </div>
                        </div>
                    `;
                    noticeType = 'success';
                }

                if (noticeContent) {
                    self.displayNotice(noticeContent, noticeType);
                }
            }).catch(function(error) {
                console.error('수업계획 수정 가능 여부 확인 오류:', error);
            });
        } catch (error) {
            console.error('수업계획 상태 알림 표시 오류:', error);
            return Promise.resolve();
        }
    },

    removeExistingNotices: function() {
        try {
            const noticeSelectors = [
                '#lessonPlanNotice',
                '#basicNotice',
                '.dashboard-notice',
                '.lesson-plan-notice',
                '.notice-duplicate'
            ];

            noticeSelectors.forEach(function(selector) {
                const notices = document.querySelectorAll(selector);
                for (let i = 0; i < notices.length; i++) {
                    const notice = notices[i];
                    if (notice && notice.parentNode) {
                        notice.parentNode.removeChild(notice);
                    }
                }
            });
        } catch (error) {
            console.error('기존 알림 제거 오류:', error);
        }
    },

    displayNotice: function(content, type) {
        try {
            this.removeExistingNotices();
            
            const notice = document.createElement('div');
            notice.id = 'lessonPlanNotice';
            notice.className = 'dashboard-notice ' + type;
            notice.innerHTML = content;
            
            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader && dashboardHeader.parentNode) {
                dashboardHeader.parentNode.insertBefore(notice, dashboardHeader.nextSibling);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                console.log('✅ 수업계획 상태 알림 표시됨:', type);
            }
        } catch (error) {
            console.error('알림 표시 오류:', error);
        }
    },

    showApiErrorNotice: function() {
        this.showErrorNotice('서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
    },

    showErrorNotice: function(message) {
        this.displayNotice(`
            <div class="notice-content danger">
                <i data-lucide="wifi-off"></i>
                <div>
                    <h4>❌ 연결 오류</h4>
                    <p>${message}</p>
                    <button class="btn secondary small" onclick="location.reload()">
                        🔄 새로고침
                    </button>
                </div>
            </div>
        `, 'danger');
    },

    showLessonPlanRequiredNotice: function() {
        this.displayNotice(`
            <div class="notice-content info">
                <i data-lucide="calendar-plus"></i>
                <div>
                    <h4>📋 수업계획 작성이 필요합니다</h4>
                    <p>교구 신청을 위해서는 먼저 수업계획을 작성해야 합니다.</p>
                    <button class="btn primary small" onclick="LessonPlanHelper.handleLessonPlanClick()">
                        ✍️ 수업계획 작성하기
                    </button>
                </div>
            </div>
        `, 'info');
    }
};

// 전역 접근을 위한 window 객체에 추가
window.LessonPlanHelper = LessonPlanHelper;

console.log('📋 LessonPlanHelper v4.0 로드 완료 - 수업계획 전담 모듈');
