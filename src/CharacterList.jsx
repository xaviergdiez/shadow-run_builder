import { useEffect, useState } from "react";
import "./Home.css";

const SHEET_TEMPLATE_URL = ""; // published Google Sheet template — fill in once created

// ponytail: plain `vite dev` has no /api, so the runner list falls back to
// localStorage. Everything the builder writes is already local-first
// (usePersistedState), so this is the only piece the API layer was holding.
// Run `vercel dev` to exercise the real Upstash-backed list.
const LOCAL_KEY = "runners:local";
const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const writeLocal = (chars) => localStorage.setItem(LOCAL_KEY, JSON.stringify(chars));

function openChar(id) {
  window.location.hash = `#/char/${id}`;
  window.location.reload(); // reinitializes per-character state singletons
}

export default function CharacterList({ me }) {
  const [chars, setChars] = useState(null);
  const [offline, setOffline] = useState(false);
  const [syncOpenFor, setSyncOpenFor] = useState(null);
  const [syncToken, setSyncToken] = useState(null);

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setChars(d.chars ?? []))
      .catch(() => {
        setOffline(true);
        setChars(readLocal());
      });
  }, []);

  const createChar = async () => {
    const name = window.prompt("Street name");
    if (!name?.trim()) return;

    if (offline) {
      const char = { id: crypto.randomUUID(), name: name.trim() };
      writeLocal([...readLocal(), char]);
      openChar(char.id);
      return;
    }

    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) openChar((await res.json()).id);
  };

  const deleteChar = async (ch) => {
    if (!window.confirm(`Delete "${ch.name}" permanently? This cannot be undone.`)) return;

    if (offline) {
      writeLocal(readLocal().filter((c) => c.id !== ch.id));
      // Drop the runner's own persisted keys too, or the next character to
      // reuse the id would inherit their chrome.
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(`sheet:${ch.id}:`)) localStorage.removeItem(key);
      }
      setChars((prev) => prev.filter((c) => c.id !== ch.id));
      return;
    }

    const res = await fetch(`/api/characters?c=${ch.id}`, { method: "DELETE" });
    if (res.ok) setChars((prev) => prev.filter((c) => c.id !== ch.id));
  };

  const showSync = async (ch) => {
    if (syncOpenFor === ch.id) {
      setSyncOpenFor(null);
      return;
    }
    setSyncOpenFor(ch.id);
    setSyncToken(null);
    const res = await fetch(`/api/characters?c=${ch.id}&sync=1`, { method: "POST" });
    if (res.ok) setSyncToken((await res.json()).token);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="home">
      <div className="home__card home__card--wide">
        <div className="home__header">
          <div>
            <p className="home__eyebrow label">Shadowrun · Anarchy 2.0</p>
            <h1 className="home__title">Your runners</h1>
          </div>
          <div className="home__user">
            <span className="label">{me.email}</span>
            <button type="button" className="home__link-btn" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>

        {offline && (
          <p className="home__notice">
            No API reachable — running local-only. Runners live in this browser until you deploy.
          </p>
        )}

        {chars === null && <p className="home__subtitle">Loading…</p>}
        {chars?.length === 0 && <p className="home__subtitle">No runners yet. Build your first.</p>}

        <ul className="home__char-list">
          {chars?.map((ch) => (
            <li key={ch.id} className="home__char-item">
              <div className="home__char-row">
                <button type="button" className="home__char-open" onClick={() => openChar(ch.id)}>
                  {ch.name}
                </button>
                {!offline && (
                  <button type="button" className="home__link-btn" onClick={() => showSync(ch)}>
                    Sheet sync
                  </button>
                )}
                <button
                  type="button"
                  className="home__link-btn home__link-btn--danger"
                  onClick={() => deleteChar(ch)}
                >
                  Delete
                </button>
              </div>
              {syncOpenFor === ch.id && (
                <div className="home__sync-box">
                  <p>
                    Import this runner from a Google Sheet:{" "}
                    {SHEET_TEMPLATE_URL ? (
                      <a href={SHEET_TEMPLATE_URL} target="_blank" rel="noreferrer">
                        copy the template
                      </a>
                    ) : (
                      "copy the template sheet"
                    )}
                    , paste <code>apps-script.js</code> into Extensions → Apps Script, then
                    reload the sheet and use the <strong>Shadowrun</strong> menu: set the webhook
                    URL to <code>{window.location.origin}/api/sync-sheet</code> once, then set this
                    token on the runner's own tab. One tab per runner, one token each.
                  </p>
                  {syncToken ? (
                    <div className="home__token-row">
                      <code className="home__token">{syncToken}</code>
                      <button
                        type="button"
                        className="home__link-btn"
                        onClick={() => navigator.clipboard?.writeText(syncToken)}
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <p>Loading token…</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        <button type="button" className="home__google-btn" onClick={createChar}>
          + New runner
        </button>
      </div>
    </div>
  );
}
