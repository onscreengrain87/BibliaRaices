'use strict';
/* Biblia Raíces — lector bíblico con texto original */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('br_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('br_' + k, JSON.stringify(v)); } catch (e) { } }
};

const DEFAULTS = {
  primary: 'SpaRV', showOrig: true, origNT: 'TR', layout: 'stack', theme: 'night', size: 19,
  divine: 'Jehová', yeshua: false, hideBars: true
};
let S = Object.assign({}, DEFAULTS, LS.get('settings', {}));
let POS = LS.get('pos', { b: 1, c: 1 });
let MARKS = LS.get('marks', {});           // "b.c.v" -> {hl, bm, note, t}
let VERSIONS = [], LEXAVAIL = [];
const LEX = {};
const cache = new Map();
const save = () => { LS.set('settings', S); };
const saveMarks = () => LS.set('marks', MARKS);

/* ---------- Datos ---------- */
async function loadJSON(p) { const r = await fetch('../' + p); if (!r.ok) throw new Error(p); return r.json(); }
function getBook(vid, b) {
  const k = vid + '/' + b;
  if (cache.has(k)) return cache.get(k);
  const p = loadJSON('bible/' + k + '.json').catch(() => null);
  cache.set(k, p);
  if (cache.size > 90) cache.delete(cache.keys().next().value);
  return p;
}
const ver = id => VERSIONS.find(v => v.id === id);
const hasBook = (v, b) => v && v.books.includes(b);
const spanish = () => VERSIONS.filter(v => v.lang === 'es');
function origFor(b) {
  if (b <= 39) return VERSIONS.find(v => v.lang === 'he' && hasBook(v, b));
  return ver(S.origNT) && hasBook(ver(S.origNT), b) ? ver(S.origNT) : VERSIONS.find(v => v.lang === 'grc' && hasBook(v, b));
}
async function getLex(k) { if (!LEX[k]) LEX[k] = loadJSON('lex/' + k + '.json').catch(() => ({})); return LEX[k]; }

/* ---------- Transformaciones (Nombre divino / Yeshúa) ---------- */
const L = '\\p{L}';
const RX = {
  divine: new RegExp(`(?<!${L})(JEHOVÁ|Jehová|Jehovah|JEHOVAH|Jehova)(?!${L})`, 'gu'),
  jc: new RegExp(`(?<!${L})Jesucristo(?!${L})`, 'gu'),
  jesus: new RegExp(`(?<!${L})(Jesús|JESÚS)(?!${L})`, 'gu'),
  cristo: new RegExp(`(?<!${L})Cristo(?!${L})`, 'gu')
};
function xform(t, lang) {
  if (lang !== 'es' || !t) return t;
  if (S.divine !== 'Jehová') t = t.replace(RX.divine, S.divine);
  if (S.yeshua) t = t.replace(RX.jc, 'Yeshúa el Mesías').replace(RX.jesus, 'Yeshúa').replace(RX.cristo, 'Mesías');
  return t;
}
const plain = v => Array.isArray(v) ? v.map(w => w[0]).join(' ') : (v || '');
const refStr = (b, c, v) => `${BOOKS[b - 1].es} ${c}${v ? ':' + v : ''}`;

/* ---------- Lector ---------- */
const reader = $('#reader');
async function render(scrollTo) {
  const { b, c } = POS, bk = BOOKS[b - 1];
  const P = ver(S.primary) || spanish()[0];
  const O = S.showOrig ? origFor(b) : null;
  $('#refTxt').textContent = `${bk.es} ${c}`;
  $('#verBtn').textContent = P ? P.short : '—';
  $('#origBtn').classList.toggle('on', !!S.showOrig);
  document.body.classList.toggle('lay-cols', S.layout === 'cols');
  reader.innerHTML = '<div class="spin"></div>';

  const [pd, od] = await Promise.all([P && hasBook(P, b) ? getBook(P.id, b) : null, O ? getBook(O.id, b) : null]);
  if (POS.b !== b || POS.c !== c) return;
  const pv = (pd && pd[c - 1]) || [], ov = (od && od[c - 1]) || [];
  const n = Math.max(pv.length, ov.length);
  let h = `<header class="chap-head">${bk.he ? `<div class="he">${bk.he}</div>` : ''}
    <h1>${esc(bk.es)} <b>${c}</b></h1>${bk.tr ? `<div class="tr">${esc(bk.tr)}</div>` : ''}
    <div class="verlbl">${P ? esc(P.short) : ''}${O ? ' · ' + esc(O.short) : ''}</div></header>`;
  if (!n) h += `<div class="empty">${P && !hasBook(P, b) ? `${esc(P.name)} no incluye este libro.<br>Cambia de versión arriba.` : 'Capítulo no disponible.'}</div>`;
  for (let i = 0; i < n; i++) {
    const v = i + 1, k = `${b}.${c}.${v}`, m = MARKS[k] || {};
    const cls = ['v', m.hl ? 'hl-' + m.hl : '', m.bm ? 'bm' : '', O && ov[i] ? 'has-or' : ''].join(' ');
    h += `<div class="${cls}" data-v="${v}" id="v${v}"><div class="es-wrap"><span class="es"><sup>${v}</sup>${esc(xform(pv[i], 'es')) || '<span class="muted">—</span>'}</span>${m.note ? ' <i class="nt">✎</i>' : ''}</div>`;
    if (O && ov[i]) {
      const o = ov[i];
      const inner = Array.isArray(o) ? o.map(w => `<span class="w" data-s="${w[1]}">${esc(w[0])}</span>`).join(' ') : esc(o);
      h += `<div class="or ${O.dir}" lang="${O.lang}">${inner}</div>`;
    }
    h += '</div>';
  }
  const first = b === 1 && c === 1, last = b === 66 && c === 22;
  h += `<div class="chap-nav"><button id="prevC" ${first ? 'disabled' : ''}>‹ Anterior</button><button id="nextC" ${last ? 'disabled' : ''}>Siguiente ›</button></div>`;
  reader.innerHTML = h;
  $('#prevC').onclick = () => step(-1);
  $('#nextC').onclick = () => step(1);
  const view = $('#v-read');
  if (scrollTo) {
    const el = $('#v' + scrollTo);
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); }
  } else view.scrollTop = 0;
}
function goTo(b, c, v) {
  POS = { b, c: Math.max(1, Math.min(c, BOOKS[b - 1].ch)) };
  LS.set('pos', POS);
  showView('read');
  render(v);
}
function step(d) {
  let { b, c } = POS;
  c += d;
  if (c < 1) { if (b === 1) return; b--; c = BOOKS[b - 1].ch; }
  else if (c > BOOKS[b - 1].ch) { if (b === 66) return; b++; c = 1; }
  goTo(b, c);
}

reader.addEventListener('click', e => {
  const w = e.target.closest('.w');
  if (w && +w.dataset.s) { showLex(+w.dataset.s, w); return; }
  const v = e.target.closest('.v');
  if (v) verseSheet(+v.dataset.v);
});

// deslizar para cambiar capítulo
let tx0 = 0, ty0 = 0, tt0 = 0;
reader.addEventListener('touchstart', e => { const t = e.touches[0]; tx0 = t.clientX; ty0 = t.clientY; tt0 = Date.now(); }, { passive: true });
reader.addEventListener('touchend', e => {
  const t = e.changedTouches[0], dx = t.clientX - tx0, dy = t.clientY - ty0;
  if (Math.abs(dx) > 80 && Math.abs(dy) < 60 && Date.now() - tt0 < 600) step(dx < 0 ? 1 : -1);
});
// ocultar barras al leer
let lastY = 0;
$('#v-read').addEventListener('scroll', e => {
  if (!S.hideBars) return;
  const y = e.target.scrollTop, down = y > lastY + 6, up = y < lastY - 6;
  if (down && y > 120) { $('#top').classList.add('hide'); $('#bottom').classList.add('hide'); }
  if (up) { $('#top').classList.remove('hide'); $('#bottom').classList.remove('hide'); }
  if (down || up) lastY = y;
});

/* ---------- Hojas ---------- */
function openSheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').classList.add('on'); $('#sheet .sheet').scrollTop = 0; }
function closeSheet() { $('#sheet').classList.remove('on'); $$('.w.sel').forEach(x => x.classList.remove('sel')); }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1800); }
async function copy(t) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
  toast('Copiado');
}

/* ---------- Acciones de versículo ---------- */
const refreshAfter = v => (curView === 'par' && window.renderParasha) ? renderParasha(true) : render(v);
const COLORS = { gold: '#e8b84a', green: '#6fbf7a', blue: '#5b9be0', rose: '#e0708a', violet: '#9b7be0' };
async function verseSheet(v, b = POS.b, c = POS.c) {
  const k = `${b}.${c}.${v}`, m = MARKS[k] || {};
  const P = ver(S.primary);
  const pd = P ? await getBook(P.id, b) : null;
  const txt = xform((pd && pd[c - 1] && pd[c - 1][v - 1]) || '', 'es');
  openSheet(`<h3>${esc(refStr(b, c, v))} <small>${P ? P.short : ''}</small></h3>
    <div class="quote">${esc(txt)}</div>
    <div class="swatches">${Object.entries(COLORS).map(([n, col]) => `<button class="sw ${m.hl === n ? 'on' : ''}" data-c="${n}" style="background:${col}"></button>`).join('')}
      <button class="sw none" data-c="">✕</button></div>
    <div class="actions">
      <button id="aBm" class="${m.bm ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-4-5 4z"/></svg>${m.bm ? 'Guardado' : 'Marcar'}</button>
      <button id="aNote"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>Nota</button>
      <button id="aCopy"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>Copiar</button>
      <button id="aShare"><svg viewBox="0 0 24 24"><path d="M12 4v12M7 9l5-5 5 5M5 14v5h14v-5"/></svg>Compartir</button>
    </div>
    <div class="sect">Versiones modernas (abre en línea)</div>
    <div class="chips">${ONLINE.map(x => `<button class="chip" data-o="${x}">${x}</button>`).join('')}</div>
    <div class="sect">Todas las versiones</div><div id="cmpBox"><div class="spin"></div></div>`);
  const upd = patch => { MARKS[k] = Object.assign({}, MARKS[k], patch, { t: Date.now() }); const x = MARKS[k]; if (!x.hl && !x.bm && !x.note) delete MARKS[k]; saveMarks(); };
  $$('.sw', $('#sheetBody')).forEach(s => s.onclick = () => { upd({ hl: s.dataset.c }); closeSheet(); refreshAfter(v); });
  $('#aBm').onclick = () => { upd({ bm: !m.bm }); toast(m.bm ? 'Marcador quitado' : 'Marcador guardado'); closeSheet(); refreshAfter(v); };
  $$('.chip', $('#sheetBody')).forEach(x => x.onclick = () => openOnline(b, c, v, x.dataset.o));
  $('#aCopy').onclick = () => copy(`${txt}\n— ${refStr(b, c, v)} (${P.short})`);
  $('#aShare').onclick = () => { const t = `${txt}\n— ${refStr(b, c, v)} (${P.short})`; window.Android ? Android.share(t) : copy(t); };
  $('#aNote').onclick = () => {
    openSheet(`<h3>Nota · ${esc(refStr(b, c, v))}</h3><div class="quote">${esc(txt)}</div><br>
      <textarea id="noteTx" placeholder="Raíz hebrea, contexto, conexión con la Torá...">${esc(m.note || '')}</textarea>
      <button class="btn gold full" id="noteSave">Guardar nota</button>`);
    $('#noteTx').focus();
    $('#noteSave').onclick = () => { upd({ note: $('#noteTx').value.trim() }); closeSheet(); refreshAfter(v); toast('Nota guardada'); };
  };
  // comparar
  const rows = await Promise.all(VERSIONS.filter(x => hasBook(x, b)).map(async x => {
    const d = await getBook(x.id, b); const t = d && d[c - 1] && d[c - 1][v - 1];
    return t ? `<div class="cmp"><div class="lb">${esc(x.short)} · ${esc(x.name)}</div><div class="tx ${x.dir}">${esc(xform(plain(t), x.lang))}</div></div>` : '';
  }));
  const box = $('#cmpBox'); if (box) box.innerHTML = rows.join('') || '<div class="muted">Sin datos.</div>';
}

/* ---------- Versiones con derechos de autor: se abren en BibleGateway ---------- */
const ONLINE = ['RVR1960', 'NVI', 'LBLA', 'NBLA', 'NTV', 'DHH', 'RVA-2015', 'RVC', 'TLA', 'PDT', 'BLP', 'NBV'];
const EN_BOOKS = 'Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth 1Samuel 2Samuel 1Kings 2Kings 1Chronicles 2Chronicles Ezra Nehemiah Esther Job Psalms Proverbs Ecclesiastes SongofSongs Isaiah Jeremiah Lamentations Ezekiel Daniel Hosea Joel Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah Malachi Matthew Mark Luke John Acts Romans 1Corinthians 2Corinthians Galatians Ephesians Philippians Colossians 1Thessalonians 2Thessalonians 1Timothy 2Timothy Titus Philemon Hebrews James 1Peter 2Peter 1John 2John 3John Jude Revelation'.split(' ');
function openOnline(b, c, v, code) {
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(EN_BOOKS[b - 1] + ' ' + c + (v ? ':' + v : ''))}&version=${encodeURIComponent(code)}`;
  if (window.Android && Android.openUrl) Android.openUrl(url); else window.open(url, '_blank');
}

/* ---------- Léxico Strong ---------- */
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const LETTERS = { 'א': 'Álef', 'ב': 'Bet', 'ג': 'Guímel', 'ד': 'Dálet', 'ה': 'He', 'ו': 'Vav', 'ז': 'Záyin', 'ח': 'Jet', 'ט': 'Tet', 'י': 'Yod', 'כ': 'Kaf', 'ל': 'Lámed', 'מ': 'Mem', 'נ': 'Nun', 'ס': 'Sámej', 'ע': 'Áyin', 'פ': 'Pe', 'צ': 'Tsade', 'ק': 'Kof', 'ר': 'Resh', 'ש': 'Shin', 'ת': 'Tav' };
const LEXES = {};
function getLexEs(k) { if (!LEXES[k]) LEXES[k] = loadJSON('lex/' + k + '_es.json').catch(() => ({})); return LEXES[k]; }
async function showLex(num, el, kind = 'H') {
  $$('.w.sel').forEach(x => x.classList.remove('sel'));
  if (el) el.classList.add('sel');
  openSheet('<div class="spin"></div>');
  const [lex, les] = await Promise.all([getLex(kind), getLexEs(kind)]);
  const e = lex[num];
  if (!e) { openSheet(`<h3>${kind}${num}</h3><div class="muted">Léxico no disponible.</div>`); return; }
  const [lemma, xlit, pron, def, deriv, kjv] = e;
  const [esDef, esTr] = les[num] || [];
  const letters = kind === 'H' ? [...lemma.replace(/[\u0591-\u05C7]/g, '')].filter(ch => /[\u05D0-\u05EA]/.test(ch)).map(ch => FINALS[ch] || ch) : [];
  const word = el ? el.textContent : '';
  const vEl = el && el.closest('.v');
  const vb = vEl && +vEl.dataset.b || POS.b, vc = vEl && +vEl.dataset.c || POS.c, vv = vEl && +vEl.dataset.v;
  let ctx = '';
  if (vv) { const P = ver(S.primary); const d = P && hasBook(P, vb) ? await getBook(P.id, vb) : null; ctx = d && d[vc - 1] ? xform(d[vc - 1][vv - 1] || '', 'es') : ''; }
  const trTxt = esTr || kjv || '';
  openSheet(`<div class="lex-head">
      <div class="lex-lemma" ${kind === 'G' ? 'style="direction:ltr;font-family:var(--serif)"' : ''}>${esc(lemma)}</div>
      <div class="lex-meta"><span class="lex-num">${kind}${num}</span><span class="lex-x">${esc(xlit)}${pron ? ' · ' + esc(pron) : ''}</span>
      ${word ? `<span class="lex-word">En el texto: <b>${esc(word)}</b></span>` : ''}</div></div>
    <div class="tr-card"><div class="tr-lb">Traducción</div><div class="tr-tx">${esc(trTxt) || '—'}</div>${!esTr && kjv ? '<div class="tr-note">(en inglés; la traducción al español se genera al compilar)</div>' : ''}</div>
    ${esDef || def ? `<div class="sect">Significado</div><div class="lex-def">${esc(esDef || def)}</div>` : ''}
    ${letters.length ? `<div class="sect">Letras de la palabra</div><div class="root">${letters.map(l => `<span><b>${l}</b><i>${LETTERS[l] || ''}</i></span>`).join('')}</div>` : ''}
    ${ctx ? `<div class="sect">En ${esc(refStr(vb, vc, vv))}</div><div class="quote">${esc(ctx)}</div>` : ''}
    <details class="lex-en"><summary>Strong original (inglés)</summary>
      <div class="lex-sm">${esc(def)}</div>
      ${deriv ? `<div class="lex-sm"><b>Derivación:</b> ${esc(deriv)}</div>` : ''}
      ${kjv ? `<div class="lex-sm"><b>KJV:</b> ${esc(kjv)}</div>` : ''}
    </details>
    ${kind === 'H' ? `<button class="btn gold full" id="lexAll">Ver todas las apariciones de ${kind}${num}</button>` : ''}
    <button class="btn full" id="lexCopy">Copiar</button>`);
  const all = $('#lexAll'); if (all) all.onclick = () => { closeSheet(); showView('search'); $('#q').value = kind + num; runSearch(); };
  $('#lexCopy').onclick = () => copy(`${lemma} (${kind}${num}) ${xlit} — ${trTxt}${esDef ? '\n' + esDef : ''}`);
}

/* ---------- Selector de libro/capítulo ---------- */
let pickTab = POS.b <= 39 ? 'ot' : 'nt';
function openPicker() { pickTab = POS.b <= 39 ? 'ot' : 'nt'; renderPicker(); $('#picker').classList.add('on'); }
function closePicker() { $('#picker').classList.remove('on'); }
$('#picker').addEventListener('click', e => { if (e.target.id === 'picker') closePicker(); });
$('#pickTabs').addEventListener('click', e => { const t = e.target.closest('button'); if (t) { pickTab = t.dataset.t; renderPicker(); } });
function renderPicker(bookSel) {
  $$('#pickTabs button').forEach(x => x.classList.toggle('on', x.dataset.t === pickTab));
  const body = $('#pickBody');
  if (bookSel) {
    const bk = BOOKS[bookSel - 1];
    body.innerHTML = `<button class="back" id="pkBack">‹ Libros</button><h3>${esc(bk.es)} ${bk.he ? `<small style="font-family:var(--heb);font-size:18px;color:var(--ac)">${bk.he}</small>` : ''}</h3>
      <div class="grid ch">${Array.from({ length: bk.ch }, (_, i) => `<button class="bk ${bookSel === POS.b && i + 1 === POS.c ? 'cur' : ''}" data-c="${i + 1}">${i + 1}</button>`).join('')}</div>`;
    $('#pkBack').onclick = () => renderPicker();
    body.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { closePicker(); goTo(bookSel, +x.dataset.c); });
    return;
  }
  if (pickTab === 'par') {
    body.innerHTML = '<div class="muted" style="margin-bottom:10px">Porciones semanales de la Torá (inicio de cada parashá)</div>' +
      PARASHOT.map((p, i) => `<button class="par" data-i="${i}"><span><b>${i + 1}. ${esc(p[0])}</b><small>${esc(refStr(p[2], p[3], p[4]))}</small></span><span class="h">${p[1]}</span></button>`).join('');
    body.querySelectorAll('.par').forEach(x => x.onclick = () => { closePicker(); openParasha(+x.dataset.i); });
    return;
  }
  // orden tradicional en español con secciones aproximadas
  const OTG = [['Torá', [1, 2, 3, 4, 5]], ['Históricos', [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]], ['Poéticos', [18, 19, 20, 21, 22]], ['Profetas mayores', [23, 24, 25, 26, 27]], ['Profetas menores', [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]]];
  const NTG = [['Besorot · Evangelios', [40, 41, 42, 43]], ['Hechos', [44]], ['Cartas de Pablo', [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57]], ['Cartas generales', [58, 59, 60, 61, 62, 63, 64, 65]], ['Profecía', [66]]];
  body.innerHTML = (pickTab === 'ot' ? OTG : NTG).map(([t, ids]) => `<div class="sect">${t}</div><div class="grid">` +
    ids.map(id => { const bk = BOOKS[id - 1]; return `<button class="bk ${id === POS.b ? 'cur' : ''}" data-b="${id}"><b>${esc(bk.es)}</b>${bk.he ? `<span class="h">${bk.he}</span>` : ''}${bk.tr && !bk.he ? `<span class="t">${esc(bk.tr)}</span>` : ''}</button>`; }).join('') + '</div>').join('');
  body.querySelectorAll('[data-b]').forEach(x => x.onclick = () => renderPicker(+x.dataset.b));
}
$('#refBtn').onclick = openPicker;

$('#verBtn').onclick = () => {
  openSheet(`<h3>Versión principal</h3><div class="set-group verlist">${spanish().map(v => `<div class="set-row ${v.id === S.primary ? 'on' : ''}" data-id="${v.id}"><div class="l">${esc(v.name)}<small>${v.short} · ${v.books.length} libros</small></div><span class="dot"></span></div>`).join('')}</div>`);
  $$('.verlist .set-row').forEach(r => r.onclick = () => { S.primary = r.dataset.id; save(); closeSheet(); render(); });
};
$('#origBtn').onclick = () => { S.showOrig = !S.showOrig; save(); render(); toast(S.showOrig ? 'Texto original visible' : 'Texto original oculto'); };

/* ---------- Búsqueda ---------- */
const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f\u0591-\u05C7]/g, '').toLowerCase();
let searchToken = 0;
async function runSearch() {
  const q = $('#q').value.trim(); if (!q) return;
  const my = ++searchToken, out = $('#results'), info = $('#qInfo');
  out.innerHTML = ''; info.textContent = 'Buscando…';
  const strong = q.match(/^([HhGg])\s?(\d{1,4})$/);
  const results = []; let count = 0;
  if (strong) {
    const kind = strong[1].toUpperCase(), num = +strong[2];
    const H = VERSIONS.find(v => v.tagged);
    if (kind !== 'H' || !H) { info.textContent = 'La búsqueda por Strong funciona con números hebreos (H) en el texto masorético.'; return; }
    for (const b of H.books) {
      const d = await getBook(H.id, b); if (my !== searchToken) return; if (!d) continue;
      d.forEach((ch, ci) => ch.forEach((vs, vi) => {
        if (vs.some(w => w[1] === num)) { count++; if (results.length < 600) results.push([b, ci + 1, vi + 1, vs]); }
      }));
      info.textContent = `${count} versículos… (${BOOKS[b - 1].es})`;
    }
    const lex = await getLex('H'), e = lex[num];
    info.innerHTML = `<b>${count}</b> versículos con <b>H${num}</b> ${e ? `<span style="font-family:var(--heb);font-size:18px;color:var(--ac)">${esc(e[0])}</span> (${esc(e[1])})` : ''}`;
    const P = ver(S.primary);
    for (const [b, c, v, vs] of results) {
      const pd = P && hasBook(P, b) ? await getBook(P.id, b) : null; if (my !== searchToken) return;
      const es = pd && pd[c - 1] ? pd[c - 1][v - 1] : '';
      const he = vs.map(w => w[1] === num ? `<mark>${esc(w[0])}</mark>` : esc(w[0])).join(' ');
      out.insertAdjacentHTML('beforeend', `<button class="res" data-r="${b}.${c}.${v}"><div class="rf">${esc(refStr(b, c, v))}</div><div class="tx rtl">${he}</div>${es ? `<div class="tx muted">${esc(xform(es, 'es'))}</div>` : ''}</button>`);
    }
    return;
  }
  const V = ver($('#qVer').value) || ver(S.primary);
  const whole = $('#qWhole').checked, fq = fold(q);
  const re = whole ? new RegExp(`(?<![\\p{L}])${fq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u') : null;
  for (const b of V.books) {
    const d = await getBook(V.id, b); if (my !== searchToken) return; if (!d) continue;
    d.forEach((ch, ci) => ch.forEach((vs, vi) => {
      const t = plain(vs), f = fold(t);
      if (re ? re.test(f) : f.includes(fq)) { count++; if (results.length < 600) results.push([b, ci + 1, vi + 1, t]); }
    }));
    info.textContent = `${count} resultados… (${BOOKS[b - 1].es})`;
  }
  info.innerHTML = `<b>${count}</b> resultados en ${esc(V.short)}${count > 600 ? ' (mostrando 600)' : ''}`;
  const hlRe = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
  out.innerHTML = results.map(([b, c, v, t]) => `<button class="res" data-r="${b}.${c}.${v}"><div class="rf">${esc(refStr(b, c, v))}</div><div class="tx ${V.dir}">${esc(xform(t, V.lang)).replace(hlRe, m => `<mark>${m}</mark>`)}</div></button>`).join('');
}
$('#qGo').onclick = runSearch;
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.target.blur(); runSearch(); } });
$('#results').addEventListener('click', e => { const r = e.target.closest('.res'); if (r) { const [b, c, v] = r.dataset.r.split('.').map(Number); goTo(b, c, v); } });

/* ---------- Estudios (marcadores, resaltados, notas) ---------- */
let markTab = 'all';
$('#markTabs').addEventListener('click', e => { const t = e.target.closest('button'); if (t) { markTab = t.dataset.t; renderMarks(); } });
async function renderMarks() {
  $$('#markTabs button').forEach(x => x.classList.toggle('on', x.dataset.t === markTab));
  const items = Object.entries(MARKS).filter(([, m]) => markTab === 'all' || m[markTab]).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
  const box = $('#markList');
  if (!items.length) { box.innerHTML = '<div class="empty">Toca cualquier versículo para resaltarlo, marcarlo o escribir una nota.</div>'; return; }
  const P = ver(S.primary);
  const rows = await Promise.all(items.map(async ([k, m]) => {
    const [b, c, v] = k.split('.').map(Number);
    const d = P && hasBook(P, b) ? await getBook(P.id, b) : null;
    const t = d && d[c - 1] ? d[c - 1][v - 1] : '';
    return `<button class="res" data-r="${k}"><div class="rf">${m.bm ? '🔖 ' : ''}${m.hl ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS[m.hl]};margin-right:6px"></span>` : ''}${esc(refStr(b, c, v))}</div>
      <div class="tx">${esc(xform(t, 'es'))}</div>${m.note ? `<div class="tx muted" style="font-style:italic">✎ ${esc(m.note)}</div>` : ''}</button>`;
  }));
  box.innerHTML = rows.join('');
}
$('#markList').addEventListener('click', e => { const r = e.target.closest('.res'); if (r) { const [b, c, v] = r.dataset.r.split('.').map(Number); goTo(b, c, v); } });

/* ---------- Ajustes ---------- */
const THEMES = { night: ['Noche', '#141114'], parch: ['Pergamino', '#f3e9d2'], day: ['Día', '#fbfaf7'] };
function applyLook() {
  document.body.className = 't-' + S.theme + (S.layout === 'cols' ? ' lay-cols' : '');
  document.documentElement.style.setProperty('--size', S.size + 'px');
  if (window.Android) Android.setBars(THEMES[S.theme][1]);
}
function seg(key, opts) { return `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(S[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
function sw(key) { return `<button class="switch ${S[key] ? 'on' : ''}" data-sw="${key}"></button>`; }
function renderSettings() {
  const greek = VERSIONS.filter(v => v.lang === 'grc');
  $('#settings').innerHTML = `<h2>Ajustes</h2>
  <div class="sect">Apariencia</div>
  <div class="set-group">
    <div class="set-row"><div class="l">Tema</div>${seg('theme', Object.entries(THEMES).map(([k, v]) => [k, v[0]]))}</div>
    <div class="set-row"><div class="l">Tamaño de letra<small id="szl">${S.size}px</small></div><input type="range" id="sz" min="14" max="30" value="${S.size}"></div>
    <div class="set-row"><div class="l">Diseño con original<small>Intercalado o en columnas</small></div>${seg('layout', [['stack', 'Intercalado'], ['cols', 'Columnas']])}</div>
    <div class="set-row"><div class="l">Ocultar barras al leer</div>${sw('hideBars')}</div>
  </div>
  <div class="sect">Textos</div>
  <div class="set-group">
    <div class="set-row"><div class="l">Mostrar texto original<small>Hebreo (AT) · Griego (NT)</small></div>${sw('showOrig')}</div>
    ${greek.length > 1 ? `<div class="set-row"><div class="l">Griego del NT</div>${seg('origNT', greek.map(g => [g.id, g.short]))}</div>` : ''}
  </div>
  <div class="sect">Raíces hebreas</div>
  <div class="set-group">
    <div class="set-row"><div class="l">Nombre divino<small>Reemplaza “Jehová” en el texto</small></div>
      <select id="divine">${['Jehová', 'YHWH', 'Yahweh', 'Yahveh', 'יהוה', 'Adonai', 'HaShem', 'El Eterno'].map(x => `<option ${S.divine === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="set-row"><div class="l">Yeshúa HaMashíaj<small>Jesús → Yeshúa · Cristo → Mesías</small></div>${sw('yeshua')}</div>
  </div>
  <div class="sect">Mis datos</div>
  <div class="set-group">
    <div class="set-row"><div class="l">Exportar estudios<small>Copia marcadores y notas</small></div><button class="btn" id="exp">Copiar</button></div>
    <div class="set-row"><div class="l">Importar estudios</div><button class="btn" id="imp">Pegar</button></div>
  </div>
  <div class="sect">Versiones incluidas</div>
  <div class="credits">${VERSIONS.map(v => `• <b>${esc(v.short)}</b> — ${esc(v.name)} (${v.books.length} libros)`).join('<br>')}<br><br>
  Textos de dominio público o distribución libre (CrossWire / scrollmapper). Texto masorético: Westminster Leningrad Codex con morfología y números Strong de Open Scriptures Hebrew Bible (CC BY 4.0). Léxico: Strong (dominio público) vía Open Scriptures.<br><br>
  Nota: el hebreo usa la versificación masorética; en algunos capítulos (p. ej. títulos de Salmos, Malaquías 4) los números de versículo difieren de la versión española.</div>`;
  $$('#settings .seg').forEach(g => g.onclick = e => { const b = e.target.closest('button'); if (!b) return; S[g.dataset.k] = b.dataset.v; save(); applyLook(); renderSettings(); render(); });
  $$('#settings [data-sw]').forEach(b => b.onclick = () => { S[b.dataset.sw] = !S[b.dataset.sw]; save(); renderSettings(); render(); });
  $('#sz').oninput = e => { S.size = +e.target.value; $('#szl').textContent = S.size + 'px'; applyLook(); save(); };
  $('#divine').onchange = e => { S.divine = e.target.value; save(); render(); };
  $('#exp').onclick = () => copy(JSON.stringify(MARKS));
  $('#imp').onclick = () => {
    openSheet(`<h3>Importar estudios</h3><textarea id="impTx" placeholder="Pega aquí el texto exportado"></textarea><button class="btn gold full" id="impGo">Importar</button>`);
    $('#impGo').onclick = () => { try { Object.assign(MARKS, JSON.parse($('#impTx').value)); saveMarks(); closeSheet(); toast('Importado'); } catch (e) { toast('Texto no válido'); } };
  };
}

/* ---------- Navegación ---------- */
let curView = 'read';
function showView(v) {
  curView = v;
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  $$('#bottom button').forEach(x => x.classList.toggle('on', x.dataset.v === v));
  $('#top').classList.remove('hide'); $('#bottom').classList.remove('hide');
  $('#top').style.display = v === 'read' ? '' : 'none';
  $$('.view').forEach(x => x.style.paddingTop = v === 'read' ? '' : '8px');
  if (v === 'marks') renderMarks();
  if (v === 'set') renderSettings();
  if (v === 'par' && window.renderParasha) renderParasha();
}
$('#bottom').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showView(b.dataset.v); });
window.appBack = () => {
  if ($('#sheet').classList.contains('on')) { closeSheet(); return true; }
  if ($('#picker').classList.contains('on')) { closePicker(); return true; }
  if (curView !== 'read') { showView('read'); return true; }
  return false;
};

/* ---------- Inicio ---------- */
(async function init() {
  applyLook();
  try {
    const meta = await loadJSON('bible/versions.json');
    VERSIONS = meta.versions || []; LEXAVAIL = meta.lex || [];
  } catch (e) {
    reader.innerHTML = '<div class="empty">No se encontraron los textos bíblicos.<br>Compila con el flujo de GitHub para incluirlos.</div>';
    return;
  }
  if (!ver(S.primary)) S.primary = (spanish()[0] || VERSIONS[0]).id;
  $('#qVer').innerHTML = VERSIONS.map(v => `<option value="${v.id}" ${v.id === S.primary ? 'selected' : ''}>${esc(v.short)} — ${esc(v.name)}</option>`).join('');
  render();
})();
