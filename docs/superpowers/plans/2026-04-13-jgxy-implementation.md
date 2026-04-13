# 桔光小语 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete WeChat Mini Program "桔光小语" — a parent-child communication tool that generates AI-powered conversation starters via Alibaba DashScope (通义千问).

**Architecture:** Native WeChat Mini Program with 4-tab layout, shared `guide-card` component for math/writing guide pages, local Storage for favorites/history, and a single cloud function calling 通义千问 for AI content generation.

**Tech Stack:** WXML + WXSS + JS + JSON (WeChat native), WeChat Cloud Functions (Node.js), Alibaba DashScope API (qwen-turbo)

**Design Spec:** `docs/superpowers/specs/2026-04-13-jgxy-design.md`

---

## File Structure

```
/（workspace root）
├── app.js                         # Global logic: compliance popup state, cloud init
├── app.json                       # Routes, tabBar config, window settings
├── app.wxss                       # Global styles: CSS variables, utility classes
├── sitemap.json                   # Sitemap config
├── project.config.json            # WeChat DevTools project config
├── package.json                   # Project metadata
│
├── custom-tab-bar/
│   ├── index.js                   # Tab switching logic, active state
│   ├── index.json                 # Component declaration
│   ├── index.wxml                 # Tab layout with icons + labels
│   └── index.wxss                 # Tab styles: warm orange theme
│
├── pages/
│   ├── index/
│   │   ├── index.js               # Home page: card tap handlers, switchTab
│   │   ├── index.json             # Page config
│   │   ├── index.wxml             # Slogan + 2x2 feature grid
│   │   └── index.wxss             # Home page styles
│   ├── math-guide/
│   │   ├── math-guide.js          # Call generateGuide({type:"math"}), manage tips state
│   │   ├── math-guide.json        # Registers guide-card, compliance-modal, toast
│   │   ├── math-guide.wxml        # Page shell wrapping guide-card component
│   │   └── math-guide.wxss        # Page-specific styles
│   ├── writing-guide/
│   │   ├── writing-guide.js       # Call generateGuide({type:"writing"}), manage tips state
│   │   ├── writing-guide.json     # Registers guide-card, compliance-modal, toast
│   │   ├── writing-guide.wxml     # Page shell wrapping guide-card component
│   │   └── writing-guide.wxss     # Page-specific styles
│   └── mine/
│       ├── mine.js                # Segment switch, load favorites/history from Storage
│       ├── mine.json              # Page config
│       ├── mine.wxml              # Segment tabs + fav list + history list + about section
│       └── mine.wxss              # Mine page styles
│
├── components/
│   ├── guide-card/
│   │   ├── guide-card.js          # Properties: type/title/tips/loading; Events: refresh/copy/fav
│   │   ├── guide-card.json        # Component declaration
│   │   ├── guide-card.wxml        # 3 tip cards + skeleton + error state
│   │   └── guide-card.wxss        # Card styles with skeleton animation
│   ├── compliance-modal/
│   │   ├── compliance-modal.js    # visible prop, onClose event
│   │   ├── compliance-modal.json  # Component declaration
│   │   ├── compliance-modal.wxml  # Modal overlay + card + confirm button
│   │   └── compliance-modal.wxss  # Modal styles
│   └── toast/
│       ├── toast.js               # show(msg) method, auto-hide 1.5s
│       ├── toast.json             # Component declaration
│       ├── toast.wxml             # Toast popup
│       └── toast.wxss             # Toast styles
│
├── utils/
│   ├── storage.js                 # getFavorites, toggleFavorite, isFavorited, getHistory, addHistory, clearHistory
│   ├── clipboard.js               # copyText(text) wrapper
│   └── config.js                  # Color constants, version, storage keys
│
├── images/
│   └── tabbar/                    # 8 PNG icons (81x81px) for tab bar
│
└── cloudfunctions/
    └── generateGuide/
        ├── index.js               # Cloud function: route by type → call DashScope → parse 3 tips
        ├── config.js              # DASHSCOPE_API_KEY, MODEL, params
        └── package.json           # axios dependency
```

---

### Task 1: Clean workspace & create project skeleton

Clear all existing project files and set up the new project's global configuration files.

**Files:**
- Delete: all existing files in workspace root (except `.git/`, `docs/`)
- Create: `app.js`, `app.json`, `app.wxss`, `sitemap.json`, `project.config.json`, `package.json`

- [ ] **Step 1: Remove old project files**

```bash
cd /Users/jerry/Documents/zdx_wx
# Remove everything except .git and docs
ls | grep -v -E '^\.git$|^docs$' | xargs rm -rf
```

- [ ] **Step 2: Create `utils/config.js`**

```javascript
module.exports = {
  VERSION: '1.0.0',

  COLORS: {
    primary: '#FF8C42',
    primaryLight: '#FFF3E6',
    background: '#FFFAF5',
    textPrimary: '#4A3728',
    textSecondary: '#9B8574',
    white: '#FFFFFF',
    success: '#67C23A'
  },

  STORAGE_KEYS: {
    favorites: 'jgxy_favorites',
    history: 'jgxy_history',
    complianceShown: 'jgxy_compliance_shown'
  },

  HISTORY_MAX: 100
}
```

- [ ] **Step 3: Create `app.json`**

```json
{
  "pages": [
    "pages/index/index",
    "pages/math-guide/math-guide",
    "pages/writing-guide/writing-guide",
    "pages/mine/mine"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#FF8C42",
    "navigationBarTitleText": "桔光小语",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#FFFAF5"
  },
  "tabBar": {
    "custom": true,
    "color": "#9B8574",
    "selectedColor": "#FF8C42",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/tabbar/home.png",
        "selectedIconPath": "images/tabbar/home-active.png"
      },
      {
        "pagePath": "pages/math-guide/math-guide",
        "text": "数学引导",
        "iconPath": "images/tabbar/math.png",
        "selectedIconPath": "images/tabbar/math-active.png"
      },
      {
        "pagePath": "pages/writing-guide/writing-guide",
        "text": "作文引导",
        "iconPath": "images/tabbar/writing.png",
        "selectedIconPath": "images/tabbar/writing-active.png"
      },
      {
        "pagePath": "pages/mine/mine",
        "text": "我的",
        "iconPath": "images/tabbar/mine.png",
        "selectedIconPath": "images/tabbar/mine-active.png"
      }
    ]
  },
  "cloud": true,
  "style": "v2",
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents"
}
```

- [ ] **Step 4: Create `app.js`**

```javascript
const config = require('./utils/config')

App({
  globalData: {
    mathModalShown: false,
    writingModalShown: false,
    mineTab: 0
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      traceUser: true
    })

    const shown = wx.getStorageSync(config.STORAGE_KEYS.complianceShown)
    if (!shown) {
      this.globalData.showComplianceOnLaunch = true
    }
  }
})
```

- [ ] **Step 5: Create `app.wxss`**

```css
page {
  --color-primary: #FF8C42;
  --color-primary-light: #FFF3E6;
  --color-bg: #FFFAF5;
  --color-text: #4A3728;
  --color-text-secondary: #9B8574;
  --color-white: #FFFFFF;
  --color-success: #67C23A;
  --radius-card: 20rpx;
  --radius-btn: 40rpx;
  --radius-modal: 24rpx;
  --shadow-card: 0 4rpx 16rpx rgba(255, 140, 66, 0.1);
  --padding-page: 32rpx;

  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  line-height: 1.8;
  font-size: 28rpx;
  box-sizing: border-box;
}

.container {
  padding: var(--padding-page);
  min-height: 100vh;
  padding-bottom: 180rpx;
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-btn);
  padding: 20rpx 60rpx;
  font-size: 30rpx;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 140, 66, 0.3);
}

.btn-primary:active {
  opacity: 0.85;
}

.btn-secondary {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border: none;
  border-radius: var(--radius-btn);
  padding: 20rpx 60rpx;
  font-size: 30rpx;
  text-align: center;
}

.btn-secondary:active {
  opacity: 0.85;
}

.text-link {
  color: var(--color-text-secondary);
  font-size: 24rpx;
  text-align: center;
}

.card {
  background-color: var(--color-white);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 32rpx;
}
```

- [ ] **Step 6: Create `project.config.json`**

```json
{
  "description": "桔光小语 - 亲子沟通话术工具",
  "packOptions": {
    "ignore": [
      { "type": "file", "value": ".eslintrc.js" }
    ]
  },
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "newFeature": true,
    "coverView": true,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "compileHotReLoad": false,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    },
    "bundle": false,
    "useIsolateContext": true,
    "useCompilerModule": true
  },
  "compileType": "miniprogram",
  "libVersion": "2.25.0",
  "appid": "wxca282c2384d592fd",
  "projectname": "jgxy_wx",
  "cloudfunctionRoot": "cloudfunctions/",
  "condition": {}
}
```

- [ ] **Step 7: Create `sitemap.json` and `package.json`**

`sitemap.json`:
```json
{
  "desc": "关于本文件的更多信息，请参考文档 https://developers.weixin.qq.com/miniprogram/dev/framework/sitemap.html",
  "rules": [
    { "action": "allow", "page": "*" }
  ]
}
```

`package.json`:
```json
{
  "name": "jgxy_wx",
  "version": "1.0.0",
  "description": "桔光小语 - 亲子沟通话术工具",
  "private": true
}
```

- [ ] **Step 8: Create empty directory placeholders**

```bash
mkdir -p pages/index pages/math-guide pages/writing-guide pages/mine
mkdir -p components/guide-card components/compliance-modal components/toast
mkdir -p utils images/tabbar cloudfunctions/generateGuide
```

- [ ] **Step 9: Commit skeleton**

```bash
git add -A && git commit -m "feat: init 桔光小语 project skeleton with global config"
```

---

### Task 2: Utils — storage.js & clipboard.js

**Files:**
- Create: `utils/storage.js`
- Create: `utils/clipboard.js`

- [ ] **Step 1: Create `utils/storage.js`**

```javascript
const config = require('./config')

const KEYS = config.STORAGE_KEYS

function getFavorites() {
  return wx.getStorageSync(KEYS.favorites) || []
}

function toggleFavorite(item) {
  const favs = getFavorites()
  const idx = favs.findIndex(f => f.id === item.id)
  if (idx > -1) {
    favs.splice(idx, 1)
    wx.setStorageSync(KEYS.favorites, favs)
    return false
  }
  favs.unshift({
    id: item.id,
    text: item.text,
    type: item.type,
    timestamp: Date.now()
  })
  wx.setStorageSync(KEYS.favorites, favs)
  return true
}

function isFavorited(id) {
  const favs = getFavorites()
  return favs.some(f => f.id === id)
}

function getHistory() {
  return wx.getStorageSync(KEYS.history) || []
}

function addHistory(record) {
  const list = getHistory()
  list.unshift({
    type: record.type,
    tips: record.tips,
    timestamp: Date.now()
  })
  if (list.length > config.HISTORY_MAX) {
    list.length = config.HISTORY_MAX
  }
  wx.setStorageSync(KEYS.history, list)
}

function clearHistory() {
  wx.removeStorageSync(KEYS.history)
}

module.exports = {
  getFavorites,
  toggleFavorite,
  isFavorited,
  getHistory,
  addHistory,
  clearHistory
}
```

- [ ] **Step 2: Create `utils/clipboard.js`**

```javascript
function copyText(text) {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: () => resolve(true),
      fail: (err) => reject(err)
    })
  })
}

module.exports = { copyText }
```

- [ ] **Step 3: Verify by importing in app.js console**

Open WeChat DevTools, in Console run: `require('./utils/storage')` — should return object with all 6 methods. `require('./utils/clipboard')` — should return object with `copyText`.

- [ ] **Step 4: Commit**

```bash
git add utils/ && git commit -m "feat: add storage and clipboard utils"
```

---

### Task 3: Components — toast & compliance-modal

**Files:**
- Create: `components/toast/toast.js`, `toast.json`, `toast.wxml`, `toast.wxss`
- Create: `components/compliance-modal/compliance-modal.js`, `.json`, `.wxml`, `.wxss`

- [ ] **Step 1: Create toast component**

`components/toast/toast.json`:
```json
{
  "component": true
}
```

`components/toast/toast.js`:
```javascript
Component({
  data: {
    visible: false,
    message: ''
  },
  methods: {
    show(message) {
      this.setData({ visible: true, message })
      if (this._timer) clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        this.setData({ visible: false })
      }, 1500)
    }
  }
})
```

`components/toast/toast.wxml`:
```html
<view class="toast-mask" wx:if="{{visible}}">
  <view class="toast-content">
    <text>{{message}}</text>
  </view>
</view>
```

`components/toast/toast.wxss`:
```css
.toast-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
}

.toast-content {
  background: rgba(74, 55, 40, 0.8);
  color: #fff;
  padding: 20rpx 48rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  max-width: 60vw;
  text-align: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 2: Create compliance-modal component**

`components/compliance-modal/compliance-modal.json`:
```json
{
  "component": true
}
```

`components/compliance-modal/compliance-modal.js`:
```javascript
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onClose() {
      this.triggerEvent('close')
    },
    preventTap() {}
  }
})
```

`components/compliance-modal/compliance-modal.wxml`:
```html
<view class="modal-overlay" wx:if="{{visible}}" catchtap="preventTap">
  <view class="modal-card">
    <view class="modal-icon">💡</view>
    <view class="modal-title">温馨提示</view>
    <view class="modal-body">
      本工具仅为家长沟通话术参考，不提供答案、不教学、不讲解题目，旨在引导孩子自主思考，培养表达与逻辑习惯。
    </view>
    <button class="modal-btn" bindtap="onClose">我知道了</button>
  </view>
</view>
```

`components/compliance-modal/compliance-modal.wxss`:
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
}

.modal-card {
  width: 600rpx;
  background: #fff;
  border-radius: var(--radius-modal, 24rpx);
  padding: 60rpx 48rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-icon {
  font-size: 72rpx;
  margin-bottom: 20rpx;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #4A3728;
  margin-bottom: 24rpx;
}

.modal-body {
  font-size: 28rpx;
  color: #9B8574;
  line-height: 1.8;
  text-align: center;
  margin-bottom: 40rpx;
}

.modal-btn {
  background: #FF8C42;
  color: #fff;
  border: none;
  border-radius: 40rpx;
  padding: 18rpx 80rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.modal-btn:active {
  opacity: 0.85;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/toast components/compliance-modal && git commit -m "feat: add toast and compliance-modal components"
```

---

### Task 4: Component — guide-card (core shared component)

**Files:**
- Create: `components/guide-card/guide-card.js`, `.json`, `.wxml`, `.wxss`

- [ ] **Step 1: Create guide-card.json**

```json
{
  "component": true
}
```

- [ ] **Step 2: Create guide-card.js**

```javascript
const clipboard = require('../../utils/clipboard')

Component({
  properties: {
    type: { type: String, value: 'math' },
    title: { type: String, value: '' },
    tips: { type: Array, value: [] },
    loading: { type: Boolean, value: false },
    error: { type: Boolean, value: false }
  },

  methods: {
    onRefresh() {
      this.triggerEvent('refresh')
    },

    onCopy(e) {
      const { text } = e.currentTarget.dataset
      clipboard.copyText(text).then(() => {
        this.triggerEvent('toast', { message: '复制成功' })
      }).catch(() => {
        this.triggerEvent('toast', { message: '复制失败，请重试' })
      })
    },

    onCopyAll() {
      const allText = this.properties.tips.map((t, i) => `${i + 1}. ${t.text}`).join('\n')
      clipboard.copyText(allText).then(() => {
        this.triggerEvent('toast', { message: '复制成功' })
      }).catch(() => {
        this.triggerEvent('toast', { message: '复制失败，请重试' })
      })
    },

    onToggleFav(e) {
      const { id, text } = e.currentTarget.dataset
      this.triggerEvent('togglefav', { id, text, type: this.properties.type })
    }
  }
})
```

- [ ] **Step 3: Create guide-card.wxml**

```html
<view class="guide-card-wrapper">
  <!-- Loading skeleton -->
  <view class="skeleton-list" wx:if="{{loading}}">
    <view class="skeleton-item" wx:for="{{[1,2,3]}}" wx:key="*this">
      <view class="skeleton-line long"></view>
      <view class="skeleton-line short"></view>
    </view>
  </view>

  <!-- Error state -->
  <view class="error-card card" wx:elif="{{error}}">
    <view class="error-icon">😅</view>
    <text class="error-text">获取话术失败，请稍后再试</text>
    <button class="btn-primary retry-btn" bindtap="onRefresh">重新获取</button>
  </view>

  <!-- Tips list -->
  <view class="tips-list" wx:else>
    <view class="tip-card card" wx:for="{{tips}}" wx:key="id">
      <view class="tip-left">
        <view class="tip-icon">💡</view>
        <text class="tip-text">{{item.text}}</text>
      </view>
      <view class="tip-actions">
        <view class="action-btn" data-text="{{item.text}}" bindtap="onCopy">
          <text class="action-icon">📋</text>
          <text class="action-label">复制</text>
        </view>
        <view class="action-btn {{item.favorited ? 'active' : ''}}" data-id="{{item.id}}" data-text="{{item.text}}" bindtap="onToggleFav">
          <text class="action-icon">{{item.favorited ? '⭐' : '☆'}}</text>
          <text class="action-label">收藏</text>
        </view>
      </view>
    </view>
  </view>

  <!-- Action buttons -->
  <view class="action-bar" wx:if="{{!loading && !error && tips.length > 0}}">
    <button class="btn-primary refresh-btn" bindtap="onRefresh">🔄 换一组</button>
    <button class="btn-secondary copy-all-btn" bindtap="onCopyAll">复制全部话术</button>
  </view>
</view>
```

- [ ] **Step 4: Create guide-card.wxss**

```css
.guide-card-wrapper {
  width: 100%;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.tip-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 32rpx;
}

.tip-left {
  display: flex;
  align-items: flex-start;
  flex: 1;
  margin-right: 20rpx;
}

.tip-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.tip-text {
  font-size: 30rpx;
  color: var(--color-text);
  line-height: 1.8;
  word-break: break-all;
}

.tip-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  background: var(--color-primary-light);
}

.action-btn.active {
  background: #FFF0D0;
}

.action-btn:active {
  opacity: 0.7;
}

.action-icon {
  font-size: 28rpx;
}

.action-label {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

/* Action bar */
.action-bar {
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.refresh-btn {
  width: 80%;
}

.copy-all-btn {
  width: 80%;
}

/* Skeleton */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.skeleton-item {
  background: var(--color-white);
  border-radius: var(--radius-card);
  padding: 32rpx;
  box-shadow: var(--shadow-card);
}

.skeleton-line {
  height: 28rpx;
  border-radius: 14rpx;
  background: linear-gradient(90deg, #f0ebe6 25%, #f7f2ed 50%, #f0ebe6 75%);
  background-size: 400% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  margin-bottom: 16rpx;
}

.skeleton-line.long {
  width: 90%;
}

.skeleton-line.short {
  width: 60%;
  margin-bottom: 0;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* Error */
.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
}

.error-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.error-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  margin-bottom: 32rpx;
}

.retry-btn {
  width: 60%;
}
```

- [ ] **Step 5: Commit**

```bash
git add components/guide-card && git commit -m "feat: add guide-card shared component with skeleton and error states"
```

---

### Task 5: Custom TabBar

**Files:**
- Create: `custom-tab-bar/index.js`, `index.json`, `index.wxml`, `index.wxss`
- Create: 8 placeholder PNG icons in `images/tabbar/`

- [ ] **Step 1: Generate TabBar icon placeholders**

Since actual icon design is not in scope for code generation, create simple 81x81 placeholder PNGs using a canvas script. For now, create empty placeholder files that can be replaced with real icons later.

```bash
cd /Users/jerry/Documents/zdx_wx/images/tabbar
# Create minimal 1x1 PNG placeholders (will be replaced with real icons)
for name in home home-active math math-active writing writing-active mine mine-active; do
  printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB\x60\x82' > "${name}.png"
done
```

> Note: These are functional placeholder PNGs. Replace with actual 81×81 warm-orange-themed icons before submission.

- [ ] **Step 2: Create custom-tab-bar/index.json**

```json
{
  "component": true
}
```

- [ ] **Step 3: Create custom-tab-bar/index.js**

```javascript
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/math-guide/math-guide',
        text: '数学引导',
        iconPath: '/images/tabbar/math.png',
        selectedIconPath: '/images/tabbar/math-active.png'
      },
      {
        pagePath: '/pages/writing-guide/writing-guide',
        text: '作文引导',
        iconPath: '/images/tabbar/writing.png',
        selectedIconPath: '/images/tabbar/writing-active.png'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        iconPath: '/images/tabbar/mine.png',
        selectedIconPath: '/images/tabbar/mine-active.png'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
```

- [ ] **Step 4: Create custom-tab-bar/index.wxml**

```html
<view class="tab-bar">
  <view
    class="tab-bar-item"
    wx:for="{{list}}"
    wx:key="pagePath"
    data-path="{{item.pagePath}}"
    data-index="{{index}}"
    bindtap="switchTab"
  >
    <image
      class="tab-icon"
      src="{{selected === index ? item.selectedIconPath : item.iconPath}}"
    />
    <text class="tab-text {{selected === index ? 'active' : ''}}">{{item.text}}</text>
  </view>
</view>
```

- [ ] **Step 5: Create custom-tab-bar/index.wxss**

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
  z-index: 999;
}

.tab-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 8rpx 0;
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 4rpx;
}

.tab-text {
  font-size: 20rpx;
  color: #9B8574;
}

.tab-text.active {
  color: #FF8C42;
  font-weight: 500;
}
```

- [ ] **Step 6: Commit**

```bash
git add custom-tab-bar images/tabbar && git commit -m "feat: add custom tab bar with warm orange theme"
```

---

### Task 6: Home Page (index)

**Files:**
- Create: `pages/index/index.js`, `index.json`, `index.wxml`, `index.wxss`

- [ ] **Step 1: Create index.json**

```json
{
  "usingComponents": {
    "compliance-modal": "/components/compliance-modal/compliance-modal"
  },
  "navigationBarTitleText": "桔光小语"
}
```

- [ ] **Step 2: Create index.js**

```javascript
const config = require('../../utils/config')
const app = getApp()

Page({
  data: {
    showCompliance: false,
    features: [
      { key: 'math', title: '数学思考引导', icon: '🔢', desc: '引导孩子自主思考' },
      { key: 'writing', title: '作文表达引导', icon: '✏️', desc: '启发孩子主动表达' },
      { key: 'favorites', title: '我的收藏', icon: '⭐', desc: '常用话术随时查看' },
      { key: 'history', title: '话术历史', icon: '📋', desc: '回顾过往引导内容' }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    if (app.globalData.showComplianceOnLaunch) {
      this.setData({ showCompliance: true })
      app.globalData.showComplianceOnLaunch = false
    }
  },

  onFeatureTap(e) {
    const { key } = e.currentTarget.dataset
    switch (key) {
      case 'math':
        wx.switchTab({ url: '/pages/math-guide/math-guide' })
        break
      case 'writing':
        wx.switchTab({ url: '/pages/writing-guide/writing-guide' })
        break
      case 'favorites':
        app.globalData.mineTab = 0
        wx.switchTab({ url: '/pages/mine/mine' })
        break
      case 'history':
        app.globalData.mineTab = 1
        wx.switchTab({ url: '/pages/mine/mine' })
        break
    }
  },

  onCloseCompliance() {
    this.setData({ showCompliance: false })
    wx.setStorageSync(config.STORAGE_KEYS.complianceShown, true)
  }
})
```

- [ ] **Step 3: Create index.wxml**

```html
<view class="container home">
  <!-- Header -->
  <view class="home-header">
    <view class="home-title">陪伴孩子，从好好提问开始</view>
    <view class="home-subtitle">不吼不骂，引导孩子自己思考</view>
  </view>

  <!-- Feature Grid -->
  <view class="feature-grid">
    <view
      class="feature-card card"
      wx:for="{{features}}"
      wx:key="key"
      data-key="{{item.key}}"
      bindtap="onFeatureTap"
    >
      <view class="feature-icon">{{item.icon}}</view>
      <view class="feature-title">{{item.title}}</view>
      <view class="feature-desc">{{item.desc}}</view>
    </view>
  </view>

  <!-- Slogan -->
  <view class="home-slogan">桔光相伴，好好说话</view>

  <!-- Compliance Modal -->
  <compliance-modal visible="{{showCompliance}}" bind:close="onCloseCompliance" />
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-header {
  text-align: center;
  padding: 60rpx 0 48rpx;
}

.home-title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12rpx;
}

.home-subtitle {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  width: 100%;
  padding: 0 8rpx;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 24rpx;
  transition: transform 0.15s;
}

.feature-card:active {
  transform: scale(0.97);
}

.feature-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.feature-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8rpx;
}

.feature-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  text-align: center;
}

.home-slogan {
  margin-top: 60rpx;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  letter-spacing: 4rpx;
}
```

- [ ] **Step 5: Verify in DevTools**

Open WeChat DevTools → compile → verify:
- Home page renders with title, subtitle, 4 feature cards in 2×2 grid
- TabBar shows at bottom with "首页" selected
- First-time compliance modal appears
- Tapping feature cards navigates correctly

- [ ] **Step 6: Commit**

```bash
git add pages/index && git commit -m "feat: add home page with feature grid and compliance modal"
```

---

### Task 7: Math Guide Page & Writing Guide Page

**Files:**
- Create: `pages/math-guide/math-guide.js`, `.json`, `.wxml`, `.wxss`
- Create: `pages/writing-guide/writing-guide.js`, `.json`, `.wxml`, `.wxss`

- [ ] **Step 1: Create math-guide.json**

```json
{
  "usingComponents": {
    "guide-card": "/components/guide-card/guide-card",
    "compliance-modal": "/components/compliance-modal/compliance-modal",
    "toast": "/components/toast/toast"
  },
  "navigationBarTitleText": "数学思考引导"
}
```

- [ ] **Step 2: Create math-guide.js**

```javascript
const storage = require('../../utils/storage')
const app = getApp()

Page({
  data: {
    tips: [],
    loading: false,
    error: false,
    showCompliance: false
  },

  _lastRequestTime: 0,

  onLoad() {
    this.fetchTips()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    if (!app.globalData.mathModalShown) {
      this.setData({ showCompliance: true })
      app.globalData.mathModalShown = true
    }
    this._refreshFavState()
  },

  fetchTips() {
    const now = Date.now()
    if (now - this._lastRequestTime < 5000) {
      this.selectComponent('#toast').show('请稍后再试')
      return
    }
    this._lastRequestTime = now

    this.setData({ loading: true, error: false })
    wx.cloud.callFunction({
      name: 'generateGuide',
      data: { type: 'math' }
    }).then(res => {
      const result = res.result
      if (result.success) {
        const tips = result.data.tips.map(t => ({
          ...t,
          favorited: storage.isFavorited(t.id)
        }))
        this.setData({ tips, loading: false })
        storage.addHistory({ type: 'math', tips: result.data.tips })
      } else {
        this.setData({ loading: false, error: true })
        this.selectComponent('#toast').show(result.error || '获取失败')
      }
    }).catch(() => {
      this.setData({ loading: false, error: true })
    })
  },

  onRefresh() {
    this.fetchTips()
  },

  onToggleFav(e) {
    const { id, text, type } = e.detail
    const added = storage.toggleFavorite({ id, text, type })
    this.selectComponent('#toast').show(added ? '已收藏' : '已取消收藏')
    this._refreshFavState()
  },

  onToast(e) {
    this.selectComponent('#toast').show(e.detail.message)
  },

  onCloseCompliance() {
    this.setData({ showCompliance: false })
  },

  onShowCompliance() {
    this.setData({ showCompliance: true })
  },

  _refreshFavState() {
    const tips = this.data.tips.map(t => ({
      ...t,
      favorited: storage.isFavorited(t.id)
    }))
    this.setData({ tips })
  }
})
```

- [ ] **Step 3: Create math-guide.wxml**

```html
<view class="container guide-page">
  <guide-card
    type="math"
    title="数学思考引导"
    tips="{{tips}}"
    loading="{{loading}}"
    error="{{error}}"
    bind:refresh="onRefresh"
    bind:togglefav="onToggleFav"
    bind:toast="onToast"
  />

  <view class="compliance-link" bindtap="onShowCompliance">
    <text>查看引导说明</text>
  </view>

  <compliance-modal visible="{{showCompliance}}" bind:close="onCloseCompliance" />
  <toast id="toast" />
</view>
```

- [ ] **Step 4: Create math-guide.wxss**

```css
.guide-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.compliance-link {
  margin-top: 32rpx;
  padding: 16rpx;
}

.compliance-link text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  text-decoration: underline;
}
```

- [ ] **Step 5: Create writing-guide.json**

```json
{
  "usingComponents": {
    "guide-card": "/components/guide-card/guide-card",
    "compliance-modal": "/components/compliance-modal/compliance-modal",
    "toast": "/components/toast/toast"
  },
  "navigationBarTitleText": "作文表达引导"
}
```

- [ ] **Step 6: Create writing-guide.js**

```javascript
const storage = require('../../utils/storage')
const app = getApp()

Page({
  data: {
    tips: [],
    loading: false,
    error: false,
    showCompliance: false
  },

  _lastRequestTime: 0,

  onLoad() {
    this.fetchTips()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    if (!app.globalData.writingModalShown) {
      this.setData({ showCompliance: true })
      app.globalData.writingModalShown = true
    }
    this._refreshFavState()
  },

  fetchTips() {
    const now = Date.now()
    if (now - this._lastRequestTime < 5000) {
      this.selectComponent('#toast').show('请稍后再试')
      return
    }
    this._lastRequestTime = now

    this.setData({ loading: true, error: false })
    wx.cloud.callFunction({
      name: 'generateGuide',
      data: { type: 'writing' }
    }).then(res => {
      const result = res.result
      if (result.success) {
        const tips = result.data.tips.map(t => ({
          ...t,
          favorited: storage.isFavorited(t.id)
        }))
        this.setData({ tips, loading: false })
        storage.addHistory({ type: 'writing', tips: result.data.tips })
      } else {
        this.setData({ loading: false, error: true })
        this.selectComponent('#toast').show(result.error || '获取失败')
      }
    }).catch(() => {
      this.setData({ loading: false, error: true })
    })
  },

  onRefresh() {
    this.fetchTips()
  },

  onToggleFav(e) {
    const { id, text, type } = e.detail
    const added = storage.toggleFavorite({ id, text, type })
    this.selectComponent('#toast').show(added ? '已收藏' : '已取消收藏')
    this._refreshFavState()
  },

  onToast(e) {
    this.selectComponent('#toast').show(e.detail.message)
  },

  onCloseCompliance() {
    this.setData({ showCompliance: false })
  },

  onShowCompliance() {
    this.setData({ showCompliance: true })
  },

  _refreshFavState() {
    const tips = this.data.tips.map(t => ({
      ...t,
      favorited: storage.isFavorited(t.id)
    }))
    this.setData({ tips })
  }
})
```

- [ ] **Step 7: Create writing-guide.wxml**

```html
<view class="container guide-page">
  <guide-card
    type="writing"
    title="作文表达引导"
    tips="{{tips}}"
    loading="{{loading}}"
    error="{{error}}"
    bind:refresh="onRefresh"
    bind:togglefav="onToggleFav"
    bind:toast="onToast"
  />

  <view class="compliance-link" bindtap="onShowCompliance">
    <text>查看引导说明</text>
  </view>

  <compliance-modal visible="{{showCompliance}}" bind:close="onCloseCompliance" />
  <toast id="toast" />
</view>
```

- [ ] **Step 8: Create writing-guide.wxss**

```css
.guide-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.compliance-link {
  margin-top: 32rpx;
  padding: 16rpx;
}

.compliance-link text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  text-decoration: underline;
}
```

- [ ] **Step 9: Verify in DevTools**

- Switch to "数学引导" tab → loading skeleton appears → (cloud function not deployed yet, should show error state with retry button)
- Switch to "作文引导" tab → same behavior
- Compliance modal appears on first visit
- "查看引导说明" link works

- [ ] **Step 10: Commit**

```bash
git add pages/math-guide pages/writing-guide && git commit -m "feat: add math and writing guide pages with shared guide-card component"
```

---

### Task 8: Mine Page (favorites + history + about)

**Files:**
- Create: `pages/mine/mine.js`, `mine.json`, `mine.wxml`, `mine.wxss`

- [ ] **Step 1: Create mine.json**

```json
{
  "usingComponents": {
    "compliance-modal": "/components/compliance-modal/compliance-modal",
    "toast": "/components/toast/toast"
  },
  "navigationBarTitleText": "我的"
}
```

- [ ] **Step 2: Create mine.js**

```javascript
const storage = require('../../utils/storage')
const clipboard = require('../../utils/clipboard')
const config = require('../../utils/config')
const app = getApp()

Page({
  data: {
    currentTab: 0,
    favorites: [],
    history: [],
    showCompliance: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }

    const mineTab = app.globalData.mineTab
    if (mineTab !== undefined) {
      this.setData({ currentTab: mineTab })
      app.globalData.mineTab = 0
    }

    this._loadData()
  },

  _loadData() {
    this.setData({
      favorites: storage.getFavorites(),
      history: storage.getHistory()
    })
  },

  onTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  onCopyFav(e) {
    const { text } = e.currentTarget.dataset
    clipboard.copyText(text).then(() => {
      this.selectComponent('#toast').show('复制成功')
    }).catch(() => {
      this.selectComponent('#toast').show('复制失败')
    })
  },

  onRemoveFav(e) {
    const { id, text, type } = e.currentTarget.dataset
    storage.toggleFavorite({ id, text, type })
    this._loadData()
    this.selectComponent('#toast').show('已取消收藏')
  },

  onCopyHistory(e) {
    const { index } = e.currentTarget.dataset
    const group = this.data.history[index]
    const text = group.tips.map((t, i) => `${i + 1}. ${t.text}`).join('\n')
    clipboard.copyText(text).then(() => {
      this.selectComponent('#toast').show('复制成功')
    }).catch(() => {
      this.selectComponent('#toast').show('复制失败')
    })
  },

  onFavFromHistory(e) {
    const { id, text, type } = e.currentTarget.dataset
    const added = storage.toggleFavorite({ id, text, type })
    this.selectComponent('#toast').show(added ? '已收藏' : '已取消收藏')
    this._loadData()
  },

  onClearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有话术历史记录吗？',
      confirmColor: '#FF8C42',
      success: (res) => {
        if (res.confirm) {
          storage.clearHistory()
          this._loadData()
          this.selectComponent('#toast').show('已清空历史')
        }
      }
    })
  },

  onShowCompliance() {
    this.setData({ showCompliance: true })
  },

  onCloseCompliance() {
    this.setData({ showCompliance: false })
  }
})
```

- [ ] **Step 3: Create mine.wxml**

```html
<view class="container mine-page">
  <!-- Segment Tabs -->
  <view class="segment">
    <view class="segment-item {{currentTab === 0 ? 'active' : ''}}" data-tab="{{0}}" bindtap="onTabSwitch">
      我的收藏
    </view>
    <view class="segment-item {{currentTab === 1 ? 'active' : ''}}" data-tab="{{1}}" bindtap="onTabSwitch">
      话术历史
    </view>
  </view>

  <!-- Favorites Tab -->
  <view class="tab-content" wx:if="{{currentTab === 0}}">
    <view wx:if="{{favorites.length === 0}}" class="empty-state">
      <view class="empty-icon">⭐</view>
      <text class="empty-text">还没有收藏哦</text>
      <text class="empty-hint">在引导页点击收藏按钮即可保存</text>
    </view>

    <view class="fav-list" wx:else>
      <view class="fav-item card" wx:for="{{favorites}}" wx:key="id">
        <view class="fav-top">
          <view class="type-tag {{item.type}}">{{item.type === 'math' ? '数学' : '作文'}}</view>
          <text class="fav-text">{{item.text}}</text>
        </view>
        <view class="fav-actions">
          <view class="fav-btn" data-text="{{item.text}}" bindtap="onCopyFav">📋 复制</view>
          <view class="fav-btn danger" data-id="{{item.id}}" data-text="{{item.text}}" data-type="{{item.type}}" bindtap="onRemoveFav">取消收藏</view>
        </view>
      </view>
    </view>
  </view>

  <!-- History Tab -->
  <view class="tab-content" wx:if="{{currentTab === 1}}">
    <view wx:if="{{history.length === 0}}" class="empty-state">
      <view class="empty-icon">📋</view>
      <text class="empty-text">还没有生成过话术</text>
      <text class="empty-hint">去引导页点击"换一组"试试吧</text>
    </view>

    <block wx:else>
      <view class="clear-bar" bindtap="onClearHistory">
        <text>清空历史</text>
      </view>
      <view class="history-list">
        <view class="history-group card" wx:for="{{history}}" wx:key="timestamp" wx:for-index="groupIdx">
          <view class="history-header">
            <view class="type-tag {{item.type}}">{{item.type === 'math' ? '数学' : '作文'}}</view>
            <text class="history-time">{{item.timestamp}}</text>
          </view>
          <view class="history-tips">
            <view class="history-tip" wx:for="{{item.tips}}" wx:key="id" wx:for-item="tip" wx:for-index="tipIdx">
              <text class="tip-num">{{tipIdx + 1}}.</text>
              <text class="tip-content">{{tip.text}}</text>
              <view class="tip-fav-btn" data-id="{{tip.id}}" data-text="{{tip.text}}" data-type="{{item.type}}" bindtap="onFavFromHistory">☆</view>
            </view>
          </view>
          <view class="history-actions">
            <view class="fav-btn" data-index="{{groupIdx}}" bindtap="onCopyHistory">📋 复制全部</view>
          </view>
        </view>
      </view>
    </block>
  </view>

  <!-- About Section -->
  <view class="about-section">
    <view class="about-line">桔光小语让陪伴更温和，让思考自然发生</view>
    <view class="about-sub">一款面向家长的亲子沟通话术小工具</view>
    <view class="about-link" bindtap="onShowCompliance">查看引导说明</view>
    <view class="about-version">v{{version}}</view>
  </view>

  <compliance-modal visible="{{showCompliance}}" bind:close="onCloseCompliance" />
  <toast id="toast" />
</view>
```

- [ ] **Step 4: Create mine.wxss**

```css
.mine-page {
  display: flex;
  flex-direction: column;
}

/* Segment */
.segment {
  display: flex;
  background: var(--color-white);
  border-radius: var(--radius-card);
  overflow: hidden;
  margin-bottom: 32rpx;
  box-shadow: var(--shadow-card);
}

.segment-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.segment-item.active {
  color: var(--color-white);
  background: var(--color-primary);
  font-weight: 600;
}

/* Favorites */
.fav-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.fav-item {
  padding: 28rpx;
}

.fav-top {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.type-tag {
  flex-shrink: 0;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  margin-right: 16rpx;
  font-weight: 500;
}

.type-tag.math {
  background: #FFF3E6;
  color: #FF8C42;
}

.type-tag.writing {
  background: #E8F5E9;
  color: #4CAF50;
}

.fav-text {
  font-size: 28rpx;
  color: var(--color-text);
  line-height: 1.8;
}

.fav-actions {
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
}

.fav-btn {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  padding: 8rpx 16rpx;
}

.fav-btn:active {
  opacity: 0.6;
}

.fav-btn.danger {
  color: #E57373;
}

/* History */
.clear-bar {
  text-align: right;
  margin-bottom: 16rpx;
  padding-right: 8rpx;
}

.clear-bar text {
  font-size: 24rpx;
  color: #E57373;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.history-group {
  padding: 28rpx;
}

.history-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.history-time {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-left: 12rpx;
}

.history-tips {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.history-tip {
  display: flex;
  align-items: flex-start;
}

.tip-num {
  font-size: 26rpx;
  color: var(--color-primary);
  font-weight: 600;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.tip-content {
  font-size: 26rpx;
  color: var(--color-text);
  line-height: 1.8;
  flex: 1;
}

.tip-fav-btn {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  font-size: 28rpx;
}

.history-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 30rpx;
  color: var(--color-text);
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

/* About */
.about-section {
  margin-top: 60rpx;
  text-align: center;
  padding-bottom: 40rpx;
}

.about-line {
  font-size: 26rpx;
  color: var(--color-text);
  margin-bottom: 8rpx;
}

.about-sub {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-bottom: 20rpx;
}

.about-link {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  text-decoration: underline;
  margin-bottom: 12rpx;
  display: inline-block;
}

.about-version {
  font-size: 22rpx;
  color: #ccc;
}
```

- [ ] **Step 5: Fix version data binding in mine.js**

Add version to `data` in mine.js:

```javascript
const config = require('../../utils/config')
// ... at the top of data:
data: {
  currentTab: 0,
  favorites: [],
  history: [],
  showCompliance: false,
  version: config.VERSION
},
```

- [ ] **Step 6: Format history timestamps**

Add a timestamp formatter in mine.js (inside the `_loadData` method):

```javascript
_loadData() {
  const favorites = storage.getFavorites()
  const history = storage.getHistory().map(item => ({
    ...item,
    timestamp: this._formatTime(item.timestamp)
  }))
  this.setData({ favorites, history })
},

_formatTime(ts) {
  const d = new Date(ts)
  const M = d.getMonth() + 1
  const D = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${M}/${D} ${h}:${m}`
}
```

- [ ] **Step 7: Verify in DevTools**

- Switch to "我的" tab → segment shows "我的收藏" and "话术历史"
- Empty states display correctly
- About section and version show at bottom
- "查看引导说明" opens compliance modal

- [ ] **Step 8: Commit**

```bash
git add pages/mine && git commit -m "feat: add mine page with favorites, history, and about section"
```

---

### Task 9: Cloud Function — generateGuide

**Files:**
- Create: `cloudfunctions/generateGuide/index.js`
- Create: `cloudfunctions/generateGuide/config.js`
- Create: `cloudfunctions/generateGuide/package.json`

- [ ] **Step 1: Create `cloudfunctions/generateGuide/package.json`**

```json
{
  "name": "generateGuide",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "axios": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `cloudfunctions/generateGuide/config.js`**

```javascript
module.exports = {
  DASHSCOPE_API_KEY: '',
  DASHSCOPE_URL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  MODEL: 'qwen-turbo',
  MAX_TOKENS: 200,
  TEMPERATURE: 0.9,
  TOP_P: 0.9,

  PROMPTS: {
    math: '你是温柔的亲子陪伴顾问「桔光小语」。用户是家长，孩子遇到数学题不会做。请只输出 3 条温和的提问话术，引导孩子自己思考。\n规则：\n绝对不给答案、不列算式、不讲知识点\n只用提问，语气耐心口语化\n每条一句话，不要多余解释\n请用以下格式输出：\n1. xxx\n2. xxx\n3. xxx',
    writing: '你是亲子陪伴顾问「桔光小语」。家长想引导孩子开口说作文内容。请只输出 3 条提问话术，帮助孩子自己表达。\n规则：\n不代写、不造句、不给范文\n语气亲切，家长可直接对孩子说\n每条一句话，不额外解释\n请用以下格式输出：\n1. xxx\n2. xxx\n3. xxx'
  }
}
```

- [ ] **Step 3: Create `cloudfunctions/generateGuide/index.js`**

```javascript
const cloud = require('wx-server-sdk')
const axios = require('axios')
const config = require('./config')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const rateLimitMap = new Map()

exports.main = async (event, context) => {
  const { type } = event
  const { OPENID } = cloud.getWXContext()

  if (!type || !['math', 'writing'].includes(type)) {
    return { success: false, error: '参数错误' }
  }

  const now = Date.now()
  const lastTime = rateLimitMap.get(OPENID) || 0
  if (now - lastTime < 5000) {
    return { success: false, error: '请求过于频繁，请稍后再试' }
  }
  rateLimitMap.set(OPENID, now)

  if (rateLimitMap.size > 10000) {
    const entries = [...rateLimitMap.entries()]
    entries.sort((a, b) => a[1] - b[1])
    entries.slice(0, 5000).forEach(([k]) => rateLimitMap.delete(k))
  }

  const prompt = config.PROMPTS[type]

  try {
    const response = await axios.post(
      config.DASHSCOPE_URL,
      {
        model: config.MODEL,
        input: {
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: type === 'math' ? '孩子数学题不会做，我该怎么引导？' : '孩子写作文不知道写什么，我该怎么引导？' }
          ]
        },
        parameters: {
          max_tokens: config.MAX_TOKENS,
          temperature: config.TEMPERATURE,
          top_p: config.TOP_P,
          result_format: 'message'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    const content = response.data.output.choices[0].message.content
    const tips = parseTips(content, now)

    if (tips.length === 0) {
      return { success: false, error: '解析失败，请重试' }
    }

    return {
      success: true,
      data: { type, tips }
    }
  } catch (err) {
    console.error('AI request failed:', err.message)
    if (err.code === 'ECONNABORTED') {
      return { success: false, error: '请求超时，请稍后再试' }
    }
    return { success: false, error: '服务暂时不可用，请稍后再试' }
  }
}

function parseTips(content, timestamp) {
  const lines = content.split('\n').filter(line => line.trim())
  const tips = []

  for (const line of lines) {
    const match = line.match(/^\d+[\.\、\)）]\s*(.+)/)
    if (match) {
      tips.push({
        id: `${timestamp}_${tips.length}`,
        text: match[1].trim()
      })
    }
  }

  if (tips.length === 0) {
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 5)
    sentences.slice(0, 3).forEach((s, i) => {
      tips.push({
        id: `${timestamp}_${i}`,
        text: s.trim()
      })
    })
  }

  return tips.slice(0, 3)
}
```

- [ ] **Step 4: Install cloud function dependencies locally**

```bash
cd /Users/jerry/Documents/zdx_wx/cloudfunctions/generateGuide && npm install
```

- [ ] **Step 5: Verify structure**

```bash
ls -la /Users/jerry/Documents/zdx_wx/cloudfunctions/generateGuide/
# Should show: index.js, config.js, package.json, node_modules/
```

- [ ] **Step 6: Commit** (ignore node_modules via .gitignore)

```bash
cd /Users/jerry/Documents/zdx_wx
echo "cloudfunctions/*/node_modules/" >> .gitignore
git add cloudfunctions/generateGuide .gitignore && git commit -m "feat: add generateGuide cloud function with DashScope integration"
```

---

### Task 10: Final integration & polish

**Files:**
- Modify: `app.js` (ensure cloud init works)
- Create: `.gitignore` (ensure comprehensive)
- Verify: all pages render, tab switching works, components wire up

- [ ] **Step 1: Create comprehensive `.gitignore`**

```
node_modules/
cloudfunctions/*/node_modules/
.DS_Store
*.swp
*.swo
miniprogram_npm/
```

- [ ] **Step 2: End-to-end verification checklist**

Open WeChat DevTools and verify:

1. **App launches** → Home page loads, compliance modal shows on first launch
2. **Home page** → 4 feature cards render, slogan visible, tab bar shows "首页" active
3. **Tab: 数学引导** → Loading skeleton → (error state if cloud not deployed) → compliance modal on first visit
4. **Tab: 作文引导** → Same behavior, independent from math page
5. **Tab: 我的** → Segment switch works, empty states show, about section renders, version displays
6. **Home → 我的收藏** → Navigates to mine page with "我的收藏" tab active
7. **Home → 话术历史** → Navigates to mine page with "话术历史" tab active
8. **Compliance modal** → Can be opened from guide pages and mine page "查看引导说明"

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "feat: complete 桔光小语 mini program v1.0.0"
```

---

## Deployment Notes

After all code is committed:

1. **Deploy cloud function**: In WeChat DevTools → right-click `cloudfunctions/generateGuide` → "上传并部署：云端安装依赖"
2. **Fill API Key**: Edit cloud function's `config.js` in the cloud console, fill `DASHSCOPE_API_KEY`
3. **Replace TabBar icons**: Replace 8 placeholder PNGs in `images/tabbar/` with actual 81×81px warm-orange-themed icons
4. **Test AI flow**: After cloud deployment, test "换一组" on both guide pages
5. **Submit for review**: Ensure compliance modal text matches, no educational content present
