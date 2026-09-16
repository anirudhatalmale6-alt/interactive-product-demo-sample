/* ============================================================
   TERRA — interactive product demo
   Vanilla ES6. No dependencies, no build step.
   Everything you see in the console is drawn from the data
   objects at the top of this file — swap them and the demo
   re-renders itself.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // read the entry hash before the tour starts rewriting it
  var ENTRY_HASH = window.location.hash;

  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ─────────────────────────  DATA  ───────────────────────── */

  var DAYS = 14;

  // volumetric water content (%) at three probe depths, oldest → today
  var SERIES = {
    s1: { label: '20 cm', colour: 'var(--acid)', v: [34.1,33.0,31.4,29.8,28.1,26.4,25.0,33.9,32.2,30.4,28.6,26.9,25.2,23.8] },
    s2: { label: '40 cm', colour: 'var(--sky)',  v: [31.2,30.6,29.9,29.1,28.2,27.3,26.5,30.8,30.1,29.4,28.6,27.7,26.8,28.4] },
    s3: { label: '60 cm', colour: 'var(--clay)', v: [27.4,27.2,27.0,26.7,26.4,26.1,25.8,27.9,27.7,27.5,27.2,26.9,26.6,26.3] }
  };

  var BLOCKS = [
    { id:'b7',  name:'Block 7',  variety:'Syrah',      ha:4.2, year:2011, m:28.4, pts:'14,16 118,10 126,86 22,94',   lx:70,  ly:56 },
    { id:'b8',  name:'Block 8',  variety:'Grenache',   ha:3.1, year:2008, m:19.2, pts:'134,12 236,20 228,92 130,86', lx:182, ly:58 },
    { id:'b9',  name:'Block 9',  variety:'Mourvèdre',  ha:2.4, year:2016, m:24.6, pts:'244,24 292,32 286,98 236,92', lx:265, ly:66 },
    { id:'b12', name:'Block 12', variety:'Cinsault',   ha:5.0, year:2003, m:33.9, pts:'20,104 124,96 132,178 28,186',lx:76,  ly:144 },
    { id:'b14', name:'Block 14', variety:'Carignan',   ha:3.8, year:2019, m:17.8, pts:'140,98 238,102 232,182 134,176', lx:186, ly:144 },
    { id:'b15', name:'Block 15', variety:'Counoise',   ha:1.6, year:2021, m:29.7, pts:'246,106 294,110 290,180 238,184', lx:267, ly:148 },
    { id:'b21', name:'Block 21', variety:'Viognier',   ha:2.9, year:2014, m:21.3, pts:'26,196 130,190 136,238 34,242', lx:81,  ly:220 },
    { id:'b22', name:'Block 22', variety:'Roussanne',  ha:2.2, year:2017, m:26.1, pts:'144,190 246,194 242,240 140,236', lx:193, ly:218 }
  ];

  // irrigation windows, expressed across an 18:00 → 06:00 night (12 h)
  var ZONES = [
    { id:'z1', name:'Zone A · Blk 7–9',   start:8,  dur:26, m3:22, on:true  },
    { id:'z2', name:'Zone B · Blk 12',    start:34, dur:20, m3:18, on:true  },
    { id:'z3', name:'Zone C · Blk 14–15', start:52, dur:30, m3:24, on:true  },
    { id:'z4', name:'Zone D · Blk 21–22', start:6,  dur:16, m3:15, on:false }
  ];

  /* ───────────────────  chart helpers  ─────────────────────── */

  // cardinal-spline smoothing → one path string
  function smooth(pts) {
    if (pts.length < 2) return '';
    var d = 'M' + pts[0].x + ',' + pts[0].y, t = 0.22;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + (p1.x + (p2.x - p0.x) * t) + ',' + (p1.y + (p2.y - p0.y) * t) +
           ' ' + (p2.x - (p3.x - p1.x) * t) + ',' + (p2.y - (p3.y - p1.y) * t) +
           ' ' + p2.x + ',' + p2.y;
    }
    return d;
  }

  function scale(box, lo, hi) {
    return {
      x: function (i) { return box.l + (box.w * i) / (DAYS - 1); },
      y: function (v) { return box.t + box.h - ((v - lo) / (hi - lo)) * box.h; }
    };
  }

  function grid(host, box, rows) {
    host.textContent = '';
    for (var i = 0; i <= rows; i++) {
      var y = box.t + (box.h * i) / rows;
      el('line', { x1: box.l, y1: y, x2: box.l + box.w, y2: y }, host);
    }
  }

  /* ───────────────────  PANEL 1 — moisture  ────────────────── */

  var P1 = (function () {
    var svg = $('#chart-main'), host = $('#series-main'), box = { l: 4, t: 10, w: 612, h: 205 };
    var lo = 14, hi = 38, sc = scale(box, lo, hi), paths = {}, areas = {};
    var cursor = $('#cursor-main'), out = $('#m-value');

    function build() {
      grid($('#grid-main'), box, 4);
      host.textContent = '';
      Object.keys(SERIES).forEach(function (key) {
        var s = SERIES[key];
        var pts = s.v.map(function (v, i) { return { x: sc.x(i), y: sc.y(v) }; });
        var d = smooth(pts);
        if (key === 's1') {
          areas[key] = el('path', {
            class: 'chart__area',
            d: d + 'L' + (box.l + box.w) + ',' + (box.t + box.h) + 'L' + box.l + ',' + (box.t + box.h) + 'Z'
          }, host);
        }
        paths[key] = el('path', { class: 'chart__line', d: d, style: '--c:' + s.colour }, host);
      });
      // axis labels
      var ax = $('#axis-main'), labels = ['14 days ago', '10', '7', '3', 'today'];
      ax.textContent = '';
      labels.forEach(function (t) { var s = document.createElement('span'); s.textContent = t; ax.appendChild(s); });
    }

    function animate() {
      if (reduced) return;
      Object.keys(paths).forEach(function (k) {
        var p = paths[k], len = p.getTotalLength();
        p.style.setProperty('--len', len);
        p.classList.remove('draw'); void p.offsetWidth; p.classList.add('draw');
      });
    }

    function toggle(btn) {
      var key = btn.dataset.series, on = btn.classList.toggle('is-on');
      btn.setAttribute('aria-pressed', String(on));
      paths[key].style.display = on ? '' : 'none';
      if (areas[key]) areas[key].style.display = on ? '' : 'none';
    }

    function scrub(ev) {
      var r = svg.getBoundingClientRect();
      var pct = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      var i = Math.round(pct * (DAYS - 1));
      cursor.setAttribute('x1', sc.x(i)); cursor.setAttribute('x2', sc.x(i));
      svg.classList.add('is-scrubbing');
      out.textContent = SERIES.s2.v[i].toFixed(1);
    }

    build();
    $$('.chip').forEach(function (b) {
      b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', function () { toggle(b); });
    });
    svg.addEventListener('pointermove', scrub);
    svg.addEventListener('pointerleave', function () {
      svg.classList.remove('is-scrubbing');
      out.textContent = SERIES.s2.v[DAYS - 1].toFixed(1);
    });
    return { animate: animate };
  })();

  /* ───────────────────  PANEL 2 — block map  ───────────────── */

  var P2 = (function () {
    var host = $('#blocks');
    var name = $('#b-name'), vary = $('#b-var'), bar = $('#b-bar'), val = $('#b-val'), state = $('#b-state');

    function band(m) { return m < 21 ? 'dry' : (m > 31 ? 'wet' : 'ok'); }
    function verdict(m) {
      if (m < 21) return 'Deficit. Irrigate tonight.';
      if (m > 31) return 'Wet. Skip this cycle.';
      return 'Holding. No action today.';
    }

    function select(b, node) {
      $$('.parcel', host).forEach(function (p) { p.classList.remove('is-sel'); });
      node.classList.add('is-sel');
      name.textContent = b.name;
      vary.textContent = b.variety + ' · ' + b.ha.toFixed(1) + ' ha · planted ' + b.year;
      val.textContent = b.m.toFixed(1) + '%';
      bar.style.width = Math.min(100, (b.m / 40) * 100) + '%';
      bar.style.background = band(b.m) === 'dry' ? 'var(--clay)' : band(b.m) === 'wet' ? 'var(--sky)' : 'var(--acid)';
      state.textContent = verdict(b.m);
    }

    BLOCKS.forEach(function (b, i) {
      var g = el('g', {}, host);
      var poly = el('polygon', {
        points: b.pts, class: 'parcel parcel--' + band(b.m),
        tabindex: '0', role: 'button', 'aria-label': b.name + ', ' + b.variety + ', ' + b.m + ' percent moisture'
      }, g);
      el('text', { x: b.lx, y: b.ly, class: 'parcel__lbl' }, g).textContent = b.name.replace('Block ', 'B');
      var pick = function () { select(b, poly); };
      poly.addEventListener('click', pick);
      poly.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      });
      if (i === 0) select(b, poly);
    });
  })();

  /* ───────────────────  PANEL 3 — schedule  ────────────────── */

  var P3 = (function () {
    var host = $('#zones'), total = $('#w-total');

    function sum() {
      var t = ZONES.reduce(function (a, z) { return a + (z.on ? z.m3 : 0); }, 0);
      total.textContent = t;
    }

    ZONES.forEach(function (z) {
      var row = document.createElement('div');
      row.className = 'zone' + (z.on ? ' is-on' : '');
      row.innerHTML =
        '<button class="zone__tog" type="button" aria-pressed="' + z.on + '">' +
          '<span class="sw" aria-hidden="true"></span>' + z.name +
        '</button>' +
        '<div class="zone__track"><span class="zone__win" style="--l:' + z.start + '%;--w:' + z.dur + '%"></span></div>';
      host.appendChild(row);
      row.querySelector('.zone__tog').addEventListener('click', function () {
        z.on = !z.on;
        row.classList.toggle('is-on', z.on);
        this.setAttribute('aria-pressed', String(z.on));
        sum();
      });
    });
    sum();
  })();

  /* ───────────────────  PANEL 4 — alert rule  ──────────────── */

  var P4 = (function () {
    var box = { l: 4, t: 12, w: 612, h: 140 };
    var lo = 14, hi = 38, sc = scale(box, lo, hi);
    var data = SERIES.s1.v;
    var line = $('#alert-line'), hits = $('#alert-hits'), rule = $('#thresh');
    var input = $('#thresh-input'), out = $('#t-value'), count = $('#t-count');

    grid($('#grid-alert'), box, 3);
    line.setAttribute('d', smooth(data.map(function (v, i) { return { x: sc.x(i), y: sc.y(v) }; })));

    function render() {
      var t = +input.value, y = sc.y(t);
      out.textContent = t;
      rule.setAttribute('x1', box.l); rule.setAttribute('x2', box.l + box.w);
      rule.setAttribute('y1', y); rule.setAttribute('y2', y);

      hits.textContent = '';
      var n = 0;
      for (var i = 0; i < data.length; i++) {
        var below = data[i] < t, wasBelow = i > 0 && data[i - 1] < t;
        if (below && !wasBelow) {
          n++;
          // a zero-length round-capped line stays a circle even though the chart is stretched
          el('line', { x1: sc.x(i), y1: sc.y(data[i]), x2: sc.x(i) + 0.01, y2: sc.y(data[i]), class: 'hit' }, hits);
        }
      }
      count.textContent = n === 0 ? 'no alerts in 14 days' : n + (n === 1 ? ' alert' : ' alerts') + ' last 14 days';
    }

    input.addEventListener('input', render);
    render();
  })();

  /* ───────────────────  PANEL 5 — report  ──────────────────── */

  var P5 = (function () {
    var doc = $('#doc'), kind = $('#doc-kind'), done = $('#dl-done'), btn = $('#dl');
    var spark = $('#doc-spark'), timer = null;

    spark.setAttribute('d', smooth([12,20,16,28,24,34,30,38].map(function (v, i) {
      return { x: 6 + i * 30, y: 40 - v };
    })));

    $$('.fmt').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.classList.contains('is-on')));
      b.addEventListener('click', function () {
        $$('.fmt').forEach(function (o) { o.classList.remove('is-on'); o.setAttribute('aria-pressed', 'false'); });
        b.classList.add('is-on'); b.setAttribute('aria-pressed', 'true');
        kind.textContent = b.dataset.fmt;
        done.hidden = true;
      });
    });

    btn.addEventListener('click', function () {
      var fmt = ($('.fmt.is-on') || { dataset: { fmt: 'PDF' } }).dataset.fmt;
      doc.classList.add('is-pop');
      done.hidden = false;
      done.textContent = '✓ season-report.' + fmt.toLowerCase() + ' ready';
      clearTimeout(timer);
      timer = setTimeout(function () { doc.classList.remove('is-pop'); }, 1400);
    });
  })();

  /* ───────────────────  TOUR CONTROLLER  ───────────────────── */

  var TOUR = (function () {
    var steps   = $$('.step');
    var panels  = $$('.panel');
    var railEl  = $('#rail');
    var label   = $('#console-label');
    var prev    = $('#prev'), next = $('#next');
    var titles  = ['Live moisture', 'Block map', 'Irrigation', 'Alert rules', 'Reports'];
    var current = -1, ticking = false;

    // build the rail from the steps themselves
    steps.forEach(function (s, i) {
      var li = document.createElement('li');
      var b  = document.createElement('button');
      b.className = 'rail__btn'; b.type = 'button';
      b.textContent = String(i + 1).padStart(2, '0') + ' ' + titles[i];
      b.addEventListener('click', function () { goTo(i); });
      li.appendChild(b); railEl.appendChild(li);
    });
    var railBtns = $$('.rail__btn');

    function setActive(i, inView) {
      if (i === current) return;
      current = i;
      panels.forEach(function (p, j) { p.classList.toggle('is-active', j === i); });
      railBtns.forEach(function (b, j) { b.setAttribute('aria-current', String(j === i)); });
      label.innerHTML = String(i + 1).padStart(2, '0') + ' &middot; ' + titles[i];
      prev.disabled = i === 0;
      next.disabled = i === steps.length - 1;
      if (i === 0) P1.animate();
      // keep the URL shareable, but don't stamp a hash on someone sitting on the hero
      if (inView && history.replaceState) history.replaceState(null, '', '#step-' + (i + 1));
    }

    function goTo(i) {
      i = Math.max(0, Math.min(steps.length - 1, i));
      var top = steps[i].getBoundingClientRect().top + window.pageYOffset, offset;
      if (window.innerWidth < 900) {
        // phone: park the step just under the sticky console, on the reading line
        offset = $('.stage__sticky').getBoundingClientRect().height + 58;
      } else {
        offset = Math.max(0, (window.innerHeight - steps[i].offsetHeight) / 2);
      }
      window.scrollTo({ top: top - offset - 10, behavior: reduced ? 'auto' : 'smooth' });
    }

    // a step takes over once its top edge crosses the reading line —
    // on phones that line sits just under the pinned console, on desktop mid-screen
    function readingLine() {
      if (window.innerWidth >= 900) return window.innerHeight * 0.55;
      return $('.stage__sticky').getBoundingClientRect().bottom + 40;
    }

    function measure() {
      ticking = false;
      var line = readingLine(), best = 0;
      steps.forEach(function (s, i) {
        if (s.getBoundingClientRect().top <= line) best = i;
      });
      var t = $('#tour').getBoundingClientRect();
      setActive(best, t.top < window.innerHeight * 0.8 && t.bottom > 0);
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(measure); }
    }

    prev.addEventListener('click', function () { goTo(current - 1); });
    next.addEventListener('click', function () { goTo(current + 1); });

    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea')) return;
      var r = $('#tour').getBoundingClientRect();
      if (r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.5) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(current - 1); }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();
    return { goTo: goTo };
  })();

  /* deep links: /#step-3 lands on step three */
  window.addEventListener('load', function () {
    var m = /^#step-(\d)$/.exec(ENTRY_HASH);
    if (m) TOUR.goTo(+m[1] - 1);
  });
})();
