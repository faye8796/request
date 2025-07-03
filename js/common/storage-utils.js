/**
 * Storage 유틸리티 모듈 v8.1.2
 * 파일 업로드 및 Storage 관리를 위한 공통 유틸리티
 * 항공권 신청 시스템 - Storage API 오류 수정 버전
 * 
 * v8.1.2 핵심 수정사항:
 * - 불필요한 버킷 확인 제거 (Storage API 인증 오류 방지)
 * - 지연 초기화 제거 (필요 시에만 API 호출)
 * - 실제 사용 시점에서만 Storage API 호출
 * - console.log 출력 최소화
 */

window.StorageUtils = (function() {
    'use strict';

    console.log('📦 StorageUtils 모듈 로드 시작 v8.1.2 (Storage API 오류 수정)');

    // 실제 DB에 존재하는 버킷명
    const BUCKETS = {
        FLIGHT_IMAGES: 'flight-images',      // 학생 참고용 이미지 (사용자별 디렉토리)
        RECEIPTS: 'receipt-files',           // 영수증 파일
        PASSPORTS: 'passports',              // 여권 사본
        FLIGHT_TICKETS: 'flight-tickets'     // 최종 항공권 통합 관리
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

    // v8.1.0 최적화된 파일명 생성 규칙
    const FILE_NAMING = {
        // flight-images: 사용자 ID별 디렉토리 구조
        flightImage: (userId, imageIndex) => 
            `flight_${imageIndex.toString().padStart(3, '0')}`,
        
        // passports: 기존 방식 유지
        passport: (userId, timestamp, originalName) => 
            `passport_${userId}_${timestamp}.${getFileExtension(originalName)}`,
        
        // flight-tickets: 통합된 최종 항공권 파일명
        flightTicket: (userId) => 
            `${userId}_tickets`,
        
        // receipts: 기존 방식 유지
        receipt: (userId, requestId, timestamp, originalName) => 
            `receipt_${userId}_${requestId}_${timestamp}.${getFileExtension(originalName)}`
    };

    // Supabase 인스턴스 관리
    let supabaseInstance = null;

    /**
     * Supabase 인스턴스 가져오기 (안전한 방식)
     */
    function getSupabaseInstance() {
        // 1. 직접 설정된 인스턴스 확인
        if (supabaseInstance) {
            return supabaseInstance;
        }

        // 2. window.SupabaseAPI 확인
        if (window.SupabaseAPI && window.SupabaseAPI.supabase) {
            supabaseInstance = window.SupabaseAPI.supabase;
            return supabaseInstance;
        }

        // 3. window.supabase 확인 (레거시)
        if (window.supabase) {
            supabaseInstance = window.supabase;
            return supabaseInstance;
        }

        return null;
    }

    /**
     * Supabase 인스턴스 수동 설정
     */
    function setSupabaseInstance(instance) {
        if (instance && typeof instance === 'object') {
            supabaseInstance = instance;
            console.log('✅ StorageUtils Supabase 인스턴스 설정 완료');
            return true;
        }
        console.error('❌ 유효하지 않은 Supabase 인스턴스');
        return false;
    }

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
     * 파일 업로드 (범용) - 실제 사용 시에만 호출
     */
    async function uploadFile(file, bucketName, filePath, options = {}) {
        try {
            const supabase = getSupabaseInstance();
            if (!supabase) {
                throw new Error('Supabase 클라이언트를 사용할 수 없습니다');
            }

            if (!supabase.storage) {
                throw new Error('Supabase Storage를 사용할 수 없습니다');
            }
            
            const uploadOptions = {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type,
                ...options
            };

            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, uploadOptions);

            if (error) {
                console.error(`Storage 업로드 오류 (${bucketName}/${filePath}):`, error);
                throw error;
            }

            // 모든 버킷이 public이므로 일반 public URL 사용
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);
            
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
     * 항공권 이미지 업로드 (사용자별 디렉토리)
     */
    async function uploadFlightImage(file, userId, imageIndex = 1) {
        try {
            validateFile(file, 'image');
            
            const fileName = FILE_NAMING.flightImage(userId, imageIndex);
            const filePath = `${userId}/${fileName}`; // 사용자 ID별 디렉토리
            
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
            const filePath = fileName; // 루트 레벨
            
            return await uploadFile(file, BUCKETS.PASSPORTS, filePath);
        } catch (error) {
            console.error('❌ 여권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 최종 항공권 업로드 (통합 버킷)
     */
    async function uploadFlightTicket(file, userId) {
        try {
            validateFile(file, 'document');
            
            const fileName = FILE_NAMING.flightTicket(userId);
            const filePath = fileName;
            
            return await uploadFile(file, BUCKETS.FLIGHT_TICKETS, filePath);
        } catch (error) {
            console.error('❌ 최종 항공권 업로드 실패:', error);
            throw error;
        }
    }

    /**
     * 영수증 업로드 (직접구매 시 사용)
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
            const supabase = getSupabaseInstance();
            if (!supabase) {
                console.warn('⚠️ Supabase 클라이언트가 없어 파일 삭제를 건너뜁니다');
                return false;
            }

            if (!supabase.storage) {
                console.warn('⚠️ Supabase Storage가 없어 파일 삭제를 건너뜁니다');
                return false;
            }
            
            const { error } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

            if (error) {
                console.warn('파일 삭제 실패 (계속 진행):', error);
                return false;
            }

            return true;

        } catch (error) {
            console.warn('❌ 파일 삭제 오류 (계속 진행):', error);
            return false;
        }
    }

    /**
     * 사용자별 항공권 이미지 목록 조회
     */
    async function listUserFlightImages(userId) {
        try {
            const supabase = getSupabaseInstance();
            if (!supabase || !supabase.storage) {
                return [];
            }

            const { data, error } = await supabase.storage
                .from(BUCKETS.FLIGHT_IMAGES)
                .list(userId);

            if (error) {
                console.warn('항공권 이미지 목록 조회 실패:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.warn('❌ 사용자 항공권 이미지 목록 조회 실패:', error);
            return [];
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

    /**
     * v8.1.2: 기본 상태 확인 (Storage API 호출 없음)
     */
    function checkStorageAvailability() {
        const supabase = getSupabaseInstance();
        
        if (!supabase) {
            console.warn('⚠️ Supabase 클라이언트 없음');
            return false;
        }

        if (!supabase.storage) {
            console.warn('⚠️ Supabase Storage 없음');
            return false;
        }

        return true;
    }

    // Public API
    const api = {
        // 상수
        BUCKETS,
        FILE_CONFIG,
        
        // 인스턴스 관리
        setSupabaseInstance,
        getSupabaseInstance,
        checkStorageAvailability,
        
        // 유틸리티
        validateFile,
        formatFileSize,
        createImagePreview,
        extractFilePathFromUrl,
        
        // 업로드 함수
        uploadFile,
        uploadFlightImage,
        uploadPassportImage,
        uploadFlightTicket,
        uploadReceipt,
        
        // 파일 관리
        deleteFile,
        listUserFlightImages,
        
        // 레거시 호환성 (기존 코드 호환)
        checkAllBuckets: checkStorageAvailability,
        delayedInitialize: checkStorageAvailability,
        initializeAllBuckets: checkStorageAvailability
    };

    return api;

})();

// 외부에서 Supabase 인스턴스 설정 가능하도록 전역 함수 제공
window.initStorageUtils = function(supabaseInstance) {
    if (window.StorageUtils && window.StorageUtils.setSupabaseInstance) {
        return window.StorageUtils.setSupabaseInstance(supabaseInstance);
    }
    return false;
};

console.log('✅ StorageUtils 모듈 v8.1.2 로드 완료 (Storage API 오류 수정)');
