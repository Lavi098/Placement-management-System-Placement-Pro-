const FullScreenLoader = ({ message = "Loading" }: { message?: string }) => {
  return (
    <div className="min-h-screen bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="h-14 w-14 rounded-full border-4 border-t-emerald-400 border-slate-200 animate-spin" />
      <p className="text-lg font-semibold text-slate-50 tracking-wide">{message}</p>
    </div>
  );
};

export default FullScreenLoader;
