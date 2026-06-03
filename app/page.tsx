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
      smoothWheel: true,
      touchMultiplier: 1.5,
      gestureOrientation: "vertical",
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

  function clearTimers() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  useEffect(() => clearTimers, []);

  function scramble() {
    clearTimers();
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
    clearTimers();
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
let _boxEl: HTMLDivElement | null = null;
let _dotEl: HTMLDivElement | null = null;
let _raf = 0;
let _mouseX = -9999;
let _mouseY = -9999;
let _boxCx = -9999;
let _boxCy = -9999;
let _boxW = 28;
let _boxH = 28;
let _targetCx = -9999;
let _targetCy = -9999;
let _targetW = 28;
let _targetH = 28;
let _isHovering = false;
let _hasMoved = false;

const CURSOR_TARGET_SELECTOR = "[data-cursor-text], a, button, .hero-btn";

function getCursorTarget(target: EventTarget | null) {
  return (target as HTMLElement | null)?.closest?.(CURSOR_TARGET_SELECTOR) as HTMLElement | null;
}

function getCursorWrap(target: HTMLElement) {
  const headerLabel = target.matches(".header-nav a") ? target.querySelector("span") : null;
  const soundIcon = target.matches(".wave-mark") ? target.querySelector("svg") : null;
  const rect = (headerLabel ?? soundIcon ?? target).getBoundingClientRect();
  const padX = headerLabel ? 10 : soundIcon ? 1 : 8;
  const padY = headerLabel ? 7 : soundIcon ? 1 : 6;
  const minSize = soundIcon ? 50 : headerLabel ? 30 : 34;

  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    width: Math.max(minSize, rect.width + padX * 2),
    height: Math.max(minSize, rect.height + padY * 2),
  };
}

function updateCursorTargetBox(target: HTMLElement) {
  const wrap = getCursorWrap(target);
  _targetCx = wrap.cx;
  _targetCy = wrap.cy;
  _targetW = wrap.width;
  _targetH = wrap.height;
}

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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function cursorLoop() {
  if (!_boxEl || !_dotEl) { _raf = requestAnimationFrame(cursorLoop); return; }
  if (!_hasMoved) { _raf = requestAnimationFrame(cursorLoop); return; }

  if (_isHovering && _cursorTarget?.isConnected) {
    updateCursorTargetBox(_cursorTarget);
  }

  const dist = Math.hypot(_targetCx - _boxCx, _targetCy - _boxCy);
  const ease = _isHovering
    ? 0.08 - 0.04 * Math.min(dist / 80, 1)
    : 0.08;
  _boxCx = lerp(_boxCx, _targetCx, ease);
  _boxCy = lerp(_boxCy, _targetCy, ease);
  _boxW = lerp(_boxW, _targetW, ease);
  _boxH = lerp(_boxH, _targetH, ease);

  _boxEl.style.left = (_boxCx - _boxW / 2) + "px";
  _boxEl.style.top = (_boxCy - _boxH / 2) + "px";
  _boxEl.style.width = _boxW + "px";
  _boxEl.style.height = _boxH + "px";

  _raf = requestAnimationFrame(cursorLoop);
}

function useCursor() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    const cursorStyle = document.createElement("style");
    cursorStyle.textContent = "*,*:hover{cursor:none!important}";
    document.head.appendChild(cursorStyle);

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.style.left = "-9999px";
    dot.style.top = "-9999px";

    const box = document.createElement("div");
    box.className = "cursor-box";
    box.style.left = "-9999px";
    box.style.top = "-9999px";
    ["tl", "tr", "bl", "br"].forEach((pos) => {
      const c = document.createElement("i");
      c.className = "cursor-corner cursor-corner--" + pos;
      box.appendChild(c);
    });

    const el = document.createElement("div");
    el.className = "coursor";

    document.body.append(box, dot, el);
    _dotEl = dot;
    _boxEl = box;
    _cursorEl = el;

    _raf = requestAnimationFrame(cursorLoop);

    const onMove = (e: PointerEvent) => {
      if (!_hasMoved) {
        _boxCx = e.clientX;
        _boxCy = e.clientY;
        _targetCx = e.clientX;
        _targetCy = e.clientY;
        _hasMoved = true;
      }
      _mouseX = e.clientX;
      _mouseY = e.clientY;
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
      el.style.transform = `translate3d(${e.clientX + 18}px, ${e.clientY + 18}px, 0)`;
      if (!_isHovering) {
        _targetCx = e.clientX;
        _targetCy = e.clientY;
      }
    };
    window.addEventListener("pointermove", onMove);

    const onHover = (e: MouseEvent) => {
      const t = getCursorTarget(e.target);
      if (t && t !== _cursorTarget) {
        _cursorTarget = t;
        _isHovering = true;
        box.classList.add("is-hover");
        updateCursorTargetBox(t);
        cursorShow(t.getAttribute("data-cursor-text") || "");
      }
    };

    const onLeave = (e: MouseEvent) => {
      const t = getCursorTarget(e.target);
      if (t && t === _cursorTarget) {
        const rel = (e as MouseEvent).relatedTarget as HTMLElement | null;
        const next = getCursorTarget(rel);
        if (!next || next === t) {
          _cursorTarget = null;
          _isHovering = false;
          box.classList.remove("is-hover");
          _targetW = 28;
          _targetH = 28;
          _targetCx = _mouseX;
          _targetCy = _mouseY;
          cursorHide();
        } else {
          _cursorTarget = next;
          updateCursorTargetBox(next);
          cursorShow(next.getAttribute("data-cursor-text") || "");
        }
      }
    };

    const onPress = () => box.classList.add("is-pressed");
    const onRelease = () => box.classList.remove("is-pressed");

    document.addEventListener("mouseover", onHover, true);
    document.addEventListener("mouseout", onLeave, true);
    window.addEventListener("mousedown", onPress);
    window.addEventListener("mouseup", onRelease);

    return () => {
      cancelAnimationFrame(_raf);
      cursorStyle.remove();
      _dotEl = null;
      _boxEl = null;
      _cursorEl = null;
      _cursorTarget = null;
      _isHovering = false;
      _hasMoved = false;
      if (_cursorTimer) clearInterval(_cursorTimer);
      _cursorTimer = null;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseover", onHover, true);
      document.removeEventListener("mouseout", onLeave, true);
      window.removeEventListener("mousedown", onPress);
      window.removeEventListener("mouseup", onRelease);
      box.remove();
      dot.remove();
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
    const mutatedEls: Array<{ el: Element; html: string }> = [];

    els.forEach((el) => {
      const isContainer = el.matches(".container.vse");
      const isCaseInfo = el.matches(".caseInfo");
      const isWordSplit = el.matches("h1, h2, h3, h4, .bio, .list li p, .list li span.date, .list li h4 span, .caseInfo p, #cases .container");

        if (isContainer) {
        const tween = gsap.fromTo(el,
          { filter: "blur(4px)", opacity: 0 },
          {
            filter: "blur(0px)", opacity: 1,
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
        mutatedEls.push({ el, html: el.innerHTML });
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

    const refreshRaf = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(refreshRaf);
      anims.forEach((a) => {
        a.scrollTrigger?.kill();
        a.kill();
      });
      mutatedEls.forEach(({ el, html }) => {
        el.innerHTML = html;
      });
    };
  }, []);
}

function NavItem({ label, onEnter, isDim }: { label: string; onEnter: (label: string) => void; isDim: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [fixedW, setFixedW] = useState(0);
  const { text, scramble, reset } = useScramble(label);

  const measured = useCallback((el: HTMLSpanElement | null) => {
    if (el && !fixedW) {
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
        onEnter(label);
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
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const sounds = useHoverSounds();

  function handleEnter(label: string) {
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
      if (soundOn) {
        audioRef.current.pause();
        setSoundOn(false);
      } else {
        audioRef.current.volume = 0.4;
        void audioRef.current.play().then(() => setSoundOn(true)).catch(() => setSoundOn(false));
      }
      return;
    }

    const audio = new Audio("/Score.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    void audio.play().then(() => setSoundOn(true)).catch(() => setSoundOn(false));
  }

  return (
    <motion.header
      initial={{ y: -34, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="site-header-frame"
    >
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

      <nav className="header-nav" aria-label="Social links" onMouseLeave={() => setHoveredLabel(null)}>
        {nav.map((item) => (
          <NavItem key={item} label={item} onEnter={handleEnter} isDim={hoveredLabel !== null && hoveredLabel !== item} />
        ))}
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
  const [expanded, setExpanded] = useState(false);
  const btnRef = useRef<HTMLAnchorElement>(null);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => () => {
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
  }, []);

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
      data-expanded={expanded || undefined}
      style={sStyle}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      onClick={() => {
        scramble();
        onClick?.();
        setExpanded(true);
        if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
        expandTimerRef.current = setTimeout(() => setExpanded(false), 300);
      }}
      onTouchStart={scramble}
    >
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
           <svg width="64px" height="64px" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16.0497 8.44062C22.6378 3.32607 19.2566 0 19.2566 0C19.7598 5.28738 13.813 6.53583 12.2189 10.1692C11.1312 12.6485 12.9638 14.8193 16.0475 17.5554C15.7749 16.9494 15.3544 16.3606 14.9288 15.7645C13.4769 13.7313 11.9645 11.6132 16.0497 8.44062Z" fill="#E76F00"></path> <path d="M17.1015 18.677C17.1015 18.677 19.0835 17.0779 17.5139 15.3008C12.1931 9.27186 23.3333 6.53583 23.3333 6.53583C16.5317 9.8125 17.5471 11.7574 19.2567 14.1202C21.0871 16.6538 17.1015 18.677 17.1015 18.677Z" fill="#E76F00"></path> <path d="M22.937 23.4456C29.0423 20.3258 26.2195 17.3278 24.2492 17.7317C23.7662 17.8305 23.5509 17.9162 23.5509 17.9162C23.5509 17.9162 23.7302 17.64 24.0726 17.5204C27.9705 16.1729 30.9682 21.4949 22.8143 23.6028C22.8143 23.6029 22.9088 23.5198 22.937 23.4456Z" fill="#5382A1"></path> <path d="M10.233 19.4969C6.41312 18.9953 12.3275 17.6139 12.3275 17.6139C12.3275 17.6139 10.0307 17.4616 7.20592 18.8043C3.86577 20.3932 15.4681 21.1158 21.474 19.5625C22.0984 19.1432 22.9614 18.7798 22.9614 18.7798C22.9614 18.7798 20.5037 19.2114 18.0561 19.4145C15.0612 19.6612 11.8459 19.7093 10.233 19.4969Z" fill="#5382A1"></path> <path d="M11.6864 22.4758C9.55624 22.2592 10.951 21.2439 10.951 21.2439C5.43898 23.0429 14.0178 25.083 21.7199 22.8682C20.9012 22.5844 20.3806 22.0653 20.3806 22.0653C16.6163 22.7781 14.441 22.7553 11.6864 22.4758Z" fill="#5382A1"></path> <path d="M12.6145 25.6991C10.486 25.4585 11.7295 24.7474 11.7295 24.7474C6.72594 26.1222 14.7729 28.9625 21.1433 26.2777C20.0999 25.8787 19.3528 25.4181 19.3528 25.4181C16.5111 25.9469 15.1931 25.9884 12.6145 25.6991Z" fill="#5382A1"></path> <path d="M25.9387 27.3388C25.9387 27.3388 26.8589 28.0844 24.9252 28.6612C21.2481 29.7566 9.62093 30.0874 6.39094 28.7049C5.22984 28.2082 7.40723 27.5189 8.09215 27.3742C8.80646 27.2219 9.21466 27.2503 9.21466 27.2503C7.9234 26.3558 0.868489 29.0067 5.63111 29.7659C18.6195 31.8372 29.3077 28.8331 25.9387 27.3388Z" fill="#5382A1"></path> <path d="M28 28.9679C27.7869 31.6947 18.7877 32.2683 12.9274 31.8994C9.10432 31.6583 8.33812 31.0558 8.32691 31.047C11.9859 31.6402 18.1549 31.7482 23.1568 30.8225C27.5903 30.0016 28 28.9679 28 28.9679Z" fill="#5382A1"></path> </g></svg>
          </li>
          <li>
          <svg width="64px" height="64px" viewBox="-5 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>stackoverflow-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Icons" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Color-" transform="translate(-807.000000, -952.000000)"> <g id="stackoverflow" transform="translate(807.000000, 952.000000)"> <path d="M25.0860128,41.5922927 L5.97459514,41.6011499 L5.97294973,37.5538824 L25.0835447,37.5440929 L25.0860128,41.5922927 L25.0860128,41.5922927 Z M38,18.6708298 L34.7306912,0 L30.7087256,0.692025863 L33.9775643,19.3628557 L38,18.6708298 L38,18.6708298 Z M25.5455518,32.3547147 L6.51569942,30.616026 L6.14101644,34.6470941 L25.1712214,36.3841513 L25.5455518,32.3547147 L25.5455518,32.3547147 Z M26.8009984,27.0731519 L8.34598112,22.1539179 L7.28563299,26.0621508 L25.7419431,30.9819676 L26.8009984,27.0731519 L26.8009984,27.0731519 Z M29.2103463,22.4436411 L12.7494464,12.8164635 L10.6748215,16.3015328 L27.1365441,25.9292931 L29.2103463,22.4436411 L29.2103463,22.4436411 Z M33.2466504,19.6088756 L22.4792159,3.95170309 L19.106599,6.23184556 L29.8745036,21.8883189 L33.2466504,19.6088756 L33.2466504,19.6088756 Z" fill="#FF810F"> </path> <polygon id="stackoverflow-icon-path" fill="#BEBCBC" points="28.3315807 28.2784283 28.3315807 44.8243495 3.2648427 44.8243495 3.2648427 28.2784283 0 28.2784283 0 48 31.5799693 48 31.5799693 28.2784283"> </polygon> </g> </g> </g> </g></svg>
          </li>
          <li>
           <svg width="64px" height="64px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#EA4335" d="M10.313 5.376l1.887-1.5-.332-.414a5.935 5.935 0 00-5.586-1.217 5.89 5.89 0 00-3.978 4.084c-.03.113.312-.098.463-.056l2.608-.428s.127-.124.201-.205c1.16-1.266 3.126-1.432 4.465-.354l.272.09z"></path><path fill="#4285F4" d="M13.637 6.3a5.835 5.835 0 00-1.77-2.838l-1.83 1.82a3.226 3.226 0 011.193 2.564v.323c.9 0 1.63.725 1.63 1.62 0 .893-.73 1.619-1.63 1.619l-3.257-.003-.325.035v2.507l.325.053h3.257a4.234 4.234 0 004.08-2.962A4.199 4.199 0 0013.636 6.3z"></path><path fill="#34A853" d="M4.711 13.999H7.97v-2.594H4.71c-.232 0-.461-.066-.672-.161l-.458.14-1.313 1.297-.114.447a4.254 4.254 0 002.557.87z"></path><path fill="#FBBC05" d="M4.711 5.572A4.234 4.234 0 00.721 8.44a4.206 4.206 0 001.433 4.688l1.89-1.884a1.617 1.617 0 01.44-3.079 1.63 1.63 0 011.714.936l1.89-1.878A4.24 4.24 0 004.71 5.572z"></path></g></svg>
          </li>
          <li>
           <svg width="64px" height="64px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#2396ED" d="M12.342 4.536l.15-.227.262.159.116.083c.28.216.869.768.996 1.684.223-.04.448-.06.673-.06.534 0 .893.124 1.097.227l.105.057.068.045.191.156-.066.2a2.044 2.044 0 01-.47.73c-.29.299-.8.652-1.609.698l-.178.005h-.148c-.37.977-.867 2.078-1.702 3.066a7.081 7.081 0 01-1.74 1.488 7.941 7.941 0 01-2.549.968c-.644.125-1.298.187-1.953.185-1.45 0-2.73-.288-3.517-.792-.703-.449-1.243-1.182-1.606-2.177a8.25 8.25 0 01-.461-2.83.516.516 0 01.432-.516l.068-.005h10.54l.092-.007.149-.016c.256-.034.646-.11.92-.27-.328-.543-.421-1.178-.268-1.854a3.3 3.3 0 01.3-.81l.108-.187zM2.89 5.784l.04.007a.127.127 0 01.077.082l.006.04v1.315l-.006.041a.127.127 0 01-.078.082l-.039.006H1.478a.124.124 0 01-.117-.088l-.007-.04V5.912l.007-.04a.127.127 0 01.078-.083l.039-.006H2.89zm1.947 0l.039.007a.127.127 0 01.078.082l.006.04v1.315l-.007.041a.127.127 0 01-.078.082l-.039.006H3.424a.125.125 0 01-.117-.088L3.3 7.23V5.913a.13.13 0 01.085-.123l.039-.007h1.413zm1.976 0l.039.007a.127.127 0 01.077.082l.007.04v1.315l-.007.041a.127.127 0 01-.078.082l-.039.006H5.4a.124.124 0 01-.117-.088l-.006-.04V5.912l.006-.04a.127.127 0 01.078-.083l.039-.006h1.413zm1.952 0l.039.007a.127.127 0 01.078.082l.007.04v1.315a.13.13 0 01-.085.123l-.04.006H7.353a.124.124 0 01-.117-.088l-.006-.04V5.912l.006-.04a.127.127 0 01.078-.083l.04-.006h1.412zm1.97 0l.039.007a.127.127 0 01.078.082l.006.04v1.315a.13.13 0 01-.085.123l-.039.006H9.322a.124.124 0 01-.117-.088l-.006-.04V5.912l.006-.04a.127.127 0 01.078-.083l.04-.006h1.411zM4.835 3.892l.04.007a.127.127 0 01.077.081l.007.041v1.315a.13.13 0 01-.085.123l-.039.007H3.424a.125.125 0 01-.117-.09l-.007-.04V4.021a.13.13 0 01.085-.122l.039-.007h1.412zm1.976 0l.04.007a.127.127 0 01.077.081l.007.041v1.315a.13.13 0 01-.085.123l-.039.007H5.4a.125.125 0 01-.117-.09l-.006-.04V4.021l.006-.04a.127.127 0 01.078-.082l.039-.007h1.412zm1.953 0c.054 0 .1.037.117.088l.007.04v1.316a.13.13 0 01-.085.123l-.04.006H7.353a.124.124 0 01-.117-.088l-.006-.04V2.128l.006-.04a.127.127 0 01.078-.082L7.353 2h1.412z"></path></g></svg>
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
  { date: "2022 – 24 · BIT, Mesra", role: "Masters in Computer Applications", desc: "Advancing knowledge in software engineering, full-stack development, system design, databases, and modern technologies. Demonstrating strong enthusiasm toward Machine Learning and Artificial Intelligence while building practical projects, exploring AI-driven solutions, API-based applications, and scalable software systems." },
  { date: "2019 – 22 · JNU Jaipur", role: "Bachelors in Computer Applications", desc: "Gained practical experience in programming, software development, web technologies, databases, and API-based applications. Reached finalist level in the Smart India Hackathon and participated in other inter-college hackathons, strengthening teamwork, innovation, and problem-solving skills." },
  { date: "2018 – 19 · APS, Pathankot", role: "10+2 Commerce with Computer Science", desc: "Learned programming concepts, coding tools, Android development, API integration, and application development while exploring various technologies, improving problem-solving, technical skills, software understanding, and practical development experience." },
  { date: "2016 – 17 · APS, Lucknow", role: "10th Grade", desc: "During 10th standard, participated in school-level gaming, webpage design, and software review competitions. Volunteered in the Google Web Rangers workshop, gaining technical, creative, teamwork, and digital awareness experience." }
];

const SKILLS = [
  { title: "Frontend", desc: "React, Next.js, TypeScript, Tailwind CSS, Framer Motion, GSAP for building modern, responsive, and interactive user interfaces." },
  { title: "Backend", desc: "Node.js, Express, REST APIs, GraphQL, middleware development, and server-side architecture design." },
  { title: "Databases", desc: "PostgreSQL, MongoDB, Firebase, and data modeling for scalable and efficient data storage." },
  { title: "Full Stack Frameworks", desc: "Next.js for full-stack development, enabling seamless client-server integration and rapid deployment." },
  { title: "DevOps & Cloud", desc: "Docker containerization, CI/CD pipelines, AWS services, deployment automation, and infrastructure management." },
  { title: "Version Control", desc: "Git, GitHub, branching strategies, and collaborative development workflows." },
  { title: "API Development", desc: "RESTful API design, authentication (JWT), error handling, and API documentation." },
  { title: "Testing & Quality", desc: "Unit testing, integration testing, debugging, and code optimization for production-ready applications." }
];

const PROJECTS = [
  {
    icon: "M373.7 709.3h-50.4V358.5h50.4v350.8zm74-350.8h136.2c129.7 0 186.7 92.7 186.7 175.5 0 90.1-70.4 175.5-186 175.5H447.7v-351zm50.4 305.6h80.2c114.3 0 140.5-86.8 140.5-130 0-70.4-44.9-130-143.1-130h-77.6v260zM381.6 285.5c0 18-14.7 33.1-33.1 33.1-18.3 0-33.1-15.1-33.1-33.1 0-18.3 14.7-33.1 33.1-33.1 18.3 0 33.1 15.1 33.1 33.1z",
    circleColor: "#8eda14bd",
    pathColor: "#ffffff",
    iconViewBox: "0 0 1024 1024",
    name: "ORCiD",
    desc: "A unique identifier for researchers and scholars, providing a persistent digital identity that distinguishes them from others and connects their work across platforms.",
    href: "https://orcid.org/0009-0001-2050-7066",
  },
  {
    iconViewBox: "0 0 32 32",
    rawSvgInner: '<path d="M2.56967 20.0269C4.30041 25.7964 9.65423 30 15.9906 30C23.7274 30 29.9995 23.7318 29.9995 16C29.9995 8.26803 23.7274 2 15.9906 2C8.56634 2 2.49151 7.77172 2.01172 15.0699C2.01172 17.1667 2.01172 18.0417 2.56967 20.0269Z" fill="url(#paint0_linear_87_8314)"></path> <path d="M15.2706 12.5629L11.8426 17.5395C11.0345 17.5028 10.221 17.7314 9.54572 18.1752L2.01829 15.0784C2.01829 15.0784 1.84411 17.9421 2.56999 20.0763L7.89147 22.2707C8.15866 23.464 8.97779 24.5107 10.1863 25.0142C12.1635 25.8398 14.4433 24.8988 15.2658 22.922C15.4799 22.4052 15.5797 21.8633 15.5652 21.3225L20.5904 17.8219C23.5257 17.8219 25.9114 15.4305 25.9114 12.4937C25.9114 9.55673 23.5257 7.16748 20.5904 7.16748C17.7553 7.16748 15.1117 9.64126 15.2706 12.5629ZM14.4469 22.5783C13.8103 24.1057 12.054 24.8303 10.5273 24.1946C9.82302 23.9014 9.29128 23.3642 8.98452 22.7237L10.7167 23.4411C11.8426 23.9098 13.1343 23.3762 13.6023 22.2514C14.0718 21.1254 13.5392 19.8324 12.4139 19.3637L10.6233 18.6222C11.3142 18.3603 12.0997 18.3507 12.8336 18.6559C13.5734 18.9635 14.1475 19.5428 14.4517 20.283C14.756 21.0233 14.7548 21.8404 14.4469 22.5783ZM20.5904 16.0434C18.6364 16.0434 17.0455 14.4511 17.0455 12.4937C17.0455 10.5379 18.6364 8.94518 20.5904 8.94518C22.5457 8.94518 24.1365 10.5379 24.1365 12.4937C24.1365 14.4511 22.5457 16.0434 20.5904 16.0434ZM17.9341 12.4883C17.9341 11.0159 19.127 9.82159 20.5964 9.82159C22.0671 9.82159 23.2599 11.0159 23.2599 12.4883C23.2599 13.9609 22.0671 15.1541 20.5964 15.1541C19.127 15.1541 17.9341 13.9609 17.9341 12.4883Z" fill="white"></path> <defs> <linearGradient id="paint0_linear_87_8314" x1="16.0056" y1="2" x2="16.0056" y2="30" gradientUnits="userSpaceOnUse"> <stop stop-color="#111D2E"></stop> <stop offset="0.21248" stop-color="#051839"></stop> <stop offset="0.40695" stop-color="#0A1B48"></stop> <stop offset="0.5811" stop-color="#132E62"></stop> <stop offset="0.7376" stop-color="#144B7E"></stop> <stop offset="0.87279" stop-color="#136497"></stop> <stop offset="1" stop-color="#1387B8"></stop> </linearGradient> </defs>',
    name: "Steam ",
    desc: "Building and publishing indie games on Steam for a global audience. Focused on storytelling, gameplay, and player experience.",
    soon: true,
  },
  {
    rawSvgInner: '<g> <path style="fill:#32BBFF;" d="M382.369,175.623C322.891,142.356,227.427,88.937,79.355,6.028 C69.372-0.565,57.886-1.429,47.962,1.93l254.05,254.05L382.369,175.623z"></path> <path style="fill:#32BBFF;" d="M47.962,1.93c-1.86,0.63-3.67,1.39-5.401,2.308C31.602,10.166,23.549,21.573,23.549,36v439.96 c0,14.427,8.052,25.834,19.012,31.761c1.728,0.917,3.537,1.68,5.395,2.314L302.012,255.98L47.962,1.93z"></path> <path style="fill:#32BBFF;" d="M302.012,255.98L47.956,510.035c9.927,3.384,21.413,2.586,31.399-4.103 c143.598-80.41,237.986-133.196,298.152-166.746c1.675-0.941,3.316-1.861,4.938-2.772L302.012,255.98z"></path> <path style="fill:#2C9FD9;" d="M23.549,255.98v219.98c0,14.427,8.052,25.834,19.012,31.761c1.728,0.917,3.537,1.68,5.395,2.314 L302.012,255.98H23.549z"></path> <path style="fill:#29CC5E;" d="M79.355,6.028C67.5-1.8,53.52-1.577,42.561,4.239l255.595,255.596l84.212-84.212 C322.891,142.356,227.427,88.937,79.355,6.028z"></path> <path style="fill:#D93F21;" d="M298.158,252.126L42.561,507.721c10.96,5.815,24.939,6.151,36.794-1.789 c143.598-80.41,237.986-133.196,298.152-166.746c1.675-0.941,3.316-1.861,4.938-2.772L298.158,252.126z"></path> <path style="fill:#FFD500;" d="M488.45,255.98c0-12.19-6.151-24.492-18.342-31.314c0,0-22.799-12.721-92.682-51.809l-83.123,83.123 l83.204,83.205c69.116-38.807,92.6-51.892,92.6-51.892C482.299,280.472,488.45,268.17,488.45,255.98z"></path> <path style="fill:#FFAA00;" d="M470.108,287.294c12.191-6.822,18.342-19.124,18.342-31.314H294.303l83.204,83.205 C446.624,300.379,470.108,287.294,470.108,287.294z"></path> </g>',
    iconViewBox: "0 0 512 512",
    name: "PlayStore",
    desc: "Android applications published on Google Play, showcasing mobile development and UI/UX design skills.",
    soon: true,
  }
];

function LastBlocks() {
  return (
    <section className="section lalalast" id="exp">
      <div className="container last">
        <div className="block">
          <div className="col">
            <h3 className="small">Education & Experience</h3>
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
            <h3 className="small">Languages & Technologies</h3>
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
            <h3 className="small">Projects and Publications</h3>

            <ul className="list">
              {PROJECTS.map((p, i) => (
                <li key={i}>
                  {p.rawSvgInner ? (
                    <svg className="logo" viewBox={p.iconViewBox} fill="none" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: p.rawSvgInner }} />
                  ) : (
                    <svg className="logo" viewBox={p.iconViewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
                      {p.bgRect ? (
                        <rect width="100%" height="100%" rx={p.bgRect.rx || 0} fill={p.bgRect.fill || "#ffffff"} />
                      ) : p.circleColor ? (
                        <circle cx="512" cy="512" r="512" fill={p.circleColor} />
                      ) : null}
                      <path d={p.icon} fill={p.pathColor || "white"} transform={p.pathTransform || ""} />
                    </svg>
                  )}
                  <h4>{p.name.toUpperCase()}{p.soon && <i className="soon">  soon</i>}</h4>
                  <p>{p.desc}</p>
                  {p.href && <ScrambleBtn text="View Publication" href={p.href} revealOnScroll target="_blank" />}
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
        // Hide hero when opacity drops below 0.95 (e > 0.95)
        el.style.display = e > 0.95 ? "none" : "";
        prevE = e;
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
      <div className="edge-blur__top" aria-hidden="true" />
      <div className="edge-blur__bottom" aria-hidden="true" />
      <div className="noise" />
      <Nav />
      <div className="frame-screen">
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
          <svg viewBox="0 -700 14716 2224" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gold-hover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#B78628"/>
                <stop offset="25%" stopColor="#C69320"/>
                <stop offset="50%" stopColor="#DBA514"/>
                <stop offset="75%" stopColor="#FCC201"/>
                <stop offset="100%" stopColor="#D4AF37"/>
              </linearGradient>
            </defs>
            <g transform="translate(-157, 1485)" fill="white">
              <path d="M182 14L182-489Q279-425 386-369.50Q493-314 607.50-273Q722-232 842.50-208.50Q963-185 1088-185Q1136-185 1180.50-191Q1225-197 1258.50-210.50Q1292-224 1312.50-246.50Q1333-269 1333-301Q1333-330 1316-359.50Q1299-389 1250.50-416Q1202-443 1115-466.50Q1028-490 889-508Q703-532 566-570Q429-608 339-667Q249-726 205-809Q161-892 161-1006Q161-1115 210.50-1201.50Q260-1288 353-1348Q446-1408 579-1440Q712-1472 879-1472Q948-1472 1018-1464.50Q1088-1457 1156-1444Q1224-1431 1289-1413.50Q1354-1396 1411-1377L1607-1485L1744-1485L1744-1005Q1637-1068 1528.50-1116Q1420-1164 1313.50-1196.50Q1207-1229 1105.50-1245.50Q1004-1262 912-1262Q852-1262 803.50-1253Q755-1244 721.50-1229Q688-1214 670-1193.50Q652-1173 652-1150Q652-1117 670-1090.50Q688-1064 740-1041Q792-1018 886-996.50Q980-975 1132-950Q1233-933 1325-914Q1417-895 1496-868.50Q1575-842 1638.50-805Q1702-768 1747-716Q1792-664 1816.50-594Q1841-524 1841-431Q1841-307 1781-218Q1721-129 1619-72Q1517-15 1381.50 12Q1246 39 1096 39Q956 39 813 9.50Q670-20 539-86L379 14"/>
              <path d="M1884 0L2178-251L2649-1189L2434-1434L3606-1434L3425-1180L3847-253L4110 0L3060 0L3278-251L3235-356L2575-356L2528-251L2815 0L1884 0M2669-565L3151-565L2922-1129"/>
              <path d="M4100 0L4411-254L4411-1180L4101-1434Q4195-1435 4296-1436Q4397-1437 4497-1437.50Q4597-1438 4692-1439Q4787-1440 4870.50-1440.50Q4954-1441 5022-1441Q5090-1441 5135-1441Q5230-1441 5334-1437Q5438-1433 5538.50-1419.50Q5639-1406 5729.50-1379.50Q5820-1353 5888.50-1308.50Q5957-1264 5997.50-1198.50Q6038-1133 6038-1041Q6038-971 6013-915Q5988-859 5941.50-815Q5895-771 5829-738Q5763-705 5682-681Q5745-672 5800.50-638.50Q5856-605 5897-554Q5938-503 5961.50-436Q5985-369 5985-292L5985-234L6266 0L5282 0L5434-213L5434-336Q5434-388 5419-431.50Q5404-475 5378-506.50Q5352-538 5317.50-555.50Q5283-573 5245-573L4938-573L4938-254L5119 0L4100 0M4938-769L5084-769Q5189-769 5267-778Q5345-787 5396.50-812Q5448-837 5473-881Q5498-925 5498-994Q5498-1047 5480-1085Q5462-1123 5431-1148.50Q5400-1174 5358.50-1189.50Q5317-1205 5271-1212.50Q5225-1220 5177-1222.50Q5129-1225 5084-1225L4938-1225"/>
              <g transform="translate(7045, 0) scale(1.5) translate(-7045, 0)">
                <path d="M7035 0L6541-1181L6214-1434L7243-1434L7087-1212L7396-413L7649-1204L7483-1434L8293-1434L7995-1201L7534 0"/>
              </g>
              <g transform="translate(546, 0)">
                <path d="M8265 0L8546-254L8546-1180L8265-1434L10082-1434L10062-938L9663-1205L9073-1205L9073-874L9675-874L9675-654L9073-654L9073-229L9663-229L10072-473L10072 0"/>
                <path d="M10389 14L10389-489Q10486-425 10593-369.50Q10700-314 10814.50-273Q10929-232 11049.50-208.50Q11170-185 11295-185Q11343-185 11387.50-191Q11432-197 11465.50-210.50Q11499-224 11519.50-246.50Q11540-269 11540-301Q11540-330 11523-359.50Q11506-389 11457.50-416Q11409-443 11322-466.50Q11235-490 11096-508Q10910-532 10773-570Q10636-608 10546-667Q10456-726 10412-809Q10368-892 10368-1006Q10368-1115 10417.50-1201.50Q10467-1288 10560-1348Q10653-1408 10786-1440Q10919-1472 11086-1472Q11155-1472 11225-1464.50Q11295-1457 11363-1444Q11431-1431 11496-1413.50Q11561-1396 11618-1377L11814-1485L11951-1485L11951-1005Q11844-1068 11735.50-1116Q11627-1164 11520.50-1196.50Q11414-1229 11312.50-1245.50Q11211-1262 11119-1262Q11059-1262 11010.50-1253Q10962-1244 10928.50-1229Q10895-1214 10877-1193.50Q10859-1173 10859-1150Q10859-1117 10877-1090.50Q10895-1064 10947-1041Q10999-1018 11093-996.50Q11187-975 11339-950Q11440-933 11532-914Q11624-895 11703-868.50Q11782-842 11845.50-805Q11909-768 11954-716Q11999-664 12023.50-594Q12048-524 12048-431Q12048-307 11988-218Q11928-129 11826-72Q11724-15 11588.50 12Q11453 39 11303 39Q11163 39 11020 9.50Q10877-20 10746-86L10586 14"/>
                <path d="M12181 0L12462-254L12462-1181L12181-1434L12979-1434L12979-886L13529-886L13529-1434L14308-1434L14046-1180L14046-254L14327 0L13529 0L13529-677L12979-677L12979 0"/>
              </g>
            </g>
          </svg>
        </div>  
      </div>
    </>
  );
}
