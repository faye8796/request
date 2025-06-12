// 데이터 관리 모듈
const DataManager = {
    // 모의 학생 데이터
    students: [
        { 
            id: 1, 
            name: '김민수', 
            birthDate: '1998-03-15', 
            instituteName: '하노이 세종학당', 
            specialization: '한국어교육', 
            budgetLimit: 300000,
            allocatedBudget: 0, // 실제 배정된 예산
            shippingAddress: null
        },
        { 
            id: 2, 
            name: '이지영', 
            birthDate: '1999-07-22', 
            instituteName: '방콕 세종학당', 
            specialization: '전통문화예술', 
            budgetLimit: 250000,
            allocatedBudget: 0,
            shippingAddress: null
        },
        { 
            id: 3, 
            name: '박준호', 
            birthDate: '1997-11-08', 
            instituteName: '자카르타 세종학당', 
            specialization: 'K-Pop 문화', 
            budgetLimit: 350000,
            allocatedBudget: 0,
            shippingAddress: null
        },
        { 
            id: 4, 
            name: '최서연', 
            birthDate: '1998-12-03', 
            instituteName: '쿠알라룸푸르 세종학당', 
            specialization: '한국어교육', 
            budgetLimit: 280000,
            allocatedBudget: 0,
            shippingAddress: null
        },
        { 
            id: 5, 
            name: '정현우', 
            birthDate: '1999-05-17', 
            instituteName: '마닐라 세종학당', 
            specialization: '한국현대문화', 
            budgetLimit: 320000,
            allocatedBudget: 0,
            shippingAddress: null
        },
        { 
            id: 6, 
            name: '송미영', 
            birthDate: '1998-08-24', 
            instituteName: '뉴욕 세종학당', 
            specialization: '전통음악', 
            budgetLimit: 400000,
            allocatedBudget: 0,
            shippingAddress: null
        },
        { 
            id: 7, 
            name: '유진호', 
            birthDate: '1997-01-19', 
            instituteName: '런던 세종학당', 
            specialization: '한국미술', 
            budgetLimit: 380000,
            allocatedBudget: 0,
            shippingAddress: null
        },
        { 
            id: 8, 
            name: '강예린', 
            birthDate: '1999-11-07', 
            instituteName: '파리 세종학당', 
            specialization: '한국요리문화', 
            budgetLimit: 290000,
            allocatedBudget: 0,
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

    // 모의 신청 데이터 - 오프라인 구매 샘플 포함
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
                    status: 'pending',
                    type: 'single',
                    purchaseMethod: 'online' // 온라인 구매
                },
                { 
                    id: 2, 
                    name: '한국 전통 차 세트 (다기)', 
                    purpose: '한국의 차 문화 소개 및 다도 체험 수업용입니다. 베트남 학생들에게 한국의 전통 차 문화를 체험시키고 베트남 차 문화와 비교하는 활동에 사용하겠습니다.', 
                    price: 120000, 
                    link: 'https://example.com/tea-set', 
                    status: 'approved',
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
                },
                {
                    id: 10,
                    name: '베트남 현지 한국 서적',
                    purpose: '현지 서점에서만 구할 수 있는 한국어 학습 교재와 한국 문화 관련 도서입니다. 현지 학생들에게 더 접근하기 쉬운 한국어 교육 자료로 활용하겠습니다.',
                    price: 50000,
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'offline', // 오프라인 구매
                    receiptNumber: 'RCP-001-010', // 영수증 번호 추가
                    receiptImage: null,
                    receiptSubmittedAt: null
                }
            ],
            submittedAt: '2024-06-10T09:30:00'
        },
        {
            id: 2,
            studentId: 2,
            studentName: '이지영',
            items: [
                { 
                    id: 4, 
                    name: '한국 전통 악기 세트 (장구, 소고)', 
                    purpose: '태국 학생들을 대상으로 한 한국 전통음악 수업에서 사용할 예정입니다. 직접 악기를 연주해보며 한국 음악의 리듬감을 체험하고, 태국 전통 악기와의 차이점을 학습하겠습니다.', 
                    price: 180000, 
                    link: 'https://example.com/instruments', 
                    status: 'pending',
                    type: 'single',
                    purchaseMethod: 'online'
                },
                { 
                    id: 5, 
                    name: '한국 전통 놀이 도구 (윷놀이, 제기차기)', 
                    purpose: '한국 전통 놀이 체험 수업용입니다. 태국 현지 학생들과 함께 한국의 전통 놀이를 즐기며 자연스럽게 한국 문화를 체험할 수 있도록 하겠습니다.', 
                    price: 45000, 
                    link: 'https://example.com/traditional-games', 
                    status: 'rejected',
                    rejectionReason: '예산 대비 효과가 낮다고 판단됩니다. 더 교육적 가치가 높은 교구로 재신청해주세요.',
                    type: 'single',
                    purchaseMethod: 'online'
                },
                {
                    id: 11,
                    name: '태국 현지 한국 문화 체험 재료',
                    purpose: '태국 현지에서만 구할 수 있는 특별한 재료들로 한국 음식을 만들어보는 체험 활동용입니다.',
                    price: 35000,
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'offline',
                    receiptNumber: 'RCP-002-011', // 영수증 번호 추가
                    receiptImage: {
                        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD...', // Base64 이미지 데이터 (샘플)
                        purchaseDateTime: '2024-06-13T10:30:00',
                        purchaseStore: '태국 현지 마트',
                        note: '한국 음식 만들기 재료 구매',
                        fileName: 'receipt_thai_ingredients.jpg',
                        fileSize: 2048576
                    },
                    receiptSubmittedAt: '2024-06-13T14:30:00'
                }
            ],
            submittedAt: '2024-06-11T14:20:00'
        },
        {
            id: 3,
            studentId: 3,
            studentName: '박준호',
            items: [
                { 
                    id: 6, 
                    name: 'K-Pop 댄스 의상 및 소품', 
                    purpose: '인도네시아 현지에서 K-Pop 문화 확산을 위한 댄스 수업용 의상입니다. 현지 학생들이 한국 아이돌 의상을 입고 댄스를 배우며 한국 현대 문화에 대한 관심을 높이겠습니다.', 
                    price: 220000, 
                    link: 'https://example.com/kpop-costume', 
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'online'
                },
                { 
                    id: 7, 
                    name: 'K-Pop 안무 교육용 스피커 시스템', 
                    purpose: 'K-Pop 댄스 수업을 위한 고품질 스피커 시스템입니다. 선명한 음질로 안무 교육의 효과를 극대화하고, 현지 학생들의 학습 만족도를 높이겠습니다.', 
                    price: 130000, 
                    link: 'https://example.com/speaker-system', 
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'online'
                }
            ],
            submittedAt: '2024-06-09T16:45:00'
        },
        {
            id: 4,
            studentId: 6,
            studentName: '송미영',
            items: [
                { 
                    id: 8, 
                    name: '가야금 (25현)', 
                    purpose: '뉴욕 지역 한국 전통음악 보급을 위한 가야금 수업용입니다. 현지 음악 학습자들에게 한국 전통 현악기의 아름다운 선율을 직접 체험하게 하여 한국 음악에 대한 이해를 높이겠습니다.', 
                    price: 350000, 
                    link: 'https://example.com/gayageum', 
                    status: 'pending',
                    type: 'single',
                    purchaseMethod: 'online'
                },
                { 
                    id: 9, 
                    name: '한국 문화 체험 키트 (묶음)', 
                    purpose: '한국 문화 종합 체험을 위한 다양한 소품들의 묶음 구매입니다. 한복 소품, 전통 놀이, 한국 음식 만들기 재료 등이 포함되어 있습니다.', 
                    price: 75000, 
                    link: 'https://coupang.com/bundle-korean-culture', 
                    status: 'pending',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    bundleCredentials: {
                        userId: 'songmiyoung@email.com',
                        password: '***encrypted***'
                    }
                }
            ],
            submittedAt: '2024-06-12T11:15:00'
        }
    ],

    // 수업계획 데이터 - 승인 상태 추가
    lessonPlans: [
        {
            id: 1,
            studentId: 1,
            studentName: '김민수',
            startDate: '2025-07-01',
            endDate: '2025-12-20',
            totalLessons: 24,
            lessonsPerWeek: 3,
            overallGoals: '베트남 현지 학생들의 한국어 실력 향상과 한국 문화에 대한 이해도 증진',
            specialNotes: '베트남어 번역이 필요한 문화적 개념들을 미리 준비할 예정',
            lessons: [
                { lessonNumber: 1, topic: '한국어 인사법과 기본 표현', content: '안녕하세요, 감사합니다 등 기본 인사말 학습' },
                { lessonNumber: 2, topic: '한국의 가족 문화', content: '한국 가족 호칭과 가족 관계 설명' },
                { lessonNumber: 3, topic: '한국 음식 소개', content: '김치, 불고기 등 대표 음식 소개 및 시식' }
                // 더 많은 수업 데이터...
            ],
            status: 'approved', // completed에서 approved로 변경
            approvalStatus: 'approved', // 수업계획 승인 상태
            submittedAt: '2025-06-08T10:00:00',
            lastModified: '2025-06-08T10:00:00',
            approvedAt: '2025-06-08T15:00:00',
            approvedBy: '관리자'
        }
    ],

    // 수업계획 설정 (관리자가 관리) - 기능 테스트를 위해 업데이트
    lessonPlanSettings: {
        editDeadline: '2026-12-31', // 기능 테스트를 위해 충분히 먼 미래로 설정
        editTime: '23:59',
        noticeMessage: '수업계획은 2026년 12월 31일 23:59까지 수정 가능합니다. 마감일 이후에는 수정이 불가능하니 미리 완료해주세요.',
        isEditingAllowed: true, // 현재 수정 가능 여부
        testMode: true, // 테스트 모드 - 항상 편집 허용
        allowOverrideDeadline: true // 관리자가 마감일을 무시하고 편집을 허용할 수 있는 옵션
    },

    // 현재 로그인한 사용자 정보
    currentUser: null,
    currentUserType: null,

    // === 예산 관련 메소드 ===

    // 학생의 수업계획 기반 예산 계산
    calculateBudgetFromLessonPlan(studentId) {
        const student = this.students.find(s => s.id === studentId);
        const lessonPlan = this.lessonPlans.find(p => p.studentId === studentId);
        
        if (!student || !lessonPlan || lessonPlan.approvalStatus !== 'approved') {
            return {
                calculated: 0,
                allocated: 0,
                field: student?.specialization || '',
                perLessonAmount: 0,
                totalLessons: 0,
                maxBudget: 0
            };
        }

        const fieldSettings = this.fieldBudgetSettings[student.specialization];
        if (!fieldSettings) {
            return {
                calculated: 0,
                allocated: 0,
                field: student.specialization,
                perLessonAmount: 0,
                totalLessons: lessonPlan.totalLessons,
                maxBudget: 0
            };
        }

        const calculatedBudget = lessonPlan.totalLessons * fieldSettings.perLessonAmount;
        const finalBudget = Math.min(calculatedBudget, fieldSettings.maxBudget);

        return {
            calculated: calculatedBudget,
            allocated: finalBudget,
            field: student.specialization,
            perLessonAmount: fieldSettings.perLessonAmount,
            totalLessons: lessonPlan.totalLessons,
            maxBudget: fieldSettings.maxBudget,
            isCapReached: calculatedBudget > fieldSettings.maxBudget
        };
    },

    // 학생 예산 배정 (수업계획 승인시 실행)
    allocateBudgetToStudent(studentId) {
        const budgetInfo = this.calculateBudgetFromLessonPlan(studentId);
        const student = this.students.find(s => s.id === studentId);
        
        if (student && budgetInfo.allocated > 0) {
            student.allocatedBudget = budgetInfo.allocated;
            student.budgetLimit = budgetInfo.allocated; // 기존 budgetLimit도 업데이트
            return budgetInfo;
        }
        return null;
    },

    // 학생의 사용 가능한 예산 조회
    getStudentBudgetStatus(studentId) {
        const student = this.students.find(s => s.id === studentId);
        const lessonPlan = this.lessonPlans.find(p => p.studentId === studentId);
        
        if (!student) return null;

        // 사용된 예산 계산
        const usedBudget = this.getStudentUsedBudget(studentId);
        const remainingBudget = student.allocatedBudget - usedBudget;

        return {
            allocated: student.allocatedBudget,
            used: usedBudget,
            remaining: remainingBudget,
            field: student.specialization,
            lessonPlanStatus: lessonPlan?.approvalStatus || 'pending',
            canApplyForEquipment: lessonPlan?.approvalStatus === 'approved' && student.allocatedBudget > 0
        };
    },

    // 학생이 사용한 예산 계산
    getStudentUsedBudget(studentId) {
        const applications = this.getStudentApplications(studentId);
        return applications
            .filter(item => item.status === 'approved' || item.status === 'purchased')
            .reduce((total, item) => total + item.price, 0);
    },

    // 분야별 예산 설정 업데이트 (관리자용)
    updateFieldBudgetSettings(field, settings) {
        if (this.fieldBudgetSettings[field]) {
            this.fieldBudgetSettings[field] = {
                ...this.fieldBudgetSettings[field],
                ...settings
            };
            return true;
        }
        return false;
    },

    // 모든 분야 예산 설정 조회
    getAllFieldBudgetSettings() {
        return this.fieldBudgetSettings;
    },

    // === 수업계획 승인/반려 메소드 ===

    // 수업계획 승인
    approveLessonPlan(studentId, approver = '관리자') {
        const lessonPlan = this.lessonPlans.find(p => p.studentId === studentId);
        if (lessonPlan && lessonPlan.approvalStatus !== 'approved') {
            lessonPlan.approvalStatus = 'approved';
            lessonPlan.approvedAt = new Date().toISOString();
            lessonPlan.approvedBy = approver;
            
            // 예산 배정 실행
            const budgetInfo = this.allocateBudgetToStudent(studentId);
            
            return {
                success: true,
                budgetInfo: budgetInfo
            };
        }
        return { success: false, message: '수업계획을 찾을 수 없거나 이미 승인된 상태입니다.' };
    },

    // 수업계획 반려
    rejectLessonPlan(studentId, reason, rejectedBy = '관리자') {
        const lessonPlan = this.lessonPlans.find(p => p.studentId === studentId);
        if (lessonPlan) {
            lessonPlan.approvalStatus = 'rejected';
            lessonPlan.rejectionReason = reason;
            lessonPlan.rejectedAt = new Date().toISOString();
            lessonPlan.rejectedBy = rejectedBy;
            
            // 예산 제거
            const student = this.students.find(s => s.id === studentId);
            if (student) {
                student.allocatedBudget = 0;
                student.budgetLimit = 0;
            }
            
            return { success: true };
        }
        return { success: false, message: '수업계획을 찾을 수 없습니다.' };
    },

    // 수업계획 승인 대기 목록 조회
    getPendingLessonPlans() {
        return this.lessonPlans.filter(p => 
            p.status === 'completed' && 
            (!p.approvalStatus || p.approvalStatus === 'pending')
        );
    },

    // === 영수증 관련 유틸리티 메소드 ===

    // 영수증 번호 생성
    generateReceiptNumber(studentId, itemId) {
        const paddedStudentId = String(studentId).padStart(3, '0');
        const paddedItemId = String(itemId).padStart(3, '0');
        return `RCP-${paddedStudentId}-${paddedItemId}`;
    },

    // 영수증 번호로 파일명 생성 (확장자 포함)
    generateReceiptFileName(receiptNumber, fileExtension = 'jpg') {
        return `${receiptNumber}.${fileExtension}`;
    },

    // 영수증 번호에서 학생ID와 아이템ID 추출
    parseReceiptNumber(receiptNumber) {
        const match = receiptNumber.match(/^RCP-(\\d{3})-(\\d{3})$/);
        if (match) {
            return {
                studentId: parseInt(match[1]),
                itemId: parseInt(match[2])
            };
        }
        return null;
    },

    // 영수증 번호 유효성 검증
    validateReceiptNumber(receiptNumber) {
        return /^RCP-\\d{3}-\\d{3}$/.test(receiptNumber);
    },

    // === 기존 메소드들 ===

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
        if (code === 'admin123') {
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

    // 학생의 신청 내역 조회
    getStudentApplications(studentId) {
        const application = this.applications.find(app => app.studentId === studentId);
        return application ? application.items : [];
    },

    // 모든 신청 내역 조회 (관리자용)
    getAllApplications() {
        return this.applications;
    },

    // 새 교구 신청 추가 - 예산 확인 추가
    addApplication(studentId, itemData) {
        // 예산 확인
        const budgetStatus = this.getStudentBudgetStatus(studentId);
        if (!budgetStatus.canApplyForEquipment) {
            throw new Error('수업계획이 승인되지 않아 교구 신청을 할 수 없습니다.');
        }
        if (budgetStatus.remaining < itemData.price) {
            throw new Error(`예산이 부족합니다. 남은 예산: ${budgetStatus.remaining.toLocaleString()}원`);
        }

        const newItemId = Date.now();
        const newItem = {
            id: newItemId,
            ...itemData,
            status: 'pending',
            type: itemData.type || 'single',
            purchaseMethod: itemData.purchaseMethod || 'online'
        };

        // 오프라인 구매인 경우 영수증 관련 필드 추가
        if (newItem.purchaseMethod === 'offline') {
            newItem.receiptNumber = this.generateReceiptNumber(studentId, newItemId);
            newItem.receiptImage = null;
            newItem.receiptSubmittedAt = null;
        }

        // 기존 신청이 있는지 확인
        const existingApp = this.applications.find(app => app.studentId === studentId);
        
        if (existingApp) {
            // 기존 신청에 아이템 추가
            existingApp.items.push(newItem);
        } else {
            // 새 신청 생성
            const student = this.students.find(s => s.id === studentId);
            const newApplication = {
                id: newItemId,
                studentId: studentId,
                studentName: student.name,
                items: [newItem],
                submittedAt: new Date().toISOString()
            };
            this.applications.push(newApplication);
        }

        return newItem;
    },

    // 신청 상태 업데이트
    updateItemStatus(studentId, itemId, newStatus, rejectionReason = '') {
        const application = this.applications.find(app => app.studentId === studentId);
        if (application) {
            const item = application.items.find(item => item.id === itemId);
            if (item) {
                item.status = newStatus;
                if (rejectionReason) {
                    item.rejectionReason = rejectionReason;
                }
                return true;
            }
        }
        return false;
    },

    // 영수증 제출 (오프라인 구매용) - 개선된 버전
    submitReceipt(studentId, itemId, receiptData) {
        const application = this.applications.find(app => app.studentId === studentId);
        if (application) {
            const item = application.items.find(item => item.id === itemId);
            if (item && item.purchaseMethod === 'offline' && item.status === 'approved') {
                // 영수증 데이터 구조화
                item.receiptImage = {
                    image: receiptData.image, // Base64 이미지 데이터
                    purchaseDateTime: receiptData.purchaseDateTime,
                    purchaseStore: receiptData.purchaseStore,
                    note: receiptData.note,
                    fileName: receiptData.fileName,
                    fileSize: receiptData.fileSize
                };
                item.receiptSubmittedAt = new Date().toISOString();
                item.status = 'purchased'; // 영수증 제출 시 바로 구매완료로 변경
                
                console.log(`영수증 제출 완료: 학생 ${studentId}, 아이템 ${itemId}, 영수증 번호: ${item.receiptNumber}`);
                return true;
            }
        }
        return false;
    },

    // 영수증 정보 조회 (관리자용)
    getReceiptInfo(studentId, itemId) {
        const application = this.applications.find(app => app.studentId === studentId);
        if (application) {
            const item = application.items.find(item => item.id === itemId);
            if (item && item.receiptImage) {
                return {
                    item: item,
                    receipt: item.receiptImage,
                    submittedAt: item.receiptSubmittedAt,
                    studentName: application.studentName,
                    receiptNumber: item.receiptNumber
                };
            }
        }
        return null;
    },

    // 신청 아이템 수정
    updateApplicationItem(studentId, itemId, itemData) {
        const application = this.applications.find(app => app.studentId === studentId);
        if (application) {
            const item = application.items.find(item => item.id === itemId);
            if (item && item.status === 'pending') {
                // 예산 확인
                const budgetStatus = this.getStudentBudgetStatus(studentId);
                const otherItemsTotal = application.items
                    .filter(i => i.id !== itemId && (i.status === 'approved' || i.status === 'purchased'))
                    .reduce((total, i) => total + i.price, 0);
                const availableBudget = budgetStatus.allocated - otherItemsTotal;
                
                if (itemData.price > availableBudget) {
                    throw new Error(`예산이 부족합니다. 사용 가능한 예산: ${availableBudget.toLocaleString()}원`);
                }

                // 기존 특수 데이터 보존
                const preservedData = {};
                if (item.bundleCredentials) {
                    preservedData.bundleCredentials = item.bundleCredentials;
                }
                if (item.receiptImage) {
                    preservedData.receiptImage = item.receiptImage;
                    preservedData.receiptSubmittedAt = item.receiptSubmittedAt;
                }
                if (item.receiptNumber) {
                    preservedData.receiptNumber = item.receiptNumber;
                }
                
                // 구매 방식이 변경되면 영수증 번호 재생성
                if (itemData.purchaseMethod !== item.purchaseMethod) {
                    if (itemData.purchaseMethod === 'offline') {
                        preservedData.receiptNumber = this.generateReceiptNumber(studentId, itemId);
                        preservedData.receiptImage = null;
                        preservedData.receiptSubmittedAt = null;
                    } else {
                        // 온라인으로 변경 시 영수증 관련 데이터 제거
                        delete preservedData.receiptNumber;
                        delete preservedData.receiptImage;
                        delete preservedData.receiptSubmittedAt;
                    }
                }
                
                // 데이터 업데이트
                Object.assign(item, itemData, preservedData);
                return true;
            }
        }
        return false;
    },

    // 신청 아이템 삭제
    deleteApplicationItem(studentId, itemId) {
        const application = this.applications.find(app => app.studentId === studentId);
        if (application) {
            const itemIndex = application.items.findIndex(item => item.id === itemId);
            if (itemIndex !== -1 && application.items[itemIndex].status === 'pending') {
                application.items.splice(itemIndex, 1);
                // 신청 내역이 비어있으면 신청 자체를 삭제
                if (application.items.length === 0) {
                    const appIndex = this.applications.findIndex(app => app.id === application.id);
                    this.applications.splice(appIndex, 1);
                }
                return true;
            }
        }
        return false;
    },

    // 배송지 정보 업데이트
    updateShippingAddress(studentId, shippingData) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            student.shippingAddress = shippingData;
            return true;
        }
        return false;
    },

    // 통계 데이터 생성
    getStats() {
        let total = 0;
        let approved = 0;
        let rejected = 0;
        let purchased = 0;

        this.applications.forEach(app => {
            app.items.forEach(item => {
                total++;
                switch(item.status) {
                    case 'approved': approved++; break;
                    case 'rejected': rejected++; break;
                    case 'purchased': purchased++; break;
                }
            });
        });

        return { total, approved, rejected, purchased };
    },

    // 검색 필터링
    searchApplications(searchTerm) {
        if (!searchTerm.trim()) {
            return this.applications;
        }
        
        return this.applications.filter(app => 
            app.studentName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    },

    // Excel 내보내기 데이터 준비 - 예산 정보 추가
    prepareExportData() {
        const exportData = [];
        
        this.applications.forEach(app => {
            const student = this.students.find(s => s.id === app.studentId);
            const budgetStatus = this.getStudentBudgetStatus(app.studentId);
            
            app.items.forEach(item => {
                const purchaseMethodText = item.purchaseMethod === 'offline' ? '오프라인 구매' : '온라인 구매';
                const typeText = item.type === 'bundle' ? '묶음신청' : '단일신청';
                
                // 영수증 정보
                let receiptInfo = '';
                if (item.purchaseMethod === 'offline' && item.receiptImage) {
                    const receipt = item.receiptImage;
                    receiptInfo = `구매일시: ${receipt.purchaseDateTime || ''}, 구매처: ${receipt.purchaseStore || ''}, 제출일: ${item.receiptSubmittedAt ? new Date(item.receiptSubmittedAt).toLocaleString('ko-KR') : ''}`;
                }
                
                exportData.push({
                    '학생명': app.studentName,
                    '파견학당': student ? student.instituteName : '',
                    '전공분야': student ? student.specialization : '',
                    '배정예산': budgetStatus ? budgetStatus.allocated : 0,
                    '사용예산': budgetStatus ? budgetStatus.used : 0,
                    '잔여예산': budgetStatus ? budgetStatus.remaining : 0,
                    '구매방식': purchaseMethodText,
                    '신청유형': typeText,
                    '교구명': item.name,
                    '사용목적': item.purpose,
                    '가격': item.price,
                    '구매링크': item.link || '',
                    '상태': this.getStatusText(item.status),
                    '반려사유': item.rejectionReason || '',
                    '영수증번호': item.receiptNumber || '',
                    '영수증정보': receiptInfo,
                    '신청일시': new Date(app.submittedAt).toLocaleString('ko-KR')
                });
            });
        });
        
        return exportData;
    },

    // 상태 텍스트 변환
    getStatusText(status) {
        switch(status) {
            case 'approved': return '승인됨';
            case 'rejected': return '반려됨';
            case 'purchased': return '구매완료';
            default: return '검토중';
        }
    },

    // 상태별 CSS 클래스
    getStatusClass(status) {
        switch(status) {
            case 'approved': return 'approved';
            case 'rejected': return 'rejected';
            case 'purchased': return 'purchased';
            default: return 'pending';
        }
    },

    // 구매 방식 텍스트 변환
    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인 구매' : '온라인 구매';
    },

    // 구매 방식별 CSS 클래스
    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline-purchase' : 'online-purchase';
    },

    // 오프라인 구매 관련 통계
    getOfflinePurchaseStats() {
        let totalOffline = 0;
        let approvedOffline = 0;
        let withReceipt = 0;
        let pendingReceipt = 0;

        this.applications.forEach(app => {
            app.items.forEach(item => {
                if (item.purchaseMethod === 'offline') {
                    totalOffline++;
                    if (item.status === 'approved') {
                        approvedOffline++;
                        if (item.receiptImage) {
                            withReceipt++;
                        } else {
                            pendingReceipt++;
                        }
                    }
                }
            });
        });

        return {
            totalOffline,
            approvedOffline,
            withReceipt,
            pendingReceipt
        };
    },

    // === 수업계획 관련 메소드들 ===

    // 학생의 수업계획 조회
    getStudentLessonPlan(studentId) {
        return this.lessonPlans.find(plan => plan.studentId === studentId);
    },

    // 수업계획 저장/업데이트
    saveLessonPlan(studentId, planData) {
        const existingPlan = this.lessonPlans.find(plan => plan.studentId === studentId);
        const student = this.students.find(s => s.id === studentId);
        
        if (existingPlan) {
            // 기존 계획 업데이트
            Object.assign(existingPlan, planData);
            existingPlan.lastModified = new Date().toISOString();
            // 수업계획이 수정되면 승인 상태 초기화
            if (existingPlan.approvalStatus === 'approved') {
                existingPlan.approvalStatus = 'pending';
                // 예산도 초기화
                const studentData = this.students.find(s => s.id === studentId);
                if (studentData) {
                    studentData.allocatedBudget = 0;
                    studentData.budgetLimit = 0;
                }
            }
            return existingPlan;
        } else {
            // 새 계획 생성
            const newPlan = {
                id: Date.now(),
                studentId: studentId,
                studentName: student.name,
                ...planData,
                status: planData.status || 'draft',
                approvalStatus: 'pending',
                submittedAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            this.lessonPlans.push(newPlan);
            return newPlan;
        }
    },

    // 수업계획 수정 가능 여부 확인 (업데이트됨)
    canEditLessonPlan() {
        // 테스트 모드가 활성화된 경우 항상 편집 허용
        if (this.lessonPlanSettings.testMode) {
            return true;
        }
        
        // 관리자가 마감일 무시 옵션을 설정한 경우
        if (this.lessonPlanSettings.allowOverrideDeadline) {
            return true;
        }
        
        // 수동으로 편집이 비활성화된 경우
        if (!this.lessonPlanSettings.isEditingAllowed) {
            return false;
        }
        
        // 마감일 확인
        const now = new Date();
        const deadline = new Date(`${this.lessonPlanSettings.editDeadline} ${this.lessonPlanSettings.editTime}`);
        
        return now <= deadline;
    },

    // 수업계획 설정 업데이트 (관리자용) - 업데이트됨
    updateLessonPlanSettings(settings) {
        Object.assign(this.lessonPlanSettings, settings);
        
        // 테스트 모드가 아닌 경우에만 마감일 체크
        if (!this.lessonPlanSettings.testMode && !this.lessonPlanSettings.allowOverrideDeadline) {
            const now = new Date();
            const deadline = new Date(`${this.lessonPlanSettings.editDeadline} ${this.lessonPlanSettings.editTime}`);
            this.lessonPlanSettings.isEditingAllowed = now <= deadline;
        }
        
        return this.lessonPlanSettings;
    },

    // 테스트 모드 토글 (개발/테스트용)
    toggleTestMode() {
        this.lessonPlanSettings.testMode = !this.lessonPlanSettings.testMode;
        console.log(`테스트 모드: ${this.lessonPlanSettings.testMode ? '활성화' : '비활성화'}`);
        return this.lessonPlanSettings.testMode;
    },

    // 수업계획 완료 상태로 변경
    completeLessonPlan(studentId) {
        const plan = this.lessonPlans.find(plan => plan.studentId === studentId);
        if (plan) {
            plan.status = 'completed';
            plan.lastModified = new Date().toISOString();
            return true;
        }
        return false;
    },

    // 수업계획 임시저장
    saveLessonPlanDraft(studentId, planData) {
        planData.status = 'draft';
        return this.saveLessonPlan(studentId, planData);
    },

    // 모든 수업계획 조회 (관리자용)
    getAllLessonPlans() {
        return this.lessonPlans;
    }
};

// Supabase 연동을 위한 향후 확장 구조
const SupabaseManager = {
    initialized: false,
    client: null,

    // Supabase 초기화 (향후 구현)
    async init() {
        // TODO: Supabase 클라이언트 초기화
        console.log('Supabase integration will be implemented here');
    },

    // 학생 데이터 조회
    async getStudents() {
        // TODO: Supabase에서 학생 데이터 조회
        return DataManager.students;
    },

    // 신청 데이터 조회
    async getApplications() {
        // TODO: Supabase에서 신청 데이터 조회
        return DataManager.applications;
    },

    // 신청 데이터 저장
    async saveApplication(applicationData) {
        // TODO: Supabase에 신청 데이터 저장
        console.log('Saving to Supabase:', applicationData);
    },

    // 상태 업데이트
    async updateStatus(itemId, status, reason = '') {
        // TODO: Supabase에서 상태 업데이트
        console.log('Updating status in Supabase:', { itemId, status, reason });
    },

    // 영수증 데이터 저장 (Supabase Storage 연동 예정)
    async saveReceipt(studentId, itemId, receiptData) {
        // TODO: Supabase Storage에 영수증 이미지 저장
        const receiptNumber = DataManager.generateReceiptNumber(studentId, itemId);
        const fileName = DataManager.generateReceiptFileName(receiptNumber, 'jpg');
        
        console.log('Saving receipt to Supabase Storage:', { 
            studentId, 
            itemId, 
            receiptNumber,
            fileName,
            receiptData 
        });
        
        // 향후 구현:
        // 1. Supabase Storage에 이미지 업로드 (fileName으로)
        // 2. 업로드된 파일의 URL 반환
        // 3. 데이터베이스에 영수증 정보 저장 (URL 포함)
    }
};