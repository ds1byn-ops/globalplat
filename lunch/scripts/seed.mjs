// data/restaurants.json → Supabase 업서트 스크립트
//
// 사용법:
//   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  node scripts/seed.mjs
//
// service_role key 는 Supabase > Settings > API 에서 확인. (절대 깃에 커밋하지 마세요)
// schema.sql 을 먼저 실행해 테이블이 있어야 합니다.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const data = JSON.parse(readFileSync(new URL("../data/restaurants.json", import.meta.url)));

const categories = Object.entries(data.categories).map(([key, c], i) => ({
  key, label: c.label, hex: c.hex, em: c.em, sort: i,
}));
const restaurants = data.restaurants.map((r) => ({
  name: r.name, category: r.category, menu: r.menu, price: r.price,
  rating: r.rating, walk: r.walk, exit: r.exit, note: r.note, active: true,
}));

const { error: ce } = await sb.from("lunch_categories").upsert(categories, { onConflict: "key" });
if (ce) { console.error("카테고리 업서트 실패:", ce.message); process.exit(1); }
console.log(`카테고리 ${categories.length}건 업서트 완료`);

// 식당은 이름이 유니크 키가 아니라, 전부 비우고 다시 넣습니다.
const { error: de } = await sb.from("lunch_restaurants").delete().neq("id", 0);
if (de) { console.error("기존 식당 삭제 실패:", de.message); process.exit(1); }
const { error: re } = await sb.from("lunch_restaurants").insert(restaurants);
if (re) { console.error("식당 삽입 실패:", re.message); process.exit(1); }
console.log(`식당 ${restaurants.length}건 삽입 완료 ✅`);
