Page({
  data: { img: '', remote: '' },
  onLoad(q) { this.setData({ img: decodeURIComponent(q.img || ''), remote: decodeURIComponent(q.remote || '') }); },
  save() {
    const path = this.data.img;
    if (!path) return;
    const doSave = () => wx.saveImageToPhotosAlbum({
      filePath: path,
      success: () => wx.showToast({ title: '已保存到相册' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
    });
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({ scope: 'scope.writePhotosAlbum', success: doSave, fail: doSave });
        } else doSave();
      }
    });
  },
  onShareAppMessage() {
    return { title: '我用轻创图文做了这张图', path: '/pages/index/index', imageUrl: this.data.img };
  }
});
