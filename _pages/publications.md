---
title: "Publications"
layout: page
permalink: /publications/
---

<h1 class="visually-hidden">Publications</h1>

{% assign people = site.people | sort: "pub_rank" %}
<div class="pub-controls" markdown="0">
  <input type="search" class="pub-search" id="pubSearch" placeholder="Search by title, author, journal or year" aria-label="Search publications">
  <div class="pub-filters">
    <label class="member-filter">
      <span>Group member</span>
      <select id="memberFilter">
        <option value="">Anyone</option>
        <optgroup label="Current members">
        {% for m in people %}{% if m.pub_count > 0 %}{% unless m.group contains "alumni" %}<option value="{{ m.slug }}" data-url="{{ m.url | relative_url }}">{{ m.name }} ({{ m.pub_count }})</option>{% endunless %}{% endif %}{% endfor %}
        </optgroup>
        <optgroup label="Alumni">
        {% for m in people %}{% if m.pub_count > 0 %}{% if m.group contains "alumni" %}<option value="{{ m.slug }}" data-url="{{ m.url | relative_url }}">{{ m.name }} ({{ m.pub_count }})</option>{% endif %}{% endif %}{% endfor %}
        </optgroup>
      </select>
    </label>
    <p class="pub-count" id="pubCount" aria-live="polite"></p>
    <p class="pub-links">
      <a href="{{ site.links.google_scholar }}">All publications on Google Scholar</a>
      <a href="{{ '/publications.bib' | relative_url }}" download>&darr; Download as BibTeX</a>
    </p>
  </div>
  <p class="pub-member-link" id="memberLink" hidden></p>
</div>

<div class="pub-list" id="pubList" markdown="0">
{% capture publist %}{% bibliography --group_by year --group_order descending %}{% endcapture %}{{ publist }}
{% include pub_legend.html list=publist %}
</div>
