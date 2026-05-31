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

const chars = "कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहािीुूृेैोौ";

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
      i += 0.35;
    }, 20);
    timeoutRef.current = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setText(label);
    }, 600);
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
function deepSplit(node: Node): Node {
  if (node instanceof SVGElement) return node.cloneNode(true);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    const frag = document.createDocumentFragment();
    const parts = text.split(/(\s+)/);
    parts.forEach((part) => {
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
      } else if (part) {
        const span = document.createElement("span");
        span.className = "motion-word";
        span.textContent = part;
        frag.appendChild(span);
      }
    });
    return frag;
  }
  const clone = (node as Element).cloneNode(false);
  Array.from(node.childNodes).forEach((child) => {
    clone.appendChild(deepSplit(child));
  });
  return clone;
}

function useMotionText() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-motion-text]");
    if (!els.length) return;
    const anims: gsap.core.Tween[] = [];

    els.forEach((el) => {
      const isContainer = el.matches(".container.vse");
      const isWordSplit = el.matches("h2, h3, h4, .bio, .list li p, .list li span.date, .list li h4 span, .caseInfo p, #cases .container");

        if (isContainer) {
        const tween = gsap.fromTo(el,
          { filter: "blur(10px)", opacity: 0 },
          {
            filter: "blur(1px)", opacity: 1,
            duration: 0.35,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", end: "top 5%", scrub: 1.5 },
          }
        );
        anims.push(tween);
      } else if (isWordSplit) {
        const cloned = deepSplit(el);
        el.innerHTML = "";
        el.appendChild(cloned);

        const targets = el.querySelectorAll(".motion-word, [class^='icon-'], [class*=' icon-'], svg");
        if (!targets.length) return;

        const stagger = el.matches("#cases .container") ? 0.04 : 0.08;
        const tween = gsap.fromTo(targets,
          { filter: "blur(10px)", opacity: 0 },
          {
            filter: "blur(0px)", opacity: 1,
            duration: 0.55, stagger,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top bottom", end: "center center", scrub: 1 },
          }
        );
        anims.push(tween);

      } else {
        const tween = gsap.fromTo(el,
          { filter: "blur(10px)", opacity: 0 },
          {
            filter: "blur(0px)", opacity: 1,
            duration: 0.55,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", end: "top 15%", scrub: 1 },
          }
        );
        anims.push(tween);
      }
    });

    // Float-up animation for spec section bio and buttons
    const specSection = document.querySelector(".specialize-section");
    if (specSection) {
      const specBio = specSection.querySelector(".bio");
      const specButtons = specSection.querySelectorAll(".btn-group, .btn-group li");
      
      if (specBio) {
        const bioTween = gsap.fromTo(specBio,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: specBio, start: "top 90%", end: "top 60%", scrub: 1 },
          }
        );
        anims.push(bioTween);
      }

      specButtons.forEach((btn, i) => {
        const btnTween = gsap.fromTo(btn,
          { y: 50, opacity: 0 },
          {
            y: 0, opacity: 1,
            duration: 0.7,
            delay: i * 0.1,
            ease: "power2.out",
            scrollTrigger: { trigger: btn, start: "top 95%", end: "top 70%", scrub: 1 },
          }
        );
        anims.push(btnTween);
      });
    }

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
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

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
    <svg className={className} width="5" height="5" viewBox="0 0 5 5" fill="none">
      <path d="M3 2H5V3H3V5H2V3H0V2H2V0H3V2Z" fill="currentColor" />
    </svg>
  );
}

/* ─── SCRAMBLE BUTTON ─── */
function ScrambleBtn({ text, cursorText, secondary, revealOnScroll, href }: {
  text: string;
  cursorText?: string;
  secondary?: boolean;
  revealOnScroll?: boolean;
  href?: string;
}) {
  const { text: disp, scramble, reset } = useScramble(text);
  const [fixedW, setFixedW] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const btnRef = useRef<HTMLAnchorElement>(null);

  const measured = useCallback((el: HTMLSpanElement | null) => {
    if (el && !fixedW) setFixedW(el.offsetWidth + 4);
  }, [fixedW]);

  useEffect(() => {
    if (!revealOnScroll || !btnRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(btnRef.current);
    return () => observer.disconnect();
  }, [revealOnScroll]);

  const sStyle = revealOnScroll
    ? { filter: revealed ? "blur(0px)" : "blur(10px)", opacity: revealed ? 1 : 0, transition: "filter 0.6s ease, opacity 0.6s ease" }
    : undefined;

  return (
    <a
      ref={btnRef}
      className={"hero-btn" + (secondary ? " secondary" : "")}
      href={href ?? "#"}
      data-cursor-text={cursorText ?? text}
      data-sound-hover
      style={sStyle}
      onMouseEnter={scramble}
      onMouseLeave={reset}
    >
      <Corner className="corner-btn corner-btn-tl" />
      <Corner className="corner-btn corner-btn-tr" />
      <Corner className="corner-btn corner-btn-bl" />
      <Corner className="corner-btn corner-btn-br" />
      <span ref={measured} style={{ display: "inline-block", width: fixedW || undefined, overflow: "hidden", whiteSpace: "nowrap" }}>{disp}</span>
    </a>
  );
}

function Hero({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="hero-content" ref={heroRef}>
      <svg className="hero-logo" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="6" y="8" width="6" height="32" rx="2" fill="currentColor" opacity="0.9" />
        <rect x="16" y="4" width="6" height="36" rx="2" fill="currentColor" opacity="0.7" />
        <rect x="26" y="12" width="6" height="28" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="36" y="18" width="6" height="22" rx="2" fill="currentColor" opacity="0.3" />
      </svg>
      <h1><strong>Full</strong> <strong>Stack</strong> developer crafting digital experiences</h1>
      <p>I build modern web applications with clean code, thoughtful architecture, and a focus on the details that matter</p>
      <ScrambleBtn text="WRITE TO TELEGRAM" cursorText="Send me message" />
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
    <section className="section spec-section specialize-section" id="spec">
      <div className="container">
        <ul className="tags" data-motion-text>
          <li>REACT</li>
          <li>NODE.JS</li>
          <li>TYPESCRIPT</li>
          <li>NEXT.JS</li>
          <li>CLOUD</li>
        </ul>
        <h2 data-motion-text>
          <b>I specialize</b><b> in</b><img src="/android.png" alt="Android" className="icon-android" style={{ width: '1.5em', height: '1.5em', display: 'inline-block', verticalAlign: 'middle' }} /><span className="icon-apple"></span> full stack development, <span className="icon-component"></span> building <b>scalable</b> systems, and <span className="icon-web"></span> crafting <b>seamless</b> interfaces
        </h2>
        <p className="bio" data-motion-text>
          I&apos;m currently open to full-time Senior / Lead Full Stack Developer roles in product companies or innovative startups. I&apos;m also available for selected high-impact contract work.
        </p>
        <ul className="btn-group" data-motion-text>
          <li><ScrambleBtn className="specialize-btn-1" text="WRITE TO TELEGRAM" cursorText="Send me message" revealOnScroll /></li>
          <li><ScrambleBtn className="specialize-btn-2" text="DOWNLOAD CV" cursorText="Download CV" secondary revealOnScroll /></li>
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
  },
  {
    tags: ["App design"],
    title: "CrocoWallet",
    desc: "A Telegram-based crypto banking mini app with card issuance, wallet management, rewards, and referral flows.",
    href: "#",
  },
  {
    tags: ["App design"],
    title: "Crypto Portfolio",
    desc: "A crypto portfolio and wallet app for tracking assets, monitoring market movement, and managing balances in one interface.",
    href: "#",
  },
  {
    tags: ["Concept"],
    title: "Telegram wallet",
    desc: "A redesign concept for a Telegram wallet focused on clarity, visual hierarchy, and a more premium product feel.",
    href: "#",
  },
  {
    tags: ["App design", "Dashboard", "Landing"],
    title: "Cunex crypto widget",
    desc: "A crypto exchange widget, dashboard, and landing experience designed to support onboarding, KYC, and transaction monitoring.",
    href: "#",
  },
  {
    tags: ["Icons", "Design System"],
    title: "Crypto Icons Library",
    desc: "A reusable crypto icon library for product teams, available in SVG, sprite, webfont, and 3D formats.",
    href: "#",
  },
];

const GLITCH_GRADIENTS = [
  "linear-gradient(135deg, #0f1923, #1a2a3a, #243b55)",
  "linear-gradient(135deg, #1a1a2e, #2d2d44, #16213e)",
  "linear-gradient(135deg, #0d1b2a, #1b2838, #2d4059)",
  "linear-gradient(135deg, #1e0a1e, #3a0e3a, #4a154b)",
  "linear-gradient(135deg, #0a1628, #142850, #1e3a6e)",
  "linear-gradient(135deg, #1c1c2e, #2a2a40, #3a3a52)",
];



function CasesSection() {
  return (
    <section className="section" id="cases">
      <div className="container" data-motion-text>
        <div className="titleGroup">
          <h2>
            <b>Selected case studies</b>
            <a href="#" aria-label="GitHub" data-sound-hover><span className="icon-github"></span></a>
            <a href="#" aria-label="LinkedIn" data-sound-hover><span className="icon-linkedin"></span></a>
            <br />
            I have more than <b>10 years of experience</b>
          </h2>
        </div>
        <ul className="tags" data-motion-text>
          <li>Freelance</li>
          <li>RemoteWork</li>
          <li>Office</li>
          <li>Personal Projects</li>
        </ul>
        <ul className="logoGroup">
          <li>
            <svg viewBox="0 0 50 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25 0L50 28H0L25 0Z" fill="white" opacity="0.85" />
              <circle cx="25" cy="18" r="4" fill="#0f0f0f" />
            </svg>
          </li>
          <li>
            <svg viewBox="0 0 50 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="25" cy="14" rx="10" ry="3.5" stroke="white" strokeWidth="1.8" opacity="0.6" />
              <ellipse cx="25" cy="14" rx="10" ry="3.5" stroke="white" strokeWidth="1.8" opacity="0.6" transform="rotate(60 25 14)" />
              <ellipse cx="25" cy="14" rx="10" ry="3.5" stroke="white" strokeWidth="1.8" opacity="0.6" transform="rotate(120 25 14)" />
              <circle cx="25" cy="14" r="2.5" fill="white" opacity="0.85" />
            </svg>
          </li>
          <li>
            <svg viewBox="0 0 50 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="2" width="42" height="24" rx="3" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <text x="25" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="600" fontFamily="Arial" opacity="0.9">TS</text>
            </svg>
          </li>
          <li>
            <svg viewBox="0 0 50 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25 2L46 14L25 26L4 14L25 2Z" stroke="white" strokeWidth="1.5" opacity="0.6" fill="none" />
              <text x="25" y="18" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Arial" opacity="0.9">node</text>
            </svg>
          </li>
          <li>
            <svg viewBox="0 0 50 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="6" width="34" height="16" rx="2" stroke="white" strokeWidth="1.5" opacity="0.6" fill="none" />
              <rect x="12" y="10" width="6" height="4" rx="1" fill="white" opacity="0.7" />
              <rect x="20" y="10" width="6" height="4" rx="1" fill="white" opacity="0.7" />
              <rect x="28" y="10" width="6" height="4" rx="1" fill="white" opacity="0.7" />
              <rect x="36" y="10" width="4" height="4" rx="1" fill="white" opacity="0.7" />
            </svg>
          </li>
          <li>
            <svg viewBox="0 0 50 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="25" cy="14" rx="12" ry="6" stroke="white" strokeWidth="1.5" opacity="0.4" fill="none" />
              <ellipse cx="25" cy="14" rx="8" ry="4" stroke="white" strokeWidth="1.5" opacity="0.6" fill="none" />
              <path d="M25 8L30 14L25 20L20 14L25 8Z" fill="white" opacity="0.85" />
            </svg>
          </li>
        </ul>
      </div>
      <div className="caseList">
        {CASES.map((c, i) => (
          <div className="case" key={i}>
            <div className="imageMask" data-cursor-text="Preview">
              <div className="c-glitch" style={{ backgroundImage: GLITCH_GRADIENTS[i] }}>
                <div className="c-glitch__img" style={{ backgroundImage: GLITCH_GRADIENTS[i] }} />
                <div className="c-glitch__img" style={{ backgroundImage: GLITCH_GRADIENTS[i] }} />
                <div className="c-glitch__img" style={{ backgroundImage: GLITCH_GRADIENTS[i] }} />
                <div className="c-glitch__img" style={{ backgroundImage: GLITCH_GRADIENTS[i] }} />
                <div className="c-glitch__img" style={{ backgroundImage: GLITCH_GRADIENTS[i] }} />
              </div>
              <Corner className="topleft" />
              <Corner className="topright" />
              <Corner className="bottomleft" />
              <Corner className="bottomright" />
            </div>
            <div className="caseInfo" data-motion-text>
              <ul className="tags">
                {c.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
              <h3 data-motion-text>{c.title}</h3>
              <p data-motion-text>{c.desc}</p>
              <a href={c.href} className="btn" data-cursor-text="View case">
                <Corner className="topleft" />
                <Corner className="topright" />
                <Corner className="bottomleft" />
                <Corner className="bottomright" />
                <span>VIEW CASE</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── EXPERIENCE ─── */
const EXPERIENCE = [
  { date: "2022 – Now · Sber", role: "Senior designer", desc: "Develop and maintain a design system for retail investment products. Designed key mobile app areas including market view, instrument lists, favorites, and transaction history. Contributed to design operations and team processes." },
  { date: "2018 – 2022", role: "Self-employed", desc: "Delivered end-to-end fintech projects for clients, from discovery and UX to final UI, systems, and developer handoff." },
  { date: "2017 – 2019 · Teorema Agency", role: "Head of design", desc: "Led design work across client projects, managed a small team, and worked closely with developers." },
  { date: "2015 – 2017 · Matart Group LLC", role: "Founder & Lead Designer", desc: "Designed complex internal systems, dashboards, and industrial interfaces. Also worked on early fintech and crypto products." },
  { date: "2012 – 2015 · Atlas-2", role: "Middle Product Designer", desc: "Designed interfaces for electronic signature issuance and document workflow systems." },
];

const SKILLS = [
  { title: "UI & UX", desc: "Modern design with a focus on information clarity, data, and minimalism." },
  { title: "Design System", desc: "Design system development and maintenance, including documentation." },
  { title: "AI tools: Codex, ChatGPT, Claude", desc: "Use AI tools to accelerate research, copy iteration, documentation, prototyping, and repetitive production tasks." },
  { title: "Design management", desc: "Leading a small design team and collaborating closely with developers and product stakeholders." },
  { title: "Motion & Prototype", desc: "Interface animation and high-fidelity prototyping." },
  { title: "Presentation", desc: "Whitepapers, financial reports, and investor presentations." },
  { title: "Icon Design", desc: "UI icon design, motion assets, SVG, and Lottie." },
  { title: "3D", desc: "3D visuals for interfaces, product storytelling, and WebGL-based interactive presentations." },
];

const PROJECTS = [
  {
    icon: "M10 0C11.8296 0 13.5432 0.493593 15.0186 1.35156C14.0461 2.28669 13.2313 3.38331 12.6172 4.59961C11.8262 4.21558 10.9383 4 10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16C10.9385 16 11.8261 15.7836 12.6172 15.3994C13.2313 16.6158 14.0461 17.7122 15.0186 18.6475C13.5431 19.5056 11.8298 20 10 20C4.47715 20 0 15.5228 0 10C1.61065e-07 4.47715 4.47715 1.61069e-07 10 0ZM23.333 0C28.8559 0 33.333 4.47715 33.333 10C33.333 15.5228 28.8559 20 23.333 20C17.8103 19.9998 13.333 15.5227 13.333 10C13.333 4.47727 17.8103 0.000197914 23.333 0Z",
    iconViewBox: "0 0 34 20",
    name: "CryptoIcon",
    desc: "Library of popular cryptocurrencies in SVG, webfont, 3D, and SVG sprite formats.",
    href: "https://cryptoicon.io/",
  },
  {
    icon: "M14 7V35L0 28V0L14 7ZM31.5 7V35L17.5 28V0L31.5 7ZM49 7V35L35 28V0L49 7Z",
    iconViewBox: "0 0 49 35",
    name: "Fintech Design System",
    desc: "A design system focused on financial products, delivered as a component library in Figma and web platforms (React).",
    soon: true,
  },
];

function LastBlocks() {
  return (
    <section className="section lalalast" id="exp">
      <div className="container last">
        <div className="block">
          <div className="col" data-motion-text>
            <h3 className="small">Experience</h3>
            <ul className="list" data-motion-text>
              {EXPERIENCE.map((e, i) => (
                <li key={i}>
                  <span className="date">{e.date}</span>
                  <h4>{e.role}</h4>
                  <p>{e.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="block">
          <div className="col" data-motion-text>
            <h3 className="small">Skills</h3>
            <ul className="list" data-motion-text>
              {SKILLS.map((s, i) => (
                <li key={i}>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="block">
          <div className="col" data-motion-text>
            <h3 className="small">Personal projects</h3>
            <ul className="list" data-motion-text>
              {PROJECTS.map((p, i) => (
                <li key={i}>
                  <svg className="logo" viewBox={p.iconViewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d={p.icon} fill="white" />
                  </svg>
                  <h4>{p.name}{p.soon && <i className="soon">  soon</i>}</h4>
                  <p>{p.desc}</p>
                  {p.href && <ScrambleBtn text="View project" href={p.href} revealOnScroll />}
                </li>
              ))}
            </ul>
          </div>
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
    if (!el) return;
    const btns = [...el.querySelectorAll<HTMLElement>(".hero-btn")];
    el.style.setProperty("--hero-scale", "0.85");
    el.style.setProperty("--hero-opacity", "1");
    el.style.removeProperty("--hero-blur");

    let prevE = -1;

    const unsub = scrollYProgress.on("change", (v) => {
      const n = Math.min(Math.max(v / 0.55, 0), 1);
      const e = 1 - Math.pow(1 - n, 3);

      if (e !== prevE) {
        el.style.setProperty("--hero-scale", String(0.85 - e * 0.25));
        el.style.setProperty("--hero-opacity", String(1 - e));
        el.style.setProperty("--hero-blur", e > 0 ? `blur(${e * 15}px)` : "");
        prevE = e;
      }
    });
    return unsub;
  }, [scrollYProgress]);

  useEffect(() => {
    const btns = [...document.querySelectorAll<HTMLElement>(".hero-content .hero-btn")];
    const spec = document.getElementById("spec");
    if (!spec || !btns.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        for (const btn of btns) {
          btn.style.opacity = entry.isIntersecting ? "0.25" : "";
          btn.style.pointerEvents = entry.isIntersecting ? "none" : "";
          btn.style.borderColor = entry.isIntersecting ? "rgba(255,255,255,0.06)" : "";
        }
      },
      { threshold: 0 }
    );
    observer.observe(spec);
    return () => observer.disconnect();
  }, []);

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
      <div className="edge-blur__top" aria-hidden="true" />
      <div className="edge-blur__bottom" aria-hidden="true" />
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
        <LastBlocks />
        <div className="container vse" data-motion-text>
          <svg viewBox="0 14 480 78" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.61 67.24L3.61 67.24L17.68 65.87Q18.95 72.95 22.83 76.27Q26.71 79.59 33.30 79.59L33.30 79.59Q40.28 79.59 43.82 76.64Q47.36 73.68 47.36 69.73L47.36 69.73Q47.36 67.19 45.87 65.41Q44.38 63.62 40.67 62.30L40.67 62.30Q38.13 61.43 29.10 59.18L29.10 59.18Q17.48 56.30 12.79 52.10L12.79 52.10Q6.20 46.19 6.20 37.70L6.20 37.70Q6.20 32.23 9.30 27.47Q12.40 22.71 18.24 20.21Q24.07 17.72 32.32 17.72L32.32 17.72Q45.80 17.72 52.61 23.63Q59.42 29.54 59.77 39.40L59.77 39.40L45.31 40.04Q44.38 34.52 41.33 32.10Q38.28 29.69 32.18 29.69L32.18 29.69Q25.88 29.69 22.31 32.28L22.31 32.28Q20.02 33.94 20.02 36.72L20.02 36.72Q20.02 39.26 22.17 41.06L22.17 41.06Q24.90 43.36 35.45 45.85Q46.00 48.34 51.05 51.00Q56.10 53.66 58.96 58.28Q61.82 62.89 61.82 69.68L61.82 69.68Q61.82 75.83 58.40 81.20Q54.98 86.57 48.73 89.18Q42.48 91.80 33.15 91.80L33.15 91.80Q19.58 91.80 12.30 85.52Q5.03 79.25 3.61 67.24ZM109.86 18.95L138.53 90.53L122.80 90.53L116.55 74.27L87.94 74.27L82.03 90.53L66.70 90.53L94.58 18.95L109.86 18.95ZM92.38 62.21L111.91 62.21L102.05 35.64L92.38 62.21ZM160.69 90.53L146.24 90.53L146.24 18.95L176.66 18.95Q188.13 18.95 193.33 20.87Q198.54 22.80 201.66 27.73Q204.79 32.67 204.79 39.01L204.79 39.01Q204.79 47.07 200.05 52.32Q195.31 57.57 185.89 58.94L185.89 58.94Q190.58 61.67 193.63 64.94Q196.68 68.21 201.86 76.56L201.86 76.56L210.60 90.53L193.31 90.53L182.86 74.95Q177.29 66.60 175.24 64.43Q173.19 62.26 170.90 61.45Q168.60 60.64 163.62 60.64L163.62 60.64L160.69 60.64L160.69 90.53ZM160.69 31.05L160.69 49.22L171.39 49.22Q181.79 49.22 184.38 48.34Q186.96 47.46 188.43 45.31Q189.89 43.16 189.89 39.94L189.89 39.94Q189.89 36.33 187.96 34.11Q186.04 31.88 182.52 31.30L182.52 31.30Q180.76 31.05 171.97 31.05L171.97 31.05L160.69 31.05ZM252.10 90.53L236.67 90.53L211.08 18.95L226.76 18.95L244.87 71.92L262.40 18.95L277.73 18.95L252.10 90.53ZM339.55 90.53L285.11 90.53L285.11 18.95L338.18 18.95L338.18 31.05L299.56 31.05L299.56 46.92L335.50 46.92L335.50 58.98L299.56 58.98L299.56 78.47L339.55 78.47L339.55 90.53ZM348.14 67.24L348.14 67.24L362.21 65.87Q363.48 72.95 367.36 76.27Q371.24 79.59 377.83 79.59L377.83 79.59Q384.81 79.59 388.35 76.64Q391.89 73.68 391.89 69.73L391.89 69.73Q391.89 67.19 390.41 65.41Q388.92 63.62 385.21 62.30L385.21 62.30Q382.67 61.43 373.63 59.18L373.63 59.18Q362.01 56.30 357.32 52.10L357.32 52.10Q350.73 46.19 350.73 37.70L350.73 37.70Q350.73 32.23 353.83 27.47Q356.93 22.71 362.77 20.21Q368.60 17.72 376.86 17.72L376.86 17.72Q390.33 17.72 397.14 23.63Q403.96 29.54 404.30 39.40L404.30 39.40L389.84 40.04Q388.92 34.52 385.86 32.10Q382.81 29.69 376.71 29.69L376.71 29.69Q370.41 29.69 366.85 32.28L366.85 32.28Q364.55 33.94 364.55 36.72L364.55 36.72Q364.55 39.26 366.70 41.06L366.70 41.06Q369.43 43.36 379.98 45.85Q390.53 48.34 395.58 51.00Q400.63 53.66 403.49 58.28Q406.35 62.89 406.35 69.68L406.35 69.68Q406.35 75.83 402.93 81.20Q399.51 86.57 393.26 89.18Q387.01 91.80 377.69 91.80L377.69 91.80Q364.11 91.80 356.84 85.52Q349.56 79.25 348.14 67.24ZM433.01 90.53L418.55 90.53L418.55 18.95L433.01 18.95L433.01 47.12L461.33 47.12L461.33 18.95L475.78 18.95L475.78 90.53L461.33 90.53L461.33 59.23L433.01 59.23L433.01 90.53Z" fill="white"/>
          </svg>
        </div>
      </div>
    </>
  );
}
