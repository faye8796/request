/**
 * 비자 관리 시스템 메인 모듈 v1.0.0
 * 전체 시스템을 조정하고 데이터 로딩을 담당
 */

(function() {
    'use strict';

    console.log('🚀 VisaManagement v1.0.0 로딩...');

    class VisaManagement {
        constructor() {
            this.isInitialized = false;
            this.currentUser = null;
            this.visaData = null;
            this.receiptsData = [];
            this.init();
        }

        // 초기화
        async init() {
            try {
                console.log('🔧 VisaManagement 초기화 시작...');

                // 의존성 체크
                await this.checkDependencies();

                // 사용자 데이터 로드
                await this.loadUserData();

                // 데이터 로딩
                await this.loadAllData();

                this.isInitialized = true;
                console.log('✅ VisaManagement 초기화 완료');

            } catch (error) {
                console.error('❌ VisaManagement 초기화 실패:', error);
                this.showErrorMessage('시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
            }
        }

        // 의존성 체크
        async checkDependencies() {
            const maxAttempts = 10;
            let attempts = 0;

            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    attempts++;

                    if (window.visaManagementAPI && window.visaManagementUI) {
                        clearInterval(checkInterval);
                        console.log('✅ 의존성 모듈 로드 완료');
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        reject(new Error('의존성 모듈 로드 실패'));
                    }
                }, 100);
            });
        }

        // 사용자 데이터 로드
        async loadUserData() {
            try {
                const userDataStr = localStorage.getItem('currentStudent');
                if (!userDataStr) {
                    throw new Error('사용자 데이터가 없습니다. 다시 로그인해주세요.');
                }

                this.currentUser = JSON.parse(userDataStr);
                if (!this.currentUser.id) {
                    throw new Error('유효하지 않은 사용자 데이터입니다.');
                }

                console.log('✅ 사용자 데이터 로드 완료:', this.currentUser.name || this.currentUser.email);

            } catch (error) {
                console.error('❌ 사용자 데이터 로드 실패:', error);
                
                // 로그인 페이지로 리다이렉트
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 2000);
                
                throw error;
            }
        }

        // 모든 데이터 로드
        async loadAllData() {
            try {
                console.log('📊 비자 관련 데이터 로딩 시작...');

                // 병렬로 데이터 로드
                const [visaResult, receiptsResult] = await Promise.all([
                    this.loadVisaApplication(),
                    this.loadReceiptsList()
                ]);

                if (!visaResult || !receiptsResult) {
                    console.warn('⚠️ 일부 데이터 로드 실패');
                }

                console.log('✅ 모든 데이터 로드 완료');

            } catch (error) {
                console.error('❌ 데이터 로드 실패:', error);
                this.showErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
            }
        }

        // 비자 신청 정보 로드
        async loadVisaApplication() {
            try {
                console.log('📋 비자 신청 정보 로드...');

                if (!window.visaManagementAPI) {
                    throw new Error('API 모듈이 로드되지 않았습니다.');
                }

                const result = await window.visaManagementAPI.getVisaApplication();
                
                if (result.success) {
                    this.visaData = result.data;
                    
                    if (this.visaData) {
                        console.log('✅ 기존 비자 신청 정보 발견');
                        this.displayVisaData();
                    } else {
                        console.log('ℹ️ 비자 신청 정보 없음 - 새로 시작');
                        this.displayEmptyVisaData();
                    }
                    
                    return true;
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('❌ 비자 신청 정보 로드 실패:', error);
                this.displayEmptyVisaData();
                return false;
            }
        }

        // 영수증 목록 로드
        async loadReceiptsList() {
            try {
                console.log('🧾 영수증 목록 로드...');

                if (!window.visaManagementAPI) {
                    throw new Error('API 모듈이 로드되지 않았습니다.');
                }

                const result = await window.visaManagementAPI.getVisaReceipts();
                
                if (result.success) {
                    this.receiptsData = result.data || [];
                    
                    console.log(`✅ 영수증 ${this.receiptsData.length}개 로드 완료`);
                    this.displayReceiptsData();
                    
                    return true;
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                console.error('❌ 영수증 목록 로드 실패:', error);
                this.receiptsData = [];
                this.displayReceiptsData();
                return false;
            }
        }

        // ===== 데이터 표시 메서드 =====

        // 비자 데이터 표시
        displayVisaData() {
            if (!window.visaManagementUI) {
                console.warn('⚠️ UI 모듈이 로드되지 않았습니다.');
                return;
            }

            // 비자 상태 표시
            window.visaManagementUI.displayVisaStatus(this.visaData);

            // 관리자 코멘트 표시
            window.visaManagementUI.displayAdminComment(this.visaData);

            // 비자 문서 표시
            window.visaManagementUI.displayVisaDocument(this.visaData);
        }

        // 빈 비자 데이터 표시
        displayEmptyVisaData() {
            if (!window.visaManagementUI) {
                console.warn('⚠️ UI 모듈이 로드되지 않았습니다.');
                return;
            }

            // 빈 상태로 초기화
            window.visaManagementUI.displayVisaStatus(null);
            window.visaManagementUI.displayAdminComment(null);
            window.visaManagementUI.displayVisaDocument(null);
        }

        // 영수증 데이터 표시
        displayReceiptsData() {
            if (!window.visaManagementUI) {
                console.warn('⚠️ UI 모듈이 로드되지 않았습니다.');
                return;
            }

            window.visaManagementUI.renderReceiptsList(this.receiptsData);
        }

        // ===== 데이터 새로고침 메서드 =====

        // 비자 신청 정보 새로고침
        async refreshVisaApplication() {
            try {
                console.log('🔄 비자 신청 정보 새로고침...');
                await this.loadVisaApplication();
            } catch (error) {
                console.error('❌ 비자 신청 정보 새로고침 실패:', error);
            }
        }

        // 영수증 목록 새로고침
        async refreshReceiptsList() {
            try {
                console.log('🔄 영수증 목록 새로고침...');
                await this.loadReceiptsList();
            } catch (error) {
                console.error('❌ 영수증 목록 새로고침 실패:', error);
            }
        }

        // 전체 데이터 새로고침
        async refreshAllData() {
            try {
                console.log('🔄 전체 데이터 새로고침...');
                
                if (window.visaManagementUI) {
                    window.visaManagementUI.showLoadingIndicator('데이터를 새로고침하는 중...');
                }

                await this.loadAllData();

                if (window.visaManagementUI) {
                    window.visaManagementUI.hideLoadingIndicator();
                    window.visaManagementUI.showSuccessMessage('데이터가 새로고침되었습니다.');
                }

            } catch (error) {
                console.error('❌ 전체 데이터 새로고침 실패:', error);
                
                if (window.visaManagementUI) {
                    window.visaManagementUI.hideLoadingIndicator();
                    window.visaManagementUI.showErrorMessage('데이터 새로고침에 실패했습니다.');
                }
            }
        }

        // ===== 유틸리티 메서드 =====

        // 현재 사용자 정보 반환
        getCurrentUser() {
            return this.currentUser;
        }

        // 현재 비자 데이터 반환
        getVisaData() {
            return this.visaData;
        }

        // 현재 영수증 데이터 반환
        getReceiptsData() {
            return this.receiptsData;
        }

        // 초기화 상태 확인
        getInitializationStatus() {
            return {
                isInitialized: this.isInitialized,
                hasUser: !!this.currentUser,
                hasVisaData: !!this.visaData,
                receiptsCount: this.receiptsData.length
            };
        }

        // 메시지 표시 유틸리티
        showSuccessMessage(message) {
            if (window.visaManagementUI) {
                window.visaManagementUI.showSuccessMessage(message);
            } else {
                console.log('✅', message);
                alert(message);
            }
        }

        showErrorMessage(message) {
            if (window.visaManagementUI) {
                window.visaManagementUI.showErrorMessage(message);
            } else {
                console.error('❌', message);
                alert(message);
            }
        }

        showLoadingIndicator(message = '처리 중...') {
            if (window.visaManagementUI) {
                window.visaManagementUI.showLoadingIndicator(message);
            } else {
                console.log('⏳', message);
            }
        }

        hideLoadingIndicator() {
            if (window.visaManagementUI) {
                window.visaManagementUI.hideLoadingIndicator();
            }
        }

        // ===== 이벤트 핸들러 =====

        // 페이지 언로드 시 정리
        handlePageUnload() {
            console.log('🧹 VisaManagement 정리 중...');
            
            // 타이머 정리
            if (window.visaManagementUI?.statusSaveTimeout) {
                clearTimeout(window.visaManagementUI.statusSaveTimeout);
            }
        }

        // 오류 처리
        handleError(error, context = '') {
            console.error(`❌ ${context} 오류:`, error);
            
            const message = error.message || '알 수 없는 오류가 발생했습니다.';
            this.showErrorMessage(`${context ? context + ': ' : ''}${message}`);
        }

        // ===== 디버깅 메서드 =====

        // 시스템 상태 출력
        debugSystemStatus() {
            console.group('🔍 비자 관리 시스템 상태');
            console.log('초기화 상태:', this.getInitializationStatus());
            console.log('현재 사용자:', this.currentUser?.name || this.currentUser?.email);
            console.log('비자 데이터:', this.visaData);
            console.log('영수증 개수:', this.receiptsData.length);
            console.log('API 모듈:', !!window.visaManagementAPI);
            console.log('UI 모듈:', !!window.visaManagementUI);
            console.groupEnd();
        }

        // 모든 데이터 출력
        debugAllData() {
            console.group('📊 비자 관리 시스템 전체 데이터');
            console.log('비자 신청 정보:', this.visaData);
            console.log('영수증 목록:', this.receiptsData);
            console.groupEnd();
        }

        // 성능 측정
        async measurePerformance(operation, ...args) {
            const startTime = performance.now();
            
            try {
                const result = await operation.apply(this, args);
                const endTime = performance.now();
                
                console.log(`⏱️ ${operation.name} 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
                return result;
                
            } catch (error) {
                const endTime = performance.now();
                console.error(`❌ ${operation.name} 실행 실패 (${(endTime - startTime).toFixed(2)}ms):`, error);
                throw error;
            }
        }
    }

    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
        if (window.visaManagement) {
            window.visaManagement.handlePageUnload();
        }
    });

    // 전역 에러 핸들러
    window.addEventListener('error', (event) => {
        if (window.visaManagement) {
            window.visaManagement.handleError(event.error, '전역 오류');
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        if (window.visaManagement) {
            window.visaManagement.handleError(event.reason, 'Promise 거부');
        }
    });

    // DOM 로드 완료 후 초기화
    function initializeVisaManagement() {
        console.log('🚀 VisaManagement 인스턴스 생성...');
        
        // 전역에 인스턴스 생성
        window.visaManagement = new VisaManagement();

        // 디버깅을 위한 전역 함수 등록
        window.debugVisaSystem = () => {
            if (window.visaManagement) {
                window.visaManagement.debugSystemStatus();
            }
        };

        window.debugVisaData = () => {
            if (window.visaManagement) {
                window.visaManagement.debugAllData();
            }
        };

        window.refreshVisaData = async () => {
            if (window.visaManagement) {
                await window.visaManagement.refreshAllData();
            }
        };
    }

    // DOM 로드 상태에 따른 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeVisaManagement);
    } else {
        // DOM이 이미 로드된 경우 약간의 지연 후 실행
        setTimeout(initializeVisaManagement, 100);
    }

    console.log('✅ VisaManagement v1.0.0 로드 완료');

})();