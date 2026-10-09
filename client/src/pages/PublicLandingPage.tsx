import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Zap, Trophy, Rocket, Crown, ArrowRight } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { GoldenBadge } from '../components/common/Badge';

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

      {/* HookZ Leadership Section */}
      <section
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '20px 24px 80px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            <Crown size={14} color="#d97706" /> HookZ Leadership
          </div>
          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.5px',
              marginBottom: 8,
            }}
          >
            Meet the Founders of HookZ
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 560, margin: '0 auto' }}>
            Empowering students, developers, and founders to discover complementary teammates and launch ventures together.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {/* Ruthwik Patel */}
          <div
            style={{
              background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
              border: '2px solid #fcd34d',
              borderRadius: 18,
              padding: '28px 24px',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <img
                  src="/images/founders/ruthwik-patel.png"
                  alt="Ruthwik Patel - Founder of HookZ"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    border: '2.5px solid #f59e0b',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  }}
                />
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Ruthwik Patel</h3>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginTop: 2 }}>
                    Founder & Lead Architect
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: '#4f46e5',
                    }}
                  >
                    @ruthwikpatel08
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 16px' }}>
                Architected and founded HookZ with the vision to bridge ambitious student builders, technical co-founders, and early-stage capital. Passionate about full-stack systems, product scaling, and democratizing startup discovery worldwide.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {['Full-Stack Architecture', 'Product Strategy', 'AI Systems', 'Startup Scaling'].map((skill) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: '#fef3c7',
                      color: '#78350f',
                      border: '1px solid #fde68a',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #fde68a',
                paddingTop: 14,
              }}
            >
              <GoldenBadge label="HookZ Founder" size="sm" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                ✨ Platform Founder
              </span>
            </div>
          </div>

          {/* Gokul Vamshi */}
          <div
            style={{
              background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
              border: '2px solid #fcd34d',
              borderRadius: 18,
              padding: '28px 24px',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <img
                  src="/images/founders/gokul-vamshi.jpg"
                  alt="Gokul Vamshi - Co-Founder of HookZ"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    border: '2.5px solid #f59e0b',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  }}
                />
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Gokul Vamshi</h3>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginTop: 2 }}>
                    Co-Founder & Operations
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: '#4f46e5',
                    }}
                  >
                    @gokulvamshi
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 16px' }}>
                Co-founded HookZ to empower student innovators and entrepreneurial ecosystems. Drives operations, strategic venture partnerships, builder relations, and collaborative project infrastructure across university and startup communities.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {['Venture Operations', 'Strategic Partnerships', 'Community Growth', 'Product Ops'].map((skill) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: '#fef3c7',
                      color: '#78350f',
                      border: '1px solid #fde68a',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #fde68a',
                paddingTop: 14,
              }}
            >
              <GoldenBadge label="HookZ Co-Founder" size="sm" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                ✨ Platform Co-Founder
              </span>
            </div>
          </div>
        </div>
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
