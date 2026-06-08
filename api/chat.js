import Anthropic from '@anthropic-ai/sdk'

const TOOLS = [
  {
    name: 'create_lead',
    description: 'Cria um novo lead no CRM com os dados fornecidos.',
    input_schema: {
      type: 'object',
      properties: {
        nome:          { type: 'string',  description: 'Nome completo do lead' },
        telefone:      { type: 'string',  description: 'Telefone com DDD' },
        email:         { type: 'string' },
        cidade:        { type: 'string' },
        uf:            { type: 'string',  description: 'Sigla do estado, ex: SP, RJ' },
        distribuidora: { type: 'string' },
        consumoMedio:  { type: 'number',  description: 'Consumo médio em kWh/mês' },
        valorEstimado: { type: 'number',  description: 'Valor estimado em R$/mês' },
        origem:        { type: 'string',  enum: ['indicacao', 'instagram', 'abordagem', 'evento'] },
        nomeIndicador: { type: 'string' },
        status:        { type: 'string',  description: 'Etapa inicial. Padrão: novo_contato' },
        anotacoes:     { type: 'string' },
      },
      required: ['nome', 'telefone'],
    },
  },
  {
    name: 'update_lead',
    description: 'Atualiza campos específicos de um lead existente.',
    input_schema: {
      type: 'object',
      properties: {
        id:               { type: 'string' },
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
    input_schema: {
      type: 'object',
      properties: {
        id:          { type: 'string' },
        status:      { type: 'string', enum: ['novo_contato','primeiro_contato','aguardando_conta','conta_recebida','proposta_enviada','em_negociacao','fechado_ganho','cobrar_comprovante','fechado_perdido'] },
        motivoPerda: { type: 'string', description: 'Obrigatório se status = fechado_perdido' },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'delete_lead',
    description: 'Remove permanentemente um lead do CRM.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'create_task',
    description: 'Cria uma nova tarefa, opcionalmente vinculada a um lead.',
    input_schema: {
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
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Remove uma tarefa.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'add_interaction',
    description: 'Registra uma interação/contato com um lead.',
    input_schema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        canal:  { type: 'string', enum: ['whatsapp', 'ligacao', 'email', 'instagram'] },
        nota:   { type: 'string', description: 'O que foi conversado ou feito' },
      },
      required: ['leadId', 'canal', 'nota'],
    },
  },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' })

  const { messages, crmContext } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages inválido' })

  const leads        = crmContext?.leads        || []
  const tasks        = crmContext?.tasks        || []
  const interactions = crmContext?.interactions || []
  const config       = crmContext?.config       || {}
  const now          = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const stageNames = {
    novo_contato: 'Novo Contato', primeiro_contato: 'Primeiro Contato Feito',
    aguardando_conta: 'Aguardando Conta de Luz', conta_recebida: 'Conta Recebida',
    proposta_enviada: 'Proposta Enviada', em_negociacao: 'Em Análise / Negociação',
    fechado_ganho: 'Fechado (Ganho) ✅', cobrar_comprovante: 'Cobrar Comprovante',
    fechado_perdido: 'Fechado (Perdido) ❌',
  }

  const pendingTasks  = tasks.filter(t => !t.concluida)
  const overdueTasks  = pendingTasks.filter(t => new Date(t.dataVencimento) < new Date())

  const systemPrompt = `Você é o assistente de IA do CRM Matrix Energia — sistema de gestão de leads para consultor de vendas no Mercado Livre de Energia.

CONSULTOR: ${config.nomeConsultor || 'Consultor'}
DATA/HORA: ${now} (horário de Brasília)
METAS DO MÊS: ${config.metaLeadsMes || 20} leads / ${config.metaContratosMes || 5} contratos

══════ LEADS (${leads.length} total) ══════
${leads.length === 0 ? 'Nenhum lead cadastrado.' : leads.map(l =>
  `[${l.id}] ${l.nome} | ${l.telefone}${l.email ? ` | ${l.email}` : ''} | ${l.cidade || '?'}/${l.uf || '?'} | ${stageNames[l.status] || l.status}${l.consumoMedio ? ` | ${l.consumoMedio} kWh` : ''}${l.valorEstimado ? ` | R$${l.valorEstimado}/mês` : ''}${l.anotacoes ? ` | Nota: ${l.anotacoes.slice(0, 60)}` : ''}`
).join('\n')}

══════ TAREFAS PENDENTES (${pendingTasks.length}, ${overdueTasks.length} em atraso) ══════
${pendingTasks.length === 0 ? 'Nenhuma tarefa pendente.' : pendingTasks.map(t => {
  const lead = leads.find(l => l.id === t.leadId)
  return `[${t.id}] ${t.descricao} | Vence: ${t.dataVencimento?.slice(0,10)}${lead ? ` | Lead: ${lead.nome}` : ' | Tarefa avulsa'}`
}).join('\n')}

══════ INTERAÇÕES RECENTES (${Math.min(interactions.length, 30)} de ${interactions.length}) ══════
${interactions.length === 0 ? 'Nenhuma interação registrada.' : interactions.slice(0, 30).map(i => {
  const lead = leads.find(l => l.id === i.leadId)
  return `${i.data?.slice(0,10)} | ${lead?.nome || '?'} | ${i.canal} | ${i.nota?.slice(0, 80)}`
}).join('\n')}

══════ INSTRUÇÕES ══════
• Use as ferramentas para criar, editar e gerenciar dados quando solicitado.
• Após executar ações, confirme o que foi feito de forma clara.
• Para análises, seja proativo em sugerir próximos passos.
• Responda SEMPRE em português brasileiro. Seja direto e objetivo.
• Quando o usuário mencionar um lead pelo nome (parcial), localize o ID correto antes de agir.`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools: TOOLS,
    })
    return res.json(response)
  } catch (err) {
    console.error('[chat] Anthropic error:', err.message)
    return res.status(500).json({ error: err.message || 'Erro ao chamar Claude API' })
  }
}
