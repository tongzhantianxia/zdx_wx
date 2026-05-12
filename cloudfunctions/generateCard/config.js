module.exports = {
  API_KEY: process.env.API_KEY || '',
  API_URL: 'https://api.deepseek.com/chat/completions',
  MODEL: 'deepseek-chat',
  MAX_TOKENS: 1500,
  TEMPERATURE: 0.85,
  TOP_P: 0.9
}
