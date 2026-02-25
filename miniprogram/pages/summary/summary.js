// pages/summary/summary.js - 修复版
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    loading: true,
    summaryText: '',
    keyStats: null,
    cycleNo: 0,
    cycleDay: 0,
    lengthDays: 21,
    mode: 'caregiver'
  },

  onLoad: function () {
    var ip = util.isPatient();
    this.setData({ isPatient: ip, mode: ip ? 'patient' : 'caregiver' });
    this._loadSummary();
  },

  onShow: function () {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  _loadSummary: function () {
    var that = this;
    that.setData({ loading: true });
    api.getSummary(that.data.mode).then(function (res) {
      that.setData({
        summaryText: res.summary_text || '暂无数据',
        keyStats: res.key_stats || null,
        cycleNo: res.cycle_no || 0,
        cycleDay: res.cycle_day || 0,
        lengthDays: res.length_days || 21,
        loading: false
      });
    }).catch(function (err) {
      that.setData({
        summaryText: '加载失败: ' + (err.message || ''),
        loading: false
      });
    });
  },

  onCopy: function () {
    wx.setClipboardData({
      data: this.data.summaryText,
      success: function () { wx.showToast({ title: '已复制', icon: 'success' }); }
    });
  },

  onShareAppMessage: function () {
    return {
      title: '化疗记录摘要 - 第' + (this.data.cycleNo || '?') + '疗程',
      path: '/pages/home/home'
    };
  }
});
