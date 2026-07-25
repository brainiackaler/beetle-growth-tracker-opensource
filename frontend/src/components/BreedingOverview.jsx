/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../utils/api';
import { translate as tr, translateValue as tv } from '../i18n';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'follow-up', label: '仅看待跟进' },
  { value: 'active', label: '产房中' },
  { value: 'mating-pending', label: '已交配待投产' },
  { value: 'egg-pending', label: '待录卵数' },
  { value: 'hatch-pending', label: '待录孵化' },
  { value: 'completed', label: '已完成' },
  { value: 'unrecorded', label: '暂无记录' }
];

const FOLLOW_UP_STATUSES = new Set(['active', 'mating-pending', 'egg-pending', 'hatch-pending']);

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const toCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (!match) return text.slice(0, 10);
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
};

const getRecordDate = (record = {}) => (
  [record.removeDate, record.layBoxDate, record.matingDate, record.createdAt]
    .map(normalizeDate)
    .filter(Boolean)
    .sort()
    .pop() || ''
);

const sortRecords = (records = []) => [...records].sort((left, right) => {
  const dateCompare = getRecordDate(right).localeCompare(getRecordDate(left));
  if (dateCompare !== 0) return dateCompare;
  return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
});

const getFemaleStatus = (beetle, records) => {
  if (records.some(record => hasValue(record.layBoxDate) && !hasValue(record.removeDate))) {
    return { key: 'active', label: '产房中', hint: '已投产，尚未取出母虫' };
  }
  if (records.some(record => hasValue(record.removeDate) && !hasValue(record.eggCount))) {
    return { key: 'egg-pending', label: '待录卵数', hint: '已撤产，等待补充产卵数量' };
  }
  if (records.some(record => hasValue(record.eggCount) && !hasValue(record.hatchCount))) {
    return { key: 'hatch-pending', label: '待录孵化', hint: '已记录卵数，等待孵化结果' };
  }
  if (records.some(record => hasValue(record.matingDate) && !hasValue(record.layBoxDate))) {
    return { key: 'mating-pending', label: '待投产', hint: '已交配，尚未记录投产日期' };
  }
  if (records.length > 0) {
    return { key: 'completed', label: '已完成', hint: '当前记录已补全孵化结果' };
  }
  return { key: 'unrecorded', label: '暂无记录', hint: '还没有建立繁殖记录' };
};

const getStatusRecord = (records, statusKey) => {
  if (statusKey === 'active') {
    return records.find(record => hasValue(record.layBoxDate) && !hasValue(record.removeDate));
  }
  if (statusKey === 'egg-pending') {
    return records.find(record => hasValue(record.removeDate) && !hasValue(record.eggCount));
  }
  if (statusKey === 'hatch-pending') {
    return records.find(record => hasValue(record.eggCount) && !hasValue(record.hatchCount));
  }
  if (statusKey === 'mating-pending') {
    return records.find(record => hasValue(record.matingDate) && !hasValue(record.layBoxDate));
  }
  return records[0];
};

const formatRate = (hatchCount, eggCount) => (
  eggCount > 0 ? `${((hatchCount / eggCount) * 100).toFixed(1)}%` : '—'
);

const buildFemaleRows = (beetles, productions) => {
  const recordsByBeetle = productions.reduce((map, record) => {
    if (!map.has(record.beetleId)) map.set(record.beetleId, []);
    map.get(record.beetleId).push(record);
    return map;
  }, new Map());

  return beetles
    .filter(beetle => (
      beetle.beetleType === '成虫'
      && (beetle.gender === '母虫' || beetle.gender === '母')
    ))
    .map(beetle => {
      const records = sortRecords(recordsByBeetle.get(beetle.id) || []);
      const eggCount = records.reduce((sum, record) => sum + toCount(record.eggCount), 0);
      const expectedHatchCount = records.reduce((sum, record) => sum + toCount(record.expectedHatchCount), 0);
      const hatchCount = records.reduce((sum, record) => sum + toCount(record.hatchCount), 0);
      const status = getFemaleStatus(beetle, records);
      const latestRecord = getStatusRecord(records, status.key) || null;
      return {
        beetle,
        records,
        latestRecord,
        latestDate: latestRecord ? getRecordDate(latestRecord) : normalizeDate(beetle.emergenceDate || beetle.createdAt),
        eggCount,
        expectedHatchCount,
        hatchCount,
        hatchRate: formatRate(hatchCount, eggCount),
        status
      };
    });
};

export default function BreedingOverview({ showToast, onGoHome, onSelectBeetle }) {
  const [beetles, setBeetles] = useState([]);
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [beetleData, productionData] = await Promise.all([
        api.request('/api/beetles'),
        api.request('/api/productions')
      ]);
      setBeetles(beetleData.items || []);
      setProductions(productionData.items || []);
    } catch (err) {
      const message = err?.message || '未知错误';
      setError(message);
      showToast(`加载繁殖总览失败：${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const femaleRows = useMemo(() => buildFemaleRows(beetles, productions), [beetles, productions]);

  const batchOptions = useMemo(() => Array.from(new Set(
    femaleRows.map(row => row.beetle.batchName || '无批次')
  )).sort((left, right) => left.localeCompare(right, 'zh-CN')), [femaleRows]);

  const summary = useMemo(() => {
    const eggCount = femaleRows.reduce((sum, row) => sum + row.eggCount, 0);
    const expectedHatchCount = femaleRows.reduce((sum, row) => sum + row.expectedHatchCount, 0);
    const hatchCount = femaleRows.reduce((sum, row) => sum + row.hatchCount, 0);
    return {
      femaleCount: femaleRows.length,
      recordedFemales: femaleRows.filter(row => row.records.length > 0).length,
      productionCount: femaleRows.reduce((sum, row) => sum + row.records.length, 0),
      followUpCount: femaleRows.filter(row => FOLLOW_UP_STATUSES.has(row.status.key)).length,
      eggCount,
      expectedHatchCount,
      hatchCount,
      hatchRate: formatRate(hatchCount, eggCount)
    };
  }, [femaleRows]);

  const visibleRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN');
    const filtered = femaleRows.filter(row => {
      const batchName = row.beetle.batchName || '无批次';
      const searchableText = [
        row.beetle.name,
        row.beetle.species,
        row.beetle.subspecies,
        row.beetle.bloodline,
        batchName,
        row.latestRecord?.maleBeetle
      ].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN');
      const matchesKeyword = !normalizedKeyword || searchableText.includes(normalizedKeyword);
      const matchesBatch = batchFilter === 'all' || batchName === batchFilter;
      const matchesStatus = statusFilter === 'all'
        || row.status.key === statusFilter
        || (statusFilter === 'follow-up' && FOLLOW_UP_STATUSES.has(row.status.key));
      return matchesKeyword && matchesBatch && matchesStatus;
    });

    return filtered.sort((left, right) => {
      if (sortBy === 'eggs') return right.eggCount - left.eggCount || right.latestDate.localeCompare(left.latestDate);
      if (sortBy === 'hatches') return right.hatchCount - left.hatchCount || right.latestDate.localeCompare(left.latestDate);
      if (sortBy === 'name') return String(left.beetle.name || '').localeCompare(String(right.beetle.name || ''), 'zh-CN');
      return right.latestDate.localeCompare(left.latestDate)
        || String(left.beetle.name || '').localeCompare(String(right.beetle.name || ''), 'zh-CN');
    });
  }, [batchFilter, femaleRows, keyword, sortBy, statusFilter]);

  const clearFilters = () => {
    setKeyword('');
    setBatchFilter('all');
    setStatusFilter('all');
    setSortBy('latest');
  };

  return (
    <div className="breeding-overview" style={{ animation: 'fadeIn 0.3s' }}>
      <div className="breeding-page-header">
        <div>
          <button className="btn-back" onClick={onGoHome}>{tr("← 返回首页")}</button>
          <div className="breeding-title-block">
            <span className="breeding-title-icon" aria-hidden="true">🎀</span>
            <div>
              <span className="breeding-eyebrow">BREEDING OVERVIEW</span>
              <h2>{tr("繁殖记录总览")}</h2>
              <p>{tr("集中查看所有母虫的投产进度、卵数和孵化表现")}</p>
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-small" onClick={loadOverview} disabled={loading}>
          {loading ? tr("刷新中…") : tr("↻ 刷新数据")}
        </button>
      </div>

      <section className="breeding-hero card" aria-label={tr("繁殖汇总")}>
        <div className="breeding-hero-head">
          <div>
            <span className="breeding-hero-kicker">{tr("全盘生产表现")}</span>
            <h3>{summary.recordedFemales} {tr("只母虫已建立繁殖档案")}</h3>
          </div>
          <span className={`breeding-follow-up ${summary.followUpCount > 0 ? 'has-items' : ''}`}>
            {summary.followUpCount > 0
              ? tr('{count} 只待跟进', { count: summary.followUpCount })
              : tr("当前记录已跟进")}
          </span>
        </div>

        <div className="breeding-summary-grid">
          <div className="breeding-summary-item">
            <span>{tr("母虫总数")}</span>
            <strong>{summary.femaleCount}<small> {tr("只")}</small></strong>
          </div>
          <div className="breeding-summary-item">
            <span>{tr("生产次数")}</span>
            <strong>{summary.productionCount}<small> {tr("次")}</small></strong>
          </div>
          <div className="breeding-summary-item">
            <span>{tr("总产卵")}</span>
            <strong>{summary.eggCount}<small> {tr("枚")}</small></strong>
          </div>
          <div className="breeding-summary-item">
            <span>{tr("预计孵化")}</span>
            <strong>{summary.expectedHatchCount}<small> {tr("只")}</small></strong>
          </div>
          <div className="breeding-summary-item breeding-summary-highlight">
            <span>{tr("实际孵化")}</span>
            <strong>{summary.hatchCount}<small> {tr("只")}</small></strong>
          </div>
          <div
            className="breeding-summary-item breeding-summary-rate"
            title={tr("实际孵化总数 ÷ 累计产卵总数")}
          >
            <span>{tr("累计孵化率")}</span>
            <strong>{summary.hatchRate}</strong>
            <small className="breeding-rate-formula">
              {summary.eggCount > 0
                ? tr('{hatched} ÷ {eggs} 枚累计产卵', {
                    hatched: summary.hatchCount,
                    eggs: summary.eggCount
                  })
                : tr("暂无累计产卵数")}
            </small>
          </div>
        </div>
      </section>

      <section className="breeding-filters card" aria-label={tr("筛选繁殖记录")}>
        <label className="breeding-search-field">
          <span>{tr("搜索母虫")}</span>
          <input
            className="input"
            type="search"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder={tr("名称、品种、血统或配对公虫")}
          />
        </label>
        <label>
          <span>{tr("所属批次")}</span>
          <select className="select" value={batchFilter} onChange={event => setBatchFilter(event.target.value)}>
            <option value="all">{tr("全部批次")}</option>
            {batchOptions.map(batchName => <option key={batchName} value={batchName}>{tv(batchName)}</option>)}
          </select>
        </label>
        <label>
          <span>{tr("生产状态")}</span>
          <select className="select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{tr(option.label)}</option>)}
          </select>
        </label>
        <label>
          <span>{tr("排序方式")}</span>
          <select className="select" value={sortBy} onChange={event => setSortBy(event.target.value)}>
            <option value="latest">{tr("最近生产优先")}</option>
            <option value="eggs">{tr("产卵数优先")}</option>
            <option value="hatches">{tr("孵化数优先")}</option>
            <option value="name">{tr("母虫名称")}</option>
          </select>
        </label>
      </section>

      <div className="breeding-results-head">
        <div>
          <strong>{tr("母虫生产档案")}</strong>
          <span>{tr("显示")} {visibleRows.length} / {femaleRows.length} {tr("只")}</span>
        </div>
        {(keyword || batchFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'latest') && (
          <button className="btn btn-ghost btn-small" onClick={clearFilters}>{tr("清除筛选")}</button>
        )}
      </div>

      {loading && femaleRows.length === 0 ? (
        <div className="card breeding-state-card" aria-live="polite">
          <span className="breeding-loading-dot" />
          {tr("正在汇总繁殖记录…")}
        </div>
      ) : error && femaleRows.length === 0 ? (
        <div className="card breeding-state-card breeding-state-error">
          <strong>{tr("数据暂时加载失败")}</strong>
          <span>{tr(error)}</span>
          <button className="btn btn-primary btn-small" onClick={loadOverview}>{tr("重新加载")}</button>
        </div>
      ) : femaleRows.length === 0 ? (
        <div className="card breeding-state-card">
          <span className="breeding-empty-icon">♀</span>
          <strong>{tr("还没有母虫档案")}</strong>
          <span>{tr("先在甲虫记录中将成虫性别设为“母虫”，这里就会自动汇总。")}</span>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="card breeding-state-card">
          <span className="breeding-empty-icon">⌕</span>
          <strong>{tr("没有符合条件的母虫")}</strong>
          <button className="btn btn-ghost btn-small" onClick={clearFilters}>{tr("清除筛选")}</button>
        </div>
      ) : (
        <div className="breeding-female-list">
          {visibleRows.map(row => {
            const { beetle, latestRecord, status } = row;
            const firstImage = String(beetle.imageUrls || '').split(',').map(url => url.trim()).find(Boolean);
            const imageUrl = firstImage && (firstImage.startsWith('http') ? firstImage : api.getApiBase() + firstImage);
            return (
              <article className="breeding-female-card card" key={beetle.id}>
                <div className="breeding-female-head">
                  <div className="breeding-female-identity">
                    <div className="breeding-female-avatar">
                      {imageUrl ? <img src={imageUrl} alt={`${beetle.name || tr("母虫")} ${tr('缩略图')}`} /> : <span>♀</span>}
                    </div>
                    <div className="breeding-female-copy">
                      <div className="breeding-female-title-row">
                        <h3>{beetle.name || tr("未命名母虫")}</h3>
                        <span className={`breeding-status breeding-status-${status.key}`}>{tr(status.label)}</span>
                      </div>
                      <p>{[
                        tv(beetle.species || '未知品种'),
                        tv(beetle.subspecies),
                        tv(beetle.bloodline)
                      ].filter(Boolean).join(' · ')}</p>
                      <div className="breeding-female-tags">
                        <span>📦 {tv(beetle.batchName || '无批次')}</span>
                        {beetle.emergenceDate && <span>{tr("羽化")} {beetle.emergenceDate}</span>}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-small" onClick={() => onSelectBeetle(beetle)}>
                    {tr("查看详情 →")}
                  </button>
                </div>

                <div className="breeding-female-metrics">
                  <div><span>{tr("生产记录")}</span><strong>{row.records.length}<small> {tr("次")}</small></strong></div>
                  <div><span>{tr("累计产卵")}</span><strong>{row.eggCount}<small> {tr("枚")}</small></strong></div>
                  <div><span>{tr("实际孵化")}</span><strong>{row.hatchCount}<small> {tr("只")}</small></strong></div>
                  <div title={tr("实际孵化总数 ÷ 累计产卵总数")}>
                    <span>{tr("累计孵化率")}</span>
                    <strong>{row.hatchRate}</strong>
                  </div>
                </div>

                {latestRecord ? (
                  <div className="breeding-latest-record">
                    <div className="breeding-latest-head">
                      <div>
                        <span>{FOLLOW_UP_STATUSES.has(status.key) ? tr("待跟进记录") : tr("最近一次生产")}</span>
                        <strong>{row.latestDate || tr("日期未记录")}</strong>
                      </div>
                      <span className="breeding-status-hint">{tr(status.hint)}</span>
                    </div>
                    <div className="breeding-timeline">
                      <div><span>{tr("交配")}</span><strong>{latestRecord.matingDate || '—'}</strong></div>
                      <div><span>{tr("投产")}</span><strong>{latestRecord.layBoxDate || '—'}</strong></div>
                      <div><span>{tr("撤产")}</span><strong>{latestRecord.removeDate || '—'}</strong></div>
                      <div><span>{tr("配对公虫")}</span><strong>{latestRecord.maleBeetle || '—'}</strong></div>
                    </div>
                    {latestRecord.notes && <p className="breeding-latest-notes">{latestRecord.notes}</p>}
                  </div>
                ) : (
                  <div className="breeding-no-record">
                    <div>
                      <strong>{tr(status.hint)}</strong>
                      <span>{tr("进入个体详情后即可新增交配与生产记录。")}</span>
                    </div>
                    <button className="btn btn-primary btn-small" onClick={() => onSelectBeetle(beetle)}>{tr("去记录")}</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
