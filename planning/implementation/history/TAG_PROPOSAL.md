# Gate B Tag Proposal

GB-02A records governance proposals only. It creates and pushes no tag.

## Proposed tags

### 1. `docs-v1.2.1-approved`

- Proposed target: `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`
- Reason: this commit introduces the Approved `doc/` snapshot, which is unchanged through the reviewed baseline.
- Governance status: this tag is explicitly required by implementation plan v1.0.

### 2. `planning-history-v0.1-v0.4.1`

- Proposed target: `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`
- Reason: retained Git reference for all pre-v1.0 planning candidates.
- Governance status: this tag closes the plan-history retained-reference requirement.

### 3. `implementation-plan-v1.0-approved`

- Proposed target: `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0`
- Reason: this is the active cleaned baseline containing approved v1.0.
- Governance status: this name is a deliberate project governance choice, not an originally mandated tag name.

## Authorization and verification

All three proposals require explicit user or maintainer authorization before local creation or remote push.

GB-02B must verify both local and remote tag state, including exact targets:

```text
git tag --list
git rev-parse -q --verify refs/tags/<tag>
git ls-remote --tags origin
```

No tag is created by GB-02A.
