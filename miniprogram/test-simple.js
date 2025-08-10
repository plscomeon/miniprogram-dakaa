// Simple test for checkin functionality
console.log('=== Testing Checkin Functionality ===')

// Mock wx object for testing
global.wx = {
  setStorageSync: function(key, data) {
    console.log('setStorageSync:', key, JSON.stringify(data))
  },
  getStorageSync: function(key) {
    console.log('getStorageSync:', key)
    if (key === 'checkin_records') return []
    if (key === 'userInfo') return null
    return null
  },
  clearStorageSync: function() {
    console.log('clearStorageSync called')
  }
}

const Storage = require('./utils/storage.js')

// Test save checkin record
console.log('\nTesting save checkin record...')
const checkinData = {
  date: '2024-08-10',
  questions: ['What did you learn today?'],
  videoUrl: '/temp/video.mp4',
  diary: 'Today I learned WeChat mini-program development!',
  images: []
}

const result = Storage.saveCheckinRecord(checkinData)
console.log('Result:', result)

console.log('\n=== Test Complete ===')