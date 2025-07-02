/**
 * 항공권 관리 API 모듈 v5.3.0
 * 항공권 신청 관련 모든 API 통신을 담당
 */

window.FlightManagementAPI = (function() {
    'use strict';

    console.log('📡 FlightManagementAPI 모듈 로드 시작');

    // 통계 데이터 가져오기
    async function getStatistics() {
        try {
            console.log('📊 항공권 신청 통계 조회 중...');
            
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

            console.log('✅ 통계 조회 성공:', stats);
            return stats;

        } catch (error) {
            console.error('❌ 통계 조회 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 목록 가져오기
    async function getFlightRequests(filter = 'all', searchTerm = '') {
        try {
            console.log('📋 항공권 신청 목록 조회 중...', { filter, searchTerm });
            
            let query = supabase
                .from('flight_requests')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        email,
                        sejong_institute,
                        field,
                        dispatch_duration
                    )
                `)
                .order('created_at', { ascending: false });

            // 필터 적용
            if (filter !== 'all') {
                query = query.eq('purchase_type', filter);
            }

            // 검색어 적용
            if (searchTerm) {
                query = query.ilike('user_profiles.name', `%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            console.log(`✅ 항공권 신청 목록 조회 성공: ${data.length}건`);
            return data || [];

        } catch (error) {
            console.error('❌ 항공권 신청 목록 조회 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 상세 정보 가져오기
    async function getFlightRequestDetail(requestId) {
        try {
            console.log('🔍 항공권 신청 상세 정보 조회 중...', requestId);
            
            const { data, error } = await supabase
                .from('flight_requests')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        email,
                        sejong_institute,
                        field,
                        dispatch_duration
                    ),
                    passport_info(
                        passport_number,
                        name_english,
                        issue_date,
                        expiry_date
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
    async function updateRequestStatus(requestId, status, rejectionReason = null) {
        try {
            console.log('🔄 신청 상태 업데이트 중...', { requestId, status, rejectionReason });
            
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

            console.log('✅ 상태 업데이트 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ 상태 업데이트 실패:', error);
            throw error;
        }
    }

    // 구매대행 항공권 업로드
    async function uploadAdminTicket(requestId, file) {
        try {
            console.log('📤 구매대행 항공권 업로드 중...', { requestId, file: file.name });
            
            // 파일 업로드
            const fileName = `admin-tickets/${requestId}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('flight-documents')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 공개 URL 가져오기
            const { data: { publicUrl } } = supabase.storage
                .from('flight-documents')
                .getPublicUrl(fileName);

            // 데이터베이스 업데이트
            const { data, error } = await supabase
                .from('flight_requests')
                .update({
                    admin_ticket_url: publicUrl,
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
    async function getPassportInfo(userId) {
        try {
            console.log('🛂 여권 정보 조회 중...', userId);
            
            const { data, error } = await supabase
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

    // Storage 버킷 생성 확인
    async function ensureStorageBucket() {
        try {
            console.log('🗄️ Storage 버킷 확인 중...');
            
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();
            
            if (listError) {
                console.error('❌ 버킷 목록 조회 실패:', listError);
                return;
            }

            const bucketExists = buckets.some(bucket => bucket.name === 'flight-documents');
            
            if (!bucketExists) {
                console.log('📦 flight-documents 버킷 생성 중...');
                
                const { data, error } = await supabase.storage.createBucket('flight-documents', {
                    public: true,
                    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
                });

                if (error) {
                    console.error('❌ 버킷 생성 실패:', error);
                } else {
                    console.log('✅ 버킷 생성 성공:', data);
                }
            } else {
                console.log('✅ flight-documents 버킷이 이미 존재합니다');
            }

        } catch (error) {
            console.error('❌ Storage 버킷 확인 실패:', error);
        }
    }

    // 초기화
    async function init() {
        console.log('🚀 FlightManagementAPI 초기화');
        await ensureStorageBucket();
    }

    // 모듈 초기화
    init();

    // Public API
    return {
        getStatistics,
        getFlightRequests,
        getFlightRequestDetail,
        updateRequestStatus,
        uploadAdminTicket,
        getPassportInfo
    };

})();

console.log('✅ FlightManagementAPI 모듈 로드 완료');