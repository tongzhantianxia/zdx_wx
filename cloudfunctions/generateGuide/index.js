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

  if (!config.API_KEY) {
    return { success: false, error: '未配置 API Key，请在云函数 config.js 中填入' }
  }

  const prompt = config.PROMPTS[type]

  try {
    const response = await axios.post(
      config.API_URL,
      {
        model: config.MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: type === 'math' ? '孩子数学题不会做，我该怎么引导？' : '孩子写作文不知道写什么，我该怎么引导？' }
        ],
        max_tokens: config.MAX_TOKENS,
        temperature: config.TEMPERATURE,
        top_p: config.TOP_P
      },
      {
        headers: {
          'Authorization': `Bearer ${config.API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    const content = response.data.choices[0].message.content
    const tips = parseTips(content, now)

    if (tips.length === 0) {
      return { success: false, error: '解析失败，请重试' }
    }

    return {
      success: true,
      data: { type, tips }
    }
  } catch (err) {
    const status = err.response && err.response.status
    const detail = err.response && err.response.data
    console.error('AI request failed:', err.message, 'status:', status, 'detail:', JSON.stringify(detail))

    if (err.code === 'ECONNABORTED') {
      return { success: false, error: '请求超时，请稍后再试' }
    }
    if (status === 401) {
      return { success: false, error: 'API Key 无效，请检查配置' }
    }
    if (status === 402) {
      return { success: false, error: 'API 余额不足' }
    }
    if (status === 429) {
      return { success: false, error: '请求过于频繁，请稍后再试' }
    }
    const errMsg = (detail && detail.error && detail.error.message) || '服务暂时不可用，请稍后再试'
    return { success: false, error: errMsg }
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
