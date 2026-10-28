import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Check, Code2, Command, Compass, Layers3, MoveUpRight, Plus, Search, Sparkles, Users, Zap } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Avatar } from '../components/common/Avatar';
import logoIcon from '../assets/logo-icon.png';
import './PublicLandingPage.css';

const builders = [
  { name: 'Aanya Shah', role: 'UI/UX Designer', college: 'Design student · 3rd year', skills: ['Figma', 'Prototyping'], color: 'peach', initials: 'AS' },
  { name: 'Rohan Mehta', role: 'Full-Stack Developer', college: 'CS student · 2nd year', skills: ['React', 'Node.js'], color: 'lilac', initials: 'RM' },
  { name: 'Maya Chen', role: 'ML/AI Builder', college: 'Engineering student · 4th year', skills: ['Python', 'PyTorch'], color: 'lime', initials: 'MC' },
];
const features = [
  { icon: Users, title: 'Your missing teammate.', copy: 'Find the designer to your developer. The pitcher to your prototype. Meet people whose skills complement yours.', tag: 'FIND YOUR PEOPLE', className: 'feature-violet' },
  { icon: Code2, title: 'Less “we should.” More shipped.', copy: 'Turn the idea in your notes app into a real team project. Find collaborators who are ready to start.', tag: 'BUILD TOGETHER', className: 'feature-lime' },
  { icon: MoveUpRight, title: 'Let your work do the talking.', copy: 'Share what you made, learn in public, and give your next teammate a reason to say hello.', tag: 'SHOW YOUR WORK', className: 'feature-peach' },
];

export const PublicLandingPage: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState('All builders');
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    root.current?.querySelectorAll('[data-reveal]').forEach(el => { el.classList.add('will-reveal'); observer.observe(el); });
    return () => observer.disconnect();
  }, []);
  const visibleBuilders = builders.filter(person => filter === 'All builders' || (filter === 'Designers' ? person.role.includes('Designer') : !person.role.includes('Designer')));

  return (
    <div className="hookz-landing" ref={root}>
      <SEO title="HookZ — Find your people. Build your thing." description="Find hackathon teammates, build project teams, and showcase your work. A home for student builders. Join HookZ free." />
      <a className="skip-link btn-primary" href="#landing-content">Skip to content</a>
      <header className="landing-nav landing-container">
        <Link to="/" className="brand-wordmark" aria-label="HookZ home"><img src={logoIcon} alt="" />HookZ<span className="brand-dot">®</span></Link>
        <nav aria-label="Main navigation" className="landing-nav-links"><a href="#why-hookz">Why HookZ</a><a href="#how-it-works">How it works</a><a href="#community">The community <ArrowUpRight size={13} /></a></nav>
        <div className="landing-nav-actions"><Link to="/login" className="landing-signin">Sign In</Link><Link to="/register" className="btn-primary">Join Free <ArrowUpRight size={15} /></Link></div>
      </header>

      <div id="landing-content">
        <section className="landing-hero landing-container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="status-dot" /> BIG IDEAS START WITH YOUR PEOPLE</div>
            <h1>Find your people.<br />Build your <span className="hero-word">thing.<svg viewBox="0 0 300 18" aria-hidden="true"><path d="M4 12 Q140 -1 294 8 M35 17 Q160 6 265 14" /></svg></span></h1>
            <p>The teammate for your next hackathon. The crew for your side project. The people who get your 2 a.m. idea.</p>
            <p className="hero-punchline">Meet them on HookZ.</p>
            <div className="hero-actions"><Link to="/register" className="btn-primary">Join Free <ArrowUpRight size={18} /></Link><Link to="/login" className="btn-secondary">Sign In <ArrowRight size={16} /></Link></div>
            <div className="hero-footnote"><span className="mini-avatars" aria-hidden="true">{builders.map(b => <span className={b.color} key={b.name}>{b.initials}</span>)}</span><span>For students who make things.<br /><strong>All skill levels. All big ideas.</strong></span></div>
          </div>
          <div className="hero-board" aria-label="Illustration of students forming a hackathon team">
            <div className="board-grid" />
            <span className="board-label"><span /> YOUR NEXT TEAM IS OUT THERE</span>
            <span className="board-spark" aria-hidden="true">✳</span>
            <div className="team-note"><span className="note-pin" /><span className="eyebrow">NEXT WEEKEND'S PLAN</span><h2>One wild idea.<br />Three great humans.</h2><span className="note-tag"><Zap size={13} /> Hackathon mode: on</span></div>
            <div className="floating-profile profile-one"><span className="illustrated-avatar peach">AS<span>✦</span></span><div><strong>Aanya S.</strong><span>Designs the impossible.</span><small>Figma <span>UI/UX</span></small></div><span className="profile-check"><Check size={14} /></span></div>
            <div className="floating-profile profile-two"><span className="illustrated-avatar lilac">RM<span>⌘</span></span><div><strong>Rohan M.</strong><span>“I can build that.”</span><small>React <span>Full-stack</span></small></div><span className="profile-check"><Check size={14} /></span></div>
            <div className="floating-profile profile-three"><span className="illustrated-avatar lime">YOU<span>↗</span></span><div><strong>Your name here.</strong><span>Every team needs your thing.</span><small>Whatever makes you, you.</small></div><Plus size={18} /></div>
            <div className="match-sticker"><Sparkles size={17} /><span>Different skills.<br /><strong>Same wavelength.</strong></span></div>
            <svg className="board-connector" viewBox="0 0 550 520" aria-hidden="true"><path d="M180 180 C470 90 510 410 220 430" /></svg>
            <span className="board-caption">A little chemistry. A lot of possibility.</span>
          </div>
        </section>

        <section className="campus-strip" aria-label="Campus community"><div className="landing-container"><p>YOUR CAMPUS IS JUST THE START.</p><div className="campus-names"><span>IIT DELHI</span><span>bits pilani</span><span>NIT TRICHY</span><span>VIT</span><span>YOUR CAMPUS ↗</span></div><small>Illustrative campus community · no institutional affiliation implied</small></div></section>

        <section id="why-hookz" className="landing-section landing-container" data-reveal>
          <div className="section-heading"><div><span className="eyebrow">LESS SCROLLING. MORE BUILDING.</span><h2>Your next big thing<br />starts with a “hey.”</h2></div><p>You have the ideas. Someone out there has the missing piece. Let's put you in the same room.</p></div>
          <div className="feature-grid">{features.map(({ icon: Icon, title, copy, tag, className }, i) => <article className={`landing-feature ${className}`} key={title}><div className="feature-top"><span className="feature-icon"><Icon size={25} strokeWidth={1.6} /></span><span>0{i + 1}</span></div><span className="eyebrow">{tag}</span><h3>{title}</h3><p>{copy}</p><Link to={i === 0 ? '/cofounders' : i === 1 ? '/projects' : '/feed'} aria-label={`Explore: ${tag.toLowerCase()}`}><ArrowUpRight size={24} /></Link></article>)}</div>
        </section>

        <section id="how-it-works" className="how-section landing-section" data-reveal><div className="landing-container"><span className="eyebrow">FROM STRANGERS TO “WE BUILT THIS.”</span><h2>How HookZ works.</h2><div className="steps-grid">{[
          ['01', 'Create Profile', 'Your skills, your interests, your kind of ambition.', Command],
          ['02', 'Find Teammates', 'Discover people who bring a different piece of the puzzle.', Compass],
          ['03', 'Build Together', 'Join a project, form your crew, and make it happen.', Layers3],
          ['04', 'Launch & Share', 'Put your work out there. Your next chapter starts here.', ArrowUpRight],
        ].map(([number, title, copy, Icon]) => { const StepIcon = Icon as React.ElementType; return <article key={String(number)}><div className="step-marker"><span>{String(number)}</span><StepIcon size={22} /></div><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}</div></div></section>

        <section id="community" className="landing-section landing-container" data-reveal>
          <div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE. GREAT POSSIBILITIES.</span><h2>There's a “your kind of people”<br />for everyone.</h2></div><Link to="/cofounders" className="text-link">Explore the community <ArrowUpRight size={18} /></Link></div>
          <div className="product-preview"><div className="preview-toolbar"><div><span className="preview-dot" /><span className="preview-dot" /><span className="preview-dot" /></div><span>hookz.in / connections</span><span className="preview-sample">Interactive preview · sample profiles</span></div><div className="preview-body"><div className="preview-heading"><div><h3>Find your next teammate.</h3><p>Different skills. Shared ambition.</p></div><Search size={20} /></div><div className="preview-filters" role="group" aria-label="Filter sample builders">{['All builders', 'Developers', 'Designers'].map(option => <button type="button" key={option} aria-pressed={filter === option} onClick={() => setFilter(option)}>{option}</button>)}</div><div className="preview-cards" aria-live="polite">{visibleBuilders.map(b => <article className="preview-card card-base" key={b.name}><div className={`profile-cover ${b.color}`}><span>✳</span><span className="availability"><span /> Open to team up</span></div><div className="preview-person"><Avatar name={b.name} size="xl" /><h4>{b.name}</h4><strong>{b.role}</strong><p>{b.college}</p><div className="skill-tags">{b.skills.map(skill => <span key={skill}>{skill}</span>)}</div><Link to="/register" className="btn-secondary">Let's connect <Plus size={15} /></Link></div></article>)}</div></div></div>
        </section>

        <section className="community-section landing-section" data-reveal><div className="landing-container"><div className="section-heading"><div><span className="eyebrow">THE KIND OF MOMENTS WE'RE HERE FOR</span><h2>Small hellos.<br />Big possibilities.</h2></div><p>Illustrative student stories. Your story could be next.</p></div><div className="quote-grid">{[
          ['“A designer, a developer, and a very chaotic group chat. That’s how our first prototype happened.”', 'The weekend builders', 'From idea to demo'],
          ['“I didn’t need to know everything. I just needed teammates who were excited to figure it out with me.”', 'The first-time hacker', 'From curious to confident'],
          ['“The best thing we brought home wasn’t a prize. It was a team that wanted to keep building.”', 'The keep-going crew', 'From teammates to friends'],
        ].map(([quote, name, note]) => <figure key={name}><span className="quote-star" aria-hidden="true">✳</span><blockquote>{quote}</blockquote><figcaption><strong>{name}</strong><span>{note}</span></figcaption></figure>)}</div></div></section>

        <section className="final-cta landing-container" data-reveal><span className="eyebrow">YOUR NEXT CHAPTER IS A TEAM SPORT.</span><h2>Big ideas.<br />Better <span>together.</span></h2><p>Bring your curiosity. Find your crew. Build something real.</p><Link to="/register" className="btn-primary">Join HookZ Free Today <ArrowUpRight size={20} /></Link><span className="cta-doodle" aria-hidden="true">✳</span><small>Free to join. A good place to start.</small></section>
      </div>
      <footer className="landing-footer landing-container"><div><Link to="/" className="brand-wordmark"><img src={logoIcon} alt="" />HookZ</Link><p>Made for the ones who make things.</p></div><nav aria-label="Footer navigation"><Link to="/projects">Projects</Link><Link to="/business">For startups</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav><small>© {new Date().getFullYear()} HookZ</small></footer>
    </div>
  );
};
