import { clsx } from "clsx";

const STEPS = ["Recherche", "Résultats", "Trajet", "Réservation"];

// Fil d'Ariane du parcours : on voit d'où on vient et ce qui reste à faire.
export function JourneySteps({
  current,
  className,
  steps = STEPS,
}: {
  current: number;
  className?: string;
  steps?: readonly string[];
}) {
  return (
    <ol className={clsx("flex mb-6", className)} aria-label={`Étape ${current} sur ${steps.length}`}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex-1 relative flex flex-col items-center" aria-current={active ? "step" : undefined}>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={clsx("absolute top-3 left-1/2 w-full h-0.5", done ? "bg-primary" : "bg-line")}
              />
            )}
            <span
              className={clsx(
                "relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold",
                done && "bg-primary text-white",
                active && "bg-primary text-white ring-4 ring-primary-light",
                !done && !active && "bg-surface border border-line text-ink-muted"
              )}
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              ) : (
                n
              )}
            </span>
            <span
              className={clsx(
                "mt-1.5 text-[11px] leading-tight",
                active ? "font-semibold text-ink" : "text-ink-muted"
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
