/**
 * @file config.js
 * @description 用户配置管理模块
 */

import { deepClone } from './utils.js';

const CONFIG_KEY = 'BiliAnalytics_Config';

/**
 * @typedef {object} UserConfig
 * @property {string} aiApiUrl - AI API 的服务器地址
 * @property {string} aiApiKey - AI API Key
 * @property {number} refresh_interval - 自动刷新频率（分钟），0表示不自动刷新
 * @property {string} theme - 主题 ('light', 'dark', 'auto')
 * @property {number} videoLimit - 每次获取的热门视频数量
 */

/**
 * 默认配置
 * @type {UserConfig}
 */
const defaultConfig = {
  aiApiUrl: 'https://api.newapi.com/v1/chat/completions',
  aiApiKey: '',
  refresh_interval: 0,
  theme: 'auto',
  videoLimit: 20,
};

/**
 * 加载用户配置。如果本地没有配置，则返回默认配置。
 * @returns {UserConfig} - 当前的用户配置
 */
export function loadConfig() {
  const storedConfig = GM_getValue(CONFIG_KEY, null);
  if (storedConfig) {
    // 合并存储的配置和默认配置，以防新增配置项
    return { ...defaultConfig, ...JSON.parse(storedConfig) };
  }
  return deepClone(defaultConfig);
}

/**
 * 保存用户配置。
 * @param {Partial<UserConfig>} newConfig - 需要更新的配置项
 */
export function saveConfig(newConfig) {
  const currentConfig = loadConfig();
  const updatedConfig = { ...currentConfig, ...newConfig };
  GM_setValue(CONFIG_KEY, JSON.stringify(updatedConfig));
}