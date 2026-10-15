# AltitudeAccess® page — static mockup for clipperaviation.com

A static HTML/CSS/JS visual render of a proposed new top-level **AltitudeAccess®** page, built in the style of the live site (https://clipperaviation.com): dark navy + gold, Cormorant headings, Raleway body, full-bleed aircraft photography, rounded card rows, split text/image sections, and the site's footer with contact form.

**This is a design reference, not production code.** Nothing here has been published. Copy comes from the AltitudeAccess® brochure (printed pages 30–43); see `DEVELOPER_NOTES.md` for contradictions and items that need legal/owner review **before** go-live.

## Open it

Double-click `index.html` (no build step, no server, no CDN: fonts and images are local). Preview screenshots are in `previews/`.

## Folder structure

```
index.html                 the page (semantic HTML, one <h1>, 10 sections + site header/footer)
css/fonts.css              @font-face for Cormorant + Raleway (latin subset, local woff2)
css/altitudeaccess.css     all styles; palette/fonts/layout tokens in :root as CSS variables
js/altitudeaccess.js       mobile nav, dropdown toggles, accordion, placeholder-form handler (vanilla, ~100 lines)
fonts/                     cormorant-normal/italic-latin.woff2, raleway-normal-latin.woff2 (Google Fonts, SIL OFL)
images/                    web-sized JPG + WebP of each brochure photo; live-site logo SVG, jet-card watermark, favicon
previews/                  full-page and section screenshots (1440 / 1024 / 390 wide)
DEVELOPER_NOTES.md         brochure inconsistencies, legal-review claims, open questions
```

## Design tokens (`:root` in `css/altitudeaccess.css`)

Taken from the live site's Elementor global colours (kit 450) and footer CSS.

| Variable | Value | Live-site use |
|---|---|---|
| `--aa-navy-dark` | `#0A0021` | header, footer, primary text (Elementor "primary/text") |
| `--aa-navy` | `#00004F` | feature cards, navy sections (Elementor `4da0cec`) |
| `--aa-navy-deep` | `#141457` | table rules |
| `--aa-gold` | `#C88117` | buttons, rules, icons (Elementor `acac86e`) |
| `--aa-gold-bright` | `#FFCB36` | gold on dark backgrounds (Elementor `3e4473e`) |
| `--aa-cream` / `--aa-paper` | `#EEECE6` / `#F7F6F3` | alternate section backgrounds (Elementor secondary) |
| `--aa-gold-text` | `#8A5700` | **new**: darker gold for small text on light backgrounds (the live `#C88117` is only 3.2:1 on white; this is 6.1:1) |

Fonts: **Cormorant** (headings, nav; 500/600) and **Raleway** (body, buttons, labels; 400–800) — same as the live site. Footer uses Helvetica Neue/Arial exactly as the live footer does. Cormorant defaults to old-style figures; the mockup forces lining figures on prices/numerals (`font-variant-numeric: lining-nums`).

Buttons follow the live site: pill (`border-radius:100px`), Raleway 700, gold fill with navy label (the live footer uses white on gold at 12px, which fails contrast; navy is used here).

Breakpoints: 1100 (two-column splits stack), 900 (hamburger nav, 2-col grids), 760/620 (tables and cards go single column), plus the live footer's own 1200/900/700/600/400 rules. Tested at 1440, 1024 and 390 px with no horizontal overflow.

## Section map: page → brochure → WordPress/Elementor

Section IDs are stable anchors (`#our-program`, etc.). In Elementor each `<section class="aa-section …">` = one **top-level Container** (full width, content width ≈1200 px, padding ≈ 104/0 desktop, 56/0 mobile). Background classes: `--white` = `#FFFFFF`, `--cream` = `#EEECE6`, `--navy` = `#00004F`, `--dark` = `#0A0021`.

| # | Section (`id`) | Brochure pp. | Elementor build suggestion |
|---|---|---|---|
| – | Header (`.aa-header`) | – | Existing header template (Elementor post 320, ElementsKit nav-menu, menu "nav"). Add **AltitudeAccess®** as a top-level item **between Charter and Maintenance** (no dropdown). The live header has no header button (the "Request a Quote" button is in the page hero); mockup places it in the header per the brief. Keep or drop. |
| 1 | Hero (`.aa-hero`) | 43 (language), cover/28–29 ("Simple and transparent."), 30 | Container with background image + gradient overlay, Heading (H1) + Text + 2 Buttons; the 4-up fact bar (`.aa-facts`) = Icon List or 4 small Containers. Facts are from pp. 30/40. |
| 2 | Our Program (`#our-program`) | 30–31 | Heading + Text; 2-column Container: Image (left) + 6 term blocks (Heading 6 + Text, `.aa-term`) in a 2×3 grid; then 6 Icon Boxes (`.aa-feature`) in a 3-col grid on navy cards (20 px radius). |
| 3 | The Case for AltitudeAccess® (`#the-case`) | 36–37 | Heading + Text (serif lede), full-width Image band with overlaid italic quote (Image + absolutely-positioned Heading), then 3-column Text blocks (`.aa-case__col`). |
| 4 | Tiers (`#tiers`) + trip times/fees (`#trip-times`) | 34–35 | Split Container (text / Image). Three navy tier cards (`.aa-tier`; staircase heights are decorative `min-height`, drop for simpler build). Tables: use the **Table Builder Block (already installed on the site)** or Elementor HTML widget — 3 trip-time tables + 1 repositioning table (`.aa-table`). |
| 5 | What Is Included (`#what-is-included`) | 41 | 2-column Container: Included / Not included lists (Icon List with check / cross icons), callout (Text with left border), Image with quote overlay. |
| 6 | Cancellation Terms (`#cancellation-terms`) | 32–33 | **Elementor Accordion/Toggle** (3 items, all open by default; set "Toggle" style so several stay open) – or keep `.aa-accordion` markup in an HTML widget. Third item holds the peak-day summary list + 12 calendar tables (`.aa-cal`) – HTML widget recommended (see "Calendar" below). |
| 7 | Why a Preferred Rate Program (`#why-preferred-rate`) | 38–39 | Centered Heading + Text; Table Builder Block (4 rows × 3 columns) or HTML widget (the `.aa-compare` table turns into stacked cards under 760 px using `data-label` attributes); Image with overlaid text. |
| 8 | How a Trip Works (`#how-a-trip-works`) | 40 | 4 Icon Boxes (numeral "01"–"04" in Cormorant gold). Ordered list `<ol>` in the mockup. |
| 9 | How to Join (`#how-to-join`) | 42 (quote p. 43) | Navy Container with Jet Card watermark (`Jetcard_BKGD.png`, 12% opacity, top-right); 3 cream cards + Image with quote overlay. |
| 10 | Get in Touch (`#get-in-touch`) | 43 (address from p. 44) | Dark Container: Heading, contact details (Email, Phone, Web, Address as in brochure), and a **placeholder** form. Replace with a Contact Form 7 form (the footer form is CF7 ID 2318). The in-page form and the global footer form are both in the mockup; keep one if you prefer. |
| – | Footer (`footer.footer.snap-footer`) | – | Identical to the live footer markup/CSS (custom HTML). Mockup adds an "AltitudeAccess®" link under the Charter column (optional). |

Anchors worth adding to the in-page "local menu" or Elementor "Menu Anchor" widgets: the `id`s above.

### Calendar (2027 peak days)

The brochure shows peak days only as a shaded calendar graphic (p. 33). The mockup transcribes it into text (`<dl class="aa-peaklist">`) **and** 12 real `<table>` calendars (peak cells have `.is-peak` plus screen-reader text "Peak day"). Transcribed peak days: **Jan 1–2; May 27–31; Jul 3–5; Sep 4–6; Nov 25–27; Dec 23–26 and 30–31.** Verified by zooming the 200-dpi render; have the owner confirm. The tables are generated static HTML; in WordPress either paste as HTML or replace with an ACF/option-driven list so the next year can be updated without touching markup.

## Assets (`images/`)

| File | Source | Native size | Used in | Notes |
|---|---|---|---|---|
| `hero-king-air-hangar.jpg/.webp` | brochure p. 28–29 spread (membership opener) | 1704×1104 | Hero | ~100 ppi; fine at 1×, soft on retina |
| `program-king-air-coast.jpg/.webp` | p. 30–31 | 852×482 | Our Program | **low-res**; displayed ≤ ~480 CSS px |
| `case-king-air-over-coast.jpg/.webp` | p. 36–37 | 1704×761 | The Case (full-bleed band) | ~100 ppi; soft on retina |
| `tiers-king-air-ramp.jpg/.webp` | p. 34 | 852×1104 | Tiers | **low-res**; cropped to 4:3, displayed ≤ ~560 px |
| `included-onboard-laptop.jpg/.webp` | p. 41 | 854×471 | What Is Included | **low-res** |
| `preferred-rate-window-view.jpg/.webp` | p. 39 | 854×1103 | Why a Preferred Rate Program | **low-res** |
| `join-coastline-dusk.jpg/.webp` | p. 43 | 853×1104 | How to Join | **low-res** |
| `Clipper-Aviationj-Logo.svg` | live site (`/wp-content/uploads/2025/09/`) | vector, white | header + footer | |
| `Jetcard_BKGD.png` | live site (`/uploads/2025/10/`) | 608×622 | How to Join watermark | |
| `ca-site-icon.png` | live site | 512 | favicon | |

All photos are the brochure's embedded images extracted losslessly (`pdfimages`) at their native pixel size, re-encoded as progressive JPEG (q82) and WebP (q78); each is < 90 KB. **Ask for the original, high-resolution photo files** (brochure images are ~100 ppi; the 852-px ones will look soft on retina and large screens). The mockup uses JPG; for WordPress, upload the WebP/JPG pairs or let your optimisation plugin generate them. Photo licensing/credits are unknown — confirm web usage rights.

Icons (`<symbol>` sprite at top of `<body>`) are simple line icons drawn for the mockup (Feather/Lucide-style, MIT-compatible). They are placeholders; the brochure uses hand-drawn sketch icons that could be exported from the InDesign file as SVG.

## SEO suggestions

- **Title tag:** `AltitudeAccess® | Preferred Rate Jet Card | Clipper Aviation` (as requested; see DEVELOPER_NOTES re "Jet Card" vs. a turboprop fleet).
- **Meta description (154 chars):** *AltitudeAccess® by Clipper Aviation: a preferred rate program with a fixed $5,500 per occupied flight hour, 10, 25 or 50-hour tiers and no initiation fee.*
- **One H1** (`AltitudeAccess®`); section titles are H2s; card/term titles are H3s.
- **URL:** `/altitudeaccess/` (the mockup's `<link rel="canonical">` assumes this). Add to Yoast/RankMath sitemap and to the Charter page's existing AltitudeAccess promo section ("Learn more" link).
- `<meta name="robots" content="noindex, nofollow">` is in the mockup on purpose — **remove at launch**.
- Open Graph tags are included (`og:image` currently points at the hero JPG; use an absolute URL in production, ideally a 1200×630 social crop).
- Internal links: Charter, Fleet (King Air 350), Maintenance (Van Nuys facilities), Safety.
- **FAQ schema (optional)**: only add after the page has a *visible* FAQ section whose text matches the markup, and after legal sign-off on the wording. Safe candidates taken directly from the brochure: "How does cancellation work?", "What is included?", "How do I join?". Template:
  ```html
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
   {"@type":"Question","name":"How do I join AltitudeAccess®?","acceptedAnswer":{"@type":"Answer","text":"A brief conversation establishes fit, followed by a short agreement documenting program terms. Funds are placed in an independent account, where they remain untouched until your flights are flown."}}
  ]}
  </script>
  ```
- Suggested alt-text pattern is already applied to every `<img>` (descriptive, no keyword stuffing); decorative watermark has `alt=""`.
- Image names are descriptive (`hero-king-air-hangar.jpg`); keep them on upload. Use `loading="lazy"` below the fold (done) and `fetchpriority="high"` on the hero (done).

## Accessibility notes

- Skip link, landmarks (`header`, `nav aria-label="Primary"`, `main`, `footer`), one H1, logical H2/H3 order.
- Accordion = WAI-ARIA disclosure pattern: `<h3><button aria-expanded aria-controls>` + `role="region" aria-labelledby`; Up/Down/Home/End move between headers; panels are visible without JS.
- Dropdown nav: hover/focus-within on desktop; caret `<button aria-expanded>` for touch/keyboard; Esc closes; hamburger is a `<button aria-expanded aria-controls>`.
- Data tables use `<caption>`, `scope`, and real header cells; the comparison table collapses to labelled stacked cards on mobile (CSS `data-label`).
- Calendar tables: each month is a table with caption and column headers; peak days carry visually hidden "Peak day:" text so colour is not the only cue. The text list of peak dates duplicates it.
- Colour contrast: body text 17:1+; small gold text uses `--aa-gold-text` (≥5:1). Automated axe-core run on the page at 1440 and 390 px reported **0 violations** (note: automated tools catch only part of WCAG; a manual keyboard/screen-reader pass is still recommended).
- `prefers-reduced-motion` disables transitions/smooth scroll. Focus rings are visible (gold-bright, 3 px).
- The placeholder form has visible labels and a polite live region for status.

## Known limitations of the mockup

- Form is non-functional (shows a "Mockup only" status line and a dev note — delete both when wired up).
- Other-page nav links point at the live site (`https://clipperaviation.com/...`). The AltitudeAccess item points at `index.html`.
- Dropdown menu items and footer links were copied from the live site on 15 Oct 2026; check against the current menu.
- No analytics/GTM, cookie banner or JetInsight "Request a Quote" widget.
