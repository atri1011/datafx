/**
 * @file ui.js
 * @description UI面板管理模块
 */

import { injectCSS, log } from './utils.js';
import { getPopularVideos } from './api.js';
import { performAnalysis } from './analysis.js';
import { loadConfig } from './config.js';
import { updateAllCharts, initCharts, resizeAllCharts } from './charts.js';

// Assume CSS content is loaded via GM_getResourceText at build time
// @resource mainCSS ../styles/main.css
// @resource themeCSS ../styles/themes.css
const mainCSS = GM_getResourceText('mainCSS');
const themeCSS = GM_getResourceText('themeCSS');

let shadowRoot = null;

/**
 * 创建并向页面注入分析面板
 * @returns {{panel: HTMLElement, containers: object}} 返回面板元素和图表容器
 */
export function createPanel() {
  if (document.getElementById('bili-analytics-host')) {
    log('warn', '分析面板已存在。');
    return;
  }

  const host = document.createElement('div');
  host.id = 'bili-analytics-host';
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'open' });

  const panel = document.createElement('div');
  panel.className = 'bili-analytics-container';
  panel.innerHTML = `
    <div class="bili-analytics-header">
      B站热门视频AI分析
      <span class="bili-analytics-close-btn" style="float:right; cursor:pointer;">&times;</span>
    </div>
    <div class="bili-analytics-content">
      <div id="radar-chart" class="bili-analytics-chart-container"></div>
      <div id="timeseries-chart" class="bili-analytics-chart-container"></div>
      <div id="wordcloud-chart" class="bili-analytics-chart-container"></div>
      <div id="heatmap-chart" class="bili-analytics-chart-container"></div>
    </div>
    <div class="bili-analytics-footer">
      <button id="refresh-btn" class="bili-analytics-button">刷新</button>
      <button id="export-csv-btn" class="bili-analytics-button">导出CSV</button>
    </div>
  `;

  shadowRoot.appendChild(panel);

  // Inject styles
  injectCSS(mainCSS, shadowRoot);
  injectCSS(themeCSS, shadowRoot);
  
  const containers = {
      radarContainer: shadowRoot.getElementById('radar-chart'),
      timeSeriesContainer: shadowRoot.getElementById('timeseries-chart'),
      wordCloudContainer: shadowRoot.getElementById('wordcloud-chart'),
      heatmapContainer: shadowRoot.getElementById('heatmap-chart'),
  };

  // Add close button functionality
  shadowRoot.querySelector('.bili-analytics-close-btn').onclick = () => host.remove();
  
  log('log', '分析面板创建成功。');
  return { panel, containers };
}

/**
 * 绑定UI面板上的事件监听器
 * @param {object} eventHandlers
 * @param {function} eventHandlers.onRefresh - 点击刷新按钮时的回调
 * @param {function} eventHandlers.onExportCSV - 点击导出CSV按钮时的回调
 */
export function bindEvents(eventHandlers) {
    if (!shadowRoot) return;
    
    shadowRoot.getElementById('refresh-btn').addEventListener('click', eventHandlers.onRefresh);
    shadowRoot.getElementById('export-csv-btn').addEventListener('click', eventHandlers.onExportCSV);

    // Make panel draggable
    let isDragging = false;
    let offsetX, offsetY;
    const header = shadowRoot.querySelector('.bili-analytics-header');
    const panel = shadowRoot.querySelector('.bili-analytics-container');

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        header.style.cursor = 'move';
    });

    // Add resize observer
    const resizeObserver = new ResizeObserver(() => {
        resizeAllCharts();
    });
    resizeObserver.observe(panel);
}

/**
 * 显示加载状态
 */
export function showLoading() {
    if (!shadowRoot) return;
    const refreshBtn = shadowRoot.getElementById('refresh-btn');
    refreshBtn.disabled = true;
    refreshBtn.textContent = '加载中...';
}

/**
 * 隐藏加载状态
 */
export function hideLoading() {
    if (!shadowRoot) return;
    const refreshBtn = shadowRoot.getElementById('refresh-btn');
    refreshBtn.disabled = false;
    refreshBtn.textContent = '刷新';
}

/**
 * 在面板中显示AI分析摘要
 * @param {string} summary
 */
export function updateAISummary(summary) {
    if (!shadowRoot) return;
    let summaryEl = shadowRoot.getElementById('ai-summary');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.id = 'ai-summary';
        summaryEl.style.padding = '8px';
        summaryEl.style.borderTop = '1px solid var(--border-color)';
        shadowRoot.querySelector('.bili-analytics-content').insertAdjacentElement('afterend', summaryEl);
    }
    summaryEl.textContent = summary;
}

/**
 * 更新所有图表
 * @param {import('./INTERFACE.md').AnalysisResult} analysisResult - 分析结果
 */
export function updateCharts(analysisResult) {
    if (!shadowRoot) return;
    // This function will be the bridge to the charts module
    const { updateAllCharts } = require('./charts.js');
    updateAllCharts(analysisResult);
}

/**
 * 根据配置切换主题
 * @param {string} theme - 'light', 'dark', or 'auto'
 */
export function applyTheme(theme) {
    if (!shadowRoot) return;

    const host = shadowRoot.host;
    if (theme === 'auto') {
        // B站通过在html元素上添加'dark' class来切换暗黑模式
        theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }

    if (theme === 'dark') {
        host.classList.add('dark');
    } else {
        host.classList.remove('dark');
    }
}
// Placeholder for CSS styles to be injected by the build script.
const styles = '__INLINE_STYLES__';