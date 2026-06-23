package com.deadZone.shooterserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ShooterServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(ShooterServerApplication.class, args);
	}

}
