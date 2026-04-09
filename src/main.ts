import "./style.css";
import typescriptLogo from "./assets/typescript.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import { setupCounter } from "./counter.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<section id="center">
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
    <img src=${viteLogo} class="vite" alt="Vite logo" />
  </div>
  <div>
    <h1>Get started</h1>
    <p>Edit <code>src/main.ts</code> and save to test <code>HMR</code></p>
  </div>
  <button id="counter" type="button" class="counter"></button>
</section>

<div class="ticks"></div>

<section id="next-steps">
  <div id="docs">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#documentation-icon"></use></svg>
    <h2>Documentation</h2>
    <p>Your questions, answered</p>
    <ul>
      <li>
        <a href="https://vite.dev/" target="_blank">
          <img class="logo" src=${viteLogo} alt="" />
          Explore Vite
        </a>
      </li>
      <li>
        <a href="https://www.typescriptlang.org" target="_blank">
          <img class="button-icon" src="${typescriptLogo}" alt="">
          Learn more
        </a>
      </li>
    </ul>
  </div>
  <div id="social">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#social-icon"></use></svg>
    <h2>Connect with us</h2>
    <p>Join the Vite community</p>
    <ul>
      <li><a href="https://github.com/vitejs/vite" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#github-icon"></use></svg>GitHub</a></li>
      <li><a href="https://chat.vite.dev/" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#discord-icon"></use></svg>Discord</a></li>
      <li><a href="https://x.com/vite_js" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#x-icon"></use></svg>X.com</a></li>
      <li><a href="https://bsky.app/profile/vite.dev" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#bluesky-icon"></use></svg>Bluesky</a></li>
    </ul>
  </div>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);

const canvas = document.querySelector<HTMLCanvasElement>("#screen")!;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => DOMMatrix;
};
const app = document.querySelector<HTMLDivElement>("#app")!;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

type Ripple = { x: number; y: number; born: number; hue: number };
const ripples: Ripple[] = [];
const RIPPLE_DURATION = 900;

function paint(now: number) {
  const dpr = window.devicePixelRatio || 1;
  ctx.reset();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (typeof ctx.drawElementImage === "function") {
    const transform = ctx.drawElementImage(app, 0, 0);
    app.style.transform = transform.toString();
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const age = now - r.born;
    if (age >= RIPPLE_DURATION) {
      ripples.splice(i, 1);
      continue;
    }
    const t = age / RIPPLE_DURATION;
    const radius = 20 + t * 220;
    const alpha = 1 - t;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `hsla(${r.hue}, 100%, 65%, ${alpha})`;
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.shadowColor = `hsla(${r.hue}, 100%, 70%, ${alpha})`;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

(canvas as HTMLCanvasElement & { onpaint: ((this: HTMLCanvasElement) => void) | null }).onpaint = () => {
  paint(performance.now());
};

function tick(now: number) {
  if (ripples.length > 0) paint(now);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

document.querySelector<HTMLButtonElement>("#counter")!.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  ripples.push({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    born: performance.now(),
    hue: Math.floor(Math.random() * 360),
  });
});

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
