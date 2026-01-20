import { cn } from "@/utils/formatters";
import { ReactNode } from "react";

interface HeaderProps {
  children: ReactNode;
  className?: string;
  transparent?: boolean;
}

export const Header = ({
  children,
  className,
  transparent = false,
}: HeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        transparent
          ? "bg-white/80 backdrop-blur-md border-gray-200/50"
          : "bg-white border-gray-200",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </header>
  );
};

interface HeaderContentProps {
  children: ReactNode;
  className?: string;
}

export const HeaderContent = ({ children, className }: HeaderContentProps) => {
  return (
    <div className={cn("flex items-center justify-between h-16", className)}>
      {children}
    </div>
  );
};

interface HeaderLogoProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export const HeaderLogo = ({ icon, title, subtitle }: HeaderLogoProps) => {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
};

interface HeaderActionsProps {
  children: ReactNode;
  className?: string;
}

export const HeaderActions = ({ children, className }: HeaderActionsProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>{children}</div>
  );
};
