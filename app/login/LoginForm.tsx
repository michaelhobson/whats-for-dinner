"use client";

import { useActionState } from "react";
import { login, AuthState } from "@/app/actions/auth";

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    login,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {from && <input type="hidden" name="from" value={from} />}
      <input
        type="password"
        name="passcode"
        placeholder="Passcode"
        autoFocus
        autoComplete="current-password"
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
