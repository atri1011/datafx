/**
 * @file exporter.js
 * @description 数据导出模块
 */

import { log } from './utils.js';
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
export function exportAsJSON(analysisResult) {
  const jsonString = JSON.stringify(analysisResult, null, 2);
  const fileName = `Bili-popular-analysis-${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(jsonString, fileName, 'application/json');
}

/**
 * 将分析结果导出为CSV文件
 * @param {AnalysisResult} analysisResult - 要导出的分析结果
 */
export function exportAsCSV(analysisResult) {
  const dataToExport = analysisResult.video_details;
  if (!dataToExport || dataToExport.length === 0) {
    log('warn', '没有可导出的数据');
    return;
  }
  
  const csvString = Papa.unparse(dataToExport);
  const fileName = `Bili-popular-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csvString, fileName, 'text/csv;charset=utf-8;');
}