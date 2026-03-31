# 小程序安全配置指南

## 一、DeepSeek API Key 安全存储

### 1. 为什么不能放在前端代码？

❌ **错误做法**：直接写在代码里
```javascript
const API_KEY = 'sk-xxx'; // 危险！会被反编译看到
```

✅ **正确做法**：使用云函数环境变量
- 前端代码无法访问环境变量
- 只有云函数运行时才能读取
- 安全性高，方便管理

### 2. 如何配置云函数环境变量

#### 方法一：微信开发者工具配置

1. 打开微信开发者工具
2. 点击顶部「云开发」按钮
3. 进入云开发控制台
4. 点击左侧「云函数」
5. 找到 `generateQuestions` 函数，点击函数名
6. 点击顶部「配置」标签
7. 找到「环境变量」区域
8. 点击「添加变量」
9. 填写：
   - 变量名：`DEEPSEEK_API_KEY`
   - 变量值：`sk-b9fc3a8a2d594ff9b2a683984bf1ae24`
10. 点击「保存」

#### 方法二：使用云开发 CLI（高级）

```bash
# 安装 cloudbase cli
npm install -g @cloudbase/cli

# 登录
tcb login

# 设置环境变量
tcb fn code update generateQuestions --env DEEPSEEK_API_KEY=sk-xxx
```

---

## 二、云函数权限配置

### 1. 云函数调用权限

在 `generateQuestions` 云函数中验证用户身份：

```javascript
// 获取用户 openid
const wxContext = cloud.getWXContext();
const openid = wxContext.OPENID;

if (!openid) {
  return {
    success: false,
    error: '请先登录'
  };
}
```

### 2. 数据库权限规则

在云开发控制台配置：

1. 进入「数据库」
2. 选择集合（如 `practice_records`）
3. 点击「权限设置」
4. 选择「自定义安全规则」
5. 配置 JSON 规则：

```json
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid"
}
```

**规则说明**：
- 用户只能读写自己的数据
- `auth.openid` 是当前用户的 openid
- `doc._openid` 是数据记录中的 openid

---

## 三、接口频率限制

### 实现方案

在云函数中使用缓存记录用户调用时间：

```javascript
// 简单的内存缓存（注意：云函数实例重启会丢失）
const callCache = new Map();

// 检查频率限制
const checkRateLimit = (openid) => {
  const now = Date.now();
  const lastCall = callCache.get(openid);

  if (lastCall && now - lastCall < 10000) {
    const waitTime = Math.ceil((10000 - (now - lastCall)) / 1000);
    return {
      allowed: false,
      waitTime
    };
  }

  callCache.set(openid, now);
  return { allowed: true };
};
```

### 前端配合

在 `index.js` 中禁用按钮防止重复点击：

```javascript
handleGenerate: async function() {
  if (this.data.generating) return; // 防止重复点击

  this.setData({ generating: true });

  try {
    // 调用云函数...
  } finally {
    // 延迟解锁，配合后端频率限制
    setTimeout(() => {
      this.setData({ generating: false });
    }, 10000);
  }
}
```

---

## 四、请求合法性校验

### 参数校验清单

| 参数 | 校验规则 |
|------|---------|
| knowledgeName | 必填，非空字符串 |
| knowledgeId | 必填，格式为 `upper-x-y` 或 `lower-x-y` |
| count | 1-10 之间的整数 |
| difficulty | 枚举值：`easy`/`medium`/`hard` |
| questionType | 枚举值：`calculation`/`fillBlank`/`application` |

### 知识点白名单

从 `knowledgeData.js` 中提取所有合法的 knowledgeId：

```javascript
const validKnowledgeIds = [
  // 上册
  'upper-1-1', 'upper-1-2', 'upper-1-3', 'upper-1-4',
  'upper-2-1',
  'upper-3-1', 'upper-3-2', 'upper-3-3', 'upper-3-4',
  // ... 其他知识点
];
```

---

## 五、完整的安全配置代码

见下方 `security.js` 文件。

