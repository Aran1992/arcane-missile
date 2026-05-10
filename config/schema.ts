// ===== 配置类型定义 =====

export interface PlayerConfig {
  hp: number;
  maxHP: number;
  size: number;
}

export interface BulletConfig {
  damage: number;
  speed: number;
  size: number;
  life: number;
  fireRate: number;
  volley: number;
  burst: number;
  burstInterval: number;
  spread: number;
  pierce: number;
  split: boolean;
  splitN: number;
  splitDmg: number;
  splitSz: number;
  explode: boolean;
  explR: number;
  explDmgR: number;
}

export interface WallConfig {
  hp: number;
  /** 每波额外增加的围墙HP */
  hpPerWave: number;
}

export interface EnemyTypeConfig {
  id: string;
  hp: number;
  speed: number;
  dmg: number;
  size: number;
  score: number;
  color: string;
}

export interface EnemySpawningConfig {
  /** 总波数 */
  totalWaves: number;
  /** 第一波敌人数 */
  waveBaseCount: number;
  /** 每波额外增加的敌人数 */
  waveCountGrowth: number;
  /** 每波敌人HP倍率增长 */
  hpGrowth: number;
  /** 每波敌人速度倍率增长 */
  speedGrowth: number;
  /** 每个围墙前敌人每秒对围墙造成的伤害 */
  wallDps: number;
  /** 每个波次解锁的敌人类型索引, 值=wave需要>=该值才出现 */
  unlockAtWave: number[];
  types: EnemyTypeConfig[];
}

export interface ExpConfig {
  base: number;
  perLevel: number;
}

export interface GameConfig {
  version: string;
  player: PlayerConfig;
  bullet: BulletConfig;
  wall: WallConfig;
  enemy: EnemySpawningConfig;
  exp: ExpConfig;
}
