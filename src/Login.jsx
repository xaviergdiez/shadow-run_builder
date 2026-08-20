import "./Home.css";

export default function Login() {
  return (
    <div className="home">
      <div className="home__card">
        <p className="home__eyebrow label">Shadowrun · Anarchy 2.0</p>
        <h1 className="home__title">Character builder</h1>
        <p className="home__subtitle">
          One nuyen budget, six steps, and a sheet that prints for the table.
        </p>
        <a className="home__google-btn" href="/api/auth/google">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
