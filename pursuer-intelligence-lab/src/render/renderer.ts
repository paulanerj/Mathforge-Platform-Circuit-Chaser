/**
 * THE RENDERER — close enough to Circuit Climb that judgement transfers.
 *
 * The goal stated in the brief is fidelity of FEEL, not a pixel copy: the
 * tester must be able to watch this and have their reaction mean something
 * about the product. So everything that decides how a pursuit LOOKS is exact —
 * board geometry, column positions, row spacing, platform size, camera anchor,
 * actor radii, the right-angled route, the scroll — and the decoration is a
 * simplification of production's palette rather than a reproduction of its
 * gradients, parallax and particle work.
 *
 * That trade is deliberate and worth stating plainly: an afternoon spent
 * reproducing plasma arcs would buy nothing for the question this lab exists
 * to answer, and the geometry it would have delayed is the part that changes
 * what the pursuer has to solve.
 *
 * Colours below are production's own `COLORS` table, carried across.
 */

import type { Simulation } from '../sim/simulation';
import type { GraphWorld } from '../world/graphWorld';

export const COLORS = {
  bg: '#f0f6fc',
  bgDepth: '#e2eef7',
  structure: '#cbd5e1',
  gridDot: '#cbd5e1',
  platform: '#ffffff',
  platformEdge: '#cbd5e1',
  number: '#0f172a',
  numberDim: '#94a3b8',
  player: '#007bff',
  playerRing: '#00e5ff',
  pursuer: '#ff0000',
  pursuerRing: '#ff2a2a',
  pursuerCore: '#ff8888',
  white: '#ffffff',
};

/** Production's camera: the learner sits at a fixed fraction down the view. */
export function cameraAnchorFor(percent: number): number {
  return 0.585 + (0.615 - 0.585) * ((Math.max(80, Math.min(120, percent)) - 80) / 40);
}

export interface OverlayFlags {
  /** SHOW WHAT THE BOT KNOWS. */
  brainVision: boolean;
  /** The graph the pursuer routes on. */
  graph: boolean;
  /** The learner's physical trail, as the simulation holds it. */
  trail: boolean;
  /** Capture radius and hitboxes. */
  hitboxes: boolean;
}

export const DEFAULT_OVERLAYS: OverlayFlags = {
  brainVision: true, graph: false, trail: true, hitboxes: false,
};

interface Frame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  world: GraphWorld;
  scale: number;
  cameraY: number;
  logicalHeight: number;
  /** The retained sample being reviewed, or null while running live. */
  review: any;
}

function begin(canvas: HTMLCanvasElement, simulation: Simulation, review: any = null): Frame | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const world = simulation.world;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = width / world.logicalWidth;
  const logicalHeight = height / scale;
  const anchorY = review ? review.learner.y : simulation.learner.y;
  const cameraY = anchorY - logicalHeight * cameraAnchorFor(world.percent);
  ctx.save();
  ctx.scale(scale, scale);
  return { ctx, width, height, world, scale, cameraY, logicalHeight, review };
}

const screenY = (frame: Frame, worldY: number) => worldY - frame.cameraY;

/**
 * Draw the CURRENT state, or — when `reviewIndex` is given — a retained
 * sample from earlier in the run.
 *
 * Review is what makes "stop the moment it does something stupid and ask what
 * it knew" possible, and it draws from the recorded sample rather than
 * re-simulating: re-running would be a different run.
 */
export function render(
  canvas: HTMLCanvasElement,
  simulation: Simulation,
  overlays: OverlayFlags,
  reviewIndex: number | null = null,
): void {
  const review = reviewIndex === null ? null : simulation.samples[reviewIndex] ?? null;
  const frame = begin(canvas, simulation, review);
  if (!frame) return;
  const { ctx, world } = frame;

  // ── background ──────────────────────────────────────────────────────────
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, world.logicalWidth, frame.logicalHeight);
  ctx.fillStyle = COLORS.gridDot;
  const gridStep = world.rowGap / 4;
  for (let y = Math.floor(frame.cameraY / gridStep) * gridStep; y < frame.cameraY + frame.logicalHeight; y += gridStep) {
    for (let x = gridStep / 2; x < world.logicalWidth; x += gridStep) {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, screenY(frame, y), 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  // ── platforms ───────────────────────────────────────────────────────────
  for (const row of simulation.board.rows) {
    const y = screenY(frame, row.y);
    if (y < -world.rowGap * 2 || y > frame.logicalHeight + world.rowGap) continue;
    for (const platform of row.platforms) {
      ctx.fillStyle = COLORS.platform;
      ctx.strokeStyle = COLORS.platformEdge;
      ctx.lineWidth = 2;
      const left = platform.x - platform.width / 2;
      ctx.beginPath();
      ctx.roundRect(left, y, platform.width, platform.height, 10);
      ctx.fill();
      ctx.stroke();
      if (platform.value !== null) {
        ctx.fillStyle = COLORS.number;
        ctx.font = '700 22px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(platform.value), platform.x, y + platform.height / 2);
      }
    }
  }

  if (overlays.graph) drawGraph(frame, simulation);
  if (overlays.trail) drawTrail(frame, simulation);
  if (overlays.brainVision) drawBrainVision(frame, simulation);

  // ── the learner's current route, right-angled as production draws it ────
  const travel = frame.review ? null : (simulation.learner as any).travel;
  if (travel) {
    ctx.strokeStyle = 'rgba(0,123,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(travel.path[0].x, screenY(frame, travel.path[0].y));
    for (const point of travel.path.slice(1)) ctx.lineTo(point.x, screenY(frame, point.y));
    ctx.stroke();
  }

  drawPursuer(frame, simulation, overlays);
  drawLearner(frame, simulation, overlays);
  ctx.restore();
}

function drawLearner(frame: Frame, simulation: Simulation, overlays: OverlayFlags) {
  const { ctx, world } = frame;
  const source = frame.review ? frame.review.learner : simulation.learner;
  const y = screenY(frame, source.y);
  ctx.save();
  ctx.translate(source.x, y);
  ctx.shadowColor = COLORS.playerRing;
  ctx.shadowBlur = 24;
  ctx.fillStyle = COLORS.player;
  ctx.strokeStyle = COLORS.playerRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, world.playerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
  if (overlays.hitboxes) {
    ctx.strokeStyle = '#00d000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(source.x, y, world.playerRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPursuer(frame: Frame, simulation: Simulation, overlays: OverlayFlags) {
  const { ctx } = frame;
  const sample = frame.review ?? simulation.samples[simulation.samples.length - 1];
  const position = frame.review ? { x: frame.review.pursuer.x, y: frame.review.pursuer.y } : simulation.rig.position;
  const radius = simulation.rig.radius;
  const y = screenY(frame, position.y);
  const perceiving = sample?.pursuer.perceptionActive ?? false;

  ctx.save();
  ctx.translate(position.x, y);
  // Bright and steady when it can see you; dim and breathing when it cannot.
  // The same tell production uses, and the one thing on screen that lets a
  // tester distinguish "hunting" from "guessing" without opening the overlay.
  const breath = 0.5 + 0.5 * Math.sin(simulation.timebase.elapsedMs / 520);
  ctx.globalAlpha = perceiving ? 1 : 0.68 + breath * 0.12;
  ctx.shadowColor = COLORS.pursuerRing;
  ctx.shadowBlur = perceiving ? 30 : 12 + breath * 10;
  ctx.fillStyle = COLORS.pursuer;
  ctx.strokeStyle = COLORS.pursuerRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.pursuerCore;
  ctx.beginPath();
  ctx.arc(0, 0, radius * (perceiving ? 0.5 : 0.3 + breath * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (overlays.hitboxes) {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(position.x, y, radius + frame.world.playerRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTrail(frame: Frame, simulation: Simulation) {
  const { ctx } = frame;
  const trail = (simulation as any).trail?.snapshot?.(simulation.timebase.elapsedMs);
  if (!trail) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,123,255,0.18)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const segment of trail.segments) {
    const points = trail.points.slice(segment.startIndex, segment.endIndex + 1);
    if (points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(points[0].x, screenY(frame, points[0].y));
    for (const point of points.slice(1)) ctx.lineTo(point.x, screenY(frame, point.y));
    ctx.stroke();
  }
  ctx.restore();
}

function drawGraph(frame: Frame, simulation: Simulation) {
  const { ctx } = frame;
  const graph = simulation.rig.graph;
  ctx.save();
  ctx.strokeStyle = 'rgba(120,140,170,0.35)';
  ctx.lineWidth = 1;
  for (const edge of graph.edges) {
    const a = graph.nodes.get(edge.from);
    const b = graph.nodes.get(edge.to);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, screenY(frame, a.y));
    ctx.lineTo(b.x, screenY(frame, b.y));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(90,110,140,0.5)';
  for (const node of graph.nodes.values()) {
    ctx.beginPath();
    ctx.arc(node.x, screenY(frame, node.y), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * SHOW WHAT THE BOT KNOWS.
 *
 * Everything here is drawn from what the pursuer was actually given — the
 * perception snapshot, the Brain's own introspection, the route the chassis is
 * following. The one exception is the true learner marker, which is drawn from
 * simulation truth and labelled as debug-only.
 *
 * Drawing something does not give the Brain access to it. The overlay reads
 * the same recorded sample a diagnostic export would, after the decision was
 * taken; there is no path from here back into a Brain.
 */
function drawBrainVision(frame: Frame, simulation: Simulation) {
  const { ctx } = frame;
  const sample = frame.review ?? simulation.samples[simulation.samples.length - 1];
  if (!sample) return;
  const position = { x: sample.pursuer.x, y: sample.pursuer.y };
  const py = screenY(frame, position.y);

  // Perception region.
  const drawn = sample.pursuer.perceptionActive ? 'rgba(255,64,64,0.5)' : 'rgba(120,140,170,0.35)';
  const senseRadius = simulation.perceptionRadius;
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = drawn;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(position.x, py, senseRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // The planned route through the graph.
  const graph = simulation.rig.graph;
  if (sample.pursuer.routeNodes.length > 1) {
    ctx.strokeStyle = 'rgba(255,140,0,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let started = false;
    for (const id of sample.pursuer.routeNodes) {
      const node = graph.nodes.get(id);
      if (!node) continue;
      if (!started) { ctx.moveTo(node.x, screenY(frame, node.y)); started = true; }
      else ctx.lineTo(node.x, screenY(frame, node.y));
    }
    ctx.stroke();
  }

  // The believed target.
  if (sample.pursuer.target) {
    const ty = screenY(frame, sample.pursuer.target.y);
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sample.pursuer.target.x, ty, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sample.pursuer.target.x - 20, ty);
    ctx.lineTo(sample.pursuer.target.x + 20, ty);
    ctx.moveTo(sample.pursuer.target.x, ty - 20);
    ctx.lineTo(sample.pursuer.target.x, ty + 20);
    ctx.stroke();
  }

  // Belief nodes, where the Brain has any.
  ctx.fillStyle = 'rgba(201,166,255,0.85)';
  for (const id of sample.pursuer.beliefNodes) {
    const node = graph.nodes.get(id);
    if (!node) continue;
    ctx.beginPath();
    ctx.arc(node.x, screenY(frame, node.y), 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // DEBUG ONLY: where the learner truly is. The Brain never sees this.
  ctx.strokeStyle = 'rgba(0,160,0,0.6)';
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(position.x, py);
  ctx.lineTo(sample.learner.x, screenY(frame, sample.learner.y));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
