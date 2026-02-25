// pages/home/home.js - 优化版：动态问候 + 快速体温 + 鼓励展示
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
    greetingText: '',
    todayLog: null,
    hasRecorded: false,
    statusEmoji: '📝',
    statusText: '还没记录哦',
    encourageText: '',
    loading: true,

    // 快速体温弹窗
    showQuickTemp: false,
    quickTempValue: '',
    quickSaving: false
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
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    this._loadData();
  },

  // ─── 动态问候语 ───
  _getGreeting: function (cycleDay, lengthDays) {
    var hour = new Date().getHours();
    var nick = this.data.nickname;
    var name = nick ? ('，' + nick) : '';

    if (this.data.isPatient) {
      // 患者端：温暖鼓励
      if (hour < 9) return '早安' + name + ' ☀️';
      if (hour < 12) return '上午好' + name + ' 🌤';
      if (hour < 14) return '中午好' + name + ' 🍚';
      if (hour < 18) return '下午好' + name + ' 🌿';
      return '晚上好' + name + ' 🌙';
    } else {
      // 家属端
      if (hour < 12) return '上午好' + name;
      if (hour < 18) return '下午好' + name;
      return '晚上好' + name;
    }
  },

  // ─── 疗程阶段提示 ───
  _getCycleDayLabel: function (cycleDay, lengthDays) {
    if (!cycleDay) return '';

    if (cycleDay > (lengthDays || 21)) {
      return this.data.isPatient
        ? '这个疗程周期结束啦，辛苦了 🎉'
        : '⏰ 当前疗程已超期，请创建新疗程';
    }

    if (this.data.isPatient) {
      if (cycleDay <= 2) return '刚开始，好好休息 💤';
      if (cycleDay <= 5) return '这几天可能会有些反应，慢慢来 🤗';
      if (cycleDay <= 7) return '快撑过最难的几天了 💪';
      if (cycleDay <= 14) return '身体在慢慢恢复，继续加油 🌱';
      return '恢复期，每天都在变好 🌈';
    } else {
      if (cycleDay <= 2) return '化疗初期';
      if (cycleDay <= 7) return '⚠️ 副作用高峰期';
      if (cycleDay <= 14) return '恢复期';
      return '副作用窗口已过';
    }
  },

  // ─── 记录后鼓励语（患者端） ───
  _getEncouragement: function (log) {
    if (!log) return '';

    var e = log.energy;
    var n = log.nausea;
    var tough = log.is_tough_day;

    if (tough) {
      return '今天不容易，记录下来就很棒了 🌟';
    }

    // 状态不错
    if ((e != null && e <= 1) && (n != null && n <= 1)) {
      var goods = [
        '今天状态不错呀！继续保持 😊',
        '看起来恢复得很好 🌻',
        '身体在往好的方向走 💚'
      ];
      return goods[Math.floor(Math.random() * goods.length)];
    }

    // 中等
    if ((e != null && e <= 2) && (n != null && n <= 2)) {
      var okays = [
        '今天已经很努力了 🌿',
        '一步一步来，你做得很好 💛',
        '记录完成，好好休息吧 ☺️'
      ];
      return okays[Math.floor(Math.random() * okays.length)];
    }

    // 状态辛苦
    var toughs = [
      '辛苦了，记下来就是对自己最好的关爱 💗',
      '今天很不容易，明天会好一点的 🌅',
      '撑过去就好了，我们都在 🤗'
    ];
    return toughs[Math.floor(Math.random() * toughs.length)];
  },

  _loadData: function () {
    var that = this;
    that.setData({ loading: true });

    Promise.all([
      api.getCurrentCycle().catch(function () { return null; }),
      api.getToday().catch(function () { return null; })
    ]).then(function (results) {
      var cycle = results[0];
      var todayLog = results[1];

      var cycleNo = 0, cycleDay = 0, lengthDays = 21;
      if (cycle) {
        cycleNo = cycle.cycle_no;
        cycleDay = cycle.current_day || 0;
        lengthDays = cycle.length_days || 21;
      }

      var greetingText = that._getGreeting(cycleDay, lengthDays);
      var cycleDayLabel = that._getCycleDayLabel(cycleDay, lengthDays);

      var hasRecorded = !!todayLog;
      var statusEmoji = '📝';
      var statusText = '花1分钟记录一下今天的状态吧';
      var encourageText = '';

      if (hasRecorded) {
        statusEmoji = util.getStatusEmoji(todayLog.energy, todayLog.nausea);

        if (that.data.isPatient) {
          // 患者端：不显示数值，只显示鼓励
          statusText = '今天已记录 ✅';
          encourageText = that._getEncouragement(todayLog);
        } else {
          statusText = '体力' + (todayLog.energy != null ? todayLog.energy : '-') + '/4  恶心' + (todayLog.nausea != null ? todayLog.nausea : '-') + '/3  排便' + (todayLog.stool_count || 0) + '次';
        }
      }

      that.setData({
        cycleNo: cycleNo, cycleDay: cycleDay,
        greetingText: greetingText, cycleDayLabel: cycleDayLabel,
        todayLog: todayLog, hasRecorded: hasRecorded,
        statusEmoji: statusEmoji, statusText: statusText,
        encourageText: encourageText,
        loading: false
      });
    }).catch(function () {
      that.setData({ loading: false });
    });
  },

  // ─── 跳转完整记录 ───
  goRecord: function () { wx.switchTab({ url: '/pages/record/record' }); },

  // ─── 快速体温弹窗 ───
  showQuickTemp: function () {
    this.setData({ showQuickTemp: true, quickTempValue: '' });
  },

  hideQuickTemp: function () {
    this.setData({ showQuickTemp: false });
  },

  onQuickTempInput: function (e) {
    this.setData({ quickTempValue: e.detail.value });
  },

  onQuickTempSave: function () {
    var that = this;
    var temp = parseFloat(that.data.quickTempValue);

    if (!temp || temp < 35 || temp > 42) {
      wx.showToast({ title: '请输入正确体温 (35-42℃)', icon: 'none' });
      return;
    }

    that.setData({ quickSaving: true });
    api.upsertDailyLog(util.toDateStr(), {
      fever: temp >= 37.3,
      temp_c: temp,
      is_tough_day: true
    }).then(function () {
      wx.showToast({ title: '已记录 ✅', icon: 'success' });
      that.setData({ showQuickTemp: false });
      that._loadData();
    }).catch(function (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }).finally(function () {
      that.setData({ quickSaving: false });
    });
  },

  goStool: function () { wx.navigateTo({ url: '/pages/stool/stool' }); },
  goSummary: function () { wx.navigateTo({ url: '/pages/summary/summary' }); }
});
