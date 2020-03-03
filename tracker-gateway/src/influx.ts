import { InfluxDB, FieldType } from 'influx';

const performanceFields = {
    timestamp: FieldType.INTEGER,
    width: FieldType.INTEGER,
    height: FieldType.INTEGER,
    url: FieldType.STRING,
    title: FieldType.STRING,
    referrer: FieldType.STRING,
    ua: FieldType.STRING,
    userId: FieldType.STRING,
    assetsVer: FieldType.STRING,
    sendMode: FieldType.STRING,
    ip: FieldType.STRING,
    protocol: FieldType.STRING,
    query: FieldType.STRING,
    hash: FieldType.STRING,
    ipv4: FieldType.STRING,

    appcache: FieldType.FLOAT,
    blank: FieldType.FLOAT,
    contentdownload: FieldType.FLOAT,
    dns: FieldType.FLOAT,
    domparsing: FieldType.FLOAT,
    domready: FieldType.FLOAT,
    firstbyte: FieldType.FLOAT,
    load: FieldType.FLOAT,
    redirect: FieldType.FLOAT,
    ssl: FieldType.FLOAT,
    tcp: FieldType.FLOAT,
    total: FieldType.FLOAT,
    ttfb: FieldType.FLOAT,
    unload: FieldType.FLOAT,
};

const performanceTags = {
    device: FieldType.STRING,
    sdkVer: FieldType.STRING,
    page: FieldType.STRING,
    browser: FieldType.STRING,
    os: FieldType.STRING,
    country: FieldType.STRING,
    region: FieldType.STRING,
    county: FieldType.STRING,
    city: FieldType.STRING,
    net: FieldType.STRING,
    isp: FieldType.STRING,
};

const influx = new InfluxDB({
    host: 'localhost',
    port: 8086,
    database: 'Tracker' + (process.env.NODE_ENV === 'development' ? 'Test' : ''),
    schema: [
        {
            measurement: 'performance',
            fields: performanceFields,
            tags: Object.keys(performanceTags),
        },
    ],
});

/**
 * 上报性能数据
 * @param {Object} data 性能数据
 */
export function logPerformance(data: any) {
    const fields: { [key: string]: any } = {};
    const tags: { [key: string]: any } = {};
    Object.keys(data).forEach((key) => {
        if (key in performanceFields) {
            fields[key] = data[key];
        } else if (key in performanceTags) {
            tags[key] = data[key] || 'unknown';
        }
    });

    return influx.writePoints([
        {
            measurement: 'performance',
            fields,
            tags,
        },
    ]);
}
