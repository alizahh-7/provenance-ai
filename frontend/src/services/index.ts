import { mockApi } from './mockApi';
import { realApi } from './api';
const service = import.meta.env.VITE_USE_MOCK_API === 'false' ? realApi : mockApi;
export const registerArtifact = service.registerArtifact.bind(service);
export const verifyArtifact = service.verifyArtifact.bind(service);
export const getArtifact = service.getArtifact.bind(service);
export const getProvenance = service.getProvenance.bind(service);
export const isDemoMode = import.meta.env.VITE_USE_MOCK_API !== 'false';
