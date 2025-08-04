// 💰 실비 지원 관리 시스템 - 통계 모듈 v1.0.0
// admin/reimbursement-management-statistics.js

/**
 * 실비 지원 관리 시스템의 통계 및 리포트 생성 담당 모듈
 * 실시간 통계 계산, 차트 생성, 리포트 기능
 */

// ReimbursementManagementSystem 클래스에 통계 메서드들 추가
if (window.reimbursementManagementSystem) {
    const system = window.reimbursementManagementSystem;

    /**
     * 상세 통계 정보 계산
     */
    system.calculateDetailedStatistics = function() {
        const stats = {
            // 기본 통계
            totalStudents: this.students.length,
            totalItems: 0,
            
            // 상태별 통계
            studentsWithAccount: 0,
            studentsWithoutAccount: 0,
            
            // 지급 상태별 통계
            notSetStudents: 0,      // 미설정
            pendingStudents: 0,     // 미처리 (금액 설정됨)
            completedStudents: 0,   // 지급완료
            
            // 카테고리별 통계
            transportItems: 0,      // 교통비
            equipmentItems: 0,      // 교구비
            visaItems: 0,          // 비자비
            
            // 금액 통계
            totalScheduledAmount: 0,  // 총 예정 금액
            totalActualAmount: 0,     // 총 실제 지급 금액
            averageAmount: 0,         // 평균 지급 금액
            
            // 차수별 통계
            round1Students: 0,
            round2Students: 0,
            round3Students: 0,
            
            // 기간별 통계
            thisMonthPayments: 0,
            lastMonthPayments: 0,
            pendingPayments: 0
        };

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        // 각 학생별 통계 계산
        this.students.forEach(student => {
            const items = this.reimbursementItems.get(student.id) || [];
            const reimbursement = this.reimbursementData.get(student.id);
            const paymentStatus = this.getStudentPaymentStatus(student.id);

            // 항목 개수 합산
            stats.totalItems += items.length;

            // 카테고리별 항목 개수
            items.forEach(item => {
                switch (item.category) {
                    case 'transport':
                        stats.transportItems++;
                        break;
                    case 'equipment':
                        stats.equipmentItems++;
                        break;
                    case 'visa':
                        stats.visaItems++;
                        break;
                }
            });

            // 계좌 정보 보유 여부
            if (reimbursement && reimbursement.bank_name) {
                stats.studentsWithAccount++;
            } else {
                stats.studentsWithoutAccount++;
            }

            // 지급 상태별 통계
            switch (paymentStatus) {
                case 'not_set':
                    stats.notSetStudents++;
                    break;
                case 'pending':
                    stats.pendingStudents++;
                    stats.pendingPayments++;
                    break;
                case 'completed':
                    stats.completedStudents++;
                    break;
            }

            // 금액 통계
            if (reimbursement) {
                if (reimbursement.scheduled_amount) {
                    stats.totalScheduledAmount += reimbursement.scheduled_amount;
                }
                
                if (reimbursement.actual_amount) {
                    stats.totalActualAmount += reimbursement.actual_amount;
                }

                // 차수별 통계
                switch (reimbursement.payment_round) {
                    case 1:
                        stats.round1Students++;
                        break;
                    case 2:
                        stats.round2Students++;
                        break;
                    case 3:
                        stats.round3Students++;
                        break;
                }

                // 기간별 지급 통계
                if (reimbursement.actual_date) {
                    const paymentDate = new Date(reimbursement.actual_date);
                    const paymentMonth = paymentDate.getMonth();
                    const paymentYear = paymentDate.getFullYear();

                    if (paymentYear === thisYear && paymentMonth === thisMonth) {
                        stats.thisMonthPayments++;
                    } else if (paymentYear === lastMonthYear && paymentMonth === lastMonth) {
                        stats.lastMonthPayments++;
                    }
                }
            }
        });

        // 평균 금액 계산
        if (stats.completedStudents > 0) {
            stats.averageAmount = stats.totalActualAmount / stats.completedStudents;
        }

        return stats;
    };

    /**
     * 카테고리별 분포 차트 데이터 생성
     */
    system.getCategoryDistributionData = function() {
        const stats = this.calculateDetailedStatistics();
        
        return [
            {
                category: '교통비',
                count: stats.transportItems,
                percentage: stats.totalItems > 0 ? (stats.transportItems / stats.totalItems * 100).toFixed(1) : 0,
                color: '#28a745'
            },
            {
                category: '교구비',
                count: stats.equipmentItems,
                percentage: stats.totalItems > 0 ? (stats.equipmentItems / stats.totalItems * 100).toFixed(1) : 0,
                color: '#ffc107'
            },
            {
                category: '비자비',
                count: stats.visaItems,
                percentage: stats.totalItems > 0 ? (stats.visaItems / stats.totalItems * 100).toFixed(1) : 0,
                color: '#17a2b8'
            }
        ];
    };

    /**
     * 지급 상태별 분포 차트 데이터 생성
     */
    system.getStatusDistributionData = function() {
        const stats = this.calculateDetailedStatistics();
        
        return [
            {
                status: '지급완료',
                count: stats.completedStudents,
                percentage: stats.totalStudents > 0 ? (stats.completedStudents / stats.totalStudents * 100).toFixed(1) : 0,
                color: '#28a745'
            },
            {
                status: '미처리',
                count: stats.pendingStudents,
                percentage: stats.totalStudents > 0 ? (stats.pendingStudents / stats.totalStudents * 100).toFixed(1) : 0,
                color: '#ffc107'
            },
            {
                status: '미설정',
                count: stats.notSetStudents,
                percentage: stats.totalStudents > 0 ? (stats.notSetStudents / stats.totalStudents * 100).toFixed(1) : 0,
                color: '#dc3545'
            }
        ];
    };

    /**
     * 차수별 분포 데이터 생성
     */
    system.getRoundDistributionData = function() {
        const stats = this.calculateDetailedStatistics();
        
        return [
            {
                round: '1차',
                count: stats.round1Students,
                percentage: stats.totalStudents > 0 ? (stats.round1Students / stats.totalStudents * 100).toFixed(1) : 0,
                color: '#007bff'
            },
            {
                round: '2차',
                count: stats.round2Students,
                percentage: stats.totalStudents > 0 ? (stats.round2Students / stats.totalStudents * 100).toFixed(1) : 0,
                color: '#6610f2'
            },
            {
                round: '3차',
                count: stats.round3Students,
                percentage: stats.totalStudents > 0 ? (stats.round3Students / stats.totalStudents * 100).toFixed(1) : 0,
                color: '#e83e8c'
            }
        ];
    };

    /**
     * 월별 지급 현황 데이터 생성
     */
    system.getMonthlyPaymentData = function() {
        const monthlyData = {};
        const now = new Date();
        
        // 최근 12개월 초기화
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = {
                month: date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
                count: 0,
                amount: 0
            };
        }

        // 실제 지급 데이터 집계
        this.reimbursementData.forEach(reimbursement => {
            if (reimbursement.actual_date && reimbursement.actual_amount) {
                const date = new Date(reimbursement.actual_date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (monthlyData[key]) {
                    monthlyData[key].count++;
                    monthlyData[key].amount += reimbursement.actual_amount;
                }
            }
        });

        return Object.values(monthlyData);
    };

    /**
     * 실비 처리 진행률 계산
     */
    system.getProcessingProgress = function() {
        const stats = this.calculateDetailedStatistics();
        
        const progress = {
            // 계좌 정보 입력률
            accountInfoRate: stats.totalStudents > 0 ? 
                (stats.studentsWithAccount / stats.totalStudents * 100).toFixed(1) : 0,
            
            // 금액 설정률
            amountSetRate: stats.totalStudents > 0 ? 
                ((stats.pendingStudents + stats.completedStudents) / stats.totalStudents * 100).toFixed(1) : 0,
            
            // 지급 완료율
            completionRate: stats.totalStudents > 0 ? 
                (stats.completedStudents / stats.totalStudents * 100).toFixed(1) : 0,
            
            // 전체 진행률 (가중 평균)
            overallProgress: 0
        };

        // 전체 진행률 계산 (각 단계별 가중치 적용)
        const accountWeight = 0.2;  // 계좌 정보 20%
        const amountWeight = 0.3;   // 금액 설정 30%
        const completionWeight = 0.5; // 지급 완료 50%

        progress.overallProgress = (
            parseFloat(progress.accountInfoRate) * accountWeight +
            parseFloat(progress.amountSetRate) * amountWeight +
            parseFloat(progress.completionRate) * completionWeight
        ).toFixed(1);

        return progress;
    };

    /**
     * 실비 처리 효율성 지표 계산
     */
    system.getEfficiencyMetrics = function() {
        const stats = this.calculateDetailedStatistics();
        const now = new Date();
        
        const metrics = {
            // 처리 속도 (건/일)
            dailyProcessingRate: 0,
            
            // 평균 처리 시간 (일)
            averageProcessingTime: 0,
            
            // 금액 정확도 (예정 vs 실제)
            amountAccuracy: 0,
            
            // 미처리 항목 비율
            pendingRate: stats.totalStudents > 0 ? 
                (stats.pendingStudents / stats.totalStudents * 100).toFixed(1) : 0
        };

        // 처리된 건수와 기간 계산
        let totalProcessingDays = 0;
        let processedCount = 0;
        let totalAmountDifference = 0;
        let accuracyCount = 0;

        this.reimbursementData.forEach(reimbursement => {
            if (reimbursement.payment_status === 'completed' && reimbursement.actual_date) {
                processedCount++;
                
                // 처리 시간 계산 (생성일 ~ 완료일)
                const createdDate = new Date(reimbursement.created_at);
                const completedDate = new Date(reimbursement.actual_date);
                const processingDays = Math.ceil((completedDate - createdDate) / (1000 * 60 * 60 * 24));
                totalProcessingDays += processingDays;
                
                // 금액 정확도 계산
                if (reimbursement.scheduled_amount && reimbursement.actual_amount) {
                    const difference = Math.abs(reimbursement.scheduled_amount - reimbursement.actual_amount);
                    const accuracy = 100 - (difference / reimbursement.scheduled_amount * 100);
                    totalAmountDifference += accuracy;
                    accuracyCount++;
                }
            }
        });

        // 평균값 계산
        if (processedCount > 0) {
            metrics.averageProcessingTime = (totalProcessingDays / processedCount).toFixed(1);
            
            // 최근 30일 기준 일일 처리율
            const recentlyProcessed = Array.from(this.reimbursementData.values()).filter(r => {
                if (!r.actual_date) return false;
                const completedDate = new Date(r.actual_date);
                const daysAgo = (now - completedDate) / (1000 * 60 * 60 * 24);
                return daysAgo <= 30;
            }).length;
            
            metrics.dailyProcessingRate = (recentlyProcessed / 30).toFixed(2);
        }

        if (accuracyCount > 0) {
            metrics.amountAccuracy = (totalAmountDifference / accuracyCount).toFixed(1);
        }

        return metrics;
    };

    /**
     * 실비 대상자별 상세 리포트 데이터 생성
     */
    system.generateStudentReportData = function() {
        return this.students.map(student => {
            const items = this.reimbursementItems.get(student.id) || [];
            const reimbursement = this.reimbursementData.get(student.id);
            const paymentStatus = this.getStudentPaymentStatus(student.id);
            const itemsSummary = this.getStudentItemsSummary(student.id);

            return {
                id: student.id,
                name: student.name,
                email: student.email,
                institute: student.sejong_institute || '-',
                
                // 실비 항목 정보
                totalItems: items.length,
                transportItems: itemsSummary.transport,
                equipmentItems: itemsSummary.equipment,
                visaItems: itemsSummary.visa,
                
                // 계좌 정보
                hasAccountInfo: !!(reimbursement && reimbursement.bank_name),
                bankName: reimbursement?.bank_name || '-',
                accountNumber: reimbursement?.account_number || '-',
                accountHolder: reimbursement?.account_holder_name || '-',
                
                // 금액 정보
                scheduledAmount: reimbursement?.scheduled_amount || 0,
                scheduledDate: reimbursement?.scheduled_date || null,
                actualAmount: reimbursement?.actual_amount || 0,
                actualDate: reimbursement?.actual_date || null,
                
                // 상태 정보
                paymentStatus,
                paymentStatusText: this.getPaymentStatusText(paymentStatus),
                paymentRound: reimbursement?.payment_round || 0,
                
                // 메모
                adminNotes: reimbursement?.admin_notes || '',
                
                // 처리 일정
                createdAt: reimbursement?.created_at || null,
                updatedAt: reimbursement?.updated_at || null
            };
        });
    };

    /**
     * CSV 형태의 리포트 데이터 생성
     */
    system.generateCSVReport = function() {
        const reportData = this.generateStudentReportData();
        
        const headers = [
            '학생명', '이메일', '학당', '총 항목수', '교통비', '교구비', '비자비',
            '계좌정보', '은행명', '계좌번호', '예금주',
            '예정금액', '예정일', '실제금액', '실제일',
            '지급상태', '지원차수', '관리자메모', '생성일', '수정일'
        ];

        const rows = reportData.map(student => [
            student.name,
            student.email,
            student.institute,
            student.totalItems,
            student.transportItems,
            student.equipmentItems,
            student.visaItems,
            student.hasAccountInfo ? 'Y' : 'N',
            student.bankName,
            student.accountNumber,
            student.accountHolder,
            student.scheduledAmount,
            student.scheduledDate || '',
            student.actualAmount,
            student.actualDate || '',
            student.paymentStatusText,
            student.paymentRound,
            student.adminNotes,
            student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '',
            student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : ''
        ]);

        return {
            headers,
            rows,
            filename: `실비지원현황_${new Date().toISOString().split('T')[0]}.csv`
        };
    };

    /**
     * 대시보드용 요약 통계 반환
     */
    system.getDashboardSummary = function() {
        const stats = this.calculateDetailedStatistics();
        const progress = this.getProcessingProgress();
        const efficiency = this.getEfficiencyMetrics();

        return {
            // 기본 현황
            totalStudents: stats.totalStudents,
            totalItems: stats.totalItems,
            completedPayments: stats.completedStudents,
            pendingAmount: stats.notSetStudents,

            // 진행률
            overallProgress: parseFloat(progress.overallProgress),
            completionRate: parseFloat(progress.completionRate),
            
            // 금액 정보
            totalScheduledAmount: stats.totalScheduledAmount,
            totalActualAmount: stats.totalActualAmount,
            averageAmount: Math.round(stats.averageAmount),
            
            // 효율성
            averageProcessingTime: parseFloat(efficiency.averageProcessingTime),
            amountAccuracy: parseFloat(efficiency.amountAccuracy),
            
            // 월별 비교
            thisMonthPayments: stats.thisMonthPayments,
            lastMonthPayments: stats.lastMonthPayments,
            
            // 업데이트 시간
            lastUpdated: new Date().toLocaleString()
        };
    };

    /**
     * Excel 다운로드용 데이터 생성
     */
    system.generateExcelData = function() {
        const reportData = this.generateStudentReportData();
        const stats = this.calculateDetailedStatistics();
        
        // 요약 시트 데이터
        const summaryData = [
            ['항목', '값'],
            ['총 학생 수', stats.totalStudents],
            ['총 실비 항목', stats.totalItems],
            ['지급 완료', stats.completedStudents],
            ['미처리', stats.pendingStudents],
            ['미설정', stats.notSetStudents],
            ['총 예정 금액', stats.totalScheduledAmount.toLocaleString() + '원'],
            ['총 실제 금액', stats.totalActualAmount.toLocaleString() + '원'],
            ['평균 지급 금액', Math.round(stats.averageAmount).toLocaleString() + '원']
        ];

        // 상세 데이터 시트
        const detailHeaders = [
            '학생명', '이메일', '학당', '총항목', '교통비', '교구비', '비자비',
            '계좌정보', '은행명', '계좌번호', '예금주',
            '예정금액', '예정일', '실제금액', '실제일',
            '상태', '차수', '메모', '생성일', '수정일'
        ];

        const detailRows = reportData.map(student => [
            student.name,
            student.email,
            student.institute,
            student.totalItems,
            student.transportItems,
            student.equipmentItems,
            student.visaItems,
            student.hasAccountInfo ? 'Y' : 'N',
            student.bankName,
            student.accountNumber,
            student.accountHolder,
            student.scheduledAmount,
            student.scheduledDate || '',
            student.actualAmount,
            student.actualDate || '',
            student.paymentStatusText,
            student.paymentRound,
            student.adminNotes,
            student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '',
            student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : ''
        ]);

        return {
            summary: {
                name: '요약',
                data: summaryData
            },
            detail: {
                name: '상세내역',
                headers: detailHeaders,
                data: detailRows
            },
            filename: `실비지원현황_${new Date().toISOString().split('T')[0]}.xlsx`
        };
    };

    /**
     * 통계 데이터 캐시 관리
     */
    system.statisticsCache = {
        data: null,
        timestamp: null,
        maxAge: 300000 // 5분
    };

    /**
     * 캐시된 통계 데이터 반환 (성능 최적화)
     */
    system.getCachedStatistics = function() {
        const now = Date.now();
        
        if (this.statisticsCache.data && 
            this.statisticsCache.timestamp && 
            (now - this.statisticsCache.timestamp) < this.statisticsCache.maxAge) {
            
            console.log('📊 캐시된 통계 데이터 사용');
            return this.statisticsCache.data;
        }

        // 새로운 통계 계산
        const stats = this.calculateDetailedStatistics();
        
        // 캐시 업데이트
        this.statisticsCache.data = stats;
        this.statisticsCache.timestamp = now;
        
        console.log('📊 새로운 통계 데이터 계산 및 캐시');
        return stats;
    };

    /**
     * 통계 캐시 초기화
     */
    system.clearStatisticsCache = function() {
        this.statisticsCache.data = null;
        this.statisticsCache.timestamp = null;
        console.log('🗑️ 통계 캐시 초기화');
    };

    console.log('📊 실비 관리 시스템 통계 모듈 로드 완료 (v1.0.0)');
}
