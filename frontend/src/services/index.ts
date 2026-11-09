import { mockApi } from "./mockApi";
import { realApi } from "./api";
// The real backend is the product path. A local mock is retained only for an
// explicitly requested, visibly labelled UI demonstration.
const useMockApi = import.meta.env.VITE_USE_MOCK_API === "true";
const service = useMockApi ? mockApi : realApi;
export const registerArtifact = service.registerArtifact.bind(service);
export const verifyArtifact = service.verifyArtifact.bind(service);
export const getArtifact = service.getArtifact.bind(service);
export const getProvenance = service.getProvenance.bind(service);
export const getRecentArtifacts =
  "getRecentArtifacts" in service
    ? realApi.getRecentArtifacts.bind(realApi)
    : async () => [];
export const isDemoMode = useMockApi;
