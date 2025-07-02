// passport-info-api.js - 여권정보 API 통신 모듈

class PassportAPI {
    constructor() {
        this.supabase = window.supabase;
        this.user = null;
        this.bucketName = 'passports';
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

    // 여권 이미지 업로드
    async uploadPassportImage(file) {
        try {
            if (!this.user) await this.getCurrentUser();

            // 파일 크기 체크 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
            }

            // 파일 확장자 체크
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('JPG, PNG 형식의 이미지만 업로드 가능합니다.');
            }

            const timestamp = Date.now();
            const fileName = `${this.user.id}_${timestamp}_${file.name}`;
            const filePath = `${this.user.id}/${fileName}`;

            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (error) throw error;

            // 공개 URL 생성
            const { data: { publicUrl } } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 기존 이미지 삭제
    async deleteOldImage(imageUrl) {
        try {
            if (!imageUrl) return;

            // URL에서 파일 경로 추출
            const urlParts = imageUrl.split('/');
            const bucketIndex = urlParts.indexOf(this.bucketName);
            if (bucketIndex === -1) return;

            const filePath = urlParts.slice(bucketIndex + 1).join('/');

            const { error } = await this.supabase.storage
                .from(this.bucketName)
                .remove([filePath]);

            if (error) {
                console.warn('기존 이미지 삭제 실패:', error);
            }
        } catch (error) {
            console.warn('이미지 삭제 중 오류:', error);
        }
    }

    // 여권정보 저장 (생성 또는 수정)
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
                    await this.deleteOldImage(imageUrl);
                }
                // 새 이미지 업로드
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
}

// 전역 인스턴스 생성
window.passportAPI = new PassportAPI();