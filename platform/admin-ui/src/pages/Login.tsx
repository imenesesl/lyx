import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: -1,
          }}
        >
          <span style={{ color: "var(--accent)" }}>Lyx</span> Admin
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            marginBottom: 32,
          }}
        >
          Sign in to manage your micro frontends
        </p>

        <form onSubmit={handleSubmit} className="card">
          <div className="form-group">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
