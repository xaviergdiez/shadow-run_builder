import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Login from "./Login.jsx";
import CharacterList from "./CharacterList.jsx";
import "./styles/tokens.css";
import "./styles/global.css";

// Hash router — #/characters, #/char/<cid>. Opening or closing a character does
// a full page reload so the usePersistedState module singletons reinitialize
// against the new character id.
function Root() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = signed out
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      // ponytail: plain `vite dev` has no /api, so sign-in is stubbed out
      // locally and every runner lives in localStorage. Run `vercel dev` to
      // exercise the real Google + Upstash path.
      .catch(() => null)
      .then((user) => setMe(user ?? (import.meta.env.DEV ? DEV_USER : null)));
  }, []);

  if (me === undefined) return null;
  if (me === null) return <Login />;

  const charMatch = hash.match(/^#\/char\/([a-z0-9-]+)/);
  if (charMatch) return <App charId={charMatch[1]} me={me} />;
  return <CharacterList me={me} />;
}

const DEV_USER = { email: "local@dev", name: "Local dev" };

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
