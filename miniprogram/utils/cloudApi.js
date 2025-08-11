// 云函数API调用工具类
class CloudApi {
  
  // 用户管理相关API
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
  static async uploadFile(filePath, fileName, fileType) {
    try {
      // 上传文件到云存储
      const cloudPath = `${fileType}/${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${fileName}`
      
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })

      return {
        success: true,
        data: {
          fileID: uploadResult.fileID,
          cloudPath: cloudPath
        }
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      return { success: false, message: error.message }
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
}

module.exports = CloudApi