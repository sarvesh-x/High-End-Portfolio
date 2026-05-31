"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const nav = ["cv", "github", "patreon", "linkedin", "email"];

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 0.78,
      smoothWheel: true
    });

    let raf = 0;
    function loop(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
}

const chars = "0123456789";

function useScramble(label: string) {
  const [text, setText] = useState(label);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scramble() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    let i = 0;
    timerRef.current = setInterval(() => {
      setText(
        label
          .split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (idx < i) return label[idx];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (i >= label.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      }
      i += 0.5;
    }, 30);
    timeoutRef.current = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setText(label);
    }, 400);
  }

  function reset() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setText(label);
  }

  return { text, scramble, reset };
}

/* ─── HOVER SOUNDS ─── */
function useHoverSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  function unlock() {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
  }

  function play(type: "hover" | "tap" | "click", vol = 0.08) {
    try {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type === "click" ? "square" : type === "tap" ? "triangle" : "sine";
      osc.frequency.value = type === "hover" ? 800 : type === "tap" ? 600 : 400;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch { /* silent */ }
  }

  useEffect(() => {
    return () => { ctxRef.current?.close(); };
  }, []);

  return { play, unlock };
}

/* ─── CURSOR ─── */
let _cursorEl: HTMLDivElement | null = null;
let _cursorTimer: ReturnType<typeof setInterval> | null = null;
let _cursorTarget: HTMLElement | null = null;

function cursorShow(text: string) {
  if (!_cursorEl) return;
  if (_cursorTimer) clearInterval(_cursorTimer);
  _cursorEl.textContent = "";
  _cursorEl.classList.add("is-visible");
  let n = 0;
  const el = _cursorEl;
  _cursorTimer = setInterval(() => {
    n++;
    el.textContent = text.slice(0, n);
    if (n >= text.length) { clearInterval(_cursorTimer!); _cursorTimer = null; }
  }, 18);
}

function cursorHide() {
  if (!_cursorEl) return;
  if (_cursorTimer) clearInterval(_cursorTimer);
  _cursorTimer = null;
  _cursorEl.classList.remove("is-visible");
}

function useCursor() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    const el = document.createElement("div");
    el.className = "coursor";
    document.body.appendChild(el);
    _cursorEl = el;

    const onMove = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX + 18}px, ${e.clientY + 18}px, 0)`;
    };
    window.addEventListener("pointermove", onMove);

    document.addEventListener("mouseover", (e) => {
      const t = (e.target as HTMLElement).closest("[data-cursor-text]") as HTMLElement | null;
      if (t && t !== _cursorTarget) {
        _cursorTarget = t;
        cursorShow(t.getAttribute("data-cursor-text") || "");
      }
    }, true);

    document.addEventListener("mouseout", (e) => {
      const t = (e.target as HTMLElement).closest("[data-cursor-text]") as HTMLElement | null;
      if (t && t === _cursorTarget) {
        const rel = (e as MouseEvent).relatedTarget as HTMLElement | null;
        const next = rel?.closest?.("[data-cursor-text]") as HTMLElement | null;
        if (!next || next === t) {
          _cursorTarget = null;
          cursorHide();
        } else {
          _cursorTarget = next;
          cursorShow(next.getAttribute("data-cursor-text") || "");
        }
      }
    }, true);

    return () => {
      _cursorEl = null;
      _cursorTarget = null;
      if (_cursorTimer) clearInterval(_cursorTimer);
      _cursorTimer = null;
      window.removeEventListener("pointermove", onMove);
      el.remove();
    };
  }, []);
}

/* ─── MOTION TEXT REVEAL ─── */
function useMotionText() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-motion-text]");
    if (!els.length) return;
    const anims: gsap.core.Tween[] = [];

    els.forEach((el) => {
      const isHeading = el.matches("h2, h3, .bio, .hero-btn span");
      if (isHeading) {
        const words = el.textContent?.trim().split(/\s+/) || [];
        if (!words.length) return;
        el.innerHTML = words.map((w) => `<span class="motion-word">${w}</span>`).join(" ");
        const spans = el.querySelectorAll(".motion-word");
        const tween = gsap.fromTo(spans,
          { filter: "blur(10px)" },
          {
            filter: "blur(0px)",
            duration: 0.55, stagger: 0.08,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", end: "top 45%", scrub: 1 },
          }
        );
        anims.push(tween);

        if (el.matches(".hero-btn span")) {
          const btn = el.closest(".hero-btn");
          if (btn) {
            gsap.set(btn, { filter: "blur(10px)" });
            const btnTween = gsap.to(btn, {
              filter: "blur(0px)",
              duration: 0.55,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 85%", end: "top 45%", scrub: 1 },
            });
            anims.push(btnTween);
          }
        }
      } else {
        const tween = gsap.fromTo(el,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0,
            duration: 0.4,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", scrub: 1 },
          }
        );
        anims.push(tween);
      }
    });

    return () => {
      anims.forEach((a) => a.scrollTrigger?.kill());
    };
  }, []);
}

function NavItem({ label, onEnter, isDim }: { label: string; onEnter: (el: HTMLAnchorElement, label: string) => void; isDim: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [fixedW, setFixedW] = useState(0);
  const { text, scramble, reset } = useScramble(label);

  const measured = useCallback((el: HTMLSpanElement | null) => {
    if (el && !fixedW) {
      spanRef.current = el;
      setFixedW(el.offsetWidth);
    }
  }, [fixedW]);

  const cursorText = label === "cv" ? "Download CV" : label === "github" ? "View GitHub" : label === "patreon" ? "Support on Patreon" : label === "linkedin" ? "View LinkedIn" : label === "email" ? "Send email" : label;

  return (
    <a
      ref={ref}
      href="#"
      className={isDim ? "nav-item-dim" : ""}
      data-cursor-text={cursorText}
      data-sound-hover
      onMouseEnter={() => {
        if (ref.current) onEnter(ref.current, label);
        scramble();
      }}
      onMouseLeave={reset}
    >
      <span ref={measured} style={{ display: 'inline-block', width: fixedW || undefined, overflow: 'hidden' }}>
        {text}
      </span>
    </a>
  );
}

function Nav() {
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const sounds = useHoverSounds();

  function handleEnter(el: HTMLAnchorElement, label: string) {
    if (!navRef.current) return;
    const navRect = navRef.current.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const hPad = 2;
    const vPad = -5;
    setBox({
      top: rect.top - navRect.top - vPad,
      left: rect.left - navRect.left - hPad,
      width: rect.width + hPad * 2,
      height: rect.height + vPad * 2,
    });
    setHovered(true);
    setHoveredLabel(label);
  }

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  function toggleSound() {
    sounds.unlock();
    if (soundOn) {
      audioRef.current?.pause();
      audioRef.current = null;
      setSoundOn(false);
      return;
    }

    const audio = new Audio("/Score.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audio.play();
    audioRef.current = audio;
    setSoundOn(true);
  }

  return (
    <motion.header
      initial={{ y: -34, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="site-header-frame"
    >
      <Corner className="corner-plus corner-plus-bl" />
      <Corner className="corner-plus corner-plus-br" />
      <a href="#" className="brand-lockup" aria-label="Sarvesh home">
        <span className="mark-bars" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>SARVESH</span>
      </a>

      <button
        className={`wave-mark ${soundOn ? "is-on" : ""}`}
        type="button"
        aria-pressed={soundOn}
        aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
        onClick={toggleSound}
        data-cursor-text="Enable sound"
        data-sound-click
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect className="wave-bar" x="2" y="10" width="2" height="6" rx="1" />
          <rect className="wave-bar" x="5" y="7" width="2" height="12" rx="1" />
          <rect className="wave-bar" x="8" y="4" width="2" height="18" rx="1" />
          <rect className="wave-bar" x="11" y="8" width="2" height="10" rx="1" />
          <rect className="wave-bar" x="14" y="6" width="2" height="14" rx="1" />
          <rect className="wave-bar" x="17" y="9" width="2" height="8" rx="1" />
          <rect className="wave-bar" x="20" y="4" width="2" height="18" rx="1" />
          <rect className="wave-bar" x="23" y="7" width="2" height="12" rx="1" />
          <rect className="wave-bar" x="26" y="10" width="2" height="6" rx="1" />
        </svg>
      </button>

      <nav className="header-nav" aria-label="Social links" ref={navRef} onMouseLeave={() => { setHovered(false); setHoveredLabel(null); }}>
        {nav.map((item) => (
          <NavItem key={item} label={item} onEnter={handleEnter} isDim={hoveredLabel !== null && hoveredLabel !== item} />
        ))}
        <motion.div
          className="nav-hover-box"
          animate={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            opacity: hovered ? 1 : 0,
          }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          initial={false}
        >
          <i className="nav-hover-corner nav-hover-corner--tl" />
          <i className="nav-hover-corner nav-hover-corner--tr" />
          <i className="nav-hover-corner nav-hover-corner--bl" />
          <i className="nav-hover-corner nav-hover-corner--br" />
        </motion.div>
      </nav>
    </motion.header>
  );
}

function Hud() {
  const [time, setTime] = useState("0.00s");
  const [xCoord, setXCoord] = useState("0000");
  const [yCoord, setYCoord] = useState("0000");
  const { scrollYProgress } = useScroll();
  const scroll = useTransform(scrollYProgress, (value) => value.toFixed(3));

  useEffect(() => {
    const start = performance.now();
    const updateTime = () => setTime(`${((performance.now() - start) / 1000).toFixed(2)}s`);
    const updateCoords = (event: PointerEvent) => {
      setXCoord(String(Math.round(event.clientX)).padStart(4, "0"));
      setYCoord(String(Math.round(event.clientY)).padStart(4, "0"));
    };
    updateTime();
    const timer = setInterval(updateTime, 60);
    window.addEventListener("pointermove", updateCoords);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointermove", updateCoords);
    };
  }, []);

  return (
    <>
      <div className="telemetry-panel">
        <Corner className="corner-plus telemetry-corner-tl" />
        <Corner className="corner-plus telemetry-corner-tr" />
        <Corner className="corner-plus telemetry-corner-br" />
        <div>
          <div>CURSOR X: <strong>{xCoord}</strong></div>
          <div>CURSOR Y: <strong>{yCoord}</strong></div>
        </div>
        <div className="telemetry-divider" />
        <div>
          <div>SCROLL: <motion.strong>{scroll}</motion.strong></div>
          <div>TIME: <strong>{time}</strong></div>
        </div>
      </div>
    </>
  );
}

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <div className="progress-wrap">
      <div className="progress-line">
        <motion.div className="progress-active" style={{ height }} />
      </div>
      <div className="progress-sections">
        <span className="progress-sec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-sec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-sec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-subsec" />
        <span className="progress-sec" />
      </div>
    </div>
  );
}

function ScrollIndicator() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  return (
    <motion.div className="scroll-indicator" style={{ opacity }}>
      <svg width="12" height="20" viewBox="0 0 22 22" fill="none">
        <rect x="5" y="1.5" width="12" height="17" rx="6" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9.5" y="4" width="3" height="5" rx="1.5" fill="currentColor" />
      </svg>
      <span>Scroll</span>
    </motion.div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <svg className={className} width="8" height="8" viewBox="0 0 5 5" fill="none">
      <path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" />
    </svg>
  );
}

function Hero({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> }) {
  const { text, scramble, reset } = useScramble("WRITE TO TELEGRAM");

  return (
    <div className="hero-content" ref={heroRef}>
      <h1><strong>Full</strong> <strong>Stack</strong> developer crafting digital experiences</h1>
      <p>I build modern web applications with clean code, thoughtful architecture, and a focus on the details that matter</p>
      <a className="hero-btn" href="#"
        data-cursor-text="Send me message"
        data-sound-hover
        onMouseEnter={scramble}
        onMouseLeave={reset}
      >
        <svg className="corner-btn corner-btn-tl" width="8" height="8" viewBox="0 0 5 5" fill="none">
          <path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" />
        </svg>
        <svg className="corner-btn corner-btn-tr" width="8" height="8" viewBox="0 0 5 5" fill="none">
          <path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" />
        </svg>
        <svg className="corner-btn corner-btn-bl" width="8" height="8" viewBox="0 0 5 5" fill="none">
          <path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" />
        </svg>
        <svg className="corner-btn corner-btn-br" width="8" height="8" viewBox="0 0 5 5" fill="none">
          <path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" />
        </svg>
        {text}
      </a>
    </div>
  );
}

/* ─── LOADER ─── */
function Loader({ onComplete }: { onComplete: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const bar = barRef.current;
    const pct = pctRef.current;
    if (!root || !bar || !pct) return;

    document.documentElement.classList.add("boot-loading");
    document.body.classList.add("loader-active");

    const progress = { value: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.classList.remove("loader-active");
        document.documentElement.classList.remove("boot-loading");
        root.classList.add("is-hidden");
        gsap.set(root, { clearProps: "all" });
        onComplete();
      },
    });

    tl.to(progress, {
      value: 100,
      duration: 2.2,
      ease: "power2.inOut",
      onUpdate: () => {
        bar.style.width = `${progress.value}%`;
        pct.textContent = `${Math.round(progress.value)}%`;
      },
    });

    tl.to(root, { opacity: 0, duration: 0.35, ease: "power2.out" }, "+=0.2");

    return () => { tl.kill(); };
  }, [onComplete]);

  return (
    <div className="loader" ref={rootRef}>
      <div className="loader-content">
        <svg width="49" height="35" viewBox="0 0 49 35" fill="none" aria-hidden="true">
          <path d="M14 7V35L0 28V0L14 7ZM31.5 7V35L17.5 28V0L31.5 7ZM49 7V35L35 28V0L49 7Z" fill="white" />
        </svg>
        <div className="loader-line">
          <div className="loader-bar" ref={barRef} />
        </div>
        <span className="loader-pct" ref={pctRef}>0%</span>
      </div>
    </div>
  );
}

/* ─── SPEC SECTION ─── */
function SpecSection() {
  return (
    <section className="section spec-section" id="spec">
      <div className="container">
        <ul className="tags" data-motion-text>
          <li>REACT</li>
          <li>NODE.JS</li>
          <li>TYPESCRIPT</li>
          <li>NEXT.JS</li>
          <li>CLOUD</li>
        </ul>
        <h2 data-motion-text>
          <b>I specialize in</b> full stack development, building <b>scalable</b> web applications, and crafting <b>seamless</b> user experiences
        </h2>
        <p className="bio" data-motion-text>
          I&apos;m currently open to full-time Senior / Lead Full Stack Developer roles in product companies or innovative startups. I&apos;m also available for selected high-impact contract work.
        </p>
        <ul className="btn-group">
          <li>
            <a className="hero-btn" href="#" data-cursor-text="Send me message" data-sound-hover>
              <svg className="corner-btn corner-btn-tl" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <svg className="corner-btn corner-btn-tr" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <svg className="corner-btn corner-btn-bl" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <svg className="corner-btn corner-btn-br" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <span data-motion-text>WRITE TO TELEGRAM</span>
            </a>
          </li>
          <li>
            <a className="hero-btn secondary" href="#" data-cursor-text="Download CV" data-sound-hover>
              <svg className="corner-btn corner-btn-tl" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <svg className="corner-btn corner-btn-tr" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <svg className="corner-btn corner-btn-bl" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <svg className="corner-btn corner-btn-br" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
              <span data-motion-text>DOWNLOAD CV</span>
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ─── CASES DATA ─── */
const CASES = [
  {
    tags: ["UI", "Design System", "React"],
    title: "Fintech Design System",
    desc: "A scalable fintech design system for mobile and web products, built to improve consistency, speed up delivery, and support complex financial flows.",
    href: "#",
    category: "App design",
  },
  {
    tags: ["App design"],
    title: "CrocoWallet",
    desc: "A Telegram-based crypto banking mini app with card issuance, wallet management, rewards, and referral flows.",
    href: "#",
    category: "App design",
  },
  {
    tags: ["App design"],
    title: "Crypto Portfolio",
    desc: "A crypto portfolio and wallet app for tracking assets, monitoring market movement, and managing balances in one interface.",
    href: "#",
    category: "App design",
  },
  {
    tags: ["Concept"],
    title: "Telegram wallet",
    desc: "A redesign concept for a Telegram wallet focused on clarity, visual hierarchy, and a more premium product feel.",
    href: "#",
    category: "Concept",
  },
  {
    tags: ["App design", "Dashboard", "Landing"],
    title: "Cunex crypto widget",
    desc: "A crypto exchange widget, dashboard, and landing experience designed to support onboarding, KYC, and transaction monitoring.",
    href: "#",
    category: "App design",
  },
  {
    tags: ["Icons", "Design System"],
    title: "Crypto Icons Library",
    desc: "A reusable crypto icon library for product teams, available in SVG, sprite, webfont, and 3D formats.",
    href: "#",
    category: "Icons",
  },
];

function CasesSection() {
  return (
    <section className="section cases-section" id="cases">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" data-motion-text>
            <b>Selected</b> cases
          </h2>
          <div className="section-header-links">
            <a className="section-link" href="#" aria-label="GitHub" data-sound-hover>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a className="section-link" href="#" aria-label="LinkedIn" data-sound-hover>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
        <p className="section-sub" data-motion-text>
          I have more than <b>15 years</b> of experience
        </p>
        <p className="section-tagline" data-motion-text>
          Freelance, office, remote work, personal projects...
        </p>
        <div className="cases-grid">
          {CASES.map((c, i) => (
            <article className="project-card" key={i} data-motion-text>
              <div className="project-image">
                <div className="project-placeholder" />
              </div>
              <div className="project-info">
                <div className="project-tags">
                  {c.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <h3 className="project-name">{c.title}</h3>
                <p className="project-desc">{c.desc}</p>
                <div style={{ position: "relative" }}>
                  <a className="project-btn" href={c.href} data-cursor-text="View case" data-sound-hover>
                    <svg className="corner-btn corner-btn-tl" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
                    <svg className="corner-btn corner-btn-tr" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
                    <svg className="corner-btn corner-btn-bl" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
                    <svg className="corner-btn corner-btn-br" width="8" height="8" viewBox="0 0 5 5" fill="none"><path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" /></svg>
                    VIEW CASE
                  </a>
                </div>
                <span className="case-cat">{c.category}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  useLenis();
  useCursor();
  useMotionText();
  const [ready, setReady] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const el = heroRef.current;
    if (el) {
      el.style.setProperty("--hero-scale", "1");
      el.style.setProperty("--hero-opacity", "1");
      el.style.removeProperty("--hero-blur");
    }
    const unsub = scrollYProgress.on("change", (v) => {
      if (!el) return;
      const n = Math.min(Math.max(v / 0.55, 0), 1);
      const e = 1 - Math.pow(1 - n, 3);
      el.style.setProperty("--hero-scale", String(1 - e * 0.4));
      el.style.setProperty("--hero-opacity", String(1 - e));
      if (e > 0) {
        el.style.setProperty("--hero-blur", `blur(${e * 15}px)`);
      } else {
        el.style.removeProperty("--hero-blur");
      }
    });
    return unsub;
  }, [scrollYProgress]);

  useEffect(() => {
    if (!ready) return;
    const targets = document.querySelectorAll("a, button, article, .skill-cloud span, .hero-btn");
    targets.forEach((target) => target.setAttribute("data-magnetic", ""));
  }, [ready]);

  return (
    <>
      {!ready && <Loader onComplete={() => setReady(true)} />}
      <div id="bg-video-stack" aria-hidden="true">
        <video id="bg-video" autoPlay muted loop playsInline preload="auto">
          <source src="/mbg.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="edge-blur" aria-hidden="true">
        <div className="edge-blur__top" />
        <div className="edge-blur__bottom" />
      </div>
      <div className="noise" />
      <Nav />
      <div className="frame-screen">
        <Corner className="corner-plus corner-frame-tl" />
        <Corner className="corner-plus corner-frame-tr" />
        <Corner className="corner-plus corner-frame-bl" />
        <Corner className="corner-plus corner-frame-br" />
        <ProgressBar />
        <Hero heroRef={heroRef} />
        <Hud />
        <ScrollIndicator />
      </div>
      <div className="scroll-content">
        <SpecSection />
        <CasesSection />
      </div>
    </>
  );
}
