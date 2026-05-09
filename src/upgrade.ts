import type { Bullet, Enemy } from './types';
import { ctx } from './state';

export const UPGRADES: any[] = [
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
  { id: 'heal', name: '生命回复', desc: '回复30%HP', rarity: 'common', unique: true, fn: () => { ctx.hp = Math.min(ctx.maxHP, ctx.hp + Math.ceil(ctx.maxHP * 0.3)) } },
  { id: 'hpup', name: '生命上限+1', desc: '最大HP+1', rarity: 'common', unique: false, fn: () => { ctx.maxHP += 1; ctx.hp += 1 } },
];

const RARITY_W: Record<string, number> = { common: 60, rare: 30, epic: 10 };

export function pickUpgrades(): any[] {
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
    if (picks.includes(p)) {
      const rest = avail.filter((u: any) => !picks.includes(u));
      if (!rest.length) break;
      p = rest[Math.floor(Math.random() * rest.length)];
    }
    picks.push(p);
  }
  return picks;
}
