import { pinyin } from 'pinyin-pro';
import fs from 'fs';
import error from '../error.js'
import validation from '../validation.js';
import { mark, parse, fromMicroseconds } from '../utils.js';

export default class SubtitleService {

    /**
     * @param {clipId} 作品id
     * @param {content} 字幕srt内容 
     * @param {path}    字幕文件路径
     * @returns 
     */
    insert = async (ctx) => {
        const clipId = parseInt(ctx.params.clipId);
        let { content, path } = ctx.request.body || {};
        // 检查参数合法性
        const clip = ctx.clipDao.findById(clipId);
        if (!clip) {
            throw error.clip.NotFound;
        }

        const author = ctx.authorDao.findById(clip.authorId);
        if (!author) {
            throw error.author.NotFound;
        }

        if (!ctx.userService.isAdmin(ctx.state.user)) {
            throw error.auth.Unauthorized;
        }

        // 若传的是文件路径而不是内容，则从文件读取
        if (!content && path) {
            if (!fs.existsSync(path)) {
                throw new Error(`Subtitle file not found: ${path}`);
            }
            content = fs.readFileSync(path, 'utf8');
        }
        if (!content) {
            throw new Error('No subtitle content or path provided');
        }

        // \r\n全部转换为\n，换行符统一化
        content = content.replace('\r\n', '\n');
        // TODO 去掉符号
        content = content.replace(/<[^><]*>/g, '');
        if (content.length < validation.subtitle.content.lowerLimit) {
            throw error.subtitle.content.LengthTooShort;
        }

        const subtitles = parse(content) || [];
        if (subtitles.length === 0) {
            return error.subtitle.content.ParseError;
        }
        
        ctx.subtitleDao.deleteByClipId(clipId); // 首先删除历史字幕
        ctx.subtitleDao.insertByClipId(clipId, subtitles);
        ctx.logger.info(`新增字幕:${clipId}`);
    }

    update = (ctx) => {
        if (ctx.request.body.offset) {
            return this.__offset(ctx);
        }
    }

    __offset = (ctx) => {
        const clipId = parseInt(ctx.params.clipId);
        const offset = ctx.request.body.offset;
        if (offset !== 0) {
            const subtitles = ctx.subtitleDao.findByClipId(clipId);
            for (let i = 0; i < subtitles.length; ++i) {
                let subtitle = subtitles[i];
                subtitle.start += offset;
                subtitle.end += offset;
                ctx.subtitleDao.update(subtitle);
            }
        }
        ctx.logger.info(`完成偏移量修改:${clipId},${offset}`);
    }

    deleteByClipId = async (ctx) => {
        const clipId = parseInt(ctx.params.clipId);

        const author = ctx.authorDao.findById(clip.authorId);
        if (!author) {
            throw error.author.NotFound;
        }

        if (!ctx.userService.isAdmin(ctx.state.user)) {
            throw error.auth.Unauthorized;
        }

        ctx.subtitleDao.deleteByClipId(clipId); // 删除历史字幕
        ctx.logger.info(`删除历史字幕:${clipId}`);
    }

    findByClipId = async (ctx) => {
        const req = ctx.request;
        const clipId = parseInt(req.params.clipId);
        let subtitles = ctx.subtitleDao.findByClipId(clipId);
        subtitles.forEach(subtitle => {
            subtitle.markedContent = subtitle.content;
            subtitle.len = subtitle.content.length;
        });

        if (req.query.keyword) {
            let keyword = req.query.keyword;
            // 去掉特殊字符
            let keywordPattern = keyword.replace(/[%_\<\>;\(\)\?\/\s]/g, '');
            let pinyinKeywordPattern = pinyin(keywordPattern, {toneType:'num'});

            let matchedLines = {};
            if (keyword.indexOf('*') !== -1 || keyword.indexOf('+') !== -1) {
                // 处理通配符
                keywordPattern = keywordPattern.replaceAll('*', '.*');
                pinyinKeywordPattern = pinyinKeywordPattern.replaceAll('*', '\\b.*\\b');
                
                keywordPattern = keywordPattern.replaceAll('+', '\\S?');
                keywordPattern = `(${keywordPattern})`;
                pinyinKeywordPattern = pinyinKeywordPattern.replaceAll('+', '\\b\\S*\\b');
                pinyinKeywordPattern = `\\b(${pinyinKeywordPattern})\\b`;

                matchedLines = ctx.subtitleDao.findLineIdByClipIdAndKeywordWithRegexp(clipId, keywordPattern, pinyinKeywordPattern);
            } else {
                matchedLines = ctx.subtitleDao.findLineIdByClipIdAndKeyword(clipId, keywordPattern, pinyinKeywordPattern);
            }
            
            matchedLines.forEach(line => {
                let subtitle = subtitles[line.lineId - 1];
                subtitle.markedContent = mark(subtitle.content, keywordPattern, pinyinKeywordPattern);
                if (subtitle.markedContent !== subtitle.content) {
                    subtitle.matchMode = 1;
                }
            });
        }

        subtitles.forEach(item => {
            delete item.content;
            delete item.pinyinContent;
        });
        return subtitles;
    }

    findSizeByClipId = async (ctx) => {
        const clipId = parseInt(ctx.request.params.clipId);
        const size = ctx.subtitleDao.findSizeByClipId(clipId);
        return size;
    }

    findSrtByClipId = async (ctx) => {
        const req = ctx.request;
        const clipId = parseInt(req.params.clipId);
        const subtitles = ctx.subtitleDao.findByClipId(clipId);
        let arr = [];
        for (let i = 0; i < subtitles.length; ++i) {
            const subtitle = subtitles[i];
            arr.push(`${subtitle.lineId}`);
            arr.push(`${fromMicroseconds(subtitle.start)} --> ${fromMicroseconds(subtitle.end)}`);
            arr.push(subtitle.content);
        }
        return arr.join('\r\n');
    }
}
