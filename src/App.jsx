import React, { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, BarChart3, Layers, Search,
  MessageSquare, Upload, Settings,
  Image as ImageIcon, Zap, CheckCircle2, Save, ChevronDown,
  DollarSign
} from 'lucide-react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line, ComposedChart
} from 'recharts'
import { processData } from './utils/dataProcessor'
import './App.css'

const SAMPLE_CSV = `DATE,COUNTRY,MEDIA,IMPRESSION,CLICKS,COST,GA_SESSION,GA_CONV,GA_REV,BRAND,CAMPAIGN,NEW_USER,FIRST_PURCHASE
2026-05-12,US,Google,50000,1200,1000,1100,50,5000,Premium,Search_US_Brand,120,40
2026-05-12,US,Meta,30000,1500,800,1400,30,2500,Casual,Social_US_Engagement,80,25
2026-05-12,JP,Google,20000,400,500,380,10,1200,Premium,Search_JP_Brand,30,10
2026-05-12,JP,TikTok,40000,2000,600,1800,15,1800,Casual,Video_JP_Viral,150,50
2026-05-12,CA,Google,15000,300,400,280,8,900,Designer,Search_CA_Brand,20,5
2026-05-12,SG,Meta,12000,250,300,240,6,750,Premium,Social_SG_Promo,15,4
2026-05-11,US,Google,48000,1100,950,1050,45,4600,Premium,Search_US_Brand,110,38
2026-05-11,US,Meta,32000,1600,850,1500,35,2800,Casual,Social_US_Engagement,75,22
`;

const processDataWithFees = async (csv, fees) => {
  const processed = await processData(csv, 0)
  return processed.map(row => {
    const fee = fees[row.MEDIA] || 0
    const adjustedCost = row.COST * (1 + fee / 100)
    return {
      ...row,
      ADJUSTED_COST: adjustedCost,
      ROAS: adjustedCost > 0 ? (row.GA_REV / adjustedCost) * 100 : 0,
      CPC: row.CLICKS > 0 ? adjustedCost / row.CLICKS : 0,
      CPA: row.GA_CONV > 0 ? adjustedCost / row.GA_CONV : 0,
      AOV: row.GA_CONV > 0 ? row.GA_REV / row.GA_CONV : 0
    }
  })
}

const METRIC_OPTIONS = [
  { label: 'Revenue', key: 'GA_REV', type: 'currency' },
  { label: 'Spend', key: 'ADJUSTED_COST', type: 'currency' },
  { label: 'ROAS', key: 'ROAS', type: 'percentage' },
  { label: 'Impressions', key: 'IMPRESSION', type: 'number' },
  { label: 'Clicks', key: 'CLICKS', type: 'number' },
  { label: 'Sessions', key: 'GA_SESSION', type: 'number' },
  { label: 'Conversions', key: 'GA_CONV', type: 'number' },
  { label: 'New Users', key: 'NEW_USER', type: 'number' }
];

const COUNTRY_OPTIONS = ['All', 'US', 'CA', 'JP', 'AU', 'EU', 'INT'];
const MEDIA_OPTIONS   = ['All', 'Google', 'Pinterest', 'Meta', 'Line', 'Tiktok'];

function App() {
  const [activeTab, setActiveTab] = useState('summary')
  const [periodMode, setPeriodMode] = useState('Yesterday')
  
  // Data State
  const [rawCsv, setRawCsv] = useState(SAMPLE_CSV)
  const [data, setData] = useState([])
  const [fileName, setFileName] = useState('Sample Data Loaded')
  const [uploadError, setUploadError] = useState(null)

  // Agency Fee State (Media Specific)
  const [mediaFees, setMediaFees] = useState({ 'Google': 15, 'Meta': 15, 'TikTok': 15, 'Apple': 15, 'Pinterest': 15 })
  const [selectedFeeMedia, setSelectedFeeMedia] = useState('Google')
  const [tempFeeValue, setTempFeeValue] = useState(15)

  // Global Filters
  const [selectedCountry, setSelectedCountry] = useState('All')
  const [selectedMedia, setSelectedMedia] = useState('All')
  const selectedMetric = METRIC_OPTIONS[0]

  // Initial Load & Fee Updates
  useEffect(() => {
    processDataWithFees(rawCsv, mediaFees)
      .then(processed => {
        setData(processed)
        setUploadError(null)
      })
      .catch(e => {
        console.error('Data refresh error:', e)
        setUploadError('데이터 처리 중 오류가 발생했습니다. CSV 형식을 확인해주세요.')
      })
  }, [rawCsv, mediaFees])

  const handleDataLoad = (csv, name) => {
    setRawCsv(csv)
    setFileName(name)
    setSelectedCountry('All')
    setSelectedMedia('All')
  }

  const updateMediaFee = () => {
    setMediaFees(prev => ({ ...prev, [selectedFeeMedia]: tempFeeValue }))
  }

  const filteredData = useMemo(() => {
    let filtered = data;
    if (selectedCountry !== 'All') filtered = filtered.filter(d => d.COUNTRY === selectedCountry);
    if (selectedMedia !== 'All') filtered = filtered.filter(d => d.MEDIA === selectedMedia);
    return filtered;
  }, [data, selectedCountry, selectedMedia]);

  const formatValue = (val, type) => {
    if (type === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    if (type === 'percentage') return `${Math.round(val || 0)}%`;
    return new Intl.NumberFormat('en-US').format(Math.round(val || 0));
  }

  const mediasList = useMemo(() => ['All', ...new Set(data.map(d => d.MEDIA))].filter(Boolean), [data]);

  // --- Views ---

  const renderSummaryView = () => {
    if (!filteredData.length) return <div className="card loading-state">조회할 데이터가 없습니다.</div>;

    const s = (key) => filteredData.reduce((a, r) => a + (Number(r[key]) || 0), 0);

    const impression   = s('IMPRESSION');
    const clicks       = s('CLICKS');
    const cost         = s('ADJUSTED_COST');
    const uv           = s('GA_SESSION');
    const newUser      = s('NEW_USER');
    const conv         = s('GA_CONV');
    const rev          = s('GA_REV');
    const firstPurch   = s('FIRST_PURCHASE');
    const cart         = s('CART') || s('GA_CART');
    const mediaConv    = s('MEDIA_CONV') || s('MEDIA_CONVERSION');
    const mediaConvVal = s('MEDIA_CONV_VALUE') || s('MEDIA_REVENUE');

    const ctr          = impression > 0 ? clicks / impression * 100 : 0;
    const cpc          = clicks > 0 ? cost / clicks : 0;
    const cpuv         = uv > 0 ? cost / uv : 0;
    const newCpuv      = newUser > 0 ? cost / newUser : 0;
    const newUserRatio = uv > 0 ? newUser / uv * 100 : 0;
    const cvr          = uv > 0 ? conv / uv * 100 : 0;
    const cpa          = conv > 0 ? cost / conv : 0;
    const roas         = cost > 0 ? rev / cost * 100 : 0;
    const aov          = conv > 0 ? rev / conv : 0;
    const fpCpa        = firstPurch > 0 ? cost / firstPurch : 0;
    const mediaRoas    = cost > 0 ? mediaConvVal / cost * 100 : 0;

    const n  = (v)    => new Intl.NumberFormat('en-US').format(Math.round(v || 0));
    const d2 = (v)    => (v || 0).toFixed(2);
    const pct= (v, dp=2) => `${(v || 0).toFixed(dp)}%`;

    const METRICS = [
      { label: 'IMPRESSION',   value: n(impression) },
      { label: 'CLICKS',       value: n(clicks) },
      { label: 'COST',         value: n(cost) },
      { label: 'CTR',          value: pct(ctr) },
      { label: 'CPC',          value: d2(cpc) },
      { label: 'UV',           value: n(uv) },
      { label: 'CPUV',         value: d2(cpuv) },
      { label: '새사용자',      value: n(newUser) },
      { label: 'NEW_CPUV',     value: d2(newCpuv) },
      { label: '새사용자비중',  value: pct(newUserRatio) },
      { label: 'CVR',          value: pct(cvr) },
      { label: '구매수',        value: n(conv) },
      { label: '구매 CPA',     value: d2(cpa) },
      { label: '매출',          value: n(rev) },
      { label: 'ROAS',         value: `${Math.round(roas)}%` },
      { label: '객단가',        value: d2(aov) },
      { label: '첫구매',        value: n(firstPurch) },
      { label: '첫구매 CPA',   value: d2(fpCpa) },
      { label: '장바구니',      value: n(cart) },
      { label: '매체 전환수',   value: n(mediaConv) },
      { label: '매체 전환값',   value: n(mediaConvVal) },
      { label: '매체 ROAS',    value: `${Math.round(mediaRoas)}%` },
    ];

    // Country-level aggregates for charts
    const byCountry = Object.values(
      filteredData.reduce((acc, row) => {
        const c = row.COUNTRY || 'N/A';
        if (!acc[c]) acc[c] = { country: c, _rev: 0, _cost: 0, _newUser: 0, _uv: 0, _conv: 0 };
        acc[c]._rev     += Number(row.GA_REV)       || 0;
        acc[c]._cost    += Number(row.ADJUSTED_COST) || 0;
        acc[c]._newUser += Number(row.NEW_USER)      || 0;
        acc[c]._uv      += Number(row.GA_SESSION)    || 0;
        acc[c]._conv    += Number(row.GA_CONV)       || 0;
        return acc;
      }, {})
    ).map(c => ({
      country:    c.country,
      ROAS:       c._cost > 0 ? Math.round(c._rev / c._cost * 100) : 0,
      새사용자비중: c._uv > 0 ? parseFloat((c._newUser / c._uv * 100).toFixed(1)) : 0,
      구매수:     Math.round(c._conv),
      객단가:     c._conv > 0 ? Math.round(c._rev / c._conv) : 0,
    }));

    return (
      <div className="tab-view animate-fade-in">
        {/* Metric boxes */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
          <div className="metric-grid">
            {METRICS.map(m => (
              <div key={m.label} className="metric-box">
                <div className="metric-box-label">{m.label}</div>
                <div className="metric-box-value">{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid-2">
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 700 }}>국가별 ROAS 및 새사용자비중</h3>
            <div style={{ height: '260px' }}>
              <ResponsiveContainer>
                <ComposedChart data={byCountry} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF2F7" />
                  <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={(v, name) => [`${v}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="ROAS" fill="var(--primary)" name="ROAS" radius={[4,4,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="새사용자비중" stroke="#FFAB00" strokeWidth={2} dot={{ r: 4 }} name="새사용자비중" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 700 }}>국가별 구매건수 및 객단가</h3>
            <div style={{ height: '260px' }}>
              <ResponsiveContainer>
                <ComposedChart data={byCountry} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF2F7" />
                  <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="구매수" fill="#36B37E" name="구매수" radius={[4,4,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="객단가" stroke="#FF5630" strokeWidth={2} dot={{ r: 4 }} name="객단가" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderGAAnalysisView = () => {
    const latestDate = [...data].sort((a,b) => new Date(b.DATE) - new Date(a.DATE))[0]?.DATE;
    const latestData = filteredData.filter(d => d.DATE === latestDate);
    if (latestData.length === 0) return <div className="card loading-state">조회할 GA 데이터가 없습니다.</div>;

    return (
      <div className="tab-view animate-fade-in">
        <div className="card">
          <h3>GA Performance: {selectedMetric.label} Analysis</h3>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer>
              <ComposedChart data={filteredData}>
                <XAxis dataKey="DATE" tick={{fontSize: 10}} />
                <YAxis yAxisId="left" hide />
                <Tooltip />
                <Bar yAxisId="left" dataKey={selectedMetric.key} fill="#EBECF0" barSize={30} name={selectedMetric.label} />
                <Line yAxisId="left" type="monotone" dataKey="GA_CONV" stroke="var(--primary)" strokeWidth={3} dot={{r: 4}} name="Conversions" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  const renderMultiChannelView = () => {
    const latestDate = [...data].sort((a,b) => new Date(b.DATE) - new Date(a.DATE))[0]?.DATE;
    const latestData = filteredData.filter(d => d.DATE === latestDate);
    return (
      <div className="tab-view animate-fade-in">
        <div className="card">
          <div className="table-header">
            <h3>Channel Deep-dive: {selectedMetric.label} Focus</h3>
          </div>
          <div className="data-table-container">
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Media</th>
                  <th>Campaign</th>
                  <th className="text-right">Selected Metric: {selectedMetric.label}</th>
                  <th className="text-right">ROAS</th>
                  <th className="text-right">Adjusted Cost</th>
                </tr>
              </thead>
              <tbody>
                {latestData.map((row, i) => (
                  <tr key={i}>
                    <td>{row.COUNTRY}</td>
                    <td><span className="media-badge">{row.MEDIA}</span></td>
                    <td>{row.CAMPAIGN}</td>
                    <td className="text-right"><strong>{formatValue(row[selectedMetric.key], selectedMetric.type)}</strong></td>
                    <td className="text-right">{Math.round(row.ROAS)}%</td>
                    <td className="text-right">{formatValue(row.ADJUSTED_COST, 'currency')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderCreativeView = () => {
    const latestDate = [...data].sort((a,b) => new Date(b.DATE) - new Date(a.DATE))[0]?.DATE;
    const latestData = filteredData.filter(d => d.DATE === latestDate);
    return (
      <div className="tab-view animate-fade-in">
        <div className="creative-grid">
          {latestData.map((row, i) => (
            <div key={i} className="creative-card card">
              <div className="creative-img">
                <ImageIcon size={32} color="#CBD5E0" />
                <div className="img-overlay">{row.MEDIA}</div>
              </div>
              <div className="creative-info">
                <div className="creative-name">{row.CAMPAIGN}</div>
                <div className="creative-meta">{row.COUNTRY}</div>
                <div className="creative-efficiency">
                  <span className="label">{selectedMetric.label}</span>
                  <span className="value">{formatValue(row[selectedMetric.key], selectedMetric.type)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (data.length === 0) return <div className="card loading-state">데이터 로드 중...</div>;
    switch (activeTab) {
      case 'summary': return renderSummaryView();
      case 'ga': return renderGAAnalysisView();
      case 'multi-channel': return renderMultiChannelView();
      case 'creative': return renderCreativeView();
      default: return renderSummaryView();
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Zap className="text-primary" fill="var(--primary)" />
          <span>OPTIMIZER</span>
        </div>
        <div className="sidebar-section-label">ANALYSIS</div>
        <nav className="sidebar-nav">
          <NavItem icon={<LayoutDashboard size={18} />} label="Campaign Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
          <NavItem icon={<BarChart3 size={18} />} label="GA Integrated Analysis" active={activeTab === 'ga'} onClick={() => setActiveTab('ga')} />
          <NavItem icon={<Layers size={18} />} label="Multi-channel Analysis" active={activeTab === 'multi-channel'} onClick={() => setActiveTab('multi-channel')} />
          <NavItem icon={<Search size={18} />} label="Creative Analysis" active={activeTab === 'creative'} onClick={() => setActiveTab('creative')} />
        </nav>
        <div className="sidebar-section-label">SETTINGS</div>
        <div className="sidebar-fee-manager">
          <div className="sidebar-fee-row"><DollarSign size={16} /><span>Media Fee Settings</span></div>
          <div className="sidebar-fee-controls">
            <select value={selectedFeeMedia} onChange={(e) => {
              setSelectedFeeMedia(e.target.value);
              setTempFeeValue(mediaFees[e.target.value] || 15);
            }}>{mediasList.filter(m => m !== 'All').map(m => <option key={m} value={m}>{m}</option>)}</select>
            <div className="sidebar-fee-input"><input type="number" value={tempFeeValue} onChange={(e) => setTempFeeValue(Number(e.target.value))} /><span>%</span></div>
            <button className="sidebar-fee-btn" onClick={updateMediaFee}><Save size={14} /> Update</button>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="file-status"><CheckCircle2 size={12} color="var(--success)" /><span>{fileName}</span></div>
          {uploadError && (
            <div style={{ fontSize: '11px', color: 'var(--danger, #E53E3E)', padding: '6px 8px', background: '#FFF5F5', borderRadius: '6px', marginBottom: '6px', lineHeight: '1.4' }}>
              {uploadError}
            </div>
          )}
          <label className="btn btn-primary-upload"><Upload size={16} /> Upload Data
            <input type="file" hidden onChange={(e) => {
               const file = e.target.files[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (ev) => handleDataLoad(ev.target.result, file.name);
                 reader.readAsText(file);
               }
               e.target.value = '';
            }} accept=".csv" />
          </label>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="header">
          <div className="header-left">
            <div className="global-filter-row">
              <div className="capsule-select">
                <span className="capsule-label">Country</span>
                <div className="select-wrapper">
                  <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                    {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="chevron" />
                </div>
              </div>
              <div className="capsule-select">
                <span className="capsule-label">Media</span>
                <div className="select-wrapper">
                  <select value={selectedMedia} onChange={(e) => setSelectedMedia(e.target.value)}>
                    {MEDIA_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="chevron" />
                </div>
              </div>
              <div className="capsule-tabs">
                {['Yesterday', 'WoW', 'MoM', 'YoY'].map(mode => (
                  <button key={mode} className={`capsule-btn ${periodMode === mode ? 'active' : ''}`} onClick={() => setPeriodMode(mode)}>{mode}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="icon-btn"><Settings size={18} /></button>
          </div>
        </header>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>

      <AIChatBot data={filteredData} selectedMetric={selectedMetric} formatValue={formatValue} />
    </div>
  )
}

// --- Helper Components ---

const NavItem = ({ icon, label, active, onClick }) => (
  <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
    {icon} <span>{label}</span>
  </div>
)


const AIChatBot = ({ data, selectedMetric, formatValue }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'ai', content: '데이터 분석 도와드릴까요?' }]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || data.length === 0) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: `현재 선택된 지표(${selectedMetric.label})를 중심으로 분석 중입니다.` }]);
    }, 800);
  };

  return (
    <div className={`chat-widget ${open ? 'open' : ''}`}>
      <button className="chat-trigger" onClick={() => setOpen(!open)}><MessageSquare size={24} /></button>
      {open && (
        <div className="chat-window card">
          <div className="chat-header">AI Analyst <button onClick={() => setOpen(false)}>×</button></div>
          <div className="chat-messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}><div className="message-bubble">{m.content}</div></div>)}</div>
          <form className="chat-input" onSubmit={handleSubmit}><input type="text" value={input} onChange={(e) => setInput(e.target.value)} /><button type="submit">전송</button></form>
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('Render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#2D3748' }}>데이터 처리 오류</div>
          <div style={{ fontSize: '13px', color: '#718096', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message || 'CSV 형식이 올바르지 않습니다. 파일을 확인 후 다시 업로드해 주세요.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '8px', padding: '8px 20px', background: '#4F6EF7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          >
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const AppWithBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

export default AppWithBoundary
