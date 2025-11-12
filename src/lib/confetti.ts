type ConfettiOptions = {
  count?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  gravity?: number;
  duration?: number;
};

type Particle = {
  x: number;
  y: number;
  angle: number;
  velocity: number;
  life: number;
  ttl: number;
  color: string;
  size: number;
  spin: number;
  spinSpeed: number;
};

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let frame: number | null = null;
let particles: Particle[] = [];
let running = false;
let endTime = 0;
let gravityValue = 0.35;
let fireworkBursts: Array<{ x: number; y: number; trigger: number }> = [];
const DEFAULT_COLORS = ['#10b981', '#34d399', '#a7f3d0', '#ecfeff', '#fde68a'];

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const setupCanvas = () => {
  if (typeof document === 'undefined') return false;
  if (canvas && ctx) return true;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'fixed';
  canvas.style.pointerEvents = 'none';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '999';
  const context = canvas.getContext('2d');
  if (!context) return false;
  ctx = context;
  document.body.appendChild(canvas);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  return true;
};

const resizeCanvas = () => {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.getContext('2d')?.scale(dpr, dpr);
};

const teardownCanvas = () => {
  if (frame) {
    cancelAnimationFrame(frame);
    frame = null;
  }
  window.removeEventListener('resize', resizeCanvas);
  if (canvas?.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
  canvas = null;
  ctx = null;
  particles = [];
  running = false;
};

const step = () => {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const now = performance.now();

  fireworkBursts = fireworkBursts.filter((burst) => {
    if (now >= burst.trigger) {
      particles = particles.concat(generateFirework(burst.x, burst.y));
      return false;
    }
    return true;
  });

  particles = particles.filter((p) => p.life < p.ttl);

  if ((particles.length === 0 && now > endTime) || now > endTime + 200) {
    teardownCanvas();
    return;
  }

  particles.forEach((particle) => {
    particle.life += 16;
    particle.x += Math.cos(particle.angle) * particle.velocity;
    particle.y += Math.sin(particle.angle) * particle.velocity + gravityValue;
    particle.velocity *= 0.992;
    particle.spin += particle.spinSpeed;

    ctx!.save();
    ctx!.translate(particle.x, particle.y);
    ctx!.rotate(particle.spin);
    ctx!.fillStyle = particle.color;
    ctx!.globalAlpha = 1 - particle.life / particle.ttl;
    ctx!.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx!.restore();
  });

  frame = requestAnimationFrame(step);
};

const generateFirework = (x: number, y: number) => {
  return Array.from({ length: 90 }).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 6 + Math.random() * 7;
    const ttl = 900 + Math.random() * 600;
    return {
      x,
      y,
      angle,
      velocity,
      life: 0,
      ttl,
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      size: 6 + Math.random() * 5,
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.4,
    };
  });
};

export const confettiBurst = ({
  count = 80,
  origin = { x: 0.5, y: 0.4 },
  colors = DEFAULT_COLORS,
  gravity = 0.35,
  duration = 1200,
}: ConfettiOptions = {}) => {
  if (typeof window === 'undefined' || prefersReducedMotion()) {
    return;
  }

  if (!setupCanvas() || !canvas || !ctx) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const originX = rect.width * origin.x;
  const originY = rect.height * origin.y;

  endTime = performance.now() + duration;
  gravityValue = gravity;
  fireworkBursts = [];

  const burstCount = Math.round(count / 4);

  particles = particles.concat(
    Array.from({ length: count }).map(() => {
      const angle = (Math.random() - 0.5) * Math.PI * 1.6;
      const velocity = 7 + Math.random() * 7;
      const ttl = 900 + Math.random() * 600;
      return {
        x: originX + (Math.random() - 0.5) * 80,
        y: originY,
        angle,
        velocity,
        life: 0,
        ttl,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 6,
        spin: Math.random() * Math.PI,
        spinSpeed: (Math.random() - 0.5) * 0.45,
      };
    })
  );

  // Additional bursts from corners for fullness
  const bursts = [
    { x: rect.width * 0.1, y: rect.height * 0.15 },
    { x: rect.width * 0.9, y: rect.height * 0.15 },
    { x: rect.width * 0.25, y: rect.height * 0.45 },
    { x: rect.width * 0.75, y: rect.height * 0.45 },
  ];

  bursts.forEach((burst) => {
    particles = particles.concat(
      Array.from({ length: burstCount }).map(() => {
        const angle = Math.random() * Math.PI;
        const velocity = 8 + Math.random() * 8;
        const ttl = 900 + Math.random() * 700;
        return {
          x: burst.x,
          y: burst.y,
          angle: angle - Math.PI / 2,
          velocity,
          life: 0,
          ttl,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 6 + Math.random() * 6,
          spin: Math.random() * Math.PI,
          spinSpeed: (Math.random() - 0.5) * 0.4,
        };
      })
    );
  });

  particles.forEach((particle) => {
    particle.velocity += Math.random() * 0.5;
    particle.angle += (Math.random() - 0.5) * 0.4;
    particle.ttl += Math.random() * 180;
  });

  const baseTime = performance.now();
  fireworkBursts.push(
    { x: rect.width * 0.25, y: rect.height * 0.25, trigger: baseTime + 500 },
    { x: rect.width * 0.75, y: rect.height * 0.28, trigger: baseTime + 800 },
    { x: rect.width * 0.5, y: rect.height * 0.22, trigger: baseTime + 1050 }
  );

  if (typeof window !== 'undefined' && !prefersReducedMotion()) {
    const audio = new Audio('/sounds/medieval-fanfare-6826.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  }

  if (!running) {
    running = true;
    frame = requestAnimationFrame(step);
  }
};

export default confettiBurst;


