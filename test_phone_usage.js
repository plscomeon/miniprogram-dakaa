// 测试手机使用功能的脚本
// 在微信开发者工具的控制台中运行

console.log('=== 开始测试手机使用功能 ===')

// 测试奖励系统初始化
async function testRewardSystem() {
  try {
    const RewardSystemNew = require('./miniprogram/pages/profile/rewardSystemNew.js')
    const rewardSystem = new RewardSystemNew()
    
    console.log('1. 测试奖励系统初始化...')
    const initResult = await rewardSystem.init()
    console.log('初始化结果:', initResult)
    
    console.log('2. 获取当前状态...')
    const status = rewardSystem.getCurrentStatus()
    console.log('当前状态:', status)
    
    console.log('3. 测试使用60分钟...')
    const useResult = await rewardSystem.usePhoneTime(60)
    console.log('使用结果:', useResult)
    
    console.log('4. 获取使用后状态...')
    const newStatus = rewardSystem.getCurrentStatus()
    console.log('使用后状态:', newStatus)
    
    console.log('=== 测试完成 ===')
    
    return {
      success: true,
      initResult,
      beforeStatus: status,
      useResult,
      afterStatus: newStatus
    }
  } catch (error) {
    console.error('测试失败:', error)
    return { success: false, error: error.message }
  }
}

// 测试云函数连接
async function testCloudFunction() {
  try {
    console.log('=== 测试云函数连接 ===')
    
    const result = await wx.cloud.callFunction({
      name: 'rewardManager',
      data: {
        action: 'getUserRewards'
      }
    })
    
    console.log('云函数调用成功:', result)
    return { success: true, result }
  } catch (error) {
    console.error('云函数调用失败:', error)
    return { success: false, error: error.message }
  }
}

// 运行测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testRewardSystem, testCloudFunction }
} else {
  // 在浏览器控制台中运行
  window.testRewardSystem = testRewardSystem
  window.testCloudFunction = testCloudFunction
  
  console.log('测试函数已加载，可以运行:')
  console.log('- testRewardSystem() // 测试奖励系统')
  console.log('- testCloudFunction() // 测试云函数连接')
}