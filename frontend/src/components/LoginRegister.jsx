import { useState } from 'react';
import * as api from '../utils/api';
import { translate as tr } from '../i18n';

export default function LoginRegister({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('用户名和密码不能为空');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const data = await api.request(endpoint, {
        method: 'POST',
        data: { username, password }
      });

      // Save token
      localStorage.setItem('beetle_token', data.token);
      localStorage.setItem('beetle_username', data.username);

      onLoginSuccess(data.username);
    } catch (err) {
      setError(err.message || '操作失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>
          {tr(isLogin ? '欢迎回来' : '注册新账号')}
        </h2>

        {error && (
          <div style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {tr(error)}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            className="input"
            placeholder={tr('👤 你的账号 (用户名)')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            style={{ fontSize: '15px', padding: '14px', marginBottom: 0 }}
          />
          <input
            type="password"
            className="input"
            placeholder={tr('🔑 你的密码')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ fontSize: '15px', padding: '14px', marginBottom: 0 }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {tr(loading ? '处理中...' : (isLogin ? '登 录' : '注 册'))}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {tr(isLogin ? '还没有账号？' : '已有账号？')}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color)',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: '8px'
            }}
          >
            {tr(isLogin ? '立即注册' : '返回登录')}
          </button>
        </div>

        {!isLogin && (
          <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
            {tr('💡 提示：注册的第一个账号将自动认领所有现存未绑定主人的老数据，实现无缝迁移。')}
          </div>
        )}
      </div>
    </div>
  );
}
