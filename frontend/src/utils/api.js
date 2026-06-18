// Retrieve API Base from localStorage (so user can change it dynamically if needed)
export function getApiBase() {
  const custom = localStorage.getItem('beetle_api_base');
  if (custom) return custom;
  
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) return envBase;
  
  return import.meta.env.DEV ? 'http://localhost:8088' : '';
}

export function setApiBase(url) {
  let cleanUrl = url.trim();
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  localStorage.setItem('beetle_api_base', cleanUrl);
}

export async function request(path, options = {}) {
  const base = getApiBase();
  const url = base + path;
  console.log('[API] Request:', options.method || 'GET', url);
  
  const passcode = localStorage.getItem('beetle_passcode') || sessionStorage.getItem('beetle_passcode') || '';
  const headers = {
    'Content-Type': 'application/json',
    'X-Passcode': passcode,
    ...(options.headers || {})
  };
  
  const config = {
    method: options.method || 'GET',
    headers,
  };
  
  if (options.data) {
    config.body = JSON.stringify(options.data);
  }
  
  try {
    const res = await fetch(url, config);
    console.log('[API] Response Status:', res.status);
    
    if (res.status === 204) {
      return null;
    }
    
    const data = await res.json();
    if (res.ok) {
      return data;
    } else {
      throw new Error(data.error || `API Error: ${res.status}`);
    }
  } catch (err) {
    console.error('[API] Fail:', err);
    throw err;
  }
}

export async function uploadFile(file) {
  const base = getApiBase();
  const url = base + '/api/upload';
  const formData = new FormData();
  formData.append('file', file);
  
  const passcode = localStorage.getItem('beetle_passcode') || sessionStorage.getItem('beetle_passcode') || '';
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Passcode': passcode
      }
      // Note: Do NOT set Content-Type header when uploading FormData, 
      // the browser will automatically set it with the boundary!
    });
    
    const data = await res.json();
    if (res.ok) {
      return data;
    } else {
      throw new Error(data.error || `Upload Error: ${res.status}`);
    }
  } catch (err) {
    console.error('[API] Upload Fail:', err);
    throw err;
  }
}
