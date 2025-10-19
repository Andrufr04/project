import http from "http"
import * as fs from "node:fs/promises"
import mysql2 from 'mysql2'
import GroupDao from './dao/groupDao.js'
import { getAllowedMimeType, getSignature, getToken } from './helper.js'

const dbIniFilename = 'db.ini'
const HTTP_PORT = 81;
const CONTROLLERS_PATH = './controllers/'
const CONTROLLER_FILE_SUFFIX = '_controller.js'

const controllers = {}
const loadControllersTask = fs.readdir(CONTROLLERS_PATH)
    .then(async (filenames) => {
        for (let filename of filenames) {
            let pos = filename.indexOf(CONTROLLER_FILE_SUFFIX)
            if (pos != -1) {
                const controllerName = filename.substring(0, pos)
                controllers[controllerName] = (await
                    import(CONTROLLERS_PATH + filename)
                ).default
            }
        }
    })

const apiControllers = {}
const API_PATH = CONTROLLERS_PATH + "api/"
const loadApiControllersTask = fs.readdir(API_PATH)
    .then(async (filenames) => {
        for (let filename of filenames) {
            let pos = filename.indexOf(CONTROLLER_FILE_SUFFIX)
            if (pos != -1) {
                const controllerName = filename.substring(0, pos)
                apiControllers[controllerName] = (await
                    import(API_PATH + filename)
                ).default
            }
        }
    })

const dbIniFile = await fs.open(dbIniFilename, 'r')
let dbConfig = {}

for await (let line of dbIniFile.readLines()) {
    let parts = line.split('#')
    line = parts[0]
    parts = line.split(';')
    line = parts[0]
    parts = line.split('=')
    if (parts.length != 2) continue
    dbConfig[parts[0].trim()] = parts[1].trim()
}

const dbPool = mysql2.createPool(dbConfig).promise()
const groupDao = new GroupDao(dbPool)

async function serverFunction(request, response) {
    let parts = request.url.split("?")
    if (parts.length > 2) {
        response.writeHead(400)
        response.end("Bad request")
    }
    let path = parts[0]
    if (!path.endsWith('/')) {
        let contentType = getAllowedMimeType(path)
        if (contentType != null) {
            const filePath = './wwwroot' + path
            try {
                await fs.access(filePath)
                const stat = await fs.stat(filePath)
                if (stat.isFile()) {
                    (await fs.open(filePath, 'r')).createReadStream().pipe(response)
                    response.writeHead(200, {
                        'Content-Type': contentType
                    })
                    return
                }
            } catch (_) { }
        }
    }

    let components = path.split("/", 4);
    let controller, action, id;
    if (components[1].length > 0) {
        controller = components[1].toLowerCase();
    } else {
        controller = "home";
    }
    if (components.length > 2 && components[2].length > 0) {
        action = components[2].toLowerCase();
    } else {
        action = "index";
    }
    if (components.length > 3) {
        id = components[3];
    } else {
        id = null;
    }
    // console.log(controller, action, id);

    const services = {
        getAllowedMimeType,
        dbPool, 
        getSignature, 
        getToken
    }

    if (controller == 'api') {
        if (typeof apiControllers[action] == 'function') {
            const apiControllerObject = new apiControllers[action](services)
            //apiControllerObject.dbPool = dbPool
            const apiAction = 'do' + request.method.charAt(0).toUpperCase() + request.method.slice(1).toLowerCase()
            if (typeof apiControllerObject[apiAction] == 'function') {
                apiControllerObject[apiAction](request, response, id)
                return
            } else {
                response.writeHead(405)
                response.end()
                return
            } 
        }
    } else if (typeof controllers[controller] == 'function') {
        const controllerObject = new controllers[controller](services)
        // controllerObject.dbPool = dbPool
        if (typeof controllerObject[action] == 'function') {
            controllerObject[action](request, response, id)
            return
        } else {
            response.writeHead(406)
            response.end()
            return
        } 
    } else {
        response.writeHead(404)
        response.end()
        return
    }
}

const server = http.createServer(serverFunction)
server.on('close', () => {
    console.log('Server stopped')
    dbPool.end()
    process.exit()
})

process.on('SIGINT', () => {
    server.close()
})

await loadControllersTask
await loadApiControllersTask
console.log(controllers, apiControllers)

server.listen(HTTP_PORT, () => {
    console.log('Server listening port', HTTP_PORT)
    console.log(`http://localhost:${HTTP_PORT}`)
    console.log('Press Ctrl-C to stop')
})



// header line and body separator: /r/n
// HTTP Request:
// 9 Standart Methods:
// GET - get,
// POST - create,
// PUT - replace, PATCH - update,
// DELETE,
// HEAD, TRACE, CONNECT,
// OPTIONS
// no body allowed for GET and HEAD

/*
АРІ Application Program Interface

                Program - інформаційний "центр"
             /    |    \
      Web        API       Mobile
  Application     |      Application - самостійна програма, 
                  |                    яка взаємодіє з Програмою
               зовнішні
               програми


(також Додаток - несамостійна програма, плагін, addon, розширення)

Web-API - базується на НТТР
CRUD-повнота -- забезпечення повного життєвого циклу даних
Create   POST
Read     GET  
Update   PUT(replace), PATCH(partially update)
Delete   DELETE

CORS - Cross-Origin Resource Sharing - обмеження, згідно з яким дані, що передаються ресурсами з різних джерел (походжень)
Cross-Origin якщо різні:
- scheme (http / https)
- host
- port
Клієнт (браузер) повинен заблокувати CORS дані, якщо у відповіді сервера відсутні заголовки, які це дозволяють

Якщо метод запиту відрізняється від GET, то перед самим запитом
надсилається 'preflight' запит методом OPTIONS з передачею
питання заголовком access-control-request-method
У відповіді мають бути дозволені заголовки

Access-Control-Allow-Origin
Access-Control-Allow-Methods

Також за CORS вважаються забороненими майже усі заголовки запиту,
зокрема, Content-Type. Для дозволу таких запитів необхідно додати заголовок
Access-Control-Allow-Headers
до відповіді preflight

Layered System - можливість створення проміжних шарів на шляху проходження
запиту від клієнта до сервера

Client              PROXY               Server
Get /hello ---------> --------------------> 401 Unauthorized
                      <--------------------
    <-------------- 500 - не зміг виконати запит

Get /hello ---------> --------------------> 200 Ok {
                                            inner: 401 Unauthorized
                      <-------------------- }
    <-------------- 200 Ok

Unicode - правила кодування 
UTF-8 - таблиця кодування

ндтзі
*/