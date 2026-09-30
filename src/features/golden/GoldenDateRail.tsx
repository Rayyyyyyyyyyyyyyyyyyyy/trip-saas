import { Tab, Tabs } from "@mui/material";

import { days } from "../../tripData";
import { formatTripMonthDay } from "../result/formatTripDate";

export function GoldenDateRail({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-trip-hairline bg-trip-paper">
      <div className="mx-auto max-w-[1200px] overflow-x-auto">
        <Tabs
          aria-label="選擇旅行日期"
          className="min-w-[520px]"
          onChange={(_, value: string) => onSelect(value)}
          slotProps={{ indicator: { className: "hidden" } }}
          value={selected}
          variant="fullWidth"
        >
          {days.map((day) => (
            <Tab
              className="min-h-16 border-x border-trip-hairline px-1 py-2 font-utility text-trip-ink [&.Mui-selected]:bg-trip-ink [&.Mui-selected]:text-trip-paper"
              key={day.date}
              value={day.date}
              label={
                <span className="text-center">
                  <span className="block font-utility text-base font-bold tabular-nums">
                    {formatTripMonthDay(day.date)}
                  </span>
                  <span className="block font-utility text-[9px]">
                    {day.dow}
                  </span>
                  <span className="block font-editorial text-[10px]">
                    {day.label}
                  </span>
                </span>
              }
            />
          ))}
        </Tabs>
      </div>
    </div>
  );
}
