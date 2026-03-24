import { useState } from "react";
import { ChevronDown, Move, Copy, Trash2, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutControlsProps {
  selectedId: string | null;
  onPaddingChange: (direction: "top" | "bottom" | "left" | "right", value: number) => void;
  onMarginChange: (direction: "top" | "bottom" | "left" | "right", value: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  isVisible: boolean;
  isLocked: boolean;
  padding: { top: number; bottom: number; left: number; right: number };
  margin: { top: number; bottom: number; left: number; right: number };
}

export const LayoutControls = ({
  selectedId,
  onPaddingChange,
  onMarginChange,
  onDuplicate,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  isVisible,
  isLocked,
  padding,
  margin,
}: LayoutControlsProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>("padding");

  if (!selectedId) return null;

  return (
    <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
      {/* Quick Actions */}
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs bg-slate-700/50 hover:bg-slate-600 border-slate-600"
          onClick={onDuplicate}
        >
          <Copy className="h-3 w-3 mr-1" />
          Duplicar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs bg-slate-700/50 hover:bg-slate-600 border-slate-600"
          onClick={onToggleVisibility}
        >
          {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs bg-slate-700/50 hover:bg-slate-600 border-slate-600"
          onClick={onToggleLock}
        >
          {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1 h-8 text-xs bg-red-600/50 hover:bg-red-600 border-red-600"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Deletar
        </Button>
      </div>

      {/* Padding Controls */}
      <div className="border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "padding" ? null : "padding")}
          className="w-full px-3 py-2 flex items-center justify-between bg-slate-700/30 hover:bg-slate-700/50 transition text-sm font-medium text-slate-100"
        >
          <span>📦 Preenchimento (Padding)</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expandedSection === "padding" ? "rotate-180" : ""}`}
          />
        </button>
        {expandedSection === "padding" && (
          <div className="p-3 bg-slate-800/30 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Topo</label>
                <input
                  type="number"
                  value={padding.top}
                  onChange={(e) => onPaddingChange("top", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Fundo</label>
                <input
                  type="number"
                  value={padding.bottom}
                  onChange={(e) => onPaddingChange("bottom", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Esquerda</label>
                <input
                  type="number"
                  value={padding.left}
                  onChange={(e) => onPaddingChange("left", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Direita</label>
                <input
                  type="number"
                  value={padding.right}
                  onChange={(e) => onPaddingChange("right", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Margin Controls */}
      <div className="border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "margin" ? null : "margin")}
          className="w-full px-3 py-2 flex items-center justify-between bg-slate-700/30 hover:bg-slate-700/50 transition text-sm font-medium text-slate-100"
        >
          <span>📏 Espaçamento (Margin)</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expandedSection === "margin" ? "rotate-180" : ""}`}
          />
        </button>
        {expandedSection === "margin" && (
          <div className="p-3 bg-slate-800/30 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Topo</label>
                <input
                  type="number"
                  value={margin.top}
                  onChange={(e) => onMarginChange("top", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Fundo</label>
                <input
                  type="number"
                  value={margin.bottom}
                  onChange={(e) => onMarginChange("bottom", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Esquerda</label>
                <input
                  type="number"
                  value={margin.left}
                  onChange={(e) => onMarginChange("left", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Direita</label>
                <input
                  type="number"
                  value={margin.right}
                  onChange={(e) => onMarginChange("right", parseInt(e.target.value))}
                  className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
