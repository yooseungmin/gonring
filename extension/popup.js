// popup.js - 팝업 UI의 동작을 처리하는 스크립트

// API 기본 URL
const API_BASE_URL = 'http://localhost:8000/api/v1';

// DOM 요소
const boxSelectEl = document.getElementById('boxSelect');
const contentTitleEl = document.getElementById('contentTitle');
const selectedTextEl = document.getElementById('selectedText');
const notesEl = document.getElementById('notes');
const tagInputEl = document.getElementById('tagInput');
const tagContainerEl = document.getElementById('tagContainer');
const addTagButtonEl = document.getElementById('addTagButton');
const saveButtonEl = document.getElementById('saveButton');
const errorMessageEl = document.getElementById('errorMessage');
const successMessageEl = document.getElementById('successMessage');
const loadingEl = document.getElementById('loading');
const pageUrlEl = document.getElementById('pageUrl');

// 태그 목록
let tags = [];

// 팝업이 열릴 때 페이지 정보와 저장된 박스 목록 가져오기
document.addEventListener('DOMContentLoaded', async () => {
  // 현재 활성화된 탭에서 정보 가져오기
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    
    // 페이지 URL 표시
    pageUrlEl.textContent = tab.url;
    pageUrlEl.title = tab.url;
    
    // 컨텐츠 스크립트에서 선택된 텍스트 가져오기
    chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (response) => {
      if (response && response.selectedText) {
        selectedTextEl.value = response.selectedText;
      }
    });
    
    // 사용자의 박스 목록 가져오기
    await fetchBoxes();
  });
});

// 태그 추가 버튼 클릭
addTagButtonEl.addEventListener('click', () => {
  addTag();
});

// 태그 입력 필드에서 Enter 키 누름
tagInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag();
  }
});

// 저장 버튼 클릭
saveButtonEl.addEventListener('click', async () => {
  await saveContent();
});

// 사용자의 박스 목록 가져오기
async function fetchBoxes() {
  try {
    // 스토리지에서 토큰 가져오기
    const token = await getAuthToken();
    
    if (!token) {
      showError('인증 정보가 없습니다. 먼저 TB Hub에 로그인해주세요.');
      return;
    }
    
    // 박스 목록 가져오기
    const response = await fetch(`${API_BASE_URL}/boxes/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('박스 목록을 가져오는데 실패했습니다.');
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      // 박스 목록 채우기
      boxSelectEl.innerHTML = '';
      
      if (result.data.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '박스가 없습니다. TB Hub에서 박스를 먼저 생성해주세요.';
        boxSelectEl.appendChild(option);
        saveButtonEl.disabled = true;
      } else {
        result.data.forEach(box => {
          const option = document.createElement('option');
          option.value = box.id;
          option.textContent = box.name + (box.is_public ? ' (공개)' : ' (비공개)');
          boxSelectEl.appendChild(option);
        });
      }
    } else {
      throw new Error(result.message || '박스 목록을 가져오는데 실패했습니다.');
    }
  } catch (error) {
    showError(error.message);
  }
}

// 태그 추가
function addTag() {
  const tagValue = tagInputEl.value.trim();
  
  if (tagValue && !tags.includes(tagValue)) {
    tags.push(tagValue);
    renderTags();
    tagInputEl.value = '';
  }
}

// 태그 삭제
function removeTag(index) {
  tags = tags.filter((_, i) => i !== index);
  renderTags();
}

// 태그 목록 렌더링
function renderTags() {
  tagContainerEl.innerHTML = '';
  
  tags.forEach((tag, index) => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.innerHTML = `
      ${tag}
      <span class="tag-remove" data-index="${index}">&times;</span>
    `;
    tagContainerEl.appendChild(tagElement);
  });
  
  // 태그 삭제 이벤트
  document.querySelectorAll('.tag-remove').forEach(element => {
    element.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      removeTag(index);
    });
  });
}

// 콘텐츠 저장
async function saveContent() {
  try {
    // 필수 입력값 확인
    if (!boxSelectEl.value) {
      showError('박스를 선택해주세요.');
      return;
    }
    
    if (!selectedTextEl.value.trim()) {
      showError('선택된 텍스트가 없습니다.');
      return;
    }
    
    // 로딩 상태 표시
    setLoading(true);
    
    // 스토리지에서 토큰 가져오기
    const token = await getAuthToken();
    
    if (!token) {
      showError('인증 정보가 없습니다. 먼저 TB Hub에 로그인해주세요.');
      setLoading(false);
      return;
    }
    
    // 현재 탭 정보 가져오기
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    
    // 콘텐츠 생성 API 요청
    const contentData = {
      title: contentTitleEl.value.trim() || undefined,
      text_content: selectedTextEl.value.trim(),
      url: currentTab.url,
      tags: tags.length > 0 ? tags.map(name => ({ name })) : undefined
    };
    
    if (notesEl.value.trim()) {
      contentData.text_content += '\n\n---\n' + notesEl.value.trim();
    }
    
    const boxId = boxSelectEl.value;
    
    const response = await fetch(`${API_BASE_URL}/boxes/${boxId}/contents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('콘텐츠가 성공적으로 저장되었습니다!');
      
      // 폼 초기화
      contentTitleEl.value = '';
      selectedTextEl.value = '';
      notesEl.value = '';
      tagInputEl.value = '';
      tags = [];
      renderTags();
    } else {
      throw new Error(result.message || '콘텐츠 저장에 실패했습니다.');
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

// 로딩 상태 설정
function setLoading(isLoading) {
  saveButtonEl.disabled = isLoading;
  loadingEl.style.display = isLoading ? 'block' : 'none';
}

// 에러 메시지 표시
function showError(message) {
  errorMessageEl.textContent = message;
  errorMessageEl.style.display = 'block';
  successMessageEl.style.display = 'none';
  
  setTimeout(() => {
    errorMessageEl.style.display = 'none';
  }, 5000);
}

// 성공 메시지 표시
function showSuccess(message) {
  successMessageEl.textContent = message;
  successMessageEl.style.display = 'block';
  errorMessageEl.style.display = 'none';
  
  setTimeout(() => {
    successMessageEl.style.display = 'none';
  }, 3000);
}

// 인증 토큰 가져오기 (localStorage에서)
async function getAuthToken() {
  return new Promise((resolve) => {
    // 첫번째로 localStorage에서 토큰 가져오기 시도
    chrome.storage.local.get(['auth_token'], (result) => {
      if (result.auth_token) {
        resolve(result.auth_token);
      } else {
        // 없으면 호스트 페이지에서 가져오기 시도
        chrome.tabs.executeScript({
          code: `
            (function() {
              return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            })()
          `
        }, (result) => {
          resolve(result ? result[0] : null);
        });
      }
    });
  });
}
