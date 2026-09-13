// 介面：表單處理與結果渲染
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TX = window.TEXTS;
  const STORE_KEY = 'guanming.input';
  const HOURS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const wxOf = (ch) => FT.GAN.includes(ch) ? FT.GAN_WX[FT.GAN.indexOf(ch)] : FT.ZHI_WX[FT.ZHI.indexOf(ch)];
  const wxSpan = (ch, cls = '') => `<span class="wx-${wxOf(ch)} ${cls}">${ch}</span>`;
  const luck = (l) => `<span class="luck ${l}">${l}</span>`;

  // ───────── 表單 ─────────
  const lMonth = $('lMonth'), lDay = $('lDay');
  const CN_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
  lMonth.innerHTML = CN_MONTH.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
  lDay.innerHTML = Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');

  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  function syncCalendar() {
    const lunar = radio('calendar') === 'lunar';
    $('solarBox').hidden = lunar;
    $('lunarBox').hidden = !lunar;
  }
  function syncTime() {
    const unknown = $('hourUnknown').checked;
    $('birthTime').disabled = unknown;
    if (unknown) { $('timeHint').textContent = '未提供時辰：將略過時柱、紫微斗數與稱骨。'; return; }
    const [h, m] = ($('birthTime').value || '12:00').split(':').map(Number);
    const zi = h === 23 ? 0 : Math.floor((h + 1) / 2);
    const start = (zi * 2 + 23) % 24;
    const label = h === 23 ? '晚子時' : h === 0 ? '早子時' : HOURS[zi] + '時';
    $('timeHint').textContent = `時辰：${label}（${String(start).padStart(2, '0')}:00–${String((start + 2) % 24).padStart(2, '0')}:00）`;
    void m;
  }
  document.querySelectorAll('input[name="calendar"]').forEach((el) => el.addEventListener('change', syncCalendar));
  $('hourUnknown').addEventListener('change', syncTime);
  $('birthTime').addEventListener('input', syncTime);

  function readInput() {
    const calendar = radio('calendar');
    const input = {
      surname: $('surname').value.trim(), given: $('given').value.trim(),
      gender: radio('gender'), calendar, hourUnknown: $('hourUnknown').checked
    };
    if (calendar === 'solar') {
      const v = $('solarDate').value;
      if (!v) throw new Error('請選擇出生日期。');
      [input.year, input.month, input.day] = v.split('-').map(Number);
    } else {
      input.year = Number($('lYear').value); input.month = Number(lMonth.value);
      input.day = Number(lDay.value); input.leap = $('lLeap').checked;
    }
    FT.validateInput(input);
    const [h, m] = ($('birthTime').value || '12:00').split(':').map(Number);
    input.hour = h; input.minute = m;
    if (input.given && !input.surname) throw new Error('請輸入姓氏。');
    return input;
  }
  function writeInput(v) {
    $('surname').value = v.surname || ''; $('given').value = v.given || '';
    document.querySelector(`input[name="gender"][value="${v.gender}"]`).checked = true;
    document.querySelector(`input[name="calendar"][value="${v.calendar}"]`).checked = true;
    const p = (n) => String(n).padStart(2, '0');
    if (v.calendar === 'solar') $('solarDate').value = `${v.year}-${p(v.month)}-${p(v.day)}`;
    else { $('lYear').value = v.year; lMonth.value = v.month; lDay.value = v.day; $('lLeap').checked = !!v.leap; }
    $('birthTime').value = `${p(v.hour ?? 12)}:${p(v.minute ?? 0)}`;
    $('hourUnknown').checked = !!v.hourUnknown;
    syncCalendar(); syncTime();
  }

  try { const saved = JSON.parse(localStorage.getItem(STORE_KEY)); if (saved) writeInput(saved); } catch (e) { /* 無儲存資料 */ }
  syncCalendar(); syncTime();

  // 網址參數可直接排盤，例如 ?name=陳,雅婷&sex=女&date=1990-05-17&time=10:30&tab=ziwei
  const qs = new URLSearchParams(location.search);
  if (qs.get('date')) {
    const [surname = '', given = ''] = (qs.get('name') || '').split(',');
    const [year, month, day] = qs.get('date').split('-').map(Number);
    const [hour = 12, minute = 0] = (qs.get('time') || '').split(':').map(Number);
    writeInput({ surname, given, gender: qs.get('sex') === '女' ? '女' : '男', calendar: qs.get('cal') === 'lunar' ? 'lunar' : 'solar',
      year, month, day, leap: qs.get('leap') === '1', hour, minute, hourUnknown: !qs.get('time') });
    setTimeout(() => { $('form').requestSubmit(); if (qs.get('tab')) showTab(qs.get('tab')); }, 0);
  }

  $('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const err = $('error');
    err.hidden = true;
    let r;
    try {
      const input = readInput();
      r = FT.analyze(input);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(input)); } catch (e) { /* 忽略 */ }
    } catch (e) {
      err.textContent = e.message || '計算時發生錯誤，請確認輸入內容。';
      err.hidden = false;
      console.error(e);
      return;
    }
    render(r);
  });
  $('printBtn').addEventListener('click', () => window.print());
  $('editBtn').addEventListener('click', () => { $('form').scrollIntoView({ behavior: 'smooth' }); $('surname').focus(); });

  // ───────── 渲染 ─────────
  let tabs = [];
  function render(r) {
    tabs = [
      ['overview', '總覽', overview(r)],
      ['star', '星座・生肖', starPanel(r)],
      ['bazi', '八字命盤', baziPanel(r)],
      ['ziwei', '紫微斗數', ziweiPanel(r)],
      ['name', '姓名學', namePanel(r)],
      ['bone', '稱骨算命', bonePanel(r)],
      ['almanac', '農民曆', almanacPanel(r)]
    ];
    $('tabs').innerHTML = tabs.map(([id, label], i) =>
      `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" data-tab="${id}">${label}</button>`).join('');
    $('panels').innerHTML = tabs.map(([id, , html], i) =>
      `<section class="panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" ${i ? 'hidden' : ''}>${html}</section>`).join('');
    $('result').hidden = false;
    $('tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); };
    $('panels').onclick = (e) => { const b = e.target.closest('[data-goto]'); if (b) showTab(b.dataset.goto, true); };
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showTab(id, scroll) {
    tabs.forEach(([tid]) => {
      $('tab-' + tid).setAttribute('aria-selected', tid === id);
      $('panel-' + tid).hidden = tid !== id;
    });
    if (scroll) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const fullName = (r) => esc((r.input.surname || '') + (r.input.given || ''));
  const needTime = (what) => `<div class="card"><h3>需要出生時辰</h3><p class="muted">${what}需要準確的出生時間才能推算。請返回上方填寫出生時間後重新排盤。</p></div>`;

  function overview(r) {
    const b = r.bazi, z = r.ziwei, n = r.name && !r.name.error ? r.name : null;
    const who = fullName(r) || '你';
    const cards = [
      ['star', r.western.sym, '西洋星座', r.western.name, r.western.keywords.join('・')],
      ['star', r.zodiac.animal, '生肖', `屬${r.zodiac.animal}・${r.zodiac.nayin}命`, r.zodiac.traits.split('，')[0]],
      ['bazi', b.dayGan, '八字日主', `${b.dayGan}${b.dayWx}・${b.dayMaster.img}`, `日主${b.level}，喜用「${b.yong}」「${b.xi}」`],
      z ? ['ziwei', z.soulStars[0]?.name[0] || '命', '紫微命宮', `${z.soulStars.map((s) => s.name).join('、') || '無主星'}${z.borrowed ? '（借對宮）' : ''}`,
        z.soulStars[0] ? TX.majorStars[z.soulStars[0].name].kw : ''] : ['ziwei', '紫', '紫微命宮', '需出生時辰', '填寫時間即可排盤'],
      n ? ['name', n.ge[1].n, '姓名人格', `人格 ${n.ge[1].n}・${n.ge[1].luck}`, `${n.ge[1].title}；總格 ${n.ge[4].n}（${n.ge[4].luck}）`]
        : ['name', '名', '姓名學', r.name?.error ? '無法計算' : '未填姓名', r.name?.error || '輸入中文姓名即可分析'],
      r.bone ? ['bone', '骨', '稱骨重量', r.bone.text, r.bone.verse.split('，')[0]] : ['bone', '骨', '稱骨重量', '需出生時辰', ''],
      ['star', r.lifePath.number, '生命靈數', `${r.lifePath.number} 號・${r.lifePath.title}`, r.lifePath.text.split('，')[0]],
      ['star', '歲', `${r.taisui.year} ${r.taisui.yearGZ}${r.taisui.yearAnimal}年`, r.taisui.hits.length ? r.taisui.hits.join('、') : '未犯太歲', r.taisui.hits.length ? '宜安太歲、行事穩健' : '流年與生肖無明顯沖犯']
    ];
    return `
      <p class="hello">${who}，你好。</p>
      <p class="lead">國曆 ${r.solar.y} 年 ${r.solar.m} 月 ${r.solar.d} 日（星期${r.solar.week}）${r.hasTime ? ` ${String(r.solar.h).padStart(2, '0')}:${String(r.solar.mi).padStart(2, '0')}` : ''}・農曆 ${r.lunarText}・${r.timeZhi}・${r.input.gender}命
      <br>八字：<span class="serif">${b.cols.map((c) => c.gan + c.zhi).join('　')}${r.hasTime ? '' : '　（時柱不詳）'}</span></p>
      <div class="grid g4">
        ${cards.map(([tab, g, label, value, desc]) => `
          <button type="button" class="card sum-card" data-goto="${tab}">
            <span class="glyph">${esc(g)}</span>
            <span><span class="label">${label}</span><div class="value">${esc(value)}</div><div class="desc">${esc(desc)}</div></span>
          </button>`).join('')}
      </div>
      <div class="card" style="margin-top:14px">
        <h3>性格速寫</h3>
        <p>${esc(b.dayMaster.text)}</p>
        <p>${esc(r.western.personality)}</p>
        ${z && z.soulStars[0] ? `<p>紫微命宮${z.soulStars.map((s) => s.name).join('、')}：${esc(TX.majorStars[z.soulStars[0].name].text)}</p>` : ''}
        ${n ? `<p>${esc(n.personality)}</p>` : ''}
      </div>`;
  }

  function starPanel(r) {
    const w = r.western, zd = r.zodiac;
    return `
      <h2>西洋星座・生肖・生命靈數</h2>
      <p class="lead">從東西方不同角度看見你的天性。</p>
      <div class="grid g2">
        <div class="card">
          <h3>${w.sym} ${w.name} <span class="muted small">${w.en}</span></h3>
          <p>${w.keywords.map((k) => `<span class="tag">${k}</span>`).join('')}</p>
          <dl class="kv">
            <dt>元素</dt><dd>${w.element}・${w.quality}星座</dd>
            <dt>守護星</dt><dd>${w.ruler}</dd>
            <dt>性格</dt><dd>${w.personality}</dd>
            <dt>優點</dt><dd>${w.strengths}</dd>
            <dt>課題</dt><dd>${w.weaknesses}</dd>
            <dt>感情</dt><dd>${w.love}</dd>
            <dt>適合領域</dt><dd>${w.career}</dd>
            <dt>幸運</dt><dd>${w.lucky}</dd>
          </dl>
        </div>
        <div class="card">
          <h3>生肖屬${zd.animal} <span class="muted small">${zd.yearGZ}年・${zd.nayin}命</span></h3>
          <dl class="kv">
            <dt>性格</dt><dd>${zd.traits}</dd>
            <dt>課題</dt><dd>${zd.weak}</dd>
            <dt>三合</dt><dd>${zd.rel.sanhe.join('、')}</dd>
            <dt>六合</dt><dd>${zd.rel.liuhe}</dd>
            <dt>相沖</dt><dd>${zd.rel.chong}</dd>
            <dt>本命佛</dt><dd>${zd.buddha}</dd>
            <dt>${r.taisui.year} 流年</dt><dd>${r.taisui.yearGZ}${r.taisui.yearAnimal}年：${r.taisui.hits.length ? `<b class="wx-火">${r.taisui.hits.join('、')}</b>，傳統習俗建議安太歲、凡事謹慎。` : '未犯太歲，流年平穩。'}</dd>
          </dl>
          ${zd.lichunAnimal !== zd.animal ? `<p class="muted small" style="margin-top:8px">註：生肖以農曆春節為界；若以立春為界（八字算法）則屬${zd.lichunAnimal}。</p>` : ''}
        </div>
        <div class="card">
          <h3>生命靈數 ${r.lifePath.number} 號・${r.lifePath.title}</h3>
          <p class="muted small">出生年月日數字加總：${r.lifePath.chain.join(' → ')}</p>
          <p>${r.lifePath.text}</p>
        </div>
      </div>`;
  }

  function baziPanel(r) {
    const b = r.bazi;
    const cols = [...b.cols].reverse(); // 傳統由右至左：年月日時 → 顯示為 時日月年
    const row = (label, fn) => `<tr><td class="rowh">${label}</td>${cols.map((c) => `<td class="${c.label === '日柱' ? 'day' : ''}">${fn(c)}</td>`).join('')}</tr>`;
    const max = Math.max(...FT.WX.map((w) => b.score[w]));
    const pos = Math.min(95, Math.max(5, b.ratio * 100));
    const el = (w, title) => `
      <div class="yong"><span class="el bg-${w}">${w}</span>
        <div><b>${title}：${w}</b><div class="small muted">${TX.wuxing[w].desc}</div></div></div>`;
    return `
      <h2>八字命盤</h2>
      <p class="lead">以出生年、月、日、時的天干地支排出四柱，觀察五行強弱與十神分布。${r.hasTime ? '' : '（未提供時辰，僅排三柱）'}</p>
      <div class="card scroll-x">
        <table class="pillars">
          <thead><tr><th></th>${cols.map((c) => `<th class="${c.label === '日柱' ? 'day' : ''}">${c.label}</th>`).join('')}</tr></thead>
          <tbody>
            ${row('十神', (c) => c.shishenGan)}
            ${row('天干', (c) => wxSpan(c.gan, 'big'))}
            ${row('地支', (c) => wxSpan(c.zhi, 'big'))}
            ${row('藏干', (c) => c.hideGan.map((g) => wxSpan(g)).join(' '))}
            ${row('支神', (c) => c.shishenZhi.join('<br>'))}
            ${row('納音', (c) => c.nayin)}
            ${row('長生', (c) => c.dishi)}
            ${row('空亡', (c) => c.xunkong)}
          </tbody>
        </table>
        <p class="small muted" style="margin-top:8px">胎元 ${b.taiYuan}・命宮 ${b.mingGong}・身宮 ${b.shenGong}</p>
      </div>

      <div class="grid g2" style="margin-top:14px">
        <div class="card">
          <h3>日主：${wxSpan(b.dayGan)}${b.dayWx}（${b.dayMaster.img}）</h3>
          <p>${b.dayMaster.text}</p>
          <h3 style="margin-top:14px">命中主要十神</h3>
          ${b.topShishen.map((s) => `<p><span class="tag">${s.name} ×${s.n}</span>${s.text}</p>`).join('')}
        </div>
        <div class="card">
          <h3>五行分布</h3>
          <div class="bars">
            ${FT.WX.map((w) => `
              <div class="bar"><b class="wx-${w}">${w}</b>
                <div class="track"><div class="fill bg-${w}" style="width:${(b.score[w] / max) * 100}%"></div></div>
                <span>${b.count[w]} 個・${(b.score[w] / b.total * 100).toFixed(0)}%</span></div>`).join('')}
          </div>
          <p class="small muted" style="margin-top:8px">個數＝天干地支字數；百分比含地支藏干與月令加權。${b.missing.length ? `<b class="wx-火">八字缺「${b.missing.join('、')}」</b>。` : '五行俱全。'}</p>
          <h3 style="margin-top:12px">日主強弱：${b.level}</h3>
          <div class="meter"><i style="left:${pos}%"></i></div>
          <div class="meter-scale"><span>身弱</span><span>中和</span><span>身強</span></div>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h3>喜用神與開運建議</h3>
        <div class="grid g2">
          ${el(b.yong, '用神')}
          ${el(b.xi, '喜神')}
        </div>
        <dl class="kv" style="margin-top:12px">
          <dt>幸運顏色</dt><dd>${TX.wuxing[b.yong].color}；${TX.wuxing[b.xi].color}</dd>
          <dt>有利方位</dt><dd>${TX.wuxing[b.yong].dir}、${TX.wuxing[b.xi].dir}</dd>
          <dt>幸運數字</dt><dd>${TX.wuxing[b.yong].num}、${TX.wuxing[b.xi].num}</dd>
          <dt>適合行業</dt><dd>${TX.wuxing[b.yong].job}</dd>
        </dl>
        <p class="small muted" style="margin-top:10px">此為依五行力量比例的簡易推估；正式論命另需考量格局、調候、合沖等，僅供參考。</p>
      </div>

      <div class="card" style="margin-top:14px">
        <h3>大運（每十年一運）</h3>
        <p class="small muted">起運：出生後 ${b.yunStart}（約 ${b.yunStartSolar}）</p>
        <div class="dayun">
          ${b.dayun.map((d) => `<div class="${d.current ? 'now' : ''}">
            <b>${wxSpan(d.gz[0])}${wxSpan(d.gz[1])}</b><small>${d.startAge}–${d.endAge} 歲</small><small>${d.startYear}–${d.endYear}</small>${d.current ? '<small class="wx-火">目前大運</small>' : ''}</div>`).join('')}
        </div>
      </div>`;
  }

  function ziweiPanel(r) {
    const z = r.ziwei;
    if (!z) return `<h2>紫微斗數</h2>${needTime('紫微斗數排盤')}`;
    const POS = { 巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4], 辰: [2, 1], 酉: [2, 4], 卯: [3, 1], 戌: [3, 4], 寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4] };
    const mu = (m) => m ? `<span class="mu ${m}">${m}</span>` : '';
    const cell = (p) => {
      const [row, col] = POS[p.branch];
      const cls = ['cell', p.isDecadal ? 'dec' : '', p.isYearly ? 'yr' : '', p.name === '命宮' ? 'soul' : ''].join(' ');
      const pname = p.name === '命宮' ? '命宮' : p.name + '宮';
      return `<div class="${cls}" style="grid-area:${row}/${col}" title="${esc(pname)}：${esc(TX.palaces[p.name])}">
        <div class="stars">
          <div>${p.major.map((s) => `<span class="major">${s.name}<small>${s.brightness}</small>${mu(s.mutagen)}</span>`).join('')}</div>
          <div>${p.minor.map((s) => `<span class="minor ${s.type}">${s.name}${mu(s.mutagen)}</span>`).join('')}</div>
          <div class="adj">${p.adj.join(' ')}</div>
        </div>
        <div class="foot">
          <div><div class="range">${p.decadal[0]}–${p.decadal[1]}</div><div class="range">${p.changsheng}・${p.boshi}</div></div>
          <div style="text-align:right"><div class="pname">${pname}${p.isBody ? '<span class="body">身</span>' : ''}</div><div class="gz">${p.stem}${p.branch}</div></div>
        </div>
      </div>`;
    };
    const starText = (stars) => stars.map((s) => `<p><b class="serif">${s.name}</b>${s.brightness ? `（${s.brightness}）` : ''} <span class="tag">${TX.majorStars[s.name].kw}</span><br>${TX.majorStars[s.name].text}</p>`).join('');
    return `
      <h2>紫微斗數命盤</h2>
      <p class="lead">依出生時辰安十二宮與星曜，命宮主星代表你的核心性格。</p>
      <div class="zw-wrap">
        <div class="zw">
          ${z.palaces.map(cell).join('')}
          <div class="center">
            <h3>${fullName(r) || '命盤'}</h3>
            <dl class="kv">
              <dt>性別</dt><dd>${r.input.gender}・${z.info.fiveElementsClass}</dd>
              <dt>國曆</dt><dd>${r.solar.y}-${r.solar.m}-${r.solar.d} ${String(r.solar.h).padStart(2, '0')}:${String(r.solar.mi).padStart(2, '0')}</dd>
              <dt>農曆</dt><dd>${z.info.lunarDate} ${z.info.time}</dd>
              <dt>四柱</dt><dd>${z.info.chineseDate}</dd>
              <dt>命主</dt><dd>${z.info.soulMaster}　身主 ${z.info.bodyMaster}</dd>
              <dt>目前</dt><dd>虛歲 ${z.info.nominalAge}・大限 ${z.info.decadal}・流年 ${z.info.yearly}</dd>
            </dl>
          </div>
        </div>
      </div>
      <div class="legend">
        <span><i style="background:var(--gold-soft)"></i>目前大限宮位</span>
        <span><i style="box-shadow:inset 0 0 0 2px var(--red)"></i>今年流年宮位</span>
        <span><span class="mu 祿">祿</span><span class="mu 權">權</span><span class="mu 科">科</span><span class="mu 忌">忌</span> 生年四化</span>
        <span>星曜旁小字為亮度：廟 旺 得 利 平 不 陷</span>
      </div>

      <div class="grid g2" style="margin-top:14px">
        <div class="card">
          <h3>命宮（${z.soul.stem}${z.soul.branch}）${z.borrowed ? '<span class="tag">無主星，借遷移宮</span>' : ''}</h3>
          ${starText(z.soulStars)}
          ${z.soul.minor.length ? `<p class="small muted">同宮輔星：${z.soul.minor.map((s) => `${s.name}（${TX.minorStars[s.name] || ''}）`).join('、')}</p>` : ''}
        </div>
        <div class="card">
          <h3>身宮在${z.body.name === '命宮' ? '命宮' : z.body.name + '宮'}</h3>
          <p>身宮代表後天努力的方向與中年後的重心，你的身宮落在「${z.body.name}」，意味著人生重心偏向<b>${TX.palaces[z.body.name]}</b>。</p>
          <h3 style="margin-top:12px">生年四化</h3>
          ${z.mutagens.map((m) => `<p><span class="mu ${m.mutagen}">${m.mutagen}</span> <b>${m.name}化${m.mutagen}</b>・在${m.palace === '命宮' ? '命宮' : m.palace + '宮'}（${TX.palaces[m.palace]}）<br><span class="small muted">${TX.mutagen[m.mutagen]}</span></p>`).join('')}
        </div>
      </div>

      <div class="grid g4" style="margin-top:14px">
        ${z.keyPalaces.map((k) => `
          <div class="card">
            <h3>${k.name}宮</h3>
            <p class="small muted">${TX.palaces[k.name]}${k.borrowed ? '（無主星，借對宮）' : ''}</p>
            ${k.stars.map((s) => `<p><b class="serif">${s.name}</b>：${TX.majorStars[s.name].kw}</p>`).join('') || '<p class="muted">—</p>'}
            ${k.minor.length ? `<p class="small muted">${k.minor.map((s) => s.name).join('、')}</p>` : ''}
          </div>`).join('')}
      </div>`;
  }

  function namePanel(r) {
    const n = r.name;
    if (!n) return `<h2>姓名學</h2><div class="card"><p class="muted">未輸入姓名。請返回上方填寫中文姓名後重新排盤。</p></div>`;
    if (n.error) return `<h2>姓名學</h2><div class="card"><p class="wx-火">${esc(n.error)}</p></div>`;
    const sur = n.chars.filter((c) => c.part === '姓'), giv = n.chars.filter((c) => c.part === '名');
    const charBox = (c) => `<div class="nchar"><b>${esc(c.c)}</b><span>${c.strokes} 畫<br><span class="wx-${c.wx}">${c.wx}</span></span></div>`;
    const virt = '<div class="nchar virtual"><b>〇</b><span>假借<br>1 畫</span></div>';
    const g = Object.fromEntries(n.ge.map((x) => [x.name, x]));
    const box = (x) => `<div class="gebox"><div class="t">${x.name}</div><div class="n wx-${x.wx}">${x.n}</div><div class="t">${x.wx}・${luck(x.luck)}</div></div>`;
    const [tw, rw, dw] = n.sancai.wx;
    return `
      <h2>姓名學・五格剖象</h2>
      <p class="lead">以康熙字典筆畫計算天、人、地、外、總五格，配合 81 數理與三才五行。</p>
      <div class="grid g2">
        <div class="card">
          <div class="name-diagram">
            <div class="ge-left">${box(g['外格'])}</div>
            <div class="name-chars">${sur.length === 1 ? virt : ''}${sur.map(charBox).join('')}${giv.map(charBox).join('')}${giv.length === 1 ? virt : ''}</div>
            <div class="ge-right">${box(g['天格'])}${box(g['人格'])}${box(g['地格'])}</div>
            <div class="ge-total">${box(g['總格'])}</div>
          </div>
          <p class="small muted" style="text-align:center">單姓上方、單名下方各加假借數 1。筆畫依康熙字典（部首還原，如 氵=水 4 畫、艹=艸 6 畫）。</p>
        </div>
        <div class="card">
          <h3>三才配置 ${luck(n.sancai.rating)}</h3>
          <div class="sancai"><span class="wx-${tw}">${tw}</span><i>天</i><span class="wx-${rw}">${rw}</span><i>人</i><span class="wx-${dw}">${dw}</span><i>地</i></div>
          <p>${luck(n.sancai.upper[0])} ${n.sancai.upper[1]}</p>
          <p>${luck(n.sancai.lower[0])} ${n.sancai.lower[1]}</p>
          <h3 style="margin-top:12px">人格性格</h3>
          <p>${n.personality}</p>
          ${n.baziMatch ? `<h3 style="margin-top:12px">姓名與八字搭配 ${luck(n.baziMatch[0] === '相輔' || n.baziMatch[0] === '良好' ? '吉' : n.baziMatch[0] === '待加強' ? '凶' : '平')}</h3><p>${n.baziMatch[1]}</p>` : ''}
        </div>
      </div>
      <div class="card scroll-x" style="margin-top:14px">
        <table class="ge-table">
          <thead><tr><th>五格</th><th>數</th><th>五行</th><th>吉凶</th><th>數理</th><th>意義</th></tr></thead>
          <tbody>
            ${n.ge.map((x) => `<tr>
              <td><b class="serif">${x.name}</b></td><td class="num wx-${x.wx}">${x.n}</td><td class="wx-${x.wx}">${x.wx}</td><td>${luck(x.luck)}</td>
              <td><b>${x.title}</b><br><span class="small">${x.text}</span></td><td class="small muted">${x.meaning}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function bonePanel(r) {
    const b = r.bone;
    if (!b) return `<h2>袁天罡稱骨算命</h2>${needTime('稱骨算命')}`;
    const pos = ((b.total - 21) / (72 - 21)) * 100;
    return `
      <h2>袁天罡稱骨算命</h2>
      <p class="lead">相傳為唐代袁天罡所創，以農曆出生年、月、日、時各有「骨重」，加總後對照稱骨歌，農民曆上的「幾兩重」即出於此。</p>
      <div class="card">
        <div class="bone">
          ${b.parts.map((p) => `<div><small>${p.label}</small><b>${p.text}</b></div>`).join('')}
        </div>
        <div class="bone-total">
          <div class="muted">你的骨重</div>
          <div class="w">${b.text}</div>
        </div>
        <div class="scale"><i style="left:${pos}%"></i></div>
        <div class="meter-scale"><span>2兩1錢（最輕）</span><span>7兩2錢（最重）</span></div>
        <div class="verse">${b.verse.replace(/，/g, '，<br>').replace(/。$/, '')}</div>
        <h3>白話解說</h3>
        <p>${b.summary}</p>
        <p class="small muted">稱骨歌流傳版本眾多、字句略有差異，男女命另有不同歌訣版本；此處採常見通行版。骨重輕重並非好壞定論，重在提醒人生節奏與努力方向。</p>
      </div>`;
  }

  function almanacPanel(r) {
    const a = r.almanac;
    return `
      <h2>出生日農民曆</h2>
      <p class="lead">你出生那一天的黃曆資訊。</p>
      <div class="grid g2">
        <div class="card">
          <h3>${a.lunar}</h3>
          <dl class="kv">
            <dt>干支</dt><dd class="serif">${a.ganzhi}</dd>
            <dt>節氣</dt><dd>${a.jieqi}</dd>
            <dt>建除</dt><dd>${a.zhixing}</dd>
            <dt>值神</dt><dd>${a.tianshen}</dd>
            <dt>星宿</dt><dd>${a.xiu}</dd>
            <dt>九星</dt><dd>${a.nineStar}</dd>
            <dt>沖煞</dt><dd>${a.chong}</dd>
            <dt>胎神</dt><dd>${a.tai}</dd>
            <dt>方位</dt><dd>${a.positions}</dd>
            <dt>月相</dt><dd>${a.yuexiang}・物候「${a.wuhou}」</dd>
          </dl>
        </div>
        <div class="card">
          <dl class="yiji">
            <dt class="yi">宜</dt><dd>${a.yi || '—'}</dd>
            <dt class="ji">忌</dt><dd>${a.ji || '—'}</dd>
          </dl>
          <dl class="kv" style="margin-top:14px">
            <dt>吉神宜趨</dt><dd>${a.jishen || '—'}</dd>
            <dt>凶煞宜忌</dt><dd>${a.xiongsha || '—'}</dd>
            <dt>彭祖百忌</dt><dd>${a.pengzu}</dd>
            <dt>生肖納音</dt><dd>${r.zodiac.yearGZ}年・${r.zodiac.nayin}</dd>
            ${r.bone ? `<dt>稱骨</dt><dd>${r.bone.text}</dd>` : ''}
          </dl>
        </div>
      </div>`;
  }
})();
