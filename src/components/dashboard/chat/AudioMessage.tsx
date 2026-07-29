import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileAudio } from "lucide-react";
import { toast } from "sonner";

interface AudioMessageProps {
  messageId: string;
  mediaUrl: string;
  playableUrl?: string | null;
  transcript?: string | null;
  isOut?: boolean;
}

const isEnc = (u: string) => /\.enc(\?|$)/i.test(u || "");

/**
 * Player de áudio do chat com transcrição sob demanda.
 * Áudios do WhatsApp chegam criptografados (.enc) e não tocam no navegador —
 * a edge function `transcribe-message` baixa a versão descriptografada,
 * salva no nosso storage e devolve o link permanente + transcrição.
 */
export default function AudioMessage({ messageId, mediaUrl, playableUrl, transcript, isOut }: AudioMessageProps) {
  const [url, setUrl] = useState<string>(playableUrl || (isEnc(mediaUrl) ? "" : mediaUrl));
  const [text, setText] = useState<string>(transcript || "");
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const tried = useRef(false);

  useEffect(() => { if (playableUrl) setUrl(playableUrl); }, [playableUrl]);
  useEffect(() => { if (transcript) setText(transcript); }, [transcript]);

  const resolve = async (mode: "audio" | "full") => {
    const setLoading = mode === "audio" ? setLoadingAudio : setLoadingText;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-message", {
        body: { message_id: messageId, mode },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.audio_url) setUrl((data as any).audio_url);
      if ((data as any)?.transcript) setText((data as any).transcript);
      else if (mode === "full") toast.info("Não foi possível transcrever este áudio.");
    } catch (e: any) {
      if (mode === "full") toast.error(e?.message || "Falha ao transcrever o áudio.");
    } finally {
      setLoading(false);
    }
  };

  // Recupera automaticamente o áudio tocável quando o link original é criptografado
  useEffect(() => {
    if (url || tried.current) return;
    tried.current = true;
    resolve("audio");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="mb-1 space-y-1">
      {url ? (
        <audio controls src={url} className="max-w-full" preload="none" />
      ) : loadingAudio ? (
        <div className="flex items-center gap-2 text-[11px] opacity-80 py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Recuperando áudio...
        </div>
      ) : (
        <Button size="sm" variant={isOut ? "secondary" : "outline"} className="h-7 gap-1 text-[11px]"
          onClick={() => resolve("audio")}>
          <FileAudio className="h-3 w-3" /> Carregar áudio
        </Button>
      )}

      {text ? (
        <p className="text-[11px] italic opacity-80">📝 "{text}"</p>
      ) : (
        <Button size="sm" variant={isOut ? "secondary" : "outline"} className="h-6 gap-1 text-[10px]"
          disabled={loadingText} onClick={() => resolve("full")}>
          {loadingText ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileAudio className="h-3 w-3" />}
          {loadingText ? "Transcrevendo..." : "Transcrever áudio"}
        </Button>
      )}
    </div>
  );
}
