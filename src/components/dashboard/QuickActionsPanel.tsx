import { Button } from "@/components/ui/button";
import {
  Copy, Trash2, RotateCcw, Lock, Unlock, Eye, EyeOff,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ChevronUp, ChevronDown, Maximize2, Minimize2
} from "lucide-react";

interface QuickActionsPanelProps {
  selectedElement: any;
  onDuplicate: () => void;
  onDelete: () => void;
  onReset: () => void;
  onToggleLock?: () => void;
  onToggleVisibility?: () => void;
}

export const QuickActionsPanel = ({
  selectedElement,
  onDuplicate,
  onDelete,
  onReset,
  onToggleLock,
  onToggleVisibility,
}: QuickActionsPanelProps) => {
  if (!selectedElement) return null;

  const isLocked = selectedElement.get("locked");
  const isHidden = selectedElement.get("hidden");

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={onDuplicate}
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
          title="Duplicar (Ctrl+D)"
        >
          <Copy className="h-3 w-3" />
          <span className="hidden sm:inline">Duplicar</span>
        </Button>
        <Button
          onClick={onReset}
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
          title="Resetar Estilos"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Resetar</span>
        </Button>
        <Button
          onClick={onDelete}
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-950/20"
          title="Deletar"
        >
          <Trash2 className="h-3 w-3" />
          <span className="hidden sm:inline">Deletar</span>
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        {onToggleLock && (
          <Button
            onClick={onToggleLock}
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title={isLocked ? "Desbloquear" : "Bloquear"}
          >
            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            <span className="hidden sm:inline">{isLocked ? "Bloqueado" : "Bloquear"}</span>
          </Button>
        )}
        {onToggleVisibility && (
          <Button
            onClick={onToggleVisibility}
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title={isHidden ? "Mostrar" : "Ocultar"}
          >
            {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span className="hidden sm:inline">{isHidden ? "Oculto" : "Visível"}</span>
          </Button>
        )}
      </div>

      {/* Alignment Actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400">Alinhamento</p>
        <div className="grid grid-cols-4 gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title="Alinhar ao Centro"
          >
            <AlignCenter className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title="Alinhar à Direita"
          >
            <AlignRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title="Justificar"
          >
            <AlignJustify className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Stacking Actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400">Camadas</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title="Trazer para Frente"
          >
            <ChevronUp className="h-3 w-3" />
            <span className="hidden sm:inline">Frente</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
            title="Enviar para Trás"
          >
            <ChevronDown className="h-3 w-3" />
            <span className="hidden sm:inline">Trás</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
