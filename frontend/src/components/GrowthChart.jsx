import { useState, useEffect, useRef, useCallback } from 'react';

const COLORS = {
  weight:      { line: '#5dbd8a', fill: 'rgba(93,189,138,0.15)', dot: '#8fe0b0' },
  length:      { line: '#64c8ff', fill: 'rgba(100,200,255,0.15)', dot: '#a0dcff' },
  temperature: { line: '#ffb060', fill: 'rgba(255,176,96,0.15)',  dot: '#ffd0a0' },
  humidity:    { line: '#c896ff', fill: 'rgba(200,150,255,0.15)', dot: '#dcbfff' }
};

const UNITS = {
  weight: 'g',
  length: 'mm',
  temperature: '℃',
  humidity: '%'
};

const LABELS = {
  weight: '⚖️ 体重',
  length: '📏 体长',
  temperature: '🌡️ 温度',
  humidity: '💧 湿度'
};

export default function GrowthChart({ records = [] }) {
  const [activeTab, setActiveTab] = useState('weight');
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    if (!container) return;

    // Get actual layout size of container
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Adjust for High DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Extract valid data points (ascending order by date)
    const points = records
      .filter(r => r[activeTab] && parseFloat(r[activeTab]) > 0)
      .map(r => ({
        date: r.recordDate || '',
        value: parseFloat(r[activeTab])
      }))
      .reverse(); // Backend list is descending (newest first), reverse to show chronologically

    if (points.length < 2) {
      return; // Not enough data to draw line
    }

    const color = COLORS[activeTab];
    const unit = UNITS[activeTab];

    // Margins
    const padLeft = 50;
    const padRight = 20;
    const padTop = 30;
    const padBottom = 30;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Range calculation
    const values = points.map(p => p.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }
    const valRange = maxVal - minVal;
    const verticalPadding = valRange * 0.15;
    minVal = Math.max(0, minVal - verticalPadding); // Avoid negative values for weight/length
    maxVal += verticalPadding;

    // --- Draw Grid Lines & Y-Axis Labels ---
    const gridLines = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLines; i++) {
      const y = padTop + (chartH / gridLines) * i;
      const val = maxVal - ((maxVal - minVal) / gridLines) * i;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillText(val.toFixed(1), padLeft - 8, y);
    }

    // --- Calculate Node Coordinates ---
    const coords = points.map((p, i) => ({
      x: padLeft + (chartW / (points.length - 1)) * i,
      y: padTop + chartH - ((p.value - minVal) / (maxVal - minVal)) * chartH,
      date: p.date,
      value: p.value
    }));

    // --- Draw Shadow Area under the line ---
    ctx.beginPath();
    ctx.moveTo(coords[0].x, padTop + chartH);
    coords.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, padTop + chartH);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    gradient.addColorStop(0, color.fill);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // --- Draw Connecting Line ---
    ctx.beginPath();
    ctx.strokeStyle = color.line;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    coords.forEach((c, i) => {
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();

    // --- Draw Nodes ---
    coords.forEach(c => {
      // Glow Outer Ring
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = color.fill;
      ctx.fill();

      // Solid Core Dot
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color.dot;
      ctx.fill();
    });

    // --- Draw X-Axis Date Labels ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const maxLabels = Math.min(6, points.length);
    const step = Math.max(1, Math.ceil(coords.length / maxLabels));
    
    coords.forEach((c, i) => {
      if (i % step === 0 || i === coords.length - 1) {
        // Format date to MM-DD
        const label = c.date.length > 5 ? c.date.substring(5) : c.date;
        ctx.fillText(label, c.x, padTop + chartH + 8);
      }
    });

    // --- Unit Label ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${unit}`, padLeft, padTop - 8);
  }, [records, activeTab]);

  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    // Draw chart initially and on updates
    drawChart();

    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  const hasData = records.filter(r => r[activeTab] && parseFloat(r[activeTab]) > 0).length >= 2;

  return (
    <div className="card chart-card">
      <div className="section-title">📊 成长曲线</div>
      <div className="tab-bar">
        {Object.keys(LABELS).map(key => (
          <div
            key={key}
            className={`tab-item ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {LABELS[key]}
          </div>
        ))}
      </div>
      <div className="canvas-container" ref={containerRef}>
        <canvas className="canvas-element" ref={canvasRef} />
        {!hasData && (
          <div className="chart-no-data">
            <div>📈 数据点不足 (需要至少 2 个记录)</div>
          </div>
        )}
      </div>
    </div>
  );
}
