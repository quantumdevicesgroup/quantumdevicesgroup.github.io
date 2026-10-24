#!/usr/bin/env python3
"""Build assets/ref.bib from the publication list in _data/publications.yml.

Each list entry names a paper by DOI and/or arXiv id. Metadata comes from the
local Zotero library when the paper is there (via the read-only zotero.py
helper), and from Crossref or arXiv otherwise, so every entry gets the same
Zotero-style cite key (author_titleword_year) used in the group's .bib files.

Site-only fields from the YAML (selected, links, equal) are added to the
entry; the site template keeps them out of the copyable BibTeX.

Papers whose Zotero record has no abstract get one from Crossref (the
publisher's), then arXiv, then OpenAlex; results are cached in
scripts/abstract_cache.json, so delete an entry there to refetch it.

    python3 scripts/build_bib.py                     # writes assets/ref.bib
    python3 scripts/build_bib.py --zotero ../scripts/zotero.py

The zotero.py path can also be set with the ZOTERO_PY environment variable.
Without Zotero the script still runs, using Crossref/arXiv for every paper.
"""

import argparse
import importlib.util
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "qdg-website-bib-builder (mailto:alp@berkeley.edu)"


def load_zotero(path):
    if not path or not os.path.exists(path):
        return None
    spec = importlib.util.spec_from_file_location("zotero", path)
    z = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(z)
    return z


def norm_title(t, z=None):
    if z:
        t = z.ascii_fold(t)
    return re.sub(r"[^a-z0-9]", "", t.lower())


class ZoteroIndex:
    """Look up items by DOI, arXiv id or exact (normalised) title."""

    def __init__(self, z):
        self.z = z
        self.con = z.connect()
        self.doi, self.arxiv, self.title = {}, {}, {}
        for item_id, field, value in self.con.execute(
            """select d.itemID, f.fieldName, v.value from itemData d
                 join fields f using (fieldID) join itemDataValues v using (valueID)
                where f.fieldName in ('DOI','title','archiveID','url','extra')
                  and d.itemID not in (select itemID from deletedItems)"""):
            if field == "DOI":
                self.doi.setdefault(value.lower(), set()).add(item_id)
            elif field == "title":
                self.title.setdefault(norm_title(value, z), set()).add(item_id)
            for a in re.findall(r"(\d{4}\.\d{4,5})", value if field != "title" else ""):
                self.arxiv.setdefault(a, set()).add(item_id)

    def find(self, doi=None, arxiv=None, title=None):
        ids = set()
        if doi:
            ids |= self.doi.get(doi.lower(), set())
        if arxiv:
            ids |= self.arxiv.get(arxiv, set())
        if title:
            ids |= self.title.get(norm_title(title, self.z), set())
        items = [self.z.load_item(self.con, i) for i in ids]
        items = [it for it in items
                 if it and it["type"] not in ("attachment", "note", "annotation")]
        if doi:   # a published entry beats its preprint
            items = [it for it in items if it["type"] != "preprint"] or items
        items.sort(key=lambda it: (
            it["type"] == "preprint",
            "qdg" not in it["library"].lower(),
            not any(a["exists"] for a in it["attachments"]),
            -len(it["fields"]),
        ))
        return items[0] if items else None


def http_get(url, accept="application/json"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8")
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)


def crossref_item(doi):
    """Crossref metadata reshaped into the dict zotero.py's to_bibtex expects."""
    msg = json.loads(http_get("https://api.crossref.org/works/"
                              + urllib.parse.quote(doi)))["message"]
    parts = (msg.get("published-print") or msg.get("published-online")
             or msg.get("issued") or {}).get("date-parts", [[None]])[0]
    date = "-".join(f"{p:02d}" if i else str(p) for i, p in enumerate(parts) if p)
    if len(parts) == 1 or (len(parts) > 1 and not parts[1]):
        date = f"{parts[0]}-00-00"
    fields = {
        "title": " ".join((msg.get("title") or [""])[0].split()),
        "publicationTitle": (msg.get("container-title") or [""])[0],
        "volume": msg.get("volume", ""),
        "issue": msg.get("issue", ""),
        "pages": msg.get("page", "") or msg.get("article-number", ""),
        "DOI": msg.get("DOI", doi),
        "url": f"https://doi.org/{msg.get('DOI', doi)}",
        "date": date,
    }
    if msg.get("abstract"):
        fields["abstractNote"] = re.sub(r"<[^>]+>", "", msg["abstract"]).strip()
    creators = [{"first": a.get("given", ""), "last": a.get("family", a.get("name", "")),
                 "institutional": "family" not in a, "role": "author"}
                for a in msg.get("author", [])]
    return {"type": "journalArticle", "fields": {k: v for k, v in fields.items() if v},
            "creators": creators, "tags": []}


def arxiv_item(arxiv_id):
    ns = {"a": "http://www.w3.org/2005/Atom", "x": "http://arxiv.org/schemas/atom"}
    xml = http_get(f"https://export.arxiv.org/api/query?id_list={arxiv_id}",
                   accept="application/atom+xml")
    e = ET.fromstring(xml).find("a:entry", ns)
    if e is None or e.find("a:title", ns) is None:
        raise ValueError(f"arXiv:{arxiv_id} not found")
    creators = []
    for a in e.findall("a:author", ns):
        name = a.find("a:name", ns).text.strip()
        first, _, last = name.rpartition(" ")
        creators.append({"first": first, "last": last, "institutional": False,
                         "role": "author"})
    published = e.find("a:published", ns).text[:10]
    fields = {
        "title": " ".join(e.find("a:title", ns).text.split()),
        "abstractNote": " ".join(e.find("a:summary", ns).text.split()),
        "DOI": f"10.48550/arXiv.{arxiv_id}",
        "url": f"http://arxiv.org/abs/{arxiv_id}",
        "date": published,
        "archiveID": f"arXiv:{arxiv_id}",
        "repository": "arXiv",
    }
    journal_doi = e.find("x:doi", ns)
    return {"type": "preprint", "fields": fields, "creators": creators, "tags": [],
            "journal_doi": journal_doi.text if journal_doi is not None else None}


CACHE = os.path.join(ROOT, "scripts", "abstract_cache.json")


SUP = str.maketrans("0123456789+-()=*", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾⁼*")
SUB = str.maketrans("0123456789+-()=", "₀₁₂₃₄₅₆₇₈₉₊₋₍₎₌")
SYMBOLS = {"pm": "±", "approx": "≈", "sim": "~", "times": "×", "mu": "μ", "star": "*",
           "lesssim": "≲", "gtrsim": "≳", "leq": "≤", "geq": "≥", "le": "≤", "ge": "≥",
           "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "Delta": "Δ",
           "omega": "ω", "Omega": "Ω", "pi": "π", "kappa": "κ", "%": "%"}


def unicode_math(text):
    """Turn the inline LaTeX in an abstract ($T_2^*$, $\\mathrm{SiV}^-$,
    $\\approx 50\\%$) into plain Unicode text, since the site shows abstracts
    as text and does not load a math renderer."""
    if not text or ("$" not in text and "\\" not in text):
        return text
    def script(m, table):
        body = m.group(1) if m.group(1) is not None else m.group(2)
        conv = body.translate(table)
        allowed = {chr(v) for v in table.values()}
        return conv if all(c in allowed for c in conv if not c.isspace()) \
            else ("^" if table is SUP else "_") + body
    def math(m):
        t = m.group(1)
        t = re.sub(r"\\(?:mathrm|mathcal|mathbf|mathit|text|textit|textrm)\s*\{([^{}]*)\}", r"\1", t)
        t = re.sub(r"\\([A-Za-z]+|%)", lambda k: SYMBOLS.get(k.group(1), k.group(1)), t)
        t = re.sub(r"\^\{([^{}]*)\}|\^(\S)", lambda k: script(k, SUP), t)
        t = re.sub(r"_\{([^{}]*)\}|_(\S)", lambda k: script(k, SUB), t)
        return t.replace("{", "").replace("}", "")
    text = re.sub(r"\$([^$]+)\$", math, text)
    text = re.sub(r"\\(?:textit|emph|textbf|mathrm)\s*\{([^{}]*)\}", r"\1", text)
    return text


def clean_abstract(text):
    text = re.sub(r"<jats:title>.*?</jats:title>", " ", text or "", flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"^(Abstract|ABSTRACT)\s*[:.]?\s*", "", text)


def fetch_abstract(doi, arxiv):
    """Abstract for a paper Zotero has none for: the publisher's deposited
    abstract (Crossref) first, then the authors' arXiv abstract, then
    OpenAlex (whose reconstructed abstracts are sometimes truncated)."""
    if doi and not doi.lower().startswith("10.48550/"):
        try:
            msg = json.loads(http_get("https://api.crossref.org/works/" + urllib.parse.quote(doi)))["message"]
            if msg.get("abstract"):
                return clean_abstract(msg["abstract"]), "crossref"
        except Exception:
            pass
    if arxiv:
        try:
            item = arxiv_item(arxiv)
            time.sleep(3)          # arXiv asks for at most one request every 3 s
            return item["fields"]["abstractNote"], "arxiv"
        except Exception:
            pass
    if doi:
        try:
            w = json.loads(http_get(f"https://api.openalex.org/works/doi:{doi}?mailto=alp@berkeley.edu"))
            inv = w.get("abstract_inverted_index") or {}
            if inv:
                words = sorted((i, word) for word, idx in inv.items() for i in idx)
                return " ".join(word for _, word in words), "openalex"
        except Exception:
            pass
    return None, None


def bib_value(v):
    return "{" + str(v).replace("{", "\\{").replace("}", "\\}") + "}"


def build_entry(z, pub, item, used_keys):
    bib = z.to_bibtex(item, abstract=True, keywords=False)
    head, body = bib.split("\n", 1)
    btype, key = re.match(r"@(\w+)\{([^,]+),", head).groups()
    if item["type"] == "preprint":
        btype = "unpublished"   # the site groups preprints as @unpublished
    if pub.get("key"):
        key = pub["key"]
    base, n = key, 2
    while key in used_keys:
        key, n = f"{base}-{n}", n + 1
    used_keys.add(key)

    extra = []
    arxiv = pub.get("arxiv") or (item["fields"].get("archiveID", "").replace("arXiv:", "")
                                 if item["type"] == "preprint" else "")
    if arxiv:
        extra.append(f"    arxiv = {bib_value(arxiv)},")
    if pub.get("selected"):
        extra.append("    selected = {true},")
    if pub.get("highlight"):
        extra.append(f"    highlight = {bib_value(pub['highlight'])},")
        extra.append("    highlighted = {true},")
        if pub.get("home", True):
            extra.append("    homehighlight = {true},")
    if pub.get("image"):
        extra.append(f"    image = {bib_value(pub['image'])},")
    # Group paper: from the group's Berkeley years (2022 on) or with the PI as
    # last author. Earlier work (Painter, Lukin groups) stays off research pages.
    authors = [c for c in item["creators"] if c.get("role") == "author"]
    year = int((z.parse_date(item["fields"].get("date"))[0]) or 0)
    is_group = pub.get("group", year >= 2022 or bool(authors and authors[-1]["last"] == "Sipahigil"))
    extra.append(f"    group = {{{'true' if is_group else 'false'}}},")
    if pub.get("thrusts"):
        extra.append(f"    thrusts = {bib_value(' '.join(pub['thrusts']))},")
    if pub.get("equal"):
        extra.append(f"    equal = {bib_value('; '.join(pub['equal']))},")
    for i, link in enumerate(pub.get("links", []), 1):
        extra.append(f"    link{i}label = {bib_value(link['label'])},")
        extra.append(f"    link{i}url = {bib_value(link['url'])},")
    if pub.get("_abstract_source"):
        extra.append(f"    abstractsource = {bib_value(pub['_abstract_source'])},")
    if pub.get("venue_note"):
        extra.append(f"    venuenote = {bib_value(pub['venue_note'])},")
    body = body.rstrip().rstrip("}").rstrip()
    return f"@{btype}{{{key},\n{body}\n" + "\n".join(extra) + ("\n" if extra else "") + "}"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--zotero", default=os.environ.get(
        "ZOTERO_PY", os.path.join(ROOT, "..", "scripts", "zotero.py")))
    ap.add_argument("--list", default=os.path.join(ROOT, "_data", "publications.yml"))
    ap.add_argument("-o", "--output", default=os.path.join(ROOT, "assets", "ref.bib"))
    args = ap.parse_args()

    z = load_zotero(args.zotero)
    if z is None:
        sys.exit(f"zotero.py not found at {args.zotero}; pass --zotero or set ZOTERO_PY")
    index = ZoteroIndex(z) if os.path.exists(z.DB) else None

    pubs = yaml.safe_load(open(args.list)) or []
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    used, entries, report = set(), [], []
    for pub in pubs:
        doi, arxiv = pub.get("doi"), pub.get("arxiv")
        item = index.find(doi=doi, arxiv=None if doi else arxiv,
                          title=pub.get("title")) if index else None
        source = f"zotero:{item['itemID']}" if item else None
        if item is None:
            if doi:
                item, source = crossref_item(doi), "crossref"
            elif arxiv:
                item, source = arxiv_item(arxiv), "arxiv"
                if item.get("journal_doi"):
                    report.append(f"  note: arXiv:{arxiv} is published as "
                                  f"doi:{item['journal_doi']}; consider listing the DOI")
            else:
                sys.exit(f"entry has neither doi nor arxiv: {pub}")
        if pub.get("fix") and not pub.get("key"):
            pub["key"] = z.cite_key(item)     # keep the key the other .bib files use
        for field, value in (pub.get("fix") or {}).items():
            item["fields"][field] = value     # correct bad upstream metadata
        if not item["fields"].get("abstractNote") and not pub.get("no_abstract"):
            key = (doi or "") + "|" + (arxiv or "")
            if key not in cache:
                cache[key] = dict(zip(("abstract", "source"), fetch_abstract(doi, arxiv)))
            if cache[key].get("abstract"):
                item["fields"]["abstractNote"] = cache[key]["abstract"]
                pub["_abstract_source"] = cache[key]["source"]
        item["fields"]["abstractNote"] = unicode_math(item["fields"].get("abstractNote"))
        entries.append(build_entry(z, pub, item, used))
        report.append(f"{source:>13}  {entries[-1].split(',', 1)[0][1:]}"
                      + (f"  (abstract: {pub['_abstract_source']})" if pub.get("_abstract_source") else ""))

    with open(CACHE, "w") as f:
        json.dump(cache, f, indent=1, ensure_ascii=False, sort_keys=True)
    with open(args.output, "w") as f:
        f.write("% Generated by scripts/build_bib.py from _data/publications.yml.\n"
                "% Edit the YAML list and re-run the script; do not edit by hand.\n\n")
        f.write("\n\n".join(entries) + "\n")
    print("\n".join(report))
    print(f"\n{len(entries)} entries -> {os.path.relpath(args.output, ROOT)}")


if __name__ == "__main__":
    main()
