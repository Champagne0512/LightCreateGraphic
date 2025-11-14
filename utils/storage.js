const KEY = 'LCG_WORK_DRAFTS';

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

module.exports = { loadDrafts, saveDraft, getDraftById };
