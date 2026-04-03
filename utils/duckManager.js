const STORAGE_KEY = 'duckData';

const DEFAULT_DATA = {
  normalDucks: 0,
  goldenDucks: 0,
  consecutivePerfect: 0
};

function getDuckData() {
  const data = wx.getStorageSync(STORAGE_KEY);
  if (!data) {
    wx.setStorageSync(STORAGE_KEY, DEFAULT_DATA);
    return { ...DEFAULT_DATA };
  }
  return data;
}

function saveDuckData(data) {
  wx.setStorageSync(STORAGE_KEY, data);
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.duckData = data;
  }
}

/**
 * 答对：孵化一只普通鸭
 * @returns {{ type: 'normal_hatch', normalDucks: number, goldenDucks: number }}
 */
function onCorrectAnswer() {
  const data = getDuckData();
  data.normalDucks += 1;
  saveDuckData(data);
  return { type: 'normal_hatch', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks };
}

/**
 * 答错：死亡一只鸭子（优先普通，没有普通扣金鸭，都没有则不扣）
 * @returns {{ type: 'normal_death' | 'golden_death' | 'none', normalDucks: number, goldenDucks: number }}
 */
function onWrongAnswer() {
  const data = getDuckData();
  if (data.normalDucks > 0) {
    data.normalDucks -= 1;
    saveDuckData(data);
    return { type: 'normal_death', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks };
  } else if (data.goldenDucks > 0) {
    data.goldenDucks -= 1;
    saveDuckData(data);
    return { type: 'golden_death', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks };
  }
  return { type: 'none', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks };
}

/**
 * 练习结束时调用：判断连胜并可能生成金色鸭子
 * @param {boolean} allCorrect - 本次练习是否全对
 * @returns {{ goldenDuckEarned: boolean, consecutivePerfect: number }}
 */
function onSessionEnd(allCorrect) {
  const data = getDuckData();
  if (allCorrect) {
    data.consecutivePerfect += 1;
    if (data.consecutivePerfect >= 5) {
      data.goldenDucks += 1;
      data.consecutivePerfect = 0;
      saveDuckData(data);
      return { goldenDuckEarned: true, consecutivePerfect: 0 };
    }
    saveDuckData(data);
    return { goldenDuckEarned: false, consecutivePerfect: data.consecutivePerfect };
  }
  data.consecutivePerfect = 0;
  saveDuckData(data);
  return { goldenDuckEarned: false, consecutivePerfect: 0 };
}

module.exports = {
  getDuckData,
  saveDuckData,
  onCorrectAnswer,
  onWrongAnswer,
  onSessionEnd,
  DEFAULT_DATA
};
