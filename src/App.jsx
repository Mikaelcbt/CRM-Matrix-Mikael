import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import * as db from './lib/db'
import {
  LayoutDashboard, Users, BarChart2, CheckSquare, Plus, Search,
  Phone, Mail, MapPin, Zap, Clock, AlertCircle, CheckCircle,
  XCircle, FileText, MessageSquare, Calendar, Trash2, Edit3, X,
  TrendingUp, Target, Menu, ChevronDown, ExternalLink, Link,
  Filter, ArrowRight, Eye, UserPlus, Activity, Award, Star,
  ChevronRight, ChevronLeft, Check, Circle, Bell, Hash,
  Briefcase, User, Tag, MoreVertical, ArrowUpRight, Inbox,
  Settings, Download, Upload, RefreshCw, Copy, Send, Flame,
  BellRing, Database, LogOut, Sparkles, DollarSign, CalendarClock
} from 'lucide-react'
import {
  format, isToday, isTomorrow, isPast, parseISO,
  startOfMonth, endOfMonth, isWithinInterval, subMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────

const STAGES = [
  { id: 'novo_contato',      label: 'Novo Contato',              color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  short: 'Novo' },
  { id: 'primeiro_contato',  label: 'Primeiro Contato Feito',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', short: '1º Contato' },
  { id: 'aguardando_conta',  label: 'Aguardando Conta de Luz',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', short: 'Aguardando' },
  { id: 'conta_recebida',    label: 'Conta Recebida',            color: '#F97316', bg: 'rgba(249,115,22,0.12)', short: 'Conta OK' },
  { id: 'proposta_enviada',  label: 'Proposta Enviada',          color: '#FF4500', bg: 'rgba(255,69,0,0.12)',   short: 'Proposta' },
  { id: 'em_negociacao',     label: 'Em Análise / Negociação',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  short: 'Negociando' },
  { id: 'fechado_ganho',     label: 'Fechado (Ganho)',           color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  short: 'Ganho' },
  { id: 'fechado_perdido',   label: 'Fechado (Perdido)',         color: '#6B7280', bg: 'rgba(107,114,128,0.12)',short: 'Perdido' },
]

const MOTIVOS_PERDA = [
  'Sem interesse', 'Contrato com outra empresa', 'Consumo abaixo do mínimo',
  'Sem retorno', 'Preço não atrativo', 'Decisão adiada', 'Outro',
]

const DISTRIBUIDORAS = [
  'Neoenergia Coelba (BA)', 'Neoenergia Cosern (RN)', 'Neoenergia Pernambuco (PE)',
  'Neoenergia Elektro (SP/MS)', 'Enel São Paulo', 'Enel Rio de Janeiro',
  'Enel Ceará', 'CPFL Paulista', 'CPFL Piratininga', 'CPFL Santa Cruz',
  'RGE Sul (RS)', 'Energisa Mato Grosso', 'Energisa Mato Grosso do Sul',
  'Energisa Paraíba', 'Energisa Sergipe', 'Energisa Rondônia',
  'Energisa Tocantins', 'Cemig (MG)', 'Light (RJ)', 'Equatorial Maranhão',
  'Equatorial Piauí', 'Equatorial Pará', 'Equatorial Goiás', 'Equatorial Alagoas',
  'CEB (DF)', 'Celesc (SC)', 'COPEL (PR)', 'CEEE (RS)', 'EDP São Paulo',
  'EDP Espírito Santo', 'Roraima Energia', 'Outro',
]

const ORIGENS = [
  { id: 'indicacao', label: 'Indicação' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'abordagem', label: 'Abordagem Direta' },
  { id: 'evento',    label: 'Evento' },
]

const CANAIS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: '#25D366' },
  { id: 'ligacao',  label: 'Ligação',  icon: Phone,         color: '#3B82F6' },
  { id: 'email',    label: 'E-mail',   icon: Mail,          color: '#8B5CF6' },
  { id: 'instagram',label: 'Instagram',icon: Star,          color: '#E1306C' },
]

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const DEFAULT_CONFIG = {
  nomeConsultor: 'Consultor',
  metaLeadsMes: 20,
  metaContratosMes: 5,
  notificacoesAtivadas: false,
}

const waTemplates = (nome, consultor) => ({
  novo_contato:     `Olá ${nome}! 👋 Me chamo *${consultor}* e trabalho com a *Matrix Energia*. Tenho uma solução para *reduzir sua conta de luz sem nenhum custo* para você. Posso explicar como funciona? ⚡`,
  primeiro_contato: `Olá ${nome}! Aqui é o *${consultor}* da Matrix Energia 😊 Você teve chance de verificar sua conta de luz? Preciso dela para calcular o seu desconto exato!`,
  aguardando_conta: `Olá ${nome}! Lembrei de você! 📄 Assim que me enviar a conta de luz, consigo calcular *exatamente* quanto você vai economizar por mês!`,
  conta_recebida:   `Olá ${nome}! Já analisei sua conta e tenho *ótimas notícias*! 🎉 Seu perfil é perfeito para o Mercado Livre de Energia. Posso te enviar a proposta com o desconto?`,
  proposta_enviada: `Olá ${nome}! Enviei a proposta recentemente. Teve a oportunidade de ver? Estou à disposição para tirar qualquer dúvida! 🤝`,
  em_negociacao:    `Olá ${nome}! Quero garantir que todas as suas dúvidas sejam respondidas. O que falta para você se sentir confortável com a decisão? 😊`,
  fechado_ganho:    `Olá ${nome}! Parabéns pela excelente decisão! 🎉⚡ Vou acompanhar todo o processo de migração para garantir que tudo corra perfeitamente!`,
  fechado_perdido:  `Olá ${nome}! Caso mude de ideia sobre o desconto na conta de luz, estarei à disposição. Obrigado pelo seu tempo! 😊`,
})

// ─────────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────────

const d = (n) => new Date(Date.now() - n * 86400000).toISOString()
const df = (n) => new Date(Date.now() + n * 86400000).toISOString()

const INITIAL_LEADS = [
  { id: 'l1', nome: 'João Carlos Silva', telefone: '(71) 99876-5432', email: 'joao.silva@gmail.com', cidade: 'Salvador', uf: 'BA', distribuidora: 'Neoenergia Coelba (BA)', consumoMedio: 850, valorEstimado: 950, origem: 'indicacao', nomeIndicador: 'Pedro Alves', status: 'em_negociacao', motivoPerda: '', contaLuzRecebida: true, linkDocumento: 'https://drive.google.com/exemplo', criadoEm: d(18), atualizadoEm: d(2) },
  { id: 'l2', nome: 'Maria Fernanda Oliveira', telefone: '(11) 98765-4321', email: 'mf.oliveira@hotmail.com', cidade: 'São Paulo', uf: 'SP', distribuidora: 'Enel São Paulo', consumoMedio: 1200, valorEstimado: 1450, origem: 'instagram', nomeIndicador: '', status: 'proposta_enviada', motivoPerda: '', contaLuzRecebida: true, linkDocumento: '', criadoEm: d(12), atualizadoEm: d(1) },
  { id: 'l3', nome: 'Carlos Eduardo Santos', telefone: '(21) 97654-3210', email: 'carlos.santos@gmail.com', cidade: 'Rio de Janeiro', uf: 'RJ', distribuidora: 'Light (RJ)', consumoMedio: 720, valorEstimado: 900, origem: 'abordagem', nomeIndicador: '', status: 'fechado_ganho', motivoPerda: '', contaLuzRecebida: true, linkDocumento: 'https://drive.google.com/exemplo2', criadoEm: d(35), atualizadoEm: d(5) },
  { id: 'l4', nome: 'Ana Paula Costa', telefone: '(31) 96543-2109', email: 'ana.costa@empresa.com', cidade: 'Belo Horizonte', uf: 'MG', distribuidora: 'Cemig (MG)', consumoMedio: 1500, valorEstimado: 1800, origem: 'indicacao', nomeIndicador: 'Marcos Vieira', status: 'conta_recebida', motivoPerda: '', contaLuzRecebida: true, linkDocumento: '', criadoEm: d(8), atualizadoEm: d(0) },
  { id: 'l5', nome: 'Roberto Lima', telefone: '(85) 95432-1098', email: '', cidade: 'Fortaleza', uf: 'CE', distribuidora: 'Enel Ceará', consumoMedio: null, valorEstimado: null, origem: 'evento', nomeIndicador: '', status: 'novo_contato', motivoPerda: '', contaLuzRecebida: false, linkDocumento: '', criadoEm: d(1), atualizadoEm: d(0) },
  { id: 'l6', nome: 'Fernanda Souza', telefone: '(41) 94321-0987', email: 'fernanda.souza@gmail.com', cidade: 'Curitiba', uf: 'PR', distribuidora: 'COPEL (PR)', consumoMedio: 680, valorEstimado: null, origem: 'instagram', nomeIndicador: '', status: 'primeiro_contato', motivoPerda: '', contaLuzRecebida: false, linkDocumento: '', criadoEm: d(4), atualizadoEm: d(1) },
  { id: 'l7', nome: 'Paulo Henrique Mendes', telefone: '(81) 93210-9876', email: 'paulo.mendes@outlook.com', cidade: 'Recife', uf: 'PE', distribuidora: 'Neoenergia Pernambuco (PE)', consumoMedio: 930, valorEstimado: null, origem: 'indicacao', nomeIndicador: 'João Silva', status: 'aguardando_conta', motivoPerda: '', contaLuzRecebida: false, linkDocumento: '', criadoEm: d(6), atualizadoEm: d(2) },
  { id: 'l8', nome: 'Luciana Ferreira', telefone: '(51) 92109-8765', email: 'lu.ferreira@gmail.com', cidade: 'Porto Alegre', uf: 'RS', distribuidora: 'CEEE (RS)', consumoMedio: 450, valorEstimado: null, origem: 'abordagem', nomeIndicador: '', status: 'fechado_perdido', motivoPerda: 'Consumo abaixo do mínimo', contaLuzRecebida: true, linkDocumento: '', criadoEm: d(25), atualizadoEm: d(10) },
  { id: 'l9', nome: 'Marcos Alves', telefone: '(48) 91098-7654', email: 'marcos.alves@hotmail.com', cidade: 'Florianópolis', uf: 'SC', distribuidora: 'Celesc (SC)', consumoMedio: 1100, valorEstimado: null, origem: 'indicacao', nomeIndicador: 'Ana Costa', status: 'aguardando_conta', motivoPerda: '', contaLuzRecebida: false, linkDocumento: '', criadoEm: d(9), atualizadoEm: d(3) },
  { id: 'l10', nome: 'Juliana Reis', telefone: '(62) 90987-6543', email: 'ju.reis@empresa.com', cidade: 'Goiânia', uf: 'GO', distribuidora: 'Equatorial Goiás', consumoMedio: 800, valorEstimado: 1050, origem: 'instagram', nomeIndicador: '', status: 'em_negociacao', motivoPerda: '', contaLuzRecebida: true, linkDocumento: 'https://drive.google.com/exemplo3', criadoEm: d(14), atualizadoEm: d(1) },
  { id: 'l11', nome: 'Diego Carvalho', telefone: '(92) 99876-1234', email: 'diego.c@gmail.com', cidade: 'Manaus', uf: 'AM', distribuidora: 'Outro', consumoMedio: 2200, valorEstimado: 2800, origem: 'evento', nomeIndicador: '', status: 'primeiro_contato', motivoPerda: '', contaLuzRecebida: false, linkDocumento: '', criadoEm: d(3), atualizadoEm: d(0) },
  { id: 'l12', nome: 'Patricia Nunes', telefone: '(79) 98765-9876', email: 'patricia.n@outlook.com', cidade: 'Aracaju', uf: 'SE', distribuidora: 'Energisa Sergipe', consumoMedio: 760, valorEstimado: null, origem: 'indicacao', nomeIndicador: 'Roberto Lima', status: 'fechado_perdido', motivoPerda: 'Sem retorno', contaLuzRecebida: false, linkDocumento: '', criadoEm: d(20), atualizadoEm: d(8) },
]

const INITIAL_INTERACTIONS = [
  { id: 'i1', leadId: 'l1', data: d(17), canal: 'whatsapp', nota: 'Primeiro contato. Cliente interessado, vai procurar a conta de luz.' },
  { id: 'i2', leadId: 'l1', data: d(10), canal: 'ligacao',  nota: 'Ligação realizada. Enviou a conta por WhatsApp. Consumo médio de 850 kWh.' },
  { id: 'i3', leadId: 'l1', data: d(2),  canal: 'whatsapp', nota: 'Proposta enviada com projeção de 15% de desconto. Aguardando retorno.' },
  { id: 'i4', leadId: 'l2', data: d(11), canal: 'instagram', nota: 'Cliente mandou DM perguntando sobre o desconto. Passei o WhatsApp.' },
  { id: 'i5', leadId: 'l2', data: d(8),  canal: 'whatsapp', nota: 'Conta de luz recebida. Consumo de 1.200 kWh. Proposta de 18% de desconto preparada.' },
  { id: 'i6', leadId: 'l2', data: d(1),  canal: 'whatsapp', nota: 'Proposta enviada. Cliente vai analisar até sexta.' },
  { id: 'i7', leadId: 'l3', data: d(34), canal: 'whatsapp', nota: 'Abordagem direta no evento de networking. Deu o contato.' },
  { id: 'i8', leadId: 'l3', data: d(28), canal: 'ligacao',  nota: 'Apresentei a proposta por telefone. Muito receptivo.' },
  { id: 'i9', leadId: 'l3', data: d(5),  canal: 'whatsapp', nota: 'Contrato assinado! Cliente vai economizar R$180/mês.' },
  { id: 'i10', leadId: 'l4', data: d(7), canal: 'whatsapp', nota: 'Primeiro contato. Consumo alto — ótimo perfil. Pediu a conta de luz.' },
  { id: 'i11', leadId: 'l4', data: d(1), canal: 'whatsapp', nota: 'Conta recebida. Consumo de 1.500 kWh. Vou elaborar proposta.' },
  { id: 'i12', leadId: 'l6', data: d(3), canal: 'whatsapp', nota: 'Respondeu no Instagram. Encaminhei para WhatsApp. Explicou situação.' },
  { id: 'i13', leadId: 'l7', data: d(5), canal: 'whatsapp', nota: 'Indicado pelo João Silva. Ótimo perfil, 930 kWh. Pediu 3 dias para mandar a conta.' },
  { id: 'i14', leadId: 'l9', data: d(8), canal: 'ligacao',  nota: 'Ligação inicial. Muito interessado. Vai solicitar a conta ao proprietário.' },
  { id: 'i15', leadId: 'l10', data: d(13), canal: 'whatsapp', nota: 'Conta recebida. Proposta enviada com 14% de desconto.' },
  { id: 'i16', leadId: 'l10', data: d(1), canal: 'email',   nota: 'Follow-up por e-mail. Questionou sobre multa contratual.' },
]

const INITIAL_TASKS = [
  { id: 't1', leadId: 'l1', descricao: 'Ligar para confirmar proposta', dataVencimento: df(1), concluida: false, criadaEm: d(2) },
  { id: 't2', leadId: 'l2', descricao: 'Aguardar resposta até sexta e fazer follow-up', dataVencimento: df(2), concluida: false, criadaEm: d(1) },
  { id: 't3', leadId: 'l4', descricao: 'Elaborar e enviar proposta', dataVencimento: df(0), concluida: false, criadaEm: d(0) },
  { id: 't4', leadId: 'l5', descricao: 'Ligar para primeiro contato', dataVencimento: df(0), concluida: false, criadaEm: d(1) },
  { id: 't5', leadId: 'l6', descricao: 'Solicitar conta de luz por WhatsApp', dataVencimento: df(1), concluida: false, criadaEm: d(1) },
  { id: 't6', leadId: 'l7', descricao: 'Follow-up — cliente ia enviar conta hoje', dataVencimento: d(0), concluida: false, criadaEm: d(5) },
  { id: 't7', leadId: 'l9', descricao: 'Ligar para cobrar conta de luz', dataVencimento: d(1), concluida: false, criadaEm: d(3) },
  { id: 't8', leadId: 'l10', descricao: 'Responder dúvida sobre cláusula contratual', dataVencimento: df(0), concluida: false, criadaEm: d(1) },
  { id: 't9', leadId: 'l11', descricao: 'Enviar material explicativo sobre o mercado livre', dataVencimento: df(3), concluida: false, criadaEm: d(0) },
  { id: 't10', leadId: 'l3', descricao: 'Enviar contrato assinado para o setor', dataVencimento: d(4), concluida: true, criadaEm: d(5) },
]

// ─────────────────────────────────────────────────────────
// HOOKS & UTILITIES
// ─────────────────────────────────────────────────────────

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch { return initialValue }
  })
  const setValue = useCallback((value) => {
    setStoredValue(prev => {
      try {
        const v = typeof value === 'function' ? value(prev) : value
        window.localStorage.setItem(key, JSON.stringify(v))
        return v
      } catch (e) {
        console.error('localStorage write failed:', e)
        return prev
      }
    })
  }, [key])
  return [storedValue, setValue]
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const getLeadScore = (lead) => {
  let s = 0
  const idx = STAGES.findIndex(st => st.id === lead.status)
  s += Math.min(idx * 5, 30)
  if (lead.consumoMedio) {
    if (lead.consumoMedio >= 2000) s += 25
    else if (lead.consumoMedio >= 1000) s += 20
    else if (lead.consumoMedio >= 500) s += 12
    else s += 5
  }
  if (lead.contaLuzRecebida) s += 20
  if (lead.origem === 'indicacao') s += 15
  if (lead.nomeIndicador) s += 5
  if (lead.email) s += 5
  return Math.min(s, 100)
}

const scoreColor = (score) => {
  if (score >= 75) return '#22C55E'
  if (score >= 50) return '#FF4500'
  if (score >= 25) return '#F59E0B'
  return '#6B7280'
}

const exportCSV = (leads) => {
  const headers = ['Nome','Telefone','Email','Cidade','UF','Distribuidora','Consumo kWh','Valor Estimado R$/mês','Origem','Indicador','Etapa','Conta Recebida','Link Documento','Criado em','Atualizado em']
  const rows = leads.map(l => [
    l.nome, l.telefone, l.email, l.cidade, l.uf, l.distribuidora,
    l.consumoMedio ?? '', l.valorEstimado ?? '',
    ORIGENS.find(o => o.id === l.origem)?.label ?? l.origem,
    l.nomeIndicador, getStage(l.status).label, l.contaLuzRecebida ? 'Sim' : 'Não',
    l.linkDocumento, fmtDate(l.criadoEm), fmtDate(l.atualizadoEm),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `leads_matrix_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
  URL.revokeObjectURL(url)
}

const exportBackup = (leads, interactions, tasks) => {
  const json = JSON.stringify({ leads, interactions, tasks, exportedAt: new Date().toISOString() }, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `backup_matrix_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`; a.click()
  URL.revokeObjectURL(url)
}

const waLink = (telefone, message) => {
  const num = '55' + telefone.replace(/\D/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

const safeHref = (url) => {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? url : null
  } catch { return null }
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR }) } catch { return iso }
}

const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try { return format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR }) } catch { return iso }
}

const getStage = (id) => STAGES.find(s => s.id === id) || STAGES[0]

const getLastContact = (leadId, interactions) => {
  const list = interactions.filter(i => i.leadId === leadId)
  if (!list.length) return null
  return list.reduce((a, b) => new Date(a.data) > new Date(b.data) ? a : b).data
}

const daysSince = (iso) => {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso)) / 86400000)
}

const fmtValor = (v) => {
  if (v == null) return null
  return v >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k` : `R$ ${v.toLocaleString('pt-BR')}`
}

const taskUrgency = (task) => {
  if (task.concluida) return 'done'
  const d = parseISO(task.dataVencimento)
  if (isPast(d) && !isToday(d)) return 'overdue'
  if (isToday(d)) return 'today'
  if (isTomorrow(d)) return 'tomorrow'
  return 'future'
}

// ─────────────────────────────────────────────────────────
// ATOMIC COMPONENTS
// ─────────────────────────────────────────────────────────

function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', type = 'button', icon: Icon }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }
  const variants = {
    primary:  'bg-[#FF4500] hover:bg-[#FF6A35] text-white focus:ring-[#FF4500] shadow-lg shadow-[#FF4500]/20',
    secondary:'bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white border border-[#2A2A2A] hover:border-[#3A3A3A] focus:ring-[#2A2A2A]',
    ghost:    'hover:bg-[#1C1C1C] text-[#888] hover:text-white focus:ring-[#2A2A2A]',
    danger:   'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 focus:ring-red-500',
    success:  'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 focus:ring-green-500',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
      {children}
    </button>
  )
}

function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">{label}{required && <span className="text-[#FF4500] ml-1">*</span>}</label>}
      {children}
      {hint && <p className="text-xs text-[#555]">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/30 transition-colors'

function Input({ label, required, hint, ...props }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input {...props} className={`${inputCls} ${props.className || ''}`} />
    </Field>
  )
}

function Textarea({ label, required, hint, rows = 3, ...props }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <textarea {...props} rows={rows} className={`${inputCls} resize-none ${props.className || ''}`} />
    </Field>
  )
}

function Select({ label, required, hint, options, placeholder, ...props }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <select {...props} className={`${inputCls} ${props.className || ''}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.id} value={o.id}>{o.label}</option>
        )}
      </select>
    </Field>
  )
}

function StageBadge({ stageId, size = 'sm' }) {
  const s = getStage(stageId)
  const pad = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${pad}`} style={{ color: s.color, backgroundColor: s.bg }}>
      {size === 'xs' ? s.short : s.label}
    </span>
  )
}

function Avatar({ name, size = 'md' }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  const colors = ['#FF4500', '#6366F1', '#8B5CF6', '#F59E0B', '#22C55E', '#EF4444', '#3B82F6']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`} style={{ backgroundColor: color + '22', color }}>
      {initials}
    </div>
  )
}

function Modal({ isOpen, onClose, title, children, size = 'md', noPad = false }) {
  const ref = useRef()
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.() }
    const keyHandler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (isOpen) { document.addEventListener('mousedown', handler); document.addEventListener('keydown', keyHandler) }
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [isOpen, onClose])
  if (!isOpen) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-6xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div ref={ref} className={`w-full ${widths[size]} bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A] flex-shrink-0">
            <h2 className="font-semibold text-white text-base">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-[#888] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        <div className={`overflow-y-auto flex-1 ${noPad ? '' : 'p-6'}`}>{children}</div>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1C1C1C] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[#555]" />
      </div>
      <p className="font-medium text-white mb-1">{title}</p>
      {description && <p className="text-sm text-[#555] mb-4">{description}</p>}
      {action}
    </div>
  )
}

function Stat({ label, value, sub, color = '#FF4500' }) {
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 space-y-1">
      <p className="text-xs text-[#888] uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#555]">{sub}</p>}
    </div>
  )
}

function ScoreIndicator({ score, size = 'sm' }) {
  const color = scoreColor(score)
  if (size === 'xs') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color }}>
      <Flame size={10} />{score}
    </span>
  )
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((message, type = 'success') => {
    const id = uid()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])
  return {
    toasts,
    success: useCallback((m) => add(m, 'success'), [add]),
    error:   useCallback((m) => add(m, 'error'),   [add]),
    info:    useCallback((m) => add(m, 'info'),     [add]),
  }
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 z-[200] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl animate-slide-up ${
          t.type === 'success' ? 'bg-[#0A1A0F] border border-green-500/30 text-green-400' :
          t.type === 'error'   ? 'bg-[#1A0A0A] border border-red-500/30 text-red-400' :
          'bg-[#1C1C1C] border border-[#2A2A2A] text-white'
        }`}>
          {t.type === 'success' && <CheckCircle size={14} />}
          {t.type === 'error'   && <XCircle size={14} />}
          {t.type === 'info'    && <Bell size={14} />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// COMMAND PALETTE
// ─────────────────────────────────────────────────────────

function CommandPalette({ leads, isOpen, onClose, onLeadClick }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    if (isOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [isOpen])

  const results = useMemo(() => {
    if (!query.trim()) return leads.slice(0, 8)
    const q = query.toLowerCase()
    return leads.filter(l =>
      l.nome.toLowerCase().includes(q) ||
      l.telefone.includes(q) ||
      l.cidade.toLowerCase().includes(q) ||
      l.distribuidora.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [leads, query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh] px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2A2A]">
          <Search size={16} className="text-[#555] flex-shrink-0" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onClose()}
            placeholder="Buscar lead por nome, telefone, cidade..."
            className="flex-1 bg-transparent text-white text-sm placeholder-[#555] focus:outline-none" />
          <kbd className="text-[10px] text-[#555] bg-[#1C1C1C] px-1.5 py-0.5 rounded border border-[#2A2A2A]">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#555]">Nenhum lead encontrado</div>
          ) : (
            results.map(lead => {
              const stage = getStage(lead.status)
              return (
                <button key={lead.id} onClick={() => { onLeadClick(lead); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1C1C1C] transition-colors text-left">
                  <Avatar name={lead.nome} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{lead.nome}</p>
                    <p className="text-xs text-[#555] truncate">{lead.telefone} · {lead.cidade}/{lead.uf}</p>
                  </div>
                  <StageBadge stageId={lead.status} size="xs" />
                </button>
              )
            })
          )}
        </div>
        {!query && (
          <div className="px-4 py-2 border-t border-[#1A1A1A]">
            <p className="text-[10px] text-[#333]">Digite para buscar · Enter para abrir · Esc para fechar</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────────────────

function MatrixLogo({ collapsed = false }) {
  return (
    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF4500 0%, #FF6A35 100%)', boxShadow: '0 0 20px rgba(255,69,0,0.4)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 20V4l9 8 9-8v16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 20h18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      {!collapsed && (
        <div>
          <p className="font-bold text-sm leading-none text-white">Matrix</p>
          <p className="text-[10px] text-[#FF4500] font-medium tracking-widest uppercase leading-none mt-0.5">Energia</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────

const NAV = [
  { id: 'dashboard',     label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'pipeline',      label: 'Pipeline',     Icon: BarChart2 },
  { id: 'leads',         label: 'Leads',        Icon: Users },
  { id: 'metrics',       label: 'Métricas',     Icon: TrendingUp },
  { id: 'tarefas',       label: 'Tarefas',      Icon: CheckSquare },
  { id: 'configuracoes', label: 'Configurações', Icon: Settings },
]

const NAV_MOBILE = NAV.slice(0, 5)

function Sidebar({ view, setView, collapsed, setCollapsed, todayTasks, leads, onSearchOpen }) {
  const overdueCount = todayTasks.filter(t => taskUrgency(t) === 'overdue').length
  const todayCount   = todayTasks.filter(t => taskUrgency(t) === 'today').length

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 h-full bg-[#0F0F0F] border-r border-[#1A1A1A] flex flex-col transition-all duration-300`}>
      <div className={`flex items-center ${collapsed ? 'justify-center px-3' : 'justify-between px-5'} py-5 border-b border-[#1A1A1A]`}>
        <MatrixLogo collapsed={collapsed} />
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-[#1C1C1C] rounded-lg text-[#555] hover:text-white transition-colors flex-shrink-0">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Search button */}
      <div className={`px-3 py-2 border-b border-[#1A1A1A]`}>
        <button onClick={onSearchOpen}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#555] bg-[#141414] hover:bg-[#1C1C1C] border border-[#1A1A1A] hover:border-[#2A2A2A] transition-all ${collapsed ? 'justify-center' : ''}`}>
          <Search size={13} className="flex-shrink-0" />
          {!collapsed && <span className="flex-1 text-left">Buscar lead...</span>}
          {!collapsed && <kbd className="text-[10px] bg-[#0A0A0A] px-1 rounded">⌘K</kbd>}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ id, label, Icon }) => {
          const active = view === id
          const badge = id === 'tarefas' ? (overdueCount + todayCount) : null
          return (
            <button key={id} onClick={() => setView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${active ? 'bg-[#FF4500]/10 text-[#FF4500]' : 'text-[#888] hover:text-white hover:bg-[#1C1C1C]'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
              {!collapsed && badge > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: overdueCount > 0 ? '#EF4444' : '#FF4500', color: 'white' }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-[#1A1A1A]">
          <div className="bg-[#1C1C1C] rounded-xl p-3 space-y-2">
            <p className="text-xs text-[#555] uppercase tracking-wider">Pipeline</p>
            <div className="flex gap-1">
              {STAGES.slice(0, 6).map(s => {
                const cnt = leads.filter(l => l.status === s.id).length
                return <div key={s.id} className="flex-1 h-1 rounded-full" style={{ backgroundColor: cnt > 0 ? s.color : '#2A2A2A' }} title={`${s.short}: ${cnt}`} />
              })}
            </div>
            <p className="text-xs text-[#888]">{leads.filter(l => l.status !== 'fechado_ganho' && l.status !== 'fechado_perdido').length} ativos</p>
          </div>
        </div>
      )}
    </aside>
  )
}

// ─────────────────────────────────────────────────────────
// KANBAN
// ─────────────────────────────────────────────────────────

function LeadCard({ lead, onClick, onDragStart, tasks, interactions }) {
  const stage = getStage(lead.status)
  const pendingTasks = tasks.filter(t => t.leadId === lead.id && !t.concluida)
  const overdueTasks = pendingTasks.filter(t => taskUrgency(t) === 'overdue')
  const todayTasks   = pendingTasks.filter(t => taskUrgency(t) === 'today')
  const origem = ORIGENS.find(o => o.id === lead.origem)
  const lastContact  = getLastContact(lead.id, interactions || [])
  const staleDays    = daysSince(lastContact)
  const isStale      = staleDays !== null && staleDays > 7

  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead)}
      onClick={() => onClick(lead)}
      className="bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-xl p-3.5 cursor-pointer group transition-all duration-150 hover:shadow-lg hover:shadow-black/40 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={lead.nome} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-sm text-white truncate leading-tight">{lead.nome}</p>
            <p className="text-[11px] text-[#555] truncate">{lead.cidade}/{lead.uf}</p>
          </div>
        </div>
        {overdueTasks.length > 0 && <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />}
        {overdueTasks.length === 0 && todayTasks.length > 0 && <Clock size={14} className="text-[#FF4500] flex-shrink-0 mt-0.5" />}
      </div>

      <p className="text-[11px] text-[#888] truncate mb-2.5">{lead.distribuidora}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.valorEstimado ? (
            <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-md font-medium">
              {fmtValor(lead.valorEstimado)}
            </span>
          ) : lead.consumoMedio ? (
            <span className="text-[10px] bg-[#141414] text-[#888] px-1.5 py-0.5 rounded-md font-medium">
              {lead.consumoMedio} kWh
            </span>
          ) : null}
          {lead.contaLuzRecebida && (
            <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-md font-medium">Doc ✓</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {staleDays !== null && (
            <span className={`flex items-center gap-0.5 text-[10px] ${isStale ? 'text-amber-400' : 'text-[#555]'}`}>
              <CalendarClock size={10} />
              {staleDays === 0 ? 'hoje' : `${staleDays}d`}
            </span>
          )}
          <ScoreIndicator score={getLeadScore(lead)} size="xs" />
        </div>
      </div>

      {pendingTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#2A2A2A] flex items-center gap-1">
          <CheckSquare size={11} className={overdueTasks.length > 0 ? 'text-red-400' : 'text-[#555]'} />
          <span className={`text-[10px] ${overdueTasks.length > 0 ? 'text-red-400' : 'text-[#555]'}`}>
            {pendingTasks.length} {pendingTasks.length === 1 ? 'tarefa' : 'tarefas'} pendente{pendingTasks.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

function KanbanColumn({ stage, leads, tasks, interactions, onLeadClick, onDragStart, onDragOver, onDrop, onDragLeave, isDragOver }) {

  return (
    <div
      className={`kanban-column flex flex-col rounded-xl border transition-all duration-150 ${isDragOver ? 'border-[#FF4500]/50 shadow-lg shadow-[#FF4500]/10' : 'border-[#1A1A1A]'}`}
      style={{ backgroundColor: isDragOver ? 'rgba(255,69,0,0.04)' : '#0F0F0F' }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(stage.id) }}
      onDrop={() => onDrop(stage.id)}
      onDragLeave={onDragLeave}
    >
      <div className="px-3 py-3 border-b border-[#1A1A1A] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
          <p className="text-xs font-semibold text-white">{stage.short}</p>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-[#888]" style={{ backgroundColor: stage.bg }}>
          {leads.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} onDragStart={onDragStart} tasks={tasks} interactions={interactions} />
        ))}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16">
            <p className="text-[11px] text-[#333]">Nenhum lead</p>
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanBoard({ leads, tasks, interactions, onLeadClick, onStageChange }) {
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const handleDrop = (stageId) => {
    if (dragging && dragging.status !== stageId) {
      if (stageId === 'fechado_perdido') {
        onLeadClick({ ...dragging, _requestStage: stageId })
      } else {
        onStageChange(dragging.id, stageId)
      }
    }
    setDragging(null)
    setDragOver(null)
  }

  return (
    <div className="kanban-scroll flex gap-3 pb-4 h-full">
      {STAGES.map(stage => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          leads={leads.filter(l => l.status === stage.id)}
          tasks={tasks}
          interactions={interactions}
          onLeadClick={onLeadClick}
          onDragStart={setDragging}
          onDragOver={setDragOver}
          onDrop={handleDrop}
          onDragLeave={() => setDragOver(null)}
          isDragOver={dragOver === stage.id}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// LEAD FORM
// ─────────────────────────────────────────────────────────

const EMPTY_LEAD = { nome: '', telefone: '', email: '', cidade: '', uf: '', distribuidora: '', consumoMedio: '', valorEstimado: '', origem: '', nomeIndicador: '', contaLuzRecebida: false, linkDocumento: '' }

function LeadForm({ lead, onSave, onClose }) {
  const [form, setForm] = useState(() => lead ? { ...lead, consumoMedio: lead.consumoMedio || '', valorEstimado: lead.valorEstimado || '' } : EMPTY_LEAD)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.nome.trim())         e.nome = 'Nome obrigatório'
    if (!form.telefone.trim())     e.telefone = 'Telefone obrigatório'
    if (!form.cidade.trim())       e.cidade = 'Cidade obrigatória'
    if (!form.uf)                  e.uf = 'UF obrigatória'
    if (!form.distribuidora)       e.distribuidora = 'Distribuidora obrigatória'
    if (!form.origem)              e.origem = 'Origem obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const now = new Date().toISOString()
    onSave({
      ...form,
      consumoMedio: form.consumoMedio ? parseInt(form.consumoMedio) : null,
      valorEstimado: form.valorEstimado ? parseFloat(form.valorEstimado) : null,
      id: lead?.id || uid(),
      status: lead?.status || 'novo_contato',
      motivoPerda: lead?.motivoPerda || '',
      criadoEm: lead?.criadoEm || now,
      atualizadoEm: now,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Nome completo" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: João Carlos Silva" />
          {errors.nome && <p className="text-xs text-red-400 mt-1">{errors.nome}</p>}
        </div>
        <div>
          <Input label="WhatsApp" required value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(XX) XXXXX-XXXX" />
          {errors.telefone && <p className="text-xs text-red-400 mt-1">{errors.telefone}</p>}
        </div>
        <div>
          <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
        </div>
        <div>
          <Input label="Cidade" required value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Ex: Salvador" />
          {errors.cidade && <p className="text-xs text-red-400 mt-1">{errors.cidade}</p>}
        </div>
        <div>
          <Select label="UF" required value={form.uf} onChange={e => set('uf', e.target.value)} placeholder="Selecione" options={UFS} />
          {errors.uf && <p className="text-xs text-red-400 mt-1">{errors.uf}</p>}
        </div>
        <div className="col-span-2">
          <Select label="Distribuidora" required value={form.distribuidora} onChange={e => set('distribuidora', e.target.value)} placeholder="Selecione a distribuidora" options={DISTRIBUIDORAS} />
          {errors.distribuidora && <p className="text-xs text-red-400 mt-1">{errors.distribuidora}</p>}
        </div>
        <div>
          <Input label="Consumo médio (kWh)" type="number" value={form.consumoMedio} onChange={e => set('consumoMedio', e.target.value)} placeholder="Ex: 850" hint="Preencher após receber a conta" />
        </div>
        <div>
          <Input label="Valor estimado (R$/mês)" type="number" value={form.valorEstimado} onChange={e => set('valorEstimado', e.target.value)} placeholder="Ex: 1200" hint="Preencher após elaborar a proposta" />
        </div>
        <div className="col-span-2">
          <Select label="Origem do lead" required value={form.origem} onChange={e => set('origem', e.target.value)} placeholder="Como chegou?" options={ORIGENS} />
          {errors.origem && <p className="text-xs text-red-400 mt-1">{errors.origem}</p>}
        </div>
        {form.origem === 'indicacao' && (
          <div className="col-span-2">
            <Input label="Nome do indicador" value={form.nomeIndicador} onChange={e => set('nomeIndicador', e.target.value)} placeholder="Quem indicou?" />
          </div>
        )}

        <div className="col-span-2 border-t border-[#2A2A2A] pt-4">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-3">Documentos</p>
          <div className="flex items-center gap-3 mb-3">
            <button type="button" onClick={() => set('contaLuzRecebida', !form.contaLuzRecebida)}
              className={`flex items-center gap-2 text-sm transition-colors ${form.contaLuzRecebida ? 'text-green-400' : 'text-[#555]'}`}>
              {form.contaLuzRecebida ? <CheckCircle size={18} className="text-green-400" /> : <Circle size={18} />}
              Conta de luz recebida
            </button>
          </div>
          {form.contaLuzRecebida && (
            <Input label="Link ou localização do documento" value={form.linkDocumento} onChange={e => set('linkDocumento', e.target.value)} placeholder="https://drive.google.com/... ou 'Pasta WhatsApp'" />
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-[#2A2A2A]">
        <Btn type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Btn>
        <Btn type="submit" variant="primary" className="flex-1" icon={lead ? Edit3 : UserPlus}>
          {lead ? 'Salvar alterações' : 'Cadastrar lead'}
        </Btn>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────
// LEAD DETAIL
// ─────────────────────────────────────────────────────────

function InteractionForm({ leadId, onAdd, onClose }) {
  const [canal, setCanal] = useState('whatsapp')
  const [nota, setNota] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!nota.trim()) return
    onAdd({ id: uid(), leadId, data: new Date().toISOString(), canal, nota: nota.trim() })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-3 p-4 bg-[#1C1C1C] rounded-xl border border-[#2A2A2A]">
      <p className="text-xs font-semibold text-[#888] uppercase tracking-wider">Registrar interação</p>
      <div className="flex gap-2">
        {CANAIS.map(c => (
          <button key={c.id} type="button" onClick={() => setCanal(c.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${canal === c.id ? 'border-[#FF4500]/50 bg-[#FF4500]/10 text-[#FF4500]' : 'border-[#2A2A2A] text-[#888] hover:border-[#3A3A3A]'}`}>
            <c.icon size={12} />
            {c.label}
          </button>
        ))}
      </div>
      <Textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="O que foi conversado?" rows={3} />
      <div className="flex gap-2">
        <Btn type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit" variant="primary" size="sm" icon={Plus}>Registrar</Btn>
      </div>
    </form>
  )
}

function TaskFormInline({ leadId, onAdd, onClose }) {
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const submit = (e) => {
    e.preventDefault()
    if (!desc.trim() || !date) return
    onAdd({ id: uid(), leadId, descricao: desc.trim(), dataVencimento: new Date(date + 'T23:59:00').toISOString(), concluida: false, criadaEm: new Date().toISOString() })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-3 p-4 bg-[#1C1C1C] rounded-xl border border-[#2A2A2A]">
      <p className="text-xs font-semibold text-[#888] uppercase tracking-wider">Nova tarefa</p>
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição da tarefa" />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} label="Vencimento" />
      <div className="flex gap-2">
        <Btn type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit" variant="primary" size="sm" icon={Plus}>Adicionar</Btn>
      </div>
    </form>
  )
}

function LeadDetail({ lead, interactions, tasks, config, onClose, onUpdate, onDelete, onEdit, onAddInteraction, onAddTask, onCompleteTask, onDeleteTask, onStageChange, toast }) {
  const [showInteractionForm, setShowInteractionForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [motivo, setMotivo] = useState(lead.motivoPerda || '')
  const [changingStage, setChangingStage] = useState(lead._requestStage || null)

  const leadInteractions = useMemo(() => interactions.filter(i => i.leadId === lead.id).sort((a, b) => new Date(b.data) - new Date(a.data)), [interactions, lead.id])
  const leadTasks = useMemo(() => tasks.filter(t => t.leadId === lead.id).sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)), [tasks, lead.id])
  const stage = getStage(lead.status)
  const stageIdx = STAGES.findIndex(s => s.id === lead.status)
  const origem = ORIGENS.find(o => o.id === lead.origem)

  const handleStageChange = (newStageId) => {
    if (newStageId === 'fechado_perdido') {
      setChangingStage(newStageId)
    } else {
      onStageChange(lead.id, newStageId)
      setChangingStage(null)
    }
  }

  const confirmLost = () => {
    onStageChange(lead.id, 'fechado_perdido', motivo)
    setChangingStage(null)
  }

  const canal = (c) => CANAIS.find(x => x.id === c) || CANAIS[0]
  const score = getLeadScore(lead)
  const waMsg = waTemplates(lead.nome.split(' ')[0], config?.nomeConsultor || 'Consultor')[lead.status] || ''
  const waUrl = waLink(lead.telefone, waMsg)

  const copyWA = () => {
    navigator.clipboard.writeText(waMsg).then(() => toast?.info('Mensagem copiada!')).catch(() => {})
  }

  const urgencyStyle = { overdue: 'text-red-400', today: 'text-[#FF4500]', tomorrow: 'text-yellow-400', future: 'text-[#888]', done: 'text-[#555] line-through' }

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: '85vh' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2A2A2A] flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={lead.nome} size="lg" />
            <div>
              <h2 className="font-bold text-lg text-white leading-tight">{lead.nome}</h2>
              <p className="text-sm text-[#888]">{lead.cidade}/{lead.uf} · {lead.distribuidora}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Btn variant="secondary" size="sm" icon={Edit3} onClick={onEdit}>Editar</Btn>
            <button onClick={onClose} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-[#888] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="mt-4">
          <div className="flex items-center gap-1 mb-2">
            {STAGES.slice(0, 6).map((s, i) => (
              <div key={s.id} className={`h-1 flex-1 rounded-full transition-all ${i <= Math.min(stageIdx, 5) ? 'opacity-100' : 'opacity-20'}`} style={{ backgroundColor: i <= Math.min(stageIdx, 5) ? stage.color : '#2A2A2A' }} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <StageBadge stageId={lead.status} />
            <div className="flex items-center gap-1">
              <select
                value=""
                onChange={e => { if (e.target.value) handleStageChange(e.target.value) }}
                className="text-xs bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-2 py-1 text-[#888] cursor-pointer focus:outline-none focus:border-[#FF4500]"
              >
                <option value="">Mover para...</option>
                {STAGES.filter(s => s.id !== lead.status).map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lost stage form */}
      {changingStage === 'fechado_perdido' && (
        <div className="px-6 py-3 bg-red-500/5 border-b border-red-500/20 flex-shrink-0 space-y-2">
          <p className="text-sm font-medium text-red-400">Motivo da perda</p>
          <Select value={motivo} onChange={e => setMotivo(e.target.value)} options={MOTIVOS_PERDA} placeholder="Selecione o motivo" />
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setChangingStage(null)}>Cancelar</Btn>
            <Btn variant="danger" size="sm" onClick={confirmLost} disabled={!motivo}>Confirmar perda</Btn>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 divide-x divide-[#2A2A2A] h-full">
          {/* Left: Info */}
          <div className="col-span-3 p-5 space-y-5 overflow-y-auto">
            {/* Contact */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Contato</p>
              <div className="grid grid-cols-1 gap-2">
                <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 bg-[#1C1C1C] rounded-lg hover:bg-[#2A2A2A] transition-colors group">
                  <Phone size={14} className="text-[#25D366]" />
                  <span className="text-sm text-white">{lead.telefone}</span>
                  <ExternalLink size={11} className="text-[#555] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 p-2.5 bg-[#1C1C1C] rounded-lg hover:bg-[#2A2A2A] transition-colors group">
                    <Mail size={14} className="text-[#8B5CF6]" />
                    <span className="text-sm text-white truncate">{lead.email}</span>
                    <ExternalLink size={11} className="text-[#555] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>

            {/* WhatsApp quick send */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Mensagem rápida</p>
              <div className="p-3 bg-[#1C1C1C] rounded-xl border border-[#2A2A2A] space-y-2">
                <p className="text-xs text-[#888] leading-relaxed line-clamp-3">{waMsg}</p>
                <div className="flex gap-2">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-colors">
                    <Send size={12} />Enviar no WhatsApp
                  </a>
                  <button onClick={copyWA}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#888] border border-[#2A2A2A] hover:bg-[#2A2A2A] transition-colors">
                    <Copy size={12} />Copiar
                  </button>
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Qualidade do lead</p>
                <span className="text-xs font-bold" style={{ color: scoreColor(score) }}>{score}/100</span>
              </div>
              <ScoreIndicator score={score} />
              <div className="grid grid-cols-4 gap-1 text-[10px] text-[#555]">
                {[
                  { label: 'Etapa', ok: STAGES.findIndex(s => s.id === lead.status) >= 3 },
                  { label: 'Consumo', ok: !!lead.consumoMedio && lead.consumoMedio >= 500 },
                  { label: 'Conta', ok: lead.contaLuzRecebida },
                  { label: 'Indicação', ok: lead.origem === 'indicacao' },
                ].map(({ label, ok }) => (
                  <div key={label} className={`flex items-center gap-1 px-2 py-1 rounded-lg ${ok ? 'bg-green-500/10 text-green-400' : 'bg-[#1C1C1C]'}`}>
                    {ok ? <CheckCircle size={10} /> : <Circle size={10} />}
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Dados do lead</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Zap, label: 'Consumo', value: lead.consumoMedio ? `${lead.consumoMedio} kWh/mês` : 'Não informado', color: '#F59E0B' },
                  { icon: DollarSign, label: 'Valor estimado', value: lead.valorEstimado ? `${fmtValor(lead.valorEstimado)}/mês` : 'Não definido', color: '#22C55E' },
                  { icon: Tag, label: 'Origem', value: origem?.label || lead.origem, color: '#6366F1' },
                  { icon: MapPin, label: 'Localização', value: `${lead.cidade}/${lead.uf}`, color: '#EF4444' },
                  { icon: User, label: 'Indicador', value: lead.nomeIndicador || '—', color: '#8B5CF6' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-start gap-2.5 p-2.5 bg-[#1C1C1C] rounded-lg">
                    <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color }} />
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider">{label}</p>
                      <p className="text-xs text-white mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Documentos</p>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-lg ${lead.contaLuzRecebida ? 'bg-green-500/10 border border-green-500/20' : 'bg-[#1C1C1C] border border-[#2A2A2A]'}`}>
                <FileText size={14} className={lead.contaLuzRecebida ? 'text-green-400' : 'text-[#555]'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${lead.contaLuzRecebida ? 'text-green-400' : 'text-[#888]'}`}>
                    Conta de luz {lead.contaLuzRecebida ? 'recebida' : 'pendente'}
                  </p>
                  {lead.linkDocumento && (
                    safeHref(lead.linkDocumento)
                      ? <a href={safeHref(lead.linkDocumento)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#FF4500] hover:underline truncate block">{lead.linkDocumento}</a>
                      : <span className="text-[10px] text-[#888] truncate block">{lead.linkDocumento}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Lost reason */}
            {lead.status === 'fechado_perdido' && lead.motivoPerda && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Motivo da perda</p>
                <p className="text-sm text-red-400 font-medium">{lead.motivoPerda}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex gap-4 text-xs text-[#555]">
              <span>Criado: {fmtDate(lead.criadoEm)}</span>
              <span>Atualizado: {fmtDate(lead.atualizadoEm)}</span>
            </div>

            {/* Danger zone */}
            <div className="pt-2 border-t border-[#2A2A2A]">
              {!showDeleteConfirm ? (
                <Btn variant="danger" size="sm" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>Excluir lead</Btn>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-red-400">Tem certeza? Isso é irreversível.</p>
                  <Btn variant="danger" size="sm" onClick={onDelete}>Confirmar exclusão</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Btn>
                </div>
              )}
            </div>
          </div>

          {/* Right: Timeline + Tasks */}
          <div className="col-span-2 flex flex-col divide-y divide-[#2A2A2A]">
            {/* Tasks */}
            <div className="p-4 space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Tarefas</p>
                <button onClick={() => { setShowTaskForm(!showTaskForm); setShowInteractionForm(false) }}
                  className="p-1 hover:bg-[#2A2A2A] rounded-lg text-[#555] hover:text-[#FF4500] transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              {showTaskForm && <TaskFormInline leadId={lead.id} onAdd={onAddTask} onClose={() => setShowTaskForm(false)} />}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {leadTasks.length === 0 && !showTaskForm && <p className="text-xs text-[#333]">Nenhuma tarefa</p>}
                {leadTasks.map(task => {
                  const urg = taskUrgency(task)
                  return (
                    <div key={task.id} className="flex items-start gap-2 group">
                      <button onClick={() => onCompleteTask(task.id)} className="mt-0.5 flex-shrink-0">
                        {task.concluida
                          ? <CheckCircle size={14} className="text-green-500" />
                          : <Circle size={14} className={urg === 'overdue' ? 'text-red-400' : 'text-[#555] hover:text-[#FF4500]'} />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${urgencyStyle[urg]}`}>{task.descricao}</p>
                        <p className="text-[10px] text-[#555]">{fmtDate(task.dataVencimento)}</p>
                      </div>
                      <button onClick={() => onDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={11} className="text-[#555] hover:text-red-400" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Interactions */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Histórico</p>
                <button onClick={() => { setShowInteractionForm(!showInteractionForm); setShowTaskForm(false) }}
                  className="p-1 hover:bg-[#2A2A2A] rounded-lg text-[#555] hover:text-[#FF4500] transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              {showInteractionForm && <InteractionForm leadId={lead.id} onAdd={onAddInteraction} onClose={() => setShowInteractionForm(false)} />}
              <div className="space-y-3">
                {leadInteractions.length === 0 && !showInteractionForm && (
                  <p className="text-xs text-[#333]">Sem interações registradas</p>
                )}
                {leadInteractions.map(interaction => {
                  const c = canal(interaction.canal)
                  return (
                    <div key={interaction.id} className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: c.color + '20' }}>
                        <c.icon size={11} style={{ color: c.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium" style={{ color: c.color }}>{c.label}</span>
                          <span className="text-[10px] text-[#555]">{fmtDateTime(interaction.data)}</span>
                        </div>
                        <p className="text-xs text-[#888] leading-relaxed">{interaction.nota}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// DASHBOARD VIEW
// ─────────────────────────────────────────────────────────

function DashboardView({ leads, tasks, interactions, config, onLeadClick, onCompleteTask, setView }) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const active = leads.filter(l => l.status !== 'fechado_ganho' && l.status !== 'fechado_perdido')
  const closedThisMonth = leads.filter(l => l.status === 'fechado_ganho' && isWithinInterval(parseISO(l.atualizadoEm), { start: monthStart, end: monthEnd }))
  const todayTasks = tasks.filter(t => !t.concluida && (isToday(parseISO(t.dataVencimento)) || isPast(parseISO(t.dataVencimento))))
  const upcomingTasks = tasks.filter(t => !t.concluida).sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)).slice(0, 8)
  const recentInteractions = [...interactions].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 5)

  const totalLeads = leads.length
  const wonLeads = leads.filter(l => l.status === 'fechado_ganho').length
  const convRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
  const metaLeads = config?.metaLeadsMes || 20
  const metaContratos = config?.metaContratosMes || 5
  const leadsThisMonth = leads.filter(l => isWithinInterval(parseISO(l.criadoEm), { start: monthStart, end: monthEnd })).length
  const pctLeads = Math.min(Math.round((leadsThisMonth / metaLeads) * 100), 100)
  const pctContratos = Math.min(Math.round((closedThisMonth.length / metaContratos) * 100), 100)
  const pipelineValor = active.filter(l => l.valorEstimado).reduce((s, l) => s + l.valorEstimado, 0)

  const stageCounts = STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.id).length }))
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1)

  const urgencyStyle = { overdue: 'text-red-400 bg-red-500/10 border-red-500/20', today: 'text-[#FF4500] bg-[#FF4500]/10 border-[#FF4500]/20', tomorrow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', future: 'text-[#888] bg-[#1C1C1C] border-[#2A2A2A]' }

  const getLead = (id) => leads.find(l => l.id === id)

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <Stat label="Total de leads" value={totalLeads} sub="desde o início" color="#FF4500" />
        <Stat label="Ativos" value={active.length} sub="no funil agora" color="#F59E0B" />
        <Stat label="Fechados este mês" value={closedThisMonth.length} sub={format(now, 'MMMM yyyy', { locale: ptBR })} color="#22C55E" />
        <Stat label="Taxa de conversão" value={`${convRate}%`} sub={`${wonLeads} contratos fechados`} color="#6366F1" />
        <Stat label="Pipeline em valor" value={pipelineValor > 0 ? fmtValor(pipelineValor) : '—'} sub="estimativa mensal ativa" color="#22C55E" />
      </div>

      {/* Metas do mês */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: `Leads captados — meta: ${metaLeads}`, val: leadsThisMonth, pct: pctLeads, color: '#6366F1' },
          { label: `Contratos fechados — meta: ${metaContratos}`, val: closedThisMonth.length, pct: pctContratos, color: '#22C55E' },
        ].map(({ label, val, pct, color }) => (
          <div key={label} className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#888]">{label}</span>
              <span className="font-bold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <p className="text-xs text-[#555]">{val} de {label.split('meta: ')[1]?.replace(')', '') || '—'} este mês</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Tarefas pendentes</h3>
            <button onClick={() => setView('tarefas')} className="text-xs text-[#FF4500] hover:underline">Ver todas</button>
          </div>
          {upcomingTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Nenhuma tarefa pendente" description="Você está em dia!" />
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map(task => {
                const urg = taskUrgency(task)
                const lead = getLead(task.leadId)
                const style = urgencyStyle[urg] || urgencyStyle.future
                return (
                  <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${style} transition-all`}>
                    <button onClick={() => onCompleteTask(task.id)}>
                      <Circle size={16} className="text-current" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{task.descricao}</p>
                      {lead && (
                        <button onClick={() => onLeadClick(lead)} className="text-xs text-[#888] hover:text-[#FF4500] transition-colors truncate">
                          {lead.nome}
                        </button>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0 font-medium">
                      {isToday(parseISO(task.dataVencimento)) ? 'Hoje' : isPast(parseISO(task.dataVencimento)) ? 'Atrasada' : fmtDate(task.dataVencimento)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pipeline Mini */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white text-sm">Pipeline</h3>
          <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
            {stageCounts.filter(s => s.count > 0).map(s => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888] truncate">{s.short}</span>
                  <span className="font-bold" style={{ color: s.color }}>{s.count}</span>
                </div>
                <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <h3 className="font-semibold text-white text-sm pt-2">Atividade recente</h3>
          <div className="space-y-2">
            {recentInteractions.map(i => {
              const lead = getLead(i.leadId)
              const c = CANAIS.find(x => x.id === i.canal) || CANAIS[0]
              return (
                <div key={i.id} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: c.color + '20' }}>
                    <c.icon size={10} style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {lead && <p className="text-xs font-medium text-white truncate">{lead.nome}</p>}
                    <p className="text-[11px] text-[#555] truncate">{i.nota}</p>
                    <p className="text-[10px] text-[#333]">{fmtDate(i.data)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PIPELINE VIEW
// ─────────────────────────────────────────────────────────

function PipelineView({ leads, tasks, interactions, onLeadClick, onStageChange, onNewLead }) {
  const pipelineValor = leads
    .filter(l => l.status !== 'fechado_ganho' && l.status !== 'fechado_perdido' && l.valorEstimado)
    .reduce((s, l) => s + l.valorEstimado, 0)
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A] flex-shrink-0">
        <div>
          <h2 className="font-semibold text-white">Pipeline</h2>
          <p className="text-xs text-[#555]">
            {leads.filter(l => l.status !== 'fechado_ganho' && l.status !== 'fechado_perdido').length} leads ativos
            {pipelineValor > 0 && <span className="text-green-400 ml-2">· {fmtValor(pipelineValor)}/mês</span>}
          </p>
        </div>
        <Btn variant="primary" size="sm" icon={Plus} onClick={onNewLead}>Novo lead</Btn>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <KanbanBoard leads={leads} tasks={tasks} interactions={interactions} onLeadClick={onLeadClick} onStageChange={onStageChange} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// LEADS VIEW
// ─────────────────────────────────────────────────────────

function LeadsView({ leads, interactions, onLeadClick, onNewLead }) {
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterOrigem, setFilterOrigem] = useState('')

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase()
      const matchSearch = !q || l.nome.toLowerCase().includes(q) || l.telefone.includes(q) || l.email.toLowerCase().includes(q) || l.cidade.toLowerCase().includes(q) || l.distribuidora.toLowerCase().includes(q)
      const matchStage = !filterStage || l.status === filterStage
      const matchOrigem = !filterOrigem || l.origem === filterOrigem
      return matchSearch && matchStage && matchOrigem
    }).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
  }, [leads, search, filterStage, filterOrigem])

  const origem = (o) => ORIGENS.find(x => x.id === o)?.label || o

  const lastContactLabel = (leadId) => {
    const d = daysSince(getLastContact(leadId, interactions || []))
    if (d === null) return { text: '—', cls: 'text-[#555]' }
    if (d === 0)    return { text: 'Hoje', cls: 'text-green-400' }
    if (d <= 3)     return { text: `${d}d`, cls: 'text-[#888]' }
    if (d <= 7)     return { text: `${d}d`, cls: 'text-amber-400' }
    return { text: `${d}d`, cls: 'text-red-400' }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#1A1A1A] flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Leads</h2>
            <p className="text-xs text-[#555]">{filtered.length} de {leads.length}</p>
          </div>
          <Btn variant="primary" size="sm" icon={Plus} onClick={onNewLead}>Novo lead</Btn>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone, cidade..." className={`${inputCls} pl-9`} />
          </div>
          <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className={`${inputCls} w-44`}>
            <option value="">Todas as etapas</option>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={filterOrigem} onChange={e => setFilterOrigem(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">Todas as origens</option>
            {ORIGENS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum lead encontrado" description="Tente ajustar os filtros ou cadastrar um novo lead" action={<Btn variant="primary" size="sm" icon={Plus} onClick={onNewLead}>Cadastrar lead</Btn>} />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0A0A0A] z-10">
              <tr className="border-b border-[#1A1A1A]">
                {['Lead', 'Contato', 'Local / Distribuidora', 'Consumo', 'Valor/mês', 'Origem', 'Últ. contato', 'Etapa', 'Cadastro'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => {
                const lc = lastContactLabel(lead.id)
                return (
                <tr key={lead.id} onClick={() => onLeadClick(lead)}
                  className={`border-b border-[#1A1A1A] cursor-pointer hover:bg-[#141414] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0D0D0D]'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={lead.nome} size="sm" />
                      <span className="text-sm font-medium text-white whitespace-nowrap">{lead.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-white">{lead.telefone}</p>
                      {lead.email && <p className="text-[11px] text-[#555] truncate max-w-[140px]">{lead.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-[#888]">{lead.cidade}/{lead.uf}</p>
                    <p className="text-[11px] text-[#555] truncate max-w-[140px]">{lead.distribuidora}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#888] whitespace-nowrap">{lead.consumoMedio ? `${lead.consumoMedio} kWh` : '—'}</td>
                  <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: lead.valorEstimado ? '#22C55E' : '#555' }}>
                    {lead.valorEstimado ? fmtValor(lead.valorEstimado) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#888]">{origem(lead.origem)}</td>
                  <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                    <span className={lc.cls}>{lc.text}</span>
                  </td>
                  <td className="px-4 py-3"><StageBadge stageId={lead.status} size="xs" /></td>
                  <td className="px-4 py-3 text-xs text-[#555] whitespace-nowrap">{fmtDate(lead.criadoEm)}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TASK FORM MODAL (tarefa avulsa)
// ─────────────────────────────────────────────────────────

function TaskFormModal({ leads, onAdd, onClose }) {
  const [desc, setDesc]     = useState('')
  const [leadId, setLeadId] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10))

  const submit = (e) => {
    e.preventDefault()
    if (!desc.trim() || !date) return
    onAdd({
      id: uid(),
      leadId: leadId || null,
      descricao: desc.trim(),
      dataVencimento: new Date(date + 'T23:59:00').toISOString(),
      concluida: false,
      criadaEm: new Date().toISOString(),
    })
    onClose()
  }

  const activeLeads = leads
    .filter(l => l.status !== 'fechado_ganho' && l.status !== 'fechado_perdido')
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Descrição" required value={desc} onChange={e => setDesc(e.target.value)} placeholder="O que precisa ser feito?" />
      <Field label="Lead relacionado">
        <select value={leadId} onChange={e => setLeadId(e.target.value)} className={inputCls}>
          <option value="">Sem lead (tarefa avulsa)</option>
          {activeLeads.map(l => (
            <option key={l.id} value={l.id}>{l.nome} — {getStage(l.status).short}</option>
          ))}
        </select>
      </Field>
      <Input label="Vencimento" type="date" required value={date} onChange={e => setDate(e.target.value)} />
      <div className="flex gap-3 pt-2 border-t border-[#2A2A2A]">
        <Btn type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Btn>
        <Btn type="submit" variant="primary" className="flex-1" icon={Plus}>Criar tarefa</Btn>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────
// TASKS VIEW
// ─────────────────────────────────────────────────────────

function TasksView({ leads, tasks, onLeadClick, onCompleteTask, onDeleteTask, onAddTask }) {
  const [filter, setFilter]       = useState('pending')
  const [search, setSearch]       = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const getLead = (id) => leads.find(l => l.id === id)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tasks
      .filter(t => {
        const statusOk = filter === 'all' ? true : filter === 'done' ? t.concluida : !t.concluida
        if (!statusOk) return false
        if (!q) return true
        const lead = getLead(t.leadId)
        return t.descricao.toLowerCase().includes(q) || (lead && lead.nome.toLowerCase().includes(q))
      })
      .sort((a, b) => a.concluida - b.concluida || new Date(a.dataVencimento) - new Date(b.dataVencimento))
  }, [tasks, filter, search])

  const urgencyStyle = { overdue: 'border-red-500/30 bg-red-500/5', today: 'border-[#FF4500]/30 bg-[#FF4500]/5', tomorrow: 'border-yellow-500/30 bg-yellow-500/5', future: 'border-[#2A2A2A] bg-[#1C1C1C]', done: 'border-[#1A1A1A] bg-[#141414] opacity-50' }
  const urgencyText  = { overdue: 'text-red-400', today: 'text-[#FF4500]', tomorrow: 'text-yellow-400', future: 'text-[#888]', done: 'text-[#555] line-through' }
  const urgencyLabel = { overdue: 'Atrasada', today: 'Hoje', tomorrow: 'Amanhã', future: '', done: 'Concluída' }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#1A1A1A] flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Tarefas</h2>
          <Btn variant="primary" size="sm" icon={Plus} onClick={() => setShowNewTask(true)}>Nova tarefa</Btn>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1">
            {[['pending','Pendentes'],['all','Todas'],['done','Concluídas']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === v ? 'bg-[#FF4500]/10 text-[#FF4500]' : 'text-[#888] hover:text-white'}`}>{l}</button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por tarefa ou lead..." className={`${inputCls} pl-8 text-xs py-1.5`} />
          </div>
        </div>
      </div>
      <Modal isOpen={showNewTask} onClose={() => setShowNewTask(false)} title="Nova tarefa" size="sm">
        <TaskFormModal leads={leads} onAdd={onAddTask} onClose={() => setShowNewTask(false)} />
      </Modal>
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <EmptyState icon={CheckSquare} title="Nenhuma tarefa" description="Adicione tarefas nos detalhes de cada lead" />
        ) : (
          <div className="space-y-2 max-w-2xl">
            {filtered.map(task => {
              const urg = taskUrgency(task)
              const lead = getLead(task.leadId)
              return (
                <div key={task.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${urgencyStyle[urg]}`}>
                  <button onClick={() => onCompleteTask(task.id)}>
                    {task.concluida
                      ? <CheckCircle size={18} className="text-green-500" />
                      : <Circle size={18} className={urgencyText[urg]} />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${urgencyText[urg]}`}>{task.descricao}</p>
                    {lead && (
                      <button onClick={() => onLeadClick(lead)} className="text-xs text-[#555] hover:text-[#FF4500] transition-colors">
                        {lead.nome} · {lead.cidade}/{lead.uf}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {urgencyLabel[urg] && <span className={`text-xs font-medium ${urgencyText[urg]}`}>{urgencyLabel[urg]}</span>}
                    {!urgencyLabel[urg] && <span className="text-xs text-[#555]">{fmtDate(task.dataVencimento)}</span>}
                    <button onClick={() => onDeleteTask(task.id)} className="p-1 hover:bg-[#2A2A2A] rounded-md transition-colors">
                      <X size={13} className="text-[#555] hover:text-red-400" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// METRICS VIEW
// ─────────────────────────────────────────────────────────

function MetricsView({ leads, interactions }) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const total = leads.length
  const won   = leads.filter(l => l.status === 'fechado_ganho').length
  const lost  = leads.filter(l => l.status === 'fechado_perdido').length
  const active = total - won - lost
  const wonRate = total > 0 ? Math.round((won / total) * 100) : 0
  const closedMonth = leads.filter(l => l.status === 'fechado_ganho' && isWithinInterval(parseISO(l.atualizadoEm), { start: monthStart, end: monthEnd })).length
  const pipelineValor = leads.filter(l => !['fechado_ganho','fechado_perdido'].includes(l.status) && l.valorEstimado).reduce((s, l) => s + l.valorEstimado, 0)
  const contractedValor = leads.filter(l => l.status === 'fechado_ganho' && l.valorEstimado).reduce((s, l) => s + l.valorEstimado, 0)

  const stageCounts = STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.id).length }))
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1)

  const lostLeads = leads.filter(l => l.status === 'fechado_perdido' && l.motivoPerda)
  const motivoCounts = MOTIVOS_PERDA.map(m => ({ motivo: m, count: lostLeads.filter(l => l.motivoPerda === m).length })).filter(m => m.count > 0).sort((a, b) => b.count - a.count)
  const maxMotivo = Math.max(...motivoCounts.map(m => m.count), 1)

  const origemCounts = ORIGENS.map(o => ({ ...o, count: leads.filter(l => l.origem === o.id).length }))
  const maxOrigem = Math.max(...origemCounts.map(o => o.count), 1)

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    return {
      label: format(d, 'MMM', { locale: ptBR }),
      won: leads.filter(l => l.status === 'fechado_ganho' && isWithinInterval(parseISO(l.atualizadoEm), { start, end })).length,
      created: leads.filter(l => isWithinInterval(parseISO(l.criadoEm), { start, end })).length,
    }
  })
  const maxMonth = Math.max(...months.map(m => Math.max(m.won, m.created)), 1)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-white mb-4">Métricas</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <Stat label="Total de leads" value={total} color="#FF4500" />
          <Stat label="Taxa de conversão" value={`${wonRate}%`} sub={`${won} contratos`} color="#22C55E" />
          <Stat label="Fechados este mês" value={closedMonth} color="#6366F1" />
          <Stat label="Leads ativos" value={active} color="#F59E0B" />
          <Stat label="Pipeline em valor" value={pipelineValor > 0 ? fmtValor(pipelineValor) : '—'} sub="estimativa/mês" color="#22C55E" />
          <Stat label="Receita contratada" value={contractedValor > 0 ? fmtValor(contractedValor) : '—'} sub="clientes ganhos/mês" color="#6366F1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Stage funnel */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-white">Funil de Conversão</h3>
          <div className="space-y-2.5">
            {stageCounts.map(s => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888]">{s.label}</span>
                  <span className="font-bold" style={{ color: s.color }}>{s.count}</span>
                </div>
                <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Últimos 6 Meses</h3>
            <div className="flex items-center gap-3 text-[10px] text-[#888]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF4500] inline-block" />Fechados</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6366F1] inline-block" />Captados</span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-36">
            {months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end" style={{ height: '100px' }}>
                  <div className="flex-1 rounded-t-md transition-all" style={{ height: `${(m.won / maxMonth) * 100}%`, minHeight: m.won > 0 ? '4px' : '0', backgroundColor: '#FF4500', opacity: 0.9 }} />
                  <div className="flex-1 rounded-t-md transition-all" style={{ height: `${(m.created / maxMonth) * 100}%`, minHeight: m.created > 0 ? '4px' : '0', backgroundColor: '#6366F1', opacity: 0.7 }} />
                </div>
                <span className="text-[10px] text-[#555] capitalize">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Loss reasons */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-white">Motivos de Perda</h3>
          {motivoCounts.length === 0 ? (
            <p className="text-xs text-[#555]">Sem leads perdidos registrados</p>
          ) : (
            <div className="space-y-2.5">
              {motivoCounts.map(m => (
                <div key={m.motivo} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#888]">{m.motivo}</span>
                    <span className="font-bold text-red-400">{m.count}</span>
                  </div>
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-red-500/60" style={{ width: `${(m.count / maxMotivo) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Origin */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-white">Origem dos Leads</h3>
          <div className="space-y-2.5">
            {origemCounts.map(o => (
              <div key={o.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888]">{o.label}</span>
                  <span className="font-bold text-[#6366F1]">{o.count}</span>
                </div>
                <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#6366F1]/60" style={{ width: `${(o.count / maxOrigem) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SETTINGS VIEW
// ─────────────────────────────────────────────────────────

function SettingsView({ config, onConfig, leads, interactions, tasks, toast, onClearData }) {
  const [form, setForm] = useState({ ...config })
  const [notifStatus, setNotifStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [importError, setImportError] = useState('')
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    onConfig(form)
    toast.success('Configurações salvas!')
  }

  const requestNotif = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifStatus(perm)
    if (perm === 'granted') {
      onConfig({ ...form, notificacoesAtivadas: true })
      setForm(f => ({ ...f, notificacoesAtivadas: true }))
      toast.success('Notificações ativadas!')
    }
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.leads || !Array.isArray(data.leads)) throw new Error('Formato inválido')
        if (window.confirm(`Importar ${data.leads.length} leads? Os dados atuais serão substituídos.`)) {
          window.localStorage.setItem('mx_leads', JSON.stringify(data.leads))
          window.localStorage.setItem('mx_interactions', JSON.stringify(data.interactions || []))
          window.localStorage.setItem('mx_tasks', JSON.stringify(data.tasks || []))
          toast.success('Backup restaurado! Recarregue a página.')
          setTimeout(() => window.location.reload(), 1200)
        }
      } catch (err) {
        setImportError('Arquivo inválido. Use um backup gerado pelo CRM.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const monthStart = startOfMonth(new Date())
  const monthEnd   = endOfMonth(new Date())
  const leadsThisMonth = leads.filter(l => isWithinInterval(parseISO(l.criadoEm), { start: monthStart, end: monthEnd })).length
  const closedThisMonth = leads.filter(l => l.status === 'fechado_ganho' && isWithinInterval(parseISO(l.atualizadoEm), { start: monthStart, end: monthEnd })).length

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div>
          <h2 className="font-bold text-xl text-white">Configurações</h2>
          <p className="text-sm text-[#555] mt-1">Personalize o CRM para o seu perfil de consultor</p>
        </div>

        {/* Perfil */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-[#FF4500]" />
            <h3 className="font-semibold text-white text-sm">Perfil do Consultor</h3>
          </div>
          <Input label="Seu nome" value={form.nomeConsultor}
            onChange={e => set('nomeConsultor', e.target.value)}
            placeholder="Como você se apresenta aos clientes" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Meta de leads / mês" type="number" value={form.metaLeadsMes}
                onChange={e => set('metaLeadsMes', parseInt(e.target.value) || 0)} placeholder="20" />
            </div>
            <div>
              <Input label="Meta de contratos / mês" type="number" value={form.metaContratosMes}
                onChange={e => set('metaContratosMes', parseInt(e.target.value) || 0)} placeholder="5" />
            </div>
          </div>

          {/* Progress vs metas */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: 'Leads captados', val: leadsThisMonth, meta: form.metaLeadsMes, color: '#6366F1' },
              { label: 'Contratos fechados', val: closedThisMonth, meta: form.metaContratosMes, color: '#22C55E' },
            ].map(({ label, val, meta, color }) => {
              const pct = meta > 0 ? Math.min(Math.round((val / meta) * 100), 100) : 0
              return (
                <div key={label} className="bg-[#141414] rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888]">{label}</span>
                    <span className="font-bold" style={{ color }}>{val}/{meta}</span>
                  </div>
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-[10px] text-[#555]">{pct}% da meta</p>
                </div>
              )
            })}
          </div>

          <Btn variant="primary" onClick={save} icon={Check}>Salvar perfil</Btn>
        </div>

        {/* Notificações */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <BellRing size={16} className="text-[#F59E0B]" />
            <h3 className="font-semibold text-white text-sm">Notificações</h3>
          </div>
          {notifStatus === 'unsupported' && (
            <p className="text-sm text-[#555]">Seu navegador não suporta notificações.</p>
          )}
          {notifStatus === 'granted' && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />Notificações ativadas — você será alertado sobre tarefas atrasadas.
            </div>
          )}
          {notifStatus === 'denied' && (
            <p className="text-sm text-red-400">Notificações bloqueadas. Habilite nas configurações do navegador.</p>
          )}
          {notifStatus === 'default' && (
            <div className="space-y-2">
              <p className="text-sm text-[#888]">Receba alertas do navegador para tarefas atrasadas e vencendo hoje.</p>
              <Btn variant="secondary" icon={Bell} onClick={requestNotif}>Ativar notificações</Btn>
            </div>
          )}
        </div>

        {/* Dados */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Database size={16} className="text-[#6366F1]" />
            <h3 className="font-semibold text-white text-sm">Dados</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-[#888]">
            <div className="bg-[#141414] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{leads.length}</p>
              <p className="text-xs">Leads</p>
            </div>
            <div className="bg-[#141414] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{interactions.length}</p>
              <p className="text-xs">Interações</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Btn variant="secondary" icon={Download} onClick={() => { exportCSV(leads); toast.success('CSV exportado!') }}>
              Exportar leads (CSV)
            </Btn>
            <Btn variant="secondary" icon={Database} onClick={() => { exportBackup(leads, interactions, tasks); toast.success('Backup salvo!') }}>
              Backup completo (JSON)
            </Btn>
            <Btn variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
              Restaurar backup
            </Btn>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            {importError && <p className="text-xs text-red-400">{importError}</p>}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-red-400" />
            <h3 className="font-semibold text-red-400 text-sm">Zona de risco</h3>
          </div>
          <p className="text-sm text-[#888]">Apaga todos os leads, interações e tarefas. Ação irreversível — faça um backup antes.</p>
          <Btn variant="danger" icon={Trash2} onClick={onClearData}>Limpar todos os dados</Btn>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MOBILE DRAWER
// ─────────────────────────────────────────────────────────

function MobileDrawer({ open, onClose, view, setView, todayTasks, leads, onSearchOpen }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] md:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 shadow-2xl animate-slide-up" style={{ animationDuration: '0.2s' }}>
        <Sidebar
          view={view}
          setView={(v) => { setView(v); onClose() }}
          collapsed={false}
          setCollapsed={() => {}}
          todayTasks={todayTasks}
          leads={leads}
          onSearchOpen={() => { onSearchOpen(); onClose() }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────

export default function App() {
  const [leads, setLeads]               = useState([])
  const [interactions, setInteractions] = useState([])
  const [tasks, setTasks]               = useState([])
  const [config, setConfigRaw]          = useState(DEFAULT_CONFIG)
  const [loading, setLoading]           = useState(true)
  const [view, setView]                 = useState('dashboard')
  const [collapsed, setCollapsed]         = useState(false)
  const [selectedLead, setSelectedLead]   = useState(null)
  const [showForm, setShowForm]           = useState(false)
  const [editingLead, setEditingLead]     = useState(null)
  const [paletteOpen, setPaletteOpen]     = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toast = useToast()

  useEffect(() => {
    Promise.all([db.leads.list(), db.interactions.list(), db.tasks.list(), db.config.get()])
      .then(([l, i, t, c]) => { setLeads(l); setInteractions(i); setTasks(t); setConfigRaw(c) })
      .catch(() => toast.error('Erro ao carregar dados do banco.'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  const todayTasks = useMemo(() =>
    tasks.filter(t => !t.concluida && (isToday(parseISO(t.dataVencimento)) || isPast(parseISO(t.dataVencimento)))),
  [tasks])

  // Ctrl+K / Cmd+K to open command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Browser notifications for overdue tasks
  useEffect(() => {
    if (!config.notificacoesAtivadas || Notification.permission !== 'granted') return
    const overdue = tasks.filter(t => !t.concluida && isPast(parseISO(t.dataVencimento)) && !isToday(parseISO(t.dataVencimento)))
    const todayDue = tasks.filter(t => !t.concluida && isToday(parseISO(t.dataVencimento)))
    if (overdue.length > 0) {
      new Notification('CRM Matrix — Tarefas atrasadas', {
        body: `${overdue.length} tarefa${overdue.length > 1 ? 's' : ''} em atraso!`,
        icon: '/favicon.svg',
      })
    } else if (todayDue.length > 0) {
      new Notification('CRM Matrix — Tarefas de hoje', {
        body: `${todayDue.length} tarefa${todayDue.length > 1 ? 's' : ''} para hoje.`,
        icon: '/favicon.svg',
      })
    }
  }, []) // eslint-disable-line

  const handleConfig = (newConfig) => {
    setConfigRaw(newConfig)
    db.config.save(newConfig).catch(() => toast.error('Erro ao salvar configurações.'))
  }

  const handleLeadClick = (lead) => { setSelectedLead(lead); setShowForm(false) }
  const handleNewLead = () => { setEditingLead(null); setShowForm(true); setSelectedLead(null) }
  const handleEditLead = () => { setEditingLead(selectedLead); setShowForm(true); setSelectedLead(null) }

  const handleSaveLead = async (lead) => {
    try {
      if (editingLead) {
        await db.leads.update(lead)
        setLeads(prev => prev.map(l => l.id === lead.id ? lead : l))
        toast.success('Lead atualizado!')
      } else {
        await db.leads.insert(lead)
        setLeads(prev => [lead, ...prev])
        toast.success('Lead cadastrado!')
      }
      setShowForm(false)
      setEditingLead(null)
    } catch {
      toast.error('Erro ao salvar lead.')
    }
  }

  const handleDeleteLead = async () => {
    const nome = selectedLead.nome
    const id = selectedLead.id
    try {
      await db.leads.remove(id)
      setLeads(prev => prev.filter(l => l.id !== id))
      setInteractions(prev => prev.filter(i => i.leadId !== id))
      setTasks(prev => prev.filter(t => t.leadId !== id))
      setSelectedLead(null)
      toast.info(`${nome} removido.`)
    } catch {
      toast.error('Erro ao remover lead.')
    }
  }

  const handleStageChange = async (leadId, newStage, motivo = '') => {
    const now = new Date().toISOString()
    const stage = getStage(newStage)
    const updated = { status: newStage, motivoPerda: motivo, atualizadoEm: now }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l))
    if (selectedLead?.id === leadId) setSelectedLead(prev => ({ ...prev, ...updated }))
    if (newStage === 'fechado_ganho') toast.success('🎉 Contrato fechado! Parabéns!')
    else toast.info(`Movido para ${stage.label}`)
    try {
      const lead = leads.find(l => l.id === leadId)
      if (lead) await db.leads.update({ ...lead, ...updated })
    } catch {
      toast.error('Erro ao atualizar etapa.')
    }
  }

  const handleAddInteraction = async (interaction) => {
    try {
      await db.interactions.insert(interaction)
      setInteractions(prev => [interaction, ...prev])
      toast.success('Interação registrada!')
    } catch {
      toast.error('Erro ao registrar interação.')
    }
  }

  const handleAddTask = async (task) => {
    try {
      await db.tasks.insert(task)
      setTasks(prev => [...prev, task])
      toast.success('Tarefa criada!')
    } catch {
      toast.error('Erro ao criar tarefa.')
    }
  }

  const handleCompleteTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    const nowDone = !task?.concluida
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, concluida: nowDone } : t))
    if (nowDone) toast.success('Tarefa concluída!')
    try {
      if (task) await db.tasks.update({ ...task, concluida: nowDone })
    } catch {
      toast.error('Erro ao atualizar tarefa.')
    }
  }

  const handleDeleteTask = async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await db.tasks.remove(taskId)
    } catch {
      toast.error('Erro ao remover tarefa.')
    }
  }

  const handleClearData = async () => {
    if (!window.confirm('Apagar TODOS os dados? Esta ação não pode ser desfeita.')) return
    try {
      await Promise.all([db.leads.removeAll(), db.interactions.removeAll(), db.tasks.removeAll()])
      setLeads([])
      setInteractions([])
      setTasks([])
      setSelectedLead(null)
      setShowForm(false)
      toast.error('Todos os dados foram apagados.')
    } catch {
      toast.error('Erro ao apagar dados.')
    }
  }

  if (loading) return (
    <div className="flex h-screen bg-[#0A0A0A] items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF4500 0%, #FF6A35 100%)' }}>
        <Zap size={16} className="text-white" />
      </div>
      <p className="text-[#555] text-sm">Carregando dados...</p>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          view={view} setView={setView}
          collapsed={collapsed} setCollapsed={setCollapsed}
          todayTasks={todayTasks} leads={leads}
          onSearchOpen={() => setPaletteOpen(true)}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 hover:bg-[#1C1C1C] rounded-lg">
              <Menu size={18} className="text-[#888]" />
            </button>
            <MatrixLogo />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPaletteOpen(true)} className="p-2 hover:bg-[#1C1C1C] rounded-lg">
              <Search size={18} className="text-[#888]" />
            </button>
            <button onClick={handleNewLead} className="p-2 bg-[#FF4500] rounded-lg">
              <Plus size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* View content */}
        <div className="flex-1 overflow-hidden">
          {view === 'dashboard' && (
            <div className="h-full overflow-y-auto">
              <DashboardView leads={leads} tasks={tasks} interactions={interactions} config={config}
                onLeadClick={handleLeadClick} onCompleteTask={handleCompleteTask} setView={setView} />
            </div>
          )}
          {view === 'pipeline' && (
            <PipelineView leads={leads} tasks={tasks} interactions={interactions} onLeadClick={handleLeadClick}
              onStageChange={handleStageChange} onNewLead={handleNewLead} />
          )}
          {view === 'leads' && (
            <LeadsView leads={leads} interactions={interactions} onLeadClick={handleLeadClick} onNewLead={handleNewLead} />
          )}
          {view === 'metrics' && (
            <div className="h-full overflow-y-auto">
              <MetricsView leads={leads} interactions={interactions} config={config} />
            </div>
          )}
          {view === 'tarefas' && (
            <TasksView leads={leads} tasks={tasks} onLeadClick={handleLeadClick}
              onCompleteTask={handleCompleteTask} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask} />
          )}
          {view === 'configuracoes' && (
            <SettingsView config={config} onConfig={handleConfig}
              leads={leads} interactions={interactions} tasks={tasks}
              toast={toast} onClearData={handleClearData} />
          )}
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex border-t border-[#1A1A1A] bg-[#0A0A0A]">
          {NAV_MOBILE.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-1 text-[10px] font-medium transition-colors ${view === id ? 'text-[#FF4500]' : 'text-[#555]'}`}>
              <Icon size={18} />
              {label}
            </button>
          ))}
          <button onClick={() => setView('configuracoes')}
            className={`flex-1 flex flex-col items-center py-2.5 gap-1 text-[10px] font-medium transition-colors ${view === 'configuracoes' ? 'text-[#FF4500]' : 'text-[#555]'}`}>
            <Settings size={18} />
            Config
          </button>
        </div>
      </main>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        view={view} setView={setView}
        todayTasks={todayTasks} leads={leads}
        onSearchOpen={() => setPaletteOpen(true)}
      />

      {/* Command Palette */}
      <CommandPalette leads={leads} isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)} onLeadClick={handleLeadClick} />

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Modal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} size="xl" noPad>
          <LeadDetail
            lead={selectedLead} interactions={interactions} tasks={tasks}
            config={config} toast={toast}
            onClose={() => setSelectedLead(null)}
            onEdit={handleEditLead} onDelete={handleDeleteLead}
            onAddInteraction={handleAddInteraction} onAddTask={handleAddTask}
            onCompleteTask={handleCompleteTask} onDeleteTask={handleDeleteTask}
            onStageChange={handleStageChange}
          />
        </Modal>
      )}

      {/* Lead Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingLead(null) }}
        title={editingLead ? 'Editar lead' : 'Cadastrar novo lead'} size="md">
        <LeadForm lead={editingLead} onSave={handleSaveLead}
          onClose={() => { setShowForm(false); setEditingLead(null) }} />
      </Modal>

      {/* Toasts */}
      <ToastContainer toasts={toast.toasts} />
    </div>
  )
}
