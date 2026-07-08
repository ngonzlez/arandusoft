"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";

interface ClienteTabsProps {
  tabs: { key: string; label: string; content: React.ReactNode }[];
}

export function ClienteTabs({ tabs }: ClienteTabsProps) {
  const [activo, setActivo] = useState(tabs[0]?.key ?? "");

  return (
    <div>
      <Tabs
        tabs={tabs.map(({ key, label }) => ({ key, label }))}
        active={activo}
        onChange={setActivo}
      />
      <div className="mt-5">{tabs.find((t) => t.key === activo)?.content}</div>
    </div>
  );
}
