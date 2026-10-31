import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Building2,
  Network,
  Terminal,
  FileText,
  Mail,
  Copy,
  Check,
  RefreshCw,
  Upload,
  Layers,
  Activity,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  DollarSign,
  ArrowRight
} from 'lucide-react'
import { RadarView } from './components/RadarView'
import { MandateDrawer } from './components/MandateDrawer'
import { GraphCanvas, type GraphNode, type GraphEdge } from './components/GraphCanvas'

export interface Mandate {
  id: string
  merchant_id: string
  merchant_name: string
  category: string
  parent_id: string
  parent_name: string
  descriptor: string
  is_recognized: boolean
  cadence: string
  latest_amount: number
  initial_amount?: number
  annual_committed_cost: number
  charge_count: number
  first_seen: string
  last_charged: string
  mechanism: string
  mechanism_name: string
  flag: 'HEALTHY' | 'PRICE_HIKE' | 'TRIAL_CONVERTED' | 'UNUSED_ZOMBIE'
  flag_reason: string
  confidence_score: number
  savings_if_cancelled: number
  pitfall: string
  support_email?: string
  grievance_email?: string
  official_website?: string
  cancellation_steps: string[]
  history: Array<{ id: string; date: string; amount: number; descriptor: string }>
  recent_notifications?: Array<{ id: string; text: string; channel: string; timestamp: string }>
}

interface HeroMetrics {
  annual_committed_total: number
  monthly_equivalent: number
  potential_savings: number
  total_mandates_found: number
  flagged_issues_count: number
}

// Brand Avatar Helper with clean initial & color
const getBrandVisual = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('youtube')) return { icon: '▶', bg: 'bg-red-500/15 text-red-400 border-red-500/30' }
  if (n.includes('spotify')) return { icon: '♫', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
  if (n.includes('netflix')) return { icon: 'N', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
  if (n.includes('amazon') || n.includes('prime')) return { icon: 'A', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
  if (n.includes('hotstar') || n.includes('disney')) return { icon: 'D+', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
  if (n.includes('cult')) return { icon: '⚡', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' }
  if (n.includes('chatgpt') || n.includes('openai')) return { icon: '✦', bg: 'bg-teal-500/15 text-teal-400 border-teal-500/30' }
  if (n.includes('canva')) return { icon: 'C', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' }
  if (n.includes('truecaller')) return { icon: 'T', bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' }
  return { icon: name.charAt(0).toUpperCase(), bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30' }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'graph' | 'benchmark' | 'upload'>('radar')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [heroMetrics, setHeroMetrics] = useState<HeroMetrics>({
    annual_committed_total: 0,
    monthly_equivalent: 0,
    potential_savings: 0,
    total_mandates_found: 0,
    flagged_issues_count: 0
  })
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())
  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PRICE_HIKE' | 'TRIAL_CONVERTED' | 'UNUSED_ZOMBIE' | 'HEALTHY'>('ALL')

  // Notification stream
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Neo4j Graph state
  const [graphMode, setGraphMode] = useState<string>('portfolio')
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[]; stats: any }>({
    nodes: [],
    edges: [],
    stats: {}
  })
  const [cypherQuery, setCypherQuery] = useState(
    'MATCH (p:Parent)<-[:OWNED_BY]-(m:Merchant)<-[:FOR]-(mand:Mandate)\nRETURN p.name AS Parent, collect(m.name) AS ActiveMerchants, sum(mand.annual_cost) AS AnnualCommittedSpend;'
  )
  const [cypherResult, setCypherResult] = useState<any>(null)
  const [cypherLoading, setCypherLoading] = useState(false)
  const [cypherSeedScript, setCypherSeedScript] = useState<string>('')
  const [showSeedModal, setShowSeedModal] = useState(false)
  const [showNeo4jModal, setShowNeo4jModal] = useState(false)
  const [neo4jUri, setNeo4jUri] = useState('neo4j+s://your-instance.databases.neo4j.io')
  const [neo4jUser, setNeo4jUser] = useState('neo4j')
  const [neo4jPass, setNeo4jPass] = useState('')
  const [neo4jStatus, setNeo4jStatus] = useState<'EMBEDDED' | 'CONNECTED' | 'ERROR'>('EMBEDDED')
  const [neo4jMsg, setNeo4jMsg] = useState('')

  // Email Generator state
  const [emailTone, setEmailTone] = useState<'polite' | 'formal' | 'firm_dispute'>('formal')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailCopied, setEmailCopied] = useState(false)

  // Benchmark state
  const [benchmarkData, setBenchmarkData] = useState<any>(null)

  // CSV Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
    fetchGraphData('portfolio')
    fetchBenchmark()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: 'Arun Sharma' })
      })
      const data = await res.json()
      setMandates(data.mandates || [])
      setHeroMetrics(data.hero_metrics || {
        annual_committed_total: 0,
        monthly_equivalent: 0,
        potential_savings: 0,
        total_mandates_found: 0,
        flagged_issues_count: 0
      })

      const notifRes = await fetch('/api/statement/synthetic')
      const notifData = await notifRes.json()
      setNotifications(notifData.notifications || [])
    } catch (err) {
      console.error('Failed to load analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGraphData = async (mode: string = graphMode) => {
    setGraphMode(mode)
    try {
      const res = await fetch(`/api/graph?mode=${mode}`)
      const data = await res.json()
      setGraphData(data)
    } catch (err) {
      console.error('Failed to fetch graph data:', err)
    }
  }

  const fetchBenchmark = async () => {
    try {
      const res = await fetch('/api/benchmark')
      const data = await res.json()
      setBenchmarkData(data)
    } catch (err) {
      console.error('Failed to fetch benchmark:', err)
    }
  }

  const runCypher = async (queryToRun?: string) => {
    const q = queryToRun || cypherQuery
    setCypherLoading(true)
    try {
      const res = await fetch('/api/graph/cypher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })
      const data = await res.json()
      setCypherResult(data)
    } catch (err) {
      setCypherResult({ error: String(err) })
    } finally {
      setCypherLoading(false)
    }
  }

  const fetchCypherSeed = async () => {
    try {
      const res = await fetch('/api/graph/seed')
      const data = await res.json()
      setCypherSeedScript(data.script || '')
      setShowSeedModal(true)
    } catch (err) {
      console.error('Failed to fetch seed script:', err)
    }
  }

  const handleConnectNeo4j = async (e: React.FormEvent) => {
    e.preventDefault()
    setNeo4jMsg('Connecting to Neo4j instance...')
    try {
      const res = await fetch('/api/neo4j/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: neo4jUri, user: neo4jUser, password: neo4jPass })
      })
      const data = await res.json()
      if (data.success) {
        setNeo4jStatus('CONNECTED')
        setNeo4jMsg('Successfully connected to live Neo4j Aura cluster.')
        fetchGraphData('portfolio')
      } else {
        setNeo4jStatus('ERROR')
        setNeo4jMsg(data.message || 'Connection failed.')
      }
    } catch (err) {
      setNeo4jStatus('ERROR')
      setNeo4jMsg(String(err))
    }
  }

  const generateEmail = async (mandate: Mandate, tone: 'polite' | 'formal' | 'firm_dispute') => {
    setEmailTone(tone)
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandate_id: mandate.id,
          merchant_name: mandate.merchant_name,
          descriptor: mandate.descriptor,
          amount: mandate.latest_amount,
          cadence: mandate.cadence,
          mechanism: mandate.mechanism,
          user_name: 'Arun Sharma',
          account_ref: 'HDFC Card ending 4821 / UPI VPA',
          tone: tone
        })
      })
      const data = await res.json()
      setEmailSubject(data.subject)
      setEmailBody(data.body)
    } catch (err) {
      console.error('Failed to generate notice:', err)
    }
  }

  const toggleCancel = (id: string) => {
    setCancelledIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const cancelAllFlagged = () => {
    const flaggedIds = mandates.filter(m => m.flag !== 'HEALTHY').map(m => m.id)
    setCancelledIds(new Set(flaggedIds))
  }

  const savedAmount = mandates
    .filter(m => cancelledIds.has(m.id))
    .reduce((sum, m) => sum + m.annual_committed_cost, 0)

  const activeCommitted = Math.max(0, heroMetrics.annual_committed_total - savedAmount)
  const savingsPct = heroMetrics.annual_committed_total > 0
    ? Math.round((savedAmount / heroMetrics.annual_committed_total) * 100)
    : 0

  const filteredMandates = mandates.filter(m => {
    if (activeFilter === 'ALL') return true
    return m.flag === activeFilter
  })

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return

    setUploadLoading(true)
    setUploadError(null)
    setUploadSuccess(null)

    const formData = new FormData()
    formData.append('file', uploadFile)

    try {
      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed.')
      }

      setMandates(data.mandates || [])
      setHeroMetrics(data.hero_metrics || heroMetrics)
      setCancelledIds(new Set())
      setUploadSuccess(`Successfully ingested ${data.rows_parsed} statement rows from ${data.filename}`)
      setActiveTab('radar')
      fetchGraphData('portfolio')
    } catch (err: any) {
      setUploadError(err.message || 'Error parsing statement file.')
    } finally {
      setUploadLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col antialiased selection:bg-cyan-900 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#0c101a]/85 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Product Identity */}
          <div className="mr flex items-center gap-3">
            <div className="logo"><span className="sweep" aria-hidden="true" />Mandate Radar</div>
            <span className="hidden sm:inline text-xs text-slate-400">Find the auto-debits you forgot about</span>
          </div>

          {/* Understated Segmented Navigation */}
          <nav className="flex items-center bg-[#111726] p-1 rounded-xl border border-white/[0.08] text-xs shadow-inner">
            <button
              onClick={() => setActiveTab('radar')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'radar'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Portfolio Radar
            </button>
            <button
              onClick={() => {
                setActiveTab('graph')
                if (!cypherResult) runCypher()
              }}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'graph'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph Explorer
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'benchmark'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Verification Report
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Ingest Statement
            </button>
          </nav>

          {/* Controls & Status Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative px-3 py-1.5 rounded-xl bg-[#111726] hover:bg-[#182136] border border-white/[0.08] text-neutral-300 hover:text-white text-xs flex items-center gap-1.5 transition font-mono"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">RBI Alerts</span>
              {notifications.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-1 right-1 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setShowNeo4jModal(true)}
              className="text-xs px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#111726] text-neutral-300 hover:bg-[#182136] flex items-center gap-1.5 font-mono transition"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  neo4jStatus === 'CONNECTED' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-cyan-400'
                }`}
              />
              {neo4jStatus === 'CONNECTED' ? 'Neo4j Aura Live' : 'Embedded Engine'}
            </button>
          </div>
        </div>
      </header>

      {/* RBI Notification Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-[#0d121e] h-full border-l border-white/[0.08] p-6 flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-bold text-white text-sm">RBI 24h Pre-Debit Notices</h3>
                <p className="text-[11px] text-neutral-400 font-mono">Statutory notification correlation log</p>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-neutral-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-[#131929] border border-white/[0.06] text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                      {n.channel} · {n.sender}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">{n.timestamp}</span>
                  </div>
                  <p className="text-neutral-200 text-xs leading-relaxed font-sans">{n.text}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[11px] font-mono">
                    <span className="text-neutral-400">Resolved Entity:</span>
                    <span className="text-white font-semibold">{n.merchant_resolved}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-7">
        {/* TAB 1: PORTFOLIO RADAR */}
        {activeTab === 'radar' && (
          <RadarView
            mandates={mandates}
            total={heroMetrics.annual_committed_total}
            cancelled={cancelledIds}
            loading={loading}
            onToggle={toggleCancel}
            onCancelFlagged={cancelAllFlagged}
            onClear={() => setCancelledIds(new Set())}
            onOpen={m => { setSelectedMandate(m); generateEmail(m, 'formal') }}
          />
        )}

        {/* TAB 2: GRAPH & CYPHER TERMINAL */}
        {activeTab === 'graph' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Network className="w-5 h-5 text-cyan-400" />
                  Neo4j Knowledge Graph & Cypher Topology
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Structured multi-subscription parent footprint traversals and rail routing in Cypher.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCypherSeed}
                  className="px-3.5 py-2 rounded-xl bg-[#111726] hover:bg-[#182136] border border-white/[0.08] text-xs font-mono text-neutral-200 transition flex items-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>View Cypher Seed (.cql)</span>
                </button>
                <button
                  onClick={() => setShowNeo4jModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-950"
                >
                  <span>Neo4j Aura Config</span>
                </button>
              </div>
            </div>

            {/* Interactive Concentric Network Canvas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono px-1">
                <span>Concentric Force Orbit (Click node to inspect properties. Switch cluster views above)</span>
                <span className="text-cyan-400 font-bold">
                  {graphData.stats.total_nodes || 0} Nodes · {graphData.stats.total_edges || 0} Relationships
                </span>
              </div>
              <GraphCanvas
                nodes={graphData.nodes || []}
                edges={graphData.edges || []}
                currentMode={graphMode}
                onModeChange={m => fetchGraphData(m)}
              />
            </div>

            {/* Live Cypher Terminal Console */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d121e] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-neutral-200">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>CYPHER QUERY WORKBENCH</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  Target: {neo4jStatus === 'CONNECTED' ? 'Neo4j Aura Live' : 'Embedded High-Fidelity Graph Engine'}
                </span>
              </div>

              {/* Preset 1-Click Cypher Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-neutral-400 font-medium mr-1">Presets:</span>
                <button
                  onClick={() => {
                    const q =
                      'MATCH (p:Parent)<-[:OWNED_BY]-(m:Merchant)<-[:FOR]-(mand:Mandate)\nRETURN p.name AS Parent, collect(m.name) AS ActiveMerchants, sum(mand.annual_cost) AS AnnualCommittedSpend;'
                    setCypherQuery(q)
                    runCypher(q)
                  }}
                  className="px-3 py-1 rounded-lg bg-[#131929] hover:bg-[#1a2238] border border-white/[0.08] text-[11px] font-mono text-indigo-300 transition"
                >
                  Parent Footprint Traversal
                </button>
                <button
                  onClick={() => {
                    const q =
                      'MATCH (mand:Mandate)-[:VIA_MECHANISM]->(mech:Mechanism)-[:CANCELLED_BY]->(c:CancellationPath)\nRETURN mand.id, mech.name, c.primary_step;'
                    setCypherQuery(q)
                    runCypher(q)
                  }}
                  className="px-3 py-1 rounded-lg bg-[#131929] hover:bg-[#1a2238] border border-white/[0.08] text-[11px] font-mono text-pink-300 transition"
                >
                  Mechanism Cancellation Routing
                </button>
                <button
                  onClick={() => {
                    const q =
                      "MATCH (mand:Mandate)-[:FOR]->(m:Merchant)\nWHERE mand.flag <> 'HEALTHY'\nRETURN m.name, mand.flag, mand.flag_reason;"
                    setCypherQuery(q)
                    runCypher(q)
                  }}
                  className="px-3 py-1 rounded-lg bg-[#131929] hover:bg-[#1a2238] border border-white/[0.08] text-[11px] font-mono text-amber-300 transition"
                >
                  Anomaly Risk Filter Pattern
                </button>
              </div>

              {/* Code Editor Box */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={cypherQuery}
                  onChange={e => setCypherQuery(e.target.value)}
                  className="w-full bg-[#080b12] border border-white/[0.08] rounded-xl p-3.5 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 selection:bg-cyan-900"
                  placeholder="Enter Cypher statement..."
                />
                <button
                  onClick={() => runCypher()}
                  disabled={cypherLoading}
                  className="absolute bottom-3 right-3 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold transition flex items-center gap-1.5 shadow"
                >
                  {cypherLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                  <span>Execute</span>
                </button>
              </div>

              {/* Cypher Result Ledger */}
              {cypherResult && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>
                      Mode: {cypherResult.mode} · Records: {cypherResult.count || 0}
                    </span>
                    {cypherResult.error && (
                      <span className="text-rose-400">{cypherResult.error}</span>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-xl bg-[#080b12] border border-white/[0.06] p-3 font-mono text-xs text-neutral-300">
                    {Array.isArray(cypherResult.data) && cypherResult.data.length > 0 ? (
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-white/[0.08] text-neutral-500">
                            {Object.keys(cypherResult.data[0]).map(k => (
                              <th key={k} className="p-2">
                                {k}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cypherResult.data.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              {Object.values(row).map((val: any, j: number) => (
                                <td key={j} className="p-2 text-neutral-300">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <pre className="text-neutral-500">
                        {JSON.stringify(cypherResult.data || cypherResult, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: VERIFICATION & BENCHMARK REPORT */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Deterministic Verification & Ground Truth Audit Report
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Mathematical evaluation against planted test events and rejection of hard negatives.
              </p>
            </div>

            {benchmarkData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="p-5 rounded-2xl bg-[#0d121e] border border-white/[0.08] space-y-1 shadow-lg">
                  <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block font-semibold">
                    Planted Mandates Recall
                  </span>
                  <div className="text-3xl font-black text-white font-mono">
                    {benchmarkData.ground_truth_summary.mandates_recall_pct}%
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">
                    {benchmarkData.ground_truth_summary.detected_mandates} of{' '}
                    {benchmarkData.ground_truth_summary.planted_mandates} identified
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d121e] border border-white/[0.08] space-y-1 shadow-lg">
                  <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block font-semibold">
                    Price Creep Verification
                  </span>
                  <div className="text-3xl font-black text-amber-400 font-mono">
                    {benchmarkData.ground_truth_summary.price_hikes.detected} /{' '}
                    {benchmarkData.ground_truth_summary.price_hikes.planted}
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">Step increase (+15.5%) detected</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d121e] border border-white/[0.08] space-y-1 shadow-lg">
                  <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block font-semibold">
                    Trial Trap Escalation
                  </span>
                  <div className="text-3xl font-black text-rose-400 font-mono">
                    {benchmarkData.ground_truth_summary.trial_conversions.detected} /{' '}
                    {benchmarkData.ground_truth_summary.trial_conversions.planted}
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">₹2 to ₹119 jump caught</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d121e] border border-white/[0.08] space-y-1 shadow-lg">
                  <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block font-semibold">
                    Hard Negatives False Alarms
                  </span>
                  <div className="text-3xl font-black text-emerald-400 font-mono">
                    {benchmarkData.ground_truth_summary.hard_negatives_eliminated.false_positive_rate * 100}%
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">0 false positive triggers</span>
                </div>
              </div>
            )}

            {/* Hard Negatives Rejection Table */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d121e] p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-base text-white">
                Reconciliation of Planted Hard Negatives (Exclusion Rationale)
              </h3>
              <p className="text-xs text-neutral-400">
                Evaluating the deterministic rules that protect non-mandate discretionary transactions from false alerts:
              </p>

              <div className="space-y-3 pt-1">
                <div className="p-4 rounded-xl bg-[#080b12] border border-white/[0.06] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-200">
                      Weekly Quick Groceries (Zepto Consumer Delivery)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      Excluded from Mandates
                    </span>
                  </div>
                  <p className="text-neutral-400 text-xs font-sans leading-relaxed">
                    <strong>Rule Applied:</strong> Cadence analysis revealed 5–7 day interval clusters with a
                    median delta of 6.5 days and amount variations above 35%. Safely categorized as grocery
                    basket orders rather than recurring commitments.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#080b12] border border-white/[0.06] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-200">
                      Fluctuating Utility Metering (BESCOM Bangalore)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      Excluded from Mandates
                    </span>
                  </div>
                  <p className="text-neutral-400 text-xs font-sans leading-relaxed">
                    <strong>Rule Applied:</strong> Monthly recurrence detected on the 14th, but variance across
                    cycles exceeded 3% multiple times (₹1,240 to ₹2,100). Correctly excluded as variable usage-based bill.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#080b12] border border-white/[0.06] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-200">
                      Discretionary Food Delivery (Swiggy Food)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      Excluded from Mandates
                    </span>
                  </div>
                  <p className="text-neutral-400 text-xs font-sans leading-relaxed">
                    <strong>Rule Applied:</strong> Highly irregular intervals (1 to 5 days) without cadence stability. Rejected as discretionary spend.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#080b12] border border-white/[0.06] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-200">
                      Genuine Unrecognised Mandate (ACME Cloud Recurring Bill)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800">
                      Identified Without Guessing
                    </span>
                  </div>
                  <p className="text-neutral-400 text-xs font-sans leading-relaxed">
                    <strong>Rule Applied:</strong> Strict monthly interval (30 days) and exact ₹450 amount. Because the descriptor was unmapped in the graph, it was categorized as "Unrecognised Merchant" without hallucination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INGEST STATEMENT CSV */}
        {activeTab === 'upload' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Ingest Statement CSV
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Parses raw statement files with automatic column resolution (Date, Descriptor, Debit/Amount, Reference).
              </p>
            </div>

            <form
              onSubmit={handleFileUpload}
              className="p-8 rounded-3xl border border-white/[0.08] bg-[#0d121e] space-y-6 shadow-2xl"
            >
              <div className="border-2 border-dashed border-white/[0.12] hover:border-cyan-500/50 rounded-2xl p-8 text-center space-y-3 cursor-pointer transition bg-[#080b12]">
                <Upload className="w-10 h-10 text-cyan-400 mx-auto" />
                <div>
                  <label htmlFor="csv-input" className="cursor-pointer text-sm font-semibold text-white block">
                    {uploadFile ? uploadFile.name : 'Select or drop statement CSV file'}
                  </label>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">
                    Requires Date, Narration/Description, and Debit Amount columns
                  </p>
                </div>
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                  {uploadSuccess}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={fetchInitialData}
                  className="text-xs text-neutral-400 hover:text-white font-mono"
                >
                  Reload Default Synthetic Dataset
                </button>

                <button
                  type="submit"
                  disabled={!uploadFile || uploadLoading}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 text-white font-bold text-xs transition shadow-lg shadow-indigo-950"
                >
                  {uploadLoading ? 'Parsing...' : 'Analyze Statement'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* REVOCATION DOSSIER & LEGAL NOTICE DRAWER */}
      {selectedMandate && (
        <MandateDrawer
          mandate={selectedMandate}
          tone={emailTone}
          subject={emailSubject}
          body={emailBody}
          onTone={t => generateEmail(selectedMandate, t)}
          onClose={() => setSelectedMandate(null)}
        />
      )}

      {/* CYPHER SEED SCRIPT MODAL */}
      {showSeedModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-[#0d121e] border border-white/[0.1] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">
                  Neo4j DDL & Seed Script (Cypher)
                </h3>
              </div>
              <button
                onClick={() => setShowSeedModal(false)}
                className="text-neutral-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[#080b12] border border-white/[0.08] font-mono text-[11px] text-cyan-300 max-h-72 overflow-y-auto">
              {cypherSeedScript}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => {
                  const blob = new Blob([cypherSeedScript], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'mandate_radar_neo4j_seed.cql'
                  a.click()
                }}
                className="py-2 px-3.5 rounded-xl bg-[#131929] border border-white/[0.08] hover:bg-[#1a2238] text-neutral-300"
              >
                Download .cql
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cypherSeedScript)
                  alert('Cypher Seed copied.')
                }}
                className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-sans font-bold shadow"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEO4J AURA CONFIG MODAL */}
      {showNeo4jModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#0d121e] border border-white/[0.1] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-bold text-white text-sm">Neo4j Cluster Connection</h3>
              <button
                onClick={() => setShowNeo4jModal(false)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectNeo4j} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-300 block mb-1 font-mono text-[11px]">Bolt URI</label>
                <input
                  type="text"
                  value={neo4jUri}
                  onChange={e => setNeo4jUri(e.target.value)}
                  placeholder="neo4j+s://..."
                  className="w-full bg-[#080b12] border border-white/[0.08] rounded-xl p-2.5 font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-neutral-300 block mb-1 font-mono text-[11px]">Username</label>
                <input
                  type="text"
                  value={neo4jUser}
                  onChange={e => setNeo4jUser(e.target.value)}
                  placeholder="neo4j"
                  className="w-full bg-[#080b12] border border-white/[0.08] rounded-xl p-2.5 font-mono text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-neutral-300 block mb-1 font-mono text-[11px]">Password</label>
                <input
                  type="password"
                  value={neo4jPass}
                  onChange={e => setNeo4jPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080b12] border border-white/[0.08] rounded-xl p-2.5 font-mono text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {neo4jMsg && (
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/[0.06] text-[11px] font-mono text-neutral-300">
                  {neo4jMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => setShowNeo4jModal(false)}
                  className="py-2 px-3.5 rounded-xl bg-[#131929] text-neutral-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold"
                >
                  Test & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
