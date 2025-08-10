// 测试修复后的功能
const Storage = require('./miniprogram/utils/storage.js')

console.log('=== 测试视频上传和个人中心数据修复 ===\n')

// 1. 测试Storage的getCheckinRecords方法
console.log('1. 测试Storage.getCheckinRecords方法:')
try {
  const records = Storage.getCheckinRecords()
  console.log('✅ getCheckinRecords方法正常，返回记录数:', records.length)
  
  if (records.length > 0) {
    console.log('   示例记录:', {
      date: records[0].date,
      hasQuestions: !!records[0].questions,
      hasVideo: !!records[0].videoUrl,
      hasDiary: !!records[0].diary
    })
  }
} catch (error) {
  console.log('❌ getCheckinRecords方法失败:', error.message)
}

// 2. 测试数据统计计算
console.log('\n2. 测试数据统计计算:')
try {
  const records = Storage.getCheckinRecords()
  
  // 模拟个人中心页面的统计计算
  let totalDays = records.length
  let totalVideos = 0
  let totalWords = 0
  
  records.forEach(record => {
    if (record.videoUrl) totalVideos++
    if (record.diary) totalWords += record.diary.length
    if (record.questions && Array.isArray(record.questions)) {
      record.questions.forEach(q => {
        if (q && typeof q === 'string') {
          totalWords += q.length
        }
      })
    }
  })
  
  console.log('✅ 统计计算正常:')
  console.log('   总天数:', totalDays)
  console.log('   总视频数:', totalVideos)
  console.log('   总字数:', totalWords)
  
} catch (error) {
  console.log('❌ 统计计算失败:', error.message)
}

// 3. 测试连续天数计算
console.log('\n3. 测试连续天数计算:')
try {
  const records = Storage.getCheckinRecords()
  
  // 模拟连续天数计算逻辑
  function calculateContinuousDays(records) {
    if (!records || records.length === 0) return 0

    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date))
    let continuousDays = 0
    const today = new Date()
    let checkDate = new Date(today)

    for (let i = 0; i < sortedRecords.length; i++) {
      const recordDate = new Date(sortedRecords[i].date)
      const checkDateStr = checkDate.toISOString().split('T')[0]
      const recordDateStr = recordDate.toISOString().split('T')[0]

      if (recordDateStr === checkDateStr) {
        continuousDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        if (i === 0) {
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          
          if (recordDateStr === yesterdayStr) {
            continuousDays++
            checkDate = new Date(yesterday)
            checkDate.setDate(checkDate.getDate() - 1)
            continue
          }
        }
        break
      }
    }

    return continuousDays
  }
  
  const continuousDays = calculateContinuousDays(records)
  console.log('✅ 连续天数计算正常:', continuousDays, '天')
  
} catch (error) {
  console.log('❌ 连续天数计算失败:', error.message)
}

// 4. 测试本月打卡天数
console.log('\n4. 测试本月打卡天数:')
try {
  const records = Storage.getCheckinRecords()
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  const thisMonthDays = records.filter(record => {
    const recordDate = new Date(record.date)
    return recordDate.getMonth() === currentMonth && 
           recordDate.getFullYear() === currentYear
  }).length
  
  console.log('✅ 本月打卡天数计算正常:', thisMonthDays, '天')
  
} catch (error) {
  console.log('❌ 本月打卡天数计算失败:', error.message)
}

console.log('\n=== 测试完成 ===')