// src/app/admin/login/page.tsx

import type { JSX } from "react";

/**
 * Simple admin login page that posts a password to /admin/login.
 *
 * Authentication is handled on the server side; no client-side logic
 * is required here. If the login succeeds, the server sets a signed
 * admin session cookie and redirects to /admin.
 */
export default function AdminLoginPage(): JSX.Element {
  return (
    <main
      style={{
        maxWidth: "480px",
        margin: "4rem auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
        }}
      >
        Admin login
      </h1>

      <p
        style={{
          fontSize: "0.9rem",
          color: "#4b5563",
          marginBottom: "1.5rem",
        }}
      >
        This area is restricted to administrators. Your login will be secured
        using a signed, HttpOnly session cookie.
      </p>

      <form
        method="POST"
        action="/api/admin/login"
        style={{ display: "grid", gap: "0.75rem" }}
      >
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            style={{
              padding: "0.5rem",
              borderRadius: 4,
              border: "1px solid #d1d5db",
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1.2rem",
            borderRadius: 4,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            background: "#111827",
            color: "#ffffff",
          }}
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
