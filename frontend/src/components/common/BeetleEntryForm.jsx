import { useState } from 'react';
import { COMMON_SPECIES, DEFAULT_SUBSPECIES_MAP, DEFAULT_BLOODLINE_MAP } from '../../utils/dict';
import { saveCapturedPhotoWithFeedback } from '../../utils/photoAlbum';

import DateInputWithClear from './DateInputWithClear';
import PhotoSourcePicker from './PhotoSourcePicker';
import { translate as tr, translateValue as tv } from '../../i18n';

export default function BeetleEntryForm({ beetle, onChange, showDates = false, maxImages = 3, showToast }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const stage = beetle.beetleType || beetle.stage || '幼虫';
  const adultSize = beetle.adultLength ?? beetle.size ?? '';
  const gender = beetle.gender === '公' ? '公虫' : beetle.gender === '母' ? '母虫' : (beetle.gender || '未辨识');

  const handleChange = (field, value) => {
    onChange({ ...beetle, [field]: value });
  };

  const handleStageChange = (value) => {
    onChange({
      ...beetle,
      stage: value,
      beetleType: value
    });
  };

  const handleAdultLengthChange = (value) => {
    onChange({
      ...beetle,
      size: value,
      adultLength: value
    });
  };

  const handleFilesSelected = (files, source = 'album') => {
    const maxFiles = maxImages - (beetle.images || []).length;
    const allowedFiles = Array.from(files || []).slice(0, maxFiles);
    const newImages = allowedFiles.map(file => ({
      file,
      captured: source === 'camera',
      previewUrl: URL.createObjectURL(file)
    }));
    handleChange('images', [...(beetle.images || []), ...newImages]);
    if (source === 'camera') {
      newImages.forEach(image => {
        void saveCapturedPhotoWithFeedback(image.file, showToast);
      });
    }
  };

  const getSubspeciesOptions = (species) => {
    const defaultOpts = DEFAULT_SUBSPECIES_MAP[species] || [];
    let customOpts = [];
    try {
      const saved = localStorage.getItem(`custom_subspecies_${species}`);
      if (saved) {
        customOpts = JSON.parse(saved);
      }
    } catch {
      // Ignore malformed saved custom options.
    }
    return Array.from(new Set([...defaultOpts, ...customOpts]));
  };

  const getBloodlineOptions = (species) => {
    const defaultOpts = DEFAULT_BLOODLINE_MAP[species] || [];
    let customOpts = [];
    try {
      const saved = localStorage.getItem(`custom_bloodlines_${species}`);
      if (saved) {
        customOpts = JSON.parse(saved);
      }
    } catch {
      // Ignore malformed saved custom options.
    }
    return Array.from(new Set([...defaultOpts, ...customOpts]));
  };

  const saveCustomSubspecies = (species, val) => {
    if (!val || !val.trim()) return;
    const trimmed = val.trim();
    const defaultOpts = DEFAULT_SUBSPECIES_MAP[species] || [];
    if (defaultOpts.includes(trimmed)) return;
    try {
      const key = `custom_subspecies_${species}`;
      const saved = localStorage.getItem(key);
      let opts = saved ? JSON.parse(saved) : [];
      if (!opts.includes(trimmed)) {
        opts.push(trimmed);
        localStorage.setItem(key, JSON.stringify(opts));
      }
    } catch {
      // Ignore malformed saved custom options.
    }
  };

  const saveCustomBloodline = (species, val) => {
    if (!val || !val.trim()) return;
    const trimmed = val.trim();
    const defaultOpts = DEFAULT_BLOODLINE_MAP[species] || [];
    if (defaultOpts.includes(trimmed)) return;
    try {
      const key = `custom_bloodlines_${species}`;
      const saved = localStorage.getItem(key);
      let opts = saved ? JSON.parse(saved) : [];
      if (!opts.includes(trimmed)) {
        opts.push(trimmed);
        localStorage.setItem(key, JSON.stringify(opts));
      }
    } catch {
      // Ignore malformed saved custom options.
    }
  };

  const saveCustomSpecies = (val) => {
    if (!val || !val.trim()) return;
    const trimmed = val.trim();
    if (COMMON_SPECIES.includes(trimmed)) return;
    try {
      const saved = localStorage.getItem('custom_species');
      let opts = saved ? JSON.parse(saved) : [];
      if (!opts.includes(trimmed)) {
        opts.push(trimmed);
        localStorage.setItem('custom_species', JSON.stringify(opts));
      }
    } catch {
      // Ignore malformed saved custom options.
    }
  };

  const getCustomSpeciesOptions = () => {
    try {
      const saved = localStorage.getItem('custom_species');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore malformed saved custom options.
    }
    return [];
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="form-group">
        <label className="input-label">{tr("甲虫代号/名字")}</label>
        <input
          type="text"
          className="input"
          style={{ padding: '8px', fontSize: '13px' }}
          placeholder={tr("如: 血统A-1")}
          value={beetle.name || ''}
          onChange={e => handleChange('name', e.target.value)}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            {tr("品种")}
            <label style={{ marginLeft: '8px', cursor: 'pointer', color: 'var(--accent-color)' }}>
              <input type="checkbox" checked={beetle.isCustomSpecies} onChange={e => handleChange('isCustomSpecies', e.target.checked)} style={{ marginRight: '4px' }} />
              {tr("手动输入")}
            </label>
          </div>
          {beetle.isCustomSpecies ? (
            <input
              type="text"
              className="input"
              style={{ padding: '8px', fontSize: '13px' }}
              placeholder={tr("输入品种")}
              value={beetle.species || ''}
              onChange={e => handleChange('species', e.target.value)}
              onBlur={(e) => saveCustomSpecies(e.target.value)}
            />
          ) : (
            <select className="select" style={{ padding: '8px', fontSize: '13px' }} value={beetle.species || ''} onChange={e => handleChange('species', e.target.value)}>
              <option value="">{tr("请选择品种")}</option>
              {COMMON_SPECIES.map(s => <option key={s} value={s}>{tv(s)}</option>)}
              {getCustomSpeciesOptions().map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            {tr("亚种")}
            <label style={{ marginLeft: '8px', cursor: 'pointer', color: 'var(--accent-color)' }}>
              <input type="checkbox" checked={beetle.isCustomSubspecies} onChange={e => handleChange('isCustomSubspecies', e.target.checked)} style={{ marginRight: '4px' }} />
              {tr("手动输入")}
            </label>
          </div>
          {beetle.isCustomSubspecies ? (
            <input
              type="text"
              className="input"
              style={{ padding: '8px', fontSize: '13px' }}
              placeholder={tr("输入亚种")}
              value={beetle.subspecies || ''}
              onChange={e => handleChange('subspecies', e.target.value)}
              onBlur={(e) => saveCustomSubspecies(beetle.isCustomSpecies ? beetle.species : beetle.species, e.target.value)}
            />
          ) : (
            <select className="select" style={{ padding: '8px', fontSize: '13px' }} value={beetle.subspecies || ''} onChange={e => handleChange('subspecies', e.target.value)}>
              <option value="">{tr("请选择...")}</option>
              {getSubspeciesOptions(beetle.isCustomSpecies ? beetle.species : beetle.species).map(opt => (
                <option key={opt} value={opt}>{tv(opt)}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{tr("阶段")}</div>
          <select className="select" style={{ padding: '8px', fontSize: '13px' }} value={stage} onChange={e => handleStageChange(e.target.value)}>
            <option value="成虫">{tr("成虫")}</option>
            <option value="幼虫">{tr("幼虫")}</option>
            <option value="蛹">{tr("蛹")}</option>
          </select>
        </div>
        {stage === '幼虫' ? (
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{tr("龄期")}</div>
            <select className="select" style={{ padding: '8px', fontSize: '13px' }} value={beetle.instar || 'L1'} onChange={e => handleChange('instar', e.target.value)}>
              <option value="L1">{tr("L1 (一龄)")}</option>
              <option value="L2">{tr("L2 (二龄)")}</option>
              <option value="L3">{tr("L3 (三龄)")}</option>
            </select>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{tr("尺寸 (mm)")}</div>
            <input type="number" step="0.1" className="input" style={{ padding: '8px', fontSize: '13px' }} placeholder={tr("如: 75.5")} value={adultSize || ''} onChange={e => handleAdultLengthChange(e.target.value)} />
          </div>
        )}
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{tr("性别")}</div>
          <select className="select" style={{ padding: '8px', fontSize: '13px' }} value={gender} onChange={e => handleChange('gender', e.target.value)}>
            <option value="未辨识">{tr("未辨识")}</option>
            <option value="公虫">{tr("公虫 ♂")}</option>
            <option value="母虫">{tr("母虫 ♀")}</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            {tr("血统")}
            <label style={{ marginLeft: '8px', cursor: 'pointer', color: 'var(--accent-color)' }}>
              <input type="checkbox" checked={beetle.isCustomBloodline} onChange={e => handleChange('isCustomBloodline', e.target.checked)} style={{ marginRight: '4px' }} />
              {tr("手动输入")}
            </label>
          </div>
          {beetle.isCustomBloodline ? (
            <input
              type="text"
              className="input"
              style={{ padding: '8px', fontSize: '13px' }}
              placeholder={tr("输入血统")}
              value={beetle.bloodline || ''}
              onChange={e => handleChange('bloodline', e.target.value)}
              onBlur={(e) => saveCustomBloodline(beetle.isCustomSpecies ? beetle.species : beetle.species, e.target.value)}
            />
          ) : (
            <select className="select" style={{ padding: '8px', fontSize: '13px' }} value={beetle.bloodline || ''} onChange={e => handleChange('bloodline', e.target.value)}>
              <option value="">{tr("请选择...")}</option>
              {getBloodlineOptions(beetle.isCustomSpecies ? beetle.species : beetle.species).map(opt => (
                <option key={opt} value={opt}>{tv(opt)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {showDates && (
        <>
          {stage === '幼虫' && (
            <div style={{ marginTop: '8px' }}>
              <DateInputWithClear
                label={tr("孵化 / 购入日期")}
                value={beetle.hatchDate || ''}
                onChange={(e) => handleChange('hatchDate', e.target.value)}
              />
            </div>
          )}
          {stage === '成虫' && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <DateInputWithClear
                label={tr("羽化日期")}
                value={beetle.emergenceDate || ''}
                onChange={(e) => handleChange('emergenceDate', e.target.value)}
              />
              <DateInputWithClear
                label={tr("出蛰伏日期")}
                value={beetle.dormancyEndDate || ''}
                onChange={(e) => handleChange('dormancyEndDate', e.target.value)}
              />
              <div className="form-group">
                <label className="input-label">{tr("成虫体重 (g)")}</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{ fontSize: '13px', padding: '8px', background: 'rgba(0,0,0,0.2)' }}
                  value={beetle.adultWeight || ''}
                  onChange={(e) => handleChange('adultWeight', e.target.value)}
                  placeholder={tr("如: 12.5")}
                />
              </div>
            </div>
          )}
          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="input-label">{tr("备注说明")}</label>
            <textarea
              className="textarea"
              style={{ fontSize: '13px', padding: '8px', background: 'rgba(0,0,0,0.2)' }}
              value={beetle.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder={tr("来源、饲养盒配置、菌瓶批次等...")}
            />
          </div>
        </>
      )}

      {/* 照片上传区块 */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{tr("📸 专属照片 (选填)")}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(beetle.images || []).map((img, idx) => (
            <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={img.previewUrl || img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setLightboxUrl(img.previewUrl || img)} />
              <button
                type="button"
                onClick={() => {
                  const newImgs = [...(beetle.images || [])];
                  if (newImgs[idx]?.file && newImgs[idx]?.previewUrl) {
                    URL.revokeObjectURL(newImgs[idx].previewUrl);
                  }
                  newImgs.splice(idx, 1);
                  handleChange('images', newImgs);
                }}
                style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ×
              </button>
              {img.captured && img.file && (
                <button
                  type="button"
                  className="img-save-album img-save-album-compact"
                  aria-label={tr("保存到相册")}
                  title={tr("保存到相册")}
                  onClick={() => void saveCapturedPhotoWithFeedback(img.file, showToast)}
                >
                  📥
                </button>
              )}
            </div>
          ))}
          {(beetle.images || []).length < maxImages && (
            <PhotoSourcePicker
              onSelect={handleFilesSelected}
              buttonStyle={{ width: '60px', height: '60px', flex: '0 0 60px' }}
            />
          )}
        </div>
      </div>
      {lightboxUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setLightboxUrl(null)}>
          <span style={{
            position: 'absolute', top: '20px', right: '20px', color: 'white',
            fontSize: '30px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)',
            width: '40px', height: '40px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }} onClick={() => setLightboxUrl(null)}>✕</span>
          <img src={lightboxUrl} alt="Preview Full" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
