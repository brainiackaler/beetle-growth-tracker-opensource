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
  const token = localStorage.getItem('beetle_token') || sessionStorage.getItem('beetle_token') || '';
  const passcode = localStorage.getItem('beetle_passcode') || sessionStorage.getItem('beetle_passcode') || '';
  const headers = {
    'Content-Type': 'application/json',
    'X-Passcode': passcode,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  // Show global loading
  window.dispatchEvent(new CustomEvent('beetle-loading', { detail: true }));

  try {
    const res = await fetch(url, config);
    if (res.status === 204) {
      return null;
    }

    // Auto logout if unauthorized, but only if we had a token
    if (res.status === 401 && token) {
      localStorage.removeItem('beetle_token');
      sessionStorage.removeItem('beetle_token');
      localStorage.removeItem('beetle_username');
      sessionStorage.removeItem('beetle_username');
      window.location.reload();
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON response: ${res.status}`);
      }
    }
    if (res.ok) {
      return data;
    } else {
      throw new Error(data?.error || text || `API Error: ${res.status}`);
    }
  } catch (err) {
    console.error('[API] Fail:', err);
    throw err;
  } finally {
    // Hide global loading
    window.dispatchEvent(new CustomEvent('beetle-loading', { detail: false }));
  }
}

export function uploadFile(file, onProgress) {
  const base = getApiBase();
  const url = base + '/api/upload';
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('beetle_token') || sessionStorage.getItem('beetle_token') || '';
  const passcode = localStorage.getItem('beetle_passcode') || sessionStorage.getItem('beetle_passcode') || '';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (passcode) xhr.setRequestHeader('X-Passcode', passcode);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        if (xhr.status === 413) {
          reject(new Error('图片文件过大，请选择小于 50MB 的图片后重试'));
          return;
        }
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.error || `Upload Error: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload Error: ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network Error during upload"));
    };

    xhr.send(formData);
  });
}
