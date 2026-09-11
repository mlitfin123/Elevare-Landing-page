import type { Locale } from "./config.ts";
const en = {
  saving: "Saving your changes…",
  delayed: "Saved. Public updates may be delayed. You can retry the public update without saving again.",
  retry: "Retry public update",
  propagated: "Public information is up to date.",
  conflict: "This profile changed in another session. Reload the current profile and review your changes before saving.",
  reload: "Reload current profile",
  pending: "Draft saved. Your changes require review before they appear publicly.",
  failed: "We could not save your changes. Your unsaved changes are still here.",
  uncertain: "We could not confirm the save. Reload and review the current profile before saving again.",
};
type Messages = Record<keyof typeof en, string>;
const es: Messages = {
  saving: "Guardando tus cambios…",
  delayed: "Guardado. Las actualizaciones públicas pueden tardar. Puedes reintentar la actualización pública sin volver a guardar.",
  retry: "Reintentar actualización pública",
  propagated: "La información pública está actualizada.",
  conflict: "Este perfil cambió en otra sesión. Vuelve a cargar el perfil actual y revisa tus cambios antes de guardar.",
  reload: "Volver a cargar el perfil actual",
  pending: "Borrador guardado. Tus cambios requieren revisión antes de aparecer públicamente.",
  failed: "No pudimos guardar tus cambios. Tus cambios sin guardar siguen aquí.",
  uncertain: "No pudimos confirmar que se guardó. Vuelve a cargar y revisa el perfil actual antes de guardar otra vez.",
};
const pt: Messages = {
  saving: "Salvando suas alterações…",
  delayed: "Salvo. As atualizações públicas podem demorar. Você pode tentar a atualização pública novamente sem salvar outra vez.",
  retry: "Tentar atualização pública novamente",
  propagated: "As informações públicas estão atualizadas.",
  conflict: "Este perfil mudou em outra sessão. Recarregue o perfil atual e revise suas alterações antes de salvar.",
  reload: "Recarregar perfil atual",
  pending: "Rascunho salvo. Suas alterações precisam de revisão antes de aparecerem publicamente.",
  failed: "Não foi possível salvar suas alterações. Suas alterações não salvas continuam aqui.",
  uncertain: "Não foi possível confirmar que foi salvo. Recarregue e revise o perfil atual antes de salvar novamente.",
};
export const professionalPublicationMessages = { en, "es-419": es, "pt-BR": pt };
export function getProfessionalPublicationMessages(locale: Locale): Messages {
  return professionalPublicationMessages[locale] ?? en;
}
