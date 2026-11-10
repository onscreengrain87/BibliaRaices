'use strict';
/* Pronunciación del hebreo (lectura moderna, ortografía en español) a partir del niqqud */
const TL_CONS = { 'א': '', 'ב': 'v', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'j', 'ט': 't', 'י': 'y',
  'כ': 'j', 'ך': 'j', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'f', 'ף': 'f',
  'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't' };
const TL_HARD = { 'ב': 'b', 'כ': 'k', 'ך': 'k', 'פ': 'p', 'ף': 'p' };
const TL_VOW = { '\u05B1': 'e', '\u05B2': 'a', '\u05B3': 'o', '\u05B4': 'i', '\u05B5': 'e', '\u05B6': 'e',
  '\u05B7': 'a', '\u05B8': 'a', '\u05B9': 'o', '\u05BA': 'o', '\u05BB': 'u', '\u05C7': 'o' };
const SHVA = '\u05B0', DAGESH = '\u05BC', SIN = '\u05C2', HOLAM = /[\u05B9\u05BA]/;

function translitWord(w) {
  const cl = [];
  for (const ch of w) {
    if (ch >= 'א' && ch <= 'ת') cl.push({ c: ch, m: '' });
    else if (ch === '\u05BE') cl.push({ sep: '-' });
    else if (ch >= '\u0591' && ch <= '\u05C7' && cl.length && cl[cl.length - 1].c) cl[cl.length - 1].m += ch;
  }
  const letters = cl.filter(x => x.c).map(x => x.c).join('');
  if (letters === 'יהוה') return S.divine && S.divine !== 'Jehová' && /^[A-Za-z]/.test(S.divine) ? S.divine : 'YHWH';
  let out = '', first = true, prevVowel = '';
  for (let i = 0; i < cl.length; i++) {
    const x = cl[i];
    if (x.sep != null) { out += x.sep; first = true; prevVowel = ''; continue; }
    const { c, m } = x, nx = cl[i + 1], last = !nx || nx.sep != null;
    const dag = m.includes(DAGESH);
    let v = '';
    for (const ch of m) if (TL_VOW[ch]) { v = TL_VOW[ch]; break; }
    const shva = m.includes(SHVA);
    // vav como vocal: shuruk (ו\u05BC) y jolam male (ו\u05B9)
    if (c === 'ו' && dag && !v && !shva && !first) { out += 'u'; prevVowel = 'u'; continue; }
    if (c === 'ו' && dag && !v && !shva && first) { out += 'u'; prevVowel = 'u'; first = false; continue; }
    if (c === 'ו' && HOLAM.test(m) && !first && !prevVowel) { out += 'o'; prevVowel = 'o'; continue; }
    // yod como letra de lectura después de i/e
    if (c === 'י' && !v && !shva && !dag && (prevVowel === 'i' || prevVowel === 'e')) { first = false; continue; }
    let cons = (dag && TL_HARD[c]) || TL_CONS[c] || '';
    if (c === 'ש' && m.includes(SIN)) cons = 's';
    if (c === 'ה' && last && !dag && !v) cons = '';
    if ((c === 'א' || c === 'ע') && v && !first && /[aeiou]$/.test(out)) cons = "'";
    if (!v && shva && first) v = 'e';
    if (last && v === 'a' && (c === 'ח' || c === 'ע' || (c === 'ה' && dag)) && prevVowel) {
      out += 'a' + cons; prevVowel = '';
    } else {
      out += cons + v; prevVowel = v;
    }
    first = false;
  }
  return out;
}

function wordHTML(w) {
  return `<span class="w" data-s="${w[1]}"><span class="hw">${esc(w[0])}</span><span class="tl">${esc(translitWord(w[0]))}</span></span>`;
}
