import axios from 'axios';
import config from './config.js';
import ZimuApi from './api/ZimuApi.js';

export default class RecorderService {
    constructor() {
        // session 和 clip 一一映射
        this.sessionClipMap = new Map();
    }

    handle = async (ctx) => {
        try {
            const eventType = ctx.request.body.EventType;
            const eventData = ctx.request.body.EventData;
            const sessionId = eventData.SessionId;

            console.log(`Received webhook event: ${eventType}, SessionId: ${sessionId}`);

            switch (eventType) {
                case 'FileOpening':
                    await this.handleFileOpening(eventData, ctx);
                    break;
                case 'FileClosed':
                    await this.handleFileClosed(eventData, ctx);
                    break;
                default:
                    console.log(`Unhandled event type: ${eventType}`);
                    ctx.status = 200;
                    ctx.body = { message: 'Event received but not processed' };
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
            ctx.status = 500;
            ctx.body = { error: 'Internal server error' };
        }
    }

    // 处理文件打开事件
    handleFileOpening = async (eventData, ctx) => {
        try {
             // 通过RoomId获取直播封面和UID
            const liveInfo = await ZimuApi.findLiveInfoByRoomId(eventData.RoomId);
            const authorUid = liveInfo.uid;
            const coverUrl = liveInfo.user_cover.substring(7); // 去掉 "http://"

             // 通过UID获取字幕库ID
            const authorInfo = await ZimuApi.findAuthorByUid(authorUid);
            const authorId = authorInfo.id;

            const fileName = this.extractFileName(eventData.RelativePath);
            const formattedTime = this.formatDateTime(eventData.FileOpenTime);

            // 构建请求数据
            const clipData = {
                authorId: authorId,
                title: fileName,
                datetime: formattedTime,
                cover: coverUrl,
                type: 4 // 直播中
            };

            console.log('Sending clip creation request:', clipData);
            const response = await axios.post(`${config.zimu.url}/api/clips`, clipData, {
                headers: {
                    'Authorization': `Bearer ${config.token}`,
                    'Content-Type': 'application/json'
                }
            });

            // 存储映射关系（同时存储sessionId和authorId）
            if (response.data && response.data.id) {
                this.sessionClipMap.set(eventData.SessionId, {
                    clipId: response.data.id,
                    authorId: authorId
                });
                console.log(`Clip created with ID: ${response.data.id} for session: ${eventData.SessionId}`);
            }

            ctx.status = 200;
            ctx.body = { 
                message: 'Clip created successfully',
                clipId: response.data.id 
            };

        } catch (error) {
            console.error('Error creating clip:', error);
            if (error.response) {
                console.error('API response error:', error.response.data);
            }
            ctx.status = 500;
            ctx.body = { error: 'Failed to create clip' };
        }
    }

    // 处理文件关闭事件
    handleFileClosed = async (eventData, ctx) => {
        try {
            const sessionId = eventData.SessionId;
            const clipId = this.sessionClipMap.get(sessionId);

            if (!clipId) {
                console.warn(`No clip ID found for session: ${sessionId}`);
                ctx.status = 404;
                ctx.body = { error: 'Clip not found for this session' };
                return;
            }

            console.log(`Updating clip ${clipId} for session ${sessionId} to type 3`);
            
            // 构建请求数据
            const clipData = await ZimuApi.findClipById(clipId);
            clipData.type = 3; // 已结束
            delete clipData.id; // 删除ID以防冲突

            // 发送 PUT 请求更新 clip
            const response = await axios.put(`${config.zimu.url}/api/clips/${clipId}`, clipData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // 清理映射关系
            this.sessionClipMap.delete(sessionId);

            ctx.status = 200;
            ctx.body = { 
                message: 'Clip updated successfully',
                clipId: clipId 
            };

        } catch (error) {
            console.error('Error updating clip:', error);
            if (error.response) {
                console.error('API response error:', error.response.data);
            }
            ctx.status = 500;
            ctx.body = { error: 'Failed to update clip' };
        }
    }

    // 提取文件名（去掉路径和扩展名）
    extractFileName = (relativePath) => {
    console.log(`===========${relativePath}`);
        try {
            const fullFileName = relativePath.split('/').pop();
            // 去掉扩展名
            const fileNameWithoutExt = fullFileName.replace(/\.[^/.]+$/, "");
            return fileNameWithoutExt;
        } catch (error) {
            console.error('Error extracting filename:', error);
            return relativePath;
        }
    }

    // 格式化日期时间
    formatDateTime = (isoString) => {
        try {
            const date = new Date(isoString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('Error formatting datetime:', error);
            // 如果解析失败，返回原始字符串（去掉时区信息）
            return isoString.split('+')[0].replace('T', ' ');
        }
    }

    // 获取当前存储的映射（用于调试）
    getSessionClipMap = () => {
        return Object.fromEntries(this.sessionClipMap);
    }

    // 清理过期的映射
    cleanupExpiredSessions = (maxAgeHours = 24) => {
        const now = Date.now();
        const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
        
        console.log(`Cleaning up session-clip mappings. Current size: ${this.sessionClipMap.size}`);
        
        // 简单方案：定期清理所有映射（在生产环境中需要更智能的策略）
        this.sessionClipMap.clear();
    }
}