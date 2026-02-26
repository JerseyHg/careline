// pages/home/home.js - 优化版：脏标记缓存 + 动态问候 + 快速体温
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

    // 脏标记检查：没有数据变化且已加载过 → 跳过请求
    var dirty = wx.getStorageSync('careline_dirty');
    if (!dirty && this._loaded) return;
    wx.removeStorageSync('careline_dirty');

    this._loadData();
  },

  // ─── 动态问候语 ───
  _getGreeting: function (cycleDay, lengthDays) {
    var hour = new Date().getHours();
    var nick = this.data.nickname;
    var name = nick ? ('，' + nick) : '';

    if (this.data.isPatient) {
      if (hour < 9) return '早安' + name + ' ☀️';
      if (hour < 12) return '上午好' + name + ' 🌤';
      if (hour < 14) return '中午好' + name + ' 🍚';
      if (hour < 18) return '下午好' + name + ' 🌿';
      return '晚上好' + name + ' 🌙';
    } else {
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
        ? '疗程已结束，等待下一个疗程'
        : '超出周期 (D' + cycleDay + '/' + (lengthDays || 21) + ')';
    }

    if (this.data.isPatient) {
      if (cycleDay <= 2) return '输液期，加油 💪';
      if (cycleDay <= 7) return '这几天可能会难受，慢慢来';
      if (cycleDay <= 14) return '在恢复了，继续坚持';
      return '快到休息期了 ☺️';
    } else {
      return '第' + cycleDay + '天 / 共' + (lengthDays || 21) + '天';
    }
  },

  // ─── 鼓励语 ───
  _getEncouragement: function (log) {
    if (!log) return '';
    var e = log.energy != null ? log.energy : 0;
    var n = log.nausea != null ? log.nausea : 0;
    if (e >= 3 || n >= 3) return '今天辛苦了，好好休息 💕';
    if (e >= 2 || n >= 2) return '再坚持一下，明天会好一些';
    return '状态不错，继续保持 👍';
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

      var cycleNo = cycle ? cycle.cycle_no : 0;
      var cycleDay = cycle ? cycle.current_day : 0;
      var lengthDays = cycle ? cycle.length_days : 21;

      var greetingText = that._getGreeting(cycleDay, lengthDays);
      var cycleDayLabel = that._getCycleDayLabel(cycleDay, lengthDays);

      var hasRecorded = !!todayLog;
      var statusEmoji = '📝';
      var statusText = '花1分钟记录一下今天的状态吧';
      var encourageText = '';

      if (hasRecorded) {
        statusEmoji = util.getStatusEmoji(todayLog.energy, todayLog.nausea);

        if (that.data.isPatient) {
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

      that._loaded = true;
    }).catch(function () {
      that.setData({ loading: false });
      that._loaded = true;
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
      wx.setStorageSync('careline_dirty', '1');
      that._loaded = false; // 强制本页也刷新
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
