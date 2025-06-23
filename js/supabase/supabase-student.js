// 🚀 Supabase 학생 전용 기능 모듈 v4.3.0
// 학생 인증, 교구 신청, 영수증 관리, 수업계획, 배송지 관리 등
// SupabaseCore에 의존하는 학생 전용 모듈
// 🔧 v4.3.0 - requests 테이블 구조 호환성 업데이트

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
                .select('*')
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
    // 🔧 배송지 정보 관리 - UPSERT 로직 완전 수정
    // ===================
    
    // 🔧 배송지 정보 조회 - 올바른 컬럼명 사용
    async getShippingInfo(userId) {
        console.log('📦 배송지 정보 조회:', userId);
        
        const result = await this.core.safeApiCall('배송지 정보 조회', async () => {
            const client = await this.core.ensureClient();
            const { data, error } = await client
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', userId)
                .single();

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
        console.log('📦 배송지 정보 저장 (UPSERT 방식):', userId, shippingData);
        
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

            console.log('📦 UPSERT 실행 - 데이터:', dataToSave);

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
            console.log('📄 다음 영수증 순번 조회:', userId);
            
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
            console.log('📄 다음 영수증 순번:', nextNumber);
            
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
            console.log('💰 교구 신청 가격 조회:', requestId);
            
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
            console.log('✅ 교구 가격 조회 완료:', price);
            
            return price;
            
        } catch (error) {
            console.error('❌ 교구 가격 조회 오류:', error);
            // 오류 발생 시 기본값 0 반환
            return 0;
        }
    },

    // 🚀 v4.1.5 - 영수증 파일 업로드 (receipt-management.js 호환)
    async uploadReceiptFile(file, requestId, userId) {
        console.log('📄 영수증 파일 업로드 시작 (v4.1.5 - 최적화된 테이블 호환):', {
            fileName: file.name,
            fileSize: file.size,
            requestId: requestId,
            userId: userId
        });

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
            
            console.log('📄 v4.1.5 파일명 시스템:', {
                originalName: file.name,
                optimizedName: fileName,
                filePath: filePath,
                receiptNumber: receiptNumber,
                requestPrice: requestPrice
            });

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

            console.log('✅ 파일 업로드 성공:', uploadData);

            // 6. 업로드된 파일의 공개 URL 가져오기
            const { data: urlData } = client.storage
                .from('receipt-files')
                .getPublicUrl(filePath);

            const fileUrl = urlData?.publicUrl;
            console.log('📄 파일 공개 URL:', fileUrl);

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
        console.log('📄 영수증 정보 저장 (v4.1.5 - 최적화된 테이블 호환):', { requestId, receiptData });

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

            console.log('📄 저장할 영수증 메타데이터 (v4.1.5 - 최적화된 구조):', receiptRecord);

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
        console.log('📄 영수증 제출 완료 처리:', requestId);

        return await this.core.safeApiCall('영수증 제출 완료', async () => {
            const client = await this.core.ensureClient();
            return await client
                .from('requests')
                .update({
                    status: 'purchased',
                    // 🔧 v2.12 - purchased_at 컬럼 제거 (오류 수정)
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .select();
        });
    },

    // 🔧 v4.1.5 - 영수증 정보 조회 (최적화된 테이블 호환)
    async getReceiptByRequestId(requestId) {
        console.log('📄 영수증 정보 조회 (v4.1.5):', requestId);

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
        console.log('📄 학생별 영수증 목록 조회 (v4.1.5):', userId);

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
        console.log('📄 영수증 파일 삭제:', filePath);

        try {
            const client = await this.core.ensureClient();
            
            const { error } = await client.storage
                .from('receipt-files')
                .remove([filePath]);

            if (error) {
                console.error('❌ 파일 삭제 실패:', error);
                return { success: false, message: this.core.getErrorMessage(error) };
            }

            console.log('✅ 파일 삭제 성공');
            return { success: true };

        } catch (error) {
            console.error('❌ 영수증 파일 삭제 오류:', error);
            return { success: false, message: this.core.getErrorMessage(error) };
        }
    },

    // ===================
    // 📦 교구 신청 관리 - v4.3.0 호환성 업데이트
    // ===================
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

    // 🔧 v4.3.0 호환성 - purchase_link → link 컬럼명 변경
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

    // 🔧 v4.3.0 호환성 - purchase_link → link 컬럼명 변경
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

    // 🚀 교구 신청 삭제 (student-addon.js에서 사용)
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

    // 🚀 특정 신청 조회 (student-addon.js에서 사용)
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
    // 🔧 학생 예산 상태 조회 함수 수정 (approved_at, approved_by 컬럼 제거 반영)
    // ===================
    async getStudentBudgetStatus(studentId) {
        console.log('💰 학생 예산 상태 조회:', studentId);
        
        try {
            const client = await this.core.ensureClient();
            
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

            console.log('✅ 학생 예산 상태 조회 완료:', result);
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
        console.log('✅ SupabaseStudent 초기화 완료 - SupabaseCore 의존성 확인됨');
    } else {
        console.warn('⚠️ SupabaseCore 로드 타임아웃 - SupabaseStudent 수동 초기화 필요');
    }
})();

// 전역 접근을 위해 window 객체에 추가
window.SupabaseStudent = SupabaseStudent;

console.log('🚀 SupabaseStudent v4.3.0 loaded - v4.3 requests 테이블 호환성 업데이트 (purchase_link → link)');
