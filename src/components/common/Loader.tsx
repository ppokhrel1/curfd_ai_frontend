import { cn } from "@/utils/formatters";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const Loader = ({ size = "md", className, text }: LoaderProps) => {
  const sizeStyles = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-4 border-gray-200 border-t-primary-600",
          sizeStyles[size]
        )}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
};

export const FullPageLoader = ({ text }: { text?: string }) => (
  <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
      <p className="text-sm text-neutral-400">{text || "Loading..."}</p>
    </div>
  </div>
);

export const MessageSkeleton = () => (
  <div className="animate-pulse space-y-3 p-4">
    <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
    <div className="h-4 bg-neutral-800 rounded w-1/2"></div>
    <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
  </div>
);

export const ModelLoadingSkeleton = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
        <div className="relative w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
      </div>
      <p className="text-sm text-neutral-400 mb-1">Loading 3D model...</p>
      <p className="text-xs text-neutral-600">This may take a moment</p>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="animate-pulse bg-neutral-900 border border-neutral-800 rounded-lg p-4">
    <div className="h-4 bg-neutral-800 rounded w-1/2 mb-3"></div>
    <div className="h-3 bg-neutral-800 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-neutral-800 rounded w-2/3"></div>
  </div>
);
