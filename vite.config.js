import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load environment variables from .env and .env.local
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'api-serverless-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/gist')) {
              try {
                // Collect and parse request body for POST requests
                if (req.method === 'POST') {
                  const chunks = []
                  for await (const chunk of req) chunks.push(chunk)
                  const raw = Buffer.concat(chunks).toString()
                  try {
                    req.body = JSON.parse(raw)
                  } catch {
                    req.body = raw
                  }
                }

                // Polyfill Express/Vercel response helpers for Vite's connect server
                res.status = (code) => {
                  res.statusCode = code
                  return res
                }
                res.json = (data) => {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(data))
                  return res
                }

                const { default: handler } = await import('./api/gist.js')
                await handler(req, res)
              } catch (err) {
                console.error('[local-api-error]', err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message }))
              }
              return
            }
            next()
          })
        }
      }
    ],
  }
})
