/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../utils/api';
import { translate as tr, translateValue as tv } from '../i18n';

const sortByRecordDateDesc = (items = []) => [...items].sort((a, b) => {
  const dateCompare = normalizeDate(b.recordDate || b.createdAt).localeCompare(normalizeDate(a.recordDate || a.createdAt));
  if (dateCompare !== 0) return dateCompare;
  return (b.createdAt || '').localeCompare(a.createdAt || '');
});

const normalizeDate = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (!match) return text.slice(0, 10);
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
};

const getBeetleSortDate = (beetle) => (
  [beetle.hatchDate, beetle.emergenceDate, beetle.createdAt].map(normalizeDate).filter(Boolean).sort().pop() || ''
);

const sortBeetlesByDateDesc = (items = []) => [...items].sort((a, b) => {
  const dateCompare = getBeetleSortDate(b).localeCompare(getBeetleSortDate(a));
  if (dateCompare !== 0) return dateCompare;
  return (b.createdAt || '').localeCompare(a.createdAt || '');
});

const sortBatchesByActivityDesc = (items = []) => [...items].sort((a, b) => {
  if (a.batchName === '无批次') return 1;
  if (b.batchName === '无批次') return -1;
  const dateCompare = normalizeDate(b.batchStartDate || b.latestActivityDate).localeCompare(normalizeDate(a.batchStartDate || a.latestActivityDate));
  if (dateCompare !== 0) return dateCompare;
  return b.batchName.localeCompare(a.batchName);
});

const getCostCategoryLabel = (category) => (
  category === 'WOOD_CHIPS' ? '🌳 木屑' :
  category === 'JELLY' ? '🍮 果冻' :
  category === 'JELLY_STAND' ? '🍽️ 果冻台' :
  category === 'EQUIPMENT' ? '🛠️ 器材' :
  category === 'BREEDING_BOX' ? '📦 饲养箱' :
  category === 'CLIMBING' ? '🪵 攀爬物' :
  category === 'BEETLE_PURCHASE' ? '🪲 买虫' :
  category === 'SALE' ? '🤝 售出' :
  '📦 其他'
);

const getCostBeetleSummary = (cost) => {
  if (cost.beetlesInfo) {
    try {
      const beetles = JSON.parse(cost.beetlesInfo);
      if (Array.isArray(beetles) && beetles.length > 0) {
        return beetles
          .map(b => [
            b.name || tr('未命名'),
            tv(b.species),
            b.subspecies ? `(${tv(b.subspecies)})` : '',
            tv(b.gender)
          ].filter(Boolean).join(' '))
          .join(tr('、'));
      }
    } catch {
      // Fall back to single beetle fields below.
    }
  }
  return [cost.beetleName, tv(cost.beetleSpecies), tv(cost.beetleGender)].filter(Boolean).join(' ');
};

export default function BatchManagement({ showToast, setConfirmModal, currentBatch, setCurrentBatch, onSelectBeetle, onAddBeetle, onNavigateToCosts, onEditCost }) {
  const [batches, setBatches] = useState([]);
  const [batchDetails, setBatchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [detailsError, setDetailsError] = useState('');

  // Rename states
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  // Import Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [unassignedBeetles, setUnassignedBeetles] = useState([]);
  const [selectedImportIds, setSelectedImportIds] = useState([]);
  const [importing, setImporting] = useState(false);

  const [showImportCostModal, setShowImportCostModal] = useState(false);
  const [unassignedCosts, setUnassignedCosts] = useState([]);
  const [selectedImportCostIds, setSelectedImportCostIds] = useState([]);
  const [importingCost, setImportingCost] = useState(false);

  const [virtualBatches, setVirtualBatches] = useState(() => JSON.parse(localStorage.getItem('virtual_batches') || '[]'));
  const [isCreating, setIsCreating] = useState(false);
  const [newBatchInput, setNewBatchInput] = useState('');
  const [selectedBatchBeetleIds, setSelectedBatchBeetleIds] = useState([]);
  const [selectedBatchCostIds, setSelectedBatchCostIds] = useState([]);
  const [beetleSelectMode, setBeetleSelectMode] = useState(false);
  const [costSelectMode, setCostSelectMode] = useState(false);
  const [beetleMoveTarget, setBeetleMoveTarget] = useState('');
  const [costMoveTarget, setCostMoveTarget] = useState('');
  const [movingBeetles, setMovingBeetles] = useState(false);
  const [movingCosts, setMovingCosts] = useState(false);
  const [deletingBeetles, setDeletingBeetles] = useState(false);
  const [deletingCosts, setDeletingCosts] = useState(false);
  const sortedBatchCosts = useMemo(() => sortByRecordDateDesc(batchDetails?.costs || []), [batchDetails?.costs]);
  const sortedBatchBeetles = useMemo(() => sortBeetlesByDateDesc(batchDetails?.beetles || []), [batchDetails?.beetles]);

  const loadSummary = useCallback(async () => {
    setSummaryError('');
    try {
      const data = await api.request('/api/batches/summary');
      const realNames = data.map(b => b.batchName);
      const validVirtuals = virtualBatches.filter(v => !realNames.includes(v));
      const merged = [...data];
      validVirtuals.forEach(v => {
        merged.push({ batchName: v, totalIncome: 0, totalExpense: 0, beetleCount: 0, batchStartDate: '', isVirtual: true });
      });
      setBatches(sortBatchesByActivityDesc(merged));
    } catch {
      setSummaryError('批次汇总请求失败，请稍后重试');
      showToast('加载批次汇总失败', 'error');
    }
  }, [showToast, virtualBatches]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleCreateBatch = () => {
    const name = newBatchInput.trim();
    if (!name) return showToast('请输入批次名', 'error');
    if (batches.find(b => b.batchName === name)) return showToast('该批次已存在', 'error');
    const newVirtuals = [...virtualBatches, name];
    setVirtualBatches(newVirtuals);
    localStorage.setItem('virtual_batches', JSON.stringify(newVirtuals));
    setNewBatchInput('');
    setIsCreating(false);
    showToast('空批次创建成功', 'success');
  };

  const loadDetails = useCallback(async () => {
    if (!currentBatch) return;
    setLoading(true);
    setDetailsError('');
    try {
      // If virtual, don't fetch from backend
      const isVirt = virtualBatches.includes(currentBatch) && !batches.find(b => b.batchName === currentBatch && !b.isVirtual);
      if (isVirt) {
        setBatchDetails({ beetles: [], costs: [] });
      } else {
        const data = await api.request(`/api/batches/${encodeURIComponent(currentBatch)}`);
        setBatchDetails(data);
      }
    } catch {
      setDetailsError('批次详情请求失败，请稍后重试');
      showToast('加载批次详情失败，已有数据不会因此被清空', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentBatch, showToast, virtualBatches, batches]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    setBatchDetails(null);
    setDetailsError('');
    setSelectedBatchBeetleIds([]);
    setSelectedBatchCostIds([]);
    setBeetleSelectMode(false);
    setCostSelectMode(false);
    setBeetleMoveTarget('');
    setCostMoveTarget('');
  }, [currentBatch]);

  const handleSelectBatch = (batchName) => {
    setCurrentBatch(batchName);
  };

  const calculateProfit = (income, expense) => {
    return (income || 0) - (expense || 0);
  };

  const handleRename = async () => {
    if (!newName.trim()) return showToast('请输入新名称', 'error');
    if (newName.trim() === currentBatch) return setIsRenaming(false);
    const isVirt = batches.find(b => b.batchName === currentBatch)?.isVirtual;
    try {
      if (isVirt) {
        const newVirtuals = virtualBatches.map(v => v === currentBatch ? newName.trim() : v);
        setVirtualBatches(newVirtuals);
        localStorage.setItem('virtual_batches', JSON.stringify(newVirtuals));
        showToast('重命名成功', 'success');
        setIsRenaming(false);
        setCurrentBatch(newName.trim());
      } else {
        await api.request(`/api/batches/${encodeURIComponent(currentBatch)}?newName=${encodeURIComponent(newName.trim())}`, { method: 'PUT' });
        showToast('重命名成功', 'success');
        setIsRenaming(false);
        setCurrentBatch(newName.trim());
        loadSummary();
      }
    } catch {
      showToast('重命名失败', 'error');
    }
  };

  const handleDelete = async () => {
    const isVirt = batches.find(b => b.batchName === currentBatch)?.isVirtual;
    if (!window.confirm(tr(isVirt ? '确定要删除这个空批次吗？' : '确定要解散此批次吗？该批次下的甲虫和账单将退回到“无批次”状态。'))) return;
    try {
      if (isVirt) {
        const newVirtuals = virtualBatches.filter(v => v !== currentBatch);
        setVirtualBatches(newVirtuals);
        localStorage.setItem('virtual_batches', JSON.stringify(newVirtuals));
        showToast('空批次已删除', 'success');
        setCurrentBatch(null);
      } else {
        await api.request(`/api/batches/${encodeURIComponent(currentBatch)}`, { method: 'DELETE' });
        showToast('批次已解散', 'success');
        setCurrentBatch(null);
        loadSummary();
      }
    } catch {
      showToast('解散失败', 'error');
    }
  };

  const openImportModal = async () => {
    setShowImportModal(true);
    try {
      const data = await api.request('/api/batches/无批次');
      setUnassignedBeetles(data?.beetles || []);
    } catch {
      showToast('加载无批次甲虫失败', 'error');
    }
  };

  const openImportCostModal = async () => {
    setShowImportCostModal(true);
    try {
      const data = await api.request('/api/batches/无批次');
      setUnassignedCosts(data?.costs || []);
    } catch {
      showToast('加载无批次账单失败', 'error');
    }
  };

  const handleImportSubmit = async () => {
    if (selectedImportIds.length === 0) return showToast('请至少选择一只甲虫', 'error');
    setImporting(true);
    try {
      await api.request('/api/beetles/batch-update', {
        method: 'PUT',
        data: { ids: selectedImportIds, batchName: currentBatch }
      });
      showToast('导入成功', 'success');
      setShowImportModal(false);
      setSelectedImportIds([]);
      loadDetails();
      loadSummary();
    } catch {
      showToast('导入失败', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleImportCostSubmit = async () => {
    if (selectedImportCostIds.length === 0) return showToast('请至少选择一笔账单', 'error');
    setImportingCost(true);
    try {
      await api.request('/api/costs/batch-update', {
        method: 'PUT',
        data: { ids: selectedImportCostIds, batchName: currentBatch }
      });
      showToast('导入成功', 'success');
      setShowImportCostModal(false);
      setSelectedImportCostIds([]);
      loadDetails();
      loadSummary();
    } catch {
      showToast('导入失败', 'error');
    } finally {
      setImportingCost(false);
    }
  };

  const getBatchOptions = () => {
    const names = batches.map(b => b.batchName).filter(Boolean);
    return Array.from(new Set(['无批次', ...names, ...virtualBatches])).filter(name => name !== currentBatch);
  };

  const toggleBatchBeetleSelection = (id) => {
    setSelectedBatchBeetleIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleBatchCostSelection = (id) => {
    setSelectedBatchCostIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleBeetleSelectMode = () => {
    setBeetleSelectMode(prev => {
      if (prev) {
        setSelectedBatchBeetleIds([]);
        setBeetleMoveTarget('');
      }
      return !prev;
    });
  };

  const toggleCostSelectMode = () => {
    setCostSelectMode(prev => {
      if (prev) {
        setSelectedBatchCostIds([]);
        setCostMoveTarget('');
      }
      return !prev;
    });
  };

  const renderSelectBox = (checked) => (
    <span style={{
      width: '26px',
      height: '26px',
      borderRadius: '7px',
      border: checked ? '2px solid rgba(118, 236, 151, 0.9)' : '2px solid rgba(255,255,255,0.45)',
      background: checked ? 'linear-gradient(135deg, rgba(93,189,138,0.95), rgba(61,159,108,0.95))' : 'rgba(255,255,255,0.08)',
      boxShadow: checked ? '0 0 0 3px rgba(93,189,138,0.14)' : 'inset 0 1px 0 rgba(255,255,255,0.08)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '17px',
      fontWeight: '900',
      flexShrink: 0
    }}>
      {checked ? '✓' : ''}
    </span>
  );

  const handleMoveSelectedBeetles = async () => {
    if (selectedBatchBeetleIds.length === 0) return showToast('请至少选择一只甲虫', 'error');
    if (!beetleMoveTarget) return showToast('请选择目标批次', 'error');
    setMovingBeetles(true);
    try {
      await api.request('/api/beetles/batch-update', {
        method: 'PUT',
        data: { ids: selectedBatchBeetleIds, batchName: beetleMoveTarget }
      });
      showToast('甲虫批次已更新', 'success');
      setSelectedBatchBeetleIds([]);
      setBeetleMoveTarget('');
      await loadDetails();
      await loadSummary();
    } catch {
      showToast('分配甲虫批次失败', 'error');
    } finally {
      setMovingBeetles(false);
    }
  };

  const handleMoveSelectedCosts = async () => {
    if (selectedBatchCostIds.length === 0) return showToast('请至少选择一笔账单', 'error');
    if (!costMoveTarget) return showToast('请选择目标批次', 'error');
    setMovingCosts(true);
    try {
      await api.request('/api/costs/batch-update', {
        method: 'PUT',
        data: { ids: selectedBatchCostIds, batchName: costMoveTarget }
      });
      showToast('账单批次已更新', 'success');
      setSelectedBatchCostIds([]);
      setCostMoveTarget('');
      await loadDetails();
      await loadSummary();
    } catch {
      showToast('分配账单批次失败', 'error');
    } finally {
      setMovingCosts(false);
    }
  };

  const confirmAction = ({ title, message, onConfirm }) => {
    if (setConfirmModal) {
      setConfirmModal({
        show: true,
        title,
        message,
        onConfirm
      });
      return;
    }
    if (window.confirm(tr(message))) {
      onConfirm();
    }
  };

  const handleDeleteSelectedBeetles = () => {
    if (selectedBatchBeetleIds.length === 0) return showToast('请至少选择一只甲虫', 'error');
    confirmAction({
      title: '批量删除甲虫',
      message: tr('确定要删除选中的 {count} 只甲虫吗？该操作会同时删除它们的成长记录和繁殖记录，但不会删除账单明细。', {
        count: selectedBatchBeetleIds.length
      }),
      onConfirm: async () => {
        setDeletingBeetles(true);
        try {
          await Promise.all(selectedBatchBeetleIds.map(id => api.request(`/api/beetles/${encodeURIComponent(id)}`, { method: 'DELETE' })));
          showToast('甲虫已删除', 'success');
          setSelectedBatchBeetleIds([]);
          await loadDetails();
          await loadSummary();
        } catch (err) {
          showToast('删除甲虫失败: ' + (err.message || '未知错误'), 'error');
        } finally {
          setDeletingBeetles(false);
          if (setConfirmModal) setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  const handleDeleteSelectedCosts = () => {
    if (selectedBatchCostIds.length === 0) return showToast('请至少选择一笔账单', 'error');
    confirmAction({
      title: '批量删除账单',
      message: tr('确定要删除选中的 {count} 笔账单明细吗？只会删除账单记录，不会删除或修改关联甲虫。', {
        count: selectedBatchCostIds.length
      }),
      onConfirm: async () => {
        setDeletingCosts(true);
        try {
          await Promise.all(selectedBatchCostIds.map(id => api.request(`/api/costs/${encodeURIComponent(id)}`, { method: 'DELETE' })));
          showToast('账单明细已删除', 'success');
          setSelectedBatchCostIds([]);
          await loadDetails();
          await loadSummary();
        } catch (err) {
          showToast('删除账单失败: ' + (err.message || '未知错误'), 'error');
        } finally {
          setDeletingCosts(false);
          if (setConfirmModal) setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  if (currentBatch) {
    const currentSummary = batches.find(b => b.batchName === currentBatch) || { totalIncome: 0, totalExpense: 0, beetleCount: 0 };
    const profit = calculateProfit(currentSummary.totalIncome, currentSummary.totalExpense);
    const batchOptions = getBatchOptions();

    return (
      <div className="card" style={{ padding: '20px', animation: 'fadeIn 0.3s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <button className="btn-ghost" onClick={() => setCurrentBatch(null)} style={{ padding: '6px 12px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              {tr("← 返回全盘")}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            {isRenaming ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder={tr("新批次名")} style={{ padding: '6px 12px', fontSize: '16px', width: '200px' }} />
                <button className="btn btn-primary btn-small" onClick={handleRename}>{tr("保存")}</button>
                <button className="btn btn-ghost btn-small" onClick={() => setIsRenaming(false)}>{tr("取消")}</button>
              </div>
            ) : (
              <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px', wordBreak: 'break-word' }}>
                <span style={{ fontSize: '28px' }}>{currentBatch === '无批次' ? '📁' : '📦'}</span>
                <span style={{ color: 'var(--text-primary)' }}>{tv(currentBatch)}</span>
              </h2>
            )}

            {currentBatch !== '无批次' && !isRenaming && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setIsRenaming(true); setNewName(currentBatch); }}
                  style={{ background: 'transparent', border: 'none', color: '#4dabf7', cursor: 'pointer', padding: '8px', fontSize: '18px' }}
                  title={tr("修改名称")}
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '8px', fontSize: '18px' }}
                  title={tr("解散批次")}
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 批次内盈亏看板 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr("总支出")}</div>
            <div style={{ fontSize: '18px', color: '#ff6b6b', fontWeight: 'bold' }}>¥{currentSummary.totalExpense?.toFixed(2) || '0.00'}</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr("总收入")}</div>
            <div style={{ fontSize: '18px', color: '#51cf66', fontWeight: 'bold' }}>¥{currentSummary.totalIncome?.toFixed(2) || '0.00'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr("净利润")}</div>
            <div style={{ fontSize: '18px', color: profit > 0 ? '#51cf66' : profit < 0 ? '#ff6b6b' : 'var(--text-primary)', fontWeight: 'bold' }}>
              {profit > 0 ? '+' : ''}¥{profit.toFixed(2)}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{tr("加载中...")}</div>
        ) : detailsError ? (
          <div role="alert" style={{ textAlign: 'center', padding: '28px 20px', marginBottom: '16px', color: 'var(--text-secondary)', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px' }}>
            <div style={{ color: '#ff8787', fontWeight: '700', marginBottom: '8px' }}>{tr("批次详情暂时加载失败")}</div>
            <div style={{ fontSize: '13px', marginBottom: '16px' }}>{tr("请求失败不代表数据为空，请勿重复保存或删除记录。")}</div>
            <button type="button" className="btn-ghost" onClick={loadDetails} style={{ padding: '8px 18px' }}>
              {tr("重新加载")}
            </button>
          </div>
        ) : batchDetails ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>{tr("🐛 甲虫 (")}{sortedBatchBeetles.length})</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {beetleSelectMode && (
                  <>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{tr("已选")} {selectedBatchBeetleIds.length} {tr("只")}</span>
                    <select className="input" value={beetleMoveTarget} onChange={e => setBeetleMoveTarget(e.target.value)} style={{ width: '130px', margin: 0, padding: '5px 8px', fontSize: '12px' }}>
                      <option value="">{tr("目标批次")}</option>
                      {batchOptions.map(name => <option key={name} value={name}>{tv(name)}</option>)}
                    </select>
                    <button className="btn-ghost" onClick={handleMoveSelectedBeetles} disabled={movingBeetles} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '16px', background: 'rgba(93,189,138,0.18)' }}>
                      {movingBeetles ? tr("分配中...") : tr("批量分配")}
                    </button>
                    <button className="btn-ghost" onClick={handleDeleteSelectedBeetles} disabled={deletingBeetles} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '16px', background: 'rgba(255,107,107,0.16)', color: '#ff8787' }}>
                      {deletingBeetles ? tr("删除中...") : tr("批量删除")}
                    </button>
                  </>
                )}
                <button className="btn-ghost" onClick={toggleBeetleSelectMode} style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '16px', background: beetleSelectMode ? 'rgba(93,189,138,0.18)' : 'rgba(255,255,255,0.1)' }}>
                  {beetleSelectMode ? tr("完成") : tr("编辑")}
                </button>
                {currentBatch !== '无批次' ? (
                  <button
                    className="btn-ghost"
                    onClick={openImportModal}
                    style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)' }}
                  >
                    {tr("➕ 添加/导入甲虫")}
                  </button>
                ) : (
                  <button
                    className="btn-ghost"
                    onClick={() => onAddBeetle('')}
                    style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)' }}
                  >
                    {tr("➕ 添加甲虫")}
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {sortedBatchBeetles.map(b => {
                const selected = selectedBatchBeetleIds.includes(b.id);
                return (
                <div key={b.id} onClick={() => beetleSelectMode ? toggleBatchBeetleSelection(b.id) : onSelectBeetle(b)} className="list-card" style={{ background: selected ? 'rgba(93,189,138,0.14)' : 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', border: selected ? '1px solid rgba(93,189,138,0.6)' : '1px solid rgba(255,255,255,0.05)', boxShadow: selected ? '0 0 0 2px rgba(93,189,138,0.12)' : 'none' }}>
                  {beetleSelectMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: selected ? '#8ce99a' : 'var(--text-secondary)', fontSize: '12px', fontWeight: '700' }}>
                      {renderSelectBox(selected)}
                      {tr("选择")}
                    </div>
                  )}
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{b.name || tr("未命名")}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {tv(b.species)}
                    {b.subspecies ? ` (${tv(b.subspecies)})` : ''}
                    {b.bloodline ? ` [${tv(b.bloodline)}]` : ''}
                    {b.beetleType ? ` - ${tv(b.beetleType)}` : ''}
                    {b.gender && b.gender !== '未辨识' ? ` - ${tv(b.gender)}` : ''}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                    {tr("入棚:")} {b.hatchDate || b.emergenceDate || tr("未知")}
                  </div>
                  {b.notes && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', whiteSpace: 'pre-wrap', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.notes}
                    </div>
                  )}
                  {b.imageUrls && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                      {b.imageUrls.split(',').filter(u => u).slice(0,3).map((url, i) => (
                        <img key={i} src={url.startsWith('http') ? url : api.getApiBase() + url} style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} alt="thumb" />
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
              {sortedBatchBeetles.length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>{tr("暂无甲虫记录")}</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>{tr("💰 账单明细 (")}{sortedBatchCosts.length})</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {costSelectMode && (
                  <>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{tr("已选")} {selectedBatchCostIds.length} {tr("笔")}</span>
                    <select className="input" value={costMoveTarget} onChange={e => setCostMoveTarget(e.target.value)} style={{ width: '130px', margin: 0, padding: '5px 8px', fontSize: '12px' }}>
                      <option value="">{tr("目标批次")}</option>
                      {batchOptions.map(name => <option key={name} value={name}>{tv(name)}</option>)}
                    </select>
                    <button className="btn-ghost" onClick={handleMoveSelectedCosts} disabled={movingCosts} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '16px', background: 'rgba(93,189,138,0.18)' }}>
                      {movingCosts ? tr("分配中...") : tr("批量分配")}
                    </button>
                    <button className="btn-ghost" onClick={handleDeleteSelectedCosts} disabled={deletingCosts} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '16px', background: 'rgba(255,107,107,0.16)', color: '#ff8787' }}>
                      {deletingCosts ? tr("删除中...") : tr("批量删除")}
                    </button>
                  </>
                )}
                <button className="btn-ghost" onClick={toggleCostSelectMode} style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '16px', background: costSelectMode ? 'rgba(93,189,138,0.18)' : 'rgba(255,255,255,0.1)' }}>
                  {costSelectMode ? tr("完成") : tr("编辑")}
                </button>
                {currentBatch !== '无批次' ? (
                  <button
                    className="btn-ghost"
                    onClick={openImportCostModal}
                    style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)' }}
                  >
                    {tr("➕ 添加/导入账单")}
                  </button>
                ) : (
                  <button
                    className="btn-ghost"
                    onClick={onNavigateToCosts}
                    style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)' }}
                  >
                    {tr("➕ 添加账单")}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedBatchCosts.map(c => {
                const beetleSummary = getCostBeetleSummary(c);
                const selected = selectedBatchCostIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => costSelectMode ? toggleBatchCostSelection(c.id) : (onEditCost && onEditCost(c.id))}
                    style={{ display: 'grid', gridTemplateColumns: costSelectMode ? '36px minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto', alignItems: 'center', gap: '12px', background: selected ? 'rgba(93,189,138,0.14)' : 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', border: selected ? '1px solid rgba(93,189,138,0.6)' : '1px solid transparent', boxShadow: selected ? '0 0 0 2px rgba(93,189,138,0.12)' : 'none', ':hover': { background: 'rgba(255,255,255,0.06)' } }}
                    title={costSelectMode ? tr("点击选择此账单") : tr("点击编辑此账单")}
                  >
                    {costSelectMode && renderSelectBox(selected)}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          background: c.type === 'INCOME' ? 'rgba(81,207,102,0.2)' : 'rgba(255,107,107,0.2)',
                          color: c.type === 'INCOME' ? '#51cf66' : '#ff6b6b',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {c.type === 'INCOME' ? tr("收入") : tr("支出")}
                        </span>
                        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                          {tr(getCostCategoryLabel(c.category))}
                          {c.description ? ` - ${c.description}` : ''}
                        </span>
                      </div>
                      {beetleSummary && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                          {beetleSummary}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{c.recordDate}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', alignSelf: 'center', color: c.type === 'INCOME' ? '#51cf66' : '#ff6b6b', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {c.type === 'INCOME' ? '+' : '-'}¥{c.amount?.toFixed(2)}
                    </div>
                  </div>
                );
              })}
              {sortedBatchCosts.length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>{tr("暂无账单记录")}</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{tr("准备加载批次详情...")}</div>
        )}

        {showImportModal && (
          <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
            <div className="card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', padding: '24px', background: 'rgba(15, 28, 15, 0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(93, 189, 138, 0.25)', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <h3 style={{ margin: '0 0 20px 0' }}>{tr("📦 添加 / 导入甲虫")}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {tr("这里只显示尚未归入任何批次的甲虫。手工录入的新甲虫会直接加入当前批次，无需再次导入。")}
              </p>

              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {unassignedBeetles.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>{tr("当前没有无批次的散客甲虫")}</div>
                ) : (
                  unassignedBeetles.map(b => (
                    <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', border: selectedImportIds.includes(b.id) ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
                      <input
                        type="checkbox"
                        checked={selectedImportIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedImportIds(prev => [...prev, b.id]);
                          else setSelectedImportIds(prev => prev.filter(id => id !== b.id));
                        }}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{b.name || tr("未命名")}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tv(b.species)} - {tv(b.gender)}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <button className="btn btn-primary btn-full" onClick={handleImportSubmit} disabled={selectedImportIds.length === 0 || importing}>
                  {importing ? tr("导入中...") : tr('确认导入选中 ({count} 只)', { count: selectedImportIds.length })}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} /><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{tr("或者")}</span><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} /></div>
                <button className="btn btn-ghost btn-full" onClick={() => { setShowImportModal(false); onAddBeetle(currentBatch); }}>
                  {tr("➕ 手工录入并加入当前批次")}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportCostModal && (
          <div className="modal-overlay" onClick={() => setShowImportCostModal(false)}>
            <div className="card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', padding: '24px', background: 'rgba(15, 28, 15, 0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(93, 189, 138, 0.25)', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <h3 style={{ margin: '0 0 20px 0' }}>{tr("💰 添加 / 导入账单")}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{tr("从“无批次”账单中选择导入，或手工新建一笔：")}</p>

              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {unassignedCosts.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>{tr("当前没有无批次的账单记录")}</div>
                ) : (
                  unassignedCosts.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', border: selectedImportCostIds.includes(c.id) ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
                      <input
                        type="checkbox"
                        checked={selectedImportCostIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedImportCostIds(prev => [...prev, c.id]);
                          else setSelectedImportCostIds(prev => prev.filter(id => id !== c.id));
                        }}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 'bold' }}>
                            {c.category === 'WOOD_CHIPS' ? tr("🌳 木屑") :
                             c.category === 'JELLY' ? tr("🍮 果冻") :
                             c.category === 'JELLY_STAND' ? tr("🍽️ 果冻台") :
                             c.category === 'EQUIPMENT' ? tr("🛠️ 器材") :
                             c.category === 'BREEDING_BOX' ? tr("📦 饲养箱") :
                             c.category === 'CLIMBING' ? tr("🪵 攀爬物") :
                             c.category === 'BEETLE_PURCHASE' ? tr("🪲 买虫") :
                             c.category === 'SALE' ? tr("🤝 售出") : tr("📦 其他")}
                          </span>
                          <span style={{ color: c.type === 'INCOME' ? '#51cf66' : '#ff6b6b', fontWeight: 'bold' }}>
                            {c.type === 'INCOME' ? '+' : '-'}¥{c.amount?.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{c.recordDate} {c.description ? `- ${c.description}` : ''}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <button className="btn btn-primary btn-full" onClick={handleImportCostSubmit} disabled={selectedImportCostIds.length === 0 || importingCost}>
                  {importingCost ? tr("导入中...") : tr('确认导入选中 ({count} 笔)', { count: selectedImportCostIds.length })}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} /><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{tr("或者")}</span><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} /></div>
                <button className="btn btn-ghost btn-full" onClick={() => { setShowImportCostModal(false); onNavigateToCosts(); }}>
                  {tr("➕ 手工录入新账单")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const globalIncome = batches.reduce((sum, b) => sum + (b.totalIncome || 0), 0);
  const globalExpense = batches.reduce((sum, b) => sum + (b.totalExpense || 0), 0);
  const globalProfit = globalIncome - globalExpense;
  const globalBeetles = batches.reduce((sum, b) => sum + (b.beetleCount || 0), 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingLeft: '8px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>{tr("📦 批次管理看板")}</h2>
        {isCreating ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input"
              value={newBatchInput}
              onChange={e => setNewBatchInput(e.target.value)}
              placeholder={tr("输入新批次名")}
              style={{ margin: 0, padding: '4px 12px', fontSize: '13px', width: '120px' }}
            />
            <button className="btn btn-primary btn-small" onClick={handleCreateBatch}>{tr("保存")}</button>
            <button className="btn btn-ghost btn-small" onClick={() => setIsCreating(false)}>{tr("取消")}</button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => setIsCreating(true)} style={{ padding: '4px 12px', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.2)' }}>
            {tr("➕ 新建空批次")}
          </button>
        )}
      </div>

      {summaryError && (
        <div role="alert" style={{ textAlign: 'center', padding: '20px', marginBottom: '16px', color: 'var(--text-secondary)', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px' }}>
          <div style={{ color: '#ff8787', fontWeight: '700', marginBottom: '8px' }}>{tr("批次汇总暂时加载失败")}</div>
          <div style={{ fontSize: '13px', marginBottom: '14px' }}>{tr("请求失败不代表批次或记录为空。")}</div>
          <button type="button" className="btn-ghost" onClick={loadSummary} style={{ padding: '8px 18px' }}>
            {tr("重新加载")}
          </button>
        </div>
      )}

      {batches.length > 0 && (
        <div
          className="card"
          onClick={onNavigateToCosts}
          style={{ padding: '16px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(77, 171, 247, 0.15) 0%, rgba(77, 171, 247, 0.05) 100%)', border: '1px solid rgba(77, 171, 247, 0.3)', cursor: 'pointer', transition: 'all 0.2s', ':hover': { transform: 'scale(1.02)' } }}
          title={tr("点击查看详细财务大盘")}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'center' }}>{tr("全盘总盈亏")} <span style={{ fontSize: '10px', opacity: 0.7 }}>{tr("(点击查看明细)")}</span></div>
          <div style={{ fontSize: '28px', fontWeight: '800', textAlign: 'center', color: globalProfit >= 0 ? '#51cf66' : '#ff6b6b', marginBottom: '16px', fontFamily: 'system-ui' }}>
            {globalProfit >= 0 ? '+' : ''}¥{globalProfit.toFixed(2)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tr("总支出")}</div>
              <div style={{ fontSize: '13px', color: '#ff6b6b', fontWeight: 'bold' }}>¥{globalExpense.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tr("总收入")}</div>
              <div style={{ fontSize: '13px', color: '#51cf66', fontWeight: 'bold' }}>¥{globalIncome.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tr("总在棚甲虫")}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{globalBeetles} {tr("只")}</div>
            </div>
          </div>
        </div>
      )}

      {batches.length === 0 ? (
        summaryError ? null : (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            {tr("当前没有任何批次记录")}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {batches.map((b, idx) => {
            const profit = calculateProfit(b.totalIncome, b.totalExpense);
            return (
              <div
                key={idx}
                className="card list-card"
                onClick={() => handleSelectBatch(b.batchName)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', overflowWrap: 'anywhere' }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>{b.batchName === '无批次' ? '📁' : '📦'}</span>
                      {tv(b.batchName)}
                    </div>
                    {(b.batchStartDate || b.latestActivityDate) && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {tr("起始日期:")} {b.batchStartDate || b.latestActivityDate}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr("总净利润")}</div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: profit > 0 ? '#51cf66' : profit < 0 ? '#ff6b6b' : 'var(--text-primary)',
                      fontFamily: 'system-ui'
                    }}>
                      {profit > 0 ? '+' : ''}¥{profit.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr("总支出")}</div>
                    <div style={{ fontSize: '14px', color: '#ff6b6b', fontWeight: 'bold' }}>¥{b.totalExpense?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr("总收入")}</div>
                    <div style={{ fontSize: '14px', color: '#51cf66', fontWeight: 'bold' }}>¥{b.totalIncome?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr("甲虫数量")}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{b.beetleCount || 0} {tr("只")}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
