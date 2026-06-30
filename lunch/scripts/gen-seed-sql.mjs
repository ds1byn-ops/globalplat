// data/restaurants.json → supabase/seed.sql 재생성
//   node scripts/gen-seed-sql.mjs
import { readFileSync, writeFileSync } from "node:fs";

const d = JSON.parse(readFileSync(new URL("../data/restaurants.json", import.meta.url)));
const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);

let out = `-- 강남역 점심 룰렛 · 시드 데이터 (data/restaurants.json 에서 자동 생성)
-- supabase/schema.sql 을 먼저 실행한 뒤, 이 파일을 SQL Editor 에 붙여넣고 Run 하세요.
-- 재실행해도 안전하도록 기존 데이터를 비우고 다시 채웁니다.

truncate table public.lunch_restaurants restart identity;
delete from public.lunch_categories;

insert into public.lunch_categories (key,label,hex,em,sort) values
`;
out += Object.entries(d.categories)
  .map(([k, c], i) => `  (${q(k)}, ${q(c.label)}, ${q(c.hex)}, ${q(c.em)}, ${i})`)
  .join(",\n") + ";\n\n";

out += `insert into public.lunch_restaurants (name,category,menu,price,rating,walk,exit,note) values\n`;
out += d.restaurants
  .map((r) => `  (${q(r.name)}, ${q(r.category)}, ${q(r.menu)}, ${r.price}, ${r.rating}, ${q(r.walk)}, ${q(r.exit)}, ${q(r.note)})`)
  .join(",\n") + ";\n";

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out);
console.log(`seed.sql 재생성 완료 · 식당 ${d.restaurants.length}건`);
