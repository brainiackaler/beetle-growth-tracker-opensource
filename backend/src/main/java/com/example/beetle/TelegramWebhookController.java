package com.example.beetle;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/integrations/telegram")
public class TelegramWebhookController {
    private static final String SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";
    private static final Pattern COMMAND_PATTERN = Pattern.compile(
            "^/([a-z0-9_]{1,32})(?:@\\w+)?(?:\\s+(.+))?\\s*$",
            Pattern.CASE_INSENSITIVE
    );

    private final TelegramBindingService telegramBindingService;
    private final TelegramCommandService telegramCommandService;
    private final TelegramNotificationService telegramNotificationService;
    private final String webhookSecret;

    public TelegramWebhookController(TelegramBindingService telegramBindingService,
                                     TelegramCommandService telegramCommandService,
                                     TelegramNotificationService telegramNotificationService,
                                     @Value("${telegram.webhook.secret:}") String webhookSecret) {
        this.telegramBindingService = telegramBindingService;
        this.telegramCommandService = telegramCommandService;
        this.telegramNotificationService = telegramNotificationService;
        this.webhookSecret = clean(webhookSecret);
    }

    @PostMapping("/webhook")
    public Map<String, Boolean> receive(
            @RequestHeader(value = SECRET_HEADER, required = false) String suppliedSecret,
            @RequestBody(required = false) JsonNode update) {
        verifySecret(suppliedSecret);
        if (update == null) {
            return Collections.singletonMap("ok", true);
        }

        JsonNode message = update.path("message");
        String text = message.path("text").asText("");
        Matcher matcher = COMMAND_PATTERN.matcher(text);
        if (!matcher.matches()) {
            return Collections.singletonMap("ok", true);
        }

        JsonNode chat = message.path("chat");
        String chatId = chat.path("id").asText("");
        if (!"private".equals(chat.path("type").asText("")) || chatId.isEmpty()) {
            return Collections.singletonMap("ok", true);
        }

        String command = clean(matcher.group(1)).toLowerCase(Locale.ROOT);
        String argument = clean(matcher.group(2));
        if (!"start".equals(command)) {
            sendReply(chatId, telegramCommandService.handle(chatId, command));
            return Collections.singletonMap("ok", true);
        }

        if (argument.isEmpty()) {
            sendReply(chatId, telegramCommandService.handleStart(chatId));
            return Collections.singletonMap("ok", true);
        }

        JsonNode from = message.path("from");
        TelegramBindingService.BindResult result = telegramBindingService.bind(
                argument,
                chatId,
                from.path("username").asText(""),
                from.path("first_name").asText(""),
                from.path("last_name").asText("")
        );
        sendReply(chatId, result.getMessage());
        return Collections.singletonMap("ok", true);
    }

    private void verifySecret(String suppliedSecret) {
        if (webhookSecret.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "telegram_webhook_not_configured");
        }
        byte[] expected = webhookSecret.getBytes(StandardCharsets.UTF_8);
        byte[] actual = clean(suppliedSecret).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_webhook_secret");
        }
    }

    private void sendReply(String chatId, String message) {
        try {
            telegramNotificationService.sendMessage(chatId, message);
        } catch (Exception ignored) {
            // Binding is already persisted; Telegram can safely retry only the webhook response.
        }
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
