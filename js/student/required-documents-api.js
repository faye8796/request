/**
 * 필수 서류 제출 API 관리 모듈 v1.0.2
 * 세종학당 문화인턴 지원 시스템
 * 
 * 기능:
 * - required_documents CRUD 작업
 * - emergency_contacts CRUD 작업  
 * - Storage 파일 업로드/다운로드
 * - 데이터 검증 및 변환
 */

class RequiredDocumentsAPI {
    constructor() {
        this.currentUser = null;
        this.storageBucket = 'required-documents';
        this.supabaseReady = false;
        
        // 사용자 정보 확인 (비자 관리 페이지와 동일한 로직)
        try {
            const userDataStr = localStorage.getItem('currentStudent');
            if (!userDataStr) {
                console.error('❌ 사용자 정보를 찾을 수 없습니다.');
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }

            this.currentUser = JSON.parse(userDataStr);
            if (!this.currentUser.id) {
                console.error('❌ 사용자 ID가 없습니다.');
                throw new Error('올바르지 않은 사용자 정보입니다.');
            }

            console.log('✅ 사용자 정보 확인 완료:', this.currentUser.id);
            
            // Supabase 초기화 (지연 로딩)
            this.initializeSupabase();
            
        } catch (error) {
            console.error('❌ RequiredDocumentsAPI 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * Supabase 클라이언트 초기화
     */
    async initializeSupabase() {
        try {
            // window.supabase가 이미 있는지 확인
            if (window.supabase) {
                this.supabase = window.supabase;
                this.supabaseReady = true;
                console.log('✅ 기존 Supabase 클라이언트 사용');
                return;
            }

            // Supabase가 로드될 때까지 대기
            let retries = 0;
            const maxRetries = 20;
            
            while (retries < maxRetries) {
                if (window.supabase) {
                    this.supabase = window.supabase;
                    this.supabaseReady = true;
                    console.log('✅ Supabase 클라이언트 준비 완료');
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 250));
                retries++;
            }

            // 수동 초기화 시도
            if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.CONFIG.SUPABASE_ANON_KEY) {
                console.log('🔧 CONFIG에서 Supabase 수동 초기화');
                const { createClient } = window.supabase;
                this.supabase = createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
                this.supabaseReady = true;
                console.log('✅ Supabase 수동 초기화 성공');
                return;
            }

            // 하드코딩된 값으로 최후 시도
            if (window.supabase && window.supabase.createClient) {
                console.log('🔧 하드코딩된 설정으로 Supabase 초기화');
                const supabaseUrl = 'https://aazvopacnbbkvusihqva.supabase.co';
                const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MjgyOTcsImV4cCI6MjA1MDAwNDI5N30.snkCLxCLQyBWOqHPGSj9oQs1vQ7j9R2H6AjhyNE2ub8';
                
                this.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
                this.supabaseReady = true;
                console.log('✅ 하드코딩된 설정으로 Supabase 초기화 성공');
                return;
            }

            throw new Error('Supabase 초기화 실패');

        } catch (error) {
            console.error('❌ Supabase 초기화 오류:', error);
            this.supabaseReady = false;
        }
    }

    /**
     * Supabase 준비 상태 확인
     */
    async ensureSupabaseReady() {
        if (this.supabaseReady && this.supabase) {
            return true;
        }

        console.log('⏳ Supabase 초기화 대기 중...');
        await this.initializeSupabase();
        
        if (!this.supabaseReady || !this.supabase) {
            throw new Error('Supabase 클라이언트가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
        }

        return true;
    }

    // ==================== 필수 서류 데이터 관리 ====================

    /**
     * 현재 사용자의 필수 서류 정보 조회
     */
    async getRequiredDocuments() {
        try {
            console.log('필수 서류 정보 조회 시작:', this.currentUser.id);
            await this.ensureSupabaseReady();

            const { data, error } = await this.supabase
                .from('required_documents')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found는 정상
                console.error('필수 서류 조회 오류:', error);
                throw error;
            }

            console.log('필수 서류 조회 결과:', data);
            return data || null;

        } catch (error) {
            console.error('필수 서류 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 필수 서류 정보 저장/업데이트
     */
    async saveRequiredDocuments(documentsData) {
        try {
            console.log('필수 서류 저장 시작:', documentsData);
            await this.ensureSupabaseReady();

            const dataToSave = {
                user_id: this.currentUser.id,
                ...documentsData,
                updated_at: new Date().toISOString()
            };

            // 기존 데이터 확인
            const existingData = await this.getRequiredDocuments();

            let result;
            if (existingData) {
                // 업데이트
                const { data, error } = await this.supabase
                    .from('required_documents')
                    .update(dataToSave)
                    .eq('user_id', this.currentUser.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                console.log('필수 서류 업데이트 완료:', result);
            } else {
                // 새로 생성
                dataToSave.created_at = new Date().toISOString();
                
                const { data, error } = await this.supabase
                    .from('required_documents')
                    .insert(dataToSave)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                console.log('필수 서류 생성 완료:', result);
            }

            return result;

        } catch (error) {
            console.error('필수 서류 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 최종 제출 처리
     */
    async submitRequiredDocuments() {
        try {
            console.log('필수 서류 최종 제출 시작');
            await this.ensureSupabaseReady();

            const submitData = {
                submission_status: 'pending',
                submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('required_documents')
                .update(submitData)
                .eq('user_id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            console.log('필수 서류 제출 완료:', data);
            return data;

        } catch (error) {
            console.error('필수 서류 제출 실패:', error);
            throw error;
        }
    }

    // ==================== 비상연락망 데이터 관리 ====================

    /**
     * 비상연락망 정보 조회
     */
    async getEmergencyContacts() {
        try {
            console.log('비상연락망 정보 조회 시작:', this.currentUser.id);
            await this.ensureSupabaseReady();

            const { data, error } = await this.supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found는 정상
                console.error('비상연락망 조회 오류:', error);
                throw error;
            }

            console.log('비상연락망 조회 결과:', data);
            return data || null;

        } catch (error) {
            console.error('비상연락망 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 비상연락망 정보 저장/업데이트
     */
    async saveEmergencyContacts(emergencyData) {
        try {
            console.log('비상연락망 저장 시작:', emergencyData);
            await this.ensureSupabaseReady();

            const dataToSave = {
                user_id: this.currentUser.id,
                ...emergencyData,
                updated_at: new Date().toISOString()
            };

            // 기존 데이터 확인
            const existingData = await this.getEmergencyContacts();

            let result;
            if (existingData) {
                // 업데이트
                const { data, error } = await this.supabase
                    .from('emergency_contacts')
                    .update(dataToSave)
                    .eq('user_id', this.currentUser.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                console.log('비상연락망 업데이트 완료:', result);
            } else {
                // 새로 생성
                dataToSave.created_at = new Date().toISOString();
                
                const { data, error } = await this.supabase
                    .from('emergency_contacts')
                    .insert(dataToSave)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                console.log('비상연락망 생성 완료:', result);
            }

            return result;

        } catch (error) {
            console.error('비상연락망 저장 실패:', error);
            throw error;
        }
    }

    // ==================== 파일 업로드 관리 ====================

    /**
     * 필수 서류 PDF 업로드
     */
    async uploadRequiredDocument(file) {
        try {
            console.log('필수 서류 업로드 시작:', file.name);
            await this.ensureSupabaseReady();

            // 파일 검증
            this.validateDocumentFile(file);

            // 파일명 생성
            const fileName = `${this.currentUser.id}/documents/required_document_${Date.now()}.pdf`;

            // Storage 업로드
            const { data, error } = await this.supabase.storage
                .from(this.storageBucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // 공개 URL 생성
            const { data: urlData } = this.supabase.storage
                .from(this.storageBucket)
                .getPublicUrl(fileName);

            console.log('필수 서류 업로드 완료:', urlData.publicUrl);

            // DB 업데이트
            await this.saveRequiredDocuments({
                required_document_url: urlData.publicUrl,
                document_upload_date: new Date().toISOString()
            });

            return {
                url: urlData.publicUrl,
                fileName: fileName,
                uploadDate: new Date().toISOString()
            };

        } catch (error) {
            console.error('필수 서류 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 통장 사본 업로드
     */
    async uploadBankbookCopy(file) {
        try {
            console.log('통장 사본 업로드 시작:', file.name);
            await this.ensureSupabaseReady();

            // 파일 검증
            this.validateImageFile(file);

            // 파일명 생성
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/bankbooks/bankbook_copy_${Date.now()}.${fileExt}`;

            // Storage 업로드
            const { data, error } = await this.supabase.storage
                .from(this.storageBucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // 공개 URL 생성
            const { data: urlData } = this.supabase.storage
                .from(this.storageBucket)
                .getPublicUrl(fileName);

            console.log('통장 사본 업로드 완료:', urlData.publicUrl);

            // DB 업데이트
            await this.saveRequiredDocuments({
                bankbook_copy_url: urlData.publicUrl
            });

            return {
                url: urlData.publicUrl,
                fileName: fileName,
                uploadDate: new Date().toISOString()
            };

        } catch (error) {
            console.error('통장 사본 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 파일 삭제
     */
    async deleteFile(fileUrl) {
        try {
            console.log('파일 삭제 시작:', fileUrl);
            await this.ensureSupabaseReady();

            // URL에서 파일 경로 추출
            const fileName = this.extractFileNameFromUrl(fileUrl);
            
            if (!fileName) {
                throw new Error('파일 경로를 추출할 수 없습니다.');
            }

            // Storage에서 삭제
            const { error } = await this.supabase.storage
                .from(this.storageBucket)
                .remove([fileName]);

            if (error) throw error;

            console.log('파일 삭제 완료:', fileName);
            return true;

        } catch (error) {
            console.error('파일 삭제 실패:', error);
            throw error;
        }
    }

    // ==================== 진행 상황 관리 ====================

    /**
     * 전체 진행 상황 조회
     */
    async getOverallProgress() {
        try {
            console.log('전체 진행 상황 조회 시작');
            await this.ensureSupabaseReady();

            const [documentsData, emergencyData] = await Promise.all([
                this.getRequiredDocuments(),
                this.getEmergencyContacts()
            ]);

            const progress = {
                documents: {
                    completed: false,
                    hasRequiredDocument: false,
                    hasAccountInfo: false
                },
                emergency: {
                    completed: false,
                    requiredFieldsCount: 0,
                    completedFieldsCount: 0
                },
                overall: {
                    completedSteps: 0,
                    totalSteps: 2,
                    percentage: 0,
                    canSubmit: false
                }
            };

            // 필수 서류 진행 상황
            if (documentsData) {
                progress.documents.hasRequiredDocument = !!documentsData.required_document_url;
                progress.documents.hasAccountInfo = !!(
                    documentsData.salary_bank_name && 
                    documentsData.salary_account_number && 
                    documentsData.salary_account_holder &&
                    documentsData.bankbook_copy_url
                );
                progress.documents.completed = progress.documents.hasRequiredDocument && progress.documents.hasAccountInfo;
            }

            // 비상연락망 진행 상황
            if (emergencyData) {
                const requiredFields = [
                    'blood_type', 'local_phone', 'domestic_phone', 
                    'local_address', 'domestic_address',
                    'institute_director_name', 'institute_manager_name',
                    'local_emergency_name', 'local_emergency_phone',
                    'domestic_emergency_name', 'domestic_emergency_phone',
                    'university_name', 'university_contact_name', 'university_contact_phone'
                ];
                
                progress.emergency.requiredFieldsCount = requiredFields.length;
                progress.emergency.completedFieldsCount = requiredFields.filter(field => 
                    emergencyData[field] && emergencyData[field].trim()
                ).length;
                
                progress.emergency.completed = progress.emergency.completedFieldsCount === progress.emergency.requiredFieldsCount;
            }

            // 전체 진행 상황 계산
            if (progress.documents.completed) progress.overall.completedSteps++;
            if (progress.emergency.completed) progress.overall.completedSteps++;
            
            progress.overall.percentage = Math.round(
                (progress.overall.completedSteps / progress.overall.totalSteps) * 100
            );
            
            progress.overall.canSubmit = progress.overall.completedSteps === progress.overall.totalSteps;

            console.log('전체 진행 상황 조회 완료:', progress);
            return progress;

        } catch (error) {
            console.error('진행 상황 조회 실패:', error);
            // 오류가 발생해도 기본값 반환
            return {
                documents: { completed: false, hasRequiredDocument: false, hasAccountInfo: false },
                emergency: { completed: false, requiredFieldsCount: 14, completedFieldsCount: 0 },
                overall: { completedSteps: 0, totalSteps: 2, percentage: 0, canSubmit: false }
            };
        }
    }

    // ==================== 유틸리티 함수 ====================

    /**
     * PDF 파일 검증
     */
    validateDocumentFile(file) {
        console.log('PDF 파일 검증:', file);

        if (!file) {
            throw new Error('파일이 선택되지 않았습니다.');
        }

        // MIME 타입 검증
        if (file.type !== 'application/pdf') {
            throw new Error('PDF 파일만 업로드 가능합니다.');
        }

        // 파일 크기 검증 (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('파일 크기는 10MB 이하여야 합니다.');
        }

        console.log('PDF 파일 검증 통과');
    }

    /**
     * 이미지 파일 검증
     */
    validateImageFile(file) {
        console.log('이미지 파일 검증:', file);

        if (!file) {
            throw new Error('파일이 선택되지 않았습니다.');
        }

        // MIME 타입 검증
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('JPG, PNG, WebP, PDF 파일만 업로드 가능합니다.');
        }

        // 파일 크기 검증 (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('파일 크기는 10MB 이하여야 합니다.');
        }

        console.log('이미지 파일 검증 통과');
    }

    /**
     * URL에서 파일명 추출
     */
    extractFileNameFromUrl(url) {
        try {
            if (!url) return null;
            
            // Supabase Storage URL 패턴에서 파일 경로 추출
            const match = url.match(/\/storage\/v1\/object\/public\/required-documents\/(.+)$/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
            
            return null;
        } catch (error) {
            console.error('파일명 추출 실패:', error);
            return null;
        }
    }

    /**
     * 전화번호 형식 검증
     */
    validatePhoneNumber(phone) {
        if (!phone) return false;
        
        // 한국 휴대폰 번호 패턴 (010-1234-5678 또는 01012345678)
        const koreanPattern = /^010-?\d{4}-?\d{4}$/;
        
        // 국제 전화번호 패턴 (+1-234-567-8900)
        const internationalPattern = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{4}$/;
        
        return koreanPattern.test(phone) || internationalPattern.test(phone);
    }

    /**
     * 계좌번호 형식 검증
     */
    validateAccountNumber(accountNumber) {
        if (!accountNumber) return false;
        
        // 계좌번호는 10-20자리 숫자와 하이픈만 허용
        const pattern = /^[\d-]{10,20}$/;
        return pattern.test(accountNumber);
    }

    /**
     * 파일 크기 포맷팅
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 임시 저장 데이터 관리
     */
    saveTempData(key, data) {
        try {
            const tempKey = `required_docs_temp_${this.currentUser.id}_${key}`;
            localStorage.setItem(tempKey, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
            console.log('임시 데이터 저장 완료:', tempKey);
        } catch (error) {
            console.error('임시 데이터 저장 실패:', error);
        }
    }

    /**
     * 임시 저장 데이터 불러오기
     */
    loadTempData(key) {
        try {
            const tempKey = `required_docs_temp_${this.currentUser.id}_${key}`;
            const tempData = localStorage.getItem(tempKey);
            
            if (!tempData) return null;
            
            const parsed = JSON.parse(tempData);
            
            // 24시간 이후 데이터는 무효화
            const maxAge = 24 * 60 * 60 * 1000; // 24시간
            if (Date.now() - parsed.timestamp > maxAge) {
                localStorage.removeItem(tempKey);
                return null;
            }
            
            console.log('임시 데이터 불러오기 완료:', tempKey);
            return parsed.data;
            
        } catch (error) {
            console.error('임시 데이터 불러오기 실패:', error);
            return null;
        }
    }

    /**
     * 임시 저장 데이터 삭제
     */
    clearTempData(key) {
        try {
            const tempKey = `required_docs_temp_${this.currentUser.id}_${key}`;
            localStorage.removeItem(tempKey);
            console.log('임시 데이터 삭제 완료:', tempKey);
        } catch (error) {
            console.error('임시 데이터 삭제 실패:', error);
        }
    }
}

// 전역 스코프에 클래스 등록
window.RequiredDocumentsAPI = RequiredDocumentsAPI;

console.log('RequiredDocumentsAPI 모듈 로드 완료 v1.0.2');