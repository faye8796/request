/**
 * 학생용 학당 정보 UI 모듈
 * Version: 4.8.0
 * Description: DB 기반 국가 안전정보 표시 시스템 - iframe 대신 구조화된 안전정보 제공
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
        desiredCoursesTable: null,
        educationInfoTable: null,
        additionalInfoList: null,
        safetyInfoContent: null
    };
    
    /**
     * HTML 안전 줄바꿈 변환 함수
     * XSS 방지를 위해 텍스트를 이스케이프 처리 후 줄바꿈만 <br> 태그로 변환
     */
    function convertNewlinesToHtml(text) {
        try {
            if (!text || typeof text !== 'string') {
                return text;
            }
            
            // HTML 특수문자 이스케이프 처리
            const escapeHtml = (unsafe) => {
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            };
            
            // HTML 이스케이프 후 줄바꿈 변환
            const escapedText = escapeHtml(text);
            
            // 다양한 줄바꿈 형식을 <br> 태그로 변환
            return escapedText
                .replace(/\r\n/g, '<br>')  // Windows 스타일 (\r\n)
                .replace(/\r/g, '<br>')    // 구 Mac 스타일 (\r)
                .replace(/\n/g, '<br>');   // Unix/Linux 스타일 (\n)
                
        } catch (error) {
            console.error('❌ 줄바꿈 변환 실패:', error);
            return text; // 원본 텍스트 반환
        }
    }
    
    /**
     * 텍스트에 줄바꿈이 포함되어 있는지 확인
     */
    function hasNewlines(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }
        return /[\r\n]/.test(text);
    }
    
    /**
     * 모듈 초기화
     */
    async function initialize() {
        try {
            console.log('🎨 InstituteInfoUI 초기화 시작 v4.8.0');
            
            // DOM 요소 캐시
            cacheElements();
            
            // Lucide 아이콘 초기화
            initializeLucideIcons();
            
            isInitialized = true;
            console.log('✅ InstituteInfoUI 초기화 완료 v4.8.0');
            
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
            elements.desiredCoursesTable = document.getElementById('desiredCoursesTable');
            elements.educationInfoTable = document.getElementById('educationInfoTable');
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
     * 테이블 행 생성 (줄바꿈 처리 개선)
     */
    function createTableRow(item) {
        try {
            if (!item) {
                return null;
            }
            
            // 빈 라벨이면서 JSON 데이터인 경우 직접 테이블 반환
            if ((!item.label || item.label === '') && item.isJsonData && item.isDirectTable) {
                return createJsonDisplay(item.value, item.jsonType);
            }
            
            // 라벨이 없으면 건너뛰기
            if (!item.label) {
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
            
            // 기본정보와 기타 사항은 왼쪽 정렬, 나머지는 가운데 정렬
            value.style.textAlign = 'left'; // 기본정보 섹션 왼쪽 정렬 적용
            
            // 긴 텍스트인 경우 특별 처리
            if (item.isLongText) {
                value.classList.add('text-break');
                value.style.textAlign = 'left';
                // CSS 백업 옵션 추가
                value.style.whiteSpace = 'pre-line';
            }
            
            if (!item.value || item.value === '' || item.value === null || item.value === undefined) {
                value.textContent = '정보 없음';
                value.classList.add('empty');
            } else if (item.isLink && item.value && item.value !== '정보 없음') {
                // 링크 처리 - 링크는 왼쪽 정렬
                value.innerHTML = `<a href="${item.value}" target="_blank" rel="noopener noreferrer">${item.value}</a>`;
                value.style.textAlign = 'left';
            } else if (item.isJsonData && typeof item.value === 'object') {
                // JSON 데이터 처리
                value.appendChild(createJsonDisplay(item.value, item.jsonType));
                value.style.textAlign = 'center'; // JSON 테이블은 가운데 정렬
            } else {
                // 일반 텍스트 처리 - 줄바꿈 지원 개선
                const textValue = String(item.value);
                
                if (hasNewlines(textValue)) {
                    // 줄바꿈이 포함된 텍스트는 HTML로 변환
                    value.innerHTML = convertNewlinesToHtml(textValue);
                    // CSS 백업 옵션 추가
                    value.style.whiteSpace = 'pre-line';
                    console.log('🔄 줄바꿈 텍스트 변환:', textValue.substring(0, 50) + '...');
                } else {
                    // 일반 텍스트는 기존 방식 유지
                    value.textContent = textValue;
                }
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
     * 목록 아이템 생성 (줄바꿈 처리 개선)
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
            
            // 기타 사항은 왼쪽 정렬
            content.style.textAlign = 'left';
            
            if (!item.value || item.value === '' || item.value === null || item.value === undefined) {
                content.textContent = '정보 없음';
                content.classList.add('empty');
            } else if (item.isLink && item.value && item.value !== '정보 없음') {
                // 링크 처리 - 링크는 왼쪽 정렬
                content.innerHTML = `<a href="${item.value}" target="_blank" rel="noopener noreferrer">${item.value}</a>`;
                content.style.textAlign = 'left';
            } else if (item.isJsonData && typeof item.value === 'object') {
                // JSON 데이터 처리
                content.appendChild(createJsonDisplay(item.value, item.jsonType));
            } else {
                // 일반 텍스트 처리 - 줄바꿈 지원 개선
                const textValue = String(item.value);
                
                if (hasNewlines(textValue)) {
                    // 줄바꿈이 포함된 텍스트는 HTML로 변환
                    content.innerHTML = convertNewlinesToHtml(textValue);
                    // CSS 백업 옵션 추가
                    content.style.whiteSpace = 'pre-line';
                    console.log('🔄 줄바꿈 텍스트 변환 (목록):', textValue.substring(0, 50) + '...');
                } else {
                    // 일반 텍스트는 기존 방식 유지
                    content.textContent = textValue;
                }
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
                const textValue = String(data);
                
                // JSON 데이터에서도 줄바꿈 처리
                if (hasNewlines(textValue)) {
                    span.innerHTML = convertNewlinesToHtml(textValue);
                    span.style.whiteSpace = 'pre-line';
                } else {
                    span.textContent = textValue;
                }
                
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
     * 문화인턴 활동 정보 테이블 생성 (개선된 스타일)
     */
    function createCulturalActivityTable(data) {
        try {
            console.log('🎯 문화인턴 활동 정보 테이블 생성 중...', data);
            
            const table = document.createElement('table');
            table.className = 'json-table enhanced-table cultural-activity-table';
            
            if (!data || data.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.textContent = '강좌 정보 없음';
                td.className = 'empty';
                td.colSpan = 4;
                td.style.textAlign = 'center';
                td.style.padding = '2rem';
                tr.appendChild(td);
                table.appendChild(tr);
                return table;
            }
            
            // 헤더 생성
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const headers = ['문화 수업 주제', '참가자\\n한국어 수준', '목표 수강인원', '세부 일정'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.style.textAlign = 'center';
                th.style.whiteSpace = 'pre-line'; // 줄바꿈 적용
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // 바디 생성
            const tbody = document.createElement('tbody');
            data.forEach((item) => {
                const row = document.createElement('tr');
                
                // 문화 수업 주제 - 가운데 정렬, 줄바꿈 처리
                const subjectCell = document.createElement('td');
                const subject = item['문화 수업 주제'] || item.name || item.강좌명 || item.course || '미정';
                if (hasNewlines(subject)) {
                    subjectCell.innerHTML = convertNewlinesToHtml(subject);
                    subjectCell.style.whiteSpace = 'pre-line';
                } else {
                    subjectCell.textContent = subject;
                }
                subjectCell.style.textAlign = 'center';
                row.appendChild(subjectCell);
                
                // 참가자 한국어 수준 - 가운데 정렬, 줄바꿈 처리
                const levelCell = document.createElement('td');
                const level = item['참가자 한국어 수준'] || item.level || item.수준 || item.난이도 || '미정';
                if (hasNewlines(level)) {
                    levelCell.innerHTML = convertNewlinesToHtml(level);
                    levelCell.style.whiteSpace = 'pre-line';
                } else {
                    levelCell.textContent = level;
                }
                levelCell.style.textAlign = 'center';
                row.appendChild(levelCell);
                
                // 목표 수강인원 - 가운데 정렬, 줄바꿈 처리
                const participantsCell = document.createElement('td');
                const participants = item['목표 수강인원'] || item.participants || item.수강인원 || item.인원 || '미정';
                if (hasNewlines(participants)) {
                    participantsCell.innerHTML = convertNewlinesToHtml(participants);
                    participantsCell.style.whiteSpace = 'pre-line';
                } else {
                    participantsCell.textContent = participants;
                }
                participantsCell.style.textAlign = 'center';
                row.appendChild(participantsCell);
                
                // 세부 일정 - 가운데 정렬, 줄바꿈 처리
                const scheduleCell = document.createElement('td');
                const schedule = item['세부 일정'] || item.time || item.시간 || item.duration || '미정';
                if (hasNewlines(schedule)) {
                    scheduleCell.innerHTML = convertNewlinesToHtml(schedule);
                    scheduleCell.style.whiteSpace = 'pre-line';
                } else {
                    scheduleCell.textContent = schedule;
                }
                scheduleCell.style.textAlign = 'center';
                row.appendChild(scheduleCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            
            console.log('✅ 문화인턴 활동 정보 테이블 생성 완료 (줄바꿈 처리 포함)');
            return table;
            
        } catch (error) {
            console.error('❌ 문화인턴 활동 정보 테이블 생성 실패:', error);
            return createJsonList(data);
        }
    }
    
    /**
     * 교육 환경 정보 테이블 생성 (개선된 스타일)
     */
    function createEducationEnvironmentTable(data) {
        try {
            console.log('🏫 교육 환경 정보 테이블 생성 중...', data);
            
            const table = document.createElement('table');
            table.className = 'json-table enhanced-table education-environment-table';
            
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
            
            // 헤더 생성
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const headers = ['문화 수업 주제', '교육 장소', '학당 교구 및 기자재'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.textAlign = 'center';
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // 바디 생성
            const tbody = document.createElement('tbody');
            data.forEach((item) => {
                const row = document.createElement('tr');
                
                // 문화 수업 주제 - 가운데 정렬, 줄바꿈 처리
                const subjectCell = document.createElement('td');
                const subject = item.topic || item['문화 수업 주제'] || item.subject || item.course || item.name || '미정';
                if (hasNewlines(subject)) {
                    subjectCell.innerHTML = convertNewlinesToHtml(subject);
                    subjectCell.style.whiteSpace = 'pre-line';
                } else {
                    subjectCell.textContent = subject;
                }
                subjectCell.style.textAlign = 'center';
                row.appendChild(subjectCell);
                
                // 교육 장소 - 가운데 정렬, 줄바꿈 처리
                const locationCell = document.createElement('td');
                const location = item.location || item['교육 장소'] || item.place || item.venue || '미정';
                if (hasNewlines(location)) {
                    locationCell.innerHTML = convertNewlinesToHtml(location);
                    locationCell.style.whiteSpace = 'pre-line';
                } else {
                    locationCell.textContent = location;
                }
                locationCell.style.textAlign = 'center';
                row.appendChild(locationCell);
                
                // 학당 교구 및 기자재 - 가운데 정렬, 줄바꿈 처리
                const equipmentCell = document.createElement('td');
                const equipment = item.equipment || item['학당 교구 및 기자재'] || item.materials || item.facilities || '미정';
                if (hasNewlines(equipment)) {
                    equipmentCell.innerHTML = convertNewlinesToHtml(equipment);
                    equipmentCell.style.whiteSpace = 'pre-line';
                } else {
                    equipmentCell.textContent = equipment;
                }
                equipmentCell.style.textAlign = 'center';
                row.appendChild(equipmentCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            
            console.log('✅ 교육 환경 정보 테이블 생성 완료 (줄바꿈 처리 포함)');
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
                th.style.textAlign = 'center';
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // 바디 생성
            const tbody = document.createElement('tbody');
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                
                // 순번 - 가운데 정렬
                const indexCell = document.createElement('td');
                indexCell.textContent = index + 1;
                indexCell.style.textAlign = 'center';
                row.appendChild(indexCell);
                
                // 강좌명 - 제목이므로 왼쪽 정렬, 줄바꿈 처리
                const nameCell = document.createElement('td');
                const courseName = item.강좌명 || item.name || item.course || item.subject || '미정';
                if (hasNewlines(courseName)) {
                    nameCell.innerHTML = convertNewlinesToHtml(courseName);
                    nameCell.style.whiteSpace = 'pre-line';
                } else {
                    nameCell.textContent = courseName;
                }
                nameCell.style.textAlign = 'left';
                row.appendChild(nameCell);
                
                // 수준 - 가운데 정렬, 줄바꿈 처리
                const levelCell = document.createElement('td');
                const level = item.수준 || item.level || item.난이도 || item.difficulty || '미정';
                if (hasNewlines(level)) {
                    levelCell.innerHTML = convertNewlinesToHtml(level);
                    levelCell.style.whiteSpace = 'pre-line';
                } else {
                    levelCell.textContent = level;
                }
                levelCell.style.textAlign = 'center';
                row.appendChild(levelCell);
                
                // 시간 - 가운데 정렬, 줄바꿈 처리
                const timeCell = document.createElement('td');
                const time = item.시간 || item.time || item.duration || item.schedule || '미정';
                if (hasNewlines(time)) {
                    timeCell.innerHTML = convertNewlinesToHtml(time);
                    timeCell.style.whiteSpace = 'pre-line';
                } else {
                    timeCell.textContent = time;
                }
                timeCell.style.textAlign = 'center';
                row.appendChild(timeCell);
                
                // 수강인원 - 가운데 정렬, 줄바꿈 처리
                const participantsCell = document.createElement('td');
                const participants = item.수강인원 || item.participants || item.인원 || item.capacity || '미정';
                if (hasNewlines(participants)) {
                    participantsCell.innerHTML = convertNewlinesToHtml(participants);
                    participantsCell.style.whiteSpace = 'pre-line';
                } else {
                    participantsCell.textContent = participants;
                }
                participantsCell.style.textAlign = 'center';
                row.appendChild(participantsCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            
            console.log('✅ Enhanced JSON 테이블 생성 완료 (줄바꿈 처리 포함)');
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
                td.style.textAlign = 'center';
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
                    th.style.textAlign = 'center';
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
                        const cellValue = item[key] || '';
                        
                        // 셀 값에도 줄바꿈 처리 적용
                        if (hasNewlines(cellValue)) {
                            td.innerHTML = convertNewlinesToHtml(cellValue);
                            td.style.whiteSpace = 'pre-line';
                        } else {
                            td.textContent = cellValue;
                        }
                        td.style.textAlign = 'center';
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
                li.style.textAlign = 'left'; // 기타 사항 목록은 왼쪽 정렬
                list.appendChild(li);
                return list;
            }
            
            data.forEach(item => {
                const li = document.createElement('li');
                li.style.textAlign = 'left'; // 기타 사항 목록은 왼쪽 정렬
                
                if (typeof item === 'object') {
                    // 객체인 경우 주요 정보만 표시
                    const displayText = item.name || item.강좌명 || JSON.stringify(item);
                    if (hasNewlines(displayText)) {
                        li.innerHTML = convertNewlinesToHtml(displayText);
                        li.style.whiteSpace = 'pre-line';
                    } else {
                        li.textContent = displayText;
                    }
                } else {
                    const textItem = String(item);
                    if (hasNewlines(textItem)) {
                        li.innerHTML = convertNewlinesToHtml(textItem);
                        li.style.whiteSpace = 'pre-line';
                    } else {
                        li.textContent = textItem;
                    }
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
            li.style.textAlign = 'left';
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
            container.style.textAlign = 'center';
            
            Object.entries(data).forEach(([key, value]) => {
                const item = document.createElement('div');
                const valueText = String(value);
                
                if (hasNewlines(valueText)) {
                    item.innerHTML = `<strong>${key}:</strong> ${convertNewlinesToHtml(valueText)}`;
                    item.style.whiteSpace = 'pre-line';
                } else {
                    item.innerHTML = `<strong>${key}:</strong> ${valueText}`;
                }
                container.appendChild(item);
            });
            
            return container;
            
        } catch (error) {
            console.error('❌ JSON 객체 생성 실패:', error);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = '객체 표시 오류';
            errorDiv.className = 'empty';
            errorDiv.style.textAlign = 'center';
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
     * 안전정보 탭 활성화 처리 (새로운 DB 기반 방식)
     */
    async function handleSafetyTabActivation() {
        try {
            console.log('🛡️ 안전정보 탭 활성화됨 - DB 기반 방식');
            
            // InstituteInfoCore에서 현재 학당 데이터 가져오기
            if (window.InstituteInfoCore && window.InstituteInfoCore.currentData) {
                const instituteData = window.InstituteInfoCore.currentData;
                console.log('🔍 현재 학당 데이터:', instituteData);
                
                // 새로운 안전정보 표시 시스템 호출
                await showCountrySafetyInfo(instituteData);
            } else {
                console.warn('⚠️ InstituteInfoCore 모듈 또는 currentData를 찾을 수 없습니다');
                showSafetyUnavailable();
            }
            
        } catch (error) {
            console.error('❌ 안전정보 탭 활성화 처리 실패:', error);
            showSafetyError('안전정보를 불러오는 중 오류가 발생했습니다');
        }
    }
    
    /**
     * 국가별 안전정보 통합 표시 (NEW - 메인 함수)
     */
    async function showCountrySafetyInfo(instituteData) {
        try {
            if (!elements.safetyInfoContent || !instituteData) {
                console.warn('⚠️ 안전정보 컨테이너 또는 학당 데이터가 없습니다');
                showSafetyUnavailable();
                return;
            }

            console.log('🛡️ 국가별 안전정보 표시 시작:', instituteData.name_ko);

            // 국가 정보 조회 시도
            const countryInfo = await window.InstituteInfoAPI.getCountryInfoByAddress(instituteData.address);
            const safetyUrl = window.InstituteInfoAPI.getSafetyInfoUrl(instituteData);

            console.log('🔍 조회된 국가정보:', countryInfo);
            console.log('🔗 안전정보 URL:', safetyUrl);

            // 전체 안전정보 컨테이너 생성
            let safetyHtml = `
                <!-- 해외안전여행 앱 다운로드 UI -->
                ${createAppDownloadSection()}
            `;

            // 국가 기본정보가 있는 경우 추가
            if (countryInfo) {
                safetyHtml += createCountryBasicInfoSection(countryInfo);
                safetyHtml += createEmbassyInfoSection(countryInfo);
            }

            // 외부링크 섹션 추가
            safetyHtml += createSafetyExternalLinksSection(safetyUrl, countryInfo);

            // HTML 적용
            elements.safetyInfoContent.innerHTML = safetyHtml;

            initializeLucideIcons();
            console.log('✅ 국가별 안전정보 표시 완료');

        } catch (error) {
            console.error('❌ 국가별 안전정보 표시 실패:', error);
            showSafetyError('안전정보 표시 중 오류가 발생했습니다');
        }
    }
    
    /**
     * 앱 다운로드 섹션 HTML 생성
     */
    function createAppDownloadSection() {
        return `
            <div class="app-download-banner">
                <div class="app-download-content">
                    <div class="app-info">
                        <div class="app-icon">
                            <i data-lucide="smartphone"></i>
                        </div>
                        <div class="app-text">
                            <h3>해외안전여행 어플리케이션</h3>
                            <p>실시간 안전정보와 긴급상황 대응 서비스를 제공합니다</p>
                        </div>
                    </div>
                    <div class="download-buttons">
                        <a href="https://play.google.com/store/apps/details?id=kr.go.mofa.safetravel" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="download-btn android">
                            <i data-lucide="smartphone"></i>
                            <span>플레이스토어 다운로드</span>
                        </a>
                        <a href="https://apps.apple.com/kr/app/%ED%95%B4%EC%99%B8%EC%95%88%EC%A0%84%EC%97%AC%ED%96%89-%EC%98%81%EC%82%AC%EC%BD%9C%EC%84%BC%ED%84%B0-%EB%AC%B4%EB%A3%8C%EC%A0%84%ED%99%94/id1469501110" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="download-btn ios">
                            <i data-lucide="smartphone"></i>
                            <span>앱스토어 다운로드</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 국가 기본정보 섹션 HTML 생성
     */
    function createCountryBasicInfoSection(countryInfo) {
        try {
            const basicInfo = countryInfo.basic_info || {};
            
            return `
                <div class="country-basic-info">
                    <h4 class="safety-section-title">
                        <i data-lucide="globe"></i>
                        ${countryInfo.country_name} 기본정보
                    </h4>
                    <div class="country-info-grid">
                        <div class="info-item">
                            <span class="info-label">면적</span>
                            <span class="info-value">${basicInfo.area || '정보 없음'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">수도</span>
                            <span class="info-value">${basicInfo.capital || '정보 없음'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">언어</span>
                            <span class="info-value">${basicInfo.language || '정보 없음'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">종교</span>
                            <span class="info-value">${basicInfo.religion || '정보 없음'}</span>
                        </div>
                        <div class="info-item full-width">
                            <span class="info-label">민족 구성</span>
                            <span class="info-value">${basicInfo.ethnicity || '정보 없음'}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 국가 기본정보 섹션 생성 실패:', error);
            return '';
        }
    }
    
    /**
     * 재외공관 정보 섹션 HTML 생성
     */
    function createEmbassyInfoSection(countryInfo) {
        try {
            return `
                <div class="embassy-info">
                    <h4 class="safety-section-title">
                        <i data-lucide="building-2"></i>
                        재외공관 정보
                    </h4>
                    <div class="embassy-info-grid">
                        <div class="embassy-item">
                            <div class="embassy-icon">
                                <i data-lucide="map-pin"></i>
                            </div>
                            <div class="embassy-details">
                                <span class="embassy-label">대사관 주소</span>
                                <span class="embassy-value">${countryInfo.embassy_address || '정보 없음'}</span>
                            </div>
                        </div>
                        <div class="embassy-item">
                            <div class="embassy-icon">
                                <i data-lucide="phone"></i>
                            </div>
                            <div class="embassy-details">
                                <span class="embassy-label">대표번호</span>
                                <span class="embassy-value">${countryInfo.embassy_phone || '정보 없음'}</span>
                            </div>
                        </div>
                        <div class="embassy-item emergency">
                            <div class="embassy-icon">
                                <i data-lucide="phone-call"></i>
                            </div>
                            <div class="embassy-details">
                                <span class="embassy-label">긴급연락처</span>
                                <span class="embassy-value emergency-number">${countryInfo.emergency_contact || '정보 없음'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 재외공관 정보 섹션 생성 실패:', error);
            return '';
        }
    }
    
    /**
     * 외부링크 섹션 HTML 생성
     */
    function createSafetyExternalLinksSection(safetyUrl, countryInfo) {
        try {
            const hasCustomUrl = safetyUrl && safetyUrl !== 'https://www.0404.go.kr/';
            
            return `
                <div class="safety-external-links">
                    <h4 class="safety-section-title">
                        <i data-lucide="external-link"></i>
                        상세 안전정보
                    </h4>
                    <div class="external-links-grid">
                        ${hasCustomUrl ? `
                            <button type="button" 
                                    onclick="window.open('${safetyUrl}', '_blank')" 
                                    class="external-link-btn primary">
                                <i data-lucide="shield"></i>
                                <div class="btn-content">
                                    <span class="btn-title">학당별 안전정보</span>
                                    <span class="btn-desc">해당 지역 맞춤 안전정보</span>
                                </div>
                            </button>
                        ` : ''}
                        <button type="button" 
                                onclick="window.open('https://www.0404.go.kr/', '_blank')" 
                                class="external-link-btn ${hasCustomUrl ? 'secondary' : 'primary'}">
                            <i data-lucide="globe"></i>
                            <div class="btn-content">
                                <span class="btn-title">외교부 해외안전여행</span>
                                <span class="btn-desc">종합 안전정보 및 여행경보</span>
                            </div>
                        </button>
                        ${countryInfo ? `
                            <button type="button" 
                                    onclick="window.open('https://www.0404.go.kr/country/${countryInfo.country_name}', '_blank')" 
                                    class="external-link-btn tertiary">
                                <i data-lucide="map"></i>
                                <div class="btn-content">
                                    <span class="btn-title">${countryInfo.country_name} 정보</span>
                                    <span class="btn-desc">국가별 상세 안전정보</span>
                                </div>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 외부링크 섹션 생성 실패:', error);
            return `
                <div class="safety-external-links">
                    <button type="button" onclick="window.open('https://www.0404.go.kr/', '_blank')" class="external-link-btn primary">
                        <i data-lucide="external-link"></i>
                        외교부 해외안전여행 사이트
                    </button>
                </div>
            `;
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
                    <div class="error-actions">
                        <button type="button" onclick="window.open('https://www.0404.go.kr/', '_blank')" class="external-link-btn">
                            <i data-lucide="external-link"></i>
                            외교부 해외안전여행 사이트에서 확인하기
                        </button>
                    </div>
                </div>
            `;
            
            initializeLucideIcons();
            console.log(`❌ 안전정보 에러 표시: ${message}`);
            
        } catch (error) {
            console.error('❌ 안전정보 에러 표시 실패:', error);
        }
    }
    
    /**
     * 안전정보 없음 표시 (앱 다운로드 UI 포함)
     */
    function showSafetyUnavailable() {
        try {
            if (!elements.safetyInfoContent) {
                return;
            }

            elements.safetyInfoContent.innerHTML = `
                ${createAppDownloadSection()}

                <!-- 안전정보 없음 메시지 -->
                <div class="safety-unavailable">
                    <i data-lucide="shield-off"></i>
                    <h3>안전정보가 등록되지 않았습니다</h3>
                    <p>해당 국가의 안전정보가 아직 등록되지 않았습니다.</p>
                    <div class="unavailable-actions">
                        <button type="button" onclick="window.open('https://www.0404.go.kr/', '_blank')" class="external-link-btn">
                            <i data-lucide="external-link"></i>
                            외교부 해외안전여행 사이트에서 확인하기
                        </button>
                    </div>
                </div>
            `;

            initializeLucideIcons();
            console.log('📋 안전정보 없음 표시 (앱 다운로드 UI 포함)');

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
            version: '4.8.0',
            initialized: isInitialized,
            elementsCount: Object.keys(elements).length,
            description: 'DB 기반 국가 안전정보 표시 시스템 - iframe 대신 구조화된 안전정보 제공'
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
        
        // 안전정보 (새로운 방식)
        showCountrySafetyInfo,
        showSafetyError,
        showSafetyUnavailable,
        
        // 유틸리티
        addAnimation,
        initializeLucideIcons,
        getModuleInfo,
        convertNewlinesToHtml,
        hasNewlines,
        
        // 상태 접근
        get isInitialized() { return isInitialized; },
        get elements() { return elements; }
    };
})();

// 모듈 로드 완료 로그
console.log('🎨 InstituteInfoUI 모듈 로드 완료 - v4.8.0 (DB 기반 국가 안전정보 표시 시스템)');