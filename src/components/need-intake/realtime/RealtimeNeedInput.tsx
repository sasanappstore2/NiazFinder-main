'use client';

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTypingAnalysis } from '@/hooks/typing/use-typing-analysis';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { TypingAnalysisStrip } from './TypingAnalysisStrip';
import { SuggestionDropdown } from './SuggestionDropdown';
import { TypingIndicator } from './TypingIndicator';

interface RealtimeNeedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  city?: string | null;
}

export function RealtimeNeedInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'مثلاً: تعمیرکار کولر فوری غرب تهران',
  city,
}: RealtimeNeedInputProps) {
  const typingAnalysis = useNeedIntakeStore((s) => s.typingAnalysis);
  const analysisStatus = useNeedIntakeStore((s) => s.analysisStatus);
  const typingPreloading = useNeedIntakeStore((s) => s.typingPreloading);

  const { onTextChange } = useTypingAnalysis({
    city: city ?? undefined,
    enabled: !disabled,
  });

  const handleChange = (text: string) => {
    onChange(text);
    onTextChange(text);
  };

  const suggestions = typingAnalysis?.suggestions ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[120px] text-lg"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <div className="absolute left-3 top-3">
          <TypingIndicator status={analysisStatus} />
        </div>
      </div>

      {suggestions.length > 0 && value.trim().length >= 2 && (
        <SuggestionDropdown
          suggestions={suggestions}
          onSelect={(phrase) => {
            onChange(phrase);
            onTextChange(phrase);
          }}
        />
      )}

      <TypingAnalysisStrip
        result={typingAnalysis}
        status={analysisStatus}
        preloading={typingPreloading}
      />

      <Button
        className="h-12 w-full"
        onClick={onSubmit}
        disabled={!value.trim() || disabled}
      >
        <Send className="ml-2 size-4" />
        شروع
      </Button>
    </div>
  );
}
