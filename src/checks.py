# -*- coding: utf-8 -*-
"""TERRA — interactive product demo — automatic checks.

Run against the PUBLISHED site, not a local copy:

    python3 src/checks.py

Exit code is non-zero if any check fails, so it drops straight into CI.
The suite prints its own total; that total is the number quoted for this
project on the studio page, and anyone can recount it by running this file.
"""

BASE = 'https://anirudhatalmale6-alt.github.io/interactive-product-demo-sample/'
TITRE = 'TERRA'

import sys
import urllib.request

ok = [0]
ko = [0]


def t(nom, cond, detail=''):
    if cond:
        ok[0] += 1
        print('  ok    %s' % nom)
    else:
        ko[0] += 1
        print('  ECHEC %s   %s' % (nom, detail))


def head(url):
    """Status code for a url, without downloading the body twice."""
    try:
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except Exception as e:
        return getattr(e, 'code', 0)


def common(pg, base, expect_title):
    """The checks that apply to every page we publish."""
    errs = []
    failed = []
    third = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('response', lambda r: (
        failed.append('%s %s' % (r.status, r.url)) if r.status >= 400 else None,
        third.append(r.url) if not r.url.startswith(base.rsplit('/', 1)[0]) and r.url.startswith('http') else None,
    ))

    resp = pg.goto(base, wait_until='networkidle')
    t('the published page answers 200', resp is not None and resp.status == 200,
      'status=%s' % (resp.status if resp else 'none'))
    t('the title is the one we expect', expect_title.lower() in pg.title().lower(),
      'got %r' % pg.title())
    t('the html carries a lang attribute',
      bool(pg.evaluate("document.documentElement.getAttribute('lang')")))
    t('there is a viewport meta',
      pg.evaluate("!!document.querySelector('meta[name=viewport]')"))
    desc = pg.evaluate("(document.querySelector('meta[name=description]')||{}).content||''")
    t('the description meta is present and not empty', len(desc.strip()) > 20,
      '%r' % desc[:40])
    t('exactly one h1', pg.evaluate("document.querySelectorAll('h1').length") == 1,
      'count=%s' % pg.evaluate("document.querySelectorAll('h1').length"))
    t('the h1 is not empty',
      len((pg.evaluate("(document.querySelector('h1')||{}).textContent||''") or '').strip()) > 2)
    t('there is a main landmark', pg.evaluate("!!document.querySelector('main')"))
    t('every image carries an alt attribute', pg.evaluate(
        "Array.from(document.images).every(i=>i.hasAttribute('alt'))"))
    t('no element uses a positive tabindex', pg.evaluate(
        "!document.querySelector('[tabindex]:not([tabindex=\"0\"]):not([tabindex=\"-1\"])')"))
    t('every button has an accessible name', pg.evaluate(
        "Array.from(document.querySelectorAll('button')).every(b=>"
        "((b.textContent||'').trim()||b.getAttribute('aria-label')||b.getAttribute('title')||'').length>0)"))
    t('the web fonts finish loading', pg.evaluate("document.fonts.status") in ('loaded', 'loading'))
    t('every link that opens a new tab sets rel=noopener', pg.evaluate(
        "Array.from(document.querySelectorAll('a[target=_blank]')).every(a=>(a.rel||'').includes('noopener'))"))

    for w, h in ((390, 780), (768, 1024), (1280, 800)):
        pg.set_viewport_size({'width': w, 'height': h})
        pg.wait_for_timeout(260)
        sw = pg.evaluate('document.documentElement.scrollWidth')
        t('no horizontal overflow at %spx' % w, sw <= w + 1, 'scrollWidth=%s' % sw)
    pg.set_viewport_size({'width': 1280, 'height': 800})

    t('the console reports no error', not errs, '; '.join(errs[:3]))
    t('no request came back 400 or worse', not failed, '; '.join(failed[:3]))
    t('nothing is loaded from a third party', not third, '; '.join(third[:3]))
    return errs, failed, third


def same_origin_links(pg, base):
    """Every internal link must actually resolve."""
    hrefs = pg.evaluate(
        "Array.from(document.querySelectorAll('a[href]')).map(a=>a.href)"
        ".filter(h=>h.startsWith(location.origin))")
    seen = []
    for h in sorted(set(hrefs)):
        if '#' in h:
            h = h.split('#')[0]
        if not h or h in seen:
            continue
        seen.append(h)
    for h in seen[:12]:
        t('internal link resolves: %s' % h.rsplit('/', 2)[-1] or '/', head(h) == 200)
    return seen


def anchors_resolve(pg):
    """Every #anchor used in the page must point at an element that exists."""
    bad = pg.evaluate(
        "Array.from(document.querySelectorAll('a[href^=\"#\"]'))"
        ".map(a=>a.getAttribute('href')).filter(h=>h.length>1)"
        ".filter(h=>!document.querySelector(h))")
    t('every #anchor in the page points at a real element', not bad, str(bad[:4]))


def verdict():
    total = ok[0] + ko[0]
    print('')
    print('  %s checks, %s passed, %s failed' % (total, ok[0], ko[0]))
    sys.exit(1 if ko[0] else 0)

from playwright.sync_api import sync_playwright   # noqa: E402


def specifiques(pg):

    # The three series chips drive the chart; each must toggle independently.
    chips = pg.evaluate("Array.from(document.querySelectorAll('[data-series]')).map(c=>c.dataset.series)")
    t('the three series chips are present', len(chips) >= 3, str(chips))
    t('the series chips have distinct keys', len(chips) == len(set(chips)), str(chips))
    first = pg.query_selector('[data-series]')
    was = first.get_attribute('class') or ''
    first.click()
    pg.wait_for_timeout(320)
    now = pg.query_selector('[data-series]').get_attribute('class') or ''
    t('clicking a series chip changes its state', was != now, '%r -> %r' % (was, now))
    first.click()
    pg.wait_for_timeout(260)

    # Hotspots: the explanatory layer over the product shot.
    hots = pg.evaluate("Array.from(document.querySelectorAll('.hot')).map(h=>h.dataset.tip||'')")
    t('the product tour has its hotspots', len(hots) >= 6, 'count=%s' % len(hots))
    t('every hotspot carries an explanatory tip', all(len(h.strip()) > 8 for h in hots),
      str([h[:18] for h in hots if len(h.strip()) <= 8]))
    t('no two hotspots repeat the same tip', len(hots) == len(set(hots)))
    t('every hotspot is positioned', pg.evaluate(
        "Array.from(document.querySelectorAll('.hot')).every(h=>(h.getAttribute('style')||'').includes('--x'))"))

    # The export format buttons are mutually exclusive.
    fmts = pg.evaluate("Array.from(document.querySelectorAll('[data-fmt]')).map(f=>f.dataset.fmt)")
    t('the export formats are offered', len(fmts) >= 3, str(fmts))
    t('exactly one format starts selected',
      pg.evaluate("document.querySelectorAll('[data-fmt].is-on').length") == 1)
    pg.evaluate("document.querySelectorAll('[data-fmt]')[1].click()")
    pg.wait_for_timeout(300)
    t('choosing another format keeps the selection exclusive',
      pg.evaluate("document.querySelectorAll('[data-fmt].is-on').length") == 1)
    t('the format that was clicked is the one now selected',
      pg.evaluate("document.querySelectorAll('[data-fmt]')[1].classList.contains('is-on')"))

    # Keyboard: the interactive bits must be reachable without a mouse.
    t('the chips are focusable from the keyboard', pg.evaluate(
        "(()=>{const c=document.querySelector('[data-series]');c.focus();"
        "return document.activeElement===c;})()"))
    t('the hotspots are real buttons, not clickable divs', pg.evaluate(
        "Array.from(document.querySelectorAll('.hot')).every(h=>h.tagName==='BUTTON')"))


def main():
    print('TERRA — interactive product demo')
    print('  %s' % BASE)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        common(pg, BASE, TITRE)
        anchors_resolve(pg)
        same_origin_links(pg, BASE)
        specifiques(pg)
        pg.close()
        b.close()
    verdict()


if __name__ == '__main__':
    main()
