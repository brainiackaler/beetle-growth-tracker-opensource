const i18n = require('./utils/i18n')

App({
  onLaunch() {
    const languageState = i18n.initLanguage()
    this.globalData.languageMode = languageState.mode
    this.globalData.language = languageState.language
    this.globalData.token = wx.getStorageSync('beetle_token') || ''
  },

  setLanguageMode(mode) {
    const languageState = i18n.setLanguageMode(mode)
    this.globalData.languageMode = languageState.mode
    this.globalData.language = languageState.language
    return languageState
  },

  globalData: {
    apiBase: 'http://127.0.0.1:8088',
    passcode: '', // 可选：兼容使用 X-Passcode 的旧版反向代理
    token: '',
    languageMode: 'system',
    language: 'zh-CN'
  }
})
