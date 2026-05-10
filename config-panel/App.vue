<template>
  <div class="app">
    <header>
      <h1>⚙ 奥术飞弹 — 配置面板</h1>
      <div class="actions">
        <button @click="resetConfig">重置</button>
        <button @click="applyToGame">应用到游戏</button>
        <button @click="exportJSON">导出 JSON</button>
        <label class="import-btn">
          导入 JSON <input type="file" accept=".json" @change="importJSON" hidden />
        </label>
      </div>
    </header>

    <div class="panel">
      <ConfigSection title="🎮 玩家" :data="config.player" :path="['player']" @update="onUpdate" />
      <ConfigSection title="💥 子弹" :data="config.bullet" :path="['bullet']" @update="onUpdate" />
      <ConfigSection title="👾 敌人" :data="config.enemy" :path="['enemy']" @update="onUpdate" />
      <ConfigSection title="⭐ 经验" :data="config.exp" :path="['exp']" @update="onUpdate" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { GameConfig } from '../config/schema';
import defaultCfg from '../config/default.json';
import ConfigSection from './ConfigSection.vue';

function loadSavedConfig(): GameConfig {
  try {
    const stored = localStorage.getItem('arcane_config');
    if (stored) return JSON.parse(stored) as GameConfig;
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(defaultCfg));
}

const config = ref<GameConfig>(loadSavedConfig());

function onUpdate(path: string[], value: any) {
  let obj: any = config.value;
  for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
  obj[path[path.length - 1]] = value;
}

function resetConfig() {
  config.value = JSON.parse(JSON.stringify(defaultCfg));
  localStorage.removeItem('arcane_config');
}

function applyToGame() {
  localStorage.setItem('arcane_config', JSON.stringify(config.value));
  alert('配置已存储，刷新游戏页面后生效');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(config.value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'arcane-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string) as GameConfig;
      config.value = data;
    } catch {
      alert('JSON 格式错误');
    }
  };
  reader.readAsText(file);
}
</script>

<style>
.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
header h1 {
  font-size: 20px;
  color: #ffd700;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
button, .import-btn {
  padding: 6px 14px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #2a2a3e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 13px;
}
button:hover, .import-btn:hover {
  background: #3a3a5e;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
