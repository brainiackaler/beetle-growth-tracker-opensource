package com.example.beetle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TelegramNotificationService {
    private static final String API_BASE = "https://api.telegram.org/bot";
    private static final String DEFAULT_TITLE = "甲虫提醒";
    private static final String DEFAULT_BODY = "有一条甲虫养护提醒到期了";
    private static final int TELEGRAM_TEXT_LIMIT = 4096;
    private static final int CONNECT_TIMEOUT_MILLIS = 10000;
    private static final int READ_TIMEOUT_MILLIS = 30000;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String botToken;
    private final String configuredBotUsername;
    private final String proxyUrl;
    private final String proxySecret;
    private volatile String cachedBotUsername;

    @Autowired
    public TelegramNotificationService(ObjectMapper objectMapper,
                                       @Value("${telegram.bot.token:}") String botToken,
                                       @Value("${telegram.bot.username:}") String botUsername,
                                       @Value("${telegram.api.proxy-url:}") String proxyUrl,
                                       @Value("${telegram.api.proxy-secret:}") String proxySecret) {
        this(objectMapper, botToken, botUsername, proxyUrl, proxySecret, createRestTemplate());
    }

    TelegramNotificationService(ObjectMapper objectMapper,
                                String botToken,
                                String botUsername,
                                String proxyUrl,
                                String proxySecret,
                                RestTemplate restTemplate) {
        this.objectMapper = objectMapper;
        this.botToken = clean(botToken);
        this.configuredBotUsername = normalizeUsername(botUsername);
        this.proxyUrl = clean(proxyUrl);
        this.proxySecret = clean(proxySecret);
        this.cachedBotUsername = this.configuredBotUsername;
        this.restTemplate = restTemplate;
    }

    public boolean isConfigured() {
        return !botToken.isEmpty();
    }

    public String getKnownBotUsername() {
        return clean(cachedBotUsername);
    }

    public String resolveBotUsername() {
        ensureConfigured();
        String known = getKnownBotUsername();
        if (!known.isEmpty()) {
            return known;
        }

        JsonNode response = call("getMe", Collections.<String, Object>emptyMap());
        String username = normalizeUsername(response.path("result").path("username").asText(""));
        if (username.isEmpty()) {
            throw new IllegalStateException("telegram_bot_username_missing");
        }
        cachedBotUsername = username;
        return username;
    }

    public String createBindUrl(String payload) {
        String cleanPayload = clean(payload);
        if (!cleanPayload.matches("[A-Za-z0-9_-]{16,64}")) {
            throw new IllegalArgumentException("telegram_bind_token_invalid");
        }
        return "https://t.me/" + resolveBotUsername() + "?start=" + cleanPayload;
    }

    public void send(NotificationSetting setting, String title, String body) {
        if (setting == null || !Boolean.TRUE.equals(setting.getTelegramEnabled())) {
            throw new IllegalArgumentException("telegram_disabled");
        }
        String chatId = clean(setting.getTelegramChatId());
        if (chatId.isEmpty()) {
            throw new IllegalArgumentException("telegram_not_bound");
        }
        sendMessage(chatId, buildReminderText(title, body));
    }

    public void sendMessage(String chatId, String text) {
        ensureConfigured();
        String target = clean(chatId);
        if (target.isEmpty()) {
            throw new IllegalArgumentException("telegram_chat_missing");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("chat_id", target);
        payload.put("text", truncate(clean(text), TELEGRAM_TEXT_LIMIT));
        payload.put("disable_web_page_preview", true);
        call("sendMessage", payload);
    }

    public void registerWebhook(String webhookUrl, String webhookSecret) {
        ensureConfigured();
        String url = clean(webhookUrl);
        String secret = clean(webhookSecret);
        if (!url.startsWith("https://") || secret.isEmpty()) {
            throw new IllegalArgumentException("telegram_webhook_config_invalid");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("url", url);
        payload.put("secret_token", secret);
        payload.put("allowed_updates", Collections.singletonList("message"));
        call("setWebhook", payload);
    }

    public void registerCommands() {
        ensureConfigured();
        List<Map<String, String>> commands = new ArrayList<>();
        commands.add(command("start", "开始使用或查看绑定状态"));
        commands.add(command("reminders", "查看近期提醒"));
        commands.add(command("status", "查看通知状态"));
        commands.add(command("pause", "暂停 Telegram 通知"));
        commands.add(command("resume", "恢复 Telegram 通知"));
        commands.add(command("help", "查看帮助"));

        Map<String, Object> payload = new HashMap<>();
        payload.put("commands", commands);
        payload.put("scope", Collections.singletonMap("type", "all_private_chats"));
        call("setMyCommands", payload);
    }

    private JsonNode call(String method, Map<String, Object> payload) {
        ensureConfigured();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String endpoint = API_BASE + botToken + "/" + method;
        Object requestBody = payload;

        if (isProxyRequested()) {
            ensureProxyConfigured();
            endpoint = proxyUrl;
            headers.set("X-Telegram-Proxy-Secret", proxySecret);
            headers.set("X-Telegram-Bot-Token", botToken);
            Map<String, Object> proxyPayload = new HashMap<>();
            proxyPayload.put("method", method);
            proxyPayload.put("payload", payload);
            requestBody = proxyPayload;
        }

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    endpoint,
                    new HttpEntity<>(requestBody, headers),
                    String.class
            );
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("telegram_http_" + response.getStatusCodeValue());
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            if (!root.path("ok").asBoolean(false)) {
                throw new IllegalStateException("telegram_api_failed");
            }
            return root;
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("telegram_request_failed");
        }
    }

    private String buildReminderText(String title, String body) {
        String cleanTitle = clean(title);
        String cleanBody = clean(body);
        return (cleanTitle.isEmpty() ? DEFAULT_TITLE : cleanTitle)
                + "\n\n"
                + (cleanBody.isEmpty() ? DEFAULT_BODY : cleanBody);
    }

    private Map<String, String> command(String name, String description) {
        Map<String, String> result = new HashMap<>();
        result.put("command", name);
        result.put("description", description);
        return result;
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new IllegalStateException("telegram_not_configured");
        }
    }

    private boolean isProxyRequested() {
        return !proxyUrl.isEmpty() || !proxySecret.isEmpty();
    }

    private void ensureProxyConfigured() {
        if (!proxyUrl.startsWith("https://") || proxySecret.isEmpty()) {
            throw new IllegalStateException("telegram_proxy_config_invalid");
        }
    }

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
        requestFactory.setReadTimeout(READ_TIMEOUT_MILLIS);
        return new RestTemplate(requestFactory);
    }

    private String normalizeUsername(String value) {
        String username = clean(value);
        while (username.startsWith("@")) {
            username = username.substring(1);
        }
        return username;
    }

    private String truncate(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength - 1) + "…";
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
