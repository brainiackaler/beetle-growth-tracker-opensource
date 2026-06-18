/**
 * 智能中文语音解析器
 * 自动从文本中提取体重、体长、温度、湿度及生命阶段
 */
export function parseVoiceText(text) {
  const result = {};

  if (!text) return result;

  // 1. 解析体重 (支持: "体重45.2克", "体重 45.2", "45.2克", "45.2g")
  const weightMatch = 
    text.match(/(?:体重|重)\s*(\d+(?:\.\d+)?)/) || 
    text.match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i);
  if (weightMatch) {
    result.weight = weightMatch[1];
  }

  // 2. 解析体长 (支持: "体长82.3毫米", "长 82.3", "82.3毫米", "82.3mm")
  const lengthMatch = 
    text.match(/(?:体长|长|长度)\s*(\d+(?:\.\d+)?)/) || 
    text.match(/(\d+(?:\.\d+)?)\s*(?:mm|毫米)/i);
  if (lengthMatch) {
    result.length = lengthMatch[1];
  }

  // 3. 解析饲养温度 (支持: "温度24.5", "温 24.5", "24.5度", "24.5℃")
  const tempMatch = 
    text.match(/(?:温度|室温|温)\s*(\d+(?:\.\d+)?)/) || 
    text.match(/(\d+(?:\.\d+)?)\s*(?:℃|度|摄氏度)/);
  if (tempMatch) {
    result.temperature = tempMatch[1];
  }

  // 4. 解析湿度 (支持: "湿度65", "湿 65", "65%", "百分之65")
  const humidityMatch = 
    text.match(/(?:湿度|湿)\s*(\d+(?:\.\d+)?)/) || 
    text.match(/(\d+(?:\.\d+)?)\s*(?:%|百分之)/) ||
    text.match(/百分之\s*(\d+(?:\.\d+)?)/);
  if (humidityMatch) {
    result.humidity = humidityMatch[1] || humidityMatch[2];
  }

  // 5. 解析生命阶段
  if (text.includes('卵')) {
    result.stage = '卵';
  } else if (text.includes('一龄')) {
    result.stage = '一龄幼虫';
  } else if (text.includes('二龄')) {
    result.stage = '二龄幼虫';
  } else if (text.includes('三龄')) {
    result.stage = '三龄幼虫';
  } else if (text.includes('蛹')) {
    result.stage = '蛹';
  } else if (text.includes('成虫')) {
    result.stage = '成虫';
  } else if (text.includes('其他')) {
    result.stage = '其他';
  }

  return result;
}
