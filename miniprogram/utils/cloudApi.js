// 云函数API调用工具类
class CloudApi {
  
  // 用户管理相关API
  static async login(loginData) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'login',
          data: loginData
        }
      })
      return result.result
    } catch (error) {
      console.error('用户登录失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async saveUserInfo(userInfo) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'saveUserInfo',
          data: userInfo
        }
      })
      return result.result
    } catch (error) {
      console.error('保存用户信息失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async getUserInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'getUserInfo'
        }
      })
      return result.result
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async updateUserInfo(updateData) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'updateUserInfo',
          data: updateData
        }
      })
      return result.result
    } catch (error) {
      console.error('更新用户信息失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 打卡记录相关API
  static async saveCheckin(checkinData) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkinManager',
        data: {
          action: 'saveCheckin',
          data: checkinData
        }
      })
      return result.result
    } catch (error) {
      console.error('保存打卡记录失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async getCheckinRecords(params = {}) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkinManager',
        data: {
          action: 'getCheckinRecords',
          data: params
        }
      })
      return result.result
    } catch (error) {
      console.error('获取打卡记录失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async getCheckinByDate(date) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkinManager',
        data: {
          action: 'getCheckinByDate',
          data: { date }
        }
      })
      return result.result
    } catch (error) {
      console.error('获取指定日期打卡记录失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async updateCheckin(updateData) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkinManager',
        data: {
          action: 'updateCheckin',
          data: updateData
        }
      })
      return result.result
    } catch (error) {
      console.error('更新打卡记录失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async deleteCheckin(checkinId) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkinManager',
        data: {
          action: 'deleteCheckin',
          data: { id: checkinId }
        }
      })
      return result.result
    } catch (error) {
      console.error('删除打卡记录失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async getStats() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkinManager',
        data: {
          action: 'getStats'
        }
      })
      return result.result
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 文件上传相关API
  static async uploadFile(filePath, fileName, fileType, onProgress = null) {
    try {
      // 验证文件路径
      if (!filePath) {
        throw new Error('文件路径不能为空')
      }

      // 生成云存储路径
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 15)
      const cloudPath = `${fileType}/${timestamp}_${randomStr}_${fileName}`
      
      console.log('开始上传文件:', { filePath, cloudPath, fileType })

      // 上传文件到云存储
      const uploadTask = wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })

      // 监听上传进度
      if (onProgress && typeof onProgress === 'function') {
        uploadTask.onProgressUpdate((progress) => {
          console.log('上传进度:', progress)
          onProgress(progress)
        })
      }

      const uploadResult = await uploadTask

      console.log('文件上传成功:', uploadResult)

      return {
        success: true,
        data: {
          fileID: uploadResult.fileID,
          cloudPath: cloudPath
        },
        message: '文件上传成功'
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      
      let errorMessage = '文件上传失败'
      if (error.errMsg) {
        if (error.errMsg.includes('network')) {
          errorMessage = '网络连接失败，请检查网络后重试'
        } else if (error.errMsg.includes('size')) {
          errorMessage = '文件过大，请选择较小的文件'
        } else if (error.errMsg.includes('permission')) {
          errorMessage = '没有上传权限，请联系管理员'
        } else {
          errorMessage = error.errMsg
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      return { 
        success: false, 
        message: errorMessage,
        error: error
      }
    }
  }

  static async deleteFile(fileID) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'fileUpload',
        data: {
          action: 'deleteFile',
          data: { fileID }
        }
      })
      return result.result
    } catch (error) {
      console.error('删除文件失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 获取临时链接
  static async getTempFileURL(fileIDList) {
    try {
      const result = await wx.cloud.getTempFileURL({
        fileList: fileIDList.map(fileID => ({ fileID }))
      })
      return {
        success: true,
        data: result.fileList
      }
    } catch (error) {
      console.error('获取临时链接失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 奖励系统相关API
  static async getUserRewards() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'getUserRewards'
        }
      })
      return result.result
    } catch (error) {
      console.error('获取用户奖励信息失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async addCheckinReward(rewardData) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'addCheckinReward',
          data: rewardData
        }
      })
      return result.result
    } catch (error) {
      console.error('添加打卡奖励失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async usePhoneTime(minutes) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'usePhoneTime',
          data: { minutes }
        }
      })
      return result.result
    } catch (error) {
      console.error('使用手机时间失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async applyPenalty(penaltyData) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'applyPenalty',
          data: penaltyData
        }
      })
      return result.result
    } catch (error) {
      console.error('应用惩罚失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async getRewardStats() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'getRewardStats'
        }
      })
      return result.result
    } catch (error) {
      console.error('获取奖励统计失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async getUsageHistory() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'getUsageHistory'
        }
      })
      return result.result
    } catch (error) {
      console.error('获取使用历史失败:', error)
      return { success: false, message: error.message }
    }
  }

  static async recalculateRewards() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'rewardManager',
        data: {
          action: 'recalculateRewards'
        }
      })
      return result.result
    } catch (error) {
      console.error('重新计算奖励失败:', error)
      return { success: false, message: error.message }
    }
  }
}

module.exports = CloudApi