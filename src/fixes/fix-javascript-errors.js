/**
 * JavaScript 오류 및 안전성 개선
 * 
 * @problem 로그인 페이지에서 JavaScript 오류 발생
 * @solution 안전한 함수 호출, 오류 처리 강화, undefined 체크 추가
 * @affects 전체 애플리케이션의 JavaScript 안정성
 * @author Claude AI
 * @date 2025-06-17
 */

(function() {
    'use strict';
    
    console.log('🔧 JavaScript 오류 수정 및 안전성 개선 시작...');

    // 전역 오류 처리기 추가
    window.addEventListener('error', function(event) {
        console.error('🚨 JavaScript 오류 감지:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        // 사용자에게 친화적인 오류 메시지 표시 (개발 모드에서만)
        if (window.CONFIG?.DEV?.DEBUG) {
            console.warn('개발 모드: JavaScript 오류가 발생했습니다.');
        }
    });

    // Promise 거부 처리기 추가
    window.addEventListener('unhandledrejection', function(event) {
        console.error('🚨 처리되지 않은 Promise 거부:', event.reason);
        
        // Promise 거부를 처리된 것으로 표시
        event.preventDefault();
    });

    // 안전한 함수 호출 유틸리티
    window.safeCall = function(fn, ...args) {
        try {
            if (typeof fn === 'function') {
                return fn.apply(this, args);
            } else {
                console.warn('⚠️ safeCall: 함수가 아닌 값이 전달됨:', fn);
                return null;
            }
        } catch (error) {
            console.error('❌ safeCall 오류:', error);
            return null;
        }
    };

    // 안전한 DOM 요소 선택 유틸리티
    window.safeQuery = function(selector, parent = document) {
        try {
            const element = parent.querySelector(selector);
            if (!element) {
                console.warn(`⚠️ 요소를 찾을 수 없음: ${selector}`);
            }
            return element;
        } catch (error) {
            console.error(`❌ DOM 선택 오류: ${selector}`, error);
            return null;
        }
    };

    // 안전한 이벤트 리스너 추가 유틸리티
    window.safeAddEventListener = function(element, event, handler, options = {}) {
        try {
            if (!element) {
                console.warn('⚠️ 이벤트 리스너 추가 실패: 요소가 null입니다');
                return false;
            }
            
            if (typeof handler !== 'function') {
                console.warn('⚠️ 이벤트 리스너 추가 실패: 핸들러가 함수가 아닙니다');
                return false;
            }
            
            element.addEventListener(event, handler, options);
            return true;
        } catch (error) {
            console.error('❌ 이벤트 리스너 추가 오류:', error);
            return false;
        }
    };

    // Lucide 아이콘 안전 초기화
    window.safeLucideInit = function() {
        try {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
                console.log('✅ Lucide 아이콘 초기화 성공');
                return true;
            } else {
                console.warn('⚠️ Lucide가 로드되지 않음');
                return false;
            }
        } catch (error) {
            console.error('❌ Lucide 초기화 오류:', error);
            return false;
        }
    };

    // 지연된 Lucide 초기화 (여러 번 시도)
    let lucideInitAttempts = 0;
    const maxLucideAttempts = 10;
    
    function tryLucideInit() {
        if (window.safeLucideInit()) {
            return; // 성공하면 종료
        }
        
        lucideInitAttempts++;
        if (lucideInitAttempts < maxLucideAttempts) {
            setTimeout(tryLucideInit, 200 * lucideInitAttempts); // 점진적 지연
        } else {
            console.warn('⚠️ Lucide 초기화 최대 시도 횟수 초과');
        }
    }
    
    // DOM 로드 후 Lucide 초기화 시도
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryLucideInit);
    } else {
        tryLucideInit();
    }

    // 안전한 컴포넌트 로드 체크
    window.checkComponentLoad = function() {
        const components = {
            'CONFIG': typeof window.CONFIG !== 'undefined',
            'Utils': typeof window.Utils !== 'undefined',
            'SupabaseAPI': typeof window.SupabaseAPI !== 'undefined',
            'AuthManager': typeof window.AuthManager !== 'undefined',
            'StudentManager': typeof window.StudentManager !== 'undefined',
            'AdminManager': typeof window.AdminManager !== 'undefined',
            'App': typeof window.App !== 'undefined'
        };
        
        const loaded = Object.entries(components).filter(([name, status]) => status);
        const missing = Object.entries(components).filter(([name, status]) => !status);
        
        console.log('✅ 로드된 컴포넌트:', loaded.map(([name]) => name));
        
        if (missing.length > 0) {
            console.warn('⚠️ 누락된 컴포넌트:', missing.map(([name]) => name));
        }
        
        return {
            loaded: loaded.length,
            total: Object.keys(components).length,
            missing: missing.map(([name]) => name),
            allLoaded: missing.length === 0
        };
    };

    // 시스템 상태 확인 함수 개선
    window.checkSystemHealth = async function() {
        try {
            const componentStatus = window.checkComponentLoad();
            
            // Supabase 연결 확인
            let supabaseStatus = false;
            if (window.SupabaseAPI && window.SupabaseAPI.supabase) {
                try {
                    const { data, error } = await window.SupabaseAPI.supabase
                        .from('system_settings')
                        .select('id')
                        .limit(1);
                    
                    supabaseStatus = !error;
                } catch (e) {
                    console.warn('⚠️ Supabase 연결 테스트 실패:', e);
                }
            }
            
            const health = {
                status: componentStatus.allLoaded && supabaseStatus ? 'healthy' : 'warning',
                components: componentStatus,
                database: supabaseStatus,
                timestamp: new Date().toISOString()
            };
            
            console.log('🏥 시스템 상태:', health);
            return health;
            
        } catch (error) {
            console.error('❌ 시스템 상태 확인 오류:', error);
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    };

    // 로그인 폼 안전성 개선
    function improveLoginFormSafety() {
        try {
            // 학생 로그인 버튼
            const studentLoginBtn = window.safeQuery('#studentLoginBtn');
            if (studentLoginBtn) {
                // 기존 이벤트 리스너 제거 방지를 위한 클론
                const newStudentBtn = studentLoginBtn.cloneNode(true);
                studentLoginBtn.parentNode.replaceChild(newStudentBtn, studentLoginBtn);
                
                window.safeAddEventListener(newStudentBtn, 'click', async function(e) {
                    e.preventDefault();
                    
                    try {
                        const nameInput = window.safeQuery('#studentName');
                        const birthInput = window.safeQuery('#studentBirth');
                        
                        if (!nameInput || !birthInput) {
                            console.error('❌ 필수 입력 요소를 찾을 수 없음');
                            return;
                        }
                        
                        const name = nameInput.value?.trim();
                        const birthDate = birthInput.value;
                        
                        if (!name || !birthDate) {
                            alert('이름과 생년월일을 모두 입력해주세요.');
                            return;
                        }
                        
                        // 버튼 로딩 상태 설정
                        newStudentBtn.disabled = true;
                        newStudentBtn.classList.add('loading');
                        
                        // AuthManager가 로드되었는지 확인
                        if (window.AuthManager && window.AuthManager.handleStudentLogin) {
                            await window.AuthManager.handleStudentLogin(name, birthDate);
                        } else {
                            console.error('❌ AuthManager가 로드되지 않음');
                            alert('시스템 오류가 발생했습니다. 페이지를 새로고침해주세요.');
                        }
                        
                    } catch (error) {
                        console.error('❌ 학생 로그인 오류:', error);
                        alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
                    } finally {
                        // 로딩 상태 해제
                        newStudentBtn.disabled = false;
                        newStudentBtn.classList.remove('loading');
                    }
                });
            }
            
            // 관리자 로그인 버튼
            const adminLoginBtn = window.safeQuery('#adminLoginBtn');
            if (adminLoginBtn) {
                const newAdminBtn = adminLoginBtn.cloneNode(true);
                adminLoginBtn.parentNode.replaceChild(newAdminBtn, adminLoginBtn);
                
                window.safeAddEventListener(newAdminBtn, 'click', async function(e) {
                    e.preventDefault();
                    
                    try {
                        const codeInput = window.safeQuery('#adminCode');
                        
                        if (!codeInput) {
                            console.error('❌ 관리자 코드 입력 요소를 찾을 수 없음');
                            return;
                        }
                        
                        const adminCode = codeInput.value?.trim();
                        
                        if (!adminCode) {
                            alert('관리자 코드를 입력해주세요.');
                            return;
                        }
                        
                        // 버튼 로딩 상태 설정
                        newAdminBtn.disabled = true;
                        newAdminBtn.classList.add('loading');
                        
                        // AuthManager가 로드되었는지 확인
                        if (window.AuthManager && window.AuthManager.handleAdminLogin) {
                            await window.AuthManager.handleAdminLogin(adminCode);
                        } else {
                            console.error('❌ AuthManager가 로드되지 않음');
                            alert('시스템 오류가 발생했습니다. 페이지를 새로고침해주세요.');
                        }
                        
                    } catch (error) {
                        console.error('❌ 관리자 로그인 오류:', error);
                        alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
                    } finally {
                        // 로딩 상태 해제
                        newAdminBtn.disabled = false;
                        newAdminBtn.classList.remove('loading');
                    }
                });
            }
            
            console.log('✅ 로그인 폼 안전성 개선 완료');
            
        } catch (error) {
            console.error('❌ 로그인 폼 안전성 개선 오류:', error);
        }
    }

    // 탭 전환 안전성 개선
    function improveTabSafety() {
        try {
            const studentTab = window.safeQuery('#studentTab');
            const adminTab = window.safeQuery('#adminTab');
            const studentLogin = window.safeQuery('#studentLogin');
            const adminLogin = window.safeQuery('#adminLogin');
            
            if (studentTab && adminTab && studentLogin && adminLogin) {
                window.safeAddEventListener(studentTab, 'click', function() {
                    studentTab.classList.add('active');
                    adminTab.classList.remove('active');
                    studentLogin.classList.add('active');
                    adminLogin.classList.remove('active');
                });
                
                window.safeAddEventListener(adminTab, 'click', function() {
                    adminTab.classList.add('active');
                    studentTab.classList.remove('active');
                    adminLogin.classList.add('active');
                    studentLogin.classList.remove('active');
                });
                
                console.log('✅ 탭 전환 안전성 개선 완료');
            }
        } catch (error) {
            console.error('❌ 탭 전환 안전성 개선 오류:', error);
        }
    }

    // 초기화 함수
    function initSafetyImprovements() {
        try {
            // DOM이 준비되면 실행
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    setTimeout(() => {
                        improveLoginFormSafety();
                        improveTabSafety();
                    }, 100);
                });
            } else {
                setTimeout(() => {
                    improveLoginFormSafety();
                    improveTabSafety();
                }, 100);
            }
            
            console.log('✅ 안전성 개선 초기화 완료');
            
        } catch (error) {
            console.error('❌ 안전성 개선 초기화 오류:', error);
        }
    }

    // 시스템 초기화
    initSafetyImprovements();

    // 정기적인 시스템 상태 확인 (개발 모드에서만)
    if (window.CONFIG?.DEV?.DEBUG) {
        setInterval(async () => {
            const health = await window.checkSystemHealth();
            if (health.status === 'error') {
                console.warn('⚠️ 시스템 상태 이상 감지');
            }
        }, 30000); // 30초마다 확인
    }

    console.log('✅ JavaScript 오류 수정 및 안전성 개선 완료');
})();
