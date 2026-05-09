import { Application, Container, Graphics } from 'pixi.js';
import './style.css';
import {
  GAME_W,
  GAME_H,
  PLAYER_Y,
  PLAYER_W,
  PLAYER_H,
  EXP_BASE,
  EXP_PER_LEVEL,
  BOSS_SPAWN,
  ctx,
  bullets,
  enemies,
  gameOver,
  paused,
  waveTimer,
  bossSpawned,
  setApp,
  setGameLayer,
  setUiLayer,
  setWaveTimer,
  setBossSpawned,
} from './state';
import { spawnBullet, updateBullets, spawnExplosion, spawnSplit } from './bullet';
import { spawnEnemy, spawnBoss, updateEnemies, pickEnemyType, killEnemy } from './enemy';
import { createUI, updateHP, updateEXP, showUpgrade, showGameOver, lvlTxt, infoTxt } from './ui';

(async () => {
  const a = new Application();
  await a.init({ width: GAME_W, height: GAME_H, backgroundColor: 0x1a1a2e, preference: 'canvas' });
  document.getElementById('app')!.appendChild(a.canvas as HTMLCanvasElement);
  setApp(a);

  const gameLayer = new Container();
  const uiLayer = new Container();
  a.stage.addChild(gameLayer);
  a.stage.addChild(uiLayer);
  setGameLayer(gameLayer);
  setUiLayer(uiLayer);

  // ---- 玩家 ----
  const playerG = new Graphics().rect(-PLAYER_W / 2, -PLAYER_H / 2, PLAYER_W, PLAYER_H).fill({ color: 0x3498db });
  playerG.position.set(GAME_W / 2, PLAYER_Y);
  gameLayer.addChild(playerG);

  // ---- UI ----
  createUI();

  // ======================== 主循环 ========================
  let lastTime = performance.now();
  let shootCD = 0;

  a.ticker.maxFPS = 60;
  a.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (gameOver || paused) return;

    ctx.time += dt;
    infoTxt.text = `时间 ${Math.floor(ctx.time)}s  击杀 ${ctx.kills}`;

    // ---- 射击 ----
    shootCD -= dt;
    if (shootCD <= 0) {
      shootCD = 1 / ctx.fireRate;
      for (let b = 0; b < ctx.burst; b++) {
        setTimeout(() => {
          if (gameOver || paused) return;
          for (let v = 0; v < ctx.volley; v++) {
            // 第0颗始终对准目标，其余在两侧对称散开
            const ao = v === 0 ? 0 : (v % 2 === 1 ? 1 : -1) * Math.ceil(v / 2) * ctx.spread;
            spawnBullet(ao);
          }
        }, b * 80);
      }
    }

    // ---- 子弹更新 ----
    updateBullets(dt);

    // ---- 波次 ----
    let wt = waveTimer;
    wt -= dt;
    if (wt <= 0) {
      wt = ctx.waveInt;
      for (let i = 0; i < ctx.waveCnt; i++) spawnEnemy(pickEnemyType(ctx.time));
    }
    setWaveTimer(wt);

    if (!bossSpawned && ctx.time >= BOSS_SPAWN) {
      setBossSpawned(true);
      spawnBoss();
    }

    // ---- 敌人更新 ----
    updateEnemies(dt);

    // ---- 碰撞 子弹 vs 敌人 ----
    for (const b of bullets) {
      if (!b.alive) continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (b.hitIds.has(e.id)) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.size + e.size) {
          b.hitIds.add(e.id);
          e.hp -= b.damage;
          e.hitTimer = 0.12;
          if (e.hp <= 0) killEnemy(e);
          if (b.explode) spawnExplosion(b.x, b.y, b.explR, b.explDmg);
          if (b.split && b.splitN > 0) spawnSplit(b, e.x, e.y);
          if (b.pierce > 0) {
            b.pierce--;
          } else {
            b.alive = false;
            if (gameLayer && b.g.parent) gameLayer.removeChild(b.g);
            break;
          }
        }
      }
    }
    // 清理碰撞导致的死亡子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].alive) bullets.splice(i, 1);
    }

    // ---- 碰撞 敌人 vs 玩家 ----
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(GAME_W / 2 - e.x, PLAYER_Y - e.y) < PLAYER_W / 2 + e.size) {
        ctx.hp -= e.dmg;
        updateHP();
        gameLayer.position.x = (Math.random() - 0.5) * 10;
        gameLayer.position.y = (Math.random() - 0.5) * 10;
        setTimeout(() => gameLayer.position.set(0, 0), 100);
        e.alive = false;
        if (gameLayer && e.g.parent) gameLayer.removeChild(e.g);
      }
    }

    // ---- 升级 ----
    if (ctx.exp >= ctx.needExp) {
      ctx.exp -= ctx.needExp;
      ctx.lvl++;
      ctx.needExp = EXP_BASE + (ctx.lvl - 1) * EXP_PER_LEVEL;
      lvlTxt.text = `Lv.${ctx.lvl}`;
      if (ctx.lvl % 2 === 0) ctx.hpMult *= 1.1;
      updateEXP();
      showUpgrade();
    }

    // ---- 死亡 ----
    if (ctx.hp <= 0) showGameOver();
  });
})();
