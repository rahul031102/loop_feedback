import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Anthropic has no native embedding model - Voyage AI is Anthropic's own
 * documented recommendation for Claude apps (docs.claude.com/.../embeddings).
 * voyage-4 is used per Voyage's own quickstart examples; its default output
 * is 1024 dimensions, matching the Embedding.vector column in schema.prisma.
 */
const VOYAGE_MODEL = "voyage-4";
const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";

interface VoyageEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

/**
 * `input_type` matters: Voyage uses asymmetric embeddings, so a feedback
 * item ("document") and a user's question ("query") about it are embedded
 * slightly differently for better retrieval quality - not just a label.
 */
export async function embedText(text: string, inputType: "document" | "query"): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set. Copy .env.example to .env.local and add your key.");
  }

  const response = await fetch(VOYAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: [text],
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Voyage embeddings request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const json: VoyageEmbeddingResponse = await response.json();
  const embedding = json.data[0]?.embedding;
  if (!embedding) {
    throw new Error("Voyage returned no embedding.");
  }
  return embedding;
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * Upserts the embedding for a feedback item. Raw SQL because
 * `Unsupported("vector(1024)")` fields have no Prisma Client CRUD surface -
 * see the comment on the Embedding model in schema.prisma.
 */
export async function storeFeedbackEmbedding(feedbackId: string, vector: number[]): Promise<void> {
  const literal = toVectorLiteral(vector);
  await prisma.$executeRaw`
    INSERT INTO embeddings (id, "feedbackId", vector, "createdAt")
    VALUES (${randomUUID()}, ${feedbackId}, ${literal}::vector, NOW())
    ON CONFLICT ("feedbackId") DO UPDATE SET vector = ${literal}::vector
  `;
}

export interface SimilarFeedbackResult {
  id: string;
  distance: number;
}

/**
 * AI3 AC2: "The system retrieves the most relevant feedback (semantic
 * search) before answering." Cosine distance (`<=>`) via pgvector, lower is
 * more similar. The join to `feedback` and its `workspaceId` filter here
 * are what keep Ask LOOP's retrieval tenant-isolated - a workspace can only
 * ever surface its own feedback as grounding context, matching Section 06's
 * non-negotiable rule exactly as strictly as every other query in the app.
 */
export async function findSimilarFeedback(
  workspaceId: string,
  queryVector: number[],
  topK: number = 8
): Promise<SimilarFeedbackResult[]> {
  const literal = toVectorLiteral(queryVector);
  return prisma.$queryRaw<SimilarFeedbackResult[]>`
    SELECT f.id, (e.vector <=> ${literal}::vector) as distance
    FROM embeddings e
    JOIN feedback f ON f.id = e."feedbackId"
    WHERE f."workspaceId" = ${workspaceId}
    ORDER BY distance ASC
    LIMIT ${topK}
  `;
}

export async function countUnembedded(workspaceId: string): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count
    FROM feedback f
    LEFT JOIN embeddings e ON e."feedbackId" = f.id
    WHERE f."workspaceId" = ${workspaceId} AND e.id IS NULL
  `;
  return Number(result[0]?.count ?? 0);
}

export async function findUnembeddedFeedbackIds(
  workspaceId: string,
  limit: number
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT f.id
    FROM feedback f
    LEFT JOIN embeddings e ON e."feedbackId" = f.id
    WHERE f."workspaceId" = ${workspaceId} AND e.id IS NULL
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}
