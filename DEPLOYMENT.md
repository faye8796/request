# 배포 가이드

세종학당 문화교구 신청 플랫폼을 다양한 환경에 배포하는 방법을 설명합니다.

## 🚀 빠른 시작

### 1. 사전 요구사항
- [Supabase](https://supabase.com) 계정
- [Git](https://git-scm.com/) 설치
- 웹 호스팅 서비스 (GitHub Pages, Netlify, Vercel 등)

### 2. 프로젝트 클론
```bash
git clone https://github.com/faye8796/request.git
cd request
```

## 🗄️ Supabase 설정

### 1. 새 프로젝트 생성
1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름과 데이터베이스 비밀번호 설정
4. 지역 선택 (한국의 경우 Northeast Asia 권장)

### 2. 데이터베이스 스키마 설정
1. Supabase 대시보드에서 "SQL Editor" 메뉴 선택
2. `database/schema.sql` 파일의 내용을 복사하여 실행
3. 모든 테이블과 정책이 생성되었는지 확인

### 3. API 키 확인
1. "Settings" → "API" 메뉴에서 다음 정보 확인:
   - Project URL
   - anon/public key
2. 이 정보는 나중에 환경설정에서 사용됩니다.

### 4. 스토리지 설정 (영수증 이미지용)
1. "Storage" 메뉴에서 새 버킷 생성
2. 버킷 이름: `receipts`
3. 공개 액세스: `false`
4. 파일 크기 제한: `5MB`
5. 허용 파일 타입: `image/*`

## ⚙️ 환경 설정

### 개발 환경
개발 및 테스트용으로는 `js/config.js` 파일을 직접 수정:

```javascript
const CONFIG = {
    SUPABASE: {
        URL: 'your-supabase-project-url',
        ANON_KEY: 'your-supabase-anon-key'
    },
    // ... 기타 설정
};
```

### 프로덕션 환경
보안을 위해 환경변수 파일을 별도로 생성:

1. **env.js 파일 생성**
```javascript
// js/env.js (Git에 포함하지 말 것!)
window.ENV = {
    SUPABASE_URL: 'your-production-supabase-url',
    SUPABASE_ANON_KEY: 'your-production-anon-key'
};
```

2. **.gitignore 업데이트**
```
js/env.js
```

3. **index.html 수정** (환경변수 파일 로드)
```html
<!-- config.js 이전에 추가 -->
<script src="js/env.js"></script>
<script src="js/config.js"></script>
```

## 🌐 배포 옵션

### Option 1: GitHub Pages (무료)

1. **레포지토리 설정**
```bash
# 프로덕션 환경변수 파일 생성
cp js/config.js js/env.js
# env.js에서 실제 Supabase 키로 수정
```

2. **GitHub Actions 워크플로우 생성**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup environment
      run: |
        echo "window.ENV = {" > js/env.js
        echo "  SUPABASE_URL: '${{ secrets.SUPABASE_URL }}'," >> js/env.js
        echo "  SUPABASE_ANON_KEY: '${{ secrets.SUPABASE_ANON_KEY }}'" >> js/env.js
        echo "};" >> js/env.js
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

3. **GitHub Secrets 설정**
   - Repository Settings → Secrets and variables → Actions
   - `SUPABASE_URL`과 `SUPABASE_ANON_KEY` 추가

4. **Pages 활성화**
   - Repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages

### Option 2: Netlify (무료)

1. **netlify.toml 파일 생성**
```toml
[build]
  publish = "."
  command = "echo 'No build required'"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

2. **빌드 스크립트 생성**
```bash
#!/bin/bash
# build.sh
echo "window.ENV = {" > js/env.js
echo "  SUPABASE_URL: '$SUPABASE_URL'," >> js/env.js
echo "  SUPABASE_ANON_KEY: '$SUPABASE_ANON_KEY'" >> js/env.js
echo "};" >> js/env.js
```

3. **Netlify 배포**
   - [Netlify](https://netlify.com)에서 GitHub 연결
   - Build command: `bash build.sh`
   - Publish directory: `.`
   - Environment variables에 Supabase 키 추가

### Option 3: Vercel (무료)

1. **vercel.json 파일 생성**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "app/config.js": {
      "includeFiles": "js/**"
    }
  }
}
```

2. **Vercel 배포**
   - [Vercel](https://vercel.com)에서 GitHub 연결
   - Framework Preset: Other
   - Environment Variables에 Supabase 키 추가

### Option 4: 자체 서버 (VPS/클라우드)

1. **웹 서버 설정 (Nginx 예시)**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/request;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co;" always;
}
```

2. **SSL 인증서 설정 (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔧 배포 후 설정

### 1. 관리자 계정 설정
첫 배포 후 Supabase 대시보드에서 관리자 계정 확인:
```sql
SELECT * FROM user_profiles WHERE user_type = 'admin';
```

### 2. 예산 설정 확인
```sql
SELECT * FROM budget_settings;
```

### 3. 시스템 설정 확인
```sql
SELECT * FROM system_settings;
```

## 🔍 배포 검증

### 1. 기능 테스트
- [ ] 학생 로그인 (샘플 계정 사용)
- [ ] 관리자 로그인 (admin123)
- [ ] 수업계획 작성 및 저장
- [ ] 교구 신청
- [ ] 관리자 승인/반려
- [ ] 예산 현황 확인
- [ ] Excel 내보내기

### 2. 보안 테스트
- [ ] HTTPS 연결 확인
- [ ] RLS 정책 동작 확인
- [ ] API 키 노출 여부 확인
- [ ] XSS/CSRF 방어 확인

### 3. 성능 테스트
- [ ] 페이지 로드 속도
- [ ] 대용량 파일 업로드
- [ ] 동시 접속 처리

## 🔄 업데이트 및 유지보수

### Git 워크플로우
```bash
# 개발 브랜치에서 작업
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# 메인 브랜치로 병합 (자동 배포 트리거)
git checkout main
git merge feature/new-feature
git push origin main
```

### 데이터베이스 마이그레이션
```sql
-- migration_001.sql 예시
ALTER TABLE requests ADD COLUMN new_field VARCHAR(255);
```

### 백업 설정
1. Supabase 대시보드에서 자동 백업 설정
2. 정기적인 수동 백업 실행
```bash
# PostgreSQL 덤프 예시
pg_dump -h db.xyz.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

## 🆘 문제 해결

### 일반적인 문제들

1. **페이지가 로드되지 않음**
   - 네트워크 탭에서 404 에러 확인
   - 파일 경로와 서버 설정 확인

2. **Supabase 연결 실패**
   - API 키와 URL 확인
   - CORS 설정 확인
   - RLS 정책 확인

3. **로그인이 안됨**
   - 사용자 데이터가 올바르게 입력되었는지 확인
   - 인증 로직 및 데이터베이스 스키마 확인

4. **파일 업로드 실패**
   - Supabase 스토리지 버킷 설정 확인
   - 파일 크기 및 타입 제한 확인

### 로그 확인
- 브라우저 개발자 도구 Console
- Supabase 대시보드 Logs
- 웹 서버 액세스/에러 로그

### 지원 요청
문제가 해결되지 않으면:
1. GitHub Issues에 문제 보고
2. 로그와 에러 메시지 포함
3. 환경 정보 (브라우저, OS 등) 제공

## 📊 모니터링

### 추천 도구
- **Uptime Robot**: 서비스 가용성 모니터링
- **Google Analytics**: 사용자 행동 분석
- **Sentry**: 에러 추적
- **LogRocket**: 사용자 세션 녹화

### 핵심 지표
- 페이지 로드 시간
- 에러 발생률
- 사용자 전환율
- API 응답 시간

---

**배포 성공을 축하합니다! 🎉**

추가 질문이나 문제가 있으면 GitHub Issues를 통해 문의해주세요.
