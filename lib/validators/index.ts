/**
 * Zod validators for profile, callup, and court request bodies/queries.
 */
export {
  callupStatusSchema,
  courtSearchQuerySchema,
  courtTypeSchema,
  createCallupBodySchema,
  createCourtBodySchema,
  defaultSpotsForCourtType,
  paymentKeySchema,
  spotsQuantitySchema,
  updateCallupBodySchema,
  type CourtSearchQuery,
  type CreateCallupBody,
  type CreateCourtBody,
  type UpdateCallupBody,
} from "@/lib/validators/callup";
export {
  patchMeBodySchema,
  usernameBodySchema,
  type PatchMeBody,
  type UsernameBody,
} from "@/lib/validators/profile";
