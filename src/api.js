/**
 * @file api.js
 * @description API请求模块
 */

import { log } from './utils.js';

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
export function getPopularVideos({ limit = 20 } = {}) {
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
export function getAiAnalysis(prompt, apiUrl, apiKey) {
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