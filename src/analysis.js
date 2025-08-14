/**
 * @file analysis.js
 * @description 核心数据处理与分析模块
 */

import { getAiAnalysis } from './api.js';
import { log } from './utils.js';
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
export async function performAnalysis(rawData, config) {
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
      ai_summary = await getAiAnalysis(aiPrompt, config.aiApiUrl, config.aiApiKey);
    } catch (error) {
      log('error', 'AI分析失败', error);
      ai_summary = `AI分析请求失败: ${error.message}`;
    }
  }

  // TODO: Implement word cloud data generation
  const word_cloud_data = []; // Placeholder

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