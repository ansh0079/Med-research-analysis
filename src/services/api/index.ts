import { KnowledgeApi } from './knowledge';
import { SearchApi } from './search';
import { DocumentsApi } from './documents';
import { AuthApi } from './auth';
import { ReviewApi } from './review';
import { AiApi } from './ai';
import { CollaborationApi } from './collaboration';
import { LearningApi } from './learning';

/**
 * Composite API client.
 *
 * Previously this was built by copying methods from module classes onto a single
 * prototype, which lost TypeScript type information and silently overwrote on
 * collisions. The composite now delegates to typed module instances.
 *
 * Usage: api.knowledge.getTopicOverview(...), api.search.search(...), etc.
 */
export class MedicalResearchAPI {
  knowledge = new KnowledgeApi();
  search = new SearchApi();
  documents = new DocumentsApi();
  auth = new AuthApi();
  review = new ReviewApi();
  ai = new AiApi();
  collaboration = new CollaborationApi();
  learning = new LearningApi();
}

export const api = new MedicalResearchAPI();
export default api;
