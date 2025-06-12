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
            shippingAddress: null
        },
        { 
            id: 2, 
            name: '이지영', 
            birthDate: '1999-07-22', 
            instituteName: '방콕 세종학당', 
            specialization: '전통문화예술', 
            budgetLimit: 250000,
            shippingAddress: null
        },
        { 
            id: 3, 
            name: '박준호', 
            birthDate: '1997-11-08', 
            instituteName: '자카르타 세종학당', 
            specialization: 'K-Pop 문화', 
            budgetLimit: 350000,
            shippingAddress: null
        },
        { 
            id: 4, 
            name: '최서연', 
            birthDate: '1998-12-03', 
            instituteName: '쿠알라룸푸르 세종학당', 
            specialization: '한국어교육', 
            budgetLimit: 280000,
            shippingAddress: null
        },
        { 
            id: 5, 
            name: '정현우', 
            birthDate: '1999-05-17', 
            instituteName: '마닐라 세종학당', 
            specialization: '한국현대문화', 
            budgetLimit: 320000,
            shippingAddress: null
        },
        { 
            id: 6, 
            name: '송미영', 
            birthDate: '1998-08-24', 
            instituteName: '뉴욕 세종학당', 
            specialization: '전통음악', 
            budgetLimit: 400000,
            shippingAddress: null
        },
        { 
            id: 7, 
            name: '유진호', 
            birthDate: '1997-01-19', 
            instituteName: '런던 세종학당', 
            specialization: '한국미술', 
            budgetLimit: 380000,
            shippingAddress: null
        },
        { 
            id: 8, 
            name: '강예린', 
            birthDate: '1999-11-07', 
            instituteName: '파리 세종학당', 
            specialization: '한국요리문화', 
            budgetLimit: 290000,
            shippingAddress: null
        }
    ],

    // 모의 신청 데이터
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
                    type: 'single' 
                },
                { 
                    id: 2, 
                    name: '한국 전통 차 세트 (다기)', 
                    purpose: '한국의 차 문화 소개 및 다도 체험 수업용입니다. 베트남 학생들에게 한국의 전통 차 문화를 체험시키고 베트남 차 문화와 비교하는 활동에 사용하겠습니다.', 
                    price: 120000, 
                    link: 'https://example.com/tea-set', 
                    status: 'approved',
                    type: 'single'
                },
                { 
                    id: 3, 
                    name: '한글 캘리그래피 도구 세트', 
                    purpose: '한글의 아름다움을 알리는 캘리그래피 수업용 도구입니다. 붓, 먹, 한지 등을 포함한 전체 세트로 학생들이 직접 한글 작품을 만들어볼 수 있습니다.', 
                    price: 95000, 
                    link: 'https://example.com/calligraphy', 
                    status: 'purchased',
                    type: 'single'
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
                    type: 'single'
                },
                { 
                    id: 5, 
                    name: '한국 전통 놀이 도구 (윷놀이, 제기차기)', 
                    purpose: '한국 전통 놀이 체험 수업용입니다. 태국 현지 학생들과 함께 한국의 전통 놀이를 즐기며 자연스럽게 한국 문화를 체험할 수 있도록 하겠습니다.', 
                    price: 45000, 
                    link: 'https://example.com/traditional-games', 
                    status: 'rejected',
                    rejectionReason: '예산 대비 효과가 낮다고 판단됩니다. 더 교육적 가치가 높은 교구로 재신청해주세요.',
                    type: 'single'
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
                    type: 'single'
                },
                { 
                    id: 7, 
                    name: 'K-Pop 안무 교육용 스피커 시스템', 
                    purpose: 'K-Pop 댄스 수업을 위한 고품질 스피커 시스템입니다. 선명한 음질로 안무 교육의 효과를 극대화하고, 현지 학생들의 학습 만족도를 높이겠습니다.', 
                    price: 130000, 
                    link: 'https://example.com/speaker-system', 
                    status: 'purchased',
                    type: 'single'
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
                    type: 'single'
                },
                { 
                    id: 9, 
                    name: '한국 문화 체험 키트 (묶음)', 
                    purpose: '한국 문화 종합 체험을 위한 다양한 소품들의 묶음 구매입니다. 한복 소품, 전통 놀이, 한국 음식 만들기 재료 등이 포함되어 있습니다.', 
                    price: 75000, 
                    link: 'https://coupang.com/bundle-korean-culture', 
                    status: 'pending',
                    type: 'bundle',
                    bundleCredentials: {
                        userId: 'songmiyoung@email.com',
                        password: '***encrypted***'
                    }
                }
            ],
            submittedAt: '2024-06-12T11:15:00'
        }
    ],

    // 수업계획 데이터 (테스트용 - 김민수만 완료된 상태로 설정)
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
                { week: 1, lesson: 1, date: '2025-07-01', topic: '한국어 인사법과 기본 표현', content: '안녕하세요, 감사합니다 등 기본 인사말 학습' },
                { week: 1, lesson: 2, date: '2025-07-03', topic: '한국의 가족 문화', content: '한국 가족 호칭과 가족 관계 설명' },
                { week: 1, lesson: 3, date: '2025-07-05', topic: '한국 음식 소개', content: '김치, 불고기 등 대표 음식 소개 및 시식' }
                // 더 많은 수업 데이터...
            ],
            status: 'completed',
            submittedAt: '2025-06-08T10:00:00',
            lastModified: '2025-06-08T10:00:00'
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

    // 새 교구 신청 추가
    addApplication(studentId, itemData) {
        const newItemId = Date.now();
        const newItem = {
            id: newItemId,
            ...itemData,
            status: 'pending',
            type: itemData.type || 'single'
        };

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

    // 신청 아이템 수정
    updateApplicationItem(studentId, itemId, itemData) {
        const application = this.applications.find(app => app.studentId === studentId);
        if (application) {
            const item = application.items.find(item => item.id === itemId);
            if (item && item.status === 'pending') {
                Object.assign(item, itemData);
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

    // Excel 내보내기 데이터 준비
    prepareExportData() {
        const exportData = [];
        
        this.applications.forEach(app => {
            const student = this.students.find(s => s.id === app.studentId);
            
            app.items.forEach(item => {
                exportData.push({
                    '학생명': app.studentName,
                    '파견학당': student ? student.instituteName : '',
                    '전공분야': student ? student.specialization : '',
                    '예산한도': student ? student.budgetLimit : '',
                    '신청유형': item.type === 'bundle' ? '묶음신청' : '단일신청',
                    '교구명': item.name,
                    '사용목적': item.purpose,
                    '가격': item.price,
                    '구매링크': item.link || '',
                    '상태': this.getStatusText(item.status),
                    '반려사유': item.rejectionReason || '',
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
            return existingPlan;
        } else {
            // 새 계획 생성
            const newPlan = {
                id: Date.now(),
                studentId: studentId,
                studentName: student.name,
                ...planData,
                status: planData.status || 'draft',
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
    },

    // 수업 주차 계산 (수정됨 - 오류 수정)
    calculateWeeks(startDate, endDate, totalLessons, lessonsPerWeek) {
        try {
            // 입력값 유효성 검사
            if (!startDate || !endDate || !totalLessons || !lessonsPerWeek) {
                throw new Error('필수 입력값이 누락되었습니다.');
            }

            // 숫자 유효성 검사
            const numLessons = parseInt(totalLessons);
            const numLessonsPerWeek = parseInt(lessonsPerWeek);
            
            if (isNaN(numLessons) || isNaN(numLessonsPerWeek) || numLessons <= 0 || numLessonsPerWeek <= 0) {
                throw new Error('총 수업 횟수와 주당 수업 횟수는 양수여야 합니다.');
            }

            // 날짜 유효성 검사
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('유효하지 않은 날짜입니다.');
            }
            
            if (start >= end) {
                throw new Error('시작일은 종료일보다 이전이어야 합니다.');
            }

            const lessons = [];
            let currentDate = new Date(start);
            
            // 요일 패턴 정의 (월=1, 수=3, 금=5)
            const weekDays = [1, 3, 5]; // 월, 수, 금
            
            for (let lessonNumber = 1; lessonNumber <= numLessons; lessonNumber++) {
                const week = Math.ceil(lessonNumber / numLessonsPerWeek);
                const lessonInWeek = ((lessonNumber - 1) % numLessonsPerWeek) + 1;
                
                // 주당 수업 횟수에 따라 날짜 배치
                let dayOffset = 0;
                if (numLessonsPerWeek <= 3) {
                    // 주 3회 이하인 경우 월, 수, 금 패턴 사용
                    const dayIndex = (lessonInWeek - 1) % weekDays.length;
                    const targetDay = weekDays[dayIndex];
                    const currentWeekStart = new Date(start);
                    currentWeekStart.setDate(start.getDate() + ((week - 1) * 7));
                    
                    // 해당 주의 월요일로 이동
                    const dayOfWeek = currentWeekStart.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset);
                    
                    // 목표 요일로 이동
                    currentDate = new Date(currentWeekStart);
                    currentDate.setDate(currentDate.getDate() + (targetDay - 1));
                } else {
                    // 주 4회 이상인 경우 균등 분배
                    const daysInWeek = 7;
                    const interval = Math.floor(daysInWeek / numLessonsPerWeek);
                    const weekStart = new Date(start);
                    weekStart.setDate(start.getDate() + ((week - 1) * 7));
                    
                    currentDate = new Date(weekStart);
                    currentDate.setDate(currentDate.getDate() + ((lessonInWeek - 1) * interval));
                }
                
                // 종료일 초과 체크
                if (currentDate > end) {
                    console.warn(`수업 ${lessonNumber}의 날짜(${currentDate.toISOString().split('T')[0]})가 종료일(${endDate})을 초과합니다.`);
                    // 종료일을 기준으로 역산하여 조정
                    const remainingLessons = numLessons - lessonNumber + 1;
                    const daysToDistribute = Math.floor((end - currentDate) / (1000 * 60 * 60 * 24));
                    currentDate = new Date(end);
                    currentDate.setDate(currentDate.getDate() - remainingLessons + lessonNumber);
                }
                
                lessons.push({
                    week: week,
                    lesson: lessonInWeek,
                    lessonNumber: lessonNumber,
                    date: currentDate.toISOString().split('T')[0],
                    topic: '',
                    content: ''
                });
            }
            
            return lessons;
            
        } catch (error) {
            console.error('수업 주차 계산 오류:', error);
            // 기본값 반환
            const fallbackLessons = [];
            const start = new Date(startDate || new Date());
            
            for (let i = 1; i <= (totalLessons || 1); i++) {
                const lessonDate = new Date(start);
                lessonDate.setDate(start.getDate() + ((i - 1) * 2)); // 이틀 간격
                
                fallbackLessons.push({
                    week: Math.ceil(i / (lessonsPerWeek || 1)),
                    lesson: ((i - 1) % (lessonsPerWeek || 1)) + 1,
                    lessonNumber: i,
                    date: lessonDate.toISOString().split('T')[0],
                    topic: '',
                    content: ''
                });
            }
            
            return fallbackLessons;
        }
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
    }
};