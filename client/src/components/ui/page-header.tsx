import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  className, 
  actions,
  icon
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between mb-6", className)}>
      <div className="flex items-center space-x-3">
        {icon && (
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-600/10 text-purple-600">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-primary bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="mt-4 flex items-center gap-2 md:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}