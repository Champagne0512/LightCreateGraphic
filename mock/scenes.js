module.exports = {
  list: [
    {
      id: 'social',
      name: '社交分享',
      icon: 'share',
      children: [
        { id: 'moments', name: '朋友圈 1080x1920' },
        { id: 'xiaohongshu', name: '小红书 1080x1080' },
        { id: 'douyin', name: '抖音封面 1080x1920' }
      ]
    },
    {
      id: 'business',
      name: '商业运营',
      icon: 'shop',
      children: [
        { id: 'ecomm_main', name: '电商主图 800x800' },
        { id: 'poster', name: '促销海报 1242x2208' }
      ]
    },
    {
      id: 'work',
      name: '学习工作',
      icon: 'work',
      children: [
        { id: 'slide_cover', name: '课件封面 1920x1080' },
        { id: 'note_card', name: '学习卡片 1080x1350' }
      ]
    }
  ]
};

