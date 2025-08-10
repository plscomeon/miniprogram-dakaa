// pages/record-detail/record-detail.js
const Storage = require('../../utils/storage.js')

Page({
  data: {
    record: null,
    dayOfWeek: ''
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.loadRecord(id)
    } else {
      wx.showToast({
        title: '记录ID不存在',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 加载记录详情
  loadRecord(id) {
    try {
      const allRecords = Storage.getCheckinRecords()
      const record = allRecords.find(r => r.id === id)
      if (record) {
        // 计算星期几
        const date = new Date(record.date)
        const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
        
        this.setData({
          record,
          dayOfWeek
        })
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: `${record.date} 学习记录`
        })
      } else {
        wx.showToast({
          title: '记录不存在',
          icon: 'error'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      wx.showToast({
        title: '加载记录失败',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset
    const { record } = this.data
    
    wx.previewImage({
      current: record.images[index],
      urls: record.images
    })
  },

  // 分享记录
  shareRecord() {
    const { record } = this.data
    
    wx.showActionSheet({
      itemList: ['分享给朋友', '分享到朋友圈'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 分享给朋友
          wx.showShareMenu({
            withShareTicket: true,
            menus: ['shareAppMessage']
          })
        } else if (res.tapIndex === 1) {
          // 分享到朋友圈
          wx.showShareMenu({
            withShareTicket: true,
            menus: ['shareTimeline']
          })
        }
      }
    })
  },

  // 导出记录
  exportRecord() {
    const { record } = this.data
    
    wx.showActionSheet({
      itemList: ['复制文本', '保存图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.copyToClipboard()
        } else if (res.tapIndex === 1) {
          this.saveAsImage()
        }
      }
    })
  },

  // 复制到剪贴板
  copyToClipboard() {
    const { record, dayOfWeek } = this.data
    
    let text = `📚 学习打卡记录\n\n`
    text += `📅 日期：${record.date} ${dayOfWeek}\n\n`
    
    if (record.questions && record.questions.length > 0) {
      text += `❓ 预习提问：\n`
      record.questions.forEach((question, index) => {
        text += `${index + 1}. ${question}\n`
      })
      text += `\n`
    }
    
    if (record.videoUrl) {
      text += `🎥 视频讲解：已上传\n\n`
    }
    
    if (record.diary) {
      text += `📝 学习日记：\n${record.diary}\n\n`
    }
    
    if (record.images && record.images.length > 0) {
      text += `📷 图片附件：${record.images.length}张\n\n`
    }
    
    text += `✨ 通过Learning Tracker记录`
    
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  },

  // 保存为图片
  saveAsImage() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 页面分享配置
  onShareAppMessage() {
    const { record } = this.data
    return {
      title: `我的${record.date}学习打卡记录`,
      path: `/pages/record-detail/record-detail?id=${record.id}`,
      imageUrl: record.images && record.images.length > 0 ? record.images[0] : ''
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { record } = this.data
    return {
      title: `我的${record.date}学习打卡记录`,
      imageUrl: record.images && record.images.length > 0 ? record.images[0] : ''
    }
  }
})