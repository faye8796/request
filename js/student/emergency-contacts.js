/**
 * 비상연락망 관리 모듈 v1.1.0
 * 세종학당 문화인턴 지원 시스템
 * 
 * 기능:
 * - 비상연락망 데이터 입력/검증
 * - 실시간 필드 검증
 * - 자동 저장 기능
 * - 완료 상태 관리
 * 
 * v1.1.0 주요 업데이트:
 * - 데이터 로딩 시 UI 상태 완전 동기화
 * - 저장 버튼 텍스트 동적 변경 (최초 저장/저장)
 * - 진행률 계산 정확도 개선
 * - 실시간 상태 관리 강화
 */

class EmergencyContacts {
    constructor(api) {
        this.api = api;
        this.isInitialized = false;
        this.autoSaveInterval = null;
        this.lastSaveTime = 0;
        this.saveDelay = 2000; // 2초 후 자동 저장
                        
        // ✅ 추가: 중복 방지 플래그
        this.isSaving = false;
        this.isAutoSaving = false;       
        this.saveHandler = null; // 이벤트 핸들러 참조

        
        // 🆕 v1.1.0: 폼 상태 관리
        this.formState = {
            completedFieldsCount: 0,
            totalFieldsCount: 14, // 총 14개 필수 필드 (helper 제외)
            isDataSaved: false, // 데이터 저장 여부
            hasExistingData: false // 기존 데이터 존재 여부
        };
        
        // 폼 요소들
        this.elements = {
            // 개인 기본 정보
            bloodType: null,
            localPhone: null,
            domesticPhone: null,
            localAddress: null,
            domesticAddress: null,
            
            // 파견 학당 관련
            instituteDirectorName: null,
            instituteManagerName: null,
            instituteHelperName: null, // 선택사항
            
            // 현지 비상연락처
            localEmergencyName: null,
            localEmergencyPhone: null,
            
            // 국내 비상연락처
            domesticEmergencyName: null,
            domesticEmergencyPhone: null,
            
            // 대학 정보
            universityName: null,
            universityContactName: null,
            universityContactPhone: null,
            
            // 저장 버튼
            saveEmergencyBtn: null,
            
            // 진행률 표시
            progressText: null,
            completionStatus: null
        };
        
        console.log('EmergencyContacts 초기화됨 v1.1.0');
    }

    /**
     * ✅ 수정된 초기화 메서드
     */
    async init() {
        try {
            console.log('비상연락망 폼 초기화 시작');
            
            // DOM 요소들 찾기
            this.findElements();
            
            // 이벤트 리스너 등록
            this.bindEvents();
            
            // 🆕 v1.1.0: 기존 데이터 로드 및 상태 동기화
            await this.loadExistingDataAndSyncState();
            
            // ✅ 자동 저장 설정 (초기화 완료 후)
            this.setupAutoSave();
            
            // ✅ 자동 저장 활성화
            this.isAutoSaving = true;
            
            this.isInitialized = true;
            console.log('비상연락망 폼 초기화 완료');
            
        } catch (error) {
            console.error('비상연락망 폼 초기화 실패:', error);
            this.showError('비상연락망 폼을 초기화하는 중 오류가 발생했습니다.');
        }
    }

    /**
     * DOM 요소들 찾기
     */
    findElements() {
        console.log('비상연락망 DOM 요소 찾기 시작');
        
        // 개인 기본 정보 (5개)
        this.elements.bloodType = document.getElementById('bloodType');
        this.elements.localPhone = document.getElementById('localPhone');
        this.elements.domesticPhone = document.getElementById('domesticPhone');
        this.elements.localAddress = document.getElementById('localAddress');
        this.elements.domesticAddress = document.getElementById('domesticAddress');
        
        // 파견 학당 관련 (2개 필수 + 1개 선택)
        this.elements.instituteDirectorName = document.getElementById('instituteDirectorName');
        this.elements.instituteManagerName = document.getElementById('instituteManagerName');
        this.elements.instituteHelperName = document.getElementById('instituteHelperName'); // 선택사항
        
        // 현지 비상연락처 (2개)
        this.elements.localEmergencyName = document.getElementById('localEmergencyName');
        this.elements.localEmergencyPhone = document.getElementById('localEmergencyPhone');
        
        // 국내 비상연락처 (2개)
        this.elements.domesticEmergencyName = document.getElementById('domesticEmergencyName');
        this.elements.domesticEmergencyPhone = document.getElementById('domesticEmergencyPhone');
        
        // 대학 정보 (3개)
        this.elements.universityName = document.getElementById('universityName');
        this.elements.universityContactName = document.getElementById('universityContactName');
        this.elements.universityContactPhone = document.getElementById('universityContactPhone');
        
        // 저장 버튼
        this.elements.saveEmergencyBtn = document.getElementById('saveEmergencyBtn');
        
        // 진행률 표시
        this.elements.progressText = document.getElementById('emergencyProgressText');
        this.elements.completionStatus = document.getElementById('emergencyCompletionStatus');
        
        console.log('비상연락망 DOM 요소 찾기 완료:', this.elements);
    }

    /**
     * 🆕 v1.1.0: 기존 데이터 로드 및 상태 동기화
     */
    async loadExistingDataAndSyncState() {
        try {
            console.log('🔄 비상연락망 데이터 로드 및 상태 동기화 시작');

            const emergencyData = await this.api.getEmergencyContacts();
            if (!emergencyData) {
                console.log('기존 비상연락망 데이터 없음 - 초기 상태 유지');
                this.updateProgress(); // 초기 진행률 계산
                this.updateSaveButtonState(); // 초기 버튼 상태 설정
                return;
            }

            console.log('📋 기존 비상연락망 데이터 로드:', emergencyData);

            // 폼 데이터 채우기
            this.populateFormData(emergencyData);

            // 🆕 상태 동기화
            this.syncFormState(emergencyData);

            // 🆕 UI 상태 업데이트 (즉시 + 지연 호출)
            this.updateAllUIStates();

            // ✅ 수정: DOM 업데이트 완료를 위한 지연 호출
            setTimeout(() => {
                this.updateProgress();
                this.updateSaveButtonState();
                console.log('🔄 지연 UI 업데이트 완료');
            }, 50);

            console.log('✅ 비상연락망 데이터 로드 및 상태 동기화 완료:', this.formState);

        } catch (error) {
            console.error('❌ 비상연락망 데이터 로드 및 상태 동기화 실패:', error);
            // 로드 실패는 심각한 오류가 아니므로 초기 상태로 설정
            this.updateProgress();
            this.updateSaveButtonState();
        }
    }

    /**
     * 🆕 v1.1.0: 폼 데이터 채우기
     */
    populateFormData(emergencyData) {
        console.log('📝 비상연락망 폼 데이터 채우기 시작');
        
        // 데이터를 폼에 채우기
        Object.keys(emergencyData).forEach(key => {
            if (key === 'id' || key === 'user_id' || key === 'created_at' || key === 'updated_at') {
                return; // 시스템 필드는 제외
            }
            
            // snake_case를 camelCase로 변환
            const camelKey = this.snakeToCamel(key);
            const element = this.elements[camelKey];
            
            if (element && emergencyData[key]) {
                element.value = emergencyData[key];
                
                // 검증 상태 업데이트
                this.validateField(element);
            }
        });
        
        console.log('✅ 비상연락망 폼 데이터 채우기 완료');
    }

    /**
     * 🆕 v1.1.0: 폼 상태 동기화
     */
    syncFormState(emergencyData) {
        console.log('🔄 비상연락망 폼 상태 동기화 시작');
        
        // 기존 데이터 존재 여부
        this.formState.hasExistingData = !!emergencyData;
        this.formState.isDataSaved = !!emergencyData;
        
        // 완성된 필드 개수 계산
        this.formState.completedFieldsCount = this.calculateCompletedFields();
        
        console.log('✅ 비상연락망 폼 상태 동기화 완료:', this.formState);
    }

    /**
     * 🆕 v1.1.0: 모든 UI 상태 업데이트
     */
    async updateAllUIStates() {
        console.log('🎨 모든 UI 상태 업데이트 시작');

        // 진행률 업데이트
        await this.updateOverallProgress();

        // 단계별 UI 업데이트
        this.updateStepsUI();

        // 🆕 제출 상태별 버튼 업데이트
        this.updateSubmitButtonByStatus();

        // 🆕 관리자 피드백 표시
        this.updateAdminFeedbackDisplay();

        // ✅ 수정: 하위 모듈 진행률 강제 업데이트
        setTimeout(() => {
            if (this.emergency && this.emergency.updateProgress) {
                console.log('🔄 비상연락망 진행률 강제 업데이트');
                this.emergency.updateProgress();
            }
            if (this.forms && this.forms.updateProgress) {
                console.log('🔄 서류 폼 진행률 강제 업데이트');
                this.forms.updateProgress();
            }
        }, 100);

        console.log('✅ 모든 UI 상태 업데이트 완료');
    }
    /**
     * 🆕 v1.1.0: 완성된 필드 개수 계산 (정확한 14개)
     */
    calculateCompletedFields() {
        // 정확히 14개 필드 (institute_helper_name 제외)
        const requiredFields = [
            'bloodType', 'localPhone', 'domesticPhone', 'localAddress', 'domesticAddress',
            'instituteDirectorName', 'instituteManagerName',
            'localEmergencyName', 'localEmergencyPhone',
            'domesticEmergencyName', 'domesticEmergencyPhone',
            'universityName', 'universityContactName', 'universityContactPhone'
        ];
        
        let completedCount = 0;
        
        requiredFields.forEach(fieldName => {
            const element = this.elements[fieldName];
            if (element && element.value && element.value.trim()) {
                completedCount++;
            }
        });
        
        return completedCount;
    }

    /**
     * 🆕 v1.1.0: 저장 버튼 상태 업데이트
     */
    updateSaveButtonState() {
        if (!this.elements.saveEmergencyBtn) return;
        
        const completedFields = this.calculateCompletedFields();
        
        const btn = this.elements.saveEmergencyBtn;
        
        // 버튼 활성화 상태 (최소 1개 필드가 있으면 저장 가능)
        btn.disabled = completedFields === 0;
        
        // 버튼 텍스트 및 스타일
        if (this.formState.isDataSaved) {
            // 이미 저장된 상태 - 수정 가능
            btn.innerHTML = '<i data-lucide="save"></i> 저장';
            btn.classList.remove('first-save');
            btn.classList.add('update-save');
        } else {
            // 최초 저장 상태
            btn.innerHTML = '<i data-lucide="user-plus"></i> 비상연락망 저장';
            btn.classList.remove('update-save');
            btn.classList.add('first-save');
        }
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        console.log('🔘 비상연락망 저장 버튼 상태 업데이트:', {
            saved: this.formState.isDataSaved,
            completed: completedFields,
            total: this.formState.totalFieldsCount,
            canSave: !btn.disabled
        });
    }

    /**
     * ✅ 수정된 이벤트 리스너 등록 (중복 클릭 방지)
     */
    bindEvents() {
        console.log('비상연락망 이벤트 리스너 등록 시작');

        // ✅ 저장 버튼 이벤트 (중복 클릭 방지)
        if (this.elements.saveEmergencyBtn) {
            // 기존 이벤트 리스너 제거 (중복 방지)
            if (this.saveHandler) {
                this.elements.saveEmergencyBtn.removeEventListener('click', this.saveHandler);
            }

            // 새 이벤트 핸들러 생성
            this.saveHandler = () => {
                // 이미 저장 중이면 무시
                if (this.isSaving) {
                    console.log('저장 중이므로 클릭을 무시합니다.');
                    return;
                }
                this.saveEmergencyContacts();
            };

            this.elements.saveEmergencyBtn.addEventListener('click', this.saveHandler);
        }

        // 🆕 v1.1.0: 실시간 입력 변경 감지로 버튼 상태 업데이트
        this.setupInputValidation();

        console.log('비상연락망 이벤트 리스너 등록 완료');
    }

    /**
     * 입력 검증 및 자동 저장 설정
     */
    setupInputValidation() {
        const allInputs = Object.values(this.elements).filter(el => 
            el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
        );
        
        allInputs.forEach(input => {
            if (!input) return;
            
            // 실시간 검증
            input.addEventListener('blur', () => {
                this.validateField(input);
                this.updateProgress();
                this.updateSaveButtonState(); // 🆕 v1.1.0: 버튼 상태 업데이트
            });
            
            // 자동 저장 트리거
            input.addEventListener('input', () => {
                this.scheduleAutoSave();
                this.updateProgress();
                this.updateSaveButtonState(); // 🆕 v1.1.0: 버튼 상태 업데이트
            });
            
            // 전화번호 필드 특별 검증
            if (input.id.includes('Phone')) {
                input.addEventListener('input', () => {
                    this.validatePhoneField(input);
                });
            }
        });
    }

    /**
     * 필드별 검증
     */
    validateField(input) {
        if (!input || !input.value) return;
        
        const fieldName = input.id;
        const value = input.value.trim();
        
        let isValid = true;
        let errorMessage = '';
        
        switch (fieldName) {
            case 'bloodType':
                isValid = ['A', 'B', 'O', 'AB'].some(type => 
                    value.toUpperCase().includes(type)
                );
                errorMessage = '올바른 혈액형을 선택해주세요.';
                break;
                
            case 'localPhone':
            case 'domesticPhone':
            case 'localEmergencyPhone':
            case 'domesticEmergencyPhone':
            case 'universityContactPhone':
                isValid = this.api.validatePhoneNumber(value);
                errorMessage = '올바른 전화번호 형식이 아닙니다.';
                break;
                
            case 'localAddress':
            case 'domesticAddress':
                isValid = value.length >= 10;
                errorMessage = '주소를 10자 이상 입력해주세요.';
                break;
                
            case 'instituteDirectorName':
            case 'instituteManagerName':
            case 'instituteHelperName':
            case 'localEmergencyName':
            case 'domesticEmergencyName':
            case 'universityContactName':
                isValid = value.length >= 2;
                errorMessage = '이름을 2자 이상 입력해주세요.';
                break;
                
            case 'universityName':
                isValid = value.length >= 2;
                errorMessage = '대학명을 2자 이상 입력해주세요.';
                break;
        }
        
        // UI 업데이트
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
            this.hideFieldError(input);
        } else {
            input.classList.remove('valid');
            input.classList.add('error');
            this.showFieldError(input, errorMessage);
        }
    }

    /**
     * 전화번호 필드 특별 검증
     */
    validatePhoneField(input) {
        if (!input || !input.value) return;
        
        const value = input.value.trim();
        if (value.length < 8) return; // 너무 짧으면 검증하지 않음
        
        const isValid = this.api.validatePhoneNumber(value);
        
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
            this.hideFieldError(input);
        } else {
            input.classList.remove('valid');
            input.classList.add('error');
            this.showFieldError(input, '올바른 전화번호 형식이 아닙니다.');
        }
    }

    /**
     * 필드별 오류 메시지 표시
     */
    showFieldError(input, message) {
        if (!input) return;
        
        // 기존 오류 메시지 제거
        this.hideFieldError(input);
        
        // 오류 메시지 요소 생성
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        // 입력 필드 다음에 삽입
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }

    /**
     * 필드별 오류 메시지 숨기기
     */
    hideFieldError(input) {
        if (!input || !input.parentNode) return;
        
        const errorDiv = input.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * 자동 저장 설정
     */
    setupAutoSave() {
        // 자동 저장 활성화
        this.autoSaveInterval = setInterval(() => {
            if (this.shouldAutoSave()) {
                this.autoSaveData();
            }
        }, 1000); // 1초마다 확인
    }

    /**
     * 자동 저장 예약
     */
    scheduleAutoSave() {
        this.lastSaveTime = Date.now() + this.saveDelay;
    }

    /**
     * 자동 저장 필요 여부 확인
     */
    shouldAutoSave() {
        return this.lastSaveTime > 0 && Date.now() >= this.lastSaveTime;
    }

    /**
     * ✅ 수정된 자동 저장 로직
     */
    async autoSaveData() {
        // ✅ 수동 저장 중이거나 자동 저장이 비활성화된 경우 건너뛰기
        if (this.isSaving || !this.isAutoSaving) {
            console.log('자동 저장 건너뛰기 (수동 저장 중 또는 비활성화됨)');
            return;
        }

        try {
            console.log('비상연락망 자동 저장 시작');
            
            const formData = this.collectFormData();
            
            // ✅ 저장 타입 명시하여 API 호출
            await this.api.saveEmergencyContacts(formData, 'auto');
            
            this.lastSaveTime = 0; // 저장 완료
            
            // 🆕 v1.1.0: 상태 업데이트
            this.formState.isDataSaved = true;
            this.updateSaveButtonState();
            
            this.showAutoSaveStatus('자동 저장됨');
            
            console.log('비상연락망 자동 저장 완료');
            
        } catch (error) {
            console.error('비상연락망 자동 저장 실패:', error);
            this.lastSaveTime = Date.now() + 5000; // 5초 후 재시도
        }
    }


    /**
     * 자동 저장 상태 표시
     */
    showAutoSaveStatus(message) {
        // 기존 상태 메시지 제거
        const existingStatus = document.querySelector('.auto-save-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // 새 상태 메시지 생성
        const statusDiv = document.createElement('div');
        statusDiv.className = 'auto-save-status';
        statusDiv.innerHTML = `
            <i data-lucide="check"></i>
            <span>${message}</span>
        `;
        
        // 저장 버튼 근처에 표시
        if (this.elements.saveEmergencyBtn && this.elements.saveEmergencyBtn.parentNode) {
            this.elements.saveEmergencyBtn.parentNode.appendChild(statusDiv);
        }
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 3000);
    }

    /**
     * 폼 데이터 수집
     */
    collectFormData() {
        const data = {};
        
        // 각 필드의 값 수집
        Object.keys(this.elements).forEach(key => {
            const element = this.elements[key];
            if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
                // camelCase를 snake_case로 변환
                const fieldName = this.camelToSnake(key);
                data[fieldName] = element.value.trim() || null;
            }
        });
        
        console.log('수집된 폼 데이터:', data);
        return data;
    }

    /**
     * camelCase를 snake_case로 변환
     */
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }


    /**
     * ✅ 수정된 비상연락망 정보 저장 (중복 방지)
     */
    async saveEmergencyContacts() {
        // ✅ 1. 중복 저장 방지 체크
        if (this.isSaving) {
            console.log('이미 저장 중입니다. 요청을 무시합니다.');
            return;
        }

        try {
            console.log('비상연락망 정보 저장 시작');
            
            // ✅ 2. 저장 중 플래그 설정
            this.isSaving = true;
            
            // 폼 검증 (관대한 검증)
            const completedFields = this.calculateCompletedFields();
            if (completedFields === 0) {
                this.showError('최소 1개 이상의 필드를 입력해주세요.');
                return;
            }
            
            // ✅ 3. 저장 버튼 즉시 비활성화 (기존보다 더 빠르게)
            if (this.elements.saveEmergencyBtn) {
                this.elements.saveEmergencyBtn.disabled = true;
                this.elements.saveEmergencyBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> 저장 중...';
            }
            
            // ✅ 4. 자동 저장 일시 중단
            this.pauseAutoSave();
            
            // 폼 데이터 수집 및 저장
            const formData = this.collectFormData();
            
            // ✅ 5. 저장 타입 명시하여 API 호출
            await this.api.saveEmergencyContacts(formData, 'manual');
            
            // 🆕 v1.1.0: 상태 업데이트
            this.formState.isDataSaved = true;
            this.formState.hasExistingData = true;
            
            // 성공 메시지
            this.showSuccess('비상연락망 정보가 저장되었습니다.');
            
            // 진행률 업데이트
            this.updateProgress();
            
            // 진행률 업데이트 이벤트 발생
            this.dispatchProgressUpdate();
            
        } catch (error) {
            console.error('비상연락망 정보 저장 실패:', error);
            this.showError('비상연락망 정보 저장 중 오류가 발생했습니다.');
            
        } finally {
            // ✅ 6. 저장 중 플래그 해제
            this.isSaving = false;
            
            // 저장 버튼 복구
            this.updateSaveButtonState();
            
            // ✅ 7. 자동 저장 재개 (3초 후)
            setTimeout(() => {
                this.resumeAutoSave();
            }, 3000);
        }
    }

    /**
     * ✅ 추가: 자동 저장 일시 중단
     */
    pauseAutoSave() {
        this.isAutoSaving = false;
        this.lastSaveTime = 0; // 자동 저장 스케줄 초기화
        console.log('자동 저장 일시 중단');
    }

    /**
     * ✅ 추가: 자동 저장 재개
     */
    resumeAutoSave() {
        this.isAutoSaving = true;
        console.log('자동 저장 재개');
    }

    /**
     * 폼 전체 검증 (엄격한 검증 - 최종 제출용)
     */
    validateForm() {
        console.log('비상연락망 폼 검증 시작');
        
        const requiredFields = [
            { element: this.elements.bloodType, name: '혈액형' },
            { element: this.elements.localPhone, name: '현지 휴대폰 번호' },
            { element: this.elements.domesticPhone, name: '국내 휴대폰 번호' },
            { element: this.elements.localAddress, name: '현지 거주지 주소' },
            { element: this.elements.domesticAddress, name: '국내 거주지 주소' },
            { element: this.elements.instituteDirectorName, name: '파견 학당 학당장 성명' },
            { element: this.elements.instituteManagerName, name: '파견 학당 담당자 성명' },
            { element: this.elements.localEmergencyName, name: '현지 비상연락 가능한 지인 성명' },
            { element: this.elements.localEmergencyPhone, name: '현지 비상연락 가능한 지인 연락처' },
            { element: this.elements.domesticEmergencyName, name: '국내 비상연락 가능한 가족 성명' },
            { element: this.elements.domesticEmergencyPhone, name: '국내 비상연락 가능한 가족 연락처' },
            { element: this.elements.universityName, name: '소속 대학' },
            { element: this.elements.universityContactName, name: '대학 담당자 성명' },
            { element: this.elements.universityContactPhone, name: '대학 담당자 연락처' }
        ];
        
        // 필수 필드 확인
        for (const field of requiredFields) {
            if (!field.element || !field.element.value.trim()) {
                this.showError(`${field.name}을(를) 입력해주세요.`);
                field.element?.focus();
                return false;
            }
        }
        
        // 전화번호 형식 검증
        const phoneFields = [
            { element: this.elements.localPhone, name: '현지 휴대폰 번호' },
            { element: this.elements.domesticPhone, name: '국내 휴대폰 번호' },
            { element: this.elements.localEmergencyPhone, name: '현지 비상연락처' },
            { element: this.elements.domesticEmergencyPhone, name: '국내 비상연락처' },
            { element: this.elements.universityContactPhone, name: '대학 담당자 연락처' }
        ];
        
        for (const field of phoneFields) {
            if (field.element && field.element.value.trim()) {
                if (!this.api.validatePhoneNumber(field.element.value.trim())) {
                    this.showError(`${field.name} 형식이 올바르지 않습니다.`);
                    field.element.focus();
                    return false;
                }
            }
        }
        
        console.log('비상연락망 폼 검증 통과');
        return true;
    }

    /**
     * 진행률 업데이트 (🆕 v1.1.0: 정확한 14개 기준)
     */
    updateProgress() {
        if (!this.isInitialized) return;
        
        const completedFields = this.calculateCompletedFields();
        const totalFields = this.formState.totalFieldsCount; // 14개
        
        const percentage = Math.round((completedFields / totalFields) * 100);
        const isComplete = completedFields === totalFields;
        
        // 🆕 v1.1.0: 상태 업데이트
        this.formState.completedFieldsCount = completedFields;
        
        // 진행률 텍스트 업데이트
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${completedFields}/${totalFields} 항목 완료 (${percentage}%)`;
        }
        
        // 완료 상태 업데이트
        if (this.elements.completionStatus) {
            this.elements.completionStatus.className = `completion-status ${isComplete ? 'complete' : 'incomplete'}`;
            this.elements.completionStatus.innerHTML = isComplete 
                ? '<i data-lucide="check-circle"></i> 완료'
                : '<i data-lucide="clock"></i> 미완료';
                
            // Lucide 아이콘 재초기화
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
        
        console.log(`비상연락망 진행률: ${percentage}% (${completedFields}/${totalFields})`);
    }

    /**
     * 기존 데이터 로드 (호환성 유지)
     */
    async loadExistingData() {
        console.log('⚠️ loadExistingData는 더 이상 사용되지 않습니다. loadExistingDataAndSyncState를 사용합니다.');
        await this.loadExistingDataAndSyncState();
    }

    /**
     * snake_case를 camelCase로 변환
     */
    snakeToCamel(str) {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }

    /**
     * 진행률 업데이트 이벤트 발생
     */
    dispatchProgressUpdate() {
        const event = new CustomEvent('progressUpdate', {
            detail: { section: 'emergency' }
        });
        document.dispatchEvent(event);
    }

    /**
     * 성공 메시지 표시
     */
    showSuccess(message) {
        console.log('성공:', message);
        
        // 기존 알림 제거
        this.clearNotifications();
        
        // 성공 알림 생성
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <i data-lucide="check-circle"></i>
            <span>${message}</span>
            <button type="button" class="btn-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;
        
        // 페이지 상단에 추가
        document.body.insertBefore(notification, document.body.firstChild);
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * 오류 메시지 표시
     */
    showError(message) {
        console.error('오류:', message);
        
        // 기존 알림 제거
        this.clearNotifications();
        
        // 오류 알림 생성
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i data-lucide="alert-circle"></i>
            <span>${message}</span>
            <button type="button" class="btn-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;
        
        // 페이지 상단에 추가
        document.body.insertBefore(notification, document.body.firstChild);
        
        // Lucide 아이콘 재초기화
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 모든 알림 제거
     */
    clearNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
    }

    /**
     * 폼 리셋
     */
    resetForm() {
        // 모든 입력 필드 초기화
        Object.values(this.elements).forEach(element => {
            if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
                element.value = '';
                element.classList.remove('valid', 'error');
                this.hideFieldError(element);
            }
        });
        
        // 🆕 v1.1.0: 상태 초기화
        this.formState = {
            completedFieldsCount: 0,
            totalFieldsCount: 14,
            isDataSaved: false,
            hasExistingData: false
        };
        
        // 진행률 초기화
        this.updateProgress();
        
        // 버튼 상태 초기화
        this.updateSaveButtonState();
        
        // 임시 저장 데이터 삭제
        this.api.clearTempData('emergency_contacts');
        
        console.log('비상연락망 폼 리셋 완료');
    }

    /**
     * 폼 완료 상태 확인 (🆕 v1.1.0: 정확한 14개 기준)
     */
    isFormComplete() {
        const requiredFields = [
            'bloodType', 'localPhone', 'domesticPhone', 'localAddress', 'domesticAddress',
            'instituteDirectorName', 'instituteManagerName',
            'localEmergencyName', 'localEmergencyPhone',
            'domesticEmergencyName', 'domesticEmergencyPhone',
            'universityName', 'universityContactName', 'universityContactPhone'
        ];
        
        return requiredFields.every(fieldName => {
            const element = this.elements[fieldName];
            return element && element.value.trim();
        });
    }

    /**
     * 임시 저장
     */
    saveTempData() {
        if (!this.isInitialized) return;
        
        const tempData = this.collectFormData();
        this.api.saveTempData('emergency_contacts', tempData);
    }

    /**
     * 임시 저장 데이터 로드
     */
    loadTempData() {
        const tempData = this.api.loadTempData('emergency_contacts');
        if (!tempData) return;
        
        console.log('임시 저장 비상연락망 데이터 로드:', tempData);
        
        Object.keys(tempData).forEach(key => {
            const camelKey = this.snakeToCamel(key);
            const element = this.elements[camelKey];
            
            if (element && tempData[key]) {
                element.value = tempData[key];
            }
        });
        
        // 진행률 업데이트
        this.updateProgress();
    }

    /**
     * 정리
     */
    destroy() {
        // 자동 저장 인터벌 정리
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        // 알림 정리
        this.clearNotifications();
        
        console.log('EmergencyContacts 정리 완료');
    }
}

// 전역 스코프에 클래스 등록
window.EmergencyContacts = EmergencyContacts;

console.log('EmergencyContacts 모듈 로드 완료 v1.1.0');
