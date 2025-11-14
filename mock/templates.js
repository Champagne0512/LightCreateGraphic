module.exports = {
  list: [
    {
      id: 'tpl_social_01',
      scene: 'xiaohongshu',
      name: '清新分享卡片',
      coverColor: '#EAF5FF',
      templateData: {
        size: { w: 1080, h: 1080 },
        backgroundColor: '#EAF5FF',
        elements: [
          { id: 't1', type: 'text', text: '今日好物分享', color: '#111', fontSize: 72, x: 540, y: 160, align: 'center' },
          { id: 'r1', type: 'rect', color: '#07c160', width: 720, height: 4, x: 540, y: 230 }
        ]
      }
    },
    {
      id: 'tpl_ecomm_01',
      scene: 'ecomm_main',
      name: '电商主图简约',
      coverColor: '#FFF3E0',
      templateData: {
        size: { w: 800, h: 800 },
        backgroundColor: '#FFF3E0',
        elements: [
          { id: 't2', type: 'text', text: '本周特惠', color: '#E65100', fontSize: 96, x: 400, y: 200, align: 'center' },
          { id: 't3', type: 'text', text: '限时9.9起', color: '#111', fontSize: 64, x: 400, y: 320, align: 'center' }
        ]
      }
    },
    {
      id: 'tpl_blank_square',
      scene: 'any',
      name: '空白 1:1 画布',
      coverColor: '#ffffff',
      templateData: {
        size: { w: 1080, h: 1080 },
        backgroundColor: '#ffffff',
        elements: []
      }
    }
  ]
};

