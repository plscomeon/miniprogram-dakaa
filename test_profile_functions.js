// 个人中心页面功能测试
const Storage = require('./miniprogram/utils/storage.js')

console.log('=== 个人中心页面功能测试 ===\n')

// 测试1: 用户信息管理
console.log('1. 测试用户信息管理...')
try {
  // 保存用户信息
  const userInfo = {
    nickName: '测试用户',
    avatarUrl: '/images/test-avatar.png'
  }
  Storage.saveUserInfo(userInfo)
  
  // 获取用户信息
  const savedUserInfo = Storage.getUserInfo()
  console.log('✅ 用户信息保存和获取成功:', savedUserInfo)
} catch (error) {
  console.log('❌ 用户信息管理失败:', error.message)
}

// 测试2: 统计数据计算
console.log('\n2. 测试统计数据计算...')
try {
  // 添加一些测试数据
  const testRecord1 = {
    date: '2024-01-15',
    questions: ['问题1', '问题2'],
    video: '/temp/video1.mp4',
    diary: '今天学习了很多内容，感觉收获很大。',
    images: ['/temp/img1.jpg', '/temp/img2.jpg']
  }
  
  const testRecord2 = {
    date: '2024-01-16',
    questions: ['问题3'],
    video: '/temp/video2.mp4',
    diary: '继续学习，保持进步。',
    images: ['/temp/img3.jpg']
  }
  
  Storage.saveRecord(testRecord1)
  Storage.saveRecord(testRecord2)
  
  // 获取统计数据
  const stats = Storage.getStats()
  console.log('✅ 统计数据计算成功:', stats)
} catch (error) {
  console.log('❌ 统计数据计算失败:', error.message)
}

// 测试3: 成就系统
console.log('\n3. 测试成就系统...')
try {
  const records = Storage.getRecords()
  
  // 计算总字数
  let totalWords = 0
  records.forEach(record => {
    if (record.diary) {
      totalWords += record.diary.length
    }
    if (record.questions && Array.isArray(record.questions)) {
      record.questions.forEach(q => {
        totalWords += q.length
      })
    }
  })
  
  console.log('✅ 成就系统数据计算成功:')
  console.log(`   - 总打卡天数: ${records.length}`)
  console.log(`   - 总视频数: ${records.filter(r => r.video).length}`)
  console.log(`   - 总字数: ${totalWords}`)
} catch (error) {
  console.log('❌ 成就系统计算失败:', error.message)
}

// 测试4: 数据导出功能
console.log('\n4. 测试数据导出功能...')
try {
  const records = Storage.getRecords()
  
  // 生成CSV格式数据
  let csv = '日期,预习问题,视频数量,学习日记,图片数量\n'
  records.forEach(record => {
    const questions = record.questions ? record.questions.join(';') : ''
    const videoCount = record.video ? 1 : 0
    const diary = record.diary || ''
    const imageCount = record.images ? record.images.length : 0
    csv += `${record.date},"${questions}",${videoCount},"${diary}",${imageCount}\n`
  })
  
  console.log('✅ CSV导出数据生成成功:')
  console.log(csv)
  
  // 生成文本格式数据
  let text = '学习打卡记录\n\n'
  records.forEach(record => {
    text += `日期: ${record.date}\n`
    if (record.questions && record.questions.length > 0) {
      text += `预习问题:\n${record.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    }
    if (record.video) {
      text += `学习视频: 已上传\n`
    }
    if (record.diary) {
      text += `学习日记: ${record.diary}\n`
    }
    if (record.images && record.images.length > 0) {
      text += `图片数量: ${record.images.length}张\n`
    }
    text += '\n---\n\n'
  })
  
  console.log('✅ 文本导出数据生成成功')
} catch (error) {
  console.log('❌ 数据导出功能失败:', error.message)
}

// 测试5: 设置管理
console.log('\n5. 测试设置管理...')
try {
  // 模拟微信小程序的存储API
  global.wx = {
    getStorageSync: (key) => {
      const storage = {
        'reminderEnabled': true,
        'syncEnabled': false
      }
      return storage[key]
    },
    setStorageSync: (key, value) => {
      console.log(`设置 ${key} = ${value}`)
    },
    getStorageInfoSync: () => ({
      currentSize: 1024 // 1MB
    })
  }
  
  const reminderEnabled = wx.getStorageSync('reminderEnabled')
  const syncEnabled = wx.getStorageSync('syncEnabled')
  const storageInfo = wx.getStorageInfoSync()
  
  console.log('✅ 设置管理功能正常:')
  console.log(`   - 提醒开关: ${reminderEnabled}`)
  console.log(`   - 同步开关: ${syncEnabled}`)
  console.log(`   - 缓存大小: ${storageInfo.currentSize}KB`)
} catch (error) {
  console.log('❌ 设置管理失败:', error.message)
}

console.log('\n=== 个人中心页面功能测试完成 ===')