import React from 'react';

/**
 * MenuLayout
 * Shared layout for all non-gameplay screens (Home, Play Menu, Dashboard, etc.)
 */

interface MenuLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const MenuLayout: React.FC<MenuLayoutProps> = ({
  children,
  header,
  footer,
}) => {
  return (
    <div className="flex flex-col w-full h-full max-w-4xl mx-auto px-6 py-8 overflow-y-auto">
      {header && (
        <div className="shrink-0 mb-8 w-full">
          {header}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center w-full">
        {children}
      </div>

      {footer && (
        <div className="shrink-0 mt-8 py-4 w-full flex justify-center">
          {footer}
        </div>
      )}
    </div>
  );
};
