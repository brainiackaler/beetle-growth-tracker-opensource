package com.example.beetle;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class TelegramWebhookRegistrar implements ApplicationRunner {
    private static final Logger LOGGER = LoggerFactory.getLogger(TelegramWebhookRegistrar.class);

    private final TelegramNotificationService telegramNotificationService;
    private final String webhookUrl;
    private final String webhookSecret;

    public TelegramWebhookRegistrar(TelegramNotificationService telegramNotificationService,
                                    @Value("${telegram.webhook.url:}") String webhookUrl,
                                    @Value("${telegram.webhook.secret:}") String webhookSecret) {
        this.telegramNotificationService = telegramNotificationService;
        this.webhookUrl = clean(webhookUrl);
        this.webhookSecret = clean(webhookSecret);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!telegramNotificationService.isConfigured() || webhookUrl.isEmpty() || webhookSecret.isEmpty()) {
            LOGGER.info("Telegram webhook registration skipped because the integration is not configured.");
            return;
        }

        try {
            telegramNotificationService.registerWebhook(webhookUrl, webhookSecret);
            LOGGER.info("Telegram webhook registered successfully.");
        } catch (Exception e) {
            LOGGER.warn("Telegram webhook registration failed: {}", e.getMessage());
        }

        try {
            telegramNotificationService.registerCommands();
            LOGGER.info("Telegram bot commands registered successfully.");
        } catch (Exception e) {
            LOGGER.warn("Telegram bot command registration failed: {}", e.getMessage());
        }
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
