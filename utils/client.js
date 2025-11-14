const KEY = 'LCG_CLIENT_UID';
const uid = require('./uid.js');

function getClientUid() {
  try {
    let id = wx.getStorageSync(KEY);
    if (!id) { id = uid('cu'); wx.setStorageSync(KEY, id); }
    return id;
  } catch (e) { return uid('cu'); }
}

module.exports = { getClientUid };

