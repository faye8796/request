// 데이터 관리 모듈
const DataManager = {
    // 현재 사용자 정보
    currentUser: null,
    currentUserType: null,

    // 수업계획 설정 정보 (업데이트됨)
    lessonPlanSettings: {
        editDeadline: '2024-12-31',  // 수정 마감일
        editTime: '23:59',           // 수정 마감 시간
        noticeMessage: '',           // 알림 메시지
        testMode: false,             // 테스트 모드 (항상 편집 허용)
        allowOverrideDeadline: false // 마감일 무시 모드
    },

    // 모의 학생 데이터 - 예산 값 업데이트
    students: [
        { 
            id: 1, 
            name: '김민수', 
            birthDate: '1998-03-15', 
            instituteName: '하노이 세종학당', 
            specialization: '한국어교육', 
            budgetLimit: 300000,
            allocatedBudget: 300000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        },
        { 
            id: 2, 
            name: '이지영', 
            birthDate: '1999-07-22', 
            instituteName: '방콕 세종학당', 
            specialization: '전통문화예술', 
            budgetLimit: 400000,
            allocatedBudget: 400000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        },
        { 
            id: 3, 
            name: '박준호', 
            birthDate: '1997-11-08', 
            instituteName: '자카르타 세종학당', 
            specialization: 'K-Pop 문화', 
            budgetLimit: 250000,
            allocatedBudget: 250000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        },
        { 
            id: 4, 
            name: '최서연', 
            birthDate: '1998-12-03', 
            instituteName: '쿠알라룸푸르 세종학당', 
            specialization: '한국어교육', 
            budgetLimit: 350000,
            allocatedBudget: 350000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        },
        { 
            id: 5, 
            name: '정현우', 
            birthDate: '1999-05-17', 
            instituteName: '마닐라 세종학당', 
            specialization: '한국현대문화', 
            budgetLimit: 320000,
            allocatedBudget: 320000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        },
        { 
            id: 6, 
            name: '송미영', 
            birthDate: '1998-08-24', 
            instituteName: '뉴욕 세종학당', 
            specialization: '전통음악', 
            budgetLimit: 400000,
            allocatedBudget: 400000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        },
        { 
            id: 7, 
            name: '유진호', 
            birthDate: '1997-01-19', 
            instituteName: '런던 세종학당', 
            specialization: '한국미술', 
            budgetLimit: 380000,
            allocatedBudget: 380000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        },
        { 
            id: 8, 
            name: '강예린', 
            birthDate: '1999-11-07', 
            instituteName: '파리 세종학당', 
            specialization: '한국요리문화', 
            budgetLimit: 300000,
            allocatedBudget: 300000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null
        }
    ],

    // 분야별 예산 설정 (관리자가 설정)
    fieldBudgetSettings: {
        '한국어교육': {
            perLessonAmount: 15000,  // 회당 지원금
            maxBudget: 400000        // 최대 상한
        },
        '전통문화예술': {
            perLessonAmount: 25000,
            maxBudget: 600000
        },
        'K-Pop 문화': {
            perLessonAmount: 10000,
            maxBudget: 300000
        },
        '한국현대문화': {
            perLessonAmount: 18000,
            maxBudget: 450000
        },
        '전통음악': {
            perLessonAmount: 30000,
            maxBudget: 750000
        },
        '한국미술': {
            perLessonAmount: 22000,
            maxBudget: 550000
        },
        '한국요리문화': {
            perLessonAmount: 35000,
            maxBudget: 800000
        }
    },

    // 수업계획 데이터
    lessonPlans: {},

    // 모의 신청 데이터 - 실제 예산 현황에 맞게 조정
    applications: [
        {
            id: 1,
            studentId: 1,
            studentName: '김민수',
            items: [
                { 
                    id: 1, 
                    name: '베트남 전통 아오자이', 
                    purpose: '한국-베트남 문화 교류 수업에서 두 나라의 전통 의상을 비교 체험할 수 있도록 활용하겠습니다. 학생들이 한복과 아오자이를 동시에 체험하며 문화적 차이점과 공통점을 학습할 예정입니다.', 
                    price: 85000, 
                    link: 'https://example.com/aodai', 
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'online'
                },
                { 
                    id: 2, 
                    name: '한국 전통 차 세트 (다기)', 
                    purpose: '한국의 차 문화 소개 및 다도 체험 수업용입니다. 베트남 학생들에게 한국의 전통 차 문화를 체험시키고 베트남 차 문화와 비교하는 활동에 사용하겠습니다.', 
                    price: 120000, 
                    link: 'https://example.com/tea-set', 
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'online'
                },
                { 
                    id: 3, 
                    name: '한글 캘리그래피 도구 세트', 
                    purpose: '한글의 아름다움을 알리는 캘리그래피 수업용 도구입니다. 붓, 먹, 한지 등을 포함한 전체 세트로 학생들이 직접 한글 작품을 만들어볼 수 있습니다.', 
                    price: 95000, 
                    link: 'https://example.com/calligraphy', 
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'online'
                }
            ],
            submittedAt: '2024-06-10T09:30:00'
        }
    ],

    // 수업계획 수정 가능 여부 확인 (업데이트됨)
    canEditLessonPlan() {
        // 테스트 모드나 마감일 무시 모드가 활성화된 경우 항상 허용
        if (this.lessonPlanSettings.testMode || this.lessonPlanSettings.allowOverrideDeadline) {
            return true;
        }

        const deadline = new Date(`${this.lessonPlanSettings.editDeadline} ${this.lessonPlanSettings.editTime}`);
        const now = new Date();
        return now <= deadline;
    },

    // 학생 인증
    authenticateStudent(name, birthDate) {
        const student = this.students.find(s => 
            s.name === name && s.birthDate === birthDate
        );
        if (student) {
            this.currentUser = student;
            this.currentUserType = 'student';
            return true;
        }
        return false;
    },

    // 관리자 인증
    authenticateAdmin(code) {
        if (code === 'admin2024') {
            this.currentUser = { name: '관리자', role: 'admin' };
            this.currentUserType = 'admin';
            return true;
        }
        return false;
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
    },

    // 학생 예산 상태 조회 (새로운 예산 시스템)
    getStudentBudgetStatus(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return null;

        const lessonPlan = this.getStudentLessonPlan(studentId);
        const applications = this.getStudentApplications(studentId);
        
        let used = 0;
        applications.forEach(app => {
            app.items.forEach(item => {
                if (item.status === 'approved' || item.status === 'purchased') {
                    used += item.price;
                }
            });
        });

        // 수업계획이 승인되지 않은 경우 예산 0
        const allocated = (lessonPlan && lessonPlan.approvalStatus === 'approved') 
            ? student.allocatedBudget 
            : 0;

        return {
            allocated: allocated,
            used: used,
            remaining: Math.max(0, allocated - used),
            field: student.specialization,
            lessonPlanStatus: lessonPlan?.approvalStatus || 'pending',
            canApplyForEquipment: lessonPlan?.approvalStatus === 'approved'
        };
    },

    // 학생 신청 내역 조회
    getStudentApplications(studentId) {
        const studentApplication = this.applications.find(app => app.studentId === studentId);
        return studentApplication ? studentApplication.items : [];
    },

    // 교구 신청 추가
    addApplication(studentId, itemData) {
        let studentApplication = this.applications.find(app => app.studentId === studentId);
        
        if (!studentApplication) {
            const student = this.students.find(s => s.id === studentId);
            studentApplication = {
                id: this.applications.length + 1,
                studentId: studentId,
                studentName: student.name,
                items: [],
                submittedAt: new Date().toISOString()
            };
            this.applications.push(studentApplication);
        }

        const newItem = {
            id: this.getNextItemId(),
            ...itemData,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        studentApplication.items.push(newItem);
        return newItem;
    },

    // 다음 아이템 ID 생성
    getNextItemId() {
        let maxId = 0;
        this.applications.forEach(app => {
            app.items.forEach(item => {
                if (item.id > maxId) maxId = item.id;
            });
        });
        return maxId + 1;
    },

    // 신청 아이템 수정
    updateApplicationItem(studentId, itemId, updatedData) {
        const studentApplication = this.applications.find(app => app.studentId === studentId);
        if (!studentApplication) return false;

        const item = studentApplication.items.find(item => item.id === itemId);
        if (!item || item.status !== 'pending') return false;

        Object.assign(item, updatedData);
        return true;
    },

    // 신청 아이템 삭제
    deleteApplicationItem(studentId, itemId) {
        const studentApplication = this.applications.find(app => app.studentId === studentId);
        if (!studentApplication) return false;

        const itemIndex = studentApplication.items.findIndex(item => 
            item.id === itemId && item.status === 'pending'
        );
        
        if (itemIndex === -1) return false;

        studentApplication.items.splice(itemIndex, 1);
        return true;
    },

    // 배송지 정보 업데이트
    updateShippingAddress(studentId, addressData) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return false;

        student.shippingAddress = addressData;
        return true;
    },

    // 영수증 제출
    submitReceipt(studentId, itemId, receiptData) {
        const studentApplication = this.applications.find(app => app.studentId === studentId);
        if (!studentApplication) return false;

        const item = studentApplication.items.find(item => item.id === itemId);
        if (!item || item.status !== 'approved') return false;

        item.receiptImage = receiptData.image;
        item.purchaseDateTime = receiptData.purchaseDateTime;
        item.purchaseStore = receiptData.purchaseStore;
        item.receiptNote = receiptData.note;
        item.receiptSubmittedAt = new Date().toISOString();

        return true;
    },

    // 수업계획 저장/업데이트
    saveLessonPlan(studentId, planData) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return false;

        const lessonPlan = {
            studentId: studentId,
            studentName: student.name,
            ...planData,
            status: 'completed',
            approvalStatus: 'pending',
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.lessonPlans[studentId] = lessonPlan;
        return lessonPlan;
    },

    // 수업계획 임시저장
    saveLessonPlanDraft(studentId, planData) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return false;

        const lessonPlan = {
            studentId: studentId,
            studentName: student.name,
            ...planData,
            status: 'draft',
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.lessonPlans[studentId] = lessonPlan;
        return lessonPlan;
    },

    // 학생 수업계획 조회
    getStudentLessonPlan(studentId) {
        return this.lessonPlans[studentId] || null;
    },

    // 모든 수업계획 조회 (관리자용)
    getAllLessonPlans() {
        return Object.values(this.lessonPlans);
    },

    // 수업계획 승인/반려 (관리자용)
    updateLessonPlanApproval(studentId, approvalStatus, rejectionReason = null) {
        const lessonPlan = this.lessonPlans[studentId];
        if (!lessonPlan) return false;

        lessonPlan.approvalStatus = approvalStatus;
        if (rejectionReason) {
            lessonPlan.rejectionReason = rejectionReason;
        }
        lessonPlan.reviewedAt = new Date().toISOString();

        // 승인 시 예산 배정
        if (approvalStatus === 'approved') {
            this.allocateBudgetForStudent(studentId, lessonPlan);
        }

        return true;
    },

    // 학생 예산 배정 (수업계획 승인 시)
    allocateBudgetForStudent(studentId, lessonPlan) {
        const student = this.students.find(s => s.id === studentId);
        if (!student || !lessonPlan) return false;

        const fieldSettings = this.fieldBudgetSettings[student.specialization];
        if (!fieldSettings) return false;

        const totalLessons = lessonPlan.totalLessons || 0;
        const calculatedBudget = Math.min(
            totalLessons * fieldSettings.perLessonAmount,
            fieldSettings.maxBudget
        );

        student.allocatedBudget = calculatedBudget;
        return true;
    },

    // 상태 관련 유틸리티 함수들
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료'
        };
        return statusMap[status] || status;
    },

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    // 관리자용 통계 데이터
    getAdminStats() {
        const allItems = [];
        this.applications.forEach(app => {
            app.items.forEach(item => {
                allItems.push({...item, studentName: app.studentName});
            });
        });

        const stats = {
            totalStudents: this.students.length,
            applicantCount: this.applications.length,
            pendingCount: allItems.filter(item => item.status === 'pending').length,
            approvedCount: allItems.filter(item => item.status === 'approved').length,
            rejectedCount: allItems.filter(item => item.status === 'rejected').length,
            purchasedCount: allItems.filter(item => item.status === 'purchased').length,
            totalApprovedBudget: this.students.reduce((sum, s) => sum + s.allocatedBudget, 0),
            approvedItemsTotal: allItems.filter(item => item.status === 'approved' || item.status === 'purchased')
                                      .reduce((sum, item) => sum + item.price, 0),
            purchasedTotal: allItems.filter(item => item.status === 'purchased')
                                   .reduce((sum, item) => sum + item.price, 0)
        };

        stats.averagePerPerson = stats.applicantCount > 0 ? 
            Math.round(stats.approvedItemsTotal / stats.applicantCount) : 0;

        return stats;
    },

    // 전체 신청 목록 조회 (관리자용)
    getAllApplications() {
        return this.applications;
    },

    // 아이템 상태 업데이트 (관리자용)
    updateItemStatus(studentId, itemId, status, rejectionReason = null) {
        const studentApplication = this.applications.find(app => app.studentId === studentId);
        if (!studentApplication) return false;

        const item = studentApplication.items.find(item => item.id === itemId);
        if (!item) return false;

        item.status = status;
        if (rejectionReason) {
            item.rejectionReason = rejectionReason;
        }
        item.reviewedAt = new Date().toISOString();

        return true;
    }
};

// 전역 접근을 위해 window 객체에 추가
window.DataManager = DataManager;