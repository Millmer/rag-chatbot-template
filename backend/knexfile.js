const config = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        ssl: true
    },
    pool: {
        min: 0,
        max: 1
    },
    migrations: {
        tableName: 'chatbot_knex_migrations'
    }
};

module.exports = {
    local: config,
    test: config,
    prod: config
};
