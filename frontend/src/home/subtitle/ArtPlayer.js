import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import flvjs from 'flv.js';

export default function Player({ option, getInstance, ...rest }) {
    const artRef = useRef();
    const flvPlayerRef = useRef(null); // 用于保存 flv.js 实例

    useEffect(() => {
        const art = new Artplayer({
            ...option,
            container: artRef.current,
            screenshot: false,
            setting: true,
            fullscreen: true,
            fullscreenWeb: true,
            fastForward: true,
            playbackRate: true,
            seek: true,
            lock: true,
            // 自定义 flv 播放
            customType: {
                flv: function (video, url) {
                    if (!flvjs.isSupported()) {
                        art.notice.show = '浏览器不支持播放 flv';
                        return;
                    }

                    // 避免重复创建 flvPlayer
                    if (!flvPlayerRef.current) {
                        const flvPlayer = flvjs.createPlayer({
                            type: 'flv',
                            url: url,
                            enableSeek: true,        // 支持跳转
                            enableStashBuffer: true, // ✅ 必须开启缓存
                            isLive: false,           // 准直播录屏
                            lazyLoad: true,
                            lazyLoadMaxDuration: 60, // 预加载最大时长
                            lazyLoadRecoverDuration: 20, // 恢复预加载时长
                        });

                        flvPlayer.attachMediaElement(video);
                        flvPlayer.load();

                        // 捕获 flv.js 错误，防止未处理异常
                        flvPlayer.on(flvjs.Events.ERROR, (type, detail, info) => {
                            console.error('FLV.js Error', type, detail, info);
                        });

                        flvPlayerRef.current = flvPlayer;
                    }
                },
            },
            plugins: [
                artplayerPluginDanmuku({
                    antiOverlap: true,
                    fontSize: 22,
                    speed: 8,
                    mount: undefined,
                    emitter: false,
                    danmuku: option.danmakuUrl,
                    heatmap: true,
                }),
            ],
        });

        // Artplayer 播放器就绪后自动播放
        art.on('ready', () => {
            art.play();
        });

        if (getInstance && typeof getInstance === 'function') {
            getInstance(art);
        }

        // 卸载时销毁 Artplayer 和 flv.js
        return () => {
            if (flvPlayerRef.current) {
                flvPlayerRef.current.destroy();
                flvPlayerRef.current = null;
            }
            if (art && art.destroy) {
                art.destroy(false);
            }
        };
    }, []);

    return <div ref={artRef} {...rest}></div>;
}
