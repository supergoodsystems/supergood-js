"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeaderOptions = void 0;
const getHeaderOptions = (clientId, clientSecret) => {
    return {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`
        }
    };
};
exports.getHeaderOptions = getHeaderOptions;
