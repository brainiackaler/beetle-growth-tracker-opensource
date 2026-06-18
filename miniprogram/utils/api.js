const app = getApp()

function request(path, options = {}) {
  const url = app.globalData.apiBase + path
  console.log('[API] Request:', options.method || 'GET', url)
  const passcode = app.globalData.passcode || wx.getStorageSync('beetle_passcode') || ''
  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        'X-Passcode': passcode
      },
      success(res) {
        console.log('[API] Response:', res.statusCode, res.data)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error((res.data && res.data.error) || '请求失败 ' + res.statusCode))
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
  request
}
