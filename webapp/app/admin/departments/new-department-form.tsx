"use client";

import { useActionState, useEffect, useRef } from "react";
import { createDepartmentAction, type ActionResult } from "./actions";
import DepartmentFormFields from "./department-form-fields";

const initialState: ActionResult = {};

export default function NewDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartmentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form action={formAction} ref={formRef}>
      {state.error && <div className="error-note">{state.error}</div>}
      <DepartmentFormFields />
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "Adding…" : "Add department"}
      </button>
    </form>
  );
}
