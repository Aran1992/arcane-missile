import { Graphics } from 'pixi.js';
import type { Bullet } from './types';
import {
  GAME_W, GAME_H, PLAYER_Y, bullets, enemies, ctx, genId, gameLayer, app,
} from './state';
import { killEnemy, nearestEnemy } from './enemy';

export function spawnBullet(angleOff: number) {
  if (!gameLayer) return;
  const target = nearestEnemy(GAME_W / 2, PLAYER_Y);
  let vx = 0, vy = -1;
  if (target) {
    const dx = target.x - GAME_W / 2, dy = target.y - PLAYER_Y;
    const d = Math.hypot(dx, dy);
    vx = dx / d; vy = dy / d;
  }
  if (angleOff !== 0) {
    const c = Math.cos(angleOff), s = Math.sin(angleOff);
    const tvx = vx * c - vy * s;
    vy = vx * s + vy * c;
    vx = tvx;
  }
  const g = new Graphics().circle(0, 0, ctx.bSize).fill({ color: 0xf1c40f });
  g.position.set(GAME_W / 2, PLAYER_Y);
  gameLayer.addChild(g as any);
  bullets.push({
    id: genId(),
    x: GAME_W / 2, y: PLAYER_Y,
    vx, vy, speed: ctx.bSpeed, damage: ctx.bDmg, size: ctx.bSize,
    life: 2.5, maxLife: 2.5,
    pierce: ctx.pierce,
    split: ctx.split, splitN: ctx.splitN, splitDmg: ctx.splitDmg, splitSz: ctx.splitSz,
    explode: ctx.explode, explR: ctx.explR, explDmg: ctx.bDmg * ctx.explDmgR,
    g: g as any, alive: true,
  });
}

export function spawnSplit(b: Bullet, hx: number, hy: number) {
  if (!gameLayer) return;
  for (let i = 0; i < b.splitN; i++) {
    const a = (i / b.splitN) * Math.PI * 2 + Math.random() * .5;
    const vx = Math.cos(a), vy = Math.sin(a);
    const g = new Graphics().circle(0, 0, b.size * b.splitSz).fill({ color: 0xf1c40f });
    g.position.set(hx, hy);
    gameLayer.addChild(g as any);
    bullets.push({
      id: genId(), x: hx, y: hy, vx, vy,
      speed: b.speed * .8, damage: b.damage * b.splitDmg, size: b.size * b.splitSz,
      life: 1.5, maxLife: 1.5,
      pierce: 0,
      split: false, splitN: 0, splitDmg: .5, splitSz: .6,
      explode: b.explode, explR: b.explR * .6, explDmg: b.explDmg * b.splitDmg,
      g: g as any, alive: true,
    });
  }
}

export function spawnExplosion(x: number, y: number, r: number, dmg: number) {
  if (!gameLayer || !app) return;
  const ring = new Graphics()
    .circle(0, 0, r).fill({ color: 0xe67e22, alpha: .3 })
    .stroke({ color: 0xf39c12, width: 2 });
  ring.position.set(x, y);
  gameLayer.addChild(ring as any);
  for (const e of enemies) {
    if (!e.alive) continue;
    if (Math.hypot(x - e.x, y - e.y) <= r) {
      e.hp -= dmg;
      if (e.hp <= 0) killEnemy(e);
    }
  }
  let life = .3;
  const ticker = () => {
    life -= .016;
    ring.alpha = life / .3;
    if (life <= 0) {
      app!.ticker.remove(ticker);
      if (gameLayer && ring.parent) gameLayer.removeChild(ring);
    }
  };
  app.ticker.add(ticker);
}

export function updateBullets(dt: number) {
  for (const b of bullets) {
    if (!b.alive) continue;
    b.x += b.vx * b.speed * dt;
    b.y += b.vy * b.speed * dt;
    b.life -= dt;
    b.g.position.set(b.x, b.y);
    if (b.life <= 0 || b.x < -50 || b.x > GAME_W + 50 || b.y < -50 || b.y > GAME_H + 50) {
      b.alive = false;
      if (gameLayer && b.g.parent) gameLayer.removeChild(b.g);
    }
  }
  // 清理死亡子弹
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (!bullets[i].alive) bullets.splice(i, 1);
  }
}
