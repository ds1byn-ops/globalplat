// 강남역 점심 룰렛 · 설정 파일
//
// 사용법:
//   1) 이 파일을 'config.js' 로 복사하세요.   (cp config.example.js config.js)
//   2) Supabase 프로젝트 > Settings > API 에서 값을 복사해 채우세요.
//      - URL          : Project URL
//      - ANON KEY     : anon / public (publishable) key  ← 공개돼도 안전한 키입니다
//   3) 값을 비워두면(또는 파일이 없으면) data/restaurants.json 으로 동작합니다.
//
// 주의: service_role key 는 절대 여기에 넣지 마세요. anon key 만 사용합니다.

window.LUNCH_CONFIG = {
  SUPABASE_URL: "",       // 예: "https://xxxxxxxx.supabase.co"
  SUPABASE_ANON_KEY: "",  // 예: "eyJhbGciOi..."
};
