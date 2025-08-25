// 🚀 Supabase 학생 전용 기능 모듈 v4.3.1 - 콘솔 로그 정리
// 학생 인증, 교구 신청, 영수증 관리, 수업계획, 배송지 관리 등
// SupabaseCore에 의존하는 학생 전용 모듈
// 🔧 v4.3.0 - requests 테이블 구조 호환성 업데이트 및 4가지 타입별 최적화
// 🧹 v4.3.1 - 학생 사용 환경을 위한 콘솔 로그 정리 (오류/경고만 유지)

const SupabaseStudent = {
    // SupabaseCore 의존성 확인
    get core() {
        if (!window.SupabaseCore) {
            throw new Error('SupabaseCore가 로드되지 않았습니다. supabase-core.js를 먼저 로드해주세요.');
        }
        return window.SupabaseCore;
    },

    // ===================
    // 학생 인증
    // ===================
    async authenticateStudent(name, birthDate) {
        const result = await this.core.safeApiCall('학생 인증', async () => {
            const client = await this.core.ensureClient();
            const { data, error } = await client
                .from('user_profiles')
                .select(`
                    id, name, birth_date, password_hash, password_set_at, password_updated_at,
                    user_type, field, sejong_institute, email, phone,
                    individual_flight_request_enabled,
                    individual_equipment_request_enabled,
                    individual_visa_management_enabled,
                    individual_reimbursement_request_enabled,
                    individual_required_documents_enabled,
                    minimum_required_days, maximum_allowed_days
                `)
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate);

            if (error) {
                return { data: null, error };
            }

            const user = data && data.length > 0 ? data[0] : null;
            return { data: user, error: null };
        });

        if (result.success && result.data) {
            this.core.currentUser = result.data;
            this.core.currentUserType = 'student';
        }

        return result;
    },

    // ===================
    // 🔐 비밀번호 지원 학생 인증 (신규)
    // ===================
    async authenticateStudentWithPassword(name, birthDate, password = null) {
        const result = await this.core.safeApiCall('비밀번호 지원 학생 인증', async () => {
            const client = await this.core.ensureClient();
            
            // 1. 기본 사용자 조회 (비밀번호 해시 포함)
            const { data, error } = await client
                .from('user_profiles')
                .select('id, name, birth_date, password_hash, password_set_at, password_updated_at, user_type, field, sejong_institute, individual_flight_request_enabled, individual_equipment_request_enabled, individual_reimbursement_request_enabled, minimum_required_days, maximum_allowed_days, individual_visa_management_enabled, individual_required_documents_enabled')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate);

            if (error) {
                return { data: null, error };
            }

            if (!data || data.length === 0) {
                return { 
                    data: null, 
                    error: { message: '등록되지 않은 사용자입니다.' }
                };
            }

            const user = data[0];

            // 2. 비밀번호 설정 여부 확인 및 검증
            if (user.password_hash) {
                // 비밀번호가 설정된 사용자
                if (!password) {
                    return { 
                        data: null, 
                        error: { 
                            message: '비밀번호를 입력해주세요.',
                            requirePassword: true
                        }
                    };
                }
                
                // 비밀번호 검증
                const hashedInputPassword = await this.hashPassword(password);
                if (hashedInputPassword !== user.password_hash) {
                    return { 
                        data: null, 
                        error: { message: '비밀번호가 일치하지 않습니다.' }
                    };
                }
            }

            // 3. 인증 성공 - hasPassword 정보 추가
            const userWithPasswordInfo = {
                ...user,
                hasPassword: !!user.password_hash
            };

            return { data: userWithPasswordInfo, error: null };
        });

        if (result.success && result.data) {
            this.core.currentUser = result.data;
            this.core.currentUserType = 'student';
        }

        return result;
    },

    // 🔐 비밀번호 해시화 함수 (SHA-256 + Salt)
    async hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const salt = 'sejong_cultural_intern_2025'; // dashboard-password.js와 동일한 솔트
            const data = encoder.encode(password + salt);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('❌ 비밀번호 해시화 실패:', error);
            throw new Error('비밀번호 암호화에 실패했습니다.');
        }
    },

    // 🔍 비밀번호 설정 여부 확인 함수 (index.html용)
    async checkPasswordRequired(name, birthDate) {
        const result = await this.core.safeApiCall('비밀번호 필요 여부 확인', async () => {
            const client = await this.core.ensureClient();
            const { data, error } = await client
                .from('user_profiles')
                .select('password_hash')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate);

            if (error || !data || data.length === 0) {
                return { 
                    data: { found: false }, 
                    error: null 
                };
            }

            return { 
                data: { 
                    found: true, 
                    requirePassword: !!data[0].password_hash 
                }, 
                error: null 
            };
        });

        return result.data || { found: false };
    },    
    
    
    // ===================
    // 🔧 배송지 정보 관리 - UPSERT 로직 완전 수정
    // ===================
    
    // 🔧 배송지 정보 조회 - 올바른 컬럼명 사용
    async getShippingInfo(userId) {
        const result = await this.core.safeApiCall('배송지 정보 조회', async () => {
            const client = await this.core.ensureClient();
            const { data, error } = await client
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            // PGRST116은 데이터 없음을 의미하므로 정상 처리
            if (error && error.code === 'PGRST116') {
                return { data: null, error: null };
            }

            return { data, error };
        });

        if (result.success && result.data) {
            // 🔧 DB 컬럼명을 코드에서 사용하는 형태로 매핑
            const mappedData = {
                ...result.data,
                postcode: result.data.postal_code,  // postal_code → postcode
                note: result.data.delivery_note     // delivery_note → note
            };
            return mappedData;
        }

        return result.success ? result.data : null;
    },

    // 🔧 배송지 정보 저장 - 진짜 UPSERT 사용으로 중복 키 오류 해결
    async saveShippingInfo(userId, shippingData) {
        return await this.core.safeApiCall('배송지 정보 저장', async () => {
            const client = await this.core.ensureClient();
            // 🔧 코드에서 사용하는 컬럼명을 DB 컬럼명으로 매핑
            const dataToSave = {
                user_id: userId,
                recipient_name: shippingData.recipient_name,
                phone: shippingData.phone,
                address: shippingData.address,
                postal_code: shippingData.postcode || null,      // postcode → postal_code
                delivery_note: shippingData.note || null,        // note → delivery_note
                updated_at: new Date().toISOString()
            };

            // 🔧 진짜 UPSERT 사용 - onConflict로 user_id 중복 시 업데이트
            return await client
                .from('shipping_addresses')
                .upsert(dataToSave, {
                    onConflict: 'user_id',           // user_id 중복 시 업데이트
                    ignoreDuplicates: false          // 중복 시 무시하지 않고 업데이트
                })
                .select();
        });
    },

    // ===================
    // 🚀 영수증 관리 시스템 - v4.1.5 최적화된 테이블 호환
    // ===================

    // 🔧 v4.1.1 - 학생의 다음 영수증 순번 가져오기
    async getNextReceiptNumber(userId) {
        try {
            const client = await this.core.ensureClient();
            
            // 해당 학생의 영수증 개수 조회 (receipts 테이블에서)
            const { data, error } = await client
                .from('receipts')
                .select('id', { count: 'exact' })
                .eq('user_id', userId);

            if (error) {
                console.error('❌ 영수증 개수 조회 실패:', error);
                // 오류 발생 시 기본값 1 반환
                return 1;
            }

            // 기존 영수증 개수 + 1이 다음 순번
            const nextNumber = (data?.length || 0) + 1;
            
            return nextNumber;
            
        } catch (error) {
            console.error('❌ 다음 영수증 순번 조회 오류:', error);
            // 오류 발생 시 기본값 1 반환
            return 1;
        }
    },

    // 🚀 v4.1.1 - 교구 신청 가격 조회 (파일명 생성용)
    async getRequestPrice(requestId) {
        try {
            const client = await this.core.ensureClient();
            
            const { data, error } = await client
                .from('requests')
                .select('price')
                .eq('id', requestId)
                .single();

            if (error) {
                console.error('❌ 교구 가격 조회 실패:', error);
                // 오류 발생 시 기본값 0 반환
                return 0;
            }

            const price = data?.price || 0;
            
            return price;
            
        } catch (error) {
            console.error('❌ 교구 가격 조회 오류:', error);
            // 오류 발생 시 기본값 0 반환
            return 0;
        }
    },

    // 🚀 v4.1.5 - 영수증 파일 업로드 (receipt-management.js 호환)
    async uploadReceiptFile(file, requestId, userId) {
        try {
            const client = await this.core.ensureClient();
            
            // 1. 기본 정보 수집
            const receiptNumber = await this.getNextReceiptNumber(userId);
            const requestPrice = await this.getRequestPrice(requestId);
            
            // 2. 파일 확장자 추출
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            
            // 3. 새로운 파일명 생성: 순번_가격.확장자
            const paddedNumber = receiptNumber.toString().padStart(3, '0');
            const fileName = `${paddedNumber}_${requestPrice}.${fileExtension}`;
            
            // 4. Storage 경로 생성
            const filePath = `receipts/${userId}/${fileName}`;

            // 5. Supabase Storage에 파일 업로드
            const { data: uploadData, error: uploadError } = await client.storage
                .from('receipt-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('❌ 파일 업로드 실패:', uploadError);
                throw uploadError;
            }

            // 6. 업로드된 파일의 공개 URL 가져오기
            const { data: urlData } = client.storage
                .from('receipt-files')
                .getPublicUrl(filePath);

            const fileUrl = urlData?.publicUrl;

            // 🔧 v4.1.5 - receipt-management.js와 호환되는 데이터 구조 반환
            return {
                success: true,
                data: {
                    // 파일 정보
                    filePath: filePath,
                    fileName: fileName,
                    fileUrl: fileUrl,
                    originalName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    
                    // 메타데이터 (receipt-management.js에서 사용)
                    receiptNumber: receiptNumber,
                    requestPrice: requestPrice,      // 🔧 total_amount로 사용됨
                    totalAmount: requestPrice,       // 🔧 v4.1.5 추가 - receipt-management.js 호환
                    userId: userId
                }
            };

        } catch (error) {
            console.error('❌ 영수증 파일 업로드 오류:', error);
            return {
                success: false,
                message: this.core.getErrorMessage(error),
                error: error
            };
        }
    },

    // 🔧 v4.1.5 - 영수증 정보 저장 (최적화된 테이블 구조 호환)
    async saveReceiptInfo(requestId, receiptData) {
        return await this.core.safeApiCall('영수증 정보 저장', async () => {
            const client = await this.core.ensureClient();
            // 🔧 v4.1.5 - 최적화된 receipts 테이블 구조에 맞는 데이터 준비
            const receiptRecord = {
                // 필수 컬럼들
                receipt_number: `${receiptData.receiptNumber || 1}`, // 📋 VARCHAR(50)으로 변환
                purchase_date: receiptData.purchaseDate || new Date().toISOString(),
                total_amount: receiptData.totalAmount || receiptData.requestPrice || 0, // 🔧 totalAmount 우선 사용

                // 연결 컬럼들 (NULL 허용)
                request_id: requestId,
                user_id: receiptData.userId,

                // 파일 정보 (NULL 허용) - 올바른 컬럼명만 사용
                file_url: receiptData.fileUrl,
                file_name: receiptData.fileName,
                original_name: receiptData.originalName,
                file_size: receiptData.fileSize,
                file_type: receiptData.fileType,

                // 메타정보 (NULL 허용) - 올바른 컬럼명 사용
                purchase_store: receiptData.purchaseStore || null,
                note: receiptData.note || null,
                uploaded_at: new Date().toISOString(),

                // 검증 정보는 기본값 사용 (NULL 허용)
                verified: false,
                verified_at: null,
                verified_by: null,

                // 시간 정보
                updated_at: new Date().toISOString()
            };

            // 🔧 제거된 컬럼들 완전 배제:
            // ❌ image_path (제거됨)
            // ❌ file_path (제거됨) 
            // ❌ store_name (제거됨)
            // ❌ notes (제거됨)
            // ❌ created_at (제거됨)
            // ❌ student_name (제거됨)

            // receipts 테이블에 메타데이터 저장
            return await client
                .from('receipts')
                .insert([receiptRecord])
                .select();
        });
    },

    // 🚀 영수증 제출 완료 처리 (신청 상태를 'purchased'로 변경) - 🔧 v2.12 purchased_at 제거
    async completeReceiptSubmission(requestId) {
        return await this.core.safeApiCall('영수증 제출 완료', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('requests')
                .update({
                    // status: 'purchased',
                    // 🔧 v2.12 - purchased_at 컬럼 제거 (오류 수정)
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .select();
        });
    },

    // 🔧 v4.1.5 - 영수증 정보 조회 (최적화된 테이블 호환)
    async getReceiptByRequestId(requestId) {
        const result = await this.core.safeApiCall('영수증 정보 조회', async () => {
            const client = await this.core.ensureClient();
            const { data, error } = await client
                .from('receipts')
                .select(`
                    id,
                    receipt_number,
                    purchase_date,
                    total_amount,
                    request_id,
                    user_id,
                    file_url,
                    file_name,
                    original_name,
                    file_size,
                    file_type,
                    purchase_store,
                    note,
                    uploaded_at,
                    verified,
                    verified_at,
                    verified_by,
                    updated_at,
                    requests:request_id (
                        item_name,
                        price,
                        user_profiles:user_id (
                            name
                        )
                    )
                `)
                .eq('request_id', requestId)
                .single();

            // 영수증이 없는 경우 정상 처리
            if (error && error.code === 'PGRST116') {
                return { data: null, error: null };
            }

            return { data, error };
        });

        if (result.success && result.data) {
            const receipt = result.data;
            return {
                ...receipt,
                item_name: receipt.requests?.item_name,
                item_price: receipt.requests?.price,
                student_name: receipt.requests?.user_profiles?.name
            };
        }

        return result.success ? result.data : null;
    },

    // 🔧 v4.1.5 - 학생별 영수증 목록 조회 (최적화된 테이블 호환)
    async getReceiptsByStudent(userId) {
        const result = await this.core.safeApiCall('학생별 영수증 조회', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('receipts')
                .select(`
                    id,
                    receipt_number,
                    purchase_date,
                    total_amount,
                    request_id,
                    user_id,
                    file_url,
                    file_name,
                    original_name,
                    file_size,
                    file_type,
                    purchase_store,
                    note,
                    uploaded_at,
                    verified,
                    verified_at,
                    verified_by,
                    updated_at,
                    requests:request_id (
                        item_name,
                        price,
                        purchase_type,
                        status
                    )
                `)
                .eq('user_id', userId)
                .order('uploaded_at', { ascending: false });
        });

        if (result.success && result.data) {
            return result.data.map(receipt => ({
                ...receipt,
                item_name: receipt.requests?.item_name,
                item_price: receipt.requests?.price,
                purchase_type: receipt.requests?.purchase_type,
                request_status: receipt.requests?.status
            }));
        }

        return result.success ? (result.data || []) : [];
    },

    // 🚀 영수증 파일 삭제 (필요 시)
    async deleteReceiptFile(filePath) {
        try {
            const client = await this.core.ensureClient();
            
            const { error } = await client.storage
                .from('receipt-files')
                .remove([filePath]);

            if (error) {
                console.error('❌ 파일 삭제 실패:', error);
                return { success: false, message: this.core.getErrorMessage(error) };
            }

            return { success: true };

        } catch (error) {
            console.error('❌ 영수증 파일 삭제 오류:', error);
            return { success: false, message: this.core.getErrorMessage(error) };
        }
    },

    // ===================
    // 📦 교구 신청 관리 - 🆕 v4.3.0 4가지 타입별 최적화
    // ===================
    
    // 🔧 기존 호환성 함수들 - v4.3.0 호환성
    async getStudentApplications(studentId) {
        const result = await this.core.safeApiCall('학생 신청 내역 조회', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('requests')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });
        });

        return result.success ? (result.data || []) : [];
    },

    async createApplication(studentId, formData) {
        return await this.core.safeApiCall('교구 신청 생성', async () => {
            const client = await this.core.ensureClient();
            const requestData = {
                user_id: studentId,
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                link: formData.purchase_link || null,  // 🔧 v4.3.0: purchase_link → link
                is_bundle: formData.is_bundle || false,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            return await client
                .from('requests')
                .insert([requestData])
                .select();
        });
    },

    async updateApplication(applicationId, formData) {
        return await this.core.safeApiCall('교구 신청 수정', async () => {
            const client = await this.core.ensureClient();
            const updateData = {
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                link: formData.purchase_link || null,  // 🔧 v4.3.0: purchase_link → link
                is_bundle: formData.is_bundle || false,
                updated_at: new Date().toISOString()
            };

            return await client
                .from('requests')
                .update(updateData)
                .eq('id', applicationId)
                .select();
        });
    },

    async deleteApplication(applicationId) {
        return await this.core.safeApiCall('교구 신청 삭제', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('requests')
                .delete()
                .eq('id', applicationId)
                .select();
        });
    },

    async getApplicationById(applicationId) {
        return await this.core.safeApiCall('신청 상세 조회', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('requests')
                .select('*')
                .eq('id', applicationId)
                .single();
        });
    },

    // === 🆕 v4.3.0 일반 교구 신청 API ===
    async createV43Application(studentId, formData) {
        return await this.core.safeApiCall('v4.3.0 교구 신청 생성', async () => {
            const client = await this.core.ensureClient();
            
            const requestData = {
                user_id: studentId,
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                is_bundle: formData.is_bundle || false,
                
                // 🆕 v4.3.0 새로운 컬럼들
                link: formData.link || null,
                store_info: formData.store_info || null,
                account_id: formData.account_id || null,
                account_pw: formData.account_pw || null,
                
                // 시스템 컬럼들
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            return await client
                .from('requests')
                .insert([requestData])
                .select();
        });
    },

    // === 🆕 v4.3.0 묶음 교구 신청 API ===
    async createV43BundleApplication(studentId, bundleData) {
        return await this.core.safeApiCall('v4.3.0 묶음 신청 생성', async () => {
            const client = await this.core.ensureClient();
            
            // 4가지 타입별 검증
            const validationResult = this.validateV43BundleData(bundleData);
            if (!validationResult.valid) {
                throw new Error(validationResult.message);
            }
            
            const requestData = {
                user_id: studentId,
                item_name: bundleData.item_name,
                purpose: bundleData.purpose,
                price: bundleData.price,
                purchase_type: bundleData.purchase_type,
                is_bundle: true, // 묶음 신청 고정
                
                // 🆕 v4.3.0 4가지 타입별 컬럼들
                link: bundleData.link,
                store_info: bundleData.store_info,
                account_id: bundleData.account_id,
                account_pw: bundleData.account_pw,
                
                // 시스템 컬럼들
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            return await client
                .from('requests')
                .insert([requestData])
                .select();
        });
    },

    // === 🆕 v4.3.0 신청 수정 API ===
    async updateV43Application(applicationId, formData) {
        return await this.core.safeApiCall('v4.3.0 교구 신청 수정', async () => {
            const client = await this.core.ensureClient();
            
            const updateData = {
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                is_bundle: formData.is_bundle || false,
                
                // 🆕 v4.3.0 새로운 컬럼들
                link: formData.link || null,
                store_info: formData.store_info || null,
                account_id: formData.account_id || null,
                account_pw: formData.account_pw || null,
                
                status: 'pending',

                
                updated_at: new Date().toISOString()
            };

            return await client
                .from('requests')
                .update(updateData)
                .eq('id', applicationId)
                .select();
        });
    },

    // === 🆕 v4.3.0 묶음 신청 데이터 검증 ===
    validateV43BundleData(bundleData) {
        try {
            const { purchase_type, is_bundle, link, store_info, account_id, account_pw } = bundleData;
            
            // 묶음 신청 확인
            if (!is_bundle) {
                return { valid: false, message: '묶음 신청 데이터가 아닙니다.' };
            }
            
            if (purchase_type === 'online') {
                // 온라인 묶음: link + account_id + account_pw 필수
                if (!link || !link.trim()) {
                    return { valid: false, message: '온라인 묶음 구매는 구매 링크가 필수입니다.' };
                }
                if (!account_id || !account_id.trim()) {
                    return { valid: false, message: '온라인 묶음 구매는 계정 아이디가 필수입니다.' };
                }
                if (!account_pw || !account_pw.trim()) {
                    return { valid: false, message: '온라인 묶음 구매는 계정 비밀번호가 필수입니다.' };
                }
                
            } else if (purchase_type === 'offline') {
                // 오프라인 묶음: store_info는 선택적
                // 계정 정보는 null이어야 함
                if (account_id || account_pw) {
                    console.warn('⚠️ 오프라인 구매에서 계정 정보가 제공됨 - 제거함');
                    bundleData.account_id = null;
                    bundleData.account_pw = null;
                }
                
            } else {
                return { valid: false, message: '알 수 없는 구매 방식입니다.' };
            }
            
            return { valid: true, message: 'v4.3.0 묶음 신청 검증 완료' };
            
        } catch (error) {
            console.error('❌ v4.3.0 묶음 신청 검증 오류:', error);
            return { valid: false, message: '검증 중 오류가 발생했습니다: ' + error.message };
        }
    },

    // === 🆕 v4.3.0 신청 타입 분류 헬퍼 ===
    getV43ApplicationType(requestData) {
        const { purchase_type, is_bundle } = requestData;
        
        if (is_bundle) {
            return purchase_type === 'online' ? '온라인 묶음' : '오프라인 묶음';
        } else {
            return purchase_type === 'online' ? '온라인 단일' : '오프라인 단일';
        }
    },

    // === 🆕 v4.3.0 호환성 조회 함수 ===
    async getStudentApplicationsV43(studentId) {
        const result = await this.core.safeApiCall('v4.3.0 학생 신청 내역 조회', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('requests')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });
        });

        if (result.success && result.data) {
            // 기존 코드 호환성을 위해 purchase_link 필드 매핑
            return result.data.map(request => {
                const mappedRequest = { ...request };
                
                // v4.3.0 호환성: link → purchase_link 매핑 (기존 코드용)
                if (request.link && !request.purchase_link) {
                    mappedRequest.purchase_link = request.link;
                }
                
                // v4.3.0 추가 정보 포함
                mappedRequest.v43_type = this.getV43ApplicationType(request);
                mappedRequest.has_account_info = !!(request.account_id && request.account_pw);
                mappedRequest.has_store_info = !!request.store_info;
                
                return mappedRequest;
            });
        }

        return result.success ? (result.data || []) : [];
    },

    // === 🆕 v4.3.0 계정 정보 복호화 (관리자용) ===
    async decryptV43AccountInfo(encryptedPassword) {
        try {
            // v4.3.0 암호화 해제 (실제 운영에서는 더 강력한 복호화 필요)
            const decoded = atob(encryptedPassword);
            const parts = decoded.split(':');
            
            if (parts.length >= 2) {
                return {
                    success: true,
                    password: parts.slice(1).join(':'), // salt 이후 부분이 실제 비밀번호
                    timestamp: parts[0].replace('sejong_v43_', '')
                };
            }
            
            return {
                success: false,
                message: '잘못된 암호화 형식입니다.'
            };
            
        } catch (error) {
            console.error('❌ v4.3.0 계정 정보 복호화 오류:', error);
            return {
                success: false,
                message: '복호화 중 오류가 발생했습니다.'
            };
        }
    },

    // === 🆕 v4.3.0 통계 조회 (관리자용) ===
    async getV43ApplicationStats() {
        const result = await this.core.safeApiCall('v4.3.0 신청 통계', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('requests')
                .select('purchase_type, is_bundle, status, account_id, account_pw, store_info, link');
        });

        if (result.success && result.data) {
            const stats = {
                total: result.data.length,
                by_type: {
                    '온라인 단일': 0,
                    '온라인 묶음': 0,
                    '오프라인 단일': 0,
                    '오프라인 묶음': 0
                },
                by_status: {},
                account_info_count: 0,
                store_info_count: 0
            };
            
            result.data.forEach(request => {
                // 타입별 분류
                const type = this.getV43ApplicationType(request);
                stats.by_type[type]++;
                
                // 상태별 분류
                stats.by_status[request.status] = (stats.by_status[request.status] || 0) + 1;
                
                // 추가 정보 카운트
                if (request.account_id && request.account_pw) {
                    stats.account_info_count++;
                }
                if (request.store_info) {
                    stats.store_info_count++;
                }
            });
            
            return stats;
        }

        return {
            total: 0,
            by_type: { '온라인 단일': 0, '온라인 묶음': 0, '오프라인 단일': 0, '오프라인 묶음': 0 },
            by_status: {},
            account_info_count: 0,
            store_info_count: 0
        };
    },

    // ===================
    // 수업계획 관리
    // ===================
    async getStudentLessonPlan(studentId) {
        const result = await this.core.safeApiCall('학생 수업계획 조회', async () => {
            const client = await this.core.ensureClient();
            const { data, error } = await client
                .from('lesson_plans')
                .select('*')
                .eq('user_id', studentId);

            if (error) {
                return { data: null, error };
            }

            const plan = data && data.length > 0 ? data[0] : null;
            return { data: plan, error: null };
        });

        return result.success ? result.data : null;
    },

    async saveLessonPlan(studentId, planData, isDraft = false) {
        return await this.core.safeApiCall('수업계획 저장', async () => {
            const client = await this.core.ensureClient();
            const status = isDraft ? 'draft' : 'submitted';
            const submitTime = isDraft ? null : new Date().toISOString();

            // 기존 수업계획 확인
            const existingResult = await client
                .from('lesson_plans')
                .select('id, status')  // 🔧 approved_at, approved_by 제거
                .eq('user_id', studentId);

            const lessonPlanData = {
                user_id: studentId,
                status: status,
                lessons: planData,
                submitted_at: submitTime,
                updated_at: new Date().toISOString()
            };

            if (existingResult.data && existingResult.data.length > 0) {
                // 업데이트
                return await client
                    .from('lesson_plans')
                    .update(lessonPlanData)
                    .eq('user_id', studentId)
                    .select();
            } else {
                // 새로 생성
                return await client
                    .from('lesson_plans')
                    .insert([lessonPlanData])
                    .select();
            }
        });
    },

    // ===================
    // 🔧 학생 예산 상태 조회 함수 수정 - student_budgets 테이블 우선 사용
    // ===================
    async getStudentBudgetStatus(studentId) {
        try {
            const client = await this.core.ensureClient();
            
            // 🎯 1단계: student_budgets 테이블에서 직접 데이터 조회
            const budgetResult = await client
                .from('student_budgets')
                .select(`
                    allocated_budget,
                    used_budget,
                    remaining_budget,
                    field,
                    special_request_amount,
                    special_request_status,
                    special_admin_rejection_reason
                `)
                .eq('user_id', studentId)
                .single();

            // student_budgets 테이블에 데이터가 있으면 직접 사용
            if (budgetResult.data && !budgetResult.error) {
                const budgetData = budgetResult.data;
                
                console.log('✅ student_budgets 테이블에서 직접 조회:', budgetData);
                
                return {
                    allocated: budgetData.allocated_budget || 0,
                    used: budgetData.used_budget || 0,
                    remaining: budgetData.remaining_budget || 0,
                    field: budgetData.field || '미설정',
                    lessonPlanStatus: 'approved', // student_budgets에 데이터가 있다면 승인됨
                    specialRequest: {
                        amount: budgetData.special_request_amount,
                        status: budgetData.special_request_status,
                        rejectionReason: budgetData.special_admin_rejection_reason
                    }
                };
            }

            // 🔄 2단계: student_budgets에 데이터가 없으면 기존 자동 계산 로직 사용
            console.log('⚠️ student_budgets 테이블에 데이터 없음, 자동 계산 사용');
            
            // 1. 학생의 프로필 정보 조회 (분야 확인)
            const profileResult = await client
                .from('user_profiles')
                .select('field')
                .eq('id', studentId)
                .single();

            if (profileResult.error || !profileResult.data) {
                console.error('학생 프로필 조회 실패:', profileResult.error);
                return {
                    allocated: 0,
                    used: 0,
                    remaining: 0,
                    field: '미설정',
                    lessonPlanStatus: 'not_submitted'
                };
            }

            const studentField = profileResult.data.field;
            if (!studentField) {
                console.warn('학생의 분야 정보가 없습니다');
                return {
                    allocated: 0,
                    used: 0,
                    remaining: 0,
                    field: '미설정',
                    lessonPlanStatus: 'not_submitted'
                };
            }

            // 2. 🔧 학생의 수업계획 상태 확인 (approved_at, approved_by 컬럼 제거 반영)
            const lessonPlanResult = await client
                .from('lesson_plans')
                .select('status, lessons, rejection_reason')  // 🔧 approved_at, approved_by 제거
                .eq('user_id', studentId)
                .single();

            let lessonPlanStatus = 'not_submitted';
            let totalLessons = 0;

            if (lessonPlanResult.data) {
                const plan = lessonPlanResult.data;
                
                // 🔧 수업계획 상태 확인 (status만으로 판단)
                if (plan.status === 'draft') {
                    lessonPlanStatus = 'draft';
                } else if (plan.status === 'submitted') {
                    lessonPlanStatus = 'pending';
                } else if (plan.status === 'approved') {
                    lessonPlanStatus = 'approved';
                    
                    // 승인된 경우에만 수업 횟수 계산
                    try {
                        if (plan.lessons) {
                            let lessons = plan.lessons;
                            if (typeof lessons === 'string') {
                                lessons = JSON.parse(lessons);
                            }
                            
                            if (lessons.totalLessons) {
                                totalLessons = lessons.totalLessons;
                            } else if (lessons.schedule && Array.isArray(lessons.schedule)) {
                                totalLessons = lessons.schedule.length;
                            } else if (lessons.lessons && Array.isArray(lessons.lessons)) {
                                totalLessons = lessons.lessons.length;
                            }
                        }
                    } catch (e) {
                        console.warn('수업계획 파싱 오류:', e);
                        totalLessons = 0;
                    }
                } else if (plan.status === 'rejected') {
                    lessonPlanStatus = 'rejected';
                }
            }

            // 3. 분야별 예산 설정 조회 (필요시 원본 파일에서 가져와야 함)
            // 여기서는 기본값을 사용하거나 별도 함수로 분리해야 할 수 있음
            const fieldBudgetSettings = await this.getAllFieldBudgetSettings();
            const fieldSetting = fieldBudgetSettings[studentField] || { perLessonAmount: 0, maxBudget: 0 };

            // 4. 배정 예산 계산 (승인된 수업계획이 있을 때만)
            let allocatedBudget = 0;
            if (lessonPlanStatus === 'approved' && totalLessons > 0) {
                const calculatedBudget = fieldSetting.perLessonAmount * totalLessons;
                allocatedBudget = fieldSetting.maxBudget > 0 ? 
                    Math.min(calculatedBudget, fieldSetting.maxBudget) : 
                    calculatedBudget;
            }

            // 5. 사용 예산 계산 (승인된/구매완료된 신청들의 총액)
            const usedBudgetResult = await client
                .from('requests')
                .select('price')
                .eq('user_id', studentId)
                .in('status', ['approved', 'purchased']);

            const usedBudget = usedBudgetResult.data ? 
                usedBudgetResult.data.reduce((sum, req) => sum + (req.price || 0), 0) : 0;

            // 6. 잔여 예산 계산
            const remainingBudget = Math.max(0, allocatedBudget - usedBudget);

            const result = {
                allocated: allocatedBudget,
                used: usedBudget,
                remaining: remainingBudget,
                field: studentField,
                lessonPlanStatus: lessonPlanStatus
            };

            return result;

        } catch (error) {
            console.error('❌ 학생 예산 상태 조회 실패:', error);
            return {
                allocated: 0,
                used: 0,
                remaining: 0,
                field: '미설정',
                lessonPlanStatus: 'error'
            };
        }
    },

    // 🔧 분야별 예산 설정 조회 (관리자 기능에서 분리)
    async getAllFieldBudgetSettings() {
        const result = await this.core.safeApiCall('분야별 예산 설정 조회', async () => {
            const client = await this.core.ensureClient();
            
            return await client
                .from('budget_settings')
                .select('*');
        });

        if (result.success && result.data) {
            const settings = {};
            result.data.forEach(setting => {
                settings[setting.field] = {
                    perLessonAmount: setting.per_lesson_amount || 0,
                    maxBudget: setting.max_budget_limit || 0
                };
            });
            return settings;
        }

        // 기본 설정 반환
        return {
            '한국어교육': { perLessonAmount: 15000, maxBudget: 400000 },
            '전통문화예술': { perLessonAmount: 25000, maxBudget: 600000 },
            'K-Pop 문화': { perLessonAmount: 10000, maxBudget: 300000 },
            '한국현대문화': { perLessonAmount: 18000, maxBudget: 450000 },
            '전통음악': { perLessonAmount: 30000, maxBudget: 750000 },
            '한국미술': { perLessonAmount: 22000, maxBudget: 550000 },
            '한국요리문화': { perLessonAmount: 35000, maxBudget: 800000 }
        };
    },

    // ===================
    // 시스템 설정 관련 (학생 권한 체크용)
    // ===================
    async canEditLessonPlan() {
        const settings = await this.getSystemSettings();
        
        if (settings.test_mode || settings.ignore_deadline) {
            return true;
        }
        
        if (settings.lesson_plan_deadline) {
            const deadline = new Date(settings.lesson_plan_deadline);
            const now = new Date();
            return now <= deadline;
        }
        
        return true; // 기본적으로 수정 가능
    },

    async getSystemSettings() {
        const result = await this.core.safeApiCall('시스템 설정 조회', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('system_settings')
                .select('setting_key, setting_value, setting_type');
        });

        if (result.success) {
            const settings = {};
            (result.data || []).forEach(item => {
                let value = item.setting_value;
                
                if (item.setting_type === 'boolean') {
                    value = value === 'true';
                } else if (item.setting_type === 'number') {
                    value = parseInt(value);
                } else if (item.setting_type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        console.warn(`JSON 설정 파싱 오류 (${item.setting_key}):`, e);
                    }
                }

                settings[item.setting_key] = value;
            });

            return settings;
        }

        // 기본 설정 반환
        return CONFIG?.APP?.DEFAULT_SYSTEM_SETTINGS || {
            test_mode: false,
            lesson_plan_deadline: '2024-12-31',
            ignore_deadline: false
        };
    }
};

// 자동 초기화 (SupabaseCore가 로드된 후)
(async () => {
    // SupabaseCore 로드 대기
    let waitCount = 0;
    while (!window.SupabaseCore && waitCount < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (window.SupabaseCore) {
        // 초기화 완료 로그 제거 - 학생 사용 시 불필요
    } else {
        console.warn('⚠️ SupabaseCore 로드 타임아웃 - SupabaseStudent 수동 초기화 필요');
    }
})();

// 전역 접근을 위해 window 객체에 추가
window.SupabaseStudent = SupabaseStudent;

console.log('🚀 SupabaseStudent v4.3.1 loaded - 콘솔 로그 정리 완료');
