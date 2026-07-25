package com.example.beetle;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BeetleGrowthApplication {
    public static void main(String[] args) {
        SpringApplication.run(BeetleGrowthApplication.class, args);
    }
}
