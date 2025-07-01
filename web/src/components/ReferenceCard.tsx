'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface Source {
  id: string;
  title: string;
  url: string;
  description: string;
  favicon?: string;
}

interface ReferenceCardProps {
  source: Source;
  index: number;
}

export default function ReferenceCard({ source, index }: ReferenceCardProps) {
  const handleClick = () => {
    window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  const getDomainName = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const getFaviconUrl = (url: string) => {
    if (source.favicon) return source.favicon;
    try {
      const domain = new URL(url).origin;
      return `${domain}/favicon.ico`;
    } catch {
      return null;
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/30 group bg-card/50 hover:bg-card"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge variant="outline" className="text-xs font-medium shrink-0 bg-primary/10 text-primary border-primary/20">
              {index}
            </Badge>
            {getFaviconUrl(source.url) && (
              <img
                src={getFaviconUrl(source.url) || ''}
                alt=""
                className="w-4 h-4 rounded shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="text-xs text-muted-foreground truncate">
              {getDomainName(source.url)}
            </span>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>

        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
          {source.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {source.description}
        </p>
      </CardContent>
    </Card>
  );
}
