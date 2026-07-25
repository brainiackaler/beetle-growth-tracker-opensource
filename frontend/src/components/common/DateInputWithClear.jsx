import { useRef, useEffect } from 'react';
import { translate as tr } from '../../i18n';

const DateInputWithClear = ({ label, value, onChange, required, style, min, max }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== (value || '')) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  const handleChange = (e) => {
    onChange(e);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = '';
    onChange({ target: { value: '' } });
  };

  return (
    <div className="form-group" style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label className="input-label" style={{ marginBottom: 0 }}>
          {label} {required && <span style={{ color: '#ff6b6b' }}>*</span>}
        </label>
        <button
          type="button"
          className="btn-link"
          style={{ fontSize: '11px', padding: 0, color: value ? 'var(--accent-color)' : 'rgba(255,255,255,0.2)' }}
          onClick={handleClear}
          disabled={!value}
        >
          {tr("清除")}
        </button>
      </div>
      <input
        ref={inputRef}
        type="date"
        className="input"
        defaultValue={value || ''}
        onChange={handleChange}
        required={required}
        min={min}
        max={max}
      />
    </div>
  );
};

export default DateInputWithClear;
