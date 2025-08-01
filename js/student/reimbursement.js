/**
 * 실비 지원 신청 시스템 v3.2.0 - Supabase 초기화 방식 완전 개선
 * 비자 관리 시스템의 안정적인 초기화 패턴 적용
 * 
 * 🔧 v3.2.0 핵심 개선사항:
 * - 비자 시스템과 동일한 관대한 Supabase 클라이언트 초기화 방식 적용
 * - 6가지 방법으로 클라이언트 획득 시도 (15회 재시도)
 * - 엄격한 단일 검증 → 유연한 다중 대안 방식으로 변경
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

    console.log('🚀 ReimbursementSystem v3.2.0 로딩 (Supabase 초기화 완전 개선)...');

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

        // 🔧 초기화 시스템 (v3.2.0 Supabase 초기화 개선)
        async init() {
            try {
                console.log('🔧 ReimbursementSystem v3.2.0 초기화 시작...');

                // 1. HTML 단계 의존성 확인 (이미 준비되어 있어야 함)
                this.verifyPrerequisites();

                // 2. 🆕 v3.2.0: 관대한 Supabase 클라이언트 초기화
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
                console.log('✅ ReimbursementSystem v3.2.0 초기화 완료');

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
                configKey: !!(window.CONFIG && window.CONFIG.SUPABASE && window.CONFIG.SUPABASE.ANON_KEY)
            };

            console.log('📋 의존성 체크 결과:', checks);

            const failed = Object.entries(checks).filter(([key, value]) => !value).map(([key]) => key);
            
            if (failed.length > 0) {
                throw new Error(`필수 의존성 누락: ${failed.join(', ')}\n\nHTML 단계 초기화가 실패했을 수 있습니다.`);
            }

            console.log('✅ 모든 필수 의존성 확인 완료');
        }

        // 🆕 v3.2.0: 비자 시스템과 동일한 관대한 Supabase 클라이언트 초기화
        async initializeSupabaseClient() {
            console.log('🔌 관대한 Supabase 클라이언트 초기화 시작...');
            
            let attempts = 0;
            const maxAttempts = 15;

            while (attempts < maxAttempts) {
                try {
                    // 1. window.supabase 직접 사용 (가장 일반적)
                    if (window.supabase && typeof window.supabase.from === 'function') {
                        this.supabase = window.supabase;
                        console.log('✅ window.supabase 직접 사용');
                        return;
                    }

                    // 2. SupabaseCore.client 사용
                    if (window.SupabaseCore?.client && typeof window.SupabaseCore.client.from === 'function') {
                        this.supabase = window.SupabaseCore.client;
                        console.log('✅ window.SupabaseCore.client 사용');
                        return;
                    }

                    // 3. supabaseClient 전역 변수 사용
                    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
                        this.supabase = window.supabaseClient;
                        console.log('✅ window.supabaseClient 사용');
                        return;
                    }

                    // 4. SupabaseCore 수동 초기화 시도
                    if (window.SupabaseCore && typeof window.SupabaseCore.initialize === 'function') {
                        console.log('🔄 SupabaseCore 수동 초기화 시도...');
                        await window.SupabaseCore.initialize();
                        
                        if (window.SupabaseCore.client && typeof window.SupabaseCore.client.from === 'function') {
                            this.supabase = window.SupabaseCore.client;
                            console.log('✅ SupabaseCore 수동 초기화 후 클라이언트 획득');
                            return;
                        }
                    }

                    // 5. 직접 Supabase 클라이언트 생성 (최후의 수단)
                    if (window.supabase?.createClient && window.CONFIG?.SUPABASE?.URL && window.CONFIG?.SUPABASE?.ANON_KEY) {
                        this.supabase = window.supabase.createClient(
                            window.CONFIG.SUPABASE.URL,
                            window.CONFIG.SUPABASE.ANON_KEY
                        );
                        console.log('✅ 직접 Supabase 클라이언트 생성');
                        
                        // 생성된 클라이언트가 정상 작동하는지 확인
                        if (typeof this.supabase.from === 'function') {
                            return;
                        } else {
                            console.warn('⚠️ 생성된 클라이언트가 비정상');
                            this.supabase = null;
                        }
                    }

                    // 6. 전역 스코프에서 createClient 함수 찾기
                    if (typeof createClient === 'function' && window.CONFIG?.SUPABASE?.URL && window.CONFIG?.SUPABASE?.ANON_KEY) {
                        this.supabase = createClient(
                            window.CONFIG.SUPABASE.URL,
                            window.CONFIG.SUPABASE.ANON_KEY
                        );
                        console.log('✅ 전역 createClient 함수로 클라이언트 생성');
                        
                        if (typeof this.supabase.from === 'function') {
                            return;
                        } else {
                            this.supabase = null;
                        }
                    }

                    attempts++;
                    console.log(`⏳ Supabase 클라이언트 대기 중... (${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 300));

                } catch (error) {
                    console.warn(`⚠️ Supabase 클라이언트 초기화 시도 ${attempts + 1} 실패:`, error);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
        }

        // 👤 사용자 인증 확인 (기존 로직 유지)
        async checkAuthentication() {
            try {
                console.log('👤 사용자 인증 확인...');

                // localStorage에서 사용자 정보 확인
                const userData = localStorage.getItem('currentStudent');
                if (!userData) {
                    throw new Error('로그인 정보를 찾을 수 없습니다.');
                }

                // JSON 파싱 및 검증
                let parsedUser;
                try {
                    parsedUser = JSON.parse(userData);
                } catch (parseError) {
                    throw new Error('사용자 데이터 형식이 올바르지 않습니다.');
                }

                // 필수 필드 검증
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
                
                // 사용자에게 알림 후 로그인 페이지로 리다이렉트
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
                // 병렬로 모든 데이터 로딩
                const [itemsResult, accountResult, paymentResult] = await Promise.allSettled([
                    this.loadReimbursementItems(),
                    this.loadAccountInfo(),
                    this.loadPaymentInfo()
                ]);

                // 결과 검증 및 로깅
                const results = {
                    items: itemsResult.status === 'fulfilled',
                    account: accountResult.status === 'fulfilled',
                    payment: paymentResult.status === 'fulfilled'
                };

                console.log('📋 데이터 로딩 결과:', results);

                // 실패한 작업 로깅
                if (itemsResult.status === 'rejected') {
                    console.error('❌ 실비 항목 로딩 실패:', itemsResult.reason);
                }
                if (accountResult.status === 'rejected') {
                    console.warn('⚠️ 계좌 정보 로딩 실패:', accountResult.reason);
                }
                if (paymentResult.status === 'rejected') {
                    console.warn('⚠️ 입금 정보 로딩 실패:', paymentResult.reason);
                }

                // UI 업데이트
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
         * 💾 VIEW 기반 실비 항목 로딩 (핵심 기능 유지)
         */
        async loadReimbursementItems() {
            console.log('📊 VIEW 기반 실비 항목 로딩 시작...');
            
            try {
                // 🎯 핵심: 단일 VIEW 조회로 모든 실비 항목 가져오기
                const { data: viewData, error } = await this.supabase
                    .from('v_user_reimbursement_items')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('display_order');

                if (error) {
                    console.error('VIEW 조회 실패:', error);
                    throw error;
                }

                // VIEW 데이터를 기존 UI 형식으로 변환
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
                    // 교구 전용 정보
                    amount: item.total_amount,
                    store: item.purchase_store,
                    // 추가 정보
                    date: item.item_date,
                    additionalInfo: item.additional_info
                }));

                console.log(`✅ VIEW 기반 실비 항목 ${this.reimbursementItems.length}건 로딩 완료`);
                console.log('📋 카테고리별 분포:', this.getCategoryStats());
                
                return true;
                
            } catch (error) {
                console.error('❌ VIEW 기반 실비 항목 로딩 실패:', error);
                // 빈 배열로 초기화하여 UI 오류 방지
                this.reimbursementItems = [];
                throw error;
            }
        }

        /**
         * 📝 VIEW 데이터를 기반으로 부제목 생성 (기능 유지)
         */
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

        /**
         * 📈 카테고리별 통계 생성 (기능 유지)
         */
        getCategoryStats() {
            const stats = {};
            this.reimbursementItems.forEach(item => {
                const category = item.category || 'other';
                stats[category] = (stats[category] || 0) + 1;
            });
            return stats;
        }

        // 💳 계좌 정보 로딩
        async loadAccountInfo() {
            try {
                console.log('💳 계좌 정보 로딩...');

                const { data: accountData, error } = await this.supabase
                    .from('user_reimbursements')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .eq('payment_round', 1)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116은 "not found" 에러
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

        // 💰 입금 정보 로딩
        async loadPaymentInfo() {
            try {
                console.log('💰 입금 정보 로딩...');

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

            // Lucide 아이콘 초기화
            if (window.lucide) {
                lucide.createIcons();
            }

            console.log('✅ UI 초기화 완료');
        }

        // 🎧 이벤트 리스너 설정
        setupEventListeners() {
            console.log('🎧 이벤트 리스너 설정...');

            // 계좌 정보 폼 제출
            const accountForm = document.getElementById('accountForm');
            if (accountForm) {
                accountForm.addEventListener('submit', this.handleAccountSave.bind(this));
            }

            // 창 크기 변경시 반응형 업데이트
            window.addEventListener('resize', this.handleResize.bind(this));

            console.log('✅ 이벤트 리스너 설정 완료');
        }

        // 💾 계좌 정보 저장 처리 (강화된 에러 처리)
        async handleAccountSave(event) {
            event.preventDefault();
            
            const saveBtn = document.getElementById('saveAccountBtn');
            const originalText = saveBtn.innerHTML;
            
            try {
                console.log('💾 계좌 정보 저장 시작...');
                
                // 버튼 상태 변경
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i data-lucide="loader-2"></i> 저장 중...';
                
                // 폼 데이터 수집 및 검증
                const formData = new FormData(event.target);
                const accountData = {
                    user_id: this.currentUser.id,
                    bank_name: (formData.get('bankName') || '').trim(),
                    account_number: (formData.get('accountNumber') || '').trim(),
                    account_holder_name: (formData.get('accountHolder') || '').trim(),
                    payment_round: 1
                };

                // 필수 필드 검증
                if (!accountData.bank_name || !accountData.account_number || !accountData.account_holder_name) {
                    throw new Error('모든 필드를 입력해주세요.');
                }

                console.log('💾 저장할 계좌 정보:', accountData);
                
                // 기존 계좌 정보 확인
                const { data: existingAccount } = await this.supabase
                    .from('user_reimbursements')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .eq('payment_round', 1)
                    .single();

                let result;
                if (existingAccount) {
                    // 기존 데이터 업데이트
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
                    // 새 데이터 삽입
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

                // 성공 처리
                this.accountInfo = result;
                this.renderAccountInfo();
                this.showSuccess('계좌 정보가 저장되었습니다.');
                
                console.log('✅ 계좌 정보 저장 완료');
                
            } catch (error) {
                console.error('❌ 계좌 정보 저장 실패:', error);
                this.showError(`계좌 정보 저장 실패: ${error.message}`);
            } finally {
                // 버튼 상태 복구
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                // Lucide 아이콘 재초기화
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
                // 기존 정보 채우기
                if (bankNameInput) bankNameInput.value = this.accountInfo.bank_name || '';
                if (accountNumberInput) accountNumberInput.value = this.accountInfo.account_number || '';
                if (accountHolderInput) accountHolderInput.value = this.accountInfo.account_holder_name || '';

                // 알림 메시지 변경
                if (accountAlert) {
                    accountAlert.className = 'alert alert-success';
                    accountAlert.innerHTML = `
                        <i data-lucide="check-circle"></i>
                        계좌 정보가 등록되어 있습니다. 수정이 필요한 경우 아래에서 변경해주세요.
                    `;
                }
            } else {
                // 기본 알림 메시지 유지
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

            // 영수증 없는 항목 체크
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

            // 카테고리별 그룹핑 및 리스트 렌더링
            reimbursementList.innerHTML = '';
            reimbursementList.style.display = 'flex';
            if (emptyReimbursement) emptyReimbursement.style.display = 'none';

            // 카테고리별 정렬
            const categories = ['transport', 'equipment', 'visa'];
            const categorizedItems = {};
            
            // 카테고리별로 항목 분류
            this.reimbursementItems.forEach(item => {
                const category = item.category || 'other';
                if (!categorizedItems[category]) {
                    categorizedItems[category] = [];
                }
                categorizedItems[category].push(item);
            });

            // 카테고리 순서대로 렌더링
            categories.forEach(category => {
                if (categorizedItems[category] && categorizedItems[category].length > 0) {
                    // 카테고리 헤더 추가
                    const categoryHeader = document.createElement('div');
                    categoryHeader.className = 'category-divider';
                    
                    const categoryNames = {
                        transport: '🚗 교통/항공',
                        equipment: '📚 교구',
                        visa: '📋 비자'
                    };
                    
                    categoryHeader.textContent = categoryNames[category] || category;
                    reimbursementList.appendChild(categoryHeader);

                    // 해당 카테고리 항목들 렌더링
                    categorizedItems[category].forEach(item => {
                        const itemElement = this.createReimbursementItemElement(item);
                        reimbursementList.appendChild(itemElement);
                    });
                }
            });

            // 기타 카테고리 처리
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
            div.className = `reimbursement-item ${item.completed ? 'completed' : ''}`;

            const statusClass = item.completed ? 'completed' : (item.hasReceipt ? 'has-receipt' : 'need-receipt');
            const statusText = item.completed ? '처리 완료' : (item.hasReceipt ? '영수증 등록됨' : '영수증 필요');

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
            const completedCount = this.reimbursementItems.filter(item => item.completed).length;
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

        // 🚨 v3.2.0: 사용자 친화적인 에러 처리 (개선된 메시지)
        showUserFriendlyError(error) {
            console.error('❌ 시스템 오류:', error);
            
            // 로딩 상태 숨기기
            this.showLoading(false);
            
            // 사용자 친화적인 에러 메시지 표시
            const loadingState = document.getElementById('loadingState');
            if (loadingState) {
                let errorMessage = '알 수 없는 오류가 발생했습니다.';
                let solution = '페이지를 새로고침해주세요.';
                
                // 에러 유형에 따른 맞춤 메시지
                if (error.message.includes('필수 의존성 누락')) {
                    errorMessage = '시스템 초기화 오류가 발생했습니다.';
                    solution = '잠시 후 다시 시도하거나 페이지를 새로고침해주세요.';
                } else if (error.message.includes('로그인 정보')) {
                    errorMessage = '로그인 정보가 유효하지 않습니다.';
                    solution = '다시 로그인해주세요.';
                } else if (error.message.includes('Supabase 클라이언트를 초기화할 수 없습니다')) {
                    errorMessage = '데이터베이스 연결에 문제가 있습니다.';
                    solution = '네트워크 연결을 확인하고 다시 시도해주세요.';
                }
                
                loadingState.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                        <i data-lucide="alert-circle" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                        <h3>오류가 발생했습니다</h3>
                        <p style="margin: 1rem 0; color: var(--text-primary);">${errorMessage}</p>
                        <p style="margin: 1rem 0; color: var(--text-secondary); font-size: 0.875rem;">${solution}</p>
                        <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                            <button onclick="window.location.reload()" class="btn btn-primary">
                                <i data-lucide="refresh-cw"></i>
                                새로고침
                            </button>
                            <button onclick="window.location.href='dashboard.html'" class="btn btn-secondary">
                                <i data-lucide="arrow-left"></i>
                                대시보드로
                            </button>
                        </div>
                    </div>
                `;
                
                // 아이콘 다시 초기화
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        }

        showAlert(message, type) {
            // 기존 알림 제거
            const existingAlert = document.querySelector('.temp-alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            // 새 알림 생성
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

            // 3초 후 자동 제거
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 3000);
        }

        handleResize() {
            // 반응형 처리 로직 (필요시 구현)
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
                version: 'v3.2.0'
            };
        }

        debugSystemInfo() {
            console.group('🔍 실비 지원 시스템 상태 v3.2.0');
            console.log('시스템 상태:', this.getSystemStatus());
            console.log('현재 사용자:', this.currentUser?.name || this.currentUser?.email);
            console.log('실비 항목 수:', this.reimbursementItems.length);
            console.log('계좌 정보:', !!this.accountInfo);
            console.log('입금 정보:', this.paymentInfo?.length || 0);
            console.log('Supabase 클라이언트 타입:', this.supabase?.constructor?.name || 'null');
            console.groupEnd();
        }

        // 🧹 정리 메서드
        cleanup() {
            console.log('🧹 ReimbursementSystem 정리 시작...');
            
            // 이벤트 리스너 제거 등 정리 작업
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

        // 기존 모달 제거
        const existingModal = document.getElementById('receiptModal');
        if (existingModal) {
            existingModal.classList.add('active');
            
            // 모달 내용 업데이트
            const modalTitle = existingModal.querySelector('.modal-title');
            const receiptImage = existingModal.querySelector('#receiptImage');
            const receiptLoading = existingModal.querySelector('#receiptLoading');
            const receiptError = existingModal.querySelector('#receiptError');

            if (modalTitle) modalTitle.textContent = `${title} 영수증`;
            if (receiptImage) receiptImage.style.display = 'none';
            if (receiptLoading) receiptLoading.style.display = 'flex';
            if (receiptError) receiptError.style.display = 'none';

            // 이미지 로딩
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
        console.log('🚀 ReimbursementSystem v3.2.0 인스턴스 생성...');
        
        // 전역에 인스턴스 생성
        window.reimbursementSystem = new ReimbursementSystem();

        // 디버깅을 위한 전역 함수 등록
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
        // DOM이 이미 로드된 경우 약간의 지연 후 실행
        setTimeout(initializeReimbursementSystem, 100);
    }

    console.log('✅ ReimbursementSystem v3.2.0 모듈 로드 완료 (Supabase 초기화 완전 개선)');

})();