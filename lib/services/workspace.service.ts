import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import type { SignUpInput } from "@/lib/validations/auth";
import type { AddMemberInput, UpdateMemberRoleInput } from "@/lib/validations/workspace";
import { Role } from "@prisma/client";

const SALT_ROUNDS = 12;

/**
 * C1 AC1: "Sign-up creates a User and a Workspace; the creator becomes
 * ADMIN." Both rows are created in a single transaction - either both exist
 * or neither does, so a partial failure can never leave an orphaned
 * Workspace with no owner, or a User with no workspace to belong to.
 */
export async function signUpNewWorkspace(input: SignUpInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await hash(input.password, SALT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: input.workspaceName },
    });

    const user = await tx.user.create({
      data: {
        workspaceId: workspace.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    return { workspace, user };
  });
}

/**
 * C2: member list, scoped to the caller's workspace only. passwordHash is
 * never selected - it must never leave the server, let alone reach an API
 * response.
 */
export async function listMembers(workspaceId: string) {
  return prisma.user.findMany({
    where: { workspaceId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * C2: "As an admin, I can invite teammates and assign roles." Section 4.2
 * excludes email/SMS infrastructure, so this provisions the account
 * directly (see the Assumptions section) rather than sending an invite
 * link - the admin shares the temporary password out of band.
 */
export async function addMember(workspaceId: string, input: AddMemberInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await hash(input.password, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      workspaceId,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  input: UpdateMemberRoleInput,
  actingUserId: string
) {
  if (memberId === actingUserId) {
    throw new Error("You can't change your own role.");
  }

  const member = await prisma.user.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) {
    throw new Error("That member wasn't found in your workspace.");
  }

  if (member.role === Role.ADMIN && input.role !== Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { workspaceId, role: Role.ADMIN } });
    if (adminCount <= 1) {
      throw new Error("A workspace must always have at least one admin.");
    }
  }

  return prisma.user.update({
    where: { id: memberId },
    data: { role: input.role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function removeMember(workspaceId: string, memberId: string, actingUserId: string) {
  if (memberId === actingUserId) {
    throw new Error("You can't remove yourself from the workspace.");
  }

  const member = await prisma.user.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) {
    throw new Error("That member wasn't found in your workspace.");
  }

  if (member.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { workspaceId, role: Role.ADMIN } });
    if (adminCount <= 1) {
      throw new Error("A workspace must always have at least one admin.");
    }
  }

  await prisma.user.delete({ where: { id: memberId } });
}
