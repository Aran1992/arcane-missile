import { Graphics, Text, TextStyle } from 'pixi.js';
import type { Enemy, EnemyType } from './types';
import { GAME_W, GAME_H, enemies, ctx, genId, gameLayer, app } from './state';
import { updateEXP } from './ui';

export const ENEMY_TYPES: EnemyType[] = [
  { id: 'slime', hp: 20, speed: 60, dmg: 5, size: 14, score: 10, color: 0xe74c3c },
  { id: 'bat', hp: 12, speed: 120, dmg: 3, size: 10, score: 8, color: 0x9b59b6 },
  { id: 'knight', hp: 80, speed: 35, dmg: 10, size: 20, score: 25, color: 0x2c3e50 },
  { id: 'bomber', hp: 30, speed: 90, dmg: 20, size: 14, score: 15, color: 0xe67e22 },
];

export function pickEnemyType(time: number): number {
  if (time < 30) return 0;
  if (time < 60) return Math.random() < 0.6 ? 0 : 1;
  if (time < 90) {
    const r = Math.random();
    if (r < 0.4) return 0;
    if (r < 0.7) return 1;
    return 2;
  }
  const r = Math.random();
  if (r < 0.3) return 0;
  if (r < 0.5) return 1;
  if (r < 0.75) return 2;
  return 3;
}

export function spawnEnemy(ti: number) {
  const t = ENEMY_TYPES[ti];
  const x = 40 + Math.random() * (GAME_W - 80);
  const hp = Math.ceil(t.hp * ctx.hpMult);
  if (!gameLayer) return;
  const g = new Graphics().circle(0, 0, t.size).fill({ color: t.color });
  g.position.set(x, -30);
  gameLayer.addChild(g as any);
  enemies.push({
    id: genId(),
    x,
    y: -30,
    hp,
    maxHP: hp,
    speed: t.speed,
    dmg: t.dmg,
    size: t.size,
    score: t.score,
    color: t.color,
    type: t.id,
    g: g as any,
    alive: true,
    phase: Math.random() * Math.PI * 2,
    hitTimer: 0,
  });
}

export function spawnBoss() {
  const hp = 500 * ctx.hpMult;
  if (!gameLayer) return;
  const g = new Graphics().rect(-20, -20, 40, 40).fill({ color: 0x8e44ad }).stroke({ color: 0xffffff, width: 2 });
  g.position.set(GAME_W / 2, -50);
  gameLayer.addChild(g as any);
  enemies.push({
    id: genId(),
    x: GAME_W / 2,
    y: -50,
    hp,
    maxHP: hp,
    speed: 25,
    dmg: 15,
    size: 40,
    score: 200,
    color: 0x8e44ad,
    type: 'boss',
    g: g as any,
    alive: true,
    phase: 0,
    hitTimer: 0,
  });
}

export function killEnemy(e: Enemy) {
  e.alive = false;
  if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
  ctx.kills++;
  ctx.exp += e.score;

  // 飘分文字
  const ft = new Text({
    text: `+${e.score}`,
    style: new TextStyle({ fontSize: 13, fill: '#ff0', fontFamily: 'monospace' }),
  });
  ft.anchor.set(0.5);
  ft.position.set(e.x, e.y);
  if (gameLayer) gameLayer.addChild(ft as any);
  let ttl = 0.6;
  const ticker = () => {
    ttl -= 0.016;
    ft.alpha = ttl / 0.6;
    ft.y -= 1;
    if (ttl <= 0) {
      if (app) app.ticker.remove(ticker);
      if (gameLayer && ft.parent) gameLayer.removeChild(ft);
    }
  };
  if (app) app.ticker.add(ticker);
  updateEXP();
}

export function nearestEnemy(ex: number, ey: number): Enemy | null {
  let best: Enemy | null = null,
    bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - ex, e.y - ey);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function updateEnemies(dt: number) {
  for (const e of enemies) {
    if (!e.alive) continue;
    let sx = 0;
    if (e.type === 'bat' || e.type === 'bomber') {
      e.phase += dt * 3;
      sx = Math.sin(e.phase) * 40;
    }
    e.x += sx * dt;
    e.y += e.speed * dt;
    e.g.position.set(e.x, e.y);
    if (e.hitTimer > 0) {
      e.hitTimer -= dt;
      e.g.tint = 0xff4444;
    } else if (e.g.tint !== 0xffffff) {
      e.g.tint = 0xffffff;
    }
    if (e.y > GAME_H + 50) {
      e.alive = false;
      if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
    }
  }
  // 使用 splicing 避免全数组重建
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) enemies.splice(i, 1);
  }
}
