// 간소화된 Supabase API - 관리자 및 학생 시스템용
// intern-announcement 방식 기반으로 안정성 확보
// 🚀 v2.10 - 영수증 파일명 생성 로직 수정 ([학생명]_001 형태)

const SupabaseAPI = {
    // Supabase 클라이언트
    supabase: null,
    
    // 현재 사용자 정보
    currentUser: null,
    currentUserType: null,

    // 초기화
    async init() {
        try {
            console.log('🚀 SupabaseAPI 초기화 중...');
            
            if (!window.supabase || !CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
                throw new Error('Supabase 설정이 올바르지 않습니다.');
            }
            
            this.supabase = window.supabase.createClient(
                CONFIG.SUPABASE.URL,
                CONFIG.SUPABASE.ANON_KEY
            );
            
            console.log('✅ SupabaseAPI 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ SupabaseAPI 초기화 실패:', error);
            return false;
        }
    },

    // 클라이언트 getter
    get client() {
        return this.supabase;
    },

    // 클라이언트 확보 함수
    async ensureClient() {
        if (!this.supabase) {
            await this.init();
        }
        return this.supabase;
    },

    // 안전한 API 호출 래퍼
    async safeApiCall(operation, apiFunction, context = {}) {
        try {
            if (!this.supabase) {
                await this.init();
            }
            
            const result = await apiFunction();
            
            if (result.error) {
                console.error(`❌ ${operation} 오류:`, result.error);
                return { 
                    success: false, 
                    message: this.getErrorMessage(result.error), 
                    error: result.error 
                };
            }
            
            console.log(`✅ ${operation} 성공`);
            return { success: true, data: result.data };
            
        } catch (error) {
            console.error(`❌ ${operation} 예외:`, error);
            return { 
                success: false, 
                message: this.getErrorMessage(error), 
                error: error 
            };
        }
    },

    // 에러 메시지 처리
    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error?.message) {
            if (error.message.includes('PGRST116')) {
                return '요청하신 데이터를 찾을 수 없습니다.';
            }
            if (error.message.includes('permission denied')) {
                return '접근 권한이 없습니다.';
            }
            if (error.message.includes('duplicate key')) {
                return '이미 존재하는 데이터입니다.';
            }
            if (error.message.includes('not null')) {
                return '필수 정보가 누락되었습니다.';
            }
            
            return error.message;
        }
        
        return '알 수 없는 오류가 발생했습니다.';
    },

    // ===================
    // 학생 인증
    // ===================
    async authenticateStudent(name, birthDate) {
        const result = await this.safeApiCall('학생 인증', async () => {
            const { data, error } = await this.supabase
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
            this.currentUser = result.data;
            this.currentUserType = 'student';
        }

        return result;
    },

    // ===================
    // 관리자 인증
    // ===================
    async authenticateAdmin(code) {
        try {
            if (code !== CONFIG.APP.ADMIN_CODE) {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            const result = await this.safeApiCall('관리자 인증', async () => {
                const { data, error } = await this.supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_type', 'admin');

                if (error) {
                    return { data: null, error };
                }

                const admin = data && data.length > 0 ? data[0] : null;
                return { data: admin, error: null };
            });

            if (result.success) {
                let adminUser = result.data;
                if (!adminUser) {
                    // 관리자 계정이 없으면 생성
                    const createResult = await this.safeApiCall('관리자 계정 생성', async () => {
                        return await this.supabase
                            .from('user_profiles')
                            .insert([{
                                email: 'admin@sejong.or.kr',
                                name: '관리자',
                                user_type: 'admin'
                            }])
                            .select();
                    });

                    if (createResult.success && createResult.data && createResult.data.length > 0) {
                        adminUser = createResult.data[0];
                    } else {
                        return { success: false, message: '관리자 계정 생성 실패' };
                    }
                }

                this.currentUser = adminUser;
                this.currentUserType = 'admin';
                
                return { success: true, data: adminUser };
            }

            return result;
        } catch (error) {
            console.error('❌ 관리자 인증 오류:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    },

    // ===================
    // 🔧 배송지 정보 관리 - UPSERT 로직 완전 수정
    // ===================
    
    // 🔧 배송지 정보 조회 - 올바른 컬럼명 사용
    async getShippingInfo(userId) {
        console.log('📦 배송지 정보 조회:', userId);
        
        const result = await this.safeApiCall('배송지 정보 조회', async () => {
            const { data, error } = await this.supabase
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
        
        return await this.safeApiCall('배송지 정보 저장', async () => {
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
            return await this.supabase
                .from('shipping_addresses')
                .upsert(dataToSave, {
                    onConflict: 'user_id',           // user_id 중복 시 업데이트
                    ignoreDuplicates: false          // 중복 시 무시하지 않고 업데이트
                })
                .select();
        });
    },

    // ===================
    // 🚀 영수증 관리 시스템 - 완전 새로 구현 (v2.10 - 파일명 생성 로직 수정)
    // ===================

    // 🔧 v2.10 - 학생의 다음 영수증 순번 가져오기
    async getNextReceiptNumber(userId) {
        try {
            console.log('📄 다음 영수증 순번 조회:', userId);
            
            const client = await this.ensureClient();
            
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

    // 🔧 v2.10 - 학생명 조회 (파일명 생성용)
    async getStudentName(userId) {
        try {
            console.log('👤 학생명 조회:', userId);
            
            const client = await this.ensureClient();
            
            const { data, error } = await client
                .from('user_profiles')
                .select('name')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ 학생명 조회 실패:', error);
                // 오류 발생 시 기본값 반환
                return `학생_${userId}`;
            }

            const studentName = data?.name || `학생_${userId}`;
            console.log('✅ 학생명 조회 완료:', studentName);
            
            return studentName;
            
        } catch (error) {
            console.error('❌ 학생명 조회 오류:', error);
            // 오류 발생 시 기본값 반환
            return `학생_${userId}`;
        }
    },

    // 🔧 v2.10 - 파일명 정제 (파일시스템 호환)
    sanitizeFileName(name) {
        try {
            // 파일시스템에서 허용되지 않는 문자 제거/변경
            return name
                .replace(/[<>:"/\\|?*]/g, '_')  // 특수문자 → 언더스코어
                .replace(/\s+/g, '_')          // 공백 → 언더스코어
                .replace(/\.+$/, '')           // 끝의 점 제거
                .substring(0, 50);             // 길이 제한 (50자)
        } catch (error) {
            console.error('❌ 파일명 정제 오류:', error);
            return name;
        }
    },

    // 🚀 v2.10 - 영수증 파일 업로드 (수정된 파일명 생성 로직)
    async uploadReceiptFile(file, requestId, userId) {
        console.log('📄 영수증 파일 업로드 시작 (v2.10 - 파일명 로직 수정):', {
            fileName: file.name,
            fileSize: file.size,
            requestId: requestId,
            userId: userId
        });

        try {
            const client = await this.ensureClient();
            
            // 🔧 v2.10 - 학생명 조회
            const studentName = await this.getStudentName(userId);
            console.log('👤 파일 업로드를 위한 학생명:', studentName);
            
            // 🔧 v2.10 - 다음 영수증 순번 조회
            const receiptNumber = await this.getNextReceiptNumber(userId);
            console.log('📄 다음 영수증 순번:', receiptNumber);
            
            // 🔧 v2.10 - 파일 확장자 추출
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            
            // 🔧 v2.10 - 새로운 파일명 생성: [학생명]_001 형태
            const sanitizedName = this.sanitizeFileName(studentName);
            const paddedNumber = receiptNumber.toString().padStart(3, '0'); // 001, 002, 003...
            const newFileName = `${sanitizedName}_${paddedNumber}.${fileExtension}`;
            
            // Storage 경로 생성
            const filePath = `receipts/${userId}/${newFileName}`;
            
            console.log('📄 생성된 파일 정보:', {
                originalName: file.name,
                newFileName: newFileName,
                filePath: filePath,
                studentName: studentName,
                receiptNumber: receiptNumber
            });

            // Supabase Storage에 파일 업로드
            const { data: uploadData, error: uploadError } = await client.storage
                .from('receipt-files')  // 버킷 이름
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false  // 중복 방지
                });

            if (uploadError) {
                console.error('❌ 파일 업로드 실패:', uploadError);
                throw uploadError;
            }

            console.log('✅ 파일 업로드 성공:', uploadData);

            // 업로드된 파일의 공개 URL 가져오기
            const { data: urlData } = client.storage
                .from('receipt-files')
                .getPublicUrl(filePath);

            const fileUrl = urlData?.publicUrl;
            console.log('📄 파일 공개 URL:', fileUrl);

            return {
                success: true,
                data: {
                    filePath: filePath,
                    fileName: newFileName,           // 🔧 v2.10 - 새로운 파일명
                    fileUrl: fileUrl,
                    originalName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    studentName: studentName,        // 🔧 v2.10 - 학생명 추가
                    receiptNumber: receiptNumber,    // 🔧 v2.10 - 순번 추가
                    userId: userId                   // 🔧 v2.10 - 사용자 ID 추가
                }
            };

        } catch (error) {
            console.error('❌ 영수증 파일 업로드 오류:', error);
            return {
                success: false,
                message: this.getErrorMessage(error),
                error: error
            };
        }
    },

    // 🚀 v2.10 - 영수증 정보 저장 (파일 업로드 후 메타데이터 저장) - user_id 추가
    async saveReceiptInfo(requestId, receiptData) {
        console.log('📄 영수증 정보 저장 (v2.10):', { requestId, receiptData });

        return await this.safeApiCall('영수증 정보 저장', async () => {
            const receiptRecord = {
                request_id: requestId,
                user_id: receiptData.userId,          // 🔧 v2.10 - user_id 추가
                file_path: receiptData.filePath,
                file_name: receiptData.fileName,
                file_url: receiptData.fileUrl,
                original_name: receiptData.originalName,
                file_size: receiptData.fileSize,
                file_type: receiptData.fileType,
                student_name: receiptData.studentName,     // 🔧 v2.10 - 학생명 저장
                receipt_number: receiptData.receiptNumber, // 🔧 v2.10 - 순번 저장
                purchase_date: receiptData.purchaseDate || null,
                purchase_store: receiptData.purchaseStore || null,
                note: receiptData.note || null,
                uploaded_at: new Date().toISOString()
            };

            console.log('📄 저장할 영수증 메타데이터 (v2.10):', receiptRecord);

            // receipts 테이블에 메타데이터 저장
            return await this.supabase
                .from('receipts')
                .insert([receiptRecord])
                .select();
        });
    },

    // 🚀 영수증 제출 완료 처리 (신청 상태를 'purchased'로 변경)
    async completeReceiptSubmission(requestId) {
        console.log('📄 영수증 제출 완료 처리:', requestId);

        return await this.safeApiCall('영수증 제출 완료', async () => {
            return await this.supabase
                .from('requests')
                .update({
                    status: 'purchased',
                    purchased_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .select();
        });
    },

    // 🚀 영수증 정보 조회 (특정 신청의 영수증)
    async getReceiptByRequestId(requestId) {
        console.log('📄 영수증 정보 조회:', requestId);

        const result = await this.safeApiCall('영수증 정보 조회', async () => {
            const { data, error } = await this.supabase
                .from('receipts')
                .select(`
                    *,
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

    // 🚀 모든 영수증 조회 (관리자용)
    async getAllReceipts() {
        console.log('📄 모든 영수증 조회 (관리자용)');

        const result = await this.safeApiCall('모든 영수증 조회', async () => {
            return await this.supabase
                .from('receipts')
                .select(`
                    *,
                    requests:request_id (
                        item_name,
                        price,
                        purchase_type,
                        status,
                        user_profiles:user_id (
                            name,
                            field,
                            sejong_institute
                        )
                    )
                `)
                .order('uploaded_at', { ascending: false });
        });

        if (result.success && result.data) {
            return result.data.map(receipt => ({
                ...receipt,
                item_name: receipt.requests?.item_name,
                item_price: receipt.requests?.price,
                purchase_type: receipt.requests?.purchase_type,
                request_status: receipt.requests?.status,
                student_name: receipt.requests?.user_profiles?.name,
                student_field: receipt.requests?.user_profiles?.field,
                student_institute: receipt.requests?.user_profiles?.sejong_institute
            }));
        }

        return result.success ? (result.data || []) : [];
    },

    // 🚀 학생별 영수증 목록 조회 (관리자용 - v2.10 추가)
    async getReceiptsByStudent(userId) {
        console.log('📄 학생별 영수증 목록 조회:', userId);

        const result = await this.safeApiCall('학생별 영수증 조회', async () => {
            return await this.supabase
                .from('receipts')
                .select(`
                    *,
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
            const client = await this.ensureClient();
            
            const { error } = await client.storage
                .from('receipt-files')
                .remove([filePath]);

            if (error) {
                console.error('❌ 파일 삭제 실패:', error);
                return { success: false, message: this.getErrorMessage(error) };
            }

            console.log('✅ 파일 삭제 성공');
            return { success: true };

        } catch (error) {
            console.error('❌ 영수증 파일 삭제 오류:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    },

    // ===================
    // 통계 데이터 (admin.js 호환)
    // ===================
    async getStats() {
        const result = await this.safeApiCall('통계 데이터 조회', async () => {
            const client = await this.ensureClient();
            
            // 전체 학생 수
            const totalStudentsResult = await client
                .from('user_profiles')
                .select('id', { count: 'exact' })
                .eq('user_type', 'student');

            // 신청자 수 (최소 1개 이상 신청한 학생)
            const applicantsResult = await client
                .from('requests')
                .select('user_id', { count: 'exact' })
                .not('user_id', 'is', null);

            // 대기 중인 신청 건수
            const pendingResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'pending');

            // 승인된 신청 건수
            const approvedResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'approved');

            // 구매완료 신청 건수
            const purchasedResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'purchased');

            if (totalStudentsResult.error) throw totalStudentsResult.error;
            if (applicantsResult.error) throw applicantsResult.error;
            if (pendingResult.error) throw pendingResult.error;
            if (approvedResult.error) throw approvedResult.error;
            if (purchasedResult.error) throw purchasedResult.error;

            // 신청자 수 계산 (중복 제거)
            const uniqueApplicants = new Set();
            if (applicantsResult.data) {
                applicantsResult.data.forEach(item => {
                    if (item.user_id) uniqueApplicants.add(item.user_id);
                });
            }

            return {
                data: {
                    totalStudents: totalStudentsResult.count || 0,
                    applicantCount: uniqueApplicants.size,
                    pendingCount: pendingResult.count || 0,
                    approvedCount: approvedResult.count || 0,
                    purchasedCount: purchasedResult.count || 0
                },
                error: null
            };
        });

        return result.success ? result.data : {
            totalStudents: 0,
            applicantCount: 0,
            pendingCount: 0,
            approvedCount: 0,
            purchasedCount: 0
        };
    },

    // ===================
    // 예산 현황 통계 (수정된 버전)
    // ===================
    async getBudgetOverviewStats() {
        console.log('💰 예산 현황 통계 계산 시작...');
        
        try {
            const client = await this.ensureClient();
            
            // 1. 승인된 수업계획을 가진 학생들 조회 (🔧 approved_at 컬럼 제거에 따른 수정)
            const approvedLessonPlansResult = await client
                .from('lesson_plans')
                .select(`
                    user_id,
                    lessons,
                    user_profiles:user_id (
                        field
                    )
                `)
                .eq('status', 'approved');  // 🔧 status로만 판단

            // 2. 분야별 예산 설정 조회
            const fieldBudgetSettings = await this.getAllFieldBudgetSettings();

            // 3. 승인된 신청들의 총액 (approved 상태)
            const approvedRequestsResult = await client
                .from('requests')
                .select('price')
                .eq('status', 'approved');

            // 4. 구매완료된 신청들의 총액 (purchased 상태)
            const purchasedRequestsResult = await client
                .from('requests')
                .select('price')
                .eq('status', 'purchased');

            let totalApprovedBudget = 0;
            let studentCount = 0;

            // 승인된 수업계획 기반으로 예산 계산
            if (approvedLessonPlansResult.data) {
                approvedLessonPlansResult.data.forEach(plan => {
                    const userField = plan.user_profiles?.field;
                    if (userField && fieldBudgetSettings[userField]) {
                        const fieldSetting = fieldBudgetSettings[userField];
                        
                        // 수업 횟수 계산
                        let totalLessons = 0;
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

                        // 예산 계산
                        const calculatedBudget = fieldSetting.perLessonAmount * totalLessons;
                        const finalBudget = fieldSetting.maxBudget > 0 ? 
                            Math.min(calculatedBudget, fieldSetting.maxBudget) : 
                            calculatedBudget;
                        
                        totalApprovedBudget += finalBudget;
                        studentCount++;
                    }
                });
            }

            // 승인된 신청들의 총액
            const approvedItemsTotal = approvedRequestsResult.data ? 
                approvedRequestsResult.data.reduce((sum, request) => sum + (request.price || 0), 0) : 0;

            // 구매완료된 신청들의 총액  
            const purchasedTotal = purchasedRequestsResult.data ?
                purchasedRequestsResult.data.reduce((sum, request) => sum + (request.price || 0), 0) : 0;

            // 1인당 평균 예산
            const averagePerPerson = studentCount > 0 ? Math.round(totalApprovedBudget / studentCount) : 0;

            const result = {
                totalApprovedBudget,
                approvedItemsTotal,
                purchasedTotal,
                averagePerPerson
            };

            console.log('✅ 예산 현황 통계 계산 완료:', result);
            return result;

        } catch (error) {
            console.error('❌ 예산 현황 통계 계산 실패:', error);
            
            // 오류 발생시 기본값 반환
            return {
                totalApprovedBudget: 0,
                approvedItemsTotal: 0,
                purchasedTotal: 0,
                averagePerPerson: 0
            };
        }
    },

    // ===================
    // 🔧 학생 예산 상태 조회 함수 수정 (approved_at, approved_by 컬럼 제거 반영)
    // ===================
    async getStudentBudgetStatus(studentId) {
        console.log('💰 학생 예산 상태 조회:', studentId);
        
        try {
            const client = await this.ensureClient();
            
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

            // 3. 분야별 예산 설정 조회
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

    // ===================
    // 신청 내역 검색 (admin.js 호환)
    // ===================
    async searchApplications(searchTerm = '') {
        const result = await this.safeApiCall('신청 내역 검색', async () => {
            const client = await this.ensureClient();
            
            let query = client
                .from('requests')
                .select(`
                    *,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .order('created_at', { ascending: false });

            // 검색어가 있으면 필터링
            if (searchTerm && searchTerm.trim()) {
                // 먼저 사용자 프로필에서 이름으로 검색
                const userResult = await client
                    .from('user_profiles')
                    .select('id')
                    .ilike('name', `%${searchTerm}%`);

                if (userResult.data && userResult.data.length > 0) {
                    const userIds = userResult.data.map(user => user.id);
                    query = query.in('user_id', userIds);
                } else {
                    // 일치하는 사용자가 없으면 빈 결과 반환
                    return { data: [], error: null };
                }
            }

            return await query;
        });

        return result.success ? (result.data || []) : [];
    },

    // ===================
    // 대기중인 수업계획 조회 (admin.js 호환) 🔧 수정
    // ===================
    async getPendingLessonPlans() {
        const result = await this.safeApiCall('대기중인 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            // 🔧 approved_at 컬럼 제거에 따른 수정 - status만으로 판단
            return await client
                .from('lesson_plans')
                .select('*')
                .eq('status', 'submitted');  // submitted 상태인 것들을 대기중으로 판단
        });

        return result.success ? (result.data || []) : [];
    },

    // ===================
    // 분야별 예산 설정 관리 (admin.js 호환)
    // ===================
    async getAllFieldBudgetSettings() {
        const result = await this.safeApiCall('분야별 예산 설정 조회', async () => {
            const client = await this.ensureClient();
            
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

    async updateFieldBudgetSettings(field, settings) {
        return await this.safeApiCall('분야별 예산 설정 업데이트', async () => {
            const client = await this.ensureClient();
            
            const updateData = {
                field: field,
                per_lesson_amount: settings.perLessonAmount || 0,
                max_budget_limit: settings.maxBudget || 0,
                updated_at: new Date().toISOString()
            };

            // UPSERT 방식으로 업데이트
            return await client
                .from('budget_settings')
                .upsert(updateData, {
                    onConflict: 'field'
                })
                .select();
        });
    },

    async getFieldBudgetStatus(field) {
        console.log(`📊 ${field} 분야 예산 현황 조회...`);
        
        try {
            const client = await this.ensureClient();
            
            // 🔧 해당 분야의 승인받은 수업계획을 가진 학생들 조회 (approved_at 컬럼 제거 반영)
            const approvedPlansResult = await client
                .from('lesson_plans')
                .select(`
                    user_id,
                    lessons,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .eq('status', 'approved')  // 🔧 status로만 판단
                .eq('user_profiles.field', field);

            if (!approvedPlansResult.data) {
                return {
                    success: true,
                    data: {
                        students: [],
                        statistics: {
                            totalStudents: 0,
                            totalAllocated: 0,
                            totalUsed: 0,
                            utilizationRate: 0
                        }
                    }
                };
            }

            const fieldBudgetSettings = await this.getAllFieldBudgetSettings();
            const fieldSetting = fieldBudgetSettings[field] || { perLessonAmount: 0, maxBudget: 0 };
            
            // 각 학생의 예산 정보 계산
            const studentsWithBudget = await Promise.all(
                approvedPlansResult.data.map(async (plan) => {
                    // 수업 횟수 계산
                    let totalLessons = 0;
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
                            }
                        }
                    } catch (e) {
                        console.warn('수업계획 파싱 오류:', e);
                    }

                    // 배정 예산 계산
                    const calculatedBudget = fieldSetting.perLessonAmount * totalLessons;
                    const allocatedBudget = fieldSetting.maxBudget > 0 ? 
                        Math.min(calculatedBudget, fieldSetting.maxBudget) : 
                        calculatedBudget;

                    // 사용 예산 계산 (해당 학생의 승인된/구매완료된 신청 총액)
                    const usedBudgetResult = await client
                        .from('requests')
                        .select('price')
                        .eq('user_id', plan.user_id)
                        .in('status', ['approved', 'purchased']);

                    const usedBudget = usedBudgetResult.data ? 
                        usedBudgetResult.data.reduce((sum, req) => sum + (req.price || 0), 0) : 0;

                    return {
                        user_id: plan.user_id,
                        allocated_budget: allocatedBudget,
                        used_budget: usedBudget,
                        user_profiles: plan.user_profiles || {
                            name: '사용자 정보 없음',
                            sejong_institute: '미설정'
                        }
                    };
                })
            );

            // 통계 계산
            const statistics = {
                totalStudents: studentsWithBudget.length,
                totalAllocated: studentsWithBudget.reduce((sum, s) => sum + s.allocated_budget, 0),
                totalUsed: studentsWithBudget.reduce((sum, s) => sum + s.used_budget, 0),
                utilizationRate: 0
            };

            if (statistics.totalAllocated > 0) {
                statistics.utilizationRate = Math.round((statistics.totalUsed / statistics.totalAllocated) * 100);
            }

            return {
                success: true,
                data: {
                    students: studentsWithBudget,
                    statistics
                }
            };

        } catch (error) {
            console.error(`❌ ${field} 분야 예산 현황 조회 실패:`, error);
            return {
                success: false,
                message: '예산 현황을 조회할 수 없습니다.'
            };
        }
    },

    // ===================
    // 🔧 수업계획 승인/반려 (admin.js 호환) - 단순화된 승인 로직
    // ===================
    async approveLessonPlan(studentId) {
        return await this.safeApiCall('수업계획 승인', async () => {
            const client = await this.ensureClient();
            
            // 🔧 단순화된 승인 처리 - status만 변경
            const approveResult = await client
                .from('lesson_plans')
                .update({
                    status: 'approved',  // 🔧 status만 변경
                    rejection_reason: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .eq('status', 'submitted')  // submitted 상태인 것만 승인
                .select();

            if (approveResult.error) throw approveResult.error;

            console.log('✅ 수업계획 승인 완료:', approveResult.data);
            return approveResult;
        });
    },

    async rejectLessonPlan(studentId, reason) {
        return await this.safeApiCall('수업계획 반려', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('lesson_plans')
                .update({
                    status: 'rejected',  // 🔧 status를 rejected로 변경
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .eq('status', 'submitted')  // submitted 상태인 것만 반려
                .select();
        });
    },

    // ===================
    // 교구 신청 상태 업데이트 (admin.js 호환)
    // ===================
    async updateItemStatus(requestId, status, rejectionReason = null) {
        return await this.safeApiCall('교구 신청 상태 업데이트', async () => {
            const client = await this.ensureClient();
            
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            } else if (status === 'approved') {
                updateData.reviewed_at = new Date().toISOString();
                updateData.reviewed_by = this.currentUser?.id || 'admin';
                updateData.rejection_reason = null;
            } else if (status === 'purchased') {
                updateData.purchased_at = new Date().toISOString();
            }

            return await client
                .from('requests')
                .update(updateData)
                .eq('id', requestId)
                .select();
        });
    },

    // ===================
    // Excel 내보내기용 데이터 준비 (admin.js 호환)
    // ===================
    async prepareExportData() {
        const result = await this.safeApiCall('Excel 내보내기용 데이터 준비', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('requests')
                .select(`
                    *,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute,
                        birth_date
                    )
                `)
                .order('created_at', { ascending: false });
        });

        if (result.success && result.data) {
            // CSV 형태로 변환
            return result.data.map(item => ({
                '신청일': new Date(item.created_at).toLocaleDateString('ko-KR'),
                '학생명': item.user_profiles?.name || '알 수 없음',
                '세종학당': item.user_profiles?.sejong_institute || '미설정',
                '분야': item.user_profiles?.field || '미설정',
                '교구명': item.item_name || '',
                '사용목적': item.purpose || '',
                '가격': item.price || 0,
                '구매방식': item.purchase_type === 'offline' ? '오프라인' : '온라인',
                '구매링크': item.purchase_link || '',
                '묶음여부': item.is_bundle ? '묶음' : '단일',
                '상태': this.getStatusText(item.status),
                '승인일': item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString('ko-KR') : '',
                '반려사유': item.rejection_reason || ''
            }));
        }

        return [];
    },

    // ===================
    // 시스템 설정 관리 (admin.js 호환)
    // ===================
    async updateSystemSetting(key, value) {
        return await this.safeApiCall('시스템 설정 업데이트', async () => {
            const client = await this.ensureClient();
            
            let settingValue = value;
            let settingType = 'string';
            
            if (typeof value === 'boolean') {
                settingValue = value.toString();
                settingType = 'boolean';
            } else if (typeof value === 'number') {
                settingValue = value.toString();
                settingType = 'number';
            } else if (typeof value === 'object') {
                settingValue = JSON.stringify(value);
                settingType = 'json';
            }

            return await client
                .from('system_settings')
                .upsert({
                    setting_key: key,
                    setting_value: settingValue,
                    setting_type: settingType,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'setting_key'
                })
                .select();
        });
    },

    async toggleTestMode() {
        const settings = await this.getSystemSettings();
        const newMode = !settings.test_mode;
        
        const result = await this.updateSystemSetting('test_mode', newMode);
        return result.success ? newMode : false;
    },

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

    // ===================
    // 교구 신청 관리
    // ===================
    async getStudentApplications(studentId) {
        const result = await this.safeApiCall('학생 신청 내역 조회', async () => {
            return await this.supabase
                .from('requests')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });
        });

        return result.success ? (result.data || []) : [];
    },

    async createApplication(studentId, formData) {
        return await this.safeApiCall('교구 신청 생성', async () => {
            const requestData = {
                user_id: studentId,
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                purchase_link: formData.purchase_link || null,
                is_bundle: formData.is_bundle || false,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            return await this.supabase
                .from('requests')
                .insert([requestData])
                .select();
        });
    },

    // 🚀 교구 신청 수정 (student-addon.js에서 사용)
    async updateApplication(applicationId, formData) {
        return await this.safeApiCall('교구 신청 수정', async () => {
            const updateData = {
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                purchase_link: formData.purchase_link || null,
                is_bundle: formData.is_bundle || false,
                updated_at: new Date().toISOString()
            };

            return await this.supabase
                .from('requests')
                .update(updateData)
                .eq('id', applicationId)
                .select();
        });
    },

    // 🚀 교구 신청 삭제 (student-addon.js에서 사용)
    async deleteApplication(applicationId) {
        return await this.safeApiCall('교구 신청 삭제', async () => {
            return await this.supabase
                .from('requests')
                .delete()
                .eq('id', applicationId)
                .select();
        });
    },

    // 🚀 특정 신청 조회 (student-addon.js에서 사용)
    async getApplicationById(applicationId) {
        return await this.safeApiCall('신청 상세 조회', async () => {
            return await this.supabase
                .from('requests')
                .select('*')
                .eq('id', applicationId)
                .single();
        });
    },

    // 모든 신청 내역 조회 (관리자용)
    async getAllApplications() {
        const result = await this.safeApiCall('모든 신청 내역 조회', async () => {
            return await this.supabase
                .from('requests')
                .select(`
                    *,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .order('created_at', { ascending: false });
        });

        return result.success ? (result.data || []) : [];
    },

    // 신청 승인/반려
    async updateApplicationStatus(applicationId, status, rejectionReason = null) {
        return await this.safeApiCall('신청 상태 업데이트', async () => {
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            } else if (status === 'approved') {
                updateData.reviewed_at = new Date().toISOString();
                updateData.reviewed_by = this.currentUser?.id || 'admin';
            } else if (status === 'purchased') {
                updateData.purchased_at = new Date().toISOString();
            }

            return await this.supabase
                .from('requests')
                .update(updateData)
                .eq('id', applicationId)
                .select();
        });
    },

    // ===================
    // 수업계획 관리
    // ===================
    async getStudentLessonPlan(studentId) {
        const result = await this.safeApiCall('학생 수업계획 조회', async () => {
            const { data, error } = await this.supabase
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
        return await this.safeApiCall('수업계획 저장', async () => {
            const status = isDraft ? 'draft' : 'submitted';
            const submitTime = isDraft ? null : new Date().toISOString();

            // 기존 수업계획 확인
            const existingResult = await this.supabase
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
                return await this.supabase
                    .from('lesson_plans')
                    .update(lessonPlanData)
                    .eq('user_id', studentId)
                    .select();
            } else {
                // 새로 생성
                return await this.supabase
                    .from('lesson_plans')
                    .insert([lessonPlanData])
                    .select();
            }
        });
    },

    async getAllLessonPlans() {
        const result = await this.safeApiCall('모든 수업계획 조회', async () => {
            // 수업계획 데이터 조회
            const lessonPlansResult = await this.supabase
                .from('lesson_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (lessonPlansResult.error) {
                return { data: null, error: lessonPlansResult.error };
            }

            const lessonPlans = lessonPlansResult.data || [];
            
            if (lessonPlans.length === 0) {
                return { data: [], error: null };
            }

            // 사용자 ID 목록 추출
            const userIds = [...new Set(lessonPlans.map(plan => plan.user_id).filter(id => id))];
            
            // 사용자 프로필 데이터 별도 조회
            let userProfiles = {};
            if (userIds.length > 0) {
                const profilesResult = await this.supabase
                    .from('user_profiles')
                    .select('id, name, field, sejong_institute')
                    .in('id', userIds);

                if (profilesResult.data) {
                    profilesResult.data.forEach(profile => {
                        userProfiles[profile.id] = profile;
                    });
                }
            }

            // 🔧 데이터 병합 (approved_at, approved_by 컬럼 제거 반영)
            const enrichedPlans = lessonPlans.map(plan => {
                let approval_status = 'pending';
                
                if (plan.status === 'draft') {
                    approval_status = 'draft';
                } else if (plan.status === 'submitted') {
                    approval_status = 'pending';
                } else if (plan.status === 'approved') {
                    approval_status = 'approved';
                } else if (plan.status === 'rejected') {
                    approval_status = 'rejected';
                }
                
                const userProfile = userProfiles[plan.user_id] || {
                    id: plan.user_id,
                    name: '사용자 정보 없음',
                    field: '미설정',
                    sejong_institute: '미설정'
                };
                
                return {
                    ...plan,
                    approval_status,
                    user_profiles: userProfile
                };
            });
            
            return { data: enrichedPlans, error: null };
        });

        return result.success ? result.data : [];
    },

    // 수업계획 승인/반려
    async updateLessonPlanStatus(planId, status, rejectionReason = null) {
        return await this.safeApiCall('수업계획 상태 업데이트', async () => {
            const updateData = {
                status: status,  // 🔧 status 직접 설정
                updated_at: new Date().toISOString()
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            } else if (status === 'approved') {
                updateData.rejection_reason = null;
            }

            return await this.supabase
                .from('lesson_plans')
                .update(updateData)
                .eq('id', planId)
                .select();
        });
    },

    // ===================
    // 시스템 설정
    // ===================
    async getSystemSettings() {
        const result = await this.safeApiCall('시스템 설정 조회', async () => {
            return await this.supabase
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
    },

    // ===================
    // 유틸리티 함수들
    // ===================
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    },

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        try {
            sessionStorage.removeItem('userSession');
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
        } catch (error) {
            console.warn('세션 정리 실패:', error);
        }
        console.log('✅ 로그아웃 완료');
    },

    // 연결 테스트
    async testConnection() {
        return await this.safeApiCall('연결 테스트', async () => {
            return await this.supabase
                .from('system_settings')
                .select('setting_key')
                .limit(1);
        });
    }
};

// 자동 초기화
(async () => {
    // CONFIG 로드 대기
    let waitCount = 0;
    while (!window.CONFIG && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (window.CONFIG) {
        await SupabaseAPI.init();
    } else {
        console.warn('⚠️ CONFIG 로드 타임아웃 - SupabaseAPI 수동 초기화 필요');
    }
})();

// 전역 접근을 위해 window 객체에 추가
window.SupabaseAPI = SupabaseAPI;

console.log('🚀 SupabaseAPI v2.10 loaded - 영수증 파일명 생성 로직 수정 ([학생명]_001 형태)');