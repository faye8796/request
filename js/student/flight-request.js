// 항공권 신청 모듈 - v4.0 신규 구현
// 🎯 책임: 항공권 구매 신청, 일정 관리, 여행 정보 처리
// ✈️ 기능: 신청 폼, 승인 과정, 관리자 연동

const FlightRequestModule = {
    // === 모듈 초기화 ===
    studentManager: null,
    isInitialized: false,
    currentRequest: null,

    // 모듈 초기화
    init: function(managerInstance) {
        try {
            console.log('✈️ FlightRequestModule 초기화 시작');
            this.studentManager = managerInstance;
            this.setupEventListeners();
            this.loadExistingRequests();
            this.isInitialized = true;
            console.log('✅ FlightRequestModule 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestModule 초기화 오류:', error);
            return false;
        }
    },

    // === 이벤트 리스너 설정 ===
    setupEventListeners: function() {
        try {
            // 신규 항공권 신청 버튼
            this.safeAddEventListener('#newFlightRequestBtn', 'click', this.showFlightRequestModal.bind(this));
            
            // 기존 신청 조회 버튼
            this.safeAddEventListener('#viewFlightRequestsBtn', 'click', this.showExistingRequests.bind(this));

            console.log('✅ FlightRequestModule 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ FlightRequestModule 이벤트 리스너 설정 오류:', error);
        }
    },

    // === 항공권 신청 모달 ===
    showFlightRequestModal: function() {
        try {
            console.log('✈️ 항공권 신청 모달 표시');

            if (!this.validateUserAccess()) {
                return;
            }

            this.createFlightRequestModal();
            this.showModal('flightRequestModal');
        } catch (error) {
            console.error('❌ 항공권 신청 모달 표시 오류:', error);
            alert('항공권 신청 모달을 표시하는 중 오류가 발생했습니다.');
        }
    },

    // 항공권 신청 모달 생성
    createFlightRequestModal: function() {
        try {
            // 기존 모달 제거
            const existingModal = document.getElementById('flightRequestModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'flightRequestModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content flight-request-modal">
                    <div class="modal-header">
                        <h2>
                            <i data-lucide="plane"></i>
                            항공권 구매 신청
                        </h2>
                        <button class="modal-close" onclick="FlightRequestModule.hideFlightRequestModal()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="flightRequestForm" class="flight-request-form">
                            <!-- 기본 정보 -->
                            <div class="form-section">
                                <h3><i data-lucide="user"></i> 신청자 정보</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="applicantName">신청자 이름 *</label>
                                        <input type="text" id="applicantName" name="applicantName" required readonly>
                                    </div>
                                    <div class="form-group">
                                        <label for="applicantEmail">이메일 *</label>
                                        <input type="email" id="applicantEmail" name="applicantEmail" required readonly>
                                    </div>
                                    <div class="form-group">
                                        <label for="applicantPhone">연락처 *</label>
                                        <input type="tel" id="applicantPhone" name="applicantPhone" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="passportNumber">여권번호 *</label>
                                        <input type="text" id="passportNumber" name="passportNumber" required>
                                    </div>
                                </div>
                            </div>

                            <!-- 여행 정보 -->
                            <div class="form-section">
                                <h3><i data-lucide="map-pin"></i> 여행 정보</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="destination">파견 학당 (목적지) *</label>
                                        <select id="destination" name="destination" required>
                                            <option value="">파견 학당을 선택하세요</option>
                                            <option value="미국_뉴욕세종학당">미국 - 뉴욕세종학당</option>
                                            <option value="영국_런던세종학당">영국 - 런던세종학당</option>
                                            <option value="프랑스_파리세종학당">프랑스 - 파리세종학당</option>
                                            <option value="독일_베를린세종학당">독일 - 베를린세종학당</option>
                                            <option value="일본_도쿄세종학당">일본 - 도쿄세종학당</option>
                                            <option value="중국_베이징세종학당">중국 - 베이징세종학당</option>
                                            <option value="호주_시드니세종학당">호주 - 시드니세종학당</option>
                                            <option value="기타">기타 (직접 입력)</option>
                                        </select>
                                    </div>
                                    <div class="form-group" id="customDestinationGroup" style="display: none;">
                                        <label for="customDestination">직접 입력</label>
                                        <input type="text" id="customDestination" name="customDestination" placeholder="목적지를 직접 입력하세요">
                                    </div>
                                </div>
                                
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="departureDate">출발일 *</label>
                                        <input type="date" id="departureDate" name="departureDate" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="returnDate">귀국일 *</label>
                                        <input type="date" id="returnDate" name="returnDate" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="flightClass">좌석 등급 *</label>
                                        <select id="flightClass" name="flightClass" required>
                                            <option value="economy">이코노미</option>
                                            <option value="premium-economy">프리미엄 이코노미</option>
                                            <option value="business">비즈니스</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="urgencyLevel">긴급도 *</label>
                                        <select id="urgencyLevel" name="urgencyLevel" required>
                                            <option value="normal">일반 (1개월 이상 여유)</option>
                                            <option value="urgent">긴급 (2주~1개월)</option>
                                            <option value="emergency">매우 긴급 (2주 이내)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 예산 정보 -->
                            <div class="form-section">
                                <h3><i data-lucide="dollar-sign"></i> 예산 정보</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="estimatedCost">예상 항공료 (원) *</label>
                                        <input type="number" id="estimatedCost" name="estimatedCost" 
                                               min="0" step="10000" required placeholder="예상 비용을 입력하세요">
                                    </div>
                                    <div class="form-group">
                                        <label for="budgetSource">예산 출처 *</label>
                                        <select id="budgetSource" name="budgetSource" required>
                                            <option value="personal">개인 부담</option>
                                            <option value="institution">기관 지원</option>
                                            <option value="mixed">혼합 (개인+기관)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 추가 정보 -->
                            <div class="form-section">
                                <h3><i data-lucide="file-text"></i> 추가 정보</h3>
                                <div class="form-group">
                                    <label for="specialRequests">특별 요청사항</label>
                                    <textarea id="specialRequests" name="specialRequests" rows="3" 
                                              placeholder="좌석 선호도, 식사 요청, 기타 특별 요청사항이 있으면 입력하세요"></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="additionalNotes">참고사항</label>
                                    <textarea id="additionalNotes" name="additionalNotes" rows="3" 
                                              placeholder="관리자가 알아야 할 추가 정보나 참고사항을 입력하세요"></textarea>
                                </div>
                            </div>

                            <!-- 약관 동의 -->
                            <div class="form-section">
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="agreeTerms" name="agreeTerms" required>
                                        <span class="checkmark"></span>
                                        항공권 구매 신청 관련 개인정보 처리 및 이용에 동의합니다 *
                                    </label>
                                </div>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="agreePolicy" name="agreePolicy" required>
                                        <span class="checkmark"></span>
                                        항공권 구매 및 변경/취소 정책에 동의합니다 *
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn secondary" onclick="FlightRequestModule.hideFlightRequestModal()">
                            <i data-lucide="x"></i>
                            취소
                        </button>
                        <button type="button" class="btn primary" onclick="FlightRequestModule.submitFlightRequest()">
                            <i data-lucide="send"></i>
                            신청 제출
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 폼 초기화
            this.initializeFlightRequestForm();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('❌ 항공권 신청 모달 생성 오류:', error);
        }
    },

    // 폼 초기화
    initializeFlightRequestForm: function() {
        try {
            // 사용자 정보 자동 입력
            const currentUser = this.getCurrentUserSafely();
            if (currentUser) {
                const nameField = document.getElementById('applicantName');
                const emailField = document.getElementById('applicantEmail');
                
                if (nameField) nameField.value = currentUser.name || '';
                if (emailField) emailField.value = currentUser.email || '';
            }

            // 목적지 변경 이벤트
            const destinationSelect = document.getElementById('destination');
            const customDestinationGroup = document.getElementById('customDestinationGroup');
            
            if (destinationSelect && customDestinationGroup) {
                destinationSelect.addEventListener('change', function() {
                    if (this.value === '기타') {
                        customDestinationGroup.style.display = 'block';
                        document.getElementById('customDestination').required = true;
                    } else {
                        customDestinationGroup.style.display = 'none';
                        document.getElementById('customDestination').required = false;
                    }
                });
            }

            // 날짜 제한 설정 (오늘 이후만 선택 가능)
            const today = new Date().toISOString().split('T')[0];
            const departureDate = document.getElementById('departureDate');
            const returnDate = document.getElementById('returnDate');
            
            if (departureDate) {
                departureDate.min = today;
                departureDate.addEventListener('change', function() {
                    if (returnDate) {
                        returnDate.min = this.value;
                        if (returnDate.value && returnDate.value < this.value) {
                            returnDate.value = '';
                        }
                    }
                });
            }
            
            if (returnDate) {
                returnDate.min = today;
            }

            // 예상 비용 포맷팅
            const estimatedCostField = document.getElementById('estimatedCost');
            if (estimatedCostField) {
                estimatedCostField.addEventListener('input', function() {
                    // 숫자만 입력 허용
                    this.value = this.value.replace(/[^0-9]/g, '');
                });
            }

            console.log('✅ 항공권 신청 폼 초기화 완료');
        } catch (error) {
            console.error('❌ 항공권 신청 폼 초기화 오류:', error);
        }
    },

    // === 항공권 신청 제출 ===
    submitFlightRequest: function() {
        try {
            console.log('✈️ 항공권 신청 제출 시작');

            if (!this.validateFlightRequestForm()) {
                return;
            }

            const formData = this.collectFlightRequestData();
            const currentUser = this.getCurrentUserSafely();

            if (!currentUser) {
                alert('사용자 정보를 확인할 수 없습니다.');
                return;
            }

            const submitButton = document.querySelector('#flightRequestModal .btn.primary');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i data-lucide="loader" class="loading"></i> 제출 중...';
            }

            const self = this;
            
            this.safeApiCall(function() {
                return SupabaseAPI.submitFlightRequest({
                    ...formData,
                    student_id: currentUser.id,
                    status: 'submitted',
                    submitted_at: new Date().toISOString()
                });
            }).then(function(result) {
                if (result && result.success) {
                    self.hideFlightRequestModal();
                    self.showSuccessMessage('항공권 신청이 성공적으로 제출되었습니다!');
                    self.loadExistingRequests();
                } else {
                    throw new Error(result?.error || '알 수 없는 오류가 발생했습니다');
                }
            }).catch(function(error) {
                console.error('❌ 항공권 신청 제출 오류:', error);
                alert('항공권 신청 제출 중 오류가 발생했습니다: ' + error.message);
            }).finally(function() {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i data-lucide="send"></i> 신청 제출';
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            });
        } catch (error) {
            console.error('❌ 항공권 신청 제출 오류:', error);
            alert('항공권 신청 제출 중 오류가 발생했습니다.');
        }
    },

    // 폼 데이터 수집
    collectFlightRequestData: function() {
        try {
            const form = document.getElementById('flightRequestForm');
            if (!form) {
                throw new Error('폼을 찾을 수 없습니다');
            }

            const formData = new FormData(form);
            const data = {};

            // 기본 폼 데이터 수집
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            // 목적지 처리
            if (data.destination === '기타' && data.customDestination) {
                data.destination = data.customDestination;
                delete data.customDestination;
            }

            // 체크박스 처리
            data.agreeTerms = document.getElementById('agreeTerms').checked;
            data.agreePolicy = document.getElementById('agreePolicy').checked;

            return data;
        } catch (error) {
            console.error('❌ 폼 데이터 수집 오류:', error);
            throw error;
        }
    },

    // === 폼 검증 ===
    validateFlightRequestForm: function() {
        try {
            const form = document.getElementById('flightRequestForm');
            if (!form) {
                alert('폼을 찾을 수 없습니다.');
                return false;
            }

            // HTML5 기본 검증
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }

            // 추가 검증
            const departureDate = document.getElementById('departureDate').value;
            const returnDate = document.getElementById('returnDate').value;
            
            if (new Date(departureDate) >= new Date(returnDate)) {
                alert('귀국일은 출발일보다 뒤여야 합니다.');
                return false;
            }

            const estimatedCost = parseInt(document.getElementById('estimatedCost').value);
            if (estimatedCost < 100000) {
                alert('예상 항공료가 너무 낮습니다. 최소 10만원 이상으로 입력해주세요.');
                return false;
            }

            // 약관 동의 확인
            if (!document.getElementById('agreeTerms').checked || !document.getElementById('agreePolicy').checked) {
                alert('필수 약관에 동의해주세요.');
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ 폼 검증 오류:', error);
            alert('폼 검증 중 오류가 발생했습니다.');
            return false;
        }
    },

    // === 기존 신청 조회 ===
    showExistingRequests: function() {
        try {
            console.log('📋 기존 항공권 신청 내역 조회');
            this.loadExistingRequests();
        } catch (error) {
            console.error('❌ 기존 신청 조회 오류:', error);
        }
    },

    loadExistingRequests: function() {
        try {
            const currentUser = this.getCurrentUserSafely();
            if (!currentUser) {
                console.warn('현재 사용자 정보가 없습니다');
                return;
            }

            const self = this;
            
            this.safeApiCall(function() {
                return SupabaseAPI.getStudentFlightRequests ? 
                    SupabaseAPI.getStudentFlightRequests(currentUser.id) : 
                    Promise.resolve([]);
            }).then(function(requests) {
                self.renderFlightRequests(requests || []);
            }).catch(function(error) {
                console.error('❌ 항공권 신청 내역 로드 오류:', error);
                self.showErrorMessage('항공권 신청 내역을 불러올 수 없습니다.');
            });
        } catch (error) {
            console.error('❌ 기존 신청 로드 오류:', error);
        }
    },

    // 항공권 신청 내역 렌더링
    renderFlightRequests: function(requests) {
        try {
            const container = document.getElementById('flightRequestsList');
            if (!container) {
                console.warn('항공권 신청 내역 컨테이너를 찾을 수 없습니다');
                return;
            }

            if (!requests || requests.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="plane" style="width: 3rem; height: 3rem; color: #6b7280;"></i>
                        <h3>항공권 신청 내역이 없습니다</h3>
                        <p>첫 번째 항공권 신청을 시작해보세요.</p>
                        <button class="btn primary" onclick="FlightRequestModule.showFlightRequestModal()">
                            <i data-lucide="plus"></i>
                            새 항공권 신청
                        </button>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                return;
            }

            container.innerHTML = requests.map(request => `
                <div class="flight-request-card ${request.status}">
                    <div class="request-header">
                        <div class="request-info">
                            <h4>${request.destination}</h4>
                            <span class="request-status status-${request.status}">
                                ${this.getStatusText(request.status)}
                            </span>
                        </div>
                        <div class="request-dates">
                            <div class="date-item">
                                <span class="label">출발:</span>
                                <span class="value">${this.formatDate(request.departure_date)}</span>
                            </div>
                            <div class="date-item">
                                <span class="label">귀국:</span>
                                <span class="value">${this.formatDate(request.return_date)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="request-details">
                        <div class="detail-item">
                            <span class="label">좌석 등급:</span>
                            <span class="value">${this.getClassText(request.flight_class)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">예상 비용:</span>
                            <span class="value">${this.formatPrice(request.estimated_cost)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">신청일:</span>
                            <span class="value">${this.formatDateTime(request.submitted_at)}</span>
                        </div>
                    </div>
                    
                    ${request.admin_notes ? `
                        <div class="request-notes">
                            <strong>관리자 메모:</strong>
                            <p>${request.admin_notes}</p>
                        </div>
                    ` : ''}
                    
                    <div class="request-actions">
                        <button class="btn small secondary" onclick="FlightRequestModule.viewRequestDetails('${request.id}')">
                            <i data-lucide="eye"></i>
                            상세보기
                        </button>
                        ${request.status === 'submitted' ? `
                            <button class="btn small warning" onclick="FlightRequestModule.cancelFlightRequest('${request.id}')">
                                <i data-lucide="x"></i>
                                신청 취소
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('❌ 항공권 신청 내역 렌더링 오류:', error);
        }
    },

    // === 유틸리티 함수들 ===

    // 상태 텍스트
    getStatusText: function(status) {
        const statusMap = {
            'submitted': '승인 대기',
            'approved': '승인됨',
            'rejected': '반려됨',
            'cancelled': '취소됨',
            'booked': '예약 완료',
            'completed': '여행 완료'
        };
        return statusMap[status] || status;
    },

    // 좌석 등급 텍스트
    getClassText: function(flightClass) {
        const classMap = {
            'economy': '이코노미',
            'premium-economy': '프리미엄 이코노미',
            'business': '비즈니스'
        };
        return classMap[flightClass] || flightClass;
    },

    // 날짜 포맷팅
    formatDate: function(dateString) {
        try {
            if (!dateString) return '알 수 없음';
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR');
        } catch (error) {
            return '날짜 오류';
        }
    },

    // 날짜시간 포맷팅
    formatDateTime: function(dateString) {
        try {
            if (!dateString) return '알 수 없음';
            const date = new Date(dateString);
            return date.toLocaleString('ko-KR');
        } catch (error) {
            return '시간 오류';
        }
    },

    // 가격 포맷팅
    formatPrice: function(price) {
        try {
            return new Intl.NumberFormat('ko-KR').format(price) + '원';
        } catch (error) {
            return price + '원';
        }
    },

    // === 모달 관리 ===
    hideFlightRequestModal: function() {
        try {
            const modal = document.getElementById('flightRequestModal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
                
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.remove();
                    }
                }, 300);
            }
        } catch (error) {
            console.error('❌ 항공권 신청 모달 숨김 오류:', error);
        }
    },

    showModal: function(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        } catch (error) {
            console.error('❌ 모달 표시 오류:', error);
        }
    },

    // === 공통 함수들 ===
    
    // 사용자 접근 권한 확인
    validateUserAccess: function() {
        const currentUser = this.getCurrentUserSafely();
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return false;
        }
        return true;
    },

    // 안전한 사용자 정보 가져오기
    getCurrentUserSafely: function() {
        if (this.studentManager && this.studentManager.getCurrentUserSafely) {
            return this.studentManager.getCurrentUserSafely();
        }
        return null;
    },

    // 안전한 API 호출
    safeApiCall: function(apiFunction) {
        if (this.studentManager && this.studentManager.safeApiCall) {
            return this.studentManager.safeApiCall(apiFunction);
        }
        return Promise.reject(new Error('API 호출을 할 수 없습니다'));
    },

    // 안전한 이벤트 리스너 추가
    safeAddEventListener: function(selector, event, handler) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
                console.log('이벤트 리스너 추가: ' + selector);
            }
        } catch (error) {
            console.error('이벤트 리스너 추가 오류 (' + selector + '):', error);
        }
    },

    // 성공 메시지 표시
    showSuccessMessage: function(message) {
        if (this.studentManager) {
            const notificationSystem = this.studentManager.getModule('notification');
            if (notificationSystem) {
                notificationSystem.showSuccessNotice('항공권 신청 성공', message);
                return;
            }
        }
        alert(message);
    },

    // 오류 메시지 표시
    showErrorMessage: function(message) {
        if (this.studentManager) {
            const notificationSystem = this.studentManager.getModule('notification');
            if (notificationSystem) {
                notificationSystem.showErrorNotice('오류', message);
                return;
            }
        }
        alert(message);
    }
};

// 전역 접근을 위한 window 객체에 추가
window.FlightRequestModule = FlightRequestModule;

console.log('✈️ FlightRequestModule v4.0 로드 완료 - 항공권 신청 관리 모듈');
