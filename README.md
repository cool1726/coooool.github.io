# Notion 기반 기술 블로그

Notion API를 사용하여 작성한 글을 정적 HTML로 변환하여 GitHub Pages에 배포하는 기술 블로그입니다.

## 기능

- 📝 Notion에서 작성한 글을 자동으로 가져오기
- 🎨 깔끔한 블로그 UI
- 🚀 GitHub Pages를 통한 자동 배포
- 📱 반응형 디자인

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/coooool/coooool.github.io.git
cd coooool.github.io
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Notion 설정

#### Notion Integration 생성

1. [Notion Integrations](https://www.notion.so/my-integrations) 페이지로 이동
2. "New integration" 클릭
3. 이름을 입력하고 "Submit" 클릭
4. 생성된 Integration의 "Internal Integration Token"을 복사

#### Notion 데이터베이스 생성

1. Notion에서 새 페이지 생성
2. 데이터베이스 추가 (Table - Inline)
3. 다음 속성 추가:
   - **Title** (제목): Title 타입
   - **Date** (날짜): Date 타입
   - **Excerpt** (요약): Text 타입
   - **Published** (발행 여부): Checkbox 타입
4. 데이터베이스 페이지를 Integration에 공유:
   - 페이지 우측 상단 "..." 메뉴 클릭
   - "Connections" → 생성한 Integration 선택

#### 환경변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NOTION_API_KEY=your_notion_api_key_here
NOTION_DATABASE_ID=your_notion_database_id_here
```

- `NOTION_API_KEY`: 위에서 복사한 Integration Token
- `NOTION_DATABASE_ID`: Notion 데이터베이스의 ID (URL에서 확인 가능)

### 4. 로컬 개발

```bash
# Notion에서 포스트 가져오기
npm run fetch-notion

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 5. 빌드

```bash
npm run build
```

빌드된 파일은 `out` 디렉토리에 생성됩니다.

## GitHub Pages 배포

### GitHub Secrets 설정

1. GitHub 저장소의 Settings → Secrets and variables → Actions로 이동
2. 다음 Secrets 추가:
   - `NOTION_API_KEY`: Notion Integration Token
   - `NOTION_DATABASE_ID`: Notion 데이터베이스 ID

### Pages 설정

1. GitHub 저장소의 Settings → Pages로 이동
2. Source를 "GitHub Actions"로 선택

### 자동 배포

`main` 브랜치에 푸시하면 자동으로 GitHub Actions가 실행되어 배포됩니다.

## 프로젝트 구조

```
coooool.github.io/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 홈 페이지
│   ├── globals.css        # 전역 스타일
│   └── posts/
│       └── [slug]/
│           └── page.tsx   # 포스트 상세 페이지
├── lib/
│   └── notion.ts          # Notion API 클라이언트
├── scripts/
│   └── fetch-notion.js    # Notion 데이터 가져오기 스크립트
├── data/
│   └── posts.json         # 가져온 포스트 데이터 (자동 생성)
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions 워크플로우
├── next.config.js         # Next.js 설정
└── package.json
```

## 사용법

### 새 포스트 작성

1. Notion 데이터베이스에 새 페이지 추가
2. Title, Date, Excerpt 입력
3. Published 체크박스 선택
4. 내용 작성
5. GitHub에 푸시하면 자동으로 배포됩니다

### 포스트 업데이트

Notion에서 포스트를 수정한 후 GitHub에 푸시하면 자동으로 반영됩니다.

## 커스터마이징

### 스타일 수정

`app/globals.css` 파일을 수정하여 스타일을 변경할 수 있습니다.

### 레이아웃 수정

- `app/layout.tsx`: 전체 레이아웃
- `app/page.tsx`: 홈 페이지
- `app/posts/[slug]/page.tsx`: 포스트 상세 페이지

## 라이선스

MIT

