import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pin, EyeOff, CheckCheck, Archive, Trash2, Tag, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  clientId: string;
  userId: string;
  convStateId?: string | null;
  pinned?: boolean;
  markedUnread?: boolean;
  onChanged?: () => void;
}

export default function ConversationActionsMenu({ clientId, userId, convStateId, pinned, markedUnread, onChanged }: Props) {
  const updateState = async (patch: any) => {
    if (convStateId) {
      await supabase.from("conversation_state").update(patch).eq("id", convStateId);
    } else {
      await supabase.from("conversation_state").insert({ user_id: userId, client_id: clientId, ...patch } as any);
    }
    onChanged?.();
  };

  const markUnread = async () => {
    await supabase.from("messages").update({ is_read: false }).eq("client_id", clientId).eq("user_id", userId).eq("direction", "inbound");
    await updateState({ marked_unread: true });
    toast.success("Marcado como não lido");
  };

  const markRead = async () => {
    await supabase.from("messages").update({ is_read: true }).eq("client_id", clientId).eq("user_id", userId).eq("direction", "inbound");
    await updateState({ marked_unread: false });
    toast.success("Marcado como lido");
  };

  const togglePin = async () => {
    await updateState({ pinned: !pinned });
    toast.success(pinned ? "Conversa desafixada" : "Conversa fixada");
  };

  const archive = async () => {
    await supabase.from("chat_clients").update({
      metadata: { archived: true, archived_at: new Date().toISOString() } as any,
    }).eq("id", clientId);
    toast.success("Conversa arquivada");
    onChanged?.();
  };

  const removeConv = async () => {
    if (!confirm("Excluir esta conversa? Mensagens, status e histórico serão removidos.")) return;
    await supabase.from("messages").delete().eq("client_id", clientId);
    await supabase.from("conversation_state").delete().eq("client_id", clientId);
    await supabase.from("chat_clients").delete().eq("id", clientId);
    toast.success("Conversa excluída");
    onChanged?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={togglePin}>
          <Pin className="h-4 w-4 mr-2" /> {pinned ? "Desafixar" : "Fixar no topo"}
        </DropdownMenuItem>
        {markedUnread ? (
          <DropdownMenuItem onClick={markRead}>
            <CheckCheck className="h-4 w-4 mr-2" /> Marcar como lida
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={markUnread}>
            <EyeOff className="h-4 w-4 mr-2" /> Marcar como não lida
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => updateState({ ai_active: false, mode: "human" })}>
          <BellOff className="h-4 w-4 mr-2" /> Pausar IA
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={archive}>
          <Archive className="h-4 w-4 mr-2" /> Arquivar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={removeConv} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Excluir conversa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
