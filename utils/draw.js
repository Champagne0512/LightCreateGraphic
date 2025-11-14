function drawWorkToCanvas(ctx, work, options = {}) {
  const { size, backgroundColor, elements } = work;
  ctx.save();
  if (!options.transparentBackground) {
    ctx.setFillStyle(backgroundColor || '#ffffff');
    ctx.fillRect(0, 0, size.w, size.h);
  }
  (elements || []).forEach(el => {
    ctx.save();
    const x = el.x || 0;
    const y = el.y || 0;
    const rotation = (el.rotate || 0) * Math.PI / 180;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    if (el.type === 'text') {
      ctx.setTextAlign(el.align || 'left');
      ctx.setFillStyle(el.color || '#111');
      ctx.setFontSize(el.fontSize || 36);
      const tx = el.align === 'center' ? 0 : (el.align === 'right' ? 0 : 0);
      ctx.fillText(el.text || '', tx, 0);
    } else if (el.type === 'rect') {
      ctx.setFillStyle(el.color || '#333');
      const w = el.width || 100;
      const h = el.height || 50;
      ctx.fillRect(-(w/2), -(h/2), w, h);
    } else if (el.type === 'image' && el.src) {
      const w = el.width || el._w || 200;
      const h = el.height || el._h || 200;
      try {
        ctx.drawImage(el.src, -(w/2), -(h/2), w, h);
      } catch (e) {}
    }
    ctx.restore();
  });
  // 水印（可选）
  if (options.watermarkText) {
    ctx.save();
    ctx.setGlobalAlpha(0.35);
    ctx.setFillStyle('#111');
    ctx.setFontSize(Math.max(24, Math.floor(size.w * 0.03)));
    ctx.setTextAlign('right');
    const pad = Math.floor(size.w * 0.02);
    ctx.fillText(options.watermarkText, size.w - pad, size.h - pad);
    ctx.restore();
  }
  ctx.restore();
}

module.exports = { drawWorkToCanvas };
