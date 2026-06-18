/**
 * 成长曲线图表组件
 * 使用 Canvas 2D API 手绘折线图
 */

const COLORS = {
  weight:      { line: '#5dbd8a', fill: 'rgba(93,189,138,0.15)', dot: '#8fe0b0' },
  length:      { line: '#64c8ff', fill: 'rgba(100,200,255,0.15)', dot: '#a0dcff' },
  temperature: { line: '#ffb060', fill: 'rgba(255,176,96,0.15)',  dot: '#ffd0a0' },
  humidity:    { line: '#c896ff', fill: 'rgba(200,150,255,0.15)', dot: '#dcbfff' }
}

const UNITS = {
  weight: 'g',
  length: 'mm',
  temperature: '℃',
  humidity: '%'
}

Component({
  properties: {
    records: {
      type: Array,
      value: [],
      observer: 'onRecordsChange'
    }
  },

  data: {
    activeTab: 'weight',
    noData: false
  },

  lifetimes: {
    ready() {
      this._canvasReady = false
      this.initCanvas()
    }
  },

  methods: {
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab
      this.setData({ activeTab: tab })
      this.draw()
    },

    onRecordsChange() {
      if (this._canvasReady) {
        this.draw()
      }
    },

    initCanvas() {
      const query = this.createSelectorQuery()
      query.select('#growthCanvas')
        .fields({ node: true, size: true })
        .exec(res => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getWindowInfo().pixelRatio || 2
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)
          this._canvas = canvas
          this._ctx = ctx
          this._width = res[0].width
          this._height = res[0].height
          this._canvasReady = true
          this.draw()
        })
    },

    draw() {
      if (!this._ctx) return
      const ctx = this._ctx
      const w = this._width
      const h = this._height
      const records = this.data.records || []
      const key = this.data.activeTab
      const color = COLORS[key]
      const unit = UNITS[key]

      // 清空画布
      ctx.clearRect(0, 0, w, h)

      // 提取有效数据点（按日期升序）
      const points = records
        .filter(r => r[key] && parseFloat(r[key]) > 0)
        .map(r => ({
          date: r.recordDate || '',
          value: parseFloat(r[key])
        }))
        .reverse() // records 是按日期降序的，反转为升序

      if (points.length < 2) {
        this.setData({ noData: true })
        return
      }
      this.setData({ noData: false })

      // 边距
      const padLeft = 60
      const padRight = 20
      const padTop = 30
      const padBottom = 40
      const chartW = w - padLeft - padRight
      const chartH = h - padTop - padBottom

      // 计算数据范围
      const values = points.map(p => p.value)
      let minVal = Math.min(...values)
      let maxVal = Math.max(...values)
      if (minVal === maxVal) {
        minVal = minVal - 1
        maxVal = maxVal + 1
      }
      const valRange = maxVal - minVal
      const padding = valRange * 0.15
      minVal -= padding
      maxVal += padding

      // --- 绘制网格线 --- 
      const gridLines = 4
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      ctx.font = '10px -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      for (let i = 0; i <= gridLines; i++) {
        const y = padTop + (chartH / gridLines) * i
        const val = maxVal - ((maxVal - minVal) / gridLines) * i

        ctx.beginPath()
        ctx.moveTo(padLeft, y)
        ctx.lineTo(w - padRight, y)
        ctx.stroke()

        ctx.fillText(val.toFixed(1), padLeft - 8, y)
      }

      // --- 计算点位 ---
      const coords = points.map((p, i) => ({
        x: padLeft + (chartW / (points.length - 1)) * i,
        y: padTop + chartH - ((p.value - minVal) / (maxVal - minVal)) * chartH,
        date: p.date,
        value: p.value
      }))

      // --- 绘制填充区域 ---
      ctx.beginPath()
      ctx.moveTo(coords[0].x, padTop + chartH)
      coords.forEach(c => ctx.lineTo(c.x, c.y))
      ctx.lineTo(coords[coords.length - 1].x, padTop + chartH)
      ctx.closePath()

      const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH)
      gradient.addColorStop(0, color.fill)
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.fill()

      // --- 绘制折线 ---
      ctx.beginPath()
      ctx.strokeStyle = color.line
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      coords.forEach((c, i) => {
        if (i === 0) ctx.moveTo(c.x, c.y)
        else ctx.lineTo(c.x, c.y)
      })
      ctx.stroke()

      // --- 绘制数据点 ---
      coords.forEach(c => {
        // 外圈光晕
        ctx.beginPath()
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = color.fill
        ctx.fill()

        // 实心点
        ctx.beginPath()
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = color.dot
        ctx.fill()
      })

      // --- 绘制 X 轴日期标签 ---
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '9px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      // 最多显示 6 个标签避免重叠
      const maxLabels = 6
      const step = Math.max(1, Math.ceil(coords.length / maxLabels))
      coords.forEach((c, i) => {
        if (i % step === 0 || i === coords.length - 1) {
          const label = c.date.length > 5 ? c.date.substring(5) : c.date // MM-DD
          ctx.fillText(label, c.x, padTop + chartH + 10)
        }
      })

      // --- 单位标签 ---
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '9px -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(unit, padLeft, padTop - 6)
    }
  }
})
