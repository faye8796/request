/**
 * ✅ Institute Validation Module (v4.4.0)
 * 세종학당 파견학당 정보 관리 시스템 - 데이터 검증 모듈
 * 
 * 📋 담당 기능:
 * - 학당 데이터 검증
 * - 폼 유효성 검사
 * - 입력 규칙 관리
 * - 에러 메시지 처리
 * - 15개 필드 완전 검증 지원
 * 
 * 🔗 의존성: Utils만 의존 (독립적 설계)
 * 🚫 독립성: 완전히 독립적인 검증 모듈
 */

class InstituteValidation {
    constructor() {
        this.initialized = false;
        
        // 📋 15개 필드 검증 규칙
        this.VALIDATION_RULES = {
            // 기본 정보 (4개)
            name_ko: {
                required: true,
                type: 'string',
                minLength: 2,
                maxLength: 200,
                pattern: null,
                errorMessages: {
                    required: '학당명(한국어)은 필수 항목입니다.',
                    minLength: '학당명은 최소 2자 이상이어야 합니다.',
                    maxLength: '학당명은 최대 200자까지 입력 가능합니다.',
                }
            },
            name_en: {
                required: false,
                type: 'string',
                maxLength: 200,
                pattern: /^[a-zA-Z0-9\s\-\.,'&()]+$/,
                errorMessages: {
                    maxLength: '영문명은 최대 200자까지 입력 가능합니다.',
                    pattern: '영문명은 영문자, 숫자, 공백, 기본 기호만 사용 가능합니다.',
                }
            },
            operating_organization: {
                required: false,
                type: 'string',
                maxLength: 200,
                errorMessages: {
                    maxLength: '운영기관명은 최대 200자까지 입력 가능합니다.',
                }
            },
            image_url: {
                required: false,
                type: 'url',
                pattern: /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i,
                errorMessages: {
                    pattern: '올바른 이미지 URL 형식이 아닙니다. (jpg, png, webp, gif 지원)',
                }
            },
            
            // 연락처 정보 (5개)
            address: {
                required: false,
                type: 'string',
                maxLength: 500,
                errorMessages: {
                    maxLength: '주소는 최대 500자까지 입력 가능합니다.',
                }
            },
            phone: {
                required: false,
                type: 'phone',
                pattern: /^[0-9+\-\s\(\)\.]{8,20}$/,
                errorMessages: {
                    pattern: '올바른 전화번호 형식이 아닙니다. (8-20자, 숫자, +, -, (), 공백, . 사용 가능)',
                }
            },
            website_sns: {
                required: false,
                type: 'url',
                pattern: /^https?:\/\/.+\..+/,
                errorMessages: {
                    pattern: '올바른 웹사이트 URL 형식이 아닙니다. (http:// 또는 https://로 시작)',
                }
            },
            manager_name: {
                required: false,
                type: 'string',
                maxLength: 100,
                pattern: /^[가-힣a-zA-Z\s\-\.]+$/,
                errorMessages: {
                    maxLength: '담당자명은 최대 100자까지 입력 가능합니다.',
                    pattern: '담당자명은 한글, 영문, 공백, 하이픈, 점만 사용 가능합니다.',
                }
            },
            manager_contact: {
                required: false,
                type: 'contact',
                pattern: /^[0-9+\-\s\(\)\.@a-zA-Z]{8,100}$/,
                errorMessages: {
                    pattern: '올바른 연락처 형식이 아닙니다. (전화번호 또는 이메일 형식)',
                }
            },
            
            // 프로그램 정보 (3개)
            local_adaptation_staff: {
                required: false,
                type: 'textarea',
                maxLength: 1000,
                errorMessages: {
                    maxLength: '현지적응전담인력 정보는 최대 1000자까지 입력 가능합니다.',
                }
            },
            cultural_program_plan: {
                required: false,
                type: 'textarea',
                maxLength: 2000,
                errorMessages: {
                    maxLength: '문화수업운영계획은 최대 2000자까지 입력 가능합니다.',
                }
            },
            desired_courses: {
                required: false,
                type: 'textarea',
                maxLength: 1000,
                errorMessages: {
                    maxLength: '희망개설강좌 정보는 최대 1000자까지 입력 가능합니다.',
                }
            },
            
            // 지원 정보 (3개)
            local_language_requirement: {
                required: false,
                type: 'textarea',
                maxLength: 1000,
                errorMessages: {
                    maxLength: '현지어구사필요수준 정보는 최대 1000자까지 입력 가능합니다.',
                }
            },
            institute_support: {
                required: false,
                type: 'textarea',
                maxLength: 2000,
                errorMessages: {
                    maxLength: '학당지원사항 정보는 최대 2000자까지 입력 가능합니다.',
                }
            },
            country_safety_info: {
                required: false,
                type: 'textarea',
                maxLength: 2000,
                errorMessages: {
                    maxLength: '파견국가안전정보는 최대 2000자까지 입력 가능합니다.',
                }
            }
        };
        
        // 🔧 특수 검증 규칙
        this.CUSTOM_VALIDATORS = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone_kr: /^(0[0-9]{1,2}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4})$/,
            phone_intl: /^(\+[1-9]\d{0,3}[-\s]?)?[0-9\s\-\(\)\.]{7,15}$/,
            url_strict: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
        };
        
        // 📊 검증 통계
        this.validationStats = {
            totalValidations: 0,
            successCount: 0,
            errorCount: 0,
            fieldErrors: new Map()
        };
        
        console.log('✅ InstituteValidation 모듈 초기화됨');
    }

    /**
     * 🚀 검증 모듈 초기화
     * @returns {boolean}
     */
    initialize() {
        if (this.initialized) return true;
        
        try {
            console.log('🔄 InstituteValidation 초기화 시작...');
            
            // 검증 규칙 무결성 체크
            this.validateRules();
            
            this.initialized = true;
            console.log('✅ InstituteValidation 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ InstituteValidation 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 🔍 검증 규칙 무결성 체크
     */
    validateRules() {
        const expectedFields = 15;
        const actualFields = Object.keys(this.VALIDATION_RULES).length;
        
        if (actualFields !== expectedFields) {
            console.warn(`⚠️ 검증 규칙 필드 수 불일치: 예상 ${expectedFields}개, 실제 ${actualFields}개`);
        }
        
        // 각 규칙의 구조 확인
        for (const [field, rule] of Object.entries(this.VALIDATION_RULES)) {
            if (!rule.errorMessages || typeof rule.errorMessages !== 'object') {
                throw new Error(`검증 규칙 오류: ${field}의 errorMessages가 누락되었습니다`);
            }
        }
        
        console.log(`✅ ${actualFields}개 필드의 검증 규칙 확인 완료`);
    }

    /**
     * 🧪 학당 데이터 전체 검증
     * @param {Object} data - 검증할 학당 데이터
     * @param {Object} options - 검증 옵션
     * @returns {Object} 검증 결과
     */
    validateInstituteData(data, options = {}) {
        this.validationStats.totalValidations++;
        
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            fieldErrors: {},
            validatedData: {},
            metadata: {
                validatedAt: new Date().toISOString(),
                validateMode: options.mode || 'full',
                processedFields: 0
            }
        };
        
        try {
            console.log('🧪 학당 데이터 검증 시작:', Object.keys(data || {}).length, '개 필드');
            
            if (!data || typeof data !== 'object') {
                result.isValid = false;
                result.errors.push('검증할 데이터가 올바르지 않습니다.');
                return result;
            }
            
            // 필수 필드 검증
            const requiredFieldResults = this.validateRequiredFields(data);
            this.mergeValidationResults(result, requiredFieldResults);
            
            // 개별 필드 검증
            for (const [fieldName, value] of Object.entries(data)) {
                if (value === undefined || value === null || value === '') {
                    // 빈 값은 required 검증에서만 처리
                    continue;
                }
                
                const fieldResult = this.validateField(fieldName, value, options);
                if (fieldResult.isValid) {
                    result.validatedData[fieldName] = fieldResult.sanitizedValue;
                } else {
                    result.isValid = false;
                    result.fieldErrors[fieldName] = fieldResult.errors;
                    result.errors.push(...fieldResult.errors);
                }
                
                result.metadata.processedFields++;
            }
            
            // 상호 의존성 검증
            const crossValidationResult = this.validateCrossFieldDependencies(data);
            this.mergeValidationResults(result, crossValidationResult);
            
            // 비즈니스 로직 검증
            if (options.businessValidation !== false) {
                const businessResult = this.validateBusinessRules(data);
                this.mergeValidationResults(result, businessResult);
            }
            
            // 통계 업데이트
            if (result.isValid) {
                this.validationStats.successCount++;
            } else {
                this.validationStats.errorCount++;
                for (const fieldName of Object.keys(result.fieldErrors)) {
                    const currentCount = this.validationStats.fieldErrors.get(fieldName) || 0;
                    this.validationStats.fieldErrors.set(fieldName, currentCount + 1);
                }
            }
            
            console.log(`${result.isValid ? '✅' : '❌'} 학당 데이터 검증 완료:`, 
                       `${result.metadata.processedFields}개 필드, ${result.errors.length}개 오류`);
            
            return result;
            
        } catch (error) {
            console.error('❌ 데이터 검증 중 오류:', error);
            result.isValid = false;
            result.errors.push(`검증 중 시스템 오류가 발생했습니다: ${error.message}`);
            return result;
        }
    }

    /**
     * 🔒 필수 필드 검증
     * @param {Object} data - 검증할 데이터
     * @returns {Object} 검증 결과
     */
    validateRequiredFields(data) {
        const result = { isValid: true, errors: [], warnings: [] };
        
        for (const [fieldName, rule] of Object.entries(this.VALIDATION_RULES)) {
            if (rule.required) {
                const value = data[fieldName];
                if (value === undefined || value === null || value === '' || 
                    (typeof value === 'string' && value.trim() === '')) {
                    result.isValid = false;
                    result.errors.push(rule.errorMessages.required || `${fieldName}은(는) 필수 항목입니다.`);
                }
            }
        }
        
        return result;
    }

    /**
     * 🎯 개별 필드 검증
     * @param {string} fieldName - 필드명
     * @param {*} value - 검증할 값
     * @param {Object} options - 검증 옵션
     * @returns {Object} 검증 결과
     */
    validateField(fieldName, value, options = {}) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitizedValue: value
        };
        
        // 알려진 필드인지 확인
        const rule = this.VALIDATION_RULES[fieldName];
        if (!rule) {
            if (options.strictMode !== false) {
                result.warnings.push(`알려지지 않은 필드입니다: ${fieldName}`);
            }
            return result;
        }
        
        try {
            // 타입 검증
            const typeResult = this.validateFieldType(fieldName, value, rule);
            if (!typeResult.isValid) {
                result.isValid = false;
                result.errors.push(...typeResult.errors);
                return result;
            }
            
            // 문자열 처리
            let processedValue = value;
            if (typeof value === 'string') {
                processedValue = value.trim();
                result.sanitizedValue = processedValue;
            }
            
            // 길이 검증
            const lengthResult = this.validateFieldLength(fieldName, processedValue, rule);
            if (!lengthResult.isValid) {
                result.isValid = false;
                result.errors.push(...lengthResult.errors);
            }
            
            // 패턴 검증
            const patternResult = this.validateFieldPattern(fieldName, processedValue, rule);
            if (!patternResult.isValid) {
                result.isValid = false;
                result.errors.push(...patternResult.errors);
            }
            
            // 사용자 정의 검증
            const customResult = this.validateCustomRules(fieldName, processedValue, rule);
            if (!customResult.isValid) {
                result.isValid = false;
                result.errors.push(...customResult.errors);
            }
            
        } catch (error) {
            console.error(`❌ 필드 검증 오류 (${fieldName}):`, error);
            result.isValid = false;
            result.errors.push(`필드 검증 중 오류가 발생했습니다: ${error.message}`);
        }
        
        return result;
    }

    /**
     * 📊 타입 검증
     */
    validateFieldType(fieldName, value, rule) {
        const result = { isValid: true, errors: [] };
        
        switch (rule.type) {
            case 'string':
            case 'textarea':
                if (typeof value !== 'string') {
                    result.isValid = false;
                    result.errors.push(`${fieldName}은(는) 문자열이어야 합니다.`);
                }
                break;
                
            case 'url':
                if (typeof value !== 'string') {
                    result.isValid = false;
                    result.errors.push(`${fieldName}은(는) URL 문자열이어야 합니다.`);
                }
                break;
                
            case 'phone':
            case 'contact':
                if (typeof value !== 'string') {
                    result.isValid = false;
                    result.errors.push(`${fieldName}은(는) 연락처 문자열이어야 합니다.`);
                }
                break;
                
            case 'number':
                if (typeof value !== 'number' && !this.isNumericString(value)) {
                    result.isValid = false;
                    result.errors.push(`${fieldName}은(는) 숫자여야 합니다.`);
                }
                break;
        }
        
        return result;
    }

    /**
     * 📏 길이 검증
     */
    validateFieldLength(fieldName, value, rule) {
        const result = { isValid: true, errors: [] };
        
        if (typeof value !== 'string') return result;
        
        const length = value.length;
        
        if (rule.minLength && length < rule.minLength) {
            result.isValid = false;
            result.errors.push(rule.errorMessages.minLength || 
                             `${fieldName}은(는) 최소 ${rule.minLength}자 이상이어야 합니다.`);
        }
        
        if (rule.maxLength && length > rule.maxLength) {
            result.isValid = false;
            result.errors.push(rule.errorMessages.maxLength || 
                             `${fieldName}은(는) 최대 ${rule.maxLength}자까지 입력 가능합니다.`);
        }
        
        return result;
    }

    /**
     * 🎭 패턴 검증
     */
    validateFieldPattern(fieldName, value, rule) {
        const result = { isValid: true, errors: [] };
        
        if (!rule.pattern || typeof value !== 'string') return result;
        
        if (!rule.pattern.test(value)) {
            result.isValid = false;
            result.errors.push(rule.errorMessages.pattern || 
                             `${fieldName}의 형식이 올바르지 않습니다.`);
        }
        
        return result;
    }

    /**
     * 🔧 사용자 정의 검증
     */
    validateCustomRules(fieldName, value, rule) {
        const result = { isValid: true, errors: [] };
        
        // 연락처 특별 검증
        if (fieldName === 'manager_contact' && typeof value === 'string') {
            const isEmail = this.CUSTOM_VALIDATORS.email.test(value);
            const isPhone = this.CUSTOM_VALIDATORS.phone_intl.test(value) || 
                          this.CUSTOM_VALIDATORS.phone_kr.test(value);
            
            if (!isEmail && !isPhone) {
                result.isValid = false;
                result.errors.push('올바른 이메일 또는 전화번호 형식이 아닙니다.');
            }
        }
        
        // URL 엄격 검증
        if (rule.type === 'url' && typeof value === 'string') {
            if (!this.CUSTOM_VALIDATORS.url_strict.test(value)) {
                result.isValid = false;
                result.errors.push('올바른 URL 형식이 아닙니다.');
            }
        }
        
        return result;
    }

    /**
     * 🔗 상호 의존성 검증
     */
    validateCrossFieldDependencies(data) {
        const result = { isValid: true, errors: [], warnings: [] };
        
        // 담당자 정보 일관성 검증
        if (data.manager_name && !data.manager_contact) {
            result.warnings.push('담당자명이 있지만 연락처가 없습니다.');
        }
        
        if (data.manager_contact && !data.manager_name) {
            result.warnings.push('담당자 연락처가 있지만 이름이 없습니다.');
        }
        
        // 프로그램 정보 일관성
        if (data.desired_courses && !data.cultural_program_plan) {
            result.warnings.push('희망개설강좌가 있지만 문화수업운영계획이 없습니다.');
        }
        
        return result;
    }

    /**
     * 💼 비즈니스 규칙 검증
     */
    validateBusinessRules(data) {
        const result = { isValid: true, errors: [], warnings: [] };
        
        // 학당명 중복 검증 (실제로는 API 호출 필요)
        if (data.name_ko) {
            // TODO: 실제 구현시 API 호출로 중복 체크
            // const isDuplicate = await this.checkInstituteNameDuplicate(data.name_ko);
        }
        
        // 연락처 형식 권장사항
        if (data.phone && !data.phone.includes('+') && !data.phone.startsWith('0')) {
            result.warnings.push('국제전화 형식 사용을 권장합니다 (+ 또는 0으로 시작).');
        }
        
        return result;
    }

    /**
     * 🔧 검증 결과 병합
     */
    mergeValidationResults(target, source) {
        if (!source.isValid) {
            target.isValid = false;
        }
        target.errors.push(...(source.errors || []));
        target.warnings.push(...(source.warnings || []));
    }

    /**
     * 📝 폼 실시간 검증
     * @param {HTMLFormElement} form - 검증할 폼
     * @returns {Object} 검증 결과
     */
    validateForm(form) {
        if (!form) {
            console.warn('⚠️ 검증할 폼이 제공되지 않았습니다');
            return { isValid: false, errors: ['폼을 찾을 수 없습니다.'] };
        }
        
        const formData = new FormData(form);
        const data = {};
        
        // FormData를 일반 객체로 변환
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return this.validateInstituteData(data, { mode: 'form' });
    }

    /**
     * 🎯 단일 필드 실시간 검증
     * @param {string} fieldName - 필드명
     * @param {*} value - 값
     * @returns {Object} 검증 결과
     */
    validateSingleField(fieldName, value) {
        return this.validateField(fieldName, value, { strictMode: false });
    }

    /**
     * 🔧 유틸리티 함수들
     */
    isNumericString(value) {
        return typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value));
    }

    sanitizeInput(value, type = 'string') {
        if (typeof value !== 'string') return value;
        
        let sanitized = value.trim();
        
        switch (type) {
            case 'html':
                // 기본적인 HTML 태그 제거
                sanitized = sanitized.replace(/<[^>]*>/g, '');
                break;
            case 'phone':
                // 전화번호에서 허용되지 않는 문자 제거
                sanitized = sanitized.replace(/[^0-9+\-\s\(\)\.]/g, '');
                break;
            case 'url':
                // URL 정규화
                if (sanitized && !sanitized.startsWith('http')) {
                    sanitized = 'https://' + sanitized;
                }
                break;
        }
        
        return sanitized;
    }

    /**
     * 📊 검증 통계 조회
     */
    getValidationStats() {
        return {
            ...this.validationStats,
            fieldErrorsArray: Array.from(this.validationStats.fieldErrors.entries()),
            successRate: this.validationStats.totalValidations > 0 ? 
                        (this.validationStats.successCount / this.validationStats.totalValidations * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * 🗑️ 검증 통계 초기화
     */
    resetValidationStats() {
        this.validationStats = {
            totalValidations: 0,
            successCount: 0,
            errorCount: 0,
            fieldErrors: new Map()
        };
        console.log('🗑️ 검증 통계 초기화됨');
    }

    /**
     * 📋 지원되는 필드 목록
     */
    getSupportedFields() {
        return Object.keys(this.VALIDATION_RULES);
    }

    /**
     * 📏 필드별 검증 규칙 조회
     */
    getFieldValidationRule(fieldName) {
        return this.VALIDATION_RULES[fieldName] || null;
    }

    /**
     * 📊 검증 모듈 상태
     */
    getValidationStatus() {
        return {
            initialized: this.initialized,
            supported_fields: Object.keys(this.VALIDATION_RULES).length,
            validation_stats: this.getValidationStats(),
            module_version: '4.4.0'
        };
    }
}

// 🌐 전역 인스턴스 생성
window.InstituteValidation = new InstituteValidation();

console.log('✅ InstituteValidation 모듈 로드 완료 (v4.4.0) - 15개 필드 검증 지원');
