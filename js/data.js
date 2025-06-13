// 데이터 관리 모듈 - Supabase 연동 버전
// 하드코딩된 데이터 제거하고 Supabase API 사용으로 전환

const DataManager = {
    // 현재 사용자 정보 (세션 관리)
    currentUser: null,
    currentUserType: null,

    // ===================
    // 인증 관련 함수들
    // ===================

    // 학생 인증 (SupabaseAPI 위임)
    async authenticateStudent(name, birthDate) {
        if (!window.SupabaseAPI) {
            console.error('SupabaseAPI not loaded');
            return false;
        }

        const result = await window.SupabaseAPI.authenticateStudent(name, birthDate);
        if (result.success) {
            this.currentUser = result.user;
            this.currentUserType = 'student';
            return true;
        }
        return false;
    },

    // 관리자 인증 (SupabaseAPI 위임)
    async authenticateAdmin(code) {
        if (!window.SupabaseAPI) {
            console.error('SupabaseAPI not loaded');
            return false;
        }

        const result = await window.SupabaseAPI.authenticateAdmin(code);
        if (result.success) {
            this.currentUser = result.user;
            this.currentUserType = 'admin';
            return true;
        }
        return false;
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        if (window.SupabaseAPI) {
            window.SupabaseAPI.logout();
        }
    },

    // ===================
    // 수업계획 관련 함수들
    // ===================

    // 수업계획 수정 가능 여부 확인
    async canEditLessonPlan() {
        if (!window.SupabaseAPI) return false;
        return await window.SupabaseAPI.canEditLessonPlan();
    },

    // 수업계획 저장/업데이트
    async saveLessonPlan(studentId, planData) {
        if (!window.SupabaseAPI) {
            console.error('SupabaseAPI not loaded');
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.saveLessonPlan(studentId, planData, false);
    },

    // 수업계획 임시저장
    async saveLessonPlanDraft(studentId, planData) {
        if (!window.SupabaseAPI) {
            console.error('SupabaseAPI not loaded');
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.saveLessonPlan(studentId, planData, true);
    },

    // 학생 수업계획 조회
    async getStudentLessonPlan(studentId) {
        if (!window.SupabaseAPI) return null;
        return await window.SupabaseAPI.getStudentLessonPlan(studentId);
    },

    // 모든 수업계획 조회 (관리자용)
    async getAllLessonPlans() {
        if (!window.SupabaseAPI) return [];
        return await window.SupabaseAPI.getAllLessonPlans();
    },

    // 대기 중인 수업계획 조회
    async getPendingLessonPlans() {
        if (!window.SupabaseAPI) return [];
        return await window.SupabaseAPI.getPendingLessonPlans();
    },

    // 수업계획 승인
    async approveLessonPlan(studentId) {
        if (!window.SupabaseAPI) {
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.approveLessonPlan(studentId);
    },

    // 수업계획 반려
    async rejectLessonPlan(studentId, reason) {
        if (!window.SupabaseAPI) {
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.rejectLessonPlan(studentId, reason);
    },

    // ===================
    // 예산 관련 함수들
    // ===================

    // 학생 예산 상태 조회
    async getStudentBudgetStatus(studentId) {
        if (!window.SupabaseAPI) return null;
        return await window.SupabaseAPI.getStudentBudgetStatus(studentId);
    },

    // 분야별 예산 설정 조회
    async getAllFieldBudgetSettings() {
        if (!window.SupabaseAPI) {
            // 기본 설정 반환 (fallback)
            const config = window.CONFIG;
            return config?.APP?.DEFAULT_BUDGET_SETTINGS || {};
        }
        return await window.SupabaseAPI.getAllFieldBudgetSettings();
    },

    // 분야별 예산 설정 업데이트
    async updateFieldBudgetSettings(field, settings) {
        if (!window.SupabaseAPI) {
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.updateFieldBudgetSettings(field, settings);
    },

    // ===================
    // 교구 신청 관련 함수들
    // ===================

    // 학생 신청 내역 조회
    async getStudentApplications(studentId) {
        if (!window.SupabaseAPI) return [];
        return await window.SupabaseAPI.getStudentApplications(studentId);
    },

    // 교구 신청 추가
    async addApplication(studentId, itemData) {
        if (!window.SupabaseAPI) {
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.addApplication(studentId, itemData);
    },

    // 신청 아이템 수정
    async updateApplicationItem(studentId, itemId, updatedData) {
        if (!window.SupabaseAPI) return false;
        const result = await window.SupabaseAPI.updateApplicationItem(studentId, itemId, updatedData);
        return result.success;
    },

    // 신청 아이템 삭제
    async deleteApplicationItem(studentId, itemId) {
        if (!window.SupabaseAPI) return false;
        const result = await window.SupabaseAPI.deleteApplicationItem(studentId, itemId);
        return result.success;
    },

    // 전체 신청 목록 조회 (관리자용)
    async getAllApplications() {
        if (!window.SupabaseAPI) return [];
        return await window.SupabaseAPI.getAllApplications();
    },

    // 신청 검색
    async searchApplications(searchTerm) {
        if (!window.SupabaseAPI) return [];
        return await window.SupabaseAPI.searchApplications(searchTerm);
    },

    // 아이템 상태 업데이트 (관리자용)
    async updateItemStatus(requestId, status, rejectionReason = null) {
        if (!window.SupabaseAPI) return false;
        const result = await window.SupabaseAPI.updateItemStatus(requestId, status, rejectionReason);
        return result.success;
    },

    // ===================
    // 영수증 관련 함수들
    // ===================

    // 영수증 제출
    async submitReceipt(requestId, receiptData) {
        if (!window.SupabaseAPI) {
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.submitReceipt(requestId, receiptData);
    },

    // 영수증 조회
    async getReceiptByRequestId(requestId) {
        if (!window.SupabaseAPI) return null;
        return await window.SupabaseAPI.getReceiptByRequestId(requestId);
    },

    // ===================
    // 시스템 설정 관련 함수들
    // ===================

    // 시스템 설정 조회
    async getSystemSettings() {
        if (!window.SupabaseAPI) return {};
        return await window.SupabaseAPI.getSystemSettings();
    },

    // 시스템 설정 업데이트
    async updateSystemSetting(key, value) {
        if (!window.SupabaseAPI) {
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }
        return await window.SupabaseAPI.updateSystemSetting(key, value);
    },

    // 테스트 모드 토글
    async toggleTestMode() {
        if (!window.SupabaseAPI) return false;
        return await window.SupabaseAPI.toggleTestMode();
    },

    // 수업계획 설정 업데이트
    async updateLessonPlanSettings(newSettings) {
        if (!window.SupabaseAPI) {
            return { success: false, message: 'API가 로드되지 않았습니다.' };
        }

        // 각 설정을 개별적으로 업데이트
        const updates = [];
        if (newSettings.editDeadline !== undefined) {
            updates.push(window.SupabaseAPI.updateSystemSetting('lesson_plan_deadline', newSettings.editDeadline));
        }
        if (newSettings.editTime !== undefined) {
            updates.push(window.SupabaseAPI.updateSystemSetting('lesson_plan_time', newSettings.editTime));
        }
        if (newSettings.noticeMessage !== undefined) {
            updates.push(window.SupabaseAPI.updateSystemSetting('notice_message', newSettings.noticeMessage));
        }
        if (newSettings.testMode !== undefined) {
            updates.push(window.SupabaseAPI.updateSystemSetting('test_mode', newSettings.testMode));
        }
        if (newSettings.allowOverrideDeadline !== undefined) {
            updates.push(window.SupabaseAPI.updateSystemSetting('ignore_deadline', newSettings.allowOverrideDeadline));
        }

        try {
            await Promise.all(updates);
            const isEditingAllowed = await this.canEditLessonPlan();
            
            return {
                success: true,
                isEditingAllowed: isEditingAllowed
            };
        } catch (error) {
            console.error('Error updating lesson plan settings:', error);
            return { success: false, message: '설정 업데이트 중 오류가 발생했습니다.' };
        }
    },

    // ===================
    // 통계 관련 함수들
    // ===================

    // 관리자용 통계 데이터
    async getStats() {
        if (!window.SupabaseAPI) {
            return {
                totalStudents: 0,
                applicantCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                purchasedCount: 0
            };
        }
        return await window.SupabaseAPI.getStats();
    },

    // 예산 현황 통계
    async getBudgetOverviewStats() {
        if (!window.SupabaseAPI) {
            return {
                totalApprovedBudget: 0,
                approvedItemsTotal: 0,
                purchasedTotal: 0,
                averagePerPerson: 0
            };
        }
        return await window.SupabaseAPI.getBudgetOverviewStats();
    },

    // 오프라인 구매 통계
    async getOfflinePurchaseStats() {
        if (!window.SupabaseAPI) {
            return {
                approvedOffline: 0,
                withReceipt: 0,
                pendingReceipt: 0
            };
        }
        return await window.SupabaseAPI.getOfflinePurchaseStats();
    },

    // Excel 내보내기 데이터 준비
    async prepareExportData() {
        if (!window.SupabaseAPI) return [];
        return await window.SupabaseAPI.prepareExportData();
    },

    // ===================
    // 유틸리티 함수들 (변경 없음)
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

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    // ===================
    // 레거시 호환성 함수들 (기존 코드와의 호환성을 위해 유지)
    // ===================

    // 배송지 정보 업데이트 (현재 user_profiles 테이블에서 관리하지 않으므로 임시 구현)
    async updateShippingAddress(studentId, addressData) {
        // TODO: 필요시 별도 테이블로 관리하거나 user_profiles에 컬럼 추가
        console.warn('updateShippingAddress: Not implemented in Supabase version');
        return false;
    },

    // 학생 정보 조회 (SupabaseAPI 위임)
    async getStudentById(studentId) {
        if (!window.SupabaseAPI) return null;
        return await window.SupabaseAPI.getStudentById(studentId);
    },

    // 모든 학생 조회 (SupabaseAPI 위임)
    async getAllStudents() {
        if (!window.SupabaseAPI) return [];
        return await window.SupabaseAPI.getAllStudents();
    }
};

// 전역 접근을 위해 window 객체에 추가
window.DataManager = DataManager;

// 하위 호환성을 위한 알림
console.log('DataManager loaded - Now using Supabase API integration');
