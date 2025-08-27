/**
 * 학생 대시보드 JavaScript - Option A 보조 모듈 v9.5.0
 * 
 * 🔄 v9.5.0 변경사항:
 * - 활동일 작성 기능 추가 (6번째 개별 기능)
 * - navigateToActivitySchedule() 함수 추가
 * - 키보드 단축키 Ctrl + 6 추가
 * 
 * 주요 기능:
 * - 학생 정보 업데이트 함수 제공
 * - API 호출 헬퍼 함수들
 * - 데이터 동기화 및 검증
 * - 페이지 네비게이션 보조
 */

console.log('📚 Dashboard.js v9.5.0 로딩 시작 - Option A 보조 모듈');

// 전역 변수 (dashboard.html과 공유)
let currentStudent = null;
let dashboardJsReady = false;

/**
 * 🆕 Option A: 보조적 초기화 함수
 * dashboard.html의 ModuleStatusTracker가 호출
 */
function initializeDashboardHelper() {
    console.log('🎯 dashboard.js 보조 초기화 시작 v9.5.0');
    
    try {
        // 기본 설정
        setupGlobalFunctions();
        setupKeyboardShortcuts();
        
        dashboardJsReady = true;
        console.log('✅ dashboard.js 보조 초기화 완료');
        
        // dashboard.html에 준비 완료 알림
        if (window.ModuleStatusTracker) {
            console.log('🔗 ModuleStatusTracker와 연동 완료');
        }
        
    } catch (error) {
        console.error('❌ dashboard.js 보조 초기화 오류:', error);
    }
}

/**
 * 학생 정보 업데이트 함수 (dashboard.html에서 호출됨)
 * 🔄 Option A: 전역으로 노출하여 dashboard.html에서 재활용 가능
 */
function updateStudentInfo(student) {
    try {
        if (!student) {
            console.warn('⚠️ updateStudentInfo: 학생 데이터가 없습니다.');
            return false;
        }

        // 전역 변수 업데이트
        currentStudent = student;
        
        // DOM 요소 업데이트 (dashboard.html의 updateStudentInfoUI와 호환)
        const studentNameElement = document.getElementById('studentName');
        if (studentNameElement) {
            studentNameElement.textContent = `${student.name}님, 안녕하세요!`;
            studentNameElement.className = ''; // loading 클래스 제거
        }
        
        const studentDetailsElement = document.getElementById('studentDetails');
        if (studentDetailsElement) {
            const institute = student.sejong_institute || '세종학당';
            const field = student.field || '문화 분야';
            studentDetailsElement.textContent = `${institute} • ${field}`;
            studentDetailsElement.className = ''; // loading 클래스 제거
        }
        
        // 세션 데이터 동기화
        updateSessionStorage(student);
        
        console.log('✅ dashboard.js updateStudentInfo 완료:', {
            name: student.name,
            institute: student.sejong_institute,
            field: student.field
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ updateStudentInfo 오류:', error);
        return false;
    }
}

/**
 * 학생 인증 정보 검증 (보조 함수)
 */
async function validateStudentAuthentication() {
    console.log('🔐 학생 인증 검증 시작 (보조)');
    
    try {
        const studentData = localStorage.getItem('currentStudent');
        if (!studentData) {
            throw new Error('로그인 정보가 없습니다.');
        }

        const student = JSON.parse(studentData);
        
        // 필수 필드 검증
        if (!student.id || !student.name) {
            throw new Error('사용자 데이터가 불완전합니다.');
        }

        // SupabaseAPI와 동기화
        if (typeof SupabaseAPI !== 'undefined') {
            SupabaseAPI.currentUser = student;
            SupabaseAPI.currentUserType = 'student';
        }

        console.log('✅ 학생 인증 검증 완료 (보조)');
        return student;

    } catch (error) {
        console.error('❌ 학생 인증 검증 실패 (보조):', error);
        return null;
    }
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
        
        console.log('✅ sessionStorage 동기화 완료 (보조)');
    } catch (error) {
        console.error('⚠️ sessionStorage 동기화 오류 (보조):', error);
    }
}

/**
 * 페이지 네비게이션 함수들 (보조)
 */
function navigateToInstituteInfo() {
    try {
        console.log('📍 파견 학당 정보 페이지로 이동 (보조)');
        ensureDataSync();
        window.location.href = 'institute-info.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류 (보조):', error);
        alert('페이지 이동 중 오류가 발생했습니다.');
    }
}

function navigateToFlightRequest() {
    console.log('✈️ 항공권 신청 (준비 중) (보조)');
    showComingSoonMessage('항공권 구매 신청');
}

function navigateToEquipmentRequest() {
    try {
        console.log('📋 문화교구 신청 페이지로 이동 (보조)');
        ensureDataSync();
        window.location.href = 'equipment-request.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류 (보조):', error);
        alert('페이지 이동 중 오류가 발생했습니다.');
    }
}

function navigateToRequiredDocuments() {
    try {
        console.log('📋 필수 서류 제출 페이지로 이동 (보조)');
        ensureDataSync();
        window.location.href = 'required-documents.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류 (보조):', error);
        alert('페이지 이동 중 오류가 발생했습니다.');
    }
}

/**
 * 🆕 v9.5.0: 활동일 작성 페이지 이동 (6번째 개별 기능)
 */
function navigateToActivitySchedule() {
    try {
        console.log('📅 활동일 작성 페이지로 이동 (보조)');
        ensureDataSync();
        window.location.href = 'activity-schedule.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류 (보조):', error);
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
        
        console.log('✅ 페이지 이동 전 데이터 동기화 완료 (보조)');
    }
}

/**
 * 로그아웃 처리 (보조)
 */
function handleLogout() {
    console.log('🚪 dashboard.js 로그아웃 처리 시작 (보조)');
    
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
        dashboardJsReady = false;
        if (typeof window !== 'undefined') {
            window.currentStudentData = null;
        }
        
        console.log('✅ dashboard.js 로그아웃 완료 (보조)');
        
        // dashboard.html의 로그아웃과 충돌하지 않도록 실제 이동은 하지 않음
        return true;
        
    } catch (error) {
        console.error('❌ dashboard.js 로그아웃 오류 (보조):', error);
        return false;
    }
}

/**
 * 기능 설정 로드 (보조)
 */
async function loadFeatureSettings() {
    console.log('🎛️ 기능 설정 로드 시작 (보조)');
    
    try {
        // SupabaseAPI를 통한 기능 설정 조회
        if (typeof SupabaseAPI === 'undefined') {
            console.warn('⚠️ SupabaseAPI 미로드 - 기본 설정 사용');
            return getDefaultFeatures();
        }

        const client = await SupabaseAPI.ensureClient();
        const { data: features, error } = await client
            .from('feature_settings')
            .select('*')
            .order('display_order');

        if (error) {
            console.warn('⚠️ 기능 설정 조회 오류 (보조):', error);
            return getDefaultFeatures();
        }

        console.log('✅ 기능 설정 로드 성공 (보조):', features);
        return features || getDefaultFeatures();

    } catch (error) {
        console.error('❌ 기능 설정 로드 오류 (보조):', error);
        return getDefaultFeatures();
    }
}

/**
 * 기본 기능 설정 - v9.5.0 업데이트
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
        },
        { 
            feature_name: 'required_documents', 
            feature_title: '필수 서류 제출', 
            is_active: false,
            display_order: 4
        },
        // 🆕 v9.5.0: 활동일 작성 기능 추가
        { 
            feature_name: 'activity_schedule', 
            feature_title: '활동일 작성', 
            is_active: false,
            display_order: 6
        }
    ];
}

/**
 * 키보드 단축키 설정
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    console.log('⌨️ 키보드 단축키 설정 완료 (보조)');
}

/**
 * 키보드 단축키 처리 - v9.5.0 업데이트
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
    
    // Ctrl + 4: 필수 서류 제출
    if (event.ctrlKey && event.key === '4') {
        event.preventDefault();
        navigateToRequiredDocuments();
    }

    // 🆕 v9.5.0: Ctrl + 6 - 활동일 작성
    if (event.ctrlKey && event.key === '6') {
        event.preventDefault();
        navigateToActivitySchedule();
    }
}

/**
 * 전역 함수 설정 - v9.5.0 업데이트
 */
function setupGlobalFunctions() {
    // 전역으로 노출할 함수들 (dashboard.html과의 호환성)
    window.updateStudentInfo = updateStudentInfo;
    window.validateStudentAuthentication = validateStudentAuthentication;
    window.navigateToInstituteInfo = navigateToInstituteInfo;
    window.navigateToFlightRequest = navigateToFlightRequest;
    window.navigateToEquipmentRequest = navigateToEquipmentRequest;
    window.navigateToRequiredDocuments = navigateToRequiredDocuments;
    window.navigateToActivitySchedule = navigateToActivitySchedule; // 🆕 추가
    window.loadFeatureSettings = loadFeatureSettings;
    window.ensureDataSync = ensureDataSync;

    console.log('🌐 전역 함수 설정 완료 (보조) - v9.5.0');
}

/**
 * 유틸리티 함수들
 */
function showComingSoonMessage(featureName) {
    alert(`${featureName} 기능은 곧 제공될 예정입니다.`);
}

function showDebugInfo() {
    console.group('🔍 dashboard.js 디버그 정보 - Option A 보조 모듈 v9.5.0');
    console.log('현재 학생 정보:', currentStudent);
    console.log('dashboard.js 준비 상태:', dashboardJsReady);
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
    console.log('ModuleStatusTracker 상태:', window.ModuleStatusTracker?.getDebugInfo());
    console.groupEnd();
    
    const debugInfo = `
        📋 dashboard.js 상태 (Option A 보조 모듈)
        
        버전: v9.5.0 🆕 활동일 작성 기능 추가
        학생명: ${currentStudent?.name || 'N/A'}
        ID: ${currentStudent?.id || 'N/A'}
        학당: ${currentStudent?.sejong_institute || 'N/A'}
        분야: ${currentStudent?.field || 'N/A'}
        준비 상태: ${dashboardJsReady ? '완료' : '미완료'}
        
        ✅ Option A 방식: dashboard.html 주도
        ✅ 보조 모듈로서 API 및 데이터 처리 담당
        ✅ 하드코딩 문제 완전 해결
        ✅ ModuleStatusTracker와 조화로운 통합
        🆕 활동일 작성 기능 (navigateToActivitySchedule)
    `;
    
    alert('디버그 정보 (자세한 내용은 콘솔 참조):' + debugInfo);
}

/**
 * 🔄 Option A: DOMContentLoaded 이벤트 - 보조적 초기화만 수행
 * 주도적 초기화는 dashboard.html의 ModuleStatusTracker가 담당
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 dashboard.js DOMContentLoaded - Option A 보조 초기화 v9.5.0');
    
    // 짧은 지연 후 보조 초기화 (dashboard.html이 먼저 실행되도록)
    setTimeout(() => {
        initializeDashboardHelper();
    }, 100);
});

/**
 * 페이지 언로드 시 정리
 */
window.addEventListener('beforeunload', function() {
    console.log('🔄 dashboard.js 페이지 언로드 - 정리 작업 v9.5.0');
    dashboardJsReady = false;
    currentStudent = null;
});

/**
 * 🆕 Option A: dashboard.html과의 연동을 위한 상태 확인 함수
 */
function getDashboardJsStatus() {
    return {
        ready: dashboardJsReady,
        currentStudent: currentStudent,
        version: 'v9.5.0',
        mode: 'Option A - 보조 모듈',
        newFeatures: ['활동일 작성 (navigateToActivitySchedule)', 'Ctrl + 6 단축키']
    };
}

// 전역으로 노출 (dashboard.html에서 상태 확인 가능)
window.getDashboardJsStatus = getDashboardJsStatus;
window.dashboardJsHandleLogout = handleLogout;
window.showDashboardJsDebug = showDebugInfo;

console.log('✅ Dashboard.js v9.5.0 로딩 완료 - Option A 보조 모듈 (활동일 작성 기능 추가)');
