"use client";

import { useAdmin } from "@/components/admin/admin-context";
import { PasswordForm } from "@/components/admin/password-form";

/** Change the own password (the first admin's comes from Vault, others get a one-time password). */
export default function AdminAccountPage() {
  const { username } = useAdmin();
  return (
    <div className="max-w-md">
      <h1 className="text-xl font-extrabold">Профил</h1>
      <p className="mt-1 text-sm text-muted">
        Влезли сте като <strong>{username}</strong>. Смяната на паролата излиза от профила ви в другите браузъри.
      </p>
      <div className="mt-6">
        <PasswordForm />
      </div>
    </div>
  );
}
