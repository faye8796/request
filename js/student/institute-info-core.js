/**
 * 학생용 학당 정보 핵심 로직 모듈
 * Version: 4.6.9
 * Description: 문화인턴 활동 정보 및 교육 환경 정보 테이블 컬럼 개선
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
            console.log('🧠 InstituteInfoCore 초기화 시작 v4.6.9');
            
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
            console.log('✅ InstituteInfoCore 초기화 완료 v4.6.9');
            
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
            
            console.log('✅ 학당 데이터 로드 완료:', currentInstituteData.name_ko);
            console.log('🔍 로드된 데이터:', currentInstituteData);
            
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
            
            // 기본 정보 구성 (테이블 형태) - 수정된 필드 매핑
            const basicInfo = [
                {
                    icon: 'briefcase',
                    label: '운영기관',
                    value: currentInstituteData.operator || '정보 없음'
                },
                {
                    icon: 'map-pin',
                    label: '주소',
                    value: currentInstituteData.address || '정보 없음'
                },
                {
                    icon: 'phone',
                    label: '연락처',
                    value: currentInstituteData.phone || '정보 없음'
                },
                {
                    icon: 'link',
                    label: 'SNS 정보',
                    value: currentInstituteData.sns_url || '정보 없음',
                    isLink: currentInstituteData.sns_url ? true : false
                },
                {
                    icon: 'user',
                    label: '담당자 정보',
                    value: currentInstituteData.contact_person || '정보 없음'
                },
                {
                    icon: 'phone-call',
                    label: '담당자 연락처',
                    value: currentInstituteData.contact_phone || '정보 없음'
                },
                {
                    icon: 'user-check',
                    label: '현지 적응 지원 담당자',
                    value: currentInstituteData.local_coordinator || '정보 없음'
                },
                {
                    icon: 'phone-forwarded',
                    label: '적응 지원 담당자 연락처',
                    value: currentInstituteData.local_coordinator_phone || '정보 없음'
                }
            ];
            
            // 문화인턴 활동 정보 구성 - 수정된 컬럼 구조
            const activityInfo = [
                {
                    icon: 'calendar',
                    label: '파견 희망 기간',
                    value: currentInstituteData.dispatch_period || '정보 없음'
                },
                {
                    icon: 'book-open',
                    label: '문화수업 운영 계획',
                    value: currentInstituteData.lesson_plan || '정보 없음',
                    isLongText: true  // 긴 텍스트 표시용 플래그
                },
                {
                    icon: 'target',
                    label: '희망 개설 강좌',
                    value: currentInstituteData.desired_courses,
                    isJsonData: true,
                    jsonType: 'cultural-activity-table'  // 새로운 테이블 타입
                }
            ];
            
            // 교육 환경 정보 구성 (별도 섹션)
            const educationInfo = [];
            if (currentInstituteData.education_environment) {
                educationInfo.push({
                    icon: 'school',
                    label: '교육 환경 정보',
                    value: currentInstituteData.education_environment,
                    isJsonData: true,
                    jsonType: 'education-environment-table'  // 새로운 테이블 타입
                });
            }
            
            // 기타 사항 구성 (목록 형태)
            const additionalInfo = [
                {
                    icon: 'languages',
                    label: '현지 언어 구사 필요 수준',
                    value: currentInstituteData.local_language_requirement || '정보 없음'
                },
                {
                    icon: 'heart-handshake',
                    label: '학당 지원 사항',
                    value: currentInstituteData.support_provided || '정보 없음'
                }
            ];
            
            // UI에 정보 표시
            window.InstituteInfoUI.renderInfoTable('basicInfoTable', basicInfo);
            window.InstituteInfoUI.renderInfoTable('activityInfoTable', activityInfo);
            
            // 교육 환경 정보 표시 (데이터가 있는 경우에만)
            if (educationInfo.length > 0) {
                console.log('📚 교육 환경 정보 표시 중...');
                window.InstituteInfoUI.renderInfoTable('educationInfoTable', educationInfo);
            } else {
                console.log('📚 교육 환경 정보 없음');
                // 교육 환경 정보가 없을 때 안내 메시지 표시
                const educationTable = document.getElementById('educationInfoTable');
                if (educationTable) {
                    educationTable.innerHTML = `
                        <div class="info-table-row">
                            <div class="info-table-label">
                                <i data-lucide="school"></i>
                                교육 환경 정보
                            </div>
                            <div class="info-table-value empty">
                                교육 환경 정보가 등록되지 않았습니다.
                            </div>
                        </div>
                    `;
                    // 아이콘 초기화
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            }
            
            window.InstituteInfoUI.renderInfoList('additionalInfoList', additionalInfo);
            
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
     * JSONB 데이터 처리 (개선된 버전)
     */
    function processJsonData(data, type = 'list') {
        try {
            if (!data) {
                return null;
            }
            
            // 문자열인 경우 JSON 파싱 시도
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    return data; // JSON이 아닌 일반 문자열
                }
            }
            
            // 배열인 경우
            if (Array.isArray(data)) {
                if (type === 'cultural-activity-table') {
                    // 문화인턴 활동 정보 - 수정된 컬럼 구조
                    return data.map((item) => {
                        if (typeof item === 'object' && item !== null) {
                            return {
                                // 순번 삭제됨
                                '문화 수업 주제': item.name || item.강좌명 || item.course || item['문화 수업 주제'] || '미정',
                                '참가자 한국어 수준': item.level || item.수준 || item.난이도 || item['참가자 한국어 수준'] || '미정',
                                '세부 일정': item.time || item.시간 || item.duration || item['세부 일정'] || '미정',
                                '목표 수강인원': item.participants || item.수강인원 || item.인원 || item['목표 수강인원'] || '미정'
                            };
                        }
                        return {
                            '문화 수업 주제': String(item),
                            '참가자 한국어 수준': '미정',
                            '세부 일정': '미정',
                            '목표 수강인원': '미정'
                        };
                    });
                } else if (type === 'education-environment-table') {
                    // 교육 환경 정보 - 새로운 컬럼 구조
                    return data.map((item) => {
                        if (typeof item === 'object' && item !== null) {
                            return {
                                '문화 수업 주제': item.subject || item.course || item['문화 수업 주제'] || item.name || '미정',
                                '교육 장소': item.location || item.place || item['교육 장소'] || item.venue || '미정',
                                '학당 교구 및 기자재': item.equipment || item.materials || item['학당 교구 및 기자재'] || item.facilities || '미정'
                            };
                        }
                        return {
                            '문화 수업 주제': String(item),
                            '교육 장소': '미정',
                            '학당 교구 및 기자재': '미정'
                        };
                    });
                } else if (type === 'enhanced-table') {
                    // 기존 Enhanced Table (호환성 유지)
                    return data.map((item, index) => {
                        if (typeof item === 'object' && item !== null) {
                            return {
                                순번: index + 1,
                                강좌명: item.name || item.강좌명 || item.course || '미정',
                                수준: item.level || item.수준 || item.난이도 || '미정',
                                시간: item.time || item.시간 || item.duration || '미정',
                                수강인원: item.participants || item.수강인원 || item.인원 || '미정'
                            };
                        }
                        return {
                            순번: index + 1,
                            강좌명: String(item),
                            수준: '미정',
                            시간: '미정',
                            수강인원: '미정'
                        };
                    });
                }
                
                return data.map(item => {
                    if (typeof item === 'object' && item !== null) {
                        // 객체인 경우 키-값 쌍을 문자열로 변환
                        return Object.entries(item)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ');
                    }
                    return String(item);
                });
            }
            
            // 객체인 경우
            if (typeof data === 'object' && data !== null) {
                if (type === 'cultural-activity-table' || type === 'education-environment-table') {
                    // 객체를 배열로 변환 후 재처리
                    return processJsonData([data], type);
                } else if (type === 'table') {
                    // 테이블 형태로 표시할 경우
                    return Object.entries(data).map(([key, value]) => ({
                        key,
                        value: String(value)
                    }));
                } else {
                    // 목록 형태로 표시할 경우
                    return Object.entries(data)
                        .map(([key, value]) => `${key}: ${value}`);
                }
            }
            
            return String(data);
            
        } catch (error) {
            console.warn('⚠️ JSONB 데이터 처리 실패:', error);
            return data ? String(data) : null;
        }
    }
    
    /**
     * 탭 전환 처리
     */
    function handleTabSwitch(tabName) {
        try {
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
                if (window.InstituteInfoUI && window.InstituteInfoUI.switchTab) {
                    window.InstituteInfoUI.switchTab(hash);
                }
            }
            
        } catch (error) {
            console.error('❌ 해시 변경 처리 실패:', error);
        }
    }
    
    /**
     * 데이터 새로고침
     */
    async function refreshData() {
        try {
            console.log('🔄 데이터 새로고침 시작');
            
            // 로딩 상태 표시
            window.InstituteInfoUI.showLoading();
            
            // 데이터 다시 로드
            await loadInstituteData();
            
            console.log('✅ 데이터 새로고침 완료');
            
        } catch (error) {
            console.error('❌ 데이터 새로고침 실패:', error);
            window.InstituteInfoUI.showError('데이터 새로고침 중 오류가 발생했습니다');
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
            version: '4.6.9',
            initialized: isInitialized,
            currentTab,
            hasData: !!currentInstituteData,
            eventListenersCount: eventListeners.size,
            description: '문화인턴 활동 정보 및 교육 환경 정보 테이블 컬럼이 개선된 학당 정보 핵심 로직 모듈'
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
        refreshData,
        
        // 탭 관리
        handleTabSwitch,
        handleHashChange,
        
        // 데이터 처리
        processJsonData,
        
        // 유틸리티
        getModuleInfo,
        
        // 상태 접근
        get isInitialized() { return isInitialized; },
        get currentData() { return currentInstituteData; },
        get currentTab() { return currentTab; }
    };
})();

// 모듈 로드 완료 로그
console.log('🧠 InstituteInfoCore 모듈 로드 완료 - v4.6.9 (문화인턴 활동 정보 및 교육 환경 정보 개선)');
