import { Copy, Check } from 'lucide-react';
import { Button } from '../../components/Button';
import { useClipboard } from '../../hooks/useClipboard';
import { useToast } from '../../components/Toast';

interface CopyButtonProps {
  text: string;
  label: string;
  successMessage?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function CopyButton({ text, label, successMessage, variant = 'secondary', size = 'sm' }: CopyButtonProps) {
  const { copy, copied, error } = useClipboard();
  const { show } = useToast();

  const handleClick = async () => {
    const ok = await copy(text);
    if (ok) {
      show(successMessage ?? 'Copied to clipboard', 'success');
    } else {
      show(`Couldn't copy automatically. ${error ?? ''}`.trim(), 'error');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-label={label}
      data-testid={`copy-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {copied ? (
        <>
          <Check size={14} aria-hidden="true" className="mr-1.5" />
          Copied
        </>
      ) : (
        <>
          <Copy size={14} aria-hidden="true" className="mr-1.5" />
          {label}
        </>
      )}
    </Button>
  );
}