'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Tab = 'overview' | 'agenda' | 'sessions' | 'clients' | 'profile' | 'payments' | 'site' | 'content'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin')
  }, [status, router])

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Carregando...</div>

  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
  const sidebar = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
  const card = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'

  return (
    <div className={`min-h-screen flex ${bg}`}>
      {/* Sidebar */}
      <aside className={`w-56 flex-shrink-0 ${sidebar} border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-bold">A</div>
            <div>
              <p className="text-sm font-semibold">Admin</p>
              <p className="text-xs text-gray-500">Painel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: 'overview', label: 'Visão Geral', icon: '📊' },
            { id: 'agenda', label: 'Agenda', icon: '📅' },
            { id: 'sessions', label: 'Sessões', icon: '🗓️' },
            { id: 'clients', label: 'Clientes', icon: '👥' },
            { id: 'profile', label: 'Perfil', icon: '👤' },
            { id: 'payments', label: 'Pagamentos', icon: '💳' },
            { id: 'site', label: 'Config. Site', icon: '⚙️' },
            { id: 'content', label: 'Conteúdo', icon: '📝' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as Tab)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === item.id
                  ? 'bg-green-700 text-white'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/admin' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50"
          >
            🚪 Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        {tab === 'overview' && <OverviewTab card={card} darkMode={darkMode} />}
        {tab === 'agenda' && <AgendaTab card={card} darkMode={darkMode} />}
        {tab === 'sessions' && <SessionsTab card={card} darkMode={darkMode} />}
        {tab === 'clients' && <ClientsTab card={card} darkMode={darkMode} />}
        {tab === 'profile' && <ProfileTab card={card} darkMode={darkMode} />}
        {tab === 'payments' && <PaymentsTab card={card} darkMode={darkMode} />}
        {tab === 'site' && <SiteTab card={card} darkMode={darkMode} />}
        {tab === 'content' && <ContentTab card={card} darkMode={darkMode} />}
      </main>
    </div>
  )
}

/* ---- OVERVIEW ---- */
function OverviewTab({ card, darkMode }: any) {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/bookings').then(r => r.json()).then(data => {
      const bookings = Array.isArray(data) ? data : []
      const confirmed = bookings.filter((b: any) => b.status === 'CONFIRMED').length
      const pending = bookings.filter((b: any) => b.status === 'PENDING_PAYMENT').length
      const revenue = bookings.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'MANUAL')
        .reduce((sum: number, b: any) => sum + (b.value ?? 150), 0)
      setStats({ total: bookings.length, confirmed, pending, revenue })
    }).catch(() => setStats({ total: 0, confirmed: 0, pending: 0, revenue: 0 }))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Visão Geral</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de Sessões', value: stats?.total ?? '...', color: 'bg-blue-500' },
          { label: 'Confirmadas', value: stats?.confirmed ?? '...', color: 'bg-green-500' },
          { label: 'Aguardando', value: stats?.pending ?? '...', color: 'bg-yellow-500' },
          { label: 'Receita', value: stats ? `R$ ${stats.revenue}` : '...', color: 'bg-purple-500' },
        ].map(s => (
          <div key={s.label} className={`${card} border rounded-xl p-4`}>
            <div className={`w-3 h-3 rounded-full ${s.color} mb-2`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className={`${card} border rounded-xl p-4`}>
        <p className="text-sm text-gray-500">Sistema funcionando normalmente. Use o menu lateral para navegar.</p>
      </div>
    </div>
  )
}

/* ---- AGENDA ---- */
function AgendaTab({ card, darkMode }: any) {
  const [settings, setSettings] = useState({ startHour: 8, endHour: 18, intervalMin: 60, workDays: '1,2,3,4,5', daysAhead: 30 })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/slots-generate').then(r => r.json()).then(d => {
      if (d.startHour !== undefined) setSettings(s => ({ ...s, ...d }))
    }).catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true)
    setMsg('')
    try {
      const r = await fetch('/api/admin/slots-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const d = await r.json()
      setMsg(`✅ ${d.created} horários criados com sucesso!`)
    } catch {
      setMsg('❌ Erro ao gerar horários.')
    }
    setLoading(false)
  }

  const days = [
    { v: 0, l: 'Dom' }, { v: 1, l: 'Seg' }, { v: 2, l: 'Ter' },
    { v: 3, l: 'Qua' }, { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }, { v: 6, l: 'Sáb' }
  ]

  const toggleDay = (d: number) => {
    const arr = settings.workDays.split(',').map(Number)
    const idx = arr.indexOf(d)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(d)
    setSettings(s => ({ ...s, workDays: arr.sort().join(',') }))
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const intervals = [30, 60, 90, 120]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurar Agenda</h1>
      <div className={`${card} border rounded-xl p-6 space-y-6`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Horário Inicial</label>
            <select
              value={settings.startHour}
              onChange={e => setSettings(s => ({ ...s, startHour: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            >
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Horário Final</label>
            <select
              value={settings.endHour}
              onChange={e => setSettings(s => ({ ...s, endHour: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            >
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Duração de cada sessão</label>
          <select
            value={settings.intervalMin}
            onChange={e => setSettings(s => ({ ...s, intervalMin: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
          >
            {intervals.map(i => <option key={i} value={i}>{i} minutos</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Dias de trabalho</label>
          <div className="flex gap-2">
            {days.map(d => (
              <button
                key={d.v}
                onClick={() => toggleDay(d.v)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  settings.workDays.split(',').map(Number).includes(d.v)
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {d.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gerar quantos dias à frente</label>
          <input
            type="number"
            value={settings.daysAhead}
            onChange={e => setSettings(s => ({ ...s, daysAhead: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            min={1} max={90}
          />
        </div>

        {msg && <p className="text-sm font-medium">{msg}</p>}

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? 'Gerando...' : '🗓️ Gerar Horários Automaticamente'}
        </button>

        <p className="text-xs text-gray-400">
          Exemplo com 08:00 – 18:00, intervalos de 60min:<br />
          08:00 · 09:00 · 10:00 · 11:00 · 12:00 · 13:00 · 14:00 · 15:00 · 16:00 · 17:00
        </p>
      </div>
    </div>
  )
}

/* ---- SESSIONS ---- */
function SessionsTab({ card, darkMode }: any) {
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/bookings').then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const statusLabel: any = {
    CONFIRMED: { label: 'Confirmada', color: 'bg-green-100 text-green-700' },
    PENDING_PAYMENT: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700' },
    CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
    COMPLETED: { label: 'Concluída', color: 'bg-blue-100 text-blue-700' },
    MANUAL: { label: 'Manual', color: 'bg-purple-100 text-purple-700' },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sessões</h1>
      <div className={`${card} border rounded-xl overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Cliente</th>
              <th className="px-4 py-3 text-left font-semibold">Data/Hora</th>
              <th className="px-4 py-3 text-left font-semibold">Valor</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhuma sessão encontrada</td></tr>
            )}
            {bookings.map((b: any) => {
              const dt = b.slot?.startTime ? new Date(b.slot.startTime) : null
              const s = statusLabel[b.status] ?? { label: b.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.clientName}</p>
                    <p className="text-xs text-gray-400">{b.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    {dt ? dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-4 py-3">R$ {b.value ?? 150}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---- CLIENTS ---- */
function ClientsTab({ card, darkMode }: any) {
  const [clients, setClients] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', value: '150', observations: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    fetch('/api/admin/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value: Number(form.value) })
      })
      setMsg('✅ Cliente salvo!')
      setForm({ name: '', email: '', phone: '', date: '', time: '', value: '150', observations: '' })
      setShowForm(false)
      load()
    } catch {
      setMsg('❌ Erro ao salvar.')
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800"
        >
          + Adicionar Cliente
        </button>
      </div>

      {showForm && (
        <div className={`${card} border rounded-xl p-5 mb-6 space-y-4`}>
          <h2 className="font-semibold">Novo Cliente / Sessão Manual</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nome" value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} className="border border-gray-300 rounded-lg p-2 text-sm" />
            <input placeholder="Email" value={form.email} onChange={e => setForm(s => ({ ...s, email: e.target.value }))} className="border border-gray-300 rounded-lg p-2 text-sm" />
            <input placeholder="Telefone" value={form.phone} onChange={e => setForm(s => ({ ...s, phone: e.target.value }))} className="border border-gray-300 rounded-lg p-2 text-sm" />
            <input placeholder="Valor (R$)" value={form.value} onChange={e => setForm(s => ({ ...s, value: e.target.value }))} className="border border-gray-300 rounded-lg p-2 text-sm" type="number" />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data da sessão (opcional)</label>
              <input type="date" value={form.date} onChange={e => setForm(s => ({ ...s, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Horário (opcional)</label>
              <input type="time" value={form.time} onChange={e => setForm(s => ({ ...s, time: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
            </div>
          </div>
          <textarea placeholder="Observações" value={form.observations} onChange={e => setForm(s => ({ ...s, observations: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" rows={2} />
          {msg && <p className="text-sm">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className={`${card} border rounded-xl overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Cliente</th>
              <th className="px-4 py-3 text-left font-semibold">Telefone</th>
              <th className="px-4 py-3 text-left font-semibold">Sessões</th>
              <th className="px-4 py-3 text-left font-semibold">Última sessão</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum cliente ainda</td></tr>
            )}
            {clients.map((c: any) => {
              const lastBooking = c.bookings?.[0]
              const lastDt = lastBooking?.slot?.startTime ? new Date(lastBooking.slot.startTime) : null
              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">{c.phone || '-'}</td>
                  <td className="px-4 py-3 font-semibold">{c.bookings?.length ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {lastDt ? lastDt.toLocaleDateString('pt-BR') : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---- PROFILE ---- */
function ProfileTab({ card, darkMode }: any) {
  const [form, setForm] = useState({ name: 'Adriana Garibotti', description: 'Terapeuta', email: '', phone: '', photoUrl: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/profile').then(r => r.json()).then(d => { if (d.name) setForm(d) }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setMsg('✅ Perfil salvo!')
    } catch { setMsg('❌ Erro ao salvar.') }
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Perfil da Terapeuta</h1>
      <div className={`${card} border rounded-xl p-6 space-y-4`}>
        {form.photoUrl && <img src={form.photoUrl} alt="Foto" className="w-20 h-20 rounded-full object-cover" />}
        <div>
          <label className="block text-sm font-medium mb-1">URL da foto</label>
          <input value={form.photoUrl} onChange={e => setForm(s => ({ ...s, photoUrl: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição / Título</label>
          <input value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input value={form.email} onChange={e => setForm(s => ({ ...s, email: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefone / WhatsApp</label>
          <input value={form.phone} onChange={e => setForm(s => ({ ...s, phone: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>
        {msg && <p className="text-sm">{msg}</p>}
        <button onClick={save} disabled={saving} className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
          {saving ? 'Salvando...' : '💾 Salvar Perfil'}
        </button>
      </div>
    </div>
  )
}

/* ---- PAYMENTS ---- */
function PaymentsTab({ card, darkMode }: any) {
  const [form, setForm] = useState({
    mpEnabled: false, mpPublicKey: '', mpAccessToken: '', webhookUrl: '',
    stripeEnabled: false, stripePublicKey: '', stripeSecretKey: '',
    pixEnabled: false, pixKey: '', pixInstructions: ''
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d) setForm(s => ({ ...s, ...d })) }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setMsg('✅ Configurações salvas!')
    } catch { setMsg('❌ Erro ao salvar.') }
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurações de Pagamento</h1>
      <div className="space-y-4">

        {/* Mercado Pago */}
        <div className={`${card} border rounded-xl p-5 space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Mercado Pago</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors ${form.mpEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                onClick={() => setForm(s => ({ ...s, mpEnabled: !s.mpEnabled }))}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.mpEnabled ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm">{form.mpEnabled ? 'Ativo' : 'Inativo'}</span>
            </label>
          </div>
          {form.mpEnabled && (
            <>
              <input placeholder="Public Key (APP_USR-...)" value={form.mpPublicKey} onChange={e => setForm(s => ({ ...s, mpPublicKey: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
              <input placeholder="Access Token" value={form.mpAccessToken} onChange={e => setForm(s => ({ ...s, mpAccessToken: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" type="password" />
              <input placeholder="Webhook URL" value={form.webhookUrl} onChange={e => setForm(s => ({ ...s, webhookUrl: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
            </>
          )}
        </div>

        {/* PIX Manual */}
        <div className={`${card} border rounded-xl p-5 space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">PIX Manual</h2>
            <div className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${form.pixEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={() => setForm(s => ({ ...s, pixEnabled: !s.pixEnabled }))}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.pixEnabled ? 'translate-x-5' : ''}`} />
            </div>
          </div>
          {form.pixEnabled && (
            <>
              <input placeholder="Chave PIX" value={form.pixKey} onChange={e => setForm(s => ({ ...s, pixKey: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
              <textarea placeholder="Instruções de pagamento" value={form.pixInstructions} onChange={e => setForm(s => ({ ...s, pixInstructions: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" rows={2} />
            </>
          )}
        </div>

        {/* Stripe (futuro) */}
        <div className={`${card} border rounded-xl p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Stripe</h2>
              <p className="text-xs text-gray-400">Em breve</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Em breve</span>
          </div>
        </div>

        {msg && <p className="text-sm">{msg}</p>}
        <button onClick={save} disabled={saving} className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
          {saving ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}

/* ---- SITE ---- */
function SiteTab({ card, darkMode }: any) {
  const [form, setForm] = useState({
    pageTitle: 'Agende sua sessão',
    pageSubtitle: 'Escolha o horário ideal para você. O processo é simples, seguro e rápido.',
    footerText: '© 2024 Adriana Garibotti · Pagamentos seguros via Mercado Pago',
    sessionPrice: 150,
    sessionMinutes: 60,
    primaryColor: '#4a7c59',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/site').then(r => r.json()).then(d => { if (d) setForm(s => ({ ...s, ...d })) }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setMsg('✅ Configurações salvas!')
    } catch { setMsg('❌ Erro ao salvar.') }
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurações do Site</h1>
      <div className={`${card} border rounded-xl p-6 space-y-4`}>
        <div>
          <label className="block text-sm font-medium mb-1">Cor principal</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.primaryColor} onChange={e => setForm(s => ({ ...s, primaryColor: e.target.value }))} className="w-12 h-10 rounded cursor-pointer border border-gray-300" />
            <input value={form.primaryColor} onChange={e => setForm(s => ({ ...s, primaryColor: e.target.value }))} className="flex-1 border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Título da página</label>
          <input value={form.pageTitle} onChange={e => setForm(s => ({ ...s, pageTitle: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Subtítulo</label>
          <textarea value={form.pageSubtitle} onChange={e => setForm(s => ({ ...s, pageSubtitle: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Preço da sessão (R$)</label>
            <input type="number" value={form.sessionPrice} onChange={e => setForm(s => ({ ...s, sessionPrice: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duração (minutos)</label>
            <input type="number" value={form.sessionMinutes} onChange={e => setForm(s => ({ ...s, sessionMinutes: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Texto do rodapé</label>
          <input value={form.footerText} onChange={e => setForm(s => ({ ...s, footerText: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>
        {msg && <p className="text-sm">{msg}</p>}
        <button onClick={save} disabled={saving} className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
          {saving ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}

/* ---- CONTENT ---- */
function ContentTab({ card, darkMode }: any) {
  const [form, setForm] = useState({ contentEnabled: false, contentText: '', contentVideo: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/site').then(r => r.json()).then(d => { if (d) setForm(s => ({ ...s, contentEnabled: d.contentEnabled, contentText: d.contentText, contentVideo: d.contentVideo })) }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setMsg('✅ Conteúdo salvo!')
    } catch { setMsg('❌ Erro ao salvar.') }
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Conteúdo da Página</h1>
      <div className={`${card} border rounded-xl p-6 space-y-4`}>
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${form.contentEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
            onClick={() => setForm(s => ({ ...s, contentEnabled: !s.contentEnabled }))}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.contentEnabled ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm font-medium">{form.contentEnabled ? 'Conteúdo ativado' : 'Conteúdo desativado'}</span>
        </div>

        {form.contentEnabled && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Texto explicativo</label>
              <textarea value={form.contentText} onChange={e => setForm(s => ({ ...s, contentText: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" rows={4} placeholder="Texto que aparece abaixo do calendário..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vídeo YouTube (URL embed)</label>
              <input value={form.contentVideo} onChange={e => setForm(s => ({ ...s, contentVideo: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="https://www.youtube.com/embed/..." />
              <p className="text-xs text-gray-400 mt-1">Use o link de incorporação do YouTube: youtube.com/embed/ID</p>
            </div>
          </>
        )}

        {msg && <p className="text-sm">{msg}</p>}
        <button onClick={save} disabled={saving} className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
          {saving ? 'Salvando...' : '💾 Salvar Conteúdo'}
        </button>
      </div>
    </div>
  )
}
