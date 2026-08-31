"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createKitchen, sendKitchenInvite, setDefaultKitchen } from "@/app/actions/kitchen";

type Step =
  | { id: 1 }
  | { id: 2; kitchenId: number; kitchenName: string }
  | { id: 3; kitchenId: number; kitchenName: string };

type SentInvite = { email: string; role: string };

export function CreateKitchenWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>({ id: 1 });

  // Step 1 state
  const [kitchenName, setKitchenName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Step 2 state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"RESTAURATEUR" | "CHEF" | "DINER">("CHEF");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);

  // Step 3 state
  const [makeDefault, setMakeDefault] = useState(false);

  // ── Step 1: Create the kitchen ──────────────────────────────────────────────

  function handleCreate() {
    if (!kitchenName.trim()) return;
    setCreateError(null);
    startTransition(async () => {
      const result = await createKitchen(kitchenName.trim());
      if ("error" in result) {
        setCreateError(result.error);
      } else {
        setStep({ id: 2, kitchenId: result.kitchenId, kitchenName: kitchenName.trim() });
      }
    });
  }

  // ── Step 2: Send invites ────────────────────────────────────────────────────

  function handleSendInvite() {
    if (step.id !== 2 || !inviteEmail.trim()) return;
    setInviteError(null);
    startTransition(async () => {
      if (step.id !== 2) return;
      const result = await sendKitchenInvite(step.kitchenId, inviteEmail.trim(), inviteRole);
      if ("error" in result) {
        setInviteError(result.error);
      } else {
        setSentInvites((prev) => [
          ...prev,
          { email: inviteEmail.trim(), role: inviteRole },
        ]);
        setInviteEmail("");
        setInviteError(null);
      }
    });
  }

  function handleSkipToStep3() {
    if (step.id !== 2) return;
    setStep({ id: 3, kitchenId: step.kitchenId, kitchenName: step.kitchenName });
  }

  // ── Step 3: Finish ──────────────────────────────────────────────────────────

  function handleFinish() {
    if (step.id !== 3) return;
    const kitchenId = step.kitchenId;
    startTransition(async () => {
      if (makeDefault) {
        await setDefaultKitchen(kitchenId);
      }
      router.push("/settings");
    });
  }

  // ── Progress indicator ──────────────────────────────────────────────────────

  const stepNum = step.id;
  const steps = ["Name", "Invite", "Finish"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-0">
        {steps.map((label, i) => {
          const num = i + 1;
          const active = num === stepNum;
          const done = num < stepNum;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done
                    ? "bg-orange-600 text-white"
                    : active
                    ? "bg-orange-600 text-white ring-4 ring-orange-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : num}
              </div>
              <span
                className={`ml-1.5 text-xs font-medium ${
                  active ? "text-orange-700" : done ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 ${done ? "bg-orange-300" : "bg-gray-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1 ── */}
      {step.id === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Name your kitchen</h2>
            <p className="text-sm text-gray-500 mt-1">
              This is the name your household will see.
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="kitchen-name" className="text-sm font-medium text-gray-700">
              Kitchen name
            </label>
            <input
              id="kitchen-name"
              type="text"
              placeholder="e.g. The Jones Kitchen"
              value={kitchenName}
              onChange={(e) => setKitchenName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !kitchenName.trim()}
              className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
            >
              {isPending ? "Creating…" : "Create Kitchen →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step.id === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Invite people to <span className="text-orange-700">{step.kitchenName}</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              They&apos;ll get an email with a link to join. You can also do this later from Settings.
            </p>
          </div>

          {/* Sent invites so far */}
          {sentInvites.length > 0 && (
            <ul className="space-y-1.5">
              {sentInvites.map((inv, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm bg-green-50 rounded-lg px-3 py-2"
                >
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">{inv.email}</span>
                  <span className="text-xs text-green-700 font-medium bg-green-100 px-1.5 py-0.5 rounded ml-auto">
                    {inv.role.charAt(0) + inv.role.slice(1).toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Invite form */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "RESTAURATEUR" | "CHEF" | "DINER")
                }
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="RESTAURATEUR">Restaurateur</option>
                <option value="CHEF">Chef</option>
                <option value="DINER">Diner</option>
              </select>
            </div>
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            <button
              onClick={handleSendInvite}
              disabled={isPending || !inviteEmail.trim()}
              className="w-full rounded-lg border-2 border-orange-500 text-orange-700 hover:bg-orange-50 disabled:opacity-50 font-semibold py-2 text-sm transition-colors"
            >
              {isPending ? "Sending…" : "Send Invite"}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSkipToStep3}
              disabled={isPending}
              className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
            >
              {sentInvites.length > 0 ? "Done Inviting →" : "Skip for Now →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step.id === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Almost done!</h2>
            <p className="text-sm text-gray-500 mt-1">
              <strong className="text-gray-700">{step.kitchenName}</strong> has been created.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="mt-0.5 rounded accent-orange-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Make this my default kitchen
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                New recipes and imports will go here by default.
              </p>
            </div>
          </label>

          <button
            onClick={handleFinish}
            disabled={isPending}
            className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
          >
            {isPending ? "Finishing…" : "Finish"}
          </button>
        </div>
      )}
    </div>
  );
}
