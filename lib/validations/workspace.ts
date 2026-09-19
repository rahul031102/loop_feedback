import { z } from "zod";
import { Role } from "@prisma/client";

// C2 user story asks for "invite teammates and assign roles." Section 4.2
// excludes email/SMS delivery infrastructure, so there is no inbox to send
// an invite link to. This is the direct-provisioning equivalent: an admin
// creates the teammate's account (and a temporary password they hand off
// out of band), which is functionally the same capability without email
// infrastructure. See the Assumptions section in the project plan.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

export const addMemberSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: passwordSchema,
  role: z.nativeEnum(Role, { errorMap: () => ({ message: "Select a role" }) }),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role, { errorMap: () => ({ message: "Select a role" }) }),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
