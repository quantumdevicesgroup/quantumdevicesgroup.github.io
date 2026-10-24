---
title: "Home"
layout: page
permalink: /
---

<h1 class="visually-hidden">{{ site.name }}</h1>

<p class="lead home-lead">The Sipahigil Lab at UC Berkeley and Berkeley Lab develops solid-state quantum hardware, including superconducting circuits, nanomechanical systems, silicon photonics and integrated electro-optics. On each platform, we study the fundamental materials and device physics that limits performance: how qubits, emitters and transducers interact with their microscopic environment of defects, phonons and interfaces. We use this understanding to engineer devices with longer coherence and lower errors, and to build the interconnects that link them into larger quantum systems.</p>

<h2><a class="heading-link" href="{{ '/research/' | relative_url }}">Current research directions</a></h2>
{% include research_tiles.html %}

<h2>Research highlights</h2>
<div class="slider highlight-slider" data-slider markdown="0"><div class="slider-track">
{% bibliography --query @*[homehighlight=true] --template highlight %}
</div></div>

<h2>Latest publications</h2>
<div class="pub-list pub-list-flat" markdown="0">
{% capture publist %}{% bibliography --max 4 %}{% endcapture %}{{ publist }}
{% include pub_legend.html list=publist %}
</div>
<p class="see-more" markdown="0"><a class="see-more-btn" href="{{ '/publications/' | relative_url }}">See all publications</a></p>

{% if site.posts.size > 0 %}
<h2>Latest news</h2>
<div class="news-feed news-feed-home" markdown="0">
{% for post in site.posts limit: 3 %}{% include news_item.html post=post %}{% endfor %}
</div>
<p><a href="{{ '/news/' | relative_url }}">All news &rarr;</a></p>
{% endif %}
