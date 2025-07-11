import * as React from 'react';
import { Box, Button, TextField, FormControlLabel, Checkbox } from '@mui/material';
import config from '../../config';
import { context as globalContext } from '../../context';
import { context } from '../context';
import ClipApi from '../../api/ClipApi';


export const SegmentControl = ({clip, startTime, setStartTime, endTime, setEndTime, segmentName }) => {

    const { onMessage } = React.useContext(globalContext);
    const { segmentDisabled, setSegmentDisabled } = React.useContext(context);
    const [audioChecked, setAudioChecked] = React.useState(false);
    const [danmakuChecked, setDanmakuChecked] = React.useState(false);
    const [forward, setForward] = React.useState(0);

    const onClick = async (e) => {
        if (startTime >= endTime) {
            onMessage({
                type: 'error',
                content: '起始时间必须小于结束时间！'
            });
            return;
        }
        try {
            setSegmentDisabled(true);
            onMessage({
                type:'success',
                content: `切片处理中:${clip.title} ${startTime} -> ${endTime}`
            });
            const json = await ClipApi.fetchSegment(clip.id, startTime, endTime, segmentName, audioChecked, danmakuChecked, forward);
            if (!json.filename || json.filename === '') {
                throw {code: 20000, message: '切片失败'};
            }
            let url = `${config.static.url}/segment/${json.filename}`;
            
            setTimeout(async () => {
                let x = new XMLHttpRequest();
                x.open('GET', url, true);
                x.responseType = 'blob';
                x.onload = (e) => {
                    const burl = window.URL.createObjectURL(x.response);
                    let a = document.createElement("a");
                    a.href = burl;
                    a.download = segmentName && segmentName.length > 0
                                ? `${segmentName}.${json.filename.split('.').pop()}`
                                : json.filename; // 如果segmentName不为空，则使用segmentName作为下载文件名
                    console.log(`begin:${burl},${a.download}`);
                    a.click();
                    console.log(`end:${burl}`);
                    a.remove();
                }
                x.send();
            }, 1000);
        } catch (ex) {
            console.log(ex);
            if (ex) {
                onMessage({
                    type: 'error',
                    content: `${ex.code}:${ex.message}`
                });
            } else {
                onMessage({
                    type: 'error',
                    content: '内部错误'
                });
            }
        } finally {
            setSegmentDisabled(false);
        }
    }

    return (
        <React.Fragment>
            <Box sx={{display:'flex', flexDirection:'column'}}>
                <Box sx={{display:'flex', mt:'2rem'}}>
                    <Box sx={{flex:1.2, pr:'1rem'}}>
                        <TextField variant="standard" size="small" label="起始时间" value={startTime} onChange={(e) => {setStartTime(e.target.value)}} />
                    </Box>
                    <Box sx={{flex:1.2, pr:'0.5rem', pl:'0.5rem'}}>
                        <TextField variant="standard" size="small" label="结束时间" value={endTime} onChange={(e) => {setEndTime(e.target.value)}} />
                    </Box>
                    <Box sx={{flex:1, pr:'0.5rem', pl:'0.5rem'}}>
                        <FormControlLabel 
                            label="仅音频" 
                            control={
                                <Checkbox 
                                    disabled={danmakuChecked}
                                    checked={audioChecked}
                                    onChange={() => {setAudioChecked(!audioChecked);}}
                                />
                            } 
                        />
                    </Box>
                </Box>
                <Box sx={{display:'flex', mt:'2rem'}}>
                    <Box sx={{flex:1, pr:'0.5rem', pl:'0.5rem'}}>
                        {
                            // 当clip为B站源时，弹幕切片功能不开放
                        }
                        <FormControlLabel 
                            label="弹幕" 
                            control={
                                <Checkbox 
                                    disabled={clip.type === 1 || audioChecked}
                                    checked={danmakuChecked}
                                    onChange={() => {setDanmakuChecked(!danmakuChecked);}}
                                />
                            } 
                        />
                    </Box>
                    <Box sx={{flex:1.2, pr:'0.5rem', pl:'0.5rem'}}>
                        {
                            // 当clip为B站源时，弹幕切片功能不开放
                        }
                        <TextField variant="standard" size="small" label="弹幕提前（秒）" disabled={clip.type === 1 || audioChecked} value={forward} onChange={(e) => {setForward(e.target.value)}} />
                    </Box>
                    <Box sx={{flex:1, pl:'0.5rem'}}>
                        <Button 
                            sx={{width:'100%', height:'100%'}} 
                            size="small" 
                            variant="contained" 
                            disabled={segmentDisabled} 
                            onClick={onClick}
                        >
                            生成切片
                        </Button>
                    </Box>
                </Box>
            </Box>
        </React.Fragment>
    );
}