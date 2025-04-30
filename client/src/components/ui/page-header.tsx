import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon
}) => {
  return (
    <div className="flex flex-col space-y-1.5 mb-6">
      <h1 className="text-2xl font-bold flex items-center">
        {icon && <span className="mr-2 text-purple-500">{icon}</span>}
        {title}
      </h1>
      {description && (
        <p className="text-sm text-gray-400">{description}</p>
      )}
    </div>
  );
};