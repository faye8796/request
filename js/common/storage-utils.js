/**
 * Storage 유틸리티 모듈 v1.0.0
 * 파일 업로드 및 Storage 관리를 위한 공통 유틸리티
 * 항공권 신청 시스템 7단계 - Storage 설정 및 파일 업로드
 */

window.StorageUtils = (function() {
    'use strict';

    console.log('📦 StorageUtils 모듈 로드 시작 v1.0.0');

    // Storage 버킷 설정
    const BUCKETS = {
        FLIGHT_IMAGES: 'flight-images',      // 항공권 이미지
        RECEIPTS: 'receipts',                // 영수증 (기존 활용)
        PASSPORTS: 'passports',              // 여권 사본
        ADMIN_TICKETS: 'admin-tickets'       // 관리자 등록 항공권
    };

    // 파일 타입별 설정
    const FILE_CONFIG = {
        image: {
            maxSize: 5 * 1024 * 1024,  // 5MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
            allowedExtensions: ['.jpg', '.jpeg', '.png']
        },
        document: {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
        }
    };

    // 파일명 생성 규칙
    const FILE_NAMING = {
        flightImage: (userId, timestamp, originalName) => 
            `flight_${userId}_${timestamp}.${getFileExtension(originalName)}`,
        passport: (userId, timestamp, originalName) => 
            `passport_${userId}_${timestamp}.${getFileExtension(originalName)}`,
        adminTicket: (requestId, timestamp, originalName) => 
            `ticket_${requestId}_${timestamp}.${getFileExtension(originalName)}`,
        receipt: (userId, requestId, timestamp, originalName) => 
            `receipt_${userId}_${requestId}_${timestamp}.${getFileExtension(originalName)}`
    };

    // Supabase 인스턴스
    const supabase = window.supabase;

    /**
     * 파일 확장자 추출
     */
    function getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * 파일 유효성 검증
     */
    function validateFile(file, fileType = 'image') {
        const config = FILE_CONFIG[fileType];
        
        if (!config) {
            throw new Error('유효하지 않은 파일 타입입니다.');
        }

        // 파일 크기 검증
        if (file.size > config.maxSize) {
            const maxSizeMB = config.maxSize / (1024 * 1024);
            throw new Error(`파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`);
        }

        // 파일 타입 검증
        if (!config.allowedTypes.includes(file.type)) {
            const extensions = config.allowedExtensions.join(', ');
            throw new Error(`${extensions} 형식의 파일만 업로드 가능합니다.`);
        }

        return true;
    }

    /**
     * Storage 버킷 존재 확인 및 생성
     */
    async function ensureBucket(bucketName) {
        try {
            console.log(`🗄️ ${bucketName} 버킷 확인 중...`);
            
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();
            
            if (listError) {
                console.error('버킷 목록 조회 실패:', listError);
                return false;
            }

            const bucketExists = buckets.some(bucket => bucket.name === bucketName);
            
            if (!bucketExists) {
                console.log(`📦 ${bucketName} 버킷 생성 중...`);
                
                const { data, error } = await supabase.storage.createBucket(bucketName, {
                    public: true,
                    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
                });

                if (error) {
                    console.error(`❌ ${bucketName} 버킷 생성 실패:`, error);
                    return false;
                } else {
                    console.log(`✅ ${bucketName} 버킷 생성 성공`);
                    return true;
                }
            }
            
            console.log(`✅ ${bucketName} 버킷이 이미 존재합니다`);
            return true;

        } catch (error) {
            console.error(`❌ ${bucketName} 버킷 확인 실패:`, error);
            return false;
        }
    }

    /**
     * 모든 필수 버킷 초기화
     */
    async function initializeAllBuckets() {
        console.log('🚀 Storage 버킷 초기화 시작...');
        
        const results = await Promise.all(
            Object.values(BUCKETS).map(bucketName => ensureBucket(bucketName))
        );
        
        const allSuccess = results.every(result => result === true);
        
        if (allSuccess) {
            console.log('✅ 모든 Storage 버킷 초기화 완료');
        } else {
            console.warn('⚠️ 일부 Storage 버킷 초기화 실패');
        }
        
        return allSuccess;
    }

    /**
     * 파일 업로드 (범용)
     */
    async function uploadFile(file, bucketName, filePath, options = {}) {
        try {
            console.log(`📤 파일 업로드 시작: ${file.name} → ${bucketName}/${filePath}`);
            
            const uploadOptions = {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type,
                ...options
            };

            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, uploadOptions);

            if (error) throw error;

            // 공개 URL 생성
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            console.log(`✅ 파일 업로드 성공: ${publicUrl}`);
            
            return {
                success: true,
                path: filePath,
                publicUrl: publicUrl
            };

        } catch (error) {
            console.error('❌ 파일 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 항공권 이미지 업로드
     */
    async function uploadFlightImage(file, userId) {
        try {
            validateFile(file, 'image');
            
            const timestamp = Date.now();
            const fileName = FILE_NAMING.flightImage(userId, timestamp, file.name);
            const filePath = `${userId}/${fileName}`;
            
            return await uploadFile(file, BUCKETS.FLIGHT_IMAGES, filePath);
        } catch (error) {
            console.error('❌ 항공권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 여권 이미지 업로드
     */
    async function uploadPassportImage(file, userId) {
        try {
            validateFile(file, 'image');
            
            const timestamp = Date.now();
            const fileName = FILE_NAMING.passport(userId, timestamp, file.name);
            const filePath = `${userId}/${fileName}`;
            
            return await uploadFile(file, BUCKETS.PASSPORTS, filePath);
        } catch (error) {
            console.error('❌ 여권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 관리자 항공권 업로드
     */
    async function uploadAdminTicket(file, requestId) {
        try {
            validateFile(file, 'document');
            
            const timestamp = Date.now();
            const fileName = FILE_NAMING.adminTicket(requestId, timestamp, file.name);
            const filePath = `${requestId}/${fileName}`;
            
            return await uploadFile(file, BUCKETS.ADMIN_TICKETS, filePath);
        } catch (error) {
            console.error('❌ 관리자 항공권 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 영수증 업로드
     */
    async function uploadReceipt(file, userId, requestId) {
        try {
            validateFile(file, 'document');
            
            const timestamp = Date.now();
            const fileName = FILE_NAMING.receipt(userId, requestId, timestamp, file.name);
            const filePath = `${userId}/${fileName}`;
            
            return await uploadFile(file, BUCKETS.RECEIPTS, filePath);
        } catch (error) {
            console.error('❌ 영수증 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 파일 삭제
     */
    async function deleteFile(bucketName, filePath) {
        try {
            console.log(`🗑️ 파일 삭제 시작: ${bucketName}/${filePath}`);
            
            const { error } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

            if (error) {
                console.warn('파일 삭제 실패:', error);
                return false;
            }

            console.log('✅ 파일 삭제 성공');
            return true;

        } catch (error) {
            console.error('❌ 파일 삭제 오류:', error);
            return false;
        }
    }

    /**
     * URL에서 파일 경로 추출
     */
    function extractFilePathFromUrl(url, bucketName) {
        try {
            const urlParts = url.split('/');
            const bucketIndex = urlParts.indexOf(bucketName);
            
            if (bucketIndex === -1) return null;
            
            return urlParts.slice(bucketIndex + 1).join('/');
        } catch (error) {
            console.error('URL 파싱 오류:', error);
            return null;
        }
    }

    /**
     * 파일 크기 포맷팅
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 이미지 미리보기 URL 생성
     */
    function createImagePreview(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('이미지 파일이 아닙니다.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 초기화
    console.log('🚀 Storage 버킷 초기화 중...');
    initializeAllBuckets().catch(console.error);

    // Public API
    return {
        // 상수
        BUCKETS,
        FILE_CONFIG,
        
        // 유틸리티
        validateFile,
        formatFileSize,
        createImagePreview,
        extractFilePathFromUrl,
        
        // 업로드 함수
        uploadFile,
        uploadFlightImage,
        uploadPassportImage,
        uploadAdminTicket,
        uploadReceipt,
        
        // 파일 관리
        deleteFile,
        
        // 초기화
        initializeAllBuckets
    };

})();

console.log('✅ StorageUtils 모듈 로드 완료');
