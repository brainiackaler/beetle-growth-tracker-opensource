import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './context';
import {
  getDeviceLanguage,
  getInitialMode,
  LANGUAGE_MODES,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  setActiveLanguage,
  translate
} from './runtime';

export default function I18nProvider({ children }) {
  const [mode, setModeState] = useState(getInitialMode);
  const [deviceLanguage, setDeviceLanguage] = useState(getDeviceLanguage);
  const language = mode === 'system' ? normalizeLanguage(deviceLanguage) : normalizeLanguage(mode);

  useEffect(() => {
    const handleLanguageChange = () => {
      const nextDeviceLanguage = getDeviceLanguage();
      if (mode === 'system') {
        setActiveLanguage(nextDeviceLanguage);
      }
      setDeviceLanguage(nextDeviceLanguage);
    };
    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, mode);
    document.documentElement.lang = language;
    document.title = translate('甲虫成长记录 - 追踪与记录甲虫成长曲线');
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      translate('甲虫成长记录网页版是一个本地运行的甲虫饲养数据记录工具，支持记录体重、体长、温度和湿度，生成可视化的成长图表，并支持多照片上传保存。数据全部安全储存在本地嵌入式数据库中。')
    );
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute(
      'content',
      translate('甲虫成长记录')
    );
  }, [language, mode]);

  const setMode = useCallback(nextMode => {
    if (LANGUAGE_MODES.includes(nextMode)) {
      setActiveLanguage(nextMode === 'system' ? getDeviceLanguage() : nextMode);
      setModeState(nextMode);
    }
  }, []);

  const value = useMemo(() => ({
    mode,
    language,
    deviceLanguage: normalizeLanguage(deviceLanguage),
    setMode,
    t: translate
  }), [deviceLanguage, language, mode, setMode]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
