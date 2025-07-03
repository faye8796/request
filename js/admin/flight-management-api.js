/**
 * 항공권 관리 API 모듈 v7.1.0
 * 항공권 신청 관련 모든 API 통신을 담당
 * Storage 유틸리티 통합 버전
 * 
 * v7.1.0 개선사항:
 * - Supabase 인스턴스 안전한 참조 방식 적용
 * - 모듈 초기화 로직 개선
 * - 오류 처리 강화
 */

export class FlightManagementAPI {
    constructor() {
        console.log('📡 FlightManagementAPI v7.1.0 클래스 초기화 시작');
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
            console.log('📊 항공권 신청 통계 조회 중...');\n            \n            const { data: requests, error } = await this.supabase\n                .from('flight_requests')\n                .select('status, purchase_type');\n\n            if (error) throw error;\n\n            const stats = {\n                total: requests.length,\n                pending: requests.filter(r => r.status === 'pending').length,\n                approved: requests.filter(r => r.status === 'approved').length,\n                rejected: requests.filter(r => r.status === 'rejected').length,\n                completed: requests.filter(r => r.status === 'completed').length,\n                direct: requests.filter(r => r.purchase_type === 'direct').length,\n                agency: requests.filter(r => r.purchase_type === 'agency').length\n            };\n\n            console.log('✅ 통계 조회 성공:', stats);\n            return stats;\n\n        } catch (error) {\n            console.error('❌ 통계 조회 실패:', error);\n            throw error;\n        }\n    }\n\n    // 항공권 신청 목록 가져오기\n    async getAllRequests() {\n        try {\n            console.log('📋 항공권 신청 목록 조회 중...');\n            \n            const { data, error } = await this.supabase\n                .from('flight_requests')\n                .select(`\n                    *,\n                    user_profiles!inner(\n                        id,\n                        name,\n                        email,\n                        university,\n                        institute_info(\n                            name_ko\n                        )\n                    )\n                `)\n                .order('created_at', { ascending: false });\n\n            if (error) throw error;\n\n            console.log(`✅ 항공권 신청 목록 조회 성공: ${data?.length || 0}건`);\n            return data || [];\n\n        } catch (error) {\n            console.error('❌ 항공권 신청 목록 조회 실패:', error);\n            throw error;\n        }\n    }\n\n    // 항공권 신청 상세 정보 가져오기\n    async getFlightRequestDetail(requestId) {\n        try {\n            console.log('🔍 항공권 신청 상세 정보 조회 중...', requestId);\n            \n            const { data, error } = await this.supabase\n                .from('flight_requests')\n                .select(`\n                    *,\n                    user_profiles!inner(\n                        id,\n                        name,\n                        email,\n                        university,\n                        institute_info(\n                            name_ko\n                        )\n                    )\n                `)\n                .eq('id', requestId)\n                .single();\n\n            if (error) throw error;\n\n            console.log('✅ 상세 정보 조회 성공:', data);\n            return data;\n\n        } catch (error) {\n            console.error('❌ 상세 정보 조회 실패:', error);\n            throw error;\n        }\n    }\n\n    // 신청 상태 업데이트\n    async updateRequestStatus(requestId, status, rejectionReason = null) {\n        try {\n            console.log('🔄 신청 상태 업데이트 중...', { requestId, status, rejectionReason });\n            \n            const updateData = {\n                status,\n                updated_at: new Date().toISOString()\n            };\n\n            if (status === 'rejected' && rejectionReason) {\n                updateData.rejection_reason = rejectionReason;\n            }\n\n            const { data, error } = await this.supabase\n                .from('flight_requests')\n                .update(updateData)\n                .eq('id', requestId)\n                .select()\n                .single();\n\n            if (error) throw error;\n\n            console.log('✅ 상태 업데이트 성공:', data);\n            return data;\n\n        } catch (error) {\n            console.error('❌ 상태 업데이트 실패:', error);\n            throw error;\n        }\n    }\n\n    // 구매대행 항공권 업로드 (Storage 유틸리티 사용)\n    async uploadAdminTicket(requestId, file) {\n        try {\n            console.log('📤 구매대행 항공권 업로드 중...', { requestId, file: file.name });\n            \n            if (!this.storageUtils) {\n                throw new Error('StorageUtils가 초기화되지 않았습니다');\n            }\n            \n            // StorageUtils를 사용한 파일 업로드\n            const uploadResult = await this.storageUtils.uploadAdminTicket(file, requestId);\n\n            // 데이터베이스 업데이트\n            const { data, error } = await this.supabase\n                .from('flight_requests')\n                .update({\n                    admin_ticket_url: uploadResult.publicUrl,\n                    status: 'completed',\n                    updated_at: new Date().toISOString()\n                })\n                .eq('id', requestId)\n                .select()\n                .single();\n\n            if (error) throw error;\n\n            console.log('✅ 항공권 업로드 성공:', data);\n            return data;\n\n        } catch (error) {\n            console.error('❌ 항공권 업로드 실패:', error);\n            throw error;\n        }\n    }\n\n    // 여권 정보 가져오기\n    async getPassportInfo(userId) {\n        try {\n            console.log('🛂 여권 정보 조회 중...', userId);\n            \n            const { data, error } = await this.supabase\n                .from('passport_info')\n                .select('*')\n                .eq('user_id', userId)\n                .single();\n\n            if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows returned\n\n            console.log('✅ 여권 정보 조회 성공:', data);\n            return data;\n\n        } catch (error) {\n            console.error('❌ 여권 정보 조회 실패:', error);\n            throw error;\n        }\n    }\n\n    // 파일 유효성 검증 (StorageUtils 활용)\n    validateFile(file, fileType = 'document') {\n        try {\n            if (!this.storageUtils) {\n                throw new Error('StorageUtils가 초기화되지 않았습니다');\n            }\n            return this.storageUtils.validateFile(file, fileType);\n        } catch (error) {\n            console.error('파일 검증 실패:', error);\n            throw error;\n        }\n    }\n\n    // 파일 크기 포맷팅 (StorageUtils 활용)\n    formatFileSize(bytes) {\n        if (this.storageUtils) {\n            return this.storageUtils.formatFileSize(bytes);\n        }\n        // Fallback 구현\n        if (bytes === 0) return '0 Bytes';\n        const k = 1024;\n        const sizes = ['Bytes', 'KB', 'MB', 'GB'];\n        const i = Math.floor(Math.log(bytes) / Math.log(k));\n        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];\n    }\n}\n\n// 하위 호환성을 위한 window 객체 등록\nif (typeof window !== 'undefined') {\n    window.FlightManagementAPI = FlightManagementAPI;\n}\n\nconsole.log('✅ FlightManagementAPI v7.1.0 모듈 로드 완료 - ES6 모듈 + Supabase 안전 참조');