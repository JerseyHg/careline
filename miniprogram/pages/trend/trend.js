// pages/trend/trend.js
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    loading: true,
    calendarDays: [],
    calMonth: '',
    streak: 0,
    trendData: [],
    cycleNo: 0
  },

  onLoad: function () {
    this.setData({ isPatient: util.isPatient() });
  },

  onShow: function () {
    this._loadData();
  },

  _loadData: function () {
    var that = this;
    that.setData({ loading: true });

    if (that.data.isPatient) {
      that._loadCalendar();
    } else {
      that._loadTrend();
    }
  },

  _loadCalendar: function () {
    var that = this;
    api.getCalendar().then(function (res) {
      var year = res.year;
      var month = res.month;
      var daysMap = {};

      (res.days || []).forEach(function (d) {
        var dayNum = new Date(d.date).getDate();
        daysMap[dayNum] = d;
      });

      var firstDay = new Date(year, month - 1, 1).getDay();
      var daysInMonth = new Date(year, month, 0).getDate();
      var now = new Date();
      var todayDate = now.getDate();
      var todayMonth = now.getMonth() + 1;

      var calendarDays = [];
      for (var i = 0; i < firstDay; i++) {
        calendarDays.push({ empty: true });
      }
      for (var d = 1; d <= daysInMonth; d++) {
        var logDay = daysMap[d];
        calendarDays.push({
          empty: false,
          day: d,
          isToday: d === todayDate && month === todayMonth,
          emoji: logDay ? util.getStatusEmoji(logDay.energy, logDay.nausea) : '',
          hasLog: !!logDay,
          cycleDay: logDay ? logDay.cycle_day : null
        });
      }

      that.setData({
        calendarDays: calendarDays,
        calMonth: year + '年' + month + '月',
        streak: res.streak || 0,
        loading: false
      });
    }).catch(function () {
      that.setData({ loading: false });
    });
  },

  _loadTrend: function () {
    var that = this;
    api.getSummary('caregiver').then(function (res) {
      that.setData({
        trendData: res.trends || [],
        cycleNo: (res.key_stats && res.key_stats.cycle_no) || 0,
        loading: false
      });
    }).catch(function () {
      that.setData({ loading: false });
    });
  },

  goSummary: function () {
    wx.navigateTo({ url: '/pages/summary/summary' });
  }
});
