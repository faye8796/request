/**
 * 비자 관리 시스템 API 모듈 v1.3.0 (Supabase 클라이언트 초기화 완전 수정)
 * localStorage 기반 인증 시스템에 맞춘 API 계층
 */

(function() {
    'use strict';

    console.log('🔧 VisaManagementAPI v1.3.0 로딩... (클라이언트 초기화 완전 수정)');

    class VisaManagementAPI {
        constructor() {
            this.supabase = null;
            this.currentUser = null;
            this.initPromise = this.init();
        }

        // 초기화 (비동기 대기 지원)
        async init() {
            try {
                // Supabase 클라이언트 초기화 (다양한 소스에서 시도)
                await this.initializeSupabaseClient();

                // 현재 사용자 정보 로드
                await this.loadCurrentUser();

                console.log('✅ VisaManagementAPI v1.3.0 초기화 완료');
                return true;
            } catch (error) {
                console.error('❌ VisaManagementAPI 초기화 실패:', error);
                return false;
            }
        }

        // 🔧 v1.3.0: 완전히 개선된 Supabase 클라이언트 초기화
        async initializeSupabaseClient() {
            let attempts = 0;
            const maxAttempts = 15;

            while (attempts < maxAttempts) {
                try {
                    // 1. window.supabase 직접 사용 (가장 일반적)
                    if (window.supabase && typeof window.supabase.from === 'function') {
                        this.supabase = window.supabase;
                        console.log('✅ window.supabase 직접 사용');
                        return;
                    }

                    // 2. SupabaseCore.client 사용
                    if (window.SupabaseCore?.client && typeof window.SupabaseCore.client.from === 'function') {
                        this.supabase = window.SupabaseCore.client;
                        console.log('✅ window.SupabaseCore.client 사용');
                        return;
                    }

                    // 3. supabaseClient 전역 변수 사용
                    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
                        this.supabase = window.supabaseClient;
                        console.log('✅ window.supabaseClient 사용');
                        return;
                    }

                    // 4. SupabaseCore 수동 초기화 시도
                    if (window.SupabaseCore && typeof window.SupabaseCore.initialize === 'function') {
                        console.log('🔄 SupabaseCore 수동 초기화 시도...');
                        await window.SupabaseCore.initialize();
                        
                        if (window.SupabaseCore.client && typeof window.SupabaseCore.client.from === 'function') {
                            this.supabase = window.SupabaseCore.client;
                            console.log('✅ SupabaseCore 수동 초기화 후 클라이언트 획득');
                            return;
                        }
                    }

                    // 5. 직접 Supabase 클라이언트 생성 (최후의 수단)
                    if (window.supabase?.createClient && window.CONFIG?.SUPABASE_URL && window.CONFIG?.SUPABASE_ANON_KEY) {
                        this.supabase = window.supabase.createClient(
                            window.CONFIG.SUPABASE_URL,
                            window.CONFIG.SUPABASE_ANON_KEY
                        );
                        console.log('✅ 직접 Supabase 클라이언트 생성');
                        
                        // 생성된 클라이언트가 정상 작동하는지 확인
                        if (typeof this.supabase.from === 'function') {
                            return;
                        } else {
                            console.warn('⚠️ 생성된 클라이언트가 비정상');
                            this.supabase = null;
                        }
                    }

                    // 6. 전역 스코프에서 createClient 함수 찾기
                    if (typeof createClient === 'function' && window.CONFIG?.SUPABASE_URL && window.CONFIG?.SUPABASE_ANON_KEY) {
                        this.supabase = createClient(
                            window.CONFIG.SUPABASE_URL,
                            window.CONFIG.SUPABASE_ANON_KEY
                        );
                        console.log('✅ 전역 createClient 함수로 클라이언트 생성');
                        
                        if (typeof this.supabase.from === 'function') {
                            return;
                        } else {
                            this.supabase = null;
                        }
                    }

                    attempts++;
                    console.log(`⏳ Supabase 클라이언트 대기 중... (${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 300));

                } catch (error) {
                    console.warn(`⚠️ Supabase 클라이언트 초기화 시도 ${attempts + 1} 실패:`, error);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
        }

        // API 호출 전 초기화 확인
        async ensureInitialized() {
            if (!this.supabase || !this.currentUser) {
                console.log('🔄 API 초기화 대기 중...');
                await this.initPromise;
                
                if (!this.supabase) {
                    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
                }
                if (!this.currentUser) {
                    throw new Error('사용자 정보가 로드되지 않았습니다.');
                }
            }
        }

        // 현재 사용자 정보 로드 (localStorage 기반)
        async loadCurrentUser() {
            try {
                const userDataStr = localStorage.getItem('currentStudent');
                if (!userDataStr) {
                    throw new Error('사용자 데이터 없음');
                }

                this.currentUser = JSON.parse(userDataStr);
                if (!this.currentUser.id) {
                    throw new Error('사용자 ID 없음');
                }

                console.log('✅ localStorage에서 사용자 로드:', this.currentUser.name || this.currentUser.email);
            } catch (error) {
                console.error('❌ 사용자 정보 로드 실패:', error);
                throw error;
            }
        }

        // ===== 비자 신청 정보 관련 API =====

        // 비자 신청 정보 조회
        async getVisaApplication() {
            try {
                await this.ensureInitialized();

                const { data, error } = await this.supabase
                    .from('visa_applications')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116: 데이터 없음
                    throw error;
                }

                return {
                    success: true,
                    data: data || null
                };

            } catch (error) {
                console.error('❌ 비자 신청 정보 조회 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 비자 상태 업데이트 (upsert)
        async updateVisaStatus(statusText) {
            try {
                await this.ensureInitialized();

                const visaData = {
                    user_id: this.currentUser.id,
                    visa_status: statusText,
                    visa_status_updated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data, error } = await this.supabase
                    .from('visa_applications')
                    .upsert(visaData, { 
                        onConflict: 'user_id',
                        ignoreDuplicates: false 
                    })
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                console.log('✅ 비자 상태 업데이트 완료');
                return {
                    success: true,
                    data: data
                };

            } catch (error) {
                console.error('❌ 비자 상태 업데이트 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 비자 문서 업로드
        async uploadVisaDocument(file) {
            try {
                await this.ensureInitialized();

                // 파일 검증
                if (!this.validateFile(file, 10)) { // 10MB 제한
                    throw new Error('파일이 유효하지 않습니다.');
                }

                // 파일명 생성
                const timestamp = Date.now();
                const extension = file.name.split('.').pop();
                const fileName = `visa_${this.currentUser.id}_${timestamp}.${extension}`;

                // 스토리지에 업로드
                const { data, error } = await this.supabase.storage
                    .from('visa-documents')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    throw error;
                }

                // 공개 URL 생성
                const { data: publicUrl } = this.supabase.storage
                    .from('visa-documents')
                    .getPublicUrl(fileName);

                // 데이터베이스에 URL 저장
                const updateResult = await this.updateVisaDocument(publicUrl.publicUrl);
                if (!updateResult.success) {
                    throw new Error(updateResult.error);
                }

                console.log('✅ 비자 문서 업로드 완료:', fileName);
                return {
                    success: true,
                    data: {
                        fileName: fileName,
                        publicUrl: publicUrl.publicUrl
                    }
                };

            } catch (error) {
                console.error('❌ 비자 문서 업로드 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 비자 문서 URL 업데이트
        async updateVisaDocument(documentUrl) {
            try {
                await this.ensureInitialized();

                const visaData = {
                    user_id: this.currentUser.id,
                    visa_document_url: documentUrl,
                    visa_document_uploaded_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data, error } = await this.supabase
                    .from('visa_applications')
                    .upsert(visaData, { 
                        onConflict: 'user_id',
                        ignoreDuplicates: false 
                    })
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                return {
                    success: true,
                    data: data
                };

            } catch (error) {
                console.error('❌ 비자 문서 URL 업데이트 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 비자 문서 삭제
        async deleteVisaDocument(documentUrl) {
            try {
                await this.ensureInitialized();

                // URL에서 파일명 추출
                if (documentUrl) {
                    const fileName = this.extractFileNameFromUrl(documentUrl);
                    if (fileName) {
                        // 스토리지에서 파일 삭제
                        const { error: deleteError } = await this.supabase.storage
                            .from('visa-documents')
                            .remove([fileName]);

                        if (deleteError) {
                            console.warn('⚠️ 스토리지 파일 삭제 실패:', deleteError);
                        }
                    }
                }

                // 데이터베이스에서 URL 삭제
                const { data, error } = await this.supabase
                    .from('visa_applications')
                    .update({
                        visa_document_url: null,
                        visa_document_uploaded_at: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.currentUser.id)
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                console.log('✅ 비자 문서 삭제 완료');
                return {
                    success: true,
                    data: data
                };

            } catch (error) {
                console.error('❌ 비자 문서 삭제 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // ===== 영수증 관련 API =====

        // 영수증 목록 조회
        async getVisaReceipts() {
            try {
                await this.ensureInitialized();

                const { data, error } = await this.supabase
                    .from('visa_receipts')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }

                return {
                    success: true,
                    data: data || []
                };

            } catch (error) {
                console.error('❌ 영수증 목록 조회 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 영수증 추가
        async addVisaReceipt(title, file) {
            try {
                await this.ensureInitialized();

                // 파일 검증
                if (!this.validateFile(file, 5)) { // 5MB 제한
                    throw new Error('파일이 유효하지 않습니다.');
                }

                // 파일 업로드
                const timestamp = Date.now();
                const extension = file.name.split('.').pop();
                const fileName = `receipt_${this.currentUser.id}_${timestamp}.${extension}`;

                const { data: uploadData, error: uploadError } = await this.supabase.storage
                    .from('visa-receipts')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    throw uploadError;
                }

                // 공개 URL 생성
                const { data: publicUrl } = this.supabase.storage
                    .from('visa-receipts')
                    .getPublicUrl(fileName);

                // 데이터베이스에 영수증 정보 저장
                const { data, error } = await this.supabase
                    .from('visa_receipts')
                    .insert({
                        user_id: this.currentUser.id,
                        receipt_title: title,
                        receipt_url: publicUrl.publicUrl,
                        uploaded_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                console.log('✅ 영수증 추가 완료:', title);
                return {
                    success: true,
                    data: data
                };

            } catch (error) {
                console.error('❌ 영수증 추가 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 영수증 삭제
        async deleteVisaReceipt(receiptId, receiptUrl) {
            try {
                await this.ensureInitialized();

                // 스토리지에서 파일 삭제
                if (receiptUrl) {
                    const fileName = this.extractFileNameFromUrl(receiptUrl);
                    if (fileName) {
                        const { error: deleteError } = await this.supabase.storage
                            .from('visa-receipts')
                            .remove([fileName]);

                        if (deleteError) {
                            console.warn('⚠️ 영수증 파일 삭제 실패:', deleteError);
                        }
                    }
                }

                // 데이터베이스에서 삭제
                const { data, error } = await this.supabase
                    .from('visa_receipts')
                    .delete()
                    .eq('id', receiptId)
                    .eq('user_id', this.currentUser.id)
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                console.log('✅ 영수증 삭제 완료:', receiptId);
                return {
                    success: true,
                    data: data
                };

            } catch (error) {
                console.error('❌ 영수증 삭제 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // ===== 유틸리티 메서드 =====

        // 파일 검증
        validateFile(file, maxSizeMB) {
            if (!file) {
                return false;
            }

            // 크기 검증
            const maxSize = maxSizeMB * 1024 * 1024; // MB to bytes
            if (file.size > maxSize) {
                console.warn(`⚠️ 파일 크기 초과: ${file.size} > ${maxSize}`);
                return false;
            }

            // 형식 검증
            const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                'application/pdf'
            ];
            
            if (!allowedTypes.includes(file.type)) {
                console.warn(`⚠️ 지원하지 않는 파일 형식: ${file.type}`);
                return false;
            }

            return true;
        }

        // URL에서 파일명 추출
        extractFileNameFromUrl(url) {
            try {
                const urlParts = url.split('/');
                return urlParts[urlParts.length - 1];
            } catch (error) {
                console.warn('⚠️ 파일명 추출 실패:', error);
                return null;
            }
        }

        // 파일 크기 포맷팅
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // 날짜 포맷팅
        formatDate(dateString) {
            try {
                const date = new Date(dateString);
                return date.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return dateString;
            }
        }

        // 현재 사용자 정보 새로고침
        async refreshCurrentUser() {
            try {
                await this.loadCurrentUser();
                return {
                    success: true,
                    data: this.currentUser
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 디버깅용 현재 상태 반환
        getDebugInfo() {
            return {
                currentUser: this.currentUser,
                supabaseConnected: !!this.supabase,
                supabaseType: this.supabase ? this.supabase.constructor.name : 'null',
                version: 'v1.3.0 (클라이언트 초기화 완전 수정)'
            };
        }
    }

    // 전역에 API 인스턴스 생성
    window.visaManagementAPI = new VisaManagementAPI();

    console.log('✅ VisaManagementAPI v1.3.0 로드 완료 (클라이언트 초기화 완전 수정)');

})();
