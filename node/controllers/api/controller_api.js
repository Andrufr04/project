class ApiController {

    constructor() {
        this.restResponse = {
            status: {
                code: 200,
                phrase: 'Ok',
                isSuccess: true 
            },
            meta: {
                service: "ApiController",
                method: "",
                serverTime: new Date().getTime(),
                cache: 0,
                dataType: ""
            },
            data: null
        }
    }

    doOptions(request, response) {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': '*'
        })
        response.end()
    }

    send400(response, reason) {
        this.restResponse.status.code = 400
        this.restResponse.phrase = "Bad Request"
        this.restResponse.isSuccess = false
        this.restResponse.data = reason
        response.end(JSON.stringify(this.restResponse))
    }

    send401(response, reason) {
        if (typeof reason == 'undefined') {
            reason = "Credentials rejected. Check login and password"
        }
        this.restResponse.status.code = 401
        this.restResponse.phrase = "UnAuthorized"
        this.restResponse.isSuccess = false
        this.restResponse.data = reason
        response.end(JSON.stringify(this.restResponse))
    }
}

export default ApiController