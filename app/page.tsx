"use client";

import Lenis from "lenis";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const nav = ["resume", "github", "patreon", "linkedin", "email"];
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

function NavItem({ label, onEnter }: { label: string; onEnter: (el: HTMLAnchorElement) => void }) {
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

  return (
    <a
      ref={ref}
      href="#"
      onMouseEnter={() => {
        if (ref.current) onEnter(ref.current);
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
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, height: 0 });

  function handleEnter(el: HTMLAnchorElement) {
    if (!navRef.current) return;
    const navRect = navRef.current.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setBox({
      top: rect.top - navRect.top,
      left: rect.left - navRect.left,
      width: rect.width,
      height: rect.height,
    });
    setHovered(true);
  }

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  function toggleSound() {
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
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {soundOn ? (
            <>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </>
          ) : (
            <>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </>
          )}
        </svg>
      </button>

      <nav className="header-nav" aria-label="Social links" ref={navRef} onMouseLeave={() => setHovered(false)}>
        {nav.map((item) => (
          <NavItem key={item} label={item} onEnter={handleEnter} />
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

function Hero() {
  const { text, scramble, reset } = useScramble("WRITE TO TELEGRAM");

  return (
    <div className="hero-content">
      <h1><strong>Full</strong> <strong>Stack</strong> developer crafting digital experiences</h1>
      <p>I build modern web applications with clean code, thoughtful architecture, and a focus on the details that matter</p>
      <a className="hero-btn" href="#"
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

export default function Page() {
  useLenis();

  useEffect(() => {
    const targets = document.querySelectorAll("a, button, article, .skill-cloud span");
    targets.forEach((target) => target.setAttribute("data-magnetic", ""));
  }, []);

  return (
    <>
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
        <Hero />
        <Hud />
        <ScrollIndicator />
      </div>
    </>    
  );
}
