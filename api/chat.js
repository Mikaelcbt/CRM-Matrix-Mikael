import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Tool definitions ──────────────────────────────────────

const FUNCTION_DECLARATIONS = [
  {
    name: 'create_lead',
    description: 'Cria um novo lead no CRM com os dados fornecidos.',
    parameters: {
      type: 'object',
      properties: {
        nome:          { type: 'string',  description: 'Nome completo do lead' },
        telefone:      { type: 'string',  description: 'Telefone com DDD, ex: 71999990000' },
        email:         { type: 'string' },
        cidade:        { type: 'string' },
        uf:            { type: 'string',  description: 'Sigla do estado, ex: SP, RJ, BA' },
        distribuidora: { type: 'string' },
        consumoMedio:  { type: 'number',  description: 'Consumo médio em kWh/mês' },
        valorEstimado: { type: 'number',  description: 'Valor estimado em R$/mês' },
        origem:        { type: 'string',  description: 'indicacao | instagram | abordagem | evento' },
        nomeIndicador: { type: 'string' },
        status:        { type: 'string',  description: 'Etapa inicial do pipeline. Padrão: novo_contato' },
        anotacoes:     { type: 'string' },
      },
      required: ['nome', 'telefone'],
    },
  },
  {
    name: 'update_lead',
    description: 'Atualiza campos específicos de um lead existente.',
    parameters: {
      type: 'object',
      properties: {
        id:               { type: 'string', description: 'ID do lead (obrigatório)' },
        nome:             { type: 'string' },
        telefone:         { type: 'string' },
        email:            { type: 'string' },
        cidade:           { type: 'string' },
        uf:               { type: 'string' },
        distribuidora:    { type: 'string' },
        consumoMedio:     { type: 'number' },
        valorEstimado:    { type: 'number' },
        origem:           { type: 'string' },
        nomeIndicador:    { type: 'string' },
        anotacoes:        { type: 'string' },
        contaLuzRecebida: { type: 'boolean' },
        linkDocumento:    { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'change_lead_stage',
    description: 'Muda a etapa do pipeline de um lead.',
    parameters: {
      type: 'object',
      properties: {
        id:          { type: 'string' },
        status:      { type: 'string', description: 'novo_contato | primeiro_contato | aguardando_conta | conta_recebida | proposta_enviada | em_negociacao | fechado_ganho | cobrar_comprovante | fechado_perdido' },
        motivoPerda: { type: 'string', description: 'Obrigatório quando status = fechado_perdido' },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'delete_lead',
    description: 'Remove permanentemente um lead do CRM.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'create_task',
    description: 'Cria uma nova tarefa, opcionalmente vinculada a um lead.',
    parameters: {
      type: 'object',
      properties: {
        descricao:      { type: 'string', description: 'Descrição da tarefa' },
        dataVencimento: { type: 'string', description: 'Data formato YYYY-MM-DD' },
        leadId:         { type: 'string', description: 'ID do lead (opcional)' },
      },
      required: ['descricao', 'dataVencimento'],
    },
  },
  {
    name: 'complete_task',
    description: 'Marca uma tarefa como concluída.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Remove uma tarefa.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'add_interaction',
    description: 'Registra uma interação/contato com um lead.',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        canal:  { type: 'string', description: 'whatsapp | ligacao | email | instagram' },
        nota:   { type: 'string', description: 'O que foi conversado ou feito' },
      },
      required: ['leadId', 'canal', 'nota'],
    },
  },
]

// ── Helpers ───────────────────────────────────────────────

function toGeminiContents(messages) {
  const result = []
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]

    if (msg.role === 'user') {
      result.push({ role: 'user', parts: [{ text: msg.content || '' }] })
      i++
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls?.length) {
        result.push({
          role: 'model',
          parts: msg.toolCalls.map(tc => ({
            functionCall: { name: tc.name, args: tc.args || {} },
          })),
        })
      } else {
        result.push({ role: 'model', parts: [{ text: msg.content || '' }] })
      }
      i++
    } else if (msg.role === 'tool') {
      // Group consecutive tool results into a single user turn
      const parts = []
      while (i < messages.length && messages[i].role === 'tool') {
        let responseData
        try { responseData = JSON.parse(messages[i].content) } catch { responseData = { result: messages[i].content } }
        parts.push({
          functionResponse: {
            name: messages[i].toolName,
            response: responseData,
          },
        })
        i++
      }
      result.push({ role: 'user', parts })
    } else {
      i++
    }
  }

  return result
}

function buildSystemPrompt(crmContext) {
  const leads        = crmContext?.leads        || []
  const tasks        = crmContext?.tasks        || []
  const interactions = crmContext?.interactions || []
  const config       = crmContext?.config       || {}
  const now          = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const stageNames = {
    novo_contato: 'Novo Contato', primeiro_contato: 'Primeiro Contato Feito',
    aguardando_conta: 'Aguardando Conta de Luz', conta_recebida: 'Conta Recebida',
    proposta_enviada: 'Proposta Enviada', em_negociacao: 'Em Análise / Negociação',
    fechado_ganho: 'Fechado (Ganho)', cobrar_comprovante: 'Cobrar Comprovante',
    fechado_perdido: 'Fechado (Perdido)',
  }

  const pendingTasks = tasks.filter(t => !t.concluida)
  const overdueTasks = pendingTasks.filter(t => new Date(t.dataVencimento) < new Date())

  return `Você é o assistente de IA do CRM Matrix Energia — sistema de gestão de leads para consultor de vendas no Mercado Livre de Energia.

CONSULTOR: ${config.nomeConsultor || 'Consultor'}
DATA/HORA: ${now}
METAS: ${config.metaLeadsMes || 20} leads/mês · ${config.metaContratosMes || 5} contratos/mês

══════ LEADS (${leads.length}) ══════
${leads.length === 0 ? 'Nenhum lead.' : leads.map(l =>
  `[${l.id}] ${l.nome} | ${l.telefone}${l.email ? ' | ' + l.email : ''} | ${l.cidade || '?'}/${l.uf || '?'} | ${stageNames[l.status] || l.status}${l.consumoMedio ? ' | ' + l.consumoMedio + ' kWh' : ''}${l.valorEstimado ? ' | R$' + l.valorEstimado + '/mês' : ''}${l.anotacoes ? ' | ' + l.anotacoes.slice(0, 50) : ''}`
).join('\n')}

══════ TAREFAS PENDENTES (${pendingTasks.length} · ${overdueTasks.length} em atraso) ══════
${pendingTasks.length === 0 ? 'Nenhuma.' : pendingTasks.map(t => {
  const lead = leads.find(l => l.id === t.leadId)
  return `[${t.id}] ${t.descricao} | Vence: ${t.dataVencimento?.slice(0, 10)}${lead ? ' | ' + lead.nome : ''}`
}).join('\n')}

══════ INTERAÇÕES RECENTES (${Math.min(interactions.length, 20)}) ══════
${interactions.slice(0, 20).map(i => {
  const lead = leads.find(l => l.id === i.leadId)
  return `${i.data?.slice(0, 10)} | ${lead?.nome || '?'} | ${i.canal} | ${i.nota?.slice(0, 60)}`
}).join('\n') || 'Nenhuma.'}

ETAPAS: novo_contato → primeiro_contato → aguardando_conta → conta_recebida → proposta_enviada → em_negociacao → fechado_ganho | cobrar_comprovante | fechado_perdido

REGRAS:
- Use as funções disponíveis para criar, editar e gerenciar dados quando solicitado.
- Após ações, confirme o que foi feito de forma clara e concisa.
- Ao referenciar um lead pelo nome (parcial), localize o ID correto antes de agir.
- Responda SEMPRE em português brasileiro.`
}

// ── Handler ───────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' })

  const { messages, crmContext } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages inválido' })

  try {
    const genAI    = new GoogleGenerativeAI(apiKey)
    const model    = genAI.getGenerativeModel({
      model:             'gemini-2.0-flash',
      systemInstruction: buildSystemPrompt(crmContext),
      tools:             [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      toolConfig:        { functionCallingConfig: { mode: 'AUTO' } },
    })

    const contents  = toGeminiContents(messages)
    const result    = await model.generateContent({ contents })
    const candidate = result.response.candidates[0]
    const parts     = candidate.content.parts

    // Function calls
    const funcCalls = parts.filter(p => p.functionCall)
    if (funcCalls.length > 0) {
      return res.json({
        type:      'tool_calls',
        toolCalls: funcCalls.map((p, i) => ({
          id:   `tc_${Date.now()}_${i}`,
          name: p.functionCall.name,
          args: p.functionCall.args || {},
        })),
      })
    }

    // Text response
    const text = parts.filter(p => p.text).map(p => p.text).join('')
    return res.json({ type: 'done', text })
  } catch (err) {
    console.error('[chat] Gemini error:', err.message)
    return res.status(500).json({ error: err.message || 'Erro ao chamar Gemini API' })
  }
}
