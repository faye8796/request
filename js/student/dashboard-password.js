// 🔐 Dashboard 비밀번호 관리 모듈 v1.0.0
// 사용자 비밀번호 설정 및 변경 기능을 제공하는 전용 모듈

class DashboardPasswordManager {
    constructor() {
        this.currentUserId = null;
        this.supabaseClient = null;
        this.hasPassword = false;
        this.isInitialized = false;
        this.modalElement = null;
        
        console.log('🔐 DashboardPasswordManager v1.0.0 인스턴스 생성');
    }

    // 🚀 초기화 함수
    async initialize(userId, supabaseClient) {
        try {
            console.log('🔐 비밀번호 관리자 초기화 시작...', { userId });
            
            this.currentUserId = userId;
            this.supabaseClient = supabaseClient;
            
            // 현재 비밀번호 설정 상태 확인
            await this.checkPasswordStatus();
            
            // UI 초기화
            this.initializeUI();
            
            this.isInitialized = true;
            console.log('✅ 비밀번호 관리자 초기화 완료', { hasPassword: this.hasPassword });
            
        } catch (error) {
            console.error('❌ 비밀번호 관리자 초기화 실패:', error);
            throw error;
        }
    }

    // 🔍 현재 비밀번호 설정 상태 확인
    async checkPasswordStatus() {
        try {
            const { data, error } = await this.supabaseClient
                .from('user_profiles')
                .select('password_hash, password_set_at, password_updated_at')
                .eq('id', this.currentUserId)
                .single();

            if (error) {
                console.error('❌ 비밀번호 상태 확인 실패:', error);
                return false;
            }

            this.hasPassword = !!data.password_hash;
            console.log('🔍 비밀번호 상태 확인 완료:', { 
                hasPassword: this.hasPassword,
                setAt: data.password_set_at,
                updatedAt: data.password_updated_at
            });

            return true;
        } catch (error) {
            console.error('❌ 비밀번호 상태 확인 중 오류:', error);
            return false;
        }
    }

    // 🎨 UI 초기화
    initializeUI() {
        try {
            // 비밀번호 설정 섹션을 dashboard에 추가
            this.createPasswordSection();
            
            // 모달 생성
            this.createPasswordModal();
            
            // 이벤트 바인딩
            this.bindEvents();
            
            console.log('🎨 비밀번호 UI 초기화 완료');
        } catch (error) {
            console.error('❌ 비밀번호 UI 초기화 실패:', error);
        }
    }

    // 🏗️ 비밀번호 설정 섹션 생성
    createPasswordSection() {
        const dashboardHeader = document.querySelector('.dashboard-header');
        if (!dashboardHeader) {
            console.warn('⚠️ Dashboard 헤더를 찾을 수 없습니다');
            return;
        }

        // 기존 비밀번호 섹션이 있으면 제거
        const existingSection = document.getElementById('passwordSection');
        if (existingSection) {
            existingSection.remove();
        }

        const passwordSectionHTML = `
            <div id="passwordSection" class="password-setting-section" style="margin-top: 1rem;">
                <div class="password-setting-card">
                    <div class="password-status" id="passwordStatus">
                        <div class="status-icon">🔐</div>
                        <div class="status-content">
                            <h4>보안 설정</h4>
                            <p id="passwordStatusText">상태 확인 중...</p>
                        </div>
                    </div>
                    <div class="password-actions">
                        <button id="setPasswordBtn" class="btn btn-primary password-btn" style="display: none;">
                            <i data-lucide="key"></i>
                            비밀번호 설정하기
                        </button>
                        <button id="changePasswordBtn" class="btn btn-secondary password-btn" style="display: none;">
                            <i data-lucide="edit"></i>
                            비밀번호 변경하기
                        </button>
                    </div>
                </div>
            </div>
        `;

        dashboardHeader.insertAdjacentHTML('beforeend', passwordSectionHTML);
        
        // 상태에 따라 버튼 표시 업데이트
        this.updatePasswordStatusUI();
    }

    // 🪟 비밀번호 모달 생성
    createPasswordModal() {
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('passwordModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="passwordModal" class="modal password-modal" style="display: none;">
                <div class="modal-backdrop" onclick="window.dashboardPasswordManager?.closeModal()"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 id="passwordModalTitle">🔐 비밀번호 설정</h3>
                        <button class="modal-close" onclick="window.dashboardPasswordManager?.closeModal()" type="button">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="modal-content">
                        <form id="passwordForm">
                            <div id="currentPasswordGroup" class="form-group" style="display: none;">
                                <label for="currentPassword">현재 비밀번호</label>
                                <input type="password" id="currentPassword" class="form-control" required>
                                <small class="form-text">현재 사용 중인 비밀번호를 입력해주세요</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="newPassword">새 비밀번호</label>
                                <input type="password" id="newPassword" class="form-control" required minlength="6" maxlength="50">
                                <small class="form-text">최소 6자리 이상 입력해주세요</small>
                                <div id="passwordStrength" class="password-strength" style="display: none;">
                                    <div class="strength-bar"></div>
                                    <span class="strength-text"></span>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="confirmPassword">비밀번호 확인</label>
                                <input type="password" id="confirmPassword" class="form-control" required>
                                <small class="form-text">새 비밀번호를 다시 입력해주세요</small>
                            </div>
                            
                            <div class="modal-actions">
                                <button type="submit" class="btn btn-primary" id="passwordSubmitBtn">
                                    <i data-lucide="save"></i>
                                    저장하기
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="window.dashboardPasswordManager?.closeModal()">
                                    <i data-lucide="x"></i>
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById('passwordModal');
    }

    // 🔗 이벤트 바인딩
    bindEvents() {
        // 설정 버튼 이벤트
        const setPasswordBtn = document.getElementById('setPasswordBtn');
        if (setPasswordBtn) {
            setPasswordBtn.addEventListener('click', () => this.showSetPasswordModal());
        }

        // 변경 버튼 이벤트
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.showChangePasswordModal());
        }

        // 폼 제출 이벤트
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordSubmission(e));
        }

        // 비밀번호 강도 체크
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        }

        // 비밀번호 확인 체크
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        }
    }

    // 🔄 비밀번호 상태 UI 업데이트
    updatePasswordStatusUI() {
        const statusText = document.getElementById('passwordStatusText');
        const setBtn = document.getElementById('setPasswordBtn');
        const changeBtn = document.getElementById('changePasswordBtn');

        if (!statusText || !setBtn || !changeBtn) return;

        if (this.hasPassword) {
            statusText.textContent = '비밀번호가 설정되어 있습니다. 다음 로그인부터 비밀번호가 필요합니다.';
            setBtn.style.display = 'none';
            changeBtn.style.display = 'inline-flex';
        } else {
            statusText.textContent = '비밀번호가 설정되지 않았습니다. 보안을 위해 비밀번호를 설정해주세요.';
            setBtn.style.display = 'inline-flex';
            changeBtn.style.display = 'none';
        }
    }

    // 🪟 비밀번호 설정 모달 표시
    showSetPasswordModal() {
        const modal = document.getElementById('passwordModal');
        const title = document.getElementById('passwordModalTitle');
        const currentPasswordGroup = document.getElementById('currentPasswordGroup');
        const currentPasswordInput = document.getElementById('currentPassword');
        const form = document.getElementById('passwordForm');

        if (!modal || !title || !currentPasswordGroup || !form) return;

        // 설정 모드로 설정
        title.textContent = '🔐 비밀번호 설정';
        currentPasswordGroup.style.display = 'none';

        // 🔧 핵심 수정: required 속성 제거
        if (currentPasswordInput) {
            currentPasswordInput.removeAttribute('required');
            currentPasswordInput.disabled = true; // 추가 안전장치
        }

        form.reset();

        // 모달 표시
        this.showModal();
    }
    
    // 🪟 비밀번호 변경 모달 표시
    showChangePasswordModal() {
        const modal = document.getElementById('passwordModal');
        const title = document.getElementById('passwordModalTitle');
        const currentPasswordGroup = document.getElementById('currentPasswordGroup');
        const currentPasswordInput = document.getElementById('currentPassword');
        const form = document.getElementById('passwordForm');

        if (!modal || !title || !currentPasswordGroup || !form) return;

        // 변경 모드로 설정
        title.textContent = '🔐 비밀번호 변경';
        currentPasswordGroup.style.display = 'block';

        // 🔧 required 속성 복원
        if (currentPasswordInput) {
            currentPasswordInput.setAttribute('required', '');
            currentPasswordInput.disabled = false;
        }

        form.reset();

        // 모달 표시
        this.showModal();
    }

    // 🪟 모달 표시
    showModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.style.display = 'flex';
            // 🔧 visibility/opacity 강제 설정 추가
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';

            // 모든 하위 요소들도 visibility/opacity 설정
            modal.querySelectorAll('*').forEach(el => {
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });

            document.body.style.overflow = 'hidden';

            // 첫 번째 입력 필드에 포커스
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="password"]:not([style*="display: none"])');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        }
    }

    // 🚪 모달 닫기
    closeModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // 폼 초기화
            const form = document.getElementById('passwordForm');
            if (form) {
                form.reset();
            }
            
            // 강도 표시 숨기기
            const strengthIndicator = document.getElementById('passwordStrength');
            if (strengthIndicator) {
                strengthIndicator.style.display = 'none';
            }
        }
    }

    // 📝 폼 제출 처리
    async handlePasswordSubmission(event) {
        event.preventDefault();
        
        const submitBtn = document.getElementById('passwordSubmitBtn');
        const currentPasswordInput = document.getElementById('currentPassword');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (!submitBtn || !newPasswordInput || !confirmPasswordInput) return;

        // 버튼 비활성화
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2"></i> 처리 중...';

        try {
            const newPassword = newPasswordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();
            const currentPassword = currentPasswordInput ? currentPasswordInput.value.trim() : null;

            // 유효성 검증
            if (!this.validatePasswordInput(newPassword, confirmPassword, currentPassword)) {
                return;
            }

            // 비밀번호 설정/변경 실행
            const success = this.hasPassword 
                ? await this.changePassword(currentPassword, newPassword)
                : await this.setPassword(newPassword);

            if (success) {
                this.showSuccessMessage(this.hasPassword ? '비밀번호가 변경되었습니다!' : '비밀번호가 설정되었습니다!');
                this.closeModal();
                
                // 상태 업데이트
                this.hasPassword = true;
                this.updatePasswordStatusUI();
            }

        } catch (error) {
            console.error('❌ 비밀번호 처리 중 오류:', error);
            this.showErrorMessage('처리 중 오류가 발생했습니다.');
        } finally {
            // 버튼 복원
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="save"></i> 저장하기';
            
            // 아이콘 재초기화
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    // ✅ 입력 유효성 검증
    validatePasswordInput(newPassword, confirmPassword, currentPassword) {
        // 길이 검증
        if (newPassword.length < 6) {
            this.showErrorMessage('비밀번호는 최소 6자리 이상이어야 합니다.');
            return false;
        }

        if (newPassword.length > 50) {
            this.showErrorMessage('비밀번호는 최대 50자리까지 가능합니다.');
            return false;
        }

        // 확인 비밀번호 일치 검증
        if (newPassword !== confirmPassword) {
            this.showErrorMessage('새 비밀번호가 일치하지 않습니다.');
            return false;
        }

        // 현재 비밀번호 검증 (변경 모드일 때)
        if (this.hasPassword && !currentPassword) {
            this.showErrorMessage('현재 비밀번호를 입력해주세요.');
            return false;
        }

        return true;
    }

    // 🔑 비밀번호 설정
    async setPassword(newPassword) {
        try {
            console.log('🔑 새 비밀번호 설정 시작...');
            
            const hashedPassword = await this.hashPassword(newPassword);
            const now = new Date().toISOString();

            const { error } = await this.supabaseClient
                .from('user_profiles')
                .update({
                    password_hash: hashedPassword,
                    password_set_at: now,
                    password_updated_at: now
                })
                .eq('id', this.currentUserId);

            if (error) {
                console.error('❌ 비밀번호 설정 실패:', error);
                this.showErrorMessage('비밀번호 설정에 실패했습니다.');
                return false;
            }

            console.log('✅ 비밀번호 설정 성공');
            return true;

        } catch (error) {
            console.error('❌ 비밀번호 설정 중 오류:', error);
            this.showErrorMessage('비밀번호 설정 중 오류가 발생했습니다.');
            return false;
        }
    }

    // 🔄 비밀번호 변경
    async changePassword(currentPassword, newPassword) {
        try {
            console.log('🔄 비밀번호 변경 시작...');
            
            // 현재 비밀번호 검증
            const { data, error: fetchError } = await this.supabaseClient
                .from('user_profiles')
                .select('password_hash')
                .eq('id', this.currentUserId)
                .single();

            if (fetchError) {
                console.error('❌ 현재 비밀번호 확인 실패:', fetchError);
                this.showErrorMessage('현재 비밀번호 확인에 실패했습니다.');
                return false;
            }

            // 현재 비밀번호 검증
            const currentHashedPassword = await this.hashPassword(currentPassword);
            if (currentHashedPassword !== data.password_hash) {
                this.showErrorMessage('현재 비밀번호가 일치하지 않습니다.');
                return false;
            }

            // 새 비밀번호 해시화
            const newHashedPassword = await this.hashPassword(newPassword);
            const now = new Date().toISOString();

            // 비밀번호 업데이트
            const { error: updateError } = await this.supabaseClient
                .from('user_profiles')
                .update({
                    password_hash: newHashedPassword,
                    password_updated_at: now
                })
                .eq('id', this.currentUserId);

            if (updateError) {
                console.error('❌ 비밀번호 변경 실패:', updateError);
                this.showErrorMessage('비밀번호 변경에 실패했습니다.');
                return false;
            }

            console.log('✅ 비밀번호 변경 성공');
            return true;

        } catch (error) {
            console.error('❌ 비밀번호 변경 중 오류:', error);
            this.showErrorMessage('비밀번호 변경 중 오류가 발생했습니다.');
            return false;
        }
    }

    // 🔐 비밀번호 해시화 (SHA-256 + Salt)
    async hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const salt = 'sejong_cultural_intern_2025'; // 고정 솔트
            const data = encoder.encode(password + salt);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('❌ 비밀번호 해시화 실패:', error);
            throw new Error('비밀번호 암호화에 실패했습니다.');
        }
    }

    // 💪 비밀번호 강도 체크
    checkPasswordStrength(password) {
        const strengthIndicator = document.getElementById('passwordStrength');
        const strengthBar = strengthIndicator?.querySelector('.strength-bar');
        const strengthText = strengthIndicator?.querySelector('.strength-text');

        if (!strengthIndicator || !strengthBar || !strengthText) return;

        if (password.length === 0) {
            strengthIndicator.style.display = 'none';
            return;
        }

        strengthIndicator.style.display = 'block';

        let score = 0;
        let feedback = [];

        // 길이 점수
        if (password.length >= 6) score += 1;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;

        // 복잡성 점수
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        // 피드백 생성
        if (password.length < 6) feedback.push('너무 짧음');
        if (password.length >= 8) feedback.push('적절한 길이');
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) feedback.push('대소문자');
        if (/[0-9]/.test(password)) feedback.push('숫자');
        if (/[^A-Za-z0-9]/.test(password)) feedback.push('특수문자');

        // 강도 표시 업데이트
        let strength, color, width;
        if (score < 3) {
            strength = '약함';
            color = '#ef4444';
            width = '25%';
        } else if (score < 5) {
            strength = '보통';
            color = '#f59e0b';
            width = '50%';
        } else if (score < 6) {
            strength = '강함';
            color = '#10b981';
            width = '75%';
        } else {
            strength = '매우 강함';
            color = '#059669';
            width = '100%';
        }

        strengthBar.style.background = color;
        strengthBar.style.width = width;
        strengthText.textContent = `${strength} (${feedback.join(', ')})`;
    }

    // ✅ 비밀번호 일치 검증
    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const confirmInput = document.getElementById('confirmPassword');

        if (!confirmInput) return;

        if (confirmPassword.length === 0) {
            confirmInput.style.borderColor = '';
            return;
        }

        if (newPassword === confirmPassword) {
            confirmInput.style.borderColor = '#10b981';
        } else {
            confirmInput.style.borderColor = '#ef4444';
        }
    }

    // ✅ 성공 메시지 표시
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    // ❌ 오류 메시지 표시
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    // 🍞 토스트 메시지 표시
    showToast(message, type = 'info') {
        // 기존 토스트 제거
        const existingToast = document.querySelector('.password-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toastHTML = `
            <div class="password-toast toast-${type}">
                <div class="toast-content">
                    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
                    <span>${message}</span>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', toastHTML);

        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 3초 후 자동 제거
        setTimeout(() => {
            const toast = document.querySelector('.password-toast');
            if (toast) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    // 🧹 정리 함수
    destroy() {
        try {
            // 이벤트 리스너 제거는 브라우저가 자동으로 처리
            
            // DOM 요소 제거
            const passwordSection = document.getElementById('passwordSection');
            if (passwordSection) {
                passwordSection.remove();
            }

            const passwordModal = document.getElementById('passwordModal');
            if (passwordModal) {
                passwordModal.remove();
            }

            // 토스트 제거
            const toast = document.querySelector('.password-toast');
            if (toast) {
                toast.remove();
            }

            console.log('🧹 비밀번호 관리자 정리 완료');
        } catch (error) {
            console.error('❌ 비밀번호 관리자 정리 중 오류:', error);
        }
    }

    // 🔍 디버그 정보
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            hasPassword: this.hasPassword,
            currentUserId: this.currentUserId,
            version: '1.0.0'
        };
    }
}

// 🎨 CSS 스타일 추가
const passwordStyles = `
<style>
/* 🔐 비밀번호 설정 섹션 스타일 */
.password-setting-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 1.5rem;
    color: white;
}

.password-setting-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.password-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
}

.status-icon {
    font-size: 2rem;
}

.status-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.status-content p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.9rem;
}

.password-actions {
    display: flex;
    gap: 0.5rem;
}

.password-btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
}

.password-btn:hover {
    transform: translateY(-1px);
}

/* 🪟 비밀번호 모달 스타일 */
.password-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
}

.password-modal .modal-container {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.password-modal .modal-header {
    padding: 1.5rem 1.5rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.password-modal .modal-header h3 {
    margin: 0;
    color: #2d3748;
    font-size: 1.25rem;
}

.password-modal .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    color: #718096;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.password-modal .modal-close:hover {
    background: #f7fafc;
    color: #2d3748;
}

.password-modal .modal-content {
    padding: 1.5rem;
}

.password-modal .form-group {
    margin-bottom: 1rem;
}

.password-modal .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #2d3748;
    font-weight: 500;
}

.password-modal .form-control {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
}

.password-modal .form-control:focus {
    outline: none;
    border-color: #667eea;
}

.password-modal .form-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #718096;
}

/* 💪 비밀번호 강도 표시 */
.password-strength {
    margin-top: 0.5rem;
}

.strength-bar {
    height: 4px;
    border-radius: 2px;
    background: #e2e8f0;
    transition: all 0.3s ease;
    margin-bottom: 0.25rem;
}

.strength-text {
    font-size: 0.75rem;
    color: #718096;
}

/* 🎯 모달 액션 버튼 */
.password-modal .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e2e8f0;
}

.password-modal .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
}

.password-modal .btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
}

.password-modal .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #5a67d8, #6b46c1);
    transform: translateY(-1px);
}

.password-modal .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.password-modal .btn-secondary {
    background: #e2e8f0;
    color: #4a5568;
}

.password-modal .btn-secondary:hover {
    background: #cbd5e0;
}

/* 🍞 토스트 메시지 */
.password-toast {
    position: fixed;
    top: 2rem;
    right: 2rem;
    z-index: 1060;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    animation: slideInRight 0.3s ease;
}

.password-toast.toast-success {
    background: linear-gradient(135deg, #10b981, #059669);
}

.password-toast.toast-error {
    background: linear-gradient(135deg, #ef4444, #dc2626);
}

.password-toast.toast-info {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* 📱 모바일 반응형 */
@media (max-width: 768px) {
    .password-setting-card {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }
    
    .password-actions {
        justify-content: center;
    }
    
    .password-modal .modal-container {
        margin: 1rem;
        max-height: calc(100vh - 2rem);
    }
    
    .password-modal .modal-actions {
        flex-direction: column;
    }
    
    .password-toast {
        top: 1rem;
        right: 1rem;
        left: 1rem;
        right: auto;
        width: auto;
    }
}
</style>
`;

// CSS 스타일 삽입
if (!document.getElementById('password-manager-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'password-manager-styles';
    styleElement.innerHTML = passwordStyles;
    document.head.appendChild(styleElement);
}

// 전역 접근을 위한 export
if (typeof window !== 'undefined') {
    window.DashboardPasswordManager = DashboardPasswordManager;
    console.log('✅ DashboardPasswordManager v1.0.0 전역 등록 완료');
}

// 모듈 export (Node.js 환경용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardPasswordManager;
}