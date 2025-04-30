import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6",
      className
    )}>
      <div className="flex items-center gap-2">
        {icon && (
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-md bg-purple-600 text-white">
            {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" })}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex-shrink-0 mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
}