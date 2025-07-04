// flight-request-api.js - 항공권 신청 API v8.6.0
// v8.6.0: 가격 정보 처리 기능 추가

class FlightRequestAPI {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
        this.initError = null;
        this.initStartTime = Date.now();
        
        console.log('🚀 FlightRequestAPI v8.6.0 초기화 시작 (가격 정보 기능 포함)...');
        this.ensureInitialized();
    }

    // 초기화 보장
    async ensureInitialized() {
        if (this.isInitialized) {
            return true;
        }

        try {
            console.log('🔄 FlightRequestAPI v8.6.0 Supabase 연결 시도...');
            
            // Supabase 인스턴스 확인
            let attempts = 0;
            const maxAttempts = 100;
            
            while (!this.supabase && attempts < maxAttempts) {
                // 다양한 경로로 Supabase 인스턴스 확인
                if (window.SupabaseCore?.supabase) {
                    this.supabase = window.SupabaseCore.supabase;
                    break;
                } else if (window.SupabaseAPI?.supabase) {
                    this.supabase = window.SupabaseAPI.supabase;
                    break;
                } else if (window.supabase) {
                    this.supabase = window.supabase;
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!this.supabase) {
                throw new Error('Supabase 인스턴스를 찾을 수 없습니다');
            }

            // 연결 테스트
            const { data: testData } = await this.supabase
                .from('user_profiles')
                .select('id')
                .limit(1);
            
            this.isInitialized = true;
            console.log('✅ FlightRequestAPI v8.6.0 초기화 완료');
            
            return true;

        } catch (error) {
            this.initError = error;
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            
            // 5초 후 재시도
            setTimeout(() => {
                if (!this.isInitialized) {
                    console.log('🔄 FlightRequestAPI 재초기화 시도...');
                    this.ensureInitialized();
                }
            }, 5000);
            
            return false;
        }
    }

    // 초기화 상태 확인
    getInitializationStatus() {
        const elapsedTime = Date.now() - this.initStartTime;
        return {
            isInitialized: this.isInitialized,
            hasSupabase: !!this.supabase,
            initError: this.initError,
            elapsedTime: elapsedTime
        };
    }

    // 현재 사용자 정보 가져오기
    async getCurrentUser() {
        console.log('👤 [API디버그] 현재 사용자 정보 조회 시작...');
        
        try {
            // localStorage에서 사용자 정보 확인
            const userData = localStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                console.log('✅ [API디버그] localStorage에서 사용자 정보 확인:', {
                    userId: user.id,
                    name: user.name,
                    email: user.email
                });
                return user;
            }

            console.warn('⚠️ [API디버그] localStorage에 사용자 정보 없음');
            return null;

        } catch (error) {
            console.error('❌ [API디버그] 사용자 정보 조회 실패:', error);
            return null;
        }
    }

    // 여권 정보 조회
    async getPassportInfo(userId) {
        console.log('🛂 [API디버그] 여권정보 조회 시작:', userId);
        
        if (!await this.ensureInitialized()) {
            throw new Error('API가 초기화되지 않았습니다');
        }

        try {
            const { data, error } = await this.supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                console.log('✅ [API디버그] 여권정보 조회 성공');
                return data;
            } else {
                console.log('📋 [API디버그] 여권정보 없음');
                return null;
            }

        } catch (error) {
            console.error('❌ [API디버그] 여권정보 조회 실패:', error);
            throw error;
        }
    }

    // 기존 항공권 신청 조회
    async getExistingRequest(userId) {
        console.log('✈️ [API디버그] 기존 항공권 신청 조회 시작:', userId);
        
        if (!await this.ensureInitialized()) {
            throw new Error('API가 초기화되지 않았습니다');
        }

        try {
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                console.log('✅ [API디버그] 기존 항공권 신청 조회 성공');
                return data[0];
            } else {
                console.log('📋 [API디버그] 기존 항공권 신청 없음');
                return null;
            }

        } catch (error) {
            console.error('❌ [API디버그] 기존 항공권 신청 조회 실패:', error);
            throw error;
        }
    }

    // 🆕 v8.6.0: 가격 정보 유효성 검증
    validatePriceFields(requestData) {
        console.log('💰 [API디버그] 가격 정보 검증 시작:', {
            ticket_price: requestData.ticket_price,
            currency: requestData.currency,
            price_source: requestData.price_source
        });

        const errors = [];

        // 항공료 검증
        if (!requestData.ticket_price || requestData.ticket_price <= 0) {
            errors.push('항공료를 올바르게 입력해주세요.');
        } else if (requestData.ticket_price > 50000) {
            errors.push('항공료가 너무 높습니다. (최대 50,000)');
        }

        // 통화 검증
        if (!requestData.currency) {
            errors.push('통화를 선택해주세요.');
        } else {
            const supportedCurrencies = ['KRW', 'USD', 'CNY', 'JPY', 'EUR', 'THB', 'VND', 'SGD', 'MYR', 'PHP', 'IDR', 'INR', 'AUD', 'GBP', 'CAD'];
            if (!supportedCurrencies.includes(requestData.currency.toUpperCase())) {
                errors.push('지원하지 않는 통화입니다.');
            }
        }

        // 가격 출처 검증
        if (!requestData.price_source || requestData.price_source.trim().length === 0) {
            errors.push('가격 출처를 입력해주세요.');
        } else if (requestData.price_source.length > 200) {
            errors.push('가격 출처는 200자를 초과할 수 없습니다.');
        }

        if (errors.length > 0) {
            console.warn('⚠️ [API디버그] 가격 정보 검증 실패:', errors);
            return { valid: false, errors };
        }

        console.log('✅ [API디버그] 가격 정보 검증 성공');
        return { valid: true };
    }

    // 🆕 v8.6.0: 통화별 가격 범위 검증
    validatePriceByCurrency(price, currency) {
        console.log('💱 [API디버그] 통화별 가격 범위 검증:', { price, currency });

        // FlightRequestUtils가 있으면 사용
        if (window.FlightRequestUtils) {
            try {
                const priceValidation = window.FlightRequestUtils.validatePrice(price);
                const currencyValidation = window.FlightRequestUtils.validateCurrency(currency);
                
                if (!priceValidation.valid) {
                    return { valid: false, message: priceValidation.message };
                }
                
                if (!currencyValidation.valid) {
                    return { valid: false, message: currencyValidation.message };
                }
                
                console.log('✅ [API디버그] FlightRequestUtils를 통한 검증 성공');
                return { valid: true };
                
            } catch (error) {
                console.warn('⚠️ [API디버그] FlightRequestUtils 검증 중 오류:', error);
            }
        }

        // 기본 검증
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0 || numPrice > 50000) {
            return { valid: false, message: '가격은 0~50,000 범위여야 합니다.' };
        }

        console.log('✅ [API디버그] 기본 가격 범위 검증 성공');
        return { valid: true };
    }

    // 항공권 신청 생성 (v8.6.0: 가격 정보 포함)
    async createFlightRequest(requestData) {
        console.log('📝 [API디버그] 항공권 신청 생성 시작 (v8.6.0 가격 정보 포함)...');
        
        if (!await this.ensureInitialized()) {
            throw new Error('API가 초기화되지 않았습니다');
        }

        try {
            // 🆕 v8.6.0: 가격 정보 검증
            const priceValidation = this.validatePriceFields(requestData);
            if (!priceValidation.valid) {
                throw new Error(`가격 정보 검증 실패: ${priceValidation.errors.join(', ')}`);
            }

            // 통화별 가격 범위 검증
            const priceRangeValidation = this.validatePriceByCurrency(
                requestData.ticket_price, 
                requestData.currency
            );
            
            if (!priceRangeValidation.valid) {
                console.warn('⚠️ [API디버그] 가격 범위 경고:', priceRangeValidation.message);
                // 경고만 하고 계속 진행 (사용자가 확인했다고 가정)
            }

            // 🆕 v8.6.0: 가격 정보를 포함한 데이터 준비
            const insertData = {
                user_id: requestData.user_id,
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                flight_image_url: requestData.flight_image_url,
                ticket_price: parseFloat(requestData.ticket_price), // 🆕 숫자로 변환
                currency: requestData.currency.toUpperCase(), // 🆕 대문자로 변환
                price_source: requestData.price_source, // 🆕 가격 출처
                status: 'pending'
            };

            // 구매 대행일 때만 purchase_link 추가
            if (requestData.purchase_type === 'agency' && requestData.purchase_link) {
                insertData.purchase_link = requestData.purchase_link;
            }

            console.log('🔄 [API디버그] 데이터베이스 삽입 실행:', insertData);

            const { data, error } = await this.supabase
                .from('flight_requests')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ [API디버그] 항공권 신청 생성 성공 (v8.6.0 가격 정보 포함)');
            return data;

        } catch (error) {
            console.error('❌ [API디버그] 항공권 신청 생성 실패:', error);
            throw error;
        }
    }

    // 항공권 신청 수정 (v8.6.0: 가격 정보 포함)
    async updateFlightRequest(requestId, requestData) {
        console.log('📝 [API디버그] 항공권 신청 수정 시작 (v8.6.0 가격 정보 포함):', requestId);
        
        if (!await this.ensureInitialized()) {
            throw new Error('API가 초기화되지 않았습니다');
        }

        try {
            // 🆕 v8.6.0: 가격 정보 검증 (가격 정보가 있는 경우에만)
            if (requestData.ticket_price && requestData.currency) {
                const priceValidation = this.validatePriceFields(requestData);
                if (!priceValidation.valid) {
                    throw new Error(`가격 정보 검증 실패: ${priceValidation.errors.join(', ')}`);
                }
            }

            // 🆕 v8.6.0: 가격 정보를 포함한 업데이트 데이터 준비
            const updateData = {
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                flight_image_url: requestData.flight_image_url,
                updated_at: new Date().toISOString()
            };

            // 🆕 v8.6.0: 가격 정보 추가 (있는 경우에만)
            if (requestData.ticket_price) {
                updateData.ticket_price = parseFloat(requestData.ticket_price);
            }
            if (requestData.currency) {
                updateData.currency = requestData.currency.toUpperCase();
            }
            if (requestData.price_source) {
                updateData.price_source = requestData.price_source;
            }

            // 구매 대행일 때만 purchase_link 추가
            if (requestData.purchase_type === 'agency' && requestData.purchase_link) {
                updateData.purchase_link = requestData.purchase_link;
            }

            console.log('🔄 [API디버그] 데이터베이스 업데이트 실행:', updateData);

            const { data, error } = await this.supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ [API디버그] 항공권 신청 수정 성공 (v8.6.0 가격 정보 포함)');
            return data;

        } catch (error) {
            console.error('❌ [API디버그] 항공권 신청 수정 실패:', error);
            throw error;
        }
    }

    // 파일 업로드
    async uploadFile(file, bucketName, fileName) {
        console.log('📁 [API디버그] 파일 업로드 시작:', { bucketName, fileName, fileSize: file.size });
        
        if (!await this.ensureInitialized()) {
            throw new Error('API가 초기화되지 않았습니다');
        }

        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // 공개 URL 생성
            const { data: urlData } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            console.log('✅ [API디버그] 파일 업로드 성공:', urlData.publicUrl);
            return urlData.publicUrl;

        } catch (error) {
            console.error('❌ [API디버그] 파일 업로드 실패:', error);
            throw error;
        }
    }

    // 강제 재초기화
    async forceReinitialize() {
        console.log('🔄 [API디버그] 강제 재초기화 시작...');
        this.isInitialized = false;
        this.supabase = null;
        this.initError = null;
        return await this.ensureInitialized();
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.FlightRequestAPI = FlightRequestAPI;
    console.log('✅ FlightRequestAPI v8.6.0 클래스 로드 완료 (가격 정보 기능 포함)');
}
