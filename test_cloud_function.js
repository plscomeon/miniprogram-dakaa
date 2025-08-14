// 在微信开发者工具控制台中运行此代码来测试云函数

console.log('🧪 开始测试 rewardManager 云函数...')

// 测试云函数调用
async function testRewardManager() {
  try {
    console.log('📞 调用 getUserRewards...')
    
    const result = await wx.cloud.callFunction({
      name: 'rewardManager',
      data: {
        action: 'getUserRewards'
      }
    })
    
    console.log('✅ 云函数调用成功!')
    console.log('📊 返回结果:', result)
    
    if (result.result && result.result.success) {
      console.log('🎉 奖励系统数据:', result.result.data)
      
      // 测试添加奖励
      console.log('\n📞 测试添加打卡奖励...')
      const rewardResult = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'addCheckinReward',
          data: {
            totalDays: 1,
            streakDays: 1,
            checkinDate: new Date().toISOString().split('T')[0]
          }
        }
      })
      
      console.log('🎁 添加奖励结果:', rewardResult)
      
    } else {
      console.log('⚠️ 云函数返回错误:', result.result)
    }
    
  } catch (error) {
    console.log('❌ 云函数调用失败:', error)
    
    // 详细错误分析
    if (error.errCode) {
      switch (error.errCode) {
        case -1:
          console.log('💡 错误分析: 云函数可能未部署')
          console.log('🔧 解决方案: 在微信开发者工具中右键 cloudfunctions/rewardManager 文件夹，选择"上传并部署：云端安装依赖"')
          break
        case -404:
          console.log('💡 错误分析: 云函数不存在')
          console.log('🔧 解决方案: 检查云函数名称是否为 rewardManager')
          break
        case -503:
          console.log('💡 错误分析: 云函数执行超时')
          console.log('🔧 解决方案: 检查云函数代码是否有死循环或长时间操作')
          break
        default:
          console.log('💡 错误分析: 未知错误，错误码:', error.errCode)
          console.log('🔧 解决方案: 检查网络连接和云开发环境配置')
      }
    } else {
      console.log('💡 错误分析: 网络或其他错误')
      console.log('🔧 解决方案: 检查网络连接')
    }
  }
}

// 检查云开发环境
function checkCloudEnvironment() {
  console.log('\n🌐 检查云开发环境...')
  
  if (!wx.cloud) {
    console.log('❌ 云开发SDK未初始化')
    return false
  }
  
  console.log('✅ 云开发SDK已初始化')
  
  // 检查数据库
  try {
    const db = wx.cloud.database()
    console.log('✅ 数据库连接正常')
    return true
  } catch (error) {
    console.log('❌ 数据库连接失败:', error)
    return false
  }
}

// 主测试函数
async function runTest() {
  console.log('🚀 开始完整测试...\n')
  
  // 1. 检查环境
  const envOk = checkCloudEnvironment()
  if (!envOk) {
    console.log('❌ 环境检查失败，停止测试')
    return
  }
  
  // 2. 测试云函数
  await testRewardManager()
  
  console.log('\n🏁 测试完成!')
}

// 运行测试
runTest().catch(error => {
  console.error('❌ 测试过程中出现错误:', error)
})