const app = getApp();

const QUESTIONS_PER_ERROR = 3;
const RESET_STATE = {
  imagePath: '',
  questions: [],
  cloudFileID: '',
  totalCount: 0,
  improveCount: 0,
  activeTab: 0,
  currentDetail: null,
  generating: false
};

Page({
  data: {
    statusBarHeight: getApp().globalData.statusBarHeight || wx.getSystemInfoSync().statusBarHeight,
    pageState: 'idle',
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

  // ==================== Cropping (before OCR) ====================

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
        this.uploadAndRecognize(filePath);
      }
    });
  },

  onCropTouchStart(e) {
    const touch = e.touches[0];
    const box = this.data.cropBox;
    const disp = this.data.imgDisplay;
    const tx = touch.clientX - disp.left;
    const ty = touch.clientY - disp.top - 80;

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
        w = sb.w - (x - sb.x); h = sb.h - (y - sb.y);
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
        h = sb.h - (y - sb.y); break;
      case 'b':
        h = Math.max(minSize, Math.min(sb.h + dy, disp.height - sb.y)); break;
      case 'l':
        x = Math.max(0, Math.min(sb.x + dx, sb.x + sb.w - minSize));
        w = sb.w - (x - sb.x); break;
      case 'r':
        w = Math.max(minSize, Math.min(sb.w + dx, disp.width - sb.x)); break;
    }

    this.setData({ cropBox: { x, y, w, h } });
  },

  onCropTouchEnd() {
    this._dragMode = null;
  },

  confirmCrop() {
    const box = this.data.cropBox;
    const disp = this.data.imgDisplay;
    const isFullImage = box.x === 0 && box.y === 0 && box.w === disp.width && box.h === disp.height;

    if (isFullImage) {
      // No crop needed, upload original
      this.uploadAndRecognize(this.data.imagePath);
      return;
    }

    // Crop the selected region via canvas
    const scale = 1 / this._dispScale;
    const sx = Math.round(box.x * scale);
    const sy = Math.round(box.y * scale);
    const sw = Math.round(box.w * scale);
    const sh = Math.round(box.h * scale);

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
        const task = wx.cloud.uploadFile({ cloudPath, filePath, success: resolve, fail: reject });
        task.onProgressUpdate(res => { this.setData({ uploadProgress: res.progress }); });
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
        wx.showToast({ title: result.error || '未识别到题目，建议拍清晰一些', icon: 'none', duration: 3000 });
        this.setData({ pageState: 'idle' });
        return;
      }

      const rotation = result.rotation || 0;
      if (rotation !== 0) {
        wx.showModal({
          title: '照片方向不对',
          content: '请将照片旋转到正确方向后重新拍照',
          showCancel: false,
          confirmText: '重新拍照',
          success: () => {
            this.setData({ pageState: 'idle' });
            this.chooseImage();
          }
        });
        return;
      }

      const allQuestions = result.questions;
      const needImprove = allQuestions.filter(q => q.status !== 'correct');

      if (needImprove.length === 0) {
        wx.showToast({ title: '全部正确，无需提高', icon: 'none', duration: 2000 });
        this.setData({ pageState: 'idle' });
        return;
      }

      // Renumber: 错题1, 错题2, ...
      needImprove.forEach((q, i) => { q.errorIndex = i + 1; });

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

  // ==================== Result interactions ====================

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab, currentDetail: this.data.questions[tab] });
  },

  async startTraining() {
    const { currentDetail, generating } = this.data;
    if (!currentDetail || generating) return;

    this.setData({ generating: true });

    try {
      const gradeLabel = currentDetail.grade || '五年级';
      const res = await wx.cloud.callFunction({
        name: 'generateQuestions',
        data: {
          knowledgeId: currentDetail.knowledgeId || '',
          knowledgeName: currentDetail.knowledgeName || currentDetail.knowledgePoint || '数学题',
          grade: gradeLabel,
          count: QUESTIONS_PER_ERROR,
          difficulty: 'hard',
          questionType: 'calculation',
          existingQuestions: [],
          prefetchHint: (currentDetail.content || '').slice(0, 80)
        }
      });

      const result = res.result;
      if (!result.success || !result.questions || result.questions.length === 0) {
        throw new Error(result.error || '生成失败');
      }

      app.globalData.currentQuestions = {
        questions: result.questions,
        knowledge: {
          id: currentDetail.knowledgeId || 'mixed',
          name: currentDetail.knowledgeName || currentDetail.knowledgePoint || '错题练习'
        },
        meta: result.meta
      };

      wx.navigateTo({ url: '/pages/practice/practice' });

    } catch (err) {
      console.error('[improve] startTraining error:', err);
      wx.showToast({ title: err.message || '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  },

  retakePhoto() {
    this.setData({ pageState: 'idle', ...RESET_STATE });
    this.chooseImage();
  }
});
