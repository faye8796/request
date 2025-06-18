/**
 * 학생 대시보드 JavaScript - 실제 DB 데이터 연동 최적화 버전
 * 
 * 주요 개선사항:
 * - 실제 DB 인증 데이터 우선 사용
 * - 불필요한 데이터 표준화 로직 제거
 * - equipment-request와 완벽한 데이터 동기화
 */

// 전역 변수
let currentStudent = null;

/**
 * 대시보드 초기화
 */
function initializeDashboard() {
    console.log('🎯 대시보드 초기화 시작 - 실제 DB 연동 버전');
    
    try {
        // 학생 인증 확인
        if (!checkAuthentication()) {
            return;
        }
        
        // 학생 정보 로드
        loadStudentInformation();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 메뉴 카드 상태 업데이트
        updateMenuCardStates();
        
        console.log('✅ 대시보드 초기화 완료');
        
    } catch (error) {
        console.error('❌ 대시보드 초기화 오류:', error);
        showErrorMessage('대시보드를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 학생 인증 상태 확인 및 데이터 검증
 */
function checkAuthentication() {
    const studentData = localStorage.getItem('currentStudent');
    
    if (!studentData) {
        console.warn('인증되지 않은 접근');
        alert('로그인이 필요합니다.');
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const student = JSON.parse(studentData);
        
        // 필수 필드 검증
        if (!student.id || !student.name || !student.sejong_institute || !student.field) {
            console.error('❌ 필수 데이터 누락:', student);
            throw new Error('사용자 데이터가 불완전합니다.');
        }
        
        // 실제 DB 데이터 그대로 사용 (표준화 불필요)
        currentStudent = student;
        
        // sessionStorage 동기화 (equipment-request.html 연동)
        updateSessionStorage(currentStudent);
        
        console.log('✅ 인증된 학생 (실제 DB 데이터):', {
            name: currentStudent.name,
            sejong_institute: currentStudent.sejong_institute,
            field: currentStudent.field,
            id: currentStudent.id
        });
        
        return true;
    } catch (error) {
        console.error('❌ 학생 데이터 검증 오류:', error);
        localStorage.removeItem('currentStudent');
        alert('세션 데이터에 문제가 있습니다. 다시 로그인해주세요.');
        window.location.href = '../index.html';
        return false;
    }
}

/**
 * sessionStorage 동기화
 * equipment-request.html에서 참조하는 세션 데이터 업데이트
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
        
        // 전역 변수도 동기화 (equipment-request.html에서 사용)
        if (typeof window !== 'undefined') {
            window.currentStudentData = studentData;
        }
        
        console.log('✅ sessionStorage 동기화 완료');
    } catch (error) {
        console.error('⚠️ sessionStorage 동기화 오류:', error);
    }
}

/**
 * 학생 정보 표시 (실제 DB 필드명 사용)
 */
function loadStudentInformation() {
    if (!currentStudent) return;
    
    try {
        // 학생 이름 표시
        const studentNameElement = document.getElementById('studentName');
        if (studentNameElement) {
            studentNameElement.textContent = `${currentStudent.name}님, 안녕하세요!`;
        }
        
        // 학생 상세 정보 표시 (실제 DB 필드명 사용)
        const studentDetailsElement = document.getElementById('studentDetails');
        if (studentDetailsElement) {
            studentDetailsElement.textContent = `${currentStudent.sejong_institute} • ${currentStudent.field}`;
        }
        
        console.log('✅ 학생 정보 표시 완료:', {
            name: currentStudent.name,
            institute: currentStudent.sejong_institute,
            field: currentStudent.field
        });
        
    } catch (error) {
        console.error('❌ 학생 정보 표시 오류:', error);
    }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 메뉴 카드 hover 효과
    const menuCards = document.querySelectorAll('.menu-card');
    menuCards.forEach(card => {
        card.addEventListener('mouseenter', handleCardHover);
        card.addEventListener('mouseleave', handleCardLeave);
    });
    
    // 로그아웃 버튼
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 키보드 단축키
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('✅ 이벤트 리스너 설정 완료');
}

/**
 * 메뉴 카드 상태 업데이트
 */
function updateMenuCardStates() {
    // 파견 학당 정보 카드
    const instituteCard = document.getElementById('instituteInfoCard');
    if (instituteCard) {
        instituteCard.classList.add('available');
        instituteCard.classList.remove('coming-soon');
    }
    
    // 항공권 신청 카드 (현재는 준비 중)
    const flightCard = document.getElementById('flightRequestCard');
    if (flightCard) {
        flightCard.classList.add('coming-soon');
        flightCard.classList.remove('available');
    }
    
    // 문화교구 신청 카드 (항상 사용 가능)
    const equipmentCard = document.getElementById('equipmentRequestCard');
    if (equipmentCard) {
        equipmentCard.classList.add('available');
        equipmentCard.classList.remove('coming-soon');
    }
    
    console.log('✅ 메뉴 카드 상태 업데이트 완료');
}

/**
 * 카드 hover 처리
 */
function handleCardHover(event) {
    const card = event.currentTarget;
    if (!card.classList.contains('coming-soon')) {
        card.style.transform = 'translateY(-8px)';
    }
}

/**
 * 카드 leave 처리
 */
function handleCardLeave(event) {
    const card = event.currentTarget;
    card.style.transform = 'translateY(-5px)';
}

/**
 * 로그아웃 처리 (완전한 데이터 정리)
 */
function handleLogout() {
    if (confirm('로그아웃하시겠습니까?')) {
        try {
            // 모든 세션 정보 삭제
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
            sessionStorage.removeItem('userSession');
            sessionStorage.removeItem('hasDataStructuralIssues');
            
            // 전역 변수도 정리
            currentStudent = null;
            if (typeof window !== 'undefined') {
                window.currentStudentData = null;
            }
            
            console.log('✅ 로그아웃 및 데이터 정리 완료');
            
            // 로그인 페이지로 이동
            window.location.href = '../index.html';
            
        } catch (error) {
            console.error('❌ 로그아웃 오류:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    }
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
    
    // ESC: 로그아웃 확인
    if (event.key === 'Escape') {
        event.preventDefault();
        handleLogout();
    }
}

/**
 * 페이지 네비게이션 함수들
 */
function navigateToInstituteInfo() {
    try {
        console.log('📍 파견 학당 정보 페이지로 이동');
        // 이동 전 데이터 동기화 재확인
        if (currentStudent) {
            updateSessionStorage(currentStudent);
        }
        window.location.href = 'institute-info.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류:', error);
        showErrorMessage('페이지 이동 중 오류가 발생했습니다.');
    }
}

function navigateToFlightRequest() {
    console.log('✈️ 항공권 신청 (준비 중)');
    showInfoMessage('항공권 구매 신청 기능은 곧 제공될 예정입니다.');
}

/**
 * 문화교구 신청 페이지로 이동 (데이터 동기화 강화)
 */
function navigateToEquipmentRequest() {
    try {
        console.log('📋 문화교구 신청 페이지로 이동');
        
        // 이동 전 데이터 동기화 재확인
        if (currentStudent) {
            // localStorage 업데이트
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
            
            // sessionStorage 동기화
            updateSessionStorage(currentStudent);
            
            console.log('✅ 페이지 이동 전 데이터 동기화 완료:', {
                localStorage_현재학생: currentStudent.name,
                sessionStorage_동기화: '완료'
            });
        }
        
        window.location.href = 'equipment-request.html';
    } catch (error) {
        console.error('❌ 페이지 이동 오류:', error);
        showErrorMessage('페이지 이동 중 오류가 발생했습니다.');
    }
}

/**
 * 디버그 정보 표시 (실제 DB 연동 버전)
 */
function showDebugInfo() {
    console.group('🔍 대시보드 디버그 정보 - 실제 DB 연동 버전');
    console.log('현재 학생 정보 (실제 DB):', currentStudent);
    console.log('localStorage 데이터:', {
        currentStudent: localStorage.getItem('currentStudent')
    });
    console.log('sessionStorage 데이터:', {
        userSession: sessionStorage.getItem('userSession')
    });
    console.log('페이지 상태:', {
        URL: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
    });
    
    if (currentStudent) {
        console.log('사용자 데이터 검증:', {
            필수필드체크: {
                id: !!currentStudent.id,
                name: !!currentStudent.name,
                sejong_institute: !!currentStudent.sejong_institute,
                field: !!currentStudent.field
            },
            실제값: {
                id: currentStudent.id,
                name: currentStudent.name,
                sejong_institute: currentStudent.sejong_institute,
                field: currentStudent.field
            }
        });
    }
    
    console.groupEnd();
    
    // 화면에도 표시
    const debugInfo = `
        📋 실제 DB 연동 버전
        
        학생명: ${currentStudent?.name || 'N/A'}
        ID: ${currentStudent?.id || 'N/A'}
        학당: ${currentStudent?.sejong_institute || 'N/A'}
        분야: ${currentStudent?.field || 'N/A'}
        생년월일: ${currentStudent?.birth_date || 'N/A'}
        로그인 시간: ${currentStudent?.loginTime || 'N/A'}
        
        ✅ 실제 DB 데이터 사용
        ✅ 세션 동기화 완료
        ✅ equipment-request 연동 준비 완료
    `;
    
    alert('디버그 정보 (자세한 내용은 콘솔 참조):' + debugInfo);
}

/**
 * 데이터 검증 함수 (추가)
 */
function validateStudentData(studentData) {
    const requiredFields = ['id', 'name', 'sejong_institute', 'field'];
    const missingFields = requiredFields.filter(field => !studentData[field]);
    
    if (missingFields.length > 0) {
        console.error('❌ 필수 필드 누락:', missingFields);
        return false;
    }
    
    console.log('✅ 학생 데이터 검증 통과');
    return true;
}

/**
 * 유틸리티 함수들
 */
function showErrorMessage(message) {
    console.error(message);
    alert('❌ ' + message);
}

function showInfoMessage(message) {
    console.info(message);
    alert('ℹ️ ' + message);
}

function showSuccessMessage(message) {
    console.log(message);
    alert('✅ ' + message);
}

/**
 * 페이지 로드 시 자동 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 대시보드 페이지 로드 완료 - 실제 DB 연동 버전');
    
    // 약간의 지연 후 초기화 (CSS 로딩 완료 대기)
    setTimeout(() => {
        initializeDashboard();
    }, 100);
});

/**
 * 페이지 언로드 시 정리
 */
window.addEventListener('beforeunload', function() {
    console.log('대시보드 페이지 언로드');
});

// 전역으로 노출할 함수들
window.navigateToInstituteInfo = navigateToInstituteInfo;
window.navigateToFlightRequest = navigateToFlightRequest;
window.navigateToEquipmentRequest = navigateToEquipmentRequest;
window.handleLogout = handleLogout;
window.showDebugInfo = showDebugInfo;
