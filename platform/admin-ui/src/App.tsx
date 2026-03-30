import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/auth";
import { AppShell } from "./components/AppShell";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { AppList } from "./pages/AppList";
import { AppDetail } from "./pages/AppDetail";
import { MFEList } from "./pages/MFEList";
import { MFEDetail } from "./pages/MFEDetail";
import { Layouts } from "./pages/Layouts";
import { LayoutBuilder } from "./pages/LayoutBuilder";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { account, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }
  if (!account) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { account, loading } = useAuth();
  if (loading) return null;
  if (account) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="apps" element={<AppList />} />
        <Route path="apps/:id" element={<AppDetail />} />
        <Route path="mfes" element={<MFEList />} />
        <Route path="mfes/:id" element={<MFEDetail />} />
        <Route path="layouts" element={<Layouts />} />
        <Route path="layouts/new" element={<LayoutBuilder />} />
        <Route path="layouts/:id/edit" element={<LayoutBuilder />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
