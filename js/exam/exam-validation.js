/**
 * 📝 수료평가 시스템 - 검증 모듈 v5.1.0
 * 문제 데이터, 시험 설정 등의 검증 로직
 * 기존 시스템과 완전 분리된 독립 모듈
 */

class ExamValidation {
    constructor() {
        this.moduleStatus = {
            initialized: false,
            name: 'ExamValidation',
            version: '5.1.0',
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * 🚀 모듈 초기화
     */
    async initialize() {
        try {
            console.log('🔄 ExamValidation v5.1.0 초기화 시작...');
            
            this.moduleStatus.initialized = true;
            console.log('✅ ExamValidation v5.1.0 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ ExamValidation 초기화 실패:', error);
            throw error;
        }
    }

    // ==================== 문제 검증 ====================

    /**
     * 🔍 문제 데이터 종합 검증
     */
    validateQuestion(questionData) {
        const errors = [];
        
        // 기본 필수 필드 검증
        errors.push(...this.validateQuestionBasic(questionData));
        
        // 문제 유형별 검증
        if (questionData.question_type === 'multiple_choice') {
            errors.push(...this.validateMultipleChoice(questionData));
        } else if (questionData.question_type === 'short_answer') {
            errors.push(...this.validateShortAnswer(questionData));
        }
        
        // 배점 검증
        errors.push(...this.validatePoints(questionData.points));
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 🔍 문제 기본 정보 검증
     */
    validateQuestionBasic(data) {
        const errors = [];
        
        // 문제 내용 검증
        if (!data.question_text) {
            errors.push('문제 내용은 필수입니다.');
        } else {
            const text = data.question_text.trim();
            if (text.length < 10) {
                errors.push('문제 내용은 최소 10자 이상이어야 합니다.');
            }
            if (text.length > 1000) {
                errors.push('문제 내용은 최대 1000자까지 입력 가능합니다.');
            }
            // HTML 태그 검사
            if (/<[^>]*>/g.test(text)) {
                errors.push('문제 내용에 HTML 태그는 사용할 수 없습니다.');
            }
        }
        
        // 문제 유형 검증
        if (!data.question_type) {
            errors.push('문제 유형은 필수입니다.');
        } else if (!['multiple_choice', 'short_answer'].includes(data.question_type)) {
            errors.push('올바른 문제 유형을 선택해주세요.');
        }
        
        // 정답 검증
        if (!data.correct_answer) {
            errors.push('정답은 필수입니다.');
        } else {
            const answer = data.correct_answer.trim();
            if (answer.length === 0) {
                errors.push('정답을 입력해주세요.');
            }
            if (answer.length > 200) {
                errors.push('정답은 최대 200자까지 입력 가능합니다.');
            }
        }
        
        return errors;
    }

    /**
     * 🔍 객관식 문제 검증
     */
    validateMultipleChoice(data) {
        const errors = [];
        
        // 선택지 존재 여부
        if (!data.options) {
            errors.push('객관식 문제는 선택지가 필요합니다.');
            return errors;
        }
        
        // 선택지 배열 확인
        let options;
        if (Array.isArray(data.options)) {
            options = data.options;
        } else if (typeof data.options === 'string') {
            try {
                options = JSON.parse(data.options);
            } catch (e) {
                errors.push('선택지 형식이 올바르지 않습니다.');
                return errors;
            }
        } else {
            errors.push('선택지는 배열 형태여야 합니다.');
            return errors;
        }
        
        // 선택지 개수 검증
        if (options.length < 2) {
            errors.push('객관식 문제는 최소 2개의 선택지가 필요합니다.');
        }
        if (options.length > 5) {
            errors.push('객관식 문제는 최대 5개의 선택지까지 가능합니다.');
        }
        
        // 각 선택지 검증
        const validOptions = [];
        options.forEach((option, index) => {
            if (!option || typeof option !== 'string') {
                errors.push(`선택지 ${index + 1}은 텍스트여야 합니다.`);
            } else {
                const trimmed = option.trim();
                if (trimmed.length === 0) {
                    errors.push(`선택지 ${index + 1}을 입력해주세요.`);
                } else if (trimmed.length > 100) {
                    errors.push(`선택지 ${index + 1}은 최대 100자까지 입력 가능합니다.`);
                } else {
                    validOptions.push(trimmed);
                }
            }
        });
        
        // 중복 선택지 검사
        const uniqueOptions = [...new Set(validOptions.map(opt => opt.toLowerCase()))];
        if (uniqueOptions.length !== validOptions.length) {
            errors.push('중복된 선택지가 있습니다.');
        }
        
        // 정답이 선택지에 포함되는지 확인
        if (data.correct_answer && validOptions.length > 0) {
            const correctAnswer = data.correct_answer.trim();
            if (!validOptions.includes(correctAnswer)) {
                errors.push('정답이 선택지에 포함되어야 합니다.');
            }
        }
        
        return errors;
    }

    /**
     * 🔍 단답형 문제 검증
     */
    validateShortAnswer(data) {
        const errors = [];
        
        if (data.correct_answer) {
            const answer = data.correct_answer.trim();
            
            // 단답형 정답 길이 제한
            if (answer.length > 50) {
                errors.push('단답형 정답은 최대 50자까지 입력 가능합니다.');
            }
            
            // 특수 문자 검사
            if (/[<>"'&]/g.test(answer)) {
                errors.push('정답에는 특수 문자(<, >, ", \', &)를 사용할 수 없습니다.');
            }
        }
        
        return errors;
    }

    /**
     * 🔍 배점 검증
     */
    validatePoints(points) {
        const errors = [];
        
        if (points === undefined || points === null || points === '') {
            errors.push('배점은 필수입니다.');
            return errors;
        }
        
        const pointsNum = parseInt(points);
        if (isNaN(pointsNum)) {
            errors.push('배점은 숫자여야 합니다.');
        } else if (pointsNum < 1) {
            errors.push('배점은 최소 1점이어야 합니다.');
        } else if (pointsNum > 10) {
            errors.push('배점은 최대 10점까지 가능합니다.');
        }
        
        return errors;
    }

    // ==================== 시험 설정 검증 ====================

    /**
     * 🔍 시험 설정 검증
     */
    validateExamSettings(settings) {
        const errors = [];
        
        // 합격 기준 점수 검증
        if (settings.pass_score !== undefined) {
            errors.push(...this.validatePassScore(settings.pass_score));
        }
        
        // 시험 활성화 여부 검증
        if (settings.exam_active !== undefined) {
            errors.push(...this.validateExamActive(settings.exam_active));
        }
        
        // 시험 시간 제한 검증 (향후 확장)
        if (settings.time_limit !== undefined) {
            errors.push(...this.validateTimeLimit(settings.time_limit));
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 🔍 합격 기준 점수 검증
     */
    validatePassScore(passScore) {
        const errors = [];
        
        if (passScore === undefined || passScore === null || passScore === '') {
            errors.push('합격 기준 점수는 필수입니다.');
            return errors;
        }
        
        const score = parseInt(passScore);
        if (isNaN(score)) {
            errors.push('합격 기준 점수는 숫자여야 합니다.');
        } else if (score < 0) {
            errors.push('합격 기준 점수는 0점 이상이어야 합니다.');
        } else if (score > 100) {
            errors.push('합격 기준 점수는 100점 이하여야 합니다.');
        }
        
        return errors;
    }

    /**
     * 🔍 시험 활성화 여부 검증
     */
    validateExamActive(examActive) {
        const errors = [];
        
        if (examActive === undefined || examActive === null || examActive === '') {
            errors.push('시험 활성화 여부는 필수입니다.');
            return errors;
        }
        
        const validValues = [true, false, 'true', 'false', 1, 0, '1', '0'];
        if (!validValues.includes(examActive)) {
            errors.push('시험 활성화 여부는 올바른 값이어야 합니다.');
        }
        
        return errors;
    }

    /**
     * 🔍 시험 시간 제한 검증 (향후 확장)
     */
    validateTimeLimit(timeLimit) {
        const errors = [];
        
        if (timeLimit !== undefined && timeLimit !== null && timeLimit !== '') {
            const time = parseInt(timeLimit);
            if (isNaN(time)) {
                errors.push('시험 시간은 숫자여야 합니다.');
            } else if (time < 5) {
                errors.push('시험 시간은 최소 5분이어야 합니다.');
            } else if (time > 180) {
                errors.push('시험 시간은 최대 180분까지 가능합니다.');
            }
        }
        
        return errors;
    }

    // ==================== 실시간 검증 ====================

    /**
     * 🔍 실시간 필드 검증
     */
    validateField(fieldName, value, questionType = null) {
        const errors = [];
        
        switch (fieldName) {
            case 'question_text':
                if (value && value.trim().length > 0 && value.trim().length < 10) {
                    errors.push('문제 내용은 최소 10자 이상이어야 합니다.');
                }
                if (value && value.length > 1000) {
                    errors.push('문제 내용은 최대 1000자까지 입력 가능합니다.');
                }
                break;
                
            case 'correct_answer':
                if (questionType === 'short_answer' && value && value.length > 50) {
                    errors.push('단답형 정답은 최대 50자까지 입력 가능합니다.');
                }
                if (value && value.length > 200) {
                    errors.push('정답은 최대 200자까지 입력 가능합니다.');
                }
                break;
                
            case 'points':
                if (value) {
                    const points = parseInt(value);
                    if (isNaN(points) || points < 1 || points > 10) {
                        errors.push('배점은 1~10점 사이여야 합니다.');
                    }
                }
                break;
                
            case 'pass_score':
                if (value) {
                    const score = parseInt(value);
                    if (isNaN(score) || score < 0 || score > 100) {
                        errors.push('합격 기준 점수는 0~100점 사이여야 합니다.');
                    }
                }
                break;
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ==================== 유틸리티 함수 ====================

    /**
     * 🔍 문자열 안전성 검사
     */
    isSafeString(str) {
        if (!str || typeof str !== 'string') return false;
        
        // XSS 방지를 위한 기본적인 HTML 태그 검사
        const htmlPattern = /<[^>]*>/g;
        if (htmlPattern.test(str)) return false;
        
        // 스크립트 태그 검사
        const scriptPattern = /<script[^>]*>.*?<\/script>/gi;
        if (scriptPattern.test(str)) return false;
        
        // 이벤트 핸들러 검사
        const eventPattern = /on\w+\s*=/gi;
        if (eventPattern.test(str)) return false;
        
        return true;
    }

    /**
     * 🔍 JSON 유효성 검사
     */
    isValidJSON(str) {
        try {
            const parsed = JSON.parse(str);
            return { isValid: true, data: parsed };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    /**
     * 🔍 이메일 유효성 검사
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email.trim());
    }

    /**
     * 🔍 URL 유효성 검사
     */
    isValidURL(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch (error) {
            return false;
        }
    }

    /**
     * 📊 검증 결과 포맷팅
     */
    formatValidationResult(isValid, errors = [], warnings = []) {
        return {
            isValid: isValid,
            errors: errors,
            warnings: warnings,
            hasErrors: errors.length > 0,
            hasWarnings: warnings.length > 0,
            message: isValid ? '검증 성공' : `검증 실패: ${errors.join(', ')}`
        };
    }

    /**
     * 📊 모듈 상태 조회
     */
    getModuleStatus() {
        return this.moduleStatus;
    }
}

// 전역에 모듈 등록
if (typeof window !== 'undefined') {
    window.ExamValidation = new ExamValidation();
    console.log('🔍 ExamValidation v5.1.0 모듈 로드됨');
}