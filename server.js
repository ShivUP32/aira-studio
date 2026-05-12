import 'dotenv/config'
import express from 'express'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chatHandler = require('./api/chat.js')

const app = express()
app.use(express.json())

app.all('/api/chat', (req, res) => chatHandler(req, res))

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

const PORT = process.env.PORT || 3003
app.listen(PORT, () => console.log(`Aira Studio running at http://localhost:${PORT}`))
