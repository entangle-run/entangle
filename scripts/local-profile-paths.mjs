export const localProfileComposeFile = "deploy/local/compose/docker-compose.local.yml";

export const requiredLocalProfilePaths = [
  localProfileComposeFile,
  "deploy/local/config/nginx.studio.conf",
  "deploy/local/config/strfry.local.conf",
  "deploy/local/docker/host.Dockerfile",
  "deploy/local/docker/runner.Dockerfile",
  "deploy/local/docker/studio.Dockerfile",
  "package.json",
  "pnpm-lock.yaml"
];
