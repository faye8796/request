// 학생 기능 확장 모듈 - 누락된 교구 신청 기능들 구현 (실제 API 메서드 기반)
// StudentManager의 누락된 메서드들을 확장하여 교구 신청 기능을 완전히 복구
// 🆕 배송지 설정 기능 추가 (v2.3) - 플래그 초기화 문제 해결
// 🚀 v2.4 - 교구신청 수정/삭제 기능 추가 및 참고링크 UI 개선
// 🔧 v2.5 - 묶음신청 수정 모달 문제 및 참고링크 표시 버그 수정

// StudentManager 확장 - 누락된 교구 신청 기능들 구현 (실제 SupabaseAPI 메서드 사용)
(function() {
    'use strict';
    
    console.log('📚 StudentAddon 로드 시작 - 교구신청 + 배송지 기능 (v2.5 - 묶음신청 수정 및 참고링크 버그 수정)');

    // StudentManager가 로드될 때까지 대기
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

    // 🚀 SupabaseAPI 확장 - 교구 신청 수정/삭제 메서드 추가
    function extendSupabaseAPI() {
        if (typeof window.SupabaseAPI !== 'undefined') {
            
            // 🔧 교구 신청 수정 메서드 추가
            window.SupabaseAPI.updateApplication = async function(applicationId, formData) {
                return await this.safeApiCall('교구 신청 수정', async () => {
                    const updateData = {
                        item_name: formData.item_name,
                        purpose: formData.purpose,
                        price: formData.price,
                        purchase_type: formData.purchase_type || 'online',
                        purchase_link: formData.purchase_link || null,
                        is_bundle: formData.is_bundle || false,
                        updated_at: new Date().toISOString()
                    };

                    return await this.supabase
                        .from('requests')
                        .update(updateData)
                        .eq('id', applicationId)
                        .select();
                });
            };

            // 🔧 교구 신청 삭제 메서드 추가
            window.SupabaseAPI.deleteApplication = async function(applicationId) {
                return await this.safeApiCall('교구 신청 삭제', async () => {
                    return await this.supabase
                        .from('requests')
                        .delete()
                        .eq('id', applicationId)
                        .select();
                });
            };

            // 🔧 특정 신청 조회 메서드 추가
            window.SupabaseAPI.getApplicationById = async function(applicationId) {
                return await this.safeApiCall('신청 상세 조회', async () => {
                    return await this.supabase
                        .from('requests')
                        .select('*')
                        .eq('id', applicationId)
                        .single();
                });
            };

            console.log('✅ SupabaseAPI 확장 완료 - 수정/삭제 메서드 추가');
        }
    }

    // 배송지 전용 네임스페이스 생성
    window.StudentAddon = {
        // 🔧 중복 방지를 위한 플래그들 - 초기화 문제 해결
        submitInProgress: false,
        shippingListenersAttached: false,

        // === 🆕 배송지 설정 기능 (개선된 버전) ===
        
        // 🆕 배송지 설정 모달 표시 - 플래그 초기화 추가
        showShippingModal: function() {
            try {
                console.log('📦 배송지 설정 모달 표시 (v2.5)');
                
                // 🔧 플래그 강제 초기화 (모달 열 때마다)
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

                // 🔧 이벤트 리스너 중복 방지 - 조건부 등록
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

        // 🔧 배송지 이벤트 리스너 한 번만 등록
        attachShippingEventListeners: function() {
            try {
                console.log('📦 배송지 이벤트 리스너 등록 시작');

                // 기존 리스너 제거 (중복 방지)
                this.removeShippingEventListeners();

                const form = document.getElementById('shippingForm');
                const cancelBtn = document.getElementById('shippingCancelBtn');

                if (form) {
                    // 폼 제출 이벤트 (한 번만 등록)
                    form.addEventListener('submit', this.handleShippingFormSubmit.bind(this));
                    console.log('✅ 배송지 폼 제출 이벤트 등록');
                }

                if (cancelBtn) {
                    // 취소 버튼 이벤트
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

        // 🔧 기존 이벤트 리스너 제거
        removeShippingEventListeners: function() {
            try {
                const form = document.getElementById('shippingForm');
                const cancelBtn = document.getElementById('shippingCancelBtn');
                const modal = document.getElementById('shippingModal');

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

        // 🔧 폼 제출 처리 (중복 방지 강화 + 디버깅 로그 추가)
        handleShippingFormSubmit: function(event) {
            try {
                // 🔧 기본 폼 제출 동작 확실히 방지
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                console.log('📦 배송지 폼 제출 이벤트 처리 시작');
                console.log('🔍 현재 submitInProgress 상태:', this.submitInProgress);

                // 🔧 중복 제출 방지 체크
                if (this.submitInProgress) {
                    console.warn('⚠️ 배송지 저장이 이미 진행 중입니다 - 무시됨');
                    return false;
                }

                // 제출 플래그 설정
                this.submitInProgress = true;
                console.log('🔄 submitInProgress 플래그 설정:', this.submitInProgress);

                // 실제 저장 처리
                this.handleShippingSubmit();

                return false; // 추가 안전장치
            } catch (error) {
                console.error('❌ 배송지 폼 제출 처리 오류:', error);
                this.submitInProgress = false;
                console.log('🔄 오류로 인한 submitInProgress 플래그 초기화:', this.submitInProgress);
                return false;
            }
        },

        // 🔧 모달 배경 클릭 처리
        handleModalBackgroundClick: function(event) {
            try {
                // 모달 자체를 클릭했을 때만 닫기 (내용 영역 클릭 시에는 닫지 않음)
                if (event.target === event.currentTarget) {
                    this.hideShippingModal();
                }
            } catch (error) {
                console.error('❌ 모달 배경 클릭 처리 오류:', error);
            }
        },

        // 🆕 기존 배송지 정보 로드 - 개선된 오류 처리
        loadShippingInfo: function(userId) {
            try {
                console.log('📦 기존 배송지 정보 로드:', userId);
                
                const self = this;
                
                // Supabase에서 배송지 정보 조회 (안전한 API 호출)
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
                    // 사용자에게는 경고만 표시 (모달은 유지)
                    self.showShippingNotice('warning', '기존 배송지 정보를 불러올 수 없습니다. 새로 입력해주세요.');
                });
            } catch (error) {
                console.error('❌ 배송지 정보 로드 오류:', error);
                this.clearShippingForm();
            }
        },

        // 🆕 배송지 폼 채우기
        fillShippingForm: function(shippingInfo) {
            try {
                const form = document.getElementById('shippingForm');
                if (!form) return;

                // 폼 필드 채우기
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

        // 🆕 배송지 폼 초기화
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

        // 🆕 배송지 정보 저장 처리 - 플래그 관리 개선
        handleShippingSubmit: function() {
            try {
                console.log('📦 배송지 정보 저장 처리 시작 (v2.5)');
                console.log('🔍 handleShippingSubmit 진입 시 submitInProgress:', this.submitInProgress);
                
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    this.submitInProgress = false;
                    console.log('🔄 사용자 없음으로 인한 플래그 초기화:', this.submitInProgress);
                    return;
                }

                // 폼 데이터 수집
                const form = document.getElementById('shippingForm');
                if (!form) {
                    console.error('배송지 폼을 찾을 수 없습니다');
                    this.submitInProgress = false;
                    console.log('🔄 폼 없음으로 인한 플래그 초기화:', this.submitInProgress);
                    return;
                }

                // 🔧 개선된 데이터 수집 방식
                const shippingData = {
                    recipient_name: this.getFormValue(form, 'shippingName'),
                    phone: this.getFormValue(form, 'shippingPhone'),
                    address: this.getFormValue(form, 'shippingAddress'),
                    postcode: this.getFormValue(form, 'shippingPostcode'),
                    note: this.getFormValue(form, 'shippingNote')
                };

                // 필수 필드 검증
                if (!shippingData.recipient_name.trim()) {
                    alert('받는 분 성명을 입력해주세요.');
                    this.focusField(form, 'shippingName');
                    this.submitInProgress = false;
                    console.log('🔄 필수 필드 누락으로 인한 플래그 초기화:', this.submitInProgress);
                    return;
                }

                if (!shippingData.phone.trim()) {
                    alert('연락처를 입력해주세요.');
                    this.focusField(form, 'shippingPhone');
                    this.submitInProgress = false;
                    console.log('🔄 필수 필드 누락으로 인한 플래그 초기화:', this.submitInProgress);
                    return;
                }

                if (!shippingData.address.trim()) {
                    alert('주소를 입력해주세요.');
                    this.focusField(form, 'shippingAddress');
                    this.submitInProgress = false;
                    console.log('🔄 필수 필드 누락으로 인한 플래그 초기화:', this.submitInProgress);
                    return;
                }

                // 🔧 데이터 검증 및 정제
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
                
                // 🔧 개선된 API 호출 - 구체적인 에러 처리
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
                    
                    // 구체적인 오류 메시지 생성
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
                    // 🔧 반드시 실행되는 정리 작업
                    console.log('📦 배송지 저장 완료 - 정리 작업 시작');
                    
                    // 제출 플래그 해제
                    self.submitInProgress = false;
                    console.log('🔄 finally 블록에서 submitInProgress 플래그 초기화:', self.submitInProgress);
                    
                    // 버튼 활성화
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

        // 🆕 배송지 모달 숨김 - 플래그 초기화 강화
        hideShippingModal: function() {
            try {
                console.log('📦 배송지 설정 모달 숨김 - 플래그 초기화');
                
                const modal = document.getElementById('shippingModal');
                if (modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = '';
                    
                    // 폼 초기화
                    const form = document.getElementById('shippingForm');
                    if (form) form.reset();
                    
                    // 알림 제거
                    this.removeShippingNotice();
                    
                    // 🔧 플래그 확실히 초기화
                    this.submitInProgress = false;
                    console.log('🔄 모달 닫기 시 submitInProgress 플래그 초기화:', this.submitInProgress);
                }
            } catch (error) {
                console.error('배송지 모달 숨김 오류:', error);
                // 오류가 있어도 플래그는 초기화
                this.submitInProgress = false;
                console.log('🔄 오류 발생 시에도 submitInProgress 플래그 초기화:', this.submitInProgress);
            }
        },

        // === 🆕 배송지 지원 함수들 ===
        
        // 🆕 안전한 폼 값 가져오기
        getFormValue: function(form, fieldName) {
            try {
                const field = form.querySelector('#' + fieldName);
                return field ? field.value.trim() : '';
            } catch (error) {
                console.error('폼 값 가져오기 오류:', fieldName, error);
                return '';
            }
        },

        // 🆕 필드에 포커스
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

        // 🆕 전화번호 정규화
        normalizePhoneNumber: function(phone) {
            try {
                // 숫자만 추출
                const numbers = phone.replace(/[^0-9]/g, '');
                
                // 기본 형식 검증
                if (numbers.length < 10 || numbers.length > 11) {
                    return phone; // 원본 반환 (유효성 검사는 서버에서)
                }
                
                // 010-XXXX-XXXX 형식으로 변환
                if (numbers.length === 11 && numbers.startsWith('010')) {
                    return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                }
                
                // 기타 형식은 원본 반환
                return phone;
            } catch (error) {
                console.error('전화번호 정규화 오류:', error);
                return phone;
            }
        },

        // 🆕 우편번호 정규화
        normalizePostcode: function(postcode) {
            try {
                // 숫자만 추출
                const numbers = postcode.replace(/[^0-9]/g, '');
                
                // 5자리 우편번호 검증
                if (numbers.length === 5) {
                    return numbers;
                }
                
                // 기타 형식은 원본 반환
                return postcode;
            } catch (error) {
                console.error('우편번호 정규화 오류:', error);
                return postcode;
            }
        },

        // 🆕 배송지 알림 표시
        showShippingNotice: function(type, message) {
            try {
                // 기존 알림 제거
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
                    
                    // 자동 제거 (성공/정보 메시지만)
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

        // 🆕 배송지 알림 제거
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

        // 🆕 알림 아이콘 가져오기
        getNoticeIcon: function(type) {
            const iconMap = {
                'success': 'check-circle',
                'warning': 'alert-triangle',
                'danger': 'alert-circle',
                'info': 'info'
            };
            return iconMap[type] || 'info';
        },

        // 🆕 현재 사용자 정보 가져오기 (StudentManager와 동일)
        getCurrentUserSafely: function() {
            try {
                // StudentManager 메서드 사용
                if (window.StudentManager && typeof window.StudentManager.getCurrentUserSafely === 'function') {
                    return window.StudentManager.getCurrentUserSafely();
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

        // 🆕 안전한 API 호출 (StudentManager와 동일)
        safeApiCall: function(apiFunction) {
            try {
                if (typeof apiFunction === 'function') {
                    const result = apiFunction();
                    
                    // Promise가 반환되는 경우
                    if (result && typeof result.then === 'function') {
                        return result.catch(function(error) {
                            console.error('API 호출 중 오류:', error);
                            // 특정 오류 타입에 따른 처리
                            if (error.message && error.message.includes('PGRST116')) {
                                return null; // 데이터 없음을 의미
                            }
                            throw error; // 다른 오류는 상위로 전파
                        });
                    }
                    
                    // 동기 결과인 경우
                    return Promise.resolve(result);
                }
                return Promise.reject(new Error('API 함수가 유효하지 않습니다'));
            } catch (error) {
                console.error('API 호출 오류:', error);
                return Promise.reject(error);
            }
        }
    };

    // StudentManager 확장 실행
    waitForStudentManager().then(() => {
        console.log('✅ StudentManager 감지됨 - 확장 기능 추가 시작 (v2.5)');
        
        // 🚀 SupabaseAPI 확장 먼저 실행
        extendSupabaseAPI();
        
        // === 교구 신청 모달 기능 구현 ===
        
        // 🛒 일반 교구 신청 모달 표시 - 🚀 v2.5 참고링크 UI 개선 추가
        window.StudentManager.showApplicationModal = function() {
            try {
                console.log('🛒 일반 교구 신청 모달 표시 (v2.5 - 참고링크 UI 개선)');
                
                const modal = document.getElementById('applicationModal');
                if (!modal) {
                    console.error('교구 신청 모달을 찾을 수 없습니다');
                    alert('교구 신청 기능을 사용할 수 없습니다.');
                    return;
                }

                // 현재 사용자 확인
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                // 수업계획 승인 상태 확인
                const self = this;
                this.safeApiCall(function() {
                    return SupabaseAPI.getStudentLessonPlan(currentUser.id);
                }).then(function(lessonPlan) {
                    const isLessonPlanApproved = lessonPlan && lessonPlan.status === 'approved';
                    
                    if (!isLessonPlanApproved) {
                        alert('수업계획이 승인된 후에 교구 신청이 가능합니다.');
                        return;
                    }

                    // 모달 초기화 및 표시
                    self.resetApplicationForm();
                    self.currentEditingItem = null;
                    
                    // 구매 방식 기본값 설정
                    const onlineRadio = modal.querySelector('input[name="purchaseMethod"][value="online"]');
                    if (onlineRadio) {
                        onlineRadio.checked = true;
                        self.handlePurchaseMethodChange('online');
                    }

                    // 🚀 v2.5 - 구매 방식 변경 이벤트 리스너 추가
                    self.setupPurchaseMethodEventListeners();

                    // 모달 표시
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';

                    // 첫 번째 입력 필드에 포커스
                    const firstInput = modal.querySelector('#itemName');
                    if (firstInput) {
                        setTimeout(() => firstInput.focus(), 100);
                    }

                    console.log('✅ 일반 교구 신청 모달 표시 완료 (v2.5)');
                }).catch(function(error) {
                    console.error('❌ 수업계획 확인 오류:', error);
                    alert('수업계획 정보를 확인할 수 없습니다. 다시 시도해주세요.');
                });

            } catch (error) {
                console.error('❌ 일반 교구 신청 모달 표시 오류:', error);
                alert('교구 신청을 여는 중 오류가 발생했습니다.');
            }
        };

        // 🚀 v2.5 - 구매 방식 변경 이벤트 리스너 설정
        window.StudentManager.setupPurchaseMethodEventListeners = function() {
            try {
                console.log('🔧 구매 방식 변경 이벤트 리스너 설정');
                
                const modal = document.getElementById('applicationModal');
                if (!modal) return;

                const purchaseMethodRadios = modal.querySelectorAll('input[name="purchaseMethod"]');
                const self = this;

                purchaseMethodRadios.forEach(radio => {
                    radio.addEventListener('change', function() {
                        if (this.checked) {
                            console.log('📻 구매 방식 변경:', this.value);
                            self.handlePurchaseMethodChange(this.value);
                        }
                    });
                });

                console.log('✅ 구매 방식 변경 이벤트 리스너 설정 완료');
            } catch (error) {
                console.error('❌ 구매 방식 이벤트 리스너 설정 오류:', error);
            }
        };

        // 🚀 v2.5 - 구매 방식 변경 처리 (참고링크 필드 표시/숨김)
        window.StudentManager.handlePurchaseMethodChange = function(method) {
            try {
                console.log('🔧 구매 방식 변경 처리:', method);
                
                const itemLinkGroup = document.getElementById('itemLinkGroup');
                const itemLinkInput = document.getElementById('itemLink');
                const itemLinkLabel = document.getElementById('itemLinkLabel');
                
                if (!itemLinkGroup) {
                    console.warn('⚠️ itemLinkGroup 요소를 찾을 수 없습니다');
                    return;
                }

                if (method === 'online') {
                    // 온라인 구매: 참고링크 필드 표시
                    itemLinkGroup.style.display = 'block';
                    if (itemLinkInput) {
                        itemLinkInput.required = true;
                        itemLinkInput.placeholder = '구매 가능한 링크를 입력하세요';
                    }
                    if (itemLinkLabel) {
                        itemLinkLabel.textContent = '구매 링크 *';
                    }
                    console.log('✅ 온라인 구매 모드: 참고링크 필드 표시');
                    
                } else {
                    // 오프라인 구매: 참고링크 필드 숨김
                    itemLinkGroup.style.display = 'none';
                    if (itemLinkInput) {
                        itemLinkInput.required = false;
                        itemLinkInput.value = ''; // 값 초기화
                    }
                    console.log('✅ 오프라인 구매 모드: 참고링크 필드 숨김');
                }
            } catch (error) {
                console.error('❌ 구매 방식 변경 처리 오류:', error);
            }
        };

        // 📦 묶음 신청 모달 표시 - 완전 재설계
        window.StudentManager.showBundleModal = function() {
            try {
                console.log('📦 묶음 신청 모달 표시 (v2.5 - 참고링크 제거)');
                
                const modal = document.getElementById('bundleModal');
                if (!modal) {
                    console.error('묶음 신청 모달을 찾을 수 없습니다');
                    alert('묶음 신청 기능을 사용할 수 없습니다.');
                    return;
                }

                // 현재 사용자 확인
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                // 수업계획 승인 상태 확인
                const self = this;
                this.safeApiCall(function() {
                    return SupabaseAPI.getStudentLessonPlan(currentUser.id);
                }).then(function(lessonPlan) {
                    const isLessonPlanApproved = lessonPlan && lessonPlan.status === 'approved';
                    
                    if (!isLessonPlanApproved) {
                        alert('수업계획이 승인된 후에 묶음 신청이 가능합니다.');
                        return;
                    }

                    // 모달 초기화 및 표시
                    self.resetBundleForm();
                    
                    // 구매 방식 기본값 설정 (온라인)
                    const onlineRadio = modal.querySelector('input[name="bundlePurchaseMethod"][value="online"]');
                    if (onlineRadio) {
                        onlineRadio.checked = true;
                        // 온라인 구매 정보 표시
                        window.toggleBundlePurchaseInfo('online');
                    }

                    // 모달 표시
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';

                    // 첫 번째 입력 필드에 포커스
                    const firstInput = modal.querySelector('#bundleTitle');
                    if (firstInput) {
                        setTimeout(() => firstInput.focus(), 100);
                    }

                    console.log('✅ 묶음 신청 모달 표시 완료 (v2.5)');
                }).catch(function(error) {
                    console.error('❌ 수업계획 확인 오류:', error);
                    alert('수업계획 정보를 확인할 수 없습니다. 다시 시도해주세요.');
                });

            } catch (error) {
                console.error('❌ 묶음 신청 모달 표시 오류:', error);
                alert('묶음 신청을 여는 중 오류가 발생했습니다.');
            }
        };

        // 📄 영수증 모달 표시 - 실제 API 기반으로 수정
        window.StudentManager.showReceiptModal = function(requestId) {
            try {
                console.log('📄 영수증 모달 표시:', requestId);
                
                if (!requestId) {
                    console.error('요청 ID가 필요합니다');
                    alert('잘못된 요청입니다.');
                    return;
                }

                const modal = document.getElementById('receiptModal');
                if (!modal) {
                    console.error('영수증 모달을 찾을 수 없습니다');
                    alert('영수증 등록 기능을 사용할 수 없습니다.');
                    return;
                }

                // 현재 신청 정보 저장
                this.currentReceiptItem = requestId;

                // 🔧 현재 학생의 신청 내역에서 해당 ID 찾기 (getApplicationById가 없으므로)
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                const self = this;
                this.safeApiCall(function() {
                    return SupabaseAPI.getStudentApplications(currentUser.id);
                }).then(function(applications) {
                    const application = applications.find(app => app.id === requestId);
                    
                    if (!application) {
                        alert('신청 정보를 찾을 수 없습니다.');
                        return;
                    }

                    // 신청 정보를 모달에 표시
                    const itemNameEl = modal.querySelector('#receiptItemName');
                    const itemPriceEl = modal.querySelector('#receiptItemPrice');
                    
                    if (itemNameEl) itemNameEl.textContent = application.item_name;
                    if (itemPriceEl) itemPriceEl.textContent = self.formatPrice(application.price);

                    // 폼 초기화
                    self.resetReceiptForm();

                    // 모달 표시
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';

                    console.log('✅ 영수증 모달 표시 완료');
                }).catch(function(error) {
                    console.error('❌ 신청 정보 로드 오류:', error);
                    alert('신청 정보를 불러올 수 없습니다.');
                });

            } catch (error) {
                console.error('❌ 영수증 모달 표시 오류:', error);
                alert('영수증 등록을 여는 중 오류가 발생했습니다.');
            }
        };

        // === 신청 제출 처리 기능 구현 (실제 API 사용) ===

        // 📝 일반 교구 신청 제출 처리 - 실제 API 기반으로 수정
        window.StudentManager.handleApplicationSubmit = function() {
            try {
                console.log('📝 일반 교구 신청 제출 처리 (v2.5)');
                
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                const form = document.getElementById('applicationForm');
                if (!form) {
                    console.error('신청 폼을 찾을 수 없습니다');
                    return;
                }

                // 폼 데이터 수집
                const formData = new FormData(form);
                const applicationData = {
                    item_name: formData.get('itemName') || '',
                    price: parseInt(formData.get('itemPrice')) || 0,
                    purpose: formData.get('itemPurpose') || '',
                    purchase_type: formData.get('purchaseMethod') || 'online',
                    purchase_link: formData.get('itemLink') || '',
                    is_bundle: false
                };

                // 입력 검증
                if (!applicationData.item_name.trim()) {
                    alert('교구명을 입력해주세요.');
                    form.querySelector('#itemName').focus();
                    return;
                }

                if (applicationData.price <= 0) {
                    alert('올바른 가격을 입력해주세요.');
                    form.querySelector('#itemPrice').focus();
                    return;
                }

                if (!applicationData.purpose.trim()) {
                    alert('사용 목적을 입력해주세요.');
                    form.querySelector('#itemPurpose').focus();
                    return;
                }

                // 🚀 v2.5 - 온라인 구매만 링크 필수
                if (applicationData.purchase_type === 'online' && !applicationData.purchase_link.trim()) {
                    alert('온라인 구매의 경우 구매 링크를 입력해주세요.');
                    form.querySelector('#itemLink').focus();
                    return;
                }

                console.log('📝 제출할 신청 데이터:', applicationData);

                const self = this;
                
                // 제출 버튼 비활성화
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '제출 중...';
                }

                // 🔧 실제 API 호출 - createApplication 또는 updateApplication 사용
                const apiCall = this.currentEditingItem ? 
                    function() { return SupabaseAPI.updateApplication(self.currentEditingItem, applicationData); } :
                    function() { return SupabaseAPI.createApplication(currentUser.id, applicationData); };

                this.safeApiCall(apiCall).then(function(result) {
                    if (result && result.success !== false) {
                        console.log('✅ 교구 신청 제출 완료');
                        alert(self.currentEditingItem ? '교구 신청이 수정되었습니다.' : '교구 신청이 제출되었습니다.');
                        
                        self.hideApplicationModal();
                        
                        // 대시보드 새로고침
                        setTimeout(() => {
                            self.loadApplications();
                            self.updateBudgetStatus();
                        }, 500);
                    } else {
                        console.error('❌ 교구 신청 제출 실패:', result);
                        alert('교구 신청 제출에 실패했습니다: ' + (result.message || result.error || '알 수 없는 오류'));
                    }
                }).catch(function(error) {
                    console.error('❌ 교구 신청 제출 오류:', error);
                    alert('교구 신청 제출 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
                }).finally(function() {
                    // 제출 버튼 활성화
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = self.currentEditingItem ? '수정하기' : '신청하기';
                    }
                });

            } catch (error) {
                console.error('❌ 일반 교구 신청 제출 처리 오류:', error);
                alert('교구 신청 제출 처리 중 오류가 발생했습니다.');
            }
        };

        // 📦 묶음 신청 제출 처리 - v2.0 쇼핑몰 계정 기반 완전 재설계
        window.StudentManager.handleBundleSubmit = function() {
            try {
                console.log('📦 묶음 신청 제출 처리 (v2.5 - 쇼핑몰 계정 기반)');
                
                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                const form = document.getElementById('bundleForm');
                if (!form) {
                    console.error('묶음 신청 폼을 찾을 수 없습니다');
                    return;
                }

                // 기본 정보 수집
                const formData = new FormData(form);
                const bundleTitle = formData.get('bundleTitle') || '';
                const bundlePurpose = formData.get('bundlePurpose') || '';
                const bundleTotalPrice = parseInt(formData.get('bundleTotalPrice')) || 0;
                const bundlePurchaseMethod = formData.get('bundlePurchaseMethod') || 'online';

                // 기본 정보 검증
                if (!bundleTitle.trim()) {
                    alert('묶음 제목을 입력해주세요.');
                    form.querySelector('#bundleTitle').focus();
                    return;
                }

                if (!bundlePurpose.trim()) {
                    alert('사용 목적을 입력해주세요.');
                    form.querySelector('#bundlePurpose').focus();
                    return;
                }

                if (bundleTotalPrice <= 0) {
                    alert('올바른 구매 총액을 입력해주세요.');
                    form.querySelector('#bundleTotalPrice').focus();
                    return;
                }

                // 🆕 구매 방식에 따른 추가 정보 수집 및 검증
                let purchaseDetails = '';
                
                if (bundlePurchaseMethod === 'online') {
                    // 온라인 구매 정보 검증
                    const purchaseSite = formData.get('purchaseSite') || '';
                    const accountId = formData.get('accountId') || '';
                    const accountPassword = formData.get('accountPassword') || '';
                    const cartNote = formData.get('cartNote') || '';
                    
                    if (!purchaseSite) {
                        alert('구매 사이트를 선택해주세요.');
                        form.querySelector('#purchaseSite').focus();
                        return;
                    }
                    
                    if (!accountId.trim()) {
                        alert('계정 아이디를 입력해주세요.');
                        form.querySelector('#accountId').focus();
                        return;
                    }
                    
                    if (!accountPassword.trim()) {
                        alert('계정 비밀번호를 입력해주세요.');
                        form.querySelector('#accountPassword').focus();
                        return;
                    }
                    
                    // 기타 사이트인 경우 URL 확인
                    if (purchaseSite === 'other') {
                        const otherSite = formData.get('otherSite') || '';
                        if (!otherSite.trim()) {
                            alert('기타 사이트 URL을 입력해주세요.');
                            form.querySelector('#otherSite').focus();
                            return;
                        }
                    }
                    
                    // 🔒 온라인 구매 정보 구성 (보안 처리 - 실제로는 암호화 필요)
                    const siteInfo = purchaseSite === 'other' ? formData.get('otherSite') : purchaseSite;
                    purchaseDetails = `[온라인 구매]\n구매 사이트: ${siteInfo}\n계정 ID: ${accountId}\n계정 PW: ${this.encryptPassword(accountPassword)}\n장바구니 메모: ${cartNote}`;
                    
                } else {
                    // 오프라인 구매 정보 검증
                    const offlineVendor = formData.get('offlineVendor') || '';
                    const purchasePlan = formData.get('purchasePlan') || '';
                    
                    if (!offlineVendor.trim()) {
                        alert('구매 업체 정보를 입력해주세요.');
                        form.querySelector('#offlineVendor').focus();
                        return;
                    }
                    
                    // 오프라인 구매 정보 구성
                    purchaseDetails = `[오프라인 구매]\n구매 업체: ${offlineVendor}\n구매 계획: ${purchasePlan}`;
                }

                // 🔧 createApplication에 맞는 데이터 구조로 변경
                const bundleData = {
                    item_name: bundleTitle,
                    price: bundleTotalPrice,
                    purpose: bundlePurpose,
                    purchase_type: bundlePurchaseMethod,
                    purchase_link: purchaseDetails, // 구매 방식에 따른 상세 정보
                    is_bundle: true
                };

                console.log('📦 제출할 묶음 신청 데이터:', {
                    ...bundleData,
                    purchase_link: bundleData.purchase_link.replace(/계정 PW:.*/, '계정 PW: [암호화됨]') // 로그에서는 비밀번호 숨김
                });

                const self = this;
                
                // 제출 버튼 비활성화
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '제출 중...';
                }

                // 🔧 실제 API 호출 - createApplication 사용 (묶음도 동일한 API 사용)
                this.safeApiCall(function() {
                    return SupabaseAPI.createApplication(currentUser.id, bundleData);
                }).then(function(result) {
                    if (result && result.success !== false) {
                        console.log('✅ 묶음 신청 제출 완료');
                        alert('묶음 신청이 제출되었습니다.');
                        
                        self.hideBundleModal();
                        
                        // 대시보드 새로고침
                        setTimeout(() => {
                            self.loadApplications();
                            self.updateBudgetStatus();
                        }, 500);
                    } else {
                        console.error('❌ 묶음 신청 제출 실패:', result);
                        alert('묶음 신청 제출에 실패했습니다: ' + (result.message || result.error || '알 수 없는 오류'));
                    }
                }).catch(function(error) {
                    console.error('❌ 묶음 신청 제출 오류:', error);
                    alert('묶음 신청 제출 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
                }).finally(function() {
                    // 제출 버튼 활성화
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '묶음 신청하기';
                    }
                });

            } catch (error) {
                console.error('❌ 묶음 신청 제출 처리 오류:', error);
                alert('묶음 신청 제출 처리 중 오류가 발생했습니다.');
            }
        };

        // 📄 영수증 제출 처리 - 현재 API 구조에 맞게 단순화
        window.StudentManager.handleReceiptSubmit = function() {
            try {
                console.log('📄 영수증 제출 처리 시작');
                
                if (!this.currentReceiptItem) {
                    alert('영수증을 등록할 신청을 찾을 수 없습니다.');
                    return;
                }

                const form = document.getElementById('receiptForm');
                if (!form) {
                    console.error('영수증 폼을 찾을 수 없습니다');
                    return;
                }

                const receiptFile = document.getElementById('receiptFile');
                if (!receiptFile || !receiptFile.files || receiptFile.files.length === 0) {
                    alert('영수증 파일을 선택해주세요.');
                    return;
                }

                const file = receiptFile.files[0];
                
                // 파일 크기 검증 (5MB 제한)
                if (file.size > 5 * 1024 * 1024) {
                    alert('파일 크기는 5MB 이하로 업로드해주세요.');
                    return;
                }

                // 파일 형식 검증
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                    alert('JPG, PNG, PDF 파일만 업로드 가능합니다.');
                    return;
                }

                console.log('📄 영수증 파일:', {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });

                const self = this;
                
                // 제출 버튼 비활성화
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '업로드 중...';
                }

                // 🔧 현재 API에는 영수증 전용 업로드가 없으므로 상태 변경으로 처리
                // 실제로는 파일 업로드 API가 별도로 필요하지만, 임시로 purchased 상태로 변경
                this.safeApiCall(function() {
                    return SupabaseAPI.updateApplicationStatus(self.currentReceiptItem, 'purchased');
                }).then(function(result) {
                    if (result && result.success !== false) {
                        console.log('✅ 영수증 제출 완료 (상태 변경)');
                        alert('영수증이 등록되었습니다.\n※ 파일은 별도로 관리자에게 전달해주세요.');
                        
                        self.hideReceiptModal();
                        
                        // 대시보드 새로고침
                        setTimeout(() => {
                            self.loadApplications();
                        }, 500);
                    } else {
                        console.error('❌ 영수증 제출 실패:', result);
                        alert('영수증 등록에 실패했습니다: ' + (result.message || result.error || '알 수 없는 오류'));
                    }
                }).catch(function(error) {
                    console.error('❌ 영수증 제출 오류:', error);
                    alert('영수증 등록 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
                }).finally(function() {
                    // 제출 버튼 활성화
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '영수증 등록';
                    }
                });

            } catch (error) {
                console.error('❌ 영수증 제출 처리 오류:', error);
                alert('영수증 제출 처리 중 오류가 발생했습니다.');
            }
        };

        // === 🚀 v2.5 - 교구 신청 수정/삭제 기능 개선 (묶음 신청 지원 추가) ===

        // ✏️ 신청 수정 기능 - 🔧 v2.5 묶음 신청 지원 추가
        window.StudentManager.editApplication = function(itemId) {
            try {
                console.log('✏️ 신청 수정 시작 (v2.5 - 묶음 신청 지원):', itemId);
                
                if (!itemId) {
                    alert('잘못된 요청입니다.');
                    return;
                }

                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                const self = this;

                // 🔧 신청 상세 정보 조회
                this.safeApiCall(function() {
                    return SupabaseAPI.getApplicationById(itemId);
                }).then(function(result) {
                    if (!result || !result.success || !result.data) {
                        alert('신청 정보를 찾을 수 없습니다.');
                        return;
                    }

                    const application = result.data;
                    
                    // 본인 신청인지 확인
                    if (application.user_id !== currentUser.id) {
                        alert('본인의 신청만 수정할 수 있습니다.');
                        return;
                    }

                    // 수정 가능한 상태인지 확인 (pending 상태만 수정 가능)
                    if (application.status !== 'pending') {
                        alert('검토 중인 신청만 수정할 수 있습니다.');
                        return;
                    }

                    console.log('✅ 수정할 신청 정보:', application);
                    
                    // 🔧 v2.5 - 묶음 신청 여부에 따라 다른 모달 열기
                    if (application.is_bundle) {
                        console.log('📦 묶음 신청 수정 모드');
                        self.openEditBundleModal(application);
                    } else {
                        console.log('🛒 일반 신청 수정 모드');
                        self.openEditApplicationModal(application);
                    }

                }).catch(function(error) {
                    console.error('❌ 신청 정보 조회 오류:', error);
                    alert('신청 정보를 불러오는 중 오류가 발생했습니다.');
                });

            } catch (error) {
                console.error('❌ 신청 수정 오류:', error);
                alert('신청 수정 중 오류가 발생했습니다.');
            }
        };

        // 📝 일반 신청 수정 모달 열기
        window.StudentManager.openEditApplicationModal = function(application) {
            try {
                console.log('📝 일반 신청 수정 모달 열기:', application);
                
                const modal = document.getElementById('applicationModal');
                if (!modal) {
                    alert('교구 신청 모달을 찾을 수 없습니다.');
                    return;
                }

                // 수정 모드로 설정
                this.currentEditingItem = application.id;
                
                // 모달 제목 변경
                const modalTitle = document.getElementById('applicationModalTitle');
                if (modalTitle) {
                    modalTitle.textContent = '교구 신청 수정';
                }

                // 제출 버튼 텍스트 변경
                const submitBtn = modal.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = '수정하기';
                }

                // 폼에 기존 데이터 입력
                this.fillApplicationForm(application);

                // 구매 방식에 따른 UI 설정
                this.handlePurchaseMethodChange(application.purchase_type);
                
                // 🚀 v2.5 - 구매 방식 변경 이벤트 리스너 추가
                this.setupPurchaseMethodEventListeners();

                // 모달 표시
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';

                console.log('✅ 일반 신청 수정 모달 열기 완료');
            } catch (error) {
                console.error('❌ 일반 신청 수정 모달 열기 오류:', error);
                alert('수정 모달을 여는 중 오류가 발생했습니다.');
            }
        };

        // 🔧 v2.5 새로 추가 - 묶음 신청 수정 모달 열기
        window.StudentManager.openEditBundleModal = function(application) {
            try {
                console.log('📦 묶음 신청 수정 모달 열기:', application);
                
                const modal = document.getElementById('bundleModal');
                if (!modal) {
                    alert('묶음 신청 모달을 찾을 수 없습니다.');
                    return;
                }

                // 수정 모드로 설정
                this.currentEditingBundleItem = application.id;
                
                // 모달 제목 변경
                const modalTitle = modal.querySelector('h3');
                if (modalTitle) {
                    modalTitle.textContent = '묶음 교구 신청 수정';
                }

                // 제출 버튼 텍스트 변경
                const submitBtn = modal.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = '수정하기';
                }

                // 폼에 기존 데이터 입력
                this.fillBundleForm(application);

                // 모달 표시
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';

                console.log('✅ 묶음 신청 수정 모달 열기 완료');
            } catch (error) {
                console.error('❌ 묶음 신청 수정 모달 열기 오류:', error);
                alert('묶음 수정 모달을 여는 중 오류가 발생했습니다.');
            }
        };

        // 🔧 v2.5 새로 추가 - 묶음 신청 폼에 기존 데이터 채우기
        window.StudentManager.fillBundleForm = function(application) {
            try {
                console.log('📦 묶음 신청 폼에 기존 데이터 채우기');
                
                const form = document.getElementById('bundleForm');
                if (!form) return;

                // 기본 정보 입력
                const bundleTitleField = form.querySelector('#bundleTitle');
                const bundlePurposeField = form.querySelector('#bundlePurpose');
                const bundleTotalPriceField = form.querySelector('#bundleTotalPrice');

                if (bundleTitleField) bundleTitleField.value = application.item_name || '';
                if (bundlePurposeField) bundlePurposeField.value = application.purpose || '';
                if (bundleTotalPriceField) bundleTotalPriceField.value = application.price || '';

                // 구매 방식 라디오 버튼 설정
                const bundlePurchaseMethodRadios = form.querySelectorAll('input[name="bundlePurchaseMethod"]');
                bundlePurchaseMethodRadios.forEach(radio => {
                    radio.checked = (radio.value === application.purchase_type);
                });

                // 구매 방식에 따른 UI 업데이트
                window.toggleBundlePurchaseInfo(application.purchase_type);

                // 추가 정보 파싱 및 입력 (purchase_link에서 정보 추출)
                if (application.purchase_link) {
                    this.parseBundlePurchaseDetails(application.purchase_link, form);
                }

                console.log('✅ 묶음 신청 폼 데이터 채우기 완료');
            } catch (error) {
                console.error('❌ 묶음 신청 폼 데이터 채우기 오류:', error);
            }
        };

        // 🔧 v2.5 새로 추가 - 묶음 구매 정보 파싱
        window.StudentManager.parseBundlePurchaseDetails = function(purchaseLink, form) {
            try {
                console.log('📦 구매 정보 파싱:', purchaseLink);
                
                if (purchaseLink.includes('[온라인 구매]')) {
                    // 온라인 구매 정보 파싱
                    const siteMatch = purchaseLink.match(/구매 사이트: (.+)/);
                    const idMatch = purchaseLink.match(/계정 ID: (.+)/);
                    const noteMatch = purchaseLink.match(/장바구니 메모: (.+)/);
                    
                    if (siteMatch) {
                        const purchaseSiteField = form.querySelector('#purchaseSite');
                        if (purchaseSiteField) {
                            purchaseSiteField.value = siteMatch[1].trim();
                            // 기타 사이트 처리
                            if (!['coupang', '11st', 'gmarket', 'auction', 'interpark', 'lotte', 'ssg', 'yes24', 'kyobo'].includes(siteMatch[1].trim())) {
                                purchaseSiteField.value = 'other';
                                const otherSiteField = form.querySelector('#otherSite');
                                if (otherSiteField) {
                                    otherSiteField.value = siteMatch[1].trim();
                                    otherSiteField.style.display = 'block';
                                }
                            }
                        }
                    }
                    
                    if (idMatch) {
                        const accountIdField = form.querySelector('#accountId');
                        if (accountIdField) accountIdField.value = idMatch[1].trim();
                    }
                    
                    if (noteMatch) {
                        const cartNoteField = form.querySelector('#cartNote');
                        if (cartNoteField) cartNoteField.value = noteMatch[1].trim();
                    }
                    
                } else if (purchaseLink.includes('[오프라인 구매]')) {
                    // 오프라인 구매 정보 파싱
                    const vendorMatch = purchaseLink.match(/구매 업체: (.+)/);
                    const planMatch = purchaseLink.match(/구매 계획: (.+)/);
                    
                    if (vendorMatch) {
                        const offlineVendorField = form.querySelector('#offlineVendor');
                        if (offlineVendorField) offlineVendorField.value = vendorMatch[1].trim();
                    }
                    
                    if (planMatch) {
                        const purchasePlanField = form.querySelector('#purchasePlan');
                        if (purchasePlanField) purchasePlanField.value = planMatch[1].trim();
                    }
                }
                
                console.log('✅ 구매 정보 파싱 완료');
            } catch (error) {
                console.error('❌ 구매 정보 파싱 오류:', error);
            }
        };

        // 📝 폼에 기존 데이터 채우기
        window.StudentManager.fillApplicationForm = function(application) {
            try {
                console.log('📝 폼에 기존 데이터 채우기');
                
                const form = document.getElementById('applicationForm');
                if (!form) return;

                // 기본 정보 입력
                const itemNameField = form.querySelector('#itemName');
                const itemPurposeField = form.querySelector('#itemPurpose');
                const itemPriceField = form.querySelector('#itemPrice');
                const itemLinkField = form.querySelector('#itemLink');

                if (itemNameField) itemNameField.value = application.item_name || '';
                if (itemPurposeField) itemPurposeField.value = application.purpose || '';
                if (itemPriceField) itemPriceField.value = application.price || '';
                if (itemLinkField) itemLinkField.value = application.purchase_link || '';

                // 구매 방식 라디오 버튼 설정
                const purchaseMethodRadios = form.querySelectorAll('input[name="purchaseMethod"]');
                purchaseMethodRadios.forEach(radio => {
                    radio.checked = (radio.value === application.purchase_type);
                });

                console.log('✅ 폼 데이터 채우기 완료');
            } catch (error) {
                console.error('❌ 폼 데이터 채우기 오류:', error);
            }
        };

        // 🗑️ 신청 삭제 기능 - 실제 동작 구현
        window.StudentManager.deleteApplication = function(itemId) {
            try {
                console.log('🗑️ 신청 삭제 시작:', itemId);
                
                if (!itemId) {
                    alert('잘못된 요청입니다.');
                    return;
                }

                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                // 삭제 확인
                if (!confirm('정말로 이 신청을 삭제하시겠습니까?\n\n삭제된 신청은 복구할 수 없습니다.')) {
                    return;
                }

                const self = this;

                // 🔧 신청 정보 확인 후 삭제
                this.safeApiCall(function() {
                    return SupabaseAPI.getApplicationById(itemId);
                }).then(function(result) {
                    if (!result || !result.success || !result.data) {
                        alert('신청 정보를 찾을 수 없습니다.');
                        return;
                    }

                    const application = result.data;
                    
                    // 본인 신청인지 확인
                    if (application.user_id !== currentUser.id) {
                        alert('본인의 신청만 삭제할 수 있습니다.');
                        return;
                    }

                    // 삭제 가능한 상태인지 확인 (pending 상태만 삭제 가능)
                    if (application.status !== 'pending') {
                        alert('검토 중인 신청만 삭제할 수 있습니다.');
                        return;
                    }

                    console.log('✅ 삭제 가능한 신청 확인됨:', application);

                    // 실제 삭제 실행
                    return self.safeApiCall(function() {
                        return SupabaseAPI.deleteApplication(itemId);
                    });

                }).then(function(deleteResult) {
                    if (deleteResult && deleteResult.success !== false) {
                        console.log('✅ 신청 삭제 완료');
                        alert('신청이 삭제되었습니다.');
                        
                        // 대시보드 새로고침
                        self.loadApplications();
                        self.updateBudgetStatus();
                    } else {
                        console.error('❌ 신청 삭제 실패:', deleteResult);
                        alert('신청 삭제에 실패했습니다: ' + (deleteResult?.message || deleteResult?.error || '알 수 없는 오류'));
                    }
                }).catch(function(error) {
                    console.error('❌ 신청 삭제 오류:', error);
                    alert('신청 삭제 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
                });

            } catch (error) {
                console.error('❌ 신청 삭제 오류:', error);
                alert('신청 삭제 중 오류가 발생했습니다.');
            }
        };

        // === 지원 기능들 구현 ===

        // 🔒 간단한 비밀번호 암호화 (실제로는 더 강력한 암호화 필요)
        window.StudentManager.encryptPassword = function(password) {
            try {
                // 실제 운영에서는 더 강력한 암호화가 필요
                // 여기서는 Base64 인코딩만 사용 (데모용)
                return btoa(password + '_encrypted_' + Date.now());
            } catch (error) {
                console.error('비밀번호 암호화 오류:', error);
                return password; // 암호화 실패시 원본 반환 (보안상 위험하므로 실제로는 오류 처리 필요)
            }
        };

        // 영수증 파일 변경 처리
        window.StudentManager.handleReceiptFileChange = function(event) {
            try {
                const file = event.target.files[0];
                const preview = document.getElementById('receiptPreview');
                const fileName = document.getElementById('receiptFileName');
                const removeBtn = document.getElementById('removeReceiptBtn');

                if (file) {
                    if (fileName) fileName.textContent = file.name;
                    if (removeBtn) removeBtn.style.display = 'inline-block';
                    
                    // 이미지 파일인 경우 미리보기
                    if (file.type.startsWith('image/') && preview) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            preview.innerHTML = `<img src="${e.target.result}" alt="영수증 미리보기" style="max-width: 100%; height: auto;">`;
                            preview.style.display = 'block';
                        };
                        reader.readAsDataURL(file);
                    } else if (preview) {
                        preview.innerHTML = `<p>📄 ${file.name} (${this.formatFileSize(file.size)})</p>`;
                        preview.style.display = 'block';
                    }

                    console.log('📄 영수증 파일 선택됨:', file.name);
                }
            } catch (error) {
                console.error('❌ 영수증 파일 변경 처리 오류:', error);
            }
        };

        // 영수증 파일 제거
        window.StudentManager.removeReceiptFile = function() {
            try {
                const fileInput = document.getElementById('receiptFile');
                const preview = document.getElementById('receiptPreview');
                const fileName = document.getElementById('receiptFileName');
                const removeBtn = document.getElementById('removeReceiptBtn');

                if (fileInput) fileInput.value = '';
                if (preview) {
                    preview.style.display = 'none';
                    preview.innerHTML = '';
                }
                if (fileName) fileName.textContent = '';
                if (removeBtn) removeBtn.style.display = 'none';

                console.log('📄 영수증 파일 제거됨');
            } catch (error) {
                console.error('❌ 영수증 파일 제거 오류:', error);
            }
        };

        // 파일 크기 포맷팅
        window.StudentManager.formatFileSize = function(bytes) {
            try {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            } catch (error) {
                return bytes + ' bytes';
            }
        };

        // 드래그 앤 드롭 설정
        window.StudentManager.setupDragAndDrop = function() {
            try {
                const dropZone = document.getElementById('receiptDropZone');
                if (!dropZone) return;

                const self = this;

                // 드래그 이벤트 방지
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, this.preventDefaults, false);
                    document.body.addEventListener(eventName, this.preventDefaults, false);
                });

                // 드래그 오버 스타일
                ['dragenter', 'dragover'].forEach(eventName => {
                    dropZone.addEventListener(eventName, () => {
                        dropZone.classList.add('drag-over');
                    }, false);
                });

                ['dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, () => {
                        dropZone.classList.remove('drag-over');
                    }, false);
                });

                // 파일 드롭 처리
                dropZone.addEventListener('drop', function(e) {
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        const fileInput = document.getElementById('receiptFile');
                        if (fileInput) {
                            fileInput.files = files;
                            self.handleReceiptFileChange({ target: { files: files } });
                        }
                    }
                }, false);

                console.log('✅ 드래그 앤 드롭 설정 완료');
            } catch (error) {
                console.error('❌ 드래그 앤 드롭 설정 오류:', error);
            }
        };

        // 🆕 배송지 설정 기능을 StudentManager에 연결
        window.StudentManager.showShippingModal = function() {
            console.log('📦 StudentManager에서 배송지 모달 호출 - StudentAddon으로 위임');
            if (window.StudentAddon && typeof window.StudentAddon.showShippingModal === 'function') {
                return window.StudentAddon.showShippingModal();
            } else {
                alert('배송지 설정 기능을 사용할 수 없습니다.');
            }
        };

        console.log('✅ StudentManager 확장 완료 - v2.5 묶음신청 수정 모달 및 참고링크 표시 버그 수정');
    });

    console.log('📚 StudentAddon 로드 완료 - v2.5 묶음신청 수정 모달 및 참고링크 표시 버그 수정');
})();