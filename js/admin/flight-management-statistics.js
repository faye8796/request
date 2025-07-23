/**
 * 항공권 관리 통계 시스템 v10.0.0 - Phase 2 핵심 모듈
 * 실시간 통계 계산, 대시보드 데이터 처리, 예산 현황 관리
 * 
 * 📊 주요 기능:
 * - 실시간 통계 계산 및 업데이트
 * - 대시보드 데이터 처리 및 시각화
 * - 예산 현황 계산 및 분석
 * - 월별/일별 트렌드 분석
 * - 수치 포맷팅 및 통화 변환
 * - 성능 최적화된 데이터 집계
 * - 캐시 기반 고속 계산
 * 
 * @version 10.0.0
 * @author 세종학당 개발팀
 * @created 2025-07-23
 */

class FlightManagementStatistics {
    constructor(flightManagementSystem) {
        console.log('📊 FlightManagementStatistics v10.0.0 초기화 시작...');
        
        this.system = flightManagementSystem;
        this.isInitialized = false;

        // 📈 통계 데이터 캐시
        this.statisticsCache = {
            basic: null,
            advanced: null,
            budget: null,
            trends: null,
            lastUpdate: null,
            cacheTimeout: 300000 // 5분
        };

        // 📊 실시간 업데이트 설정
        this.updateConfig = {
            enableRealTime: true,
            updateInterval: 30000, // 30초
            animationDuration: 500,
            countUpDuration: 800
        };

        // 🎯 DOM 요소 참조
        this.domElements = {
            // 기본 통계 카드
            statTotal: null,
            statPending: null,
            statApproved: null,
            statCompleted: null,
            statDirect: null,
            statAgency: null,
            
            // 예산 현황
            totalCompletedAmount: null,
            totalApprovedAmount: null,
            averagePerPerson: null,
            thisMonthRequests: null
        };

        // 📈 애니메이션 관리
        this.animations = {
            activeAnimations: new Map(),
            pendingUpdates: new Set()
        };

        // 🔢 포맷터 설정
        this.formatters = {
            currency: new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                minimumFractionDigits: 0
            }),
            number: new Intl.NumberFormat('ko-KR'),
            decimal: new Intl.NumberFormat('ko-KR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }),
            percent: new Intl.NumberFormat('ko-KR', {
                style: 'percent',
                minimumFractionDigits: 1
            })
        };

        this.init();
    }

    /**
     * 🚀 통계 시스템 초기화
     */
    async init() {
        try {
            console.log('🚀 FlightManagementStatistics 초기화 중...');

            // DOM 요소 참조 설정
            this.setupDOMReferences();

            // 시스템 이벤트 구독
            this.subscribeToSystemEvents();

            // 실시간 업데이트 시작
            this.startRealTimeUpdates();

            this.isInitialized = true;
            console.log('✅ FlightManagementStatistics 초기화 완료');

        } catch (error) {
            console.error('❌ FlightManagementStatistics 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 🔗 DOM 요소 참조 설정
     */
    setupDOMReferences() {
        console.log('🔗 DOM 요소 참조 설정 중...');

        // 기본 통계 요소들
        this.domElements.statTotal = document.getElementById('stat-total');
        this.domElements.statPending = document.getElementById('stat-pending');
        this.domElements.statApproved = document.getElementById('stat-approved');
        this.domElements.statCompleted = document.getElementById('stat-completed');
        this.domElements.statDirect = document.getElementById('stat-direct');
        this.domElements.statAgency = document.getElementById('stat-agency');

        // 예산 현황 요소들
        this.domElements.totalCompletedAmount = document.getElementById('totalCompletedAmount');
        this.domElements.totalApprovedAmount = document.getElementById('totalApprovedAmount');
        this.domElements.averagePerPerson = document.getElementById('averagePerPerson');
        this.domElements.thisMonthRequests = document.getElementById('thisMonthRequests');

        // 누락된 요소 확인
        const missingElements = Object.entries(this.domElements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.warn('⚠️ 일부 DOM 요소를 찾을 수 없음:', missingElements);
        }

        console.log('✅ DOM 요소 참조 설정 완료');
    }

    /**
     * 📡 시스템 이벤트 구독
     */
    subscribeToSystemEvents() {
        if (!this.system) return;

        console.log('📡 시스템 이벤트 구독 중...');

        // 데이터 업데이트 이벤트
        this.system.on('data:initialLoaded', (data) => {
            this.handleInitialDataLoad(data);
        });

        this.system.on('data:refreshed', (data) => {
            this.handleDataRefresh(data);
        });

        this.system.on('data:statisticsUpdated', (data) => {
            this.handleStatisticsUpdate(data);
        });

        // 액션 완료 이벤트
        this.system.on('action:requestStatusChanged', (data) => {
            this.handleStatusChange(data);
        });

        console.log('✅ 시스템 이벤트 구독 완료');
    }

    /**
     * ⏰ 실시간 업데이트 시작
     */
    startRealTimeUpdates() {
        if (!this.updateConfig.enableRealTime) return;

        console.log('⏰ 실시간 통계 업데이트 시작');

        this.updateTimer = setInterval(async () => {
            try {
                await this.refreshStatistics();
            } catch (error) {
                console.error('⚠️ 실시간 통계 업데이트 오류:', error);
            }
        }, this.updateConfig.updateInterval);
    }

    /**
     * 🛑 실시간 업데이트 중지
     */
    stopRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            console.log('🛑 실시간 통계 업데이트 중지');
        }
    }

    /**
     * 📊 초기 데이터 로드 처리
     */
    async handleInitialDataLoad(data) {
        console.log('📊 초기 데이터 로드 - 통계 계산 시작');

        try {
            // 기본 통계 계산
            const basicStats = await this.calculateBasicStatistics(data.requests);
            
            // 고급 통계 계산
            const advancedStats = await this.calculateAdvancedStatistics(data.requests);

            // 예산 현황 계산
            const budgetStats = await this.calculateBudgetStatistics(data.requests);

            // 캐시 업데이트
            this.updateCache({
                basic: basicStats,
                advanced: advancedStats,
                budget: budgetStats
            });

            // UI 업데이트
            await this.updateAllStatisticsUI();

            console.log('✅ 초기 통계 계산 및 UI 업데이트 완료');

        } catch (error) {
            console.error('❌ 초기 데이터 로드 처리 실패:', error);
        }
    }

    /**
     * 🔄 데이터 새로고침 처리
     */
    async handleDataRefresh(data) {
        if (!data.hasChanges) return;

        console.log('🔄 데이터 변경 감지 - 통계 업데이트');

        try {
            await this.refreshStatistics(data.requests);
        } catch (error) {
            console.error('❌ 데이터 새로고침 처리 실패:', error);
        }
    }

    /**
     * 📈 통계 업데이트 처리
     */
    async handleStatisticsUpdate(data) {
        console.log('📈 통계 업데이트 이벤트 수신');

        if (data.statistics) {
            this.statisticsCache.basic = data.statistics;
            await this.updateBasicStatisticsUI(data.statistics);
        }
    }

    /**
     * 🔄 상태 변경 처리
     */
    async handleStatusChange(data) {
        console.log('🔄 상태 변경 감지 - 통계 재계산', data);

        // 상태 변경은 즉시 통계에 영향을 주므로 빠른 업데이트 수행
        setTimeout(async () => {
            await this.refreshStatistics();
        }, 1000);
    }

    /**
     * 📊 기본 통계 계산
     */
    async calculateBasicStatistics(requests) {
        console.log('📊 기본 통계 계산 중...');

        const stats = {
            total: requests.length,
            pending: 0,
            approved: 0,
            rejected: 0,
            completed: 0,
            direct: 0,
            agency: 0
        };

        // 상태별 집계
        requests.forEach(request => {
            // 상태별 카운트
            if (request.status === 'pending') stats.pending++;
            else if (request.status === 'approved') stats.approved++;
            else if (request.status === 'rejected') stats.rejected++;
            else if (request.status === 'completed') stats.completed++;

            // 구매 타입별 카운트
            if (request.purchase_type === 'direct') stats.direct++;
            else if (request.purchase_type === 'agency') stats.agency++;
        });

        console.log('✅ 기본 통계 계산 완료:', stats);
        return stats;
    }

    /**
     * 📈 고급 통계 계산
     */
    async calculateAdvancedStatistics(requests) {
        console.log('📈 고급 통계 계산 중...');

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const advancedStats = {
            // 시간별 분석
            thisWeekRequests: 0,
            thisMonthRequests: 0,
            urgentRequests: 0,
            
            // 처리 효율성
            averageProcessingDays: 0,
            pendingOldestDays: 0,
            
            // 지역별 분석
            domesticFlights: 0,
            internationalFlights: 0,
            
            // 가격 분석
            priceRangeDistribution: {
                under500k: 0,
                range500k1m: 0,
                range1m1_5m: 0,
                over1_5m: 0
            }
        };

        requests.forEach(request => {
            const createdAt = new Date(request.created_at);
            const departureDate = request.departure_date ? new Date(request.departure_date) : null;

            // 시간별 분석
            if (createdAt >= oneWeekAgo) {
                advancedStats.thisWeekRequests++;
            }
            if (createdAt >= oneMonthAgo) {
                advancedStats.thisMonthRequests++;
            }

            // 출국 임박 신청
            if (departureDate && departureDate <= twoWeeksFromNow && 
                ['pending', 'approved'].includes(request.status)) {
                advancedStats.urgentRequests++;
            }

            // 지역별 분석 (간단한 국내/국제 구분)
            if (request.departure_airport && request.arrival_airport) {
                const isDomestic = this.isDomesticFlight(request.departure_airport, request.arrival_airport);
                if (isDomestic) {
                    advancedStats.domesticFlights++;
                } else {
                    advancedStats.internationalFlights++;
                }
            }

            // 가격 분석
            if (request.ticket_price) {
                const priceKRW = this.convertToKRW(request.ticket_price, request.currency);
                if (priceKRW < 500000) {
                    advancedStats.priceRangeDistribution.under500k++;
                } else if (priceKRW < 1000000) {
                    advancedStats.priceRangeDistribution.range500k1m++;
                } else if (priceKRW < 1500000) {
                    advancedStats.priceRangeDistribution.range1m1_5m++;
                } else {
                    advancedStats.priceRangeDistribution.over1_5m++;
                }
            }
        });

        // 평균 처리 시간 계산
        const processedRequests = requests.filter(r => 
            ['approved', 'rejected', 'completed'].includes(r.status) && r.updated_at
        );

        if (processedRequests.length > 0) {
            const totalProcessingDays = processedRequests.reduce((sum, req) => {
                const created = new Date(req.created_at);
                const updated = new Date(req.updated_at);
                const days = Math.ceil((updated - created) / (24 * 60 * 60 * 1000));
                return sum + days;
            }, 0);

            advancedStats.averageProcessingDays = Math.round(totalProcessingDays / processedRequests.length);
        }

        // 가장 오래된 대기 중인 신청
        const pendingRequests = requests.filter(r => r.status === 'pending');
        if (pendingRequests.length > 0) {
            const oldestPending = pendingRequests.reduce((oldest, req) => {
                const reqDate = new Date(req.created_at);
                const oldestDate = new Date(oldest.created_at);
                return reqDate < oldestDate ? req : oldest;
            });
            
            const oldestDate = new Date(oldestPending.created_at);
            advancedStats.pendingOldestDays = Math.ceil((now - oldestDate) / (24 * 60 * 60 * 1000));
        }

        console.log('✅ 고급 통계 계산 완료:', advancedStats);
        return advancedStats;
    }

    /**
     * 💰 예산 통계 계산
     */
    async calculateBudgetStatistics(requests) {
        console.log('💰 예산 통계 계산 중...');

        const budgetStats = {
            // 완료된 구매 총액 (실제 지출)
            totalCompletedAmount: 0,
            completedCount: 0,
            
            // 승인된 신청 예상 총액
            totalApprovedAmount: 0,
            approvedCount: 0,
            
            // 평균 금액들
            averagePerPerson: 0,
            averageTicketPrice: 0,
            
            // 구매 타입별 금액
            agencyTotalAmount: 0,
            directTotalAmount: 0,
            
            // 월별 예산 분석
            monthlyCompletion: {},
            monthlyApproval: {},
            
            // 예산 효율성
            budgetUtilization: 0,
            savings: 0 // 학생 제출 가격 vs 최종 가격 차이
        };

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        requests.forEach(request => {
            const createdMonth = request.created_at ? 
                `${new Date(request.created_at).getFullYear()}-${String(new Date(request.created_at).getMonth() + 1).padStart(2, '0')}` : 
                null;

            // 완료된 구매 집계 (admin_final_amount 기준)
            if (request.status === 'completed' && request.admin_final_amount) {
                const amountKRW = this.convertToKRW(request.admin_final_amount, request.admin_final_currency);
                budgetStats.totalCompletedAmount += amountKRW;
                budgetStats.completedCount++;

                // 구매 타입별 집계
                if (request.purchase_type === 'agency') {
                    budgetStats.agencyTotalAmount += amountKRW;
                } else {
                    budgetStats.directTotalAmount += amountKRW;
                }

                // 월별 완료 집계
                if (createdMonth) {
                    budgetStats.monthlyCompletion[createdMonth] = 
                        (budgetStats.monthlyCompletion[createdMonth] || 0) + amountKRW;
                }

                // 절약 계산 (학생 제출 가격 vs 최종 가격)
                if (request.ticket_price) {
                    const studentPriceKRW = this.convertToKRW(request.ticket_price, request.currency);
                    const saving = studentPriceKRW - amountKRW;
                    budgetStats.savings += saving;
                }
            }

            // 승인된 신청 집계 (ticket_price 기준)
            if (request.status === 'approved' && request.ticket_price) {
                const amountKRW = this.convertToKRW(request.ticket_price, request.currency);
                budgetStats.totalApprovedAmount += amountKRW;
                budgetStats.approvedCount++;

                // 월별 승인 집계
                if (createdMonth) {
                    budgetStats.monthlyApproval[createdMonth] = 
                        (budgetStats.monthlyApproval[createdMonth] || 0) + amountKRW;
                }
            }

            // 전체 평균 계산을 위한 가격 집계
            if (request.ticket_price) {
                const amountKRW = this.convertToKRW(request.ticket_price, request.currency);
                budgetStats.averageTicketPrice += amountKRW;
            }
        });

        // 평균값 계산
        if (budgetStats.completedCount > 0) {
            budgetStats.averagePerPerson = Math.round(budgetStats.totalCompletedAmount / budgetStats.completedCount);
        }

        if (requests.length > 0) {
            budgetStats.averageTicketPrice = Math.round(budgetStats.averageTicketPrice / requests.length);
        }

        // 예산 활용률 계산 (임의의 예산 한도 대비)
        const assumedBudgetLimit = 100000000; // 1억원 가정
        budgetStats.budgetUtilization = budgetStats.totalCompletedAmount / assumedBudgetLimit;

        // 이번 달 통계 추가
        budgetStats.thisMonthCompleted = budgetStats.monthlyCompletion[currentMonth] || 0;
        budgetStats.thisMonthApproved = budgetStats.monthlyApproval[currentMonth] || 0;

        console.log('✅ 예산 통계 계산 완료:', budgetStats);
        return budgetStats;
    }

    /**
     * 🔄 통계 새로고침
     */
    async refreshStatistics(requestsData = null) {
        try {
            const requests = requestsData || this.system.state.requestsData;
            if (!requests) return;

            // 캐시 유효성 확인
            if (this.isCacheValid()) {
                console.log('📋 캐시된 통계 사용');
                return;
            }

            console.log('🔄 통계 새로고침 시작');

            // 병렬로 모든 통계 계산
            const [basicStats, advancedStats, budgetStats] = await Promise.all([
                this.calculateBasicStatistics(requests),
                this.calculateAdvancedStatistics(requests),
                this.calculateBudgetStatistics(requests)
            ]);

            // 캐시 업데이트
            this.updateCache({
                basic: basicStats,
                advanced: advancedStats,
                budget: budgetStats
            });

            // UI 업데이트
            await this.updateAllStatisticsUI();

            console.log('✅ 통계 새로고침 완료');

        } catch (error) {
            console.error('❌ 통계 새로고침 실패:', error);
            throw error;
        }
    }

    /**
     * 🎨 모든 통계 UI 업데이트
     */
    async updateAllStatisticsUI() {
        try {
            // 병렬로 모든 UI 업데이트
            await Promise.all([
                this.updateBasicStatisticsUI(),
                this.updateBudgetStatisticsUI()
            ]);

            // 실시간 업데이트 알림
            if (window.FlightManagementPageUtils?.showRealTimeUpdate) {
                window.FlightManagementPageUtils.showRealTimeUpdate('통계 업데이트됨');
            }

        } catch (error) {
            console.error('❌ 통계 UI 업데이트 실패:', error);
        }
    }

    /**
     * 📊 기본 통계 UI 업데이트
     */
    async updateBasicStatisticsUI(stats = null) {
        const basicStats = stats || this.statisticsCache.basic;
        if (!basicStats) return;

        console.log('📊 기본 통계 UI 업데이트 중...');

        // 애니메이션으로 숫자 업데이트
        const updates = [
            { element: this.domElements.statTotal, value: basicStats.total },
            { element: this.domElements.statPending, value: basicStats.pending },
            { element: this.domElements.statApproved, value: basicStats.approved },
            { element: this.domElements.statCompleted, value: basicStats.completed },
            { element: this.domElements.statDirect, value: basicStats.direct },
            { element: this.domElements.statAgency, value: basicStats.agency }
        ];

        // 병렬로 애니메이션 실행
        await Promise.all(
            updates
                .filter(update => update.element)
                .map(update => this.animateNumberUpdate(update.element, update.value))
        );

        console.log('✅ 기본 통계 UI 업데이트 완료');
    }

    /**
     * 💰 예산 통계 UI 업데이트
     */
    async updateBudgetStatisticsUI() {
        const budgetStats = this.statisticsCache.budget;
        const advancedStats = this.statisticsCache.advanced;
        
        if (!budgetStats) return;

        console.log('💰 예산 통계 UI 업데이트 중...');

        // 예산 관련 UI 업데이트
        const budgetUpdates = [
            {
                element: this.domElements.totalCompletedAmount,
                value: this.formatCurrency(budgetStats.totalCompletedAmount),
                isText: true
            },
            {
                element: this.domElements.totalApprovedAmount,
                value: this.formatCurrency(budgetStats.totalApprovedAmount),
                isText: true
            },
            {
                element: this.domElements.averagePerPerson,
                value: this.formatCurrency(budgetStats.averagePerPerson),
                isText: true
            },
            {
                element: this.domElements.thisMonthRequests,
                value: advancedStats ? `${advancedStats.thisMonthRequests}건` : '0건',
                isText: true
            }
        ];

        // 텍스트 업데이트 (애니메이션 없이)
        budgetUpdates
            .filter(update => update.element && update.isText)
            .forEach(update => {
                this.animateTextUpdate(update.element, update.value);
            });

        console.log('✅ 예산 통계 UI 업데이트 완료');
    }

    /**
     * 🔢 숫자 애니메이션 업데이트
     */
    async animateNumberUpdate(element, targetValue) {
        if (!element) return;

        const elementId = element.id || element.className;
        
        // 기존 애니메이션 취소
        if (this.animations.activeAnimations.has(elementId)) {
            clearInterval(this.animations.activeAnimations.get(elementId));
        }

        const currentValue = parseInt(element.textContent) || 0;
        const difference = targetValue - currentValue;
        
        // 값이 같으면 애니메이션 안함
        if (difference === 0) return;

        const duration = this.updateConfig.countUpDuration;
        const steps = 30;
        const stepValue = difference / steps;
        const stepDuration = duration / steps;

        return new Promise((resolve) => {
            let currentStep = 0;
            
            const animationId = setInterval(() => {
                currentStep++;
                
                if (currentStep >= steps) {
                    element.textContent = targetValue;
                    this.animations.activeAnimations.delete(elementId);
                    clearInterval(animationId);
                    resolve();
                } else {
                    const newValue = Math.round(currentValue + (stepValue * currentStep));
                    element.textContent = newValue;
                }
            }, stepDuration);

            this.animations.activeAnimations.set(elementId, animationId);
        });
    }

    /**
     * 📝 텍스트 애니메이션 업데이트
     */
    animateTextUpdate(element, newText) {
        if (!element || element.textContent === newText) return;

        // 페이드 아웃
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0.5';

        setTimeout(() => {
            element.textContent = newText;
            element.style.opacity = '1';
        }, 200);
    }

    /**
     * 💱 통화 변환 (KRW 기준)
     */
    convertToKRW(amount, currency = 'KRW') {
        if (!amount) return 0;
        if (currency === 'KRW') return amount;

        // 간단한 환율 (실제 운영시에는 실시간 환율 API 사용 권장)
        const exchangeRates = {
            'USD': 1300,
            'EUR': 1400,
            'JPY': 8.5,
            'CNY': 180,
            'THB': 35,
            'VND': 0.05,
            'MYR': 280,
            'SGD': 960,
            'PHP': 23
        };

        const rate = exchangeRates[currency] || 1;
        return Math.round(amount * rate);
    }

    /**
     * 🌏 국내선 판별 (간단한 로직)
     */
    isDomesticFlight(departureAirport, arrivalAirport) {
        const koreanAirports = [
            'ICN', 'GMP', 'PUS', 'CJU', 'TAE', 'KWJ', 'USN', 
            'KPX', 'RSU', 'HIN', 'KUV', 'YNY', 'WJU'
        ];

        const isDepartureKorean = koreanAirports.some(code => 
            departureAirport.toUpperCase().includes(code)
        );
        const isArrivalKorean = koreanAirports.some(code => 
            arrivalAirport.toUpperCase().includes(code)
        );

        return isDepartureKorean && isArrivalKorean;
    }

    /**
     * 💰 통화 포맷팅
     */
    formatCurrency(amount) {
        if (!amount || amount === 0) return '0원';
        return this.formatters.currency.format(amount).replace('₩', '') + '원';
    }

    /**
     * 🔢 숫자 포맷팅
     */
    formatNumber(number) {
        if (!number) return '0';
        return this.formatters.number.format(number);
    }

    /**
     * 📊 퍼센트 포맷팅
     */
    formatPercent(decimal) {
        if (!decimal) return '0%';
        return this.formatters.percent.format(decimal);
    }

    /**
     * 📋 캐시 관리
     */
    updateCache(newData) {
        this.statisticsCache = {
            ...this.statisticsCache,
            ...newData,
            lastUpdate: new Date()
        };
    }

    isCacheValid() {
        if (!this.statisticsCache.lastUpdate) return false;
        
        const now = new Date();
        const timeDiff = now - this.statisticsCache.lastUpdate;
        
        return timeDiff < this.statisticsCache.cacheTimeout;
    }

    clearCache() {
        this.statisticsCache = {
            basic: null,
            advanced: null,
            budget: null,
            trends: null,
            lastUpdate: null,
            cacheTimeout: this.statisticsCache.cacheTimeout
        };
    }

    /**
     * 📈 트렌드 분석 (확장 기능)
     */
    async calculateTrendAnalysis(requests) {
        console.log('📈 트렌드 분석 계산 중...');

        const now = new Date();
        const trends = {
            daily: {},
            weekly: {},
            monthly: {},
            statusProgression: {},
            priceMovement: {}
        };

        // 일별 신청 트렌드 (최근 30일)
        for (let i = 0; i < 30; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = date.toISOString().split('T')[0];
            trends.daily[dateKey] = 0;
        }

        // 월별 신청 트렌드 (최근 12개월)
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            trends.monthly[monthKey] = 0;
        }

        // 데이터 집계
        requests.forEach(request => {
            const createdAt = new Date(request.created_at);
            
            // 일별 집계
            const dateKey = createdAt.toISOString().split('T')[0];
            if (trends.daily.hasOwnProperty(dateKey)) {
                trends.daily[dateKey]++;
            }

            // 월별 집계
            const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
            if (trends.monthly.hasOwnProperty(monthKey)) {
                trends.monthly[monthKey]++;
            }
        });

        this.statisticsCache.trends = trends;
        console.log('✅ 트렌드 분석 완료');
        
        return trends;
    }

    /**
     * 📊 고급 분석 리포트 생성
     */
    generateAnalyticsReport() {
        const basic = this.statisticsCache.basic;
        const advanced = this.statisticsCache.advanced;
        const budget = this.statisticsCache.budget;

        if (!basic || !advanced || !budget) {
            console.warn('⚠️ 충분한 통계 데이터가 없어 리포트 생성 불가');
            return null;
        }

        const report = {
            summary: {
                totalRequests: basic.total,
                completionRate: basic.total > 0 ? (basic.completed / basic.total) : 0,
                averageProcessingDays: advanced.averageProcessingDays,
                totalBudgetUsed: budget.totalCompletedAmount,
                averageCostPerStudent: budget.averagePerPerson
            },
            insights: [],
            recommendations: []
        };

        // 인사이트 생성
        if (basic.pending > basic.total * 0.3) {
            report.insights.push('대기 중인 신청이 30% 이상입니다. 처리 속도 개선이 필요합니다.');
        }

        if (advanced.urgentRequests > 0) {
            report.insights.push(`출국 임박 신청이 ${advanced.urgentRequests}건 있습니다. 우선 처리가 필요합니다.`);
        }

        if (budget.savings > 0) {
            report.insights.push(`효율적인 구매로 총 ${this.formatCurrency(budget.savings)}을 절약했습니다.`);
        }

        // 추천사항 생성
        if (advanced.averageProcessingDays > 7) {
            report.recommendations.push('평균 처리 시간이 7일을 초과합니다. 승인 프로세스 개선을 검토하세요.');
        }

        if (basic.agency > basic.direct && budget.agencyTotalAmount > budget.directTotalAmount * 1.2) {
            report.recommendations.push('구매대행 비용이 높습니다. 직접구매 가이드 제공을 고려하세요.');
        }

        return report;
    }

    /**
     * 🔧 유틸리티 메서드들
     */
    
    // 실시간 업데이트 활성화/비활성화
    toggleRealTimeUpdates() {
        if (this.updateConfig.enableRealTime) {
            this.stopRealTimeUpdates();
            this.updateConfig.enableRealTime = false;
        } else {
            this.updateConfig.enableRealTime = true;
            this.startRealTimeUpdates();
        }
        
        console.log('🔄 실시간 업데이트:', this.updateConfig.enableRealTime ? '활성화' : '비활성화');
    }

    // 수동 통계 새로고침
    async forceRefresh() {
        console.log('🔄 수동 통계 새로고침 실행');
        this.clearCache();
        await this.refreshStatistics();
    }

    /**
     * 🧹 정리 함수
     */
    destroy() {
        console.log('🧹 FlightManagementStatistics 정리 중...');

        // 실시간 업데이트 중지
        this.stopRealTimeUpdates();

        // 활성 애니메이션 정리
        this.animations.activeAnimations.forEach(animationId => {
            clearInterval(animationId);
        });
        this.animations.activeAnimations.clear();

        // 캐시 클리어
        this.clearCache();

        this.isInitialized = false;
        console.log('✅ FlightManagementStatistics 정리 완료');
    }

    /**
     * 📋 디버그 정보
     */
    getDebugInfo() {
        return {
            version: '10.0.0',
            isInitialized: this.isInitialized,
            cacheStatus: {
                hasBasic: !!this.statisticsCache.basic,
                hasAdvanced: !!this.statisticsCache.advanced,
                hasBudget: !!this.statisticsCache.budget,
                lastUpdate: this.statisticsCache.lastUpdate,
                isValid: this.isCacheValid()
            },
            activeAnimations: this.animations.activeAnimations.size,
            updateConfig: this.updateConfig,
            domElements: Object.keys(this.domElements).reduce((acc, key) => {
                acc[key] = !!this.domElements[key];
                return acc;
            }, {})
        };
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.FlightManagementStatistics = FlightManagementStatistics;
    console.log('✅ FlightManagementStatistics v10.0.0 전역 등록 완료');
}

console.log('📦 FlightManagementStatistics v10.0.0 모듈 로드 완료 - Phase 2 통계 시스템');