# 小学数学错题练习小程序

## 环境配置

### 云开发环境ID
```
cloud1-0gfe5z1qae319fb6
```

### DeepSeek API Key
```
sk-b9fc3a8a2d594ff9b2a683984bf1ae24
```

## 部署步骤

### 1. 配置云函数环境变量

在云开发控制台配置以下环境变量：

**云函数：generateQuestions**

| 变量名 | 变量值 |
|--------|--------|
| DEEPSEEK_API_KEY | sk-b9fc3a8a2d594ff9b2a683984bf1ae24 |

### 2. 部署云函数

1. 右键 `cloudfunctions/login` → 上传并部署：云端安装依赖
2. 右键 `cloudfunctions/generateQuestions` → 上传并部署：云端安装依赖

### 3. 创建数据库集合

在云开发控制台创建以下集合：

- `practice_records` - 练习记录
- `wrong_questions` - 错题记录
- `practice_sessions` - 练习会话

### 4. 测试运行

点击「编译」按钮测试小程序功能
