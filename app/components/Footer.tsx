export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-white/10 bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          End-to-End Encrypted. Your financial data is private.
        </div>
        <div className="text-white/45">© SnapGuard AI</div>
      </div>
    </footer>
  );
}
