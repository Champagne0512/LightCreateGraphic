App({
  globalData: {
    scenes: [],
    templates: [],
    currentWork: null,
    clientUid: ''
  },
  onLaunch() {
    try {
      const { getClientUid } = require('./utils/client.js');
      this.globalData.clientUid = getClientUid();
      const scenes = require('./mock/scenes.js');
      const templates = require('./mock/templates.js');
      this.globalData.scenes = scenes.list || [];
      this.globalData.templates = templates.list || [];
    } catch (e) {
      console.error('Mock 数据加载失败', e);
    }

    // 尝试从 Supabase 拉取模板（存在且已启用时）
    try {
      const supa = require('./services/supa.js');
      if (supa.enabled()) {
        supa.listTemplates().then(list => {
          if (Array.isArray(list) && list.length) this.globalData.templates = list.map(t => ({
            id: t.template_id || t.id,
            scene: t.scene_type || t.scene,
            name: t.template_name || t.name,
            coverColor: (t.cover_color || '#ffffff'),
            templateData: t.template_data || t.templateData
          }));
        }).catch(() => {});
      }
    } catch (e) {}
  }
});
