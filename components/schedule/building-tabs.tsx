"use client";

import { Building } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BuildingTabsProps {
  buildings: Building[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function BuildingTabs({
  buildings,
  selectedId,
  onSelect,
  disabled,
}: BuildingTabsProps) {
  const visibleBuildings = disabled
    ? buildings.filter((b) => b.id === selectedId)
    : buildings;

  return (
    <Tabs
      value={selectedId}
      onValueChange={(value) => {
        if (!disabled && value) {
          onSelect(value as string);
        }
      }}
    >
      <TabsList className="h-auto flex-wrap gap-1 bg-slate-100 p-1">
        {visibleBuildings.map((building) => (
          <TabsTrigger
            key={building.id}
            value={building.id}
            disabled={disabled && building.id !== selectedId}
            className="flex items-center gap-2 px-3 py-1.5 text-sm data-active:bg-white data-active:shadow-sm"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: building.color }}
            />
            {building.code}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
