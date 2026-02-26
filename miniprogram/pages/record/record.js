// pages/record/record.js - 优化版：脏标记缓存 + 排便同步
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    isToughDay: false,
    confirmMode: '',
    existingLog: null,

    energy: -1,
    nausea: -1,
    appetite: -1,
    sleep: -1,
    diarrhea: -1,
    fever: false,
    tempC: '',
    stoolCount: 0,
    numbness: false,
    mouthSore: false,
    note: '',

    energyLabels: [],
    nauseaLabels: [],
    appetiteLabels: util.APPETITE_LABELS,
    sleepLabels: [],
    diarrheaLabels: util.DIARRHEA_LABELS,

    saving: false,
    saved: false,
    loading: true
  },

  onLoad: function () {
    var ip = util.isPatient();
    this.setData({
      isPatient: ip,
      energyLabels: ip ? util.ENERGY_LABELS_PATIENT : util.ENERGY_LABELS_CAREGIVER,
      nauseaLabels: ip ? util.NAUSEA_LABELS_PATIENT : util.NAUSEA_LABELS_CAREGIVER,
      sleepLabels: ip ? util.SLEEP_LABELS_PATIENT : util.SLEEP_LABELS_CAREGIVER
    });
  },

  onShow: function () {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });

    var tough = wx.getStorageSync('careline_tough_mode');
    if (tough === '1') {
      wx.removeStorageSync('careline_tough_mode');
      this.setData({ isToughDay: true });
    } else {
      this.setData({ isToughDay: false });
    }

    this.setData({ saved: false, saving: false });

    // 脏标记检查：没有数据变化且已加载过 → 跳过请求，恢复上次状态
    var dirty = wx.getStorageSync('careline_dirty');
    if (!dirty && this._loaded) {
      // 不重置 confirmMode，保持上次的表单状态
      return;
    }
    wx.removeStorageSync('careline_dirty');

    // 有变化或首次加载 → 重置并重新请求
    this.setData({ confirmMode: '' });
    this._loadExisting();
  },

  _loadExisting: function () {
    var that = this;
    that.setData({ loading: true });

    var todayLogPromise = api.getToday().catch(function () { return null; });
    var todayStoolPromise = api.getTodayStool().catch(function () { return null; });

    Promise.all([todayLogPromise, todayStoolPromise]).then(function (results) {
      var log = results[0];
      var stoolSummary = results[1];
      var actualStoolCount = (stoolSummary && stoolSummary.count != null) ? stoolSummary.count : 0;

      if (log) {
        that.setData({ existingLog: log });
        that._prefill(log, actualStoolCount);
        if (!that.data.isPatient) {
          that.setData({ confirmMode: 'has_record' });
        } else {
          that.setData({ confirmMode: 'confirmed' });
        }
      } else {
        that._resetForm();
        that.setData({ stoolCount: actualStoolCount });
        if (!that.data.isPatient) {
          that.setData({ confirmMode: 'no_record' });
        } else {
          that.setData({ confirmMode: 'confirmed' });
        }
      }

      that._loaded = true;
    }).catch(function () {
      that._resetForm();
      that.setData({ confirmMode: 'confirmed' });
      that._loaded = true;
    }).finally(function () {
      that.setData({ loading: false });
    });
  },

  _resetForm: function () {
    this.setData({
      existingLog: null,
      energy: -1, nausea: -1, appetite: -1, sleep: -1, diarrhea: -1,
      fever: false, tempC: '', stoolCount: 0,
      numbness: false, mouthSore: false, note: ''
    });
  },

  _prefill: function (log, actualStoolCount) {
    var d = {};
    if (log.energy != null) d.energy = log.energy;
    if (log.nausea != null) d.nausea = log.nausea;
    if (log.appetite != null) d.appetite = log.appetite;
    if (log.sleep_quality != null) d.sleep = log.sleep_quality;
    if (log.diarrhea != null) d.diarrhea = log.diarrhea;
    if (log.fever) { d.fever = true; d.tempC = log.temp_c ? String(log.temp_c) : ''; }
    d.stoolCount = (log.stool_count != null) ? log.stool_count : actualStoolCount;
    if (log.numbness) d.numbness = true;
    if (log.mouth_sore) d.mouthSore = true;
    if (log.note) d.note = log.note;
    this.setData(d);
  },

  confirmProxy: function () { this.setData({ confirmMode: 'confirmed' }); },
  confirmProxyNoRecord: function () { this.setData({ confirmMode: 'confirmed' }); },
  goBack: function () {
    wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/home/home' }); } });
  },

  setEnergy: function (e) { this.setData({ energy: Number(e.currentTarget.dataset.val) }); },
  setNausea: function (e) { this.setData({ nausea: Number(e.currentTarget.dataset.val) }); },
  setAppetite: function (e) { this.setData({ appetite: Number(e.currentTarget.dataset.val) }); },
  setSleep: function (e) { this.setData({ sleep: Number(e.currentTarget.dataset.val) }); },
  setDiarrhea: function (e) { this.setData({ diarrhea: Number(e.currentTarget.dataset.val) }); },

  toggleFever: function () { this.setData({ fever: !this.data.fever }); },
  toggleNumbness: function () { this.setData({ numbness: !this.data.numbness }); },
  toggleMouthSore: function () { this.setData({ mouthSore: !this.data.mouthSore }); },

  onTempInput: function (e) { this.setData({ tempC: e.detail.value }); },
  onNoteInput: function (e) { this.setData({ note: e.detail.value }); },

  stoolMinus: function () { if (this.data.stoolCount > 0) this.setData({ stoolCount: this.data.stoolCount - 1 }); },
  stoolPlus: function () { this.setData({ stoolCount: this.data.stoolCount + 1 }); },

  onSave: function () {
    var that = this;
    var d = that.data;

    if (d.energy < 0 && d.nausea < 0 && !d.isToughDay) {
      wx.showToast({ title: '至少填一项吧', icon: 'none' });
      return;
    }

    that.setData({ saving: true });
    api.upsertDailyLog(util.toDateStr(), {
      energy: d.energy >= 0 ? d.energy : null,
      nausea: d.nausea >= 0 ? d.nausea : null,
      appetite: d.appetite >= 0 ? d.appetite : null,
      sleep_quality: d.sleep >= 0 ? d.sleep : null,
      diarrhea: d.diarrhea >= 0 ? d.diarrhea : null,
      fever: d.fever,
      temp_c: d.fever && d.tempC ? parseFloat(d.tempC) : null,
      stool_count: d.stoolCount,
      numbness: d.numbness,
      mouth_sore: d.mouthSore,
      is_tough_day: d.isToughDay,
      note: d.note || null
    }).then(function () {
      wx.setStorageSync('careline_dirty', '1');
      that._loaded = false;
      that.setData({ saved: true });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }).finally(function () {
      that.setData({ saving: false });
    });
  },

  goHome: function () {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
