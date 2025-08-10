// 测试个人中心页面功能（修复后）
console.log('开始测试个人中心页面功能...')

// 模拟微信小程序环境
global.wx = {
  getStorageSync: (key) => {
    const storage = {
      'reminderEnabled': true,
      'syncEnabled': false
    }
    return storage[key]
  },
  setStorageSync: (key, value) => {
    console.log(`设置存储: ${key} = ${value}`)
  },
  getStorageInfoSync: () => ({
    currentSize: 256
  }),
  chooseMedia: (options) => {
    console.log('选择媒体文件:', options)
    options.success({
      tempFiles: [{
        tempFilePath: '/temp/avatar.jpg'
      }]
    })
  },
  showToast: (options) => {
    console.log('显示提示:', options.title)
  },
  showLoading: (options) => {
    console.log('显示加载:', options.title)
  },
  hideLoading: () => {
    console.log('隐藏加载')
  },
  setClipboardData: (options) => {
    console.log('复制到剪贴板:', options.data.substring(0, 100) + '...')
    options.success()
  },
  showShareMenu: (options) => {
    console.log('显示分享菜单:', options)
  },
  showModal: (options) => {
    console.log('显示模态框:', options.title)
  }
}

// 模拟Storage工具类
const Storage = {
  getUserInfo: () => ({
    nickName: '测试用户',
    avatarUrl: '/images/avatar.png'
  }),
  saveUserInfo: (userInfo) => {
    console.log('保存用户信息:', userInfo)
  },
  getStats: () => ({
    totalDays: 15,
    streakDays: 7,
    totalVideos: 5
  }),
  getRecords: () => [
    {
      date: '2024-01-15',
      questions: ['问题1', '问题2'],
      video: '/temp/video1.mp4',
      diary: '今天学习了很多内容，收获很大。',
      images: ['/temp/img1.jpg', '/temp/img2.jpg']
    },
    {
      date: '2024-01-14',
      questions: ['问题3'],
      diary: '继续努力学习。',
      images: ['/temp/img3.jpg']
    }
  ]
}

// 模拟Page构造函数
function Page(options) {
  const page = {
    data: options.data,
    setData: function(newData) {
      Object.assign(this.data, newData)
      console.log('页面数据更新:', Object.keys(newData))
    }
  }
  
  // 绑定所有方法到page对象
  Object.keys(options).forEach(key => {
    if (typeof options[key] === 'function') {
      page[key] = options[key].bind(page)
    }
  })
  
  return page
}

// 加载个人中心页面代码
const fs = require('fs')
const profileCode = fs.readFileSync('miniprogram/pages/profile/profile.js', 'utf8')

// 替换require语句
const modifiedCode = profileCode.replace(
  "const Storage = require('../../utils/storage.js')",
  'const StorageUtil = arguments[0]'
).replace(/Storage\./g, 'StorageUtil.')

// 执行代码
const pageFunction = new Function('StorageUtil', 'Page', modifiedCode + '; return Page')
const PageConstructor = pageFunction(Storage, Page)

// 创建页面实例
console.log('\n=== 创建页面实例 ===')
const page = PageConstructor

// 测试页面初始化
console.log('\n=== 测试页面初始化 ===')
page.onLoad()
console.log('初始数据:', {
  totalDays: page.data.totalDays,
  streakDays: page.data.streakDays,
  totalVideos: page.data.totalVideos,
  totalWords: page.data.totalWords,
  unlockedCount: page.data.unlockedCount,
  totalAchievements: page.data.totalAchievements
})

// 测试页面显示
console.log('\n=== 测试页面显示 ===')
page.onShow()
console.log('更新后数据:', {
  totalDays: page.data.totalDays,
  streakDays: page.data.streakDays,
  totalVideos: page.data.totalVideos,
  totalWords: page.data.totalWords,
  unlockedCount: page.data.unlockedCount
})

// 测试头像更换
console.log('\n=== 测试头像更换 ===')
page.changeAvatar()

// 测试导出功能
console.log('\n=== 测试导出功能 ===')
page.exportData()
console.log('导出模态框状态:', page.data.showExportModal)

page.selectExportType({ currentTarget: { dataset: { type: 'pdf' } } })
console.log('选择导出类型:', page.data.exportType)

page.selectDateRange({ currentTarget: { dataset: { range: 'week' } } })
console.log('选择日期范围:', page.data.dateRange)

page.confirmExport()

// 测试设置功能
console.log('\n=== 测试设置功能 ===')
page.toggleReminder({ detail: { value: false } })
console.log('提醒设置:', page.data.reminderEnabled)

page.toggleSync({ detail: { value: true } })
console.log('同步设置:', page.data.syncEnabled)

// 测试其他功能
console.log('\n=== 测试其他功能 ===')
page.shareApp()
page.feedback()
page.about()

console.log('\n✅ 个人中心页面功能测试完成！')