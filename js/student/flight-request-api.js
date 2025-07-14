// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.3.0
// 🆕 v8.3.0: 귀국 필수 완료일 제약사항 API 기능 추가
// 🎯 목적: 효율적이고 안정적인 API 통신 + 귀국 필수 완료일 관리

class FlightRequestAPI {
    constructor() {
        this.user = null;
        this.supabase = null;
        this.core = null;
        this.isInitialized = false;
        this.initializationPromise = this.initialize();
    }

    // === 초기화 ===
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.3.0 초기화 시작...');
            
            await this.connectToSupabaseCore();
            this.isInitialized = true;
            
            console.log('✅ FlightRequestAPI v8.3.0 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    async connectToSupabaseCore() {
        // SupabaseCore v1.0.1 연결 시도
        if (window.SupabaseAPI?.core?.isInitialized) {
            this.core = window.SupabaseAPI.core;
            this.supabase = this.core.getClient();
            return;
        }

        // 기존 SupabaseCore 폴백
        if (window.SupabaseCore?._initialized) {
            this.supabase = window.SupabaseCore.client;
            return;
        }

        // 대기 후 재시도
        const startTime = Date.now();
        while (Date.now() - startTime < 5000) {
            if (window.SupabaseAPI?.core?.isInitialized) {
                this.core = window.SupabaseAPI.core;
                this.supabase = this.core.getClient();
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('SupabaseCore 연결 실패');
    }

    async ensureInitialized() {
        if (this.isInitialized && this.supabase) return true;

        if (!this.initializationPromise) {
            this.initializationPromise = this.initialize();
        }
        
        await this.initializationPromise;
        
        if (!this.isInitialized) {
            throw new Error('API 초기화 실패');
        }
        
        return true;
    }

    // === 사용자 정보 ===
    async getCurrentUser() {
        try {
            await this.ensureInitialized();

            if (this.user) return this.user;

            const currentStudentData = localStorage.getItem('currentStudent');
            if (!currentStudentData) {
                throw new Error('사용자 정보를 찾을 수 없습니다');
            }

            const studentData = JSON.parse(currentStudentData);
            if (!studentData?.id) {
                throw new Error('유효하지 않은 사용자 데이터');
            }

            this.user = { 
                id: studentData.id, 
                email: studentData.email || 'no-email',
                name: studentData.name || 'no-name'
            };
            
            return this.user;
        } catch (error) {
            console.error('❌ getCurrentUser() 실패:', error);
            throw error;
        }
    }

    async getUserProfile() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (this.core?.select) {
                const result = await this.core.select('user_profiles', '*', { id: this.user.id });
                if (!result.success) throw new Error(result.error);
                return result.data?.length > 0 ? result.data[0] : null;
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('사용자 프로필 조회 실패:', error);
            throw error;
        }
    }

    // === 🆕 v8.3.0: 귀국 필수 완료일 관리 API ===

    /**
     * 🆕 v8.3.0: 사용자의 귀국 필수 완료일 정보 조회
     * @returns {Object} 귀국 필수 완료일 정보
     */
    async getRequiredReturnDate() {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            const selectColumns = [
                'required_return_date', 
                'required_return_reason',
                'name', 
                'email'
            ].join(', ');

            if (this.core?.select) {
                const result = await this.core.select('user_profiles', selectColumns, { 
                    auth_user_id: this.user.id 
                });
                if (!result.success && !result.error.includes('PGRST116')) {
                    throw new Error(result.error);
                }
                return result.data?.length > 0 ? result.data[0] : null;
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(selectColumns)
                .eq('auth_user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;

        } catch (error) {
            console.error('❌ 귀국 필수 완료일 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 🆕 v8.3.0: 사용자의 귀국 필수 완료일과 현재 상태 정보를 함께 반환
     * @returns {Object} 상세 정보 포함한 귀국 필수 완료일 정보
     */
    async getRequiredReturnDateWithStatus() {
        try {
            const data = await this.getRequiredReturnDate();
            
            if (!data || !data.required_return_date) {
                return {
                    hasRequiredDate: false,
                    requiredDate: null,
                    reason: null,
                    status: null,
                    validation: null
                };
            }

            // Utils 함수를 통한 상태 정보 생성
            let status = null;
            if (window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                status = utils.getRequiredReturnStatus(data.required_return_date);
            }

            return {
                hasRequiredDate: true,
                requiredDate: data.required_return_date,
                reason: data.required_return_reason || '프로그램 종료 요구사항',
                userName: data.name,
                userEmail: data.email,
                status: status,
                validation: {
                    isOverdue: status?.status === 'overdue',
                    isToday: status?.status === 'today',
                    isUrgent: status?.status === 'urgent',
                    daysRemaining: status ? window.flightRequestUtils?.calculateDaysUntilRequired(data.required_return_date) : null
                }
            };

        } catch (error) {
            console.error('❌ 귀국 필수 완료일 상태 조회 실패:', error);
            return {
                hasRequiredDate: false,
                requiredDate: null,
                reason: null,
                status: null,
                validation: null,
                error: error.message
            };
        }
    }

    /**
     * 🆕 v8.3.0: 귀국일 제약사항 검증 (서버 측 검증)
     * @param {string} returnDate - 검증할 귀국일
     * @returns {Object} 검증 결과
     */
    async validateReturnDateConstraints(returnDate) {
        try {
            if (!returnDate) {
                return {
                    valid: false,
                    message: '귀국일을 입력해주세요.',
                    constraint: 'MISSING_DATE'
                };
            }

            // 귀국 필수 완료일 정보 조회
            const requiredInfo = await this.getRequiredReturnDateWithStatus();
            
            if (!requiredInfo.hasRequiredDate) {
                // 필수 완료일이 설정되지 않은 경우 기본 검증만 수행
                return {
                    valid: true,
                    message: '귀국일이 유효합니다.',
                    constraint: 'NO_CONSTRAINT'
                };
            }

            // Utils 함수를 통한 검증
            let validation = { valid: true, message: '귀국일이 유효합니다.' };
            if (window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                validation = utils.validateRequiredReturnDate(returnDate, requiredInfo.requiredDate);
            }

            return {
                valid: validation.valid,
                message: validation.message,
                warning: validation.warning,
                constraint: validation.valid ? 'VALID' : 'REQUIRED_DATE_EXCEEDED',
                requiredDate: requiredInfo.requiredDate,
                requiredReason: requiredInfo.reason,
                status: requiredInfo.status
            };

        } catch (error) {
            console.error('❌ 귀국일 제약사항 검증 실패:', error);
            return {
                valid: false,
                message: '귀국일 검증 중 오류가 발생했습니다.',
                constraint: 'VALIDATION_ERROR',
                error: error.message
            };
        }
    }

    // === 🆕 v8.2.1: 현지 활동기간 관리 API ===

    /**
     * 사용자의 현지 활동기간 정보를 user_profiles 테이블에 업데이트
     */
    async updateUserProfileActivityDates(activityData) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            if (!activityData?.actualArrivalDate || !activityData?.actualWorkEndDate) {
                throw new Error('현지 도착일과 학당 근무 종료일을 모두 입력해주세요');
            }

            const updateData = {
                actual_arrival_date: activityData.actualArrivalDate,
                actual_work_end_date: activityData.actualWorkEndDate,
                actual_work_days: activityData.actualWorkDays || 0,
                minimum_required_days: activityData.minimumRequiredDays || 180,
                updated_at: new Date().toISOString()
            };

            if (this.core?.update) {
                const result = await this.core.update('user_profiles', updateData, { 
                    auth_user_id: this.user.id 
                });
                if (!result.success) throw new Error(result.error);
                return { success: true, data: result.data[0] };
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .update(updateData)
                .eq('auth_user_id', this.user.id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data };

        } catch (error) {
            console.error('❌ 활동기간 업데이트 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 현재 사용자의 활동기간 정보 조회
     */
    async getUserProfileActivityDates() {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            const selectColumns = [
                'actual_arrival_date', 'actual_work_end_date', 'actual_work_days',
                'minimum_required_days', 'dispatch_start_date', 'dispatch_end_date',
                'dispatch_duration', 'required_return_date', 'required_return_reason', // 🆕 v8.3.0
                'updated_at'
            ].join(', ');

            if (this.core?.select) {
                const result = await this.core.select('user_profiles', selectColumns, { 
                    auth_user_id: this.user.id 
                });
                if (!result.success && !result.error.includes('PGRST116')) {
                    throw new Error(result.error);
                }
                return result.data?.length > 0 ? result.data[0] : null;
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(selectColumns)
                .eq('auth_user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;

        } catch (error) {
            console.error('❌ 활동기간 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자별 최소 요구 활동일 조회
     */
    async getRequiredActivityDays() {
        try {
            const profileData = await this.getUserProfileActivityDates();
            return profileData?.minimum_required_days || 180;
        } catch (error) {
            console.error('❌ 최소 요구일 조회 실패:', error);
            return 180; // 기본값
        }
    }

    /**
     * 🔄 v8.3.0: 활동기간 데이터의 서버 측 검증 (귀국 필수 완료일 포함)
     */
    async validateActivityPeriodAPI(activityData) {
        try {
            // Utils 함수 활용한 클라이언트 측 검증
            if (window.FlightRequestUtils) {
                const utils = window.flightRequestUtils || new window.FlightRequestUtils();
                
                // 🆕 v8.3.0: 귀국 필수 완료일 정보 포함
                const requiredInfo = await this.getRequiredReturnDateWithStatus();
                const validationDates = {
                    ...activityData,
                    requiredReturnDate: requiredInfo.requiredDate
                };

                const clientValidation = utils.validateAllDates(validationDates);
                const requiredDays = await this.getRequiredActivityDays();

                return {
                    success: true,
                    clientValidation: clientValidation,
                    requiredReturnInfo: requiredInfo,
                    serverValidation: {
                        requiredDays: requiredDays,
                        canSubmit: clientValidation.valid,
                        hasRequiredReturnDate: requiredInfo.hasRequiredDate,
                        isReturnDateValid: !requiredInfo.validation?.isOverdue
                    }
                };
            }

            // Utils 없을 때 기본 검증
            const arrivalDate = new Date(activityData.actualArrivalDate);
            const workEndDate = new Date(activityData.actualWorkEndDate);
            const activityDays = Math.ceil((workEndDate - arrivalDate) / (1000 * 60 * 60 * 24));
            const requiredDays = await this.getRequiredActivityDays();

            return {
                success: true,
                basicValidation: {
                    valid: activityDays >= requiredDays,
                    activityDays: activityDays,
                    requiredDays: requiredDays
                }
            };

        } catch (error) {
            console.error('❌ 활동기간 검증 실패:', error);
            return { success: false, error: error.message };
        }
    }

    // === 여권정보 관리 ===

    async getPassportInfo() {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            if (this.core?.select) {
                const result = await this.core.select('passport_info', '*', { user_id: this.user.id });
                if (!result.success && !result.error.includes('PGRST116')) {
                    throw new Error(result.error);
                }
                return result.data?.length > 0 ? result.data[0] : null;
            }

            const { data, error } = await this.supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;

        } catch (error) {
            console.error('❌ 여권정보 조회 실패:', error);
            throw error;
        }
    }

    async checkPassportInfo() {
        try {
            const passportInfo = await this.getPassportInfo();
            return !!passportInfo;
        } catch (error) {
            console.error('❌ 여권정보 확인 실패:', error);
            return false;
        }
    }

    async savePassportInfo(passportData, imageFile = null) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            // 기존 정보 확인
            let existingInfo = null;
            try {
                existingInfo = await this.getPassportInfo();
            } catch (error) {
                existingInfo = null;
            }
            
            let imageUrl = existingInfo?.image_url;

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                // 기존 이미지 삭제 시도
                if (imageUrl) {
                    try {
                        const fileName = imageUrl.split('/').pop();
                        if (fileName && fileName.includes('passport_')) {
                            await this.deleteFile('passports', fileName);
                        }
                    } catch (deleteError) {
                        console.warn('⚠️ 기존 이미지 삭제 실패:', deleteError);
                    }
                }
                
                imageUrl = await this.uploadPassportImage(imageFile);
            }

            const dataToSave = {
                user_id: this.user.id,
                passport_number: passportData.passport_number,
                name_english: passportData.name_english,
                issue_date: passportData.issue_date,
                expiry_date: passportData.expiry_date,
                image_url: imageUrl,
                updated_at: new Date().toISOString()
            };

            let result;
            let isUpdate = false;

            if (existingInfo) {
                isUpdate = true;
                result = await this.updateData('passport_info', dataToSave, { id: existingInfo.id });
            } else {
                result = await this.insertData('passport_info', dataToSave);
            }

            return { data: result, isUpdate: isUpdate };
        } catch (error) {
            console.error('❌ 여권정보 저장 실패:', error);
            throw error;
        }
    }

    async uploadPassportImage(imageFile) {
        try {
            const fileName = `passport_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            return await this.uploadFile('passports', fileName, imageFile, { upsert: true });
        } catch (error) {
            console.error('여권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    validateExpiryDate(expiryDate) {
        if (!expiryDate) {
            return { valid: false, message: '여권 만료일을 입력해주세요.' };
        }

        try {
            const today = new Date();
            const expiry = new Date(expiryDate);
            const sixMonthsFromNow = new Date();
            sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

            if (isNaN(expiry.getTime())) {
                return { valid: false, message: '올바른 날짜 형식이 아닙니다.' };
            }

            if (expiry < today) {
                return { valid: false, message: '여권이 이미 만료되었습니다.' };
            }

            if (expiry < sixMonthsFromNow) {
                const remainingDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
                return { 
                    valid: true, 
                    warning: `⚠️ 여권 만료일이 6개월 이내입니다. (${remainingDays}일 남음)` 
                };
            }

            return { valid: true, message: '여권 만료일이 유효합니다.' };
        } catch (error) {
            return { valid: false, message: '만료일 검증 중 오류가 발생했습니다.' };
        }
    }

    // === 항공권 신청 관리 ===

    async getExistingRequest() {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            const { data, error } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;

        } catch (error) {
            console.error('❌ 기존 신청 조회 실패:', error);
            return null;
        }
    }

    async createFlightRequest(requestData, imageFile) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            // 🆕 v8.3.0: 귀국일 제약사항 사전 검증
            if (requestData.return_date) {
                const constraintValidation = await this.validateReturnDateConstraints(requestData.return_date);
                if (!constraintValidation.valid) {
                    throw new Error(`귀국일 제약사항 위반: ${constraintValidation.message}`);
                }
            }

            let imageUrl = null;
            if (imageFile) {
                imageUrl = await this.uploadFlightImage(imageFile);
            }

            const dataToSave = {
                user_id: this.user.id,
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                flight_image_url: imageUrl,
                purchase_link: requestData.purchase_link || null,
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
                status: 'pending'
            };

            const flightRequestResult = await this.insertData('flight_requests', dataToSave);

            // 활동기간 데이터가 있으면 user_profiles도 업데이트
            if (requestData.actualArrivalDate && requestData.actualWorkEndDate) {
                const activityData = {
                    actualArrivalDate: requestData.actualArrivalDate,
                    actualWorkEndDate: requestData.actualWorkEndDate,
                    actualWorkDays: requestData.actualWorkDays || 0,
                    minimumRequiredDays: requestData.minimumRequiredDays || 180
                };

                try {
                    await this.updateUserProfileActivityDates(activityData);
                } catch (activityError) {
                    console.warn('⚠️ 활동기간 업데이트 실패 (항공권 신청은 성공):', activityError);
                }
            }

            return flightRequestResult;

        } catch (error) {
            console.error('❌ 항공권 신청 생성 실패:', error);
            throw error;
        }
    }

    async updateFlightRequest(requestId, requestData, imageFile = null) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            // 🆕 v8.3.0: 귀국일 제약사항 사전 검증
            if (requestData.return_date) {
                const constraintValidation = await this.validateReturnDateConstraints(requestData.return_date);
                if (!constraintValidation.valid) {
                    throw new Error(`귀국일 제약사항 위반: ${constraintValidation.message}`);
                }
            }

            let updateData = {
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                purchase_link: requestData.purchase_link || null,
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
                status: requestData.status || 'pending',
                updated_at: new Date().toISOString()
            };

            if (imageFile) {
                updateData.flight_image_url = await this.uploadFlightImage(imageFile);
            }

            const { data, error } = await this.supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .in('status', ['pending', 'rejected'])
                .select()
                .single();

            if (error) throw error;

            // 활동기간 데이터가 있으면 user_profiles도 업데이트
            if (requestData.actualArrivalDate && requestData.actualWorkEndDate) {
                const activityData = {
                    actualArrivalDate: requestData.actualArrivalDate,
                    actualWorkEndDate: requestData.actualWorkEndDate,
                    actualWorkDays: requestData.actualWorkDays || 0,
                    minimumRequiredDays: requestData.minimumRequiredDays || 180
                };

                try {
                    await this.updateUserProfileActivityDates(activityData);
                } catch (activityError) {
                    console.warn('⚠️ 활동기간 업데이트 실패 (항공권 수정은 성공):', activityError);
                }
            }

            return data;
        } catch (error) {
            console.error('❌ 항공권 신청 수정 실패:', error);
            throw error;
        }
    }

    async deleteFlightRequest(requestId) {
        try {
            await this.ensureInitialized();
            if (!this.user) await this.getCurrentUser();

            // 기존 신청 확인
            const { data: existingRequest, error: fetchError } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .single();

            if (fetchError) throw new Error('삭제할 신청을 찾을 수 없습니다');
            if (!['pending', 'rejected'].includes(existingRequest.status)) {
                throw new Error(`${existingRequest.status} 상태의 신청은 삭제할 수 없습니다`);
            }

            // 관련 이미지 파일 삭제 시도
            if (existingRequest.flight_image_url) {
                try {
                    const fileName = existingRequest.flight_image_url.split('/').pop();
                    if (fileName && fileName.includes('flight_')) {
                        await this.deleteFile('flight-images', fileName);
                    }
                } catch (imageDeleteError) {
                    console.warn('⚠️ 이미지 파일 삭제 실패:', imageDeleteError);
                }
            }

            // 신청 레코드 삭제
            const { error: deleteError } = await this.supabase
                .from('flight_requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', this.user.id);

            if (deleteError) throw deleteError;

            return {
                success: true,
                deletedRequest: {
                    id: existingRequest.id,
                    status: existingRequest.status
                }
            };

        } catch (error) {
            console.error('❌ 항공권 신청 삭제 실패:', error);
            throw error;
        }
    }

    async uploadFlightImage(imageFile) {
        try {
            const fileName = `flight_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            return await this.uploadFile('flight-images', fileName, imageFile);
        } catch (error) {
            console.error('항공권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // === 데이터 조작 유틸리티 ===

    async insertData(table, data) {
        if (this.core?.insert) {
            const result = await this.core.insert(table, data);
            if (!result.success) throw new Error(result.error);
            return result.data[0];
        }

        const { data: result, error } = await this.supabase
            .from(table)
            .insert(data)
            .select()
            .single();
        
        if (error) throw error;
        return result;
    }

    async updateData(table, data, filters) {
        if (this.core?.update) {
            const result = await this.core.update(table, data, filters);
            if (!result.success) throw new Error(result.error);
            return result.data[0];
        }

        let query = this.supabase.from(table).update(data);
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const { data: result, error } = await query.select().single();
        if (error) throw error;
        return result;
    }

    async uploadFile(bucket, path, file, options = {}) {
        try {
            if (this.core?.uploadFile) {
                const result = await this.core.uploadFile(bucket, path, file, options);
                if (!result.success) throw new Error(result.error);

                const urlResult = await this.core.getFileUrl(bucket, path);
                if (!urlResult.success) throw new Error(urlResult.error);
                return urlResult.url;
            }

            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: options.upsert || false,
                    ...options
                });

            if (error) throw error;

            const { data: urlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            return urlData.publicUrl;

        } catch (error) {
            console.error(`❌ 파일 업로드 실패 (${bucket}/${path}):`, error);
            throw error;
        }
    }

    async deleteFile(bucket, path) {
        try {
            if (this.core?.deleteFile) {
                const result = await this.core.deleteFile(bucket, path);
                if (!result.success) throw new Error(result.error);
                return result;
            }

            const { error } = await this.supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`❌ 파일 삭제 실패 (${bucket}/${path}):`, error);
            throw error;
        }
    }

    // === 상태 정보 ===
    getStatus() {
        return {
            version: 'v8.3.0',
            isInitialized: this.isInitialized,
            hasCore: !!this.core,
            hasSupabase: !!this.supabase,
            hasUser: !!this.user,
            userInfo: this.user ? { 
                id: this.user.id, 
                email: this.user.email, 
                name: this.user.name
            } : null,
            newFeatures: [ // 🆕 v8.3.0
                'Required return date validation',
                'Return date constraint checking',
                'Enhanced server-side validation',
                'Integrated constraint management'
            ]
        };
    }
}

// 전역 스코프에 노출
window.FlightRequestAPI = FlightRequestAPI;

// 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.3.0 인스턴스 생성 시작...');
        window.flightRequestAPI = new FlightRequestAPI();
        window.passportAPI = window.flightRequestAPI; // 호환성
        console.log('✅ FlightRequestAPI v8.3.0 인스턴스 생성 완료');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 즉시 생성
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 100);
    });
} else {
    setTimeout(createFlightRequestAPI, 100);
}

console.log('✅ FlightRequestAPI v8.3.0 모듈 로드 완료 - 귀국 필수 완료일 제약사항 기능 추가');
console.log('🆕 v8.3.0 새로운 기능:', {
    requiredReturnDate: '개인별 귀국 필수 완료일 조회 API',
    constraintValidation: '귀국일 제약사항 서버 측 검증',
    enhancedSecurity: '신청 생성/수정 시 사전 검증',
    statusIntegration: 'Utils와 연동된 상태 관리'
});
