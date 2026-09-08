/**
 * ==============================================================================
 * COMPONENT: BookingsTab.tsx
 * Path: src/app/broker/bookings/BookingsTab.tsx
 * Description: Broker publishes available consultation slots (no client) that
 *              clients can claim, and reviews claimed bookings.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import { Clock, ChevronLeft, ChevronRight, Video, Phone, Plus, Loader2, Trash2 } from "lucide-react";
import { useBroker } from "../BrokerContext";
import { parseSlotTime, toISOSlotTime } from "@/lib/api";

export default function BookingsTab() {
  const { bookings, publishedSlots, createSlot, deleteSlot, loading, submitting } = useBroker();

  // Dynamic current date initialization
  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonth = today.getMonth();
  const initialDayStr = String(today.getDate()).padStart(2, "0");
  const initialMonthStr = String(initialMonth + 1).padStart(2, "0");
  const initialDateStr = `${initialYear}-${initialMonthStr}-${initialDayStr}`;

  // Calendar state
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const [selectedDate, setSelectedDate] = useState(initialDateStr);
  const [slotTime, setSlotTime] = useState("10:00 AM");
  const [meetingType, setMeetingType] = useState("Initial Strategy Consultation");
  const [meetingPlatform, setMeetingPlatform] = useState("Google Meet");

  const [notification, setNotification] = useState<string | null>(null);

  const timeOptions = Array.from({ length: 15 }, (_, i) => {
    const hour24 = 7 + i;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${String(hour12).padStart(2, "0")}:00 ${ampm}`;
  });

  // Month metadata
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays: (number | null)[] = [
    ...Array(firstDayIndex).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const formatDateString = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  };

  const getBookingsForDay = (day: number) => {
    const dateStr = formatDateString(day);
    return bookings.filter((b) => b.date === dateStr);
  };

  const getSlotsForDay = (day: number) => {
    const dateStr = formatDateString(day);
    return publishedSlots.filter((s) => {
      const { date } = parseSlotTime(s.slot_time);
      return date === dateStr;
    });
  };

  // Prevent going back to past months before current month
  const isMinMonth =
    currentYear < initialYear ||
    (currentYear === initialYear && currentMonth <= initialMonth);

  const handlePrevMonth = () => {
    if (isMinMonth) return;
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const handlePublishSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTime) {
      alert("Please enter a time for the slot.");
      return;
    }
    try {
      const iso = toISOSlotTime(selectedDate, slotTime);
      await createSlot({
        slot_time: iso,
        consultation_type: meetingType,
        meeting_platform: meetingPlatform,
      });
      setNotification(`Published an available slot on ${selectedDate} at ${slotTime}.`);
    } catch {
      setNotification("Failed to publish slot. It may already exist at this time.");
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await deleteSlot(id);
      setNotification("Available slot removed.");
    } catch {
      setNotification("Failed to remove slot.");
    }
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#0B2369] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold text-slate-800">Bookings &amp; Available Slots</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Publish open consultation slots that clients can book, then review confirmed meetings.
        </p>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl animate-fadeIn">
          {notification}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left: Calendar */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={isMinMonth}
                className={`p-2 rounded-xl border transition-all ${
                  isMinMonth
                    ? "bg-slate-50 opacity-30 cursor-not-allowed border-slate-200 text-slate-300"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200/50 text-slate-500 cursor-pointer"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-slate-500 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/30 rounded-2xl" />;
              }
              const dateStr = formatDateString(day);
              const isSelected = selectedDate === dateStr;
              const dayBookings = getBookingsForDay(day);
              const daySlots = getSlotsForDay(day);
              const hasContent = dayBookings.length > 0 || daySlots.length > 0;

              let tileClass = "bg-white text-slate-700 border-slate-100 hover:border-slate-300";
              if (hasContent) tileClass = "bg-[#0B2369] text-white border-[#0B2369] shadow-sm";
              const selectedHighlight = isSelected ? "ring-4 ring-amber-400 border-amber-400 z-10 scale-102 font-black shadow-md" : "";

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative font-bold text-xs transition-all border ${tileClass} ${selectedHighlight}`}
                >
                  <span>{day}</span>
                  {hasContent && (
                    <span className="text-[7px] font-black uppercase text-amber-300 mt-0.5">
                      {daySlots.length} SLT · {dayBookings.length} MTG
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Agenda of selected date */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs">
              {selectedDate} — Open slots &amp; meetings
            </h4>
            <div className="space-y-2">
              {getSlotsForDay(parseInt(selectedDate.split("-")[2], 10)).length === 0 &&
                bookings.filter((b) => b.date === selectedDate).length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">Nothing scheduled on this day.</p>
              ) : (
                <>
                  {getSlotsForDay(parseInt(selectedDate.split("-")[2], 10)).map((s) => {
                    const { time } = parseSlotTime(s.slot_time);
                    return (
                      <div key={s.id} className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-800 block">
                            Available Slot · {time}
                          </span>
                          <span className="text-[10px] text-[#0024A8] font-bold block">{s.consultation_type}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                            <Video className="w-2.5 h-2.5 text-blue-500" /> {s.meeting_platform}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {bookings.filter((b) => b.date === selectedDate).map((b) => (
                    <div key={b.id} className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 block">{b.clientName}</span>
                        <span className="text-[10px] text-[#0B2369] font-bold block">{b.type}</span>
                        {b.notes && <p className="text-[10px] text-slate-400 font-medium">{b.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-700 block">{b.time}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{b.platform}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Publish form + slot management */}
        <div className="lg:col-span-5 space-y-6">

          {/* Publish Available Slot Form */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl">
            <h3 className="font-extrabold text-slate-800 text-sm mb-4">Publish Available Slot</h3>
            <form onSubmit={handlePublishSlot} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <select
                    required
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-semibold text-slate-700"
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Meeting Type</label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-semibold text-slate-600"
                >
                  <option value="Initial Strategy Consultation">Initial Strategy Consultation</option>
                  <option value="Document Clarification Meeting">Document Clarification Meeting</option>
                  <option value="Pre-Approval Review">Pre-Approval Review</option>
                  <option value="Settlement Prep Session">Settlement Prep Session</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Meeting Method</label>
                <select
                  value={meetingPlatform}
                  onChange={(e) => setMeetingPlatform(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-semibold text-slate-600"
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom Video Call">Zoom Video Call</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="In-Office Consultation">In-Office Consultation</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0B2369] text-white hover:bg-[#071644] disabled:opacity-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#0B2369]/10 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{submitting ? "Publishing..." : "Publish Available Slot"}</span>
              </button>
            </form>
          </div>

          {/* Published available slots */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Published Available Slots</h3>
            <div className="space-y-3.5 divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
              {publishedSlots.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">No available slots published yet.</p>
              ) : (
                publishedSlots.map((s, idx) => {
                  const { date, time } = parseSlotTime(s.slot_time);
                  return (
                    <div key={s.id} className={`flex items-start justify-between gap-3 text-xs ${idx > 0 ? "pt-3.5" : ""}`}>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-800 block">{date} · {time}</span>
                        <span className="text-[10px] text-[#0024A8] font-bold block">{s.consultation_type}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase">{s.meeting_platform}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(s.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"
                        title="Remove slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Claimed bookings */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Confirmed Meetings</h3>
            <div className="space-y-3.5 divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
              {bookings.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">No confirmed meetings yet.</p>
              ) : (
                bookings.map((b, idx) => (
                  <div key={b.id} className={`flex items-start justify-between gap-3 text-xs ${idx > 0 ? "pt-3.5" : ""}`}>
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 block">{b.clientName}</span>
                      <span className="text-[10px] text-[#0B2369] font-bold block">{b.type}</span>
                      <span className="text-[10px] text-slate-400 font-medium block">Date: {b.date}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-700 block">{b.time}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{b.platform}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
