/**
 * 항공권 관리 API 모듈 v8.1.0
 * 항공권 신청 관련 모든 API 통신을 담당
 * v8.1.0: Storage 구조 최적화 적용 - flight-tickets 통합 버킷 사용
 * v8.2.1: 데이터베이스 컬럼 매핑 수정 - university → sejong_institute
 * 
 * v8.1.0 Storage 최적화 적용:
 * - admin-tickets 제거 → flight-tickets 통합 버킷 사용
 * - uploadAdminTicket → uploadFlightTicket 메서드로 변경
 * - 사용자별 파일명 규칙 적용: {userId}_tickets
 * 
 * v8.2.1 긴급 수정사항:
 * - university 컬럼 참조 오류 수정 → sejong_institute 사용
 * - getAllRequests 및 getFlightRequestDetail 메서드 수정
 */

class FlightManagementAPI {
    constructor() {
        console.log('📡 FlightManagementAPI v8.1.0 클래스 초기화 시작 (Storage 최적화)');
        this.storageUtils = null;
        this.supabase = null;
        this.isInitialized = false;
        this.initError = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 FlightManagementAPI v8.1.0 초기화 중... (Storage 최적화)');
            
            // Supabase 인스턴스 확인 및 설정
            await this.setupSupabase();
            
            // StorageUtils 확인 및 설정
            this.setupStorageUtils();
            
            this.isInitialized = true;
            console.log('✅ FlightManagementAPI v8.1.0 초기화 완료 (Storage 최적화)');
        } catch (error) {
            console.error('❌ FlightManagementAPI v8.1.0 초기화 실패:', error);
            this.initError = error;
            this.isInitialized = false;
        }
    }

    async setupSupabase() {
        console.log('🔍 v8.1.0 Supabase 인스턴스 설정 시작...');
        
        // SupabaseCore 직접 사용 (최우선)
        if (window.SupabaseCore && window.SupabaseCore.supabase) {
            this.supabase = window.SupabaseCore.supabase;
            console.log('✅ v8.1.0 SupabaseCore에서 직접 인스턴스 획득');
            return;
        }

        // 2순위: SupabaseAdmin을 통한 접근
        if (window.SupabaseAdmin && window.SupabaseAdmin.core?.supabase) {
            this.supabase = window.SupabaseAdmin.core.supabase;
            console.log('✅ v8.1.0 SupabaseAdmin.core에서 인스턴스 획득');
            return;
        }

        // 3순위: window.supabase 확인 (레거시 호환성)
        if (window.supabase && window.supabase.from) {
            this.supabase = window.supabase;
            console.log('✅ v8.1.0 window.supabase에서 인스턴스 획득 (레거시)');
            return;
        }

        // 4순위: 초기화 대기
        console.log('⏳ v8.1.0 SupabaseCore 초기화 대기 중...');
        let waitCount = 0;
        const maxWait = 300; // 30초
        
        while (!this.supabase && waitCount < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // SupabaseCore 우선 확인
            if (window.SupabaseCore && window.SupabaseCore.supabase) {
                this.supabase = window.SupabaseCore.supabase;
                console.log(`✅ v8.1.0 대기 후 SupabaseCore에서 인스턴스 획득 (${waitCount * 100}ms)`);
                return;
            }
            
            // SupabaseAdmin 확인
            if (window.SupabaseAdmin && window.SupabaseAdmin.core?.supabase) {
                this.supabase = window.SupabaseAdmin.core.supabase;
                console.log(`✅ v8.1.0 대기 후 SupabaseAdmin에서 인스턴스 획득 (${waitCount * 100}ms)`);
                return;
            }
            
            // 레거시 window.supabase 확인
            if (window.supabase && window.supabase.from) {
                this.supabase = window.supabase;
                console.log(`✅ v8.1.0 대기 후 window.supabase에서 인스턴스 획득 (${waitCount * 100}ms)`);
                return;
            }
            
            waitCount++;
            
            // 5초마다 상태 로그
            if (waitCount % 50 === 0) {
                console.log(`⏳ v8.1.0 Supabase 대기 중... (${waitCount / 10}초)`);
            }
        }

        if (!this.supabase) {
            const errorMsg = `v8.1.0 Supabase 인스턴스를 찾을 수 없습니다 (${maxWait * 100}ms 대기 후)`;
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }
    }

    setupStorageUtils() {
        if (window.StorageUtils) {
            this.storageUtils = window.StorageUtils;
            console.log('✅ v8.1.0 StorageUtils 연결 완료');
        } else {
            console.warn('⚠️ v8.1.0 StorageUtils를 찾을 수 없습니다');
        }
    }

    // Supabase 인스턴스 안전 체크
    checkSupabaseInstance() {
        if (!this.supabase) {
            const error = new Error('v8.1.0 Supabase 인스턴스가 초기화되지 않았습니다');
            console.error('❌', error.message);
            throw error;
        }
        
        if (!this.supabase.from) {
            const error = new Error('v8.1.0 Supabase 인스턴스에 from 메서드가 없습니다');
            console.error('❌', error.message);
            throw error;
        }
        
        return this.supabase;
    }

    // 통계 데이터 가져오기
    async getStatistics() {
        try {
            console.log('📊 v8.1.0 항공권 신청 통계 조회 중...');
            
            const supabase = this.checkSupabaseInstance();

            const { data: requests, error } = await supabase
                .from('flight_requests')
                .select('status, purchase_type');

            if (error) throw error;

            const stats = {
                total: requests.length,
                pending: requests.filter(r => r.status === 'pending').length,
                approved: requests.filter(r => r.status === 'approved').length,
                rejected: requests.filter(r => r.status === 'rejected').length,
                completed: requests.filter(r => r.status === 'completed').length,
                direct: requests.filter(r => r.purchase_type === 'direct').length,
                agency: requests.filter(r => r.purchase_type === 'agency').length
            };

            console.log('✅ v8.1.0 통계 조회 성공:', stats);
            return stats;

        } catch (error) {
            console.error('❌ v8.1.0 통계 조회 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 목록 가져오기
    async getAllRequests() {
        try {
            console.log('📋 v8.1.0 항공권 신청 목록 조회 시작...');
            
            // 초기화 상태 확인
            if (!this.isInitialized) {
                console.warn('⚠️ v8.1.0 API가 아직 초기화되지 않았습니다. 재시도 중...');
                await this.init();
            }
            
            const supabase = this.checkSupabaseInstance();
            console.log('✅ v8.1.0 Supabase 인스턴스 확인 완료');

            const { data, error } = await supabase
                .from('flight_requests')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        email,
                        sejong_institute,
                        dispatch_duration
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ v8.1.0 쿼리 실행 오류:', error);
                throw error;
            }

            console.log(`✅ v8.1.0 항공권 신청 목록 조회 성공: ${data?.length || 0}건`);
            return data || [];

        } catch (error) {
            console.error('❌ v8.1.0 항공권 신청 목록 조회 실패:', error);
            
            // 상세 에러 정보 로깅
            console.error('🔍 v8.1.0 에러 상세 정보:', {
                isInitialized: this.isInitialized,
                hasSupabase: !!this.supabase,
                hasFromMethod: !!(this.supabase && this.supabase.from),
                initError: this.initError,
                error: error
            });
            
            throw error;
        }
    }

    // 항공권 신청 상세 정보 가져오기
    async getFlightRequestDetail(requestId) {
        try {
            console.log('🔍 v8.1.0 항공권 신청 상세 정보 조회 중...', requestId);
            
            const supabase = this.checkSupabaseInstance();
            
            const { data, error } = await supabase
                .from('flight_requests')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        email,
                        sejong_institute,
                        dispatch_duration
                    )
                `)
                .eq('id', requestId)
                .single();

            if (error) throw error;

            console.log('✅ v8.1.0 상세 정보 조회 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ v8.1.0 상세 정보 조회 실패:', error);
            throw error;
        }
    }

    // 신청 상태 업데이트
    async updateRequestStatus(requestId, status, rejectionReason = null) {
        try {
            console.log('🔄 v8.1.0 신청 상태 업데이트 중...', { requestId, status, rejectionReason });
            
            const supabase = this.checkSupabaseInstance();
            
            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            }

            const { data, error } = await supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ v8.1.0 상태 업데이트 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ v8.1.0 상태 업데이트 실패:', error);
            throw error;
        }
    }

    // 🆕 v8.1.0 최종 항공권 업로드 (flight-tickets 통합 버킷 사용)
    async uploadFlightTicket(userId, file) {
        try {
            console.log('📤 v8.1.0 최종 항공권 업로드 중... (flight-tickets 통합 버킷)', { userId, file: file.name });
            
            const supabase = this.checkSupabaseInstance();
            
            if (!this.storageUtils) {
                throw new Error('v8.1.0 StorageUtils가 초기화되지 않았습니다');
            }
            
            // 🆕 v8.1.0: StorageUtils의 새로운 uploadFlightTicket 메서드 사용
            const uploadResult = await this.storageUtils.uploadFlightTicket(file, userId);

            console.log('✅ v8.1.0 최종 항공권 업로드 성공:', uploadResult);
            return uploadResult;

        } catch (error) {
            console.error('❌ v8.1.0 최종 항공권 업로드 실패:', error);
            throw error;
        }
    }

    // 🆕 v8.1.0 구매대행 항공권 등록 및 완료 처리
    async completeAgencyPurchase(requestId, userId, ticketFile) {
        try {
            console.log('🎫 v8.1.0 구매대행 항공권 등록 및 완료 처리 중...', { requestId, userId });
            
            const supabase = this.checkSupabaseInstance();
            
            // 1. 항공권 파일 업로드
            const uploadResult = await this.uploadFlightTicket(userId, ticketFile);
            
            // 2. 데이터베이스 업데이트
            const { data, error } = await supabase
                .from('flight_requests')
                .update({
                    admin_ticket_url: uploadResult.publicUrl,
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ v8.1.0 구매대행 항공권 등록 및 완료 처리 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ v8.1.0 구매대행 항공권 등록 및 완료 처리 실패:', error);
            throw error;
        }
    }

    // 여권 정보 가져오기
    async getPassportInfo(userId) {
        try {
            console.log('🛂 v8.1.0 여권 정보 조회 중...', userId);
            
            const supabase = this.checkSupabaseInstance();
            
            const { data, error } = await supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows returned

            console.log('✅ v8.1.0 여권 정보 조회 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ v8.1.0 여권 정보 조회 실패:', error);
            throw error;
        }
    }

    // 🆕 v8.1.0 사용자별 항공권 이미지 목록 조회
    async getUserFlightImages(userId) {
        try {
            console.log('🖼️ v8.1.0 사용자 항공권 이미지 목록 조회 중...', userId);
            
            if (!this.storageUtils) {
                throw new Error('v8.1.0 StorageUtils가 초기화되지 않았습니다');
            }
            
            const images = await this.storageUtils.listUserFlightImages(userId);
            
            console.log('✅ v8.1.0 사용자 항공권 이미지 목록 조회 성공:', images.length, '개');
            return images;

        } catch (error) {
            console.error('❌ v8.1.0 사용자 항공권 이미지 목록 조회 실패:', error);
            throw error;
        }
    }

    // 파일 유효성 검증 (StorageUtils 활용)
    validateFile(file, fileType = 'document') {
        try {
            if (!this.storageUtils) {
                throw new Error('v8.1.0 StorageUtils가 초기화되지 않았습니다');
            }
            return this.storageUtils.validateFile(file, fileType);
        } catch (error) {
            console.error('v8.1.0 파일 검증 실패:', error);
            throw error;
        }
    }

    // 파일 크기 포맷팅 (StorageUtils 활용)
    formatFileSize(bytes) {
        if (this.storageUtils) {
            return this.storageUtils.formatFileSize(bytes);
        }
        // Fallback 구현
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 초기화 상태 확인 메서드
    getInitializationStatus() {
        return {
            version: 'v8.1.0 (Storage 구조 최적화)',
            isInitialized: this.isInitialized,
            hasSupabase: !!this.supabase,
            hasFromMethod: !!(this.supabase && this.supabase.from),
            hasStorageUtils: !!this.storageUtils,
            initError: this.initError,
            architecture: 'SupabaseCore 직접 사용',
            storageOptimizations: [
                'admin-tickets 버킷 제거',
                'flight-tickets 통합 버킷 사용',
                'uploadFlightTicket 메서드 적용',
                '사용자별 파일명 규칙: {userId}_tickets'
            ],
            fixedIssues: [
                'institute_info 잘못된 JOIN 오류 수정',
                'university → sejong_institute 컬럼 매핑 수정'
            ]
        };
    }
}

// 전역 객체에 등록
if (typeof window !== 'undefined') {
    window.FlightManagementAPI = FlightManagementAPI;
    console.log('✅ FlightManagementAPI v8.1.0 전역 등록 완료 (Storage 최적화)');
}

console.log('✅ FlightManagementAPI v8.1.0 모듈 로드 완료 - Storage 구조 최적화 적용 완료');
