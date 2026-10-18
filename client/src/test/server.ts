import { setupServer } from 'msw/node'

export const API = 'http://localhost:4000/api'

export const server = setupServer()
