export interface DepartmentDefaults {
  name: string;
  code: string;
  quotePrefix: string;
  isActive: boolean;
}

export default function DepartmentFormFields({ defaults }: { defaults?: DepartmentDefaults }) {
  return (
    <div className="form-grid-3" style={{ marginBottom: 14 }}>
      <div className="field">
        <label>Name</label>
        <input name="name" defaultValue={defaults?.name} placeholder="e.g. Mechanical" required />
      </div>
      <div className="field">
        <label>Code</label>
        <input
          name="code"
          defaultValue={defaults?.code}
          placeholder="e.g. MEC"
          style={{ textTransform: "uppercase" }}
          required
        />
      </div>
      <div className="field">
        <label>Quote number prefix</label>
        <input
          name="quotePrefix"
          defaultValue={defaults?.quotePrefix}
          placeholder="e.g. BMTC-MEC"
          className="mono"
          style={{ textTransform: "uppercase" }}
          required
        />
      </div>
      {defaults && (
        <div className="field" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
          <input
            id={`isActive-${defaults.code}`}
            name="isActive"
            type="checkbox"
            defaultChecked={defaults.isActive}
            style={{ width: "auto" }}
          />
          <label htmlFor={`isActive-${defaults.code}`} style={{ margin: 0, textTransform: "none", fontSize: 13 }}>
            Active
          </label>
        </div>
      )}
    </div>
  );
}
