let config = { ENABLE_SUPABASE: false };
try { config = require('../config.js'); } catch (e) { try { config = require('../config.example.js'); } catch (e2) {} }

function enabled() { return !!(config && config.ENABLE_SUPABASE && config.SUPABASE_URL && config.SUPABASE_ANON_KEY); }

function qs(params) {
  if (!params) return '';
  const s = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  return s ? `?${s}` : '';
}

function request({ path, method = 'GET', data = null, params = null }) {
  return new Promise((resolve, reject) => {
    if (!enabled()) return reject(new Error('Supabase disabled'));
    wx.request({
      url: `${config.SUPABASE_URL}/rest/v1/${path}${qs(params)}`,
      method,
      data,
      header: {
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`));
      },
      fail: reject
    });
  });
}

async function listTemplates() {
  return request({ path: 'templates', params: { select: '*' } });
}

async function saveWork(work) {
  // 保存作品；work 中包含 client_uid 用于区分用户（雏形阶段）
  return request({ path: 'works', method: 'POST', data: [work] });
}

async function listWorks(clientUid) {
  return request({ path: 'works', params: { select: '*', client_uid: `eq.${clientUid}`, order: 'update_time.desc' } });
}
// 上传图片到 Supabase Storage（public bucket）
function uploadPreview(filePath, key) {
  return new Promise((resolve, reject) => {
    if (!enabled() || !config.SUPABASE_BUCKET) return reject(new Error('storage disabled'));
    try {
      const fs = wx.getFileSystemManager();
      fs.readFile({ filePath, success: (res) => {
        const isPng = /\.png$/i.test(key);
        wx.request({
          url: `${config.SUPABASE_URL}/storage/v1/object/${config.SUPABASE_BUCKET}/${key}`,
          method: 'POST',
          data: res.data,
          responseType: 'text',
          header: {
            'Content-Type': isPng ? 'image/png' : 'image/jpeg',
            'x-upsert': 'true',
            'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
            'apikey': config.SUPABASE_ANON_KEY
          },
          success: (r) => {
            if (r.statusCode >= 200 && r.statusCode < 300) {
              const publicUrl = `${config.SUPABASE_URL}/storage/v1/object/public/${config.SUPABASE_BUCKET}/${key}`;
              resolve({ publicUrl });
            } else reject(new Error(`HTTP ${r.statusCode}`));
          },
          fail: reject
        });
      }, fail: reject });
    } catch (e) { reject(e); }
  });
}

module.exports = { enabled, listTemplates, saveWork, listWorks, uploadPreview };
