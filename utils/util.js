/**
 * 工具函数库
 */

/**
 * 格式化日期
 * @param {Date} date 日期对象
 * @param {string} format 格式字符串
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 生成随机整数
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 随机整数
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 生成数学题目
 * @param {string} type 题目类型
 * @param {number} difficulty 难度等级
 * @returns {object} 题目对象
 */
const generateQuestion = (type, difficulty = 1) => {
  let num1, num2, question, answer, hint;

  // 根据难度确定数字范围
  const ranges = {
    1: { min: 1, max: 10 },      // 简单：1-10
    2: { min: 10, max: 50 },     // 中等：10-50
    3: { min: 50, max: 100 }     // 困难：50-100
  };

  const range = ranges[difficulty] || ranges[1];

  switch (type) {
    case 'addition':
      num1 = randomInt(range.min, range.max);
      num2 = randomInt(range.min, range.max);
      question = `${num1} + ${num2} = ?`;
      answer = String(num1 + num2);
      hint = '试试从个位开始相加';
      break;

    case 'subtraction':
      num1 = randomInt(range.min, range.max);
      num2 = randomInt(range.min, num1);
      question = `${num1} - ${num2} = ?`;
      answer = String(num1 - num2);
      hint = '减法要注意借位';
      break;

    case 'multiplication':
      const mulMax = difficulty === 1 ? 9 : (difficulty === 2 ? 12 : 15);
      num1 = randomInt(1, mulMax);
      num2 = randomInt(1, mulMax);
      question = `${num1} × ${num2} = ?`;
      answer = String(num1 * num2);
      hint = '背一背乘法口诀表';
      break;

    case 'division':
      const divMax = difficulty === 1 ? 9 : (difficulty === 2 ? 12 : 15);
      num2 = randomInt(1, divMax);
      const result = randomInt(1, divMax);
      num1 = num2 * result;
      question = `${num1} ÷ ${num2} = ?`;
      answer = String(result);
      hint = '除法是乘法的逆运算';
      break;

    case 'mixed':
      // 混合运算：生成两步运算
      const ops = ['+', '-', '×'];
      const op1 = ops[randomInt(0, 2)];
      const op2 = ops[randomInt(0, 1)]; // 第二步不用乘法避免太复杂

      let a = randomInt(1, 20);
      let b = randomInt(1, 10);
      let c = randomInt(1, 10);

      if (op1 === '×') {
        b = randomInt(1, 9);
      }

      question = `${a} ${op1} ${b} ${op2} ${c} = ?`;

      // 计算答案（注意运算优先级）
      let tempResult;
      if (op1 === '×') {
        tempResult = a * b;
      } else if (op1 === '+') {
        tempResult = a + b;
      } else {
        tempResult = a - b;
      }

      if (op2 === '+') {
        answer = String(tempResult + c);
      } else {
        answer = String(tempResult - c);
      }

      hint = '注意运算优先级，先乘除后加减';
      break;

    default:
      return generateQuestion('addition', difficulty);
  }

  return {
    question,
    answer,
    type,
    hint,
    difficulty,
    inputType: 'number'
  };
};

/**
 * 防抖函数
 * @param {Function} fn 要防抖的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 防抖后的函数
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn 要节流的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 节流后的函数
 */
const throttle = (fn, delay = 300) => {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 深拷贝
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (obj instanceof Object) {
    const copy = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone(obj[key]);
    });
    return copy;
  }

  return obj;
};

/**
 * 显示加载提示
 * @param {string} title 提示文字
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示消息提示
 * @param {string} title 提示文字
 * @param {string} icon 图标类型
 */
const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon,
    duration: 2000
  });
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
  formatDate,
  randomInt,
  generateQuestion,
  debounce,
  throttle,
  deepClone,
  showLoading,
  hideLoading,
  showToast,
  showConfirm
};
