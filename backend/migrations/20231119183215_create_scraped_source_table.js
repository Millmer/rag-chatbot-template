exports.up = function(knex) {
    return knex.schema.createTable('scraped_source', table => {
        table.increments('id').primary();
        table.text('source');
        table.text('topic');
        table.text('url').notNullable();
        table.text('checksum');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('scraped_source');
};
