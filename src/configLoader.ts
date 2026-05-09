import type { GameConfig } from '../config/schema';
import defaultCfg from '../config/default.json';

let _config: GameConfig | null = null;

export function loadConfig(): GameConfig {
  if (_config) return _config;
  try {
    const stored = localStorage.getItem('arcane_config');
    if (stored) {
      _config = JSON.parse(stored) as GameConfig;
      return _config;
    }
  } catch { /* ignore */ }
  _config = defaultCfg as GameConfig;
  return _config;
}

export function getConfig(): GameConfig {
  if (!_config) return loadConfig();
  return _config;
}

export function applyConfig(cfg: GameConfig) {
  _config = cfg;
}

export function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
