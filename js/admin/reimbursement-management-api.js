// 💰 실비 지원 관리 시스템 - API 모듈 v1.0.0
// admin/reimbursement-management-api.js

/**
 * 실비 지원 관리 시스템의 API 통신 담당 모듈
 * 데이터베이스 CRUD 작업 및 비즈니스 로직 처리
 */

// ReimbursementManagementSystem 클래스에 API 메서드들 추가
if (window.reimbursementManagementSystem) {
    const system = window.reimbursementManagementSystem;

    /**
     * 특정 사용자의 상세 실비 항목 조회
     */
    system.loadUserReimbursementItems = async function(userId) {
        try {
            const { data, error } = await this.supabaseClient
                .from('v_user_reimbursement_items')
                .select('*')
                .eq('user_id', userId)
                .order('display_order', { ascending: true });

            if (error) {
                throw new Error(`사용자 실비 항목 조회 실패: ${error.message}`);
            }

            return data || [];
            
        } catch (error) {
            console.error('❌ 사용자 실비 항목 조회 오류:', error);
            throw error;
        }
    };

    /**
     * 실비 지원 금액 설정 저장
     */
    system.saveReimbursementAmount = async function() {
        try {
            if (!this.currentUser) {
                throw new Error('선택된 사용자가 없습니다.');
            }

            // 폼 데이터 수집
            const scheduledAmount = parseFloat(document.getElementById('scheduledAmount')?.value);
            const scheduledDate = document.getElementById('scheduledDate')?.value;
            const paymentRound = parseInt(document.getElementById('paymentRound')?.value);
            const adminNotes = document.getElementById('adminNotes')?.value?.trim();

            // 데이터 검증
            if (!scheduledAmount || scheduledAmount <= 0) {
                throw new Error('유효한 실비 금액을 입력해주세요.');
            }

            if (!scheduledDate) {
                throw new Error('입금 예정일을 선택해주세요.');
            }

            if (!paymentRound) {
                throw new Error('지원 차수를 선택해주세요.');
            }

            console.log('💰 실비 금액 설정 저장:', {
                userId: this.currentUser.id,
                scheduledAmount,
                scheduledDate,
                paymentRound,
                adminNotes
            });

            // 데이터베이스 저장
            const { data, error } = await this.supabaseClient
                .from('user_reimbursements')
                .upsert({
                    user_id: this.currentUser.id,
                    scheduled_amount: scheduledAmount,
                    scheduled_date: scheduledDate,
                    payment_round: paymentRound,
                    admin_notes: adminNotes,
                    payment_status: 'pending',
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,payment_round'
                })
                .select()
                .single();

            if (error) {
                throw new Error(`실비 금액 저장 실패: ${error.message}`);
            }

            // 메모리 데이터 업데이트
            this.reimbursementData.set(this.currentUser.id, data);

            // UI 업데이트
            this.updateStatistics();
            this.renderStudentsTable();

            // 모달 닫기
            const modal = document.getElementById('amountSettingModal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }

            this.showToast('실비 지원 금액이 설정되었습니다.', 'success');
            console.log('✅ 실비 금액 설정 저장 완료');

        } catch (error) {
            console.error('❌ 실비 금액 저장 오류:', error);
            this.showToast(error.message, 'error');
        }
    };

    /**
     * 지급 완료 처리
     */
    system.completePayment = async function() {
        try {
            if (!this.currentUser) {
                throw new Error('선택된 사용자가 없습니다.');
            }

            // 폼 데이터 수집
            const actualAmount = parseFloat(document.getElementById('actualAmount')?.value);
            const actualDate = document.getElementById('actualDate')?.value;
            
            const reimbursement = this.reimbursementData.get(this.currentUser.id);
            if (!reimbursement) {
                throw new Error('실비 설정 정보를 찾을 수 없습니다.');
            }

            // 데이터 검증
            if (!actualAmount || actualAmount <= 0) {
                throw new Error('유효한 실제 입금 금액을 입력해주세요.');
            }

            if (!actualDate) {
                throw new Error('실제 입금일을 선택해주세요.');
            }

            console.log('✅ 지급 완료 처리 시작:', {
                userId: this.currentUser.id,
                actualAmount,
                actualDate,
                paymentRound: reimbursement.payment_round
            });

            // 1. user_reimbursements 테이블 업데이트 (실제 입금 정보)
            const { error: reimbursementError } = await this.supabaseClient
                .from('user_reimbursements')
                .update({
                    actual_amount: actualAmount,
                    actual_date: actualDate,
                    payment_status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.currentUser.id)
                .eq('payment_round', reimbursement.payment_round);

            if (reimbursementError) {
                throw new Error(`실비 정보 업데이트 실패: ${reimbursementError.message}`);
            }

            // 2. 해당 시점의 모든 영수증을 지급 완료 처리
            await this.markAllReceiptsAsCompleted(this.currentUser.id);

            // 3. 메모리 데이터 업데이트
            const updatedReimbursement = {
                ...reimbursement,
                actual_amount: actualAmount,
                actual_date: actualDate,
                payment_status: 'completed',
                updated_at: new Date().toISOString()
            };
            this.reimbursementData.set(this.currentUser.id, updatedReimbursement);

            // 4. UI 업데이트
            this.updateStatistics();
            this.renderStudentsTable();

            // 5. 모달 닫기
            const modal = document.getElementById('paymentCompleteModal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }

            this.showToast(`${this.currentUser.name}님의 실비 지급이 완료되었습니다.`, 'success');
            console.log('✅ 지급 완료 처리 성공');

        } catch (error) {
            console.error('❌ 지급 완료 처리 오류:', error);
            this.showToast(error.message, 'error');
        }
    };

    /**
     * 모든 영수증을 지급 완료 상태로 변경
     */
    system.markAllReceiptsAsCompleted = async function(userId) {
        const promises = [];

        // 항공권 실비 완료
        promises.push(
            this.supabaseClient
                .from('flight_requests')
                .update({ 
                    flight_reimbursement_completed: true,
                    baggage_reimbursement_completed: true 
                })
                .eq('user_id', userId)
                .eq('flight_reimbursement_completed', false)
        );

        // 교구 실비 완료 (receipts 테이블)
        promises.push(
            this.supabaseClient
                .from('receipts')
                .update({ reimbursement_completed: true })
                .eq('user_id', userId)
                .eq('reimbursement_completed', false)
        );

        // 비자 실비 완료
        promises.push(
            this.supabaseClient
                .from('visa_receipts')
                .update({ reimbursement_completed: true })
                .eq('user_id', userId)
                .eq('reimbursement_completed', false)
        );

        const results = await Promise.allSettled(promises);
        
        // 오류 체크
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.warn(`영수증 완료 처리 부분 실패 (${index}):`, result.reason);
            }
        });

        console.log('✅ 모든 영수증 완료 상태 업데이트 완료');
    };

    /**
     * 사용자의 계좌 정보 조회
     */
    system.getUserAccountInfo = async function(userId) {
        try {
            const { data, error } = await this.supabaseClient
                .from('user_reimbursements')
                .select('bank_name, account_number, account_holder_name')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                throw new Error(`계좌 정보 조회 실패: ${error.message}`);
            }

            return data;

        } catch (error) {
            console.error('❌ 계좌 정보 조회 오류:', error);
            return null;
        }
    };

    /**
     * 통합 실비 현황 통계 조회 (저장 프로시저 활용)
     */
    system.getReimbursementSummaryStats = async function() {
        try {
            // 기본 통계 계산
            const stats = {
                totalStudents: this.students.length,
                totalItems: 0,
                pendingAmount: 0,
                completedPayments: 0
            };

            // 각 학생의 항목 개수 합산
            for (const student of this.students) {
                const items = this.reimbursementItems.get(student.id) || [];
                stats.totalItems += items.length;

                const reimbursement = this.reimbursementData.get(student.id);
                const status = this.getStudentPaymentStatus(student.id);

                if (status === 'not_set') {
                    stats.pendingAmount++;
                } else if (status === 'completed') {
                    stats.completedPayments++;
                }
            }

            return stats;

        } catch (error) {
            console.error('❌ 통계 계산 오류:', error);
            return {
                totalStudents: 0,
                totalItems: 0,
                pendingAmount: 0,
                completedPayments: 0
            };
        }
    };

    /**
     * 영수증 파일 다운로드
     */
    system.downloadReceiptFile = async function(receiptUrl, fileName) {
        try {
            if (!receiptUrl) {
                throw new Error('영수증 URL이 없습니다.');
            }

            // 파일 다운로드 링크 생성
            const link = document.createElement('a');
            link.href = receiptUrl;
            link.download = fileName || '영수증.jpg';
            link.target = '_blank';
            
            // 임시로 DOM에 추가하고 클릭
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('📥 영수증 다운로드:', fileName);

        } catch (error) {
            console.error('❌ 영수증 다운로드 오류:', error);
            this.showToast('영수증 다운로드에 실패했습니다.', 'error');
        }
    };

    /**
     * 실비 항목 상세 정보 포맷팅
     */
    system.formatReimbursementItem = function(item) {
        const formatted = {
            id: item.item_id,
            title: item.item_title,
            type: item.item_type,
            category: item.category,
            receiptUrl: item.receipt_file_url,
            hasReceipt: item.has_receipt,
            date: item.item_date ? new Date(item.item_date).toLocaleDateString() : '-',
            amount: item.total_amount ? `${item.total_amount.toLocaleString()}원` : null,
            additionalInfo: item.additional_info,
            sourceTable: item.source_table,
            purchaseStore: item.purchase_store
        };

        return formatted;
    };

    /**
     * 지급 상태 텍스트 반환
     */
    system.getPaymentStatusText = function(status) {
        switch (status) {
            case 'pending': return '미처리';
            case 'completed': return '지급완료';
            case 'not_set': return '미설정';
            default: return '알 수 없음';
        }
    };

    /**
     * 카테고리별 배지 클래스 반환
     */
    system.getCategoryBadgeClass = function(category) {
        switch (category) {
            case 'transport': return 'transport';
            case 'equipment': return 'equipment';
            case 'visa': return 'visa';
            default: return 'transport';
        }
    };

    /**
     * 카테고리별 표시 텍스트 반환
     */
    system.getCategoryDisplayText = function(category) {
        switch (category) {
            case 'transport': return '교통';
            case 'equipment': return '교구';
            case 'visa': return '비자';
            default: return '기타';
        }
    };

    /**
     * 데이터 유효성 검증
     */
    system.validateReimbursementData = function(data) {
        const errors = [];

        if (!data.userId) {
            errors.push('사용자 ID가 없습니다.');
        }

        if (!data.scheduledAmount || data.scheduledAmount <= 0) {
            errors.push('유효한 금액을 입력해주세요.');
        }

        if (!data.scheduledDate) {
            errors.push('예정일을 선택해주세요.');
        }

        if (!data.paymentRound || data.paymentRound < 1) {
            errors.push('유효한 지원 차수를 선택해주세요.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    /**
     * 실비 처리 내역 로그 기록
     */
    system.logReimbursementAction = async function(action, userId, data = {}) {
        try {
            const logEntry = {
                action,
                userId,
                data: JSON.stringify(data),
                timestamp: new Date().toISOString(),
                adminUser: 'admin' // 실제로는 현재 관리자 정보
            };

            console.log('📝 실비 처리 로그:', logEntry);
            
            // 실제 운영시에는 로그 테이블에 저장
            // await this.supabaseClient.from('reimbursement_logs').insert(logEntry);

        } catch (error) {
            console.warn('⚠️ 로그 기록 실패:', error);
        }
    };

    console.log('💰 실비 관리 시스템 API 모듈 로드 완료 (v1.0.0)');
}
