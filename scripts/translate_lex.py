#!/usr/bin/env python3
"""Traduce al español las definiciones Strong (hebreo y griego) con un modelo libre
(Argos Translate, en->es) usando ctranslate2. Escribe assets/lex/H_es.json y G_es.json:
    {num: [definición_es, traducción_es]}
Si ya existen (caché), no hace nada."""
import json, os, re, sys, urllib.request, zipfile

OUT = sys.argv[1] if len(sys.argv) > 1 else "app/src/main/assets"
LEX = os.path.join(OUT, "lex")
WORK = os.path.join(os.environ.get("RUNNER_TEMP", "/tmp"), "argos")
INDEX = "https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "BibliaRaices-build"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def clean_kjv(s):
    s = re.sub(r"\bX\s+", "", s or "")
    s = re.sub(r"\(-[^)]*\)", "", s)
    s = re.sub(r"\[[^\]]*\]", "", s)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s*,\s*", ", ", s).strip(" ,.;")
    return s


def clean_def(s):
    s = (s or "").replace("{", "").replace("}", "")
    return re.sub(r"\s+", " ", s).strip()


def load_model():
    os.makedirs(WORK, exist_ok=True)
    idx = json.loads(get(INDEX))
    pkg = next(p for p in idx if p.get("from_code") == "en" and p.get("to_code") == "es")
    path = os.path.join(WORK, "en_es.zip")
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(get(pkg["links"][0]))
    with zipfile.ZipFile(path) as z:
        z.extractall(WORK)
    for root, dirs, files in os.walk(WORK):
        if "model" in dirs and "sentencepiece.model" in files:
            import ctranslate2, sentencepiece
            tr = ctranslate2.Translator(os.path.join(root, "model"), device="cpu", compute_type="int8",
                                        intra_threads=os.cpu_count() or 2)
            sp = sentencepiece.SentencePieceProcessor(model_file=os.path.join(root, "sentencepiece.model"))
            return tr, sp
    raise RuntimeError("modelo no encontrado")


def translate_all(texts, tr, sp):
    out = {}
    uniq = sorted({t for t in texts if t})
    print("Traduciendo", len(uniq), "textos…")
    B = 64
    for i in range(0, len(uniq), B):
        chunk = uniq[i:i + B]
        toks = [sp.encode(t, out_type=str)[:250] for t in chunk]
        res = tr.translate_batch(toks, beam_size=2, max_decoding_length=256, max_batch_size=B)
        for t, r in zip(chunk, res):
            out[t] = sp.decode(r.hypotheses[0]).strip()
        if i % 2048 == 0:
            print(f"  {i}/{len(uniq)}")
    return out


def main():
    kinds = [k for k in ("H", "G") if os.path.exists(os.path.join(LEX, k + ".json"))
             and not os.path.exists(os.path.join(LEX, k + "_es.json"))]
    if not kinds:
        print("Traducciones ya existen (caché) o no hay léxico.")
        return
    tr, sp = load_model()
    for k in kinds:
        lex = json.load(open(os.path.join(LEX, k + ".json"), encoding="utf-8"))
        defs = {n: clean_def(e[3]) for n, e in lex.items()}
        kjvs = {n: clean_kjv(e[5]) for n, e in lex.items()}
        tmap = translate_all(list(defs.values()) + list(kjvs.values()), tr, sp)
        es = {n: [tmap.get(defs[n], ""), tmap.get(kjvs[n], "")] for n in lex}
        with open(os.path.join(LEX, k + "_es.json"), "w", encoding="utf-8") as f:
            json.dump(es, f, ensure_ascii=False, separators=(",", ":"))
        print(k, "listo:", len(es))


if __name__ == "__main__":
    main()
