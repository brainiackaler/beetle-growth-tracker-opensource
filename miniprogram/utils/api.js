const app = getApp()
const TOKEN_STORAGE_KEY = 'beetle_token'

function getToken() {
  return app.globalData.token || wx.getStorageSync(TOKEN_STORAGE_KEY) || ''
}

function setToken(token) {
  const value = String(token || '').trim()
  app.globalData.token = value
  if (value) {
    wx.setStorageSync(TOKEN_STORAGE_KEY, value)
  } else {
    wx.removeStorageSync(TOKEN_STORAGE_KEY)
  }
}

function clearToken() {
  setToken('')
}

function hasToken() {
  return Boolean(getToken())
}

function request(path, options = {}) {
  const url = app.globalData.apiBase + path
  const passcode = app.globalData.passcode || wx.getStorageSync('beetle_passcode') || ''
  const token = getToken()
  const header = {
    'content-type': 'application/json',
    'X-Passcode': passcode
  }
  if (token) header.Authorization = `Bearer ${token}`

  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method: options.method || 'GET',
      data: options.data || {},
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          if (res.statusCode === 401 && token) clearToken()
          const error = new Error((res.data && (res.data.message || res.data.error)) || '请求失败 ' + res.statusCode)
          error.statusCode = res.statusCode
          reject(error)
        }
      },
      fail(err) {
        console.error('[API] Fail:', JSON.stringify(err))
        wx.showModal({
          title: '连接失败',
          content: url + '\n' + JSON.stringify(err),
          showCancel: false
        })
        reject(err)
      }
    })
  })
}

module.exports = {
  request,
  setToken,
  clearToken,
  hasToken
}
