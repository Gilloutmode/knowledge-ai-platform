import React from 'react';
import { Youtube, FileText, Rss } from 'lucide-react';

export type SourceType = 'youtube' | 'rss' | 'document';

interface SourceBadgeProps {
  type: SourceType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const sourceConfig = {
  youtube: {
    icon: Youtube,
    color: 'bg-red-500/20 text-red-500',
    label: 'YouTube',
  },
  rss: {
    icon: Rss,
    color: 'bg-orange-500/20 text-orange-500',
    label: 'RSS',
  },
  document: {
    icon: FileText,
    color: 'bg-blue-500/20 text-blue-500',
    label: 'Document',
  },
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({ type, size = 'sm', showLabel = true }) => {
  const config = sourceConfig[type];
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center gap-1 ${config.color} ${sizeClasses} rounded-full font-medium`}
    >
      <Icon size={iconSize} />
      {showLabel && config.label}
    </span>
  );
};

export default SourceBadge;
