'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square } from 'lucide-react';
import SearchResults from './SearchResults';

interface Message {
  id: string;
  query: string;
  response?: {
    answer: string;
    sources: Array<{
      id: string;
      title: string;
      url: string;
      description: string;
      favicon?: string;
    }>;
  };
  isLoading?: boolean;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [userLocation, setUserLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Retry mechanism
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second

  // Auto-detect location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            const location = `${data.city}, ${data.principalSubdivision}` || 'New York, NY';
            setUserLocation(location);
          } catch (error) {
            console.error('Error getting location:', error);
            setUserLocation('New York, NY'); // Default fallback
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setUserLocation('New York, NY'); // Default fallback
          setShowLocationInput(true); // Show manual input if geolocation fails
        }
      );
    } else {
      setUserLocation('New York, NY'); // Default fallback
      setShowLocationInput(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuery.trim() || isLoading) return;

    const messageId = Date.now().toString();
    const newMessage: Message = {
      id: messageId,
      query: currentQuery,
      isLoading: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentQuery('');
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Enhance query with location if it seems location-relevant
      const locationKeywords = ['near me', 'nearby', 'close to', 'in my area', 'local'];
      const isLocationQuery = locationKeywords.some(keyword =>
        currentQuery.toLowerCase().includes(keyword)
      );

      const enhancedQuery = isLocationQuery && userLocation
        ? currentQuery.replace(/near me|nearby|in my area|local/gi, `in ${userLocation}`)
        : currentQuery;

      // Call server-side API
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: enhancedQuery,
          location: userLocation
        }),
        signal: abortControllerRef.current.signal,
      });

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const searchResponse = await response.json();

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, response: searchResponse, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        // Handle other errors
        console.error('Error fetching response:', error);

        let errorMessage = 'Sorry, I encountered an error while searching. Please try again.';

        if (error instanceof Error) {
          if (error.message.includes('Rate limit')) {
            errorMessage = 'Too many requests. Please wait a moment before trying again.';
          } else if (error.message.includes('HTTP 500')) {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
          } else if (error.message.includes('HTTP 400')) {
            errorMessage = 'Invalid search query. Please try rephrasing your question.';
          }
        }

        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  response: {
                    answer: errorMessage,
                    sources: []
                  },
                  isLoading: false
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      // Remove the loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-center py-8 border-b border-border/50">
        <h1 className="text-2xl font-semibold text-foreground">perplexity</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 smooth-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 py-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                Ask me anything to get started
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className="space-y-6">
              {/* User Query */}
              <div className="text-2xl font-medium text-foreground leading-relaxed">
                {message.query}
              </div>

              {/* Search Results */}
              {(message.response || message.isLoading) && (
                <SearchResults
                  response={message.response}
                  isLoading={message.isLoading}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          {/* Location Display/Input */}
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>📍</span>
            {showLocationInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="Enter your location (e.g., New York, NY)"
                  className="bg-transparent border-b border-muted-foreground/30 px-2 py-1 text-sm focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowLocationInput(false)}
                  className="text-xs text-primary hover:underline"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{userLocation || 'Location not set'}</span>
                <button
                  type="button"
                  onClick={() => setShowLocationInput(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="relative">
            <Textarea
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              placeholder="Ask anything..."
              className="min-h-[60px] pr-12 resize-none border-border/50 bg-background/50 focus:bg-background transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute right-2 bottom-2">
              {isLoading ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleStop}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={!currentQuery.trim()}
                  className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
