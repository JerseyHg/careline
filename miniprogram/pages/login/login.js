// pages/login/login.js
var api = require('../../utils/api');

Page({
  data: {
    phone: '',
    password: '',
    loading: false
  },

  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value });
  },

  onPasswordInput: function (e) {
    this.setData({ password: e.detail.value });
  },

  onLogin: function () {
    var that = this;
    var phone = that.data.phone;
    var password = that.data.password;

    if (!phone || !password) {
      wx.showToast({ title: '请输入手机号和密码', icon: 'none' });
      return;
    }

    that.setData({ loading: true });

    api.loginByPhone(phone, password).then(function (res) {
      wx.setStorageSync('careline_token', res.access_token);
      var app = getApp();
      app.globalData.token = res.access_token;

      // 尝试获取家庭信息
      return api.getMyFamily().then(function (family) {
        wx.setStorageSync('careline_role', family.my_role);
        wx.setStorageSync('careline_family_id', family.id);
        wx.setStorageSync('careline_nickname', (res.user && res.nickname) || '');
        app.globalData.role = family.my_role;
        app.globalData.familyId = family.id;
        app.globalData.nickname = (res.user && res.nickname) || '';
        wx.switchTab({ url: '/pages/home/home' });
      }).catch(function () {
        // 没有家庭，去入驻页
        wx.redirectTo({ url: '/pages/onboard/onboard' });
      });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }).finally(function () {
      that.setData({ loading: false });
    });
  },

  goRegister: function () {
    wx.showToast({ title: '请直接输入手机号登录，首次会自动注册', icon: 'none', duration: 3000 });
  }
});
