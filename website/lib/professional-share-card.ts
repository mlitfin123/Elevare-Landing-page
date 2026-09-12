import { cleanProfileCardText } from "./professional-sharing.ts";

type CardData = {
  name: string;
  title: string;
  specialties: string[];
  photoUrl: string | null;
  label: string;
  cta: string;
  footer: string;
};

function loadImage(source: string | null): Promise<HTMLImageElement | null> {
  if (!source) return Promise.resolve(null);
  let url: URL;
  try { url = new URL(source, window.location.origin); } catch { return Promise.resolve(null); }
  if (url.protocol !== "https:" && url.origin !== window.location.origin) return Promise.resolve(null);
  return new Promise((resolve) => {
    const photo = new Image();
    const finish = (value: HTMLImageElement | null) => {
      window.clearTimeout(timer);
      photo.onload = null;
      photo.onerror = null;
      if (!value) photo.src = "";
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 7_000);
    photo.crossOrigin = "anonymous";
    photo.referrerPolicy = "no-referrer";
    photo.onload = () => finish(photo.naturalWidth && photo.naturalHeight ? photo : null);
    photo.onerror = () => finish(null);
    photo.src = url.toString();
  });
}

function textLines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of cleanProfileCardText(text).split(" ")) {
    if (line && ctx.measureText(`${line} ${word}`).width > width) { lines.push(line); line = ""; }
    // Long unbroken names still fit inside the card.
    for (const character of Array.from(`${line ? " " : ""}${word}`)) {
      if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function fittedText(ctx: CanvasRenderingContext2D, text: string, y: number, width: number, size: number, maxLines: number, color: string, weight = 700) {
  let lines: string[] = [];
  const minimum = Math.min(size, 30);
  while (true) {
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    lines = textLines(ctx, text, width);
    if (lines.length <= maxLines || size <= minimum) break;
    size = Math.max(minimum, size - 2);
  }
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = visible[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > width) last = Array.from(last).slice(0, -1).join("");
    visible[maxLines - 1] = `${last}…`;
  }
  ctx.fillStyle = color;
  visible.forEach((line, index) => ctx.fillText(line, 540, y + index * size * 1.2));
  return visible.length * size * 1.2;
}

export async function createProfessionalShareCard(data: CardData) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const [photo, wordmark] = await Promise.all([loadImage(data.photoUrl), loadImage("/elevare-wordmark.png")]);
  ctx.fillStyle = "#f3f6f7";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#dceef0";
  ctx.beginPath(); ctx.arc(980, 730, 520, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e6edef";
  ctx.beginPath(); ctx.arc(20, 1120, 390, 0, Math.PI * 2); ctx.fill();
  if (wordmark) ctx.drawImage(wordmark, 320, 144, 440, 440 * wordmark.naturalHeight / wordmark.naturalWidth);
  else {
    ctx.fillStyle = "#172831"; ctx.font = "800 60px Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("ELEVARE", 540, 235);
  }
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  fittedText(ctx, data.label, 332, 860, 28, 1, "#44606a", 700);

  const photoX = 218, photoY = 422, photoSize = 644;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(photoX, photoY, photoSize, photoSize, 58); ctx.clip();
  ctx.fillStyle = "#183744"; ctx.fillRect(photoX, photoY, photoSize, photoSize);
  if (photo) {
    const side = Math.min(photo.naturalWidth, photo.naturalHeight);
    ctx.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2, side, side, photoX, photoY, photoSize, photoSize);
  } else {
    const names = cleanProfileCardText(data.name).split(" ").filter(Boolean);
    const initials = [names[0], names.length > 1 ? names.at(-1) : null].filter(Boolean).map(name => Array.from(name!)[0]).join("").toLocaleUpperCase();
    ctx.fillStyle = "#98d5de"; ctx.font = "700 190px Arial, sans-serif";
    ctx.textBaseline = "middle"; ctx.fillText(initials || "E", 540, photoY + photoSize / 2);
  }
  ctx.restore();
  const nameHeight = fittedText(ctx, data.name, 1130, 900, 84, 2, "#152c37");
  const titleY = 1130 + nameHeight + 22;
  const titleHeight = fittedText(ctx, data.title, titleY, 880, 42, 2, "#355663", 500);
  fittedText(ctx, data.specialties.slice(0, 3).join(" · "), titleY + titleHeight + 22, 840, 30, 2, "#4d6873", 400);

  ctx.fillStyle = "#183744";
  ctx.beginPath(); ctx.roundRect(88, 1576, 904, 174, 36); ctx.fill();
  fittedText(ctx, data.cta, 1610, 824, 48, 1, "#ffffff");
  fittedText(ctx, data.footer, 1675, 824, 27, 1, "#b8d2d9", 400);
  fittedText(ctx, "elevarefit.com", 1790, 880, 30, 1, "#44606a", 500);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("PNG export failed")), "image/png"));
  return { blob, usedPhoto: Boolean(photo) };
}
