import type { Locale } from "@/lib/i18n/config";

export type ShellMessages = {
  brandSubtitle: string;
  primaryNavigationLabel: string;
  footerNavigationLabel: string;
  navigation: {
    tools: string;
    exercises: string;
    workouts: string;
    nutrition: string;
    apps: string;
    shop: string;
    blog: string;
    findSupport: string;
  };
  authentication: {
    signIn: string;
    signedIn: string;
  };
  language: {
    label: string;
    english: string;
    spanish: string;
    portugueseBrazil: string;
  };
  footer: {
    rights: string;
    mobileComingSoon: string;
    privacyPolicyEnglish: string;
    termsEnglish: string;
    contact: string;
  };
  analyticsConsent: {
    ariaLabel: string;
    title: string;
    body: string;
    accept: string;
    decline: string;
    manage: string;
    profileStatisticsLabel: string;
    profileStatisticsNotice: string;
    profileStatisticsBody: string;
    profileStatisticsSignal: string;
    profileStatisticsAllow: string;
    profileStatisticsDecline: string;
  };
  translationFeedback: {
    link: string;
    dialogTitle: string;
    intro: string;
    pageLabel: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    descriptionLabel: string;
    correctionLabel: string;
    contactEmailLabel: string;
    optional: string;
    privacyUse: string;
    sensitiveWarning: string;
    submit: string;
    submitting: string;
    cancel: string;
    close: string;
    success: string;
    error: string;
    categories: Record<"incorrect" | "unnatural" | "untranslated" | "display_issue" | "other", string>;
  };
};

const messages: Record<Locale, ShellMessages> = {
  en: {
    brandSubtitle: "Tools, workouts, apps",
    primaryNavigationLabel: "Primary",
    footerNavigationLabel: "Footer",
    navigation: {
      tools: "Tools",
      exercises: "Exercises",
      workouts: "Workouts",
      nutrition: "Nutrition",
      apps: "Apps",
      shop: "Shop",
      blog: "Blog",
      findSupport: "Find Support",
    },
    authentication: { signIn: "Sign In", signedIn: "Signed In" },
    language: {
      label: "Language",
      english: "English",
      spanish: "Español",
      portugueseBrazil: "Português (Brasil)",
    },
    footer: {
      rights: "All rights reserved.",
      mobileComingSoon: "Elevare for iOS & Android - Coming Soon",
      privacyPolicyEnglish: "Privacy Policy",
      termsEnglish: "Terms of Service",
      contact: "Contact",
    },
    analyticsConsent: {
      ariaLabel: "Analytics privacy choices",
      title: "Privacy choices",
      body: "ElevareFit uses anonymous, cookie-free traffic measurement. With your permission, Google Analytics may use analytics cookies to provide additional usage insights. Read our",
      accept: "Accept Google Analytics",
      decline: "Decline Google Analytics",
      manage: "Privacy choices",
      profileStatisticsLabel: "Basic profile-page statistics",
      profileStatisticsNotice: "Where permitted, we also count profile-page visits without visitor IDs. Manage or turn off these statistics below.",
      profileStatisticsAllow: "Allow profile statistics",
      profileStatisticsDecline: "Turn off profile statistics",
      profileStatisticsBody: "These counts help improve the professional directory and show professionals how often their pages are viewed. They use daily totals without visitor IDs. Where permitted, counting starts automatically; elsewhere it waits for consent. Turn this off to stop future counts in this browser.",
      profileStatisticsSignal: "Your browser's privacy signal has turned off profile-page statistics.",
    },
    translationFeedback: {
      link: "Report a translation issue",
      dialogTitle: "Report a translation issue",
      intro: "Tell us what could be clearer so we can improve this translation.",
      pageLabel: "Page",
      categoryLabel: "Issue type",
      categoryPlaceholder: "Choose an issue type",
      descriptionLabel: "Short description",
      correctionLabel: "Suggested wording",
      contactEmailLabel: "Contact email",
      optional: "Optional",
      privacyUse: "We use this feedback to improve translations. Read our",
      sensitiveWarning: "Do not include health information, payment details, or photographs.",
      submit: "Submit feedback",
      submitting: "Submitting...",
      cancel: "Cancel",
      close: "Close",
      success: "Thank you. We will review this translation.",
      error: "We could not submit your feedback. Please try again.",
      categories: {
        incorrect: "Incorrect translation",
        unnatural: "Unnatural translation",
        untranslated: "Untranslated text",
        display_issue: "Text is cut off or difficult to read",
        other: "Other",
      },
    },
  },
  "es-419": {
    brandSubtitle: "Herramientas, rutinas, apps",
    primaryNavigationLabel: "Navegación principal",
    footerNavigationLabel: "Navegación del pie de página",
    navigation: {
      tools: "Herramientas",
      exercises: "Ejercicios",
      workouts: "Rutinas",
      nutrition: "Nutrición",
      apps: "Apps",
      shop: "Tienda",
      blog: "Blog",
      findSupport: "Buscar apoyo",
    },
    authentication: { signIn: "Iniciar sesión", signedIn: "Sesión iniciada" },
    language: {
      label: "Idioma",
      english: "English",
      spanish: "Español",
      portugueseBrazil: "Português (Brasil)",
    },
    footer: {
      rights: "Todos los derechos reservados.",
      mobileComingSoon: "Elevare para iOS y Android - Próximamente",
      privacyPolicyEnglish: "Política de privacidad (en inglés)",
      termsEnglish: "Términos de servicio (en inglés)",
      contact: "Contacto",
    },
    analyticsConsent: {
      ariaLabel: "Opciones de privacidad de analítica",
      title: "Opciones de privacidad",
      body: "ElevareFit utiliza una medición de tráfico anónima y sin cookies. Con tu permiso, Google Analytics puede usar cookies de analítica para proporcionar información adicional sobre el uso. Consulta nuestra",
      accept: "Aceptar Google Analytics",
      decline: "Rechazar Google Analytics",
      manage: "Opciones de privacidad",
      profileStatisticsLabel: "Estadísticas básicas de páginas de profesionales",
      profileStatisticsNotice: "Donde está permitido, también contamos visitas a perfiles sin identificar visitantes. Puedes administrar o desactivar estas estadísticas abajo.",
      profileStatisticsAllow: "Permitir estadísticas de perfiles",
      profileStatisticsDecline: "Desactivar estadísticas de perfiles",
      profileStatisticsBody: "Estos recuentos ayudan a mejorar el directorio y muestran a los profesionales cuántas veces se ven sus páginas. Usan totales diarios sin identificar visitantes. Donde está permitido, comienzan automáticamente; en otros lugares esperan tu consentimiento. Desactiva esta opción para detener futuros recuentos en este navegador.",
      profileStatisticsSignal: "La señal de privacidad de tu navegador ha desactivado las estadísticas de páginas de profesionales.",
    },
    translationFeedback: {
      link: "Informar un problema de traducción",
      dialogTitle: "Informar un problema de traducción",
      intro: "Cuéntanos qué podría ser más claro para ayudarnos a mejorar esta traducción.",
      pageLabel: "Página",
      categoryLabel: "Tipo de problema",
      categoryPlaceholder: "Elige un tipo de problema",
      descriptionLabel: "Descripción breve",
      correctionLabel: "Redacción sugerida",
      contactEmailLabel: "Correo electrónico de contacto",
      optional: "Opcional",
      privacyUse: "Usamos estos comentarios para mejorar las traducciones. Consulta nuestra",
      sensitiveWarning: "No incluyas información de salud, datos de pago ni fotografías.",
      submit: "Enviar comentarios",
      submitting: "Enviando...",
      cancel: "Cancelar",
      close: "Cerrar",
      success: "Gracias. Revisaremos esta traducción.",
      error: "No pudimos enviar tus comentarios. Inténtalo de nuevo.",
      categories: {
        incorrect: "Traducción incorrecta",
        unnatural: "Traducción poco natural",
        untranslated: "Texto sin traducir",
        display_issue: "Texto cortado o difícil de leer",
        other: "Otro",
      },
    },
  },
  "pt-BR": {
    brandSubtitle: "Ferramentas, treinos, apps",
    primaryNavigationLabel: "Navegação principal",
    footerNavigationLabel: "Navegação do rodapé",
    navigation: {
      tools: "Ferramentas",
      exercises: "Exercícios",
      workouts: "Treinos",
      nutrition: "Nutrição",
      apps: "Apps",
      shop: "Loja",
      blog: "Blog",
      findSupport: "Encontrar suporte",
    },
    authentication: { signIn: "Entrar", signedIn: "Conectado" },
    language: {
      label: "Idioma",
      english: "English",
      spanish: "Español",
      portugueseBrazil: "Português (Brasil)",
    },
    footer: {
      rights: "Todos os direitos reservados.",
      mobileComingSoon: "Elevare para iOS e Android - Em breve",
      privacyPolicyEnglish: "Política de Privacidade (em inglês)",
      termsEnglish: "Termos de Serviço (em inglês)",
      contact: "Contato",
    },
    analyticsConsent: {
      ariaLabel: "Opções de privacidade de análise",
      title: "Opções de privacidade",
      body: "A ElevareFit usa medição de tráfego anônima e sem cookies. Com a sua permissão, o Google Analytics pode usar cookies de análise para fornecer informações adicionais sobre o uso. Consulte nossa",
      accept: "Aceitar Google Analytics",
      decline: "Recusar Google Analytics",
      manage: "Opções de privacidade",
      profileStatisticsLabel: "Estatísticas básicas das páginas de profissionais",
      profileStatisticsNotice: "Onde permitido, também contamos visitas a perfis sem identificar visitantes. Você pode gerenciar ou desativar essas estatísticas abaixo.",
      profileStatisticsAllow: "Permitir estatísticas de perfis",
      profileStatisticsDecline: "Desativar estatísticas de perfis",
      profileStatisticsBody: "Essas contagens ajudam a melhorar o diretório e mostram aos profissionais quantas vezes suas páginas são vistas. Usam totais diários sem identificar visitantes. Onde permitido, começam automaticamente; nos demais locais, aguardam consentimento. Desative esta opção para interromper futuras contagens neste navegador.",
      profileStatisticsSignal: "O sinal de privacidade do seu navegador desativou as estatísticas das páginas de profissionais.",
    },
    translationFeedback: {
      link: "Relatar um problema de tradução",
      dialogTitle: "Relatar um problema de tradução",
      intro: "Conte o que poderia ficar mais claro para nos ajudar a melhorar esta tradução.",
      pageLabel: "Página",
      categoryLabel: "Tipo de problema",
      categoryPlaceholder: "Escolha um tipo de problema",
      descriptionLabel: "Descrição breve",
      correctionLabel: "Texto sugerido",
      contactEmailLabel: "E-mail para contato",
      optional: "Opcional",
      privacyUse: "Usamos este comentário para melhorar as traduções. Consulte nossa",
      sensitiveWarning: "Não inclua informações de saúde, dados de pagamento ou fotografias.",
      submit: "Enviar comentário",
      submitting: "Enviando...",
      cancel: "Cancelar",
      close: "Fechar",
      success: "Obrigado. Analisaremos esta tradução.",
      error: "Não foi possível enviar seu comentário. Tente novamente.",
      categories: {
        incorrect: "Tradução incorreta",
        unnatural: "Tradução pouco natural",
        untranslated: "Texto não traduzido",
        display_issue: "Texto cortado ou difícil de ler",
        other: "Outro",
      },
    },
  },
};

export function getShellMessages(locale: Locale) {
  return messages[locale] ?? messages.en;
}
