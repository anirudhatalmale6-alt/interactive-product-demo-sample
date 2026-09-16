# TERRA — interactive product demo (sample build)

A small, self-contained web experience that walks a visitor through a product's
most interesting parts: a pinned "console" that changes as you scroll, hotspots
on the live UI, and a rail you can click or drive with the arrow keys.

**The product is fictional.** The build is not — it's hand-written HTML5, CSS3
and ES6 with no framework, no build step and no third-party requests.

## Run it

Any static file server. For example:

```bash
python3 -m http.server 8000
# → http://127.0.0.1:8000
```

Opening `index.html` straight off disk works too.

## What it does

| | |
|---|---|
| **Five panels** | Live chart · interactive map · irrigation schedule · back-tested alert rule · report export |
| **Navigation** | Scroll, click the rail, press ← / →, or deep-link to `#step-3` |
| **Interaction** | Tap map parcels, toggle zones, drag the alert threshold, scrub the chart, switch export formats — all of it live, none of it a screenshot |
| **Responsive** | One codebase from 320 px to 4K; on phones the console pins to the top and the steps scroll under it |
| **Weight** | 103 KB / 7 requests · ~1.0 s load on slow 4G |
| **Browsers** | Verified in Chromium, Firefox and WebKit |

## Files

```
index.html            markup and copy
assets/css/style.css  all styling (sectioned and commented)
assets/js/app.js      all behaviour; data objects at the top
assets/fonts/         4 subset woff2 files, self-hosted
HANDOFF.md            how to host, embed and change it
```

See [HANDOFF.md](HANDOFF.md) for embedding instructions and how to swap in your
own content.
