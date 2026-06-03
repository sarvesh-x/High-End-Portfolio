# Sarvesh Kumar — Portfolio

A full-stack developer portfolio built with **Next.js 16**, featuring smooth animations, a custom cursor, and interactive scroll-driven reveals.

## Tech Stack

| Layer | Libraries |
|-------|-----------|
| Framework | Next.js 16, React 19 |
| Animation | GSAP 3, Framer Motion 12 |
| Scrolling | Lenis 1 (smooth scroll) |
| Styling | Tailwind CSS 4, CSS custom properties |

## Features

### 🖥️ Custom Magnetic Cursor
- A crosshair-style cursor box with four animated corner brackets that rotate continuously
- Locks onto interactive elements (`a`, `button`, `[data-cursor-text]`) and resizes to wrap them
- Displays a typed-out label near the cursor on hover (e.g., "View GitHub", "Download CV")
- Press scale animation and dynamic easing (faster when close, smoother when far)
- Hidden on touch/pen devices (`hover: none` / `pointer: coarse`)

### 🔄 Scramble Text Effect
- Replaces characters with random Devanagari glyphs before settling into the final text
- Applied to every navigation link and all buttons via `useScramble()` hook
- Fires on `mouseenter` and `click`; resets on `mouseleave`

### 🔊 Sound System
- **Background music toggle**: Loops `/Score.mp3` with SVG waveform animation (play/pause)
- **Hover/click sounds**: Synthesized via Web Audio API oscillators (sine for hover, triangle for tap, square for click)
- Audio context is lazily unlocked on first user interaction

### 🌀 Smooth Scrolling
- Powered by **Lenis** with low lerp (0.08) and gentle wheel multiplier (0.78)
- Drives all GSAP ScrollTrigger animations

### 📜 Scroll-Triggered Reveal Animations
- **Word-split blur + fade**: Headings (`h1`–`h4`), bio, and case-study text split into word spans, then blurred & faded in on scroll
- **Float-up + blur**: Section containers, "I specialize" bio/buttons, education/skills/projects columns, case study images, tags, and buttons all slide up from below the fold
- **Scroll-linked hero effects**: Hero scales down, blurs, and fades out as `scrollYProgress` reaches ~55%; hidden entirely beyond that
- **Blur reveal for case images**: Each case-study image fades in with blur from below as it scrolls into view

### 🎯 Sections

| Section | Content |
|---------|---------|
| **Boot Loader** | GSAP-animated progress bar with percentage counter; hides page until complete |
| **Header** | Brand logo, sound toggle, nav links (CV, GitHub, Patreon, LinkedIn, Email) |
| **Hero** | Name, tagline, Explore button; parallax scale/blur/fade tied to scroll |
| **HUD** | Fixed telemetry panel showing cursor X/Y, scroll percent, and session timer |
| **Scroll Progress** | Right-edge scroll bar with tick marks |
| **#spec Specialize** | Tech stack tags, "I specialize" headline with inline icons, bio, WhatsApp & CV buttons |
| **#cases Case Studies** | 6 project cards with glitch image hover effect, tags, descriptions, and action buttons |
| **Education & Experience** | Numbered timeline list |
| **Languages & Technologies** | Skill descriptions |
| **Projects & Publications** | ORCiD, Steam, PlayStore entries with consistent SVG logos |
| **SVG Footer** | Interactive signature path with gold gradient glow on hover |

### 🖼️ Case Study Glitch Effect
- On hover, the case image container displays 5 layered copies of the background
- One stays still while the other 4 animate with `clip-path` glitch keyframes
- Desaturates by default, saturates on hover; subtle scale-up (1.02×)

### 🔘 Interactive Buttons
- `ScrambleBtn` component with text scramble, fixed-width layout, cursor label, and data attributes for sound + cursor magnet
- Optional `revealOnScroll` prop that keeps the button blurred until it scrolls into view
- Click-expand animation via `data-expanded` attribute
- Secondary variant with inverted border style

### 📦 Scalable SVG Logos
- Three rendering modes for project icons:
  - **Circle + single path** (ORCiD)
  - **Background rect + path** (future-proof)
  - **`rawSvgInner`** with inline gradients / multi-path (Steam, PlayStore)
- All logos sized consistently at `width: 36px` via CSS

### 🎨 Visual Effects
- **Background video** (`/mbg.mp4`): full-screen muted loop at 30% opacity
- **Noise overlay**: CSS `feTurbulence` SVG grain at 3.5% opacity, screen blend
- **Top/bottom edge blur**: 120px `backdrop-filter: blur(40px)` gradient edges (60px on mobile)
- **Text selection**: Custom `::selection` color (gold on dark)

### 📱 Responsive Behavior
- **≤ 900px**: Three-column grid collapses to single column; nav adjusts; case cards stack vertically
- **≤ 768px**: Reduced padding, smaller edge blur, stacked buttons, smaller section heights
- **≤ 640px**: Case images become fluid (`width: 100%` with aspect-ratio), text sizes adjust
- Hidden cursor, scroll indicator, and frame footer on mobile

### ♿ Accessibility
- `aria-label` on all interactive elements
- `aria-pressed` on sound toggle
- Semantic landmarks (`header`, `nav`, `section`)
- Focus-visible outlines on buttons

## Getting Started

```bash
npm install
npm run dev      # → http://localhost:3000
npm run build    # Production build
npm run start    # Serve production build
```

## Project Structure

```
app/
├── layout.tsx       # Root layout, fonts, boot loader HTML
├── page.tsx         # All components (Hero, Nav, Cases, LastBlocks, etc.)
├── globals.css      # Full stylesheet (1660+ lines)
└── data/
    └── cases.json   # Case study content
public/
├── *.jpeg / *.png   # Case study images
├── mbg.mp4          # Background video
├── Score.mp3        # Background music
├── Resume-2025.pdf  # Downloadable CV
└── favicon.svg      # Favicon
```
