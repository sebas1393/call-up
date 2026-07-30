# Kortumo brand (UI)

Source of truth for visual identity: **[`Brandbook-KORTUMO.pdf`](../../Brandbook-KORTUMO.pdf)** (repo root).

The working project folder remains `call-up/`; **product name in UI = Kall-UP**, mark = **K** + ball accent (convocatoria / deporte).

## Palette (brandbook swatches)

| Token | Hex | Use |
|-------|-----|-----|
| `blueSoft` | `#6699ff` | Accents, links, soft fills |
| `navy` | `#003366` | Primary brand / headers / logo ground |
| `red` | `#cc3333` | Primary CTAs, destructive, emphasis |
| `teal` | `#339999` | Secondary / positive accents |
| `white` | `#ffffff` | Surfaces, text on navy |

Palette is inspired by regulation multicancha colors (brandbook).

## Typography

| Role | Brandbook | Web stand-in (until licensed files) |
|------|-----------|-------------------------------------|
| Titles | **Aharoni Bold** | Montserrat Bold (**until Task 22**) |
| Body | Open Sans / Aharoni for short copy | **Open Sans** |
| Subtitles | Montserrat Light | Montserrat Light |
| UI | Myriad Pro | Open Sans |

**Task 22 (blocked):** drop official **K vector** + **Aharoni Bold** (web-embeddable license) into the repo, then swap stand-ins. See `tasks.md` Task 22.

## Voice / attributes

- Rápido y seguro · Confiable · Pensado para ti  
- Simple, accesible, fluido — encuentro, competencia, pasión por el juego  

## Assets

| Path | Role |
|------|------|
| `public/brand/logo-k.svg` | App mark: K + ball (palette navy/teal/red/blueSoft) — sports energy |
| `public/icons/icon-192.png` / `icon-512.png` | PWA icons (regenerate from mark when mark changes) |
| `public/brand/reference/` | Imagery extracted from brandbook (hero / courts) |

Code tokens: `lib/brand/kortumo.ts` + CSS variables in `app/globals.css`.
