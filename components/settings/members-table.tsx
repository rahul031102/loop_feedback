"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDate, initials } from "@/lib/utils";
import { Role } from "@prisma/client";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | Date;
}

export function MembersTable({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, role: Role) {
    setError(null);
    setPendingId(memberId);
    try {
      const response = await fetch(`/api/workspace/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Couldn't update that member's role.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from this workspace? This can't be undone.`)) return;
    setError(null);
    setPendingId(memberId);
    try {
      const response = await fetch(`/api/workspace/members/${memberId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Couldn't remove that member.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {error && (
        <p
          className="border-b border-border bg-negative-bg px-5 py-2.5 text-sm text-negative"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-fg-3">
              <th className="px-5 py-3 font-medium">Member</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => {
              const isSelf = member.id === currentUserId;
              const rowBusy = isPending && pendingId === member.id;
              return (
                <tr key={member.id} className="align-middle">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-base-3 text-xs font-semibold text-fg-2">
                        {initials(member.name)}
                      </div>
                      <div>
                        <p className="font-medium text-fg">
                          {member.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs font-normal text-fg-3">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-fg-3">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {isSelf ? (
                      <span className="text-fg-2">{ROLE_LABELS[member.role]}</span>
                    ) : (
                      <Select
                        value={member.role}
                        disabled={rowBusy}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                        className="h-8 w-36 text-xs"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-fg-3">{formatDate(member.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {!isSelf && (
                      <button
                        onClick={() => handleRemove(member.id, member.name)}
                        disabled={rowBusy}
                        className="rounded-md p-1.5 text-fg-3 hover:bg-negative-bg hover:text-negative disabled:opacity-50"
                        aria-label={`Remove ${member.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
