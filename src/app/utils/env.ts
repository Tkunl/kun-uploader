import { environment } from '../../environments/environment'

export const prodMode = 'production';
export const devMode = 'development';
export const testMode = 'test';

export function getEnv() {
  return environment.env
}

export function isDevMode() {
  return environment.env === devMode
}

export function isTestMode() {
  return environment.env === testMode
}

export function isProdMode() {
  return environment.env === prodMode
}
