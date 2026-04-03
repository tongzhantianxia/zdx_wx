const STORAGE_KEY = 'duckData';

const MERGE_RULES = {
  normalToGolden: 12,
  goldenToSwan: 10
};

const DEFAULT_DATA = {
  normalDucks: 0,
  goldenDucks: 0,
  swans: 0,
  consecutivePerfect: 0
};

function getDuckData() {
  const data = wx.getStorageSync(STORAGE_KEY);
  if (!data) {
    wx.setStorageSync(STORAGE_KEY, DEFAULT_DATA);
    return { ...DEFAULT_DATA };
  }
  if (data.swans === undefined) data.swans = 0;
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
 * 答错：死亡一只鸭子（优先普通→金鸭→天鹅，都没有则不扣）
 */
function onWrongAnswer() {
  const data = getDuckData();
  if (data.normalDucks > 0) {
    data.normalDucks -= 1;
    saveDuckData(data);
    return { type: 'normal_death', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
  } else if (data.goldenDucks > 0) {
    data.goldenDucks -= 1;
    saveDuckData(data);
    return { type: 'golden_death', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
  } else if (data.swans > 0) {
    data.swans -= 1;
    saveDuckData(data);
    return { type: 'swan_death', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
  }
  return { type: 'none', normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
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

/**
 * 合成金色鸭子：12只普通鸭 → 1只金色鸭
 * @returns {{ success: boolean, normalDucks: number, goldenDucks: number, swans: number }}
 */
function mergeToGolden() {
  const data = getDuckData();
  if (data.normalDucks < MERGE_RULES.normalToGolden) {
    return { success: false, normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
  }
  data.normalDucks -= MERGE_RULES.normalToGolden;
  data.goldenDucks += 1;
  saveDuckData(data);
  return { success: true, normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
}

/**
 * 合成白天鹅：10只金色鸭 → 1只白天鹅
 * @returns {{ success: boolean, normalDucks: number, goldenDucks: number, swans: number }}
 */
function mergeToSwan() {
  const data = getDuckData();
  if (data.goldenDucks < MERGE_RULES.goldenToSwan) {
    return { success: false, normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
  }
  data.goldenDucks -= MERGE_RULES.goldenToSwan;
  data.swans += 1;
  saveDuckData(data);
  return { success: true, normalDucks: data.normalDucks, goldenDucks: data.goldenDucks, swans: data.swans };
}

module.exports = {
  getDuckData,
  saveDuckData,
  onCorrectAnswer,
  onWrongAnswer,
  onSessionEnd,
  mergeToGolden,
  mergeToSwan,
  MERGE_RULES,
  DEFAULT_DATA
};
