/**
 * @file main.js
 * @description 脚本主入口
 */

import { log } from './utils.js';
import { loadConfig } from './config.js';
import { getPopularVideos } from './api.js';
import { performAnalysis } from './analysis.js';
import { exportAsCSV, exportAsJSON } from './exporter.js';
import { initCharts, updateAllCharts } from './charts.js';
import { createPanel, bindEvents, applyTheme, showLoading, hideLoading, updateAISummary, updateCharts } from './ui.js';

let lastAnalysisResult = null;

/**
 * 核心刷新流程
 */
async function handleRefresh() {
  showLoading();
  try {
    const config = loadConfig();
    const rawData = await getPopularVideos({ limit: config.videoLimit });
    const analysisResult = await performAnalysis(rawData, config);
    lastAnalysisResult = analysisResult;
    
    updateCharts(analysisResult);
    updateAISummary(analysisResult.ai_summary);

  } catch (error) {
    log('error', '处理刷新时发生错误:', error);
    // TODO: show error message in UI
  } finally {
    hideLoading();
  }
}

function handleExportCSV() {
    if (lastAnalysisResult) {
        exportAsCSV(lastAnalysisResult);
    } else {
        log('warn', '没有可导出的分析数据。');
    }
}

/**
 * 主函数
 */
function main() {
  log('log', 'B站热门视频AI分析脚本已启动。');

  // 1. 创建UI
  const { panel, containers } = createPanel();
  if (!panel) return;

  // 2. 初始化图表
  initCharts(containers);

  // 3. 应用初始主题
  const config = loadConfig();
  applyTheme(config.theme);
  
  // 4. 绑定事件
  bindEvents({
    onRefresh: handleRefresh,
    onExportCSV: handleExportCSV
  });

  // 5. 首次加载数据
  handleRefresh();
  
  // 6. 监听B站主题变化
  const themeObserver = new MutationObserver(() => {
    applyTheme(loadConfig().theme);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// --- 启动 ---
// 确保在DOM加载完成后再执行脚本，以避免 document.body 为 null 的情况
if (document.readyState === 'loading') {
    log('log', 'DOM a carregar, a adicionar o ouvinte DOMContentLoaded.');
    document.addEventListener('DOMContentLoaded', main);
} else {
    log('log', 'DOM já carregado, executando main() diretamente.');
    main();
}