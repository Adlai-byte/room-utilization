"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomRanking {
  roomId: string;
  roomName: string;
  buildingCode: string;
  bookingCount: number;
  utilizationPercent: number;
}

interface TopRoomsProps {
  data: RoomRanking[];
}

function getBarColor(percent: number): string {
  if (percent >= 70) return "bg-green-500";
  if (percent >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getBarBg(percent: number): string {
  if (percent >= 70) return "bg-green-100";
  if (percent >= 40) return "bg-yellow-100";
  return "bg-red-100";
}

function getBadgeClasses(percent: number): string {
  if (percent >= 70)
    return "bg-green-50 text-green-700 ring-green-600/20";
  if (percent >= 40)
    return "bg-yellow-50 text-yellow-700 ring-yellow-600/20";
  return "bg-red-50 text-red-700 ring-red-600/20";
}

export function TopRooms({ data }: TopRoomsProps) {
  const topTen = data.slice(0, 10);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">
          Room Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topTen.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No room data available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Rank
                  </th>
                  <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Room
                  </th>
                  <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Building
                  </th>
                  <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bookings
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topTen.map((room, index) => (
                  <tr key={room.roomId} className="group">
                    <td className="py-3 pr-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-slate-900">
                        {room.roomName}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {room.buildingCode}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className="text-sm font-semibold text-slate-700">
                        {room.bookingCount}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-24 overflow-hidden rounded-full ${getBarBg(
                            room.utilizationPercent
                          )}`}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${getBarColor(
                              room.utilizationPercent
                            )}`}
                            style={{
                              width: `${Math.min(room.utilizationPercent, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${getBadgeClasses(
                            room.utilizationPercent
                          )}`}
                        >
                          {room.utilizationPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
