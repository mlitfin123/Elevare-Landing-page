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
      title: "Optional Google Analytics",
      body: "ElevareFit uses anonymous, cookie-free traffic measurement. With your permission, Google Analytics may use analytics cookies to provide additional usage insights. Read our",
      accept: "Accept Google Analytics",
      decline: "Decline Google Analytics",
      manage: "Privacy choices",
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
      title: "Google Analytics opcional",
      body: "ElevareFit utiliza una medición de tráfico anónima y sin cookies. Con tu permiso, Google Analytics puede usar cookies de analítica para proporcionar información adicional sobre el uso. Consulta nuestra",
      accept: "Aceptar Google Analytics",
      decline: "Rechazar Google Analytics",
      manage: "Opciones de privacidad",
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
      title: "Google Analytics opcional",
      body: "A ElevareFit usa medição de tráfego anônima e sem cookies. Com a sua permissão, o Google Analytics pode usar cookies de análise para fornecer informações adicionais sobre o uso. Consulte nossa",
      accept: "Aceitar Google Analytics",
      decline: "Recusar Google Analytics",
      manage: "Opções de privacidade",
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
