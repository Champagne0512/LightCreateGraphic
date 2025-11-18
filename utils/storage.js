const KEY = 'LCG_WORK_DRAFTS'; // 最新草稿列表（用于列表展示/快速打开）
const META_KEY = 'LCG_DRAFT_META'; // 含版本等元数据，按 id 组织

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

function _loadMeta() {
  try { return wx.getStorageSync(META_KEY) || {}; } catch (e) { return {}; }
}

function _saveMeta(meta) {
  try { wx.setStorageSync(META_KEY, meta); } catch (e) {}
}

function _now() { return new Date().toISOString(); }

// 新增/保存草稿（带版本）
function saveDraft(work, options = {}) {
  if (!work || !work.id) return;
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === work.id);
  const latest = JSON.parse(JSON.stringify(work));
  if (idx >= 0) drafts[idx] = latest; else drafts.unshift(latest);
  try { wx.setStorageSync(KEY, drafts.slice(0, 200)); } catch (e) {}

  // 版本控制
  const meta = _loadMeta();
  const m = meta[work.id] || { id: work.id, name: work.name || work.id, versions: [], deleted: false };
  const versions = m.versions || [];
  const maxVersions = options.maxVersions || 20;
  const nextNo = (versions.length ? versions[0].no + 1 : 1);
  const versionItem = {
    no: nextNo,
    ts: _now(),
    note: options.note || '',
    size: work.size,
    snapshot: latest // 存储完整工作数据（本地）
  };
  versions.unshift(versionItem);
  m.versions = versions.slice(0, maxVersions);
  m.updated_at = versionItem.ts;
  meta[work.id] = m;
  _saveMeta(meta);
}

function getDraftById(id) {
  return loadDrafts().find(d => d.id === id);
}

function deleteDraft(id) {
  const drafts = loadDrafts().filter(d => d.id !== id);
  try { wx.setStorageSync(KEY, drafts); } catch (e) {}
  const meta = _loadMeta();
  if (meta[id]) { meta[id].deleted = true; _saveMeta(meta); }
}

function listDraftVersions(id) {
  const meta = _loadMeta();
  const m = meta[id];
  if (!m || !Array.isArray(m.versions)) return [];
  // 返回精简元数据，避免一次性返回snapshot
  return m.versions.map(v => ({ no: v.no, ts: v.ts, note: v.note, size: v.size }));
}

function getDraftVersion(id, no) {
  const meta = _loadMeta();
  const m = meta[id];
  if (!m) return null;
  const v = (m.versions || []).find(x => x.no === no);
  return v ? v.snapshot : null;
}

function restoreDraftVersion(id, no) {
  const snap = getDraftVersion(id, no);
  if (!snap) return null;
  // 作为新版本保存（带备注）
  saveDraft(snap, { note: `restore from v${no}` });
  return snap;
}

module.exports = { 
  setStorage, getStorage,
  loadDrafts, saveDraft, getDraftById,
  deleteDraft, listDraftVersions, getDraftVersion, restoreDraftVersion
};
