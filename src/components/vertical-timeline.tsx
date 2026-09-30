import { clsx } from "clsx";

export type TimelineStep = { label: string; note?: string };

// Timeline verticale : étapes passées en vert, étape en cours en bleu, à venir en gris.
export function VerticalTimeline({
  steps,
  current,
  warning = false,
}: {
  steps: readonly TimelineStep[];
  current: number;
  // Étape en cours en orange (ex. livraison non finalisée).
  warning?: boolean;
}) {
  return (
    <ol>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === steps.length - 1;
        return (
          <li key={step.label} className="flex gap-3.5" aria-current={active ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                  done && "bg-success text-white",
                  active && !warning && "bg-primary text-white ring-4 ring-primary-light",
                  active && warning && "bg-warning text-white ring-4 ring-warning-light",
                  !done && !active && "bg-surface border-2 border-line"
                )}
              >
                {done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                )}
                {active && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              {!last && <span className={clsx("flex-1 w-0.5 my-1", done ? "bg-success" : "bg-line")} />}
            </div>
            <div className={clsx("pt-0.5", !last && "pb-5")}>
              <p className={clsx("text-sm", active ? "font-semibold text-ink" : done ? "font-medium text-ink" : "text-ink-muted")}>
                {step.label}
              </p>
              {(done || active) && step.note && <p className="text-xs text-ink-muted mt-0.5">{step.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
