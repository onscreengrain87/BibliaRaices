#!/usr/bin/env python3
"""Descarga textos bíblicos de dominio público / licencia libre y los convierte
al formato que usa la app:  assets/bible/<ID>/<libro>.json  = [capítulo][versículo]

  * Versiones planas: cada versículo es un string.
  * OSHB (hebreo con Strong): cada versículo es [[palabra, strong], ...].
  * assets/lex/H.json y G.json: léxico Strong {num: [lema, translit, pron, def, deriv]}.
"""
import json, os, re, sys, time, unicodedata, urllib.request
import xml.etree.ElementTree as ET

OUT = sys.argv[1] if len(sys.argv) > 1 else "app/src/main/assets"
BIBLE = os.path.join(OUT, "bible")
LEX = os.path.join(OUT, "lex")

OSIS = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov "
        "Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal "
        "Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm "
        "Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev").split()

EN = [["genesis"], ["exodus"], ["leviticus"], ["numbers"], ["deuteronomy"], ["joshua"], ["judges"], ["ruth"],
      ["1samuel"], ["2samuel"], ["1kings"], ["2kings"], ["1chronicles"], ["2chronicles"], ["ezra"],
      ["nehemiah"], ["esther"], ["job"], ["psalms", "psalm"], ["proverbs"], ["ecclesiastes", "qoheleth"],
      ["songofsolomon", "songofsongs", "song", "canticles", "canticleofcanticles"], ["isaiah"], ["jeremiah"],
      ["lamentations"], ["ezekiel"], ["daniel"], ["hosea"], ["joel"], ["amos"], ["obadiah"], ["jonah"],
      ["micah"], ["nahum"], ["habakkuk"], ["zephaniah"], ["haggai"], ["zechariah"], ["malachi"],
      ["matthew"], ["mark"], ["luke"], ["john"], ["acts", "actsoftheapostles"], ["romans"],
      ["1corinthians"], ["2corinthians"], ["galatians"], ["ephesians"], ["philippians"], ["colossians"],
      ["1thessalonians"], ["2thessalonians"], ["1timothy"], ["2timothy"], ["titus"], ["philemon"],
      ["hebrews"], ["james"], ["1peter"], ["2peter"], ["1john"], ["2john"], ["3john"], ["jude"],
      ["revelation", "revelationofjohn", "apocalypse"]]


def norm(name):
    s = unicodedata.normalize("NFD", str(name)).encode("ascii", "ignore").decode().lower().strip()
    s = re.sub(r"^(iii|3rd|third)\s+", "3", s)
    s = re.sub(r"^(ii|2nd|second)\s+", "2", s)
    s = re.sub(r"^(i|1st|first)\s+", "1", s)
    return re.sub(r"[^a-z0-9]", "", s)


NAME2ID = {}
for i, names in enumerate(EN):
    for n in names:
        NAME2ID[n] = i + 1
    NAME2ID[norm(OSIS[i])] = i + 1


def fetch(urls, binary=False):
    for url in urls:
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "BibliaRaices-build"})
                with urllib.request.urlopen(req, timeout=90) as r:
                    data = r.read()
                print("  ✓", url)
                return data if binary else data.decode("utf-8-sig")
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    break
                time.sleep(2)
            except Exception:
                time.sleep(2)
        print("  ·", url, "(no)")
    return None


TAG = re.compile(r"<[^>]+>")


def clean(t):
    t = TAG.sub("", str(t or ""))
    t = re.sub(r"\s+", " ", t).strip()
    return t


def extract_books(data):
    """Devuelve [(nombre, {cap: {vers: texto}})] para varias formas de JSON."""
    books = []
    if isinstance(data, dict):
        lst = data.get("books") or data.get("Books") or data.get("book")
        if isinstance(lst, list):
            for bk in lst:
                name = bk.get("name") or bk.get("book") or bk.get("book_name") or bk.get("title") or ""
                chs = {}
                for ci, ch in enumerate(bk.get("chapters") or []):
                    if isinstance(ch, dict):
                        cn = int(ch.get("chapter") or ch.get("number") or ci + 1)
                        vs = ch.get("verses") or []
                    else:
                        cn, vs = ci + 1, ch
                    vd = {}
                    for vi, v in enumerate(vs):
                        if isinstance(v, dict):
                            vn = int(v.get("verse") or v.get("number") or vi + 1)
                            vd[vn] = clean(v.get("text"))
                        else:
                            vd[vi + 1] = clean(v)
                    chs[cn] = vd
                books.append((name, chs))
            return books
        for k in ("verses", "data", "rows"):
            if isinstance(data.get(k), list):
                data = data[k]
                break
    if isinstance(data, list) and data and isinstance(data[0], dict) and "text" in data[0]:
        order, bmap = [], {}
        for r in data:
            name = r.get("book_name") or r.get("book") or r.get("name")
            if name not in bmap:
                bmap[name] = {}
                order.append(name)
            c, v = int(r.get("chapter")), int(r.get("verse"))
            bmap[name].setdefault(c, {})[v] = clean(r.get("text"))
        return [(n, bmap[n]) for n in order]
    return books


def assign_ids(books):
    ids = [NAME2ID.get(norm(n)) for n, _ in books]
    if sum(1 for i in ids if i) >= max(1, int(len(books) * 0.9)):
        return ids
    n = len(books)  # posición
    if n >= 66:
        return [i + 1 if i < 66 else None for i in range(n)]
    if n == 39:
        return [i + 1 for i in range(n)]
    if n == 27:
        return [i + 40 for i in range(n)]
    return ids


def write_version(vid, books_by_id):
    d = os.path.join(BIBLE, vid)
    os.makedirs(d, exist_ok=True)
    for bid, chapters in books_by_id.items():
        with open(os.path.join(d, f"{bid}.json"), "w", encoding="utf-8") as f:
            json.dump(chapters, f, ensure_ascii=False, separators=(",", ":"))
    return sorted(books_by_id)


def to_arrays(chs):
    out = []
    for c in range(1, max(chs) + 1):
        vd = chs.get(c, {})
        out.append([vd.get(v, "") for v in range(1, (max(vd) if vd else 0) + 1)])
    return out


SM = "https://raw.githubusercontent.com/scrollmapper/bible_databases/{br}/formats/json/{x}.json"


def scrollmapper(code):
    raw = fetch([SM.format(br=br, x=code) for br in ("master", "2025", "main")])
    if not raw:
        return None
    books = extract_books(json.loads(raw))
    ids = assign_ids(books)
    res = {}
    for (name, chs), bid in zip(books, ids):
        if bid and chs and any(any(v for v in vd.values()) for vd in chs.values()):
            res[bid] = to_arrays(chs)
    return res or None


OSIS_NS = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"


def strong_num(lemma):
    nums = [re.sub(r"\D", "", p) for p in (lemma or "").split("/")]
    nums = [n for n in nums if n]
    return int(nums[-1]) if nums else 0


def oshb():
    base = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/{}.xml"
    res = {}
    for i in range(39):
        raw = fetch([base.format(OSIS[i])], binary=True)
        if not raw:
            return None
        root = ET.fromstring(raw)
        chs = {}
        for verse in root.iter(OSIS_NS + "verse"):
            oid = verse.get("osisID") or ""
            parts = oid.split(".")
            if len(parts) < 3:
                continue
            c, v = int(parts[1]), int(parts[2])
            toks = []
            for el in verse:
                tag = el.tag.replace(OSIS_NS, "")
                if tag == "w":
                    w = "".join(el.itertext()).replace("/", "").strip()
                    if w:
                        toks.append([w, strong_num(el.get("lemma"))])
                elif tag == "seg":
                    s = "".join(el.itertext()).strip()
                    if s and toks:
                        toks[-1][0] += s
                    elif s:
                        toks.append([s, 0])
            chs.setdefault(c, {})[v] = toks
        res[i + 1] = [[chs[c].get(v, []) for v in range(1, max(chs[c]) + 1)] for c in range(1, max(chs) + 1)]
    return res


def strongs_lex(kind):
    url = ("https://raw.githubusercontent.com/openscriptures/strongs/master/"
           + ("hebrew/strongs-hebrew-dictionary.js" if kind == "H" else "greek/strongs-greek-dictionary.js"))
    raw = fetch([url])
    if not raw:
        return False
    data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
    out = {}
    for k, e in data.items():
        n = re.sub(r"\D", "", k)
        if not n:
            continue
        out[str(int(n))] = [e.get("lemma", ""), e.get("xlit") or e.get("translit", ""), e.get("pron", ""),
                            (e.get("strongs_def") or "").strip(), (e.get("derivation") or "").strip(),
                            (e.get("kjv_def") or "").strip()]
    os.makedirs(LEX, exist_ok=True)
    with open(os.path.join(LEX, kind + ".json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    return True


VERSIONS = [
    # id,           código fuente, nombre, abreviatura, idioma
    ("SpaRV",       "SpaRV",       "Reina-Valera 1909", "RV1909", "es"),
    ("SpaRV1865",   "SpaRV1865",   "Reina-Valera 1865", "RV1865", "es"),
    ("SpaRVG",      "SpaRVG",      "Reina-Valera Gómez", "RVG", "es"),
    ("SpaPlatense", "SpaPlatense", "Biblia Platense (Straubinger)", "PLAT", "es"),
    ("TR",          "TR",          "Textus Receptus (griego)", "TR", "grc"),
    ("Byz",         "Byz",         "Texto Bizantino (griego)", "BYZ", "grc"),
]


def main():
    os.makedirs(BIBLE, exist_ok=True)
    meta = []
    for vid, code, name, short, lang in VERSIONS:
        print(f"→ {name}")
        data = scrollmapper(code)
        if data:
            meta.append(dict(id=vid, name=name, short=short, lang=lang, dir="ltr", tagged=False,
                             books=write_version(vid, data)))
    print("→ Hebreo masorético (OSHB / WLC con números Strong)")
    data = oshb()
    if data:
        meta.append(dict(id="OSHB", name="Texto Masorético — WLC con Strong", short="WLC", lang="he",
                         dir="rtl", tagged=True, books=write_version("OSHB", data)))
    else:
        print("  OSHB falló; usando WLC plano")
        data = scrollmapper("WLC")
        if data:
            meta.append(dict(id="WLC", name="Códice de Leningrado (WLC)", short="WLC", lang="he",
                             dir="rtl", tagged=False, books=write_version("WLC", data)))
    lex = [k for k in ("H", "G") if strongs_lex(k)]
    with open(os.path.join(BIBLE, "versions.json"), "w", encoding="utf-8") as f:
        json.dump({"versions": meta, "lex": lex}, f, ensure_ascii=False, indent=1)
    print("\nVersiones:", ", ".join(f"{m['short']}({len(m['books'])} libros)" for m in meta))
    print("Léxicos:", lex)
    if not any(m["lang"] == "es" for m in meta):
        sys.exit("ERROR: no se pudo descargar ninguna versión en español")


if __name__ == "__main__":
    main()
