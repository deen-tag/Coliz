import { clsx } from "clsx";
import type { Tone } from "@/lib/booking-status";

const TONES: Record<Tone, string> = {
  neutral: "bg-black/5 border-line",
  info: "bg-primary-light border-primary/20",
  success: "bg-success-light border-success/20",
  warning: "bg-warning-light border-warning/20",
  error: "bg-error-light border-error/20",
};

const TITLE_TONES: Record<Tone, string> = {
  neutral: "text-ink",
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
};

// "Où j'en suis et ce qu'on attend de moi" : la première chose qu'on lit sur une réservation.
export function StatusBanner({ title, hint, tone }: { title: string; hint?: string; tone: Tone }) {
  return (
    <div className={clsx("rounded-card border px-4 py-3.5", TONES[tone])} role="status">
      <p className={clsx("font-semibold", TITLE_TONES[tone])}>{title}</p>
      {hint && <p className="text-sm text-ink mt-1 leading-snug">{hint}</p>}
    </div>
  );
}
