import { pinyin } from 'pinyin-pro';
import error from "../error.js";
import validation from "../validation.js";
import config from '../config.js';
import { checkTimeFormat, toMicroseconds } from '../utils.js';
import SegmentApi from '../api/SegmentApi.js';

/**
 * type 0:未解析，1:B站视频，2:解析中，3:本地源, 4:直播中
 */
export default class ClipService {

    /**
     * @param {authorId} 作者id 
     * @param {uid} 作者B站id，可选，如果不输入authorId，则必须输入uid
     * @param {title} 作品标题
     * @param {bv} B站视频号，长度为12字符,可选
     * @param {p} B站视频page号，用于多p场景，可选，如果不填该字段则默认普通无分p视频
     * @param {datetime} 时间日期字符串，格式为YYYY-MM-DD HH:MM:SS
     * @param {cover} 视频封面
     * @param {type} 视频类型，1是B站视频, 若参数包含bv，则该值自动为1，否则自动为2，所以无需输入
     * @param {playUrl} 视频播放源地址，type=0时，该值未定义，type=1，由bv号确定，type=2时，由自己输入确定，type=3自动生成，type=4自动生成
     * @param {redirectUrl} 视频跳转源地址，type=0时，该值未定义，type=1，由bv号确定，type=2时，由自己输入确定，type=3或者4，该值为空
     */
    insert = async (ctx) => {
        const entity = ctx.request.body;
        let clip = {};
        let author = {};
        // 检查参数合法性
        if (entity.uid) {
            const uid = parseInt(entity.uid);
            author = ctx.authorDao.findByUid(uid);
            if (!author) {
                throw error.author.NotFound;
            }
            if (!ctx.userService.isAdmin(ctx.state.user)) {
                throw error.auth.Unauthorized;
            }
            clip.authorId = author.id;
        } else {
            const authorId = entity.authorId;
            author = ctx.authorDao.findById(authorId);
            if (!author) {
                throw error.author.NotFound;
            }
            if (!ctx.userService.isAdmin(ctx.state.user)) {
                throw error.auth.Unauthorized;
            }
            clip.authorId = authorId;
        }

        const title = entity.title || '';
        if (title.length < validation.clip.title.lowerLimit) {
            throw error.clip.title.LengthTooShort;
        }
        if (title.length > validation.clip.title.upperLimit) {
            throw error.clip.title.LengthTooLong;
        }
        // 过滤掉无法处理的符号
        clip.title = title.replaceAll('*', '');

        // TODO 增加datetime格式校验
        const datetime = entity.datetime || '';
        if (datetime.length !== validation.clip.datetime.limit) {
            return error.clip.datetime.IllegalFormat;
        }
        clip.datetime = datetime;

        clip.type = 0; // 默认类型未定义
        // 如果输入的是bv号，则默认源为B站源，否则认定是外部源
        const bv = entity.bv;
        if (bv) {
            const p = entity.p;
            if (p) {
                // 如果存在分p，则将分p填入到playUrl和redirectUrl中
                clip.playUrl = `player.bilibili.com/player.html?bvid=${bv}&p=${p}`;
                clip.redirectUrl = `www.bilibili.com/video/${bv}?p=${p}`;
            } else {
                // 不存在分p就按照普通bv视频模式来
                clip.playUrl = `player.bilibili.com/player.html?bvid=${bv}`;
                clip.redirectUrl = `www.bilibili.com/video/${bv}`;
            }
            clip.type = 1;
        } else {
            if (entity.type === 2 || entity.type === 3) {
                clip.type = entity.type;
                clip.playUrl = `${config.zimu.local.url}/${author.name}/${title}.flv`;
                clip.redirectUrl = '';
            } else if (entity.type === 4) {
                // TODO
                clip.type = entity.type;
                clip.playUrl = `${config.zimu.live.url}/${author.name}/${title}.flv`;
                clip.redirectUrl = '';
            } else {
                clip.type = 0; // 未知来源
                clip.playUrl = '';
                clip.redirectUrl = '';
            }
        }

        clip.cover = entity.cover || '';

        const r = ctx.clipDao.insert(clip);
        const id = r.lastInsertRowid;

        clip = ctx.clipDao.findById(id);
        ctx.logger.info(`新增clip:${clip}`);
        return clip;
    }

    /**
     * @param {id} 作品id
     * @param {authorId} 作者id 
     * @param {title} 作品标题
     * @param {bv} B站视频号，长度为12字符，若传入该字段，则clip.type将默认改为1
     * @param {p} B站视频page号，用于多p场景
     * @param {datetime} 时间日期字符串，格式为YYYY-MM-DD HH:MM:SS
     * @param {cover} 视频封面
     * @param {playUrl} 视频播放源地址
     * @param {redirectUrl} 视频跳转源地址
     */
    update = async (ctx) => {
        const id = parseInt(ctx.params.id);
        const entity = ctx.request.body;
        // 检查参数合法性
        let clip = ctx.clipDao.findById(id);
        if (!clip) {
            throw error.clip.NotFound;
        }
        let author = ctx.authorDao.findById(clip.authorId);
        if (!ctx.userService.isAdmin(ctx.state.user)) {
            throw error.auth.Unauthorized;
        }

        if (entity.hasOwnProperty('authorId')) {
            const authorId = entity.authorId || 0;
            author = ctx.authorDao.findById(authorId);
            if (!author) {
                throw error.author.NotFound;
            }
            clip.authorId = authorId;
        }

        if (entity.hasOwnProperty('title')) {
            const title = entity.title || '';
            if (title.length < validation.clip.title.lowerLimit) {
                throw error.clip.title.LengthTooShort;
            }
            if (title.length > validation.clip.title.upperLimit) {
                throw error.clip.title.LengthTooLong;
            }
            clip.title = entity.title;
        }

        if (entity.hasOwnProperty('datetime')) {
            // TODO 增加datetime格式校验
            const datetime = entity.datetime || '';
            if (datetime.length !== validation.clip.datetime.limit) {
                throw error.clip.datetime.IllegalFormat;
            }
            clip.datetime = datetime;
        }
        if (entity.hasOwnProperty('cover')) {
            clip.cover = entity.cover || '';
        }

        if (entity.hasOwnProperty('type')) {
            clip.type = entity.type;
            if (clip.type === 2 || clip.type === 3) {
                clip.playUrl = `${config.zimu.local.url}/${author.organizationId}/${author.name}/${clip.title}.flv`;
                clip.redirectUrl = '';
            } else if (clip.type === 4) {
                clip.playUrl = `${config.zimu.live.url}/${author.organizationId}/${author.name}/${clip.title}.flv`;
                clip.redirectUrl = '';
            }
        }

        if (entity.hasOwnProperty('bv')) {
            const bv = entity.bv || '';
            const matched = /www.bilibili.com\/video\/.*\?p=([0-9]+)/.exec(clip.redirectUrl);
            console.log(matched);
            if (matched) {
                // 有分p
                clip.playUrl = `player.bilibili.com/player.html?bvid=${bv}&p=${matched[1]}`;
                clip.redirectUrl = `www.bilibili.com/video/${bv}?p=${matched[1]}`;
            } else {
                // 没有分p
                clip.playUrl = `player.bilibili.com/player.html?bvid=${bv}`;
                clip.redirectUrl = `www.bilibili.com/video/${bv}`;
            }
            clip.type = 1;
        } else {
            if (entity.hasOwnProperty('playUrl')) {
                clip.playUrl = entity.playUrl || '';
            }
    
            if (entity.hasOwnProperty('redirectUrl')) {
                clip.redirectUrl = entity.redirectUrl || '';
            }
        }

        if (entity.hasOwnProperty('p')) {
            const matched = /www.bilibili.com\/video\/([0-9a-zA-Z]+)/.exec(clip.redirectUrl);
            const p = entity.p;
            if (p) {
                const bv = matched[1];
                // 有分p
                clip.playUrl        = `player.bilibili.com/player.html?bvid=${bv}&p=${p}`;
                clip.redirectUrl    = `www.bilibili.com/video/${bv}?p=${p}`;
            } else {
                // 传空值意味着取消分p
                clip.playUrl        = `player.bilibili.com/player.html?bvid=${bv}`;
                clip.redirectUrl    = `www.bilibili.com/video/${bv}`;
            }
        }

        ctx.clipDao.update(clip);

        clip = ctx.clipDao.findById(id);
        ctx.logger.info(`更新clip:${clip}`);
        return clip;
    }

    deleteById = async (ctx) => {
        const id = parseInt(ctx.params.id);
        const author = ctx.authorDao.findById(id);
        if (!ctx.userService.isAdmin(ctx.state.user)) {
            throw error.auth.Unauthorized;
        }
        ctx.clipDao.deleteById(id);
        ctx.logger.info(`删除clip:${id}`);
        ctx.subtitleDao.deleteByClipId(id);
        ctx.logger.info(`删除subtitles:${id}`);
    }

    deleteByBv = async (ctx) => {
        const bv = ctx.request.query.bv;
        const clips = ctx.clipDao.findByBv(bv);
        for (let i = 0; i < clips.length; ++i) {
            const clip = clips[i];
            ctx.clipDao.deleteById(clip.id);
            ctx.logger.info(`删除clip:${clip.id},${clip.title},${clip.playUrl}`);
            ctx.subtitleDao.deleteByClipId(clip.id);
            ctx.logger.info(`删除subtitles:${clip.id}`);
        }
    }

    findByOrganizationId = (ctx) => {
        if (ctx.request.query.keyword) {
            return this.__findByOrganizationIdAndKeyword(ctx).map(clip => this.__parseUrl(clip));
        } else {
            const organizationId = parseInt(ctx.params.organizationId);
            return ctx.clipDao.findByOrganizationId(organizationId).map(clip => this.__parseUrl(clip));
        }
    }

    findById = (ctx) => {
        return this.__parseUrl(ctx.clipDao.findById(ctx.params.id));
    }

    findByType = (ctx) => {
        return ctx.clipDao.findByType(ctx.request.query.type);
    }

    findByBv = (ctx) => {
        return ctx.clipDao.findByBv(ctx.request.query.bv);
    }

    findByAuthorId = (ctx) => {
        const authorId = parseInt(ctx.params.authorId);
        const type = parseInt(ctx.request.query.type || '4');
        const page = parseInt(ctx.request.query.page || '1');
        const size = parseInt(ctx.request.query.size || '10');
        return ctx.clipDao.findByAuthorId(authorId, type, page, size).map(clip => this.__parseUrl(clip));
    }

    __findByOrganizationIdAndKeyword = (ctx) => {
        const organizationId = parseInt(ctx.params.organizationId);
        const keyword = ctx.request.query.keyword || '';

        // 去掉特殊字符
        let keywordPattern = keyword.replace(/[%_\<\>;\(\)\?\/\s]/g, '');
        if (keywordPattern.length < validation.clip.content.lowerLimit) {
            throw error.clip.content.LengthTooShort;
        }
        if (keywordPattern.length > validation.clip.content.upperLimit) {
            throw error.clip.content.LengthTooLong;
        }
        let pinyinKeywordPattern = pinyin(keywordPattern, {toneType:'num'});

        const authorIds = ctx.authorDao.findByOrganizationId(organizationId).map(author => author.id);

        const clipIds = new Set();
        const r = [];
        if (keyword.indexOf('*') !== -1 || keyword.indexOf('+') !== -1) {
            // 处理通配符
            keywordPattern = keywordPattern.replaceAll('*', '.*');
            pinyinKeywordPattern = pinyinKeywordPattern.replaceAll('*', '\\b.*\\b');
        
            keywordPattern = keywordPattern.replaceAll('+', '\\S?');
            pinyinKeywordPattern = pinyinKeywordPattern.replaceAll('+', '\\b\\S*\\b');
            pinyinKeywordPattern = `\\b${pinyinKeywordPattern}\\b`;

            const r1 = ctx.clipDao.findByAuthorIdsAndKeywordWithRegexp(authorIds, keywordPattern, pinyinKeywordPattern);
            r1.forEach(item => {
                clipIds.add(item.id);
                item.matchMode  = 1;
                r.push(item);
            });
        } else {
            const r1 = ctx.clipDao.findByAuthorIdsAndKeyword(authorIds, keywordPattern, pinyinKeywordPattern);
            r1.forEach(item => {
                clipIds.add(item.id);
                item.matchMode  = 1;
                r.push(item);
            });
        }

        r.sort((a, b) => {
            return b.datetime.localeCompare(a.datetime);
        });
        return r;
    }

    __parseUrl = (clip) => {
        if (clip.type === 3) {
            clip.playUrl = `${config.zimu.local.url}/${clip.author.name}/${clip.title}.flv`;
            clip.redirectUrl = '';
        } else if (clip.type === 4 || clip.type === 5) {
            clip.playUrl = `${config.zimu.live.url}/${clip.author.name}/${clip.title}.flv`;
            clip.redirectUrl = '';
        }
        return clip;
    }

    segment = async (ctx) => {
        const clipId = parseInt(ctx.params.clipId);
        const segmentName = ctx.request.query.segmentName;
        const audio = ctx.request.query.audio;
        const danmaku = ctx.request.query.danmaku;
        const forward = ctx.request.query.forward;
        const startTime = ctx.request.query.startTime;
        const endTime   = ctx.request.query.endTime;
        if (!checkTimeFormat(startTime)) {
            throw error.clip.startTime.IllegalFormat;
        }
        if (!checkTimeFormat(endTime)) {
            throw error.clip.endTime.IllegalFormat;
        }
                
        const st = toMicroseconds(startTime);
        const et = toMicroseconds(endTime);
        
        if (danmaku === 'true') {
            if (et - st > validation.segment.danmaku.interval.upperLimit) {
                throw error.segment.danmaku.IntervalTooLong;
            } 
            if (et - st < validation.segment.danmaku.interval.lowerLimit) {
                throw error.segment.danmaku.IntervalTooShort;
            }
        } else {
            if (et - st > validation.segment.normal.interval.upperLimit) {
                throw error.segment.normal.IntervalTooLong;
            } 
            if (et - st < validation.segment.normal.interval.lowerLimit) {
                throw error.segment.normal.IntervalTooShort;
            }
        }
        
        const r = await SegmentApi.segment(clipId, startTime, endTime, segmentName, audio, danmaku, forward);
        ctx.logger.info(r);
        return r;
    }
}