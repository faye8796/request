// 데이터 관리 모듈
const DataManager = {
    // 모의 학생 데이터
    students: [
        { id: 1, name: '김민수', birthDate: '1998-03-15', country: '베트남', program: '한국어교육' },
        { id: 2, name: '이지영', birthDate: '1999-07-22', country: '태국', program: '한국문화체험' },
        { id: 3, name: '박준호', birthDate: '1997-11-08', country: '인도네시아', program: 'K-Culture' },
        { id: 4, name: '최서연', birthDate: '1998-12-03', country: '말레이시아', program: '한국어교육' },
        { id: 5, name: '정현우', birthDate: '1999-05-17', country: '필리핀', program: '한국문화체험' }
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
                    name: '한복 체험복', 
                    purpose: '전통문화 수업을 위한 한복 체험 활동에 사용할 예정입니다. 학생들이 직접 한복을 입어보고 한국 전통문화를 체험할 수 있도록 하겠습니다.', 
                    price: 50000, 
                    link: 'https://example.com/hanbok', 
                    status: 'pending' 
                },
                { 
                    id: 2, 
                    name: '태극기', 
                    purpose: '국가상징 교육 및 광복절 행사에 활용할 예정입니다.', 
                    price: 15000, 
                    link: 'https://example.com/flag', 
                    status: 'approved' 
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
                    id: 3, 
                    name: '전통 악기 세트', 
                    purpose: '한국 전통음악 수업에서 학생들이 직접 악기를 연주해볼 수 있도록 하는 체험 활동용입니다.', 
                    price: 120000, 
                    link: 'https://example.com/instruments', 
                    status: 'pending' 
                },
                { 
                    id: 4, 
                    name: '한국 전통 차 세트', 
                    purpose: '한국의 차 문화 소개 및 다도 체험 수업용입니다.', 
                    price: 35000, 
                    link: 'https://example.com/tea-set', 
                    status: 'rejected',
                    rejectionReason: '예산 초과로 인한 반려입니다. 더 저렴한 대안을 찾아주세요.'
                }
            ],
            submittedAt: '2024-06-11T14:20:00'
        }
    ],

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
            status: 'pending'
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
                    '파견국가': student ? student.country : '',
                    '프로그램': student ? student.program : '',
                    '교구명': item.name,
                    '사용목적': item.purpose,
                    '예상가격': item.price,
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