/**
 * 🛠️ Institute Utils Module (v4.4.0)
 * 세종학당 파견학당 정보 관리 시스템 - 유틸리티 모듈
 * 
 * 📋 담당 기능:
 * - 학당 데이터 변환 및 포맷팅
 * - 헬퍼 함수들
 * - 학당 관련 계산 및 처리
 * - 파일 처리 및 내보내기
 * - 기타 공통 기능들
 * 
 * 🔗 의존성: 없음 (완전 독립적)
 * 🚫 독립성: 순수 유틸리티 모듈
 */

class InstituteUtils {
    constructor() {
        this.initialized = false;
        
        // 📋 15개 필드 메타데이터
        this.FIELD_METADATA = {
            name_ko: { group: 'basic', label: '학당명', icon: 'building2', exportable: true },
            name_en: { group: 'basic', label: '영문명', icon: 'type', exportable: true },
            operating_organization: { group: 'basic', label: '운영기관', icon: 'building', exportable: true },
            image_url: { group: 'basic', label: '학당사진', icon: 'image', exportable: false },
            address: { group: 'contact', label: '주소', icon: 'map-pin', exportable: true },
            phone: { group: 'contact', label: '대표연락처', icon: 'phone', exportable: true },
            website_sns: { group: 'contact', label: '홈페이지/SNS', icon: 'globe', exportable: true },
            manager_name: { group: 'contact', label: '담당자성명', icon: 'user', exportable: true },
            manager_contact: { group: 'contact', label: '담당자연락처', icon: 'mail', exportable: true },
            local_adaptation_staff: { group: 'program', label: '현지적응전담인력', icon: 'users', exportable: true },
            cultural_program_plan: { group: 'program', label: '문화수업운영계획', icon: 'calendar', exportable: true },
            desired_courses: { group: 'program', label: '희망개설강좌', icon: 'book', exportable: true },
            local_language_requirement: { group: 'support', label: '현지어구사필요수준', icon: 'message-circle', exportable: true },
            institute_support: { group: 'support', label: '학당지원사항', icon: 'heart-handshake', exportable: true },
            country_safety_info: { group: 'support', label: '파견국가안전정보', icon: 'shield', exportable: true }
        };
        
        // 🌍 국가/지역 정보
        this.COUNTRY_INFO = {
            'KR': { name: '대한민국', code: 'KR', timezone: 'Asia/Seoul' },
            'CN': { name: '중국', code: 'CN', timezone: 'Asia/Shanghai' },
            'JP': { name: '일본', code: 'JP', timezone: 'Asia/Tokyo' },
            'US': { name: '미국', code: 'US', timezone: 'America/New_York' },
            'GB': { name: '영국', code: 'GB', timezone: 'Europe/London' },
            'DE': { name: '독일', code: 'DE', timezone: 'Europe/Berlin' },
            'FR': { name: '프랑스', code: 'FR', timezone: 'Europe/Paris' },
            'AU': { name: '호주', code: 'AU', timezone: 'Australia/Sydney' },
            'CA': { name: '캐나다', code: 'CA', timezone: 'America/Toronto' },
            'IN': { name: '인도', code: 'IN', timezone: 'Asia/Kolkata' }
        };
        
        // 📊 필드 그룹 정의
        this.FIELD_GROUPS = {
            basic: { name: '기본 정보', icon: 'info', priority: 1 },
            contact: { name: '연락처 정보', icon: 'phone', priority: 2 },
            program: { name: '프로그램 정보', icon: 'graduation-cap', priority: 3 },
            support: { name: '지원 정보', icon: 'help-circle', priority: 4 }
        };
        
        // 🎨 상태 색상 매핑
        this.STATUS_COLORS = {
            active: '#22c55e',      // 활성
            inactive: '#ef4444',    // 비활성
            pending: '#f59e0b',     // 대기
            maintenance: '#6b7280'  // 점검
        };
        
        console.log('🛠️ InstituteUtils 모듈 초기화됨');
    }

    /**
     * 🚀 유틸리티 모듈 초기화
     * @returns {boolean}
     */
    initialize() {
        if (this.initialized) return true;
        
        try {
            console.log('🔄 InstituteUtils 초기화 시작...');
            
            // 유틸리티 함수 무결성 체크
            this.validateUtilities();
            
            this.initialized = true;
            console.log('✅ InstituteUtils 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ InstituteUtils 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 🔍 유틸리티 무결성 체크
     */
    validateUtilities() {
        const expectedFieldCount = 15;
        const actualFieldCount = Object.keys(this.FIELD_METADATA).length;
        
        if (actualFieldCount !== expectedFieldCount) {
            console.warn(`⚠️ 필드 메타데이터 불일치: 예상 ${expectedFieldCount}개, 실제 ${actualFieldCount}개`);
        }
        
        console.log(`✅ ${actualFieldCount}개 필드 메타데이터 확인 완료`);
    }

    /**
     * 🎨 데이터 포맷팅
     */

    /**
     * 📱 전화번호 포맷팅
     * @param {string} phone - 원본 전화번호
     * @param {string} format - 포맷 타입 ('display', 'international', 'national')
     * @returns {string}
     */
    formatPhone(phone, format = 'display') {
        if (!phone || typeof phone !== 'string') return '';
        
        // 숫자만 추출
        const digits = phone.replace(/[^\d]/g, '');
        
        switch (format) {
            case 'international':
                if (digits.startsWith('82')) {
                    return `+82-${digits.slice(2, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
                }
                return `+${digits}`;
                
            case 'national':
                if (digits.startsWith('82')) {
                    return `0${digits.slice(2, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
                }
                return digits;
                
            case 'display':
            default:
                if (digits.length === 11 && digits.startsWith('010')) {
                    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
                } else if (digits.length === 10) {
                    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                }
                return phone;
        }
    }

    /**
     * 🌐 URL 포맷팅 및 검증
     * @param {string} url - 원본 URL
     * @param {string} type - URL 타입 ('website', 'social')
     * @returns {Object}
     */
    formatURL(url, type = 'website') {
        if (!url || typeof url !== 'string') {
            return { formatted: '', isValid: false, type: 'unknown' };
        }
        
        let formatted = url.trim();
        
        // 프로토콜 추가
        if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
            formatted = 'https://' + formatted;
        }
        
        try {
            const urlObj = new URL(formatted);
            const hostname = urlObj.hostname.toLowerCase();
            
            // 소셜미디어 플랫폼 감지
            const socialPlatforms = {
                'facebook.com': 'Facebook',
                'twitter.com': 'Twitter',
                'instagram.com': 'Instagram',
                'youtube.com': 'YouTube',
                'linkedin.com': 'LinkedIn',
                'weibo.com': 'Weibo',
                'wechat.com': 'WeChat'
            };
            
            const platform = Object.keys(socialPlatforms).find(domain => 
                hostname.includes(domain)) || 'website';
            
            return {
                formatted: formatted,
                isValid: true,
                type: socialPlatforms[platform] || 'website',
                hostname: hostname,
                display: urlObj.hostname
            };
            
        } catch (error) {
            return { formatted: url, isValid: false, type: 'invalid' };
        }
    }

    /**
     * 📅 날짜 포맷팅
     * @param {string|Date} date - 날짜
     * @param {string} format - 포맷 ('short', 'long', 'relative')
     * @param {string} locale - 로케일
     * @returns {string}
     */
    formatDate(date, format = 'short', locale = 'ko-KR') {
        if (!date) return '';
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        switch (format) {
            case 'short':
                return dateObj.toLocaleDateString(locale);
                
            case 'long':
                return dateObj.toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                });
                
            case 'relative':
                return this.getRelativeTime(dateObj, locale);
                
            case 'iso':
                return dateObj.toISOString();
                
            default:
                return dateObj.toLocaleDateString(locale);
        }
    }

    /**
     * ⏰ 상대 시간 계산
     * @param {Date} date - 기준 날짜
     * @param {string} locale - 로케일
     * @returns {string}
     */
    getRelativeTime(date, locale = 'ko-KR') {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMinutes < 1) return '방금 전';
        if (diffMinutes < 60) return `${diffMinutes}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
        return `${Math.floor(diffDays / 365)}년 전`;
    }

    /**
     * 🏷️ 텍스트 처리
     */

    /**
     * ✂️ 텍스트 자르기
     * @param {string} text - 원본 텍스트
     * @param {number} maxLength - 최대 길이
     * @param {string} suffix - 접미사
     * @returns {string}
     */
    truncateText(text, maxLength = 100, suffix = '...') {
        if (!text || typeof text !== 'string') return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + suffix;
    }

    /**
     * 🔤 텍스트 케이스 변환
     * @param {string} text - 원본 텍스트
     * @param {string} type - 변환 타입
     * @returns {string}
     */
    transformCase(text, type) {
        if (!text || typeof text !== 'string') return '';
        
        switch (type) {
            case 'title':
                return text.replace(/\w\S*/g, (txt) =>
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            case 'sentence':
                return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            case 'upper':
                return text.toUpperCase();
            case 'lower':
                return text.toLowerCase();
            default:
                return text;
        }
    }

    /**
     * 🔍 키워드 하이라이트
     * @param {string} text - 원본 텍스트
     * @param {string} keyword - 하이라이트할 키워드
     * @param {string} className - CSS 클래스명
     * @returns {string}
     */
    highlightKeyword(text, keyword, className = 'highlight') {
        if (!text || !keyword) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(keyword)})`, 'gi');
        return text.replace(regex, `<span class="${className}">$1</span>`);
    }

    /**
     * 🛡️ 정규식 이스케이프
     * @param {string} string - 이스케이프할 문자열
     * @returns {string}
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 📊 데이터 변환
     */

    /**
     * 🔄 학당 데이터 정규화
     * @param {Object} rawData - 원본 데이터
     * @returns {Object}
     */
    normalizeInstituteData(rawData) {
        if (!rawData || typeof rawData !== 'object') return {};
        
        const normalized = {};
        
        for (const [key, value] of Object.entries(rawData)) {
            if (this.FIELD_METADATA[key]) {
                normalized[key] = this.normalizeFieldValue(key, value);
            }
        }
        
        return normalized;
    }

    /**
     * 🎯 필드값 정규화
     * @param {string} fieldName - 필드명
     * @param {*} value - 원본 값
     * @returns {*}
     */
    normalizeFieldValue(fieldName, value) {
        if (value === null || value === undefined) return null;
        
        const metadata = this.FIELD_METADATA[fieldName];
        if (!metadata) return value;
        
        switch (fieldName) {
            case 'phone':
            case 'manager_contact':
                return typeof value === 'string' ? value.trim() : value;
                
            case 'website_sns':
            case 'image_url':
                const urlResult = this.formatURL(value);
                return urlResult.isValid ? urlResult.formatted : value;
                
            case 'name_ko':
            case 'name_en':
            case 'operating_organization':
            case 'manager_name':
                return typeof value === 'string' ? this.transformCase(value.trim(), 'title') : value;
                
            default:
                return typeof value === 'string' ? value.trim() : value;
        }
    }

    /**
     * 🏗️ 표시용 데이터 생성
     * @param {Object} instituteData - 학당 데이터
     * @returns {Object}
     */
    createDisplayData(instituteData) {
        if (!instituteData) return {};
        
        const display = { ...instituteData };
        
        // 전화번호 포맷팅
        if (display.phone) {
            display.phone_formatted = this.formatPhone(display.phone);
        }
        
        if (display.manager_contact) {
            display.manager_contact_formatted = this.formatPhone(display.manager_contact);
        }
        
        // URL 포맷팅
        if (display.website_sns) {
            const urlInfo = this.formatURL(display.website_sns);
            display.website_info = urlInfo;
        }
        
        // 날짜 포맷팅
        if (display.created_at) {
            display.created_at_formatted = this.formatDate(display.created_at, 'long');
            display.created_at_relative = this.formatDate(display.created_at, 'relative');
        }
        
        if (display.updated_at) {
            display.updated_at_formatted = this.formatDate(display.updated_at, 'long');
            display.updated_at_relative = this.formatDate(display.updated_at, 'relative');
        }
        
        // 필드 그룹별 분류
        display.grouped_fields = this.groupFieldsByCategory(display);
        
        return display;
    }

    /**
     * 📁 필드 그룹별 분류
     * @param {Object} data - 학당 데이터
     * @returns {Object}
     */
    groupFieldsByCategory(data) {
        const grouped = {};
        
        for (const groupKey of Object.keys(this.FIELD_GROUPS)) {
            grouped[groupKey] = {
                ...this.FIELD_GROUPS[groupKey],
                fields: []
            };
        }
        
        for (const [fieldName, value] of Object.entries(data)) {
            const metadata = this.FIELD_METADATA[fieldName];
            if (metadata && value) {
                grouped[metadata.group].fields.push({
                    name: fieldName,
                    label: metadata.label,
                    icon: metadata.icon,
                    value: value
                });
            }
        }
        
        return grouped;
    }

    /**
     * 📤 데이터 내보내기
     */

    /**
     * 📊 Excel 데이터 생성
     * @param {Array} institutes - 학당 목록
     * @param {Array} includeFields - 포함할 필드 목록
     * @returns {Array}
     */
    createExcelData(institutes, includeFields = null) {
        if (!Array.isArray(institutes)) return [];
        
        const fields = includeFields || Object.keys(this.FIELD_METADATA).filter(
            field => this.FIELD_METADATA[field].exportable
        );
        
        // 헤더 행
        const headers = fields.map(field => this.FIELD_METADATA[field]?.label || field);
        
        // 데이터 행들
        const rows = institutes.map(institute => {
            return fields.map(field => {
                const value = institute[field];
                
                // 특별 처리가 필요한 필드들
                switch (field) {
                    case 'phone':
                    case 'manager_contact':
                        return this.formatPhone(value, 'display');
                    case 'website_sns':
                        const urlInfo = this.formatURL(value);
                        return urlInfo.isValid ? urlInfo.formatted : value || '';
                    case 'created_at':
                    case 'updated_at':
                        return this.formatDate(value, 'short');
                    default:
                        return value || '';
                }
            });
        });
        
        return [headers, ...rows];
    }

    /**
     * 📄 CSV 문자열 생성
     * @param {Array} institutes - 학당 목록
     * @param {Array} includeFields - 포함할 필드 목록
     * @returns {string}
     */
    createCSVString(institutes, includeFields = null) {
        const data = this.createExcelData(institutes, includeFields);
        
        return data.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
               .join(',')
        ).join('\n');
    }

    /**
     * 📋 JSON 데이터 생성 (구조화)
     * @param {Array} institutes - 학당 목록
     * @param {Object} options - 옵션
     * @returns {Object}
     */
    createStructuredJSON(institutes, options = {}) {
        const {
            includeMetadata = true,
            groupByCategory = false,
            includeStats = true
        } = options;
        
        const result = {
            data: institutes.map(institute => this.createDisplayData(institute))
        };
        
        if (includeMetadata) {
            result.metadata = {
                export_date: new Date().toISOString(),
                total_count: institutes.length,
                field_definitions: this.FIELD_METADATA,
                field_groups: this.FIELD_GROUPS
            };
        }
        
        if (includeStats) {
            result.statistics = this.generateInstituteStats(institutes);
        }
        
        if (groupByCategory) {
            result.grouped_data = this.groupInstitutesByCategory(institutes);
        }
        
        return result;
    }

    /**
     * 📊 학당 통계 생성
     * @param {Array} institutes - 학당 목록
     * @returns {Object}
     */
    generateInstituteStats(institutes) {
        if (!Array.isArray(institutes)) return {};
        
        const stats = {
            total_count: institutes.length,
            field_completion: {},
            country_distribution: {},
            organization_distribution: {}
        };
        
        // 필드 완성도
        Object.keys(this.FIELD_METADATA).forEach(field => {
            const completed = institutes.filter(inst => 
                inst[field] && inst[field].toString().trim() !== ''
            ).length;
            stats.field_completion[field] = {
                completed: completed,
                total: institutes.length,
                percentage: institutes.length > 0 ? (completed / institutes.length * 100).toFixed(1) : 0
            };
        });
        
        // 운영기관별 분포
        institutes.forEach(institute => {
            const org = institute.operating_organization || '미지정';
            stats.organization_distribution[org] = (stats.organization_distribution[org] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * 🔧 유틸리티 함수들
     */

    /**
     * 🎨 상태 색상 가져오기
     * @param {string} status - 상태
     * @returns {string}
     */
    getStatusColor(status) {
        return this.STATUS_COLORS[status] || '#6b7280';
    }

    /**
     * 🌍 국가 정보 가져오기
     * @param {string} countryCode - 국가 코드
     * @returns {Object|null}
     */
    getCountryInfo(countryCode) {
        return this.COUNTRY_INFO[countryCode] || null;
    }

    /**
     * 🏷️ 필드 메타데이터 가져오기
     * @param {string} fieldName - 필드명
     * @returns {Object|null}
     */
    getFieldMetadata(fieldName) {
        return this.FIELD_METADATA[fieldName] || null;
    }

    /**
     * 📁 필드 그룹 정보 가져오기
     * @param {string} groupKey - 그룹 키
     * @returns {Object|null}
     */
    getFieldGroup(groupKey) {
        return this.FIELD_GROUPS[groupKey] || null;
    }

    /**
     * 🔢 안전한 숫자 변환
     * @param {*} value - 변환할 값
     * @param {number} defaultValue - 기본값
     * @returns {number}
     */
    safeNumber(value, defaultValue = 0) {
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * 🔤 안전한 문자열 변환
     * @param {*} value - 변환할 값
     * @param {string} defaultValue - 기본값
     * @returns {string}
     */
    safeString(value, defaultValue = '') {
        if (value === null || value === undefined) return defaultValue;
        return String(value);
    }

    /**
     * 🎯 깊은 복사
     * @param {*} obj - 복사할 객체
     * @returns {*}
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }

    /**
     * 🔍 객체 비교
     * @param {Object} obj1 - 첫 번째 객체
     * @param {Object} obj2 - 두 번째 객체
     * @returns {boolean}
     */
    deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== typeof obj2) return false;
        
        if (typeof obj1 === 'object') {
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
            
            if (keys1.length !== keys2.length) return false;
            
            for (const key of keys1) {
                if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
                    return false;
                }
            }
            return true;
        }
        
        return false;
    }

    /**
     * 📊 유틸리티 모듈 상태
     */
    getUtilsStatus() {
        return {
            initialized: this.initialized,
            supported_fields: Object.keys(this.FIELD_METADATA).length,
            field_groups: Object.keys(this.FIELD_GROUPS).length,
            supported_countries: Object.keys(this.COUNTRY_INFO).length,
            module_version: '4.4.0'
        };
    }

    /**
     * 🎯 지원되는 내보내기 형식
     */
    getSupportedExportFormats() {
        return ['excel', 'csv', 'json', 'structured_json'];
    }

    /**
     * 📋 전체 필드 목록
     */
    getAllFields() {
        return Object.keys(this.FIELD_METADATA);
    }

    /**
     * 📤 내보내기 가능한 필드 목록
     */
    getExportableFields() {
        return Object.keys(this.FIELD_METADATA).filter(
            field => this.FIELD_METADATA[field].exportable
        );
    }
}

// 🌐 전역 인스턴스 생성
window.InstituteUtils = new InstituteUtils();

console.log('🛠️ InstituteUtils 모듈 로드 완료 (v4.4.0) - 15개 필드 지원');
