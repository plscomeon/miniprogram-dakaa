// 文件上传管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()

  try {
    switch (action) {
      case 'deleteFile':
        return await deleteFile(data)
      case 'getTempFileURL':
        return await getTempFileURL(data)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return { success: false, message: error.message }
  }
}

// 删除文件
async function deleteFile({ fileID }) {
  try {
    await cloud.deleteFile({
      fileList: [fileID]
    })

    return {
      success: true,
      message: '文件删除成功'
    }
  } catch (error) {
    console.error('删除文件失败:', error)
    return { success: false, message: '删除文件失败' }
  }
}

// 获取临时链接
async function getTempFileURL({ fileIDList }) {
  try {
    const result = await cloud.getTempFileURL({
      fileList: fileIDList.map(fileID => ({ fileID }))
    })

    return {
      success: true,
      data: result.fileList
    }
  } catch (error) {
    console.error('获取临时链接失败:', error)
    return { success: false, message: '获取临时链接失败' }
  }
}