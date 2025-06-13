// Supabase Auth 지원 인증 관리자 - 하이브리드 방식
// 기존 사용자 경험 유지 + 보안 강화

const EnhancedAuthManager = {
    currentUser: null,
    currentUserType: null,
    authMode: 'hybrid', // 'legacy', 'auth', 'hybrid'

    // 인증 시스템 초기화
    async init() {
        console.log('🔐 Enhanced Auth Manager 초기화');
        
        // Supabase Auth 세션 확인
        const { data: { session } } = await SupabaseAPI.client.auth.getSession();
        
        if (session) {
            console.log('🎫 기존 Auth 세션 발견');
            await this.handleAuthSession(session);
        } else {
            console.log('📝 Auth 세션 없음 - 레거시 모드 사용');
            this.authMode = 'legacy';
        }

        // Auth 상태 변경 리스너
        SupabaseAPI.client.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth 상태 변경:', event);
            if (event === 'SIGNED_IN' && session) {
                this.handleAuthSession(session);
            } else if (event === 'SIGNED_OUT') {
                this.handleSignOut();
            }
        });
    },

    // Auth 세션 처리
    async handleAuthSession(session) {
        try {
            const authUserId = session.user.id;
            
            // auth_user_id로 프로필 조회
            const { data: profile, error } = await SupabaseAPI.client
                .from('user_profiles')
                .select('*')
                .eq('auth_user_id', authUserId)
                .single();

            if (profile) {
                this.currentUser = profile;
                this.currentUserType = profile.user_type;
                this.authMode = 'auth';
                console.log('✅ Auth 사용자 로그인:', profile.name);
                return { success: true, user: profile };
            } else {
                console.warn('⚠️ Auth 사용자이지만 프로필 없음');
                await this.signOut();
                return { success: false, message: '연결된 프로필이 없습니다.' };
            }
        } catch (error) {
            console.error('❌ Auth 세션 처리 오류:', error);
            return { success: false, message: '인증 처리 중 오류가 발생했습니다.' };
        }
    },

    // 하이브리드 학생 인증 (이름 + 생년월일 → Auth 전환)
    async authenticateStudent(name, birthDate) {
        try {
            console.log('👤 학생 인증 시도:', { name, birthDate });

            // 1. 기존 방식으로 학생 프로필 조회
            const { data: profile, error: profileError } = await SupabaseAPI.client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate)
                .single();

            if (profileError || !profile) {
                return { 
                    success: false, 
                    message: '일치하는 학생 정보를 찾을 수 없습니다.' 
                };
            }

            // 2. Auth 계정이 이미 연결되어 있는지 확인
            if (profile.auth_user_id) {
                console.log('🔐 Auth 계정 존재 - Auth 로그인으로 전환');
                return await this.signInWithAuth(profile);
            } else {
                console.log('📝 레거시 사용자 - Auth 계정 생성 제안');
                // 레거시 모드로 로그인 (기존 방식)
                this.currentUser = profile;
                this.currentUserType = 'student';
                this.authMode = 'legacy';
                
                // Auth 마이그레이션 제안
                setTimeout(() => this.suggestAuthMigration(profile), 2000);
                
                return { 
                    success: true, 
                    user: profile,
                    needsMigration: true,
                    message: '로그인 성공! 보안을 위해 계정 업그레이드를 권장합니다.'
                };
            }
        } catch (error) {
            console.error('❌ 학생 인증 오류:', error);
            return { success: false, message: '인증 중 오류가 발생했습니다.' };
        }
    },

    // Auth 로그인 (기존 Auth 계정)
    async signInWithAuth(profile) {
        try {
            // 생성된 이메일로 Magic Link 또는 임시 비밀번호 로그인
            const tempEmail = this.generateTempEmail(profile.name, profile.birth_date);
            
            if (profile.temp_password) {
                // 임시 비밀번호로 로그인
                const { data, error } = await SupabaseAPI.client.auth.signInWithPassword({
                    email: tempEmail,
                    password: profile.temp_password
                });

                if (error) {
                    console.error('Auth 로그인 실패:', error);
                    // 실패 시 레거시 모드로 폴백
                    return this.fallbackToLegacy(profile);
                }

                return { success: true, user: profile, authMode: 'auth' };
            } else {
                // Magic Link 요청
                return await this.requestMagicLink(tempEmail, profile);
            }
        } catch (error) {
            console.error('Auth 로그인 오류:', error);
            return this.fallbackToLegacy(profile);
        }
    },

    // 관리자 인증 (개선된 버전)
    async authenticateAdmin(code) {
        try {
            const config = await waitForConfig();
            if (code !== config.APP.ADMIN_CODE) {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            // 관리자 Auth 계정 확인
            const { data: adminProfile, error } = await SupabaseAPI.client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'admin')
                .single();

            if (adminProfile && adminProfile.auth_user_id) {
                // Auth 관리자 계정으로 로그인
                return await this.signInWithAuth(adminProfile);
            } else {
                // 레거시 관리자 로그인
                this.currentUser = adminProfile || { 
                    name: '관리자', 
                    user_type: 'admin',
                    id: 'admin-legacy'
                };
                this.currentUserType = 'admin';
                this.authMode = 'legacy';
                return { success: true, user: this.currentUser };
            }
        } catch (error) {
            console.error('관리자 인증 오류:', error);
            return { success: false, message: '관리자 인증 중 오류가 발생했습니다.' };
        }
    },

    // Auth 마이그레이션 제안
    async suggestAuthMigration(profile) {
        const userConfirmed = confirm(
            `보안 강화를 위해 계정을 업그레이드하시겠습니까?\n\n` +
            `• 더 안전한 로그인\n` +
            `• 자동 세션 관리\n` +
            `• 향후 추가 기능 지원\n\n` +
            `업그레이드 후에도 이름과 생년월일로 로그인할 수 있습니다.`
        );

        if (userConfirmed) {
            await this.migrateToAuth(profile);
        }
    },

    // Auth로 마이그레이션
    async migrateToAuth(profile) {
        try {
            console.log('🔄 Auth 마이그레이션 시작:', profile.name);
            
            const tempEmail = this.generateTempEmail(profile.name, profile.birth_date);
            const tempPassword = this.generateTempPassword();

            // 1. Supabase Auth에 사용자 생성
            const { data: authUser, error: signUpError } = await SupabaseAPI.client.auth.signUp({
                email: tempEmail,
                password: tempPassword,
                options: {
                    data: {
                        name: profile.name,
                        birth_date: profile.birth_date,
                        original_profile_id: profile.id
                    }
                }
            });

            if (signUpError) {
                console.error('Auth 사용자 생성 실패:', signUpError);
                alert('계정 업그레이드에 실패했습니다. 나중에 다시 시도해주세요.');
                return;
            }

            // 2. 프로필에 auth_user_id 연결
            const { error: updateError } = await SupabaseAPI.client
                .from('user_profiles')
                .update({
                    auth_user_id: authUser.user.id,
                    temp_password: tempPassword,
                    migration_status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (updateError) {
                console.error('프로필 업데이트 실패:', updateError);
                return;
            }

            // 3. 자동 로그인
            await SupabaseAPI.client.auth.signInWithPassword({
                email: tempEmail,
                password: tempPassword
            });

            console.log('✅ Auth 마이그레이션 완료');
            alert('계정 업그레이드가 완료되었습니다! 더 안전하게 이용하실 수 있습니다.');

        } catch (error) {
            console.error('마이그레이션 오류:', error);
            alert('계정 업그레이드 중 오류가 발생했습니다.');
        }
    },

    // 임시 이메일 생성
    generateTempEmail(name, birthDate) {
        const cleanName = name.replace(/\s+/g, '').toLowerCase();
        const dateStr = birthDate.replace(/-/g, '');
        return `${cleanName}_${dateStr}@sejong.temp`;
    },

    // 임시 비밀번호 생성
    generateTempPassword() {
        return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    },

    // 레거시 모드로 폴백
    fallbackToLegacy(profile) {
        console.log('📝 레거시 모드로 폴백');
        this.currentUser = profile;
        this.currentUserType = profile.user_type;
        this.authMode = 'legacy';
        return { 
            success: true, 
            user: profile, 
            authMode: 'legacy',
            message: '기본 모드로 로그인되었습니다.'
        };
    },

    // 로그아웃
    async signOut() {
        if (this.authMode === 'auth') {
            await SupabaseAPI.client.auth.signOut();
        }
        this.handleSignOut();
    },

    // 로그아웃 처리
    handleSignOut() {
        this.currentUser = null;
        this.currentUserType = null;
        this.authMode = 'legacy';
        console.log('👋 로그아웃 완료');
    },

    // 현재 사용자 반환
    getCurrentUser() {
        return this.currentUser;
    },

    // 인증 상태 확인
    isAuthenticated() {
        return !!this.currentUser;
    },

    // Auth 모드 확인
    getAuthMode() {
        return this.authMode;
    },

    // 관리자 여부 확인
    isAdmin() {
        return this.currentUserType === 'admin';
    }
};

// 기존 AuthManager와 호환성 유지
const AuthManager = {
    ...EnhancedAuthManager,
    
    // 기존 메서드들 (하위 호환성)
    async login(userType, credentials) {
        if (userType === 'student') {
            return await this.authenticateStudent(credentials.name, credentials.birthDate);
        } else if (userType === 'admin') {
            return await this.authenticateAdmin(credentials.code);
        }
    },

    logout() {
        return this.signOut();
    }
};

// 전역 접근을 위해 window 객체에 추가
window.AuthManager = AuthManager;
window.EnhancedAuthManager = EnhancedAuthManager;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Enhanced Auth Manager 로드 완료');
    AuthManager.init();
});

console.log('🚀 Enhanced Auth Manager loaded successfully');
