// passport-info-api.js - 여권정보 API 통신 모듈 v7.0.0
// Storage 유틸리티 통합 버전

class PassportAPI {
    constructor() {
        this.supabase = window.supabase;
        this.user = null;
        this.storageUtils = window.StorageUtils;
    }

    // 현재 사용자 정보 가져오기
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;
            this.user = user;
            return user;
        } catch (error) {
            console.error('사용자 정보 조회 실패:', error);
            throw error;
        }
    }

    // 기존 여권정보 조회
    async getPassportInfo() {
        try {
            if (!this.user) await this.getCurrentUser();
            
            const { data, error } = await this.supabase
                .from('passport_info')
                .select('*')
                .eq('user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('여권정보 조회 실패:', error);
            throw error;
        }
    }

    // 여권정보 저장 (생성 또는 수정) - Storage 유틸리티 사용
    async savePassportInfo(passportData, imageFile = null) {
        try {
            if (!this.user) await this.getCurrentUser();

            // 기존 정보 확인
            const existingInfo = await this.getPassportInfo();
            let imageUrl = existingInfo?.image_url;

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                // 기존 이미지 삭제
                if (imageUrl) {
                    const filePath = this.storageUtils.extractFilePathFromUrl(
                        imageUrl, 
                        this.storageUtils.BUCKETS.PASSPORTS
                    );
                    if (filePath) {
                        await this.storageUtils.deleteFile(
                            this.storageUtils.BUCKETS.PASSPORTS, 
                            filePath
                        );
                    }
                }
                
                // 새 이미지 업로드 (StorageUtils 사용)
                const uploadResult = await this.storageUtils.uploadPassportImage(
                    imageFile, 
                    this.user.id
                );
                imageUrl = uploadResult.publicUrl;
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

            if (existingInfo) {
                // 수정
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .update(dataToSave)
                    .eq('id', existingInfo.id)
                    .select()
                    .single();

                if (error) throw error;
                return { data, isUpdate: true };
            } else {
                // 생성
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .insert([dataToSave])
                    .select()
                    .single();

                if (error) throw error;
                return { data, isUpdate: false };
            }
        } catch (error) {
            console.error('여권정보 저장 실패:', error);
            throw error;
        }
    }

    // 여권 만료일 검증
    validateExpiryDate(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

        if (expiry < today) {
            return { valid: false, message: '여권이 이미 만료되었습니다.' };
        }

        if (expiry < sixMonthsFromNow) {
            const remainingDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
            return { 
                valid: true, 
                warning: `여권 만료일이 6개월 이내입니다. (${remainingDays}일 남음)` 
            };
        }

        return { valid: true };
    }

    // 파일 유효성 검증 (StorageUtils 활용)
    validateFile(file) {
        try {
            return this.storageUtils.validateFile(file, 'image');
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }

    // 이미지 미리보기 생성 (StorageUtils 활용)
    async createImagePreview(file) {
        try {
            return await this.storageUtils.createImagePreview(file);
        } catch (error) {
            console.error('이미지 미리보기 생성 실패:', error);
            throw error;
        }
    }
}

// 전역 인스턴스 생성
window.passportAPI = new PassportAPI();

console.log('✅ PassportAPI v7.0.0 로드 완료 - Storage 유틸리티 통합');
