"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchKitchen } from "@/app/actions/kitchen";

export function KitchenSwitcher({
  kitchens,
  activeKitchenId,
}: {
  kitchens: { id: number; name: string }[];
  activeKitchenId: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeKitchen =
    kitchens.find((k) => k.id === activeKitchenId) ?? kitchens[0] ?? null;

  if (!activeKitchen) return null;

  // Single kitchen — show name as a static label, no switcher needed
  if (kitchens.length === 1) {
    return (
      <span className="flex items-center gap-1 text-sm font-medium text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg select-none">
        <span className="text-base leading-none">🏠</span>
        <span className="truncate max-w-[140px]">{activeKitchen.name}</span>
      </span>
    );
  }

  // Multiple kitchens — styled select that triggers a server action + refresh
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-2.5 text-base leading-none z-10">🏠</span>
      <select
        value={activeKitchenId ?? activeKitchen.id}
        disabled={isPending}
        onChange={(e) => {
          const id = parseInt(e.target.value, 10);
          if (isNaN(id) || id === activeKitchenId) return;
          startTransition(async () => {
            await switchKitchen(id);
            router.refresh();
          });
        }}
        className={`
          appearance-none text-sm font-medium text-orange-800 bg-orange-50
          hover:bg-orange-100 pl-8 pr-6 py-1 rounded-lg cursor-pointer
          border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400
          transition-colors max-w-[180px] truncate
          ${isPending ? "opacity-50 cursor-wait" : ""}
        `}
      >
        {kitchens.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name}
          </option>
        ))}
      </select>
      {/* Dropdown chevron */}
      <span className="pointer-events-none absolute right-2 text-orange-500 text-[10px] leading-none">
        ▾
      </span>
    </div>
  );
}
