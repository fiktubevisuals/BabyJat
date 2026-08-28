export function LuxuryPageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center">
        {/* Animated outer ring */}
        <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        {/* Inner pulsing diamond */}
        <div className="absolute w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 rotate-45 animate-pulse flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-primary" />
        </div>
      </div>
      <p className="mt-4 font-label-caps text-xs text-secondary tracking-widest uppercase animate-pulse">
        Loading BabyJat Studio...
      </p>
    </div>
  );
}
