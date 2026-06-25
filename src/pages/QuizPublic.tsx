import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Copy, Check, MessageCircle } from "lucide-react";
import { captureTracking, type TrackingPayload } from "@/lib/tracking";
import { logFunnelEvent } from "@/lib/funnel";
import { injectMetaPixel, trackPixelEvent, sendConversionsApi, newEventId } from "@/lib/metaPixel";

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
  const trackingRef = useRef<TrackingPayload | null>(null);
  const startedRef = useRef(false);
  const lastStepRef = useRef<string | number>("");

  useEffect(() => {
    const f = async () => {
      if (!slug) { setLoading(false); return; }
      const { data } = await supabase.from("quizzes").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (data) {
        setQuiz({ ...data, questions: Array.isArray(data.questions) ? data.questions : [], style: data.style || {}, settings: data.settings || {} });
        const tracking = captureTracking();
        trackingRef.current = tracking;
        logFunnelEvent({ user_id: data.user_id, source_type: "quiz", source_id: data.id, event_type: "view", tracking });
        const localPixel = (data as any).pixel_config?.meta;
        if (localPixel?.pixel_id && localPixel?.events?.PageView !== false) {
          injectMetaPixel(localPixel.pixel_id);
        } else {
          const { data: meta } = await supabase.from("meta_ads_configs").select("pixel_id, pixel_enabled").eq("user_id", data.user_id).maybeSingle();
          if (meta?.pixel_enabled && meta.pixel_id) injectMetaPixel(meta.pixel_id);
        }
      }
      setLoading(false);
    };
    f();
  }, [slug]);


  // Funnel start + step tracking
  useEffect(() => {
    if (!quiz || !trackingRef.current) return;
    if (currentStep === "lead") return;
    if (currentStep === "done") return;
    if (!startedRef.current) {
      startedRef.current = true;
      logFunnelEvent({ user_id: quiz.user_id, source_type: "quiz", source_id: quiz.id, event_type: "start", tracking: trackingRef.current });
    }
    if (currentStep !== lastStepRef.current) {
      lastStepRef.current = currentStep;
      logFunnelEvent({ user_id: quiz.user_id, source_type: "quiz", source_id: quiz.id, event_type: "step", step_index: Number(currentStep), step_label: quiz.questions?.[Number(currentStep)]?.text || null as any, tracking: trackingRef.current });
    }
  }, [quiz, currentStep]);

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

    await supabase.from("notifications").insert({
      user_id: quiz.user_id, type: "quiz_response",
      title: `Nova resposta: ${quiz.title}`,
      message: `${leadInfo.name} completou o quiz (Score: ${score})`,
      metadata: { quiz_id: quiz.id, score, name: leadInfo.name },
    } as any);

    const tracking = trackingRef.current || captureTracking();
    const settings = quiz.settings || {};
    const phoneClean = (leadInfo.phone || "").replace(/\D/g, "") || null;
    const emailClean = (leadInfo.email || "").toLowerCase().trim() || null;
    let createdLeadId: string | null = null;
    let stageId = matched?.stageId || quiz.stage_id || settings.stageId;
    let pipelineId = quiz.pipeline_id || settings.pipelineId || null;
    // Fallback: pick first stage of selected pipeline
    if (pipelineId && !stageId) {
      const { data: stagesData } = await supabase.from("pipeline_stages").select("id").eq("pipeline_id", pipelineId).order("position", { ascending: true }).limit(1);
      if (stagesData?.length) stageId = stagesData[0].id;
    }
    // Fallback: user's first pipeline + first stage
    if (!pipelineId && !stageId) {
      const { data: pipes } = await supabase.from("pipelines").select("id").eq("user_id", quiz.user_id).order("created_at", { ascending: true }).limit(1);
      if (pipes?.length) {
        pipelineId = pipes[0].id;
        const { data: stagesData } = await supabase.from("pipeline_stages").select("id").eq("pipeline_id", pipelineId).order("position", { ascending: true }).limit(1);
        if (stagesData?.length) stageId = stagesData[0].id;
      }
    }

    if (leadInfo.name) {
      const qualificationLabel = matched ? matched.title : `Score: ${score}`;
      const priority = score >= (results.length > 0 ? results[results.length - 1]?.minScore || 0 : 999) ? "hot" : score >= (results.length > 1 ? results[Math.floor(results.length / 2)]?.minScore || 0 : 999) ? "warm" : "cold";

      // Anti-duplicate by phone/email scoped to user
      let existing: { id: string } | null = null;
      if (phoneClean) {
        const { data } = await supabase.from("leads").select("id").eq("user_id", quiz.user_id).eq("phone", phoneClean).limit(1).maybeSingle();
        if (data) existing = data;
      }
      if (!existing && emailClean) {
        const { data } = await supabase.from("leads").select("id").eq("user_id", quiz.user_id).eq("email", emailClean).limit(1).maybeSingle();
        if (data) existing = data;
      }
      if (existing) {
        createdLeadId = existing.id;
        await supabase.from("leads").update({ updated_at: new Date().toISOString(), notes: `Resultado: ${qualificationLabel} (Score: ${score})`, source_quiz_id: quiz.id } as any).eq("id", existing.id);
      } else {
        const { data: inserted } = await supabase.from("leads").insert({
          name: leadInfo.name, email: emailClean, phone: phoneClean,
          source: settings.leadSource ? `${settings.leadSource}:${slug}` : `quiz:${slug}`,
          status: "new", stage_id: stageId, user_id: quiz.user_id, value: 0,
          pipeline_id: pipelineId,
          notes: `Resultado: ${qualificationLabel} (Score: ${score})`,
          source_quiz_id: quiz.id,
          tags: [...(settings.autoTags || []), priority === "hot" ? "quente" : priority === "warm" ? "morno" : "frio"],
          priority: priority === "hot" ? "high" : priority === "warm" ? "medium" : "low",
          utm_source: tracking.source, utm_medium: tracking.medium, utm_campaign: tracking.campaign,
          utm_content: tracking.content, utm_term: tracking.term,
          ttclid: tracking.ttclid, fbc: tracking.fbc, fbp: tracking.fbp,
          landing_url: tracking.landing_url, referrer: tracking.referrer, user_agent: tracking.user_agent,
        } as any).select("id").maybeSingle();
        createdLeadId = inserted?.id || null;
      }
    }

    // ===== Submission timeline (isolated per quiz) =====
    await (supabase as any).from("quiz_submissions").insert({
      user_id: quiz.user_id, quiz_id: quiz.id, lead_id: createdLeadId,
      payload: { ...answers, _name: leadInfo.name, _email: leadInfo.email, _phone: leadInfo.phone },
      score, result_label: matched?.title || null,
      utm_source: tracking.source, utm_medium: tracking.medium, utm_campaign: tracking.campaign,
      utm_content: tracking.content, utm_term: tracking.term,
      referrer: tracking.referrer, landing_url: tracking.landing_url, user_agent: tracking.user_agent,
      device_type: /Mobi|Android|iPhone/i.test(tracking.user_agent || "") ? "mobile" : "desktop",
    });


    // Attribution touchpoint
    await supabase.from("attribution_touchpoints").insert({
      user_id: quiz.user_id, lead_id: createdLeadId,
      source: tracking.source, medium: tracking.medium, campaign: tracking.campaign,
      content: tracking.content, term: tracking.term,
      fbclid: tracking.fbclid, gclid: tracking.gclid, ctwa_clid: tracking.ctwa_clid,
      ttclid: tracking.ttclid, fbc: tracking.fbc, fbp: tracking.fbp, user_agent: tracking.user_agent,
      landing_url: tracking.landing_url, referrer: tracking.referrer,
      channel: "quiz", meta: { quiz_id: quiz.id, slug, score, result: matched?.title || null, session_id: tracking.session_id },
    } as any);

    // Funnel complete
    logFunnelEvent({ user_id: quiz.user_id, source_type: "quiz", source_id: quiz.id, event_type: "complete", tracking, meta: { lead_id: createdLeadId, score, result: matched?.title } });

    // Meta Pixel + CAPI
    if (quiz.meta_event_name) {
      const eventId = newEventId();
      const value = Number(quiz.meta_event_value || 0);
      const currency = quiz.meta_event_currency || "BRL";
      trackPixelEvent(quiz.meta_event_name, { value, currency, content_name: quiz.title }, eventId);
      sendConversionsApi({
        user_id: quiz.user_id, source_type: "quiz", source_id: quiz.id,
        event_name: quiz.meta_event_name, event_id: eventId, lead_id: createdLeadId,
        value, currency,
        user_data: { email: emailClean, phone: phoneClean, name: leadInfo.name, fbc: tracking.fbc, fbp: tracking.fbp, client_user_agent: tracking.user_agent },
        custom_data: { quiz_id: quiz.id, score, result: matched?.title || null },
        event_source_url: window.location.href,
      });
    }

    // WhatsApp Auto (delayed)
    if (quiz.whatsapp_auto_send && phoneClean && quiz.whatsapp_auto_message) {
      const msg = (quiz.whatsapp_auto_message as string)
        .replace(/\{\{nome\}\}|\{nome\}/g, leadInfo.name)
        .replace(/\{\{telefone\}\}|\{telefone\}/g, phoneClean)
        .replace(/\{\{email\}\}|\{email\}/g, emailClean || "")
        .replace(/\{\{score\}\}|\{score\}/g, String(score))
        .replace(/\{\{resultado_quiz\}\}|\{resultado_quiz\}|\{resultado\}/g, matched?.title || "")
        .replace(/\{\{origem\}\}|\{origem\}/g, tracking.source || "");
      const delay = Math.max(0, Number(quiz.whatsapp_auto_delay_seconds || 0));
      const runAt = new Date(Date.now() + delay * 1000).toISOString();
      await supabase.rpc("enqueue_job", {
        _kind: "form_whatsapp_auto",
        _payload: { user_id: quiz.user_id, phone: phoneClean, message: msg, source_type: "quiz", source_id: quiz.id, lead_id: createdLeadId },
        _tenant: quiz.user_id, _run_at: runAt, _priority: 3, _max_attempts: 3,
      } as any);
    }

    // ===== Owner Alert WhatsApp =====
    const ownerAlert = (quiz as any).owner_alert || {};
    if (ownerAlert.enabled && ownerAlert.phone && ownerAlert.message) {
      const msg = String(ownerAlert.message)
        .replace(/\{\{nome\}\}/g, leadInfo.name)
        .replace(/\{\{email\}\}/g, emailClean || "")
        .replace(/\{\{telefone\}\}/g, phoneClean || "")
        .replace(/\{\{nome_do_forms\}\}/g, quiz.title)
        .replace(/\{\{score\}\}/g, String(score))
        .replace(/\{\{resultado_quiz\}\}|\{\{resultado\}\}/g, matched?.title || "")
        .replace(/\{\{data\}\}/g, new Date().toLocaleString("pt-BR"))
        .replace(/\{\{utm_source\}\}/g, tracking.source || "direct");
      await supabase.rpc("enqueue_job", {
        _kind: "form_owner_alert",
        _payload: { user_id: quiz.user_id, phone: ownerAlert.phone, message: msg, source_type: "quiz", source_id: quiz.id, lead_id: createdLeadId },
        _tenant: quiz.user_id, _priority: 2, _max_attempts: 3,
      } as any);
    }

    // ===== Post-submit redirect =====
    const ps = (quiz as any).post_submit || {};
    if (ps.mode === "url" && ps.url) {
      if (ps.new_tab) window.open(ps.url, "_blank"); else window.location.href = ps.url;
      setCurrentStep("done"); setSubmitting(false); return;
    }
    if (ps.mode === "form" && ps.target_form_id) {
      const { data: tgt } = await supabase.from("forms").select("slug").eq("id", ps.target_form_id).maybeSingle();
      if (tgt?.slug) {
        const url = `/form/${tgt.slug}`;
        if (ps.new_tab) window.open(url, "_blank"); else window.location.href = url;
        setCurrentStep("done"); setSubmitting(false); return;
      }
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
