// pages/settings/settings.js - 修复版
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    nickname: '',
    familyName: '',
    inviteCode: '',
    cycleNo: 0,
    cycleDay: 0,
    startDate: '',
    lengthDays: 21,

    // 编辑疗程
    showEditCycle: false,
    editStartDate: '',
    editLengthDays: 21,

    // 新建疗程
    showNewCycle: false,
    newCycleNo: '',
    newStartDate: '',

    // 历史疗程
    allCycles: [],
    showHistory: false
  },

  onLoad: function () {
    this.setData({
      isPatient: util.isPatient(),
      nickname: wx.getStorageSync('careline_nickname') || ''
    });
  },

  onShow: function () {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    this._loadData();
  },

  _loadData: function () {
    var that = this;

    api.getMyFamily().then(function (res) {
      that.setData({ familyName: res.name || '', inviteCode: res.invite_code || '' });
    }).catch(function () {});

    api.getCurrentCycle().then(function (res) {
      that.setData({
        cycleNo: res.cycle_no || 0,
        cycleDay: res.current_day || 0,
        startDate: res.start_date || '',
        lengthDays: res.length_days || 21
      });
    }).catch(function () {});

    // 所有角色都加载历史疗程
    api.listCycles().then(function (cycles) {
      that.setData({ allCycles: cycles || [] });
    }).catch(function () {});
  },

  // ─── 编辑当前疗程 ───
  toggleEditCycle: function () {
    this.setData({
      showEditCycle: !this.data.showEditCycle,
      editStartDate: this.data.startDate,
      editLengthDays: this.data.lengthDays
    });
  },

  onEditStartDateChange: function (e) {
    this.setData({ editStartDate: e.detail.value });
  },

  onEditLengthDaysInput: function (e) {
    this.setData({ editLengthDays: Number(e.detail.value) });
  },

  onSaveEditCycle: function () {
    var that = this;
    api.createCycle({
      cycle_no: that.data.cycleNo,
      start_date: that.data.editStartDate,
      length_days: that.data.editLengthDays || 21
    }).then(function () {
      wx.showToast({ title: '已更新', icon: 'success' });
      that.setData({ showEditCycle: false });
      that._loadData();
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    });
  },

  // ─── 新建疗程 ───
  toggleNewCycle: function () {
    var now = new Date();
    var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    this.setData({
      showNewCycle: !this.data.showNewCycle,
      showEditCycle: false,
      newCycleNo: String(this.data.cycleNo + 1),
      newStartDate: dateStr
    });
  },

  onNewCycleNoInput: function (e) {
    this.setData({ newCycleNo: e.detail.value });
  },

  onNewStartDateChange: function (e) {
    this.setData({ newStartDate: e.detail.value });
  },

  onCreateCycle: function () {
    var that = this;
    var no = parseInt(that.data.newCycleNo);
    var date = that.data.newStartDate;
    if (!no || !date) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    api.createCycle({ cycle_no: no, start_date: date, length_days: 21 })
      .then(function () {
        wx.showToast({ title: '创建成功', icon: 'success' });
        that.setData({ showNewCycle: false });
        that._loadData();
      })
      .catch(function (err) {
        wx.showToast({ title: err.message, icon: 'none' });
      });
  },

  // ─── 历史疗程 ───
  toggleHistory: function () {
    this.setData({ showHistory: !this.data.showHistory });
  },

  switchToCycle: function (e) {
    var no = Number(e.currentTarget.dataset.no);
    var that = this;
    wx.showModal({
      title: '切换疗程',
      content: '将第' + no + '疗程设为当前活跃疗程？',
      success: function (res) {
        if (res.confirm) {
          var cycle = that.data.allCycles.find(function (c) { return c.cycle_no === no; });
          if (cycle) {
            api.createCycle({
              cycle_no: cycle.cycle_no,
              start_date: cycle.start_date,
              length_days: cycle.length_days
            }).then(function () {
              wx.showToast({ title: '已切换', icon: 'success' });
              that._loadData();
            }).catch(function (err) {
              wx.showToast({ title: err.message, icon: 'none' });
            });
          }
        }
      }
    });
  },

  copyInviteCode: function () {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: function () { wx.showToast({ title: '已复制', icon: 'success' }); }
    });
  },

  goSummary: function () {
    wx.navigateTo({ url: '/pages/summary/summary' });
  },

  onLogout: function () {
    wx.showModal({
      title: '退出登录',
      content: '确认退出？',
      success: function (res) {
        if (res.confirm) { getApp().logout(); }
      }
    });
  }
});
