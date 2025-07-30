/**
 * 관리자용 비자 발급 관리 시스템 - API 통신 모듈
 * Version: 1.0.1
 * Description: Supabase API 통신 및 데이터 관리
 */

class VisaManagementAPI {
    constructor() {
        // window.CONFIG 사용으로 변경 (config.js의 정상적인 접근 방식)
        if (!window.CONFIG) {
            console.error('CONFIG가 로드되지 않았습니다. config.js를 먼저 로드해주세요.');
            throw new Error('CONFIG not loaded');
        }
        this.supabase = window.supabase || window.CONFIG.supabase;
        
        if (!this.supabase) {
            console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
            throw new Error('Supabase client not initialized');
        }
    }

    /**
     * 전체 학생 목록 조회
     */
    async getStudents() {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(`
                    id,
                    name,
                    email,
                    institute_name,
                    created_at,
                    actual_arrival_date,
                    actual_work_end_date
                `)
                .eq('role', 'student')
                .order('name');

            if (error) {
                throw new Error(`학생 목록 조회 실패: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('getStudents 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 학생들의 비자 신청 정보 조회
     */
    async getVisaApplications(studentIds = []) {
        try {
            if (studentIds.length === 0) return [];

            const { data, error } = await this.supabase
                .from('visa_applications')
                .select('*')
                .in('user_id', studentIds);

            if (error) {
                throw new Error(`비자 신청 정보 조회 실패: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('getVisaApplications 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 학생의 비자 신청 정보 조회
     */
    async getVisaApplication(studentId) {
        try {
            const { data, error } = await this.supabase
                .from('visa_applications')
                .select('*')
                .eq('user_id', studentId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw new Error(`비자 신청 정보 조회 실패: ${error.message}`);
            }

            return data || null;
        } catch (error) {
            console.error('getVisaApplication 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 학생들의 영수증 개수 조회
     */
    async getReceiptsCount(studentIds = []) {
        try {
            if (studentIds.length === 0) return {};

            const { data, error } = await this.supabase
                .from('visa_receipts')
                .select('user_id')
                .in('user_id', studentIds);

            if (error) {
                throw new Error(`영수증 개수 조회 실패: ${error.message}`);
            }

            // 사용자별 개수 계산
            const countMap = {};
            (data || []).forEach(receipt => {
                countMap[receipt.user_id] = (countMap[receipt.user_id] || 0) + 1;
            });

            return countMap;
        } catch (error) {
            console.error('getReceiptsCount 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 학생의 영수증 목록 조회
     */
    async getStudentReceipts(studentId) {
        try {
            const { data, error } = await this.supabase
                .from('visa_receipts')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`영수증 목록 조회 실패: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('getStudentReceipts 오류:', error);
            throw error;
        }
    }

    /**
     * 관리자 코멘트 저장/업데이트
     */
    async saveAdminComment(studentId, comment) {
        try {
            const now = new Date().toISOString();
            
            const { data, error } = await this.supabase
                .from('visa_applications')
                .upsert({
                    user_id: studentId,
                    admin_comment: comment,
                    admin_comment_updated_at: now,
                    updated_at: now
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) {
                throw new Error(`관리자 코멘트 저장 실패: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('saveAdminComment 오류:', error);
            throw error;
        }
    }

    /**
     * 비자 신청 상태 업데이트 (학생이 입력한 상태)
     */
    async updateVisaStatus(studentId, status) {
        try {
            const now = new Date().toISOString();
            
            const { data, error } = await this.supabase
                .from('visa_applications')
                .upsert({
                    user_id: studentId,
                    visa_status: status,
                    visa_status_updated_at: now,
                    updated_at: now
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) {
                throw new Error(`비자 상태 업데이트 실패: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('updateVisaStatus 오류:', error);
            throw error;
        }
    }

    /**
     * 비자 문서 업로드 정보 업데이트
     */
    async updateVisaDocument(studentId, documentUrl) {
        try {
            const now = new Date().toISOString();
            
            const { data, error } = await this.supabase
                .from('visa_applications')
                .upsert({
                    user_id: studentId,
                    visa_document_url: documentUrl,
                    visa_document_uploaded_at: now,
                    updated_at: now
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) {
                throw new Error(`비자 문서 정보 업데이트 실패: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('updateVisaDocument 오류:', error);
            throw error;
        }
    }

    /**
     * 영수증 추가
     */
    async addReceipt(studentId, title, receiptUrl) {
        try {
            const now = new Date().toISOString();
            
            const { data, error } = await this.supabase
                .from('visa_receipts')
                .insert({
                    user_id: studentId,
                    receipt_title: title,
                    receipt_url: receiptUrl,
                    uploaded_at: now,
                    created_at: now,
                    updated_at: now
                })
                .select()
                .single();

            if (error) {
                throw new Error(`영수증 추가 실패: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('addReceipt 오류:', error);
            throw error;
        }
    }

    /**
     * 영수증 삭제
     */
    async deleteReceipt(receiptId) {
        try {
            const { error } = await this.supabase
                .from('visa_receipts')
                .delete()
                .eq('id', receiptId);

            if (error) {
                throw new Error(`영수증 삭제 실패: ${error.message}`);
            }

            return true;
        } catch (error) {
            console.error('deleteReceipt 오류:', error);
            throw error;
        }
    }

    /**
     * 전체 통계 조회
     */
    async getStatistics() {
        try {
            // 전체 학생 수
            const { count: totalStudents, error: studentsError } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student');

            if (studentsError) {
                throw new Error(`전체 학생 수 조회 실패: ${studentsError.message}`);
            }

            // 비자 신청 정보가 있는 학생들
            const { data: visaApplications, error: visaError } = await this.supabase
                .from('visa_applications')
                .select('user_id, visa_status, visa_document_url');

            if (visaError) {
                throw new Error(`비자 신청 통계 조회 실패: ${visaError.message}`);
            }

            // 통계 계산
            let inProgress = 0;
            let completed = 0;
            let noStatus = 0;

            const studentIds = new Set();
            (visaApplications || []).forEach(visa => {
                studentIds.add(visa.user_id);
                
                if (!visa.visa_status || visa.visa_status.trim() === '') {
                    noStatus++;
                } else if (visa.visa_document_url) {
                    completed++;
                } else {
                    inProgress++;
                }
            });

            // 비자 신청 정보가 없는 학생들
            noStatus += (totalStudents || 0) - studentIds.size;

            return {
                total: totalStudents || 0,
                inProgress,
                completed,
                noStatus
            };
        } catch (error) {
            console.error('getStatistics 오류:', error);
            throw error;
        }
    }

    /**
     * 파일 업로드 (Supabase Storage)
     */
    async uploadFile(bucket, fileName, file) {
        try {
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                throw new Error(`파일 업로드 실패: ${error.message}`);
            }

            // 공개 URL 가져오기
            const { data: publicUrlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return {
                path: data.path,
                publicUrl: publicUrlData.publicUrl
            };
        } catch (error) {
            console.error('uploadFile 오류:', error);
            throw error;
        }
    }

    /**
     * 파일 삭제 (Supabase Storage)
     */
    async deleteFile(bucket, fileName) {
        try {
            const { error } = await this.supabase.storage
                .from(bucket)
                .remove([fileName]);

            if (error) {
                throw new Error(`파일 삭제 실패: ${error.message}`);
            }

            return true;
        } catch (error) {
            console.error('deleteFile 오류:', error);
            throw error;
        }
    }

    /**
     * 파일 다운로드 URL 생성
     */
    getDownloadUrl(bucket, fileName, expiresIn = 3600) {
        try {
            const { data, error } = this.supabase.storage
                .from(bucket)
                .createSignedUrl(fileName, expiresIn);

            if (error) {
                throw new Error(`다운로드 URL 생성 실패: ${error.message}`);
            }

            return data.signedUrl;
        } catch (error) {
            console.error('getDownloadUrl 오류:', error);
            throw error;
        }
    }

    /**
     * 실시간 데이터 변경 구독
     */
    subscribeToVisaChanges(callback) {
        try {
            const subscription = this.supabase
                .channel('visa_applications_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'visa_applications'
                }, callback)
                .subscribe();

            return subscription;
        } catch (error) {
            console.error('subscribeToVisaChanges 오류:', error);
            throw error;
        }
    }

    /**
     * 실시간 영수증 변경 구독
     */
    subscribeToReceiptChanges(callback) {
        try {
            const subscription = this.supabase
                .channel('visa_receipts_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'visa_receipts'
                }, callback)
                .subscribe();

            return subscription;
        } catch (error) {
            console.error('subscribeToReceiptChanges 오류:', error);
            throw error;
        }
    }

    /**
     * 구독 해제
     */
    unsubscribe(subscription) {
        try {
            if (subscription) {
                this.supabase.removeChannel(subscription);
            }
        } catch (error) {
            console.error('unsubscribe 오류:', error);
        }
    }

    /**
     * 연결 상태 확인
     */
    async checkConnection() {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('id')
                .limit(1);

            if (error) {
                throw new Error(`연결 확인 실패: ${error.message}`);
            }

            return true;
        } catch (error) {
            console.error('checkConnection 오류:', error);
            return false;
        }
    }

    /**
     * 배치 작업: 여러 학생의 코멘트 동시 저장
     */
    async batchSaveComments(comments) {
        try {
            const now = new Date().toISOString();
            
            const updates = comments.map(({ studentId, comment }) => ({
                user_id: studentId,
                admin_comment: comment,
                admin_comment_updated_at: now,
                updated_at: now
            }));

            const { data, error } = await this.supabase
                .from('visa_applications')
                .upsert(updates, {
                    onConflict: 'user_id'
                });

            if (error) {
                throw new Error(`배치 코멘트 저장 실패: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('batchSaveComments 오류:', error);
            throw error;
        }
    }
}

// 모듈 내보내기
export { VisaManagementAPI };