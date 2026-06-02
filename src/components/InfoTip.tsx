import { useState } from "react";
import { Info } from "lucide-react";

interface InfoTipProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * Pequeno ícone de ajuda. Ao clicar abre um popover com explicação curta.
 * Usa apenas tokens semânticos do design system.
 */
const InfoTip = ({ title, children }: InfoTipProps) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Mais informações"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute z-50 left-5 top-0 w-64 rounded-lg border border-border bg-popover text-popover-foreground p-3 shadow-lg text-xs">
          {title && <p className="font-semibold mb-1 text-foreground">{title}</p>}
          <div className="text-muted-foreground leading-relaxed">{children}</div>
        </div>
      )}
    </span>
  );
};

export default InfoTip;
