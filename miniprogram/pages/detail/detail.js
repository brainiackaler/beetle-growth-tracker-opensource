const api = require('../../utils/api')
const app = getApp()

function today() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 根据阶段名返回对应的 CSS class */
function stageClass(stage) {
  if (!stage) return ''
  if (stage.indexOf('卵') !== -1) return 'stage-egg'
  if (stage.indexOf('幼虫') !== -1) return 'stage-larva'
  if (stage.indexOf('蛹') !== -1) return 'stage-pupa'
  if (stage.indexOf('成虫') !== -1) return 'stage-adult'
  return ''
}

Page({
  data: {
    id: '',
    beetle: null,
    records: [],
    selectedImages: [],
    stages: ['卵', '一龄幼虫', '二龄幼虫', '三龄幼虫', '蛹', '成虫', '其他'],
    stageIndex: 0,
    isEditingBeetle: false,
    editBeetleForm: {
      name: '',
      species: '',
      hatchDate: '',
      notes: ''
    },
    editingRecordId: '',
    form: {
      recordDate: today(),
      stage: '卵',
      weight: '',
      length: '',
      temperature: '',
      humidity: '',
      notes: ''
    }
  },

  onLoad(options) {
    this.setData({ id: options.id || '' })
    this.loadAll()
  },

  onPullDownRefresh() {
    this.loadAll()
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      [`form.${key}`]: e.detail.value
    })
  },

  onRecordDateChange(e) {
    this.setData({
      'form.recordDate': e.detail.value
    })
  },

  onStageChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      stageIndex: index,
      'form.stage': this.data.stages[index]
    })
  },

  loadAll() {
    if (!this.data.id) return
    Promise.all([
      api.request(`/api/beetles/${encodeURIComponent(this.data.id)}`),
      api.request(`/api/beetles/${encodeURIComponent(this.data.id)}/records`)
    ]).then(([beetleData, recordData]) => {
      const items = (recordData.items || []).map(r => {
        r.stageClass = stageClass(r.stage)
        r.imageUrlsArray = r.imageUrls ? r.imageUrls.split(',').filter(u => u).map(u => u.startsWith('http') ? u : app.globalData.apiBase + u) : []
        return r
      })
      this.setData({
        beetle: beetleData.item,
        records: items
      })
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  chooseImages() {
    const maxCount = 9 - this.data.selectedImages.length
    if (maxCount <= 0) return
    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          selectedImages: this.data.selectedImages.concat(paths)
        })
      }
    })
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const list = this.data.selectedImages
    list.splice(index, 1)
    this.setData({ selectedImages: list })
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.current
    const urls = e.currentTarget.dataset.urls
    wx.previewImage({ current, urls })
  },

  uploadImages() {
    const files = this.data.selectedImages
    if (files.length === 0) return Promise.resolve('')

    const apiBase = app.globalData.apiBase;
    const isRemotePath = (p) => p.startsWith('http') && p.indexOf('tmp') === -1 && p.indexOf('wxfile') === -1;
    const getRelativePath = (p) => p.startsWith(apiBase) ? p.substring(apiBase.length) : p;

    wx.showLoading({ title: '上传中...' })
    const promises = files.map(file => {
      if (isRemotePath(file)) {
        return Promise.resolve(getRelativePath(file));
      }
      return new Promise(resolve => {
        wx.uploadFile({
          url: apiBase + '/api/upload',
          filePath: file,
          name: 'file',
          success(res) {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(res.data).url || '')
              } catch (e) { resolve('') }
            } else { resolve('') }
          },
          fail() { resolve('') }
        })
      })
    })

    return Promise.all(promises).then(results => {
      wx.hideLoading()
      return results.filter(u => u).join(',')
    })
  },

  createRecord() {
    if (!this.data.form.recordDate) {
      wx.showToast({ title: '请填写日期', icon: 'none' }); return;
    }
    wx.showLoading({ title: '保存中...' })
    this.uploadImages().then(imageUrls => {
      const data = Object.assign({}, this.data.form, { imageUrls })
      const isEdit = !!this.data.editingRecordId;
      const url = isEdit 
        ? `/api/beetles/${encodeURIComponent(this.data.id)}/records/${encodeURIComponent(this.data.editingRecordId)}`
        : `/api/beetles/${encodeURIComponent(this.data.id)}/records`;
      const method = isEdit ? 'PUT' : 'POST';

      return api.request(url, {
        method: method,
        data: data
      })
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已保存' })
      this.setData({
        selectedImages: [],
        editingRecordId: '',
        form: {
          recordDate: today(),
          stage: this.data.stages[this.data.stageIndex],
          weight: '',
          length: '',
          temperature: '',
          humidity: '',
          notes: ''
        }
      })
      this.loadAll()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  deleteRecord(e) {
    const recordId = e.currentTarget.dataset.recordId
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条成长记录吗？',
      confirmColor: '#9b3d30',
      success: res => {
        if (!res.confirm) return
        api.request(`/api/beetles/${encodeURIComponent(this.data.id)}/records/${encodeURIComponent(recordId)}`, {
          method: 'DELETE'
        }).then(() => {
          wx.showToast({ title: '已删除' })
          this.loadAll()
        }).catch(() => {
          wx.showToast({ title: '删除失败', icon: 'none' })
        })
      }
    })
  },

  deleteBeetle() {
    wx.showModal({
      title: '删除甲虫',
      content: '删除后会同时删除它的成长记录。',
      confirmColor: '#9b3d30',
      success: res => {
        if (!res.confirm) return
        api.request(`/api/beetles/${encodeURIComponent(this.data.id)}`, {
          method: 'DELETE'
        }).then(() => {
          wx.navigateBack()
        }).catch(() => {
          wx.showToast({ title: '删除失败', icon: 'none' })
        })
      }
    })
  },

  openEditBeetle() {
    const b = this.data.beetle
    if (!b) return
    this.setData({
      isEditingBeetle: true,
      editBeetleForm: {
        name: b.name || '',
        species: b.species || '',
        hatchDate: b.hatchDate || '',
        notes: b.notes || ''
      }
    })
  },

  cancelEditBeetle() {
    this.setData({ isEditingBeetle: false })
  },

  onEditBeetleInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      [`editBeetleForm.${key}`]: e.detail.value
    })
  },

  onEditBeetleDateChange(e) {
    this.setData({
      'editBeetleForm.hatchDate': e.detail.value
    })
  },

  saveBeetle() {
    const form = this.data.editBeetleForm
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中...' })
    api.request(`/api/beetles/${encodeURIComponent(this.data.id)}`, {
      method: 'PUT',
      data: form
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已保存' })
      this.setData({ isEditingBeetle: false })
      this.loadAll()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  editRecord(e) {
    const recordId = e.currentTarget.dataset.recordId
    const record = this.data.records.find(r => r.id === recordId)
    if (!record) return

    const stageIdx = this.data.stages.indexOf(record.stage)
    this.setData({
      editingRecordId: record.id,
      stageIndex: stageIdx !== -1 ? stageIdx : 0,
      selectedImages: record.imageUrlsArray || [],
      form: {
        recordDate: record.recordDate || today(),
        stage: record.stage || '卵',
        weight: record.weight || '',
        length: record.length || '',
        temperature: record.temperature || '',
        humidity: record.humidity || '',
        notes: record.notes || ''
      }
    })
    
    // Scroll up to the form
    wx.pageScrollTo({
      selector: '.form-card',
      duration: 300
    })
  },

  cancelEditRecord() {
    this.setData({
      selectedImages: [],
      editingRecordId: '',
      form: {
        recordDate: today(),
        stage: this.data.stages[this.data.stageIndex],
        weight: '',
        length: '',
        temperature: '',
        humidity: '',
        notes: ''
      }
    })
  }
})
