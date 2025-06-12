# 세종학당 문화교구 신청 플랫폼

세종학당 문화인턴을 위한 교구 신청 시스템입니다.

## 접속 방법
- https://culturing.org/request

## 테스트 계정
- 학생: 김민수 (1998-03-15)
- 관리자: admin123

## 주요 기능
- 학생별 교구 신청
- 관리자 승인/반려 시스템
- Excel 내보내기
- 실시간 상태 관리

## 파일 구조
```
/request/
├── index.html              # 메인 페이지
├── css/                    # 스타일 파일들
│   ├── main.css
│   ├── login.css
│   ├── student.css
│   └── admin.css
└── js/                     # JavaScript 파일들
    ├── data.js
    ├── utils.js
    ├── auth.js
    ├── student.js
    ├── admin.js
    └── app.js
```

## 개발 상태
- ✅ 기본 UI/UX 완성
- ✅ 로그인 시스템
- ✅ 학생 신청 기능
- ✅ 관리자 관리 기능
- 🔄 Supabase 연동 예정