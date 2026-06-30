# 🍚 강남역 점심 룰렛

강남역 **3·4·5·6번 출구 반경 500m**, **점심 메뉴 12,000원 이내** 식당 **42곳**을 매일 점심때 랜덤으로 돌리거나 직접 고르는 웹앱.

- 슬롯 릴이 돌아가다 한 곳에 멈추고 폭죽이 터지는 **랜덤 룰렛**
- 리스트에서 직접 누르는 **지정 모드**, 길게 누르면 **제외**
- 🍚한식 🍲국밥 🍛돈까스·카레 🍜라멘 🥟중식 🥢베트남·아시안 🍙김밥·분식 🍔버거 🥗샐러드·포케 **9개 카테고리 필터**
- 결과 카드에서 **네이버지도·카카오맵** 바로가기
- 데이터는 **Supabase**에서 로드하고, 연결이 없으면 `data/restaurants.json`으로 **자동 폴백** → 정적 호스팅만으로도 즉시 동작

---

## 폴더 구조

```
gangnam-lunch/
├── index.html               # 메인 앱 (Supabase 로드 → JSON 폴백)
├── config.example.js        # Supabase 설정 템플릿
├── config.js                # 실제 설정 (기본 빈 값 = JSON 폴백)
├── data/
│   └── restaurants.json      # 단일 데이터 원본 (42곳)
├── supabase/
│   ├── schema.sql            # 테이블 + RLS + 인덱스
│   └── seed.sql              # 시드 데이터 (SQL Editor 붙여넣기용)
├── scripts/
│   ├── seed.mjs              # JSON → Supabase 업서트 (Node)
│   └── gen-seed-sql.mjs      # JSON → seed.sql 재생성
├── .github/workflows/
│   └── deploy.yml            # GitHub Pages 자동 배포
├── package.json
├── .gitignore
└── README.md
```

데이터를 바꿀 땐 **`data/restaurants.json` 한 곳만 수정**하면 됩니다. (`npm run gen-seed-sql`로 seed.sql 재생성)

---

## 빠른 시작 (Supabase 없이, 1분)

GitHub Pages만으로 바로 띄우는 방법입니다. `config.js`를 비워두면 JSON으로 동작합니다.

```bash
git clone https://github.com/ds1byn-ops/<repo>.git
cd <repo>
# 로컬 미리보기
python3 -m http.server 8000   # → http://localhost:8000
```

> 로컬에서 `file://`로 직접 열면 `fetch('./data/restaurants.json')`가 막힙니다. 위처럼 간단한 서버로 여세요.

---

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소(예: `ds1byn-ops/gangnam-lunch`)에 푸시합니다.
   ```bash
   git init && git add . && git commit -m "init: 강남역 점심 룰렛"
   git branch -M main
   git remote add origin https://github.com/ds1byn-ops/gangnam-lunch.git
   git push -u origin main
   ```
2. GitHub 저장소 **Settings → Pages → Build and deployment → Source = GitHub Actions** 선택.
3. `main`에 푸시하면 `.github/workflows/deploy.yml`이 자동 배포합니다.
   주소: `https://ds1byn-ops.github.io/gangnam-lunch/`

> Netlify를 쓰려면 이 폴더를 그대로 드래그 앤 드롭하거나 저장소를 연결하면 됩니다. 빌드 명령 없이 정적 배포로 끝.

---

## Supabase 연결 (선택)

식당을 코드 수정 없이 관리하고 싶을 때 연결합니다.

### 1) 테이블 만들기
Supabase 대시보드 → **SQL Editor**에서 순서대로 실행:
1. `supabase/schema.sql` 붙여넣고 **Run** (테이블·RLS 생성)
2. `supabase/seed.sql` 붙여넣고 **Run** (42곳 데이터 삽입)

### 2) 앱에 키 넣기
Supabase → **Settings → API**에서 값 복사 후 `config.js` 작성:
```js
window.LUNCH_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi..."   // anon / public 키 (공개돼도 안전)
};
```
저장하고 새로고침하면 상단 배지가 **"Supabase 연결됨"**으로 바뀝니다.

> **보안**: RLS로 `select`만 허용돼 있어 anon 키로는 읽기만 가능합니다. `service_role` 키는 절대 프론트/깃에 넣지 마세요.

### 3) 데이터 갱신
- **SQL만으로**: `data/restaurants.json` 수정 → `npm run gen-seed-sql` → 새 `seed.sql`을 SQL Editor에 Run
- **스크립트로**:
  ```bash
  npm install
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
  ```

---

## 식당 추가/수정 방법

`data/restaurants.json`의 `restaurants` 배열에 한 줄 추가:
```json
{
  "name": "가게이름",
  "category": "han",                 // han/guk/don/ram/chi/viet/kim/burg/salad
  "menu": "대표 점심 메뉴",
  "price": 9000,                      // 점심 대표가 (12000 이내 권장)
  "rating": 4.5,
  "walk": "6번출구 도보 4분 · 약 250m",
  "exit": "6",                        // 가까운 출구
  "note": "한 줄 소개"
}
```

새 카테고리가 필요하면 `categories`에 `key/label/hex/em`을 추가하세요. 칩·릴·색이 자동 반영됩니다.

---

## 참고
- 식당 정보는 네이버·구글지도 공개 정보를 기반으로 큐레이션했습니다. 가격·메뉴·영업시간은 매장 사정에 따라 달라질 수 있습니다.
- 폰트: Black Han Sans + Noto Sans KR (Google Fonts)

---

## 👥 팀 공유 기능 (Supabase 연결 시 활성화)

`config.js`에 Supabase 키를 채우면 상단에 **🎲 룰렛 / ⭐ 즐겨찾기 / 📅 우리팀 기록** 탭이 나타납니다.

### 어떻게 동작하나
- **닉네임 방식** — 첫 진입 시 자동 닉네임이 생기고, 우측 상단 `👤` 를 눌러 바꿀 수 있습니다. (브라우저 `localStorage`에 저장)
- **⭐ 즐겨찾기** — 결과 카드의 별을 누르면 팀 즐겨찾기에 등록됩니다. 즐겨찾기 탭에서 **팀 전체 인기 순위**로 보입니다.
- **🍽 여기서 먹었어요** — 누르면 "오늘 먹은 곳"으로 기록됩니다. 기록 탭에서 **최근 7일간 누가 뭘 먹었는지** 날짜별로 모아 보여줍니다. (룰렛/지정 출처도 표시)
- **최근 7일 내 내가 먹은 곳 빼기** — 룰렛 탭의 토글을 켜면 최근에 먹은 곳을 후보에서 제외해, 매일 다른 메뉴가 나오게 합니다.
- 김밥집·라멘집 리스트의 각 항목에 `⭐n`(팀 즐겨찾기) `🍽n`(최근 14일 방문) 배지가 붙습니다.

### 데이터 모델
- `lunch_favorites (restaurant_id, member)` — 식당×닉네임 유니크
- `lunch_log (restaurant_id, member, ate_on, source)` — 하루 1회 유니크
- 둘 다 `supabase/schema.sql` 안에 테이블·RLS가 포함돼 있습니다. **schema.sql만 다시 Run** 하면 추가됩니다. (식당 데이터 `seed.sql`은 그대로)

### 보안 메모
- RLS로 `lunch_restaurants`/`lunch_categories`는 **읽기 전용**입니다.
- `lunch_favorites`/`lunch_log`는 팀 내부용이라 anon 키로 **읽기/쓰기**를 허용합니다(닉네임 길이 검증 포함). 외부에 URL이 공개되는 환경이라면, Supabase Auth(매직링크 등)로 바꿔 `member`를 `auth.uid()`에 묶는 것을 권장합니다 — 이 경우 정책의 `with check`를 `auth.uid() is not null` 형태로 바꾸면 됩니다.

---

## 🆕 v2 추가 기능

### 🏆 주간 베스트 카드
룰렛 탭 맨 위에 **이번 주(월요일~오늘) 우리 팀이 가장 많이 간 집**이 자동으로 카드로 뜹니다. 방문 횟수와 다녀온 팀원 수를 보여주고, 카드를 누르면 바로 그 식당 결과로 이동합니다. (`lunch_log` 집계, 기록이 있을 때만 표시)

### ➕ 팀원이 식당 직접 추가 (네이버 지도)
룰렛 탭의 **➕ 식당 추가** 버튼으로 상호명·카테고리·메뉴·가격·주소·소개를 입력해 팀 공용 리스트에 식당을 추가할 수 있습니다.
- **네이버에서 찾기** 버튼을 누르면 상호명으로 네이버 지도가 새 탭에서 열립니다. 거기서 도로명 주소를 복사해 주소칸에 붙여넣으면, 결과 카드의 네이버지도·카카오맵 링크가 그 주소로 정확히 연결됩니다.
- 추가한 식당은 `added_by`(닉네임)와 `address`가 함께 저장됩니다. 기존 시드 식당(`added_by IS NULL`)은 RLS로 보호되어 수정/삭제되지 않고, 사용자 추가 식당만 삭제가 허용됩니다.
- 스키마가 바뀌었으니 **`supabase/schema.sql`을 다시 한 번 Run** 하세요. (`add column if not exists` / `create policy` 라서 여러 번 실행해도 안전)
