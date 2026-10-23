// Presentation only: never rewrite a professional's stored profile fields.
function displayKey(value: string) {
  return value.normalize("NFKC").trim().replaceAll("_", " ").replace(/\s+/g, " ").toLocaleLowerCase();
}

export function distinctProfileCopy(value: string | null, alreadyShown: (string | null)[]) {
  if (!value?.trim()) return null;
  return alreadyShown.some((entry) => entry && displayKey(entry) === displayKey(value)) ? null : value;
}

export function distinctProfileLabels(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = displayKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function profileListItemText(value: string) {
  // HTML supplies the bullet; preserve the words and any internal punctuation.
  return value.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/u, "");
}
