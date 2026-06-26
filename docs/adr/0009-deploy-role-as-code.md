# 9. Deployment role as code, deployed first (pipeline stack)

- Status: Accepted
- Date: 2026-06-26

## Context

The GitHub Actions deployment role
(`github-actions-thekhoo-cribsearch-monorepo-deployment`) was originally created by
hand — it had no version-controlled definition, so its permissions (and drift)
weren't reviewable or reproducible. We want it captured as Infrastructure-as-Code
and deployed automatically.

There is a bootstrap problem: that role is the very identity CI uses to deploy, so
it cannot deploy the stack that defines itself on first creation. The account
already provides a shared bootstrap role, `github-actions-create-deployment-role`
(managed in the `aws-management` repo), which is allowed to manage `github-actions-*`
roles and any CloudFormation stack, and is assumable via the shared
`github-actions-oidc-entry-role`.

## Decision

Introduce an `infrastructure/` directory with two stacks:

- **`infrastructure/pipeline/template.yaml`** (plain CloudFormation) — defines the
  deployment IAM role and its inline policy. Deployed to the `cribsearch-pipeline`
  stack with `CAPABILITY_NAMED_IAM` (the role keeps a fixed name so its ARN is
  stable and referenced unchanged elsewhere).
- **`infrastructure/stack/template.yaml`** (SAM) — the application stack, moved from
  `apps/api/template.yaml`. Both functions set `CodeUri: ../../apps/api` so the
  makefile build still resolves the source and `node_modules` in `apps/api`.

A new **`deploy-pipeline`** job runs first and authenticates GitHub OIDC →
`github-actions-oidc-entry-role` → `github-actions-create-deployment-role`, then
`cloudformation deploy`s the pipeline stack. `migrate` and `deploy-api` depend on it
and assume the deployment role it manages.

The role's policy reproduces the previous manual policy **plus `kms:Decrypt`** (scoped
via `kms:ViaService = ssm.<region>.amazonaws.com`) — the manual role lacked it, which
would have failed `ssm get-parameter --with-decryption` on the SecureString DB
passwords in the migrate job.

Because a role of that name already existed (manual), we **delete it once** and let
the first `deploy-pipeline` run recreate it from the template (same name/ARN).

## Consequences

- The deployment role is now reproducible, reviewable IaC; permission changes go
  through a PR and the `deploy-pipeline` job.
- **Two-hop auth** in custom jobs: `deploy-pipeline` and `migrate` call
  `configure-aws-credentials` twice — first the OIDC entry role (web identity), then
  the target role via `role-chaining: true`. (The shared SAM actions do this
  internally for `deploy-api`.) The earlier single-hop attempt was wrong: the
  deployment role only trusts the entry role, not GitHub's OIDC provider directly.
- The bootstrap chain depends on two externally-owned roles
  (`github-actions-oidc-entry-role`, `github-actions-create-deployment-role`) from
  the `aws-management` repo.
- The SAM template move requires the `CodeUri: ../../apps/api` indirection and
  updated `template-file` paths in the workflow and `sam:build` script.

## Revisit if

- We add per-universe deployment roles (development/staging) — the pipeline stack
  would be parameterised by `Environment` and the resource scopes widened, or
- the org changes the shared bootstrap / OIDC entry-role convention.
