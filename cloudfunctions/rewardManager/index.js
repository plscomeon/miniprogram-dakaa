// 奖励系统云函数
// 管理用户的打卡奖励、惩罚和手机使用权限

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()

  try {
    switch (action) {
      case 'getUserRewards':
        return await getUserRewards(OPENID)
      case 'addCheckinReward':
        return await addCheckinReward(OPENID, data)
      case 'usePhoneTime':
        return await usePhoneTime(OPENID, data)
      case 'applyPenalty':
        return await applyPenalty(OPENID, data)
      case 'getRewardStats':
        return await getRewardStats(OPENID)
      case 'getUsageHistory':
        return await getUsageHistory(OPENID)
      case 'recalculateRewards':
        return await recalculateRewards(OPENID)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('奖励系统云函数错误:', error)
    return { success: false, message: error.message }
  }
}

// 获取用户奖励信息
async function getUserRewards(openid) {
  try {
    const userReward = await db.collection('user_rewards').where({
      _openid: openid
    }).get()

    if (userReward.data.length === 0) {
      // 创建新用户奖励记录
      const newReward = {
        _openid: openid,
        totalEarnedMinutes: 0,
        totalUsedMinutes: 0,
        totalPenaltyMinutes: 0,
        phoneRecoveryDays: 0,
        phoneRecoveryEndDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('user_rewards').add({
        data: newReward
      })
      
      return {
        success: true,
        data: {
          ...newReward,
          availableMinutes: 0
        }
      }
    }

    const reward = userReward.data[0]
    const availableMinutes = Math.max(0, reward.totalEarnedMinutes - reward.totalUsedMinutes - reward.totalPenaltyMinutes)
    
    // 检查手机回收状态
    const now = new Date()
    let isRecovered = false
    let recoveryDays = 0
    
    if (reward.phoneRecoveryEndDate && new Date(reward.phoneRecoveryEndDate) > now) {
      isRecovered = true
      recoveryDays = Math.ceil((new Date(reward.phoneRecoveryEndDate) - now) / (1000 * 60 * 60 * 24))
    } else if (reward.phoneRecoveryDays > 0) {
      // 清除过期的回收状态
      await db.collection('user_rewards').doc(reward._id).update({
        data: {
          phoneRecoveryDays: 0,
          phoneRecoveryEndDate: null,
          updatedAt: new Date()
        }
      })
    }

    return {
      success: true,
      data: {
        ...reward,
        availableMinutes,
        isRecovered,
        recoveryDays
      }
    }
  } catch (error) {
    console.error('获取用户奖励信息失败:', error)
    return { success: false, message: '获取奖励信息失败' }
  }
}

// 添加打卡奖励
async function addCheckinReward(openid, data) {
  try {
    const { totalDays, streakDays, checkinDate } = data
    
    // 检查是否已经对这个日期给过奖励
    const existingReward = await db.collection('reward_history').where({
      _openid: openid,
      checkinDate: checkinDate
    }).get()
    
    if (existingReward.data.length > 0) {
      return {
        success: false,
        message: '该日期已经获得过奖励'
      }
    }
    
    // 计算奖励分钟数
    let rewardMinutes = 60 // 基础奖励：每天1小时
    let rewardType = 'daily_checkin'
    let rewardTitle = '🎉 每日打卡奖励'
    let rewardMessage = '完成今日打卡，获得1小时手机使用权！'
    
    // 检查连续打卡奖励（只在特定天数时给额外奖励）
    if (streakDays === 7) {
      rewardMinutes += 120 // 额外2小时
      rewardType = 'streak_7_bonus'
      rewardTitle = '🔥 连续7天奖励'
      rewardMessage = '连续打卡7天，额外获得2小时手机使用权！'
    } else if (streakDays === 30) {
      rewardMinutes += 300 // 额外5小时
      rewardType = 'streak_30_bonus'
      rewardTitle = '⭐ 连续30天奖励'
      rewardMessage = '连续打卡30天，额外获得5小时手机使用权！'
    } else if (streakDays === 100) {
      rewardMinutes += 600 // 额外10小时
      rewardType = 'streak_100_bonus'
      rewardTitle = '🏆 连续100天奖励'
      rewardMessage = '连续打卡100天，额外获得10小时手机使用权！'
    }
    
    // 使用事务确保数据一致性
    const transaction = await db.startTransaction()
    
    try {
      // 获取或创建用户奖励记录
      const userReward = await transaction.collection('user_rewards').where({
        _openid: openid
      }).get()
      
      if (userReward.data.length === 0) {
        // 创建新用户奖励记录
        await transaction.collection('user_rewards').add({
          data: {
            _openid: openid,
            totalEarnedMinutes: rewardMinutes,
            totalUsedMinutes: 0,
            totalPenaltyMinutes: 0,
            phoneRecoveryDays: 0,
            phoneRecoveryEndDate: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      } else {
        // 更新现有记录
        await transaction.collection('user_rewards').doc(userReward.data[0]._id).update({
          data: {
            totalEarnedMinutes: db.command.inc(rewardMinutes),
            updatedAt: new Date()
          }
        })
      }
      
      // 记录奖励历史
      await transaction.collection('reward_history').add({
        data: {
          _openid: openid,
          type: rewardType,
          title: rewardTitle,
          message: rewardMessage,
          minutes: rewardMinutes,
          checkinDate: checkinDate,
          totalDays: totalDays,
          streakDays: streakDays,
          createdAt: new Date()
        }
      })
      
      // 提交事务
      await transaction.commit()
      
      return {
        success: true,
        data: {
          rewardMinutes,
          rewardTitle,
          rewardMessage,
          rewardType
        }
      }
    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback()
      throw transactionError
    }
  } catch (error) {
    console.error('添加打卡奖励失败:', error)
    return { success: false, message: '添加奖励失败' }
  }
}

// 使用手机时间
async function usePhoneTime(openid, data) {
  try {
    const { minutes } = data
    
    // 获取用户当前奖励状态
    const rewardResult = await getUserRewards(openid)
    if (!rewardResult.success) {
      return rewardResult
    }
    
    const userReward = rewardResult.data
    
    // 检查手机是否被回收
    if (userReward.isRecovered) {
      return {
        success: false,
        message: `手机已被回收，还剩${userReward.recoveryDays}天`
      }
    }
    
    // 检查可用时长是否足够
    if (userReward.availableMinutes < minutes) {
      return {
        success: false,
        message: `使用权不足，当前剩余${formatTime(userReward.availableMinutes)}`
      }
    }
    
    // 使用事务确保数据一致性
    const transaction = await db.startTransaction()
    
    try {
      // 更新已使用时长
      await transaction.collection('user_rewards').where({
        _openid: openid
      }).update({
        data: {
          totalUsedMinutes: db.command.inc(minutes),
          updatedAt: new Date()
        }
      })
      
      // 记录使用历史
      await transaction.collection('usage_history').add({
        data: {
          _openid: openid,
          minutes: minutes,
          usageDate: new Date().toISOString().split('T')[0],
          createdAt: new Date()
        }
      })
      
      // 提交事务
      await transaction.commit()
      
      const remainingMinutes = userReward.availableMinutes - minutes
      
      return {
        success: true,
        message: `已使用${formatTime(minutes)}，剩余${formatTime(remainingMinutes)}`,
        data: {
          usedMinutes: minutes,
          remainingMinutes: remainingMinutes
        }
      }
    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback()
      throw transactionError
    }
  } catch (error) {
    console.error('使用手机时间失败:', error)
    return { success: false, message: '使用失败' }
  }
}

// 应用惩罚
async function applyPenalty(openid, data) {
  try {
    const { missedDays, penaltyDate } = data
    
    // 检查是否已经对这个日期应用过惩罚
    const existingPenalty = await db.collection('penalty_history').where({
      _openid: openid,
      penaltyDate: penaltyDate
    }).get()
    
    if (existingPenalty.data.length > 0) {
      return {
        success: false,
        message: '该日期已经应用过惩罚'
      }
    }
    
    let penaltyMinutes = 0
    let recoveryDays = 0
    let penaltyType = 'missed_checkin'
    let penaltyTitle = '📱 手机回收惩罚'
    let penaltyMessage = ''
    
    if (missedDays === 1) {
      penaltyMinutes = 60 // 扣除1小时
      recoveryDays = 1
      penaltyMessage = '忘记打卡1天，手机被回收1天，扣除1小时使用权'
    } else if (missedDays === 2) {
      penaltyMinutes = 180 // 扣除3小时
      recoveryDays = 3
      penaltyMessage = '连续忘记打卡2天，手机被回收3天，扣除3小时使用权'
    } else if (missedDays >= 3) {
      // 对于严重惩罚，扣除固定时长而不是清空所有
      penaltyMinutes = 600 // 扣除10小时
      recoveryDays = 7
      penaltyType = 'severe_penalty'
      penaltyTitle = '⚠️ 严重惩罚'
      penaltyMessage = `连续忘记打卡${missedDays}天，手机被回收7天，扣除10小时使用权`
    }
    
    // 计算回收结束日期
    const recoveryEndDate = new Date()
    recoveryEndDate.setDate(recoveryEndDate.getDate() + recoveryDays)
    
    // 使用事务确保数据一致性
    const transaction = await db.startTransaction()
    
    try {
      // 更新用户惩罚状态
      await transaction.collection('user_rewards').where({
        _openid: openid
      }).update({
        data: {
          totalPenaltyMinutes: db.command.inc(penaltyMinutes),
          phoneRecoveryDays: recoveryDays,
          phoneRecoveryEndDate: recoveryEndDate,
          updatedAt: new Date()
        }
      })
      
      // 记录惩罚历史
      await transaction.collection('penalty_history').add({
        data: {
          _openid: openid,
          type: penaltyType,
          title: penaltyTitle,
          message: penaltyMessage,
          penaltyMinutes: penaltyMinutes,
          recoveryDays: recoveryDays,
          missedDays: missedDays,
          penaltyDate: penaltyDate,
          createdAt: new Date()
        }
      })
      
      // 提交事务
      await transaction.commit()
      
      return {
        success: true,
        data: {
          penaltyMinutes,
          recoveryDays,
          penaltyTitle,
          penaltyMessage
        }
      }
    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback()
      throw transactionError
    }
  } catch (error) {
    console.error('应用惩罚失败:', error)
    return { success: false, message: '应用惩罚失败' }
  }
}

// 获取奖励统计
async function getRewardStats(openid) {
  try {
    // 获取奖励历史
    const rewardHistory = await db.collection('reward_history').where({
      _openid: openid
    }).orderBy('createdAt', 'desc').limit(20).get()
    
    // 获取惩罚历史
    const penaltyHistory = await db.collection('penalty_history').where({
      _openid: openid
    }).orderBy('createdAt', 'desc').limit(20).get()
    
    return {
      success: true,
      data: {
        rewardHistory: rewardHistory.data,
        penaltyHistory: penaltyHistory.data
      }
    }
  } catch (error) {
    console.error('获取奖励统计失败:', error)
    return { success: false, message: '获取统计失败' }
  }
}

// 获取使用历史
async function getUsageHistory(openid) {
  try {
    const usageHistory = await db.collection('usage_history').where({
      _openid: openid
    }).orderBy('createdAt', 'desc').limit(50).get()
    
    return {
      success: true,
      data: usageHistory.data
    }
  } catch (error) {
    console.error('获取使用历史失败:', error)
    return { success: false, message: '获取使用历史失败' }
  }
}

// 重新计算用户奖励数据
async function recalculateRewards(openid) {
  try {
    // 获取所有奖励历史
    const rewardHistory = await db.collection('reward_history').where({
      _openid: openid
    }).get()
    
    // 获取所有使用历史
    const usageHistory = await db.collection('usage_history').where({
      _openid: openid
    }).get()
    
    // 获取所有惩罚历史
    const penaltyHistory = await db.collection('penalty_history').where({
      _openid: openid
    }).get()
    
    // 计算总获得分钟数
    const totalEarnedMinutes = rewardHistory.data.reduce((total, reward) => {
      return total + (reward.minutes || 0)
    }, 0)
    
    // 计算总使用分钟数
    const totalUsedMinutes = usageHistory.data.reduce((total, usage) => {
      return total + (usage.minutes || 0)
    }, 0)
    
    // 计算总惩罚分钟数
    const totalPenaltyMinutes = penaltyHistory.data.reduce((total, penalty) => {
      return total + (penalty.penaltyMinutes || 0)
    }, 0)
    
    // 检查当前回收状态
    const now = new Date()
    let phoneRecoveryDays = 0
    let phoneRecoveryEndDate = null
    
    // 找到最新的惩罚记录来确定回收状态
    const latestPenalty = penaltyHistory.data
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    
    if (latestPenalty && latestPenalty.recoveryDays > 0) {
      const penaltyDate = new Date(latestPenalty.createdAt)
      const recoveryEndDate = new Date(penaltyDate)
      recoveryEndDate.setDate(recoveryEndDate.getDate() + latestPenalty.recoveryDays)
      
      if (recoveryEndDate > now) {
        phoneRecoveryDays = Math.ceil((recoveryEndDate - now) / (1000 * 60 * 60 * 24))
        phoneRecoveryEndDate = recoveryEndDate
      }
    }
    
    // 更新或创建用户奖励记录
    const userReward = await db.collection('user_rewards').where({
      _openid: openid
    }).get()
    
    const rewardData = {
      totalEarnedMinutes,
      totalUsedMinutes,
      totalPenaltyMinutes,
      phoneRecoveryDays,
      phoneRecoveryEndDate,
      updatedAt: new Date()
    }
    
    if (userReward.data.length === 0) {
      // 创建新记录
      await db.collection('user_rewards').add({
        data: {
          _openid: openid,
          ...rewardData,
          createdAt: new Date()
        }
      })
    } else {
      // 更新现有记录
      await db.collection('user_rewards').doc(userReward.data[0]._id).update({
        data: rewardData
      })
    }
    
    const availableMinutes = Math.max(0, totalEarnedMinutes - totalUsedMinutes - totalPenaltyMinutes)
    
    return {
      success: true,
      data: {
        totalEarnedMinutes,
        totalUsedMinutes,
        totalPenaltyMinutes,
        availableMinutes,
        phoneRecoveryDays,
        recalculated: true
      }
    }
  } catch (error) {
    console.error('重新计算奖励失败:', error)
    return { success: false, message: '重新计算失败' }
  }
}

// 格式化时间显示
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
  }
}