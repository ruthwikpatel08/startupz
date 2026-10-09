import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';

export const PublicLandingPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#1a1a2e',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <SEO
        title="HookZ — Connect with Founders, Co-Founders & Investors"
        description="HookZ is a startup networking platform where founders, co-founders, mentors and investors connect, discover opportunities and build startups together."
        canonicalPath="/"
      />
      {/* Top Nav */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-icon.png" alt="HookZ" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 22, color: '#4f46e5', letterSpacing: '-0.5px' }}>
            HookZ
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            to="/login"
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1.5px solid #4f46e5',
              color: '#4f46e5',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              background: '#4f46e5',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Join Now
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '80px 24px 60px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#eef2ff',
            color: '#4f46e5',
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 28,
          }}
        >
          Built for students. Not LinkedIn.
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 60px)',
            fontWeight: 800,
            lineHeight: 1.12,
            marginBottom: 20,
            color: '#111827',
            letterSpacing: '-1px',
          }}
        >
          Find your team.
          <br />
          <span style={{ color: '#4f46e5' }}>Build something real.</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            color: '#6b7280',
            lineHeight: 1.65,
            maxWidth: 560,
            margin: '0 auto 36px',
          }}
        >
          HookZ is the student network for hackathons, side projects, and college friendships.
          Connect with classmates, form teams, and showcase what you build. Startups are welcome
          too, but students always come first.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/register"
            style={{
              padding: '13px 32px',
              borderRadius: 10,
              background: '#4f46e5',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
            }}
          >
            Join Now — it is free
          </Link>
          <Link
            to="/login"
            style={{
              padding: '13px 32px',
              borderRadius: 10,
              border: '1.5px solid #d1d5db',
              color: '#374151',
              fontWeight: 600,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Feature Tiles */}
      <section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}
      >
        {[
          { title: 'Hackathons', desc: 'Find teammates fast and compete together at any hackathon.' },
          { title: 'Team Building', desc: 'Discover students who complement your skills and share your ambition.' },
          { title: 'Side Projects', desc: 'Showcase your work, get feedback, and recruit collaborators.' },
          { title: 'Startup Ideas', desc: 'Serious about an idea? Post it and find co-founders who believe in it.' },
        ].map((f) => (
          <div
            key={f.title}
            style={{
              background: '#f9fafb',
              borderRadius: 14,
              padding: '24px 20px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: '#111827' }}>
              {f.title}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>{f.desc}</div>
          </div>
        ))}
      </section>


      {/* Footer CTA */}
      <footer
        style={{
          background: '#f5f3ff',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          padding: '40px 24px',
        }}
      >
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 16 }}>Ready to find your people?</p>
        <Link
          to="/register"
          style={{
            padding: '11px 28px',
            borderRadius: 8,
            background: '#4f46e5',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
          }}
        >
          Get Started
        </Link>
        <p style={{ marginTop: 20, fontSize: 12, color: '#9ca3af' }}>
          2026 HookZ. Made for students.
        </p>
      </footer>
    </div>
  );
};
