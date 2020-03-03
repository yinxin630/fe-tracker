import { version } from '../package.json';

/**
 * window上属性声明
 */
declare global {
    interface Window {
        chrome: any;
    }
}

/**
 * Tracker 配置参数
 */
interface TrackerOptions {
    /** 应用id */
    id: string;
}

/** 性能数据字段 */
const fields = [
    'navigationStart', // 0
    'unloadEventStart',
    'unloadEventEnd',
    'redirectStart',
    'redirectEnd',
    'fetchStart', // 5
    'domainLookupStart',
    'domainLookupEnd',
    'connectStart',
    'secureConnectionStart',
    'connectEnd', // 10
    'requestStart',
    'responseStart',
    'responseEnd',
    'domLoading',
    'domInteractive', // 15
    'domContentLoadedEventStart',
    'domContentLoadedEventEnd',
    'domComplete',
    'loadEventStart',
    'loadEventEnd', // 20
];

/**
 * 性能数据指标存储结构
 */
interface Targets {
    [key: string]: [number, number];
}
/**
 * 性能数据指标
 * key: 指标
 * value: [字段1, 字段2]
 * result: key = fields[字段1] - fields[字段2]
 */
const targets: Targets = {
    firstbyte: [5, 12], // 首字节
    domready: [5, 17], // DOM Ready
    load: [5, 19], // load 触发

    dns: [6, 7], // DNS 查询
    tcp: [8, 10], // TCP 连接
    ssl: [9, 10], // HTTPS 连接

    ttfb: [11, 12], // TTFB
    contentdownload: [12, 13], // HTML 下载
    domparsing: [13, 15], // DOM 解析

    total: [5, 20], // 总耗时

    unload: [1, 2], // 上个页面 unload
    redirect: [3, 4], // 重定向时间
    appcache: [5, 6], // 缓存查询
};

/** 性能数据结构 */
interface PerformanceData {
    [key: string]: number | string;
}

/**
 * influxDB Measurement list
 */
enum Measurement {
    Performance = 'performance',
}

const SupportNavigationV2 = typeof window.PerformanceNavigationTiming === 'function';

/**
 * 核心类
 * 收集信息, 数据上报
 */
export default class Tracker {
    /** 配置参数 */
    private options: TrackerOptions;

    constructor(options: TrackerOptions) {
        this.options = options;
    }

    init() {
        if (document.readyState === 'complete') {
            this.logPerformance();
        } else {
            window.addEventListener('load', () => this.logPerformance());
        }
    }

    logPerformance() {
        this.log(Measurement.Performance, Object.assign(this.getCommon(), this.getPerformance()));
    }

    /**
     * 获取公共信息
     */
    getCommon() {
        const { innerWidth: width, innerHeight: height, location, document, navigator } = window;
        const { href: url } = location;
        const { title, referrer } = document;
        let net = '';
        // @ts-ignore
        if (navigator.connection && navigator.connection.effectiveType) {
            // @ts-ignore
            net = navigator.connection.effectiveType;
        }

        // url, ua, ip 解析在服务端做
        return {
            id: this.options.id,
            timestamp: Date.now(),
            url,
            title,
            referrer,
            ua: navigator.userAgent,
            net,
            width,
            height,
            sdkVer: version,
            userId: '',
            assetsVer: '',
            sendMode: '',
        };
    }

    /**
     * 获取性能信息
     */
    getPerformance() {
        /** timing api v1 */
        const timing1 = window.performance.timing;
        /** timing api v2 */
        let timing2: PerformanceEntry = {} as PerformanceEntry;

        // 优先使用 navigation v2  https://www.w3.org/TR/navigation-timing-2/
        if (SupportNavigationV2) {
            try {
                var nt2Timing = performance.getEntriesByType('navigation')[0];
                if (nt2Timing) {
                    timing2 = nt2Timing;
                }
            } catch (err) {}
        }

        /** 合并 v1, v2 的数据  */
        const timing: PerformanceData = {};
        fields.forEach((field: string) => {
            // @ts-ignore
            timing[field] = timing2[field] || timing1[field];
        });

        /** 计算每个性能指标 */
        const times: PerformanceData = {};
        Object.keys(targets).forEach((key) => {
            const [fieldIndex1, fieldIndex2] = targets[key];
            times[key] = <number>timing[fields[fieldIndex2]] - <number>timing[fields[fieldIndex1]];
            if (times[key] < 0) {
                times[key] = 0;
            }
        });

        // 计算白屏时间
        if (SupportNavigationV2) {
            const paintTimimg = performance.getEntriesByType('paint');
            if (paintTimimg && paintTimimg.length > 0) {
                times.blank = paintTimimg[1] ? paintTimimg[1].startTime : paintTimimg[0].startTime;
            }
        } else if (window.chrome && window.chrome.loadTimes) {
            times.blank =
                window.chrome.loadTimes().firstPaintTime * 1000 -
                window.performance.timing.fetchStart;
        }
        if (!times.blank || times.blank < 0) {
            times.blank = 0;
        }

        Object.keys(times).forEach((key) => {
            if (typeof times[key] === 'number') {
                times[key] = ((times[key] as number).toFixed(3) as unknown) as number;
            }
        });

        return times;
    }

    /**
     * 上报数据
     * @param measurement influxDB Measurement
     * @param data 上报数据
     */
    log(measurement: Measurement, data: any) {
        // rollup 注入的值
        // @ts-ignore
        const host = TRACKER_HOST;
        try {
            // throw Error('use img');
            // 使用 sendBeacon 上报, 参考: https://developer.mozilla.org/zh-CN/docs/Web/API/Navigator/sendBeacon
            data.sendMode = 'sendBeacon';
            window.navigator.sendBeacon(`${host}/performance`, JSON.stringify(data));
        } catch {
            // 降级为 img.src 上报
            data.sendMode = 'img';
            const params = Object.keys(data)
                .map((field) => `${field}=${encodeURIComponent(data[field])}`)
                .join('&');
            const img = document.createElement('img');
            img.src = `${host}/${measurement}?${params}`;
        }
    }
}
