import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Copy, Check, MessageCircle } from "lucide-react";

interface Question { id: string; text: string; type: "text" | "multiple_choice"; options?: string[]; scores?: number[]; imageUrls?: string[]; }
interface QuizResult { id: string; title: string; description: string; minScore: number; maxScore: number; stageId?: string; whatsappMessage?: string; }

const QuizPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<"lead" | number | "done">("lead");
  const [leadInfo, setLeadInfo] = useState({ name: "", email: "", phone: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [matchedResult, setMatchedResult] = useState<QuizResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const f = async () => {
      if (!slug) { setLoading(false); return; }
      const { data } = await supabase.from("quizzes").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (data) setQuiz({ ...data, questions: Array.isArray(data.questions) ? data.questions : [], style: data.style || {}, settings: data.settings || {} });
      setLoading(false);
    };
    f();
  }, [slug]);

  const buildWhatsAppUrl = (phone: string, message: string) => {
    let msg = message || `Olá! Fiz o quiz "${quiz.title}".`;
    msg = msg.replace(/\{nome\}/g, leadInfo.name);
    msg = msg.replace(/\{email\}/g, leadInfo.email);
    msg = msg.replace(/\{score\}/g, String(totalScore));
    msg = msg.replace(/\{resultado\}/g, matchedResult?.title || "");
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    const questions: Question[] = quiz.questions;
    let score = 0;
    questions.forEach(q => {
      if (q.type === "multiple_choice" && q.scores && q.options) {
        const answerIdx = q.options.indexOf(answers[q.text] || "");
        if (answerIdx >= 0 && q.scores[answerIdx] !== undefined) score += q.scores[answerIdx];
      }
    });
    setTotalScore(score);
    const results: QuizResult[] = quiz.settings?.results || [];
    const matched = results.find(r => score >= r.minScore && score <= r.maxScore);
    setMatchedResult(matched || null);

    await supabase.from("quiz_responses").insert({ quiz_id: quiz.id, responses: { ...answers, _score: score, _name: leadInfo.name, _email: leadInfo.email } });

    // Notification for quiz owner
    await supabase.from("notifications").insert({
      user_id: quiz.user_id,
      type: "quiz_response",
      title: `Nova resposta: ${quiz.title}`,
      message: `${leadInfo.name} completou o quiz (Score: ${score})`,
      metadata: { quiz_id: quiz.id, score, name: leadInfo.name },
    } as any);

    // Create lead with CRM integration
    const stageId = matched?.stageId || quiz.stage_id || quiz.settings?.stageId;
    const settings = quiz.settings || {};
    if (stageId && leadInfo.name) {
      const qualificationLabel = matched ? matched.title : `Score: ${score}`;
      const priority = score >= (results.length > 0 ? results[results.length - 1]?.minScore || 0 : 999) ? "hot" : score >= (results.length > 1 ? results[Math.floor(results.length / 2)]?.minScore || 0 : 999) ? "warm" : "cold";
      
      await supabase.from("leads").insert({
        name: leadInfo.name, email: leadInfo.email || null, phone: leadInfo.phone || null,
        source: settings.leadSource ? `${settings.leadSource}:${slug}` : `quiz:${slug}`,
        status: "new", stage_id: stageId,
        user_id: quiz.user_id, value: 0,
        pipeline_id: quiz.pipeline_id || settings.pipelineId || null,
        notes: `Resultado: ${qualificationLabel} (Score: ${score})`,
        tags: [...(settings.autoTags || []), priority === "hot" ? "quente" : priority === "warm" ? "morno" : "frio"],
        priority: priority === "hot" ? "high" : priority === "warm" ? "medium" : "low",
      } as any);
    }

    setCurrentStep("done");
    setSubmitting(false);
  };

  const handleShare = () => {
    const text = matchedResult
      ? `Fiz o quiz "${quiz.title}" e meu resultado foi: ${matchedResult.title}! ${matchedResult.description}`
      : `Fiz o quiz "${quiz.title}"! Minha pontuação: ${totalScore} pontos.`;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: quiz.title, text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppRedirect = () => {
    if (!quiz?.whatsapp_redirect) return;
    const customMsg = matchedResult?.whatsappMessage || quiz.whatsapp_message || "";
    const url = buildWhatsAppUrl(quiz.whatsapp_redirect, customMsg);
    window.open(url, "_blank");
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "2px solid #84CC16", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!quiz) return <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><div style={{ textAlign: "center" }}><h1 style={{ fontSize: "3rem", fontWeight: 800 }}>404</h1><p style={{ color: "#666", marginBottom: 24 }}>Quiz não encontrado</p><a href="/" style={{ color: "#84CC16" }}>Voltar</a></div></div>;

  const questions: Question[] = quiz.questions;
  const style = quiz.style || {};
  const bgColor = style.bgColor || "#000";
  const textColor = style.textColor || "#fff";
  const accentColor = style.accentColor || "#84CC16";
  const totalSteps = questions.length;
  const progress = currentStep === "lead" ? 0 : currentStep === "done" ? 100 : (((currentStep as number) + 1) / totalSteps) * 100;

  const containerStyle: React.CSSProperties = { minHeight: "100vh", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',system-ui,sans-serif", color: textColor };
  const inputStyle: React.CSSProperties = { padding: "14px 18px", background: `${textColor}08`, border: `1px solid ${textColor}15`, borderRadius: 12, color: textColor, fontSize: 14, outline: "none", width: "100%" };

  return (
    <div style={containerStyle}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ height: 4, background: `${textColor}10`, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: accentColor, transition: "width .4s ease", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: `${textColor}60` }}>{quiz.title}</span>
            <span style={{ fontSize: 11, color: `${textColor}60` }}>{currentStep === "lead" ? "Seus dados" : currentStep === "done" ? "Resultado" : `${(currentStep as number) + 1}/${totalSteps}`}</span>
          </div>
        </div>

        {currentStep === "lead" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.04em" }}>{quiz.title}</h1>
            {quiz.description && <p style={{ color: `${textColor}80`, marginBottom: 32, lineHeight: 1.6 }}>{quiz.description}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="text" placeholder="Seu nome" value={leadInfo.name} onChange={e => setLeadInfo({ ...leadInfo, name: e.target.value })} style={inputStyle} />
              <input type="email" placeholder="Seu e-mail" value={leadInfo.email} onChange={e => setLeadInfo({ ...leadInfo, email: e.target.value })} style={inputStyle} />
              <input type="tel" placeholder="WhatsApp (opcional)" value={leadInfo.phone} onChange={e => setLeadInfo({ ...leadInfo, phone: e.target.value })} style={inputStyle} />
              <button onClick={() => setCurrentStep(0)} disabled={!leadInfo.name || !leadInfo.email}
                style={{ padding: 16, background: (!leadInfo.name || !leadInfo.email) ? `${textColor}10` : accentColor, color: (!leadInfo.name || !leadInfo.email) ? `${textColor}40` : bgColor, fontWeight: 700, border: "none", borderRadius: 12, cursor: (!leadInfo.name || !leadInfo.email) ? "not-allowed" : "pointer", fontSize: 16, marginTop: 8 }}>
                Começar →
              </button>
            </div>
          </div>
        )}

        {typeof currentStep === "number" && questions[currentStep] && (
          <div key={currentStep} style={{ animation: "fadeUp .4s ease" }}>
            <p style={{ fontSize: 11, color: accentColor, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>PERGUNTA {currentStep + 1} DE {totalSteps}</p>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.02em" }}>{questions[currentStep].text}</h2>
            {questions[currentStep].type === "multiple_choice" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(questions[currentStep].options || []).map((opt, i) => {
                  const selected = answers[questions[currentStep].text] === opt;
                  const imgUrl = questions[currentStep].imageUrls?.[i];
                  return (
                    <button key={i} onClick={() => setAnswers({ ...answers, [questions[currentStep].text]: opt })}
                      style={{ padding: imgUrl ? "12px 16px" : "16px 20px", background: selected ? `${accentColor}12` : `${textColor}05`, border: `1px solid ${selected ? `${accentColor}50` : `${textColor}12`}`, borderRadius: 12, color: selected ? accentColor : textColor, fontWeight: selected ? 600 : 400, fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", gap: 12 }}>
                      {imgUrl && <img src={imgUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea placeholder="Sua resposta..." value={answers[questions[currentStep].text] || ""} onChange={e => setAnswers({ ...answers, [questions[currentStep].text]: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              {currentStep > 0 && <button onClick={() => setCurrentStep(currentStep - 1)} style={{ flex: 1, padding: 14, background: `${textColor}05`, border: `1px solid ${textColor}12`, borderRadius: 12, color: `${textColor}80`, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>← Voltar</button>}
              <button onClick={() => { if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1); else handleSubmit(); }} disabled={!answers[questions[currentStep].text] || submitting}
                style={{ flex: 2, padding: 14, background: !answers[questions[currentStep].text] ? `${textColor}10` : accentColor, color: !answers[questions[currentStep].text] ? `${textColor}40` : bgColor, fontWeight: 700, border: "none", borderRadius: 12, cursor: !answers[questions[currentStep].text] ? "not-allowed" : "pointer", fontSize: 14 }}>
                {submitting ? "Enviando..." : currentStep < totalSteps - 1 ? "Próxima →" : "Finalizar ✓"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "done" && (
          <div style={{ textAlign: "center", animation: "fadeUp .4s ease" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32, color: bgColor }}>✓</div>
            {matchedResult ? (
              <>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>{matchedResult.title}</h2>
                <p style={{ color: `${textColor}80`, marginBottom: 16 }}>{matchedResult.description}</p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>Obrigado!</h2>
                <p style={{ color: `${textColor}80`, marginBottom: 16 }}>Suas respostas foram enviadas.</p>
              </>
            )}
            {quiz.settings?.showScore && <p style={{ fontSize: 14, color: accentColor, fontWeight: 700, marginBottom: 20 }}>Sua pontuação: {totalScore} pontos</p>}
            
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {/* WhatsApp redirect button */}
              {quiz.whatsapp_redirect && (
                <button onClick={handleWhatsAppRedirect} style={{ padding: "14px 28px", background: "#25D366", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <MessageCircle style={{ width: 18, height: 18 }} /> Falar no WhatsApp
                </button>
              )}

              {/* Share button */}
              <button onClick={handleShare} style={{ padding: "12px 24px", background: `${textColor}08`, border: `1px solid ${textColor}15`, borderRadius: 12, color: textColor, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {copied ? <><Check style={{ width: 16, height: 16 }} /> Copiado!</> : <><Share2 style={{ width: 16, height: 16 }} /> Compartilhar</>}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

export default QuizPublic;
