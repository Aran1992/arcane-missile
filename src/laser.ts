/**
 * 聚焦激光系统
 *
 * 自动瞄准最近的敌人，发射持续光束，每隔一定间隔造成伤害。
 * 状态机：idle → active(持续) → cooldown → idle
 */
import { Graphics } from 'pixi.js';
import { GAME_W, PLAYER_Y, enemies, gameLayer } from './state';
import { showDamageNumber } from './bullet';
import { killEnemy } from './enemy';
import type { Enemy } from './types';

// =========================================
//  激光参数（可直接升级扩展）
// =========================================
const LASER_DURATION = 5; // 持续秒数
const LASER_COOLDOWN = 4; // 冷却秒数
const LASER_INTERVAL = 0.35; // 伤害间隔（秒）
const LASER_DMG = 18; // 每次伤害
const LASER_MAX_RANGE = 800; // 最大锁定距离

// =========================================
//  激光状态
// =========================================
type LaserPhase = 'idle' | 'active' | 'cooldown';

interface LaserState {
  phase: LaserPhase;
  timer: number; // 当前阶段剩余时间
  dmgTimer: number; // 伤害间隔倒计时
  target: Enemy | null;
  /** 光束绘制Graphics */
  beamG: Graphics;
  /** 脉冲粒子Graphics */
  pulseG: Graphics;
  /** 瞄准指示器 */
  aimG: Graphics;
  /** 是否已初始化（Graphics 已加入场景） */
  inited: boolean;
}

const laser: LaserState = {
  phase: 'idle',
  timer: 0,
  dmgTimer: 0,
  target: null,
  beamG: new Graphics(),
  pulseG: new Graphics(),
  aimG: new Graphics(),
  inited: false,
};

export function isLaserActive(): boolean {
  return laser.phase === 'active';
}

/** 获取当前激光目标（用于外部升级可以读取） */
export function getLaserTarget(): Enemy | null {
  return laser.target;
}

/** 初始化：在游戏场景中添加激光的Graphics层 */
export function initLaser(): void {
  if (!gameLayer || laser.inited) return;
  gameLayer.addChild(laser.beamG);
  gameLayer.addChild(laser.pulseG);
  gameLayer.addChild(laser.aimG);
  laser.inited = true;
}

/** 每帧调用 */
export function updateLaser(dt: number): void {
  if (!gameLayer) return;

  // 每帧清空重绘
  laser.beamG.clear();
  laser.pulseG.clear();
  laser.aimG.clear();

  const px = GAME_W / 2;
  const py = PLAYER_Y;

  switch (laser.phase) {
    case 'idle': {
      // 找一个最近的活着的敌人
      const t = nearestAliveEnemy(px, py);
      if (t) {
        laser.target = t;
        laser.phase = 'active';
        laser.timer = LASER_DURATION;
        laser.dmgTimer = 0;
      }
      break;
    }

    case 'active': {
      laser.timer -= dt;
      laser.dmgTimer -= dt;

      // 检查目标是否还活着
      if (!laser.target || !laser.target.alive) {
        const newT = nearestAliveEnemy(px, py);
        if (newT) {
          laser.target = newT;
        } else {
          // 没有敌人了，提前进入冷却
          laser.phase = 'cooldown';
          laser.timer = LASER_COOLDOWN;
          break;
        }
      }

      // ---- 伤害判定 ----
      if (laser.dmgTimer <= 0) {
        laser.dmgTimer = LASER_INTERVAL;
        const t = laser.target;
        if (t && t.alive) {
          t.hp -= LASER_DMG;
          t.hitTimer = 0.12;
          showDamageNumber(t.x, t.y, LASER_DMG, 'laser');
          if (t.hp <= 0) {
            killEnemy(t);
            // 下一帧会自动重新寻敌
          }
        }
      }

      // ---- 绘制光束 ----
      drawBeam(px, py, laser.target);

      // ---- 持续时间结束 ----
      if (laser.timer <= 0) {
        laser.phase = 'cooldown';
        laser.timer = LASER_COOLDOWN;
        laser.target = null;
      }
      break;
    }

    case 'cooldown': {
      laser.timer -= dt;
      // 冷却中画一个很淡的残影 / 瞄准圈
      drawCooldownIndicator(px, py);
      if (laser.timer <= 0) {
        laser.phase = 'idle';
      }
      break;
    }
  }
}

// =========================================
//  绘制函数
// =========================================

function drawBeam(px: number, py: number, target: Enemy | null) {
  if (!target) return;
  const tx = target.x;
  const ty = target.y;

  const beam = laser.beamG;
  const pulse = laser.pulseG;
  const time = performance.now() / 1000;

  // 计算方向和长度
  const dx = tx - px;
  const dy = ty - py;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  // 脉冲呼吸效果
  const breath = 0.88 + 0.12 * Math.sin(time * 2.2);

  // ———— 多层光束 ————

  // ① 外辉光（最宽，最透明）
  beam.moveTo(px, py).lineTo(tx, ty);
  beam.stroke({ width: 16 * breath, color: 0x4488ff, alpha: 0.10 });

  // ② 中辉光
  beam.moveTo(px, py).lineTo(tx, ty);
  beam.stroke({ width: 10 * breath, color: 0x4488ff, alpha: 0.18 });

  // ③ 内辉光（主体颜色）
  beam.moveTo(px, py).lineTo(tx, ty);
  beam.stroke({ width: 6 * breath, color: 0x66bbff, alpha: 0.40 });

  // ④ 核心（亮白）
  beam.moveTo(px, py).lineTo(tx, ty);
  beam.stroke({ width: 2.5 * breath, color: 0xffffff, alpha: 0.85 });

  // ⑤ 能量脉冲粒子（沿光束流动）
  for (let i = 0; i < 6; i++) {
    const offset = ((time * 1.8 + i * 0.167) % 1.0);
    const ex = px + nx * len * offset;
    const ey = py + ny * len * offset;
    const alpha = 1.0 - offset * 0.4; // 越靠近目标越淡（能量消耗感）
    const size = 2.5 + Math.sin(time * 4 + i * 2.1) * 1.2;
    pulse.circle(ex, ey, size);
    pulse.fill({ color: 0xaaeeff, alpha: alpha * 0.7 });
  }

  // ⑥ 目标点高亮圈
  const targetPulse = 0.6 + 0.4 * Math.sin(time * 5);
  beam.circle(tx, ty, 6 + targetPulse * 4);
  beam.fill({ color: 0x66bbff, alpha: 0.25 * targetPulse });
  beam.circle(tx, ty, 2);
  beam.fill({ color: 0xffffff, alpha: 0.8 });

  // ⑦ 玩家端的能量汇聚
  beam.circle(px, py + 6, 8 * breath);
  beam.fill({ color: 0x4488ff, alpha: 0.15 * breath });
  beam.circle(px, py + 6, 3);
  beam.fill({ color: 0x88ddff, alpha: 0.5 * breath });
}

function drawCooldownIndicator(px: number, py: number) {
  const aim = laser.aimG;
  const time = performance.now() / 1000;

  // 冷却中的旋转光环
  const progress = 1 - laser.timer / LASER_COOLDOWN; // 0→1
  const rot = time * 1.5;
  const r1 = 16;
  const r2 = 20;

  // 圆弧进度指示
  const segments = 24;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    if (t > progress) break;
    const a = rot + t * Math.PI * 2;
    const ox = Math.cos(a) * r1;
    const oy = Math.sin(a) * r1;
    aim.circle(px + ox, py + 6 + oy, 1.5);
    aim.fill({ color: 0x4488ff, alpha: 0.25 });
  }

  // 寻找目标指示器（小光圈慢慢旋转）
  if (progress > 0.3) {
    const a2 = rot * 0.5;
    const ox2 = Math.cos(a2) * r2;
    const oy2 = Math.sin(a2) * r2;
    aim.circle(px + ox2, py + 6 + oy2, 2 + Math.sin(time * 3) * 0.5);
    aim.fill({ color: 0x66bbff, alpha: 0.3 });
  }
}

// =========================================
//  辅助函数
// =========================================

function nearestAliveEnemy(ex: number, ey: number): Enemy | null {
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - ex, e.y - ey);
    if (d < bestD && d < LASER_MAX_RANGE) {
      bestD = d;
      best = e;
    }
  }
  return best;
}
