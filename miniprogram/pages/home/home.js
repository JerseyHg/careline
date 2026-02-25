// pages/home/home.js
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    role: '',
    isPatient: true,
    nickname: '',
    cycleNo: 0,
    cycleDay: 0,
    cycleDayLabel: '',
    todayLog: null,
    hasRecorded: false,
    statusEmoji: '📝',
    statusText: '还没记录哦',
    messages: [],
    loading: true
  },

  onLoad: function () {
    var token = wx.getStorageSync('careline_token');
    var role = wx.getStorageSync('careline_role');
    if (!token || !role) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({
      role: role,
      isPatient: role === 'patient',
      nickname: wx.getStorageSync('careline_nickname') || ''
    });
  },

  onShow: function () {
    this._loadData();
  },

  _loadData: function () {
    var that = this;
    that.setData({ loading: true });

    Promise.all([
      api.getCurrentCycle().catch(function () { return null; }),
      api.getToday().catch(function () { return null; }),
      api.getActiveMessages().catch(function () { return []; })
    ]).then(function (results) {
      var cycle = results[0];
      var todayLog = results[1];
      var messages = results[2];

      var cycleNo = 0, cycleDay = 0, cycleDayLabel = '';
      if (cycle) {
        cycleNo = cycle.cycle_no;
        cycleDay = cycle.current_day || 0;
        if (cycleDay >= 3 && cycleDay <= 7) {
          cycleDayLabel = that.data.isPatient ? '身体可能会有些反应，注意休息' : '⚠️ 副作用高峰期';
        } else if (cycleDay > 7) {
          cycleDayLabel = that.data.isPatient ? '最难的几天快过去了' : '副作用窗口已过';
        } else {
          cycleDayLabel = that.data.isPatient ? '刚开始，状态还不错' : '化疗初期';
        }
      }

      var hasRecorded = !!todayLog;
      var statusEmoji = '📝';
      var statusText = '还没记录哦，花1分钟记一下吧';
      if (hasRecorded) {
        statusEmoji = util.getStatusEmoji(todayLog.energy, todayLog.nausea);
        if (that.data.isPatient) {
          var eLabel = todayLog.energy != null ? util.ENERGY_LABELS_PATIENT[todayLog.energy] : '';
          statusText = eLabel || '今天已记录 ✅';
        } else {
          statusText = '体力' + (todayLog.energy != null ? todayLog.energy : '-') + '/4 恶心' + (todayLog.nausea != null ? todayLog.nausea : '-') + '/3 排便' + (todayLog.stool_count || 0) + '次';
        }
      }

      that.setData({
        cycleNo: cycleNo, cycleDay: cycleDay, cycleDayLabel: cycleDayLabel,
        todayLog: todayLog, hasRecorded: hasRecorded,
        statusEmoji: statusEmoji, statusText: statusText,
        messages: messages || [],
        loading: false
      });
    }).catch(function () {
      that.setData({ loading: false });
    });
  },

  goRecord: function () { wx.switchTab({ url: '/pages/record/record' }); },
  goToughDay: function () { wx.navigateTo({ url: '/pages/record/record?tough=1' }); },
  goStool: function () { wx.navigateTo({ url: '/pages/stool/stool' }); },
  goSummary: function () { wx.navigateTo({ url: '/pages/summary/summary' }); }
});
