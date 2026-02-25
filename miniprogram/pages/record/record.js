// pages/record/record.js
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    isToughDay: false,
    confirmMode: '',  // '' | 'has_record' | 'no_record' | 'confirmed'
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

  onLoad: function (options) {
    var ip = util.isPatient();
    this.setData({
      isPatient: ip,
      isToughDay: options && options.tough === '1',
      energyLabels: ip ? util.ENERGY_LABELS_PATIENT : util.ENERGY_LABELS_CAREGIVER,
      nauseaLabels: ip ? util.NAUSEA_LABELS_PATIENT : util.NAUSEA_LABELS_CAREGIVER,
      sleepLabels: ip ? util.SLEEP_LABELS_PATIENT : util.SLEEP_LABELS_CAREGIVER
    });
    this._loadExisting();
  },

  _loadExisting: function () {
    var that = this;
    api.getToday().then(function (log) {
      if (log) {
        that.setData({ existingLog: log });
        that._prefill(log);
        if (!that.data.isPatient) {
          that.setData({ confirmMode: 'has_record' });
        } else {
          that.setData({ confirmMode: 'confirmed' });
        }
      } else {
        if (!that.data.isPatient) {
          that.setData({ confirmMode: 'no_record' });
        } else {
          that.setData({ confirmMode: 'confirmed' });
        }
      }
    }).catch(function () {
      that.setData({ confirmMode: 'confirmed' });
    }).finally(function () {
      that.setData({ loading: false });
    });
  },

  _prefill: function (log) {
    var d = {};
    if (log.energy != null) d.energy = log.energy;
    if (log.nausea != null) d.nausea = log.nausea;
    if (log.appetite != null) d.appetite = log.appetite;
    if (log.sleep_quality != null) d.sleep = log.sleep_quality;
    if (log.diarrhea != null) d.diarrhea = log.diarrhea;
    if (log.fever) { d.fever = true; d.tempC = log.temp_c ? String(log.temp_c) : ''; }
    if (log.stool_count != null) d.stoolCount = log.stool_count;
    if (log.numbness) d.numbness = true;
    if (log.mouth_sore) d.mouthSore = true;
    if (log.note) d.note = log.note;
    this.setData(d);
  },

  // 确认流程
  confirmProxy: function () { this.setData({ confirmMode: 'confirmed' }); },
  confirmProxyNoRecord: function () { this.setData({ confirmMode: 'confirmed' }); },
  goBack: function () {
    wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/home/home' }); } });
  },

  // 表单事件
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
