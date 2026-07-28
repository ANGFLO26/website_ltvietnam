# Implementation planning

The active implementation-planning structure is:

```text
planning/implementation/
├── README.md
├── v1.0/
├── history/
└── reviews/
    └── gb-02/
        ├── CODEX_GB02C_FINAL_GATE_B_REPORT.md
        └── CLAUDE_FINAL_GATE_B_REVIEW.md
```

- `v1.0/` is the only active implementation plan.
- Prior v0.1–v0.4.1 candidates are not in the active tree. They remain recoverable from Git history and the annotated tag `planning-history-v0.1-v0.4.1`.
- `history/` contains manifests, verification scripts, and tag-governance records.
- Only the final Gate B review records remain active.
- New reviews must be organized by implementation phase or task, not by creating another implementation-plan version.

`reviews/v1.0-assembly/` is retained as non-active supporting material because protected v1.0 plan documents link directly to its assembly reports. It requires a separate protected-reference review before it can be removed.
