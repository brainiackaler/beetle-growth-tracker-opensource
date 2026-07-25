import { useEffect, useRef, useState } from 'react';
import { translate as tr } from '../../i18n';

const MAX_CANVAS_EDGE = 2048;

export default function ImageAnnotationModal({ imageUrl, onClose, onSave }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const historyRef = useRef([]);
  const [color, setColor] = useState('#ff3b30');
  const [brushSize, setBrushSize] = useState(8);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const scale = Math.min(1, MAX_CANVAS_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      historyRef.current = [context.getImageData(0, 0, canvas.width, canvas.height)];
      setIsReady(true);
    };
    image.onerror = () => setError('图片加载失败，暂时无法批注');
    image.src = imageUrl;
  }, [imageUrl]);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (event) => {
    if (!isReady) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = getCanvasPoint(event);
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize * (canvas.width / canvas.getBoundingClientRect().width);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const context = canvasRef.current.getContext('2d');
    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    historyRef.current.push(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height));
  };

  const undo = () => {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    canvasRef.current.getContext('2d').putImageData(historyRef.current.at(-1), 0, 0);
  };

  const clearAnnotations = () => {
    if (historyRef.current.length === 0) return;
    historyRef.current = [historyRef.current[0]];
    canvasRef.current.getContext('2d').putImageData(historyRef.current[0], 0, 0);
  };

  const save = () => {
    const canvas = canvasRef.current;
    try {
      canvas.toBlob(blob => {
        if (!blob) {
          setError('批注图片生成失败，请重试');
          return;
        }
        onSave(blob);
      }, 'image/jpeg', 0.92);
    } catch {
      setError('此图片来源不允许在线修改，请重新上传后批注');
    }
  };

  return (
    <div className="annotation-overlay" onClick={onClose}>
      <div className="annotation-modal" onClick={event => event.stopPropagation()}>
        <div className="annotation-header">
          <div>
            <strong>{tr("🖍️ 图片批注")}</strong>
            <span>{tr("直接在图片上圈画重点")}</span>
          </div>
          <button type="button" className="annotation-close" onClick={onClose}>✕</button>
        </div>

        <div className="annotation-canvas-wrap">
          {!isReady && !error && <span className="annotation-loading">{tr("图片加载中...")}</span>}
          {error && <span className="annotation-error">{error}</span>}
          <canvas
            ref={canvasRef}
            className="annotation-canvas"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
          />
        </div>

        <div className="annotation-toolbar">
          <label className="annotation-control">
            {tr("颜色")}
            <input type="color" value={color} onChange={event => setColor(event.target.value)} />
          </label>
          <label className="annotation-control annotation-size-control">
            {tr("粗细")}
            <input type="range" min="2" max="24" value={brushSize} onChange={event => setBrushSize(Number(event.target.value))} />
            <span>{brushSize}px</span>
          </label>
          <button type="button" className="btn btn-ghost btn-small" onClick={undo} disabled={!isReady}>{tr("↶ 撤销")}</button>
          <button type="button" className="btn btn-ghost btn-small" onClick={clearAnnotations} disabled={!isReady}>{tr("清空批注")}</button>
          <button type="button" className="btn btn-primary btn-small annotation-save" onClick={save} disabled={!isReady}>{tr("保存批注")}</button>
        </div>
      </div>
    </div>
  );
}
