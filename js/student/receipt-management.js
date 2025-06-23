// 영수증 관리 모듈 v3.2 - 완전 독립형 모듈
// 📄 책임: 영수증 업로드, 제출, 파일 관리, 모달 처리
// 🔗 의존성: StudentManager, SupabaseAPI
// 🎯 목표: student-addon.js 완전 대체

(function() {
    'use strict';
    
    console.log('📄 ReceiptManagement v3.2 로드 시작 - 완전 독립형 영수증 모듈');

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

    // 영수증 관리 모듈 정의
    const ReceiptManagementModule = {
        name: 'ReceiptManagement',
        version: '3.2.0',
        studentManager: null,
        currentReceiptItem: null,

        // === 초기화 ===
        init: function(studentManager) {
            try {
                console.log('📄 ReceiptManagement 모듈 초기화 시작');
                this.studentManager = studentManager;
                console.log('✅ ReceiptManagement 모듈 초기화 완료');
                return true;
            } catch (error) {
                console.error('❌ ReceiptManagement 모듈 초기화 실패:', error);
                return false;
            }
        },

        // === 📄 영수증 모달 관리 ===

        // 영수증 모달 표시
        showReceiptModal: function(requestId) {
            try {
                console.log('📄 영수증 모달 표시 (v3.2):', requestId);
                
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
        },

        // 영수증 모달 숨김
        hideReceiptModal: function() {
            try {
                const modal = document.getElementById('receiptModal');
                if (modal) {
                    modal.classList.remove('show');
                    document.body.style.overflow = '';
                    this.resetReceiptForm();
                    this.currentReceiptItem = null;
                }
                console.log('📄 영수증 모달 숨김 완료');
            } catch (error) {
                console.error('❌ 영수증 모달 숨김 오류:', error);
            }
        },

        // === 📄 영수증 제출 처리 ===

        // 영수증 제출 처리
        handleReceiptSubmit: function() {
            try {
                console.log('📄 영수증 제출 처리 시작 (v3.2)');
                
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
                
                // 파일 유효성 검증
                if (!this.validateReceiptFile(file)) {
                    return;
                }

                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }

                // 폼 데이터 수집
                const formData = new FormData(form);
                const receiptData = {
                    purchaseDate: formData.get('purchaseDateTime') || null,
                    purchaseStore: formData.get('purchaseStore') || null,
                    note: formData.get('receiptNote') || null
                };

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

                // 영수증 업로드 및 제출 완료 처리
                console.log('📄 1단계: 파일 업로드 시작');
                
                this.safeApiCall(function() {
                    return SupabaseAPI.uploadReceiptFile(file, self.currentReceiptItem, currentUser.id);
                }).then(function(uploadResult) {
                    if (!uploadResult || !uploadResult.success) {
                        throw new Error('파일 업로드 실패: ' + (uploadResult?.message || '알 수 없는 오류'));
                    }
                    
                    console.log('✅ 1단계 완료: 파일 업로드 성공');
                    console.log('📄 2단계: 영수증 메타데이터 저장 시작');
                    
                    // 업로드된 파일 정보와 추가 데이터 합치기
                    const completeReceiptData = {
                        ...uploadResult.data,
                        ...receiptData
                    };
                    
                    // 영수증 메타데이터 저장
                    return self.safeApiCall(function() {
                        return SupabaseAPI.saveReceiptInfo(self.currentReceiptItem, completeReceiptData);
                    });
                    
                }).then(function(saveResult) {
                    if (!saveResult || !saveResult.success) {
                        throw new Error('영수증 정보 저장 실패: ' + (saveResult?.message || '알 수 없는 오류'));
                    }
                    
                    console.log('✅ 2단계 완료: 영수증 메타데이터 저장 성공');
                    console.log('📄 3단계: 신청 상태 변경 시작');
                    
                    // 신청 상태를 'purchased'로 변경
                    return self.safeApiCall(function() {
                        return SupabaseAPI.completeReceiptSubmission(self.currentReceiptItem);
                    });
                    
                }).then(function(statusResult) {
                    if (!statusResult || !statusResult.success) {
                        throw new Error('신청 상태 변경 실패: ' + (statusResult?.message || '알 수 없는 오류'));
                    }
                    
                    console.log('✅ 3단계 완료: 신청 상태 변경 성공');
                    console.log('🎉 영수증 제출 완료 - 모든 단계 성공');
                    
                    alert('영수증이 성공적으로 등록되었습니다!\\n신청 상태가 "구매완료"로 변경되었습니다.');
                    
                    self.hideReceiptModal();
                    
                    // 대시보드 새로고침
                    setTimeout(() => {
                        if (window.StudentManager && window.StudentManager.loadApplications) {
                            window.StudentManager.loadApplications();
                        }
                    }, 500);
                    
                }).catch(function(error) {
                    console.error('❌ 영수증 제출 오류:', error);
                    
                    let errorMessage = '알 수 없는 오류';
                    if (error.message) {
                        if (error.message.includes('파일 업로드')) {
                            errorMessage = '파일 업로드에 실패했습니다. 파일 크기와 형식을 확인해주세요.';
                        } else if (error.message.includes('메타데이터')) {
                            errorMessage = '영수증 정보 저장에 실패했습니다.';
                        } else if (error.message.includes('상태 변경')) {
                            errorMessage = '신청 상태 업데이트에 실패했습니다.';
                        } else {
                            errorMessage = error.message;
                        }
                    }
                    
                    alert('영수증 등록 중 오류가 발생했습니다:\\n' + errorMessage);
                    
                }).finally(function() {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '영수증 제출';
                    }
                });

            } catch (error) {
                console.error('❌ 영수증 제출 처리 오류:', error);
                alert('영수증 제출 처리 중 오류가 발생했습니다.');
            }
        },

        // === 📄 영수증 폼 관리 ===

        // 영수증 폼 초기화
        resetReceiptForm: function() {
            try {
                const form = document.getElementById('receiptForm');
                if (form) {
                    form.reset();
                }
                
                this.removeReceiptFile();
                console.log('📄 영수증 폼 초기화 완료');
            } catch (error) {
                console.error('❌ 영수증 폼 초기화 오류:', error);
            }
        },

        // === 📄 파일 관리 ===

        // 영수증 파일 변경 처리
        handleReceiptFileChange: function(event) {
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
        },

        // 영수증 파일 제거
        removeReceiptFile: function() {
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
        },

        // 영수증 파일 검증
        validateReceiptFile: function(file) {
            try {
                // 파일 크기 검증 (5MB 제한)
                if (file.size > 5 * 1024 * 1024) {
                    alert('파일 크기는 5MB 이하로 업로드해주세요.');
                    return false;
                }

                // 파일 형식 검증
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                    alert('JPG, PNG, PDF 파일만 업로드 가능합니다.');
                    return false;
                }

                return true;
            } catch (error) {
                console.error('❌ 영수증 파일 검증 오류:', error);
                return false;
            }
        },

        // === 📄 유틸리티 함수들 ===

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

        // 파일 크기 포맷팅
        formatFileSize: function(bytes) {
            try {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            } catch (error) {
                return bytes + ' bytes';
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

        // 알림 아이콘 가져오기 (영수증용)
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

    // 전역 노출
    window.ReceiptManagementModule = ReceiptManagementModule;

    // StudentManager와 연동
    waitForStudentManager().then(() => {
        console.log('✅ StudentManager 감지됨 - ReceiptManagement 모듈 연동 시작');
        
        // ReceiptManagement 모듈 초기화
        const initResult = ReceiptManagementModule.init(window.StudentManager);
        if (!initResult) {
            console.error('❌ ReceiptManagement 모듈 초기화 실패');
            return;
        }

        // 영수증 관련 기능들을 StudentManager에 연결
        window.StudentManager.showReceiptModal = function(requestId) {
            console.log('📄 StudentManager에서 영수증 모달 호출 - ReceiptManagement로 위임');
            if (window.ReceiptManagementModule && typeof window.ReceiptManagementModule.showReceiptModal === 'function') {
                return window.ReceiptManagementModule.showReceiptModal(requestId);
            } else {
                alert('영수증 등록 기능을 사용할 수 없습니다.');
            }
        };

        window.StudentManager.handleReceiptSubmit = function() {
            if (window.ReceiptManagementModule && typeof window.ReceiptManagementModule.handleReceiptSubmit === 'function') {
                return window.ReceiptManagementModule.handleReceiptSubmit();
            } else {
                alert('영수증 제출 기능을 준비 중입니다.');
            }
        };

        window.StudentManager.hideReceiptModal = function() {
            if (window.ReceiptManagementModule && window.ReceiptManagementModule.hideReceiptModal) {
                window.ReceiptManagementModule.hideReceiptModal();
            }
        };

        window.StudentManager.resetReceiptForm = function() {
            if (window.ReceiptManagementModule && window.ReceiptManagementModule.resetReceiptForm) {
                window.ReceiptManagementModule.resetReceiptForm();
            }
        };

        window.StudentManager.handleReceiptFileChange = function(event) {
            if (window.ReceiptManagementModule && window.ReceiptManagementModule.handleReceiptFileChange) {
                window.ReceiptManagementModule.handleReceiptFileChange(event);
            }
        };

        window.StudentManager.removeReceiptFile = function() {
            if (window.ReceiptManagementModule && window.ReceiptManagementModule.removeReceiptFile) {
                window.ReceiptManagementModule.removeReceiptFile();
            }
        };

        console.log('✅ StudentManager 확장 완료 - ReceiptManagement v3.2 (완전 독립형 모듈)');
    }).catch((error) => {
        console.error('❌ StudentManager 연동 실패:', error);
    });

    console.log('📄 ReceiptManagement v3.2 로드 완료 - student-addon.js 완전 대체');
})();