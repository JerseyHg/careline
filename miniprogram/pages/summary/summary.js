// pages/summary/summary.js
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    loading: true,
    summaryText: '',
    keyStats: null,
    mode: 'caregiver'
  },

  onLoad: function () {
    var ip = util.isPatient();
    this.setData({ isPatient: ip, mode: ip ? 'patient' : 'caregiver' });
    this._loadSummary();
  },

  _loadSummary: function () {
    var that = this;
    that.setData({ loading: true });
    api.getSummary(that.data.mode).then(function (res) {
      that.setData({
        summaryText: res.summary_text || '暂无数据',
        keyStats: res.key_stats || null,
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
      success: function () {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  onShareAppMessage: function () {
    var ks = this.data.keyStats;
    return {
      title: '化疗记录摘要 - 第' + (ks && ks.cycle_no ? ks.cycle_no : '?') + '疗程',
      path: '/pages/home/home'
    };
  }
});
