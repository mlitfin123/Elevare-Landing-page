import {
  DEFAULT_SUPPORT_EMAIL,
  normalizeApprovalEmailLocale,
  type ApprovalEmailLocale,
} from "../professional-approval-email/email.ts";

export type ConciergeNotificationEvent =
  | "client_request_received"
  | "professional_invited"
  | "professional_response_reminder"
  | "client_shortlist_ready"
  | "client_selection_received"
  | "introduction_ready"
  | "introduction_completed"
  | "follow_up_request"
  | "rematch_confirmation"
  | "case_closed";

export type ConciergeNotificationRecipient = "client" | "professional";

type ConciergeNotificationInput = {
  eventType: ConciergeNotificationEvent;
  recipientRole: ConciergeNotificationRecipient;
  locale?: string | null;
  caseCode?: string | null;
  supportEmail?: string;
  siteUrl?: string;
};

export type ConciergeNotificationTemplate = {
  subject: string;
  previewText: string;
  heading: string;
  html: string;
  text: string;
  actionUrl: string;
};

type NotificationCopy = {
  subject: string;
  previewText: string;
  heading: string;
  body: string;
  cta: string;
};

const COPY: Record<ApprovalEmailLocale, Record<ConciergeNotificationEvent, NotificationCopy>> = {
  en: {
    client_request_received: {
      subject: "Elevare received your match request",
      previewText: "Your request is ready for human review.",
      heading: "Your request is in.",
      body: "Elevare will review the preferences you submitted. If suitable professionals are available, we may confirm their interest before sharing a short list with you.",
      cta: "View match request",
    },
    professional_invited: {
      subject: "Review a potential client fit on Elevare",
      previewText: "A private opportunity is waiting for your response.",
      heading: "You have a new match opportunity.",
      body: "Elevare selected your approved professional profile for a potential fit. Review the limited information the client agreed to share, then express interest, ask Elevare for clarification, or decline.",
      cta: "Review opportunity",
    },
    professional_response_reminder: {
      subject: "Reminder: respond to an Elevare match opportunity",
      previewText: "A private opportunity is still waiting for your response.",
      heading: "Your response is still needed.",
      body: "Sign in to review the opportunity and let Elevare know whether you are interested and currently accepting clients. This is not a booking or employment agreement.",
      cta: "Review opportunity",
    },
    client_shortlist_ready: {
      subject: "Your Elevare recommendations are ready",
      previewText: "Review professionals who may fit your request.",
      heading: "Your short list is ready.",
      body: "Elevare reviewed your request and confirmed interest from professionals who may fit. You can review their public profiles, request an introduction, decline an option, or ask for a rematch.",
      cta: "View recommendations",
    },
    client_selection_received: {
      subject: "Elevare received your introduction request",
      previewText: "We received the professional you selected.",
      heading: "Your selection was received.",
      body: "Elevare will prepare the authorized introduction. Contact details remain private until the introduction is completed.",
      cta: "View match request",
    },
    introduction_ready: {
      subject: "Your Elevare introduction is ready",
      previewText: "Review the next step for your professional introduction.",
      heading: "Your introduction is ready.",
      body: "Sign in to review the introduction details and the contact information authorized for this connection. This introduction is for arranging a consultation, not a booking through Elevare.",
      cta: "View introduction",
    },
    introduction_completed: {
      subject: "Your Elevare introduction is complete",
      previewText: "The authorized contact details are now available.",
      heading: "You can now connect directly.",
      body: "The authorized introduction is complete. Sign in to review the shared contact details and arrange a consultation directly if you both choose to continue.",
      cta: "View introduction",
    },
    follow_up_request: {
      subject: "How did your Elevare introduction go?",
      previewText: "Share a brief, optional outcome update.",
      heading: "A quick follow-up.",
      body: "If you have an update, you can report whether a consultation was scheduled or completed, whether you chose to work together, or whether you would like another match.",
      cta: "Share an update",
    },
    rematch_confirmation: {
      subject: "Elevare received your rematch request",
      previewText: "Your original request and history have been preserved.",
      heading: "We will review your request again.",
      body: "Your original request and prior match history remain available for review. Elevare will look for another suitable option without resending it to professionals who already declined unless circumstances materially change.",
      cta: "View match request",
    },
    case_closed: {
      subject: "Your Elevare match request was closed",
      previewText: "Your match request status has been updated.",
      heading: "This request is now closed.",
      body: "Your match request has been closed. You may continue browsing public professional profiles at any time.",
      cta: "View account",
    },
  },
  "es-419": {
    client_request_received: {
      subject: "Elevare recibió tu solicitud",
      previewText: "Tu solicitud está lista para revisión humana.",
      heading: "Recibimos tu solicitud.",
      body: "Elevare revisará las preferencias que enviaste. Si hay profesionales adecuados disponibles, podremos confirmar su interés antes de compartir contigo una lista breve.",
      cta: "Ver solicitud",
    },
    professional_invited: {
      subject: "Revisa una posible conexión con un cliente en Elevare",
      previewText: "Una oportunidad privada espera tu respuesta.",
      heading: "Tienes una nueva oportunidad de conexión.",
      body: "Elevare seleccionó tu perfil profesional aprobado como posible opción. Revisa la información limitada que el cliente autorizó compartir y luego expresa interés, solicita una aclaración a Elevare o rechaza la oportunidad.",
      cta: "Revisar oportunidad",
    },
    professional_response_reminder: {
      subject: "Recordatorio: responde a una oportunidad en Elevare",
      previewText: "Una oportunidad privada aún espera tu respuesta.",
      heading: "Aún necesitamos tu respuesta.",
      body: "Inicia sesión para revisar la oportunidad e indicar si te interesa y si actualmente aceptas clientes. Esto no es una reserva ni una relación laboral.",
      cta: "Revisar oportunidad",
    },
    client_shortlist_ready: {
      subject: "Tus recomendaciones de Elevare están listas",
      previewText: "Revisa profesionales que podrían ajustarse a tu solicitud.",
      heading: "Tu lista breve está lista.",
      body: "Elevare revisó tu solicitud y confirmó el interés de profesionales que podrían ser adecuados. Puedes revisar sus perfiles públicos, solicitar una presentación, rechazar una opción o pedir una nueva búsqueda.",
      cta: "Ver recomendaciones",
    },
    client_selection_received: {
      subject: "Elevare recibió tu solicitud de presentación",
      previewText: "Recibimos al profesional que seleccionaste.",
      heading: "Recibimos tu selección.",
      body: "Elevare preparará la presentación autorizada. Los datos de contacto permanecerán privados hasta que se complete la presentación.",
      cta: "Ver solicitud",
    },
    introduction_ready: {
      subject: "Tu presentación de Elevare está lista",
      previewText: "Revisa el siguiente paso de tu presentación profesional.",
      heading: "Tu presentación está lista.",
      body: "Inicia sesión para revisar los detalles y los datos de contacto autorizados para esta conexión. Esta presentación permite coordinar una consulta; no es una reserva a través de Elevare.",
      cta: "Ver presentación",
    },
    introduction_completed: {
      subject: "Tu presentación de Elevare se completó",
      previewText: "Los datos de contacto autorizados ya están disponibles.",
      heading: "Ya pueden comunicarse directamente.",
      body: "La presentación autorizada está completa. Inicia sesión para revisar los datos compartidos y coordinar una consulta directamente si ambos desean continuar.",
      cta: "Ver presentación",
    },
    follow_up_request: {
      subject: "¿Cómo fue tu presentación de Elevare?",
      previewText: "Comparte una actualización breve y opcional.",
      heading: "Un seguimiento breve.",
      body: "Si tienes una actualización, puedes indicar si se programó o completó una consulta, si decidieron trabajar juntos o si deseas otra búsqueda.",
      cta: "Compartir actualización",
    },
    rematch_confirmation: {
      subject: "Elevare recibió tu solicitud de nueva búsqueda",
      previewText: "Conservamos tu solicitud original y su historial.",
      heading: "Revisaremos tu solicitud nuevamente.",
      body: "Tu solicitud original y el historial previo siguen disponibles para revisión. Elevare buscará otra opción adecuada sin reenviarla a profesionales que ya rechazaron, salvo que las circunstancias cambien de forma importante.",
      cta: "Ver solicitud",
    },
    case_closed: {
      subject: "Tu solicitud de Elevare fue cerrada",
      previewText: "El estado de tu solicitud fue actualizado.",
      heading: "Esta solicitud está cerrada.",
      body: "Tu solicitud fue cerrada. Puedes seguir explorando perfiles profesionales públicos en cualquier momento.",
      cta: "Ver cuenta",
    },
  },
  "pt-BR": {
    client_request_received: {
      subject: "A Elevare recebeu sua solicitação",
      previewText: "Sua solicitação está pronta para análise humana.",
      heading: "Recebemos sua solicitação.",
      body: "A Elevare analisará as preferências enviadas. Se houver profissionais adequados disponíveis, poderemos confirmar o interesse deles antes de compartilhar uma lista curta com você.",
      cta: "Ver solicitação",
    },
    professional_invited: {
      subject: "Analise uma possível conexão com cliente na Elevare",
      previewText: "Uma oportunidade privada aguarda sua resposta.",
      heading: "Você tem uma nova oportunidade de conexão.",
      body: "A Elevare selecionou seu perfil profissional aprovado como possível opção. Analise as informações limitadas que o cliente autorizou compartilhar e depois demonstre interesse, peça esclarecimentos à Elevare ou recuse.",
      cta: "Analisar oportunidade",
    },
    professional_response_reminder: {
      subject: "Lembrete: responda a uma oportunidade na Elevare",
      previewText: "Uma oportunidade privada ainda aguarda sua resposta.",
      heading: "Ainda precisamos da sua resposta.",
      body: "Entre para analisar a oportunidade e informar se tem interesse e se está aceitando clientes. Isso não é um agendamento nem um vínculo empregatício.",
      cta: "Analisar oportunidade",
    },
    client_shortlist_ready: {
      subject: "Suas recomendações da Elevare estão prontas",
      previewText: "Analise profissionais que podem atender à sua solicitação.",
      heading: "Sua lista curta está pronta.",
      body: "A Elevare analisou sua solicitação e confirmou o interesse de profissionais que podem ser adequados. Você pode ver os perfis públicos, solicitar uma apresentação, recusar uma opção ou pedir uma nova busca.",
      cta: "Ver recomendações",
    },
    client_selection_received: {
      subject: "A Elevare recebeu seu pedido de apresentação",
      previewText: "Recebemos o profissional que você selecionou.",
      heading: "Recebemos sua seleção.",
      body: "A Elevare preparará a apresentação autorizada. Os dados de contato permanecerão privados até a conclusão da apresentação.",
      cta: "Ver solicitação",
    },
    introduction_ready: {
      subject: "Sua apresentação da Elevare está pronta",
      previewText: "Confira o próximo passo da sua apresentação profissional.",
      heading: "Sua apresentação está pronta.",
      body: "Entre para ver os detalhes e os dados de contato autorizados para esta conexão. A apresentação serve para combinar uma consulta; não é um agendamento pela Elevare.",
      cta: "Ver apresentação",
    },
    introduction_completed: {
      subject: "Sua apresentação da Elevare foi concluída",
      previewText: "Os dados de contato autorizados já estão disponíveis.",
      heading: "Vocês já podem conversar diretamente.",
      body: "A apresentação autorizada foi concluída. Entre para ver os dados compartilhados e combinar uma consulta diretamente caso ambos queiram continuar.",
      cta: "Ver apresentação",
    },
    follow_up_request: {
      subject: "Como foi sua apresentação da Elevare?",
      previewText: "Compartilhe uma atualização breve e opcional.",
      heading: "Um breve acompanhamento.",
      body: "Se houver novidades, você pode informar se uma consulta foi agendada ou concluída, se decidiram trabalhar juntos ou se deseja uma nova busca.",
      cta: "Compartilhar atualização",
    },
    rematch_confirmation: {
      subject: "A Elevare recebeu seu pedido de nova busca",
      previewText: "Sua solicitação original e o histórico foram preservados.",
      heading: "Analisaremos sua solicitação novamente.",
      body: "Sua solicitação original e o histórico anterior continuam disponíveis para análise. A Elevare buscará outra opção adequada sem reenviar para profissionais que já recusaram, salvo mudança relevante das circunstâncias.",
      cta: "Ver solicitação",
    },
    case_closed: {
      subject: "Sua solicitação da Elevare foi encerrada",
      previewText: "O status da sua solicitação foi atualizado.",
      heading: "Esta solicitação foi encerrada.",
      body: "Sua solicitação foi encerrada. Você pode continuar explorando perfis profissionais públicos a qualquer momento.",
      cta: "Ver conta",
    },
  },
};

export function conciergeNotificationEventKey(
  eventType: ConciergeNotificationEvent,
  entityId: string,
  occurrence = "initial",
) {
  return `concierge:${eventType}:${entityId}:${occurrence}`;
}

export function getConciergeAccountUrl(
  locale: ApprovalEmailLocale,
  recipientRole: ConciergeNotificationRecipient,
  siteUrl = "https://www.elevarefit.com",
) {
  const localePrefix = locale === "es-419" ? "/es" : locale === "pt-BR" ? "/pt-br" : "";
  const route = recipientRole === "professional" ? "/account/opportunities/" : "/account/matches/";
  return `${siteUrl.replace(/\/$/, "")}${localePrefix}${route}`;
}

export function buildConciergeNotification({
  eventType,
  recipientRole,
  locale: requestedLocale,
  caseCode,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
  siteUrl,
}: ConciergeNotificationInput): ConciergeNotificationTemplate {
  const locale = normalizeApprovalEmailLocale(requestedLocale);
  const copy = COPY[locale][eventType];
  const actionUrl = getConciergeAccountUrl(locale, recipientRole, siteUrl);
  const reference = normalizeCaseCode(caseCode);
  const referenceHtml = reference
    ? `<p style="margin:0 0 18px;color:#93a4b1;font-size:13px;line-height:1.5;">${escapeHtml(referenceLabel(locale))}: ${escapeHtml(reference)}</p>`
    : "";
  const referenceText = reference ? `\n${referenceLabel(locale)}: ${reference}\n` : "";

  return {
    subject: copy.subject,
    previewText: copy.previewText,
    heading: copy.heading,
    actionUrl,
    html: `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;background:#080d13;color:#eaf2f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.previewText)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080d13;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#111a23;border:1px solid #263746;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:24px 32px;border-bottom:1px solid #263746;color:#18d8c2;font-size:18px;font-weight:700;letter-spacing:2px;">ELEVARE</td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 18px;color:#fff;font-size:28px;line-height:1.2;">${escapeHtml(copy.heading)}</h1>
            <p style="margin:0 0 18px;color:#bdc9d2;font-size:16px;line-height:1.65;">${escapeHtml(copy.body)}</p>
            ${referenceHtml}
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;">
              <tr><td style="border-radius:8px;background:#18d8c2;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 22px;color:#07110f;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(copy.cta)}</a></td></tr>
            </table>
            <p style="margin:0;color:#93a4b1;font-size:14px;line-height:1.6;">${escapeHtml(helpCopy(locale))} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#18d8c2;">${escapeHtml(supportEmail)}</a>.</p>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #263746;color:#748692;font-size:12px;line-height:1.6;">${escapeHtml(footerCopy(locale))}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    text: `${copy.heading}\n\n${copy.body}${referenceText}\n${copy.cta}: ${actionUrl}\n\n${helpCopy(locale)} ${supportEmail}.\n\n${footerCopy(locale)}`,
  };
}

function normalizeCaseCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^EVR-[A-F0-9]{12}$/.test(normalized) ? normalized : null;
}

function referenceLabel(locale: ApprovalEmailLocale) {
  if (locale === "es-419") return "Referencia";
  if (locale === "pt-BR") return "Referência";
  return "Reference";
}

function helpCopy(locale: ApprovalEmailLocale) {
  if (locale === "es-419") return "¿Necesitas ayuda? Responde a este correo o escribe a";
  if (locale === "pt-BR") return "Precisa de ajuda? Responda a este e-mail ou entre em contato com";
  return "Need help? Reply to this email or contact";
}

function footerCopy(locale: ApprovalEmailLocale) {
  if (locale === "es-419") return "Este es un mensaje transaccional sobre una solicitud privada de conexión en Elevare.";
  if (locale === "pt-BR") return "Esta é uma mensagem transacional sobre uma solicitação privada de conexão na Elevare.";
  return "This is a transactional message about a private Elevare match request.";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
