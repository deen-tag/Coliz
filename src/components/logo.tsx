import Image from "next/image";

type LogoVariant = "primary" | "light" | "dark" | "mono" | "symbol";

const SRC: Record<LogoVariant, string> = {
  primary: "/brand/logo-primary.svg",
  light: "/brand/logo-light.svg",
  dark: "/brand/logo-dark.svg",
  mono: "/brand/logo-mono.svg",
  symbol: "/brand/symbol.svg",
};

export function Logo({ variant = "primary", size = 40 }: { variant?: LogoVariant; size?: number }) {
  const isSymbol = variant === "symbol";
  return (
    <Image
      src={SRC[variant]}
      alt="Coliz"
      width={isSymbol ? size : size * 1.8}
      height={isSymbol ? size : size * 2.3}
      priority
    />
  );
}
