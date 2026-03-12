import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getToken, setToken } from "./api.js";

const QUESTIONS = [
  {
    id: "goal",
    text:
      "Qual é o objetivo principal da resposta que você espera?\n\nParte do prompt: Tarefa/objetivo (instruction).\nExplicação: Explicita a ação principal para o modelo, reduz ambiguidade e melhora a aderência.",
    rationale: "Definir a tarefa e o resultado esperado.",
    promptPart: "Tarefa/objetivo (instruction).",
    detail:
      "Explicita a ação principal para o modelo, reduz ambiguidade e melhora a aderência.",
  },
  {
    id: "audience",
    text: "Quem é o público-alvo da resposta?",
    rationale: "Ajustar vocabulário e profundidade.",
    promptPart: "Público-alvo e nível de detalhe.",
    detail:
      "Ajuda a calibrar linguagem, tecnicidade e exemplos adequados ao leitor.",
  },
  {
    id: "context",
    text: "Qual contexto ou informações de fundo são importantes?",
    rationale: "Fornecer dados relevantes para a tarefa.",
    promptPart: "Contexto e dados relevantes.",
    detail:
      "Fornece informações de apoio para evitar suposições e melhorar precisão.",
  },
  {
    id: "constraints",
    text: "Existem restrições ou limites (tempo, tamanho, escopo, fontes)?",
    rationale: "Definir limites e evitar respostas fora do esperado.",
    promptPart: "Restrições e limites.",
    detail:
      "Impõe guardrails de escopo, tamanho e fontes, reduzindo respostas inúteis.",
  },
  {
    id: "format",
    text: "Qual formato de saída você prefere (lista, tabela, passos, parágrafo)?",
    rationale: "Especificar o formato ajuda na consistência.",
    promptPart: "Formato de saída.",
    detail:
      "Define a forma da resposta, útil para legibilidade e avaliação.",
  },
  {
    id: "examples",
    text: "Há exemplos ou referências do que você considera uma boa resposta?",
    rationale: "Exemplos guiam o estilo e a estrutura.",
    promptPart: "Exemplos (few-shot / referências).",
    detail:
      "Demonstrações ajudam o modelo a imitar estilo, estrutura e nível esperado.",
  },
  {
    id: "tone",
    text: "Qual tom/estilo deve ser usado (técnico, informal, persuasivo)?",
    rationale: "Alinhar estilo e linguagem com o objetivo.",
    promptPart: "Tom e estilo.",
    detail:
      "Define o registro linguístico e a postura comunicativa.",
  },
  {
    id: "criteria",
    text: "Quais critérios de sucesso definem uma boa resposta?",
    rationale: "Explicitar como avaliar a qualidade.",
    promptPart: "Critérios de sucesso / avaliação.",
    detail:
      "Facilita a avaliação e reforça o que é mais importante entregar.",
  },
  {
    id: "decomposition",
    text: "A tarefa deve ser dividida em etapas ou subtarefas? Se sim, como?",
    rationale: "Decomposição melhora qualidade e controle.",
    promptPart: "Estratégia de decomposição.",
    detail:
      "Quebrar o problema em partes ajuda a estruturar a resposta e reduzir erros.",
  },
  {
    id: "clarifications",
    text:
      "Se faltar informação, o modelo deve fazer perguntas de clarificação antes de responder?",
    rationale: "Evitar suposições e aumentar precisão.",
    promptPart: "Política de clarificação.",
    detail:
      "Permite que o modelo questione lacunas antes de concluir.",
  },
  {
    id: "verification",
    text:
      "Você quer que o modelo verifique a própria resposta (auto-crítica) antes de entregar?",
    rationale: "Autoavaliação melhora consistência.",
    promptPart: "Autoavaliação / verificação.",
    detail:
      "Incentiva revisão e correção antes da resposta final.",
  },
  {
    id: "alternatives",
    text:
      "Deseja que o modelo gere mais de uma alternativa e escolha a melhor?",
    rationale: "Self-consistency e ensembling.",
    promptPart: "Múltiplas respostas / seleção.",
    detail:
      "Gerar alternativas pode aumentar a chance de uma resposta superior.",
  },
  {
    id: "sources",
    text:
      "É necessário citar fontes ou usar materiais externos (RAG)? Se sim, quais?",
    rationale: "Rastreabilidade e precisão.",
    promptPart: "Fontes e evidências.",
    detail:
      "Indica quando e como usar referências externas.",
  },
  {
    id: "safety",
    text:
      "Há requisitos de segurança/ética (evitar vieses, não inventar dados, etc.)?",
    rationale: "Segurança e alinhamento.",
    promptPart: "Regras de segurança e alinhamento.",
    detail:
      "Define restrições de conteúdo e comportamento.",
  },
];

const FIELD_LABELS = [
  { key: "goal", label: "Objetivo" },
  { key: "audience", label: "Público-alvo" },
  { key: "context", label: "Contexto" },
  { key: "constraints", label: "Restrições" },
  { key: "format", label: "Formato de saída" },
  { key: "examples", label: "Exemplos/referências" },
  { key: "tone", label: "Tom/estilo" },
  { key: "criteria", label: "Critérios de sucesso" },
  { key: "decomposition", label: "Decomposição" },
  { key: "clarifications", label: "Política de clarificação" },
  { key: "verification", label: "Autoavaliação" },
  { key: "alternatives", label: "Alternativas" },
  { key: "sources", label: "Fontes" },
  { key: "safety", label: "Segurança/ética" },
];

const SURVEY_QUESTIONS = [
  {
    id: "familiarity",
    text:
      "Qual seu nível de familiaridade com IA generativa? (1 = nenhuma, 5 = muito experiente)",
  },
  {
    id: "clarity",
    text:
      "Comparando o prompt otimizado com o prompt inicial, a resposta foi mais clara.",
  },
  {
    id: "relevance",
    text:
      "Comparando o prompt otimizado com o prompt inicial, a resposta foi mais relevante.",
  },
  {
    id: "contextFit",
    text:
      "Comparando o prompt otimizado com o prompt inicial, a resposta ficou mais adequada ao contexto.",
  },
  {
    id: "satisfaction",
    text:
      "No geral, fiquei mais satisfeito com o resultado obtido usando o prompt otimizado.",
  },
];

const PROFILE_QUESTIONS = [
  {
    id: "genAiFamiliarity",
    text:
      "De 1 a 5, quanta familiaridade ou conhecimento você tem no uso de ferramentas de IA generativa?",
    note: "Escala 1–5: 1 = Nenhuma familiaridade, 5 = Muito familiar.",
  },
];

const buildOptimizedPrompt = (initialPrompt, answers) => {
  const lines = [];
  lines.push("Você é um assistente especializado em atender a solicitação abaixo.");
  lines.push("");
  lines.push(`Solicitação original: ${initialPrompt}`);
  lines.push("");
  lines.push("Detalhes adicionais:");
  QUESTIONS.forEach((question) => {
    const value = answers[question.id];
    if (value != null && String(value).trim()) {
      const label = FIELD_LABELS.find((f) => f.key === question.id)?.label ?? question.id;
      lines.push(`- ${label}: ${String(value).trim()}`);
    }
  });
  lines.push("");
  lines.push(
    "Instruções: responda seguindo o formato solicitado, respeite as restrições e maximize os critérios de sucesso."
  );
  return lines.join("\n");
};

const buildSummaryMessage = (initialPrompt, answers) => {
  const summaryLines = [
    "Perfeito! Segue um resumo das respostas e um prompt otimizado.",
    "",
    "Resumo:",
  ];
  QUESTIONS.forEach((question) => {
    const value = answers[question.id];
    const label = FIELD_LABELS.find((f) => f.key === question.id)?.label ?? question.id;
    summaryLines.push(
      `- ${label}: ${value != null && String(value).trim() ? String(value).trim() : "Não informado"}`
    );
  });
  summaryLines.push("");
  summaryLines.push("Prompt otimizado:");
  summaryLines.push(buildOptimizedPrompt(initialPrompt, answers));
  return summaryLines.join("\n");
};

const copyTextToClipboard = async (text) => {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const successful = document.execCommand("copy");
  textarea.remove();
  return successful;
};

const initialAssistantMessage =
  "Digite seu prompt inicial para começar a conversa.";

const LoginForm = ({ onLogin, onRegister, error }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setMsg("");
    try {
      if (mode === "login") {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(email.trim(), password);
        setMsg("Cadastro realizado. Aguarde autorização do administrador.");
        setMode("login");
      }
    } catch (err) {
      setMsg(err.message || "Erro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <h2>Prompt Optimizer</h2>
      <p>Entre ou cadastre-se para usar a aplicação.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {(error || msg) ? <p className="error">{error || msg}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "..." : mode === "login" ? "Entrar" : "Cadastrar"}
        </button>
      </form>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setMsg("");
        }}
      >
        {mode === "login" ? "Criar conta" : "Já tenho conta"}
      </button>
    </div>
  );
};

const App = () => {
  const [authEnabled, setAuthEnabled] = useState(null);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: initialAssistantMessage },
  ]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState("idle");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveyResponses, setSurveyResponses] = useState({});
  const [surveySaving, setSurveySaving] = useState(false);
  const [surveyError, setSurveyError] = useState("");
  const [view, setView] = useState("chat");
  const [surveyList, setSurveyList] = useState([]);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyListError, setSurveyListError] = useState("");
  const [userList, setUserList] = useState([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userListError, setUserListError] = useState("");
  const [aiResponseInitial, setAiResponseInitial] = useState("");
  const [aiResponseOptimized, setAiResponseOptimized] = useState("");
  const [sessionIdInitial, setSessionIdInitial] = useState(null);
  const [sessionIdOptimized, setSessionIdOptimized] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingInitial, setAiLoadingInitial] = useState(false);
  const [aiLoadingOptimized, setAiLoadingOptimized] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiConfigured, setAiConfigured] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        setAuthEnabled(data.enabled ?? false);
        if (data.enabled && getToken()) {
          const surveysRes = await apiFetch("/api/surveys");
          if (surveysRes.ok) {
            const payload = JSON.parse(atob(getToken().split(".")[1]));
            setUser({ id: payload.id, email: payload.email, role: payload.role });
          } else {
            setToken(null);
          }
        } else if (!data.enabled) {
          setUser({ id: "anon", email: "", role: "user" });
        }
      } catch {
        setAuthEnabled(true);
        setUser(null);
      }
    })();
  }, []);

  const handleLogin = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no login.");
    setToken(data.token);
    setUser(data.user);
    setAuthError("");
  };

  const handleRegister = async (email, password) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no cadastro.");
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const progressLabel = useMemo(() => {
    if (stage !== "questioning") return "Pronto para começar";
    return `Pergunta ${currentQuestionIndex + 1} de ${QUESTIONS.length}`;
  }, [stage, currentQuestionIndex]);

  const fetchAIStatus = async () => {
    try {
      const res = await fetch("/api/ai/status");
      const data = await res.json();
      setAiConfigured(data.configured ?? false);
    } catch {
      setAiConfigured(false);
    }
  };

  useEffect(() => {
    if (stage === "done") fetchAIStatus();
  }, [stage]);

  useEffect(() => {
    if (view === "users" && user?.role !== "admin") {
      setView("chat");
    }
  }, [view, user?.role]);

  if (authEnabled === null) {
    return <div className="app"><p>Carregando...</p></div>;
  }
  if (authEnabled && !user) {
    return (
      <div className="app">
        <div className="login-wrapper">
          <LoginForm
            onLogin={handleLogin}
            onRegister={handleRegister}
            error={authError}
          />
        </div>
      </div>
    );
  }

  const handleReset = () => {
    setMessages([{ role: "assistant", content: initialAssistantMessage }]);
    setInput("");
    setStage("idle");
    setInitialPrompt("");
    setAnswers({});
    setCurrentQuestionIndex(0);
    setCopied(false);
    setCopiedOriginal(false);
    setShowSurvey(false);
    setSurveySubmitted(false);
    setSurveyResponses({});
    setSurveySaving(false);
    setSurveyError("");
    setAiResponseInitial("");
    setAiResponseOptimized("");
    setSessionIdInitial(null);
    setSessionIdOptimized(null);
    setAiError("");
    setAiLoadingInitial(false);
    setAiLoadingOptimized(false);
  };

  const handleConsultAI = async () => {
    if (!optimizedPrompt || !originalPrompt || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const [resInitial, resOptimized] = await Promise.all([
        apiFetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: originalPrompt }),
        }),
        apiFetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: optimizedPrompt }),
        }),
      ]);
      const dataInitial = await resInitial.json();
      const dataOptimized = await resOptimized.json();
      if (!resInitial.ok) throw new Error(dataInitial.error || "Erro ao consultar IA (prompt inicial).");
      if (!resOptimized.ok) throw new Error(dataOptimized.error || "Erro ao consultar IA (prompt otimizado).");
      setAiResponseInitial(dataInitial.text);
      setAiResponseOptimized(dataOptimized.text);
      setSessionIdInitial(dataInitial.sessionId);
      setSessionIdOptimized(dataOptimized.sessionId);
    } catch (err) {
      setAiError(err.message || "Não foi possível consultar a IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const optimizedPrompt =
    stage === "done" ? buildOptimizedPrompt(initialPrompt, answers) : "";
  const originalPrompt = stage === "done" ? initialPrompt : "";

  const handleCopyPrompt = async () => {
    if (!optimizedPrompt) return;
    const successful = await copyTextToClipboard(optimizedPrompt);
    if (successful) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setCopied(false);
  };

  const handleCopyOriginalPrompt = async () => {
    if (!originalPrompt) return;
    const successful = await copyTextToClipboard(originalPrompt);
    if (successful) {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
      return;
    }
    setCopiedOriginal(false);
  };

  const handleTestPromptInitial = async () => {
    if (!originalPrompt || aiLoadingInitial) return;
    setAiLoadingInitial(true);
    setAiError("");
    try {
      const res = await apiFetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: originalPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao testar prompt.");
      setAiResponseInitial(data.text);
      setSessionIdInitial(data.sessionId);
    } catch (err) {
      setAiError(err.message || "Não foi possível testar o prompt.");
    } finally {
      setAiLoadingInitial(false);
    }
  };

  const handleTestPromptOptimized = async () => {
    if (!optimizedPrompt || aiLoadingOptimized) return;
    setAiLoadingOptimized(true);
    setAiError("");
    try {
      const res = await apiFetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: optimizedPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao testar prompt.");
      setAiResponseOptimized(data.text);
      setSessionIdOptimized(data.sessionId);
    } catch (err) {
      setAiError(err.message || "Não foi possível testar o prompt.");
    } finally {
      setAiLoadingOptimized(false);
    }
  };

  const handleSurveyChange = (questionId, value) => {
    setSurveyResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const loadSurveys = async () => {
    setSurveyLoading(true);
    setSurveyListError("");
    try {
      const response = await apiFetch("/api/surveys");
      if (!response.ok) {
        throw new Error("Falha ao carregar.");
      }
      const data = await response.json();
      setSurveyList(Array.isArray(data) ? data : []);
    } catch (error) {
      setSurveyListError("Não foi possível carregar os formulários.");
    } finally {
      setSurveyLoading(false);
    }
  };

  const loadUsers = async () => {
    setUserListLoading(true);
    setUserListError("");
    try {
      const response = await apiFetch("/api/users");
      if (!response.ok) throw new Error("Falha ao carregar.");
      const data = await response.json();
      setUserList(Array.isArray(data) ? data : []);
    } catch (error) {
      setUserListError("Não foi possível carregar os usuários.");
    } finally {
      setUserListLoading(false);
    }
  };

  const handleAuthorizeUser = async (userId) => {
    setUserListError("");
    try {
      const response = await apiFetch(`/api/users/${userId}/authorize`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Falha ao autorizar.");
      await loadUsers();
    } catch (error) {
      setUserListError("Não foi possível autorizar o usuário.");
    }
  };

  const handleSurveySubmit = async (event) => {
    event.preventDefault();
    if (surveySubmitted || surveySaving) return;
    setSurveySaving(true);
    setSurveyError("");
    try {
      const response = await apiFetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialPrompt,
          optimizedPrompt,
          answers,
          ratings: surveyResponses,
          aiResponseInitial: aiResponseInitial || undefined,
          aiResponseOptimized: aiResponseOptimized || undefined,
          sessionIdInitial: sessionIdInitial || undefined,
          sessionIdOptimized: sessionIdOptimized || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error("Falha ao salvar.");
      }
      setSurveySubmitted(true);
    } catch (error) {
      setSurveyError("Não foi possível salvar a avaliação.");
    } finally {
      setSurveySaving(false);
    }
  };

  const handleDownloadSurvey = async (surveyId, format = "json") => {
    setSurveyListError("");
    try {
      const url = format === "txt"
        ? `/api/surveys/${surveyId}/export/txt`
        : `/api/surveys/${surveyId}/export`;
      const response = await apiFetch(url);
      if (!response.ok) throw new Error("Falha ao baixar.");
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `survey-${surveyId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      if (format === "json") await loadSurveys();
    } catch (error) {
      setSurveyListError("Não foi possível baixar o formulário.");
    }
  };

  const handleDeleteSurvey = async (surveyId) => {
    setSurveyListError("");
    try {
      const response = await apiFetch(`/api/surveys/${surveyId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Falha ao excluir.");
      }
      await loadSurveys();
    } catch (error) {
      setSurveyListError("Não foi possível excluir o formulário.");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = input.trim();

    if (stage === "idle") {
      if (!text) return;
      setInput("");
      const firstQuestion = QUESTIONS[0];
      setInitialPrompt(text);
      setStage("questioning");
      setCurrentQuestionIndex(0);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: firstQuestion.text },
      ]);
      return;
    }

    if (stage === "questioning") {
      const isRequired = currentQuestionIndex === 0;
      if (isRequired && !text) return;
      setInput("");
      const currentQuestion = QUESTIONS[currentQuestionIndex];
      const updatedAnswers = {
        ...answers,
        [currentQuestion.id]: text,
      };
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = QUESTIONS[nextIndex];

      setAnswers(updatedAnswers);
      if (nextQuestion) {
        setCurrentQuestionIndex(nextIndex);
        setMessages((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: nextQuestion.text },
        ]);
      } else {
        setStage("done");
        setMessages((prev) => [
          ...prev,
          { role: "user", content: text },
          {
            role: "assistant",
            content: buildSummaryMessage(initialPrompt, updatedAnswers),
          },
        ]);
      }
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
  };

  const handleSkip = () => {
    if (stage !== "questioning" || currentQuestionIndex === 0) return;
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: "",
    };
    const nextIndex = currentQuestionIndex + 1;
    const nextQuestion = QUESTIONS[nextIndex];
    setAnswers(updatedAnswers);
    if (nextQuestion) {
      setCurrentQuestionIndex(nextIndex);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Pular" },
        { role: "assistant", content: nextQuestion.text },
      ]);
    } else {
      setStage("done");
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Pular" },
        {
          role: "assistant",
          content: buildSummaryMessage(initialPrompt, updatedAnswers),
        },
      ]);
    }
  };

  const currentHint =
    stage === "questioning" ? QUESTIONS[currentQuestionIndex]?.rationale : "";

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Prompt Optimizer</h1>
          <p>Chat para refinar prompts com perguntas baseadas em boas práticas.</p>
        </div>
        <div className="status">
          {user?.email ? (
            <span className="user-email">{user.email}</span>
          ) : null}
          <span>{progressLabel}</span>
          <button type="button" className="secondary" onClick={handleReset}>
            Reiniciar
          </button>
          {authEnabled && user ? (
            <button type="button" className="secondary" onClick={handleLogout}>
              Sair
            </button>
          ) : null}
        </div>
      </header>
      <nav className="nav">
        <button
          type="button"
          className={view === "chat" ? "nav-button active" : "nav-button"}
          onClick={() => setView("chat")}
        >
          Chat
        </button>
        <button
          type="button"
          className={view === "admin" ? "nav-button active" : "nav-button"}
          onClick={() => {
            setView("admin");
            loadSurveys();
          }}
        >
          Gestão de formulários
        </button>
        {user?.role === "admin" ? (
          <button
            type="button"
            className={view === "users" ? "nav-button active" : "nav-button"}
            onClick={() => {
              setView("users");
              loadUsers();
            }}
          >
            Usuários
          </button>
        ) : null}
      </nav>

      <section className="info">
        <p>
          Referência principal:{" "}
          <a
            href="https://arxiv.org/pdf/2406.06608v6"
            target="_blank"
            rel="noreferrer"
          >
            The Prompt Report (Schulhoff et al., 2024)
          </a>
          .
        </p>
        {currentHint ? (
          <p className="hint">Por que isso importa: {currentHint}</p>
        ) : null}
      </section>

      {view === "users" && user?.role === "admin" ? (
        <main className="admin">
          <div className="admin-header">
            <div>
              <h2>Gestão de usuários</h2>
              <p>Autorize novos usuários para acessar a aplicação.</p>
            </div>
            <button type="button" className="secondary" onClick={loadUsers}>
              Atualizar
            </button>
          </div>
          {userListLoading ? <p>Carregando usuários...</p> : null}
          {userListError ? <p className="error">{userListError}</p> : null}
          {!userListLoading && userList.length === 0 ? (
            <p>Nenhum usuário cadastrado.</p>
          ) : null}
          {userList.length > 0 ? (
            <div className="admin-table">
              <div className="admin-row header users-row">
                <span>E-mail</span>
                <span>Função</span>
                <span>Status</span>
                <span>Ações</span>
              </div>
              {userList.map((u) => (
                <div className="admin-row users-row" key={u.id}>
                  <span>{u.email}</span>
                  <span>{u.role === "admin" ? "Admin" : "Usuário"}</span>
                  <span>
                    {u.authorizedAt ? "Autorizado" : "Pendente"}
                  </span>
                  <span className="admin-actions">
                    {!u.authorizedAt && u.role !== "admin" ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => handleAuthorizeUser(u.id)}
                      >
                        Autorizar
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </main>
      ) : view === "chat" ? (
        <main className="chat">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="bubble">{message.content}</div>
            </div>
          ))}
          <div ref={endRef}></div>
        </main>
      ) : (
        <main className="admin">
          <div className="admin-header">
            <div>
              <h2>Gestão de formulários</h2>
              <p>Controle de downloads e exclusão de registros.</p>
            </div>
            <button type="button" className="secondary" onClick={loadSurveys}>
              Atualizar
            </button>
          </div>
          {surveyLoading ? <p>Carregando formulários...</p> : null}
          {surveyListError ? <p className="error">{surveyListError}</p> : null}
          {!surveyLoading && surveyList.length === 0 ? (
            <p>Nenhum formulário registrado até o momento.</p>
          ) : null}
          {surveyList.length > 0 ? (
            <div className="admin-table">
              <div className="admin-row header">
                <span>ID</span>
                <span>Data</span>
                <span>Download</span>
                <span>Ações</span>
              </div>
              {surveyList.map((survey) => (
                <div className="admin-row" key={survey.id}>
                  <span className="mono">{survey.id.slice(0, 8)}...</span>
                  <span>
                    {new Date(survey.createdAt).toLocaleString("pt-BR")}
                  </span>
                  <span>
                    {survey.downloadedAt ? "Baixado" : "Pendente"}
                  </span>
                  <span className="admin-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleDownloadSurvey(survey.id, "json")}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleDownloadSurvey(survey.id, "txt")}
                    >
                      TXT
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteSurvey(survey.id)}
                    >
                      Excluir
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </main>
      )}

      {view === "chat" && stage === "done" ? (
        <section className="prompt-output" aria-live="polite">
          <div className="prompt-panels">
            <div className="prompt-panel">
              <div className="prompt-header">
                <h2>Prompt inicial</h2>
                <div className="prompt-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleCopyOriginalPrompt}
                  >
                    {copiedOriginal ? "Copiado!" : "Copiar"}
                  </button>
                  {aiConfigured === true ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleTestPromptInitial}
                      disabled={aiLoadingInitial || aiLoading}
                    >
                      {aiLoadingInitial ? "Testando..." : "Testar prompt"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="prompt-box">
                <pre>{originalPrompt}</pre>
              </div>
              <p className="prompt-hint">
                Use este prompt para comparar os resultados.
              </p>
            </div>

            <div className="prompt-panel">
              <div className="prompt-header">
                <h2>Prompt otimizado</h2>
                <div className="prompt-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleCopyPrompt}
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                  {aiConfigured === true ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleTestPromptOptimized}
                      disabled={aiLoadingOptimized || aiLoading}
                    >
                      {aiLoadingOptimized ? "Testando..." : "Testar prompt"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="prompt-box">
                <pre>{optimizedPrompt}</pre>
              </div>
              <p className="prompt-hint">
                Você pode ajustar qualquer detalhe e copiar novamente.
              </p>
            </div>
          </div>

          {aiConfigured === true ? (
            <div className="ai-consult-section">
              <h3>Consultar IA (comparação A/B)</h3>
              <p>
                Envie ambos os prompts para a IA em sessões independentes e
                compare as respostas.
              </p>
              {aiError ? <p className="error">{aiError}</p> : null}
              <button
                type="button"
                className="secondary"
                onClick={handleConsultAI}
                disabled={aiLoading}
              >
                {aiLoading ? "Consultando IA..." : "Consultar IA"}
              </button>
              {(aiResponseInitial || aiResponseOptimized) ? (
                <div className="ai-response-panels">
                  <div className="prompt-panel">
                    <h4>Resposta IA – Prompt inicial</h4>
                    <div className="prompt-box">
                      <pre>{aiResponseInitial || "—"}</pre>
                    </div>
                  </div>
                  <div className="prompt-panel">
                    <h4>Resposta IA – Prompt otimizado</h4>
                    <div className="prompt-box">
                      <pre>{aiResponseOptimized || "—"}</pre>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : aiConfigured === false ? (
            <p className="prompt-hint">
              IA não configurada. Defina GEMINI_API_KEY no servidor para
              consultar a IA diretamente.
            </p>
          ) : null}

          <div className="survey-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setShowSurvey((prev) => !prev)}
            >
              {showSurvey ? "Ocultar formulário" : "Avaliar efetividade"}
            </button>
            <span className="survey-note">
              Escala 1–5. Nas questões de comparação: 1 = Discordo totalmente, 5 =
              Concordo totalmente.
            </span>
          </div>

          {showSurvey ? (
            <form className="survey" onSubmit={handleSurveySubmit}>
              <h3>Formulário de avaliação (A/B)</h3>
              <p>
                Avalie a efetividade do prompt otimizado em comparação ao prompt
                inicial.
              </p>
              <p className="survey-note">
                Escala 1–5 nas questões de comparação: 1 = Discordo totalmente, 5 =
                Concordo totalmente.
              </p>
              {surveyError ? <p className="error">{surveyError}</p> : null}
              {PROFILE_QUESTIONS.map((question) => (
                <div className="survey-item" key={question.id}>
                  <span className="survey-question">{question.text}</span>
                  {question.note ? (
                    <span className="survey-note">{question.note}</span>
                  ) : null}
                  <div className="survey-scale">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={question.id}
                          value={value}
                          checked={surveyResponses[question.id] === String(value)}
                          onChange={(event) =>
                            handleSurveyChange(question.id, event.target.value)
                          }
                          required
                          disabled={surveySubmitted}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {SURVEY_QUESTIONS.map((question) => (
                <div className="survey-item" key={question.id}>
                  <span className="survey-question">{question.text}</span>
                  <div className="survey-scale">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={question.id}
                          value={value}
                          checked={surveyResponses[question.id] === String(value)}
                          onChange={(event) =>
                            handleSurveyChange(question.id, event.target.value)
                          }
                          required
                          disabled={surveySubmitted}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="survey-submit">
                <button type="submit" disabled={surveySubmitted || surveySaving}>
                  {surveySubmitted
                    ? "Avaliação enviada"
                    : surveySaving
                      ? "Enviando..."
                      : "Enviar avaliação"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {view === "chat" ? (
        <form className="composer" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={
              stage === "done"
                ? "Clique em reiniciar para iniciar um novo prompt."
                : "Digite aqui..."
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Mensagem"
            disabled={stage === "done"}
          />
          {stage === "done" ? (
            <button type="button" className="secondary" onClick={handleReset}>
              Reiniciar
            </button>
          ) : null}
          {stage !== "done" ? <button type="submit">Enviar</button> : null}
          {stage === "questioning" && currentQuestionIndex > 0 ? (
            <button type="button" className="secondary" onClick={handleSkip}>
              Pular
            </button>
          ) : null}
        </form>
      ) : null}
    </div>
  );
};

export default App;
