export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="h-[3px] bg-gradient-to-r from-sender to-traveler" aria-hidden />
      {children}
    </>
  );
}
