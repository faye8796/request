/**
 * 파견 학당 정보 관리 JavaScript
 * Institute Information Management
 */

// 전역 변수
let currentInstitute = null;
let currentPrograms = [];

/**
 * 학당 정보 로드
 */
async function loadInstituteInfo() {
    try {
        console.log('학당 정보 로드 시작...');
        
        // 현재는 모든 학당 정보를 가져와서 첫 번째 것을 표시
        // 추후 학생별 배정 학당 로직으로 수정 가능
        const { data: institutes, error: instituteError } = await supabase
            .from('institutes')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);

        if (instituteError) {
            throw instituteError;
        }

        if (!institutes || institutes.length === 0) {
            console.log('등록된 학당 정보가 없습니다.');
            showEmptyState();
            return;
        }

        currentInstitute = institutes[0];
        console.log('학당 정보 로드 완료:', currentInstitute);

        // 해당 학당의 문화 프로그램 로드
        const { data: programs, error: programError } = await supabase
            .from('cultural_programs')
            .select('*')
            .eq('institute_id', currentInstitute.id)
            .order('program_name');

        if (programError) {
            console.warn('문화 프로그램 로드 오류:', programError);
            currentPrograms = [];
        } else {
            currentPrograms = programs || [];
            console.log('문화 프로그램 로드 완료:', currentPrograms);
        }

        // UI에 정보 표시
        showInstituteInfo(currentInstitute, currentPrograms);

    } catch (error) {
        console.error('학당 정보 로드 오류:', error);
        showError('학당 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 특정 학당 정보 로드 (학생별 배정 학당)
 * @param {string} studentId - 학생 ID (추후 구현용)
 */
async function loadStudentInstituteInfo(studentId) {
    try {
        // TODO: 학생별 배정 학당 정보 로드 로직 구현
        // 현재는 loadInstituteInfo()를 호출
        await loadInstituteInfo();
    } catch (error) {
        console.error('학생 배정 학당 정보 로드 오류:', error);
        showError('배정된 학당 정보를 찾을 수 없습니다.');
    }
}

/**
 * 학당 정보 새로고침
 */
async function refreshInstituteInfo() {
    try {
        // 로딩 상태 표시
        document.getElementById('loadingSpinner').style.display = 'flex';
        document.getElementById('instituteCard').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';

        // 정보 다시 로드
        await loadInstituteInfo();

    } catch (error) {
        console.error('정보 새로고침 오류:', error);
        showError('정보 새로고침 중 오류가 발생했습니다.');
    }
}

/**
 * 연락처 정보 복사
 * @param {string} type - 복사할 정보 타입 ('phone', 'email', 'address')
 */
function copyContactInfo(type) {
    if (!currentInstitute) return;

    let textToCopy = '';
    let message = '';

    switch (type) {
        case 'phone':
            textToCopy = currentInstitute.phone;
            message = '전화번호가 복사되었습니다.';
            break;
        case 'email':
            textToCopy = currentInstitute.contact_email;
            message = '이메일 주소가 복사되었습니다.';
            break;
        case 'address':
            textToCopy = currentInstitute.address;
            message = '주소가 복사되었습니다.';
            break;
        default:
            return;
    }

    if (!textToCopy) {
        alert('복사할 정보가 없습니다.');
        return;
    }

    // 클립보드에 복사
    navigator.clipboard.writeText(textToCopy).then(() => {
        // 사용자에게 알림
        showNotification(message, 'success');
    }).catch(err => {
        console.error('복사 실패:', err);
        // 대체 방법 시도
        fallbackCopyTextToClipboard(textToCopy, message);
    });
}

/**
 * 클립보드 복사 대체 방법
 * @param {string} text - 복사할 텍스트
 * @param {string} message - 성공 메시지
 */
function fallbackCopyTextToClipboard(text, message) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 화면에서 숨김
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification(message, 'success');
        } else {
            showNotification('복사에 실패했습니다.', 'error');
        }
    } catch (err) {
        console.error('Fallback 복사 실패:', err);
        showNotification('복사에 실패했습니다.', 'error');
    }
    
    document.body.removeChild(textArea);
}

/**
 * 알림 메시지 표시
 * @param {string} message - 메시지
 * @param {string} type - 타입 ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.getElementById('notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 알림 요소 생성
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 600;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    // 타입별 색상 설정
    switch (type) {
        case 'success':
            notification.style.background = '#48bb78';
            break;
        case 'error':
            notification.style.background = '#f56565';
            break;
        default:
            notification.style.background = '#4299e1';
    }

    notification.textContent = message;

    // 스타일 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    
    if (!document.getElementById('notification-styles')) {
        style.id = 'notification-styles';
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // 3초 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

/**
 * 학당 지도 보기 (구글 맵스 연동)
 */
function viewInstituteOnMap() {
    if (!currentInstitute || !currentInstitute.address) {
        alert('주소 정보가 없습니다.');
        return;
    }

    const encodedAddress = encodeURIComponent(currentInstitute.address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    
    window.open(mapUrl, '_blank');
}

/**
 * SNS 페이지 열기
 */
function openSocialMedia() {
    if (!currentInstitute || !currentInstitute.sns_url) {
        alert('SNS 정보가 없습니다.');
        return;
    }

    window.open(currentInstitute.sns_url, '_blank');
}

/**
 * 이메일 작성
 */
function composeEmail() {
    if (!currentInstitute || !currentInstitute.contact_email) {
        alert('이메일 정보가 없습니다.');
        return;
    }

    const subject = encodeURIComponent('세종학당 문화인턴 관련 문의');
    const body = encodeURIComponent(`안녕하세요.\n\n세종학당 문화인턴과 관련하여 문의드립니다.\n\n감사합니다.`);
    
    window.location.href = `mailto:${currentInstitute.contact_email}?subject=${subject}&body=${body}`;
}

/**
 * 전화 걸기 (모바일에서)
 */
function makePhoneCall() {
    if (!currentInstitute || !currentInstitute.phone) {
        alert('전화번호 정보가 없습니다.');
        return;
    }

    // 전화번호에서 특수문자 제거
    const cleanPhone = currentInstitute.phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
}

/**
 * 인쇄하기
 */
function printInstituteInfo() {
    // 인쇄용 스타일 적용
    const printContent = document.getElementById('instituteCard').outerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>파견 학당 정보 - ${currentInstitute?.name_ko || '세종학당'}</title>
            <style>
                body { font-family: 'Malgun Gothic', sans-serif; margin: 20px; color: #333; }
                .institute-card { max-width: 800px; margin: 0 auto; }
                .card-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
                .institute-name-ko { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .institute-name-en { font-size: 16px; color: #666; margin-bottom: 10px; }
                .institute-location { font-size: 14px; color: #888; }
                .info-section { margin-bottom: 25px; }
                .info-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                .info-item { border: 1px solid #eee; padding: 10px; border-radius: 5px; }
                .info-label { font-weight: bold; color: #555; margin-bottom: 5px; }
                .info-value { color: #333; }
                .programs-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
                .program-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                .program-name { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
                .program-details { list-style: none; padding: 0; margin: 0; }
                .program-details li { margin-bottom: 5px; }
                @media print {
                    body { margin: 0; }
                    .info-grid { grid-template-columns: 1fr; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <script>window.print(); window.close();</script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

/**
 * 데이터 내보내기 (JSON)
 */
function exportInstituteData() {
    if (!currentInstitute) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }

    const exportData = {
        institute: currentInstitute,
        programs: currentPrograms,
        exportDate: new Date().toISOString(),
        exportedBy: 'Cultural Intern Support System'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `institute-info-${currentInstitute.name_ko}-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('데이터가 다운로드되었습니다.', 'success');
}

/**
 * 페이지 언로드 시 정리 작업
 */
window.addEventListener('beforeunload', function() {
    // 필요한 정리 작업 수행
    currentInstitute = null;
    currentPrograms = [];
});

/**
 * 키보드 단축키 처리
 */
document.addEventListener('keydown', function(e) {
    // Ctrl+R: 새로고침
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshInstituteInfo();
    }
    
    // Ctrl+P: 인쇄
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        printInstituteInfo();
    }
    
    // Ctrl+S: 데이터 내보내기
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        exportInstituteData();
    }
    
    // Escape: 대시보드로 돌아가기
    if (e.key === 'Escape') {
        window.location.href = 'dashboard.html';
    }
});

// 유틸리티 함수들
const InstituteInfoUtils = {
    /**
     * 날짜 포맷팅
     * @param {string|Date} date - 날짜
     * @returns {string} 포맷된 날짜
     */
    formatDate: function(date) {
        if (!date) return '-';
        
        try {
            const d = new Date(date);
            return d.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('날짜 포맷팅 오류:', error);
            return '-';
        }
    },

    /**
     * 전화번호 포맷팅
     * @param {string} phone - 전화번호
     * @returns {string} 포맷된 전화번호
     */
    formatPhone: function(phone) {
        if (!phone) return '-';
        return phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
    },

    /**
     * 텍스트 길이 제한
     * @param {string} text - 텍스트
     * @param {number} maxLength - 최대 길이
     * @returns {string} 제한된 텍스트
     */
    truncateText: function(text, maxLength = 100) {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * 안전한 HTML 이스케이프
     * @param {string} text - 텍스트
     * @returns {string} 이스케이프된 텍스트
     */
    escapeHtml: function(text) {
        if (!text) return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
};