// ⚠️ DEPRECATED: admin-addon.js
// 이 파일은 더 이상 사용되지 않습니다.
// 새로운 모듈 구조로 이전되었습니다: js/admin/admin-enhanced-ui.js

console.warn('⚠️ DEPRECATED: admin-addon.js가 로드되었습니다.');
console.warn('🔄 새로운 모듈을 사용해주세요: js/admin/admin-enhanced-ui.js');
console.warn('📚 마이그레이션 가이드: admin-addon.js의 모든 기능이 AdminEnhancedUI 모듈로 통합되었습니다.');

// 임시 호환성을 위한 알림
if (typeof window !== 'undefined') {
    // 개발자에게 알림
    window.ADMIN_ADDON_DEPRECATED = true;
    
    // 콘솔에 마이그레이션 안내
    setTimeout(() => {
        console.group('📦 admin-addon.js 마이그레이션 안내');
        console.log('✅ 새로운 모듈: js/admin/admin-enhanced-ui.js');
        console.log('🔧 기존 기능들이 모두 포함되어 있습니다:');
        console.log('  - 학생별 그룹화 렌더링');
        console.log('  - 배송지 정보 표시');
        console.log('  - 일괄 승인 기능');
        console.log('  - 향상된 검색 기능');
        console.log('⚡ 새로운 모듈은 충돌 없이 안전하게 작동합니다.');
        console.groupEnd();
    }, 1000);
}

// 기존 AdminAddon 객체가 참조되는 경우를 위한 프록시
if (typeof window !== 'undefined' && !window.AdminAddon) {
    window.AdminAddon = {
        init() {
            console.warn('⚠️ AdminAddon.init()가 호출되었지만 deprecated 상태입니다.');
            console.warn('🔄 AdminEnhancedUI.init()를 사용해주세요.');
            
            // AdminEnhancedUI가 있으면 해당 init 호출
            if (window.AdminEnhancedUI && typeof window.AdminEnhancedUI.init === 'function') {
                console.log('🔄 AdminEnhancedUI로 자동 리다이렉트합니다...');
                return window.AdminEnhancedUI.init();
            }
        },
        
        loadApplicationsWithShipping() {
            console.warn('⚠️ AdminAddon.loadApplicationsWithShipping()가 호출되었지만 deprecated 상태입니다.');
            
            if (window.AdminEnhancedUI && typeof window.AdminEnhancedUI.loadApplicationsWithShipping === 'function') {
                console.log('🔄 AdminEnhancedUI로 자동 리다이렉트합니다...');
                return window.AdminEnhancedUI.loadApplicationsWithShipping();
            }
        },
        
        renderGroupedApplications() {
            console.warn('⚠️ AdminAddon.renderGroupedApplications()가 호출되었지만 deprecated 상태입니다.');
            
            if (window.AdminEnhancedUI && typeof window.AdminEnhancedUI.renderGroupedApplications === 'function') {
                console.log('🔄 AdminEnhancedUI로 자동 리다이렉트합니다...');
                return window.AdminEnhancedUI.renderGroupedApplications(...arguments);
            }
        }
    };
}

// 파일 끝에 명확한 메시지
console.log('📄 admin-addon.js 로드 완료 (DEPRECATED)');
console.log('🎯 AdminEnhancedUI를 사용하시기 바랍니다.');
