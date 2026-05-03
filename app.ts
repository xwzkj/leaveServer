import Koa from 'koa'
import Router from '@koa/router'
import cors from '@koa/cors'
import bodyparser from '@koa/bodyparser'
import koaStatic from 'koa-static'

import path from 'path'
import url from 'url'
import fs from 'fs'

import dotenv from 'dotenv'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
dotenv.config()

const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000')
const key = process.env.API_KEY || '114514'
const classTotalStudents = parseInt(process.env.CLASS_TOTAL_STUDENTS || '0')
const dataFileName = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'data.json')
if (!fs.existsSync(dataFileName)) {
    fs.writeFileSync(dataFileName, "[]")
}
let data: Leave[] = JSON.parse(fs.readFileSync(dataFileName, 'utf-8'))


dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault("Asia/Shanghai")

const app = new Koa()
const router = new Router()

app.use(cors())
app.use(bodyparser())

// 给router设置鉴权中间件
router.use(async (ctx, next) => {
    const auth = ctx.get('Authorization')
    const k = auth?.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!k || k !== key) {
        ctx.status = 401
        ctx.body = { 'code': 401, 'msg': '鉴权失败' }
        return
    }
    return next()
})
router.get('/studentCount', async (ctx) => {
    ctx.body = { total: classTotalStudents, actual: classTotalStudents - data.length, leave: data.length }
})
router.get('/get', async (ctx) => {
    ctx.body = data
})
router.post('/add', async (ctx) => {
    const body = ctx.request.body as Leave
    console.log('add接口被调用：', body)
    if (typeof body.name !== 'string' || body.name.length > 20 ||
        typeof body.start !== 'string' || body.start.length > 10 ||
        typeof body.end !== 'string' || body.end.length > 10) {
        ctx.status = 400
        ctx.body = { 'code': 400, 'msg': '数据格式错误' }
        return
    }
    if (!dayjs(body.start, 'YYYY-MM-DD', true).isValid() || !dayjs(body.end, 'YYYY-MM-DD', true).isValid()) {
        ctx.status = 400
        ctx.body = { 'code': 400, 'msg': '日期格式错误，应为YYYY-MM-DD' }
        return
    }
    if (dayjs(body.start).isAfter(dayjs(body.end)) || dayjs(body.start).isSame(dayjs(body.end))) {
        ctx.status = 400
        ctx.body = { 'code': 400, 'msg': '开始日期不能大于等于结束日期' }
        return
    }
    if (dayjs().isAfter(dayjs(body.end)) || dayjs().isSame(dayjs(body.end))) {
        ctx.status = 400
        ctx.body = { 'code': 400, 'msg': '结束日期不能小于等于今日' }
        return
    }
    data = data.filter(item => item.name !== body.name)
    data.push({ name: body.name, start: body.start, end: body.end })
    checkExpiredAndSave()
    ctx.body = data
})
router.get('/remove', async (ctx) => {
    const name = ctx.query.name as string
    console.log('remove接口被调用：', name)
    data = data.filter(item => item.name !== name)
    saveToFile()
    ctx.body = data
})
app.use(router.routes())

// 托管前端界面
app.use(async (ctx, next) => {
    // 只对index.html鉴权
    if (ctx.path === '/') {
        if (ctx.query.key !== key) {
            ctx.status = 401
            ctx.body = { 'code': 401, 'msg': '鉴权失败' }
            return
        }
    }
    return next()
})
app.use(koaStatic(path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'frontend')))

app.use(async (ctx) => {
    if (!ctx.body) { //若没有设置 ctx.body, 则说明没有到匹配任何路由
        ctx.status = 404
        ctx.body = { 'code': 404, 'msg': '404 Not Found' }
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
setInterval(checkExpiredAndSave, 5 * 60 * 1000)
