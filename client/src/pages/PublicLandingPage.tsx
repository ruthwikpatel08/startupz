import React, { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Rocket,
  Lightbulb,
  UserCheck,
  Search,
  Zap,
  Sparkles,
  Code2,
  Palette,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import logoIcon from '../assets/logo-icon.png';

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES  — Strictly scoped under .hlp-root
   Zero leakage to /login, /register, or any other route.
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
/* ── Root ── */
.hlp-root {
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  font-family: 'Inter', system-ui, sans-serif;
  background: #FFFFFF;
  color: #101426;
  position: relative;
}

/* ── Cursor spotlight (subtle, diffuse ambient violet — no white hotspot) ── */
.hlp-root .hlp-spotlight {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: radial-gradient(
    520px circle at var(--cx, 50%) var(--cy, 50%),
    rgba(118, 85, 217, 0.035) 0%,
    transparent 65%
  );
}
.hlp-root .hlp-spotlight.hlp-visible {
  opacity: 1;
}

/* ── Nav ── */
.hlp-root .hlp-nav {
  position: sticky;
  top: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(16px, 4vw, 56px);
  height: 62px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid #E7E8EF;
}
.hlp-root .hlp-nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.hlp-root .hlp-nav-logo img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.hlp-root .hlp-nav-logo-text {
  font-weight: 900;
  font-size: 20px;
  letter-spacing: -0.5px;
  color: #101426;
}
.hlp-root .hlp-nav-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.hlp-root .hlp-btn-ghost {
  padding: 7px 18px;
  border-radius: 9px;
  border: 1px solid #E7E8EF;
  color: #101426;
  font-weight: 600;
  font-size: 13.5px;
  text-decoration: none;
  background: transparent;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.12s ease;
  white-space: nowrap;
  display: inline-block;
}
.hlp-root .hlp-btn-ghost:hover {
  border-color: #7655D9;
  background: #EDE8FA;
  color: #7655D9;
  transform: translateY(-1px);
}
.hlp-root .hlp-btn-ghost:active {
  transform: translateY(0px) scale(0.985);
}
.hlp-root .hlp-nav-cta {
  padding: 7px 20px;
  border-radius: 9px;
  background: #7655D9;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 13.5px;
  text-decoration: none;
  box-shadow: 0 2px 10px rgba(118, 85, 217, 0.25);
  transition: box-shadow 0.16s ease, transform 0.12s ease, background 0.16s ease;
  white-space: nowrap;
  display: inline-block;
}
.hlp-root .hlp-nav-cta:hover {
  background: #6a49ce;
  box-shadow: 0 4px 16px rgba(118, 85, 217, 0.35);
  transform: translateY(-1px);
}
.hlp-root .hlp-nav-cta:active {
  transform: translateY(0px) scale(0.985);
}

/* ── Hero: Deep midnight navy (#101426) — no large purple blobs ── */
.hlp-root .hlp-hero-wrap {
  position: relative;
  overflow: hidden;
  background: radial-gradient(85% 85% at 50% 20%, #151a32 0%, #101426 100%);
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 10vw, 140px) clamp(20px, 5vw, 48px) clamp(80px, 10vw, 120px);
}

/* Subtle dark grid overlay */
.hlp-root .hlp-hero-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* ── Hero inner container ── */
.hlp-root .hlp-hero-inner {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 840px;
  margin: 0 auto;
}

.hlp-root .hlp-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(118, 85, 217, 0.15);
  color: #EDE8FA;
  border: 1px solid rgba(118, 85, 217, 0.35);
  border-radius: 50px;
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 28px;
  text-transform: uppercase;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
  user-select: none;
}
.hlp-root .hlp-hero-badge:hover {
  transform: translateY(-1px);
  border-color: rgba(118, 85, 217, 0.6);
  background: rgba(118, 85, 217, 0.22);
}
.hlp-root .hlp-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7655D9;
  flex-shrink: 0;
}

/* ── Headline: completely stationary container, individual 3D words without white glare ── */
.hlp-root .hlp-h1 {
  font-size: clamp(40px, 7.5vw, 80px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -2.5px;
  color: #FFFFFF;
  margin-bottom: 22px;
  position: relative;
  transform: none !important;
}

.hlp-root .hlp-h1-line {
  display: inline-block;
  white-space: normal;
}

/* Individual 3D word pop-out */
.hlp-root .hlp-word {
  display: inline-block;
  margin-right: 0.28em;
  cursor: default;
  position: relative;
  transform-style: preserve-3d;
  will-change: transform, filter;
  transition: transform 180ms cubic-bezier(0.25, 1, 0.5, 1),
              filter 180ms ease;
  transform-origin: center center;
}
.hlp-root .hlp-word:last-child {
  margin-right: 0;
}

/* Line 1 word depth (restrained, no white specular shine) */
.hlp-root .hlp-word:hover,
.hlp-root .hlp-word:focus-visible {
  filter: drop-shadow(0 6px 14px rgba(118, 85, 217, 0.35))
          drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
}
.hlp-root .hlp-word:focus-visible {
  outline: none;
}

/* Line 2 gradient word styling */
.hlp-root .hlp-word-gradient {
  background: linear-gradient(90deg, #9b7ff5 0%, #7655D9 50%, #6875F5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hlp-root .hlp-word-gradient:hover,
.hlp-root .hlp-word-gradient:focus-visible {
  filter: drop-shadow(0 6px 16px rgba(118, 85, 217, 0.45))
          drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}

.hlp-root .hlp-hero-sub {
  font-size: clamp(15px, 2vw, 19px);
  color: rgba(237, 232, 250, 0.78);
  line-height: 1.65;
  max-width: 520px;
  margin: 0 auto 40px;
  font-weight: 500;
}
.hlp-root .hlp-hero-cta {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Primary CTA — clean gradient without harsh white diagonal sweep */
.hlp-root .hlp-cta-main {
  position: relative;
  overflow: hidden;
  padding: 15px 36px;
  border-radius: 12px;
  background: #7655D9;
  color: #FFFFFF;
  font-weight: 800;
  font-size: 15.5px;
  text-decoration: none;
  box-shadow: 0 6px 20px rgba(118, 85, 217, 0.32);
  transition: box-shadow 0.16s ease, transform 0.14s ease, background 0.16s ease;
  display: inline-block;
}
.hlp-root .hlp-cta-main:hover {
  background: #6a49ce;
  box-shadow: 0 8px 26px rgba(118, 85, 217, 0.42);
  transform: translateY(-2px);
}
.hlp-root .hlp-cta-main:active {
  transform: translateY(0px) scale(0.985);
}

.hlp-root .hlp-cta-sec {
  padding: 15px 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  font-weight: 600;
  font-size: 15.5px;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.14s ease;
  display: inline-block;
}
.hlp-root .hlp-cta-sec:hover {
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}
.hlp-root .hlp-cta-sec:active {
  transform: translateY(0px) scale(0.985);
}

/* ── Floating hero cards ── */
.hlp-root .hlp-float-cards {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 860px;
  margin: 52px auto 0;
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}
.hlp-root .hlp-fcard {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 18px 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  width: 210px;
  text-align: left;
  transform-style: preserve-3d;
  will-change: transform, box-shadow, border-color;
  cursor: default;
  overflow: hidden;
}

.hlp-root .hlp-fcard-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(118, 85, 217, 0.2);
  border: 1px solid rgba(118, 85, 217, 0.35);
  color: #EDE8FA;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transform-style: preserve-3d;
}
.hlp-root .hlp-fcard-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(237, 232, 250, 0.7);
  margin-bottom: 4px;
}
.hlp-root .hlp-fcard-title {
  font-size: 14px;
  font-weight: 800;
  color: #FFFFFF;
  margin-bottom: 4px;
}
.hlp-root .hlp-fcard-sub {
  font-size: 11.5px;
  color: rgba(237, 232, 250, 0.6);
  line-height: 1.4;
}
.hlp-root .hlp-fcard-tag {
  display: inline-block;
  margin-top: 10px;
  padding: 3px 10px;
  border-radius: 50px;
  background: rgba(118, 85, 217, 0.2);
  border: 1px solid rgba(118, 85, 217, 0.3);
  color: #EDE8FA;
  font-size: 10.5px;
  font-weight: 700;
  transition: transform 0.14s ease;
}

/* ── Social Proof Strip: Clean neutral white, soft border ── */
.hlp-root .hlp-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 3vw, 48px);
  flex-wrap: wrap;
  padding: 24px clamp(20px, 5vw, 48px);
  border-bottom: 1px solid #E7E8EF;
  background: #FFFFFF;
}
.hlp-root .hlp-stat {
  text-align: center;
  padding: 6px 14px;
  border-radius: 10px;
  transition: transform 0.14s ease;
}
.hlp-root .hlp-stat:hover {
  transform: translateY(-2px);
}
.hlp-root .hlp-stat-n {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.6px;
  color: #101426;
}
.hlp-root .hlp-stat-l {
  font-size: 11.5px;
  color: #64748b;
  font-weight: 600;
  margin-top: 2px;
}

/* ── Sections ── */
.hlp-root .hlp-section {
  padding: clamp(60px, 8vw, 100px) clamp(20px, 5vw, 48px);
  background: #FFFFFF;
}
.hlp-root .hlp-section-inner {
  max-width: 980px;
  margin: 0 auto;
}
/* Alternate section: Very light neutral grey (#F7F8FA) — zero purple haze */
.hlp-root .hlp-section.hlp-alt-bg {
  background: #F7F8FA;
  border-top: 1px solid #E7E8EF;
  border-bottom: 1px solid #E7E8EF;
}

.hlp-root .hlp-label {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7655D9;
  margin-bottom: 10px;
}
.hlp-root .hlp-section-title {
  text-align: center;
  font-size: clamp(26px, 4.5vw, 40px);
  font-weight: 900;
  color: #101426;
  letter-spacing: -1px;
  margin-bottom: 12px;
}
.hlp-root .hlp-section-desc {
  text-align: center;
  font-size: 15px;
  color: #64748b;
  max-width: 520px;
  margin: 0 auto 52px;
  line-height: 1.65;
  font-weight: 500;
}

/* ── Feature cards grid (under "Everything students need to connect & build") ── */
.hlp-root .hlp-grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 20px;
}
.hlp-root .hlp-card {
  position: relative;
  background: #FFFFFF;
  border: 1px solid #E7E8EF;
  border-radius: 18px;
  padding: 30px 26px;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03);
  transform-style: preserve-3d;
  will-change: transform, box-shadow, border-color;
  overflow: hidden;
  cursor: default;
}

/* Feature icon badge */
.hlp-root .hlp-card-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  background: #EDE8FA;
  border: 1px solid rgba(118, 85, 217, 0.15);
  color: #7655D9;
  transform-style: preserve-3d;
}
.hlp-root .hlp-card-title {
  font-size: 15px;
  font-weight: 800;
  color: #101426;
  margin-bottom: 8px;
}
.hlp-root .hlp-card-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  font-weight: 500;
}

/* ── How it works steps (under "Up and running in minutes") ── */
.hlp-root .hlp-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 20px;
}
.hlp-root .hlp-step {
  position: relative;
  background: #FFFFFF;
  border: 1px solid #E7E8EF;
  border-radius: 18px;
  padding: 28px 24px;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05);
  transform-style: preserve-3d;
  will-change: transform, box-shadow, border-color;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
}

.hlp-root .hlp-step-num {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #7655D9;
  margin-bottom: 14px;
  text-transform: uppercase;
}
.hlp-root .hlp-step-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: #EDE8FA;
  border: 1px solid rgba(118, 85, 217, 0.15);
  color: #7655D9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  transform-style: preserve-3d;
}
.hlp-root .hlp-step-title {
  display: flex;
  align-items: center;
  font-size: 14.5px;
  font-weight: 800;
  color: #101426;
  margin-bottom: 7px;
}
.hlp-root .hlp-step-arrow {
  margin-left: 6px;
  color: #7655D9;
  transition: transform 0.14s ease;
  flex-shrink: 0;
}
.hlp-root .hlp-step:hover .hlp-step-arrow {
  transform: translateX(4px);
}
.hlp-root .hlp-step-desc {
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.58;
  font-weight: 500;
}

/* ── Quotes (Testimonials) ── */
.hlp-root .hlp-quotes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 18px;
}
.hlp-root .hlp-quote {
  position: relative;
  background: #FFFFFF;
  border: 1px solid #E7E8EF;
  border-radius: 18px;
  padding: 26px 24px;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
  overflow: hidden;
  transform-style: preserve-3d;
  will-change: transform, box-shadow, border-color;
}
.hlp-root .hlp-quote-mark {
  font-size: 38px;
  line-height: 1;
  color: #EDE8FA;
  font-weight: 900;
  margin-bottom: 10px;
  user-select: none;
}
.hlp-root .hlp-quote-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.65;
  font-weight: 500;
  margin-bottom: 18px;
  font-style: italic;
}
.hlp-root .hlp-quote-author {
  font-size: 13px;
  font-weight: 800;
  color: #101426;
}
.hlp-root .hlp-quote-role {
  font-size: 11.5px;
  color: #94A3B8;
  font-weight: 500;
  margin-top: 2px;
}

/* ── Footer CTA: Midnight navy without purple haze ── */
.hlp-root .hlp-footer-cta {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: clamp(64px, 9vw, 108px) clamp(20px, 5vw, 48px);
  background: #101426;
}
.hlp-root .hlp-footer-cta-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}
.hlp-root .hlp-footer-cta-inner {
  position: relative;
  z-index: 2;
}
.hlp-root .hlp-footer-cta-title {
  font-size: clamp(28px, 5.5vw, 52px);
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: -1.5px;
  margin-bottom: 14px;
}
.hlp-root .hlp-footer-cta-sub {
  font-size: 17px;
  color: rgba(237, 232, 250, 0.75);
  margin-bottom: 36px;
  font-weight: 500;
  max-width: 440px;
  margin-left: auto;
  margin-right: auto;
}

/* ── Footer bar ── */
.hlp-root .hlp-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 20px clamp(20px, 5vw, 56px);
  background: #0b0e1a;
  border-top: 1px solid #1a2035;
  font-size: 12.5px;
  color: #94A3B8;
  font-weight: 500;
}
.hlp-root .hlp-footer-links {
  display: flex;
  gap: 22px;
}
.hlp-root .hlp-footer-links a {
  color: #94A3B8;
  text-decoration: none;
  transition: color 0.16s ease;
}
.hlp-root .hlp-footer-links a:hover {
  color: #EDE8FA;
}

/* ── Scroll reveal ── */
.hlp-root .hlp-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.hlp-root .hlp-reveal.hlp-visible {
  opacity: 1;
  transform: translateY(0);
}
.hlp-root .hlp-reveal-delay-1 { transition-delay: 0.06s; }
.hlp-root .hlp-reveal-delay-2 { transition-delay: 0.12s; }
.hlp-root .hlp-reveal-delay-3 { transition-delay: 0.18s; }
.hlp-root .hlp-reveal-delay-4 { transition-delay: 0.24s; }

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .hlp-root .hlp-badge-dot { animation: none; }
  .hlp-root .hlp-reveal { opacity: 1; transform: none; transition: none; }
  .hlp-root .hlp-card,
  .hlp-root .hlp-step,
  .hlp-root .hlp-quote,
  .hlp-root .hlp-fcard,
  .hlp-root .hlp-word {
    transition: none !important;
    transform: none !important;
  }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .hlp-root .hlp-h1 { letter-spacing: -1.5px; }
  .hlp-root .hlp-cta-main,
  .hlp-root .hlp-cta-sec { padding: 13px 26px; font-size: 15px; }
  .hlp-root .hlp-float-cards { display: none; }
  .hlp-root .hlp-footer-bar { justify-content: center; text-align: center; }
  .hlp-root .hlp-nav-logo-text { font-size: 18px; }
}
@media (max-width: 380px) {
  .hlp-root .hlp-cta-main,
  .hlp-root .hlp-cta-sec { width: 100%; text-align: center; }
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   DATA WITH PREMIUM LUCIDE ICONS
───────────────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Trophy size={22} strokeWidth={2} />,
    title: 'Hackathons',
    desc: 'Find teammates fast and compete together at any hackathon, online or in-person.',
  },
  {
    icon: <Users size={22} strokeWidth={2} />,
    title: 'Team Building',
    desc: 'Discover students who complement your skills and share your ambition.',
  },
  {
    icon: <Rocket size={22} strokeWidth={2} />,
    title: 'Side Projects',
    desc: 'Showcase your work, get feedback, and recruit collaborators.',
  },
  {
    icon: <Lightbulb size={22} strokeWidth={2} />,
    title: 'Startup Ideas',
    desc: 'Serious about an idea? Post it and find co-founders who believe in it.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: <UserCheck size={22} strokeWidth={2} />,
    title: 'Create Your Profile',
    desc: 'Showcase your skills, year, college, and interests.',
  },
  {
    num: '02',
    icon: <Search size={22} strokeWidth={2} />,
    title: 'Find Teammates',
    desc: 'Discover students with complementary skills for your next hackathon.',
  },
  {
    num: '03',
    icon: <Zap size={22} strokeWidth={2} />,
    title: 'Build Together',
    desc: 'Create a project workspace to collaborate on ideas and tasks.',
  },
  {
    num: '04',
    icon: <Sparkles size={22} strokeWidth={2} />,
    title: 'Launch & Share',
    desc: 'Post your wins, projects, and — if ambitious — your startup idea.',
  },
];

const QUOTES = [
  {
    text: 'Found my entire hackathon team on HookZ. We placed top 3 at ETHIndia.',
    author: 'Aditya K.',
    role: 'CS student, IIT Bombay',
  },
  {
    text: 'Finally a platform that gets students — not just LinkedIn clone #999.',
    author: 'Priya M.',
    role: 'Designer, BITS Pilani',
  },
  {
    text: "My co-founder DM'd me on HookZ after seeing my project post. Now we're building full-time.",
    author: 'Sai V.',
    role: 'Founder, SaaS startup',
  },
];

const FLOAT_CARDS = [
  {
    icon: <Code2 size={20} strokeWidth={2} />,
    label: 'Student Builder',
    title: 'Aditya K.',
    sub: 'Full-Stack · React · IIT Bombay',
    tag: 'Open to Hackathons',
  },
  {
    icon: <Palette size={20} strokeWidth={2} />,
    label: 'Designer',
    title: 'Priya M.',
    sub: 'UI/UX · Figma · BITS Pilani',
    tag: 'Seeking Team',
  },
  {
    icon: <Cpu size={20} strokeWidth={2} />,
    label: 'ML Engineer',
    title: 'Rahul S.',
    sub: 'Python · PyTorch · IIT Delhi',
    tag: 'Building a Startup',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HOOK — Immediate Response 3D Card Tilt with Neutral Realistic Elevation
   Strictly scoped to targeted cards — zero global window listeners.
───────────────────────────────────────────────────────────────────────────── */
function useTiltCards(rootRef: React.RefObject<HTMLDivElement | null>, selector: string) {
  useEffect(() => {
    if (!rootRef.current) return;
    const cards = rootRef.current.querySelectorAll<HTMLElement>(selector);
    const TILT = 4.5;
    const cleanups: Array<() => void> = [];

    cards.forEach((el) => {
      let isPressed = false;
      let rect: DOMRect | null = null;
      let rafId = 0;

      const updateRect = () => {
        rect = el.getBoundingClientRect();
      };

      const onEnter = () => {
        updateRect();
        el.style.transition = 'transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 140ms ease, border-color 140ms ease';
        el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateY(-5px) translateZ(6px)';
        el.style.boxShadow = '0 12px 24px -4px rgba(16, 24, 40, 0.08), 0 4px 8px -2px rgba(16, 24, 40, 0.03)';
        el.style.borderColor = '#7655D9';

        const icon = el.querySelector<HTMLElement>('.hlp-card-icon, .hlp-step-icon, .hlp-fcard-icon');
        if (icon) {
          icon.style.transition = 'transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1)';
          icon.style.transform = 'translateZ(10px) translateY(-1px)';
        }
      };

      const onMove = (e: MouseEvent) => {
        if (isPressed) return;
        if (!rect) updateRect();
        if (!rect) return;

        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          if (!rect) return;
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          const rotX = -y * TILT;
          const rotY = x * TILT;

          el.style.transition = 'transform 50ms ease-out, box-shadow 140ms ease, border-color 140ms ease';
          el.style.transform = `perspective(700px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-5px) translateZ(6px)`;

          const icon = el.querySelector<HTMLElement>('.hlp-card-icon, .hlp-step-icon, .hlp-fcard-icon');
          if (icon) {
            icon.style.transition = 'transform 50ms ease-out';
            icon.style.transform = 'translateZ(10px) translateY(-1px)';
          }
        });
      };

      const onLeave = () => {
        cancelAnimationFrame(rafId);
        isPressed = false;
        rect = null;
        el.style.transition = 'transform 180ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 180ms ease, border-color 180ms ease';
        el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateY(0px) translateZ(0px)';
        el.style.boxShadow = '';
        el.style.borderColor = '';

        const icon = el.querySelector<HTMLElement>('.hlp-card-icon, .hlp-step-icon, .hlp-fcard-icon');
        if (icon) {
          icon.style.transition = 'transform 180ms cubic-bezier(0.25, 1, 0.5, 1)';
          icon.style.transform = 'translateZ(0px) translateY(0px)';
        }
      };

      const onDown = () => {
        isPressed = true;
        el.style.transition = 'transform 80ms ease, box-shadow 80ms ease';
        el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateY(-1px) scale(0.99)';
        el.style.boxShadow = '0 3px 8px rgba(16, 24, 40, 0.06)';
      };

      const onUp = () => {
        if (!isPressed) return;
        isPressed = false;
        el.style.transition = 'transform 140ms ease, box-shadow 140ms ease';
        el.style.transform = 'perspective(700px) translateY(-5px) translateZ(6px)';
        el.style.boxShadow = '0 12px 24px -4px rgba(16, 24, 40, 0.08), 0 4px 8px -2px rgba(16, 24, 40, 0.03)';
      };

      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('mousedown', onDown);
      el.addEventListener('mouseup', onUp);

      cleanups.push(() => {
        cancelAnimationFrame(rafId);
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
        el.removeEventListener('mousedown', onDown);
        el.removeEventListener('mouseup', onUp);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [rootRef, selector]);
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export const PublicLandingPage: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  /* ── Scoped Styles Injection & Guaranteed Cleanup on Unmount ── */
  useEffect(() => {
    // Purge any lingering style tags from prior reloads
    document.querySelectorAll('style[data-hlp]').forEach((s) => s.remove());

    const el = document.createElement('style');
    el.setAttribute('data-hlp', 'scoped-landing');
    el.textContent = CSS;
    document.head.appendChild(el);

    return () => {
      el.remove();
      document.querySelectorAll('style[data-hlp]').forEach((s) => s.remove());
    };
  }, []);

  /* ── Cursor spotlight (scoped strictly to rootRef, removed on unmount) ── */
  useEffect(() => {
    const root = rootRef.current;
    const spot = spotRef.current;
    if (!root || !spot) return;

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      spot.classList.add('hlp-visible');
    };
    const onLeave = () => spot.classList.remove('hlp-visible');

    const tick = () => {
      const { x, y } = mouseRef.current;
      spot.style.setProperty('--cx', `${x}px`);
      spot.style.setProperty('--cy', `${y}px`);
      rafRef.current = requestAnimationFrame(tick);
    };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ── Scroll reveal (scoped strictly inside rootRef) ── */
  useEffect(() => {
    if (!rootRef.current) return;
    const els = rootRef.current.querySelectorAll<HTMLElement>('.hlp-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('hlp-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── 3D Card tilt with immediate 140ms response (scoped inside rootRef) ── */
  useTiltCards(rootRef, '.hlp-card, .hlp-step, .hlp-quote, .hlp-fcard');

  /* ── Word-by-word 3D hover interaction handlers ── */
  const handleWordMove = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const rotX = (-y * 7).toFixed(2);
    const rotY = (x * 7).toFixed(2);
    el.style.transition = 'transform 60ms ease-out, filter 160ms ease';
    el.style.transform = `perspective(500px) translate3d(0, -4px, 8px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }, []);

  const handleWordLeave = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    el.style.transition = 'transform 180ms cubic-bezier(0.25, 1, 0.5, 1), filter 180ms ease';
    el.style.transform = 'perspective(500px) translate3d(0, 0px, 0px) rotateX(0deg) rotateY(0deg)';
  }, []);

  const handleCtaClick = useCallback(() => {}, []);

  return (
    <div ref={rootRef} className="hlp-root">
      <SEO
        title="HookZ — Find Hackathon Teammates & Connect with Student Builders"
        description="HookZ is the student network for hackathons, side projects, and startup ideas. Connect with fellow students, form teams, and build something real."
        canonicalPath="/"
      />

      {/* Subtle ambient spotlight */}
      <div ref={spotRef} className="hlp-spotlight" aria-hidden="true" />

      {/* ─── NAV ─── */}
      <header className="hlp-nav">
        <Link to="/" className="hlp-nav-logo">
          <img src={logoIcon} alt="HookZ logo" />
          <span className="hlp-nav-logo-text">HookZ</span>
        </Link>
        <div className="hlp-nav-actions">
          <Link to="/login" className="hlp-btn-ghost">Sign In</Link>
          <Link to="/register" className="hlp-nav-cta">Join Now</Link>
        </div>
      </header>

      {/* ─── HERO: Midnight navy (#101426), clean & restrained ─── */}
      <section className="hlp-hero-wrap">
        <div className="hlp-hero-grid" aria-hidden="true" />

        <div className="hlp-hero-inner">
          <div className="hlp-hero-badge">
            <span className="hlp-badge-dot" aria-hidden="true" />
            Built for students. Not LinkedIn.
          </div>

          {/* Heading: Entire container stays stationary; individual words pop out in 3D */}
          <h1 className="hlp-h1" aria-label="Find your team. Build something real.">
            <span className="hlp-h1-line">
              {['Find', 'your', 'team.'].map((word) => (
                <span
                  key={word}
                  className="hlp-word"
                  tabIndex={0}
                  onMouseMove={handleWordMove}
                  onMouseLeave={handleWordLeave}
                >
                  {word}
                </span>
              ))}
            </span>
            <br />
            <span className="hlp-h1-line">
              {['Build', 'something', 'real.'].map((word) => (
                <span
                  key={word}
                  className="hlp-word hlp-word-gradient"
                  tabIndex={0}
                  onMouseMove={handleWordMove}
                  onMouseLeave={handleWordLeave}
                >
                  {word}
                </span>
              ))}
            </span>
          </h1>

          <p className="hlp-hero-sub">
            HookZ is the student network for hackathons, side projects, and college
            friendships. Connect with classmates, form teams, and showcase what you build.
          </p>

          <div className="hlp-hero-cta">
            <Link to="/register" className="hlp-cta-main" onClick={handleCtaClick}>
              Join Now — it's free
            </Link>
            <Link to="/login" className="hlp-cta-sec">
              Sign In
            </Link>
          </div>
        </div>

        {/* Floating hero cards */}
        <div className="hlp-float-cards" aria-hidden="true">
          {FLOAT_CARDS.map((c) => (
            <div key={c.title} className="hlp-fcard">
              <div className="hlp-fcard-icon">{c.icon}</div>
              <div className="hlp-fcard-label">{c.label}</div>
              <div className="hlp-fcard-title">{c.title}</div>
              <div className="hlp-fcard-sub">{c.sub}</div>
              <span className="hlp-fcard-tag">{c.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SOCIAL PROOF STRIP ─── */}
      <div className="hlp-strip">
        {[
          { n: '2,000+', l: 'Student Members' },
          { n: '150+', l: 'Hackathon Teams' },
          { n: '400+', l: 'Projects Built' },
          { n: '90+', l: 'Colleges Represented' },
        ].map((s, i) => (
          <div
            key={s.l}
            className={`hlp-stat hlp-reveal hlp-reveal-delay-${i + 1}`}
          >
            <div className="hlp-stat-n">{s.n}</div>
            <div className="hlp-stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* ─── FEATURES: Everything students need to connect & build (Clean white, instant response) ─── */}
      <section className="hlp-section">
        <div className="hlp-section-inner">
          <p className="hlp-label hlp-reveal">What you get</p>
          <h2 className="hlp-section-title hlp-reveal">Everything students need to connect &amp; build</h2>
          <p className="hlp-section-desc hlp-reveal">
            From hackathon squads to side-project collabs — HookZ is your campus in your pocket.
          </p>
          <div className="hlp-grid-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`hlp-card hlp-reveal hlp-reveal-delay-${i + 1}`}
              >
                <div className="hlp-card-icon">{f.icon}</div>
                <div className="hlp-card-title">{f.title}</div>
                <div className="hlp-card-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS: Up and running in minutes (Light neutral grey #F7F8FA, instant response) ─── */}
      <section className="hlp-section hlp-alt-bg">
        <div className="hlp-section-inner">
          <p className="hlp-label hlp-reveal">How it works</p>
          <h2 className="hlp-section-title hlp-reveal">Up and running in minutes</h2>
          <p className="hlp-section-desc hlp-reveal">
            Four simple steps from zero to hackathon-ready team.
          </p>
          <div className="hlp-steps">
            {STEPS.map((s, i) => (
              <Link
                to="/register"
                key={s.num}
                className={`hlp-step hlp-reveal hlp-reveal-delay-${i + 1}`}
              >
                <div className="hlp-step-num">STEP {s.num}</div>
                <div className="hlp-step-icon">{s.icon}</div>
                <div className="hlp-step-title">
                  {s.title}
                  <ArrowRight size={14} className="hlp-step-arrow" aria-hidden="true" />
                </div>
                <div className="hlp-step-desc">{s.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS: Community love (Clean white) ─── */}
      <section className="hlp-section">
        <div className="hlp-section-inner">
          <p className="hlp-label hlp-reveal">Community love</p>
          <h2 className="hlp-section-title hlp-reveal" style={{ marginBottom: 36 }}>
            What builders say
          </h2>
          <div className="hlp-quotes">
            {QUOTES.map((q, i) => (
              <div
                key={q.author}
                className={`hlp-quote hlp-reveal hlp-reveal-delay-${i + 1}`}
              >
                <div className="hlp-quote-mark">"</div>
                <p className="hlp-quote-text">{q.text}</p>
                <div className="hlp-quote-author">{q.author}</div>
                <div className="hlp-quote-role">{q.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER CTA: Deep midnight navy (#101426) ─── */}
      <div className="hlp-footer-cta">
        <div className="hlp-footer-cta-grid" aria-hidden="true" />
        <div className="hlp-footer-cta-inner hlp-reveal">
          <h2 className="hlp-footer-cta-title">Ready to find your people?</h2>
          <p className="hlp-footer-cta-sub">
            Join thousands of students already building on HookZ.
          </p>
          <Link to="/register" className="hlp-cta-main">
            Get Started
          </Link>
        </div>
      </div>

      {/* ─── FOOTER BAR ─── */}
      <footer className="hlp-footer-bar">
        <span>© 2026 HookZ. Made for students.</span>
        <div className="hlp-footer-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register">Join</Link>
          <Link to="/cofounders">Explore</Link>
        </div>
      </footer>
    </div>
  );
};
