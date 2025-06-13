// 데이터 관리 모듈
const DataManager = {
    // 현재 사용자 정보
    currentUser: null,
    currentUserType: null,

    // 수업계획 설정 정보 (업데이트됨 - 2026년으로 변경)
    lessonPlanSettings: {
        editDeadline: '2026-12-31',  // 수정 마감일 (2026년으로 연장)
        editTime: '23:59',           // 수정 마감 시간
        noticeMessage: '수업계획을 2026년 말까지 자유롭게 수정할 수 있습니다.',           // 알림 메시지
        testMode: true,              // 테스트 모드 (항상 편집 허용) - 활성화
        allowOverrideDeadline: false // 마감일 무시 모드
    },

    // 모의 학생 데이터 - 예산 값 업데이트 및 배송지 정보 추가
    students: [
        { 
            id: 1, 
            name: '김민수', 
            birthDate: '1998-03-15', 
            instituteName: '하노이 세종학당', 
            specialization: '한국어교육', 
            budgetLimit: 300000,
            allocatedBudget: 300000, // 수업계획 승인으로 배정된 예산
            shippingAddress: {
                name: '김민수',
                phone: '+84-98-765-4321',
                address: '123 Tran Hung Dao Street, Hoan Kiem District, Hanoi, Vietnam',
                postcode: '10000',
                note: '세종학당 근처 아파트입니다. 부재 시 관리사무소에 맡겨주세요.'
            }
        },
        { 
            id: 2, 
            name: '이지영', 
            birthDate: '1999-07-22', 
            instituteName: '방콕 세종학당', 
            specialization: '전통문화예술', 
            budgetLimit: 400000,
            allocatedBudget: 400000, // 수업계획 승인으로 배정된 예산
            shippingAddress: {
                name: '이지영',
                phone: '+66-89-123-4567',
                address: '456 Sukhumvit Road, Watthana District, Bangkok 10110, Thailand',
                postcode: '10110',
                note: '주말에는 집에 있습니다. 평일 오후 6시 이후 배송 선호합니다.'
            }
        },
        { 
            id: 3, 
            name: '박준호', 
            birthDate: '1997-11-08', 
            instituteName: '자카르타 세종학당', 
            specialization: 'K-Pop 문화', 
            budgetLimit: 250000,
            allocatedBudget: 250000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null // 배송지 미설정
        },
        { 
            id: 4, 
            name: '최서연', 
            birthDate: '1998-12-03', 
            instituteName: '쿠알라룸푸르 세종학당', 
            specialization: '한국어교육', 
            budgetLimit: 350000,
            allocatedBudget: 350000, // 수업계획 승인으로 배정된 예산
            shippingAddress: {
                name: '최서연',
                phone: '+60-12-345-6789',
                address: 'No. 789, Jalan Bukit Bintang, Bukit Bintang, 55100 Kuala Lumpur, Malaysia',
                postcode: '55100',
                note: null
            }
        },
        { 
            id: 5, 
            name: '정현우', 
            birthDate: '1999-05-17', 
            instituteName: '마닐라 세종학당', 
            specialization: '한국현대문화', 
            budgetLimit: 320000,
            allocatedBudget: 320000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null // 배송지 미설정
        },
        { 
            id: 6, 
            name: '송미영', 
            birthDate: '1998-08-24', 
            instituteName: '뉴욕 세종학당', 
            specialization: '전통음악', 
            budgetLimit: 400000,
            allocatedBudget: 400000, // 수업계획 승인으로 배정된 예산
            shippingAddress: {
                name: 'Song Mi-young',
                phone: '+1-212-555-0123',
                address: '456 Broadway, Manhattan, New York, NY 10013, USA',
                postcode: '10013',
                note: 'Apartment 5B. Please ring the doorbell. If no answer, leave with doorman.'
            }
        },
        { 
            id: 7, 
            name: '유진호', 
            birthDate: '1997-01-19', 
            instituteName: '런던 세종학당', 
            specialization: '한국미술', 
            budgetLimit: 380000,
            allocatedBudget: 380000, // 수업계획 승인으로 배정된 예산
            shippingAddress: {
                name: 'Jin-ho Yoo',
                phone: '+44-20-7946-0958',
                address: '123 Oxford Street, Fitzrovia, London W1W 5PF, United Kingdom',
                postcode: 'W1W 5PF',
                note: 'Flat 4, second floor. Delivery preferred between 2-6 PM.'
            }
        },
        { 
            id: 8, 
            name: '강예린', 
            birthDate: '1999-11-07', 
            instituteName: '파리 세종학당', 
            specialization: '한국요리문화', 
            budgetLimit: 300000,
            allocatedBudget: 300000, // 수업계획 승인으로 배정된 예산
            shippingAddress: null // 배송지 미설정
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

    // 모의 신청 데이터 - 모든 학생의 다양한 샘플데이터 추가
    applications: [
        // 김민수 (하노이 세종학당 - 한국어교육)
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
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-10T09:30:00'
                },
                { 
                    id: 2, 
                    name: '한국 전통 차 세트 (다기)', 
                    purpose: '한국의 차 문화 소개 및 다도 체험 수업용입니다. 베트남 학생들에게 한국의 전통 차 문화를 체험시키고 베트남 차 문화와 비교하는 활동에 사용하겠습니다.', 
                    price: 120000, 
                    link: 'https://example.com/tea-set', 
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-08T14:20:00'
                },
                { 
                    id: 3, 
                    name: '한글 캘리그래피 도구 세트', 
                    purpose: '한글의 아름다움을 알리는 캘리그래피 수업용 도구입니다. 붓, 먹, 한지 등을 포함한 전체 세트로 학생들이 직접 한글 작품을 만들어볼 수 있습니다.', 
                    price: 95000, 
                    link: 'https://example.com/calligraphy', 
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-05T16:45:00'
                }
            ],
            submittedAt: '2024-06-10T09:30:00'
        },

        // 이지영 (방콕 세종학당 - 전통문화예술)
        {
            id: 2,
            studentId: 2,
            studentName: '이지영',
            items: [
                {
                    id: 4,
                    name: '태국 전통 춤 의상 세트',
                    purpose: '한국 전통 춤과 태국 전통 춤의 비교 문화 수업을 위해 사용하겠습니다. 학생들이 두 나라의 전통 예술을 직접 체험하며 문화적 유사점과 차이점을 학습할 수 있습니다.',
                    price: 150000,
                    link: 'https://example.com/thai-costume',
                    status: 'pending',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-12T10:15:00'
                },
                {
                    id: 5,
                    name: '한국 전통 악기 세트 (소금, 장구, 북)',
                    purpose: '한국 전통 음악 수업에서 학생들이 직접 악기를 연주해볼 수 있도록 하겠습니다. 태국 전통 악기와 함께 연주하여 양국의 전통 음악을 비교 체험합니다.',
                    price: 280000,
                    link: 'https://example.com/traditional-instruments',
                    status: 'approved',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-10T08:30:00'
                },
                {
                    id: 6,
                    name: '민화 그리기 도구',
                    purpose: '한국 전통 미술인 민화를 직접 그려보는 체험 수업용입니다. 현지 학생들에게 한국의 전통 회화 기법을 소개하고 체험할 기회를 제공하겠습니다.',
                    price: 95000,
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'offline',
                    submittedAt: '2024-06-09T13:20:00',
                    receiptImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
                    purchaseDateTime: '2024-06-14T15:30:00',
                    purchaseStore: '방콕 미술용품점',
                    receiptNote: '현지 미술용품점에서 구매완료',
                    receiptSubmittedAt: '2024-06-14T18:45:00'
                }
            ],
            submittedAt: '2024-06-12T10:15:00'
        },

        // 박준호 (자카르타 세종학당 - K-Pop 문화)
        {
            id: 3,
            studentId: 3,
            studentName: '박준호',
            items: [
                {
                    id: 7,
                    name: 'K-Pop 댄스 의상 및 소품 세트',
                    purpose: 'K-Pop 댄스 수업에서 학생들이 실제 아이돌처럼 의상을 입고 춤을 배울 수 있도록 하겠습니다. 다양한 컨셉의 의상으로 K-Pop 문화의 다양성을 보여주겠습니다.',
                    price: 180000,
                    link: 'https://example.com/kpop-costume',
                    status: 'rejected',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    rejectionReason: '예산 초과로 인한 반려. 더 경제적인 대안을 제시해주시기 바랍니다.',
                    submittedAt: '2024-06-11T11:45:00',
                    reviewedAt: '2024-06-13T09:20:00'
                },
                {
                    id: 8,
                    name: '한국 전통 놀이 도구 (윷놀이, 제기차기, 딱지)',
                    purpose: 'K-Pop과 함께 한국의 전통 놀이도 소개하여 현대와 전통이 공존하는 한국 문화의 특징을 보여주겠습니다. 학생들이 직접 체험할 수 있는 놀이 활동을 진행합니다.',
                    price: 65000,
                    status: 'pending',
                    type: 'bundle',
                    purchaseMethod: 'offline',
                    submittedAt: '2024-06-13T14:10:00'
                },
                {
                    id: 9,
                    name: 'K-Pop 포토카드 제작 키트',
                    purpose: '학생들이 직접 자신만의 K-Pop 스타일 포토카드를 만들어볼 수 있는 체험 활동용입니다. 인쇄기, 카드지, 홀로그램 스티커 등이 포함되어 있습니다.',
                    price: 120000,
                    link: 'https://example.com/photocard-kit',
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-09T16:30:00'
                }
            ],
            submittedAt: '2024-06-13T14:10:00'
        },

        // 최서연 (쿠알라룸푸르 세종학당 - 한국어교육)
        {
            id: 4,
            studentId: 4,
            studentName: '최서연',
            items: [
                {
                    id: 10,
                    name: '한국어 교육용 보드게임 세트',
                    purpose: '말레이시아 학생들이 재미있게 한국어를 배울 수 있도록 다양한 한국어 교육용 보드게임을 활용하겠습니다. 어휘, 문법, 회화 연습을 게임을 통해 자연스럽게 학습할 수 있습니다.',
                    price: 95000,
                    link: 'https://example.com/korean-boardgames',
                    status: 'purchased',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-07T09:15:00'
                },
                {
                    id: 11,
                    name: '한국 전통 조리 도구 (뚝배기, 젓가락, 숟가락 세트)',
                    purpose: '한국 음식 문화 수업에서 실제 한국 조리 도구를 사용하여 한국 음식을 만들어보는 체험 수업을 진행하겠습니다. 문화와 언어를 함께 학습할 수 있는 융합 교육입니다.',
                    price: 85000,
                    status: 'approved',
                    type: 'bundle',
                    purchaseMethod: 'offline',
                    submittedAt: '2024-06-11T15:40:00'
                },
                {
                    id: 12,
                    name: '한글 자석 교구',
                    purpose: '한글 자음과 모음을 자석으로 만들어 칠판에 붙였다 떼었다 하며 한글 조합을 쉽게 배울 수 있는 교구입니다. 시각적, 촉각적 학습을 동시에 가능하게 합니다.',
                    price: 45000,
                    link: 'https://example.com/hangul-magnets',
                    status: 'pending',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-13T11:25:00'
                }
            ],
            submittedAt: '2024-06-13T11:25:00'
        },

        // 정현우 (마닐라 세종학당 - 한국현대문화)
        {
            id: 5,
            studentId: 5,
            studentName: '정현우',
            items: [
                {
                    id: 13,
                    name: '한국 드라마 OST 음향 장비',
                    purpose: '한국 드라마와 K-Pop 음악을 활용한 한국어 및 문화 수업을 위한 고품질 음향 장비입니다. 학생들이 한국 대중문화를 통해 자연스럽게 한국어와 문화를 학습할 수 있습니다.',
                    price: 240000,
                    link: 'https://example.com/audio-equipment',
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-08T13:50:00'
                },
                {
                    id: 14,
                    name: '한국 화장품 체험 키트',
                    purpose: '한국의 뷰티 문화 수업에서 K-뷰티 제품을 직접 체험해볼 수 있는 키트입니다. 한국 화장품 산업의 발전사와 함께 현대 한국 문화의 특징을 학습합니다.',
                    price: 150000,
                    status: 'rejected',
                    type: 'bundle',
                    purchaseMethod: 'offline',
                    rejectionReason: '화장품은 개인 위생용품으로 공동 사용이 부적절합니다. 다른 교구로 대체해주시기 바랍니다.',
                    submittedAt: '2024-06-10T17:20:00',
                    reviewedAt: '2024-06-12T10:15:00'
                },
                {
                    id: 15,
                    name: '한국 웹툰 제작 도구 세트',
                    purpose: '한국 웹툰 문화를 소개하고 학생들이 직접 간단한 웹툰을 제작해볼 수 있는 디지털 도구 세트입니다. 태블릿, 스타일러스 펜, 웹툰 제작 소프트웨어가 포함됩니다.',
                    price: 320000,
                    link: 'https://example.com/webtoon-kit',
                    status: 'pending',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-12T20:30:00'
                }
            ],
            submittedAt: '2024-06-12T20:30:00'
        },

        // 송미영 (뉴욕 세종학당 - 전통음악)
        {
            id: 6,
            studentId: 6,
            studentName: '송미영',
            items: [
                {
                    id: 16,
                    name: '가야금 (25현)',
                    purpose: '한국 전통 음악의 대표 악기인 가야금을 직접 배우고 연주할 수 있도록 하겠습니다. 미국 학생들에게 한국 전통 음악의 아름다움을 전달하고 동서양 음악의 차이를 체험하게 합니다.',
                    price: 450000,
                    link: 'https://example.com/gayageum',
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-05T10:40:00'
                },
                {
                    id: 17,
                    name: '한국 전통 음악 의상 (한복)',
                    purpose: '전통 음악 공연 시 착용할 한복입니다. 음악과 의상이 함께 어우러진 완성도 높은 한국 전통 문화 체험을 제공하겠습니다.',
                    price: 180000,
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'offline',
                    submittedAt: '2024-06-09T14:15:00',
                    receiptImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
                    purchaseDateTime: '2024-06-15T12:20:00',
                    purchaseStore: '뉴욕 한복점',
                    receiptNote: '뉴욕 코리아타운 한복 전문점에서 구매',
                    receiptSubmittedAt: '2024-06-15T15:30:00'
                },
                {
                    id: 18,
                    name: '국악기 튜닝 및 관리 도구',
                    purpose: '가야금과 기타 국악기의 조율과 관리를 위한 전문 도구 세트입니다. 악기를 최상의 상태로 유지하여 질 높은 음악 교육을 제공하겠습니다.',
                    price: 85000,
                    link: 'https://example.com/instrument-tools',
                    status: 'approved',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-11T16:45:00'
                }
            ],
            submittedAt: '2024-06-11T16:45:00'
        },

        // 유진호 (런던 세종학당 - 한국미술)
        {
            id: 7,
            studentId: 7,
            studentName: '유진호',
            items: [
                {
                    id: 19,
                    name: '한국 전통 도자기 제작 도구 세트',
                    purpose: '한국 전통 도자기 문화를 소개하고 학생들이 직접 간단한 도자기를 만들어볼 수 있는 체험 수업용 도구입니다. 물레, 점토, 유약 등이 포함됩니다.',
                    price: 280000,
                    link: 'https://example.com/pottery-kit',
                    status: 'pending',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-13T09:20:00'
                },
                {
                    id: 20,
                    name: '서예 도구 (붓, 먹, 벼루, 한지)',
                    purpose: '한국 서예 문화를 체험할 수 있는 전통 서예 도구 세트입니다. 한글과 한자 서예를 모두 체험하며 한국의 문자 문화와 예술을 학습합니다.',
                    price: 120000,
                    status: 'purchased',
                    type: 'bundle',
                    purchaseMethod: 'offline',
                    submittedAt: '2024-06-08T11:30:00',
                    receiptImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
                    purchaseDateTime: '2024-06-12T14:40:00',
                    purchaseStore: '런던 동양미술용품점',
                    receiptNote: '차이나타운 전문 서예용품점에서 구매',
                    receiptSubmittedAt: '2024-06-12T18:20:00'
                },
                {
                    id: 21,
                    name: '한국 전통 색채 안료',
                    purpose: '한국 전통 회화에서 사용되는 천연 안료를 이용한 색채 체험 수업용입니다. 서양 물감과는 다른 한국 전통 색감을 직접 체험하게 하겠습니다.',
                    price: 95000,
                    link: 'https://example.com/traditional-pigments',
                    status: 'approved',
                    type: 'single',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-10T15:10:00'
                }
            ],
            submittedAt: '2024-06-13T09:20:00'
        },

        // 강예린 (파리 세종학당 - 한국요리문화)
        {
            id: 8,
            studentId: 8,
            studentName: '강예린',
            items: [
                {
                    id: 22,
                    name: '한국 전통 조리 도구 세트 (뚝배기, 돌솥, 찜기)',
                    purpose: '한국 요리의 특징인 찌개, 밥, 찜 요리를 직접 만들어볼 수 있는 전통 조리 도구입니다. 프랑스 학생들에게 한국 요리의 독특함을 체험시키겠습니다.',
                    price: 250000,
                    link: 'https://example.com/cooking-tools',
                    status: 'approved',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-09T10:25:00'
                },
                {
                    id: 23,
                    name: '김치 제조 도구 및 재료',
                    purpose: '한국의 대표 발효 음식인 김치를 직접 만들어보는 체험 수업용입니다. 김치통, 장갑, 배추, 각종 양념재료가 포함됩니다.',
                    price: 180000,
                    status: 'rejected',
                    type: 'bundle',
                    purchaseMethod: 'offline',
                    rejectionReason: '신선 식품은 배송 및 보관이 어려워 승인할 수 없습니다. 조리 도구만으로 대체 신청해주시기 바랍니다.',
                    submittedAt: '2024-06-11T13:45:00',
                    reviewedAt: '2024-06-13T14:30:00'
                },
                {
                    id: 24,
                    name: '한국 전통 다과 세트',
                    purpose: '한국의 전통 차 문화와 다과 문화를 소개하는 수업용입니다. 전통차(대추차, 생강차 등)와 전통 과자(한과)로 구성되어 있습니다.',
                    price: 120000,
                    link: 'https://example.com/traditional-snacks',
                    status: 'pending',
                    type: 'bundle',
                    purchaseMethod: 'online',
                    submittedAt: '2024-06-12T16:20:00'
                },
                {
                    id: 25,
                    name: '한국 식기 세트 (놋그릇, 나무 숟가락)',
                    purpose: '한국 전통 식기를 사용한 식사 예절과 문화를 체험하는 수업용입니다. 프랑스 학생들에게 동양의 식사 문화를 소개하겠습니다.',
                    price: 95000,
                    status: 'purchased',
                    type: 'single',
                    purchaseMethod: 'offline',
                    submittedAt: '2024-06-06T12:15:00',
                    receiptImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
                    purchaseDateTime: '2024-06-10T16:30:00',
                    purchaseStore: '파리 아시아 식품점',
                    receiptNote: '파리 13구 아시아 타운에서 구매완료',
                    receiptSubmittedAt: '2024-06-10T19:45:00'
                }
            ],
            submittedAt: '2024-06-12T16:20:00'
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

    // 학생 예산 상태 조회 (새로운 예산 시스템)
    getStudentBudgetStatus(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return null;

        const lessonPlan = this.getStudentLessonPlan(studentId);
        const applications = this.getStudentApplications(studentId);
        
        let used = 0;
        applications.forEach(item => {
            if (item.status === 'approved' || item.status === 'purchased') {
                used += item.price;
            }
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

    // 대기 중인 수업계획 조회
    getPendingLessonPlans() {
        return Object.values(this.lessonPlans).filter(plan => 
            plan.status === 'completed' && (!plan.approvalStatus || plan.approvalStatus === 'pending')
        );
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

    // 수업계획 승인 (새로운 메서드)
    approveLessonPlan(studentId) {
        const lessonPlan = this.lessonPlans[studentId];
        if (!lessonPlan || lessonPlan.status !== 'completed') {
            return { success: false, message: '승인할 수 있는 수업계획이 없습니다.' };
        }

        lessonPlan.approvalStatus = 'approved';
        lessonPlan.approvedAt = new Date().toISOString();
        lessonPlan.approvedBy = '관리자';

        // 예산 배정
        const budgetInfo = this.allocateBudgetForStudent(studentId, lessonPlan);
        
        return { 
            success: true, 
            message: '수업계획이 승인되었습니다.',
            budgetInfo: budgetInfo
        };
    },

    // 수업계획 반려 (새로운 메서드)
    rejectLessonPlan(studentId, reason) {
        const lessonPlan = this.lessonPlans[studentId];
        if (!lessonPlan || lessonPlan.status !== 'completed') {
            return { success: false, message: '반려할 수 있는 수업계획이 없습니다.' };
        }

        lessonPlan.approvalStatus = 'rejected';
        lessonPlan.rejectionReason = reason;
        lessonPlan.rejectedAt = new Date().toISOString();

        // 예산 회수
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            student.allocatedBudget = 0;
        }

        return { success: true, message: '수업계획이 반려되었습니다.' };
    },

    // 학생 예산 배정 (수업계획 승인 시)
    allocateBudgetForStudent(studentId, lessonPlan) {
        const student = this.students.find(s => s.id === studentId);
        if (!student || !lessonPlan) return null;

        const fieldSettings = this.fieldBudgetSettings[student.specialization];
        if (!fieldSettings) return null;

        const totalLessons = lessonPlan.totalLessons || 0;
        const calculatedBudget = totalLessons * fieldSettings.perLessonAmount;
        const finalBudget = Math.min(calculatedBudget, fieldSettings.maxBudget);

        student.allocatedBudget = finalBudget;

        return {
            allocated: finalBudget,
            calculated: calculatedBudget,
            perLessonAmount: fieldSettings.perLessonAmount,
            maxBudget: fieldSettings.maxBudget,
            isCapReached: calculatedBudget > fieldSettings.maxBudget
        };
    },

    // 수업계획에서 예산 계산 (새로운 메서드)
    calculateBudgetFromLessonPlan(studentId) {
        const student = this.students.find(s => s.id === studentId);
        const lessonPlan = this.lessonPlans[studentId];
        
        if (!student || !lessonPlan || lessonPlan.approvalStatus !== 'approved') {
            return { allocated: 0, calculated: 0, perLessonAmount: 0, maxBudget: 0, isCapReached: false };
        }

        const fieldSettings = this.fieldBudgetSettings[student.specialization];
        if (!fieldSettings) {
            return { allocated: 0, calculated: 0, perLessonAmount: 0, maxBudget: 0, isCapReached: false };
        }

        const totalLessons = lessonPlan.totalLessons || 0;
        const calculatedBudget = totalLessons * fieldSettings.perLessonAmount;
        const finalBudget = Math.min(calculatedBudget, fieldSettings.maxBudget);

        return {
            allocated: finalBudget,
            calculated: calculatedBudget,
            perLessonAmount: fieldSettings.perLessonAmount,
            maxBudget: fieldSettings.maxBudget,
            isCapReached: calculatedBudget > fieldSettings.maxBudget
        };
    },

    // 분야별 예산 설정 조회
    getAllFieldBudgetSettings() {
        return this.fieldBudgetSettings;
    },

    // 분야별 예산 설정 업데이트
    updateFieldBudgetSettings(field, settings) {
        if (this.fieldBudgetSettings[field]) {
            Object.assign(this.fieldBudgetSettings[field], settings);
        }
    },

    // 테스트 모드 토글
    toggleTestMode() {
        this.lessonPlanSettings.testMode = !this.lessonPlanSettings.testMode;
        return this.lessonPlanSettings.testMode;
    },

    // 수업계획 설정 업데이트
    updateLessonPlanSettings(newSettings) {
        Object.assign(this.lessonPlanSettings, newSettings);
        
        // 현재 편집 가능 여부 확인
        const isEditingAllowed = this.canEditLessonPlan();
        
        return {
            ...this.lessonPlanSettings,
            isEditingAllowed: isEditingAllowed
        };
    },

    // 관리자용 통계 데이터
    getStats() {
        const allItems = [];
        this.applications.forEach(app => {
            app.items.forEach(item => {
                allItems.push({...item, studentName: app.studentName});
            });
        });

        return {
            totalStudents: this.students.length,
            applicantCount: this.applications.length,
            pendingCount: allItems.filter(item => item.status === 'pending').length,
            approvedCount: allItems.filter(item => item.status === 'approved').length,
            rejectedCount: allItems.filter(item => item.status === 'rejected').length,
            purchasedCount: allItems.filter(item => item.status === 'purchased').length
        };
    },

    // 예산 현황 통계 (새로운 메서드)
    getBudgetOverviewStats() {
        const allItems = [];
        this.applications.forEach(app => {
            app.items.forEach(item => {
                allItems.push({...item, studentName: app.studentName});
            });
        });

        const totalApprovedBudget = this.students.reduce((sum, s) => sum + s.allocatedBudget, 0);
        const approvedItemsTotal = allItems.filter(item => item.status === 'approved' || item.status === 'purchased')
                                  .reduce((sum, item) => sum + item.price, 0);
        const purchasedTotal = allItems.filter(item => item.status === 'purchased')
                               .reduce((sum, item) => sum + item.price, 0);
        const averagePerPerson = this.applications.length > 0 ? 
            Math.round(approvedItemsTotal / this.applications.length) : 0;

        return {
            totalApprovedBudget,
            approvedItemsTotal,
            purchasedTotal,
            averagePerPerson
        };
    },

    // 오프라인 구매 통계 (새로운 메서드)
    getOfflinePurchaseStats() {
        const allItems = [];
        this.applications.forEach(app => {
            app.items.forEach(item => {
                allItems.push({...item, studentName: app.studentName});
            });
        });

        const offlineItems = allItems.filter(item => item.purchaseMethod === 'offline');
        const approvedOffline = offlineItems.filter(item => item.status === 'approved').length;
        const withReceipt = offlineItems.filter(item => item.receiptImage).length;
        const pendingReceipt = approvedOffline - withReceipt;

        return {
            approvedOffline,
            withReceipt,
            pendingReceipt
        };
    },

    // 신청 검색 (새로운 메서드)
    searchApplications(searchTerm) {
        if (!searchTerm || !searchTerm.trim()) {
            return this.applications;
        }

        const term = searchTerm.trim().toLowerCase();
        return this.applications.filter(app => 
            app.studentName.toLowerCase().includes(term) ||
            app.items.some(item => 
                item.name.toLowerCase().includes(term) ||
                item.purpose.toLowerCase().includes(term)
            )
        );
    },

    // Excel 내보내기 데이터 준비 (새로운 메서드)
    prepareExportData() {
        const exportData = [];
        
        this.applications.forEach(app => {
            const student = this.students.find(s => s.id === app.studentId);
            const lessonPlan = this.lessonPlans[app.studentId];
            const budgetStatus = this.getStudentBudgetStatus(app.studentId);
            
            app.items.forEach(item => {
                exportData.push({
                    '학생명': app.studentName,
                    '소속기관': student?.instituteName || '',
                    '전공분야': student?.specialization || '',
                    '교구명': item.name,
                    '사용목적': item.purpose,
                    '가격': item.price,
                    '구매방식': item.purchaseMethod === 'offline' ? '오프라인' : '온라인',
                    '신청유형': item.type === 'bundle' ? '묶음' : '단일',
                    '상태': this.getStatusText(item.status),
                    '신청일': new Date(item.submittedAt).toLocaleDateString('ko-KR'),
                    '수업계획상태': lessonPlan?.approvalStatus || '미작성',
                    '배정예산': budgetStatus?.allocated || 0,
                    '사용예산': budgetStatus?.used || 0,
                    '잔여예산': budgetStatus?.remaining || 0,
                    '구매링크': item.link || '',
                    '반려사유': item.rejectionReason || '',
                    '영수증제출': item.receiptImage ? 'Y' : 'N',
                    '배송지설정': student?.shippingAddress ? 'Y' : 'N'
                });
            });
        });
        
        return exportData;
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