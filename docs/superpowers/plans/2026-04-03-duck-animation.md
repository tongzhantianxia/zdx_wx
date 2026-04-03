# 鸭子动画系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为答题流程新增像素风鸭子动画激励系统——答对孵化鸭子、答错鸭子死亡、连续5次练习全对孵化金色鸭子、"我的"页展示像素鸭子农场。

**Architecture:** 纯前端实现，数据存 `wx.getStorageSync`。新增 `utils/duckManager.js` 管理数据，新增 `components/duck-animation/` 全屏动画组件和 `components/duck-farm/` 农场展示组件。现有文件只做最小追加（追加方法调用、追加 WXML 组件引用、追加 JSON 组件注册），不修改任何现有逻辑。

**Tech Stack:** 微信小程序原生（WXML + WXSS + JS），纯 CSS keyframes 动画，CSS Grid 像素绘制

**Spec:** `docs/superpowers/specs/2026-04-03-duck-animation-design.md`

**约束：**
1. **只新增代码，不改动现有代码逻辑。**
2. **每个 Task 开始前必须重新读取目标文件的最新版本。** 有其他 agent 在同时修改代码，不能依赖之前读取的文件快照。所有追加操作必须基于当前磁盘上的最新内容定位插入点。

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `utils/duckManager.js` | 新建 | 鸭子数据 CRUD：初始化、读取、孵化、死亡、连胜判定 |
| `components/duck-animation/duck-animation.js` | 新建 | 全屏动画组件逻辑 |
| `components/duck-animation/duck-animation.wxml` | 新建 | 全屏动画组件模板 |
| `components/duck-animation/duck-animation.wxss` | 新建 | 所有动画 keyframes 和像素鸭样式 |
| `components/duck-animation/duck-animation.json` | 新建 | 组件配置 |
| `components/duck-farm/duck-farm.js` | 新建 | 农场组件逻辑 |
| `components/duck-farm/duck-farm.wxml` | 新建 | 农场组件模板 |
| `components/duck-farm/duck-farm.wxss` | 新建 | 农场样式 |
| `components/duck-farm/duck-farm.json` | 新建 | 组件配置 |
| `app.js` | 追加 | `onLaunch` 中追加 `duckData` 初始化，`globalData` 追加 `duckData` 字段 |
| `pages/practice/practice.js` | 追加 | 追加鸭子相关方法（不改现有方法），在 `onLoad` 末尾追加 `sessionDuckDelta` 初始化 |
| `pages/practice/practice.wxml` | 追加 | 文件末尾追加 `<duck-animation>` 组件 |
| `pages/practice/practice.json` | 追加 | `usingComponents` 中追加组件注册 |
| `pages/practice/practice.wxss` | 不动 | 无需改动 |
| `pages/result/result.wxml` | 追加 | 追加鸭子摘要区域、连胜进度、金鸭动画组件 |
| `pages/result/result.js` | 追加 | 追加读取 duckData 和金鸭动画触发逻辑 |
| `pages/result/result.wxss` | 追加 | 追加新增元素的样式 |
| `pages/result/result.json` | 追加 | `usingComponents` 中追加组件注册 |
| `pages/mine/mine.wxml` | 追加 | 追加 `<duck-farm>` 组件 |
| `pages/mine/mine.js` | 追加 | 追加读取 duckData 逻辑 |
| `pages/mine/mine.wxss` | 不动 | 农场样式在组件内 |
| `pages/mine/mine.json` | 追加 | `usingComponents` 中追加组件注册 |

---

### Task 1: duckManager 工具模块

**Files:**
- Create: `utils/duckManager.js`

- [ ] **Step 1: 创建 `utils/duckManager.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add utils/duckManager.js
git commit -m "feat: add duckManager utility for duck data CRUD"
```

---

### Task 2: duck-animation 全屏动画组件

**Files:**
- Create: `components/duck-animation/duck-animation.json`
- Create: `components/duck-animation/duck-animation.js`
- Create: `components/duck-animation/duck-animation.wxml`
- Create: `components/duck-animation/duck-animation.wxss`

- [ ] **Step 1: 创建 `components/duck-animation/duck-animation.json`**

```json
{
  "component": true
}
```

- [ ] **Step 2: 创建 `components/duck-animation/duck-animation.js`**

组件接受外部调用 `play(type)` 方法，播放完毕触发 `done` 事件。

`type` 值：`normal_hatch` | `normal_death` | `golden_hatch` | `golden_death`

```javascript
Component({
  data: {
    visible: false,
    animationType: '',
    showText: false,
    phase: ''
  },

  methods: {
    play(type) {
      this.setData({
        visible: true,
        animationType: type,
        showText: false,
        phase: 'start'
      });

      const durations = {
        normal_hatch: 1000,
        normal_death: 1000,
        golden_hatch: 2700,
        golden_death: 1900
      };

      if (type === 'golden_hatch') {
        setTimeout(() => {
          this.setData({ showText: true });
        }, 2200);
      }

      const duration = durations[type] || 1000;
      setTimeout(() => {
        this.setData({ visible: false, animationType: '', showText: false, phase: '' });
        this.triggerEvent('done', { type });
      }, duration);
    }
  }
});
```

- [ ] **Step 3: 创建 `components/duck-animation/duck-animation.wxml`**

全屏浮层，根据 `animationType` 显示不同动画内容。像素鸭用多个小 `view` 组成 CSS Grid。

```xml
<view class="duck-anim-overlay {{animationType}}" wx:if="{{visible}}" catchtouchmove="return">

  <!-- 普通孵化 -->
  <view class="anim-container" wx:if="{{animationType === 'normal_hatch'}}">
    <view class="egg-wrap normal-egg-anim">
      <view class="pixel-egg"></view>
    </view>
    <view class="duck-appear normal-duck-appear">
      <view class="pixel-duck normal"></view>
    </view>
  </view>

  <!-- 普通死亡 -->
  <view class="anim-container" wx:if="{{animationType === 'normal_death'}}">
    <view class="duck-shatter normal-shatter">
      <view class="pixel-duck normal shattering"></view>
      <view class="pixel-fragment frag-1"></view>
      <view class="pixel-fragment frag-2"></view>
      <view class="pixel-fragment frag-3"></view>
      <view class="pixel-fragment frag-4"></view>
      <view class="pixel-fragment frag-5"></view>
      <view class="pixel-fragment frag-6"></view>
      <view class="pixel-fragment frag-7"></view>
      <view class="pixel-fragment frag-8"></view>
    </view>
  </view>

  <!-- 金色孵化 -->
  <view class="anim-container" wx:if="{{animationType === 'golden_hatch'}}">
    <view class="spotlight"></view>
    <view class="golden-egg-drop">
      <view class="pixel-egg golden"></view>
      <view class="sparkle sp-1">✦</view>
      <view class="sparkle sp-2">✦</view>
      <view class="sparkle sp-3">✦</view>
    </view>
    <view class="duck-appear golden-duck-appear">
      <view class="pixel-duck golden"></view>
      <view class="pixel-crown"></view>
    </view>
    <view class="golden-particles">
      <view class="g-particle" wx:for="{{[0,1,2,3,4,5,6,7,8,9,10,11]}}" wx:key="*this" style="--i:{{item}}"></view>
    </view>
    <view class="achievement-text" wx:if="{{showText}}">连胜5次！金色鸭子！</view>
  </view>

  <!-- 金色死亡 -->
  <view class="anim-container" wx:if="{{animationType === 'golden_death'}}">
    <view class="red-flash"></view>
    <view class="golden-death-scene">
      <view class="pixel-crown crown-fall"></view>
      <view class="pixel-duck golden shattering golden-shatter">
        <view class="pixel-fragment golden-frag frag-1"></view>
        <view class="pixel-fragment golden-frag frag-2"></view>
        <view class="pixel-fragment golden-frag frag-3"></view>
        <view class="pixel-fragment golden-frag frag-4"></view>
        <view class="pixel-fragment golden-frag frag-5"></view>
        <view class="pixel-fragment golden-frag frag-6"></view>
        <view class="pixel-fragment golden-frag frag-7"></view>
        <view class="pixel-fragment golden-frag frag-8"></view>
      </view>
    </view>
  </view>

</view>
```

- [ ] **Step 4: 创建 `components/duck-animation/duck-animation.wxss`**

包含：
- 全屏浮层样式（`position: fixed; z-index: 999`）
- 像素鸭 CSS Grid 绘制（8x7 grid，每个 cell 是一个小色块）
  - `.pixel-duck.normal`：黄色像素鸭（#FFD600 身体, #333 眼睛, #FF8F00 嘴和脚）
  - `.pixel-duck.golden`：金色像素鸭（#FFD700 身体, #FFA000 深色部分, 加 box-shadow 金光）
- 像素蛋 CSS Grid 绘制
  - `.pixel-egg`：白色蛋
  - `.pixel-egg.golden`：金色蛋 + 闪光
- `.pixel-crown`：像素小皇冠（5x3 grid，金色 + 红宝石）
- 普通孵化动画 keyframes：
  - `@keyframes eggBounceIn`（0.3s）
  - `@keyframes eggCrack`（0.4s）
  - `@keyframes duckPopOut`（0.3s）
- 普通死亡动画 keyframes：
  - `@keyframes duckFadeIn`（0.2s）
  - `@keyframes shatterOut`（0.5s，像素块四散 + 变灰）
  - `@keyframes fragmentFade`（0.3s）
- 金色孵化动画 keyframes：
  - `@keyframes overlayDarken`（0.3s）
  - `@keyframes goldenEggDrop`（0.5s）
  - `@keyframes goldenExplode`（0.6s）
  - `@keyframes goldenDuckReveal`（0.8s）
  - `@keyframes sparkleRotate`（持续旋转）
  - `@keyframes particleFall`（金色粒子散落）
  - `@keyframes textPopIn`（0.5s 成就文字弹入）
- 金色死亡动画 keyframes：
  - `@keyframes redFlashPulse`（0.2s 红色边缘闪烁）
  - `@keyframes crownDrop`（0.4s 皇冠掉落碎裂）
  - `@keyframes goldenShatterOut`（0.6s 金色碎片 + 光轨拖尾）
  - `@keyframes goldenFragFade`（0.4s 碎片暗淡消散）

完整 CSS 内容较长（约 400-500 行），实现时按上述 keyframes 逐一编写。所有像素块尺寸使用 `rpx` 适配不同屏幕。

- [ ] **Step 5: Commit**

```bash
git add components/duck-animation/
git commit -m "feat: add duck-animation fullscreen component with pixel art"
```

---

### Task 3: duck-farm 农场展示组件

**Files:**
- Create: `components/duck-farm/duck-farm.json`
- Create: `components/duck-farm/duck-farm.js`
- Create: `components/duck-farm/duck-farm.wxml`
- Create: `components/duck-farm/duck-farm.wxss`

- [ ] **Step 1: 创建 `components/duck-farm/duck-farm.json`**

```json
{
  "component": true
}
```

- [ ] **Step 2: 创建 `components/duck-farm/duck-farm.js`**

```javascript
Component({
  properties: {
    normalDucks: { type: Number, value: 0 },
    goldenDucks: { type: Number, value: 0 }
  },

  observers: {
    'normalDucks, goldenDucks': function (normal, golden) {
      this.buildDuckList(normal, golden);
    }
  },

  data: {
    ducks: [],
    totalCount: 0
  },

  lifetimes: {
    attached() {
      this.buildDuckList(this.data.normalDucks, this.data.goldenDucks);
    }
  },

  methods: {
    buildDuckList(normal, golden) {
      const ducks = [];
      for (let i = 0; i < golden; i++) {
        ducks.push({ id: 'g_' + i, type: 'golden', offsetX: this.pseudoRandom(i, 40), delay: i * 0.15 });
      }
      for (let i = 0; i < normal; i++) {
        ducks.push({ id: 'n_' + i, type: 'normal', offsetX: this.pseudoRandom(i + golden, 40), delay: (i + golden) * 0.08 });
      }
      this.setData({ ducks, totalCount: normal + golden });
    },

    pseudoRandom(seed, range) {
      const x = Math.sin(seed * 9301 + 49297) * 233280;
      return Math.floor((x - Math.floor(x)) * range) - range / 2;
    }
  }
});
```

- [ ] **Step 3: 创建 `components/duck-farm/duck-farm.wxml`**

```xml
<view class="farm-container" wx:if="{{totalCount > 0}}">
  <view class="farm-title-row">
    <text class="farm-title">🐥 我的鸭子农场</text>
  </view>
  <scroll-view class="farm-ground" scroll-x="{{totalCount > 8}}" enhanced show-scrollbar="{{false}}">
    <view class="farm-grass">
      <view
        class="farm-duck-slot"
        wx:for="{{ducks}}"
        wx:key="id"
        style="margin-left: {{item.offsetX}}rpx; animation-delay: {{item.delay}}s;"
      >
        <view class="pixel-duck-mini {{item.type}}">
          <view class="pixel-crown-mini" wx:if="{{item.type === 'golden'}}"></view>
        </view>
      </view>
    </view>
  </scroll-view>
  <view class="farm-stats">
    <text class="farm-stat">普通鸭 x{{normalDucks}}</text>
    <text class="farm-stat-divider">|</text>
    <text class="farm-stat golden-stat">金色鸭 x{{goldenDucks}}</text>
  </view>
</view>

<view class="farm-empty" wx:else>
  <text class="farm-empty-text">还没有鸭子，去答题孵化吧！</text>
</view>
```

- [ ] **Step 4: 创建 `components/duck-farm/duck-farm.wxss`**

包含：
- `.farm-container`：白色圆角卡片，`margin-bottom: 30rpx`
- `.farm-ground`：绿色像素草地背景（`#8BC34A` 渐变），高度约 `240rpx`，内部 flex 排列
- `.farm-grass`：flex wrap 布局，鸭子在草地上排列
- `.pixel-duck-mini.normal`：缩小版黄色像素鸭（4x3 grid，每 cell 约 `12rpx`），带 `idle-wobble` 摇摆动画
- `.pixel-duck-mini.golden`：缩小版金色像素鸭 + 闪光 `glow` 动画
- `.pixel-crown-mini`：缩小版像素皇冠
- `.farm-stats`：底部统计文字行
- `.farm-empty`：空状态提示

- [ ] **Step 5: Commit**

```bash
git add components/duck-farm/
git commit -m "feat: add duck-farm pixel art farm component for profile page"
```

---

### Task 4: 接入 app.js（追加初始化）

**Files:**
- Modify: `app.js` (追加，不改现有代码)

- [ ] **Step 1: 重新读取 `app.js` 最新版本，确认当前内容和插入点**

- [ ] **Step 2: 追加 duckData 初始化**

在 `app.js` 中做两处追加：

**追加 1：** 在 `onLaunch` 方法的 `this.checkPrivacyAgreement();` 之后，追加：

```javascript
    // 初始化鸭子数据
    const duckManager = require('./utils/duckManager.js');
    this.globalData.duckData = duckManager.getDuckData();
```

**追加 2：** 在 `globalData` 对象中，在 `grades` 数组之后追加：

```javascript
    // 鸭子动画数据
    duckData: null,
```

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: initialize duckData in app.js onLaunch and globalData"
```

---

### Task 5: 接入答题页（追加鸭子逻辑）

**Files:**
- Modify: `pages/practice/practice.js` (追加方法，不改现有方法)
- Modify: `pages/practice/practice.wxml` (末尾追加组件)
- Modify: `pages/practice/practice.json` (追加 usingComponents)

- [ ] **Step 1: 重新读取 `pages/practice/practice.js`、`practice.wxml`、`practice.json` 的最新版本，确认当前内容和插入点**

- [ ] **Step 2: 修改 `pages/practice/practice.json`（追加 `usingComponents`，保留所有现有字段）**

在最新读取的 JSON 中追加 `usingComponents` 字段，保留所有现有字段原样。如果已存在 `usingComponents`，则在其中追加条目：

```json
  "usingComponents": {
    "duck-animation": "/components/duck-animation/duck-animation"
  }
```

- [ ] **Step 3: 在 `pages/practice/practice.wxml` 末尾追加动画组件**

在文件最后一行 `</view>` 之后追加：

```xml

<!-- 鸭子动画全屏浮层 -->
<duck-animation id="duckAnim" bind:done="onDuckAnimDone"></duck-animation>
```

- [ ] **Step 4: 在 `pages/practice/practice.js` 中追加鸭子方法**

在 `data: { ... }` 中追加字段：

```javascript
    sessionDuckDelta: { hatched: 0, died: 0 },
    pendingFeedback: null,
```

在 `onLoad` 方法末尾追加 sessionDuckDelta 初始化（在最后的 `}` 之前添加一行）：

```javascript
    this.setData({ sessionDuckDelta: { hatched: 0, died: 0 } });
```

修改 `handleSubmit` 方法：在现有 `this.setData({ showFeedback: true, ... })` 调用**之前**插入鸭子动画逻辑。将原来直接设置 `showFeedback: true` 改为先播放鸭子动画，动画结束后再显示反馈。

具体做法 — 将 `handleSubmit` 中的这一段：

```javascript
    this.setData({
      showFeedback: true,
      isCorrect,
      feedbackType: isCorrect ? 'correct' : 'wrong',
      score: isCorrect ? this.data.score + 10 : this.data.score,
      answers: [...this.data.answers, answerRecord]
    });
```

替换为（注意：只替换这一个 `setData` 调用，**不要 return**，后面的 `saveAnswerRecord`、`updateLog`、`addToWrongQuestions` 等逻辑必须继续执行）：

```javascript
    // 鸭子动画逻辑：先算出动画类型，再决定是否延迟显示反馈
    const duckManager = require('../../utils/duckManager.js');
    let duckResult;
    if (isCorrect) {
      duckResult = duckManager.onCorrectAnswer();
      this.data.sessionDuckDelta.hatched += 1;
    } else {
      duckResult = duckManager.onWrongAnswer();
      if (duckResult.type !== 'none') {
        this.data.sessionDuckDelta.died += 1;
      }
    }

    const shouldPlayAnim = duckResult.type !== 'none';

    this.setData({
      showFeedback: !shouldPlayAnim,
      isCorrect,
      feedbackType: isCorrect ? 'correct' : 'wrong',
      score: isCorrect ? this.data.score + 10 : this.data.score,
      answers: [...this.data.answers, answerRecord]
    });

    if (shouldPlayAnim) {
      const anim = this.selectComponent('#duckAnim');
      if (anim) {
        anim.play(duckResult.type);
      } else {
        this.setData({ showFeedback: true });
      }
    }
```

**关键：这段代码不使用 `return`，后续的 `saveAnswerRecord`、云函数 `updateLog`、`addToWrongQuestions` 等原有逻辑正常执行不受影响。**

追加新方法 `onDuckAnimDone`（在 `onUnload` 方法之前）：

```javascript
  onDuckAnimDone: function () {
    this.setData({ showFeedback: true });
  },
```

修改 `goToResult` 方法：在 `app.globalData.currentPractice = { ... }` 赋值后，追加鸭子相关字段（不改现有字段）：

在 `finishTime: new Date()` 之后追加：

```javascript
      duckDelta: this.data.sessionDuckDelta,
```

并在 `wx.redirectTo` 之前追加连胜判定：

```javascript
    // 鸭子连胜判定
    const duckManager = require('../../utils/duckManager.js');
    const allCorrect = correctCount === totalQuestions;
    const sessionResult = duckManager.onSessionEnd(allCorrect);
    app.globalData.currentPractice.goldenDuckEarned = sessionResult.goldenDuckEarned;
    app.globalData.currentPractice.consecutivePerfect = sessionResult.consecutivePerfect;
```

- [ ] **Step 5: Commit**

```bash
git add pages/practice/
git commit -m "feat: integrate duck animation into practice page"
```

---

### Task 6: 接入结果页（追加鸭子摘要和金鸭动画）

**Files:**
- Modify: `pages/result/result.js` (追加逻辑)
- Modify: `pages/result/result.wxml` (追加展示区域)
- Modify: `pages/result/result.wxss` (追加新样式)
- Modify: `pages/result/result.json` (追加 usingComponents)

- [ ] **Step 1: 重新读取 `pages/result/result.js`、`result.wxml`、`result.wxss`、`result.json` 的最新版本，确认当前内容和插入点**

- [ ] **Step 2: 修改 `pages/result/result.json`（追加 `usingComponents`，保留所有现有字段）**

在最新读取的 JSON 中追加 `usingComponents` 字段，保留所有现有字段原样。如果已存在 `usingComponents`，则在其中追加条目：

```json
  "usingComponents": {
    "duck-animation": "/components/duck-animation/duck-animation"
  }
```

- [ ] **Step 3: 在 `pages/result/result.js` 的 `data` 中追加字段**

在 `encouragement: ''` 之后追加：

```javascript
    duckDelta: null,
    goldenDuckEarned: false,
    consecutivePerfect: 0,
    showGoldenDuckAnim: false
```

- [ ] **Step 4: 在 `pages/result/result.js` 的 `onLoad` 末尾追加鸭子数据读取**

在 `this.setData({ questionCount, knowledgeName, encouragement })` 之后追加：

```javascript

    // 读取鸭子数据
    const app = getApp();
    const practice = app.globalData.currentPractice;
    if (practice) {
      this.setData({
        duckDelta: practice.duckDelta || null,
        goldenDuckEarned: practice.goldenDuckEarned || false,
        consecutivePerfect: practice.consecutivePerfect || 0
      });
      if (practice.goldenDuckEarned) {
        setTimeout(() => {
          const anim = this.selectComponent('#duckAnimResult');
          if (anim) anim.play('golden_hatch');
        }, 800);
      }
    }
```

- [ ] **Step 5: 在 `pages/result/result.wxml` 中追加鸭子区域**

在 `<!-- 鼓励语 -->` 之前追加：

```xml
  <!-- 鸭子摘要 -->
  <view class="duck-summary" wx:if="{{duckDelta}}">
    <view class="duck-summary-row">
      <text class="duck-summary-item duck-hatched" wx:if="{{duckDelta.hatched > 0}}">🐣 孵化 +{{duckDelta.hatched}}</text>
      <text class="duck-summary-item duck-died" wx:if="{{duckDelta.died > 0}}">💀 阵亡 -{{duckDelta.died}}</text>
    </view>
    <!-- 连胜进度 -->
    <view class="streak-bar">
      <text class="streak-label">金鸭进度</text>
      <view class="streak-dots">
        <view wx:for="{{5}}" wx:key="*this" class="streak-dot {{index < consecutivePerfect ? 'streak-dot-active' : ''}}"></view>
      </view>
      <text class="streak-count">{{consecutivePerfect}}/5</text>
    </view>
  </view>
```

在文件末尾 `</view>` 之后追加：

```xml

<!-- 金色鸭子动画 -->
<duck-animation id="duckAnimResult" bind:done="onGoldenDuckAnimDone"></duck-animation>
```

- [ ] **Step 6: 在 `pages/result/result.js` 追加金鸭动画回调**

在 `onShareAppMessage` 方法之前追加：

```javascript
  onGoldenDuckAnimDone: function () {
    this.setData({ showGoldenDuckAnim: false });
  },
```

- [ ] **Step 7: 在 `pages/result/result.wxss` 末尾追加新样式**

```css
/* ==================== 鸭子摘要 ==================== */
.duck-summary {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: var(--radius-xl);
  padding: 24rpx 32rpx;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24rpx;
  z-index: 1;
}

.duck-summary-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.duck-summary-item {
  font-size: 28rpx;
  font-weight: 600;
  padding: 6rpx 20rpx;
  border-radius: var(--radius-round);
}

.duck-hatched {
  background-color: #E8F8E8;
  color: var(--success);
}

.duck-died {
  background-color: #FFF1F0;
  color: var(--error);
}

.streak-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.streak-label {
  font-size: 24rpx;
  color: var(--text-sub);
  flex-shrink: 0;
}

.streak-dots {
  display: flex;
  gap: 10rpx;
  flex: 1;
}

.streak-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background-color: var(--border-light);
  border: 2rpx solid var(--border);
}

.streak-dot-active {
  background: linear-gradient(135deg, #FFD700, #FFA000);
  border-color: #FFA000;
  box-shadow: 0 2rpx 8rpx rgba(255, 168, 0, 0.4);
}

.streak-count {
  font-size: 24rpx;
  color: var(--text-sub);
  font-weight: 600;
  flex-shrink: 0;
}
```

- [ ] **Step 8: Commit**

```bash
git add pages/result/
git commit -m "feat: add duck summary, streak progress, and golden duck animation to result page"
```

---

### Task 7: 接入"我的"页（追加鸭子农场）

**Files:**
- Modify: `pages/mine/mine.json` (追加 usingComponents)
- Modify: `pages/mine/mine.js` (追加 duckData 读取)
- Modify: `pages/mine/mine.wxml` (追加 duck-farm 组件)

- [ ] **Step 1: 重新读取 `pages/mine/mine.js`、`mine.wxml`、`mine.json` 的最新版本，确认当前内容和插入点**

- [ ] **Step 2: 修改 `pages/mine/mine.json`（追加 `usingComponents`，保留所有现有字段）**

在最新读取的 `mine.json` 中追加 `usingComponents` 字段。**必须保留所有现有字段原样**（如 `navigationBarTitleText`、`navigationStyle` 等可能已被其他 agent 添加的字段）。只追加：

```json
  "usingComponents": {
    "duck-farm": "/components/duck-farm/duck-farm"
  }
```

例如，如果当前 `mine.json` 是 `{"navigationBarTitleText": "我的"}`，则结果应为：

```json
{
  "navigationBarTitleText": "我的",
  "usingComponents": {
    "duck-farm": "/components/duck-farm/duck-farm"
  }
}
```

如果已存在 `usingComponents`，则在其中追加 `"duck-farm"` 条目。

- [ ] **Step 3: 在 `pages/mine/mine.js` 的 `data` 中追加字段**

在 `questionMode: 'bank'` 之后追加：

```javascript
    normalDucks: 0,
    goldenDucks: 0
```

- [ ] **Step 4: 在 `pages/mine/mine.js` 的 `onShow` 末尾追加鸭子数据读取**

在 `this.setData({ questionMode: mode });` 之后追加：

```javascript
    const duckManager = require('../../utils/duckManager.js');
    const duckData = duckManager.getDuckData();
    this.setData({ normalDucks: duckData.normalDucks, goldenDucks: duckData.goldenDucks });
```

- [ ] **Step 5: 在 `pages/mine/mine.wxml` 追加农场组件**

在 `<!-- 出题模式设置 -->` 之前追加：

```xml
  <!-- 鸭子农场 -->
  <duck-farm normal-ducks="{{normalDucks}}" golden-ducks="{{goldenDucks}}"></duck-farm>

```

- [ ] **Step 6: Commit**

```bash
git add pages/mine/
git commit -m "feat: add pixel duck farm to profile page"
```

---

### Task 8: 端到端手动验证

- [ ] **Step 1: 在微信开发者工具中编译项目**

检查编译无报错。

- [ ] **Step 2: 验证答题页**

1. 进入练习，答对一题 → 应看到全屏像素蛋孵化动画（~1秒），然后反馈弹窗出现
2. 答错一题 → 应看到全屏鸭子碎裂动画（~1秒），然后反馈弹窗出现
3. 答完所有题，进入结果页

- [ ] **Step 3: 验证结果页**

1. 应看到鸭子摘要区域：显示孵化和阵亡数量
2. 应看到金鸭进度条（●○○○○ 或 ●●○○○ 等）
3. 若连续5次全对（可通过手动修改 Storage 模拟），应看到金色鸭子孵化动画

- [ ] **Step 4: 验证"我的"页**

1. 切到"我的"tab → 应看到像素鸭子农场
2. 鸭子数量应与答题结果一致
3. 金色鸭子应有皇冠和闪光效果
4. 无鸭子时显示空状态提示

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete duck animation system integration"
```
