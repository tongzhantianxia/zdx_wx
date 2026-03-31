// 云函数：生成数学练习题
// 调用 DeepSeek API 根据知识点生成题目

const fetch = require('node-fetch');

// DeepSeek API 配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const TIMEOUT_MS = 30000; // 30秒超时

/**
 * 构建 Prompt
 * @param {object} params 入参
 * @returns {string} Prompt 字符串
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

  const prompt = `你是一位资深的小学数学教师，擅长为${grade}学生设计数学练习题。

请根据以下要求生成${count}道数学练习题：

【知识点】${knowledgeName}（ID: ${knowledgeId}）
【年级】${grade}
【难度】${difficultyText}
【题型】${questionTypeText}

## 出题要求：

1. **题目准确性**：
   - 题目必须严格符合"${knowledgeName}"这个知识点
   - 数值计算必须准确无误
   - 答案必须是唯一的、确定的数值

2. **难度控制**：
   - 简单：使用较小的数值，直接套用公式
   - 中等：使用中等数值，需要理解概念
   - 困难：使用较大数值或需要多步思考

3. **题型要求**：
   - 计算题：给出算式，要求计算结果
   - 填空题：给出不完整的题目，填写空白处
   - 应用题：结合生活场景，需要理解题意后计算

4. **解答过程**：
   - 必须提供详细的解题步骤
   - 每一步都要说明理由
   - 对于计算题，要展示完整的计算过程

5. **提示语**：
   - 提供解题思路或易错点提示
   - 帮助学生理解知识点

## 输出格式（必须是严格的JSON）：

{
  "questions": [
    {
      "id": 1,
      "type": "计算题",
      "content": "题目内容",
      "answer": "答案",
      "solution": "详细解答过程",
      "tip": "解题提示",
      "difficulty": "中等"
    }
  ]
}

请直接输出JSON，不要添加任何其他文字或说明。`;

  return prompt;
};

/**
 * 调用 DeepSeek API
 * @param {string} prompt Prompt 字符串
 * @param {string} apiKey API Key
 * @returns {Promise<object>} API 响应
 */
const callDeepSeekAPI = async (prompt, apiKey) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  console.log('[generateQuestions] 开始调用 DeepSeek API');
  console.log('[generateQuestions] Prompt 长度:', prompt.length);

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
            content: '你是一位专业的小学数学出题专家。请严格按照用户要求的格式输出JSON，不要添加任何其他内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generateQuestions] API 请求失败:', response.status, errorText);
      throw new Error(`DeepSeek API 请求失败: ${response.status} - ${errorText}`);
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
      console.error('[generateQuestions] API 响应格式错误:', JSON.stringify(apiResponse));
      throw new Error('API 响应格式错误：缺少 content 字段');
    }

    console.log('[generateQuestions] API 返回内容长度:', content.length);
    console.log('[generateQuestions] API 返回内容预览:', content.substring(0, 200));

    // 尝试提取 JSON
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
      console.error('[generateQuestions] JSON 格式错误: 缺少 questions 数组');
      throw new Error('返回的 JSON 格式错误：缺少 questions 数组');
    }

    // 验证每个题目的必要字段
    const questions = parsed.questions.map((q, index) => {
      if (!q.content || !q.answer) {
        console.warn(`[generateQuestions] 题目 ${index + 1} 缺少必要字段，已补充默认值`);
      }

      return {
        id: q.id || index + 1,
        type: q.type || '计算题',
        content: q.content || '',
        answer: q.answer || '',
        solution: q.solution || '',
        tip: q.tip || '',
        difficulty: q.difficulty || '中等'
      };
    });

    console.log('[generateQuestions] 解析成功，共', questions.length, '道题目');

    return { questions };
  } catch (error) {
    console.error('[generateQuestions] 解析失败:', error.message);

    // 尝试更宽松的解析
    try {
      // 尝试查找 JSON 对象
      const jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          console.log('[generateQuestions] 宽松解析成功');
          return { questions: parsed.questions };
        }
      }
    } catch (e) {
      console.error('[generateQuestions] 宽松解析也失败:', e.message);
    }

    throw new Error(`解析 AI 返回内容失败: ${error.message}`);
  }
};

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const { knowledgeId, knowledgeName, grade, count, difficulty, questionType } = event;

  console.log('[generateQuestions] 收到请求:', JSON.stringify(event));

  // 参数验证
  if (!knowledgeId || !knowledgeName) {
    return {
      success: false,
      error: '缺少必要参数：knowledgeId 或 knowledgeName'
    };
  }

  if (!count || count < 1 || count > 20) {
    return {
      success: false,
      error: '题目数量必须在 1-20 之间'
    };
  }

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
    // 构建 Prompt
    const prompt = buildPrompt({
      knowledgeId,
      knowledgeName,
      grade: grade || '五年级',
      count: Math.min(count, 10), // 限制最大数量
      difficulty: difficulty || 'medium',
      questionType: questionType || 'calculation'
    });

    // 调用 API
    const apiResponse = await callDeepSeekAPI(prompt, apiKey);

    // 解析结果
    const result = parseAPIResponse(apiResponse);

    console.log('[generateQuestions] 生成成功');

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
