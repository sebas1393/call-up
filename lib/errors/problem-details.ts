import { randomUUID } from "node:crypto";

import type { ErrorCode } from "@/lib/constants/error-codes";

/**
 * RFC 7807 Problem Details payload for API responses and BE logging.
 * Never includes stack traces or internal exception details.
 */
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  traceId: string;
  code?: ErrorCode;
};

/** Inputs for {@link createProblemDetails}. */
export type CreateProblemDetailsInput = {
  /** HTTP status code (e.g. 400, 404, 409). */
  status: number;
  /** Short English title for logs (e.g. "Not Found"). */
  title: string;
  /** User-facing message in Spanish. */
  detail: string;
  /** Optional approved business/error code from spec. */
  code?: ErrorCode;
  /** Optional correlator; generated when omitted. */
  traceId?: string;
  /** Optional RFC 7807 type URI; defaults to about:blank. */
  type?: string;
};

const DEFAULT_TYPE = "about:blank";

/**
 * Builds an RFC 7807 Problem Details object for handled API failures.
 *
 * @param input - Status, title, Spanish detail, optional code/traceId
 * @returns Problem Details without stack traces (safe for clients and logs)
 */
export function createProblemDetails(
  input: CreateProblemDetailsInput,
): ProblemDetails {
  const problem: ProblemDetails = {
    type: input.type ?? DEFAULT_TYPE,
    title: input.title,
    status: input.status,
    detail: input.detail,
    traceId: input.traceId ?? randomUUID(),
  };

  if (input.code !== undefined) {
    problem.code = input.code;
  }

  return problem;
}
