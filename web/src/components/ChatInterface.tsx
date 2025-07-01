'use client';

import { useState, useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);

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
      // Mock API call - will be replaced with real APIs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Mock response data
      const mockResponse = {
        answer: `Eminem is the stage name of Marshall Bruce Mathers III, an American rapper, songwriter, and record producer born on October 17, 1972, in St. Joseph, Missouri. He is widely regarded as one of the most influential and best-selling artists in hip-hop and popular music, credited with popularizing hip-hop in Middle America and breaking down racial barriers for white rappers in the genre.

Eminem rose to fame with his major-label debut, The Slim Shady LP (1999), followed by critically and commercially successful albums such as The Marshall Mathers LP (2000) and The Eminem Show (2002). He is known for his controversial lyrics, technical rap skills, and alter ego "Slim Shady."`,
        sources: [
          {
            id: '1',
            title: 'Eminem - Wikipedia',
            url: 'https://en.wikipedia.org/wiki/Eminem',
            description: 'Marshall Bruce Mathers III (born October 17, 1972), known professionally as Eminem, is an American rapper, songwriter, and record producer. Regarded as one of the greatest and most influential rappers of all time, he is credited with popularizing hip-hop in Middle America and...',
            favicon: 'https://en.wikipedia.org/favicon.ico'
          },
          {
            id: '2',
            title: 'Eminem - Biography - IMDb',
            url: 'https://imdb.com/name/nm0004896/',
            description: 'Eminem. Actor: 8 Mile. Eminem was born Marshall Bruce Mathers III in St. Joseph, Missouri, to Deborah R. (Nelson) and Marshall Bruce Mathers, Jr., who were in a band together, Daddy Warbucks. He is of English, as well as some German, Scottish ancestry. Marshall spent his early...',
            favicon: 'https://imdb.com/favicon.ico'
          },
          {
            id: '3',
            title: 'Eminem | Biography, Songs, Albums, Slim Shady, Music, & Facts',
            url: 'https://britannica.com/biography/Eminem',
            description: 'Eminem is an American rapper, record producer, and actor who is known as one of the most-controversial and best-selling artists of the early 21st century. His best-known songs include "My Name Is," "The Real Slim Shady," "Stan," and "Lose Yourself."',
            favicon: 'https://britannica.com/favicon.ico'
          },
          {
            id: '4',
            title: 'Eminem In His Own Words | MTV News - YouTube',
            url: 'https://youtube.com/watch?v=Oj2_yx',
            description: 'Eminem In His Own Words | MTV News - YouTube',
            favicon: 'https://youtube.com/favicon.ico'
          }
        ]
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, response: mockResponse, isLoading: false }
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
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, isLoading: false }
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
      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
