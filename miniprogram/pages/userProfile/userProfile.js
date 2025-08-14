// pages/userProfile/userProfile.js
const app = getApp()
const CloudApi = require('../../utils/cloudApi')

// 默认头像URL（微信官方提供）
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    avatarUrl: defaultAvatarUrl,
    nickname: '',
    submitting: false,
    canSubmit: false,
    fromPage: '' // 记录来源页面
  },

  onLoad(options) {
    console.log('用户信息完善页面加载', options)
    
    // 记录来源页面
    if (options.from) {
      this.setData({
        fromPage: options.from
      })
    }

    // 尝试获取已有的用户信息
    this.loadExistingUserInfo()
  },

  /**
   * 加载已有的用户信息
   */
  loadExistingUserInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        avatarUrl: userInfo.avatarUrl || defaultAvatarUrl,
        nickname: userInfo.nickName || '',
        canSubmit: !!(userInfo.nickName && userInfo.nickName.trim())
      })
    }
  },

  /**
   * 选择头像回调
   */
  onChooseAvatar(e) {
    console.log('选择头像', e.detail)
    const { avatarUrl } = e.detail
    
    this.setData({
      avatarUrl
    })
    
    this.checkCanSubmit()
    
    wx.showToast({
      title: '头像选择成功',
      icon: 'success',
      duration: 1500
    })
  },

  /**
   * 昵称输入
   */
  onNicknameInput(e) {
    const nickname = e.detail.value
    this.setData({
      nickname
    })
    this.checkCanSubmit()
  },

  /**
   * 昵称失焦检查
   */
  onNicknameBlur(e) {
    const nickname = e.detail.value.trim()
    if (nickname !== this.data.nickname) {
      this.setData({
        nickname
      })
      this.checkCanSubmit()
    }
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { nickname, avatarUrl } = this.data
    const canSubmit = !!(nickname && nickname.trim() && avatarUrl && avatarUrl !== defaultAvatarUrl)
    
    this.setData({
      canSubmit
    })
  },

  /**
   * 提交表单
   */
  async onSubmit(e) {
    console.log('提交用户信息', e.detail.value)
    
    const { nickname, avatarUrl } = this.data
    
    if (!nickname || !nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    if (avatarUrl === defaultAvatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    try {
      // 上传头像到云存储
      const uploadedAvatarUrl = await this.uploadAvatar(avatarUrl)
      
      // 保存用户信息到云端
      const userInfo = await this.saveUserInfo({
        nickName: nickname.trim(),
        avatarUrl: uploadedAvatarUrl
      })

      // 更新全局状态
      app.globalData.userInfo = userInfo
      app.globalData.isLogin = true

      // 保存到本地存储
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('isLogin', true)

      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      })

      // 延迟返回上一页
      setTimeout(() => {
        this.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('保存用户信息失败', error)
      wx.showToast({
        title: error.message || '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  /**
   * 上传头像到云存储
   */
  async uploadAvatar(tempFilePath) {
    return new Promise((resolve, reject) => {
      const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
      
      wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        success: (result) => {
          console.log('头像上传成功', result)
          resolve(result.fileID)
        },
        fail: (error) => {
          console.error('头像上传失败', error)
          reject(new Error('头像上传失败'))
        }
      })
    })
  },

  /**
   * 保存用户信息到云端
   */
  async saveUserInfo(userInfo) {
    try {
      const result = await CloudApi.updateUserInfo(userInfo)
      console.log('用户信息保存成功', result)
      return {
        ...userInfo,
        _id: result._id,
        _openid: result._openid
      }
    } catch (error) {
      console.error('保存用户信息到云端失败', error)
      throw new Error('保存用户信息失败')
    }
  },

  /**
   * 返回上一页
   */
  navigateBack() {
    const { fromPage } = this.data
    
    if (fromPage) {
      // 如果有指定来源页面，跳转到指定页面
      wx.redirectTo({
        url: `/${fromPage}`
      })
    } else {
      // 否则返回上一页
      wx.navigateBack({
        delta: 1
      })
    }
  },

  /**
   * 跳过设置（仅在非必须情况下显示）
   */
  skipSetup() {
    wx.showModal({
      title: '提示',
      content: '跳过设置将使用默认信息，您可以稍后在个人中心完善',
      confirmText: '确定跳过',
      cancelText: '继续设置',
      success: (res) => {
        if (res.confirm) {
          this.navigateBack()
        }
      }
    })
  }
})