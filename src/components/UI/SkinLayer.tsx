import React from 'react';

export type SkinLayerProps = {
  children: React.ReactNode;
  skin?: 'default' | 'forge';
  className?: string;
};

export const SkinLayer: React.FC<SkinLayerProps> = ({
  children,
  skin = 'default',
  className = '',
}) => {
  return (
    <div className={`${className} ${skin === 'forge' ? 'forge' : ''}`.trim()}>
      {children}
    </div>
  );
};
