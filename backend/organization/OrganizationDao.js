export default class OrganizationDao {
    
    constructor(db) {
        this.db = db;
        this.__init();
    }

    __init = () => {
        const sql = 'CREATE TABLE IF NOT EXISTS organization(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, avatar TEXT NOT NULL, sort INTEGER NOT NULL UNIQUE)';
        this.db.exec(sql);
    }

    insert = (organization) => {
        const sql = 'INSERT INTO organization(name, avatar, sort) VALUES(@name, @avatar, @sort)';
        const stmt = this.db.prepare(sql);
        return stmt.run(organization);
    }

    update = (organization) => {
        const sql = 'UPDATE organization SET name=@name, avatar=@avatar, sort=@sort WHERE id=@id';
        const stmt = this.db.prepare(sql);
        return stmt.run(organization);
    }

    deleteById = (id) => {
        const sql = 'DELETE FROM organization WHERE id=?';
        const stmt = this.db.prepare(sql);
        return stmt.run(id);
    }

    findById = (id) => {
        const sql = 'SELECT * FROM organization WHERE id = ?';
        const stmt = this.db.prepare(sql);
        return stmt.get(id);
    }

    findAll = () => {
        const sql = 'SELECT * FROM organization ORDER BY sort ASC';
        const stmt = this.db.prepare(sql);
        return stmt.all();
    }
}
