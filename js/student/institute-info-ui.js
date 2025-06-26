/**
 * 학생용 학당 정보 UI 모듈
 * Version: 4.6.4
 * Description: 화면 렌더링, DOM 조작, 탭 관리 담당
 */

window.InstituteInfoUI = (function() {
    'use strict';
    
    // 모듈 상태
    let isInitialized = false;
    
    // DOM 요소 캐시
    const elements = {
        loadingSpinner: null,
        errorMessage: null,
        mainContent: null,
        instituteTitle: null,
        instituteImage: null,
        defaultImagePlaceholder: null,
        tabButtons: null,
        tabPanels: null,
        basicInfoGrid: null,
        activityInfoGrid: null,
        additionalInfoGrid: null,
        safetyInfoContent: null
    };
    
    /**
     * 모듈 초기화
     */
    async function initialize() {
        try {
            console.log('🎨 InstituteInfoUI 초기화 시작');
            
            // DOM 요소 캐시
            cacheElements();
            
            // Lucide 아이콘 초기화
            initializeLucideIcons();
            
            isInitialized = true;
            console.log('✅ InstituteInfoUI 초기화 완료');
            
        } catch (error) {
            console.error('❌ InstituteInfoUI 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * DOM 요소 캐시
     */
    function cacheElements() {
        try {
            elements.loadingSpinner = document.getElementById('loadingSpinner');
            elements.errorMessage = document.getElementById('errorMessage');
            elements.mainContent = document.getElementById('mainContent');
            elements.instituteTitle = document.getElementById('instituteTitle');
            elements.instituteImage = document.getElementById('instituteImage');
            elements.defaultImagePlaceholder = document.getElementById('defaultImagePlaceholder');
            elements.tabButtons = document.querySelectorAll('.tab-button');
            elements.tabPanels = document.querySelectorAll('.tab-panel');
            elements.basicInfoGrid = document.getElementById('basicInfoGrid');
            elements.activityInfoGrid = document.getElementById('activityInfoGrid');
            elements.additionalInfoGrid = document.getElementById('additionalInfoGrid');
            elements.safetyInfoContent = document.getElementById('safetyInfoContent');
            
            console.log('✅ DOM 요소 캐시 완료');
            
        } catch (error) {
            console.error('❌ DOM 요소 캐시 실패:', error);
        }
    }
    
    /**
     * Lucide 아이콘 초기화
     */
    function initializeLucideIcons() {
        try {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
                console.log('✅ Lucide 아이콘 초기화 완료');
            } else {
                console.warn('⚠️ Lucide 아이콘 라이브러리를 찾을 수 없습니다');
            }
        } catch (error) {
            console.warn('⚠️ Lucide 아이콘 초기화 실패:', error);
        }
    }
    
    /**
     * 로딩 상태 표시
     */
    function showLoading() {
        try {
            hideAllStates();
            if (elements.loadingSpinner) {
                elements.loadingSpinner.style.display = 'flex';
            }
            console.log('📡 로딩 상태 표시');
        } catch (error) {
            console.error('❌ 로딩 표시 실패:', error);
        }
    }
    
    /**
     * 에러 메시지 표시
     */
    function showError(message) {
        try {
            hideAllStates();
            
            if (elements.errorMessage) {
                const errorText = elements.errorMessage.querySelector('p');
                if (errorText) {
                    errorText.textContent = message || '알 수 없는 오류가 발생했습니다';
                }
                elements.errorMessage.style.display = 'block';
            }
            
            initializeLucideIcons();
            console.log(`❌ 에러 메시지 표시: ${message}`);
            
        } catch (error) {
            console.error('❌ 에러 표시 실패:', error);
        }
    }
    
    /**
     * 메인 콘텐츠 표시
     */
    function showMainContent() {
        try {
            hideAllStates();
            
            if (elements.mainContent) {
                elements.mainContent.style.display = 'block';
                elements.mainContent.classList.add('fade-in');
            }
            
            initializeLucideIcons();
            console.log('✅ 메인 콘텐츠 표시');
            
        } catch (error) {
            console.error('❌ 메인 콘텐츠 표시 실패:', error);
        }
    }
    
    /**
     * 모든 상태 숨기기
     */
    function hideAllStates() {
        try {
            const states = [elements.loadingSpinner, elements.errorMessage, elements.mainContent];
            states.forEach(element => {
                if (element) {
                    element.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('❌ 상태 숨기기 실패:', error);
        }
    }
    
    /**
     * 학당 헤더 표시
     */
    function showInstituteHeader(instituteData) {
        try {
            if (elements.instituteTitle && instituteData) {
                elements.instituteTitle.textContent = instituteData.display_name || '학당명 없음';
                console.log(`📋 학당 헤더 표시: ${instituteData.display_name}`);
            }
        } catch (error) {
            console.error('❌ 학당 헤더 표시 실패:', error);
        }
    }
    
    /**
     * 학당 이미지 표시
     */
    function showInstituteImage(instituteData) {
        try {
            const imageUrl = instituteData?.image_url;
            
            if (imageUrl && elements.instituteImage && elements.defaultImagePlaceholder) {
                // 이미지 로드 시도
                const img = new Image();
                img.onload = () => {
                    elements.instituteImage.src = imageUrl;
                    elements.instituteImage.style.display = 'block';
                    elements.defaultImagePlaceholder.style.display = 'none';
                    console.log('🖼️ 학당 이미지 표시 완료');
                };
                img.onerror = () => {
                    showDefaultImage();
                    console.log('⚠️ 학당 이미지 로드 실패, 기본 이미지 표시');
                };
                img.src = imageUrl;
            } else {
                showDefaultImage();
                console.log('📷 기본 이미지 표시');
            }
            
        } catch (error) {
            console.error('❌ 학당 이미지 표시 실패:', error);
            showDefaultImage();
        }
    }
    
    /**
     * 기본 이미지 표시
     */
    function showDefaultImage() {
        try {
            if (elements.instituteImage && elements.defaultImagePlaceholder) {
                elements.instituteImage.style.display = 'none';
                elements.defaultImagePlaceholder.style.display = 'flex';
                initializeLucideIcons();
            }
        } catch (error) {
            console.error('❌ 기본 이미지 표시 실패:', error);
        }
    }
    
    /**
     * 정보 섹션 렌더링
     */
    function renderInfoSection(gridId, infoItems) {
        try {
            const grid = document.getElementById(gridId);
            if (!grid || !Array.isArray(infoItems)) {
                console.warn(`⚠️ 정보 섹션 렌더링 실패: ${gridId}`);
                return;
            }
            
            grid.innerHTML = '';
            
            infoItems.forEach(item => {
                const infoElement = createInfoItem(item);
                if (infoElement) {
                    grid.appendChild(infoElement);
                }
            });
            
            initializeLucideIcons();
            console.log(`✅ 정보 섹션 렌더링 완료: ${gridId}`);
            
        } catch (error) {
            console.error(`❌ 정보 섹션 렌더링 실패 (${gridId}):`, error);
        }
    }
    
    /**
     * 정보 아이템 생성
     */
    function createInfoItem(item) {
        try {
            if (!item || !item.label) {
                return null;
            }
            
            const infoItem = document.createElement('div');
            infoItem.className = 'info-item';
            
            // 레이블 생성
            const label = document.createElement('div');
            label.className = 'info-label';
            label.innerHTML = `
                <i data-lucide="${item.icon || 'info'}"></i>
                ${item.label}
            `;
            
            // 값 생성
            const value = document.createElement('div');
            value.className = 'info-value';
            
            if (!item.value || item.value === '' || item.value === null || item.value === undefined) {
                value.textContent = '정보 없음';
                value.classList.add('empty');
            } else if (item.isLink && item.value) {
                // 링크 처리
                value.innerHTML = `<a href="${item.value}" target="_blank" rel="noopener noreferrer">${item.value}</a>`;
            } else if (item.isJsonList && Array.isArray(item.value)) {
                // JSON 리스트 처리
                const list = document.createElement('ul');
                list.className = 'json-list';
                
                item.value.forEach(listItem => {
                    const li = document.createElement('li');
                    li.textContent = String(listItem);
                    list.appendChild(li);
                });
                
                value.appendChild(list);
            } else {
                // 일반 텍스트 처리
                value.textContent = String(item.value);
            }
            
            infoItem.appendChild(label);
            infoItem.appendChild(value);
            
            return infoItem;
            
        } catch (error) {
            console.error('❌ 정보 아이템 생성 실패:', error);
            return null;
        }
    }
    
    /**
     * 탭 전환
     */
    function switchTab(tabName) {
        try {
            console.log(`🔄 탭 전환 시작: ${tabName}`);
            
            // 탭 버튼 활성화 상태 업데이트
            elements.tabButtons.forEach(button => {
                const isActive = button.dataset.tab === tabName;
                button.classList.toggle('active', isActive);
            });
            
            // 탭 패널 표시 상태 업데이트
            elements.tabPanels.forEach(panel => {
                const isActive = panel.id === `${tabName}Tab`;
                panel.classList.toggle('active', isActive);
            });
            
            // 특별한 탭 처리
            if (tabName === 'safety') {
                handleSafetyTabActivation();
            }
            
            initializeLucideIcons();
            console.log(`✅ 탭 전환 완료: ${tabName}`);
            
        } catch (error) {
            console.error(`❌ 탭 전환 실패 (${tabName}):`, error);
        }
    }
    
    /**
     * 안전정보 탭 활성화 처리
     */
    function handleSafetyTabActivation() {
        try {
            // 안전정보 탭이 활성화될 때 특별한 처리가 필요한 경우 여기에 구현
            console.log('🛡️ 안전정보 탭 활성화됨');
        } catch (error) {
            console.error('❌ 안전정보 탭 활성화 처리 실패:', error);
        }
    }
    
    /**
     * 안전정보 iframe 표시
     */
    function showSafetyIframe(url) {
        try {
            if (!elements.safetyInfoContent || !url) {
                console.warn('⚠️ 안전정보 컨테이너 또는 URL이 없습니다');
                return;
            }
            
            elements.safetyInfoContent.innerHTML = `
                <div class="safety-loading">
                    <i data-lucide="loader"></i>
                    <p>안전정보를 불러오는 중...</p>
                </div>
            `;
            
            // iframe 생성
            const iframe = document.createElement('iframe');
            iframe.className = 'safety-iframe';
            iframe.src = url;
            iframe.title = '파견 국가 안전 정보';
            iframe.frameBorder = '0';
            iframe.loading = 'lazy';
            
            // iframe 로드 이벤트
            iframe.onload = () => {
                elements.safetyInfoContent.innerHTML = '';
                elements.safetyInfoContent.appendChild(iframe);
                console.log('✅ 안전정보 iframe 로드 완료');
            };
            
            iframe.onerror = () => {
                showSafetyError('안전정보 페이지를 불러올 수 없습니다');
                console.error('❌ 안전정보 iframe 로드 실패');
            };
            
            // 타임아웃 설정 (10초)
            setTimeout(() => {
                if (elements.safetyInfoContent.querySelector('.safety-loading')) {
                    showSafetyError('안전정보 로딩 시간이 초과되었습니다');
                }
            }, 10000);
            
            initializeLucideIcons();
            console.log(`🛡️ 안전정보 iframe 생성: ${url}`);
            
        } catch (error) {
            console.error('❌ 안전정보 iframe 표시 실패:', error);
            showSafetyError('안전정보 표시 중 오류가 발생했습니다');
        }
    }
    
    /**
     * 안전정보 에러 표시
     */
    function showSafetyError(message) {
        try {
            if (!elements.safetyInfoContent) {
                return;
            }
            
            elements.safetyInfoContent.innerHTML = `
                <div class="safety-error">
                    <i data-lucide="alert-circle"></i>
                    <h3>안전정보를 불러올 수 없습니다</h3>
                    <p>${message || '알 수 없는 오류가 발생했습니다'}</p>
                </div>
            `;
            
            initializeLucideIcons();
            console.log(`❌ 안전정보 에러 표시: ${message}`);
            
        } catch (error) {
            console.error('❌ 안전정보 에러 표시 실패:', error);
        }
    }
    
    /**
     * 안전정보 없음 표시
     */
    function showSafetyUnavailable() {
        try {
            if (!elements.safetyInfoContent) {
                return;
            }
            
            elements.safetyInfoContent.innerHTML = `
                <div class="safety-unavailable">
                    <i data-lucide="shield-off"></i>
                    <h3>안전정보가 등록되지 않았습니다</h3>
                    <p>해당 국가의 안전정보가 아직 등록되지 않았습니다.<br>
                    관리자에게 문의해주세요.</p>
                </div>
            `;
            
            initializeLucideIcons();
            console.log('📋 안전정보 없음 표시');
            
        } catch (error) {
            console.error('❌ 안전정보 없음 표시 실패:', error);
        }
    }
    
    /**
     * 애니메이션 효과 추가
     */
    function addAnimation(element, animationClass = 'fade-in') {
        try {
            if (element && element.classList) {
                element.classList.add(animationClass);
                
                // 애니메이션 완료 후 클래스 제거
                setTimeout(() => {
                    element.classList.remove(animationClass);
                }, 600);
            }
        } catch (error) {
            console.error('❌ 애니메이션 추가 실패:', error);
        }
    }
    
    /**
     * 모듈 정보 가져오기
     */
    function getModuleInfo() {
        return {
            name: 'InstituteInfoUI',
            version: '4.6.4',
            initialized: isInitialized,
            elementsCount: Object.keys(elements).length,
            description: '학당 정보 UI 렌더링 및 DOM 조작 모듈'
        };
    }
    
    // 공개 API
    return {
        // 초기화
        initialize,
        
        // 상태 표시
        showLoading,
        showError,
        showMainContent,
        
        // 콘텐츠 표시
        showInstituteHeader,
        showInstituteImage,
        renderInfoSection,
        
        // 탭 관리
        switchTab,
        
        // 안전정보
        showSafetyIframe,
        showSafetyError,
        showSafetyUnavailable,
        
        // 유틸리티
        addAnimation,
        initializeLucideIcons,
        getModuleInfo,
        
        // 상태 접근
        get isInitialized() { return isInitialized; },
        get elements() { return elements; }
    };
})();

// 모듈 로드 완료 로그
console.log('🎨 InstituteInfoUI 모듈 로드 완료 - v4.6.4');