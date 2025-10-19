import * as crypto from "node:crypto"
import settings from "./appsettings.js";
import Base64 from "./base_64.js"

const time = () => new Date().toTimeString().substring(0, 8)
function delay(timeout, isOk = true) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            isOk ? resolve() : reject()
        }, timeout)
    })
}

/**
 * Повертає MIME тип за іменем файла, або null, якщо
 * розширення файла не належить дозволеному переліку
 * @param {*} path ім'я файлу або шлях до нього 
 */
function getAllowedMimeType(path) {
    let dotIndex = path.lastIndexOf('.')
    if (dotIndex == -1) return null
        
    const ext = path.substring(dotIndex + 1)
    let contentType = null
    switch(ext) {
        case 'html':
        case 'css': contentType = `text/${ext}; charset=utf-8`; break
        case 'js': contentType = "text/javascript; charset=utf-8"; break
        case 'txt': contentType = "text/plain; charset=utf-8"; break
        case 'bmp':
        case 'gif':
        case 'png':
        case 'webp': contentType = "image/" + ext; break
        case 'jpg':
        case 'jpeg': contentType = "image/jpeg"; break
        case 'pdf': contentType = "application/pdf"; break
        case 'mp3': contentType = "audio/mpeg"; break
        case 'mp4': contentType = "video/mp4"; break
    }
    return contentType
}

function getSignature(data, secret) {
        if(typeof secret == 'undefined') {
            secret = settings.jwtSecret;
        }
        return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

function getToken(request) {
    const authHeader = request.headers['authorization']
    if (!authHeader) {
        return `Missing 'Authorization' header`
    }
    const scheme = "Bearer "
    if (!authHeader.startsWith(scheme)) {
        return `Invalid Authorization Scheme: '${scheme}' required`
    }
    const jwt = authHeader.substring(scheme.length)
    const parts = jwt.split('.')
    if (parts.length < 3) {
        return `Invalid token: signed JWT expected`
    }
    let jwtHeader
    try {
        jwtHeader = JSON.parse(Base64.decodeUrl(parts[0]))
    } catch(err) {
        return `Invalid token header: Base64Url encoded JSON expected. ${err}`
    }
    if (typeof jwtHeader.typ == 'undefined') {
        return `Missing token type (header.typ)`
    }
    if (jwtHeader.typ != 'JWT') {
        return `Unsupported token type: 'JWT' only`
    }
    if (typeof jwtHeader.alg == 'undefined') {
        return `Missing token algorithm (header.alg)`
    }
    if (jwtHeader.alg != 'HS256') {
        return `Unsupported token algorithm: 'HS256' only`
    }
    const jwtBody = parts[0] + '.' + parts[1]
    if (this.getSignature(jwtBody) != parts[2]) {
        return "Signature error"
    }
    try {
        const jwtPayload = JSON.parse(Base64.decodeUrl(parts[1]))
        const currentTime = new Date().getTime() / 1000

        if (typeof jwtPayload.exp != 'undefined') {
            const expired = currentTime > Number(jwtPayload.exp)
            if (expired) {
                return `Token expired`
            }
        }
        if (typeof jwtPayload.nbf != 'undefined') {
            const nbfValid = currentTime > Number(jwtPayload.nbf)
            if (!nbfValid) {
                return `'Not before' not passed`
            }
        }
        return JSON.parse(Base64.decodeUrl(parts[1]))
    } catch(err) {
        return `Invalid token payload: Base64Url encoded JSON expected. ${err}`
    }
}

export { delay, time, getAllowedMimeType, getSignature, getToken }