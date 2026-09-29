import { clsx } from "clsx";

// Avatar unique pour tout le site : photo si elle existe, sinon l'initiale.
export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        className={clsx("rounded-full object-cover shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={clsx(
        "rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center shrink-0",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}
