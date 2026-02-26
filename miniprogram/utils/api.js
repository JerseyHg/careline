/**
 * CareLine API Client for 微信小程序
 * 已切换为域名访问
 */

// ─── 环境配置 ───
// 生产环境
var API_BASE = 'https://tbowo.top/careline/api';

// 测试环境（开发调试时切换到这行）
// var API_BASE = 'https://tbowo.top/careline-test/api';

function getToken() {
  return wx.getStorageSync('careline_token') || '';
}

function request(path, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    var token = getToken();
    var header = { 'Content-Type': 'application/json' };
    if (token) header['Authorization'] = 'Bearer ' + token;

    wx.request({
      url: API_BASE + path,
      method: options.method || 'GET',
      data: options.data,
      header: header,
      success: function (res) {
        if (res.statusCode === 401) {
          wx.clearStorageSync();
          wx.reLaunch({ url: '/pages/login/login' });
          reject(new Error('登录已过期'));
          return;
        }
        if (res.statusCode >= 400) {
          var detail = (res.data && res.data.detail) || ('请求失败 (' + res.statusCode + ')');
          reject(new Error(detail));
          return;
        }
        resolve(res.data);
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

module.exports = {
  loginByPhone: function (phone, password) {
    return request('/auth/login', { method: 'POST', data: { phone: phone, password: password } });
  },
  createFamily: function (name) {
      return request('/family/create', { method: 'POST', data: { name: name } });
  },
  joinFamily: function (inviteCode, role) {
      return request('/family/join', { method: 'POST', data: { invite_code: inviteCode, role: role } });
  },
  getMyFamily: function () { return request('/family/me'); },

  // ─── 疗程 ───
  getCurrentCycle: function () { return request('/cycle/current'); },
  createCycle: function (data) { return request('/cycle', { method: 'POST', data: data }); },
  listCycles: function () { return request('/cycle/list'); },

  // ─── 每日记录 ───
  getToday: function () { return request('/daily/today'); },
  upsertDailyLog: function (dateStr, data) { return request('/daily/' + dateStr, { method: 'PUT', data: data }); },
  getCycleLogs: function (cycleNo) { return request('/daily/cycle/' + cycleNo); },

  // ─── 排便 ───
  recordStool: function (data) { return request('/stool', { method: 'POST', data: data }); },
  getTodayStool: function () { return request('/stool/today'); },

  // ─── 摘要 ───
  getSummary: function (mode, cycleNo, days) {
    var url = '/summary?mode=' + mode;
    if (cycleNo) url += '&cycle_no=' + cycleNo;
    if (days) url += '&days=' + days;
    return request(url);
  },
  getCalendar: function () { return request('/summary/calendar'); },

  // ─── 留言 ───
  sendMessage: function (content) { return request('/message', { method: 'POST', data: { content: content } }); },
  getActiveMessages: function () { return request('/message/active'); }
};
