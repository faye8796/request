// 학생 기능 확장 모듈 - 누락된 교구 신청 기능들 구현
// StudentManager의 누락된 메서드들을 확장하여 교구 신청 기능을 완전히 복구

// StudentManager 확장 - 누락된 교구 신청 기능들 구현
(function() {
    'use strict';
    
    console.log('📚 StudentAddon 로드 시작 - 교구신청 기능 복구');

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

    // StudentManager 확장 실행
    waitForStudentManager().then(() => {
        console.log('✅ StudentManager 감지됨 - 확장 기능 추가 시작');
        
        // === 교구 신청 모달 기능 구현 ===
        
        // 🛒 일반 교구 신청 모달 표시
        window.StudentManager.showApplicationModal = function() {
            try {
                console.log('🛒 일반 교구 신청 모달 표시');
                
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

                    // 모달 표시
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';

                    // 첫 번째 입력 필드에 포커스
                    const firstInput = modal.querySelector('#itemName');
                    if (firstInput) {
                        setTimeout(() => firstInput.focus(), 100);
                    }

                    console.log('✅ 일반 교구 신청 모달 표시 완료');
                }).catch(function(error) {
                    console.error('❌ 수업계획 확인 오류:', error);
                    alert('수업계획 정보를 확인할 수 없습니다. 다시 시도해주세요.');
                });

            } catch (error) {
                console.error('❌ 일반 교구 신청 모달 표시 오류:', error);
                alert('교구 신청을 여는 중 오류가 발생했습니다.');
            }
        };

        // 📦 묶음 신청 모달 표시
        window.StudentManager.showBundleModal = function() {
            try {
                console.log('📦 묶음 신청 모달 표시');
                
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
                    
                    // 구매 방식 기본값 설정
                    const onlineRadio = modal.querySelector('input[name="bundlePurchaseMethod"][value="online"]');
                    if (onlineRadio) {
                        onlineRadio.checked = true;
                    }

                    // 묶음 아이템 초기화 (기본 3개)
                    self.initializeBundleItems();

                    // 모달 표시
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';

                    // 첫 번째 입력 필드에 포커스
                    const firstInput = modal.querySelector('#bundleTitle');
                    if (firstInput) {
                        setTimeout(() => firstInput.focus(), 100);
                    }

                    console.log('✅ 묶음 신청 모달 표시 완료');
                }).catch(function(error) {
                    console.error('❌ 수업계획 확인 오류:', error);
                    alert('수업계획 정보를 확인할 수 없습니다. 다시 시도해주세요.');
                });

            } catch (error) {
                console.error('❌ 묶음 신청 모달 표시 오류:', error);
                alert('묶음 신청을 여는 중 오류가 발생했습니다.');
            }
        };

        // 📄 영수증 모달 표시
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

                // 신청 정보 로드 및 표시
                const self = this;
                this.safeApiCall(function() {
                    return SupabaseAPI.getApplicationById(requestId);
                }).then(function(application) {
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

        // === 신청 제출 처리 기능 구현 ===

        // 📝 일반 교구 신청 제출 처리
        window.StudentManager.handleApplicationSubmit = function() {
            try {
                console.log('📝 일반 교구 신청 제출 처리');
                
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

                // API 호출
                this.safeApiCall(function() {
                    if (self.currentEditingItem) {
                        // 수정 모드
                        return SupabaseAPI.updateApplication(self.currentEditingItem, applicationData);
                    } else {
                        // 새 신청
                        return SupabaseAPI.submitApplication(currentUser.id, applicationData);
                    }
                }).then(function(result) {
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
                        alert('교구 신청 제출에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
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

        // 📦 묶음 신청 제출 처리
        window.StudentManager.handleBundleSubmit = function() {
            try {
                console.log('📦 묶음 신청 제출 처리');
                
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
                const bundlePurchaseMethod = formData.get('bundlePurchaseMethod') || 'online';

                // 입력 검증
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

                // 아이템 정보 수집
                const bundleItems = [];
                const itemContainers = form.querySelectorAll('.bundle-item');
                let totalPrice = 0;

                for (let i = 0; i < itemContainers.length; i++) {
                    const container = itemContainers[i];
                    const itemName = container.querySelector('.bundle-item-name').value.trim();
                    const itemPrice = parseInt(container.querySelector('.bundle-item-price').value) || 0;
                    const itemLink = container.querySelector('.bundle-item-link').value.trim();

                    if (itemName && itemPrice > 0) {
                        bundleItems.push({
                            name: itemName,
                            price: itemPrice,
                            link: itemLink
                        });
                        totalPrice += itemPrice;
                    }
                }

                if (bundleItems.length === 0) {
                    alert('최소 1개 이상의 유효한 아이템을 입력해주세요.');
                    return;
                }

                // 온라인 구매시 링크 검증
                if (bundlePurchaseMethod === 'online') {
                    const itemsWithoutLink = bundleItems.filter(item => !item.link);
                    if (itemsWithoutLink.length > 0) {
                        alert('온라인 구매의 경우 모든 아이템의 구매 링크를 입력해주세요.');
                        return;
                    }
                }

                const bundleData = {
                    item_name: bundleTitle,
                    price: totalPrice,
                    purpose: bundlePurpose,
                    purchase_type: bundlePurchaseMethod,
                    purchase_link: bundleItems.map(item => `${item.name}: ${item.link}`).join('\n'),
                    is_bundle: true,
                    bundle_items: bundleItems
                };

                console.log('📦 제출할 묶음 신청 데이터:', bundleData);

                const self = this;
                
                // 제출 버튼 비활성화
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '제출 중...';
                }

                // API 호출
                this.safeApiCall(function() {
                    return SupabaseAPI.submitBundleApplication(currentUser.id, bundleData);
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
                        alert('묶음 신청 제출에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
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

        // 📄 영수증 제출 처리
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

                // 파일 업로드 및 영수증 등록
                this.safeApiCall(function() {
                    return SupabaseAPI.submitReceipt(self.currentReceiptItem, file);
                }).then(function(result) {
                    if (result && result.success !== false) {
                        console.log('✅ 영수증 제출 완료');
                        alert('영수증이 등록되었습니다.');
                        
                        self.hideReceiptModal();
                        
                        // 대시보드 새로고침
                        setTimeout(() => {
                            self.loadApplications();
                        }, 500);
                    } else {
                        console.error('❌ 영수증 제출 실패:', result);
                        alert('영수증 등록에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
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

        // === 지원 기능들 구현 ===

        // 묶음 아이템 초기화
        window.StudentManager.initializeBundleItems = function() {
            try {
                const container = document.getElementById('bundleItemsContainer');
                if (!container) return;

                container.innerHTML = '';
                
                // 기본 3개 아이템 추가
                for (let i = 0; i < 3; i++) {
                    this.addBundleItem();
                }

                console.log('✅ 묶음 아이템 초기화 완료');
            } catch (error) {
                console.error('❌ 묶음 아이템 초기화 오류:', error);
            }
        };

        // 묶음 아이템 추가
        window.StudentManager.addBundleItem = function() {
            try {
                const container = document.getElementById('bundleItemsContainer');
                if (!container) return;

                const itemCount = container.children.length + 1;
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'bundle-item';
                itemDiv.innerHTML = `
                    <div class="bundle-item-header">
                        <h4>아이템 ${itemCount}</h4>
                        <button type="button" class="btn small danger remove-bundle-item">
                            <i data-lucide="x"></i> 제거
                        </button>
                    </div>
                    <div class="form-group">
                        <label>교구명 *</label>
                        <input type="text" class="bundle-item-name" required placeholder="교구명을 입력하세요">
                    </div>
                    <div class="form-group">
                        <label>가격 *</label>
                        <input type="number" class="bundle-item-price" required min="1" placeholder="가격 (원)">
                    </div>
                    <div class="form-group">
                        <label>구매 링크</label>
                        <input type="url" class="bundle-item-link" placeholder="구매 가능한 링크">
                    </div>
                `;

                container.appendChild(itemDiv);

                // 제거 버튼 이벤트 리스너
                const removeBtn = itemDiv.querySelector('.remove-bundle-item');
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => {
                        if (container.children.length > 1) {
                            itemDiv.remove();
                            this.updateBundleItemNumbers();
                        } else {
                            alert('최소 1개의 아이템은 필요합니다.');
                        }
                    });
                }

                // 아이콘 재생성
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }

                console.log('📦 묶음 아이템 추가됨:', itemCount);
            } catch (error) {
                console.error('❌ 묶음 아이템 추가 오류:', error);
            }
        };

        // 묶음 아이템 번호 업데이트
        window.StudentManager.updateBundleItemNumbers = function() {
            try {
                const container = document.getElementById('bundleItemsContainer');
                if (!container) return;

                const items = container.querySelectorAll('.bundle-item');
                for (let i = 0; i < items.length; i++) {
                    const header = items[i].querySelector('.bundle-item-header h4');
                    if (header) {
                        header.textContent = `아이템 ${i + 1}`;
                    }
                }
            } catch (error) {
                console.error('❌ 묶음 아이템 번호 업데이트 오류:', error);
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

        // 신청 수정 기능
        window.StudentManager.editApplication = function(itemId) {
            try {
                console.log('✏️ 신청 수정:', itemId);
                
                const self = this;
                
                this.safeApiCall(function() {
                    return SupabaseAPI.getApplicationById(itemId);
                }).then(function(application) {
                    if (!application) {
                        alert('신청 정보를 찾을 수 없습니다.');
                        return;
                    }

                    if (application.is_bundle) {
                        alert('묶음 신청은 수정할 수 없습니다. 삭제 후 다시 신청해주세요.');
                        return;
                    }

                    // 수정 모드로 모달 열기
                    self.currentEditingItem = itemId;
                    self.showApplicationModal();

                    // 폼에 기존 데이터 채우기
                    setTimeout(() => {
                        const form = document.getElementById('applicationForm');
                        if (form) {
                            form.querySelector('#itemName').value = application.item_name || '';
                            form.querySelector('#itemPrice').value = application.price || '';
                            form.querySelector('#itemPurpose').value = application.purpose || '';
                            form.querySelector('#itemLink').value = application.purchase_link || '';
                            
                            const purchaseMethodRadio = form.querySelector(`input[name="purchaseMethod"][value="${application.purchase_type}"]`);
                            if (purchaseMethodRadio) {
                                purchaseMethodRadio.checked = true;
                                self.handlePurchaseMethodChange(application.purchase_type);
                            }

                            // 제출 버튼 텍스트 변경
                            const submitBtn = form.querySelector('button[type="submit"]');
                            if (submitBtn) {
                                submitBtn.textContent = '수정하기';
                            }
                        }
                    }, 200);

                    console.log('✅ 신청 수정 모드 활성화');
                }).catch(function(error) {
                    console.error('❌ 신청 정보 로드 오류:', error);
                    alert('신청 정보를 불러올 수 없습니다.');
                });

            } catch (error) {
                console.error('❌ 신청 수정 오류:', error);
                alert('신청 수정 중 오류가 발생했습니다.');
            }
        };

        // 신청 삭제 기능
        window.StudentManager.deleteApplication = function(itemId) {
            try {
                console.log('🗑️ 신청 삭제:', itemId);
                
                if (!confirm('정말로 이 신청을 삭제하시겠습니까?')) {
                    return;
                }

                const self = this;
                
                this.safeApiCall(function() {
                    return SupabaseAPI.deleteApplication(itemId);
                }).then(function(result) {
                    if (result && result.success !== false) {
                        console.log('✅ 신청 삭제 완료');
                        alert('신청이 삭제되었습니다.');
                        
                        // 대시보드 새로고침
                        self.loadApplications();
                        self.updateBudgetStatus();
                    } else {
                        console.error('❌ 신청 삭제 실패:', result);
                        alert('신청 삭제에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
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

        console.log('✅ StudentManager 확장 완료 - 모든 교구신청 기능 복구됨');
    });

    console.log('📚 StudentAddon 로드 완료');
})();
