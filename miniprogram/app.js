// app.js
App({
  globalData: {
    token: '',
    role: '',
    familyId: 0,
    nickname: '',
    cycle: null
  },

  onLaunch: function () {
    var token = wx.getStorageSync('careline_token');
    var role = wx.getStorageSync('careline_role');
    var familyId = wx.getStorageSync('careline_family_id');
    var nickname = wx.getStorageSync('careline_nickname');

    if (token && role && familyId) {
      this.globalData.token = token;
      this.globalData.role = role;
      this.globalData.familyId = familyId;
      this.globalData.nickname = nickname || '';
    }
  },

  checkLogin: function () {
    return !!(this.globalData.token && this.globalData.role && this.globalData.familyId);
  },

  logout: function () {
    this.globalData.token = '';
    this.globalData.role = '';
    this.globalData.familyId = 0;
    this.globalData.nickname = '';
    wx.clearStorageSync();
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
