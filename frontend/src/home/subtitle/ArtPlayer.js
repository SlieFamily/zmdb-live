import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import flvjs from 'flv.js';

export default function Player({ option, getInstance, ...rest }) {
    const artRef = useRef();

    useEffect(() => {
        const art = new Artplayer({
            ...option,
            container: artRef.current,
            // autoSize: true,
            screenshot: false,
            setting: true,
            fullscreen: true,
            fullscreenWeb: true,
            fastForward: true,
            playbackRate: true,
            // 添加 MP4 视频的关键配置
            seek: true, // 确保跳转功能开启
            lock: true,
            customType: {
                flv: function (video, url) {
                    if (flvjs.isSupported()) {
                        const flvPlayer = flvjs.createPlayer({
                            type: 'flv',
                            url: url,
                        });
                        flvPlayer.attachMediaElement(video);
                        flvPlayer.load();
                    } else {
                        art.notice.show = '不支持播放flv';
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
                    // 弹幕 XML 文件，和 Bilibili 网站的弹幕格式一致
                    danmuku: option.danmakuUrl,
                    heatmap: true
                }),
            ],
        });

        art.on('ready', () => {
            art.play();
            // 添加 MP4 视频的跳转事件处理
            art.on('seek', (time) => {
                // 立即设置目标时间，防止跳转失效
                art.currentTime = time;
            });
        })

        if (getInstance && typeof getInstance === 'function') {
            getInstance(art);
        }

        return () => {
            if (art && art.destroy) {
                art.destroy(false);
            }
        };
    }, []);

    return <div ref={artRef} {...rest}></div>;
}