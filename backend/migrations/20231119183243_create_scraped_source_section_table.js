exports.up = function(knex) {
    return knex.schema.createTable('scraped_source_section', table => {
        table.increments('id').primary();
        table.integer('scraped_source_id').notNullable().references('id').inTable('scraped_source').onDelete('CASCADE');
        table.text('heading');
        table.text('content');
        table.integer('token_count');
        table.specificType('embedding', 'vector(1536)');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('scraped_source_section');
};
