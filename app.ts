import Koa from 'koa'
import Router from '@koa/router'
import cors from '@koa/cors'
import bodyparser from '@koa/bodyparser'
import path from 'path'
import url from 'url'
import fs from 'fs'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import dotenv from 'dotenv'
dotenv.config()

const hostname = process.env.HOSTNAME || 'localhost'
const port = process.env.PORT || 3000
const key = process.env.API_KEY || '114514'
const dataFileName = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'data.json')
if (!fs.existsSync(dataFileName)) {
    fs.writeFileSync(dataFileName, "[]")
}
let data: Leave[] = JSON.parse(fs.readFileSync(dataFileName, 'utf-8'))


dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Shanghai")

const app = new Koa()
const router = new Router()

app.use(cors())
app.use(bodyparser())
app.use(async (ctx, next) => {
    const auth = ctx.get('Authorization')
    const k = auth?.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!k || k !== key) {
        ctx.status = 400
        ctx.body = '400 Bad Request'
        return
    }
    return next()
})

router.get('/get', async (ctx) => {
    ctx.body = data
})
router.post('/add', async (ctx) => {
    const body = ctx.request.body as Leave
    if (typeof body.name !== 'string' || body.name.length > 20 ||
        typeof body.start !== 'string' || body.start.length > 10 ||
        typeof body.end !== 'string' || body.end.length > 10) {
        ctx.status = 400
        ctx.body = '数据格式错误'
        return
    }
    data = data.filter(item => item.name !== body.name)
    data.push({ name: body.name, start: body.start, end: body.end })
    checkExpiredAndSave()
    ctx.body = data
})
router.get('/remove', async (ctx) => {
    const name = ctx.query.name as string
    data = data.filter(item => item.name !== name)
    saveToFile()
    ctx.body = data
})
app.use(router.routes())

app.use(async (ctx) => {
    if (!ctx.body) { //若没有设置 ctx.body, 则说明没有到匹配任何路由
        ctx.status = 404
        ctx.body = '404 Not Found'
    }
})

app.listen(port, hostname, () => {
    console.log(`服务器已启动: http://${hostname}:${port}`)
})

function saveToFile() {
    fs.writeFileSync(dataFileName, JSON.stringify(data, null, 2))
}
// 过滤过期记录并保存
async function checkExpiredAndSave() {
    let now = dayjs()
    data = data.filter(item => now.isBefore(dayjs(item.end)))
    saveToFile()
}
setInterval(checkExpiredAndSave, 2000)
