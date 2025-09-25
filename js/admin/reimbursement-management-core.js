// 💰 실비 지원 관리 시스템 - 핵심 모듈 v1.0.0
// admin/reimbursement-management-core.js

/**
 * 실비 지원 관리 시스템의 핵심 클래스
 * 전체 시스템 초기화, 데이터 관리, 상태 관리를 담당
 */
class ReimbursementManagementSystem {
    constructor() {
        this.supabaseClient = null;
        this.students = [];
        this.reimbursementData = new Map(); // user_id -> reimbursement info
        this.reimbursementItems = new Map(); // user_id -> items array
        this.filteredStudents = [];
        this.currentUser = null; // 현재 선택된 사용자 (모달용)
        
        // 상태 관리
        this.isLoading = false;
        this.lastRefreshTime = null;
        
        console.log('💰 실비 관리 시스템 핵심 모듈 초기화 (v1.0.0)');
    }

    /**
     * 시스템 초기화
     */
    async initialize() {
        try {
            console.log('🚀 실비 관리 시스템 초기화 시작...');
            
            // 관리자 인증 확인
            this.checkAdminAuth();
            
            // Supabase 클라이언트 대기
            await this.waitForSupabase();
            
            // UI 컴포넌트 초기화
            this.initializeUIComponents();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 데이터 로드
            await this.loadAllData();
            
            // 아이콘 초기화
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log('✅ 실비 관리 시스템 초기화 완료');
            this.showToast('실비 관리 시스템이 준비되었습니다.', 'success');
            
        } catch (error) {
            console.error('❌ 시스템 초기화 실패:', error);
            this.showError('시스템 초기화에 실패했습니다: ' + error.message);
        }
    }

    /**
     * 관리자 인증 확인
     */
    checkAdminAuth() {
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession || adminSession !== 'true') {
            alert('관리자 로그인이 필요합니다.');
            window.location.href = '../admin.html';
            return;
        }
        console.log('✅ 관리자 인증 확인 완료');
    }

    /**
     * Supabase 클라이언트 대기 (비자 관리 페이지와 동일)
     */
    async waitForSupabase() {
        console.log('⏳ Supabase 클라이언트 초기화 대기...');
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 150;
            
            const check = () => {
                attempts++;
                
                let client = null;
                
                // 다양한 방법으로 클라이언트 찾기
                if (window.SupabaseAPI && window.SupabaseAPI.supabase) {
                    client = window.SupabaseAPI.supabase;
                    console.log('✅ Method 1: SupabaseAPI.supabase 사용');
                }
                else if (window.SupabaseAPI && window.SupabaseAPI.client) {
                    client = window.SupabaseAPI.client;
                    console.log('✅ Method 2: SupabaseAPI.client 사용');
                }
                else if (window.SupabaseCore && window.SupabaseCore.supabase) {
                    client = window.SupabaseCore.supabase;
                    console.log('✅ Method 3: SupabaseCore.supabase 사용');
                }
                else if (window.supabase) {
                    client = window.supabase;
                    console.log('✅ Method 4: window.supabase 사용');
                }
                
                if (client) {
                    this.supabaseClient = client;
                    console.log('🚀 Supabase 클라이언트 준비 완료:', typeof client);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Supabase 클라이언트 타임아웃');
                    reject(new Error('Supabase 클라이언트를 찾을 수 없습니다.'));
                } else {
                    if (attempts % 20 === 0) {
                        console.log(`⏳ 클라이언트 대기 중... (${attempts}/${maxAttempts})`);
                    }
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }

    /**
     * UI 컴포넌트 초기화
     */
    initializeUIComponents() {
        // 초기 로딩 상태 표시
        this.showLoading();
        
        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        const scheduledDateInput = document.getElementById('scheduledDate');
        const actualDateInput = document.getElementById('actualDate');
        
        if (scheduledDateInput) scheduledDateInput.value = today;
        if (actualDateInput) actualDateInput.value = today;
        
        console.log('🎨 UI 컴포넌트 초기화 완료');
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 검색 입력
        const nameSearch = document.getElementById('nameSearch');
        if (nameSearch) {
            nameSearch.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // 필터 선택
        const statusFilter = document.getElementById('statusFilter');
        const roundFilter = document.getElementById('roundFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.applyFilters();
            });
        }
        
        if (roundFilter) {
            roundFilter.addEventListener('change', (e) => {
                this.applyFilters();
            });
        }

        console.log('🔧 이벤트 리스너 설정 완료');
    }

    /**
     * 모든 데이터 로드
     */
    async loadAllData() {
        try {
            this.isLoading = true;
            this.showLoading();
            
            console.log('📊 데이터 로드 시작...');
            
            // 실비 대상 학생들 조회 (v_user_reimbursement_items 뷰 활용)
            await this.loadStudentsWithReimbursementData();
            
            // 통계 업데이트
            this.updateStatistics();
            
            // UI 렌더링
            this.renderStudentsTable();
            
            this.lastRefreshTime = new Date();
            console.log('✅ 모든 데이터 로드 완료:', this.students.length, '명');
            
        } catch (error) {
            console.error('❌ 데이터 로드 실패:', error);
            this.showError('데이터를 불러오는데 실패했습니다: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 실비 대상 학생들과 관련 데이터 로드
     */
    async loadStudentsWithReimbursementData() {
        // 1. 실비 항목이 있는 학생들 조회
        const { data: reimbursementItemsData, error: itemsError } = await this.supabaseClient
            .from('v_user_reimbursement_items')
            .select('*')
            .order('user_id');

        if (itemsError) {
            throw new Error(`실비 항목 조회 실패: ${itemsError.message}`);
        }

        // 2. 학생별로 그룹화
        const studentIds = [...new Set((reimbursementItemsData || []).map(item => item.user_id))];
        
        if (studentIds.length === 0) {
            this.students = [];
            this.reimbursementItems.clear();
            this.reimbursementData.clear();
            return;
        }

        // 3. 학생들의 기본 정보 조회
        const { data: studentsData, error: studentsError } = await this.supabaseClient
            .from('user_profiles')
            .select('id, name, email, sejong_institute')
            .in('id', studentIds)
            .order('name');

        if (studentsError) {
            throw new Error(`학생 정보 조회 실패: ${studentsError.message}`);
        }

        // 4. 각 학생의 실비 지원 정보 조회
        const { data: reimbursementData, error: reimbursementError } = await this.supabaseClient
            .from('user_reimbursements')
            .select('*')
            .in('user_id', studentIds);

        if (reimbursementError) {
            throw new Error(`실비 지원 정보 조회 실패: ${reimbursementError.message}`);
        }

        // 5. 데이터 구조화
        this.students = studentsData || [];
        
        // 학생별 실비 항목 매핑
        this.reimbursementItems.clear();
        (reimbursementItemsData || []).forEach(item => {
            if (!this.reimbursementItems.has(item.user_id)) {
                this.reimbursementItems.set(item.user_id, []);
            }
            this.reimbursementItems.get(item.user_id).push(item);
        });

        // 학생별 실비 지원 정보 매핑 (차수별로 배열 관리)
        this.reimbursementData.clear();
        (reimbursementData || []).forEach(reimbursement => {
            if (!this.reimbursementData.has(reimbursement.user_id)) {
                this.reimbursementData.set(reimbursement.user_id, []);
            }
            this.reimbursementData.get(reimbursement.user_id).push(reimbursement);
        });
        console.log(`📊 데이터 로드 완료: 학생 ${this.students.length}명, 실비 항목 ${reimbursementItemsData?.length || 0}개`);
    }

    /**
     * 검색 처리
     */
    handleSearch(query) {
        if (!query.trim()) {
            this.filteredStudents = [];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredStudents = this.students.filter(student => {
                const studentName = student.name || '';
                const studentEmail = student.email || '';
                const studentInstitute = student.sejong_institute || '';

                return studentName.toLowerCase().includes(searchTerm) ||
                       studentEmail.toLowerCase().includes(searchTerm) ||
                       studentInstitute.toLowerCase().includes(searchTerm);
            });
        }

        this.renderStudentsTable();
        console.log(`🔍 검색 결과: ${this.filteredStudents.length}명`);
    }
    /**
     * 필터 적용
     */
    applyFilters() {
        const statusFilter = document.getElementById('statusFilter')?.value;
        const roundFilter = document.getElementById('roundFilter')?.value;
        
        let filtered = [...this.students];
        
        // 상태 필터
        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter(student => {
                const status = this.getStudentPaymentStatus(student.id);
                return status === statusFilter;
            });
        }
        
        // 차수 필터
        if (roundFilter && roundFilter !== 'all') {
            const round = parseInt(roundFilter);
            filtered = filtered.filter(student => {
                const reimbursement = this.reimbursementData.get(student.id);
                return reimbursement && reimbursement.payment_round === round;
            });
        }
        
        this.filteredStudents = filtered;
        this.renderStudentsTable();
        
        console.log(`🔽 필터 적용: ${this.filteredStudents.length}명`);
    }

    /**
     * 학생의 지급 상태 확인
     */
    getStudentPaymentStatus(userId) {
        const reimbursements = this.reimbursementData.get(userId) || [];

        if (reimbursements.length === 0) {
            return 'not_set'; // 미설정
        }

        // pending 상태가 있으면 pending 반환 (우선순위)
        const pendingReimbursement = reimbursements.find(r => r.payment_status === 'pending');
        if (pendingReimbursement) {
            return 'pending';
        }

        // pending이 없으면 가장 최근 차수의 상태 반환
        const latestReimbursement = reimbursements.reduce((latest, current) => {
            return current.payment_round > latest.payment_round ? current : latest;
        });

        return latestReimbursement.payment_status || 'completed';
    }
    /**
     * 학생별 실비 항목 개수 및 카테고리 정보
     */
    getStudentItemsSummary(userId) {
        const items = this.reimbursementItems.get(userId) || [];
        
        const summary = {
            total: items.length,
            transport: 0,
            equipment: 0,
            visa: 0
        };
        
        items.forEach(item => {
            if (item.category === 'transport') summary.transport++;
            else if (item.category === 'equipment') summary.equipment++;
            else if (item.category === 'visa') summary.visa++;
        });
        
        return summary;
    }

    /**
     * 데이터 새로고침
     */
    async refreshData() {
        console.log('🔄 데이터 새로고침 시작');
        await this.loadAllData();
        this.showToast('데이터가 새로고침되었습니다.', 'success');
    }

    /**
     * 로딩 상태 표시
     */
    showLoading() {
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            데이터를 불러오는 중...
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * 에러 표시
     */
    showError(message) {
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="error-state">
                            <i data-lucide="alert-circle"></i>
                            <p>${message}</p>
                        </div>
                    </td>
                </tr>
            `;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'info') {
        // 토스트 컨테이너가 없으면 생성
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // 토스트 생성
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} show`;
        toast.innerHTML = `
            <div class="toast-content">
                <i data-lucide="${this.getToastIcon(type)}"></i>
                ${message}
            </div>
        `;

        container.appendChild(toast);

        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 3초 후 제거
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 토스트 아이콘 반환
     */
    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'alert-circle';
            case 'warning': return 'alert-triangle';
            default: return 'info';
        }
    }

    
    
    
    /**
     * 시스템 상태 정보 반환 (디버깅용)
     */
    getDebugInfo() {
        return {
            students: this.students.length,
            reimbursementData: this.reimbursementData.size,
            reimbursementItems: this.reimbursementItems.size,
            filteredStudents: this.filteredStudents.length,
            isLoading: this.isLoading,
            lastRefreshTime: this.lastRefreshTime,
            clientType: this.supabaseClient ? 'connected' : 'not connected'
        };
    }

    /**
     * 사용자의 활성(pending) 차수 조회
     */
    getPendingReimbursement(userId) {
        const reimbursements = this.reimbursementData.get(userId) || [];
        const pendingReimbursements = reimbursements.filter(r => r.payment_status === 'pending');

        if (pendingReimbursements.length === 0) return null;

        // 1순위: scheduled_amount가 있는 차수 중 가장 낮은 차수
        const withAmount = pendingReimbursements
            .filter(r => r.scheduled_amount && r.scheduled_amount > 0)
            .sort((a, b) => a.payment_round - b.payment_round);

        if (withAmount.length > 0) return withAmount[0];

        // 2순위: scheduled_amount가 없는 차수 중 가장 낮은 차수
        const withoutAmount = pendingReimbursements
            .filter(r => !r.scheduled_amount || r.scheduled_amount <= 0)
            .sort((a, b) => a.payment_round - b.payment_round);

        return withoutAmount.length > 0 ? withoutAmount[0] : null;
    }
    
    /**
     * 사용자의 완료된 차수들 조회
     */
    getCompletedReimbursements(userId) {
        const reimbursements = this.reimbursementData.get(userId) || [];
        return reimbursements.filter(r => r.payment_status === 'completed');
    }

    /**
     * 사용자의 최신 차수 조회 (계좌 정보용)
     */
    getLatestReimbursement(userId) {
        const reimbursements = this.reimbursementData.get(userId) || [];
        if (reimbursements.length === 0) return null;

        return reimbursements.reduce((latest, current) => {
            if (!latest) return current;
            if (current.payment_round > latest.payment_round) return current;
            if (current.payment_round === latest.payment_round && 
                new Date(current.created_at) > new Date(latest.created_at)) return current;
            return latest;
        }, null);
    }

    /**
     * 다음 차수 번호 계산
     */
    getNextPaymentRound(userId) {
        const reimbursements = this.reimbursementData.get(userId) || [];
        if (reimbursements.length === 0) return 1;

        const maxRound = Math.max(...reimbursements.map(r => r.payment_round));
        return maxRound + 1;
    }

    
}



// 전역 인스턴스 생성 및 초기화
const reimbursementManagementSystem = new ReimbursementManagementSystem();
window.reimbursementManagementSystem = reimbursementManagementSystem;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    reimbursementManagementSystem.initialize();
});

console.log('💰 실비 관리 시스템 핵심 모듈 로드 완료 (v1.0.0)');
