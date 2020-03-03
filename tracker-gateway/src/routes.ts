import * as Router from 'koa-router';
import * as url from 'url';
import * as querystring from 'querystring';
import * as uaParser from 'ua-parser-js';
import axios from 'axios';
import { logPerformance } from './influx';

const router = new Router();

router.get('/', async (ctx) => {
    ctx.body = 'Hello World!';
});

async function parseCommonInfo(params: Object) {
    const result: { [key: string]: any } = Object.assign({}, params);

    const { protocol, host, pathname, query, hash } = url.parse(result.url);
    Object.assign(result, {
        protocol,
        page: host + pathname,
        query,
        hash,
    });

    const parsedIpv4 = result.ip.match(/\d+.\d+.\d+.\d+/);
    result.ipv4 = parsedIpv4 ? parsedIpv4[0] : '';

    // @ts-ignore
    const uaParseResult = uaParser(params.ua);
    const { browser, os, device } = uaParseResult;
    const mfwAppRegex = /mfwappver\/(\d+)\.\d+\.\d+/;
    // @ts-ignore
    const appParseResult = mfwAppRegex.exec(params.ua);
    if (appParseResult) {
        browser.name = 'Mfw APP';
        browser.major = appParseResult[1];
    }

    const osMajorRegex = /^\d+/;
    const osParseResult = osMajorRegex.exec(os.version);
    if (osParseResult) {
        os.version = osParseResult[0];
    }

    Object.assign(result, {
        browser: browser.name + ' ' + browser.major,
        os: os.name + ' ' + os.version,
        device: device.vendor && device.model ? device.vendor + ' ' + device.model : '',
    });

    let ipInfo = {
        country: '',
        region: '',
        county: '',
        city: '',
        isp: '',
    };
    if (result.ipv4) {
        try {
            const { status, data } = await axios.get(`http://ip.taobao.com/service/getIpInfo.php?ip=${result.ipv4}`);
            if (status === 200 && data.code === 0) {
                ipInfo = {
                    country: data.data.country,
                    region: data.data.region,
                    county: data.data.county,
                    city: data.data.city,
                    isp: data.data.isp,
                };
            }
        } catch (err) {
            console.error('获取 ip 信息失败', err.message);
        }
    }
    Object.assign(result, ipInfo);

    return result;
}

router.get('/performance', async (ctx) => {
    const { query } = url.parse(ctx.request.url);
    const params = querystring.parse(query);
    params.ip = ctx.request.ip;
    const performance = await parseCommonInfo(params);
    await logPerformance(performance);
    ctx.status = 204;
});

router.post('/performance', async (ctx) => {
    const params = ctx.request.body;
    params.ip = ctx.request.ip;
    const performance = await parseCommonInfo(params);
    await logPerformance(performance);
    ctx.status = 204;
});

export const routes = router.routes();
