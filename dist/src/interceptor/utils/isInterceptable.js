"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInterceptable = void 0;
const commonLocalUrlTlds = ['local'];
const containsAnyPartial = (array, targetString) => {
    return array.some(partial => targetString.includes(partial));
};
function isInterceptable({ url, ignoredDomains, allowedDomains, baseUrl, allowLocalUrls, allowIpAddresses, isWithinContext: isWithinContext = () => true, }) {
    if (!isWithinContext()) {
        return false;
    }
    const { origin: baseOrigin } = new URL(baseUrl);
    const hostname = url.hostname;
    const [, tld] = hostname.split('.');
    if (baseOrigin === url.origin || containsAnyPartial(['supergood.ai'], hostname)) {
        return false;
    }
    if (allowedDomains && allowedDomains.length > 0) {
        if (containsAnyPartial(allowedDomains, hostname)) {
            return true;
        }
        else {
            return false;
        }
    }
    if (!allowIpAddresses && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return false;
    }
    if (!allowLocalUrls && !hostname) {
        return false;
    }
    if (!tld && !allowLocalUrls) {
        return false;
    }
    if (commonLocalUrlTlds.includes(tld) && !allowLocalUrls) {
        return false;
    }
    if (containsAnyPartial(ignoredDomains, hostname)) {
        return false;
    }
    return true;
}
exports.isInterceptable = isInterceptable;
//# sourceMappingURL=isInterceptable.js.map