"use client";

import { useState } from "react";
import type { Feedback, Role } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";
import { SentimentBadge, StatusBadge, ChannelBadge } from "@/components/feedback/badges";
import { StatusSelect } from "@/components/feedback/status-select";
import { ReclassifyButton } from "@/components/feedback/reclassify-button";
import { FeedbackDetailDialog } from "@/components/feedback/feedback-detail-dialog";
import { Inbox, FilterX } from "lucide-react";

interface FeedbackTableProps {
  items: Feedback[];
  role: Role;
  hasActiveFilters: boolean;
}

export function FeedbackTable({ items, role, hasActiveFilters }: FeedbackTableProps) {
  const canEdit = role === "ADMIN" || role === "ANALYST";
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return hasActiveFilters ? (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-3">
          <FilterX className="h-5 w-5 text-fg-3" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium text-fg">No feedback matches these filters</p>
          <p className="mt-1 text-sm text-fg-3">Try widening your search or clearing a filter.</p>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-3">
          <Inbox className="h-5 w-5 text-fg-3" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium text-fg">No feedback yet</p>
          <p className="mt-1 text-sm text-fg-3">
            Add an item, import a CSV, or sync a channel to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-fg-3">
            <th className="px-5 py-3 font-medium">Feedback</th>
            <th className="px-5 py-3 font-medium">Channel</th>
            <th className="px-5 py-3 font-medium">Sentiment</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Customer</th>
            <th className="whitespace-nowrap px-5 py-3 text-right font-mono font-medium">
              Received
            </th>
            {canEdit && <th className="px-2 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="align-top hover:bg-base-2/60">
              <td className="max-w-md px-5 py-3.5 text-fg">
                <button
                  onClick={() => setOpenId(item.id)}
                  className="line-clamp-2 text-left hover:underline"
                  title="View full feedback"
                >
                  {item.content}
                </button>
              </td>
              <td className="px-5 py-3.5">
                <ChannelBadge channel={item.channel} />
              </td>
              <td className="px-5 py-3.5">
                <SentimentBadge sentiment={item.sentiment} />
              </td>
              <td className="px-5 py-3.5">
                {canEdit ? (
                  <StatusSelect feedbackId={item.id} status={item.status} />
                ) : (
                  <StatusBadge status={item.status} />
                )}
              </td>
              <td className="px-5 py-3.5 text-fg-2">{item.customerLabel || "—"}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-xs text-fg-3">
                {formatDateTime(item.createdAt)}
              </td>
              {canEdit && (
                <td className="px-2 py-3.5">
                  <ReclassifyButton feedbackId={item.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {openId && <FeedbackDetailDialog feedbackId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
