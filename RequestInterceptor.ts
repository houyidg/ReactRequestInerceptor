import { Application } from '../stores/Application';

const DEBUG = true;
const TAG = 'RequestInterceptor';
export class RequestInterceptor {
    public static REQUEST_SUCCESS_FLAG = 11;//成功请求 返回标记
    public static REQUEST_REPEAT_FLAG = 1;//重复请求 返回标记
    public static REQUEST_CANCEL_FLAG = 0;//取消请求 返回标记
    public static REQUEST_EEROR_FLAG = -3;//请求错误 返回标记
    public static REQUEST_TIMEOUT_FLAG = -2;//请求s超时 返回标记
    public static REQUEST_NO_NET_FLAG = -1;//请求没有网络 返回标记
    requestTaskMap = new Map<String, RequestTask>();
    public static retryCount = 2;//请求没有网络 返回标记
    static instance;
    static getInstance(): RequestInterceptor {
        if (!RequestInterceptor.instance) {
            RequestInterceptor.instance = new RequestInterceptor();
        }
        return RequestInterceptor.instance;
    }

    /**
     * @param requestTag 
     * @param fetchParams 
     * @param timeout 
     */
    makeWrapperTask({ requestTag, url, defaultConfig, timeout = undefined, isStopRepeat = true }) {// task.wrappedPromise_
        let isExist = this.requestTaskMap.has(requestTag);
        if (DEBUG)
            console.log(TAG, ' tag', requestTag, ' add isExist', isExist, ' taskMap.size:', this.requestTaskMap.size, ' Application.netStatus ', Application.netStatus);
        let task = new RequestTask();
        if (Application.netStatus == -1) {
            task.wrappedPromise_ = new Promise((resolve, reject) => {
                resolve(NetWorkDispatcher.REQUEST_NO_NET_FLAG);
            });
        } else if (isExist) {
            if (isStopRepeat) {
                task.wrappedPromise_ = new Promise((resolve, reject) => {
                    //重复 1 
                    let rst = { flag: NetWorkDispatcher.REQUEST_REPEAT_FLAG, result: undefined };
                    resolve(rst);
                });
            } else {
                task = this.requestTaskMap.get(requestTag);
            }
        } else {
            this.makeAFetchTask(task, url, defaultConfig, requestTag, timeout);
        }
        return task.wrappedPromise_;
    }

    makeAFetchTask(task, url, defaultConfig: any, tag, timeout) {
        task.wrappedPromise_ = new Promise((resolve, reject) => {
            this.makeABFetchTask(task, url, defaultConfig, tag, timeout, resolve, reject);
        });
        this.requestTaskMap.set(tag, task);
    }

    makeABFetchTask(task, url, defaultConfig: any, tag, timeout, resolve, reject) {
        let startTime = new Date().getTime();
        fetch(url, defaultConfig)
            .then((val: Response) => {
                this.requestTaskMap.delete(tag);
                if (DEBUG)
                    console.log(TAG, ' tag', tag, ' then, cost time:', (new Date().getTime() - startTime), '  task.hasCanceled_',
                        task.hasCanceled_, 'left taskMap.size:', this.requestTaskMap.size);
                let rst = { flag: undefined, result: val };
                if (task.hasCanceled_) {
                    rst.flag = NetWorkDispatcher.REQUEST_CANCEL_FLAG;
                } else {
                    rst.flag = NetWorkDispatcher.REQUEST_SUCCESS_FLAG;
                }
                resolve(rst);
            })
            .catch((error) => {
                let isNeedRetry = (NetWorkDispatcher.retryCount >= task.retryCount_) && !task.hasCanceled_ && task.timeoutTime > 0;
                if (DEBUG)
                    console.log(TAG, ' tag', tag, ' catch, cost time:', (new Date().getTime() - startTime)
                        , ' task.hasCanceled_', task.hasCanceled_, ' isNeedRetry', isNeedRetry, 'left taskMap.size:', this.requestTaskMap.size, ' error--------', error);
                //是否 retry
                if (isNeedRetry) {
                    task.retryCount_++;
                    this.makeABFetchTask(task, url, defaultConfig, tag, timeout, resolve, reject);
                } else {
                    this.requestTaskMap.delete(tag);
                    let rst = { flag: undefined, result: error };
                    if (task.hasCanceled_) {
                        rst.flag = NetWorkDispatcher.REQUEST_CANCEL_FLAG;
                    } else {
                        rst.flag = NetWorkDispatcher.REQUEST_EEROR_FLAG;
                    }
                    resolve(rst);
                }
            });
        //手动设置超时 timeout
        if (timeout && !isNaN(timeout)) {
            task.timeoutTime = timeout;
            task.timeout_ && clearTimeout(task.timeout_);
            task.timeout_ = setTimeout(() => {
                if (DEBUG)
                    console.log(TAG, ' tag', tag, ' timeout, cost time:', (new Date().getTime() - startTime), ' task.hasCanceled_', task.hasCanceled_, 'left taskMap.size:', this.requestTaskMap.size);
                this.requestTaskMap.delete(tag);
                let rst = { flag: undefined, result: undefined };
                if (task.hasCanceled_) {
                    rst.flag = NetWorkDispatcher.REQUEST_CANCEL_FLAG;
                } else {
                    rst.flag = NetWorkDispatcher.REQUEST_TIMEOUT_FLAG;
                }
                task.hasCanceled_ = true;
                resolve(rst);
            }, timeout);
        }
    }

    cancelTaskByTag(tag) {
        if (DEBUG)
            console.log(TAG, ' cancelTaskByTag ', tag, ' this.requestTaskMap has tag:', this.requestTaskMap.has(tag), 'left taskMap.size:', this.requestTaskMap.size);
        let task;
        if (tag && (task = this.requestTaskMap.get(tag))) {
            task.hasCanceled_ = true;
            this.requestTaskMap.delete(tag);
        }
    }

    /**
     * @param response 
     * @returns { isOk: true, result: result }
     */
    async parseResponse(response) {
        let flag = response.flag;
        let result = response.result;
        switch (flag) {
            case NetWorkDispatcher.REQUEST_CANCEL_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_EEROR_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_REPEAT_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_TIMEOUT_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_NO_NET_FLAG: {
                result = { isOk: false, result: result, flag: flag };
                break;
            }
            case NetWorkDispatcher.REQUEST_SUCCESS_FLAG: {
                if ('object' == typeof (result)) {
                    result = await result.json();
                }
                result = { isOk: true, result: result };
            }
        }
        return result;
    }
    /**
        * @param response 
        * @returns { isOk: true, result: result }
        */
    parseSimpleResponse(response): { isOk: true, result: any } {
        let flag = response.flag;
        let result = response.result;
        switch (flag) {
            case NetWorkDispatcher.REQUEST_CANCEL_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_EEROR_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_REPEAT_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_TIMEOUT_FLAG: {
            }
            case NetWorkDispatcher.REQUEST_NO_NET_FLAG: {
                result = { isOk: false, result: result, flag: flag };
                break;
            }
            case NetWorkDispatcher.REQUEST_SUCCESS_FLAG: {
                result = { isOk: true, result: result };
            }
        }
        return result;
    }
}
class RequestTask {
    hasCanceled_ = false;//是否被取消
    retryCount_ = 1;//默认重试连接 2次
    wrappedPromise_;
    timeouter;//超时器
    timeoutTime = 0;
}