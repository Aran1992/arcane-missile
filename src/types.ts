import { Graphics } from 'pixi.js';

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  size: number;
  life: number;
  maxLife: number;
  pierce: number;
  split: boolean;
  splitN: number;
  splitDmg: number;
  splitSz: number;
  explode: boolean;
  explR: number;
  explDmg: number;
  g: Graphics;
  alive: boolean;
  hitIds: Set<number>;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHP: number;
  speed: number;
  dmg: number;
  size: number;
  score: number;
  color: number;
  type: string;
  g: Graphics;
  alive: boolean;
  phase: number;
  hitTimer: number;
  /** swarm类小怪标记，用于碰撞优化 */
  isMini: boolean;
  /** 母体产仔计时器（秒） */
  spawnTimer: number;
  /** 母体产仔间隔（秒） */
  spawnInterval: number;
  /** 分裂怪：死亡时分裂的数量 */
  splitCount: number;
  /** 盾牌兵：盾牌是否已碎 */
  shieldBroken: boolean;
}

export interface EnemyType {
  id: string;
  hp: number;
  speed: number;
  dmg: number;
  size: number;
  score: number;
  color: number;
}

export interface GameCtx {
  hp: number;
  maxHP: number;
  fireRate: number;
  volley: number;
  burst: number;
  spread: number;
  pierce: number;
  bDmg: number;
  bSpeed: number;
  bSize: number;
  split: boolean;
  splitN: number;
  splitDmg: number;
  splitSz: number;
  explode: boolean;
  explR: number;
  explDmgR: number;
  cd: number;
  picked: Set<string>;
  kills: number;
  wallHP: number;
  maxWallHP: number;
  currentWave: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  rarity: 'common' | 'rare' | 'epic';
  unique: boolean;
  /** 前置升级id，需要先pick此升级后才出现 */
  prerequisite?: string;
  fn: () => void;
}
