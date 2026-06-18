/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from './utils/api';
import { parseVoiceText } from './utils/voiceParser';
import GrowthChart from './components/GrowthChart';

const beetleLogo = "/beetle_logo.png";

// Helper for today's date in YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const STAGES = ['卵', '一龄幼虫', '二龄幼虫', '三龄幼虫', '蛹', '成虫', '其他'];

const COMMON_SPECIES = [
  "长戟大兜虫",
  "海神大兜虫",
  "撒旦大兜虫",
  "亚克提恩大兜虫 (象兜)",
  "毛象大兜虫",
  "战神大兜虫",
  "南洋大兜虫",
  "美东白兜",
  "美西白兜",
  "独角仙 (双叉犀金龟)",
  "姬兜虫",
  "苏门答腊巨扁锹甲",
  "巴拉望巨扁锹甲",
  "中国大锹",
  "彩虹锹甲"
];

function getStageClass(stage = '') {
  if (stage.includes('卵')) return 'stage-egg';
  if (stage.includes('幼虫')) return 'stage-larva';
  if (stage.includes('蛹')) return 'stage-pupa';
  if (stage.includes('成虫')) return 'stage-adult';
  return '';
}

export default function App() {
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // Connection state
  const [apiBase, setApiBaseState] = useState(api.getApiBase());
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [backendStatus, setBackendStatus] = useState('disconnected'); // 'connected', 'disconnected'

  // Routing View State: 'list' | 'add-beetle' | 'detail' | 'add-record' | 'edit-beetle' | 'edit-record'
  const [currentView, setCurrentView] = useState('list');
  const [editingRecordId, setEditingRecordId] = useState('');

  // Security state
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [loginPasscode, setLoginPasscode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });


  // Data states
  const [beetles, setBeetles] = useState([]);
  const [activeBeetleId, setActiveBeetleId] = useState('');
  const [activeBeetle, setActiveBeetle] = useState(null);
  const [records, setRecords] = useState([]);

  // Form states
  const [beetleForm, setBeetleForm] = useState({
    name: '',
    species: '',
    hatchDate: getTodayString(),
    notes: ''
  });

  const [isCustomSpeciesAdd, setIsCustomSpeciesAdd] = useState(false);
  const [isCustomSpeciesEdit, setIsCustomSpeciesEdit] = useState(false);

  const [recordForm, setRecordForm] = useState({
    recordDate: getTodayString(),
    stage: '卵',
    weight: '',
    length: '',
    temperature: '',
    humidity: '',
    notes: ''
  });

  const [selectedImages, setSelectedImages] = useState([]); // array of { file, previewUrl }
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Voice Speech States
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  
  const recognitionRef = useRef(null);

  // Detect Speech Recognition support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const loadBeetles = useCallback(async () => {
    try {
      const data = await api.request('/api/beetles');
      setBeetles(data.items || []);
      setBackendStatus('connected');
      setIsAuthorized(true);
    } catch (err) {
      if (err.message && (err.message.includes('401') || err.message.includes('unauthorized'))) {
        setIsAuthorized(false);
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
        setBeetles([]);
      }
    }
  }, []);

  // Load beetles on mount or API Base change
  useEffect(() => {
    loadBeetles();
  }, [apiBase, loadBeetles]);

  const loadBeetleDetails = useCallback(async (id) => {
    try {
      const [beetleData, recordsData] = await Promise.all([
        api.request(`/api/beetles/${encodeURIComponent(id)}`),
        api.request(`/api/beetles/${encodeURIComponent(id)}/records`)
      ]);
      setActiveBeetle(beetleData.item || null);
      setRecords(recordsData.items || []);
    } catch {
      showToast('加载详情失败，请检查网络或后端状态', 'error');
    }
  }, [showToast]);

  // Load details when active beetle changes
  useEffect(() => {
    if (activeBeetleId) {
      loadBeetleDetails(activeBeetleId);
    } else {
      setTimeout(() => {
        setActiveBeetle(null);
        setRecords([]);
      }, 0);
    }
  }, [activeBeetleId, loadBeetleDetails]);



  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await api.request('/api/auth/login', {
        method: 'POST',
        data: { passcode: loginPasscode }
      });
      if (rememberMe) {
        localStorage.setItem('beetle_passcode', loginPasscode);
        sessionStorage.removeItem('beetle_passcode');
      } else {
        sessionStorage.setItem('beetle_passcode', loginPasscode);
        localStorage.removeItem('beetle_passcode');
      }
      setIsAuthorized(true);
      showToast('验证通过，已成功登录', 'success');
      loadBeetles();
      if (activeBeetleId) {
        loadBeetleDetails(activeBeetleId);
      }
    } catch {
      showToast('密匙验证失败，请重新输入', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('beetle_passcode');
    sessionStorage.removeItem('beetle_passcode');
    setIsAuthorized(false);
    setLoginPasscode('');
    setBeetles([]);
    setActiveBeetleId('');
    setActiveBeetle(null);
    setRecords([]);
    showToast('已安全退出登录', 'success');
  };



  const handleUpdateApiBase = (e) => {
    e.preventDefault();
    api.setApiBase(apiBase);
    setShowApiConfig(false);
    loadBeetles();
  };

  const handleBeetleFormChange = (key, val) => {
    setBeetleForm(prev => ({ ...prev, [key]: val }));
  };

  const handleRecordFormChange = (key, val) => {
    setRecordForm(prev => ({ ...prev, [key]: val }));
  };

  const handleCreateBeetle = async (e) => {
    e.preventDefault();
    if (!beetleForm.name.trim()) {
      showToast('请填写名称', 'error');
      return;
    }

    try {
      const res = await api.request('/api/beetles', {
        method: 'POST',
        data: beetleForm
      });
      showToast('甲虫新增成功！', 'success');
      setIsCustomSpeciesAdd(false);
      setBeetleForm({
        name: '',
        species: '',
        hatchDate: getTodayString(),
        notes: ''
      });
      
      // Refresh list
      const updatedList = await api.request('/api/beetles');
      setBeetles(updatedList.items || []);
      
      if (res.item && res.item.id) {
        setActiveBeetleId(res.item.id);
        setCurrentView('detail');
      } else {
        setCurrentView('list');
      }
    } catch (err) {
      showToast('保存失败: ' + err.message, 'error');
    }
  };

  const handleCancelAddBeetle = () => {
    setIsCustomSpeciesAdd(false);
    setBeetleForm({
      name: '',
      species: '',
      hatchDate: getTodayString(),
      notes: ''
    });
    setCurrentView('list');
  };

  const handleDeleteBeetle = () => {
    if (!activeBeetleId) return;
    setConfirmModal({
      show: true,
      title: '🗑️ 删除甲虫个体',
      message: '确定要删除这只甲虫吗？该操作将同时删除它的所有成长记录，且无法恢复！',
      onConfirm: async () => {
        try {
          await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}`, {
            method: 'DELETE'
          });
          showToast('已成功删除甲虫', 'success');
          setBeetles(prev => prev.filter(b => b.id !== activeBeetleId));
          setActiveBeetleId('');
          setCurrentView('list');
        } catch (err) {
          showToast('删除失败: ' + err.message, 'error');
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter to ensure max 9 images total
    const allowedCount = 9 - selectedImages.length;
    const addedImages = files.slice(0, allowedCount).map(file => ({
      type: 'local',
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setSelectedImages(prev => [...prev, ...addedImages]);
    e.target.value = '';
  };

  const handleRemoveSelectedImage = (index) => {
    setSelectedImages(prev => {
      const next = [...prev];
      if (next[index].type === 'local') {
        URL.revokeObjectURL(next[index].previewUrl);
      }
      next.splice(index, 1);
      return next;
    });
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!activeBeetleId) return;
    if (!recordForm.recordDate) {
      showToast('请填写记录日期', 'error');
      return;
    }

    try {
      // 1. Upload images if any
      let uploadedUrls = [];
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async img => {
          if (img.type === 'local') {
            const res = await api.uploadFile(img.file);
            return res.url;
          }
          return img.url;
        });
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.filter(url => url);
      }

      // 2. Submit growth record
      const finalRecordData = {
        ...recordForm,
        imageUrls: uploadedUrls.join(',')
      };

      await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/records`, {
        method: 'POST',
        data: finalRecordData
      });

      showToast('成长记录已保存！', 'success');

      // 3. Clear forms
      setRecordForm({
        recordDate: getTodayString(),
        stage: recordForm.stage,
        weight: '',
        length: '',
        temperature: '',
        humidity: '',
        notes: ''
      });
      selectedImages.forEach(img => {
        if (img.type === 'local') {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
      setSelectedImages([]);

      // 4. Reload details & go back
      await loadBeetleDetails(activeBeetleId);
      setCurrentView('detail');
    } catch (err) {
      showToast('保存失败: ' + err.message, 'error');
    }
  };

  const handleCancelAddRecord = () => {
    setRecordForm({
      recordDate: getTodayString(),
      stage: recordForm.stage,
      weight: '',
      length: '',
      temperature: '',
      humidity: '',
      notes: ''
    });
    selectedImages.forEach(img => {
      if (img.type === 'local') {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setSelectedImages([]);
    setCurrentView('detail');
  };

  // --- Edit Beetle Logic ---
  const handleEditBeetleClick = () => {
    if (!activeBeetle) return;
    const isCustom = activeBeetle.species && !COMMON_SPECIES.includes(activeBeetle.species);
    setIsCustomSpeciesEdit(!!isCustom);
    setBeetleForm({
      name: activeBeetle.name,
      species: activeBeetle.species,
      hatchDate: activeBeetle.hatchDate,
      notes: activeBeetle.notes
    });
    setCurrentView('edit-beetle');
  };

  const handleUpdateBeetle = async (e) => {
    e.preventDefault();
    if (!beetleForm.name.trim()) {
      showToast('请填写名称', 'error');
      return;
    }

    try {
      await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}`, {
        method: 'PUT',
        data: beetleForm
      });
      showToast('甲虫修改成功！', 'success');
      setIsCustomSpeciesEdit(false);
      
      // Refresh details and list
      await loadBeetleDetails(activeBeetleId);
      await loadBeetles();
      setCurrentView('detail');
    } catch (err) {
      showToast('修改失败: ' + err.message, 'error');
    }
  };

  const handleCancelEditBeetle = () => {
    setIsCustomSpeciesEdit(false);
    setCurrentView('detail');
  };

  // --- Edit Record Logic ---
  const handleEditRecordClick = (record) => {
    setEditingRecordId(record.id);
    setRecordForm({
      recordDate: record.recordDate,
      stage: record.stage || '卵',
      weight: record.weight || '',
      length: record.length || '',
      temperature: record.temperature || '',
      humidity: record.humidity || '',
      notes: record.notes || ''
    });

    const imgRelativeUrls = record.imageUrls
      ? record.imageUrls.split(',').filter(u => u)
      : [];

    const existing = imgRelativeUrls.map(url => ({
      type: 'remote',
      url: url,
      previewUrl: url.startsWith('http') ? url : api.getApiBase() + url
    }));
    setSelectedImages(existing);
    setCurrentView('edit-record');
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!activeBeetleId || !editingRecordId) return;
    if (!recordForm.recordDate) {
      showToast('请填写记录日期', 'error');
      return;
    }

    try {
      const uploadPromises = selectedImages.map(async img => {
        if (img.type === 'local') {
          const res = await api.uploadFile(img.file);
          return res.url;
        } else {
          return img.url;
        }
      });
      const results = await Promise.all(uploadPromises);
      const uploadedUrls = results.filter(url => url);

      const finalRecordData = {
        ...recordForm,
        imageUrls: uploadedUrls.join(',')
      };

      await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/records/${encodeURIComponent(editingRecordId)}`, {
        method: 'PUT',
        data: finalRecordData
      });

      showToast('成长记录已更新！', 'success');

      setRecordForm({
        recordDate: getTodayString(),
        stage: recordForm.stage,
        weight: '',
        length: '',
        temperature: '',
        humidity: '',
        notes: ''
      });
      selectedImages.forEach(img => {
        if (img.type === 'local') {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
      setSelectedImages([]);
      setEditingRecordId('');

      await loadBeetleDetails(activeBeetleId);
      setCurrentView('detail');
    } catch (err) {
      showToast('更新失败: ' + err.message, 'error');
    }
  };

  const handleCancelEditRecord = () => {
    setRecordForm({
      recordDate: getTodayString(),
      stage: recordForm.stage,
      weight: '',
      length: '',
      temperature: '',
      humidity: '',
      notes: ''
    });
    selectedImages.forEach(img => {
      if (img.type === 'local') {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setSelectedImages([]);
    setEditingRecordId('');
    setCurrentView('detail');
  };

  const handleDeleteRecord = (recordId) => {
    setConfirmModal({
      show: true,
      title: '🗑️ 删除成长记录',
      message: '确定删除这条成长记录吗？该操作无法恢复！',
      onConfirm: async () => {
        try {
          await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/records/${encodeURIComponent(recordId)}`, {
            method: 'DELETE'
          });
          showToast('记录已删除', 'success');
          loadBeetleDetails(activeBeetleId);
        } catch (err) {
          showToast('删除失败: ' + err.message, 'error');
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  // --- Voice Input Logic ---
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'zh-CN';

    rec.onstart = () => {
      setIsListening(true);
      setTranscribedText('');
    };

    rec.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setTranscribedText(finalTranscript || interimTranscript);
    };

    rec.onerror = (err) => {
      console.error('Speech recognition error:', err);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setShowVoiceModal(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleApplyVoiceResult = () => {
    stopListening();
    setShowVoiceModal(false);

    if (!transcribedText.trim()) return;

    const parsed = parseVoiceText(transcribedText);

    // Populate record form with parsed values
    setRecordForm(prev => {
      const next = { ...prev };
      if (parsed.weight) next.weight = parsed.weight;
      if (parsed.length) next.length = parsed.length;
      if (parsed.temperature) next.temperature = parsed.temperature;
      if (parsed.humidity) next.humidity = parsed.humidity;
      if (parsed.stage) next.stage = parsed.stage;

      // Append raw spoken text as a timestamped note
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const voiceNote = `[${timeStr} 语音导入]: ${transcribedText}`;
      next.notes = next.notes ? `${next.notes}\n${voiceNote}` : voiceNote;

      return next;
    });

    // Notify the user what was parsed
    const extractedFields = [];
    if (parsed.weight) extractedFields.push(`⚖️ 体重: ${parsed.weight}g`);
    if (parsed.length) extractedFields.push(`📏 体长: ${parsed.length}mm`);
    if (parsed.temperature) extractedFields.push(`🌡️ 温度: ${parsed.temperature}℃`);
    if (parsed.humidity) extractedFields.push(`💧 湿度: ${parsed.humidity}%`);
    if (parsed.stage) extractedFields.push(`🦋 生命阶段: ${parsed.stage}`);

    if (extractedFields.length > 0) {
      showToast(`语音解析成功！已自动填写：${extractedFields.join('，')}`, 'success');
    } else {
      showToast('已识别语音并填入“测量备注”中', 'success');
    }
  };

  // --- RENDER VIEW: Beetle List ---
  const renderList = () => (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div className="view-header">
        <h2 className="section-title">🌿 我的甲虫 ({beetles.length})</h2>
        <button className="btn btn-primary" onClick={() => setCurrentView('add-beetle')}>
          ➕ 新增甲虫
        </button>
      </div>

      {beetles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🌵</div>
            <div className="empty-state-text">还没有录入任何甲虫个体</div>
            <button className="btn btn-ghost btn-small" style={{ marginTop: '12px' }} onClick={() => setCurrentView('add-beetle')}>
              立即添加第一只
            </button>
          </div>
        </div>
      ) : (
        <div className="beetle-list-container">
          {beetles.map(beetle => (
            <div 
              key={beetle.id} 
              className="beetle-item-card"
              onClick={() => {
                setActiveBeetleId(beetle.id);
                setCurrentView('detail');
              }}
            >
              <div>
                <div className="beetle-item-name">{beetle.name}</div>
                <div className="beetle-item-species">
                  <span>🧬 {beetle.species || '未知品种'}</span>
                  {beetle.hatchDate && (
                    <span style={{ marginLeft: '12px' }}>📅 {beetle.hatchDate}</span>
                  )}
                </div>
              </div>
              <div className="beetle-item-arrow">›</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- RENDER VIEW: Add Beetle ---
  const renderAddBeetle = () => (
    <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
      <div className="view-header" style={{ marginBottom: '24px' }}>
        <button className="btn-back" onClick={handleCancelAddBeetle}>🔙 返回列表</button>
        <span className="view-title">✨ 新增甲虫个体</span>
      </div>

      <form onSubmit={handleCreateBeetle}>
        <div className="form-group">
          <label className="input-label">名字 / 代号</label>
          <input 
            type="text" 
            className="input" 
            value={beetleForm.name} 
            onChange={(e) => handleBeetleFormChange('name', e.target.value)}
            placeholder="例如 大力一号" 
            required
          />
        </div>
        <div className="form-group">
          <label className="input-label">品种</label>
          <select 
            className="select"
            value={isCustomSpeciesAdd ? "custom" : beetleForm.species}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "custom") {
                setIsCustomSpeciesAdd(true);
                handleBeetleFormChange('species', '');
              } else {
                setIsCustomSpeciesAdd(false);
                handleBeetleFormChange('species', val);
              }
            }}
          >
            <option value="">-- 请选择品种 --</option>
            {COMMON_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="custom">其他（手动输入）</option>
          </select>
          {isCustomSpeciesAdd && (
            <input 
              type="text" 
              className="input" 
              style={{ marginTop: '8px' }}
              value={beetleForm.species} 
              onChange={(e) => handleBeetleFormChange('species', e.target.value)}
              placeholder="请输入自定义品种名称" 
            />
          )}
        </div>
        <div className="form-group">
          <label className="input-label">孵化 / 购入日期</label>
          <input 
            type="date" 
            className="input" 
            value={beetleForm.hatchDate} 
            onChange={(e) => handleBeetleFormChange('hatchDate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="input-label">备注说明</label>
          <textarea 
            className="textarea" 
            value={beetleForm.notes} 
            onChange={(e) => handleBeetleFormChange('notes', e.target.value)}
            placeholder="来源、饲养盒配置、菌瓶批次等..."
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>💾 保存个体</button>
          <button type="button" className="btn btn-ghost" onClick={handleCancelAddBeetle} style={{ flex: 1 }}>取消</button>
        </div>
      </form>
    </div>
  );

  // --- RENDER VIEW: Beetle Details ---
  const renderDetail = () => {
    if (!activeBeetle) return null;
    return (
      <div style={{ animation: 'fadeIn 0.3s' }}>
        <div className="view-header">
          <button className="btn-back" onClick={() => setCurrentView('list')}>🔙 返回列表</button>
          <div className="detail-actions">
            <button className="btn btn-primary btn-small" onClick={handleEditBeetleClick}>✏️ 编辑甲虫</button>
            <button className="btn btn-danger btn-small" onClick={handleDeleteBeetle}>🗑️ 删除甲虫</button>
            <button className="btn btn-ghost btn-small" onClick={() => loadBeetleDetails(activeBeetleId)}>🔄 刷新</button>
          </div>
        </div>

        {/* Overview Card */}
        <div className="card beetle-detail-card">
          <div>
            <h2 className="detail-title">🪲 {activeBeetle.name}</h2>
            <div className="detail-tags">
              {activeBeetle.species && (
                <span className="detail-tag">🔬 {activeBeetle.species}</span>
              )}
              {activeBeetle.hatchDate && (
                <span className="detail-tag">📅 始于 {activeBeetle.hatchDate}</span>
              )}
            </div>
          </div>
          {activeBeetle.notes && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginTop: '6px' }}>
              <strong>个体备注：</strong>{activeBeetle.notes}
            </div>
          )}
        </div>

        {/* Growth Curve Chart */}
        <GrowthChart records={records} />

        {/* Historical Records Header & List */}
        <div>
          <div className="view-header" style={{ marginTop: '24px', marginBottom: '14px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>📋 测量记录 ({records.length})</h2>
            <button className="btn btn-primary btn-small" onClick={() => setCurrentView('add-record')}>
              ➕ 新增记录
            </button>
          </div>

          {records.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-text">还没有添加成长测量记录</div>
                <button className="btn btn-ghost btn-small" style={{ marginTop: '12px' }} onClick={() => setCurrentView('add-record')}>
                  添加第一条记录
                </button>
              </div>
            </div>
          ) : (
            <div className="records-container">
              {records.map(record => {
                const imgUrls = record.imageUrls
                  ? record.imageUrls.split(',').filter(u => u).map(u => u.startsWith('http') ? u : api.getApiBase() + u)
                  : [];
                
                return (
                  <div key={record.id} className="card record-card">
                    <div className="record-card-head">
                      <span className="record-card-date">📅 {record.recordDate}</span>
                      <span className={`stage-tag ${getStageClass(record.stage)}`}>
                        {record.stage || '未定义阶段'}
                      </span>
                    </div>

                    <div className="metric-grid">
                      <div className="metric-item">
                        <span className="metric-label">⚖️ 体重</span>
                        <span className="metric-value">
                          {record.weight ? `${record.weight}` : '-'}<span className="metric-unit"> g</span>
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">📏 体长</span>
                        <span className="metric-value">
                          {record.length ? `${record.length}` : '-'}<span className="metric-unit"> mm</span>
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">🌡️ 温度</span>
                        <span className="metric-value">
                          {record.temperature ? `${record.temperature}` : '-'}<span className="metric-unit"> ℃</span>
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">💧 湿度</span>
                        <span className="metric-value">
                          {record.humidity ? `${record.humidity}` : '-'}<span className="metric-unit"> %</span>
                        </span>
                      </div>
                    </div>

                    {record.notes && (
                      <p className="record-notes">{record.notes}</p>
                    )}

                    {imgUrls.length > 0 && (
                      <div className="img-grid">
                        {imgUrls.map((url, idx) => (
                          <div key={idx} className="img-wrap" style={{ cursor: 'pointer' }} onClick={() => setLightboxUrl(url)}>
                            <img src={url} alt={`record-img-${idx}`} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="record-card-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-small btn-primary" onClick={() => handleEditRecordClick(record)}>✏️ 编辑记录</button>
                      <button className="btn btn-ghost btn-small btn-danger" onClick={() => handleDeleteRecord(record.id)}>🗑️ 删除记录</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- RENDER VIEW: Add Record ---
  const renderAddRecord = () => {
    if (!activeBeetle) return null;
    return (
      <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
        <div className="view-header" style={{ marginBottom: '24px' }}>
          <button className="btn-back" onClick={handleCancelAddRecord}>🔙 取消返回</button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="view-title" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              记录: <strong>{activeBeetle.name}</strong>
            </span>
            {speechSupported && (
              <button type="button" className="btn-voice" onClick={startListening}>
                🎙️ 语音导入
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleCreateRecord}>
          <div className="form-grid-2x2">
            <div className="form-group">
              <label className="input-label">记录日期</label>
              <input 
                type="date" 
                className="input" 
                value={recordForm.recordDate} 
                onChange={(e) => handleRecordFormChange('recordDate', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="input-label">生命阶段</label>
              <select 
                className="select" 
                value={recordForm.stage} 
                onChange={(e) => handleRecordFormChange('stage', e.target.value)}
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid-2x2">
            <div className="form-group">
              <label className="input-label">体重 (g)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input" 
                value={recordForm.weight} 
                onChange={(e) => handleRecordFormChange('weight', e.target.value)}
                placeholder="⚖️ 输入体重" 
              />
            </div>
            <div className="form-group">
              <label className="input-label">体长 (mm)</label>
              <input 
                type="number" 
                step="0.1" 
                className="input" 
                value={recordForm.length} 
                onChange={(e) => handleRecordFormChange('length', e.target.value)}
                placeholder="📏 输入体长" 
              />
            </div>
          </div>

          <div className="form-grid-2x2">
            <div className="form-group">
              <label className="input-label">饲养温度 (℃)</label>
              <input 
                type="number" 
                step="0.1" 
                className="input" 
                value={recordForm.temperature} 
                onChange={(e) => handleRecordFormChange('temperature', e.target.value)}
                placeholder="🌡️ 输入温度" 
              />
            </div>
            <div className="form-group">
              <label className="input-label">环境湿度 (%)</label>
              <input 
                type="number" 
                step="1" 
                className="input" 
                value={recordForm.humidity} 
                onChange={(e) => handleRecordFormChange('humidity', e.target.value)}
                placeholder="💧 输入湿度" 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">测量备注</label>
            <textarea 
              className="textarea" 
              value={recordForm.notes} 
              onChange={(e) => handleRecordFormChange('notes', e.target.value)}
              placeholder="换土、蜕皮、观察到的进食/活动状况..."
            />
          </div>

          {/* Image Upload Grid */}
          <div className="form-group img-upload-section">
            <label className="input-label">上传照片 (最多 9 张)</label>
            <div className="img-grid">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="img-wrap">
                  <img src={img.previewUrl} alt={`preview-${idx}`} />
                  <div className="img-remove" onClick={() => handleRemoveSelectedImage(idx)}>✕</div>
                </div>
              ))}
              {selectedImages.length < 9 && (
                <label className="img-add-btn">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                  />
                  <span className="img-add-icon">+</span>
                  <span className="img-add-text">选择图片</span>
                </label>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>✨ 保存记录</button>
            <button type="button" className="btn btn-ghost" onClick={handleCancelAddRecord} style={{ flex: 1 }}>取消</button>
          </div>
        </form>
      </div>
    );
  };

  // --- RENDER VIEW: Edit Beetle ---
  const renderEditBeetle = () => (
    <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
      <div className="view-header" style={{ marginBottom: '24px' }}>
        <button className="btn-back" onClick={handleCancelEditBeetle}>🔙 取消返回</button>
        <span className="view-title">✏️ 编辑甲虫个体</span>
      </div>

      <form onSubmit={handleUpdateBeetle}>
        <div className="form-group">
          <label className="input-label">名字 / 代号</label>
          <input 
            type="text" 
            className="input" 
            value={beetleForm.name} 
            onChange={(e) => handleBeetleFormChange('name', e.target.value)}
            placeholder="例如 大力一号" 
            required
          />
        </div>
        <div className="form-group">
          <label className="input-label">品种</label>
          <select 
            className="select"
            value={isCustomSpeciesEdit ? "custom" : beetleForm.species}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "custom") {
                setIsCustomSpeciesEdit(true);
                handleBeetleFormChange('species', '');
              } else {
                setIsCustomSpeciesEdit(false);
                handleBeetleFormChange('species', val);
              }
            }}
          >
            <option value="">-- 请选择品种 --</option>
            {COMMON_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="custom">其他（手动输入）</option>
          </select>
          {isCustomSpeciesEdit && (
            <input 
              type="text" 
              className="input" 
              style={{ marginTop: '8px' }}
              value={beetleForm.species} 
              onChange={(e) => handleBeetleFormChange('species', e.target.value)}
              placeholder="请输入自定义品种名称" 
            />
          )}
        </div>
        <div className="form-group">
          <label className="input-label">孵化 / 购入日期</label>
          <input 
            type="date" 
            className="input" 
            value={beetleForm.hatchDate} 
            onChange={(e) => handleBeetleFormChange('hatchDate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="input-label">备注说明</label>
          <textarea 
            className="textarea" 
            value={beetleForm.notes} 
            onChange={(e) => handleBeetleFormChange('notes', e.target.value)}
            placeholder="来源、饲养盒配置、菌瓶批次等..."
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>💾 保存修改</button>
          <button type="button" className="btn btn-ghost" onClick={handleCancelEditBeetle} style={{ flex: 1 }}>取消</button>
        </div>
      </form>
    </div>
  );

  // --- RENDER VIEW: Edit Record ---
  const renderEditRecord = () => {
    if (!activeBeetle) return null;
    return (
      <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
        <div className="view-header" style={{ marginBottom: '24px' }}>
          <button className="btn-back" onClick={handleCancelEditRecord}>🔙 取消返回</button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="view-title" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              编辑记录: <strong>{activeBeetle.name}</strong>
            </span>
            {speechSupported && (
              <button type="button" className="btn-voice" onClick={startListening}>
                🎙️ 语音导入
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdateRecord}>
          <div className="form-grid-2x2">
            <div className="form-group">
              <label className="input-label">记录日期</label>
              <input 
                type="date" 
                className="input" 
                value={recordForm.recordDate} 
                onChange={(e) => handleRecordFormChange('recordDate', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="input-label">生命阶段</label>
              <select 
                className="select" 
                value={recordForm.stage} 
                onChange={(e) => handleRecordFormChange('stage', e.target.value)}
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid-2x2">
            <div className="form-group">
              <label className="input-label">体重 (g)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input" 
                value={recordForm.weight} 
                onChange={(e) => handleRecordFormChange('weight', e.target.value)}
                placeholder="⚖️ 输入体重" 
              />
            </div>
            <div className="form-group">
              <label className="input-label">体长 (mm)</label>
              <input 
                type="number" 
                step="0.1" 
                className="input" 
                value={recordForm.length} 
                onChange={(e) => handleRecordFormChange('length', e.target.value)}
                placeholder="📏 输入体长" 
              />
            </div>
          </div>

          <div className="form-grid-2x2">
            <div className="form-group">
              <label className="input-label">饲养温度 (℃)</label>
              <input 
                type="number" 
                step="0.1" 
                className="input" 
                value={recordForm.temperature} 
                onChange={(e) => handleRecordFormChange('temperature', e.target.value)}
                placeholder="🌡️ 输入温度" 
              />
            </div>
            <div className="form-group">
              <label className="input-label">环境湿度 (%)</label>
              <input 
                type="number" 
                step="1" 
                className="input" 
                value={recordForm.humidity} 
                onChange={(e) => handleRecordFormChange('humidity', e.target.value)}
                placeholder="💧 输入湿度" 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">测量备注</label>
            <textarea 
              className="textarea" 
              value={recordForm.notes} 
              onChange={(e) => handleRecordFormChange('notes', e.target.value)}
              placeholder="换土、蜕皮、观察到的进食/活动状况..."
            />
          </div>

          {/* Image Upload Grid */}
          <div className="form-group img-upload-section">
            <label className="input-label">上传照片 (最多 9 张)</label>
            <div className="img-grid">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="img-wrap">
                  <img src={img.previewUrl} alt={`preview-${idx}`} />
                  <div className="img-remove" onClick={() => handleRemoveSelectedImage(idx)}>✕</div>
                </div>
              ))}
              {selectedImages.length < 9 && (
                <label className="img-add-btn">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                  />
                  <span className="img-add-icon">+</span>
                  <span className="img-add-text">选择图片</span>
                </label>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>💾 保存修改</button>
            <button type="button" className="btn btn-ghost" onClick={handleCancelEditRecord} style={{ flex: 1 }}>取消</button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <>
      {toast && (
        <div className={`toast-message toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="toast-text">{toast.message}</span>
        </div>
      )}

      {!isAuthorized ? (
        <div className="login-overlay" style={{ animation: 'fadeIn 0.3s' }}>
          <div className="card login-card" style={{ maxWidth: '400px', width: '90%' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={beetleLogo} alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginBottom: '12px' }} />
              <h2 className="brand-title" style={{ fontSize: '20px' }}>访问密码验证</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                当前云端服务已被加密，请输入通行密匙以继续访问。
              </p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <input 
                  type="password" 
                  className="input" 
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  placeholder="🗝️ 请输入通行密匙 (Passcode)"
                  required
                  style={{ textAlign: 'center', letterSpacing: '2px', fontSize: '16px', marginBottom: '8px' }}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="rememberMe" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--primary)', margin: 0 }}
                />
                <label htmlFor="rememberMe" style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                  记住密码 (保持登录状态)
                </label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                🔑 验证并进入
              </button>
            </form>
            {showApiConfig && (
              <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <form onSubmit={handleUpdateApiBase} style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input" 
                    value={apiBase}
                    onChange={(e) => setApiBaseState(e.target.value)}
                    placeholder="API Base"
                    style={{ marginBottom: 0, fontSize: '12px' }}
                  />
                  <button type="submit" className="btn btn-ghost" style={{ fontSize: '12px' }}>应用</button>
                </form>
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button type="button" className="btn-link" onClick={() => setShowApiConfig(!showApiConfig)} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {showApiConfig ? '隐藏端点配置' : '修改端点配置'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* App Header */}
          <header className="app-header">
            <div className="brand" onClick={() => setCurrentView('list')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <img src={beetleLogo} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', marginRight: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
              <h1 className="brand-title">甲虫成长记录</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="status-indicator" style={{ cursor: 'pointer' }} onClick={() => setShowApiConfig(!showApiConfig)}>
                <span className={`status-dot ${backendStatus}`}></span>
                <span>{backendStatus === 'connected' ? '已连接' : '连接失败'}</span>
              </div>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={handleLogout} 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '13px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  margin: 0
                }}
              >
                🚪 退出
              </button>
            </div>
          </header>

      {/* Dynamic API Configuration Field */}
      {showApiConfig && (
        <div className="card" style={{ marginBottom: '20px', animation: 'fadeIn 0.2s' }}>
          <form onSubmit={handleUpdateApiBase} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">后端 API 地址</label>
              <input 
                type="text" 
                className="input" 
                value={apiBase} 
                onChange={(e) => setApiBaseState(e.target.value)} 
                placeholder="例如 http://192.168.2.159:7860" 
                style={{ marginBottom: 0 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">应用</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowApiConfig(false)}>取消</button>
            </div>
          </form>
        </div>
      )}

      {/* View Switcher Routing */}
      {currentView === 'list' && renderList()}
      {currentView === 'add-beetle' && renderAddBeetle()}
      {currentView === 'detail' && renderDetail()}
      {currentView === 'add-record' && renderAddRecord()}
      {currentView === 'edit-beetle' && renderEditBeetle()}
      {currentView === 'edit-record' && renderEditRecord()}

      {/* Voice Assistant Modal Overlay */}
      {showVoiceModal && (
        <div className="voice-overlay" onClick={stopListening}>
          <div className="voice-card" onClick={(e) => e.stopPropagation()}>
            <div className="voice-status-text">
              {isListening ? '🎙️ 正在倾听，请说话...' : '⏸️ 录音已结束'}
            </div>

            <div className="voice-mic-container">
              <button 
                type="button" 
                className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
                onClick={isListening ? stopListening : startListening}
              >
                {isListening ? '⏹️' : '🎙️'}
              </button>
              <div className="voice-pulse-ring"></div>
            </div>

            <div className={`voice-text-preview ${!transcribedText ? 'empty' : ''}`}>
              {transcribedText || '说话内容将实时显示在这里...'}
            </div>

            <div className="voice-tips">
              <strong>语音说词格式示例：</strong><br />
              “体重 45.2 克，体长 80 毫米，三龄幼虫，温度 24 度，湿度 65。”
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleApplyVoiceResult}
                style={{ flex: 1 }}
                disabled={!transcribedText.trim()}
              >
                识别导入
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => {
                  stopListening();
                  setShowVoiceModal(false);
                }}
                style={{ flex: 1 }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="confirm-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div className="card confirm-card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={confirmModal.onConfirm}
                style={{ flex: 1 }}
              >
                确定
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                style={{ flex: 1 }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <span className="lightbox-close" onClick={() => setLightboxUrl(null)}>✕</span>
          <img className="lightbox-img" src={lightboxUrl} alt="Preview Full" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
        </>
      )}
    </>
  );
}
