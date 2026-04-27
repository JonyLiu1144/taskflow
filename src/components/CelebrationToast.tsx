'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Todo } from '@/types/todo';

const QUOTES = [
  '太棒了！保持这个节奏 🎯',
  '完美执行！向目标又近一步 🔥',
  '干得漂亮！你真的很厉害 ⭐',
  '出色完成！今天状态满分 💪',
  '任务拿下！势不可挡 🚀',
  '棒极了！每一步都算数 🏆',
  '完成！积累每一个小胜利 ✨',
  '优秀！行动力满级 ⚡',
];

const COLORS = [
  '#6366f1','#818cf8','#f97316','#fb923c','#10b981',
  '#34d399','#f59e0b','#fbbf24','#ef4444','#f87171',
  '#8b5cf6','#a78bfa','#ec4899','#f472b6','#06b6d4',
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  w: number; h: number;
  rot: number; rotV: number;
  alpha: number;
  shape: 0 | 1 | 2; // 0=rect, 1=circle, 2=ribbon
  gravity: number;
}

function burst(canvas: HTMLCanvasElement): Particle[] {
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.55;
  return Array.from({ length: 90 }, (): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 14 + 5;
    return {
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (Math.random() * 6 + 6),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: Math.random() * 12 + 5,
      h: Math.random() * 6 + 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 12,
      alpha: 1,
      shape: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      gravity: Math.random() * 0.25 + 0.2,
    };
  });
}

interface Props {
  todo: Todo;
  completedToday: number;
  onDismiss: () => void;
}

export default function CelebrationToast({ todo, completedToday, onDismiss }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [quote]    = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase('out');
    setTimeout(onDismiss, 380);
  }, [onDismiss]);

  /* auto-dismiss */
  useEffect(() => {
    timerRef.current = setTimeout(dismiss, 3400);
    return () => clearTimeout(timerRef.current);
  }, [dismiss]);

  /* canvas confetti */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = burst(canvas);
    let tick = 0;

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      tick++;
      let alive = false;
      for (const p of particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.rot += p.rotV;
        p.alpha = Math.max(0, 1 - tick / 85);
        if (p.alpha <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 2) {
          // ribbon
          ctx.beginPath();
          ctx.ellipse(0, 0, p.w / 2, p.h / 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (alive) rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const dots = Math.min(completedToday, 12);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center pb-10 px-5">
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Backdrop blur tint */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
      />

      {/* Toast card */}
      <div
        className={`relative pointer-events-auto w-full max-w-md ${
          phase === 'out' ? 'animate-celebrate-out' : 'animate-celebrate-in'
        }`}
        onClick={dismiss}
      >
        {/* Glow shadow */}
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60 blur-xl" />

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-5 cursor-pointer select-none shadow-2xl">
          {/* Shimmer streak */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute -inset-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer-slide" />
          </div>

          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8  w-32 h-32 rounded-full bg-white/8"  />

          <div className="relative flex items-center gap-4">
            {/* Animated check bubble */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-star-pop shadow-lg shadow-black/20">
                <svg className="w-9 h-9 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              {/* ripple ring */}
              <div className="absolute inset-0 rounded-2xl bg-white/40 animate-ripple-ring" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-0.5">任务完成 ✨</p>
              <p className="text-white font-bold text-[15px] leading-snug line-clamp-2 drop-shadow-sm">{todo.title}</p>
              <p className="text-white/75 text-xs mt-1.5 leading-relaxed">{quote}</p>
            </div>

            {/* Count */}
            <div className="shrink-0 text-right pl-2">
              <div className="text-[42px] font-black text-white leading-none tabular-nums drop-shadow-lg">{completedToday}</div>
              <div className="text-white/55 text-[10px] font-medium mt-0.5">今日完成</div>
            </div>
          </div>

          {/* Progress dots */}
          <div className="relative flex items-center gap-1.5 mt-4 pt-3.5 border-t border-white/20">
            {Array.from({ length: dots }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-white"
                style={{
                  opacity: 0.3 + (i / dots) * 0.7,
                  animation: `dotPop 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms both`,
                  animationFillMode: 'backwards',
                }}
              />
            ))}
            <span className="ml-auto text-white/40 text-[10px]">点击关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
}
