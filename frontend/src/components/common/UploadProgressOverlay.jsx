import { translate as tr } from '../../i18n';
export default function UploadProgressOverlay({ isUploading, progress }) {
  if (!isUploading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="card" style={{
        width: '80%',
        maxWidth: '400px',
        padding: '30px',
        textAlign: 'center',
        background: 'rgba(30, 30, 30, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'bounce 2s infinite' }}>📸</div>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>{tr("正在上传图片...")}</h3>

        <div style={{
          width: '100%',
          height: '12px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '12px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #4dabf7, #51cf66)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(81, 207, 102, 0.5)'
          }} />
        </div>

        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
          {progress}%
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          {tr("请耐心等待，图片较大时可能需要几秒钟")}
        </div>
      </div>
    </div>
  );
}
