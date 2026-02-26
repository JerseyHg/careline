// pages/trend/trend.js - 修复版：折线图 + 疗程对比 + 滚动到顶部
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isPatient: true,
    loading: true,
    calendarDays: [],
    calMonth: '',
    streak: 0,
    trendData: [],
    cycleNo: 0,
    cycleDay: 0,
    metrics: [
      { id: 'nausea', label: '恶心', max: 3, color: '#F59E0B', key: 'nausea' },
      { id: 'energy', label: '体力', max: 4, color: '#6366F1', key: 'energy' },
      { id: 'stool', label: '排便', max: 10, color: '#0EA5E9', key: 'stool_count' },
      { id: 'diarrhea', label: '腹泻', max: 3, color: '#EF4444', key: 'diarrhea' }
    ],
    activeMetric: 'nausea',
    allCycles: [],
    compareNo: 0,
    compareData: [],
    showCompare: false
  },

  onLoad: function () {
    this.setData({ isPatient: util.isPatient() });
  },

  onShow: function () {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    this._loadData();
  },

  _loadData: function () {
    var that = this;
    that.setData({ loading: true });
    if (that.data.isPatient) {
      that._loadCalendar();
    } else {
      that._loadTrend();
    }
  },

  _loadTrend: function () {
    var that = this;
    Promise.all([
      api.getSummary('caregiver'),
      api.listCycles().catch(function () { return []; })
    ]).then(function (results) {
      var res = results[0];
      var cycles = results[1];
      that.setData({
        trendData: res.trends || [],
        cycleNo: res.cycle_no || 0,
        cycleDay: res.cycle_day || 0,
        allCycles: cycles || [],
        loading: false
      });
      setTimeout(function () { that._drawChart(); }, 300);
    }).catch(function () {
      that.setData({ loading: false });
    });
  },

  switchMetric: function (e) {
    this.setData({ activeMetric: e.currentTarget.dataset.id });
    this._drawChart();
  },

  toggleCompare: function () {
    var that = this;
    if (that.data.showCompare) {
      that.setData({ showCompare: false, compareNo: 0, compareData: [] });
      that._drawChart();
      return;
    }
    that.setData({ showCompare: true });
  },

  selectCompareCycle: function (e) {
    var that = this;
    var no = Number(e.currentTarget.dataset.no);
    if (no === that.data.cycleNo) return;
    that.setData({ compareNo: no });
    wx.showLoading({ title: '加载中...' });
    api.getCycleLogs(no).then(function (logs) {
      that.setData({ compareData: logs || [] });
      that._drawChart();
    }).catch(function () {
      that.setData({ compareData: [] });
      that._drawChart();
    }).finally(function () { wx.hideLoading(); });
  },

  _drawChart: function () {
    var that = this;
    var metric = that.data.metrics.find(function (m) { return m.id === that.data.activeMetric; });
    if (!metric) return;
    var data = that.data.trendData;
    if (!data || data.length === 0) return;

    var query = wx.createSelectorQuery();
    query.select('#trendCanvas').fields({ node: true, size: true }).exec(function (res) {
      // Canvas 不可用时静默降级，用户仍可看到下方数据表格
      if (!res || !res[0] || !res[0].node) {
        console.warn('Canvas 2D 不可用，降级为纯表格展示');
        return;
      }

      var canvas = res[0].node;
      var ctx = canvas.getContext('2d');
      var dpr = wx.getWindowInfo().pixelRatio;
      var width = res[0].width;
      var height = res[0].height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      var padL = 36, padR = 16, padT = 20, padB = 32;
      var chartW = width - padL - padR;
      var chartH = height - padT - padB;
      var maxVal = metric.max;

      var points = [];
      data.forEach(function (d) {
        var val = d[metric.key];
        if (val != null && d.cycle_day != null) {
          points.push({ day: d.cycle_day, val: val });
        }
      });
      if (points.length === 0) return;

      var maxDay = Math.max.apply(null, points.map(function (p) { return p.day; }));
      maxDay = Math.max(maxDay, 14);

      var comparePoints = [];
      if (that.data.compareNo > 0 && that.data.compareData.length > 0) {
        that.data.compareData.forEach(function (d) {
          var val = d[metric.key];
          if (val != null && d.cycle_day != null) {
            comparePoints.push({ day: d.cycle_day, val: val });
            if (d.cycle_day > maxDay) maxDay = d.cycle_day;
          }
        });
      }

      function toX(day) { return padL + (day - 1) / (maxDay - 1) * chartW; }
      function toY(val) { return padT + (1 - val / maxVal) * chartH; }

      // Grid
      ctx.strokeStyle = '#F1F5F9'; ctx.lineWidth = 1;
      for (var i = 0; i <= maxVal; i++) {
        var y = toY(i);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(width - padR, y); ctx.stroke();
        ctx.fillStyle = '#94A3B8'; ctx.font = '10px -apple-system'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i), padL - 6, y);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var step = maxDay <= 14 ? 2 : (maxDay <= 21 ? 3 : 5);
      for (var d = 1; d <= maxDay; d += step) {
        ctx.fillStyle = '#94A3B8'; ctx.font = '10px -apple-system';
        ctx.fillText('D' + d, toX(d), padT + chartH + 8);
      }

      // Compare line (dashed)
      if (comparePoints.length > 1) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 2;
        ctx.beginPath();
        comparePoints.sort(function (a, b) { return a.day - b.day; });
        comparePoints.forEach(function (p, i) {
          if (i === 0) ctx.moveTo(toX(p.day), toY(p.val));
          else ctx.lineTo(toX(p.day), toY(p.val));
        });
        ctx.stroke(); ctx.setLineDash([]);
        comparePoints.forEach(function (p) {
          ctx.beginPath(); ctx.arc(toX(p.day), toY(p.val), 3, 0, Math.PI * 2);
          ctx.fillStyle = '#CBD5E1'; ctx.fill();
        });
      }

      // Current line + fill
      points.sort(function (a, b) { return a.day - b.day; });
      ctx.beginPath(); ctx.moveTo(toX(points[0].day), toY(0));
      points.forEach(function (p) { ctx.lineTo(toX(p.day), toY(p.val)); });
      ctx.lineTo(toX(points[points.length - 1].day), toY(0)); ctx.closePath();
      var grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, metric.color + '30'); grad.addColorStop(1, metric.color + '05');
      ctx.fillStyle = grad; ctx.fill();

      ctx.strokeStyle = metric.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach(function (p, idx) {
        if (idx === 0) ctx.moveTo(toX(p.day), toY(p.val));
        else ctx.lineTo(toX(p.day), toY(p.val));
      });
      ctx.stroke();

      points.forEach(function (p) {
        ctx.beginPath(); ctx.arc(toX(p.day), toY(p.val), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = metric.color; ctx.lineWidth = 2.5; ctx.stroke();
      });
    });
  },

  _loadCalendar: function () {
    var that = this;
    api.getCalendar().then(function (res) {
      var year = res.year, month = res.month, daysMap = {};
      (res.days || []).forEach(function (d) { daysMap[new Date(d.date).getDate()] = d; });
      var firstDay = new Date(year, month - 1, 1).getDay();
      var daysInMonth = new Date(year, month, 0).getDate();
      var now = new Date(), todayDate = now.getDate(), todayMonth = now.getMonth() + 1;
      var calendarDays = [];
      for (var i = 0; i < firstDay; i++) calendarDays.push({ empty: true });
      for (var d = 1; d <= daysInMonth; d++) {
        var logDay = daysMap[d];
        calendarDays.push({
          empty: false, day: d,
          isToday: d === todayDate && month === todayMonth,
          emoji: logDay ? util.getStatusEmoji(logDay.energy, logDay.nausea) : '',
          hasLog: !!logDay,
          cycleDay: logDay ? logDay.cycle_day : null
        });
      }
      that.setData({ calendarDays: calendarDays, calMonth: year + '年' + month + '月', streak: res.streak || 0, loading: false });
    }).catch(function () { that.setData({ loading: false }); });
  },

  goSummary: function () { wx.navigateTo({ url: '/pages/summary/summary' }); }
});
