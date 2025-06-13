// 데이터 관리 모듈
const DataManager = {
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
                    status: 'approved',
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
                    price: 150000, 
                    link: