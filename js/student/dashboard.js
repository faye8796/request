/**
 * 학생 대시보드 JavaScript
 * 세종학당 문화인턴 지원 시스템
 * 
 * 주요 기능:
 * - 학생 정보 표시
 * - 메뉴 카드 인터랙션
 * - 페이지 네비게이션
 * - 세션 관리
 */

// 전역 변수
let currentStudent = null;

/**
 * 대시보드 초기화
 */
function initializeDashboard() {
    console.log('대시보드 초기화 시작');
    
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
        
        console.log('대시보드 초기화 완료');
        
    } catch (error) {
        console.error('대시보드 초기화 오류:', error);
        showErrorMessage('대시보드를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 학생 인증 상태 확인
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
        currentStudent = JSON.parse(studentData);
        console.log('인증된 학생:', currentStudent.name);
        return true;
    } catch (error) {
        console.error('학생 데이터 파싱 오류:', error);
        localStorage.removeItem('currentStudent');
        alert('세션 데이터가 손상되었습니다. 다시 로그인해주세요.');
        window.location.href = '../index.html';
        return false;
    }
}

/**
 * 학생 정보 표시
 */
function loadStudentInformation() {
    if (!currentStudent) return;
    
    try {
        // 학생 이름 표시
        const studentNameElement = document.getElementById('studentName');
        if (studentNameElement) {
            studentNameElement.textContent = `${currentStudent.name}님, 안녕하세요!`;
        }
        
        // 학생 상세 정보 표시
        const studentDetailsElement = document.getElementById('studentDetails');
        if (studentDetailsElement) {
            const institute = currentStudent.institute || '세종학당';
            const field = currentStudent.field || '문화 분야';
            studentDetailsElement.textContent = `${institute} • ${field}`;
        }
        
        console.log('학생 정보 표시 완료');
        
    } catch (error) {
        console.error('학생 정보 표시 오류:', error);
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
    
    console.log('이벤트 리스너 설정 완료');
}

/**
 * 메뉴 카드 상태 업데이트
 */
function updateMenuCardStates() {
    // 파견 학당 정보 카드
    const instituteCard = document.getElementById('instituteInfoCard');
    if (instituteCard) {
        // 학당 정보가 있으면 활성화, 없으면 준비 중으로 표시
        const hasInstituteInfo = currentStudent && currentStudent.institute;
        if (!hasInstituteInfo) {
            // instituteCard.classList.add('coming-soon');
            // instituteCard.classList.remove('available');
        }
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
    
    console.log('메뉴 카드 상태 업데이트 완료');
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
 * 로그아웃 처리
 */
function handleLogout() {
    if (confirm('로그아웃하시겠습니까?')) {
        try {
            // 세션 정보 삭제
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
            
            console.log('로그아웃 완료');
            
            // 로그인 페이지로 이동
            window.location.href = '../index.html';
            
        } catch (error) {
            console.error('로그아웃 오류:', error);
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
        console.log('파견 학당 정보 페이지로 이동');
        window.location.href = 'institute-info.html';
    } catch (error) {
        console.error('페이지 이동 오류:', error);
        showErrorMessage('페이지 이동 중 오류가 발생했습니다.');
    }
}

function navigateToFlightRequest() {
    console.log('항공권 신청 (준비 중)');
    showInfoMessage('항공권 구매 신청 기능은 곧 제공될 예정입니다.');
    // 추후 구현: window.location.href = 'flight-request.html';
}

function navigateToEquipmentRequest() {
    try {
        console.log('문화교구 신청 페이지로 이동');
        window.location.href = 'equipment-request.html';
    } catch (error) {
        console.error('페이지 이동 오류:', error);
        showErrorMessage('페이지 이동 중 오류가 발생했습니다.');
    }
}

/**
 * 디버그 정보 표시
 */
function showDebugInfo() {
    console.group('🔍 대시보드 디버그 정보');
    console.log('현재 학생 정보:', currentStudent);
    console.log('세션 스토리지:', {
        currentStudent: localStorage.getItem('currentStudent'),
        studentSession: localStorage.getItem('studentSession')
    });
    console.log('페이지 상태:', {
        URL: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
    });
    console.groupEnd();
    
    // 화면에도 표시
    const debugInfo = `
        학생명: ${currentStudent?.name || 'N/A'}
        학당: ${currentStudent?.institute || 'N/A'}
        분야: ${currentStudent?.field || 'N/A'}
        로그인 시간: ${currentStudent?.loginTime || 'N/A'}
    `;
    
    alert('디버그 정보 (자세한 내용은 콘솔 참조):\n' + debugInfo);
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
    console.log('대시보드 페이지 로드 완료');
    
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
