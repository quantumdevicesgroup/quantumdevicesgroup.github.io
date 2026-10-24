---
title: "Team"
layout: page
permalink: /team/
---

<h1 class="visually-hidden">Team</h1>

{% assign people = site.people | sort: "order" %}
{% assign pi = people | where: "group", "pi" | first %}

<div class="pi-card section-card" markdown="0">
  <a href="{{ pi.url | relative_url }}"><img src="{{ pi.photo | prepend: '/images/' | relative_url }}" class="pi-photo" alt="{{ pi.name }}" width="160" height="213"></a>
  <div>
    <p class="pi-label">Principal Investigator</p>
    <h2 class="pi-name"><a href="{{ pi.url | relative_url }}">{{ pi.name }}</a></h2>
    <ul class="person-positions">{% for p in pi.positions %}<li>{{ p | markdownify | remove: '<p>' | remove: '</p>' }}</li>{% endfor %}</ul>
  </div>
</div>

{% assign grid_groups = "postdoc,grad" | split: "," %}
{% for key in grid_groups %}
{% assign grp = site.data.groups | where: "key", key | first %}
{% assign members = people | where: "group", key %}
<h2>{{ grp.title }}</h2>
<div class="team-grid" markdown="0">
{% for m in members %}
  <a class="team-card" href="{{ m.url | relative_url }}">
    <img src="{{ m.photo | default: 'people/placeholder.jpg' | prepend: '/images/' | relative_url }}" class="team-photo" alt="" loading="lazy"{% if m.photo_position %} style="object-position: {{ m.photo_position }}"{% endif %}>
    <span class="team-name">{{ m.name }}</span>
    <span class="team-info">{% if m.dept %}{{ m.dept }}{% endif %}{% if m.coadvisor %}Co-advisor: {{ m.coadvisor }}{% endif %}</span>
  </a>
{% endfor %}
{% if key == "grad" %}
  <a class="team-card team-card-join" href="{{ '/join/' | relative_url }}">
    <span class="team-join-plus">+</span>
    <span class="team-name">Join us</span>
    <span class="team-info">We are always looking for talented and motivated researchers.</span>
  </a>
{% endif %}
</div>
{% endfor %}

{% assign ugrads = people | where: "group", "undergrad" %}
<h2>Undergraduate researchers</h2>
<div class="section-card table-card" markdown="0" tabindex="0" role="region" aria-label="Undergraduate researchers">
<table class="alumni-table">
<thead><tr><th>Name</th><th>Department</th><th>Tenure</th><th>Topic</th></tr></thead>
<tbody>
{% for m in ugrads %}<tr><td>{% if m.pub_count > 0 %}<a href="{{ m.url | relative_url }}">{{ m.name }}</a>{% else %}{{ m.name }}{% endif %}{% if m.google_scholar %} <a href="{{ m.google_scholar }}" class="ext-link" title="Google Scholar" aria-label="{{ m.name }} on Google Scholar">{% include icon.html name="google-scholar" %}</a>{% endif %}</td><td>{{ m.dept }}</td><td>{{ m.tenure }}</td><td>{{ m.topic }}</td></tr>
{% endfor %}
</tbody>
</table>
</div>

<h2>Group photos</h2>
<div class="slider" data-slider markdown="0"><div class="slider-track">
{% for ph in site.data.group_photos %}
  <figure class="post-figure">
    <a href="{{ ph.image | prepend: '/images/' | relative_url }}" class="lightbox-link"><img src="{{ ph.image | prepend: '/images/' | relative_url }}" alt="Group photo, {{ ph.caption | split: '.' | first | split: ':' | first }}" loading="lazy"></a>
    <figcaption>{{ ph.caption }}</figcaption>
  </figure>
{% endfor %}
</div></div>

<h2 id="alumni">Group alumni</h2>
{% assign alumni_groups = site.data.groups | where: "alumni", true %}
{% for grp in alumni_groups %}
{% assign members = people | where: "group", grp.key %}
{% if members.size > 0 %}
<h3>{{ grp.title }}</h3>
<div class="section-card table-card" markdown="0" tabindex="0" role="region" aria-label="Alumni: {{ grp.title }}">
<table class="alumni-table">
<thead><tr>
  <th>Name</th>
  {% if grp.key == "alumni-visitor" or grp.key == "alumni-visiting-professor" %}<th>Home institution</th>{% elsif grp.key != "alumni-postdoc" %}<th>Department</th>{% endif %}
  <th>Tenure</th>
  {% unless grp.key == "alumni-visiting-professor" %}<th>Next position</th>{% endunless %}
  {% if grp.key == "alumni-grad" %}<th>Thesis</th>{% endif %}
</tr></thead>
<tbody>
{% for m in members %}<tr>
  <td>{% if m.pub_count > 0 %}<a href="{{ m.url | relative_url }}">{{ m.name }}</a>{% else %}{{ m.name }}{% endif %}{% if m.website %} <a href="{{ m.website }}" class="ext-link" title="Website" aria-label="{{ m.name }}'s website">{% include icon.html name="house" %}</a>{% endif %}{% if m.google_scholar %} <a href="{{ m.google_scholar }}" class="ext-link" title="Google Scholar" aria-label="{{ m.name }} on Google Scholar">{% include icon.html name="google-scholar" %}</a>{% endif %}</td>
  {% if grp.key == "alumni-visitor" or grp.key == "alumni-visiting-professor" %}<td>{{ m.institution }}</td>{% elsif grp.key != "alumni-postdoc" %}<td>{{ m.dept }}</td>{% endif %}
  <td>{{ m.tenure }}</td>
  {% unless grp.key == "alumni-visiting-professor" %}<td>{{ m.next_position }}</td>{% endunless %}
  {% if grp.key == "alumni-grad" %}<td>{% if m.thesis_url %}<a href="{{ m.thesis_url }}">{{ m.thesis }}</a>{% else %}{{ m.thesis }}{% endif %}</td>{% endif %}
</tr>
{% endfor %}
</tbody>
</table>
</div>
{% endif %}
{% endfor %}
