// 文件上传云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'getUploadUrl':
        return await getUploadUrl(openid, data)
      case 'deleteFile':
        return await deleteFile(data.fileID)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('文件上传云函数错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 获取上传URL
async function getUploadUrl(openid, fileData) {
  const { fileName, fileType } = fileData
  
  // 生成唯一的文件路径
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 15)
  const cloudPath = `${openid}/${fileType}/${timestamp}_${randomStr}_${fileName}`

  try {
    // 获取上传URL
    const result = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(''), // 空内容，实际上传由小程序端完成
    })

    return {
      success: true,
      data: {
        cloudPath: cloudPath,
        fileID: result.fileID
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '获取上传URL失败: ' + error.message
    }
  }
}

// 删除文件
async function deleteFile(fileID) {
  try {
    await cloud.deleteFile({
      fileList: [fileID]
    })

    return {
      success: true,
      message: '文件删除成功'
    }
  } catch (error) {
    return {
      success: false,
      message: '文件删除失败: ' + error.message
    }
  }
}