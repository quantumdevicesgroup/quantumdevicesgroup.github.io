---
title: "Postdoc fellowships"
layout: page
permalink: /join/postdoc-fellowships/
---

<p class="breadcrumb-line"><a href="{{ '/join/' | relative_url }}">Join us</a> &rsaquo; Postdoc fellowships</p>

<h1>Postdoc fellowships</h1>

<p class="lead">An incomplete list of postdoc fellowship opportunities. Please review deadlines and eligibility, and feel free to reach out to discuss.</p>

<div class="section-card table-card" markdown="0" tabindex="0" role="region" aria-label="Postdoc fellowship opportunities">
<table class="alumni-table">
<thead><tr><th>Fellowship</th><th>Eligibility / comments</th><th>Last known deadline</th></tr></thead>
<tbody>
{% assign general = site.data.postdoc_fellowships | where_exp: "f", "f.country == nil" %}{% for f in general %}<tr><td><a href="{{ f.url }}">{{ f.name }}</a></td><td>{{ f.eligibility }}</td><td class="nowrap-sm">{{ f.deadline }}</td></tr>
{% endfor %}<tr><td>Others?</td><td>Please reach out to <a href="mailto:{{ site.email }}">Alp</a>, and we can include them here.</td><td></td></tr>
</tbody>
</table>
</div>

<h2>Country-specific programs</h2>

<p>Many countries fund their own researchers to do a postdoc abroad. If you are a citizen of, or did your PhD in, a country with such a program, please check with its research council or foundation for current eligibility and deadlines. Some we know of:</p>

{% assign national = site.data.postdoc_fellowships | where_exp: "f", "f.country != nil" | group_by: "country" %}
<ul class="country-programs" markdown="0">
{% for c in national %}<li><strong>{{ c.name }}:</strong> {% for f in c.items %}<a href="{{ f.url }}">{{ f.name }}</a> <span class="text-muted">({{ f.deadline }})</span>{% unless forloop.last %}; {% endunless %}{% endfor %}</li>
{% endfor %}</ul>

<p>Please feel free to share this information with others who might benefit from it!</p>

<p class="text-muted"><small>Links and deadlines last checked October 2026.</small></p>
