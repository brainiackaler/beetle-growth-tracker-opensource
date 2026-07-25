/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../utils/api';
import { translate as tr, translateValue as tv } from '../i18n';


const getTodayString = () => new Date().toISOString().split('T')[0];

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().split('T')[0];
};

const REMINDER_PRESETS = {
  WOOD_CHIPS: {
    label: '换木屑',
    title: '甲虫换木屑提醒',
    message: '该换木屑了，顺便检查湿度、食痕和木屑消耗。',
    intervalDays: 30
  },
  LARVA_CHECK: {
    label: '检查幼虫',
    title: '幼虫状态检查',
    message: '该检查幼虫状态了，观察体重、活动、湿度和木屑状态。',
    intervalDays: 7
  },
  WEIGH: {
    label: '称重记录',
    title: '甲虫称重提醒',
    message: '该称重并更新成长记录了。',
    intervalDays: 14
  },
  FEEDING: {
    label: '补充果冻',
    title: '成虫喂食提醒',
    message: '该检查果冻和成虫进食状态了。',
    intervalDays: 3
  },
  CUSTOM: {
    label: '自定义',
    title: '甲虫养护提醒',
    message: '有一条自定义养护提醒到期了。',
    intervalDays: 7
  }
};

const createEmptyRule = (type = 'WOOD_CHIPS') => {
  const preset = REMINDER_PRESETS[type] || REMINDER_PRESETS.CUSTOM;
  return {
    id: '',
    beetleId: '',
    reminderType: type,
    title: tr(preset.title),
    message: tr(preset.message),
    intervalDays: preset.intervalDays,
    nextReminderDate: addDays(preset.intervalDays),
    enabled: true
  };
};

const getBeetleLabel = (beetle) => (
  [
    beetle.name || tr('未命名'),
    tv(beetle.species),
    beetle.subspecies ? `(${tv(beetle.subspecies)})` : '',
    tv(beetle.gender)
  ]
    .filter(Boolean)
    .join(' ')
);

const getRuleStatus = (rule) => {
  if (!rule.enabled) return { text: '已停用', color: 'var(--text-muted)' };
  if (!rule.nextReminderDate) return { text: '未设置日期', color: 'var(--text-secondary)' };
  return rule.nextReminderDate <= getTodayString()
    ? { text: '今天到期', color: '#ffd65a' }
    : { text: tr('{date} 提醒', { date: rule.nextReminderDate }), color: 'var(--accent-color)' };
};

const normalizeTelegramStatus = (value = {}) => ({
  configured: value.configured === true,
  bound: value.bound === true,
  enabled: value.enabled === true,
  username: value.username || '',
  displayName: value.displayName || '',
  botUsername: value.botUsername || '',
  boundAt: value.boundAt || ''
});

export default function ReminderManagement({ showToast, setConfirmModal, onGoHome }) {
  const [settings, setSettings] = useState({
    barkServerUrl: 'https://api.day.app',
    barkDeviceKey: '',
    enabled: true
  });
  const [telegram, setTelegram] = useState(() => normalizeTelegramStatus());
  const [telegramBindUrl, setTelegramBindUrl] = useState('');
  const [telegramAction, setTelegramAction] = useState('');
  const [rules, setRules] = useState([]);
  const [beetles, setBeetles] = useState([]);
  const [form, setForm] = useState(() => createEmptyRule());
  const [editingId, setEditingId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingRule, setSavingRule] = useState(false);

  const beetleMap = useMemo(() => {
    const map = new Map();
    beetles.forEach(beetle => map.set(beetle.id, beetle));
    return map;
  }, [beetles]);

  const loadData = useCallback(async () => {
    try {
      const [reminderData, beetleData] = await Promise.all([
        api.request('/api/reminders'),
        api.request('/api/beetles')
      ]);
      setSettings({
        barkServerUrl: reminderData.settings?.barkServerUrl || 'https://api.day.app',
        barkDeviceKey: reminderData.settings?.barkDeviceKey || '',
        enabled: reminderData.settings?.enabled !== false
      });
      setTelegram(normalizeTelegramStatus(reminderData.telegram));
      setRules(reminderData.rules || []);
      setBeetles(beetleData.items || []);
    } catch {
      showToast('加载提醒设置失败', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePresetChange = (type) => {
    const preset = REMINDER_PRESETS[type] || REMINDER_PRESETS.CUSTOM;
    setForm(prev => ({
      ...prev,
      reminderType: type,
      title: tr(preset.title),
      message: tr(preset.message),
      intervalDays: preset.intervalDays,
      nextReminderDate: addDays(preset.intervalDays)
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const data = await api.request('/api/reminders/settings', {
        method: 'PUT',
        data: settings
      });
      setSettings({
        barkServerUrl: data.item?.barkServerUrl || 'https://api.day.app',
        barkDeviceKey: data.item?.barkDeviceKey || '',
        enabled: data.item?.enabled !== false
      });
      showToast('Bark 设置已保存', 'success');
    } catch (err) {
      showToast(err.message || '保存 Bark 设置失败', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStartTelegramBinding = async () => {
    const telegramWindow = window.open('', '_blank');
    setTelegramAction('binding');
    try {
      const data = await api.request('/api/reminders/telegram/bind', { method: 'POST' });
      setTelegramBindUrl(data.url || '');
      if (telegramWindow && data.url) {
        telegramWindow.opener = null;
        telegramWindow.location.href = data.url;
      } else if (telegramWindow) {
        telegramWindow.close();
      }
      showToast('请在 Telegram 中点击 Start 完成绑定', 'success');
    } catch (err) {
      if (telegramWindow) telegramWindow.close();
      showToast(err.message || '创建 Telegram 绑定链接失败', 'error');
    } finally {
      setTelegramAction('');
    }
  };

  const handleRefreshTelegramStatus = async () => {
    setTelegramAction('refreshing');
    try {
      const data = await api.request('/api/reminders/telegram');
      const next = normalizeTelegramStatus(data);
      setTelegram(next);
      if (next.bound) {
        setTelegramBindUrl('');
        showToast('Telegram 已绑定成功', 'success');
      } else {
        showToast('尚未检测到绑定，请先在 Telegram 中点击 Start', 'error');
      }
    } catch (err) {
      showToast(err.message || '检查 Telegram 绑定失败', 'error');
    } finally {
      setTelegramAction('');
    }
  };

  const handleSaveTelegramSettings = async () => {
    setTelegramAction('saving');
    try {
      const data = await api.request('/api/reminders/telegram', {
        method: 'PUT',
        data: { enabled: telegram.enabled }
      });
      setTelegram(normalizeTelegramStatus(data));
      showToast('Telegram 设置已保存', 'success');
    } catch (err) {
      showToast(err.message || '保存 Telegram 设置失败', 'error');
    } finally {
      setTelegramAction('');
    }
  };

  const handleTestTelegram = async () => {
    setTelegramAction('testing');
    try {
      await api.request('/api/reminders/telegram/test', { method: 'POST' });
      showToast('Telegram 测试通知已发送', 'success');
    } catch (err) {
      showToast(err.message || 'Telegram 测试推送失败', 'error');
    } finally {
      setTelegramAction('');
    }
  };

  const handleUnbindTelegram = () => {
    setConfirmModal({
      show: true,
      title: '解绑 Telegram',
      message: '解绑后，养护提醒将不再发送到这个 Telegram 账号。确定继续吗？',
      onConfirm: async () => {
        setTelegramAction('unbinding');
        try {
          const data = await api.request('/api/reminders/telegram/bind', { method: 'DELETE' });
          setTelegram(normalizeTelegramStatus(data));
          setTelegramBindUrl('');
          setConfirmModal(prev => ({ ...prev, show: false }));
          showToast('Telegram 已解绑', 'success');
        } catch (err) {
          showToast(err.message || '解绑 Telegram 失败', 'error');
        } finally {
          setTelegramAction('');
        }
      }
    });
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await api.request('/api/reminders/settings', {
        method: 'PUT',
        data: settings
      });
      await api.request('/api/reminders/test', { method: 'POST' });
      showToast('测试通知已发送，请查看手机', 'success');
    } catch (err) {
      showToast(err.message || '测试推送失败，请检查 Bark Key', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast('请输入提醒标题', 'error');
    if (!form.message.trim()) return showToast('请输入提醒内容', 'error');
    if (!form.intervalDays || Number(form.intervalDays) < 1) return showToast('提醒间隔至少为 1 天', 'error');
    if (!form.nextReminderDate) return showToast('请选择下次提醒日期', 'error');

    setSavingRule(true);
    try {
      const payload = {
        ...form,
        title: tv(form.title),
        message: tv(form.message),
        intervalDays: Number(form.intervalDays),
        beetleId: form.beetleId || ''
      };
      const data = await api.request(editingId ? `/api/reminders/${encodeURIComponent(editingId)}` : '/api/reminders', {
        method: editingId ? 'PUT' : 'POST',
        data: payload
      });
      setRules(prev => {
        const next = editingId
          ? prev.map(rule => rule.id === editingId ? data.item : rule)
          : [...prev, data.item];
        return next.sort((a, b) => (a.nextReminderDate || '').localeCompare(b.nextReminderDate || ''));
      });
      setForm(createEmptyRule());
      setEditingId('');
      showToast(editingId ? '提醒已更新' : '提醒已创建', 'success');
    } catch (err) {
      showToast(err.message || '保存提醒失败', 'error');
    } finally {
      setSavingRule(false);
    }
  };

  const handleEditRule = (rule) => {
    setEditingId(rule.id);
    setForm({
      id: rule.id,
      beetleId: rule.beetleId || '',
      reminderType: rule.reminderType || 'CUSTOM',
      title: rule.title || tr('甲虫养护提醒'),
      message: rule.message || '',
      intervalDays: rule.intervalDays || 7,
      nextReminderDate: rule.nextReminderDate || addDays(rule.intervalDays || 7),
      enabled: rule.enabled !== false
    });
  };

  const handleCancelEdit = () => {
    setEditingId('');
    setForm(createEmptyRule());
  };

  const handleDeleteRule = (rule) => {
    setConfirmModal({
      show: true,
      title: '删除提醒',
      message: tr('确定删除「{title}」吗？', { title: rule.title || tr('甲虫提醒') }),
      onConfirm: async () => {
        try {
          await api.request(`/api/reminders/${encodeURIComponent(rule.id)}`, { method: 'DELETE' });
          setRules(prev => prev.filter(item => item.id !== rule.id));
          if (editingId === rule.id) handleCancelEdit();
          setConfirmModal(prev => ({ ...prev, show: false }));
          showToast('提醒已删除', 'success');
        } catch {
          showToast('删除提醒失败', 'error');
        }
      }
    });
  };

  const handleSendNow = async (rule) => {
    try {
      const data = await api.request(`/api/reminders/${encodeURIComponent(rule.id)}/send-now`, { method: 'POST' });
      setRules(prev => prev.map(item => item.id === rule.id ? data.item : item));
      showToast('提醒已发送，并已安排下次提醒', 'success');
    } catch (err) {
      showToast(err.message || '发送失败，请检查通知通道设置', 'error');
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-header-left">
          <button className="btn-back" onClick={onGoHome}>{tr("🏠 返回首页")}</button>
          <h2 className="view-title">{tr("🔔 通知提醒")}</h2>
        </div>
      </div>

      <form className="card" onSubmit={handleSaveSettings}>
        <div className="section-title">{tr("Bark 通知设置")}</div>
        <div className="form-group">
          <label className="input-label">Bark Server</label>
          <input
            className="input"
            value={settings.barkServerUrl}
            onChange={e => setSettings(prev => ({ ...prev, barkServerUrl: e.target.value }))}
            placeholder="https://api.day.app"
          />
        </div>
        <div className="form-group">
          <label className="input-label">Bark Key</label>
          <input
            className="input"
            value={settings.barkDeviceKey}
            onChange={e => setSettings(prev => ({ ...prev, barkDeviceKey: e.target.value }))}
            placeholder={tr("从 Bark App 首页复制 Key")}
          />
        </div>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={e => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          {tr("启用 Bark 通知")}
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="submit" disabled={savingSettings}>
            {savingSettings ? tr("保存中...") : tr("保存设置")}
          </button>
          <button className="btn btn-ghost" type="button" onClick={handleTest} disabled={testing || !settings.barkDeviceKey.trim()}>
            {testing ? tr("发送中...") : tr("测试推送")}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="section-title">{tr("Telegram 通知")}</div>
        {!telegram.configured ? (
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            background: 'color-mix(in srgb, var(--warning-color, #ffd65a) 10%, transparent)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            fontSize: '13px'
          }}>
            {tr("服务端尚未配置 Telegram Bot。配置完成后即可在这里一键绑定。")}
          </div>
        ) : telegram.bound ? (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '14px',
              marginBottom: '16px',
              borderRadius: '12px',
              background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)'
            }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {tr("已绑定")} {telegram.username ? `@${telegram.username}` : telegram.displayName || tr("Telegram 账号")}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                  {telegram.botUsername ? `${tr('机器人')} @${telegram.botUsername}` : 'Telegram Bot'}
                  {telegram.boundAt ? ` · ${telegram.boundAt}` : ''}
                </div>
              </div>
              <span className="detail-tag" style={{ margin: 0 }}>{tr("连接正常")}</span>
            </div>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={telegram.enabled}
                onChange={e => setTelegram(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              {tr("启用 Telegram 通知")}
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={handleSaveTelegramSettings} disabled={!!telegramAction}>
                {telegramAction === 'saving' ? tr("保存中...") : tr("保存设置")}
              </button>
              <button className="btn btn-ghost" type="button" onClick={handleTestTelegram} disabled={!!telegramAction || !telegram.enabled}>
                {telegramAction === 'testing' ? tr("发送中...") : tr("测试推送")}
              </button>
              <button className="btn btn-danger" type="button" onClick={handleUnbindTelegram} disabled={!!telegramAction}>
                {telegramAction === 'unbinding' ? tr("解绑中...") : tr("解绑")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7, marginBottom: '16px' }}>
              {tr("点击绑定后会打开 Telegram。请在机器人会话中点击 Start，绑定链接 10 分钟内有效。")}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={handleStartTelegramBinding} disabled={!!telegramAction}>
                {telegramAction === 'binding' ? tr("正在生成...") : tr("绑定 Telegram")}
              </button>
              {(telegramBindUrl || telegramAction === 'refreshing') && (
                <button className="btn btn-ghost" type="button" onClick={handleRefreshTelegramStatus} disabled={!!telegramAction}>
                  {telegramAction === 'refreshing' ? tr("检查中...") : tr("我已点击 Start，检查绑定")}
                </button>
              )}
              {telegramBindUrl && (
                <a className="btn btn-ghost" href={telegramBindUrl} target="_blank" rel="noreferrer">
                  {tr("重新打开 Telegram")}
                </a>
              )}
            </div>
          </>
        )}
      </div>

      <form className="card" onSubmit={handleSaveRule}>
        <div className="section-title">{editingId ? tr("编辑提醒") : tr("新建提醒")}</div>
        <div className="form-group">
          <label className="input-label">{tr("提醒类型")}</label>
          <select className="select" value={form.reminderType} onChange={e => handlePresetChange(e.target.value)}>
            {Object.entries(REMINDER_PRESETS).map(([value, preset]) => (
              <option key={value} value={value}>{tr(preset.label)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="input-label">{tr("关联甲虫")}</label>
          <select className="select" value={form.beetleId} onChange={e => setForm(prev => ({ ...prev, beetleId: e.target.value }))}>
            <option value="">{tr("不关联具体甲虫")}</option>
            {beetles.map(beetle => (
              <option key={beetle.id} value={beetle.id}>{getBeetleLabel(beetle)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="input-label">{tr("标题")}</label>
          <input className="input" value={tv(form.title)} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="input-label">{tr("提醒内容")}</label>
          <textarea
            className="input"
            rows="3"
            value={tv(form.message)}
            onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
            style={{ resize: 'vertical', minHeight: '90px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="input-label">{tr("间隔天数")}</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.intervalDays}
              onChange={e => setForm(prev => ({ ...prev, intervalDays: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="input-label">{tr("下次提醒")}</label>
            <input
              className="input"
              type="date"
              value={form.nextReminderDate}
              onChange={e => setForm(prev => ({ ...prev, nextReminderDate: e.target.value }))}
            />
          </div>
        </div>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          {tr("启用这条提醒")}
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="submit" disabled={savingRule}>
            {savingRule ? tr("保存中...") : editingId ? tr("保存修改") : tr("创建提醒")}
          </button>
          {editingId && (
            <button className="btn btn-ghost" type="button" onClick={handleCancelEdit}>
              {tr("取消编辑")}
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <div className="section-title">{tr("提醒列表")}</div>
        {rules.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
            {tr("还没有提醒，先为常用养护动作创建一条吧")}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rules.map(rule => {
              const status = getRuleStatus(rule);
              const beetle = beetleMap.get(rule.beetleId);
              return (
                <div key={rule.id} className="beetle-item" style={{ alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <strong>{tv(rule.title || '甲虫提醒')}</strong>
                      <span className="detail-tag" style={{ margin: 0 }}>{tr(REMINDER_PRESETS[rule.reminderType]?.label || '自定义')}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                      {beetle ? `${getBeetleLabel(beetle)}: ` : ''}{tv(rule.message)}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span style={{ color: status.color }}>{tr(status.text)}</span>
                      <span>{tr("每")} {rule.intervalDays || 1} {tr("天")}</span>
                      {rule.lastSentAt && <span>{tr("上次发送")} {rule.lastSentAt}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" type="button" onClick={() => handleSendNow(rule)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                      {tr("立即发送")}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => handleEditRule(rule)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                      {tr("编辑")}
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => handleDeleteRule(rule)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                      {tr("删除")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
