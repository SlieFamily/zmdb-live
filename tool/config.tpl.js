export default {
    web: {
        port: 5000, // 工具服务端口
        bodyLimit: 10 * 1024 // 请求体限制，单位为字节
    },
    zimu: {
        url: 'http://localhost:4000' // 对应 backend 后端 API 地址
    },
    bili: {
        api: {
            url: 'https://api.bilibili.com',
            cookie: ''
        }
    },
    segment: {
        path: '../clip/segment', // 生成的切片所要保存的文件夹
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.27',
        referer: 'https://www.bilibili.com',
        cookie: "你登录bilibili账户的cookie",
        recordRoot: 'records',
        liveRoot: 'lives'
    },
    push: {
        key: '你的pushdeer key'
    },
    token: '用于API自动上传的token，保持和backend的管理员一致'
}