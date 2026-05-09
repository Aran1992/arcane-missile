import { Graphics } from 'pixi.js';
import type { Enemy, EnemyType } from './types';
import { GAME_W, GAME_H, enemies, ctx, genId, gameLayer } from './state';
import { getConfig, hexToNum } from './configLoader';
import { updateEXP } from './ui';

let _enemyTypes: EnemyType[] | null = null;

function enemyTypes(): EnemyType[] {
  if (_enemyTypes) return _enemyTypes;
  const cfg = getConfig();
  _enemyTypes = cfg.enemy.types.map((t) => ({
    id: t.id,
    hp: t.hp,
    speed: t.speed,
    dmg: t.dmg,
    size: t.size,
    score: t.score,
    color: hexToNum(t.color),
  }));
  return _enemyTypes;
}

export function pickEnemyType(time: number): number {
  const cfg = getConfig();
  const phases = cfg.enemy.difficulty;
  let phase = phases[phases.length - 1];
  for (const p of phases) {
    if (p.until === null || time < p.until) {
      phase = p;
      break;
    }
  }
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < phase.weights.length; i++) {
    cum += phase.weights[i];
    if (r < cum) return Math.min(i, enemyTypes().length - 1);
  }
  return enemyTypes().length - 1;
}

export function spawnEnemy(ti: number) {
  const t = enemyTypes()[ti];
  if (!t) return;
  const x = 40 + Math.random() * (GAME_W - 80);
  const hp = Math.ceil(t.hp * ctx.hpMult);
  if (!gameLayer) return;
  const g = new Graphics().circle(0, 0, t.size).fill({ color: t.color });
  g.position.set(x, -30);
  gameLayer.addChild(g);
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
    g,
    alive: true,
    phase: Math.random() * Math.PI * 2,
    hitTimer: 0,
  });
}

export function spawnBoss() {
  const cfg = getConfig();
  const hp = cfg.enemy.bossHP * ctx.hpMult;
  if (!gameLayer) return;
  const g = new Graphics().rect(-20, -20, 40, 40).fill({ color: 0x8e44ad }).stroke({ color: 0xffffff, width: 2 });
  g.position.set(GAME_W / 2, -50);
  gameLayer.addChild(g);
  enemies.push({
    id: genId(),
    x: GAME_W / 2,
    y: -50,
    hp,
    maxHP: hp,
    speed: cfg.enemy.bossSpeed,
    dmg: cfg.enemy.bossDmg,
    size: cfg.enemy.bossSize,
    score: cfg.enemy.bossScore,
    color: 0x8e44ad,
    type: 'boss',
    g,
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
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) enemies.splice(i, 1);
  }
}
