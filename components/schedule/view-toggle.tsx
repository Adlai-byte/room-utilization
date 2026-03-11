"use client";

import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function ViewToggle({ date, onDateChange }: ViewToggleProps) {
  const goToPreviousDay = () => {
    onDateChange(addDays(date, -1));
  };

  const goToNextDay = () => {
    onDateChange(addDays(date, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday =
    format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousDay}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextDay}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <h2 className="text-base font-semibold text-slate-900">
        {format(date, "EEEE, MMMM d, yyyy")}
      </h2>

      {!isToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="text-orange-600 hover:text-orange-700"
        >
          Today
        </Button>
      )}
    </div>
  );
}
