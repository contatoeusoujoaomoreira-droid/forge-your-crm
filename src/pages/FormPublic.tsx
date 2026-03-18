import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface FormField { id: string; type: string; label: string; placeholder?: string; required?: boolean; options?: string[]; min?: number; max?: number; }

const FormPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from("forms").select("*").eq("slug", slug).eq("is_active", true).eq("is_published", true).maybeSingle();
      if (data) { setForm(data); setFields(Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : []); }
      setLoading(false);
    };
    f();
  }, [slug]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form) return;
    const responses: Record<string, string> = {};
    fields.forEach(f => { responses[f.label] = answers[f.id] || ""; });
    await supabase.from("form_responses").insert({ form_id: form.id, responses });

    // Create lead if CRM integration configured
    if (form.stage_id) {
      const nameField = fields.find(f => f.type === "text" && f.label.toLowerCase().includes("nome"));
      const emailField = fields.find(f => f.type === "email");
      const phoneField = fields.find(f => f.type === "phone");
      if (nameField || emailField) {
        await supabase.from("leads").insert({
          name: answers[nameField?.id || ""] || "Form Lead",
          email: emailField ? answers[emailField.id] || null : null,
          phone: phoneField ? answers[phoneField.id] || null : null,
          source: `form:${slug}`,
          status: "new",
          stage_id: form.stage_id,
          user_id: form.user_id,
        } as any);
      }
    }

    const settings = form.settings || {};
    if (settings.redirectUrl) { window.location.href = settings.redirectUrl; return; }
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><div className="h-8 w-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><p>Formulário não encontrado</p></div>;

  const style = form.style || {};
  const settings = form.settings || {};
  const isMultiStep = settings.multiStep && fields.length > 1;
  const bgColor = style.bgColor || "#000";
  const textColor = style.textColor || "#fff";
  const accentColor = style.accentColor || "#84CC16";
  const fontFamily = style.fontFamily || "Inter";

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor, color: textColor, fontFamily }}>
        <div className="text-center space-y-4 p-8" style={{ animation: "fadeUp .4s ease" }}>
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold">{settings.successMessage || "Obrigado!"}</h2>
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  const currentField = isMultiStep ? fields[currentStep] : null;
  const progress = isMultiStep ? ((currentStep + 1) / fields.length) * 100 : 0;

  const inputBaseStyle: React.CSSProperties = { width: "100%", borderRadius: 12, padding: "14px 18px", fontSize: 14, border: `1px solid ${textColor}15`, background: `${textColor}05`, color: textColor, outline: "none" };

  const renderField = (field: FormField) => {
    if (field.type === "textarea") return <textarea value={answers[field.id] || ""} onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })} placeholder={field.placeholder} required={field.required} style={{ ...inputBaseStyle, resize: "vertical" }} rows={4} />;
    if (field.type === "select") return (
      <select value={answers[field.id] || ""} onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })} required={field.required} style={inputBaseStyle}>
        <option value="">{field.placeholder || "Selecione..."}</option>
        {(field.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    );
    if (field.type === "radio") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(field.options || []).map((opt, i) => {
          const selected = answers[field.id] === opt;
          return (
            <button key={i} type="button" onClick={() => setAnswers({ ...answers, [field.id]: opt })}
              style={{ padding: "14px 18px", background: selected ? `${accentColor}12` : `${textColor}05`, border: `1px solid ${selected ? `${accentColor}50` : `${textColor}12`}`, borderRadius: 12, color: selected ? accentColor : textColor, fontWeight: selected ? 600 : 400, fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all .2s" }}>
              {opt}
            </button>
          );
        })}
      </div>
    );
    if (field.type === "nps" || field.type === "scale") {
      const min = field.min ?? 0;
      const max = field.max ?? 10;
      const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {values.map(v => {
            const selected = answers[field.id] === String(v);
            return (
              <button key={v} type="button" onClick={() => setAnswers({ ...answers, [field.id]: String(v) })}
                style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${selected ? accentColor : `${textColor}15`}`, background: selected ? accentColor : `${textColor}05`, color: selected ? bgColor : textColor, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all .2s" }}>
                {v}
              </button>
            );
          })}
        </div>
      );
    }
    return <input type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={answers[field.id] || ""} onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })} placeholder={field.placeholder} required={field.required} style={inputBaseStyle} />;
  };

  // Multi-step mode
  if (isMultiStep && currentField) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: bgColor, color: textColor, fontFamily }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ height: 4, background: `${textColor}10`, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: accentColor, transition: "width .4s ease", borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: `${textColor}60` }}>{form.title}</span>
              <span style={{ fontSize: 11, color: `${textColor}60` }}>{currentStep + 1}/{fields.length}</span>
            </div>
          </div>
          <div key={currentStep} style={{ animation: "fadeUp .4s ease" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 24 }}>{currentField.label} {currentField.required && <span style={{ color: accentColor }}>*</span>}</h2>
            {renderField(currentField)}
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              {currentStep > 0 && <button type="button" onClick={() => setCurrentStep(currentStep - 1)} style={{ flex: 1, padding: 14, background: `${textColor}05`, border: `1px solid ${textColor}12`, borderRadius: 12, color: `${textColor}80`, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>← Voltar</button>}
              <button type="button"
                onClick={() => { if (currentStep < fields.length - 1) setCurrentStep(currentStep + 1); else handleSubmit(); }}
                disabled={currentField.required && !answers[currentField.id]}
                style={{ flex: 2, padding: 14, background: (currentField.required && !answers[currentField.id]) ? `${textColor}10` : accentColor, color: (currentField.required && !answers[currentField.id]) ? `${textColor}40` : bgColor, fontWeight: 700, border: "none", borderRadius: 12, cursor: (currentField.required && !answers[currentField.id]) ? "not-allowed" : "pointer", fontSize: 14 }}>
                {currentStep < fields.length - 1 ? "Próximo →" : (settings.submitText || "Enviar")}
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  // Standard mode
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: bgColor, color: textColor, fontFamily }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{form.title}</h1>
          {form.description && <p className="text-sm" style={{ color: `${textColor}80` }}>{form.description}</p>}
        </div>
        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.id}>
              <label className="text-sm font-medium block mb-1.5">{field.label} {field.required && <span style={{ color: accentColor }}>*</span>}</label>
              {renderField(field)}
            </div>
          ))}
        </div>
        <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm transition-transform hover:scale-105" style={{ background: accentColor, color: bgColor }}>
          {settings.submitText || "Enviar"}
        </button>
      </form>
    </div>
  );
};

export default FormPublic;
