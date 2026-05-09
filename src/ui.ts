import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { GAME_W, GAME_H, ctx, bullets, enemies, gameLayer, uiLayer, setPaused, setGameOver, resetState } from './state';
import { pickUpgrades } from './upgrade';

// ---- HP/EXP 条 ----
export let hpFill: Graphics;
export let expFill: Graphics;
export let lvlTxt: Text;
export let infoTxt: Text;
let upgContainer: Container;
let overContainer: Container;

export function createUI(): { upgContainer: Container; overContainer: Container } {
  if (!uiLayer) throw new Error('uiLayer not initialized');

  const hpBg = new Graphics().rect(20, 20, 200, 18).fill({ color: 0x333 });
  hpFill = new Graphics();
  const expBg = new Graphics().rect(20, 46, 200, 12).fill({ color: 0x333 });
  expFill = new Graphics();
  lvlTxt = new Text({ text: 'Lv.1', style: new TextStyle({ fontSize: 14, fill: '#fff', fontFamily: 'monospace' }) });
  lvlTxt.position.set(230, 20);
  infoTxt = new Text({ text: '', style: new TextStyle({ fontSize: 14, fill: '#ccc', fontFamily: 'monospace' }) });
  infoTxt.position.set(GAME_W - 200, 20);
  uiLayer.addChild(hpBg, hpFill, expBg, expFill, lvlTxt, infoTxt);

  upgContainer = new Container();
  upgContainer.visible = false;
  uiLayer.addChild(upgContainer);

  overContainer = new Container();
  overContainer.visible = false;
  uiLayer.addChild(overContainer);

  updateHP();
  updateEXP();

  return { upgContainer, overContainer };
}

export function updateHP() {
  hpFill.clear();
  const r = Math.max(0, ctx.hp / ctx.maxHP);
  hpFill.rect(22, 22, 196 * r, 14).fill({ color: r > 0.5 ? 0x2ecc71 : r > 0.25 ? 0xf39c12 : 0xe74c3c });
}

export function updateEXP() {
  expFill.clear();
  expFill.rect(22, 48, 196 * Math.min(1, ctx.exp / ctx.needExp), 8).fill({ color: 0x9b59b6 });
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
    text: `✨ 升级！ Lv.${ctx.lvl}`,
    style: new TextStyle({ fontSize: 28, fill: '#ffd700', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  title.anchor.set(0.5);
  title.position.set(GAME_W / 2, 200);
  upgContainer.addChild(title);

  const pw = 260,
    ph = 150,
    gap = 30;
  const tw = choices.length * pw + (choices.length - 1) * gap;
  const sx = (GAME_W - tw) / 2;

  choices.forEach((u: any, i: number) => {
    const cx = sx + i * (pw + gap) + pw / 2;
    const cy = 400;
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
    text: '💀 游戏结束',
    style: new TextStyle({ fontSize: 48, fill: '#e74c3c', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  t.anchor.set(0.5);
  t.position.set(GAME_W / 2, 250);
  overContainer.addChild(t);
  const s = new Text({
    text: `存活: ${Math.floor(ctx.time)}s\n击杀: ${ctx.kills}\n等级: ${ctx.lvl}`,
    style: new TextStyle({ fontSize: 24, fill: '#fff', fontFamily: 'monospace' }),
  });
  s.anchor.set(0.5);
  s.position.set(GAME_W / 2, 380);
  overContainer.addChild(s);
  const btn = new Text({
    text: '[ 重新开始 ]',
    style: new TextStyle({ fontSize: 28, fill: '#2ecc71', fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  btn.anchor.set(0.5);
  btn.position.set(GAME_W / 2, 500);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.on('pointerdown', () => {
    resetState();
    overContainer.visible = false;
    updateHP();
    updateEXP();
    lvlTxt.text = 'Lv.1';
    infoTxt.text = '';
  });
  overContainer.addChild(btn);
}
