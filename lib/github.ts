export type GitHubFileRequest = {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
};

export type GitHubFileResponse = {
  name: string;
  path: string;
  sha: string;
  htmlUrl: string;
  downloadUrl: string | null;
  content: string;
};

function parseGitHubFileUrl(value: string): Partial<GitHubFileRequest> | null {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (url.hostname === "github.com" && segments.length >= 5 && segments[2] === "blob") {
    return {
      owner: segments[0],
      repo: segments[1],
      ref: decodeURIComponent(segments[3]),
      path: segments.slice(4).map(decodeURIComponent).join("/")
    };
  }

  if (url.hostname === "raw.githubusercontent.com" && segments.length >= 4) {
    return {
      owner: segments[0],
      repo: segments[1],
      ref: decodeURIComponent(segments[2]),
      path: segments.slice(3).map(decodeURIComponent).join("/")
    };
  }

  return null;
}

export function normalizeGitHubFileRequest({
  owner,
  repo,
  path,
  ref
}: GitHubFileRequest): GitHubFileRequest {
  const parsed = parseGitHubFileUrl(path) ?? parseGitHubFileUrl(owner);

  if (!parsed) {
    return { owner, repo, path, ref };
  }

  return {
    owner: parsed.owner ?? owner,
    repo: parsed.repo ?? repo,
    path: parsed.path ?? path,
    ref: ref?.trim() || parsed.ref
  };
}

export async function fetchGitHubFile({
  owner,
  repo,
  path,
  ref
}: GitHubFileRequest): Promise<GitHubFileResponse> {
  const normalized = normalizeGitHubFileRequest({ owner, repo, path, ref });
  const cleanOwner = normalized.owner.trim();
  const cleanRepo = normalized.repo.trim();
  const cleanPath = normalized.path.trim().replace(/^\/+/, "");

  if (!cleanOwner || !cleanRepo || !cleanPath) {
    throw new Error("GitHub owner, repo, and file path are required.");
  }

  const cleanRef = normalized.ref?.trim();
  const query = cleanRef ? `?ref=${encodeURIComponent(cleanRef)}` : "";
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(
      cleanRepo
    )}/contents/${cleanPath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}${query}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ai-code-review-agent"
      },
      next: { revalidate: 60 }
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub file fetch failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as {
    type: string;
    name: string;
    path: string;
    sha: string;
    html_url: string;
    download_url: string | null;
    content?: string;
    encoding?: string;
  };

  if (payload.type !== "file") {
    throw new Error("The requested GitHub path is not a file.");
  }

  if (payload.encoding !== "base64" || !payload.content) {
    throw new Error("GitHub returned a file format that could not be decoded.");
  }

  const content = Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");

  return {
    name: payload.name,
    path: payload.path,
    sha: payload.sha,
    htmlUrl: payload.html_url,
    downloadUrl: payload.download_url,
    content
  };
}
