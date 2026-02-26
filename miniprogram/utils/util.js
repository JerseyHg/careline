/**
 * 工具函数
 */

function toDateStr(d) {
  var date = d || new Date();
  // 强制转为中国时间 (UTC+8)
  var china = new Date(date.getTime() + (8 * 60 + date.getTimezoneOffset()) * 60000);
  var y = china.getFullYear();
  var m = String(china.getMonth() + 1).padStart(2, '0');
  var day = String(china.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getRole() {
  return wx.getStorageSync('careline_role') || '';
}

function isPatient() {
  return getRole() === 'patient';
}

var ENERGY_LABELS_PATIENT = ['精神不错', '稍微有点累', '需要多休息', '大部分时间想躺着', '今天很疲惫'];
var ENERGY_LABELS_CAREGIVER = ['0 正常', '1 轻度受限', '2 需多休息', '3 多数卧床', '4 完全卧床'];

var NAUSEA_LABELS_PATIENT = ['没有不舒服', '有一点点', '比较明显', '很难受'];
var NAUSEA_LABELS_CAREGIVER = ['0 无', '1 轻度', '2 中度', '3 重度'];

var APPETITE_LABELS = ['完全不想吃', '吃很少', '吃一半', '还行', '挺好', '很好'];

var SLEEP_LABELS_PATIENT = ['睡得不好', '一般般', '还可以', '睡得很好'];
var SLEEP_LABELS_CAREGIVER = ['0 差', '1 一般', '2 较好', '3 好'];

var DIARRHEA_LABELS = ['无', '轻度', '中度', '重度'];

var BRISTOL_LABELS = ['硬块', '腊肠硬', '腊肠裂', '软条✓', '软团', '糊状', '水样'];

function getStatusEmoji(energy, nausea) {
  if (energy == null && nausea == null) return '📝';
  var e = energy != null ? energy : 0;
  var n = nausea != null ? nausea : 0;
  if (e >= 3 || n >= 3) return '😔';
  if (e >= 2 || n >= 2) return '😐';
  if (e <= 1 && n <= 1) return '😊';
  return '💪';
}

module.exports = {
  toDateStr: toDateStr,
  getRole: getRole,
  isPatient: isPatient,
  getStatusEmoji: getStatusEmoji,
  ENERGY_LABELS_PATIENT: ENERGY_LABELS_PATIENT,
  ENERGY_LABELS_CAREGIVER: ENERGY_LABELS_CAREGIVER,
  NAUSEA_LABELS_PATIENT: NAUSEA_LABELS_PATIENT,
  NAUSEA_LABELS_CAREGIVER: NAUSEA_LABELS_CAREGIVER,
  APPETITE_LABELS: APPETITE_LABELS,
  SLEEP_LABELS_PATIENT: SLEEP_LABELS_PATIENT,
  SLEEP_LABELS_CAREGIVER: SLEEP_LABELS_CAREGIVER,
  DIARRHEA_LABELS: DIARRHEA_LABELS,
  BRISTOL_LABELS: BRISTOL_LABELS
};
