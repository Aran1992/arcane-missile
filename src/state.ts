import { Application, Container } from 'pixi.js';
import type { Bullet, Enemy, GameCtx } from './types';
import { getConfig } from './configLoader';

const cfg = getConfig();

// ======================== 常量 ========================
export const GAME_W = 720;
export const GAME_H = 1280;
export const PLAYER_Y = GAME_H - 80;
export const PLAYER_W = cfg.player.size;
export const PLAYER_H = cfg.player.size;

// ======================== 可变游戏状态 ========================
export const ctx: GameCtx = {
  hp: cfg.player.maxHP,
  maxHP: cfg.player.maxHP,
  fireRate: cfg.bullet.fireRate,
  volley: cfg.bullet.volley,
  burst: cfg.bullet.burst,
  spread: cfg.bullet.spread,
  pierce: cfg.bullet.pierce,
  bDmg: cfg.bullet.damage,
  bSpeed: cfg.bullet.speed,
  bSize: cfg.bullet.size,
  split: cfg.bullet.split,
  splitN: cfg.bullet.splitN,
  splitDmg: cfg.bullet.splitDmg,
  splitSz: cfg.bullet.splitSz,
  explode: cfg.bullet.explode,
  explR: cfg.bullet.explR,
  explDmgR: cfg.bullet.explDmgR,
  cd: 0,
  picked: new Set<string>(),
  time: 0,
  waveInt: cfg.enemy.waveInterval,
  waveCnt: cfg.enemy.waveCount,
  hpMult: 1,
  lvl: 1,
  exp: 0,
  needExp: cfg.exp.base,
  kills: 0,
};

export function resetCtx() {
  Object.assign(ctx, {
    hp: cfg.player.maxHP,
    maxHP: cfg.player.maxHP,
    fireRate: cfg.bullet.fireRate,
    volley: cfg.bullet.volley,
    burst: cfg.bullet.burst,
    spread: cfg.bullet.spread,
    pierce: cfg.bullet.pierce,
    bDmg: cfg.bullet.damage,
    bSpeed: cfg.bullet.speed,
    bSize: cfg.bullet.size,
    split: cfg.bullet.split,
    splitN: cfg.bullet.splitN,
    splitDmg: cfg.bullet.splitDmg,
    splitSz: cfg.bullet.splitSz,
    explode: cfg.bullet.explode,
    explR: cfg.bullet.explR,
    explDmgR: cfg.bullet.explDmgR,
    cd: 0,
    picked: new Set<string>(),
    time: 0,
    waveInt: cfg.enemy.waveInterval,
    waveCnt: cfg.enemy.waveCount,
    hpMult: 1,
    lvl: 1,
    exp: 0,
    needExp: cfg.exp.base,
    kills: 0,
  });
}

export let bullets: Bullet[] = [];
export let enemies: Enemy[] = [];
export let nextId = 0;
export let gameOver = false;
export let paused = false;
export let waveTimer = 2;
export let bossSpawned = false;

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
  resetCtx();
  gameOver = false;
  paused = false;
  waveTimer = 2;
  bossSpawned = false;
  nextId = 0;
}
