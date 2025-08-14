// ==UserScript==
// @name         bilibili-popular-analyzer
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  B站热门视频AI数据分析油猴脚本
// @author       Kilo Code
// @match        https://www.bilibili.com/v/popular/all
// @match        https://www.bilibili.com/video/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5.3.2/dist/echarts.min.js
// ==/UserScript==

(function() {
'use strict';

/**
 * @file main.js
 * @description 脚本主入口
 */

(() => {
const module = { exports: {} };
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
function log(level, message, ...args) {
  console[level](`[BiliAnalytics] ${message}`, ...args);
}

/**
 * 将CSS文本注入到指定的DOM节点（或Shadow DOM）中
 * @param {string} cssText CSS样式文本
 * @param {HTMLElement|ShadowRoot} targetNode 目标节点
 */
function injectCSS(cssText, targetNode) {
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
function formatDate(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
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
function deepClone(obj) {
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
return module.exports;
})();
(() => {
const module = { exports: {} };
/**
 * @file config.js
 * @description 用户配置管理模块
 */

;

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
function loadConfig() {
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
function saveConfig(newConfig) {
  const currentConfig = loadConfig();
  const updatedConfig = { ...currentConfig, ...newConfig };
  GM_setValue(CONFIG_KEY, JSON.stringify(updatedConfig));
}
return module.exports;
})();
(() => {
const module = { exports: {} };
/**
 * @file api.js
 * @description API请求模块
 */

;

/**
 * @typedef {import('./INTERFACE.md').VideoInfo} VideoInfo
 */

/**
 * 获取B站热门视频列表
 * @param {object} [options] - 请求选项
 * @param {number} [options.limit=20] - 希望获取的视频数量
 * @returns {Promise<VideoInfo[]>} - 包含视频信息的数组
 * @throws {Error} - 当API请求失败或返回数据格式不正确时抛出异常
 */
function getPopularVideos({ limit = 20 } = {}) {
  // B站热门视频的官方API端点
  const url = `https://api.bilibili.com/x/web-interface/popular?ps=${limit}&pn=1`;
  
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      responseType: 'json',
      onload: (response) => {
        if (response.status === 200 && response.response.code === 0) {
          const videoList = response.response.data.list.map(item => ({
            bvid: item.bvid,
            title: item.title,
            author: item.owner.name,
            view: item.stat.view,
            danmaku: item.stat.danmaku,
            reply: item.stat.reply,
            favorite: item.stat.favorite,
            coin: item.stat.coin,
            share: item.stat.share,
            like: item.stat.like,
            pubdate: item.pubdate,
            pic: item.pic,
          }));
          log('log', '热门视频数据获取成功', videoList);
          resolve(videoList);
        } else {
          log('error', '获取热门视频失败', response);
          reject(new Error(`获取B站热门视频失败: ${response.response.message || '未知错误'}`));
        }
      },
      onerror: (error) => {
        log('error', '网络请求错误', error);
        reject(new Error('网络请求错误'));
      },
    });
  });
}

/**
 * 调用外部 AI API 获取分析建议
 * @param {string} prompt - 发送给AI的提示语
 * @param {string} apiUrl - AI API 的服务器地址
 * @param {string} apiKey - 用户的API Key
 * @returns {Promise<string>} - AI返回的分析文本
 * @throws {Error} - 当API请求失败时抛出异常
 */
function getAiAnalysis(prompt, apiUrl, apiKey) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      data: JSON.stringify({
        model: 'gpt-4.1', // 或者其他模型
        messages: [{ role: 'user', content: prompt }],
      }),
      responseType: 'json',
      onload: (response) => {
        if (response.status === 200 && response.response.choices && response.response.choices.length > 0) {
          const content = response.response.choices.message.content;
          log('log', 'AI分析成功', content);
          resolve(content);
        } else {
          log('error', 'AI分析API请求失败', response);
          reject(new Error(`AI分析失败: ${response.response.message || '无法获取分析结果'}`));
        }
      },
      onerror: (error) => {
        log('error', 'AI分析网络请求错误', error);
        reject(new Error('AI分析服务网络请求错误'));
      }
    });
  });
}
return module.exports;
})();
(() => {
const module = { exports: {} };
/**
 * @file analysis.js
 * @description 核心数据处理与分析模块
 */

;
;
// Assume lodash is available via @require
// import _ from 'lodash';

/**
 * @typedef {import('./INTERFACE.md').VideoInfo} VideoInfo
 * @typedef {import('./INTERFACE.md').ProcessedVideoInfo} ProcessedVideoInfo
 * @typedef {import('./INTERFACE.md').AnalysisResult} AnalysisResult
 * @typedef {import('./INTERFACE.md').UserConfig} UserConfig
 */

/**
 * 计算单个视频的衍生指标
 * @param {VideoInfo} video - 原始视频信息
 * @returns {ProcessedVideoInfo} - 添加了衍生指标的视频信息
 */
function calculateDerivedMetrics(video) {
  const view = video.view > 0 ? video.view : 1; // Avoid division by zero
  return {
    ...video,
    like_rate: video.like / view,
    coin_rate: video.coin / view,
    fav_rate: video.favorite / view,
    interaction_rate: (video.like + video.coin + video.favorite) / view,
  };
}

/**
 * 对原始视频数据进行处理和深度分析
 * @param {VideoInfo[]} rawData - 从api.js获取的原始视频数据
 * @param {UserConfig} config - 用户配置
 * @returns {Promise<AnalysisResult>} - 包含所有分析结果的对象
 */
async function performAnalysis(rawData, config) {
  log('log', '开始进行数据分析...');

  const video_details = rawData.map(calculateDerivedMetrics);

  // 1. Descriptive Statistics
  const metricsToAnalyze = ['view', 'like', 'coin', 'favorite', 'danmaku', 'reply', 'interaction_rate'];
  const descriptive_stats = metricsToAnalyze.reduce((acc, metric) => {
    const values = _.map(video_details, metric);
    acc[metric] = {
      mean: _.mean(values),
      median: _.sortBy(values)[Math.floor(values.length / 2)],
      stdDev: Math.sqrt(_.sum(_.map(values, v => Math.pow(v - _.mean(values), 2))) / values.length),
      min: _.min(values),
      max: _.max(values),
    };
    return acc;
  }, {});

  // 2. UP主聚合分析
  const up_aggregate = _(video_details)
    .groupBy('author')
    .map((videos, author) => ({
      author,
      videoCount: videos.length,
      totalViews: _.sumBy(videos, 'view'),
      totalLikes: _.sumBy(videos, 'like'),
    }))
    .orderBy(['videoCount', 'totalViews'], ['desc', 'desc'])
    .value();

  // 3. 词云数据生成 (simple version)
  const word_cloud_data = _(video_details)
    .flatMap(v => v.title.match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g)) // basic word tokenization
    .filter(word => word && word.length > 1)
    .countBy()
    .map((value, name) => ({ name, value }))
    .orderBy(['value'], ['desc'])
    .take(50)
    .value();

  // 4. Generate a prompt for AI analysis
  const titles = video_details.map(v => v.title).join(', ');
  const aiPrompt = `基于以下B站热门视频标题，请分析当前的热门内容趋势、关键词和潜在的财富密码，总结成一段150字以内的摘要：${titles}`;

  let ai_summary = 'AI分析功能未开启或配置错误。';
  if (config.aiApiKey && config.aiApiUrl) {
    try {
      ai_summary = await getAiAnalysis(aiPrompt, config.aiApieUrl, config.aiApiKey);
    } catch (error) {
      log('error', 'AI分析失败', error);
      ai_summary = `AI分析请求失败: ${error.message}`;
    }
  }

  const result = {
    video_details,
    descriptive_stats,
    outlier_videos: [], // Placeholder for now
    correlation_matrix: {}, // Placeholder for now
    up_aggregate,
    ai_summary,
    word_cloud_data,
  };

  log('log', '数据分析完成', result);
  return result;
}
return module.exports;
})();
(() => {
const module = { exports: {} };
/**
 * @file exporter.js
 * @description 数据导出模块
 */

;
// Assume PapaParse is available via @require
// import Papa from 'papaparse';

/**
 * @typedef {import('./INTERFACE.md').AnalysisResult} AnalysisResult
 */

/**
 * 触发浏览器下载
 * @param {string} content - 文件内容
 * @param {string} fileName - 文件名
 * @param {string} mimeType - MIME类型
 */
function triggerDownload(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log('log', `${fileName} 已成功导出`);
}

/**
 * 将分析结果导出为JSON文件
 * @param {AnalysisResult} analysisResult - 要导出的分析结果
 */
function exportAsJSON(analysisResult) {
  const jsonString = JSON.stringify(analysisResult, null, 2);
  const fileName = `Bili-popular-analysis-${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(jsonString, fileName, 'application/json');
}

/**
 * 将分析结果导出为CSV文件
 * @param {AnalysisResult} analysisResult - 要导出的分析结果
 */
function exportAsCSV(analysisResult) {
  const dataToExport = analysisResult.video_details;
  if (!dataToExport || dataToExport.length === 0) {
    log('warn', '没有可导出的数据');
    return;
  }
  
  const csvString = Papa.unparse(dataToExport);
  const fileName = `Bili-popular-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csvString, fileName, 'text/csv;charset=utf-8;');
}
return module.exports;
})();
(() => {
const module = { exports: {} };
/**
 * @file charts.js
 * @description ECharts封装模块
 */

;
// Assume echarts is available via @require
// import * as echarts from 'echarts';

/**
 * @typedef {import('./INTERFACE.md').AnalysisResult} AnalysisResult
 */

let chartInstances = {};

/**
 * 初始化所有图表实例
 * @param {object} containers - 包含各个图表DOM容器的对象
 * @param {HTMLElement} containers.radarContainer - 雷达图容器
 * @param {HTMLElement} containers.timeSeriesContainer - 时间序列图容器
 * @param {HTMLElement} containers.wordCloudContainer - 词云图容器
 * @param {HTMLElement} containers.heatmapContainer - 热力图容器
 */
function initCharts(containers) {
  chartInstances.radar = echarts.init(containers.radarContainer);
  chartInstances.timeSeries = echarts.init(containers.timeSeriesContainer);
  chartInstances.wordCloud = echarts.init(containers.wordCloudContainer);
  chartInstances.heatmap = echarts.init(containers.heatmapContainer);
  log('log', 'ECharts实例初始化完成');
}

/**
 * 更新雷达图
 * @param {AnalysisResult} analysisResult
 */
function updateRadarChart(analysisResult) {
    const { descriptive_stats } = analysisResult;
    const meanData = [
        descriptive_stats.like_rate.mean,
        descriptive_stats.coin_rate.mean,
        descriptive_stats.fav_rate.mean,
        descriptive_stats.interaction_rate.mean,
        descriptive_stats.danmaku.mean / descriptive_stats.view.mean,
    ];
    const medianData = [
        descriptive_stats.like_rate.median,
        descriptive_stats.coin_rate.median,
        descriptive_stats.fav_rate.median,
        descriptive_stats.interaction_rate.median,
        descriptive_stats.danmaku.median / descriptive_stats.view.median,
    ];

    const option = {
        title: { text: '综合指标雷达图' },
        tooltip: {},
        legend: { data: ['平均指标', '中位数指标'] },
        radar: {
            indicator: [
                { name: '点赞率', max: Math.max(...meanData, ...medianData) * 1.2 },
                { name: '投币率', max: Math.max(...meanData, ...medianData) * 1.2 },
                { name: '收藏率', max: Math.max(...meanData, ...medianData) * 1.2 },
                { name: '互动率', max: Math.max(...meanData, ...medianData) * 1.2 },
                { name: '弹幕/播放', max: Math.max(...meanData, ...medianData) * 1.2 },
            ],
        },
        series: [{
            name: '指标分析',
            type: 'radar',
            data: [
                { value: meanData, name: '平均指标' },
                { value: medianData, name: '中位数指标' }
            ],
        }],
    };
  chartInstances.radar.setOption(option, true);
}

function updateWordCloudChart(analysisResult) {
    const { word_cloud_data } = analysisResult;
    const option = {
        title: { text: '热门视频标题词云' },
        tooltip: {},
        series: [{
            type: 'wordCloud',
            shape: 'circle',
            data: word_cloud_data,
            textStyle: {
                fontFamily: 'sans-serif',
                fontWeight: 'bold',
                color: function () {
                    return 'rgb(' + [
                        Math.round(Math.random() * 160),
                        Math.round(Math.random() * 160),
                        Math.round(Math.random() * 160)
                    ].join(',') + ')';
                }
            },
        }]
    };
    chartInstances.wordCloud.setOption(option, true);
}

/**
 * 更新所有图表的数据
 * @param {AnalysisResult} analysisResult - 来自analysis.js的分析结果
 */
function updateAllCharts(analysisResult) {
    if (!chartInstances.radar) {
        log('error', '图表未初始化');
        return;
    }
    
    log('log', '开始更新图表数据');
    updateRadarChart(analysisResult);
    updateWordCloudChart(analysisResult);
    // TODO: updateTimeSeriesChart(analysisResult);
    // TODO: updateHeatmapChart(analysisResult);
    log('log', '图表数据更新完成');
}

/**
 * 当面板大小变化时，调整所有图表尺寸
 */
function resizeAllCharts() {
    for (const key in chartInstances) {
        if (chartInstances[key]) {
            chartInstances[key].resize();
        }
    }
}
return module.exports;
})();
(() => {
const module = { exports: {} };
/**
 * @file ui.js
 * @description UI面板管理模块
 */

;
import { getPopularVideos } from './api.js';
;
;
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
function createPanel() {
  log('log', 'A tentar criar o painel de análise...');
  if (document.getElementById('bili-analytics-host')) {
    log('warn', 'O painel de análise já existe.');
    return { panel: null, containers: null };
  }

  const host = document.createElement('div');
  host.id = 'bili-analytics-host';
  
  if (document.body) {
    log('log', 'document.body encontrado. A anexar o anfitrião.');
    document.body.appendChild(host);
    log('log', 'Anfitrião anexado ao body com sucesso.');
  } else {
    log('error', 'document.body não encontrado. O script pode estar a ser executado demasiado cedo.');
    return { panel: null, containers: null };
  }

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
function bindEvents(eventHandlers) {
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
function showLoading() {
    if (!shadowRoot) return;
    const refreshBtn = shadowRoot.getElementById('refresh-btn');
    refreshBtn.disabled = true;
    refreshBtn.textContent = '加载中...';
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    if (!shadowRoot) return;
    const refreshBtn = shadowRoot.getElementById('refresh-btn');
    refreshBtn.disabled = false;
    refreshBtn.textContent = '刷新';
}

/**
 * 在面板中显示AI分析摘要
 * @param {string} summary
 */
function updateAISummary(summary) {
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
function updateCharts(analysisResult) {
    if (!shadowRoot) return;
    // This function will be the bridge to the charts module
    const { updateAllCharts } = require('./charts.js');
    updateAllCharts(analysisResult);
}

/**
 * 根据配置切换主题
 * @param {string} theme - 'light', 'dark', or 'auto'
 */
function applyTheme(theme) {
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
const styles = '"/*\n * @file main.css\n * @description 主要样式文件\n */\n\n/* 使用 a specific prefix for all selectors to avoid conflicts */\n.bili-analytics-container {\n  position: fixed;\n  top: 100px;\n  right: 20px;\n  z-index: 9999;\n  width: 400px;\n  max-height: 80vh;\n  border-radius: 8px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n}\n\n.bili-analytics-header {\n  padding: 12px 16px;\n  font-weight: 600;\n  cursor: move;\n  user-select: none;\n}\n\n.bili-analytics-content {\n  flex-grow: 1;\n  overflow-y: auto;\n  padding: 0 16px;\n}\n\n.bili-analytics-chart-container {\n  width: 100%;\n  height: 300px;\n  margin-bottom: 16px;\n}\n\n.bili-analytics-footer {\n  padding: 12px 16px;\n  display: flex;\n  justify-content: flex-end;\n  gap: 8px;\n}\n\n.bili-analytics-button {\n  padding: 6px 12px;\n  border-radius: 4px;\n  border: 1px solid transparent;\n  cursor: pointer;\n  font-size: 14px;\n}\n/*\n * @file themes.css\n * @description 明暗主题适配样式\n */\n\n/* \n * The :host selector allows us to style the Shadow DOM's host element.\n * We define CSS variables for theming.\n */\n\n:host {\n  /* Light Theme (default) */\n  --bg-color: #ffffff;\n  --text-color-primary: #181818;\n  --text-color-secondary: #606060;\n  --border-color: #e0e0e0;\n  --header-bg-color: #f9f9f9;\n  --button-bg-color: #f0f0f0;\n  --button-hover-bg-color: #e0e0e0;\n  --button-text-color: #333;\n}\n\n:host(.dark) {\n  /* Dark Theme */\n  --bg-color: #202020;\n  --text-color-primary: #f1f1f1;\n  --text-color-secondary: #aaaaaa;\n  --border-color: #383838;\n  --header-bg-color: #282828;\n  --button-bg-color: #3e3e3e;\n  --button-hover-bg-color: #505050;\n  --button-text-color: #f1f1f1;\n}\n\n/* Apply variables from main.css */\n.bili-analytics-container {\n  background-color: var(--bg-color);\n  color: var(--text-color-primary);\n  border: 1px solid var(--border-color);\n}\n\n.bili-analytics-header {\n  background-color: var(--header-bg-color);\n  border-bottom: 1px solid var(--border-color);\n}\n\n.bili-analytics-footer {\n  border-top: 1px solid var(--border-color);\n}\n\n.bili-analytics-button {\n  background-color: var(--button-bg-color);\n  color: var(--button-text-color);\n  border: 1px solid var(--border-color);\n}\n\n.bili-analytics-button:hover {\n  background-color: var(--button-hover-bg-color);\n}\n"';
return module.exports;
})();

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
})();