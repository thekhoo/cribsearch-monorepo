# 6. CI/CD via GitHub Actions (Vercel for UI, SAM + OIDC for API)

- Status: Accepted
- Date: 2026-06-25

## Context

The web app and the API deploy to different targets (Vercel and AWS) and need
an automated path to production from `main`. We also already run a set of
reusable composite actions in `thekhoo/github-actions-shared` and a shared
artefact bucket (`aws-management-codepipeline`) used by other projects in the
same AWS account (`020844256789`, `eu-west-2`).

## Decision

Deploy from GitHub Actions on push to `main`:

- **UI → Vercel** via a vendored composite action
  (`.github/actions/vercel-deploy-ui`), production deploy only.
- **API → AWS** via the shared `sam-build-and-package` and `sam-deploy` actions.
  AWS access uses **OIDC role-chaining**: the GitHub OIDC token assumes
  `github-actions-oidc-entry-role`, which chains into a per-repo deployment role
  `github-actions-thekhoo-cribsearch-monorepo-deployment` (scoped to
  `production-cribsearch-*` resources). No long-lived AWS keys are stored in
  GitHub.
- **Artefacts** are packaged to the shared `aws-management-codepipeline` bucket
  under `production/sam/<sha>/`.
- The SAM template is **parameterised by `Environment`** (`development` |
  `staging` | `production`); only `production` is wired today (stack
  `production-cribsearch`). `NODE_ENV` stays `production` regardless — it is a
  Node runtime flag, orthogonal to the deploy stage.
- `ci.yml` runs verification on **PRs / merge queue only**; `deploy.yml` runs
  its own `verify` job on `main` and gates `deploy-ui` / `deploy-api` behind it,
  each path-filtered so only the changed app deploys.

## Consequences

- Deploys require AWS prerequisites that live outside this repo: the deployment
  role, the SSM Supabase params (`/production/cribsearch/service/supabase/*`),
  and the GitHub `production` environment secrets (`VERCEL_*`). These are
  documented in the README.
- Reusing the org's shared actions and artefact bucket couples this repo's
  pipeline to conventions in `thekhoo/github-actions-shared` (e.g. the
  `<environment>/sam/<sha>/` S3 layout and the OIDC entry-role ARN).

## Revisit if

- We wire `development`/`staging` universes (more stacks, more secrets), or
- the API moves off SAM, or we adopt an AWS-native pipeline (CodePipeline)
  instead of GitHub Actions.
