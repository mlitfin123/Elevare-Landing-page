import type { StageLabMethodologyMessages } from "../../lib/i18n/stagelab-methodology-messages.ts";

const messages: StageLabMethodologyMessages = {
  eyebrow: "Por dentro do método",
  title: "Como a StageLab toma decisões",
  lead: "A IA também precisa ser compreensível.",
  body: "A StageLab combina avaliações assistidas por modelos com regras consistentes de preparação, evolução ao longo do tempo, contexto da categoria e verificações de segurança. A IA contribui para a avaliação; ela não controla seu plano de preparação por conta própria.",
  scope: "Esta metodologia descreve a preparação contínua para competir no app StageLab. As análises avulsas do site avaliam um momento específico: elas não gerenciam um plano de preparação nem estabelecem um histórico de evolução.",
  cards: {
    readiness: {
      title: "Prontidão visual para o palco",
      body: "Condicionamento, volume muscular aparente, muscularidade, simetria e apresentação são considerados junto à qualidade das imagens e ao histórico comparável disponível. As observações assistidas por modelos passam por verificações determinísticas para estimar uma faixa de tempo adicional de condicionamento necessário.",
      note: "A estimativa de prontidão é aproximada, inclusive quando aparece como um único número de semanas.",
    },
    progress: {
      title: "Evolução ao longo do tempo",
      body: "Quando há histórico comparável, a StageLab pode comparar o check-in atual com os anteriores, o ponto de partida do ciclo, uma referência salva ou o melhor físico registrado, e as tendências de peso e cintura. Ela considera se a diferença de condicionamento está diminuindo à medida que a competição se aproxima.",
      note: "O primeiro check-in estabelece uma referência inicial. Ele não pode demonstrar uma tendência real ao longo do tempo.",
    },
    bodyFat: {
      title: "Contexto de gordura corporal",
      body: "Uma faixa estimada de gordura corporal oferece contexto adicional. Ela não pode determinar sozinha a prontidão para o palco. Uma divergência relevante em relação a evidências visuais mais fortes pode reduzir a confiança, em vez de forçar uma resposta aparentemente certa.",
      note: "Estimativas de gordura corporal por fotos são aproximações, não medições de laboratório.",
    },
    adjustments: {
      title: "Decisões de nutrição e cardio",
      body: "Antes de sugerir uma mudança, a StageLab considera evolução, prontidão, adesão ao plano, recuperação, fase, intervenções recentes, atividade atual, manutenção estimada e limites de segurança. Em geral, prioriza ajustes graduais, mas evidências persistentes ou urgentes podem justificar mudanças combinadas de calorias e atividade.",
      note: "Estar atrasado não gera automaticamente um corte de calorias.",
    },
    division: {
      title: "Contexto de cada categoria",
      body: "Categorias diferentes pedem físicos diferentes. Condicionamento, volume muscular aparente, muscularidade, simetria e apresentação são interpretados no contexto da categoria selecionada, incluindo a possibilidade de condicionamento excessivo.",
      note: "Os padrões da StageLab são critérios práticos de coaching baseados nas características das categorias. Eles não são critérios oficiais de julgamento de federações.",
    },
    confidence: {
      title: "Confiança e incerteza",
      body: "Qualidade das fotos, falta de histórico, medidas inconsistentes, diferenças de pose e divergências entre sinais podem reduzir a confiança, ampliar uma estimativa ou levar a um resultado mais conservador. Evidências limitadas podem acionar uma alternativa mais prudente ou impedir conclusões sem respaldo.",
      note: "A confiança da StageLab reflete a qualidade e a consistência das evidências disponíveis. Ela não é uma probabilidade calibrada cientificamente.",
    },
  },
  posing: {
    eyebrow: "Posing Coach",
    title: "As poses são avaliadas separadamente",
    body: "O Posing Coach analisa a execução das poses e a apresentação a partir de quadros extraídos do seu vídeo e organizados em sequência. A análise considera a execução específica da categoria, os pontos fortes, as correções e a qualidade da apresentação.",
    separation: "As notas de poses não alteram:",
    unaffected: ["Estimativas de gordura corporal", "Prontidão do físico para o palco", "Calorias", "Cardio", "Decisões da semana de pico"],
    note: "A nota de poses descreve a apresentação. Ela não é uma nota oficial de julgamento, de condicionamento ou de prontidão, nem uma previsão de colocação.",
  },
  flow: {
    title: "Das evidências à decisão sobre o plano",
    inputsLabel: "Contexto disponível do check-in",
    inputs: ["Avaliação visual", "Contexto da categoria", "Evolução ao longo do tempo", "Tendências de peso e cintura", "Adesão e recuperação", "Histórico do plano"],
    steps: ["Prontidão após conciliar os sinais", "Verificações de segurança e fase", "Manter ou ajustar de forma gradual"],
    caption: "Uma visão conceitual do processo de revisão. Os dados não têm o mesmo peso, e nem todo check-in conta com todas as informações.",
  },
  detailsTitle: "Saiba mais sobre a metodologia",
  details: {
    readiness: {
      title: "Como os sinais de prontidão visual são conciliados",
      paragraphs: ["A StageLab combina observações visuais assistidas por modelos com verificações determinísticas de preparação e o contexto da categoria do atleta. A gordura corporal oferece contexto; ela não se sobrepõe a evidências mais fortes nem se torna a única resposta.", "O resultado geralmente apresenta uma faixa estimada de prontidão. Quando aparece uma estimativa com um único número de semanas, ela também é aproximada. Sinais conflitantes podem ampliar a incerteza, em vez de produzir uma data exata para estar pronto."],
    },
    history: {
      title: "Como o histórico de evolução é usado",
      paragraphs: ["Comparações úteis exigem fotos e medidas suficientemente consistentes. Quando esses registros existem, a StageLab pode revisar o check-in anterior, o ponto de partida do ciclo, uma referência salva ou o melhor físico registrado, e as tendências de peso e cintura.", "Ela considera a direção da mudança e se a diferença de condicionamento restante está diminuindo em relação ao tempo disponível. Um histórico ausente ou pouco comparável limita essa conclusão; o primeiro check-in oferece uma referência inicial, não uma tendência demonstrada."],
    },
    maintenance: {
      title: "Como a StageLab estima as calorias de manutenção",
      paragraphs: ["A StageLab começa com uma estimativa por fórmula ajustada à atividade. Quando há dados confiáveis em quantidade suficiente, ela pode incorporar a ingestão calórica de dias com registros concluídos e as tendências das médias semanais de peso.", "A influência dos dados observados depende da qualidade deles. O sistema limita mudanças bruscas causadas por oscilações de curto prazo. Trata-se de uma estimativa adaptativa de manutenção, não de uma medição exata do gasto energético diário total."],
    },
    recovery: {
      title: "Por que a StageLab pode manter o plano em vez de cortar",
      paragraphs: ["Recuperação, adesão ao plano, sinais de lesão relatados, queda de desempenho, intervenções recentes e estresse acumulado podem levar a StageLab a manter, suavizar ou reconsiderar um ajuste que seria agressivo.", "Um ajuste gradual pode precisar de tempo para mostrar efeito. Evidências persistentes ou urgentes ainda podem justificar mudanças combinadas de calorias e atividade. São cuidados informativos para a preparação, não monitoramento médico nem substitutos de atendimento qualificado."],
    },
    peakWeek: {
      title: "A semana de pico usa uma lógica própria",
      paragraphs: ["À medida que a competição se aproxima, a StageLab passa da lógica habitual de preparação para um planejamento específico da semana de pico. O contexto visual e de preparação de cada dia orienta essa revisão, em vez de apenas prolongar os ajustes semanais habituais.", "A StageLab não automatiza desidratação, cortes de água, manipulação de sódio ou uso de diuréticos."],
    },
    posing: {
      title: "Por que as poses permanecem separadas",
      paragraphs: ["Seu físico e a forma como você o apresenta estão relacionados, mas respondem a perguntas diferentes. Os quadros ordenados do vídeo ajudam a avaliar a execução das poses, os pontos fortes, as correções e a apresentação na categoria selecionada.", "As notas de poses não entram nas estimativas de gordura corporal, na prontidão do físico, nas recomendações de calorias ou cardio, nem nas decisões da semana de pico. Elas não preveem resultados de julgamento."],
    },
  },
  limits: {
    title: "O que a StageLab não promete",
    intro: "A StageLab oferece informações para apoiar sua revisão. Ela não fornece:",
    items: ["Medições de gordura corporal de laboratório", "Diagnósticos médicos ou atendimento nutricional por profissional habilitado", "Prontidão garantida ou uma data exata para estar pronto", "Colocação garantida ou resultados exatos de competição", "Notas oficiais de julgamento", "Uma medição perfeita do gasto energético diário total"],
    posing: "As notas de poses da StageLab não representam condicionamento ou prontidão do físico para o palco.",
    guidance: "Esses critérios práticos de coaching não são leis fisiológicas nem previsões de prontidão validadas cientificamente. Os resultados podem ser imprecisos ou incompletos; revise-os com orientação profissional adequada.",
  },
  transition: "Entenda o raciocínio por trás da sua próxima decisão de preparação.",
};

export default messages;
