const api = require('../../utils/api')

Page({
  data: {
    statusText: '本地记录，按需启动后端',
    beetles: [],
    form: {
      name: '',
      species: '',
      hatchDate: '',
      notes: ''
    }
  },

  onShow() {
    this.loadBeetles()
  },

  onPullDownRefresh() {
    this.loadBeetles()
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      [`form.${key}`]: e.detail.value
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
          statusText: '已连接本机后端'
        })
      })
      .catch(() => {
        this.setData({
          statusText: '未连接后端，请先运行 backend/run.ps1'
        })
      })
      .finally(() => {
        wx.stopPullDownRefresh()
      })
  },

  createBeetle() {
    const form = this.data.form
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return
    }
    api.request('/api/beetles', {
      method: 'POST',
      data: form
    }).then(() => {
      wx.showToast({ title: '已保存' })
      this.setData({
        form: { name: '', species: '', hatchDate: '', notes: '' }
      })
      this.loadBeetles()
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(e.currentTarget.dataset.id)}`
    })
  }
})
