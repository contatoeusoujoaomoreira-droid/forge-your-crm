import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: string;
  text: string;
  type: "text" | "multiple_choice";
  options?: string[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
}

const QuizPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentStep, setCurrentStep] = useState<"lead" | number | "done">("lead");
  const [leadInfo, setLeadInfo] = useState({ name: "", email: "", phone: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }
      const { data } = await supabase.from("quizzes").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setQuiz({ ...data, questions: Array.isArray(data.questions) ? data.questions as Question[] : [] });
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);

    // Create lead
    let leadId: string | null = null;
    if (leadInfo.name || leadInfo.email) {
      const { data: leadData } = await supabase.from("leads").insert({
        name: leadInfo.name || "Quiz Lead",
        email: leadInfo.email || null,
        phone: leadInfo.phone || null,
        source: `quiz:${slug}`,
        status: "new",
        user_id: quiz.id, // will be handled by RLS
      } as any).select("id").maybeSingle();
      if (leadData) leadId = leadData.id;
    }

    await supabase.from("quiz_responses").insert({
      quiz_id: quiz.id,
      lead_id: leadId,
      responses: answers,
    });

    setCurrentStep("done");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020408", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #0EA5E9", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div style={{ minHeight: "100vh", background: "#020408", display: "flex", alignItems: "center", justifyContent: "center", color: "#E8F1FF", fontFamily: "'Plus Jakarta Sans',Inter,sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 800, marginBottom: 16 }}>404</h1>
          <p style={{ color: "#4A6080", marginBottom: 24 }}>Quiz não encontrado</p>
          <a href="/" style={{ color: "#0EA5E9", textDecoration: "none" }}>Voltar ao início</a>
        </div>
      </div>
    );
  }

  const questions = quiz.questions;
  const totalSteps = questions.length;
  const progress = currentStep === "lead" ? 0 : currentStep === "done" ? 100 : (((currentStep as number) + 1) / totalSteps) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#020408", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Plus Jakarta Sans',Inter,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
        {/* Progress */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ height: 3, background: "#141E2E", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(135deg,#0EA5E9,#6366F1)", transition: "width 0.4s ease", borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#4A6080" }}>{quiz.title}</span>
            <span style={{ fontSize: 11, color: "#4A6080" }}>
              {currentStep === "lead" ? "Seus dados" : currentStep === "done" ? "Concluído" : `${(currentStep as number) + 1}/${totalSteps}`}
            </span>
          </div>
        </div>

        {/* Lead capture */}
        {currentStep === "lead" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#E8F1FF", marginBottom: 8, letterSpacing: "-0.04em" }}>{quiz.title}</h1>
            {quiz.description && <p style={{ color: "#7A98B8", marginBottom: 32, lineHeight: 1.6 }}>{quiz.description}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                placeholder="Seu nome"
                value={leadInfo.name}
                onChange={e => setLeadInfo({ ...leadInfo, name: e.target.value })}
                style={{ padding: "14px 18px", background: "#080D14", border: "1px solid #141E2E", borderRadius: 10, color: "#E8F1FF", fontSize: 14, outline: "none" }}
              />
              <input
                type="email"
                placeholder="Seu email"
                value={leadInfo.email}
                onChange={e => setLeadInfo({ ...leadInfo, email: e.target.value })}
                style={{ padding: "14px 18px", background: "#080D14", border: "1px solid #141E2E", borderRadius: 10, color: "#E8F1FF", fontSize: 14, outline: "none" }}
              />
              <input
                type="tel"
                placeholder="WhatsApp (opcional)"
                value={leadInfo.phone}
                onChange={e => setLeadInfo({ ...leadInfo, phone: e.target.value })}
                style={{ padding: "14px 18px", background: "#080D14", border: "1px solid #141E2E", borderRadius: 10, color: "#E8F1FF", fontSize: 14, outline: "none" }}
              />
              <button
                onClick={() => setCurrentStep(0)}
                disabled={!leadInfo.name || !leadInfo.email}
                style={{ padding: 16, background: (!leadInfo.name || !leadInfo.email) ? "#141E2E" : "linear-gradient(135deg,#0EA5E9,#6366F1)", color: (!leadInfo.name || !leadInfo.email) ? "#4A6080" : "white", fontWeight: 700, border: "none", borderRadius: 10, cursor: (!leadInfo.name || !leadInfo.email) ? "not-allowed" : "pointer", fontSize: 16, marginTop: 8 }}
              >
                Começar →
              </button>
            </div>
          </div>
        )}

        {/* Questions */}
        {typeof currentStep === "number" && questions[currentStep] && (
          <div key={currentStep} style={{ animation: "fadeUp 0.4s ease" }}>
            <p style={{ fontSize: 11, color: "#0EA5E9", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              PERGUNTA {currentStep + 1} DE {totalSteps}
            </p>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#E8F1FF", marginBottom: 28, letterSpacing: "-0.02em" }}>
              {questions[currentStep].text}
            </h2>

            {questions[currentStep].type === "multiple_choice" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(questions[currentStep].options || []).map((opt, i) => {
                  const selected = answers[questions[currentStep].text] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswers({ ...answers, [questions[currentStep].text]: opt })}
                      style={{
                        padding: "16px 20px",
                        background: selected ? "rgba(14,165,233,0.08)" : "#080D14",
                        border: `1px solid ${selected ? "rgba(14,165,233,0.4)" : "#141E2E"}`,
                        borderRadius: 12,
                        color: selected ? "#0EA5E9" : "#E8F1FF",
                        fontWeight: selected ? 600 : 400,
                        fontSize: 14,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                placeholder="Sua resposta..."
                value={answers[questions[currentStep].text] || ""}
                onChange={e => setAnswers({ ...answers, [questions[currentStep].text]: e.target.value })}
                rows={4}
                style={{ width: "100%", padding: "14px 18px", background: "#080D14", border: "1px solid #141E2E", borderRadius: 10, color: "#E8F1FF", fontSize: 14, outline: "none", resize: "vertical" }}
              />
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  style={{ flex: 1, padding: 14, background: "#080D14", border: "1px solid #141E2E", borderRadius: 10, color: "#7A98B8", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                >
                  ← Voltar
                </button>
              )}
              <button
                onClick={() => {
                  if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
                  else handleSubmit();
                }}
                disabled={!answers[questions[currentStep].text] || submitting}
                style={{
                  flex: 2,
                  padding: 14,
                  background: !answers[questions[currentStep].text] ? "#141E2E" : "linear-gradient(135deg,#0EA5E9,#6366F1)",
                  color: !answers[questions[currentStep].text] ? "#4A6080" : "white",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 10,
                  cursor: !answers[questions[currentStep].text] ? "not-allowed" : "pointer",
                  fontSize: 14,
                }}
              >
                {submitting ? "Enviando..." : currentStep < totalSteps - 1 ? "Próxima →" : "Finalizar ✓"}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {currentStep === "done" && (
          <div style={{ textAlign: "center", animation: "fadeUp 0.4s ease" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#0EA5E9,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>✓</div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#E8F1FF", marginBottom: 12 }}>Obrigado!</h2>
            <p style={{ color: "#7A98B8", marginBottom: 32 }}>Suas respostas foram enviadas com sucesso.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
};

export default QuizPublic;
