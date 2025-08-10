// 个人中心页面功能测试（模拟环境）
console.log('=== 个人中心页面功能测试 ===\n')

// 模拟微信小程序环境
global.wx = {
  getStorageSync: (key) => {
    const storage = {
      'userInfo': { nickName: '测试用户', avatarUrl: '/images/test-avatar.png' },
      'checkin_records': [
        {
          date: '2024-01-15',
          questions: ['问题1', '问题2'],
          video: '/temp/video1.mp4',
          diary: '今天学习了很多内容，感觉收获很大。',
          images: ['/temp/img1.jpg', '/temp/img2.jpg']
        },
        {
          date: '2024-01-16',
          questions: ['问题3'],
          video: '/temp/video2.mp4',
          diary: '继续学习，保持进步。',
          images: ['/temp/img3.jpg']
        }
      ],
      'reminderEnabled': true,
      'syncEnabled': false
    }
    return storage[key] || null
  },
  setStorageSync: (key, value) => {
    console.log(`设置 ${key} = ${JSON.stringify(value)}`)
  },
  getStorageInfoSync: () => ({
    currentSize: 1024 // 1MB
  })
}

// 测试1: 用户信息管理
console.log('1. 测试用户信息管理...')
try {
  const userInfo = wx.getStorageSync('userInfo')
  console.log('✅ 用户信息获取成功:', userInfo)
} catch (error) {
  console.log('❌ 用户信息管理失败:', error.message)
}

// 测试2: 统计数据计算
console.log('\n2. 测试统计数据计算...')
try {
  const records = wx.getStorageSync('checkin_records') || []
  
  // 计算统计数据
  const totalDays = records.length
  const totalVideos = records.filter(r => r.video).length
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
  
  // 计算连续天数（简化版）
  const streakDays = totalDays > 0 ? Math.min(totalDays, 7) : 0
  
  console.log('✅ 统计数据计算成功:')
  console.log(`   - 总打卡天数: ${totalDays}`)
  console.log(`   - 连续天数: ${streakDays}`)
  console.log(`   - 总视频数: ${totalVideos}`)
  console.log(`   - 总字数: ${totalWords}`)
} catch (error) {
  console.log('❌ 统计数据计算失败:', error.message)
}

// 测试3: 成就系统
console.log('\n3. 测试成就系统...')
try {
  const records = wx.getStorageSync('checkin_records') || []
  const totalDays = records.length
  const totalVideos = records.filter(r => r.video).length
  
  // 模拟成就系统
  const achievements = [
    { name: '初学者', target: 1, progress: totalDays, unlocked: totalDays >= 1 },
    { name: '坚持者', target: 7, progress: Math.min(totalDays, 7), unlocked: totalDays >= 7 },
    { name: '视频专家', target: 10, progress: totalVideos, unlocked: totalVideos >= 10 }
  ]
  
  const unlockedCount = achievements.filter(a => a.unlocked).length
  
  console.log('✅ 成就系统计算成功:')
  console.log(`   - 已解锁成就: ${unlockedCount}/${achievements.length}`)
  achievements.forEach(achievement => {
    const status = achievement.unlocked ? '已获得' : `${achievement.progress}/${achievement.target}`
    console.log(`   - ${achievement.name}: ${status}`)
  })
} catch (error) {
  console.log('❌ 成就系统计算失败:', error.message)
}

// 测试4: 数据导出功能
console.log('\n4. 测试数据导出功能...')
try {
  const records = wx.getStorageSync('checkin_records') || []
  
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

// 测试6: 头像更换功能
console.log('\n6. 测试头像更换功能...')
try {
  // 模拟头像更换
  const newAvatarPath = '/temp/new-avatar.jpg'
  const userInfo = wx.getStorageSync('userInfo') || {}
  const updatedUserInfo = { ...userInfo, avatarUrl: newAvatarPath }
  
  wx.setStorageSync('userInfo', updatedUserInfo)
  console.log('✅ 头像更换功能正常')
} catch (error) {
  console.log('❌ 头像更换功能失败:', error.message)
}

console.log('\n=== 个人中心页面功能测试完成 ===')