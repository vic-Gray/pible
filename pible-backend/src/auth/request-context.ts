/**
 * RequestContext
 *
 * Both JwtAuthGuard and ApiKeyGuard resolve to this exact shape before the
 * request reaches any controller. Nothing downstream ever needs to know
 * which auth path was used — it always sees a projectId, actorType, and actorId.
 *
 * actorType === 'human'  → actorId is a User.id     (JWT path)
 * actorType === 'agent'  → actorId is an ApiKey.id  (API key path)
 */
export interface RequestContext {
  projectId: string;
  actorType: 'human' | 'agent';
  actorId: string; // userId or apiKeyId — never the raw key
}
