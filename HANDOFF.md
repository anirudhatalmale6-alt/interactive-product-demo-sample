# TERRA demo — hand-off guide

A self-contained interactive product demo. Static files only: no build step, no
package manager, no server-side code, no third-party requests.

---

## 1. What's in the box

```
terra-demo/
├── index.html              the whole page (markup + content)
├── assets/
│   ├── css/style.css       all styling, in one commented file
│   ├── js/app.js           all behaviour, in one commented file
│   └── fonts/*.woff2       4 self-hosted, subset web fonts (40 KB total)
├── README.md
└── HANDOFF.md              this file
```

Nothing else is needed. No CDN, no Google Fonts, no analytics, no cookies.

---

## 2. Hosting it

### Option A — a folder on your existing site
Copy `terra-demo/` into your web root and link to it:

```
https://yoursite.com/demo/
```

Any static host works: Apache, nginx, IIS, S3 + CloudFront, Netlify, Vercel,
GitHub Pages, cPanel file manager. Upload the folder, done.

### Option B — a subdomain
Point `demo.yoursite.com` at the folder. No configuration beyond a normal
static vhost; the page makes no server calls.

### Option C — inside a page of your main site
Two ways:

**Inline** — paste the contents of `<body>` into your page template, move the
two `<link>`/`<script>` tags into your template's head/footer, and fix the
asset paths (`assets/…` → wherever you put them). The CSS is namespaced enough
to coexist, but check for collisions on generic class names if your site
already defines `.btn`, `.chip` or `.step`.

**iframe** (safer, zero collisions):

```html
<iframe src="/demo/" title="Product demo"
        style="width:100%;height:100vh;border:0" loading="lazy"></iframe>
```

You can deep-link a single step: `/demo/#step-3` opens on step three.

### Caching
The asset filenames are stable, so if you push updates either rename the files
or set a short cache lifetime:

```
# .htaccess
<FilesMatch "\.(woff2)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\.(css|js|html)$">
  Header set Cache-Control "public, max-age=3600"
</FilesMatch>
```

---

## 3. Changing the content

### Copy and headlines
All prose lives in `index.html`. Each tour step is one `<article class="step">`;
its heading, paragraph and bullet list are plain HTML.

### The five console panels
Each panel is a `<div class="panel" data-panel="N">` inside `#screen`.
Panels are swapped by the tour controller — you never toggle them by hand.

### The data behind the charts, map and schedule
Open `assets/js/app.js`. The top of the file is a DATA block:

- `SERIES`   — 14 days × 3 depths of moisture readings. Change the numbers and
               both charts redraw.
- `BLOCKS`   — the map. Each entry has an SVG `pts` polygon, a name, and a
               moisture figure. Add or remove entries and the map rebuilds.
- `ZONES`    — irrigation rows: label, window start/duration (% of the night),
               water cost, default on/off state.

Nothing is hard-coded in the markup, so swapping the data is enough.

### Adding or removing a tour step
1. Add an `<article class="step" id="step-6" data-step="6">` block.
2. Add a matching `<div class="panel" data-panel="6">` inside `#screen`.
3. Add its title to the `titles` array in `app.js` (the rail builds itself
   from the steps, so nothing else needs touching).

### Hotspots
```html
<button class="hot" style="--x:38%; --y:20%" data-tip="Your label here"
        type="button" aria-label="Hotspot: short description"></button>
```
`--x` / `--y` are percentages of the console screen. Optional `--mx` / `--my`
give a different position on phones, where the panel reflows.

### Colours and type
Every colour and font is a CSS variable at the top of `style.css` under
`:root`. Change `--acid`, `--clay`, `--ink`, `--paper` and the whole page
follows. To swap fonts, drop new `.woff2` files into `assets/fonts/` and edit
the four `@font-face` blocks.

---

## 4. Browser support

Verified on this build, all three engines driven through the full tour with
interactions:

| Engine            | Result                                            |
|-------------------|---------------------------------------------------|
| Chromium / Chrome | no console errors, all panels render, layout identical |
| Firefox (Gecko)   | no console errors, all panels render, layout identical |
| WebKit / Safari   | no console errors, all panels render, layout identical |

Also checked: 1440 px, 1366 px, 390 px and 320 px viewports; no horizontal
scrolling at any of them.

Uses `svh` units, `aspect-ratio`, `display:contents` and CSS custom properties
— Chrome 105+, Firefox 101+, Safari 15.4+. Older browsers degrade to a
readable, scrollable page rather than breaking.

---

## 5. Performance

Measured in Chromium with network throttling, cold cache, 3 runs each:

| Connection                      | `load` event | First paint |
|---------------------------------|--------------|-------------|
| Slow 4G (1.6 Mbps, 150 ms RTT)  | ~1.0 s       | ~0.9 s      |
| Regular 4G (9 Mbps, 60 ms RTT)  | ~0.35 s      | ~0.39 s     |

Total: **103 KB across 7 requests** (HTML 18 KB, CSS 25 KB, JS 16 KB, fonts
41 KB). Gzip on the server takes the text files to about 18 KB combined.

Why it's small: no framework, no icon library, no images. The charts, the map
and the document mock-up are inline SVG and CSS. The fonts are subset to the
Latin characters the page actually uses.

If you want it smaller still: minify the CSS and JS (saves ~8 KB), and enable
Brotli on the server.

---

## 6. Accessibility notes

- Every interactive element is a real `<button>` or `<input>`; the tour is
  fully keyboard-operable (Tab, Enter/Space, and ← → while the tour is on screen).
- Map parcels are focusable and respond to Enter/Space.
- Toggles and chips carry `aria-pressed`; the rail carries `aria-current`.
- `prefers-reduced-motion` is respected — animations and smooth scrolling are
  switched off for users who ask for that.
- Colour is never the only signal: every state has a text label next to it.

---

## 7. Known scope of this build

This is a demo of a **fictional** product. The company, the numbers, the
grower's quote and the season figures are invented for the sample. Replace
them before this goes anywhere near a real audience.
