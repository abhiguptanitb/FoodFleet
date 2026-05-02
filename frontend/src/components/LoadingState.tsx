type LoadingStateProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
  compact?: boolean;
};

const LoadingState = ({
  eyebrow = "FoodFleet",
  title,
  copy,
  compact = false,
}: LoadingStateProps) => {
  if (compact) {
    return (
      <div className="loading-card loading-card-compact">
        <div className="loading-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--text)]">{title}</p>
          {copy && (
            <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
              {copy}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap flex min-h-[60vh] items-center justify-center py-8">
      <div className="loading-card fade-up w-full max-w-xl px-6 py-10 text-center sm:px-8">
        <div className="loading-mark mx-auto" aria-hidden="true">
          <span>F</span>
        </div>
        <p className="pill-label mx-auto mt-6 w-fit">{eyebrow}</p>
        <h1 className="section-title mt-4">{title}</h1>
        {copy && <p className="section-copy mt-3 text-sm">{copy}</p>}
        <div className="loading-rails mx-auto mt-7" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
