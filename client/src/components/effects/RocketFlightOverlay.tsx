import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Rocket, Zap, ChevronUp, ChevronDown, Sparkles, Orbit } from 'lucide-react';

interface ExhaustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface RocketState {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetX?: number;
  targetY?: number;
  thrustPulse: number;
  scale: number;
}

const EXHAUST_COLORS = [
  '#ffffff', // White hot
  '#67e8f9', // Cyan plasma
  '#38bdf8', // Sky blue
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#f97316', // Orange fire
  '#ef4444', // Red heat
];

export const RocketFlightOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rocketRef = useRef<RocketState>({
    active: false,
    x: -100,
    y: -100,
    vx: 0,
    vy: 0,
    angle: 0,
    thrustPulse: 0,
    scale: 1,
  });
  const particlesRef = useRef<ExhaustParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const [isDockExpanded, setIsDockExpanded] = useState(false);
  const [missionCount, setMissionCount] = useState(0);
  const [telemetryStatus, setTelemetryStatus] = useState('Nominal');
  const [velocityDisplay, setVelocityDisplay] = useState('0.0 km/s');

  // Launch the rocket across the screen
  const launchRocket = useCallback((customStart?: { x?: number; y?: number; targetX?: number; targetY?: number }) => {
    const startX = customStart?.x ?? -60;
    const startY = customStart?.y ?? (window.innerHeight * 0.85);
    const targetX = customStart?.targetX ?? (window.innerWidth + 80);
    const targetY = customStart?.targetY ?? (window.innerHeight * 0.1);

    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    const speed = 14;

    rocketRef.current = {
      active: true,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: angle,
      thrustPulse: 0,
      scale: 1,
    };

    setMissionCount((prev) => prev + 1);
    setTelemetryStatus('Active Flight');
    setVelocityDisplay('11.2 km/s (Escape Velocity)');

    // Start render loop if not running
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
    }
  }, []);

  // Listen to global launch-rocket events
  useEffect(() => {
    const handleCustomLaunch = (e: any) => {
      launchRocket(e.detail);
    };
    window.addEventListener('launch-rocket' as any, handleCustomLaunch);
    return () => {
      window.removeEventListener('launch-rocket' as any, handleCustomLaunch);
    };
  }, [launchRocket]);

  // Main Canvas Render Loop
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rocket = rocketRef.current;
    const particles = particlesRef.current;

    // 1. UPDATE AND DRAW PARTICLES
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife || p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. UPDATE AND DRAW ROCKET IF ACTIVE
    if (rocket.active) {
      // Add slight aerodynamic curve (arc upward)
      rocket.vy -= 0.05;
      rocket.x += rocket.vx;
      rocket.y += rocket.vy;
      rocket.angle = Math.atan2(rocket.vy, rocket.vx);
      rocket.thrustPulse = (rocket.thrustPulse + 0.3) % (Math.PI * 2);

      // Emit rocket exhaust particles from tail
      const tailOffset = 24;
      const tailX = rocket.x - Math.cos(rocket.angle) * tailOffset;
      const tailY = rocket.y - Math.sin(rocket.angle) * tailOffset;

      for (let j = 0; j < 5; j++) {
        const spreadAngle = rocket.angle + Math.PI + (Math.random() - 0.5) * 0.7;
        const speed = Math.random() * 5 + 3;
        const color = EXHAUST_COLORS[Math.floor(Math.random() * EXHAUST_COLORS.length)];
        particles.push({
          x: tailX + (Math.random() - 0.5) * 6,
          y: tailY + (Math.random() - 0.5) * 6,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          size: Math.random() * 4 + 2,
          color,
          alpha: 1,
          life: 0,
          maxLife: Math.floor(Math.random() * 30 + 20),
        });
      }

      // Draw Rocket
      ctx.save();
      ctx.translate(rocket.x, rocket.y);
      ctx.rotate(rocket.angle);

      // Draw Engine Flame Plume
      const flameLength = 32 + Math.sin(rocket.thrustPulse) * 8;
      const flameGradient = ctx.createLinearGradient(0, 0, -flameLength, 0);
      flameGradient.addColorStop(0, '#ffffff');
      flameGradient.addColorStop(0.2, '#67e8f9');
      flameGradient.addColorStop(0.5, '#6366f1');
      flameGradient.addColorStop(0.8, '#f97316');
      flameGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = flameGradient;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      ctx.lineTo(-16 - flameLength, 0);
      ctx.lineTo(-16, 6);
      ctx.closePath();
      ctx.fill();

      // Rocket Fuselage
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 12;

      // Outer Hull (Aerodynamic spacecraft shape)
      const hullGrad = ctx.createLinearGradient(-18, 0, 24, 0);
      hullGrad.addColorStop(0, '#1e1b4b');
      hullGrad.addColorStop(0.4, '#4f46e5');
      hullGrad.addColorStop(0.8, '#06b6d4');
      hullGrad.addColorStop(1, '#ffffff');

      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.moveTo(24, 0); // Nose cone tip
      ctx.bezierCurveTo(15, -9, -10, -9, -18, -6); // Top fuselage curve
      ctx.lineTo(-18, 6); // Base
      ctx.bezierCurveTo(-10, 9, 15, 9, 24, 0); // Bottom fuselage curve
      ctx.closePath();
      ctx.fill();

      // Fins / Wings
      ctx.fillStyle = '#6366f1';
      // Top Fin
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-18, -17);
      ctx.lineTo(-15, -6);
      ctx.closePath();
      ctx.fill();
      // Bottom Fin
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(-18, 17);
      ctx.lineTo(-15, 6);
      ctx.closePath();
      ctx.fill();

      // Cockpit Window (Glowing Cyan)
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(6, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Accent Stripes
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(8, 0);
      ctx.lineTo(-4, 6);
      ctx.stroke();

      ctx.restore();

      // Check if rocket left the viewport bounds
      const padding = 120;
      if (
        rocket.x > canvas.width + padding ||
        rocket.x < -padding ||
        rocket.y > canvas.height + padding ||
        rocket.y < -padding
      ) {
        rocket.active = false;
        setTelemetryStatus('Orbit Reached');
        setVelocityDisplay('0.0 km/s (Coasting)');
      }
    }

    // Keep loop alive if rocket active or particles remaining
    if (rocket.active || particles.length > 0) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  // Handle Canvas Resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Full-Screen Non-Blocking Canvas for Flying Rocket & Exhaust Trail */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-40"
        style={{ width: '100vw', height: '100vh' }}
      />

      {/* Floating Mission Control & Rocket Launch Dock */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 selection:bg-none">
        {/* Expanded Telemetry HUD */}
        {isDockExpanded && (
          <div className="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl w-64 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Orbit size={15} className="text-cyan-500 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-brand-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                  Flight Telemetry
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {telemetryStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Speed</span>
                <span className="font-mono font-bold text-slate-800 dark:text-white">{velocityDisplay}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Missions</span>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">#{missionCount}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Ignite the StartupZ aerospace propulsion to fly a rocket across your screen anytime.
            </p>

            <button
              onClick={() => launchRocket()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 hover:scale-102 active:scale-98 shadow-md shadow-brand-500/25 transition-all"
            >
              <Rocket size={14} className="transform -rotate-45" />
              <span>Launch Mission Now</span>
            </button>
          </div>
        )}

        {/* Floating Quick Launch Action Button */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xl backdrop-blur-md">
          <button
            onClick={() => launchRocket()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 shadow-md shadow-brand-500/30 transition-all hover:scale-105 active:scale-95 group"
            title="Launch Startup Rocket across the page"
          >
            <Rocket size={15} className="transform -rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            <span>Launch Rocket</span>
            <Sparkles size={13} className="text-cyan-200 animate-pulse" />
          </button>

          <button
            onClick={() => setIsDockExpanded((prev) => !prev)}
            aria-label="Toggle Mission Control Dock"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDockExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>
    </>
  );
};
