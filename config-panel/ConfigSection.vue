<template>
  <div class="section">
    <div class="section-header" @click="collapsed = !collapsed">
      <span class="toggle">{{ collapsed ? '▶' : '▼' }}</span>
      <span class="title">{{ title }}</span>
      <span class="type-tag" v-if="isArray">[{{ data.length }}]</span>
    </div>
    <div v-show="!collapsed" class="section-body">
      <template v-for="(value, key) in data" :key="String(key)">
        <div class="field" v-if="isSimpleValue(value)">
          <label>{{ labelName(String(key)) }}</label>
          <input
            :type="inputType(value)"
            :value="value"
            :step="typeof value === 'number' && !Number.isInteger(value) ? 0.01 : 1"
            :min="typeof value === 'number' ? 0 : undefined"
            @input="onChange(String(key), ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div v-else-if="isArray && typeof key === 'number'" class="array-item">
          <span class="array-idx">#{{ key }}</span>
          <ConfigSection
            :title="getArrayItemTitle(String(key))"
            :data="value as any"
            :path="[...path, String(key)]"
            @update="emitUpdate"
          />
        </div>
        <ConfigSection
          v-else
          :title="labelName(String(key))"
          :data="value as any"
          :path="[...path, String(key)]"
          @update="emitUpdate"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ title: string; data: any; path: string[] }>();
const emit = defineEmits<{ update: [path: string[], value: any] }>();

const collapsed = ref(false);
const isArray = Array.isArray(props.data);

function emitUpdate(path: string[], value: any) {
  emit('update', path, value);
}

function labelName(key: string): string {
  const map: Record<string, string> = {
    hp: 'HP', maxHP: '最大HP', fireRate: '射速', volley: '齐射',
    burst: '连发', burstInterval: '连发间隔(ms)', spread: '散射弧度',
    pierce: '穿透', bDmg: '伤害', bSpeed: '速度', bSize: '体积',
    life: '子弹生命(s)', split: '分裂', splitN: '分裂数量',
    splitDmg: '分裂伤害比', splitSz: '分裂大小比', explode: '爆炸',
    explR: '爆炸范围', explDmgR: '爆炸伤害比',
    waveInterval: '波次间隔(s)', waveCount: '每波数量',
    hpScalePer2Levels: '每2级血量倍率', bossSpawnTime: 'Boss出现(s)',
    bossHP: 'Boss HP', bossSpeed: 'Boss速度', bossDmg: 'Boss伤害',
    bossSize: 'Boss大小', bossScore: 'Boss分数',
    types: '敌人类型', difficulty: '难度阶段',
    base: '基础经验', perLevel: '每级增量',
    color: '颜色(#hex)', id: 'ID', score: '分数', dmg: '伤害',
    speed: '速度', size: '大小', until: '持续到(s)', weights: '权重',
  };
  return map[key] || key;
}

function isSimpleValue(v: any): boolean {
  return typeof v !== 'object' || v === null;
}

function inputType(v: any): string {
  if (typeof v === 'boolean') return 'checkbox';
  if (typeof v === 'number') return 'number';
  return 'text';
}

function onChange(key: string, raw: string) {
  const orig = props.data[key];
  let val: any = raw;
  if (typeof orig === 'boolean') val = raw === 'true' || raw === true;
  else if (typeof orig === 'number') val = raw === '' ? 0 : Number(raw);
  emit('update', [...props.path, key], val);
}

function getArrayItemTitle(key: string): string {
  const item = props.data[Number(key)];
  return (item && item.id) ? item.id : `#${key}`;
}
</script>

<style scoped>
.section {
  border: 1px solid #333;
  border-radius: 6px;
  background: #14142a;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #1e1e3a;
  cursor: pointer;
  user-select: none;
}
.section-header:hover { background: #2a2a4e; }
.toggle { font-size: 10px; color: #888; width: 12px; }
.title { font-size: 14px; font-weight: 600; color: #ccc; }
.type-tag { font-size: 11px; color: #666; background: #2a2a3e; padding: 1px 6px; border-radius: 3px; }
.section-body { padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}
.field label { font-size: 12px; color: #aaa; flex-shrink: 0; }
.field input[type="number"],
.field input[type="text"] {
  width: 100px;
  padding: 3px 6px;
  border: 1px solid #444;
  border-radius: 3px;
  background: #1a1a2e;
  color: #e0e0e0;
  font-size: 12px;
  text-align: right;
}
.field input[type="checkbox"] { width: 16px; height: 16px; }
.array-item { border-left: 2px solid #444; padding-left: 8px; margin: 4px 0; }
.array-idx { font-size: 11px; color: #666; font-family: monospace; }
</style>
