const app = getApp();

const QUESTIONS_PER_ERROR = 3;
const RESET_STATE = {
  imagePath: '',
  questions: [],
  cloudFileID: '',
  totalCount: 0,
  improveCount: 0,
  activeTab: 0,
  currentDetail: null
};

Page({
  data: {
    statusBarHeight: getApp().globalData.statusBarHeight || wx.getSystemInfoSync().statusBarHeight,
    pageState: 'idle',
    // Cropping state
    cropBox: { x: 0, y: 0, w: 0, h: 0 },
    imgDisplay: { width: 0, height: 0, top: 0, left: 0 },
    canvasWidth: 0,
    canvasHeight: 0,
    ...RESET_STATE
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ ...RESET_STATE, imagePath: tempFilePath });
        this.initCropping(tempFilePath);
      }
    });
  },

  // ==================== Cropping ====================

  initCropping(filePath) {
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        const sysInfo = wx.getWindowInfo();
        const maxW = sysInfo.windowWidth - 40;
        const maxH = sysInfo.windowHeight - 200;
        const scale = Math.min(maxW / info.width, maxH / info.height, 1);
        const dispW = Math.floor(info.width * scale);
        const dispH = Math.floor(info.height * scale);
        const dispLeft = Math.floor((sysInfo.windowWidth - dispW) / 2);

        this._imgNaturalW = info.width;
        this._imgNaturalH = info.height;
        this._dispScale = scale;

        this.setData({
          pageState: 'cropping',
          imgDisplay: { width: dispW, height: dispH, top: 0, left: dispLeft },
          cropBox: { x: 0, y: 0, w: dispW, h: dispH },
          canvasWidth: dispW,
          canvasHeight: dispH
        });
      },
      fail: () => {
        // Fallback: skip cropping, upload directly
        this.uploadAndRecognize(filePath);
      }
    });
  },

  onCropTouchStart(e) {
    const touch = e.touches[0];
    const box = this.data.cropBox;
    const disp = this.data.imgDisplay;
    const tx = touch.clientX - disp.left;
    const ty = touch.clientY - disp.top - 80; // offset for nav bar

    // Determine which handle (corner or edge) is being dragged
    const margin = 30;
    const isTop = Math.abs(ty - box.y) < margin;
    const isBottom = Math.abs(ty - (box.y + box.h)) < margin;
    const isLeft = Math.abs(tx - box.x) < margin;
    const isRight = Math.abs(tx - (box.x + box.w)) < margin;

    if (isTop && isLeft) this._dragMode = 'tl';
    else if (isTop && isRight) this._dragMode = 'tr';
    else if (isBottom && isLeft) this._dragMode = 'bl';
    else if (isBottom && isRight) this._dragMode = 'br';
    else if (isTop) this._dragMode = 't';
    else if (isBottom) this._dragMode = 'b';
    else if (isLeft) this._dragMode = 'l';
    else if (isRight) this._dragMode = 'r';
    else this._dragMode = 'move';

    this._dragStartX = tx;
    this._dragStartY = ty;
    this._dragStartBox = { ...box };
  },

  onCropTouchMove(e) {
    if (!this._dragMode) return;
    const touch = e.touches[0];
    const disp = this.data.imgDisplay;
    const tx = touch.clientX - disp.left;
    const ty = touch.clientY - disp.top - 80;
    const dx = tx - this._dragStartX;
    const dy = ty - this._dragStartY;
    const sb = this._dragStartBox;
    const minSize = 60;
    let { x, y, w, h } = sb;

    switch (this._dragMode) {
      case 'move':
        x = Math.max(0, Math.min(sb.x + dx, disp.width - w));
        y = Math.max(0, Math.min(sb.y + dy, disp.height - h));
        break;
      case 'tl':
        x = Math.max(0, Math.min(sb.x + dx, sb.x + sb.w - minSize));
        y = Math.max(0, Math.min(sb.y + dy, sb.y + sb.h - minSize));
        w = sb.w - (x - sb.x);
        h = sb.h - (y - sb.y);
        break;
      case 'tr':
        w = Math.max(minSize, Math.min(sb.w + dx, disp.width - sb.x));
        y = Math.max(0, Math.min(sb.y + dy, sb.y + sb.h - minSize));
        h = sb.h - (y - sb.y);
        break;
      case 'bl':
        x = Math.max(0, Math.min(sb.x + dx, sb.x + sb.w - minSize));
        w = sb.w - (x - sb.x);
        h = Math.max(minSize, Math.min(sb.h + dy, disp.height - sb.y));
        break;
      case 'br':
        w = Math.max(minSize, Math.min(sb.w + dx, disp.width - sb.x));
        h = Math.max(minSize, Math.min(sb.h + dy, disp.height - sb.y));
        break;
      case 't':
        y = Math.max(0, Math.min(sb.y + dy, sb.y + sb.h - minSize));
        h = sb.h - (y - sb.y);
        break;
      case 'b':
        h = Math.max(minSize, Math.min(sb.h + dy, disp.height - sb.y));
        break;
      case 'l':
        x = Math.max(0, Math.min(sb.x + dx, sb.x + sb.w - minSize));
        w = sb.w - (x - sb.x);
        break;
      case 'r':
        w = Math.max(minSize, Math.min(sb.w + dx, disp.width - sb.x));
        break;
    }

    this.setData({ cropBox: { x, y, w, h } });
  },

  onCropTouchEnd() {
    this._dragMode = null;
  },

  confirmCrop() {
    const box = this.data.cropBox;
    const scale = 1 / this._dispScale;
    // Map display coords to natural image coords
    const sx = Math.round(box.x * scale);
    const sy = Math.round(box.y * scale);
    const sw = Math.round(box.w * scale);
    const sh = Math.round(box.h * scale);

    // Use offscreen canvas to crop
    const query = this.createSelectorQuery();
    query.select('#cropCanvas').fields({ node: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        this.uploadAndRecognize(this.data.imagePath);
        return;
      }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      canvas.width = sw;
      canvas.height = sh;

      const img = canvas.createImage();
      img.onload = () => {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        wx.canvasToTempFilePath({
          canvas,
          success: (tmpRes) => {
            this.setData({ imagePath: tmpRes.tempFilePath });
            this.uploadAndRecognize(tmpRes.tempFilePath);
          },
          fail: () => {
            this.uploadAndRecognize(this.data.imagePath);
          }
        });
      };
      img.onerror = () => {
        this.uploadAndRecognize(this.data.imagePath);
      };
      img.src = this.data.imagePath;
    });
  },

  // ==================== Upload & Recognize ====================

  async uploadAndRecognize(filePath) {
    this.setData({ pageState: 'uploading', uploadProgress: 0 });

    try {
      const timestamp = Date.now();
      const cloudPath = `ocr/${timestamp}_${Math.random().toString(36).slice(2, 8)}.jpg`;

      const uploadRes = await new Promise((resolve, reject) => {
        const task = wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: resolve,
          fail: reject
        });
        task.onProgressUpdate(res => {
          this.setData({ uploadProgress: res.progress });
        });
      });

      this.setData({ pageState: 'analyzing', cloudFileID: uploadRes.fileID });

      const ocrRes = await wx.cloud.callFunction({
        name: 'ocrRecognize',
        data: { fileID: uploadRes.fileID }
      });

      const result = ocrRes.result;

      if (result.code === 'RATE_LIMITED') {
        wx.showToast({ title: `操作太频繁，请${result.waitTime}秒后再试`, icon: 'none' });
        this.setData({ pageState: 'idle' });
        return;
      }

      if (!result.success || !result.questions || result.questions.length === 0) {
        wx.showToast({
          title: result.error || '未识别到题目，建议拍清晰一些',
          icon: 'none', duration: 3000
        });
        this.setData({ pageState: 'idle' });
        return;
      }

      const allQuestions = result.questions;
      const needImprove = allQuestions.filter(q => q.status !== 'correct');
      this._rotation = result.rotation || 0;

      if (needImprove.length === 0) {
        wx.showToast({ title: '全部正确，无需提高', icon: 'none', duration: 2000 });
        this.setData({ pageState: 'idle' });
        return;
      }

      // Extract per-question images from the original photo
      await this.extractQuestionImages(needImprove);

      this.setData({
        pageState: 'result',
        questions: needImprove,
        totalCount: allQuestions.length,
        improveCount: needImprove.length,
        activeTab: 0,
        currentDetail: needImprove[0]
      });

    } catch (err) {
      console.error('[improve] uploadAndRecognize error:', err);
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
      this.setData({ pageState: 'idle' });
    }
  },

  // ==================== Per-question image extraction ====================

  async extractQuestionImages(questions) {
    const imgPath = this.data.imagePath;
    const rotation = this._rotation || 0;

    try {
      const info = await new Promise((resolve, reject) => {
        wx.getImageInfo({ src: imgPath, success: resolve, fail: reject });
      });

      const query = this.createSelectorQuery();
      const canvasNode = await new Promise((resolve) => {
        query.select('#cropCanvas').fields({ node: true }).exec((res) => {
          resolve(res && res[0] && res[0].node ? res[0].node : null);
        });
      });

      if (!canvasNode) return;
      const ctx = canvasNode.getContext('2d');

      const img = canvasNode.createImage();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgPath;
      });

      const natW = info.width;
      const natH = info.height;

      for (const q of questions) {
        if (!q.position || q.position.top >= q.position.bottom) continue;

        const top = Math.max(0, q.position.top - 0.01);
        const bottom = Math.min(1, q.position.bottom + 0.01);

        let sx, sy, sw, sh, outW, outH;
        if (rotation === 90 || rotation === 270) {
          // For rotated images, position refers to rotated dimensions
          sy = Math.round(top * natW);
          sh = Math.round((bottom - top) * natW);
          sx = 0;
          sw = natH;
          outW = sh;
          outH = sw;
        } else {
          sx = 0;
          sy = Math.round(top * natH);
          sw = natW;
          sh = Math.round((bottom - top) * natH);
          outW = sw;
          outH = sh;
        }

        // Limit canvas size for performance
        const maxDim = 800;
        const scale = Math.min(maxDim / outW, maxDim / outH, 1);
        canvasNode.width = Math.round(outW * scale);
        canvasNode.height = Math.round(outH * scale);
        ctx.clearRect(0, 0, canvasNode.width, canvasNode.height);

        if (rotation !== 0) {
          ctx.save();
          ctx.translate(canvasNode.width / 2, canvasNode.height / 2);
          ctx.rotate(-rotation * Math.PI / 180);
          const rotDraw = rotation === 90 || rotation === 270;
          const dw = rotDraw ? canvasNode.height : canvasNode.width;
          const dh = rotDraw ? canvasNode.width : canvasNode.height;
          ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        } else {
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasNode.width, canvasNode.height);
        }

        try {
          const tmpRes = await new Promise((resolve, reject) => {
            wx.canvasToTempFilePath({
              canvas: canvasNode,
              success: resolve,
              fail: reject
            });
          });
          q.questionImage = tmpRes.tempFilePath;
        } catch (e) {
          console.warn('[improve] extract question image failed:', e);
        }
      }
    } catch (e) {
      console.warn('[improve] extractQuestionImages error:', e);
    }
  },

  // ==================== Result interactions ====================

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab, currentDetail: this.data.questions[tab] });
  },

  startTraining() {
    const { currentDetail, cloudFileID } = this.data;
    if (!currentDetail) return;

    app.globalData.currentQuestions = {
      questions: [],
      knowledge: {
        id: currentDetail.knowledgeId || 'mixed',
        name: currentDetail.knowledgeName || currentDetail.knowledgePoint || '错题练习'
      },
      meta: {
        questionType: 'calculation',
        origin: 'ocr_improve',
        pending: true,
        cloudFileID,
        selectedIndices: [currentDetail.index],
        analyzedQuestions: [currentDetail],
        expectedCount: QUESTIONS_PER_ERROR
      }
    };

    wx.navigateTo({ url: '/pages/practice/practice' });
  },

  retakePhoto() {
    this.setData({ pageState: 'idle', ...RESET_STATE });
    this.chooseImage();
  }
});
