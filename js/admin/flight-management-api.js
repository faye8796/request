/**
 * 항공권 관리 API 모듈 v7.0.0
 * 항공권 신청 관련 모든 API 통신을 담당
 * Storage 유틸리티 통합 버전
 */

window.FlightManagementAPI = (function() {
    'use strict';

    console.log('📡 FlightManagementAPI v7.0.0 모듈 로드 시작');

    // StorageUtils 참조
    const storageUtils = window.StorageUtils;

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
                        expiry_date,
                        image_url
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

    // 구매대행 항공권 업로드 (Storage 유틸리티 사용)
    async function uploadAdminTicket(requestId, file) {
        try {
            console.log('📤 구매대행 항공권 업로드 중...', { requestId, file: file.name });
            
            // StorageUtils를 사용한 파일 업로드
            const uploadResult = await storageUtils.uploadAdminTicket(file, requestId);

            // 데이터베이스 업데이트
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

    // 파일 유효성 검증 (StorageUtils 활용)
    function validateFile(file, fileType = 'document') {
        try {
            return storageUtils.validateFile(file, fileType);
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }

    // 파일 크기 포맷팅 (StorageUtils 활용)
    function formatFileSize(bytes) {
        return storageUtils.formatFileSize(bytes);
    }

    // 초기화
    async function init() {
        console.log('🚀 FlightManagementAPI v7.0.0 초기화');
        // Storage 버킷 초기화는 StorageUtils에서 자동으로 처리
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
        getPassportInfo,
        validateFile,
        formatFileSize
    };

})();

console.log('✅ FlightManagementAPI v7.0.0 모듈 로드 완료 - Storage 유틸리티 통합');
