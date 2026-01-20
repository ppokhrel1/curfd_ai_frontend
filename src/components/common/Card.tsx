import { cn } from "@/utils/formatters";
import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "gradient";
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  padding = "md",
  variant = "default",
  className,
  ...props
}) => {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const variantStyles = {
    default: "bg-neutral-900/50 backdrop-blur-sm border border-neutral-800",
    gradient:
      "bg-gradient-to-br from-neutral-900/50 to-neutral-900/30 backdrop-blur-sm border border-neutral-800",
  };

  return (
    <div
      className={cn(
        "rounded-xl shadow-lg",
        variantStyles[variant],
        hover &&
          "transition-all duration-300 hover:shadow-2xl hover:border-green-500/30 hover:scale-[1.02]",
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className,
}) => (
  <div className={cn("mb-4 pb-4 border-b border-neutral-800", className)}>
    {children}
  </div>
);

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className,
}) => (
  <h3 className={cn("text-xl font-semibold text-white", className)}>
    {children}
  </h3>
);

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
}) => <div className={cn("text-neutral-300", className)}>{children}</div>;
