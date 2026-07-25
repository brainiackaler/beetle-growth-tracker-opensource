const LANGUAGE_STORAGE_KEY = 'beetle_language'
const LANGUAGE_MODES = ['system', 'zh-CN', 'zh-TW', 'en']

const NATIVE_LANGUAGE_LABELS = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English'
}

const MESSAGES = {
  'zh-CN': {
    interfaceLanguage: '界面语言',
    followSystem: '跟随系统',
    appTitle: '甲虫成长记录',
    growthRecordsTitle: '成长记录',
    statusLocal: '本地记录，按需启动后端',
    statusConnected: '已连接本机后端',
    statusDisconnected: '未连接后端，请先运行 backend/run.ps1',
    statusAuthRequired: '请先登录或注册',
    account: '账号',
    login: '登录',
    register: '注册',
    logout: '退出登录',
    username: '用户名',
    password: '密码',
    credentialsRequired: '请填写用户名和密码',
    authSucceeded: '登录成功',
    authFailed: '登录或注册失败',
    addBeetle: '新增甲虫',
    namePlaceholder: '名称，例如 大力一号',
    speciesPlaceholder: '品种，例如 独角仙 / 锹甲',
    hatchPurchaseDate: '孵化或购入日期',
    notesPlaceholder: '备注，例如 来源、饲养盒、菌瓶信息',
    saveBeetle: '✨ 保存甲虫',
    myBeetles: '我的甲虫',
    emptyBeetles: '还没有记录，先添加一只甲虫吧',
    unnamedBeetle: '未命名甲虫',
    pleaseEnterName: '请填写名称',
    saved: '已保存',
    saveFailed: '保存失败',
    loadFailed: '加载失败',
    editBeetle: '✏️ 编辑甲虫',
    deleteBeetle: '🗑️ 删除甲虫',
    refresh: '🔄 刷新',
    editBeetleProfile: '✏️ 编辑甲虫个体',
    saveChanges: '💾 保存修改',
    cancel: '取消',
    growthChart: '成长曲线',
    editGrowthRecord: '编辑成长记录',
    addGrowthRecord: '新增成长记录',
    recordDate: '记录日期',
    stage: '阶段',
    weightPlaceholder: '⚖️ 体重 g',
    lengthPlaceholder: '📏 体长 mm',
    temperaturePlaceholder: '🌡️ 温度 ℃',
    humidityPlaceholder: '💧 湿度 %',
    recordNotesPlaceholder: '📝 备注，例如 换土、蜕皮、进食、异常情况',
    photos: '📸 照片',
    cameraAlbum: '拍照 / 相册',
    saveRecord: '✨ 保存记录',
    history: '历史记录',
    emptyGrowthRecords: '还没有成长记录',
    dateNotProvided: '未填写日期',
    stageNotProvided: '未填写阶段',
    weight: '⚖️ 体重',
    length: '📏 体长',
    temperature: '🌡️ 温度',
    humidity: '💧 湿度',
    edit: '✏️ 编辑',
    delete: '🗑️ 删除',
    takePhotoAndSave: '拍照（同时保存到相册）',
    chooseFromAlbum: '从手机相册选择',
    photosSaved: '{count}张照片已存相册',
    photoSaved: '照片已存相册',
    photoAlbumSaveFailed: '照片已加入记录，相册保存失败',
    albumPermissionTitle: '需要相册权限',
    albumPermissionContent: '照片已加入本次记录。允许相册权限后，拍摄的原图会同时保存到手机相册。',
    goToSettings: '去设置',
    later: '稍后',
    albumPermissionMissing: '相册权限未开启',
    uploading: '上传中...',
    pleaseEnterDate: '请填写日期',
    saving: '保存中...',
    deleteRecordTitle: '删除记录',
    deleteRecordContent: '确定删除这条成长记录吗？',
    deleted: '已删除',
    deleteFailed: '删除失败',
    deleteBeetleTitle: '删除甲虫',
    deleteBeetleContent: '删除后会同时删除它的成长记录。',
    noMetricData: '该指标暂无有效数据',
    egg: '卵',
    larvaL1: '一龄幼虫',
    larvaL2: '二龄幼虫',
    larvaL3: '三龄幼虫',
    pupa: '蛹',
    adult: '成虫',
    other: '其他'
  },
  'zh-TW': {
    interfaceLanguage: '介面語言',
    followSystem: '跟隨系統',
    appTitle: '甲蟲成長記錄',
    growthRecordsTitle: '成長記錄',
    statusLocal: '本機記錄，視需要啟動後端',
    statusConnected: '已連線本機後端',
    statusDisconnected: '未連線後端，請先執行 backend/run.ps1',
    statusAuthRequired: '請先登入或註冊',
    account: '帳號',
    login: '登入',
    register: '註冊',
    logout: '登出',
    username: '使用者名稱',
    password: '密碼',
    credentialsRequired: '請填寫使用者名稱與密碼',
    authSucceeded: '登入成功',
    authFailed: '登入或註冊失敗',
    addBeetle: '新增甲蟲',
    namePlaceholder: '名稱，例如 大力一號',
    speciesPlaceholder: '品種，例如 獨角仙 / 鍬甲',
    hatchPurchaseDate: '孵化或購入日期',
    notesPlaceholder: '備註，例如 來源、飼養盒、菌瓶資訊',
    saveBeetle: '✨ 儲存甲蟲',
    myBeetles: '我的甲蟲',
    emptyBeetles: '尚無記錄，先新增一隻甲蟲吧',
    unnamedBeetle: '未命名甲蟲',
    pleaseEnterName: '請填寫名稱',
    saved: '已儲存',
    saveFailed: '儲存失敗',
    loadFailed: '載入失敗',
    editBeetle: '✏️ 編輯甲蟲',
    deleteBeetle: '🗑️ 刪除甲蟲',
    refresh: '🔄 重新整理',
    editBeetleProfile: '✏️ 編輯甲蟲個體',
    saveChanges: '💾 儲存修改',
    cancel: '取消',
    growthChart: '成長曲線',
    editGrowthRecord: '編輯成長記錄',
    addGrowthRecord: '新增成長記錄',
    recordDate: '記錄日期',
    stage: '階段',
    weightPlaceholder: '⚖️ 體重 g',
    lengthPlaceholder: '📏 體長 mm',
    temperaturePlaceholder: '🌡️ 溫度 ℃',
    humidityPlaceholder: '💧 濕度 %',
    recordNotesPlaceholder: '📝 備註，例如 換土、蛻皮、進食、異常情況',
    photos: '📸 相片',
    cameraAlbum: '拍照 / 相簿',
    saveRecord: '✨ 儲存記錄',
    history: '歷史記錄',
    emptyGrowthRecords: '尚無成長記錄',
    dateNotProvided: '未填寫日期',
    stageNotProvided: '未填寫階段',
    weight: '⚖️ 體重',
    length: '📏 體長',
    temperature: '🌡️ 溫度',
    humidity: '💧 濕度',
    edit: '✏️ 編輯',
    delete: '🗑️ 刪除',
    takePhotoAndSave: '拍照（同時儲存到相簿）',
    chooseFromAlbum: '從手機相簿選擇',
    photosSaved: '{count} 張相片已存入相簿',
    photoSaved: '相片已存入相簿',
    photoAlbumSaveFailed: '相片已加入記錄，但儲存至相簿失敗',
    albumPermissionTitle: '需要相簿權限',
    albumPermissionContent: '相片已加入本次記錄。允許相簿權限後，拍攝的原圖會同時儲存到手機相簿。',
    goToSettings: '前往設定',
    later: '稍後',
    albumPermissionMissing: '尚未開啟相簿權限',
    uploading: '上傳中...',
    pleaseEnterDate: '請填寫日期',
    saving: '儲存中...',
    deleteRecordTitle: '刪除記錄',
    deleteRecordContent: '確定刪除這筆成長記錄嗎？',
    deleted: '已刪除',
    deleteFailed: '刪除失敗',
    deleteBeetleTitle: '刪除甲蟲',
    deleteBeetleContent: '刪除後也會一併刪除牠的成長記錄。',
    noMetricData: '此指標暫無有效資料',
    egg: '卵',
    larvaL1: '一齡幼蟲',
    larvaL2: '二齡幼蟲',
    larvaL3: '三齡幼蟲',
    pupa: '蛹',
    adult: '成蟲',
    other: '其他'
  },
  en: {
    interfaceLanguage: 'Interface Language',
    followSystem: 'Follow System',
    appTitle: 'Beetle Growth Tracker',
    growthRecordsTitle: 'Growth Records',
    statusLocal: 'Local records; start the backend when needed',
    statusConnected: 'Connected to local backend',
    statusDisconnected: 'Backend disconnected. Run backend/run.ps1 first.',
    statusAuthRequired: 'Sign in or register to continue',
    account: 'Account',
    login: 'Sign In',
    register: 'Register',
    logout: 'Sign Out',
    username: 'Username',
    password: 'Password',
    credentialsRequired: 'Enter a username and password',
    authSucceeded: 'Signed in',
    authFailed: 'Sign-in or registration failed',
    addBeetle: 'Add Beetle',
    namePlaceholder: 'Name, e.g. Hercules 1',
    speciesPlaceholder: 'Species, e.g. rhinoceros / stag beetle',
    hatchPurchaseDate: 'Hatch or Purchase Date',
    notesPlaceholder: 'Notes, e.g. source, enclosure, substrate bottle',
    saveBeetle: '✨ Save Beetle',
    myBeetles: 'My Beetles',
    emptyBeetles: 'No records yet. Add your first beetle.',
    unnamedBeetle: 'Unnamed Beetle',
    pleaseEnterName: 'Please enter a name',
    saved: 'Saved',
    saveFailed: 'Save failed',
    loadFailed: 'Load failed',
    editBeetle: '✏️ Edit Beetle',
    deleteBeetle: '🗑️ Delete Beetle',
    refresh: '🔄 Refresh',
    editBeetleProfile: '✏️ Edit Beetle',
    saveChanges: '💾 Save Changes',
    cancel: 'Cancel',
    growthChart: 'Growth Chart',
    editGrowthRecord: 'Edit Growth Record',
    addGrowthRecord: 'Add Growth Record',
    recordDate: 'Record Date',
    stage: 'Stage',
    weightPlaceholder: '⚖️ Weight g',
    lengthPlaceholder: '📏 Length mm',
    temperaturePlaceholder: '🌡️ Temperature ℃',
    humidityPlaceholder: '💧 Humidity %',
    recordNotesPlaceholder: '📝 Notes, e.g. substrate, molt, feeding, issues',
    photos: '📸 Photos',
    cameraAlbum: 'Camera / Photos',
    saveRecord: '✨ Save Record',
    history: 'History',
    emptyGrowthRecords: 'No growth records yet',
    dateNotProvided: 'Date not provided',
    stageNotProvided: 'Stage not provided',
    weight: '⚖️ Weight',
    length: '📏 Length',
    temperature: '🌡️ Temperature',
    humidity: '💧 Humidity',
    edit: '✏️ Edit',
    delete: '🗑️ Delete',
    takePhotoAndSave: 'Take Photo (also save to Photos)',
    chooseFromAlbum: 'Choose from Photos',
    photosSaved: '{count} photos saved',
    photoSaved: 'Photo saved',
    photoAlbumSaveFailed: 'Photo added to the record, but saving to Photos failed',
    albumPermissionTitle: 'Photos Permission Required',
    albumPermissionContent: 'The photo was added to this record. Allow Photos access to also save the original photo.',
    goToSettings: 'Open Settings',
    later: 'Later',
    albumPermissionMissing: 'Photos permission is not enabled',
    uploading: 'Uploading...',
    pleaseEnterDate: 'Please enter a date',
    saving: 'Saving...',
    deleteRecordTitle: 'Delete Record',
    deleteRecordContent: 'Delete this growth record?',
    deleted: 'Deleted',
    deleteFailed: 'Delete failed',
    deleteBeetleTitle: 'Delete Beetle',
    deleteBeetleContent: 'Its growth records will also be deleted.',
    noMetricData: 'No valid data for this metric',
    egg: 'Egg',
    larvaL1: 'L1 Larva',
    larvaL2: 'L2 Larva',
    larvaL3: 'L3 Larva',
    pupa: 'Pupa',
    adult: 'Adult',
    other: 'Other'
  }
}

const STAGE_KEYS = {
  '卵': 'egg',
  '一龄幼虫': 'larvaL1',
  '二龄幼虫': 'larvaL2',
  '三龄幼虫': 'larvaL3',
  '蛹': 'pupa',
  '成虫': 'adult',
  '其他': 'other'
}

let currentMode = 'system'
let currentLanguage = 'zh-CN'

function normalizeLanguage(language) {
  const normalized = String(language || '').replace('_', '-').toLowerCase()
  if (normalized.indexOf('zh') === 0) {
    return /(hant|tw|hk|mo)/.test(normalized) ? 'zh-TW' : 'zh-CN'
  }
  return 'en'
}

function getSystemLanguage() {
  try {
    const info = wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync()
    return normalizeLanguage(info.language)
  } catch (error) {
    return 'zh-CN'
  }
}

function resolveLanguage(mode) {
  return mode === 'system' ? getSystemLanguage() : normalizeLanguage(mode)
}

function initLanguage() {
  let storedMode = 'system'
  try {
    const stored = wx.getStorageSync(LANGUAGE_STORAGE_KEY)
    if (LANGUAGE_MODES.indexOf(stored) !== -1) storedMode = stored
  } catch (error) {
    storedMode = 'system'
  }
  currentMode = storedMode
  currentLanguage = resolveLanguage(storedMode)
  return getLanguageState()
}

function setLanguageMode(mode) {
  currentMode = LANGUAGE_MODES.indexOf(mode) !== -1 ? mode : 'system'
  currentLanguage = resolveLanguage(currentMode)
  try {
    wx.setStorageSync(LANGUAGE_STORAGE_KEY, currentMode)
  } catch (error) {
    // The in-memory preference still applies when storage is unavailable.
  }
  return getLanguageState()
}

function refreshSystemLanguage() {
  if (currentMode === 'system') currentLanguage = getSystemLanguage()
  return getLanguageState()
}

function interpolate(text, values) {
  return Object.keys(values || {}).reduce((result, key) => (
    result.split(`{${key}}`).join(String(values[key]))
  ), text)
}

function t(key, values) {
  const languageMessages = MESSAGES[currentLanguage] || MESSAGES['zh-CN']
  return interpolate(languageMessages[key] || MESSAGES['zh-CN'][key] || key, values)
}

function translateStage(stage) {
  return t(STAGE_KEYS[stage] || 'stageNotProvided')
}

function getLanguageState() {
  return {
    mode: currentMode,
    language: currentLanguage,
    modeIndex: LANGUAGE_MODES.indexOf(currentMode)
  }
}

function getLanguageOptions() {
  return [
    {
      value: 'system',
      label: `${t('followSystem')} (${NATIVE_LANGUAGE_LABELS[currentLanguage]})`
    },
    { value: 'zh-CN', label: NATIVE_LANGUAGE_LABELS['zh-CN'] },
    { value: 'zh-TW', label: NATIVE_LANGUAGE_LABELS['zh-TW'] },
    { value: 'en', label: NATIVE_LANGUAGE_LABELS.en }
  ]
}

function getMessages() {
  return MESSAGES[currentLanguage] || MESSAGES['zh-CN']
}

module.exports = {
  LANGUAGE_MODES,
  getLanguageOptions,
  getLanguageState,
  getMessages,
  initLanguage,
  refreshSystemLanguage,
  setLanguageMode,
  t,
  translateStage
}
