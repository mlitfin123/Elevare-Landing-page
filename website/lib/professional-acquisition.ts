import type { Locale } from "./i18n/config.ts";

type QueryLike = Pick<URLSearchParams, "get">;

const ACQUISITION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const SAFE_ACQUISITION_VALUE = /^[a-z0-9][a-z0-9 ._-]{0,79}$/i;

export type ProfessionalAcquisitionAttribution = Partial<Record<(typeof ACQUISITION_FIELDS)[number], string>>;

export function readProfessionalAcquisitionAttribution(params: QueryLike): ProfessionalAcquisitionAttribution {
  return Object.fromEntries(
    ACQUISITION_FIELDS.flatMap((field) => {
      const value = params.get(field)?.trim();
      return value && SAFE_ACQUISITION_VALUE.test(value) ? [[field, value]] : [];
    }),
  ) as ProfessionalAcquisitionAttribution;
}

export function readProfessionalAcquisitionMetadata(value: unknown): ProfessionalAcquisitionAttribution {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const metadata = value as Record<string, unknown>;
  return readProfessionalAcquisitionAttribution({
    get(field) {
      const candidate = metadata[field];
      return typeof candidate === "string" ? candidate : null;
    },
  });
}

export function professionalAcquisitionAnalytics(attribution: ProfessionalAcquisitionAttribution) {
  return {
    acquisition_source: attribution.utm_source ?? "direct",
    acquisition_medium: attribution.utm_medium,
    acquisition_campaign: attribution.utm_campaign,
    acquisition_content: attribution.utm_content,
  };
}

export function appendProfessionalAcquisitionParams(pathname: string, attribution: ProfessionalAcquisitionAttribution) {
  const url = new URL(pathname, "https://www.elevarefit.com");
  for (const field of ACQUISITION_FIELDS) {
    const value = attribution[field];
    if (value) url.searchParams.set(field, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getProfessionalSignupHref(locale: Locale, attribution: ProfessionalAcquisitionAttribution = {}) {
  const params = new URLSearchParams({ intent: "professional" });
  if (locale !== "en") params.set("locale", locale);
  for (const field of ACQUISITION_FIELDS) {
    const value = attribution[field];
    if (value) params.set(field, value);
  }
  return `/sign-in/?${params.toString()}`;
}

type Step = { title: string; body: string };
type Faq = { question: string; answer: string };
type VisionCard = { label: string; title: string; body: string };
type RoadmapStage = { label: string; title: string; body: string };

export type ProfessionalAcquisitionCopy = {
  seo: { title: string; description: string };
  hero: { eyebrow: string; title: string; body: string; detail: string; cta: string; trustLine: string };
  profile: { eyebrow: string; title: string; body: string; photo: string; titleField: string; specialties: string; credentials: string; services: string; pricing: string; location: string; availability: string };
  vision: { eyebrow: string; title: string; body: string; cards: readonly VisionCard[] };
  founding: { eyebrow: string; title: string; body: string; note: string };
  roadmap: { eyebrow: string; title: string; stages: readonly RoadmapStage[] };
  app: { eyebrow: string; title: string; body: string; points: readonly string[]; status: string };
  steps: { eyebrow: string; title: string; items: readonly Step[] };
  categories: { eyebrow: string; title: string; body: string };
  transparency: { eyebrow: string; title: string; body: string };
  faq: { eyebrow: string; title: string; items: readonly Faq[] };
  closing: { eyebrow: string; title: string; body: string; cta: string; trustLine: string };
  signup: { headline: string; description: string; benefit: string; note: string; showPassword: string; hidePassword: string };
  actions: { continueProfile: string; viewApplicationStatus: string; manageProfile: string };
};

export const professionalAcquisitionMessages = {
  en: {
    seo: { title: "Join Elevare as a Fitness & Wellness Professional", description: "Create your Elevare professional profile, showcase your services and specialties, set your rates, and establish your presence as Elevare grows." },
    hero: {
      eyebrow: "ELEVARE FOUNDING PROFESSIONALS",
      title: "Join Elevare as a Founding Professional",
      body: "Build your presence now and be among the first fitness and wellness professionals available as Elevare expands across web and mobile.",
      detail: "Create your profile, showcase your services, and establish your presence before the Elevare app launches.",
      cta: "Become a Founding Professional",
      trustLine: "Free to join • No subscription • Set your own rates",
    },
    profile: {
      eyebrow: "YOUR PROFESSIONAL PRESENCE ON ELEVARE",
      title: "Your profile should explain more than your job title.",
      body: "Show clients your specialties, services, credentials, pricing, location or service area, typical availability, experience, and approach so they can make a more informed decision before reaching out.",
      photo: "Your professional photo", titleField: "Your professional title", specialties: "Specialties", credentials: "Credentials", services: "Services", pricing: "Pricing", location: "Location or service area", availability: "Availability",
    },
    vision: {
      eyebrow: "MORE THAN A DIRECTORY",
      title: "Built to help the right clients find the right professionals.",
      body: "Elevare is being built to give clients more useful information about the professionals they consider — and give qualified professionals better ways to communicate what makes their services different.",
      cards: [
        { label: "AVAILABLE NOW • IN DEVELOPMENT", title: "Smarter discovery & matching", body: "Clients can already browse professional profiles by category, specialty, service mode, location, and other listing details. More guided and automated matching tools are in development." },
        { label: "AVAILABLE NOW", title: "Decision-ready profiles", body: "Give potential clients useful information about your specialties, credentials, services, pricing, availability, experience, and approach before they reach out." },
        { label: "AVAILABLE NOW", title: "Guided client matching", body: "Clients can define preferences, save professionals, request consultations, and submit a concierge matching request. Elevare reviews requests and may introduce professionals who confirm availability." },
        { label: "COMING TO ELEVARE", title: "Professional tools that grow with Elevare", body: "Founding Professionals establish their presence early as Elevare develops its marketplace, matching tools, and mobile experience. Early professionals may be invited to share feedback as those tools develop." },
      ],
    },
    founding: {
      eyebrow: "FOUNDING PROFESSIONAL",
      title: "Establish your presence from the beginning.",
      body: "Founding Professionals are establishing their presence while Elevare develops the next generation of client-professional discovery. They complete the same profile and review process as every other professional.",
      note: "Founding Professional describes joining during Elevare’s early network build. It does not change review standards, search placement, or guarantee leads, bookings, or revenue.",
    },
    roadmap: {
      eyebrow: "THE ELEVARE VISION",
      title: "Built for where fitness and wellness discovery is going.",
      stages: [
        { label: "TODAY", title: "Discovery and decision tools", body: "Clients can browse approved profiles, define preferences, save professionals, request consultations, and use Elevare’s reviewed concierge matching requests." },
        { label: "IN DEVELOPMENT", title: "More guided discovery and mobile", body: "Elevare is developing a mobile experience and more ways to make client discovery and recommendations useful." },
        { label: "AS ELEVARE GROWS", title: "Smarter automated matching", body: "Elevare is being developed to help connect clients with professionals based on factors such as goals, preferences, specialties, services, location, and other relevant fit criteria." },
      ],
    },
    app: {
      eyebrow: "BUILD YOUR PRESENCE BEFORE MOBILE", title: "Establish your presence before Elevare expands to mobile.", body: "Founding Professionals can establish their Elevare presence now as the marketplace expands toward a mobile experience.",
      points: ["Establish your profile before launch", "Prepare services and specialties", "Keep your professional information current", "Participate in future professional tools as they become available"],
      status: "IN DEVELOPMENT — The Elevare marketplace mobile experience is not available yet.",
    },
    steps: {
      eyebrow: "HOW IT WORKS", title: "How Elevare works for professionals",
      items: [
        { title: "Create your free account", body: "Start with your email and password." },
        { title: "Build your professional profile", body: "Add your services, specialties, credentials, pricing, and other professional details." },
        { title: "Submit for review", body: "Elevare reviews professional profiles to help maintain marketplace quality." },
        { title: "Get discovered", body: "Approved profiles can appear to potential clients searching Elevare." },
      ],
    },
    categories: { eyebrow: "WHO CAN JOIN?", title: "Built for the professionals Elevare supports.", body: "Choose the category that accurately describes your work. Elevare supports the following current professional categories." },
    transparency: { eyebrow: "TRUST STARTS WITH CLEAR SIGNALS", title: "Profile review is live. Every trust signal is specific.", body: "Professional profiles are reviewed before marketplace publication. Information, availability, and any credential or trust status shown on a public profile are individual signals; they do not mean every professional is verified." },
    faq: {
      eyebrow: "FAQ", title: "Questions before you join?",
      items: [
        { question: "Is Elevare free to join?", answer: "Yes. Creating and maintaining a professional profile is free today, with no subscription." },
        { question: "Do I set my own rates?", answer: "Yes. You can add pricing to your services and profile so clients can understand your pricing context." },
        { question: "Do I need to finish my profile immediately?", answer: "No. You can save a draft, return to it, and submit it for review when you are ready." },
        { question: "How does professional review work?", answer: "When you submit a complete profile, it is reviewed before it can appear in public Elevare search." },
        { question: "Is the Elevare app available yet?", answer: "The Elevare marketplace is available on the web. Its mobile experience is still in development." },
        { question: "What does Founding Professional mean?", answer: "It means you are joining during Elevare’s early professional-network build. It does not guarantee client leads, bookings, revenue, or preferential ranking." },
        { question: "Will joining Elevare guarantee clients?", answer: "No. Elevare provides discovery and marketplace infrastructure, but cannot guarantee client leads, bookings, or revenue." },
      ],
    },
    closing: { eyebrow: "BUILD YOUR PRESENCE EARLY", title: "Become an Elevare Founding Professional", body: "Create your professional profile and establish your presence as Elevare grows its fitness and wellness network.", cta: "Create My Free Profile", trustLine: "Free to join • No subscription • Set your own rates" },
    signup: { headline: "Create your professional profile", description: "Start by creating an account. Next, add your services, specialties, and professional details to build your listing.", benefit: "Free to join. Build your profile at your own pace.", note: "Creating your account is free. Build your profile at your own pace and submit it for review when you’re ready.", showPassword: "Show password", hidePassword: "Hide password" },
    actions: { continueProfile: "Continue Your Professional Profile", viewApplicationStatus: "View Application Status", manageProfile: "Manage Professional Profile" },
  },
  "es-419": {
    seo: { title: "Únete a Elevare como profesional de fitness y bienestar", description: "Crea tu perfil profesional de Elevare, muestra tus servicios y especialidades, define tus tarifas y establece tu presencia mientras Elevare crece." },
    hero: { eyebrow: "PROFESIONALES FUNDADORES DE ELEVARE", title: "Únete a Elevare como profesional fundador", body: "Crea tu presencia ahora y forma parte de los primeros profesionales de fitness y bienestar disponibles mientras Elevare se expande en web y móvil.", detail: "Crea tu perfil, muestra tus servicios y establece tu presencia antes del lanzamiento de la app de Elevare.", cta: "Ser profesional fundador", trustLine: "Gratis para unirte • Sin suscripción • Define tus propias tarifas" },
    profile: { eyebrow: "TU PRESENCIA PROFESIONAL EN ELEVARE", title: "Tu perfil debe explicar más que tu cargo profesional.", body: "Muestra a los clientes tus especialidades, servicios, credenciales, precios, ubicación o zona de servicio, disponibilidad habitual, experiencia y enfoque para que tomen una decisión más informada antes de contactarte.", photo: "Tu foto profesional", titleField: "Tu título profesional", specialties: "Especialidades", credentials: "Credenciales", services: "Servicios", pricing: "Precios", location: "Ubicación o zona de servicio", availability: "Disponibilidad" },
    vision: { eyebrow: "MÁS QUE UN DIRECTORIO", title: "Diseñado para ayudar a que los clientes adecuados encuentren a los profesionales adecuados.", body: "Elevare se está creando para dar a los clientes información más útil sobre los profesionales que consideran y para dar a los profesionales calificados mejores formas de comunicar lo que hace diferentes a sus servicios.", cards: [
      { label: "DISPONIBLE AHORA • EN DESARROLLO", title: "Descubrimiento y coincidencias más inteligentes", body: "Los clientes ya pueden explorar perfiles profesionales por categoría, especialidad, modalidad de servicio, ubicación y otros datos del perfil. Se están desarrollando más herramientas de orientación y coincidencias automatizadas." },
      { label: "DISPONIBLE AHORA", title: "Perfiles listos para decidir", body: "Da a los posibles clientes información útil sobre tus especialidades, credenciales, servicios, precios, disponibilidad, experiencia y enfoque antes de que te contacten." },
      { label: "DISPONIBLE AHORA", title: "Orientación para encontrar profesionales", body: "Los clientes pueden definir preferencias, guardar profesionales, solicitar consultas y enviar una solicitud de coincidencia con concierge. Elevare revisa las solicitudes y puede presentar profesionales que confirmen disponibilidad." },
      { label: "PRÓXIMAMENTE EN ELEVARE", title: "Herramientas profesionales que crecen con Elevare", body: "Los profesionales fundadores establecen su presencia temprano mientras Elevare desarrolla su marketplace, herramientas de coincidencia y experiencia móvil. Los primeros profesionales pueden ser invitados a compartir comentarios mientras esas herramientas avanzan." },
    ] },
    founding: { eyebrow: "PROFESIONAL FUNDADOR", title: "Establece tu presencia desde el principio.", body: "Los profesionales fundadores establecen su presencia mientras Elevare desarrolla la próxima generación de descubrimiento entre clientes y profesionales. Completan el mismo proceso de perfil y revisión que los demás profesionales.", note: "Profesional fundador describe unirse durante la construcción de la red inicial de Elevare. No cambia los estándares de revisión, la posición en búsqueda ni garantiza contactos, reservas o ingresos." },
    roadmap: { eyebrow: "LA VISIÓN DE ELEVARE", title: "Preparada para el futuro del descubrimiento de fitness y bienestar.", stages: [
      { label: "HOY", title: "Herramientas para descubrir y decidir", body: "Los clientes pueden explorar perfiles aprobados, definir preferencias, guardar profesionales, solicitar consultas y usar las solicitudes de coincidencia con concierge revisadas por Elevare." },
      { label: "EN DESARROLLO", title: "Más orientación y experiencia móvil", body: "Elevare está desarrollando una experiencia móvil y más formas de hacer útil el descubrimiento y las recomendaciones para clientes." },
      { label: "A MEDIDA QUE ELEVARE CRECE", title: "Coincidencias automatizadas más inteligentes", body: "Elevare se está desarrollando para ayudar a conectar clientes con profesionales según factores como objetivos, preferencias, especialidades, servicios, ubicación y otros criterios de compatibilidad relevantes." },
    ] },
    app: { eyebrow: "CREA TU PRESENCIA ANTES DEL MÓVIL", title: "Establece tu presencia antes de que Elevare se expanda a móvil.", body: "Los profesionales fundadores pueden establecer ahora su presencia en Elevare mientras el marketplace avanza hacia una experiencia móvil.", points: ["Establece tu perfil antes del lanzamiento", "Prepara servicios y especialidades", "Mantén actualizada tu información profesional", "Participa en futuras herramientas profesionales cuando estén disponibles"], status: "EN DESARROLLO — La experiencia móvil del marketplace de Elevare aún no está disponible." },
    steps: { eyebrow: "CÓMO FUNCIONA", title: "Cómo funciona Elevare para profesionales", items: [
      { title: "Crea tu cuenta gratis", body: "Comienza con tu correo y contraseña." },
      { title: "Crea tu perfil profesional", body: "Agrega tus servicios, especialidades, credenciales, precios y otros datos profesionales." },
      { title: "Envía para revisión", body: "Elevare revisa perfiles profesionales para ayudar a mantener la calidad del marketplace." },
      { title: "Hazte visible", body: "Los perfiles aprobados pueden aparecer para clientes potenciales que buscan en Elevare." },
    ] },
    categories: { eyebrow: "¿QUIÉN PUEDE UNIRSE?", title: "Pensado para los profesionales que Elevare admite.", body: "Elige la categoría que describe con precisión tu trabajo. Elevare admite actualmente las siguientes categorías profesionales." },
    transparency: { eyebrow: "LA CONFIANZA COMIENZA CON SEÑALES CLARAS", title: "La revisión de perfiles está disponible. Cada señal de confianza es específica.", body: "Los perfiles profesionales se revisan antes de publicarse en el marketplace. La información, disponibilidad y cualquier estado de credencial o confianza mostrado en un perfil público son señales individuales; no significan que todos los profesionales estén verificados." },
    faq: { eyebrow: "PREGUNTAS FRECUENTES", title: "¿Preguntas antes de unirte?", items: [
      { question: "¿Es gratis unirse a Elevare?", answer: "Sí. Crear y mantener un perfil profesional es gratis actualmente y no requiere suscripción." },
      { question: "¿Yo defino mis tarifas?", answer: "Sí. Puedes agregar precios a tus servicios y perfil para que los clientes entiendan tu contexto de precios." },
      { question: "¿Debo terminar mi perfil de inmediato?", answer: "No. Puedes guardar un borrador, volver a él y enviarlo a revisión cuando estés listo." },
      { question: "¿Cómo funciona la revisión profesional?", answer: "Cuando envías un perfil completo, se revisa antes de que pueda aparecer en la búsqueda pública de Elevare." },
      { question: "¿La app de Elevare ya está disponible?", answer: "El marketplace de Elevare está disponible en la web. Su experiencia móvil aún está en desarrollo." },
      { question: "¿Qué significa Profesional Fundador?", answer: "Significa que te unes durante la construcción de la red profesional inicial de Elevare. No garantiza contactos, reservas, ingresos ni posición preferente." },
      { question: "¿Unirme a Elevare garantiza clientes?", answer: "No. Elevare ofrece infraestructura de descubrimiento y marketplace, pero no puede garantizar contactos, reservas ni ingresos." },
    ] },
    closing: { eyebrow: "CREA TU PRESENCIA TEMPRANO", title: "Conviértete en profesional fundador de Elevare", body: "Crea tu perfil profesional y establece tu presencia mientras Elevare amplía su red de fitness y bienestar.", cta: "Crear mi perfil gratis", trustLine: "Gratis para unirte • Sin suscripción • Define tus propias tarifas" },
    signup: { headline: "Crea tu perfil profesional", description: "Comienza creando una cuenta. Después, agrega tus servicios, especialidades y datos profesionales para crear tu perfil público.", benefit: "Gratis para unirte. Crea tu perfil a tu propio ritmo.", note: "Crear tu cuenta es gratis. Crea tu perfil a tu propio ritmo y envíalo a revisión cuando estés listo.", showPassword: "Mostrar contraseña", hidePassword: "Ocultar contraseña" },
    actions: { continueProfile: "Continúa tu perfil profesional", viewApplicationStatus: "Ver estado de la solicitud", manageProfile: "Administrar perfil profesional" },
  },
  "pt-BR": {
    seo: { title: "Junte-se à Elevare como profissional de fitness e bem-estar", description: "Crie seu perfil profissional na Elevare, apresente seus serviços e especialidades, defina seus preços e estabeleça sua presença enquanto a Elevare cresce." },
    hero: { eyebrow: "PROFISSIONAIS FUNDADORES DA ELEVARE", title: "Junte-se à Elevare como profissional fundador", body: "Construa sua presença agora e esteja entre os primeiros profissionais de fitness e bem-estar disponíveis enquanto a Elevare se expande na web e no mobile.", detail: "Crie seu perfil, apresente seus serviços e estabeleça sua presença antes do lançamento do app da Elevare.", cta: "Tornar-se profissional fundador", trustLine: "Grátis para entrar • Sem assinatura • Defina seus próprios preços" },
    profile: { eyebrow: "SUA PRESENÇA PROFISSIONAL NA ELEVARE", title: "Seu perfil deve explicar mais do que seu cargo profissional.", body: "Mostre aos clientes suas especialidades, serviços, credenciais, preços, localização ou área de atendimento, disponibilidade habitual, experiência e abordagem para que decidam com mais informação antes de entrar em contato.", photo: "Sua foto profissional", titleField: "Seu título profissional", specialties: "Especialidades", credentials: "Credenciais", services: "Serviços", pricing: "Preços", location: "Localização ou área de atendimento", availability: "Disponibilidade" },
    vision: { eyebrow: "MAIS QUE UM DIRETÓRIO", title: "Criada para ajudar os clientes certos a encontrar os profissionais certos.", body: "A Elevare está sendo desenvolvida para dar aos clientes informações mais úteis sobre os profissionais que consideram e dar aos profissionais qualificados melhores formas de comunicar o que diferencia seus serviços.", cards: [
      { label: "DISPONÍVEL AGORA • EM DESENVOLVIMENTO", title: "Descoberta e correspondência mais inteligentes", body: "Os clientes já podem explorar perfis profissionais por categoria, especialidade, modalidade de serviço, localização e outros detalhes do perfil. Mais ferramentas de orientação e correspondência automatizada estão em desenvolvimento." },
      { label: "DISPONÍVEL AGORA", title: "Perfis prontos para a decisão", body: "Dê a possíveis clientes informações úteis sobre suas especialidades, credenciais, serviços, preços, disponibilidade, experiência e abordagem antes de entrarem em contato." },
      { label: "DISPONÍVEL AGORA", title: "Orientação para encontrar profissionais", body: "Os clientes podem definir preferências, salvar profissionais, solicitar consultas e enviar uma solicitação de correspondência concierge. A Elevare analisa as solicitações e pode apresentar profissionais que confirmem disponibilidade." },
      { label: "EM BREVE NA ELEVARE", title: "Ferramentas profissionais que crescem com a Elevare", body: "Profissionais fundadores estabelecem sua presença cedo enquanto a Elevare desenvolve seu marketplace, ferramentas de correspondência e experiência mobile. Profissionais iniciais podem ser convidados a compartilhar feedback enquanto essas ferramentas evoluem." },
    ] },
    founding: { eyebrow: "PROFISSIONAL FUNDADOR", title: "Estabeleça sua presença desde o começo.", body: "Profissionais fundadores estabelecem sua presença enquanto a Elevare desenvolve a próxima geração de descoberta entre clientes e profissionais. Eles passam pelo mesmo processo de perfil e análise de todos os profissionais.", note: "Profissional fundador descreve entrar durante a construção da rede inicial da Elevare. Ele não altera padrões de análise, posição na busca nem garante contatos, reservas ou receita." },
    roadmap: { eyebrow: "A VISÃO DA ELEVARE", title: "Feita para o futuro da descoberta de fitness e bem-estar.", stages: [
      { label: "HOJE", title: "Ferramentas para descobrir e decidir", body: "Os clientes podem explorar perfis aprovados, definir preferências, salvar profissionais, solicitar consultas e usar as solicitações de correspondência concierge analisadas pela Elevare." },
      { label: "EM DESENVOLVIMENTO", title: "Mais orientação e experiência mobile", body: "A Elevare está desenvolvendo uma experiência mobile e mais formas de tornar úteis a descoberta e as recomendações para clientes." },
      { label: "À MEDIDA QUE A ELEVARE CRESCE", title: "Correspondência automatizada mais inteligente", body: "A Elevare está sendo desenvolvida para ajudar a conectar clientes a profissionais com base em fatores como objetivos, preferências, especialidades, serviços, localização e outros critérios de compatibilidade relevantes." },
    ] },
    app: { eyebrow: "CRIE SUA PRESENÇA ANTES DO MOBILE", title: "Estabeleça sua presença antes de a Elevare expandir para mobile.", body: "Profissionais fundadores podem estabelecer agora sua presença na Elevare enquanto o marketplace avança rumo a uma experiência mobile.", points: ["Estabeleça seu perfil antes do lançamento", "Prepare serviços e especialidades", "Mantenha suas informações profissionais atualizadas", "Participe de futuras ferramentas profissionais quando estiverem disponíveis"], status: "EM DESENVOLVIMENTO — A experiência mobile do marketplace da Elevare ainda não está disponível." },
    steps: { eyebrow: "COMO FUNCIONA", title: "Como a Elevare funciona para profissionais", items: [
      { title: "Crie sua conta grátis", body: "Comece com seu e-mail e senha." },
      { title: "Monte seu perfil profissional", body: "Adicione seus serviços, especialidades, credenciais, preços e outros dados profissionais." },
      { title: "Envie para análise", body: "A Elevare analisa perfis profissionais para ajudar a manter a qualidade do marketplace." },
      { title: "Seja encontrado", body: "Perfis aprovados podem aparecer para possíveis clientes que pesquisam na Elevare." },
    ] },
    categories: { eyebrow: "QUEM PODE ENTRAR?", title: "Feito para os profissionais que a Elevare oferece suporte.", body: "Escolha a categoria que descreve seu trabalho com precisão. A Elevare atualmente oferece suporte às seguintes categorias profissionais." },
    transparency: { eyebrow: "A CONFIANÇA COMEÇA COM SINAIS CLAROS", title: "A análise de perfis está disponível. Cada sinal de confiança é específico.", body: "Perfis profissionais são analisados antes da publicação no marketplace. Informações, disponibilidade e qualquer status de credencial ou confiança mostrado em um perfil público são sinais individuais; eles não significam que todos os profissionais sejam verificados." },
    faq: { eyebrow: "PERGUNTAS FREQUENTES", title: "Perguntas antes de entrar?", items: [
      { question: "É grátis entrar na Elevare?", answer: "Sim. Criar e manter um perfil profissional é grátis hoje e não exige assinatura." },
      { question: "Eu defino meus próprios preços?", answer: "Sim. Você pode adicionar preços aos seus serviços e perfil para que clientes entendam seu contexto de preços." },
      { question: "Preciso concluir meu perfil imediatamente?", answer: "Não. Você pode salvar um rascunho, voltar depois e enviar para análise quando estiver pronto." },
      { question: "Como funciona a análise profissional?", answer: "Quando você envia um perfil completo, ele é analisado antes de poder aparecer na busca pública da Elevare." },
      { question: "O app da Elevare já está disponível?", answer: "O marketplace da Elevare está disponível na web. Sua experiência mobile ainda está em desenvolvimento." },
      { question: "O que significa Profissional Fundador?", answer: "Significa que você entra durante a construção da rede profissional inicial da Elevare. Isso não garante contatos, reservas, receita ou posição preferencial." },
      { question: "Entrar na Elevare garante clientes?", answer: "Não. A Elevare oferece infraestrutura de descoberta e marketplace, mas não pode garantir contatos, reservas ou receita." },
    ] },
    closing: { eyebrow: "CONSTRUA SUA PRESENÇA CEDO", title: "Torne-se profissional fundador da Elevare", body: "Crie seu perfil profissional e estabeleça sua presença enquanto a Elevare amplia sua rede de fitness e bem-estar.", cta: "Criar meu perfil grátis", trustLine: "Grátis para entrar • Sem assinatura • Defina seus próprios preços" },
    signup: { headline: "Crie seu perfil profissional", description: "Comece criando uma conta. Depois, adicione seus serviços, especialidades e dados profissionais para criar seu perfil público.", benefit: "Grátis para entrar. Monte seu perfil no seu ritmo.", note: "Criar sua conta é grátis. Monte seu perfil no seu ritmo e envie para análise quando estiver pronto.", showPassword: "Mostrar senha", hidePassword: "Ocultar senha" },
    actions: { continueProfile: "Continue seu perfil profissional", viewApplicationStatus: "Ver status da inscrição", manageProfile: "Gerenciar perfil profissional" },
  },
} as const satisfies Record<Locale, ProfessionalAcquisitionCopy>;

export function getProfessionalAcquisitionCopy(locale: Locale) {
  return professionalAcquisitionMessages[locale] ?? professionalAcquisitionMessages.en;
}
