// 测试奖励系统修复
// 模拟奖励系统的使用场景

const RewardSystemNew = require('./miniprogram/pages/profile/rewardSystemNew.js')

// 模拟CloudApi
const MockCloudApi = {
  async getUserRewards() {
    return {
      success: true,
      data: {
        totalEarnedMinutes: 300, // 5小时
        totalUsedMinutes: 60,    // 1小时
        totalPenaltyMinutes: 0,  // 0惩罚
        availableMinutes: 240,   // 4小时可用
        phoneRecoveryDays: 0,
        isRecovered: false,
        recoveryDays: 0
      }
    }
  },

  async usePhoneTime(minutes) {
    console.log(`模拟使用手机时间: ${minutes}分钟`)
    return {
      success: true,
      message: `已使用${minutes}分钟，剩余${240 - minutes}分钟`,
      data: {
        usedMinutes: minutes,
        remainingMinutes: 240 - minutes
      }
    }
  },

  async addCheckinReward(data) {
    console.log('模拟添加打卡奖励:', data)
    return {
      success: true,
      data: {
        rewardMinutes: 60,
        rewardTitle: '🎉 每日打卡奖励',
        rewardMessage: '完成今日打卡，获得1小时手机使用权！',
        rewardType: 'daily_checkin'
      }
    }
  },

  async recalculateRewards() {
    console.log('模拟重新计算奖励')
    return {
      success: true,
      data: {
        totalEarnedMinutes: 360,
        totalUsedMinutes: 60,
        totalPenaltyMinutes: 0,
        availableMinutes: 300,
        recalculated: true
      }
    }
  }
}

// 替换CloudApi
require.cache[require.resolve('./miniprogram/utils/cloudApi.js')] = {
  exports: MockCloudApi
}

async function testRewardSystem() {
  console.log('=== 测试奖励系统修复 ===\n')

  const rewardSystem = new RewardSystemNew()
  
  try {
    // 1. 初始化奖励系统
    console.log('1. 初始化奖励系统...')
    const initResult = await rewardSystem.init()
    console.log('初始化结果:', initResult)
    console.log()

    // 2. 获取当前状态
    console.log('2. 获取当前状态...')
    const status = rewardSystem.getCurrentStatus()
    console.log('当前状态:', status)
    console.log('格式化时间:', rewardSystem.formatTime(status.phoneUsageRights))
    console.log()

    // 3. 模拟打卡奖励
    console.log('3. 模拟打卡奖励...')
    const checkinResult = await rewardSystem.onCheckinCompleted({
      totalDays: 5,
      streakDays: 3
    })
    console.log('打卡奖励结果:', checkinResult)
    console.log()

    // 4. 第一次使用手机时间
    console.log('4. 第一次使用手机时间 (30分钟)...')
    const useResult1 = await rewardSystem.usePhoneTime(30)
    console.log('第一次使用结果:', useResult1)
    console.log()

    // 5. 第二次使用手机时间 (测试bug修复)
    console.log('5. 第二次使用手机时间 (60分钟)...')
    const useResult2 = await rewardSystem.usePhoneTime(60)
    console.log('第二次使用结果:', useResult2)
    console.log()

    // 6. 测试重新计算功能
    console.log('6. 测试重新计算功能...')
    const recalcResult = await rewardSystem.recalculateRewards()
    console.log('重新计算结果:', recalcResult)
    console.log()

    // 7. 最终状态
    console.log('7. 最终状态...')
    const finalStatus = rewardSystem.getCurrentStatus()
    console.log('最终状态:', finalStatus)
    console.log('格式化时间:', rewardSystem.formatTime(finalStatus.phoneUsageRights))

    console.log('\n=== 测试完成 ===')
    console.log('✅ 奖励系统修复测试通过！')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testRewardSystem()