// 上传组件逻辑
const app = getApp()

Component({
  properties: {
    type: {
      type: String,
      value: 'image' // image | video | file
    },
    maxSize: {
      type: Number,
      value: 10 * 1024 * 1024 // 10MB
    },
    uploadText: {
      type: String,
      value: '点击上传'
    },
    hint: {
      type: String,
      value: ''
    },
    accept: {
      type: String,
      value: '' // 文件类型限制
    }
  },

  data: {
    uploading: false,
    progress: 0,
    fileUrl: '',
    coverUrl: '',
    fileName: ''
  },

  methods: {
    chooseFile() {
      const { type } = this.properties
      
      switch (type) {
        case 'image':
          this.chooseImage()
          break
        case 'video':
          this.chooseVideo()
          break
        case 'file':
          this.chooseFile()
          break
      }
    },

    chooseImage() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.uploadFile(res.tempFilePaths[0])
        }
      })
    },

    chooseVideo() {
      wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 300, // 5分钟
        success: (res) => {
          if (res.size > this.properties.maxSize) {
            wx.showToast({
              title: '文件过大',
              icon: 'error'
            })
            return
          }
          this.uploadFile(res.tempFilePath)
        }
      })
    },

    chooseMessageFile() {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: (res) => {
          const file = res.tempFiles[0]
          if (file.size > this.properties.maxSize) {
            wx.showToast({
              title: '文件过大',
              icon: 'error'
            })
            return
          }
          this.setData({ fileName: file.name })
          this.uploadFile(file.path)
        }
      })
    },

    uploadFile(filePath) {
      this.setData({ 
        uploading: true, 
        progress: 0 
      })

      const uploadTask = wx.uploadFile({
        url: `${app.globalData.apiBase}/upload/${this.properties.type}`,
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.success) {
              this.setData({
                fileUrl: data.url,
                coverUrl: data.cover || '',
                uploading: false,
                progress: 100
              })
              
              // 触发成功事件
              this.triggerEvent('success', {
                url: data.url,
                cover: data.cover,
                fileName: this.data.fileName
              })
              
              setTimeout(() => {
                this.setData({ progress: 0 })
              }, 1000)
            } else {
              this.handleUploadError(data.message || '上传失败')
            }
          } catch (error) {
            this.handleUploadError('响应解析失败')
          }
        },
        fail: (error) => {
          this.handleUploadError('网络错误')
        }
      })

      // 监听上传进度
      uploadTask.onProgressUpdate((res) => {
        this.setData({
          progress: res.progress
        })
      })
    },

    handleUploadError(message) {
      this.setData({ 
        uploading: false, 
        progress: 0 
      })
      
      wx.showToast({
        title: message,
        icon: 'error'
      })
      
      // 触发错误事件
      this.triggerEvent('error', { message })
    },

    deleteFile() {
      this.setData({
        fileUrl: '',
        coverUrl: '',
        fileName: ''
      })
      
      // 触发删除事件
      this.triggerEvent('delete')
    },

    // 外部调用方法
    reset() {
      this.setData({
        uploading: false,
        progress: 0,
        fileUrl: '',
        coverUrl: '',
        fileName: ''
      })
    },

    getFileInfo() {
      return {
        url: this.data.fileUrl,
        cover: this.data.coverUrl,
        fileName: this.data.fileName
      }
    }
  }
})