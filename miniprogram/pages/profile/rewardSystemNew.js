// 新的奖励系统模块 - 基于数据库存储
// 管理用户的打卡奖励、惩罚和手机使用权限

const CloudApi = require('../../utils/cloudApi.js')

class RewardSystemNew {
  constructor() {
    this.userRewards = null
    this.rewardHistory = []
    this.penaltyHistory = []
    this.usageHistory = []
  }

  // 初始化奖励系统
  async init() {
    try {
      await this.loadUserRewards()
      return { success: true }
    } catch (error) {
      console.error('初始化奖励系统失败:', error)
      
      // 尝试从本地存储恢复数据
      const backupData = wx.getStorageSync('userRewards_backup')
      
      if (backupData && backupData.totalEarnedMinutes !== undefined) {
        this.userRewards = backupData
        console.log('从本地备份恢复奖励数据:', backupData)
      } else {
        // 提供降级处理，使用默认数据（给一些初始时长用于测试）
        this.userRewards = {
          totalEarnedMinutes: 120, // 给2小时初始时长用于测试
          totalUsedMinutes: 0,
          totalPenaltyMinutes: 0,
          availableMinutes: 120,
          phoneRecoveryDays: 0,
          phoneRecoveryEndDate: null,
          isRecovered: false,
          recoveryDays: 0
        }
        console.log('奖励系统使用默认数据初始化（包含测试时长）')
      }
      
      this.rewardHistory = []
      this.penaltyHistory = []
      this.usageHistory = []
      
      return { success: true, fallback: true, message: '使用离线模式' }
    }
  }

  // 加载用户奖励数据
  async loadUserRewards() {
    try {
      const result = await CloudApi.getUserRewards()
      if (result.success) {
        this.userRewards = result.data
        return result.data
      } else {
        throw new Error(result.message || '获取奖励信息失败')
      }
    } catch (error) {
      console.error('加载用户奖励数据失败:', error)
      // 检查是否是网络或云函数问题
      if (error.message && error.message.includes('cloud function')) {
        console.log('云函数调用失败，可能需要部署云函数')
        wx.showToast({
          title: '奖励系统暂时不可用',
          icon: 'none',
          duration: 2000
        })
      }
      throw error
    }
  }

  // 用户完成打卡时的奖励
  async onCheckinCompleted(checkinData) {
    try {
      const { totalDays, streakDays } = checkinData
      const checkinDate = new Date().toISOString().split('T')[0]
      
      const result = await CloudApi.addCheckinReward({
        totalDays,
        streakDays,
        checkinDate
      })
      
      if (result.success) {
        // 重新加载用户奖励数据
        await this.loadUserRewards()
        
        // 显示奖励通知
        this.showRewardNotification(result.data)
        
        return result
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('处理打卡奖励失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 使用手机时间
  async usePhoneTime(minutes) {
    try {
      const result = await CloudApi.usePhoneTime(minutes)
      
      if (result.success) {
        // 重新加载用户奖励数据
        await this.loadUserRewards()
        return result
      } else {
        return result
      }
    } catch (error) {
      console.error('使用手机时间失败:', error)
      
      // 检查是否是云函数调用失败
      if (error.message && (error.message.includes('cloud function') || error.message.includes('network'))) {
        // 提供降级处理 - 使用本地存储模拟
        return this.usePhoneTimeOffline(minutes)
      }
      
      return { success: false, message: error.message }
    }
  }

  // 离线模式使用手机时间（临时方案）
  async usePhoneTimeOffline(minutes) {
    try {
      // 检查当前可用时长
      const currentStatus = this.getCurrentStatus()
      
      if (currentStatus.phoneUsageRights < minutes) {
        return {
          success: false,
          message: `可用时长不足，当前仅有${this.formatTime(currentStatus.phoneUsageRights)}`
        }
      }
      
      // 模拟使用时长（更新本地数据）
      if (this.userRewards) {
        this.userRewards.totalUsedMinutes = (this.userRewards.totalUsedMinutes || 0) + minutes
        this.userRewards.availableMinutes = Math.max(0, 
          (this.userRewards.totalEarnedMinutes || 0) - 
          (this.userRewards.totalUsedMinutes || 0) - 
          (this.userRewards.totalPenaltyMinutes || 0)
        )
        
        // 保存到本地存储作为备份
        wx.setStorageSync('userRewards_backup', this.userRewards)
      }
      
      return {
        success: true,
        message: `成功使用${this.formatTime(minutes)}，剩余${this.formatTime(this.userRewards.availableMinutes)}`
      }
    } catch (error) {
      console.error('离线使用手机时间失败:', error)
      return { success: false, message: '操作失败，请稍后重试' }
    }
  }

  // 应用惩罚
  async applyPenalty(missedDays) {
    try {
      const penaltyDate = new Date().toISOString().split('T')[0]
      
      const result = await CloudApi.applyPenalty({
        missedDays,
        penaltyDate
      })
      
      if (result.success) {
        // 重新加载用户奖励数据
        await this.loadUserRewards()
        
        // 显示惩罚通知
        this.showPenaltyNotification(result.data)
        
        return result
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('应用惩罚失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 获取奖励统计
  async getRewardStats() {
    try {
      const result = await CloudApi.getRewardStats()
      if (result.success) {
        this.rewardHistory = result.data.rewardHistory || []
        this.penaltyHistory = result.data.penaltyHistory || []
        return result.data
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('获取奖励统计失败:', error)
      return { rewardHistory: [], penaltyHistory: [] }
    }
  }

  // 获取使用历史
  async getUsageHistory() {
    try {
      const result = await CloudApi.getUsageHistory()
      if (result.success) {
        this.usageHistory = result.data || []
        return result.data
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('获取使用历史失败:', error)
      return []
    }
  }

  // 获取当前状态
  getCurrentStatus() {
    if (!this.userRewards) {
      return {
        phoneUsageRights: 0,
        phoneRecoveryDays: 0,
        totalRewards: 0,
        totalPenalties: 0,
        isPhoneRecovered: false,
        totalEarned: 0,
        totalUsed: 0,
        totalPenalty: 0
      }
    }

    return {
      phoneUsageRights: this.userRewards.availableMinutes || 0,
      phoneRecoveryDays: this.userRewards.recoveryDays || 0,
      totalRewards: this.rewardHistory.length,
      totalPenalties: this.penaltyHistory.length,
      isPhoneRecovered: this.userRewards.isRecovered || false,
      totalEarned: this.userRewards.totalEarnedMinutes || 0,
      totalUsed: this.userRewards.totalUsedMinutes || 0,
      totalPenalty: this.userRewards.totalPenaltyMinutes || 0
    }
  }

  // 获取奖励历史
  getRewardHistory() {
    return this.rewardHistory
  }

  // 获取惩罚历史
  getPenaltyHistory() {
    return this.penaltyHistory
  }

  // 显示奖励通知
  showRewardNotification(rewardData) {
    if (rewardData && rewardData.rewardTitle) {
      wx.showModal({
        title: rewardData.rewardTitle,
        content: rewardData.rewardMessage,
        showCancel: false,
        confirmText: '太棒了！',
        confirmColor: '#07C160'
      })
    }
  }

  // 显示惩罚通知
  showPenaltyNotification(penaltyData) {
    if (penaltyData && penaltyData.penaltyTitle) {
      wx.showModal({
        title: penaltyData.penaltyTitle,
        content: penaltyData.penaltyMessage,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#FA5151'
      })
    }
  }

  // 格式化时间显示
  formatTime(minutes) {
    if (!minutes || minutes <= 0) {
      return '0分钟'
    }
    
    if (minutes < 60) {
      return `${minutes}分钟`
    } else {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
    }
  }

  // 检查是否需要应用惩罚（由外部调用）
  async checkAndApplyPenalties(checkinRecords) {
    try {
      // 检查最近几天是否有遗漏的打卡
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // 检查昨天是否有打卡记录
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const yesterdayRecord = checkinRecords.find(record => record.date === yesterdayStr)
      
      if (!yesterdayRecord) {
        // 计算连续忘记打卡的天数
        let missedDays = 0
        for (let i = 1; i <= 7; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          const checkDateStr = checkDate.toISOString().split('T')[0]
          const record = checkinRecords.find(r => r.date === checkDateStr)
          
          if (!record) {
            missedDays++
          } else {
            break
          }
        }
        
        if (missedDays > 0) {
          await this.applyPenalty(missedDays)
        }
      }
    } catch (error) {
      console.error('检查和应用惩罚失败:', error)
    }
  }

  // 重新计算奖励数据
  async recalculateRewards() {
    try {
      const result = await CloudApi.recalculateRewards()
      if (result.success) {
        // 重新加载用户奖励数据
        await this.loadUserRewards()
        return result
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('重新计算奖励失败:', error)
      return { success: false, message: error.message }
    }
  }
}

module.exports = RewardSystemNew