# 기여 가이드 (Contributing Guide)

세종학당 문화교구 신청 플랫폼에 기여해주셔서 감사합니다! 이 문서는 프로젝트에 효과적으로 기여하는 방법을 안내합니다.

## 🤝 기여 방법

### 버그 리포트
버그를 발견하셨나요? 다음 정보와 함께 [GitHub Issues](https://github.com/faye8796/request/issues)에 신고해주세요:

- **버그 설명**: 무엇이 잘못되었는지 명확하게 설명
- **재현 단계**: 버그를 재현하는 구체적인 단계
- **예상 결과**: 어떤 결과를 기대했는지
- **실제 결과**: 실제로 무엇이 일어났는지
- **환경 정보**: 브라우저, OS, 디바이스 등
- **스크린샷**: 가능하다면 문제 상황의 스크린샷

### 기능 제안
새로운 기능이나 개선사항을 제안하고 싶으시다면:

1. 먼저 [Issues](https://github.com/faye8796/request/issues)에서 유사한 제안이 있는지 확인
2. 새 이슈를 생성하고 다음을 포함:
   - **문제점**: 현재 무엇이 부족한지
   - **제안사항**: 어떤 기능이 필요한지
   - **이점**: 이 기능이 어떤 도움이 될지
   - **대안**: 다른 해결 방법이 있는지

### 코드 기여
코드로 기여하고 싶으시다면 다음 단계를 따라주세요:

1. **이슈 확인**: 작업할 이슈를 선택하거나 새로 생성
2. **포크**: 레포지토리를 본인 계정으로 포크
3. **브랜치 생성**: 기능별로 새 브랜치 생성
4. **개발**: 코딩 가이드라인을 따라 개발
5. **테스트**: 변경사항을 철저히 테스트
6. **커밋**: 명확한 커밋 메시지 작성
7. **풀 리퀘스트**: 상세한 설명과 함께 PR 생성

## 🛠️ 개발 환경 설정

### 1. 프로젝트 클론
```bash
git clone https://github.com/faye8796/request.git
cd request
```

### 2. 브랜치 생성
```bash
git checkout -b feature/awesome-new-feature
```

### 3. 개발 서버 실행
```bash
# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js serve 사용
npx serve .

# 또는 Live Server (VS Code 확장)
```

### 4. Supabase 개발 환경 설정
1. [Supabase](https://supabase.com)에서 개발용 프로젝트 생성
2. `database/schema.sql` 실행하여 스키마 설정
3. `js/config.js`에 개발용 API 키 설정

## 📝 코딩 가이드라인

### JavaScript 스타일
```javascript
// ✅ 좋은 예시
const API_ENDPOINT = 'https://api.example.com';

function calculateBudget(lessons, perLessonAmount) {
    if (!lessons || !perLessonAmount) {
        throw new Error('Invalid parameters');
    }
    
    return lessons * perLessonAmount;
}

// ❌ 나쁜 예시
var endpoint = 'https://api.example.com'
function calc(l,p){return l*p}
```

### 네이밍 컨벤션
- **변수/함수**: camelCase (`userName`, `calculateTotal`)
- **상수**: UPPER_SNAKE_CASE (`API_KEY`, `MAX_FILE_SIZE`)
- **클래스**: PascalCase (`UserProfile`, `RequestManager`)
- **파일명**: kebab-case (`user-profile.js`, `admin-dashboard.css`)

### HTML/CSS 가이드라인
```html
<!-- ✅ 좋은 예시 -->
<button class="btn btn-primary" id="submitBtn" aria-label="교구 신청하기">
    <i data-lucide="plus"></i>
    신청하기
</button>

<!-- ❌ 나쁜 예시 -->
<button onclick="submit()">신청</button>
```

```css
/* ✅ 좋은 예시 */
.application-card {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* ❌ 나쁜 예시 */
.card{padding:10px;border:1px solid #ccc}
```

### 접근성 가이드라인
- 모든 버튼에 명확한 `aria-label` 제공
- 키보드 네비게이션 지원
- 색상만으로 정보를 전달하지 않음
- 적절한 명암비 유지 (최소 4.5:1)

## 🧪 테스트

### 수동 테스트
Pull Request 전에 다음을 확인해주세요:

- [ ] 모든 기능이 정상 작동
- [ ] 다양한 브라우저에서 테스트 (Chrome, Firefox, Safari)
- [ ] 모바일 디바이스에서 테스트
- [ ] 접근성 확인 (키보드 네비게이션, 스크린 리더)
- [ ] 에러 상황 처리 확인

### 테스트 시나리오
1. **학생 워크플로우**
   - 로그인 → 수업계획 작성 → 교구 신청 → 영수증 제출

2. **관리자 워크플로우**
   - 로그인 → 수업계획 승인 → 교구 승인 → 예산 설정

3. **에러 처리**
   - 잘못된 입력값
   - 네트워크 연결 실패
   - 권한이 없는 접근

## 📋 커밋 가이드라인

### 커밋 메시지 형식
```
type(scope): description

[optional body]

[optional footer]
```

### 타입
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 스타일 변경 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스, 도구 변경

### 예시
```bash
feat(auth): add student authentication with birth date
fix(budget): correct calculation for field-specific limits
docs(readme): update installation instructions
style(css): improve responsive design for mobile devices
```

## 🔄 Pull Request 프로세스

### PR 생성 전 체크리스트
- [ ] 최신 main 브랜치와 동기화
- [ ] 코딩 가이드라인 준수
- [ ] 테스트 완료
- [ ] 커밋 메시지 정리
- [ ] 관련 이슈 번호 확인

### PR 템플릿
```markdown
## 변경사항
- [ ] 새로운 기능 추가
- [ ] 버그 수정
- [ ] 문서 업데이트
- [ ] 코드 리팩토링

## 설명
이 PR이 해결하는 문제와 구현 방법을 설명해주세요.

## 관련 이슈
Fixes #123

## 테스트
테스트한 내용과 방법을 설명해주세요.

## 스크린샷 (UI 변경 시)
변경사항을 보여주는 스크린샷을 첨부해주세요.

## 체크리스트
- [ ] 코딩 가이드라인 준수
- [ ] 테스트 완료
- [ ] 문서 업데이트 (필요시)
- [ ] 접근성 확인
```

### 리뷰 프로세스
1. **자동 검사**: 코드 스타일, 빌드 성공 여부
2. **코드 리뷰**: 다른 기여자들의 피드백
3. **테스트**: 기능 및 회귀 테스트
4. **승인**: 메인테이너의 최종 승인
5. **병합**: main 브랜치로 병합

## 📚 개발 리소스

### 주요 기술 문서
- [Supabase 문서](https://supabase.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)

### 추천 도구
- **에디터**: VS Code, WebStorm
- **브라우저**: Chrome DevTools, Firefox Developer Tools
- **디자인**: Figma, Adobe XD
- **API 테스트**: Postman, Insomnia

### 유용한 VS Code 확장
- Live Server
- Prettier
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer

## 🏷️ 이슈 라벨

프로젝트에서 사용하는 라벨들:

- `bug`: 버그 리포트
- `enhancement`: 새로운 기능 제안
- `documentation`: 문서 관련
- `good first issue`: 초보자에게 적합한 이슈
- `help wanted`: 도움이 필요한 이슈
- `priority: high`: 높은 우선순위
- `priority: low`: 낮은 우선순위
- `wontfix`: 수정하지 않을 이슈

## 🎯 기여 아이디어

처음 기여하시는 분들을 위한 아이디어:

### 쉬운 작업
- 오타 수정
- 번역 개선
- 문서 보완
- CSS 스타일 개선
- 접근성 향상

### 중간 난이도
- 새로운 UI 컴포넌트
- 데이터 검증 로직
- 에러 처리 개선
- 성능 최적화

### 고급 작업
- 새로운 기능 모듈
- 데이터베이스 스키마 변경
- 보안 강화
- 아키텍처 개선

## 🌟 기여자 인정

모든 기여자는 다음과 같이 인정받습니다:

- **README.md 기여자 섹션**에 이름 추가
- **GitHub Contributors** 목록에 자동 표시
- **특별 기여**에 대해서는 별도 언급

## 📞 소통 채널

- **GitHub Issues**: 버그 리포트, 기능 제안
- **GitHub Discussions**: 일반적인 질문, 아이디어 논의
- **Email**: urgent-contact@sejong.or.kr (긴급한 보안 이슈만)

## 📜 행동 강령

모든 기여자는 다음 원칙을 지켜주세요:

- **존중**: 모든 사람을 존중하고 포용적인 환경 조성
- **건설적**: 건설적인 피드백과 토론
- **협력**: 팀워크와 지식 공유
- **전문성**: 전문적이고 예의 바른 커뮤니케이션

## 📖 추가 자료

- [Git 사용법](https://git-scm.com/book)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [웹 접근성 가이드](https://www.w3.org/WAI/WCAG21/quickref/)
- [JavaScript 모범 사례](https://github.com/ryanmcdermott/clean-code-javascript)

---

**감사합니다!** 여러분의 기여가 세종학당 문화교구 신청 플랫폼을 더욱 발전시킵니다. 🚀

질문이 있으시면 언제든지 Issues를 통해 문의해주세요!
