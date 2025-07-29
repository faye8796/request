// 신청 관리 전용 모듈 (admin-applications.js)
AdminManager.Applications = {
    currentSearchTerm: '',

    // 초기화
    init() {
        console.log('📋 Applications 모듈 초기화');
        this.setupEventListeners();
        this.loadApplications();
        return true;
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 이미 admin-core.js에서 검색 이벤트는 설정됨
        console.log('📋 Applications 모듈 이벤트 리스너 설정');
    },

    // 신청 내역 로드
    async loadApplications() {
        try {
            console.log('📋 신청 내역 로드 중...', this.currentSearchTerm);
            const applications = await SupabaseAPI.searchApplications(this.currentSearchTerm);
            this.renderApplications(applications);
            console.log('✅ 신청 내역 로드 완료:', applications.length, '건');
        } catch (error) {
            console.error('❌ 신청 내역 로드 실패:', error);
            Utils.showToast('신청 내역을 불러오는 중 오류가 발생했습니다.', 'error');
        }
    },

    // 신청 내역 렌더링
    renderApplications(applications) {
        const container = Utils.$('#adminApplications');
        
        if (!container) {
            console.error('❌ adminApplications 컨테이너를 찾을 수 없습니다.');
            return;
        }

        if (!applications || applications.length === 0) {
            container.innerHTML = AdminManager.Utils.createNoResultsHTML(this.currentSearchTerm);
            return;
        }

        container.innerHTML = '';
        
        applications.forEach(application => {
            try {
                const applicationCard = AdminManager.Utils.createApplicationCard(application);
                container.appendChild(applicationCard);
            } catch (error) {
                console.error('❌ 신청 카드 생성 오류:', error);
            }
        });

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 이벤트 리스너 재설정
        this.setupItemActionListeners();
    },

    // 아이템 액션 이벤트 리스너 설정
    setupItemActionListeners() {
        // 액션 버튼들
        const actionButtons = Utils.$$('.admin-item-actions button[data-action]');
        
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                const itemCard = e.target.closest('.admin-item-card');
                const requestId = itemCard.dataset.requestId;
                
                this.handleItemAction(action, requestId, e.target);
            });
        });

        // 영수증 보기 버튼들
        const receiptButtons = Utils.$$('.view-receipt-btn');
        receiptButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const requestId = e.target.closest('button').dataset.requestId;
                AdminManager.Utils.showViewReceiptModal(requestId);
            });
        });
    },

    // 아이템 액션 처리
    async handleItemAction(action, requestId, buttonElement) {
        console.log('🔧 아이템 액션 처리:', action, requestId);
        
        switch(action) {
            case 'approve':
                await this.approveItem(requestId, buttonElement);
                break;
            case 'reject':
                await this.rejectItem(requestId, buttonElement);
                break;
            case 'purchase':
                await this.markAsPurchased(requestId, buttonElement);
                break;
            default:
                console.warn('⚠️ 알 수 없는 액션:', action);
        }
    },

    // 아이템 승인
    async approveItem(requestId, buttonElement) {
        if (Utils.showConfirm('이 교구 신청을 승인하시겠습니까?')) {
            Utils.showLoading(buttonElement);
            
            try {
                console.log('✅ 아이템 승인 시작:', requestId);
                const result = await SupabaseAPI.updateItemStatus(requestId, 'approved');
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showToast('승인되었습니다.', 'success');
                    
                    // 다른 모듈에 알림
                    AdminManager.emit('application-status-changed', { 
                        requestId, 
                        status: 'approved', 
                        action: 'approve' 
                    });
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showToast(result.message || '승인 처리 중 오류가 발생했습니다.', 'error');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showToast('승인 처리 중 오류가 발생했습니다.', 'error');
                console.error('❌ 아이템 승인 오류:', error);
            }
        }
    },

    // 아이템 반려
    async rejectItem(requestId, buttonElement) {
        const reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
        
        if (reason && reason.trim()) {
            Utils.showLoading(buttonElement);
            
            try {
                console.log('❌ 아이템 반려 시작:', requestId, reason);
                const result = await SupabaseAPI.updateItemStatus(requestId, 'rejected', reason.trim());
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showToast('반려 처리되었습니다.', 'success');
                    
                    // 다른 모듈에 알림
                    AdminManager.emit('application-status-changed', { 
                        requestId, 
                        status: 'rejected', 
                        action: 'reject',
                        reason: reason.trim()
                    });
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showToast(result.message || '반려 처리 중 오류가 발생했습니다.', 'error');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showToast('반려 처리 중 오류가 발생했습니다.', 'error');
                console.error('❌ 아이템 반려 오류:', error);
            }
        }
    },

    /**
     * 구매 완료 처리 (v11.1.0 - 모달 기반으로 업그레이드)
     * @param {string} requestId - 신청 ID
     * @param {HTMLElement} buttonElement - 클릭된 버튼 요소
     */
    async markAsPurchased(requestId, buttonElement) {
        try {
            // AdminManager.Modals가 사용 가능한지 확인
            if (window.AdminManager && 
                window.AdminManager.Modals && 
                typeof window.AdminManager.Modals.showPurchaseCompleteModal === 'function') {

                // 새로운 모달 기반 구매 완료 처리
                window.AdminManager.Modals.showPurchaseCompleteModal(requestId, buttonElement);
                return;
            }

            // 폴백: 기존 방식으로 처리
            console.warn('AdminManager.Modals가 사용 불가능합니다. 기존 방식으로 처리합니다.');
            await this.markAsPurchasedLegacy(requestId, buttonElement);

        } catch (error) {
            console.error('구매 완료 처리 오류:', error);

            // 에러 발생시 기존 방식으로 폴백
            await this.markAsPurchasedLegacy(requestId, buttonElement);
        }
    },

    /**
     * 기존 방식의 구매 완료 처리 (폴백용)
     * @param {string} requestId - 신청 ID  
     * @param {HTMLElement} buttonElement - 클릭된 버튼 요소
     */
    async markAsPurchasedLegacy(requestId, buttonElement) {
        if (!confirm('이 신청을 구매 완료로 처리하시겠습니까?')) {
            return;
        }

        try {
            // 로딩 상태 설정
            const originalHTML = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i data-lucide="loader-2"></i> 처리 중...';

            // 상태 업데이트
            const { error } = await supabase
                .from('requests')
                .update({ 
                    status: 'purchased',
                    admin_purchase_date: new Date().toISOString().split('T')[0]
                })
                .eq('id', requestId);

            if (error) throw error;

            // 성공 메시지
            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('구매 완료 처리되었습니다.', 'success');
            }

            // UI 업데이트
            setTimeout(() => {
                if (typeof this.loadApplications === 'function') {
                    this.loadApplications();
                } else {
                    window.location.reload();
                }
            }, 1000);

        } catch (error) {
            console.error('구매 완료 처리 오류:', error);

            if (window.Utils && window.Utils.showToast) {
                Utils.showToast('구매 완료 처리에 실패했습니다.', 'error');
            }

            // 버튼 상태 복원
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalHTML;
        }
    },

    // 검색 처리
    handleSearch(searchTerm) {
        console.log('🔍 신청 검색:', searchTerm);
        this.currentSearchTerm = searchTerm.trim();
        this.loadApplications();
    },

    // 관련 데이터 새로고침
    async refreshData() {
        console.log('🔄 Applications 관련 데이터 새로고침');
        
        try {
            // 신청 목록 새로고침
            await this.loadApplications();
            
            // 통계 새로고침 (AdminManager.Core를 통해)
            if (AdminManager.loadStatistics) {
                await AdminManager.loadStatistics();
            }
            
            // 예산 정보 새로고침 (Budget 모듈을 통해)
            if (AdminManager.Budget && AdminManager.Budget.loadBudgetOverview) {
                await AdminManager.Budget.loadBudgetOverview();
            }
            
        } catch (error) {
            console.error('❌ Applications 데이터 새로고침 실패:', error);
        }
    },

    // 새로고침 함수 (다른 모듈에서 호출 가능)
    async refresh() {
        console.log('🔄 Applications 모듈 새로고침');
        await this.loadApplications();
        return true;
    },

    // 내보내기 관련 함수들
    async prepareExportData() {
        try {
            console.log('📤 내보내기 데이터 준비 중...');
            const exportData = await SupabaseAPI.prepareExportData();
            console.log('✅ 내보내기 데이터 준비 완료:', exportData.length, '건');
            return exportData;
        } catch (error) {
            console.error('❌ 내보내기 데이터 준비 실패:', error);
            throw error;
        }
    },

    // 필터링 기능
    applyFilters(filters) {
        console.log('🔧 필터 적용:', filters);
        // TODO: 향후 필터링 기능 구현 시 사용
        // 예: 상태별, 분야별, 기간별 필터링
    },

    // 벌크 작업 (여러 항목 동시 처리)
    async bulkAction(action, requestIds) {
        console.log('🔧 벌크 액션:', action, requestIds);
        
        if (!Array.isArray(requestIds) || requestIds.length === 0) {
            Utils.showToast('선택된 항목이 없습니다.', 'warning');
            return;
        }

        const message = `선택한 ${requestIds.length}개 항목을 ${action === 'approve' ? '승인' : '반려'}하시겠습니까?`;
        
        if (!Utils.showConfirm(message)) {
            return;
        }

        let reason = '';
        if (action === 'reject') {
            reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
            if (!reason || !reason.trim()) {
                return;
            }
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const requestId of requestIds) {
                try {
                    const result = await SupabaseAPI.updateItemStatus(
                        requestId, 
                        action === 'approve' ? 'approved' : 'rejected', 
                        reason
                    );
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`❌ 벌크 액션 개별 오류 (${requestId}):`, error);
                    errorCount++;
                }
            }

            // 결과 리포트
            let message = `${successCount}개 항목이 성공적으로 처리되었습니다.`;
            if (errorCount > 0) {
                message += `\n${errorCount}개 항목 처리 중 오류가 발생했습니다.`;
            }

            Utils.showToast(message, successCount > 0 ? 'success' : 'error');
            
            // 데이터 새로고침
            await this.refreshData();
            
            // 다른 모듈에 알림
            AdminManager.emit('bulk-application-action', { 
                action, 
                successCount, 
                errorCount, 
                total: requestIds.length 
            });

        } catch (error) {
            console.error('❌ 벌크 액션 실패:', error);
            Utils.showToast('벌크 작업 중 오류가 발생했습니다.', 'error');
        }
    },

    // 상태별 통계 계산
    calculateStatusStatistics(applications) {
        const stats = {
            total: applications.length,
            pending: 0,
            approved: 0,
            rejected: 0,
            purchased: 0
        };

        applications.forEach(app => {
            if (stats.hasOwnProperty(app.status)) {
                stats[app.status]++;
            }
        });

        return stats;
    },

    // 분야별 통계 계산
    calculateFieldStatistics(applications) {
        const fieldStats = {};

        applications.forEach(app => {
            const field = app.user_profiles?.field || '미설정';
            if (!fieldStats[field]) {
                fieldStats[field] = {
                    total: 0,
                    totalAmount: 0,
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    purchased: 0
                };
            }

            fieldStats[field].total++;
            fieldStats[field].totalAmount += app.price || 0;
            
            if (fieldStats[field].hasOwnProperty(app.status)) {
                fieldStats[field][app.status]++;
            }
        });

        return fieldStats;
    },

    // 실시간 업데이트 (웹소켓 연결 시 사용 예정)
    onRealTimeUpdate(data) {
        console.log('📡 실시간 업데이트 수신:', data);
        
        // 현재는 단순히 새로고침
        if (data.table === 'equipment_requests' || data.table === 'receipts') {
            this.loadApplications();
        }
    }
};

// 전역 접근을 위한 별명
window.AdminApplications = AdminManager.Applications;

console.log('📋 AdminManager.Applications 모듈 로드 완료');