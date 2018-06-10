---
title: My Albums
---

{% for album in site.data.albums %}
- [{{ album.title }}, by {{ album.artist }}]({{ album.url }})<br/>
  <small style="color:gray;">{{ album.release_date | date: "%b %-d, %Y" }}</small>
{% endfor %}
