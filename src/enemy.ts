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
 * 根据敌人类型索引获取type id
 */
export function enemyTypeOf(ti: number): string {
  const t = getConfig().enemy.types[ti];
  return t ? t.id : '';
}

/**
 * 根据波数挑选敌人类型。
 * unlockAtWave: 不同敌人在第几波开始出现。
 */
export function pickEnemyType(wave: number): number {
  const cfg = getConfig();
  const unlock = cfg.enemy.unlockAtWave;
  let maxIdx = 0;
  for (let i = unlock.length - 1; i >= 0; i--) {
    if (wave >= unlock[i]) {
      maxIdx = i;
      break;
    }
  }
  return Math.min(maxIdx, Math.floor(Math.random() * (maxIdx + 1)));
}

/**
 * 创建敌人Graphics（不同造型）
 */
function createEnemyGraphic(size: number, color: number, type: string): Graphics {
  const g = new Graphics();
  if (type === 'swarm') {
    // 菱形
    g.moveTo(0, -size).lineTo(size, 0).lineTo(0, size).lineTo(-size, 0).closePath().fill({ color });
  } else if (type === 'splitter') {
    // 八边形
    const s = size;
    g.moveTo(0, -s)
      .lineTo(s * 0.7, -s * 0.7).lineTo(s, 0).lineTo(s * 0.7, s * 0.7)
      .lineTo(0, s).lineTo(-s * 0.7, s * 0.7).lineTo(-s, 0).lineTo(-s * 0.7, -s * 0.7)
      .closePath().fill({ color });
    g.circle(0, 0, s * 0.35).fill({ color: 0xffffff, alpha: 0.3 });
  } else if (type === 'mother') {
    // 六边形 + 核心
    const r = size;
    g.moveTo(0, -r);
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath().fill({ color });
    g.circle(0, 0, r * 0.4).fill({ color: 0xffffff, alpha: 0.15 });
    g.circle(0, 0, r * 0.2).fill({ color: 0xffffff, alpha: 0.3 });
  } else if (type === 'shielder') {
    // 圆形身体 + 前方半弧盾牌
    g.circle(0, 0, size).fill({ color });
    // 盾牌半弧（朝下/朝玩家方向，即π/2方向）
    const shieldR = size * 1.1;
    g.arc(0, 0, shieldR, (Math.PI * 1) / 6, (Math.PI * 5) / 6).stroke({ color: 0xaadfff, width: 3 });
    // 盾面填充（半透明）
    g.arc(0, 0, shieldR * 0.9, (Math.PI * 1) / 6, (Math.PI * 5) / 6).fill({ color: 0xaadfff, alpha: 0.15 });
    // 中心高光
    g.circle(0, 0, size * 0.3).fill({ color: 0xffffff, alpha: 0.2 });
  }
  return g;
}

/**
 * 生成单个敌人
 */
export function spawnEnemy(ti: number, wave: number) {
  const t = enemyTypes()[ti];
  if (!t) return;
  const margin = t.size + 10;
  const x = margin + Math.random() * (GAME_W - margin * 2);
  const mul = 1 + (wave - 1) * getConfig().enemy.hpGrowth;
  const hp = Math.ceil(t.hp * mul);
  const spd = t.speed * (1 + (wave - 1) * getConfig().enemy.speedGrowth);
  if (!gameLayer) return;

  const g = createEnemyGraphic(t.size, t.color, t.id);
  g.position.set(x, -30);
  gameLayer.addChild(g);

  enemies.push({
    id: genId(),
    x, y: -30,
    hp, maxHP: hp,
    speed: spd, dmg: t.dmg,
    size: t.size, score: t.score,
    color: t.color, type: t.id,
    g, alive: true,
    phase: Math.random() * Math.PI * 2,
    hitTimer: 0,
    isMini: t.id === 'swarm',
    spawnTimer: 2.5,
    spawnInterval: 2.5,
    splitCount: t.id === 'splitter' ? 6 + Math.floor(Math.random() * 3) : 0,
    shieldBroken: false,
  });
}

/**
 * 群蜂群组：一次出一簇
 */
export function spawnSwarmGroup(ti: number, wave: number, count: number) {
  const t = enemyTypes()[ti];
  if (!t) return;
  const mul = 1 + (wave - 1) * getConfig().enemy.hpGrowth;
  const baseHp = Math.ceil(t.hp * mul);
  const baseSpd = t.speed * (1 + (wave - 1) * getConfig().enemy.speedGrowth);
  if (!gameLayer) return;

  const cx = 40 + Math.random() * (GAME_W - 80);

  for (let i = 0; i < count; i++) {
    const hp = baseHp + Math.floor(Math.random() * 3);
    const spd = baseSpd * (0.85 + Math.random() * 0.3);
    const sz = t.size * (0.8 + Math.random() * 0.4);
    const ox = (Math.random() - 0.5) * 70;
    const oy = -30 - Math.random() * 15;

    const g = createEnemyGraphic(sz, t.color, t.id);
    g.position.set(cx + ox, oy);
    gameLayer.addChild(g);

    enemies.push({
      id: genId(),
      x: cx + ox, y: oy,
      hp, maxHP: hp,
      speed: spd, dmg: t.dmg,
      size: sz,
      score: Math.ceil(t.score * (sz / t.size)),
      color: t.color, type: t.id,
      g, alive: true,
      phase: Math.random() * Math.PI * 2,
      hitTimer: 0,
      isMini: true,
      spawnTimer: 0, spawnInterval: 0,
      splitCount: 0,
      shieldBroken: false,
    });
  }
}

/**
 * 分裂怪死亡：爆出小分裂体
 */
function spawnSplitMinis(x: number, y: number, count: number) {
  if (!gameLayer) return;
  for (let i = 0; i < count; i++) {
    const sz = 5 + Math.random() * 2;
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const dist = 10 + Math.random() * 15;
    const g = new Graphics().circle(0, 0, sz).fill({ color: 0x1abc9c });
    g.position.set(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
    gameLayer.addChild(g);
    enemies.push({
      id: genId(),
      x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
      hp: 2, maxHP: 2,
      speed: 80 + Math.random() * 60,
      dmg: 1, size: sz, score: 1,
      color: 0x1abc9c, type: 'sp_mini',
      g, alive: true,
      phase: Math.random() * Math.PI * 2,
      hitTimer: 0,
      isMini: true,
      spawnTimer: 0, spawnInterval: 0,
      splitCount: 0,
      shieldBroken: false,
    });
  }
}

/**
 * 母体产仔
 */
function spawnMotherChildren(e: Enemy) {
  if (!gameLayer) return;
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const sz = 5 + Math.random() * 2;
    const g = new Graphics()
      .moveTo(0, -sz).lineTo(sz * 0.6, sz * 0.8).lineTo(-sz * 0.6, sz * 0.8).closePath()
      .fill({ color: 0xff6b6b });
    const ox = (Math.random() - 0.5) * 20;
    const oy = (Math.random() - 0.5) * 10;
    g.position.set(e.x + ox, e.y + oy);
    gameLayer.addChild(g);
    enemies.push({
      id: genId(),
      x: e.x + ox, y: e.y + oy,
      hp: 4, maxHP: 4,
      speed: 120 + Math.random() * 40,
      dmg: 1, size: sz, score: 2,
      color: 0xff6b6b, type: 'swarm',
      g, alive: true,
      phase: Math.random() * Math.PI * 2,
      hitTimer: 0,
      isMini: true,
      spawnTimer: 0, spawnInterval: 0,
      splitCount: 0,
      shieldBroken: false,
    });
  }
}

export function killEnemy(e: Enemy) {
  e.alive = false;
  if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
  ctx.kills++;

  // 分裂怪：死亡爆小分裂体
  if (e.type === 'splitter' && e.splitCount > 0) {
    const sc = e.splitCount - Math.floor(Math.random() * 2);
    spawnSplitMinis(e.x, e.y, sc);
  }
}

export function nearestEnemy(ex: number, ey: number): Enemy | null {
  let best: Enemy | null = null, bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - ex, e.y - ey);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

export function updateEnemies(dt: number) {
  for (const e of enemies) {
    if (!e.alive) continue;

    // 母体产仔
    if (e.type === 'mother') {
      e.spawnTimer -= dt;
      if (e.spawnTimer <= 0) {
        e.spawnTimer = e.spawnInterval + Math.random() * 1.0;
        spawnMotherChildren(e);
      }
    }

    // 到达围墙：停下并攻击
    if (e.y + e.size >= WALL_Y) {
      e.y = WALL_Y - e.size;
      e.phase += dt * 4;
      e.g.tint = Math.sin(e.phase) > 0 ? 0xff6644 : 0xffffff;
    } else {
      let sx = 0;
      if (e.type === 'bat' || e.type === 'bomber') {
        e.phase += dt * 3;
        sx = Math.sin(e.phase) * 50;
      }
      if (e.type === 'swarm' || e.type === 'sp_mini') {
        e.phase += dt * 5;
        sx = Math.sin(e.phase) * 30;
        e.y += e.speed * dt * 1.15; // swarm slightly faster
      } else {
        e.y += e.speed * dt;
      }
      e.x += sx * dt;
      e.g.tint = e.hitTimer > 0 ? 0xff4444 : 0xffffff;
    }

    e.g.position.set(e.x, e.y);
    if (e.hitTimer > 0) e.hitTimer -= dt;
    if (e.y > GAME_H + 50) {
      e.alive = false;
      if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) enemies.splice(i, 1);
  }
}
