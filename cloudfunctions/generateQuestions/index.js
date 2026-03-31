// 云函数：生成数学练习题
// 调用 DeepSeek API 根据知识点生成题目

const fetch = require('node-fetch');

// DeepSeek API 配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const TIMEOUT_MS = 30000; // 30秒超时

/**
 * System Prompt - 定义AI角色和出题规范
 */
const SYSTEM_PROMPT = `你是由人民教育出版社认证的小学数学教材研究专家，拥有20年一线教学经验。你的任务是为人教版小学数学教材生成高质量的练习题。

## 核心原则

1. 【准确性第一】每道题必须经过自验证，确保答案正确无误
2. 【教材对标】严格遵循人教版教材的知识点定义和难度梯度
3. 【唯一答案】所有题目必须有且仅有一个确定答案，杜绝歧义

## 五年级数值规范

| 运算类型 | 数值范围 | 特殊要求 |
|---------|---------|---------|
| 小数运算 | 0.01 ~ 99.99 | 最多保留两位小数 |
| 整数运算 | 1 ~ 1000 | 避免过大数值 |
| 除法运算 | 商为整数或两位小数 | 优先设计能整除的题目 |
| 分数运算 | 分母 2~12 | 约分后为最简分数 |

## 难度分级标准

- **简单**：直接套用公式，一步完成，数值简单（如 0.5, 2, 10）
- **中等**：需要理解概念，可能涉及两步，数值适中（如 3.6, 25, 0.75）
- **困难**：综合运用知识，多步计算，数值较大或需要转换

## 题型规范

- **计算题**：给出完整算式，学生计算结果
- **填空题**：给出带空格的题目，填入答案
- **应用题**：结合生活情境，需要列式计算

## 输出规范

你必须且只能输出纯JSON格式，不要添加任何解释、说明或markdown标记。输出前请逐一验证：
1. 每道题的答案是否正确（必须亲自计算验证）
2. 答案是否唯一确定
3. 数值是否符合五年级范围
4. 是否符合指定知识点`;

/**
 * 构建 User Prompt
 * @param {object} params 入参
 * @returns {object} system 和 user 内容
 */
const buildPrompt = (params) => {
  const { knowledgeId, knowledgeName, grade, count, difficulty, questionType } = params;

  // 难度映射
  const difficultyMap = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  };
  const difficultyText = difficultyMap[difficulty] || '中等';

  // 题型映射
  const questionTypeMap = {
    'calculation': '计算题',
    'fillBlank': '填空题',
    'application': '应用题'
  };
  const questionTypeText = questionTypeMap[questionType] || '计算题';

  // 难度对应的数值范围提示
  const difficultyHint = {
    'easy': '数值范围：整数1-20，小数0.1-10（一位小数），优先使用简单整数',
    'medium': '数值范围：整数10-100，小数0.01-50（最多两位小数），适当增加复杂度',
    'hard': '数值范围：整数50-500，小数0.01-100，可涉及多步计算或数值转换'
  };

  const userPrompt = `请为五年级学生生成 ${count} 道"${knowledgeName}"练习题。

## 本次出题要求

| 项目 | 要求 |
|------|------|
| 知识点 | ${knowledgeName} |
| 年级 | ${grade} |
| 题型 | ${questionTypeText} |
| 难度 | ${difficultyText} |
| 数量 | ${count}道 |
| ${difficultyHint[difficulty] || ''} |

## 知识点范围说明

请确保每道题都严格围绕"${knowledgeName}"这个知识点：
- 题目内容必须直接考察该知识点
- 不要超纲或涉及未学内容
- 题目之间要有变化，避免重复模式

## 自验证要求（重要！）

在输出每道题之前，你必须：
1. **亲自计算**该题的答案，确保计算过程和结果正确
2. **检查答案唯一性**，确保没有歧义
3. **验证数值范围**，确保符合五年级要求

## 输出格式（严格JSON）

请直接输出以下JSON格式，不要添加任何其他内容：

{
  "questions": [
    {
      "id": 1,
      "type": "${questionTypeText}",
      "content": "题目内容（如果是填空题，用___表示空格）",
      "answer": "答案（纯数字或最简分数，如 8 或 1/2）",
      "solution": "解答过程（详细步骤，每步换行）",
      "tip": "解题提示（指出关键点或易错点）",
      "difficulty": "${difficultyText}"
    }
  ]
}

现在请生成 ${count} 道高质量的${questionTypeText}，直接输出JSON：`;

  return userPrompt;
};

/**
 * 调用 DeepSeek API
 * @param {string} userPrompt User Prompt
 * @param {string} apiKey API Key
 * @returns {Promise<object>} API 响应
 */
const callDeepSeekAPI = async (userPrompt, apiKey) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  console.log('[generateQuestions] 开始调用 DeepSeek API');
  console.log('[generateQuestions] User Prompt 长度:', userPrompt.length);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3, // 降低温度，提高准确性
        max_tokens: 3000,
        top_p: 0.9
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generateQuestions] API 请求失败:', response.status, errorText);
      throw new Error(`DeepSeek API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('[generateQuestions] API 响应成功');

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error('[generateQuestions] API 请求超时');
      throw new Error('API 请求超时，请稍后重试');
    }

    console.error('[generateQuestions] API 调用异常:', error.message);
    throw error;
  }
};

/**
 * 解析 DeepSeek 返回的内容
 * @param {object} apiResponse API 响应
 * @returns {object} 解析后的题目数据
 */
const parseAPIResponse = (apiResponse) => {
  console.log('[generateQuestions] 开始解析 API 响应');

  try {
    // 获取返回内容
    const content = apiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[generateQuestions] API 响应格式错误');
      throw new Error('API 响应格式错误：缺少 content 字段');
    }

    console.log('[generateQuestions] API 返回内容长度:', content.length);
    console.log('[generateQuestions] API 返回内容预览:', content.substring(0, 300));

    // 清理内容
    let jsonStr = content.trim();

    // 移除可能的 markdown 代码块标记
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    // 解析 JSON
    const parsed = JSON.parse(jsonStr);

    // 验证格式
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('返回的 JSON 格式错误：缺少 questions 数组');
    }

    // 标准化每个题目的字段
    const questions = parsed.questions.map((q, index) => {
      // 清理答案格式
      let answer = String(q.answer || '').trim();
      // 移除答案中的单位（如果有）
      answer = answer.replace(/[单位：:].*/g, '').trim();

      return {
        id: index + 1,
        type: q.type || '计算题',
        content: String(q.content || '').trim(),
        answer: answer,
        solution: String(q.solution || '').trim(),
        tip: String(q.tip || '').trim(),
        difficulty: q.difficulty || '中等'
      };
    });

    // 验证题目完整性
    const validQuestions = questions.filter(q => {
      if (!q.content || !q.answer) {
        console.warn('[generateQuestions] 过滤不完整题目:', q);
        return false;
      }
      return true;
    });

    if (validQuestions.length === 0) {
      throw new Error('没有有效的题目');
    }

    console.log('[generateQuestions] 解析成功，共', validQuestions.length, '道有效题目');

    return { questions: validQuestions };
  } catch (error) {
    console.error('[generateQuestions] 解析失败:', error.message);

    // 尝试更宽松的解析
    try {
      const content = apiResponse.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*?"questions"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          console.log('[generateQuestions] 宽松解析成功');
          return { questions: parsed.questions };
        }
      }
    } catch (e) {
      console.error('[generateQuestions] 宽松解析失败:', e.message);
    }

    throw new Error(`解析 AI 返回内容失败: ${error.message}`);
  }
};

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const { knowledgeId, knowledgeName, grade, count, difficulty, questionType } = event;

  console.log('[generateQuestions] 收到请求:', JSON.stringify({
    knowledgeId,
    knowledgeName,
    grade,
    count,
    difficulty,
    questionType
  }));

  // 参数验证
  if (!knowledgeName) {
    return {
      success: false,
      error: '缺少必要参数：knowledgeName'
    };
  }

  const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 10);

  // 获取 API Key
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error('[generateQuestions] 未配置 DEEPSEEK_API_KEY');
    return {
      success: false,
      error: '服务配置错误：未配置 API Key'
    };
  }

  try {
    // 构建 User Prompt
    const userPrompt = buildPrompt({
      knowledgeId: knowledgeId || 'unknown',
      knowledgeName,
      grade: grade || '五年级',
      count: questionCount,
      difficulty: difficulty || 'medium',
      questionType: questionType || 'calculation'
    });

    // 调用 API
    const apiResponse = await callDeepSeekAPI(userPrompt, apiKey);

    // 解析结果
    const result = parseAPIResponse(apiResponse);

    console.log('[generateQuestions] 生成成功，返回', result.questions.length, '道题目');

    return {
      success: true,
      questions: result.questions,
      meta: {
        knowledgeId,
        knowledgeName,
        grade,
        difficulty,
        questionType,
        count: result.questions.length,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[generateQuestions] 生成失败:', error);

    return {
      success: false,
      error: error.message || '生成题目失败',
      details: {
        knowledgeId,
        knowledgeName,
        timestamp: new Date().toISOString()
      }
    };
  }
};
