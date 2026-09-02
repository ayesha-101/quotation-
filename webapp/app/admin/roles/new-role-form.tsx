"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRoleAction, type ActionResult } from "./actions";
import RoleFormFields from "./role-form-fields";

const initialState: ActionResult = {};

const BLANK = {
  name: "",
  isAdmin: false,
  canManageCatalog: false,
  canManageUsers: false,
  canCreateQuotations: false,
  isSalesman: false,
  canApproveGp: false,
  canInvoice: false,
  gpMin: null,
  gpMax: null,
};

export default function NewRoleForm() {
  const [state, formAction, pending] = useActionState(createRoleAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form action={formAction} ref={formRef}>
      {state.error && <div className="error-note">{state.error}</div>}
      {state.success && <div className="success-note">Role created.</div>}
      <RoleFormFields defaults={BLANK} />
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "Creating…" : "Create role"}
      </button>
    </form>
  );
}
