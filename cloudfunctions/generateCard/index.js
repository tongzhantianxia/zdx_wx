const cloud = require('wx-server-sdk')
const axios = require('axios')
const config = require('./config')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const RATE_LIMIT_MS = 5000
const lastCallMap = {}

const SYSTEM_PROMPT = `你是一个亲子陪伴脚本作者，名叫"把我讲给孩子听"。
请根据用户提供的信息，生成一张今晚可以直接使用的亲子陪伴卡。

输出要求：
- 必须输出纯 JSON，不要包含 markdown 代码块标记
- JSON 结构如下：
{
  "title": "标题",
  "scene": "使用场景",
  "opening": "30秒开场白",
  "story1Min": "1分钟讲述版",
  "questions": ["问题1", "问题2", "问题3"],
  "responseAdvice": "孩子可能回答后的接法",
  "noPreachReminder": "不说教提醒",
  "smallAction": "今日小行动"
}

写作规则：
- 不要写成作文
- 不要说教，不要说"你现在多幸福"
- 不要用沉重苦难叙事
- 像父母在真实地和孩子说话
- 语言温暖自然
- 输出必须可直接使用
- 结尾要引导对话，不是给结论`

function buildUserMessage(event) {
  const { type, topic, age, narrator, memory, problem, tone, member, experience, task } = event

  switch (type) {
    case 'bedtime':
      return `场景：随时聊 3 分钟
话题：${topic}
孩子年龄：${age}
讲述者：${narrator}
${memory ? '家长补充的真实回忆：' + memory : ''}
请生成一张睡前/随时陪伴卡。`

    case 'problem':
      return `场景：孩子遇到问题
孩子的问题：${problem}
沟通语气：${tone}
请生成一张不说教的亲子沟通脚本卡。开场白要包含一个家长自己小时候类似的经历。`

    case 'family':
      return `场景：讲家人的小时候
讲述者：${member}
经历类型：${experience}
${memory ? '家长补充的细节：' + memory : ''}
请生成一张家人故事陪伴卡，让孩子通过故事了解${member}的过去。`

    case 'homework':
      return `场景：亲子作业帮忙
作业类型：${task}
请生成一张亲子作业辅助包，包含采访问题、故事素材和作文灵感。`

    default:
      throw new Error(`未知的卡片类型: ${type}`)
  }
}

function parseAIResponse(content) {
  let text = content.trim()
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim()
  }
  return JSON.parse(text)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  if (!config.API_KEY) {
    return { success: false, error: 'API 密钥未配置，请联系管理员' }
  }

  const now = Date.now()
  if (lastCallMap[OPENID] && now - lastCallMap[OPENID] < RATE_LIMIT_MS) {
    return { success: false, error: '请求过于频繁，请稍后再试' }
  }
  lastCallMap[OPENID] = now

  if (!event.type) {
    return { success: false, error: '缺少必要参数: type' }
  }

  let userMessage
  try {
    userMessage = buildUserMessage(event)
  } catch (e) {
    return { success: false, error: e.message }
  }

  try {
    const response = await axios.post(
      config.API_URL,
      {
        model: config.MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        max_tokens: config.MAX_TOKENS,
        temperature: config.TEMPERATURE,
        top_p: config.TOP_P
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.API_KEY}`
        },
        timeout: 30000
      }
    )

    const aiContent = response.data.choices[0].message.content
    let cardData

    try {
      cardData = parseAIResponse(aiContent)
    } catch (parseErr) {
      console.error('JSON 解析失败:', aiContent)
      return {
        success: false,
        error: 'AI 返回内容格式异常，请重试'
      }
    }

    return {
      success: true,
      data: {
        id: `${OPENID}_${Date.now()}`,
        ...cardData,
        createdAt: Date.now()
      }
    }
  } catch (err) {
    console.error('generateCard error:', err)

    if (err.code === 'ECONNABORTED') {
      return { success: false, error: '请求超时，请稍后再试' }
    }

    if (err.response) {
      const status = err.response.status
      if (status === 401) {
        return { success: false, error: 'API 认证失败，请联系管理员' }
      }
      if (status === 429) {
        return { success: false, error: 'AI 服务繁忙，请稍后再试' }
      }
      if (status >= 500) {
        return { success: false, error: 'AI 服务暂时不可用，请稍后再试' }
      }
      return { success: false, error: `服务异常(${status})，请稍后再试` }
    }

    return { success: false, error: '网络异常，请检查网络后重试' }
  }
}
