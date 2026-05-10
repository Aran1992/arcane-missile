import { Application, Container, Graphics } from 'pixi.js';
import './style.css';
import {
  GAME_W,
  GAME_H,
  PLAYER_Y,
  WALL_Y,
  PLAYER_W,
  PLAYER_H,
  ctx,
  bullets,
  enemies,
  gameOver,
  paused,
  setApp,
  setGameLayer,
  setUiLayer,
} from './state';
import { getConfig } from './configLoader';
import { spawnBullet, updateBullets, spawnExplosion, spawnSplit, showDamageNumber } from './bullet';
import { spawnEnemy, updateEnemies, pickEnemyType, killEnemy } from './enemy';
import { createUI, updateWall, updateWave, showUpgrade, showGameOver, showVictory, infoTxt } from './ui';

(async () => {
  const cfg = getConfig();
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

  // ---- 围墙 ----
  const wallG = new Graphics()
    .rect(0, WALL_Y, GAME_W, 8)
    .fill({ color: 0x5dade2 })
    .rect(0, WALL_Y + 8, GAME_W, 3)
    .fill({ color: 0x2e86c1 });
  gameLayer.addChild(wallG);

  createUI();

  let lastTime = performance.now();
  let shootCD = 0;

  // ---- 波次管理 ----
  let waveActive = false; // 当前波次是否正在进行（还有活敌） 

  function startWave(waveNum: number) {
    ctx.currentWave = waveNum;
    // 每波围墙增加
    ctx.maxWallHP = cfg.wall.hp + (waveNum - 1) * cfg.wall.hpPerWave;
    ctx.wallHP = ctx.maxWallHP;
    updateWall();
    updateWave();

    const count = Math.floor(cfg.enemy.waveBaseCount + (waveNum - 1) * cfg.enemy.waveCountGrowth);
    for (let i = 0; i < count; i++) {
      const ti = pickEnemyType(waveNum);
      setTimeout(() => spawnEnemy(ti, waveNum), i * 300); // 每个间隔300ms陆续出
    }
    waveActive = true;
    infoTxt.text = `波次 ${waveNum}`;
  }

  a.ticker.maxFPS = 60;
  a.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (gameOver || paused) return;

    // ---- 检测是否需要开始下一波 ----
    if (!waveActive && enemies.length === 0) {
      if (ctx.currentWave >= cfg.enemy.totalWaves) {
        showVictory();
        return;
      }
      // 从波0（初始状态）或读完升级后进入下一波
      startWave(ctx.currentWave + 1);
    }

    // ---- 射击 ----
    shootCD -= dt;
    if (shootCD <= 0) {
      shootCD = 1 / ctx.fireRate;
      for (let b = 0; b < ctx.burst; b++) {
        setTimeout(() => {
          if (gameOver || paused) return;
          for (let v = 0; v < ctx.volley; v++) {
            const ao = v === 0 ? 0 : (v % 2 === 1 ? 1 : -1) * Math.ceil(v / 2) * ctx.spread;
            spawnBullet(ao);
          }
        }, b * cfg.bullet.burstInterval);
      }
    }

    // ---- 子弹更新 ----
    updateBullets(dt);

    // ---- 敌人更新 ----
    updateEnemies(dt);

    // ---- 围墙受到攻击 ----
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.y + e.size >= WALL_Y) {
        ctx.wallHP -= cfg.enemy.wallDps * dt;
      }
    }
    if (ctx.wallHP <= 0) {
      ctx.wallHP = 0;
      updateWall();
      showGameOver();
      return;
    }
    updateWall();

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
          showDamageNumber(e.x, e.y, b.damage, 'bullet');
          if (e.hp <= 0) killEnemy(e);
          if (b.explode) spawnExplosion(b.x, b.y, b.explR, b.explDmg);
          if (b.split && b.splitN > 0) spawnSplit(b, e.x, e.y, e.id);
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
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].alive) bullets.splice(i, 1);
    }

    // ---- 检测波次完成 ----
    if (waveActive) {
      const alive = enemies.some((e) => e.alive);
      if (!alive) {
        waveActive = false;
        showUpgrade();
      }
    }
  });
})();
