import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

const FormPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      const { data } = await supabase.from("forms").select("*").eq("slug", slug).eq("is_active", true).eq("is_published", true).maybeSingle();
      if (data) {
        setForm(data);
        setFields(Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : []);
      }
      setLoading(false);
    };
    fetchForm();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const responses: Record<string, string> = {};
    fields.forEach(f => { responses[f.label] = answers[f.id] || ""; });
    await supabase.from("form_responses").insert({ form_id: form.id, responses });
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><div className="h-8 w-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><p>Formulário não encontrado</p></div>;

  const style = form.style || {};
  const settings = form.settings || {};

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff" }}>
        <div className="text-center space-y-4 p-8">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold">{settings.successMessage || "Obrigado!"}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff", fontFamily: style.fontFamily || "Inter" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{form.title}</h1>
          {form.description && <p className="text-sm opacity-70">{form.description}</p>}
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="text-sm font-medium block mb-1.5">{field.label} {field.required && <span style={{ color: style.accentColor || "#84CC16" }}>*</span>}</label>
              {field.type === "textarea" ? (
                <textarea
                  value={answers[field.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 backdrop-blur focus:outline-none focus:ring-2"
                  style={{ focusRingColor: style.accentColor } as any}
                  rows={4}
                />
              ) : field.type === "select" ? (
                <select
                  value={answers[field.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                  required={field.required}
                  className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 backdrop-blur focus:outline-none"
                >
                  <option value="">{field.placeholder || "Selecione..."}</option>
                  {(field.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              ) : field.type === "radio" ? (
                <div className="space-y-2">
                  {(field.options || []).map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:border-white/20 transition-colors">
                      <input type="radio" name={field.id} value={opt} checked={answers[field.id] === opt} onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : "text"}
                  value={answers[field.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 backdrop-blur focus:outline-none focus:ring-2"
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105"
          style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}
        >
          {settings.submitText || "Enviar"}
        </button>
      </form>
    </div>
  );
};

export default FormPublic;
