import { supabase } from './supabase'

// ── Mapping ───────────────────────────────────────────────

function leadFromDB(r) {
  return {
    id: r.id,
    nome: r.nome,
    telefone: r.telefone ?? '',
    email: r.email ?? '',
    cidade: r.cidade ?? '',
    uf: r.uf ?? '',
    distribuidora: r.distribuidora ?? '',
    consumoMedio: r.consumo_medio,
    valorEstimado: r.valor_estimado,
    origem: r.origem ?? '',
    nomeIndicador: r.nome_indicador ?? '',
    status: r.status,
    motivoPerda: r.motivo_perda ?? '',
    contaLuzRecebida: r.conta_luz_recebida ?? false,
    linkDocumento: r.link_documento ?? '',
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  }
}

function leadToDB(lead) {
  return {
    id: lead.id,
    nome: lead.nome,
    telefone: lead.telefone ?? '',
    email: lead.email ?? '',
    cidade: lead.cidade ?? '',
    uf: lead.uf ?? '',
    distribuidora: lead.distribuidora ?? '',
    consumo_medio: lead.consumoMedio ?? null,
    valor_estimado: lead.valorEstimado ?? null,
    origem: lead.origem ?? '',
    nome_indicador: lead.nomeIndicador ?? '',
    status: lead.status,
    motivo_perda: lead.motivoPerda ?? '',
    conta_luz_recebida: lead.contaLuzRecebida ?? false,
    link_documento: lead.linkDocumento ?? '',
    criado_em: lead.criadoEm,
    atualizado_em: lead.atualizadoEm,
  }
}

function interactionFromDB(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    data: r.data,
    canal: r.canal ?? '',
    nota: r.nota ?? '',
  }
}

function interactionToDB(i) {
  return {
    id: i.id,
    lead_id: i.leadId,
    data: i.data,
    canal: i.canal ?? '',
    nota: i.nota ?? '',
  }
}

function taskFromDB(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    descricao: r.descricao ?? '',
    dataVencimento: r.data_vencimento,
    concluida: r.concluida ?? false,
    criadaEm: r.criada_em,
  }
}

function taskToDB(t) {
  return {
    id: t.id,
    lead_id: t.leadId,
    descricao: t.descricao ?? '',
    data_vencimento: t.dataVencimento,
    concluida: t.concluida ?? false,
    criada_em: t.criadaEm,
  }
}

function configFromDB(r) {
  return {
    nomeConsultor: r.nome_consultor ?? 'Consultor',
    metaLeadsMes: r.meta_leads_mes ?? 20,
    metaContratosMes: r.meta_contratos_mes ?? 5,
    notificacoesAtivadas: r.notificacoes_ativadas ?? false,
  }
}

function configToDB(c) {
  return {
    id: 'default',
    nome_consultor: c.nomeConsultor,
    meta_leads_mes: c.metaLeadsMes,
    meta_contratos_mes: c.metaContratosMes,
    notificacoes_ativadas: c.notificacoesAtivadas,
  }
}

// ── Leads ─────────────────────────────────────────────────

export const leads = {
  async list() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data.map(leadFromDB)
  },

  async insert(lead) {
    const { error } = await supabase.from('leads').insert(leadToDB(lead))
    if (error) throw error
  },

  async update(lead) {
    const { id, criado_em, ...rest } = leadToDB(lead)
    const { error } = await supabase.from('leads').update(rest).eq('id', id)
    if (error) throw error
  },

  async remove(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) throw error
  },

  async removeAll() {
    const { error } = await supabase.from('leads').delete().neq('id', '')
    if (error) throw error
  },

  async bulkInsert(items) {
    const { error } = await supabase.from('leads').insert(items.map(leadToDB))
    if (error) throw error
  },
}

// ── Interactions ──────────────────────────────────────────

export const interactions = {
  async list() {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .order('data', { ascending: false })
    if (error) throw error
    return data.map(interactionFromDB)
  },

  async insert(interaction) {
    const { error } = await supabase.from('interactions').insert(interactionToDB(interaction))
    if (error) throw error
  },

  async removeAll() {
    const { error } = await supabase.from('interactions').delete().neq('id', '')
    if (error) throw error
  },

  async bulkInsert(items) {
    const { error } = await supabase.from('interactions').insert(items.map(interactionToDB))
    if (error) throw error
  },
}

// ── Tasks ─────────────────────────────────────────────────

export const tasks = {
  async list() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('data_vencimento', { ascending: true })
    if (error) throw error
    return data.map(taskFromDB)
  },

  async insert(task) {
    const { error } = await supabase.from('tasks').insert(taskToDB(task))
    if (error) throw error
  },

  async update(task) {
    const { id, criada_em, ...rest } = taskToDB(task)
    const { error } = await supabase.from('tasks').update(rest).eq('id', id)
    if (error) throw error
  },

  async remove(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  },

  async removeAll() {
    const { error } = await supabase.from('tasks').delete().neq('id', '')
    if (error) throw error
  },

  async bulkInsert(items) {
    const { error } = await supabase.from('tasks').insert(items.map(taskToDB))
    if (error) throw error
  },
}

// ── Config ────────────────────────────────────────────────

export const config = {
  async get() {
    const { data, error } = await supabase.from('config').select('*').eq('id', 'default').single()
    if (error) throw error
    return configFromDB(data)
  },

  async save(cfg) {
    const { error } = await supabase.from('config').upsert(configToDB(cfg))
    if (error) throw error
  },
}
