import type { GameConfig } from '../config/schema';
import defaultCfg from '../config/default.json';

let _config: GameConfig | null = null;

export function loadConfig(): GameConfig {
  if (_config) return _config;
  _config = defaultCfg as GameConfig;
  return _config;
}

export function getConfig(): GameConfig {
  if (!_config) return loadConfig();
  return _config;
}

/** 将十六进制色号（如 "#e74c3c"）转为 0x 数字 */
export function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
