"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type QueryResponse = {
  result?: { content?: string };
  detail?: string;
  status?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQueryResponse(value: unknown): value is QueryResponse {
  if (!isRecord(value)) return false;
  if ("detail" in value && typeof value.detail !== "string") return false;
  if ("status" in value && typeof value.status !== "boolean") return false;
  if ("result" in value && value.result !== undefined) {
    if (!isRecord(value.result)) return false;
    if ("content" in value.result && typeof value.result.content !== "string") {
      return false;
    }
  }
  return true;
}

async function readApiResponse(response: Response): Promise<QueryResponse> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "The API returned an unreadable response. Please try again."
        : `The API returned an internal error (HTTP ${response.status}). Check the API service and try again.`,
    );
  }

  if (!isQueryResponse(payload)) {
    throw new Error("The API returned an invalid response. Please try again.");
  }
  if (!response.ok) {
    throw new Error(payload.detail ?? `The API request failed (HTTP ${response.status}).`);
  }
  return payload;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((response) => {
        if (!response.ok) throw new Error("Could not start a secure browser session.");
        setSessionReady(true);
      })
      .catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Could not start a session.");
      });
  }, []);

  async function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = question.trim();
    if (!query || busy) return;

    setMessages((current) => [...current, { role: "user", content: query }]);
    setQuestion("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, session_id: sessionId }),
      });
      const data = await readApiResponse(response);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.result?.content ?? "No answer returned." },
      ]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !description.trim() || busy || !sessionReady) {
      setNotice("Choose a PDF or TXT file and add a short description.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("description", description.trim());
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await readApiResponse(response);
      if (!data.status) throw new Error("Document upload returned no status.");
      setNotice(`${file.name} was added to your knowledge base.`);
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Document upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Adaptive RAG home">
          <span className="brand-mark">A</span>
          <span>adaptive<span className="brand-light">.rag</span></span>
        </a>
        <a className="github-link" href="https://github.com/udit3103/Adaptive-Rag" target="_blank" rel="noreferrer">
          View source <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="status-dot" /> YOUR KNOWLEDGE, CONNECTED</div>
        <h1>Ask better.<br /><span>Find the signal.</span></h1>
        <p className="intro">
          One thoughtful answer, drawn from your documents, the wider world,
          or both.
        </p>
      </section>

      <section className="workspace" aria-label="Adaptive RAG workspace">
        <aside className="library panel">
          <div className="section-kicker">01 / KNOWLEDGE BASE</div>
          <h2>Bring your<br />own context.</h2>
          <p className="muted">
            Add a PDF or text file. Your documents are indexed in secure vector
            storage for relevant answers.
          </p>
          <form onSubmit={uploadDocument} className="upload-form">
            <label className="file-picker">
              <input ref={fileRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" />
              <span className="upload-icon" aria-hidden="true">↑</span>
              <span><strong>Choose a document</strong><small>PDF or TXT · up to 4 MB</small></span>
            </label>
            <label className="field-label" htmlFor="description">WHAT IS IT ABOUT?</label>
            <input
              id="description"
              className="text-field"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              placeholder="e.g. Product strategy for Q3"
            />
            <button className="button button-muted" type="submit" disabled={busy || !sessionReady}>
              {busy ? "Working…" : "Add to knowledge base"}
            </button>
          </form>
          <div className="privacy-note"><span aria-hidden="true">◈</span> Stored in your connected Qdrant collection</div>
        </aside>

        <section className="chat panel" aria-label="Ask a question">
          <div className="chat-header">
            <div>
              <div className="section-kicker">02 / ASK ANYTHING</div>
              <h2>Let’s explore.</h2>
            </div>
            <span className="online-badge"><span className="status-dot" /> READY</span>
          </div>
          <div className="conversation" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <span className="sparkle" aria-hidden="true">✳</span>
                <h3>Your next good question<br />starts here.</h3>
                <p>Ask about your files, get a fresh perspective, or explore something new.</p>
                <div className="suggestions">
                  {["Summarize my uploaded documents", "Explain retrieval-augmented generation"].map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)}>
                      {suggestion} <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="message-label">{message.role === "user" ? "YOU" : "ADAPTIVE RAG"}</div>
                <p>{message.content}</p>
              </article>
            ))}
            {busy && <div className="working"><span className="status-dot" /> Thinking through it…</div>}
          </div>
          <form className="question-form" onSubmit={askQuestion}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask your question…"
              aria-label="Your question"
              maxLength={4000}
              disabled={busy || !sessionReady}
            />
            <button type="submit" aria-label="Send question" disabled={busy || !question.trim()}>↑</button>
          </form>
          <div className="chat-footnote">AI can make mistakes. Verify important information.</div>
        </section>
      </section>
      {notice && <div className="notice" role="status">{notice}</div>}
      <footer className="footer">
        <span>Adaptive RAG <span className="footer-separator">/</span> A more considered way to search.</span>
        <span>BUILT BY UDIT TIWARI</span>
      </footer>
    </main>
  );
}
