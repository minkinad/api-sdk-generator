# Publishing to npm

## Secret setup

1. Create an npm automation token with publish access.
2. If you publish a scoped package, create the matching npm organization or use a scope that belongs to your npm user account.
3. In GitHub, open `Settings -> Secrets and variables -> Actions`.
4. Add a repository secret named `NPM_TOKEN`.

## Provenance

The package manifests use `publishConfig.provenance: true`, and the release workflow grants `id-token: write`, which enables npm provenance attestations.

## Manual verification

After publishing, verify:

```bash
npm view api-sdk-generator version
npm view @minkinpackages/api-sdk-generator-core version
```
