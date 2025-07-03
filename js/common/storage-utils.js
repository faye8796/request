/**
 * Storage 유틸리티 모듈 v8.1.1
 * 파일 업로드 및 Storage 관리를 위한 공통 유틸리티
 * 항공권 신청 시스템 - v8.1.1 실제 버킷명 수정
 * 
 * v8.1.1 핵심 수정사항:
 * - 실제 DB 버킷명과 일치하도록 수정
 * - 불필요한 버킷 생성 시도 제거
 * - 기존 버킷 활용으로 안정성 향상
 */

window.StorageUtils = (function() {
    'use strict';

    console.log('📦 StorageUtils 모듈 로드 시작 v8.1.1 (실제 버킷명 수정)');

    // 🔧 v8.1.1 실제 DB에 존재하는 버킷명으로 수정
    const BUCKETS = {
        FLIGHT_IMAGES: 'flight-images',      // ✅ 존재함 (public)
        RECEIPTS: 'receipt-files',           // 🔧 수정: 'receipts' → 'receipt-files'
        PASSPORTS: 'passports',              // ✅ 존재함 (public)
        FLIGHT_TICKETS: 'flight-tickets'     // ✅ 존재함 (public - 이미 생성됨)
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

    // 🆕 v8.1.0 최적화된 파일명 생성 규칙
    const FILE_NAMING = {
        // flight-images: 사용자 ID별 디렉토리 구조
        flightImage: (userId, imageIndex) => 
            `flight_${imageIndex.toString().padStart(3, '0')}`,
        
        // passports: 기존 방식 유지
        passport: (userId, timestamp, originalName) => 
            `passport_${userId}_${timestamp}.${getFileExtension(originalName)}`,
        
        // 🆕 flight-tickets: 통합된 최종 항공권 파일명
        flightTicket: (userId) => 
            `${userId}_tickets`,
        
        // receipts: 기존 방식 유지 (버킷명만 수정)
        receipt: (userId, requestId, timestamp, originalName) => 
            `receipt_${userId}_${requestId}_${timestamp}.${getFileExtension(originalName)}`
    };

    // Supabase 인스턴스 관리
    let supabaseInstance = null;
    let initializationAttempted = false;

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
            console.log('✅ SupabaseAPI에서 인스턴스 획득');
            return supabaseInstance;
        }

        // 3. window.supabase 확인 (레거시)
        if (window.supabase) {
            supabaseInstance = window.supabase;
            console.log('✅ window.supabase에서 인스턴스 획득');
            return supabaseInstance;
        }

        console.warn('⚠️ Supabase 인스턴스를 찾을 수 없습니다');
        return null;
    }

    /**
     * Supabase 인스턴스 수동 설정
     */
    function setSupabaseInstance(instance) {
        if (instance && typeof instance === 'object') {
            supabaseInstance = instance;
            console.log('✅ Supabase 인스턴스 수동 설정 완료');
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
     * 🔧 v8.1.1 수정: 버킷 존재 확인만 (생성하지 않음)
     * 모든 필요한 버킷들이 이미 존재하므로 확인만 수행
     */
    async function checkBucket(bucketName) {
        try {
            console.log(`🗄️ ${bucketName} 버킷 존재 확인 중...`);
            
            const supabase = getSupabaseInstance();
            if (!supabase) {
                console.error('❌ Supabase 인스턴스가 없습니다');
                return false;
            }

            if (!supabase.storage) {
                console.error('❌ Supabase storage가 없습니다');
                return false;
            }
            
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();
            
            if (listError) {
                console.error('버킷 목록 조회 실패:', listError);
                return false;
            }

            const bucketExists = buckets.some(bucket => bucket.name === bucketName);
            
            if (bucketExists) {
                console.log(`✅ ${bucketName} 버킷 존재 확인됨`);
                return true;
            } else {
                console.warn(`⚠️ ${bucketName} 버킷이 존재하지 않습니다`);
                return false;
            }

        } catch (error) {
            console.error(`❌ ${bucketName} 버킷 확인 실패:`, error);
            return false;
        }
    }

    /**
     * 🔧 v8.1.1 수정: 모든 필수 버킷 존재 확인만
     * 버킷 생성 시도 제거 - 이미 모든 버킷이 존재함
     */
    async function checkAllBuckets() {
        console.log('🚀 Storage 버킷 존재 확인 시작... (v8.1.1)');
        
        if (initializationAttempted) {
            console.log('⚠️ 이미 확인이 시도되었습니다');
            return false;
        }
        
        initializationAttempted = true;

        // Supabase 인스턴스 확인
        const supabase = getSupabaseInstance();
        if (!supabase) {
            console.error('❌ Supabase 인스턴스를 찾을 수 없어 버킷 확인을 건너뜁니다');
            return false;
        }
        
        const results = await Promise.all(
            Object.values(BUCKETS).map(bucketName => checkBucket(bucketName))
        );
        
        const allExist = results.every(result => result === true);
        
        if (allExist) {
            console.log('✅ v8.1.1 모든 필수 Storage 버킷 존재 확인 완료');
        } else {
            console.warn('⚠️ 일부 Storage 버킷이 존재하지 않습니다');
        }
        
        return allExist;
    }

    /**
     * 파일 업로드 (범용)
     */
    async function uploadFile(file, bucketName, filePath, options = {}) {
        try {
            console.log(`📤 파일 업로드 시작: ${file.name} → ${bucketName}/${filePath}`);
            
            const supabase = getSupabaseInstance();
            if (!supabase) {
                throw new Error('Supabase 인스턴스가 없습니다');
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

            if (error) throw error;

            // 🔧 v8.1.1: 모든 버킷이 public이므로 일반 public URL 사용
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
     * 🆕 v8.1.0 항공권 이미지 업로드 (사용자별 디렉토리)
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
     * 🆕 v8.1.0 최종 항공권 업로드 (통합 버킷)
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
            console.log(`🗑️ 파일 삭제 시작: ${bucketName}/${filePath}`);
            
            const supabase = getSupabaseInstance();
            if (!supabase) {
                throw new Error('Supabase 인스턴스가 없습니다');
            }
            
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
     * 🆕 v8.1.0 사용자별 항공권 이미지 목록 조회
     */
    async function listUserFlightImages(userId) {
        try {
            const supabase = getSupabaseInstance();
            if (!supabase) {
                throw new Error('Supabase 인스턴스가 없습니다');
            }

            const { data, error } = await supabase.storage
                .from(BUCKETS.FLIGHT_IMAGES)
                .list(userId);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('❌ 사용자 항공권 이미지 목록 조회 실패:', error);
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

    // 🔧 v8.1.1 수정: 초기화 함수 (지연 실행)
    async function delayedInitialize() {
        console.log('🚀 Storage 버킷 지연 확인 중... (v8.1.1)');
        
        // Supabase 인스턴스 로딩 대기 (최대 10초)
        let waitCount = 0;
        while (!getSupabaseInstance() && waitCount < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        
        if (getSupabaseInstance()) {
            console.log('✅ Supabase 인스턴스 확인됨 - v8.1.1 버킷 확인 시작');
            return await checkAllBuckets();
        } else {
            console.warn('⚠️ Supabase 인스턴스 로딩 타임아웃 - 버킷 확인 건너뜀');
            return false;
        }
    }

    // Public API
    const api = {
        // 상수
        BUCKETS,
        FILE_CONFIG,
        
        // 인스턴스 관리
        setSupabaseInstance,
        getSupabaseInstance,
        
        // 유틸리티
        validateFile,
        formatFileSize,
        createImagePreview,
        extractFilePathFromUrl,
        
        // 업로드 함수
        uploadFile,
        uploadFlightImage,
        uploadPassportImage,
        uploadFlightTicket,  // 🆕 v8.1.0 통합 항공권
        uploadReceipt,
        
        // 🆕 v8.1.0 새로운 기능
        listUserFlightImages,
        
        // 파일 관리
        deleteFile,
        
        // 🔧 v8.1.1 수정: 확인만 수행
        checkAllBuckets,
        delayedInitialize,
        
        // 레거시 호환성 (기존 코드와 호환을 위해 유지)
        initializeAllBuckets: checkAllBuckets
    };

    // 🔧 v8.1.1 수정: 지연 확인 실행 (5초 후)
    setTimeout(async () => {
        if (!initializationAttempted) {
            try {
                await delayedInitialize();
            } catch (error) {
                console.error('❌ v8.1.1 지연 확인 실패:', error);
            }
        }
    }, 5000);

    return api;

})();

// 외부에서 Supabase 인스턴스 설정 가능하도록 전역 함수 제공
window.initStorageUtils = function(supabaseInstance) {
    if (window.StorageUtils && window.StorageUtils.setSupabaseInstance) {
        return window.StorageUtils.setSupabaseInstance(supabaseInstance);
    }
    return false;
};

console.log('✅ StorageUtils 모듈 v8.1.1 로드 완료 (실제 버킷명 수정)');
