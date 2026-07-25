const api = require('../../utils/api')
const i18n = require('../../utils/i18n')
const app = getApp()

Page({
  data: {
    i18n: i18n.getMessages(),
    languageOptions: i18n.getLanguageOptions(),
    languageIndex: i18n.getLanguageState().modeIndex,
    statusKey: 'statusLocal',
    statusText: i18n.t('statusLocal'),
    authenticated: api.hasToken(),
    authMode: 'login',
    authForm: {
      username: '',
      password: ''
    },
    beetles: [],
    form: {
      name: '',
      species: '',
      hatchDate: '',
      notes: ''
    }
  },

  onShow() {
    this.syncLanguage()
    const authenticated = api.hasToken()
    this.setData({ authenticated })
    if (authenticated) {
      this.loadBeetles()
    } else {
      this.setData({
        beetles: [],
        statusKey: 'statusAuthRequired',
        statusText: i18n.t('statusAuthRequired')
      })
    }
  },

  onPullDownRefresh() {
    if (api.hasToken()) {
      this.loadBeetles()
    } else {
      wx.stopPullDownRefresh()
    }
  },

  syncLanguage() {
    const state = i18n.refreshSystemLanguage()
    app.globalData.languageMode = state.mode
    app.globalData.language = state.language
    this.setData({
      i18n: i18n.getMessages(),
      languageOptions: i18n.getLanguageOptions(),
      languageIndex: state.modeIndex,
      statusText: i18n.t(this.data.statusKey || 'statusLocal')
    })
    wx.setNavigationBarTitle({ title: i18n.t('appTitle') })
  },

  onLanguageChange(e) {
    const option = this.data.languageOptions[Number(e.detail.value)]
    if (!option) return
    app.setLanguageMode(option.value)
    this.syncLanguage()
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      [`form.${key}`]: e.detail.value
    })
  },

  onAuthInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      [`authForm.${key}`]: e.detail.value
    })
  },

  setAuthMode(e) {
    this.setData({ authMode: e.currentTarget.dataset.mode === 'register' ? 'register' : 'login' })
  },

  submitAuth() {
    const username = this.data.authForm.username.trim()
    const password = this.data.authForm.password
    if (!username || !password) {
      wx.showToast({ title: i18n.t('credentialsRequired'), icon: 'none' })
      return
    }

    api.request(`/api/auth/${this.data.authMode}`, {
      method: 'POST',
      data: { username, password }
    }).then(data => {
      api.setToken(data.token)
      this.setData({
        authenticated: true,
        authForm: { username: '', password: '' }
      })
      wx.showToast({ title: i18n.t('authSucceeded') })
      this.loadBeetles()
    }).catch(() => {
      wx.showToast({ title: i18n.t('authFailed'), icon: 'none' })
    })
  },

  logout() {
    api.clearToken()
    this.setData({
      authenticated: false,
      beetles: [],
      statusKey: 'statusAuthRequired',
      statusText: i18n.t('statusAuthRequired')
    })
  },

  onDateChange(e) {
    this.setData({
      'form.hatchDate': e.detail.value
    })
  },

  loadBeetles() {
    api.request('/api/beetles')
      .then(data => {
        this.setData({
          beetles: data.items || [],
          statusKey: 'statusConnected',
          statusText: i18n.t('statusConnected')
        })
      })
      .catch(() => {
        const authenticated = api.hasToken()
        this.setData(authenticated ? {
          statusKey: 'statusDisconnected',
          statusText: i18n.t('statusDisconnected')
        } : {
          authenticated: false,
          beetles: [],
          statusKey: 'statusAuthRequired',
          statusText: i18n.t('statusAuthRequired')
        })
      })
      .finally(() => {
        wx.stopPullDownRefresh()
      })
  },

  createBeetle() {
    const form = this.data.form
    if (!form.name.trim()) {
      wx.showToast({ title: i18n.t('pleaseEnterName'), icon: 'none' })
      return
    }
    api.request('/api/beetles', {
      method: 'POST',
      data: form
    }).then(() => {
      wx.showToast({ title: i18n.t('saved') })
      this.setData({
        form: { name: '', species: '', hatchDate: '', notes: '' }
      })
      this.loadBeetles()
    }).catch(() => {
      wx.showToast({ title: i18n.t('saveFailed'), icon: 'none' })
    })
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(e.currentTarget.dataset.id)}`
    })
  }
})
