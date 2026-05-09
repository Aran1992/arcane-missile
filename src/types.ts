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

