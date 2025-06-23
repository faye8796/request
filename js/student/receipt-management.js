// 영수증 관리 모듈 v4.1.4 - total_amount 필드 지원 및 저장 오류 수정
// 📄 책임: 영수증 업로드, 제출, 파일 관리, 모달 처리
// 🔗 의존성: StudentManager, SupabaseAPI
// 🎯 목표: student-addon.js 완전 대체 + 사용자 경험 개선
// 🔧 v4.1.4: total_amount 필드 지원으로 영수증 저장 오류 수정

(function() {
    'use strict';
    
    console.log('📄 ReceiptManagement v4.1.4 로드 시작 - total_amount 필드 지원');

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
        version: '4.1.4',
        studentManager: null,
        currentReceiptItem: null,
        isDragActive: false,

        // === 초기화 ===
        init: function(studentManager) {
            try {
                console.log('📄 ReceiptManagement 모듈 초기화 시작 v4.1.4');
                this.studentManager = studentManager;
                this.setupDragAndDrop();
                console.log('✅ ReceiptManagement 모듈 초기화 완료 v4.1.4');
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
                console.log('📄 영수증 모달 표시 (v4.1.4):', requestId);
                
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

        // 영수증 제출 처리 - v4.1.4 total_amount 필드 지원
        handleReceiptSubmit: function(event) {
            try {
                // 🚨 중요: Form 기본 제출 동작 방지
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                
                console.log('📄 영수증 제출 처리 시작 (v4.1.4 - total_amount 필드 지원)');
                
                if (!this.currentReceiptItem) {
                    alert('영수증을 등록할 신청을 찾을 수 없습니다.');
                    return false;
                }

                const form = document.getElementById('receiptForm');
                if (!form) {
                    console.error('영수증 폼을 찾을 수 없습니다');
                    return false;
                }

                const receiptFile = document.getElementById('receiptFile');
                if (!receiptFile || !receiptFile.files || receiptFile.files.length === 0) {
                    alert('영수증 파일을 선택해주세요.');
                    return false;
                }

                const file = receiptFile.files[0];
                
                // 파일 유효성 검증
                if (!this.validateReceiptFile(file)) {
                    return false;
                }

                const currentUser = this.getCurrentUserSafely();
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return false;
                }

                // 🔧 v4.1.4 폼 데이터 수집 - total_amount 필드 추가 지원
                const formData = new FormData(form);
                const receiptData = {
                    purchaseDate: formData.get('purchaseDate') || null,
                    purchaseStore: formData.get('purchaseStore') || null,
                    note: formData.get('receiptNote') || null
                };

                console.log('📄 영수증 데이터 (v4.1.4):', {
                    file: {
                        name: file.name,
                        size: file.size,
                        type: file.type
                    },
                    data: receiptData
                });

                const self = this;
                
                // 제출 버튼 비활성화
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '업로드 중...';
                }

                // 🚀 v4.1.4 영수증 업로드 및 제출 완료 처리 (total_amount 필드 지원)
                console.log('📄 1단계: 파일 업로드 시작 (v4.1.4)');
                
                this.safeApiCall(function() {
                    return SupabaseAPI.uploadReceiptFile(file, self.currentReceiptItem, currentUser.id);
                }).then(function(uploadResult) {
                    if (!uploadResult || !uploadResult.success) {
                        throw new Error('파일 업로드 실패: ' + (uploadResult?.message || '알 수 없는 오류'));
                    }
                    
                    console.log('✅ 1단계 완료: 파일 업로드 성공 (v4.1.4)');
                    console.log('📄 2단계: 영수증 메타데이터 저장 시작 (v4.1.4)');
                    
                    // 🔧 v4.1.4 업로드된 파일 정보와 추가 데이터 합치기 (total_amount 포함)
                    const completeReceiptData = {
                        ...uploadResult.data,
                        ...receiptData,
                        // 🔧 v4.1.4 중요: total_amount 필드 추가 (requestPrice 사용)
                        totalAmount: uploadResult.data.requestPrice || 0
                    };
                    
                    console.log('📄 완전한 영수증 데이터 (v4.1.4 - total_amount 포함):', completeReceiptData);
                    
                    // 영수증 메타데이터 저장
                    return self.safeApiCall(function() {
                        return SupabaseAPI.saveReceiptInfo(self.currentReceiptItem, completeReceiptData);
                    });
                    
                }).then(function(saveResult) {
                    if (!saveResult || !saveResult.success) {
                        throw new Error('영수증 정보 저장 실패: ' + (saveResult?.message || '알 수 없는 오류'));
                    }
                    
                    console.log('✅ 2단계 완료: 영수증 메타데이터 저장 성공 (v4.1.4)');
                    console.log('📄 3단계: 신청 상태 변경 시작 (v4.1.4)');
                    
                    // 신청 상태를 'purchased'로 변경
                    return self.safeApiCall(function() {
                        return SupabaseAPI.completeReceiptSubmission(self.currentReceiptItem);
                    });
                    
                }).then(function(statusResult) {
                    if (!statusResult || !statusResult.success) {
                        throw new Error('신청 상태 변경 실패: ' + (statusResult?.message || '알 수 없는 오류'));
                    }
                    
                    console.log('✅ 3단계 완료: 신청 상태 변경 성공 (v4.1.4)');
                    console.log('🎉 영수증 제출 완료 - 모든 단계 성공 (v4.1.4 - total_amount 필드 지원)');
                    
                    alert('영수증이 성공적으로 등록되었습니다!\\n신청 상태가 \"구매완료\"로 변경되었습니다.');
                    
                    self.hideReceiptModal();
                    
                    // 🆕 v4.1.4: 대시보드 즉시 새로고침 및 강제 캐시 무효화
                    setTimeout(() => {
                        self.forceRefreshApplications();
                    }, 500);
                    
                }).catch(function(error) {
                    console.error('❌ 영수증 제출 오류 (v4.1.4):', error);
                    
                    let errorMessage = '알 수 없는 오류';
                    if (error.message) {
                        if (error.message.includes('파일 업로드')) {
                            errorMessage = '파일 업로드에 실패했습니다. 파일 크기와 형식을 확인해주세요.';
                        } else if (error.message.includes('메타데이터') || error.message.includes('total_amount')) {
                            errorMessage = '영수증 정보 저장에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.';
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

                return false; // Form 제출 방지
            } catch (error) {
                console.error('❌ 영수증 제출 처리 오류 (v4.1.4):', error);
                alert('영수증 제출 처리 중 오류가 발생했습니다.');
                return false;
            }
        },

        // 🆕 v4.1.4: 강제 대시보드 새로고침
        forceRefreshApplications: function() {
            try {
                console.log('🔄 강제 대시보드 새로고침 시작 (v4.1.4)');
                
                // StudentManager의 loadApplications 호출
                if (window.StudentManager && window.StudentManager.loadApplications) {
                    window.StudentManager.loadApplications();
                }
                
                // ApiHelper를 통한 대시보드 데이터 새로고침
                if (window.ApiHelper && window.ApiHelper.refreshDashboardData) {
                    window.ApiHelper.refreshDashboardData();
                }
                
                console.log('✅ 강제 대시보드 새로고침 완료 (v4.1.4)');
            } catch (error) {
                console.error('❌ 강제 대시보드 새로고침 오류:', error);
            }
        },

        // === 📄 영수증 폼 관리 ===

        // 영수증 폼 초기화 - v4.1.4 개선
        resetReceiptForm: function() {
            try {
                const form = document.getElementById('receiptForm');
                if (form) {
                    form.reset();
                }
                
                this.clearFileSelection();
                console.log('📄 영수증 폼 초기화 완료 (v4.1.4)');
            } catch (error) {
                console.error('❌ 영수증 폼 초기화 오류:', error);
            }
        },

        // === 📄 파일 관리 - v4.1.4 개선 ===

        // 📁 드래그 앤 드롭 설정
        setupDragAndDrop: function() {
            try {
                const dropZone = document.getElementById('receiptDropZone');
                if (!dropZone) return;

                const self = this;

                // 드래그 이벤트 핸들러
                dropZone.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.handleDragOver(e);
                });

                dropZone.addEventListener('dragenter', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.handleDragEnter(e);
                });

                dropZone.addEventListener('dragleave', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.handleDragLeave(e);
                });

                dropZone.addEventListener('drop', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.handleFileDrop(e);
                });

                console.log('✅ 드래그 앤 드롭 설정 완료 (v4.1.4)');
            } catch (error) {
                console.error('❌ 드래그 앤 드롭 설정 오류:', error);
            }
        },

        // 드래그 오버 처리
        handleDragOver: function(e) {
            try {
                const dropZone = document.getElementById('receiptDropZone');
                if (dropZone && !this.isDragActive) {
                    dropZone.classList.add('drag-over');
                    this.isDragActive = true;
                }
            } catch (error) {
                console.error('드래그 오버 처리 오류:', error);
            }
        },

        // 드래그 진입 처리
        handleDragEnter: function(e) {
            try {
                const dropZone = document.getElementById('receiptDropZone');
                if (dropZone) {
                    dropZone.classList.add('drag-over');
                }
            } catch (error) {
                console.error('드래그 진입 처리 오류:', error);
            }
        },

        // 드래그 벗어남 처리
        handleDragLeave: function(e) {
            try {
                const dropZone = document.getElementById('receiptDropZone');
                if (dropZone) {
                    // 실제로 드롭존을 벗어났는지 확인
                    if (!dropZone.contains(e.relatedTarget)) {
                        dropZone.classList.remove('drag-over');
                        this.isDragActive = false;
                    }
                }
            } catch (error) {
                console.error('드래그 벗어남 처리 오류:', error);
            }
        },

        // 파일 드롭 처리
        handleFileDrop: function(e) {
            try {
                const dropZone = document.getElementById('receiptDropZone');
                if (dropZone) {
                    dropZone.classList.remove('drag-over');
                    this.isDragActive = false;
                }

                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    const file = files[0];
                    
                    // 파일 유효성 검증
                    if (this.validateReceiptFile(file)) {
                        // 파일 input에 설정
                        const fileInput = document.getElementById('receiptFile');
                        if (fileInput) {
                            // DataTransfer 객체를 사용해서 파일 설정
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            fileInput.files = dataTransfer.files;
                            
                            // 파일 변경 이벤트 트리거
                            this.handleReceiptFileChange({ target: fileInput });
                        }
                    }
                }
            } catch (error) {
                console.error('❌ 파일 드롭 처리 오류:', error);
            }
        },

        // 영수증 파일 변경 처리 - v4.1.4 개선
        handleReceiptFileChange: function(event) {
            try {
                const file = event.target.files[0];
                
                if (file) {
                    console.log('📄 파일 선택됨 (v4.1.4):', {
                        name: file.name,
                        size: file.size,
                        type: file.type
                    });

                    // 파일 유효성 검증
                    if (!this.validateReceiptFile(file)) {
                        this.clearFileSelection();
                        return;
                    }

                    this.displaySelectedFile(file);
                } else {
                    this.clearFileSelection();
                }
            } catch (error) {
                console.error('❌ 영수증 파일 변경 처리 오류:', error);
            }
        },

        // 🆕 선택된 파일 표시 - v4.1.4
        displaySelectedFile: function(file) {
            try {
                // 업로드 영역 숨기기
                const uploadContent = document.getElementById('uploadContent');
                const fileSelectedContent = document.getElementById('fileSelectedContent');
                
                if (uploadContent) uploadContent.style.display = 'none';
                if (fileSelectedContent) {
                    fileSelectedContent.style.display = 'block';
                    fileSelectedContent.classList.add('active');
                }

                // 파일 정보 표시
                const fileName = document.getElementById('receiptFileName');
                const fileSize = document.getElementById('receiptFileSize');

                if (fileName) fileName.textContent = file.name;
                if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

                // 이미지 파일인 경우 미리보기
                if (file.type.startsWith('image/')) {
                    this.showImagePreview(file);
                } else {
                    this.hideImagePreview();
                }

                console.log('✅ 선택된 파일 표시 완료 (v4.1.4)');
            } catch (error) {
                console.error('❌ 선택된 파일 표시 오류:', error);
            }
        },

        // 🆕 이미지 미리보기 표시
        showImagePreview: function(file) {
            try {
                const preview = document.getElementById('receiptPreview');
                if (!preview) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="영수증 미리보기" style="max-width: 100%; height: auto;">`;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('이미지 미리보기 표시 오류:', error);
            }
        },

        // 🆕 이미지 미리보기 숨김
        hideImagePreview: function() {
            try {
                const preview = document.getElementById('receiptPreview');
                if (preview) {
                    preview.style.display = 'none';
                    preview.innerHTML = '';
                }
            } catch (error) {
                console.error('이미지 미리보기 숨김 오류:', error);
            }
        },

        // 영수증 파일 제거 - v4.1.4 개선
        removeReceiptFile: function() {
            try {
                const fileInput = document.getElementById('receiptFile');
                if (fileInput) {
                    fileInput.value = '';
                }
                
                this.clearFileSelection();
                console.log('📄 영수증 파일 제거됨 (v4.1.4)');
            } catch (error) {
                console.error('❌ 영수증 파일 제거 오류:', error);
            }
        },

        // 🆕 파일 선택 초기화 - v4.1.4
        clearFileSelection: function() {
            try {
                // UI 요소들 복원
                const uploadContent = document.getElementById('uploadContent');
                const fileSelectedContent = document.getElementById('fileSelectedContent');
                
                if (uploadContent) uploadContent.style.display = 'flex';
                if (fileSelectedContent) {
                    fileSelectedContent.style.display = 'none';
                    fileSelectedContent.classList.remove('active');
                }

                // 파일 정보 초기화
                const fileName = document.getElementById('receiptFileName');
                const fileSize = document.getElementById('receiptFileSize');
                
                if (fileName) fileName.textContent = '';
                if (fileSize) fileSize.textContent = '';

                // 미리보기 숨김
                this.hideImagePreview();

                console.log('✅ 파일 선택 초기화 완료 (v4.1.4)');
            } catch (error) {
                console.error('❌ 파일 선택 초기화 오류:', error);
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
        console.log('✅ StudentManager 감지됨 - ReceiptManagement 모듈 연동 시작 v4.1.4');
        
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

        window.StudentManager.handleReceiptSubmit = function(event) {
            if (window.ReceiptManagementModule && typeof window.ReceiptManagementModule.handleReceiptSubmit === 'function') {
                return window.ReceiptManagementModule.handleReceiptSubmit(event);
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

        // 🆕 v4.1.4: Form 제출 이벤트 핸들러 설정
        const receiptForm = document.getElementById('receiptForm');
        if (receiptForm) {
            receiptForm.addEventListener('submit', function(event) {
                console.log('📄 영수증 폼 제출 이벤트 감지 (v4.1.4)');
                window.ReceiptManagementModule.handleReceiptSubmit(event);
            });
        }

        // 🆕 v4.1.4: 파일 제거 버튼 이벤트 핸들러
        const removeBtn = document.getElementById('removeReceiptBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                window.ReceiptManagementModule.removeReceiptFile();
            });
        }

        // 🔧 v4.1.4: 파일 선택 이벤트 핸들러 추가
        const receiptFileInput = document.getElementById('receiptFile');
        if (receiptFileInput) {
            receiptFileInput.addEventListener('change', function(event) {
                console.log('📄 파일 선택 이벤트 감지 (v4.1.4) - 클릭으로 파일 선택');
                window.ReceiptManagementModule.handleReceiptFileChange(event);
            });
            console.log('✅ 파일 선택 이벤트 핸들러 추가 완료 (v4.1.4)');
        } else {
            console.warn('⚠️ receiptFile input을 찾을 수 없습니다 (v4.1.4)');
        }

        console.log('✅ StudentManager 확장 완료 - ReceiptManagement v4.1.4 (total_amount 필드 지원)');
    }).catch((error) => {
        console.error('❌ StudentManager 연동 실패:', error);
    });

    console.log('📄 ReceiptManagement v4.1.4 로드 완료 - total_amount 필드 지원으로 영수증 저장 오류 수정');
})();
