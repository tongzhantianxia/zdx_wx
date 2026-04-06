// utils/canvasHelper.js

/**
 * Initialize a Canvas 2D context with DPR scaling.
 * @param {Component} component - the wx Component instance
 * @param {string} canvasId - CSS selector id (without #)
 * @param {number} logicalWidth - desired logical width in px
 * @param {number} logicalHeight - desired logical height in px
 * @param {function} callback - (ctx, canvas, width, height) => void
 */
function initCanvas(component, canvasId, logicalWidth, logicalHeight, callback, _retries) {
  if ((_retries || 0) > 10) return;
  const query = component.createSelectorQuery();
  query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) {
      setTimeout(() => initCanvas(component, canvasId, logicalWidth, logicalHeight, callback, (_retries || 0) + 1), 50);
      return;
    }
    const canvas = res[0].node;
    const ctx = canvas.getContext('2d');
    const dpr = wx.getWindowInfo().pixelRatio || 2;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    callback(ctx, canvas, logicalWidth, logicalHeight);
  });
}

/**
 * Get container width minus horizontal padding (20px each side).
 */
function getContainerWidth() {
  const sysInfo = wx.getWindowInfo();
  return sysInfo.windowWidth - 40;
}

// Chart color palette shared by bar/line/pie
const CHART_COLORS = ['#5B9BD5', '#ED7D31', '#70AD47', '#FFC000', '#4472C4', '#A5A5A5', '#264478', '#9B59B6'];

/**
 * Calculate nice Y-axis scale: returns { max, step, tickCount }.
 * @param {number} dataMax - the maximum data value
 */
function calcYAxisScale(dataMax) {
  if (dataMax <= 0) return { max: 10, step: 2, tickCount: 5 };
  const raw = dataMax * 1.2;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  let niceStep;
  if (residual <= 1.5) niceStep = magnitude * 0.2;
  else if (residual <= 3) niceStep = magnitude * 0.5;
  else if (residual <= 7) niceStep = magnitude;
  else niceStep = magnitude * 2;
  // Ensure step is at least 1 for integer data
  if (niceStep < 1) niceStep = 1;
  const niceMax = Math.ceil(raw / niceStep) * niceStep;
  const tickCount = Math.round(niceMax / niceStep);
  return { max: niceMax, step: niceStep, tickCount };
}

module.exports = {
  initCanvas,
  getContainerWidth,
  CHART_COLORS,
  calcYAxisScale
};
