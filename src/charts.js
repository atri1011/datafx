/**
 * @file charts.js
 * @description ECharts封装模块
 */

import { log } from './utils.js';
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
export function initCharts(containers) {
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
export function updateAllCharts(analysisResult) {
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
export function resizeAllCharts() {
    for (const key in chartInstances) {
        if (chartInstances[key]) {
            chartInstances[key].resize();
        }
    }
}