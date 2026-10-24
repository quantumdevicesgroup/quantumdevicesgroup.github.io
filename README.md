# Quantum Devices Group website

Source for the group website, built with Jekyll from
[sbryngelson/academic-website-template](https://github.com/sbryngelson/academic-website-template)
(MIT license, see `LICENSE`) and restyled after the UC Berkeley brand theme of
the previous WordPress site.

## Preview locally

```sh
brew install ruby                       # once; macOS's system Ruby is too old
export PATH=/opt/homebrew/opt/ruby/bin:$PATH LANG=en_US.UTF-8
bundle config set --local path vendor/bundle && bundle install   # once
bundle exec jekyll serve                # http://localhost:4000
```

## Add a person

Create `_people/first-last.md`. The file name becomes the page URL
(`/team/first-last/`).

```yaml
---
name: "First Last"
group: grad            # pi, postdoc, grad, undergrad, or alumni-grad,
                       # alumni-postdoc, alumni-undergrad, alumni-visitor,
                       # alumni-visiting-professor (sections: _data/groups.yml)
order: 9               # position within the section
dept: "EECS"
photo: "people/first-last.jpg"   # in images/; square-ish, about 600 px
since: 2026            # first year their papers count as group papers
# optional: coadvisor, website, email, github, tenure, next_position,
#           thesis, thesis_url, institution,
#           photo_position: "50% 40%"   # move the circular crop (x% y%)
---
Optional bio in Markdown.
```

A person's papers are found automatically: an author matches when the surname
is the same and the first initial agrees, for papers from `since` on. If a
name is written differently in papers, add `bib_last:` and/or `bib_initial:`.
When someone leaves, change `group:` to the matching `alumni-` group and add
`tenure:` and `next_position:`.

## Add a paper

1. Add the DOI (and arXiv id, if any) at the top of `_data/publications.yml`.
2. Run `python3 scripts/build_bib.py`. It takes the metadata from the local
   Zotero library (`../scripts/zotero.py`, or set `ZOTERO_PY`), falling back to
   Crossref or arXiv, and rewrites `assets/ref.bib`. Cite keys match the
   group's other `.bib` files.
3. Commit both files.

Optional fields per paper are documented at the top of the YAML file
(`equal`, `links`, `venue_note`, `fix`, `thrusts`, `group`, `highlight`,
`image`, `home`).

**Research highlights.** A paper with a `highlight:` (a two-sentence summary)
and an `image:` (a figure cropped from the paper, in `images/highlights/`)
gets a slide in the Research highlights slider of every research page listed
in its `thrusts:`, and on the home page unless it also has `home: false`.

## Edit a research page

Each research direction is a file in `_research/`. The front matter holds:

- `summary:` two sentences, shown on the home-page tile and the Research overview card
- `image:` the tile picture (also used for link previews)
- `topics:` the "Recent topics" rows, each with `title`, `text`, an optional
  `note` (HTML, e.g. a collaborator link) and `papers` (`{label, url}` links)

The paragraph below the front matter is the page's intro. The page then shows
the research highlights and the group's papers tagged with that direction.
`past-research.md` instead lists `sections`, each with a `title`, the `thrust`
whose pre-Berkeley papers it shows and an optional `text` paragraph.

## Post news

Create `_posts/YYYY-MM-DD-short-title.md` and put its photos in
`images/news/` (shrink first: `sips -Z 1600 photo.jpg`).

```markdown
---
title: "Second Dilution Fridge Up!"
tags: [Research]                      # Awards, Fun, Research, Results, Seminars, Team
image: /images/news/2024-08-11-fridge-1.jpg   # optional; first photo is used otherwise
---

One or two sentences; the first paragraph becomes the summary in the feed.

![Fridge arriving](/images/news/2024-08-11-fridge-1.jpg)
*Optional caption on the line right below the image*

![Second photo](/images/news/2024-08-11-fridge-2.jpg)

<https://www.youtube.com/watch?v=...>   <- a link alone on a line becomes a video or link card
```

Two or more photos in a row become a photo grid; PNG graphics (posters,
figures) are shown whole. Photos open full size on click. All of this is done
by `_plugins/news_posts.rb` at build time.

## How the publication features work

- `/publications/` groups papers by year, with search, type and member filters.
  Filter state is kept in the URL, so `?member=lukasz-komza` can be linked.
- Every person with papers gets a list on their page and a
  `/team/<slug>/publications.bib` download; `/publications.bib` has everything.
- The matching and author formatting live in `_plugins/group_people.rb`. It
  runs during the build, so it also works on GitHub Actions.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main` (Settings → Pages → Source: GitHub Actions). Serving it at
quantumdevices.berkeley.edu needs a CNAME record from campus DNS pointing to
`quantumdevicesgroup.github.io`, plus the domain set under Settings → Pages.

## Fonts

The Berkeley fonts (Freight Sans Pro, Freight Micro Pro) load from an Adobe
Fonts web project, set by `adobe_fonts_kit` in `_config.yml`. It is currently
the WordPress site's kit (`scr0aog`). To use a kit of your own, create a web
project at fonts.adobe.com with both families in weights 400 and 700, normal
and italic, set its character set to **All Characters** (otherwise letters such
as ğ, ş, ı and İ are drawn in a fallback font), and put its ID in
`adobe_fonts_kit`. If the kit stops serving, the site falls back to Source
Serif 4 and the system sans.
