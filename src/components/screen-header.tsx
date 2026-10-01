import { Logo } from "@/components/logo";

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Logo variant="symbol" size={28} />
        <h1 className="text-xl font-extrabold tracking-tight text-ink">{title}</h1>
      </div>
      {right}
    </div>
  );
}
