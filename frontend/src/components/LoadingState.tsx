import { useAppData } from "../context/AppContext";

type LoadingStateProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
  compact?: boolean;
};

type SkeletonStateProps = {
  type?: "restaurants" | "menu" | "orders" | "rider-history" | "admin-list";
  count?: number;
  title?: string;
};

const LoadingState = ({
  eyebrow = "FoodFleet",
  title,
  copy,
  compact = false,
}: LoadingStateProps) => {
  const { user } = useAppData();
  const roleClass = `role-${user?.role || "customer"}`;

  if (compact) {
    return (
      <div className={`loading-card loading-card-compact ${roleClass}`}>
        <div
          className="brand-mark loading-brand-mark-compact flex items-center justify-center text-white"
          aria-hidden="true"
        >
          F
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
    <div className={`page-wrap flex min-h-[60vh] items-center justify-center py-8 ${roleClass}`}>
      <div className="loading-card fade-up w-full max-w-xl px-6 py-10 text-center sm:px-8">
        <div
          className="brand-mark loading-brand-mark mx-auto flex items-center justify-center text-white"
          aria-hidden="true"
        >
          F
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

const gridByType: Record<NonNullable<SkeletonStateProps["type"]>, string> = {
  restaurants: "grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3",
  menu: "grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
  orders: "grid-cols-1 gap-4 xl:grid-cols-2",
  "rider-history": "grid-cols-1 gap-0",
  "admin-list": "grid-cols-1 gap-4 xl:grid-cols-2",
};

const SkeletonCard = ({
  type = "restaurants",
}: {
  type?: SkeletonStateProps["type"];
}) => {
  if (type === "rider-history") {
    return (
      <div className="ui-row compact-mobile-row rounded-none border-x-0 border-t-0 p-4 shadow-none">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_1.45fr_0.85fr_0.7fr_0.7fr]">
          <div className="skeleton-line w-11/12" />
          <div className="skeleton-line w-full" />
          <div className="skeleton-line w-28" />
          <div className="skeleton-line w-20" />
          <div className="skeleton-chip" />
        </div>
      </div>
    );
  }

  if (type === "orders" || type === "admin-list") {
    return (
      <div className="ui-card compact-mobile-row p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="skeleton-block h-24 w-24 shrink-0 sm:h-28 sm:w-32" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="skeleton-line w-3/4" />
            <div className="skeleton-line w-11/12" />
            <div className="skeleton-line w-2/3" />
            <div className="flex gap-2 pt-2">
              <div className="skeleton-chip" />
              <div className="skeleton-chip w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "menu") {
    return (
      <div className="ui-card compact-mobile-row flex min-h-[8.75rem] gap-4 p-3 sm:p-4">
        <div className="skeleton-block h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="skeleton-line w-3/4" />
          <div className="skeleton-line w-full" />
          <div className="skeleton-line w-2/3" />
          <div className="flex items-center justify-between pt-2">
            <div className="skeleton-line w-16" />
            <div className="skeleton-block h-10 w-10 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-card overflow-hidden p-0">
      <div className="skeleton-block h-48 rounded-none" />
      <div className="space-y-3 p-5">
        <div className="flex justify-between gap-3">
          <div className="skeleton-line w-2/3" />
          <div className="skeleton-chip w-20" />
        </div>
        <div className="skeleton-line w-full" />
        <div className="skeleton-line w-5/6" />
        <div className="skeleton-line w-1/2" />
      </div>
    </div>
  );
};

export const SkeletonState = ({
  type = "restaurants",
  count = 6,
  title,
}: SkeletonStateProps) => (
  <div className="page-wrap space-y-5 py-6">
    {title && (
      <div className="ui-card p-4 sm:p-5">
        <div className="skeleton-chip" />
        <div className="skeleton-line mt-4 w-72 max-w-full" />
        <div className="skeleton-line mt-3 w-full max-w-xl" />
      </div>
    )}
    <div className={`grid ${gridByType[type]}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} type={type} />
      ))}
    </div>
  </div>
);
