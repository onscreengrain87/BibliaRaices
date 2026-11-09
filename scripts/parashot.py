#!/usr/bin/env python3
"""Calendario de parashot (diáspora) desde Hebcal -> assets/bible/parashot.json"""
import datetime, json, os, re, sys, time, urllib.request

OUT = sys.argv[1] if len(sys.argv) > 1 else "app/src/main/assets"

NAMES = [["bereshit"], ["noach"], ["lechlecha"], ["vayera"], ["chayeisara", "chayeisarah"], ["toldot"],
         ["vayetzei"], ["vayishlach"], ["vayeshev"], ["miketz"], ["vayigash"], ["vayechi"],
         ["shemot"], ["vaera"], ["bo"], ["beshalach"], ["yitro"], ["mishpatim"], ["terumah"],
         ["tetzaveh"], ["kitisa"], ["vayakhel"], ["pekudei"],
         ["vayikra"], ["tzav"], ["shmini", "shemini"], ["tazria"], ["metzora"],
         ["achreimot", "achareimot"], ["kedoshim"], ["emor"], ["behar"], ["bechukotai"],
         ["bamidbar"], ["nasso", "naso"], ["behaalotcha", "behaalotecha"], ["shlach", "shelach", "shlachlecha"],
         ["korach"], ["chukat"], ["balak"], ["pinchas"], ["matot"], ["masei"],
         ["devarim"], ["vaetchanan"], ["eikev", "ekev"], ["reeh"], ["shoftim"], ["kiteitzei", "kitetzei"],
         ["kitavo"], ["nitzavim"], ["vayeilech", "vayelech"], ["haazinu"], ["vezothaberakhah", "vezothabracha"]]
IDX = {n: i for i, ns in enumerate(NAMES) for n in ns}


def norm(s):
    return re.sub(r"[^a-z]", "", s.lower())


def match(title):
    t = re.sub(r"^Parashat\s+", "", title)
    if norm(t) in IDX:
        return [IDX[norm(t)]]
    parts = t.split("-")
    for k in range(1, len(parts)):
        a, b = norm("".join(parts[:k])), norm("".join(parts[k:]))
        if a in IDX and b in IDX:
            return [IDX[a], IDX[b]]
    return None


def fetch(url):
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "BibliaRaices-build"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            print("  reintento:", e)
            time.sleep(3)
    return None


def main():
    y = datetime.date.today().year
    sched = []
    for year in range(y - 1, y + 6):
        url = ("https://www.hebcal.com/hebcal?v=1&cfg=json&s=on&leyning=off&i=off&maj=off&min=off"
               f"&mod=off&nx=off&ss=off&mf=off&c=off&year={year}")
        data = fetch(url)
        if not data:
            print("  sin datos para", year)
            continue
        for it in data.get("items", []):
            if it.get("category") != "parashat":
                continue
            p = match(it.get("title", ""))
            if p:
                sched.append({"d": it["date"][:10], "p": p, "h": it.get("hdate", "")})
            else:
                print("  sin coincidencia:", it.get("title"))
        time.sleep(1)
    sched.sort(key=lambda s: s["d"])
    os.makedirs(os.path.join(OUT, "bible"), exist_ok=True)
    with open(os.path.join(OUT, "bible", "parashot.json"), "w", encoding="utf-8") as f:
        json.dump({"schedule": sched}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Parashot: {len(sched)} semanas ({sched[0]['d'] if sched else '-'} a {sched[-1]['d'] if sched else '-'})")


if __name__ == "__main__":
    main()
