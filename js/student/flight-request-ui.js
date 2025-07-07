// flight-request-ui.js - 항공권 신청 UI 관리 모듈 v8.1.2
// 🐛 반려 상태 UI 표시 문제 수정
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
        this.existingPassportInfo = null; // 🛠️ v8.5.0: 기존 여권정보 저장
        this.isViewMode = false; // 🛠️ v8.5.0: 여권정보 보기/편집 모드
        
        // 🛠️ v8.5.0: 무한 루프 방지 플래그
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
            
            // 🛠️ v8.5.0: 여권정보 보기 모드용 요소들 추가
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
            
            // 🆕 v8.5.0: 가격 정보 관련 요소들 추가
            ticketPrice: document.getElementById('ticketPrice'),
            currency: document.getElementById('currency'),
            priceSource: document.getElementById('priceSource'),
            
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
            console.log('🔄 FlightRequestUI v8.1.2 초기화 시작 (반려 상태 UI 표시 수정)...');
            
            // API 및 유틸리티 대기
            await this.waitForDependencies();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 🛠️ v8.5.0: 초기화 시 자동으로 데이터 로드 시작
            setTimeout(() => {
                this.loadInitialData();
            }, 300);
            
            console.log('✅ FlightRequestUI v8.1.2 초기화 완료 - 반려 상태 UI 표시 수정');
            
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ FlightRequestUI 초기화 오류:', error);
            this.showError('시스템 초기화 중 오류가 발생했습니다.');
        }
    }

    // 🔧 v8.5.0: 강화된 의존성 대기 로직
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
                    console.log('✅ [UI디버그] FlightRequestUI v8.1.2 의존성 로드 완료');
                    
                    // 🔧 v8.5.0: API 상태 추가 확인
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

    // 🛠️ v8.5.0: 강화된 초기 데이터 로드 (상세한 디버깅)
    async loadInitialData() {
        try {
            console.log('🔄 [UI디버그] v8.1.2 초기 데이터 로드 시작 - 반려 상태 UI 표시 수정');
            
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
            
            // 🔧 v8.5.0: 여권정보 확인 - 더 상세한 로그
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

    // 🛠️ v8.5.0: 데이터 없이 항공권 신청 페이지 표시 (폴백)
    showFlightRequestPageWithoutData() {
        console.log('🔄 [UI디버그] v8.1.2 기본 항공권 신청 페이지 표시 (데이터 없음)');
        
        // 항공권 신청 페이지 표시
        this.showFlightRequestPage();
        
        // 여권정보 알림 표시
        this.showPassportAlert();
        
        console.log('✅ [UI디버그] 기본 UI 표시 완료');
    }

    // 🔧 v8.5.0: 여권정보 등록 페이지 표시 개선
    async showPassportInfoPage() {
        try {
            console.log('🔄 [UI디버그] v8.1.2 여권정보 페이지 표시...');
            
            // 페이지 전환
            const flightRequestPage = document.getElementById('flightRequestPage');
            const passportInfoPage = document.getElementById('passportInfoPage');
            
            if (flightRequestPage && passportInfoPage) {
                flightRequestPage.classList.remove('active');
                passportInfoPage.classList.add('active');
            }
            
            // 🔧 v8.5.0: DOM 안정화 대기 후 폼 자동 채우기 실행
            setTimeout(async () => {
                try {
                    await this.initializePassportInfoUI();
                    await this.loadExistingPassportDataAndSetMode();
                } catch (error) {
                    console.error('❌ [UI디버그] 여권정보 UI 초기화 실패:', error);
                }
            }, 200);
            
            console.log('✅ [UI디버그] v8.1.2 여권정보 페이지 표시 완료');
        } catch (error) {
            console.error('❌ [UI디버그] 여권정보 페이지 표시 실패:', error);
        }
    }

    // 항공권 신청 페이지 표시
    showFlightRequestPage() {
        if (typeof window.showFlightRequestPage === 'function') {
            window.showFlightRequestPage();
        }
    }

    // === 🔧 v8.5.0: 강화된 PASSPORT INFO UI 기능 ===

    // 여권정보 UI 초기화
    async initializePassportInfoUI() {
        try {
            console.log('🔧 [UI디버그] v8.1.2 여권정보 UI 초기화 시작 (자동 폼 채우기 기능)');
            
            // API 초기화 확인
            await this.ensureInitialized();
            
            // 여권정보 이벤트 리스너 설정
            this.setupPassportEventListeners();
            
            console.log('✅ [UI디버그] v8.1.2 여권정보 UI 초기화 완료');
        } catch (error) {
            console.error('❌ [UI디버그] 여권정보 UI 초기화 오류:', error);
            this.showError('여권정보 UI 초기화 중 오류가 발생했습니다: ' + error.message);
        }
    }

    // 🛠️ v8.5.0: 개선된 기존 여권정보 로드 및 모드 설정
    async loadExistingPassportDataAndSetMode() {
        try {
            console.log('🔄 [UI디버그] v8.1.2 기존 여권정보 로드 및 모드 설정 시작...');
            
            const passportInfo = await window.flightRequestAPI.getPassportInfo();
            
            if (passportInfo) {
                console.log('✅ [UI디버그] v8.1.2 기존 여권정보 발견 - 폼 채우기 실행');
                await this.populatePassportForm(passportInfo);
                return true;
            } else {
                console.log('ℹ️ [UI디버그] v8.1.2 기존 여권정보 없음 - 신규 등록 모드');
                return false;
            }
        } catch (error) {
            console.error('❌ [UI디버그] v8.1.2 여권정보 로딩 실패:', error);
            return false;
        }
    }

    // 🛠️ v8.5.0: 개선된 여권정보 폼 채우기
    async populatePassportForm(passportData) {
        try {
            console.log('🔄 [UI디버그] v8.1.2 여권정보 폼 채우기 시작...', passportData);
            
            // 폼 필드 채우기
            const passportNumber = document.getElementById('passportNumber');
            const nameEnglish = document.getElementById('nameEnglish');
            const issueDate = document.getElementById('issueDate');
            const expiryDate = document.getElementById('expiryDate');
            
            if (passportNumber) passportNumber.value = passportData.passport_number || '';
            if (nameEnglish) nameEnglish.value = passportData.name_english || '';
            if (issueDate) issueDate.value = passportData.issue_date || '';
            if (expiryDate) expiryDate.value = passportData.expiry_date || '';
            
            // 이미지 미리보기 설정
            if (passportData.image_url) {
                const imagePreview = document.getElementById('passportImagePreview');
                const previewImg = document.getElementById('passportPreviewImg');
                const uploadLabel = document.querySelector('label[for="passportImage"]');
                
                if (imagePreview && previewImg) {
                    previewImg.src = passportData.image_url;
                    imagePreview.style.display = 'block';
                    if (uploadLabel) uploadLabel.style.display = 'none';
                }
            }
            
            console.log('✅ [UI디버그] v8.1.2 여권정보 폼 채우기 완료');
            return true;
        } catch (error) {
            console.error('❌ [UI디버그] v8.1.2 폼 채우기 실패:', error);
            return false;
        }
    }

    // 🛠️ v8.5.0: 여권정보 보기 모드 표시
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

    // 🛠️ v8.5.0: 여권정보 편집 모드 표시
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

    // 🛠️ v8.5.0: 여권정보 보기 모드 닫기
    closePassportView() {
        console.log('🔄 [UI디버그] v8.1.2 여권정보 보기 닫기 - 항공권 신청 페이지로 이동');
        this.showFlightRequestPage();
        
        // 항공권 신청 데이터 로드
        setTimeout(() => {
            this.loadFlightRequestData();
        }, 200);
    }

    // 🛠️ v8.5.0: 여권정보 편집 모드로 전환
    editPassportInfo() {
        console.log('🔄 [UI디버그] v8.1.2 여권정보 편집 모드로 전환');
        this.isViewMode = false;
        this.showPassportEditMode();
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

    // 🆕 v8.5.0: 가격 포맷팅 유틸리티
    formatPrice(price, currency) {
        if (!price) return '-';
        
        try {
            const numPrice = parseFloat(price);
            const formatter = new Intl.NumberFormat('ko-KR');
            
            switch(currency) {
                case 'KRW':
                    return `${formatter.format(numPrice)}원`;
                case 'USD':
                    return `$${formatter.format(numPrice)}`;
                case 'CNY':
                    return `¥${formatter.format(numPrice)}`;
                case 'JPY':
                    return `¥${formatter.format(numPrice)}`;
                case 'EUR':
                    return `€${formatter.format(numPrice)}`;
                default:
                    return `${formatter.format(numPrice)} ${currency}`;
            }
        } catch (error) {
            return `${price} ${currency}`;
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

    // 🔧 v8.5.0: 강화된 여권정보 제출 처리
    async handlePassportSubmit(event) {
        event.preventDefault();

        try {
            console.log('🔄 [UI디버그] v8.1.2 여권정보 제출 시작...');
            
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

            console.log('🔍 [UI디버그] v8.1.2 여권정보 저장 데이터:', passportData);

            const result = await this.api.savePassportInfo(passportData, this.passportImageFile);

            console.log('✅ [UI디버그] v8.1.2 여권정보 저장 성공:', result);

            // 성공 시 성공 메시지 표시 후 항공권 신청 페이지로 안내
            this.showPassportSuccessTransition(result.isUpdate);

        } catch (error) {
            console.error('❌ [UI디버그] v8.1.2 여권정보 저장 실패:', error);
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

    // 🐛 v8.1.2: 반려 상태 UI 표시 문제 수정
    async loadFlightRequestData() {
        // 🛠️ v8.5.0: 중복 로딩 방지
        if (this.isLoadingData) {
            console.log('⚠️ [UI디버그] 이미 데이터 로딩 중 - 중복 실행 방지');
            return;
        }

        try {
            this.isLoadingData = true;
            console.log('🔄 [UI디버그] 항공권 신청 데이터 로드 시작 (v8.1.2 - 반려 상태 UI 표시 수정)');
            
            // API 초기화 확인
            await this.ensureInitialized();
            
            this.showLoading(true);

            // 기존 신청 확인
            this.existingRequest = await this.api.getExistingRequest();
            
            if (this.existingRequest) {
                // 🐛 v8.1.2: 반려 상태도 기존 신청 내역 표시 (반려 사유 포함)
                console.log('✅ [UI디버그] v8.1.2: 기존 신청 발견 - 상태별 정보 표시:', this.existingRequest.status);
                this.showExistingRequest();
            } else {
                // 새 신청 폼 표시
                console.log('✅ [UI디버그] v8.1.2: 신규 신청 - 신청 폼 표시');
                this.showRequestForm(false);
            }

            console.log('✅ [UI디버그] 항공권 신청 데이터 로드 완료 (v8.1.2)');
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

        // 🆕 v8.5.0: 가격 정보 관련 이벤트 리스너 추가
        this.setupPriceEventListeners();

        // 오늘 날짜로 최소값 설정
        const today = new Date().toISOString().split('T')[0];
        if (this.elements.departureDate) {
            this.elements.departureDate.min = today;
        }
        if (this.elements.returnDate) {
            this.elements.returnDate.min = today;
        }
    }

    // 🆕 v8.5.0: 가격 정보 이벤트 리스너 설정
    setupPriceEventListeners() {
        // 가격 입력 시 숫자만 허용
        if (this.elements.ticketPrice) {
            this.elements.ticketPrice.addEventListener('input', (e) => {
                // 숫자만 허용
                let value = e.target.value.replace(/[^\d]/g, '');
                if (value) {
                    e.target.value = value;
                }
            });

            // 가격 검증
            this.elements.ticketPrice.addEventListener('blur', (e) => {
                this.validatePriceInput();
            });
        }

        // 통화 변경 시 힌트 업데이트
        if (this.elements.currency) {
            this.elements.currency.addEventListener('change', (e) => {
                this.updatePriceHint();
                this.validatePriceInput();
            });
        }

        // 가격 출처 입력 검증
        if (this.elements.priceSource) {
            this.elements.priceSource.addEventListener('input', (e) => {
                // 최대 길이 제한
                if (e.target.value.length > 100) {
                    e.target.value = e.target.value.substring(0, 100);
                }
            });
        }
    }

    // 🆕 v8.5.0: 가격 입력 검증
    validatePriceInput() {
        if (!this.elements.ticketPrice || !this.elements.currency || !this.api) {
            return true;
        }

        const price = this.elements.ticketPrice.value;
        const currency = this.elements.currency.value;

        if (!price || !currency) {
            return true;
        }

        try {
            // API를 통한 가격 범위 검증
            const validation = this.api.validatePriceByCurrency(price, currency);
            
            if (!validation.valid) {
                console.warn('⚠️ [가격검증]', validation.message);
                // 경고 표시 (선택적)
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ 가격 검증 오류:', error);
            return true; // 검증 오류 시 통과
        }
    }

    // 🆕 v8.5.0: 통화별 가격 힌트 업데이트
    updatePriceHint() {
        if (!this.elements.ticketPrice || !this.elements.currency) {
            return;
        }

        const currency = this.elements.currency.value;
        const priceInput = this.elements.ticketPrice;
        const hint = priceInput.nextElementSibling;

        if (hint && hint.classList.contains('form-hint')) {
            switch(currency) {
                case 'KRW':
                    hint.textContent = '숫자만 입력해주세요 (천 원 단위 권장)';
                    priceInput.placeholder = '예: 850000';
                    break;
                case 'USD':
                    hint.textContent = '숫자만 입력해주세요 (달러 단위)';
                    priceInput.placeholder = '예: 650';
                    break;
                case 'CNY':
                    hint.textContent = '숫자만 입력해주세요 (위안 단위)';
                    priceInput.placeholder = '예: 4800';
                    break;
                case 'JPY':
                    hint.textContent = '숫자만 입력해주세요 (엔 단위)';
                    priceInput.placeholder = '예: 95000';
                    break;
                default:
                    hint.textContent = '숫자만 입력해주세요';
                    priceInput.placeholder = '가격을 입력하세요';
            }
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

    // 🆕 v8.5.0: 가격 정보가 포함된 기존 신청 내역 렌더링
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
        `;

        // 🆕 v8.5.0: 가격 정보 표시 추가
        if (request.ticket_price && request.currency) {
            html += `
                    <div class="info-group">
                        <label>항공권 가격</label>
                        <p class="price-display">${this.formatPrice(request.ticket_price, request.currency)}</p>
                    </div>
            `;
        }

        if (request.price_source) {
            html += `
                    <div class="info-group">
                        <label>가격 출처</label>
                        <p>${request.price_source}</p>
                    </div>
            `;
        }

        html += `
                    <div class="info-group">
                        <label>신청일</label>
                        <p>${this.utils.formatDateTime(request.created_at)}</p>
                    </div>
        `;
        
        // 🐛 v8.1.2: 반려 상태일 때 반려 사유 표시 - 더 명확하게 강조
        if (request.status === 'rejected' && request.rejection_reason) {
            html += `
                    <div class="info-group rejection-reason-section">
                        <label class="text-danger rejection-label">
                            <i class="icon-alert-triangle"></i>
                            반려 사유
                        </label>
                        <div class="rejection-reason-box">
                            <p class="text-danger rejection-text">${request.rejection_reason}</p>
                        </div>
                    </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="request-actions">
        `;
        
        // 🐛 v8.1.2: 상태별 액션 버튼 (반려 상태 처리 개선)
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
                    <div class="rejected-actions">
                        <p class="rejected-notice">
                            <i class="icon-info"></i>
                            반려된 신청을 삭제하고 새로 신청하거나, 기존 내용을 수정할 수 있습니다.
                        </p>
                        <button class="btn btn-primary" onclick="flightRequestUI.showUpdateForm()">
                            <i data-lucide="edit"></i>
                            수정하기
                        </button>
                        <button class="btn btn-danger" onclick="flightRequestUI.deleteRequest('${request.id}')">
                            <i data-lucide="trash-2"></i>
                            삭제하고 재신청
                        </button>
                    </div>
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

        // 🐛 v8.1.2: 반려 상태일 때 추가 CSS 스타일 적용
        if (request.status === 'rejected') {
            const statusCard = this.elements.existingRequest.querySelector('.request-status-card');
            if (statusCard) {
                statusCard.classList.add('rejected-status');
            }
        }
    }

    showUpdateForm() {
        this.showRequestForm(true);
        this.populateForm(this.existingRequest);
    }

    // 🆕 v8.5.0: 가격 정보가 포함된 폼 채우기
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
        
        // 🆕 v8.5.0: 가격 정보 채우기
        if (this.elements.ticketPrice && request.ticket_price) {
            this.elements.ticketPrice.value = request.ticket_price;
        }
        if (this.elements.currency && request.currency) {
            this.elements.currency.value = request.currency;
            this.updatePriceHint(); // 통화에 맞는 힌트 업데이트
        }
        if (this.elements.priceSource && request.price_source) {
            this.elements.priceSource.value = request.price_source;
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

    // 🔧 v8.5.0: 구매 링크 위치 수정 - [구매 대행]일 때 표시
    handlePurchaseTypeChange() {
        if (!this.elements.purchaseType || this.elements.purchaseType.length === 0) return;
        
        const selectedType = Array.from(this.elements.purchaseType)
            .find(radio => radio.checked)?.value;
        
        console.log('🔧 [UI디버그] v8.1.2: 구매 방식 변경:', selectedType);
        
        if (this.elements.purchaseLinkGroup) {
            // 🔧 v8.5.0: [구매 대행]일 때 구매 링크 표시 (기존: direct → agency)
            if (selectedType === 'agency') {
                this.elements.purchaseLinkGroup.style.display = 'block';
                console.log('✅ [UI디버그] v8.1.2: 구매 링크 표시 (구매 대행)');
            } else {
                this.elements.purchaseLinkGroup.style.display = 'none';
                if (this.elements.purchaseLink) {
                    this.elements.purchaseLink.value = '';
                }
                console.log('✅ [UI디버그] v8.1.2: 구매 링크 숨김 (직접 구매)');
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

    // 🆕 v8.5.0: 가격 정보가 포함된 항공권 신청 제출
    async handleSubmit(event) {
        event.preventDefault();

        try {
            // API 초기화 확인
            await this.ensureInitialized();

            // 날짜 및 기간 검증
            if (!this.validateDuration()) {
                return;
            }

            // 🆕 v8.5.0: 가격 정보 검증
            if (!this.validatePriceFields()) {
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

            // 🆕 v8.5.0: 가격 정보 포함한 요청 데이터 구성
            const requestData = {
                purchase_type: selectedType,
                departure_date: this.elements.departureDate?.value || '',
                return_date: this.elements.returnDate?.value || '',
                departure_airport: this.elements.departureAirport?.value?.trim() || '',
                arrival_airport: this.elements.arrivalAirport?.value?.trim() || '',
                // 🔧 v8.5.0: 구매 대행일 때만 purchase_link 저장
                purchase_link: selectedType === 'agency' ? this.elements.purchaseLink?.value?.trim() || null : null,
                // 🆕 v8.5.0: 가격 정보 추가
                ticket_price: this.elements.ticketPrice?.value || '',
                currency: this.elements.currency?.value || 'KRW',
                price_source: this.elements.priceSource?.value?.trim() || ''
            };

            console.log('🔍 [UI디버그] v8.1.2 제출 데이터 (가격 정보 포함):', {
                ...requestData,
                ticket_price: requestData.ticket_price,
                currency: requestData.currency,
                price_source: requestData.price_source
            });

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

    // 🆕 v8.5.0: 가격 정보 필드 검증
    validatePriceFields() {
        const ticketPrice = this.elements.ticketPrice?.value?.trim();
        const currency = this.elements.currency?.value;
        const priceSource = this.elements.priceSource?.value?.trim();

        if (!ticketPrice) {
            this.showError('항공권 가격을 입력해주세요.');
            return false;
        }

        if (!currency) {
            this.showError('통화를 선택해주세요.');
            return false;
        }

        if (!priceSource) {
            this.showError('가격 정보 출처를 입력해주세요.');
            return false;
        }

        // 가격이 숫자인지 확인
        const priceNum = parseFloat(ticketPrice);
        if (isNaN(priceNum) || priceNum <= 0) {
            this.showError('유효한 가격을 입력해주세요.');
            return false;
        }

        return true;
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

    // 🔧 v8.5.0: 개선된 에러 메시지 표시 (passport와 flight 공통)
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

// 🔧 v8.1.2: FlightRequestUI 클래스를 전역 스코프에 노출
window.FlightRequestUI = FlightRequestUI;

// 페이지 로드 시 초기화 제거 - HTML에서 모듈 로딩 완료 후 초기화
console.log('✅ FlightRequestUI v8.1.2 모듈 로드 완료 - 반려 상태 UI 표시 문제 해결');
