export const canSharePhotoFile = (file) => {
  if (
    !file ||
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
};

const downloadPhotoFile = (file) => {
  if (typeof document === 'undefined') return false;

  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name || `beetle-photo-${Date.now()}.jpg`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return true;
};

export const savePhotoToAlbum = async (file) => {
  if (!file) return 'unsupported';

  if (canSharePhotoFile(file)) {
    try {
      await navigator.share({
        files: [file],
        title: '保存甲虫照片到相册'
      });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Some browsers expose file sharing but reject it after returning from
      // the camera. Fall through to a normal image download in that case.
    }
  }

  return downloadPhotoFile(file) ? 'downloaded' : 'unsupported';
};

export const saveCapturedPhotoWithFeedback = async (file, notify) => {
  const showNotice = typeof notify === 'function' ? notify : () => {};
  const usesSystemPanel = canSharePhotoFile(file);

  if (usesSystemPanel) {
    showNotice('请在系统面板中选择“保存到照片”或“存储图像”', 'info');
  }

  try {
    const result = await savePhotoToAlbum(file);
    if (result === 'downloaded') {
      showNotice('浏览器无法直接写入相册，已下载原图；请在下载内容中移入相册', 'info');
    } else if (result === 'cancelled') {
      showNotice('照片已加入上传，但尚未保存到相册', 'info');
    } else if (result === 'unsupported') {
      showNotice('照片已加入上传，但当前浏览器不支持保存原图', 'error');
    }
    return result;
  } catch {
    showNotice('照片已加入上传，但保存原图失败', 'error');
    return 'failed';
  }
};
