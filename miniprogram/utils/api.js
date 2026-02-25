/**
 * CareLine API Client for 微信小程序
 */

// ⚠️ 部署后改为你的域名
var API_BASE = 'http://111.229.254.50:8002';

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
  createFamily: function (name, nickname) {
    return request('/family/create', { method: 'POST', data: { name: name, nickname: nickname } });
  },
  joinFamily: function (inviteCode, role, nickname) {
    return request('/family/join', { method: 'POST', data: { invite_code: inviteCode, role: role, nickname: nickname } });
  },
  getMyFamily: function () { return request('/family/me'); },
  getCurrentCycle: function () { return request('/cycle/current'); },
  createCycle: function (data) { return request('/cycle', { method: 'POST', data: data }); },
  getToday: function () { return request('/daily/today'); },
  upsertDailyLog: function (dateStr, data) { return request('/daily/' + dateStr, { method: 'PUT', data: data }); },
  recordStool: function (data) { return request('/stool', { method: 'POST', data: data }); },
  getTodayStool: function () { return request('/stool/today'); },
  getSummary: function (mode, cycleNo, days) {
    var url = '/summary?mode=' + mode;
    if (cycleNo) url += '&cycle_no=' + cycleNo;
    if (days) url += '&days=' + days;
    return request(url);
  },
  getCalendar: function () { return request('/summary/calendar'); },
  sendMessage: function (content) { return request('/message', { method: 'POST', data: { content: content } }); },
  getActiveMessages: function () { return request('/message/active'); }
};
