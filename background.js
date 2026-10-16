/**
 * background.js 鈥?Service Worker
 *
 * 鑱岃矗锛? *   1. 澶勭悊涓嬭浇璇锋眰锛坈hrome.downloads锛? *   2. 杞彂妯″紡鍒囨崲閫氱煡鍒版墍鏈?tab
 *   3. 鍝嶅簲 popup 鐨勬煡璇? *   4. 澶囩敤瑙嗛URL鑾峰彇
 */

// ============================================================
//  涓嬭浇
// ============================================================
async function handleDownload(url, filename) {
  try {
    const downloadId = await chrome.downloads.download({
      url: url,
      filename: filename || 'doubao_' + Date.now() + '.mp4',
      saveAs: false,
      conflictAction: 'uniquify'
    })
    return { success: true, downloadId }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// ============================================================
//  閫氱煡鎵€鏈?doubao tab 鍒囨崲妯″紡
// ============================================================
async function broadcastMode(value) {
  await chrome.storage.local.set({ df_mode15s: value })
  const tabs = await chrome.tabs.query({ url: 'https://www.doubao.com/*' })
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: '__DF_modeChanged', value }).catch(() => {})
  }
}

// ============================================================
//  娑堟伅鐩戝惉
// ============================================================
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  // --- 涓嬭浇 ---
  if (msg.type === '__DF_download') {
    handleDownload(msg.url, msg.filename).then(sendResponse)
    return true
  }

  // --- 鍒囨崲15绉掓ā寮?---
  if (msg.type === '__DF_setMode') {
    broadcastMode(msg.value).then(() => sendResponse({ success: true }))
    return true
  }

  // --- 鏌ヨ褰撳墠妯″紡 ---
  if (msg.type === '__DF_getMode') {
    chrome.storage.local.get('df_mode15s', function (r) {
      sendResponse({ value: r.df_mode15s === true })
    })
    return true
  }

  // --- 瑙嗛鍙戠幇锛堜粎缁熻锛?--
  if (msg.type === '__DF_videoFound') {
    // 鏆備笉澶勭悊锛岀暀浣滄湭鏉ユ墿灞?    sendResponse({ success: true })
    return true
  }

  // --- 妫€鏌ユ洿鏂?---
  if (msg.type === '__DF_CHECK_UPDATE') {
    checkUpdate().then(sendResponse)
    return true
  }

  // --- 鑾峰彇瑙嗛鍒嗕韩URL锛堝鐢級---
  if (msg.type === '__DF_getVideoShareUrl') {
    getVideoShareUrl(msg.vid).then(sendResponse)
    return true
  }
})

// ============================================================
//  鐗堟湰鏇存柊妫€鏌?// ============================================================
const CURRENT_VERSION = chrome.runtime.getManifest().version
const REPO = 'YGtemple/doubao-free'

async function checkUpdate() {
  try {
    const resp = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    const data = await resp.json()
    const latest = (data.tag_name || '').replace(/^v/, '')
    if (latest && latest !== CURRENT_VERSION) {
      // 鏈夋洿鏂帮紝璁剧疆瑙掓爣
      chrome.action.setBadgeText({ text: 'NEW' })
      chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' })
      await chrome.storage.local.set({
        df_update: { version: latest, url: data.html_url, notes: (data.body || '').slice(0, 300) }
      })
      return { hasUpdate: true, latest, url: data.html_url }
    }
    await chrome.storage.local.set({ df_update: null })
    chrome.action.setBadgeText({ text: '' })
    return { hasUpdate: false }
  } catch {
    return { hasUpdate: false, error: 'check failed' }
  }
}

// 鍚姩鍜屾瘡灏忔椂妫€鏌ヤ竴娆?checkUpdate()
setInterval(checkUpdate, 3600000)

// ============================================================
//  澶囩敤锛氶€氳繃璞嗗寘鍒嗕韩API鑾峰彇瑙嗛URL
// ============================================================
async function getVideoShareUrl(vid) {
  try {
    const url = 'https://www.doubao.com/samantha/media/get_play_info?aid=497858&device_platform=web&samantha_web=1&use-olympus-account=1&version_code=20800&pkg_type=release_version&web_tab_id=' + crypto.randomUUID()
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key: vid, type: 'video' })
    })
    const j = await resp.json()
    if (j.code === 0 && j.data) {
      const om = j.data.original_media_info
      if (om?.main_url) {
        return { mainUrl: om.main_url.replace(/lr=[^&]+/g, 'lr=video_gen_no_watermark'), width: om.width, height: om.height }
      }
      const pi = j.data.play_infos?.[0] || j.data.play_info
      if (pi?.main) {
        return { mainUrl: pi.main.replace(/lr=[^&]+/g, 'lr=video_gen_no_watermark'), width: pi.width, height: pi.height }
      }
    }
    return null
  } catch (e) {
    return null
  }
}

