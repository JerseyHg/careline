// pages/settings/settings.js
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    role: '',
    nickname: '',
    familyName: '',
    inviteCode: '',
    cycleNo: 0,
    cycleDay: 0,
    startDate: '',
    showNewCycle: false,
    newCycleNo: 1,
    newStartDate: ''
  },

  onLoad: function () {
    var role = util.getRole();
    this.setData({
      isPatient: role === 'patient',
      role: role,
      nickname: wx.getStorageSync('careline_nickname') || ''
    });
  },

  onShow: function () {
    this._loadData();
  },

  _loadData: function () {
    var that = this;
    Promise.all([
      api.getMyFamily().catch(function () { return null; }),
      api.getCurrentCycle().catch(function () { return null; })
    ]).then(function (results) {
      var family = results[0];
      var cycle = results[1];
      if (family) {
        that.setData({ familyName: family.name, inviteCode: family.invite_code });
      }
      if (cycle) {
        that.setData({
          cycleNo: cycle.cycle_no,
          cycleDay: cycle.current_day || 0,
          startDate: cycle.start_date
        });
      }
    });
  },

  copyInviteCode: function () {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: function () { wx.showToast({ title: '邀请码已复制', icon: 'success' }); }
    });
  },

  toggleNewCycle: function () {
    var now = new Date();
    var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    this.setData({
      showNewCycle: !this.data.showNewCycle,
      newCycleNo: this.data.cycleNo + 1,
      newStartDate: dateStr
    });
  },

  onNewCycleNoInput: function (e) {
    this.setData({ newCycleNo: Number(e.detail.value) });
  },

  onNewStartDateChange: function (e) {
    this.setData({ newStartDate: e.detail.value });
  },

  onCreateCycle: function () {
    var that = this;
    if (!that.data.newCycleNo || !that.data.newStartDate) {
      wx.showToast({ title: '请填写完整', icon: 'none' }); return;
    }
    api.createCycle({
      cycle_no: that.data.newCycleNo,
      start_date: that.data.newStartDate
    }).then(function () {
      wx.showToast({ title: '疗程已创建', icon: 'success' });
      that.setData({ showNewCycle: false });
      that._loadData();
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    });
  },

  goSummary: function () {
    wx.navigateTo({ url: '/pages/summary/summary' });
  },

  onLogout: function () {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: function (res) {
        if (res.confirm) {
          var app = getApp();
          app.logout();
        }
      }
    });
  }
});
