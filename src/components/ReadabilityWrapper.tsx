import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReadabilityWrapperProps {
  children?: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  spacing?: "tight" | "normal" | "relaxed";
}

export function ReadabilityWrapper({ 
  children, 
  className,
  maxWidth = "2xl",
  spacing = "normal"
}: ReadabilityWrapperProps) {
  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl", 
    lg: "max-w-5xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-full"
  };

  const spacingClasses = {
    tight: "space-y-4",
    normal: "space-y-6",
    relaxed: "space-y-8"
  };

  return (
    <div className={cn(
      "mx-auto px-4 sm:px-6 lg:px-8",
      maxWidthClasses[maxWidth],
      spacingClasses[spacing],
      className
    )}>
      <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
        {children}
      </div>
    </div>
  );
}

// Typography utility components for consistent styling
export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn(
      "text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight",
      className
    )}>
      {children}
    </h1>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn(
      "text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight",
      className
    )}>
      {children}
    </h2>
  );
}

export function SubsectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn(
      "text-xl md:text-2xl font-semibold text-slate-800 mb-3 leading-tight",
      className
    )}>
      {children}
    </h3>
  );
}

export function BodyText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn(
      "text-base md:text-lg text-slate-700 leading-relaxed mb-4",
      className
    )}>
      {children}
    </p>
  );
}

export function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn(
      "text-sm text-slate-600 leading-normal",
      className
    )}>
      {children}
    </p>
  );
}
