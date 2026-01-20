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
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
    <Loader size="lg" text={text || "Loading..."} />
  </div>
);
