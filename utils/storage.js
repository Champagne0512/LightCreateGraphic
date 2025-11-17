const KEY = 'LCG_WORK_DRAFTS';

// 通用存取（登录模块也会用到）
function setStorage(key, value) {
  try {
    if (value === null || value === undefined) wx.removeStorageSync(key);
    else wx.setStorageSync(key, value);
  } catch (e) {}
}

function getStorage(key) {
  try { return wx.getStorageSync(key); } catch (e) { return null; }
}

// 草稿存取（兼容原有功能）
function loadDrafts() {
  try {
    return wx.getStorageSync(KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveDraft(work) {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === work.id);
  if (idx >= 0) drafts[idx] = work; else drafts.unshift(work);
  try { wx.setStorageSync(KEY, drafts.slice(0, 50)); } catch (e) {}
}

function getDraftById(id) {
  return loadDrafts().find(d => d.id === id);
}

module.exports = { setStorage, getStorage, loadDrafts, saveDraft, getDraftById };
