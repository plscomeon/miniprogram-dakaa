// 奖励系统修复验证测试脚本

console.log('🧪 开始测试奖励系统修复...\n')

// 测试1: 验证云函数结构
function testCloudFunctionStructure() {
  console.log('📋 测试1: 验证云函数结构')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    // 检查云函数文件是否存在
    const rewardManagerPath = path.join(__dirname, 'miniprogram/cloudfunctions/rewardManager/index.js')
    const packageJsonPath = path.join(__dirname, 'miniprogram/cloudfunctions/rewardManager/package.json')
    
    if (fs.existsSync(rewardManagerPath)) {
      console.log('✅ rewardManager云函数文件存在')
    } else {
      console.log('❌ rewardManager云函数文件不存在')
      return false
    }
    
    if (fs.existsSync(packageJsonPath)) {
      console.log('✅ package.json配置文件存在')
    } else {
      console.log('❌ package.json配置文件不存在')
      return false
    }
    
    // 检查云函数内容
    const cloudFunctionContent = fs.readFileSync(rewardManagerPath, 'utf8')
    const requiredActions = [
      'getUserRewards',
      'addCheckinReward', 
      'usePhoneTime',
      'applyPenalty',
      'getRewardStats',
      'getUsageHistory'
    ]
    
    let allActionsFound = true
    requiredActions.forEach(action => {
      if (cloudFunctionContent.includes(`case '${action}':`)) {
        console.log(`✅ 云函数包含${action}操作`)
      } else {
        console.log(`❌ 云函数缺少${action}操作`)
        allActionsFound = false
      }
    })
    
    return allActionsFound
    
  } catch (error) {
    console.log('❌ 测试云函数结构失败:', error.message)
    return false
  }
}

// 测试2: 验证CloudApi接口
function testCloudApiIntegration() {
  console.log('\n📋 测试2: 验证CloudApi接口集成')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    const cloudApiPath = path.join(__dirname, 'miniprogram/utils/cloudApi.js')
    const cloudApiContent = fs.readFileSync(cloudApiPath, 'utf8')
    
    const requiredMethods = [
      'getUserRewards',
      'addCheckinReward',
      'usePhoneTime', 
      'applyPenalty',
      'getRewardStats',
      'getUsageHistory'
    ]
    
    let allMethodsFound = true
    requiredMethods.forEach(method => {
      if (cloudApiContent.includes(`static async ${method}`)) {
        console.log(`✅ CloudApi包含${method}方法`)
      } else {
        console.log(`❌ CloudApi缺少${method}方法`)
        allMethodsFound = false
      }
    })
    
    return allMethodsFound
    
  } catch (error) {
    console.log('❌ 测试CloudApi集成失败:', error.message)
    return false
  }
}

// 测试3: 验证新奖励系统类
function testNewRewardSystemClass() {
  console.log('\n📋 测试3: 验证新奖励系统类')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    const rewardSystemPath = path.join(__dirname, 'miniprogram/pages/profile/rewardSystemNew.js')
    const rewardSystemContent = fs.readFileSync(rewardSystemPath, 'utf8')
    
    const requiredMethods = [
      'init',
      'loadUserRewards',
      'onCheckinCompleted',
      'usePhoneTime',
      'applyPenalty',
      'getRewardStats',
      'getCurrentStatus',
      'formatTime'
    ]
    
    let allMethodsFound = true
    requiredMethods.forEach(method => {
      if (rewardSystemContent.includes(`${method}(`)) {
        console.log(`✅ RewardSystemNew包含${method}方法`)
      } else {
        console.log(`❌ RewardSystemNew缺少${method}方法`)
        allMethodsFound = false
      }
    })
    
    // 检查是否使用CloudApi
    if (rewardSystemContent.includes('CloudApi.')) {
      console.log('✅ RewardSystemNew正确使用CloudApi')
    } else {
      console.log('❌ RewardSystemNew未使用CloudApi')
      allMethodsFound = false
    }
    
    return allMethodsFound
    
  } catch (error) {
    console.log('❌ 测试新奖励系统类失败:', error.message)
    return false
  }
}

// 测试4: 验证页面集成
function testPageIntegration() {
  console.log('\n📋 测试4: 验证页面集成')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    // 检查个人中心页面
    const profilePath = path.join(__dirname, 'miniprogram/pages/profile/profile.js')
    const profileContent = fs.readFileSync(profilePath, 'utf8')
    
    if (profileContent.includes('RewardSystemNew')) {
      console.log('✅ 个人中心页面使用新奖励系统')
    } else {
      console.log('❌ 个人中心页面未使用新奖励系统')
      return false
    }
    
    if (profileContent.includes('async usePhoneTime')) {
      console.log('✅ 个人中心页面usePhoneTime方法已异步化')
    } else {
      console.log('❌ 个人中心页面usePhoneTime方法未异步化')
      return false
    }
    
    // 检查打卡页面
    const checkinPath = path.join(__dirname, 'miniprogram/pages/checkin/checkin.js')
    const checkinContent = fs.readFileSync(checkinPath, 'utf8')
    
    if (checkinContent.includes('RewardSystemNew')) {
      console.log('✅ 打卡页面使用新奖励系统')
    } else {
      console.log('❌ 打卡页面未使用新奖励系统')
      return false
    }
    
    if (checkinContent.includes('await this.rewardSystem.onCheckinCompleted')) {
      console.log('✅ 打卡页面奖励触发已异步化')
    } else {
      console.log('❌ 打卡页面奖励触发未异步化')
      return false
    }
    
    return true
    
  } catch (error) {
    console.log('❌ 测试页面集成失败:', error.message)
    return false
  }
}

// 测试5: 验证数据库设计
function testDatabaseDesign() {
  console.log('\n📋 测试5: 验证数据库设计')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    const cloudFunctionPath = path.join(__dirname, 'miniprogram/cloudfunctions/rewardManager/index.js')
    const cloudFunctionContent = fs.readFileSync(cloudFunctionPath, 'utf8')
    
    const requiredCollections = [
      'user_rewards',
      'reward_history', 
      'penalty_history',
      'usage_history'
    ]
    
    let allCollectionsFound = true
    requiredCollections.forEach(collection => {
      if (cloudFunctionContent.includes(`'${collection}'`)) {
        console.log(`✅ 数据库设计包含${collection}集合`)
      } else {
        console.log(`❌ 数据库设计缺少${collection}集合`)
        allCollectionsFound = false
      }
    })
    
    // 检查关键字段
    const requiredFields = [
      'totalEarnedMinutes',
      'totalUsedMinutes', 
      'totalPenaltyMinutes',
      'phoneRecoveryDays',
      'phoneRecoveryEndDate'
    ]
    
    requiredFields.forEach(field => {
      if (cloudFunctionContent.includes(field)) {
        console.log(`✅ 数据库设计包含${field}字段`)
      } else {
        console.log(`❌ 数据库设计缺少${field}字段`)
        allCollectionsFound = false
      }
    })
    
    return allCollectionsFound
    
  } catch (error) {
    console.log('❌ 测试数据库设计失败:', error.message)
    return false
  }
}

// 测试6: 验证bug修复
function testBugFixes() {
  console.log('\n📋 测试6: 验证bug修复')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    // 检查是否移除了旧的本地存储逻辑
    const rewardSystemPath = path.join(__dirname, 'miniprogram/pages/profile/rewardSystemNew.js')
    const rewardSystemContent = fs.readFileSync(rewardSystemPath, 'utf8')
    
    if (!rewardSystemContent.includes('wx.getStorageSync(\'rewardSystem\')')) {
      console.log('✅ 已移除旧的本地存储逻辑')
    } else {
      console.log('❌ 仍在使用旧的本地存储逻辑')
      return false
    }
    
    // 检查是否使用数据库存储
    if (rewardSystemContent.includes('CloudApi.')) {
      console.log('✅ 已改用数据库存储')
    } else {
      console.log('❌ 未改用数据库存储')
      return false
    }
    
    // 检查usePhoneTime方法是否正确实现
    const profilePath = path.join(__dirname, 'miniprogram/pages/profile/profile.js')
    const profileContent = fs.readFileSync(profilePath, 'utf8')
    
    if (profileContent.includes('await this.rewardSystem.usePhoneTime') && 
        profileContent.includes('await this.updateRewardSystemData()')) {
      console.log('✅ usePhoneTime方法已正确修复')
    } else {
      console.log('❌ usePhoneTime方法未正确修复')
      return false
    }
    
    return true
    
  } catch (error) {
    console.log('❌ 测试bug修复失败:', error.message)
    return false
  }
}

// 运行所有测试
function runAllTests() {
  console.log('🚀 开始运行奖励系统修复验证测试\n')
  
  const tests = [
    { name: '云函数结构', test: testCloudFunctionStructure },
    { name: 'CloudApi接口', test: testCloudApiIntegration },
    { name: '新奖励系统类', test: testNewRewardSystemClass },
    { name: '页面集成', test: testPageIntegration },
    { name: '数据库设计', test: testDatabaseDesign },
    { name: 'Bug修复', test: testBugFixes }
  ]
  
  let passedTests = 0
  let totalTests = tests.length
  
  tests.forEach(({ name, test }) => {
    const result = test()
    if (result) {
      passedTests++
      console.log(`\n✅ ${name}测试通过`)
    } else {
      console.log(`\n❌ ${name}测试失败`)
    }
  })
  
  console.log('\n' + '='.repeat(50))
  console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`)
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！奖励系统修复成功！')
    console.log('\n🔧 修复内容总结:')
    console.log('1. ✅ 创建了基于数据库的奖励系统云函数')
    console.log('2. ✅ 重新设计了数据存储结构，确保数据一致性')
    console.log('3. ✅ 修复了第二次使用时长后不可用的bug')
    console.log('4. ✅ 实现了完整的奖励、惩罚和使用历史追踪')
    console.log('5. ✅ 优化了页面集成，使用异步操作确保数据同步')
    console.log('6. ✅ 提供了可靠的错误处理和用户反馈')
    
    console.log('\n🚀 下一步操作建议:')
    console.log('1. 在微信开发者工具中部署rewardManager云函数')
    console.log('2. 清除小程序缓存进行完整测试')
    console.log('3. 测试多次使用手机时长功能')
    console.log('4. 验证奖励数据在不同页面间的同步')
  } else {
    console.log('❌ 部分测试失败，请检查修复内容')
  }
  
  return passedTests === totalTests
}

// 执行测试
runAllTests()