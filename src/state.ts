import { Application, Container } from 'pixi.js';
import type { Bullet, Enemy } from './types';

// ======================== 常量 ========================
export const GAME_W = 720;
export const GAME_H = 1280;
export const PLAYER_Y = GAME_H - 80;
export const PLAYER_W = 40;
export const PLAYER_H = 40;
export const EXP_BASE = 100;
export const EXP_PER_LEVEL = 50;
export const BOSS_SPAWN = 180;

// ======================== 可变游戏状态 ========================
export const ctx: Record<string, any> = {
  hp: 5,
  maxHP: 5,
  fireRate: 2,
  volley: 1,
  burst: 1,
  spread: 0.15,
  pierce: 0,
  bDmg: 10,
  bSpeed: 600,
  bSize: 10,
  split: false,
  splitN: 0,
  splitDmg: 0.5,
  splitSz: 0.6,
  explode: false,
  explR: 60,
  explDmgR: 0.5,
  cd: 0,
  picked: new Set<string>(),
  time: 0,
  waveInt: 3,
  waveCnt: 2,
  hpMult: 1,
  lvl: 1,
  exp: 0,
  needExp: EXP_BASE,
  kills: 0,
};

export let bullets: Bullet[] = [];
export let enemies: Enemy[] = [];
export let nextId = 0;
export let gameOver = false;
export let paused = false;
export let waveTimer = 2;
export let bossSpawned = false;

// PixiJS 运行时引用（初始化后设置）
export let app: Application | null = null;
export let gameLayer: Container | null = null;
export let uiLayer: Container | null = null;

export function setApp(a: Application) {
  app = a;
}
export function setGameLayer(g: Container) {
  gameLayer = g;
}
export function setUiLayer(u: Container) {
  uiLayer = u;
}

export function genId(): number {
  return ++nextId;
}

export function setPaused(v: boolean) {
  paused = v;
}
export function setGameOver(v: boolean) {
  gameOver = v;
}
export function setWaveTimer(v: number) {
  waveTimer = v;
}
export function setBossSpawned(v: boolean) {
  bossSpawned = v;
}

// 重置状态（重新开始用）
export function resetState() {
  bullets.forEach((b) => {
    b.alive = false;
    if (gameLayer && b.g.parent) gameLayer.removeChild(b.g);
  });
  enemies.forEach((e) => {
    e.alive = false;
    if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
  });
  bullets = [];
  enemies = [];
  Object.assign(ctx, {
    hp: 5,
    maxHP: 5,
    fireRate: 2,
    volley: 1,
    burst: 1,
    spread: 0.15,
    pierce: 0,
    bDmg: 10,
    bSpeed: 600,
    bSize: 10,
    split: false,
    splitN: 0,
    splitDmg: 0.5,
    splitSz: 0.6,
    explode: false,
    explR: 60,
    explDmgR: 0.5,
    cd: 0,
    picked: new Set<string>(),
    time: 0,
    waveInt: 3,
    waveCnt: 2,
    hpMult: 1,
    lvl: 1,
    exp: 0,
    needExp: EXP_BASE,
    kills: 0,
  });
  gameOver = false;
  paused = false;
  waveTimer = 2;
  bossSpawned = false;
  nextId = 0;
}
