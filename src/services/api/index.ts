import { BaseApiClient } from './core';
import { KnowledgeApi } from './knowledge';
import { SearchApi } from './search';
import { DocumentsApi } from './documents';
import { AuthApi } from './auth';
import { ReviewApi } from './review';
import { AiApi } from './ai';
import { CollaborationApi } from './collaboration';
import { LearningApi } from './learning';

const modules = [
  KnowledgeApi,
  SearchApi,
  DocumentsApi,
  AuthApi,
  ReviewApi,
  AiApi,
  CollaborationApi,
  LearningApi,
];

type ApiModuleConstructor = new (...args: never[]) => BaseApiClient;

function applyApiModules(target: ApiModuleConstructor, sources: ApiModuleConstructor[]): void {
  for (const source of sources) {
    for (const name of Object.getOwnPropertyNames(source.prototype)) {
      if (name === 'constructor') continue;
      Object.defineProperty(
        target.prototype,
        name,
        Object.getOwnPropertyDescriptor(source.prototype, name) as PropertyDescriptor,
      );
    }
  }
}

class MedicalResearchAPIBase extends BaseApiClient {}
type MedicalResearchAPI = BaseApiClient &
  KnowledgeApi &
  SearchApi &
  DocumentsApi &
  AuthApi &
  ReviewApi &
  AiApi &
  CollaborationApi &
  LearningApi;

applyApiModules(MedicalResearchAPIBase, modules);

export const api = new MedicalResearchAPIBase() as MedicalResearchAPI;
export default api;
