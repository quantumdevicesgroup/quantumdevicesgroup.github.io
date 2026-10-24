---
title: "Facilities"
layout: page
permalink: /facilities/
---

<h1 class="visually-hidden">Facilities</h1>

<p class="lead">Our lab has extensive capabilities for designing, fabricating, and characterizing integrated photonic and superconducting quantum devices.</p>

<h2>Research labs</h2>

<div class="labs-layout" markdown="0">
  <div class="labs-list">
    <div class="lab-card">
      <h3>Photonics Lab <span>Cory Hall</span></h3>
      <p>Two 4K photonic probe stations, one dilution refrigerator, telecom optoelectronics. Workstations and software licenses to design superconducting, nanomechanical, and nanophotonic devices.</p>
    </div>
    <div class="lab-card">
      <h3>Microwave Lab <span>Campbell Hall</span></h3>
      <p>Three dilution refrigerators for superconducting quantum device characterization. E-beam evaporator for Josephson junction fabrication.</p>
    </div>
    <div class="lab-card">
      <h3>Marvell NanoLab</h3>
      <p>We use UC Berkeley’s shared cleanroom facility to fabricate our devices.</p>
    </div>
  </div>
  <div class="labs-map">
    <iframe loading="lazy" src="https://www.google.com/maps/d/u/0/embed?mid=1Q1mh9HoG1jiCSpq-yy1k_Vv855tOqd8&amp;ehbc=2E312F" title="Map of the group's labs on the UC Berkeley campus"></iframe>
  </div>
</div>

<h2>Equipment</h2>

<div class="slider" data-slider markdown="0"><div class="slider-track">
{% for ph in site.data.facilities_photos %}
  <figure class="post-figure">
    <a href="{{ ph.image | prepend: '/images/' | relative_url }}" class="lightbox-link"><img src="{{ ph.image | prepend: '/images/' | relative_url }}" alt="{{ ph.caption }}" loading="lazy"></a>
    <figcaption>{{ ph.caption }}</figcaption>
  </figure>
{% endfor %}
</div></div>
