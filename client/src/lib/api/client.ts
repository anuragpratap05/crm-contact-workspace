import axios from 'axios'
import { apiErrorFromFailure, apiErrorFromResponse } from './errors'

const DEFAULT_BASE_URL = 'http://localhost:4000/api'
const REQUEST_TIMEOUT_MS = 65_000

const configured = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiBaseUrl = configured && configured.length > 0 ? configured : DEFAULT_BASE_URL

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    if (!axios.isAxiosError(error)) {
      const message = error instanceof Error ? error.message : 'Unexpected request failure'
      return Promise.reject(apiErrorFromFailure('malformed', message))
    }

    if (error.response) {
      return Promise.reject(apiErrorFromResponse(error.response.status, error.response.data))
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return Promise.reject(
        apiErrorFromFailure('timeout', 'The API did not respond before the request timed out.'),
      )
    }

    return Promise.reject(apiErrorFromFailure('network', 'The API could not be reached.'))
  },
)
