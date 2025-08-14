// 奖励系统模块
// 管理用户的打卡奖励、惩罚和手机使用权限

class RewardSystem {
  constructor() {
    this.rewards = []
    this.penalties = []
    this.phoneUsageRights = 0 // 累计获得的手机使用时长（分钟）
    this.phoneRecoveryDays = 0 // 手机回收天数
    this.lastCheckDate = null
  }

  // 初始化奖励系统
  init() {
    this.loadRewardData()
    this.checkDailyStatus()
  }

  // 从本地存储加载奖励数据
  loadRewardData() {
    try {
      const rewardData = wx.getStorageSync('rewardSystem')
      if (rewardData) {
        this.rewards = rewardData.rewards || []
        this.penalties = rewardData.penalties || []
        this.phoneUsageRights = rewardData.phoneUsageRights || 0
        this.phoneRecoveryDays = rewardData.phoneRecoveryDays || 0
        this.lastCheckDate = rewardData.lastCheckDate || null
      }
    } catch (error) {
      console.error('加载奖励数据失败:', error)
    }
  }

  // 保存奖励数据到本地存储
  saveRewardData() {
    try {
      const rewardData = {
        rewards: this.rewards,
        penalties: this.penalties,
        phoneUsageRights: this.phoneUsageRights,
        phoneRecoveryDays: this.phoneRecoveryDays,
        lastCheckDate: this.lastCheckDate
      }
      wx.setStorageSync('rewardSystem', rewardData)
    } catch (error) {
      console.error('保存奖励数据失败:', error)
    }
  }

  // 检查每日状态
  checkDailyStatus() {
    const today = new Date().toISOString().split('T')[0]
    
    // 如果是新的一天，检查是否有打卡
    if (this.lastCheckDate !== today) {
      this.processNewDay(today)
      this.lastCheckDate = today
      this.saveRewardData()
    }
  }

  // 处理新的一天
  async processNewDay(today) {
    try {
      // 检查昨天是否有打卡记录
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      const CloudApi = require('../../utils/cloudApi.js')
      const result = await CloudApi.getCheckinRecords()
      
      if (result.success) {
        const records = result.data || []
        const yesterdayRecord = records.find(record => record.date === yesterdayStr)
        
        if (!yesterdayRecord && this.lastCheckDate) {
          // 昨天没有打卡，应用惩罚
          this.applyMissedCheckinPenalty()
        }
      }
      
      // 减少手机回收天数
      if (this.phoneRecoveryDays > 0) {
        this.phoneRecoveryDays--
        this.addPenalty({
          type: 'recovery_countdown',
          message: `手机回收倒计时：还剩 ${this.phoneRecoveryDays} 天`,
          date: today
        })
      }
      
    } catch (error) {
      console.error('处理新的一天失败:', error)
    }
  }

  // 用户完成打卡时的奖励
  onCheckinCompleted(checkinData) {
    const today = new Date().toISOString().split('T')[0]
    
    // 奖励：打卡1天 = 1小时手机使用权
    this.phoneUsageRights += 60 // 60分钟
    
    this.addReward({
      type: 'checkin_reward',
      title: '🎉 打卡奖励',
      message: '恭喜完成今日打卡！获得1小时手机使用权',
      phoneTime: 60,
      date: today,
      checkinData: checkinData
    })

    // 检查连续打卡奖励
    this.checkStreakRewards(checkinData.streakDays || 1)
    
    this.saveRewardData()
    this.showRewardNotification()
  }

  // 根据用户打卡天数计算总可用时长
  calculateTotalUsageRights(totalDays, streakDays) {
    let totalRights = 0
    
    // 基础奖励：每天打卡获得1小时
    totalRights += totalDays * 60
    
    // 连续打卡奖励（不重复计算）
    if (streakDays >= 100) {
      // 100天奖励：额外10小时（只计算一次）
      totalRights += 600
    } else if (streakDays >= 30) {
      // 30天奖励：额外5小时（只计算一次）
      totalRights += 300
    } else if (streakDays >= 7) {
      // 7天奖励：额外2小时（只计算一次）
      totalRights += 120
    }
    
    return totalRights
  }

  // 同步用户打卡数据并重新计算可用时长
  syncWithUserStats(totalDays, streakDays) {
    // 计算应该拥有的总时长
    const shouldHaveRights = this.calculateTotalUsageRights(totalDays, streakDays)
    
    // 计算已使用的时长（从历史记录中计算）
    const usedRights = this.calculateUsedRights()
    
    // 计算被惩罚扣除的时长
    const penaltyRights = this.calculatePenaltyRights()
    
    // 更新当前可用时长
    this.phoneUsageRights = Math.max(0, shouldHaveRights - usedRights - penaltyRights)
    
    this.saveRewardData()
    
    return {
      shouldHave: shouldHaveRights,
      used: usedRights,
      penalty: penaltyRights,
      available: this.phoneUsageRights
    }
  }

  // 计算已使用的时长
  calculateUsedRights() {
    const usageHistory = wx.getStorageSync('phoneUsageHistory') || []
    return usageHistory.reduce((total, usage) => total + usage.minutes, 0)
  }

  // 计算惩罚扣除的时长
  calculatePenaltyRights() {
    return this.penalties.reduce((total, penalty) => {
      return total + (penalty.lostTime || 0)
    }, 0)
  }

  // 检查连续打卡奖励
  checkStreakRewards(streakDays) {
    const today = new Date().toISOString().split('T')[0]
    
    if (streakDays === 7) {
      this.phoneUsageRights += 120 // 额外2小时
      this.addReward({
        type: 'streak_bonus',
        title: '🔥 连续7天奖励',
        message: '太棒了！连续打卡7天，额外获得2小时手机使用权！',
        phoneTime: 120,
        date: today
      })
    } else if (streakDays === 30) {
      this.phoneUsageRights += 300 // 额外5小时
      this.addReward({
        type: 'streak_bonus',
        title: '⭐ 连续30天奖励',
        message: 'incredible！连续打卡30天，额外获得5小时手机使用权！',
        phoneTime: 300,
        date: today
      })
    } else if (streakDays === 100) {
      this.phoneUsageRights += 600 // 额外10小时
      this.addReward({
        type: 'streak_bonus',
        title: '🏆 连续100天奖励',
        message: '传奇！连续打卡100天，额外获得10小时手机使用权！',
        phoneTime: 600,
        date: today
      })
    }
  }

  // 应用忘记打卡的惩罚
  applyMissedCheckinPenalty() {
    const today = new Date().toISOString().split('T')[0]
    
    // 计算连续忘记打卡的天数
    const missedDays = this.calculateConsecutiveMissedDays()
    
    if (missedDays === 1) {
      // 忘记打卡1天，手机回收1天
      this.phoneRecoveryDays += 1
      this.phoneUsageRights = Math.max(0, this.phoneUsageRights - 60) // 扣除1小时
      
      this.addPenalty({
        type: 'missed_checkin',
        title: '📱 手机回收惩罚',
        message: '忘记打卡1天，手机被回收1天，扣除1小时使用权',
        recoveryDays: 1,
        lostTime: 60,
        date: today
      })
    } else if (missedDays === 2) {
      // 忘记打卡2天，手机回收3天
      this.phoneRecoveryDays += 3
      this.phoneUsageRights = Math.max(0, this.phoneUsageRights - 180) // 扣除3小时
      
      this.addPenalty({
        type: 'missed_checkin',
        title: '📱 手机回收惩罚',
        message: '连续忘记打卡2天，手机被回收3天，扣除3小时使用权',
        recoveryDays: 3,
        lostTime: 180,
        date: today
      })
    } else if (missedDays >= 3) {
      // 连续忘记3天或以上，严重惩罚
      this.phoneRecoveryDays += 7
      this.phoneUsageRights = 0 // 清空所有使用权
      
      this.addPenalty({
        type: 'severe_penalty',
        title: '⚠️ 严重惩罚',
        message: `连续忘记打卡${missedDays}天，手机被回收7天，清空所有使用权`,
        recoveryDays: 7,
        lostTime: this.phoneUsageRights,
        date: today
      })
    }
    
    this.saveRewardData()
    this.showPenaltyNotification()
  }

  // 计算连续忘记打卡的天数
  calculateConsecutiveMissedDays() {
    // 这里需要根据实际的打卡记录来计算
    // 简化实现，返回1
    return 1
  }

  // 添加奖励记录
  addReward(reward) {
    this.rewards.unshift({
      ...reward,
      id: Date.now(),
      timestamp: new Date().toISOString()
    })
    
    // 只保留最近30条记录
    if (this.rewards.length > 30) {
      this.rewards = this.rewards.slice(0, 30)
    }
  }

  // 添加惩罚记录
  addPenalty(penalty) {
    this.penalties.unshift({
      ...penalty,
      id: Date.now(),
      timestamp: new Date().toISOString()
    })
    
    // 只保留最近30条记录
    if (this.penalties.length > 30) {
      this.penalties = this.penalties.slice(0, 30)
    }
  }

  // 显示奖励通知
  showRewardNotification() {
    const latestReward = this.rewards[0]
    if (latestReward) {
      wx.showModal({
        title: latestReward.title,
        content: latestReward.message,
        showCancel: false,
        confirmText: '太棒了！',
        confirmColor: '#07C160'
      })
    }
  }

  // 显示惩罚通知
  showPenaltyNotification() {
    const latestPenalty = this.penalties[0]
    if (latestPenalty) {
      wx.showModal({
        title: latestPenalty.title,
        content: latestPenalty.message,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#FA5151'
      })
    }
  }

  // 获取当前状态
  getCurrentStatus() {
    return {
      phoneUsageRights: this.phoneUsageRights,
      phoneRecoveryDays: this.phoneRecoveryDays,
      totalRewards: this.rewards.length,
      totalPenalties: this.penalties.length,
      isPhoneRecovered: this.phoneRecoveryDays > 0
    }
  }

  // 获取奖励历史
  getRewardHistory() {
    return this.rewards
  }

  // 获取惩罚历史
  getPenaltyHistory() {
    return this.penalties
  }

  // 使用手机时间
  usePhoneTime(minutes) {
    if (this.phoneRecoveryDays > 0) {
      return {
        success: false,
        message: `手机已被回收，还剩${this.phoneRecoveryDays}天`
      }
    }
    
    if (this.phoneUsageRights < minutes) {
      return {
        success: false,
        message: `使用权不足，当前剩余${this.formatTime(this.phoneUsageRights)}`
      }
    }
    
    // 记录使用历史
    this.recordUsageHistory(minutes)
    
    this.phoneUsageRights -= minutes
    this.saveRewardData()
    
    return {
      success: true,
      message: `已使用${this.formatTime(minutes)}，剩余${this.formatTime(this.phoneUsageRights)}`,
      remaining: this.phoneUsageRights
    }
  }

  // 记录使用历史
  recordUsageHistory(minutes) {
    try {
      const usageHistory = wx.getStorageSync('phoneUsageHistory') || []
      usageHistory.unshift({
        minutes: minutes,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      })
      
      // 只保留最近100条记录
      if (usageHistory.length > 100) {
        usageHistory.splice(100)
      }
      
      wx.setStorageSync('phoneUsageHistory', usageHistory)
    } catch (error) {
      console.error('记录使用历史失败:', error)
    }
  }

  // 格式化时间显示
  formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}分钟`
    } else {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
    }
  }
}

module.exports = RewardSystem