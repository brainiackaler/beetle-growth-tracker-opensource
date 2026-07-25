const TIME_ZONE_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;
const LEGACY_SERVER_DATE_TIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

const beijingDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

const getDateTimeParts = (date) => Object.fromEntries(
  beijingDateTimeFormatter
    .formatToParts(date)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value])
);

export const formatBeijingDateTime = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '时间未知';

  const normalized = text.replace(' ', 'T');
  const legacyUtcValue = LEGACY_SERVER_DATE_TIME.test(text) && !TIME_ZONE_SUFFIX.test(text);
  const date = new Date(legacyUtcValue ? `${normalized}Z` : normalized);

  if (Number.isNaN(date.getTime())) {
    return text.replace('T', ' ').replace(/\.\d+$/, '');
  }

  const parts = getDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};
