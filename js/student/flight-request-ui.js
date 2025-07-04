// flight-request-ui.js - 항공권 신청 UI 관리 모듈 v8.4.1
// 🔧 여권정보 로딩 문제 해결을 위한 초기화 순서 개선 및 에러 처리 강화
// passport-info UI 기능 완전 통합 버전

class FlightRequestUI {
    constructor() {
        this.api = null;
        this.utils = null;
        this.elements = this.initElements();
        this.imageFile = null;
        this.ticketFile = null;
        this.receiptFile = null;
        this.userProfile = null;
        this.existingRequest = null;
        
        // 🆕 Passport-info 관련 상태
        this.passportImageFile = null;
        this.existingPassportImageUrl = null;
        this.existingPassportInfo = null; // 🛠️ v8.4.1: 기존 여권정보 저장
        this.isViewMode = false; // 🛠️ v8.4.1: 여권정보 보기/편집 모드
        
        // 🛠️ v8.4.1: 무한 루프 방지 플래그
        this.isLoadingData = false;
        
        // 초기화 상태
        this.isInitialized = false;
        this.initializationPromise = this.init();
    }

    initElements() {
        return {
            // 로딩/컨텐츠
            loadingState: document.getElementById('loadingState'),
            mainContent: document.getElementById('mainContent'),
            passportAlert: document.getElementById('passportAlert'),
            existingRequest: document.getElementById('existingRequest'),
            requestForm: document.getElementById('requestForm'),
            
            // 🆕 Passport 페이지 요소들
            passportLoadingState: document.getElementById('passportLoadingState'),
            passportForm: document.getElementById('passportForm'),
            passportInfoForm: document.getElementById('passportInfoForm'),
            passportNumber: document.getElementById('passportNumber'),
            nameEnglish: document.getElementById('nameEnglish'),
            issueDate: document.getElementById('issueDate'),
            expiryDate: document.getElementById('expiryDate'),
            expiryWarning: document.getElementById('expiryWarning'),
            passportImage: document.getElementById('passportImage'),
            passportImagePreview: document.getElementById('passportImagePreview'),
            passportPreviewImg: document.getElementById('passportPreviewImg'),
            removePassportImage: document.getElementById('removePassportImage'),
            passportSubmitBtn: document.getElementById('passportSubmitBtn'),
            passportSubmitBtnText: document.getElementById('passportSubmitBtnText'),
            passportSuccessMessage: document.getElementById('passportSuccessMessage'),
            proceedToFlightRequest: document.getElementById('proceedToFlightRequest'),
            
            // 🛠️ v8.4.1: 여권정보 보기 모드용 요소들 추가
            passportViewContainer: null, // 동적으로 생성
            
            // 항공권 신청 폼 요소
            form: document.getElementById('flightRequestForm'),
            purchaseType: document.getElementsByName('purchaseType'),
            departureDate: document.getElementById('departureDate'),
            returnDate: document.getElementById('returnDate'),
            durationMessage: document.getElementById('durationMessage'),
            departureAirport: document.getElementById('departureAirport'),
            arrivalAirport: document.getElementById('arrivalAirport'),
            purchaseLink: document.getElementById('purchaseLink'),
            purchaseLinkGroup: document.getElementById('purchaseLinkGroup'),
            flightImage: document.getElementById('flightImage'),
            imagePreview: document.getElementById('imagePreview'),
            previewImg: document.getElementById('previewImg'),
            removeImage: document.getElementById('removeImage'),
            submitBtn: document.getElementById('submitBtn'),
            submitBtnText: document.getElementById('submitBtnText'),
            
            // 모달
            ticketSubmitModal: document.getElementById('ticketSubmitModal'),
            ticketSubmitForm: document.getElementById('ticketSubmitForm'),
            ticketFile: document.getElementById('ticketFile'),
            ticketPreview: document.getElementById('ticketPreview'),
            ticketFileName: document.getElementById('ticketFileName'),
            ticketFileSize: document.getElementById('ticketFileSize'),
            
            receiptSubmitModal: document.getElementById('receiptSubmitModal'),
            receiptSubmitForm: document.getElementById('receiptSubmitForm'),
            receiptFile: document.getElementById('receiptFile'),
            receiptPreview: document.getElementById('receiptPreview'),
            receiptFileName: document.getElementById('receiptFileName'),
            receiptFileSize: document.getElementById('receiptFileSize'),
            
            // 메시지
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage')
        };
    }

    async init() {
        try {
            console.log('🔄 FlightRequestUI v8.4.1 초기화 시작 (여권정보 로딩 문제 해결)...');
            
            // API 및 유틸리티 대기
            await this.waitForDependencies();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 🛠️ v8.4.1: 초기화 시 자동으로 데이터 로드 시작
            setTimeout(() => {
                this.loadInitialData();
            }, 300);
            
            console.log('✅ FlightRequestUI v8.4.1 초기화 완료 - 여권정보 로딩 문제 해결');
            
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ FlightRequestUI 초기화 오류:', error);
            this.showError('시스템 초기화 중 오류가 발생했습니다.');
        }
    }

    // 🔧 v8.4.1: 강화된 의존성 대기 로직
    async waitForDependencies(timeout = 20000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                // API 및 Utils 확인 (상세한 상태 체크)
                const apiExists = !!window.flightRequestAPI;
                const apiInitialized = window.flightRequestAPI?.isInitialized;
                const utilsReady = !!window.FlightRequestUtils;
                
                console.log('🔍 [UI디버그] 의존성 상태 확인:', {
                    apiExists: apiExists,
                    apiInitialized: apiInitialized,
                    utilsReady: utilsReady,
                    경과시간: Date.now() - startTime
                });
                
                if (apiExists && apiInitialized && utilsReady) {
                    this.api = window.flightRequestAPI;
                    this.utils = window.FlightRequestUtils;
                    console.log('✅ [UI디버그] FlightRequestUI v8.4.1 의존성 로드 완료');
                    
                    // 🔧 v8.4.1: API 상태 추가 확인
                    const apiStatus = this.api.getStatus();
                    console.log('🔍 [UI디버그] API 상세 상태:', apiStatus);
                    
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    const error = new Error('의존성 로딩 시간 초과');
                    console.error('❌ [UI디버그] FlightRequestUI 의존성 시간 초과:', {
                        api: apiExists,
                        apiInitialized: apiInitialized,
                        utils: utilsReady,
                        timeout: timeout,
                        경과시간: Date.now() - startTime
                    });
                    reject(error);
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // 초기화 보장
    async ensureInitialized() {
        if (this.isInitialized) {
            return true;
        }

        if (!this.initializationPromise) {
            this.initializationPromise = this.init();
        }

        try {
            await this.initializationPromise;
            return this.isInitialized;
        } catch (error) {
            console.error('❌ UI 초기화 보장 실패:', error);
            throw error;
        }
    }

    // 🛠️ v8.4.1: 강화된 초기 데이터 로드 (상세한 디버깅)
    async loadInitialData() {
        try {
            console.log('🔄 [UI디버그] v8.4.1 초기 데이터 로드 시작 - 여권정보 로딩 문제 해결');
            
            // API 초기화 확인
            await this.ensureInitialized();
            
            if (!this.api) {
                console.warn('⚠️ [UI디버그] API가 준비되지 않음 - 기본 UI만 표시');
                this.showFlightRequestPageWithoutData();
                return;
            }

            console.log('🔍 [UI디버그] API 준비 완료, 사용자 프로필 로드 시작...');
            
            // 사용자 프로필 가져오기
            try {
                this.userProfile = await this.api.getUserProfile();
                console.log('✅ [UI디버그] 사용자 프로필 로드 성공:', {
                    id: this.userProfile?.id,
                    name: this.userProfile?.name,
                    dispatch_duration: this.userProfile?.dispatch_duration
                });
            } catch (error) {
                console.warn('⚠️ [UI디버그] 사용자 프로필 로드 실패:', error);
            }
            
            console.log('🔍 [UI디버그] 여권정보 확인 시작...');
            
            // 🔧 v8.4.1: 여권정보 확인 - 더 상세한 로그
            try {
                // 먼저 API 디버깅 실행
                if (this.api.debugPassportInfo) {
                    const debugResult = await this.api.debugPassportInfo();
                    console.log('🔍 [UI디버그] 여권정보 디버깅 결과:', debugResult);
                }
                
                const passportExists = await this.api.checkPassportInfo();
                console.log('🔍 [UI디버그] 여권정보 존재 여부:', passportExists);
                
                if (!passportExists) {
                    console.log('❌ [UI디버그] 여권정보 없음 - 여권정보 등록 페이지로 이동');
                    this.showPassportInfoPage();
                } else {
                    console.log('✅ [UI디버그] 여권정보 확인됨 - 항공권 신청 페이지 표시');
                    this.showFlightRequestPage();
                    
                    // 항공권 신청 데이터 로드
                    setTimeout(() => {
                        this.loadFlightRequestData();
                    }, 200);
                }
            } catch (error) {
                console.error('❌ [UI디버그] 여권정보 확인 오류:', error);
                // 오류 발생 시에도 항공권 신청 페이지 표시 (기본 동작)
                console.log('🔄 [UI디버그] 오류로 인해 항공권 신청 페이지 표시 (기본 동작)');
                this.showFlightRequestPageWithoutData();
            }
        } catch (error) {
            console.error('❌ [UI디버그] 초기 데이터 로드 실패:', error);
            // 최종 폴백: 기본 UI 표시
            this.showFlightRequestPageWithoutData();
        }
    }

    // 🛠️ v8.4.1: 데이터 없이 항공권 신청 페이지 표시 (폴백)
    showFlightRequestPageWithoutData() {
        console.log('🔄 [UI디버그] v8.4.1 기본 항공권 신청 페이지 표시 (데이터 없음)');
        
        // 항공권 신청 페이지 표시
        this.showFlightRequestPage();
        
        // 여권정보 알림 표시
        this.showPassportAlert();
        
        console.log('✅ [UI디버그] 기본 UI 표시 완료');
    }

    // 여권정보 등록 페이지 표시
    showPassportInfoPage() {
        if (typeof window.showPassportInfoPage === 'function') {
            window.showPassportInfoPage();
            // 🆕 여권정보 UI 초기화
            setTimeout(() => {
                this.initializePassportInfoUI();
            }, 200);
        }
    }

    // 항공권 신청 페이지 표시
    showFlightRequestPage() {
        if (typeof window.showFlightRequestPage === 'function') {
            window.showFlightRequestPage();
        }
    }

    // === 🔧 v8.4.1: 강화된 PASSPORT INFO UI 기능 ===

    // 여권정보 UI 초기화
    async initializePassportInfoUI() {
        try {
            console.log('🔧 [UI디버그] v8.4.1 여권정보 UI 초기화 시작 (문제 해결)');
            
            // API 초기화 확인
            await this.ensureInitialized();
            
            // 여권정보 이벤트 리스너 설정
            this.setupPassportEventListeners();
            
            // 기존 여권정보 로드 및 UI 모드 결정
            await this.loadExistingPassportDataAndSetMode();
            
            console.log('✅ [UI디버그] v8.4.1 여권정보 UI 초기화 완료');
        } catch (error) {
            console.error('❌ [UI디버그] 여권정보 UI 초기화 오류:', error);
            this.showError('여권정보 UI 초기화 중 오류가 발생했습니다: ' + error.message);
        }
    }

    // 🛠️ v8.4.1: 강화된 기존 여권정보 로드 및 모드 설정
    async loadExistingPassportDataAndSetMode() {
        try {
            console.log('🔍 [UI디버그] 기존 여권정보 로드 및 모드 설정 시작...');
            this.showPassportLoading(true);
            
            if (!this.api) {
                console.warn('⚠️ [UI디버그] API 없음 - 편집 모드로 시작');
                this.isViewMode = false;
                this.showPassportEditMode();
                return;
            }
            
            // 🔧 v8.4.1: 여권정보 조회 전 API 상태 재확인
            const apiStatus = this.api.getStatus();
            console.log('🔍 [UI디버그] 여권정보 조회 전 API 상태:', apiStatus);
            
            const passportInfo = await this.api.getPassportInfo();
            this.existingPassportInfo = passportInfo;

            console.log('🔍 [UI디버그] 여권정보 조회 결과:', {
                exists: !!passportInfo,
                passportInfo: passportInfo,
                id: passportInfo?.id,
                user_id: passportInfo?.user_id,
                passport_number: passportInfo?.passport_number,
                name_english: passportInfo?.name_english
            });

            if (passportInfo) {
                console.log('✅ [UI디버그] 기존 여권정보 발견 - 보기 모드로 시작');
                this.isViewMode = true;
                this.showPassportViewMode(passportInfo);
            } else {
                console.log('❌ [UI디버그] 여권정보 없음 - 편집 모드로 시작');
                this.isViewMode = false;
                this.showPassportEditMode();
            }
        } catch (error) {
            console.error('❌ [UI디버그] 여권정보 로드 오류:', error);
            // 오류 시 편집 모드로 폴백
            this.isViewMode = false;
            this.showPassportEditMode();
            this.showError('여권정보를 불러오는 중 오류가 발생했습니다: ' + error.message);
        } finally {
            this.showPassportLoading(false);
        }
    }

    // 🛠️ v8.4.1: 여권정보 보기 모드 표시
    showPassportViewMode(passportInfo) {
        const container = document.getElementById('passportForm');
        if (!container) return;

        // 기존 폼 숨기기
        if (this.elements.passportInfoForm) {
            this.elements.passportInfoForm.style.display = 'none';
        }

        // 보기 모드 HTML 생성
        const viewHtml = `
            <div id="passportViewContainer" class="passport-view-container">
                <div class="passport-info-card">
                    <h2 class="section-title">
                        <i data-lucide="user-check"></i>
                        등록된 여권정보
                    </h2>
                    
                    <div class="passport-info-grid">
                        <div class="info-item">
                            <label>여권번호</label>
                            <p>${passportInfo.passport_number || '-'}</p>
                        </div>
                        
                        <div class="info-item">
                            <label>영문 이름</label>
                            <p>${passportInfo.name_english || '-'}</p>
                        </div>
                        
                        <div class="info-item">
                            <label>발급일</label>
                            <p>${this.formatDate(passportInfo.issue_date) || '-'}</p>
                        </div>
                        
                        <div class="info-item">
                            <label>만료일</label>
                            <p>${this.formatDate(passportInfo.expiry_date) || '-'}</p>
                        </div>
                        
                        ${passportInfo.image_url ? `
                        <div class="info-item full-width">
                            <label>여권 사본</label>
                            <div class="passport-image-display">
                                <img src="${passportInfo.image_url}" alt="여권 사본" onclick="window.open('${passportInfo.image_url}', '_blank')">
                                <p class="image-hint">클릭하면 크게 볼 수 있습니다</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="passport-view-actions">
                        <button type="button" class="btn btn-secondary" onclick="flightRequestUI.closePassportView()">
                            <i data-lucide="arrow-left"></i>
                            닫기 (항공권 신청으로)
                        </button>
                        <button type="button" class="btn btn-primary" onclick="flightRequestUI.editPassportInfo()">
                            <i data-lucide="edit"></i>
                            수정하기
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', viewHtml);
        this.elements.passportViewContainer = document.getElementById('passportViewContainer');

        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 🛠️ v8.4.1: 여권정보 편집 모드 표시
    showPassportEditMode() {
        // 보기 모드 컨테이너 제거
        if (this.elements.passportViewContainer) {
            this.elements.passportViewContainer.remove();
            this.elements.passportViewContainer = null;
        }

        // 편집 폼 표시
        if (this.elements.passportInfoForm) {
            this.elements.passportInfoForm.style.display = 'block';
        }

        // 기존 데이터가 있으면 폼에 채우기
        if (this.existingPassportInfo) {
            this.populatePassportForm(this.existingPassportInfo);
        }
    }

    // 🛠️ v8.4.1: 여권정보 보기 모드 닫기
    closePassportView() {
        console.log('🔄 [UI디버그] 여권정보 보기 닫기 - 항공권 신청 페이지로 이동');
        this.showFlightRequestPage();
        
        // 항공권 신청 데이터 로드
        setTimeout(() => {
            this.loadFlightRequestData();
        }, 200);
    }

    // 🛠️ v8.4.1: 여권정보 편집 모드로 전환
    editPassportInfo() {
        console.log('🔄 [UI디버그] 여권정보 편집 모드로 전환');
        this.isViewMode = false;
        this.showPassportEditMode();
    }

    // 여권정보 폼에 기존 데이터 채우기
    populatePassportForm(passportInfo) {
        console.log('🔍 [UI디버그] 여권정보 폼 데이터 채우기:', passportInfo);
        
        if (this.elements.passportNumber) {
            this.elements.passportNumber.value = passportInfo.passport_number || '';
        }
        if (this.elements.nameEnglish) {
            this.elements.nameEnglish.value = passportInfo.name_english || '';
        }
        if (this.elements.issueDate) {
            this.elements.issueDate.value = passportInfo.issue_date || '';
        }
        if (this.elements.expiryDate) {
            this.elements.expiryDate.value = passportInfo.expiry_date || '';
        }

        // 기존 이미지가 있으면 미리보기 표시
        if (passportInfo.image_url) {
            this.existingPassportImageUrl = passportInfo.image_url;
            this.showPassportImagePreview(passportInfo.image_url);
        }

        // 버튼 텍스트 변경
        if (this.elements.passportSubmitBtnText) {
            this.elements.passportSubmitBtnText.textContent = '수정하기';
        }

        // 만료일 검증
        if (passportInfo.expiry_date) {
            this.validatePassportExpiryDate();
        }
    }

    // 날짜 포맷팅 유틸리티
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    // 여권정보 이벤트 리스너 설정
    setupPassportEventListeners() {
        // 여권정보 폼 제출
        if (this.elements.passportInfoForm) {
            this.elements.passportInfoForm.addEventListener('submit', (e) => this.handlePassportSubmit(e));
        }

        // 여권 이미지 업로드
        if (this.elements.passportImage) {
            this.elements.passportImage.addEventListener('change', (e) => this.handlePassportImageUpload(e));
        }
        
        // 여권 이미지 제거
        if (this.elements.removePassportImage) {
            this.elements.removePassportImage.addEventListener('click', () => this.removePassportImage());
        }

        // 여권 만료일 검증
        if (this.elements.expiryDate) {
            this.elements.expiryDate.addEventListener('change', () => this.validatePassportExpiryDate());
        }

        // 영문 이름 대문자 변환 및 실시간 검증
        if (this.elements.nameEnglish) {
            this.elements.nameEnglish.addEventListener('input', (e) => {
                // 대문자 변환
                e.target.value = e.target.value.toUpperCase();
                
                // 영문과 띄어쓰기만 허용
                e.target.value = e.target.value.replace(/[^A-Z\s]/g, '');
                
                // 연속된 띄어쓰기 제거
                e.target.value = e.target.value.replace(/\s{2,}/g, ' ');
            });
        }

        // 여권번호 대문자 변환 및 형식 검증
        if (this.elements.passportNumber) {
            this.elements.passportNumber.addEventListener('input', (e) => {
                // 대문자 변환
                e.target.value = e.target.value.toUpperCase();
                
                // 여권번호 형식만 허용 (대문자 1자리 + 숫자 8자리)
                e.target.value = e.target.value.replace(/[^A-Z0-9]/g, '');
                
                // 최대 9자리 제한
                if (e.target.value.length > 9) {
                    e.target.value = e.target.value.substring(0, 9);
                }
            });
        }

        // 항공권 신청 진행 버튼
        if (this.elements.proceedToFlightRequest) {
            this.elements.proceedToFlightRequest.addEventListener('click', () => {
                this.showFlightRequestPage();
                setTimeout(() => {
                    this.loadFlightRequestData();
                }, 200);
            });
        }
    }

    // 여권 이미지 업로드 처리
    handlePassportImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 유효성 검사
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('JPG, PNG 형식의 이미지만 업로드 가능합니다.');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showError('파일 크기는 5MB를 초과할 수 없습니다.');
            event.target.value = '';
            return;
        }

        this.passportImageFile = file;

        // 미리보기 표시
        const reader = new FileReader();
        reader.onload = (e) => {
            this.showPassportImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    // 여권 이미지 미리보기 표시
    showPassportImagePreview(src) {
        if (this.elements.passportPreviewImg && this.elements.passportImagePreview) {
            this.elements.passportPreviewImg.src = src;
            this.elements.passportImagePreview.style.display = 'block';
        }
    }

    // 여권 이미지 제거
    removePassportImage() {
        this.passportImageFile = null;
        this.existingPassportImageUrl = null;
        
        if (this.elements.passportImage) {
            this.elements.passportImage.value = '';
        }
        if (this.elements.passportImagePreview) {
            this.elements.passportImagePreview.style.display = 'none';
        }
        if (this.elements.passportPreviewImg) {
            this.elements.passportPreviewImg.src = '';
        }
    }

    // 여권 만료일 검증
    validatePassportExpiryDate() {
        if (!this.elements.expiryDate || !this.elements.expiryWarning || !this.api) return true;
        
        const expiryDate = this.elements.expiryDate.value;
        if (!expiryDate) return true;

        const validation = this.api.validateExpiryDate(expiryDate);
        
        if (!validation.valid) {
            this.elements.expiryWarning.textContent = validation.message;
            this.elements.expiryWarning.style.display = 'block';
            this.elements.expiryWarning.style.color = '#dc3545';
            return false;
        }

        if (validation.warning) {
            this.elements.expiryWarning.textContent = validation.warning;
            this.elements.expiryWarning.style.display = 'block';
            this.elements.expiryWarning.style.color = '#ff6b00';
        } else {
            this.elements.expiryWarning.style.display = 'none';
        }

        return true;
    }

    // 🔧 v8.4.1: 강화된 여권정보 제출 처리
    async handlePassportSubmit(event) {
        event.preventDefault();

        try {
            console.log('🔄 [UI디버그] 여권정보 제출 시작...');
            
            // API 초기화 확인
            await this.ensureInitialized();
            
            if (!this.api) {
                throw new Error('API가 초기화되지 않았습니다');
            }

            // 만료일 검증
            const validation = this.api.validateExpiryDate(this.elements.expiryDate?.value);
            if (!validation.valid) {
                this.showError(validation.message);
                return;
            }

            // 이미지 확인 (신규 등록 시 필수)
            if (!this.passportImageFile && !this.existingPassportImageUrl) {
                this.showError('여권 사본을 업로드해주세요.');
                return;
            }

            this.setPassportLoading(true);

            const passportData = {
                passport_number: this.elements.passportNumber?.value?.trim() || '',
                name_english: this.elements.nameEnglish?.value?.trim() || '',
                issue_date: this.elements.issueDate?.value || '',
                expiry_date: this.elements.expiryDate?.value || ''
            };

            console.log('🔍 [UI디버그] 여권정보 저장 데이터:', passportData);

            const result = await this.api.savePassportInfo(passportData, this.passportImageFile);

            console.log('✅ [UI디버그] 여권정보 저장 성공:', result);

            // 성공 시 성공 메시지 표시 후 항공권 신청 페이지로 안내
            this.showPassportSuccessTransition(result.isUpdate);

        } catch (error) {
            console.error('❌ [UI디버그] 여권정보 저장 실패:', error);
            this.showError(error.message || '저장 중 오류가 발생했습니다.');
        } finally {
            this.setPassportLoading(false);
        }
    }

    // 여권정보 성공 전환 표시
    showPassportSuccessTransition(isUpdate) {
        // 폼 숨기고 성공 메시지 표시
        if (this.elements.passportForm) {
            this.elements.passportForm.style.display = 'none';
        }
        if (this.elements.passportSuccessMessage) {
            this.elements.passportSuccessMessage.style.display = 'block';
        }

        // 성공 메시지 업데이트
        const successTitle = this.elements.passportSuccessMessage.querySelector('h3');
        if (successTitle) {
            successTitle.textContent = isUpdate ? 
                '여권정보가 성공적으로 수정되었습니다!' : 
                '여권정보가 성공적으로 등록되었습니다!';
        }

        // 자동으로 항공권 신청 페이지로 이동 (3초 후)
        setTimeout(() => {
            this.showFlightRequestPage();
            setTimeout(() => {
                this.loadFlightRequestData();
            }, 200);
        }, 3000);
    }

    // 여권정보 로딩 상태 표시
    showPassportLoading(show) {
        if (this.elements.passportLoadingState) {
            this.elements.passportLoadingState.style.display = show ? 'flex' : 'none';
        }
        if (this.elements.passportForm) {
            this.elements.passportForm.style.display = show ? 'none' : 'block';
        }
    }

    // 여권정보 제출 버튼 로딩 상태
    setPassportLoading(loading) {
        if (this.elements.passportSubmitBtn) {
            this.elements.passportSubmitBtn.disabled = loading;
        }
        if (this.elements.passportSubmitBtnText) {
            this.elements.passportSubmitBtnText.textContent = loading ? '처리 중...' : 
                (this.existingPassportImageUrl ? '수정하기' : '저장하기');
        }
    }

    // === FLIGHT REQUEST UI 기능 ===

    // 🛠️ v8.4.1: 항공권 신청 데이터만 로드 (무한 루프 방지)
    async loadFlightRequestData() {
        // 🛠️ v8.4.1: 중복 로딩 방지
        if (this.isLoadingData) {
            console.log('⚠️ [UI디버그] 이미 데이터 로딩 중 - 중복 실행 방지');
            return;
        }

        try {
            this.isLoadingData = true;
            console.log('🔄 [UI디버그] 항공권 신청 데이터 로드 시작 (v8.4.1)');
            
            // API 초기화 확인
            await this.ensureInitialized();
            
            this.showLoading(true);

            // 기존 신청 확인
            this.existingRequest = await this.api.getExistingRequest();
            
            if (this.existingRequest) {
                if (this.existingRequest.status === 'rejected') {
                    // 반려된 경우 수정 폼 표시
                    this.showRequestForm(true);
                    this.populateForm(this.existingRequest);
                } else {
                    // 기존 신청 내역 표시
                    this.showExistingRequest();
                }
            } else {
                // 새 신청 폼 표시
                this.showRequestForm(false);
            }

            console.log('✅ [UI디버그] 항공권 신청 데이터 로드 완료 (v8.4.1)');
        } catch (error) {
            console.error('❌ [UI디버그] 항공권 신청 데이터 로드 실패:', error);
            if (this.utils) {
                this.utils.showError('데이터를 불러오는 중 오류가 발생했습니다.');
            } else {
                this.showError('데이터를 불러오는 중 오류가 발생했습니다.');
            }
        } finally {
            this.showLoading(false);
            this.isLoadingData = false;
        }
    }

    setupEventListeners() {
        // DOM 요소 null 체크 강화
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        if (this.elements.ticketSubmitForm) {
            this.elements.ticketSubmitForm.addEventListener('submit', (e) => this.handleTicketSubmit(e));
        }
        
        if (this.elements.receiptSubmitForm) {
            this.elements.receiptSubmitForm.addEventListener('submit', (e) => this.handleReceiptSubmit(e));
        }

        // 구매 방식 변경
        if (this.elements.purchaseType && this.elements.purchaseType.length > 0) {
            this.elements.purchaseType.forEach(radio => {
                radio.addEventListener('change', () => this.handlePurchaseTypeChange());
            });
        }

        // 날짜 변경
        if (this.elements.departureDate) {
            this.elements.departureDate.addEventListener('change', () => this.validateDuration());
        }
        
        if (this.elements.returnDate) {
            this.elements.returnDate.addEventListener('change', () => this.validateDuration());
        }

        // 이미지 업로드
        if (this.elements.flightImage) {
            this.elements.flightImage.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        if (this.elements.removeImage) {
            this.elements.removeImage.addEventListener('click', () => this.removeImage());
        }

        // 파일 업로드
        if (this.elements.ticketFile) {
            this.elements.ticketFile.addEventListener('change', (e) => this.handleFileUpload(e, 'ticket'));
        }
        
        if (this.elements.receiptFile) {
            this.elements.receiptFile.addEventListener('change', (e) => this.handleFileUpload(e, 'receipt'));
        }

        // 오늘 날짜로 최소값 설정
        const today = new Date().toISOString().split('T')[0];
        if (this.elements.departureDate) {
            this.elements.departureDate.min = today;
        }
        if (this.elements.returnDate) {
            this.elements.returnDate.min = today;
        }
    }

    showLoading(show) {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = show ? 'flex' : 'none';
        }
        if (this.elements.mainContent) {
            this.elements.mainContent.style.display = show ? 'none' : 'block';
        }
    }

    showPassportAlert() {
        if (this.elements.passportAlert) {
            this.elements.passportAlert.style.display = 'flex';
        }
        if (this.elements.requestForm) {
            this.elements.requestForm.style.display = 'none';
        }
        if (this.elements.existingRequest) {
            this.elements.existingRequest.style.display = 'none';
        }
    }

    showRequestForm(isUpdate) {
        if (this.elements.passportAlert) {
            this.elements.passportAlert.style.display = 'none';
        }
        if (this.elements.requestForm) {
            this.elements.requestForm.style.display = 'block';
        }
        if (this.elements.existingRequest) {
            this.elements.existingRequest.style.display = 'none';
        }
        
        if (this.elements.submitBtnText) {
            this.elements.submitBtnText.textContent = isUpdate ? '수정하기' : '신청하기';
        }
    }

    showExistingRequest() {
        if (this.elements.passportAlert) {
            this.elements.passportAlert.style.display = 'none';
        }
        if (this.elements.requestForm) {
            this.elements.requestForm.style.display = 'none';
        }
        if (this.elements.existingRequest) {
            this.elements.existingRequest.style.display = 'block';
        }
        
        // 기존 신청 내역 렌더링
        this.renderExistingRequest();
    }

    renderExistingRequest() {
        if (!this.existingRequest || !this.elements.existingRequest || !this.utils) return;
        
        const request = this.existingRequest;
        const statusInfo = this.utils.getStatusInfo(request.status);
        
        let html = `
            <div class="request-status-card">
                <div class="request-header">
                    <h2>항공권 신청 현황</h2>
                    <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                </div>
                
                <div class="request-info">
                    <div class="info-group">
                        <label>구매 방식</label>
                        <p>${this.utils.getPurchaseTypeText(request.purchase_type)}</p>
                    </div>
                    <div class="info-group">
                        <label>여행 기간</label>
                        <p>${this.utils.formatDate(request.departure_date)} ~ ${this.utils.formatDate(request.return_date)}</p>
                    </div>
                    <div class="info-group">
                        <label>경로</label>
                        <p>${request.departure_airport} → ${request.arrival_airport}</p>
                    </div>
                    <div class="info-group">
                        <label>신청일</label>
                        <p>${this.utils.formatDateTime(request.created_at)}</p>
                    </div>
        `;
        
        // 상태별 추가 정보
        if (request.status === 'rejected' && request.rejection_reason) {
            html += `
                    <div class="info-group">
                        <label class="text-danger">반려 사유</label>
                        <p class="text-danger">${request.rejection_reason}</p>
                    </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="request-actions">
        `;
        
        // 상태별 액션 버튼 (기존 로직과 동일)
        if (request.status === 'pending') {
            html += `
                    <button class="btn btn-secondary" onclick="flightRequestUI.showUpdateForm()">
                        <i data-lucide="edit"></i>
                        수정하기
                    </button>
                    <button class="btn btn-danger" onclick="flightRequestUI.deleteRequest('${request.id}')">
                        <i data-lucide="trash-2"></i>
                        삭제하기
                    </button>
            `;
        } else if (request.status === 'rejected') {
            html += `
                    <button class="btn btn-danger" onclick="flightRequestUI.deleteRequest('${request.id}')">
                        <i data-lucide="trash-2"></i>
                        삭제하고 재신청
                    </button>
            `;
        }
        
        html += `
                    <button class="btn btn-secondary" onclick="window.location.href='dashboard.html'">
                        <i data-lucide="arrow-left"></i>
                        뒤로가기
                    </button>
                </div>
            </div>
        `;
        
        this.elements.existingRequest.innerHTML = html;
        
        // Lucide 아이콘 재초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    showUpdateForm() {
        this.showRequestForm(true);
        this.populateForm(this.existingRequest);
    }

    populateForm(request) {
        // 구매 방식
        if (this.elements.purchaseType && this.elements.purchaseType.length > 0) {
            const purchaseTypeRadio = Array.from(this.elements.purchaseType)
                .find(radio => radio.value === request.purchase_type);
            if (purchaseTypeRadio) purchaseTypeRadio.checked = true;
        }
        
        // 날짜
        if (this.elements.departureDate) {
            this.elements.departureDate.value = request.departure_date;
        }
        if (this.elements.returnDate) {
            this.elements.returnDate.value = request.return_date;
        }
        
        // 공항
        if (this.elements.departureAirport) {
            this.elements.departureAirport.value = request.departure_airport;
        }
        if (this.elements.arrivalAirport) {
            this.elements.arrivalAirport.value = request.arrival_airport;
        }
        
        // 구매 링크
        if (request.purchase_link && this.elements.purchaseLink) {
            this.elements.purchaseLink.value = request.purchase_link;
        }
        
        // 구매 방식에 따른 UI 업데이트
        this.handlePurchaseTypeChange();
        
        // 파견 기간 검증
        this.validateDuration();
    }

    // 🔧 v8.4.1: 구매 링크 위치 수정 - [구매 대행]일 때 표시
    handlePurchaseTypeChange() {
        if (!this.elements.purchaseType || this.elements.purchaseType.length === 0) return;
        
        const selectedType = Array.from(this.elements.purchaseType)
            .find(radio => radio.checked)?.value;
        
        console.log('🔧 [UI디버그] v8.4.1: 구매 방식 변경:', selectedType);
        
        if (this.elements.purchaseLinkGroup) {
            // 🔧 v8.4.1: [구매 대행]일 때 구매 링크 표시 (기존: direct → agency)
            if (selectedType === 'agency') {
                this.elements.purchaseLinkGroup.style.display = 'block';
                console.log('✅ [UI디버그] v8.4.1: 구매 링크 표시 (구매 대행)');
            } else {
                this.elements.purchaseLinkGroup.style.display = 'none';
                if (this.elements.purchaseLink) {
                    this.elements.purchaseLink.value = '';
                }
                console.log('✅ [UI디버그] v8.4.1: 구매 링크 숨김 (직접 구매)');
            }
        }
    }

    validateDuration() {
        if (!this.elements.departureDate || !this.elements.returnDate || !this.elements.durationMessage || !this.utils) {
            return true;
        }
        
        const departureDate = this.elements.departureDate.value;
        const returnDate = this.elements.returnDate.value;
        
        if (!departureDate || !returnDate) {
            this.elements.durationMessage.textContent = '';
            return true;
        }
        
        const dateValidation = this.utils.validateDates(departureDate, returnDate);
        if (!dateValidation.valid) {
            this.elements.durationMessage.textContent = dateValidation.message;
            this.elements.durationMessage.style.color = '#dc3545';
            return false;
        }
        
        const duration = this.utils.calculateDuration(departureDate, returnDate);
        const dispatchDuration = this.userProfile?.dispatch_duration || 90;
        const durationValidation = this.utils.validateDispatchDuration(duration, dispatchDuration);
        
        if (!durationValidation.valid) {
            this.elements.durationMessage.textContent = durationValidation.message;
            this.elements.durationMessage.style.color = '#dc3545';
            return false;
        }
        
        this.elements.durationMessage.textContent = `파견 기간: ${duration}일`;
        this.elements.durationMessage.style.color = '#28a745';
        return true;
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 유효성 검사
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('JPG, PNG 형식의 이미지만 업로드 가능합니다.');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showError('파일 크기는 5MB를 초과할 수 없습니다.');
            event.target.value = '';
            return;
        }

        this.imageFile = file;

        // 미리보기 표시
        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.elements.previewImg) {
                this.elements.previewImg.src = e.target.result;
            }
            if (this.elements.imagePreview) {
                this.elements.imagePreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.imageFile = null;
        if (this.elements.flightImage) {
            this.elements.flightImage.value = '';
        }
        if (this.elements.imagePreview) {
            this.elements.imagePreview.style.display = 'none';
        }
        if (this.elements.previewImg) {
            this.elements.previewImg.src = '';
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        try {
            // API 초기화 확인
            await this.ensureInitialized();

            // 날짜 및 기간 검증
            if (!this.validateDuration()) {
                return;
            }

            // 이미지 확인 (새 신청 또는 이미지 변경 시 필수)
            const isUpdate = this.existingRequest && (this.existingRequest.status === 'pending' || this.existingRequest.status === 'rejected');
            if (!isUpdate && !this.imageFile) {
                this.showError('항공권 정보 이미지를 업로드해주세요.');
                return;
            }

            this.setLoading(true);

            const selectedType = Array.from(this.elements.purchaseType || [])
                .find(radio => radio.checked)?.value || 'direct';

            const requestData = {
                purchase_type: selectedType,
                departure_date: this.elements.departureDate?.value || '',
                return_date: this.elements.returnDate?.value || '',
                departure_airport: this.elements.departureAirport?.value?.trim() || '',
                arrival_airport: this.elements.arrivalAirport?.value?.trim() || '',
                // 🔧 v8.4.1: 구매 대행일 때만 purchase_link 저장
                purchase_link: selectedType === 'agency' ? this.elements.purchaseLink?.value?.trim() || null : null
            };

            let result;
            if (isUpdate) {
                requestData.version = this.existingRequest.version;
                requestData.status = 'pending'; // 수정 시 pending으로 변경
                result = await this.api.updateFlightRequest(
                    this.existingRequest.id,
                    requestData,
                    this.imageFile
                );
                this.showSuccess('항공권 신청이 성공적으로 수정되었습니다.');
            } else {
                result = await this.api.createFlightRequest(requestData, this.imageFile);
                this.showSuccess('항공권 신청이 성공적으로 접수되었습니다.');
            }

            // 3초 후 메인 페이지로 이동
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);

        } catch (error) {
            console.error('신청 실패:', error);
            this.showError(error.message || '신청 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        if (this.elements.submitBtn) {
            this.elements.submitBtn.disabled = loading;
        }
        
        const isUpdate = this.existingRequest && (this.existingRequest.status === 'pending' || this.existingRequest.status === 'rejected');
        if (this.elements.submitBtnText) {
            this.elements.submitBtnText.textContent = loading ? '처리 중...' : 
                (isUpdate ? '수정하기' : '신청하기');
        }
    }

    // 🔧 v8.4.1: 개선된 에러 메시지 표시 (passport와 flight 공통)
    showError(message) {
        console.error('🚨 [UI오류]:', message);
        
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';
            
            // 자동 스크롤
            this.elements.errorMessage.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // 10초 후 자동 숨김 (기존 5초에서 연장)
            setTimeout(() => {
                if (this.elements.errorMessage) {
                    this.elements.errorMessage.style.display = 'none';
                }
            }, 10000);
        } else {
            // 폴백: alert 사용
            alert('오류: ' + message);
        }
    }

    // 성공 메시지 표시
    showSuccess(message) {
        console.log('✅ [UI성공]:', message);
        
        if (this.elements.successMessage) {
            this.elements.successMessage.textContent = message;
            this.elements.successMessage.style.display = 'block';
            
            // 자동 스크롤
            this.elements.successMessage.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // 5초 후 자동 숨김
            setTimeout(() => {
                if (this.elements.successMessage) {
                    this.elements.successMessage.style.display = 'none';
                }
            }, 5000);
        } else {
            // 폴백: alert 사용
            alert('성공: ' + message);
        }
    }

    // 기타 메서드들 (간소화된 버전)
    handleFileUpload(event, type) {
        console.log(`파일 업로드: ${type}`, event.target.files[0]);
    }

    async handleTicketSubmit(event) {
        event.preventDefault();
        console.log('항공권 제출:', this.ticketFile);
    }

    async handleReceiptSubmit(event) {
        event.preventDefault();
        console.log('영수증 제출:', this.receiptFile);
    }

    async deleteRequest(requestId) {
        if (!confirm('정말로 신청을 삭제하시겠습니까?')) {
            return;
        }
        console.log('신청 삭제:', requestId);
        window.location.reload();
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    removeFile(type) {
        if (type === 'ticket') {
            this.ticketFile = null;
        } else if (type === 'receipt') {
            this.receiptFile = null;
        }
    }
}

// 페이지 로드 시 초기화 제거 - HTML에서 모듈 로딩 완료 후 초기화
console.log('✅ FlightRequestUI v8.4.1 모듈 로드 완료 - 여권정보 로딩 문제 해결을 위한 초기화 순서 개선 및 에러 처리 강화');
