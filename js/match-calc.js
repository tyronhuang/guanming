// 合婚配對計算：以 FT.analyze 的個人結果為基礎，綜合多種傳統方法評分（僅供娛樂參考）
(function (root) {
  'use strict';
  const FT = root.FT;
  const { ZHI, ZODIAC } = FT;
  const clamp = (n, lo = 30, hi = 98) => Math.round(Math.max(lo, Math.min(hi, n)));
  const verdict = (s) => (s >= 85 ? '大吉' : s >= 72 ? '吉' : s >= 60 ? '平' : '磨合');
  const G = '新郎', B = '新娘';

  // ── 地支配對（生肖、日支共用） ──
  const BRANCH_TEXT = {
    六合: '為「六合」，傳統上最登對的組合，彼此互補、容易同心。',
    三合: '為「三合」，志趣相投、合作默契佳，能一起打拼。',
    沖: '為「相沖」，個性與步調差異大，容易有摩擦，需多包容。',
    刑: '為「相刑」，容易在小事上較勁，宜多體諒對方。',
    害: '為「相害」，易因誤會產生心結，宜坦誠溝通。',
    破: '為「相破」，偶有意見分歧，但影響不大。',
    同: '相同，價值觀相近，但也可能太像而互不相讓。',
    無: '無沖無合，關係平穩，靠用心經營來加溫。'
  };
  function branchMatch(a, b) {
    const tags = FT.branchRelations(a, b);
    const good = tags.includes('六合') ? 95 : tags.includes('三合') ? 90 : null;
    const penalty = { 沖: 35, 刑: 25, 害: 25, 破: 15 };
    let score = good ?? (tags.includes('同') ? 76 : 72);
    tags.forEach((t) => { score -= (penalty[t] || 0) * (good ? 0.4 : 1); });
    const shown = tags.filter((t) => t !== '同' || tags.length === 1);
    const text = (shown.length ? shown : ['無']).map((t) => BRANCH_TEXT[t]);
    return { tags, score: clamp(score), text: text.join('同時') };
  }

  // ── 五行關係分數（新郎 → 新娘） ──
  function wxMatch(a, b, labels) {
    const rel = FT.relation(a, b);
    return { rel, score: labels[rel][0], text: labels[rel][1] };
  }

  // ── 八宅命卦 ──
  const GUA = { 1: ['坎', '東'], 2: ['坤', '西'], 3: ['震', '東'], 4: ['巽', '東'], 6: ['乾', '西'], 7: ['兌', '西'], 8: ['艮', '西'], 9: ['離', '東'] };
  function liChunYear(r) {
    const zhi = root.Solar.fromYmdHms(r.solar.y, r.solar.m, r.solar.d, r.solar.h, r.solar.mi, 0).getLunar().getYearZhiByLiChun();
    return ZHI[((r.solar.y - 4) % 12 + 12) % 12] === zhi ? r.solar.y : r.solar.y - 1;
  }
  function mingGua(year, gender) {
    const yy = year % 100;
    let n = year < 2000
      ? (gender === '男' ? 100 - yy : yy - 4)
      : (gender === '男' ? 99 - yy : yy + 6);
    n = ((n % 9) + 9) % 9 || 9;
    if (n === 5) n = gender === '男' ? 2 : 8;
    return { n, name: GUA[n][0], group: GUA[n][1] + '四命' };
  }

  // ── 西洋星座 ──
  const SIGN_ORDER = ['牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座', '摩羯座', '水瓶座', '雙魚座'];
  function westernMatch(a, b) {
    const ea = a.element[0], eb = b.element[0];
    const diff = Math.abs(SIGN_ORDER.indexOf(a.name) - SIGN_ORDER.indexOf(b.name));
    const pair = [ea, eb].sort().join('');
    if (a.name === b.name) return [80, `同為${a.name}，默契十足，但也容易放大彼此的缺點。`];
    if (diff === 6) return [84, `${a.name}與${b.name}互為對宮星座，強烈互相吸引，能截長補短。`];
    if (ea === eb) return [88, `同屬${a.element}星座，價值觀與生活步調一致，相處自在。`];
    if (pair === '火風') return [90, '火象與風象相助：風助火勢，彼此激發熱情與創意。'];
    if (pair === '土水') return [90, '土象與水象相滋：水潤土、土容水，給彼此安全感。'];
    if (pair === '水火' || pair === '土風') return [55, `${a.element}與${b.element}的性情節奏差異大，一方重感受、一方重行動，需多理解。`];
    return [66, `${a.element}與${b.element}表達方式不同，相處需要多說明彼此的想法。`];
  }

  // ── 紫微斗數 ──
  const STAR_GROUP = {
    紫微: '紫府', 天府: '紫府', 廉貞: '紫府', 武曲: '紫府', 天相: '紫府',
    七殺: '殺破狼', 破軍: '殺破狼', 貪狼: '殺破狼',
    天機: '機月同梁', 太陰: '機月同梁', 天同: '機月同梁', 天梁: '機月同梁',
    太陽: '巨日', 巨門: '巨日'
  };
  const GROUP_DESC = { 紫府: '穩重有格局、重責任', 殺破狼: '衝勁強、喜變化與挑戰', 機月同梁: '溫和細膩、重安定', 巨日: '熱情善表達、重溝通' };
  const names = (stars) => stars.map((s) => s.name);
  const groupsOf = (stars) => [...new Set(names(stars).map((n) => STAR_GROUP[n]))];
  function ziweiDirection(from, to, fromLabel, toLabel) {
    const spouse = from.ziwei.keyPalaces.find((k) => k.name === '夫妻').stars;
    const soul = to.ziwei.soulStars;
    const exact = names(spouse).some((n) => names(soul).includes(n));
    const group = groupsOf(spouse).some((g) => groupsOf(soul).includes(g));
    const score = exact ? 95 : group ? 84 : 64;
    const text = `${fromLabel}夫妻宮為「${names(spouse).join('、')}」（期待伴侶${groupsOf(spouse).map((g) => GROUP_DESC[g]).join('、')}），`
      + `${toLabel}命宮為「${names(soul).join('、')}」（${groupsOf(soul).map((g) => GROUP_DESC[g]).join('、')}）`
      + (exact ? '，主星相同，正是心中理想的伴侶類型。' : group ? '，屬同一星系，特質相近。' : '，特質差異較大。');
    const ji = from.ziwei.palaces.find((p) => p.name === '夫妻');
    const hasJi = [...ji.major, ...ji.minor].some((s) => s.mutagen === '忌');
    return { score: score - (hasJi ? 6 : 0), text: text + (hasJi ? `（${fromLabel}夫妻宮有化忌，感情上較執著、在意）` : '') };
  }

  // ── 主流程 ──
  function match(g, b) {
    const methods = [];
    const skipped = [];
    const add = (m) => methods.push({ ...m, score: clamp(m.score), verdict: verdict(clamp(m.score)) });

    // 1. 生肖
    const zm = branchMatch(g.zodiac.zhi, b.zodiac.zhi);
    add({
      cat: '生肖', title: '生肖配對', weight: 15, score: zm.score,
      left: `屬${g.zodiac.animal}`, right: `屬${b.zodiac.animal}`,
      text: `${G}屬${g.zodiac.animal}、${B}屬${b.zodiac.animal}，${zm.text}`,
      tip: zm.score < 72 ? '生肖有沖刑害，傳統上會擇吉日、配戴三合生肖飾品化解；實際上多留意彼此步調，給對方空間。' : ''
    });

    // 2. 八字：日干
    const WUHE = { 甲己: '甲己合土・中正之合', 乙庚: '乙庚合金・仁義之合', 丙辛: '丙辛合水・威制之合', 丁壬: '丁壬合木・仁壽之合', 戊癸: '戊癸合火・無情之合' };
    const gb = g.bazi, bb = b.bazi;
    const heKey = Object.keys(WUHE).find((k) => k.includes(gb.dayGan) && k.includes(bb.dayGan) && gb.dayGan !== bb.dayGan);
    const dg = heKey ? { score: 95, text: `日主天干「${WUHE[heKey]}」，天生互相吸引，是八字合婚中極佳的組合。` } : wxMatch(gb.dayWx, bb.dayWx, {
      same: [72, `兩人日主同屬${gb.dayWx}，理念相近、容易理解彼此，但需避免互相較勁。`],
      sheng: [82, `${G}日主${gb.dayWx}生${B}日主${bb.dayWx}，${G}較願意付出與照顧對方。`],
      shengBy: [82, `${B}日主${bb.dayWx}生${G}日主${gb.dayWx}，${B}較能包容與支持對方。`],
      ke: [62, `${G}日主${gb.dayWx}剋${B}日主${bb.dayWx}，${G}在關係中較強勢主導。`],
      keBy: [58, `${B}日主${bb.dayWx}剋${G}日主${gb.dayWx}，${B}在關係中較強勢主導。`]
    });
    add({
      cat: '八字', title: '日主天干', weight: 9, score: dg.score,
      left: `${gb.dayGan}${gb.dayWx}`, right: `${bb.dayGan}${bb.dayWx}`, text: dg.text,
      tip: dg.score < 65 ? '日主相剋，一方較強勢，重大決定宜共同討論，避免單方面做主。' : ''
    });

    // 3. 八字：日支（夫妻宮）
    const dz = branchMatch(gb.cols[2].zhi, bb.cols[2].zhi);
    add({
      cat: '八字', title: '日支夫妻宮', weight: 9, score: dz.score,
      left: gb.cols[2].zhi, right: bb.cols[2].zhi,
      text: `日支代表夫妻宮與婚後生活。${G}日支「${gb.cols[2].zhi}」與${B}日支「${bb.cols[2].zhi}」${dz.text}`,
      tip: dz.score < 65 ? '夫妻宮有沖刑，生活習慣差異較大，可事先約定家務分工與各自的獨處時間。' : ''
    });

    // 4. 八字：五行互補
    const dom = (bz) => FT.WX.reduce((a, w) => (bz.score[w] > bz.score[a] ? w : a), FT.WX[0]);
    const gDom = dom(gb), bDom = dom(bb);
    const gGets = bDom === gb.yong || bDom === gb.xi;
    const bGets = gDom === bb.yong || gDom === bb.xi;
    let wxScore = gGets && bGets ? 95 : gGets || bGets ? 80 : 64;
    if (FT.keOf(bDom) === gb.yong) wxScore -= 8;
    if (FT.keOf(gDom) === bb.yong) wxScore -= 8;
    add({
      cat: '八字', title: '五行互補', weight: 10, score: wxScore,
      left: `喜${gb.yong}${gb.xi}・旺${gDom}`, right: `喜${bb.yong}${bb.xi}・旺${bDom}`,
      text: `${G}喜用「${gb.yong}、${gb.xi}」，命中最旺為「${gDom}」；${B}喜用「${bb.yong}、${bb.xi}」，命中最旺為「${bDom}」。`
        + (gGets && bGets ? '雙方正好補足彼此所需的五行，是互為貴人的組合。'
          : gGets ? `${B}的旺氣能補${G}所需，${G}能從${B}身上得到助力。`
            : bGets ? `${G}的旺氣能補${B}所需，${B}能從${G}身上得到助力。`
              : '雙方五行互補性較低，各自的能量較少交集。'),
      tip: wxScore < 72 ? '五行互補性較低，可以一起培養共同興趣，或在居家佈置加入雙方的喜用色，創造交集。' : ''
    });

    // 5. 年柱納音
    const gn = g.zodiac.nayin, bn = b.zodiac.nayin;
    const nm = wxMatch(gn.slice(-1), bn.slice(-1), {
      same: [75, `${gn}命與${bn}命五行比和，彼此步調一致。`],
      sheng: [90, `${gn}命生${bn}命，${G}能帶給${B}滋養與助力，相生大吉。`],
      shengBy: [90, `${bn}命生${gn}命，${B}能帶給${G}滋養與助力，相生大吉。`],
      ke: [52, `${gn}命剋${bn}命，傳統納音合婚視為相剋，需多體貼${B}。`],
      keBy: [50, `${bn}命剋${gn}命，傳統納音合婚視為相剋，需多體貼${G}。`]
    });
    add({
      cat: '八字', title: '年命納音', weight: 7, score: nm.score, left: gn, right: bn, text: nm.text,
      tip: nm.score < 65 ? '納音相剋，相處時多肯定對方、減少言語上的批評，就能化剋為和。' : ''
    });

    // 6. 八宅命卦
    const ggua = mingGua(liChunYear(g), '男'), bgua = mingGua(liChunYear(b), '女');
    const sameGroup = ggua.group === bgua.group;
    add({
      cat: '命卦', title: '東西四命', weight: 10, score: sameGroup ? 90 : 56,
      left: `${ggua.name}卦・${ggua.group}`, right: `${bgua.name}卦・${bgua.group}`,
      text: sameGroup
        ? `兩人同為${ggua.group}，八宅合婚視為同氣相求，居住方位與生活習慣容易一致。`
        : `${G}為${ggua.group}、${B}為${bgua.group}，對居住方位與環境的偏好不同。`,
      tip: sameGroup ? '' : '東西四命不同，選屋與居家佈置時多討論，兼顧兩人的舒適感。'
    });

    // 7. 紫微斗數
    if (g.ziwei && b.ziwei) {
      const d1 = ziweiDirection(g, b, G, B), d2 = ziweiDirection(b, g, B, G);
      add({
        cat: '紫微', title: '夫妻宮與命宮', weight: 15, score: (d1.score + d2.score) / 2,
        left: `命${names(g.ziwei.soulStars).join('')}`, right: `命${names(b.ziwei.soulStars).join('')}`,
        text: `${d1.text}<br>${d2.text}`,
        tip: (d1.score + d2.score) / 2 < 72 ? '紫微夫妻宮所期待的伴侶特質與對方差異較大，試著欣賞對方原本的樣子，而不是改變對方。' : ''
      });
    } else skipped.push('紫微斗數需要雙方的出生時辰');

    // 8. 姓名學
    if (g.name && !g.name.error && b.name && !b.name.error) {
      const gr = g.name.ge[1], br = b.name.ge[1];
      const nmx = wxMatch(g.name.renWx, b.name.renWx, {
        same: [76, `人格五行同屬${g.name.renWx}，個性相近、容易溝通。`],
        sheng: [86, `${G}人格${g.name.renWx}生${B}人格${b.name.renWx}，${G}在相處中較能包容付出。`],
        shengBy: [86, `${B}人格${b.name.renWx}生${G}人格${g.name.renWx}，${B}在相處中較能包容付出。`],
        ke: [56, `${G}人格${g.name.renWx}剋${B}人格${b.name.renWx}，溝通時${G}宜放軟語氣。`],
        keBy: [56, `${B}人格${b.name.renWx}剋${G}人格${g.name.renWx}，溝通時${B}宜放軟語氣。`]
      });
      const bonus = gr.luck === '吉' && br.luck === '吉' ? 4 : gr.luck === '凶' && br.luck === '凶' ? -4 : 0;
      add({
        cat: '姓名', title: '姓名人格', weight: 10, score: nmx.score + bonus,
        left: `人格${gr.n}・${g.name.renWx}`, right: `人格${br.n}・${b.name.renWx}`,
        text: `${nmx.text}${G}人格 ${gr.n}（${gr.title}，${gr.luck}）、${B}人格 ${br.n}（${br.title}，${br.luck}）。`,
        tip: nmx.score < 65 ? '姓名人格五行相剋，吵架時先暫停、先聽完再回應，能減少衝突。' : ''
      });
    } else skipped.push('姓名配對需要雙方的中文姓名');

    // 9. 西洋星座
    const [ws, wt] = westernMatch(g.western, b.western);
    add({
      cat: '星座', title: '星座元素', weight: 10, score: ws,
      left: g.western.name, right: b.western.name, text: wt,
      tip: ws < 65 ? '星座元素節奏不同，一方重行動、一方重感受，遇到分歧時多說明自己的想法與感受。' : ''
    });

    // 10. 生命靈數
    const gl = g.lifePath.number, bl = b.lifePath.number;
    const sameTriad = ['157', '248', '369'].some((t) => t.includes(gl) && t.includes(bl));
    const ls = gl === bl ? 80 : sameTriad ? 88 : 64;
    add({
      cat: '靈數', title: '生命靈數', weight: 5, score: ls,
      left: `${gl} 號・${g.lifePath.title}`, right: `${bl} 號・${b.lifePath.title}`,
      text: gl === bl ? `同為 ${gl} 號${g.lifePath.title}，想法相近、默契好。`
        : sameTriad ? `${gl} 號與 ${bl} 號屬於同一組和諧數字，頻率相合、相處輕鬆。`
          : `${gl} 號${g.lifePath.title}與 ${bl} 號${b.lifePath.title}特質不同，正好能帶給彼此新視野。`,
      tip: ls < 70 ? '生命靈數頻率不同，保留各自的興趣與朋友圈，關係反而更長久。' : ''
    });

    const totalW = methods.reduce((a, m) => a + m.weight, 0);
    const total = Math.round(methods.reduce((a, m) => a + m.score * m.weight, 0) / totalW);
    const GRADES = [
      [85, '天作之合', '緣分深厚，多項傳統合婚指標都顯示兩人十分登對。'],
      [75, '佳偶天成', '整體契合度高，優勢明顯，少數差異正好互補。'],
      [65, '相輔相成', '有契合也有差異，只要用心經營，就能越走越好。'],
      [55, '需要磨合', '差異較多，需要更多溝通與包容，感情也會因此更有深度。'],
      [0, '多加包容', '傳統指標上的挑戰較多，但命理只是參考，相愛與經營才是關鍵。']
    ];
    const [, grade, gradeText] = GRADES.find(([min]) => total >= min);
    const sorted = [...methods].sort((x, y) => y.score - x.score);
    const tips = methods.filter((m) => m.tip).map((m) => m.tip);
    tips.push('婚姻是兩個人一起經營的旅程：多表達感謝、定期約會、遇到問題一起面對，比任何命盤都重要。');
    return { methods, skipped, total, grade, gradeText, strengths: sorted.slice(0, 3), weaknesses: sorted.slice(-2).reverse(), tips, gua: { g: ggua, b: bgua } };
  }

  root.FT.match = match;
  root.FT.mingGua = mingGua;
})(typeof window !== 'undefined' ? window : globalThis);
