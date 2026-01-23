import { useEffect, useMemo, useRef, useState } from "react";

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
];

const buildOptimizedPrompt = (initialPrompt, answers) => {
  const lines = [];
  lines.push("Você é um assistente especializado em atender a solicitação abaixo.");
  lines.push("");
  lines.push(`Solicitação original: ${initialPrompt}`);
  lines.push("");
  lines.push("Detalhes adicionais:");
  FIELD_LABELS.forEach(({ key, label }) => {
    const value = answers[key];
    if (value && value.trim()) {
      lines.push(`- ${label}: ${value.trim()}`);
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
  FIELD_LABELS.forEach(({ key, label }) => {
    const value = answers[key];
    summaryLines.push(`- ${label}: ${value && value.trim() ? value.trim() : "Não informado"}`);
  });
  summaryLines.push("");
  summaryLines.push("Prompt otimizado:");
  summaryLines.push(buildOptimizedPrompt(initialPrompt, answers));
  return summaryLines.join("\n");
};

const initialAssistantMessage =
  "Digite seu prompt inicial para começar a conversa.";

const App = () => {
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
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const progressLabel = useMemo(() => {
    if (stage !== "questioning") return "Pronto para começar";
    return `Pergunta ${currentQuestionIndex + 1} de ${QUESTIONS.length}`;
  }, [stage, currentQuestionIndex]);

  const handleReset = () => {
    setMessages([{ role: "assistant", content: initialAssistantMessage }]);
    setInput("");
    setStage("idle");
    setInitialPrompt("");
    setAnswers({});
    setCurrentQuestionIndex(0);
    setCopied(false);
    setCopiedOriginal(false);
  };

  const optimizedPrompt =
    stage === "done" ? buildOptimizedPrompt(initialPrompt, answers) : "";
  const originalPrompt = stage === "done" ? initialPrompt : "";

  const handleCopyPrompt = async () => {
    if (!optimizedPrompt) return;
    try {
      await navigator.clipboard.writeText(optimizedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  const handleCopyOriginalPrompt = async () => {
    if (!originalPrompt) return;
    try {
      await navigator.clipboard.writeText(originalPrompt);
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } catch (error) {
      setCopiedOriginal(false);
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
          <span>{progressLabel}</span>
          <button type="button" className="secondary" onClick={handleReset}>
            Reiniciar
          </button>
        </div>
      </header>

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

      <main className="chat">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="bubble">{message.content}</div>
          </div>
        ))}
        <div ref={endRef}></div>
      </main>

      {stage === "done" ? (
        <section className="prompt-output" aria-live="polite">
          <div className="prompt-panels">
            <div className="prompt-panel">
              <div className="prompt-header">
                <h2>Prompt inicial</h2>
                <button
                  type="button"
                  className="secondary"
                  onClick={handleCopyOriginalPrompt}
                >
                  {copiedOriginal ? "Copiado!" : "Copiar"}
                </button>
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
                <button
                  type="button"
                  className="secondary"
                  onClick={handleCopyPrompt}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <div className="prompt-box">
                <pre>{optimizedPrompt}</pre>
              </div>
              <p className="prompt-hint">
                Você pode ajustar qualquer detalhe e copiar novamente.
              </p>
            </div>
          </div>
        </section>
      ) : null}

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
    </div>
  );
};

export default App;
