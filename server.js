import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import chatHandler from './api/chat.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json())

app.all('/api/chat', (req, res) => chatHandler(req, res))

app.use(express.static(path.join(__dirname, 'dist')))
app.get('/{*path}', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

const PORT = process.env.PORT || 3003
app.listen(PORT, () => console.log(`Aira Studio running at http://localhost:${PORT}`))
