/**
 * 항공권 관리 API 모듈 v7.2.0
 * 항공권 신청 관련 모든 API 통신을 담당
 * Storage 유틸리티 통합 버전
 * 
 * v7.2.0 개선사항:
 * - ES6 export 구문 제거 (브라우저 호환성 개선)
 * - 전역 객체 등록 방식으로 통일
 * - 모듈 로딩 에러 해결
 */

class FlightManagementAPI {
    constructor() {
        console.log('📡 FlightManagementAPI v7.2.0 클래스 초기화 시작');
        this.storageUtils = null;
        this.supabase = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 FlightManagementAPI 초기화 중...');
            
            // Supabase 인스턴스 확인 및 설정
            await this.setupSupabase();
            
            // StorageUtils 확인 및 설정
            this.setupStorageUtils();
            
            console.log('✅ FlightManagementAPI 초기화 완료');
        } catch (error) {
            console.error('❌ FlightManagementAPI 초기화 실패:', error);
        }
    }

    async setupSupabase() {
        // 1. SupabaseAPI 확인
        if (window.SupabaseAPI && window.SupabaseAPI.supabase) {
            this.supabase = window.SupabaseAPI.supabase;
            console.log('✅ SupabaseAPI에서 인스턴스 획득');
            return;
        }

        // 2. window.supabase 확인 (레거시)
        if (window.supabase) {
            this.supabase = window.supabase;
            console.log('✅ window.supabase에서 인스턴스 획득');
            return;
        }

        // 3. 초기화 대기 (최대 10초)
        let waitCount = 0;
        while (!this.supabase && waitCount < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (window.SupabaseAPI && window.SupabaseAPI.supabase) {
                this.supabase = window.SupabaseAPI.supabase;
                console.log('✅ 대기 후 SupabaseAPI에서 인스턴스 획득');
                return;
            }
            
            if (window.supabase) {
                this.supabase = window.supabase;
                console.log('✅ 대기 후 window.supabase에서 인스턴스 획득');
                return;
            }
            
            waitCount++;
        }

        if (!this.supabase) {
            throw new Error('Supabase 인스턴스를 찾을 수 없습니다');
        }
    }

    setupStorageUtils() {
        if (window.StorageUtils) {
            this.storageUtils = window.StorageUtils;
            console.log('✅ StorageUtils 연결 완료');
        } else {
            console.warn('⚠️ StorageUtils를 찾을 수 없습니다');
        }
    }

    // 통계 데이터 가져오기
    async getStatistics() {
        try {
            console.log('📊 항공권 신청 통계 조회 중...');

            const { data: requests, error } = await this.supabase
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

            console.log('✅ 통계 조회 성공:', stats);
            return stats;

        } catch (error) {
            console.error('❌ 통계 조회 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 목록 가져오기
    async getAllRequests() {
        try {
            console.log('📋 항공권 신청 목록 조회 중...');
            
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        email,
                        university,
                        institute_info(
                            name_ko
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ 항공권 신청 목록 조회 성공: ${data?.length || 0}건`);
            return data || [];

        } catch (error) {
            console.error('❌ 항공권 신청 목록 조회 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 상세 정보 가져오기
    async getFlightRequestDetail(requestId) {
        try {
            console.log('🔍 항공권 신청 상세 정보 조회 중...', requestId);
            
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        email,
                        university,
                        institute_info(
                            name_ko
                        )
                    )
                `)
                .eq('id', requestId)
                .single();

            if (error) throw error;

            console.log('✅ 상세 정보 조회 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ 상세 정보 조회 실패:', error);
            throw error;
        }
    }

    // 신청 상태 업데이트
    async updateRequestStatus(requestId, status, rejectionReason = null) {
        try {
            console.log('🔄 신청 상태 업데이트 중...', { requestId, status, rejectionReason });
            
            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            }

            const { data, error } = await this.supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ 상태 업데이트 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ 상태 업데이트 실패:', error);
            throw error;
        }
    }

    // 구매대행 항공권 업로드 (Storage 유틸리티 사용)
    async uploadAdminTicket(requestId, file) {
        try {
            console.log('📤 구매대행 항공권 업로드 중...', { requestId, file: file.name });
            
            if (!this.storageUtils) {
                throw new Error('StorageUtils가 초기화되지 않았습니다');
            }
            
            // StorageUtils를 사용한 파일 업로드
            const uploadResult = await this.storageUtils.uploadAdminTicket(file, requestId);

            // 데이터베이스 업데이트
            const { data, error } = await this.supabase
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

            console.log('✅ 항공권 업로드 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ 항공권 업로드 실패:', error);
            throw error;
        }
    }

    // 여권 정보 가져오기
    async getPassportInfo(userId) {
        try {
            console.log('🛂 여권 정보 조회 중...', userId);
            
            const { data, error } = await this.supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows returned

            console.log('✅ 여권 정보 조회 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ 여권 정보 조회 실패:', error);
            throw error;
        }
    }

    // 파일 유효성 검증 (StorageUtils 활용)
    validateFile(file, fileType = 'document') {
        try {
            if (!this.storageUtils) {
                throw new Error('StorageUtils가 초기화되지 않았습니다');
            }
            return this.storageUtils.validateFile(file, fileType);
        } catch (error) {
            console.error('파일 검증 실패:', error);
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
}

// 전역 객체에 등록 (ES6 export 대신)
if (typeof window !== 'undefined') {
    window.FlightManagementAPI = FlightManagementAPI;
    console.log('✅ FlightManagementAPI v7.2.0 전역 등록 완료');
}

console.log('✅ FlightManagementAPI v7.2.0 모듈 로드 완료 - ES6 export 제거, 전역 등록 방식');
