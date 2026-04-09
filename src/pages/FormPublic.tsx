import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Timer, Users as UsersIcon } from "lucide-react";

interface FormField {
  id: string; type: string; label: string; placeholder?: string; required?: boolean;
  options?: string[]; min?: number; max?: number;
  conditionalField?: string; conditionalValue?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /\d/;
const MIN_PHONE_DIGITS = 10;

const FormPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(-1); // -1 = welcome screen
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from("forms").select("*").eq("slug", slug).eq("is_active", true).eq("is_published", true).maybeSingle();
      if (data) {
        setForm(data);
        setFields(Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : []);
        const settings = (data.settings || {}) as any;
        const ws = settings.welcomeScreen;
        if (ws?.enabled) {
          setCurrentStep(-1);
        } else {
          setCurrentStep(0);
        }
        if (settings.countdown?.enabled) {
          setCountdown((settings.countdown.minutes || 10) * 60);
        }
      }
      setLoading(false);
    };
    f();
  }, [slug]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(interval);
  }, [countdown > 0]);

  const isFieldVisible = (field: FormField) => {
    if (!field.conditionalField) return true;
    const depField = fields.find(f => f.id === field.conditionalField);
    if (!depField) return true;
    return answers[depField.id] === field.conditionalValue;
  };

  const visibleFields = fields.filter(isFieldVisible);

  // Question piping: replace {fieldLabel} with answered value
  const pipeLabel = useCallback((label: string) => {
    return label.replace(/\{(\w[\w\s]*)\}/g, (match, key) => {
      const field = fields.find(f => f.label.toLowerCase() === key.toLowerCase() || f.id === key);
      if (field && answers[field.id]) return answers[field.id];
      return match;
    });
  }, [fields, answers]);

  const validateField = (field: FormField): string | null => {
    const value = answers[field.id] || "";
    if (field.required && !value.trim()) return "Este campo é obrigatório";
    if (!value.trim()) return null;
    if (field.type === "email" && !EMAIL_REGEX.test(value)) return "E-mail inválido. Ex: nome@email.com";
    if (field.type === "phone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < MIN_PHONE_DIGITS) return `Telefone inválido. Mínimo ${MIN_PHONE_DIGITS} dígitos`;
    }
    return null;
  };

  const handleNext = () => {
    if (currentStep >= 0 && currentStep < visibleFields.length) {
      const error = validateField(visibleFields[currentStep]);
      if (error) { setFieldError(error); return; }
    }
    setFieldError(null);
    if (currentStep < visibleFields.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const buildWhatsAppUrl = (whatsappNumber: string, message: string, data: Record<string, string>) => {
    const nameField = fields.find(f => f.type === "text" && f.label.toLowerCase().includes("nome"));
    const emailField = fields.find(f => f.type === "email");
    const phoneField = fields.find(f => f.type === "phone");
    let msg = message || `Olá! Preenchi o formulário "${form.title}".`;
    msg = msg.replace(/\{nome\}/g, data[nameField?.id || ""] || "");
    msg = msg.replace(/\{email\}/g, data[emailField?.id || ""] || "");
    msg = msg.replace(/\{telefone\}/g, data[phoneField?.id || ""] || "");
    const phone = whatsappNumber.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form) return;
    const responses: Record<string, string> = {};
    visibleFields.forEach(f => { responses[f.label] = answers[f.id] || ""; });
    await supabase.from("form_responses").insert({ form_id: form.id, responses });

    // Create lead if CRM integration configured
    const pipelineId = form.pipeline_id;
    const stageId = form.stage_id;
    if (pipelineId || stageId) {
      const nameField = fields.find(f => f.type === "text" && f.label.toLowerCase().includes("nome"));
      const emailField = fields.find(f => f.type === "email");
      const phoneField = fields.find(f => f.type === "phone");
      const settings = form.settings || {};

      let finalStageId = stageId;
      // If only pipeline, get first stage
      if (pipelineId && !stageId) {
        const { data: stagesData } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("pipeline_id", pipelineId)
          .order("position", { ascending: true })
          .limit(1);
        if (stagesData?.length) finalStageId = stagesData[0].id;
      }

      if ((nameField || emailField) && finalStageId) {
        await supabase.from("leads").insert({
          name: answers[nameField?.id || ""] || "Form Lead",
          email: emailField ? answers[emailField.id] || null : null,
          phone: phoneField ? answers[phoneField.id] || null : null,
          source: settings.leadSource ? `${settings.leadSource}:${slug}` : `form:${slug}`,
          status: "new", stage_id: finalStageId, user_id: form.user_id,
          pipeline_id: pipelineId || null,
          tags: settings.autoTags || [],
        } as any);
      }
    }

    // Create notification for form owner
    await supabase.from("notifications").insert({
      user_id: form.user_id,
      type: "form_response",
      title: `Nova resposta: ${form.title}`,
      message: `Um lead preencheu o formulário "${form.title}"`,
      metadata: { form_id: form.id, slug },
    } as any);

    // Webhook
    if (form.webhook_url) {
      try {
        fetch(form.webhook_url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ form_id: form.id, form_title: form.title, responses, submitted_at: new Date().toISOString() }) }).catch(() => {});
      } catch {}
    }

    const settings = form.settings || {};

    // WhatsApp redirect
    if (form.whatsapp_redirect) {
      const waUrl = buildWhatsAppUrl(form.whatsapp_redirect, form.whatsapp_message || "", answers);
      setSubmitted(true);
      setTimeout(() => { window.open(waUrl, "_blank"); }, 500);
      return;
    }

    if (settings.redirectUrl) { window.location.href = settings.redirectUrl; return; }
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><div className="h-8 w-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><p>Formulário não encontrado</p></div>;

  const style = form.style || {};
  const settings = form.settings || {};
  const isMultiStep = settings.multiStep && visibleFields.length > 1;
  const bgColor = style.bgColor || "#000";
  const textColor = style.textColor || "#fff";
  const accentColor = style.accentColor || "#84CC16";
  const fontFamily = style.fontFamily || "Inter";
  const welcomeScreen = settings.welcomeScreen;
  const socialProof = settings.socialProof;
  const countdownSettings = settings.countdown;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const topBar = (
    <>
      {countdownSettings?.enabled && countdown > 0 && (
        <div style={{ background: accentColor, color: bgColor, padding: "8px 16px", textAlign: "center", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Timer style={{ width: 16, height: 16 }} /> {countdownSettings.text || "Oferta expira em"} {formatTime(countdown)}
        </div>
      )}
      {socialProof?.enabled && (
        <div style={{ textAlign: "center", padding: "6px 16px", fontSize: 11, color: `${textColor}80`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <UsersIcon style={{ width: 14, height: 14 }} /> {socialProof.text || "127 pessoas preencheram hoje"}
        </div>
      )}
    </>
  );

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor, color: textColor, fontFamily }}>
        <div className="text-center space-y-4 p-8" style={{ animation: "fadeUp .4s ease" }}>
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold">{settings.successMessage || "Obrigado!"}</h2>
          {form.whatsapp_redirect && (
            <button onClick={() => window.open(buildWhatsAppUrl(form.whatsapp_redirect, form.whatsapp_message || "", answers), "_blank")}
              style={{ padding: "14px 28px", background: "#25D366", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <MessageCircle style={{ width: 18, height: 18 }} /> Falar no WhatsApp
            </button>
          )}
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  // Welcome Screen
  if (currentStep === -1 && welcomeScreen?.enabled) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: bgColor, color: textColor, fontFamily }}>
        {topBar}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-lg space-y-6" style={{ animation: "fadeUp .5s ease" }}>
            {welcomeScreen.imageUrl && (
              <img src={welcomeScreen.imageUrl} alt="" style={{ maxHeight: 200, borderRadius: 16, margin: "0 auto", objectFit: "cover" }} />
            )}
            <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
              {welcomeScreen.title || form.title}
            </h1>
            {welcomeScreen.subtitle && (
              <p style={{ color: `${textColor}80`, fontSize: 16, lineHeight: 1.6 }}>{welcomeScreen.subtitle}</p>
            )}
            <button onClick={() => setCurrentStep(0)}
              style={{ padding: "16px 40px", background: accentColor, color: bgColor, fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16, transition: "transform .2s" }}>
              {welcomeScreen.buttonText || "Começar →"}
            </button>
          </div>
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  const currentField = isMultiStep ? visibleFields[currentStep] : null;
  const progress = isMultiStep ? ((currentStep + 1) / visibleFields.length) * 100 : 0;
  const inputBaseStyle: React.CSSProperties = { width: "100%", borderRadius: 12, padding: "14px 18px", fontSize: 14, border: `1px solid ${textColor}15`, background: `${textColor}05`, color: textColor, outline: "none" };

  const renderField = (field: FormField) => {
    if (field.type === "textarea") return <textarea value={answers[field.id] || ""} onChange={e => { setAnswers({ ...answers, [field.id]: e.target.value }); setFieldError(null); }} placeholder={field.placeholder} required={field.required} style={{ ...inputBaseStyle, resize: "vertical" }} rows={4} />;
    if (field.type === "select") return (
      <select value={answers[field.id] || ""} onChange={e => { setAnswers({ ...answers, [field.id]: e.target.value }); setFieldError(null); }} required={field.required} style={inputBaseStyle}>
        <option value="">{field.placeholder || "Selecione..."}</option>
        {(field.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    );
    if (field.type === "radio") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(field.options || []).map((opt, i) => {
          const selected = answers[field.id] === opt;
          return (
            <button key={i} type="button" onClick={() => { setAnswers({ ...answers, [field.id]: opt }); setFieldError(null); }}
              style={{ padding: "14px 18px", background: selected ? `${accentColor}12` : `${textColor}05`, border: `1px solid ${selected ? `${accentColor}50` : `${textColor}12`}`, borderRadius: 12, color: selected ? accentColor : textColor, fontWeight: selected ? 600 : 400, fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all .2s" }}>
              {opt}
            </button>
          );
        })}
      </div>
    );
    if (field.type === "nps" || field.type === "scale") {
      const min = field.min ?? 0; const max = field.max ?? 10;
      const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {values.map(v => {
            const selected = answers[field.id] === String(v);
            return (
              <button key={v} type="button" onClick={() => { setAnswers({ ...answers, [field.id]: String(v) }); setFieldError(null); }}
                style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${selected ? accentColor : `${textColor}15`}`, background: selected ? accentColor : `${textColor}05`, color: selected ? bgColor : textColor, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all .2s" }}>
                {v}
              </button>
            );
          })}
        </div>
      );
    }
    if (field.type === "checkbox") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(field.options || []).map((opt, i) => {
          const selected = (answers[field.id] || "").split(", ").includes(opt);
          return (
            <button key={i} type="button" onClick={() => {
              const current = (answers[field.id] || "").split(", ").filter(Boolean);
              const next = selected ? current.filter(c => c !== opt) : [...current, opt];
              setAnswers({ ...answers, [field.id]: next.join(", ") });
              setFieldError(null);
            }} style={{ padding: "14px 18px", background: selected ? `${accentColor}12` : `${textColor}05`, border: `1px solid ${selected ? `${accentColor}50` : `${textColor}12`}`, borderRadius: 12, color: selected ? accentColor : textColor, fontWeight: selected ? 600 : 400, fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? accentColor : `${textColor}30`}`, background: selected ? accentColor : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: bgColor }}>{selected ? "✓" : ""}</span>
              {opt}
            </button>
          );
        })}
      </div>
    );
    return <input type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={answers[field.id] || ""} onChange={e => { setAnswers({ ...answers, [field.id]: e.target.value }); setFieldError(null); }} placeholder={field.placeholder} required={field.required} style={inputBaseStyle} />;
  };

  if (isMultiStep && currentField) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: bgColor, color: textColor, fontFamily }}>
        {topBar}
        <div className="flex-1 flex items-center justify-center p-4">
          <div style={{ width: "100%", maxWidth: 560 }}>
            {settings.showProgressBar && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ height: 4, background: `${textColor}10`, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: accentColor, transition: "width .4s ease", borderRadius: 4 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: `${textColor}60` }}>{form.title}</span>
                  <span style={{ fontSize: 11, color: `${textColor}60` }}>{currentStep + 1}/{visibleFields.length}</span>
                </div>
              </div>
            )}
            <div key={currentField.id} style={{ animation: "fadeUp .4s ease" }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 24 }}>
                {pipeLabel(currentField.label)} {currentField.required && <span style={{ color: accentColor }}>*</span>}
              </h2>
              {renderField(currentField)}
              {fieldError && (
                <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8, fontWeight: 500 }}>⚠️ {fieldError}</p>
              )}
              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                {currentStep > 0 && <button type="button" onClick={() => { setCurrentStep(currentStep - 1); setFieldError(null); }} style={{ flex: 1, padding: 14, background: `${textColor}05`, border: `1px solid ${textColor}12`, borderRadius: 12, color: `${textColor}80`, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>← Voltar</button>}
                <button type="button" onClick={handleNext}
                  style={{ flex: 2, padding: 14, background: accentColor, color: bgColor, fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14 }}>
                  {currentStep < visibleFields.length - 1 ? (settings.nextText || "Próximo →") : (settings.submitText || "Enviar")}
                </button>
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgColor, color: textColor, fontFamily }}>
      {topBar}
      <div className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{form.title}</h1>
            {form.description && <p className="text-sm" style={{ color: `${textColor}80` }}>{form.description}</p>}
          </div>
          <div className="space-y-4">
            {visibleFields.map(field => (
              <div key={field.id}>
                <label className="text-sm font-medium block mb-1.5">{pipeLabel(field.label)} {field.required && <span style={{ color: accentColor }}>*</span>}</label>
                {renderField(field)}
              </div>
            ))}
          </div>
          <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm transition-transform hover:scale-105" style={{ background: accentColor, color: bgColor }}>
            {settings.submitText || "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormPublic;
