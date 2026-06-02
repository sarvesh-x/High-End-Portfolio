"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import casesData from "./data/cases.json";

gsap.registerPlugin(ScrollTrigger);

const nav = ["cv", "github", "patreon", "linkedin", "email"];

let lenisInstance: Lenis | null = null;

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 0.78,
      smoothWheel: true
    });
    lenisInstance = lenis;

    let raf = 0;
    function loop(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);
}

const chars = "कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह";

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
      i += 0.3;
    }, 20);
    timeoutRef.current = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setText(label);
    }, Math.max(600, label.length * 67 + 200));
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
      const isCaseInfo = el.matches(".caseInfo");
      const isWordSplit = el.matches("h1, h2, h3, h4, .bio, .list li p, .list li span.date, .list li h4 span, .caseInfo p, #cases .container");

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
      } else if (isCaseInfo) {
        const tween = gsap.fromTo(el,
          { y: 100, opacity: 0, filter: "blur(8px)" },
          {
            y: 0, opacity: 1, filter: "blur(0px)",
            duration: 0.55,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", end: "top 25%", scrub: 1 },
          }
        );
        anims.push(tween);
      } else if (isWordSplit) {
        const cloned = deepSplit(el);
        el.innerHTML = "";
        el.appendChild(cloned);

        const targets = el.querySelectorAll(".motion-word, [class^='icon-'], [class*=' icon-'], svg");
        if (!targets.length) return;

        const animTargets: Element[] = [];
        targets.forEach(t => {
          if (t.matches("[class^='icon-'], [class*=' icon-'], svg")) {
            const wrap = document.createElement("span");
            wrap.style.display = "inline-block";
            t.parentNode!.insertBefore(wrap, t);
            wrap.appendChild(t);
            animTargets.push(wrap);
          } else {
            animTargets.push(t);
          }
        });

        const stagger = el.matches("#cases .container") ? 0.04 : 0.08;
        const tween = gsap.fromTo(animTargets,
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
      const btnGroup = specSection.querySelector(".btn-group");
      const specButtons = specSection.querySelectorAll(".btn-group li");
      
      if (specBio) {
        const bioTween = gsap.fromTo(specBio,
          { y: 40, opacity: 0, filter: "blur(10px)" },
          {
            y: 0, opacity: 1, filter: "blur(0px)",
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: { trigger: specBio, start: "top 95%", end: "top 55%", scrub: 1 },
          }
        );
        anims.push(bioTween);
      }

      if (specButtons.length) {
        gsap.set(specButtons, { transition: "none", y: 50, opacity: 0, filter: "blur(15px)" });
        const tween = gsap.to(specButtons,
          {
            y: 0, opacity: 1, filter: "blur(0px)",
            duration: 0.9,
          stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: btnGroup,
              start: "top 80%",
              end: "top 45%",
              scrub: 1,
            },
          }
        );
        anims.push(tween);
      }
    }

    // Float-up + blur for lalalast columns and list items
    const lalaCols = document.querySelectorAll(".lalalast .col");
    lalaCols.forEach((col) => {
      const heading = col.querySelector("h3.small");
      const targets = col.querySelectorAll("ul.list li h4, ul.list li p, ul.list li span.date, ul.list li svg.logo");
      const btnTargets = col.querySelectorAll("ul.list li .hero-btn");

      const allTargets: (Element | null)[] = [];
      if (heading) allTargets.push(heading);
      targets.forEach((t) => allTargets.push(t));

      if (allTargets.length) {
        const tween = gsap.fromTo(allTargets,
          { y: 30, opacity: 0, filter: "blur(8px)" },
          {
            y: 0, opacity: 1, filter: "blur(0px)",
            duration: 0.6, stagger: 0.06,
            scrollTrigger: { trigger: col, start: "top bottom", end: "top 30%", scrub: 1 },
          }
        );
        anims.push(tween);
      }

      if (btnTargets.length) {
        const btnTween = gsap.fromTo(btnTargets,
          { y: 30, opacity: 0, filter: "blur(8px)" },
          {
            y: 0, opacity: 1, filter: "blur(0px)",
            duration: 0.6, stagger: 0.06,
            scrollTrigger: { trigger: col, start: "top bottom", end: "top 45%", scrub: 1 },
          }
        );
        anims.push(btnTween);
      }
    });

    // Blur reveal for case study images
    const caseImages = document.querySelectorAll("#cases .imageMask");
    caseImages.forEach((img) => {
      const tween = gsap.fromTo(img,
        { y: 60, opacity: 0, filter: "blur(15px)" },
        {
          y: 0, opacity: 1, filter: "blur(0px)",
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: img, start: "top 85%", end: "top 35%", scrub: 1 },
        }
      );
      anims.push(tween);
    });

    // Blur reveal for case tags (borders)
    const caseTags = document.querySelectorAll("#cases .tags li");
    caseTags.forEach((tag) => {
      const tween = gsap.fromTo(tag,
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1, filter: "blur(0px)",
          duration: 0.5,
          ease: "power3.out",
          scrollTrigger: { trigger: tag.closest(".tags"), start: "top 85%", end: "top 35%", scrub: 1 },
        }
      );
      anims.push(tween);
    });

    // Float-up stagger for case buttons
    const caseBtnGroups = document.querySelectorAll("#cases .case-btns");
    caseBtnGroups.forEach((group) => {
      const btns = group.querySelectorAll<HTMLElement>(".hero-btn");
      if (!btns.length) return;
      gsap.set(btns, { transition: "none", y: 300, opacity: 0, filter: "blur(8px)" });
      const tween = gsap.to(btns,
        {
          y: 0, opacity: 1, filter: "blur(0px)",
          duration: 0.9,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: group.closest(".case"),
            start: "top 80%",
            end: "top 45%",
            scrub: 1,
          },
        }
      );
      anims.push(tween);
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

  const linkMap: Record<string, { href: string; target?: string; rel?: string; download?: boolean }> = {
    cv: { href: "/Resume-2025.pdf", download: true },
    linkedin: { href: "https://www.linkedin.com/in/sarvesh-kumar-developer", target: "_blank", rel: "noopener noreferrer" },
    github: { href: "https://github.com/sarvesh-x/", target: "_blank", rel: "noopener noreferrer" },
    patreon: { href: "https://www.patreon.com/profile/creators?u=6304245", target: "_blank", rel: "noopener noreferrer" },
    email: { href: "mailto:sarveshkumar10101@gmail.com" },
  };
  const link = linkMap[label] ?? { href: "#" };

  return (
    <a
      ref={ref}
      href={link.href}
      target={link.target}
      rel={link.rel}
      download={link.download || undefined}
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

  useEffect(() => {
    const svg = document.getElementById("wave") as unknown as SVGSVGElement;
    if (!svg) return;
    soundOn ? svg.unpauseAnimations() : svg.pauseAnimations();
  }, [soundOn]);

  function toggleSound() {
    sounds.unlock();
    if (audioRef.current) {
      audioRef.current.volume = soundOn ? 0 : 0.4;
      setSoundOn(!soundOn);
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
        <svg id="wave" width="48" height="48" fill="none" viewBox="0 0 500 500">
          <g transform="matrix(1.5,0,0,1.5,90.33,90.332)" id="Record Outlines">
            <g transform="matrix(1,0,0,1,106.34,106.336)">
              <path fill="#000000" d="M-34.781,86.922C-82.713,67.724,-106.09,13.138,-86.892,-34.785C-67.694,-82.717,-13.11,-106.086,34.822,-86.896C82.713,-67.699,106.09,-13.104,86.926,34.819C67.727,82.709,13.142,106.086,-34.781,86.922Z" />
            </g>
            <g transform="matrix(1,0,0,1,106.34,106.336)">
              <path fill="#ffffff" d="M-2.462,6.218C-5.889,4.847,-7.56,0.961,-6.214,-2.466C-4.811,-5.892,-0.933,-7.556,2.503,-6.218C5.93,-4.847,7.593,-0.928,6.222,2.499C4.851,5.926,0.932,7.589,-2.462,6.218ZM4.976,-12.42C-1.877,-15.161,-9.649,-11.835,-12.391,-4.981C-15.166,1.881,-11.797,9.678,-4.978,12.419C1.876,15.161,9.682,11.834,12.423,4.981C15.165,-1.881,11.838,-9.645,4.976,-12.42Z" />
            </g>
            <g transform="matrix(1,0,0,1,106.357,106.352)">
              <path fill="#ffffff" d="M-9.958,24.815C-23.631,19.324,-30.293,3.719,-24.844,-9.954C-19.362,-23.636,-3.758,-30.33,9.924,-24.847C23.639,-19.356,30.3,-3.752,24.843,9.921C19.327,23.603,3.757,30.297,-9.958,24.815ZM14.889,-37.25C-5.68,-45.475,-29.023,-35.487,-37.247,-14.918C-45.48,5.65,-35.484,28.994,-14.915,37.217C5.645,45.475,28.988,35.488,37.221,14.919C45.479,-5.65,35.49,-29.026,14.889,-37.25Z" />
            </g>
          </g>
          <g id="Spin Outlines">
            <g transform="translate(249.92, 249.735)">
              <g transform="rotate(0)">
                <animateTransform repeatCount="indefinite" type="rotate" attributeName="transform" dur="0.979s" begin="0s" calcMode="spline" values="0; 360" keyTimes="0; 1" keySplines="0 0 1 1" fill="freeze" />
                <g transform="scale(1.5,1.5) translate(-75.42,-74.735)">
                <g transform="matrix(1,0,0,1,108.571,107.121)">
                  <path fill="#ffffff" d="M16.52,-12.487C17.205,-14.216,16.36,-16.147,14.655,-16.833C12.925,-17.518,11.002,-16.699,10.317,-14.969C5.487,-2.984,-3.724,5.925,-14.723,10.656C-16.419,11.374,-17.205,13.339,-16.486,15.035C-15.734,16.732,-13.778,17.518,-12.082,16.799C-12.015,16.766,-12.015,16.732,-11.948,16.699C0.555,11.283,11.038,1.128,16.52,-12.487Z" />
                </g>
                <g transform="matrix(1,0,0,1,126.235,124.375)">
                  <path fill="#ffffff" d="M21.806,-24.158C20.11,-24.844,18.153,-23.999,17.467,-22.303C9.92,-3.464,-4.572,10.577,-21.873,17.957C-23.577,18.709,-24.355,20.665,-23.636,22.362C-22.884,24.059,-20.928,24.844,-19.231,24.125C-19.165,24.059,-19.098,24,-19.007,23.966C-0.234,15.867,15.471,0.623,23.669,-19.82C24.355,-21.516,23.503,-23.472,21.806,-24.158Z" />
                </g>
                <g transform="matrix(1,0,0,1,117.4,115.755)">
                  <path fill="#ffffff" d="M18.238,-20.502C16.508,-21.187,14.577,-20.368,13.891,-18.638C7.723,-3.234,-4.129,8.232,-18.295,14.3L-18.262,14.3C-19.992,15.019,-20.778,17.009,-20.059,18.705C-19.306,20.41,-17.35,21.187,-15.654,20.435C-15.586,20.41,-15.553,20.377,-15.486,20.31C0.184,13.548,13.272,0.886,20.091,-16.155C20.777,-17.86,19.934,-19.816,18.238,-20.502Z" />
                </g>
                <g transform="matrix(1,0,0,1,42.293,42.365)">
                  <path fill="#ffffff" d="M16.487,-15.053C15.743,-16.75,13.778,-17.535,12.081,-16.783C12.014,-16.783,11.981,-16.715,11.956,-16.715C-0.581,-11.3,-11.062,-1.146,-16.519,12.503C-17.205,14.199,-16.386,16.164,-14.656,16.85C-12.959,17.535,-11.003,16.682,-10.318,14.986C-5.512,2.967,3.724,-5.942,14.732,-10.647C16.428,-11.358,17.205,-13.323,16.487,-15.053Z" />
                </g>
                <g transform="matrix(1,0,0,1,24.604,25.094)">
                  <path fill="#ffffff" d="M23.636,-22.362C22.917,-24.058,20.928,-24.843,19.223,-24.124C19.165,-24.091,19.098,-23.999,19.031,-23.965C0.26,-15.867,-15.479,-0.656,-23.669,19.821C-24.354,21.551,-23.51,23.473,-21.814,24.159C-20.084,24.844,-18.154,24.034,-17.469,22.295C-9.896,3.465,4.572,-10.543,21.872,-17.956C23.569,-18.709,24.355,-20.665,23.636,-22.362Z" />
                </g>
                <g transform="matrix(1,0,0,1,33.468,33.748)">
                  <path fill="#ffffff" d="M18.266,-14.334C19.962,-15.052,20.782,-17.008,20.029,-18.713C19.31,-20.41,17.347,-21.187,15.65,-20.477C15.583,-20.443,15.558,-20.376,15.457,-20.343C-0.18,-13.582,-13.276,-0.886,-20.097,16.122C-20.782,17.852,-19.963,19.816,-18.233,20.501C-16.536,21.187,-14.58,20.368,-13.895,18.638C-7.727,3.192,4.125,-8.266,18.266,-14.3L18.266,-14.334Z" />
                </g>
              </g>
            </g>
            </g>
          </g>
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
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const spec = document.getElementById("spec");
    if (!spec) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHidden(true); },
      { threshold: 0 }
    );
    observer.observe(spec);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="scroll-indicator" style={{ opacity: hidden ? 0 : 1, transition: "opacity 0.6s ease" }}>
      <svg width="12" height="20" viewBox="0 0 22 22" fill="none">
        <rect x="5" y="1.5" width="12" height="17" rx="6" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9.5" y="4" width="3" height="5" rx="1.5" fill="currentColor" />
      </svg>
      <span>Scroll</span>
    </div>
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
function ScrambleBtn({ text, cursorText, secondary, revealOnScroll, href, className, onClick, download, target }: {
  text: string;
  cursorText?: string;
  secondary?: boolean;
  revealOnScroll?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
  download?: boolean;
  target?: string;
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
      className={"hero-btn" + (secondary ? " secondary" : "") + (className ? " " + className : "")}
      href={href ?? "#"}
      download={download || undefined}
      target={target}
      rel={target ? "noopener noreferrer" : undefined}
      data-cursor-text={cursorText ?? text}
      data-sound-hover
      style={sStyle}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      onClick={onClick}
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
      <span className="mark-bars" aria-hidden>
        <i /><i /><i />
      </span>
      <h1><strong>Full</strong> <strong>Stack</strong> developer crafting digital experiences</h1>
      <p className="p">I build modern web applications with clean code, thoughtful architecture, and a focus on the details that matter</p>
      <ScrambleBtn text="Explore" cursorText="Scroll down" onClick={() => lenisInstance?.scrollTo("#spec", { duration: 2 })} />
    </div>
  );
}

/* ─── LOADER ─── */
function Loader({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const root = document.getElementById("boot-loader");
    const bar = document.getElementById("boot-loader-bar");
    const pct = document.getElementById("boot-loader-pct");
    if (!root || !bar || !pct) return;

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

  return null;
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
        <h1 data-motion-text>
          <b>I specialize</b> in<span className="icon-android"></span>full stack development, <span className="icon-component"></span> building <b>scalable</b> systems, and <span className="icon-web"></span> crafting <b>seamless</b> interfaces
        </h1>
        <p className="p bio">
          I&apos;m currently open to full-time Full Stack Developer roles in product companies or innovative startups. I&apos;m also available for selected high-impact contract work.
        </p>
        <ul className="btn-group">
          <li><ScrambleBtn className="hero-btn-1" text="WhatsApp Me" cursorText="Send me message" href="https://wa.me/919660268159" target="_blank" /></li>
          <li><ScrambleBtn className="hero-btn-2" text="DOWNLOAD CV" cursorText="Download CV" secondary href="/Resume-2025.pdf" download /></li>
        </ul>
      </div>
    </section>
  );
}

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
            <svg width="256px" height="256px" viewBox="-3.2 -3.2 38.40 38.40" 
            fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" strokeWidth="0.00032"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth="1.024"></g><g id="SVGRepo_iconCarrier"> <path d="M18.6789 15.9759C18.6789 14.5415 17.4796 13.3785 16 13.3785C14.5206 13.3785 13.3211 14.5415 13.3211 15.9759C13.3211 17.4105 14.5206 18.5734 16 18.5734C17.4796 18.5734 18.6789 17.4105 18.6789 15.9759Z" fill="#53C1DE"></path> <path fillRule="evenodd" clipRule="evenodd" d="M24.7004 11.1537C25.2661 8.92478 25.9772 4.79148 23.4704 3.39016C20.9753 1.99495 17.7284 4.66843 16.0139 6.27318C14.3044 4.68442 10.9663 2.02237 8.46163 3.42814C5.96751 4.82803 6.73664 8.8928 7.3149 11.1357C4.98831 11.7764 1 13.1564 1 15.9759C1 18.7874 4.98416 20.2888 7.29698 20.9289C6.71658 23.1842 5.98596 27.1909 8.48327 28.5877C10.9973 29.9932 14.325 27.3945 16.0554 25.7722C17.7809 27.3864 20.9966 30.0021 23.4922 28.6014C25.9956 27.1963 25.3436 23.1184 24.7653 20.8625C27.0073 20.221 31 18.7523 31 15.9759C31 13.1835 26.9903 11.7923 24.7004 11.1537ZM24.4162 19.667C24.0365 18.5016 23.524 17.2623 22.8971 15.9821C23.4955 14.7321 23.9881 13.5088 24.3572 12.3509C26.0359 12.8228 29.7185 13.9013 29.7185 15.9759C29.7185 18.07 26.1846 19.1587 24.4162 19.667ZM22.85 27.526C20.988 28.571 18.2221 26.0696 16.9478 24.8809C17.7932 23.9844 18.638 22.9422 19.4625 21.7849C20.9129 21.6602 22.283 21.4562 23.5256 21.1777C23.9326 22.7734 24.7202 26.4763 22.85 27.526ZM9.12362 27.5111C7.26143 26.47 8.11258 22.8946 8.53957 21.2333C9.76834 21.4969 11.1286 21.6865 12.5824 21.8008C13.4123 22.9332 14.2816 23.9741 15.1576 24.8857C14.0753 25.9008 10.9945 28.557 9.12362 27.5111ZM2.28149 15.9759C2.28149 13.874 5.94207 12.8033 7.65904 12.3326C8.03451 13.5165 8.52695 14.7544 9.12123 16.0062C8.51925 17.2766 8.01977 18.5341 7.64085 19.732C6.00369 19.2776 2.28149 18.0791 2.28149 15.9759ZM9.1037 4.50354C10.9735 3.45416 13.8747 6.00983 15.1159 7.16013C14.2444 8.06754 13.3831 9.1006 12.5603 10.2265C11.1494 10.3533 9.79875 10.5569 8.55709 10.8297C8.09125 9.02071 7.23592 5.55179 9.1037 4.50354ZM20.3793 11.5771C21.3365 11.6942 22.2536 11.85 23.1147 12.0406C22.8562 12.844 22.534 13.6841 22.1545 14.5453C21.6044 13.5333 21.0139 12.5416 20.3793 11.5771ZM16.0143 8.0481C16.6054 8.66897 17.1974 9.3623 17.7798 10.1145C16.5985 10.0603 15.4153 10.0601 14.234 10.1137C14.8169 9.36848 15.414 8.67618 16.0143 8.0481ZM9.8565 14.5444C9.48329 13.6862 9.16398 12.8424 8.90322 12.0275C9.75918 11.8418 10.672 11.69 11.623 11.5748C10.9866 12.5372 10.3971 13.5285 9.8565 14.5444ZM11.6503 20.4657C10.6679 20.3594 9.74126 20.2153 8.88556 20.0347C9.15044 19.2055 9.47678 18.3435 9.85796 17.4668C10.406 18.4933 11.0045 19.4942 11.6503 20.4657ZM16.0498 23.9915C15.4424 23.356 14.8365 22.6531 14.2448 21.8971C15.4328 21.9423 16.6231 21.9424 17.811 21.891C17.2268 22.6608 16.6369 23.3647 16.0498 23.9915ZM22.1667 17.4222C22.5677 18.3084 22.9057 19.1657 23.1742 19.9809C22.3043 20.1734 21.3652 20.3284 20.3757 20.4435C21.015 19.4607 21.6149 18.4536 22.1667 17.4222ZM18.7473 20.5941C16.9301 20.72 15.1016 20.7186 13.2838 20.6044C12.2509 19.1415 11.3314 17.603 10.5377 16.0058C11.3276 14.4119 12.2404 12.8764 13.2684 11.4158C15.0875 11.2825 16.9178 11.2821 18.7369 11.4166C19.7561 12.8771 20.6675 14.4086 21.4757 15.9881C20.6771 17.5812 19.7595 19.1198 18.7473 20.5941ZM22.8303 4.4666C24.7006 5.51254 23.8681 9.22726 23.4595 10.8426C22.2149 10.5641 20.8633 10.3569 19.4483 10.2281C18.6239 9.09004 17.7698 8.05518 16.9124 7.15949C18.1695 5.98441 20.9781 3.43089 22.8303 4.4666Z" fill="#53C1DE"></path> </g></svg>
          </li>
          <li>
            <svg width="64px" height="64px" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fillRule="evenodd" clipRule="evenodd" d="M13.0164 2C10.8193 2 9.03825 3.72453 9.03825 5.85185V8.51852H15.9235V9.25926H5.97814C3.78107 9.25926 2 10.9838 2 13.1111L2 18.8889C2 21.0162 3.78107 22.7407 5.97814 22.7407H8.27322V19.4815C8.27322 17.3542 10.0543 15.6296 12.2514 15.6296H19.5956C21.4547 15.6296 22.9617 14.1704 22.9617 12.3704V5.85185C22.9617 3.72453 21.1807 2 18.9836 2H13.0164ZM12.0984 6.74074C12.8589 6.74074 13.4754 6.14378 13.4754 5.40741C13.4754 4.67103 12.8589 4.07407 12.0984 4.07407C11.3378 4.07407 10.7213 4.67103 10.7213 5.40741C10.7213 6.14378 11.3378 6.74074 12.0984 6.74074Z" fill="url(#paint0_linear_87_8204)"></path> <path fillRule="evenodd" clipRule="evenodd" d="M18.9834 30C21.1805 30 22.9616 28.2755 22.9616 26.1482V23.4815L16.0763 23.4815L16.0763 22.7408L26.0217 22.7408C28.2188 22.7408 29.9998 21.0162 29.9998 18.8889V13.1111C29.9998 10.9838 28.2188 9.25928 26.0217 9.25928L23.7266 9.25928V12.5185C23.7266 14.6459 21.9455 16.3704 19.7485 16.3704L12.4042 16.3704C10.5451 16.3704 9.03809 17.8296 9.03809 19.6296L9.03809 26.1482C9.03809 28.2755 10.8192 30 13.0162 30H18.9834ZM19.9015 25.2593C19.1409 25.2593 18.5244 25.8562 18.5244 26.5926C18.5244 27.329 19.1409 27.9259 19.9015 27.9259C20.662 27.9259 21.2785 27.329 21.2785 26.5926C21.2785 25.8562 20.662 25.2593 19.9015 25.2593Z" fill="url(#paint1_linear_87_8204)"></path> <defs> <linearGradient id="paint0_linear_87_8204" x1="12.4809" y1="2" x2="12.4809" y2="22.7407" gradientUnits="userSpaceOnUse"> <stop stopColor="#327EBD"></stop> <stop offset="1" stopColor="#1565A7"></stop> </linearGradient> <linearGradient id="paint1_linear_87_8204" x1="19.519" y1="9.25928" x2="19.519" y2="30" gradientUnits="userSpaceOnUse"> <stop stopColor="#FFDA4B"></stop> <stop offset="1" stopColor="#F9C600"></stop> </linearGradient> </defs> </g></svg>
          </li>
          <li>
            <svg width="64px" height="64px" viewBox="-9 0 274 274" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M145.726081,42.0651946 L145.726081,84.1347419 L218.586952,126.204312 L218.586952,84.1347419 L145.726081,42.0651946 Z M-1.98726454e-07,84.1347419 L-1.98726454e-07,126.204312 L36.4304238,147.234755 L36.4304238,105.169527 L-1.98726454e-07,84.1347419 Z M109.291294,105.169527 L72.8608701,126.204312 L72.8608701,252.404316 L109.291294,273.439101 L109.291294,189.304303 L145.726081,210.339088 L145.726081,168.26954 L109.291294,147.234755 L109.291294,105.169527 Z" fill="#E55B2D"> </path> <path d="M145.726081,42.0651946 L36.4304238,105.169527 L36.4304238,147.234755 L109.291294,105.169527 L109.291294,147.234755 L145.726081,126.204312 L145.726081,42.0651946 Z M255.021717,63.0999794 L218.586952,84.1347419 L218.586952,126.204312 L255.021717,105.169527 L255.021717,63.0999794 Z M182.156505,147.234755 L145.726081,168.26954 L145.726081,210.339088 L182.156505,189.304303 L182.156505,147.234755 Z M145.726081,210.339088 L109.291294,189.304303 L109.291294,273.439101 L145.726081,252.404316 L145.726081,210.339088 Z" fill="#ED8E24"> </path> <path d="M145.726081,-3.41864288e-05 L-1.98726454e-07,84.1347419 L36.4304238,105.169527 L145.726081,42.0651946 L218.586952,84.1347419 L255.021717,63.0999794 L145.726081,-3.41864288e-05 Z M145.726081,126.204312 L109.291294,147.234755 L145.726081,168.26954 L182.156505,147.234755 L145.726081,126.204312 Z" fill="#F8BF3C"> </path> </g> </g></svg>
          </li>
          <li>
           <svg width="64px" height="64px" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16.0497 8.44062C22.6378 3.32607 19.2566 0 19.2566 0C19.7598 5.28738 13.813 6.53583 12.2189 10.1692C11.1312 12.6485 12.9638 14.8193 16.0475 17.5554C15.7749 16.9494 15.3544 16.3606 14.9288 15.7645C13.4769 13.7313 11.9645 11.6132 16.0497 8.44062Z" fill="#E76F00"></path> <path d="M17.1015 18.677C17.1015 18.677 19.0835 17.0779 17.5139 15.3008C12.1931 9.27186 23.3333 6.53583 23.3333 6.53583C16.5317 9.8125 17.5471 11.7574 19.2567 14.1202C21.0871 16.6538 17.1015 18.677 17.1015 18.677Z" fill="#E76F00"></path> <path d="M22.937 23.4456C29.0423 20.3258 26.2195 17.3278 24.2492 17.7317C23.7662 17.8305 23.5509 17.9162 23.5509 17.9162C23.5509 17.9162 23.7302 17.64 24.0726 17.5204C27.9705 16.1729 30.9682 21.4949 22.8143 23.6028C22.8143 23.6029 22.9088 23.5198 22.937 23.4456Z" fill="#5382A1"></path> <path d="M10.233 19.4969C6.41312 18.9953 12.3275 17.6139 12.3275 17.6139C12.3275 17.6139 10.0307 17.4616 7.20592 18.8043C3.86577 20.3932 15.4681 21.1158 21.474 19.5625C22.0984 19.1432 22.9614 18.7798 22.9614 18.7798C22.9614 18.7798 20.5037 19.2114 18.0561 19.4145C15.0612 19.6612 11.8459 19.7093 10.233 19.4969Z" fill="#5382A1"></path> <path d="M11.6864 22.4758C9.55624 22.2592 10.951 21.2439 10.951 21.2439C5.43898 23.0429 14.0178 25.083 21.7199 22.8682C20.9012 22.5844 20.3806 22.0653 20.3806 22.0653C16.6163 22.7781 14.441 22.7553 11.6864 22.4758Z" fill="#5382A1"></path> <path d="M12.6145 25.6991C10.486 25.4585 11.7295 24.7474 11.7295 24.7474C6.72594 26.1222 14.7729 28.9625 21.1433 26.2777C20.0999 25.8787 19.3528 25.4181 19.3528 25.4181C16.5111 25.9469 15.1931 25.9884 12.6145 25.6991Z" fill="#5382A1"></path> <path d="M25.9387 27.3388C25.9387 27.3388 26.8589 28.0844 24.9252 28.6612C21.2481 29.7566 9.62093 30.0874 6.39094 28.7049C5.22984 28.2082 7.40723 27.5189 8.09215 27.3742C8.80646 27.2219 9.21466 27.2503 9.21466 27.2503C7.9234 26.3558 0.868489 29.0067 5.63111 29.7659C18.6195 31.8372 29.3077 28.8331 25.9387 27.3388Z" fill="#5382A1"></path> <path d="M28 28.9679C27.7869 31.6947 18.7877 32.2683 12.9274 31.8994C9.10432 31.6583 8.33812 31.0558 8.32691 31.047C11.9859 31.6402 18.1549 31.7482 23.1568 30.8225C27.5903 30.0016 28 28.9679 28 28.9679Z" fill="#5382A1"></path> </g></svg>
          </li>
          <li>
          <svg width="64px" height="64px" viewBox="-5 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>stackoverflow-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Icons" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Color-" transform="translate(-807.000000, -952.000000)"> <g id="stackoverflow" transform="translate(807.000000, 952.000000)"> <path d="M25.0860128,41.5922927 L5.97459514,41.6011499 L5.97294973,37.5538824 L25.0835447,37.5440929 L25.0860128,41.5922927 L25.0860128,41.5922927 Z M38,18.6708298 L34.7306912,0 L30.7087256,0.692025863 L33.9775643,19.3628557 L38,18.6708298 L38,18.6708298 Z M25.5455518,32.3547147 L6.51569942,30.616026 L6.14101644,34.6470941 L25.1712214,36.3841513 L25.5455518,32.3547147 L25.5455518,32.3547147 Z M26.8009984,27.0731519 L8.34598112,22.1539179 L7.28563299,26.0621508 L25.7419431,30.9819676 L26.8009984,27.0731519 L26.8009984,27.0731519 Z M29.2103463,22.4436411 L12.7494464,12.8164635 L10.6748215,16.3015328 L27.1365441,25.9292931 L29.2103463,22.4436411 L29.2103463,22.4436411 Z M33.2466504,19.6088756 L22.4792159,3.95170309 L19.106599,6.23184556 L29.8745036,21.8883189 L33.2466504,19.6088756 L33.2466504,19.6088756 Z" fill="#FF810F"> </path> <polygon id="stackoverflow-icon-path" fill="#BEBCBC" points="28.3315807 28.2784283 28.3315807 44.8243495 3.2648427 44.8243495 3.2648427 28.2784283 0 28.2784283 0 48 31.5799693 48 31.5799693 28.2784283"> </polygon> </g> </g> </g> </g></svg>
          </li>
          <li>
           <svg width="64px" height="64px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#EA4335" d="M10.313 5.376l1.887-1.5-.332-.414a5.935 5.935 0 00-5.586-1.217 5.89 5.89 0 00-3.978 4.084c-.03.113.312-.098.463-.056l2.608-.428s.127-.124.201-.205c1.16-1.266 3.126-1.432 4.465-.354l.272.09z"></path><path fill="#4285F4" d="M13.637 6.3a5.835 5.835 0 00-1.77-2.838l-1.83 1.82a3.226 3.226 0 011.193 2.564v.323c.9 0 1.63.725 1.63 1.62 0 .893-.73 1.619-1.63 1.619l-3.257-.003-.325.035v2.507l.325.053h3.257a4.234 4.234 0 004.08-2.962A4.199 4.199 0 0013.636 6.3z"></path><path fill="#34A853" d="M4.711 13.999H7.97v-2.594H4.71c-.232 0-.461-.066-.672-.161l-.458.14-1.313 1.297-.114.447a4.254 4.254 0 002.557.87z"></path><path fill="#FBBC05" d="M4.711 5.572A4.234 4.234 0 00.721 8.44a4.206 4.206 0 001.433 4.688l1.89-1.884a1.617 1.617 0 01.44-3.079 1.63 1.63 0 011.714.936l1.89-1.878A4.24 4.24 0 004.71 5.572z"></path></g></svg>
          </li>
          <li>
           <svg width="64px" height="64px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#2396ED" d="M12.342 4.536l.15-.227.262.159.116.083c.28.216.869.768.996 1.684.223-.04.448-.06.673-.06.534 0 .893.124 1.097.227l.105.057.068.045.191.156-.066.2a2.044 2.044 0 01-.47.73c-.29.299-.8.652-1.609.698l-.178.005h-.148c-.37.977-.867 2.078-1.702 3.066a7.081 7.081 0 01-1.74 1.488 7.941 7.941 0 01-2.549.968c-.644.125-1.298.187-1.953.185-1.45 0-2.73-.288-3.517-.792-.703-.449-1.243-1.182-1.606-2.177a8.25 8.25 0 01-.461-2.83.516.516 0 01.432-.516l.068-.005h10.54l.092-.007.149-.016c.256-.034.646-.11.92-.27-.328-.543-.421-1.178-.268-1.854a3.3 3.3 0 01.3-.81l.108-.187zM2.89 5.784l.04.007a.127.127 0 01.077.082l.006.04v1.315l-.006.041a.127.127 0 01-.078.082l-.039.006H1.478a.124.124 0 01-.117-.088l-.007-.04V5.912l.007-.04a.127.127 0 01.078-.083l.039-.006H2.89zm1.947 0l.039.007a.127.127 0 01.078.082l.006.04v1.315l-.007.041a.127.127 0 01-.078.082l-.039.006H3.424a.125.125 0 01-.117-.088L3.3 7.23V5.913a.13.13 0 01.085-.123l.039-.007h1.413zm1.976 0l.039.007a.127.127 0 01.077.082l.007.04v1.315l-.007.041a.127.127 0 01-.078.082l-.039.006H5.4a.124.124 0 01-.117-.088l-.006-.04V5.912l.006-.04a.127.127 0 01.078-.083l.039-.006h1.413zm1.952 0l.039.007a.127.127 0 01.078.082l.007.04v1.315a.13.13 0 01-.085.123l-.04.006H7.353a.124.124 0 01-.117-.088l-.006-.04V5.912l.006-.04a.127.127 0 01.078-.083l.04-.006h1.412zm1.97 0l.039.007a.127.127 0 01.078.082l.006.04v1.315a.13.13 0 01-.085.123l-.039.006H9.322a.124.124 0 01-.117-.088l-.006-.04V5.912l.006-.04a.127.127 0 01.078-.083l.04-.006h1.411zM4.835 3.892l.04.007a.127.127 0 01.077.081l.007.041v1.315a.13.13 0 01-.085.123l-.039.007H3.424a.125.125 0 01-.117-.09l-.007-.04V4.021a.13.13 0 01.085-.122l.039-.007h1.412zm1.976 0l.04.007a.127.127 0 01.077.081l.007.041v1.315a.13.13 0 01-.085.123l-.039.007H5.4a.125.125 0 01-.117-.09l-.006-.04V4.021l.006-.04a.127.127 0 01.078-.082l.039-.007h1.412zm1.953 0c.054 0 .1.037.117.088l.007.041v1.315a.13.13 0 01-.085.123l-.04.007H7.353a.125.125 0 01-.117-.09l-.006-.04V4.021l.006-.04a.127.127 0 01.078-.082l.04-.007h1.412zm0-1.892c.054 0 .1.037.117.088l.007.04v1.316a.13.13 0 01-.085.123l-.04.006H7.353a.124.124 0 01-.117-.088l-.006-.04V2.128l.006-.04a.127.127 0 01.078-.082L7.353 2h1.412z"></path></g></svg>
          </li>
        </ul>
      </div>
      <div className="caseList">
        {casesData.map((c, i) => {
          const bg = c.image ? `url(${c.image})` : GLITCH_GRADIENTS[i];
          return (
          <div className="case" key={i}>
            <div className="imageMask" data-cursor-text="Preview">
              <div className="c-glitch" style={{ backgroundImage: bg }}>
                <div className="c-glitch__img" style={{ backgroundImage: bg }} />
                <div className="c-glitch__img" style={{ backgroundImage: bg }} />
                <div className="c-glitch__img" style={{ backgroundImage: bg }} />
                <div className="c-glitch__img" style={{ backgroundImage: bg }} />
                <div className="c-glitch__img" style={{ backgroundImage: bg }} />
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
              <div className="case-btns">
                <ScrambleBtn href={c.href} text="View Project" target="_blank" />
                {c.demo && <ScrambleBtn href={c.demo} text="View Demo" target="_blank" secondary />}
              </div>
            </div>
            </div>
          );
        })}
        </div>
    </section>
  );
}

/* ─── EXPERIENCE ─── */
const EXPERIENCE = [
  { date: "2022 – 24 · BIT, Mesra", role: "Masters in Computer Applications", desc: "Develop and maintain a design system for retail investment products. Designed key mobile app areas including market view, instrument lists, favorites, and transaction history. Contributed to design operations and team processes." },
  { date: "2019 – 22 · JNU Jaipur", role: "Bachelors in Computer Applications", desc: "Delivered end-to-end fintech projects for clients, from discovery and UX to final UI, systems, and developer handoff." },
  { date: "2018 – 19 · Angels Public School, Pathankot", role: "10+2 Commerce with Computer Science", desc: "Led design work across client projects, managed a small team, and worked closely with developers." },
  { date: "2016 – 17 · Army Public School, Lucknow", role: "10th Grade", desc: "Designed complex internal systems, dashboards, and industrial interfaces. Also worked on early fintech and crypto products." },
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
          <div className="col">
            <h3 className="small">Education</h3>
            <ul className="list">
              {EXPERIENCE.map((e, i) => (
                <li key={i}>
                   <span className="date">{e.date.toUpperCase()}</span>
                   <h4>{e.role.toUpperCase()}</h4>
                  <p>{e.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="block">
          <div className="col">
            <h3 className="small">Skills</h3>
            <ul className="list">
              {SKILLS.map((s, i) => (
                <li key={i}>
                  <h4>{s.title.toUpperCase()}</h4>
                  <p>{s.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="block">
          <div className="col">
            <h3 className="small">Personal projects</h3>
            <ul className="list">
              {PROJECTS.map((p, i) => (
                <li key={i}>
                  <svg className="logo" viewBox={p.iconViewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d={p.icon} fill="white" />
                  </svg>
                  <h4>{p.name.toUpperCase()}{p.soon && <i className="soon">  soon</i>}</h4>
                  <p>{p.desc}</p>
                  {p.href && <ScrambleBtn text="View project" href={p.href} revealOnScroll target="_blank" />}
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
    el.style.setProperty("--hero-scale", "1");
    el.style.setProperty("--hero-opacity", "1");
    el.style.removeProperty("--hero-blur");

    let prevE = -1;

    const unsub = scrollYProgress.on("change", (v) => {
      const n = Math.min(Math.max(v / 0.55, 0), 1);
      const e = 1 - Math.pow(1 - n, 3);

      if (e !== prevE) {
        el.style.setProperty("--hero-scale", String(1 - e * 0.25));
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
