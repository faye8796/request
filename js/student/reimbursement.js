/**
 * 실비 지원 신청 시스템 v3.4.0 - GoTrueClient 중복 인스턴스 경고 해결
 * 
 * 🔧 v3.4.0 핵심 개선사항:
 * - GoTrueClient 중복 인스턴스 경고 해결
 * - 기존 클라이언트 우선 사용으로 중복 생성 방지
 * - 클라이언트 생성을 최후의 수단으로만 사용
 * - SupabaseCore와의 충돌 방지
 * - 모든 기존 기능 완전 보존
 * 
 * 기능:
 * - 계좌 정보 관리
 * - VIEW 기반 실비 항목 통합 조회
 * - 카테고리별 그룹핑 (transport, equipment, visa)
 * - 영수증 상태 확인 및 미리보기
 * - 입금 정보 표시
 */

(function() {
    'use strict';

    console.log('🚀 ReimbursementSystem v3.4.0 로딩 (GoTrueClient 중복 해결)...');

    class ReimbursementSystem {
        constructor() {
            this.isInitialized = false;
            this.currentUser = null;
            this.reimbursementItems = [];
            this.accountInfo = null;
            this.paymentInfo = null;
            this.supabase = null;
            
            this.init();
        }

        // 🔧 초기화 시스템 (v3.4.0 GoTrueClient 중복 해결)
        async init() {
            try {
                console.log('🔧 ReimbursementSystem v3.4.0 초기화 시작...');

                // 1. HTML 단계 의존성 확인
                this.verifyPrerequisites();

                // 2. 🆕 v3.4.0: 기존 클라이언트 우선 사용 (중복 생성 방지)
                await this.initializeSupabaseClient();

                // 3. 사용자 인증 확인
                await this.checkAuthentication();

                // 4. 데이터 로딩
                await this.loadAllData();

                // 5. UI 초기화
                this.initializeUI();

                // 6. 이벤트 리스너 등록
                this.setupEventListeners();

                this.isInitialized = true;
                console.log('✅ ReimbursementSystem v3.4.0 초기화 완료');

            } catch (error) {
                console.error('❌ ReimbursementSystem 초기화 실패:', error);
                this.showUserFriendlyError(error);
            }
        }

        // 🔍 HTML 단계 의존성 확인 (기존 유지)
        verifyPrerequisites() {
            console.log('🔍 필수 의존성 확인...');
            
            const checks = {
                supabaseLib: !!(window.supabase && typeof window.supabase.createClient === 'function'),
                config: !!(window.CONFIG && window.CONFIG.SUPABASE),
                configUrl: !!(window.CONFIG && window.CONFIG.SUPABASE && window.CONFIG.SUPABASE.URL),
                configKey: !!(window.CONFIG && window.CONFIG.SUPABASE && window.CONFIG.SUPABASE.ANON_KEY),
                fetchFunction: !!(typeof fetch === 'function'),
                headersConstructor: !!(typeof Headers === 'function' || typeof window.Headers === 'function')
            };

            console.log('📋 의존성 체크 결과:', checks);

            const failed = Object.entries(checks).filter(([key, value]) => !value).map(([key]) => key);
            
            if (failed.length > 0) {
                throw new Error(`필수 의존성 누락: ${failed.join(', ')}\n\n브라우저 환경 또는 라이브러리 로딩에 문제가 있을 수 있습니다.`);
            }

            console.log('✅ 모든 필수 의존성 확인 완료');
        }

        // 🆕 v3.4.0: 기존 클라이언트 우선 사용 (GoTrueClient 중복 방지)
        async initializeSupabaseClient() {
            console.log('🔌 기존 클라이언트 우선 사용 초기화 시작...');
            
            let attempts = 0;
            const maxAttempts = 8; // 10회에서 8회로 더 줄임

            while (attempts < maxAttempts) {
                try {
                    // 🥇 1. 최우선: 기존 활성 클라이언트들 사용 (중복 생성 방지)
                    const existingClients = [
                        window.supabase,
                        window.SupabaseCore?.client,
                        window.supabaseClient
                    ];

                    for (const client of existingClients) {
                        if (this.validateSupabaseClient(client)) {
                            this.supabase = client;
                            console.log('✅ 기존 활성 클라이언트 사용 (중복 생성 방지)');
                            return;
                        }
                    }

                    // 🥈 2. SupabaseCore 대기 및 초기화 (기존 시스템 활용)
                    if (window.SupabaseCore) {
                        console.log('🔄 SupabaseCore 초기화 대기 중...');
                        
                        // SupabaseCore가 초기화 중인지 확인
                        if (typeof window.SupabaseCore.initialize === 'function') {
                            try {
                                await window.SupabaseCore.initialize();
                                
                                if (this.validateSupabaseClient(window.SupabaseCore.client)) {
                                    this.supabase = window.SupabaseCore.client;
                                    console.log('✅ SupabaseCore 초기화 완료 후 클라이언트 사용');
                                    return;
                                }
                            } catch (initError) {
                                console.warn('⚠️ SupabaseCore 초기화 실패:', initError);
                            }
                        }

                        // SupabaseCore가 이미 초기화된 클라이언트가 있는지 재확인
                        if (this.validateSupabaseClient(window.SupabaseCore.client)) {
                            this.supabase = window.SupabaseCore.client;
                            console.log('✅ 기존 SupabaseCore 클라이언트 사용');
                            return;
                        }
                    }

                    // 🥉 3. 잠시 대기 (다른 시스템의 초기화 완료 대기)
                    attempts++;
                    if (attempts < maxAttempts - 2) { // 마지막 2번의 시도는 대기 없이
                        console.log(`⏳ 기존 클라이언트 대기 중... (${attempts}/${maxAttempts})`);
                        await new Promise(resolve => setTimeout(resolve, 300));
                        continue;
                    }

                    // 🚨 4. 최후의 수단: 새 클라이언트 생성 (경고 발생 가능)
                    if (attempts >= maxAttempts - 2 && this.canCreateClient()) {
                        console.warn('⚠️ 기존 클라이언트를 찾을 수 없어 새로 생성합니다 (GoTrueClient 경고 발생 가능)');
                        
                        try {
                            const newClient = await this.createSafeClient();
                            
                            if (this.validateSupabaseClient(newClient)) {
                                this.supabase = newClient;
                                console.log('✅ 새 클라이언트 생성 완료 (최후의 수단)');
                                return;
                            } else {
                                console.warn('⚠️ 생성된 클라이언트 검증 실패');
                            }
                        } catch (createError) {
                            console.warn('⚠️ 클라이언트 생성 실패:', createError);
                        }
                    }
                    
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (error) {
                    console.warn(`⚠️ 클라이언트 초기화 시도 ${attempts + 1} 실패:`, error);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            throw new Error('Supabase 클라이언트를 초기화할 수 없습니다. 기존 클라이언트와 새 클라이언트 생성 모두 실패했습니다.');
        }

        // 🛡️ Supabase 클라이언트 검증 (기존 유지)
        validateSupabaseClient(client) {
            if (!client) return false;
            
            try {
                // 필수 메서드 존재 확인
                const hasFromMethod = typeof client.from === 'function';
                const hasAuthObject = client.auth && typeof client.auth === 'object';
                
                // 추가 검증: 실제로 메서드가 호출 가능한지 확인
                if (hasFromMethod && hasAuthObject) {
                    // from 메서드가 실제로 작동하는지 간단한 테스트
                    const testQuery = client.from('user_profiles');
                    if (testQuery && typeof testQuery.select === 'function') {
                        return true;
                    }
                }
                
                return false;
            } catch (error) {
                console.warn('⚠️ 클라이언트 검증 중 오류:', error);
                return false;
            }
        }

        // 🔧 클라이언트 생성 가능 여부 확인 (기존 유지)
        canCreateClient() {
            return !!(
                window.supabase && 
                typeof window.supabase.createClient === 'function' && 
                window.CONFIG?.SUPABASE?.URL && 
                window.CONFIG?.SUPABASE?.ANON_KEY &&
                typeof fetch === 'function'
            );
        }

        // 🛠️ 안전한 클라이언트 생성 (GoTrueClient 경고 최소화)
        async createSafeClient() {
            try {
                console.log('🔨 안전한 Supabase 클라이언트 생성 중 (최후의 수단)...');
                
                const url = window.CONFIG.SUPABASE.URL;
                const key = window.CONFIG.SUPABASE.ANON_KEY;
                
                if (!url || !key) {
                    throw new Error('Supabase URL 또는 API Key 누락');
                }

                // 🆕 GoTrueClient 중복을 최소화하는 설정
                const client = window.supabase.createClient(url, key, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                        storage: null, // 스토리지 비활성화로 중복 방지
                        storageKey: `sb-${url.split('//')[1].split('.')[0]}-auth-token-reimbursement` // 고유 키 사용
                    },
                    global: {
                        fetch: fetch
                    }
                });

                if (!client) {
                    throw new Error('클라이언트 생성 결과가 null');
                }

                console.log('✅ 클라이언트 생성 성공 (GoTrueClient 중복 최소화 설정 적용)');
                return client;

            } catch (error) {
                console.error('❌ 안전한 클라이언트 생성 실패:', error);
                throw error;
            }
        }

        // 👤 사용자 인증 확인 (기존 로직 유지)
        async checkAuthentication() {
            try {
                console.log('👤 사용자 인증 확인...');

                const userData = localStorage.getItem('currentStudent');
                if (!userData) {
                    throw new Error('로그인 정보를 찾을 수 없습니다.');
                }

                let parsedUser;
                try {
                    parsedUser = JSON.parse(userData);
                } catch (parseError) {
                    throw new Error('사용자 데이터 형식이 올바르지 않습니다.');
                }

                if (!parsedUser.id) {
                    throw new Error('사용자 ID가 없습니다.');
                }

                if (!parsedUser.name && !parsedUser.email) {
                    throw new Error('사용자 이름 또는 이메일이 없습니다.');
                }

                this.currentUser = parsedUser;
                console.log('✅ 사용자 인증 완료:', this.currentUser.name || this.currentUser.email);

            } catch (error) {
                console.error('❌ 사용자 인증 실패:', error);
                
                alert(`인증 오류: ${error.message}\n\n로그인 페이지로 이동합니다.`);
                
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1000);
                
                throw error;
            }
        }

        // 📊 모든 데이터 로드 (기존 로직 유지)
        async loadAllData() {
            console.log('📊 실비 관련 데이터 로딩 시작...');
            
            this.showLoading(true);
            
            try {
                const [itemsResult, accountResult, paymentResult] = await Promise.allSettled([
                    this.loadReimbursementItems(),
                    this.loadAccountInfo(),
                    this.loadPaymentInfo()
                ]);

                const results = {
                    items: itemsResult.status === 'fulfilled',
                    account: accountResult.status === 'fulfilled',
                    payment: paymentResult.status === 'fulfilled'
                };

                console.log('📋 데이터 로딩 결과:', results);

                if (itemsResult.status === 'rejected') {
                    console.error('❌ 실비 항목 로딩 실패:', itemsResult.reason);
                }
                if (accountResult.status === 'rejected') {
                    console.warn('⚠️ 계좌 정보 로딩 실패:', accountResult.reason);
                }
                if (paymentResult.status === 'rejected') {
                    console.warn('⚠️ 입금 정보 로딩 실패:', paymentResult.reason);
                }

                this.updateStatistics();
                this.renderReimbursementList();
                this.renderAccountInfo();
                this.renderPaymentInfo();

                console.log('✅ 데이터 로딩 및 UI 업데이트 완료');
                
            } catch (error) {
                console.error('❌ 데이터 로딩 실패:', error);
                this.showError('데이터를 불러오는데 실패했습니다.');
            } finally {
                this.showLoading(false);
            }
        }

        /**
         * 💾 VIEW 기반 실비 항목 로딩 (안전한 쿼리 실행)
         */
        async loadReimbursementItems() {
            console.log('📊 VIEW 기반 실비 항목 로딩 시작...');
            
            try {
                if (!this.supabase || !this.currentUser?.id) {
                    throw new Error('클라이언트 또는 사용자 정보 누락');
                }

                console.log('📡 VIEW 쿼리 실행 중...');
                const { data: viewData, error } = await this.supabase
                    .from('v_user_reimbursement_items')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('display_order');

                if (error) {
                    console.error('VIEW 조회 실패:', error);
                    throw error;
                }

                console.log('📡 VIEW 쿼리 성공, 데이터 변환 중...');

                this.reimbursementItems = (viewData || []).map(item => ({
                    id: item.item_id,
                    type: item.item_type,
                    title: item.item_title,
                    subtitle: this.generateSubtitle(item),
                    receiptUrl: item.receipt_file_url,
                    hasReceipt: item.has_receipt,
                    completed: item.reimbursement_completed,
                    originalId: item.item_id,
                    category: item.category,
                    amount: item.total_amount,
                    store: item.purchase_store,
                    date: item.item_date,
                    additionalInfo: item.additional_info
                }));

                console.log(`✅ VIEW 기반 실비 항목 ${this.reimbursementItems.length}건 로딩 완료`);
                console.log('📋 카테고리별 분포:', this.getCategoryStats());
                
                return true;
                
            } catch (error) {
                console.error('❌ VIEW 기반 실비 항목 로딩 실패:', error);
                this.reimbursementItems = [];
                throw error;
            }
        }

        generateSubtitle(item) {
            switch (item.item_type) {
                case 'flight':
                    return item.additional_info || '항공권 구매';
                case 'baggage_departure':
                    return `출국일: ${item.item_date || '날짜 미상'}`;
                case 'baggage_return':
                    return `귀국일: ${item.item_date || '날짜 미상'}`;
                case 'equipment':
                    if (item.total_amount && item.purchase_store) {
                        return `${item.total_amount.toLocaleString()}원 (${item.purchase_store})`;
                    }
                    return item.additional_info || '교구 구매';
                case 'visa':
                    return '비자 관련 영수증';
                default:
                    return item.additional_info || '';
            }
        }

        getCategoryStats() {
            const stats = {};
            this.reimbursementItems.forEach(item => {
                const category = item.category || 'other';
                stats[category] = (stats[category] || 0) + 1;
            });
            return stats;
        }

        // 💳 계좌 정보 로딩 (안전한 쿼리)
        async loadAccountInfo() {
            try {
                console.log('💳 계좌 정보 로딩...');

                if (!this.supabase || !this.currentUser?.id) {
                    throw new Error('클라이언트 또는 사용자 정보 누락');
                }

                const { data: accountData, error } = await this.supabase
                    .from('user_reimbursements')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .eq('payment_round', 1)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (accountData) {
                    this.accountInfo = accountData;
                    console.log('✅ 계좌 정보 로딩 완료');
                } else {
                    console.log('ℹ️ 등록된 계좌 정보 없음');
                    this.accountInfo = null;
                }

                return true;

            } catch (error) {
                console.warn('⚠️ 계좌 정보 로딩 실패:', error);
                this.accountInfo = null;
                throw error;
            }
        }

        // 💰 입금 정보 로딩 (안전한 쿼리)
        async loadPaymentInfo() {
            try {
                console.log('💰 입금 정보 로딩...');

                if (!this.supabase || !this.currentUser?.id) {
                    throw new Error('클라이언트 또는 사용자 정보 누락');
                }

                const { data: paymentData, error } = await this.supabase
                    .from('user_reimbursements')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .not('scheduled_amount', 'is', null)
                    .order('payment_round', { ascending: true });

                if (error) {
                    throw error;
                }

                if (paymentData && paymentData.length > 0) {
                    this.paymentInfo = paymentData;
                    console.log(`✅ 입금 정보 ${paymentData.length}건 로딩 완료`);
                } else {
                    console.log('ℹ️ 입금 예정 정보 없음');
                    this.paymentInfo = null;
                }

                return true;

            } catch (error) {
                console.warn('⚠️ 입금 정보 로딩 실패:', error);
                this.paymentInfo = null;
                throw error;
            }
        }

        // 🎨 UI 초기화
        initializeUI() {
            console.log('🎨 UI 초기화...');
            
            this.showLoading(false);
            
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.display = 'block';
            }

            if (window.lucide) {
                lucide.createIcons();
            }

            console.log('✅ UI 초기화 완료');
        }

        // 🎧 이벤트 리스너 설정
        setupEventListeners() {
            console.log('🎧 이벤트 리스너 설정...');

            const accountForm = document.getElementById('accountForm');
            if (accountForm) {
                accountForm.addEventListener('submit', this.handleAccountSave.bind(this));
            }

            window.addEventListener('resize', this.handleResize.bind(this));

            console.log('✅ 이벤트 리스너 설정 완료');
        }

        // 💾 계좌 정보 저장 처리 (안전한 저장)
        async handleAccountSave(event) {
            event.preventDefault();
            
            const saveBtn = document.getElementById('saveAccountBtn');
            const originalText = saveBtn.innerHTML;
            
            try {
                console.log('💾 계좌 정보 저장 시작...');
                
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i data-lucide="loader-2"></i> 저장 중...';
                
                if (!this.supabase || !this.currentUser?.id) {
                    throw new Error('시스템 연결에 문제가 있습니다.');
                }
                
                const formData = new FormData(event.target);
                const accountData = {
                    user_id: this.currentUser.id,
                    bank_name: (formData.get('bankName') || '').trim(),
                    account_number: (formData.get('accountNumber') || '').trim(),
                    account_holder_name: (formData.get('accountHolder') || '').trim(),
                    payment_round: 1
                };

                if (!accountData.bank_name || !accountData.account_number || !accountData.account_holder_name) {
                    throw new Error('모든 필드를 입력해주세요.');
                }

                console.log('💾 저장할 계좌 정보:', accountData);
                
                const { data: existingAccount } = await this.supabase
                    .from('user_reimbursements')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .eq('payment_round', 1)
                    .single();

                let result;
                if (existingAccount) {
                    console.log('📝 기존 계좌 정보 업데이트...');
                    const { data, error } = await this.supabase
                        .from('user_reimbursements')
                        .update({
                            bank_name: accountData.bank_name,
                            account_number: accountData.account_number,
                            account_holder_name: accountData.account_holder_name,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', this.currentUser.id)
                        .eq('payment_round', 1)
                        .select();

                    if (error) throw error;
                    result = data && data.length > 0 ? data[0] : null;
                } else {
                    console.log('➕ 새 계좌 정보 삽입...');
                    accountData.created_at = new Date().toISOString();
                    accountData.updated_at = new Date().toISOString();
                    
                    const { data, error } = await this.supabase
                        .from('user_reimbursements')
                        .insert([accountData])
                        .select();

                    if (error) throw error;
                    result = data && data.length > 0 ? data[0] : null;
                }

                this.accountInfo = result;
                this.renderAccountInfo();
                this.showSuccess('계좌 정보가 저장되었습니다.');
                
                console.log('✅ 계좌 정보 저장 완료');
                
            } catch (error) {
                console.error('❌ 계좌 정보 저장 실패:', error);
                this.showError(`계좌 정보 저장 실패: ${error.message}`);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        }

        // 🎨 UI 렌더링 메서드들 (기존 기능 유지)
        renderAccountInfo() {
            const bankNameInput = document.getElementById('bankName');
            const accountNumberInput = document.getElementById('accountNumber');
            const accountHolderInput = document.getElementById('accountHolder');
            const accountAlert = document.getElementById('accountAlert');

            if (this.accountInfo) {
                if (bankNameInput) bankNameInput.value = this.accountInfo.bank_name || '';
                if (accountNumberInput) accountNumberInput.value = this.accountInfo.account_number || '';
                if (accountHolderInput) accountHolderInput.value = this.accountInfo.account_holder_name || '';

                if (accountAlert) {
                    accountAlert.className = 'alert alert-success';
                    accountAlert.innerHTML = `
                        <i data-lucide="check-circle"></i>
                        계좌 정보가 등록되어 있습니다. 수정이 필요한 경우 아래에서 변경해주세요.
                    `;
                }
            } else {
                if (accountAlert) {
                    accountAlert.className = 'alert alert-info';
                    accountAlert.innerHTML = `
                        <i data-lucide="info"></i>
                        실비 지원을 받으실 계좌 정보를 입력해주세요.
                    `;
                }
            }

            if (window.lucide) {
                lucide.createIcons();
            }
        }

        renderReimbursementList() {
            const reimbursementList = document.getElementById('reimbursementList');
            const emptyReimbursement = document.getElementById('emptyReimbursement');
            const reimbursementAlert = document.getElementById('reimbursementAlert');

            if (!reimbursementList) return;

            if (this.reimbursementItems.length === 0) {
                reimbursementList.style.display = 'none';
                if (emptyReimbursement) emptyReimbursement.style.display = 'block';
                if (reimbursementAlert) reimbursementAlert.style.display = 'none';
                return;
            }

            const itemsWithoutReceipt = this.reimbursementItems.filter(item => !item.hasReceipt);
            if (reimbursementAlert) {
                if (itemsWithoutReceipt.length > 0) {
                    reimbursementAlert.style.display = 'block';
                    reimbursementAlert.innerHTML = `
                        <i data-lucide="alert-triangle"></i>
                        영수증이 등록되지 않은 항목이 ${itemsWithoutReceipt.length}건 있습니다.
                    `;
                } else {
                    reimbursementAlert.style.display = 'none';
                }
            }

            reimbursementList.innerHTML = '';
            reimbursementList.style.display = 'flex';
            if (emptyReimbursement) emptyReimbursement.style.display = 'none';

            const categories = ['transport', 'equipment', 'visa'];
            const categorizedItems = {};
            
            this.reimbursementItems.forEach(item => {
                const category = item.category || 'other';
                if (!categorizedItems[category]) {
                    categorizedItems[category] = [];
                }
                categorizedItems[category].push(item);
            });

            categories.forEach(category => {
                if (categorizedItems[category] && categorizedItems[category].length > 0) {
                    const categoryHeader = document.createElement('div');
                    categoryHeader.className = 'category-divider';
                    
                    const categoryNames = {
                        transport: '🚗 교통/항공',
                        equipment: '📚 교구',
                        visa: '📋 비자'
                    };
                    
                    categoryHeader.textContent = categoryNames[category] || category;
                    reimbursementList.appendChild(categoryHeader);

                    categorizedItems[category].forEach(item => {
                        const itemElement = this.createReimbursementItemElement(item);
                        reimbursementList.appendChild(itemElement);
                    });
                }
            });

            if (categorizedItems.other && categorizedItems.other.length > 0) {
                const otherHeader = document.createElement('div');
                otherHeader.className = 'category-divider';
                otherHeader.textContent = '🔧 기타';
                reimbursementList.appendChild(otherHeader);

                categorizedItems.other.forEach(item => {
                    const itemElement = this.createReimbursementItemElement(item);
                    reimbursementList.appendChild(itemElement);
                });
            }

            if (window.lucide) {
                lucide.createIcons();
            }
        }

        createReimbursementItemElement(item) {
            const div = document.createElement('div');

            // 🆕 새로운 상태 처리 로직
            let statusClass, statusText, itemClass;

            // 상태별 분기 처리
            if (item.completed === 'paid' || item.completed === true) {
                statusClass = 'completed';
                statusText = '지급 완료';
                itemClass = 'completed';
            } else if (item.completed === 'confirmed') {
                statusClass = 'confirmed';
                statusText = '승인 완료';
                itemClass = 'confirmed';
            } else if (item.completed === 'pending' || item.completed === false || !item.completed) {
                if (item.hasReceipt) {
                    statusClass = 'has-receipt';
                    statusText = '검토 대기';
                    itemClass = 'pending';
                } else {
                    statusClass = 'need-receipt';
                    statusText = '영수증 필요';
                    itemClass = 'pending';
                }
            } else {
                // 기본값 (예상치 못한 상태)
                statusClass = 'need-receipt';
                statusText = '상태 확인 필요';
                itemClass = '';
            }

            div.className = `reimbursement-item ${itemClass}`;

            div.innerHTML = `
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-subtitle">${item.subtitle}</div>
                </div>
                <div class="item-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    ${item.hasReceipt ? `
                        <button class="btn btn-secondary" onclick="showReceiptModal('${item.receiptUrl}', '${item.title}')">
                            <i data-lucide="eye"></i>
                            영수증 보기
                        </button>
                    ` : ''}
                </div>
            `;

            return div;
        }

        renderPaymentInfo() {
            const paymentInfoCard = document.getElementById('paymentInfoCard');
            const paymentGrid = document.getElementById('paymentGrid');

            if (!this.paymentInfo || this.paymentInfo.length === 0) {
                if (paymentInfoCard) paymentInfoCard.style.display = 'none';
                return;
            }

            if (paymentInfoCard) paymentInfoCard.style.display = 'block';
            if (!paymentGrid) return;

            paymentGrid.innerHTML = '';

            this.paymentInfo.forEach((payment, index) => {
                const paymentElement = document.createElement('div');
                paymentElement.className = 'payment-field';

                const statusText = payment.payment_status === 'completed' ? '입금 완료' : '입금 예정';
                const amountText = payment.actual_amount || payment.scheduled_amount || '미정';
                const dateText = payment.actual_date || payment.scheduled_date || '미정';

                paymentElement.innerHTML = `
                    <div class="payment-label">${payment.payment_round}차 실비 지원</div>
                    <div class="payment-value">${statusText}</div>
                    <div class="payment-label">금액</div>
                    <div class="payment-value">${typeof amountText === 'number' ? amountText.toLocaleString() : amountText}원</div>
                    <div class="payment-label">일정</div>
                    <div class="payment-value">${dateText}</div>
                    ${payment.admin_notes ? `
                        <div class="payment-label">관리자 메모</div>
                        <div class="payment-value" style="font-size: 0.75rem; color: var(--text-secondary);">${payment.admin_notes}</div>
                    ` : ''}
                `;

                paymentGrid.appendChild(paymentElement);
            });
        }

        updateStatistics() {
            const totalCount = this.reimbursementItems.length;
            const completedCount = this.reimbursementItems.filter(item => 
                item.completed === 'paid' || item.completed === true
            ).length;
            const pendingCount = totalCount - completedCount;

            const totalElement = document.getElementById('totalItemsCount');
            const pendingElement = document.getElementById('pendingItemsCount');
            const completedElement = document.getElementById('completedItemsCount');

            if (totalElement) totalElement.textContent = totalCount;
            if (pendingElement) pendingElement.textContent = pendingCount;
            if (completedElement) completedElement.textContent = completedCount;
        }

        // 🔧 유틸리티 메서드들
        showLoading(show) {
            const loadingState = document.getElementById('loadingState');
            const mainContent = document.getElementById('mainContent');

            if (loadingState) loadingState.style.display = show ? 'flex' : 'none';
            if (mainContent) mainContent.style.display = show ? 'none' : 'block';
        }

        showSuccess(message) {
            this.showAlert(message, 'success');
        }

        showError(message) {
            this.showAlert(message, 'error');
        }

        // 🚨 v3.4.0: 개선된 사용자 친화적 에러 처리
        showUserFriendlyError(error) {
            console.error('❌ 시스템 오류:', error);
            
            this.showLoading(false);
            
            const loadingState = document.getElementById('loadingState');
            if (loadingState) {
                let errorMessage = '시스템 연결에 문제가 있습니다.';
                let solution = '페이지를 새로고침해주세요.';
                
                if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
                    errorMessage = '네트워크 연결에 문제가 있습니다.';
                    solution = '인터넷 연결을 확인하고 다시 시도해주세요.';
                } else if (error.message && error.message.includes('필수 의존성 누락')) {
                    errorMessage = '브라우저 환경에 문제가 있습니다.';
                    solution = '브라우저를 최신 버전으로 업데이트하거나 다른 브라우저를 사용해주세요.';
                } else if (error.message && error.message.includes('로그인 정보')) {
                    errorMessage = '로그인 정보가 만료되었습니다.';
                    solution = '다시 로그인해주세요.';
                } else if (error.message && error.message.includes('Supabase 클라이언트')) {
                    errorMessage = '데이터베이스 연결에 문제가 있습니다.';
                    solution = '잠시 후 다시 시도하거나 관리자에게 문의해주세요.';
                }
                
                loadingState.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem;">
                            <div style="color: #dc2626; display: flex; align-items: center; gap: 0.5rem; justify-content: center; margin-bottom: 1rem;">
                                <i data-lucide="wifi-off" style="width: 32px; height: 32px;"></i>
                                <h3 style="margin: 0; font-size: 1.25rem;">연결 오류</h3>
                            </div>
                            <p style="margin: 0.5rem 0; color: #374151; font-weight: 500;">${errorMessage}</p>
                            <p style="margin: 0.5rem 0; color: #6b7280; font-size: 0.875rem;">${solution}</p>
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <button onclick="window.location.reload()" class="btn btn-primary" style="min-width: 120px;">
                                <i data-lucide="refresh-cw"></i>
                                새로고침
                            </button>
                            <button onclick="window.location.href='dashboard.html'" class="btn btn-secondary" style="min-width: 120px;">
                                <i data-lucide="arrow-left"></i>
                                대시보드로
                            </button>
                        </div>
                    </div>
                `;
                
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        }

        showAlert(message, type) {
            const existingAlert = document.querySelector('.temp-alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            const alert = document.createElement('div');
            alert.className = `alert alert-${type === 'error' ? 'warning' : 'success'} temp-alert`;
            alert.style.position = 'fixed';
            alert.style.top = '20px';
            alert.style.right = '20px';
            alert.style.zIndex = '9999';
            alert.style.minWidth = '300px';
            alert.style.boxShadow = 'var(--shadow-lg)';

            const icon = type === 'error' ? 'alert-circle' : 'check-circle';
            alert.innerHTML = `
                <i data-lucide="${icon}"></i>
                ${message}
            `;

            document.body.appendChild(alert);
            if (window.lucide) {
                lucide.createIcons();
            }

            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 3000);
        }

        handleResize() {
            console.log('📱 화면 크기 변경됨');
        }

        // 🚀 시스템 상태 및 디버깅 메서드
        getSystemStatus() {
            return {
                isInitialized: this.isInitialized,
                hasUser: !!this.currentUser,
                hasSupabase: !!this.supabase,
                itemsCount: this.reimbursementItems.length,
                hasAccount: !!this.accountInfo,
                hasPayment: !!this.paymentInfo,
                version: 'v3.4.0'
            };
        }

        debugSystemInfo() {
            console.group('🔍 실비 지원 시스템 상태 v3.4.0');
            console.log('시스템 상태:', this.getSystemStatus());
            console.log('현재 사용자:', this.currentUser?.name || this.currentUser?.email);
            console.log('실비 항목 수:', this.reimbursementItems.length);
            console.log('계좌 정보:', !!this.accountInfo);
            console.log('입금 정보:', this.paymentInfo?.length || 0);
            console.log('Supabase 클라이언트 타입:', this.supabase?.constructor?.name || 'null');
            console.log('클라이언트 검증:', this.validateSupabaseClient(this.supabase));
            console.groupEnd();
        }

        cleanup() {
            console.log('🧹 ReimbursementSystem 정리 시작...');
            this.isInitialized = false;
            console.log('✅ 정리 완료');
        }
    }

    // 📡 전역 함수들 (모달 관리)
    window.showReceiptModal = function(receiptUrl, title) {
        if (!receiptUrl) {
            alert('영수증을 찾을 수 없습니다.');
            return;
        }

        console.log('📸 영수증 모달 열기:', title);

        const existingModal = document.getElementById('receiptModal');
        if (existingModal) {
            existingModal.classList.add('active');
            
            const modalTitle = existingModal.querySelector('.modal-title');
            const receiptImage = existingModal.querySelector('#receiptImage');
            const receiptLoading = existingModal.querySelector('#receiptLoading');
            const receiptError = existingModal.querySelector('#receiptError');

            if (modalTitle) modalTitle.textContent = `${title} 영수증`;
            if (receiptImage) receiptImage.style.display = 'none';
            if (receiptLoading) receiptLoading.style.display = 'flex';
            if (receiptError) receiptError.style.display = 'none';

            const img = new Image();
            img.onload = function() {
                if (receiptImage) {
                    receiptImage.src = receiptUrl;
                    receiptImage.style.display = 'block';
                }
                if (receiptLoading) receiptLoading.style.display = 'none';
            };
            img.onerror = function() {
                if (receiptError) receiptError.style.display = 'block';
                if (receiptLoading) receiptLoading.style.display = 'none';
            };
            img.src = receiptUrl;
        }
    };

    window.closeReceiptModal = function() {
        const modal = document.getElementById('receiptModal');
        if (modal) {
            modal.classList.remove('active');
        }
    };

    // 📱 시스템 초기화 함수
    function initializeReimbursementSystem() {
        console.log('🚀 ReimbursementSystem v3.4.0 인스턴스 생성...');
        
        window.reimbursementSystem = new ReimbursementSystem();

        window.debugReimbursementSystem = () => {
            if (window.reimbursementSystem) {
                window.reimbursementSystem.debugSystemInfo();
            }
        };

        window.refreshReimbursementData = async () => {
            if (window.reimbursementSystem && window.reimbursementSystem.isInitialized) {
                await window.reimbursementSystem.loadAllData();
            }
        };
    }

    // 🔄 페이지 정리 이벤트 리스너
    window.addEventListener('beforeunload', () => {
        if (window.reimbursementSystem) {
            window.reimbursementSystem.cleanup();
        }
    });

    // 🌐 전역 에러 처리
    window.addEventListener('error', (event) => {
        console.error('🚨 전역 에러:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('🚨 미처리 Promise 거부:', event.reason);
    });

    // 📄 DOM 로드 상태에 따른 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeReimbursementSystem);
    } else {
        setTimeout(initializeReimbursementSystem, 100);
    }

    console.log('✅ ReimbursementSystem v3.4.0 모듈 로드 완료 (GoTrueClient 중복 해결)');

})();