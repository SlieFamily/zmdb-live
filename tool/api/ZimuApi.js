import fetch from 'node-fetch';
import config from '../config.js';
import axios from 'axios';

export default class ZimuApi {
    static async findClipById(clipId) {
        const res = await fetch(`${config.zimu.url}/api/clips/${clipId}`);
        return await res.json();
    }

    static async findAuthorById(authorId) {
        const url = `${config.zimu.url}/api/authors/${authorId}`;
        const res = await fetch(url);
        return await res.json();
    }

    static async findLiveInfoByRoomId(roomId) {
        const res = await axios.get(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${String(roomId)}`, {
                timeout: 5000
            });
        return await res.data.data;
    }

    static async findAuthorByUid(authorUid) {
        const url = `${config.zimu.url}/api/authorsUid?uid=${authorUid}`;
        const res = await fetch(url);
        return await res.json();
    }
}