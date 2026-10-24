---
title: "Lab Dashboard"
layout: page
permalink: /lab-dashboard/
---

<h1 class="visually-hidden">Lab Dashboard</h1>

<p class="dashboard-intro">Live status of the group's cryogenic and deposition systems. <a href="{{ site.lab_status_url }}" target="_blank" rel="noopener">Open full screen &#8599;</a></p>

<div class="dashboard-frame" markdown="0">
  <iframe id="labStatusFrame" src="{{ site.lab_status_url }}" title="Lab status dashboard" loading="eager"></iframe>
</div>

<script>
  // Once the group site and lab-status share a domain (quantumdevices.berkeley.edu
  // serves both), the iframe is same-origin: size it to its content and drop the
  // dashboard's own title line, which the site header replaces. Cross-origin
  // (localhost, github.io) the browser blocks this and the CSS height is used.
  (function () {
    var frame = document.getElementById('labStatusFrame');
    frame.addEventListener('load', function () {
      var doc;
      try { doc = frame.contentDocument; } catch (e) { return; }
      if (!doc || !doc.body) return;
      var style = doc.createElement('style');
      style.textContent = 'header h1, #site-link, #site-link-br { display: none !important; }';
      doc.head.appendChild(style);
      function fit() { frame.style.height = doc.documentElement.scrollHeight + 'px'; }
      fit();
      if ('ResizeObserver' in window) new ResizeObserver(fit).observe(doc.body);
    });
  })();
</script>
