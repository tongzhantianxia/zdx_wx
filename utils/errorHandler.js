// utils/errorHandler.js

/**
 * 全局错误处理器
 */

// 错误类型映射
const ERROR_MESSAGES = {
  'NETWORK_ERROR': '网络连接失败，请检查网络设置',
  'TIMEOUT_ERROR': '请求超时，请稍后重试',
  'SERVER_ERROR': '服务器错误，请稍后重试',
  'RATE_LIMITED': '操作过于频繁，请稍后再试',
  'UNAUTHORIZED': '请先登录后再操作',
  'INVALID_PARAMS': '参数错误，请重新选择',
  'CONFIG_ERROR': '服务配置错误，请联系管理员',
  'GENERATE_ERROR': '生成失败，请重试',
  'UNKNOWN_ERROR': '发生未知错误，请重试'
};

/**
 * 处理云函数错误
 * @param {object} error 错误对象
 * @returns {string} 错误提示文本
 */
const handleCloudError = (error) => {
  console.error('[ErrorHandler] 云函数错误:', error);

  // 网络错误
  if (error.errMsg && error.errMsg.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // 超时错误
  if (error.errMsg && error.errMsg.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }

  // 云函数返回的错误
  if (error.result && error.result.error) {
    const code = error.result.code;
    if (ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }
    return error.result.error;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

/**
 * 显示错误提示
 * @param {string} message 错误信息
 * @param {object} options 选项
 */
const showError = (message, options = {}) => {
  const { title = '提示', duration = 2000 } = options;

  wx.showToast({
    title: message,
    icon: 'none',
    duration
  });
};

/**
 * 显示成功提示
 * @param {string} message 成功信息
 */
const showSuccess = (message) => {
  wx.showToast({
    title: message,
    icon: 'success',
    duration: 1500
  });
};

/**
 * 显示加载中
 * @param {string} title 加载提示文字
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载中
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示确认弹窗
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>} 用户是否确认
 */
const showConfirm = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

module.exports = {
  handleCloudError,
  showError,
  showSuccess,
  showLoading,
  hideLoading,
  showConfirm,
  ERROR_MESSAGES
};
