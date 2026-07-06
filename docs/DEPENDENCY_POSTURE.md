# Dependency Posture

Short reference for dependency choices that look like duplication but are intentional or pending larger migrations.

## Jest and ts-jest

- **jest** `^30.x` and **ts-jest** `^29.4.x` are compatible. ts-jest 29.4 declares peer support for Jest 30.
- There is no separate `ts-jest@30` package line; stay on latest 29.4.x patch when upgrading.

## Joi and Zod

| Library | Used for |
| --- | --- |
| **Joi** | Express `validateBody` on routes, OpenAPI generation (`joi-to-swagger`) |
| **Zod** | `shared/contracts/*`, AI output validation, frontend type inference |

Removing either library requires migrating the other stack (routes + OpenAPI, or all shared contracts).

## `ws` override

`package.json` pins `"ws": "8.21.0"` under `overrides` so socket.io’s transitive `~8.20.x` dependency resolves to a single patched version.

## Not planned in a small PR

- Full Joi → Zod route validation migration
- Removing `ws` override without verifying socket.io compatibility on the next minor bump
