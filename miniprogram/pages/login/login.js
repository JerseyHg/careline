// pages/login/login.js - 修复版：隐私协议 + 账号登录
var api = require('../../utils/api');

Page({
  data: {
    account: '',
    password: '',
    loading: false,
    privacyChecked: false
  },

  onShow: function () {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  onAccountInput: function (e) {
    this.setData({ account: e.detail.value });
  },

  onPasswordInput: function (e) {
    this.setData({ password: e.detail.value });
  },

  togglePrivacy: function () {
    this.setData({ privacyChecked: !this.data.privacyChecked });
  },

  openPrivacy: function () {
    wx.openPrivacyContract({
      fail: function () {
        wx.showToast({ title: '请在小程序后台配置隐私协议', icon: 'none' });
      }
    });
  },

  onLogin: function () {
    var that = this;
    var account = that.data.account.trim();
    var password = that.data.password;

    if (!account || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }

    if (!that.data.privacyChecked) {
      wx.showToast({ title: '请先同意隐私协议', icon: 'none' });
      return;
    }

    that.setData({ loading: true });

    api.loginByPhone(account, password).then(function (res) {
      wx.setStorageSync('careline_token', res.access_token);
      var app = getApp();
      app.globalData.token = res.access_token;

      return api.getMyFamily().then(function (family) {
        wx.setStorageSync('careline_role', family.my_role);
        wx.setStorageSync('careline_family_id', family.id);
        wx.setStorageSync('careline_nickname', res.nickname || '');
        app.globalData.role = family.my_role;
        app.globalData.familyId = family.id;
        app.globalData.nickname = res.nickname || '';
        wx.switchTab({ url: '/pages/home/home' });
      }).catch(function () {
        wx.redirectTo({ url: '/pages/onboard/onboard' });
      });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }).finally(function () {
      that.setData({ loading: false });
    });
  },

  goRegister: function () {
    wx.showToast({ title: '输入账号和密码直接登录，首次会自动注册', icon: 'none', duration: 3000 });
  }
});
