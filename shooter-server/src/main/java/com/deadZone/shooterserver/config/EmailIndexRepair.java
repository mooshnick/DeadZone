package com.deadZone.shooterserver.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.DatabaseMetaData;
import java.util.List;

@Component
@Order(0)
public class EmailIndexRepair implements CommandLineRunner {
    private final JdbcTemplate jdbcTemplate;

    public EmailIndexRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        String productName = jdbcTemplate.execute((ConnectionCallback<String>) (connection) -> {
            DatabaseMetaData metadata = connection.getMetaData();
            return metadata.getDatabaseProductName();
        });
        if (productName == null || !productName.toLowerCase().contains("mysql")) {
            return;
        }

        List<String> uniqueEmailIndexes = jdbcTemplate.queryForList("""
                select INDEX_NAME
                from INFORMATION_SCHEMA.STATISTICS
                where TABLE_SCHEMA = DATABASE()
                  and TABLE_NAME = 'users'
                  and COLUMN_NAME = 'email'
                  and NON_UNIQUE = 0
                  and INDEX_NAME <> 'PRIMARY'
                """, String.class);

        uniqueEmailIndexes.forEach((indexName) -> {
            String safeIndexName = indexName.replace("`", "``");
            jdbcTemplate.execute("alter table users drop index `" + safeIndexName + "`");
        });
    }
}
