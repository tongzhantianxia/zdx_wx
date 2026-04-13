# 桔光小语 — 设计文档

> 日期：2026-04-13
> 状态：已确认，待实施

## 1. 产品概述

### 1.1 基本信息

- **项目名称**：桔光小语
- **小程序类目**：工具 → 育儿亲子/生活服务
- **产品定位**：家长亲子沟通话术工具，纯引导提问、不给答案、不教学、不辅导做题
- **技术栈**：微信原生小程序（WXML + WXSS + JS + JSON）+ 微信云开发（云函数）
- **AI 服务**：通义千问（阿里 DashScope）

### 1.2 合规红线

- 不含任何学科教学、题库、答案解析
- 全程只做家长话术参考
- 无违规内容
- 页面比例适配手机、布局整洁、交互流畅、弹窗合规

### 1.3 固定文案

**小程序介绍（后台上架）：**
桔光小语是面向家长的亲子沟通小工具，提供温和的思考引导与交流话术参考。帮助家长用更耐心的方式陪伴孩子，通过提问鼓励孩子主动表达、自主思考，营造轻松的家庭陪伴氛围。内容仅为家长话术参考，不提供答案、不开展教学辅导。

**Slogan：** 桔光相伴，好好说话

**首页顶部文案：**
- 主标题：陪伴孩子，从好好提问开始
- 副标题：不吼不骂，引导孩子自己思考

**合规弹窗文案：**
本工具仅为家长沟通话术参考，不提供答案、不教学、不讲解题目，旨在引导孩子自主思考，培养表达与逻辑习惯。

**关于页面文案：**
- 桔光小语让陪伴更温和，让思考自然发生
- 一款面向家长的亲子沟通话术小工具

**全局按钮文字：** 换一组、复制话术、收藏、查看引导说明

---

## 2. 架构设计

### 2.1 目录结构

项目文件直接位于工作区根目录 `/Users/jerry/Documents/zdx_wx/`，替换原有项目内容。

```
/（工作区根目录）
├── app.js
├── app.json
├── app.wxss
├── sitemap.json
├── project.config.json
│
├── custom-tab-bar/            # 自定义 TabBar（暖橘主题）
│   ├── index.js
│   ├── index.json
│   ├── index.wxml
│   └── index.wxss
│
├── pages/
│   ├── index/                 # 首页
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── math-guide/            # 数学思考引导页（Tab）
│   │   ├── math-guide.js
│   │   ├── math-guide.json
│   │   ├── math-guide.wxml
│   │   └── math-guide.wxss
│   ├── writing-guide/         # 作文表达引导页（Tab）
│   │   ├── writing-guide.js
│   │   ├── writing-guide.json
│   │   ├── writing-guide.wxml
│   │   └── writing-guide.wxss
│   └── mine/                  # 我的页面（Tab）
│       ├── mine.js
│       ├── mine.json
│       ├── mine.wxml
│       └── mine.wxss
│
├── components/
│   ├── guide-card/            # 核心共享组件：话术卡片
│   │   ├── guide-card.js
│   │   ├── guide-card.json
│   │   ├── guide-card.wxml
│   │   └── guide-card.wxss
│   ├── compliance-modal/      # 合规弹窗组件
│   │   ├── compliance-modal.js
│   │   ├── compliance-modal.json
│   │   ├── compliance-modal.wxml
│   │   └── compliance-modal.wxss
│   └── toast/                 # 自定义 Toast 提示
│       ├── toast.js
│       ├── toast.json
│       ├── toast.wxml
│       └── toast.wxss
│
├── utils/
│   ├── storage.js             # 本地缓存封装
│   ├── clipboard.js           # 复制功能封装
│   └── config.js              # 全局配置
│
├── images/                    # 图片资源（单张 ≤2MB）
│   └── tabbar/                # TabBar 图标 PNG（81×81px，8张）
│
└── cloudfunctions/
    └── generateGuide/         # 云函数：调用通义千问
        ├── index.js
        ├── config.js
        └── package.json
```

### 2.2 TabBar 配置

4 个 Tab 页：

| Tab 名称 | 页面路径 | 图标说明 |
|----------|---------|---------|
| 首页 | `pages/index/index` | 房子图标 |
| 数学引导 | `pages/math-guide/math-guide` | 灯泡/数字图标 |
| 作文引导 | `pages/writing-guide/writing-guide` | 铅笔图标 |
| 我的 | `pages/mine/mine` | 人像图标 |

TabBar 样式：自定义 custom TabBar（`custom-tab-bar/` 目录），选中色 `#FF8C42`，未选中 `#9B8574`，背景 `#FFFFFF`。

图标格式：使用 PNG 格式，每个 Tab 提供普通态和选中态两张图片（`81×81px`），存放在 `images/tabbar/` 目录。共 8 张图标文件：`home.png`、`home-active.png`、`math.png`、`math-active.png`、`writing.png`、`writing-active.png`、`mine.png`、`mine-active.png`。图标使用简约线条风格，匹配暖橘主题。

### 2.3 路由逻辑

- 首页四个功能卡片中：
  - "数学思考引导"和"作文表达引导"使用 `wx.switchTab` 跳转对应 Tab
  - "我的收藏"和"话术历史"使用 `wx.switchTab` 跳转"我的"页面，通过 `app.globalData.mineTab` 传递初始子 Tab 值

---

## 3. 核心组件设计

### 3.1 guide-card 组件

共享组件，数学引导页和作文引导页复用。

**Properties：**

| 属性 | 类型 | 说明 |
|------|------|------|
| type | String | `"math"` 或 `"writing"` |
| title | String | 显示标题 |
| tips | Array | `[{id, text, favorited}]` AI返回的3条话术 |
| loading | Boolean | 是否正在请求 AI |

**Events：**

| 事件 | 参数 | 说明 |
|------|------|------|
| onRefresh | 无 | 换一组，父页面重新调用云函数 |
| onCopy | `{text}` | 复制单条话术 |
| onCopyAll | 无 | 复制全部话术 |
| onToggleFav | `{id, text}` | 切换收藏状态 |

**UI 状态：**
- 正常态：3 张白色卡片，每条话术右侧有复制和收藏按钮
- Loading 态：骨架屏动画（3 条浅色脉冲条）
- 错误态：重试提示卡片 + "重新获取"按钮

### 3.2 compliance-modal 组件

**Properties：**

| 属性 | 类型 | 说明 |
|------|------|------|
| visible | Boolean | 是否显示 |

**Events：**

| 事件 | 说明 |
|------|------|
| onClose | 用户点击"我知道了"关闭弹窗 |

**触发规则：**
- 首次打开小程序 → 弹出一次（Storage `jgxy_compliance_shown` 标记）
- 进入数学/作文引导页 → 当次会话首次进入时弹出（`app.globalData.mathModalShown` / `writingModalShown`）
- "我的"页面"查看引导说明"入口 → 手动触发

### 3.3 toast 组件

轻量 Toast，用于"复制成功"、"已收藏"、"已取消收藏"等反馈。1.5 秒自动消失。

---

## 4. 数据流设计

### 4.1 AI 话术生成流程

```
用户点击"换一组"
  → guide-card 触发 onRefresh
  → 父页面设置 loading=true
  → 调用云函数 generateGuide({type})
  → 云函数：选择 Prompt → 调用通义千问 → 解析3条话术
  → 返回 {success, data: {type, tips}}
  → 父页面设置 loading=false，更新 tips
  → 检查每条话术是否已收藏，标记 favorited
  → 自动写入历史记录 Storage
```

### 4.2 本地存储结构

**收藏数据 — Key: `jgxy_favorites`**

```javascript
[
  {
    id: "1713024000000_0",
    text: "宝贝你觉得这道题在问什么呢？",
    type: "math",
    timestamp: 1713024000000
  }
]
```

**历史记录 — Key: `jgxy_history`**

```javascript
[
  {
    type: "math",
    tips: [
      { id: "1713024000000_0", text: "..." },
      { id: "1713024000000_1", text: "..." },
      { id: "1713024000000_2", text: "..." }
    ],
    timestamp: 1713024000000
  }
]
// 按时间倒序，最多保留 100 组
```

**合规弹窗标记 — Key: `jgxy_compliance_shown`**

```javascript
true  // 首次弹窗后标记
```

### 4.3 storage.js 接口

| 方法 | 说明 |
|------|------|
| `getFavorites()` | 获取全部收藏 |
| `toggleFavorite({id, text, type, timestamp})` | 收藏/取消收藏，返回新状态 |
| `isFavorited(id)` | 判断某条话术是否已收藏 |
| `getHistory()` | 获取历史记录列表 |
| `addHistory({type, tips, timestamp})` | 新增一组历史，自动裁剪到100条 |
| `clearHistory()` | 清空历史记录 |

---

## 5. 页面 UI 设计

### 5.1 配色体系

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | `#FF8C42` | 暖橘色，按钮、高亮、Tab选中 |
| 主色浅 | `#FFF3E6` | 卡片背景、页面底色 |
| 背景色 | `#FFFAF5` | 全局页面背景 |
| 文字主色 | `#4A3728` | 深棕色 |
| 文字次色 | `#9B8574` | 辅助说明 |
| 白色 | `#FFFFFF` | 卡片、弹窗背景 |
| 成功绿 | `#67C23A` | 复制成功提示 |

### 5.2 通用样式规范

- 圆角：卡片 `20rpx`，按钮 `40rpx`，弹窗 `24rpx`
- 阴影：`0 4rpx 16rpx rgba(255,140,66,0.1)`
- 字体：系统无衬线字体
- 行间距：`1.8`
- 内容区域两侧留白 `32rpx`

### 5.3 首页（index）

- 顶部：导航栏暖橘背景，标题"桔光小语"
- 中部上方：主标题 + 副标题 居中排列
- 中部核心：2×2 网格功能卡片（数学思考引导、作文表达引导、我的收藏、话术历史），白色圆角卡片 + 图标 + 文字
- 底部：Slogan "桔光相伴，好好说话" 次色小字

### 5.4 数学引导页 / 作文引导页

- 共享布局，通过 guide-card 组件渲染
- 进入时自动触发一次 AI 请求生成话术
- 卡片区域：3 张话术卡片纵向排列，每张白色圆角，左侧灯泡图标 + 话术文本，右侧复制和收藏按钮
- 底部操作区：换一组（主色按钮）+ 复制全部话术（浅橘底按钮）+ 查看引导说明（文字链接）
- Loading 态：骨架屏动画
- 首次进入：合规弹窗覆盖

### 5.5 我的页面（mine）

- 顶部：Segment 切换控件（我的收藏 | 话术历史）
- 收藏视图：列表，每条显示类型标签（数学/作文）+ 话术文本 + 复制/取消收藏按钮
- 历史视图：按组展示，每组显示时间 + 类型 + 3 条话术 + 复制全部/收藏按钮
- 空状态：温馨插画 + 提示文字（"还没有收藏哦" / "还没有生成过话术"）
- 底部信息区：版本号 + 查看引导说明 + 关于文案

---

## 6. 云函数设计

### 6.1 generateGuide 云函数

**入参：**

```javascript
{ type: "math" | "writing" }
```

**返回：**

```javascript
// 成功
{
  success: true,
  data: {
    type: "math",
    tips: [
      { id: "1713024000000_0", text: "宝贝你觉得这道题在问什么呢？" },
      { id: "1713024000000_1", text: "你能试着用手指比一比吗？" },
      { id: "1713024000000_2", text: "如果数字变小一点，你会怎么做？" }
    ]
  }
}

// 失败
{ success: false, error: "请求超时，请稍后再试" }
```

### 6.2 AI 固定 Prompt

**数学思考引导：**
> 你是温柔的亲子陪伴顾问「桔光小语」。用户是家长，孩子遇到数学题不会做。请只输出 3 条温和的提问话术，引导孩子自己思考。
> 规则：
> 绝对不给答案、不列算式、不讲知识点
> 只用提问，语气耐心口语化
> 每条一句话，不要多余解释

**作文表达引导：**
> 你是亲子陪伴顾问「桔光小语」。家长想引导孩子开口说作文内容。请只输出 3 条提问话术，帮助孩子自己表达。
> 规则：
> 不代写、不造句、不给范文
> 语气亲切，家长可直接对孩子说
> 每条一句话，不额外解释

### 6.3 通义千问调用参数

```javascript
{
  model: "qwen-turbo",
  temperature: 0.9,
  max_tokens: 200,
  top_p: 0.9
}
```

### 6.4 安全策略

- API Key 仅存于云函数 `config.js`，不进入前端
- 入参校验：`type` 仅允许 `"math"` 或 `"writing"`
- 频率限制：同一 `openid` 5 秒内不可重复请求

### 6.5 config.js

```javascript
module.exports = {
  DASHSCOPE_API_KEY: "",       // 填入通义千问 API Key
  MODEL: "qwen-turbo",
  MAX_TOKENS: 200,
  TEMPERATURE: 0.9
}
```

---

## 7. 错误处理

| 场景 | 处理方式 |
|------|---------|
| AI 请求超时 | guide-card 显示错误卡片 + "重新获取"按钮 |
| AI 返回格式异常 | 云函数尝试兜底解析，失败则返回通用错误 |
| API Key 无效 | 返回通用错误，不暴露详情 |
| Storage 满 | 历史记录超过 100 组自动裁剪最旧的 |
| 网络断开 | 前端检测网络状态，提示"网络不可用" |
| 复制失败 | Toast 提示"复制失败，请重试" |

---

## 8. 决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 项目位置 | 替换当前工作区 | 用户选择 |
| 页面架构 | 共享组件方案（guide-card） | 最大化复用，易扩展新引导类型 |
| AI 服务 | 通义千问 qwen-turbo | 国内直接调用、审核友好、成本低 |
| Tab 结构 | 4 Tab（首页/数学/作文/我的） | 用户选择，功能入口直达 |
| 数据存储 | 全部本地 Storage | 无需后端数据库，简单可靠 |
| 合规弹窗 | 首次 + 功能页会话首次 + 手动入口 | 满足审核要求，不过度打扰 |
