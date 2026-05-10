import { Graphics } from 'pixi.js';
import type { Enemy, EnemyType } from './types';
import { GAME_W, GAME_H, WALL_Y, enemies, ctx, genId, gameLayer } from './state';
import { getConfig, hexToNum } from './configLoader';

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

/**
 * 根据波数挑选敌人类型。
 * unlockAtWave: 不同敌人在第几波开始出现。
 */
export function pickEnemyType(wave: number): number {
  const cfg = getConfig();
  const unlock = cfg.enemy.unlockAtWave;
  // 找出当前波可用的最高等级敌人索引
  let maxIdx = 0;
  for (let i = unlock.length - 1; i >= 0; i--) {
    if (wave >= unlock[i]) {
      maxIdx = i;
      break;
    }
  }
  // 从可用类型中随机选取（越高级的概率越低）
  const idx = Math.floor(Math.random() * (maxIdx + 1));
  return Math.min(idx, enemyTypes().length - 1);
}

/**
 * 根据波数计算敌人属性乘数
 */
export function waveMultiplier(wave: number): number {
  const cfg = getConfig();
  return 1 + (wave - 1) * cfg.enemy.hpGrowth;
}

export function spawnEnemy(ti: number, wave: number) {
  const t = enemyTypes()[ti];
  if (!t) return;
  const x = 40 + Math.random() * (GAME_W - 80);
  const mul = waveMultiplier(wave);
  const hp = Math.ceil(t.hp * mul);
  const spd = t.speed * (1 + (wave - 1) * getConfig().enemy.speedGrowth);
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
    speed: spd,
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

export function killEnemy(e: Enemy) {
  e.alive = false;
  if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
  ctx.kills++;
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

    // 到达围墙：停下并攻击
    if (e.y + e.size >= WALL_Y) {
      // 趴墙，不继续下落
      e.y = WALL_Y - e.size;
      // 攻击脉冲闪光
      e.phase += dt * 4;
      e.g.tint = Math.sin(e.phase) > 0 ? 0xff6644 : 0xffffff;
    } else {
      let sx = 0;
      if (e.type === 'bat' || e.type === 'bomber') {
        e.phase += dt * 3;
        sx = Math.sin(e.phase) * 40;
      }
      e.x += sx * dt;
      e.y += e.speed * dt;
      e.g.tint = e.hitTimer > 0 ? 0xff4444 : 0xffffff;
    }

    e.g.position.set(e.x, e.y);

    if (e.hitTimer > 0) e.hitTimer -= dt;

    // 超出屏幕底部的敌人移除（理论上到围墙就停了）
    if (e.y > GAME_H + 50) {
      e.alive = false;
      if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) enemies.splice(i, 1);
  }
}
