import { Button } from "@/components/ui/button";
import { Sparkles, Zap } from "lucide-react";

export const ANIMATION_PRESETS = [
  {
    id: "fade-in",
    name: "Fade In",
    description: "Suave aparecimento",
    icon: "👁️",
    css: `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      animation: fadeIn 0.8s ease-in-out;
    `,
  },
  {
    id: "slide-up",
    name: "Slide Up",
    description: "Desliza de baixo",
    icon: "⬆️",
    css: `
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      animation: slideUp 0.8s ease-out;
    `,
  },
  {
    id: "slide-down",
    name: "Slide Down",
    description: "Desliza de cima",
    icon: "⬇️",
    css: `
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      animation: slideDown 0.8s ease-out;
    `,
  },
  {
    id: "slide-left",
    name: "Slide Left",
    description: "Desliza da direita",
    icon: "⬅️",
    css: `
      @keyframes slideLeft {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
      }
      animation: slideLeft 0.8s ease-out;
    `,
  },
  {
    id: "slide-right",
    name: "Slide Right",
    description: "Desliza da esquerda",
    icon: "➡️",
    css: `
      @keyframes slideRight {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
      }
      animation: slideRight 0.8s ease-out;
    `,
  },
  {
    id: "scale-in",
    name: "Scale In",
    description: "Aumenta do centro",
    icon: "📈",
    css: `
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }
      animation: scaleIn 0.6s ease-out;
    `,
  },
  {
    id: "bounce-in",
    name: "Bounce In",
    description: "Salta ao aparecer",
    icon: "🎾",
    css: `
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `,
  },
  {
    id: "flip-in",
    name: "Flip In",
    description: "Vira ao aparecer",
    icon: "🔄",
    css: `
      @keyframes flipIn {
        from { opacity: 0; transform: rotateY(90deg); }
        to { opacity: 1; transform: rotateY(0); }
      }
      animation: flipIn 0.6s ease-out;
      perspective: 1000px;
    `,
  },
  {
    id: "rotate-in",
    name: "Rotate In",
    description: "Gira ao aparecer",
    icon: "🔁",
    css: `
      @keyframes rotateIn {
        from { opacity: 0; transform: rotate(-10deg); }
        to { opacity: 1; transform: rotate(0); }
      }
      animation: rotateIn 0.6s ease-out;
    `,
  },
  {
    id: "pulse",
    name: "Pulse",
    description: "Pulsa continuamente",
    icon: "💓",
    css: `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    `,
  },
];

interface AnimationPresetsProps {
  onSelect: (preset: (typeof ANIMATION_PRESETS)[0]) => void;
  selectedAnimation?: string;
}

export const AnimationPresets = ({ onSelect, selectedAnimation }: AnimationPresetsProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-100">Animações</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ANIMATION_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            onClick={() => onSelect(preset)}
            variant={selectedAnimation === preset.id ? "default" : "outline"}
            className={`h-auto py-3 px-2 flex flex-col items-center justify-center gap-1 text-xs transition-all ${
              selectedAnimation === preset.id
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50 text-slate-200"
            }`}
          >
            <span className="text-lg">{preset.icon}</span>
            <span className="font-medium">{preset.name}</span>
            <span className="text-xs text-slate-400">{preset.description}</span>
          </Button>
        ))}
      </div>
      <div className="p-3 bg-slate-800/30 rounded border border-slate-700/50 text-xs text-slate-400">
        <p className="flex items-center gap-2">
          <Zap className="h-3 w-3" />
          Selecione uma animação para aplicar ao elemento
        </p>
      </div>
    </div>
  );
};
