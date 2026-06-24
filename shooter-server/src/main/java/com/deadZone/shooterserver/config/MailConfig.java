package com.deadZone.shooterserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {
    @Bean
    public JavaMailSender javaMailSender(
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.port:587}") int port,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.password:}") String password,
            @Value("${spring.mail.properties.mail.smtp.auth:true}") String auth,
            @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}") String startTls,
            @Value("${spring.mail.properties.mail.smtp.starttls.required:true}") String startTlsRequired,
            @Value("${spring.mail.properties.mail.smtp.ssl.trust:smtp.gmail.com}") String sslTrust,
            @Value("${spring.mail.properties.mail.smtp.connectiontimeout:10000}") String connectionTimeout,
            @Value("${spring.mail.properties.mail.smtp.timeout:10000}") String timeout,
            @Value("${spring.mail.properties.mail.smtp.writetimeout:10000}") String writeTimeout
    ) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password == null ? "" : password.replaceAll("\\s+", ""));

        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", auth);
        properties.put("mail.smtp.starttls.enable", startTls);
        properties.put("mail.smtp.starttls.required", startTlsRequired);
        properties.put("mail.smtp.ssl.trust", sslTrust);
        properties.put("mail.smtp.connectiontimeout", connectionTimeout);
        properties.put("mail.smtp.timeout", timeout);
        properties.put("mail.smtp.writetimeout", writeTimeout);
        return sender;
    }
}
