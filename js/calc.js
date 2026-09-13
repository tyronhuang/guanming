// 命理計算核心：依賴 lunar.js（Solar/Lunar）、iztro.min.js、data/strokes.js、data/texts.js
(function (root) {
  'use strict';

  const GAN = '甲乙丙丁戊己庚辛壬癸';
  const ZHI = '子丑寅卯辰巳午未申酉戌亥';
  const ZODIAC = '鼠牛虎兔龍蛇馬羊猴雞狗豬';
  const WX = ['木', '火', '土', '金', '水'];
  const GAN_WX = '木木火火土土金金水水';
  const ZHI_WX = '水土木木土火火土金金土水';
  const T = () => root.TEXTS;

  // ── 五行生剋 ──
  const wxIdx = (w) => WX.indexOf(w);
  const shengOf = (w) => WX[(wxIdx(w) + 1) % 5]; // w 生 ?
  const keOf = (w) => WX[(wxIdx(w) + 2) % 5];    // w 剋 ?
  const shengBy = (w) => WX[(wxIdx(w) + 4) % 5]; // ? 生 w
  const keBy = (w) => WX[(wxIdx(w) + 3) % 5];    // ? 剋 w

  // ── 簡轉繁（lunar.js 輸出為簡體） ──
  let s2tMap = null;
  // lunar.js 用語中「本身也是繁體字」但應轉換的字（姓名不套用）
  const S2T_EXTRA = { '蜡': '蠟', '冲': '沖', '历': '曆', '后': '後', '于': '於', '挂': '掛', '种': '種', '余': '餘', '涂': '塗', '谷': '穀', '并': '並' };
  const PHRASE_FIX = [['理發', '理髮']];
  function loadS2T() {
    if (s2tMap) return s2tMap;
    s2tMap = {};
    const s = root.STROKE_DATA.s2t;
    for (let i = 0; i < s.length; i += 2) s2tMap[s[i]] = s[i + 1];
    return s2tMap;
  }
  function toTrad(str, extra = true) {
    if (str == null) return '';
    const m = loadS2T();
    let out = '';
    for (const ch of String(str)) out += (extra && S2T_EXTRA[ch]) || m[ch] || ch;
    if (extra) PHRASE_FIX.forEach(([a, b]) => { out = out.split(a).join(b); });
    return out;
  }
  const tt = (s) => toTrad(s);
  const nameChar = (ch) => toTrad(ch, false);

  // ── 西洋星座 ──
  function westernSign(month, day) {
    const list = T().western.filter((s) => !s.dup);
    const md = month * 100 + day;
    let sign = list[0];
    for (let i = 1; i < list.length; i++) {
      const f = list[i].from[0] * 100 + list[i].from[1];
      if (md >= f) sign = list[i];
    }
    if (md >= 1222) sign = list[0];
    return sign;
  }

  // ── 生命靈數 ──
  function lifePath(y, m, d) {
    const digits = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`.split('').map(Number);
    let n = digits.reduce((a, b) => a + b, 0);
    const chain = [n];
    while (n > 9) { n = String(n).split('').map(Number).reduce((a, b) => a + b, 0); chain.push(n); }
    return { number: n, chain, title: T().lifePath[n][0], text: T().lifePath[n][1] };
  }

  // ── 康熙筆畫 ──
  function kangxiStrokes(ch) {
    const d = root.STROKE_DATA;
    const cp = ch.codePointAt(0);
    const i = cp - d.start;
    return i >= 0 && i < d.kangxi.length ? d.kangxi[i] : 0;
  }
  const numWx = (n) => WX[Math.floor(((n % 10) + 9) % 10 / 2)]; // 1,2木 3,4火 5,6土 7,8金 9,0水
  function num81(n) {
    const k = ((n - 1) % 80) + 1;
    const [luck, title, text] = T().num81[k];
    return { n, k, luck, title, text };
  }

  function relation(a, b) { // a 對 b 的關係
    if (a === b) return 'same';
    if (shengOf(a) === b) return 'sheng';
    if (shengBy(a) === b) return 'shengBy';
    if (keOf(a) === b) return 'ke';
    return 'keBy';
  }

  // ── 姓名學（五格剖象） ──
  function nameology(surname, given) {
    const sur = [...surname.trim()].map(nameChar);
    const giv = [...given.trim()].map(nameChar);
    const chars = [...sur.map((c) => ({ c, part: '姓' })), ...giv.map((c) => ({ c, part: '名' }))];
    chars.forEach((o) => { o.strokes = kangxiStrokes(o.c); o.wx = o.strokes ? numWx(o.strokes) : '?'; });
    const bad = chars.filter((o) => !o.strokes).map((o) => o.c);
    if (!sur.length || !giv.length || bad.length) {
      return { error: bad.length ? `無法取得「${bad.join('')}」的筆畫，請輸入中文姓名。` : '請輸入完整姓名。' };
    }
    const s = chars.slice(0, sur.length).map((o) => o.strokes);
    const g = chars.slice(sur.length).map((o) => o.strokes);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const tian = s.length === 1 ? s[0] + 1 : sum(s);
    const ren = s[s.length - 1] + g[0];
    const di = g.length === 1 ? g[0] + 1 : sum(g);
    const zong = sum(s) + sum(g);
    const wai = Math.max(2, tian + di - ren);
    const T5 = T();
    const ge = [['天格', tian], ['人格', ren], ['地格', di], ['外格', wai], ['總格', zong]].map(([name, n]) => ({
      name, n, wx: numWx(n), meaning: T5.ge[name], ...num81(n)
    }));
    const [tw, rw, dw] = [numWx(tian), numWx(ren), numWx(di)];
    const upper = {
      same: ['吉', '天人比和：與長輩、上司關係和諧，彼此理念相近。'],
      shengBy: ['吉', '天格生人格：易得長輩、上司的提攜與庇蔭。'],
      sheng: ['平', '人格生天格：對長輩上司付出較多，重視孝順與責任。'],
      keBy: ['凶', '天格剋人格：易感受到來自上位者或環境的壓力。'],
      ke: ['平', '人格剋天格：個性較有主見，不喜受上位者約束。']
    }[relation(rw, tw)];
    const lower = {
      same: ['吉', '人地比和：家庭、基礎穩定，與部屬晚輩相處融洽。'],
      shengBy: ['吉', '地格生人格：根基穩固，易得家人、部屬與晚輩支持。'],
      sheng: ['平', '人格生地格：樂於照顧家人與晚輩，付出多而辛勞。'],
      keBy: ['凶', '地格剋人格：基礎較不穩，易為家庭或部屬之事操心。'],
      ke: ['平', '人格剋地格：對家人部屬要求高，掌控欲較強。']
    }[relation(rw, dw)];
    const score = [upper, lower].reduce((a, x) => a + (x[0] === '吉' ? 1 : x[0] === '凶' ? -1 : 0), 0);
    return {
      chars, ge,
      sancai: { wx: [tw, rw, dw], upper, lower, rating: score > 0 ? '吉' : score < 0 ? '凶' : '平' },
      personality: T5.rengeWx[rw], renWx: rw
    };
  }

  // ── 袁天罡稱骨 ──
  const BONE_YEAR = [12, 9, 6, 7, 12, 5, 9, 8, 7, 8, 15, 9, 16, 8, 8, 19, 12, 6, 8, 7, 5, 15, 6, 16, 15, 7, 9, 12, 10, 7,
    15, 6, 5, 14, 14, 9, 7, 7, 9, 12, 8, 7, 13, 5, 14, 5, 9, 17, 5, 7, 12, 8, 8, 6, 19, 6, 8, 16, 10, 6];
  const BONE_MONTH = [6, 7, 18, 9, 5, 16, 9, 15, 18, 8, 9, 5];
  const BONE_DAY = [5, 10, 8, 15, 16, 15, 8, 16, 8, 16, 9, 17, 8, 17, 10, 8, 9, 18, 5, 15, 10, 9, 8, 9, 15, 18, 7, 8, 16, 6];
  const BONE_HOUR = [16, 6, 7, 10, 9, 16, 10, 8, 8, 9, 6, 6];
  const liang = (x) => { const a = Math.floor(x / 10), b = x % 10; return `${a ? a + '兩' : ''}${b ? b + '錢' : ''}`; };

  function sexagenaryIndex(gz) {
    const g = GAN.indexOf(gz[0]), z = ZHI.indexOf(gz[1]);
    for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i;
    return -1;
  }
  function boneWeight(yearGZ, lunarMonth, lunarDay, hourZhiIdx) {
    const parts = [
      { label: `${yearGZ}年`, w: BONE_YEAR[sexagenaryIndex(yearGZ)] },
      { label: `農曆${Math.abs(lunarMonth)}月`, w: BONE_MONTH[Math.abs(lunarMonth) - 1] },
      { label: `農曆${lunarDay}日`, w: BONE_DAY[lunarDay - 1] },
      { label: `${ZHI[hourZhiIdx]}時`, w: BONE_HOUR[hourZhiIdx] }
    ];
    parts.forEach((p) => { p.text = liang(p.w); });
    const total = parts.reduce((a, p) => a + p.w, 0);
    const verse = T().bone[Math.min(Math.max(total, 21), 72) - 21];
    const sum = T().boneSummary.find(([lo, hi]) => total / 10 >= lo && total / 10 <= hi + 1e-9);
    return { parts, total, text: liang(total), verse, summary: sum ? sum[2] : '' };
  }

  // ── 地支關係（合、沖、刑、害、破） ──
  const LIUHE = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
  const SANHE = ['申子辰', '寅午戌', '巳酉丑', '亥卯未'];
  const XING = ['寅巳', '巳申', '申寅', '丑戌', '戌未', '未丑', '子卯'];
  const HAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  const PO = ['子酉', '卯午', '辰丑', '未戌', '寅亥', '巳申'];
  function branchRelations(a, b) {
    const has = (list) => list.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    const tags = [];
    if (a === b) tags.push('同');
    if (has(LIUHE)) tags.push('六合');
    if (a !== b && SANHE.some((g) => g.includes(a) && g.includes(b))) tags.push('三合');
    if ((ZHI.indexOf(a) + 6) % 12 === ZHI.indexOf(b)) tags.push('沖');
    if (has(XING) || (a === b && '辰午酉亥'.includes(a))) tags.push('刑');
    if (has(HAI)) tags.push('害');
    if (has(PO)) tags.push('破');
    return tags;
  }

  // ── 太歲 ──
  function taiSui(birthZhi, yearZhi) {
    const label = { 同: '值太歲', 沖: '沖太歲', 刑: '刑太歲', 害: '害太歲', 破: '破太歲' };
    return branchRelations(birthZhi, yearZhi).map((t) => label[t]).filter(Boolean);
  }

  // ── 輸入檢查 ──
  function validateInput(input) {
    if (!(input.year >= 1900 && input.year <= 2100)) throw new Error('出生年份請介於 1900 至 2100 年。');
    if (input.calendar !== 'lunar') return;
    const CN = '正二三四五六七八九十冬臘';
    const leapMonth = root.LunarYear.fromYear(input.year).getLeapMonth();
    if (input.leap && leapMonth !== input.month) {
      throw new Error(`農曆 ${input.year} 年沒有閏${CN[input.month - 1]}月${leapMonth ? `（該年閏${CN[leapMonth - 1]}月）` : ''}。`);
    }
    const days = root.LunarMonth.fromYm(input.year, input.leap ? -input.month : input.month).getDayCount();
    if (input.day > days) throw new Error(`該農曆月只有 ${days} 天。`);
  }
  function zodiacRelations(zhi) {
    const i = ZHI.indexOf(zhi);
    const sanhe = ['申子辰', '寅午戌', '巳酉丑', '亥卯未'].find((g) => g.includes(zhi));
    const liuhe = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }[zhi];
    const z = (c) => ZODIAC[ZHI.indexOf(c)];
    return {
      sanhe: [...sanhe].filter((c) => c !== zhi).map(z),
      liuhe: z(liuhe),
      chong: ZODIAC[(i + 6) % 12]
    };
  }

  // ── 八字 ──
  function bazi(lunar, gender, hasTime) {
    const ec = lunar.getEightChar();
    const cols = [
      ['年柱', 'Year'], ['月柱', 'Month'], ['日柱', 'Day'], ['時柱', 'Time']
    ].slice(0, hasTime ? 4 : 3).map(([label, k]) => {
      const gz = ec['get' + k]();
      return {
        label, gan: gz[0], zhi: gz[1],
        ganWx: GAN_WX[GAN.indexOf(gz[0])], zhiWx: ZHI_WX[ZHI.indexOf(gz[1])],
        shishenGan: k === 'Day' ? '日主' : tt(ec[`get${k}ShiShenGan`]()),
        hideGan: ec[`get${k}HideGan`](),
        shishenZhi: ec[`get${k}ShiShenZhi`]().map(tt),
        nayin: tt(ec[`get${k}NaYin`]()),
        dishi: tt(ec[`get${k}DiShi`]()),
        xunkong: ec[`get${k}XunKong`]()
      };
    });
    const dayGan = cols[2].gan, dayWx = cols[2].ganWx;

    // 五行統計：天干 1 分；地支藏干依本/中/餘氣分配；月令加權 1.5
    const count = Object.fromEntries(WX.map((w) => [w, 0]));
    const score = Object.fromEntries(WX.map((w) => [w, 0]));
    const HIDE_W = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };
    cols.forEach((c, i) => {
      count[c.ganWx]++; count[c.zhiWx]++;
      score[c.ganWx] += 1;
      const mul = i === 1 ? 1.5 : 1;
      c.hideGan.forEach((g, j) => { score[GAN_WX[GAN.indexOf(g)]] += HIDE_W[c.hideGan.length][j] * mul; });
    });
    const total = WX.reduce((a, w) => a + score[w], 0);
    const selfScore = score[dayWx] + score[shengBy(dayWx)];
    const ratio = selfScore / total;
    const strong = ratio >= 0.5;
    const level = ratio >= 0.62 ? '偏強' : ratio >= 0.5 ? '中和偏強' : ratio >= 0.4 ? '中和偏弱' : '偏弱';
    let yong, xi;
    if (strong) {
      const cands = [shengOf(dayWx), keOf(dayWx), keBy(dayWx)].sort((a, b) => score[a] - score[b]);
      [yong, xi] = cands;
    } else {
      yong = shengBy(dayWx); xi = dayWx;
      if (score[yong] > score[xi] * 2) [yong, xi] = [xi, yong];
    }
    const missing = WX.filter((w) => count[w] === 0);

    // 十神分布（天干 + 地支本氣）
    const ss = {};
    cols.forEach((c, i) => {
      if (i !== 2) ss[c.shishenGan] = (ss[c.shishenGan] || 0) + 1;
      ss[c.shishenZhi[0]] = (ss[c.shishenZhi[0]] || 0) + 1;
    });
    const topShishen = Object.entries(ss).sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([name, n]) => ({ name, n, text: T().shishen[name] }));

    // 大運
    const yun = ec.getYun(gender === '男' ? 1 : 0);
    const nowYear = new Date().getFullYear();
    const dayun = yun.getDaYun().slice(1, 9).map((d) => ({
      gz: d.getGanZhi(), startAge: d.getStartAge(), endAge: d.getEndAge(),
      startYear: d.getStartYear(), endYear: d.getEndYear(),
      current: nowYear >= d.getStartYear() && nowYear <= d.getEndYear()
    }));

    return {
      cols, dayGan, dayWx, dayMaster: T().dayMaster[dayGan],
      count, score, total, ratio, strong, level, yong, xi, missing, topShishen,
      mingGong: ec.getMingGong(), shenGong: ec.getShenGong(), taiYuan: ec.getTaiYuan(),
      yunStart: `${yun.getStartYear()}年${yun.getStartMonth()}個月${yun.getStartDay()}天`,
      yunStartSolar: yun.getStartSolar().toYmd(), dayun
    };
  }

  // ── 紫微斗數 ──
  function ziwei(solar, hour, gender, now) {
    const timeIndex = hour === 23 ? 12 : Math.floor((hour + 1) / 2);
    const ymd = `${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`;
    const a = root.iztro.astro.bySolar(ymd, timeIndex, gender, true, 'zh-TW');
    const h = a.horoscope(now);
    const star = (s) => ({ name: s.name, brightness: s.brightness || '', mutagen: s.mutagen || '', type: s.type });
    const palaces = a.palaces.map((p) => ({
      index: p.index, name: p.name, isBody: p.isBodyPalace, stem: p.heavenlyStem, branch: p.earthlyBranch,
      major: p.majorStars.map(star), minor: p.minorStars.map(star), adj: p.adjectiveStars.map((s) => s.name),
      decadal: p.decadal.range, changsheng: p.changsheng12, boshi: p.boshi12,
      isDecadal: h.decadal.index === p.index, isYearly: h.yearly.index === p.index
    }));
    const find = (n) => palaces.find((p) => p.name === n);
    const soul = find('命宮');
    const borrowed = soul.major.length === 0;
    const soulStars = borrowed ? palaces.find((p) => p.branch === ZHI[(ZHI.indexOf(soul.branch) + 6) % 12]).major : soul.major;
    const mutagens = [];
    palaces.forEach((p) => [...p.major, ...p.minor].forEach((s) => { if (s.mutagen) mutagens.push({ ...s, palace: p.name }); }));
    mutagens.sort((x, y) => '祿權科忌'.indexOf(x.mutagen) - '祿權科忌'.indexOf(y.mutagen));
    const keyPalaces = ['財帛', '官祿', '夫妻', '福德'].map((n) => {
      const p = find(n);
      const opp = palaces.find((q) => q.branch === ZHI[(ZHI.indexOf(p.branch) + 6) % 12]);
      return { name: n, stars: p.major.length ? p.major : opp.major, borrowed: !p.major.length, minor: p.minor };
    });
    return {
      palaces, soul, borrowed, soulStars, mutagens, keyPalaces,
      body: palaces.find((p) => p.isBody),
      info: {
        lunarDate: a.lunarDate, chineseDate: a.chineseDate, time: a.time, timeRange: a.timeRange,
        soulMaster: a.soul, bodyMaster: a.body, fiveElementsClass: a.fiveElementsClass,
        decadal: `${h.decadal.heavenlyStem}${h.decadal.earthlyBranch}`, yearly: `${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}`,
        nominalAge: h.age.nominalAge
      }
    };
  }

  // ── 出生日農民曆 ──
  function almanac(lunar) {
    const j = (arr) => arr.map(tt).join('、');
    const prev = lunar.getPrevJieQi(), next = lunar.getNextJieQi();
    return {
      lunar: `${tt(lunar.getYearInChinese())}年 ${tt(lunar.getMonthInChinese())}月${tt(lunar.getDayInChinese())}`,
      ganzhi: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
      jieqi: `${tt(prev.getName())}（${prev.getSolar().toYmd()}）之後，${tt(next.getName())}（${next.getSolar().toYmd()}）之前`,
      yi: j(lunar.getDayYi()), ji: j(lunar.getDayJi()),
      chong: `沖${tt(lunar.getDayChongDesc())}　煞${tt(lunar.getDaySha())}`,
      pengzu: `${tt(lunar.getPengZuGan())}　${tt(lunar.getPengZuZhi())}`,
      tai: tt(lunar.getDayPositionTai()),
      zhixing: tt(lunar.getZhiXing()) + '日',
      xiu: `${tt(lunar.getXiu())}${tt(lunar.getZheng())}${tt(lunar.getAnimal())}（${tt(lunar.getXiuLuck())}）`,
      tianshen: `${tt(lunar.getDayTianShen())}（${tt(lunar.getDayTianShenType())}${tt(lunar.getDayTianShenLuck())}）`,
      jishen: j(lunar.getDayJiShen()), xiongsha: j(lunar.getDayXiongSha()),
      nineStar: tt(lunar.getDayNineStar().toString()),
      yuexiang: tt(lunar.getYueXiang()), wuhou: tt(lunar.getWuHou()),
      positions: `喜神${tt(lunar.getDayPositionXiDesc())}　財神${tt(lunar.getDayPositionCaiDesc())}　福神${tt(lunar.getDayPositionFuDesc())}`
    };
  }

  // ── 主流程 ──
  // input: { surname, given, gender:'男'|'女', calendar:'solar'|'lunar', year, month, day, leap, hour, minute, hourUnknown }
  function analyze(input, now = new Date()) {
    const { Solar, Lunar } = root;
    const hasTime = !input.hourUnknown;
    const hour = hasTime ? input.hour : 12, minute = hasTime ? input.minute : 0;
    let solar;
    if (input.calendar === 'lunar') {
      solar = Lunar.fromYmdHms(input.year, input.leap ? -input.month : input.month, input.day, hour, minute, 0).getSolar();
    } else {
      solar = Solar.fromYmdHms(input.year, input.month, input.day, hour, minute, 0);
    }
    const lunar = solar.getLunar();
    const yearZhi = lunar.getYearZhi();
    const shengxiao = ZODIAC[ZHI.indexOf(yearZhi)];
    const nowLunar = Solar.fromDate(now).getLunar();

    const result = {
      input, hasTime,
      solar: { y: solar.getYear(), m: solar.getMonth(), d: solar.getDay(), h: hour, mi: minute, week: tt(solar.getWeekInChinese()) },
      lunarText: `${tt(lunar.getYearInChinese())}年${tt(lunar.getMonthInChinese())}月${tt(lunar.getDayInChinese())}`,
      timeZhi: hasTime ? lunar.getTimeZhi() + '時' : '時辰不詳',
      western: westernSign(solar.getMonth(), solar.getDay()),
      zodiac: {
        animal: shengxiao, zhi: yearZhi, yearGZ: lunar.getYearInGanZhi(),
        nayin: tt(lunar.getYearNaYin()), ...T().zodiac[shengxiao], rel: zodiacRelations(yearZhi),
        lichunAnimal: ZODIAC[ZHI.indexOf(lunar.getYearZhiByLiChun())]
      },
      taisui: {
        year: now.getFullYear(), yearGZ: nowLunar.getYearInGanZhi(),
        yearAnimal: ZODIAC[ZHI.indexOf(nowLunar.getYearZhi())],
        hits: taiSui(yearZhi, nowLunar.getYearZhi())
      },
      lifePath: lifePath(solar.getYear(), solar.getMonth(), solar.getDay()),
      bazi: bazi(lunar, input.gender, hasTime),
      almanac: almanac(lunar),
      name: input.surname || input.given ? nameology(input.surname || '', input.given || '') : null,
      bone: hasTime ? boneWeight(lunar.getYearInGanZhi(), lunar.getMonth(), lunar.getDay(), lunar.getTimeZhiIndex()) : null,
      ziwei: hasTime ? ziwei(solar, hour, input.gender, now) : null
    };

    // 姓名與八字喜用神搭配
    if (result.name && !result.name.error) {
      const rw = result.name.renWx, { yong, xi } = result.bazi;
      let match;
      if (rw === yong || rw === xi) match = ['相輔', `人格五行屬「${rw}」，正好是八字的喜用五行，姓名能補益命局。`];
      else if (shengOf(rw) === yong || shengOf(rw) === xi) match = ['良好', `人格五行「${rw}」能生扶喜用神，對命局有間接幫助。`];
      else if (keOf(rw) === yong) match = ['待加強', `人格五行「${rw}」剋制用神「${yong}」，姓名與八字搭配較弱，可從生活中補足喜用五行。`];
      else match = ['中性', `人格五行「${rw}」與喜用神「${yong}」、「${xi}」關係平和，影響不大。`];
      result.name.baziMatch = match;
    }
    return result;
  }

  root.FT = {
    analyze, validateInput, toTrad, kangxiStrokes, nameology, boneWeight, taiSui, branchRelations, westernSign, lifePath,
    relation, shengOf, keOf, shengBy, keBy, GAN, ZHI, ZODIAC, WX, GAN_WX, ZHI_WX
  };
})(typeof window !== 'undefined' ? window : globalThis);
