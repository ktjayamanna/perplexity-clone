'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Globe } from 'lucide-react';
import ReferenceCard from './ReferenceCard';

interface Source {
  id: string;
  title: string;
  url: string;
  description: string;
  favicon?: string;
}

interface SearchResultsProps {
  response?: {
    answer: string;
    sources: Source[];
  };
  isLoading?: boolean;
}

export default function SearchResults({ response, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
          <span className="text-muted-foreground">Searching the web...</span>
        </div>
        {/* Loading skeleton */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!response) return null;

  const { answer, sources } = response;
  const keyReferences = sources.slice(0, 4); // Show first 4 as key references

  return (
    <div className="space-y-6">
      <Tabs defaultValue="answer" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-muted/50">
          <TabsTrigger value="answer" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sparkles className="h-4 w-4" />
            Answer
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Globe className="h-4 w-4" />
            Sources
            <Badge variant="secondary" className="ml-1 text-xs bg-muted-foreground/20">
              {sources.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="answer" className="mt-6 space-y-6">
          {/* Key References */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keyReferences.map((source, index) => (
              <ReferenceCard
                key={source.id}
                source={source}
                index={index + 1}
              />
            ))}
          </div>

          {/* Answer Text */}
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="text-foreground leading-relaxed whitespace-pre-wrap text-base">
              {answer}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <div className="space-y-4">
            {sources.map((source, index) => (
              <div
                key={source.id}
                className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => window.open(source.url, '_blank')}
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {source.favicon && (
                      <img
                        src={source.favicon}
                        alt=""
                        className="w-4 h-4 rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <h3 className="font-medium text-foreground truncate">
                      {source.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {source.description}
                  </p>
                  <div className="text-xs text-muted-foreground truncate">
                    {new URL(source.url).hostname}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
