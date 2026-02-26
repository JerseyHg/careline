// pages/onboard/onboard.js
var api = require('../../utils/api');

Page({
  data: {
    mode: '',
    familyName: '',
    nickname: '',
    inviteCode: '',
    role: 'patient',
    loading: false
  },

  selectCreate: function () { this.setData({ mode: 'create' }); },
  selectJoin: function () { this.setData({ mode: 'join' }); },
  goBack: function () { this.setData({ mode: '' }); },

  onFamilyNameInput: function (e) { this.setData({ familyName: e.detail.value }); },
  onNicknameInput: function (e) { this.setData({ nickname: e.detail.value }); },
  onInviteCodeInput: function (e) { this.setData({ inviteCode: e.detail.value }); },
  selectPatient: function () { this.setData({ role: 'patient' }); },
  selectCaregiver: function () { this.setData({ role: 'caregiver' }); },

  onCreateFamily: function () {
    var that = this;
    if (!that.data.familyName || !that.data.nickname) {
      wx.showToast({ title: '请填写完整', icon: 'none' }); return;
    }
    that.setData({ loading: true });
    api.createFamily(that.data.familyName).then(function (res) {
      that._saveAndGo(res);
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    }).finally(function () {
      that.setData({ loading: false });
    });
  },

  onJoinFamily: function () {
    var that = this;
    if (!that.data.inviteCode || !that.data.nickname) {
      wx.showToast({ title: '请填写完整', icon: 'none' }); return;
    }
    that.setData({ loading: true });
    api.joinFamily(that.data.inviteCode, that.data.role).then(function (res) {
      that._saveAndGo(res);
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    }).finally(function () {
      that.setData({ loading: false });
    });
  },

  _saveAndGo: function (familyData) {
    var app = getApp();
    wx.setStorageSync('careline_role', familyData.my_role);
    wx.setStorageSync('careline_family_id', familyData.id);
    wx.setStorageSync('careline_nickname', this.data.nickname);
    app.globalData.role = familyData.my_role;
    app.globalData.familyId = familyData.id;
    app.globalData.nickname = this.data.nickname;
    wx.switchTab({ url: '/pages/home/home' });
  }
});
