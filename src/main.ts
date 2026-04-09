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

type Piece = {
  r: number;
  c: number;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  path: Path2D;
  locked: boolean;
};

const COLS = 4;
const ROWS = 3;
const SNAP_DIST = 22;

let pieceW = 0;
let pieceH = 0;
let pieces: Piece[] = [];
let order: Piece[] = [];
let dragging: Piece | null = null;
let grabDX = 0;
let grabDY = 0;

function buildEdge(
  path: Path2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: number,
) {
  if (type === 0) {
    path.lineTo(x2, y2);
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  // outward perpendicular for clockwise polygon walking
  const px = (dy / L) * type;
  const py = (-dx / L) * type;
  const tabH = L * 0.22;
  const pt = (t: number, h: number) => ({
    x: x1 + dx * t + px * h,
    y: y1 + dy * t + py * h,
  });
  const A = pt(0.35, 0);
  const B = pt(0.18, tabH * 0.7);
  const C = pt(0.22, tabH * 1.15);
  const D = pt(0.5, tabH * 1.25);
  const E = pt(0.78, tabH * 1.15);
  const F = pt(0.82, tabH * 0.7);
  const G = pt(0.65, 0);
  path.lineTo(A.x, A.y);
  path.bezierCurveTo(B.x, B.y, C.x, C.y, D.x, D.y);
  path.bezierCurveTo(E.x, E.y, F.x, F.y, G.x, G.y);
  path.lineTo(x2, y2);
}

function buildPuzzle() {
  pieceW = window.innerWidth / COLS;
  pieceH = window.innerHeight / ROWS;
  // randomized internal edge tabs (±1 from the upper/left piece's perspective)
  const hEdge: number[][] = [];
  const vEdge: number[][] = [];
  for (let r = 0; r < ROWS - 1; r++) {
    hEdge.push(
      Array.from({ length: COLS }, () => (Math.random() < 0.5 ? 1 : -1)),
    );
  }
  for (let r = 0; r < ROWS; r++) {
    vEdge.push(
      Array.from({ length: COLS - 1 }, () => (Math.random() < 0.5 ? 1 : -1)),
    );
  }
  pieces = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const top = r === 0 ? 0 : -hEdge[r - 1][c];
      const bottom = r === ROWS - 1 ? 0 : hEdge[r][c];
      const left = c === 0 ? 0 : -vEdge[r][c - 1];
      const right = c === COLS - 1 ? 0 : vEdge[r][c];
      const sx = c * pieceW;
      const sy = r * pieceH;
      const ex = sx + pieceW;
      const ey = sy + pieceH;
      const path = new Path2D();
      path.moveTo(sx, sy);
      buildEdge(path, sx, sy, ex, sy, top);
      buildEdge(path, ex, sy, ex, ey, right);
      buildEdge(path, ex, ey, sx, ey, bottom);
      buildEdge(path, sx, ey, sx, sy, left);
      path.closePath();
      const dx = (Math.random() - 0.5) * window.innerWidth * 0.7;
      const dy = (Math.random() - 0.5) * window.innerHeight * 0.7;
      pieces.push({ r, c, sx, sy, dx, dy, path, locked: false });
    }
  }
  order = pieces.slice();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

function paint() {
  const dpr = window.devicePixelRatio || 1;
  ctx.reset();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  if (typeof ctx.drawElementImage !== "function") return;

  // Subtle hint of solved board
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.drawElementImage(app, 0, 0);
  ctx.restore();

  for (const p of order) {
    ctx.save();
    ctx.translate(p.dx, p.dy);
    ctx.beginPath();
    ctx.clip(p.path);
    ctx.drawElementImage(app, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(p.dx, p.dy);
    ctx.lineJoin = "round";
    ctx.strokeStyle = p.locked
      ? "rgba(170, 59, 255, 0.95)"
      : "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = p.locked ? 1.2 : 1.6;
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = p === dragging ? 18 : 6;
    ctx.stroke(p.path);
    ctx.restore();
  }
}

function tick() {
  paint();
  requestAnimationFrame(tick);
}

function pickPiece(x: number, y: number): Piece | null {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let found: Piece | null = null;
  for (let i = order.length - 1; i >= 0; i--) {
    const p = order[i];
    if (p.locked) continue;
    if (ctx.isPointInPath(p.path, x - p.dx, y - p.dy)) {
      found = p;
      break;
    }
  }
  ctx.restore();
  return found;
}

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const p = pickPiece(x, y);
  if (!p) return;
  e.preventDefault();
  dragging = p;
  grabDX = x - p.dx;
  grabDY = y - p.dy;
  order = order.filter((q) => q !== p);
  order.push(p);
  canvas.setPointerCapture(e.pointerId);
  document.body.style.userSelect = "none";
  if (window.getSelection) window.getSelection()?.removeAllRanges();
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  dragging.dx = e.clientX - rect.left - grabDX;
  dragging.dy = e.clientY - rect.top - grabDY;
});

canvas.addEventListener("pointerup", (e) => {
  if (!dragging) return;
  if (Math.hypot(dragging.dx, dragging.dy) < SNAP_DIST) {
    dragging.dx = 0;
    dragging.dy = 0;
    dragging.locked = true;
  }
  dragging = null;
  canvas.releasePointerCapture(e.pointerId);
  document.body.style.userSelect = "";
});

resizeCanvas();
buildPuzzle();
window.addEventListener("resize", () => {
  resizeCanvas();
  buildPuzzle();
});
requestAnimationFrame(tick);
