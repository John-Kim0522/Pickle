# 제1회 쀼 피클볼 대항전 웹

지인 8명이 휴대폰으로 같은 주소에 접속해 대진을 확인하고, 공용 PIN으로 각 세트 점수를 입력하는 대회용 웹입니다.

## 확정된 대회 방식

- 참가자 8명
  - 남자: 곽성민, 김정훈, 윤희철, 박성민
  - 여자: 성지혜, 조혜민, 이지영, 심우연
- 부부 복식팀
  1. 곽성민 · 성지혜
  2. 김정훈 · 조혜민
  3. 윤희철 · 이지영
  4. 박성민 · 심우연
- 부부 복식: 4팀 풀리그 6경기
- 남자 단식: 4명 풀리그 6경기
- 여자 단식: 4명 풀리그 6경기
- 전체 18경기
- 모든 경기 3판 2선승
- 각 세트 11점, 10:10 이후 2점 차가 날 때까지 진행
- 2:0으로 끝나면 3세트는 입력하지 않음

## 순위 규칙

1. 경기 승수
2. 두 명/두 팀만 동률이면 맞대결 승자
3. 세트 득실
4. 점수 득실
5. 총 득점

3명 이상이 같은 승수로 물리는 경우 맞대결만으로 일관된 순위를 만들 수 없으므로 세트 득실 → 점수 득실 순으로 비교합니다.

## 1. Supabase 만들기

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor를 엽니다.
3. `supabase/schema.sql` 전체를 붙여넣고 실행합니다.
4. Project Settings > API에서 아래 값을 확인합니다.
   - Project URL
   - service_role key

> `schema.sql`을 다시 실행하면 기존 경기 결과가 초기화됩니다.

## 2. 환경변수 설정

`.env.example`을 `.env.local`로 복사합니다.

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
TOURNAMENT_PIN=1234
NEXT_PUBLIC_TOURNAMENT_TITLE=제1회 쀼 피클볼 대항전
```

`TOURNAMENT_PIN`은 8명이 공유할 원하는 숫자로 바꾸면 됩니다.

## 3. 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인합니다.

## 4. Vercel에 올리기

1. 이 프로젝트를 GitHub 저장소에 올립니다.
2. Vercel에서 GitHub 저장소를 Import 합니다.
3. Vercel 프로젝트의 Environment Variables에 다음 4개를 넣습니다.
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TOURNAMENT_PIN`
   - `NEXT_PUBLIC_TOURNAMENT_TITLE`
4. Deploy 합니다.
5. 생성된 `https://...vercel.app` 주소를 카톡방에 공유합니다.

## 점수 입력 검증

서버에서 아래 규칙을 검사합니다.

- 정상 종료 예: 11:0, 11:9
- 듀스 종료 예: 12:10, 13:11, 18:16
- 저장 불가 예: 11:10, 12:9, 15:14
- 처음 두 세트를 같은 쪽이 이기면 3세트 입력 불가
- 1:1이면 3세트 필수
- 결과 등록/수정/초기화는 공용 PIN 필요

## 주요 파일

- `app/page.tsx`: 모바일 메인 화면 / 점수 입력
- `app/api/state/route.ts`: 전체 대진과 순위 조회
- `app/api/matches/[id]/route.ts`: PIN 및 세트 점수 검증 후 저장
- `lib/standings.ts`: 복식/남자/여자 순위 계산
- `supabase/schema.sql`: 참가자 8명 + 18경기 전체 대진
- `preview.html`: Supabase 없이 화면과 로직을 시험하는 단일 HTML 미리보기
