// A short confetti burst for the moment a goal becomes fully funded.
// Self-contained canvas animation (no dependency); skipped entirely when the
// visitor prefers reduced motion. The canvas never blocks clicks and removes
// itself when the pieces have fallen.

const COLORS = ['#3f5c3a', '#9db58f', '#2e7d4f', '#2d6cb5', '#cf6b25', '#7b59c9', '#b8407f', '#e3ebd6'];

export function celebrate({ x = window.innerWidth / 2, y = window.innerHeight / 3, pieces = 140 } = {}) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '3000',
    });
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const parts = Array.from({ length: pieces }, () => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
        const speed = 7 + Math.random() * 8;
        return {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            w: 6 + Math.random() * 6,
            h: 8 + Math.random() * 8,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.3,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
    });

    const start = performance.now();
    const DURATION = 2200;

    function frame(now) {
        const t = now - start;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const fade = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4));
        for (const p of parts) {
            p.vy += 0.32; // gravity
            p.vx *= 0.99; // air
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            ctx.save();
            ctx.globalAlpha = fade;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
            ctx.restore();
        }
        if (t < DURATION) requestAnimationFrame(frame);
        else canvas.remove();
    }
    requestAnimationFrame(frame);
}

// Goals that were below their goal before and are at/above it after.
// `before`/`after` are goal rows ({ id, saved, goal }).
export function newlyFunded(before, after) {
    const prev = new Map(before.map((g) => [g.id, g]));
    return after.filter((g) => {
        const was = prev.get(g.id);
        if (!was) return false;
        const target = Number(g.goal) || 0;
        const wasFunded = target > 0 && Number(was.saved) >= Number(was.goal);
        return target > 0 && !wasFunded && Number(g.saved) >= target;
    });
}
