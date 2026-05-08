import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import './style.css';

// ======================== 常量 ========================
const GAME_W = 1280;
const GAME_H = 720;
const PLAYER_Y = GAME_H - 80;
const PLAYER_W = 40;
const PLAYER_H = 40;
const EXP_BASE = 100;
const EXP_PER_LEVEL = 50;
const BOSS_SPAWN = 180;

// ======================== 类型 ========================
interface Bullet {
  id: number; x: number; y: number; vx: number; vy: number;
  speed: number; damage: number; size: number;
  life: number; maxLife: number; pierce: number;
  split: boolean; splitN: number; splitDmg: number; splitSz: number;
  explode: boolean; explR: number; explDmg: number;
  g: Graphics; alive: boolean;
}
interface Enemy {
  id: number; x: number; y: number;
  hp: number; maxHP: number; speed: number; dmg: number;
  size: number; score: number; color: number; type: string;
  g: Graphics; alive: boolean; phase: number;
}

// ======================== 游戏状态 ========================
const ctx: Record<string, any> = {
  hp: 5, maxHP: 5,
  fireRate: 2, volley: 1, burst: 1, spread: 0.15, pierce: 0,
  bDmg: 10, bSpeed: 600, bSize: 10,
  split: false, splitN: 0, splitDmg: 0.5, splitSz: 0.6,
  explode: false, explR: 60, explDmgR: 0.5,
  cd: 0, picked: new Set<string>(),
  time: 0, waveInt: 3, waveCnt: 2, hpMult: 1,
  lvl: 1, exp: 0, needExp: EXP_BASE, kills: 0,
};

// ======================== 游戏对象 ========================
let bullets: Bullet[] = [];
let enemies: Enemy[] = [];
let nextId = 0;
let gameOver = false;
let paused = false;
let waveTimer = 2;
let bossSpawned = false;

// ======================== PixiJS 初始化 ========================
(async () => {
  const app = new Application();
  await app.init({ width: GAME_W, height: GAME_H, backgroundColor: 0x1a1a2e, preference: 'canvas' });
  document.getElementById('app')!.appendChild(app.canvas as HTMLCanvasElement);

  const gameLayer = new Container();
  const uiLayer = new Container();
  app.stage.addChild(gameLayer);
  app.stage.addChild(uiLayer);

  // ---- 玩家 ----
  const playerG = new Graphics()
    .rect(-PLAYER_W / 2, -PLAYER_H / 2, PLAYER_W, PLAYER_H)
    .fill({ color: 0x3498db });
  playerG.position.set(GAME_W / 2, PLAYER_Y);
  gameLayer.addChild(playerG);

  // ---- UI ----
  const hpBg = new Graphics().rect(20, 20, 200, 18).fill({ color: 0x333 });
  const hpFill = new Graphics();
  const expBg = new Graphics().rect(20, 46, 200, 12).fill({ color: 0x333 });
  const expFill = new Graphics();
  const lvlTxt = new Text({ text: 'Lv.1', style: new TextStyle({ fontSize: 14, fill: '#fff', fontFamily: 'monospace' }) });
  lvlTxt.position.set(230, 20);
  const infoTxt = new Text({ text: '', style: new TextStyle({ fontSize: 14, fill: '#ccc', fontFamily: 'monospace' }) });
  infoTxt.position.set(GAME_W - 200, 20);
  uiLayer.addChild(hpBg, hpFill, expBg, expFill, lvlTxt, infoTxt);

  function updateHP() {
    hpFill.clear();
    const r = Math.max(0, ctx.hp / ctx.maxHP);
    hpFill.rect(22, 22, 196 * r, 14).fill({ color: r > .5 ? 0x2ecc71 : r > .25 ? 0xf39c12 : 0xe74c3c });
  }
  function updateEXP() {
    expFill.clear();
    expFill.rect(22, 48, 196 * Math.min(1, ctx.exp / ctx.needExp), 8).fill({ color: 0x9b59b6 });
  }
  updateHP(); updateEXP();

  // ---- 升级弹窗 ----
  const upgContainer = new Container();
  upgContainer.visible = false;
  uiLayer.addChild(upgContainer);

  // ---- 结算 ----
  const overContainer = new Container();
  overContainer.visible = false;
  uiLayer.addChild(overContainer);

  // ======================== 核心逻辑 ========================
  const UPGRADES: any[] = [
    { id: 'dmg', name: '伤害增幅', desc: '伤害 ×1.25', rarity: 'common', unique: false, fn: () => { ctx.bDmg *= 1.25 } },
    { id: 'rate', name: '射速提升', desc: '射速 ×1.15', rarity: 'common', unique: false, fn: () => { ctx.fireRate *= 1.15 } },
    { id: 'volley', name: '齐射 +1', desc: '同时多发1颗', rarity: 'rare', unique: false, fn: () => { ctx.volley += 1 } },
    { id: 'burst', name: '连发 +1', desc: '每颗连发+1', rarity: 'rare', unique: false, fn: () => { ctx.burst += 1 } },
    { id: 'pierce', name: '穿透 +1', desc: '穿透+1个敌人', rarity: 'rare', unique: false, fn: () => { ctx.pierce += 1 } },
    { id: 'split', name: '分裂小子弹', desc: '命中分裂2颗', rarity: 'epic', unique: true, fn: () => { ctx.split = true; ctx.splitN = 2 } },
    { id: 'explode', name: '爆炸', desc: '命中产生爆炸', rarity: 'epic', unique: true, fn: () => { ctx.explode = true; ctx.explR = 60; ctx.explDmgR = 0.5 } },
    { id: 'splitN', name: '分裂 +1', desc: '多分裂1颗', rarity: 'common', unique: false, fn: () => { ctx.splitN += 1 } },
    { id: 'expR', name: '爆炸范围+25%', desc: '爆炸范围扩大', rarity: 'common', unique: false, fn: () => { ctx.explR *= 1.25 } },
    { id: 'expD', name: '爆炸伤害+25%', desc: '爆炸伤害提升', rarity: 'common', unique: false, fn: () => { ctx.explDmgR *= 1.25 } },
    { id: 'size', name: '体积增大', desc: '子弹变大', rarity: 'rare', unique: true, fn: () => { ctx.bSize *= 1.4 } },
    { id: 'heal', name: '生命回复', desc: '回复30%HP', rarity: 'common', unique: true, fn: () => { ctx.hp = Math.min(ctx.maxHP, ctx.hp + Math.ceil(ctx.maxHP * 0.3)); updateHP() } },
    { id: 'hpup', name: '生命上限+1', desc: '最大HP+1', rarity: 'common', unique: false, fn: () => { ctx.maxHP += 1; ctx.hp += 1; updateHP() } },
  ];
  const RARITY_W: Record<string, number> = { common: 60, rare: 30, epic: 10 };

  function pickUpgrades(): any[] {
    const avail = UPGRADES.filter(u => !u.unique || !ctx.picked.has(u.id));
    const combat = avail.filter((u: any) => ['dmg', 'rate', 'volley', 'burst', 'pierce'].includes(u.id));
    const picks: any[] = [];
    const weighted = (pool: any[]) => {
      const t = pool.reduce((s: number, u: any) => s + RARITY_W[u.rarity], 0);
      let r = Math.random() * t;
      for (const u of pool) { r -= RARITY_W[u.rarity]; if (r <= 0) return u; }
      return pool[pool.length - 1];
    };
    if (combat.length) picks.push(combat[Math.floor(Math.random() * combat.length)]);
    while (picks.length < 3 && avail.length) {
      let p = weighted(avail);
      if (picks.includes(p)) { const rest = avail.filter((u: any) => !picks.includes(u)); if (!rest.length) break; p = rest[Math.floor(Math.random() * rest.length)]; }
      picks.push(p);
    }
    return picks;
  }

  function showUpgrade() {
    paused = true;
    upgContainer.removeChildren();
    upgContainer.visible = true;
    const choices = pickUpgrades();

    const bg = new Graphics().rect(0, 0, GAME_W, GAME_H).fill({ color: 0, alpha: 0.6 });
    upgContainer.addChild(bg);

    const title = new Text({ text: `✨ 升级！ Lv.${ctx.lvl}`, style: new TextStyle({ fontSize: 28, fill: '#ffd700', fontFamily: 'monospace', fontWeight: 'bold' }) });
    title.anchor.set(.5); title.position.set(GAME_W / 2, 200);
    upgContainer.addChild(title);

    const pw = 260, ph = 150, gap = 30;
    const tw = choices.length * pw + (choices.length - 1) * gap;
    const sx = (GAME_W - tw) / 2;

    choices.forEach((u: any, i: number) => {
      const cx = sx + i * (pw + gap) + pw / 2;
      const cy = 400;
      const rc = u.rarity === 'epic' ? '#ff6b6b' : u.rarity === 'rare' ? '#5dade2' : '#bdc3c7';
      const card = new Graphics()
        .roundRect(-pw / 2, -ph / 2, pw, ph, 10)
        .fill({ color: 0x2c3e50, alpha: .95 })
        .stroke({ color: parseInt(rc.slice(1), 16), width: 2 });
      card.eventMode = 'static'; card.cursor = 'pointer';
      const nm = new Text({ text: u.name, style: new TextStyle({ fontSize: 18, fill: rc, fontFamily: 'monospace', fontWeight: 'bold' }) });
      nm.anchor.set(.5, 0); nm.position.set(0, -ph / 2 + 18);
      const ds = new Text({ text: u.desc, style: new TextStyle({ fontSize: 13, fill: '#ecf0f1', fontFamily: 'monospace' }) });
      ds.anchor.set(.5, 0); ds.position.set(0, -ph / 2 + 50);
      const rt = new Text({ text: u.rarity === 'epic' ? '⭐ 史诗' : u.rarity === 'rare' ? '🌟 稀有' : '● 普通', style: new TextStyle({ fontSize: 11, fill: rc, fontFamily: 'monospace' }) });
      rt.anchor.set(.5, 0); rt.position.set(0, -ph / 2 + 100);
      const c = new Container();
      c.addChild(card, nm, ds, rt); c.position.set(cx, cy);
      upgContainer.addChild(c);
      card.on('pointerdown', () => {
        ctx.picked.add(u.id); u.fn();
        ctx.hp = Math.min(ctx.hp, ctx.maxHP);
        updateHP();
        upgContainer.visible = false; paused = false;
      });
    });
  }

  function showGameOver() {
    gameOver = true;
    overContainer.removeChildren(); overContainer.visible = true;
    const bg = new Graphics().rect(0, 0, GAME_W, GAME_H).fill({ color: 0, alpha: .7 });
    overContainer.addChild(bg);
    const t = new Text({ text: '💀 游戏结束', style: new TextStyle({ fontSize: 48, fill: '#e74c3c', fontFamily: 'monospace', fontWeight: 'bold' }) });
    t.anchor.set(.5); t.position.set(GAME_W / 2, 250);
    overContainer.addChild(t);
    const s = new Text({ text: `存活: ${Math.floor(ctx.time)}s\n击杀: ${ctx.kills}\n等级: ${ctx.lvl}`, style: new TextStyle({ fontSize: 24, fill: '#fff', fontFamily: 'monospace' }) });
    s.anchor.set(.5); s.position.set(GAME_W / 2, 380);
    overContainer.addChild(s);
    const btn = new Text({ text: '[ 重新开始 ]', style: new TextStyle({ fontSize: 28, fill: '#2ecc71', fontFamily: 'monospace', fontWeight: 'bold' }) });
    btn.anchor.set(.5); btn.position.set(GAME_W / 2, 500);
    btn.eventMode = 'static'; btn.cursor = 'pointer';
    btn.on('pointerdown', () => {
      bullets.forEach(b => { b.alive = false; gameLayer.removeChild(b.g); });
      enemies.forEach(e => { e.alive = false; gameLayer.removeChild(e.g); });
      bullets = []; enemies = [];
      Object.assign(ctx, { hp: 5, maxHP: 5, fireRate: 2, volley: 1, burst: 1, spread: 0.15, pierce: 0, bDmg: 10, bSpeed: 600, bSize: 10, split: false, splitN: 0, splitDmg: .5, splitSz: .6, explode: false, explR: 60, explDmgR: .5, cd: 0, picked: new Set<string>(), time: 0, waveInt: 3, waveCnt: 2, hpMult: 1, lvl: 1, exp: 0, needExp: EXP_BASE, kills: 0 });
      gameOver = false; paused = false; waveTimer = 2; bossSpawned = false;
      overContainer.visible = false;
      updateHP(); updateEXP(); lvlTxt.text = 'Lv.1'; infoTxt.text = '';
    });
    overContainer.addChild(btn);
  }

  // ======================== 功能函数 ========================
  function nearestEnemy(ex: number, ey: number): Enemy | null {
    let best: Enemy | null = null, bestD = Infinity;
    for (const e of enemies) { if (!e.alive) continue; const d = Math.hypot(e.x - ex, e.y - ey); if (d < bestD) { bestD = d; best = e; } }
    return best;
  }

  function spawnBullet(angleOff: number) {
    const target = nearestEnemy(GAME_W / 2, PLAYER_Y);
    let vx = 0, vy = -1;
    if (target) { const dx = target.x - GAME_W / 2, dy = target.y - PLAYER_Y; const d = Math.hypot(dx, dy); vx = dx / d; vy = dy / d; }
    if (angleOff !== 0) { const c = Math.cos(angleOff), s = Math.sin(angleOff); const tvx = vx * c - vy * s; vy = vx * s + vy * c; vx = tvx; }
    const g = new Graphics().circle(0, 0, ctx.bSize).fill({ color: 0xf1c40f });
    g.position.set(GAME_W / 2, PLAYER_Y); gameLayer.addChild(g);
    bullets.push({ id: nextId++, x: GAME_W / 2, y: PLAYER_Y, vx, vy, speed: ctx.bSpeed, damage: ctx.bDmg, size: ctx.bSize, life: 2.5, maxLife: 2.5, pierce: ctx.pierce, split: ctx.split, splitN: ctx.splitN, splitDmg: ctx.splitDmg, splitSz: ctx.splitSz, explode: ctx.explode, explR: ctx.explR, explDmg: ctx.bDmg * ctx.explDmgR, g, alive: true });
  }

  const ENEMY_TYPES = [
    { id: 'slime', hp: 20, speed: 60, dmg: 5, size: 14, score: 10, color: 0xe74c3c },
    { id: 'bat', hp: 12, speed: 120, dmg: 3, size: 10, score: 8, color: 0x9b59b6 },
    { id: 'knight', hp: 80, speed: 35, dmg: 10, size: 20, score: 25, color: 0x2c3e50 },
    { id: 'bomber', hp: 30, speed: 90, dmg: 20, size: 14, score: 15, color: 0xe67e22 },
  ];

  function pickEnemyType(time: number): number {
    if (time < 30) return 0;
    if (time < 60) return Math.random() < .6 ? 0 : 1;
    if (time < 90) { const r = Math.random(); if (r < .4) return 0; if (r < .7) return 1; return 2; }
    const r = Math.random(); if (r < .3) return 0; if (r < .5) return 1; if (r < .75) return 2; return 3;
  }

  function spawnEnemy(ti: number) {
    const t = ENEMY_TYPES[ti];
    const x = 40 + Math.random() * (GAME_W - 80);
    const hp = Math.ceil(t.hp * ctx.hpMult);
    const g = new Graphics().circle(0, 0, t.size).fill({ color: t.color });
    g.position.set(x, -30); gameLayer.addChild(g);
    enemies.push({ id: nextId++, x, y: -30, hp, maxHP: hp, speed: t.speed, dmg: t.dmg, size: t.size, score: t.score, color: t.color, type: t.id, g, alive: true, phase: Math.random() * Math.PI * 2 });
  }

  function spawnBoss() {
    const hp = 500 * ctx.hpMult;
    const g = new Graphics().rect(-20, -20, 40, 40).fill({ color: 0x8e44ad }).stroke({ color: 0xffffff, width: 2 });
    g.position.set(GAME_W / 2, -50); gameLayer.addChild(g);
    enemies.push({ id: nextId++, x: GAME_W / 2, y: -50, hp, maxHP: hp, speed: 25, dmg: 15, size: 40, score: 200, color: 0x8e44ad, type: 'boss', g, alive: true, phase: 0 });
  }

  function spawnExplosion(x: number, y: number, r: number, dmg: number) {
    const ring = new Graphics().circle(0, 0, r).fill({ color: 0xe67e22, alpha: .3 }).stroke({ color: 0xf39c12, width: 2 });
    ring.position.set(x, y); gameLayer.addChild(ring);
    for (const e of enemies) { if (!e.alive) continue; if (Math.hypot(x - e.x, y - e.y) <= r) { e.hp -= dmg; if (e.hp <= 0) killEnemy(e); } }
    let life = .3;
    const ticker = () => { life -= .016; ring.alpha = life / .3; if (life <= 0) { app.ticker.remove(ticker); gameLayer.removeChild(ring); } };
    app.ticker.add(ticker);
  }

  function spawnSplit(b: Bullet, hx: number, hy: number) {
    for (let i = 0; i < b.splitN; i++) {
      const a = (i / b.splitN) * Math.PI * 2 + Math.random() * .5;
      const vx = Math.cos(a), vy = Math.sin(a);
      const g = new Graphics().circle(0, 0, b.size * b.splitSz).fill({ color: 0xf1c40f });
      g.position.set(hx, hy); gameLayer.addChild(g);
      bullets.push({ id: nextId++, x: hx, y: hy, vx, vy, speed: b.speed * .8, damage: b.damage * b.splitDmg, size: b.size * b.splitSz, life: 1.5, maxLife: 1.5, pierce: 0, split: false, splitN: 0, splitDmg: .5, splitSz: .6, explode: b.explode, explR: b.explR * .6, explDmg: b.explDmg * b.splitDmg, g, alive: true });
    }
  }

  function killEnemy(e: Enemy) {
    e.alive = false; gameLayer.removeChild(e.g);
    ctx.kills++; ctx.exp += e.score;
    const ft = new Text({ text: `+${e.score}`, style: new TextStyle({ fontSize: 13, fill: '#ff0', fontFamily: 'monospace' }) });
    ft.anchor.set(.5); ft.position.set(e.x, e.y); gameLayer.addChild(ft);
    let ttl = .6;
    const ticker = () => { ttl -= .016; ft.alpha = ttl / .6; ft.y -= 1; if (ttl <= 0) { app.ticker.remove(ticker); gameLayer.removeChild(ft); } };
    app.ticker.add(ticker);
    updateEXP();
  }

  // ======================== 主循环 ========================
  let lastTime = performance.now();
  let shootCD = 0;

  app.ticker.maxFPS = 60;
  app.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (gameOver || paused) return;

    ctx.time += dt;
    infoTxt.text = `时间 ${Math.floor(ctx.time)}s  击杀 ${ctx.kills}`;

    // 射击
    shootCD -= dt;
    if (shootCD <= 0) {
      shootCD = 1 / ctx.fireRate;
      for (let v = 0; v < ctx.volley; v++) {
        const ao = ctx.volley > 1 ? (v / (ctx.volley - 1) - 0.5) * ctx.spread : 0;
        spawnBullet(ao);
      }
      if (ctx.burst > 1) {
        for (let b = 1; b < ctx.burst; b++) {
          setTimeout(() => spawnBullet(0), b * 80);
        }
      }
    }

    // 子弹更新
    for (const b of bullets) {
      if (!b.alive) continue;
      b.x += b.vx * b.speed * dt; b.y += b.vy * b.speed * dt;
      b.life -= dt;
      b.g.position.set(b.x, b.y);
      if (b.life <= 0 || b.x < -50 || b.x > GAME_W + 50 || b.y < -50 || b.y > GAME_H + 50) {
        b.alive = false; gameLayer.removeChild(b.g);
      }
    }
    bullets = bullets.filter(b => b.alive);

    // 波次
    waveTimer -= dt;
    if (waveTimer <= 0) {
      waveTimer = ctx.waveInt;
      for (let i = 0; i < ctx.waveCnt; i++) spawnEnemy(pickEnemyType(ctx.time));
    }
    if (!bossSpawned && ctx.time >= BOSS_SPAWN) { bossSpawned = true; spawnBoss(); }

    // 敌人更新
    for (const e of enemies) {
      if (!e.alive) continue;
      let sx = 0;
      if (e.type === 'bat' || e.type === 'bomber') { e.phase += dt * 3; sx = Math.sin(e.phase) * 40; }
      e.x += sx * dt; e.y += e.speed * dt;
      e.g.position.set(e.x, e.y);
      if (e.y > GAME_H + 50) { e.alive = false; gameLayer.removeChild(e.g); }
    }
    enemies = enemies.filter(e => e.alive);

    // 碰撞 子弹vs敌人
    for (const b of bullets) {
      if (!b.alive) continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.size + e.size) {
          e.hp -= b.damage;
          // 先判断击杀（必须在break之前）
          if (e.hp <= 0) { killEnemy(e); }
          if (b.explode) spawnExplosion(b.x, b.y, b.explR, b.explDmg);
          if (b.split && b.splitN > 0) spawnSplit(b, e.x, e.y);
          if (b.pierce > 0) b.pierce--;
          else { b.alive = false; gameLayer.removeChild(b.g); break; }
          break;
        }
      }
    }
    bullets = bullets.filter(b => b.alive);

    // 碰撞 敌人vs玩家
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(GAME_W / 2 - e.x, PLAYER_Y - e.y) < PLAYER_W / 2 + e.size) {
        ctx.hp -= e.dmg; updateHP();
        gameLayer.position.x = (Math.random() - 0.5) * 10;
        gameLayer.position.y = (Math.random() - 0.5) * 10;
        setTimeout(() => gameLayer.position.set(0, 0), 100);
        e.alive = false; gameLayer.removeChild(e.g);
      }
    }
    enemies = enemies.filter(e => e.alive);

    // 升级
    if (ctx.exp >= ctx.needExp) {
      ctx.exp -= ctx.needExp;
      ctx.lvl++;
      ctx.needExp = EXP_BASE + (ctx.lvl - 1) * EXP_PER_LEVEL;
      lvlTxt.text = `Lv.${ctx.lvl}`;
      if (ctx.lvl % 2 === 0) ctx.hpMult *= 1.1;
      updateEXP();
      showUpgrade();
    }

    // 死亡
    if (ctx.hp <= 0) showGameOver();
  });
})();
