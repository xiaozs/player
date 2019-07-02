export interface VideoMeta {
    //编码ID
    codec_id: number;
    //宽
    width: number;
    //高
    height: number;
    //帧率
    fps: number;
    //颜色空间类型
    pix_fmt: number;
}

export interface AudioMeta {
    //编码ID
    codec_id: number;
    //采样率
    sample_rate: number;
    //声道
    channels: number;
    //采样格式
    sample_fmt: number;
    //码率
    bit_rate: number;
}

export interface VideoFrame extends Frame {
    meta: VideoMeta;
}

export interface AudioFrame extends Frame {
    meta: AudioMeta;
}

export interface Frame {
    data: Uint8Array;
    pts: number;
}