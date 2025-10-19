import UserDao from "../../dao/userDao.js"
import Base64 from "../../base_64.js"
import ApiController from "./controller_api.js"



export default class ClientController extends ApiController{

    constructor( { dbPool, getSignature, getToken } ) {
        super()
        this.dbPool = dbPool
        this.getSignature = getSignature
        this.getToken = getToken
        this.restResponse.meta.service = "Client API"
    }
    
    doGet(request, response, id) {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        })
        this.restResponse.meta.method = request.method
        this.restResponse.meta.slug = id
        this.restResponse.meta.cache = 86400
        this.restResponse.meta.dataType = "string"
        this.restResponse.data = "ClientController"

        if (id == 'auth') {
            this.authenticate(request, response)
        } else {
            const jwt = this.getToken(request)
            if (typeof jwt == 'string') {
                this.send401(response, jwt)
                return
            }

            if (id == 'install') {
                const userDao = new UserDao(this.dbPool, this.getSignature)
                userDao.install()
                .then(() => {
                    this.restResponse.data = "Tables created"
                    response.end(JSON.stringify(this.restResponse))
                })
                .catch((err) => {
                    this.restResponse.data = err
                    response.end(JSON.stringify(this.restResponse))
                })
            } else {
                this.restResponse.data = "ClientController"
                response.end(JSON.stringify(this.restResponse))
            }
        }
    }

    async authenticate(request, response) {
        const authHeader = request.headers['authorization']
        if (!authHeader) {
            super.send400(response, `Missing 'Authorization' header`)
            return
        }
        const scheme = "Basic "
        if (!authHeader.startsWith(scheme)) {
            this.send400(response, `Invalid Authorization Scheme: '${scheme}' required`)
            return
        }
        const credentials = authHeader.substring(scheme.length)
        let userPass 
        try {
            userPass = Base64.decode(credentials)
        } catch(err) {
            this.send400(response, `Invalid Credentials: base64 decode error: ${err}`)
            return
        }
        const parts = userPass.split(':', 2)
        if (parts.length != 2) {
            this.send400(response, `Invalid Credentials: missing ':' separator`)
            return
        }

        const userDao = new UserDao(this.dbPool, this.getSignature)
        const login = parts[0]
        const password = parts[1]
        
        const uas = await userDao.getUserAccessByCredentials(login, password)
        if (uas == null) {
            this.send401(response)
            return
        }
        const token = await userDao.createTokenForUserAccess(uas)

        this.restResponse.data = token
        response.end(JSON.stringify(this.restResponse))
    }

    // send400(response, reason) {
    //     this.restResponse.status.code = 400
    //     this.restResponse.phrase = "Bad Request"
    //     this.restResponse.isSuccess = false
    //     this.restResponse.data = reason
    //     response.end(JSON.stringify(this.restResponse))
    // }

    // send401(response, reason) {
    //     if (typeof reason == 'undefined') {
    //         reason = "Credentials rejected. Check login and password"
    //     }
    //     this.restResponse.status.code = 401
    //     this.restResponse.phrase = "UnAuthorized"
    //     this.restResponse.isSuccess = false
    //     this.restResponse.data = reason
    //     response.end(JSON.stringify(this.restResponse))
    // }

    doPost(request, response, id) {
        //Прийом тіла запиту
        let body = ''
        request.on('data', function(chunk) { body += chunk })
        request.on('end', async () => {
            console.log('ClientController::doPost body: ' + body)
            console.log(request.headers['content-type'])
            if (validContentType(request.headers['content-type'])) {
                    let data = JSON.parse(body)
                    response.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    })
                    this.restResponse.meta.method = request.method
                    this.restResponse.meta.slug = id
                    this.restResponse.meta.cache = 0
                    this.restResponse.meta.dataType = "string"

                    const userDao = new UserDao(this.dbPool, this.getSignature)
                    try {
                        this.restResponse.data = await userDao.register(data)
                    } catch(err) {
                        this.restResponse.data = err
                    }
                    response.end(JSON.stringify(this.restResponse))
            } else {
                response.writeHead(415) // Unsupported Media Type
                response.end()
            }
        })
    }

    doPut(request, response, id) {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        })
        this.restResponse.meta.method = request.method
        this.restResponse.meta.slug = id
        this.restResponse.meta.cache = 86400
        this.restResponse.meta.dataType = "string"
        this.restResponse.data = "PUT ClientController"

        response.end(JSON.stringify(this.restResponse))
    }

    doPatch(request, response, id) {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        })
        
        this.restResponse.meta.method = request.method
        this.restResponse.meta.slug = id
        this.restResponse.meta.cache = 86400
        this.restResponse.meta.dataType = "string"
        this.restResponse.data = "PATCH ClientController"

        response.end(JSON.stringify(this.restResponse))
    }

    doDelete(request, response, id) {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        })
        
        this.restResponse.meta.method = request.method
        this.restResponse.meta.slug = id
        this.restResponse.meta.cache = 86400
        this.restResponse.meta.dataType = "string"
        this.restResponse.data = "DELETE ClientController"

        response.end(JSON.stringify(this.restResponse))
    }

    // doOptions(request, response) {
    //     response.writeHead(200, {
    //         'Access-Control-Allow-Origin': '*',
    //         'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
    //         'Access-Control-Allow-Headers': '*'
    //     })
    //     response.end()
    // }
}

function validContentType(str) {
    if (typeof str != 'string') return false

    const jsonType = 'application/json'
    if (str.startsWith(jsonType)) {
        if (str === jsonType || str[jsonType.length] == ';') {
            return true
        }
    }

    return false
}