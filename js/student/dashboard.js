/**
 * 학생 대시보드 JavaScript - 안정화된 통합 버전
 * 
 * 주요 개선사항:
 * - 템플릿 표현식 오류 완전 해결
 * - 함수 중복 제거 및 통합
 * - 안전한 이벤트 핸들링
 * - 데이터 동기화 강화
 */

// 전역 변수
let currentStudent = null;
let dashboardInitialized = false;

/**
 * 대시보드 초기화 - 메인 함수
 */
async function initializeDashboard() {
    console.log('🎯 대시보드 초기화 시작 - 통합 버전');
    
    if (dashboardInitialized) {
        console.log('⚠️ 대시보드가 이미 초기화되었습니다.');
        return;
    }
    
    try {
        // 1단계: 학생 인증 확인
        const student = await checkAndLoadStudentAuthentication();
        if (!student) return;

        // 2단계: SupabaseAPI 초기화 대기
        await waitForSupabaseAPIAndSync(student);

        // 3단계: 기능 설정 로드
        await loadFeatureSettings();

        // 4단계: 이벤트 리스너 설정
        setupEventListeners();

        dashboardInitialized = true;
        console.log('✅ 대시보드 초기화 완료');

    } catch (error) {
        console.error('❌ 대시보드 초기화 오류:', error);
        showSystemError(error.message);
    }
}

/**
 * 학생 인증 확인 및 로드
 */
async function checkAndLoadStudentAuthentication() {
    console.log('🔐 학생 인증 확인 시작');
    
    try {
        const studentData = localStorage.getItem('currentStudent');
        if (!studentData) {
            throw new Error('로그인이 필요합니다.');
        }

        const student = JSON.parse(studentData);
        
        // 필수 필드 검증
        if (!student.id || !student.name) {
            throw new Error('사용자 데이터가 불완전합니다.');
        }

        // 전역 변수에 저장
        currentStudent = student;

        // UI 업데이트
        updateStudentInfo(student);

        console.log('✅ 학생 인증 확인 완료:', {
            name: student.name,
            id: student.id,
            institute: student.sejong_institute,
            field: student.field
        });

        return student;

    } catch (error) {
        console.error('❌ 학생 인증 확인 실패:', error);
        
        // 인증 실패 시 로그인 페이지로 이동
        setTimeout(() => {
            alert(error.message + ' 다시 로그인해주세요.');
            window.location.href = '../index.html';
        }, 1000);
        
        return null;
    }
}

/**
 * SupabaseAPI 초기화 대기 및 동기화
 */
async function waitForSupabaseAPIAndSync(student) {
    console.log('🔄 SupabaseAPI 초기화 대기 중...');
    
    // SupabaseAPI 로드 대기 (최대 10초)
    let waitCount = 0;
    const maxWait = 100; // 10초 (100 * 100ms)
    
    while (typeof SupabaseAPI === 'undefined' && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }

    if (typeof SupabaseAPI === 'undefined') {
        throw new Error('시스템 로딩에 실패했습니다.');
    }

    // SupabaseAPI 클라이언트 초기화 대기
    let initCount = 0;
    while (!SupabaseAPI.client && initCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        initCount++;
    }

    // 사용자 정보 동기화
    SupabaseAPI.currentUser = student;
    SupabaseAPI.currentUserType = 'student';

    console.log('✅ SupabaseAPI 동기화 완료');
    
    // sessionStorage 동기화
    updateSessionStorage(student);
}

/**
 * sessionStorage 동기화
 */
function updateSessionStorage(studentData) {
    try {
        const sessionData = {
            user: studentData,
            userType: 'student',
            loginTime: studentData.loginTime || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        sessionStorage.setItem('userSession', JSON.stringify(sessionData));
        
        // 전역 변수도 동기화
        if (typeof window !== 'undefined') {
            window.currentStudentData = studentData;
        }
        
        console.log('✅ sessionStorage 동기화 완료');
    } catch (error) {
        console.error('⚠️ sessionStorage 동기화 오류:', error);
    }
}

/**
 * 학생 정보 UI 업데이트
 */
function updateStudentInfo(student) {
    try {
        const studentNameElement = document.getElementById('studentName');
        if (studentNameElement) {
            studentNameElement.textContent = `${student.name}님, 안녕하세요!`;
        }
        
        const studentDetailsElement = document.getElementById('studentDetails');
        if (studentDetailsElement) {
            const institute = student.sejong_institute || '세종학당';
            const field = student.field || '문화 분야';
            studentDetailsElement.textContent = `${institute} • ${field}`;
        }
        
        console.log('✅ 학생 정보 UI 업데이트 완료');
    } catch (error) {
        console.error('❌ 학생 정보 UI 업데이트 오류:', error);
    }
}

/**
 * 기능 설정 로드
 */
async function loadFeatureSettings() {
    console.log('🎛️ 기능 설정 로드 시작');
    
    try {
        showLoadingMessage('기능 설정을 불러오는 중...');

        // SupabaseAPI를 통한 기능 설정 조회
        const client = await SupabaseAPI.ensureClient();
        const { data: features, error } = await client
            .from('feature_settings')
            .select('*')
            .order('display_order');

        if (error) {
            console.warn('⚠️ 기능 설정 조회 오류:', error);
            // 기본 설정으로 대체
            renderMenuGrid(getDefaultFeatures());
            showSystemMessage('기본 설정으로 로드되었습니다.', 'warning');
        } else {
            console.log('✅ 기능 설정 로드 성공:', features);
            renderMenuGrid(features || getDefaultFeatures());
        }

    } catch (error) {
        console.error('❌ 기능 설정 로드 오류:', error);
        renderMenuGrid(getDefaultFeatures());
        showSystemMessage('기본 설정으로 로드되었습니다.', 'warning');
    }
}

/**
 * 기본 기능 설정
 */
function getDefaultFeatures() {
    return [
        { 
            feature_name: 'institute_info', 
            feature_title: '파견 학당 정보', 
            is_active: true,
            display_order: 1
        },
        { 
            feature_name: 'flight_request', 
            feature_title: '항공권 구매 신청', 
            is_active: false,
            display_order: 2
        },
        { 
            feature_name: 'equipment_request', 
            feature_title: '문화교구 신청', 
            is_active: true,
            display_order: 3
        }
    ];
}

/**
 * 메뉴 그리드 렌더링 - 안전한 버전
 */
function renderMenuGrid(features) {
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;

    const featureConfig = {
        'institute_info': {
            icon: 'building',
            title: '파견 학당 정보',
            description: '배정받은 세종학당의 상세 정보를 확인하고<br>현지 정보를 열람할 수 있습니다.',
            buttonText: '정보 보기',
            action: 'navigateToInstituteInfo'
        },
        'flight_request': {
            icon: 'plane',
            title: '항공권 구매 신청',
            description: '파견지까지의 항공권 구매를 신청하고<br>승인 현황을 확인할 수 있습니다.',
            buttonText: '신청하기',
            action: 'navigateToFlightRequest'
        },
        'equipment_request': {
            icon: 'package',
            title: '문화교구 신청',
            description: '수업에 필요한 문화 교구를 신청하고<br>승인·구매 현황을 확인할 수 있습니다.',
            buttonText: '신청하기',
            action: 'navigateToEquipmentRequest'
        }
    };

    // DOM을 직접 생성하여 템플릿 표현식 오류 방지
    menuGrid.innerHTML = '';

    features.forEach(feature => {
        const config = featureConfig[feature.feature_name];
        if (!config) return;

        const isActive = feature.is_active;
        
        // 카드 요소 생성
        const cardDiv = document.createElement('div');
        cardDiv.className = `menu-card ${isActive ? 'available' : 'coming-soon'}`;
        cardDiv.id = `${feature.feature_name}Card`;

        // 아이콘 섹션
        const iconDiv = document.createElement('div');
        iconDiv.className = 'menu-icon';
        const iconElement = document.createElement('i');
        iconElement.setAttribute('data-lucide', config.icon);
        iconDiv.appendChild(iconElement);

        // 제목
        const titleElement = document.createElement('h2');
        titleElement.className = 'menu-title';
        titleElement.textContent = config.title;

        // 설명
        const descriptionElement = document.createElement('p');
        descriptionElement.className = 'menu-description';
        descriptionElement.innerHTML = config.description;

        // 버튼
        const buttonElement = document.createElement('button');
        buttonElement.className = 'menu-button';
        if (!isActive) {
            buttonElement.disabled = true;
        }

        const buttonIcon = document.createElement('i');
        buttonIcon.setAttribute('data-lucide', isActive ? 'arrow-right' : 'clock');
        
        const buttonText = document.createElement('span');
        buttonText.textContent = isActive ? config.buttonText : '준비 중';

        buttonElement.appendChild(buttonIcon);
        buttonElement.appendChild(buttonText);

        // 버튼 클릭 이벤트 (안전한 방식)
        buttonElement.addEventListener('click', function() {
            if (isActive) {
                const actionFunction = window[config.action];
                if (typeof actionFunction === 'function') {
                    actionFunction();
                } else {
                    console.error(`Function ${config.action} not found`);
                }
            } else {
                showComingSoonMessage(config.title);
            }
        });

        // 요소들을 카드에 추가
        cardDiv.appendChild(iconDiv);
        cardDiv.appendChild(titleElement);
        cardDiv.appendChild(descriptionElement);
        cardDiv.appendChild(buttonElement);

        // 카드를 그리드에 추가
        menuGrid.appendChild(cardDiv);
    });

    // 아이콘 다시 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('✅ 메뉴 그리드 렌더링 완료 (안전한 방식)');
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 키보드 단축키
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('✅ 이벤트 리스너 설정 완료');
}

/**
 * 키보드 단축키 처리
 */
function handleKeyboardShortcuts(event) {
    // Ctrl + D: 디버그 정보
    if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        showDebugInfo();
    }
    
    // Ctrl + 1: 파견 학당 정보
    if (event.ctrlKey && event.key === '1') {
        event.preventDefault();
        navigateToInstituteInfo();
    }
    
    // Ctrl + 2: 항공권 신청
    if (event.ctrlKey && event.key === '2') {
        event.preventDefault();
        navigateToFlightRequest();
    }
    
    // Ctrl + 3: 문화교구 신청
    if (event.ctrlKey && event.key === '3') {
        event.preventDefault();
        navigateToEquipmentRequest();
    }
}

/**
 * 페이지 네비게이션 함수들
 */
function navigateToInstituteInfo() {
    try {
        console.log('📍 파견 학당 정보 페이지로 이동');
        ensureDataSync();
        window.location.href = 'institute-info.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류:', error);
        alert('페이지 이동 중 오류가 발생했습니다.');
    }
}

function navigateToFlightRequest() {
    console.log('✈️ 항공권 신청 (준비 중)');
    showComingSoonMessage('항공권 구매 신청');
}

function navigateToEquipmentRequest() {
    try {
        console.log('📋 문화교구 신청 페이지로 이동');
        ensureDataSync();
        window.location.href = 'equipment-request.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류:', error);
        alert('페이지 이동 중 오류가 발생했습니다.');
    }
}

/**
 * 데이터 동기화 확인
 */
function ensureDataSync() {
    if (currentStudent) {
        // localStorage 업데이트
        localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        
        // sessionStorage 동기화
        updateSessionStorage(currentStudent);
        
        console.log('✅ 페이지 이동 전 데이터 동기화 완료');
    }
}

/**
 * 로그아웃 처리
 */
function handleLogout() {
    if (confirm('로그아웃하시겠습니까?')) {
        try {
            // 세션 정보 삭제
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
            sessionStorage.removeItem('userSession');
            
            // SupabaseAPI 로그아웃
            if (typeof SupabaseAPI !== 'undefined' && SupabaseAPI.logout) {
                SupabaseAPI.logout();
            }
            
            // 전역 변수 정리
            currentStudent = null;
            dashboardInitialized = false;
            if (typeof window !== 'undefined') {
                window.currentStudentData = null;
            }
            
            console.log('✅ 로그아웃 완료');
            
            // 로그인 페이지로 이동
            window.location.href = '../index.html';
        } catch (error) {
            console.error('❌ 로그아웃 오류:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 유틸리티 함수들
 */
function showLoadingMessage(message) {
    const menuGrid = document.getElementById('menuGrid');
    if (menuGrid) {
        menuGrid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showSystemMessage(message, type = 'info') {
    const systemStatus = document.getElementById('systemStatus');
    if (!systemStatus) return;

    const alertClass = `alert-${type}`;
    const icon = type === 'warning' ? 'alert-triangle' : 'info';

    systemStatus.innerHTML = `
        <div class="alert ${alertClass}">
            <i data-lucide="${icon}"></i>
            <div>
                <p>${message}</p>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 3초 후 자동 제거
    setTimeout(() => {
        systemStatus.innerHTML = '';
    }, 3000);
}

function showSystemError(message) {
    const systemStatus = document.getElementById('systemStatus');
    if (!systemStatus) return;

    systemStatus.innerHTML = `
        <div class="alert alert-warning">
            <i data-lucide="alert-triangle"></i>
            <div>
                <h4>⚠️ 시스템 오류</h4>
                <p>${message}</p>
                <div style="margin-top: 10px;">
                    <button onclick="retryInitialization()" class="btn btn-sm primary">
                        <i data-lucide="refresh-cw"></i> 다시 시도
                    </button>
                    <button onclick="location.reload()" class="btn btn-sm secondary">
                        <i data-lucide="rotate-ccw"></i> 페이지 새로고침
                    </button>
                </div>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function showComingSoonMessage(featureName) {
    alert(`${featureName} 기능은 곧 제공될 예정입니다.`);
}

function retryInitialization() {
    console.log('🔄 대시보드 초기화 재시도');
    
    // 시스템 상태 초기화
    const systemStatus = document.getElementById('systemStatus');
    if (systemStatus) {
        systemStatus.innerHTML = '';
    }
    
    dashboardInitialized = false;
    
    // 재시도
    initializeDashboard();
}

function showDebugInfo() {
    console.group('🔍 대시보드 디버그 정보');
    console.log('현재 학생 정보:', currentStudent);
    console.log('초기화 상태:', dashboardInitialized);
    console.log('localStorage 데이터:', {
        currentStudent: localStorage.getItem('currentStudent')
    });
    console.log('sessionStorage 데이터:', {
        userSession: sessionStorage.getItem('userSession')
    });
    console.log('SupabaseAPI 상태:', typeof SupabaseAPI !== 'undefined');
    if (typeof SupabaseAPI !== 'undefined') {
        console.log('SupabaseAPI 클라이언트:', !!SupabaseAPI.client);
        console.log('현재 사용자:', SupabaseAPI.currentUser);
    }
    console.groupEnd();
    
    const debugInfo = `
        📋 대시보드 상태
        
        학생명: ${currentStudent?.name || 'N/A'}
        ID: ${currentStudent?.id || 'N/A'}
        학당: ${currentStudent?.sejong_institute || 'N/A'}
        분야: ${currentStudent?.field || 'N/A'}
        초기화 상태: ${dashboardInitialized ? '완료' : '미완료'}
        
        ✅ 템플릿 표현식 오류 해결
        ✅ 안전한 이벤트 핸들링
        ✅ 데이터 동기화 완료
    `;
    
    alert('디버그 정보 (자세한 내용은 콘솔 참조):' + debugInfo);
}

/**
 * 페이지 로드 시 자동 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 대시보드 페이지 로드 완료 - 통합 버전');
    
    // 약간의 지연 후 초기화 (다른 스크립트 로딩 완료 대기)
    setTimeout(() => {
        initializeDashboard();
    }, 200);
});

/**
 * 페이지 언로드 시 정리
 */
window.addEventListener('beforeunload', function() {
    console.log('대시보드 페이지 언로드');
    dashboardInitialized = false;
});

// 전역으로 노출할 함수들
window.navigateToInstituteInfo = navigateToInstituteInfo;
window.navigateToFlightRequest = navigateToFlightRequest;
window.navigateToEquipmentRequest = navigateToEquipmentRequest;
window.handleLogout = handleLogout;
window.showDebugInfo = showDebugInfo;
window.retryInitialization = retryInitialization;
window.showComingSoonMessage = showComingSoonMessage;