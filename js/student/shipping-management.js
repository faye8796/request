// 배송지 설정 및 관리 모듈 v3.0 
// 📦 책임: 배송지 정보 입력, 저장, 수정, 유효성 검증
// 🔗 의존성: StudentManager, SupabaseAPI

(function() {
    'use strict';
    
    console.log('📦 ShippingManagement v3.0 로드 시작 - 배송지 전담 모듈');

    // 배송지 관리 모듈 정의
    const ShippingManagementModule = {
        name: 'ShippingManagement',
        version: '3.0.0',
        studentManager: null,
        
        // 🔧 상태 관리 플래그들
        submitInProgress: false,
        shippingListenersAttached: false,

        // 모듈 초기화
        init: function(studentManager) {
            try {
                console.log('📦 ShippingManagement 모듈 초기화 시작');
                this.studentManager = studentManager;
                
                // 필수 의존성 확인
                if (typeof window.SupabaseAPI === 'undefined') {
                    console.warn('⚠️ SupabaseAPI가 로드되지 않았습니다');
                }
                
                console.log('✅ ShippingManagement 모듈 초기화 완료');
                return true;
            } catch (error) {
                console.error('❌ ShippingManagement 모듈 초기화 실패:', error);
                return false;
            }
        },

        // === 🆕 배송지 설정 기능 ===
        
        // 배송지 설정 모달 표시
        showShippingModal: function() {
            try {
                console.log('📦 배송지 설정 모달 표시 (v3.0)');
                
                // 🔧 플래그 강제 초기화
                this.submitInProgress = false;
                console.log('🔄 submitInProgress 플래그 초기화:', this.submitInProgress);
                
                const modal = document.getElementById('shippingModal');
                if (!modal) {
                    console.error('배송지 모달을 찾을 수 없습니다');
                    alert('배송지 설정 기능을 사용할 수 없습니다.');
                    return;
                }

                // 현재 사용자 확인
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                // 🔧 이벤트 리스너 중복 방지
                if (!this.shippingListenersAttached) {
                    console.log('📦 배송지 이벤트 리스너 최초 등록');
                    this.attachShippingEventListeners();
                    this.shippingListenersAttached = true;
                } else {
                    console.log('📦 배송지 이벤트 리스너 이미 등록됨 - 건너뜀');
                }

                // 기존 배송지 정보 로드
                this.loadShippingInfo(currentUser.id);

                // 모달 표시
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';

                // 첫 번째 입력 필드에 포커스
                const firstInput = modal.querySelector('#shippingName');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }

                console.log('✅ 배송지 설정 모달 표시 완료');
            } catch (error) {
                console.error('❌ 배송지 모달 표시 오류:', error);
                alert('배송지 설정을 여는 중 오류가 발생했습니다.');
            }
        },

        // 배송지 이벤트 리스너 등록
        attachShippingEventListeners: function() {
            try {
                console.log('📦 배송지 이벤트 리스너 등록 시작');

                // 기존 리스너 제거 (중복 방지)
                this.removeShippingEventListeners();

                const form = document.getElementById('shippingForm');
                const cancelBtn = document.getElementById('shippingCancelBtn');

                if (form) {
                    form.addEventListener('submit', this.handleShippingFormSubmit.bind(this));
                    console.log('✅ 배송지 폼 제출 이벤트 등록');
                }

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', this.hideShippingModal.bind(this));
                    console.log('✅ 배송지 취소 버튼 이벤트 등록');
                }

                // 모달 배경 클릭으로 닫기
                const modal = document.getElementById('shippingModal');
                if (modal) {
                    modal.addEventListener('click', this.handleModalBackgroundClick.bind(this));
                    console.log('✅ 배송지 모달 배경 클릭 이벤트 등록');
                }

                console.log('✅ 배송지 이벤트 리스너 등록 완료');
            } catch (error) {
                console.error('❌ 배송지 이벤트 리스너 등록 오류:', error);
            }
        },

        // 기존 이벤트 리스너 제거
        removeShippingEventListeners: function() {
            try {
                const form = document.getElementById('shippingForm');
                const cancelBtn = document.getElementById('shippingCancelBtn');

                // 기존 요소들을 클론으로 교체하여 모든 이벤트 리스너 제거
                if (form) {
                    const newForm = form.cloneNode(true);
                    form.parentNode.replaceChild(newForm, form);
                }

                if (cancelBtn) {
                    const newCancelBtn = cancelBtn.cloneNode(true);
                    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
                }

                console.log('🧹 기존 배송지 이벤트 리스너 제거 완료');
            } catch (error) {
                console.error('❌ 배송지 이벤트 리스너 제거 오류:', error);
            }
        },

        // 폼 제출 처리
        handleShippingFormSubmit: function(event) {
            try {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                console.log('📦 배송지 폼 제출 이벤트 처리 시작');
                console.log('🔍 현재 submitInProgress 상태:', this.submitInProgress);

                if (this.submitInProgress) {
                    console.warn('⚠️ 배송지 저장이 이미 진행 중입니다 - 무시됨');
                    return false;
                }

                this.submitInProgress = true;
                console.log('🔄 submitInProgress 플래그 설정:', this.submitInProgress);

                this.handleShippingSubmit();

                return false;
            } catch (error) {
                console.error('❌ 배송지 폼 제출 처리 오류:', error);
                this.submitInProgress = false;
                console.log('🔄 오류로 인한 submitInProgress 플래그 초기화:', this.submitInProgress);
                return false;
            }
        },

        // 모달 배경 클릭 처리
        handleModalBackgroundClick: function(event) {
            try {
                if (event.target === event.currentTarget) {
                    this.hideShippingModal();
                }
            } catch (error) {
                console.error('❌ 모달 배경 클릭 처리 오류:', error);
            }
        },

        // 기존 배송지 정보 로드
        loadShippingInfo: function(userId) {
            try {
                console.log('📦 기존 배송지 정보 로드:', userId);
                
                const self = this;
                
                this.safeApiCall(function() {
                    return SupabaseAPI.getShippingInfo(userId);
                }).then(function(shippingInfo) {
                    if (shippingInfo) {
                        console.log('✅ 기존 배송지 정보 발견:', {
                            name: shippingInfo.recipient_name,
                            phone: shippingInfo.phone,
                            address: shippingInfo.address ? shippingInfo.address.substring(0, 20) + '...' : ''
                        });
                        self.fillShippingForm(shippingInfo);
                    } else {
                        console.log('ℹ️ 기존 배송지 정보 없음 - 빈 폼 표시');
                        self.clearShippingForm();
                    }
                }).catch(function(error) {
                    console.error('❌ 배송지 정보 로드 오류:', error);
                    self.clearShippingForm();
                    self.showShippingNotice('warning', '기존 배송지 정보를 불러올 수 없습니다. 새로 입력해주세요.');
                });
            } catch (error) {
                console.error('❌ 배송지 정보 로드 오류:', error);
                this.clearShippingForm();
            }
        },

        // 배송지 폼 채우기
        fillShippingForm: function(shippingInfo) {
            try {
                const form = document.getElementById('shippingForm');
                if (!form) return;

                const nameField = form.querySelector('#shippingName');
                const phoneField = form.querySelector('#shippingPhone');
                const addressField = form.querySelector('#shippingAddress');
                const postcodeField = form.querySelector('#shippingPostcode');
                const noteField = form.querySelector('#shippingNote');

                if (nameField) nameField.value = shippingInfo.recipient_name || '';
                if (phoneField) phoneField.value = shippingInfo.phone || '';
                if (addressField) addressField.value = shippingInfo.address || '';
                if (postcodeField) postcodeField.value = shippingInfo.postcode || '';
                if (noteField) noteField.value = shippingInfo.note || '';

                console.log('✅ 배송지 폼 채우기 완료');
                this.showShippingNotice('success', '기존 배송지 정보를 불러왔습니다.');
            } catch (error) {
                console.error('❌ 배송지 폼 채우기 오류:', error);
            }
        },

        // 배송지 폼 초기화
        clearShippingForm: function() {
            try {
                const form = document.getElementById('shippingForm');
                if (form) {
                    form.reset();
                }
            } catch (error) {
                console.error('❌ 배송지 폼 초기화 오류:', error);
            }
        },

        // 배송지 정보 저장 처리
        handleShippingSubmit: function() {
            try {
                console.log('📦 배송지 정보 저장 처리 시작 (v3.0)');
                console.log('🔍 handleShippingSubmit 진입 시 submitInProgress:', this.submitInProgress);
                
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    this.submitInProgress = false;
                    console.log('🔄 사용자 없음으로 인한 플래그 초기화:', this.submitInProgress);
                    return;
                }

                const form = document.getElementById('shippingForm');
                if (!form) {
                    console.error('배송지 폼을 찾을 수 없습니다');
                    this.submitInProgress = false;
                    console.log('🔄 폼 없음으로 인한 플래그 초기화:', this.submitInProgress);
                    return;
                }

                // 폼 데이터 수집
                const shippingData = {
                    recipient_name: this.getFormValue(form, 'shippingName'),
                    phone: this.getFormValue(form, 'shippingPhone'),
                    address: this.getFormValue(form, 'shippingAddress'),
                    postcode: this.getFormValue(form, 'shippingPostcode'),
                    note: this.getFormValue(form, 'shippingNote')
                };

                // 필수 필드 검증
                if (!this.validateShippingData(shippingData, form)) {
                    this.submitInProgress = false;
                    return;
                }

                // 데이터 정제
                shippingData.phone = this.normalizePhoneNumber(shippingData.phone);
                shippingData.postcode = this.normalizePostcode(shippingData.postcode);

                console.log('📦 저장할 배송지 정보:', {
                    recipient_name: shippingData.recipient_name,
                    phone: shippingData.phone,
                    address: shippingData.address.substring(0, 20) + '...',
                    postcode: shippingData.postcode
                });

                const self = this;
                
                // 제출 버튼 비활성화
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '저장 중...';
                }
                
                // API 호출
                this.safeApiCall(function() {
                    console.log('📡 SupabaseAPI.saveShippingInfo 호출:', currentUser.id);
                    return SupabaseAPI.saveShippingInfo(currentUser.id, shippingData);
                }).then(function(result) {
                    console.log('📦 배송지 저장 API 응답:', result);
                    
                    if (result && result.success !== false) {
                        console.log('✅ 배송지 정보 저장 완료');
                        alert('배송지 정보가 저장되었습니다.');
                        self.hideShippingModal();
                    } else {
                        console.error('❌ 배송지 정보 저장 실패:', result);
                        const errorMessage = result?.message || result?.error || '알 수 없는 오류';
                        alert('배송지 정보 저장에 실패했습니다: ' + errorMessage);
                        self.showShippingNotice('danger', '저장 실패: ' + errorMessage);
                    }
                }).catch(function(error) {
                    console.error('❌ 배송지 정보 저장 오류:', error);
                    
                    let errorMessage = '알 수 없는 오류';
                    if (error.message) {
                        if (error.message.includes('duplicate key')) {
                            errorMessage = '배송지 정보가 이미 존재합니다.';
                        } else if (error.message.includes('not null')) {
                            errorMessage = '필수 정보가 누락되었습니다.';
                        } else if (error.message.includes('permission denied')) {
                            errorMessage = '저장 권한이 없습니다.';
                        } else {
                            errorMessage = error.message;
                        }
                    }
                    
                    alert('배송지 정보 저장 중 오류가 발생했습니다: ' + errorMessage);
                    self.showShippingNotice('danger', '오류: ' + errorMessage);
                }).finally(function() {
                    console.log('📦 배송지 저장 완료 - 정리 작업 시작');
                    
                    self.submitInProgress = false;
                    console.log('🔄 finally 블록에서 submitInProgress 플래그 초기화:', self.submitInProgress);
                    
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '저장하기';
                    }
                    
                    console.log('✅ 배송지 저장 정리 작업 완료');
                });

            } catch (error) {
                console.error('❌ 배송지 정보 저장 처리 오류:', error);
                alert('배송지 정보 저장 처리 중 오류가 발생했습니다.');
                this.showShippingNotice('danger', '처리 오류: ' + error.message);
                this.submitInProgress = false;
                console.log('🔄 예외 처리로 인한 submitInProgress 플래그 초기화:', this.submitInProgress);
            }
        },

        // 배송지 모달 숨김
        hideShippingModal: function() {
            try {
                console.log('📦 배송지 설정 모달 숨김 - 플래그 초기화');
                
                const modal = document.getElementById('shippingModal');
                if (modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = '';
                    
                    const form = document.getElementById('shippingForm');
                    if (form) form.reset();
                    
                    this.removeShippingNotice();
                    
                    this.submitInProgress = false;
                    console.log('🔄 모달 닫기 시 submitInProgress 플래그 초기화:', this.submitInProgress);
                }
            } catch (error) {
                console.error('배송지 모달 숨김 오류:', error);
                this.submitInProgress = false;
                console.log('🔄 오류 발생 시에도 submitInProgress 플래그 초기화:', this.submitInProgress);
            }
        },

        // === 유틸리티 함수들 ===

        // 안전한 폼 값 가져오기
        getFormValue: function(form, fieldName) {
            try {
                const field = form.querySelector('#' + fieldName);
                return field ? field.value.trim() : '';
            } catch (error) {
                console.error('폼 값 가져오기 오류:', fieldName, error);
                return '';
            }
        },

        // 필드에 포커스
        focusField: function(form, fieldName) {
            try {
                const field = form.querySelector('#' + fieldName);
                if (field) {
                    field.focus();
                }
            } catch (error) {
                console.error('필드 포커스 오류:', fieldName, error);
            }
        },

        // 배송지 데이터 검증
        validateShippingData: function(data, form) {
            if (!data.recipient_name.trim()) {
                alert('받는 분 성명을 입력해주세요.');
                this.focusField(form, 'shippingName');
                return false;
            }

            if (!data.phone.trim()) {
                alert('연락처를 입력해주세요.');
                this.focusField(form, 'shippingPhone');
                return false;
            }

            if (!data.address.trim()) {
                alert('주소를 입력해주세요.');
                this.focusField(form, 'shippingAddress');
                return false;
            }

            return true;
        },

        // 전화번호 정규화
        normalizePhoneNumber: function(phone) {
            try {
                const numbers = phone.replace(/[^0-9]/g, '');
                
                if (numbers.length < 10 || numbers.length > 11) {
                    return phone;
                }
                
                if (numbers.length === 11 && numbers.startsWith('010')) {
                    return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                }
                
                return phone;
            } catch (error) {
                console.error('전화번호 정규화 오류:', error);
                return phone;
            }
        },

        // 우편번호 정규화
        normalizePostcode: function(postcode) {
            try {
                const numbers = postcode.replace(/[^0-9]/g, '');
                
                if (numbers.length === 5) {
                    return numbers;
                }
                
                return postcode;
            } catch (error) {
                console.error('우편번호 정규화 오류:', error);
                return postcode;
            }
        },

        // 배송지 알림 표시
        showShippingNotice: function(type, message) {
            try {
                this.removeShippingNotice();
                
                const modal = document.getElementById('shippingModal');
                if (!modal) return;
                
                const notice = document.createElement('div');
                notice.id = 'shippingNotice';
                notice.className = 'shipping-notice ' + type;
                notice.innerHTML = `
                    <div class="notice-content">
                        <i data-lucide="${this.getNoticeIcon(type)}"></i>
                        <span>${message}</span>
                    </div>
                `;
                
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.insertBefore(notice, modalContent.firstChild);
                    
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                    
                    if (type === 'success' || type === 'info') {
                        setTimeout(() => {
                            this.removeShippingNotice();
                        }, 3000);
                    }
                }
            } catch (error) {
                console.error('배송지 알림 표시 오류:', error);
            }
        },

        // 배송지 알림 제거
        removeShippingNotice: function() {
            try {
                const notice = document.getElementById('shippingNotice');
                if (notice && notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            } catch (error) {
                console.error('배송지 알림 제거 오류:', error);
            }
        },

        // 알림 아이콘 가져오기
        getNoticeIcon: function(type) {
            const iconMap = {
                'success': 'check-circle',
                'warning': 'alert-triangle',
                'danger': 'alert-circle',
                'info': 'info'
            };
            return iconMap[type] || 'info';
        },

        // 현재 사용자 정보 가져오기
        getCurrentUserSafely: function() {
            try {
                // StudentManager 메서드 사용
                if (this.studentManager && typeof this.studentManager.getCurrentUserSafely === 'function') {
                    return this.studentManager.getCurrentUserSafely();
                }

                // 폴백: localStorage에서 직접 가져오기
                const currentStudentData = localStorage.getItem('currentStudent');
                if (currentStudentData) {
                    try {
                        const studentData = JSON.parse(currentStudentData);
                        if (studentData && studentData.id) {
                            return studentData;
                        }
                    } catch (parseError) {
                        console.error('localStorage 데이터 파싱 오류:', parseError);
                    }
                }

                console.warn('⚠️ 사용자 정보를 찾을 수 없습니다');
                return null;
            } catch (error) {
                console.error('❌ 사용자 정보 가져오기 오류:', error);
                return null;
            }
        },

        // 안전한 API 호출
        safeApiCall: function(apiFunction) {
            try {
                if (typeof apiFunction === 'function') {
                    const result = apiFunction();
                    
                    if (result && typeof result.then === 'function') {
                        return result.catch(function(error) {
                            console.error('API 호출 중 오류:', error);
                            if (error.message && error.message.includes('PGRST116')) {
                                return null;
                            }
                            throw error;
                        });
                    }
                    
                    return Promise.resolve(result);
                }
                return Promise.reject(new Error('API 함수가 유효하지 않습니다'));
            } catch (error) {
                console.error('API 호출 오류:', error);
                return Promise.reject(error);
            }
        }
    };

    // 전역 등록
    window.ShippingManagementModule = ShippingManagementModule;

    // StudentManager 확장 실행
    function waitForStudentManager() {
        return new Promise((resolve) => {
            if (typeof window.StudentManager !== 'undefined') {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (typeof window.StudentManager !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    waitForStudentManager().then(() => {
        console.log('✅ StudentManager 감지됨 - ShippingManagement 모듈 등록');
        
        // StudentManager에 모듈 등록
        if (window.StudentManager.registerModule) {
            const success = window.StudentManager.registerModule('ShippingManagement', ShippingManagementModule);
            console.log('📦 ShippingManagement 모듈 등록 결과:', success);
        }

        // 배송지 설정 기능을 StudentManager에 연결 (하위 호환성)
        window.StudentManager.showShippingModal = function() {
            console.log('📦 StudentManager에서 배송지 모달 호출 - ShippingManagement 모듈로 위임');
            const shippingModule = window.StudentManager.getModule('ShippingManagement');
            if (shippingModule && typeof shippingModule.showShippingModal === 'function') {
                return shippingModule.showShippingModal();
            } else if (window.ShippingManagementModule && typeof window.ShippingManagementModule.showShippingModal === 'function') {
                return window.ShippingManagementModule.showShippingModal();
            } else {
                alert('배송지 설정 기능을 사용할 수 없습니다.');
            }
        };

        console.log('✅ ShippingManagement 모듈 연결 완료 - v3.0');
    });

    console.log('📦 ShippingManagement v3.0 로드 완료 - 배송지 전담 모듈');
})();