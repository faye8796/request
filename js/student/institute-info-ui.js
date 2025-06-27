/**
 * 학생용 학당 정보 UI 모듈
 * Version: 4.6.9
 * Description: 문화인턴 활동 정보 및 교육 환경 정보 테이블 구조 개선
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
        instituteEnglishTitle: null,
        instituteImage: null,
        defaultImagePlaceholder: null,
        tabButtons: null,
        tabPanels: null,
        basicInfoTable: null,
        activityInfoTable: null,
        additionalInfoList: null,
        safetyInfoContent: null
    };
    
    /**
     * 모듈 초기화
     */
    async function initialize() {
        try {
            console.log('🎨 InstituteInfoUI 초기화 시작 v4.6.9');
            
            // DOM 요소 캐시
            cacheElements();
            
            // Lucide 아이콘 초기화
            initializeLucideIcons();
            
            isInitialized = true;
            console.log('✅ InstituteInfoUI 초기화 완료 v4.6.9');
            
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
            elements.instituteEnglishTitle = document.getElementById('instituteEnglishTitle');
            elements.instituteImage = document.getElementById('instituteImage');
            elements.defaultImagePlaceholder = document.getElementById('defaultImagePlaceholder');
            elements.tabButtons = document.querySelectorAll('.tab-button');
            elements.tabPanels = document.querySelectorAll('.tab-panel');
            elements.basicInfoTable = document.getElementById('basicInfoTable');
            elements.activityInfoTable = document.getElementById('activityInfoTable');
            elements.additionalInfoList = document.getElementById('additionalInfoList');
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
                // 한국어 학당명
                elements.instituteTitle.textContent = instituteData.name_ko || '학당명 없음';
                
                // 영문 학당명
                if (elements.instituteEnglishTitle) {
                    elements.instituteEnglishTitle.textContent = instituteData.name_en || 'English Name Not Available';
                }
                
                console.log(`📋 학당 헤더 표시: ${instituteData.name_ko} (${instituteData.name_en})`);
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
     * 테이블 형태로 정보 렌더링
     */
    function renderInfoTable(tableId, infoItems) {
        try {
            const table = document.getElementById(tableId);
            if (!table || !Array.isArray(infoItems)) {
                console.warn(`⚠️ 테이블 렌더링 실패: ${tableId}`);
                return;
            }
            
            table.innerHTML = '';
            
            infoItems.forEach(item => {
                const row = createTableRow(item);
                if (row) {
                    table.appendChild(row);
                }
            });
            
            initializeLucideIcons();
            console.log(`✅ 테이블 렌더링 완료: ${tableId}`);
            
        } catch (error) {
            console.error(`❌ 테이블 렌더링 실패 (${tableId}):`, error);
        }
    }
    
    /**
     * 테이블 행 생성
     */
    function createTableRow(item) {
        try {
            if (!item || !item.label) {
                return null;
            }
            
            const row = document.createElement('div');
            row.className = 'info-table-row';
            
            // 레이블 생성
            const label = document.createElement('div');
            label.className = 'info-table-label';
            label.innerHTML = `
                <i data-lucide="${item.icon || 'info'}"></i>
                ${item.label}
            `;
            
            // 값 생성
            const value = document.createElement('div');
            value.className = 'info-table-value';
            
            // 긴 텍스트인 경우 특별 처리
            if (item.isLongText) {
                value.classList.add('text-break');
            }
            
            if (!item.value || item.value === '' || item.value === null || item.value === undefined) {
                value.textContent = '정보 없음';
                value.classList.add('empty');
            } else if (item.isLink && item.value && item.value !== '정보 없음') {
                // 링크 처리
                value.innerHTML = `<a href="${item.value}" target="_blank" rel="noopener noreferrer">${item.value}</a>`;
            } else if (item.isJsonData && typeof item.value === 'object') {
                // JSON 데이터 처리
                value.appendChild(createJsonDisplay(item.value, item.jsonType));
            } else {
                // 일반 텍스트 처리
                value.textContent = String(item.value);
            }
            
            row.appendChild(label);
            row.appendChild(value);
            
            return row;
            
        } catch (error) {
            console.error('❌ 테이블 행 생성 실패:', error);
            return null;
        }
    }
    
    /**
     * 목록 형태로 정보 렌더링
     */
    function renderInfoList(listId, infoItems) {
        try {
            const list = document.getElementById(listId);
            if (!list || !Array.isArray(infoItems)) {
                console.warn(`⚠️ 목록 렌더링 실패: ${listId}`);
                return;
            }
            
            list.innerHTML = '';
            
            infoItems.forEach(item => {
                const listItem = createListItem(item);
                if (listItem) {
                    list.appendChild(listItem);
                }
            });
            
            initializeLucideIcons();
            console.log(`✅ 목록 렌더링 완료: ${listId}`);
            
        } catch (error) {
            console.error(`❌ 목록 렌더링 실패 (${listId}):`, error);
        }
    }
    
    /**
     * 목록 아이템 생성
     */
    function createListItem(item) {
        try {
            if (!item || !item.label) {
                return null;
            }
            
            const listItem = document.createElement('div');
            listItem.className = 'info-list-item';
            
            // 제목 생성
            const title = document.createElement('div');
            title.className = 'info-list-title';
            title.innerHTML = `
                <i data-lucide="${item.icon || 'info'}"></i>
                ${item.label}
            `;
            
            // 내용 생성
            const content = document.createElement('div');
            content.className = 'info-list-content';
            
            if (!item.value || item.value === '' || item.value === null || item.value === undefined) {
                content.textContent = '정보 없음';
                content.classList.add('empty');
            } else if (item.isLink && item.value && item.value !== '정보 없음') {
                // 링크 처리
                content.innerHTML = `<a href="${item.value}" target="_blank" rel="noopener noreferrer">${item.value}</a>`;
            } else if (item.isJsonData && typeof item.value === 'object') {
                // JSON 데이터 처리
                content.appendChild(createJsonDisplay(item.value, item.jsonType));
            } else {
                // 일반 텍스트 처리
                content.textContent = String(item.value);
            }
            
            listItem.appendChild(title);
            listItem.appendChild(content);
            
            return listItem;
            
        } catch (error) {
            console.error('❌ 목록 아이템 생성 실패:', error);
            return null;
        }
    }
    
    /**
     * JSON 데이터 표시 생성 (Enhanced 버전)
     */
    function createJsonDisplay(data, type = 'list') {
        try {
            if (!data) {
                const empty = document.createElement('span');
                empty.textContent = '정보 없음';
                empty.className = 'empty';
                return empty;
            }
            
            if (Array.isArray(data)) {
                if (type === 'cultural-activity-table') {
                    return createCulturalActivityTable(data);
                } else if (type === 'education-environment-table') {
                    return createEducationEnvironmentTable(data);
                } else if (type === 'enhanced-table') {
                    return createEnhancedJsonTable(data);
                } else if (type === 'table') {
                    return createJsonTable(data);
                } else {
                    return createJsonList(data);
                }
            } else if (typeof data === 'object') {
                return createJsonObject(data);
            } else {
                const span = document.createElement('span');
                span.textContent = String(data);
                return span;
            }
            
        } catch (error) {
            console.error('❌ JSON 표시 생성 실패:', error);
            const errorSpan = document.createElement('span');
            errorSpan.textContent = '데이터 표시 오류';
            errorSpan.className = 'empty';
            return errorSpan;
        }
    }
    
    /**
     * 문화인턴 활동 정보 테이블 생성 (새로운 컬럼 구조)
     */
    function createCulturalActivityTable(data) {
        try {
            console.log('🎯 문화인턴 활동 정보 테이블 생성 중...', data);
            
            const table = document.createElement('table');
            table.className = 'json-table enhanced-table';
            
            if (!data || data.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.textContent = '강좌 정보 없음';
                td.className = 'empty';
                td.colSpan = 4; // 순번 삭제로 4개 컬럼
                td.style.textAlign = 'center';
                td.style.padding = '2rem';
                tr.appendChild(td);
                table.appendChild(tr);
                return table;
            }
            
            // 헤더 생성 (새로운 컬럼 구조)
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const headers = ['문화 수업 주제', '참가자 한국어 수준', '세부 일정', '목표 수강인원'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // 바디 생성
            const tbody = document.createElement('tbody');
            data.forEach((item) => {
                const row = document.createElement('tr');
                
                // 문화 수업 주제
                const subjectCell = document.createElement('td');
                const subject = item['문화 수업 주제'] || item.name || item.강좌명 || item.course || '미정';
                subjectCell.textContent = subject;
                row.appendChild(subjectCell);
                
                // 참가자 한국어 수준
                const levelCell = document.createElement('td');
                const level = item['참가자 한국어 수준'] || item.level || item.수준 || item.난이도 || '미정';
                levelCell.textContent = level;
                levelCell.style.textAlign = 'center';
                row.appendChild(levelCell);
                
                // 세부 일정
                const scheduleCell = document.createElement('td');
                const schedule = item['세부 일정'] || item.time || item.시간 || item.duration || '미정';
                scheduleCell.textContent = schedule;
                scheduleCell.style.textAlign = 'center';
                row.appendChild(scheduleCell);
                
                // 목표 수강인원
                const participantsCell = document.createElement('td');
                const participants = item['목표 수강인원'] || item.participants || item.수강인원 || item.인원 || '미정';
                participantsCell.textContent = participants;
                participantsCell.style.textAlign = 'center';
                row.appendChild(participantsCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            
            console.log('✅ 문화인턴 활동 정보 테이블 생성 완료');
            return table;
            
        } catch (error) {
            console.error('❌ 문화인턴 활동 정보 테이블 생성 실패:', error);
            return createJsonList(data);
        }
    }
    
    /**
     * 교육 환경 정보 테이블 생성 (새로운 컬럼 구조)
     */
    function createEducationEnvironmentTable(data) {
        try {
            console.log('🏫 교육 환경 정보 테이블 생성 중...', data);
            
            const table = document.createElement('table');
            table.className = 'json-table enhanced-table';
            
            if (!data || data.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.textContent = '교육 환경 정보 없음';
                td.className = 'empty';
                td.colSpan = 3;
                td.style.textAlign = 'center';
                td.style.padding = '2rem';
                tr.appendChild(td);
                table.appendChild(tr);
                return table;
            }
            
            // 헤더 생성 (교육 환경 정보 컬럼 구조)
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const headers = ['문화 수업 주제', '교육 장소', '학당 교구 및 기자재'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // 바디 생성
            const tbody = document.createElement('tbody');
            data.forEach((item) => {
                const row = document.createElement('tr');
                
                // 문화 수업 주제
                const subjectCell = document.createElement('td');
                const subject = item['문화 수업 주제'] || item.subject || item.course || item.name || '미정';
                subjectCell.textContent = subject;
                row.appendChild(subjectCell);
                
                // 교육 장소
                const locationCell = document.createElement('td');
                const location = item['교육 장소'] || item.location || item.place || item.venue || '미정';
                locationCell.textContent = location;
                locationCell.style.textAlign = 'center';
                row.appendChild(locationCell);
                
                // 학당 교구 및 기자재
                const equipmentCell = document.createElement('td');
                const equipment = item['학당 교구 및 기자재'] || item.equipment || item.materials || item.facilities || '미정';
                equipmentCell.textContent = equipment;
                row.appendChild(equipmentCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            
            console.log('✅ 교육 환경 정보 테이블 생성 완료');
            return table;
            
        } catch (error) {
            console.error('❌ 교육 환경 정보 테이블 생성 실패:', error);
            return createJsonList(data);
        }
    }
    
    /**
     * Enhanced JSON 테이블 생성 (기존 호환성 유지)
     */
    function createEnhancedJsonTable(data) {
        try {
            console.log('📊 Enhanced JSON 테이블 생성 중...', data);
            
            const table = document.createElement('table');
            table.className = 'json-table enhanced-table';
            
            if (!data || data.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.textContent = '강좌 정보 없음';
                td.className = 'empty';
                td.colSpan = 5;
                td.style.textAlign = 'center';
                td.style.padding = '2rem';
                tr.appendChild(td);
                table.appendChild(tr);
                return table;
            }
            
            // 헤더 생성 (기존 구조)
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const headers = ['순번', '강좌명', '수준', '시간', '수강인원'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // 바디 생성
            const tbody = document.createElement('tbody');
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                
                // 순번
                const indexCell = document.createElement('td');
                indexCell.textContent = index + 1;
                indexCell.style.textAlign = 'center';
                row.appendChild(indexCell);
                
                // 강좌명 - 다양한 필드명 지원
                const nameCell = document.createElement('td');
                const courseName = item.강좌명 || item.name || item.course || item.subject || '미정';
                nameCell.textContent = courseName;
                row.appendChild(nameCell);
                
                // 수준 - 다양한 필드명 지원
                const levelCell = document.createElement('td');
                const level = item.수준 || item.level || item.난이도 || item.difficulty || '미정';
                levelCell.textContent = level;
                levelCell.style.textAlign = 'center';
                row.appendChild(levelCell);
                
                // 시간 - 다양한 필드명 지원
                const timeCell = document.createElement('td');
                const time = item.시간 || item.time || item.duration || item.schedule || '미정';
                timeCell.textContent = time;
                timeCell.style.textAlign = 'center';
                row.appendChild(timeCell);
                
                // 수강인원 - 다양한 필드명 지원
                const participantsCell = document.createElement('td');
                const participants = item.수강인원 || item.participants || item.인원 || item.capacity || '미정';
                participantsCell.textContent = participants;
                participantsCell.style.textAlign = 'center';
                row.appendChild(participantsCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            
            console.log('✅ Enhanced JSON 테이블 생성 완료');
            return table;
            
        } catch (error) {
            console.error('❌ Enhanced JSON 테이블 생성 실패:', error);
            return createJsonList(data);
        }
    }
    
    /**
     * JSON 테이블 생성
     */
    function createJsonTable(data) {
        try {
            const table = document.createElement('table');
            table.className = 'json-table';
            
            if (data.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.textContent = '데이터 없음';
                td.className = 'empty';
                tr.appendChild(td);
                table.appendChild(tr);
                return table;
            }
            
            // 헤더 생성 (첫 번째 객체의 키를 기준으로)
            const firstItem = data[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                
                Object.keys(firstItem).forEach(key => {
                    const th = document.createElement('th');
                    th.textContent = key;
                    headerRow.appendChild(th);
                });
                
                thead.appendChild(headerRow);
                table.appendChild(thead);
                
                // 바디 생성
                const tbody = document.createElement('tbody');
                data.forEach(item => {
                    const row = document.createElement('tr');
                    Object.keys(firstItem).forEach(key => {
                        const td = document.createElement('td');
                        td.textContent = item[key] || '';
                        row.appendChild(td);
                    });
                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
            }
            
            return table;
            
        } catch (error) {
            console.error('❌ JSON 테이블 생성 실패:', error);
            return createJsonList(data);
        }
    }
    
    /**
     * JSON 목록 생성
     */
    function createJsonList(data) {
        try {
            const list = document.createElement('ul');
            list.className = 'json-list';
            
            if (data.length === 0) {
                const li = document.createElement('li');
                li.textContent = '데이터 없음';
                li.className = 'empty';
                list.appendChild(li);
                return list;
            }
            
            data.forEach(item => {
                const li = document.createElement('li');
                if (typeof item === 'object') {
                    // 객체인 경우 주요 정보만 표시
                    const displayText = item.name || item.강좌명 || JSON.stringify(item);
                    li.textContent = displayText;
                } else {
                    li.textContent = String(item);
                }
                list.appendChild(li);
            });
            
            return list;
            
        } catch (error) {
            console.error('❌ JSON 목록 생성 실패:', error);
            const errorList = document.createElement('ul');
            errorList.className = 'json-list';
            const li = document.createElement('li');
            li.textContent = '목록 표시 오류';
            li.className = 'empty';
            errorList.appendChild(li);
            return errorList;
        }
    }
    
    /**
     * JSON 객체 생성
     */
    function createJsonObject(data) {
        try {
            const container = document.createElement('div');
            
            Object.entries(data).forEach(([key, value]) => {
                const item = document.createElement('div');
                item.innerHTML = `<strong>${key}:</strong> ${value}`;
                container.appendChild(item);
            });
            
            return container;
            
        } catch (error) {
            console.error('❌ JSON 객체 생성 실패:', error);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = '객체 표시 오류';
            errorDiv.className = 'empty';
            return errorDiv;
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
            version: '4.6.9',
            initialized: isInitialized,
            elementsCount: Object.keys(elements).length,
            description: '문화인턴 활동 정보 및 교육 환경 정보 테이블 구조가 개선된 학당 정보 UI 모듈'
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
        renderInfoTable,
        renderInfoList,
        
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
console.log('🎨 InstituteInfoUI 모듈 로드 완료 - v4.6.9 (문화인턴 활동 정보 및 교육 환경 정보 테이블 개선)');
