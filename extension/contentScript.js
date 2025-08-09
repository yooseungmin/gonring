// 선택된 텍스트와 페이지 정보를 감지하는 contentScript.js

// 페이지 정보 가져오기
function getPageInfo() {
  return {
    url: window.location.href,
    title: document.title,
    favIconUrl: getFavicon(),
    selectedText: ''
  };
}

// 파비콘 URL 찾기
function getFavicon() {
  const linkElement = document.querySelector("link[rel*='icon']");
  if (linkElement) {
    return linkElement.href;
  }
  return `${window.location.origin}/favicon.ico`;
}

// 텍스트 선택 이벤트 감지
document.addEventListener('mouseup', function() {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    // 선택된 텍스트가 있으면 저장
    const pageInfo = getPageInfo();
    pageInfo.selectedText = selectedText;
    
    // 익스텐션에 선택된 텍스트 정보 전송
    chrome.runtime.sendMessage({
      action: 'textSelected',
      data: pageInfo
    });
  }
});

// 익스텐션으로부터의 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    const pageInfo = getPageInfo();
    // 현재 선택된 텍스트 가져오기
    pageInfo.selectedText = window.getSelection().toString().trim();
    sendResponse(pageInfo);
  }
  return true; // 비동기 응답 가능하도록
});
