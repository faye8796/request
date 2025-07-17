// flight-request-ticket-fix.js - 항공권 신청 페이지 데이터 로드 문제 해결 v8.3.0 (계속)

    updateFlightSectionAvailability() {
        try {
            console.log('🔄 [전제조건] 항공권 섹션 가용성 업데이트 시작...');
            
            // 현재 상태 확인
            const status = this.checkActivityPeriodCompletion();
            const shouldEnable = status.completed && status.valid;
            
            // 항공권 섹션 상태 업데이트
            this.flightSectionEnabled = shouldEnable;
            
            console.log('📊 [전제조건] 항공권 섹션 활성화 조건:', {
                현지활동기간완료: status.completed,
                현지활동기간유효: status.valid,
                항공권섹션활성화: shouldEnable
            });
            
            // UI 요소 상태 변경
            this.toggleFlightInputFields(shouldEnable);
            
            // 상태 메시지 업데이트
            this.updatePrerequisiteStatusMessage(status);
            
            console.log('✅ [전제조건] 항공권 섹션 가용성 업데이트 완료:', {
                항공권섹션상태: shouldEnable ? '활성화' : '비활성화',
                실제UI변경: '✅ 완료'
            });
            
        } catch (error) {
            console.error('❌ [전제조건] 항공권 섹션 가용성 업데이트 실패:', error);
            
            // 오류 시 보수적으로 비활성화
            this.flightSectionEnabled = false;
            this.toggleFlightInputFields(false);
        }
    }

    toggleFlightInputFields(enabled) {
        try {
            console.log('🔄 [전제조건] 항공권 입력 필드 활성화/비활성화:', enabled);
            
            // 항공권 관련 입력 필드들
            const flightInputSelectors = [
                '#departureDate',
                '#returnDate',
                '#departureAirport',
                '#arrivalAirport',
                '#ticketPrice',
                '#currency',
                '#priceSource',
                '#purchaseLink',
                '#flightImage',
                'input[name="purchaseType"]'
            ];
            
            let changedElements = 0;
            
            // 각 요소의 활성화/비활성화 처리
            flightInputSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element) {
                        element.disabled = !enabled;
                        
                        // 시각적 스타일 변경
                        if (enabled) {
                            element.style.opacity = '1';
                            element.style.cursor = 'auto';
                            element.style.backgroundColor = '';
                        } else {
                            element.style.opacity = '0.5';
                            element.style.cursor = 'not-allowed';
                            element.style.backgroundColor = '#f9fafb';
                        }
                        
                        changedElements++;
                    }
                });
            });
            
            // 항공권 정보 섹션 전체 스타일 변경
            const flightInfoSection = this.findFlightInfoSection();
            if (flightInfoSection) {
                if (enabled) {
                    flightInfoSection.style.opacity = '1';
                    flightInfoSection.style.filter = 'none';
                    flightInfoSection.classList.remove('disabled');
                } else {
                    flightInfoSection.style.opacity = '0.6';
                    flightInfoSection.style.filter = 'grayscale(30%)';
                    flightInfoSection.classList.add('disabled');
                }
            }
            
            // 제출 버튼 상태 변경
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = !enabled;
                
                if (enabled) {
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                } else {
                    submitBtn.style.opacity = '0.5';
                    submitBtn.style.cursor = 'not-allowed';
                }
            }
            
            console.log('✅ [전제조건] 항공권 입력 필드 상태 변경 완료:', {
                활성화상태: enabled,
                변경된요소수: changedElements,
                섹션스타일변경: !!flightInfoSection,
                제출버튼변경: !!submitBtn
            });
            
        } catch (error) {
            console.error('❌ [전제조건] 항공권 입력 필드 상태 변경 실패:', error);
        }
    }

    findFlightInfoSection() {
        const selectors = [
            '.form-section:has(#departureDate)',
            '[data-flight-info]',
            '#flightInfoSection',
            '.form-section:nth-child(3)'
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (error) {
                // 구문 에러 무시하고 계속
            }
        }
        
        const departureElement = document.getElementById('departureDate');
        if (departureElement) {
            let parent = departureElement.parentElement;
            while (parent && !parent.classList.contains('form-section')) {
                parent = parent.parentElement;
            }
            return parent;
        }
        
        return null;
    }

    updatePrerequisiteStatusMessage(status) {
        try {
            // 상태 메시지 요소 찾기
            let statusElement = document.getElementById('prerequisiteStatus') ||
                               document.querySelector('.prerequisite-status') ||
                               document.querySelector('[data-prerequisite-status]');
            
            // 상태 메시지 요소가 없으면 생성
            if (!statusElement) {
                statusElement = this.createPrerequisiteStatusElement();
            }
            
            if (statusElement) {
                if (status.completed && status.valid) {
                    // 완료 상태
                    statusElement.className = 'prerequisite-status completed';
                    statusElement.innerHTML = `
                        <i data-lucide="check-circle"></i>
                        <span>현지 활동기간 입력이 완료되었습니다. 항공권 정보를 입력해주세요.</span>
                    `;
                    statusElement.style.color = '#059669';
                    statusElement.style.backgroundColor = '#f0fdf4';
                    statusElement.style.border = '1px solid #bbf7d0';
                } else if (status.completed && !status.valid) {
                    // 입력됐지만 유효하지 않음
                    statusElement.className = 'prerequisite-status invalid';
                    statusElement.innerHTML = `
                        <i data-lucide="alert-circle"></i>
                        <span>현지 활동기간 정보가 올바르지 않습니다. 날짜를 다시 확인해주세요.</span>
                    `;
                    statusElement.style.color = '#dc2626';
                    statusElement.style.backgroundColor = '#fef2f2';
                    statusElement.style.border = '1px solid #fecaca';
                } else {
                    // 미완료 상태
                    statusElement.className = 'prerequisite-status pending';
                    statusElement.innerHTML = `
                        <i data-lucide="info"></i>
                        <span>항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.</span>
                    `;
                    statusElement.style.color = '#d97706';
                    statusElement.style.backgroundColor = '#fffbeb';
                    statusElement.style.border = '1px solid #fed7aa';
                }
                
                statusElement.style.display = 'flex';
                statusElement.style.alignItems = 'center';
                statusElement.style.gap = '8px';
                statusElement.style.padding = '12px 16px';
                statusElement.style.borderRadius = '8px';
                statusElement.style.marginBottom = '16px';
                statusElement.style.fontSize = '14px';
                statusElement.style.fontWeight = '500';
                
                // 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
            console.log('✅ [전제조건] 전제조건 상태 메시지 업데이트 완료:', {
                완료상태: status.completed,
                유효상태: status.valid,
                메시지표시: !!statusElement
            });
            
        } catch (error) {
            console.error('❌ [전제조건] 전제조건 상태 메시지 업데이트 실패:', error);
        }
    }

    createPrerequisiteStatusElement() {
        try {
            const statusElement = document.createElement('div');
            statusElement.id = 'prerequisiteStatus';
            statusElement.className = 'prerequisite-status';
            
            // 항공권 정보 섹션 상단에 삽입
            const flightInfoSection = this.findFlightInfoSection();
            if (flightInfoSection) {
                flightInfoSection.insertBefore(
                    statusElement, 
                    flightInfoSection.firstChild
                );
                
                console.log('✅ [전제조건] 전제조건 상태 메시지 요소 생성 완료');
                return statusElement;
            } else {
                console.warn('⚠️ [전제조건] 항공권 정보 섹션을 찾을 수 없어 상태 메시지 요소 생성 실패');
                return null;
            }
            
        } catch (error) {
            console.error('❌ [전제조건] 전제조건 상태 메시지 요소 생성 실패:', error);
            return null;
        }
    }

    // === 🔧 추가: 공개 인터페이스 메서드들 ===

    // 페이지 로드 시 호출되는 메서드
    async loadFlightRequestData() {
        try {
            console.log('🔄 [티켓모듈] 항공권 신청 데이터 로드 시작...');
            
            // 필수 데이터 로드
            await this.loadRequiredDataOnInit();
            
            // 기존 항공권 신청 내역 로드
            await this.loadTicketInfo();
            
            console.log('✅ [티켓모듈] 항공권 신청 데이터 로드 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] 항공권 신청 데이터 로드 실패:', error);
        }
    }

    // 검증 트리거
    triggerValidation() {
        try {
            console.log('🔄 [티켓모듈] 수동 검증 트리거...');
            
            this.validateActivityPeriod();
            this.validateFlightDatesOnly();
            this.checkActivityPeriodCompletion();
            this.updateFlightSectionAvailability();
            
            console.log('✅ [티켓모듈] 수동 검증 트리거 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] 수동 검증 트리거 실패:', error);
        }
    }

    // === 기존 메서드들 유지 (항공권 날짜 검증, 구매방식 등) ===

    setupFlightDateEvents() {
        const departureEl = document.getElementById('departureDate');
        const returnEl = document.getElementById('returnDate');
        
        [departureEl, returnEl].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.validateFlightDatesOnly();
                    this.updateDurationMessage();
                });
            }
        });
        
        // 최소 날짜 설정 (오늘 이후)
        const today = new Date().toISOString().split('T')[0];
        if (departureEl) departureEl.min = today;
        if (returnEl) returnEl.min = today;
        
        console.log('✅ [티켓모듈] 항공권 날짜 이벤트 설정 완료');
    }

    validateFlightDatesOnly() {
        try {
            console.log('🔄 [항공권검증] 항공권 날짜 검증 시작...');
            
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            if (!departureDate || !returnDate) {
                return true; // 입력되지 않은 경우는 통과
            }
            
            // Utils를 통한 순수 항공권 날짜 관계 검증
            if (this.uiService?.utils && typeof this.uiService.utils.validateFlightDatesOnly === 'function') {
                const validation = this.uiService.utils.validateFlightDatesOnly(
                    departureDate, arrivalDate, workEndDate, returnDate
                );
                
                if (!validation.valid) {
                    this.showError(validation.message);
                    return false;
                }
                
                console.log('✅ [항공권검증] 순수 항공권 날짜 관계 검증 완료:', validation);
            }
            
            // 데이터 저장
            this.ticketData.departureDate = departureDate;
            this.ticketData.returnDate = returnDate;
            
            return true;
            
        } catch (error) {
            console.error('❌ [항공권검증] 날짜 검증 실패:', error);
            this.showError('날짜 검증 중 오류가 발생했습니다.');
            return false;
        }
    }

    updateDurationMessage() {
        try {
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            const messageEl = document.getElementById('durationMessage');
            
            if (departureDate && returnDate && messageEl) {
                const departure = new Date(departureDate);
                const returnFlight = new Date(returnDate);
                const days = Math.ceil((returnFlight - departure) / (1000 * 60 * 60 * 24));
                
                messageEl.textContent = `체류 기간: ${days}일`;
                messageEl.style.color = days > 0 ? '#059669' : '#dc2626';
                
                console.log('✅ [티켓모듈] 체류 기간 메시지 업데이트:', `${days}일`);
            }
        } catch (error) {
            console.error('❌ [티켓모듈] 체류 기간 메시지 업데이트 실패:', error);
        }
    }

    setupPurchaseMethodEvents() {
        const purchaseTypeRadios = document.querySelectorAll('input[name="purchaseType"]');
        
        purchaseTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.handlePurchaseMethodChange();
            });
        });
        
        console.log('✅ [티켓모듈] 구매방식 이벤트 설정 완료');
    }

    handlePurchaseMethodChange() {
        try {
            console.log('🔄 [구매방식] 구매 방식 변경 처리');
            
            const purchaseType = document.querySelector('input[name="purchaseType"]:checked')?.value;
            const linkGroup = document.getElementById('purchaseLinkGroup');
            
            if (linkGroup) {
                linkGroup.style.display = purchaseType === 'agency' ? 'block' : 'none';
            }
            
            // 데이터 저장
            this.ticketData.purchaseType = purchaseType;
            
            console.log('✅ [구매방식] 구매 방식 변경 완료:', purchaseType);
            
        } catch (error) {
            console.error('❌ [구매방식] 변경 처리 실패:', error);
        }
    }

    setupImageUploadEvents() {
        const flightImageEl = document.getElementById('flightImage');
        const removeImageEl = document.getElementById('removeImage');
        
        if (flightImageEl) {
            flightImageEl.addEventListener('change', (e) => {
                this.handleTicketImageUpload(e);
            });
        }
        
        if (removeImageEl) {
            removeImageEl.addEventListener('click', () => {
                this.removeTicketImage();
            });
        }
        
        console.log('✅ [티켓모듈] 이미지 업로드 이벤트 설정 완료');
    }

    handleTicketImageUpload(event) {
        try {
            console.log('🔄 [이미지업로드] 항공권 이미지 업로드 처리');
            
            const file = event.target.files[0];
            if (!file) return;
            
            // 파일 크기 검증 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showError('파일 크기는 5MB 이하여야 합니다.');
                event.target.value = '';
                return;
            }
            
            // 파일 형식 검증
            if (!file.type.startsWith('image/')) {
                this.showError('이미지 파일만 업로드 가능합니다.');
                event.target.value = '';
                return;
            }
            
            this.ticketImageFile = file;
            
            // 미리보기 표시
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('previewImg');
                const imagePreview = document.getElementById('imagePreview');
                
                if (previewImg) {
                    previewImg.src = e.target.result;
                }
                if (imagePreview) {
                    imagePreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
            
            console.log('✅ [이미지업로드] 항공권 이미지 업로드 준비 완료:', file.name);
            
        } catch (error) {
            console.error('❌ [이미지업로드] 처리 실패:', error);
            this.showError('이미지 업로드 중 오류가 발생했습니다.');
        }
    }

    removeTicketImage() {
        try {
            console.log('🗑️ [이미지제거] 항공권 이미지 제거');
            
            this.ticketImageFile = null;
            
            const flightImageEl = document.getElementById('flightImage');
            const imagePreviewEl = document.getElementById('imagePreview');
            const previewImgEl = document.getElementById('previewImg');
            
            if (flightImageEl) {
                flightImageEl.value = '';
            }
            if (imagePreviewEl) {
                imagePreviewEl.style.display = 'none';
            }
            if (previewImgEl) {
                previewImgEl.src = '';
            }
            
            console.log('✅ [이미지제거] 제거 완료');
            
        } catch (error) {
            console.error('❌ [이미지제거] 제거 실패:', error);
        }
    }

    setupPriceInfoEvents() {
        const priceElements = [
            document.getElementById('ticketPrice'),
            document.getElementById('currency'),
            document.getElementById('priceSource')
        ];
        
        priceElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.updateFlightPriceInfo();
                });
            }
        });
        
        console.log('✅ [티켓모듈] 가격 정보 이벤트 설정 완료');
    }

    updateFlightPriceInfo() {
        try {
            const ticketPrice = document.getElementById('ticketPrice')?.value;
            const currency = document.getElementById('currency')?.value;
            const priceSource = document.getElementById('priceSource')?.value;
            
            // 데이터 저장
            this.ticketData.ticketPrice = ticketPrice ? parseInt(ticketPrice) : null;
            this.ticketData.currency = currency;
            this.ticketData.priceSource = priceSource;
            
            console.log('✅ [가격정보] 가격 정보 업데이트:', {
                가격: this.ticketData.ticketPrice,
                통화: this.ticketData.currency,
                출처: this.ticketData.priceSource
            });
            
        } catch (error) {
            console.error('❌ [가격정보] 업데이트 실패:', error);
        }
    }

    validatePriceFields() {
        try {
            const price = document.getElementById('ticketPrice')?.value;
            const currency = document.getElementById('currency')?.value;
            const source = document.getElementById('priceSource')?.value;
            
            if (!price || !currency || !source) {
                this.showError('가격 정보를 모두 입력해주세요.');
                return false;
            }
            
            if (parseInt(price) <= 0) {
                this.showError('올바른 가격을 입력해주세요.');
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [가격검증] 실패:', error);
            return false;
        }
    }

    setupStepNavigation() {
        console.log('🔄 [단계네비] 단계별 네비게이션 설정');
        this.setupStepCompletionChecks();
        console.log('✅ [단계네비] 단계별 네비게이션 설정 완료');
    }

    setupStepCompletionChecks() {
        // 1단계: 현지 활동기간
        const activityElements = [
            document.getElementById('actualArrivalDate'),
            document.getElementById('actualWorkEndDate')
        ];
        
        activityElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.checkStepCompletion(1);
                });
            }
        });
        
        // 2단계: 구매방식
        const purchaseTypeRadios = document.querySelectorAll('input[name="purchaseType"]');
        purchaseTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.checkStepCompletion(2);
            });
        });
        
        // 3단계: 항공권 정보
        const flightElements = [
            document.getElementById('departureDate'),
            document.getElementById('returnDate'),
            document.getElementById('departureAirport'),
            document.getElementById('arrivalAirport')
        ];
        
        flightElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.checkStepCompletion(3);
                });
            }
        });
        
        // 4단계: 이미지 업로드
        const imageElement = document.getElementById('flightImage');
        if (imageElement) {
            imageElement.addEventListener('change', () => {
                this.checkStepCompletion(4);
            });
        }
    }

    checkStepCompletion(step) {
        try {
            let completed = false;
            
            switch (step) {
                case 1: // 현지 활동기간
                    const arrivalDate = document.getElementById('actualArrivalDate')?.value;
                    const workEndDate = document.getElementById('actualWorkEndDate')?.value;
                    completed = !!(arrivalDate && workEndDate);
                    this.stepCompleted.activityPeriod = completed;
                    break;
                    
                case 2: // 구매방식
                    const purchaseType = document.querySelector('input[name="purchaseType"]:checked');
                    completed = !!purchaseType;
                    this.stepCompleted.purchaseMethod = completed;
                    break;
                    
                case 3: // 항공권 정보
                    const departureDate = document.getElementById('departureDate')?.value;
                    const returnDate = document.getElementById('returnDate')?.value;
                    const departureAirport = document.getElementById('departureAirport')?.value;
                    const arrivalAirport = document.getElementById('arrivalAirport')?.value;
                    completed = !!(departureDate && returnDate && departureAirport && arrivalAirport);
                    this.stepCompleted.flightInfo = completed;
                    break;
                    
                case 4: // 이미지 업로드
                    completed = !!this.ticketImageFile;
                    this.stepCompleted.imageUpload = completed;
                    break;
            }
            
            console.log(`✅ [단계네비] ${step}단계 완료 상태 업데이트:`, completed);
            
        } catch (error) {
            console.error(`❌ [단계네비] ${step}단계 완료 상태 확인 실패:`, error);
        }
    }

    setupSubmitEvents() {
        const form = document.getElementById('flightRequestForm');
        
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleTicketSubmit(e);
            });
        }
        
        console.log('✅ [티켓모듈] 제출 이벤트 설정 완료');
    }

    async handleTicketSubmit(event) {
        try {
            event.preventDefault();
            console.log('🔄 [제출] 항공권 신청 제출 처리 시작...');
            
            this.setLoading(true);
            
            // 1. 현지 활동기간 검증
            const activityValidation = this.validateActivityPeriod();
            if (!activityValidation.valid) {
                this.showError('현지 활동기간을 올바르게 입력해주세요.');
                this.setLoading(false);
                return;
            }
            
            // 2. 항공권 날짜 검증
            if (!this.validateFlightDatesOnly()) {
                this.setLoading(false);
                return;
            }
            
            // 3. 가격 필드 검증
            if (!this.validatePriceFields()) {
                this.setLoading(false);
                return;
            }
            
            // 4. 필수 파일 확인
            if (!this.ticketImageFile) {
                this.showError('항공권 정보 이미지를 업로드해주세요.');
                this.setLoading(false);
                return;
            }
            
            // 5. 폼 데이터 수집
            const form = document.getElementById('flightRequestForm');
            const formData = new FormData(form);
            const requestData = {
                // 현지 활동기간
                actual_arrival_date: formData.get('actualArrivalDate'),
                actual_work_end_date: formData.get('actualWorkEndDate'),
                
                // 항공권 정보
                departure_date: formData.get('departureDate'),
                return_date: formData.get('returnDate'),
                departure_airport: formData.get('departureAirport'),
                arrival_airport: formData.get('arrivalAirport'),
                
                // 가격 정보
                ticket_price: parseInt(formData.get('ticketPrice')),
                currency: formData.get('currency'),
                price_source: formData.get('priceSource'),
                
                // 구매 방식
                purchase_type: formData.get('purchaseType'),
                purchase_link: formData.get('purchaseLink') || null
            };
            
            // 6. API를 통해 제출
            if (this.apiService && typeof this.apiService.submitFlightRequest === 'function') {
                const result = await this.apiService.submitFlightRequest(requestData, this.ticketImageFile);
                console.log('✅ [제출] 항공권 신청 제출 완료:', result);
                
                // 7. 성공 처리
                this.showSuccess('항공권 신청이 성공적으로 제출되었습니다!');
                
                // 8. 페이지 새로고침하여 새로운 상태 반영
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error('API 서비스가 준비되지 않았습니다.');
            }
            
        } catch (error) {
            console.error('❌ [제출] 처리 실패:', error);
            this.showError('항공권 신청 제출 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    async loadTicketInfo() {
        try {
            console.log('🔄 [티켓모듈] 기존 항공권 정보 로드 시작...');
            
            // API를 통해 기존 항공권 신청 내역 확인
            if (this.apiService && typeof this.apiService.loadExistingFlightRequest === 'function') {
                const existingRequest = await this.apiService.loadExistingFlightRequest();
                
                if (existingRequest) {
                    console.log('✅ [티켓모듈] 기존 항공권 신청 발견:', existingRequest.status);
                    this.populateExistingData(existingRequest);
                }
            }
            
            console.log('✅ [티켓모듈] 항공권 정보 로드 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] 항공권 정보 로드 실패:', error);
        }
    }

    populateExistingData(requestData) {
        try {
            console.log('🔄 [티켓모듈] 기존 데이터로 폼 채우기...');
            
            // 현지 활동기간
            const arrivalDateEl = document.getElementById('actualArrivalDate');
            const workEndDateEl = document.getElementById('actualWorkEndDate');
            
            if (arrivalDateEl && requestData.actual_arrival_date) {
                arrivalDateEl.value = requestData.actual_arrival_date;
            }
            if (workEndDateEl && requestData.actual_work_end_date) {
                workEndDateEl.value = requestData.actual_work_end_date;
            }
            
            // 항공권 정보
            const departureEl = document.getElementById('departureDate');
            const returnEl = document.getElementById('returnDate');
            const departureAirportEl = document.getElementById('departureAirport');
            const arrivalAirportEl = document.getElementById('arrivalAirport');
            
            if (departureEl && requestData.departure_date) {
                departureEl.value = requestData.departure_date;
            }
            if (returnEl && requestData.return_date) {
                returnEl.value = requestData.return_date;
            }
            if (departureAirportEl && requestData.departure_airport) {
                departureAirportEl.value = requestData.departure_airport;
            }
            if (arrivalAirportEl && requestData.arrival_airport) {
                arrivalAirportEl.value = requestData.arrival_airport;
            }
            
            // 가격 정보
            const priceEl = document.getElementById('ticketPrice');
            const currencyEl = document.getElementById('currency');
            const sourceEl = document.getElementById('priceSource');
            
            if (priceEl && requestData.ticket_price) {
                priceEl.value = requestData.ticket_price;
            }
            if (currencyEl && requestData.currency) {
                currencyEl.value = requestData.currency;
            }
            if (sourceEl && requestData.price_source) {
                sourceEl.value = requestData.price_source;
            }
            
            // 구매 방식
            if (requestData.purchase_type) {
                const purchaseRadio = document.querySelector(`input[name="purchaseType"][value="${requestData.purchase_type}"]`);
                if (purchaseRadio) {
                    purchaseRadio.checked = true;
                    this.handlePurchaseMethodChange();
                }
            }
            
            const purchaseLinkEl = document.getElementById('purchaseLink');
            if (purchaseLinkEl && requestData.purchase_link) {
                purchaseLinkEl.value = requestData.purchase_link;
            }
            
            console.log('✅ [티켓모듈] 기존 데이터로 폼 채우기 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] 기존 데이터 채우기 실패:', error);
        }
    }

    // === 유틸리티 메서드들 ===

    showError(message) {
        try {
            console.error('❌ [티켓모듈]:', message);
            
            if (this.uiService && typeof this.uiService.showError === 'function') {
                this.uiService.showError(message);
            } else {
                alert(message);
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] 에러 표시 실패:', error);
        }
    }

    showSuccess(message) {
        try {
            console.log('✅ [티켓모듈]:', message);
            
            if (this.uiService && typeof this.uiService.showSuccess === 'function') {
                this.uiService.showSuccess(message);
            } else {
                alert(message);
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] 성공 메시지 표시 실패:', error);
        }
    }

    setLoading(loading) {
        try {
            console.log('🔄 [티켓모듈] 로딩 상태:', loading);
            
            const submitBtn = document.getElementById('submitBtn');
            const submitBtnText = document.getElementById('submitBtnText');
            
            if (submitBtn) {
                submitBtn.disabled = loading;
            }
            if (submitBtnText) {
                submitBtnText.textContent = loading ? '제출 중...' : '신청하기';
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] 로딩 상태 설정 실패:', error);
        }
    }

    // === 외부 인터페이스 ===

    getTicketData() {
        return { ...this.ticketData };
    }

    getStepCompletionStatus() {
        return { ...this.stepCompleted };
    }

    getPrerequisiteStatus() {
        return {
            isActivityPeriodCompleted: this.isActivityPeriodCompleted,
            isActivityPeriodValid: this.isActivityPeriodValid,
            flightSectionEnabled: this.flightSectionEnabled
        };
    }

    removeFile(fileType) {
        try {
            if (fileType === 'ticket') {
                this.removeTicketImage();
            }
        } catch (error) {
            console.error(`❌ [티켓모듈] 파일 제거 실패: ${fileType}`, error);
        }
    }
}

// 전역 스코프에 노출
window.FlightRequestTicketFixed = FlightRequestTicketFixed;

console.log('✅ FlightRequestTicketFixed 모듈 로드 완료 - v8.3.0 항공권 신청 페이지 데이터 로드 문제 해결');
console.log('🔧 v8.3.0 핵심 개선사항:', {
    pageDataLoading: '페이지 전환 시 데이터 로드 기능 강화',
    requiredActivityDaysLoading: '필수 활동일 로드 문제 해결',
    prerequisiteSystemImprovement: '전제 조건 시스템 개선',
    flightSectionToggle: '항공권 정보 섹션 활성화/비활성화 로직 개선',
    realTimeValidation: '실시간 검증 시스템 강화',
    publicInterface: '공개 인터페이스 메서드 추가',
    errorHandling: '에러 처리 강화'
});
