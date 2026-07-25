import { formatBeijingDateTime } from '../utils/dateTime';
import { translate as tr } from '../i18n';


const HISTORY_FIELDS = [
  { key: 'matingDate', label: '交配日期' },
  { key: 'maleBeetle', label: '配对公虫' },
  { key: 'layBoxDate', label: '下产房时间' },
  { key: 'removeDate', label: '取出母虫时间' },
  { key: 'eggCount', label: '产卵总数' },
  { key: 'expectedHatchCount', label: '预计孵化' },
  { key: 'hatchCount', label: '实际孵化' },
  { key: 'notes', label: '备注' },
  { key: 'imageUrls', label: '图片' }
];

const normalizeValue = (value) => String(value ?? '').trim();

const countImages = (value) => normalizeValue(value)
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)
  .length;

const formatValue = (field, value) => {
  if (field === 'imageUrls') {
    return tr('{count} 张', { count: countImages(value) });
  }
  return normalizeValue(value) || tr('未填写');
};

const getSnapshotLabel = (snapshotType) => {
  if (snapshotType === 'UPDATED') return '编辑保存';
  if (snapshotType === 'BASELINE') return '原始记录';
  return '创建记录';
};

const getChanges = (history, index) => {
  const current = history[index];
  const previous = history[index + 1];
  if (!current || !previous) return [];

  return HISTORY_FIELDS
    .filter(({ key }) => normalizeValue(current[key]) !== normalizeValue(previous[key]))
    .map(({ key, label }) => ({
      key,
      label,
      before: formatValue(key, previous[key]),
      after: formatValue(key, current[key])
    }));
};

const SnapshotSummary = ({ item }) => (
  <div className="production-history-snapshot">
    <span>{tr("🥚 产卵")} {formatValue('eggCount', item.eggCount)}</span>
    <span>{tr("⏳ 预计")} {formatValue('expectedHatchCount', item.expectedHatchCount)}</span>
    <span>{tr("🐛 实际")} {formatValue('hatchCount', item.hatchCount)}</span>
  </div>
);

export default function ProductionHistoryPanel({ history = [], loading = false }) {
  const editCount = history.filter(item => item.snapshotType === 'UPDATED').length;

  return (
    <section className="production-history-panel" aria-label={tr("生产记录编辑历史")}>
      <div className="production-history-head">
        <div>
          <strong>{tr("🕘 编辑历史")}</strong>
          <p>{tr("每次保存自动留存，汇总数据只使用当前最新值")}</p>
        </div>
        {!loading && <span>{editCount} {tr("次更新")}</span>}
      </div>

      {loading ? (
        <div className="production-history-state">{tr("正在加载历史记录…")}</div>
      ) : history.length === 0 ? (
        <div className="production-history-state">
          {tr("这条记录还没有历史；下次编辑保存后会自动开始记录。")}
        </div>
      ) : (
        <div className="production-history-list">
          {history.map((item, index) => {
            const changes = getChanges(history, index);
            const hasPreviousSnapshot = Boolean(history[index + 1]);

            return (
              <article className="production-history-item" key={item.id}>
                <span className={`production-history-dot ${item.snapshotType === 'UPDATED' ? 'is-update' : ''}`} />
                <div className="production-history-content">
                  <div className="production-history-meta">
                    <strong>{tr(getSnapshotLabel(item.snapshotType))}</strong>
                    <time title={tr("北京时间")}>{tr(formatBeijingDateTime(item.createdAt))}</time>
                  </div>

                  {hasPreviousSnapshot ? (
                    <div className="production-history-changes">
                      {changes.map(change => (
                        <div className="production-history-change" key={change.key}>
                          <span className="production-history-field">{tr(change.label)}</span>
                          <span className="production-history-before" title={change.before}>{change.before}</span>
                          <span className="production-history-arrow">→</span>
                          <strong className="production-history-after" title={change.after}>{change.after}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <SnapshotSummary item={item} />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
