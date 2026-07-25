/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from 'react';

import * as api from './utils/api';

import { parseVoiceText } from './utils/voiceParser';

import GrowthChart from './components/GrowthChart';

import CostManagement from './components/CostManagement';

import BatchManagement from './components/BatchManagement';

import LoginRegister from './components/LoginRegister';

import UploadProgressOverlay from './components/common/UploadProgressOverlay';
import ImageAnnotationModal from './components/common/ImageAnnotationModal';
import PhotoSourcePicker from './components/common/PhotoSourcePicker';
import ReminderManagement from './components/ReminderManagement';
import BreedingOverview from './components/BreedingOverview';
import ProductionHistoryPanel from './components/ProductionHistoryPanel';
import { saveCapturedPhotoWithFeedback } from './utils/photoAlbum';
import LanguageSwitcher from './components/LanguageSwitcher';
import { translate as tr, translateValue as tv, useI18n } from './i18n';



const beetleLogo = "/beetle_logo.png";



// Helper for today's date in YYYY-MM-DD

const getTodayString = () => {

  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

};



import DateInputWithClear from './components/common/DateInputWithClear';
import BeetleEntryForm from './components/common/BeetleEntryForm';

const createEmptyBeetleForm = (overrides = {}) => ({
  name: '',
  species: '',
  subspecies: '',
  bloodline: '',
  hatchDate: getTodayString(),
  emergenceDate: '',
  dormancyEndDate: '',
  adultLength: '',
  adultWeight: '',
  notes: '',
  gender: '未辨识',
  beetleType: '幼虫',
  stage: '幼虫',
  size: '',
  instar: 'L1',
  images: [],
  isCustomSpecies: false,
  isCustomSubspecies: false,
  isCustomBloodline: false,
  ...overrides
});

const imageUrlsToFormImages = (imageUrls = '') => imageUrls
  .split(',')
  .filter(Boolean)
  .map(url => ({
    type: 'remote',
    url,
    previewUrl: url.startsWith('http') ? url : api.getApiBase() + url
  }));

const splitImageUrls = (imageUrls = '') => String(imageUrls || '').split(',').map(url => url.trim()).filter(Boolean);

const isSameImageSet = (left = [], right = []) => {
  if (left.length === 0 || left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every(url => rightSet.has(url));
};

const isLikelyBeetleImageLeak = (recordImageUrls = [], beetleImageUrls = []) => (
  isSameImageSet(recordImageUrls, beetleImageUrls)
);

const releaseLocalImagePreviews = (images = []) => {
  images.forEach(img => {
    if (img?.file && img.previewUrl) {
      URL.revokeObjectURL(img.previewUrl);
    }
  });
};

const toBeetlePayload = (form, imageUrls) => {
  const beetleType = form.beetleType || form.stage || '幼虫';
  const adultLength = form.adultLength || form.size;
  return {
    ...form,
    beetleType,
    stage: beetleType,
    adultLength: beetleType === '成虫' && adultLength ? parseFloat(adultLength) : null,
    adultWeight: beetleType === '成虫' && form.adultWeight ? parseFloat(form.adultWeight) : null,
    imageUrls
  };
};



const STAGES = ['卵', '一龄幼虫', '二龄幼虫', '三龄幼虫', '蛹', '成虫', '其他'];

const DETAIL_RETURN_LABELS = {
  home: '🏠 返回首页',
  batch: '← 返回批次',
  breeding: '← 返回繁殖',
  costs: '← 返回财务',
  reminders: '← 返回提醒'
};

const normalizeDetailReturnTarget = (target) => (
  Object.prototype.hasOwnProperty.call(DETAIL_RETURN_LABELS, target) ? target : 'home'
);



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



const GenderIcon = ({ gender }) => {

  if (gender === '公虫') {

    return (

      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>

        <circle cx="10" cy="14" r="5"></circle>

        <line x1="13.5" y1="10.5" x2="20" y2="4"></line>

        <polyline points="16 4 20 4 20 8"></polyline>

      </svg>

    );

  }

  if (gender === '母虫') {

    return (

      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>

        <circle cx="12" cy="10" r="5"></circle>

        <line x1="12" y1="15" x2="12" y2="21"></line>

        <line x1="9" y1="18" x2="15" y2="18"></line>

      </svg>

    );

  }

  return null;

};



export default function App() {
  useI18n();

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



  // Routing View State: 'list' | 'add-beetle' | 'detail' | 'add-record' | 'edit-beetle' | 'edit-record' | 'add-production' | 'edit-production' | 'breeding'

  const [currentView, setCurrentView] = useState('batches');

  const [detailReturnTarget, setDetailReturnTarget] = useState('home');

  const [currentBatch, setCurrentBatch] = useState(null);

  const [editingRecordId, setEditingRecordId] = useState('');

  const [editingProductionId, setEditingProductionId] = useState('');



  // Security state

  const [isAuthorized, setIsAuthorized] = useState(!!(localStorage.getItem('beetle_token') || sessionStorage.getItem('beetle_token')));

  const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('beetle_username') || sessionStorage.getItem('beetle_username') || '');

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });



  // Search state

  const [showSearchModal, setShowSearchModal] = useState(false);

  const [searchParams, setSearchParams] = useState({ keyword: '', startDate: '', endDate: '' });

  const [searchResults, setSearchResults] = useState([]);

  const [isSearching, setIsSearching] = useState(false);



  // Data states

  const [beetles, setBeetles] = useState([]);

  const [activeBeetleId, setActiveBeetleId] = useState('');

  const [activeBeetle, setActiveBeetle] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [detailError, setDetailError] = useState('');

  const [detailRequestVersion, setDetailRequestVersion] = useState(0);

  const detailRequestRef = useRef(0);

  const [records, setRecords] = useState([]);

  const [productionRecords, setProductionRecords] = useState([]);

  const [productionHistoryByRecord, setProductionHistoryByRecord] = useState({});

  const [expandedProductionHistory, setExpandedProductionHistory] = useState({});

  const [loadingProductionHistory, setLoadingProductionHistory] = useState({});



  // Form states

  const [beetleForm, setBeetleForm] = useState(() => createEmptyBeetleForm());



  const [recordForm, setRecordForm] = useState({

    recordDate: getTodayString(),

    stage: '卵',

    weight: '',

    length: '',

    temperature: '',

    humidity: '',

    notes: ''

  });



  const [productionForm, setProductionForm] = useState({

    matingDate: getTodayString(),

    maleBeetle: '',

    layBoxDate: '',

    removeDate: '',

    eggCount: '',

    hatchCount: '',

    notes: ''

  });



  const [selectedImages, setSelectedImages] = useState([]); // array of { file, previewUrl }

  const [lightboxUrl, setLightboxUrl] = useState(null);

  const [annotationImageIndex, setAnnotationImageIndex] = useState(null);

  const [draggedImageIndex, setDraggedImageIndex] = useState(null);

  const [editingCostIdGlobal, setEditingCostIdGlobal] = useState(null);



  // Upload Progress State

  const [isUploading, setIsUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);



  // Global Loading State

  const [globalLoadingCount, setGlobalLoadingCount] = useState(0);



  useEffect(() => {

    const handleLoading = (e) => {

      setGlobalLoadingCount(prev => {

        const next = e.detail ? prev + 1 : prev - 1;

        return Math.max(0, next);

      });

    };

    window.addEventListener('beetle-loading', handleLoading);

    return () => window.removeEventListener('beetle-loading', handleLoading);

  }, []);



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

    const requestId = ++detailRequestRef.current;

    setDetailLoading(true);

    setDetailError('');

    try {

      const [beetleData, recordsData, productionsData] = await Promise.all([

        api.request(`/api/beetles/${encodeURIComponent(id)}`),

        api.request(`/api/beetles/${encodeURIComponent(id)}/records`),

        api.request(`/api/beetles/${encodeURIComponent(id)}/productions`)

      ]);

      if (requestId !== detailRequestRef.current) return;

      setActiveBeetle(beetleData.item || null);

      setRecords(recordsData.items || []);

      setProductionRecords(productionsData.items || []);

      setProductionHistoryByRecord({});

      setExpandedProductionHistory({});

      setLoadingProductionHistory({});

    } catch (err) {

      if (requestId !== detailRequestRef.current) return;

      const message = err?.message || '未知错误';

      setDetailError(message);

      showToast(`加载详情失败：${message}`, 'error');

    } finally {

      if (requestId === detailRequestRef.current) {

        setDetailLoading(false);

      }

    }

  }, [showToast]);



  // Load details when active beetle changes

  useEffect(() => {

    if (activeBeetleId) {

      loadBeetleDetails(activeBeetleId);

    } else {

      detailRequestRef.current += 1;

      setDetailLoading(false);

      setDetailError('');

      setTimeout(() => {

        setActiveBeetle(null);

        setRecords([]);

        setProductionRecords([]);

        setProductionHistoryByRecord({});

        setExpandedProductionHistory({});

        setLoadingProductionHistory({});

      }, 0);

    }

  }, [activeBeetleId, detailRequestVersion, loadBeetleDetails]);



  const openBeetleDetail = useCallback((beetleId, returnTarget = 'home') => {

    if (beetleId === null || beetleId === undefined || beetleId === '') {

      showToast('无法打开详情：甲虫编号缺失', 'error');

      return;

    }

    setActiveBeetle(null);

    setDetailLoading(true);

    setDetailError('');

    setDetailReturnTarget(normalizeDetailReturnTarget(returnTarget));

    setActiveBeetleId(beetleId);

    setDetailRequestVersion(version => version + 1);

    setCurrentView('detail');

  }, [showToast]);



  const goHome = useCallback(() => {

    setCurrentBatch(null);

    setCurrentView('batches');

  }, []);



  const navigateToDetailReturnTarget = useCallback((target) => {

    const normalizedTarget = normalizeDetailReturnTarget(target);

    if (normalizedTarget === 'home') {

      goHome();

      return;

    }

    setCurrentView(normalizedTarget === 'batch' ? 'batches' : normalizedTarget);

  }, [goHome]);



  const getCurrentDetailReturnTarget = () => {

    if (currentView === 'batches') return currentBatch ? 'batch' : 'home';

    if (['breeding', 'costs', 'reminders'].includes(currentView)) return currentView;

    if (['detail', 'add-record', 'edit-beetle', 'edit-record', 'add-production', 'edit-production'].includes(currentView)) {

      return detailReturnTarget;

    }

    return currentBatch ? 'batch' : 'home';

  };



  const toggleProductionHistory = async (productionRecordId) => {

    const shouldExpand = !expandedProductionHistory[productionRecordId];

    setExpandedProductionHistory(prev => ({

      ...prev,

      [productionRecordId]: shouldExpand

    }));



    if (

      !shouldExpand

      || Object.prototype.hasOwnProperty.call(productionHistoryByRecord, productionRecordId)

      || loadingProductionHistory[productionRecordId]

      || !activeBeetleId

    ) {

      return;

    }



    setLoadingProductionHistory(prev => ({ ...prev, [productionRecordId]: true }));

    try {

      const data = await api.request(

        `/api/beetles/${encodeURIComponent(activeBeetleId)}/productions/${encodeURIComponent(productionRecordId)}/history`

      );

      setProductionHistoryByRecord(prev => ({

        ...prev,

        [productionRecordId]: data.items || []

      }));

    } catch (err) {

      setExpandedProductionHistory(prev => ({ ...prev, [productionRecordId]: false }));

      showToast('加载编辑历史失败: ' + err.message, 'error');

    } finally {

      setLoadingProductionHistory(prev => ({ ...prev, [productionRecordId]: false }));

    }

  };







  const handleLoginSuccess = (username) => {

    setIsAuthorized(true);

    setCurrentUsername(username);

    showToast(`欢迎回来, ${username}`, 'success');

    loadBeetles();

  };



  const handleLogout = () => {

    localStorage.removeItem('beetle_token');

    sessionStorage.removeItem('beetle_token');

    localStorage.removeItem('beetle_username');

    sessionStorage.removeItem('beetle_username');

    setIsAuthorized(false);

    setCurrentUsername('');

    setBeetles([]);

    setActiveBeetleId('');

    setActiveBeetle(null);

    setRecords([]);

    setProductionRecords([]);

    showToast('已安全退出登录', 'success');

  };



  const performSearch = async (e) => {

    if (e) e.preventDefault();

    setIsSearching(true);

    try {

      const query = new URLSearchParams({

        keyword: searchParams.keyword,

        startDate: searchParams.startDate,

        endDate: searchParams.endDate

      }).toString();

      const data = await api.request(`/api/search?${query}`);

      setSearchResults(data);

    } catch (err) {

      showToast('搜索失败: ' + err.message, 'error');

    } finally {

      setIsSearching(false);

    }

  };



  const handleSearchResultClick = (result) => {

    setShowSearchModal(false);

    if (result.type === 'COST') {

      setCurrentView('costs');

    } else {

      openBeetleDetail(result.beetleId, getCurrentDetailReturnTarget());

    }

  };



  const handleUpdateApiBase = (e) => {

    e.preventDefault();

    api.setApiBase(apiBase);

    setShowApiConfig(false);

    loadBeetles();

  };



  const uploadBeetleImages = async (images = []) => {
    const hasLocal = images.some(img => img?.file);
    if (hasLocal) {
      setIsUploading(true);
      setUploadProgress(0);
    }
    try {
      const results = await Promise.all(images.map(async img => {
        if (img?.file) {
          const res = await api.uploadFile(img.file, p => setUploadProgress(p));
          return res.url;
        }
        return img?.url || img?.previewUrl || img;
      }));
      return results.filter(Boolean).join(',');
    } finally {
      if (hasLocal) {
        setIsUploading(false);
      }
    }
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

      const imageUrls = await uploadBeetleImages(beetleForm.images || []);
      const finalBeetleData = toBeetlePayload(beetleForm, imageUrls);



      const res = await api.request('/api/beetles', {

        method: 'POST',

        data: finalBeetleData

      });

      showToast('甲虫新增成功！', 'success');

      releaseLocalImagePreviews(beetleForm.images);
      setBeetleForm(createEmptyBeetleForm());

      setSelectedImages([]);



      // Refresh list

      const updatedList = await api.request('/api/beetles');

      setBeetles(updatedList.items || []);



      if (res.item && res.item.id) {

        openBeetleDetail(res.item.id, currentBatch ? 'batch' : 'home');

      } else {

        setCurrentView('batches');

      }

    } catch (err) {

      setIsUploading(false);

      showToast('保存失败: ' + err.message, 'error');

    }

  };



  const handleOpenAddBeetle = () => {

    releaseLocalImagePreviews(beetleForm.images);
    setBeetleForm(createEmptyBeetleForm());

    selectedImages.forEach(img => {

      if (img.type === 'local') {

        URL.revokeObjectURL(img.previewUrl);

      }

    });

    setSelectedImages([]);

    setCurrentView('add-beetle');

  };



  const handleOpenAddRecord = () => {

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

    setCurrentView('add-record');

  };

  const handleOpenEmergenceRecord = () => {

    setRecordForm({

      recordDate: activeBeetle?.emergenceDate || getTodayString(),

      stage: '成虫',

      weight: activeBeetle?.adultWeight ?? '',

      length: activeBeetle?.adultLength ?? '',

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

    setCurrentView('add-record');

  };



  const handleCancelAddBeetle = () => {

    handleOpenAddBeetle(); // Reuse the clear logic

    setCurrentView('batches');

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

          navigateToDetailReturnTarget(detailReturnTarget);

        } catch (err) {

          showToast('删除失败: ' + err.message, 'error');

        }

        setConfirmModal(prev => ({ ...prev, show: false }));

      }

    });

  };



  const handleFilesSelected = (files, source = 'album', maxImages = 9) => {

    const selectedFiles = Array.from(files || []);

    if (selectedFiles.length === 0) return;



    // Keep the configured image limit for the current form.

    const allowedCount = maxImages - selectedImages.length;

    const addedImages = selectedFiles.slice(0, allowedCount).map(file => ({

      id: `${Date.now()}-${file.name}-${crypto.randomUUID()}`,

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

  const handleImageDrop = (targetIndex) => {
    const sourceIndex = draggedImageIndex;
    setDraggedImageIndex(null);
    if (sourceIndex === null || sourceIndex === targetIndex) return;
    setSelectedImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSaveAnnotation = (blob) => {
    const index = annotationImageIndex;
    if (index === null) return;
    const file = new File([blob], `production-annotation-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    const previewUrl = URL.createObjectURL(file);
    setSelectedImages(prev => prev.map((image, imageIndex) => {
      if (imageIndex !== index) return image;
      if (image.type === 'local') URL.revokeObjectURL(image.previewUrl);
      return { id: image.id || crypto.randomUUID(), type: 'local', file, previewUrl };
    }));
    setAnnotationImageIndex(null);
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
        const hasLocal = selectedImages.some(img => img.type === 'local');
        if (hasLocal) {
          setIsUploading(true);
          setUploadProgress(0);
        }
        const uploadPromises = selectedImages.map(async img => {
          if (img.type === 'local') {
            const res = await api.uploadFile(img.file, p => setUploadProgress(p));
            return res.url;
          } else {
            return img.url;
          }
        });
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.filter(url => url);

        if (hasLocal) {

          setIsUploading(false);

        }

      }



      // 2. Submit growth record

      const finalRecordData = {

        ...recordForm,

        imageUrls: uploadedUrls.join(',')

      };



      const synchronizesAdultStage = recordForm.stage === '成虫' && activeBeetle?.beetleType !== '成虫';

      await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/records`, {

        method: 'POST',

        data: finalRecordData

      });



      showToast(
        synchronizesAdultStage ? '羽化记录已保存，个体已同步为成虫！' : '成长记录已保存！',
        'success'
      );



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

      await Promise.all([
        loadBeetleDetails(activeBeetleId),
        loadBeetles()
      ]);

      setCurrentView('detail');

    } catch (err) {

      setIsUploading(false);

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



  // --- Production Record Logic ---

  const handleProductionFormChange = (key, val) => {

    setProductionForm(prev => ({ ...prev, [key]: val }));

  };



  const handleCancelAddProduction = () => {

    selectedImages.forEach(img => {

      if (img.type === 'local') {

        URL.revokeObjectURL(img.previewUrl);

      }

    });

    setSelectedImages([]);

    setCurrentView('detail');

  };



  const handleCreateProduction = async (e) => {

    e.preventDefault();

    if (!activeBeetleId) return;



    try {

      setIsUploading(true);

      setUploadProgress(0);

      const uploadPromises = selectedImages.map(async img => {

        if (img.type === 'local') {

          const res = await api.uploadFile(img.file, p => setUploadProgress(p));

          return res.url;

        } else {

          return img.url;

        }

      });

      const results = await Promise.all(uploadPromises);

      const uploadedUrls = results.filter(url => url);

      setIsUploading(false);



      const finalData = {

        ...productionForm,

        imageUrls: uploadedUrls.join(',')

      };



      await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/productions`, {

        method: 'POST',

        data: finalData

      });

      showToast('生产记录已保存！', 'success');

      await loadBeetleDetails(activeBeetleId);

      setCurrentView('detail');

    } catch (err) {

      setIsUploading(false);

      showToast('保存失败: ' + err.message, 'error');

    }

  };



  const handleCancelEditProduction = () => {

    selectedImages.forEach(img => {

      if (img.type === 'local') {

        URL.revokeObjectURL(img.previewUrl);

      }

    });

    setSelectedImages([]);

    setEditingProductionId('');

    setCurrentView('detail');

  };



  const handleUpdateProduction = async (e) => {

    e.preventDefault();

    if (!activeBeetleId || !editingProductionId) return;



    try {

      setIsUploading(true);

      setUploadProgress(0);

      const uploadPromises = selectedImages.map(async img => {

        if (img.type === 'local') {

          const res = await api.uploadFile(img.file, p => setUploadProgress(p));

          return res.url;

        } else {

          return img.url;

        }

      });

      const results = await Promise.all(uploadPromises);

      const uploadedUrls = results.filter(url => url);

      setIsUploading(false);



      const finalData = {

        ...productionForm,

        imageUrls: uploadedUrls.join(',')

      };



      await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/productions/${encodeURIComponent(editingProductionId)}`, {

        method: 'PUT',

        data: finalData

      });

      showToast('生产记录已更新！', 'success');

      setEditingProductionId('');

      await loadBeetleDetails(activeBeetleId);

      setCurrentView('detail');

    } catch (err) {

      setIsUploading(false);

      showToast('更新失败: ' + err.message, 'error');

    }

  };



  const handleDeleteProduction = (prodId) => {

    if (!activeBeetleId) return;

    setConfirmModal({

      show: true,

      title: '🗑️ 删除生产记录',

      message: '确定要删除这条生产记录吗？',

      onConfirm: async () => {

        try {

          await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/productions/${encodeURIComponent(prodId)}`, {

            method: 'DELETE'

          });

          showToast('已成功删除生产记录', 'success');

          await loadBeetleDetails(activeBeetleId);

        } catch (err) {

          showToast('删除失败: ' + err.message, 'error');

        }

        setConfirmModal(prev => ({ ...prev, show: false }));

      }

    });

  };



  // --- Edit Beetle Logic ---

  const handleEditBeetleClick = () => {

    if (!activeBeetle) return;

    const beetleType = activeBeetle.beetleType || '幼虫';
    setBeetleForm(createEmptyBeetleForm({
      ...activeBeetle,
      beetleType,
      stage: beetleType,
      size: activeBeetle.adultLength || '',
      isCustomSpecies: !!activeBeetle.species && !COMMON_SPECIES.includes(activeBeetle.species),
      isCustomSubspecies: false,
      isCustomBloodline: false,
      images: imageUrlsToFormImages(activeBeetle.imageUrls || '')
    }));

    setSelectedImages([]);



    setCurrentView('edit-beetle');

  };



  const handleUpdateBeetle = async (e) => {

    e.preventDefault();

    if (!beetleForm.name.trim()) {

      showToast('请填写名称', 'error');

      return;

    }



    try {

      const imageUrls = await uploadBeetleImages(beetleForm.images || []);
      const finalBeetleData = toBeetlePayload(beetleForm, imageUrls);



      const response = await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}`, {

        method: 'PUT',

        data: finalBeetleData

      });
      if (response?.item) {
        setActiveBeetle(response.item);
      }

      showToast('甲虫修改成功！', 'success');

      releaseLocalImagePreviews(beetleForm.images);

      setSelectedImages([]);



      // Refresh details and list

      await loadBeetleDetails(activeBeetleId);

      await loadBeetles();

      setCurrentView('detail');

    } catch (err) {

      setIsUploading(false);

      showToast('修改失败: ' + err.message, 'error');

    }

  };



  const handleCancelEditBeetle = () => {

    releaseLocalImagePreviews(beetleForm.images);

    setSelectedImages([]);

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



    const imgRelativeUrls = splitImageUrls(record.imageUrls);

    const beetleImageUrls = splitImageUrls(activeBeetle?.imageUrls || '');

    const safeImageUrls = isLikelyBeetleImageLeak(imgRelativeUrls, beetleImageUrls) ? [] : imgRelativeUrls;

    const existing = safeImageUrls.map(url => ({

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

      setIsUploading(true);

      setUploadProgress(0);

      const uploadPromises = selectedImages.map(async img => {

        if (img.type === 'local') {

          const res = await api.uploadFile(img.file, p => setUploadProgress(p));

          return res.url;

        } else {

          return img.url;

        }

      });

      const results = await Promise.all(uploadPromises);

      const uploadedUrls = results.filter(url => url);

      setIsUploading(false);



      const finalRecordData = {

        ...recordForm,

        imageUrls: uploadedUrls.join(',')

      };



      const synchronizesAdultStage = recordForm.stage === '成虫' && activeBeetle?.beetleType !== '成虫';

      await api.request(`/api/beetles/${encodeURIComponent(activeBeetleId)}/records/${encodeURIComponent(editingRecordId)}`, {

        method: 'PUT',

        data: finalRecordData

      });



      showToast(
        synchronizesAdultStage ? '羽化记录已更新，个体已同步为成虫！' : '成长记录已更新！',
        'success'
      );



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



      await Promise.all([
        loadBeetleDetails(activeBeetleId),
        loadBeetles()
      ]);

      setCurrentView('detail');

    } catch (err) {

      setIsUploading(false);

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

        <h2 className="section-title">{tr("🌿 我的甲虫 (")}{beetles.length})</h2>

        <button className="btn btn-primary" onClick={handleOpenAddBeetle}>

          {tr("➕ 新增甲虫")}

        </button>

      </div>



      {beetles.length === 0 ? (

        <div className="card">

          <div className="empty-state">

            <div className="empty-state-icon">🌵</div>

            <div className="empty-state-text">{tr("还没有录入任何甲虫个体")}</div>

            <button className="btn btn-ghost btn-small" style={{ marginTop: '12px' }} onClick={handleOpenAddBeetle}>

              {tr("立即添加第一只")}

            </button>

          </div>

        </div>

      ) : (

        <div className="beetle-list-container">

          {beetles.map(beetle => (

            <div

              key={beetle.id}

              className="beetle-item-card"

              onClick={() => openBeetleDetail(beetle.id)}

            >

              <div>

                <div className="beetle-item-name">{beetle.name}</div>

                <div className="beetle-item-species">

                  <span>{beetle.beetleType === '幼虫' ? '🐛' : '🪲'} {tv(beetle.species || '未知品种')}</span>

                  {beetle.beetleType === '幼虫' && beetle.hatchDate && (

                    <span style={{ marginLeft: '12px' }}>{tr("📅 孵化:")} {beetle.hatchDate}</span>

                  )}

                  {beetle.beetleType === '成虫' && beetle.emergenceDate && (

                    <span style={{ marginLeft: '12px' }}>{tr("📅 羽化:")} {beetle.emergenceDate}</span>

                  )}

                  {beetle.beetleType === '成虫' && beetle.gender && beetle.gender !== '未辨识' && (

                    <span style={{

                      display: 'inline-flex',

                      alignItems: 'center',

                      gap: '4px',

                      padding: '2px 6px',

                      borderRadius: '4px',

                      background: beetle.gender === '母虫' ? 'rgba(255, 105, 180, 0.15)' : 'rgba(54, 162, 235, 0.15)',

                      color: beetle.gender === '母虫' ? '#ff69b4' : '#36a2eb',

                      fontWeight: 'bold',

                      lineHeight: '1'

                    }}>

                      <GenderIcon gender={beetle.gender} />

                      <span>{tv(beetle.gender)}</span>

                    </span>

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
        <button className="btn-back" onClick={handleCancelAddBeetle}>{tr("🔙 返回看板")}</button>
        <span className="view-title">{tr("✨ 新增甲虫个体")}</span>
      </div>

      <form onSubmit={handleCreateBeetle}>

        <BeetleEntryForm
          beetle={beetleForm}
          showDates={true}
          maxImages={9}
          showToast={showToast}
          onChange={(updated) => setBeetleForm(updated)}
        />

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{tr("💾 保存个体")}</button>
          <button type="button" className="btn btn-ghost" onClick={handleCancelAddBeetle} style={{ flex: 1 }}>{tr("取消")}</button>
        </div>
      </form>
    </div>
  );

  // --- RENDER VIEW: Beetle Details ---

  const renderDetail = () => {

    const handleDetailBack = () => navigateToDetailReturnTarget(detailReturnTarget);

    const detailBackLabel = tr(DETAIL_RETURN_LABELS[detailReturnTarget] || DETAIL_RETURN_LABELS.home);

    if (!activeBeetle) {

      return (

        <div style={{ animation: 'fadeIn 0.3s' }}>

          <div className="view-header">

            <button className="btn-back" onClick={handleDetailBack}>{detailBackLabel}</button>

          </div>

          <div className="card">

            <div className="empty-state" role={detailError ? 'alert' : 'status'}>

              <div className="empty-state-icon">{detailLoading ? '⏳' : '⚠️'}</div>

              <div className="empty-state-text">

                {detailLoading ? tr("正在加载甲虫详情…") : tr("甲虫详情暂时无法显示")}

              </div>

              {!detailLoading && detailError && (

                <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>{tr(detailError)}</div>

              )}

              {!detailLoading && activeBeetleId && (

                <button

                  type="button"

                  className="btn btn-primary btn-small"

                  style={{ marginTop: '12px' }}

                  onClick={() => loadBeetleDetails(activeBeetleId)}

                >

                  {tr("重新加载")}

                </button>

              )}

            </div>

          </div>

        </div>

      );

    }

    const productionSummary = productionRecords.reduce((summary, record) => {
      const eggCount = Number.parseInt(record.eggCount, 10);
      const expectedHatchCount = Number.parseInt(record.expectedHatchCount, 10);
      const hatchCount = Number.parseInt(record.hatchCount, 10);

      if (Number.isFinite(eggCount)) summary.eggCount += eggCount;
      if (Number.isFinite(expectedHatchCount)) summary.expectedHatchCount += expectedHatchCount;
      if (Number.isFinite(hatchCount)) {
        summary.hatchCount += hatchCount;
        summary.completedHatchRecords += 1;
      }

      return summary;
    }, {
      eggCount: 0,
      expectedHatchCount: 0,
      hatchCount: 0,
      completedHatchRecords: 0
    });

    const hatchRate = productionSummary.eggCount > 0
      ? `${((productionSummary.hatchCount / productionSummary.eggCount) * 100).toFixed(1)}%`
      : '-';

    return (

      <div style={{ animation: 'fadeIn 0.3s' }}>

        <div className="view-header">

          <button className="btn-back" onClick={handleDetailBack}>{detailBackLabel}</button>

          <div className="detail-actions">

            <button className="btn btn-primary btn-small" onClick={handleEditBeetleClick}>{tr("✏️ 编辑甲虫")}</button>

            <button className="btn btn-danger btn-small" onClick={handleDeleteBeetle}>{tr("🗑️ 删除甲虫")}</button>

            <button
              className="btn btn-ghost btn-small"
              type="button"
              title={tr("重新加载页面并获取最新版本")}
              onClick={() => window.location.reload()}
            >
              {tr("🔄 刷新页面")}
            </button>

          </div>

        </div>



        {/* Overview Card */}

        <div className="card beetle-detail-card">

          {activeBeetle.imageUrls && (

            <div className="record-images" style={{ marginBottom: '16px' }}>

              {activeBeetle.imageUrls.split(',').filter(u => u).map((url, idx) => {

                const fullUrl = url.startsWith('http') ? url : api.getApiBase() + url;

                return (

                  <img

                    key={idx}

                    src={fullUrl}

                    alt="Beetle"

                    className="record-img-thumb"

                    onClick={() => setLightboxUrl(fullUrl)}

                  />

                );

              })}

            </div>

          )}

          <div>

            <h2 className="detail-title">🪲 {activeBeetle.name}</h2>

            <div className="detail-tags">

              {activeBeetle.species && (
                <span className="detail-tag">🔬 {tv(activeBeetle.species)}</span>
              )}
              {activeBeetle.subspecies && (
                <span className="detail-tag">🏷️ {tv(activeBeetle.subspecies)}</span>
              )}
              {activeBeetle.bloodline && (
                <span className="detail-tag">🧬 {tv(activeBeetle.bloodline)}</span>
              )}

              {activeBeetle.beetleType && (

                <span className="detail-tag">{activeBeetle.beetleType === '幼虫' ? '🐛' : '🪲'} {tv(activeBeetle.beetleType)}</span>

              )}

              {activeBeetle.beetleType === '成虫' && activeBeetle.gender && activeBeetle.gender !== '未辨识' && (

                <span className="detail-tag" style={{

                  background: activeBeetle.gender === '母虫' ? 'rgba(255, 105, 180, 0.15)' : 'rgba(54, 162, 235, 0.15)',

                  color: activeBeetle.gender === '母虫' ? '#ff69b4' : '#36a2eb',

                  border: 'none',

                  fontWeight: 'bold'

                }}>

                  <GenderIcon gender={activeBeetle.gender} />

                  <span>{tv(activeBeetle.gender)}</span>

                </span>

              )}

              {activeBeetle.hatchDate && (

                <span className="detail-tag">{tr("📅 孵化于")} {activeBeetle.hatchDate}</span>

              )}

              {activeBeetle.beetleType === '成虫' && activeBeetle.emergenceDate && (

                <span className="detail-tag">{tr("📅 羽化于")} {activeBeetle.emergenceDate}</span>

              )}

              {activeBeetle.beetleType === '成虫' && activeBeetle.dormancyEndDate && (

                <span className="detail-tag">{tr("📅 出蛰伏")} {activeBeetle.dormancyEndDate}</span>

              )}

              {activeBeetle.beetleType === '成虫' && activeBeetle.adultLength && (

                <span className="detail-tag">{tr("📏 体长")} {activeBeetle.adultLength} mm</span>

              )}

              {activeBeetle.beetleType === '成虫' && activeBeetle.adultWeight && (

                <span className="detail-tag">{tr("⚖️ 体重")} {activeBeetle.adultWeight} g</span>

              )}

            </div>

          </div>

          {activeBeetle.notes && (

            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginTop: '6px' }}>

              <strong>{tr("个体备注：")}</strong>{activeBeetle.notes}

            </div>

          )}

        </div>



        {/* Production Records List (For Adult Females) */}

        {activeBeetle.beetleType === '成虫' && activeBeetle.gender === '母虫' && (

          <div style={{ marginTop: '24px' }}>

            <div className="view-header" style={{ marginBottom: '14px' }}>

              <h2 className="section-title" style={{ margin: 0 }}>{tr("🎀 生产繁殖记录 (")}{productionRecords.length})</h2>

              <button className="btn btn-primary btn-small" onClick={() => {

                let defaultMatingDate = getTodayString();

                let defaultMaleBeetle = '';

                if (productionRecords && productionRecords.length > 0) {

                  const latestRecord = productionRecords[0];

                  if (latestRecord.matingDate) defaultMatingDate = latestRecord.matingDate;

                  if (latestRecord.maleBeetle) defaultMaleBeetle = latestRecord.maleBeetle;

                }

                setProductionForm({

                  matingDate: defaultMatingDate,

                  maleBeetle: defaultMaleBeetle,

                  layBoxDate: '',

                  removeDate: '',

                  eggCount: '',

                  expectedHatchCount: '',

                  hatchCount: '',

                  notes: ''

                });

                setSelectedImages([]);

                setCurrentView('add-production');

              }}>

                {tr("➕ 新增生产记录")}

              </button>

            </div>



            {productionRecords.length === 0 ? (

              <div className="card">

                <div className="empty-state">

                  <div className="empty-state-icon">🎀</div>

                  <div className="empty-state-text">{tr("还没有添加生产记录")}</div>

                </div>

              </div>

            ) : (

              <div className="records-container">

                <div className="production-summary" aria-label={tr("生产记录汇总")}>

                  <div className="production-summary-head">

                    <div>

                      <span className="production-summary-eyebrow">{tr("累计生产表现")}</span>

                      <h3 className="production-summary-title">{tr("生产数据汇总")}</h3>

                    </div>

                    <span className="production-summary-progress">
                      {tr("已记录孵化")} {productionSummary.completedHatchRecords}/{productionRecords.length} {tr("次")}
                    </span>

                  </div>

                  <div className="production-summary-grid">

                    <div className="production-summary-item">
                      <span className="production-summary-icon">🎀</span>
                      <span className="production-summary-label">{tr("生产次数")}</span>
                      <strong className="production-summary-value">{productionRecords.length}<small> {tr("次")}</small></strong>
                    </div>

                    <div className="production-summary-item">
                      <span className="production-summary-icon">🥚</span>
                      <span className="production-summary-label">{tr("总产卵数")}</span>
                      <strong className="production-summary-value">{productionSummary.eggCount}<small> {tr("枚")}</small></strong>
                    </div>

                    <div className="production-summary-item">
                      <span className="production-summary-icon">⏳</span>
                      <span className="production-summary-label">{tr("预计孵化")}</span>
                      <strong className="production-summary-value">{productionSummary.expectedHatchCount}<small> {tr("只")}</small></strong>
                    </div>

                    <div className="production-summary-item production-summary-item-highlight">
                      <span className="production-summary-icon">🐛</span>
                      <span className="production-summary-label">{tr("实际孵化")}</span>
                      <strong className="production-summary-value">{productionSummary.hatchCount}<small> {tr("只")}</small></strong>
                    </div>

                    <div className="production-summary-item production-summary-item-rate">
                      <span className="production-summary-icon">📈</span>
                      <span
                        className="production-summary-label"
                        title={tr("实际孵化总数 ÷ 累计产卵总数")}
                      >
                        {tr("累计孵化率")}
                      </span>
                      <strong className="production-summary-value">{hatchRate}</strong>
                      <small className="production-rate-formula">
                        {productionSummary.eggCount > 0
                          ? tr('{hatched} ÷ {eggs} 枚累计产卵', {
                              hatched: productionSummary.hatchCount,
                              eggs: productionSummary.eggCount
                            })
                          : tr("暂无累计产卵数")}
                      </small>
                    </div>

                  </div>

                </div>

                {productionRecords.map(prod => (

                  <div key={prod.id} className="card record-card" style={{ borderLeft: '4px solid #E91E63' }}>

                    <div className="record-card-head" style={{ marginBottom: '12px' }}>

                      <span className="record-card-date">{tr("💕 交配日:")} {prod.matingDate}</span>

                      {prod.maleBeetle && <span className="stage-tag stage-adult">♂️ {prod.maleBeetle}</span>}

                    </div>



                    <div className="metric-grid" style={{ marginBottom: '12px' }}>

                      <div className="metric-item">

                        <span className="metric-label">{tr("下产房")}</span>

                        <span className="metric-value" style={{ fontSize: '14px' }}>{prod.layBoxDate || '-'}</span>

                      </div>

                      <div className="metric-item">

                        <span className="metric-label">{tr("取出母虫")}</span>

                        <span className="metric-value" style={{ fontSize: '14px' }}>{prod.removeDate || '-'}</span>

                      </div>

                      <div className="metric-item">

                        <span className="metric-label">{tr("🥚 产卵总数")}</span>

                        <span className="metric-value">{prod.eggCount !== null ? prod.eggCount : '-'}</span>

                      </div>

                      <div className="metric-item">

                        <span className="metric-label">{tr("⏳ 预计孵化")}</span>

                        <span className="metric-value">{prod.expectedHatchCount !== null ? prod.expectedHatchCount : '-'}</span>

                      </div>

                      <div className="metric-item">

                        <span className="metric-label">{tr("🐛 实际孵化")}</span>

                        <span className="metric-value">{prod.hatchCount !== null ? prod.hatchCount : '-'}</span>

                      </div>

                    </div>



                    {prod.notes && (

                      <p className="record-notes">{prod.notes}</p>

                    )}



                    {(prod.imageUrls ? prod.imageUrls.split(',').filter(u => u) : []).length > 0 && (

                      <div className="img-grid" style={{ marginTop: '12px' }}>

                        {(prod.imageUrls.split(',').filter(u => u)).map((url, idx) => {

                          const fullUrl = url.startsWith('http') ? url : api.getApiBase() + url;

                          return (

                            <div key={idx} className="img-wrap" style={{ cursor: 'pointer' }} onClick={() => setLightboxUrl(fullUrl)}>

                              <img src={fullUrl} alt={`prod-img-${idx}`} />

                            </div>

                          );

                        })}

                      </div>

                    )}



                    {expandedProductionHistory[prod.id] && (

                      <ProductionHistoryPanel

                        history={productionHistoryByRecord[prod.id] || []}

                        loading={Boolean(loadingProductionHistory[prod.id])}

                      />

                    )}



                    <div className="record-card-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>

                      <button

                        className="btn btn-ghost btn-small"

                        type="button"

                        aria-expanded={Boolean(expandedProductionHistory[prod.id])}

                        onClick={() => toggleProductionHistory(prod.id)}

                      >

                        {loadingProductionHistory[prod.id]

                          ? tr("⏳ 加载历史")

                          : expandedProductionHistory[prod.id]

                            ? tr("🔼 收起历史")

                            : tr("🕘 编辑历史")}

                      </button>

                      <button className="btn btn-ghost btn-small btn-primary" onClick={() => {

                        setProductionForm({

                          matingDate: prod.matingDate, maleBeetle: prod.maleBeetle, layBoxDate: prod.layBoxDate, removeDate: prod.removeDate, eggCount: prod.eggCount, expectedHatchCount: prod.expectedHatchCount, hatchCount: prod.hatchCount, notes: prod.notes

                        });



                        const imgRelativeUrls = prod.imageUrls

                          ? prod.imageUrls.split(',').filter(u => u)

                          : [];

                        const existing = imgRelativeUrls.map(url => ({

                          id: `remote-${url}`,

                          type: 'remote',

                          url: url,

                          previewUrl: url.startsWith('http') ? url : api.getApiBase() + url

                        }));

                        setSelectedImages(existing);



                        setEditingProductionId(prod.id);

                        setCurrentView('edit-production');

                      }}>{tr("✏️ 编辑记录")}</button>

                      <button className="btn btn-ghost btn-small btn-danger" onClick={() => handleDeleteProduction(prod.id)}>{tr("🗑️ 删除记录")}</button>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        )}



        <>

            {/* Growth Curve Chart */}

            <GrowthChart records={records} />



            {/* Historical Records Header & List */}

            <div>

          <div className="view-header" style={{ marginTop: '24px', marginBottom: '14px' }}>

            <h2 className="section-title" style={{ margin: 0 }}>{tr("📋 成长与测量记录 (")}{records.length})</h2>

            <div className="detail-actions">

              {activeBeetle.beetleType !== '成虫' && (

                <button className="btn btn-primary btn-small" onClick={handleOpenEmergenceRecord}>

                  {tr("🪲 登记羽化")}

                </button>

              )}

              <button className="btn btn-primary btn-small" onClick={handleOpenAddRecord}>

                {tr("➕ 新增记录")}

              </button>

            </div>

          </div>



          {records.length === 0 ? (

            <div className="card">

              <div className="empty-state">

                <div className="empty-state-icon">📝</div>

                <div className="empty-state-text">{tr("还没有添加成长测量记录")}</div>

                <button className="btn btn-ghost btn-small" style={{ marginTop: '12px' }} onClick={handleOpenAddRecord}>

                  {tr("添加第一条记录")}

                </button>

              </div>

            </div>

          ) : (

            <div className="records-container">

              {records.map(record => {

                const recordImageUrls = splitImageUrls(record.imageUrls);
                const beetleImageUrls = splitImageUrls(activeBeetle?.imageUrls || '');
                const safeRecordImageUrls = isLikelyBeetleImageLeak(recordImageUrls, beetleImageUrls) ? [] : recordImageUrls;
                const imgUrls = safeRecordImageUrls.map(u => u.startsWith('http') ? u : api.getApiBase() + u);



                return (

                  <div key={record.id} className="card record-card">

                    <div className="record-card-head">

                      <span className="record-card-date">📅 {record.recordDate}</span>

                      <span className={`stage-tag ${getStageClass(record.stage)}`}>

                        {tv(record.stage || '未定义阶段')}

                      </span>

                    </div>



                    <div className="metric-grid">

                      <div className="metric-item">

                        <span className="metric-label">{tr("⚖️ 体重")}</span>

                        <span className="metric-value">

                          {record.weight ? `${record.weight}` : '-'}<span className="metric-unit"> g</span>

                        </span>

                      </div>

                      <div className="metric-item">

                        <span className="metric-label">{tr("📏 体长")}</span>

                        <span className="metric-value">

                          {record.length ? `${record.length}` : '-'}<span className="metric-unit"> mm</span>

                        </span>

                      </div>

                      <div className="metric-item">

                        <span className="metric-label">{tr("🌡️ 温度")}</span>

                        <span className="metric-value">

                          {record.temperature ? `${record.temperature}` : '-'}<span className="metric-unit"> ℃</span>

                        </span>

                      </div>

                      <div className="metric-item">

                        <span className="metric-label">{tr("💧 湿度")}</span>

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

                      <button className="btn btn-ghost btn-small btn-primary" onClick={() => handleEditRecordClick(record)}>{tr("✏️ 编辑记录")}</button>

                      <button className="btn btn-ghost btn-small btn-danger" onClick={() => handleDeleteRecord(record.id)}>{tr("🗑️ 删除记录")}</button>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

        </>

      </div>

    );

  };



  // --- RENDER VIEW: Add Record ---

  const renderAddRecord = () => {

    if (!activeBeetle) return renderDetail();

    return (

      <div className="card" style={{ animation: 'fadeIn 0.3s' }}>

        <div className="view-header" style={{ marginBottom: '24px' }}>

          <button className="btn-back" onClick={handleCancelAddRecord}>{tr("🔙 取消返回")}</button>



          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            <span className="view-title" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>

              {tr("记录:")} <strong>{activeBeetle.name}</strong>

            </span>

            {speechSupported && (

              <button type="button" className="btn-voice" onClick={startListening}>

                {tr("🎙️ 语音导入")}

              </button>

            )}

          </div>

        </div>



        <form onSubmit={handleCreateRecord}>

          <div className="form-grid-2x2">

            <DateInputWithClear

              label={tr("记录日期")}

              value={recordForm.recordDate}

              onChange={(e) => handleRecordFormChange('recordDate', e.target.value)}

              required={true}

            />

            <div className="form-group">

              <label className="input-label">{tr("生命阶段")}</label>

              <select

                className="select"

                value={recordForm.stage}

                onChange={(e) => handleRecordFormChange('stage', e.target.value)}

              >

                {STAGES.map(s => <option key={s} value={s}>{tv(s)}</option>)}

              </select>

            </div>

          </div>



          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("体重 (g)")}</label>

              <input

                type="number"

                step="0.01"

                className="input"

                value={recordForm.weight}

                onChange={(e) => handleRecordFormChange('weight', e.target.value)}

                placeholder={tr("⚖️ 输入体重")}

              />

            </div>

            <div className="form-group">

              <label className="input-label">{tr("体长 (mm)")}</label>

              <input

                type="number"

                step="0.1"

                className="input"

                value={recordForm.length}

                onChange={(e) => handleRecordFormChange('length', e.target.value)}

                placeholder={tr("📏 输入体长")}

              />

            </div>

          </div>

          {recordForm.stage === '成虫' && activeBeetle.beetleType !== '成虫' && (

            <div className="lifecycle-sync-note" role="status">

              <strong>{tr("🪲 保存后会同步为成虫")}</strong>

              <span>{tr("仍使用当前个体档案；记录日期将作为羽化日期，体长和体重会补入成虫信息。")}</span>

            </div>

          )}



          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("饲养温度 (℃)")}</label>

              <input

                type="number"

                step="0.1"

                className="input"

                value={recordForm.temperature}

                onChange={(e) => handleRecordFormChange('temperature', e.target.value)}

                placeholder={tr("🌡️ 输入温度")}

              />

            </div>

            <div className="form-group">

              <label className="input-label">{tr("环境湿度 (%)")}</label>

              <input

                type="number"

                step="1"

                className="input"

                value={recordForm.humidity}

                onChange={(e) => handleRecordFormChange('humidity', e.target.value)}

                placeholder={tr("💧 输入湿度")}

              />

            </div>

          </div>



          <div className="form-group">

            <label className="input-label">{tr("测量备注")}</label>

            <textarea

              className="textarea"

              value={recordForm.notes}

              onChange={(e) => handleRecordFormChange('notes', e.target.value)}

              placeholder={tr("换土、蜕皮、观察到的进食/活动状况...")}

            />

          </div>



          {/* Image Upload Grid */}

          <div className="form-group img-upload-section">

            <label className="input-label">{tr("上传照片 (最多 9 张)")}</label>

            <div className="img-grid">

              {selectedImages.map((img, idx) => (

                <div key={idx} className="img-wrap">

                  <img src={img.previewUrl} alt={`preview-${idx}`} />

                  <div className="img-remove" onClick={() => handleRemoveSelectedImage(idx)}>✕</div>

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

              {selectedImages.length < 9 && (

                <PhotoSourcePicker
                  onSelect={(files, source) => handleFilesSelected(files, source, 9)}
                />

              )}

            </div>

          </div>



          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>

            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{tr("✨ 保存记录")}</button>

            <button type="button" className="btn btn-ghost" onClick={handleCancelAddRecord} style={{ flex: 1 }}>{tr("取消")}</button>

          </div>

        </form>

      </div>

    );

  };



  // --- RENDER VIEW: Edit Beetle ---

  const renderEditBeetle = () => (

    <div className="card" style={{ animation: 'fadeIn 0.3s' }}>

      <div className="view-header" style={{ marginBottom: '24px' }}>

        <button className="btn-back" onClick={handleCancelEditBeetle}>{tr("🔙 取消返回")}</button>

        <span className="view-title">{tr("✏️ 编辑甲虫个体")}</span>

      </div>



      <form onSubmit={handleUpdateBeetle}>

        <BeetleEntryForm

          beetle={beetleForm}

          showDates={true}

          maxImages={9}

          showToast={showToast}

          onChange={(updated) => setBeetleForm(updated)}

        />



        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>

          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{tr("💾 保存修改")}</button>

          <button type="button" className="btn btn-ghost" onClick={handleCancelEditBeetle} style={{ flex: 1 }}>{tr("取消")}</button>

        </div>

      </form>

    </div>

  );


  // --- RENDER VIEW: Edit Record ---

  const renderEditRecord = () => {

    if (!activeBeetle) return renderDetail();

    return (

      <div className="card" style={{ animation: 'fadeIn 0.3s' }}>

        <div className="view-header" style={{ marginBottom: '24px' }}>

          <button className="btn-back" onClick={handleCancelEditRecord}>{tr("🔙 取消返回")}</button>



          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            <span className="view-title" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>

              {tr("编辑记录:")} <strong>{activeBeetle.name}</strong>

            </span>

            {speechSupported && (

              <button type="button" className="btn-voice" onClick={startListening}>

                {tr("🎙️ 语音导入")}

              </button>

            )}

          </div>

        </div>



        <form onSubmit={handleUpdateRecord}>

          <div className="form-grid-2x2">

            <DateInputWithClear

              label={tr("记录日期")}

              value={recordForm.recordDate}

              onChange={(e) => handleRecordFormChange('recordDate', e.target.value)}

              required={true}

            />

            <div className="form-group">

              <label className="input-label">{tr("生命阶段")}</label>

              <select

                className="select"

                value={recordForm.stage}

                onChange={(e) => handleRecordFormChange('stage', e.target.value)}

              >

                {STAGES.map(s => <option key={s} value={s}>{tv(s)}</option>)}

              </select>

            </div>

          </div>

          {recordForm.stage === '成虫' && activeBeetle.beetleType !== '成虫' && (

            <div className="lifecycle-sync-note" role="status">

              <strong>{tr("🪲 保存后会同步为成虫")}</strong>

              <span>{tr("仍使用当前个体档案；记录日期将作为羽化日期，体长和体重会补入成虫信息。")}</span>

            </div>

          )}



          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("体重 (g)")}</label>

              <input

                type="number"

                step="0.01"

                className="input"

                value={recordForm.weight}

                onChange={(e) => handleRecordFormChange('weight', e.target.value)}

                placeholder={tr("⚖️ 输入体重")}

              />

            </div>

            <div className="form-group">

              <label className="input-label">{tr("体长 (mm)")}</label>

              <input

                type="number"

                step="0.1"

                className="input"

                value={recordForm.length}

                onChange={(e) => handleRecordFormChange('length', e.target.value)}

                placeholder={tr("📏 输入体长")}

              />

            </div>

          </div>



          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("饲养温度 (℃)")}</label>

              <input

                type="number"

                step="0.1"

                className="input"

                value={recordForm.temperature}

                onChange={(e) => handleRecordFormChange('temperature', e.target.value)}

                placeholder={tr("🌡️ 输入温度")}

              />

            </div>

            <div className="form-group">

              <label className="input-label">{tr("环境湿度 (%)")}</label>

              <input

                type="number"

                step="1"

                className="input"

                value={recordForm.humidity}

                onChange={(e) => handleRecordFormChange('humidity', e.target.value)}

                placeholder={tr("💧 输入湿度")}

              />

            </div>

          </div>



          <div className="form-group">

            <label className="input-label">{tr("测量备注")}</label>

            <textarea

              className="textarea"

              value={recordForm.notes}

              onChange={(e) => handleRecordFormChange('notes', e.target.value)}

              placeholder={tr("换土、蜕皮、观察到的进食/活动状况...")}

            />

          </div>



          {/* Image Upload Grid */}

          <div className="form-group img-upload-section">

            <label className="input-label">{tr("上传照片 (最多 9 张)")}</label>

            <div className="img-grid">

              {selectedImages.map((img, idx) => (

                <div key={idx} className="img-wrap">

                  <img src={img.previewUrl} alt={`preview-${idx}`} />

                  <div className="img-remove" onClick={() => handleRemoveSelectedImage(idx)}>✕</div>

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

              {selectedImages.length < 9 && (

                <PhotoSourcePicker
                  onSelect={(files, source) => handleFilesSelected(files, source, 9)}
                />

              )}

            </div>

          </div>



          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>

            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{tr("💾 保存修改")}</button>

            <button type="button" className="btn btn-ghost" onClick={handleCancelEditRecord} style={{ flex: 1 }}>{tr("取消")}</button>

          </div>

        </form>

      </div>

    );

  };



  // --- RENDER VIEW: Add Production Record ---

  const renderAddProduction = () => {

    if (!activeBeetle) return renderDetail();

    return (

      <div className="card" style={{ animation: 'fadeIn 0.3s' }}>

        <div className="view-header" style={{ marginBottom: '24px' }}>

          <button className="btn-back" onClick={handleCancelAddProduction}>{tr("🔙 取消返回")}</button>

          <span className="view-title">{tr("🎀 新增生产记录")}</span>

        </div>

        <form onSubmit={handleCreateProduction}>

          <div className="form-grid-2x2">

            <DateInputWithClear

              label={tr("交配日期")}

              value={productionForm.matingDate}

              onChange={(e) => handleProductionFormChange('matingDate', e.target.value)}

              required={true}

            />

            <div className="form-group">

              <label className="input-label">{tr("配对公虫")}</label>

              <input type="text" className="input" value={productionForm.maleBeetle} onChange={(e) => handleProductionFormChange('maleBeetle', e.target.value)} placeholder={tr("公虫代号/名字")} />

            </div>

          </div>

          <div className="form-grid-2x2">

            <DateInputWithClear

              label={tr("下产房时间")}

              value={productionForm.layBoxDate}

              onChange={(e) => handleProductionFormChange('layBoxDate', e.target.value)}

            />

            <DateInputWithClear

              label={tr("取出时间")}

              value={productionForm.removeDate}

              onChange={(e) => handleProductionFormChange('removeDate', e.target.value)}

            />

          </div>

          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("产卵总数")}</label>

              <input type="number" className="input" value={productionForm.eggCount} onChange={(e) => handleProductionFormChange('eggCount', e.target.value)} placeholder="0" />

            </div>

            <div className="form-group">

              <label className="input-label">{tr("预计孵化")}</label>

              <input type="number" className="input" value={productionForm.expectedHatchCount} onChange={(e) => handleProductionFormChange('expectedHatchCount', e.target.value)} placeholder="0" />

            </div>

          </div>

          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("实际孵化")}</label>

              <input type="number" className="input" value={productionForm.hatchCount} onChange={(e) => handleProductionFormChange('hatchCount', e.target.value)} placeholder="0" />

            </div>

          </div>

          <div className="form-group">

            <label className="input-label">{tr("备注说明")}</label>

            <textarea className="textarea" value={productionForm.notes} onChange={(e) => handleProductionFormChange('notes', e.target.value)} placeholder={tr("温湿度、产卵木配置等...")} />

          </div>



          <div className="form-group" style={{ marginTop: '20px' }}>

            <label className="input-label">{tr("生产图片 (支持多张)")}</label>

            <div className="img-grid">

              {selectedImages.map((img, idx) => (

                <div
                  key={img.id || img.previewUrl}
                  className="img-wrap img-wrap-editable"
                  draggable
                  onDragStart={() => setDraggedImageIndex(idx)}
                  onDragEnd={() => setDraggedImageIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleImageDrop(idx)}
                >

                  <img src={img.previewUrl} alt={`preview-${idx}`} onClick={() => setLightboxUrl(img.previewUrl)} />

                  <button type="button" className="img-remove" onClick={() => handleRemoveSelectedImage(idx)}>✕</button>
                  <button type="button" className={`img-annotate${img.captured ? ' img-annotate-with-album' : ''}`} onClick={() => setAnnotationImageIndex(idx)}>{tr("🖍️ 批注")}</button>
                  {img.captured && img.file && (
                    <button
                      type="button"
                      className="img-save-album"
                      onClick={() => void saveCapturedPhotoWithFeedback(img.file, showToast)}
                    >
                      {tr("📥 存相册")}
                    </button>
                  )}
                  <span className="img-drag-handle">⠿</span>

                </div>

              ))}

              {selectedImages.length < 5 && (

                <PhotoSourcePicker
                  onSelect={(files, source) => handleFilesSelected(files, source, 5)}
                />

              )}

            </div>

          </div>



          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>

            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{tr("💾 保存生产记录")}</button>

            <button type="button" className="btn btn-ghost" onClick={handleCancelAddProduction} style={{ flex: 1 }}>{tr("取消")}</button>

          </div>

        </form>

      </div>

    );

  };



  // --- RENDER VIEW: Edit Production Record ---

  const renderEditProduction = () => {

    if (!activeBeetle) return renderDetail();

    return (

      <div className="card" style={{ animation: 'fadeIn 0.3s' }}>

        <div className="view-header" style={{ marginBottom: '24px' }}>

          <button className="btn-back" onClick={handleCancelEditProduction}>{tr("🔙 取消返回")}</button>

          <span className="view-title">{tr("✏️ 编辑生产记录")}</span>

        </div>

        <form onSubmit={handleUpdateProduction}>

          <div className="form-grid-2x2">

            <DateInputWithClear

              label={tr("交配日期")}

              value={productionForm.matingDate}

              onChange={(e) => handleProductionFormChange('matingDate', e.target.value)}

              required={true}

            />

            <div className="form-group">

              <label className="input-label">{tr("配对公虫")}</label>

              <input type="text" className="input" value={productionForm.maleBeetle} onChange={(e) => handleProductionFormChange('maleBeetle', e.target.value)} placeholder={tr("公虫代号/名字")} />

            </div>

          </div>

          <div className="form-grid-2x2">

            <DateInputWithClear

              label={tr("下产房时间")}

              value={productionForm.layBoxDate}

              onChange={(e) => handleProductionFormChange('layBoxDate', e.target.value)}

            />

            <DateInputWithClear

              label={tr("取出时间")}

              value={productionForm.removeDate}

              onChange={(e) => handleProductionFormChange('removeDate', e.target.value)}

            />

          </div>

          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("产卵总数")}</label>

              <input type="number" className="input" value={productionForm.eggCount} onChange={(e) => handleProductionFormChange('eggCount', e.target.value)} placeholder="0" />

            </div>

            <div className="form-group">

              <label className="input-label">{tr("预计孵化")}</label>

              <input type="number" className="input" value={productionForm.expectedHatchCount} onChange={(e) => handleProductionFormChange('expectedHatchCount', e.target.value)} placeholder="0" />

            </div>

          </div>

          <div className="form-grid-2x2">

            <div className="form-group">

              <label className="input-label">{tr("实际孵化")}</label>

              <input type="number" className="input" value={productionForm.hatchCount} onChange={(e) => handleProductionFormChange('hatchCount', e.target.value)} placeholder="0" />

            </div>

          </div>

          <div className="form-group">

            <label className="input-label">{tr("备注说明")}</label>

            <textarea className="textarea" value={productionForm.notes} onChange={(e) => handleProductionFormChange('notes', e.target.value)} placeholder={tr("温湿度、产卵木配置等...")} />

          </div>



          <div className="form-group" style={{ marginTop: '20px' }}>

            <label className="input-label">{tr("生产图片 (支持多张)")}</label>

            <div className="img-grid">

              {selectedImages.map((img, idx) => (

                <div
                  key={img.id || img.previewUrl}
                  className="img-wrap img-wrap-editable"
                  draggable
                  onDragStart={() => setDraggedImageIndex(idx)}
                  onDragEnd={() => setDraggedImageIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleImageDrop(idx)}
                >

                  <img src={img.previewUrl} alt={`preview-${idx}`} onClick={() => setLightboxUrl(img.previewUrl)} />

                  <button type="button" className="img-remove" onClick={() => handleRemoveSelectedImage(idx)}>✕</button>
                  <button type="button" className={`img-annotate${img.captured ? ' img-annotate-with-album' : ''}`} onClick={() => setAnnotationImageIndex(idx)}>{tr("🖍️ 批注")}</button>
                  {img.captured && img.file && (
                    <button
                      type="button"
                      className="img-save-album"
                      onClick={() => void saveCapturedPhotoWithFeedback(img.file, showToast)}
                    >
                      {tr("📥 存相册")}
                    </button>
                  )}
                  <span className="img-drag-handle">⠿</span>

                </div>

              ))}

              {selectedImages.length < 5 && (

                <PhotoSourcePicker
                  onSelect={(files, source) => handleFilesSelected(files, source, 5)}
                />

              )}

            </div>

          </div>



          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>

            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{tr("💾 保存修改")}</button>

            <button type="button" className="btn btn-ghost" onClick={handleCancelEditProduction} style={{ flex: 1 }}>{tr("取消")}</button>

          </div>

        </form>

      </div>

    );

  };



  return (

    <>

      {toast && (

        <div className={`toast-message toast-${toast.type}`}>

          <span className="toast-icon">{toast.type === 'success' ? '✅' : toast.type === 'info' ? '⏳' : '❌'}</span>

          <span className="toast-text">{tr(toast.message)}</span>

        </div>

      )}



      {!isAuthorized ? (

        <div className="login-overlay" style={{ animation: 'fadeIn 0.3s', display: 'flex', flexDirection: 'column' }}>
          <div className="login-language-switcher">
            <LanguageSwitcher />
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px' }}>

            <img src={beetleLogo} alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginBottom: '12px' }} />

            <h2 className="brand-title" style={{ fontSize: '20px' }}>{tr("甲虫成长记录 - 私人版")}</h2>

          </div>



          <div style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>

            <LoginRegister onLoginSuccess={handleLoginSuccess} />

          </div>



          <div className="card" style={{ maxWidth: '400px', width: '90%', margin: '0 auto 40px auto' }}>

            {showApiConfig && (

              <div style={{ marginBottom: '16px' }}>

                <form onSubmit={handleUpdateApiBase} style={{ display: 'flex', gap: '8px' }}>

                  <input

                    type="text"

                    className="input"

                    value={apiBase}

                    onChange={(e) => setApiBaseState(e.target.value)}

                    placeholder="API Base"

                    style={{ marginBottom: 0, fontSize: '12px' }}

                  />

                  <button type="submit" className="btn btn-primary" style={{ fontSize: '12px' }}>{tr("应用")}</button>

                </form>

              </div>

            )}

            <div style={{ textAlign: 'center' }}>

              <button type="button" className="btn-link" onClick={() => setShowApiConfig(!showApiConfig)} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>

                {showApiConfig ? tr("隐藏端点配置") : tr("修改端点配置")}

              </button>

            </div>

          </div>

        </div>

      ) : (

        <>

          {/* App Header */}

          <header className="app-header">

            <div className="brand" onClick={goHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>

              <img src={beetleLogo} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', marginRight: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />

              <h1 className="brand-title">{tr("甲虫成长记录")}</h1>

            </div>

            <div className="app-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <LanguageSwitcher compact />

              <button

                type="button"

                className="btn btn-ghost"

                onClick={() => setShowSearchModal(true)}

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

                {tr("🔍 搜索")}

              </button>

              <button

                type="button"

                className={`btn btn-ghost app-header-action ${currentView === 'breeding' ? 'is-active' : ''}`}

                onClick={() => setCurrentView('breeding')}

              >

                {tr("🎀 繁殖")}

              </button>

              <button

                type="button"

                className="btn btn-ghost"

                onClick={() => setCurrentView('reminders')}

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

                {tr("🔔 提醒")}

              </button>

              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>👤 {currentUsername}</span>

              <div className="status-indicator" style={{ cursor: 'pointer' }} onClick={() => setShowApiConfig(!showApiConfig)}>

                <span className={`status-dot ${backendStatus}`}></span>

                <span>{tr(backendStatus === 'connected' ? '已连接' : '连接失败')}</span>

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

                {tr("🚪 退出")}

              </button>

            </div>

          </header>



      {/* Dynamic API Configuration Field */}

      {showApiConfig && (

        <div className="card" style={{ marginBottom: '20px', animation: 'fadeIn 0.2s' }}>

          <form onSubmit={handleUpdateApiBase} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

            <div style={{ flex: 1 }}>

              <label className="input-label">{tr("后端 API 地址")}</label>

              <input

                type="text"

                className="input"

                value={apiBase}

                onChange={(e) => setApiBaseState(e.target.value)}

                placeholder={tr("例如 http://192.168.1.100:8088")}

                style={{ marginBottom: 0 }}

              />

            </div>

            <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>

              <button type="submit" className="btn btn-primary">{tr("应用")}</button>

              <button type="button" className="btn btn-ghost" onClick={() => setShowApiConfig(false)}>{tr("取消")}</button>

            </div>

          </form>

        </div>

      )}



      {/* Global Search Modal */}

      {showSearchModal && (

        <div className="login-overlay" style={{ animation: 'fadeIn 0.2s', zIndex: 1000 }}>

          <div className="card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>

              <h3 style={{ margin: 0 }}>{tr("🔍 全站搜索")}</h3>

              <button className="btn-ghost" onClick={() => setShowSearchModal(false)} style={{ padding: '4px 8px' }}>✕</button>

            </div>



            <form onSubmit={performSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>

              <div className="form-group" style={{ marginBottom: 0 }}>

                <input

                  type="text"

                  className="input"

                  placeholder={tr("搜索甲虫名字、品种、备注...")}

                  value={searchParams.keyword}

                  onChange={e => setSearchParams({...searchParams, keyword: e.target.value})}

                  autoFocus

                />

              </div>

              <div style={{ display: 'flex', gap: '8px' }}>

                <DateInputWithClear

                  label={<span style={{ fontSize: '11px' }}>{tr("开始日期")}</span>}

                  value={searchParams.startDate}

                  onChange={e => setSearchParams({...searchParams, startDate: e.target.value})}

                  style={{ flex: 1 }}

                />

                <DateInputWithClear

                  label={<span style={{ fontSize: '11px' }}>{tr("结束日期")}</span>}

                  value={searchParams.endDate}

                  onChange={e => setSearchParams({...searchParams, endDate: e.target.value})}

                  style={{ flex: 1 }}

                />

              </div>

              <button type="submit" className="btn btn-primary" disabled={isSearching}>

                {isSearching ? tr("搜索中...") : tr("开始搜索")}

              </button>

            </form>



            <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>

              {searchResults.length === 0 && !isSearching && (

                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>

                  {tr("没有找到匹配的记录")}

                </div>

              )}

              {searchResults.map(result => (

                <div key={result.id + result.type} className="beetle-item" onClick={() => handleSearchResultClick(result)} style={{ cursor: 'pointer', marginBottom: '8px' }}>

                  <div style={{ flex: 1 }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>

                      <span className="detail-tag" style={{ margin: 0, padding: '2px 6px', fontSize: '11px' }}>

                        {result.type === 'BEETLE' ? tr("🪲 甲虫") : result.type === 'GROWTH' ? tr("📈 生长") : result.type === 'PRODUCTION' ? tr("❤️ 繁殖") : tr("💰 财务")}

                      </span>

                      <strong style={{ fontSize: '14px' }}>{result.title}</strong>

                    </div>

                    {result.subtitle && (

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>

                        {result.subtitle.length > 50 ? result.subtitle.substring(0, 50) + '...' : result.subtitle}

                      </div>

                    )}

                    <div style={{ fontSize: '11px', color: 'var(--primary)' }}>

                      📅 {result.date || tr("未知时间")}

                    </div>

                  </div>

                  <div className="beetle-item-arrow">›</div>

                </div>

              ))}

            </div>

          </div>

        </div>

      )}



      {/* View Switcher Routing */}

      {currentView === 'list' && renderList()}

      {currentView === 'add-beetle' && renderAddBeetle()}

      {currentView === 'detail' && renderDetail()}

      {currentView === 'add-record' && renderAddRecord()}

      {currentView === 'edit-beetle' && renderEditBeetle()}

      {currentView === 'edit-record' && renderEditRecord()}

      {currentView === 'add-production' && renderAddProduction()}

      {currentView === 'edit-production' && renderEditProduction()}

      {currentView === 'costs' && <CostManagement

        showToast={showToast}

        setConfirmModal={setConfirmModal}

        editingCostIdGlobal={editingCostIdGlobal}

        clearEditingCostIdGlobal={() => setEditingCostIdGlobal(null)}

        onGoHome={goHome}

        initialBatchName={currentBatch}

      />}

      {currentView === 'reminders' && <ReminderManagement

        showToast={showToast}

        setConfirmModal={setConfirmModal}

        onGoHome={goHome}

      />}

      {currentView === 'breeding' && <BreedingOverview

        showToast={showToast}

        onGoHome={goHome}

        onSelectBeetle={(beetle) => {

          openBeetleDetail(beetle.id, 'breeding');

        }}

      />}

      {currentView === 'batches' && <BatchManagement

        showToast={showToast}

        setConfirmModal={setConfirmModal}

        currentBatch={currentBatch}

        setCurrentBatch={setCurrentBatch}

        onNavigateToCosts={() => setCurrentView('costs')}

        onEditCost={(costId) => {

          setEditingCostIdGlobal(costId);

          setCurrentView('costs');

        }}

        onSelectBeetle={(b) => {

          openBeetleDetail(b.id, currentBatch ? 'batch' : 'home');

        }}

        onAddBeetle={(batchName) => {

          setSelectedImages([]);

          releaseLocalImagePreviews(beetleForm.images);
          setBeetleForm(createEmptyBeetleForm({ batchName: batchName || '' }));

          setCurrentView('add-beetle');

        }}

      />}



      {/* Voice Assistant Modal Overlay */}

      {showVoiceModal && (

        <div className="voice-overlay" onClick={stopListening}>

          <div className="voice-card" onClick={(e) => e.stopPropagation()}>

            <div className="voice-status-text">

              {isListening ? tr("🎙️ 正在倾听，请说话...") : tr("⏸️ 录音已结束")}

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

              {transcribedText || tr("说话内容将实时显示在这里...")}

            </div>



            <div className="voice-tips">

              <strong>{tr("语音说词格式示例：")}</strong><br />

              {tr("“体重 45.2 克，体长 80 毫米，三龄幼虫，温度 24 度，湿度 65。”")}

            </div>



            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>

              <button

                type="button"

                className="btn btn-primary"

                onClick={handleApplyVoiceResult}

                style={{ flex: 1 }}

                disabled={!transcribedText.trim()}

              >

                {tr("识别导入")}

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

                {tr("取消")}

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

              {tr(confirmModal.title)}

            </h3>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>

              {tr(confirmModal.message)}

            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>

              <button

                type="button"

                className="btn btn-danger"

                onClick={confirmModal.onConfirm}

                style={{ flex: 1 }}

              >

                {tr("确定")}

              </button>

              <button

                type="button"

                className="btn btn-ghost"

                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}

                style={{ flex: 1 }}

              >

                {tr("取消")}

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

      {annotationImageIndex !== null && selectedImages[annotationImageIndex] && (
        <ImageAnnotationModal
          imageUrl={selectedImages[annotationImageIndex].previewUrl}
          onClose={() => setAnnotationImageIndex(null)}
          onSave={handleSaveAnnotation}
        />
      )}



      {/* Upload Progress Overlay */}

      <UploadProgressOverlay isUploading={isUploading} progress={uploadProgress} />



      {/* Global Loading Spinner */}

      {globalLoadingCount > 0 && (

        <div style={{

          position: 'fixed',

          top: 0, left: 0, right: 0, bottom: 0,

          background: 'rgba(0,0,0,0.5)',

          display: 'flex',

          flexDirection: 'column',

          alignItems: 'center',

          justifyContent: 'center',

          zIndex: 9999,

          backdropFilter: 'blur(2px)'

        }}>

          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />

          <div style={{ marginTop: '16px', color: '#fff', fontSize: '14px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{tr("加载中...")}</div>

        </div>

      )}

        </>

      )}

    </>

  );

}
