---
title: "News"
layout: page
permalink: /news/
---

<h1 class="visually-hidden">News</h1>

<div id="newsList" markdown="0">
{% assign by_year = site.posts | group_by_exp: "p", "p.date | date: '%Y'" %}
{% for year in by_year %}
<section class="news-year">
  <h2 class="news-year-heading">{{ year.name }}</h2>
  <div class="news-feed">
  {% for post in year.items %}{% include news_item.html post=post %}{% endfor %}
  </div>
</section>
{% endfor %}
</div>
