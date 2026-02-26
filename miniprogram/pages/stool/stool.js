// pages/stool/stool.js - 优化版：保存后标脏
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    bristolLabels: util.BRISTOL_LABELS,
    bristol: 4,
    blood: false,
    mucus: false,
    tenesmus: false,
    saving: false,
    todayCount: 0
  },

  onLoad: function () {
    var that = this;
    api.getTodayStool().then(function (res) {
      that.setData({ todayCount: res.count || 0 });
    }).catch(function () {});
  },

  setBristol: function (e) { this.setData({ bristol: Number(e.currentTarget.dataset.val) }); },
  toggleBlood: function () { this.setData({ blood: !this.data.blood }); },
  toggleMucus: function () { this.setData({ mucus: !this.data.mucus }); },
  toggleTenesmus: function () { this.setData({ tenesmus: !this.data.tenesmus }); },

  onSave: function () {
    var that = this;
    that.setData({ saving: true });
    api.recordStool({
      bristol: that.data.bristol,
      blood: that.data.blood,
      mucus: that.data.mucus,
      tenesmus: that.data.tenesmus
    }).then(function () {
      wx.setStorageSync('careline_dirty', '1');
      wx.showToast({ title: '已记录', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/home/home' }); } });
      }, 1000);
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    }).finally(function () {
      that.setData({ saving: false });
    });
  }
});
