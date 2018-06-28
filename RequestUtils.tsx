import {
    Alert
} from 'react-native';
import {
    NetInfo
} from 'react-native';
import { ReportError } from '../utils/ReportError';

import { Application } from '../stores/Application';
import { RequestInterceptor } from './RequestInterceptor';
const debug = true;
let managerTask = RequestInterceptor.getInstance();
/**
 * @param url        请求地址,必须, for example http://192.168.31.2:8080
 * //一下内容写成 { requestTag = undefined, loadType = 1, config = undefined, timeout = undefined }
 * @param requestTag 请求tag,标识当前请求,可以防止重复请求
 * @param loadType   请求ip类型,0 表示默认,1表示要统计
 * @param headers    请求头,默认值:
 *                      {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                            }
                        }
 * @param timeout   请求超时时间设置
 * 
 * @returns   正确结果
 *            REQUEST_REPEAT_FLAG = 1;//重复请求 返回标记
              REQUEST_CANCEL_FLAG = 0;//取消请求 返回标记
              REQUEST_EEROR_FLAG = -1;//请求错误 返回标记
              REQUEST_TIMEOUT_FLAG = -2;//请求s超时 返回标记
 */
export default async function request(url: string, opt: any = {}) {
    let { requestTag = undefined, loadType = 0, config = undefined, timeout = undefined, isStopRepeat = true } = opt;
    //set requestTag
    !requestTag && (requestTag = url);
    let defaultConfig = {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    }
    
    Object.assign(defaultConfig, config);
    //如果没有网络 requestTag, url, defaultConfig , timeout
    let result: any = await managerTask.makeWrapperTask({ requestTag, url, defaultConfig, timeout, isStopRepeat });
    switch (loadType) {
        case 1: {
            result = RequestInterceptor.getInstance().parseSimpleResponse(result);
            result = result.result;
            if (!result) {
                return;
            }
            if (result.status === 400) {
                let _bodyInit = await result.json();
                // let _state = JSON.parse(_bodyInit.state);
                let new_result = {
                    'code': result.status,
                    'message': _bodyInit.message,
                    'messageCode': _bodyInit.code
                }
                ReportError.apiError('code:' + new_result.code + '\nmessage:' + new_result.message);
                result = new_result;
            }
            else if (result.status === 200) {
                let lastModify = 'last-modified';
                result = {
                    'code': result.status,
                    'headers': result.headers,
                    'message': await result.json(),
                }
            } else if (result.status === 304) {
                result = 304;
            }
            else if (result.status === 500) {
                console.log('sdfa-sd*fa-s*d----  ', result)
                let new_result = {
                    'code': result.status,
                    'message': 'There is a problem right now. Please try again later.',
                }
                ReportError.apiError('code:' + new_result.code + '\nmessage:' + new_result.message);
                result = new_result;
            } else if (result.status === 401) {
                let new_result = {
                    'code': result.status,
                    'message': 'There is a problem right now. Please try again later.',
                }
                ReportError.apiError('code:' + new_result.code + '\nmessage:' + new_result.message);
                result = new_result;
            }
            break;
        }
    }
    // if (debug)
    //     console.log('netUtils resolve  url ', url,' defaultConfig:',defaultConfig, '  result', result);
    //返回结果
    return result;
}