// flight-request-api.js - 항공권 신청 API 함수

// API 객체
const flightRequestAPI = {
    // 현재 사용자의 프로필 정보 가져오기
    async getUserProfile() {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('사용자 프로필 조회 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 현재 사용자의 항공권 신청 현황 조회
    async getMyFlightRequest() {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            const { data, error } = await supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('항공권 신청 조회 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 항공권 신청서 제출
    async submitFlightRequest(formData) {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            // 이미지 업로드
            let flightImageUrl = null;
            if (formData.flightImage) {
                const uploadResult = await this.uploadFlightImage(formData.flightImage);
                if (!uploadResult.success) {
                    throw new Error('이미지 업로드 실패: ' + uploadResult.error);
                }
                flightImageUrl = uploadResult.url;
            }

            // 신청서 데이터 준비
            const requestData = {
                user_id: user.id,
                purchase_type: formData.purchaseType,
                departure_date: formData.departureDate,
                return_date: formData.returnDate,
                departure_airport: formData.departureAirport,
                arrival_airport: formData.arrivalAirport,
                flight_image_url: flightImageUrl,
                purchase_link: formData.purchaseLink || null,
                status: 'pending',
                version: 1
            };

            // 데이터베이스에 저장
            const { data, error } = await supabase
                .from('flight_requests')
                .insert([requestData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('항공권 신청 제출 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 항공권 신청서 수정 (반려 후 재제출)
    async updateFlightRequest(requestId, formData) {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            // 이미지가 변경된 경우 새로 업로드
            let flightImageUrl = formData.existingImageUrl;
            if (formData.flightImage && formData.imageChanged) {
                const uploadResult = await this.uploadFlightImage(formData.flightImage);
                if (!uploadResult.success) {
                    throw new Error('이미지 업로드 실패: ' + uploadResult.error);
                }
                flightImageUrl = uploadResult.url;
            }

            // 업데이트 데이터 준비
            const updateData = {
                purchase_type: formData.purchaseType,
                departure_date: formData.departureDate,
                return_date: formData.returnDate,
                departure_airport: formData.departureAirport,
                arrival_airport: formData.arrivalAirport,
                flight_image_url: flightImageUrl,
                purchase_link: formData.purchaseLink || null,
                status: 'pending',
                rejection_reason: null, // 반려 사유 초기화
                version: formData.version + 1,
                updated_at: new Date().toISOString()
            };

            // 데이터베이스 업데이트
            const { data, error } = await supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .eq('user_id', user.id)
                .eq('status', 'rejected') // 반려된 상태에서만 수정 가능
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('항공권 신청 수정 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 항공권 신청 삭제
    async deleteFlightRequest(requestId) {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            const { error } = await supabase
                .from('flight_requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', user.id)
                .in('status', ['pending', 'rejected']); // pending 또는 rejected 상태에서만 삭제 가능

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('항공권 신청 삭제 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 항공권 이미지 업로드
    async uploadFlightImage(file) {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            // 파일 검증
            if (!window.flightRequestUtils.fileUtils.validateFileSize(file)) {
                throw new Error('파일 크기는 10MB 이하여야 합니다.');
            }

            if (!window.flightRequestUtils.fileUtils.validateFileType(file)) {
                throw new Error('지원하지 않는 파일 형식입니다.');
            }

            // 파일명 생성
            const fileName = window.flightRequestUtils.fileUtils.generateFileName(user.id, file.name);
            const filePath = `flight-images/${fileName}`;

            // 스토리지에 업로드
            const { data, error } = await supabase.storage
                .from('flight-documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // 공개 URL 가져오기
            const { data: { publicUrl } } = supabase.storage
                .from('flight-documents')
                .getPublicUrl(filePath);

            return { success: true, url: publicUrl };
        } catch (error) {
            console.error('이미지 업로드 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 영수증 업로드 (직접구매용)
    async uploadReceipt(requestId, file) {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            // 파일 업로드
            const fileName = window.flightRequestUtils.fileUtils.generateFileName(user.id, file.name);
            const filePath = `receipts/${fileName}`;

            const { data, error } = await supabase.storage
                .from('flight-documents')
                .upload(filePath, file);

            if (error) throw error;

            // 공개 URL 가져오기
            const { data: { publicUrl } } = supabase.storage
                .from('flight-documents')
                .getPublicUrl(filePath);

            // 신청서 업데이트
            const { error: updateError } = await supabase
                .from('flight_requests')
                .update({ 
                    receipt_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            return { success: true, url: publicUrl };
        } catch (error) {
            console.error('영수증 업로드 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 항공권 업로드 (직접구매용)
    async uploadTicket(requestId, file) {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            // 파일 업로드
            const fileName = window.flightRequestUtils.fileUtils.generateFileName(user.id, file.name);
            const filePath = `tickets/${fileName}`;

            const { data, error } = await supabase.storage
                .from('flight-documents')
                .upload(filePath, file);

            if (error) throw error;

            // 공개 URL 가져오기
            const { data: { publicUrl } } = supabase.storage
                .from('flight-documents')
                .getPublicUrl(filePath);

            // 신청서 업데이트
            const { error: updateError } = await supabase
                .from('flight_requests')
                .update({ 
                    ticket_url: publicUrl,
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            return { success: true, url: publicUrl };
        } catch (error) {
            console.error('항공권 업로드 오류:', error);
            return { success: false, error: error.message };
        }
    },

    // 여권 정보 조회
    async getPassportInfo() {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('인증되지 않은 사용자입니다.');

            const { data, error } = await supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('여권 정보 조회 오류:', error);
            return { success: false, error: error.message };
        }
    }
};

// 전역 객체로 노출
window.flightRequestAPI = flightRequestAPI;