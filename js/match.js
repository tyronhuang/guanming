// 合婚頁面：表單與結果渲染
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TX = window.TEXTS;
  const STORE_KEY = 'guanming.match';
  const CN_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
  const PEOPLE = [
    { key: 'g', role: '新郎', gender: '男', sample: ['林', '志明'] },
    { key: 'b', role: '新娘', gender: '女', sample: ['陳', '雅婷'] }
  ];
  const pad = (n) => String(n).padStart(2, '0');

  // ───────── 表單 ─────────
  function personForm({ key, role, sample }) {
    return `
      <fieldset class="card person ${key}">
        <legend class="badge ${key}">${role}</legend>
        <div class="row">
          <label class="field"><span>姓</span><input id="${key}-surname" class="surname" maxlength="2" placeholder="例：${sample[0]}"></label>
          <label class="field grow"><span>名</span><input id="${key}-given" maxlength="3" placeholder="例：${sample[1]}"></label>
        </div>
        <div class="row">
          <div class="field">
            <span>曆法</span>
            <div class="seg" role="radiogroup" aria-label="${role}曆法">
              <label><input type="radio" name="${key}-calendar" value="solar" checked><b>國曆</b></label>
              <label><input type="radio" name="${key}-calendar" value="lunar"><b>農曆</b></label>
            </div>
          </div>
          <label class="field grow" id="${key}-solarBox">
            <span>出生日期（國曆）</span>
            <input id="${key}-solarDate" type="date" min="1900-01-31" max="2100-12-31" value="1990-01-01">
          </label>
          <div class="field grow" id="${key}-lunarBox" hidden>
            <span>出生日期（農曆）</span>
            <div class="inline">
              <input id="${key}-lYear" class="lyear" type="number" min="1900" max="2100" value="1990" aria-label="農曆年"><em>年</em>
              <select id="${key}-lMonth" aria-label="農曆月">${CN_MONTH.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select><em>月</em>
              <select id="${key}-lDay" aria-label="農曆日">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select><em>日</em>
              <label class="check"><input id="${key}-lLeap" type="checkbox">閏月</label>
            </div>
          </div>
        </div>
        <div class="row">
          <label class="field"><span>出生時間</span><input id="${key}-time" type="time" value="12:00"></label>
          <label class="check tall"><input id="${key}-unknown" type="checkbox">不知道出生時辰</label>
        </div>
      </fieldset>`;
  }
  $('couple').innerHTML = PEOPLE.map(personForm).join('');

  const calendarOf = (key) => document.querySelector(`input[name="${key}-calendar"]:checked`).value;
  function sync(key) {
    const lunar = calendarOf(key) === 'lunar';
    $(`${key}-solarBox`).hidden = lunar;
    $(`${key}-lunarBox`).hidden = !lunar;
    $(`${key}-time`).disabled = $(`${key}-unknown`).checked;
  }
  PEOPLE.forEach(({ key }) => {
    document.querySelectorAll(`input[name="${key}-calendar"]`).forEach((el) => el.addEventListener('change', () => sync(key)));
    $(`${key}-unknown`).addEventListener('change', () => sync(key));
  });

  function readPerson({ key, role, gender }) {
    const input = {
      surname: $(`${key}-surname`).value.trim(), given: $(`${key}-given`).value.trim(),
      gender, calendar: calendarOf(key), hourUnknown: $(`${key}-unknown`).checked
    };
    if (input.calendar === 'solar') {
      const v = $(`${key}-solarDate`).value;
      if (!v) throw new Error(`請選擇${role}的出生日期。`);
      [input.year, input.month, input.day] = v.split('-').map(Number);
    } else {
      input.year = Number($(`${key}-lYear`).value); input.month = Number($(`${key}-lMonth`).value);
      input.day = Number($(`${key}-lDay`).value); input.leap = $(`${key}-lLeap`).checked;
    }
    const [h, m] = ($(`${key}-time`).value || '12:00').split(':').map(Number);
    input.hour = h; input.minute = m;
    if (input.given && !input.surname) throw new Error(`請輸入${role}的姓氏。`);
    try { FT.validateInput(input); } catch (e) { throw new Error(`${role}：${e.message}`); }
    return input;
  }
  function writePerson({ key }, v) {
    $(`${key}-surname`).value = v.surname || ''; $(`${key}-given`).value = v.given || '';
    document.querySelector(`input[name="${key}-calendar"][value="${v.calendar === 'lunar' ? 'lunar' : 'solar'}"]`).checked = true;
    if (v.calendar === 'lunar') {
      $(`${key}-lYear`).value = v.year; $(`${key}-lMonth`).value = v.month; $(`${key}-lDay`).value = v.day; $(`${key}-lLeap`).checked = !!v.leap;
    } else {
      $(`${key}-solarDate`).value = `${v.year}-${pad(v.month)}-${pad(v.day)}`;
    }
    $(`${key}-time`).value = `${pad(v.hour ?? 12)}:${pad(v.minute ?? 0)}`;
    $(`${key}-unknown`).checked = !!v.hourUnknown;
    sync(key);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) PEOPLE.forEach((p) => saved[p.key] && writePerson(p, saved[p.key]));
  } catch (e) { /* 無儲存資料 */ }

  // 網址參數：?g=林,志明&gd=1988-08-08&gt=09:00&b=陳,雅婷&bd=1990-05-17&bt=10:30（可加 gc=lunar&gl=1）
  const qs = new URLSearchParams(location.search);
  if (qs.get('gd') && qs.get('bd')) {
    PEOPLE.forEach((p) => {
      const [surname = '', given = ''] = (qs.get(p.key) || '').split(',');
      const [year, month, day] = qs.get(`${p.key}d`).split('-').map(Number);
      const [hour = 12, minute = 0] = (qs.get(`${p.key}t`) || '').split(':').map(Number);
      writePerson(p, { surname, given, calendar: qs.get(`${p.key}c`), leap: qs.get(`${p.key}l`) === '1', year, month, day, hour, minute, hourUnknown: !qs.get(`${p.key}t`) });
    });
    setTimeout(() => $('form').requestSubmit(), 0);
  }

  $('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const err = $('error');
    err.hidden = true;
    let inputs, people, m;
    try {
      inputs = PEOPLE.map(readPerson);
      people = inputs.map((input) => FT.analyze(input));
      m = FT.match(people[0], people[1]);
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ g: inputs[0], b: inputs[1] })); } catch (e) { /* 忽略 */ }
    } catch (e) {
      err.textContent = e.message || '計算時發生錯誤，請確認輸入內容。';
      err.hidden = false;
      console.error(e);
      return;
    }
    render(people, inputs, m);
  });

  // ───────── 渲染 ─────────
  const displayName = (r, role) => esc(`${r.input.surname}${r.input.given}`) || role;
  function personalLink(input) {
    const p = new URLSearchParams({ name: `${input.surname},${input.given}`, sex: input.gender, date: `${input.year}-${pad(input.month)}-${pad(input.day)}` });
    if (input.calendar === 'lunar') p.set('cal', 'lunar');
    if (input.leap) p.set('leap', '1');
    if (!input.hourUnknown) p.set('time', `${pad(input.hour)}:${pad(input.minute)}`);
    return `index.html?${p}`;
  }

  function ring(score) {
    const r = 54, c = 2 * Math.PI * r;
    return `
      <svg class="ring" viewBox="0 0 140 140" role="img" aria-label="契合度 ${score} 分">
        <circle class="bgc" cx="70" cy="70" r="${r}" fill="none" stroke-width="10"/>
        <circle class="fg" cx="70" cy="70" r="${r}" fill="none" stroke-width="10" stroke-linecap="round"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - score / 100)).toFixed(1)}" transform="rotate(-90 70 70)"/>
        <text class="num" x="70" y="76" text-anchor="middle">${score}</text>
        <text class="unit" x="70" y="98" text-anchor="middle">契合度</text>
      </svg>`;
  }

  function profile(r, role, key, input) {
    const z = r.ziwei;
    const spouse = z ? z.keyPalaces.find((k) => k.name === '夫妻') : null;
    return `
      <div class="card profile ${key}">
        <h3><span class="badge ${key}">${role}</span> ${displayName(r, role)}</h3>
        <p class="small muted">國曆 ${r.solar.y}/${r.solar.m}/${r.solar.d}・農曆 ${r.lunarText}・${r.timeZhi}</p>
        <dl class="kv">
          <dt>八字</dt><dd class="serif">${r.bazi.cols.map((c) => c.gan + c.zhi).join(' ')}</dd>
          <dt>生肖</dt><dd>屬${r.zodiac.animal}・${r.zodiac.nayin}命</dd>
          <dt>星座</dt><dd>${r.western.sym} ${r.western.name}</dd>
          <dt>日主</dt><dd>${r.bazi.dayGan}${r.bazi.dayWx}（${r.bazi.dayMaster.img}）・喜用 ${r.bazi.yong}${r.bazi.xi}</dd>
          ${z ? `<dt>紫微命宮</dt><dd>${z.soulStars.map((s) => s.name).join('、')}</dd>
          <dt>夫妻宮</dt><dd>${spouse.stars.map((s) => `${s.name}（${TX.majorStars[s.name].kw}）`).join('、')}${spouse.borrowed ? '・借對宮' : ''}</dd>` : ''}
          <dt>愛情觀</dt><dd>${r.western.love}</dd>
        </dl>
        <p class="small" style="margin-top:10px"><a href="${personalLink(input)}">查看${role}完整個人命盤 →</a></p>
      </div>`;
  }

  function methodCard(mt) {
    return `
      <div class="card method">
        <div class="mhead"><span class="cat">${mt.cat}</span><h3>${mt.title}</h3><span class="luck ${mt.verdict}">${mt.verdict}</span></div>
        <div class="vs"><b class="g">${esc(mt.left)}</b><span class="x">✕</span><b class="b">${esc(mt.right)}</b></div>
        <div class="mbar"><div class="track"><div class="fill" style="width:${mt.score}%"></div></div><span>${mt.score}</span></div>
        <p>${mt.text}</p>
      </div>`;
  }

  function render(people, inputs, m) {
    const [g, b] = people;
    $('result').innerHTML = `
      <div class="card score-hero">
        ${ring(m.total)}
        <div class="score-text">
          <p class="couple-names">${displayName(g, '新郎')} <span class="heart">❤</span> ${displayName(b, '新娘')}</p>
          <div class="grade">${m.grade}</div>
          <p>${m.gradeText}</p>
          <p class="small">最契合：${m.strengths.map((s) => `<span class="tag">${s.title} ${s.score}</span>`).join('')}</p>
          <p class="small">需留意：${m.weaknesses.map((s) => `<span class="tag">${s.title} ${s.score}</span>`).join('')}</p>
          <p class="small muted">綜合 ${m.methods.length} 項傳統合婚指標加權計算${m.skipped.length ? `（未計入：${m.skipped.join('；')}）` : ''}</p>
        </div>
      </div>

      <div class="couple">
        ${profile(g, '新郎', 'g', inputs[0])}
        ${profile(b, '新娘', 'b', inputs[1])}
      </div>

      <h2 class="section-title">各項合婚分析</h2>
      <div class="grid g2">${m.methods.map(methodCard).join('')}</div>

      <div class="card tips" style="margin-top:14px">
        <h3>相處建議</h3>
        <ul>${m.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>

      <div class="actions">
        <button type="button" class="ghost" id="printBtn">列印 / 另存 PDF</button>
        <button type="button" class="ghost" id="editBtn">重新輸入</button>
      </div>`;
    $('result').hidden = false;
    $('printBtn').onclick = () => window.print();
    $('editBtn').onclick = () => { $('form').scrollIntoView({ behavior: 'smooth' }); $('g-surname').focus(); };
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
