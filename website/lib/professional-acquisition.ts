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

export type ProfessionalAcquisitionCopy = {
  seo: { title: string; description: string };
  hero: { eyebrow: string; title: string; body: string; qualification: string; cta: string; trustLine: string };
  profile: { eyebrow: string; title: string; body: string; photo: string; titleField: string; specialties: string; credentials: string; services: string; pricing: string; location: string; availability: string };
  vision: { eyebrow: string; title: string; cards: readonly VisionCard[] };
  midCta: { eyebrow: string; title: string; body: string; trustLine: string };
  app: { eyebrow: string; title: string; body: string; points: readonly string[]; status: string };
  steps: { eyebrow: string; title: string; items: readonly Step[] };
  categories: { eyebrow: string; title: string; body: string; allLabel: string };
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
      eyebrow: "FITNESS & WELLNESS PROFESSIONALS",
      title: "Be one of Elevare's first 100 Founding Professionals",
      body: "Build your professional presence now and establish your profile as Elevare expands across web and mobile.",
      qualification: "Founding Professional status is available to the first 100 approved professionals.",
      cta: "Become a Founding Professional",
      trustLine: "Free to join • No subscription • Set your own rates",
    },
    profile: {
      eyebrow: "YOUR PROFESSIONAL PRESENCE ON ELEVARE",
      title: "Your professional presence on Elevare.",
      body: "Show clients who you are, what you offer, and what your services cost.",
      photo: "Your professional photo", titleField: "Your professional title", specialties: "Specialties", credentials: "Credentials", services: "Services", pricing: "Pricing", location: "Location or service area", availability: "Availability",
    },
    vision: {
      eyebrow: "MORE THAN A DIRECTORY",
      title: "Built to help the right clients find the right professionals.",
      cards: [
        { label: "AVAILABLE NOW", title: "Decision-ready profiles", body: "Show specialties, credentials, services, pricing, availability, experience, and approach before clients reach out." },
        { label: "AVAILABLE NOW", title: "Better professional discovery", body: "Clients can browse approved profiles, save favorites, request consultations, and use reviewed concierge requests." },
        { label: "AVAILABLE NOW", title: "Built around professional fit", body: "Structured client and professional information takes discovery beyond a basic name list." },
        { label: "COMING TO ELEVARE", title: "Smarter automated matching", body: "In development: tools that use goals, preferences, specialties, services, location, and related fit criteria." },
      ],
    },
    midCta: { eyebrow: "FOUNDING PROFESSIONALS", title: "Establish your presence from the beginning.", body: "Create your profile now and be part of the network as Elevare grows.", trustLine: "Free to join • First 100 approved professionals receive Founding Professional status" },
    app: {
      eyebrow: "BUILD YOUR PRESENCE EARLY", title: "Be ready as Elevare expands to mobile.", body: "Establish your profile now as the Elevare marketplace and professional experience expand.",
      points: ["Complete your profile early", "Establish your services and specialties", "Keep your professional information current", "Be part of the network as new tools are introduced"],
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
    categories: { eyebrow: "WHO CAN JOIN?", title: "Built for fitness and wellness professionals.", body: "Choose the category that accurately describes your work.", allLabel: "View all supported categories" },
    transparency: { eyebrow: "TRUST STARTS WITH CLEAR SIGNALS", title: "Professional profiles are reviewed before they go live.", body: "Profiles are reviewed before marketplace publication. Credentials, availability, and other trust information are displayed as specific signals and should not be interpreted as universal verification." },
    faq: {
      eyebrow: "FAQ", title: "Questions before you join?",
      items: [
        { question: "Is Elevare free to join?", answer: "Yes. Creating and maintaining a professional profile is free today, with no subscription." },
        { question: "Do I set my own rates?", answer: "Yes. Add pricing to your services and profile." },
        { question: "What does Founding Professional mean?", answer: "The first 100 approved professionals receive the status. It does not guarantee clients, revenue, or ranking." },
        { question: "How does professional review work?", answer: "Complete profiles are reviewed before public marketplace publication." },
        { question: "Is the Elevare app available yet?", answer: "The marketplace is on the web; mobile is still in development." },
        { question: "Will joining Elevare guarantee clients?", answer: "No. Elevare cannot guarantee leads, bookings, or revenue." },
      ],
    },
    closing: { eyebrow: "FIRST 100 APPROVED PROFESSIONALS", title: "Become an Elevare Founding Professional", body: "Create your professional profile and establish your presence as Elevare grows its fitness and wellness network.", cta: "Become a Founding Professional", trustLine: "Free to join • No subscription • Set your own rates" },
    signup: { headline: "Create your professional profile", description: "Start by creating an account. Next, add your services, specialties, and professional details to build your listing.", benefit: "Free to join. Build your profile at your own pace.", note: "Creating your account is free. Build your profile at your own pace and submit it for review when you’re ready.", showPassword: "Show password", hidePassword: "Hide password" },
    actions: { continueProfile: "Continue Your Professional Profile", viewApplicationStatus: "View Application Status", manageProfile: "Manage Professional Profile" },
  },
  "es-419": {
    seo: { title: "Únete a Elevare como profesional de fitness y bienestar", description: "Crea tu perfil profesional de Elevare, muestra tus servicios y especialidades, define tus tarifas y establece tu presencia mientras Elevare crece." },
    hero: { eyebrow: "PROFESIONALES DE FITNESS Y BIENESTAR", title: "Sé uno de los primeros 100 Profesionales Fundadores de Elevare", body: "Crea tu presencia profesional ahora y establece tu perfil mientras Elevare se expande en web y móvil.", qualification: "El estatus de Profesional Fundador está disponible para los primeros 100 profesionales aprobados.", cta: "Ser profesional fundador", trustLine: "Gratis para unirte • Sin suscripción • Define tus propias tarifas" },
    profile: { eyebrow: "TU PRESENCIA PROFESIONAL EN ELEVARE", title: "Tu presencia profesional en Elevare.", body: "Muestra a clientes quién eres, qué ofreces y cuánto cuestan tus servicios.", photo: "Tu foto profesional", titleField: "Tu título profesional", specialties: "Especialidades", credentials: "Credenciales", services: "Servicios", pricing: "Precios", location: "Ubicación o zona de servicio", availability: "Disponibilidad" },
    vision: { eyebrow: "MÁS QUE UN DIRECTORIO", title: "Diseñado para ayudar a que los clientes adecuados encuentren a los profesionales adecuados.", cards: [
      { label: "DISPONIBLE AHORA", title: "Perfiles listos para decidir", body: "Muestra especialidades, credenciales, servicios, precios, disponibilidad, experiencia y enfoque antes de que te contacten." },
      { label: "DISPONIBLE AHORA", title: "Mejor descubrimiento de profesionales", body: "Los clientes pueden explorar perfiles aprobados, guardar favoritos, solicitar consultas y usar solicitudes de concierge revisadas." },
      { label: "DISPONIBLE AHORA", title: "Diseñado alrededor de la compatibilidad", body: "La información estructurada de clientes y profesionales lleva el descubrimiento más allá de una lista básica de nombres." },
      { label: "PRÓXIMAMENTE EN ELEVARE", title: "Coincidencias automatizadas más inteligentes", body: "En desarrollo: herramientas que usan objetivos, preferencias, especialidades, servicios, ubicación y criterios de compatibilidad relacionados." },
    ] },
    midCta: { eyebrow: "PROFESIONALES FUNDADORES", title: "Establece tu presencia desde el principio.", body: "Crea tu perfil ahora y sé parte de la red mientras Elevare crece.", trustLine: "Gratis para unirte • Los primeros 100 profesionales aprobados reciben el estatus de Profesional Fundador" },
    app: { eyebrow: "CREA TU PRESENCIA TEMPRANO", title: "Prepárate mientras Elevare se expande a móvil.", body: "Establece tu perfil ahora mientras se expanden el marketplace y la experiencia profesional de Elevare.", points: ["Completa tu perfil temprano", "Establece tus servicios y especialidades", "Mantén actualizada tu información profesional", "Sé parte de la red a medida que se introducen nuevas herramientas"], status: "EN DESARROLLO — La experiencia móvil del marketplace de Elevare aún no está disponible." },
    steps: { eyebrow: "CÓMO FUNCIONA", title: "Cómo funciona Elevare para profesionales", items: [
      { title: "Crea tu cuenta gratis", body: "Comienza con tu correo y contraseña." },
      { title: "Crea tu perfil profesional", body: "Agrega tus servicios, especialidades, credenciales, precios y otros datos profesionales." },
      { title: "Envía para revisión", body: "Elevare revisa perfiles profesionales para ayudar a mantener la calidad del marketplace." },
      { title: "Hazte visible", body: "Los perfiles aprobados pueden aparecer para clientes potenciales que buscan en Elevare." },
    ] },
    categories: { eyebrow: "¿QUIÉN PUEDE UNIRSE?", title: "Creado para profesionales de fitness y bienestar.", body: "Elige la categoría que describe con precisión tu trabajo.", allLabel: "Ver todas las categorías admitidas" },
    transparency: { eyebrow: "LA CONFIANZA COMIENZA CON SEÑALES CLARAS", title: "Los perfiles profesionales se revisan antes de publicarse.", body: "Los perfiles se revisan antes de publicarse en el marketplace. Las credenciales, la disponibilidad y otra información de confianza se muestran como señales específicas y no deben interpretarse como verificación universal." },
    faq: { eyebrow: "PREGUNTAS FRECUENTES", title: "¿Preguntas antes de unirte?", items: [
      { question: "¿Es gratis unirse a Elevare?", answer: "Sí. Crear y mantener un perfil profesional es gratis actualmente y no requiere suscripción." },
      { question: "¿Yo defino mis tarifas?", answer: "Sí. Agrega precios a tus servicios y perfil." },
      { question: "¿Qué significa Profesional Fundador?", answer: "Los primeros 100 profesionales aprobados reciben el estatus. No garantiza clientes, ingresos ni posición preferente." },
      { question: "¿Cómo funciona la revisión profesional?", answer: "Los perfiles completos se revisan antes de publicarse en el marketplace." },
      { question: "¿La app de Elevare ya está disponible?", answer: "El marketplace está en la web; móvil aún está en desarrollo." },
      { question: "¿Unirme a Elevare garantiza clientes?", answer: "No. Elevare no puede garantizar contactos, reservas ni ingresos." },
    ] },
    closing: { eyebrow: "PRIMEROS 100 PROFESIONALES APROBADOS", title: "Conviértete en profesional fundador de Elevare", body: "Crea tu perfil profesional y establece tu presencia mientras Elevare amplía su red de fitness y bienestar.", cta: "Ser profesional fundador", trustLine: "Gratis para unirte • Sin suscripción • Define tus propias tarifas" },
    signup: { headline: "Crea tu perfil profesional", description: "Comienza creando una cuenta. Después, agrega tus servicios, especialidades y datos profesionales para crear tu perfil público.", benefit: "Gratis para unirte. Crea tu perfil a tu propio ritmo.", note: "Crear tu cuenta es gratis. Crea tu perfil a tu propio ritmo y envíalo a revisión cuando estés listo.", showPassword: "Mostrar contraseña", hidePassword: "Ocultar contraseña" },
    actions: { continueProfile: "Continúa tu perfil profesional", viewApplicationStatus: "Ver estado de la solicitud", manageProfile: "Administrar perfil profesional" },
  },
  "pt-BR": {
    seo: { title: "Junte-se à Elevare como profissional de fitness e bem-estar", description: "Crie seu perfil profissional na Elevare, apresente seus serviços e especialidades, defina seus preços e estabeleça sua presença enquanto a Elevare cresce." },
    hero: { eyebrow: "PROFISSIONAIS DE FITNESS E BEM-ESTAR", title: "Seja um dos primeiros 100 Profissionais Fundadores da Elevare", body: "Crie sua presença profissional agora e estabeleça seu perfil enquanto a Elevare se expande na web e no mobile.", qualification: "O status de Profissional Fundador está disponível para os primeiros 100 profissionais aprovados.", cta: "Tornar-se profissional fundador", trustLine: "Grátis para entrar • Sem assinatura • Defina seus próprios preços" },
    profile: { eyebrow: "SUA PRESENÇA PROFISSIONAL NA ELEVARE", title: "Sua presença profissional na Elevare.", body: "Mostre aos clientes quem você é, o que oferece e quanto custam seus serviços.", photo: "Sua foto profissional", titleField: "Seu título profissional", specialties: "Especialidades", credentials: "Credenciais", services: "Serviços", pricing: "Preços", location: "Localização ou área de atendimento", availability: "Disponibilidade" },
    vision: { eyebrow: "MAIS QUE UM DIRETÓRIO", title: "Criada para ajudar os clientes certos a encontrar os profissionais certos.", cards: [
      { label: "DISPONÍVEL AGORA", title: "Perfis prontos para a decisão", body: "Mostre especialidades, credenciais, serviços, preços, disponibilidade, experiência e abordagem antes de clientes entrarem em contato." },
      { label: "DISPONÍVEL AGORA", title: "Melhor descoberta de profissionais", body: "Clientes podem explorar perfis aprovados, salvar favoritos, solicitar consultas e usar pedidos de concierge analisados." },
      { label: "DISPONÍVEL AGORA", title: "Estruturada em torno da compatibilidade", body: "Informações estruturadas de clientes e profissionais levam a descoberta além de uma lista básica de nomes." },
      { label: "EM BREVE NA ELEVARE", title: "Correspondência automatizada mais inteligente", body: "Em desenvolvimento: ferramentas que usam objetivos, preferências, especialidades, serviços, localização e critérios de compatibilidade relacionados." },
    ] },
    midCta: { eyebrow: "PROFISSIONAIS FUNDADORES", title: "Estabeleça sua presença desde o começo.", body: "Crie seu perfil agora e faça parte da rede enquanto a Elevare cresce.", trustLine: "Grátis para entrar • Os primeiros 100 profissionais aprovados recebem o status de Profissional Fundador" },
    app: { eyebrow: "CRIE SUA PRESENÇA CEDO", title: "Esteja pronto enquanto a Elevare expande para mobile.", body: "Estabeleça seu perfil agora enquanto o marketplace e a experiência profissional da Elevare se expandem.", points: ["Conclua seu perfil cedo", "Estabeleça seus serviços e especialidades", "Mantenha suas informações profissionais atualizadas", "Faça parte da rede conforme novas ferramentas são introduzidas"], status: "EM DESENVOLVIMENTO — A experiência mobile do marketplace da Elevare ainda não está disponível." },
    steps: { eyebrow: "COMO FUNCIONA", title: "Como a Elevare funciona para profissionais", items: [
      { title: "Crie sua conta grátis", body: "Comece com seu e-mail e senha." },
      { title: "Monte seu perfil profissional", body: "Adicione seus serviços, especialidades, credenciais, preços e outros dados profissionais." },
      { title: "Envie para análise", body: "A Elevare analisa perfis profissionais para ajudar a manter a qualidade do marketplace." },
      { title: "Seja encontrado", body: "Perfis aprovados podem aparecer para possíveis clientes que pesquisam na Elevare." },
    ] },
    categories: { eyebrow: "QUEM PODE ENTRAR?", title: "Feito para profissionais de fitness e bem-estar.", body: "Escolha a categoria que descreve seu trabalho com precisão.", allLabel: "Ver todas as categorias oferecidas" },
    transparency: { eyebrow: "A CONFIANÇA COMEÇA COM SINAIS CLAROS", title: "Perfis profissionais são analisados antes de serem publicados.", body: "Os perfis são analisados antes da publicação no marketplace. Credenciais, disponibilidade e outras informações de confiança são exibidas como sinais específicos e não devem ser interpretadas como verificação universal." },
    faq: { eyebrow: "PERGUNTAS FREQUENTES", title: "Perguntas antes de entrar?", items: [
      { question: "É grátis entrar na Elevare?", answer: "Sim. Criar e manter um perfil profissional é grátis hoje e não exige assinatura." },
      { question: "Eu defino meus próprios preços?", answer: "Sim. Adicione preços aos seus serviços e perfil." },
      { question: "O que significa Profissional Fundador?", answer: "Os primeiros 100 profissionais aprovados recebem o status. Isso não garante clientes, receita ou posição preferencial." },
      { question: "Como funciona a análise profissional?", answer: "Perfis completos são analisados antes da publicação no marketplace." },
      { question: "O app da Elevare já está disponível?", answer: "O marketplace está na web; mobile ainda está em desenvolvimento." },
      { question: "Entrar na Elevare garante clientes?", answer: "Não. A Elevare não pode garantir contatos, reservas ou receita." },
    ] },
    closing: { eyebrow: "PRIMEIROS 100 PROFISSIONAIS APROVADOS", title: "Torne-se profissional fundador da Elevare", body: "Crie seu perfil profissional e estabeleça sua presença enquanto a Elevare amplia sua rede de fitness e bem-estar.", cta: "Tornar-se profissional fundador", trustLine: "Grátis para entrar • Sem assinatura • Defina seus próprios preços" },
    signup: { headline: "Crie seu perfil profissional", description: "Comece criando uma conta. Depois, adicione seus serviços, especialidades e dados profissionais para criar seu perfil público.", benefit: "Grátis para entrar. Monte seu perfil no seu ritmo.", note: "Criar sua conta é grátis. Monte seu perfil no seu ritmo e envie para análise quando estiver pronto.", showPassword: "Mostrar senha", hidePassword: "Ocultar senha" },
    actions: { continueProfile: "Continue seu perfil profissional", viewApplicationStatus: "Ver status da inscrição", manageProfile: "Gerenciar perfil profissional" },
  },
} as const satisfies Record<Locale, ProfessionalAcquisitionCopy>;

export function getProfessionalAcquisitionCopy(locale: Locale) {
  return professionalAcquisitionMessages[locale] ?? professionalAcquisitionMessages.en;
}
