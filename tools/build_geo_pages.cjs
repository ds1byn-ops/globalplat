// GEO(AI 검색 노출)용 정적 페이지 생성기 — followkorea.kr / gnfollow.com 공용 레포
// 실행: node tools/build_geo_pages.cjs   (병원 추가·FAQ 수정 후 다시 실행해 커밋)
// 입력: index.html 안의 HOSPS·FK_FAQ_PAGE + DB의 "메인 노출" 동적 병원
// 출력: info/(followkorea.kr용 외국어 페이지), cn/(gnfollow.com용 중문 페이지), sitemap·llms·robots
// 환자 대상 페이지는 한국어판을 만들지 않는다 — 외국인환자 유치 광고의 국내 노출 금지(의료해외진출법 제15조).
// gnfollow.com(중국)은 가격·효과 언급 금지 원칙에 따라 가격·회복기간 문항을 뺀다.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

// 회사 정보는 여기 한 곳에서만 관리 (법인·등록번호 변경 시 이 블록만 고치고 재실행)
const ORG = {
  nameEn: 'Follow Korea Co., Ltd.',
  nameKo: '주식회사 팔로우코리아',
  nameZh: 'Follow Korea（株式会社 팔로우코리아）',
  regNo: 'A-2026-01-01-06622',
  regPeriod: '2026.01.21–2029.01.20',
  travelNo: '2026-000022',
  addrEn: '13F-116, 373 Gangnam-daero, Seocho-gu, Seoul, Republic of Korea',
  street: '373 Gangnam-daero, 13F-116',
  email: 'contact@followkorea.co.kr',
  corp: 'https://followkorea.co.kr/',
  line: 'followkorea_kr', whatsapp: 'Followkorea', wechat: 'Followkorea2',
  xhs: 'Followkorea_kr', douyin: 'Followkorea1',
  kakao: 'https://pf.kakao.com/_xfZxjiX',
};

function grab(name) {
  const re = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*\\[');
  const m = re.exec(SRC);
  if (!m) throw new Error('not found ' + name);
  const st = m.index + m[0].length - 1;
  let d = 0, j = st;
  for (; j < SRC.length; j++) {
    const c = SRC[j];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; j++;
      while (j < SRC.length && SRC[j] !== q) { if (SRC.charCodeAt(j) === 92) j++; j++; }
      continue;
    }
    if (c === '[' || c === '{') d++;
    else if (c === ']' || c === '}') { d--; if (d === 0) break; }
  }
  return eval('(' + SRC.slice(st, j + 1) + ')');
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl2br = (s) => esc(s).split('\n').join('<br>');
const jsonld = (o) => '<script type="application/ld+json">' + JSON.stringify(o).split('</').join('<\\/') + '</script>';

const CAT = {
  '검진': { en: 'Health Checkup', zh: '健康体检' },
  '피부·성형': { en: 'Dermatology & Plastic Surgery', zh: '皮肤·整形' },
  '줄기세포': { en: 'Stem Cell', zh: '干细胞' },
  '항노화': { en: 'Anti-aging', zh: '抗衰老' },
  '체형': { en: 'Body Contouring', zh: '体型管理' },
  '여성의학': { en: "Women's Health", zh: '女性医学' },
  '안과': { en: 'Ophthalmology', zh: '眼科' },
  '한방': { en: 'Korean Medicine', zh: '韩医' },
  '치과': { en: 'Dental', zh: '牙科' },
  '신경과': { en: 'Neurology', zh: '神经内科' },
  '정형·척추': { en: 'Orthopedics & Spine', zh: '骨科·脊柱' },
  '다이어트': { en: 'Weight Management', zh: '体重管理' },
};
const CAT_ORDER = Object.keys(CAT);
const CN_BANNED = /效果|价格|费用|[0-9]+元|前后对比|治愈|根治|最佳|第一|最好|最先进|保证/;
const LOC = {
  loc_gangnam: { en: 'Gangnam, Seoul', zh: '首尔江南' },
  loc_sinsa: { en: 'Sinsa, Gangnam, Seoul', zh: '首尔江南·新沙' },
  loc_apgujeong: { en: 'Apgujeong, Seoul', zh: '首尔狎鸥亭' },
  loc_myeongdong: { en: 'Myeongdong, Seoul', zh: '首尔明洞' },
  loc_yaksu: { en: 'Yaksu, Jung-gu, Seoul', zh: '首尔中区·药水' },
  loc_seongsu: { en: 'Seongsu, Seoul', zh: '首尔圣水' },
  loc_jongno: { en: 'Jongno, Seoul', zh: '首尔钟路' },
  loc_bucheon: { en: 'Yeokgok, Bucheon (Gyeonggi)', zh: '京畿富川·驿谷' },
};

// ───────── 데이터 ─────────
async function loadHospitals() {
  const list = grab('HOSPS').map((h) => ({ ...h }));
  const supaUrl = (SRC.match(/const SUPA_URL='([^']+)'/) || [])[1];
  const supaKey = (SRC.match(/const SUPA_KEY='([^']+)'/) || [])[1];
  if (supaUrl && supaKey) {
    try {
      const r = await fetch(supaUrl + '/rest/v1/hospitals?select=id,name,display&show_on_main=eq.true&order=id.asc', {
        headers: { apikey: supaKey, Authorization: 'Bearer ' + supaKey },
      });
      const rows = await r.json();
      if (Array.isArray(rows)) rows.forEach((row) => {
        const d = row.display || {};
        if (!d.name_zh && !d.name_en) return;
        if (list.some((h) => h.kr === row.name)) return;
        list.push({
          kr: row.name, zh: d.name_zh || row.name, en: d.name_en || row.name,
          dept_zh: d.dept_zh || '', dept_en: d.dept_en || '', cat: d.cat || '기타서비스',
          treats_zh: d.treats_zh || [], treats_en: d.treats_en || [],
          hours: d.hours || '', loc: d.loc || 'loc_gangnam',
          overview_zh: d.overview_zh || '', overview_en: d.overview_en || '',
        });
      });
    } catch (e) { console.warn('동적 병원 로드 실패(정적 데이터만 사용):', e.message); }
  }
  // 의료기관만 (스튜디오·헤어 등 기타서비스 제외), 이름 중복 제거
  const seen = new Set();
  return list.filter((h) => {
    const main = String(h.cat || '').split('/')[0];
    if (!CAT[main]) return false;
    if (seen.has(h.kr)) return false;
    seen.add(h.kr);
    return true;
  });
}

const FAQ_LANGS = ['en', 'zh', 'ja', 'vi', 'th', 'ru', 'mn', 'id'];
const EXTRA_FAQ = [
  {
    key: 'license',
    q: {
      en: 'Is Follow Korea a licensed agency?',
      zh: 'Follow Korea 是正规登记的机构吗？',
      ja: 'Follow Koreaは正式に登録された事業者ですか？',
      vi: 'Follow Korea có phải là đơn vị được cấp phép không?',
      th: 'Follow Korea เป็นบริษัทที่ได้รับอนุญาตหรือไม่',
      ru: 'Является ли Follow Korea лицензированным агентством?',
      mn: 'Follow Korea нь албан ёсны бүртгэлтэй байгууллага мөн үү?',
      id: 'Apakah Follow Korea agen resmi berizin?',
    },
    a: {
      en: `Yes. ${ORG.nameEn} is registered with Korea's Ministry of Health and Welfare as a foreign patient attraction agency (Reg. No. ${ORG.regNo}) and holds a general travel agency license (No. ${ORG.travelNo}). We refer patients only to licensed medical institutions in Korea.`,
      zh: `是的。Follow Korea 已在韩国保健福祉部登记为外国患者招揽机构（登记号 ${ORG.regNo}），并持有综合旅行业执照（第 ${ORG.travelNo} 号）。我们只对接韩国正规医疗机构。`,
      ja: `はい。株式会社Follow Koreaは韓国保健福祉部に外国人患者誘致事業者として登録されており（登録番号 ${ORG.regNo}）、総合旅行業（第${ORG.travelNo}号）の登録も行っています。ご案内先は韓国の正規医療機関のみです。`,
      vi: `Có. Công ty Follow Korea đã đăng ký với Bộ Y tế và Phúc lợi Hàn Quốc là đơn vị thu hút bệnh nhân nước ngoài (số đăng ký ${ORG.regNo}) và có giấy phép kinh doanh lữ hành tổng hợp (số ${ORG.travelNo}). Chúng tôi chỉ giới thiệu đến các cơ sở y tế hợp pháp tại Hàn Quốc.`,
      th: `ใช่ บริษัท Follow Korea จดทะเบียนกับกระทรวงสาธารณสุขและสวัสดิการเกาหลีเป็นผู้ประกอบการจัดหาผู้ป่วยต่างชาติ (เลขทะเบียน ${ORG.regNo}) และมีใบอนุญาตธุรกิจนำเที่ยว (เลขที่ ${ORG.travelNo}) เราแนะนำเฉพาะสถานพยาบาลที่ได้รับอนุญาตในเกาหลีเท่านั้น`,
      ru: `Да. Компания Follow Korea зарегистрирована Министерством здравоохранения и социального обеспечения Кореи как агентство по привлечению иностранных пациентов (рег. № ${ORG.regNo}) и имеет лицензию туроператора (№ ${ORG.travelNo}). Мы направляем пациентов только в лицензированные медицинские учреждения Кореи.`,
      mn: `Тийм. Follow Korea компани нь Солонгосын Эрүүл мэнд, нийгмийн хамгааллын яаманд гадаад өвчтөн татах байгууллагаар бүртгэлтэй (бүртгэлийн дугаар ${ORG.regNo}) бөгөөд аялал жуулчлалын тусгай зөвшөөрөлтэй (№ ${ORG.travelNo}). Бид зөвхөн Солонгосын албан ёсны эмнэлгүүдтэй холбож өгдөг.`,
      id: `Ya. ${ORG.nameEn} terdaftar di Kementerian Kesehatan dan Kesejahteraan Korea sebagai agen penarik pasien asing (No. Reg. ${ORG.regNo}) dan memiliki izin biro perjalanan umum (No. ${ORG.travelNo}). Kami hanya merujuk ke fasilitas medis berizin di Korea.`,
    },
  },
  {
    key: 'start',
    q: {
      en: 'How do I start a consultation?',
      zh: '如何开始咨询？',
      ja: '相談はどうやって始めればよいですか？',
      vi: 'Làm thế nào để bắt đầu tư vấn?',
      th: 'เริ่มปรึกษาได้อย่างไร',
      ru: 'Как начать консультацию?',
      mn: 'Зөвлөгөө авахыг хэрхэн эхлэх вэ?',
      id: 'Bagaimana cara memulai konsultasi?',
    },
    a: {
      en: `Use the consultation button on followkorea.kr, or message us on WhatsApp (${ORG.whatsapp}), LINE (${ORG.line}) or WeChat (${ORG.wechat}). A coordinator replies within 24 hours in your language and helps you compare partner clinics, schedule visits and arrange interpretation.`,
      zh: `请点击网站上的咨询按钮，或通过微信（${ORG.wechat}）、LINE（${ORG.line}）、WhatsApp（${ORG.whatsapp}）联系我们。专属顾问会在24小时内用您的语言回复，协助比较合作医院、安排就诊日程及翻译陪同。`,
      ja: `followkorea.kr の相談ボタン、または LINE（${ORG.line}）・WhatsApp（${ORG.whatsapp}）・WeChat（${ORG.wechat}）からご連絡ください。コーディネーターが24時間以内にお客様の言語で返信し、提携医療機関の比較、来院日程の調整、通訳の手配をお手伝いします。`,
      vi: `Hãy bấm nút tư vấn trên followkorea.kr hoặc nhắn tin qua WhatsApp (${ORG.whatsapp}), LINE (${ORG.line}), WeChat (${ORG.wechat}). Điều phối viên sẽ trả lời bằng ngôn ngữ của bạn trong vòng 24 giờ và hỗ trợ so sánh phòng khám đối tác, sắp xếp lịch hẹn và phiên dịch.`,
      th: `กดปุ่มปรึกษาบน followkorea.kr หรือส่งข้อความผ่าน WhatsApp (${ORG.whatsapp}), LINE (${ORG.line}) หรือ WeChat (${ORG.wechat}) ผู้ประสานงานจะตอบกลับเป็นภาษาของคุณภายใน 24 ชั่วโมง และช่วยเปรียบเทียบคลินิกพันธมิตร นัดหมาย และจัดล่ามให้`,
      ru: `Нажмите кнопку консультации на followkorea.kr или напишите нам в WhatsApp (${ORG.whatsapp}), LINE (${ORG.line}) или WeChat (${ORG.wechat}). Координатор ответит на вашем языке в течение 24 часов и поможет сравнить клиники-партнёры, записаться на приём и организовать перевод.`,
      mn: `followkorea.kr сайтын зөвлөгөөний товч, эсвэл WhatsApp (${ORG.whatsapp}), LINE (${ORG.line}), WeChat (${ORG.wechat})-аар бидэнтэй холбогдоорой. Зохицуулагч 24 цагийн дотор таны хэлээр хариулж, хамтрагч эмнэлгүүдийг харьцуулах, цаг товлох, орчуулга зохион байгуулахад тусална.`,
      id: `Klik tombol konsultasi di followkorea.kr atau kirim pesan melalui WhatsApp (${ORG.whatsapp}), LINE (${ORG.line}), atau WeChat (${ORG.wechat}). Koordinator akan membalas dalam bahasa Anda dalam 24 jam dan membantu membandingkan klinik mitra, menjadwalkan kunjungan, serta mengatur penerjemah.`,
    },
  },
];

const UI = {
  en: { faqTitle: 'FAQ – Medical trip to Seoul, Korea | Follow Korea', faqH1: 'Frequently Asked Questions', faqIntro: 'Answers to common questions from international patients planning medical care in Seoul, Korea. Follow Korea is a government-registered foreign patient attraction agency connecting you with partner clinics in Gangnam and across Seoul.', clinics: 'Partner clinic directory', cta: 'Get a free consultation', faqLink: 'FAQ' },
  zh: { faqTitle: '常见问题 – 赴韩国首尔就医 | Follow Korea', faqH1: '常见问题', faqIntro: '为计划赴韩国首尔就医的海外顾客整理的常见问题。Follow Korea 是韩国政府登记的外国患者招揽机构，为您对接首尔江南等地的合作医疗机构。', clinics: '合作医院一览', cta: '免费咨询', faqLink: '常见问题' },
  ja: { faqTitle: 'よくある質問 – 韓国・ソウルでの受診 | Follow Korea', faqH1: 'よくある質問', faqIntro: '韓国・ソウルでの受診を検討中の海外のお客様からよくいただくご質問です。Follow Koreaは韓国政府に登録された外国人患者誘致事業者で、江南をはじめソウルの提携医療機関をご案内します。', clinics: '提携医療機関一覧（英語）', cta: '無料相談', faqLink: 'よくある質問' },
  vi: { faqTitle: 'Câu hỏi thường gặp – Khám chữa bệnh tại Seoul | Follow Korea', faqH1: 'Câu hỏi thường gặp', faqIntro: 'Giải đáp các câu hỏi thường gặp của khách quốc tế đang có kế hoạch khám chữa bệnh tại Seoul, Hàn Quốc. Follow Korea là đơn vị thu hút bệnh nhân nước ngoài đã đăng ký với chính phủ Hàn Quốc, kết nối bạn với các phòng khám đối tác tại Gangnam và Seoul.', clinics: 'Danh sách phòng khám đối tác (tiếng Anh)', cta: 'Tư vấn miễn phí', faqLink: 'Câu hỏi thường gặp' },
  th: { faqTitle: 'คำถามที่พบบ่อย – รับบริการทางการแพทย์ในโซล | Follow Korea', faqH1: 'คำถามที่พบบ่อย', faqIntro: 'คำถามที่พบบ่อยจากผู้ป่วยต่างชาติที่วางแผนรับบริการทางการแพทย์ในกรุงโซล เกาหลีใต้ Follow Korea เป็นผู้ประกอบการจัดหาผู้ป่วยต่างชาติที่จดทะเบียนกับรัฐบาลเกาหลี และเชื่อมต่อคุณกับคลินิกพันธมิตรในกังนัมและทั่วโซล', clinics: 'รายชื่อคลินิกพันธมิตร (ภาษาอังกฤษ)', cta: 'ปรึกษาฟรี', faqLink: 'คำถามที่พบบ่อย' },
  ru: { faqTitle: 'Частые вопросы – лечение в Сеуле | Follow Korea', faqH1: 'Частые вопросы', faqIntro: 'Ответы на частые вопросы иностранных пациентов, планирующих лечение в Сеуле. Follow Korea — зарегистрированное правительством Кореи агентство по привлечению иностранных пациентов, которое подберёт клинику-партнёра в Каннаме и других районах Сеула.', clinics: 'Клиники-партнёры (англ.)', cta: 'Бесплатная консультация', faqLink: 'Частые вопросы' },
  mn: { faqTitle: 'Түгээмэл асуулт – Сөүлд эмчлүүлэх | Follow Korea', faqH1: 'Түгээмэл асуулт', faqIntro: 'Солонгосын Сөүл хотод эмчлүүлэхээр төлөвлөж буй гадаадын үйлчлүүлэгчдийн түгээмэл асуултын хариулт. Follow Korea нь Солонгосын засгийн газарт бүртгэлтэй гадаад өвчтөн татах байгууллага бөгөөд Каннам болон Сөүлийн хамтрагч эмнэлгүүдтэй холбож өгнө.', clinics: 'Хамтрагч эмнэлгүүд (англи)', cta: 'Үнэгүй зөвлөгөө', faqLink: 'Түгээмэл асуулт' },
  id: { faqTitle: 'FAQ – Perawatan medis di Seoul, Korea | Follow Korea', faqH1: 'Pertanyaan Umum', faqIntro: 'Jawaban atas pertanyaan umum dari pasien internasional yang merencanakan perawatan medis di Seoul, Korea. Follow Korea adalah agen penarik pasien asing yang terdaftar di pemerintah Korea dan menghubungkan Anda dengan klinik mitra di Gangnam dan seluruh Seoul.', clinics: 'Daftar klinik mitra (Inggris)', cta: 'Konsultasi gratis', faqLink: 'Pertanyaan Umum' },
};
const LANG_NAME = { en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ไทย', ru: 'Русский', mn: 'Монгол', id: 'Bahasa Indonesia' };
const HTML_LANG = { en: 'en', zh: 'zh-CN', ja: 'ja', vi: 'vi', th: 'th', ru: 'ru', mn: 'mn', id: 'id' };

// ───────── 공통 레이아웃 ─────────
const CSS = `*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR','Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;color:#1f2937;background:#f7f8fa;line-height:1.7}
a{color:#1f4f9c}header,main,footer{max-width:860px;margin:0 auto;padding:0 20px}header{padding-top:22px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.brand{font-weight:800;font-size:18px;text-decoration:none;color:#0f2148}.cta{background:#0f2148;color:#fff;text-decoration:none;padding:9px 16px;border-radius:10px;font-weight:700;font-size:14px}
h1{font-size:28px;line-height:1.3;margin:28px 0 8px}h2{font-size:20px;margin:34px 0 10px;padding-top:6px;border-top:2px solid #e5e7eb}h3{font-size:17px;margin:0 0 4px}
.intro{color:#4b5563}.langs{font-size:13px;margin:10px 0 0;color:#6b7280}.langs a{margin-right:10px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:12px 0}.meta{font-size:13px;color:#6b7280;margin-bottom:6px}
.tags{font-size:13px;color:#374151;margin:6px 0}.qa{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 18px;margin:12px 0}.qa h2{border:0;margin:0 0 6px;padding:0;font-size:17px}
footer{font-size:12.5px;color:#6b7280;padding:36px 20px 48px;margin-top:30px;border-top:1px solid #e5e7eb}`;

function page({ lang, title, desc, canonical, alternates = [], brandName, homeUrl, ctaText, body, ld }) {
  const alt = alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`).join('\n');
  return `<!doctype html>
<html lang="${HTML_LANG[lang] || lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
${alt}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://followkorea.co.kr/og-image.png">
<style>${CSS}</style>
${ld.map(jsonld).join('\n')}
</head>
<body>
<header><a class="brand" href="${homeUrl}">${esc(brandName)}</a><a class="cta" href="${homeUrl}">${esc(ctaText)}</a></header>
<main>
${body}
</main>
<footer>
${esc(ORG.nameEn)} · Foreign Patient Attraction Agency Reg. No. ${ORG.regNo} (${ORG.regPeriod}) · General Travel Agency No. ${ORG.travelNo}<br>
${esc(ORG.addrEn)} · <a href="mailto:${ORG.email}">${ORG.email}</a> · <a href="${ORG.corp}">followkorea.co.kr</a><br>
LINE ${ORG.line} · WhatsApp ${ORG.whatsapp} · WeChat ${ORG.wechat} · 小红书 ${ORG.xhs}<br>
Updated ${TODAY}
</footer>
</body>
</html>
`;
}

function orgLd(siteUrl, brand) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'TravelAgency'],
    '@id': ORG.corp + '#org',
    name: ORG.nameEn,
    alternateName: [ORG.nameKo, '팔로우코리아', brand, 'Gangnam Follow', '江南FOLLOW'],
    url: ORG.corp,
    email: ORG.email,
    logo: 'https://followkorea.co.kr/fk-logo-r.png',
    address: { '@type': 'PostalAddress', streetAddress: ORG.street, addressLocality: 'Seocho-gu', addressRegion: 'Seoul', addressCountry: 'KR' },
    areaServed: 'Worldwide',
    identifier: [
      { '@type': 'PropertyValue', name: 'Foreign Patient Attraction Agency Registration (Ministry of Health and Welfare, Korea)', value: ORG.regNo },
      { '@type': 'PropertyValue', name: 'General Travel Agency Registration', value: ORG.travelNo },
    ],
    sameAs: [ORG.corp, 'https://followkorea.kr/', 'https://gnfollow.com/', ORG.kakao, 'https://www.xiaohongshu.com/user/profile/' + ORG.xhs],
    subjectOf: siteUrl,
  };
}

// ───────── 병원 목록 페이지 ─────────
function clinicsPage({ lang, site, base, hosps, alternates }) {
  const isZh = lang === 'zh';
  const brand = site === 'gnfollow' ? '江南FOLLOW' : (isZh ? '江南FOLLOW · Follow Korea' : 'Gangnam Follow · Follow Korea');
  const homeUrl = base + '/';
  const canonical = site === 'gnfollow' ? base + '/cn/clinics.html' : `${base}/info/clinics-${lang}.html`;
  const groups = {};
  hosps.forEach((h) => { const c = String(h.cat).split('/')[0]; (groups[c] = groups[c] || []).push(h); });
  const cats = CAT_ORDER.filter((c) => groups[c]);
  const n = hosps.length;
  const title = isZh
    ? `韩国首尔合作医院一览（${n}家）| ${site === 'gnfollow' ? '江南FOLLOW' : 'Follow Korea'}`
    : `Partner clinics in Seoul, Korea (${n}) – Gangnam dermatology, plastic surgery & health checkups | Follow Korea`;
  const intro = isZh
    ? `以下是 Follow Korea（韩国政府登记外国患者招揽机构，登记号 ${ORG.regNo}）合作的 ${n} 家韩国医疗机构，主要位于首尔江南一带，涵盖${cats.map((c) => CAT[c].zh).join('、')}等领域。可提供中文咨询、预约协调及翻译陪同。`
    : `These are the ${n} licensed medical institutions in Korea that partner with Follow Korea, a foreign patient attraction agency registered with Korea's Ministry of Health and Welfare (Reg. No. ${ORG.regNo}). Most are in Gangnam, Seoul, covering ${cats.map((c) => CAT[c].en).join(', ')}. Follow Korea provides multilingual consultation, appointment coordination and medical interpretation.`;
  let body = `<h1>${isZh ? '韩国首尔合作医院一览' : 'Partner Clinics in Seoul, Korea'}</h1>\n<p class="intro">${esc(intro)}</p>\n`;
  if (alternates.length > 1) body += `<p class="langs">${alternates.filter((a) => a.hreflang !== 'x-default').map((a) => `<a href="${a.href}">${LANG_NAME[a.hreflang.slice(0, 2)] || a.hreflang}</a>`).join('')}</p>\n`;
  const items = [];
  cats.forEach((c) => {
    body += `<h2>${esc(isZh ? CAT[c].zh : CAT[c].en)}</h2>\n`;
    groups[c].forEach((h) => {
      const name = isZh ? h.zh : h.en;
      const other = isZh ? h.en : h.zh;
      const dept = isZh ? h.dept_zh : h.dept_en;
      const treats = ((isZh ? h.treats_zh : h.treats_en) || []).filter((t) => site !== 'gnfollow' || !CN_BANNED.test(t));
      let ov = isZh ? h.overview_zh : h.overview_en;
      // 중국 광고법: 효과·가격·최상급 표현이 든 문장은 gnfollow 페이지에서 제외
      if (site === 'gnfollow' && ov) ov = ov.split('。').filter((s) => s && !CN_BANNED.test(s)).join('。') + (ov.endsWith('。') ? '' : '');
      if (site === 'gnfollow' && ov && !ov.endsWith('。')) ov += '。';
      const loc = (LOC[h.loc] || LOC.loc_gangnam)[isZh ? 'zh' : 'en'];
      body += `<div class="card"><h3>${esc(name)}</h3><div class="meta">${esc(other)} · ${esc(loc)}${dept ? ' · ' + esc(dept) : ''}</div>`;
      if (treats.length) body += `<div class="tags">${isZh ? '主要项目' : 'Main services'}: ${esc(treats.join(' · '))}</div>`;
      if (ov) body += `<p>${esc(ov)}</p>`;
      if (h.hours) body += `<div class="meta">${isZh ? '营业时间' : 'Hours'}: ${esc(h.hours)}</div>`;
      body += `</div>\n`;
      items.push({
        '@type': 'MedicalClinic',
        name, alternateName: [other, h.kr].filter(Boolean),
        description: ov || dept || undefined,
        medicalSpecialty: isZh ? CAT[c].zh : CAT[c].en,
        address: { '@type': 'PostalAddress', addressLocality: loc, addressCountry: 'KR' },
      });
    });
  });
  body += `<p><a class="cta" href="${homeUrl}">${isZh ? '免费咨询' : 'Get a free consultation'}</a></p>`;
  const ld = [
    orgLd(base, brand),
    { '@context': 'https://schema.org', '@type': 'ItemList', name: title, numberOfItems: n,
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, item: it })) },
  ];
  return page({ lang, title, desc: intro.slice(0, 155), canonical, alternates, brandName: brand, homeUrl, ctaText: isZh ? '免费咨询' : 'Free consultation', body, ld });
}

// ───────── FAQ 페이지 ─────────
function faqPage({ lang, site, base, faq, alternates }) {
  const ui = UI[lang];
  const brand = site === 'gnfollow' ? '江南FOLLOW' : (lang === 'zh' ? '江南FOLLOW · Follow Korea' : 'Gangnam Follow · Follow Korea');
  const homeUrl = base + '/';
  const canonical = site === 'gnfollow' ? base + '/cn/faq.html' : `${base}/info/faq-${lang}.html`;
  const clinicsUrl = site === 'gnfollow' ? base + '/cn/clinics.html' : `${base}/info/clinics-${lang === 'zh' ? 'zh' : 'en'}.html`;
  let body = `<h1>${esc(ui.faqH1)}</h1>\n<p class="intro">${esc(ui.faqIntro)}</p>\n`;
  if (alternates.length > 1) body += `<p class="langs">${alternates.filter((a) => a.hreflang !== 'x-default').map((a) => `<a href="${a.href}">${LANG_NAME[a.hreflang.slice(0, 2)] || a.hreflang}</a>`).join('')}</p>\n`;
  const qa = [];
  faq.forEach((f) => {
    const q = f.q[lang] || f.q.en; const a = f.a[lang] || f.a.en;
    if (!q || !a) return;
    body += `<section class="qa"><h2>${esc(q)}</h2><p>${nl2br(a)}</p></section>\n`;
    qa.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
  });
  body += `<p><a href="${clinicsUrl}">${esc(ui.clinics)}</a> · <a class="cta" href="${homeUrl}">${esc(ui.cta)}</a></p>`;
  const ld = [orgLd(base, brand), { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: HTML_LANG[lang], mainEntity: qa }];
  return page({ lang, title: ui.faqTitle.replace('Follow Korea', site === 'gnfollow' ? '江南FOLLOW' : 'Follow Korea'), desc: ui.faqIntro.slice(0, 155), canonical, alternates, brandName: brand, homeUrl, ctaText: ui.cta, body, ld });
}

function write(rel, content) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  console.log('  wrote', rel);
}

(async () => {
  const hosps = await loadHospitals();
  const baseFaq = grab('FK_FAQ_PAGE').map((f) => ({ ...f, a: { ...f.a, zh: String(f.a.zh || '').split('기타 서비스(其他服务)').join('其他服务') } }));
  console.log('병원', hosps.length, '곳 / FAQ', baseFaq.length, '문항');

  // ── followkorea.kr (글로벌, 외국어 전용) ──
  const FK = 'https://followkorea.kr';
  const faqAll = [...baseFaq, ...EXTRA_FAQ];
  const faqAlt = [...FAQ_LANGS.map((l) => ({ hreflang: HTML_LANG[l] === 'zh-CN' ? 'zh' : l, href: `${FK}/info/faq-${l}.html` })), { hreflang: 'x-default', href: `${FK}/info/faq-en.html` }];
  FAQ_LANGS.forEach((l) => write(`info/faq-${l}.html`, faqPage({ lang: l, site: 'followkorea', base: FK, faq: faqAll, alternates: faqAlt })));
  const clinicAlt = [{ hreflang: 'en', href: `${FK}/info/clinics-en.html` }, { hreflang: 'zh', href: `${FK}/info/clinics-zh.html` }, { hreflang: 'x-default', href: `${FK}/info/clinics-en.html` }];
  ['en', 'zh'].forEach((l) => write(`info/clinics-${l}.html`, clinicsPage({ lang: l, site: 'followkorea', base: FK, hosps, alternates: clinicAlt })));

  // ── gnfollow.com (중국어 전용, 가격·회복기간 문항 제외) ──
  const GN = 'https://gnfollow.com';
  const priceRe = /费用|价格|价钱|元|恢复期|恢复时间|效果|前后对比/;
  const faqCn = faqAll.filter((f) => !priceRe.test(f.q.zh || '') && !/비용|회복/.test(f.q.ko || ''))
    .map((f) => (f.key === 'start' ? { ...f, a: { zh: `请点击 gnfollow.com 上的咨询按钮，或通过微信（${ORG.wechat}）、小红书（${ORG.xhs}）联系我们。专属顾问会在24小时内用中文回复，协助比较合作医院、安排就诊日程及翻译陪同。` } } : f))
    .map((f) => ({ ...f, a: { ...f.a, zh: String(f.a.zh || '').replace(/方案和价格|方案与价格/g, '方案与日程').replace(/(和|与|及)价格/g, '') } }));
  write('cn/faq.html', faqPage({ lang: 'zh', site: 'gnfollow', base: GN, faq: faqCn, alternates: [] }));
  write('cn/clinics.html', clinicsPage({ lang: 'zh', site: 'gnfollow', base: GN, hosps, alternates: [] }));
  console.log('  gnfollow FAQ', faqCn.length, '문항 (가격·회복 문항 제외)');

  // ── 사이트맵 ──
  const urlset = (urls) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod>${(u.alt || []).map((a) => `<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`;
  write('sitemap.xml', urlset([
    { loc: FK + '/' },
    ...FAQ_LANGS.map((l) => ({ loc: `${FK}/info/faq-${l}.html`, alt: faqAlt })),
    { loc: `${FK}/info/clinics-en.html`, alt: clinicAlt },
    { loc: `${FK}/info/clinics-zh.html`, alt: clinicAlt },
  ]));
  write('sitemap-gnfollow.xml', urlset([{ loc: GN + '/' }, { loc: GN + '/cn/faq.html' }, { loc: GN + '/cn/clinics.html' }]));

  // ── robots ── (followkorea.kr=GitHub Pages 기본 / gnfollow.com=Netlify가 robots-gnfollow.txt로 rewrite)
  const deny = ['/backoffice.html', '/hospital-portal.html', '/quote-view.html', '/aftercare.html', '/renewal-preview.html', '/lunch/'];
  write('robots.txt', `User-agent: *\nAllow: /\n${deny.map((d) => 'Disallow: ' + d).join('\n')}\nDisallow: /cn/\n\nSitemap: ${FK}/sitemap.xml\n`);
  write('robots-gnfollow.txt', `User-agent: *\nAllow: /\n${deny.map((d) => 'Disallow: ' + d).join('\n')}\nDisallow: /info/\n\nSitemap: ${GN}/sitemap.xml\n`);

  // ── llms.txt ──
  const catsEn = CAT_ORDER.filter((c) => hosps.some((h) => String(h.cat).split('/')[0] === c)).map((c) => CAT[c].en);
  write('llms.txt', `# Gangnam Follow (followkorea.kr)

> Gangnam Follow is the international patient platform of ${ORG.nameEn}, a foreign patient attraction agency registered with Korea's Ministry of Health and Welfare (Reg. No. ${ORG.regNo}, valid ${ORG.regPeriod}; General Travel Agency No. ${ORG.travelNo}). It connects international patients with ${hosps.length} licensed partner clinics in Seoul, mostly in Gangnam, and provides multilingual consultation, appointment coordination, interpretation and concierge (airport pickup, accommodation guidance).

- Fields: ${catsEn.join(', ')}
- Consultation languages: Chinese, English, Japanese, Vietnamese, Thai, Russian, Mongolian, Indonesian and more
- Contact: WhatsApp ${ORG.whatsapp} · LINE ${ORG.line} · WeChat ${ORG.wechat} · ${ORG.email}
- Company: ${ORG.addrEn} · ${ORG.corp}

## Key pages
- [Partner clinic directory (English)](${FK}/info/clinics-en.html): all partner clinics with specialty, main services, area and hours
- [合作医院一览 (Chinese)](${FK}/info/clinics-zh.html)
- [FAQ (English)](${FK}/info/faq-en.html): booking steps, visas (C-3-3), interpretation, refunds, preparation, licensing
${FAQ_LANGS.filter((l) => l !== 'en').map((l) => `- [FAQ (${LANG_NAME[l]})](${FK}/info/faq-${l}.html)`).join('\n')}

## Notes
- Prices vary by clinic and procedure; quotes are provided individually after consultation.
- Follow Korea refers patients only to licensed medical institutions in Korea.
`);
  write('llms-gnfollow.txt', `# 江南FOLLOW (gnfollow.com)

> 江南FOLLOW 是韩国 ${ORG.nameEn}（韩国保健福祉部登记外国患者招揽机构，登记号 ${ORG.regNo}；综合旅行业 第${ORG.travelNo}号）面向中文用户的韩国医疗旅游服务平台，为顾客对接首尔江南等地 ${hosps.length} 家正规合作医疗机构，并提供中文咨询、预约协调、翻译陪同与接送等服务。

- 联系方式：微信 ${ORG.wechat} · 小红书 ${ORG.xhs} · 抖音 ${ORG.douyin} · ${ORG.email}
- 公司地址：${ORG.addrEn}

## 主要页面
- [合作医院一览](${GN}/cn/clinics.html)
- [常见问题](${GN}/cn/faq.html)：预约流程、签证、翻译陪同、退款、行前准备、机构资质
`);
  console.log('완료');
})();
