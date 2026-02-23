import { nhost } from "@/lib/nhost";

interface GraphQLErrorPayload {
  message?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLErrorPayload[];
}

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const graphqlUrl = nhost.graphql.getUrl();
  if (!graphqlUrl) {
    throw new Error("Nhost GraphQL URL is not available.");
  }

  const accessToken = await nhost.auth.getAccessToken();

  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache: "no-store",
  });

  let body: GraphQLResponse<T> | null = null;

  try {
    body = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new Error(`GraphQL request failed (${response.status}) and returned invalid JSON.`);
  }

  if (!response.ok) {
    const graphQlMessage =
      body?.errors?.map((item) => item.message).filter(Boolean).join("; ") ||
      "Unknown GraphQL error.";
    throw new Error(`GraphQL HTTP ${response.status}: ${graphQlMessage}`);
  }

  if (body.errors?.length) {
    const graphQlMessage = body.errors
      .map((item) => item.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(graphQlMessage || "GraphQL request failed.");
  }

  if (!body.data) {
    throw new Error("GraphQL request succeeded but returned no data.");
  }

  return body.data;
}
