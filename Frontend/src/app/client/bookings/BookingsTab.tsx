/**
 * ==============================================================================
 * COMPONENT: BookingsTab.tsx
 * Path: src/app/client/bookings/BookingsTab.tsx
 * Description: Client bookings tab listing the assigned broker's published
 *              available slots and allowing the client to claim one.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import { Video, X, Clock, Loader2, CalendarCheck, User, MapPin } from "lucide-react";
import { useClient } from "../ClientContext";
import { parseSlotTime } from "@/lib/api";

export default function BookingsTab() {
  const { booking, bookings, publishedSlots, claimSlot, handleLogAction, loading } = useClient();

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const selectedSlot = publishedSlots.find((s) => s.id === selectedSlotId) || null;

  const executeBooking = async () => {
    if (!selectedSlot) return;
    setClaiming(true);
    const { date, time } = parseSlotTime(selectedSlot.slot_time);
    try {
      await claimSlot(selectedSlot.id);
      handleLogAction(`Booked broker consultation on ${date} at ${time}`);
      setNotification(`Successfully booked "${selectedSlot.consultation_type}" on ${date} at ${time}.`);
      setSelectedSlotId(null);
    } catch {
      setNotification("Failed to book. This slot may have just been taken.");
    } finally {
      setClaiming(false);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#0024A8] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">

      {/* Header section */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-800">Book a Consultation</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Pick an available slot published by your broker to schedule a consultation.
        </p>
      </div>

      {/* Success Notification Alert */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl animate-fadeIn">
          {notification}
        </div>
      )}

      {/* Current booking banner */}
      {booking && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs space-y-1">
          <span className="font-extrabold text-[#0024A8] block">Upcoming Booking</span>
          <span className="text-slate-600 font-semibold">
            {booking.date} at {booking.time} &middot; {booking.type} &middot; {booking.platform}
          </span>
        </div>
      )}

      {/* Available slots list */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-soft-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm">Available Slots</h3>
          <span className="text-[10px] font-extrabold uppercase text-[#0024A8] bg-sky-50 border border-sky-200 px-3 py-1 rounded-xl">
            Published by Your Broker
          </span>
        </div>

        {publishedSlots.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-6 text-center">
            {booking
              ? "You already have a consultation booked."
              : "No available slots published yet. Please check back later."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {publishedSlots.map((slot) => {
              const { date, time } = parseSlotTime(slot.slot_time);
              return (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className="text-left p-4 rounded-2xl border border-slate-200 hover:border-[#0024A8] hover:bg-[#0024A8]/5 transition-all space-y-2"
                >
                  <div className="flex items-center gap-2 text-[#0024A8]">
                    <CalendarCheck className="w-4 h-4" />
                    <span className="text-xs font-extrabold">{date} · {time}</span>
                  </div>
                  <span className="block text-[11px] font-bold text-slate-700">{slot.consultation_type}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Video className="w-3 h-3 text-blue-500" /> {slot.meeting_platform}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* My Confirmed Meetings */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-soft-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm">My Confirmed Meetings</h3>
          <span className="text-[10px] font-extrabold uppercase text-[#0024A8] bg-sky-50 border border-sky-200 px-3 py-1 rounded-xl">
            {bookings.length} Scheduled
          </span>
        </div>

        {bookings.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-6 text-center">
            You have no confirmed meetings yet.
          </p>
        ) : (
          <div className="space-y-3.5 divide-y divide-slate-100">
            {bookings.map((b, idx) => (
              <div key={b.id} className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-xs ${idx > 0 ? "pt-3.5" : ""}`}>
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block">{b.type}</span>
                  {b.brokerName && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0024A8]">
                      <User className="w-3 h-3" /> {b.brokerName}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium block">Date: {b.date}</span>
                </div>
                <div className="sm:text-right shrink-0 space-y-0.5">
                  <span className="font-bold text-slate-700 block">{b.time}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">{b.platform}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* CONFIRMATION MODAL                                                  */}
      {/* ==================================================================== */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 space-y-6 animate-scaleIn">

            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-[#0024A8] uppercase tracking-wider block">
                  Booking Details
                </span>
                <h3 className="text-base font-extrabold text-[#0024A8]">Book This Slot</h3>
              </div>
              <button
                onClick={() => setSelectedSlotId(null)}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slot Info */}
            <div className="space-y-3.5 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/30 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-[#0024A8] shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Broker Consultant</span>
                  <span className="text-slate-800 font-bold block">{selectedSlot.broker_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#0024A8] shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Meeting DateTime</span>
                  <span className="text-slate-800 font-bold block">
                    {parseSlotTime(selectedSlot.slot_time).date} at {parseSlotTime(selectedSlot.slot_time).time}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-[#0024A8] shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Platform Channel</span>
                  <span className="text-slate-800 font-bold block">{selectedSlot.meeting_platform}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#0024A8] shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Meeting Topic</span>
                  <span className="text-slate-800 font-bold block">{selectedSlot.consultation_type}</span>
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="flex justify-end gap-2 text-[10px] font-extrabold uppercase">
              <button
                onClick={() => setSelectedSlotId(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeBooking}
                disabled={claiming}
                className="py-2.5 px-5 bg-[#0024A8] hover:bg-[#001D85] disabled:opacity-50 text-white rounded-xl shadow-md shadow-[#0024A8]/10 transition-all"
              >
                {claiming ? "Booking..." : "Book This Slot"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
