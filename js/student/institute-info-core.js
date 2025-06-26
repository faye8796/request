/**
 * 학생용 학당 정보 핵심 로직 모듈
 * Version: 4.6.4
 * Description: 데이터 관리, 비즈니스 로직, 상태 관리 담당
 */

window.InstituteInfoCore = (function() {
    'use strict';
    
    // 모듈 상태
    let isInitialized = false;
    let currentInstituteData = null;
    let currentTab = 'info';
    
    // 이벤트 리스너 관리
    const eventListeners = new Map();
    
    /**
     * 모듈 초기화
     */
    async function initialize() {
        try {
            console.log('🧠 InstituteInfoCore 초기화 시작');
            
            // 의존성 모듈 확인
            if (!window.InstituteInfoAPI) {
                throw new Error('InstituteInfoAPI 모듈이 필요합니다');
            }
            
            if (!window.InstituteInfoUI) {
                throw new Error('InstituteInfoUI 모듈이 필요합니다');
            }
            
            // API 모듈 초기화
            await window.InstituteInfoAPI.initialize();
            
            // UI 모듈 초기화
            await window.InstituteInfoUI.initialize();
            
            // 이벤트 리스너 설정
            setupEventListeners();
            
            // 학당 정보 로드
            await loadInstituteData();
            
            isInitialized = true;
            console.log('✅ InstituteInfoCore 초기화 완료');
            
        } catch (error) {
            console.error('❌ InstituteInfoCore 초기화 실패:', error);
            
            // UI에 에러 표시
            if (window.InstituteInfoUI && window.InstituteInfoUI.showError) {
                window.InstituteInfoUI.showError(error.message);
            }
            
            throw error;
        }
    }
    
    /**
     * 이벤트 리스너 설정
     */
    function setupEventListeners() {
        try {
            console.log('🎯 이벤트 리스너 설정 중...');
            
            // 탭 전환 이벤트
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                const handler = (e) => handleTabSwitch(e);
                button.addEventListener('click', handler);
                
                // 리스너 추적을 위해 저장
                eventListeners.set(button, { event: 'click', handler });
            });
            
            // URL 해시 변경 이벤트
            const hashChangeHandler = () => handleHashChange();
            window.addEventListener('hashchange', hashChangeHandler);
            eventListeners.set('hashchange', { event: 'hashchange', handler: hashChangeHandler });
            
            // 초기 해시 처리
            handleHashChange();
            
            console.log('✅ 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ 이벤트 리스너 설정 실패:', error);
        }
    }
    
    /**
     * 학당 데이터 로드
     */
    async function loadInstituteData() {
        try {
            console.log('📚 학당 데이터 로드 시작');
            
            // 로딩 상태 표시
            window.InstituteInfoUI.showLoading();
            
            // API를 통해 학당 정보 조회
            const rawData = await window.InstituteInfoAPI.getCurrentUserInstitute();
            
            // 데이터 전처리
            currentInstituteData = window.InstituteInfoAPI.processInstituteData(rawData);
            
            console.log('✅ 학당 데이터 로드 완료:', currentInstituteData.display_name);
            
            // UI 업데이트
            await updateUI();
            
        } catch (error) {
            console.error('❌ 학당 데이터 로드 실패:', error);
            
            const processedError = window.InstituteInfoAPI.handleError(error, '학당 정보 로드');
            window.InstituteInfoUI.showError(processedError.message);
        }
    }
    
    /**
     * UI 업데이트
     */
    async function updateUI() {
        try {
            if (!currentInstituteData) {
                throw new Error('표시할 학당 데이터가 없습니다');
            }
            
            console.log('🎨 UI 업데이트 시작');
            
            // 기본 정보 표시
            window.InstituteInfoUI.showInstituteHeader(currentInstituteData);
            window.InstituteInfoUI.showInstituteImage(currentInstituteData);
            
            // 학당 정보 탭 표시
            displayInstituteInfo();
            
            // 안전정보 탭 표시
            await displaySafetyInfo();
            
            // 메인 콘텐츠 표시
            window.InstituteInfoUI.showMainContent();
            
            console.log('✅ UI 업데이트 완료');
            
        } catch (error) {
            console.error('❌ UI 업데이트 실패:', error);
            window.InstituteInfoUI.showError('화면 표시 중 오류가 발생했습니다');
        }
    }
    
    /**
     * 학당 정보 표시
     */
    function displayInstituteInfo() {
        try {
            console.log('📋 학당 정보 표시 중...');
            
            // 기본 정보 구성
            const basicInfo = [
                {
                    icon: 'building-2',
                    label: '학당명 (한국어)',
                    value: currentInstituteData.name_ko
                },
                {
                    icon: 'globe',
                    label: '학당명 (영어)',
                    value: currentInstituteData.name_en
                },
                {
                    icon: 'briefcase',
                    label: '운영기관',
                    value: currentInstituteData.operator
                },
                {
                    icon: 'map-pin',
                    label: '주소',
                    value: currentInstituteData.address
                },
                {
                    icon: 'phone',
                    label: '연락처',
                    value: currentInstituteData.phone
                },
                {
                    icon: 'link',
                    label: 'SNS 정보',
                    value: currentInstituteData.sns_url,
                    isLink: true
                },
                {
                    icon: 'user',
                    label: '담당자 정보',
                    value: currentInstituteData.contact_person
                },
                {
                    icon: 'phone-call',
                    label: '담당자 연락처',
                    value: currentInstituteData.contact_phone
                },
                {
                    icon: 'user-check',
                    label: '현지 적응 지원 전담인력 정보',
                    value: currentInstituteData.local_coordinator
                },
                {
                    icon: 'smartphone',
                    label: '현지 전담인력 연락처',
                    value: currentInstituteData.local_coordinator_phone
                }
            ];
            
            // 활동 정보 구성
            const activityInfo = [
                {
                    icon: 'calendar',
                    label: '파견 희망 기간',
                    value: currentInstituteData.dispatch_period
                },
                {
                    icon: 'book-open',
                    label: '문화수업 운영 계획',
                    value: currentInstituteData.lesson_plan
                },
                {
                    icon: 'target',
                    label: '희망 개설 강좌',
                    value: currentInstituteData.desired_courses
                },
                {
                    icon: 'school',
                    label: '교육 환경 정보',
                    value: formatEducationEnvironment(currentInstituteData.education_environment),
                    isJsonList: true
                }
            ];
            
            // 기타 사항 구성
            const additionalInfo = [
                {
                    icon: 'languages',
                    label: '현지 언어 구사 필요 수준',
                    value: currentInstituteData.local_language_requirement
                },
                {
                    icon: 'heart-handshake',
                    label: '학당 지원 사항',
                    value: currentInstituteData.support_provided
                }
            ];
            
            // UI에 정보 표시
            window.InstituteInfoUI.renderInfoSection('basicInfoGrid', basicInfo);
            window.InstituteInfoUI.renderInfoSection('activityInfoGrid', activityInfo);
            window.InstituteInfoUI.renderInfoSection('additionalInfoGrid', additionalInfo);
            
            console.log('✅ 학당 정보 표시 완료');
            
        } catch (error) {
            console.error('❌ 학당 정보 표시 실패:', error);
        }
    }
    
    /**
     * 안전정보 표시
     */
    async function displaySafetyInfo() {
        try {
            console.log('🛡️ 안전정보 표시 중...');
            
            const safetyUrl = currentInstituteData.safety_info_url;
            
            if (!safetyUrl) {
                window.InstituteInfoUI.showSafetyUnavailable();
                return;
            }
            
            // URL 유효성 검사
            const isValidUrl = await window.InstituteInfoAPI.validateSafetyInfoUrl(safetyUrl);
            
            if (!isValidUrl) {
                window.InstituteInfoUI.showSafetyError('유효하지 않은 안전정보 URL입니다');
                return;
            }
            
            // iframe으로 안전정보 로드
            window.InstituteInfoUI.showSafetyIframe(safetyUrl);
            
            console.log('✅ 안전정보 표시 완료');
            
        } catch (error) {
            console.error('❌ 안전정보 표시 실패:', error);
            window.InstituteInfoUI.showSafetyError('안전정보를 불러올 수 없습니다');
        }
    }
    
    /**
     * 교육 환경 정보 포맷팅
     */
    function formatEducationEnvironment(environment) {
        try {
            if (!environment || environment.length === 0) {
                return '교육 환경 정보가 없습니다';
            }
            
            // JSON 배열인 경우 리스트로 표시
            if (Array.isArray(environment)) {
                return environment.map(item => {
                    if (typeof item === 'string') {
                        return item;
                    } else if (typeof item === 'object') {
                        return Object.entries(item)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ');
                    }
                    return String(item);
                });
            }
            
            return [String(environment)];
            
        } catch (error) {
            console.warn('⚠️ 교육 환경 정보 포맷팅 실패:', error);
            return ['교육 환경 정보 처리 중 오류가 발생했습니다'];
        }
    }
    
    /**
     * 탭 전환 처리
     */
    function handleTabSwitch(event) {
        try {
            const tabName = event.currentTarget.dataset.tab;
            
            if (!tabName || tabName === currentTab) {
                return;
            }
            
            console.log(`🔄 탭 전환: ${currentTab} → ${tabName}`);
            
            // 탭 상태 업데이트
            currentTab = tabName;
            
            // UI 업데이트
            window.InstituteInfoUI.switchTab(tabName);
            
            // URL 해시 업데이트
            window.location.hash = tabName;
            
            console.log(`✅ 탭 전환 완료: ${tabName}`);
            
        } catch (error) {
            console.error('❌ 탭 전환 실패:', error);
        }
    }
    
    /**
     * URL 해시 변경 처리
     */
    function handleHashChange() {
        try {
            const hash = window.location.hash.substring(1);
            const validTabs = ['info', 'safety'];
            
            if (hash && validTabs.includes(hash) && hash !== currentTab) {
                console.log(`🔗 URL 해시로 탭 전환: ${hash}`);
                
                currentTab = hash;
                window.InstituteInfoUI.switchTab(hash);
            }
            
        } catch (error) {
            console.error('❌ 해시 변경 처리 실패:', error);
        }
    }
    
    /**
     * 모듈 정리
     */
    function cleanup() {
        try {
            console.log('🧹 InstituteInfoCore 정리 중...');
            
            // 이벤트 리스너 제거
            eventListeners.forEach((listenerInfo, element) => {
                if (typeof element === 'string') {
                    // window 이벤트인 경우
                    window.removeEventListener(listenerInfo.event, listenerInfo.handler);
                } else {
                    // DOM 요소 이벤트인 경우
                    element.removeEventListener(listenerInfo.event, listenerInfo.handler);
                }
            });
            
            eventListeners.clear();
            
            // 상태 초기화
            currentInstituteData = null;
            currentTab = 'info';
            isInitialized = false;
            
            console.log('✅ InstituteInfoCore 정리 완료');
            
        } catch (error) {
            console.error('❌ InstituteInfoCore 정리 실패:', error);
        }
    }
    
    /**
     * 모듈 정보 가져오기
     */
    function getModuleInfo() {
        return {
            name: 'InstituteInfoCore',
            version: '4.6.4',
            initialized: isInitialized,
            currentTab,
            hasData: !!currentInstituteData,
            eventListenersCount: eventListeners.size,
            description: '학당 정보 핵심 로직 및 상태 관리 모듈'
        };
    }
    
    // 공개 API
    return {
        // 초기화
        initialize,
        cleanup,
        
        // 데이터 관리
        loadInstituteData,
        updateUI,
        
        // 탭 관리
        handleTabSwitch,
        handleHashChange,
        
        // 유틸리티
        getModuleInfo,
        
        // 상태 접근
        get isInitialized() { return isInitialized; },
        get currentData() { return currentInstituteData; },
        get currentTab() { return currentTab; }
    };
})();

// 모듈 로드 완료 로그
console.log('🧠 InstituteInfoCore 모듈 로드 완료 - v4.6.4');