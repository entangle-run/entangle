import { z } from "zod";
import { httpUrlSchema, identifierSchema, nonEmptyStringSchema } from "@entangle/types";

const giteaAuthenticatedUserSchema = z.object({
  login: identifierSchema
});

const giteaRepositorySchema = z.object({
  name: identifierSchema,
  owner: z
    .object({
      login: identifierSchema
    })
    .optional()
});

type GiteaRequestOptions = {
  body?: unknown;
  path: string;
};

function joinApiPath(baseUrl: string, pathName: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(pathName.replace(/^\//, ""), normalizedBase).toString();
}

export class GiteaApiHttpError extends Error {
  readonly responseBody: string | undefined;
  readonly statusCode: number;

  constructor(options: {
    message: string;
    responseBody?: string;
    statusCode: number;
  }) {
    super(options.message);
    this.name = "GiteaApiHttpError";
    this.responseBody = options.responseBody;
    this.statusCode = options.statusCode;
  }
}

export class GiteaApiClient {
  private readonly apiBaseUrl: string;
  private readonly token: string;

  constructor(input: {
    apiBaseUrl: string;
    token: string;
  }) {
    this.apiBaseUrl = httpUrlSchema.parse(input.apiBaseUrl);
    this.token = nonEmptyStringSchema.parse(input.token.trim());
  }

  async getAuthenticatedUserLogin(): Promise<string> {
    const response = await this.request({
      path: "/user"
    });
    const parsed = giteaAuthenticatedUserSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new Error(
        "Gitea /user response did not match the expected authenticated-user shape."
      );
    }

    return parsed.data.login;
  }

  async repositoryExists(input: {
    owner: string;
    repositoryName: string;
  }): Promise<boolean> {
    const response = await this.request({
      path: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(
        input.repositoryName
      )}`
    });

    if (response.status === 404) {
      return false;
    }

    const parsed = giteaRepositorySchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new Error(
        "Gitea repository lookup did not return the expected repository shape."
      );
    }

    return true;
  }

  async createCurrentUserRepository(input: {
    repositoryName: string;
  }): Promise<"created" | "conflict"> {
    const response = await this.request({
      body: {
        auto_init: false,
        name: identifierSchema.parse(input.repositoryName),
        private: true
      },
      path: "/user/repos"
    });

    if (response.status === 409) {
      return "conflict";
    }

    await this.expectRepositoryResponse(response);
    return "created";
  }

  async createOrganizationRepository(input: {
    organization: string;
    repositoryName: string;
  }): Promise<"created" | "conflict"> {
    const response = await this.request({
      body: {
        auto_init: false,
        name: identifierSchema.parse(input.repositoryName),
        private: true
      },
      path: `/orgs/${encodeURIComponent(input.organization)}/repos`
    });

    if (response.status === 409) {
      return "conflict";
    }

    await this.expectRepositoryResponse(response);
    return "created";
  }

  private async expectRepositoryResponse(response: Response): Promise<void> {
    const parsed = giteaRepositorySchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new Error(
        "Gitea repository creation did not return the expected repository shape."
      );
    }
  }

  private async request(input: GiteaRequestOptions): Promise<Response> {
    const requestInit: RequestInit = {
      headers: {
        Accept: "application/json",
        Authorization: `token ${this.token}`,
        ...(input.body ? { "Content-Type": "application/json" } : {})
      },
      method: input.body ? "POST" : "GET"
    };

    if (input.body) {
      requestInit.body = JSON.stringify(input.body);
    }

    const response = await fetch(
      joinApiPath(this.apiBaseUrl, input.path),
      requestInit
    );

    if ([200, 201, 404, 409].includes(response.status)) {
      return response;
    }

    const responseBody = (await response.text()).trim() || undefined;

    throw new GiteaApiHttpError({
      message:
        `Gitea API request to '${input.path}' failed with status ${response.status}.` +
        (responseBody ? ` Response body: ${responseBody}` : ""),
      ...(responseBody ? { responseBody } : {}),
      statusCode: response.status
    });
  }
}
