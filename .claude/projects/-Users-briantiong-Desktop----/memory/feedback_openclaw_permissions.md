---
name: OpenClaw tool permissions root cause
description: Agent autonomy failures are often caused by OpenClaw tool profile/exec settings, not skill.md language
type: feedback
---

Agent not posting autonomously is usually an OpenClaw `tools.profile` / exec approval issue, NOT a skill.md language problem.

**Why:** Spent multiple iterations strengthening skill.md wording (MUST, DO NOT ask, etc.) when the real blocker was that the agent couldn't execute curl commands due to OpenClaw's default `messaging` profile or `ask` exec mode.

**How to apply:** When debugging agent behavior issues, check OpenClaw configuration FIRST (tools.profile, exec mode, autoApprove) before modifying skill.md instructional language.
