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
import { spawnBullet, updateBullets, spawnExplosion, spawnSplit, showDamageNumber, spawnShieldBreak } from './bullet';
import { spawnEnemy, spawnSwarmGroup, updateEnemies, killEnemy, pickEnemyType, enemyTypeOf } from './enemy';
import { createUI, updateWall, updateWave, showUpgrade, showGameOver, showVictory, infoTxt } from './ui';
import { initLaser, updateLaser } from './laser';

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
  initLaser();

  let lastTime = performance.now();
  let shootCD = 0;

  // ---- 波次/出怪管理 ----
  let waveActive = false;
  let waveSpawnTimer = 0;
  let waveSpawned = 0;
  let waveTotalSpawn = 0;

  function startWave(waveNum: number) {
    ctx.currentWave = waveNum;
    ctx.maxWallHP = cfg.wall.hp + (waveNum - 1) * cfg.wall.hpPerWave;
    ctx.wallHP = ctx.maxWallHP;
    updateWall();
    updateWave();

    waveTotalSpawn = Math.floor(cfg.enemy.waveBaseCount + (waveNum - 1) * cfg.enemy.waveCountGrowth);
    waveSpawned = 0;
    waveSpawnTimer = 0;
    waveActive = true;
    infoTxt.text = `波次 ${waveNum} · ${waveTotalSpawn}怪`;
  }

  /** 每帧批量出怪 */
  function tickSpawn(dt: number) {
    if (!waveActive || waveSpawned >= waveTotalSpawn) return;
    waveSpawnTimer -= dt;
    if (waveSpawnTimer > 0) return;

    const remaining = waveTotalSpawn - waveSpawned;
    const waveNum = ctx.currentWave;
    const c = getConfig();

    // 动态批次：开场密集涌入，后面补充
    const progress = waveSpawned / waveTotalSpawn;
    let batchSize: number;
    if (progress < 0.3) batchSize = Math.min(10, Math.max(4, Math.floor(remaining / 15)));
    else if (progress < 0.6) batchSize = Math.min(6, Math.max(2, Math.floor(remaining / 25)));
    else batchSize = Math.min(3, Math.max(1, Math.floor(remaining / 35)));
    batchSize = Math.min(batchSize, remaining);

    for (let i = 0; i < batchSize; i++) {
      if (waveSpawned >= waveTotalSpawn) break;
      const ti = pickEnemyType(waveNum);
      const tId = enemyTypeOf(ti);

      // swarm类型触发群组生成
      if (tId === 'swarm' && remaining > 8) {
        const groupSize = 10 + Math.floor(Math.random() * 15);
        spawnSwarmGroup(ti, waveNum, groupSize);
        waveSpawned += groupSize;
        i += Math.min(groupSize - 1, remaining - batchSize);
      } else {
        spawnEnemy(ti, waveNum);
        waveSpawned++;
      }
    }

    waveSpawnTimer = c.enemy.spawnInterval / 1000;
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
      startWave(ctx.currentWave + 1);
    }

    // ---- 出怪 ----
    if (waveActive) tickSpawn(dt);

    // ---- 聚焦激光 ----
    updateLaser(dt);

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

    // ---- 子弹移动 ----
    updateBullets(dt);

    // ---- 敌人移动 ----
    updateEnemies(dt);

    // ---- 围墙承受攻击 ----
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

    // ---- 碰撞检测（Y轴空间网格优化） ----
    const CELL = 60;
    const yGrid = new Map<number, typeof enemies>();
    for (const e of enemies) {
      if (!e.alive) continue;
      const row = Math.floor(e.y / CELL);
      if (!yGrid.has(row)) yGrid.set(row, []);
      yGrid.get(row)!.push(e);
    }

    for (const b of bullets) {
      if (!b.alive) continue;
      const row = Math.floor(b.y / CELL);
      const candidates: typeof enemies = [];
      for (let r = row - 1; r <= row + 1; r++) {
        const cell = yGrid.get(r);
        if (cell) candidates.push(...cell);
      }
      for (const e of candidates) {
        if (!e.alive) continue;
        if (b.hitIds.has(e.id)) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.size + e.size) {
          b.hitIds.add(e.id);
          if (e.type === 'shielder' && !e.shieldBroken) {
            // 盾牌没收子弹并碎裂
            e.shieldBroken = true;
            b.alive = false;
            if (gameLayer && b.g.parent) gameLayer.removeChild(b.g);
            spawnShieldBreak(e);
          } else {
            e.hp -= b.damage;
            e.hitTimer = 0.1;
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
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].alive) {
        const b = bullets[i];
        if (gameLayer && b.g.parent) gameLayer.removeChild(b.g);
        bullets.splice(i, 1);
      }
    }

    // ---- 检测波次完成 ----
    if (waveActive && waveSpawned >= waveTotalSpawn) {
      const alive = enemies.some((e) => e.alive);
      if (!alive) {
        waveActive = false;
        showUpgrade();
      }
    }
  });
})();
