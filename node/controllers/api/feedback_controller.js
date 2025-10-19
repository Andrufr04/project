export default class FeedbackController {

    constructor() {
        this.restResponse = {
            status: {
                code: 200,
                phrase: 'Ok',
                isSuccess: true
            },
            meta: {
                service: "Feedback API",
                method: "",
                serverTime: new Date().getTime(),
                cache: 0,
                dataType: ""
            },
            data: null
        }
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
        this.restResponse.data = "FeedbackController"

        response.end(JSON.stringify(this.restResponse))
    }

    doPost(request, response, id) {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        })
        this.restResponse.meta.method = request.method
        this.restResponse.meta.slug = id
        this.restResponse.meta.cache = 86400
        this.restResponse.meta.dataType = "string"
        this.restResponse.data = JSON.stringify(
            {
                "controller": "FeedbackController",
                "method": "POST",
                "semantic": "Create"
            })

        response.end(JSON.stringify(this.restResponse))
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
        this.restResponse.data = "PUT FeedbackController"

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
        this.restResponse.data = "PATCH FeedbackController"

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
        this.restResponse.data = "DELETE FeedbackController"

        response.end(JSON.stringify(this.restResponse))
    }

    doOptions(request, response) {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': '*'
        })
        response.end()
    }

}