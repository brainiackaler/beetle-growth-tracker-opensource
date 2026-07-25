import { translate as tr, useI18n } from '../i18n';

const LANGUAGE_LABELS = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English'
};

export default function LanguageSwitcher({ compact = false }) {
  const { mode, language, deviceLanguage, setMode } = useI18n();

  return (
    <label className={`language-switcher${compact ? ' language-switcher-compact' : ''}`}>
      <span aria-hidden="true">🌐</span>
      {!compact && <span className="language-switcher-label">{tr('界面语言')}</span>}
      <select
        value={mode}
        onChange={event => setMode(event.target.value)}
        aria-label={tr('界面语言')}
        title={`${tr('当前语言')}: ${LANGUAGE_LABELS[language]}`}
      >
        <option value="system">{tr('跟随系统')} ({LANGUAGE_LABELS[deviceLanguage]})</option>
        <option value="zh-CN">简体中文</option>
        <option value="zh-TW">繁體中文</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
