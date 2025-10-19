import { createHash } from 'node:crypto'
import Base64 from "../base_64.js"

export default class UserDao {
    
    constructor(dbPool, getSignature) {
        this.dbPool = dbPool
        this.getSignature = getSignature
    }

    hash(input) {
        return createHash('md5').update(input).digest('hex')
    }

    kdf(password, salt) {
        let t = this.hash(password + salt)
        for (let i = 0; i < 3; i += 1) {
            t = this.hash(t)
        }
        return t
    }

    async getDbIdentity() {
        const sql = "SELECT UUID() AS U"
        const [res] = await this.dbPool.query(sql)
        return res[0]['U']
    }

    async getUserAccessByCredentials(login, password) {
        let sql = "SELECT ua.* FROM user_accesses ua WHERE ua.login = ?"
        const [uas] = await this.dbPool.query(sql, [login])
        if (uas.length != 0 && uas[0].dk == this.kdf(password, uas[0].salt)) {
            return uas[0]
        }
        return null
    }

    async createTokenForUserAccess(userAccess) {
        const jwtHeader = {
            typ: "JWT",
            alg: "HS256",
        }
        const timestamp = (new Date().getTime() / 1000) | 0
        const exp = timestamp + 1e2
        const id = await this.getDbIdentity()

        let sql = `INSERT INTO tokens VALUES('${id}', '${userAccess.id}', FROM_UNIXTIME(${timestamp}), FROM_UNIXTIME(${exp}))`
        await this.dbPool.query(sql)
        const jwtPayload = {
            iss: "NODE-KN-P-231",
            sub: userAccess.id,
            aud: userAccess.role_id,
            exp: exp,
            nbf: timestamp,
            iat: timestamp,
            jti: id
        }
        const jwtBody = Base64.encodeUrl(JSON.stringify(jwtHeader)) + "." + Base64.encodeUrl(JSON.stringify(jwtPayload))
        const jwtSignature = this.getSignature(jwtBody, "secret")

        return jwtBody + "." + jwtSignature
    }

    async register(data) {
        if (data.data) {
            data = data.data
        }
        console.log("register data:", data)
        if (typeof data.name == 'undefined' || data.name.length == 0) {
            throw "Ви повинні ввести ім'я!"
        }
        if (typeof data.email == 'undefined' || data.email.length == 0) {
            throw "Ви повинні ввести email!"
        }
        if (typeof data.login == 'undefined' || data.login.length == 0) {
            throw "Ви повинні ввести логін!"
        }
        if (typeof data.password == 'undefined' || data.password.length == 0) {
            throw "Ви повинні ввести пароль!"
        }
        const hasBirthdate = typeof data.birthdate != 'undefined' && data.birthdate.length != 0
        
        let sql = "SELECT id FROM user_accesses WHERE login = ?"
        const [rows] = await this.dbPool.query(sql, [data.login])
        if (rows.length > 0) {
            throw "Користувач з таким логіном вже існує!"
        }
        
        sql = "SELECT UUID() AS U"
        const [res] = await this.dbPool.query(sql)
        const id = res[0]['U']

        sql = `INSERT INTO users(id, name, email, birthdate, registered_at)
        VALUES(?,?,?,?,CURRENT_TIMESTAMP)`
        await this.dbPool.query(sql, [id, data.name, data.email, hasBirthdate ? data.birthdate : null])

        const salt = id.replace(/-/g, '').substring(0, 16)
        sql = `INSERT INTO user_accesses(id, user_id, role_id, login, salt, dk)
        VALUES(UUID(),?,?,?,?,?)`
        await this.dbPool.query(sql, [id, 'user', data.login, salt, this.kdf(data.password, salt)])

        return 'Ура! Ви зареєструвались'
    }

    install() {
        const sql1 = `CREATE TABLE IF NOT EXISTS users(
            id CHAR(36) PRIMARY KEY,
            name VARCHAR(64) NOT NULL,
            email VARCHAR(128) NOT NULL,
            birthdate DATETIME NULL,
            registered_at DATETIME NOT NULL,
            deleted_at DATETIME NULL
        ) ENGINE = InnoDb DEFAULT CHARSET = utf8mb4 COLLATE utf8mb4_unicode_ci`

        const sql2 = `CREATE TABLE IF NOT EXISTS roles(
            id VARCHAR(16) PRIMARY KEY,
            description VARCHAR(64) NOT NULL,
            can_create TINYINT NOT NULL,
            can_read TINYINT NOT NULL,
            can_update TINYINT NOT NULL,
            can_delete TINYINT NOT NULL
        ) ENGINE = InnoDb DEFAULT CHARSET = utf8mb4 COLLATE utf8mb4_unicode_ci`

        const sql3 = `CREATE TABLE IF NOT EXISTS user_accesses(
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            role_id VARCHAR(16) NOT NULL,
            login VARCHAR(32) NOT NULL,
            salt CHAR(16) NOT NULL,
            dk CHAR(32) NOT NULL,
            UNIQUE(login)
        ) ENGINE = InnoDb DEFAULT CHARSET = utf8mb4 COLLATE utf8mb4_unicode_ci`

        const sql4 = `CREATE TABLE IF NOT EXISTS tokens(
            id CHAR(36) PRIMARY KEY,
            access_id CHAR(36) NOT NULL,
            issued_at DATETIME NOT NULL,
            expired_at DATETIME NULL
        ) ENGINE = InnoDb DEFAULT CHARSET = utf8mb4 COLLATE utf8mb4_unicode_ci`

        return Promise.all([
            this.dbPool.query(sql1),
            this.dbPool.query(sql2),
            this.dbPool.query(sql3),
            this.dbPool.query(sql4)
        ])
    }
}