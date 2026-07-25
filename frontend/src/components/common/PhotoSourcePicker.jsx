import { translate as tr } from '../../i18n';

export default function PhotoSourcePicker({
  onSelect,
  buttonStyle,
  disabled = false,
  cameraLabel = '拍照并保存',
  albumLabel = '相册'
}) {
  const handleChange = (source) => (event) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    if (files.length > 0) {
      onSelect(files, source);
    }
    input.value = '';
  };

  return (
    <>
      <label className="img-add-btn photo-source-btn" style={buttonStyle}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled}
          onChange={handleChange('camera')}
          style={{ display: 'none' }}
        />
        <span className="img-add-icon">📷</span>
        <span className="img-add-text">{tr(cameraLabel)}</span>
      </label>
      <label className="img-add-btn photo-source-btn" style={buttonStyle}>
        <input
          type="file"
          multiple
          accept="image/*"
          disabled={disabled}
          onChange={handleChange('album')}
          style={{ display: 'none' }}
        />
        <span className="img-add-icon">🖼️</span>
        <span className="img-add-text">{tr(albumLabel)}</span>
      </label>
    </>
  );
}
