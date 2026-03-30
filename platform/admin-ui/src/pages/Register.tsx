import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
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
          Create Account
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            marginBottom: 32,
          }}
        >
          Get started with Lyx Admin
        </p>

        <form onSubmit={handleSubmit} className="card">
          <div className="form-group">
            <label>Name</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
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
              placeholder="Minimum 6 characters"
              minLength={6}
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
            {loading ? "Creating..." : "Create Account"}
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
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
