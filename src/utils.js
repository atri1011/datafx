/**
 * @file utils.js
 * @description 通用辅助函数模块
 */

/**
 * 在控制台打印日志，并添加统一前缀
 * @param {string} level 日志级别 ('log', 'warn', 'error')
 * @param {string} message 日志消息
 * @param {...any} args 其他要打印的参数
 */
export function log(level, message, ...args) {
  console[level](`[BiliAnalytics] ${message}`, ...args);
}

/**
 * 将CSS文本注入到指定的DOM节点（或Shadow DOM）中
 * @param {string} cssText CSS样式文本
 * @param {HTMLElement|ShadowRoot} targetNode 目标节点
 */
export function injectCSS(cssText, targetNode) {
  const style = document.createElement('style');
  style.textContent = cssText;
  targetNode.appendChild(style);
}

/**
 * 格式化时间戳
 * @param {number} timestamp - Unix时间戳 (秒)
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - 格式模板
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 深拷贝一个对象
 * @template T
 * @param {T} obj - 要拷贝的对象
 * @returns {T} 拷贝后的新对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // 使用structuredClone进行高效的深拷贝，兼容大部分现代浏览器环境
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  // 降级处理
  return JSON.parse(JSON.stringify(obj));
}