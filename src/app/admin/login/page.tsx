// src/app/admin/login/page.tsx
import type { JSX } from "react";
import { createCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const CSRF_FIELD_NAME = "_csrf";

export default function AdminLoginPage(): JSX.Element {
  const csrfToken = createCsrfToken("admin-login");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "1.75rem 1.5rem",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          backgroundColor: "#ffffff",
        }}
      >
        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Admin login
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "#4b5563",
            marginBottom: "1.25rem",
          }}
        >
          This area is restricted to administrators. Your login will be secured
          using a signed, HttpOnly session cookie.
        </p>

        <form method="POST" action="/api/admin/login">
          <input type="hidden" name={CSRF_FIELD_NAME} value={csrfToken} />

          <div
            style={{
              display: "grid",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <label
              htmlFor="admin-password"
              style={{
                display: "grid",
                gap: "0.25rem",
                fontSize: "0.9rem",
              }}
            >
              <span>Password</span>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                style={{
                  padding: "0.5rem 0.6rem",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: "0.9rem",
                  width: "100%",
                }}
              />
            </label>
          </div>

          <button
            type="submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.45rem 0.9rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
