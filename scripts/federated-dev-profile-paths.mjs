export const federatedDevProfileComposeFile = "deploy/federated-dev/compose/docker-compose.federated-dev.yml";

export const requiredFederatedDevProfilePaths = [
  federatedDevProfileComposeFile,
  "deploy/federated-dev/config/nginx.studio.conf",
  "deploy/federated-dev/config/strfry.federated-dev.conf",
  "deploy/federated-dev/docker/host.Dockerfile",
  "deploy/federated-dev/docker/runner.Dockerfile",
  "deploy/federated-dev/docker/studio.Dockerfile",
  "package.json",
  "pnpm-lock.yaml"
];
