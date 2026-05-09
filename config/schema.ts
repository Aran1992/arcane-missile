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

export interface EnemyTypeConfig {
  id: string;
  hp: number;
  speed: number;
  dmg: number;
  size: number;
  score: number;
  color: string;
}

export interface DifficultyPhase {
  until: number | null;
  weights: number[];
}

export interface EnemySpawnConfig {
  waveInterval: number;
  waveCount: number;
  hpScalePer2Levels: number;
  bossSpawnTime: number;
  bossHP: number;
  bossSpeed: number;
  bossDmg: number;
  bossSize: number;
  bossScore: number;
  types: EnemyTypeConfig[];
  difficulty: DifficultyPhase[];
}

export interface ExpConfig {
  base: number;
  perLevel: number;
}

export interface GameConfig {
  version: string;
  player: PlayerConfig;
  bullet: BulletConfig;
  enemy: EnemySpawnConfig;
  exp: ExpConfig;
}
