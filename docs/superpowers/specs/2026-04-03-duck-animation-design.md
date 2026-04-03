# 鸭子动画系统设计文档

## 概述

为"出题鸭"小程序答题流程增加像素风鸭子动画激励系统。答对孵化鸭子，答错死亡鸭子，连续 5 次练习全对孵化稀有金色鸭子。鸭子收集在"我的"页以像素农场形式展示。

## 需求确认

| 维度 | 决策 |
|------|------|
| 视觉风格 | 像素风 8-bit |
| 答对动画 | 全屏浮层，像素鸭从蛋中孵化 |
| 答错动画 | 全屏浮层，像素鸭碎裂死亡 |
| 金色鸭子触发 | 连续 5 次练习（session）全部答对 |
| 死亡扣除规则 | 优先扣普通鸭 → 普通为 0 才扣金鸭 → 最低 0 |
| "我的"页展示 | 像素鸭子农场（鸭子排列在草地上） |
| 数据存储 | 纯前端 `wx.getStorageSync` / `wx.setStorageSync` |

## 数据模型

### 本地存储 key：`duckData`

```javascript
{
  normalDucks: 0,          // 普通鸭子数量
  goldenDucks: 0,          // 金色鸭子数量
  consecutivePerfect: 0    // 当前连续全对的 session 次数（0-5）
}
```

### 状态变更规则

| 事件 | 操作 |
|------|------|
| 答对 1 题 | `normalDucks += 1`，播放普通孵化动画 |
| 答错 1 题 | 若 `normalDucks > 0`：`normalDucks -= 1`；否则若 `goldenDucks > 0`：`goldenDucks -= 1`；否则不扣。播放对应死亡动画（普通/金色） |
| 练习结束，本次全对 | `consecutivePerfect += 1`；若 `=== 5`：`goldenDucks += 1`，`consecutivePerfect = 0`，播放金色孵化动画 |
| 练习结束，有答错 | `consecutivePerfect = 0` |

### 读写方式

- `wx.getStorageSync('duckData')` / `wx.setStorageSync('duckData', data)` 同步读写
- `app.js` 的 `onLaunch` 中初始化默认值（不存在则创建）
- `app.globalData.duckData` 在页面间共享，每次变更后同步回 Storage

### 本次练习增量追踪

练习页在开始时记录 `sessionDuckDelta = { hatched: 0, died: 0 }`，每答一题实时累加。练习结束时将 delta 写入 `app.globalData.currentPractice.duckDelta`，结果页从中读取展示摘要。不通过对比 Storage 前后值计算。

### 金鸭达成与最后一题的关系

达成金色鸭子的那次练习中，最后一题答对时**仍然播放普通鸭孵化动画**（因为每题答对都孵化一只）。之后进入结果页时，**额外播放金色鸭子孵化动画**。两次动画是独立的，普通孵化在答题页，金鸭孵化在结果页，不合并。

### 中途退出练习

若用户中途退出练习（未到达结果页），`consecutivePerfect` 不变更（既不加也不清零），本次不算一个 session。答题过程中已经增减的普通鸭子数量保留（因为已实时写入 Storage）。

## 动画效果体系

### 普通鸭子 — 孵化（答对），总时长 ~1s

| 阶段 | 时长 | 效果 |
|------|------|------|
| 蛋出现 | 0.3s | 白色像素蛋从屏幕中央弹入，轻微弹跳 |
| 蛋裂开 | 0.4s | 蛋壳出现裂纹，逐像素碎开 |
| 鸭子蹦出 | 0.3s | 黄色像素鸭从蛋壳中跳出，左右摇摆 |

### 普通鸭子 — 死亡（答错），总时长 ~1s

| 阶段 | 时长 | 效果 |
|------|------|------|
| 鸭子出现 | 0.2s | 普通像素鸭站在屏幕中央 |
| 碎裂 | 0.5s | 像素块四散飞溅，颜色变灰 |
| 消散 | 0.3s | 碎片逐渐透明消失 |

### 金色鸭子 — 孵化（连续 5 次全对），总时长 ~2.7s

| 阶段 | 时长 | 效果 |
|------|------|------|
| 屏幕变暗 | 0.3s | 半透明黑色遮罩，聚光灯效果 |
| 金色蛋降临 | 0.5s | 闪烁金光的像素蛋从顶部缓缓下落，星星粒子环绕 |
| 蛋壳爆裂 | 0.6s | 蛋壳爆开成金色碎片向四周飞散，闪光特效 |
| 金鸭登场 | 0.8s | 金色像素鸭跳出，持续金色闪光，头戴像素小皇冠，全屏撒落金色像素粒子 |
| 文字提示 | 0.5s | 像素字体弹出："连胜5次！金色鸭子！" |

### 金色鸭子 — 死亡（普通鸭为 0 时答错），总时长 ~1.9s

| 阶段 | 时长 | 效果 |
|------|------|------|
| 屏幕闪红 | 0.2s | 屏幕边缘闪烁红色警告光 |
| 金鸭出现 | 0.3s | 金色像素鸭站在中央，皇冠闪烁 |
| 皇冠掉落 | 0.4s | 小皇冠先掉落摔碎成像素点 |
| 金鸭碎裂 | 0.6s | 碎成金色像素块，比普通鸭碎裂范围更大、更慢，碎片带拖尾金色光轨 |
| 消散 | 0.4s | 金色碎片逐渐暗淡、变灰、消失 |

### 实现方式

纯 CSS keyframes + WXML 条件渲染，不引入第三方动画库。像素鸭用 CSS Grid 绘制（每个像素块一个 `div`），碎裂效果通过对各像素块分别应用不同方向的 `transform: translate()` + `opacity` 动画实现。

## 页面改动

### 1. 答题页 (`pages/practice/practice`)

**新增全屏动画浮层：**
- 引用 `duck-animation` 组件，`position: fixed; z-index: 999`，默认隐藏
- 触发时覆盖全屏，动画播完自动消失

**触发流程改动（`submitAnswer` 方法）：**
1. 答对 → 更新 duckData → 播放普通孵化动画 → 动画结束后弹出原有反馈弹窗
2. 答错且有鸭可扣 → 更新 duckData → 播放对应死亡动画 → 动画结束后弹出原有反馈弹窗
3. 答错但鸭子为 0 → 跳过动画，直接弹出反馈弹窗

**`goToResult` 改动：**
- 检查本次是否全对，更新 `consecutivePerfect`
- 若触发金色鸭子（`consecutivePerfect` 达到 5），设置标记传递给结果页

### 2. 结果页 (`pages/result/result`)

- 从 `app.globalData.currentPractice` 读取真实数据（修复现有未读取的问题），需要的字段：
  - `score`：总分
  - `correctCount`：答对题数
  - `totalQuestions`：总题数
  - `accuracy`：正确率百分比
  - `answers`：每题答案详情
  - `duckDelta`：`{ hatched: Number, died: Number }`，本次练习鸭子增量
  - `goldenDuckEarned`：`Boolean`，本次是否触发金色鸭子
  - `consecutivePerfect`：`Number`，当前连胜次数（0-4，因为触发金鸭时已重置为 0）
- 展示本次鸭子变化摘要（从 `duckDelta` 读取，如 "+3 孵化, -1 阵亡"）
- 若 `goldenDuckEarned === true`：播放金色鸭子孵化动画
- 展示连胜进度条：`●●●○○`（3/5），让用户看到离金鸭还差几次

### 3. "我的"页 (`pages/mine/mine`)

**新增像素鸭子农场区域（头像下方）：**
- 绿色像素草地背景（CSS Grid）
- 普通鸭子：黄色像素鸭，随机站位，轻微左右摇摆 idle 动画
- 金色鸭子：金色像素鸭 + 小皇冠，站在中间/前排，持续闪光效果
- 鸭子多时自动 Grid 排列，超量可滚动查看
- 农场下方小字：`普通鸭 x12 | 金色鸭 x2`

## 新增文件

| 文件 | 用途 |
|------|------|
| `components/duck-animation/duck-animation.wxml` | 全屏动画组件模板 |
| `components/duck-animation/duck-animation.wxss` | 动画样式与 keyframes |
| `components/duck-animation/duck-animation.js` | 动画控制逻辑（播放、回调） |
| `components/duck-animation/duck-animation.json` | 组件配置 |
| `components/duck-farm/duck-farm.wxml` | 像素农场组件模板 |
| `components/duck-farm/duck-farm.wxss` | 农场样式 |
| `components/duck-farm/duck-farm.js` | 农场渲染逻辑 |
| `components/duck-farm/duck-farm.json` | 组件配置 |
| `utils/duckManager.js` | 鸭子数据管理（读写 Storage、增减、连胜判定） |

## 改动文件

| 文件 | 改动内容 |
|------|---------|
| `app.js` | `onLaunch` 初始化 `duckData`，`globalData` 新增 `duckData` |
| `pages/practice/practice.js` | `submitAnswer` 加入鸭子逻辑和动画触发，`goToResult` 加入连胜判定 |
| `pages/practice/practice.wxml` | 引入 `duck-animation` 组件 |
| `pages/practice/practice.json` | 注册 `duck-animation` 组件 |
| `pages/result/result.js` | 读取 `currentPractice` 真实数据，展示鸭子摘要和连胜进度，金鸭动画触发 |
| `pages/result/result.wxml` | 新增鸭子摘要区域、连胜进度条、金鸭动画 |
| `pages/result/result.wxss` | 新增摘要和进度条样式 |
| `pages/result/result.json` | 注册 `duck-animation` 组件 |
| `pages/mine/mine.js` | 读取 `duckData`，传递给农场组件 |
| `pages/mine/mine.wxml` | 引入 `duck-farm` 组件 |
| `pages/mine/mine.wxss` | 农场区域布局样式 |
| `pages/mine/mine.json` | 注册 `duck-farm` 组件 |

## 约束：只新增，不改动现有代码

所有现有文件的现有代码保持不动。鸭子功能通过以下方式实现：
- **新增文件**：组件、工具函数
- **现有文件仅追加**：在现有 JS 中追加新方法/生命周期钩子调用，在现有 WXML 中追加组件引用，在 JSON 中追加组件注册。不修改、不重构任何现有逻辑。

## 不改动的部分

- 云函数：无改动
- 数据库：无新增 collection
- 其他页面（`practice-select`、`improve`、`privacy`）：无改动
- `getQuestions`、`generateQuestions` 等云函数逻辑不受影响
- 现有的 `submitAnswer`、`handleNext`、`goToResult`、结果页、"我的"页等**现有逻辑全部保持原样**
