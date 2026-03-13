import { defineStore } from 'pinia'
import { ref } from 'vue'

function detectMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || /Mobile|Tablet/i.test(navigator.userAgent)
}

export const useDeviceStore = defineStore('device', () => {
  const isMobile = ref(detectMobileDevice())

  return {
    isMobile,
  }
})

