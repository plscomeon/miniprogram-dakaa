// 奖励系统问题修复脚本
// 在微信开发者工具的控制台中运行此脚本来诊断问题

console.log('🔍 开始诊断奖励系统问题...')

// 1. 检查云开发初始化
function checkCloudInit() {
  console.log('\n1. 检查云开发初始化状态...')
  try {
    if (wx.cloud) {
      console.log('✅ 云开发SDK已加载')
      return true
    } else {
      console.log('❌ 云开发SDK未加载')
      return false
    }
  } catch (error) {
    console.log('❌ 云开发检查失败:', error)
    return false
  }
}

// 2. 测试云函数调用
async function testCloudFunction() {
  console.log('\n2. 测试云函数调用...')
  try {
    const result = await wx.cloud.callFunction({
      name: 'rewardManager',
      data: {
        action: 'getUserRewards'
      }
    })
    console.log('✅ 云函数调用成功:', result)
    return true
  } catch (error) {
    console.log('❌ 云函数调用失败:', error)
    
    // 分析错误类型
    if (error.errCode === -1) {
      console.log('💡 建议: 云函数可能未部署，请在微信开发者工具中部署 rewardManager 云函数')
    } else if (error.errCode === -404) {
      console.log('💡 建议: 云函数不存在，请检查函数名称是否正确')
    } else if (error.errCode === -503) {
      console.log('💡 建议: 云函数执行超时，请检查函数代码')
    } else {
      console.log('💡 建议: 请检查网络连接和云开发环境配置')
    }
    return false
  }
}

// 3. 检查数据库权限
async function checkDatabasePermission() {
  console.log('\n3. 检查数据库权限...')
  try {
    const db = wx.cloud.database()
    const result = await db.collection('user_rewards').limit(1).get()
    console.log('✅ 数据库访问正常')
    return true
  } catch (error) {
    console.log('❌ 数据库访问失败:', error)
    console.log('💡 建议: 请检查数据库权限设置')
    return false
  }
}

// 4. 测试奖励系统初始化
async function testRewardSystemInit() {
  console.log('\n4. 测试奖励系统初始化...')
  try {
    // 模拟奖励系统初始化
    const CloudApi = require('../../utils/cloudApi.js')
    const result = await CloudApi.getUserRewards()
    
    if (result.success) {
      console.log('✅ 奖励系统初始化成功:', result.data)
      return true
    } else {
      console.log('❌ 奖励系统初始化失败:', result.message)
      return false
    }
  } catch (error) {
    console.log('❌ 奖励系统测试失败:', error)
    return false
  }
}

// 5. 提供修复建议
function provideSuggestions(results) {
  console.log('\n📋 诊断结果总结:')
  console.log('==================')
  
  const { cloudInit, cloudFunction, database, rewardSystem } = results
  
  if (!cloudInit) {
    console.log('🔧 修复步骤 1: 初始化云开发')
    console.log('   在 app.js 中添加: wx.cloud.init({ env: "your-env-id" })')
  }
  
  if (!cloudFunction) {
    console.log('🔧 修复步骤 2: 部署云函数')
    console.log('   1. 右键点击 cloudfunctions/rewardManager 文件夹')
    console.log('   2. 选择 "上传并部署：云端安装依赖"')
    console.log('   3. 等待部署完成')
  }
  
  if (!database) {
    console.log('🔧 修复步骤 3: 检查数据库权限')
    console.log('   1. 打开云开发控制台')
    console.log('   2. 进入数据库管理')
    console.log('   3. 检查集合权限设置')
  }
  
  if (cloudInit && cloudFunction && database && rewardSystem) {
    console.log('🎉 所有检查都通过了！奖励系统应该正常工作')
  } else {
    console.log('⚠️  请按照上述步骤修复问题后重新测试')
  }
}

// 主函数
async function diagnoseRewardSystem() {
  const results = {
    cloudInit: false,
    cloudFunction: false,
    database: false,
    rewardSystem: false
  }
  
  results.cloudInit = checkCloudInit()
  
  if (results.cloudInit) {
    results.cloudFunction = await testCloudFunction()
    results.database = await checkDatabasePermission()
    results.rewardSystem = await testRewardSystemInit()
  }
  
  provideSuggestions(results)
  
  return results
}

// 导出诊断函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { diagnoseRewardSystem }
} else {
  // 在控制台中直接运行
  diagnoseRewardSystem().then(results => {
    console.log('\n🏁 诊断完成！')
  }).catch(error => {
    console.error('❌ 诊断过程中出现错误:', error)
  })
}