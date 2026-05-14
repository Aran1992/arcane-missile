import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import type { UpgradeDef } from './types';
import { GAME_W, GAME_H, ctx, gameLayer, uiLayer, setPaused, setGameOver, resetState } from './state';
import { pickUpgrades } from './upgrade';
import { getConfig } from './configLoader';

// ---- UI 元素 ----
export let hpFill: Graphics;
export let wallFill: Graphics;
export let wallBg: Graphics;
export let waveTxt: Text;
export let infoTxt: Text;
let upgContainer: Container;
let overContainer: Container;

const cfg = getConfig();

export function createUI(): { upgContainer: Container; overContainer: Container } {
  if (!uiLayer) throw new Error('uiLayer not initialized');

  // 波次文字
  waveTxt = new Text({
    text: '波次 1/20',
    style: new TextStyle({ fontSize: 16, fill: '#ffd700', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  waveTxt.position.set(20, 12);

  // 围墙HP条
  wallBg = new Graphics().rect(20, 36, 200, 14).fill({ color: 0x333 });
  wallFill = new Graphics();
  const wallLabel = new Text({
    text: '围墙',
    style: new TextStyle({ fontSize: 10, fill: '#aaa', fontFamily: 'monospace' }),
  });
  wallLabel.position.set(10, 38);
  const wallVal = new Text({
    text: '',
    style: new TextStyle({ fontSize: 10, fill: '#ddd', fontFamily: 'monospace' }),
  });
  wallVal.position.set(230, 38);
  wallVal.name = 'wallVal';

  // 玩家HP条
  const hpBg = new Graphics().rect(20, 58, 200, 14).fill({ color: 0x333 });
  hpFill = new Graphics();
  const hpLabel = new Text({
    text: '生命',
    style: new TextStyle({ fontSize: 10, fill: '#aaa', fontFamily: 'monospace' }),
  });
  hpLabel.position.set(10, 60);

  infoTxt = new Text({
    text: '',
    style: new TextStyle({ fontSize: 14, fill: '#ccc', fontFamily: 'monospace' }),
  });
  infoTxt.position.set(GAME_W - 200, 12);

  uiLayer.addChild(waveTxt, wallBg, wallFill, wallLabel, wallVal, hpBg, hpFill, hpLabel, infoTxt);

  upgContainer = new Container();
  upgContainer.visible = false;
  uiLayer.addChild(upgContainer);

  overContainer = new Container();
  overContainer.visible = false;
  uiLayer.addChild(overContainer);

  updateHP();
  updateWall();

  return { upgContainer, overContainer };
}

export function updateHP() {
  hpFill.clear();
  const r = Math.max(0, ctx.hp / ctx.maxHP);
  hpFill.rect(22, 60, 196 * r, 10).fill({ color: r > 0.5 ? 0x2ecc71 : r > 0.25 ? 0xf39c12 : 0xe74c3c });
}

export function updateWall() {
  wallFill.clear();
  const r = Math.max(0, ctx.wallHP / ctx.maxWallHP);
  wallFill.rect(22, 38, 196 * r, 10).fill({ color: r > 0.5 ? 0x3498db : r > 0.25 ? 0xf39c12 : 0xe74c3c });
  // 更新围墙HP数字
  const wv = uiLayer?.getChildByName('wallVal') as Text;
  if (wv) wv.text = `${Math.ceil(ctx.wallHP)}/${ctx.maxWallHP}`;
}

export function updateWave() {
  waveTxt.text = `波次 ${ctx.currentWave}/${cfg.enemy.totalWaves}`;
}

export function showUpgrade() {
  if (!gameLayer || !uiLayer) return;
  setPaused(true);
  upgContainer.removeChildren();
  upgContainer.visible = true;
  const choices = pickUpgrades();

  const bg = new Graphics().rect(0, 0, GAME_W, GAME_H).fill({ color: 0, alpha: 0.6 });
  upgContainer.addChild(bg);

  const title = new Text({
    text: `✨ 升级！ 波次 ${ctx.currentWave}`,
    style: new TextStyle({ fontSize: 28, fill: '#ffd700', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  title.anchor.set(0.5);
  title.position.set(GAME_W / 2, 260);
  upgContainer.addChild(title);

  const pw = 200,
    ph = 160,
    gap = 20;
  const tw = choices.length * pw + (choices.length - 1) * gap;
  const sx = (GAME_W - tw) / 2;

  choices.forEach((u: UpgradeDef, i: number) => {
    const cx = sx + i * (pw + gap) + pw / 2;
    const cy = GAME_H * 0.55;
    const rc = u.rarity === 'epic' ? '#ff6b6b' : u.rarity === 'rare' ? '#5dade2' : '#bdc3c7';
    const card = new Graphics()
      .roundRect(-pw / 2, -ph / 2, pw, ph, 10)
      .fill({ color: 0x2c3e50, alpha: 0.95 })
      .stroke({ color: parseInt(rc.slice(1), 16), width: 2 });
    card.eventMode = 'static';
    card.cursor = 'pointer';
    const nm = new Text({
      text: u.name,
      style: new TextStyle({ fontSize: 18, fill: rc, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    nm.anchor.set(0.5, 0);
    nm.position.set(0, -ph / 2 + 18);
    const ds = new Text({
      text: u.desc,
      style: new TextStyle({ fontSize: 13, fill: '#ecf0f1', fontFamily: 'monospace' }),
    });
    ds.anchor.set(0.5, 0);
    ds.position.set(0, -ph / 2 + 50);
    const rt = new Text({
      text: u.rarity === 'epic' ? '⭐ 史诗' : u.rarity === 'rare' ? '🌟 稀有' : '● 普通',
      style: new TextStyle({ fontSize: 11, fill: rc, fontFamily: 'monospace' }),
    });
    rt.anchor.set(0.5, 0);
    rt.position.set(0, -ph / 2 + 100);
    const c = new Container();
    c.addChild(card, nm, ds, rt);
    c.position.set(cx, cy);
    upgContainer.addChild(c);
    card.on('pointerdown', () => {
      ctx.picked.add(u.id);
      u.fn();
      ctx.hp = Math.min(ctx.hp, ctx.maxHP);
      updateHP();
      upgContainer.visible = false;
      setPaused(false);
    });
  });
}

export function showGameOver() {
  setGameOver(true);
  overContainer.removeChildren();
  overContainer.visible = true;
  const bg = new Graphics().rect(0, 0, GAME_W, GAME_H).fill({ color: 0, alpha: 0.7 });
  overContainer.addChild(bg);
  const t = new Text({
    text: '💀 围墙被攻破',
    style: new TextStyle({ fontSize: 48, fill: '#e74c3c', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  t.anchor.set(0.5);
  t.position.set(GAME_W / 2, 220);
  overContainer.addChild(t);
  const s = new Text({
    text: `到达波次: ${ctx.currentWave}/${cfg.enemy.totalWaves}\n击杀: ${ctx.kills}`, //  升级: ${ctx.lvl}
    style: new TextStyle({ fontSize: 24, fill: '#fff', fontFamily: 'monospace' }),
  });
  s.anchor.set(0.5);
  s.position.set(GAME_W / 2, 340);
  overContainer.addChild(s);
  const btn = new Text({
    text: '[ 重新开始 ]',
    style: new TextStyle({ fontSize: 28, fill: '#2ecc71', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  btn.anchor.set(0.5);
  btn.position.set(GAME_W / 2, 460);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.on('pointerdown', () => {
    resetState();
    overContainer.visible = false;
    updateHP();
    updateWall();
    updateWave();
    infoTxt.text = '';
  });
  overContainer.addChild(btn);
}

export function showVictory() {
  setGameOver(true);
  overContainer.removeChildren();
  overContainer.visible = true;
  const bg = new Graphics().rect(0, 0, GAME_W, GAME_H).fill({ color: 0, alpha: 0.7 });
  overContainer.addChild(bg);
  const t = new Text({
    text: '🎉 胜利！',
    style: new TextStyle({ fontSize: 56, fill: '#ffd700', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  t.anchor.set(0.5);
  t.position.set(GAME_W / 2, 220);
  overContainer.addChild(t);
  const s = new Text({
    text: `全部 ${cfg.enemy.totalWaves} 波清除！\n击杀: ${ctx.kills}`,
    style: new TextStyle({ fontSize: 24, fill: '#fff', fontFamily: 'monospace' }),
  });
  s.anchor.set(0.5);
  s.position.set(GAME_W / 2, 340);
  overContainer.addChild(s);
  const btn = new Text({
    text: '[ 再来一局 ]',
    style: new TextStyle({ fontSize: 28, fill: '#2ecc71', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  btn.anchor.set(0.5);
  btn.position.set(GAME_W / 2, 460);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.on('pointerdown', () => {
    resetState();
    overContainer.visible = false;
    updateHP();
    updateWall();
    updateWave();
    infoTxt.text = '';
  });
  overContainer.addChild(btn);
}
