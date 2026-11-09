'use strict';
/* Parashá de la semana: Torá + Haftará + Brit Jadashá */

const PAR_MEAN = ['En el principio', 'Noé', 'Vete', 'Y apareció', 'La vida de Sara', 'Generaciones', 'Y salió',
  'Y envió', 'Y habitó', 'Al final', 'Y se acercó', 'Y vivió', 'Nombres', 'Y aparecí', 'Ven', 'Cuando dejó ir',
  'Jetró', 'Leyes', 'Ofrenda', 'Mandarás', 'Cuando cuentes', 'Y congregó', 'Cuentas', 'Y llamó', 'Ordena',
  'Octavo', 'Concibió', 'Leproso', 'Después de la muerte', 'Santos', 'Di', 'En el monte', 'En mis estatutos',
  'En el desierto', 'Toma el censo', 'Cuando enciendas', 'Envía', 'Coré', 'Estatuto', 'Balac', 'Finees',
  'Tribus', 'Jornadas', 'Palabras', 'Y supliqué', 'Por cuanto', 'Mira', 'Jueces', 'Cuando salgas',
  'Cuando entres', 'Están en pie', 'Y fue', 'Escuchen', 'Y esta es la bendición'];

// [libro, cap ini, vers ini, cap fin, vers fin] (versificación española)
const HAFT = [[[23,42,5,43,11]],[[23,54,1,55,5]],[[23,40,27,41,16]],[[12,4,1,4,37]],[[11,1,1,1,31]],[[39,1,1,2,7]],
  [[28,12,12,14,9]],[[28,11,7,12,11]],[[30,2,6,3,8]],[[11,3,15,4,1]],[[26,37,15,37,28]],[[11,2,1,2,12]],
  [[23,27,6,28,13],[23,29,22,29,23]],[[26,28,25,29,21]],[[24,46,13,46,28]],[[7,4,4,5,31]],[[23,6,1,7,6],[23,9,6,9,7]],
  [[24,34,8,34,22],[24,33,25,33,26]],[[11,5,12,6,13]],[[26,43,10,43,27]],[[11,18,1,18,39]],[[11,7,40,7,50]],
  [[11,7,51,8,21]],[[23,43,21,44,23]],[[24,7,21,8,3],[24,9,23,9,24]],[[10,6,1,7,17]],[[12,4,42,5,19]],
  [[12,7,3,7,20]],[[26,22,1,22,19]],[[30,9,7,9,15]],[[26,44,15,44,31]],[[24,32,6,32,27]],[[24,16,19,17,14]],
  [[28,1,10,2,20]],[[7,13,2,13,25]],[[38,2,10,4,7]],[[6,2,1,2,24]],[[9,11,14,12,22]],[[7,11,1,11,33]],
  [[33,5,7,6,8]],[[11,18,46,19,21]],[[24,1,1,2,3]],[[24,2,4,2,28],[24,3,4,3,4]],[[23,1,1,1,27]],[[23,40,1,40,26]],
  [[23,49,14,51,3]],[[23,54,11,55,5]],[[23,51,12,52,12]],[[23,54,1,54,10]],[[23,60,1,60,22]],[[23,61,10,63,9]],
  [[23,55,6,56,8]],[[10,22,1,22,51]],[[6,1,1,1,18]]];

const BRIT = [[[43,1,1,1,14]],[[40,24,36,24,46],[60,3,18,3,22]],[[45,4,1,4,25]],
  [[42,1,26,1,38],[42,24,36,24,53],[61,2,4,2,11]],[[40,1,1,1,17],[46,15,50,15,57]],[[45,9,1,9,31]],[[43,1,19,1,51]],
  [[31,1,1,1,21],[58,11,11,11,20],[40,26,36,26,46]],[[40,1,1,1,6],[40,1,16,1,25]],[[45,10,1,10,13]],[[49,2,1,2,10]],
  [[60,1,1,1,9]],[[44,7,17,7,35],[46,14,18,14,25]],[[45,9,14,9,33]],[[42,22,7,22,30],[46,11,20,11,34]],
  [[43,6,15,6,71]],[[40,5,8,5,20]],[[40,5,38,5,42],[40,17,1,17,11]],[[47,9,1,9,15],[40,5,33,5,37]],
  [[58,13,10,13,17]],[[47,3,1,3,18]],[[47,9,6,9,11],[46,3,11,3,18]],[[58,1,1,1,14]],[[58,10,1,10,18]],
  [[58,7,24,8,6]],[[58,7,1,7,19],[58,8,1,8,6]],[[43,6,8,6,13],[40,8,1,8,4]],[[40,8,1,8,17]],[[58,9,11,9,28]],
  [[46,6,9,6,20],[60,1,13,1,16]],[[60,2,4,2,10]],[[42,4,16,4,21]],[[40,21,33,21,46],[47,6,14,6,18]],
  [[45,9,22,9,33]],[[44,21,17,21,26]],[[46,10,6,10,13],[66,11,1,11,19]],[[58,3,7,4,1]],[[45,13,1,13,7]],
  [[58,9,11,9,28],[43,3,10,3,21]],[[45,11,25,11,32]],[[45,11,2,11,32]],[[40,5,33,5,37]],[[59,4,1,4,12]],
  [[44,9,1,9,21],[54,3,1,3,7]],[[40,23,31,23,39],[41,12,28,12,34]],[[58,11,8,11,13],[45,8,31,8,39]],
  [[43,7,37,7,52],[62,4,1,4,6]],[[43,1,19,1,27],[44,3,22,3,23]],[[40,5,27,5,30],[46,5,1,5,5]],
  [[49,1,3,1,6],[66,21,10,21,27]],[[45,10,1,10,12]],[[45,10,14,10,18]],[[45,10,14,11,12]],[[66,22,1,22,5]]];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const HMESES = { Tishrei: 'Tishrí', Cheshvan: 'Jeshván', Kislev: 'Kislev', Tevet: 'Tevet', "Sh'vat": 'Shevat', Adar: 'Adar',
  'Adar I': 'Adar I', 'Adar II': 'Adar II', Nisan: 'Nisán', Iyyar: 'Iyar', Sivan: 'Siván', Tamuz: 'Tamuz', Av: 'Av', Elul: 'Elul' };

function torahRange(i) {
  const p = PARASHOT[i], n = PARASHOT[i + 1];
  let end;
  if (!n || n[2] !== p[2]) end = [BOOKS[p[2] - 1].ch, 999];
  else if (n[4] > 1) end = [n[3], n[4] - 1];
  else end = [n[3] - 1, 999];
  return [p[2], p[3], p[4], end[0], end[1]];
}

let PAR_SCHED = null, parSel = null, parTab = 'torah';
async function loadSched() {
  if (PAR_SCHED === null) {
    try { PAR_SCHED = (await loadJSON('bible/parashot.json')).schedule || []; } catch (e) { PAR_SCHED = []; }
  }
  return PAR_SCHED;
}
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function fmtDate(s) { const [y, m, d] = s.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; }
function fmtHDate(h) {
  const m = (h || '').match(/^(\d+)\s+(.+)\s+(\d{4})$/);
  return m ? `${m[1]} de ${HMESES[m[2]] || m[2]} ${m[3]}` : h;
}

async function rangeHTML(r) {
  const [b, c1, v1, c2, v2] = r;
  const P = ver(S.primary) || spanish()[0];
  const O = S.showOrig ? origFor(b) : null;
  const [pd, od] = await Promise.all([P && hasBook(P, b) ? getBook(P.id, b) : null, O ? getBook(O.id, b) : null]);
  let h = '', lastV = v2;
  for (let c = c1; c <= c2; c++) {
    const pv = (pd && pd[c - 1]) || [], ov = (od && od[c - 1]) || [];
    const len = Math.max(pv.length, ov.length);
    const from = c === c1 ? v1 : 1, to = c === c2 ? Math.min(v2, len) : len;
    if (c === c2) lastV = to;
    if (c !== c1) h += `<div class="chap-sep">Capítulo ${c}</div>`;
    for (let v = from; v <= to; v++) {
      const k = `${b}.${c}.${v}`, m = MARKS[k] || {};
      const cls = ['v', m.hl ? 'hl-' + m.hl : '', m.bm ? 'bm' : '', O && ov[v - 1] ? 'has-or' : ''].join(' ');
      h += `<div class="${cls}" data-b="${b}" data-c="${c}" data-v="${v}"><div class="es-wrap"><span class="es"><sup>${c1 !== c2 ? c + ':' : ''}${v}</sup>${esc(xform(pv[v - 1], 'es')) || '<span class="muted">—</span>'}</span>${m.note ? ' <i class="nt">✎</i>' : ''}</div>`;
      const o = ov[v - 1];
      if (O && o) h += `<div class="or ${O.dir}" lang="${O.lang}">${Array.isArray(o) ? o.map(w => `<span class="w" data-s="${w[1]}">${esc(w[0])}</span>`).join(' ') : esc(o)}</div>`;
      h += '</div>';
    }
  }
  const label = `${BOOKS[b - 1].es} ${c1}:${v1}–${c2 !== c1 ? c2 + ':' : ''}${lastV}`;
  return { h, label };
}

function currentEntry(sched) {
  if (!parSel) {
    const t = todayStr(), i = sched.findIndex(s => s.d >= t);
    parSel = i >= 0 ? { i } : { p: [0] };
  }
  return parSel.i != null ? sched[parSel.i] : { p: parSel.p };
}

async function renderParasha(keep) {
  const view = $('#v-par'), top = view.scrollTop, box = $('#parBody');
  const sched = await loadSched();
  const e = currentEntry(sched);
  const ps = e.p;
  const name = ps.map(i => PARASHOT[i][0]).join(' – ');
  const he = ps.map(i => PARASHOT[i][1]).join(' · ');
  const mean = ps.map(i => PAR_MEAN[i]).join(' / ');
  const isNow = parSel.i != null && sched[parSel.i] && sched.findIndex(s => s.d >= todayStr()) === parSel.i;
  const ranges = { torah: ps.map(torahRange), haft: [].concat(...ps.map(i => HAFT[i])), brit: [].concat(...ps.map(i => BRIT[i])) };
  if (ps.length > 1) ranges.haft = HAFT[ps[ps.length - 1]];

  if (!keep) box.innerHTML = '<div class="spin"></div>';
  const parts = await Promise.all(ranges[parTab].map(rangeHTML));
  box.innerHTML = `
    <section class="par-hero">
      <div class="par-nav"><button id="parPrev" aria-label="Anterior"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
        <span class="par-badge">${isNow ? 'Esta semana' : (parSel.i != null ? 'Shabat' : 'Parashá ' + (ps[0] + 1))}</span>
        <button id="parNext" aria-label="Siguiente"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>
      <div class="par-he">${he}</div>
      <h1 class="par-name">${esc(name)}</h1>
      <div class="par-mean">“${esc(mean)}”</div>
      ${e.d ? `<div class="par-date">Shabat ${fmtDate(e.d)}${e.h ? ' · ' + esc(fmtHDate(e.h)) : ''}</div>` : ''}
      <button class="par-all" id="parAll">Todas las parashot</button>
    </section>
    <div class="tabs par-tabs">
      <button data-t="torah" class="${parTab === 'torah' ? 'on' : ''}">Torá</button>
      <button data-t="haft" class="${parTab === 'haft' ? 'on' : ''}">Haftará</button>
      <button data-t="brit" class="${parTab === 'brit' ? 'on' : ''}">Brit Jadashá</button>
    </div>
    <div class="par-refs">${parts.map(p => `<span class="ref-chip">${esc(p.label)}</span>`).join('')}</div>
    <div class="par-text">${parts.map(p => `<div class="par-seg"><div class="seg-title">${esc(p.label)}</div>${p.h}</div>`).join('')}</div>
    <p class="muted par-note">Lecturas de Brit Jadashá según la tabla de Hebrew4Christians. Fechas para la diáspora (Hebcal).</p>`;
  $$('.par-tabs button').forEach(b => b.onclick = () => { parTab = b.dataset.t; renderParasha(); view.scrollTop = 0; });
  $('#parPrev').onclick = () => moveParasha(-1);
  $('#parNext').onclick = () => moveParasha(1);
  $('#parAll').onclick = parList;
  if (keep) view.scrollTop = top;
}

function moveParasha(d) {
  const sched = PAR_SCHED || [];
  if (parSel.i != null) { const n = parSel.i + d; if (n >= 0 && n < sched.length) parSel = { i: n }; }
  else { const n = (parSel.p[0] + d + 54) % 54; parSel = { p: [n] }; }
  $('#v-par').scrollTop = 0; renderParasha();
}

function openParasha(i) {
  const sched = PAR_SCHED || [], t = todayStr();
  const k = sched.findIndex(s => s.d >= t && s.p.includes(i));
  parSel = k >= 0 ? { i: k } : { p: [i] };
  parTab = 'torah';
  showView('par');
}

function parList() {
  const sched = PAR_SCHED || [], t = todayStr();
  openSheet(`<h3>Parashot</h3>` + PARASHOT.map((p, i) => {
    const s = sched.find(x => x.d >= t && x.p.includes(i));
    return `<button class="par" data-i="${i}"><span><b>${i + 1}. ${esc(p[0])}</b><small>${esc(refStr(p[2], p[3], p[4]))}${s ? ' · ' + fmtDate(s.d) : ''}</small></span><span class="h">${p[1]}</span></button>`;
  }).join(''));
  $$('#sheetBody .par').forEach(x => x.onclick = () => { closeSheet(); openParasha(+x.dataset.i); renderParasha(); });
}

$('#parBody').addEventListener('click', e => {
  const w = e.target.closest('.w');
  if (w && +w.dataset.s) { showLex(+w.dataset.s, w); return; }
  const v = e.target.closest('.v');
  if (v) verseSheet(+v.dataset.v, +v.dataset.b, +v.dataset.c);
});
window.renderParasha = renderParasha;
window.openParasha = openParasha;
loadSched();
