// 个人中心页面逻辑
const CloudApi = require('../../utils/cloudApi.js')
const RewardSystem = require('./rewardSystem.js')

Page({
  goToMistakes: function () {
    wx.navigateTo({ url: '/pages/mistakes/mistakes' });
  },

  data: {
    userInfo: {},
    totalDays: 0,
    streakDays: 0,
    totalVideos: 0,
    totalWords: 0,
    totalMistakes: 0,
    achievements: [],
    totalAchievements: 3,
    unlockedCount: 0,
    reminderEnabled: true,
    syncEnabled: false,
    showExportModal: false,
    exportType: 'excel',
    dateRange: 'month',
    cacheSize: '0KB',
    // 奖励系统相关数据
    phoneUsageRights: 0,
    phoneRecoveryDays: 0,
    rewardHistory: [],
    penaltyHistory: [],
    isPhoneRecovered: false,
    showRewardModal: false,
    showPenaltyModal: false,
    showPhoneUsageModal: false
  },

  onLoad() {
    console.log('Profile页面：onLoad');
    this.initRewardSystem();
    this.initPage();
  },

  async onShow() {
    console.log('Profile页面：onShow - 页面显示');
    
    // 调试信息：显示当前状态
    this.debugCurrentState();
    
    // 每次页面显示时都重新获取用户信息
    await this.getUserInfo();
    
    // 只有在用户已登录的情况下才加载数据
    if (this.data.userInfo && this.data.userInfo.nickName && 
        this.data.userInfo.nickName !== '未登录' && 
        this.data.userInfo.nickName !== '微信用户' &&
        this.data.userInfo.nickName.trim() !== '') {
      console.log('Profile页面：用户已登录，加载数据');
      this.loadUserData();
    } else {
      console.log('Profile页面：用户未登录，显示登录提示');
      // 清空所有数据
      this.clearAllData();
      // 显示登录提示
      this.showLoginPrompt();
    }
  },

  // 初始化奖励系统
  initRewardSystem() {
    this.rewardSystem = new RewardSystem();
    this.rewardSystem.init();
    this.updateRewardSystemData();
  },

  // 更新奖励系统数据到页面
  updateRewardSystemData() {
    const status = this.rewardSystem.getCurrentStatus();
    const rewardHistory = this.rewardSystem.getRewardHistory();
    const penaltyHistory = this.rewardSystem.getPenaltyHistory();
    
    this.setData({
      phoneUsageRights: status.phoneUsageRights,
      phoneRecoveryDays: status.phoneRecoveryDays,
      isPhoneRecovered: status.isPhoneRecovered,
      rewardHistory: rewardHistory.slice(0, 5), // 只显示最近5条
      penaltyHistory: penaltyHistory.slice(0, 5)
    });
  },

  // 初始化页面
  initPage() {
    console.log('Profile页面：初始化页面');
    this.getUserInfo();
    this.loadSettings();
    this.calculateCacheSize();
    this.initAchievements();
  },

  // 获取用户信息 - 优先从全局状态和本地存储获取
  async getUserInfo() {
    console.log('Profile页面：开始获取用户信息');
    
    try {
      const app = getApp();
      
      // 1. 首先尝试从全局状态获取
      let userInfo = app.globalData.userInfo;
      console.log('Profile页面：全局状态用户信息:', userInfo);
      
      // 2. 如果全局状态没有，尝试从本地存储获取
      if (!userInfo || !userInfo.nickName || userInfo.nickName === '微信用户') {
        const localUserInfo = wx.getStorageSync('userInfo');
        console.log('Profile页面：本地存储用户信息:', localUserInfo);
        
        if (localUserInfo && localUserInfo.nickName && localUserInfo.nickName !== '微信用户') {
          userInfo = localUserInfo;
          // 同步到全局状态
          app.globalData.userInfo = userInfo;
          app.globalData.isLoggedIn = true;
          console.log('Profile页面：从本地存储同步用户信息到全局状态');
        }
      }
      
      // 3. 如果本地也没有，尝试从云端获取
      if (!userInfo || !userInfo.nickName || userInfo.nickName === '微信用户') {
        console.log('Profile页面：本地无有效用户信息，尝试从云端获取');
        try {
          const cloudResult = await CloudApi.getUserInfo();
          console.log('Profile页面：云端获取用户信息结果:', cloudResult);
          
          if (cloudResult.success && cloudResult.data && cloudResult.data.nickName && cloudResult.data.nickName !== '微信用户') {
            userInfo = cloudResult.data;
            // 更新全局状态和本地存储
            app.setUserInfo(userInfo);
            console.log('Profile页面：从云端获取用户信息并更新全局状态');
          }
        } catch (cloudError) {
          console.error('Profile页面：从云端获取用户信息失败:', cloudError);
        }
      }
      
      // 4. 检查用户信息的有效性
      const hasValidUserInfo = userInfo && 
                              userInfo.nickName && 
                              userInfo.nickName !== '微信用户' && 
                              userInfo.nickName !== '未登录' &&
                              userInfo.nickName.trim() !== '';
      
      // 5. 设置用户信息到页面
      if (hasValidUserInfo) {
        console.log('Profile页面：设置有效用户信息:', userInfo);
        // 确保头像URL正确
        if (userInfo.avatarUrl && userInfo.avatarUrl.startsWith('http://')) {
          userInfo.avatarUrl = userInfo.avatarUrl.replace('http://', 'https://');
        }
        this.setData({ userInfo });
      } else {
        console.log('Profile页面：没有有效用户信息，显示默认状态');
        this.setData({
          userInfo: {
            nickName: '未登录',
            avatarUrl: '/images/default-avatar.png'
          }
        });
      }
      
    } catch (error) {
      console.error('Profile页面：获取用户信息失败:', error);
      this.setData({
        userInfo: {
          nickName: '未登录',
          avatarUrl: '/images/default-avatar.png'
        }
      });
    }
  },

  // 页面级别的用户信息更新方法（由app.js调用）
  updateUserInfo(userInfo) {
    console.log('Profile页面：收到用户信息更新通知:', userInfo);
    
    if (userInfo && userInfo.nickName && 
        userInfo.nickName !== '微信用户' && 
        userInfo.nickName !== '未登录' &&
        userInfo.nickName.trim() !== '') {
      
      // 确保头像URL正确
      if (userInfo.avatarUrl && userInfo.avatarUrl.startsWith('http://')) {
        userInfo.avatarUrl = userInfo.avatarUrl.replace('http://', 'https://');
      }
      
      this.setData({ userInfo: userInfo });
      console.log('Profile页面：用户信息已更新到:', userInfo);
      
      // 如果之前显示的是未登录状态，现在有了用户信息，重新加载数据
      if (this.data.totalDays === 0 && this.data.streakDays === 0) {
        console.log('Profile页面：检测到用户登录，重新加载数据');
        this.loadUserData();
      }
    } else {
      // 用户退出登录或信息无效
      console.log('Profile页面：用户已退出登录或信息无效，清空数据');
      this.setData({
        userInfo: {
          nickName: '未登录',
          avatarUrl: '/images/default-avatar.png'
        }
      });
      this.clearAllData();
    }
  },

  // 调试方法：显示当前状态
  debugCurrentState() {
    const app = getApp();
    const localUserInfo = wx.getStorageSync('userInfo');
    
    console.log('=== Profile页面状态调试 ===');
    console.log('页面用户信息:', this.data.userInfo);
    console.log('全局登录状态:', app.globalData.isLoggedIn);
    console.log('全局用户信息:', app.globalData.userInfo);
    console.log('本地存储用户信息:', localUserInfo);
    console.log('=========================');
  },

  // 加载用户数据 - 只加载统计数据，不覆盖用户信息
  async loadUserData() {
    wx.showLoading({ title: '加载数据中...' })
    
    try {
      console.log('Profile页面：开始加载统计数据');
      
      // 获取统计数据
      const statsResult = await CloudApi.getStats()
      if (statsResult.success) {
        const stats = statsResult.data
        console.log('Profile页面：获取统计数据成功:', stats);
        this.setData({
          totalDays: stats.totalDays || 0,
          streakDays: stats.consecutiveDays || 0,
          totalVideos: stats.totalImages || 0,
          totalWords: (stats.totalDiaries || 0) + (stats.totalQuestions || 0),
          totalMistakes: stats.totalMistakeImages || 0
        })
      } else {
        console.log('Profile页面：获取统计数据失败，使用默认值');
        // 没有数据时设置默认值
        this.setData({
          totalDays: 0,
          streakDays: 0,
          totalVideos: 0,
          totalWords: 0,
          totalMistakes: 0
        })
      }
      
      wx.hideLoading()
      // 更新成就进度
      this.updateAchievements()
    } catch (error) {
      console.error('Profile页面：加载统计数据失败:', error)
      wx.hideLoading()
      
      // 设置默认值
      this.setData({
        totalDays: 0,
        streakDays: 0,
        totalVideos: 0,
        totalWords: 0,
        totalMistakes: 0
      })
      
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    }
  },

  // 计算真实的统计数据
  calculateRealStatistics(records) {
    if (!records || records.length === 0) {
      return {
        totalDays: 0,
        continuousDays: 0,
        totalVideos: 0,
        totalWords: 0
      }
    }

    let totalDays = records.length
    let totalVideos = 0
    let totalWords = 0

    // 遍历所有记录计算统计数据
    records.forEach(record => {
      // 统计视频数量
      if (record.videoUrl) {
        totalVideos++
      }

      // 统计字数
      if (record.diary) {
        totalWords += record.diary.length
      }

      // 统计问题字数
      if (record.questions && Array.isArray(record.questions)) {
        record.questions.forEach(q => {
          if (q && typeof q === 'string') {
            totalWords += q.length
          }
        })
      }
    })

    // 计算连续天数
    const continuousDays = this.calculateContinuousDays(records)

    return {
      totalDays,
      continuousDays,
      totalVideos,
      totalWords
    }
  },

  // 计算连续天数
  calculateContinuousDays(records) {
    if (!records || records.length === 0) return 0

    // 按日期排序（最新的在前）
    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    let continuousDays = 0
    const today = new Date()
    let checkDate = new Date(today)

    // 从今天开始往前检查连续天数
    for (let i = 0; i < sortedRecords.length; i++) {
      const recordDate = new Date(sortedRecords[i].date)
      const checkDateStr = checkDate.toISOString().split('T')[0]
      const recordDateStr = recordDate.toISOString().split('T')[0]

      if (recordDateStr === checkDateStr) {
        continuousDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        // 如果不连续，检查是否是第一天就不连续
        if (i === 0) {
          // 第一条记录就不是今天，检查是否是昨天
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
  },

  // 初始化成就系统
  initAchievements() {
    const achievements = [
      {
        id: 1,
        name: '初学者',
        description: '完成第一次打卡',
        icon: '🌱',
        target: 1,
        progress: 0,
        unlocked: false
      },
      {
        id: 2,
        name: '坚持者',
        description: '连续打卡7天',
        icon: '🔥',
        target: 7,
        progress: 0,
        unlocked: false
      },
      {
        id: 3,
        name: '学习达人',
        description: '累计打卡30天',
        icon: '⭐',
        target: 30,
        progress: 0,
        unlocked: false
      }
    ]
    
    this.setData({ achievements })
  },

  // 更新成就进度
  updateAchievements() {
    const { totalDays, streakDays } = this.data
    const achievements = this.data.achievements.map(achievement => {
      let progress = 0
      
      switch (achievement.id) {
        case 1: // 初学者
          progress = totalDays
          break
        case 2: // 坚持者
          progress = streakDays
          break
        case 3: // 学习达人
          progress = totalDays
          break
      }
      
      return {
        ...achievement,
        progress: Math.min(progress, achievement.target),
        unlocked: progress >= achievement.target
      }
    })
    
    // 计算已解锁成就数量
    const unlockedCount = achievements.filter(item => item.unlocked).length
    
    this.setData({ 
      achievements,
      unlockedCount
    })
  },


  // 加载设置
  loadSettings() {
    try {
      const reminderEnabled = wx.getStorageSync('reminderEnabled') !== false
      const syncEnabled = wx.getStorageSync('syncEnabled') === true
      this.setData({ reminderEnabled, syncEnabled })
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  },

  // 计算缓存大小
  calculateCacheSize() {
    try {
      const info = wx.getStorageInfoSync()
      const sizeKB = Math.round(info.currentSize)
      let cacheSize = ''
      if (sizeKB < 1024) {
        cacheSize = `${sizeKB}KB`
      } else {
        cacheSize = `${(sizeKB / 1024).toFixed(1)}MB`
      }
      this.setData({ cacheSize })
    } catch (error) {
      this.setData({ cacheSize: '未知' })
    }
  },

  // 更换头像或登录
  changeAvatar() {
    // 检查用户是否已登录
    if (!this.data.userInfo || !this.data.userInfo.nickName || this.data.userInfo.nickName === '未登录') {
      // 未登录，跳转到用户信息完善页面
      wx.showModal({
        title: '需要登录',
        content: '请先完善个人信息后再使用个人中心功能',
        confirmText: '去完善',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/userProfile/userProfile?from=pages/profile/profile'
            })
          }
        }
      });
      return;
    }

    // 已登录，跳转到用户信息完善页面进行修改
    wx.navigateTo({
      url: '/pages/userProfile/userProfile?from=pages/profile/profile'
    })
  },

  // 更新头像
  async updateAvatar(filePath) {
    try {
      wx.showLoading({ title: '上传头像中...' })
      
      // 上传头像到云存储
      const uploadResult = await CloudApi.uploadFile(filePath, 'avatar.jpg', 'avatar')
      if (!uploadResult.success) {
        throw new Error('头像上传失败')
      }
      
      const userInfo = { ...this.data.userInfo, avatarUrl: uploadResult.data.fileID }
      
      // 保存到云数据库
      const saveResult = await CloudApi.saveUserInfo(userInfo)
      if (!saveResult.success) {
        throw new Error('用户信息保存失败')
      }
      
      // 更新页面状态
      this.setData({ userInfo })
      
      // 更新全局用户信息和本地存储
      const app = getApp()
      app.setUserInfo(userInfo)
      
      console.log('Profile页面：头像更新后的用户信息:', userInfo)
      
      wx.hideLoading()
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('更新头像失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'error'
      })
    }
  },

  // 导出数据
  exportData() {
    this.setData({ showExportModal: true })
  },

  hideExportModal() {
    this.setData({ showExportModal: false })
  },

  // 选择导出类型
  selectExportType(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ exportType: type })
  },

  // 选择日期范围
  selectDateRange(e) {
    const { range } = e.currentTarget.dataset
    this.setData({ dateRange: range })
  },

  // 确认导出
  async confirmExport() {
    wx.showLoading({ title: '生成中...' })
    
    try {
      const { exportType, dateRange } = this.data
      
      // 获取打卡记录
      const result = await CloudApi.getCheckinRecords()
      if (!result.success) {
        throw new Error('获取记录失败')
      }
      
      let filteredRecords = result.data
      const now = new Date()
      
      // 根据日期范围筛选数据
      if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filteredRecords = filteredRecords.filter(record => new Date(record.date) >= weekAgo)
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filteredRecords = filteredRecords.filter(record => new Date(record.date) >= monthAgo)
      }
      
      // 生成导出数据
      const exportData = this.generateExportData(filteredRecords, exportType)
      
      // 复制到剪贴板
      wx.setClipboardData({
        data: exportData,
        success: () => {
          wx.hideLoading()
          this.hideExportModal()
          wx.showToast({
            title: '数据已复制到剪贴板',
            icon: 'success'
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({
            title: '导出失败',
            icon: 'error'
          })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('导出数据失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      })
     }
  },

  // 生成导出数据
  generateExportData(records, format) {
    if (format === 'excel') {
      // CSV格式
      let csv = '日期,预习问题,视频数量,学习日记,图片数量\n'
      records.forEach(record => {
        const questions = record.questions ? record.questions.join(';') : ''
        const videoCount = record.video ? 1 : 0
        const diary = record.diary || ''
        const imageCount = record.images ? record.images.length : 0
        csv += `${record.date},"${questions}",${videoCount},"${diary}",${imageCount}\n`
      })
      return csv
    } else {
      // PDF格式（文本）
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
      return text
    }
  },

  // 提醒开关变化
  toggleReminder(e) {
    const enabled = e.detail.value
    this.setData({ reminderEnabled: enabled })
    wx.setStorageSync('reminderEnabled', enabled)
    
    wx.showToast({
      title: enabled ? '提醒已开启' : '提醒已关闭',
      icon: 'success'
    })
  },

  // 同步开关变化
  toggleSync(e) {
    const enabled = e.detail.value
    this.setData({ syncEnabled: enabled })
    wx.setStorageSync('syncEnabled', enabled)
    
    wx.showToast({
      title: enabled ? '同步已开启' : '同步已关闭',
      icon: 'success'
    })
  },

  // 分享应用
  shareApp() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 意见反馈
  feedback() {
    wx.showModal({
      title: '意见反馈',
      content: '感谢您的使用！如有建议或问题，请通过微信联系我们。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 关于我们
  about() {
    wx.showModal({
      title: '关于Learning Tracker',
      content: 'Learning Tracker是一款专注于学习打卡的小程序，帮助您养成良好的学习习惯。\n\n版本: 1.0.0\n开发者: Learning Team',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: 'Learning Tracker - 我的学习打卡记录',
      path: '/pages/checkin/checkin',
      imageUrl: '/images/default-avatar.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'Learning Tracker - 坚持学习，每天进步',
      imageUrl: '/images/default-avatar.png'
    }
  },

  // 清空所有数据
  clearAllData() {
    this.setData({
      totalDays: 0,
      streakDays: 0,
      totalVideos: 0,
      totalWords: 0,
      totalMistakes: 0,
      unlockedCount: 0
    });
    this.initAchievements(); // 重置成就
  },

  // 显示登录提示
  showLoginPrompt() {
    // 只在第一次显示时弹出提示，避免重复弹出
    if (!this.loginPromptShown) {
      this.loginPromptShown = true;
      
      setTimeout(() => {
        wx.showModal({
          title: '需要登录',
          content: '查看个人信息需要先登录，是否前往登录？',
          confirmText: '去登录',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/checkin/checkin'
              });
            }
          },
          complete: () => {
            // 重置标记，下次进入页面时可以再次显示
            this.loginPromptShown = false;
          }
        });
      }, 500); // 延迟显示，避免页面切换时的冲突
    }
  },

  // ========== 奖励系统相关方法 ==========

  // 显示奖励历史
  showRewardHistory() {
    this.setData({ showRewardModal: true });
  },

  // 显示惩罚历史
  showPenaltyHistory() {
    this.setData({ showPenaltyModal: true });
  },

  // 显示手机使用权管理
  showPhoneUsageManager() {
    this.setData({ showPhoneUsageModal: true });
  },

  // 关闭奖励模态框
  hideRewardModal() {
    this.setData({ showRewardModal: false });
  },

  // 关闭惩罚模态框
  hidePenaltyModal() {
    this.setData({ showPenaltyModal: false });
  },

  // 关闭手机使用权模态框
  hidePhoneUsageModal() {
    this.setData({ showPhoneUsageModal: false });
  },

  // 使用手机时间
  usePhoneTime(e) {
    const { minutes } = e.currentTarget.dataset;
    const result = this.rewardSystem.usePhoneTime(minutes);
    
    if (result.success) {
      this.updateRewardSystemData();
      wx.showToast({
        title: result.message,
        icon: 'success',
        duration: 3000
      });
    } else {
      wx.showModal({
        title: '无法使用',
        content: result.message,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 格式化时间显示
  formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}分钟`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    }
  },

  // 获取状态颜色
  getStatusColor(isRecovered) {
    return isRecovered ? '#FA5151' : '#07C160';
  },

  // 获取状态文本
  getStatusText(isRecovered, recoveryDays) {
    if (isRecovered) {
      return `手机已回收 ${recoveryDays}天`;
    } else {
      return '手机使用正常';
    }
  }
})