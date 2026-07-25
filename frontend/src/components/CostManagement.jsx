/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as api from '../utils/api';
import DateInputWithClear from './common/DateInputWithClear';
import BeetleEntryForm from './common/BeetleEntryForm';
import UploadProgressOverlay from './common/UploadProgressOverlay';
import PhotoSourcePicker from './common/PhotoSourcePicker';
import { saveCapturedPhotoWithFeedback } from '../utils/photoAlbum';
import { translate as tr, translateValue as tv } from '../i18n';


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

const parseWoodChipsDescription = (category, originalDesc) => {
  let matchedWoodType = '牧野深度';
  let matchedVolume = '';
  let desc = originalDesc || '';

  if (category === 'WOOD_CHIPS' && desc) {
    const types = ['牧野深度', '牧野浅度木屑', '牧野浅度', '阿银产房木屑', 'Dolex发酵木屑', 'KB强效木屑', '微粒子产卵木屑', '昆虫派木屑', '魔王', '兜土', '自制微发酵'];
    matchedWoodType = '其他';
    for (let t of types) {
      if (desc.startsWith(t)) {
        matchedWoodType = t;
        desc = desc.substring(t.length);
        break;
      }
    }

    if (matchedWoodType !== '其他') {
      desc = desc.trim();
      const volMatch = desc.match(/^(\d+)L/);
      if (volMatch) {
        matchedVolume = volMatch[1];
        desc = desc.substring(volMatch[0].length).trim();
      }

      if (desc.startsWith('-')) {
        desc = desc.substring(1).trim();
      }
    }
  }

  return { woodType: matchedWoodType, woodVolume: matchedVolume, description: desc };
};

const createEmptyCostBeetle = () => ({
  tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: '',
  species: '',
  stage: '成虫',
  gender: '未辨识',
  size: '',
  instar: 'L1',
  isCustomSpecies: false,
  isCustomSubspecies: false,
  isCustomBloodline: false,
  subspecies: '',
  bloodline: '',
  images: [],
  isNew: true
});

const mapExistingBeetleToCostBeetle = (beetle) => ({
  existingId: beetle.id,
  name: beetle.name || '未命名',
  species: beetle.species || '',
  subspecies: beetle.subspecies || '',
  bloodline: beetle.bloodline || '',
  stage: beetle.beetleType || '幼虫',
  gender: beetle.gender || '未辨识',
  size: beetle.adultLength || '',
  adultWeight: beetle.adultWeight || '',
  instar: beetle.beetleInstar || 'L1',
  hatchDate: beetle.hatchDate || '',
  emergenceDate: beetle.emergenceDate || '',
  dormancyEndDate: beetle.dormancyEndDate || '',
  notes: beetle.notes || '',
  imageUrls: beetle.imageUrls || '',
  isNew: false
});

const getCostBeetleLabel = (beetle) => (
  [
    beetle.name || tr('未命名'),
    tv(beetle.species),
    beetle.subspecies ? `(${tv(beetle.subspecies)})` : '',
    tv(beetle.gender)
  ]
    .filter(Boolean)
    .join(' ')
);

const serializeCostBeetle = (beetle) => ({
  existingId: beetle.existingId || '',
  name: beetle.name || '未命名',
  species: beetle.species || '',
  subspecies: beetle.subspecies || '',
  bloodline: beetle.bloodline || '',
  stage: beetle.beetleType || beetle.stage || '幼虫',
  gender: beetle.gender || '未辨识',
  size: beetle.adultLength || beetle.size || '',
  adultWeight: beetle.adultWeight || '',
  instar: beetle.instar || 'L1',
  hatchDate: beetle.hatchDate || '',
  emergenceDate: beetle.emergenceDate || '',
  dormancyEndDate: beetle.dormancyEndDate || '',
  notes: beetle.notes || '',
  imageUrls: beetle.imageUrls || '',
  isNew: beetle.isNew !== false && !beetle.existingId
});

const hasManualBeetleInput = (beetle) => (
  Boolean(
    beetle.name?.trim() ||
    beetle.species?.trim() ||
    beetle.subspecies?.trim() ||
    beetle.bloodline?.trim() ||
    beetle.notes?.trim() ||
    beetle.hatchDate ||
    beetle.emergenceDate ||
    beetle.dormancyEndDate ||
    beetle.adultLength ||
    beetle.size ||
    beetle.adultWeight ||
    beetle.images?.length
  )
);

const normalizeDate = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (!match) return text.slice(0, 10);
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
};

const sortByRecordDateDesc = (items = []) => [...items].sort((a, b) => {
  const dateCompare = normalizeDate(b.recordDate || b.createdAt).localeCompare(normalizeDate(a.recordDate || a.createdAt));
  if (dateCompare !== 0) return dateCompare;
  return (b.createdAt || '').localeCompare(a.createdAt || '');
});

const getCategoryLabel = (category) => (
  category === 'WOOD_CHIPS' ? '🌳 木屑' :
  category === 'JELLY' ? '🍮 果冻' :
  category === 'JELLY_STAND' ? '🍽️ 果冻台' :
  category === 'EQUIPMENT' ? '🛠️ 器材' :
  category === 'BREEDING_BOX' ? '📦 饲养箱' :
  category === 'CLIMBING' ? '🪵 攀爬物' :
  category === 'BEETLE_PURCHASE' ? '🪲 买虫' :
  category === 'SALE' ? '🤝 售出' :
  category === 'SALE_EQUIPMENT' ? '🧰 卖二手器材' :
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
            tv(b.stage || b.beetleType),
            tv(b.gender)
          ].filter(Boolean).join(' '))
          .join(tr('、'));
      }
    } catch {
      // Fall back to legacy single-beetle fields.
    }
  }
  return [
    cost.beetleName,
    tv(cost.beetleSpecies),
    tv(cost.beetleStage),
    tv(cost.beetleGender),
    cost.beetleSize
  ].filter(Boolean).join(' ');
};

export default function CostManagement({ showToast, setConfirmModal, editingCostIdGlobal, clearEditingCostIdGlobal, onGoHome, initialBatchName }) {
  const [costs, setCosts] = useState([]);
  const [activeTab, setActiveTab] = useState('EXPENSE');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedCostIds, setSelectedCostIds] = useState([]);
  const [bulkBatchName, setBulkBatchName] = useState('');
  const [bulkMoving, setBulkMoving] = useState(false);

  const [form, setForm] = useState({
    type: 'EXPENSE',
    recordDate: new Date().toISOString().split('T')[0],
    batchName: (initialBatchName && initialBatchName !== '无批次') ? initialBatchName : '',
    items: [
      {
        category: 'WOOD_CHIPS',
        amount: '',
        description: '',
        woodType: '牧野深度',
        beetleName: '',
        beetleSpecies: '',
        beetleStage: '成虫',
        beetleGender: '未辨识',
        beetleSize: '',
        beetleInstar: 'L1',
        isCustomSpecies: false,
        beetles: []
      }
    ]
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [, setIsCustomSpecies] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [editingCostId, setEditingCostId] = useState(null);
  const [returnSubView, setReturnSubView] = useState('summary');

  // 'summary' | 'add' | 'list'
  const [subView, setSubView] = useState('summary');
  const [allBatches, setAllBatches] = useState([]);
  const [localBatches, setLocalBatches] = useState([]);
  const [allBeetles, setAllBeetles] = useState([]);
  const [beetlePickerIndex, setBeetlePickerIndex] = useState(null);
  const [manualBeetle, setManualBeetle] = useState(() => createEmptyCostBeetle());
  const [showManualBeetleForm, setShowManualBeetleForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [costsData, batchesData, beetlesData] = await Promise.all([
        api.request('/api/costs'),
        api.request('/api/batches/summary'),
        api.request('/api/beetles')
      ]);
      setCosts(costsData || []);
      setAllBatches((batchesData || []).map(b => b.batchName));
      setAllBeetles(beetlesData?.items || []);
    } catch {
      showToast('加载财务数据失败', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle global edit requests
  useEffect(() => {
    if (editingCostIdGlobal && costs.length > 0) {
      const costToEdit = costs.find(c => c.id === editingCostIdGlobal);
      if (costToEdit) {
        // Trigger handleEdit logic directly here
        setEditingCostId(costToEdit.id);
        setActiveTab(costToEdit.type);
        setForm({
          type: costToEdit.type,
          recordDate: costToEdit.recordDate || new Date().toISOString().split('T')[0],
          batchName: costToEdit.batchName || '',
          items: [{
            category: costToEdit.category || (costToEdit.type === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE'),
            amount: costToEdit.amount || '',
            description: parseWoodChipsDescription(costToEdit.category || (costToEdit.type === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE'), costToEdit.description).description,
            woodType: parseWoodChipsDescription(costToEdit.category || (costToEdit.type === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE'), costToEdit.description).woodType,
            woodVolume: parseWoodChipsDescription(costToEdit.category || (costToEdit.type === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE'), costToEdit.description).woodVolume,
            beetleName: costToEdit.beetleName || '',
            beetleSpecies: costToEdit.beetleSpecies || '',
            beetleStage: costToEdit.beetleStage || '成虫',
            beetleGender: costToEdit.beetleGender || '未辨识',
            beetleSize: costToEdit.beetleSize || '',
            beetleInstar: costToEdit.beetleInstar || 'L1',
            isCustomSpecies: costToEdit.beetleSpecies ? !COMMON_SPECIES.includes(costToEdit.beetleSpecies) : false,
            beetles: costToEdit.beetlesInfo
              ? (() => { try { return JSON.parse(costToEdit.beetlesInfo); } catch { return []; } })()
              : [{
                  name: costToEdit.beetleName || '',
                  species: costToEdit.beetleSpecies || '',
                  stage: costToEdit.beetleStage || '成虫',
                  gender: costToEdit.beetleGender || '未辨识',
                  subspecies: '',
                  size: costToEdit.beetleSize || '',
                  instar: costToEdit.beetleInstar || 'L1',
                  isCustomSpecies: costToEdit.beetleSpecies ? !COMMON_SPECIES.includes(costToEdit.beetleSpecies) : false,
                  isCustomSubspecies: false,
                  isCustomBloodline: false
                }]
          }]
        });
        setIsCustomSpecies(costToEdit.beetleSpecies ? !COMMON_SPECIES.includes(costToEdit.beetleSpecies) : false);
        if (costToEdit.imageUrls) {
          const urls = costToEdit.imageUrls.split(',').filter(u => u);
          setSelectedImages(urls.map(url => ({ type: 'remote', url, previewUrl: url.startsWith('http') ? url : api.getApiBase() + url })));
        } else {
          setSelectedImages([]);
        }
        setSubView('add');
        setReturnSubView('list');
        if (clearEditingCostIdGlobal) clearEditingCostIdGlobal();
      }
    }
  }, [editingCostIdGlobal, costs, clearEditingCostIdGlobal]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setForm(prev => ({
      ...prev,
      type: tab,
      items: [{
        category: tab === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE',
        amount: '',
        description: '',
        woodType: '牧野深度',
        woodVolume: '',
        beetleName: '',
        beetleSpecies: '',
        beetleStage: '成虫',
        beetleGender: '未辨识',
        beetleSize: '',
        beetleInstar: 'L1',
        isCustomSpecies: false,
        beetles: []
      }]
    }));
    setSelectedImages([]);
    setIsCustomSpecies(false);
    setEditingCostId(null);
  };

  const handleFilesSelected = (files, source = 'album') => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return;
    const allowedCount = 3 - selectedImages.length;
    const addedImages = selectedFiles.slice(0, allowedCount).map(file => ({
      type: 'local',
      file,
      captured: source === 'camera',
      previewUrl: URL.createObjectURL(file)
    }));
    setSelectedImages(prev => [...prev, ...addedImages]);
    if (source === 'camera') {
      addedImages.forEach(image => {
        void saveCapturedPhotoWithFeedback(image.file, showToast);
      });
    }
  };

  const handleRemoveSelectedImage = (index) => {
    setSelectedImages(prev => {
      const next = [...prev];
      if (next[index].type === 'local') URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  };

  const updateItemBeetles = (itemIndex, updater) => {
    setForm(prev => {
      const items = [...prev.items];
      const current = items[itemIndex] || {};
      const currentBeetles = current.beetles || [];
      items[itemIndex] = {
        ...current,
        beetles: typeof updater === 'function' ? updater(currentBeetles) : updater
      };
      return { ...prev, items };
    });
  };

  const openBeetlePicker = (itemIndex) => {
    setBeetlePickerIndex(itemIndex);
    setManualBeetle(createEmptyCostBeetle());
    setShowManualBeetleForm(false);
  };

  const closeBeetlePicker = () => {
    setBeetlePickerIndex(null);
    setManualBeetle(createEmptyCostBeetle());
    setShowManualBeetleForm(false);
  };

  const toggleExistingBeetle = (beetle) => {
    if (beetlePickerIndex === null) return;
    updateItemBeetles(beetlePickerIndex, current => {
      const exists = current.some(b => b.existingId === beetle.id);
      if (exists) {
        return current.filter(b => b.existingId !== beetle.id);
      }
      return [...current, mapExistingBeetleToCostBeetle(beetle)];
    });
  };

  const addManualBeetle = () => {
    if (beetlePickerIndex === null) return false;
    if (!hasManualBeetleInput(manualBeetle)) {
      showToast('请先填写甲虫信息', 'error');
      return false;
    }
    updateItemBeetles(beetlePickerIndex, current => [...current, {
      ...manualBeetle,
      name: manualBeetle.name?.trim() || '未命名',
      isNew: true,
      tempId: manualBeetle.tempId || `new-${Date.now()}`
    }]);
    setManualBeetle(createEmptyCostBeetle());
    setShowManualBeetleForm(false);
    return true;
  };

  const finishBeetlePicker = () => {
    if (showManualBeetleForm && hasManualBeetleInput(manualBeetle)) {
      addManualBeetle();
    }
    closeBeetlePicker();
  };

  const removeItemBeetle = (itemIndex, beetleIndex) => {
    updateItemBeetles(itemIndex, current => current.filter((_, idx) => idx !== beetleIndex));
  };

  const toggleCostSelection = (id) => {
    setSelectedCostIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkAssignBatch = async () => {
    if (selectedCostIds.length === 0) {
      showToast('请至少选择一条账单明细', 'error');
      return;
    }
    if (!bulkBatchName) {
      showToast('请选择目标批次', 'error');
      return;
    }
    setBulkMoving(true);
    try {
      await api.request('/api/costs/batch-update', {
        method: 'PUT',
        data: { ids: selectedCostIds, batchName: bulkBatchName }
      });
      showToast('账单批次已更新', 'success');
      setSelectedCostIds([]);
      setBulkBatchName('');
      await loadData();
    } catch {
      showToast('分配账单批次失败', 'error');
    } finally {
      setBulkMoving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current) return;

    if (selectedImages.length > 3) {
      showToast('最多只能上传3张图片', 'error');
      return;
    }

    for (let i = 0; i < form.items.length; i++) {
      const item = form.items[i];
      if (!item.amount || isNaN(item.amount)) {
        showToast(tr('第 {index} 项：请输入有效的金额', { index: i + 1 }), 'error');
        return;
      }
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      let uploadedUrls = [];
      if (selectedImages.length > 0) {
        const hasLocal = selectedImages.some(img => img.type === 'local');
        if (hasLocal) {
          setIsUploading(true);
          setUploadProgress(0);
          showToast('正在上传并处理图片...', 'info');
        }
        const uploadPromises = selectedImages.map(async img => {
          if (img.type === 'local') {
            const res = await api.uploadFile(img.file, (progress) => {
              setUploadProgress(progress === 100 ? 90 : progress);
            });
            return res.url;
          }
          return img.url;
        });
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.filter(url => url);
        if (hasLocal) {
          setIsUploading(false);
        }
      }

      const imageUrlsStr = uploadedUrls.join(',');

      const createLinkedBeetle = async (beetle, batchNameVal) => {
        const stage = beetle.beetleType || beetle.stage || '幼虫';
        let finalImgUrls = beetle.imageUrls || '';
        if (beetle.images && beetle.images.length > 0) {
          const newImages = beetle.images.filter(img => img.file);
          let uploadedBeetleUrls = [];
          if (newImages.length > 0) {
            const uploadPromises = newImages.map(async img => {
              const res = await api.uploadFile(img.file);
              return res.url;
            });
            const results = await Promise.all(uploadPromises);
            uploadedBeetleUrls = results.filter(u => u);
          }
          const existingUrls = beetle.images
            .filter(img => !img.file)
            .map(img => img.url || img.previewUrl || img)
            .filter(Boolean);
          finalImgUrls = [...existingUrls, ...uploadedBeetleUrls].join(',');
        }

        const response = await api.request('/api/beetles', {
          method: 'POST',
          data: {
            name: beetle.name || '未命名',
            species: beetle.species || '',
            subspecies: beetle.subspecies || '',
            bloodline: beetle.bloodline || '',
            beetleType: stage === '成虫' ? '成虫' : '幼虫',
            gender: beetle.gender || '未辨识',
            adultLength: stage === '成虫' && (beetle.adultLength || beetle.size) ? parseFloat(beetle.adultLength || beetle.size) : null,
            adultWeight: stage === '成虫' && beetle.adultWeight ? parseFloat(beetle.adultWeight) : null,
            hatchDate: stage === '幼虫' ? (beetle.hatchDate || form.recordDate) : null,
            emergenceDate: stage === '成虫' ? (beetle.emergenceDate || form.recordDate) : null,
            dormancyEndDate: stage === '成虫' ? (beetle.dormancyEndDate || null) : null,
            notes: beetle.notes || '',
            imageUrls: finalImgUrls,
            batchName: batchNameVal
          }
        });
        const created = response?.item || {};
        return {
          ...beetle,
          existingId: created.id,
          name: created.name || beetle.name || '未命名',
          species: created.species || beetle.species || '',
          subspecies: created.subspecies || beetle.subspecies || '',
          bloodline: created.bloodline || beetle.bloodline || '',
          stage: created.beetleType || stage,
          gender: created.gender || beetle.gender || '未辨识',
          size: created.adultLength || beetle.adultLength || beetle.size || '',
          adultWeight: created.adultWeight || beetle.adultWeight || '',
          hatchDate: created.hatchDate || beetle.hatchDate || '',
          emergenceDate: created.emergenceDate || beetle.emergenceDate || '',
          dormancyEndDate: created.dormancyEndDate || beetle.dormancyEndDate || '',
          notes: created.notes || beetle.notes || '',
          imageUrls: created.imageUrls || finalImgUrls,
          isNew: false
        };
      };

      const submitDataArray = [];
      for (const item of form.items) {
        let finalDescription = item.description;
        if (item.category === 'WOOD_CHIPS' && item.woodType !== '其他') {
          let woodDesc = item.woodType;
          if (item.woodVolume) woodDesc += ' ' + item.woodVolume + 'L';
          finalDescription = woodDesc + (item.description ? ' - ' + item.description : '');
        }

        let batchNameVal = form.batchName;
        // 如果用户选了新建批次但没输入名字，阻止提交
        if (batchNameVal === '新批次' || batchNameVal === '') {
          batchNameVal = '';
        }

        let itemBeetles = item.beetles || [];
        if ((item.category === 'BEETLE_PURCHASE' || item.category === 'SALE') && itemBeetles.length > 0) {
          itemBeetles = await Promise.all(itemBeetles.map(beetle => (
            beetle.isNew !== false && !beetle.existingId
              ? createLinkedBeetle(beetle, batchNameVal)
              : beetle
          )));
        }
        const beetleSpeciesVal = item.isCustomSpecies ? item.beetleSpecies : (itemBeetles?.[0]?.species || item.beetleSpecies);

        submitDataArray.push({
          type: form.type,
          recordDate: form.recordDate,
          batchName: batchNameVal,
          category: item.category,
          amount: parseFloat(item.amount),
          description: finalDescription,
          imageUrls: imageUrlsStr,
          beetleName: itemBeetles?.[0]?.name || item.beetleName,
          beetleSpecies: beetleSpeciesVal,
          beetleStage: itemBeetles?.[0]?.beetleType || itemBeetles?.[0]?.stage || item.beetleStage,
          beetleGender: itemBeetles?.[0]?.gender || item.beetleGender,
          beetleSize: itemBeetles?.[0]?.adultLength || itemBeetles?.[0]?.size || item.beetleSize,
          beetleInstar: itemBeetles?.[0]?.instar || item.beetleInstar,
          beetlesInfo: JSON.stringify(itemBeetles.map(serializeCostBeetle))
        });
      }

      if (editingCostId) {
        await api.request('/api/costs/' + editingCostId, {
          method: 'PUT',
          data: submitDataArray[0]
        });
        showToast('修改成功', 'success');
        setEditingCostId(null);
      } else {
        await Promise.all(submitDataArray.map(data => api.request('/api/costs', { method: 'POST', data })));
        showToast('添加成功', 'success');
      }

      setForm({
        type: form.type,
        recordDate: new Date().toISOString().split('T')[0],
        batchName: (form.batchName === '新批次' || !form.batchName) ? '' : form.batchName,
        items: [{
          category: form.type === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE',
          amount: '',
          description: '',
          woodType: '牧野深度',
          beetleName: '',
          beetleSpecies: '',
          beetleStage: '成虫',
          beetleGender: '未辨识',
          beetleSize: '',
          beetleInstar: 'L1',
          beetles: []
        }]
      });
      selectedImages.forEach(img => {
        if (img.type === 'local') URL.revokeObjectURL(img.previewUrl);
      });
      setSelectedImages([]);
      loadData();
      setSubView('list');
      if (clearEditingCostIdGlobal) clearEditingCostIdGlobal();
    } catch (err) {
      showToast(`${editingCostId ? '修改失败' : '添加失败'}: ${err.message || '未知错误'}`, 'error');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };


  const handleEdit = (c) => {
    setEditingCostId(c.id);
    setReturnSubView('list');
    setActiveTab(c.type);

    const parsed = parseWoodChipsDescription(c.category || (c.type === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE'), c.description);

    setForm({
      type: c.type,
      recordDate: c.recordDate || new Date().toISOString().split('T')[0],
      batchName: c.batchName || '',
      items: [{
        category: c.category || (c.type === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE'),
        amount: c.amount || '',
        description: parsed.description,
        woodType: parsed.woodType,
        woodVolume: parsed.woodVolume,
        beetleName: c.beetleName || '',
        beetleSpecies: c.beetleSpecies || '',
        beetleStage: c.beetleStage || '成虫',
        beetleGender: c.beetleGender || '未辨识',
        beetleSize: c.beetleSize || '',
        beetleInstar: c.beetleInstar || 'L1',
        isCustomSpecies: c.beetleSpecies ? !COMMON_SPECIES.includes(c.beetleSpecies) : false,
        beetles: c.beetlesInfo ? JSON.parse(c.beetlesInfo) : [{
          name: c.beetleName || '',
          species: c.beetleSpecies || '',
          stage: c.beetleStage || '成虫',
          gender: c.beetleGender || '未辨识',
          size: c.beetleSize || '',
          instar: c.beetleInstar || 'L1',
          isCustomSpecies: c.beetleSpecies ? !COMMON_SPECIES.includes(c.beetleSpecies) : false
        }]
      }]
    });

    const imgRelativeUrls = c.imageUrls ? c.imageUrls.split(',').filter(u => u) : [];
    const existing = imgRelativeUrls.map(url => ({
      type: 'remote',
      url: url,
      previewUrl: url.startsWith('http') ? url : api.getApiBase() + url
    }));
    setSelectedImages(existing);

    setIsCustomSpecies(c.beetleSpecies && !COMMON_SPECIES.includes(c.beetleSpecies));
    setSubView('add');
  };

  const handleDelete = async (id) => {
    const doDelete = async () => {
      if (setConfirmModal) setConfirmModal(prev => ({ ...prev, show: false }));
      try {
        await api.request(`/api/costs/${id}`, { method: 'DELETE' });
        setCosts(prev => prev.filter(cost => cost.id !== id));
        showToast('删除成功', 'success');
        try {
          await loadData();
        } catch {
          // Local state has already been updated; keep the successful delete result visible.
        }
      } catch (err) {
        showToast(`删除失败: ${err.message || '未知错误'}`, 'error');
      }
    };

    if (setConfirmModal) {
      setConfirmModal({
        show: true,
        title: '删除确认',
        message: '确定要删除这条收支明细吗？',
        onConfirm: doDelete
      });
    } else {
      if (window.confirm(tr('确定要删除这条记录吗？'))) doDelete();
    }
  };


  const baseBatches = Array.from(new Set([...costs.map(c => c.batchName).filter(Boolean), ...allBatches, ...localBatches]));
  if (initialBatchName && initialBatchName !== '无批次' && !baseBatches.includes(initialBatchName)) {
    baseBatches.push(initialBatchName);
  }
  const uniqueBatches = baseBatches;
  const filteredCosts = selectedBatch === 'All' ? costs : costs.filter(c => c.batchName === selectedBatch);
  const sortedFilteredCosts = useMemo(() => sortByRecordDateDesc(filteredCosts), [filteredCosts]);
  const bulkBatchOptions = Array.from(new Set(['无批次', ...uniqueBatches])).filter(name => selectedBatch === 'All' || name !== selectedBatch);

  const dynamicSummary = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    filteredCosts.forEach(c => {
      if (c.type === 'EXPENSE') totalExpense += Number(c.amount) || 0;
      if (c.type === 'INCOME') totalIncome += Number(c.amount) || 0;
    });
    return { totalExpense, totalIncome, profit: totalIncome - totalExpense };
  }, [filteredCosts]);

  const handleBack = () => {
    if (subView === 'list') {
      setSubView('summary');
    } else {
      setSubView(editingCostId ? 'list' : returnSubView);
    }
    setEditingCostId(null);
  };

  return (
    <div className="view-container fade-in">
      <div className="view-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {subView !== 'summary' ? (
          <button className="btn-back" onClick={handleBack}>{tr("🔙 返回")}</button>
        ) : (
          <h2 className="view-title" style={{ margin: 0 }}>{tr("财务管理")}</h2>
        )}
        <button className="btn btn-ghost" onClick={onGoHome}>
          {tr("🏠 返回首页")}
        </button>
      </div>

      {subView === 'summary' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <select
              className="input"
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              style={{ width: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="All">{tr("全部批次")}</option>
              {uniqueBatches.map(b => (
                <option key={b} value={b}>{tv(b)}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '16px 8px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.02) 100%)', border: '1px solid rgba(255, 107, 107, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 107, 107, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💸</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{tr("总支出")}</div>
              <div style={{ fontSize: 'clamp(16px, 4.5vw, 26px)', fontWeight: '800', color: '#ff6b6b', fontFamily: 'system-ui', letterSpacing: '-0.5px' }}>¥{dynamicSummary.totalExpense.toFixed(2)}</div>
            </div>
            <div className="card" style={{ padding: '16px 8px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(81, 207, 102, 0.1) 0%, rgba(81, 207, 102, 0.02) 100%)', border: '1px solid rgba(81, 207, 102, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(81, 207, 102, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{tr("总收入")}</div>
              <div style={{ fontSize: 'clamp(16px, 4.5vw, 26px)', fontWeight: '800', color: '#51cf66', fontFamily: 'system-ui', letterSpacing: '-0.5px' }}>¥{dynamicSummary.totalIncome.toFixed(2)}</div>
            </div>
            <div className="card" style={{ padding: '16px 8px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(77, 171, 247, 0.1) 0%, rgba(77, 171, 247, 0.02) 100%)', border: '1px solid rgba(77, 171, 247, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(77, 171, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚖️</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{tr("当前盈亏")}</div>
              <div style={{ fontSize: 'clamp(16px, 4.5vw, 26px)', fontWeight: '800', color: dynamicSummary.profit >= 0 ? '#51cf66' : '#ff6b6b', fontFamily: 'system-ui', letterSpacing: '-0.5px' }}>
                {dynamicSummary.profit >= 0 ? '+' : ''}¥{dynamicSummary.profit.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '16px', fontSize: '16px' }} onClick={() => { setReturnSubView('summary'); setSubView('add'); }}>
              {tr("➕ 录入新记录")}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '16px', fontSize: '16px' }} onClick={() => setSubView('list')}>
              {tr("📜 收支明细")}
            </button>
          </div>
        </>
      )}

      {subView === 'add' && (
        <div className="card" style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>

          {/* Tab Headers */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', borderRadius: '30px', padding: '6px', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleTabChange('EXPENSE')}
              style={{
                padding: '10px 24px',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '24px',
                background: activeTab === 'EXPENSE' ? '#ff6b6b' : 'transparent',
                color: activeTab === 'EXPENSE' ? '#fff' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: activeTab === 'EXPENSE' ? '0 4px 12px rgba(255,107,107,0.3)' : 'none'
              }}
            >
              {tr("💸 录入支出")}
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('INCOME')}
              style={{
                padding: '10px 24px',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '24px',
                background: activeTab === 'INCOME' ? '#51cf66' : 'transparent',
                color: activeTab === 'INCOME' ? '#fff' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: activeTab === 'INCOME' ? '0 4px 12px rgba(81,207,102,0.3)' : 'none'
              }}
            >
              {tr("💰 录入收入")}
            </button>
          </div>
        </div>

        {/* Form Body */}

        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Global Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <DateInputWithClear
                label={tr("记录日期")}
                value={form.recordDate}
                onChange={e => setForm({...form, recordDate: e.target ? e.target.value : e})}
              />
              <div className="form-group">
                <label className="input-label">{tr("关联批次")}</label>
                <select
                  className="input"
                  value={uniqueBatches.includes(form.batchName) ? form.batchName : (form.batchName ? 'NEW' : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'NEW') {
                      const name = window.prompt(tr('请输入新批次名称'))?.trim();
                      if (!name) return;
                      setLocalBatches(prev => prev.includes(name) ? prev : [...prev, name]);
                      setForm({...form, batchName: name});
                    } else {
                      setForm({...form, batchName: val});
                    }
                  }}
                >
                  <option value="">{tr("-- 无批次 / 不关联 --")}</option>
                  {uniqueBatches.map(b => (
                    <option key={b} value={b}>{tv(b)}</option>
                  ))}
                  <option value="NEW">{tr("➕ 添加新批次")}</option>
                </select>
                {form.batchName && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                    {tr("买虫或卖虫记录里新建的甲虫会直接加入该批次，不会再出现在“无批次导入”列表。")}
                  </div>
                )}
              </div>
            </div>

            {/* Shopping Cart Items */}
            {form.items.map((item, index) => (
              <div key={index} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [...form.items];
                      newItems.splice(index, 1);
                      setForm({...form, items: newItems});
                    }}
                    style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '18px' }}
                  >
                    🗑️
                  </button>
                )}

                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--accent-color)' }}>{tr("明细项 #")}{index + 1}</h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="input-label">{tr("分类")}</label>
                    <select className="select" value={item.category} onChange={e => {
                      const newItems = [...form.items];
                      newItems[index].category = e.target.value;
                      setForm({...form, items: newItems});
                    }}>
                      {activeTab === 'EXPENSE' ? (
                        <>
                          <option value="WOOD_CHIPS">{tr("木屑")}</option>
                          <option value="JELLY">{tr("果冻")}</option>
                          <option value="JELLY_STAND">{tr("果冻台")}</option>
                          <option value="EQUIPMENT">{tr("器材")}</option>
                          <option value="BREEDING_BOX">{tr("饲养箱")}</option>
                          <option value="CLIMBING">{tr("攀爬物")}</option>
                          <option value="BEETLE_PURCHASE">{tr("买虫")}</option>
                          <option value="OTHER">{tr("其他")}</option>
                        </>
                      ) : (
                        <>
                          <option value="SALE">{tr("卖虫")}</option>
                          <option value="SALE_EQUIPMENT">{tr("卖二手器材")}</option>
                          <option value="OTHER">{tr("其他收入")}</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="input-label">{tr("金额 (¥)")}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={e => {
                        const newItems = [...form.items];
                        newItems[index].amount = e.target.value;
                        setForm({...form, items: newItems});
                      }}
                    />
                  </div>
                </div>

                {/* Wood Chips Specific */}
                {item.category === 'WOOD_CHIPS' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
                    <div className="form-group">
                      <label className="input-label">{tr("木屑品牌")}</label>
                      <select className="select" value={item.woodType} onChange={e => {
                        const newItems = [...form.items];
                        newItems[index].woodType = e.target.value;
                        setForm({...form, items: newItems});
                      }}>
                        <option value="牧野深度">{tr("牧野深度")}</option>
                        <option value="牧野浅度木屑">{tr("牧野浅度木屑")}</option>
                        <option value="阿银产房木屑">{tr("阿银产房木屑")}</option>
                        <option value="魔王">{tr("魔王")}</option>
                        <option value="兜土">{tr("兜土")}</option>
                        <option value="自制微发酵">{tr("自制微发酵")}</option>
                        <option value="其他">{tr("其他")}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="input-label">{tr("容量 (L)")}</label>
                      <select className="select" value={item.woodVolume || ''} onChange={e => {
                        const newItems = [...form.items];
                        newItems[index].woodVolume = e.target.value;
                        setForm({...form, items: newItems});
                      }}>
                        <option value="">{tr("-- 选择容量 --")}</option>
                        <option value="5">5L</option>
                        <option value="10">10L</option>
                        <option value="15">15L</option>
                        <option value="20">20L</option>
                        <option value="25">25L</option>
                        <option value="30">30L</option>
                        <option value="35">35L</option>
                        <option value="40">40L</option>
                        <option value="45">45L</option>
                        <option value="50">50L</option>
                        <option value="55">55L</option>
                        <option value="60">60L</option>
                        <option value="80">80L</option>
                        <option value="100">100L</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Beetle Specific */}
                {(item.category === 'BEETLE_PURCHASE' || item.category === 'SALE') && (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label className="input-label" style={{ margin: 0 }}>{tr("关联甲虫 (可多选)")}</label>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => openBeetlePicker(index)}
                      >
                        {tr("➕ 选择 / 新增")}
                      </button>
                    </div>

                    {(item.beetles || []).length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {tr("尚未关联甲虫，可从已有甲虫中选择，或手动录入新甲虫。")}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(item.beetles || []).map((b, bIdx) => (
                          <div key={b.existingId || b.tempId || bIdx} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{getCostBeetleLabel(b)}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{b.isNew === false || b.existingId ? tr("已有甲虫") : tr("新录入甲虫")}</div>
                            </div>
                          <button
                            type="button"
                            onClick={() => removeItemBeetle(index, bIdx)}
                            style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}
                          >
                            {tr("移除")}
                          </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="input-label">{tr("备注 / 说明")}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={tr("选填")}
                    value={item.description}
                    onChange={e => {
                      const newItems = [...form.items];
                      newItems[index].description = e.target.value;
                      setForm({...form, items: newItems});
                    }}
                  />
                </div>
              </div>
            ))}

            {!editingCostId && (
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '12px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '12px' }}
                onClick={() => {
                  const newItems = [...form.items, {
                    category: activeTab === 'EXPENSE' ? 'WOOD_CHIPS' : 'SALE',
                    amount: '',
                    description: '',
                    woodType: '牧野深度',
                    beetles: []
                  }];
                  setForm({...form, items: newItems});
                }}
              >
                {tr(activeTab === 'EXPENSE' ? "➕ 继续添加一项支出明细" : "➕ 继续添加一项收入明细")}
              </button>
            )}

            {/* Photos */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="input-label">{tr("📸 附带照片 (选填)")}</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {selectedImages.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={img.previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedImage(idx)}
                      style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: '24px', height: '24px', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                    {img.captured && img.file && (
                      <button
                        type="button"
                        className="img-save-album"
                        onClick={() => void saveCapturedPhotoWithFeedback(img.file, showToast)}
                      >
                        {tr("📥 存相册")}
                      </button>
                    )}
                  </div>
                ))}
                {selectedImages.length < 3 && (
                  <PhotoSourcePicker
                    onSelect={handleFilesSelected}
                    buttonStyle={{ width: '80px', height: '80px', flex: '0 0 80px' }}
                  />
                )}
              </div>
            </div>



            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '16px', fontSize: '16px', borderRadius: '12px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? tr("正在保存...") : (editingCostId ? tr("保存修改") : tr("确认录入"))}
              </button>
              {editingCostId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCostId(null);
                    setSubView('list');
                  }}
                  className="btn"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {tr("取消编辑")}
                </button>
              )}
            </div>
          </form>
        </div>
        </div>
      )}

      {subView === 'list' && (
        <div className="card" style={{ padding: '24px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span> {tr("收支明细")}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={() => { setReturnSubView('list'); setEditingCostId(null); setSubView('add'); }}
                style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '12px', fontWeight: '700' }}
              >
                {tr("➕ 新增")}
              </button>
              {selectedCostIds.length > 0 && (
                <>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{tr("已选")} {selectedCostIds.length} {tr("条")}</span>
                  <select className="input" value={bulkBatchName} onChange={e => setBulkBatchName(e.target.value)} style={{ width: '140px', margin: 0, padding: '6px 10px', fontSize: '12px' }}>
                    <option value="">{tr("目标批次")}</option>
                    {bulkBatchOptions.map(name => <option key={name} value={name}>{tv(name)}</option>)}
                  </select>
                  <button className="btn-ghost" onClick={handleBulkAssignBatch} disabled={bulkMoving} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '14px', background: 'rgba(93,189,138,0.18)' }}>
                    {bulkMoving ? tr("分配中...") : tr("批量分配")}
                  </button>
                </>
              )}
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{tr("共")} {sortedFilteredCosts.length} {tr("条记录")}</div>
            </div>
          </div>
        {sortedFilteredCosts.length === 0 ? (
          <div className="empty-state">{tr("暂无记录")}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sortedFilteredCosts.map(c => {
              const beetleSummary = getCostBeetleSummary(c);
              const isExpense = c.type === 'EXPENSE';
              const selected = selectedCostIds.includes(c.id);
              return (
              <div key={c.id} style={{
                display: 'grid',
                gridTemplateColumns: '28px minmax(0, 1fr) minmax(116px, auto)',
                gap: '14px',
                alignItems: 'start',
                padding: '18px',
                background: selected ? 'rgba(93,189,138,0.12)' : 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                border: selected ? '1px solid rgba(93,189,138,0.45)' : '1px solid rgba(255,255,255,0.05)',
                transition: 'transform 0.2s, background 0.2s',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', paddingTop: '8px' }}>
                    <input type="checkbox" checked={selected} onChange={() => toggleCostSelection(c.id)} style={{ width: '18px', height: '18px' }} />
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span style={{
                        padding: '6px 10px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        background: isExpense ? 'rgba(255,107,107,0.1)' : 'rgba(81,207,102,0.1)',
                        color: isExpense ? '#ff6b6b' : '#51cf66',
                        border: `1px solid ${isExpense ? 'rgba(255,107,107,0.2)' : 'rgba(81,207,102,0.2)'}`
                      }}>
                        {isExpense ? tr("支出") : tr("收入")}
                      </span>
                      <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700', overflowWrap: 'anywhere' }}>
                        {tr(getCategoryLabel(c.category))}{c.description ? ` - ${c.description}` : ''}
                      </span>
                    </div>
                    {(c.category === 'SALE' || c.category === 'BEETLE_PURCHASE') && beetleSummary && (
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.82)', background: 'rgba(0,0,0,0.18)', padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
                        🪲 {beetleSummary}
                      </div>
                    )}
                    {c.imageUrls && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                        {c.imageUrls.split(',').filter(u=>u).map((url, i) => {
                          const fullUrl = url.startsWith('http') ? url : api.getApiBase() + url;
                          return (
                            <div key={i} style={{ width: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} onClick={() => setLightboxUrl(fullUrl)}>
                              <img src={fullUrl} alt="record" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📅 {c.recordDate}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flexShrink: 0 }}>
                    <div style={{ fontWeight: '900', fontSize: '22px', color: isExpense ? '#ff8787' : '#69db7c', whiteSpace: 'nowrap', fontFamily: 'system-ui', lineHeight: 1.1 }}>
                      {isExpense ? '-' : '+'}¥{c.amount?.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(c)} style={{ background: 'rgba(77,171,247,0.1)', border: '1px solid rgba(77,171,247,0.2)', color: '#74c0fc', cursor: 'pointer', padding: '7px 12px', borderRadius: '9px', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }} onMouseOver={e => {e.currentTarget.style.background='rgba(77,171,247,0.2)'}} onMouseOut={e => {e.currentTarget.style.background='rgba(77,171,247,0.1)'}}>
                        {tr("✏️ 编辑")}
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', color: '#ff8787', cursor: 'pointer', padding: '7px 12px', borderRadius: '9px', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }} onMouseOver={e => {e.currentTarget.style.background='rgba(255,107,107,0.2)'}} onMouseOut={e => {e.currentTarget.style.background='rgba(255,107,107,0.1)'}}>
                      {tr("🗑️ 删除")}
                    </button>
                    </div>
                  </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {beetlePickerIndex !== null && (() => {
        const currentItem = form.items[beetlePickerIndex] || {};
        const selectedBeetles = currentItem.beetles || [];
        return (
          <div className="modal-overlay" onClick={closeBeetlePicker}>
            <div className="card" onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: 'rgba(15, 28, 15, 0.96)', border: '1px solid rgba(93, 189, 138, 0.25)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0 }}>{tr("🪲 选择关联甲虫")}</h3>
                <button type="button" onClick={closeBeetlePicker} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '22px' }}>×</button>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <div className="input-label" style={{ marginBottom: '8px' }}>{tr("已有甲虫")}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {allBeetles.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>{tr("暂无可选甲虫")}</div>
                  ) : (
                    allBeetles.map(beetle => {
                      const checked = selectedBeetles.some(b => b.existingId === beetle.id);
                      return (
                        <label key={beetle.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: checked ? 'rgba(93,189,138,0.16)' : 'rgba(255,255,255,0.04)', borderRadius: '8px', border: checked ? '1px solid rgba(93,189,138,0.45)' : '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleExistingBeetle(beetle)} style={{ transform: 'scale(1.15)' }} />
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{beetle.name || tr("未命名")}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                              {[
                                tv(beetle.species),
                                beetle.subspecies ? `(${tv(beetle.subspecies)})` : '',
                                tv(beetle.beetleType),
                                tv(beetle.gender)
                              ].filter(Boolean).join(' ')}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                {!showManualBeetleForm ? (
                  <button type="button" className="btn btn-ghost btn-full" onClick={() => setShowManualBeetleForm(true)}>
                    {tr("➕ 手动录入新甲虫")}
                  </button>
                ) : (
                  <div>
                    <div className="input-label" style={{ marginBottom: '10px' }}>{tr("手动录入新甲虫")}</div>
                    <BeetleEntryForm
                      beetle={manualBeetle}
                      showDates={true}
                      showToast={showToast}
                      onChange={setManualBeetle}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button type="button" className="btn btn-primary" onClick={addManualBeetle} style={{ flex: 1 }}>{tr("添加到已选")}</button>
                      <button type="button" className="btn btn-ghost" onClick={() => { setManualBeetle(createEmptyCostBeetle()); setShowManualBeetleForm(false); }} style={{ flex: 1 }}>{tr("取消")}</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{tr("已选")} {selectedBeetles.length} {tr("只")}</div>
                <button type="button" className="btn btn-primary" onClick={finishBeetlePicker} style={{ minWidth: '120px' }}>{tr("完成")}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {lightboxUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Enlarged view" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer', padding: '10px' }} onClick={() => setLightboxUrl(null)}>×</button>
        </div>
      )}

      {/* Upload Progress Overlay */}
      <UploadProgressOverlay isUploading={isUploading} progress={uploadProgress} />
    </div>
  );
}
